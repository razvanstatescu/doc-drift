// Extras: the core settings page's Bitbucket relay section (Connected, last change), as a still.
import { connect, devMasks, log, sleep, stage } from './lib.mjs';

const SETTINGS = 'https://one-atlas-jzzf.atlassian.net/wiki/admin/forge/apps/12e968a1-a45d-4524-ba28-d47e2315db1a/b7eadd8c-211c-4cdf-98c0-86172909ead2/dds-settings';
const s = await connect();
await s.goto(SETTINGS, 7000);
const h = s.page.getByRole('heading', { name: 'Bitbucket relay' }).first();
await h.waitFor({ state: 'visible', timeout: 60000 });
await s.moveTo(1880, 1000, { steps: 1, stepMs: 0 });
await s.page.evaluate(() => window.scrollTo(0, 0));
await sleep(800);
const box = await h.boundingBox();
// Bring the relay card near the top of the frame (window scroll; no CSS changes).
await s.page.mouse.wheel(0, Math.max(0, box.y - 180));
await sleep(1500);
const card = (await h.locator('xpath=ancestor::*[3]').innerText().catch(() => '')).replace(/\s+/g, ' ');
await s.still('x-settings-relay');
stage({
  id: 'x-settings-relay', file: 'captures/x-settings-relay.png', page: 'Confluence administration > Doc Drift Sentinel (Development) settings',
  shows: 'The Bitbucket relay section of the settings page: Connected, workspace, last test ping, last change, repositories seen, ingest URL, relay secret fingerprint.',
  masks: await devMasks(s.page), notes: card.slice(0, 700),
});
await s.page.evaluate(() => window.scrollTo(0, 0));
await sleep(1200);
await s.still('x-settings-top');
stage({ id: 'x-settings-top', file: 'captures/x-settings-top.png', page: 'Confluence administration > Doc Drift Sentinel (Development) settings', shows: 'Top of the settings page: Get started (relay Done, anchor pages, demo replay of PR #482) and the Bitbucket relay card.', masks: await devMasks(s.page) });
log(`Capture: settings page stills (relay section). ${card.slice(0, 300)}`);
await s.close();
process.exit(0);
