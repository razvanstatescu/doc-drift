import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { createApp } from './http/app.js';
import { log, setLogLevel } from './http/logger.js';
import { Router } from './http/router.js';
import { mountRoutes } from './routes/index.js';
import { startSettlementWorker } from './workers/settlement-worker.js';

const config = loadConfig();
setLogLevel(config.logLevel);
const pool = createPool(config);
const router = new Router();
mountRoutes(router, { config, pool });

const role = process.env.PAYMENTS_ROLE ?? 'api';

if (role === 'worker') {
  startSettlementWorker({ config, pool });
} else {
  createServer(createApp(router)).listen(config.port, () => {
    log.info('payments-api listening', { port: config.port });
  });
}
