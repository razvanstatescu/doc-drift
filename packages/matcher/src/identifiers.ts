import type { FileDiff } from './diff.js';

/** Identifier candidates: 4+ characters, starting with a letter or underscore (detection.md). */
const TOKEN = /[A-Za-z_][A-Za-z0-9_.-]{3,}/g;

/**
 * Lowercase words that are too common in code to be evidence on their own.
 * Code-shaped identifiers (env vars, camelCase, dotted or dashed names) skip this list
 * except for the few upper-case entries.
 */
const STOPWORDS = new Set([
  'about', 'after', 'also', 'args', 'async', 'await', 'before', 'bool', 'boolean', 'break', 'case', 'catch',
  'class', 'const', 'continue', 'data', 'default', 'done', 'echo', 'elif', 'else', 'enum', 'error', 'esac',
  'exit', 'export', 'extends', 'false', 'file', 'final', 'finally', 'from', 'func', 'function', 'have', 'here',
  'implements', 'import', 'interface', 'into', 'item', 'items', 'just', 'kind', 'list', 'local', 'make',
  'module', 'name', 'none', 'null', 'number', 'object', 'only', 'package', 'print', 'private', 'protected',
  'public', 'raise', 'readonly', 'require', 'result', 'return', 'self', 'shift', 'some', 'static', 'string',
  'super', 'switch', 'that', 'then', 'there', 'they', 'this', 'throw', 'true', 'type', 'undefined', 'unless',
  'until', 'used', 'uses', 'using', 'value', 'values', 'void', 'what', 'when', 'where', 'which', 'while',
  'will', 'with', 'yield', 'your',
  'TODO', 'FIXME', 'NOTE', 'TRUE', 'FALSE', 'NULL', 'NONE', 'HTTP', 'HTTPS', 'JSON', 'YAML', 'HTML',
  'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS',
]);

/** Splits text into identifier-like tokens, trimming trailing `.` and `-` (sentence punctuation). */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const [raw] of text.matchAll(TOKEN)) {
    const token = raw.replace(/[.-]+$/, '');
    if (token.length >= 4) out.push(token);
  }
  return out;
}

/**
 * Code-shaped identifiers are unlikely to be plain prose: they contain `_`, a digit, an inner `.` or `-`,
 * a lower-to-upper case change, or are ALL CAPS. These are matched against all page text.
 */
export function isCodeShaped(token: string): boolean {
  return /[_\d.-]/.test(token) || /[a-z][A-Z]/.test(token) || /^[A-Z]{4,}$/.test(token);
}

/** Plain lowercase words (`timeout`, `wait`) are matched only against the page's code. */
function isPlainWord(token: string): boolean {
  return /^[a-z]+$/.test(token);
}

export interface RemovedIdentifiers {
  /** Matched against all page text. */
  codeShaped: ReadonlySet<string>;
  /** Matched against page code blocks and inline code only. */
  plain: ReadonlySet<string>;
}

/**
 * Identifiers on removed (`-`) lines that no added (`+`) line still uses, across the whole change.
 * Change-wide, so a rename that moves code between files still counts as one change.
 */
export function removedIdentifiers(diffs: readonly FileDiff[]): RemovedIdentifiers {
  const added = new Set(diffs.flatMap((d) => d.added.flatMap(tokenize)));
  const codeShaped = new Set<string>();
  const plain = new Set<string>();
  for (const token of diffs.flatMap((d) => d.removed.flatMap(tokenize))) {
    if (added.has(token) || STOPWORDS.has(token)) continue;
    if (isCodeShaped(token)) codeShaped.add(token);
    else if (isPlainWord(token)) plain.add(token);
  }
  return { codeShaped, plain };
}
