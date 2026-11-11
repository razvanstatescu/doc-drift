import { describe, expect, it } from 'vitest';
import { CHANGE_RECORD_LIMITS, parseChangeRecord } from '../src/index.js';

const bitbucket = {
  source: 'bitbucket',
  workspace: 'nano-soft-dev',
  repoSlug: 'payments-api',
  repoUuid: '{4b0c6f1e-0000-4000-8000-000000000482}',
  prId: 482,
  title: 'Rename rollback script and timeout variable',
  author: 'Sam Rivera',
  mergeCommit: '9f2c1ab',
  sourceBranch: 'scenario/rename-rollback-script',
  destinationBranch: 'main',
  files: [
    { status: 'renamed', path: 'scripts/rollback-v2.sh', oldPath: 'scripts/rollback.sh', linesAdded: 3, linesRemoved: 3 },
    { status: 'modified', path: 'deploy/helm/values.yaml', linesAdded: 1, linesRemoved: 1 },
  ],
  hunks: 'diff --git a/x b/x\n',
};

describe('parseChangeRecord', () => {
  it('accepts a valid Bitbucket record and drops unknown fields', () => {
    const result = parseChangeRecord({ ...bitbucket, extra: 'ignored' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(bitbucket);
      expect(result.value).not.toHaveProperty('extra');
    }
  });

  it('accepts a valid Jira record', () => {
    const jira = {
      source: 'jira',
      issueKey: 'PAY-142',
      statusCategory: 'done',
      changelog: [{ field: 'resolution', from: null, to: "Won't Do" }, { field: 'description' }],
    };
    expect(parseChangeRecord(jira)).toEqual({ ok: true, value: jira });
  });

  it('reports every problem with a path to the field', () => {
    const result = parseChangeRecord({
      ...bitbucket,
      prId: -1,
      workspace: '',
      files: [{ status: 'renamed', path: '../etc/passwd', linesAdded: 1.5, linesRemoved: 0 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'change.workspace must be a non-empty string',
          'change.prId must be a positive integer',
          'change.files[0].linesAdded must be a non-negative integer',
          'change.files[0].oldPath is required when status is renamed',
          'change.files[0].path must be a repo-relative path',
        ]),
      );
    }
  });

  it('enforces size limits', () => {
    const big = parseChangeRecord({ ...bitbucket, hunks: 'x'.repeat(CHANGE_RECORD_LIMITS.maxHunksBytes + 1) });
    expect(big.ok).toBe(false);
    const files = Array.from({ length: CHANGE_RECORD_LIMITS.maxFiles + 1 }, () => bitbucket.files[1]);
    expect(parseChangeRecord({ ...bitbucket, files }).ok).toBe(false);
  });

  it('rejects unknown sources, bad Jira keys and non-objects', () => {
    expect(parseChangeRecord(null)).toEqual({ ok: false, errors: ['change must be an object'] });
    expect(parseChangeRecord({ source: 'github' }).ok).toBe(false);
    expect(parseChangeRecord({ source: 'jira', issueKey: 'pay-1', changelog: [] }).ok).toBe(false);
    expect(parseChangeRecord({ source: 'jira', issueKey: 'PAY-1', changelog: [{ field: 'status', to: 3 }] }).ok).toBe(false);
  });
});
