import type { FileDiff } from './diff.js';

/** Whole-line comments in shell, YAML, Python, JS/TS, CSS, SQL and HTML. A `#!` shebang is not a comment. */
const COMMENT_LINE = /^(?:#(?!!)|\/\/|\/\*|\*|--\s|<!--)/;

function isCommentOrBlank(line: string): boolean {
  const t = line.trim();
  return t === '' || COMMENT_LINE.test(t);
}

function squash(line: string): string {
  return line.replace(/\s+/g, '');
}

/**
 * True when every changed line in a complete file diff is blank, a comment, or the same code
 * with different whitespace (reformatting). Such a change rarely invalidates a page.
 */
export function isCosmeticOnly(diff: FileDiff): boolean {
  if (!diff.complete || diff.removed.length + diff.added.length === 0) return false;
  const removed = new Set(diff.removed.map(squash));
  const added = new Set(diff.added.map(squash));
  const cosmetic = (line: string, otherSide: Set<string>) => isCommentOrBlank(line) || otherSide.has(squash(line));
  return diff.removed.every((l) => cosmetic(l, added)) && diff.added.every((l) => cosmetic(l, removed));
}
