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
