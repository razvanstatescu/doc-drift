// Music measurement (Node 24 + ffmpeg): beat grid (tools/beats.mjs, refit and phase fix from the Satchel pipeline),
// band energies per bar, and the bar where the energy jumps most (to find a section change such as the Day lift).
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PATHS } from './config.mjs';
import { SR, biquad, decodeMono, envelopeDb, highpass, lowpass, readJson, writeJson } from './lib.mjs';

/** Strong mid-band transients (RBJ band-pass ~630 Hz, 10 ms frames, rises > 10 dB). From Satchel music.mjs. */
export function strongTransients(x, { f0 = 630, q = 0.7, hopSec = 0.01, riseDb = 10 } = {}) {
  const w0 = (2 * Math.PI * f0) / SR, al = Math.sin(w0) / (2 * q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = (-2 * Math.cos(w0)) / a0, a2 = (1 - al) / a0;
  const hop = Math.round(hopSec * SR), n = Math.floor(x.length / hop), env = new Float32Array(n);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let f = 0; f < n; f++) {
    let e = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) {
      const y = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = y; e += y * y;
    }
    env[f] = 10 * Math.log10(e / hop + 1e-12);
  }
  const t = [];
  for (let f = 2; f < n - 1; f++) {
    const d = env[f] - env[f - 1];
    if (d > riseDb && d >= env[f - 1] - env[f - 2] && d >= env[f + 1] - env[f]) t.push(f * hopSec);
  }
  return t;
}

/** Constant-tempo grid from strong transients (phase histogram). Used when beats.mjs's own fit is poor. */
export function refitGrid(x, bpm = 120) {
  const tr = strongTransients(x);
  const p0 = 60 / bpm;
  const peakOf = (period) => {
    const bins = new Array(Math.ceil(period / 0.005)).fill(0);
    for (const t of tr) bins[Math.floor((((t % period) + period) % period) / 0.005) % bins.length]++;
    let best = { n: -1 };
    for (let i = 0; i < bins.length; i++) {
      const n = bins[(i - 1 + bins.length) % bins.length] + bins[i] + bins[(i + 1) % bins.length];
      if (n > best.n) best = { n, center: (i + 0.5) * 0.005 };
    }
    return best;
  };
  let best = { n: -1 };
  for (let period = p0 * 0.994; period <= p0 * 1.006; period += 0.00001) {
    const pk = peakOf(period);
    if (pk.n > best.n || (pk.n === best.n && Math.abs(period - p0) < Math.abs(best.period - p0))) best = { ...pk, period };
  }
  const near = tr.map((t) => (((t - best.center) % best.period) + best.period * 1.5) % best.period - best.period / 2).filter((d) => Math.abs(d) <= 0.01);
  const off = (best.center + near.reduce((a, d) => a + d, 0) / Math.max(1, near.length) + best.period) % best.period;
  const devs = tr.map((t) => { const k = Math.round((t - off) / best.period); return t - off - k * best.period; }).filter((d) => Math.abs(d) < 0.06);
  const rms = Math.sqrt(devs.reduce((a, d) => a + d * d, 0) / Math.max(1, devs.length)) * 1000;
  return { bpmGrid: +(60 / best.period).toFixed(3), gridOffset: +off.toFixed(4), gridRmsMs: +rms.toFixed(1), transients: tr.length, onGrid: devs.length };
}

/**
 * Beat grid of a file: beats.mjs (+ refit when its rms > 15 ms), then the half-beat phase check and the downbeat
 * phase from the backbeat (Satchel music.mjs phaseFix). Returns { bpmGrid, gridOffset, gridRmsMs, beats[], downbeats[] }.
 */
export function beatGrid(file, { bpm = 120, out } = {}) {
  const tmp = out ?? file.replace(/\.\w+$/, '.beats.json');
  const r = spawnSync('node', [PATHS.beats, file, '--bpm', String(bpm), '--fps', '30', '--out', tmp], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`beats.mjs failed: ${r.stderr}`);
  const b = readJson(tmp);
  const x = decodeMono(file);
  const dur = x.length / SR;
  let grid = { bpmGrid: b.bpmGrid, gridOffset: b.gridOffset, gridRmsMs: b.gridRmsMs, source: 'beats.mjs' };
  if (!(b.gridRmsMs <= 15)) grid = { ...refitGrid(x, bpm), source: 'refit (strong transients)', tracker: { bpmGrid: b.bpmGrid, gridOffset: b.gridOffset, gridRmsMs: b.gridRmsMs } };
  const spb = 60 / grid.bpmGrid;
  const beats = [];
  for (let t = grid.gridOffset; t <= dur; t += spb) beats.push(+t.toFixed(4));
  // half-beat check: is the energy right after the grid beats louder than right after the half-beats?
  const { db } = envelopeDb(x, 0.01);
  const at = (t) => { let m = -200; for (let f = Math.max(0, Math.round(t / 0.01) - 1); f <= Math.round((t + 0.06) / 0.01) && f < db.length; f++) m = Math.max(m, db[f]); return m; };
  const med = (a) => a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)];
  const on = med(beats.map(at)), off = med(beats.map((t) => at(t + spb / 2)));
  let shift = 0;
  if (off - on > 3) { shift = grid.gridOffset + spb / 2 >= spb ? -spb / 2 : spb / 2; for (let i = 0; i < beats.length; i++) beats[i] = +(beats[i] + shift).toFixed(4); }
  // downbeat phase: the backbeat (2nd difference, 50 ms after the beat) sits on beats 2 and 4
  const hp = new Float32Array(x.length);
  for (let i = 2; i < x.length; i++) hp[i] = x[i] - 2 * x[i - 1] + x[i - 2];
  const hpAt = (t) => { let e = 0; const i0 = Math.round(t * SR); for (let i = Math.max(0, i0); i < Math.min(hp.length, i0 + Math.round(0.05 * SR)); i++) e += hp[i] * hp[i]; return 10 * Math.log10(e + 1e-12); };
  // kick (low band) per phase, as a second opinion
  const lo = biquad(x, lowpass(120));
  const loAt = (t) => { let e = 0; const i0 = Math.round(t * SR); for (let i = Math.max(0, i0); i < Math.min(lo.length, i0 + Math.round(0.08 * SR)); i++) e += lo[i] * lo[i]; return 10 * Math.log10(e + 1e-12); };
  const valid = beats.filter((t) => t >= 0 && t < dur - 0.1);
  const ph = [0, 1, 2, 3].map((p) => med(valid.filter((_, i) => i % 4 === p).map(hpAt)));
  const kick = [0, 1, 2, 3].map((p) => med(valid.filter((_, i) => i % 4 === p).map(loAt)));
  const q = ph[1] + ph[3] >= ph[0] + ph[2] ? 0 : 1;
  const downbeats = valid.filter((_, i) => i % 4 === q);
  return {
    file, duration: +dur.toFixed(3), ...grid, gridOffset: +(((grid.gridOffset + shift) % spb + spb) % spb).toFixed(4), halfBeatShift: shift,
    beats: valid, downbeats, downbeatPhase: q, backbeatDbByPhase: ph.map(Math.round), kickDbByPhase: kick.map(Math.round),
  };
}

/** Per-bar profile on a given bar grid: RMS dB, low (<150 Hz), high (>4 kHz) dB, and onset count (strong transients). */
export function barProfile(file, { barStart = 0, barSec = 2, bars } = {}) {
  const x = decodeMono(file);
  const dur = x.length / SR;
  const lo = biquad(biquad(x, lowpass(150)), lowpass(150));
  const hi = biquad(biquad(x, highpass(4000)), highpass(4000));
  const rmsDb = (s, a, b) => { let e = 0; const i0 = Math.max(0, Math.round(a * SR)), i1 = Math.min(s.length, Math.round(b * SR)); for (let i = i0; i < i1; i++) e += s[i] * s[i]; return +(10 * Math.log10(e / Math.max(1, i1 - i0) + 1e-12)).toFixed(1); };
  const tr = strongTransients(x);
  const n = bars ?? Math.floor((dur - barStart) / barSec);
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = barStart + k * barSec, b = a + barSec;
    if (b > dur + 1e-6) break;
    out.push({ bar: k, t: +a.toFixed(3), rms: rmsDb(x, a, b), low: rmsDb(lo, a, b), high: rmsDb(hi, a, b), onsets: tr.filter((t) => t >= a && t < b).length });
  }
  return out;
}

/** Bar line with the largest energy jump (mean of the 2 bars after minus the 2 bars before), optionally inside [from, to]. */
export function biggestJump(profile, { from = -Infinity, to = Infinity, key = 'rms' } = {}) {
  let best = null;
  for (let k = 2; k < profile.length - 1; k++) {
    if (profile[k].t < from || profile[k].t > to) continue;
    const before = (profile[k - 1][key] + profile[k - 2][key]) / 2, after = (profile[k][key] + profile[k + 1][key]) / 2;
    const d = after - before;
    if (!best || d > best.jumpDb) best = { t: profile[k].t, bar: k, jumpDb: +d.toFixed(1) };
  }
  return best;
}

export function writeAnalysis(file, extra = {}) {
  const g = beatGrid(file);
  const prof = barProfile(file, { barStart: g.downbeats[0] ?? g.gridOffset, barSec: 4 * (60 / g.bpmGrid) });
  const res = { ...g, beats: undefined, nBeats: g.beats.length, firstDownbeat: g.downbeats[0], profile: prof, ...extra };
  writeJson(file.replace(/\.\w+$/, '.analysis.json'), res);
  return res;
}

export { resolve };
