// QA edge cases for the core app's pure logic (docs/testing/test-plan.md, run 2026-11-11). Cases that
// reproduced a bug from docs/testing/test-report-2026-11-11.md were `it.fails`; phase 2 fixed them, so
// they are plain tests named "(fixed)" that assert the corrected behaviour.
import { describe, expect, it } from 'vitest';
import { matchBinding, parsePageRef, parseRepo, diffForPaths, validateFixInput } from '../src/lib/agent-tools';
import { normalizeAnchor, normalizeRepo } from '../src/lib/anchors';
import { applyBlockEdit, editBlock, extractBlocks, resolveTarget } from '../src/lib/blocks';
import { changeDedupeKey, parseSettings, spaceWatched } from '../src/lib/ingest-rules';
import { tokenRegExp } from '../src/lib/review';

const code = (body: string) =>
  `<ac:structured-macro ac:name="code" ac:schema-version="1"><ac:parameter ac:name="language">bash</ac:parameter><ac:plain-text-body><![CDATA[${body}]]></ac:plain-text-body></ac:structured-macro>`;

describe('QA: page references (tools)', () => {
  it('reads IDs from the URL forms Confluence shows', () => {
    expect(parsePageRef({ pageUrl: 'https://one-atlas-jzzf.atlassian.net/wiki/spaces/PLAT/pages/2720129/Scale+payment+workers' })).toEqual({ pageId: '2720129', via: 'pageUrl', host: 'one-atlas-jzzf.atlassian.net' });
    expect(parsePageRef({ pageUrl: 'https://x.atlassian.net/wiki/spaces/PLAT/pages/edit-v2/2720129' })).toEqual({ pageId: '2720129', via: 'pageUrl', host: 'x.atlassian.net' });
    expect(parsePageRef({ pageUrl: 'https://x.atlassian.net/wiki/pages/viewpage.action?pageId=2720129' })).toEqual({ pageId: '2720129', via: 'pageUrl', host: 'x.atlassian.net' });
    expect(parsePageRef({ pageId: ' 2720129 ' })).toEqual({ pageId: '2720129', via: 'pageId' });
    expect(parsePageRef({ pageId: 2720129 })).toEqual({ pageId: '2720129', via: 'pageId' });
  });
  it('BUG-04 (fixed): a tiny link (/wiki/x/...) is decoded to its page ID (checked against 5 real pages)', () => {
    for (const [code, id] of [['2wAq', '2752731'], ['HIAu', '3047452'], ['WAAv', '3080280'], ['gYEp', '2720129'], ['EoIt', '2982418']]) {
      expect(parsePageRef({ pageUrl: `https://one-atlas-jzzf.atlassian.net/wiki/x/${code}` }, '3080280')).toEqual({ pageId: id, via: 'tinyUrl', host: 'one-atlas-jzzf.atlassian.net' });
    }
    expect(parsePageRef({ pageUrl: 'https://one-atlas-jzzf.atlassian.net/wiki/x/gQBH' }, '3080280')).toMatchObject({ pageId: '4653185', via: 'tinyUrl' });
  });
  // BUG-04: an unreadable pageUrl (tiny link, legacy /display/ URL) or a non-numeric pageId silently
  // falls back to the Rovo page context, so the agent answers about the page it is on, not the one asked.
  it('BUG-04 (fixed): an unparseable pageUrl does not fall back to the context page', () => {
    expect(parsePageRef({ pageUrl: 'https://one-atlas-jzzf.atlassian.net/wiki/spaces/PLAT/overview' }, '3080280')).toEqual({ via: 'none', reason: 'unreadable_url' });
    expect(parsePageRef({ pageUrl: 'not a link at all' }, '3080280')).toEqual({ via: 'none', reason: 'unreadable_url' });
  });
  it('BUG-04 (fixed): a non-numeric pageId is read as a title, never the context page', () => {
    expect(parsePageRef({ pageId: 'DDS test: Payments rollback runbook' }, '3080280')).toEqual({ title: 'DDS test: Payments rollback runbook', via: 'title' });
  });
  it('a legacy /display/SPACE/Title URL is read as a title', () => {
    expect(parsePageRef({ pageUrl: 'https://x.atlassian.net/wiki/display/PLAT/Scale+payment+workers' }, '1')).toEqual({ title: 'Scale payment workers', via: 'title' });
  });
  it('the context page is used only when no page was named at all', () => {
    expect(parsePageRef({}, '3080280')).toEqual({ pageId: '3080280', via: 'context' });
    expect(parsePageRef({ pageId: '', pageUrl: '  ', title: '' }, '3080280')).toEqual({ pageId: '3080280', via: 'context' });
  });
  it('a URL from another site carries its host, so the tool can refuse it (observation 9)', () => {
    expect(parsePageRef({ pageUrl: 'https://other-site.atlassian.net/wiki/spaces/X/pages/2720129/T' })).toEqual({ pageId: '2720129', via: 'pageUrl', host: 'other-site.atlassian.net' });
  });
  it('repo inputs: URLs, ssh remotes, .git', () => {
    expect(parseRepo('git@bitbucket.org:nano-soft-dev/payments-api.git')).toEqual({ full: 'nano-soft-dev/payments-api', slug: 'payments-api' });
    expect(parseRepo('https://bitbucket.org/nano-soft-dev/payments-api/src/main/scripts/rollback.sh')).toEqual({ full: 'nano-soft-dev/payments-api', slug: 'payments-api' });
    expect(parseRepo('Payments-API')).toEqual({ full: null, slug: 'payments-api' });
    expect(parseRepo('nano-soft-dev/payments-api/scripts')).toBeUndefined();
  });
});

describe('QA: find-docs-for-path matching', () => {
  const glob = { anchorType: 'glob' as const, pattern: 'src/**' };
  const path = { anchorType: 'path' as const, pattern: 'scripts/rollback.sh' };
  it('file, folder and glob queries', () => {
    expect(matchBinding(path, 'scripts/rollback.sh')).toBe('exact');
    expect(matchBinding(path, '/scripts/rollback.sh')).toBe('exact');
    expect(matchBinding(path, 'scripts/')).toBe('folder');
    expect(matchBinding(path, 'scripts')).toBe('folder');
    expect(matchBinding(path, 'scripts/*.sh')).toBe('glob');
    expect(matchBinding(glob, 'src/routes/charges.ts')).toBe('glob');
    expect(matchBinding(glob, 'src/')).toBe('glob');
  });
  it('case matters: Scripts/Rollback.sh finds nothing', () => {
    expect(matchBinding(path, 'Scripts/Rollback.sh')).toBeUndefined();
  });
  // BUG-07: a glob query with no static prefix (`**/*.sh`) matches every glob anchor, whatever it covers.
  it('BUG-07 (fixed): "**/*.sh" does not match a src/** glob anchor, but matches scripts/*.sh', () => {
    expect(matchBinding(glob, '**/*.sh')).toBeUndefined();
    expect(matchBinding(glob, '**/*.yaml')).toBeUndefined();
    expect(matchBinding({ anchorType: 'glob', pattern: 'scripts/*.sh' }, '**/*.sh')).toBe('glob');
    expect(matchBinding(path, '**/*.sh')).toBe('glob');
  });
});

describe('QA: anchor input (binding modal)', () => {
  it('normalises leading ./ and /, whitespace and repo case', () => {
    expect(normalizeAnchor({ repo: ' Nano-Soft-Dev/Payments-API ', pattern: '  ./scripts/rollback.sh ' })).toEqual({
      ok: true,
      value: { anchorType: 'path', repo: 'nano-soft-dev/payments-api', pattern: 'scripts/rollback.sh', weight: 'normal' },
    });
    expect(normalizeAnchor({ repo: 'payments-api', pattern: '/deploy/helm/**' })).toMatchObject({ ok: true, value: { anchorType: 'glob', pattern: 'deploy/helm/**' } });
  });
  it('keeps path case (git is case-sensitive)', () => {
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'Scripts/Rollback.sh' })).toMatchObject({ ok: true, value: { pattern: 'Scripts/Rollback.sh' } });
  });
  it('refuses spaces, ".." and an ssh remote, each with its own reason; Unicode is allowed (observation 2)', () => {
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'scripts/my script.sh' })).toEqual({ ok: false, error: 'Use a repo-relative path without spaces.' });
    expect(normalizeAnchor({ repo: 'payments-api', pattern: '../etc/passwd' })).toEqual({ ok: false, error: 'Use a repo-relative path without "..".' });
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'docs/café.sh' })).toEqual({ ok: true, value: { anchorType: 'path', repo: 'payments-api', pattern: 'docs/café.sh', weight: 'normal' } });
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'docs/a|b.sh' })).toMatchObject({ ok: false });
    expect(normalizeAnchor({ repo: 'git@bitbucket.org:nano-soft-dev/payments-api.git', pattern: 'a.sh' }).ok).toBe(false);
  });
  // BUG-06: a folder anchor typed without a glob is saved as an exact path anchor that can never match.
  it('BUG-06 (fixed): "deploy/helm/" becomes the glob deploy/helm/**; "deploy/helm" is saved with a warning', () => {
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'deploy/helm/' })).toEqual({ ok: true, value: { anchorType: 'glob', repo: 'payments-api', pattern: 'deploy/helm/**', weight: 'normal' } });
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'deploy/helm' })).toMatchObject({ ok: true, value: { anchorType: 'path' }, warning: 'This looks like a folder. Use deploy/helm/** to watch everything in it.' });
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'deploy/Dockerfile' })).not.toHaveProperty('warning');
    expect(normalizeAnchor({ repo: 'payments-api', pattern: '/' })).toMatchObject({ ok: false });
  });
  it('Bitbucket URL as repo; Jira key in lower case', () => {
    expect(normalizeRepo('https://bitbucket.org/nano-soft-dev/payments-api/src/main/')).toBe('nano-soft-dev/payments-api');
    expect(normalizeAnchor({ anchorType: 'jira', jiraKey: ' pay-21 ' })).toEqual({ ok: true, value: { anchorType: 'jira', jiraKey: 'PAY-21', weight: 'normal' } });
    expect(normalizeAnchor({ anchorType: 'jira', jiraKey: 'PAY21' }).ok).toBe(false);
  });
  it('an unknown weight is refused; no weight is normal', () => {
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'a.sh', weight: 'High' })).toEqual({ ok: false, error: 'Weight must be Critical or Normal.' });
  });
  it('a glob with an unclosed bracket is accepted as an anchor (only settings validate globs)', () => {
    // Observation: anchors do not run validateGlob; picomatch then reads "[a" literally. Harmless but inconsistent.
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'src/[a' })).toMatchObject({ ok: true, value: { anchorType: 'glob' } });
  });
});

describe('QA: settings validation', () => {
  it('accepts padded numbers, refuses decimals and out-of-range values, all errors at once', () => {
    expect(parseSettings({ escalationDays: ' 7 ' })).toMatchObject({ ok: true, value: { escalationDays: 7 } });
    const r = parseSettings({ escalationDays: '7.5', notifyDebounceMinutes: 61, sensitivity: 'loud', spaceMode: 'selected', spaceKeys: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.fieldErrors).sort()).toEqual(['escalationDays', 'notifyDebounceMinutes', 'sensitivity', 'spaceKeys']);
  });
  it('dedupes and trims globs; refuses 51', () => {
    expect(parseSettings({ ignoreGlobs: ' a/** \na/**\n\n' })).toMatchObject({ ok: true, value: { ignoreGlobs: ['a/**'] } });
    const many = Array.from({ length: 51 }, (_, i) => `g${i}/**`);
    expect(parseSettings({ ignoreGlobs: many })).toMatchObject({ ok: false, fieldErrors: { ignoreGlobs: 'Use at most 50 ignore globs. You have 51.' } });
  });
  it('an empty ignore list is allowed (every file is scored)', () => {
    expect(parseSettings({ ignoreGlobs: [] })).toMatchObject({ ok: true, value: { ignoreGlobs: [] } });
  });
  it('a comma inside a brace glob is split by the comma-separated parser', () => {
    // `lines()` splits strings on newlines and commas; the settings form sends a newline string.
    const r = parseSettings({ ignoreGlobs: ['**/*.{snap,lock}'] });
    expect(r).toMatchObject({ ok: true, value: { ignoreGlobs: ['**/*.{snap,lock}'] } });
  });
  // BUG-01 at the settings layer: the negated glob is saved, and then every change is ignored.
  it('BUG-01 (fixed): a negated ignore glob ("!docs/keep.md") is refused with a field error', () => {
    const r = parseSettings({ ignoreGlobs: ['**/*.md', '!docs/keep.md'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.ignoreGlobs).toMatch(/!docs\/keep\.md starts with "!"/);
  });
  it('space keys compare case-insensitively', () => {
    expect(spaceWatched({ spaceMode: 'selected', spaceKeys: ['plat'] }, 'PLAT')).toBe(true);
    expect(spaceWatched({ spaceMode: 'selected', spaceKeys: ['PLAT'] }, null)).toBe(false);
  });
  it('BUG-18 (fixed): a Jira record without changelogId gets a key from its changelog', () => {
    const a = changeDedupeKey({ source: 'jira', issueKey: 'PAY-21', changelog: [{ field: 'status', from: 'To Do', to: 'Done' }] });
    const b = changeDedupeKey({ source: 'jira', issueKey: 'PAY-21', changelog: [{ field: 'fixVersions', from: '2026.12', to: '2027.01' }] });
    expect(a).toMatch(/^jira#PAY-21#h[0-9a-f]{16}$/);
    expect(a).not.toBe(b);
    expect(changeDedupeKey({ source: 'jira', issueKey: 'PAY-21', changelogId: '1001', changelog: [] })).toBe('jira#PAY-21#1001');
  });
});

describe('QA: fix proposals on tricky storage (D29)', () => {
  it('table cells, list items, nested lists and panels become their own blocks', () => {
    const s =
      '<h2>Steps</h2><table><tbody><tr><th>Flag</th><th>Meaning</th></tr><tr><td><code>--retries</code></td><td>How many times to retry</td></tr></tbody></table>' +
      '<ol><li>Run <code>./scripts/qa-deploy.sh</code><ul><li>Pass <code>--retries 3</code></li></ul></li><li>Check the logs</li></ol>' +
      '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>Set <code>QA_DEPLOY_TIMEOUT</code> first.</p>' +
      code('export QA_DEPLOY_TIMEOUT=30') +
      '</ac:rich-text-body></ac:structured-macro>';
    const b = extractBlocks(s);
    expect(b.map((x) => [x.kind, x.text])).toEqual([
      ['heading', 'Steps'],
      ['table-cell', 'Flag'],
      ['table-cell', 'Meaning'],
      ['table-cell', '--retries'],
      ['table-cell', 'How many times to retry'],
      ['list-item', 'Run ./scripts/qa-deploy.sh'],
      ['list-item', 'Pass --retries 3'],
      ['list-item', 'Check the logs'],
      ['paragraph', 'Set QA_DEPLOY_TIMEOUT first.'],
      ['code', 'export QA_DEPLOY_TIMEOUT=30'],
    ]);
  });
  it('editing a nested list item keeps the outer list item and its <code>', () => {
    const s = '<ol><li>Run <code>./scripts/qa-deploy.sh</code><ul><li>Pass <code>--retries 3</code></li></ul></li></ol>';
    const blocks = extractBlocks(s);
    const t = resolveTarget(blocks, { blockId: 'b2' });
    expect(t.ok).toBe(true);
    if (!t.ok) return;
    const r = editBlock(s, t.target, 'Pass --attempts 3');
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.storage).toBe('<ol><li>Run <code>./scripts/qa-deploy.sh</code><ul><li>Pass <code>--attempts 3</code></li></ul></li></ol>');
  });
  it('code with "]]>" inside CDATA round-trips', () => {
    const s = code('echo "a]]]]><![CDATA[>b" --retries 3');
    const [b] = extractBlocks(s);
    expect(b!.text).toBe('echo "a]]>b" --retries 3');
    const r = applyBlockEdit(s, { blockId: 'b1', originalText: b!.text, proposedText: 'echo "a]]>b" --attempts 3' });
    expect(r.ok && r.storage).toBe(code('echo "a]]]]><![CDATA[>b" --attempts 3'));
  });
  it('emoji (unicode and ac:emoticon) next to the changed text survive a narrow edit', () => {
    const s = '<p>🚀 Run <code>--retries</code> <ac:emoticon ac:name="warning" /> twice.</p>';
    const r = applyBlockEdit(s, { blockId: 'b1', originalText: '🚀 Run --retries twice.', proposedText: '🚀 Run --attempts twice.' });
    expect(r.ok && r.storage).toBe('<p>🚀 Run <code>--attempts</code> <ac:emoticon ac:name="warning" /> twice.</p>');
  });
  // BUG-05: link text (ac:link CDATA body) is not part of the block text, so get-drift-context shows
  // "Read then run ..." and a whole-block proposal that (naturally) restores the words duplicates the
  // link text on accept; when the changed characters span the link, the link itself is destroyed.
  const LINK = '<ac:link><ri:page ri:content-title="Rollback runbook" /><ac:plain-text-link-body><![CDATA[the runbook]]></ac:plain-text-link-body></ac:link>';
  const LINKED = `<p>Read ${LINK} then run <code>--retries</code> <strong>twice</strong>.</p>`;
  it('BUG-05 (fixed): the block text the agent sees includes the link text', () => {
    expect(extractBlocks(LINKED)[0]!.text).toBe('Read the runbook then run --retries twice.');
  });
  it('BUG-05 (fixed): a whole-block proposal that keeps the sentence does not duplicate the link text', () => {
    const r = applyBlockEdit(LINKED, { blockId: 'b1', originalText: extractBlocks(LINKED)[0]!.text, proposedText: 'Read the runbook, then run --attempts 3 times.' });
    expect(r.ok && (r.storage.match(/the runbook/g) ?? []).length).toBe(1);
    expect(r.ok && r.storage).toBe(`<p>Read ${LINK}, then run --attempts 3 times.</p>`);
  });
  it('BUG-05 (fixed): a narrow edit next to the link keeps the link and the code formatting', () => {
    const r = applyBlockEdit(LINKED, { blockId: 'b1', originalText: extractBlocks(LINKED)[0]!.text, proposedText: 'Read the runbook then run --attempts twice.' });
    expect(r.ok && r.storage).toBe(`<p>Read ${LINK} then run <code>--attempts</code> <strong>twice</strong>.</p>`);
  });
  it('BUG-05 (fixed): a rewrite whose changed characters span the link is refused, the link is never destroyed', () => {
    const r = applyBlockEdit(LINKED, { blockId: 'b1', originalText: extractBlocks(LINKED)[0]!.text, proposedText: 'Open it and pass --attempts 3.' });
    expect(r).toEqual({ ok: false, error: 'unsupported_span' });
    const t = resolveTarget(extractBlocks(LINKED), { blockId: 'b1' });
    expect(t.ok && editBlock(LINKED, t.target, 'Read the docs then run --retries twice.')).toEqual({ ok: false, error: 'unsupported_span' });
  });
  it('BUG-05 (fixed): a user mention shows as @mention and a rewrite through it is refused', () => {
    const s = '<p>Ask <ac:link><ri:user ri:account-id="5e8d4e6bacb63e0b834222ee" /></ac:link> before running <code>--retries</code>.</p>';
    expect(extractBlocks(s)[0]!.text).toBe('Ask @mention before running --retries.');
    expect(applyBlockEdit(s, { blockId: 'b1', originalText: extractBlocks(s)[0]!.text, proposedText: 'Before running --attempts, ask on-call.' })).toEqual({ ok: false, error: 'unsupported_span' });
    const ok = applyBlockEdit(s, { blockId: 'b1', originalText: extractBlocks(s)[0]!.text, proposedText: 'Ask @mention before running --attempts.' });
    expect(ok.ok && ok.storage).toBe('<p>Ask <ac:link><ri:user ri:account-id="5e8d4e6bacb63e0b834222ee" /></ac:link> before running <code>--attempts</code>.</p>');
  });
  it('BUG-05: page links without a body show the page title; an edit through an emoticon is refused', () => {
    expect(extractBlocks('<p>See <ac:link><ri:page ri:content-title="Rollback &amp; restore" /></ac:link>.</p>')[0]!.text).toBe('See Rollback & restore.');
    const s = '<p>Run <code>--retries</code> <ac:emoticon ac:name="warning" /> twice.</p>';
    expect(applyBlockEdit(s, { blockId: 'b1', originalText: 'Run --retries twice.', proposedText: 'Run it once.' })).toEqual({ ok: false, error: 'unsupported_span' });
  });
  it('a status macro inside the range is refused (unsupported_span), not destroyed', () => {
    const status = '<ac:structured-macro ac:name="status"><ac:parameter ac:name="title">BETA</ac:parameter></ac:structured-macro>';
    const s = `<p>Use <code>--retries</code> ${status} <em>only</em> here.</p>`;
    const [b] = extractBlocks(s);
    const r = applyBlockEdit(s, { blockId: 'b1', originalText: b!.text, proposedText: 'Use the attempts flag only here, always.' });
    expect(r).toEqual({ ok: false, error: 'unsupported_span' });
  });
  it('conflict: the page was edited so the block no longer holds the original: not_found', () => {
    const before = '<p>Run <code>--retries 3</code>.</p>';
    const after = '<p>Run <code>--retries 5</code>.</p>';
    expect(applyBlockEdit(after, { blockId: 'b1', originalText: extractBlocks(before)[0]!.text, proposedText: 'Run --attempts 3.' })).toEqual({ ok: false, error: 'not_found' });
  });
  it('conflict: a paragraph was inserted above (IDs moved): the draft still applies to its text', () => {
    const before = '<p>Intro.</p><p>Run <code>--retries 3</code>.</p>';
    const after = '<p>New first line.</p><p>Intro.</p><p>Run <code>--retries 3</code>.</p>';
    const r = applyBlockEdit(after, { blockId: 'b2', originalText: extractBlocks(before)[1]!.text, proposedText: 'Run --attempts 3.' });
    expect(r.ok && r.storage).toBe('<p>New first line.</p><p>Intro.</p><p>Run <code>--attempts 3</code>.</p>');
  });
  it('conflict: the original now appears twice: ambiguous', () => {
    const after = '<p>Run <code>--retries 3</code>.</p><p>New</p><p>Run <code>--retries 3</code>.</p>';
    expect(applyBlockEdit(after, { blockId: 'b9', originalText: 'Run --retries 3.', proposedText: 'Run --attempts 3.' })).toEqual({ ok: false, error: 'ambiguous' });
  });
  it('fix input: whitespace-only change is a no-op, a numeric blockId is accepted', () => {
    expect(validateFixInput({ originalText: 'a  b', proposedText: 'a b' })).toMatchObject({ ok: false, error: 'bad_request' });
    expect(validateFixInput({ blockId: 4, proposedText: 'x' })).toMatchObject({ ok: true, value: { blockId: 'b4' } });
    expect(validateFixInput({ blockId: 'block-4', proposedText: 'x' })).toMatchObject({ ok: false });
  });
});

describe('QA: tokens and diffs', () => {
  it('BUG-16 (fixed): whole-token match for identifiers and paths; a full stop still matches', () => {
    expect(tokenRegExp('ROLLBACK_TIMEOUT').test('ROLLBACK_TIMEOUT_SECS')).toBe(false);
    expect(tokenRegExp('scripts/a.sh').test('scripts/a.sh.bak')).toBe(false);
    expect(tokenRegExp('scripts/a.sh').test('Run scripts/a.sh.')).toBe(true);
    expect(tokenRegExp('scripts/a.sh').test('./scripts/a.sh --x')).toBe(true);
  });
  it('BUG-16 (fixed): diffForPaths keeps only the asked file, not a file whose name extends it', () => {
    const diff = 'diff --git a/scripts/a.sh b/scripts/a.sh\n@@ -1 +1 @@\n-x\n+y\ndiff --git a/scripts/a.sh.bak b/scripts/a.sh.bak\n@@ -1 +1 @@\n-x\n+y\n';
    const out = diffForPaths(diff, ['scripts/a.sh']);
    expect(out).toContain('a/scripts/a.sh b/scripts/a.sh');
    expect(out).not.toContain('a.sh.bak');
  });
});
