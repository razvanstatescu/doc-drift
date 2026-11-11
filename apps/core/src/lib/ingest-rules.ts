// Pure rules for the ingest path and matcher configuration. No Forge imports, unit-tested.
import { DEFAULT_IGNORE_GLOBS, SENSITIVITY_THRESHOLDS, validateGlob, type MatcherConfig, type Sensitivity } from '@dds/matcher';
import {
  isPingBody,
  parseChangeRecord,
  parsePingRecord,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  verifyBody,
  type ChangeRecord,
  type PingRecord,
} from '@dds/shared';

/**
 * Deduplication key for an incoming change record (platform checklist: dedupe on
 * `repoUuid#prId#mergeCommit` before any write, because Forge redelivers events).
 */
export function changeDedupeKey(record: ChangeRecord): string {
  if (record.source === 'bitbucket') return `${record.repoUuid}#${record.prId}#${record.mergeCommit}`;
  return `jira#${record.issueKey}#${record.changelogId ?? ''}`;
}

/** Web trigger headers arrive as `{ name: [value] }` with lowercased names; look up case-insensitively. */
export function headerValue(headers: Record<string, string[] | string | undefined> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const hit = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  const value = hit === undefined ? undefined : headers[hit];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Largest ingest body accepted, in bytes. The relay trims the diff to 150 KB and caps files at 500,
 * so a real record stays well under this; anything bigger is refused before the signature check.
 */
export const MAX_INGEST_BYTES = 512 * 1024;

export type IngestCheck =
  | { ok: true; kind: 'ping'; ping: PingRecord }
  | { ok: true; kind: 'record'; record: ChangeRecord }
  | { ok: false; outputKey: 'unauthorized' | 'bad-request'; reason: string };

/**
 * Checks one request to the `ingest-change` web trigger: size, HMAC signature and timestamp window
 * (`verifyBody`, ±300 s), then JSON and the record or ping schema. Pure, so it is unit-tested. Replays
 * inside the window pass here and are deduplicated by `changeDedupeKey` in `ingestRecord`.
 */
export function checkIngestRequest(
  secret: string | undefined,
  request: { body?: string; headers?: Record<string, string[] | string | undefined> },
  nowMs: number = Date.now(),
): IngestCheck {
  const body = request.body ?? '';
  if (!secret) return { ok: false, outputKey: 'unauthorized', reason: 'no relay secret configured (generate one in settings)' };
  const bytes = Buffer.byteLength(body);
  if (bytes > MAX_INGEST_BYTES) return { ok: false, outputKey: 'bad-request', reason: `body too large bytes=${bytes}` };
  const verdict = verifyBody(secret, body, headerValue(request.headers, SIGNATURE_HEADER), headerValue(request.headers, TIMESTAMP_HEADER), nowMs);
  if (!verdict.ok) return { ok: false, outputKey: 'unauthorized', reason: `${verdict.reason} bytes=${bytes}` };
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, outputKey: 'bad-request', reason: 'body is not JSON' };
  }
  if (isPingBody(json)) {
    const ping = parsePingRecord(json);
    return ping.ok ? { ok: true, kind: 'ping', ping: ping.value } : { ok: false, outputKey: 'bad-request', reason: `invalid ping ${JSON.stringify(ping.errors.slice(0, 5))}` };
  }
  const parsed = parseChangeRecord(json);
  return parsed.ok
    ? { ok: true, kind: 'record', record: parsed.value }
    : { ok: false, outputKey: 'bad-request', reason: `invalid change record ${JSON.stringify(parsed.errors.slice(0, 5))}` };
}

/** Admin settings stored in KVS under `settings` (F13). */
export interface AppSettings {
  sensitivity: Sensitivity;
  ignoreGlobs: string[];
  /** `all`: every space is watched. `selected`: only `spaceKeys`; changes create no events elsewhere. */
  spaceMode: SpaceMode;
  spaceKeys: string[];
  /** Days a page stays Possibly stale before it escalates to Stale (D27). */
  escalationDays: number;
  /** Footer-comment notifications to the page owner (F7). */
  notifyEnabled: boolean;
  /** Debounce before a notification is posted, so a burst of PRs becomes one comment. 0 for demos. */
  notifyDebounceMinutes: number;
  /** Ignore merges into a branch other than the repository's main branch (when the record names it). */
  ignoreNonDefaultBranches: boolean;
  /** Jira issue changes flag pages anchored to them (F4). Off: Jira events are ignored. */
  jiraEnabled: boolean;
}

export type SpaceMode = 'all' | 'selected';

export const DEFAULT_SETTINGS: AppSettings = {
  sensitivity: 'balanced',
  ignoreGlobs: [...DEFAULT_IGNORE_GLOBS],
  spaceMode: 'all',
  spaceKeys: [],
  escalationDays: 7,
  notifyEnabled: true,
  notifyDebounceMinutes: 10,
  ignoreNonDefaultBranches: true,
  jiraEnabled: true,
};

export const MAX_IGNORE_GLOBS = 50;
export const MAX_SPACE_KEYS = 200;
export const MAX_ESCALATION_DAYS = 30;
export const MAX_NOTIFY_DEBOUNCE_MINUTES = 60;
/** Forge queues accept `delayInSeconds` up to 900, so longer debounces re-queue (see `nextNotifyHop`). */
export const MAX_QUEUE_DELAY_SECONDS = 900;

const SPACE_KEY = /^~?[A-Za-z0-9_-]{1,255}$/;

/** The fields the settings form edits, for `fieldErrors`. */
export type SettingsField = keyof AppSettings;

export type ParsedSettings =
  | { ok: true; value: AppSettings }
  | { ok: false; error: string; fieldErrors: Partial<Record<SettingsField, string>> };

function intIn(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

function lines(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\n,]/) : [];
  return [...new Set(list.map((g) => String(g).trim()).filter((g) => g.length > 0))];
}

/** Legacy `notifyDelaySeconds` (M2) as whole minutes, rounded up so a short delay never becomes 0. */
export function legacyDelayToMinutes(seconds: unknown): number | undefined {
  const n = typeof seconds === 'string' && seconds.trim() !== '' ? Number(seconds) : seconds;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return undefined;
  return Math.min(MAX_NOTIFY_DEBOUNCE_MINUTES, Math.ceil(n / 60));
}

/**
 * Stored settings with defaults filled in, types repaired and old fields mapped: `notifyDelaySeconds`
 * becomes `notifyDebounceMinutes`, and an escalation over the current maximum is clamped. Never throws.
 */
export function normalizeSettings(stored: unknown): AppSettings {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const sensitivity = s.sensitivity === 'strict' || s.sensitivity === 'balanced' || s.sensitivity === 'quiet' ? s.sensitivity : d.sensitivity;
  const minutes =
    s.notifyDebounceMinutes !== undefined
      ? clampInt(s.notifyDebounceMinutes, 0, MAX_NOTIFY_DEBOUNCE_MINUTES, d.notifyDebounceMinutes)
      : (legacyDelayToMinutes(s.notifyDelaySeconds) ?? d.notifyDebounceMinutes);
  const spaceKeys = Array.isArray(s.spaceKeys) ? lines(s.spaceKeys).filter((k) => SPACE_KEY.test(k)).slice(0, MAX_SPACE_KEYS) : [];
  return {
    sensitivity,
    ignoreGlobs: Array.isArray(s.ignoreGlobs) ? lines(s.ignoreGlobs) : [...d.ignoreGlobs],
    spaceMode: s.spaceMode === 'selected' && spaceKeys.length > 0 ? 'selected' : 'all',
    spaceKeys,
    escalationDays: clampInt(s.escalationDays, 1, MAX_ESCALATION_DAYS, d.escalationDays),
    notifyEnabled: typeof s.notifyEnabled === 'boolean' ? s.notifyEnabled : d.notifyEnabled,
    notifyDebounceMinutes: minutes,
    ignoreNonDefaultBranches: typeof s.ignoreNonDefaultBranches === 'boolean' ? s.ignoreNonDefaultBranches : d.ignoreNonDefaultBranches,
    jiraEnabled: typeof s.jiraEnabled === 'boolean' ? s.jiraEnabled : d.jiraEnabled,
  };
}

/**
 * Validates settings from the settings page and returns every bad field at once (`fieldErrors`, with
 * `error` as a one-line summary). Fields the form leaves out keep `current` (or the defaults), so an
 * older form or a partial update still saves. Legacy `notifyDelaySeconds` maps to minutes.
 */
export function parseSettings(input: unknown, current: Partial<AppSettings> = {}): ParsedSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const base = normalizeSettings({ ...DEFAULT_SETTINGS, ...current });
  const errors: Partial<Record<SettingsField, string>> = {};
  const out: AppSettings = { ...base };

  if (raw.sensitivity !== undefined) {
    if (raw.sensitivity === 'strict' || raw.sensitivity === 'balanced' || raw.sensitivity === 'quiet') out.sensitivity = raw.sensitivity;
    else errors.sensitivity = 'Pick Strict, Balanced or Quiet.';
  }

  if (raw.ignoreGlobs !== undefined) {
    const globs = lines(typeof raw.ignoreGlobs === 'string' ? raw.ignoreGlobs.split('\n') : raw.ignoreGlobs);
    const bad = globs.flatMap((g) => {
      const why = validateGlob(g);
      return why ? [`${g.length > 40 ? `${g.slice(0, 40)}…` : g} ${why}`] : [];
    });
    if (globs.length > MAX_IGNORE_GLOBS) errors.ignoreGlobs = `Use at most ${MAX_IGNORE_GLOBS} ignore globs. You have ${globs.length}.`;
    else if (bad.length > 0) errors.ignoreGlobs = `Fix ${bad.length === 1 ? 'this glob' : `these ${bad.length} globs`}: ${bad.slice(0, 3).join('; ')}${bad.length > 3 ? '; …' : ''}.`;
    else out.ignoreGlobs = globs;
  }

  if (raw.spaceMode !== undefined) {
    if (raw.spaceMode === 'all' || raw.spaceMode === 'selected') out.spaceMode = raw.spaceMode;
    else errors.spaceMode = 'Pick All spaces or Selected spaces.';
  }
  if (raw.spaceKeys !== undefined) {
    const keys = lines(raw.spaceKeys);
    const badKey = keys.find((k) => !SPACE_KEY.test(k));
    if (badKey) errors.spaceKeys = `This is not a space key: ${badKey.slice(0, 40)}`;
    else if (keys.length > MAX_SPACE_KEYS) errors.spaceKeys = `Pick at most ${MAX_SPACE_KEYS} spaces.`;
    else out.spaceKeys = keys;
  }
  if (out.spaceMode === 'selected' && out.spaceKeys.length === 0 && !errors.spaceKeys && !errors.spaceMode) {
    errors.spaceKeys = 'Pick at least 1 space, or watch all spaces.';
  }

  if (raw.escalationDays !== undefined) {
    const n = intIn(raw.escalationDays, 1, MAX_ESCALATION_DAYS);
    if (n === undefined) errors.escalationDays = `Enter a whole number of days from 1 to ${MAX_ESCALATION_DAYS}.`;
    else out.escalationDays = n;
  }

  if (raw.notifyDebounceMinutes !== undefined) {
    const n = intIn(raw.notifyDebounceMinutes, 0, MAX_NOTIFY_DEBOUNCE_MINUTES);
    if (n === undefined) errors.notifyDebounceMinutes = `Enter a whole number of minutes from 0 to ${MAX_NOTIFY_DEBOUNCE_MINUTES}.`;
    else out.notifyDebounceMinutes = n;
  } else if (raw.notifyDelaySeconds !== undefined) {
    const n = intIn(raw.notifyDelaySeconds, 0, MAX_NOTIFY_DEBOUNCE_MINUTES * 60);
    if (n === undefined) errors.notifyDebounceMinutes = `Enter a whole number of minutes from 0 to ${MAX_NOTIFY_DEBOUNCE_MINUTES}.`;
    else out.notifyDebounceMinutes = legacyDelayToMinutes(n)!;
  }

  for (const field of ['notifyEnabled', 'ignoreNonDefaultBranches', 'jiraEnabled'] as const) {
    const v = raw[field];
    if (v === undefined) continue;
    if (typeof v === 'boolean') out[field] = v;
    else errors[field] = 'Turn this on or off.';
  }

  const bad = Object.keys(errors);
  if (bad.length > 0) {
    return { ok: false, error: bad.length === 1 ? Object.values(errors)[0]! : `${bad.length} settings need a fix.`, fieldErrors: errors };
  }
  return { ok: true, value: out };
}

/** True when changes to pages in this space create events (per-space opt-in). */
export function spaceWatched(settings: Pick<AppSettings, 'spaceMode' | 'spaceKeys'>, spaceKey: string | null | undefined): boolean {
  if (settings.spaceMode !== 'selected') return true;
  if (!spaceKey) return false;
  const want = spaceKey.toUpperCase();
  return settings.spaceKeys.some((k) => k.toUpperCase() === want);
}

/** Matcher config from the stored settings (missing fields fall back to the defaults). */
export function matcherConfigFor(settings: Partial<AppSettings> | undefined): Partial<MatcherConfig> {
  const s = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
  return { threshold: SENSITIVITY_THRESHOLDS[s.sensitivity], ignoreGlobs: s.ignoreGlobs, ignoreNonDefaultBranches: s.ignoreNonDefaultBranches };
}

/**
 * The first queue hop for a notification debounced by `delaySeconds`. Forge caps `delayInSeconds`
 * at 900, so a longer debounce carries `notBefore` (epoch ms) and the consumer re-queues itself.
 */
export function notifyFirstHop(delaySeconds: number, now: number): { delayInSeconds: number; notBefore?: number } {
  const delay = Math.max(0, Math.min(MAX_NOTIFY_DEBOUNCE_MINUTES * 60, Math.floor(delaySeconds)));
  if (delay <= MAX_QUEUE_DELAY_SECONDS) return { delayInSeconds: delay };
  return { delayInSeconds: MAX_QUEUE_DELAY_SECONDS, notBefore: now + delay * 1000 };
}

/** Seconds to wait again before sending (a re-queue hop), or null to send now. 5 s of slack. */
export function nextNotifyHop(notBefore: unknown, now: number): number | null {
  if (typeof notBefore !== 'number' || !Number.isFinite(notBefore)) return null;
  const remaining = Math.ceil((notBefore - now) / 1000);
  if (remaining <= 5) return null;
  return Math.min(MAX_QUEUE_DELAY_SECONDS, remaining);
}

/** Severity is stored as a small integer so the dashboard can sort on it: 0 none, 1 medium, 2 high. */
export function severityRank(severity: 'high' | 'medium' | undefined): number {
  return severity === 'high' ? 2 : severity === 'medium' ? 1 : 0;
}

/** `Date` -> `YYYY-MM-DD HH:MM:SS.mmm` in UTC, the format Forge SQL DATETIME(3) accepts and returns. */
export function toSqlDate(d: Date | number = Date.now()): string {
  return new Date(d).toISOString().replace('T', ' ').replace('Z', '');
}

/** Reads a Forge SQL DATETIME string (UTC, no zone) back as epoch ms. */
export function fromSqlDate(s: string | null | undefined): number | undefined {
  if (!s) return undefined;
  const t = Date.parse(`${String(s).replace(' ', 'T')}Z`);
  return Number.isFinite(t) ? t : undefined;
}
