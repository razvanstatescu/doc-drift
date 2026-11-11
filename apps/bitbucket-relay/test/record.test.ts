import { describe, expect, it } from 'vitest';
import { parseChangeRecord, verifyBody, signBody } from '@dds/shared';
import {
  DIFF_FILE_LIMIT,
  MAX_HUNKS_BYTES,
  buildChangeRecord,
  collectDiffstat,
  dedupeKey,
  isMainBranchMerge,
  mapDiffstatEntry,
  parseMergedEvent,
  parseRepoInfo,
  repoCacheKey,
  trimUtf8,
  unwrapUuid,
  type DiffstatPage,
} from '../src/lib/record';

/** Shape of the real S1 event (PR #1, nano-soft-dev/payments-api), with a fake contextToken. */
const EVENT = {
  eventType: 'avi:bitbucket:fulfilled:pullrequest',
  timestamp: '2026-11-11T14:43:41.123456Z',
  selfGenerated: false,
  actor: { type: 'user', accountId: '712020:abc', uuid: '{a1}' },
  repository: { uuid: '{6F1D1C3E-0B8A-4E57-9F0A-2D5B1C7E4820}', slug: 'payments-api' },
  project: { uuid: '{p1}' },
  workspace: { uuid: '{w1-uuid}' },
  pullrequest: {
    id: 1,
    state: 'MERGED',
    title: { value: 'Rename rollback script', truncated: false },
    author: { type: 'user', accountId: '712020:abc', uuid: '{a1}', displayName: 'Sam Rivera' },
    source: { branch: 'scenario/rename-rollback-script', commit: { hash: '1a2b3c4d5e6f' } },
    destination: { branch: 'main', commit: { hash: 'e30840941563' } },
    mergeCommit: { hash: '8694b6072ff1' },
  },
  contextToken: 'eyJhbGciOi.secret.jwt',
};

const ENTRIES = [
  {
    type: 'diffstat',
    status: 'modified',
    lines_added: 1,
    lines_removed: 1,
    old: { path: 'deploy/helm/values.yaml' },
    new: { path: 'deploy/helm/values.yaml' },
  },
  {
    type: 'diffstat',
    status: 'renamed',
    lines_added: 3,
    lines_removed: 3,
    old: { path: 'scripts/rollback.sh' },
    new: { path: 'scripts/rollback-v2.sh' },
  },
];

describe('parseMergedEvent', () => {
  it('reads the fields the relay needs', () => {
    const parsed = parseMergedEvent(EVENT);
    expect(parsed).toEqual({
      ok: true,
      value: {
        workspaceUuid: '{w1-uuid}',
        repoUuid: '{6F1D1C3E-0B8A-4E57-9F0A-2D5B1C7E4820}',
        repoSlug: 'payments-api',
        prId: 1,
        title: 'Rename rollback script',
        author: 'Sam Rivera',
        sourceHash: '1a2b3c4d5e6f',
        destinationHash: 'e30840941563',
        mergeCommit: '8694b6072ff1',
        sourceBranch: 'scenario/rename-rollback-script',
        destinationBranch: 'main',
      },
    });
  });

  it('never carries the contextToken', () => {
    expect(JSON.stringify(parseMergedEvent(EVENT))).not.toContain('eyJ');
  });

  it('rejects events without a merge commit or ids', () => {
    expect(parseMergedEvent({ ...EVENT, pullrequest: { ...EVENT.pullrequest, mergeCommit: {} } }).ok).toBe(false);
    expect(parseMergedEvent({ ...EVENT, workspace: {} }).ok).toBe(false);
    expect(parseMergedEvent({ ...EVENT, pullrequest: { ...EVENT.pullrequest, id: '1' } }).ok).toBe(false);
    expect(parseMergedEvent(null).ok).toBe(false);
  });

  it('accepts a missing slug, title and author', () => {
    const { slug: _s, ...repository } = EVENT.repository;
    const { title: _t, author: _a, ...pullrequest } = EVENT.pullrequest;
    const parsed = parseMergedEvent({ ...EVENT, repository, pullrequest });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.repoSlug).toBeUndefined();
      expect(parsed.value.title).toBeUndefined();
    }
  });
});

describe('keys', () => {
  it('builds KVS-safe keys without braces', () => {
    expect(unwrapUuid('{abc-1}')).toBe('abc-1');
    expect(dedupeKey('{6F1D-AB}', 482, '8694B6072FF1')).toBe('sent:6f1d-ab#482#8694b6072ff1');
    expect(repoCacheKey('{6F1D-AB}')).toBe('repo:6f1d-ab');
  });
});

describe('mapDiffstatEntry', () => {
  it('maps modified and renamed entries', () => {
    expect(ENTRIES.map(mapDiffstatEntry)).toEqual([
      { status: 'modified', path: 'deploy/helm/values.yaml', linesAdded: 1, linesRemoved: 1 },
      { status: 'renamed', path: 'scripts/rollback-v2.sh', oldPath: 'scripts/rollback.sh', linesAdded: 3, linesRemoved: 3 },
    ]);
  });

  it('uses the old path for removed files and handles null sides', () => {
    expect(mapDiffstatEntry({ status: 'removed', lines_added: 0, lines_removed: 9, old: { path: 'a.txt' }, new: null })).toEqual({
      status: 'removed',
      path: 'a.txt',
      linesAdded: 0,
      linesRemoved: 9,
    });
    expect(mapDiffstatEntry({ status: 'added', lines_added: 4, old: null, new: { path: 'b.txt' } })).toEqual({
      status: 'added',
      path: 'b.txt',
      linesAdded: 4,
      linesRemoved: 0,
    });
  });

  it('maps conflict states and same-path renames', () => {
    expect(mapDiffstatEntry({ status: 'merge conflict', old: { path: 'c' }, new: { path: 'c' } })?.status).toBe('modified');
    expect(mapDiffstatEntry({ status: 'remote deleted', old: { path: 'c' }, new: null })?.status).toBe('removed');
    expect(mapDiffstatEntry({ status: 'renamed', old: { path: 'c' }, new: { path: 'c' } })).toMatchObject({ status: 'modified' });
  });

  it('drops entries without a usable path', () => {
    expect(mapDiffstatEntry({ status: 'modified', old: null, new: null })).toBeNull();
    expect(mapDiffstatEntry({ status: 'modified', new: { path: '../etc/passwd' } })).toBeNull();
    expect(mapDiffstatEntry({ status: 'modified', new: { path: 'x'.repeat(1001) } })).toBeNull();
  });

  it('treats bad line counts as 0', () => {
    expect(mapDiffstatEntry({ status: 'modified', lines_added: -1, lines_removed: 'x', new: { path: 'a' } })).toMatchObject({
      linesAdded: 0,
      linesRemoved: 0,
    });
  });
});

function pages(all: unknown[], pagelen: number): Map<string | null, DiffstatPage> {
  const map = new Map<string | null, DiffstatPage>();
  for (let i = 0, n = 0; i < Math.max(all.length, 1); i += pagelen, n += 1) {
    const hasNext = i + pagelen < all.length;
    map.set(n === 0 ? null : `https://api.bitbucket.org/2.0/x?page=${n + 1}`, {
      values: all.slice(i, i + pagelen),
      size: all.length,
      ...(hasNext && { next: `https://api.bitbucket.org/2.0/x?page=${n + 2}` }),
    });
  }
  return map;
}

function entry(i: number) {
  return { status: 'modified', lines_added: 1, lines_removed: 0, old: { path: `f${i}` }, new: { path: `f${i}` } };
}

describe('collectDiffstat', () => {
  it('follows next links across pages', async () => {
    const all = Array.from({ length: 7 }, (_, i) => entry(i));
    const map = pages(all, 3);
    const seen: (string | null)[] = [];
    const result = await collectDiffstat(async (next) => {
      seen.push(next);
      return map.get(next) ?? {};
    });
    expect(seen).toEqual([null, 'https://api.bitbucket.org/2.0/x?page=2', 'https://api.bitbucket.org/2.0/x?page=3']);
    expect(result.files.map((f) => f.path)).toEqual(['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6']);
    expect(result).toMatchObject({ totalEntries: 7, truncated: false, pages: 3, skipped: 0 });
  });

  it('caps the file list and reports truncation', async () => {
    const all = Array.from({ length: 12 }, (_, i) => entry(i));
    const map = pages(all, 5);
    const result = await collectDiffstat(async (next) => map.get(next) ?? {}, { maxFiles: 5 });
    expect(result.files).toHaveLength(5);
    expect(result.truncated).toBe(true);
    expect(result.pages).toBe(1);
    expect(result.totalEntries).toBe(12); // from `size`
  });

  it('stops at the page budget', async () => {
    const all = Array.from({ length: 10 }, (_, i) => entry(i));
    const map = pages(all, 2);
    const result = await collectDiffstat(async (next) => map.get(next) ?? {}, { maxPages: 2 });
    expect(result.files).toHaveLength(4);
    expect(result.truncated).toBe(true);
  });

  it('counts skipped entries and tolerates an empty page', async () => {
    const result = await collectDiffstat(async () => ({ values: [entry(1), { status: 'modified' }] }));
    expect(result).toMatchObject({ totalEntries: 2, skipped: 1, truncated: false });
    const empty = await collectDiffstat(async () => ({}));
    expect(empty).toMatchObject({ files: [], totalEntries: 0 });
  });

  it('keeps the default cap at the shared 500-file limit and the diff limit at 300', () => {
    expect(DIFF_FILE_LIMIT).toBe(300);
    expect(MAX_HUNKS_BYTES).toBe(200_000);
  });
});

describe('trimUtf8', () => {
  it('leaves short text alone', () => {
    expect(trimUtf8('abc\n', 10)).toEqual({ text: 'abc\n', bytes: 4, truncated: false });
  });

  it('never splits a multibyte character', () => {
    // "é" is 2 bytes, "€" is 3 bytes, "😀" is 4 bytes. No newline, so the cut is at a character boundary.
    const text = 'a€😀é'.repeat(50);
    for (let max = 1; max < 60; max += 1) {
      const out = trimUtf8(text, max);
      expect(out.bytes).toBeLessThanOrEqual(max);
      expect(Buffer.byteLength(out.text, 'utf8')).toBe(out.bytes);
      expect(out.text).not.toContain('�');
      expect(text.startsWith(out.text)).toBe(true);
    }
  });

  it('cuts after the last full line', () => {
    const out = trimUtf8('line one\nline two\nline three\n', 20);
    expect(out).toEqual({ text: 'line one\nline two\n', bytes: 18, truncated: true });
  });

  it('trims to the 200,000 byte default', () => {
    const line = '+ ünïcödé line €\n';
    const out = trimUtf8(line.repeat(20_000));
    expect(out.truncated).toBe(true);
    expect(out.bytes).toBeLessThanOrEqual(200_000);
    expect(out.text.endsWith('\n')).toBe(true);
  });
});

describe('repo info', () => {
  it('parses the partial response', () => {
    expect(parseRepoInfo({ full_name: 'nano-soft-dev/payments-api', slug: 'payments-api', mainbranch: { name: 'main' } })).toEqual({
      fullName: 'nano-soft-dev/payments-api',
      slug: 'payments-api',
      mainBranch: 'main',
    });
    expect(parseRepoInfo({})).toEqual({});
  });

  it('relays only main branch merges, or all when the main branch is unknown', () => {
    const parsed = parseMergedEvent(EVENT);
    if (!parsed.ok) throw new Error('fixture');
    expect(isMainBranchMerge(parsed.value, { mainBranch: 'main' })).toBe(true);
    expect(isMainBranchMerge(parsed.value, { mainBranch: 'develop' })).toBe(false);
    expect(isMainBranchMerge(parsed.value, {})).toBe(true);
  });
});

describe('buildChangeRecord', () => {
  const parsed = parseMergedEvent(EVENT);
  if (!parsed.ok) throw new Error('fixture');
  const pr = parsed.value;
  const repo = { fullName: 'nano-soft-dev/payments-api', slug: 'payments-api', mainBranch: 'main' };
  const files = ENTRIES.map(mapDiffstatEntry).filter((f) => f !== null);

  it('matches the @dds/shared ChangeRecord exactly', () => {
    const record = buildChangeRecord({ pr, repo, files, hunks: 'diff --git a/x b/x\n' });
    expect(record).toEqual({
      source: 'bitbucket',
      workspace: 'nano-soft-dev',
      repoSlug: 'payments-api',
      repoUuid: '{6F1D1C3E-0B8A-4E57-9F0A-2D5B1C7E4820}',
      prId: 1,
      title: 'Rename rollback script',
      author: 'Sam Rivera',
      mergeCommit: '8694b6072ff1',
      sourceBranch: 'scenario/rename-rollback-script',
      destinationBranch: 'main',
      defaultBranch: 'main',
      files,
      hunks: 'diff --git a/x b/x\n',
    });
    const check = parseChangeRecord(JSON.parse(JSON.stringify(record)));
    expect(check).toEqual({ ok: true, value: record });
  });

  it('falls back when names are unknown and omits empty hunks', () => {
    const { repoSlug: _r, title: _t, author: _a, ...bare } = pr;
    const record = buildChangeRecord({ pr: bare, repo: {}, files: [], hunks: '' });
    expect(record).toMatchObject({
      workspace: '{w1-uuid}',
      repoSlug: '6F1D1C3E-0B8A-4E57-9F0A-2D5B1C7E4820',
      title: 'PR #1',
      author: 'Unknown author',
    });
    expect(record).not.toHaveProperty('hunks');
    expect(record).not.toHaveProperty('defaultBranch');
    expect(parseChangeRecord(record).ok).toBe(true);
  });

  it('trims oversized hunks so the core validator accepts them', () => {
    const record = buildChangeRecord({ pr, repo, files, hunks: '+ €€€€€€€€€€\n'.repeat(20_000) });
    expect(Buffer.byteLength(record.hunks ?? '', 'utf8')).toBeLessThanOrEqual(200_000);
    expect(parseChangeRecord(record).ok).toBe(true);
  });

  it('is signed in the shared format', () => {
    const body = JSON.stringify(buildChangeRecord({ pr, repo, files }));
    const secret = 'x'.repeat(64);
    const { signature, timestamp } = signBody(secret, body);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyBody(secret, body, signature, timestamp)).toEqual({ ok: true });
  });
});
