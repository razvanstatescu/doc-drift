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
}

/** Open events only; an event without a status counts as open. */
export function openEvents<T extends { status?: string }>(events: T[] | null | undefined): T[] {
  return (events ?? []).filter((e) => !e.status || e.status === 'open');
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
  opts: { events?: DriftEventView[]; verifiedBy?: { displayName?: string } | null; verifiedAt?: TimeLike; anchorCount?: number; now?: number },
): string {
  const now = opts.now ?? Date.now();
  const open = openEvents(opts.events);
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
      return `${lead} Agents are told not to trust this page until someone reviews it.`;
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
