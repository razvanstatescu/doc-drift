#!/usr/bin/env node
// One command for the narration side of the audio pipeline (see tools/audio/AUDIO.md):
//   node tools/audio/run.mjs            vo.mjs (cached per line; a changed voice, model or text re-voices) -> timeline -> QA
//   node tools/audio/run.mjs --scribe   ...and the paid full-narration Scribe check in QA
// To swap the narrator: edit VOICE in tools/audio/config.mjs and re-run. If the scene grid moves, timeline.mjs marks the
// score entry `pending` and says so: re-edit tools/audio/arrangements/score.json, then
//   python3 -I tools/audio/arrange.py tools/audio/arrangements/score.json && node tools/audio/timeline.mjs
// Music (paid): node tools/audio/music.mjs --score [--seed N]; effects: node tools/sfx/generate.mjs && node tools/sfx/process.mjs
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const step = (file, args = []) => {
  console.log(`\n== ${file} ${args.join(' ')}`);
  const r = spawnSync('node', [resolve(here, file), ...args], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const pass = process.argv.slice(2).filter((x) => x !== '--scribe');
step('vo.mjs', pass);
step('timeline.mjs');
step('qa.mjs', process.argv.includes('--scribe') ? [] : ['--no-scribe']);
