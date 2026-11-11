// Page blocks for Propose fix (D28, D29). Pure: no Forge imports, unit-tested (test/blocks.test.ts).
//
// A block is the smallest unit a fix proposal may change: a paragraph, a list item, a table cell, a
// heading, or the body of a code macro (or `<pre>`). get-drift-context lists the blocks of each affected
// section with a page-wide `blockId` ("b1", "b2", ... in document order), and submit-fix-proposal
// targets exactly one block. Prose text is whitespace-collapsed (one line, entities decoded, tags
// dropped), as the matcher reads it; code text is the verbatim macro body (`\r\n` -> `\n`).
//
// Each block keeps a map from its normalised text back to raw storage offsets, so an edit can replace
// only the characters that change and leave inline formatting (`<code>`, links, bold) around them.
import { balance, cdataSafe, escapeXml, normalizeMapped, normalizeWhitespace, sectionRanges, stripFence, type Mapped } from './storage-edit';

export type BlockKind = 'paragraph' | 'code' | 'list-item' | 'heading' | 'table-cell';

export type { Mapped };

export interface PageBlock {
  blockId: string;
  kind: BlockKind;
  /** Index into sectionRanges(storage), and that section's heading as the page spells it. */
  sectionIndex: number;
  section: string;
  /** What the agent sees: prose collapsed to one line; code verbatim. */
  text: string;
  /** Whitespace-normalised text mapped to raw offsets (the matching surface). */
  mapped: Mapped;
  /** Raw bounds an edit may not leave: the element's content (prose) or the code body. */
  start: number;
  end: number;
  /** Code macro CDATA content ranges, in order. */
  cdata?: { start: number; end: number }[];
  /** `<pre>` code: replaced as escaped text, not CDATA. */
  pre?: boolean;
}

type Ch = { c: string; from: number; to: number };

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

/** Raw characters of a code body, one entry per UTF-16 code unit run (surrogate pairs stay together). */
function rawChars(storage: string, start: number, end: number): Ch[] {
  const out: Ch[] = [];
  let pos = start;
  for (const c of storage.slice(start, end)) {
    out.push({ c, from: pos, to: pos + c.length });
    pos += c.length;
  }
  return out;
}

/** Decoded characters of an XHTML fragment (tags dropped, `<br>` as a newline), for `<pre>` bodies. */
function decodedChars(storage: string, start: number, end: number): Ch[] {
  const out: Ch[] = [];
  let i = start;
  while (i < end) {
    const ch = storage[i]!;
    if (ch === '<') {
      const close = storage.indexOf('>', i);
      const next = close < 0 ? end : Math.min(end, close + 1);
      if (/^<br\b/i.test(storage.slice(i, next))) out.push({ c: '\n', from: i, to: next });
      i = next;
      continue;
    }
    if (ch === '&') {
      const m = /^&(#x[0-9a-f]+|#\d+|[a-z]+);/i.exec(storage.slice(i, i + 12));
      const decoded = m ? decodeEntity(m[1]!) : undefined;
      if (m && decoded !== undefined) {
        for (const c of decoded) out.push({ c, from: i, to: i + m[0].length });
        i += m[0].length;
        continue;
      }
    }
    out.push({ c: ch, from: i, to: i + 1 });
    i++;
  }
  return out;
}

/** Shown for a user mention: storage has only the account ID, never the name. Keep it verbatim. */
export const MENTION_TEXT = '@mention';

function decodeAttr(v: string): string {
  return v.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, name: string) => decodeEntity(name) ?? m);
}

/** The visible text of an <ac:link> body: its plain-text or rich body, a mention, a page title or a file name. */
export function linkText(inner: string): string {
  const plain = /<ac:plain-text-link-body>\s*<!\[CDATA\[([\s\S]*?)\]\]>/.exec(inner);
  if (plain) return plain[1] ?? '';
  const rich = /<ac:link-body>([\s\S]*?)<\/ac:link-body>/.exec(inner);
  if (rich) return decodedChars(rich[1] ?? '', 0, (rich[1] ?? '').length).map((c) => c.c).join('');
  if (/<ri:user\b/.test(inner)) return MENTION_TEXT;
  const title = /\bri:content-title="([^"]*)"/.exec(inner) ?? /\bri:filename="([^"]*)"/.exec(inner) ?? /\bri:value="([^"]*)"/.exec(inner);
  return title ? decodeAttr(title[1] ?? '') : '';
}

/** Inline objects a prose edit must never cut through or rewrite as plain text (BUG-05). */
const INLINE_OBJECT = /<ac:(?:structured-macro|link|emoticon|image)\b|<ri:/;

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------
/** Elements whose direct text forms a block. */
const CONTAINERS = new Set(['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ac:task-body']);
/** Structural tags: they end a run of loose text (and are a line break inside a container). */
const BREAKS = new Set(['div', 'ul', 'ol', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'blockquote', 'br', 'hr', 'ac:task', 'ac:task-list', 'ac:layout', 'ac:layout-section', 'ac:layout-cell', 'ac:rich-text-body']);
/** Elements whose content is never page text. */
const SKIP = new Set(['ac:parameter', 'ac:task-id', 'ac:task-uuid', 'ac:task-status', 'ac:placeholder', 'style', 'script']);

type Open = { tag: string; contentStart: number; chars: Ch[] };

function proseKind(tag: string, stack: Open[]): BlockKind {
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'li' || tag === 'ac:task-body') return 'list-item';
  if (tag === 'td' || tag === 'th') return 'table-cell';
  // A paragraph inside a list item or table cell takes the outer kind.
  for (let k = stack.length - 1; k >= 0; k--) {
    const t = stack[k]!.tag;
    if (t === 'li' || t === 'ac:task-body') return 'list-item';
    if (t === 'td' || t === 'th') return 'table-cell';
  }
  return 'paragraph';
}

type Raw = Omit<PageBlock, 'blockId' | 'sectionIndex' | 'section'> & { anchor: number };

/**
 * Every block of a storage-format body, in document order, with page-wide IDs. Text inside code and
 * `<pre>` blocks, macro parameters and link CDATA is handled as the matcher handles it.
 */
export function extractBlocks(storage: string): PageBlock[] {
  const raw: Raw[] = [];
  const stack: Open[] = [];
  let loose: Ch[] = [];

  const flushLoose = () => {
    const mapped = normalizeMapped(loose);
    if (mapped.text) {
      const start = mapped.from[0]!;
      const end = mapped.to[mapped.to.length - 1]!;
      raw.push({ kind: 'paragraph', text: mapped.text, mapped, start, end, anchor: start });
    }
    loose = [];
  };
  const sink = (): Ch[] => stack.at(-1)?.chars ?? loose;
  const closeContainer = (idx: number, closeStart: number, closeEnd: number) => {
    // Pops everything above idx too (unclosed tags), then the container itself.
    while (stack.length > idx) {
      const open = stack.pop()!;
      if (!CONTAINERS.has(open.tag)) continue;
      const mapped = normalizeMapped(open.chars);
      if (!mapped.text) continue;
      const kind = proseKind(open.tag, stack);
      // Headings anchor after their close tag, so they sort into the section they start.
      const anchor = kind === 'heading' ? closeEnd : open.contentStart;
      raw.push({ kind, text: mapped.text, mapped, start: open.contentStart, end: closeStart, anchor });
    }
  };

  let i = 0;
  const n = storage.length;
  while (i < n) {
    const ch = storage[i]!;
    if (ch === '<') {
      if (storage.startsWith('<!--', i)) {
        const stop = storage.indexOf('-->', i);
        i = stop < 0 ? n : stop + 3;
        continue;
      }
      if (storage.startsWith('<![CDATA[', i)) {
        // CDATA outside code macros (link bodies): the matcher drops it too.
        const stop = storage.indexOf(']]>', i);
        i = stop < 0 ? n : stop + 3;
        continue;
      }
      const close = storage.indexOf('>', i);
      if (close < 0) break;
      const tagText = storage.slice(i, close + 1);
      const m = /^<(\/?)([a-zA-Z][\w:-]*)/.exec(tagText);
      if (!m) {
        sink().push({ c: ch, from: i, to: i + 1 });
        i++;
        continue;
      }
      const isClose = m[1] === '/';
      const name = m[2]!.toLowerCase();
      const selfClosing = tagText.endsWith('/>');

      if (!isClose && name === 'ac:structured-macro' && /\bac:name="(?:code|noformat)"/.test(tagText)) {
        const stopAt = storage.indexOf('</ac:structured-macro>', close);
        const macroEnd = stopAt < 0 ? n : stopAt + '</ac:structured-macro>'.length;
        const inner = storage.slice(close + 1, stopAt < 0 ? n : stopAt);
        const bodyAt = inner.indexOf('<ac:plain-text-body>');
        if (stack.length === 0) flushLoose();
        else sink().push({ c: '\n', from: i, to: i });
        if (bodyAt >= 0) {
          const base = close + 1 + bodyAt;
          const bodyEnd = storage.indexOf('</ac:plain-text-body>', base);
          const body = storage.slice(base, bodyEnd < 0 ? macroEnd : bodyEnd);
          const cdata: { start: number; end: number }[] = [];
          for (const cd of body.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)) {
            const s = base + (cd.index ?? 0) + '<![CDATA['.length;
            cdata.push({ start: s, end: s + (cd[1] ?? '').length });
          }
          if (cdata.length > 0) {
            const chars = cdata.flatMap((c) => rawChars(storage, c.start, c.end)).filter((c) => c.c !== '\r');
            const text = chars.map((c) => c.c).join('');
            if (text.trim()) {
              raw.push({ kind: 'code', text, mapped: normalizeMapped(chars), start: cdata[0]!.start, end: cdata.at(-1)!.end, cdata, anchor: i });
            }
          }
        }
        i = macroEnd;
        continue;
      }
      if (!isClose && name === 'ac:link' && !selfClosing) {
        // BUG-05: a link (or @mention) is one atomic inline object. Its visible text joins the block so
        // the agent sees the real sentence, and every character maps to the whole <ac:link>…</ac:link>
        // range, so an edit that touches it is refused (`unsafe` below) instead of duplicating or
        // destroying it.
        const stopAt = storage.indexOf('</ac:link>', close);
        const linkEnd = stopAt < 0 ? n : stopAt + '</ac:link>'.length;
        const text = linkText(storage.slice(close + 1, stopAt < 0 ? n : stopAt));
        for (const c of text) sink().push({ c, from: i, to: linkEnd });
        i = linkEnd;
        continue;
      }
      if (!isClose && name === 'pre' && !selfClosing) {
        const stopAt = storage.indexOf('</pre>', close);
        const end = stopAt < 0 ? n : stopAt;
        if (stack.length === 0) flushLoose();
        const chars = decodedChars(storage, close + 1, end).filter((c) => c.c !== '\r');
        const text = chars.map((c) => c.c).join('');
        if (text.trim()) raw.push({ kind: 'code', text, mapped: normalizeMapped(chars), start: close + 1, end, pre: true, anchor: i });
        i = stopAt < 0 ? n : stopAt + '</pre>'.length;
        continue;
      }
      if (!isClose && !selfClosing && SKIP.has(name)) {
        const stopAt = storage.indexOf(`</${m[2]}>`, close);
        i = stopAt < 0 ? n : stopAt + `</${m[2]}>`.length;
        continue;
      }
      if (CONTAINERS.has(name)) {
        if (!isClose && !selfClosing) {
          if (stack.length === 0) flushLoose();
          else sink().push({ c: '\n', from: i, to: i });
          stack.push({ tag: name, contentStart: close + 1, chars: [] });
        } else if (isClose) {
          let idx = -1;
          for (let k = stack.length - 1; k >= 0; k--) if (stack[k]!.tag === name) { idx = k; break; }
          if (idx >= 0) closeContainer(idx, i, close + 1);
          if (stack.length > 0) sink().push({ c: '\n', from: i, to: i });
        }
      } else if (BREAKS.has(name)) {
        if (stack.length === 0) flushLoose();
        else sink().push({ c: '\n', from: i, to: close + 1 });
      }
      i = close + 1;
      continue;
    }
    if (ch === '&') {
      const m = /^&(#x[0-9a-f]+|#\d+|[a-z]+);/i.exec(storage.slice(i, i + 12));
      const decoded = m ? decodeEntity(m[1]!) : undefined;
      if (m && decoded !== undefined) {
        for (const c of decoded) sink().push({ c, from: i, to: i + m[0].length });
        i += m[0].length;
        continue;
      }
    }
    sink().push({ c: ch, from: i, to: i + 1 });
    i++;
  }
  if (stack.length > 0) closeContainer(0, n, n);
  flushLoose();

  const ranges = sectionRanges(storage);
  raw.sort((a, b) => a.anchor - b.anchor);
  return raw.map(({ anchor, ...b }, k) => {
    let sectionIndex = 0;
    for (let s = 0; s < ranges.length; s++) if (ranges[s]!.start <= anchor) sectionIndex = s;
    return { blockId: `b${k + 1}`, sectionIndex, section: ranges[sectionIndex]!.heading, ...b };
  });
}

/** `B3`, ` b3 `, `3` -> `b3`. Undefined when it is not a block ID. */
export function parseBlockId(v: unknown): string | undefined {
  const s = typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isInteger(v) ? String(v) : '';
  const m = /^b?(\d{1,5})$/i.exec(s);
  return m ? `b${Number(m[1])}` : undefined;
}

/** A short entry for a candidate list: id, kind, section and the first 80 characters. */
export function blockSummary(b: PageBlock): { blockId: string; kind: BlockKind; section: string; text: string } {
  // Code keeps its line breaks, so text copied from a candidate is still verbatim.
  const t = b.kind === 'code' ? b.text : b.mapped.text;
  return { blockId: b.blockId, kind: b.kind, section: b.section, text: t.length > 80 ? `${t.slice(0, 79)}…` : t };
}

// ---------------------------------------------------------------------------
// Targeting: which block a proposal changes
// ---------------------------------------------------------------------------
export type TargetError = 'not_found' | 'ambiguous' | 'spans_blocks' | 'empty';

export interface Target {
  block: PageBlock;
  /** Normalised [start, end) inside `block.mapped.text`; the whole block when undefined. */
  span?: [number, number];
}

export type TargetResult =
  | { ok: true; target: Target }
  | { ok: false; error: TargetError; blockIds?: string[]; candidates?: PageBlock[] };

const headingKey = (h: string) => normalizeWhitespace(h).toLowerCase();

/** Drops the backticks an agent adds around code (the page text has none). */
function stripTicks(s: string): string {
  return normalizeWhitespace(s.replace(/`([^`\n]*)`/g, '$1'));
}

function indexesOf(hay: string, needle: string): number[] {
  const out: number[] = [];
  if (!needle) return out;
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) out.push(i);
  return out;
}

/**
 * Where a normalised `original` sits inside one block: `whole` when it is the block's text, else the
 * spans where it occurs. Backticks the agent added are tolerated when the block text has none.
 */
export function locateInBlock(block: PageBlock, original: string): 'whole' | [number, number][] {
  const t = block.mapped.text;
  const variants = [original];
  if (original.includes('`') && !t.includes('`')) variants.push(stripTicks(original));
  for (const o of variants) {
    if (!o) continue;
    if (o === t) return 'whole';
    const at = indexesOf(t, o);
    if (at.length > 0) return at.map((i) => [i, i + o.length]);
  }
  return [];
}

const MIN_PIECE = 8;

function longestPrefixIn(o: string, t: string): number {
  let lo = 0;
  let hi = o.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (t.includes(o.slice(0, mid))) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function longestSuffixIn(o: string, t: string): number {
  let lo = 0;
  let hi = o.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (t.includes(o.slice(o.length - mid))) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * The blocks a passage runs across, when it is several blocks joined together (with ". ", a newline
 * or anything else between them). Empty when the passage does not look like a join of 2 or more blocks.
 */
export function spannedBlocks(blocks: PageBlock[], original: string): string[] {
  const variants = [normalizeWhitespace(original)];
  if (original.includes('`')) variants.push(stripTicks(original));
  for (const o of variants) {
    if (o.length < MIN_PIECE * 2) continue;
    const cover = new Map<string, number>();
    const add = (id: string, n: number) => cover.set(id, Math.max(cover.get(id) ?? 0, n));
    let best = { prefix: { id: '', n: 0 }, suffix: { id: '', n: 0 } };
    for (const b of blocks) {
      const t = b.mapped.text;
      if (!t) continue;
      if (t.length >= 4 && o.includes(t)) {
        add(b.blockId, t.length);
        continue;
      }
      if (b.kind === 'code') {
        let lines = 0;
        for (const line of b.text.split('\n')) {
          const l = normalizeWhitespace(line);
          if (l.length >= MIN_PIECE && o.includes(l)) lines += l.length;
        }
        if (lines > 0) add(b.blockId, lines);
      }
      const p = longestPrefixIn(o, t);
      if (p >= MIN_PIECE && p > best.prefix.n) best = { ...best, prefix: { id: b.blockId, n: p } };
      const s = longestSuffixIn(o, t);
      if (s >= MIN_PIECE && s > best.suffix.n) best = { ...best, suffix: { id: b.blockId, n: s } };
    }
    if (best.prefix.id) add(best.prefix.id, best.prefix.n);
    if (best.suffix.id) add(best.suffix.id, best.suffix.n);
    // BUG-17: a passage runs across neighbouring blocks. Keep the best run of blocks that are adjacent
    // in document order, so a table cell or code block that only shares a phrase is not listed.
    const idx = blocks.map((b, i) => (cover.has(b.blockId) ? i : -1)).filter((i) => i >= 0);
    let best2: number[] = [];
    let bestScore = 0;
    for (let a = 0; a < idx.length; ) {
      let z = a;
      while (z + 1 < idx.length && idx[z + 1] === idx[z]! + 1) z++;
      const run = idx.slice(a, z + 1);
      const score = run.reduce((n, i) => n + (cover.get(blocks[i]!.blockId) ?? 0), 0);
      if (score > bestScore) {
        best2 = run;
        bestScore = score;
      }
      a = z + 1;
    }
    if (best2.length >= 2 && bestScore >= 0.6 * o.length) return best2.map((i) => blocks[i]!.blockId);
  }
  return [];
}

/**
 * Resolves a proposal to one block. `blockId` wins; `originalText` then narrows it to a span (or must
 * equal the block). Without `blockId`, `originalText` must sit inside exactly one block, looked for in
 * the named section first, then on the whole page.
 */
export function resolveTarget(blocks: PageBlock[], req: { blockId?: string | null; sectionHeading?: string | null; originalText?: string | null }): TargetResult {
  const original = req.originalText ? normalizeWhitespace(stripFence(req.originalText)) : '';
  const want = req.sectionHeading ? headingKey(req.sectionHeading) : '';
  const inSection = want ? blocks.filter((b) => headingKey(b.section) === want) : [];

  if (req.blockId) {
    const block = blocks.find((b) => b.blockId === req.blockId);
    if (!block) return { ok: false, error: 'not_found', candidates: inSection.length > 0 ? inSection : blocks };
    if (!original) return { ok: true, target: { block } };
    const hit = locateInBlock(block, original);
    if (hit === 'whole') return { ok: true, target: { block } };
    if (hit.length === 1) return { ok: true, target: { block, span: hit[0]! } };
    if (hit.length > 1) return { ok: false, error: 'ambiguous', candidates: [block] };
    const sectionBlocks = blocks.filter((b) => b.sectionIndex === block.sectionIndex);
    const spans = spannedBlocks(sectionBlocks, original);
    if (spans.length >= 2) return { ok: false, error: 'spans_blocks', blockIds: spans };
    return { ok: false, error: 'not_found', candidates: sectionBlocks };
  }

  if (!original) return { ok: false, error: 'empty' };
  for (const scope of inSection.length > 0 ? [inSection, blocks] : [blocks]) {
    const hits: Target[] = [];
    for (const b of scope) {
      const hit = locateInBlock(b, original);
      if (hit === 'whole') hits.push({ block: b });
      else for (const span of hit) hits.push({ block: b, span });
    }
    if (hits.length === 1) return { ok: true, target: hits[0]! };
    if (hits.length > 1) return { ok: false, error: 'ambiguous', candidates: [...new Set(hits.map((h) => h.block))] };
  }
  const spans = spannedBlocks(inSection.length > 0 ? inSection : blocks, original);
  if (spans.length >= 2) return { ok: false, error: 'spans_blocks', blockIds: spans };
  if (inSection.length > 0) {
    const pageSpans = spannedBlocks(blocks, original);
    if (pageSpans.length >= 2) return { ok: false, error: 'spans_blocks', blockIds: pageSpans };
  }
  return { ok: false, error: 'not_found', candidates: inSection.length > 0 ? inSection : blocks };
}

/** The text a stored proposal records as its original: the whole block, or the span the agent named. */
export function targetOriginal(t: Target): string {
  return t.span ? t.block.mapped.text.slice(t.span[0], t.span[1]) : t.block.text;
}

/** True when the proposal would change nothing. */
export function isNoOp(t: Target, proposedText: string): boolean {
  const before = normalizeWhitespace(targetOriginal(t));
  const p = stripFence(proposedText);
  return before === normalizeWhitespace(p) || (t.block.kind !== 'code' && before === stripTicks(p));
}

// ---------------------------------------------------------------------------
// Applying
// ---------------------------------------------------------------------------
export type BlockEditResult = { ok: true; storage: string; kind: 'code' | 'text'; blockId: string } | { ok: false; error: 'not_found' | 'ambiguous' | 'unsupported_span' };

function splice(storage: string, start: number, end: number, text: string): string {
  return storage.slice(0, start) + text + storage.slice(end);
}

/** Replaces normalised [s, e) of a prose block with `text`, touching only the characters that differ. */
function editProse(storage: string, block: PageBlock, s: number, e: number, text: string): string | undefined {
  const m = block.mapped;
  const old = m.text.slice(s, e);
  let p = 0;
  while (p < old.length && p < text.length && old[p] === text[p]) p++;
  let q = 0;
  while (q < old.length - p && q < text.length - p && old[old.length - 1 - q] === text[text.length - 1 - q]) q++;
  const ns = s + p;
  const ne = e - q;
  const mid = text.slice(p, text.length - q);
  const safe = (r: [number, number] | undefined): r is [number, number] => !!r && !INLINE_OBJECT.test(storage.slice(r[0], r[1]));
  if (ns === ne) {
    // An insertion between two characters of one link or mention would land outside it: refuse.
    if (ns > 0 && ns < m.text.length && m.from[ns - 1] === m.from[ns] && m.to[ns - 1] === m.to[ns] && INLINE_OBJECT.test(storage.slice(m.from[ns]!, m.to[ns]!))) {
      return undefined;
    }
    const at = ns > 0 ? m.to[ns - 1]! : m.from[0]!;
    return splice(storage, at, at, escapeXml(mid));
  }
  const narrow = balance(storage, m.from[ns]!, m.to[ne - 1]!, block.start, block.end);
  if (safe(narrow)) return splice(storage, narrow[0], narrow[1], escapeXml(mid));
  // The changed characters straddle formatting: rewrite the block's text as plain text instead.
  const whole = balance(storage, m.from[0]!, m.to[m.to.length - 1]!, block.start, block.end);
  if (!safe(whole)) return undefined;
  return splice(storage, whole[0], whole[1], escapeXml(m.text.slice(0, s) + text + m.text.slice(e)));
}

/** Applies a resolved target. Code: CDATA (or escaped `<pre>`) text, raw. Prose: escaped, one line. */
export function editBlock(storage: string, t: Target, proposedText: string): BlockEditResult {
  const { block } = t;
  const proposed = stripFence(proposedText);
  if (block.kind === 'code') {
    const body = block.pre ? escapeXml(proposed) : cdataSafe(proposed);
    if (!t.span) return { ok: true, kind: 'code', blockId: block.blockId, storage: splice(storage, block.start, block.end, body) };
    const [s, e] = t.span;
    return { ok: true, kind: 'code', blockId: block.blockId, storage: splice(storage, block.mapped.from[s]!, block.mapped.to[e - 1]!, body) };
  }
  const line = block.mapped.text.includes('`') ? normalizeWhitespace(proposed) : stripTicks(proposed);
  const [s, e] = t.span ?? [0, block.mapped.text.length];
  const out = editProse(storage, block, s, e, line);
  return out === undefined ? { ok: false, error: 'unsupported_span' } : { ok: true, kind: 'text', blockId: block.blockId, storage: out };
}

/**
 * Applies a stored proposal at accept time. The block is found by ID and must still hold the stored
 * original (the whole block, or the span exactly once). If the IDs moved because the page was edited,
 * the one block that still holds it is used; none is `not_found`, several is `ambiguous`.
 */
export function applyBlockEdit(storage: string, req: { blockId: string; sectionHeading?: string | null; originalText: string; proposedText: string }): BlockEditResult {
  const blocks = extractBlocks(storage);
  const original = normalizeWhitespace(stripFence(req.originalText));
  if (!original) return { ok: false, error: 'not_found' };
  const fits = (b: PageBlock): Target | undefined => {
    const hit = locateInBlock(b, original);
    if (hit === 'whole') return { block: b };
    return hit.length === 1 ? { block: b, span: hit[0]! } : undefined;
  };
  const byId = blocks.find((b) => b.blockId === req.blockId);
  let target = byId && fits(byId);
  if (!target) {
    const all = blocks.map(fits).filter((x): x is Target => !!x);
    const want = req.sectionHeading ? headingKey(req.sectionHeading) : '';
    const sameSection = all.filter((x) => headingKey(x.block.section) === want);
    const pool = sameSection.length > 0 ? sameSection : all;
    if (pool.length === 0) return { ok: false, error: 'not_found' };
    if (pool.length > 1) return { ok: false, error: 'ambiguous' };
    target = pool[0]!;
  }
  return editBlock(storage, target, req.proposedText);
}
