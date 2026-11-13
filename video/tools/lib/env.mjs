// Loads OPENAI_API_KEY and ELEVENLABS_API_KEY into process.env without ever printing them.
// Search order: $VIDEO_ENV_FILE, then video/.env (git-ignored). Never log process.env or the file contents.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)); // .../doc-drift/video/tools/lib
const candidates = [process.env.VIDEO_ENV_FILE, resolve(here, '../../.env')].filter(Boolean);

export function loadEnv(required = ['OPENAI_API_KEY', 'ELEVENLABS_API_KEY']) {
  const file = candidates.find((p) => existsSync(p));
  if (!file) throw new Error(`No .env found (looked in: ${candidates.join(', ')})`);
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing keys in ${file}: ${missing.join(', ')}`);
  return file; // the path only, never the values
}
