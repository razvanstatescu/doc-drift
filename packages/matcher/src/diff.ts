/** The removed and added lines of one file in a unified diff. */
export interface FileDiff {
  /** Path after the change (the old path for a deleted file). */
  path: string;
  oldPath?: string;
  removed: string[];
  added: string[];
  /** False when the diff was cut off inside this file's last hunk (the relay trims at 150 KB). */
  complete: boolean;
}

const HUNK_HEADER = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/;
const GIT_HEADER = /^diff --git a\/(.+) b\/(.+)$/;
/** `diff --git "a/caf\303\251.sh" "b/caf\303\251.sh"` (core.quotePath), either side quoted. */
const GIT_HEADER_QUOTED = /^diff --git ("a\/(?:[^"\\]|\\.)*"|a\/\S+) ("b\/(?:[^"\\]|\\.)*"|b\/\S+)$/;

const C_ESCAPES: Readonly<Record<string, number>> = { n: 10, t: 9, r: 13, '"': 34, '\\': 92, a: 7, b: 8, f: 12, v: 11 };

/**
 * Decodes a git C-quoted path (`"caf\303\251.sh"` → `café.sh`): octal escapes are UTF-8 bytes (BUG-19).
 * Unquoted input is returned unchanged.
 */
export function unquoteGitPath(p: string): string {
  if (p.length < 2 || p[0] !== '"' || p[p.length - 1] !== '"') return p;
  const bytes: number[] = [];
  const body = p.slice(1, -1);
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (c === '\\' && i + 1 < body.length) {
      const oct = /^[0-7]{3}/.exec(body.slice(i + 1, i + 4));
      if (oct) {
        bytes.push(parseInt(oct[0], 8));
        i += 3;
        continue;
      }
      const e = C_ESCAPES[body[i + 1]!];
      if (e !== undefined) {
        bytes.push(e);
        i++;
        continue;
      }
    }
    for (const b of Buffer.from(c, 'utf8')) bytes.push(b);
  }
  return Buffer.from(bytes).toString('utf8');
}

function stripPrefix(path: string): string | undefined {
  const p = unquoteGitPath(path.replace(/\t.*$/, ''));
  if (p === '/dev/null') return undefined;
  return p.replace(/^[ab]\//, '');
}

/**
 * Parses a git-style unified diff (Bitbucket `/diff`) into per-file removed and added lines.
 * Hunk line counts are tracked, so content lines that start with `---` or `+++` are read correctly.
 * Tolerates a diff truncated mid-hunk.
 */
export function parseUnifiedDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = [];
  let current: FileDiff | undefined;
  let oldLeft = 0;
  let newLeft = 0;

  const start = (path: string, oldPath?: string): FileDiff => {
    const file: FileDiff = { path, ...(oldPath !== undefined && oldPath !== path && { oldPath }), removed: [], added: [], complete: true };
    files.push(file);
    return file;
  };

  for (const line of diff.split(/\r?\n/)) {
    if (current && (oldLeft > 0 || newLeft > 0)) {
      const marker = line[0];
      if (marker === '-') {
        current.removed.push(line.slice(1));
        oldLeft--;
        continue;
      }
      if (marker === '+') {
        current.added.push(line.slice(1));
        newLeft--;
        continue;
      }
      if (marker === ' ' || line === '') {
        oldLeft--;
        newLeft--;
        continue;
      }
      if (marker === '\\') continue;
      // Anything else ends the hunk early; fall through and read it as a header.
      oldLeft = 0;
      newLeft = 0;
    }

    const quoted = line.includes('"') ? GIT_HEADER_QUOTED.exec(line) : null;
    const git = quoted ? null : GIT_HEADER.exec(line);
    if (quoted?.[1] && quoted[2]) {
      current = start(stripPrefix(quoted[2]) ?? '', stripPrefix(quoted[1]));
    } else if (git?.[1] && git[2]) {
      current = start(git[2], git[1]);
    } else if (line.startsWith('rename from ') && current) {
      current.oldPath = unquoteGitPath(line.slice('rename from '.length));
    } else if (line.startsWith('rename to ') && current) {
      current.path = unquoteGitPath(line.slice('rename to '.length));
    } else if (line.startsWith('--- ')) {
      const oldPath = stripPrefix(line.slice(4));
      const seenHunk = current && (current.removed.length > 0 || current.added.length > 0);
      if (!current || seenHunk) current = start(oldPath ?? '', oldPath);
    } else if (line.startsWith('+++ ') && current) {
      const newPath = stripPrefix(line.slice(4));
      if (newPath !== undefined) current.path = newPath;
      else if (current.oldPath !== undefined) current.path = current.oldPath;
    } else if (current) {
      const hunk = HUNK_HEADER.exec(line);
      if (hunk) {
        oldLeft = hunk[1] === undefined ? 1 : Number(hunk[1]);
        newLeft = hunk[2] === undefined ? 1 : Number(hunk[2]);
      }
    }
  }
  if (current && (oldLeft > 0 || newLeft > 0)) current.complete = false;
  for (const f of files) if (f.oldPath === f.path) delete f.oldPath;
  return files;
}
