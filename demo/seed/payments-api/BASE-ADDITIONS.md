# payments-api base additions

Files the Confluence pages and scenarios 02 to 10 rely on, which the current `base/` lacks. Written 2026-11-11 by the demo-content agent; the orchestrator applies them.

## How to apply

1. Write every file below to `demo/seed/payments-api/base/<path>`, byte for byte (each block ends with a newline).
2. **Replace** means the file already exists in `base/` and is overwritten. **Add** means it is new.
3. Do **not** touch `base/deploy/helm/values.yaml` or `base/scripts/rollback.sh`. Scenario 01 commits a full copy of `values.yaml`, so any new line there would be silently removed by scenario 01 and show up as extra drift.
4. Make the scripts executable: `chmod +x demo/seed/payments-api/base/scripts/*.sh`. (The Bitbucket `/src` upload does not carry the mode bit either way; it only matters for local use.)
5. If `payments-api` is already seeded in Bitbucket, run `python3 -I demo/seed/bb_seed.py base payments-api` again: it commits the whole folder on top of `main`. Do this **before** anyone anchors pages, so the commit raises no drift.

Why `scripts/scale-workers.sh` is replaced: the current script takes a positional count, so there is no flag to rename. Scenario 09 needs `--count` to exist in the base so it can become `--replicas`, and the Scale payment workers page documents `--count 6`.

Why `src/server.ts` is replaced: the current one only serves `/healthz`. The pages describe a server that loads config, creates the pool and registers routes, and scenario 10 refactors exactly that.

Why `package.json` is replaced: it gains the `pg` dependency, a `test` script and an `engines` field, so that `package-lock.json` (scenario 05) has something to lock.

## Summary

| Action | Path |
| --- | --- |
| Replace | `package.json` |
| Replace | `scripts/scale-workers.sh` |
| Replace | `src/server.ts` |
| Add | `.env.example` |
| Add | `deploy/helm/templates/deployment.yaml` |
| Add | `deploy/helm/templates/workers.yaml` |
| Add | `package-lock.json` |
| Add | `scripts/drain-queue.sh` |
| Add | `scripts/failover-db.sh` |
| Add | `scripts/replay-webhooks.sh` |
| Add | `scripts/rotate-secrets.sh` |
| Add | `src/config.ts` |
| Add | `src/db/pool.ts` |
| Add | `src/deps.ts` |
| Add | `src/http/router.ts` |
| Add | `src/idempotency.ts` |
| Add | `src/routes/__tests__/charges.test.ts` |
| Add | `src/routes/charges.ts` |
| Add | `src/routes/index.ts` |
| Add | `src/routes/refunds-v1.ts` |
| Add | `src/routes/refunds.ts` |
| Add | `src/routes/webhooks.ts` |
| Add | `src/workers/settlement-worker.ts` |
| Add | `tsconfig.json` |

3 replaced, 21 added.

## Files

### Replace: `package.json`

````json
{
  "name": "payments-api",
  "version": "1.4.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "test": "node --test src/**/__tests__/*.test.ts"
  },
  "dependencies": {
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.1",
    "@types/pg": "^8.11.10",
    "typescript": "^5.6.3"
  }
}
````

### Replace: `scripts/scale-workers.sh`

````bash
#!/usr/bin/env bash
# Scale payment workers.
# Usage: ./scripts/scale-workers.sh --count <n> [--namespace <ns>]
# The count must stay inside workers.min and workers.max from deploy/helm/values.yaml.
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
COUNT=""
MIN=2
MAX=8

while [[ $# -gt 0 ]]; do
  case "$1" in
    --count) COUNT="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$COUNT" ]]; then
  echo "--count is required" >&2
  exit 2
fi
if (( COUNT < MIN || COUNT > MAX )); then
  echo "count must be between $MIN and $MAX (workers.min and workers.max in deploy/helm/values.yaml)" >&2
  exit 2
fi

kubectl -n "$NAMESPACE" scale deployment payments-workers --replicas="$COUNT"
kubectl -n "$NAMESPACE" rollout status deployment payments-workers --timeout=180s
````

### Replace: `src/server.ts`

````typescript
import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { Router } from './http/router.js';
import { registerRoutes } from './routes/index.js';
import { startSettlementWorker } from './workers/settlement-worker.js';

const config = loadConfig();
const pool = createPool(config);
const router = new Router();
registerRoutes(router, { config, pool });

const role = process.env.PAYMENTS_ROLE ?? 'api';

if (role === 'worker') {
  startSettlementWorker({ config, pool });
} else {
  createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const url = new URL(req.url ?? '/', 'http://localhost');
    const found = router.match(req.method ?? 'GET', url.pathname);
    if (!found) {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = rawBody ? JSON.parse(rawBody) : undefined;
      const out = await found.handler({
        method: req.method ?? 'GET',
        path: url.pathname,
        params: found.params,
        headers: req.headers,
        body,
        rawBody,
      });
      res.writeHead(out.status, { 'content-type': 'application/json', ...out.headers });
      res.end(out.body === undefined ? undefined : typeof out.body === 'string' ? out.body : JSON.stringify(out.body));
    } catch (err) {
      console.error('unhandled error', req.method, url.pathname, err);
      res.writeHead(500, { 'content-type': 'application/json' }).end('{"error":"internal_error"}');
    }
  }).listen(config.port, () => {
    console.log(`payments-api listening on ${config.port}`);
  });
}
````

### Add: `.env.example`

````
# Copy to .env for local development. Never commit .env.
PORT=8080
LOG_LEVEL=debug
PAYMENTS_DB_PRIMARY_HOST=localhost
PAYMENTS_DB_REPLICA_HOST=
PAYMENTS_DB_NAME=payments
PAYMENTS_DB_USER=payments_app
PAYMENTS_DB_PASSWORD=local-only
PAYMENTS_DB_POOL=5
PSP_API_KEY=psp_test_local
WEBHOOK_SIGNING_SECRET=whsec_local
PAYMENTS_WORKER_CONCURRENCY=2
SETTLEMENT_BATCH_SIZE=50
SETTLEMENT_ENQUEUE_PAUSED=false
REFUNDS_V1_ENABLED=true
````

### Add: `deploy/helm/templates/deployment.yaml`

````yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  labels:
    app: payments-api
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: 8080
          env:
            - name: PAYMENTS_ROLE
              value: api
            {{- range $name, $value := .Values.env }}
            - name: {{ $name }}
              value: {{ $value | quote }}
            {{- end }}
          envFrom:
            - secretRef:
                name: payments-secrets
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            periodSeconds: 5
````

### Add: `deploy/helm/templates/workers.yaml`

````yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-workers
  labels:
    app: payments-workers
spec:
  replicas: {{ .Values.workers.min }}
  selector:
    matchLabels:
      app: payments-workers
  template:
    metadata:
      labels:
        app: payments-workers
    spec:
      containers:
        - name: worker
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          env:
            - name: PAYMENTS_ROLE
              value: worker
            {{- range $name, $value := .Values.env }}
            - name: {{ $name }}
              value: {{ $value | quote }}
            {{- end }}
          envFrom:
            - secretRef:
                name: payments-secrets
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payments-workers
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payments-workers
  minReplicas: {{ .Values.workers.min }}
  maxReplicas: {{ .Values.workers.max }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
````

### Add: `package-lock.json`

````json
{
  "name": "payments-api",
  "version": "1.4.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "payments-api",
      "version": "1.4.0",
      "dependencies": {
        "pg": "^8.13.1"
      },
      "devDependencies": {
        "@types/node": "^22.10.1",
        "@types/pg": "^8.11.10",
        "typescript": "^5.6.3"
      },
      "engines": {
        "node": ">=24"
      }
    },
    "node_modules/@types/node": {
      "version": "22.10.1",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-22.10.1.tgz",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "undici-types": "~6.20.0"
      }
    },
    "node_modules/@types/pg": {
      "version": "8.11.10",
      "resolved": "https://registry.npmjs.org/@types/pg/-/pg-8.11.10.tgz",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*",
        "pg-protocol": "*",
        "pg-types": "^4.0.1"
      }
    },
    "node_modules/pg": {
      "version": "8.13.1",
      "resolved": "https://registry.npmjs.org/pg/-/pg-8.13.1.tgz",
      "license": "MIT",
      "dependencies": {
        "pg-connection-string": "^2.7.0",
        "pg-pool": "^3.7.0",
        "pg-protocol": "^1.7.0",
        "pg-types": "^2.1.0",
        "pgpass": "1.x"
      },
      "engines": {
        "node": ">= 8.0.0"
      },
      "optionalDependencies": {
        "pg-cloudflare": "^1.1.1"
      }
    },
    "node_modules/pg-cloudflare": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/pg-cloudflare/-/pg-cloudflare-1.1.1.tgz",
      "license": "MIT",
      "optional": true
    },
    "node_modules/pg-connection-string": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/pg-connection-string/-/pg-connection-string-2.7.0.tgz",
      "license": "MIT"
    },
    "node_modules/pg-int8": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/pg-int8/-/pg-int8-1.0.1.tgz",
      "license": "ISC",
      "engines": {
        "node": ">=4.0.0"
      }
    },
    "node_modules/pg-pool": {
      "version": "3.7.0",
      "resolved": "https://registry.npmjs.org/pg-pool/-/pg-pool-3.7.0.tgz",
      "license": "MIT",
      "peerDependencies": {
        "pg": ">=8.0"
      }
    },
    "node_modules/pg-protocol": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/pg-protocol/-/pg-protocol-1.7.0.tgz",
      "license": "MIT"
    },
    "node_modules/pg-types": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/pg-types/-/pg-types-2.2.0.tgz",
      "license": "MIT",
      "dependencies": {
        "pg-int8": "1.0.1",
        "postgres-array": "~2.0.0",
        "postgres-bytea": "~1.0.0",
        "postgres-date": "~1.0.4",
        "postgres-interval": "^1.1.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/pgpass": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/pgpass/-/pgpass-1.0.5.tgz",
      "license": "MIT",
      "dependencies": {
        "split2": "^4.1.0"
      }
    },
    "node_modules/postgres-array": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/postgres-array/-/postgres-array-2.0.0.tgz",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/postgres-bytea": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/postgres-bytea/-/postgres-bytea-1.0.0.tgz",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/postgres-date": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/postgres-date/-/postgres-date-1.0.7.tgz",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/postgres-interval": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/postgres-interval/-/postgres-interval-1.2.0.tgz",
      "license": "MIT",
      "dependencies": {
        "xtend": "^4.0.0"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/split2": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/split2/-/split2-4.2.0.tgz",
      "license": "ISC",
      "engines": {
        "node": ">= 10.x"
      }
    },
    "node_modules/typescript": {
      "version": "5.6.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.6.3.tgz",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/undici-types": {
      "version": "6.20.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-6.20.0.tgz",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/xtend": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/xtend/-/xtend-4.0.2.tgz",
      "license": "MIT",
      "engines": {
        "node": ">=0.4"
      }
    }
  }
}
````

### Add: `scripts/drain-queue.sh`

````bash
#!/usr/bin/env bash
# Drain the settlement queue: hold new settlement jobs, then wait until no job is pending.
# --resume releases held jobs back to pending.
# Usage: ./scripts/drain-queue.sh [--timeout <seconds>] | ./scripts/drain-queue.sh --resume
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
CLUSTER="${PAYMENTS_DB_CLUSTER:-payments-pg}"
TIMEOUT=900

pending() {
  kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- \
    psql -U payments_app -d payments -tAc "SELECT count(*) FROM settlement_jobs WHERE status = 'pending'"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --resume)
      kubectl -n "$NAMESPACE" set env deployment/payments-api SETTLEMENT_ENQUEUE_PAUSED=false
      kubectl -n "$NAMESPACE" rollout status deployment/payments-api --timeout=300s
      kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- \
        psql -U payments_app -d payments -tAc "UPDATE settlement_jobs SET status = 'pending' WHERE status = 'held'"
      echo "settlement enqueue resumed, held jobs released"
      exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

kubectl -n "$NAMESPACE" set env deployment/payments-api SETTLEMENT_ENQUEUE_PAUSED=true
kubectl -n "$NAMESPACE" rollout status deployment/payments-api --timeout=300s

deadline=$(( $(date +%s) + TIMEOUT ))
while :; do
  left="$(pending | tr -d '[:space:]')"
  echo "pending settlement jobs: ${left}"
  [[ "$left" == "0" ]] && break
  if (( $(date +%s) > deadline )); then
    echo "queue not drained after ${TIMEOUT}s" >&2
    exit 1
  fi
  sleep 10
done
echo "settlement queue drained"
````

### Add: `scripts/failover-db.sh`

````bash
#!/usr/bin/env bash
# Fail over the payments Postgres cluster (Patroni) to a replica, then restart the
# payments pods so their pools reconnect to the new primary.
# Usage: ./scripts/failover-db.sh --candidate <member> [--force]
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
CLUSTER="${PAYMENTS_DB_CLUSTER:-payments-pg}"
CANDIDATE=""
FORCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --candidate) CANDIDATE="$2"; shift 2 ;;
    --force) FORCE="--force"; shift ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$CANDIDATE" ]]; then
  echo "--candidate is required (see: patronictl list)" >&2
  exit 2
fi

kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- patronictl list "$CLUSTER"
kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- \
  patronictl failover "$CLUSTER" --candidate "$CANDIDATE" ${FORCE}

kubectl -n "$NAMESPACE" rollout restart deployment/payments-api deployment/payments-workers
kubectl -n "$NAMESPACE" rollout status deployment/payments-api --timeout=300s
````

### Add: `scripts/replay-webhooks.sh`

````bash
#!/usr/bin/env bash
# Replay PSP webhook events from webhook_dead_letters through the internal replay endpoint.
# Usage: ./scripts/replay-webhooks.sh [--since <ISO-8601>] [--limit <n>] [--dry-run]
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
CLUSTER="${PAYMENTS_DB_CLUSTER:-payments-pg}"
SINCE="1970-01-01T00:00:00Z"
LIMIT=500
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --since) SINCE="$2"; shift 2 ;;
    --limit) LIMIT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

ids=$(kubectl -n "$NAMESPACE" exec "statefulset/${CLUSTER}" -- \
  psql -U payments_app -d payments -tAc \
  "SELECT event_id FROM webhook_dead_letters WHERE created_at >= '${SINCE}' ORDER BY created_at LIMIT ${LIMIT}")

count=0
for id in $ids; do
  count=$((count + 1))
  if (( DRY_RUN )); then echo "would replay ${id}"; continue; fi
  kubectl -n "$NAMESPACE" exec deployment/payments-api -- \
    curl -fsS -X POST "http://localhost:8080/internal/webhooks/replay/${id}"
  echo
done
echo "events: ${count}"
````

### Add: `scripts/rotate-secrets.sh`

````bash
#!/usr/bin/env bash
# Rotate one payments secret in Vault and restart the pods that read it.
# Usage: ./scripts/rotate-secrets.sh --secret <psp-api-key|webhook-signing-secret|db-password> --value-file <path>
# Pods recieve the new value on restart; this script restarts them for you.
set -euo pipefail

NAMESPACE="${PAYMENTS_NAMESPACE:-payments}"
VAULT_PATH="${PAYMENTS_VAULT_PATH:-secret/payments}"
SECRET=""
VALUE_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --secret) SECRET="$2"; shift 2 ;;
    --value-file) VALUE_FILE="$2"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

case "$SECRET" in
  psp-api-key) FIELD="PSP_API_KEY" ;;
  webhook-signing-secret) FIELD="WEBHOOK_SIGNING_SECRET" ;;
  db-password) FIELD="PAYMENTS_DB_PASSWORD" ;;
  *) echo "--secret must be psp-api-key, webhook-signing-secret or db-password" >&2; exit 2 ;;
esac

[[ -r "$VALUE_FILE" ]] || { echo "--value-file is required and must be readable" >&2; exit 2; }

vault kv patch "$VAULT_PATH" "${FIELD}=@${VALUE_FILE}"
kubectl -n "$NAMESPACE" annotate externalsecret payments-secrets force-sync="$(date +%s)" --overwrite
kubectl -n "$NAMESPACE" rollout restart deployment/payments-api deployment/payments-workers
kubectl -n "$NAMESPACE" rollout status deployment/payments-api --timeout=300s
````

### Add: `src/config.ts`

````typescript
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
````

### Add: `src/db/pool.ts`

````typescript
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
````

### Add: `src/deps.ts`

````typescript
import type pg from 'pg';
import type { Config } from './config.js';

export interface Deps {
  config: Config;
  pool: pg.Pool;
}
````

### Add: `src/http/router.ts`

````typescript
import type { IncomingHttpHeaders } from 'node:http';

export interface Request {
  method: string;
  path: string;
  params: Record<string, string>;
  headers: IncomingHttpHeaders;
  body: unknown;
  rawBody: string;
}

export interface Response {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export type Handler = (req: Request) => Promise<Response> | Response;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

// Minimal path router: exact segments and :params only.
export class Router {
  private readonly routes: Route[] = [];

  get(path: string, handler: Handler): void {
    this.add('GET', path, handler);
  }

  post(path: string, handler: Handler): void {
    this.add('POST', path, handler);
  }

  match(method: string, path: string): { handler: Handler; params: Record<string, string> } | undefined {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = route.pattern.exec(path);
      if (!m) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { handler: route.handler, params };
    }
    return undefined;
  }

  private add(method: string, path: string, handler: Handler): void {
    const keys: string[] = [];
    const source = path.replace(/:(\w+)/g, (_, k: string) => {
      keys.push(k);
      return '([^/]+)';
    });
    this.routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler });
  }
}
````

### Add: `src/idempotency.ts`

````typescript
import { createHash } from 'node:crypto';
import type pg from 'pg';
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
      console.warn('idempotency key reused with a different body', key);
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
````

### Add: `src/routes/__tests__/charges.test.ts`

````typescript
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateChargeRequest } from '../charges.ts';

test('accepts a valid charge', () => {
  const out = validateChargeRequest({ amount: 1250, currency: 'EUR', source: 'src_4f9a' });
  assert.deepEqual(out, { amount: 1250, currency: 'EUR', source: 'src_4f9a', description: undefined });
});

test('rejects a non-integer amount', () => {
  assert.equal(validateChargeRequest({ amount: 12.5, currency: 'EUR', source: 'src_4f9a' }), 'amount_invalid');
});

test('rejects an unsupported currency', () => {
  assert.equal(validateChargeRequest({ amount: 100, currency: 'JPY', source: 'src_4f9a' }), 'currency_unsupported');
});

test('rejects a source without the src_ prefix', () => {
  assert.equal(validateChargeRequest({ amount: 100, currency: 'USD', source: 'card_1' }), 'source_invalid');
});
````

### Add: `src/routes/charges.ts`

````typescript
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
````

### Add: `src/routes/index.ts`

````typescript
import type { Deps } from '../deps.js';
import type { Router } from '../http/router.js';
import { registerCharges } from './charges.js';
import { registerRefunds } from './refunds.js';
import { registerLegacyRefunds } from './refunds-v1.js';
import { registerWebhooks } from './webhooks.js';

export function registerRoutes(router: Router, deps: Deps): void {
  router.get('/healthz', () => ({ status: 200, body: 'ok' }));
  registerCharges(router, deps);
  registerRefunds(router, deps);
  if (deps.config.refundsV1Enabled) registerLegacyRefunds(router, deps);
  registerWebhooks(router, deps);
}
````

### Add: `src/routes/refunds-v1.ts`

````typescript
import type { Deps } from '../deps.js';
import type { Router } from '../http/router.js';

// Legacy v1 refunds. Full refunds only, amounts in amount_cents, no idempotency.
// Registered only when REFUNDS_V1_ENABLED is true. Removal tracked in PAY-158 (ADR-009).
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
````

### Add: `src/routes/refunds.ts`

````typescript
import type { Deps } from '../deps.js';
import type { Router } from '../http/router.js';
import { withIdempotency } from '../idempotency.js';

const REASONS = new Set(['requested_by_customer', 'duplicate', 'fraudulent']);

// POST /v2/refunds supports partial refunds (PAY-152).
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
````

### Add: `src/routes/webhooks.ts`

````typescript
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Deps } from '../deps.js';
import type { Router } from '../http/router.js';

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
      console.error('webhook processing failed, moved to dead letters', event.id, err);
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
````

### Add: `src/workers/settlement-worker.ts`

````typescript
import type { Deps } from '../deps.js';

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
      console.error('settlement batch failed', err);
      return 0;
    } finally {
      client.release();
    }
  }
}
````

### Add: `tsconfig.json`

````json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["src/**/__tests__/**"]
}
````
