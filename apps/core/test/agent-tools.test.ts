import { describe, expect, it } from 'vitest';
import {
  changeList,
  CONSENT_GUIDANCE,
  consentRequired,
  diffForPaths,
  evidenceLevelFor,
  fitContext,
  jiraChangelogView,
  freshnessGuidance,
  matchBinding,
  parseLimit,
  parsePageRef,
  parseRepo,
  parseSpaceKey,
  unknownPage,
  validateFixInput,
  versionMessage,
  type ContextBlock,
} from '../src/lib/agent-tools';

const DAY = 86_400_000;
const T = Date.UTC(2026, 11, 2, 10);

describe('parsePageRef', () => {
  it('prefers a numeric pageId', () => {
    expect(parsePageRef({ pageId: '2752731', pageUrl: 'x' })).toEqual({ pageId: '2752731', via: 'pageId' });
    expect(parsePageRef({ pageId: 2752731 })).toEqual({ pageId: '2752731', via: 'pageId' });
  });
  it('reads page URLs, including a URL put in pageId', () => {
    expect(parsePageRef({ pageUrl: 'https://x.atlassian.net/wiki/spaces/PLAT/pages/123456/Rollback+runbook' })).toEqual({ pageId: '123456', via: 'pageUrl' });
    expect(parsePageRef({ pageUrl: 'https://x.atlassian.net/wiki/pages/viewpage.action?pageId=987' })).toEqual({ pageId: '987', via: 'pageUrl' });
    expect(parsePageRef({ pageId: 'https://x.atlassian.net/wiki/spaces/A/pages/42' })).toEqual({ pageId: '42', via: 'pageUrl' });
  });
  it('falls back to the title, then the Rovo page context', () => {
    expect(parsePageRef({ title: ' Rollback runbook ' })).toEqual({ title: 'Rollback runbook', via: 'title' });
    expect(parsePageRef({}, '555')).toEqual({ pageId: '555', via: 'context' });
    expect(parsePageRef({ pageId: 'abc' })).toEqual({ via: 'none' });
  });
});

describe('input parsing', () => {
  it('parseRepo accepts workspace/slug, slug and Bitbucket URLs', () => {
    expect(parseRepo('nano-soft-dev/Payments-API')).toEqual({ full: 'nano-soft-dev/payments-api', slug: 'payments-api' });
    expect(parseRepo('payments-api')).toEqual({ full: null, slug: 'payments-api' });
    expect(parseRepo('https://bitbucket.org/nano-soft-dev/payments-api/src/main/')).toEqual({ full: 'nano-soft-dev/payments-api', slug: 'payments-api' });
    expect(parseRepo('a b')).toBeUndefined();
    expect(parseRepo(undefined)).toBeUndefined();
  });
  it('parseLimit clamps and defaults', () => {
    expect(parseLimit(undefined)).toBe(10);
    expect(parseLimit('5')).toBe(5);
    expect(parseLimit(500)).toBe(50);
    expect(parseLimit(0)).toBe(10);
    expect(parseLimit(2.7)).toBe(2);
  });
  it('parseSpaceKey', () => {
    expect(parseSpaceKey('PLAT')).toBe('PLAT');
    expect(parseSpaceKey('')).toBeNull();
    expect(parseSpaceKey('a b')).toBeNull();
  });
});

describe('matchBinding', () => {
  const path = { anchorType: 'path' as const, pattern: 'scripts/rollback.sh' };
  const glob = { anchorType: 'glob' as const, pattern: 'deploy/helm/**' };
  const repo = { anchorType: 'repo' as const, pattern: undefined };
  it('matches files exactly, by the binding glob, or repo-wide', () => {
    expect(matchBinding(path, 'scripts/rollback.sh')).toBe('exact');
    expect(matchBinding(path, './scripts/rollback.sh')).toBe('exact');
    expect(matchBinding(glob, 'deploy/helm/values.yaml')).toBe('glob');
    expect(matchBinding(repo, 'anything.ts')).toBe('repo');
    expect(matchBinding(path, 'scripts/other.sh')).toBeUndefined();
  });
  it('matches folder queries', () => {
    expect(matchBinding(path, 'scripts')).toBe('folder');
    expect(matchBinding(path, 'scripts/')).toBe('folder');
    expect(matchBinding(glob, 'deploy')).toBe('folder');
    expect(matchBinding(path, 'script')).toBeUndefined();
  });
  it('matches glob queries against paths and glob prefixes', () => {
    expect(matchBinding(path, 'scripts/*.sh')).toBe('glob');
    expect(matchBinding(path, 'src/**')).toBeUndefined();
    expect(matchBinding(glob, 'deploy/**')).toBe('glob');
  });
});

describe('guidance', () => {
  const events = [
    { source: 'bitbucket' as const, ref: 'nano-soft-dev/payments-api#482', at: T },
    { source: 'bitbucket' as const, ref: 'nano-soft-dev/payments-api#482', at: T - 1000 },
    { source: 'jira' as const, ref: 'PAY-21', at: T - DAY },
  ];
  it('verified pages are safe to cite', () => {
    expect(freshnessGuidance('verified')).toBe('Safe to cite.');
  });
  it('drifted pages name each change and date once (brand copy)', () => {
    expect(freshnessGuidance('possibly_stale', events.slice(0, 1))).toBe(
      'Do not present steps from this page as current. Cite with caveat: changed by PR #482 on 2026-12-02.',
    );
    expect(changeList(events)).toBe('PR #482 on 2026-12-02 and PAY-21 on 2026-12-01');
  });
  it('stale pages add how long the drift has gone unreviewed', () => {
    expect(freshnessGuidance('stale', events, { now: T + 8 * DAY })).toMatch(/Unreviewed for 9 days\.$/);
  });
  it('caps named changes at 3', () => {
    const many = [1, 2, 3, 4, 5].map((n) => ({ source: 'bitbucket' as const, ref: `w/r#${n}`, at: T + n }));
    expect(changeList(many)).toBe('PR #5 on 2026-12-02, PR #4 on 2026-12-02, PR #3 on 2026-12-02 and 2 more changes');
  });
  it('never says a page is wrong', () => {
    for (const s of ['verified', 'possibly_stale', 'stale', 'unanchored', 'unknown'] as const) {
      expect(freshnessGuidance(s, events, { now: T })).not.toMatch(/wrong|incorrect|!/i);
    }
  });
  it('unknown and consent results carry no title', () => {
    expect(unknownPage('1')).toMatchObject({ title: null, status: 'unknown', error: 'not_visible' });
    expect(consentRequired('1')).toMatchObject({ title: null, status: 'unknown', error: 'consent_required', guidance: CONSENT_GUIDANCE });
  });
});

describe('drift context', () => {
  const diff = [
    'diff --git a/scripts/rollback.sh b/scripts/rollback-v2.sh\nsimilarity index 90%\n--- a/scripts/rollback.sh\n+++ b/scripts/rollback-v2.sh\n@@ -1 +1 @@\n-a\n+b\n',
    'diff --git a/README.md b/README.md\n--- a/README.md\n+++ b/README.md\n@@ -1 +1 @@\n-x\n+y\n',
  ].join('');
  it('keeps only the diff blocks of the event files (old or new path)', () => {
    const d = diffForPaths(diff, ['scripts/rollback.sh'])!;
    expect(d).toContain('rollback-v2.sh');
    expect(d).not.toContain('README');
    expect(diffForPaths(diff, ['nothing.ts'])).toBeNull();
    expect(diffForPaths(null, ['a'])).toBeNull();
  });
  it('fits the context under the byte cap, shrinking diffs first', () => {
    const big = { sections: [{ blocks: [{ blockId: 'b1', kind: 'code', text: 'x'.repeat(3000), matched: true as const }] }], events: [{ diff: 'y\n'.repeat(20_000) }, { diff: 'z\n'.repeat(20_000) }] };
    const out = fitContext(big, 15_000);
    expect(Buffer.byteLength(JSON.stringify(out))).toBeLessThanOrEqual(15_000);
    expect(out.truncated).toBe(true);
    expect(out.sections[0]!.blocks[0]!.text.length).toBe(3000);
    expect(fitContext({ sections: [], events: [] }).truncated).toBe(false);
  });
  it('then drops unmatched blocks, then cuts long block texts', () => {
    const blocks: ContextBlock[] = [
      { blockId: 'b1', kind: 'paragraph', text: 'a'.repeat(6000) },
      { blockId: 'b2', kind: 'code', text: 'b\n'.repeat(6000), matched: true },
    ];
    const sections: { blocks: ContextBlock[]; blocksOmitted?: number }[] = [{ blocks }];
    const out = fitContext({ sections, events: [{ diff: null }] }, 8_000);
    expect(Buffer.byteLength(JSON.stringify(out))).toBeLessThanOrEqual(8_000);
    expect(out.sections[0]!.blocksOmitted).toBe(1);
    expect(out.sections[0]!.blocks.map((b) => [b.blockId, b.truncated])).toEqual([['b2', true]]);
  });
});

describe('fix proposals', () => {
  it('versionMessage names the changes (brand copy)', () => {
    expect(versionMessage(['PR #482'])).toBe('Doc Drift: accepted proposal for PR #482');
    expect(versionMessage(['PR #482', 'PAY-21', 'PR #482'])).toBe('Doc Drift: accepted proposal for PR #482 and PAY-21');
    expect(versionMessage([])).toBe('Doc Drift: accepted proposal');
  });
  it('validateFixInput requires text, refuses no-op drafts and caps sizes', () => {
    expect(validateFixInput({ originalText: 'a', proposedText: 'b' })).toEqual({
      ok: true,
      value: { sectionHeading: 'Top of page', blockId: null, originalText: 'a', proposedText: 'b', rationale: null },
    });
    expect(validateFixInput({ originalText: 'a  b', proposedText: 'a b' }).ok).toBe(false);
    expect(validateFixInput({ originalText: '', proposedText: 'b' }).ok).toBe(false);
    expect(validateFixInput({ originalText: 'a'.repeat(4001), proposedText: 'b' }).ok).toBe(false);
    const r = validateFixInput({ sectionHeading: ' Rollback ', originalText: 'a', proposedText: 'b', rationale: ' PR #482 renamed it ' });
    expect(r.ok && r.value).toMatchObject({ sectionHeading: 'Rollback', rationale: 'PR #482 renamed it' });
    // blockId alone is enough; a malformed one is refused with the expected shape.
    expect(validateFixInput({ blockId: 'B4', proposedText: 'x' })).toMatchObject({ ok: true, value: { blockId: 'b4', originalText: '' } });
    expect(validateFixInput({ blockId: 'paragraph 4', proposedText: 'x' }).ok).toBe(false);
    expect(validateFixInput({ proposedText: 'x' }).ok).toBe(false);
  });
});

describe('evidence level (D30)', () => {
  it('gives full evidence only to callers with update rights', () => {
    expect(evidenceLevelFor(true)).toBe('full');
    expect(evidenceLevelFor(false)).toBe('summary');
  });

  const changelog = [
    { field: 'status', from: 'In Progress', to: 'Done' },
    { field: 'description', from: 'Old body with a secret plan', to: `New body ${'x'.repeat(3000)}` },
    { field: 'summary', from: 'Old title', to: 'New title' },
  ];

  it('hides free-text Jira values from viewers', () => {
    expect(jiraChangelogView(changelog, 'summary')).toEqual([
      { field: 'status', from: 'In Progress', to: 'Done' },
      { field: 'description', changed: true },
      { field: 'summary', changed: true },
    ]);
    expect(JSON.stringify(jiraChangelogView(changelog, 'summary'))).not.toContain('secret plan');
  });

  it('shows full values to editors, clipped to 2,000 characters', () => {
    const full = jiraChangelogView(changelog, 'full');
    expect(full[1]).toMatchObject({ field: 'description', from: 'Old body with a secret plan' });
    expect(((full[1] as { to: string }).to).length).toBeLessThan(2_100);
    expect(full[2]).toEqual({ field: 'summary', from: 'Old title', to: 'New title' });
    expect(jiraChangelogView(undefined, 'full')).toEqual([]);
  });
});
