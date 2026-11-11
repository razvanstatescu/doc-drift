import { describe, expect, it } from 'vitest';
import { applyBlockEdit, editBlock, extractBlocks, isNoOp, parseBlockId, resolveTarget, spannedBlocks, targetOriginal } from '../src/lib/blocks';

const code = (body: string, lang = 'bash') =>
  `<ac:structured-macro ac:name="code" ac:schema-version="1"><ac:parameter ac:name="language">${lang}</ac:parameter><ac:plain-text-body><![CDATA[${body}]]></ac:plain-text-body></ac:structured-macro>`;

// DDSTEST page 3080280, as created for the M3 checks (the live Rovo failure, 2026-11-11).
const PAYOUT = [
  '<p>How to retry failed payouts in payments-api.</p>',
  '<h2>Retry the payout job</h2>',
  '<p>Run <code>scripts/payout-retry.sh</code> with <code>--count</code> set to the number of attempts.</p>',
  code('./scripts/payout-retry.sh --count 3\nkubectl logs job/payout-retry'),
  '<h2>Escalation</h2><p>Page the payments on-call if 3 retries fail.</p>',
].join('');

const PARA = 'Run scripts/payout-retry.sh with --count set to the number of attempts.';
const CODE = './scripts/payout-retry.sh --count 3\nkubectl logs job/payout-retry';

describe('extractBlocks', () => {
  it('splits a page into paragraphs, headings and code bodies with page-wide IDs', () => {
    const blocks = extractBlocks(PAYOUT);
    expect(blocks.map((b) => [b.blockId, b.kind, b.section, b.text])).toEqual([
      ['b1', 'paragraph', 'Top of page', 'How to retry failed payouts in payments-api.'],
      ['b2', 'heading', 'Retry the payout job', 'Retry the payout job'],
      ['b3', 'paragraph', 'Retry the payout job', PARA],
      ['b4', 'code', 'Retry the payout job', CODE],
      ['b5', 'heading', 'Escalation', 'Escalation'],
      ['b6', 'paragraph', 'Escalation', 'Page the payments on-call if 3 retries fail.'],
    ]);
  });

  it('reads code macros from CDATA verbatim, including split CDATA and CRLF', () => {
    const page = `<h2>A</h2><ac:structured-macro ac:name="noformat"><ac:plain-text-body><![CDATA[echo "]]]]><![CDATA[>"\r\nls]]></ac:plain-text-body></ac:structured-macro>`;
    const [, b] = extractBlocks(page);
    expect(b).toMatchObject({ kind: 'code', text: 'echo "]]>"\nls' });
  });

  it('never reads macro parameters, and decodes entities', () => {
    const blocks = extractBlocks(`<p>A &amp; B&nbsp;C</p>${code('x', 'python')}`);
    expect(blocks.map((b) => b.text)).toEqual(['A & B C'.replace(' ', ' '), 'x']);
  });

  it('makes list items and table cells their own blocks, through nested paragraphs', () => {
    const page = '<ul><li>First step</li><li><p>Second <strong>step</strong></p><ul><li>Nested</li></ul></li></ul>' +
      '<table><tbody><tr><th><p>Flag</p></th><td>--count</td></tr></tbody></table><pre>a &lt; b\nc</pre>';
    expect(extractBlocks(page).map((b) => [b.kind, b.text])).toEqual([
      ['list-item', 'First step'],
      ['list-item', 'Second step'],
      ['list-item', 'Nested'],
      ['table-cell', 'Flag'],
      ['table-cell', '--count'],
      ['code', 'a < b\nc'],
    ]);
  });

  it('treats loose text and line breaks sensibly', () => {
    const blocks = extractBlocks('Loose text<p>One<br/>Two</p>');
    expect(blocks.map((b) => b.text)).toEqual(['Loose text', 'One Two']);
  });

  it('skips task metadata', () => {
    const page = '<ac:task-list><ac:task><ac:task-id>1</ac:task-id><ac:task-status>incomplete</ac:task-status><ac:task-body>Rotate keys</ac:task-body></ac:task></ac:task-list>';
    expect(extractBlocks(page).map((b) => [b.kind, b.text])).toEqual([['list-item', 'Rotate keys']]);
  });
});

describe('parseBlockId', () => {
  it('accepts b3, B3 and 3', () => {
    expect(parseBlockId('b3')).toBe('b3');
    expect(parseBlockId(' B03 ')).toBe('b3');
    expect(parseBlockId(3)).toBe('b3');
    expect(parseBlockId('block 3')).toBeUndefined();
    expect(parseBlockId(undefined)).toBeUndefined();
  });
});

describe('resolveTarget: the live failure on page 3080280', () => {
  const blocks = extractBlocks(PAYOUT);
  const heading = 'Retry the payout job';

  it('joined with ". " is spans_blocks, naming the paragraph and the code block', () => {
    const r = resolveTarget(blocks, { sectionHeading: heading, originalText: `${PARA}. ./scripts/payout-retry.sh --count 3` });
    expect(r).toEqual({ ok: false, error: 'spans_blocks', blockIds: ['b3', 'b4'] });
  });

  it('joined with a newline is spans_blocks too', () => {
    const r = resolveTarget(blocks, { sectionHeading: heading, originalText: `${PARA}\n./scripts/payout-retry.sh --count 3` });
    expect(r).toEqual({ ok: false, error: 'spans_blocks', blockIds: ['b3', 'b4'] });
  });

  it('with the whole code block and backticks is spans_blocks', () => {
    const r = resolveTarget(blocks, { sectionHeading: heading, originalText: `Run \`scripts/payout-retry.sh\` with \`--count\` set to the number of attempts.\n\`\`\`\n${CODE}\n\`\`\`` });
    expect(r.ok === false && r.error).toBe('spans_blocks');
  });

  it('one block at a time resolves by blockId, or by text', () => {
    const p = resolveTarget(blocks, { blockId: 'b3' });
    expect(p.ok && p.target.block.kind).toBe('paragraph');
    const c = resolveTarget(blocks, { sectionHeading: heading, originalText: './scripts/payout-retry.sh --count 3' });
    expect(c.ok && [c.target.block.blockId, c.target.span]).toEqual(['b4', [0, 35]]);
    const t = resolveTarget(blocks, { sectionHeading: heading, originalText: PARA });
    expect(t.ok && [t.target.block.blockId, t.target.span]).toEqual(['b3', undefined]);
  });

  it('tolerates backticks the agent added and a wrong section heading', () => {
    const r = resolveTarget(blocks, { sectionHeading: 'Retry', originalText: 'with `--count` set' });
    expect(r.ok && r.target.block.blockId).toBe('b3');
  });

  it('not_found returns the section blocks as candidates', () => {
    const r = resolveTarget(blocks, { sectionHeading: heading, originalText: 'Run the retry script twice' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('not_found');
    expect(r.candidates?.map((b) => b.blockId)).toEqual(['b2', 'b3', 'b4']);
  });

  it('an unknown blockId is not_found; a span missing from its block is not_found', () => {
    expect(resolveTarget(blocks, { blockId: 'b99' }).ok).toBe(false);
    const r = resolveTarget(blocks, { blockId: 'b4', originalText: 'kubectl logs job/other' });
    expect(r.ok === false && r.error).toBe('not_found');
  });

  it('ambiguous when the text is in two blocks', () => {
    const page = '<h2>A</h2><p>retry 3 times</p><p>then retry 3 times</p>';
    const r = resolveTarget(extractBlocks(page), { sectionHeading: 'A', originalText: 'retry 3 times' });
    expect(r.ok === false && r.error).toBe('ambiguous');
  });

  it('isNoOp and targetOriginal', () => {
    const r = resolveTarget(blocks, { blockId: 'b4' });
    if (!r.ok) throw new Error('expected ok');
    expect(targetOriginal(r.target)).toBe(CODE);
    expect(isNoOp(r.target, `\`\`\`\n${CODE}\n\`\`\``)).toBe(true);
    expect(isNoOp(r.target, CODE.replace('--count', '--attempts'))).toBe(false);
  });
});

describe('spannedBlocks', () => {
  it('ignores a passage inside one block', () => {
    expect(spannedBlocks(extractBlocks(PAYOUT), 'Run scripts/payout-retry.sh with --count set')).toEqual([]);
  });
});

describe('editBlock and applyBlockEdit', () => {
  it('replaces a whole paragraph, keeping inline code around the changed word', () => {
    const r = applyBlockEdit(PAYOUT, { blockId: 'b3', originalText: PARA, proposedText: 'Run `scripts/payout-retry.sh` with `--attempts` set to the number of attempts.' });
    expect(r.ok && r.storage).toContain('<p>Run <code>scripts/payout-retry.sh</code> with <code>--attempts</code> set to the number of attempts.</p>');
  });

  it('replaces a whole code body in CDATA, raw', () => {
    const r = applyBlockEdit(PAYOUT, { blockId: 'b4', originalText: CODE, proposedText: '```bash\n./scripts/payout-retry.sh --attempts 3\nkubectl logs job/payout-retry\n```' });
    expect(r.ok && r.kind).toBe('code');
    expect(r.ok && r.storage).toContain('<![CDATA[./scripts/payout-retry.sh --attempts 3\nkubectl logs job/payout-retry]]>');
  });

  it('replaces a single line inside a code body', () => {
    const r = applyBlockEdit(PAYOUT, { blockId: 'b4', originalText: './scripts/payout-retry.sh --count 3', proposedText: './scripts/payout-retry.sh --attempts 3' });
    expect(r.ok && r.storage).toContain('<![CDATA[./scripts/payout-retry.sh --attempts 3\nkubectl logs job/payout-retry]]>');
  });

  it('applies two proposals for one section one after the other', () => {
    const a = applyBlockEdit(PAYOUT, { blockId: 'b3', originalText: PARA, proposedText: PARA.replace('--count', '--attempts') });
    if (!a.ok) throw new Error(a.error);
    const b = applyBlockEdit(a.storage, { blockId: 'b4', originalText: CODE, proposedText: CODE.replace('--count', '--attempts') });
    if (!b.ok) throw new Error(b.error);
    expect(b.storage).not.toContain('--count');
    expect(b.storage).toContain('<code>--attempts</code>');
    expect(b.storage).toContain('<h2>Escalation</h2>');
  });

  it('finds the block by its text when the IDs moved', () => {
    const moved = `<p>New intro.</p>${PAYOUT}`;
    const r = applyBlockEdit(moved, { blockId: 'b3', sectionHeading: 'Retry the payout job', originalText: PARA, proposedText: 'Run it.' });
    expect(r.ok && r.blockId).toBe('b4');
    expect(r.ok && r.storage).toContain('<p>Run it.</p>');
  });

  it('is not_found when the block text changed since the draft', () => {
    expect(applyBlockEdit(PAYOUT, { blockId: 'b3', originalText: 'Run the old script.', proposedText: 'x' })).toEqual({ ok: false, error: 'not_found' });
  });

  it('escapes prose and rewrites plain text when the change straddles formatting', () => {
    const blocks = extractBlocks(PAYOUT);
    const r = editBlock(PAYOUT, { block: blocks[2]! }, 'Use the <new> & improved runner.');
    expect(r.ok && r.storage).toContain('<p>Use the &lt;new&gt; &amp; improved runner.</p>');
  });

  it('edits list items, table cells and headings in place', () => {
    const page = '<h2>Flags</h2><ul><li>Pass <code>--count</code></li></ul><table><tbody><tr><td><p>--count</p></td></tr></tbody></table>';
    const blocks = extractBlocks(page);
    let s = page;
    for (const id of ['b3', 'b2']) {
      const r = applyBlockEdit(s, { blockId: id, originalText: '--count', proposedText: '--attempts' });
      if (!r.ok) throw new Error(r.error);
      s = r.storage;
    }
    expect(s).toBe('<h2>Flags</h2><ul><li>Pass <code>--attempts</code></li></ul><table><tbody><tr><td><p>--attempts</p></td></tr></tbody></table>');
    const h = applyBlockEdit(s, { blockId: blocks[0]!.blockId, originalText: 'Flags', proposedText: 'Retry flags' });
    expect(h.ok && h.storage.startsWith('<h2>Retry flags</h2>')).toBe(true);
  });
});
