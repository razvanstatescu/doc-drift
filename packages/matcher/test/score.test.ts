import { describe, expect, it } from 'vitest';
import type { DriftEvent, MatchResult } from '../src/index.js';
import { detectRevert, indexPages, scoreChange } from '../src/index.js';
import { binding, change, fileDiff, modified } from './helpers.js';

const NO_PAGES = new Map();

function events(result: MatchResult): DriftEvent[] {
  if (result.kind !== 'scored') throw new Error(`expected scored, got ${result.kind}`);
  return result.events;
}

/** The formula term for a modified file: weight × match × (0.5 + 0.5 × mag). */
const term = (match: number, lines: number, weight = 1) => weight * match * (0.5 + 0.5 * Math.min(1, Math.log10(1 + lines) / 2));
const round = (n: number) => Math.round(n * 100) / 100;

describe('scoreChange: path scoring', () => {
  it('follows weight × match × (0.5 + 0.5 × magnitude) for exact anchors', () => {
    const [event] = events(scoreChange(change([modified('deploy/helm/values.yaml', 6, 4)]), [binding('a', 'path', 'deploy/helm/values.yaml')], NO_PAGES));
    expect(event?.score).toBe(round(term(1, 10)));
    expect(event?.severity).toBe('medium');
    expect(event?.reasons).toEqual(['deploy/helm/values.yaml changed: 6 lines added, 4 removed']);
    expect(event).toMatchObject({ ref: 'nano-soft-dev/payments-api#482', dedupeKey: 'a|nano-soft-dev/payments-api#482', matchedAnchor: 'payments-api: deploy/helm/values.yaml' });
  });

  it('caps magnitude at 100 lines, so a big change on a glob anchor reaches 0.6', () => {
    const [event] = events(scoreChange(change([modified('src/server.ts', 400, 200)]), [binding('g', 'glob', 'src/**')], NO_PAGES));
    expect(event?.score).toBe(0.6);
  });

  it('keeps small glob matches below the threshold and takes the max over files, not the sum', () => {
    const files = Array.from({ length: 50 }, (_, i) => modified(`src/handlers/h${i}.ts`, 1, 1));
    expect(events(scoreChange(change(files), [binding('g', 'glob', 'src/**')], NO_PAGES))).toEqual([]);
    const strict = events(scoreChange(change(files), [binding('g', 'glob', 'src/**')], NO_PAGES, { threshold: 0.3 }));
    expect(strict[0]?.score).toBe(round(term(0.6, 2)));
    expect(strict[0]?.reasons).toEqual(['src/handlers/h0.ts changed: 1 line added, 1 removed', '49 more anchored files changed']);
  });

  it('scores removed and renamed files at full magnitude and High severity', () => {
    const removed = { status: 'removed', path: 'src/routes/refunds.ts', linesAdded: 0, linesRemoved: 40 } as const;
    const [byGlob] = events(scoreChange(change([removed]), [binding('g', 'glob', 'src/**')], NO_PAGES));
    expect(byGlob).toMatchObject({ score: 0.6, severity: 'high', reasons: ['src/routes/refunds.ts removed'] });
  });

  it('never alerts on a repo-wide anchor alone', () => {
    const files = [{ status: 'removed', path: 'src/a.ts', linesAdded: 0, linesRemoved: 900 } as const];
    expect(events(scoreChange(change(files), [binding('r', 'repo')], NO_PAGES, { threshold: 0.4 }))).toEqual([]);
  });

  it('marks critical anchors High and ignores bindings for other repos and anchor types', () => {
    const file = modified('scripts/rollback.sh', 1, 1);
    const result = events(
      scoreChange(
        change([file]),
        [
          binding('crit', 'path', 'scripts/rollback.sh', { weight: 'critical' }),
          binding('other-repo', 'path', 'scripts/rollback.sh', { repo: 'nano-soft-dev/billing-api' }),
          binding('page', 'page', 'scripts/rollback.sh'),
        ],
        NO_PAGES,
      ),
    );
    expect(result.map((e) => [e.bindingId, e.severity])).toEqual([['crit', 'high']]);
  });

  it('applies the dismiss dampener down to a 0.3 floor', () => {
    const file = modified('scripts/rollback.sh', 100, 0);
    const score = (dismissCount: number) =>
      events(scoreChange(change([file]), [binding('a', 'path', 'scripts/rollback.sh', { dismissCount })], NO_PAGES, { threshold: 0 }))[0]?.score;
    expect(score(0)).toBe(1);
    expect(score(2)).toBe(0.8);
    expect(score(20)).toBe(0.3);
  });
});

describe('scoreChange: identifier and snippet boosts', () => {
  const runbook = indexPages([
    {
      pageId: 'page-a',
      storage:
        '<p>Raise <code>ROLLBACK_TIMEOUT</code> if needed.</p><ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[helm rollback payments 0 --wait]]></ac:plain-text-body></ac:structured-macro>',
    },
  ]);
  const hunks = fileDiff('scripts/rollback.sh', ['TIMEOUT="${ROLLBACK_TIMEOUT:-300}"', 'helm rollback payments 0 --wait'], ['TIMEOUT="${ROLLBACK_TIMEOUT_SECS:-300}"', 'helm rollback payments 0']);
  const file = modified('scripts/rollback.sh', 2, 2);

  it('adds 0.3 for a removed identifier and 0.4 for a removed code line', () => {
    // Five dismissals halve the weight, so the boosted score stays under the cap of 1.
    const damped = binding('a', 'glob', 'scripts/**', { dismissCount: 5 });
    const [event] = events(scoreChange(change([file], { hunks }), [damped], runbook));
    expect(event?.score).toBe(round(term(0.6, 4, 0.5) + 0.3 + 0.4));
    expect(event?.matchedIdentifiers).toEqual(['ROLLBACK_TIMEOUT', 'wait']);
    expect(event?.matchedSnippetLines).toBe(1);
    expect(event?.reasons.slice(1, 3)).toEqual([
      'Page mentions ROLLBACK_TIMEOUT and wait, removed in PR #482',
      "1 line in this page's code blocks was removed in PR #482",
    ]);
  });

  it('applies boosts only after a path match', () => {
    const elsewhere = change([modified('src/other.ts', 2, 2)], { hunks: fileDiff('src/other.ts', ['const x = process.env.ROLLBACK_TIMEOUT;'], ['const x = 1;']) });
    expect(events(scoreChange(elsewhere, [binding('a', 'path', 'scripts/rollback.sh')], runbook, { threshold: 0 }))).toEqual([]);
  });

  it('scores on paths only when the page is not indexed or hunks are missing', () => {
    const noHunks = events(scoreChange(change([file]), [binding('a', 'glob', 'scripts/**')], runbook, { threshold: 0 }));
    const noPage = events(scoreChange(change([file], { hunks }), [binding('a', 'glob', 'scripts/**')], NO_PAGES, { threshold: 0 }));
    expect(noHunks[0]?.score).toBe(round(term(0.6, 4)));
    expect(noPage[0]?.score).toBe(round(term(0.6, 4)));
  });

  it('ignores hunks of ignored files', () => {
    const testHunks = fileDiff('scripts/rollback.test.sh', ['echo $ROLLBACK_TIMEOUT'], ['echo $ROLLBACK_TIMEOUT_SECS']);
    const c = change([file, modified('scripts/rollback.test.sh', 1, 1)], { hunks: testHunks });
    const [event] = events(scoreChange(c, [binding('a', 'glob', 'scripts/**')], runbook, { threshold: 0 }));
    expect(event?.matchedIdentifiers).toEqual([]);
  });
});

describe('scoreChange: cosmetic changes', () => {
  it('halves a comment-only change on an exact anchor, keeping it under the threshold', () => {
    const hunks = fileDiff('scripts/rollback.sh', ['# Roll back to the previus release.'], ['# Roll back to the previous release.']);
    const c = change([modified('scripts/rollback.sh', 1, 1)], { hunks });
    expect(events(scoreChange(c, [binding('a', 'path', 'scripts/rollback.sh')], NO_PAGES))).toEqual([]);
    const [low] = events(scoreChange(c, [binding('a', 'path', 'scripts/rollback.sh')], NO_PAGES, { threshold: 0 }));
    expect(low?.score).toBe(round(term(1, 2) * 0.5));
    expect(low?.reasons).toEqual(['scripts/rollback.sh changed in comments or whitespace only']);
  });
});

describe('scoreChange: skips, reverts and renames', () => {
  const anchor = binding('a', 'path', 'scripts/rollback.sh');

  it('skips changes with only ignored files', () => {
    const c = change([modified('pnpm-lock.yaml', 300, 200), modified('src/a.test.ts', 5, 1)]);
    expect(scoreChange(c, [binding('r', 'repo')], NO_PAGES)).toEqual({ kind: 'skipped', reason: 'no_relevant_files' });
  });

  it('skips merges into a non-default branch unless configured otherwise', () => {
    const c = change([modified('scripts/rollback.sh', 5, 5)], { destinationBranch: 'release/1.4' });
    expect(scoreChange(c, [anchor], NO_PAGES)).toEqual({ kind: 'skipped', reason: 'non_default_branch' });
    expect(scoreChange(c, [anchor], NO_PAGES, { ignoreNonDefaultBranches: false }).kind).toBe('scored');
  });

  it('reports a revert instead of scoring it', () => {
    const c = change([modified('scripts/rollback.sh', 5, 5)], { title: 'Revert "Raise worker max to 12" (pull request #490)' });
    expect(scoreChange(c, [anchor], NO_PAGES)).toEqual({ kind: 'revert', revert: { revertedTitle: 'Raise worker max to 12', revertedPrId: 490 } });
  });

  it('proposes an anchor rename even when the event is below the threshold', () => {
    const renamed = { status: 'renamed', path: 'scripts/rollback-v2.sh', oldPath: 'scripts/rollback.sh', linesAdded: 0, linesRemoved: 0 } as const;
    const result = scoreChange(change([renamed]), [{ ...anchor, dismissCount: 9 }], NO_PAGES);
    expect(result).toEqual({
      kind: 'scored',
      events: [],
      renameProposals: [{ bindingId: 'a', pageId: 'page-a', from: 'scripts/rollback.sh', to: 'scripts/rollback-v2.sh' }],
    });
  });
});

describe('detectRevert', () => {
  it.each([
    ['Revert "Raise worker max to 12"', { revertedTitle: 'Raise worker max to 12' }],
    ['Revert "Raise worker max (#490)"', { revertedTitle: 'Raise worker max', revertedPrId: 490 }],
    ['Revert "Revert "Raise worker max""', undefined],
    ['Revert "Revert "Revert "X"""', { revertedTitle: 'X' }],
    ['Reverting the timeout default', undefined],
  ])('%s', (title, expected) => {
    expect(detectRevert(title)).toEqual(expected);
  });
});
