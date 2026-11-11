import { describe, expect, it } from 'vitest';
import { nextPageState, type OpenEventSummary } from '../src/index.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 11);
let seq = 0;
const event = (over: Partial<OpenEventSummary> = {}): OpenEventSummary => ({
  severity: 'medium',
  critical: false,
  createdAt: NOW - DAY,
  ref: `ws/repo#${++seq}`,
  ...over,
});

describe('nextPageState (D27)', () => {
  it('is Unanchored without bindings and Verified without open events', () => {
    expect(nextPageState({ current: 'verified', bindingCount: 0, openEvents: [event()], now: NOW })).toBe('unanchored');
    expect(nextPageState({ current: 'unanchored', bindingCount: 2, openEvents: [], now: NOW })).toBe('verified');
    expect(nextPageState({ current: 'stale', bindingCount: 2, openEvents: [], now: NOW })).toBe('verified');
  });

  it('moves Verified to Possibly stale on the first drift, whatever its severity', () => {
    expect(nextPageState({ current: 'verified', bindingCount: 1, openEvents: [event()], now: NOW })).toBe('possibly_stale');
    // The M1 live test: a High event on a critical anchor must not jump straight to Stale.
    const critical = event({ severity: 'high', critical: true });
    expect(nextPageState({ current: 'verified', bindingCount: 1, openEvents: [critical], now: NOW })).toBe('possibly_stale');
    // Even 3 changes or an old event, when the page was Verified, read Possibly stale first.
    const three = [event(), event(), event({ createdAt: NOW - 30 * DAY })];
    expect(nextPageState({ current: 'verified', bindingCount: 1, openEvents: three, now: NOW })).toBe('possibly_stale');
  });

  it('keeps a first High on a critical anchor at Possibly stale on every recompute', () => {
    const critical = event({ severity: 'high', critical: true });
    expect(nextPageState({ current: 'possibly_stale', bindingCount: 1, openEvents: [critical], now: NOW })).toBe('possibly_stale');
  });

  it('escalates after escalationDays unresolved', () => {
    const base = { current: 'possibly_stale', bindingCount: 1, now: NOW } as const;
    expect(nextPageState({ ...base, openEvents: [event({ createdAt: NOW - 7 * DAY })] })).toBe('stale');
    expect(nextPageState({ ...base, openEvents: [event({ createdAt: NOW - 6 * DAY })] })).toBe('possibly_stale');
    expect(nextPageState({ ...base, openEvents: [event({ createdAt: NOW - 3 * DAY })], escalationDays: 3 })).toBe('stale');
  });

  it('escalates at 3 distinct changes, counting events of one change once', () => {
    const base = { current: 'possibly_stale', bindingCount: 1, now: NOW } as const;
    expect(nextPageState({ ...base, openEvents: [event(), event(), event()] })).toBe('stale');
    const samePr = [event({ ref: 'ws/repo#7' }), event({ ref: 'ws/repo#7' }), event({ ref: 'ws/repo#7' })];
    expect(nextPageState({ ...base, openEvents: samePr })).toBe('possibly_stale');
  });

  it('escalates on a further High event on a critical anchor, not on the first', () => {
    const base = { current: 'possibly_stale', bindingCount: 1, now: NOW } as const;
    const first = event({ createdAt: NOW - 2 * DAY });
    expect(nextPageState({ ...base, openEvents: [first, event({ severity: 'high', critical: true })] })).toBe('stale');
    // A further High on a normal anchor, or a further Medium on a critical one, does not escalate.
    expect(nextPageState({ ...base, openEvents: [first, event({ severity: 'high' })] })).toBe('possibly_stale');
    expect(nextPageState({ ...base, openEvents: [first, event({ critical: true })] })).toBe('possibly_stale');
    // Another anchor hit by the same first change is not "further".
    const sameChange = event({ ref: first.ref, severity: 'high', critical: true, createdAt: first.createdAt });
    expect(nextPageState({ ...base, openEvents: [first, sameChange] })).toBe('possibly_stale');
  });

  it('keeps Stale until a person verifies or every event is dismissed', () => {
    expect(nextPageState({ current: 'stale', bindingCount: 1, openEvents: [event()], now: NOW })).toBe('stale');
  });

  it('does not count snoozed events until the snooze ends', () => {
    const base = { bindingCount: 1, now: NOW } as const;
    const snoozed = (over: Partial<OpenEventSummary> = {}) => event({ snoozedUntil: NOW + 3 * DAY, ...over });
    // All snoozed: Possibly stale, never Verified and never Stale (even from Stale).
    expect(nextPageState({ ...base, current: 'stale', openEvents: [snoozed({ createdAt: NOW - 30 * DAY })] })).toBe('possibly_stale');
    expect(nextPageState({ ...base, current: 'possibly_stale', openEvents: [snoozed(), snoozed(), snoozed()] })).toBe('possibly_stale');
    // Snoozed events don't make 3 changes.
    expect(nextPageState({ ...base, current: 'possibly_stale', openEvents: [event(), event(), snoozed()] })).toBe('possibly_stale');
    // A snooze that ended restarts the escalation clock at its end.
    const ended = event({ createdAt: NOW - 10 * DAY, snoozedUntil: NOW - DAY });
    expect(nextPageState({ ...base, current: 'possibly_stale', openEvents: [ended] })).toBe('possibly_stale');
    const longAgo = event({ createdAt: NOW - 20 * DAY, snoozedUntil: NOW - 8 * DAY });
    expect(nextPageState({ ...base, current: 'possibly_stale', openEvents: [longAgo] })).toBe('stale');
  });

  it('treats events without a ref as separate changes (backward compatible)', () => {
    const noRef = (over: Partial<OpenEventSummary> = {}): OpenEventSummary => ({ severity: 'medium', critical: false, createdAt: NOW - DAY, ...over });
    expect(nextPageState({ current: 'possibly_stale', bindingCount: 1, openEvents: [noRef(), noRef(), noRef()], now: NOW })).toBe('stale');
  });
});
