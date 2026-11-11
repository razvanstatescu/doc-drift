import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Deps } from '../deps.js';
import type { Router } from '../http/router.js';
import { log } from '../http/logger.js';

// PSP webhooks. The PSP signs the raw body with WEBHOOK_SIGNING_SECRET (HMAC-SHA256, hex)
// in the psp-signature header. Events that fail processing go to webhook_dead_letters
// and are replayed with scripts/replay-webhooks.sh.
export function verifySignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function registerWebhooks(router: Router, { pool, config }: Deps): void {
  router.post('/webhooks/psp', async (req) => {
    const sig = req.headers['psp-signature'];
    if (!verifySignature(req.rawBody, typeof sig === 'string' ? sig : undefined, config.psp.webhookSigningSecret)) {
      return { status: 401, body: { error: 'signature_invalid' } };
    }
    const event = req.body as { id: string; type: string; data: { charge_id?: string } };
    try {
      await pool.query(
        `INSERT INTO webhook_events (id, type, payload) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [event.id, event.type, req.rawBody],
      );
      if (event.type === 'charge.settled' && event.data.charge_id) {
        await pool.query(`UPDATE charges SET status = 'settled', settled_at = now() WHERE id = $1`, [event.data.charge_id]);
      }
    } catch (err) {
      log.error('webhook processing failed, moved to dead letters', { eventId: event.id, err });
      await pool.query(
        `INSERT INTO webhook_dead_letters (event_id, payload, error) VALUES ($1, $2, $3)`,
        [event.id, req.rawBody, String(err)],
      );
    }
    return { status: 200, body: { received: true } };
  });

  // Internal only: not exposed through the ingress. Used by scripts/replay-webhooks.sh.
  router.post('/internal/webhooks/replay/:id', async (req) => {
    const { rows } = await pool.query(
      `DELETE FROM webhook_dead_letters WHERE event_id = $1 RETURNING payload`,
      [req.params.id],
    );
    if (!rows.length) return { status: 404, body: { error: 'dead_letter_not_found' } };
    const event = JSON.parse(rows[0].payload) as { id: string; type: string; data: { charge_id?: string } };
    if (event.type === 'charge.settled' && event.data.charge_id) {
      await pool.query(`UPDATE charges SET status = 'settled', settled_at = now() WHERE id = $1`, [event.data.charge_id]);
    }
    return { status: 200, body: { replayed: event.id } };
  });
}
