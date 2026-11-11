// Product event handlers: Jira issue updated/deleted (F4) and Confluence page trashed/deleted.
// Background work runs asApp. Never log whole events: they carry a contextToken JWT.
import api, { route } from '@forge/api';
import { parseChangeRecord } from '@dds/shared';
import { displayNames } from '../lib/confluence';
import { bindingsForJiraKey, dropPage, ensureSchema, escalationCandidates, purgeHunksBefore } from '../lib/db';
import { ingestRecord } from '../lib/ingest';
import { toSqlDate } from '../lib/ingest-rules';
import { refreshPage } from '../lib/page-state';
import { getSettings } from '../lib/settings-store';
import { deletedIssueRecord, jiraChangeRecord, relevantJiraItems, type JiraChangelogItem, type JiraIssueFields } from '../lib/review';

const log = (tag: string, obj: unknown) => console.log(`${tag} ${JSON.stringify(obj)}`);

interface JiraIssueEvent {
  eventType?: string;
  selfGenerated?: boolean;
  atlassianId?: string;
  timestamp?: number;
  issue?: { id?: string; key?: string; fields?: JiraIssueFields };
  changelog?: { id?: string | number; items?: JiraChangelogItem[] };
}

async function actorName(accountId: string | undefined): Promise<string | undefined> {
  if (!accountId) return undefined;
  try {
    return (await displayNames(api.asApp(), [accountId])).get(accountId);
  } catch {
    return undefined;
  }
}

async function currentIssueFields(key: string): Promise<JiraIssueFields | undefined> {
  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${key}?fields=summary,status,resolution,fixVersions,components,parent`, {
      headers: { Accept: 'application/json' },
    });
  if (!res.ok) {
    log('DDS_JIRA_ISSUE_FETCH_FAILED', { key, status: res.status });
    return undefined;
  }
  return ((await res.json()) as { fields?: JiraIssueFields }).fields;
}

/**
 * `avi:jira:updated:issue` (filtered on changelog fieldId, ignoreSelf, RECEIVE_AND_LOG) and
 * `avi:jira:deleted:issue`. Builds a Jira ChangeRecord and pushes it through the same ingest path
 * and match-queue as Bitbucket changes.
 */
export async function jiraEvent(event: JiraIssueEvent): Promise<void> {
  const key = event?.issue?.key;
  if (!key || event.selfGenerated) return;
  // F13: Jira turned off in settings. Nothing is stored or fetched.
  if (!(await getSettings()).jiraEnabled) {
    log('DDS_JIRA_SKIPPED', { key, eventType: event.eventType, reason: 'disabled' });
    return;
  }
  await ensureSchema();
  const bindings = await bindingsForJiraKey(key);
  const fieldIds = (event.changelog?.items ?? []).map((i) => i.fieldId ?? i.field);
  if (bindings.length === 0) {
    log('DDS_JIRA_SKIPPED', { key, eventType: event.eventType, reason: 'unanchored', fieldIds });
    return;
  }

  if (event.eventType === 'avi:jira:deleted:issue') {
    const record = deletedIssueRecord(key, event.timestamp, await actorName(event.atlassianId));
    const res = await ingestRecord(record, 'jira', undefined, { title: event.issue?.fields?.summary ?? null });
    log('DDS_JIRA_DELETED', { key, pages: bindings.length, changeRecordId: res.changeRecordId });
    return;
  }

  if (relevantJiraItems(event.changelog?.items).length === 0) {
    log('DDS_JIRA_SKIPPED', { key, reason: 'no_relevant_fields', fieldIds });
    return;
  }
  const [fields, author] = await Promise.all([currentIssueFields(key), actorName(event.atlassianId)]);
  const built = jiraChangeRecord(event, fields, author);
  if (!built) return;
  const parsed = parseChangeRecord(built.record);
  if (!parsed.ok) {
    log('DDS_JIRA_INVALID', { key, errors: parsed.errors.slice(0, 5) });
    return;
  }
  const res = await ingestRecord(parsed.value, 'jira', undefined, { title: built.title });
  log('DDS_JIRA_INGESTED', {
    key,
    changelog: built.record.changelog.map((c) => c.field),
    statusCategory: built.record.statusCategory ?? null,
    changeRecordId: res.changeRecordId,
    duplicate: res.duplicate,
  });
}

interface ConfluencePageEvent {
  eventType?: string;
  selfGenerated?: boolean;
  content?: { id?: string | number; type?: string };
}

/** `avi:confluence:trashed:page` / `avi:confluence:deleted:page`: close the page's events and drop its bindings. */
export async function confluencePageEvent(event: ConfluencePageEvent): Promise<void> {
  if (event?.selfGenerated) return;
  const id = event?.content?.id;
  if (id === undefined || id === null) return;
  const pageId = String(id);
  await ensureSchema();
  const res = await dropPage(pageId);
  if (res.bindings > 0 || res.closed > 0) log('DDS_PAGE_REMOVED', { pageId, eventType: event.eventType, ...res });
}

/** Hourly scheduled trigger: Possibly stale to Stale after escalationDays (D27), and snoozes that ended. */
export async function escalate(): Promise<void> {
  await ensureSchema();
  const started = Date.now();
  const candidates = await escalationCandidates(started, 2 * 60 * 60 * 1000);
  let escalated = 0;
  let rewritten = 0;
  for (const c of candidates) {
    if (Date.now() - started > 240_000) break; // stay inside the function timeout
    try {
      const r = await refreshPage(c.pageId, { writeIfUnchanged: c.snoozeEnded });
      if (r.previous !== r.status) escalated++;
      if (r.byline.op !== 'skipped') rewritten++;
    } catch (e) {
      log('DDS_ESCALATE_FAILED', { pageId: c.pageId, message: String((e as Error)?.message ?? e).slice(0, 300) });
    }
  }
  log('DDS_ESCALATE', { candidates: candidates.length, changed: escalated, rewritten, ms: Date.now() - started });
}

/** Retention for raw diffs (trust-safety.md): hunks older than this are purged daily; metadata stays. */
export const HUNK_RETENTION_DAYS = 30;

/** Daily scheduled trigger `dds-purge` (M2 finding): drops diff hunks older than 30 days, keeping the change metadata. */
export async function purge(): Promise<void> {
  await ensureSchema();
  const before = toSqlDate(Date.now() - HUNK_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  let purged = 0;
  for (let i = 0; i < 20; i++) {
    const n = await purgeHunksBefore(before);
    purged += n;
    if (n === 0) break;
  }
  log('DDS_PURGE', { purged, before, retentionDays: HUNK_RETENTION_DAYS });
}
