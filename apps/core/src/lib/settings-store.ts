// Admin settings and the relay secret in Forge KVS (`@forge/kvs`). The secret lives in the
// encrypted secret store; only a short fingerprint is kept in plain storage, for display.
import { createHash, randomBytes } from 'node:crypto';
import { kvs } from '@forge/kvs';
import { DEFAULT_SETTINGS, type AppSettings } from './ingest-rules';

const SETTINGS_KEY = 'settings';
const SECRET_KEY = 'relay-secret';
const SECRET_META_KEY = 'relay-secret-meta';
const PING_KEY = 'relay-ping';

export interface SecretMeta {
  fingerprint: string;
  createdAt: string;
  createdBy: string | null;
}

export async function getSettings(): Promise<AppSettings> {
  const stored = (await kvs.get<AppSettings>(SETTINGS_KEY)) ?? undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await kvs.set(SETTINGS_KEY, settings);
}

export async function getRelaySecret(): Promise<string | undefined> {
  return (await kvs.getSecret<string>(SECRET_KEY)) ?? undefined;
}

export async function getSecretMeta(): Promise<SecretMeta | undefined> {
  return (await kvs.get<SecretMeta>(SECRET_META_KEY)) ?? undefined;
}

/** First 8 hex characters of the SHA-256 of the secret. Lets an admin match the relay's copy without showing it. */
export function fingerprint(secret: string): string {
  return createHash('sha256').update(secret).digest('hex').slice(0, 8);
}

/** Generates and stores a new relay secret. The caller shows it once; it is never returned again. */
export async function rotateRelaySecret(createdBy: string | null): Promise<{ secret: string; meta: SecretMeta }> {
  const secret = `dds_${randomBytes(32).toString('base64url')}`;
  const meta: SecretMeta = { fingerprint: fingerprint(secret), createdAt: new Date().toISOString(), createdBy };
  await kvs.setSecret(SECRET_KEY, secret);
  await kvs.set(SECRET_META_KEY, meta);
  return { secret, meta };
}

/** The last signed ping from the relay ("Send test ping"), shown as the connection status. */
export interface RelayPing {
  workspaceUuid: string;
  sentAt: string;
  receivedAt: string;
}

export async function recordRelayPing(workspaceUuid: string, sentAt: string): Promise<RelayPing> {
  const ping: RelayPing = { workspaceUuid, sentAt, receivedAt: new Date().toISOString() };
  await kvs.set(PING_KEY, ping);
  return ping;
}

export async function getRelayPing(): Promise<RelayPing | undefined> {
  return (await kvs.get<RelayPing>(PING_KEY)) ?? undefined;
}
