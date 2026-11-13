// Scribe (scribe_v3) word timings for each candidate voice line. Sends only a short excerpt around the line,
// logs every paid call to tools/plates/gen-log.jsonl (credits before/after from /v1/user/subscription), and
// writes the raw transcript to tools/plates/cache/stt-<name>.json (git-ignored). Keys never printed.
// Usage: node tools/plates/clips-stt.mjs <download-root> [name ...]
//        node tools/plates/clips-stt.mjs --cuts [name ...]   (transcribe the finished public/clips/<name>.wav)
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as eleven from '../lib/eleven.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CUTS = process.argv[2] === '--cuts';
const root = CUTS ? resolve(here, '../../public/clips') : resolve(process.argv[2]);
const only = process.argv.slice(3);
const cache = resolve(here, 'cache');
mkdirSync(cache, { recursive: true });
const LOG = resolve(here, 'gen-log.jsonl');

// sectionStart = source time of sample 0 in <name>-exact/<name>-audio.wav; excerpt = [from, to] within it (s).
const CLIPS = [
  { name: 'ariel', sectionStart: 965, excerpt: [10, 30] },
  { name: 'osmani', sectionStart: 820, excerpt: [8, 28] },
  { name: 'khirnov', sectionStart: 625, excerpt: [8, 30] },
];

for (const c of CLIPS.filter((c) => !only.length || only.includes(c.name))) {
  const src = CUTS ? `${root}/${c.name}.wav` : `${root}/${c.name}-exact/${c.name}-audio.wav`;
  const ex = CUTS ? `${cache}/${c.name}-cut-mono.wav` : `${root}/${c.name}-exact/${c.name}-stt-excerpt.wav`;
  const [a, b] = CUTS ? [0, null] : c.excerpt;
  execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...(CUTS ? [] : ['-ss', String(a), '-to', String(b)]), '-i', src, '-ac', '1', '-c:a', 'pcm_s16le', ex]);
  const before = await eleven.subscription();
  const t0 = Date.now();
  const res = await eleven.stt(ex, { modelId: 'scribe_v3', languageCode: 'en', timestampsGranularity: 'word' });
  const after = await eleven.subscription();
  const used = after.character_count - before.character_count;
  const out = CUTS ? { name: c.name, of: `public/clips/${c.name}.wav`, model: 'scribe_v3', result: res } : { ...c, excerptSourceStart: c.sectionStart + a, model: 'scribe_v3', result: res };
  writeFileSync(`${cache}/stt-${c.name}${CUTS ? '-cut' : ''}.json`, JSON.stringify(out, null, 1));
  const entry = {
    ts: new Date().toISOString(),
    agent: 'evidence',
    call: 'elevenlabs speech-to-text',
    model: 'scribe_v3',
    input: CUTS ? `public/clips/${c.name}.wav (the finished cut, mono mix)` : `${c.name} excerpt ${c.sectionStart + a}-${c.sectionStart + b} s of the source (${b - a} s, mono 48 kHz)`,
    creditsBefore: before.character_count,
    creditsAfter: after.character_count,
    creditsUsed: used,
    ms: Date.now() - t0,
  };
  appendFileSync(LOG, JSON.stringify(entry) + '\n');
  console.log(c.name, 'credits used', used, '| text:', res.text);
}
