#!/usr/bin/env node
// Music for the Doc Drift film: the model test, the cold-open bed (M0) and the score. Eleven Music, 48 kHz.
//   node tools/audio/music.mjs --test             one short take per model (music_v1, music_v2_5) from the same intents
//   node tools/audio/music.mjs --m0               the cold-open bed source take (dark pulse, D minor, 20 s)
//   node tools/audio/music.mjs --score [--dry]    the score source take, sections from src/data/timeline.json
//   node tools/audio/music.mjs --analyze <file>   beat grid + per-bar profile (no spend)
// Raw takes and analyses: tools/audio/cache/music/. Edits are rendered by tools/audio/arrange.py.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PATHS } from './config.mjs';
import { argv, creditsUsed, ensureDir, guardCredits, probe, readJson, writeJson } from './lib.mjs';
import { eleven, music } from './paid.mjs';
import { barProfile, beatGrid, biggestJump, writeAnalysis } from './music-analysis.mjs';

const DIR = ensureDir(resolve(PATHS.cache, 'music'));
const a = argv();

/** Request PCM 48 kHz (lossless) and wrap it as WAV; fall back to mp3_48000_320. Returns the saved path. */
async function generate(opts, base, meta) {
  for (const fmt of ['pcm_48000', 'mp3_48000_320']) {
    try {
      const buf = await music({ ...opts, outputFormat: fmt, timeoutMs: 295_000 }, meta);
      if (fmt === 'mp3_48000_320') { const p = `${base}.mp3`; writeFileSync(p, buf); return p; }
      const planned = (opts.compositionPlan.chunks ?? opts.compositionPlan.sections).reduce((s, c) => s + c.duration_ms, 0) / 1000;
      const ch = Math.abs(buf.length / (48000 * 4) - planned) < Math.abs(buf.length / (48000 * 2) - planned) ? 2 : 1;
      const raw = `${base}.pcm`;
      writeFileSync(raw, buf);
      const { spawnSync } = await import('node:child_process');
      const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', '48000', '-ac', String(ch), '-i', raw, '-c:a', 'pcm_s16le', `${base}.wav`]);
      if (r.status !== 0) throw new Error(String(r.stderr));
      spawnSync('rm', ['-f', raw]);
      return `${base}.wav`;
    } catch (e) {
      if ([400, 403, 422].includes(e.status) && /format|output|tier|subscri/i.test(`${e.message} ${e.body || ''}`) && fmt !== 'mp3_48000_320') { console.warn(`format ${fmt} refused (${e.status}); trying mp3`); continue; }
      throw e;
    }
  }
}

// ---------------------------------------------------------------- shared styles
const SCORE_POS = ['120 BPM', '4/4', 'instrumental', 'F major', 'modern minimal electronic', 'warm analog synthesizers', 'deep synth bass', 'tight electronic drums', 'premium tech product film score', 'clean mix with space for a voiceover', 'steady tempo'];
const SCORE_NEG = ['vocals', 'choir', 'spoken word', 'guitar', 'piano', 'orchestra', 'strings', 'brass', 'tempo changes', 'swing', 'lo-fi', 'dubstep', 'cheesy', 'long silent gaps'];

// ---------------------------------------------------------------- model test
const TEST = [
  { name: 'Night', ms: 8000, text: '{only a low synth pulse and ticking hi-hats}', pos: ['sparse and tense', 'only a low synth pulse on every beat and ticking closed hi-hats', 'a dark held pad', 'no kick, no snare'], neg: ['kick drum', 'snare', 'melody', 'bright'] },
  { name: 'Day lift', ms: 8000, text: '{the full band enters on the first beat}', pos: ['the lift: on the very first beat the full bright groove enters at once', 'punchy kick and snare', 'bright confident synth chords', 'modern and uplifting'], neg: ['slow build', 'fade in', 'sparse'] },
  { name: 'Groove', ms: 8000, text: '{steady groove under a voiceover}', pos: ['a steady unobtrusive groove', 'kick, soft snare, synth bass, light arpeggio', 'constant energy'], neg: ['breakdown', 'build-up', 'drop'] },
];

function plan(sections, model, { pos = SCORE_POS, neg = SCORE_NEG } = {}) {
  if (model === 'music_v1') {
    return {
      positive_global_styles: pos, negative_global_styles: neg,
      sections: sections.map((s) => ({ section_name: s.name, positive_local_styles: s.pos, negative_local_styles: s.neg, duration_ms: s.ms, lines: [] })),
    };
  }
  return {
    chunks: sections.map((s, i) => ({
      text: `[${s.name}]${s.text ? ` ${s.text}` : ''}`,
      duration_ms: s.ms,
      positive_styles: (i === 0 ? [...pos.slice(0, 6), ...s.pos] : ['120 BPM', 'instrumental', ...s.pos, ...pos.slice(4, 7)]).slice(0, 12),
      negative_styles: [...s.neg, ...neg.slice(0, 6)].slice(0, 10),
      context_adherence: 'high',
    })),
  };
}

async function test() {
  const res = {};
  for (const model of ['music_v1', 'music_v2_5']) {
    const base = resolve(DIR, `test-${model}`);
    const p = plan(TEST, model);
    writeJson(`${base}.plan.json`, p);
    let file = readJson(`${base}.json`)?.file;
    if (!file) {
      await guardCredits(eleven, 600);
      file = await generate({ compositionPlan: p, modelId: model, seed: 4801, respectSectionsDurations: model === 'music_v1' ? true : undefined }, base, { phase: 'music-test', take: model });
      writeJson(`${base}.json`, { file, model });
    }
    const g = beatGrid(file);
    const prof = barProfile(file, { barStart: 0, barSec: 2 });
    const night = prof.filter((b) => b.t < 8), day = prof.filter((b) => b.t >= 8 && b.t < 16), groove = prof.filter((b) => b.t >= 16);
    const mean = (arr, k) => +(arr.reduce((s, b) => s + b[k], 0) / Math.max(1, arr.length)).toFixed(1);
    res[model] = {
      file, duration: probe(file).duration, bpmGrid: g.bpmGrid, gridRmsMs: g.gridRmsMs, gridSource: g.source, gridOffset: g.gridOffset,
      sections: { night: { rms: mean(night, 'rms'), low: mean(night, 'low'), high: mean(night, 'high'), onsets: mean(night, 'onsets') }, day: { rms: mean(day, 'rms'), low: mean(day, 'low'), high: mean(day, 'high'), onsets: mean(day, 'onsets') }, groove: { rms: mean(groove, 'rms'), low: mean(groove, 'low'), high: mean(groove, 'high'), onsets: mean(groove, 'onsets') } },
      lift: biggestJump(prof, { from: 2, to: 20 }),
      bars: prof,
    };
    console.log(model, JSON.stringify({ ...res[model], bars: prof.map((b) => `${b.t}s rms${b.rms} lo${b.low} hi${b.high} on${b.onsets}`) }, null, 1));
  }
  writeJson(resolve(DIR, 'test-results.json'), res);
}

// ---------------------------------------------------------------- M0, the cold-open bed (D minor, the score's relative minor)
const M0_POS = ['120 BPM', '4/4', 'instrumental', 'D minor', 'dark modern trailer and glitch hybrid', 'deep sub bass pulse', 'ticking closed hi-hats', 'glitchy bit-crushed percussion', 'tense staccato synth stabs', 'cinematic tension', 'tight, punchy modern mix', 'continuous, no gaps'];
const M0_NEG = ['melody', 'bright', 'major key', 'vocals', 'choir', 'piano', 'guitar', 'EDM drop', 'dubstep wobble', 'tempo changes', 'swing', 'lo-fi', 'long silent gaps', 'fade in'];
const M0_SECTIONS = [
  { name: 'Pulse', ms: 4000, text: '{sub pulse and ticking hats only}', pos: ['only a deep sub pulse on every beat and ticking closed hi-hats on sixteenths', 'sparse, tense and dark', 'starts on the very first beat'], neg: ['drums', 'synth stabs', 'fade in'] },
  { name: 'Glitch build', ms: 4000, text: '{glitch percussion and offbeat stabs enter}', pos: ['glitchy bit-crushed percussion enters', 'tense staccato synth stabs on the offbeats', 'building'], neg: ['melody', 'release'] },
  { name: 'Glitch build 2', ms: 4000, text: '{denser, stabs on every beat}', pos: ['denser glitch percussion and digital stutters', 'synth stabs on every beat', 'low toms', 'building harder'], neg: ['melody', 'breakdown'] },
  { name: 'Peak', ms: 4000, text: '{full intensity}', pos: ['full intensity: driving trailer percussion, distorted sub, stabs', 'relentless'], neg: ['release', 'drop', 'breakdown'] },
  { name: 'Peak 2', ms: 4000, text: '{still at its peak}', pos: ['everything at its peak, relentless to the very end'], neg: ['fade', 'release', 'drop', 'silence', 'ending'] },
];

async function m0() {
  const model = a.model || readJson(resolve(DIR, 'choice.json'))?.model || 'music_v1';
  const base = resolve(DIR, `m0-${model}`);
  const p = plan(M0_SECTIONS, model, { pos: M0_POS, neg: M0_NEG });
  writeJson(`${base}.plan.json`, p);
  await guardCredits(eleven, 400);
  const file = await generate({ compositionPlan: p, modelId: model, seed: 909, respectSectionsDurations: model === 'music_v1' ? true : undefined }, base, { phase: 'm0', take: model });
  writeJson(`${base}.json`, { file, model });
  console.log(JSON.stringify(writeAnalysis(file, { model }), (k, v) => (k === 'profile' ? v.map((b) => `${b.t}s rms${b.rms} lo${b.low} hi${b.high} on${b.onsets}`) : v), 1));
}

// ---------------------------------------------------------------- the score
/** Score sections on the score clock (0 = R), built from the timeline's scene starts and markers. */
export function scoreSections(tl, { slackEndSec = 6 } = {}) {
  const R = tl.markers.reveal, s = (f) => +((f - R) / 30).toFixed(3);
  const m = tl.markers, end = s(tl.totalFrames);
  const S = [
    { id: 'M1', name: 'Title swell', a: 0, b: s(m.A1), text: '{a warm swell under the title}', pos: ['a warm, wide synth pad swell blooms from the first beat', 'soft sub bass note', 'no drums', 'calm, hopeful, spacious'], neg: ['drums', 'percussion', 'busy', 'dark'] },
    { id: 'M2', name: 'Night', a: s(m.A1), b: s(m.A2), text: '{sparse and tense, a low pulse and ticking hats, building slightly}', pos: ['3 a.m. tension: sparse and dark', 'a low synth pulse on every beat and ticking closed hi-hats', 'a dark held pad', 'building very slightly over time', 'no kick, no snare'], neg: ['kick drum', 'snare', 'melody', 'bright', 'major key'] },
    { id: 'M3', name: 'Day lift', a: s(m.A2), b: s(m.P1), text: '{the lift: the full band enters on the first beat}', pos: ['the lift: on the very first beat the full bright groove enters at once', 'punchy kick and snare', 'bright confident synth chords', 'modern, clear and uplifting'], neg: ['slow build', 'fade in', 'sparse', 'dark'] },
    { id: 'M4', name: 'Groove', a: s(m.P1), b: s(m.P4), text: '{a steady groove under the voice}', pos: ['a steady, unobtrusive groove under a voiceover', 'kick, soft snare, synth bass, a light arpeggio', 'constant energy, no big changes'], neg: ['breakdown', 'build-up', 'drop', 'busy lead melody'] },
    { id: 'M5', name: 'Resolve', a: s(m.P4), b: s(m.P5), text: '{lighter, then settling}', pos: ['the groove thins to bass, soft kick and arpeggio', 'resolving, settling, relieved', 'warm chords'], neg: ['build-up', 'drop', 'dark'] },
    { id: 'M6', name: 'Build', a: s(m.P5), b: s(m.endHit), text: '{building to the final hit}', pos: ['building steadily: the full groove returns and rises', 'a snare build and a rising filter sweep in the last bar', 'anticipation'], neg: ['breakdown', 'fade'] },
    { id: 'M7', name: 'Final hit and ring out', a: s(m.endHit), b: end + slackEndSec, text: '{one big final hit, then a long ring-out}', pos: ['one big final hit on the first beat: full chord and sub', 'then a long warm ring-out on a held chord', 'no new drums', 'ends cleanly'], neg: ['new drums', 'build-up', 'abrupt cut'] },
  ];
  return S.map((x) => ({ ...x, ms: Math.round((x.b - x.a) * 1000) }));
}

async function score() {
  const tl = readJson(resolve(PATHS.dataDir, 'timeline.json'));
  const model = a.model || readJson(resolve(DIR, 'choice.json'))?.model;
  if (!model) throw new Error('run --test and write tools/audio/cache/music/choice.json first (or pass --model)');
  const secs = scoreSections(tl);
  for (const s of secs) if (s.ms < 3000) throw new Error(`${s.id} ${s.ms} ms < 3000`);
  const p = plan(secs, model);
  const seed = Number(a.seed || 7101);
  const base = resolve(DIR, `score-${model}-s${seed}`);
  writeJson(`${base}.plan.json`, p);
  writeJson(`${base}.sections.json`, secs);
  console.log(secs.map((s) => `${s.id} ${s.name} ${s.a}-${s.b} s (${s.ms} ms)`).join('\n'));
  if (a.dry) return;
  await guardCredits(eleven, 1500);
  const file = await generate({ compositionPlan: p, modelId: model, seed, respectSectionsDurations: model === 'music_v1' ? true : undefined }, base, { phase: 'score', take: `${model}-s${seed}` });
  writeJson(`${base}.json`, { file, model, seed });
  const an = writeAnalysis(file, { model, seed });
  console.log(JSON.stringify({ file, bpmGrid: an.bpmGrid, gridRmsMs: an.gridRmsMs, gridOffset: an.gridOffset, firstDownbeat: an.firstDownbeat, source: an.source }));
  console.log(an.profile.map((b) => `${b.t}s rms${b.rms} lo${b.low} hi${b.high} on${b.onsets}`).join('\n'));
}

const before = await creditsUsed(eleven);
if (a.test) await test();
if (a.m0) await m0();
if (a.score) await score();
if (a.analyze) {
  const r = writeAnalysis(resolve(String(a.analyze)));
  console.log(JSON.stringify({ ...r, profile: r.profile.map((b) => `${b.t}s rms${b.rms} lo${b.low} hi${b.high} on${b.onsets}`) }, null, 1));
}
const after = await creditsUsed(eleven);
console.log(JSON.stringify({ creditsBefore: before.used, creditsAfter: after.used, oursTotal: after.ours }));
