import { describe, expect, it } from 'vitest';
import { scoreChange, indexPages, DEFAULT_IGNORE_GLOBS } from '@dds/matcher';
import { parseChangeRecord, signBody, verifyBody } from '@dds/shared';
import { DEMO_CHANGE_RECORD } from '../src/lib/demo';
import {
  changeDedupeKey,
  checkIngestRequest,
  DEFAULT_SETTINGS,
  fromSqlDate,
  headerValue,
  matcherConfigFor,
  MAX_INGEST_BYTES,
  nextNotifyHop,
  normalizeSettings,
  notifyFirstHop,
  parseSettings,
  spaceWatched,
  severityRank,
  toSqlDate,
} from '../src/lib/ingest-rules';

describe('changeDedupeKey', () => {
  it('uses repoUuid#prId#mergeCommit for Bitbucket', () => {
    expect(changeDedupeKey(DEMO_CHANGE_RECORD)).toBe('{6f1d1c3e-0b8a-4e57-9f0a-2d5b1c7e4820}#482#8694b6072ff19fcb5824ab673eb846e7015ac85d');
  });
  it('uses the changelog id for Jira', () => {
    expect(changeDedupeKey({ source: 'jira', issueKey: 'PAY-1', changelogId: '9', changelog: [] })).toBe('jira#PAY-1#9');
  });
});

describe('headerValue', () => {
  it('finds lowercased array headers case-insensitively', () => {
    expect(headerValue({ 'x-dds-signature': ['abc'] }, 'X-DDS-Signature')).toBe('abc');
    expect(headerValue({ other: 'x' }, 'x-dds-timestamp')).toBeUndefined();
    expect(headerValue(undefined, 'a')).toBeUndefined();
  });
});

describe('settings', () => {
  it('maps presets to thresholds', () => {
    expect(matcherConfigFor({ sensitivity: 'strict' }).threshold).toBe(0.4);
    expect(matcherConfigFor(undefined)).toEqual({ threshold: 0.5, ignoreGlobs: [...DEFAULT_IGNORE_GLOBS], ignoreNonDefaultBranches: true });
    expect(matcherConfigFor({ sensitivity: 'quiet', ignoreGlobs: ['a/**'], ignoreNonDefaultBranches: false })).toEqual({
      threshold: 0.65,
      ignoreGlobs: ['a/**'],
      ignoreNonDefaultBranches: false,
    });
  });

  it('parses the settings form', () => {
    expect(parseSettings({ sensitivity: 'quiet', ignoreGlobs: ' **/*.lock\n\n**/*.lock\ndocs/** ' })).toEqual({
      ok: true,
      value: { ...DEFAULT_SETTINGS, sensitivity: 'quiet', ignoreGlobs: ['**/*.lock', 'docs/**'] },
    });
    expect(parseSettings({ sensitivity: 'balanced', notifyDebounceMinutes: 0, escalationDays: '3', notifyEnabled: false })).toMatchObject({
      ok: true,
      value: { notifyDebounceMinutes: 0, escalationDays: 3, notifyEnabled: false },
    });
    // Missing fields keep the current values.
    expect(parseSettings({ sensitivity: 'balanced' }, { notifyDebounceMinutes: 0, escalationDays: 2, jiraEnabled: false })).toMatchObject({
      value: { notifyDebounceMinutes: 0, escalationDays: 2, jiraEnabled: false },
    });
    expect(parseSettings({ sensitivity: 'loud' })).toMatchObject({ ok: false, fieldErrors: { sensitivity: 'Pick Strict, Balanced or Quiet.' } });
    expect(parseSettings({ sensitivity: 'strict', ignoreGlobs: ['has space'] })).toMatchObject({ ok: false });
  });

  it('limits escalation to 1 to 30 days and the debounce to 0 to 60 minutes', () => {
    expect(parseSettings({ escalationDays: 30, notifyDebounceMinutes: 60 })).toMatchObject({ ok: true, value: { escalationDays: 30, notifyDebounceMinutes: 60 } });
    for (const bad of [0, 31, 1.5, 'x']) expect(parseSettings({ escalationDays: bad })).toMatchObject({ ok: false, fieldErrors: { escalationDays: expect.any(String) } });
    for (const bad of [-1, 61, 2.5]) expect(parseSettings({ notifyDebounceMinutes: bad })).toMatchObject({ ok: false, fieldErrors: { notifyDebounceMinutes: expect.any(String) } });
  });

  it('returns every bad field at once', () => {
    const r = parseSettings({ sensitivity: 'loud', escalationDays: 99, notifyDebounceMinutes: 120, jiraEnabled: 'yes', ignoreGlobs: 'src/[a\nok/**' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.fieldErrors).sort()).toEqual(['escalationDays', 'ignoreGlobs', 'jiraEnabled', 'notifyDebounceMinutes', 'sensitivity']);
    expect(r.error).toBe('5 settings need a fix.');
    expect(r.fieldErrors.ignoreGlobs).toContain('src/[a has an unclosed bracket');
  });

  it('validates ignore globs with validateGlob', () => {
    expect(parseSettings({ ignoreGlobs: ['**/*.{ts,tsx', 'a b'] })).toMatchObject({
      ok: false,
      fieldErrors: { ignoreGlobs: expect.stringMatching(/^Fix these 2 globs: /) },
    });
    expect(parseSettings({ ignoreGlobs: Array.from({ length: 51 }, (_, i) => `d${i}/**`) })).toMatchObject({
      ok: false,
      fieldErrors: { ignoreGlobs: 'Use at most 50 ignore globs. You have 51.' },
    });
    // An empty list is allowed (nothing ignored).
    expect(parseSettings({ ignoreGlobs: '' })).toMatchObject({ ok: true, value: { ignoreGlobs: [] } });
  });

  it('needs at least 1 space in selected mode', () => {
    expect(parseSettings({ spaceMode: 'selected', spaceKeys: [] })).toMatchObject({ ok: false, fieldErrors: { spaceKeys: 'Pick at least 1 space, or watch all spaces.' } });
    expect(parseSettings({ spaceMode: 'selected', spaceKeys: ['PLAT', 'PLAT', 'DDSTEST'] })).toMatchObject({ ok: true, value: { spaceMode: 'selected', spaceKeys: ['PLAT', 'DDSTEST'] } });
    expect(parseSettings({ spaceKeys: ['bad key'] })).toMatchObject({ ok: false, fieldErrors: { spaceKeys: expect.stringContaining('bad key') } });
    expect(parseSettings({ spaceMode: 'some' })).toMatchObject({ ok: false, fieldErrors: { spaceMode: expect.any(String) } });
  });

  it('watches spaces by mode', () => {
    const selected = { spaceMode: 'selected' as const, spaceKeys: ['PLAT'] };
    expect(spaceWatched(selected, 'PLAT')).toBe(true);
    expect(spaceWatched(selected, 'plat')).toBe(true);
    expect(spaceWatched(selected, 'DDSTEST')).toBe(false);
    expect(spaceWatched(selected, null)).toBe(false);
    expect(spaceWatched({ spaceMode: 'all', spaceKeys: [] }, null)).toBe(true);
  });

  it('normalizes stored settings and maps the old notifyDelaySeconds', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ sensitivity: 'quiet', notifyDelaySeconds: 600, escalationDays: 90 })).toMatchObject({
      sensitivity: 'quiet',
      notifyDebounceMinutes: 10,
      escalationDays: 30,
    });
    expect(normalizeSettings({ notifyDelaySeconds: 20 }).notifyDebounceMinutes).toBe(1);
    expect(normalizeSettings({ notifyDelaySeconds: 0 }).notifyDebounceMinutes).toBe(0);
    expect(normalizeSettings({ notifyDebounceMinutes: 5, notifyDelaySeconds: 900 }).notifyDebounceMinutes).toBe(5);
    // Selected mode without spaces falls back to all spaces rather than watching nothing.
    expect(normalizeSettings({ spaceMode: 'selected', spaceKeys: [] }).spaceMode).toBe('all');
    expect(normalizeSettings({ jiraEnabled: 'no' }).jiraEnabled).toBe(true);
    // A legacy field in the form maps too.
    expect(parseSettings({ notifyDelaySeconds: 120 })).toMatchObject({ ok: true, value: { notifyDebounceMinutes: 2 } });
  });
});

describe('notification debounce hops', () => {
  const NOW = 1_800_000_000_000;
  it('uses one queue delay up to 900 s', () => {
    expect(notifyFirstHop(0, NOW)).toEqual({ delayInSeconds: 0 });
    expect(notifyFirstHop(600, NOW)).toEqual({ delayInSeconds: 600 });
    expect(notifyFirstHop(900, NOW)).toEqual({ delayInSeconds: 900 });
  });
  it('splits a longer debounce into hops', () => {
    const first = notifyFirstHop(3600, NOW);
    expect(first).toEqual({ delayInSeconds: 900, notBefore: NOW + 3_600_000 });
    expect(nextNotifyHop(first.notBefore, NOW + 900_000)).toBe(900);
    expect(nextNotifyHop(first.notBefore, NOW + 2_700_000)).toBe(900);
    expect(nextNotifyHop(first.notBefore, NOW + 3_000_000)).toBe(600);
    expect(nextNotifyHop(first.notBefore, NOW + 3_597_000)).toBeNull();
    expect(nextNotifyHop(undefined, NOW)).toBeNull();
    expect(notifyFirstHop(99_999, NOW).notBefore).toBe(NOW + 3_600_000);
  });
});

describe('ingest request check (HMAC)', () => {
  const SECRET = 'test-secret-test-secret-test-secret';
  const body = JSON.stringify(DEMO_CHANGE_RECORD);
  const NOW_MS = Date.UTC(2026, 10, 11, 12, 0, 0);
  const signed = (b: string, at = NOW_MS) => {
    const s = signBody(SECRET, b, at);
    return { body: b, headers: { 'x-dds-signature': [s.signature], 'x-dds-timestamp': [s.timestamp] } };
  };

  it('accepts a correctly signed record', () => {
    const r = checkIngestRequest(SECRET, signed(body), NOW_MS);
    expect(r).toMatchObject({ ok: true, kind: 'record' });
  });

  it('accepts a signed ping', () => {
    const ping = JSON.stringify({ source: 'ping', workspaceUuid: '{11111111-2222-3333-4444-555555555555}', sentAt: '2026-11-11T12:00:00Z' });
    expect(checkIngestRequest(SECRET, signed(ping), NOW_MS)).toMatchObject({ ok: true, kind: 'ping' });
  });

  it('rejects a bad signature, a wrong secret and a tampered body', () => {
    const req = signed(body);
    expect(checkIngestRequest('another-secret-another-secret-xx', req, NOW_MS)).toMatchObject({ ok: false, outputKey: 'unauthorized', reason: expect.stringContaining('bad_signature') });
    expect(checkIngestRequest(SECRET, { ...req, body: body.replace('482', '483') }, NOW_MS)).toMatchObject({ ok: false, outputKey: 'unauthorized' });
    expect(checkIngestRequest(SECRET, { body, headers: {} }, NOW_MS)).toMatchObject({ ok: false, outputKey: 'unauthorized', reason: expect.stringContaining('malformed') });
  });

  it('rejects everything when no secret is configured', () => {
    expect(checkIngestRequest(undefined, signed(body), NOW_MS)).toMatchObject({ ok: false, outputKey: 'unauthorized' });
  });

  it('rejects a stale or future timestamp (more than 300 s)', () => {
    expect(checkIngestRequest(SECRET, signed(body, NOW_MS - 301_000), NOW_MS)).toMatchObject({ ok: false, outputKey: 'unauthorized', reason: expect.stringContaining('stale') });
    expect(checkIngestRequest(SECRET, signed(body, NOW_MS + 301_000), NOW_MS)).toMatchObject({ ok: false, reason: expect.stringContaining('stale') });
    expect(checkIngestRequest(SECRET, signed(body, NOW_MS - 299_000), NOW_MS)).toMatchObject({ ok: true });
  });

  it('a replay inside the window passes the signature and dedupes on the same key', () => {
    const req = signed(body);
    const first = checkIngestRequest(SECRET, req, NOW_MS);
    const replay = checkIngestRequest(SECRET, req, NOW_MS + 60_000);
    expect(first.ok && replay.ok).toBe(true);
    if (!first.ok || !replay.ok || first.kind !== 'record' || replay.kind !== 'record') return;
    expect(changeDedupeKey(replay.record)).toBe(changeDedupeKey(first.record));
    // The same request after the window is refused.
    expect(checkIngestRequest(SECRET, req, NOW_MS + 301_000)).toMatchObject({ ok: false, outputKey: 'unauthorized' });
  });

  it('refuses an oversize body before checking the signature', () => {
    const big = 'x'.repeat(MAX_INGEST_BYTES + 1);
    expect(checkIngestRequest(SECRET, signed(big), NOW_MS)).toMatchObject({ ok: false, outputKey: 'bad-request', reason: expect.stringContaining('too large') });
  });

  it('refuses a signed body that is not JSON or not a record', () => {
    expect(checkIngestRequest(SECRET, signed('not json'), NOW_MS)).toMatchObject({ ok: false, outputKey: 'bad-request', reason: 'body is not JSON' });
    expect(checkIngestRequest(SECRET, signed('{"source":"bitbucket"}'), NOW_MS)).toMatchObject({ ok: false, outputKey: 'bad-request' });
  });
});

describe('dates and severity', () => {
  it('round-trips SQL datetimes in UTC', () => {
    const t = Date.UTC(2026, 10, 11, 14, 47, 23, 164);
    expect(toSqlDate(t)).toBe('2026-11-11 14:47:23.164');
    expect(fromSqlDate('2026-11-11 14:47:23.164')).toBe(t);
    expect(fromSqlDate(null)).toBeUndefined();
  });
  it('ranks severity', () => {
    expect([severityRank('high'), severityRank('medium'), severityRank(undefined)]).toEqual([2, 1, 0]);
  });
});

describe('demo change record', () => {
  it('is a valid change record that survives signing', () => {
    const body = JSON.stringify(DEMO_CHANGE_RECORD);
    const parsed = parseChangeRecord(JSON.parse(body));
    expect(parsed.ok).toBe(true);
    const signed = signBody('test-secret-test-secret-test-secret', body);
    expect(verifyBody('test-secret-test-secret-test-secret', body, signed.signature, signed.timestamp)).toEqual({ ok: true });
  });

  it('flags a page anchored to scripts/rollback.sh as High', () => {
    const storage = '<p>Run <code>./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT</code></p>';
    const result = scoreChange(
      DEMO_CHANGE_RECORD,
      [{ id: 'b1', pageId: 'p1', anchorType: 'path', repo: 'payments-api', pattern: 'scripts/rollback.sh', weight: 'normal' }],
      indexPages([{ pageId: 'p1', title: 'Payments rollback runbook', storage }]),
      matcherConfigFor(undefined),
    );
    expect(result.kind).toBe('scored');
    if (result.kind !== 'scored') return;
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ pageId: 'p1', severity: 'high' });
  });
});
