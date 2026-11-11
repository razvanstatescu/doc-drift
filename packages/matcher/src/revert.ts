import type { RevertInfo } from './types.js';

const REVERT_TITLE = /^Revert "(.*)"(?:\s*\(pull request #\d+\))?$/s;
const PR_NUMBER = /(?:pull request |PR )?#(\d+)/;

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
  const pr = PR_NUMBER.exec(title)?.[1];
  return { revertedTitle: inner.replace(/\s*\((?:pull request |PR )?#\d+\)$/, ''), ...(pr !== undefined && { revertedPrId: Number(pr) }) };
}
