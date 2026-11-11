import type { Deps } from '../deps.js';
import { log } from '../http/logger.js';

// Settlement worker (ADR-014, PAY-141). Claims pending rows from settlement_jobs with
// FOR UPDATE SKIP LOCKED, so any number of worker pods can run side by side.
// Concurrency per pod: PAYMENTS_WORKER_CONCURRENCY. Rows per claim: SETTLEMENT_BATCH_SIZE.
const IDLE_DELAY_MS = 2_000;

export function startSettlementWorker({ config, pool }: Deps): void {
  for (let i = 0; i < config.workers.concurrency; i++) {
    void loop(i);
  }

  async function loop(slot: number): Promise<void> {
    for (;;) {
      const claimed = await claimBatch();
      if (claimed === 0) await new Promise((r) => setTimeout(r, IDLE_DELAY_MS));
      if (process.exitCode !== undefined) {
        console.log('settlement worker slot stopping', slot);
        return;
      }
    }
  }

  async function claimBatch(): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT id, charge_id FROM settlement_jobs
          WHERE status = 'pending'
          ORDER BY created_at
          LIMIT $1
          FOR UPDATE SKIP LOCKED`,
        [config.workers.batchSize],
      );
      for (const job of rows) {
        await client.query(`UPDATE charges SET status = 'settling' WHERE id = $1 AND status = 'pending'`, [job.charge_id]);
        await client.query(`UPDATE settlement_jobs SET status = 'submitted', updated_at = now() WHERE id = $1`, [job.id]);
      }
      await client.query('COMMIT');
      return rows.length;
    } catch (err) {
      await client.query('ROLLBACK');
      log.error('settlement batch failed', { err });
      return 0;
    } finally {
      client.release();
    }
  }
}
