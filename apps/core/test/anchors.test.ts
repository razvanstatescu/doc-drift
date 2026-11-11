import { describe, expect, it } from 'vitest';
import type { Binding } from '@dds/shared';
import { anchorKey, anchorLabel, normalizeAnchor, planBindingChanges, repoCandidates } from '../src/lib/anchors';

describe('normalizeAnchor', () => {
  it('accepts a path anchor and lowercases the repo', () => {
    expect(normalizeAnchor({ repo: 'Payments-API', pattern: './scripts/rollback.sh' })).toEqual({
      ok: true,
      value: { anchorType: 'path', repo: 'payments-api', pattern: 'scripts/rollback.sh', weight: 'normal' },
    });
  });

  it('turns glob characters into a glob anchor', () => {
    const r = normalizeAnchor({ anchorType: 'path', repo: 'nano-soft-dev/payments-api', pattern: '/deploy/helm/**', weight: 'critical' });
    expect(r).toEqual({ ok: true, value: { anchorType: 'glob', repo: 'nano-soft-dev/payments-api', pattern: 'deploy/helm/**', weight: 'critical' } });
  });

  it('reads a Bitbucket URL as workspace/repo', () => {
    const r = normalizeAnchor({ anchorType: 'repo', repo: 'https://bitbucket.org/nano-soft-dev/payments-api/src/main/' });
    expect(r).toEqual({ ok: true, value: { anchorType: 'repo', repo: 'nano-soft-dev/payments-api', weight: 'normal' } });
  });

  it('accepts and uppercases Jira keys', () => {
    expect(normalizeAnchor({ anchorType: 'jira', jiraKey: 'pay-142' })).toEqual({ ok: true, value: { anchorType: 'jira', jiraKey: 'PAY-142', weight: 'normal' } });
  });

  it('rejects bad input with a user-facing message', () => {
    expect(normalizeAnchor({ pattern: 'scripts/a.sh' })).toMatchObject({ ok: false });
    expect(normalizeAnchor({ repo: 'payments-api', pattern: '' })).toMatchObject({ ok: false });
    expect(normalizeAnchor({ repo: 'payments-api', pattern: '../etc/passwd' })).toMatchObject({ ok: false });
    expect(normalizeAnchor({ repo: 'payments-api', pattern: 'has space.sh' })).toMatchObject({ ok: false });
    expect(normalizeAnchor({ repo: 'a/b/c', pattern: 'x.sh' })).toMatchObject({ ok: false });
    expect(normalizeAnchor({ anchorType: 'jira', jiraKey: 'UTF8' })).toMatchObject({ ok: false });
    expect(normalizeAnchor({ repo: 'r', pattern: 'x.sh', weight: 'huge' })).toMatchObject({ ok: false });
  });
});

describe('labels and keys', () => {
  it('matches the matcher label format', () => {
    expect(anchorLabel({ anchorType: 'path', repo: 'nano-soft-dev/payments-api', pattern: 'scripts/rollback.sh' })).toBe('payments-api: scripts/rollback.sh');
    expect(anchorLabel({ anchorType: 'repo', repo: 'payments-api' })).toBe('payments-api (whole repo)');
    expect(anchorLabel({ anchorType: 'jira', jiraKey: 'PAY-1' })).toBe('PAY-1');
  });

  it('ignores weight in the identity key', () => {
    expect(anchorKey({ anchorType: 'path', repo: 'r', pattern: 'p' })).toBe(anchorKey({ anchorType: 'path', repo: 'r', pattern: 'p', jiraKey: null }));
  });
});

describe('repoCandidates', () => {
  it('lists every form a binding may use', () => {
    expect(repoCandidates({ workspace: 'Nano-Soft-Dev', repoSlug: 'payments-api', repoUuid: '{ABC-1}' })).toEqual([
      'nano-soft-dev/payments-api',
      'payments-api',
      '{abc-1}',
      'abc-1',
    ]);
  });
});

describe('planBindingChanges', () => {
  const existing: Binding[] = [
    { id: 'b1', pageId: 'p', anchorType: 'path', repo: 'payments-api', pattern: 'scripts/rollback.sh', weight: 'normal' },
    { id: 'b2', pageId: 'p', anchorType: 'glob', repo: 'payments-api', pattern: 'deploy/helm/**', weight: 'normal' },
  ];

  it('keeps, reweights, removes and inserts', () => {
    const plan = planBindingChanges(existing, [
      { anchorType: 'path', repo: 'payments-api', pattern: 'scripts/rollback.sh', weight: 'critical' },
      { anchorType: 'jira', jiraKey: 'PAY-142', weight: 'normal' },
    ]);
    expect(plan.reweight).toEqual([{ id: 'b1', weight: 'critical' }]);
    expect(plan.remove.map((b) => b.id)).toEqual(['b2']);
    expect(plan.insert).toEqual([{ anchorType: 'jira', jiraKey: 'PAY-142', weight: 'normal' }]);
  });

  it('is a no-op when nothing changed', () => {
    const plan = planBindingChanges(existing, existing.map(({ anchorType, repo, pattern, weight }) => ({ anchorType: anchorType as 'path', repo, pattern, weight })));
    expect(plan).toEqual({ insert: [], remove: [], reweight: [], resetDampener: [] });
  });
});
