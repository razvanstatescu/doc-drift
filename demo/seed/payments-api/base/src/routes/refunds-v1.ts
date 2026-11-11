import type { Deps } from '../deps.js';
import type { Router } from '../http/router.js';

// Legacy v1 refunds. Full refunds only, amounts in amount_cents, no idempotency.
// Registered only when REFUNDS_V1_ENABLED is true. Removal tracked in {{PAY:remove-v1-refunds}} (ADR-009).
const SUNSET = 'Tue, 15 Dec 2026 00:00:00 GMT';

export function registerLegacyRefunds(router: Router, { pool }: Deps): void {
  router.post('/v1/refunds', handleLegacyRefund(pool));
}

function handleLegacyRefund(pool: Deps['pool']) {
  return async (req: { body: unknown }) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (typeof b.charge !== 'string') return { status: 400, body: { error: 'charge_required' } };

    const { rows: charge } = await pool.query(
      `SELECT amount_minor FROM charges WHERE id = $1 AND status = 'settled'`,
      [b.charge],
    );
    if (!charge.length) return { status: 404, body: { error: 'charge_not_refundable' } };
    if (b.amount_cents !== undefined && Number(b.amount_cents) !== Number(charge[0].amount_minor)) {
      return { status: 400, body: { error: 'partial_refunds_require_v2' } };
    }

    const { rows } = await pool.query(
      `INSERT INTO refunds (charge_id, amount_minor, reason, status)
       VALUES ($1, $2, 'requested_by_customer', 'pending') RETURNING id, status`,
      [b.charge, charge[0].amount_minor],
    );
    return {
      status: 200,
      body: { refund: rows[0].id, state: rows[0].status, amount_cents: charge[0].amount_minor },
      headers: { Deprecation: 'true', Sunset: SUNSET, Link: '</v2/refunds>; rel="successor-version"' },
    };
  };
}
