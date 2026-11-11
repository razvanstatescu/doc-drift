import { describe, expect, it } from 'vitest';
import { isPingBody, parsePingRecord } from '../src/index.js';

describe('parsePingRecord', () => {
  it('accepts a well-formed ping', () => {
    const r = parsePingRecord({ source: 'ping', workspaceUuid: '{abc}', sentAt: '2026-11-11T15:00:00Z' });
    expect(r.ok).toBe(true);
  });

  it('rejects wrong source, missing fields and bad dates', () => {
    expect(parsePingRecord({ source: 'bitbucket', workspaceUuid: '{a}', sentAt: '2026-11-11T15:00:00Z' }).ok).toBe(false);
    expect(parsePingRecord({ source: 'ping', sentAt: '2026-11-11T15:00:00Z' }).ok).toBe(false);
    expect(parsePingRecord({ source: 'ping', workspaceUuid: '{a}', sentAt: 'yesterday' }).ok).toBe(false);
    expect(parsePingRecord(null).ok).toBe(false);
  });

  it('routes by source', () => {
    expect(isPingBody({ source: 'ping' })).toBe(true);
    expect(isPingBody({ source: 'bitbucket' })).toBe(false);
    expect(isPingBody('ping')).toBe(false);
  });
});
