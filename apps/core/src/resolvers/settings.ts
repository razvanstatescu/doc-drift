// Resolver for the global settings page (useAsConfig, F13). Display conditions are not authorization,
// so every function checks that the caller is a Confluence administrator, asUser.
import api, { webTrigger } from '@forge/api';
import Resolver from '@forge/resolver';
import { DEFAULT_IGNORE_GLOBS } from '@dds/matcher';
import { currentUserIsAdmin, listSpaces } from '../lib/confluence';
import { ensureSchema, relayActivity } from '../lib/db';
import { DEMO_CHANGE_RECORD, DEMO_PR_ID } from '../lib/demo';
import { ingestRecord } from '../lib/ingest';
import {
  DEFAULT_SETTINGS,
  MAX_ESCALATION_DAYS,
  MAX_IGNORE_GLOBS,
  MAX_NOTIFY_DEBOUNCE_MINUTES,
  parseSettings,
  type AppSettings,
} from '../lib/ingest-rules';
import { getRelayPing, getSecretMeta, getSettings, rotateRelaySecret, saveSettings, saveSettingsLocation } from '../lib/settings-store';

export const INGEST_WEBTRIGGER_KEY = 'ingest-change';

const resolver = new Resolver();
const DENIED = {
  ok: false,
  error: 'forbidden',
  message: 'Only Confluence administrators can change Doc Drift Sentinel settings. Ask an administrator to make changes here.',
};

interface SettingsContext {
  accountId?: string;
  extension?: { location?: string };
}

/** Safe wrapper: a failing side panel (spaces, relay activity) must not block the settings page. */
async function soft<T>(tag: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.warn(`DDS_SETTINGS_${tag}_FAILED ${String((e as Error)?.message ?? e).slice(0, 200)}`);
    return fallback;
  }
}

resolver.define('load', async ({ payload, context }) => {
  if (!(await currentUserIsAdmin(api.asUser()))) return DENIED;
  const ctx = context as SettingsContext;
  // Remember where the settings page lives, so the review panel can link admins to it.
  const location = (payload as { location?: unknown } | undefined)?.location ?? ctx.extension?.location;
  await soft('LOCATION', () => saveSettingsLocation(location), undefined);
  const [ingestUrl, secret, settings, ping, spaces, activity] = await Promise.all([
    webTrigger.getUrl(INGEST_WEBTRIGGER_KEY),
    getSecretMeta(),
    getSettings(),
    getRelayPing(),
    soft('SPACES', () => listSpaces(api.asUser()), { status: 0, spaces: [], truncated: false }),
    soft('ACTIVITY', async () => {
      await ensureSchema();
      return relayActivity();
    }, { lastRecord: null, repos: [], records30d: 0 }),
  ]);
  return {
    ok: true,
    ingestUrl,
    secret: secret ?? null,
    ping: ping ?? null,
    connection: {
      workspaceUuid: ping?.workspaceUuid ?? null,
      lastPingAt: ping?.receivedAt ?? null,
      lastRecord: activity.lastRecord,
      repos: activity.repos,
      records30d: activity.records30d,
    },
    settings,
    defaults: { ...DEFAULT_SETTINGS, ignoreGlobs: [...DEFAULT_IGNORE_GLOBS] },
    limits: { maxEscalationDays: MAX_ESCALATION_DAYS, maxNotifyDebounceMinutes: MAX_NOTIFY_DEBOUNCE_MINUTES, maxIgnoreGlobs: MAX_IGNORE_GLOBS },
    spaces: spaces.spaces.map((s) => ({ key: s.key, name: s.name })),
    spacesTruncated: spaces.truncated,
    demoPrId: DEMO_PR_ID,
  };
});

/** Generates a new relay secret and returns it once. The old one stops working immediately. */
resolver.define('rotateSecret', async ({ context }) => {
  if (!(await currentUserIsAdmin(api.asUser()))) return DENIED;
  const { secret, meta } = await rotateRelaySecret((context as { accountId?: string }).accountId ?? null);
  console.log(`DDS_SECRET_ROTATED fingerprint=${meta.fingerprint}`);
  return { ok: true, secret, meta };
});

/** Validates every field at once; a bad field returns `fieldErrors` and saves nothing. */
resolver.define('saveSettings', async ({ payload }) => {
  if (!(await currentUserIsAdmin(api.asUser()))) return DENIED;
  const current = await getSettings();
  const parsed = parseSettings(payload, current);
  if (!parsed.ok) return { ok: false, error: 'invalid', message: parsed.error, fieldErrors: parsed.fieldErrors };
  await saveSettings(parsed.value);
  const changed = (Object.keys(parsed.value) as (keyof AppSettings)[]).filter(
    (k) => JSON.stringify(parsed.value[k]) !== JSON.stringify(current[k]),
  );
  console.log(`DDS_SETTINGS_SAVED ${JSON.stringify({ changed })}`);
  return { ok: true, settings: parsed.value, message: 'Saved. Changes apply to the next change Doc Drift Sentinel receives.' };
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
