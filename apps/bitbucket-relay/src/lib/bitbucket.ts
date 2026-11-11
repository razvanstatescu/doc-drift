// Bitbucket REST calls made by the trigger, always as the app (triggers have no user).
import api, { route, routeFromAbsolute, type Route } from '@forge/api';
import {
  collectDiffstat,
  parseRepoInfo,
  repoCacheKey,
  type DiffstatPage,
  type DiffstatResult,
  type MergedPullRequest,
  type RepoInfo,
} from './record';
import { getCached, setCached } from './store';

/** A Bitbucket call failed. `retryable` errors are worth a redelivery (5xx, 429, 555 timeouts). */
export class BitbucketError extends Error {
  constructor(
    readonly label: string,
    readonly status: number,
  ) {
    super(`Bitbucket ${label} answered ${status}`);
  }

  get retryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

async function getJson(label: string, r: Route): Promise<unknown> {
  const res = await api.asApp().requestBitbucket(r, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    await res.text().catch(() => '');
    throw new BitbucketError(label, res.status);
  }
  return res.json();
}

const REPO_CACHE_HOURS = 1;

interface CachedRepo extends RepoInfo {
  fetchedAt: number;
}

/**
 * Main branch and names of a repository, cached in KVS for 1 hour (a renamed main branch is
 * picked up within the hour).
 */
export async function getRepoInfo(workspaceUuid: string, repoUuid: string): Promise<RepoInfo> {
  const key = repoCacheKey(repoUuid);
  const cached = await getCached<CachedRepo>(key);
  if (cached && Date.now() - cached.fetchedAt < REPO_CACHE_HOURS * 3_600_000) {
    const { fetchedAt: _ignored, ...info } = cached;
    return info;
  }
  const json = await getJson(
    'repository',
    route`/2.0/repositories/${workspaceUuid}/${repoUuid}?fields=mainbranch.name,full_name,slug`,
  );
  const info = parseRepoInfo(json);
  await setCached<CachedRepo>(key, { ...info, fetchedAt: Date.now() }, REPO_CACHE_HOURS);
  return info;
}

/** Which revision spec produced the diffstat, so the diff uses the same one. */
export type DiffSpec = 'range' | 'pullrequest' | 'merge-commit';

/** Follows `next` links only on the Bitbucket API host. */
function nextRoute(next: string): Route {
  const url = new URL(next);
  if (url.protocol !== 'https:' || url.hostname !== 'api.bitbucket.org') {
    throw new BitbucketError('diffstat next link (unexpected host)', 502);
  }
  return routeFromAbsolute(next);
}

function firstPageRoute(pr: MergedPullRequest, spec: DiffSpec): Route {
  const ws = pr.workspaceUuid;
  const repo = pr.repoUuid;
  switch (spec) {
    case 'range':
      // Two interpolations around a literal `..`. One interpolation holding `a..b` makes route()
      // throw "Disallowing path manipulation attempt" (S1). src..dst with topic=true is the PR's diff.
      return route`/2.0/repositories/${ws}/${repo}/diffstat/${pr.sourceHash}..${pr.destinationHash}?topic=true&pagelen=500`;
    case 'pullrequest':
      // 302 to the range spec; the Forge proxy follows it and keeps auth (S1).
      return route`/2.0/repositories/${ws}/${repo}/pullrequests/${pr.prId}/diffstat?pagelen=500`;
    case 'merge-commit':
      // Diff against the merge commit's first parent. Right for merge and squash commits.
      return route`/2.0/repositories/${ws}/${repo}/diffstat/${pr.mergeCommit}?pagelen=500`;
  }
}

async function diffstatVia(pr: MergedPullRequest, spec: DiffSpec): Promise<DiffstatResult> {
  return collectDiffstat(async (next) => {
    const json = await getJson(`diffstat (${spec})`, next ? nextRoute(next) : firstPageRoute(pr, spec));
    return (json ?? {}) as DiffstatPage;
  });
}

/**
 * Changed files of a merged PR. Uses the range form first. An empty range result means the hashes
 * did not describe the PR, so it falls back to the PR endpoint, then the merge commit.
 */
export async function getDiffstat(pr: MergedPullRequest): Promise<DiffstatResult & { via: DiffSpec }> {
  let lastError: unknown;
  for (const spec of ['range', 'pullrequest', 'merge-commit'] as const) {
    try {
      const result = await diffstatVia(pr, spec);
      if (result.totalEntries > 0) return { ...result, via: spec };
      console.warn('relay: empty diffstat', { spec, prId: pr.prId });
    } catch (err) {
      lastError = err;
      console.warn('relay: diffstat failed', { spec, prId: pr.prId, error: String(err) });
    }
  }
  if (lastError) throw lastError;
  return { files: [], totalEntries: 0, skipped: 0, truncated: false, pages: 0, via: 'range' };
}

function diffRoute(pr: MergedPullRequest, spec: DiffSpec): Route {
  const ws = pr.workspaceUuid;
  const repo = pr.repoUuid;
  switch (spec) {
    case 'range':
      return route`/2.0/repositories/${ws}/${repo}/diff/${pr.sourceHash}..${pr.destinationHash}?topic=true`;
    case 'pullrequest':
      return route`/2.0/repositories/${ws}/${repo}/pullrequests/${pr.prId}/diff`;
    case 'merge-commit':
      return route`/2.0/repositories/${ws}/${repo}/diff/${pr.mergeCommit}`;
  }
}

/**
 * Raw unified diff. Optional evidence: any failure (including 555 "diff too large") returns
 * undefined and the record goes out with the diffstat only.
 */
export async function getDiff(pr: MergedPullRequest, spec: DiffSpec): Promise<string | undefined> {
  try {
    const res = await api.asApp().requestBitbucket(diffRoute(pr, spec), { headers: { accept: 'text/plain' } });
    if (!res.ok) {
      await res.text().catch(() => '');
      console.warn('relay: diff skipped', { spec, prId: pr.prId, status: res.status });
      return undefined;
    }
    return await res.text();
  } catch (err) {
    console.warn('relay: diff skipped', { spec, prId: pr.prId, error: String(err) });
    return undefined;
  }
}
