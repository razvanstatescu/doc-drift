// Shared helpers for the Doc Drift film's audio tools (Node 24 + ffmpeg). No keys are touched here.
// Adapted from the Satchel film's tools/audio-v3/lib.mjs: 48 kHz everywhere, WAV out, a paid-call ledger, and
// loudness measured with ffmpeg's ebur128 (integrated, true peak) or a K-weighted momentary max in JS.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SR = 48000;
export const FPS = 30;
export const BPM = 120;
export const BEAT_F = 15; // frames per beat at 30 fps, 120 BPM
export const BAR_F = 60;

const here = dirname(fileURLToPath(import.meta.url));
export const VIDEO = resolve(here, '../..');
export const LEDGER = resolve(here, 'gen-log.jsonl');

export function ensureDir(p) {
  mkdirSync(p, { recursive: true });
  return p;
}
export const readJson = (p, fallback = null) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
export function writeJson(p, v, indent = 1) {
  ensureDir(dirname(p));
  writeFileSync(p, JSON.stringify(v, null, indent) + '\n');
}
export const hash = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
export const r3 = (x) => Math.round(x * 1000) / 1000;
export const db = (x) => 20 * Math.log10(Math.max(x, 1e-12));
export const fromDb = (d) => 10 ** (d / 20);

/** Decode any audio file to float32 channels at 48 kHz. channels = 1 (mono mix) or 2. */
export function decode(file, channels = 1) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', String(channels), '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg decode failed (${file}): ${r.stderr}`);
  const b = Buffer.from(r.stdout);
  const f = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
  if (channels === 1) return Float32Array.from(f);
  const n = f.length / channels;
  const out = Array.from({ length: channels }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) out[c][i] = f[i * channels + c];
  return out;
}
export const decodeMono = (file) => decode(file, 1);

/** Write mono Float32Array or [L, R] as 48 kHz 16-bit PCM WAV (triangular dither). */
export function writeWav(samples, out, { bits = 16 } = {}) {
  ensureDir(dirname(out));
  const ch = Array.isArray(samples) ? samples : [samples];
  const n = ch[0].length, c = ch.length;
  const inter = new Float32Array(n * c);
  for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) inter[i * c + k] = ch[k][i];
  const codec = bits === 24 ? 'pcm_s24le' : 'pcm_s16le';
  const af = bits === 16 ? ['-af', 'aresample=osf=s16:dither_method=triangular'] : [];
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', String(c), '-i', '-', ...af, '-c:a', codec, '-ar', String(SR), out], { input: Buffer.from(inter.buffer), maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg wav encode failed: ${r.stderr}`);
}

export function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=sample_rate,channels,codec_name,bits_per_sample', '-of', 'json', file], { encoding: 'utf8' });
  const j = JSON.parse(r.stdout || '{}');
  const s = j.streams?.[0] || {};
  return { duration: Number(j.format?.duration), sampleRate: Number(s.sample_rate), channels: s.channels, codec: s.codec_name, bits: s.bits_per_sample };
}

/** EBU R128 via ffmpeg: integrated loudness (LUFS), loudness range (LU), true peak (dBTP), momentary/short-term max. */
export function ebur128(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true:framelog=info', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const s = r.stderr;
  const sum = s.slice(s.lastIndexOf('Summary:'));
  const num = (re) => { const m = sum.match(re); return m ? Number(m[1]) : null; };
  let mMax = -Infinity, sMax = -Infinity;
  for (const m of s.matchAll(/M:\s*(-?[\d.]+|-inf)\s+S:\s*(-?[\d.]+|-inf)/g)) {
    const mv = Number(m[1]), sv = Number(m[2]);
    if (Number.isFinite(mv)) mMax = Math.max(mMax, mv);
    if (Number.isFinite(sv)) sMax = Math.max(sMax, sv);
  }
  return { I: num(/I:\s*(-?[\d.]+) LUFS/), LRA: num(/LRA:\s*(-?[\d.]+) LU/), TP: num(/Peak:\s*(-?[\d.]+|-inf) dBFS/), Mmax: r3(mMax), Smax: r3(sMax) };
}

/** RMS envelope in dBFS with hop `hopSec`. */
export function envelopeDb(x, hopSec = 0.01) {
  const hop = Math.round(SR * hopSec);
  const n = Math.ceil(x.length / hop);
  const out = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0, c = 0;
    for (let i = f * hop; i < Math.min(x.length, (f + 1) * hop); i++) s += x[i] * x[i], c++;
    out[f] = 10 * Math.log10(s / Math.max(1, c) + 1e-12);
  }
  return { db: out, hopSec };
}

/** Copy [start, end] seconds of x with short fades. */
export function slice(x, start, end, { fadeIn = 0.005, fadeOut = 0.012 } = {}) {
  const a = Math.max(0, Math.round(start * SR)), b = Math.min(x.length, Math.round(end * SR));
  const y = Float32Array.from(x.subarray(a, b));
  const fi = Math.round(fadeIn * SR), fo = Math.round(fadeOut * SR);
  for (let i = 0; i < Math.min(fi, y.length); i++) y[i] *= Math.sin((Math.PI / 2) * (i / fi)) ** 2;
  for (let i = 0; i < Math.min(fo, y.length); i++) y[y.length - 1 - i] *= Math.sin((Math.PI / 2) * (i / fo)) ** 2;
  return y;
}

export function peakAbs(x) { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; }
export function scaleInPlace(x, g) { for (let i = 0; i < x.length; i++) x[i] *= g; return x; }

/**
 * Normalise for script comparison: lower case, numbers in words to digits for the few we use, "a.m." -> "am",
 * no punctuation, single spaces.
 */
const NUMS = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
export function norm(s) {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\b(\d+):00\b/g, '$1')
    .replace(/\b(\d+)\s*a\.?\s*m\b\.?/g, '$1 am')
    .replace(/\ba\.\s*m\./g, 'am')
    .replace(/\.(sh)\b/g, ' dot $1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => NUMS[w] ?? w)
    .join(' ')
    .replace(/\bs h\b/g, 'sh')
    .replace(/\bdock\b/g, 'doc') // homophone: Scribe writes "Dock Drift" for a correct "Doc Drift"
    .replace(/\bm c p\b/g, 'mcp')
    .replace(/\ba i\b/g, 'ai');
}

/** Compare script text with what Scribe heard. ok = same words after norm (spaces ignored as a fallback). */
export function compareText(script, heard) {
  const a = norm(script), b = norm(heard);
  const exact = a === b;
  const loose = a.replace(/ /g, '') === b.replace(/ /g, '');
  return { ok: exact || loose, exact, script: a, heard: b };
}

// ---------- paid-call ledger and credit counter ----------
export function logPaid(entry) {
  appendFileSync(LEDGER, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}
export function ledger() {
  if (!existsSync(LEDGER)) return [];
  return readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

/** Credits used on the account counter (character_count); our cap is START + 8000. */
export const CREDIT_START = 15255; // character_count read 2026-11-13 before any of this agent's calls
export const CREDIT_CAP = 8000;
export async function creditsUsed(eleven) {
  const s = await eleven.subscription();
  return { used: s.character_count, limit: s.character_limit, ours: s.character_count - CREDIT_START, left: s.character_limit - s.character_count };
}
export async function guardCredits(eleven, reserve = 0) {
  const c = await creditsUsed(eleven);
  if (c.ours + reserve > CREDIT_CAP) throw new Error(`credit cap: ${c.ours} used of ${CREDIT_CAP} (+${reserve} reserved)`);
  return c;
}

// ---------- K-weighted momentary max (BS.1770 400 ms window), for short effects ----------
function biquadCoefs(type, G, Q, fc, sr = SR) {
  const A = 10 ** (G / 40), w0 = (2 * Math.PI * fc) / sr, cw = Math.cos(w0), alpha = Math.sin(w0) / (2 * Q), sA = Math.sqrt(A);
  const c = type === 'shelf'
    ? [A * (A + 1 + (A - 1) * cw + 2 * sA * alpha), -2 * A * (A - 1 + (A + 1) * cw), A * (A + 1 + (A - 1) * cw - 2 * sA * alpha),
       A + 1 - (A - 1) * cw + 2 * sA * alpha, 2 * (A - 1 - (A + 1) * cw), A + 1 - (A - 1) * cw - 2 * sA * alpha]
    : type === 'lp'
      ? [(1 - cw) / 2, 1 - cw, (1 - cw) / 2, 1 + alpha, -2 * cw, 1 - alpha]
      : [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + alpha, -2 * cw, 1 - alpha];
  return c.map((v) => v / c[3]);
}
export function biquad(x, [b0, b1, b2, , a1, a2]) {
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
export const highpass = (fc, q = Math.SQRT1_2) => biquadCoefs('hp', 0, q, fc);
export const lowpass = (fc, q = Math.SQRT1_2) => biquadCoefs('lp', 0, q, fc);
export const highshelf = (fc, gainDb) => biquadCoefs('shelf', gainDb, Math.SQRT1_2, fc);
const K_SHELF = biquadCoefs('shelf', 3.999843853973347, 0.7071752369554196, 1681.974450955533);
const K_HP = biquadCoefs('hp', 0, 0.5003270373238773, 38.13547087602444);
/** chans: array of Float32Array. Returns LUFS of the loudest 400 ms window (zero-padded if shorter). */
export function loudMomentaryMax(chans) {
  const k = chans.map((c) => biquad(biquad(c, K_SHELF), K_HP));
  const n = k[0].length, W = Math.round(0.4 * SR);
  const cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) { let e = 0; for (const c of k) e += c[i] * c[i]; cs[i + 1] = cs[i] + e; }
  let best = 0;
  if (n <= W) best = cs[n] / W;
  else for (let a = 0; a + W <= n; a += Math.round(0.01 * SR)) best = Math.max(best, (cs[a + W] - cs[a]) / W);
  return -0.691 + 10 * Math.log10(Math.max(best, 1e-12));
}

/** Spectral centroid (Hz) and band energies of a mono signal segment, via a plain DFT on 4096-sample frames. */
export function spectrum(x, { from = 0, to = x.length / SR, n = 4096 } = {}) {
  const a = Math.round(from * SR), b = Math.min(x.length, Math.round(to * SR));
  const bins = n / 2 + 1, acc = new Float64Array(bins);
  const win = Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
  const re = new Float64Array(n), im = new Float64Array(n);
  let frames = 0;
  for (let s = a; s + n <= b; s += n / 2) {
    for (let i = 0; i < n; i++) { re[i] = x[s + i] * win[i]; im[i] = 0; }
    fftInPlace(re, im);
    for (let k = 0; k < bins; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  let num = 0, den = 0;
  const band = (lo, hi) => { let e = 0; for (let k = 0; k < bins; k++) { const f = (k * SR) / n; if (f >= lo && f < hi) e += acc[k]; } return e; };
  for (let k = 0; k < bins; k++) { const f = (k * SR) / n; num += f * acc[k]; den += acc[k]; }
  const tot = den || 1e-12;
  return {
    centroidHz: Math.round(num / tot),
    frames,
    share: { sub: +(band(0, 80) / tot).toFixed(3), low: +(band(80, 300) / tot).toFixed(3), mid: +(band(300, 3000) / tot).toFixed(3), high: +(band(3000, 24000) / tot).toFixed(3) },
    dominantHz: (() => { let m = 1; for (let k = 2; k < bins; k++) if (acc[k] > acc[m]) m = k; return Math.round((m * SR) / n); })(),
  };
}
export function fftInPlace(re, im) {
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
        const p = i + k, q = p + len / 2;
        const tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}

export function argv() {
  const o = { _: [] };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
    else o._.push(a[i]);
  }
  return o;
}
