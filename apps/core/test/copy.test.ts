import { describe, expect, it } from 'vitest';
import { bylineValue, clampTooltip, displayFiles, refLabel, shortDate, TOOLTIP_MAX } from '../src/lib/copy';

const NOV_11 = Date.UTC(2026, 10, 11, 14, 0);
const DAY = 24 * 60 * 60 * 1000;

describe('bylineValue', () => {
  it('puts the state word in the title for every state', () => {
    expect(bylineValue({ state: 'verified' }).title).toBe('Verified · Doc Drift');
    expect(bylineValue({ state: 'possibly_stale' }).title).toBe('Possibly stale · Doc Drift');
    expect(bylineValue({ state: 'stale' }).title).toBe('Stale · Doc Drift');
    expect(bylineValue({ state: 'unanchored' }).title).toBe('Unanchored · Doc Drift');
  });

  it('never writes an icon (the property icon renders as the generic hexagon)', () => {
    expect(Object.keys(bylineValue({ state: 'stale' })).sort()).toEqual(['title', 'tooltip']);
  });

  it('names the PR and file for Possibly stale', () => {
    const v = bylineValue({
      state: 'possibly_stale',
      openEventCount: 1,
      latest: { ref: 'nano-soft-dev/payments-api#482', source: 'bitbucket', files: ['scripts/rollback-v2.sh'], at: NOV_11 },
    });
    expect(v.tooltip).toBe('PR #482 changed scripts/rollback-v2.sh on Nov 11. Review.');
  });

  it('counts extra files and changes', () => {
    const v = bylineValue({
      state: 'possibly_stale',
      openEventCount: 3,
      latest: { ref: 'ws/repo#9', source: 'bitbucket', files: ['a.sh', 'b.sh'], at: NOV_11 },
    });
    expect(v.tooltip).toBe('PR #9 changed a.sh and 1 file on Nov 11 (+2 changes). Review.');
  });

  it('falls back to the file name for long paths and stays under 90 characters', () => {
    const long = `deploy/${'very-long-directory-name/'.repeat(4)}values.yaml`;
    const v = bylineValue({ state: 'possibly_stale', latest: { ref: 'ws/repo#1', source: 'bitbucket', files: [long], at: NOV_11 } });
    expect(v.tooltip).toBe('PR #1 changed values.yaml on Nov 11. Review.');
    expect(v.tooltip.length).toBeLessThanOrEqual(TOOLTIP_MAX);
  });

  it('describes Jira changes by issue key', () => {
    const v = bylineValue({ state: 'possibly_stale', latest: { ref: 'PAY-142', source: 'jira', files: [], at: NOV_11 } });
    expect(v.tooltip).toBe('PAY-142 changed on Nov 11. Review.');
  });

  it('gives days and change count for Stale', () => {
    const v = bylineValue({ state: 'stale', openEventCount: 2, oldestOpenAt: NOV_11 - 7 * DAY, now: NOV_11 });
    expect(v.tooltip).toBe('Unreviewed drift for 7 days (2 changes). Agents told not to trust this page.');
  });

  it('describes Verified with date and anchor count', () => {
    expect(bylineValue({ state: 'verified', verifiedAt: NOV_11, anchorCount: 1 }).tooltip).toBe('Verified on Nov 11. Watching 1 anchor.');
    // R-8: the count of changes since verification.
    expect(bylineValue({ state: 'verified', verifiedAt: NOV_11, anchorCount: 3, changesSince: 12, flaggedSince: 0 }).tooltip).toBe(
      'Verified on Nov 11. 12 anchor changes since, none flagged. Watching 3 anchors.',
    );
    expect(bylineValue({ state: 'verified', verifiedAt: NOV_11, anchorCount: 1, changesSince: 1, flaggedSince: 1 }).tooltip).toBe(
      'Verified on Nov 11. 1 anchor change since, 1 flagged. Watching 1 anchor.',
    );
    expect(bylineValue({ state: 'verified', verifiedAt: NOV_11, anchorCount: 1, changesSince: 0 }).tooltip).toBe('Verified on Nov 11. Watching 1 anchor.');
    expect(bylineValue({ state: 'verified', anchorCount: 3 }).tooltip).toBe('Verified. Watching 3 anchors.');
  });

  it('uses the copy-library string for Unanchored', () => {
    expect(bylineValue({ state: 'unanchored' }).tooltip).toBe('Not linked to code or Jira. Add anchors.');
  });

  it('never says a page is wrong, and has no exclamation marks', () => {
    for (const state of ['verified', 'possibly_stale', 'stale', 'unanchored'] as const) {
      const { title, tooltip } = bylineValue({ state, openEventCount: 2, now: NOV_11, oldestOpenAt: NOV_11 });
      expect(`${title} ${tooltip}`).not.toMatch(/wrong|!/i);
    }
  });
});

describe('helpers', () => {
  it('formats refs and dates', () => {
    expect(refLabel('nano-soft-dev/payments-api#482', 'bitbucket')).toBe('PR #482');
    expect(refLabel('PAY-1', 'jira')).toBe('PAY-1');
    expect(shortDate(Date.UTC(2026, 11, 2))).toBe('Dec 2');
  });

  it('clamps on a word boundary', () => {
    const out = clampTooltip('word '.repeat(40));
    expect(out.length).toBeLessThanOrEqual(TOOLTIP_MAX);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('displayFiles', () => {
  it('names the anchored path for exact anchors (a rename reads as the old path)', () => {
    expect(displayFiles('payments-api: scripts/rollback.sh', ['scripts/rollback-v2.sh'])).toEqual(['scripts/rollback.sh']);
  });
  it('keeps the changed files for globs and whole-repo anchors', () => {
    expect(displayFiles('payments-api: deploy/helm/**', ['deploy/helm/values.yaml'])).toEqual(['deploy/helm/values.yaml']);
    expect(displayFiles('payments-api (whole repo)', ['a.ts'])).toEqual(['a.ts']);
    expect(displayFiles(null, ['a.ts'])).toEqual(['a.ts']);
  });
});
