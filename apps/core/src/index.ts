// Function entry points for manifest.yml (`handler: index.<export>`).
import { Queue } from '@forge/events';
import { runMigrationsWithRetry } from './lib/db';
import { ingestRecord, requeueNotify, type MatchJob } from './lib/ingest';
import { checkIngestRequest, nextNotifyHop } from './lib/ingest-rules';
import { processChange } from './lib/matching';
import { notifyPage } from './lib/notifier';
import { getRelaySecret, recordRelayPing } from './lib/settings-store';

export {
  checkPageFreshness,
  findDocsForPath,
  getDriftContext,
  listStalePages,
  recordVerification,
  submitFixProposal,
} from './actions';
export { handler as bylineHandler } from './resolvers/byline';
export { handler as settingsHandler } from './resolvers/settings';
export { devDriver } from './triggers/dev-driver';
export { confluencePageEvent, escalate, jiraEvent, purge } from './triggers/product-events';

interface WebTriggerRequest {
  method?: string;
  body?: string;
  headers?: Record<string, string[] | string | undefined>;
}

type Output = { outputKey: 'accepted' | 'bad-request' | 'unauthorized' };

/**
 * Static v2 web trigger `ingest-change`. The relay POSTs a ChangeRecord JSON signed with
 * HMAC-SHA256 over `${timestamp}.${body}` (headers x-dds-signature, x-dds-timestamp; @dds/shared).
 * A signed `{source: "ping"}` body records the relay connection instead.
 * Returns an output key: 202 accepted, 400 bad-request, 401 unauthorized. Never logs the body,
 * the signature or the secret.
 */
export async function ingest(request: WebTriggerRequest): Promise<Output> {
  const check = checkIngestRequest(await getRelaySecret(), request);
  if (!check.ok) {
    console.warn(`DDS_INGEST rejected: ${check.reason}`);
    return { outputKey: check.outputKey };
  }
  // The relay's "Send test ping": same signature, records the connection, never runs the matcher.
  if (check.kind === 'ping') {
    await recordRelayPing(check.ping.workspaceUuid, check.ping.sentAt);
    console.log(`DDS_INGEST ping workspace=${check.ping.workspaceUuid}`);
    return { outputKey: 'accepted' };
  }
  await ingestRecord(check.record, check.record.source === 'jira' ? 'jira' : 'relay');
  return { outputKey: 'accepted' };
}

/** match-queue consumer. The event body holds only a change_record ID. */
export async function match(event: { body?: Partial<MatchJob> }): Promise<void> {
  const id = event?.body?.changeRecordId;
  if (typeof id !== 'string' || id.length === 0) {
    console.warn('DDS_MATCH skipped: event without changeRecordId');
    return;
  }
  await processChange(id);
}

/** notify-queue consumer (F7). The event body holds only a page ID. */
export async function notify(event: { body?: { pageId?: unknown; notBefore?: unknown } }): Promise<void> {
  const pageId = event?.body?.pageId;
  if (typeof pageId !== 'string' || pageId.length === 0) {
    console.warn('DDS_NOTIFY skipped: event without pageId');
    return;
  }
  // A debounce over 900 s (the queue maximum) arrives in hops: wait again until notBefore.
  const notBefore = event.body?.notBefore;
  const hop = nextNotifyHop(notBefore, Date.now());
  if (hop !== null && typeof notBefore === 'number') {
    await requeueNotify({ pageId, notBefore }, hop);
    console.log(`DDS_NOTIFY_HOP ${JSON.stringify({ pageId, waitSeconds: hop })}`);
    return;
  }
  await notifyPage(pageId);
}

// Forge SQL migrations: lifecycle trigger -> queue -> consumer with timeoutSeconds 900 (S7).
const migrationQueue = new Queue({ key: 'dds-migration-queue' });

export async function enqueueMigration(event: { eventType?: string }): Promise<void> {
  console.log(`DDS_MIGRATE enqueue reason=${event?.eventType ?? 'unknown'}`);
  await migrationQueue.push({ body: { reason: event?.eventType ?? 'manual' } });
}

export async function runMigration(): Promise<void> {
  await runMigrationsWithRetry();
}
