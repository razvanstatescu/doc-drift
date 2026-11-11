// Pure formatting helpers for the byline modal (review panel, F5) and the space dashboard (F8).
// No Forge imports, so Vitest covers them (test/frontend-format.test.ts). Wording follows
// brand/voice-and-copy.md: sentence case, digits, no exclamation marks, never "this page is wrong".

export type PageStatus = 'verified' | 'possibly_stale' | 'stale' | 'unanchored';
export type Severity = 'high' | 'medium';

/** A timestamp from the resolvers: epoch ms, an ISO string, or a numeric string. */
export type TimeLike = number | string | null | undefined;

interface StateMeta {
  label: string;
  /** UI Kit Lozenge appearance. */
  lozenge: 'success' | 'warning' | 'removed' | 'default';
  /** UI Kit Icon glyph that matches the brand icon's meaning. */
  glyph: 'check-circle' | 'warning' | 'clock' | 'unlink';
  /** ADS icon colour token. */
  color: 'color.icon.success' | 'color.icon.warning' | 'color.icon.danger' | 'color.icon.subtle';
}

/**
 * brand/README.md status table mapped to ADS: Verified success (check), Possibly stale warning
 * (slip -> warning), Stale removed (clock), Unanchored default (dashed square -> unlink).
 */
export const STATE_META: Record<PageStatus, StateMeta> = {
  verified: { label: 'Verified', lozenge: 'success', glyph: 'check-circle', color: 'color.icon.success' },
  possibly_stale: { label: 'Possibly stale', lozenge: 'warning', glyph: 'warning', color: 'color.icon.warning' },
  stale: { label: 'Stale', lozenge: 'removed', glyph: 'clock', color: 'color.icon.danger' },
  unanchored: { label: 'Unanchored', lozenge: 'default', glyph: 'unlink', color: 'color.icon.subtle' },
};

export function stateMeta(status: string | null | undefined): StateMeta {
  return STATE_META[(status ?? 'unanchored') as PageStatus] ?? STATE_META.unanchored;
}

export const DISMISS_REASONS = [
  { label: 'Not relevant', value: 'not_relevant' },
  { label: 'Already updated', value: 'already_updated' },
  { label: 'False positive', value: 'false_positive' },
] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Epoch ms from a resolver timestamp, or null when it is missing or unreadable. */
export function toMs(t: TimeLike): number | null {
  if (t === null || t === undefined || t === '') return null;
  if (typeof t === 'number') return Number.isFinite(t) ? t : null;
  if (/^\d+$/.test(t)) return Number(t);
  // SQL DATETIME without a zone ("2026-11-11 14:00:00.000") is UTC in this app.
  const iso = /^\d{4}-\d{2}-\d{2} \d/.test(t) ? `${t.replace(' ', 'T')}Z` : t;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** `Nov 11`, or `Nov 11, 2025` outside the current year. UTC, like the byline tooltips. */
export function absoluteDate(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return d.getUTCFullYear() === new Date(now).getUTCFullYear() ? day : `${day}, ${d.getUTCFullYear()}`;
}

/**
 * "Just now", "5 minutes ago", "2 hours ago", "Yesterday", "3 days ago", then an absolute date
 * after 13 days. Future times (clock skew) read "Just now".
 */
export function relativeTime(t: TimeLike, now: number = Date.now()): string {
  const ms = toMs(t);
  if (ms === null) return '';
  const diff = now - ms;
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${plural(Math.floor(diff / MINUTE), 'minute')} ago`;
  if (diff < DAY) return `${plural(Math.floor(diff / HOUR), 'hour')} ago`;
  if (diff < 2 * DAY) return 'Yesterday';
  if (diff < 14 * DAY) return `${Math.floor(diff / DAY)} days ago`;
  return absoluteDate(ms, now);
}

/** Lower-cases a leading "Yesterday"/"Just now" for use mid-sentence. */
export function midSentence(text: string): string {
  return text === 'Yesterday' || text === 'Just now' ? text.toLowerCase() : text;
}

/** `nano-soft-dev/payments-api#482` -> `PR #482`. Already formatted refs and Jira keys stay as is. */
export function refLabel(ref: string, source: string): string {
  if (source === 'jira' || /^PR #/.test(ref)) return ref;
  const pr = ref.split('#').at(-1);
  return pr && /^\d+$/.test(pr) ? `PR #${pr}` : ref;
}

export function severityLabel(s: Severity | null): string {
  return s === 'high' ? 'High' : s === 'medium' ? 'Medium' : 'None';
}

/** Severity lozenge: High gets the warning tone, Medium stays neutral. */
export function severityAppearance(s: Severity | null): 'moved' | 'default' {
  return s === 'high' ? 'moved' : 'default';
}

/** `'high'`, `'medium'`, 2, 1 (the SQL max_severity) or anything else -> a severity or null. */
export function normalizeSeverity(v: unknown): Severity | null {
  if (v === 'high' || v === 2 || v === '2') return 'high';
  if (v === 'medium' || v === 1 || v === '1') return 'medium';
  return null;
}

export interface FileChange {
  path: string;
  status?: string;
  oldPath?: string;
}

/** A file change as parts, so the UI can put both paths in code style: `{from} renamed to {to}`. */
export function fileChangeParts(f: FileChange): { from?: string; verb: string; path: string } {
  const status = (f.status ?? 'modified').toLowerCase();
  if ((status === 'renamed' || status === 'moved') && f.oldPath) return { from: f.oldPath, verb: 'renamed to', path: f.path };
  if (status === 'added') return { verb: 'added', path: f.path };
  if (status === 'removed' || status === 'deleted') return { verb: 'removed', path: f.path };
  return { verb: 'changed', path: f.path };
}

export interface ExcerptPart {
  text: string;
  match: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits an excerpt so the first matched token (longest token wins at a position) can be
 * emphasised. One emphasis per row (brand: one slip per view), so `max` defaults to 1.
 * Matching is case-insensitive; the original casing is kept.
 */
export function splitExcerpt(excerpt: string, tokens: string[], max = 1): ExcerptPart[] {
  const usable = [...new Set(tokens.filter((t) => t && t.trim().length > 0))].sort((a, b) => b.length - a.length);
  if (!excerpt) return [];
  if (usable.length === 0 || max < 1) return [{ text: excerpt, match: false }];
  const re = new RegExp(usable.map(escapeRegExp).join('|'), 'gi');
  const parts: ExcerptPart[] = [];
  let last = 0;
  let count = 0;
  for (const m of excerpt.matchAll(re)) {
    if (count >= max) break;
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: excerpt.slice(last, start), match: false });
    parts.push({ text: m[0], match: true });
    last = start + m[0].length;
    count += 1;
  }
  if (last < excerpt.length) parts.push({ text: excerpt.slice(last), match: false });
  return parts;
}

// ---------------------------------------------------------------------------
// Review panel header lines
// ---------------------------------------------------------------------------

export interface DriftEventView {
  id: string;
  source: string;
  ref: string;
  title?: string;
  author?: string;
  at?: TimeLike;
  summary?: string;
  files?: FileChange[];
  severity?: Severity;
  anchor?: string | null;
  status?: string;
  snoozedUntil?: TimeLike;
}

/** Open events only; an event without a status counts as open. */
export function openEvents<T extends { status?: string }>(events: T[] | null | undefined): T[] {
  return (events ?? []).filter((e) => !e.status || e.status === 'open');
}

/**
 * The review list: open and snoozed events. Snoozing only quiets the reminders; the changes still
 * wait for a person, so a fully snoozed page keeps its review panel (it must not drop to the binding UI).
 */
export function reviewEvents<T extends { status?: string }>(events: T[] | null | undefined): T[] {
  return (events ?? []).filter((e) => !e.status || e.status === 'open' || e.status === 'snoozed');
}

/**
 * When the page's snooze ends (epoch ms), or null when it is not snoozed now. Uses the page-level
 * `snoozedUntil` first, then the latest `snoozedUntil` of a snoozed event. Past times count as not snoozed.
 */
export function snoozedUntilOf(
  pageSnooze: TimeLike,
  events: { status?: string; snoozedUntil?: TimeLike }[] | null | undefined,
  now: number = Date.now(),
): number | null {
  const page = toMs(pageSnooze);
  if (page !== null && page > now) return page;
  let latest: number | null = null;
  for (const e of events ?? []) {
    if (e.status !== 'snoozed') continue;
    const ms = toMs(e.snoozedUntil);
    if (ms !== null && ms > now && (latest === null || ms > latest)) latest = ms;
  }
  return latest;
}

/**
 * Polish item 1: High before Medium, then newest first. The resolver sorts too; this keeps the
 * panel right if it doesn't. Returns a new array.
 */
export function sortEvents<T extends { severity?: unknown; at?: TimeLike }>(events: T[] | null | undefined): T[] {
  const sev = (e: T) => {
    const s = normalizeSeverity(e.severity);
    return s === 'high' ? 2 : s === 'medium' ? 1 : 0;
  };
  return [...(events ?? [])].sort((a, b) => sev(b) - sev(a) || (toMs(b.at) ?? 0) - (toMs(a.at) ?? 0));
}

/** "PR #482 merged by Sam" or "`PAY-142`" (Jira rows put the key in code style themselves). */
export function eventLead(e: Pick<DriftEventView, 'source' | 'ref' | 'author'>): string {
  const ref = refLabel(e.ref, e.source);
  if (e.source === 'jira') return ref;
  return e.author ? `${ref} merged by ${e.author}` : ref;
}

/** "Verified by Dana, 3 days ago. Watching 3 anchors." */
export function verifiedLine(
  verifiedBy: { displayName?: string } | null | undefined,
  verifiedAt: TimeLike,
  anchorCount: number,
  now: number = Date.now(),
): string {
  const when = relativeTime(verifiedAt, now);
  const who = verifiedBy?.displayName ? ` by ${verifiedBy.displayName}` : '';
  const lead = when ? `Verified${who}, ${midSentence(when)}.` : `Verified${who}.`;
  return `${lead} Watching ${plural(anchorCount, 'anchor')}.`;
}

/** The one-line summary under the modal header, per state. */
export function headerLine(
  status: string,
  opts: {
    events?: DriftEventView[];
    verifiedBy?: { displayName?: string } | null;
    verifiedAt?: TimeLike;
    anchorCount?: number;
    /** Epoch ms when the page's snooze ends; adds "Snoozed until Nov 18." */
    snoozedUntil?: number | null;
    now?: number;
  },
): string {
  const now = opts.now ?? Date.now();
  const open = reviewEvents(opts.events);
  switch (status) {
    case 'verified':
      return verifiedLine(opts.verifiedBy, opts.verifiedAt, opts.anchorCount ?? 0, now);
    case 'possibly_stale':
    case 'stale': {
      if (open.length === 0) return 'An anchor changed after the last verification.';
      const first = open[0]!;
      const when = relativeTime(first.at, now);
      const more = open.length > 1 ? ` (+${plural(open.length - 1, 'change')})` : '';
      const lead = `${refLabel(first.ref, first.source)} changed an anchor${when ? ` ${midSentence(when)}` : ''}${more}.`;
      const snooze = opts.snoozedUntil && opts.snoozedUntil > now ? ` Snoozed until ${absoluteDate(opts.snoozedUntil, now)}.` : '';
      return `${lead}${snooze} Agents are told not to trust this page until someone reviews it.`;
    }
    case 'unanchored':
    default:
      return 'Not linked to code or Jira. Add anchors.';
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface Kpis {
  anchored: number;
  total: number;
  anchoredPct?: number;
  possiblyStale: number;
  stale: number;
  medianTimeToVerifyDays: number | null;
}

/** "18 of 24" */
export function anchoredText(k: Pick<Kpis, 'anchored' | 'total'>): string {
  return `${k.anchored} of ${k.total}`;
}

/** "75%". Computed from the counts, so it always agrees with "18 of 24"; the resolver's value is a fallback. */
export function anchoredPctText(k: Pick<Kpis, 'anchored' | 'total' | 'anchoredPct'>): string {
  const pct = k.total > 0 ? (k.anchored / k.total) * 100 : (k.anchoredPct ?? 0);
  return `${Math.round(pct)}%`;
}

/** "1.6 days", "1 day", "Under 3 hours" below 0.1 days; null -> "No data yet". */
export function medianText(days: number | null | undefined): string {
  if (days === null || days === undefined || Number.isNaN(days)) return 'No data yet';
  const rounded = Math.round(days * 10) / 10;
  if (rounded < 0.1) return 'Under 3 hours';
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${rounded === 1 ? 'day' : 'days'}`;
}

/** "No drift in PLAT this week. 18 of 24 pages anchored." */
export function emptyDashboardText(spaceKey: string, k: Pick<Kpis, 'anchored' | 'total'>): string {
  return `No drift in ${spaceKey} this week. ${k.anchored} of ${k.total} pages anchored.`;
}

export function hasDrift(k: Pick<Kpis, 'possiblyStale' | 'stale'>, pageCount: number): boolean {
  return k.possiblyStale + k.stale > 0 || pageCount > 0;
}

export interface DashboardPage {
  pageId: string;
  title: string;
  url?: string;
  status: string;
  maxSeverity?: unknown;
  openEvents?: number;
  since?: TimeLike;
  ownerId?: string | null;
  ownerName?: string | null;
}

/** Polish item 4: the dashboard table lists drifted pages only (Possibly stale and Stale). */
export function driftedPages<T extends Pick<DashboardPage, 'status'>>(pages: T[] | null | undefined): T[] {
  return (pages ?? []).filter((p) => p.status === 'possibly_stale' || p.status === 'stale');
}

const STATUS_RANK: Record<string, number> = { stale: 3, possibly_stale: 2, verified: 1, unanchored: 0 };
const SEVERITY_RANK = { high: 2, medium: 1 } as const;

/**
 * Ranked table order: severity, then state (Stale before Possibly stale), then open changes,
 * then the oldest drift first, then title. Returns a new array.
 */
export function sortPages<T extends DashboardPage>(pages: T[]): T[] {
  const sev = (p: T) => {
    const s = normalizeSeverity(p.maxSeverity);
    return s ? SEVERITY_RANK[s] : 0;
  };
  return [...pages].sort(
    (a, b) =>
      sev(b) - sev(a) ||
      (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0) ||
      (b.openEvents ?? 0) - (a.openEvents ?? 0) ||
      (toMs(a.since) ?? Infinity) - (toMs(b.since) ?? Infinity) ||
      a.title.localeCompare(b.title),
  );
}

export interface OwnerBacklog {
  ownerId?: string | null;
  ownerName?: string | null;
  open: number;
}

/** Most open changes first, then by name; owners with nothing open are left out. */
export function sortOwners<T extends OwnerBacklog>(owners: T[]): T[] {
  return owners
    .filter((o) => o.open > 0)
    .sort((a, b) => b.open - a.open || (a.ownerName ?? '').localeCompare(b.ownerName ?? ''));
}

// ---------------------------------------------------------------------------
// Permissions (D15): each write control is gated by its own flag, with a short reason when it is off
// ---------------------------------------------------------------------------

export type Capability = 'verify' | 'dismiss' | 'snooze' | 'editAnchors' | 'acceptFix' | 'proposeFix';

const CAPABILITY_FIELD: Record<Capability, string> = {
  verify: 'canVerify',
  dismiss: 'canDismiss',
  snooze: 'canSnooze',
  editAnchors: 'canEditAnchors',
  acceptFix: 'canAcceptFix',
  // Propose fix needs edit rights (D30), the same as accepting one.
  proposeFix: 'canAcceptFix',
};

const CAPABILITY_VERB: Record<Capability, string> = {
  verify: 'mark it verified',
  dismiss: 'dismiss changes',
  snooze: 'snooze it',
  editAnchors: 'change its anchors',
  acceptFix: 'accept a fix',
  proposeFix: 'propose a fix',
};

export type Capabilities = Record<Capability, boolean>;

/** Reads `canVerify`, `canDismiss`, ... from `getPageDrift`; a missing flag falls back to `canEdit`. */
export function capabilities(data: Record<string, unknown> | null | undefined): Capabilities {
  const d = data ?? {};
  const fallback = d.canEdit === true;
  const out = {} as Capabilities;
  for (const cap of Object.keys(CAPABILITY_FIELD) as Capability[]) {
    const v = d[CAPABILITY_FIELD[cap]];
    out[cap] = typeof v === 'boolean' ? v : fallback;
  }
  return out;
}

/** True when the user can do none of the writes: the panel shows one "View only" notice instead of per-control reasons. */
export function isViewOnly(caps: Capabilities): boolean {
  return (Object.keys(caps) as Capability[]).every((c) => !caps[c]);
}

/** "A", "A or B", "A, B or C". */
export function joinOr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`;
}

/**
 * One short reason for the controls in `keys` that are off, or '' when all are on.
 * "You need edit rights on this page to dismiss changes or snooze it."
 */
export function gateNote(caps: Capabilities, keys: Capability[]): string {
  const verbs = [...new Set(keys.filter((k) => !caps[k]).map((k) => CAPABILITY_VERB[k]))];
  return verbs.length ? `You need edit rights on this page to ${joinOr(verbs)}.` : '';
}

// ---------------------------------------------------------------------------
// Evidence (D30): summaries for viewers, full diffs for editors
// ---------------------------------------------------------------------------

/** 'full' only when the resolver says so; anything else (or nothing) is a summary. */
export function evidenceLevel(v: unknown): 'summary' | 'full' {
  return v === 'full' ? 'full' : 'summary';
}

export interface FileChangeCounts extends FileChange {
  linesAdded?: number;
  linesRemoved?: number;
  added?: number;
  removed?: number;
  additions?: number;
  deletions?: number;
}

const num = (...vals: unknown[]): number | null => {
  for (const v of vals) if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  return null;
};

/** "+12 −3", "+4", "−2", or '' when the change record has no line counts. */
export function lineCounts(f: FileChangeCounts): string {
  const plus = num(f.linesAdded, f.added, f.additions);
  const minus = num(f.linesRemoved, f.removed, f.deletions);
  return [plus ? `+${plus}` : '', minus ? `\u2212${minus}` : ''].filter(Boolean).join(' ');
}

/** A compact file row: `old → new` for renames, otherwise the path and a status word. */
export function compactFile(f: FileChangeCounts): { from?: string; path: string; status: 'renamed' | 'added' | 'removed' | 'changed'; counts: string } {
  const p = fileChangeParts(f);
  const counts = lineCounts(f);
  if (p.from) return { from: p.from, path: p.path, status: 'renamed', counts };
  const status = p.verb === 'added' ? 'added' : p.verb === 'removed' ? 'removed' : 'changed';
  return { path: p.path, status, counts };
}

/** The first `max` lines of a diff, and how many were left out. Keeps long hunks from swamping the modal. */
export function clipLines(text: string | null | undefined, max: number): { text: string; hidden: number } {
  const all = String(text ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  if (all.length === 1 && all[0] === '') return { text: '', hidden: 0 };
  return all.length <= max ? { text: all.join('\n'), hidden: 0 } : { text: all.slice(0, max).join('\n'), hidden: all.length - max };
}

export interface JiraChange {
  field: string;
  from?: string | null;
  to?: string | null;
  changed?: boolean;
}

/**
 * One line per Jira field change: "Status: In progress → Done", "Assignee: set to Dana",
 * "Description changed" (summary level hides text bodies). Capped at `max` lines.
 */
export function jiraChangeLines(changelog: JiraChange[] | null | undefined, max = 5): string[] {
  return (changelog ?? []).slice(0, max).map((c) => {
    const from = c.from ?? '';
    const to = c.to ?? '';
    if (!from && !to) return `${c.field} changed`;
    if (!from) return `${c.field}: set to ${to}`;
    if (!to) return `${c.field}: cleared (was ${from})`;
    return `${c.field}: ${from} \u2192 ${to}`;
  });
}

// ---------------------------------------------------------------------------
// Load errors
// ---------------------------------------------------------------------------

/** True for a missing-consent result or error (`consent_required`, or the platform's auth error). */
export function isConsentError(v: unknown): boolean {
  if (!v) return false;
  if (typeof v === 'object') {
    const r = v as Record<string, unknown>;
    if (r.error === 'consent_required' || r.code === 'consent_required') return true;
    return isConsentError(r.message);
  }
  return /consent_required|NEEDS_AUTHENTICATION|consent/i.test(String(v));
}

// ---------------------------------------------------------------------------
// Anchor form validation (the resolver's checkAnchor stays authoritative)
// ---------------------------------------------------------------------------

export interface AnchorInput {
  anchorType: string;
  repo?: string;
  pattern?: string;
}

export interface FieldError {
  field: 'repo' | 'pattern';
  message: string;
}

const ISSUE_KEY = /^[A-Za-z][A-Za-z0-9_]*-\d+$/;

function balanced(s: string): boolean {
  const pairs: Record<string, string> = { ']': '[', '}': '{', ')': '(' };
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '[' || c === '{' || c === '(') stack.push(c);
    else if (c in pairs) {
      if (stack.pop() !== pairs[c]) return false;
    }
  }
  return stack.length === 0;
}

/** The first problem with a manual anchor, tied to its field, or null when it looks fine. */
export function anchorInputError(a: AnchorInput): FieldError | null {
  const repo = (a.repo ?? '').trim();
  const pattern = (a.pattern ?? '').trim();
  if (a.anchorType === 'jira') {
    if (!pattern) return { field: 'pattern', message: 'Enter an issue key, for example PAY-142.' };
    if (!ISSUE_KEY.test(pattern)) return { field: 'pattern', message: 'Use an issue key like PAY-142.' };
    return null;
  }
  if (!repo) return { field: 'repo', message: 'Enter a repository, for example payments-api.' };
  if (/\s/.test(repo)) return { field: 'repo', message: 'A repository name has no spaces.' };
  if (a.anchorType === 'repo') return null;
  if (!pattern) return { field: 'pattern', message: 'Enter a path or glob, for example scripts/rollback.sh.' };
  if (/\s/.test(pattern)) return { field: 'pattern', message: 'A path or glob has no spaces.' };
  if (!balanced(pattern)) return { field: 'pattern', message: 'Close every bracket, brace or parenthesis in the glob.' };
  return null;
}
