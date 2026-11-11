import { describe, expect, it } from 'vitest';
import { parseUnifiedDiff } from '../src/index.js';
import { isCodeShaped, removedIdentifiers, tokenize } from '../src/identifiers.js';
import { fileDiff } from './helpers.js';

describe('tokenize', () => {
  it('finds identifier-like tokens of 4+ characters and trims sentence punctuation', () => {
    expect(tokenize('Set ROLLBACK_TIMEOUT. Run ./scripts/rollback.sh --cleanup-on-fail, then log.info(x)')).toEqual([
      'ROLLBACK_TIMEOUT',
      'scripts',
      'rollback.sh',
      'cleanup-on-fail',
      'then',
      'log.info',
    ]);
  });
});

describe('isCodeShaped', () => {
  it.each(['ROLLBACK_TIMEOUT', 'replicaCount', 'log.info', 'cleanup-on-fail', 'v2_api', 'TIMEOUT'])('%s is code-shaped', (t) =>
    expect(isCodeShaped(t)).toBe(true),
  );
  it.each(['timeout', 'Helm', 'release'])('%s is not', (t) => expect(isCodeShaped(t)).toBe(false));
});

describe('removedIdentifiers', () => {
  it('keeps identifiers that no added line still uses', () => {
    const diffs = parseUnifiedDiff(
      fileDiff('scripts/rollback.sh', ['TIMEOUT="${ROLLBACK_TIMEOUT:-300}"', 'helm rollback payments --wait'], ['TIMEOUT="${ROLLBACK_TIMEOUT_SECS:-300}"', 'helm rollback payments']),
    );
    const ids = removedIdentifiers(diffs);
    expect([...ids.codeShaped]).toEqual(['ROLLBACK_TIMEOUT']);
    expect([...ids.plain]).toEqual(['wait']);
  });

  it('works across files, so moved code is not counted as removed', () => {
    const diffs = parseUnifiedDiff(fileDiff('a.ts', ['export const PAYMENTS_DB_POOL = 20;'], []) + fileDiff('b.ts', [], ['export const PAYMENTS_DB_POOL = 20;']));
    expect(removedIdentifiers(diffs).codeShaped.size).toBe(0);
  });

  it('drops stopwords, short tokens and capitalized prose words', () => {
    const diffs = parseUnifiedDiff(fileDiff('a.ts', ['// Return the TODO list from this function', 'POST /v1/refunds'], []));
    const ids = removedIdentifiers(diffs);
    expect([...ids.codeShaped]).toEqual([]);
    expect([...ids.plain]).toEqual(['refunds']);
  });
});
