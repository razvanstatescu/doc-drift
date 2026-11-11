// Trigger for avi:bitbucket:fulfilled:pullrequest: a PR merged somewhere in the workspace.
// Reads the changed files, builds a ChangeRecord and POSTs it, signed, to the core ingest URL.
//
// Logging rule: never log the event object. It carries a contextToken JWT. Log chosen fields only,
// and never the ingest URL path (a bearer token) or the secret.
import { InvocationError, InvocationErrorCode } from '@forge/events';
import { parseChangeRecord } from '@dds/shared';
import { BitbucketError, getDiff, getDiffstat, getRepoInfo } from './lib/bitbucket';
import { postSigned } from './lib/core-client';
import { classifyCoreResponse, redactUrl } from './lib/ingest';
import {
  DIFF_FILE_LIMIT,
  buildChangeRecord,
  dedupeKey,
  isMainBranchMerge,
  parseMergedEvent,
  type MergedPullRequest,
} from './lib/record';
import {
  errorMessage,
  getConfig,
  getSecret,
  markDelivered,
  setLastDelivery,
  wasDelivered,
} from './lib/store';

/** Seconds before each redelivery. Forge allows at most 4 app-requested retries. */
const RETRY_AFTER_SECONDS = [30, 120, 300, 900];

/** An error that another attempt can fix (network, 5xx, 429). */
class RetryableError extends Error {}

/** An error that another attempt cannot fix (an invalid record). */
class PermanentError extends Error {}

function isRetryable(err: unknown): boolean {
  if (err instanceof BitbucketError) return err.retryable;
  if (err instanceof RetryableError) return true;
  // Unknown errors (network, platform) are retried: delivery is deduplicated, so a retry is safe.
  return !(err instanceof PermanentError);
}

function repoLabel(pr: MergedPullRequest, slug?: string): string {
  return slug ?? pr.repoSlug ?? pr.repoUuid;
}

export async function onMerged(event: unknown): Promise<InvocationError | void> {
  const retryCount = Number((event as { retryContext?: { retryCount?: unknown } })?.retryContext?.retryCount ?? 0) || 0;
  const parsed = parseMergedEvent(event);
  if (!parsed.ok) {
    console.warn('relay: ignored event', { reason: parsed.reason });
    return;
  }
  const pr = parsed.value;
  const at = new Date().toISOString();
  console.log('relay: merged PR', {
    prId: pr.prId,
    repo: pr.repoSlug ?? pr.repoUuid,
    destination: pr.destinationBranch,
    mergeCommit: pr.mergeCommit,
    retryCount,
  });

  try {
    const key = dedupeKey(pr.repoUuid, pr.prId, pr.mergeCommit);
    if (await wasDelivered(key)) {
      console.log('relay: already delivered, skipping', { prId: pr.prId });
      return;
    }

    const [config, secret] = await Promise.all([getConfig(), getSecret()]);
    if (!config.ingestUrl || !secret) {
      console.warn('relay: not configured, skipping', { hasUrl: Boolean(config.ingestUrl), hasSecret: Boolean(secret) });
      await setLastDelivery({
        at, prId: pr.prId, repo: repoLabel(pr), result: 'failed',
        detail: 'Not sent: add the core ingest URL and shared secret on this page.',
      });
      return;
    }

    const repo = await getRepoInfo(pr.workspaceUuid, pr.repoUuid);
    if (!isMainBranchMerge(pr, repo)) {
      console.log('relay: not the main branch, ignoring', { destination: pr.destinationBranch, main: repo.mainBranch });
      await setLastDelivery({
        at, prId: pr.prId, repo: repoLabel(pr, repo.slug), result: 'ignored',
        detail: `Merged into ${pr.destinationBranch}, not ${repo.mainBranch}. Only main branch merges are sent.`,
      });
      return;
    }
    if (!repo.mainBranch) console.warn('relay: main branch unknown, relaying anyway', { prId: pr.prId });

    const diffstat = await getDiffstat(pr);
    let hunks: string | undefined;
    if (diffstat.totalEntries > 0 && diffstat.totalEntries <= DIFF_FILE_LIMIT) {
      hunks = await getDiff(pr, diffstat.via);
    }
    const record = buildChangeRecord({ pr, repo, files: diffstat.files, ...(hunks !== undefined && { hunks }), truncated: diffstat.truncated, totalFiles: diffstat.totalEntries });

    // Check against the shared schema before sending: the core would reject it anyway.
    const check = parseChangeRecord(record);
    if (!check.ok) {
      console.error('relay: built an invalid change record', { errors: check.errors.slice(0, 10) });
      throw new PermanentError('invalid change record');
    }

    const res = await postSigned(config.ingestUrl, secret, record);
    const outcome = classifyCoreResponse(res.status);
    console.log('relay: core answered', {
      host: redactUrl(config.ingestUrl),
      status: res.status,
      ms: res.elapsedMs,
      bodyBytes: res.bodyBytes,
      files: record.files.length,
      totalEntries: diffstat.totalEntries,
      truncated: diffstat.truncated,
      skipped: diffstat.skipped,
      via: diffstat.via,
      hunksBytes: record.hunks ? Buffer.byteLength(record.hunks, 'utf8') : 0,
    });

    if (outcome.kind === 'accepted') {
      await markDelivered(key, { at, status: res.status });
      await setLastDelivery({
        at, prId: pr.prId, repo: record.repoSlug, result: 'sent', files: record.files.length,
        detail: `Doc Drift Sentinel accepted it (HTTP ${res.status}).`,
      });
      return;
    }
    if (outcome.kind === 'retry') throw new RetryableError(outcome.message);
    await setLastDelivery({ at, prId: pr.prId, repo: record.repoSlug, result: 'failed', detail: outcome.message });
    return;
  } catch (err) {
    const retry = isRetryable(err) && retryCount < RETRY_AFTER_SECONDS.length;
    console.error('relay: delivery failed', { prId: pr.prId, error: errorMessage(err), retry, retryCount });
    if (retry) {
      return new InvocationError({
        retryAfter: RETRY_AFTER_SECONDS[retryCount] ?? 900,
        retryReason: InvocationErrorCode.FUNCTION_RETRY_REQUEST,
        retryData: { prId: pr.prId },
      });
    }
    await setLastDelivery({
      at, prId: pr.prId, repo: repoLabel(pr), result: 'failed',
      detail: err instanceof PermanentError || err instanceof BitbucketError || err instanceof RetryableError
        ? `Not sent: ${errorMessage(err)}.`
        : 'Not sent after 4 retries. Check the app logs.',
    });
  }
}
