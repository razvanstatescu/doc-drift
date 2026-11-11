import type { Severity, StoredPageState } from '@dds/shared';

export const DEFAULT_ESCALATION_DAYS = 7;
/** This many distinct open changes escalate a Possibly stale page to Stale. */
export const ESCALATION_EVENT_COUNT = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** An open (not dismissed, resolved or reverted) drift event on the page. */
export interface OpenEventSummary {
  severity: Severity;
  /** True when the event came from a binding with weight `critical`. */
  critical: boolean;
  /** Epoch milliseconds. */
  createdAt: number;
  /**
   * The change the event belongs to (`workspace/repo#PR` or the Jira key). Events of one change count
   * once: a PR that touches 3 anchors of a page is 1 change, not 3. Without it, each event is its own change.
   */
  ref?: string;
  /** Epoch milliseconds. A snoozed event does not count toward escalation until this time. */
  snoozedUntil?: number;
}

export interface PageStateInput {
  current: StoredPageState;
  bindingCount: number;
  openEvents: readonly OpenEventSummary[];
  /** Epoch milliseconds. */
  now: number;
  escalationDays?: number;
}

/** Whether an open event is snoozed at `now`. */
export function isSnoozed(e: OpenEventSummary, now: number): boolean {
  return e.snoozedUntil !== undefined && e.snoozedUntil > now;
}

/**
 * Derives a page's state (D27, features.md "Page states"):
 * - no bindings: Unanchored
 * - no open events: Verified (bindings just saved, a person verified, or every event was dismissed)
 * - every open event snoozed: Possibly stale (a snooze pauses escalation, it does not verify the page)
 * - the first drift on a Verified page is always Possibly stale, whatever its severity
 * - Stale stays Stale while an unsnoozed event is open
 * - Possibly stale becomes Stale when, counting only unsnoozed events:
 *   - the oldest has been open `escalationDays` (default 7; a snooze restarts its clock at the snooze end), or
 *   - 3 or more distinct changes are open, or
 *   - a High event on a critical anchor comes from a change other than the page's first open change
 *     (a **further** High on a critical anchor)
 */
export function nextPageState(input: PageStateInput): StoredPageState {
  const { current, bindingCount, openEvents, now, escalationDays = DEFAULT_ESCALATION_DAYS } = input;
  if (bindingCount === 0) return 'unanchored';
  if (openEvents.length === 0) return 'verified';
  const active = openEvents.filter((e) => !isSnoozed(e, now));
  if (active.length === 0) return 'possibly_stale';
  if (current === 'verified' || current === 'unanchored') return 'possibly_stale';
  if (current === 'stale') return 'stale';

  const changeOf = (e: OpenEventSummary, i: number) => e.ref ?? `#event-${i}`;
  const indexed = openEvents.map((e, i) => ({ e, change: changeOf(e, i) }));
  const first = indexed.reduce((a, b) => (b.e.createdAt < a.e.createdAt ? b : a));
  const activeIndexed = indexed.filter(({ e }) => !isSnoozed(e, now));

  const clockStart = (e: OpenEventSummary) => Math.max(e.createdAt, e.snoozedUntil ?? 0);
  const oldest = Math.min(...activeIndexed.map(({ e }) => clockStart(e)));
  const changes = new Set(activeIndexed.map(({ change }) => change)).size;
  const furtherCriticalHigh = activeIndexed.some(
    ({ e, change }) => e.severity === 'high' && e.critical && change !== first.change,
  );
  const escalate = now - oldest >= escalationDays * DAY_MS || changes >= ESCALATION_EVENT_COUNT || furtherCriticalHigh;
  return escalate ? 'stale' : 'possibly_stale';
}
