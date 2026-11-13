// Exploration: open the runbook, click the Doc Drift byline item, screenshot the modal, dump its text.
// node tools/capture/explore_badge.mjs <out.png> [pageUrl]
import { connect, sleep, RUNBOOK } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const out = process.argv[2];
const url = process.argv[3] || RUNBOOK;
const s = await connect();
await s.goto(url, 5000);
const byline = s.page.getByText(/Doc Drift \(Development\)/).first();
await byline.waitFor({ state: 'visible', timeout: 30000 });
const bb = await byline.boundingBox();
console.log('byline', await byline.textContent(), JSON.stringify(bb));
await byline.click();
await sleep(6000);
const dialog = s.page.getByRole('dialog').first();
await dialog.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
await sleep(2500);
const text = await dialog.innerText().catch(() => '(no dialog)');
console.log(text.slice(0, 4000));
const { data } = await s.cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
fs.writeFileSync(out, Buffer.from(data, 'base64'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', 'scale=1600:-1', '-q:v', '3', out.replace(/\.png$/, '.preview.jpg')]);
await s.close();
process.exit(0);
