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
