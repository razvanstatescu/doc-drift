import { createHmac, timingSafeEqual } from 'node:crypto';

/** Header carrying the hex HMAC-SHA256 of `${timestamp}.${body}`. */
export const SIGNATURE_HEADER = 'x-dds-signature';
/** Header carrying the signing time in Unix seconds. */
export const TIMESTAMP_HEADER = 'x-dds-timestamp';
/** Requests signed more than this far from the receiver's clock are rejected (replay guard). */
export const MAX_CLOCK_SKEW_SECONDS = 300;

const HEX_SHA256 = /^[0-9a-f]{64}$/;
const UNIX_SECONDS = /^\d{1,12}$/;

export interface SignedBody {
  /** Value for {@link SIGNATURE_HEADER}. */
  signature: string;
  /** Value for {@link TIMESTAMP_HEADER}. */
  timestamp: string;
}

export type VerifyResult = { ok: true } | { ok: false; reason: 'malformed' | 'stale_timestamp' | 'bad_signature' };

function hmacHex(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/**
 * Signs a request body for the relay-to-core web trigger.
 * The signature covers `${timestamp}.${body}`, so a captured request cannot be replayed later.
 *
 * @param secret per-install relay secret
 * @param body exact bytes that will be sent (sign after `JSON.stringify`)
 * @param nowMs signing time, defaults to the current clock
 */
export function signBody(secret: string, body: string, nowMs: number = Date.now()): SignedBody {
  const timestamp = String(Math.floor(nowMs / 1000));
  return { signature: hmacHex(secret, timestamp, body), timestamp };
}

/**
 * Verifies a signed body with a constant-time compare and a ±5 minute timestamp window.
 *
 * @param signature value of {@link SIGNATURE_HEADER}
 * @param timestamp value of {@link TIMESTAMP_HEADER}
 * @param nowMs receiver's clock, defaults to the current clock
 */
export function verifyBody(
  secret: string,
  body: string,
  signature: string | undefined,
  timestamp: string | undefined,
  nowMs: number = Date.now(),
): VerifyResult {
  if (!signature || !timestamp || !HEX_SHA256.test(signature) || !UNIX_SECONDS.test(timestamp)) {
    return { ok: false, reason: 'malformed' };
  }
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'stale_timestamp' };
  }
  const expected = Buffer.from(hmacHex(secret, timestamp, body), 'hex');
  const given = Buffer.from(signature, 'hex');
  return timingSafeEqual(expected, given) ? { ok: true } : { ok: false, reason: 'bad_signature' };
}
