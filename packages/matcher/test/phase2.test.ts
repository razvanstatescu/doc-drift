// Phase 2 backend fixes (docs/testing/backlog-phase2.md, Track A): binding excludes (R-7), reverts
// scored as changes (BUG-02), truncated diffstats (BUG-08), boosts once per page (BUG-14).
import { describe, expect, it } from 'vitest';
import { indexPages } from '../src/page-index.js';
import { GlobCache, isExcluded, pathMatchStrength } from '../src/paths.js';
import { scoreChange } from '../src/score.js';
import { binding, change, fileDiff, modified } from './helpers.js';

describe('binding excludes (R-7)', () => {
  const globs = new GlobCache();
  it('an excluded file never matches a glob or repo binding', () => {
    const glob = binding('g', 'glob', 'deploy/**', { exclude: ['deploy/helm/values.yaml'] });
    expect(pathMatchStrength(glob, modified('deploy/helm/values.yaml', 1, 1), globs)).toBe(0);
    expect(pathMatchStrength(glob, modified('deploy/helm/chart.yaml', 1, 1), globs)).toBe(0.6);
    const repo = binding('r', 'repo', undefined, { exclude: ['src/utils/**'] });
    expect(pathMatchStrength(repo, modified('src/utils/a.ts', 1, 1), globs)).toBe(0);
    expect(pathMatchStrength(repo, modified('src/app.ts', 1, 1), globs)).toBe(0.2);
  });
  it('a rename matches unless both of its paths are excluded', () => {
    expect(isExcluded({ exclude: ['a/old.sh'] }, ['a/new.sh', 'a/old.sh'], globs)).toBe(false);
    expect(isExcluded({ exclude: ['a/*.sh'] }, ['a/new.sh', 'a/old.sh'], globs)).toBe(true);
  });
  it('no exclude list changes nothing', () => {
    expect(isExcluded({}, ['a'], globs)).toBe(false);
    expect(isExcluded({ exclude: [] }, ['a'], globs)).toBe(false);
  });
});

describe('reverts scored as changes (BUG-02)', () => {
  const anchor = binding('a', 'path', 'scripts/rollback.sh', { weight: 'critical' });
  const revert = change([modified('scripts/rollback.sh', 20, 20)], { title: 'Revert "Raise timeout" (pull request #10)' });
  it('a revert is reported as a revert by default', () => {
    expect(scoreChange(revert, [anchor], new Map()).kind).toBe('revert');
  });
  it('with scoreReverts it is scored like any other change', () => {
    const r = scoreChange(revert, [anchor], new Map(), { scoreReverts: true });
    expect(r.kind).toBe('scored');
    if (r.kind === 'scored') expect(r.events).toHaveLength(1);
  });
});

describe('truncated diffstat (BUG-08)', () => {
  it('every event of the change says only the first files were checked', () => {
    const files = [modified('scripts/rollback.sh', 20, 20)];
    const r = scoreChange(change(files, { filesTruncated: true, totalFiles: 812 }), [binding('a', 'path', 'scripts/rollback.sh', { weight: 'critical' })], new Map());
    expect(r.kind === 'scored' && r.events[0]!.reasons).toContain('This PR changed 812 files; only the first 1 were checked');
  });
});

describe('boost reasons once per page (BUG-14)', () => {
  it('two anchors of one page matched by one PR: the identifier reason appears once, scores unchanged', () => {
    const page = { pageId: 'page-p', storage: '<p>Run <code>--retries</code></p>' };
    const a = binding('a', 'path', 'scripts/a.sh', { pageId: 'page-p' });
    const b = binding('b', 'path', 'scripts/b.sh', { pageId: 'page-p' });
    const hunks = fileDiff('scripts/a.sh', ['run --retries 3'], ['run --attempts 3']) + fileDiff('scripts/b.sh', ['x --retries'], ['x --attempts']);
    const r = scoreChange(change([modified('scripts/a.sh', 1, 1), modified('scripts/b.sh', 1, 1)], { hunks }), [a, b], indexPages([page]));
    expect(r.kind).toBe('scored');
    if (r.kind !== 'scored') return;
    expect(r.events).toHaveLength(2);
    const mentions = r.events.flatMap((e) => e.reasons).filter((x) => x.startsWith('Page mentions'));
    expect(mentions).toHaveLength(1);
    expect(r.events.every((e) => e.score >= 0.5)).toBe(true);
  });
});
