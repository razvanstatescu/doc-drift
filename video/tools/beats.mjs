#!/usr/bin/env node
// Beat grid from an audio file (Node 22 + ffmpeg, no npm deps).
//   node tools/beats.mjs music.mp3 [--bpm 120] [--fps 30] [--beats-per-bar 4] [--out beats.json]
// Method: ffmpeg decode -> mono 22.05 kHz -> STFT (1024/256, Hann) -> log spectral-flux onset envelope
// -> tempo by autocorrelation with a log-normal prior around --bpm -> Ellis (2007) dynamic-programming
// beat tracking -> least-squares constant-tempo grid fit -> downbeat phase from low-band (kick) flux.
// Output: tracked beats (follow the audio) AND a clean grid (bpm + offset), plus Remotion frame numbers.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const SR = 22050, N = 1024, HOP = 256, FPS_ENV = SR / HOP; // ~86.1 onset frames per second

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
    else o._.push(argv[i]);
  }
  return o;
}

export function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg decode failed: ${r.stderr}`);
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
}

function fft(re, im) { // in-place radix-2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}

export function onsetEnvelope(x) {
  const frames = Math.max(0, Math.floor((x.length - N) / HOP) + 1);
  const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const bins = N / 2 + 1, lowBin = Math.ceil((150 * N) / SR);
  let prev = new Float32Array(bins);
  const env = new Float32Array(frames), low = new Float32Array(frames);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) { re[i] = x[f * HOP + i] * win[i]; im[i] = 0; }
    fft(re, im);
    const cur = new Float32Array(bins);
    let s = 0, sl = 0;
    for (let k = 0; k < bins; k++) {
      cur[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = cur[k] - prev[k];
      if (d > 0) { s += d; if (k <= lowBin) sl += d; }
    }
    env[f] = s; low[f] = sl; prev = cur;
  }
  // remove slow trend (0.5 s moving average), half-wave rectify, normalise
  const w = Math.round(FPS_ENV * 0.25);
  const detr = (a) => {
    const out = new Float32Array(a.length);
    let acc = 0;
    const cs = new Float64Array(a.length + 1);
    for (let i = 0; i < a.length; i++) cs[i + 1] = cs[i] + a[i];
    for (let i = 0; i < a.length; i++) {
      const lo = Math.max(0, i - w), hi = Math.min(a.length, i + w + 1);
      out[i] = Math.max(0, a[i] - (cs[hi] - cs[lo]) / (hi - lo));
      acc = Math.max(acc, out[i]);
    }
    if (acc > 0) for (let i = 0; i < out.length; i++) out[i] /= acc;
    return out;
  };
  return { env: detr(env), low: detr(low) };
}

export function estimateTempo(env, bpmHint) {
  const minLag = Math.floor((60 / 220) * FPS_ENV), maxLag = Math.ceil((60 / 50) * FPS_ENV);
  const center = bpmHint || 120, sigma = bpmHint ? 0.2 : 1.0; // octaves
  let best = -1, bestLag = minLag;
  const ac = new Float64Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag];
    ac[lag] = s / (env.length - lag);
  }
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    const bpm = (60 * FPS_ENV) / lag;
    const w = Math.exp(-0.5 * (Math.log2(bpm / center) / sigma) ** 2);
    if (ac[lag] * w > best) { best = ac[lag] * w; bestLag = lag; }
  }
  const [a, b, c] = [ac[bestLag - 1], ac[bestLag], ac[bestLag + 1]]; // parabolic refinement
  const delta = a - 2 * b + c !== 0 ? (0.5 * (a - c)) / (a - 2 * b + c) : 0;
  const period = bestLag + Math.max(-0.5, Math.min(0.5, delta));
  return { period, bpm: (60 * FPS_ENV) / period };
}

export function trackBeats(env, period, tightness = 100) {
  const n = env.length, score = new Float64Array(n), back = new Int32Array(n).fill(-1);
  const lo = Math.round(period / 2), hi = Math.round(2 * period);
  for (let t = 0; t < n; t++) {
    let best = 0, arg = -1;
    for (let tau = t - hi; tau <= t - lo; tau++) {
      if (tau < 0) continue;
      const v = score[tau] - tightness * Math.log((t - tau) / period) ** 2;
      if (v > best || arg < 0) { best = v; arg = tau; }
    }
    score[t] = env[t] + (arg >= 0 ? Math.max(0, best) : 0);
    back[t] = arg >= 0 && best > 0 ? arg : -1;
  }
  // end on the best-scoring frame in the last period
  let t = n - 1;
  for (let i = Math.max(0, n - Math.round(period)); i < n; i++) if (score[i] > score[t]) t = i;
  const beats = [];
  while (t >= 0) { beats.push(t); t = back[t]; }
  return beats.reverse();
}

function fitGrid(beatTimes) { // least squares: t_k = offset + k * spb
  const n = beatTimes.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  beatTimes.forEach((y, x) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
  const spb = (n * sxy - sx * sy) / (n * sxx - sx * sx), offset = (sy - spb * sx) / n;
  const resid = beatTimes.map((y, x) => y - (offset + spb * x));
  const rms = Math.sqrt(resid.reduce((a, r) => a + r * r, 0) / n);
  return { spb, offset, bpm: 60 / spb, rmsMs: rms * 1000 };
}

export function analyse(file, { bpm, beatsPerBar = 4, fps } = {}) {
  const x = decode(file);
  const duration = x.length / SR;
  const { env, low } = onsetEnvelope(x);
  const tempo = estimateTempo(env, bpm);
  const frames = trackBeats(env, tempo.period).map((f) => {
    // snap to the local onset peak (±2 frames) and refine to sub-frame precision (parabolic)
    let m = f;
    for (let i = Math.max(1, f - 2); i <= Math.min(env.length - 2, f + 2); i++) if (env[i] > env[m]) m = i;
    if (m <= 0 || m >= env.length - 1) return m;
    const [a, b, c] = [env[m - 1], env[m], env[m + 1]], den = a - 2 * b + c;
    return m + (den !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0);
  });
  // a Hann-windowed frame "sees" an onset most strongly when the onset sits mid-window
  const toTime = (f) => +((f * HOP + N / 2 + HOP) / SR).toFixed(4); // +1 hop: calibrated on a click track (flux peaks ~11 ms early)
  const beats = frames.map(toTime);
  const grid = fitGrid(beats);
  let downPhase = 0, bestLow = -1;
  for (let p = 0; p < beatsPerBar; p++) {
    let s = 0;
    for (let i = p; i < frames.length; i += beatsPerBar) s += low[Math.round(frames[i])] + 0.5 * env[Math.round(frames[i])];
    if (s > bestLow) { bestLow = s; downPhase = p; }
  }
  const gridBeats = [];
  if (grid) {
    let k0 = Math.ceil(-grid.offset / grid.spb);
    for (let k = k0; ; k++) { const t = grid.offset + k * grid.spb; if (t > duration) break; gridBeats.push(+t.toFixed(4)); }
  }
  const out = {
    file, duration: +duration.toFixed(3), bpmRequested: bpm ? Number(bpm) : null,
    bpmAutocorr: +tempo.bpm.toFixed(2), bpmGrid: grid ? +grid.bpm.toFixed(3) : null,
    gridOffset: grid ? +grid.offset.toFixed(4) : null, gridRmsMs: grid ? +grid.rmsMs.toFixed(1) : null,
    beatsPerBar, downbeatPhase: downPhase,
    beats, downbeats: beats.filter((_, i) => i % beatsPerBar === downPhase), gridBeats,
  };
  if (fps) {
    out.fps = Number(fps);
    out.beatFrames = beats.map((t) => Math.round(t * fps));
    out.downbeatFrames = out.downbeats.map((t) => Math.round(t * fps));
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = args(process.argv.slice(2));
  if (!a._[0]) { console.error('usage: node tools/beats.mjs <audio> [--bpm 120] [--fps 30] [--beats-per-bar 4] [--out beats.json]'); process.exit(1); }
  const r = analyse(a._[0], { bpm: a.bpm ? Number(a.bpm) : undefined, beatsPerBar: Number(a['beats-per-bar'] || 4), fps: a.fps ? Number(a.fps) : undefined });
  const json = JSON.stringify(r, null, 1);
  if (a.out) writeFileSync(a.out, json);
  console.log(a.out ? JSON.stringify({ ...r, beats: `${r.beats.length} beats`, gridBeats: `${r.gridBeats.length}`, downbeats: r.downbeats, beatFrames: undefined, downbeatFrames: undefined }) : json);
}
