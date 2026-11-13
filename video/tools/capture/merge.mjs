// Merges entries/*.json and meta.json into src/data/captures.json (the manifest this agent owns).
import fs from 'node:fs';
import path from 'node:path';
import { HERE, VIDEO, OUT } from './lib.mjs';

const dir = path.join(HERE, 'entries');
const entries = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const order = ['id', 'file', 'kind', 'width', 'height', 'fps', 'takenAt', 'env', 'app', 'page', 'shows', 'clicks', 'hovers', 'masks', 'notes'];
const sorted = entries
  .map((e) => Object.fromEntries([...order.filter((k) => k in e).map((k) => [k, e[k]]), ...Object.entries(e).filter(([k]) => !order.includes(k))]))
  .sort((a, b) => (a.takenAt < b.takenAt ? -1 : a.takenAt > b.takenAt ? 1 : a.id.localeCompare(b.id)));
const missing = sorted.filter((e) => !fs.existsSync(path.join(VIDEO, 'public', e.file)));
const meta = JSON.parse(fs.readFileSync(path.join(HERE, 'meta.json'), 'utf8'));
const out = {
  note: 'Real product captures for the launch video (capture agent). Coordinates are capture pixels (2x CSS, 3840x2160). Videos are constant 60 fps with real timing; clicks[].atMs and hovers[].atMs count from the first frame. Masks cover the "(Development)" suffix only (BRIEF decision 7). Log: tools/capture/LOG.md.',
  captures: sorted,
  ...meta,
};
const target = path.join(VIDEO, 'src', 'data', 'captures.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`captures.json: ${sorted.length} entries${missing.length ? `, MISSING FILES: ${missing.map((m) => m.file).join(', ')}` : ''}`);
void OUT;
