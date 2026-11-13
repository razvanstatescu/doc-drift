// Exploration still: node tools/capture/shot.mjs <out.png> [--goto url] [--match urlPart] [--scrollTo selectorText]
// Saves a 3840x2160 PNG plus a 1600 px wide JPEG preview next to it (for looking at it).
import { connect, sleep } from './lib.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
const out = args[0];
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const s = await connect(opt('--match'));
if (opt('--goto')) await s.goto(opt('--goto'), Number(opt('--wait') || 5000));
else await sleep(Number(opt('--wait') || 1200));
if (opt('--scrollY')) {
  await s.page.evaluate((y) => window.scrollTo(0, Number(y)), opt('--scrollY'));
  await sleep(800);
}
const { data } = await s.cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
fs.writeFileSync(out, Buffer.from(data, 'base64'));
const prev = out.replace(/\.png$/, '.preview.jpg');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', 'scale=1600:-1', '-q:v', '3', prev]);
console.log(JSON.stringify({ out, prev, url: s.page.url(), title: await s.page.title() }));
await s.close();
process.exit(0);
