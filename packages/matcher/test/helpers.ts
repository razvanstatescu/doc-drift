import type { BitbucketChangeRecord, Binding, ChangedFile } from '@dds/shared';

export const REPO = 'nano-soft-dev/payments-api';

export function change(files: ChangedFile[], extra: Partial<BitbucketChangeRecord> = {}): BitbucketChangeRecord {
  return {
    source: 'bitbucket',
    workspace: 'nano-soft-dev',
    repoSlug: 'payments-api',
    repoUuid: '{6f1d1c3e-0b8a-4e57-9f0a-2d5b1c7e4820}',
    prId: 482,
    title: 'Change',
    author: 'Sam Rivera',
    mergeCommit: 'abc123',
    sourceBranch: 'feature/x',
    destinationBranch: 'main',
    defaultBranch: 'main',
    files,
    ...extra,
  };
}

export function modified(path: string, linesAdded: number, linesRemoved: number): ChangedFile {
  return { status: 'modified', path, linesAdded, linesRemoved };
}

export function binding(id: string, anchorType: Binding['anchorType'], pattern?: string, extra: Partial<Binding> = {}): Binding {
  return { id, pageId: `page-${id}`, anchorType, repo: REPO, ...(pattern !== undefined && { pattern }), weight: 'normal', ...extra };
}

/** Builds a git-style diff for one file from removed and added lines. */
export function fileDiff(path: string, removed: string[], added: string[], context: string[] = []): string {
  const header = `diff --git a/${path} b/${path}\nindex 1111111..2222222 100644\n--- a/${path}\n+++ b/${path}\n`;
  const hunk = `@@ -1,${removed.length + context.length} +1,${added.length + context.length} @@\n`;
  const body = [...context.map((l) => ` ${l}`), ...removed.map((l) => `-${l}`), ...added.map((l) => `+${l}`)].join('\n');
  return `${header}${hunk}${body}\n`;
}
