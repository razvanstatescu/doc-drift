// Spike S1, core side: static v2 web trigger that verifies an HMAC over `${timestamp}.${body}`
// and stores the last received change record in KVS. Never logs the secret or the signature.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { kvs } from '@forge/kvs';

const MAX_SKEW_SECONDS = 300;

// Web trigger headers arrive as { name: [values] }; header-name case is not guaranteed.
function header(request, name) {
  const headers = request.headers || {};
  const hit = Object.keys(headers).find((k) => k.toLowerCase() === name);
  const value = hit ? headers[hit] : undefined;
  return Array.isArray(value) ? value[0] : value;
}

function verify(secret, timestamp, body, signature) {
  const expected = 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function ingest(request) {
  const body = request.body || '';
  const timestamp = header(request, 'x-dds-timestamp');
  const signature = header(request, 'x-dds-signature');
  console.log('ingest: request', {
    method: request.method,
    bodyBytes: Buffer.byteLength(body),
    headerNames: Object.keys(request.headers || {}),
    hasTimestamp: Boolean(timestamp),
    hasSignature: Boolean(signature),
  });

  const secret = process.env.DDS_HMAC_SECRET;
  if (!secret) {
    console.error('ingest: DDS_HMAC_SECRET is not set');
    return { outputKey: 'unauthorized' };
  }
  const skew = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!timestamp || !Number.isFinite(skew) || skew > MAX_SKEW_SECONDS) {
    console.warn('ingest: rejected, timestamp missing or outside window', { skew });
    return { outputKey: 'unauthorized' };
  }
  if (!verify(secret, timestamp, body, signature)) {
    console.warn('ingest: rejected, bad signature');
    return { outputKey: 'unauthorized' };
  }

  let record;
  try {
    record = JSON.parse(body);
  } catch {
    console.warn('ingest: rejected, body is not JSON');
    return { outputKey: 'bad-request' };
  }
  if (!record || record.v !== 1 || !Array.isArray(record.files)) {
    console.warn('ingest: rejected, not a v1 change record');
    return { outputKey: 'bad-request' };
  }

  console.log('ingest: HMAC verified', {
    fields: Object.keys(record),
    source: record.source,
    repo: record.repo,
    pr: record.pr && { id: record.pr.id, title: record.pr.title, dst: record.pr.destinationBranch },
    files: record.files.length,
    diffstatVia: record.diffstatVia,
  });

  await kvs.set('last-change-record', { receivedAt: new Date().toISOString(), record });
  const readBack = await kvs.get('last-change-record');
  console.log('ingest: stored in KVS', {
    key: 'last-change-record',
    readBackFiles: readBack?.record?.files?.length,
    receivedAt: readBack?.receivedAt,
  });
  return { outputKey: 'accepted' };
}
