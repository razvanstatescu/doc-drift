// Free account probes. Prints model ids and plan facts only, never keys.
import { loadEnv } from './lib/env.mjs';
loadEnv();
const oa = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } });
const oj = await oa.json();
const ids = (oj.data || []).map((m) => m.id);
console.log('openai status', oa.status, 'image models:', ids.filter((i) => /image/.test(i)).sort().join(', '));
const h = { 'xi-api-key': process.env.ELEVENLABS_API_KEY };
const sub = await (await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: h })).json();
console.log('eleven tier', sub.tier, 'status', sub.status, 'chars used', sub.character_count, 'of', sub.character_limit, 'voice_limit', sub.voice_limit, 'can_use_instant_voice_cloning', sub.can_use_instant_voice_cloning);
const models = await (await fetch('https://api.elevenlabs.io/v1/models', { headers: h })).json();
console.log('eleven tts models:', (models || []).map((m) => m.model_id).join(', '));
