#!/usr/bin/env node
// One command for the narration side of the audio pipeline (see tools/audio/AUDIO.md):
//   node tools/audio/run.mjs [--film v4|v5]            vo.mjs (cached per line; a changed voice, model or text re-voices)
//                                                      -> timeline -> QA                      (default --film v5)
//   node tools/audio/run.mjs [--film v4|v5] --scribe   ...and the paid full-narration Scribe check (with WER) in QA
// v5 writes src/data/timeline.json (the film the picture code reads); v4 writes src/data/timeline-v4.json.
// To swap the narrator: edit VOICE in tools/audio/config.mjs and re-run. If the scene grid moves, the timeline builder
// marks the score entry `pending` and says so. v5 re-fits its score itself (score-v5.mjs writes the edit list from the
// timeline and renders it); v4: re-edit tools/audio/arrangements/score.json, then
//   python3 -I tools/audio/arrange.py tools/audio/arrangements/score.json && node tools/audio/timeline.mjs
// Music (paid, v4's take): node tools/audio/music.mjs --score [--seed N]; effects: node tools/sfx/generate.mjs && node tools/sfx/process.mjs
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filmOf } from './config.mjs';
import { argv } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const step = (file, args = []) => {
  console.log(`\n== ${file} ${args.join(' ')}`);
  const r = spawnSync('node', [resolve(here, file), ...args], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const film = filmOf(argv().film ?? 'v5');
const rest = process.argv.slice(2).filter((x, i, all) => x !== '--scribe' && x !== '--film' && all[i - 1] !== '--film');
step('vo.mjs', ['--film', film.name, ...rest]);
step(film.timelineScript);
if (film.name === 'v5') step('score-v5.mjs'); // re-fit score-v5.wav to the timeline (no spend)
step('qa.mjs', ['--film', film.name, ...(process.argv.includes('--scribe') ? [] : ['--no-scribe'])]);
// QA measures the score (BPM, first beat, loudness); the timeline's music entry carries those, so rebuild it once more
step(film.timelineScript);
