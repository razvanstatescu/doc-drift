#!/usr/bin/env node
// Composite effects built from generated takes (no new generation). Each composite is written to
// tools/sfx/cache/raw/<id>.c<n>.wav and then scored by process.mjs like any other take.
//   node tools/sfx/composite.mjs
// slip.c0: none of the four slip generations had both parts. Takes 0-1 latch cleanly but their slide sits 25 dB under
// the latch (inaudible); takes 2-3 slide audibly for 0.8 s but never latch. c0 = take 3's slide (its first 0.34 s,
// faded in over 30 ms and out over 40 ms into the latch) laid 12 dB under take 1's latch click (its dry 0.2 s).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, decode, db, writeJson, writeWav } from '../audio/lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(here, 'cache', 'raw');

const rms = (ch, a, b) => { let s = 0; for (let i = a; i < b; i++) s += (ch[0][i] ** 2 + ch[1][i] ** 2) / 2; return Math.sqrt(s / Math.max(1, b - a)); };
function onset(ch, relDb = -40) {
  let p = 0; for (let i = 0; i < ch[0].length; i++) p = Math.max(p, Math.abs(ch[0][i]), Math.abs(ch[1][i]));
  const thr = p * 10 ** (relDb / 20);
  for (let i = 0; i < ch[0].length; i++) if (Math.max(Math.abs(ch[0][i]), Math.abs(ch[1][i])) > thr) return i;
  return 0;
}
/** Index of the loudest 10 ms window. */
function loudest(ch, from = 0) { const w = Math.round(0.01 * SR); let best = from, bv = -1; for (let a = from; a + w <= ch[0].length; a += Math.round(0.002 * SR)) { const v = rms(ch, a, a + w); if (v > bv) { bv = v; best = a; } } return { at: best, rms: bv }; }

const COMPOSITES = [
  {
    out: 'slip.c0.wav',
    build() {
      const slide = decode(resolve(RAW, 'slip.t3.wav'), 2);
      const latch = decode(resolve(RAW, 'slip.t1.wav'), 2);
      // latch: the click in take 1 (the loudest 10 ms after its quiet slide), from 15 ms before it, 0.2 s long
      const L = loudest(latch, onset(latch, -50) + Math.round(0.1 * SR));
      const la = L.at - Math.round(0.015 * SR), lb = Math.min(latch[0].length, la + Math.round(0.2 * SR));
      // slide: take 3 from its onset, 0.34 s
      const s0 = onset(slide, -45), slideLen = Math.round(0.34 * SR);
      const slideRms = rms(slide, s0, s0 + slideLen);
      const gSlide = (L.rms * 10 ** (-12 / 20)) / slideRms; // slide RMS 12 dB under the latch's loudest 10 ms
      const lead = Math.round(0.005 * SR), latchAt = lead + slideLen - Math.round(0.02 * SR); // latch starts 20 ms before the slide ends
      const n = latchAt + (lb - la) + Math.round(0.01 * SR);
      const out = [new Float32Array(n), new Float32Array(n)];
      const fi = Math.round(0.03 * SR), fo = Math.round(0.04 * SR);
      for (let c = 0; c < 2; c++) {
        for (let i = 0; i < slideLen; i++) {
          const env = Math.min(1, i / fi, (slideLen - i) / fo);
          out[c][lead + i] += slide[c][s0 + i] * gSlide * env;
        }
        for (let i = 0; i < lb - la; i++) {
          const env = Math.min(1, (lb - la - i) / Math.round(0.03 * SR));
          out[c][latchAt + i] += latch[c][la + i] * env;
        }
      }
      return { ch: out, notes: { slideFrom: 'slip.t3.wav', slideSec: [+(s0 / SR).toFixed(3), +((s0 + slideLen) / SR).toFixed(3)], slideGainDb: +db(gSlide).toFixed(1), latchFrom: 'slip.t1.wav', latchSec: [+(la / SR).toFixed(3), +(lb / SR).toFixed(3)], latchAtSec: +(latchAt / SR + 0.015).toFixed(3) } };
    },
  },
];

const log = {};
for (const c of COMPOSITES) {
  const { ch, notes } = c.build();
  writeWav(ch, resolve(RAW, c.out));
  log[c.out] = notes;
  console.log(c.out, JSON.stringify(notes));
}
writeJson(resolve(here, 'composites.json'), log);
