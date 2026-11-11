// The one ingest path for change records: the relay's web trigger and the demo replay both call
// `ingestRecord`. It dedupes, stores the change_record, and pushes ONLY its ID to match-queue
// (a consumer with timeoutSeconds > 55 has a 100 KB payload cap, so never push diffs).
import { randomUUID } from 'node:crypto';
import { Queue } from '@forge/events';
import type { ChangeRecord } from '@dds/shared';
import { ensureSchema, findChangeByDedupe, insertChange } from './db';
import { changeDedupeKey } from './ingest-rules';

export const MATCH_QUEUE_KEY = 'match-queue';
const matchQueue = new Queue({ key: MATCH_QUEUE_KEY });

export type MatchJob = {
  changeRecordId: string;
};

export type IngestOrigin = 'relay' | 'demo' | 'dev' | 'jira';

export interface IngestResult {
  changeRecordId: string;
  duplicate: boolean;
  queued: boolean;
}

/**
 * Stores a validated change record and queues it for matching.
 *
 * @param record a record that already passed `parseChangeRecord`
 * @param origin where it came from (stored for the audit trail)
 * @param dedupeKey override; the demo replay passes a fresh key so every replay is a new change
 */
export async function ingestRecord(record: ChangeRecord, origin: IngestOrigin, dedupeKey?: string): Promise<IngestResult> {
  await ensureSchema();
  const key = dedupeKey ?? changeDedupeKey(record);
  const existing = await findChangeByDedupe(key);
  if (existing) {
    // Redelivery. Re-queue only if the first attempt never finished; the consumer is idempotent.
    const requeue = existing.processedAt === null;
    if (requeue) await pushMatch(existing.id);
    console.log(`DDS_INGEST duplicate id=${existing.id} requeued=${requeue}`);
    return { changeRecordId: existing.id, duplicate: true, queued: requeue };
  }
  const id = randomUUID();
  try {
    await insertChange(id, key, origin, record);
  } catch (e) {
    // A concurrent delivery won the unique dedupe_key race.
    const raced = await findChangeByDedupe(key);
    if (raced) return { changeRecordId: raced.id, duplicate: true, queued: false };
    throw e;
  }
  await pushMatch(id);
  const summary =
    record.source === 'bitbucket'
      ? { repo: `${record.workspace}/${record.repoSlug}`, prId: record.prId, files: record.files.length, hunks: record.hunks?.length ?? 0 }
      : { issueKey: record.issueKey, changelog: record.changelog.length };
  console.log(`DDS_INGEST stored id=${id} origin=${origin} ${JSON.stringify(summary)}`);
  return { changeRecordId: id, duplicate: false, queued: true };
}

async function pushMatch(changeRecordId: string): Promise<void> {
  const job: MatchJob = { changeRecordId };
  await matchQueue.push({ body: job });
}
