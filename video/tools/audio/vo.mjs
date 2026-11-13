#!/usr/bin/env node
// Narration V00-V25 (BRIEF section 2): one eleven_v4 request per line with previous_text / next_text from the script
// neighbours, /with-timestamps, 48 kHz WAV -> trim + loudness-match (vo-core.mjs) -> Scribe (scribe_v3, no keyterms)
// against the script -> retake on any word mismatch (up to 3 takes) -> forced alignment on the shipped file.
//   node tools/audio/vo.mjs [--only V03,V10] [--retake V10]
// Shipped: public/vo/Vxx.wav (48 kHz 16-bit mono, -20 LUFS integrated, sample peak <= -3 dBFS).
// Working files: tools/audio/cache/vo/ (raw takes, masters, transcripts, per-line state). Manifest: cache/vo/vo.json.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUDGET, LINES, PATHS, VOICE } from './config.mjs';
import { argv, compareText, creditsUsed, ensureDir, guardCredits, hash, norm, probe, r3, readJson, writeJson } from './lib.mjs';
import { align, eleven, stt, tts } from './paid.mjs';
import { masterTake, pace, pitchStats } from './vo-core.mjs';

const CACHE = ensureDir(resolve(PATHS.cache, 'vo'));
const a = argv();
const only = a.only ? new Set(String(a.only).split(',')) : null;
const retake = a.retake ? new Set(String(a.retake).split(',')) : new Set();
// V00 follows the barrage captions; give the model that context (it is not spoken).
const BEFORE_V00 = "The code moved. The docs didn't. The agents can't tell.";

/** Map aligned (spoken) words onto script words by matching normalised letters (e.g. rollback dot S H -> rollback.sh.). */
export function mapWords(scriptText, aligned) {
  const key = (w) => norm(w).replace(/ /g, '');
  const sw = scriptText.split(/\s+/);
  const out = [];
  let j = 0;
  for (const w of sw) {
    const target = key(w);
    let acc = '', start = null, end = null;
    while (j < aligned.length && acc.length < target.length) {
      const k = key(aligned[j].text);
      if (start === null) start = aligned[j].start;
      acc += k; end = aligned[j].end; j++;
    }
    if (acc !== target) return { ok: false, words: null, why: `"${w}" vs "${acc}"` };
    out.push({ text: w, start: r3(start), end: r3(end) });
  }
  return { ok: j === aligned.length, words: out, why: j === aligned.length ? null : 'left-over aligned words' };
}

function flagsOf(m, p) {
  const f = [];
  if (p && p.firstWordAt > 0.25) f.push('late-first-word');
  if (m.pauses.some((x) => x.len > 1.2)) f.push('long-pause');
  if (p && (p.charsPerSec < 11 || p.charsPerSec > 21)) f.push('pace');
  if (m.loudness.TP > -2) f.push('true-peak');
  return f;
}

async function voiceLine(line, i) {
  const prev = i === 0 ? BEFORE_V00 : LINES[i - 1].say;
  const next = LINES[i + 1]?.say;
  const base = { voice: VOICE.id, model: VOICE.model, settings: VOICE.settings, say: line.say, prev, next, format: 'wav_48000', ...(line.direction ? { direction: line.direction } : {}) };
  const key = hash(base);
  const statePath = resolve(CACHE, `${line.id}.json`);
  const state = readJson(statePath);
  if (state?.key === key && state.final && !retake.has(line.id)) return state;

  const takes = state?.key === key ? state.takes ?? [] : [];
  const start = retake.has(line.id) ? takes.length : 0;
  for (let attempt = start; attempt <= start + BUDGET.retakesPerLine; attempt++) {
    if (takes.some((t) => t.qa.ok && !t.flags.length) && !retake.has(line.id)) break;
    await guardCredits(eleven, 200);
    const seed = 3000 + i * 10 + attempt;
    const r = await tts(line.direction ? `${line.direction} ${line.say}` : line.say, {
      voiceId: VOICE.id, modelId: VOICE.model, outputFormat: 'wav_48000', voiceSettings: VOICE.settings, withTimestamps: true,
      previousText: prev, nextText: next, seed, languageCode: 'en',
    }, { phase: 'vo', line: line.id, attempt });
    const raw = resolve(CACHE, `${line.id}.t${attempt}.raw.wav`);
    writeFileSync(raw, r.audio);
    const mastered = resolve(CACHE, `${line.id}.t${attempt}.wav`);
    const m = masterTake(raw, mastered);
    const s = await stt(mastered, { languageCode: 'en' }, { phase: 'vo', line: line.id, attempt });
    const words = s.words.filter((w) => w.type === 'word');
    const qa = compareText(line.text, s.text);
    const p = pace(words, line.text);
    const take = { attempt, seed, requestId: r.requestId, raw, mastered, heard: s.text, qa, pace: p, master: m, flags: flagsOf(m, p) };
    takes.push(take);
    console.log(`${line.id} t${attempt} ${qa.ok ? 'OK ' : 'MISMATCH'} ${take.flags.join(',')} dur=${m.duration}s cps=${p?.charsPerSec} lim=${m.limiterMaxReductionDb}dB heard="${s.text}"`);
    writeJson(statePath, { key, ...base, takes });
    if (qa.ok && !retake.has(line.id)) break; // a word-perfect take ends the loop; other flags are reported, not retaken
    if (qa.ok && retake.has(line.id)) break;
  }
  const chosen = takes.findLast((t) => t.qa.ok && !t.flags.length && (!retake.has(line.id) || t.attempt >= start))
    ?? takes.find((t) => t.qa.ok) ?? takes.at(-1);
  const out = resolve(PATHS.voDir, `${line.id}.wav`);
  ensureDir(PATHS.voDir);
  copyFileSync(chosen.mastered, out);

  // forced alignment on the shipped file, with the spoken text; mapped back onto the script words
  const al = await align(out, line.say, { phase: 'vo', line: line.id });
  const aligned = al.words.filter((w) => w.text.trim() !== '').map((w) => ({ text: w.text.trim(), start: w.start, end: w.end, loss: w.loss }));
  const mapped = mapWords(line.text, aligned);
  if (!mapped.ok) throw new Error(`${line.id}: aligned words do not map onto the script (${mapped.why})`);
  const final = {
    id: line.id, scene: line.scene, text: line.text, say: line.say, file: `vo/${line.id}.wav`,
    duration: r3(probe(out).duration), words: mapped.words, alignLoss: +al.loss.toFixed(3),
    loudness: chosen.master.loudness, limiterMaxReductionDb: chosen.master.limiterMaxReductionDb, pauses: chosen.master.pauses,
    droppedEdges: chosen.master.droppedEdges, pace: chosen.pace, pitch: pitchStats(out), flags: chosen.flags,
    qa: { chosen: chosen.attempt, takes: takes.map((t) => ({ attempt: t.attempt, ok: t.qa.ok, heard: t.heard, flags: t.flags })) },
  };
  const st = { key, ...base, takes, final };
  writeJson(statePath, st);
  return st;
}

const before = await creditsUsed(eleven);
const manifest = [];
for (let i = 0; i < LINES.length; i++) {
  const line = LINES[i];
  if (only && !only.has(line.id)) {
    const st = readJson(resolve(CACHE, `${line.id}.json`));
    if (st?.final) manifest.push(st.final);
    continue;
  }
  const st = await voiceLine(line, i);
  manifest.push(st.final);
}
writeJson(resolve(CACHE, 'vo.json'), { voice: VOICE, lines: manifest });
const after = await creditsUsed(eleven);
const tot = manifest.reduce((s, l) => s + l.duration, 0);
const Is = manifest.map((l) => l.loudness.I);
console.log(JSON.stringify({
  lines: manifest.length, totalVoSec: r3(tot), allWordsOk: manifest.every((l) => l.qa.takes.find((t) => t.attempt === l.qa.chosen).ok),
  loudnessSpreadLU: r3(Math.max(...Is) - Math.min(...Is)), retakes: manifest.filter((l) => l.qa.takes.length > 1).map((l) => `${l.id}x${l.qa.takes.length}`),
  flagged: manifest.filter((l) => l.flags.length).map((l) => `${l.id}:${l.flags.join('+')}`),
  creditsBefore: before.used, creditsAfter: after.used, oursTotal: after.ours,
}, null, 1));
