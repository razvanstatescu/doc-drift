// Forge SQL schema, migrations and queries (docs/architecture/data-model.md, D16).
// Rules from spike S7: one statement per call, DATETIME values in UTC, no SET SESSION.
import { createHash } from 'node:crypto';
import { migrationRunner, sql } from '@forge/sql';
import type { AnchorWeight, Binding, ChangeRecord, ChangedFile, StoredPageState } from '@dds/shared';
import type { NormalizedAnchor } from './anchors';
import { toSqlDate } from './ingest-rules';

// ---------------------------------------------------------------------------
// Migrations. Append only; never edit a shipped entry.
// ---------------------------------------------------------------------------
const MIGRATIONS: [string, string][] = [
  [
    'v001_create_binding',
    `CREATE TABLE IF NOT EXISTS binding (
      id VARCHAR(36) NOT NULL,
      page_id VARCHAR(32) NOT NULL,
      space_key VARCHAR(255) NULL,
      anchor_type VARCHAR(10) NOT NULL,
      repo VARCHAR(255) NULL,
      pattern VARCHAR(512) NULL,
      jira_key VARCHAR(64) NULL,
      weight VARCHAR(10) NOT NULL DEFAULT 'normal',
      dismiss_count INT NOT NULL DEFAULT 0,
      created_by VARCHAR(128) NULL,
      created_at DATETIME(3) NOT NULL,
      PRIMARY KEY (id),
      INDEX idx_binding_repo (repo),
      INDEX idx_binding_jira (jira_key),
      INDEX idx_binding_page (page_id)
    )`,
  ],
  [
    'v002_create_page_state',
    `CREATE TABLE IF NOT EXISTS page_state (
      page_id VARCHAR(32) NOT NULL,
      space_key VARCHAR(255) NULL,
      owner_id VARCHAR(128) NULL,
      status VARCHAR(20) NOT NULL,
      verified_at DATETIME(3) NULL,
      verified_by VARCHAR(128) NULL,
      open_event_count INT NOT NULL DEFAULT 0,
      max_severity TINYINT NOT NULL DEFAULT 0,
      last_summary VARCHAR(512) NULL,
      readership_weight INT NULL,
      updated_at DATETIME(3) NOT NULL,
      PRIMARY KEY (page_id),
      INDEX idx_ps_space_status (space_key, status),
      INDEX idx_ps_owner_status (owner_id, status),
      INDEX idx_ps_status_sev (status, max_severity, updated_at)
    )`,
  ],
  [
    'v003_create_drift_event',
    `CREATE TABLE IF NOT EXISTS drift_event (
      id VARCHAR(36) NOT NULL,
      page_id VARCHAR(32) NOT NULL,
      binding_id VARCHAR(36) NOT NULL,
      change_record_id VARCHAR(36) NOT NULL,
      source VARCHAR(10) NOT NULL,
      ref VARCHAR(255) NOT NULL,
      summary VARCHAR(512) NOT NULL,
      matched_anchor VARCHAR(600) NULL,
      files JSON NULL,
      reasons JSON NULL,
      score DECIMAL(4,2) NOT NULL,
      severity VARCHAR(10) NOT NULL,
      status VARCHAR(12) NOT NULL,
      dismiss_reason VARCHAR(64) NULL,
      snoozed_until DATETIME(3) NULL,
      dedupe_key VARCHAR(400) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_drift_dedupe (dedupe_key),
      INDEX idx_drift_page_status (page_id, status),
      INDEX idx_drift_ref (ref)
    )`,
  ],
  [
    'v004_create_change_record',
    `CREATE TABLE IF NOT EXISTS change_record (
      id VARCHAR(36) NOT NULL,
      dedupe_key VARCHAR(400) NOT NULL,
      origin VARCHAR(10) NOT NULL,
      source VARCHAR(10) NOT NULL,
      repo VARCHAR(255) NULL,
      pr_id INT NULL,
      issue_key VARCHAR(64) NULL,
      title VARCHAR(1024) NULL,
      author VARCHAR(255) NULL,
      merge_commit VARCHAR(64) NULL,
      files JSON NULL,
      record JSON NOT NULL,
      hunks MEDIUMTEXT NULL,
      received_at DATETIME(3) NOT NULL,
      processed_at DATETIME(3) NULL,
      outcome VARCHAR(40) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_change_dedupe (dedupe_key),
      INDEX idx_change_repo_pr (repo, pr_id)
    )`,
  ],
  [
    'v005_create_verification',
    `CREATE TABLE IF NOT EXISTS verification (
      id VARCHAR(36) NOT NULL,
      page_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(128) NULL,
      at DATETIME(3) NOT NULL,
      closed_event_ids JSON NULL,
      note VARCHAR(1024) NULL,
      method VARCHAR(20) NOT NULL,
      PRIMARY KEY (id),
      INDEX idx_verification_page (page_id)
    )`,
  ],
  // M2. Removed identifiers the page mentions, for the review panel's affected sections.
  ['v006_drift_event_matched_tokens', 'ALTER TABLE drift_event ADD COLUMN matched_tokens JSON NULL'],
  // M2. Who closed the event (verify, dismiss), for the audit trail.
  ['v007_drift_event_closed_by', 'ALTER TABLE drift_event ADD COLUMN closed_by VARCHAR(128) NULL'],
  // M2. When the oldest event a verification closed was opened: time to verify for the dashboard.
  ['v008_verification_drift_since', 'ALTER TABLE verification ADD COLUMN drift_since DATETIME(3) NULL'],
  [
    'v009_create_rename_proposal',
    `CREATE TABLE IF NOT EXISTS rename_proposal (
      id VARCHAR(36) NOT NULL,
      page_id VARCHAR(32) NOT NULL,
      binding_id VARCHAR(36) NOT NULL,
      change_record_id VARCHAR(36) NOT NULL,
      from_path VARCHAR(512) NOT NULL,
      to_path VARCHAR(512) NOT NULL,
      proposal_key CHAR(64) NOT NULL,
      status VARCHAR(10) NOT NULL,
      decided_by VARCHAR(128) NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_rename (proposal_key),
      INDEX idx_rename_page_status (page_id, status)
    )`,
  ],
  [
    'v010_create_notification',
    `CREATE TABLE IF NOT EXISTS notification (
      page_id VARCHAR(32) NOT NULL,
      comment_id VARCHAR(64) NULL,
      comment_version INT NOT NULL DEFAULT 1,
      window_start DATETIME(3) NOT NULL,
      event_ids JSON NULL,
      body_lines JSON NULL,
      owner_id VARCHAR(128) NULL,
      updated_at DATETIME(3) NOT NULL,
      PRIMARY KEY (page_id)
    )`,
  ],
  // M3. Fix proposals drafted by Drift Reviewer (submit-fix-proposal). A person accepts or rejects them in
  // the review panel; the page text changes only on accept, asUser (D6). Free text is TEXT: it is not indexed.
  [
    'v011_create_fix_proposal',
    `CREATE TABLE IF NOT EXISTS fix_proposal (
      id VARCHAR(36) NOT NULL,
      page_id VARCHAR(32) NOT NULL,
      event_ids JSON NULL,
      refs JSON NULL,
      section_heading VARCHAR(512) NOT NULL,
      original_text TEXT NOT NULL,
      proposed_text TEXT NOT NULL,
      rationale TEXT NULL,
      status VARCHAR(10) NOT NULL,
      created_by VARCHAR(128) NULL,
      created_at DATETIME(3) NOT NULL,
      decided_by VARCHAR(128) NULL,
      decided_at DATETIME(3) NULL,
      applied_version INT NULL,
      PRIMARY KEY (id),
      INDEX idx_fix_page_status (page_id, status)
    )`,
  ],
  // M3 polish (D29). A proposal targets one block of the page (`b4`, from get-drift-context). NULL on
  // drafts stored before: they apply by section and text as before.
  ['v012_fix_proposal_block_id', 'ALTER TABLE fix_proposal ADD COLUMN block_id VARCHAR(16) NULL'],
  ['v013_fix_proposal_block_kind', 'ALTER TABLE fix_proposal ADD COLUMN block_kind VARCHAR(16) NULL'],
];

/** Applies pending migrations. Idempotent: the runner skips entries recorded in `__migrations`. */
export async function applyMigrations(): Promise<unknown> {
  let runner = migrationRunner;
  for (const [name, ddl] of MIGRATIONS) runner = runner.enqueue(name, ddl);
  return runner.run();
}

/** Migration consumer body: retry for up to 60 s (DDL rate limit is 25 per minute). */
export async function runMigrationsWithRetry(): Promise<void> {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const applied = await applyMigrations();
      console.log(`DDS_MIGRATE ok ${JSON.stringify(applied)}`);
      return;
    } catch (e) {
      lastError = e;
      console.warn(`DDS_MIGRATE retry ${String((e as Error)?.message ?? e).slice(0, 200)}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastError;
}

let schemaReady: Promise<unknown> | undefined;
/**
 * Makes sure the schema exists before the first query in a warm container. The install/upgrade
 * trigger normally does this; this guard covers a function that runs before that consumer finishes.
 */
export function ensureSchema(): Promise<unknown> {
  schemaReady ??= applyMigrations().catch((e) => {
    schemaReady = undefined;
    throw e;
  });
  return schemaReady;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type Param = string | number | null;

async function query<T>(q: string, ...params: Param[]): Promise<T[]> {
  const stmt = sql.prepare<T>(q);
  const res = params.length > 0 ? await stmt.bindParams(...params).execute() : await stmt.execute();
  return (res.rows ?? []) as T[];
}

async function exec(q: string, ...params: Param[]): Promise<void> {
  await sql.prepare(q).bindParams(...params).execute();
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(', ');
}

function parseJson<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== 'string') return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// change_record
// ---------------------------------------------------------------------------
export interface StoredChange {
  id: string;
  record: ChangeRecord;
  processedAt: string | null;
  origin: string;
}

interface ChangeRow {
  id: string;
  record: unknown;
  hunks: string | null;
  processed_at: string | null;
  origin: string;
}

export async function findChangeByDedupe(dedupeKey: string): Promise<{ id: string; processedAt: string | null } | undefined> {
  const rows = await query<{ id: string; processed_at: string | null }>(
    'SELECT id, processed_at FROM change_record WHERE dedupe_key = ?',
    dedupeKey,
  );
  const row = rows[0];
  return row && { id: row.id, processedAt: row.processed_at };
}

export async function insertChange(id: string, dedupeKey: string, origin: string, record: ChangeRecord, titleOverride?: string): Promise<void> {
  const { hunks, ...withoutHunks } = record.source === 'bitbucket' ? record : { ...record, hunks: undefined };
  const bb = record.source === 'bitbucket' ? record : undefined;
  await exec(
    `INSERT INTO change_record (id, dedupe_key, origin, source, repo, pr_id, issue_key, title, author, merge_commit, files, record, hunks, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    dedupeKey,
    origin,
    record.source,
    bb ? `${bb.workspace}/${bb.repoSlug}`.toLowerCase() : null,
    bb ? bb.prId : null,
    record.source === 'jira' ? record.issueKey : null,
    bb ? bb.title : (titleOverride?.slice(0, 1024) ?? null),
    record.author ?? null,
    bb ? bb.mergeCommit : null,
    bb ? JSON.stringify(bb.files) : null,
    JSON.stringify(withoutHunks),
    typeof hunks === 'string' ? hunks : null,
    toSqlDate(),
  );
}

export async function getChange(id: string): Promise<StoredChange | undefined> {
  const rows = await query<ChangeRow>('SELECT id, record, hunks, processed_at, origin FROM change_record WHERE id = ?', id);
  const row = rows[0];
  if (!row) return undefined;
  const record = parseJson<ChangeRecord>(row.record, undefined as unknown as ChangeRecord);
  if (record.source === 'bitbucket' && row.hunks) record.hunks = row.hunks;
  return { id: row.id, record, processedAt: row.processed_at, origin: row.origin };
}

export async function markChangeProcessed(id: string, outcome: string): Promise<void> {
  await exec('UPDATE change_record SET processed_at = ?, outcome = ? WHERE id = ?', toSqlDate(), outcome.slice(0, 40), id);
}

/** Finds the PR number of an earlier change in the same repo by its title (for reverts without a PR number). */
export async function findPrIdByTitle(repo: string, title: string): Promise<number | undefined> {
  const rows = await query<{ pr_id: number }>(
    'SELECT pr_id FROM change_record WHERE repo = ? AND title = ? AND pr_id IS NOT NULL ORDER BY received_at DESC LIMIT 1',
    repo.toLowerCase(),
    title,
  );
  return rows[0]?.pr_id;
}

// ---------------------------------------------------------------------------
// binding
// ---------------------------------------------------------------------------
interface BindingRow {
  id: string;
  page_id: string;
  space_key: string | null;
  anchor_type: Binding['anchorType'];
  repo: string | null;
  pattern: string | null;
  jira_key: string | null;
  weight: AnchorWeight;
  dismiss_count: number;
}

export interface StoredBinding extends Binding {
  spaceKey?: string;
}

function toBinding(r: BindingRow): StoredBinding {
  return {
    id: r.id,
    pageId: r.page_id,
    anchorType: r.anchor_type,
    weight: r.weight,
    dismissCount: Number(r.dismiss_count ?? 0),
    ...(r.repo !== null && { repo: r.repo }),
    ...(r.pattern !== null && { pattern: r.pattern }),
    ...(r.jira_key !== null && { jiraKey: r.jira_key }),
    ...(r.space_key !== null && { spaceKey: r.space_key }),
  };
}

const BINDING_COLS = 'id, page_id, space_key, anchor_type, repo, pattern, jira_key, weight, dismiss_count';

export async function bindingsForRepos(repos: string[]): Promise<StoredBinding[]> {
  if (repos.length === 0) return [];
  const rows = await query<BindingRow>(
    `SELECT ${BINDING_COLS} FROM binding WHERE repo IN (${placeholders(repos.length)}) AND anchor_type IN ('path', 'glob', 'repo')`,
    ...repos,
  );
  return rows.map(toBinding);
}

export async function bindingsForJiraKey(key: string): Promise<StoredBinding[]> {
  const rows = await query<BindingRow>(`SELECT ${BINDING_COLS} FROM binding WHERE jira_key = ? AND anchor_type = 'jira'`, key);
  return rows.map(toBinding);
}

export async function bindingsForPage(pageId: string): Promise<StoredBinding[]> {
  const rows = await query<BindingRow>(`SELECT ${BINDING_COLS} FROM binding WHERE page_id = ? ORDER BY created_at`, pageId);
  return rows.map(toBinding);
}

export async function insertBinding(id: string, pageId: string, spaceKey: string | null, a: NormalizedAnchor, createdBy: string | null): Promise<void> {
  await exec(
    `INSERT INTO binding (id, page_id, space_key, anchor_type, repo, pattern, jira_key, weight, dismiss_count, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    pageId,
    spaceKey,
    a.anchorType,
    a.repo ?? null,
    a.pattern ?? null,
    a.jiraKey ?? null,
    a.weight,
    createdBy,
    toSqlDate(),
  );
}

export async function deleteBinding(id: string): Promise<void> {
  await exec('DELETE FROM binding WHERE id = ?', id);
}

export async function setBindingWeight(id: string, weight: AnchorWeight): Promise<void> {
  await exec('UPDATE binding SET weight = ? WHERE id = ?', weight, id);
}

// ---------------------------------------------------------------------------
// drift_event
// ---------------------------------------------------------------------------
export interface EventUpsert {
  id: string;
  pageId: string;
  bindingId: string;
  changeRecordId: string;
  source: 'bitbucket' | 'jira';
  ref: string;
  summary: string;
  matchedAnchor: string;
  files: string[];
  reasons: string[];
  score: number;
  severity: 'high' | 'medium';
  dedupeKey: string;
  /** Removed identifiers the page mentions (matcher `matchedIdentifiers`). */
  matchedTokens?: string[];
}

/**
 * Inserts or refreshes a drift event, keyed by the matcher's `dedupeKey` (binding + PR).
 * A redelivery of the same change record keeps the event's status (idempotent). A different
 * change record for the same key (a demo replay) reopens it.
 */
export async function upsertEvent(e: EventUpsert): Promise<'inserted' | 'refreshed' | 'reopened'> {
  const now = toSqlDate();
  const existing = await query<{ id: string; change_record_id: string; status: string }>(
    'SELECT id, change_record_id, status FROM drift_event WHERE dedupe_key = ?',
    e.dedupeKey,
  );
  const row = existing[0];
  if (!row) {
    await exec(
      `INSERT INTO drift_event (id, page_id, binding_id, change_record_id, source, ref, summary, matched_anchor, files, reasons, matched_tokens, score, severity, status, dedupe_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
      e.id, e.pageId, e.bindingId, e.changeRecordId, e.source, e.ref, e.summary.slice(0, 512), e.matchedAnchor.slice(0, 600),
      JSON.stringify(e.files), JSON.stringify(e.reasons), JSON.stringify(e.matchedTokens ?? []), e.score, e.severity, e.dedupeKey, now, now,
    );
    return 'inserted';
  }
  if (row.change_record_id === e.changeRecordId) {
    await exec(
      'UPDATE drift_event SET summary = ?, files = ?, reasons = ?, matched_tokens = ?, score = ?, severity = ?, updated_at = ? WHERE id = ?',
      e.summary.slice(0, 512), JSON.stringify(e.files), JSON.stringify(e.reasons), JSON.stringify(e.matchedTokens ?? []), e.score, e.severity, now, row.id,
    );
    return 'refreshed';
  }
  await exec(
    `UPDATE drift_event SET change_record_id = ?, summary = ?, files = ?, reasons = ?, matched_tokens = ?, score = ?, severity = ?, status = 'open',
       dismiss_reason = NULL, snoozed_until = NULL, closed_by = NULL, created_at = ?, updated_at = ? WHERE id = ?`,
    e.changeRecordId, e.summary.slice(0, 512), JSON.stringify(e.files), JSON.stringify(e.reasons), JSON.stringify(e.matchedTokens ?? []), e.score, e.severity, now, now, row.id,
  );
  return 'reopened';
}

export interface OpenEventRow {
  id: string;
  pageId: string;
  bindingId: string;
  changeRecordId: string;
  ref: string;
  source: 'bitbucket' | 'jira';
  summary: string;
  matchedAnchor: string | null;
  files: string[];
  reasons: string[];
  score: number;
  severity: 'high' | 'medium';
  critical: boolean;
  createdAt: string;
  snoozedUntil: string | null;
  matchedTokens: string[];
}

export async function openEventsForPage(pageId: string): Promise<OpenEventRow[]> {
  const rows = await query<{
    id: string; page_id: string; binding_id: string; change_record_id: string; ref: string; source: 'bitbucket' | 'jira';
    summary: string; matched_anchor: string | null; files: unknown; reasons: unknown; matched_tokens: unknown;
    score: string | number; severity: 'high' | 'medium'; weight: string | null; created_at: string; snoozed_until: string | null;
  }>(
    `SELECT e.id, e.page_id, e.binding_id, e.change_record_id, e.ref, e.source, e.summary, e.matched_anchor, e.files, e.reasons,
       e.matched_tokens, e.score, e.severity, b.weight, e.created_at, e.snoozed_until
     FROM drift_event e LEFT JOIN binding b ON b.id = e.binding_id
     WHERE e.page_id = ? AND e.status = 'open' ORDER BY e.created_at DESC`,
    pageId,
  );
  return rows.map((r) => ({
    id: r.id,
    pageId: r.page_id,
    bindingId: r.binding_id,
    changeRecordId: r.change_record_id,
    ref: r.ref,
    source: r.source,
    summary: r.summary,
    matchedAnchor: r.matched_anchor,
    files: parseJson<string[]>(r.files, []),
    reasons: parseJson<string[]>(r.reasons, []),
    score: Number(r.score),
    severity: r.severity,
    critical: r.weight === 'critical',
    createdAt: r.created_at,
    snoozedUntil: r.snoozed_until,
    matchedTokens: parseJson<string[]>(r.matched_tokens, []),
  }));
}

/** Closes every open event on a page (a person verified it). Returns the closed IDs and the oldest one's creation time. */
export async function resolveOpenEvents(pageId: string, closedBy: string | null = null): Promise<string[] & { oldest?: string }> {
  const open = await query<{ id: string; created_at: string }>(
    "SELECT id, created_at FROM drift_event WHERE page_id = ? AND status = 'open' ORDER BY created_at",
    pageId,
  );
  const ids: string[] & { oldest?: string } = open.map((r) => r.id);
  if (open.length === 0) return ids;
  await exec(
    "UPDATE drift_event SET status = 'resolved', closed_by = ?, updated_at = ? WHERE page_id = ? AND status = 'open'",
    closedBy, toSqlDate(), pageId,
  );
  ids.oldest = open[0]!.created_at;
  return ids;
}

/** Closes the given events if they are still open (an accepted fix proposal). Returns the closed IDs and the oldest one's creation time. */
export async function resolveEvents(pageId: string, eventIds: string[], closedBy: string | null = null): Promise<string[] & { oldest?: string }> {
  if (eventIds.length === 0) return [];
  const open = await query<{ id: string; created_at: string }>(
    `SELECT id, created_at FROM drift_event WHERE page_id = ? AND status = 'open' AND id IN (${placeholders(eventIds.length)}) ORDER BY created_at`,
    pageId,
    ...eventIds,
  );
  const ids: string[] & { oldest?: string } = open.map((r) => r.id);
  if (open.length === 0) return ids;
  await exec(
    `UPDATE drift_event SET status = 'resolved', closed_by = ?, updated_at = ? WHERE status = 'open' AND id IN (${placeholders(ids.length)})`,
    closedBy, toSqlDate(), ...ids,
  );
  ids.oldest = open[0]!.created_at;
  return ids;
}

/** Closes the open events of a reverted PR. Returns the affected page IDs. */
export async function revertEventsForRef(ref: string): Promise<string[]> {
  const rows = await query<{ page_id: string }>("SELECT DISTINCT page_id FROM drift_event WHERE ref = ? AND status = 'open'", ref);
  if (rows.length === 0) return [];
  await exec("UPDATE drift_event SET status = 'reverted', updated_at = ? WHERE ref = ? AND status = 'open'", toSqlDate(), ref);
  return rows.map((r) => r.page_id);
}

// ---------------------------------------------------------------------------
// page_state and verification
// ---------------------------------------------------------------------------
export interface PageStateRow {
  pageId: string;
  spaceKey: string | null;
  ownerId: string | null;
  status: StoredPageState;
  verifiedAt: string | null;
  verifiedBy: string | null;
  openEventCount: number;
  maxSeverity: number;
  lastSummary: string | null;
  updatedAt: string;
}

export async function getPageState(pageId: string): Promise<PageStateRow | undefined> {
  const rows = await query<{
    page_id: string; space_key: string | null; owner_id: string | null; status: StoredPageState; verified_at: string | null; verified_by: string | null;
    open_event_count: number; max_severity: number; last_summary: string | null; updated_at: string;
  }>(
    'SELECT page_id, space_key, owner_id, status, verified_at, verified_by, open_event_count, max_severity, last_summary, updated_at FROM page_state WHERE page_id = ?',
    pageId,
  );
  const r = rows[0];
  return (
    r && {
      pageId: r.page_id,
      spaceKey: r.space_key,
      ownerId: r.owner_id,
      status: r.status,
      verifiedAt: r.verified_at,
      verifiedBy: r.verified_by,
      openEventCount: Number(r.open_event_count),
      maxSeverity: Number(r.max_severity),
      lastSummary: r.last_summary,
      updatedAt: r.updated_at,
    }
  );
}

export async function upsertPageState(s: {
  pageId: string;
  spaceKey: string | null;
  ownerId?: string | null;
  status: StoredPageState;
  openEventCount: number;
  maxSeverity: number;
  lastSummary: string | null;
}): Promise<void> {
  await exec(
    `INSERT INTO page_state (page_id, space_key, owner_id, status, open_event_count, max_severity, last_summary, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE space_key = COALESCE(VALUES(space_key), space_key), owner_id = COALESCE(VALUES(owner_id), owner_id), status = VALUES(status),
       open_event_count = VALUES(open_event_count), max_severity = VALUES(max_severity),
       last_summary = VALUES(last_summary), updated_at = VALUES(updated_at)`,
    s.pageId, s.spaceKey, s.ownerId ?? null, s.status, s.openEventCount, s.maxSeverity, s.lastSummary?.slice(0, 512) ?? null, toSqlDate(),
  );
}

export async function recordVerification(v: {
  id: string;
  pageId: string;
  spaceKey: string | null;
  userId: string | null;
  closedEventIds: string[];
  note: string | null;
  method: 'manual' | 'accepted_proposal' | 'agent' | 'binding' | 'dev';
  /** Creation time (SQL DATETIME) of the oldest event this verification closed. */
  driftSince?: string | null;
}): Promise<void> {
  const at = toSqlDate();
  await exec(
    'INSERT INTO verification (id, page_id, user_id, at, closed_event_ids, note, method, drift_since) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    v.id, v.pageId, v.userId, at, JSON.stringify(v.closedEventIds), v.note?.slice(0, 1024) ?? null, v.method, v.driftSince ?? null,
  );
  await exec(
    `INSERT INTO page_state (page_id, space_key, status, verified_at, verified_by, open_event_count, max_severity, updated_at)
     VALUES (?, ?, 'verified', ?, ?, 0, 0, ?)
     ON DUPLICATE KEY UPDATE verified_at = VALUES(verified_at), verified_by = VALUES(verified_by),
       space_key = COALESCE(VALUES(space_key), space_key), updated_at = VALUES(updated_at)`,
    v.pageId, v.spaceKey, at, v.userId, at,
  );
}

// ---------------------------------------------------------------------------
// Review panel: events with their change record, dismiss, snooze
// ---------------------------------------------------------------------------
export interface EventDetailRow extends OpenEventRow {
  changeTitle: string | null;
  changeAuthor: string | null;
  changeFiles: ChangedFile[];
  repo: string | null;
  prId: number | null;
  issueKey: string | null;
}

/** Open events of a page with the title, author and file statuses of their change record. Newest first. */
export async function eventDetailsForPage(pageId: string): Promise<EventDetailRow[]> {
  const events = await openEventsForPage(pageId);
  const ids = [...new Set(events.map((e) => e.changeRecordId))];
  if (ids.length === 0) return [];
  const rows = await query<{ id: string; title: string | null; author: string | null; files: unknown; repo: string | null; pr_id: number | null; issue_key: string | null }>(
    `SELECT id, title, author, files, repo, pr_id, issue_key FROM change_record WHERE id IN (${placeholders(ids.length)})`,
    ...ids,
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return events.map((e) => {
    const c = byId.get(e.changeRecordId);
    return {
      ...e,
      changeTitle: c?.title ?? null,
      changeAuthor: c?.author ?? null,
      changeFiles: parseJson<ChangedFile[]>(c?.files, []),
      repo: c?.repo ?? null,
      prId: c?.pr_id === null || c?.pr_id === undefined ? null : Number(c.pr_id),
      issueKey: c?.issue_key ?? null,
    };
  });
}

export interface EventRef {
  id: string;
  pageId: string;
  bindingId: string;
  status: string;
}

export async function getEvent(id: string): Promise<EventRef | undefined> {
  const rows = await query<{ id: string; page_id: string; binding_id: string; status: string }>(
    'SELECT id, page_id, binding_id, status FROM drift_event WHERE id = ?',
    id,
  );
  const r = rows[0];
  return r && { id: r.id, pageId: r.page_id, bindingId: r.binding_id, status: r.status };
}

/** Dismisses one open event with a reason. Returns false if it was not open. */
export async function dismissEventRow(id: string, reason: string, by: string | null): Promise<boolean> {
  const before = await getEvent(id);
  if (!before || before.status !== 'open') return false;
  await exec(
    "UPDATE drift_event SET status = 'dismissed', dismiss_reason = ?, closed_by = ?, updated_at = ? WHERE id = ? AND status = 'open'",
    reason, by, toSqlDate(), id,
  );
  return true;
}

/** The dismiss dampener (D24): each dismissal takes 0.1 off the anchor's weight in later scoring. */
export async function incrementDismissCount(bindingId: string): Promise<void> {
  await exec('UPDATE binding SET dismiss_count = dismiss_count + 1 WHERE id = ?', bindingId);
}

/** Snoozes every open event of a page until `until` (SQL DATETIME). Returns how many. */
export async function snoozeOpenEvents(pageId: string, until: string): Promise<number> {
  const open = await query<{ id: string }>("SELECT id FROM drift_event WHERE page_id = ? AND status = 'open'", pageId);
  if (open.length === 0) return 0;
  await exec("UPDATE drift_event SET snoozed_until = ?, updated_at = ? WHERE page_id = ? AND status = 'open'", until, toSqlDate(), pageId);
  return open.length;
}

// ---------------------------------------------------------------------------
// Page trashed or deleted, Jira issue deleted
// ---------------------------------------------------------------------------
/** Closes a page's open events (reason `page_removed`), drops its bindings, proposals and state. */
export async function dropPage(pageId: string): Promise<{ closed: number; bindings: number }> {
  const open = await query<{ id: string }>("SELECT id FROM drift_event WHERE page_id = ? AND status = 'open'", pageId);
  const bindings = await query<{ id: string }>('SELECT id FROM binding WHERE page_id = ?', pageId);
  if (open.length > 0) {
    await exec(
      "UPDATE drift_event SET status = 'resolved', dismiss_reason = 'page_removed', updated_at = ? WHERE page_id = ? AND status = 'open'",
      toSqlDate(), pageId,
    );
  }
  if (bindings.length > 0) await exec('DELETE FROM binding WHERE page_id = ?', pageId);
  await exec('DELETE FROM rename_proposal WHERE page_id = ?', pageId);
  await exec('DELETE FROM notification WHERE page_id = ?', pageId);
  await exec("UPDATE fix_proposal SET status = 'rejected', decided_at = ? WHERE page_id = ? AND status = 'open'", toSqlDate(), pageId);
  await exec('DELETE FROM page_state WHERE page_id = ?', pageId);
  return { closed: open.length, bindings: bindings.length };
}

// ---------------------------------------------------------------------------
// rename_proposal
// ---------------------------------------------------------------------------
export interface RenameProposalRow {
  id: string;
  pageId: string;
  bindingId: string;
  changeRecordId: string;
  from: string;
  to: string;
  status: 'open' | 'accepted' | 'rejected';
}

type RenameRow = { id: string; page_id: string; binding_id: string; change_record_id: string; from_path: string; to_path: string; status: RenameProposalRow['status'] };
const toRename = (r: RenameRow): RenameProposalRow => ({
  id: r.id, pageId: r.page_id, bindingId: r.binding_id, changeRecordId: r.change_record_id, from: r.from_path, to: r.to_path, status: r.status,
});
const RENAME_COLS = 'id, page_id, binding_id, change_record_id, from_path, to_path, status';

/** Stores a rename proposal once per binding and rename. A proposal already decided stays decided. */
export async function insertRenameProposal(p: Omit<RenameProposalRow, 'status'>): Promise<'inserted' | 'exists'> {
  // SHA-256 of binding + paths: a unique key over the raw paths would exceed the index length limit.
  const key = createHash('sha256').update(`${p.bindingId}\n${p.from}\n${p.to}`).digest('hex');
  const existing = await query<{ id: string }>('SELECT id FROM rename_proposal WHERE proposal_key = ?', key);
  if (existing.length > 0) return 'exists';
  const now = toSqlDate();
  try {
    await exec(
      `INSERT INTO rename_proposal (id, page_id, binding_id, change_record_id, from_path, to_path, proposal_key, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      p.id, p.pageId, p.bindingId, p.changeRecordId, p.from.slice(0, 512), p.to.slice(0, 512), key, now, now,
    );
  } catch {
    return 'exists'; // a concurrent delivery won the unique key
  }
  return 'inserted';
}

export async function openRenameProposals(pageId: string): Promise<RenameProposalRow[]> {
  const rows = await query<RenameRow>(`SELECT ${RENAME_COLS} FROM rename_proposal WHERE page_id = ? AND status = 'open' ORDER BY created_at`, pageId);
  return rows.map(toRename);
}

export async function getRenameProposal(id: string): Promise<RenameProposalRow | undefined> {
  const rows = await query<RenameRow>(`SELECT ${RENAME_COLS} FROM rename_proposal WHERE id = ?`, id);
  return rows[0] && toRename(rows[0]);
}

export async function decideRenameProposal(id: string, status: 'accepted' | 'rejected', by: string | null): Promise<boolean> {
  const before = await getRenameProposal(id);
  if (!before || before.status !== 'open') return false;
  await exec("UPDATE rename_proposal SET status = ?, decided_by = ?, updated_at = ? WHERE id = ? AND status = 'open'", status, by, toSqlDate(), id);
  return true;
}

export async function getBinding(id: string): Promise<StoredBinding | undefined> {
  const rows = await query<BindingRow>(`SELECT ${BINDING_COLS} FROM binding WHERE id = ?`, id);
  return rows[0] && toBinding(rows[0]);
}

export async function updateBindingPattern(id: string, pattern: string): Promise<void> {
  await exec('UPDATE binding SET pattern = ? WHERE id = ?', pattern.slice(0, 512), id);
}

// ---------------------------------------------------------------------------
// notification (footer comment, at most 1 per page per 24 h)
// ---------------------------------------------------------------------------
export interface NotificationRow {
  pageId: string;
  commentId: string | null;
  commentVersion: number;
  windowStart: string;
  eventIds: string[];
  lines: string[];
  ownerId: string | null;
}

export async function getNotification(pageId: string): Promise<NotificationRow | undefined> {
  const rows = await query<{ page_id: string; comment_id: string | null; comment_version: number; window_start: string; event_ids: unknown; body_lines: unknown; owner_id: string | null }>(
    'SELECT page_id, comment_id, comment_version, window_start, event_ids, body_lines, owner_id FROM notification WHERE page_id = ?',
    pageId,
  );
  const r = rows[0];
  return (
    r && {
      pageId: r.page_id,
      commentId: r.comment_id,
      commentVersion: Number(r.comment_version),
      windowStart: r.window_start,
      eventIds: parseJson<string[]>(r.event_ids, []),
      lines: parseJson<string[]>(r.body_lines, []),
      ownerId: r.owner_id,
    }
  );
}

export async function saveNotification(n: NotificationRow): Promise<void> {
  await exec(
    `INSERT INTO notification (page_id, comment_id, comment_version, window_start, event_ids, body_lines, owner_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE comment_id = VALUES(comment_id), comment_version = VALUES(comment_version),
       window_start = VALUES(window_start), event_ids = VALUES(event_ids), body_lines = VALUES(body_lines),
       owner_id = VALUES(owner_id), updated_at = VALUES(updated_at)`,
    n.pageId, n.commentId, n.commentVersion, n.windowStart, JSON.stringify(n.eventIds.slice(-200)), JSON.stringify(n.lines.slice(-50)), n.ownerId, toSqlDate(),
  );
}

// ---------------------------------------------------------------------------
// Space dashboard (Forge SQL GROUP BY, D16)
// ---------------------------------------------------------------------------
/** Pages with a page_state row in a space (anchored now or before). */
export async function statePagesInSpace(spaceKey: string): Promise<string[]> {
  const rows = await query<{ page_id: string }>('SELECT page_id FROM page_state WHERE space_key = ?', spaceKey);
  return rows.map((r) => r.page_id);
}

/** Fills in page owners that rows created before M2 lack (the owner comes from the Confluence page listing). */
export async function backfillOwners(owners: { pageId: string; ownerId: string }[]): Promise<number> {
  if (owners.length === 0) return 0;
  const ids = owners.map((o) => o.pageId);
  const missing = await query<{ page_id: string }>(
    `SELECT page_id FROM page_state WHERE owner_id IS NULL AND page_id IN (${placeholders(ids.length)})`,
    ...ids,
  );
  const byPage = new Map(owners.map((o) => [o.pageId, o.ownerId]));
  for (const r of missing) await exec('UPDATE page_state SET owner_id = ? WHERE page_id = ? AND owner_id IS NULL', byPage.get(r.page_id)!, r.page_id);
  return missing.length;
}

export async function statusCounts(pageIds: string[]): Promise<Record<string, number>> {
  if (pageIds.length === 0) return {};
  const rows = await query<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM page_state WHERE page_id IN (${placeholders(pageIds.length)}) GROUP BY status`,
    ...pageIds,
  );
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}

export async function ownerCounts(pageIds: string[]): Promise<{ ownerId: string | null; pages: number; open: number }[]> {
  if (pageIds.length === 0) return [];
  const rows = await query<{ owner_id: string | null; pages: number; open: number | string }>(
    `SELECT owner_id, COUNT(*) AS pages, SUM(open_event_count) AS open FROM page_state
     WHERE page_id IN (${placeholders(pageIds.length)}) AND status IN ('possibly_stale', 'stale')
     GROUP BY owner_id ORDER BY open DESC`,
    ...pageIds,
  );
  return rows.map((r) => ({ ownerId: r.owner_id, pages: Number(r.pages), open: Number(r.open ?? 0) }));
}

export interface DashboardRow {
  pageId: string;
  status: StoredPageState;
  maxSeverity: number;
  openEvents: number;
  ownerId: string | null;
  since: string | null;
}

export async function dashboardRows(pageIds: string[]): Promise<DashboardRow[]> {
  if (pageIds.length === 0) return [];
  const rows = await query<{ page_id: string; status: StoredPageState; max_severity: number; open_event_count: number; owner_id: string | null; since: string | null }>(
    `SELECT p.page_id, p.status, p.max_severity, p.open_event_count, p.owner_id, s.since
     FROM page_state p
     LEFT JOIN (SELECT page_id, MIN(created_at) AS since FROM drift_event WHERE status = 'open' GROUP BY page_id) s ON s.page_id = p.page_id
     WHERE p.page_id IN (${placeholders(pageIds.length)}) AND p.status <> 'unanchored'`,
    ...pageIds,
  );
  return rows.map((r) => ({
    pageId: r.page_id,
    status: r.status,
    maxSeverity: Number(r.max_severity),
    openEvents: Number(r.open_event_count),
    ownerId: r.owner_id,
    since: r.since,
  }));
}

/** Verifications in the last `days` that closed drift: (verified at, oldest closed event opened at). */
export async function verifyDurations(pageIds: string[], days = 90): Promise<{ at: string; since: string }[]> {
  if (pageIds.length === 0) return [];
  return query<{ at: string; since: string }>(
    `SELECT at, drift_since AS since FROM verification
     WHERE page_id IN (${placeholders(pageIds.length)}) AND drift_since IS NOT NULL AND at >= ?`,
    ...pageIds,
    toSqlDate(Date.now() - days * 24 * 60 * 60 * 1000),
  );
}

// ---------------------------------------------------------------------------
// Escalation (hourly scheduled trigger)
// ---------------------------------------------------------------------------
/** Pages the hourly run must look at: Possibly stale pages, and pages whose snooze ended in the last `windowMs`. */
export async function escalationCandidates(now: number, windowMs: number): Promise<{ pageId: string; snoozeEnded: boolean }[]> {
  const possibly = await query<{ page_id: string }>("SELECT page_id FROM page_state WHERE status = 'possibly_stale' LIMIT 2000");
  const snooze = await query<{ page_id: string }>(
    "SELECT DISTINCT page_id FROM drift_event WHERE status = 'open' AND snoozed_until IS NOT NULL AND snoozed_until <= ? AND snoozed_until > ?",
    toSqlDate(now), toSqlDate(now - windowMs),
  );
  const ended = new Set(snooze.map((r) => r.page_id));
  const all = new Map<string, boolean>();
  for (const r of possibly) all.set(r.page_id, ended.has(r.page_id));
  for (const id of ended) all.set(id, true);
  return [...all].map(([pageId, snoozeEnded]) => ({ pageId, snoozeEnded }));
}

/** Development only (dev driver): moves a page's open events back in time, to test time-based escalation. */
export async function devAgeOpenEvents(pageId: string, days: number): Promise<number> {
  const open = await query<{ id: string; created_at: string }>("SELECT id, created_at FROM drift_event WHERE page_id = ? AND status = 'open'", pageId);
  for (const r of open) {
    const t = Date.parse(`${String(r.created_at).replace(' ', 'T')}Z`) - days * 24 * 60 * 60 * 1000;
    await exec('UPDATE drift_event SET created_at = ? WHERE id = ?', toSqlDate(t), r.id);
  }
  return open.length;
}

/** Read-only snapshot for the dev driver and debugging. */
export async function snapshotForPage(pageId: string): Promise<Record<string, unknown>> {
  return {
    page_state: await query('SELECT * FROM page_state WHERE page_id = ?', pageId),
    bindings: await query(`SELECT ${BINDING_COLS} FROM binding WHERE page_id = ?`, pageId),
    drift_events: await query(
      'SELECT id, ref, summary, score, severity, status, dismiss_reason, snoozed_until, closed_by, dedupe_key, change_record_id, created_at FROM drift_event WHERE page_id = ? ORDER BY created_at DESC LIMIT 10',
      pageId,
    ),
    verifications: await query('SELECT id, user_id, at, method, closed_event_ids, drift_since, note FROM verification WHERE page_id = ? ORDER BY at DESC LIMIT 5', pageId),
    rename_proposals: await query(`SELECT ${RENAME_COLS} FROM rename_proposal WHERE page_id = ? ORDER BY created_at DESC LIMIT 5`, pageId),
    fix_proposals: await query(
      'SELECT id, section_heading, status, created_by, created_at, decided_by, decided_at, applied_version, refs, event_ids FROM fix_proposal WHERE page_id = ? ORDER BY created_at DESC LIMIT 5',
      pageId,
    ),
    notification: await query('SELECT comment_id, comment_version, window_start, body_lines, owner_id FROM notification WHERE page_id = ?', pageId),
  };
}

/** What the settings page's connection panel shows: the latest relay record and the repos seen. */
export interface RelayActivity {
  lastRecord: { repo: string | null; prId: number | null; title: string | null; receivedAt: string; outcome: string | null } | null;
  repos: { repo: string; records: number; lastAt: string }[];
  /** Change records received from the relay in the last 30 days. */
  records30d: number;
}

export async function relayActivity(now = Date.now()): Promise<RelayActivity> {
  const last = await query<{ repo: string | null; pr_id: number | null; title: string | null; received_at: string; outcome: string | null }>(
    "SELECT repo, pr_id, title, received_at, outcome FROM change_record WHERE origin = 'relay' ORDER BY received_at DESC LIMIT 1",
  );
  const repos = await query<{ repo: string; records: number | string; last_at: string }>(
    "SELECT repo, COUNT(*) AS records, MAX(received_at) AS last_at FROM change_record WHERE origin = 'relay' AND repo IS NOT NULL GROUP BY repo ORDER BY last_at DESC LIMIT 20",
  );
  const recent = await query<{ n: number | string }>(
    "SELECT COUNT(*) AS n FROM change_record WHERE origin = 'relay' AND received_at >= ?",
    toSqlDate(now - 30 * 24 * 60 * 60 * 1000),
  );
  const row = last[0];
  return {
    lastRecord: row ? { repo: row.repo, prId: row.pr_id, title: row.title, receivedAt: row.received_at, outcome: row.outcome } : null,
    repos: repos.map((r) => ({ repo: r.repo, records: Number(r.records), lastAt: r.last_at })),
    records30d: Number(recent[0]?.n ?? 0),
  };
}

/**
 * Trust-safety retention: drops the raw diff text of change records received before `before` (SQL
 * DATETIME), keeping the metadata (files, title, author, outcome) that events and the dashboard use.
 * Returns how many records were purged. Batched so one run stays small.
 */
export async function purgeHunksBefore(before: string, batch = 500): Promise<number> {
  const ids = await query<{ id: string }>(
    `SELECT id FROM change_record WHERE hunks IS NOT NULL AND received_at < ? LIMIT ${Math.max(1, Math.min(1000, Math.floor(batch)))}`,
    before,
  );
  if (ids.length === 0) return 0;
  await exec(`UPDATE change_record SET hunks = NULL WHERE id IN (${placeholders(ids.length)})`, ...ids.map((r) => r.id));
  return ids.length;
}

export async function recentChanges(limit = 5): Promise<unknown[]> {
  return query(
    `SELECT id, origin, source, repo, pr_id, title, received_at, processed_at, outcome FROM change_record ORDER BY received_at DESC LIMIT ${Math.min(50, Math.max(1, Math.floor(limit)))}`,
  );
}

// ---------------------------------------------------------------------------
// Agent tools (M3)
// ---------------------------------------------------------------------------
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Path, glob and repo bindings for a repository named as `workspace/slug` or just `slug`.
 * With a workspace: bindings on `workspace/slug` or on the bare slug. Without: the slug in any workspace.
 */
export async function bindingsForRepoName(full: string | null, slug: string, limit = 500): Promise<StoredBinding[]> {
  const rows = full
    ? await query<BindingRow>(
        `SELECT ${BINDING_COLS} FROM binding WHERE anchor_type IN ('path', 'glob', 'repo') AND repo IN (?, ?) LIMIT ${limit}`,
        full.toLowerCase(),
        slug.toLowerCase(),
      )
    : await query<BindingRow>(
        `SELECT ${BINDING_COLS} FROM binding WHERE anchor_type IN ('path', 'glob', 'repo') AND (repo = ? OR repo LIKE ?) LIMIT ${limit}`,
        slug.toLowerCase(),
        `%/${escapeLike(slug.toLowerCase())}`,
      );
  return rows.map(toBinding);
}

export interface PageStateLite {
  pageId: string;
  spaceKey: string | null;
  ownerId: string | null;
  status: StoredPageState;
  maxSeverity: number;
  openEvents: number;
  lastSummary: string | null;
  since: string | null;
}

type StateLiteRow = {
  page_id: string; space_key: string | null; owner_id: string | null; status: StoredPageState; max_severity: number;
  open_event_count: number; last_summary: string | null; since: string | null;
};

const toStateLite = (r: StateLiteRow): PageStateLite => ({
  pageId: r.page_id,
  spaceKey: r.space_key,
  ownerId: r.owner_id,
  status: r.status,
  maxSeverity: Number(r.max_severity),
  openEvents: Number(r.open_event_count),
  lastSummary: r.last_summary,
  since: r.since,
});

/** Possibly stale and Stale pages, Stale first, then severity, then the oldest open drift. */
export async function driftedPages(spaceKey: string | null, limit: number): Promise<PageStateLite[]> {
  const n = Math.min(200, Math.max(1, Math.floor(limit)));
  const base = `SELECT p.page_id, p.space_key, p.owner_id, p.status, p.max_severity, p.open_event_count, p.last_summary, s.since
     FROM page_state p
     LEFT JOIN (SELECT page_id, MIN(created_at) AS since FROM drift_event WHERE status = 'open' GROUP BY page_id) s ON s.page_id = p.page_id
     WHERE p.status IN ('possibly_stale', 'stale')`;
  const order = `ORDER BY CASE WHEN p.status = 'stale' THEN 0 ELSE 1 END, p.max_severity DESC, s.since ASC LIMIT ${n}`;
  const rows = spaceKey
    ? await query<StateLiteRow>(`${base} AND p.space_key = ? ${order}`, spaceKey)
    : await query<StateLiteRow>(`${base} ${order}`);
  return rows.map(toStateLite);
}

/** page_state rows for some pages (find-docs-for-path statuses). */
export async function pageStatesFor(pageIds: string[]): Promise<Map<string, StoredPageState>> {
  if (pageIds.length === 0) return new Map();
  const rows = await query<{ page_id: string; status: StoredPageState }>(
    `SELECT page_id, status FROM page_state WHERE page_id IN (${placeholders(pageIds.length)})`,
    ...pageIds,
  );
  return new Map(rows.map((r) => [r.page_id, r.status]));
}

export interface ChangeDetail {
  id: string;
  source: 'bitbucket' | 'jira';
  title: string | null;
  author: string | null;
  repo: string | null;
  prId: number | null;
  issueKey: string | null;
  record: ChangeRecord | null;
  hunks: string | null;
}

/** Change records with their hunks (get-drift-context). */
export async function changesByIds(ids: string[]): Promise<Map<string, ChangeDetail>> {
  if (ids.length === 0) return new Map();
  const rows = await query<{ id: string; source: 'bitbucket' | 'jira'; title: string | null; author: string | null; repo: string | null; pr_id: number | null; issue_key: string | null; record: unknown; hunks: string | null }>(
    `SELECT id, source, title, author, repo, pr_id, issue_key, record, hunks FROM change_record WHERE id IN (${placeholders(ids.length)})`,
    ...ids,
  );
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        source: r.source,
        title: r.title,
        author: r.author,
        repo: r.repo,
        prId: r.pr_id === null || r.pr_id === undefined ? null : Number(r.pr_id),
        issueKey: r.issue_key,
        record: parseJson<ChangeRecord | null>(r.record, null),
        hunks: r.hunks,
      },
    ]),
  );
}

// ---------------------------------------------------------------------------
// fix_proposal (M3)
// ---------------------------------------------------------------------------
export type FixProposalStatus = 'open' | 'accepted' | 'rejected';

export interface FixProposalRow {
  id: string;
  pageId: string;
  eventIds: string[];
  /** Display refs of the changes it answers: `PR #482`, `PAY-21`. */
  refs: string[];
  sectionHeading: string;
  /** The page block it changes (D29); null on drafts stored before block targeting. */
  blockId: string | null;
  blockKind: string | null;
  originalText: string;
  proposedText: string;
  rationale: string | null;
  status: FixProposalStatus;
  createdBy: string | null;
  createdAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  appliedVersion: number | null;
}

type FixRow = {
  id: string; page_id: string; event_ids: unknown; refs: unknown; section_heading: string; original_text: string; proposed_text: string;
  rationale: string | null; status: FixProposalStatus; created_by: string | null; created_at: string; decided_by: string | null;
  decided_at: string | null; applied_version: number | null; block_id: string | null; block_kind: string | null;
};
const FIX_COLS =
  'id, page_id, event_ids, refs, section_heading, original_text, proposed_text, rationale, status, created_by, created_at, decided_by, decided_at, applied_version, block_id, block_kind';
const toFix = (r: FixRow): FixProposalRow => ({
  id: r.id,
  pageId: r.page_id,
  eventIds: parseJson<string[]>(r.event_ids, []),
  refs: parseJson<string[]>(r.refs, []),
  sectionHeading: r.section_heading,
  blockId: r.block_id ?? null,
  blockKind: r.block_kind ?? null,
  originalText: r.original_text,
  proposedText: r.proposed_text,
  rationale: r.rationale,
  status: r.status,
  createdBy: r.created_by,
  createdAt: r.created_at,
  decidedBy: r.decided_by,
  decidedAt: r.decided_at,
  appliedVersion: r.applied_version === null || r.applied_version === undefined ? null : Number(r.applied_version),
});

export async function insertFixProposal(p: {
  id: string;
  pageId: string;
  eventIds: string[];
  refs: string[];
  sectionHeading: string;
  blockId: string | null;
  blockKind: string | null;
  originalText: string;
  proposedText: string;
  rationale: string | null;
  createdBy: string | null;
}): Promise<void> {
  await exec(
    `INSERT INTO fix_proposal (id, page_id, event_ids, refs, section_heading, block_id, block_kind, original_text, proposed_text, rationale, status, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    p.id, p.pageId, JSON.stringify(p.eventIds), JSON.stringify(p.refs), p.sectionHeading.slice(0, 512), p.blockId, p.blockKind, p.originalText, p.proposedText,
    p.rationale, p.createdBy, toSqlDate(),
  );
}

export async function getFixProposal(id: string): Promise<FixProposalRow | undefined> {
  const rows = await query<FixRow>(`SELECT ${FIX_COLS} FROM fix_proposal WHERE id = ?`, id);
  return rows[0] && toFix(rows[0]);
}

/** A page's proposals, newest first. `openOnly` by default. */
export async function fixProposalsForPage(pageId: string, openOnly = true, limit = 20): Promise<FixProposalRow[]> {
  const rows = await query<FixRow>(
    `SELECT ${FIX_COLS} FROM fix_proposal WHERE page_id = ? ${openOnly ? "AND status = 'open'" : ''} ORDER BY created_at DESC LIMIT ${Math.min(100, Math.max(1, limit))}`,
    pageId,
  );
  return rows.map(toFix);
}

export async function countOpenFixProposals(pageId: string): Promise<number> {
  const rows = await query<{ n: number }>("SELECT COUNT(*) AS n FROM fix_proposal WHERE page_id = ? AND status = 'open'", pageId);
  return Number(rows[0]?.n ?? 0);
}

/** Decides an open proposal. Returns false if it was no longer open. */
export async function decideFixProposal(id: string, status: 'accepted' | 'rejected', by: string | null, appliedVersion: number | null = null): Promise<boolean> {
  const before = await getFixProposal(id);
  if (!before || before.status !== 'open') return false;
  await exec(
    "UPDATE fix_proposal SET status = ?, decided_by = ?, decided_at = ?, applied_version = ? WHERE id = ? AND status = 'open'",
    status, by, toSqlDate(), appliedVersion, id,
  );
  return true;
}
