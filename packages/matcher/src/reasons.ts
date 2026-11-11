import type { ChangedFile } from '@dds/shared';

/** Reason strings for drift events: calm, specific, numbers as digits. Never says a page is wrong. */

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function listWithMore(items: readonly string[], noun: string, shown = 2): string {
  if (items.length <= shown) return items.join(' and ');
  return `${items.slice(0, shown).join(', ')} and ${count(items.length - shown, `more ${noun}`)}`;
}

export function fileReason(file: ChangedFile, cosmetic: boolean): string {
  switch (file.status) {
    case 'renamed':
      return `${file.oldPath ?? file.path} renamed to ${file.path}`;
    case 'removed':
      return `${file.path} removed`;
    case 'added':
      return `${file.path} added (${count(file.linesAdded, 'line')})`;
    case 'modified':
      if (cosmetic) return `${file.path} changed in comments or whitespace only`;
      return `${file.path} changed: ${count(file.linesAdded, 'line')} added, ${file.linesRemoved} removed`;
  }
}

export function repoWideReason(fileCount: number, repoSlug: string): string {
  return `${count(fileCount, 'file')} changed in ${repoSlug}`;
}

export function moreFilesReason(extra: number): string {
  return `${count(extra, 'more anchored file')} changed`;
}

export function identifierReason(identifiers: readonly string[], changeLabel: string): string {
  return `Page mentions ${listWithMore(identifiers, 'identifier')}, removed in ${changeLabel}`;
}

export function snippetReason(lines: number, changeLabel: string): string {
  return lines === 1
    ? `1 line in this page's code blocks was removed in ${changeLabel}`
    : `${lines} lines in this page's code blocks were removed in ${changeLabel}`;
}

export function dampenerReason(dismissals: number, weight: number): string {
  return `Anchor weight lowered to ${weight.toFixed(1)} after ${count(dismissals, 'dismissal')}`;
}
