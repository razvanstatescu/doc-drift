import pg from 'pg';
import type { Config } from '../config.js';

// One pool per pod. The size comes from PAYMENTS_DB_POOL (deploy/helm/values.yaml).
// Total connections = replicaCount x PAYMENTS_DB_POOL. Keep it under max_connections (200).
export function createPool(config: Config): pg.Pool {
  const pool = new pg.Pool({
    host: config.db.primaryHost,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    max: config.db.pool,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    console.error('payments db pool error', err);
  });

  return pool;
}
