// Function entry points for manifest.yml (`handler: index.<export>`).
import { Queue } from '@forge/events';
import { isPingBody, parseChangeRecord, parsePingRecord, SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyBody } from '@dds/shared';
import { runMigrationsWithRetry } from './lib/db';
import { ingestRecord, type MatchJob } from './lib/ingest';
import { headerValue } from './lib/ingest-rules';
import { processChange } from './lib/matching';
import { getRelaySecret, recordRelayPing } from './lib/settings-store';

export { handler as bylineHandler } from './resolvers/byline';
export { handler as settingsHandler } from './resolvers/settings';
export { devDriver } from './triggers/dev-driver';

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
  const body = request.body ?? '';
  const secret = await getRelaySecret();
  if (!secret) {
    console.warn('DDS_INGEST rejected: no relay secret configured (generate one in settings)');
    return { outputKey: 'unauthorized' };
  }
  const verdict = verifyBody(secret, body, headerValue(request.headers, SIGNATURE_HEADER), headerValue(request.headers, TIMESTAMP_HEADER));
  if (!verdict.ok) {
    console.warn(`DDS_INGEST rejected: ${verdict.reason} bytes=${Buffer.byteLength(body)}`);
    return { outputKey: 'unauthorized' };
  }
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    console.warn('DDS_INGEST rejected: body is not JSON');
    return { outputKey: 'bad-request' };
  }
  // The relay's "Send test ping": same signature, records the connection, never runs the matcher.
  if (isPingBody(json)) {
    const ping = parsePingRecord(json);
    if (!ping.ok) {
      console.warn(`DDS_INGEST rejected: invalid ping ${JSON.stringify(ping.errors.slice(0, 5))}`);
      return { outputKey: 'bad-request' };
    }
    await recordRelayPing(ping.value.workspaceUuid, ping.value.sentAt);
    console.log(`DDS_INGEST ping workspace=${ping.value.workspaceUuid}`);
    return { outputKey: 'accepted' };
  }
  const parsed = parseChangeRecord(json);
  if (!parsed.ok) {
    console.warn(`DDS_INGEST rejected: invalid change record ${JSON.stringify(parsed.errors.slice(0, 5))}`);
    return { outputKey: 'bad-request' };
  }
  await ingestRecord(parsed.value, parsed.value.source === 'jira' ? 'jira' : 'relay');
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

// Forge SQL migrations: lifecycle trigger -> queue -> consumer with timeoutSeconds 900 (S7).
const migrationQueue = new Queue({ key: 'dds-migration-queue' });

export async function enqueueMigration(event: { eventType?: string }): Promise<void> {
  console.log(`DDS_MIGRATE enqueue reason=${event?.eventType ?? 'unknown'}`);
  await migrationQueue.push({ body: { reason: event?.eventType ?? 'manual' } });
}

export async function runMigration(): Promise<void> {
  await runMigrationsWithRetry();
}
