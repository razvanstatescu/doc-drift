import type { Deps } from '../deps.js';
import type { Router } from '../http/router.js';
import { withIdempotency } from '../idempotency.js';

export interface ChargeRequest {
  amount: number;
  currency: string;
  source: string;
  description?: string;
}

const CURRENCIES = new Set(['EUR', 'USD', 'GBP', 'RON']);
const MAX_AMOUNT_MINOR = 10_000_000;

// Returns the parsed request, or an error code for a 422 response.
export function validateChargeRequest(body: unknown): ChargeRequest | string {
  if (typeof body !== 'object' || body === null) return 'body_required';
  const b = body as Record<string, unknown>;
  if (!Number.isInteger(b.amount) || (b.amount as number) <= 0) return 'amount_invalid';
  if ((b.amount as number) > MAX_AMOUNT_MINOR) return 'amount_too_large';
  if (typeof b.currency !== 'string' || !CURRENCIES.has(b.currency)) return 'currency_unsupported';
  if (typeof b.source !== 'string' || !b.source.startsWith('src_')) return 'source_invalid';
  return {
    amount: b.amount as number,
    currency: b.currency,
    source: b.source,
    description: typeof b.description === 'string' ? b.description : undefined,
  };
}

export function registerCharges(router: Router, { pool, config }: Deps): void {
  router.post('/v2/charges', async (req) => {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || key.length < 8) {
      return { status: 400, body: { error: 'idempotency_key_required' } };
    }
    const parsed = validateChargeRequest(req.body);
    if (typeof parsed === 'string') return { status: 422, body: { error: parsed } };

    return withIdempotency(pool, key, req.body, async () => {
      const { rows } = await pool.query(
        `INSERT INTO charges (amount_minor, currency, source, description, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, amount_minor AS amount, currency, status, created_at`,
        [parsed.amount, parsed.currency, parsed.source, parsed.description ?? null],
      );
      // While a drain is running (SETTLEMENT_ENQUEUE_PAUSED=true) new jobs are held, not pending.
      const jobStatus = config.workers.enqueuePaused ? 'held' : 'pending';
      await pool.query(`INSERT INTO settlement_jobs (charge_id, status) VALUES ($1, $2)`, [rows[0].id, jobStatus]);
      return { status: 201, body: rows[0] };
    });
  });

  router.get('/v2/charges/:id', async (req) => {
    const { rows } = await pool.query(
      `SELECT id, amount_minor AS amount, currency, status, created_at, settled_at
         FROM charges WHERE id = $1`,
      [req.params.id],
    );
    return rows.length ? { status: 200, body: rows[0] } : { status: 404, body: { error: 'charge_not_found' } };
  });
}
