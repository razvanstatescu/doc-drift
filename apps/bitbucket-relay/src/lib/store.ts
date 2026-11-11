// Everything the relay keeps in Forge KVS. Storage is per installation, so one workspace never
// sees another workspace's settings.
import { kvs } from '@forge/kvs';

const CONFIG_KEY = 'config';
const SECRET_KEY = 'secret';
const LAST_DELIVERY_KEY = 'status:last-delivery';

export interface RelayConfig {
  /** Core ingest web trigger URL. Its path is a bearer token: never log it whole (use redactUrl). */
  ingestUrl?: string;
  /** When the shared secret was last saved (the secret itself lives in `kvs.setSecret`). */
  secretSavedAt?: string;
  updatedAt?: string;
}

/** Shown on the settings page so an admin can see the last merged PR the relay handled. */
export interface DeliveryStatus {
  at: string;
  prId: number;
  repo: string;
  result: 'sent' | 'ignored' | 'failed';
  files?: number;
  /** Plain-language detail, never the URL or the secret. */
  detail?: string;
}

export async function getConfig(): Promise<RelayConfig> {
  return (await kvs.get<RelayConfig>(CONFIG_KEY)) ?? {};
}

export async function setConfig(config: RelayConfig): Promise<void> {
  await kvs.set(CONFIG_KEY, config);
}

export async function getSecret(): Promise<string | undefined> {
  const secret = await kvs.getSecret<string>(SECRET_KEY);
  return typeof secret === 'string' && secret.length > 0 ? secret : undefined;
}

export async function setSecret(secret: string): Promise<void> {
  await kvs.setSecret(SECRET_KEY, secret);
}

export async function getLastDelivery(): Promise<DeliveryStatus | undefined> {
  return kvs.get<DeliveryStatus>(LAST_DELIVERY_KEY);
}

/** Best effort: a failed status write must never fail the delivery itself. */
export async function setLastDelivery(status: DeliveryStatus): Promise<void> {
  try {
    await kvs.set(LAST_DELIVERY_KEY, status);
  } catch (err) {
    console.warn('relay: could not save delivery status', errorMessage(err));
  }
}

/** True when this merged PR was already delivered (a redelivery or a retry after success). */
export async function wasDelivered(key: string): Promise<boolean> {
  return (await kvs.get(key)) !== undefined;
}

export async function markDelivered(key: string, value: { at: string; status: number }): Promise<void> {
  // 30 days covers every Forge redelivery window by a wide margin and keeps storage small.
  await kvs.set(key, value, { ttl: { value: 30, unit: 'DAYS' } });
}

export async function getCached<T>(key: string): Promise<T | undefined> {
  return kvs.get<T>(key);
}

export async function setCached<T>(key: string, value: T, ttlHours: number): Promise<void> {
  try {
    await kvs.set(key, value, { ttl: { value: ttlHours, unit: 'HOURS' } });
  } catch (err) {
    console.warn('relay: could not cache value', errorMessage(err));
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
