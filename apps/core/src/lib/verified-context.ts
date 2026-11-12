// R-8 verified context: how many changes touched a page's anchors since it was verified, and how many
// of those flagged it. Used by the review panel and the Verified byline tooltip.
import type { Binding } from '@dds/shared';
import { GlobCache, pathMatchStrength } from '@dds/matcher';
import { changesSince, eventChangesSince } from './db';
import { fromSqlDate } from './ingest-rules';

export const shortRepo = (r: string | null | undefined) => (r ?? '').toLowerCase().split('/').at(-1) ?? '';

/**
 * R-8: changes to the page's anchored code or Jira work since it was verified (`changesSince`), and how
 * many of them flagged it (`relevant`). "12 changes since, none relevant" shows the watch is working.
 */
export async function verifiedContextFor(pageId: string, bindings: Binding[], verifiedAtSql: string): Promise<{ changesSince: number; relevant: number; since: number | null }> {
  const code = bindings.filter((b) => b.anchorType === 'path' || b.anchorType === 'glob' || b.anchorType === 'repo');
  const jiraKeys = [...new Set(bindings.filter((b) => b.anchorType === 'jira' && b.jiraKey).map((b) => b.jiraKey!))];
  const repos = [...new Map(code.filter((b) => b.repo).map((b) => {
    const r = b.repo!.toLowerCase();
    return [r, r.includes('/') ? { full: r, slug: shortRepo(r) } : { full: null, slug: r }] as const;
  })).values()];
  const since = fromSqlDate(verifiedAtSql) ?? null;
  if (repos.length === 0 && jiraKeys.length === 0) return { changesSince: 0, relevant: 0, since };
  const [changes, flagged] = await Promise.all([changesSince(repos, jiraKeys, verifiedAtSql), eventChangesSince(pageId, verifiedAtSql)]);
  const globs = new GlobCache();
  const touching = changes.filter((c) => {
    if (c.source === 'jira') return c.issueKey !== null && jiraKeys.includes(c.issueKey);
    return code.some((b) => shortRepo(b.repo) === shortRepo(c.repo) && c.files.some((f) => pathMatchStrength(b, f, globs) > 0));
  });
  return { changesSince: touching.length, relevant: touching.filter((c) => flagged.has(c.id)).length, since };
}

