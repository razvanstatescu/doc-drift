import type { Severity, StoredPageState } from '@dds/shared';

export const DEFAULT_ESCALATION_DAYS = 7;
/** This many open events escalate a page to Stale. */
export const ESCALATION_EVENT_COUNT = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** An open (not dismissed, resolved, reverted or snoozed) drift event on the page. */
export interface OpenEventSummary {
  severity: Severity;
  /** True when the event came from a binding with weight `critical`. */
  critical: boolean;
  /** Epoch milliseconds. */
  createdAt: number;
}

export interface PageStateInput {
  current: StoredPageState;
  bindingCount: number;
  openEvents: readonly OpenEventSummary[];
  /** Epoch milliseconds. */
  now: number;
  escalationDays?: number;
}

/**
 * Derives a page's state (features.md, Page states):
 * - no bindings: Unanchored
 * - no open events: Verified (bindings just saved, a person verified, or every event was dismissed)
 * - Stale stays Stale until then
 * - Stale if a High event sits on a critical anchor, 3+ events are open, or the oldest open event
 *   is older than the escalation window (7 days by default)
 * - otherwise Possibly stale
 */
export function nextPageState(input: PageStateInput): StoredPageState {
  const { current, bindingCount, openEvents, now, escalationDays = DEFAULT_ESCALATION_DAYS } = input;
  if (bindingCount === 0) return 'unanchored';
  if (openEvents.length === 0) return 'verified';
  if (current === 'stale') return 'stale';
  const oldest = Math.min(...openEvents.map((e) => e.createdAt));
  const escalate =
    openEvents.some((e) => e.severity === 'high' && e.critical) ||
    openEvents.length >= ESCALATION_EVENT_COUNT ||
    now - oldest >= escalationDays * DAY_MS;
  return escalate ? 'stale' : 'possibly_stale';
}
