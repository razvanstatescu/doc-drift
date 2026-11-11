// Sends a signed JSON body to the core app's ingest web trigger.
import { fetch } from '@forge/api';
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, signBody } from '@dds/shared';

export interface CoreResponse {
  status: number;
  elapsedMs: number;
  bodyBytes: number;
}

/**
 * Signs `payload` with HMAC-SHA256 over `${timestamp}.${body}` (@dds/shared) and POSTs it.
 * Throws only on network errors; HTTP errors come back as a status.
 */
export async function postSigned(ingestUrl: string, secret: string, payload: unknown): Promise<CoreResponse> {
  const body = JSON.stringify(payload);
  const { signature, timestamp } = signBody(secret, body);
  const started = Date.now();
  const res = await fetch(ingestUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [SIGNATURE_HEADER]: signature,
      [TIMESTAMP_HEADER]: timestamp,
    },
    body,
  });
  // Drain the body so the connection is released. The static web trigger body is a fixed status string.
  await res.text().catch(() => '');
  return { status: res.status, elapsedMs: Date.now() - started, bodyBytes: Buffer.byteLength(body, 'utf8') };
}
