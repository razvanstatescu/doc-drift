import type { ValidationResult } from './validate.js';

/**
 * Connection test sent by the Bitbucket relay's "Send test ping" button.
 * Signed exactly like a change record; the core answers 202 and records the
 * workspace as connected, but never runs the matcher on it.
 */
export type PingRecord = {
  source: 'ping';
  /** Bitbucket workspace UUID, with braces, as Bitbucket returns it. */
  workspaceUuid: string;
  /** ISO-8601 time the relay sent the ping. */
  sentAt: string;
};

const MAX_FIELD = 200;

/** Validates an untrusted JSON value as a {@link PingRecord}. */
export function parsePingRecord(input: unknown): ValidationResult<PingRecord> {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, errors: ['ping must be an object'] };
  }
  const o = input as Record<string, unknown>;
  if (o.source !== 'ping') errors.push('source must be "ping"');
  for (const key of ['workspaceUuid', 'sentAt'] as const) {
    const v = o[key];
    if (typeof v !== 'string' || v.length === 0 || v.length > MAX_FIELD) {
      errors.push(`${key} must be a non-empty string of at most ${MAX_FIELD} characters`);
    }
  }
  if (typeof o.sentAt === 'string' && Number.isNaN(Date.parse(o.sentAt))) {
    errors.push('sentAt must be an ISO-8601 date');
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { source: 'ping', workspaceUuid: o.workspaceUuid as string, sentAt: o.sentAt as string } };
}

/** True when an untrusted body declares itself a ping; use it to route before full validation. */
export function isPingBody(input: unknown): boolean {
  return typeof input === 'object' && input !== null && (input as Record<string, unknown>).source === 'ping';
}
