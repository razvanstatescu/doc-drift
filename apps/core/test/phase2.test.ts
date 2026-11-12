// Phase 2, Track A (docs/testing/backlog-phase2.md): pure helpers behind the new contract fields and
// resolvers. No Forge imports.
import { describe, expect, it } from 'vitest';
import { citePolicyFor, decodeTinyLink, pageLead, parseSpaceKey, urlHost } from '../src/lib/agent-tools';
import { contextBlocks } from '../src/lib/agent-service';
import { planBindingChanges, anchorKey } from '../src/lib/anchors';
import { validateAnchors } from '../src/lib/bindings-service';
import { extractBlocks } from '../src/lib/blocks';
import { bylineValue, stateTitle } from '../src/lib/copy';
import { renameQuickFixes, renameVersionMessage, sectionHits } from '../src/lib/quick-fix';
import { groupForNotification, notificationBody, notificationLine, pageWhySentence, tokenRegExp, whySentence } from '../src/lib/review';

const code = (body: string) =>
  `<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[${body}]]></ac:plain-text-body></ac:structured-macro>`;

describe('stateTitle (UX-6): the state word first', () => {
  it('reads "<State> · Doc Drift" in the byline property and the resolvers', () => {
    expect(stateTitle('possibly_stale')).toBe('Possibly stale · Doc Drift');
    expect(stateTitle('unknown')).toBe('Unknown · Doc Drift');
    expect(bylineValue({ state: 'stale' }).title).toBe('Stale · Doc Drift');
  });
});

describe('whySentence (R-2)', () => {
  const base = { source: 'bitbucket' as const, ref: 'PR #482', anchor: 'payments-api: scripts/rollback.sh', score: 0.71, reasons: [] };
  it('a rename on an exact anchor, with the section and the threshold', () => {
    const s = whySentence(
      { ...base, files: [{ path: 'scripts/rollback-v2.sh', oldPath: 'scripts/rollback.sh', status: 'renamed' }], matchedTokens: ['ROLLBACK_TIMEOUT'] },
      { threshold: 0.5, section: 'Roll back' },
    );
    expect(s).toBe(
      'PR #482 renamed scripts/rollback.sh to scripts/rollback-v2.sh, an anchor of this page. The page mentions ROLLBACK_TIMEOUT, which PR #482 removed. Section "Roll back" names it. Score 0.71 (threshold 0.5).',
    );
  });
  it('a modified file under a glob anchor counts its lines', () => {
    expect(
      whySentence({ ...base, anchor: 'payments-api: deploy/**', files: [{ path: 'deploy/a.yaml', status: 'modified', linesAdded: 10, linesRemoved: 2 }, { path: 'deploy/b.yaml', status: 'modified' }] }),
    ).toBe("PR #482 changed deploy/a.yaml (12 lines) and 1 more anchored file, under this page's anchor deploy/**. Score 0.71.");
  });
  it('Jira and whole-repo anchors; never says the page is wrong', () => {
    expect(whySentence({ source: 'jira', ref: 'PAY-21', anchor: 'PAY-21', files: [], score: 0.7, reasons: ['PAY-21 moved to Done'] }, { threshold: 0.5 })).toBe(
      'PAY-21 moved to Done, and this page is anchored to it. Score 0.70 (threshold 0.5).',
    );
    const repo = whySentence({ ...base, anchor: 'payments-api (whole repo)', files: [{ path: 'a', status: 'modified' }] });
    expect(repo).toContain('anchored to as a whole');
    expect(repo.toLowerCase()).not.toMatch(/wrong|incorrect/);
  });
  it('the page sentence is the strongest event plus how many other changes are open', () => {
    const ev = (ref: string, severity: 'high' | 'medium', score: number) => ({ ...base, ref, severity, score, files: [], whySentence: `${ref} sentence.` });
    expect(pageWhySentence([ev('PR #1', 'medium', 0.9), ev('PR #2', 'high', 0.6), ev('PR #2', 'high', 0.5)])).toBe('PR #2 sentence. 1 more change is open.');
    expect(pageWhySentence([])).toBeNull();
  });
});

describe('rename quick fix (R-4)', () => {
  const storage =
    '<h2>Roll back</h2><p>Run <code>scripts/rollback.sh</code> with <strong>care</strong>.</p>' +
    code('./scripts/rollback.sh --timeout 30\necho done') +
    '<p>Or call rollback.sh from the jump host. Not other/rollback.sh.bak.</p>' +
    '<p>See <ac:link><ri:page ri:content-title="x" /><ac:plain-text-link-body><![CDATA[scripts/rollback.sh docs]]></ac:plain-text-link-body></ac:link>.</p>';
  const events = [{ eventId: 'e1', ref: 'PR #482', files: [{ path: 'scripts/rollback-v2.sh', oldPath: 'scripts/rollback.sh', status: 'renamed' }] }];
  it('proposes the replacement per block, skipping link text it cannot edit safely', () => {
    const [fix] = renameQuickFixes(storage, events);
    expect(fix).toMatchObject({ eventId: 'e1', ref: 'PR #482', from: 'scripts/rollback.sh', to: 'scripts/rollback-v2.sh' });
    expect(fix!.blocks.map((b) => [b.kind, b.proposedText, b.occurrences])).toEqual([
      ['paragraph', 'Run scripts/rollback-v2.sh with care.', 1],
      ['code', './scripts/rollback-v2.sh --timeout 30\necho done', 1],
      ['paragraph', 'Or call rollback-v2.sh from the jump host. Not other/rollback.sh.bak.', 1],
    ]);
  });
  it('no rename, or a page that never names the path: nothing to propose', () => {
    expect(renameQuickFixes(storage, [{ eventId: 'e2', ref: 'PR #1', files: [{ path: 'scripts/rollback.sh', status: 'modified' }] }])).toEqual([]);
    expect(renameQuickFixes('<p>Nothing here.</p>', events)).toEqual([]);
  });
  it('the version message names the PR', () => {
    expect(renameVersionMessage('scripts/rollback.sh', 'scripts/rollback-v2.sh', 'PR #482')).toBe('Doc Drift: renamed scripts/rollback.sh to scripts/rollback-v2.sh for PR #482');
    expect(renameVersionMessage(`a/${'x'.repeat(200)}/r.sh`, `a/${'x'.repeat(200)}/s.sh`, 'PR #1').length).toBeLessThanOrEqual(255);
  });
});

describe('sectionHits and citePolicy (R-5)', () => {
  it('lists the sections and blocks that name a token', () => {
    const s = '<p>Intro.</p><h2>Roll back</h2><p>Run <code>scripts/rollback.sh</code>.</p><p>Then wait.</p><h2>Other</h2><p>Nothing.</p>';
    expect(sectionHits(s, ['scripts/rollback.sh'])).toEqual([{ heading: 'Roll back', blockIds: ['b3'], matchedTokens: ['scripts/rollback.sh'] }]);
  });
  it('maps states to a citation rule', () => {
    expect(citePolicyFor('verified')).toBe('cite');
    expect(citePolicyFor('possibly_stale')).toBe('cite_with_caveat');
    expect(citePolicyFor('unanchored')).toBe('cite_with_caveat');
    expect(citePolicyFor('stale')).toBe('do_not_cite');
    expect(citePolicyFor('unknown')).toBe('do_not_cite');
    expect(citePolicyFor('verified', true)).toBe('cite_with_caveat');
  });
  it('every answer leads with the page title (UX-1)', () => {
    expect(pageLead('Refund worker runbook', 'Verified')).toBe('"Refund worker runbook" is Verified.');
    expect(pageLead(null, 'Unknown')).toBe('This page is Unknown.');
  });
});

describe('page references and keys (BUG-04, BUG-10)', () => {
  it('decodes tiny links and reads hosts', () => {
    expect(decodeTinyLink('2wAq')).toBe('2752731');
    expect(decodeTinyLink('bad!')).toBeUndefined();
    expect(urlHost('HTTPS://One-Atlas-Jzzf.atlassian.net/wiki/x/2wAq')).toBe('one-atlas-jzzf.atlassian.net');
  });
  it('global space keys are uppercased, personal keys kept', () => {
    expect(parseSpaceKey('plat')).toBe('PLAT');
    expect(parseSpaceKey('~5e8d4e6bacb63e0b834222ee')).toBe('~5e8d4e6bacb63e0b834222ee');
    expect(parseSpaceKey('a b')).toBeNull();
  });
});

describe('get-drift-context truncation is honest (observation 4)', () => {
  it('matched blocks are kept before neighbours, and dropped matched blocks are counted', () => {
    const blocks = extractBlocks(Array.from({ length: 40 }, (_, i) => `<p>Step ${i} uses <code>--retries</code></p>`).join(''));
    const out = contextBlocks(blocks, [tokenRegExp('--retries')]);
    expect(out.blocks).toHaveLength(30);
    expect(out.blocksOmitted).toBe(10);
    expect(out.matchedOmitted).toBe(10);
  });
});

describe('dismiss dampener reset (BUG-15)', () => {
  it('an anchor saved again with resetDismissCount gets its dampener cleared', () => {
    const existing = [{ id: 'b1', pageId: 'p', anchorType: 'path' as const, repo: 'payments-api', pattern: 'a.sh', weight: 'normal' as const, dismissCount: 2 }];
    const v = validateAnchors([{ repo: 'payments-api', pattern: 'a.sh', resetDismissCount: true }]);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(planBindingChanges(existing, v.value, v.resetKeys)).toMatchObject({ insert: [], remove: [], resetDampener: ['b1'] });
    expect(planBindingChanges(existing, v.value).resetDampener).toEqual([]);
    expect(v.resetKeys.has(anchorKey(v.value[0]!))).toBe(true);
  });
});

describe('PR author mention in the drift comment (R-6)', () => {
  it('mentions the author when the account resolved, else names them', () => {
    const [g] = groupForNotification([{ source: 'bitbucket', ref: 'ws/r#482', files: ['a', 'b'], reasons: [], changeAuthor: 'Sam Rivera', changeAuthorAccountId: '712020:abc' }]);
    const line = notificationLine(g!);
    expect(line).toBe('PR #482 (merged by {{@712020:abc|Sam Rivera}}) changed 2 files this page documents.');
    expect(notificationBody('owner-1', [line])).toBe(
      '<p><ac:link><ri:user ri:account-id="owner-1" /></ac:link> PR #482 (merged by <ac:link><ri:user ri:account-id="712020:abc" /></ac:link>) changed 2 files this page documents. Review in the Doc Drift badge.</p>',
    );
    const [plain] = groupForNotification([{ source: 'bitbucket', ref: 'ws/r#9', files: ['a'], reasons: [], changeAuthor: 'Sam <b>', changeAuthorAccountId: null }]);
    expect(notificationBody(null, [notificationLine(plain!)])).toBe('<p>PR #9 (merged by Sam &lt;b&gt;) changed 1 file this page documents. Review in the Doc Drift badge.</p>');
  });

  it('names the author instead of mentioning them twice when they own the page (live: PR #19)', () => {
    const [g] = groupForNotification([{ source: 'bitbucket', ref: 'ws/r#19', files: ['a'], reasons: [], changeAuthor: 'Razvan Statescu', changeAuthorAccountId: 'owner-1' }]);
    expect(notificationBody('owner-1', [notificationLine(g!)])).toBe(
      '<p><ac:link><ri:user ri:account-id="owner-1" /></ac:link> PR #19 (merged by Razvan Statescu) changed 1 file this page documents. Review in the Doc Drift badge.</p>',
    );
    // A line stored before names were kept still renders as a mention.
    expect(notificationBody('owner-1', ['PR #1 (merged by {{@owner-1}}) changed 1 file this page documents.'])).toContain('(merged by <ac:link><ri:user ri:account-id="owner-1" /></ac:link>)');
  });
});

describe('spans_blocks lists adjacent blocks only (BUG-17)', () => {
  it('a passage across 2 list items names those 2, not a far table cell that shares a phrase', async () => {
    const { resolveTarget } = await import('../src/lib/blocks');
    const s =
      '<h2>Steps</h2><table><tbody><tr><td>Run the deploy script now</td></tr></tbody></table><p>Unrelated paragraph text here.</p>' +
      '<ol><li>Run the deploy script now</li><li>Then check the worker logs carefully</li></ol>';
    const r = resolveTarget(extractBlocks(s), { originalText: 'Run the deploy script now. Then check the worker logs carefully' });
    expect(r).toMatchObject({ ok: false, error: 'spans_blocks', blockIds: ['b4', 'b5'] });
  });
});
