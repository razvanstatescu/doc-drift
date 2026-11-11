import { describe, expect, it } from 'vitest';
import { scoreChange, indexPages, DEFAULT_IGNORE_GLOBS } from '@dds/matcher';
import { parseChangeRecord, signBody, verifyBody } from '@dds/shared';
import { DEMO_CHANGE_RECORD } from '../src/lib/demo';
import {
  changeDedupeKey,
  fromSqlDate,
  headerValue,
  matcherConfigFor,
  parseSettings,
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
    expect(matcherConfigFor(undefined)).toEqual({ threshold: 0.5, ignoreGlobs: [...DEFAULT_IGNORE_GLOBS] });
    expect(matcherConfigFor({ sensitivity: 'quiet', ignoreGlobs: ['a/**'] })).toEqual({ threshold: 0.65, ignoreGlobs: ['a/**'] });
  });

  it('parses the settings form', () => {
    expect(parseSettings({ sensitivity: 'quiet', ignoreGlobs: ' **/*.lock\n\n**/*.lock\ndocs/** ' })).toEqual({
      ok: true,
      value: { sensitivity: 'quiet', ignoreGlobs: ['**/*.lock', 'docs/**'] },
    });
    expect(parseSettings({ sensitivity: 'loud' })).toMatchObject({ ok: false });
    expect(parseSettings({ sensitivity: 'strict', ignoreGlobs: ['has space'] })).toMatchObject({ ok: false });
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
