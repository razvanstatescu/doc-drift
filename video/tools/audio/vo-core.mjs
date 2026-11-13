// Narration mastering shared by audition.mjs and vo.mjs: find the speech, drop edge bursts and breaths, trim with a
// short lead and tail, loudness-match to VO_MASTER.lufs, and measure pace and pitch. Node 24 + ffmpeg (+ numpy for pitch).
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, db, decodeMono, ebur128, envelopeDb, fromDb, peakAbs, r3, slice, writeWav } from './lib.mjs';
import { VO_MASTER } from './config.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Speech segments: runs of 10 ms frames above max(-55 dBFS, peak - 42 dB), gaps < 120 ms merged.
 * Edge clean-up (from the Satchel pipeline): eleven_v4 sometimes leaves a short burst or an inhale at the very start or
 * end of a take. A first/last segment is dropped when it is separated by >= 150 ms and is short (< 0.2 s) or much
 * quieter than the speech (peak 15 dB down).
 */
export function speechSegments(x) {
  const { db: env, hopSec } = envelopeDb(x, 0.01);
  let peak = -200;
  for (const v of env) peak = Math.max(peak, v);
  const thr = Math.max(-55, peak - 42);
  const segs = [];
  for (let f = 0; f < env.length; f++) {
    if (env[f] <= thr) continue;
    const last = segs.at(-1);
    if (last && (f - last.b) * hopSec < 0.12) { last.b = f + 1; last.peak = Math.max(last.peak, env[f]); }
    else segs.push({ a: f, b: f + 1, peak: env[f] });
  }
  const dropped = [];
  const weak = (sg) => (sg.b - sg.a) * hopSec < 0.2 || sg.peak < peak - 15;
  while (segs.length > 1 && (segs.at(-1).a - segs.at(-2).b) * hopSec >= 0.15 && weak(segs.at(-1))) dropped.push({ edge: 'end', ...fmt(segs.pop(), hopSec) });
  while (segs.length > 1 && (segs[1].a - segs[0].b) * hopSec >= 0.15 && weak(segs[0])) dropped.push({ edge: 'start', ...fmt(segs.shift(), hopSec) });
  return { segs: segs.map((sg) => fmt(sg, hopSec)), peak, thr, dropped };
}
const fmt = (sg, hop) => ({ start: r3(sg.a * hop), end: r3(sg.b * hop), peakDb: +sg.peak.toFixed(1) });

/** Pauses inside the speech (gaps between segments), seconds. */
export function pauses(segs) {
  return segs.slice(1).map((s, i) => ({ at: segs[i].end, len: r3(s.start - segs[i].end) }));
}

/**
 * Feed-forward lookahead peak limiter (sample peak). Gain needed per sample r = min(1, ceiling/|x|); a centred
 * sliding minimum over +-L, then a centred moving average over +-L (so the gain at every peak is <= what it needs),
 * then a one-pole release (only upward moves are slowed). Returns { y, maxReductionDb }.
 */
export function limit(x, ceilingDb, { lookaheadMs = 1.5, releaseMs = 60 } = {}) {
  const c = fromDb(ceilingDb), n = x.length, L = Math.max(1, Math.round((lookaheadMs / 1000) * SR));
  const r = new Float32Array(n);
  let any = false;
  for (let i = 0; i < n; i++) { const a = Math.abs(x[i]); r[i] = a > c ? c / a : 1; if (a > c) any = true; }
  if (!any) return { y: Float32Array.from(x), maxReductionDb: 0 };
  // sliding minimum over [i-L, i+L] (monotonic deque)
  const m = new Float32Array(n), dq = new Int32Array(n + 2 * L + 2);
  let h = 0, t = 0;
  for (let j = 0; j < n + L; j++) {
    if (j < n) { while (t > h && r[dq[t - 1]] >= r[j]) t--; dq[t++] = j; }
    const i = j - L;
    if (i >= 0) { while (dq[h] < i - L) h++; m[i] = r[dq[h]]; }
  }
  // moving average over [i-L, i+L]
  const cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + m[i];
  const g = new Float32Array(n);
  const rel = 1 - Math.exp(-1 / ((releaseMs / 1000) * SR));
  let prev = 1, maxRed = 1;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - L), b = Math.min(n, i + L + 1);
    const avg = (cs[b] - cs[a]) / (b - a);
    const v = avg < prev ? avg : prev + (avg - prev) * rel;
    g[i] = v;
    prev = g[i];
    maxRed = Math.min(maxRed, g[i]);
  }
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = x[i] * g[i];
  return { y, maxReductionDb: +db(maxRed).toFixed(2) };
}

/**
 * Trim a raw take to [first speech - lead, last speech + tail], fade the edges (5 ms in, 20 ms out), then set the
 * integrated loudness to VO_MASTER.lufs with one gain, peak-limited to VO_MASTER.ceilingDb (iterated, since limiting
 * lowers the loudness a little). Writes `out` (48 kHz 16-bit mono WAV) and returns the measurements.
 */
export function masterTake(rawFile, out, { lead = VO_MASTER.lead, tail = VO_MASTER.tail, lufs = VO_MASTER.lufs } = {}) {
  const x = decodeMono(rawFile);
  const sp = speechSegments(x);
  if (!sp.segs.length) throw new Error(`no speech in ${rawFile}`);
  const a = sp.segs[0].start, b = sp.segs.at(-1).end;
  const y0 = slice(x, a - lead, b + tail, { fadeIn: 0.005, fadeOut: 0.02 });
  const tmp = out.replace(/\.wav$/, '.pre.wav');
  writeWav(y0, tmp);
  const pre = ebur128(tmp);
  let gainDb = lufs - pre.I, y = y0, red = 0, m = pre;
  for (let k = 0; k < 4; k++) {
    const g = fromDb(gainDb);
    const lim = limit(Float32Array.from(y0, (v) => v * g), VO_MASTER.ceilingDb);
    y = lim.y; red = lim.maxReductionDb;
    writeWav(y, out);
    m = ebur128(out);
    if (Math.abs(m.I - lufs) <= 0.1) break;
    gainDb += lufs - m.I;
  }
  spawnSync('rm', ['-f', tmp]);
  return {
    rawDuration: r3(x.length / SR), trimmed: { from: r3(Math.max(0, a - lead)), to: r3(Math.min(x.length / SR, b + tail)) },
    duration: r3(y.length / SR), speechSec: r3(b - a), segments: sp.segs.length, droppedEdges: sp.dropped,
    pauses: pauses(sp.segs).filter((p) => p.len >= 0.12), preLoudness: pre, gainDb: +gainDb.toFixed(2), limiterMaxReductionDb: red,
    loudness: m, samplePeakDb: +db(peakAbs(y)).toFixed(2),
  };
}

/** Pitch statistics (YIN, numpy) of a file: median F0 and spread in semitones. */
export function pitchStats(file) {
  const r = spawnSync('python3', ['-I', resolve(here, 'voicing.py'), file, '--pitch-json'], { encoding: 'utf8' });
  try { return JSON.parse(r.stdout.trim().split('\n').at(-1)); } catch { return { error: r.stderr.slice(0, 200) }; }
}

/** Pace from Scribe words: words per minute over first-word start to last-word end, and characters per second. */
export function pace(words, text) {
  const w = words.filter((x) => x.type === 'word');
  if (!w.length) return null;
  const span = w.at(-1).end - w[0].start;
  return { words: w.length, spanSec: r3(span), wpm: Math.round((w.length / span) * 60), charsPerSec: +(text.length / span).toFixed(1), firstWordAt: r3(w[0].start), lastWordEnd: r3(w.at(-1).end) };
}
