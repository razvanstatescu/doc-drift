#!/usr/bin/env node
// Pronunciation and format probes for the narrator (Eric, eleven_v4). Paid but tiny: short phrases only.
//   node tools/audio/probe-say.mjs --formats      which 48 kHz output formats this payg account may request
//   node tools/audio/probe-say.mjs --say          how v4 reads rollback.sh, 3 a.m., MCP, Rovo, Jira (Scribe without keyterms)
// Results: tools/audio/cache/probe/*.json and the WAVs beside them.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PATHS, VOICE } from './config.mjs';
import { argv, creditsUsed, ensureDir, probe, r3, writeJson } from './lib.mjs';
import { eleven, stt, tts } from './paid.mjs';

const DIR = ensureDir(resolve(PATHS.cache, 'probe'));
const a = argv();

async function formats() {
  const out = {};
  for (const f of ['wav_48000', 'pcm_48000', 'opus_48000_128', 'mp3_44100_128']) {
    try {
      const r = await tts('Test.', { voiceId: VOICE.id, modelId: VOICE.model, outputFormat: f, voiceSettings: VOICE.settings }, { phase: 'probe-format' });
      const ext = f.startsWith('wav') ? 'wav' : f.startsWith('pcm') ? 'pcm' : f.startsWith('opus') ? 'opus' : 'mp3';
      const file = resolve(DIR, `format-${f}.${ext}`);
      writeFileSync(file, r.audio);
      out[f] = { ok: true, bytes: r.audio.length, ...(ext === 'pcm' ? {} : probe(file)) };
    } catch (e) {
      out[f] = { ok: false, status: e.status, message: String(e.message).slice(0, 200) };
    }
    console.log(f, JSON.stringify(out[f]));
  }
  writeJson(resolve(DIR, 'formats.json'), out);
}

/** Phrase variants: [id, text, span-of-interest] */
const VARIANTS = [
  ['sh-raw', 'The runbook says to run rollback.sh.', 'rollback.sh'],
  ['sh-dotSH', 'The runbook says to run rollback dot S H.', 'rollback dot S H'],
  ['sh-dotlowsh', 'The runbook says to run rollback dot sh.', 'rollback dot sh'],
  ['sh-esshaitch', 'The runbook says to run rollback dot ess aitch.', 'rollback dot ess aitch'],
  ['sh-dotSdotH', 'The runbook says to run rollback dot S. H.', 'rollback dot S. H.'],
  ['am-raw', "It's 3 a.m. Payments is down.", '3 a.m.'],
  ['mcp-raw', 'Coding agents get the same signal over MCP: which pages cover a file, and which to trust.', 'MCP'],
  ['rovo-raw', 'Ask Drift Reviewer, our Rovo agent, how to roll back.', 'Rovo'],
  ['jira-raw', 'Jira changes count too. And every space gets a drift dashboard.', 'Jira'],
];

function spanTimes(al, span) {
  const text = al.characters.join('');
  const i = text.indexOf(span);
  if (i < 0) return null;
  return { start: r3(al.character_start_times_seconds[i]), end: r3(al.character_end_times_seconds[i + span.length - 1]) };
}

async function say() {
  const fmt = a.format || 'wav_48000';
  const results = [];
  for (const [id, text, span] of VARIANTS) {
    if (a.only && !String(a.only).split(',').includes(id)) continue;
    const r = await tts(text, { voiceId: VOICE.id, modelId: VOICE.model, outputFormat: fmt, voiceSettings: VOICE.settings, withTimestamps: true, languageCode: 'en', seed: 4242 }, { phase: 'probe-say', id });
    const file = resolve(DIR, `say-${id}${/[A-Z]/.test(id) ? '-uc' : ''}.wav`); // APFS is case-insensitive
    writeFileSync(file, r.audio);
    const heard = await stt(file, { languageCode: 'en' }, { phase: 'probe-say', id });
    const normText = r.normalizedAlignment?.characters?.join('') ?? null;
    const res = {
      id, text, span, duration: r3(probe(file).duration),
      heard: heard.text,
      normalizedText: normText,
      spanTimes: spanTimes(r.alignment, span),
      words: heard.words?.filter((w) => w.type === 'word').map((w) => ({ t: w.text, s: r3(w.start), e: r3(w.end) })),
    };
    results.push(res);
    console.log(JSON.stringify({ id, dur: res.duration, heard: res.heard, normalizedText: res.normalizedText, span: res.spanTimes }));
  }
  writeJson(resolve(DIR, `say${a.only ? '-' + a.only.replace(/,/g, '_') : ''}.json`), results);
}

const before = await creditsUsed(eleven.default ?? eleven);
if (a.formats) await formats();
if (a.say) await say();
const after = await creditsUsed(eleven.default ?? eleven);
console.log(JSON.stringify({ creditsBefore: before.used, creditsAfter: after.used, delta: after.used - before.used, oursTotal: after.ours }));
