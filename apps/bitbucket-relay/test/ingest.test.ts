import { describe, expect, it } from 'vitest';
import { buildPingRecord, classifyCoreResponse, redactUrl, validateIngestUrl, validateSecret } from '../src/lib/ingest';

const GOOD = 'https://c51cc8bf-63be-435d-9ced-66f000d7a4c0.webtrigger.atlassian.app/public/abc123';

describe('validateIngestUrl', () => {
  it('accepts a v2 web trigger URL and trims it', () => {
    expect(validateIngestUrl(`  ${GOOD} `)).toEqual({ ok: true, value: GOOD });
  });

  it.each([
    ['http (not https)', GOOD.replace('https:', 'http:')],
    ['v1 host', 'https://abc.hello.atlassian-dev.net/x1/abc'],
    ['look-alike host', 'https://abc.webtrigger.atlassian.app.evil.com/public/x'],
    ['nested subdomain', 'https://a.b.webtrigger.atlassian.app/public/x'],
    ['bare parent domain', 'https://webtrigger.atlassian.app/public/x'],
    ['credentials', 'https://u:p@abc.webtrigger.atlassian.app/public/x'],
    ['port', 'https://abc.webtrigger.atlassian.app:8443/public/x'],
    ['no path', 'https://abc.webtrigger.atlassian.app/'],
    ['not a URL', 'webtrigger.atlassian.app'],
    ['empty', ''],
    ['not a string', 42],
  ])('rejects %s', (_label, raw) => {
    const result = validateIngestUrl(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('webtrigger.atlassian.app');
  });
});

describe('validateSecret', () => {
  it('accepts a long secret and trims it', () => {
    expect(validateSecret(` ${'a'.repeat(64)}\n`)).toEqual({ ok: true, value: 'a'.repeat(64) });
  });

  it('rejects short, spaced or missing secrets without echoing them', () => {
    for (const raw of ['short', `${'a'.repeat(20)} ${'b'.repeat(20)}`, undefined, 'x'.repeat(300)]) {
      const result = validateSecret(raw);
      expect(result.ok).toBe(false);
      if (!result.ok && typeof raw === 'string') expect(result.message).not.toContain(raw);
    }
  });
});

describe('ping and responses', () => {
  it('builds a ping record', () => {
    expect(buildPingRecord('{w1}', new Date('2026-11-11T12:00:00Z'))).toEqual({
      source: 'ping',
      workspaceUuid: '{w1}',
      sentAt: '2026-11-11T12:00:00.000Z',
    });
  });

  it('classifies core answers', () => {
    expect(classifyCoreResponse(202)).toEqual({ kind: 'accepted' });
    expect(classifyCoreResponse(401).kind).toBe('rejected');
    expect(classifyCoreResponse(400).kind).toBe('rejected');
    expect(classifyCoreResponse(404).kind).toBe('rejected');
    expect(classifyCoreResponse(429).kind).toBe('retry');
    expect(classifyCoreResponse(503).kind).toBe('retry');
    expect(classifyCoreResponse(418).kind).toBe('rejected');
  });

  it('uses calm wording with no exclamation marks', () => {
    for (const status of [400, 401, 404, 429, 500]) {
      const outcome = classifyCoreResponse(status);
      if (outcome.kind !== 'accepted') expect(outcome.message).not.toContain('!');
    }
  });

  it('redacts the URL token', () => {
    expect(redactUrl(GOOD)).toBe('c51cc8bf-63be-435d-9ced-66f000d7a4c0.webtrigger.atlassian.app');
    expect(redactUrl('nope')).toBe('invalid URL');
  });
});
