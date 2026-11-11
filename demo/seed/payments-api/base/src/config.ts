// Loads payments-api configuration from the environment.
// Every variable is described in Confluence: PLAT > Payments API service overview.

function str(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`missing required env var ${name}`);
  return value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : Number.parseInt(raw, 10);
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw === 'true';
}

export function loadConfig() {
  return {
    port: int('PORT', 8080),
    logLevel: str('LOG_LEVEL', 'info'),
    db: {
      primaryHost: str('PAYMENTS_DB_PRIMARY_HOST'),
      replicaHost: str('PAYMENTS_DB_REPLICA_HOST', ''),
      name: str('PAYMENTS_DB_NAME', 'payments'),
      user: str('PAYMENTS_DB_USER', 'payments_app'),
      password: str('PAYMENTS_DB_PASSWORD'),
      pool: int('PAYMENTS_DB_POOL', 20),
    },
    psp: {
      apiKey: str('PSP_API_KEY'),
      webhookSigningSecret: str('WEBHOOK_SIGNING_SECRET'),
    },
    workers: {
      concurrency: int('PAYMENTS_WORKER_CONCURRENCY', 8),
      batchSize: int('SETTLEMENT_BATCH_SIZE', 50),
      enqueuePaused: bool('SETTLEMENT_ENQUEUE_PAUSED', false),
    },
    refundsV1Enabled: bool('REFUNDS_V1_ENABLED', false),
  };
}

export type Config = ReturnType<typeof loadConfig>;
