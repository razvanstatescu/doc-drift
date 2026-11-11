/** Plain text and code pulled out of a Confluence storage-format (XHTML) page body. */
export interface ExtractedPage {
  /** Visible text, one block per line, code block contents included. */
  text: string;
  /** Bodies of `code` / `noformat` macros and `<pre>` blocks. */
  codeBlocks: string[];
  /** Inline `<code>` spans and backticked spans in the text. */
  inlineCode: string[];
  /** Link targets (`href` and `ri:url` values). */
  links: string[];
}

const CODE_MACRO =
  /<ac:structured-macro\b[^>]*\bac:name="(?:code|noformat)"[^>]*>([\s\S]*?)<\/ac:structured-macro>/g;
const PLAIN_TEXT_BODY = /<ac:plain-text-body>([\s\S]*?)<\/ac:plain-text-body>/;
const CDATA = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const PRE = /<pre\b[^>]*>([\s\S]*?)<\/pre>/g;
const INLINE_CODE = /<code\b[^>]*>([\s\S]*?)<\/code>/g;
const LINK = /\b(?:href|ri:value)="([^"]+)"/g;
const PARAMETER = /<ac:parameter\b[^>]*>[\s\S]*?<\/ac:parameter>/g;
const BLOCK_TAG = /<\/?(?:p|div|h[1-6]|li|ul|ol|tr|table|thead|tbody|blockquote|br|hr|ac:task|ac:layout-cell)\b[^>]*\/?>/g;
const CELL_TAG = /<\/?(?:td|th)\b[^>]*>/g;
const ANY_TAG = /<[^>]+>/g;
const BACKTICKS = /`([^`\n]+)`/g;
/** Placeholder for an extracted code block; uses a control character that cannot appear in XHTML text. */
const SLOT = /\u0000(\d+)\u0000/g;

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

function htmlToText(html: string): string {
  return decodeEntities(html.replace(BLOCK_TAG, '\n').replace(CELL_TAG, ' ').replace(ANY_TAG, ''));
}

function macroBody(inner: string): string {
  const body = PLAIN_TEXT_BODY.exec(inner)?.[1] ?? '';
  const parts = [...body.matchAll(CDATA)].map((m) => m[1] ?? '');
  return parts.length > 0 ? parts.join('') : decodeEntities(body);
}

/**
 * Extracts plain text, code blocks, inline code and links from Confluence storage format.
 * Lightweight regex parsing, no DOM: good enough for anchor suggestion and matching, not for rendering.
 */
export function extractPageText(storage: string): ExtractedPage {
  const codeBlocks: string[] = [];
  const keep = (code: string) => `\n\u0000${codeBlocks.push(code.replace(/\r\n/g, '\n')) - 1}\u0000\n`;

  const links = [...storage.matchAll(LINK)].map((m) => decodeEntities(m[1] ?? ''));
  let html = storage
    .replace(CODE_MACRO, (_, inner: string) => keep(macroBody(inner)))
    .replace(PRE, (_, inner: string) => keep(htmlToText(inner)));
  const inlineCode = [...html.matchAll(INLINE_CODE)].map((m) => htmlToText(m[1] ?? '').trim());
  html = html.replace(PARAMETER, '');

  const prose = htmlToText(html)
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .filter((line) => line !== '')
    .join('\n');
  for (const [, span] of prose.replace(SLOT, '').matchAll(BACKTICKS)) if (span) inlineCode.push(span.trim());

  const text = prose.replace(SLOT, (_, i: string) => codeBlocks[Number(i)] ?? '');
  return { text, codeBlocks, inlineCode: inlineCode.filter((c) => c !== ''), links };
}
