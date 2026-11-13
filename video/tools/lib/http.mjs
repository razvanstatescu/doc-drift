// Dependency-free fetch wrapper (Node 22): per-attempt timeout, retries on 429 / 5xx / network errors
// with exponential backoff + jitter, honours Retry-After / retry-after-ms.
// It NEVER logs request headers or bodies. Errors carry a scrubbed, truncated response body only.
//
//   import { request } from './http.mjs';
//   const r = await request(url, { method: 'POST', headers, json: {...}, timeoutMs: 60_000 });
//   r.data  -> parsed JSON (JSON responses) or Buffer (everything else)
//   r.headers -> plain object of RESPONSE headers (request ids, character-cost, ...), r.ms, r.attempts

const SECRET_ENV = ['OPENAI_API_KEY', 'ELEVENLABS_API_KEY'];
const RETRY_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 529]);
// 429s that will never succeed on retry (quota / billing), so fail fast instead of burning time.
const FATAL_429 = /insufficient_quota|billing_hard_limit|quota_exceeded|exceeded your current quota/i;
// Errors thrown before the request reached the server: always safe to retry, even for POST.
const CONNECT_ERRORS = /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|ENETUNREACH|EHOSTUNREACH/;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Remove API keys and auth material from any string before it is logged or written. */
export function scrub(input) {
  let s = typeof input === 'string' ? input : String(input ?? '');
  for (const k of SECRET_ENV) {
    const v = process.env[k];
    if (v && v.length >= 8) s = s.split(v).join('[REDACTED]');
  }
  return s
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, 'sk-[REDACTED]')
    .replace(/\bsk_[A-Za-z0-9]{16,}/g, 'sk_[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [REDACTED]')
    .replace(/((?:authorization|xi-api-key|api[-_]?key)["']?\s*[:=]\s*["']?)[^\s"',}]+/gi, '$1[REDACTED]');
}

export class HttpError extends Error {
  constructor(message, info = {}) {
    super(scrub(message));
    this.name = 'HttpError';
    Object.assign(this, info); // status, code, url, method, body (scrubbed), requestId, attempts, retryable
  }
}

function safeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`; // never echo the query string
  } catch {
    return '[bad-url]';
  }
}

function retryAfterMs(headers) {
  const ms = headers.get('retry-after-ms');
  if (ms && !Number.isNaN(Number(ms))) return Number(ms);
  const ra = headers.get('retry-after');
  if (!ra) return null;
  if (!Number.isNaN(Number(ra))) return Number(ra) * 1000;
  const date = Date.parse(ra);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function backoff(attempt, base, max) {
  const exp = Math.min(max, base * 2 ** attempt);
  return exp / 2 + Math.random() * (exp / 2); // "equal jitter": never below half the exponential step
}

function errorCode(body) {
  if (!body || typeof body !== 'object') return undefined;
  const e = body.error ?? body.detail ?? body;
  if (typeof e === 'string') return undefined;
  return e?.code ?? e?.status ?? e?.type ?? undefined;
}

function parseBody(buf, contentType, responseType) {
  if (responseType === 'buffer') return buf;
  const text = () => buf.toString('utf8');
  if (responseType === 'text') return text();
  if (responseType === 'json' || /json/i.test(contentType || '')) {
    try {
      return JSON.parse(text());
    } catch {
      return responseType === 'json' ? text() : buf;
    }
  }
  return buf;
}

/**
 * @param {string} url
 * @param {object} o
 * @param {string} [o.method='GET']
 * @param {object} [o.headers]      request headers (never logged)
 * @param {*}      [o.body]         string | Buffer | Uint8Array | FormData | Blob
 * @param {object} [o.json]         serialised as the JSON body (sets content-type)
 * @param {number} [o.timeoutMs=120000] per attempt, covers headers AND body download
 * @param {number} [o.retries=5]    extra attempts after the first
 * @param {number} [o.baseDelayMs=1000]
 * @param {number} [o.maxDelayMs=60000]
 * @param {boolean} [o.retryOnTimeout] default: true for GET/HEAD/PUT/DELETE, false for POST/PATCH
 *        (a timed-out POST may still be billed; opt in explicitly for cheap calls)
 * @param {'auto'|'json'|'buffer'|'text'} [o.responseType='auto']
 * @param {string} [o.label]        short tag used in retry log lines
 * @param {(line:string)=>void|false} [o.log] retry logger (stderr by default; false = silent)
 */
export async function request(url, o = {}) {
  const method = (o.method || 'GET').toUpperCase();
  const idempotent = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(method);
  const {
    timeoutMs = 120_000,
    retries = 5,
    baseDelayMs = 1000,
    maxDelayMs = 60_000,
    retryOnTimeout = idempotent,
    responseType = 'auto',
    label = `${method} ${safeUrl(url)}`,
  } = o;
  const log = o.log === false ? () => {} : o.log || ((line) => process.stderr.write(`[http] ${line}\n`));
  const headers = { ...(o.headers || {}) };
  let body = o.body;
  if (o.json !== undefined) {
    body = JSON.stringify(o.json);
    headers['content-type'] = 'application/json';
  }

  const t0 = Date.now();
  for (let attempt = 0; ; attempt++) {
    let res;
    let buf;
    try {
      res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(timeoutMs) });
      buf = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      const detail = scrub(`${err?.name || 'Error'}: ${err?.message || err}${err?.cause ? ` (${err.cause.code || err.cause.message})` : ''}`);
      const connectPhase = CONNECT_ERRORS.test(`${err?.cause?.code || ''} ${err?.message || ''}`);
      const retryable = connectPhase || (isTimeout ? retryOnTimeout : idempotent || o.retryNetwork !== false);
      if (retryable && attempt < retries) {
        const wait = backoff(attempt, baseDelayMs, maxDelayMs);
        log(`${label} -> ${isTimeout ? `timeout after ${timeoutMs} ms` : detail}; retry ${attempt + 1}/${retries} in ${(wait / 1000).toFixed(1)}s`);
        await sleep(wait);
        continue;
      }
      throw new HttpError(`${label} failed: ${detail}`, { url: safeUrl(url), method, attempts: attempt + 1, retryable, timeout: isTimeout });
    }

    const contentType = res.headers.get('content-type') || '';
    if (res.ok) {
      return {
        status: res.status,
        ok: true,
        data: parseBody(buf, contentType, responseType),
        buffer: buf,
        contentType,
        headers: Object.fromEntries([...res.headers].filter(([k]) => k !== 'set-cookie')),
        attempts: attempt + 1,
        ms: Date.now() - t0,
      };
    }

    const parsed = parseBody(buf, contentType, 'json');
    const bodyText = scrub(typeof parsed === 'string' ? parsed : JSON.stringify(parsed)).slice(0, 2000);
    const code = errorCode(parsed);
    const fatal429 = res.status === 429 && FATAL_429.test(bodyText);
    const retryable = (o.retryOn ? o.retryOn(res.status, bodyText) : RETRY_STATUS.has(res.status)) && !fatal429;
    if (retryable && attempt < retries) {
      const ra = retryAfterMs(res.headers);
      const wait = ra != null ? Math.min(ra, 5 * maxDelayMs) + Math.random() * 500 : backoff(attempt, baseDelayMs, maxDelayMs);
      log(`${label} -> ${res.status}${code ? ` ${code}` : ''}; retry ${attempt + 1}/${retries} in ${(wait / 1000).toFixed(1)}s${ra != null ? ' (Retry-After)' : ''}`);
      await sleep(wait);
      continue;
    }
    throw new HttpError(`${label} -> HTTP ${res.status}${code ? ` ${code}` : ''}: ${bodyText.slice(0, 600)}`, {
      status: res.status,
      code,
      url: safeUrl(url),
      method,
      body: bodyText,
      requestId: res.headers.get('x-request-id') || res.headers.get('request-id') || undefined,
      attempts: attempt + 1,
      retryable,
    });
  }
}

/** Convenience: JSON in, JSON out. */
export async function requestJson(url, o = {}) {
  return (await request(url, { ...o, responseType: 'json' })).data;
}

/** Convenience: binary out (audio, images). */
export async function requestBuffer(url, o = {}) {
  return (await request(url, { ...o, responseType: 'buffer' })).data;
}

/** Build a multipart Blob from a file path or Buffer (Node 22 globals: Blob, FormData). */
export function fileBlob(data, type = 'application/octet-stream') {
  return new Blob([data], { type });
}
