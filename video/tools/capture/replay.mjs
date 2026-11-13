// Re-capture prep: settings -> Get started -> "Replay seeded PR #482" (the app's demo path), then poll the
// runbook's byline property until it is flagged.
import { connect, log, sleep } from './lib.mjs';
import { byline } from './rest.mjs';

const SETTINGS = 'https://one-atlas-jzzf.atlassian.net/wiki/admin/forge/apps/12e968a1-a45d-4524-ba28-d47e2315db1a/b7eadd8c-211c-4cdf-98c0-86172909ead2/dds-settings';
const s = await connect('dds-settings');
await s.goto(SETTINGS, 7000);
const btn = s.page.getByRole('button', { name: 'Replay seeded PR #482' });
await btn.waitFor({ state: 'visible', timeout: 60000 });
const before = await byline('2720100');
await btn.click();
const t0 = Date.now();
await sleep(4000);
const msg = (await s.page.locator('body').innerText()).match(/[^\n]*(replay|Replay|queued|Queued|seeded)[^\n]*/g)?.slice(0, 6).join(' | ');
log(`Settings: clicked "Replay seeded PR #482" at ${new Date(t0).toISOString()} (runbook before: ${before?.title}). Page text near it: ${msg}`);
let flagged = null;
for (let i = 0; i < 300 && !flagged; i++) {
  const b = await byline('2720100').catch(() => null);
  if (b?.title && !b.title.startsWith('Verified')) flagged = { ...b, secs: (Date.now() - t0) / 1000 };
  else await sleep(1000);
}
log(`Replay: runbook byline now "${flagged?.title}" (${flagged?.secs?.toFixed(1)} s after the click), tooltip "${flagged?.tooltip}"`);
await s.close();
process.exit(flagged ? 0 : 1);
