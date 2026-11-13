// OpenAI image helpers (Node 22, built-ins only). Verified live 2026-10-22, see notes/tools.md.
//   import { generate, edit } from './openai-image.mjs';
//   const [png] = await generate({ prompt, size: '1536x864', quality: 'high' });
// Both return Buffer[] with extra props: .usage, .meta ({ size, quality, background, output_format, ms }).
import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { loadEnv } from './env.mjs';
import { request } from './http.mjs';

const BASE = 'https://api.openai.com/v1';
export const DEFAULT_MODEL = 'gpt-image-2.6-flare'; // fast default; use gpt-image-2.5-sunburst for precise hero edits (notes/tools.md)

function auth() {
  if (!process.env.OPENAI_API_KEY) loadEnv();
  return { authorization: `Bearer ${process.env.OPENAI_API_KEY}` };
}
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function unpack(r) {
  const d = r.data;
  const out = (d.data || []).map((x) => Buffer.from(x.b64_json, 'base64'));
  out.usage = d.usage;
  out.meta = { size: d.size, quality: d.quality, background: d.background, output_format: d.output_format, ms: r.ms, requestId: r.headers['x-request-id'] };
  return out;
}

/**
 * @param {object} o
 * @param {string} o.prompt
 * @param {string} [o.model]          gpt-image-2.5-sunburst | gpt-image-2.5-flare | gpt-image-2 | gpt-image-1.5 ...
 * @param {string} [o.size]           '1024x1024' | '1536x1024' | '1024x1536' | 'auto' | any WxH (÷16, 1:3..3:1, ≤3840x2160) on 2.x
 * @param {string} [o.quality]        low | medium | high | xhigh | max (xhigh/max: 2.5 only) | auto
 * @param {string} [o.background]     transparent | opaque | auto  (transparent needs png or webp)
 * @param {string} [o.outputFormat]   png | jpeg | webp
 * @param {number} [o.outputCompression] 0-100, jpeg/webp only
 * @param {string} [o.moderation]     auto | low
 * @param {number} [o.n]              1-10
 */
export async function generate(o) {
  const { prompt, model = DEFAULT_MODEL, size, quality, background, outputFormat, outputCompression, moderation, n, timeoutMs = 300_000 } = o;
  const r = await request(`${BASE}/images/generations`, {
    method: 'POST',
    headers: auth(),
    json: clean({ model, prompt, size, quality, background, output_format: outputFormat, output_compression: outputCompression, moderation, n }),
    timeoutMs,
    retries: 4,
    label: `images/generations ${model}`,
  });
  return unpack(r);
}

/**
 * Edit / compose from up to 16 reference images (paths or Buffers). mask (PNG, alpha=0 where to edit) applies to the first image.
 * inputFidelity ('high'|'low') only for gpt-image-1 / 1.5; omit for 2.x.
 */
export async function edit(o) {
  const { images, prompt, mask, model = DEFAULT_MODEL, size, quality, background, outputFormat, outputCompression, inputFidelity, n, timeoutMs = 300_000 } = o;
  if (!images?.length) throw new Error('edit: images[] is required');
  const fd = new FormData();
  const field = images.length > 1 ? 'image[]' : 'image';
  images.forEach((img, i) => {
    const isBuf = Buffer.isBuffer(img);
    const name = isBuf ? `ref${i}.png` : basename(img);
    fd.append(field, new Blob([isBuf ? img : readFileSync(img)], { type: MIME[extname(name).toLowerCase()] || 'image/png' }), name);
  });
  if (mask) fd.append('mask', new Blob([Buffer.isBuffer(mask) ? mask : readFileSync(mask)], { type: 'image/png' }), 'mask.png');
  const fields = clean({ model, prompt, size, quality, background, output_format: outputFormat, output_compression: outputCompression, input_fidelity: inputFidelity, n });
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  const r = await request(`${BASE}/images/edits`, { method: 'POST', headers: auth(), body: fd, timeoutMs, retries: 4, label: `images/edits ${model}` });
  return unpack(r);
}
