// Applies an accepted fix proposal to a Confluence storage-format (XHTML) body. Pure: no Forge
// imports, unit-tested (test/storage-edit.test.ts). The page text changes only when a person clicks
// Accept fix, asUser (D6, D15); this module only computes the new body.
//
// The edit is confined to the named section (from its heading to the next heading of any level;
// "Top of page" is the text before the first heading). `originalText` must occur exactly once in that
// section after whitespace normalisation, either inside a code or noformat macro (CDATA, replaced raw)
// or in the prose (replaced as escaped XHTML). Anything else returns `not_found` or `ambiguous`, and the
// body is never touched.
import { extractPageText } from '@dds/matcher';

export const TOP_OF_PAGE = 'Top of page';

export type EditError = 'not_found' | 'ambiguous' | 'section_not_found' | 'unsupported_span' | 'empty';

export type EditResult = { ok: true; storage: string; kind: 'code' | 'text' } | { ok: false; error: EditError };

const HEADING = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g;
const CODE_MACRO = /<ac:structured-macro\b[^>]*\bac:name="(?:code|noformat)"[^>]*>[\s\S]*?<\/ac:structured-macro>/g;
const CDATA = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'tr', 'td', 'th', 'table', 'thead', 'tbody', 'blockquote', 'br', 'hr', 'pre', 'ac:task', 'ac:layout-cell']);
const VOID_TAGS = new Set(['br', 'hr', 'img']);
const WS = /[\s ]/;

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…',
};

function decodeEntity(name: string): string | undefined {
  if (name[0] === '#') {
    const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : undefined;
  }
  return ENTITIES[name.toLowerCase()];
}

/** Collapses whitespace (including non-breaking spaces) to single spaces and trims. */
export function normalizeWhitespace(s: string): string {
  return s.replace(/[\s ]+/g, ' ').trim();
}

/** Strips a Markdown code fence or one pair of surrounding backticks that an agent may add around code. */
export function stripFence(s: string): string {
  const t = s.replace(/\r\n/g, '\n').trim();
  const fence = /^```[^\n]*\n([\s\S]*?)\n?```$/.exec(t);
  if (fence) return fence[1] ?? '';
  const tick = /^`([^`\n]+)`$/.exec(t);
  return tick ? (tick[1] ?? '') : t;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------
export interface SectionRange {
  heading: string;
  /** Raw offsets of the section body (after the heading tag, up to the next heading). */
  start: number;
  end: number;
}

function headingText(inner: string): string {
  return normalizeWhitespace(extractPageText(inner).text) || TOP_OF_PAGE;
}

/** Every section of the body, in order. The same split as review.ts `splitSections`, but with raw offsets. */
export function sectionRanges(storage: string): SectionRange[] {
  const out: SectionRange[] = [];
  let heading = TOP_OF_PAGE;
  let start = 0;
  for (const m of storage.matchAll(HEADING)) {
    out.push({ heading, start, end: m.index ?? 0 });
    heading = headingText(m[2] ?? '');
    start = (m.index ?? 0) + m[0].length;
  }
  out.push({ heading, start, end: storage.length });
  return out;
}

function headingKey(h: string): string {
  return normalizeWhitespace(h).toLowerCase();
}

// ---------------------------------------------------------------------------
// Matching with a map back to raw offsets
// ---------------------------------------------------------------------------
/** A normalised string plus, for each of its characters, the raw [start, end) it came from. */
export interface Mapped {
  text: string;
  from: number[];
  to: number[];
}

/** Collapses whitespace in a mapped character list. A collapsed run maps to the whole raw run. */
export function normalizeMapped(chars: { c: string; from: number; to: number }[]): Mapped {
  const out: Mapped = { text: '', from: [], to: [] };
  let pendingFrom = -1;
  let pendingTo = -1;
  for (const ch of chars) {
    if (WS.test(ch.c)) {
      if (pendingFrom < 0) pendingFrom = ch.from;
      pendingTo = ch.to;
      continue;
    }
    if (pendingFrom >= 0 && out.text.length > 0) {
      out.text += ' ';
      out.from.push(pendingFrom);
      out.to.push(pendingTo);
    }
    pendingFrom = -1;
    out.text += ch.c;
    out.from.push(ch.from);
    out.to.push(ch.to);
  }
  return out;
}

/** Every non-overlapping occurrence of `needle` in `m`, as raw [start, end) ranges. */
function findAll(m: Mapped, needle: string): [number, number][] {
  const hits: [number, number][] = [];
  if (!needle) return hits;
  let i = m.text.indexOf(needle);
  while (i >= 0) {
    hits.push([m.from[i]!, m.to[i + needle.length - 1]!]);
    i = m.text.indexOf(needle, i + needle.length);
  }
  return hits;
}

/** The section's prose as characters mapped to raw offsets: tags dropped, entities decoded, code macros skipped. */
function proseChars(storage: string, start: number, end: number): { c: string; from: number; to: number }[] {
  const chars: { c: string; from: number; to: number }[] = [];
  let i = start;
  while (i < end) {
    if (storage.startsWith('<ac:structured-macro', i)) {
      const close = storage.indexOf('>', i);
      const head = storage.slice(i, close + 1);
      if (/\bac:name="(?:code|noformat)"/.test(head)) {
        const stop = storage.indexOf('</ac:structured-macro>', i);
        const next = stop < 0 ? end : Math.min(end, stop + '</ac:structured-macro>'.length);
        chars.push({ c: '\n', from: i, to: next });
        i = next;
        continue;
      }
    }
    if (storage.startsWith('<ac:parameter', i)) {
      const stop = storage.indexOf('</ac:parameter>', i);
      i = stop < 0 ? end : Math.min(end, stop + '</ac:parameter>'.length);
      continue;
    }
    if (storage.startsWith('<![CDATA[', i)) {
      const stop = storage.indexOf(']]>', i);
      i = stop < 0 ? end : Math.min(end, stop + 3);
      continue;
    }
    const ch = storage[i]!;
    if (ch === '<') {
      const close = storage.indexOf('>', i);
      const next = close < 0 ? end : Math.min(end, close + 1);
      const name = /^<\/?([a-zA-Z][\w:-]*)/.exec(storage.slice(i, next))?.[1]?.toLowerCase();
      // A block tag separates words, like a newline would. It maps to the tag itself.
      if (name && BLOCK_TAGS.has(name)) chars.push({ c: '\n', from: i, to: next });
      i = next;
      continue;
    }
    if (ch === '&') {
      const m = /^&(#x[0-9a-f]+|#\d+|[a-z]+);/i.exec(storage.slice(i, i + 12));
      const decoded = m ? decodeEntity(m[1]!) : undefined;
      if (m && decoded !== undefined) {
        for (const c of decoded) chars.push({ c, from: i, to: i + m[0].length });
        i += m[0].length;
        continue;
      }
    }
    chars.push({ c: ch, from: i, to: i + 1 });
    i++;
  }
  return chars;
}

interface CodeSpan {
  /** Raw offsets of the CDATA content. */
  start: number;
  end: number;
}

function codeSpans(storage: string, start: number, end: number): CodeSpan[] {
  const spans: CodeSpan[] = [];
  const section = storage.slice(start, end);
  for (const macro of section.matchAll(CODE_MACRO)) {
    const macroStart = start + (macro.index ?? 0);
    const body = /<ac:plain-text-body>/.exec(macro[0]);
    if (!body) continue;
    for (const cd of macro[0].matchAll(CDATA)) {
      const contentStart = macroStart + (cd.index ?? 0) + '<![CDATA['.length;
      spans.push({ start: contentStart, end: contentStart + (cd[1] ?? '').length });
    }
  }
  return spans;
}

// ---------------------------------------------------------------------------
// Replacement rendering
// ---------------------------------------------------------------------------
export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Inline XHTML for proposed prose: escaped, `backticks` become <code>, line breaks become <br />. */
export function inlineXhtml(text: string): string {
  return text
    .split('\n')
    .map((line) => escapeXml(line).replace(/`([^`]+)`/g, '<code>$1</code>'))
    .join('<br />');
}

/** CDATA content cannot contain `]]>`; split it across two CDATA sections. */
export function cdataSafe(text: string): string {
  return text.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

type Tag = { name: string; close: boolean; selfClosing: boolean; start: number; end: number };

function tagsIn(s: string, offset: number): Tag[] {
  const tags: Tag[] = [];
  for (const m of s.matchAll(/<(\/?)([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g)) {
    const name = m[2]!.toLowerCase();
    tags.push({ name, close: m[1] === '/', selfClosing: m[3] === '/' || VOID_TAGS.has(name), start: offset + (m.index ?? 0), end: offset + (m.index ?? 0) + m[0].length });
  }
  return tags;
}

/** Unmatched closing and opening tags inside a raw slice. */
function imbalance(storage: string, start: number, end: number): { closes: number; opens: number } {
  const stack: string[] = [];
  let closes = 0;
  for (const t of tagsIn(storage.slice(start, end), start)) {
    if (t.selfClosing) continue;
    if (!t.close) stack.push(t.name);
    else if (stack.at(-1) === t.name) stack.pop();
    else closes++;
  }
  return { closes, opens: stack.length };
}

/**
 * Widens a prose match over directly adjacent opening tags (left) and closing tags (right) until its
 * tags balance, so `x</code> more` becomes `<code>x</code> more` and two paragraphs become whole `<p>`s.
 * Returns undefined when it can't balance inside the section.
 */
export function balance(storage: string, start: number, end: number, min: number, max: number): [number, number] | undefined {
  let s = start;
  let e = end;
  for (let step = 0; step < 12; step++) {
    const { closes, opens } = imbalance(storage, s, e);
    if (closes === 0 && opens === 0) return [s, e];
    let moved = false;
    if (closes > 0 && s > min && storage[s - 1] === '>') {
      const open = storage.lastIndexOf('<', s - 1);
      if (open >= min && storage[open + 1] !== '/' && storage[s - 2] !== '/') {
        s = open;
        moved = true;
      }
    }
    if (opens > 0 && e < max && storage.startsWith('</', e)) {
      const close = storage.indexOf('>', e);
      if (close >= 0 && close < max) {
        e = close + 1;
        moved = true;
      }
    }
    if (!moved) return undefined;
  }
  return undefined;
}

/** Block XHTML for proposed prose that replaces whole blocks: one <li> or <p> per line. */
function blockXhtml(text: string, firstTag: string): string {
  const tag = firstTag === 'li' ? 'li' : 'p';
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .map((l) => `<${tag}>${inlineXhtml(l)}</${tag}>`)
    .join('');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
/**
 * Replaces `originalText` with `proposedText` in the section headed `sectionHeading` (case and
 * whitespace-insensitive; "Top of page" for text before the first heading).
 */
export function applySectionEdit(storage: string, sectionHeading: string, originalText: string, proposedText: string): EditResult {
  const original = normalizeWhitespace(stripFence(originalText));
  if (!original) return { ok: false, error: 'empty' };
  const proposed = stripFence(proposedText);
  const want = headingKey(sectionHeading || TOP_OF_PAGE);
  const sections = sectionRanges(storage).filter((s) => headingKey(s.heading) === want);
  if (sections.length === 0) return { ok: false, error: 'section_not_found' };

  type Hit = { kind: 'code' | 'text'; start: number; end: number; section: SectionRange };
  const hits: Hit[] = [];
  for (const section of sections) {
    for (const span of codeSpans(storage, section.start, section.end)) {
      const chars = [...storage.slice(span.start, span.end)].map((c, k) => ({ c, from: span.start + k, to: span.start + k + 1 }));
      // Code points vs UTF-16: rebuild offsets from code units so surrogate pairs map correctly.
      let pos = span.start;
      for (const ch of chars) {
        ch.from = pos;
        pos += ch.c.length;
        ch.to = pos;
      }
      for (const [start, end] of findAll(normalizeMapped(chars), original)) hits.push({ kind: 'code', start, end, section });
    }
    for (const [start, end] of findAll(normalizeMapped(proseChars(storage, section.start, section.end)), original)) {
      hits.push({ kind: 'text', start, end, section });
    }
  }
  if (hits.length === 0) return { ok: false, error: 'not_found' };
  if (hits.length > 1) return { ok: false, error: 'ambiguous' };

  const hit = hits[0]!;
  if (hit.kind === 'code') {
    return { ok: true, kind: 'code', storage: storage.slice(0, hit.start) + cdataSafe(proposed) + storage.slice(hit.end) };
  }
  const range = balance(storage, hit.start, hit.end, hit.section.start, hit.section.end);
  if (!range) return { ok: false, error: 'unsupported_span' };
  const [start, end] = range;
  const slice = storage.slice(start, end);
  // A match that runs into a code macro would rewrite code as prose: refuse it.
  if (/<ac:(?:structured-macro|link|emoticon|image)\b|<ri:/.test(slice)) return { ok: false, error: 'unsupported_span' };
  const blockTags = tagsIn(slice, start).filter((t) => BLOCK_TAGS.has(t.name) && !VOID_TAGS.has(t.name));
  const replacement = blockTags.length > 0 ? blockXhtml(proposed, blockTags[0]!.name) : inlineXhtml(proposed);
  return { ok: true, kind: 'text', storage: storage.slice(0, start) + replacement + storage.slice(end) };
}

/** User-facing messages for each edit error (brand voice: calm, specific). */
export const EDIT_MESSAGES: Record<EditError, string> = {
  not_found: 'The original text is no longer in this section. Ask Drift Reviewer for a new draft.',
  ambiguous: 'The original text appears more than once in this section. Ask Drift Reviewer for a longer excerpt.',
  section_not_found: 'This section is no longer on the page. Ask Drift Reviewer for a new draft.',
  unsupported_span: 'The original text spans formatting Doc Drift cannot edit safely. Edit the page by hand.',
  empty: 'The draft has no original text to replace.',
};
