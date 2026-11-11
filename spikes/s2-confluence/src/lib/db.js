// Spike S7: Forge SQL schema, migration runner, seed and dashboard benchmark.
import { sql, migrationRunner } from '@forge/sql';

// Idempotent DDL, one statement per migration (Forge SQL allows one statement per call).
const MIGRATIONS = [
  [
    'v001_create_page_state',
    `CREATE TABLE IF NOT EXISTS page_state (
      page_id VARCHAR(32) NOT NULL,
      space_key VARCHAR(255) NOT NULL,
      owner_id VARCHAR(128) NULL,
      status VARCHAR(20) NOT NULL,
      open_event_count INT NOT NULL DEFAULT 0,
      max_severity TINYINT NOT NULL DEFAULT 0,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (page_id)
    )`,
  ],
  ['v002_idx_space_status', 'CREATE INDEX IF NOT EXISTS idx_ps_space_status ON page_state (space_key, status)'],
  ['v003_idx_owner_status', 'CREATE INDEX IF NOT EXISTS idx_ps_owner_status ON page_state (owner_id, status)'],
  [
    'v004_idx_status_severity',
    'CREATE INDEX IF NOT EXISTS idx_ps_status_sev ON page_state (status, max_severity, updated_at)',
  ],
];

export async function applyMigrations() {
  let runner = migrationRunner;
  for (const [name, ddl] of MIGRATIONS) runner = runner.enqueue(name, ddl);
  return runner.run();
}

// Async-consumer handler with the documented 60 s retry loop (25 DDL/min limit).
export async function runMigrationWithRetry() {
  const deadline = Date.now() + 60000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const applied = await applyMigrations();
      const listed = await migrationRunner.list();
      console.log('S7 migrations applied:', JSON.stringify(applied), 'listed:', JSON.stringify(listed));
      return;
    } catch (e) {
      lastError = e;
      console.warn('S7 migration attempt failed, retrying:', e?.message || e);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastError;
}

const SPACES = ['PLAT', 'MOBILE', 'DATA', 'OPS', 'WEB'];
const STATUSES = ['verified', 'possibly_stale', 'stale', 'unanchored'];
const OWNERS = ['acc-ana', 'acc-bo', 'acc-cy', 'acc-dee', 'acc-eli', 'acc-fay', 'acc-gus', 'acc-hal'];

// Deterministic pseudo-random so reruns produce the same rows.
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

// Insert `n` rows in one multi-row statement (upsert so it is idempotent).
export async function seed(n = 200) {
  const r = rng(42);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const status = STATUSES[Math.floor(r() * STATUSES.length)];
    const open = status === 'verified' || status === 'unanchored' ? 0 : 1 + Math.floor(r() * 5);
    const sev = open === 0 ? 0 : 1 + Math.floor(r() * 3); // 1 low, 2 medium, 3 high
    rows.push([
      String(900000 + i),
      SPACES[i % SPACES.length],
      OWNERS[Math.floor(r() * OWNERS.length)],
      status,
      open,
      sev,
    ]);
  }
  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const t0 = Date.now();
  const res = await sql
    .prepare(
      `INSERT INTO page_state (page_id, space_key, owner_id, status, open_event_count, max_severity) VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE status = VALUES(status), open_event_count = VALUES(open_event_count),
       max_severity = VALUES(max_severity), owner_id = VALUES(owner_id), updated_at = CURRENT_TIMESTAMP(3)`
    )
    .bindParams(...rows.flat())
    .execute();
  return { rows: n, ms: Date.now() - t0, affected: res.rows?.affectedRows };
}

export const QUERIES = {
  groupBySpaceStatus:
    'SELECT space_key, status, COUNT(*) AS n FROM page_state GROUP BY space_key, status ORDER BY space_key, status',
  topBySeverity: `SELECT page_id, space_key, owner_id, status, max_severity, open_event_count, updated_at
     FROM page_state WHERE status IN ('possibly_stale', 'stale')
     ORDER BY max_severity DESC, open_event_count DESC, updated_at DESC LIMIT 10`,
  oneSpaceByStatus: "SELECT status, COUNT(*) AS n FROM page_state WHERE space_key = 'PLAT' GROUP BY status",
  ownerCounts:
    "SELECT owner_id, COUNT(*) AS n FROM page_state WHERE status IN ('possibly_stale','stale') GROUP BY owner_id ORDER BY n DESC",
};

function stats(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, min: s[0], p50: q(0.5), p95: q(0.95), max: s[s.length - 1] };
}

export async function bench(iterations = 15) {
  const out = {};
  for (const [name, q] of Object.entries(QUERIES)) {
    const times = [];
    let sample;
    for (let i = 0; i < iterations; i++) {
      const t0 = Date.now();
      const res = await sql.prepare(q).execute();
      times.push(Date.now() - t0);
      sample = res.rows;
    }
    out[name] = { ms: stats(times), rowCount: sample.length, sample: sample.slice(0, 25) };
  }
  // Hot-path single-row upsert (what the matcher does per page).
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = Date.now();
    await sql
      .prepare(
        `INSERT INTO page_state (page_id, space_key, owner_id, status, open_event_count, max_severity)
         VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status),
         open_event_count = open_event_count + 1, updated_at = CURRENT_TIMESTAMP(3)`
      )
      .bindParams('899999', 'PLAT', 'acc-ana', 'possibly_stale', 1, 2)
      .execute();
    times.push(Date.now() - t0);
  }
  out.singleRowUpsert = { ms: stats(times) };
  return out;
}

// Probe statements that the query policy may reject; record what happens.
export async function policyProbe() {
  const probes = {
    explain: 'EXPLAIN SELECT space_key, status, COUNT(*) FROM page_state GROUP BY space_key, status',
    showTables: 'SHOW TABLES',
    showIndex: 'SHOW INDEX FROM page_state',
    infoSchema:
      "SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME FROM information_schema.statistics WHERE TABLE_NAME = 'page_state'",
    multiStatement: 'SELECT 1; SELECT 2',
    sleep: 'SELECT SLEEP(0)',
    setSession: 'SET SESSION tidb_mem_quota_query = 1073741824',
    userVar: 'SET @x = 1',
    windowFn:
      'SELECT space_key, status, ROW_NUMBER() OVER (PARTITION BY space_key ORDER BY max_severity DESC) AS rn FROM page_state LIMIT 3',
    cte: 'WITH c AS (SELECT status, COUNT(*) n FROM page_state GROUP BY status) SELECT * FROM c',
    jsonFn: "SELECT JSON_OBJECT('a', COUNT(*)) AS j FROM page_state",
  };
  const out = {};
  for (const [name, q] of Object.entries(probes)) {
    try {
      const res = await sql.executeRaw(q);
      out[name] = { ok: true, rows: Array.isArray(res.rows) ? res.rows.slice(0, 5) : res.rows };
    } catch (e) {
      out[name] = { ok: false, code: e?.code || e?.name, message: String(e?.message || e).slice(0, 300) };
    }
  }
  return out;
}
