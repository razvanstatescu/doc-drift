// Deterministic page fixes and section hits. Pure: no Forge imports, unit-tested (test/phase2.test.ts).
//
// - R-4 rename quick fix: when a PR renamed a file the page names, propose "replace the old path with the
//   new path" in each block that names it. No AI. Applied through the same block edit as an accepted
//   draft (blocks.ts), so links, mentions and formatting around the path stay.
// - R-5 section hits: which sections (and blocks) of a page name a change, for check-page-freshness.
import { editBlock, extractBlocks, type BlockKind, type PageBlock } from './blocks';
import { tokenRegExp } from './review';

export interface QuickFixBlock {
  blockId: string;
  kind: BlockKind;
  section: string;
  /** The block's current text, verbatim (as get-drift-context shows it). */
  text: string;
  /** The same text with the old path (and a distinctive old file name) replaced. */
  proposedText: string;
  occurrences: number;
}

export interface RenameQuickFix {
  eventId: string;
  /** Display ref: `PR #482`. */
  ref: string;
  from: string;
  to: string;
  blocks: QuickFixBlock[];
}

export interface RenameEventInput {
  eventId: string;
  ref: string;
  files: { path: string; status: string; oldPath?: string }[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const basename = (p: string) => p.split('/').at(-1) ?? p;

/** A file name not inside a longer path (`rollback.sh`, not `other/rollback.sh` or `rollback.sh.bak`). */
function bareNameRegExp(name: string): RegExp {
  return new RegExp(`(?<![A-Za-z0-9_./-])${escapeRegExp(name)}(?![A-Za-z0-9_]|[./-][A-Za-z0-9_])`, 'g');
}

/** The (pattern, replacement) pairs for one rename: the full path, then a distinctive file name. */
export function renamePairs(from: string, to: string): [RegExp, string][] {
  const pairs: [RegExp, string][] = [[new RegExp(tokenRegExp(from).source, 'g'), to]];
  const a = basename(from);
  const b = basename(to);
  if (a !== b && a !== from && a.length >= 5 && a.includes('.')) pairs.push([bareNameRegExp(a), b]);
  return pairs;
}

/** Applies the pairs to a text; returns the new text and how many replacements were made. */
export function replaceRename(text: string, pairs: [RegExp, string][]): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const [re, rep] of pairs) {
    out = out.replace(re, () => {
      count++;
      return rep;
    });
  }
  return { text: out, count };
}

/**
 * Rename quick fixes for a page's open events. One per (from, to), on the first event that carries it;
 * only blocks whose edit is safe (a path inside link text is left alone) are listed, and a fix with no
 * such block is dropped.
 */
export function renameQuickFixes(storage: string, events: RenameEventInput[], blocks: PageBlock[] = extractBlocks(storage)): RenameQuickFix[] {
  const out: RenameQuickFix[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    for (const f of e.files) {
      if (f.status !== 'renamed' || !f.oldPath || f.oldPath === f.path) continue;
      const key = `${f.oldPath}\n${f.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const pairs = renamePairs(f.oldPath, f.path);
      const hits: QuickFixBlock[] = [];
      for (const b of blocks) {
        const r = replaceRename(b.text, pairs);
        if (r.count === 0 || r.text === b.text) continue;
        const dry = editBlock(storage, { block: b }, r.text);
        if (!dry.ok) continue;
        hits.push({ blockId: b.blockId, kind: b.kind, section: b.section, text: b.text, proposedText: r.text, occurrences: r.count });
      }
      if (hits.length > 0) out.push({ eventId: e.eventId, ref: e.ref, from: f.oldPath, to: f.path, blocks: hits });
    }
  }
  return out;
}

/** `Doc Drift: renamed scripts/rollback.sh to scripts/rollback-v2.sh for PR #482` (at most 255 characters). */
export function renameVersionMessage(from: string, to: string, ref: string): string {
  const full = `Doc Drift: renamed ${from} to ${to} for ${ref}`;
  if (full.length <= 255) return full;
  return `Doc Drift: renamed ${basename(from)} to ${basename(to)} for ${ref}`.slice(0, 255);
}

export interface SectionHit {
  heading: string;
  /** Blocks of the section that name a token (get-drift-context IDs). */
  blockIds: string[];
  matchedTokens: string[];
}

/** The sections whose blocks name any token, in page order, at most `limit`. */
export function sectionHits(storage: string, tokens: string[], limit = 5): SectionHit[] {
  if (!storage || tokens.length === 0) return [];
  const res = tokens.map((t) => ({ t, re: tokenRegExp(t) }));
  const bySection = new Map<number, PageBlock[]>();
  for (const b of extractBlocks(storage)) bySection.set(b.sectionIndex, [...(bySection.get(b.sectionIndex) ?? []), b]);
  const out: SectionHit[] = [];
  for (const group of bySection.values()) {
    const matched = res.filter(({ re }) => group.some((b) => re.test(b.text))).map(({ t }) => t);
    if (matched.length === 0) continue;
    const blockIds = group.filter((b) => res.some(({ re }) => re.test(b.text))).map((b) => b.blockId);
    out.push({ heading: group[0]!.section, blockIds, matchedTokens: matched });
    if (out.length >= limit) break;
  }
  return out;
}
