import { describe, expect, it } from 'vitest';
import { parseUnifiedDiff } from '../src/index.js';

describe('parseUnifiedDiff', () => {
  it('reads renames, deletions and new files', () => {
    const diff = [
      'diff --git a/scripts/rollback.sh b/scripts/rollback-v2.sh',
      'similarity index 56%',
      'rename from scripts/rollback.sh',
      'rename to scripts/rollback-v2.sh',
      '--- a/scripts/rollback.sh',
      '+++ b/scripts/rollback-v2.sh',
      '@@ -1,2 +1,2 @@',
      ' #!/usr/bin/env bash',
      '-TIMEOUT="${ROLLBACK_TIMEOUT:-300}"',
      '+TIMEOUT="${ROLLBACK_TIMEOUT_SECS:-300}"',
      'diff --git a/src/old.ts b/src/old.ts',
      'deleted file mode 100644',
      '--- a/src/old.ts',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-export const x = 1;',
      'diff --git a/src/new.ts b/src/new.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/src/new.ts',
      '@@ -0,0 +1 @@',
      '+export const y = 2;',
      '',
    ].join('\n');
    expect(parseUnifiedDiff(diff)).toEqual([
      {
        path: 'scripts/rollback-v2.sh',
        oldPath: 'scripts/rollback.sh',
        removed: ['TIMEOUT="${ROLLBACK_TIMEOUT:-300}"'],
        added: ['TIMEOUT="${ROLLBACK_TIMEOUT_SECS:-300}"'],
        complete: true,
      },
      { path: 'src/old.ts', removed: ['export const x = 1;'], added: [], complete: true },
      { path: 'src/new.ts', removed: [], added: ['export const y = 2;'], complete: true },
    ]);
  });

  it('reads content lines that look like headers using the hunk counts', () => {
    const diff = ['--- a/q.sql', '+++ b/q.sql', '@@ -1,2 +1,2 @@', '--- old comment', '+++ new', ' select 1;', '-- x', ''].join('\n');
    const [file] = parseUnifiedDiff(diff);
    expect(file).toMatchObject({ path: 'q.sql', removed: ['-- old comment'], added: ['++ new'], complete: true });
  });

  it('marks a diff cut off mid-hunk as incomplete', () => {
    const diff = ['diff --git a/a.ts b/a.ts', '--- a/a.ts', '+++ b/a.ts', '@@ -1,5 +1,5 @@', '-one', '+two'].join('\n');
    expect(parseUnifiedDiff(diff)[0]?.complete).toBe(false);
  });

  it('returns nothing for an empty diff', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
  });
});
