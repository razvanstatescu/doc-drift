// QA edge cases for the relay's pure record building (docs/testing/test-plan.md, run 2026-11-11).
// `it.fails` marks a reproduced bug from docs/testing/test-report-2026-11-11.md.
import { describe, expect, it } from 'vitest';
import { parseChangeRecord } from '@dds/shared';
import { buildChangeRecord, collectDiffstat, mapDiffstatEntry, trimUtf8, type DiffstatPage } from '../src/lib/record';
import { validateIngestUrl, validateSecret } from '../src/lib/ingest';

const PR = {
  workspaceUuid: '{w}',
  repoUuid: '{r}',
  repoSlug: 'payments-api',
  prId: 9,
  title: 'T',
  author: 'A',
  sourceHash: 's',
  destinationHash: 'd',
  mergeCommit: 'abcdef123456',
  sourceBranch: 'feature/x',
  destinationBranch: 'main',
};

const entry = (i: number) => ({ status: 'modified', lines_added: 1, lines_removed: 1, old: { path: `gen/f${i}.ts` }, new: { path: `gen/f${i}.ts` } });

describe('QA relay: diffstat edge cases', () => {
  it('unicode, spaces and emoji paths pass through and validate', () => {
    const f = mapDiffstatEntry({ status: 'modified', lines_added: 2, lines_removed: 1, new: { path: 'docs/日本語 ファイル/🚀.md' }, old: { path: 'docs/日本語 ファイル/🚀.md' } });
    expect(f).toEqual({ status: 'modified', path: 'docs/日本語 ファイル/🚀.md', linesAdded: 2, linesRemoved: 1 });
  });
  it('conflict states and a "renamed" with equal paths', () => {
    expect(mapDiffstatEntry({ status: 'merge conflict', new: { path: 'a' }, old: { path: 'a' } })?.status).toBe('modified');
    expect(mapDiffstatEntry({ status: 'remote deleted', old: { path: 'a' }, new: null })?.status).toBe('removed');
    expect(mapDiffstatEntry({ status: 'renamed', old: { path: 'a' }, new: { path: 'a' } })?.status).toBe('modified');
  });
  it('binary file: no line counts become 0/0', () => {
    expect(mapDiffstatEntry({ status: 'modified', new: { path: 'logo.png' }, old: { path: 'logo.png' } })).toEqual({ status: 'modified', path: 'logo.png', linesAdded: 0, linesRemoved: 0 });
  });
  it('520 files: the first 500 are kept and `truncated` is set', async () => {
    const pages: DiffstatPage[] = [0, 1, 2].map((p) => ({
      values: Array.from({ length: p < 2 ? 200 : 120 }, (_, i) => entry(p * 200 + i)),
      ...(p < 2 && { next: `https://api.bitbucket.org/next/${p + 1}` }),
      size: 520,
    }));
    let n = 0;
    const r = await collectDiffstat(async () => pages[n++]!);
    expect(r.files).toHaveLength(500);
    expect(r.truncated).toBe(true);
    expect(r.totalEntries).toBe(520);
  });
  // BUG-08: the record does not say it was truncated, so the core cannot tell "file 501 changed but
  // was dropped" from "file 501 did not change"; an anchor on a dropped file silently gets no event.
  it.fails('BUG-08: a truncated diffstat is visible in the change record', () => {
    const files = Array.from({ length: 500 }, (_, i) => ({ status: 'modified' as const, path: `f${i}`, linesAdded: 1, linesRemoved: 1 }));
    const rec = buildChangeRecord({ pr: PR, repo: { mainBranch: 'main', fullName: 'nano-soft-dev/payments-api' }, files }) as unknown as Record<string, unknown>;
    expect(rec).toHaveProperty('filesTruncated');
  });
  it('trimUtf8 never splits an emoji and cuts after a full line', () => {
    const text = `${'a'.repeat(9)}\n🚀🚀🚀\n`;
    const r = trimUtf8(text, 15);
    expect(r.text).toBe(`${'a'.repeat(9)}\n`);
    expect(Buffer.byteLength(r.text)).toBeLessThanOrEqual(15);
  });
  it('a 1,000-character title is clamped and still validates', () => {
    const rec = buildChangeRecord({ pr: { ...PR, title: 'x'.repeat(5000) }, repo: { mainBranch: 'main', fullName: 'nano-soft-dev/payments-api' }, files: [] });
    expect(rec.title).toHaveLength(1000);
    expect(parseChangeRecord(rec).ok).toBe(true);
  });
});

describe('QA relay: settings inputs', () => {
  it('ingest URL must be a webtrigger.atlassian.app https URL', () => {
    expect(validateIngestUrl('http://example.com').ok).toBe(false);
    expect(validateIngestUrl('https://x.webtrigger.atlassian.app.evil.com/p').ok).toBe(false);
    expect(validateIngestUrl('https://user:pw@x.webtrigger.atlassian.app/p').ok).toBe(false);
    expect(validateIngestUrl(' https://27236af5.webtrigger.atlassian.app/public/abc ').ok).toBe(true);
  });
  it('secret length bounds', () => {
    expect(validateSecret('a'.repeat(31)).ok).toBe(false);
    expect(validateSecret('a'.repeat(32)).ok).toBe(true);
    expect(validateSecret('a'.repeat(257)).ok).toBe(false);
  });
});
