#!/usr/bin/env node
// Generate the raw effects with ElevenLabs (eleven_text_to_sound_v3, 48 kHz WAV) into tools/sfx/cache/raw/.
//   node tools/sfx/generate.mjs                  every missing take (specs.mjs; `takes` per effect, default 1)
//   node tools/sfx/generate.mjs --regen a,b      one more take each (saved as <id>.t<n>.wav)
//   node tools/sfx/generate.mjs --only a,b       limit to these ids
// Every call is logged in tools/audio/gen-log.jsonl (phase "sfx"). Keys load in tools/lib/env.mjs; never printed.
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, creditsUsed, ensureDir, guardCredits } from '../audio/lib.mjs';
import { eleven, sfx } from '../audio/paid.mjs';
import { SPECS } from './specs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const RAW = ensureDir(resolve(here, 'cache', 'raw'));
const a = argv();
const only = a.only ? new Set(String(a.only).split(',')) : null;
const regen = a.regen ? new Set(String(a.regen).split(',')) : new Set();

async function one(s, take, format) {
  const out = resolve(RAW, `${s.id}.t${take}.wav`);
  if (existsSync(out)) return null;
  const durationSeconds = Math.max(0.5, s.gen ?? s.dur);
  const rt = s.retakes?.find((r) => r.take === take);
  const prompt = rt?.prompt ?? s.prompt;
  const buf = await sfx(prompt, { durationSeconds, promptInfluence: rt?.influence ?? s.influence ?? 0.6, outputFormat: format, modelId: 'eleven_text_to_sound_v3' }, { phase: 'sfx', id: s.id, take, retake: !!rt });
  writeFileSync(out, buf);
  return { out, cost: buf.meta?.characterCost, ms: buf.meta?.ms };
}

const before = await creditsUsed(eleven);
await guardCredits(eleven, 300);
let format = 'wav_48000';
for (const s of SPECS) {
  if (only && !only.has(s.id)) continue;
  const n = s.takes ?? 1;
  const takes = [...new Set([...Array(n).keys(), ...(s.retakes ?? []).map((r) => r.take)])];
  if (regen.has(s.id)) { let k = n; while (existsSync(resolve(RAW, `${s.id}.t${k}.wav`))) k++; takes.push(k); }
  for (const t of takes) {
    try {
      const r = await one(s, t, format);
      if (r) console.log(`${s.id} t${t}: cost=${r.cost} ${r.ms}ms`);
    } catch (e) {
      if (format === 'wav_48000' && [400, 403, 422].includes(e.status)) { console.warn(`wav_48000 refused (${e.status}); switching to mp3_44100_192`); format = 'mp3_44100_192'; const r = await one(s, t, format); if (r) console.log(`${s.id} t${t}: cost=${r.cost}`); }
      else throw e;
    }
  }
}
const after = await creditsUsed(eleven);
console.log(JSON.stringify({ creditsBefore: before.used, creditsAfter: after.used, oursTotal: after.ours }));
