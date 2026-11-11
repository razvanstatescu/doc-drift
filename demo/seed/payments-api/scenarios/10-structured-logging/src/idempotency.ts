import { createHash } from 'node:crypto';
import type pg from 'pg';
import { log } from './http/logger.js';
import type { Response } from './http/router.js';

// Idempotency for POST /v2/charges and POST /v2/refunds (ADR-012, PAY-131).
// A key is stored for 24 hours. Reusing a key with a different body returns 409 (PAY-134).
export const IDEMPOTENCY_TTL_HOURS = 24;

export function requestHash(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');
}

export async function withIdempotency(
  pool: pg.Pool,
  key: string,
  body: unknown,
  run: () => Promise<Response>,
): Promise<Response> {
  const hash = requestHash(body);
  const existing = await pool.query(
    `SELECT request_hash, status_code, response_body
       FROM idempotency_keys
      WHERE key = $1 AND created_at > now() - make_interval(hours => $2)`,
    [key, IDEMPOTENCY_TTL_HOURS],
  );

  if (existing.rowCount) {
    const row = existing.rows[0];
    if (row.request_hash !== hash) {
      log.warn('idempotency key reused with a different body', { key });
      return { status: 409, body: { error: 'idempotency_key_conflict' } };
    }
    return { status: row.status_code, body: row.response_body, headers: { 'idempotent-replay': 'true' } };
  }

  const result = await run();
  await pool.query(
    `INSERT INTO idempotency_keys (key, request_hash, status_code, response_body)
     VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING`,
    [key, hash, result.status, JSON.stringify(result.body ?? null)],
  );
  return result;
}
