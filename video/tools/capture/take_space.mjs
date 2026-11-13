// Take: PLAT Drift dashboard, click "Anchor this space", the suggestions table appears. Never saves.
// node tools/capture/take_space.mjs <idPrefix> "<note>"
import { connect, devMasks, log, sleep, stage } from './lib.mjs';

export const DASH = 'https://one-atlas-jzzf.atlassian.net/wiki/spaces/PLAT/apps/12e968a1-a45d-4524-ba28-d47e2315db1a/b7eadd8c-211c-4cdf-98c0-86172909ead2/drift-dashboard';
const prefix = process.argv[2] || 'p1-anchor-this-space';
const note = process.argv[3] || '';

const s = await connect();
await s.goto(DASH, 4000);
await s.page.getByText('Pages anchored').first().waitFor({ state: 'visible', timeout: 60000 });
await sleep(2500);
await s.moveTo(1100, 300, { steps: 1, stepMs: 0 });
const kpi = await s.page.getByText('Pages anchored').first().locator('xpath=..').innerText().catch(() => '');
await s.still(`${prefix}-before`);
const maskBefore = await devMasks(s.page);

await s.startRecording(prefix);
await sleep(900);
const btn = await s.box(s.page.getByRole('button', { name: 'Anchor this space' }));
await s.click(btn, 'Anchor this space');
// Wait for the suggestions table (pages with suggested anchors).
await s.page.getByText('Suggested anchors').first().waitFor({ state: 'visible', timeout: 90000 });
await sleep(2500);
const rec = await s.stopRecording({ tailMs: 900 });
await s.still(prefix);
const masks = await devMasks(s.page);
const tableText = await s.page.locator('table').filter({ hasText: 'Suggested anchors' }).first().innerText().catch(() => '');
const saveLabel = await s.page.getByRole('button', { name: /Save anchors/ }).first().innerText().catch(() => '');

stage({ id: `${prefix}-before`, file: `captures/${prefix}-before.png`, page: 'PLAT Drift dashboard', shows: `Drift dashboard before clicking Anchor this space. KPI: ${kpi.replace(/\s+/g, ' ').trim()}`, masks: maskBefore, notes: note });
stage({
  id: prefix, file: `captures/${prefix}.png`, page: 'PLAT Drift dashboard',
  shows: `"Anchor this space": the table of unanchored PLAT pages with suggested anchors (strong ones pre-checked). Not saved. Save button reads "${saveLabel}".`,
  masks, notes: `${note} Table text: ${tableText.replace(/\s+/g, ' ').slice(0, 600)}`,
});
stage({
  id: `${prefix}-rec`, file: `captures/${prefix}.mp4`, kind: 'video', fps: 60, page: 'PLAT Drift dashboard',
  shows: 'Click "Anchor this space"; the suggestions table loads. Not saved.', clicks: rec.clicks, hovers: rec.hovers,
  masks, notes: `${note} Start still ${prefix}-before.png, end still ${prefix}.png. Source frames: ${JSON.stringify(rec.stats)}`,
});
log(`Capture: ${prefix} (dashboard Anchor this space, opened the suggestions table, did not save). ${JSON.stringify(rec.stats)}`);
await s.close();
process.exit(0);
