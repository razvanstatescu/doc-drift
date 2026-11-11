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

function stripPrefix(path: string): string | undefined {
  if (path === '/dev/null') return undefined;
  return path.replace(/^[ab]\//, '').replace(/\t.*$/, '');
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

    const git = GIT_HEADER.exec(line);
    if (git?.[1] && git[2]) {
      current = start(git[2], git[1]);
    } else if (line.startsWith('rename from ') && current) {
      current.oldPath = line.slice('rename from '.length);
    } else if (line.startsWith('rename to ') && current) {
      current.path = line.slice('rename to '.length);
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
