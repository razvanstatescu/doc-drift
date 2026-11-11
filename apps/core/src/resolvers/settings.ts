// Resolver for the global settings page (useAsConfig). Display conditions are not authorization,
// so every function checks that the caller is a Confluence administrator, asUser.
import api, { webTrigger } from '@forge/api';
import Resolver from '@forge/resolver';
import { currentUserIsAdmin } from '../lib/confluence';
import { DEMO_CHANGE_RECORD, DEMO_PR_ID } from '../lib/demo';
import { ingestRecord } from '../lib/ingest';
import { parseSettings } from '../lib/ingest-rules';
import { getRelayPing, getSecretMeta, getSettings, rotateRelaySecret, saveSettings } from '../lib/settings-store';

export const INGEST_WEBTRIGGER_KEY = 'ingest-change';

const resolver = new Resolver();
const DENIED = { ok: false, message: 'Only Confluence administrators can change Doc Drift Sentinel settings.' };

resolver.define('load', async () => {
  if (!(await currentUserIsAdmin(api.asUser()))) return DENIED;
  const [ingestUrl, secret, settings, ping] = await Promise.all([
    webTrigger.getUrl(INGEST_WEBTRIGGER_KEY),
    getSecretMeta(),
    getSettings(),
    getRelayPing(),
  ]);
  return { ok: true, ingestUrl, secret: secret ?? null, ping: ping ?? null, settings, demoPrId: DEMO_PR_ID };
});

/** Generates a new relay secret and returns it once. The old one stops working immediately. */
resolver.define('rotateSecret', async ({ context }) => {
  if (!(await currentUserIsAdmin(api.asUser()))) return DENIED;
  const { secret, meta } = await rotateRelaySecret((context as { accountId?: string }).accountId ?? null);
  console.log(`DDS_SECRET_ROTATED fingerprint=${meta.fingerprint}`);
  return { ok: true, secret, meta };
});

resolver.define('saveSettings', async ({ payload }) => {
  if (!(await currentUserIsAdmin(api.asUser()))) return DENIED;
  const parsed = parseSettings(payload);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  await saveSettings(parsed.value);
  return { ok: true, settings: parsed.value };
});

/**
 * Demo mode: injects the seeded scenario 01 change record through the same ingest path the relay
 * uses (store, queue, match). A fresh dedupe key per replay makes each replay a new change.
 */
resolver.define('replayDemo', async () => {
  if (!(await currentUserIsAdmin(api.asUser()))) return DENIED;
  const res = await ingestRecord(DEMO_CHANGE_RECORD, 'demo', `demo#${DEMO_PR_ID}#${Date.now()}`);
  return { ok: true, changeRecordId: res.changeRecordId };
});

export const handler = resolver.getDefinitions();
