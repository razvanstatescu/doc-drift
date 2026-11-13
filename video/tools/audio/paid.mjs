// Every paid ElevenLabs call of the audio agent goes through here, so each one lands in tools/audio/gen-log.jsonl.
// Keys are loaded by tools/lib/env.mjs inside eleven.mjs and never printed.
import * as eleven from '../lib/eleven.mjs';
import { logPaid, probe } from './lib.mjs';

export { eleven };

export async function tts(text, o, meta = {}) {
  const r = await eleven.tts(text, o);
  logPaid({ kind: 'tts', model: o.modelId, voice: o.voiceId, format: o.outputFormat, chars: text.length, characterCost: r.characterCost, requestId: r.requestId, ...meta });
  return r;
}

export async function stt(file, o = {}, meta = {}) {
  const r = await eleven.stt(file, o);
  logPaid({ kind: 'stt', model: o.modelId ?? eleven.DEFAULTS.sttModel, sec: +probe(file).duration.toFixed(3), ...meta });
  return r;
}

export async function align(file, text, meta = {}) {
  const r = await eleven.align(file, text);
  logPaid({ kind: 'align', sec: +probe(file).duration.toFixed(3), chars: text.length, ...meta });
  return r;
}

export async function sfx(prompt, o = {}, meta = {}) {
  const buf = await eleven.sfx(prompt, o);
  logPaid({ kind: 'sfx', model: o.modelId ?? eleven.DEFAULTS.sfxModel, format: o.outputFormat, sec: o.durationSeconds, characterCost: buf.meta?.characterCost, requestId: buf.meta?.requestId, ...meta });
  return buf;
}

export async function music(o, meta = {}) {
  const buf = await eleven.music(o);
  const ms = o.compositionPlan
    ? (o.compositionPlan.chunks ?? o.compositionPlan.sections ?? []).reduce((a, s) => a + s.duration_ms, 0)
    : o.lengthMs;
  logPaid({ kind: 'music', model: o.modelId, format: o.outputFormat, sec: ms / 1000, seed: o.seed, characterCost: buf.meta?.characterCost, requestId: buf.meta?.requestId, ...meta });
  return buf;
}
