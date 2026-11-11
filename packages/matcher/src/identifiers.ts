import type { FileDiff } from './diff.js';

/** Identifier candidates: 4+ characters, starting with a letter or underscore (detection.md). */
const TOKEN = /[A-Za-z_][A-Za-z0-9_.-]{3,}/g;
/** Long CLI flags (`--count`, `--cleanup-on-fail`), kept with their dashes so they are code-shaped. */
const FLAG = /(?<![\w-])--[A-Za-z][A-Za-z0-9-]*[A-Za-z0-9]/g;
/**
 * HTTP route paths of 2+ segments (`/v1/refunds`, `/v2/charges/:id`), not preceded by a word character,
 * `.`, `:` or `/`, so relative imports (`../db/pool.js`) and URLs (`https://host/x/y`) are skipped.
 */
const ROUTE = /(?<![\w.:/])\/[A-Za-z0-9_{}:-]+(?:\/[A-Za-z0-9_{}:.-]+)+/g;

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
  // SQL and shell keywords: ALL CAPS, so code-shaped, but they are language, not identifiers (D26).
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'RETURNING', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
  'OUTER', 'ORDER', 'GROUP', 'LIMIT', 'OFFSET', 'HAVING', 'UNION', 'CREATE', 'TABLE', 'INDEX', 'ALTER', 'DROP',
  'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE', 'BEGIN', 'COMMIT', 'ROLLBACK', 'COUNT', 'COALESCE', 'DISTINCT', 'LIKE',
  'BETWEEN', 'EXISTS', 'CONFLICT', 'NOTHING', 'SKIP', 'LOCKED', 'INTERVAL', 'PRIMARY', 'FOREIGN', 'REFERENCES',
  'DEFAULT', 'UNIQUE', 'CASCADE', 'ASC', 'DESC', 'EOF',
]);

/**
 * Splits text into identifier-like tokens, trimming trailing `.` and `-` (sentence punctuation).
 * Long CLI flags (`--count`) and HTTP route paths (`/v1/refunds`) are also returned whole, after the other tokens.
 */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const [raw] of text.matchAll(TOKEN)) {
    const token = raw.replace(/[.-]+$/, '');
    if (token.length >= 4) out.push(token);
  }
  for (const [flag] of text.matchAll(FLAG)) if (flag.length >= 5) out.push(flag);
  for (const [raw] of text.matchAll(ROUTE)) {
    const route = raw.replace(/[.:-]+$/, '');
    if (/[A-Za-z]{3}/.test(route)) out.push(route);
  }
  return out;
}

/**
 * Code-shaped identifiers are unlikely to be plain prose: they contain `_`, a digit, an inner `.` or `-`,
 * a lower-to-upper case change, are ALL CAPS, or are a `--flag` or `/route/path`. These are matched against all page text.
 */
export function isCodeShaped(token: string): boolean {
  return /[_\d./-]/.test(token) || /[a-z][A-Z]/.test(token) || /^[A-Z]{4,}$/.test(token);
}

/** Plain lowercase words (`timeout`, `wait`) are matched only against the page's code. */
function isPlainWord(token: string): boolean {
  return /^[a-z]+$/.test(token);
}

/**
 * An added line that only tells the user an identifier is gone (`--count) echo "--count was renamed to --replicas"`).
 * Such a shim does not keep the identifier in use, so its tokens don't cancel the removal: a page that still
 * documents `--count` should hear that the PR removed it.
 */
const REMOVAL_NOTICE = /\b(?:renamed|deprecated|obsolete|no longer (?:supported|used|available|exists?|accepted)|(?:was|were|has been|have been) removed|replaced by)\b/i;

export function isRemovalNotice(line: string): boolean {
  return REMOVAL_NOTICE.test(line);
}

export interface RemovedIdentifiers {
  /** Matched against all page text. */
  codeShaped: ReadonlySet<string>;
  /**
   * Plain lowercase words (`router`, `wait`). Not evidence by default (D26): a change-local diff cannot
   * tell whether the word still lives elsewhere in the repo. Matched against page code only, and only
   * when `MatcherConfig.plainWordIdentifiers` is on.
   */
  plain: ReadonlySet<string>;
}

/**
 * Identifiers on removed (`-`) lines that no added (`+`) line still uses, across the whole change.
 * Change-wide, so a rename that moves code between files still counts as one change. Added lines that are
 * removal notices ({@link isRemovalNotice}: "was renamed to", "deprecated", "no longer supported") don't count
 * as uses, so a flag kept only to print "--count was renamed to --replicas" still counts as removed.
 *
 * Files in `deletedPaths` add no removed identifiers (D26): every token of a deleted file is on a `-`
 * line, yet most of them (`charge_id`, `pool.query`) live on elsewhere in the repo. The deletion itself
 * is already scored at full magnitude through path anchors, and what it really retires usually also
 * leaves a modified file (a flag in config, a route registration).
 */
export function removedIdentifiers(diffs: readonly FileDiff[], deletedPaths: ReadonlySet<string> = new Set()): RemovedIdentifiers {
  const added = new Set(diffs.flatMap((d) => d.added.filter((line) => !isRemovalNotice(line)).flatMap(tokenize)));
  const codeShaped = new Set<string>();
  const plain = new Set<string>();
  for (const token of diffs.filter((d) => !deletedPaths.has(d.path)).flatMap((d) => d.removed.flatMap(tokenize))) {
    if (added.has(token) || STOPWORDS.has(token)) continue;
    if (isCodeShaped(token)) codeShaped.add(token);
    else if (isPlainWord(token)) plain.add(token);
  }
  return { codeShaped, plain };
}
