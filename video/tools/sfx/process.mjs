#!/usr/bin/env node
// Effects: raw takes (tools/sfx/cache/raw/<id>.t<n>.wav) -> public/sfx/<id>.wav (48 kHz 16-bit stereo) + src/data/sfx.json.
//   node tools/sfx/process.mjs [--qa-only]
// Adapted from the Satchel film's tools/sfx2/process.mjs. Steps per take: decode -> 20 Hz DC high-pass (+ optional
// high-pass / shelf / saturation) -> strip end-of-file bumps -> onset trim (5 ms lead) or keep-the-end (anchor 'end')
// -> cut to the target length with a tail fade -> trailing-silence trim -> normalise (peak -3 dBFS; the 'hit' group is
// loudness-matched to its median, only ever turned down) -> write -> re-decode and measure.
// Two-take effects (slip, snap, boom, alert) are scored by measurement (see SCORE below); the winner is <id>, the other
// <id>-alt. Catalog fields: file, durationInFrames, peakFrame (the frame you mean: see specs `peak`), gainDb (to sit at
// the spec's mixDb, K-weighted momentary max, capped so the mix peak stays <= -1 dBFS), desc; plus peakSec, durationSec,
// hits (transient frames, for multi-hit sounds), take, alt.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, biquad, decode, db, ensureDir, fromDb, highpass, highshelf, loudMomentaryMax, spectrum, writeJson, writeWav } from '../audio/lib.mjs';
import { SPECS, TAKE_NOTES } from './specs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const VIDEO = resolve(here, '../..');
const RAW = resolve(here, 'cache', 'raw');
const PUB = ensureDir(resolve(VIDEO, 'public/sfx'));
const CATALOG = resolve(VIDEO, 'src/data/sfx.json');
const REPORT = resolve(here, 'qa-report.json');
const LEAD = 0.005, PEAK_TARGET_DB = -3, MIX_PEAK_CAP_DB = -1, FPS = 30;
const qaOnly = process.argv.includes('--qa-only');

const absAt = (ch, i) => Math.max(Math.abs(ch[0][i]), Math.abs(ch[1][i]));
const peakOf = (ch) => { let p = 0; for (let i = 0; i < ch[0].length; i++) p = Math.max(p, absAt(ch, i)); return p; };
const sliceCh = (ch, a, b) => ch.map((c) => c.slice(Math.max(0, a), Math.min(c.length, b)));
const scaleCh = (ch, g) => ch.forEach((c) => { for (let i = 0; i < c.length; i++) c[i] *= g; });
const mono = (ch) => Float32Array.from(ch[0], (v, i) => (v + ch[1][i]) / 2);
function envelope(ch, win = 0.005) { const w = Math.round(win * SR), out = []; for (let a = 0; a + w <= ch[0].length; a += w) { let s = 0; for (let i = a; i < a + w; i++) s += (ch[0][i] ** 2 + ch[1][i] ** 2) / 2; out.push(Math.sqrt(s / w)); } return out; }
function onsetIndex(ch, peak, relDb = -40) { const thr = Math.max(peak * fromDb(relDb), fromDb(-65)); for (let i = 0; i < ch[0].length; i++) if (absAt(ch, i) > thr) return i; return 0; }
function fade(ch, inS, outS) { const n = ch[0].length; for (const c of ch) { for (let i = 0; i < Math.min(inS, n); i++) c[i] *= i / inS; for (let i = 0; i < Math.min(outS, n); i++) c[n - 1 - i] *= i / outS; } }
/** Transient times (s): 5 ms envelope rises > riseDb over the previous 30 ms minimum, above peak + floorDb. */
function transients(ch, { refractorySec = 0.04, riseDb = 8, floorDb = -30 } = {}) {
  const env = envelope(ch, 0.005), top = Math.max(...env), out = [];
  let last = -1e9;
  for (let k = 0; k < env.length; k++) {
    const prevMin = k === 0 ? 1e-9 : Math.min(...env.slice(Math.max(0, k - 6), k));
    if (db(env[k]) > db(top) + floorDb && db(env[k]) - db(prevMin) > riseDb && (k - last) * 0.005 > refractorySec) { out.push(+(k * 0.005).toFixed(3)); last = k; }
  }
  return out;
}
/** ElevenLabs files often end with a click after near-silence: cut from the first 1 ms bin of a > 6 dB rise in the last 15 ms. */
function endBump(ch) {
  const ms = Math.round(0.001 * SR), n = ch[0].length;
  const binPeak = (a, b) => { let p = 0; for (let i = Math.max(0, a); i < Math.min(n, b); i++) p = Math.max(p, absAt(ch, i)); return p; };
  const before = binPeak(n - 60 * ms, n - 15 * ms), tail = binPeak(n - 15 * ms, n);
  if (tail <= before * fromDb(6)) return 0;
  for (let a = n - 15 * ms; a < n; a += ms) if (binPeak(a, a + ms) > before * fromDb(6)) return n - a;
  return 0;
}
/** Seconds from the loudest 10 ms to the last moment the envelope is above peak - 30 dB. */
function decayTo30(ch) {
  const env = envelope(ch, 0.01); let k = 0; env.forEach((e, i) => { if (e > env[k]) k = i; });
  let last = k; for (let i = k; i < env.length; i++) if (db(env[i]) > db(env[k]) - 30) last = i;
  return +((last - k) * 0.01).toFixed(3);
}
const HF = highpass(4000);
function edgeCheck(ch) {
  const h = ch.map((c) => biquad(c, HF)), n = h[0].length, w3 = Math.round(0.003 * SR), w20 = Math.round(0.02 * SR), pk = peakOf(ch);
  const rms = (a, b) => { a = Math.max(0, a); b = Math.min(n, b); let s = 0; for (let i = a; i < b; i++) s += (h[0][i] ** 2 + h[1][i] ** 2) / 2; return Math.sqrt(s / Math.max(1, b - a)); };
  return { startHfJumpDb: +(db(rms(0, w3)) - db(rms(w3, w3 + w20))).toFixed(1), endHfJumpDb: +(db(rms(n - w3, n)) - db(rms(n - w3 - w20, n - w3))).toFixed(1),
    firstSampleDb: +db(absAt(ch, 0) / pk).toFixed(1), lastSampleDb: +db(absAt(ch, n - 1) / pk).toFixed(1) };
}

function shape(s, file) {
  let raw = decode(file, 2);
  raw = raw.map((c) => biquad(c, highpass(20)));
  if (s.hpHz) raw = raw.map((c) => biquad(c, highpass(s.hpHz)));
  if (s.shelf) raw = raw.map((c) => biquad(c, highshelf(s.shelf.hz, s.shelf.db)));
  if (s.sat) { const p0 = peakOf(raw) || 1, { mix, drive } = s.sat, t = Math.tanh(drive); raw = raw.map((c) => c.map((v) => { const u = v / p0; return p0 * ((1 - mix) * u + (mix * Math.tanh(drive * u)) / t); })); }
  let endCut = 0;
  for (let cut; (cut = endBump(raw)) > 0 && endCut < 0.06 * SR; endCut += cut) raw = sliceCh(raw, 0, raw[0].length - cut);
  const rawPeak = peakOf(raw);
  if (s.anchor === 'end') { // drop trailing silence, keep the last `dur` s
    const fl = rawPeak * fromDb(-50); let e = raw[0].length; while (e > 1 && absAt(raw, e - 1) < fl) e--;
    raw = sliceCh(raw, Math.max(0, e - Math.round(s.dur * SR)), e);
  }
  const on = s.anchor === 'end' ? 0 : onsetIndex(raw, rawPeak, s.onsetRelDb);
  const start = Math.max(0, on - Math.round(LEAD * SR));
  const leadPad = s.anchor === 'end' ? 0 : Math.round(LEAD * SR) - (on - start); // onset within 5 ms of 0: pad with silence
  let ch = sliceCh(raw, start, start + Math.round(s.dur * SR) - leadPad);
  if (leadPad > 0) ch = ch.map((c) => { const p = new Float32Array(c.length + leadPad); p.set(c, leadPad); return p; });
  const truncated = start + Math.round(s.dur * SR) < raw[0].length;
  const pk = peakOf(ch), floor = pk * fromDb(-60);
  let end = ch[0].length; while (end > 1 && absAt(ch, end - 1) < floor) end--;
  ch = sliceCh(ch, 0, Math.min(ch[0].length, end + Math.round(0.01 * SR)));
  const fadeOutMs = s.fadeMs ?? (truncated ? 25 : 10);
  fade(ch, Math.round(((s.fadeInMs ?? 2) / 1000) * SR), Math.round(Math.min(fadeOutMs / 1000, ch[0].length / SR / 3) * SR));
  return { ch, rawPeak, endCutMs: +((endCut / SR) * 1000).toFixed(1), truncated };
}

/** Where the effect "happens": loudest 10 ms (max), last strong transient (last), or the file's end (end). */
function placement(s, ch, hits) {
  const dur = ch[0].length / SR;
  if (s.peak === 'end') return +(dur - 1 / FPS / 2).toFixed(3);
  if (s.peak === 'start') return LEAD; // the onset (every file starts 5 ms before it)
  const env = envelope(ch, 0.01); let k = 0; env.forEach((e, i) => { if (e > env[k]) k = i; });
  const maxSec = +((k + 0.5) * 0.01).toFixed(3);
  if (s.peak === 'last' && hits.length) return hits.at(-1) >= maxSec - 0.02 ? hits.at(-1) : maxSec;
  return maxSec;
}

/** Take scores for the two-take effects: higher is better. Every term is a measured feature. */
const SCORE = {
  // slip: a latch that is the loudest part and comes late, a slide that is audible (ideal 12 dB under the latch), no
  // stray hits in the slide, dry after the latch, close to 0.4-0.6 s of sound
  slip: (f) => (f.latch ? 2 : 0) + (f.latchRelDb >= -3 ? 1 : 0) + (f.latchAt >= 0.2 ? 1 : 0) - Math.abs(f.slideRelDb + 12) / 6 - 0.3 * f.hitsBeforeLatch - (f.decay > 0.2 ? 1 : 0) - 3 * Math.max(0, 0.35 - f.soundSec),
  // snap: one early dominant click, bright (centroid in kHz counts), a quick decay
  snap: (f) => (f.mainHitMs <= 40 ? 1 : 0) + f.centroidHz / 2000 - 8 * Math.max(0, f.decay - 0.06) - 0.5 * Math.max(0, f.hits.length - 2),
  boom: (f) => 4 * f.lowShare + (f.onsetMs <= 10 ? 1 : 0) + (f.peakSec <= 0.08 ? 1 : 0) + Math.min(2, f.decay) - (f.dur < 2 ? 1 : 0),
  alert: (f) => (f.hits.length === 3 ? 3 : -Math.abs(f.hits.length - 3)) - 5 * f.intervalCv + (f.dur <= 0.95 ? 0.5 : 0),
};

function features(s, ch, hits) {
  const m = mono(ch), dur = ch[0].length / SR, sp = spectrum(m, { n: 2048 });
  const env = envelope(ch, 0.005); let k = 0; env.forEach((e, i) => { if (e > env[k]) k = i; });
  const f = { dur: +dur.toFixed(3), hits, centroidHz: sp.centroidHz, lowShare: +(sp.share.sub + sp.share.low * 0.5).toFixed(3), decay: decayTo30(ch), peakSec: +(k * 0.005).toFixed(3), onsetMs: +((onsetIndex(ch, peakOf(ch)) / SR) * 1000).toFixed(1) };
  if (s.id === 'slip') {
    const late = hits.filter((t) => t > 0.15);
    f.latch = late.length > 0; f.latchAt = late.at(-1) ?? null;
    f.latchRelDb = f.latch ? +(db(env[Math.round(f.latchAt / 0.005)] || 1e-9) - db(env[k])).toFixed(1) : -99;
    f.hitsBeforeLatch = hits.filter((t) => t > 0.03 && (!f.latch || t < f.latchAt - 0.03)).length;
    // the slide: mean level from 20 ms after the onset to 30 ms before the latch, relative to the loudest 5 ms
    const a = 4, b = f.latch ? Math.max(a + 1, Math.round((f.latchAt - 0.03) / 0.005)) : env.length;
    const slide = env.slice(a, b);
    f.slideRelDb = slide.length ? +(db(Math.sqrt(slide.reduce((p, v) => p + v * v, 0) / slide.length)) - db(env[k])).toFixed(1) : -99;
    let lastLoud = 0; env.forEach((e, i) => { if (db(e) > db(env[k]) - 30) lastLoud = i; });
    f.soundSec = +(lastLoud * 0.005).toFixed(3);
    f.decay = f.latch ? decayTo30(sliceCh(ch, Math.round(f.latchAt * SR), ch[0].length)) : f.decay;
  }
  if (s.id === 'snap') f.mainHitMs = +(k * 5).toFixed(0);
  if (s.id === 'alert') { const iv = hits.slice(1).map((t, i) => t - hits[i]); const mu = iv.reduce((a, b) => a + b, 0) / Math.max(1, iv.length); f.intervals = iv.map((x) => +x.toFixed(3)); f.intervalCv = iv.length ? +(Math.sqrt(iv.reduce((a, b) => a + (b - mu) ** 2, 0) / iv.length) / mu).toFixed(3) : 1; }
  return f;
}

// ---- stage every take
const stage = [];
for (const s of SPECS) {
  const files = [];
  for (let t = 0; t < 10; t++) { const f = resolve(RAW, `${s.id}.t${t}.wav`); if (existsSync(f) && (s.take == null || s.take === t)) files.push({ t, f }); }
  for (let c = 0; c < 5; c++) { const f = resolve(RAW, `${s.id}.c${c}.wav`); if (existsSync(f)) files.push({ t: `c${c}`, f }); } // composites (composite.mjs)
  if (!files.length) { console.warn(`missing raw take for ${s.id}`); continue; }
  for (const { t, f } of files) {
    const sh = shape(s, f);
    const hitOpts = s.hits ?? (['slip', 'snap'].includes(s.id) ? { refractorySec: 0.03, riseDb: 6, floorDb: -30 } : { refractorySec: 0.06, riseDb: 8, floorDb: -20 });
    stage.push({ s, take: t, src: f, ...sh, hitOpts });
  }
}
// ---- normalise: peak -3 dBFS; the 'hit' group matched to its median loudness (only turned down)
for (const x of stage) { x.peakGain = fromDb(PEAK_TARGET_DB) / peakOf(x.ch); x.loudAtPeak = loudMomentaryMax(x.ch) + db(x.peakGain); }
const hitLoud = stage.filter((x) => x.s.group === 'hit').map((x) => x.loudAtPeak).sort((p, q) => p - q);
const hitTarget = hitLoud[Math.floor(hitLoud.length / 2)];
for (const x of stage) {
  let gDb = db(x.peakGain);
  if (x.s.group === 'hit') gDb = Math.min(gDb, gDb + (hitTarget - x.loudAtPeak));
  scaleCh(x.ch, fromDb(gDb));
  x.gainApplied = +gDb.toFixed(1);
  x.hits = transients(x.ch, x.hitOpts);
  x.f = features(x.s, x.ch, x.hits);
  x.score = SCORE[x.s.id] ? +SCORE[x.s.id](x.f).toFixed(2) : null;
}
// ---- choose takes, write files, measure, catalog
const catalog = {}, report = [];
const byId = new Map();
for (const x of stage) { if (!byId.has(x.s.id)) byId.set(x.s.id, []); byId.get(x.s.id).push(x); }
for (const [id, xs] of byId) {
  const ranked = xs.slice().sort((p, q) => (q.score ?? 0) - (p.score ?? 0));
  ranked.forEach((x, i) => {
    const name = i === 0 ? id : `${id}-alt${ranked.length > 2 ? i : ''}`;
    const out = resolve(PUB, `${name}.wav`);
    if (!qaOnly) writeWav(x.ch, out);
    const dec = decode(out, 2);
    const durSec = dec[0].length / SR;
    const pk = peakOf(dec);
    const hits = transients(dec, x.hitOpts);
    const peakSec = placement(x.s, dec, hits);
    const loudM = loudMomentaryMax(dec);
    const edge = edgeCheck(dec);
    const flags = [];
    if (db(x.rawPeak) < -40) flags.push('EMPTY');
    if (db(pk) > -0.5) flags.push('HOT');
    if ((edge.startHfJumpDb > 6) || (edge.endHfJumpDb > 6 && !x.s.abruptEnd) || edge.firstSampleDb > -30 || (!x.s.abruptEnd && edge.lastSampleDb > -30)) flags.push('EDGE-CLICK');
    if (x.s.anchor !== 'end' && x.f.onsetMs > 12) flags.push('ONSET');
    if (x.s.minHits && hits.length < x.s.minHits) flags.push('FEW-HITS');
    if (Math.abs(durSec - x.s.dur) > 0.15 * x.s.dur + 0.05) flags.push('LENGTH');
    const gainDb = Math.floor(Math.min(x.s.mixDb - loudM, MIX_PEAK_CAP_DB - db(pk)) * 2) / 2;
    const entry = {
      file: `sfx/${name}.wav`, durationInFrames: Math.ceil(durSec * FPS - 1e-6), peakFrame: Math.min(Math.ceil(durSec * FPS - 1e-6) - 1, Math.round(peakSec * FPS)), gainDb,
      desc: i > 0 ? `Alternate of ${id}: ${TAKE_NOTES[`${id}.${String(x.take).startsWith('c') ? x.take : `t${x.take}`}`] ?? 'another generated take'}.` : x.s.desc,
      peakSec: +peakSec.toFixed(3), durationSec: +durSec.toFixed(3),
      ...(x.s.minHits || ['slip', 'alert'].includes(id) ? { hits: hits.map((t) => Math.round(t * FPS)) } : {}),
      take: String(x.take).startsWith('c') ? `composite ${x.take} of eleven_text_to_sound_v3 takes (tools/sfx/composites.json)` : `eleven_text_to_sound_v3 take ${x.take}`, ...(i > 0 ? { alt: true } : {}),
    };
    catalog[name] = entry;
    report.push({ name, take: x.take, score: x.score, dur: entry.durationSec, target: x.s.dur, peakSec: entry.peakSec, peakFrame: entry.peakFrame, peakDb: +db(pk).toFixed(1), loudM: +loudM.toFixed(1), gainDb, hits: hits.length, centroid: x.f.centroidHz, lowShare: x.f.lowShare, decay: x.f.decay, onsetMs: x.f.onsetMs, endCutMs: x.endCutMs, flags: flags.join(','), features: x.f });
  });
}
// keep catalog order = specs order (winner, then alternates)
const ordered = {};
for (const s of SPECS) for (const k of Object.keys(catalog).filter((k) => k === s.id || k.startsWith(`${s.id}-alt`)).sort()) ordered[k] = catalog[k];
if (!qaOnly) writeFileSync(CATALOG, JSON.stringify(ordered, null, 2) + '\n');
writeJson(REPORT, report, 1);
console.table(report.map(({ features, ...r }) => r));
console.log('hit-group loudness target (LUFS momentary max at -3 dBFS peak):', hitTarget?.toFixed(1));
