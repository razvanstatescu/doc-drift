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
      '--cleanup-on-fail',
    ]);
  });

  it('keeps HTTP routes whole, but not relative imports or URLs', () => {
    expect(tokenize("router.post('/v1/refunds', h); import x from '../db/pool.js'; fetch('https://acme.dev/v2/charges')")).toEqual([
      'router.post',
      'refunds',
      'import',
      'from',
      'pool.js',
      'fetch',
      'https',
      'acme.dev',
      'charges',
      '/v1/refunds',
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
    expect([...ids.codeShaped]).toEqual(['ROLLBACK_TIMEOUT', '--wait']);
    expect([...ids.plain]).toEqual(['wait']);
  });

  it('works across files, so moved code is not counted as removed', () => {
    const diffs = parseUnifiedDiff(fileDiff('a.ts', ['export const PAYMENTS_DB_POOL = 20;'], []) + fileDiff('b.ts', [], ['export const PAYMENTS_DB_POOL = 20;']));
    expect(removedIdentifiers(diffs).codeShaped.size).toBe(0);
  });

  it('drops stopwords, SQL keywords, short tokens and capitalized prose words', () => {
    const diffs = parseUnifiedDiff(fileDiff('a.ts', ['// Return the TODO list from this function', 'POST /v1/refunds', 'SELECT id FROM refunds WHERE status = 1'], []));
    const ids = removedIdentifiers(diffs);
    expect([...ids.codeShaped]).toEqual(['/v1/refunds']);
    expect([...ids.plain]).toEqual(['refunds', 'status']);
  });

  it('skips files in deletedPaths', () => {
    const diffs = parseUnifiedDiff(fileDiff('gone.ts', ['export const REFUNDS_V1 = true;'], []) + fileDiff('config.ts', ['REFUNDS_V1_ENABLED=true'], []));
    expect([...removedIdentifiers(diffs, new Set(['gone.ts'])).codeShaped]).toEqual(['REFUNDS_V1_ENABLED']);
  });

  it('ignores added lines that only announce a removal (a renamed flag kept as a shim)', () => {
    const diffs = parseUnifiedDiff(
      fileDiff(
        'scripts/scale-workers.sh',
        ['    --count) COUNT="$2"; shift 2 ;;', '  echo "--count is required" >&2'],
        ['    --replicas) REPLICAS="$2"; shift 2 ;;', '    --count) echo "--count was renamed to --replicas" >&2; exit 2 ;;', '  echo "--replicas is required" >&2'],
      ),
    );
    expect([...removedIdentifiers(diffs).codeShaped]).toContain('--count');
  });

  it('still treats an identifier as used when a normal added line keeps it', () => {
    const diffs = parseUnifiedDiff(fileDiff('a.sh', ['run --count 3'], ['run --count 4 # renamed the variable only', 'run --count 5']));
    expect([...removedIdentifiers(diffs).codeShaped]).not.toContain('--count');
  });
});
