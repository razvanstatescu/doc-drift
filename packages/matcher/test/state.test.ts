import { describe, expect, it } from 'vitest';
import { nextPageState, type OpenEventSummary } from '../src/index.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 11);
const event = (over: Partial<OpenEventSummary> = {}): OpenEventSummary => ({ severity: 'medium', critical: false, createdAt: NOW - DAY, ...over });

describe('nextPageState', () => {
  it('is Unanchored without bindings and Verified without open events', () => {
    expect(nextPageState({ current: 'verified', bindingCount: 0, openEvents: [event()], now: NOW })).toBe('unanchored');
    expect(nextPageState({ current: 'unanchored', bindingCount: 2, openEvents: [], now: NOW })).toBe('verified');
    expect(nextPageState({ current: 'stale', bindingCount: 2, openEvents: [], now: NOW })).toBe('verified');
  });

  it('moves Verified to Possibly stale on the first event', () => {
    expect(nextPageState({ current: 'verified', bindingCount: 1, openEvents: [event()], now: NOW })).toBe('possibly_stale');
  });

  it('escalates to Stale after 7 days, at 3 events, or on High severity on a critical anchor', () => {
    const base = { current: 'possibly_stale', bindingCount: 1, now: NOW } as const;
    expect(nextPageState({ ...base, openEvents: [event({ createdAt: NOW - 7 * DAY })] })).toBe('stale');
    expect(nextPageState({ ...base, openEvents: [event({ createdAt: NOW - 6 * DAY })] })).toBe('possibly_stale');
    expect(nextPageState({ ...base, openEvents: [event({ createdAt: NOW - 3 * DAY })], escalationDays: 3 })).toBe('stale');
    expect(nextPageState({ ...base, openEvents: [event(), event(), event()] })).toBe('stale');
    expect(nextPageState({ ...base, openEvents: [event({ severity: 'high', critical: true })] })).toBe('stale');
    expect(nextPageState({ ...base, openEvents: [event({ severity: 'high' })] })).toBe('possibly_stale');
  });

  it('keeps Stale until a person verifies or every event is dismissed', () => {
    expect(nextPageState({ current: 'stale', bindingCount: 1, openEvents: [event()], now: NOW })).toBe('stale');
  });
});
