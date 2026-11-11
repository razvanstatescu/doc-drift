// Pure helpers for the core ingest connection: URL and secret checks, the ping record,
// and the wording for each core response. No Forge imports.

/** Only v2 web trigger URLs are accepted. Egress in manifest.yml allows exactly this host pattern. */
const WEBTRIGGER_HOST = /^[a-z0-9-]+\.webtrigger\.atlassian\.app$/;

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };

/** Validates the core ingest URL pasted by the admin. Returns the normalized URL. */
export function validateIngestUrl(raw: unknown): Checked<string> {
  const fail = {
    ok: false as const,
    message: 'Paste the ingest URL from Doc Drift Sentinel settings. Its host ends in webtrigger.atlassian.app.',
  };
  if (typeof raw !== 'string' || raw.trim().length === 0) return fail;
  if (raw.trim().length > 500) return fail;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return fail;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return fail;
  if (!WEBTRIGGER_HOST.test(url.hostname)) return fail;
  if (url.pathname.length < 2) return fail;
  return { ok: true, value: url.toString() };
}

export const SECRET_MIN_LENGTH = 32;
export const SECRET_MAX_LENGTH = 256;

/** Validates the shared secret. It is never echoed back, so the message does not repeat it. */
export function validateSecret(raw: unknown): Checked<string> {
  if (typeof raw !== 'string') return { ok: false, message: 'Paste the shared secret.' };
  const secret = raw.trim();
  if (secret.length < SECRET_MIN_LENGTH || secret.length > SECRET_MAX_LENGTH || /\s/.test(secret)) {
    return {
      ok: false,
      message: `Paste the shared secret from Doc Drift Sentinel settings. It has at least ${SECRET_MIN_LENGTH} characters and no spaces.`,
    };
  }
  return { ok: true, value: secret };
}

/**
 * Body of the "Send test ping" request. Signed exactly like a change record, but `source: "ping"`
 * tells the core to verify the signature and answer without storing anything.
 */
export interface PingRecord {
  source: 'ping';
  workspaceUuid: string;
  sentAt: string;
}

export function buildPingRecord(workspaceUuid: string, now: Date = new Date()): PingRecord {
  return { source: 'ping', workspaceUuid, sentAt: now.toISOString() };
}

export type CoreOutcome =
  | { kind: 'accepted' }
  | { kind: 'retry'; message: string }
  | { kind: 'rejected'; message: string };

/** Classifies the core's HTTP answer. `retry` outcomes are worth another attempt; `rejected` are not. */
export function classifyCoreResponse(status: number): CoreOutcome {
  if (status >= 200 && status < 300) return { kind: 'accepted' };
  switch (status) {
    case 401:
    case 403:
      return {
        kind: 'rejected',
        message: 'Doc Drift Sentinel rejected the signature. Check that the shared secret matches its settings page.',
      };
    case 400:
      return {
        kind: 'rejected',
        message: 'Doc Drift Sentinel could not read the record. Update both apps to their latest versions.',
      };
    case 404:
      return {
        kind: 'rejected',
        message: 'No web trigger answers at this URL. Copy the ingest URL again from Doc Drift Sentinel settings.',
      };
    case 429:
      return { kind: 'retry', message: 'Doc Drift Sentinel is rate limiting requests. Try again in a minute.' };
    default:
      return status >= 500
        ? { kind: 'retry', message: `Doc Drift Sentinel answered ${status}. Try again in a minute.` }
        : { kind: 'rejected', message: `Doc Drift Sentinel answered ${status}.` };
  }
}

/** Removes the secret path token from an ingest URL so it can be logged or shown in status lines. */
export function redactUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid URL';
  }
}
