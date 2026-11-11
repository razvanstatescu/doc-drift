import { describe, expect, it } from 'vitest';
import { DEFAULT_IGNORE_GLOBS } from '../src/index.js';
import { GlobCache, ignoreMatcher, normalizePath, pathMatchStrength, repoMatches } from '../src/paths.js';
import { binding, change, modified } from './helpers.js';

describe('ignore globs', () => {
  const ignored = ignoreMatcher(DEFAULT_IGNORE_GLOBS);

  it.each([
    'src/routes/refunds.test.ts',
    'src/__tests__/server.ts',
    'pnpm-lock.yaml',
    'tools/package-lock.json',
    'web/yarn.lock',
    'Gemfile.lock',
    'ui/__snapshots__/a.snap',
    'packages/x/dist/index.js',
    'README.md',
    'docs/runbook.md',
  ])('ignores %s', (path) => expect(ignored(path)).toBe(true));

  it.each(['scripts/rollback.sh', 'deploy/helm/values.yaml', 'src/server.ts', 'package.json', 'src/testing.ts'])(
    'keeps %s',
    (path) => expect(ignored(path)).toBe(false),
  );

  it('ignores nothing with an empty list', () => {
    expect(ignoreMatcher([])('pnpm-lock.yaml')).toBe(false);
  });
});

describe('pathMatchStrength', () => {
  const globs = new GlobCache();
  const file = modified('deploy/helm/values.yaml', 1, 1);

  it('scores exact 1.0, glob 0.6, repo-wide 0.2', () => {
    expect(pathMatchStrength(binding('a', 'path', 'deploy/helm/values.yaml'), file, globs)).toBe(1);
    expect(pathMatchStrength(binding('b', 'glob', '/deploy/helm/**'), file, globs)).toBe(0.6);
    expect(pathMatchStrength(binding('c', 'repo'), file, globs)).toBe(0.2);
    expect(pathMatchStrength(binding('d', 'glob', 'scripts/**'), file, globs)).toBe(0);
    expect(pathMatchStrength(binding('e', 'jira', undefined, { jiraKey: 'PAY-1' }), file, globs)).toBe(0);
  });

  it('matches a renamed file on its old path, and a glob only on real matches', () => {
    const renamed = { status: 'renamed', path: 'scripts/rollback-v2.sh', oldPath: 'scripts/rollback.sh', linesAdded: 0, linesRemoved: 0 } as const;
    expect(pathMatchStrength(binding('a', 'path', './scripts/rollback.sh'), renamed, globs)).toBe(1);
    expect(pathMatchStrength(binding('b', 'glob', 'deploy/**'), renamed, globs)).toBe(0);
  });

  it('normalizes leading ./ and /', () => {
    expect(normalizePath('./scripts/x.sh')).toBe('scripts/x.sh');
    expect(normalizePath('/deploy/helm/**')).toBe('deploy/helm/**');
  });
});

describe('repoMatches', () => {
  const c = change([]);
  it.each(['nano-soft-dev/payments-api', 'payments-api', 'Payments-API', '{6f1d1c3e-0b8a-4e57-9f0a-2d5b1c7e4820}', '6f1d1c3e-0b8a-4e57-9f0a-2d5b1c7e4820'])(
    'matches %s',
    (repo) => expect(repoMatches(repo, c)).toBe(true),
  );
  it('rejects other repos and missing values', () => {
    expect(repoMatches('nano-soft-dev/billing-api', c)).toBe(false);
    expect(repoMatches(undefined, c)).toBe(false);
  });
});
