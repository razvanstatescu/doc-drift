import type { RevertInfo } from './types.js';

const REVERT_TITLE = /^Revert "(.*)"(?:\s*\((?:pull request |PR )#\d+\))?$/s;
/**
 * The reverted PR's number: only from a trailing `(pull request #N)` or `(PR #N)` after the closing
 * quote, never from a `#N` inside the original title (BUG-03: `Revert "Fix #77: x" (pull request #10)`).
 */
const INNER_SUFFIX = /\((?:pull request |PR )?#(\d+)\)$/;
const PR_SUFFIX = /"\s*\((?:pull request |PR )#(\d+)\)\s*$/;

/**
 * Detects a revert PR from its title (`Revert "..."`, as Bitbucket and git write it).
 * A revert of a revert re-applies the original change, so it is scored as a normal change.
 */
export function detectRevert(title: string): RevertInfo | undefined {
  let inner = title.trim();
  let depth = 0;
  for (let m = REVERT_TITLE.exec(inner); m; m = REVERT_TITLE.exec(inner)) {
    inner = (m[1] ?? '').trim();
    depth++;
  }
  if (depth % 2 === 0) return undefined;
  // Else a squash-merge suffix at the very end of the original title: `Revert "Raise max (#490)"`.
  const pr = PR_SUFFIX.exec(title.trim())?.[1] ?? INNER_SUFFIX.exec(inner)?.[1];
  return { revertedTitle: inner.replace(/\s*\((?:pull request |PR )?#\d+\)$/, ''), ...(pr !== undefined && { revertedPrId: Number(pr) }) };
}
