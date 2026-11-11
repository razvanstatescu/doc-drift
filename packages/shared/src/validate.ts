import {
  CHANGE_RECORD_LIMITS,
  FILE_STATUSES,
  STATUS_CATEGORIES,
  type BitbucketChangeRecord,
  type ChangeRecord,
  type ChangedFile,
  type JiraChangeRecord,
  type JiraFieldChange,
} from './change-record.js';

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

type Json = Record<string, unknown>;

const JIRA_KEY = /^[A-Z][A-Z0-9]+-\d+$/;

/** Collects errors while reading fields off an untrusted object. */
class Reader {
  readonly errors: string[] = [];

  constructor(
    private readonly obj: Json,
    private readonly at: string,
  ) {}

  string(key: string, opts: { optional: true }): string | undefined;
  string(key: string, opts?: { optional?: false }): string;
  string(key: string, opts: { optional?: boolean } = {}): string | undefined {
    const v = this.obj[key];
    if (v === undefined && opts.optional) return undefined;
    if (typeof v !== 'string' || v.length === 0) return this.fail(key, 'must be a non-empty string');
    if (v.length > CHANGE_RECORD_LIMITS.maxStringLength) return this.fail(key, 'is too long');
    return v;
  }

  nullableString(key: string): string | null | undefined {
    const v = this.obj[key];
    if (v === undefined || v === null) return v;
    if (typeof v !== 'string') return this.fail(key, 'must be a string or null');
    if (v.length > CHANGE_RECORD_LIMITS.maxStringLength) return this.fail(key, 'is too long');
    return v;
  }

  count(key: string, opts: { positive?: boolean } = {}): number {
    const v = this.obj[key];
    const min = opts.positive ? 1 : 0;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min) {
      return this.fail(key, opts.positive ? 'must be a positive integer' : 'must be a non-negative integer') ?? 0;
    }
    return v;
  }

  oneOf<T extends string>(key: string, allowed: readonly T[], opts: { optional?: boolean } = {}): T | undefined {
    const v = this.obj[key];
    if (v === undefined && opts.optional) return undefined;
    if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
      return this.fail(key, `must be one of ${allowed.join(', ')}`);
    }
    return v as T;
  }

  array(key: string, max: number): unknown[] {
    const v = this.obj[key];
    if (!Array.isArray(v)) return this.fail(key, 'must be an array') ?? [];
    if (v.length > max) return this.fail(key, `must have at most ${max} items`) ?? [];
    return v;
  }

  fail(key: string, message: string): undefined {
    this.errors.push(`${this.at}.${key} ${message}`);
    return undefined;
  }
}

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isSafePath(path: string): boolean {
  return !path.includes('\0') && !path.split('/').includes('..');
}

function readFile(raw: unknown, at: string, errors: string[]): ChangedFile | undefined {
  if (!isObject(raw)) {
    errors.push(`${at} must be an object`);
    return undefined;
  }
  const r = new Reader(raw, at);
  const status = r.oneOf('status', FILE_STATUSES);
  const path = r.string('path');
  const oldPath = r.string('oldPath', { optional: true });
  const linesAdded = r.count('linesAdded');
  const linesRemoved = r.count('linesRemoved');
  if (status === 'renamed' && oldPath === undefined) r.fail('oldPath', 'is required when status is renamed');
  for (const [key, p] of [['path', path], ['oldPath', oldPath]] as const) {
    if (p !== undefined && !isSafePath(p)) r.fail(key, 'must be a repo-relative path');
  }
  errors.push(...r.errors);
  if (r.errors.length > 0 || status === undefined || path === undefined) return undefined;
  return { status, path, ...(oldPath !== undefined && { oldPath }), linesAdded, linesRemoved };
}

function readBitbucket(raw: Json): ValidationResult<BitbucketChangeRecord> {
  const r = new Reader(raw, 'change');
  const fields = {
    workspace: r.string('workspace'),
    repoSlug: r.string('repoSlug'),
    repoUuid: r.string('repoUuid'),
    prId: r.count('prId', { positive: true }),
    title: r.string('title'),
    author: r.string('author'),
    mergeCommit: r.string('mergeCommit'),
    sourceBranch: r.string('sourceBranch'),
    destinationBranch: r.string('destinationBranch'),
  };
  const defaultBranch = r.string('defaultBranch', { optional: true });
  const files: ChangedFile[] = [];
  r.array('files', CHANGE_RECORD_LIMITS.maxFiles).forEach((f, i) => {
    const file = readFile(f, `change.files[${i}]`, r.errors);
    if (file) files.push(file);
  });
  const hunks = raw['hunks'];
  if (hunks !== undefined) {
    if (typeof hunks !== 'string') r.fail('hunks', 'must be a string');
    else if (Buffer.byteLength(hunks, 'utf8') > CHANGE_RECORD_LIMITS.maxHunksBytes) {
      r.fail('hunks', `must be at most ${CHANGE_RECORD_LIMITS.maxHunksBytes} bytes`);
    }
  }
  if (r.errors.length > 0) return { ok: false, errors: r.errors };
  return {
    ok: true,
    value: {
      source: 'bitbucket',
      ...(fields as Omit<BitbucketChangeRecord, 'source' | 'files' | 'hunks' | 'defaultBranch'>),
      ...(defaultBranch !== undefined && { defaultBranch }),
      files,
      ...(typeof hunks === 'string' && { hunks }),
    },
  };
}

function readJira(raw: Json): ValidationResult<JiraChangeRecord> {
  const r = new Reader(raw, 'change');
  const issueKey = r.string('issueKey');
  if (issueKey !== undefined && !JIRA_KEY.test(issueKey)) r.fail('issueKey', 'must look like PAY-142');
  const changelogId = r.string('changelogId', { optional: true });
  const author = r.string('author', { optional: true });
  const statusCategory = r.oneOf('statusCategory', STATUS_CATEGORIES, { optional: true });
  const changelog: JiraFieldChange[] = [];
  r.array('changelog', CHANGE_RECORD_LIMITS.maxChangelogItems).forEach((item, i) => {
    const at = `change.changelog[${i}]`;
    if (!isObject(item)) {
      r.errors.push(`${at} must be an object`);
      return;
    }
    const ir = new Reader(item, at);
    const field = ir.string('field');
    const from = ir.nullableString('from');
    const to = ir.nullableString('to');
    r.errors.push(...ir.errors);
    if (field !== undefined && ir.errors.length === 0) {
      changelog.push({ field, ...(from !== undefined && { from }), ...(to !== undefined && { to }) });
    }
  });
  if (r.errors.length > 0 || issueKey === undefined) return { ok: false, errors: r.errors };
  return {
    ok: true,
    value: {
      source: 'jira',
      issueKey,
      ...(changelogId !== undefined && { changelogId }),
      ...(author !== undefined && { author }),
      ...(statusCategory !== undefined && { statusCategory }),
      changelog,
    },
  };
}

/**
 * Validates an untrusted value (for example a parsed web trigger body) as a {@link ChangeRecord}.
 * Unknown fields are dropped; the returned value is a fresh object.
 */
export function parseChangeRecord(input: unknown): ValidationResult<ChangeRecord> {
  if (!isObject(input)) return { ok: false, errors: ['change must be an object'] };
  if (input['source'] === 'bitbucket') return readBitbucket(input);
  if (input['source'] === 'jira') return readJira(input);
  return { ok: false, errors: ['change.source must be one of bitbucket, jira'] };
}
