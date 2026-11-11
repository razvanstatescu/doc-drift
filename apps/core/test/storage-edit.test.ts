import { describe, expect, it } from 'vitest';
import { applySectionEdit, inlineXhtml, normalizeWhitespace, sectionRanges, stripFence } from '../src/lib/storage-edit';

const code = (body: string, lang = 'bash') =>
  `<ac:structured-macro ac:name="code" ac:schema-version="1"><ac:parameter ac:name="language">${lang}</ac:parameter><ac:plain-text-body><![CDATA[${body}]]></ac:plain-text-body></ac:structured-macro>`;

const PAGE = [
  '<p>Intro mentions <code>scripts/rollback.sh</code> once.</p>',
  '<h2>Rollback</h2>',
  '<p>Run the rollback script with a timeout of 30 seconds.</p>',
  code('./scripts/rollback.sh --count 3\nkubectl rollout status deploy/payments'),
  '<h2>Scaling</h2>',
  '<p>Use <code>--count</code> to set the number of workers &amp; wait.</p>',
  '<ul><li>First step</li><li>Second step</li></ul>',
].join('');

describe('sectionRanges', () => {
  it('splits at headings with Top of page first', () => {
    expect(sectionRanges(PAGE).map((s) => s.heading)).toEqual(['Top of page', 'Rollback', 'Scaling']);
  });
});

describe('applySectionEdit: code macros', () => {
  it('replaces a line inside CDATA, raw, keeping the rest of the block', () => {
    const r = applySectionEdit(PAGE, 'Rollback', './scripts/rollback.sh --count 3', './scripts/rollback-v2.sh --replicas 3');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe('code');
    expect(r.storage).toContain('<![CDATA[./scripts/rollback-v2.sh --replicas 3\nkubectl rollout status deploy/payments]]>');
    expect(r.storage).not.toContain('rollback.sh --count');
  });

  it('matches after whitespace normalisation across lines', () => {
    const r = applySectionEdit(PAGE, 'rollback', '  ./scripts/rollback.sh   --count 3\n kubectl rollout ', 'X');
    expect(r.ok && r.storage).toContain('<![CDATA[X status deploy/payments]]>');
  });

  it('strips a Markdown fence the agent added', () => {
    const r = applySectionEdit(PAGE, 'Rollback', '```bash\n./scripts/rollback.sh --count 3\n```', '```\n./scripts/rollback.sh --replicas 3\n```');
    expect(r.ok && r.storage).toContain('<![CDATA[./scripts/rollback.sh --replicas 3\n');
  });

  it('keeps CDATA valid when the proposal contains ]]>', () => {
    const r = applySectionEdit(PAGE, 'Rollback', 'kubectl rollout status deploy/payments', 'echo "]]>"');
    expect(r.ok && r.storage).toContain('echo "]]]]><![CDATA[>"]]>');
  });
});

describe('applySectionEdit: prose', () => {
  it('replaces plain paragraph text and escapes the proposal', () => {
    const r = applySectionEdit(PAGE, 'Rollback', 'with a timeout of 30 seconds', 'with a timeout of 60 seconds & a retry');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe('text');
    expect(r.storage).toContain('<p>Run the rollback script with a timeout of 60 seconds &amp; a retry.</p>');
  });

  it('matches decoded entities and text across inline tags, widening over the tag', () => {
    const r = applySectionEdit(PAGE, 'Scaling', 'Use --count to set the number of workers & wait.', 'Use `--replicas` to set the number of workers.');
    expect(r.ok && r.storage).toContain('<p>Use <code>--replicas</code> to set the number of workers.</p>');
  });

  it('widens a match that starts inside an inline tag', () => {
    const r = applySectionEdit(PAGE, 'Scaling', '--count to set', '--replicas to set');
    expect(r.ok && r.storage).toContain('<p>Use --replicas to set the number');
  });

  it('replaces whole list items as list items', () => {
    const r = applySectionEdit(PAGE, 'Scaling', 'First step Second step', 'Step one\nStep two');
    expect(r.ok && r.storage).toContain('<ul><li>Step one</li><li>Step two</li></ul>');
  });

  it('edits the Top of page section', () => {
    const r = applySectionEdit(PAGE, 'Top of page', 'mentions scripts/rollback.sh once', 'mentions scripts/rollback-v2.sh once');
    expect(r.ok && r.storage.startsWith('<p>Intro <code>')).toBe(false);
    expect(r.ok && r.storage).toContain('mentions scripts/rollback-v2.sh once');
  });
});

describe('applySectionEdit: refusals', () => {
  it('returns not_found when the text is not in the named section', () => {
    expect(applySectionEdit(PAGE, 'Scaling', 'with a timeout of 30 seconds', 'x')).toEqual({ ok: false, error: 'not_found' });
  });

  it('returns not_found when the text changed', () => {
    expect(applySectionEdit(PAGE, 'Rollback', './scripts/rollback.sh --count 4', 'x')).toEqual({ ok: false, error: 'not_found' });
  });

  it('returns section_not_found for an unknown heading', () => {
    expect(applySectionEdit(PAGE, 'Deploy', 'anything', 'x')).toEqual({ ok: false, error: 'section_not_found' });
  });

  it('returns ambiguous when the text occurs twice', () => {
    const page = `<h2>A</h2><p>retry 3 times</p>${code('retry 3 times')}`;
    expect(applySectionEdit(page, 'A', 'retry 3 times', 'retry 5 times')).toEqual({ ok: false, error: 'ambiguous' });
  });

  it('returns empty for blank original text', () => {
    expect(applySectionEdit(PAGE, 'Rollback', '   ', 'x')).toEqual({ ok: false, error: 'empty' });
  });

  it('never matches inside macro parameters', () => {
    expect(applySectionEdit(PAGE, 'Rollback', 'bash', 'sh')).toEqual({ ok: false, error: 'not_found' });
  });

  it('refuses a prose match that runs into a code macro', () => {
    const r = applySectionEdit(PAGE, 'Rollback', 'timeout of 30 seconds. ./scripts/rollback.sh', 'x');
    expect(r.ok).toBe(false);
  });
});

describe('helpers', () => {
  it('normalizeWhitespace collapses nbsp and newlines', () => {
    expect(normalizeWhitespace(' a \n b ')).toBe('a b');
  });
  it('stripFence handles fences and single backticks', () => {
    expect(stripFence('```sh\nls\n```')).toBe('ls');
    expect(stripFence('`ls -la`')).toBe('ls -la');
    expect(stripFence('plain')).toBe('plain');
  });
  it('inlineXhtml escapes and converts backticks and line breaks', () => {
    expect(inlineXhtml('a < b\nuse `x`')).toBe('a &lt; b<br />use <code>x</code>');
  });
});
