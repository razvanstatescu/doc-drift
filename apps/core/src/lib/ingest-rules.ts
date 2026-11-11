// Pure rules for the ingest path and matcher configuration. No Forge imports, unit-tested.
import { DEFAULT_IGNORE_GLOBS, SENSITIVITY_THRESHOLDS, type MatcherConfig, type Sensitivity } from '@dds/matcher';
import type { ChangeRecord } from '@dds/shared';

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

/** Admin settings stored in KVS under `settings`. */
export interface AppSettings {
  sensitivity: Sensitivity;
  ignoreGlobs: string[];
}

export const DEFAULT_SETTINGS: AppSettings = { sensitivity: 'balanced', ignoreGlobs: [...DEFAULT_IGNORE_GLOBS] };

export const MAX_IGNORE_GLOBS = 50;

/** Validates settings from the settings page. Returns cleaned settings or a user-facing error. */
export function parseSettings(input: unknown): { ok: true; value: AppSettings } | { ok: false; error: string } {
  const raw = (input ?? {}) as { sensitivity?: unknown; ignoreGlobs?: unknown };
  const sensitivity = raw.sensitivity;
  if (sensitivity !== 'strict' && sensitivity !== 'balanced' && sensitivity !== 'quiet') {
    return { ok: false, error: 'Pick Strict, Balanced or Quiet.' };
  }
  const list = Array.isArray(raw.ignoreGlobs)
    ? raw.ignoreGlobs
    : typeof raw.ignoreGlobs === 'string'
      ? raw.ignoreGlobs.split('\n')
      : [];
  const globs = [...new Set(list.map((g) => String(g).trim()).filter((g) => g.length > 0))];
  if (globs.length > MAX_IGNORE_GLOBS) return { ok: false, error: `Use at most ${MAX_IGNORE_GLOBS} ignore globs.` };
  const bad = globs.find((g) => g.length > 200 || /\s/.test(g));
  if (bad) return { ok: false, error: `This glob has spaces or is too long: ${bad.slice(0, 40)}` };
  return { ok: true, value: { sensitivity, ignoreGlobs: globs } };
}

/** Matcher config from the stored settings (missing fields fall back to the defaults). */
export function matcherConfigFor(settings: Partial<AppSettings> | undefined): Partial<MatcherConfig> {
  const s = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
  return { threshold: SENSITIVITY_THRESHOLDS[s.sensitivity], ignoreGlobs: s.ignoreGlobs };
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
