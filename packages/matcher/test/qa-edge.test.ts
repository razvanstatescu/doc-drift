// QA edge cases (docs/testing/test-plan.md, run 2026-11-11). Cases marked `it.fails` reproduce a bug
// from docs/testing/test-report-2026-11-11.md: they pass while the bug exists and start failing (so
// flip them to `it`) once it is fixed.
import { describe, expect, it } from 'vitest';
import { parseChangeRecord, type ChangedFile } from '@dds/shared';
import { detectRevert } from '../src/revert.js';
import { parseUnifiedDiff } from '../src/diff.js';
import { ignoreMatcher, validateGlob, GlobCache, pathMatchStrength } from '../src/paths.js';
import { indexPages } from '../src/page-index.js';
import { scoreChange } from '../src/score.js';
import { nextPageState } from '../src/state.js';
import { jiraSignals } from '../src/jira.js';
import { suggestAnchors } from '../src/suggest.js';
import { extractPageText } from '../src/page-text.js';
import { DEFAULT_IGNORE_GLOBS } from '../src/config.js';
import { binding, change, fileDiff, modified } from './helpers.js';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 11, 12);

describe('QA: revert detection', () => {
  it('detects a plain revert and its PR number', () => {
    expect(detectRevert('Revert "Raise pool" (pull request #10)')).toEqual({ revertedTitle: 'Raise pool', revertedPrId: 10 });
  });
  it('a revert of a revert is a normal change', () => {
    expect(detectRevert('Revert "Revert "Raise pool" (pull request #10)" (pull request #11)')).toBeUndefined();
  });
  it('a revert of a revert of a revert is a revert again', () => {
    expect(detectRevert('Revert "Revert "Revert "X"""')).toEqual({ revertedTitle: 'X' });
  });
  // BUG-03: the first "#N" anywhere in the title wins, so a "#77" inside the original title is taken
  // as the reverted PR, and PR #77's events (not PR #10's) are closed.
  it.fails('BUG-03: takes the PR number from the "(pull request #N)" suffix, not from the original title', () => {
    expect(detectRevert('Revert "Fix #77: raise pool" (pull request #10)')?.revertedPrId).toBe(10);
  });
  it('case: lowercase "revert" is not detected (git always writes "Revert")', () => {
    expect(detectRevert('revert "Raise pool"')).toBeUndefined();
  });
  it('case: GitHub/Bitbucket "Reverted ..." wording is not detected', () => {
    expect(detectRevert('Reverted "Raise pool"')).toBeUndefined();
  });
});

describe('QA: unified diff parsing', () => {
  it('handles CRLF, "\\ No newline" and a binary file', () => {
    const diff = [
      'diff --git a/a.sh b/a.sh',
      '--- a/a.sh',
      '+++ b/a.sh',
      '@@ -1,2 +1,2 @@',
      '-OLD_FLAG=1',
      '\\ No newline at end of file',
      '+NEW_FLAG=1',
      ' keep',
      'diff --git a/logo.png b/logo.png',
      'Binary files a/logo.png and b/logo.png differ',
    ].join('\r\n');
    const files = parseUnifiedDiff(diff);
    expect(files.map((f) => f.path)).toEqual(['a.sh', 'logo.png']);
    expect(files[0]!.removed).toEqual(['OLD_FLAG=1']);
    expect(files[0]!.added).toEqual(['NEW_FLAG=1']);
    expect(files[1]!.removed).toEqual([]);
  });
  it('reads content lines that start with "diff --git" and "---" inside a hunk', () => {
    const diff = fileDiff('docs/x.sh', ['--- not a header', 'diff --git a/q b/q'], ['+++ also content']);
    const [f] = parseUnifiedDiff(diff);
    expect(f!.removed).toEqual(['--- not a header', 'diff --git a/q b/q']);
    expect(f!.added).toEqual(['+++ also content']);
  });
  it('unicode and spaces in paths survive', () => {
    const diff = fileDiff('docs/café ünï/日本.sh', ['a'], ['b']);
    expect(parseUnifiedDiff(diff)[0]!.path).toBe('docs/café ünï/日本.sh');
  });
  it('git quotes paths with non-ASCII bytes when core.quotePath is on', () => {
    // `git diff` (default core.quotePath=true) writes "a/caf\303\251.sh"; Bitbucket's /diff may too.
    const diff = 'diff --git "a/caf\\303\\251.sh" "b/caf\\303\\251.sh"\n--- "a/caf\\303\\251.sh"\n+++ "b/caf\\303\\251.sh"\n@@ -1 +1 @@\n-A_FLAG\n+B_FLAG\n';
    const files = parseUnifiedDiff(diff);
    // Observed: the quoted form is not decoded, so the diff can't be joined to the diffstat path
    // `café.sh`. Low impact (boosts and cosmetic check only); recorded as an observation.
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.path === 'café.sh')).toBe(false);
  });
});

describe('QA: paths and globs', () => {
  const globs = new GlobCache();
  it('exact match is case-sensitive (git paths are)', () => {
    expect(pathMatchStrength(binding('b', 'path', 'Scripts/Rollback.sh'), modified('scripts/rollback.sh', 1, 1), globs)).toBe(0);
  });
  it('leading ./ and / are ignored on both sides', () => {
    expect(pathMatchStrength(binding('b', 'path', './scripts/a.sh'), modified('/scripts/a.sh', 1, 1), globs)).toBe(1);
  });
  it('a folder written without a glob ("deploy/helm" or "deploy/helm/") never matches a file under it', () => {
    // Recorded as BUG-06 at the anchor layer (apps/core anchors.ts accepts it as a path anchor).
    expect(pathMatchStrength(binding('b', 'path', 'deploy/helm/'), modified('deploy/helm/values.yaml', 1, 1), globs)).toBe(0);
    expect(pathMatchStrength(binding('b', 'path', 'deploy/helm'), modified('deploy/helm/values.yaml', 1, 1), globs)).toBe(0);
  });
  it('an unbalanced glob anchor does not throw while scoring', () => {
    for (const p of ['src/[a', 'src/{a', 'src/(a', 'src/**/[', '***']) {
      expect(() => pathMatchStrength(binding('b', 'glob', p), modified('src/a', 1, 1), new GlobCache())).not.toThrow();
    }
  });
  it('unicode paths match exactly (NFC on both sides)', () => {
    expect(pathMatchStrength(binding('b', 'path', 'docs/café.sh'), modified('docs/café.sh', 1, 1), globs)).toBe(1);
  });
  it('NFD vs NFC spellings of the same path do not match', () => {
    const nfd = 'docs/café.sh';
    expect(pathMatchStrength(binding('b', 'path', 'docs/café.sh'), modified(nfd, 1, 1), globs)).toBe(0);
  });
  // BUG-01: a negated ignore glob (gitignore idiom "!docs/keep.md") passes validation and, OR'd with
  // the others, matches every other file: every change is "all files ignored" and nothing ever flags.
  it.fails('BUG-01: a "!pattern" ignore glob is refused by validateGlob', () => {
    expect(validateGlob('!docs/keep.md')).not.toBeNull();
  });
  it('BUG-01 impact: with "!docs/keep.md" in the ignore list every file is ignored', () => {
    const isIgnored = ignoreMatcher([...DEFAULT_IGNORE_GLOBS, '!docs/keep.md']);
    expect(isIgnored('scripts/rollback.sh')).toBe(true);
    expect(isIgnored('src/app.ts')).toBe(true);
    const r = scoreChange(change([modified('scripts/rollback.sh', 50, 50)]), [binding('b', 'path', 'scripts/rollback.sh', { weight: 'critical' })], new Map(), {
      ignoreGlobs: [...DEFAULT_IGNORE_GLOBS, '!docs/keep.md'],
    });
    expect(r).toEqual({ kind: 'skipped', reason: 'no_relevant_files' });
  });
  it('a name-only negated glob ("!README.md") is harmless (prefixed with **/)', () => {
    expect(ignoreMatcher(['!README.md'])('scripts/a.sh')).toBe(false);
  });
  it('validateGlob refuses the obvious bad inputs', () => {
    expect(validateGlob('')).toBe('is empty');
    expect(validateGlob('   ')).toBe('is empty');
    expect(validateGlob('src/[a')).toMatch(/unclosed/);
    expect(validateGlob('my dir/**')).toBe('has a space');
    expect(validateGlob('a'.repeat(201))).toMatch(/longer/);
    expect(validateGlob('/dist/**')).toBeNull();
  });
});

describe('QA: scoring edge cases', () => {
  const crit = binding('c', 'path', 'scripts/deploy.sh', { weight: 'critical' });
  const norm = binding('n', 'path', 'scripts/deploy.sh');
  it('renamed + modified anchored file: High, full magnitude, a rename proposal', () => {
    const r = scoreChange(change([{ status: 'renamed', oldPath: 'scripts/deploy.sh', path: 'scripts/deploy-v2.sh', linesAdded: 4, linesRemoved: 2 }]), [norm], new Map());
    expect(r.kind).toBe('scored');
    if (r.kind !== 'scored') return;
    expect(r.events[0]).toMatchObject({ score: 0.7, severity: 'high' });
    expect(r.renameProposals).toEqual([{ bindingId: 'n', pageId: 'page-n', from: 'scripts/deploy.sh', to: 'scripts/deploy-v2.sh' }]);
  });
  it('deleted anchored file: High on a normal anchor', () => {
    const r = scoreChange(change([{ status: 'removed', path: 'scripts/deploy.sh', linesAdded: 0, linesRemoved: 40 }]), [norm], new Map());
    expect(r.kind === 'scored' && r.events[0]).toMatchObject({ score: 0.7, severity: 'high' });
  });
  it('a glob that matches 0 files creates no event', () => {
    const r = scoreChange(change([modified('src/a.ts', 50, 50)]), [binding('g', 'glob', 'lib/**', { weight: 'critical' })], new Map());
    expect(r).toEqual({ kind: 'scored', events: [], renameProposals: [] });
  });
  it('binary file (0/0 lines) on a critical anchor flags at exactly the threshold', () => {
    const r = scoreChange(change([modified('assets/logo.png', 0, 0)]), [binding('c', 'path', 'assets/logo.png', { weight: 'critical' })], new Map());
    expect(r.kind === 'scored' && r.events[0]?.score).toBe(0.5);
  });
  it('400 files: only the anchored file counts, the others add a "more files" reason only when matched', () => {
    const files: ChangedFile[] = Array.from({ length: 400 }, (_, i) => modified(`gen/file-${i}.ts`, 1, 1));
    files.push(modified('scripts/deploy.sh', 30, 5));
    const t0 = performance.now();
    const r = scoreChange(change(files), [crit, binding('g', 'glob', 'gen/**')], new Map());
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(r.kind === 'scored' && r.events.map((e) => [e.bindingId, e.score])).toEqual([['c', 0.89]]);
  });
  it('500 files is the validator cap; 501 is refused', () => {
    const mk = (n: number) => ({ ...change(Array.from({ length: n }, (_, i) => modified(`f${i}`, 1, 1))) });
    expect(parseChangeRecord(mk(500)).ok).toBe(true);
    expect(parseChangeRecord(mk(501)).ok).toBe(false);
  });
  it('validator: "..", NUL and unicode paths', () => {
    const bad = parseChangeRecord(change([modified('../etc/passwd', 1, 1)]));
    expect(bad.ok).toBe(false);
    expect(parseChangeRecord(change([modified('a\u0000b', 1, 1)])).ok).toBe(false);
    expect(parseChangeRecord(change([modified('docs/日本語/ファイル.md', 1, 1)])).ok).toBe(true);
    expect(parseChangeRecord(change([modified('/abs/path.sh', 1, 1)])).ok).toBe(true);
  });
  it('identifier boost needs a path match first', () => {
    const page = indexPages([{ pageId: 'page-x', storage: '<p>Set <code>QA_TIMEOUT</code>.</p>' }]);
    const diff = fileDiff('other/file.sh', ['export QA_TIMEOUT=5'], ['export QA_TIMEOUT_SECS=5']);
    const r = scoreChange(change([modified('other/file.sh', 1, 1)], { hunks: diff }), [binding('x', 'path', 'scripts/a.sh')], page);
    expect(r.kind === 'scored' && r.events).toEqual([]);
  });
  it('the same anchor written as slug and workspace/slug on one page: 2 events for 1 change', () => {
    const a = binding('a', 'path', 'scripts/deploy.sh', { repo: 'payments-api', pageId: 'p1', weight: 'critical' });
    const b = binding('b', 'path', 'scripts/deploy.sh', { repo: 'nano-soft-dev/payments-api', pageId: 'p1', weight: 'critical' });
    const r = scoreChange(change([modified('scripts/deploy.sh', 10, 10)]), [a, b], new Map());
    expect(r.kind === 'scored' && r.events.length).toBe(2);
  });
  it('non-default branch is skipped; unknown default branch is scored', () => {
    expect(scoreChange(change([modified('scripts/deploy.sh', 9, 9)], { destinationBranch: 'release/1' }), [crit], new Map())).toEqual({ kind: 'skipped', reason: 'non_default_branch' });
    const { defaultBranch: _d, ...noDefault } = change([modified('scripts/deploy.sh', 9, 9)], { destinationBranch: 'release/1' });
    expect(scoreChange(noDefault, [crit], new Map()).kind).toBe('scored');
  });
  it('a revert whose files are all ignored is "skipped", not a revert (its events stay open)', () => {
    const r = scoreChange(change([modified('package-lock.json', 10, 10)], { title: 'Revert "Bump lockfile" (pull request #7)' }), [crit], new Map());
    expect(r).toEqual({ kind: 'skipped', reason: 'no_relevant_files' });
  });
});

describe('QA: Jira rules', () => {
  const rec = (changelog: { field: string; from?: string | null; to?: string | null }[], statusCategory?: 'new' | 'indeterminate' | 'done') => ({
    source: 'jira' as const,
    issueKey: 'PAY-21',
    changelogId: '1',
    ...(statusCategory && { statusCategory }),
    changelog,
  });
  it('Won’t Do with a curly apostrophe counts', () => {
    expect(jiraSignals(rec([{ field: 'status', from: 'To Do', to: 'Won’t Do' }]))[0]?.score).toBe(0.7);
  });
  it('status to In Progress is not a signal', () => {
    expect(jiraSignals(rec([{ field: 'status', from: 'To Do', to: 'In Progress' }], 'indeterminate'))).toEqual([]);
  });
  it('a reopened issue (Done to To Do) is not a signal', () => {
    expect(jiraSignals(rec([{ field: 'status', from: 'Done', to: 'To Do' }], 'new'))).toEqual([]);
  });
  it('Done to Closed (both Done category) counts again as "moved to Closed"', () => {
    expect(jiraSignals(rec([{ field: 'status', from: 'Done', to: 'Closed' }], 'done'))[0]).toMatchObject({ score: 0.7, reason: 'PAY-21 moved to Closed' });
  });
  it('fix version removed (to null) still scores 0.6', () => {
    expect(jiraSignals(rec([{ field: 'Fix Version', from: '2026.12', to: null }]))[0]?.score).toBe(0.6);
  });
  it('description at Quiet (0.65) never flags; Done does', () => {
    const b = binding('j', 'jira', undefined, { jiraKey: 'PAY-21', repo: undefined });
    const quiet = { threshold: 0.65 };
    expect((scoreChange(rec([{ field: 'description' }]), [b], new Map(), quiet) as { events: unknown[] }).events).toHaveLength(0);
    expect((scoreChange(rec([{ field: 'status', to: 'Done' }], 'done'), [b], new Map(), quiet) as { events: unknown[] }).events).toHaveLength(1);
  });
  it('summary-only stays quiet even at Strict', () => {
    const b = binding('j', 'jira', undefined, { jiraKey: 'PAY-21', repo: undefined });
    expect((scoreChange(rec([{ field: 'summary', from: 'a', to: 'b' }]), [b], new Map(), { threshold: 0.4 }) as { events: unknown[] }).events).toHaveLength(0);
  });
});

describe('QA: page state timing (D27)', () => {
  const ev = (o: Partial<{ severity: 'high' | 'medium'; critical: boolean; createdAt: number; ref: string; snoozedUntil: number }>) => ({
    severity: 'medium' as const,
    critical: false,
    createdAt: NOW,
    ref: 'r1',
    ...o,
  });
  it('escalates at exactly escalationDays, not a millisecond before', () => {
    const base = { current: 'possibly_stale' as const, bindingCount: 1, escalationDays: 7 };
    expect(nextPageState({ ...base, openEvents: [ev({ createdAt: NOW - 7 * DAY + 1 })], now: NOW })).toBe('possibly_stale');
    expect(nextPageState({ ...base, openEvents: [ev({ createdAt: NOW - 7 * DAY })], now: NOW })).toBe('stale');
  });
  it('a snooze that ended restarts the clock at the snooze end', () => {
    const base = { current: 'possibly_stale' as const, bindingCount: 1, escalationDays: 7 };
    const e = ev({ createdAt: NOW - 20 * DAY, snoozedUntil: NOW - 2 * DAY });
    expect(nextPageState({ ...base, openEvents: [e], now: NOW })).toBe('possibly_stale');
    expect(nextPageState({ ...base, openEvents: [e], now: NOW + 5 * DAY })).toBe('stale');
  });
  it('3 events of 1 change do not escalate; 3 changes do', () => {
    const base = { current: 'possibly_stale' as const, bindingCount: 1, now: NOW };
    expect(nextPageState({ ...base, openEvents: [ev({}), ev({}), ev({})] })).toBe('possibly_stale');
    expect(nextPageState({ ...base, openEvents: [ev({ ref: 'a' }), ev({ ref: 'b' }), ev({ ref: 'c' })] })).toBe('stale');
  });
  it('snoozing a Stale page reads Possibly stale (a snooze "un-stales" it)', () => {
    expect(nextPageState({ current: 'stale', bindingCount: 1, now: NOW, openEvents: [ev({ snoozedUntil: NOW + DAY })] })).toBe('possibly_stale');
  });
  it('after the snooze ends, a previously Stale page comes back as Possibly stale unless it re-qualifies', () => {
    // current is now possibly_stale (stored during the snooze); 1 change, 2 days old: stays Possibly stale.
    expect(nextPageState({ current: 'possibly_stale', bindingCount: 1, now: NOW, openEvents: [ev({ createdAt: NOW - 2 * DAY, snoozedUntil: NOW - 1 })] })).toBe('possibly_stale');
  });
  it('a further High on a critical anchor from the same change does not escalate', () => {
    const base = { current: 'possibly_stale' as const, bindingCount: 2, now: NOW };
    expect(nextPageState({ ...base, openEvents: [ev({ severity: 'high', critical: true, ref: 'a' }), ev({ severity: 'high', critical: true, ref: 'a', createdAt: NOW + 1 })] })).toBe('possibly_stale');
    expect(nextPageState({ ...base, openEvents: [ev({ severity: 'high', critical: true, ref: 'a' }), ev({ severity: 'high', critical: true, ref: 'b', createdAt: NOW + 1 })] })).toBe('stale');
  });
});

describe('QA: anchor suggestions', () => {
  it('ignores system paths and hosts, keeps repo paths, and suggests Jira keys', () => {
    const s = suggestAnchors(
      extractPageText(
        '<p>See <a href="https://bitbucket.org/nano-soft-dev/qa-sandbox/src/main/scripts/qa-deploy.sh">script</a>. Ticket PAY-21, encoding UTF-8.</p>' +
          '<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[cd /usr/local/bin\n./scripts/qa-deploy.sh --retries 3\ncat config/qa/settings.yaml\ncurl api.example.com/v1/x]]></ac:plain-text-body></ac:structured-macro>',
      ),
    );
    const labels = s.map((x) => x.label);
    expect(labels).toContain('qa-sandbox: scripts/qa-deploy.sh');
    expect(labels).toContain('qa-sandbox: config/qa/settings.yaml');
    expect(labels).toContain('PAY-21');
    expect(labels).not.toContain('UTF-8');
    expect(labels.some((l) => l.includes('usr/local'))).toBe(false);
    expect(labels.some((l) => l.includes('example.com'))).toBe(false);
  });
  it('version-like tokens are suggested as Jira keys (COVID-19, ARM-64)', () => {
    const s = suggestAnchors(extractPageText('<p>Built for ARM-64 since COVID-19.</p>'));
    // Observation: no Jira project check, so look-alikes are proposed (the user still has to tick them).
    expect(s.filter((x) => x.anchorType === 'jira').map((x) => x.jiraKey)).toEqual(['ARM-64', 'COVID-19']);
  });
});
