import type { Deps } from '../deps.js';
import type { Router } from '../http/router.js';
import { withIdempotency } from '../idempotency.js';

const REASONS = new Set(['requested_by_customer', 'duplicate', 'fraudulent']);

// POST /v2/refunds supports partial refunds ({{PAY:partial-refunds}}).
// The sum of refunds for a charge can never exceed the captured amount.
export function registerRefunds(router: Router, { pool }: Deps): void {
  router.post('/v2/refunds', async (req) => {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || key.length < 8) {
      return { status: 400, body: { error: 'idempotency_key_required' } };
    }
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (typeof b.charge_id !== 'string') return { status: 422, body: { error: 'charge_id_required' } };
    if (!Number.isInteger(b.amount) || (b.amount as number) <= 0) return { status: 422, body: { error: 'amount_invalid' } };
    if (b.reason !== undefined && !REASONS.has(b.reason as string)) {
      return { status: 422, body: { error: 'reason_invalid' } };
    }

    return withIdempotency(pool, key, req.body, async () => {
      const { rows: charge } = await pool.query(
        `SELECT amount_minor, COALESCE((SELECT SUM(amount_minor) FROM refunds WHERE charge_id = $1), 0) AS refunded
           FROM charges WHERE id = $1 AND status = 'settled'`,
        [b.charge_id],
      );
      if (!charge.length) return { status: 404, body: { error: 'charge_not_refundable' } };
      if (Number(charge[0].refunded) + (b.amount as number) > Number(charge[0].amount_minor)) {
        return { status: 422, body: { error: 'amount_exceeds_refundable' } };
      }
      const { rows } = await pool.query(
        `INSERT INTO refunds (charge_id, amount_minor, reason, status)
         VALUES ($1, $2, $3, 'pending') RETURNING id, charge_id, amount_minor AS amount, reason, status, created_at`,
        [b.charge_id, b.amount, b.reason ?? 'requested_by_customer'],
      );
      return { status: 201, body: rows[0] };
    });
  });

  router.get('/v2/refunds/:id', async (req) => {
    const { rows } = await pool.query(
      `SELECT id, charge_id, amount_minor AS amount, reason, status, created_at FROM refunds WHERE id = $1`,
      [req.params.id],
    );
    return rows.length ? { status: 200, body: rows[0] } : { status: 404, body: { error: 'refund_not_found' } };
  });
}
