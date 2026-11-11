import { describe, expect, it } from 'vitest';
import { MAX_CLOCK_SKEW_SECONDS, signBody, verifyBody } from '../src/index.js';

const SECRET = 'test-secret-7f3c2a';
const BODY = JSON.stringify({ source: 'bitbucket', prId: 482 });
const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);

describe('signBody / verifyBody', () => {
  it('accepts a body it signed', () => {
    const { signature, timestamp } = signBody(SECRET, BODY, NOW);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyBody(SECRET, BODY, signature, timestamp, NOW + 1000)).toEqual({ ok: true });
  });

  it('rejects a changed body, a wrong secret and a moved timestamp', () => {
    const { signature, timestamp } = signBody(SECRET, BODY, NOW);
    expect(verifyBody(SECRET, `${BODY} `, signature, timestamp, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
    expect(verifyBody('other', BODY, signature, timestamp, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
    const moved = String(Number(timestamp) + 1);
    expect(verifyBody(SECRET, BODY, signature, moved, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects requests outside the clock skew window', () => {
    const { signature, timestamp } = signBody(SECRET, BODY, NOW);
    const late = NOW + (MAX_CLOCK_SKEW_SECONDS + 1) * 1000;
    const early = NOW - (MAX_CLOCK_SKEW_SECONDS + 1) * 1000;
    expect(verifyBody(SECRET, BODY, signature, timestamp, late)).toEqual({ ok: false, reason: 'stale_timestamp' });
    expect(verifyBody(SECRET, BODY, signature, timestamp, early)).toEqual({ ok: false, reason: 'stale_timestamp' });
  });

  it('rejects missing or malformed headers without throwing', () => {
    const { signature, timestamp } = signBody(SECRET, BODY, NOW);
    expect(verifyBody(SECRET, BODY, undefined, timestamp, NOW).ok).toBe(false);
    expect(verifyBody(SECRET, BODY, signature, undefined, NOW).ok).toBe(false);
    expect(verifyBody(SECRET, BODY, signature.slice(2), timestamp, NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyBody(SECRET, BODY, signature.toUpperCase(), timestamp, NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyBody(SECRET, BODY, signature, '12.5', NOW)).toEqual({ ok: false, reason: 'malformed' });
  });
});
