#!/usr/bin/env node
// Audio QA (BRIEF / audio task item 6; v5: V5.md). Writes tools/audio/<qa-report>.json and tools/audio/cache/qa/*.
//   node tools/audio/qa.mjs [--film v4|v5] [--no-scribe]          (default --film v5)
// 1. The narration placed exactly as in the film's timeline -> one stem -> Scribe -> compared with the script, with
//    a word error rate (Levenshtein over normalised words; "DocDrift" counted both as Scribe writes it and as two words).
// 2. Loudness of every VO line (EBU R128 integrated), spread must be <= 2 LU (each within +-1 LU of the median).
// 3. Music tempo: the score (and v4's M0 source take) within 0.1 BPM of 120; the shipped edits' kicks on that grid.
// 4. Every file in public/vo, public/music, public/sfx decodes cleanly (ffmpeg, no errors), 48 kHz.
// 5. A preview mix for a human listen (no effects): the score at its gainDb with the duck ranges (-8 dB, 6 f in,
//    12 f out) and every VO line; v4 also has M0 on f0 and V00 on black. tools/audio/cache/qa/preview-mix[-v5].wav.
// v4: src/data/timeline-v4.json, score.wav, qa-report.json. v5: src/data/timeline.json, score-v5.wav, qa-report-v5.json.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PATHS, filmOf } from './config.mjs';
import { SR, argv, biquad, compareText, decode, ebur128, ensureDir, fromDb, lowpass, probe, r3, readJson, writeJson, writeWav } from './lib.mjs';
import { beatGrid } from './music-analysis.mjs';
import { eleven, stt } from './paid.mjs';
import { creditsUsed } from './lib.mjs';

const a = argv();
const FILM = filmOf(a.film ?? 'v5');
const LINES = FILM.lines;
const QA = ensureDir(resolve(PATHS.cache, 'qa'));
const tl = readJson(resolve(PATHS.dataDir, FILM.timeline));
const FPS = tl.fps;
const report = { at: new Date().toISOString(), film: FILM.name };
const SCORE = FILM.name === 'v4' ? 'score' : 'score-v5'; // public/music/<SCORE>.wav

/** Word error rate (substitutions + deletions + insertions over script words) with the aligned pairs. */
function wer(ref, hyp) {
  const n = ref.length, m = hyp.length;
  const D = Array.from({ length: n + 1 }, (_, i) => Int32Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
  const ops = [];
  let i = n, j = m, S = 0, Dl = 0, I = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) {
      if (ref[i - 1] !== hyp[j - 1]) { S++; ops.push({ op: 'sub', script: ref[i - 1], heard: hyp[j - 1], at: i - 1 }); }
      i--; j--;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) { Dl++; ops.push({ op: 'del', script: ref[i - 1], at: i - 1 }); i--; }
    else { I++; ops.push({ op: 'ins', heard: hyp[j - 1], at: i }); j--; }
  }
  return { words: n, sub: S, del: Dl, ins: I, wer: +((S + Dl + I) / Math.max(1, n)).toFixed(4), ops: ops.reverse() };
}

// ---- 1. narration stem + Scribe
const n = Math.ceil((tl.totalFrames / FPS) * SR);
const stem = new Float32Array(n);
for (const l of tl.vo) {
  const x = decode(resolve(PATHS.voDir, `${l.id}.wav`), 1);
  const o = Math.round((l.from / FPS) * SR);
  for (let i = 0; i < x.length && o + i < n; i++) stem[o + i] += x[i];
}
const stemFile = resolve(QA, FILM.narrationStem);
writeWav(stem, stemFile);
if (!a['no-scribe']) {
  const before = await creditsUsed(eleven);
  const s = await stt(stemFile, { languageCode: 'en' }, { phase: 'qa', what: 'full narration' });
  const script = LINES.map((l) => l.text).join(' ');
  const cmp = compareText(script, s.text);
  // word-level diff (normalised) to show any differences
  const A = cmp.script.split(' '), B = cmp.heard.split(' ');
  const diffs = [];
  let i = 0, j = 0;
  while (i < A.length || j < B.length) {
    if (A[i] === B[j]) { i++; j++; continue; }
    if (A[i] && B[j] && (A[i] + A[i + 1]) === B[j]) { diffs.push({ script: `${A[i]} ${A[i + 1]}`, heard: B[j], kind: 'joined' }); i += 2; j++; continue; }
    if (A[i] && B[j] && A[i] === (B[j] + B[j + 1])) { diffs.push({ script: A[i], heard: `${B[j]} ${B[j + 1]}`, kind: 'split' }); i++; j += 2; continue; }
    diffs.push({ script: A[i] ?? null, heard: B[j] ?? null, at: i }); i++; j++;
    if (diffs.length > 40) break;
  }
  // per-line timing check: Scribe's words inside each line's span
  const words = s.words.filter((w) => w.type === 'word');
  const lineCheck = tl.vo.map((l) => {
    const t0 = l.from / FPS, t1 = (l.from + l.durationInFrames) / FPS;
    const heard = words.filter((w) => w.start >= t0 - 0.05 && w.end <= t1 + 0.05).map((w) => w.text).join(' ');
    const c = compareText(l.text, heard);
    return { id: l.id, ok: c.ok, heard };
  });
  // WER over normalised words: raw, then with Scribe's one-word "DocDrift" split (a spelling, not a voice error)
  const raw = wer(cmp.script.split(' '), cmp.heard.split(' '));
  const split = wer(cmp.script.split(' '), cmp.heard.replace(/\bdocdrift\b/g, 'doc drift').split(' '));
  report.narration = {
    file: stemFile, wordsMatch: cmp.ok, exact: cmp.exact, diffs, linesInPlace: lineCheck.every((x) => x.ok), lineMismatches: lineCheck.filter((x) => !x.ok),
    wer: { raw: { ...raw, ops: raw.ops.slice(0, 40) }, docDriftSplit: { ...split, ops: split.ops.slice(0, 40) } }, transcript: s.text,
  };
  console.log(`WER: ${(raw.wer * 100).toFixed(2)}% raw (${raw.sub} sub, ${raw.del} del, ${raw.ins} ins of ${raw.words} words); ${(split.wer * 100).toFixed(2)}% with "DocDrift" as two words`);
  const after = await creditsUsed(eleven);
  report.narration.credits = { before: before.used, after: after.used };
  console.log(`narration: words match ${cmp.ok} (exact ${cmp.exact}); every line heard in its own span: ${report.narration.linesInPlace}; diffs: ${JSON.stringify(diffs)}`);
}

// ---- 2. VO loudness
const vo = tl.vo.map((l) => ({ id: l.id, ...ebur128(resolve(PATHS.voDir, `${l.id}.wav`)) }));
const Is = vo.map((v) => v.I).sort((p, q) => p - q), med = Is[Math.floor(Is.length / 2)];
report.voLoudness = { medianLufs: med, min: Is[0], max: Is.at(-1), withinOneLU: vo.every((v) => Math.abs(v.I - med) <= 1), maxTruePeak: Math.max(...vo.map((v) => v.TP)), lines: vo };
console.log(`VO loudness: median ${med} LUFS, range ${Is[0]}..${Is.at(-1)}, all within 1 LU: ${report.voLoudness.withinOneLU}, max true peak ${report.voLoudness.maxTruePeak} dBTP`);

// ---- 3. tempo
/** Low-band kick onsets of a file, and their deviation from the grid t = off + k * 0.5 s. */
function gridDeviation(file, off) {
  const x = decode(file, 1), lo = biquad(biquad(x, lowpass(150)), lowpass(150));
  const hop = Math.round(0.005 * SR), env = [];
  for (let i = 0; i + hop <= lo.length; i += hop) { let e = 0; for (let k = i; k < i + hop; k++) e += lo[k] * lo[k]; env.push(10 * Math.log10(e / hop + 1e-12)); }
  const on = [];
  for (let f = 3; f < env.length; f++) if (env[f] - Math.min(env[f - 1], env[f - 2], env[f - 3]) > 12 && env[f] > Math.max(...env) - 30) { if (!on.length || f * 0.005 - on.at(-1) > 0.2) on.push(f * 0.005); }
  const devOn = (q) => on.map((t) => { const k = Math.round((t - off) / q); return t - off - k * q; });
  const med = (d) => { const abs = d.map(Math.abs).sort((p, q) => p - q); return abs.length ? +(abs[Math.floor(abs.length / 2)] * 1000).toFixed(1) : null; };
  const beat = devOn(0.5), six = devOn(0.125);
  // low-band onsets include an off-beat bass line, so the 16th-note grid is the fair test that no splice moved the grid
  return { lowOnsets: on.length, onBeatWithin20ms: beat.filter((d) => Math.abs(d) <= 0.02).length, medianAbsDevMs16th: med(six), within15ms16th: six.filter((d) => Math.abs(d) <= 0.015).length };
}
const score = resolve(PATHS.musicDir, `${SCORE}.wav`);
const g = beatGrid(score, { out: resolve(PATHS.cache, 'music', `${SCORE}.beats.json`) });
const scoreL = ebur128(score);
writeJson(resolve(PATHS.cache, 'music', `${SCORE}.analysis.json`), { bpmGrid: g.bpmGrid, gridOffset: g.gridOffset, gridRmsMs: g.gridRmsMs, lufs: scoreL.I, truePeak: scoreL.TP, LRA: scoreL.LRA });
report.music = {
  score: { file: score, ...probe(score), bpm: g.bpmGrid, within01: Math.abs(g.bpmGrid - 120) <= 0.1, gridRmsMs: g.gridRmsMs, firstBeatSec: g.gridOffset, loudness: scoreL, kicksOnGrid: gridDeviation(score, g.gridOffset) },
};
if (FILM.name === 'v4') {
  const m0src = beatGrid(resolve(PATHS.cache, 'music', 'm0-music_v2_5.wav'));
  Object.assign(report.music, {
    m0Source: { bpm: m0src.bpmGrid, within01: Math.abs(m0src.bpmGrid - 120) <= 0.1, gridRmsMs: m0src.gridRmsMs },
    m0: { ...probe(resolve(PATHS.musicDir, 'm0.wav')), loudness: ebur128(resolve(PATHS.musicDir, 'm0.wav')), kicksOnGrid: gridDeviation(resolve(PATHS.musicDir, 'm0.wav'), 0.004) },
    m0_4bar: { ...probe(resolve(PATHS.musicDir, 'm0-4bar.wav')), loudness: ebur128(resolve(PATHS.musicDir, 'm0-4bar.wav')), kicksOnGrid: gridDeviation(resolve(PATHS.musicDir, 'm0-4bar.wav'), 0.004) },
  });
  console.log(`M0 source ${m0src.bpmGrid} BPM; m0.wav ${report.music.m0.duration} s kicks ${JSON.stringify(report.music.m0.kicksOnGrid)}; m0-4bar ${report.music.m0_4bar.duration} s`);
} else {
  // v5: the film-frame duration must equal the timeline's, and the score must cover the whole film from frame 0
  report.music.score.matchesTimeline = Math.abs(probe(score).duration - tl.totalFrames / FPS) < 1e-3 && tl.music[0].from === 0;
}
console.log(`${SCORE} ${g.bpmGrid} BPM (rms ${g.gridRmsMs} ms, first beat ${g.gridOffset} s), ${JSON.stringify(scoreL)}, kicks on grid: ${JSON.stringify(report.music.score.kicksOnGrid)}`);

// ---- 4. every file decodes
const files = [];
for (const dir of [PATHS.voDir, PATHS.auditionDir, PATHS.musicDir, PATHS.sfxDir]) for (const f of readdirSync(dir).filter((x) => x.endsWith('.wav'))) files.push(resolve(dir, f));
const bad = [];
for (const f of files) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'null', '-'], { encoding: 'utf8' });
  const p = probe(f);
  if (r.status !== 0 || r.stderr.trim() || p.sampleRate !== 48000 || !(p.duration > 0)) bad.push({ f, err: r.stderr.trim().slice(0, 200), p });
}
const sfx = readJson(resolve(PATHS.dataDir, 'sfx.json'));
const missing = Object.values(sfx).map((e) => resolve(PATHS.sfxDir, '..', e.file)).filter((f) => !files.includes(f));
report.files = { checked: files.length, bad, sfxCatalogMissingFiles: missing };
console.log(`files: ${files.length} decoded, ${bad.length} bad, sfx catalog entries without a file: ${missing.length}`);

// ---- 5. preview mix (no effects)
const mix = [new Float32Array(n), new Float32Array(n)];
const add = (file, startSec, gainDb, envFn) => {
  const x = decode(file, 2), o = Math.round(startSec * SR), g = fromDb(gainDb);
  for (let i = 0; i < x[0].length && o + i < n; i++) { const e = envFn ? envFn((o + i) / SR) : 1; mix[0][o + i] += x[0][i] * g * e; mix[1][o + i] += x[1][i] * g * e; }
};
if (FILM.name === 'v4') add(resolve(PATHS.musicDir, 'm0.wav'), 0, -6);
const sm = tl.music[0], duckDb = sm.duckDb ?? -8;
const duckAt = (t) => {
  const f = t * FPS; let k = 0;
  for (const [d0, d1] of tl.duck) {
    if (f >= d0 - 6 && f < d0) k = Math.max(k, (f - (d0 - 6)) / 6);
    else if (f >= d0 && f <= d1) k = 1;
    else if (f > d1 && f < d1 + 12) k = Math.max(k, 1 - (f - d1) / 12);
  }
  return fromDb(duckDb * k);
};
add(resolve(PATHS.musicDir, `${SCORE}.wav`), sm.from / FPS, sm.gainDb, duckAt);
for (const l of tl.vo) add(resolve(PATHS.voDir, `${l.id}.wav`), l.from / FPS, 0);
const previewFile = resolve(QA, FILM.previewMix);
writeWav(mix, previewFile);
report.previewMix = {
  file: previewFile, loudness: ebur128(previewFile),
  note: FILM.name === 'v4' ? 'M0 at -6 dB, score at gainDb with duck ranges, VO at 0 dB; no effects, no real-voice clip' : `score-v5 at ${sm.gainDb} dB with the duck ranges (${duckDb} dB, 6 f in, 12 f out), VO at 0 dB; no effects`,
};
console.log(`preview mix: ${previewFile} ${JSON.stringify(report.previewMix.loudness)}`);

const reportPath = resolve(PATHS.cache, '..', FILM.qaReport);
if (a['no-scribe']) { const prev = readJson(reportPath); if (prev?.narration) report.narration = { ...prev.narration, note: `kept from the Scribe run of ${prev.narration.at ?? prev.at}` }; }
else report.narration.at = report.at;
writeJson(reportPath, report);
