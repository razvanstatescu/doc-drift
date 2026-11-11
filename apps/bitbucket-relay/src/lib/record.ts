// Pure helpers that turn a Bitbucket "pull request merged" event plus REST data into a ChangeRecord.
// Nothing in this file imports Forge, so it runs under Vitest unchanged.
import { CHANGE_RECORD_LIMITS, type BitbucketChangeRecord, type ChangedFile, type FileStatus } from '@dds/shared';

/** Files kept in one change record. Matches the shared validator's cap. */
export const MAX_FILES = CHANGE_RECORD_LIMITS.maxFiles;
/** Above this many changed files the relay skips the raw diff (diffstat only). */
export const DIFF_FILE_LIMIT = 300;
/** Upper bound for `hunks`, in UTF-8 bytes. Matches the shared validator. */
export const MAX_HUNKS_BYTES = CHANGE_RECORD_LIMITS.maxHunksBytes;

/** The fields of `avi:bitbucket:fulfilled:pullrequest` the relay uses. Everything else is ignored. */
export interface MergedPullRequest {
  workspaceUuid: string;
  repoUuid: string;
  /** Present in practice (S1), but optional in the event type reference. */
  repoSlug?: string;
  prId: number;
  title?: string;
  author?: string;
  /** Head of the source branch at merge time. */
  sourceHash: string;
  /** Pre-merge tip of the destination branch (S1: the event carries the pre-merge hash). */
  destinationHash: string;
  mergeCommit: string;
  sourceBranch: string;
  destinationBranch: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function obj(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

/**
 * Reads the fields we need from the raw trigger event. Never copies the whole event:
 * it carries a `contextToken` JWT that must not reach logs or the core app.
 */
export function parseMergedEvent(event: unknown): ParseResult<MergedPullRequest> {
  const e = obj(event);
  const pr = obj(e['pullrequest']);
  const source = obj(pr['source']);
  const destination = obj(pr['destination']);
  const workspaceUuid = str(obj(e['workspace'])['uuid']);
  const repoUuid = str(obj(e['repository'])['uuid']);
  const prId = pr['id'];
  const sourceHash = str(obj(source['commit'])['hash']);
  const destinationHash = str(obj(destination['commit'])['hash']);
  const mergeCommit = str(obj(pr['mergeCommit'])['hash']);
  const sourceBranch = str(source['branch']);
  const destinationBranch = str(destination['branch']);

  if (!workspaceUuid || !repoUuid) return { ok: false, reason: 'missing workspace or repository uuid' };
  if (typeof prId !== 'number' || !Number.isInteger(prId) || prId < 1) return { ok: false, reason: 'missing pull request id' };
  if (!sourceHash || !destinationHash) return { ok: false, reason: 'missing source or destination commit' };
  if (!mergeCommit) return { ok: false, reason: 'missing merge commit' };
  if (!sourceBranch || !destinationBranch) return { ok: false, reason: 'missing source or destination branch' };

  const repoSlug = str(obj(e['repository'])['slug']);
  const title = str(obj(pr['title'])['value']);
  const author = str(obj(pr['author'])['displayName']);
  return {
    ok: true,
    value: {
      workspaceUuid,
      repoUuid,
      ...(repoSlug && { repoSlug }),
      prId,
      ...(title && { title }),
      ...(author && { author }),
      sourceHash,
      destinationHash,
      mergeCommit,
      sourceBranch,
      destinationBranch,
    },
  };
}

/** `{abc-123}` to `abc-123`. Forge KVS keys do not accept braces. */
export function unwrapUuid(uuid: string): string {
  return uuid.replace(/^\{/, '').replace(/\}$/, '');
}

/**
 * KVS key that marks a merged PR as delivered. Retries and redeliveries of the same event
 * map to the same key, so the core never gets the same merge twice from this relay.
 */
export function dedupeKey(repoUuid: string, prId: number, mergeCommit: string): string {
  return `sent:${unwrapUuid(repoUuid).toLowerCase()}#${prId}#${mergeCommit.toLowerCase()}`;
}

/** KVS key for the cached repository facts (main branch, names). */
export function repoCacheKey(repoUuid: string): string {
  return `repo:${unwrapUuid(repoUuid).toLowerCase()}`;
}

/** Raw diffstat entry as returned by `GET /2.0/repositories/{ws}/{repo}/diffstat/{spec}`. */
export interface DiffstatEntry {
  status?: unknown;
  lines_added?: unknown;
  lines_removed?: unknown;
  old?: { path?: unknown } | null;
  new?: { path?: unknown } | null;
}

function lineCount(v: unknown): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;
}

/** Same rule as the shared validator: repo-relative, no `..` segment, no NUL, not too long. */
export function isSafePath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= CHANGE_RECORD_LIMITS.maxStringLength &&
    !path.includes('\0') &&
    !path.split('/').includes('..')
  );
}

/**
 * Maps one diffstat entry to a ChangedFile, or `null` when it has no usable path.
 * Bitbucket also reports conflict states (`merge conflict`, `remote deleted`, ...); those map to
 * `removed` when only the old path exists and `modified` otherwise.
 */
export function mapDiffstatEntry(entry: DiffstatEntry): ChangedFile | null {
  const oldPath = str(entry.old?.path);
  const newPath = str(entry.new?.path);
  const path = newPath ?? oldPath;
  if (!path || !isSafePath(path)) return null;

  let status: FileStatus;
  switch (entry.status) {
    case 'added':
    case 'modified':
      status = entry.status;
      break;
    case 'removed':
      status = 'removed';
      break;
    case 'renamed':
      status = oldPath && newPath && oldPath !== newPath ? 'renamed' : 'modified';
      break;
    default:
      status = newPath ? 'modified' : 'removed';
  }

  const file: ChangedFile = {
    status,
    path,
    linesAdded: lineCount(entry.lines_added),
    linesRemoved: lineCount(entry.lines_removed),
  };
  if (status === 'renamed' && oldPath) {
    if (!isSafePath(oldPath)) return { ...file, status: 'added' };
    file.oldPath = oldPath;
  }
  return file;
}

/** One page of a paginated diffstat response. */
export interface DiffstatPage {
  values?: unknown;
  next?: unknown;
  size?: unknown;
}

export interface DiffstatResult {
  files: ChangedFile[];
  /** Entries seen across all fetched pages (or the reported `size`, when larger). */
  totalEntries: number;
  /** Entries dropped because they had no usable path. */
  skipped: number;
  /** True when more entries existed than {@link MAX_FILES} or the page budget allowed. */
  truncated: boolean;
  pages: number;
}

/**
 * Walks a paginated diffstat. `fetchPage(null)` loads the first page, `fetchPage(next)` follows the
 * absolute `next` link. Stops at {@link MAX_FILES} files or `maxPages` pages.
 */
export async function collectDiffstat(
  fetchPage: (next: string | null) => Promise<DiffstatPage>,
  opts: { maxFiles?: number; maxPages?: number } = {},
): Promise<DiffstatResult> {
  const maxFiles = opts.maxFiles ?? MAX_FILES;
  const maxPages = opts.maxPages ?? 20;
  const files: ChangedFile[] = [];
  let totalEntries = 0;
  let reportedSize = 0;
  let skipped = 0;
  let truncated = false;
  let pages = 0;
  let next: string | null = null;

  do {
    const page: DiffstatPage = await fetchPage(next);
    pages += 1;
    if (typeof page.size === 'number' && page.size > reportedSize) reportedSize = page.size;
    const values: unknown[] = Array.isArray(page.values) ? page.values : [];
    for (const raw of values) {
      totalEntries += 1;
      if (files.length >= maxFiles) {
        truncated = true;
        continue;
      }
      const file = mapDiffstatEntry(obj(raw) as DiffstatEntry);
      if (file) files.push(file);
      else skipped += 1;
    }
    next = typeof page.next === 'string' && page.next.length > 0 ? page.next : null;
    if (next && (files.length >= maxFiles || pages >= maxPages)) {
      truncated = true;
      break;
    }
  } while (next);

  return { files, totalEntries: Math.max(totalEntries, reportedSize), skipped, truncated, pages };
}

/**
 * Trims text to at most `maxBytes` UTF-8 bytes without splitting a character. When it has to cut,
 * it cuts after the last full line that fits, so the core never sees half a diff line.
 */
export function trimUtf8(text: string, maxBytes: number = MAX_HUNKS_BYTES): { text: string; bytes: number; truncated: boolean } {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= maxBytes) return { text, bytes: buf.length, truncated: false };
  let cut = maxBytes;
  // Back off while the byte at `cut` is a UTF-8 continuation byte (10xxxxxx): `cut` must start a character.
  while (cut > 0 && ((buf[cut] ?? 0) & 0xc0) === 0x80) cut -= 1;
  const newline = buf.lastIndexOf(0x0a, cut - 1);
  if (newline > 0) cut = newline + 1;
  const trimmed = buf.subarray(0, cut).toString('utf8');
  return { text: trimmed, bytes: cut, truncated: true };
}

/** Repository facts from `GET /2.0/repositories/{ws}/{repo}?fields=mainbranch.name,full_name,slug`. */
export interface RepoInfo {
  mainBranch?: string;
  /** `workspace-slug/repo-slug`. */
  fullName?: string;
  slug?: string;
}

export function parseRepoInfo(json: unknown): RepoInfo {
  const j = obj(json);
  const mainBranch = str(obj(j['mainbranch'])['name']);
  const fullName = str(j['full_name']);
  const slug = str(j['slug']);
  return { ...(mainBranch && { mainBranch }), ...(fullName && { fullName }), ...(slug && { slug }) };
}

/** True when the merge should be relayed: its destination is the main branch, or the main branch is unknown. */
export function isMainBranchMerge(pr: MergedPullRequest, repo: RepoInfo): boolean {
  return repo.mainBranch === undefined || repo.mainBranch === pr.destinationBranch;
}

function clamp(s: string): string {
  return s.length > CHANGE_RECORD_LIMITS.maxStringLength ? s.slice(0, CHANGE_RECORD_LIMITS.maxStringLength) : s;
}

/**
 * Builds the record sent to the core. `workspace` is the workspace slug (bindings name repos as
 * `workspace/slug`); it falls back to the workspace UUID when the slug is unknown.
 */
export function buildChangeRecord(input: {
  pr: MergedPullRequest;
  repo: RepoInfo;
  files: ChangedFile[];
  hunks?: string;
}): BitbucketChangeRecord {
  const { pr, repo, files, hunks } = input;
  const [workspaceSlug, repoSlugFromName] = (repo.fullName ?? '').split('/');
  const repoSlug = pr.repoSlug ?? repo.slug ?? repoSlugFromName ?? unwrapUuid(pr.repoUuid);
  const record: BitbucketChangeRecord = {
    source: 'bitbucket',
    workspace: workspaceSlug || pr.workspaceUuid,
    repoSlug: repoSlug || unwrapUuid(pr.repoUuid),
    repoUuid: pr.repoUuid,
    prId: pr.prId,
    title: clamp(pr.title ?? `PR #${pr.prId}`),
    author: clamp(pr.author ?? 'Unknown author'),
    mergeCommit: pr.mergeCommit,
    sourceBranch: clamp(pr.sourceBranch),
    destinationBranch: clamp(pr.destinationBranch),
    files: files.slice(0, MAX_FILES),
  };
  if (repo.mainBranch) record.defaultBranch = repo.mainBranch;
  if (hunks !== undefined && hunks.length > 0) record.hunks = trimUtf8(hunks).text;
  return record;
}
