// Pure helpers for the review panel, notifier, dashboard and Jira trigger. No Forge imports, unit-tested.
// Wording follows brand/voice-and-copy.md: calm, specific, digits, and never "the page is wrong".
import { extractPageText } from '@dds/matcher';
import type { AnchorWeight, ChangedFile, JiraChangeRecord, JiraFieldChange, StatusCategory } from '@dds/shared';
import { plural, refLabel } from './copy';

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Affected sections
// ---------------------------------------------------------------------------
export interface AffectedSection {
  heading: string;
  excerpt: string;
  matchedTokens: string[];
  /** Exact code lines of the section (code macros and `<pre>`) that contain a token. Omitted when none. */
  codeLines?: string[];
}

export const MAX_CODE_LINES = 5;

export const EXCERPT_MAX = 300;
export const MAX_SECTIONS = 5;
/** Heading shown for text before the first heading. */
export const TOP_OF_PAGE = 'Top of page';

const HEADING = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g;

/** Sections with their code blocks. Text before the first heading is its own section. */
export function splitSectionsDetailed(storage: string): { heading: string; text: string; codeBlocks: string[] }[] {
  const out: { heading: string; text: string; codeBlocks: string[] }[] = [];
  let last = 0;
  let heading = TOP_OF_PAGE;
  const push = (slice: string) => {
    const page = extractPageText(slice);
    out.push({ heading, text: page.text, codeBlocks: page.codeBlocks });
  };
  for (const m of storage.matchAll(HEADING)) {
    push(storage.slice(last, m.index));
    heading = extractPageText(m[2] ?? '').text.replace(/\s+/g, ' ').trim() || TOP_OF_PAGE;
    last = (m.index ?? 0) + m[0].length;
  }
  push(storage.slice(last));
  return out.filter((s) => s.text.trim() !== '');
}

/** Splits storage-format XHTML into sections at each heading. Text before the first heading is its own section. */
export function splitSections(storage: string): { heading: string; text: string }[] {
  return splitSectionsDetailed(storage).map(({ heading, text }) => ({ heading, text }));
}

/**
 * The strings to look for on the page: changed paths (old and new), their file names when they are
 * distinctive (`rollback.sh`, not `index`), removed identifiers the page mentions, and Jira keys.
 */
export function tokensForEvents(events: { files: { path: string; oldPath?: string }[]; matchedTokens: string[]; issueKey?: string | null }[]): string[] {
  const tokens = new Set<string>();
  for (const e of events) {
    for (const f of e.files) {
      for (const p of [f.path, f.oldPath]) {
        if (!p) continue;
        tokens.add(p);
        const base = p.split('/').at(-1) ?? '';
        if (base !== p && base.length >= 5 && base.includes('.')) tokens.add(base);
      }
    }
    for (const t of e.matchedTokens) if (t.length >= 3) tokens.add(t);
    if (e.issueKey) tokens.add(e.issueKey);
  }
  return [...tokens];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-token match: `ROLLBACK_TIMEOUT` must not match inside `ROLLBACK_TIMEOUT_SECS`. */
export function tokenRegExp(token: string): RegExp {
  return new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(token)}(?![A-Za-z0-9_])`);
}

/** A window of at most `max` characters around `index`, on word boundaries, with ellipses where cut. */
export function excerptAround(text: string, index: number, max = EXCERPT_MAX): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  // Map the index into the flattened text approximately: flattening only shrinks whitespace.
  const ratio = flat.length / Math.max(1, text.length);
  const at = Math.min(flat.length - 1, Math.floor(index * ratio));
  const budget = max - 2; // room for the ellipses
  let start = Math.max(0, at - Math.floor(budget / 3));
  let end = Math.min(flat.length, start + budget);
  start = Math.max(0, end - budget);
  if (start > 0) {
    const space = flat.indexOf(' ', start);
    if (space !== -1 && space < at) start = space + 1;
  }
  if (end < flat.length) {
    const space = flat.lastIndexOf(' ', end);
    if (space > at) end = space;
  }
  return `${start > 0 ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`;
}

/** Code lines that contain any token, trimmed of trailing space, de-duplicated, at most `max`. */
export function matchedCodeLines(codeBlocks: string[], patterns: RegExp[], max = MAX_CODE_LINES): string[] {
  const out: string[] = [];
  for (const block of codeBlocks) {
    for (const line of block.split('\n')) {
      const l = line.replace(/\s+$/, '');
      if (l.trim() === '' || out.includes(l) || !patterns.some((re) => re.test(l))) continue;
      out.push(l);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** The page sections whose text or code contains any token, with a short excerpt around the first hit. */
export function affectedSections(storage: string, tokens: string[], limit = MAX_SECTIONS): AffectedSection[] {
  if (tokens.length === 0 || !storage) return [];
  const patterns = tokens.map((t) => ({ token: t, re: tokenRegExp(t) }));
  const out: AffectedSection[] = [];
  for (const section of splitSectionsDetailed(storage)) {
    const hits = patterns
      .map(({ token, re }) => ({ token, index: re.exec(section.text)?.index ?? -1 }))
      .filter((h) => h.index >= 0);
    if (hits.length === 0) continue;
    const first = Math.min(...hits.map((h) => h.index));
    const codeLines = matchedCodeLines(section.codeBlocks, patterns.map((p) => p.re));
    out.push({
      heading: section.heading,
      excerpt: excerptAround(section.text, first),
      matchedTokens: hits.map((h) => h.token),
      ...(codeLines.length > 0 && { codeLines }),
    });
    if (out.length >= limit) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Review panel event rows
// ---------------------------------------------------------------------------
export interface EventDetailInput {
  id: string;
  source: 'bitbucket' | 'jira';
  ref: string;
  summary: string;
  matchedAnchor: string | null;
  files: string[];
  reasons: string[];
  score: number;
  severity: 'high' | 'medium';
  createdAt: number;
  snoozedUntil?: number;
  changeTitle: string | null;
  changeAuthor: string | null;
  changeFiles: ChangedFile[];
  repo: string | null;
  prId: number | null;
}

export interface EventView {
  id: string;
  source: 'bitbucket' | 'jira';
  /** Display label: `PR #482` or `PAY-142`. */
  ref: string;
  title: string | null;
  author: string | null;
  /** Epoch ms. */
  at: number;
  summary: string;
  files: { path: string; status: ChangedFile['status']; oldPath?: string; linesAdded?: number; linesRemoved?: number }[];
  severity: 'high' | 'medium';
  score: number;
  anchor: string | null;
  reasons: string[];
  status: 'open' | 'snoozed';
  /** Epoch ms, when snoozed. */
  snoozedUntil: number | null;
  /** Bitbucket PR link, when the repo is known. */
  url: string | null;
}

/** File rows for an event: the change's files that matched the anchor, with their status and old path. */
export function eventFiles(paths: string[], changeFiles: ChangedFile[]): EventView['files'] {
  return paths.map((path) => {
    const f = changeFiles.find((c) => c.path === path || c.oldPath === path);
    if (!f) return { path, status: 'modified' as const };
    return {
      path: f.path,
      status: f.status,
      ...(f.oldPath !== undefined && { oldPath: f.oldPath }),
      ...(typeof f.linesAdded === 'number' && { linesAdded: f.linesAdded }),
      ...(typeof f.linesRemoved === 'number' && { linesRemoved: f.linesRemoved }),
    };
  });
}

export function eventView(e: EventDetailInput, now: number): EventView {
  const snoozed = e.snoozedUntil !== undefined && e.snoozedUntil > now;
  const url =
    e.source === 'bitbucket' && e.repo && e.repo.includes('/') && e.prId !== null
      ? `https://bitbucket.org/${e.repo}/pull-requests/${e.prId}`
      : null;
  return {
    id: e.id,
    source: e.source,
    ref: refLabel(e.ref, e.source),
    title: e.changeTitle,
    author: e.changeAuthor,
    at: e.createdAt,
    summary: e.summary,
    files: e.source === 'bitbucket' ? eventFiles(e.files, e.changeFiles) : [],
    severity: e.severity,
    score: e.score,
    anchor: e.matchedAnchor,
    reasons: e.reasons,
    status: snoozed ? 'snoozed' : 'open',
    snoozedUntil: snoozed ? (e.snoozedUntil ?? null) : null,
    url,
  };
}

// ---------------------------------------------------------------------------
// Dismiss and snooze input
// ---------------------------------------------------------------------------
export const DISMISS_REASONS = ['not_relevant', 'already_updated', 'false_positive'] as const;
export type DismissReason = (typeof DISMISS_REASONS)[number];

export function isDismissReason(v: unknown): v is DismissReason {
  return typeof v === 'string' && (DISMISS_REASONS as readonly string[]).includes(v);
}

export const MAX_SNOOZE_DAYS = 30;

export function parseSnoozeDays(v: unknown): number | undefined {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_SNOOZE_DAYS ? n : undefined;
}

export const MAX_NOTE = 500;

export function cleanNote(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t.slice(0, MAX_NOTE);
}

// ---------------------------------------------------------------------------
// Notifier: footer comment copy and the 24 h cap
// ---------------------------------------------------------------------------
export const NOTIFY_WINDOW_MS = DAY_MS;

export interface NotifyGroup {
  source: 'bitbucket' | 'jira';
  ref: string;
  author: string | null;
  /** Distinct anchored files the change touched on this page. */
  fileCount: number;
  /** The strongest reason, for Jira (`PAY-142 moved to Done`). */
  reason: string | null;
}

/** One sentence per change: "PR #482 (merged by Sam) changed 2 files this page documents." */
export function notificationLine(g: NotifyGroup): string {
  const label = refLabel(g.ref, g.source);
  if (g.source === 'jira') {
    const what = g.reason ?? `${label} changed`;
    return `${what}. This page is anchored to it.`;
  }
  const by = g.author ? ` (merged by ${g.author})` : '';
  const files = g.fileCount > 0 ? plural(g.fileCount, 'file') : 'an anchor';
  return `${label}${by} changed ${files} this page documents.`;
}

/** Groups a page's new events by change, one line each. */
export function groupForNotification(
  events: { source: 'bitbucket' | 'jira'; ref: string; files: string[]; reasons: string[]; changeAuthor: string | null }[],
): NotifyGroup[] {
  const groups = new Map<string, NotifyGroup & { files: Set<string> }>();
  for (const e of events) {
    const g = groups.get(e.ref) ?? { source: e.source, ref: e.ref, author: e.changeAuthor, fileCount: 0, reason: e.reasons[0] ?? null, files: new Set<string>() };
    for (const f of e.files) g.files.add(f);
    g.fileCount = g.files.size;
    groups.set(e.ref, g);
  }
  return [...groups.values()].map(({ files: _files, ...g }) => g);
}

function xml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const REVIEW_HINT = 'Review in the Doc Drift badge.';

/**
 * Storage-format body of the footer comment: an @mention of the owner, the first change, the hint,
 * then one paragraph per change added later in the same 24 h window.
 */
export function notificationBody(ownerId: string | null, lines: string[]): string {
  const [first, ...rest] = lines;
  const mention = ownerId ? `<ac:link><ri:user ri:account-id="${xml(ownerId)}" /></ac:link> ` : '';
  const head = `<p>${mention}${xml(first ?? '')} ${REVIEW_HINT}</p>`;
  return head + rest.map((l) => `<p>Since then: ${xml(l)}</p>`).join('');
}

/** Post a new comment, add to the one in the current 24 h window, or do nothing. */
export function planNotification(
  existing: { windowStart: number; commentId: string | null } | undefined,
  newLines: number,
  now: number,
): 'none' | 'create' | 'append' {
  if (newLines === 0) return 'none';
  if (!existing || !existing.commentId || now - existing.windowStart >= NOTIFY_WINDOW_MS) return 'create';
  return 'append';
}

// ---------------------------------------------------------------------------
// Jira trigger: event -> JiraChangeRecord
// ---------------------------------------------------------------------------
/** Changelog fields the Jira rules use (detection.md). The trigger filter uses the same list. */
export const JIRA_FIELD_IDS = ['status', 'resolution', 'fixVersions', 'components', 'description', 'summary', 'parent', 'IssueParentAssociation'] as const;

export interface JiraChangelogItem {
  field?: string;
  fieldId?: string;
  from?: string | null;
  fromString?: string | null;
  to?: string | null;
  /** The webhook's display value. Shadows Object.prototype.toString, so read it with Object.hasOwn. */
  toString?: unknown;
}

export interface JiraIssueFields {
  summary?: string;
  status?: { name?: string; statusCategory?: { key?: string } };
  resolution?: { name?: string } | null;
  fixVersions?: { name?: string }[];
  components?: { name?: string }[];
}

const FIELD_SET = new Set<string>(JIRA_FIELD_IDS.map((f) => f.toLowerCase()));

function itemField(i: JiraChangelogItem): string | undefined {
  const id = i.fieldId ?? i.field;
  if (!id) return undefined;
  if (i.field === 'IssueParentAssociation') return 'IssueParentAssociation';
  return FIELD_SET.has(id.toLowerCase()) ? id : undefined;
}

/** Changelog items the Jira rules care about (the trigger filter also checks, but re-check: RECEIVE_AND_LOG). */
export function relevantJiraItems(items: JiraChangelogItem[] | undefined): JiraChangelogItem[] {
  return (items ?? []).filter((i) => itemField(i) !== undefined);
}

function names(list: { name?: string }[] | undefined): string | null {
  const n = (list ?? []).map((x) => x.name).filter((x): x is string => !!x);
  return n.length > 0 ? n.join(', ') : null;
}

function statusCategoryOf(key: string | undefined): StatusCategory | undefined {
  return key === 'new' || key === 'indeterminate' || key === 'done' ? key : undefined;
}

/**
 * Builds a Jira change record from an `avi:jira:updated:issue` event and the issue's current fields
 * (fetched asApp: the event lacks fixVersions and components, and a description change has null values).
 * Returns undefined when no relevant field changed.
 */
export function jiraChangeRecord(
  event: { issue?: { key?: string; fields?: JiraIssueFields }; changelog?: { id?: string | number; items?: JiraChangelogItem[] }; timestamp?: number },
  current: JiraIssueFields | undefined,
  author?: string,
): { record: JiraChangeRecord; title: string | null } | undefined {
  const key = event.issue?.key;
  if (!key) return undefined;
  const items = relevantJiraItems(event.changelog?.items);
  if (items.length === 0) return undefined;
  const fields = { ...(event.issue?.fields ?? {}), ...(current ?? {}) };
  const changelog: JiraFieldChange[] = items.map((i) => {
    const field = itemField(i)!;
    // `toString` must be an own property: otherwise `i.toString` is Object.prototype.toString.
    const toString = Object.hasOwn(i, 'toString') && typeof i.toString === 'string' ? i.toString : null;
    let to = toString ?? i.to ?? null;
    const from = i.fromString ?? i.from ?? null;
    if (to === null && field === 'fixVersions') to = names(fields.fixVersions);
    if (to === null && field === 'components') to = names(fields.components);
    return { field, from, to };
  });
  const statusCategory = statusCategoryOf(fields.status?.statusCategory?.key);
  const changelogId = event.changelog?.id !== undefined ? String(event.changelog.id) : event.timestamp !== undefined ? `t${event.timestamp}` : undefined;
  const record: JiraChangeRecord = {
    source: 'jira',
    issueKey: key,
    ...(changelogId !== undefined && { changelogId }),
    ...(author !== undefined && { author }),
    ...(statusCategory !== undefined && { statusCategory }),
    changelog,
  };
  return { record, title: fields.summary ?? null };
}

/** The change record for a deleted issue. The matcher has no rule for it, so `deletedIssueEvents` scores it. */
export const ISSUE_DELETED_FIELD = 'dds:issue-deleted';
export const ISSUE_DELETED_SCORE = 0.7;

export function deletedIssueRecord(issueKey: string, timestamp: number | undefined, author?: string): JiraChangeRecord {
  return {
    source: 'jira',
    issueKey,
    changelogId: `deleted-${timestamp ?? 0}`,
    ...(author !== undefined && { author }),
    changelog: [{ field: ISSUE_DELETED_FIELD, from: issueKey, to: null }],
  };
}

export function isDeletedIssueRecord(r: { source: string; changelog?: { field: string }[] }): boolean {
  return r.source === 'jira' && (r.changelog ?? []).some((c) => c.field === ISSUE_DELETED_FIELD);
}

/** Drift events for a deleted issue: every page anchored to it. High on a critical anchor, else Medium. */
export function deletedIssueEvents(
  issueKey: string,
  changelogId: string,
  bindings: { id: string; pageId: string; jiraKey?: string; weight: AnchorWeight }[],
): { pageId: string; bindingId: string; ref: string; dedupeKey: string; score: number; severity: 'high' | 'medium'; matchedAnchor: string; reasons: string[] }[] {
  return bindings
    .filter((b) => b.jiraKey === issueKey)
    .map((b) => ({
      pageId: b.pageId,
      bindingId: b.id,
      ref: issueKey,
      dedupeKey: `${b.id}|${issueKey}|${changelogId}`,
      score: ISSUE_DELETED_SCORE,
      severity: b.weight === 'critical' ? ('high' as const) : ('medium' as const),
      matchedAnchor: issueKey,
      reasons: [`${issueKey} was deleted`],
    }));
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export function severityName(rank: number): 'high' | 'medium' | null {
  return rank >= 2 ? 'high' : rank === 1 ? 'medium' : null;
}

/** Ranks dashboard rows: highest severity first, then the oldest open drift, then title. */
export function rankPages<T extends { maxSeverity: number; since: number | null; title: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      b.maxSeverity - a.maxSeverity ||
      (a.since ?? Number.POSITIVE_INFINITY) - (b.since ?? Number.POSITIVE_INFINITY) ||
      a.title.localeCompare(b.title),
  );
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Median time to verify in days, 1 decimal, from (verified at, drift since) pairs in epoch ms. */
export function medianDaysToVerify(pairs: { at: number; since: number }[]): number | null {
  const m = median(pairs.filter((p) => p.at >= p.since).map((p) => (p.at - p.since) / DAY_MS));
  return m === null ? null : Math.round(m * 10) / 10;
}
