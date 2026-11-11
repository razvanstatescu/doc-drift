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
  markChangeProcessed,
  revertEventsForRef,
  upsertEvent,
  type StoredBinding,
} from './db';
import { matcherConfigFor } from './ingest-rules';
import { refreshPage } from './page-state';
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
  const config = matcherConfigFor(await getSettings());
  const bindings = await candidateBindings(record);
  const spaceByPage = new Map(bindings.map((b) => [b.pageId, b.spaceKey ?? null]));

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
    return { changeRecordId, outcome: result.kind, events: 0, pages: [] };
  }

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
    });
    log('DDS_MATCH_EVENT', {
      pageId: event.pageId,
      anchor: event.matchedAnchor,
      score: event.score,
      severity: event.severity,
      reasons: event.reasons,
      upsert,
    });
  }
  for (const rename of result.renameProposals) log('DDS_MATCH_RENAME_PROPOSAL', rename);

  const touched = [...new Set(result.events.map((e) => e.pageId))];
  const refreshed = [];
  for (const pageId of touched) {
    try {
      refreshed.push(await refreshPage(pageId, spaceByPage.get(pageId) ?? null));
    } catch (e) {
      // One bad page must not block the others; the queue would otherwise retry the whole change.
      log('DDS_MATCH_REFRESH_FAILED', { pageId, message: String((e as Error)?.message ?? e).slice(0, 300) });
    }
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
