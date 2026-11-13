// Sets "Wait before commenting, in minutes" on the core settings page and saves.
// node tools/capture/set_delay.mjs <minutes>
import { connect, log, sleep } from './lib.mjs';

const SETTINGS = 'https://one-atlas-jzzf.atlassian.net/wiki/admin/forge/apps/12e968a1-a45d-4524-ba28-d47e2315db1a/b7eadd8c-211c-4cdf-98c0-86172909ead2/dds-settings';
const minutes = String(process.argv[2]);
const s = await connect('dds-settings');
if (!s.page.url().includes('dds-settings')) await s.goto(SETTINGS, 6000);
const input = s.page.getByLabel('Wait before commenting, in minutes');
await input.waitFor({ state: 'visible', timeout: 30000 });
const before = await input.inputValue();
await input.fill(minutes);
await sleep(300);
await s.page.getByRole('button', { name: 'Save settings' }).click();
await s.page.getByText('Saved', { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
await sleep(500);
// Reload and read it back.
await s.goto(SETTINGS, 6000);
const again = s.page.getByLabel('Wait before commenting, in minutes');
await again.waitFor({ state: 'visible', timeout: 30000 });
const after = await again.inputValue();
log(`Settings: "Wait before commenting, in minutes" ${before} -> ${minutes} (Save settings; reloaded value ${after})`);
await s.close();
process.exit(after === minutes ? 0 : 1);
