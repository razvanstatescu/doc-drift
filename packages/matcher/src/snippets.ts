import { createHash } from 'node:crypto';
import type { FileDiff } from './diff.js';

/** Lines shorter than this after normalizing (`fi`, `}`, `done`) are too generic to hash. */
const MIN_SNIPPET_LENGTH = 5;

/** Trims, drops a leading shell prompt (`$ `), and collapses runs of whitespace. */
export function normalizeLine(line: string): string {
  return line.trim().replace(/^[$>]\s+/, '').replace(/\s+/g, ' ');
}

/** Hash of a normalized line, or undefined when the line is too short or has no letters. */
export function hashLine(line: string): string | undefined {
  const normalized = normalizeLine(line);
  if (normalized.length < MIN_SNIPPET_LENGTH || !/[A-Za-z]/.test(normalized)) return undefined;
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/** Hashes of every line in the given code blocks. */
export function codeLineHashes(codeBlocks: readonly string[]): Set<string> {
  const hashes = new Set<string>();
  for (const block of codeBlocks) {
    for (const line of block.split('\n')) {
      const h = hashLine(line);
      if (h) hashes.add(h);
    }
  }
  return hashes;
}

/** Hashes of removed lines that the change did not re-add elsewhere (moved lines are not evidence). */
export function removedLineHashes(diffs: readonly FileDiff[]): Set<string> {
  const added = new Set(diffs.flatMap((d) => d.added.map(normalizeLine)));
  const hashes = new Set<string>();
  for (const line of diffs.flatMap((d) => d.removed)) {
    if (added.has(normalizeLine(line))) continue;
    const h = hashLine(line);
    if (h) hashes.add(h);
  }
  return hashes;
}
