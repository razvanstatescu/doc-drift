#!/usr/bin/env node
// Narration (v4: V00-V25, BRIEF section 2; v5: S01-S22, V5.md section 2): one eleven_v4 request per line with
// previous_text / next_text from the script neighbours, /with-timestamps, 48 kHz WAV -> trim + loudness-match
// (vo-core.mjs) -> Scribe (scribe_v3, no keyterms) against the script -> retake on any word mismatch (up to 3 takes)
// -> forced alignment on the shipped file.
//   node tools/audio/vo.mjs [--film v4|v5] [--only S03,S10] [--retake S10]      (default --film v5)
//   --pick S21=1        ship take 1 of S21 (a choice made by measurement; remembered in the line's state as `pick`)
//   --variant plain     with --only: voice those lines WITHOUT their direction tag into cache/vo/alt/<id>.plain.*
//                       (state, takes and Scribe QA; never shipped, never aligned), as v4 kept V00/V01's plain reads
//   --recontext S14     re-voice a line whose own text is unchanged but whose neighbours changed. Without it such a
//                       line is KEPT AS RECORDED (its state keeps the previous_text/next_text it was voiced with), so a
//                       script edit re-voices only the edited lines (v5 round 2)
// Shipped: public/vo/<id>.wav (48 kHz 16-bit mono, -20 LUFS integrated, sample peak <= -3 dBFS).
// Working files: tools/audio/cache/vo/ (raw takes, masters, transcripts, per-line state). Manifest: cache/vo/vo.json
// (v4) or cache/vo/vo-v5.json (v5). Line ids differ between films, so their takes never share a cache entry.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUDGET, PATHS, VOICE, filmOf, sayWord } from './config.mjs';
import { argv, compareText, creditsUsed, ensureDir, guardCredits, hash, norm, probe, r3, readJson, writeJson } from './lib.mjs';
import { align, eleven, stt, tts } from './paid.mjs';
import { masterTake, pace, pitchStats } from './vo-core.mjs';

const CACHE = ensureDir(resolve(PATHS.cache, 'vo'));
const a = argv();
const FILM = filmOf(a.film ?? 'v5');
const LINES = FILM.lines;
const only = a.only ? new Set(String(a.only).split(',')) : null;
const retake = a.retake ? new Set(String(a.retake).split(',')) : new Set();
const recontext = a.recontext ? new Set(String(a.recontext).split(',')) : new Set();
const picks = Object.fromEntries((a.pick ? String(a.pick).split(',') : []).map((x) => x.split('=')).map(([id, n]) => [id, Number(n)]));
const variant = a.variant ? String(a.variant) : null;
if (variant && variant !== 'plain') throw new Error(`unknown --variant ${variant} (have: plain)`);
if (variant && !only) throw new Error('--variant needs --only <ids>');
// The first line's previous_text: v4's V00 followed the barrage captions (given as context, not spoken); v5 opens cold.
const BEFORE_FIRST = FILM.before;

/**
 * Map aligned (spoken) words onto script words by matching normalised letters (e.g. rollback dot S H -> rollback.sh.,
 * four eighty-two -> 482.). `spoken(w)` turns a script word into what the voice was sent (the film's spellings).
 */
export function mapWords(scriptText, aligned, spoken = (w) => w) {
  const key = (w) => norm(w).replace(/ /g, '');
  const sw = scriptText.split(/\s+/);
  const out = [];
  let j = 0;
  for (const w of sw) {
    const target = key(spoken(w));
    // the shortest run of aligned words whose JOINED text normalises to the spoken word (norm sees the whole phrase,
    // so multi-word rules such as "four eighty two" -> 482 or "s h" -> sh apply the same way on both sides)
    let n = 0;
    for (let k = 1; k <= Math.min(8, aligned.length - j); k++) {
      if (key(aligned.slice(j, j + k).map((x) => x.text).join(' ')) === target) { n = k; break; }
    }
    if (!n) return { ok: false, words: null, why: `"${w}" vs "${aligned.slice(j, j + 3).map((x) => x.text).join(' ')}"` };
    out.push({ text: w, start: r3(aligned[j].start), end: r3(aligned[j + n - 1].end) });
    j += n;
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

async function voiceLine(line0, i) {
  // --variant plain: the same line without its direction tag, kept aside in cache/vo/alt/ (never shipped)
  const line = variant === 'plain' ? { ...line0, direction: undefined } : line0;
  const dir = variant ? ensureDir(resolve(CACHE, 'alt')) : CACHE;
  const stem = variant ? `${line.id}.${variant}` : line.id;
  const prev = i === 0 ? BEFORE_FIRST : LINES[i - 1].say;
  const next = LINES[i + 1]?.say;
  const base = { voice: VOICE.id, model: VOICE.model, settings: VOICE.settings, say: line.say, prev, next, format: 'wav_48000', ...(line.direction ? { direction: line.direction } : {}) };
  const key = hash(base);
  const statePath = resolve(dir, `${stem}.json`);
  const state = readJson(statePath);
  const pick = picks[line.id] ?? (state?.key === key ? state.pick : undefined);
  if (state?.key === key && state.final && !retake.has(line.id) && (pick === undefined || state.final.qa.chosen === pick)) return state;
  // same voice, model, settings, text and tag, only the neighbours' text changed: the recorded take stands
  const sameContent = state?.final && ['voice', 'model', 'settings', 'say', 'format', 'direction'].every((k) => JSON.stringify(state[k]) === JSON.stringify(base[k]));
  if (sameContent && state.key !== key && !variant && !retake.has(line.id) && !recontext.has(line.id) && picks[line.id] === undefined) {
    console.log(`${line.id} kept as recorded (only its neighbours changed; --recontext ${line.id} re-voices it)`);
    return state;
  }

  const takes = state?.key === key ? state.takes ?? [] : [];
  const start = retake.has(line.id) ? takes.length : 0;
  for (let attempt = start; attempt <= start + BUDGET.retakesPerLine; attempt++) {
    if (takes.some((t) => t.qa.ok && !t.flags.length) && !retake.has(line.id)) break;
    await guardCredits(eleven, 200);
    const seed = FILM.seedBase + i * 10 + attempt + (variant ? 100 : 0);
    const r = await tts(line.direction ? `${line.direction} ${line.say}` : line.say, {
      voiceId: VOICE.id, modelId: VOICE.model, outputFormat: 'wav_48000', voiceSettings: VOICE.settings, withTimestamps: true,
      previousText: prev, nextText: next, seed, languageCode: 'en',
    }, { phase: 'vo', line: line.id, attempt });
    const raw = resolve(dir, `${stem}.t${attempt}.raw.wav`);
    writeFileSync(raw, r.audio);
    const mastered = resolve(dir, `${stem}.t${attempt}.wav`);
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
  if (variant) {
    // kept aside for a listen and for measurement; the shipped file and the timeline are untouched
    const st = { key, ...base, variant, takes, final: null };
    writeJson(statePath, st);
    return { ...st, final: readJson(resolve(CACHE, `${line.id}.json`))?.final };
  }
  if (pick !== undefined && !takes.some((t) => t.attempt === pick && t.qa.ok)) throw new Error(`${line.id}: --pick ${pick} is not a word-perfect take`);
  const chosen = (pick !== undefined ? takes.find((t) => t.attempt === pick) : null)
    ?? takes.findLast((t) => t.qa.ok && !t.flags.length && (!retake.has(line.id) || t.attempt >= start))
    ?? takes.find((t) => t.qa.ok) ?? takes.at(-1);
  const out = resolve(PATHS.voDir, `${line.id}.wav`);
  ensureDir(PATHS.voDir);
  copyFileSync(chosen.mastered, out);

  // forced alignment on the shipped file, with the spoken text; mapped back onto the script words
  const al = await align(out, line.say, { phase: 'vo', line: line.id });
  const aligned = al.words.filter((w) => w.text.trim() !== '').map((w) => ({ text: w.text.trim(), start: w.start, end: w.end, loss: w.loss }));
  const mapped = mapWords(line.text, aligned, (w) => sayWord(FILM, w));
  if (!mapped.ok) throw new Error(`${line.id}: aligned words do not map onto the script (${mapped.why})`);
  const final = {
    id: line.id, scene: line.scene, text: line.text, say: line.say, file: `vo/${line.id}.wav`,
    duration: r3(probe(out).duration), words: mapped.words, alignLoss: +al.loss.toFixed(3),
    loudness: chosen.master.loudness, limiterMaxReductionDb: chosen.master.limiterMaxReductionDb, pauses: chosen.master.pauses,
    droppedEdges: chosen.master.droppedEdges, pace: chosen.pace, pitch: pitchStats(out), flags: chosen.flags,
    qa: { chosen: chosen.attempt, takes: takes.map((t) => ({ attempt: t.attempt, ok: t.qa.ok, heard: t.heard, flags: t.flags })) },
  };
  const st = { key, ...base, takes, ...(pick !== undefined ? { pick } : {}), final };
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
writeJson(resolve(CACHE, FILM.manifest), { film: FILM.name, voice: VOICE, lines: manifest });
const after = await creditsUsed(eleven);
const tot = manifest.reduce((s, l) => s + l.duration, 0);
const Is = manifest.map((l) => l.loudness.I);
console.log(JSON.stringify({
  lines: manifest.length, totalVoSec: r3(tot), allWordsOk: manifest.every((l) => l.qa.takes.find((t) => t.attempt === l.qa.chosen).ok),
  loudnessSpreadLU: r3(Math.max(...Is) - Math.min(...Is)), retakes: manifest.filter((l) => l.qa.takes.length > 1).map((l) => `${l.id}x${l.qa.takes.length}`),
  flagged: manifest.filter((l) => l.flags.length).map((l) => `${l.id}:${l.flags.join('+')}`),
  creditsBefore: before.used, creditsAfter: after.used, oursTotal: after.ours,
}, null, 1));
