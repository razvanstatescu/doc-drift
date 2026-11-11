// match-queue consumer body: deterministic matching, no LLM (non-negotiable).
// Loads the change record, the bindings for its repo (or Jira key), fetches candidate page bodies
// asApp in storage format, runs `scoreChange`, upserts drift events, and refreshes page state + byline.
// Idempotent: event upserts are keyed by the matcher's dedupeKey, and page refresh is a pure recompute.
import { randomUUID } from 'node:crypto';
import api from '@forge/api';
import { indexPages, scoreChange, type PageSource } from '@dds/matcher';
import type { ChangeRecord } from '@dds/shared';
import { repoCandidates } from './anchors';
import { getPageStorage } from './confluence';
import {
  bindingsForJiraKey,
  bindingsForRepos,
  ensureSchema,
  findPrIdByTitle,
  getChange,
  insertRenameProposal,
  markChangeProcessed,
  revertEventsForRef,
  upsertEvent,
  type StoredBinding,
} from './db';
import { pushNotify } from './ingest';
import { matcherConfigFor, spaceWatched } from './ingest-rules';
import { refreshPage, type RefreshResult } from './page-state';
import { deletedIssueEvents, isDeletedIssueRecord } from './review';
import { getSettings } from './settings-store';

/** Most pages we fetch for one change. Bindings are per repo, so this is generous for M1. */
const MAX_PAGES_PER_CHANGE = 100;

export interface MatchOutcome {
  changeRecordId: string;
  outcome: string;
  events: number;
  pages: { pageId: string; status: string }[];
}

function log(tag: string, obj: unknown): void {
  console.log(`${tag} ${JSON.stringify(obj)}`);
}

async function candidateBindings(record: ChangeRecord): Promise<StoredBinding[]> {
  return record.source === 'bitbucket' ? bindingsForRepos(repoCandidates(record)) : bindingsForJiraKey(record.issueKey);
}

/** Fetches page bodies asApp. Pages the app can't read (restricted, deleted) are left out: paths only, no boosts. */
async function loadPages(pageIds: string[]): Promise<PageSource[]> {
  const pages: PageSource[] = [];
  for (const pageId of pageIds.slice(0, MAX_PAGES_PER_CHANGE)) {
    const page = await getPageStorage(api.asApp(), pageId);
    if (page.status >= 300 || page.storage === undefined) {
      log('DDS_MATCH_PAGE_UNREADABLE', { pageId, status: page.status });
      continue;
    }
    pages.push({ pageId, ...(page.title !== undefined && { title: page.title }), storage: page.storage });
  }
  return pages;
}

export async function processChange(changeRecordId: string): Promise<MatchOutcome> {
  await ensureSchema();
  const stored = await getChange(changeRecordId);
  if (!stored) {
    log('DDS_MATCH_MISSING', { changeRecordId });
    return { changeRecordId, outcome: 'missing', events: 0, pages: [] };
  }
  const record = stored.record;
  const settings = await getSettings();
  const config = matcherConfigFor(settings);
  const notifyDelaySeconds = settings.notifyDebounceMinutes * 60;

  // F13: Jira turned off in settings. The trigger also checks, but a queued record may predate the switch.
  if (record.source === 'jira' && !settings.jiraEnabled) {
    await markChangeProcessed(changeRecordId, 'skipped:jira disabled');
    log('DDS_MATCH_DONE', { changeRecordId, skipped: 'jira disabled', events: 0 });
    return { changeRecordId, outcome: 'skipped:jira disabled', events: 0, pages: [] };
  }

  // F13 per-space opt-in: anchors on pages outside the watched spaces create no events.
  const allBindings = await candidateBindings(record);
  const bindings = allBindings.filter((b) => spaceWatched(settings, b.spaceKey ?? null));
  if (bindings.length < allBindings.length) {
    log('DDS_MATCH_SPACES', { changeRecordId, spaceMode: settings.spaceMode, kept: bindings.length, dropped: allBindings.length - bindings.length });
  }
  const spaceByPage = new Map(bindings.map((b) => [b.pageId, b.spaceKey ?? null]));

  // A deleted Jira issue: the matcher has no rule for it, so every page anchored to it gets an event.
  if (record.source === 'jira' && isDeletedIssueRecord(record)) {
    const events = deletedIssueEvents(record.issueKey, record.changelogId ?? 'deleted', bindings);
    const notify: string[] = [];
    for (const e of events) {
      const upsert = await upsertEvent({ id: randomUUID(), changeRecordId, source: 'jira', summary: e.reasons[0]!, files: [], ...e });
      if (upsert !== 'refreshed') notify.push(e.pageId);
    }
    const pages = await refreshAll([...new Set(events.map((e) => e.pageId))], spaceByPage);
    await pushNotify([...new Set(notify)], notifyDelaySeconds);
    await markChangeProcessed(changeRecordId, `deleted-issue:${events.length}`);
    log('DDS_MATCH_DELETED_ISSUE', { changeRecordId, issueKey: record.issueKey, events: events.length });
    return { changeRecordId, outcome: 'deleted-issue', events: events.length, pages: pages.map((p) => ({ pageId: p.pageId, status: p.status })) };
  }

  // Pass 1, paths only, threshold 0: which pages have any matching anchor? Boosts need a path
  // match first, so only those pages can flag, and only their bodies are fetched.
  const probe = scoreChange(record, bindings, new Map(), { ...config, threshold: 0 });
  log('DDS_MATCH_START', {
    changeRecordId,
    origin: stored.origin,
    source: record.source,
    ref: record.source === 'bitbucket' ? `${record.workspace}/${record.repoSlug}#${record.prId}` : record.issueKey,
    bindings: bindings.length,
    probe: probe.kind,
    threshold: config.threshold,
  });

  if (probe.kind === 'skipped') {
    await markChangeProcessed(changeRecordId, `skipped:${probe.reason}`);
    log('DDS_MATCH_DONE', { changeRecordId, skipped: skipLabel(probe.reason), events: 0 });
    return { changeRecordId, outcome: `skipped:${probe.reason}`, events: 0, pages: [] };
  }

  if (probe.kind === 'revert' && record.source === 'bitbucket') {
    const repo = `${record.workspace}/${record.repoSlug}`;
    const prId = probe.revert.revertedPrId ?? (await findPrIdByTitle(repo, probe.revert.revertedTitle));
    const pageIds = prId !== undefined ? await revertEventsForRef(`${repo}#${prId}`) : [];
    const pages = [];
    for (const pageId of pageIds) pages.push(await refreshPage(pageId));
    log('DDS_MATCH_REVERT', { changeRecordId, revertedPrId: prId ?? null, pages: pageIds });
    await markChangeProcessed(changeRecordId, 'revert');
    return { changeRecordId, outcome: 'revert', events: 0, pages: pages.map((p) => ({ pageId: p.pageId, status: p.status })) };
  }

  const candidatePages = probe.kind === 'scored' ? [...new Set(probe.events.map((e) => e.pageId))] : [];
  const pages = await loadPages(candidatePages);
  const result = scoreChange(record, bindings, indexPages(pages), config);
  if (result.kind !== 'scored') {
    await markChangeProcessed(changeRecordId, result.kind);
    log('DDS_MATCH_DONE', { changeRecordId, candidates: candidatePages.length, fetched: pages.length, events: 0, outcome: result.kind });
    return { changeRecordId, outcome: result.kind, events: 0, pages: [] };
  }

  const notify = new Set<string>();
  for (const event of result.events) {
    const upsert = await upsertEvent({
      id: randomUUID(),
      pageId: event.pageId,
      bindingId: event.bindingId,
      changeRecordId,
      source: event.source,
      ref: event.ref,
      summary: event.reasons[0] ?? event.matchedAnchor,
      matchedAnchor: event.matchedAnchor,
      files: event.files,
      reasons: event.reasons,
      score: event.score,
      severity: event.severity,
      dedupeKey: event.dedupeKey,
      matchedTokens: event.matchedIdentifiers,
    });
    // A redelivery ('refreshed') was already notified; new and reopened events notify the owner.
    if (upsert !== 'refreshed') notify.add(event.pageId);
    log('DDS_MATCH_EVENT', {
      pageId: event.pageId,
      anchor: event.matchedAnchor,
      score: event.score,
      severity: event.severity,
      reasons: event.reasons,
      upsert,
    });
  }
  for (const rename of result.renameProposals) {
    const stored = await insertRenameProposal({ id: randomUUID(), changeRecordId, ...rename });
    log('DDS_MATCH_RENAME_PROPOSAL', { ...rename, stored });
  }

  const touched = [...new Set(result.events.map((e) => e.pageId))];
  const refreshed = await refreshAll(touched, spaceByPage);
  try {
    await pushNotify([...notify], notifyDelaySeconds);
  } catch (e) {
    log('DDS_NOTIFY_QUEUE_FAILED', { message: String((e as Error)?.message ?? e).slice(0, 300) });
  }
  await markChangeProcessed(changeRecordId, `scored:${result.events.length}`);
  log('DDS_MATCH_DONE', {
    changeRecordId,
    candidates: candidatePages.length,
    fetched: pages.length,
    events: result.events.length,
    pages: refreshed.map((p) => ({ pageId: p.pageId, status: p.status, maxSeverity: p.maxSeverity })),
  });
  return {
    changeRecordId,
    outcome: 'scored',
    events: result.events.length,
    pages: refreshed.map((p) => ({ pageId: p.pageId, status: p.status })),
  };
}

/** Readable reason for the closing log line when the probe skips a change. */
function skipLabel(reason: string): string {
  return reason === 'no_relevant_files' ? 'all files ignored' : reason === 'non_default_branch' ? 'not the main branch' : reason;
}

async function refreshAll(pageIds: string[], spaceByPage: Map<string, string | null>): Promise<RefreshResult[]> {
  const refreshed: RefreshResult[] = [];
  for (const pageId of pageIds) {
    try {
      refreshed.push(await refreshPage(pageId, { spaceKeyHint: spaceByPage.get(pageId) ?? null }));
    } catch (e) {
      // One bad page must not block the others; the queue would otherwise retry the whole change.
      log('DDS_MATCH_REFRESH_FAILED', { pageId, message: String((e as Error)?.message ?? e).slice(0, 300) });
    }
  }
  return refreshed;
}
