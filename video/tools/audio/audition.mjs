#!/usr/bin/env node
// Narrator audition (BRIEF decision 3): V02, V07 and V14 in Eric, Daniel and Brian on eleven_v4, one request per line
// with previous_text / next_text from the script, 48 kHz WAV. Each take is checked with Scribe (exact words), trimmed
// and loudness-matched like a final line, and measured (pace, loudness, pitch spread, pauses).
//   node tools/audio/audition.mjs            (paid: 9 TTS + 9 Scribe; cached takes are reused)
// Files for listening: public/vo/audition/<voice>-<line>.wav and <voice>-all.wav (the three lines, 0.7 s apart).
// Measurements: tools/audio/cache/audition/audition.json.
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AUDITION, KEYTERMS, LINES, PATHS, VOICE } from './config.mjs';
import { SR, compareText, creditsUsed, decodeMono, ensureDir, readJson, writeJson, writeWav } from './lib.mjs';
import { eleven, stt, tts } from './paid.mjs';
import { masterTake, pace, pitchStats } from './vo-core.mjs';

const CACHE = ensureDir(resolve(PATHS.cache, 'audition'));
const OUT = ensureDir(PATHS.auditionDir);
const idx = Object.fromEntries(LINES.map((l, i) => [l.id, i]));

const before = await creditsUsed(eleven);
const results = readJson(resolve(CACHE, 'audition.json'), { voices: {} });
for (const v of AUDITION.voices) {
  results.voices[v.name] ??= { id: v.id, why: v.why, lines: {} };
  const parts = [];
  for (const id of AUDITION.lines) {
    const i = idx[id], line = LINES[i];
    const raw = resolve(CACHE, `${v.name}-${id}.raw.wav`);
    let meta = results.voices[v.name].lines[id];
    if (!existsSync(raw) || !meta) {
      const r = await tts(line.say, {
        voiceId: v.id, modelId: VOICE.model, outputFormat: 'wav_48000', voiceSettings: VOICE.settings, withTimestamps: true,
        previousText: LINES[i - 1]?.say, nextText: LINES[i + 1]?.say, seed: 1000 + i, languageCode: 'en',
      }, { phase: 'audition', voice: v.name, line: id });
      writeFileSync(raw, r.audio);
      meta = { requestId: r.requestId, seed: 1000 + i };
    }
    const out = resolve(OUT, `${v.name}-${id}.wav`);
    const m = masterTake(raw, out);
    if (!meta.heard) {
      const s = await stt(out, { languageCode: 'en' }, { phase: 'audition', voice: v.name, line: id });
      meta.heard = s.text;
      meta.words = s.words.filter((w) => w.type === 'word').map((w) => ({ text: w.text, start: w.start, end: w.end }));
    }
    const qa = compareText(line.text, meta.heard);
    results.voices[v.name].lines[id] = { ...meta, qa: { ok: qa.ok, heard: qa.heard }, master: m, pace: pace(meta.words.map((w) => ({ ...w, type: 'word' })), line.text), pitch: pitchStats(out) };
    parts.push(decodeMono(out));
    console.log(`${v.name} ${id} ${qa.ok ? 'OK ' : 'MISMATCH'} dur=${m.duration}s wpm=${results.voices[v.name].lines[id].pace?.wpm} I=${m.loudness.I} LRA=${m.loudness.LRA} heard="${meta.heard}"`);
  }
  // one file per voice: the three lines, 0.7 s apart
  const gap = new Float32Array(Math.round(0.7 * SR));
  const all = new Float32Array(parts.reduce((n, p) => n + p.length + gap.length, 0));
  let o = 0;
  for (const p of parts) { all.set(p, o); o += p.length + gap.length; }
  writeWav(all, resolve(OUT, `${v.name}-all.wav`));
  writeJson(resolve(CACHE, 'audition.json'), results);
}

// summary per voice
const summary = {};
for (const [name, v] of Object.entries(results.voices)) {
  const ls = Object.values(v.lines);
  const sum = (f) => ls.reduce((a, l) => a + f(l), 0);
  summary[name] = {
    allWordsOk: ls.every((l) => l.qa.ok),
    totalSec: +sum((l) => l.master.duration).toFixed(2),
    wpm: Math.round(sum((l) => l.pace.words) / sum((l) => l.pace.spanSec) * 60),
    charsPerSec: +(sum((l) => LINES.find((x) => x.id === Object.keys(v.lines).find((k) => v.lines[k] === l)).text.length) / sum((l) => l.pace.spanSec)).toFixed(1),
    gainToTargetDb: ls.map((l) => l.master.gainDb),
    LRA: ls.map((l) => l.master.loudness.LRA),
    truePeakAfter: ls.map((l) => l.master.loudness.TP),
    f0MedianHz: ls.map((l) => l.pitch.f0MedianHz),
    f0IqrSt: ls.map((l) => l.pitch.f0IqrSt),
    pausesOver120ms: ls.map((l) => l.master.pauses.length),
    droppedEdges: ls.reduce((a, l) => a + l.master.droppedEdges.length, 0),
  };
}
results.summary = summary;
writeJson(resolve(CACHE, 'audition.json'), results);
const after = await creditsUsed(eleven);
console.log(JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ creditsBefore: before.used, creditsAfter: after.used, oursTotal: after.ours }));
