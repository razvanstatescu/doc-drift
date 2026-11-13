// ElevenLabs helpers (Node 22, built-ins only). Verified live 2026-10-22, see notes/tools.md.
//   import * as eleven from './eleven.mjs';
//   const { audio, alignment, words } = await eleven.tts('Hello.', { voiceId, withTimestamps: true });
// Keys come from env.mjs; they are never logged. All calls go through http.mjs (retry/backoff).
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { loadEnv } from './env.mjs';
import { request } from './http.mjs';

const BASE = 'https://api.elevenlabs.io';

export const DEFAULTS = {
  ttsModel: 'eleven_v4', // newest; with-timestamps verified. eleven_v3 / eleven_multilingual_v2 also verified
  // payg tier (verified): mp3_44100_192 works. pcm/wav 44.1k is documented as Pro+ (not tested).
  ttsFormat: 'mp3_44100_192',
  sfxModel: 'eleven_text_to_sound_v3',
  sfxFormat: 'mp3_44100_192',
  musicModel: 'music_v2_5',
  musicFormat: 'mp3_48000_320',
  sttModel: 'scribe_v3',
};

function headers(extra = {}) {
  if (!process.env.ELEVENLABS_API_KEY) loadEnv();
  return { 'xi-api-key': process.env.ELEVENLABS_API_KEY, ...extra };
}
const q = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null)).toString();
  return s ? `?${s}` : '';
};
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));
// The response headers ElevenLabs uses for cost/request tracking (safe: response side only).
const meta = (r) => ({
  requestId: r.headers['request-id'],
  characterCost: r.headers['character-cost'] != null ? Number(r.headers['character-cost']) : undefined,
  historyItemId: r.headers['history-item-id'],
  ms: r.ms,
});

export async function subscription() {
  return (await request(`${BASE}/v1/user/subscription`, { headers: headers() })).data;
}

export async function models() {
  return (await request(`${BASE}/v1/models`, { headers: headers() })).data;
}

/** All voices in the account library (premade + added), paginated via /v2/voices. */
export async function listVoices({ search, category, voiceType, pageSize = 100 } = {}) {
  const out = [];
  let token;
  do {
    const url = `${BASE}/v2/voices${q({ page_size: pageSize, search, category, voice_type: voiceType, next_page_token: token, include_total_count: true })}`;
    const d = (await request(url, { headers: headers() })).data;
    out.push(...d.voices);
    token = d.has_more ? d.next_page_token : undefined;
  } while (token);
  return out;
}

/** Public Voice Library search (GET /v1/shared-voices). Using one in TTS may require adding it (voice slots). */
export async function sharedVoices(filters = {}) {
  const url = `${BASE}/v1/shared-voices${q({ page_size: 30, language: 'en', ...filters })}`;
  return (await request(url, { headers: headers() })).data;
}

/** Character alignment -> word timings. Words are runs of non-space characters (punctuation stays attached). */
export function alignmentToWords(alignment, { offsetSeconds = 0 } = {}) {
  if (!alignment) return [];
  const { characters: ch, character_start_times_seconds: st, character_end_times_seconds: en } = alignment;
  const words = [];
  let cur = null;
  for (let i = 0; i < ch.length; i++) {
    if (/\s/.test(ch[i])) {
      if (cur) words.push(cur), (cur = null);
      continue;
    }
    if (!cur) cur = { word: '', start: st[i] + offsetSeconds, end: en[i] + offsetSeconds, startChar: i };
    cur.word += ch[i];
    cur.end = en[i] + offsetSeconds;
  }
  if (cur) words.push(cur);
  return words;
}

/**
 * Text to speech. Returns { audio: Buffer, alignment?, normalizedAlignment?, words?, requestId, characterCost, ms }.
 * withTimestamps uses /with-timestamps (JSON + base64 audio + per-character times).
 */
export async function tts(text, o = {}) {
  const {
    voiceId,
    modelId = DEFAULTS.ttsModel,
    voiceSettings,
    withTimestamps = false,
    outputFormat = DEFAULTS.ttsFormat,
    previousText,
    nextText,
    previousRequestIds,
    nextRequestIds,
    languageCode,
    seed,
    applyTextNormalization,
    timeoutMs = 120_000,
  } = o;
  if (!voiceId) throw new Error('tts: voiceId is required');
  const body = clean({
    text,
    model_id: modelId,
    voice_settings: voiceSettings,
    previous_text: previousText,
    next_text: nextText,
    previous_request_ids: previousRequestIds,
    next_request_ids: nextRequestIds,
    language_code: languageCode,
    seed,
    apply_text_normalization: applyTextNormalization,
  });
  const path = `/v1/text-to-speech/${encodeURIComponent(voiceId)}${withTimestamps ? '/with-timestamps' : ''}`;
  const r = await request(`${BASE}${path}${q({ output_format: outputFormat })}`, {
    method: 'POST',
    headers: headers(),
    json: body,
    timeoutMs,
    retryOnTimeout: true, // short TTS calls are cheap; a duplicate charge is better than a stuck pipeline
    responseType: withTimestamps ? 'json' : 'buffer',
    label: `tts ${modelId}`,
  });
  if (!withTimestamps) return { audio: r.data, ...meta(r) };
  const d = r.data;
  return {
    audio: Buffer.from(d.audio_base64, 'base64'),
    alignment: d.alignment,
    normalizedAlignment: d.normalized_alignment,
    words: alignmentToWords(d.alignment),
    ...meta(r),
  };
}

/** Sound effect. duration 0.5-30 s (omit to let the model choose); promptInfluence 0-1 (default 0.3). */
export async function sfx(prompt, o = {}) {
  const { durationSeconds, promptInfluence, loop, modelId = DEFAULTS.sfxModel, outputFormat = DEFAULTS.sfxFormat } = o;
  const r = await request(`${BASE}/v1/sound-generation${q({ output_format: outputFormat })}`, {
    method: 'POST',
    headers: headers(),
    json: clean({ text: prompt, duration_seconds: durationSeconds, prompt_influence: promptInfluence, loop, model_id: modelId }),
    timeoutMs: 120_000,
    responseType: 'buffer',
    label: 'sfx',
  });
  return Object.assign(r.data, { meta: meta(r) });
}

/** Composition plan (JSON) for music_v1: { positive_global_styles, negative_global_styles, sections[] }. */
export async function musicPlan(prompt, lengthMs, { modelId = DEFAULTS.musicModel, sourceCompositionPlan } = {}) {
  const r = await request(`${BASE}/v1/music/plan`, {
    method: 'POST',
    headers: headers(),
    json: clean({ prompt, music_length_ms: lengthMs, model_id: modelId, source_composition_plan: sourceCompositionPlan }),
    timeoutMs: 120_000,
    retryOnTimeout: true,
    label: 'music/plan',
  });
  return r.data;
}

/**
 * Compose music. Pass either prompt (+lengthMs, forceInstrumental) or compositionPlan (section durations drive length).
 * Returns the audio Buffer (with .meta). Long tracks: raise timeoutMs (undici's own 300 s header timeout still applies).
 */
export async function music(o = {}) {
  const {
    prompt,
    compositionPlan,
    lengthMs,
    forceInstrumental,
    respectSectionsDurations,
    outputFormat = DEFAULTS.musicFormat,
    modelId = DEFAULTS.musicModel,
    seed,
    timeoutMs = 280_000,
  } = o;
  if (!prompt === !compositionPlan) throw new Error('music: pass exactly one of prompt or compositionPlan');
  const body = prompt
    ? clean({ prompt, music_length_ms: lengthMs, force_instrumental: forceInstrumental, model_id: modelId })
    : clean({ composition_plan: compositionPlan, respect_sections_durations: respectSectionsDurations, model_id: modelId, seed });
  const r = await request(`${BASE}/v1/music${q({ output_format: outputFormat })}`, {
    method: 'POST',
    headers: headers(),
    json: body,
    timeoutMs,
    retries: 3,
    responseType: 'buffer',
    label: `music ${modelId}`,
  });
  return Object.assign(r.data, { meta: meta(r) });
}

function audioForm(filePathOrBuffer, fields) {
  const fd = new FormData();
  const buf = Buffer.isBuffer(filePathOrBuffer) ? filePathOrBuffer : readFileSync(filePathOrBuffer);
  const name = Buffer.isBuffer(filePathOrBuffer) ? 'audio.mp3' : basename(filePathOrBuffer);
  fd.append('file', new Blob([buf]), name);
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, String(x)));
    else fd.append(k, String(v));
  }
  return fd;
}

/** Scribe speech-to-text with word timestamps. Returns { text, language_code, words:[{text,start,end,type,...}] }. */
export async function stt(filePath, o = {}) {
  const { modelId = DEFAULTS.sttModel, languageCode = 'en', timestampsGranularity = 'word', tagAudioEvents = false, diarize, numSpeakers, keyterms } = o;
  const r = await request(`${BASE}/v1/speech-to-text`, {
    method: 'POST',
    headers: headers(),
    body: audioForm(filePath, {
      model_id: modelId,
      language_code: languageCode,
      timestamps_granularity: timestampsGranularity,
      tag_audio_events: tagAudioEvents,
      diarize,
      num_speakers: numSpeakers,
      keyterms,
    }),
    timeoutMs: 180_000,
    retryOnTimeout: true,
    label: 'stt',
  });
  return r.data;
}

/** Forced alignment of known text to audio. Returns { characters:[{text,start,end}], words:[{text,start,end,loss}], loss }. */
export async function align(audioPath, text) {
  const r = await request(`${BASE}/v1/forced-alignment`, {
    method: 'POST',
    headers: headers(),
    body: audioForm(audioPath, { text }),
    timeoutMs: 180_000,
    retryOnTimeout: true,
    label: 'forced-alignment',
  });
  return r.data;
}
