import { describe, expect, it } from 'vitest';
import type { JiraChangeRecord } from '@dds/shared';
import { scoreChange } from '../src/index.js';
import { jiraSignals } from '../src/jira.js';
import { binding } from './helpers.js';

const jira = (changelog: JiraChangeRecord['changelog'], extra: Partial<JiraChangeRecord> = {}): JiraChangeRecord => ({
  source: 'jira',
  issueKey: 'PAY-142',
  changelog,
  ...extra,
});

describe('jiraSignals', () => {
  it.each([
    [jira([{ field: 'status', from: 'In Progress', to: 'Done' }], { statusCategory: 'done' }), 0.7, 'PAY-142 moved to Done'],
    [jira([{ field: 'status', from: 'To Do', to: 'Won’t do' }]), 0.7, "PAY-142 moved to Won't Do"],
    [jira([{ field: 'resolution', from: null, to: "Won't Do" }]), 0.7, "PAY-142 resolved as Won't Do"],
    [jira([{ field: 'Fix Version', from: '1.4.0', to: '1.5.0' }]), 0.6, 'PAY-142 fix versions changed (1.4.0 to 1.5.0)'],
    [jira([{ field: 'components', to: 'Payouts' }]), 0.6, 'PAY-142 components changed (now Payouts)'],
    [jira([{ field: 'Epic Link', from: 'PAY-100', to: 'PAY-200' }]), 0.6, 'PAY-142 moved to a different parent (PAY-100 to PAY-200)'],
    [jira([{ field: 'description', from: null, to: null }]), 0.5, 'PAY-142 description edited'],
    [jira([{ field: 'summary', from: 'a', to: 'b' }]), 0.3, 'PAY-142 summary edited'],
  ])('scores %#', (change, score, reason) => {
    expect(jiraSignals(change)[0]).toEqual({ score, reason });
  });

  it('ignores status moves that are not Done, other resolutions and unknown fields', () => {
    expect(jiraSignals(jira([{ field: 'status', to: 'In Review' }], { statusCategory: 'indeterminate' }))).toEqual([]);
    expect(jiraSignals(jira([{ field: 'resolution', to: 'Done' }, { field: 'labels', to: 'x' }]))).toEqual([]);
  });
});

describe('scoreChange for Jira', () => {
  const bindings = [
    binding('normal', 'jira', undefined, { jiraKey: 'PAY-142' }),
    binding('critical', 'jira', undefined, { jiraKey: 'PAY-142', weight: 'critical' }),
    binding('other', 'jira', undefined, { jiraKey: 'PAY-150' }),
  ];

  it('scores the strongest signal (no sum) and lists every reason', () => {
    const result = scoreChange(jira([{ field: 'summary' }, { field: 'description' }]), bindings, new Map());
    expect(result.kind === 'scored' && result.events.map((e) => [e.bindingId, e.score, e.severity, e.reasons])).toEqual([
      ['critical', 0.5, 'high', ['PAY-142 description edited', 'PAY-142 summary edited']],
      ['normal', 0.5, 'medium', ['PAY-142 description edited', 'PAY-142 summary edited']],
    ]);
  });

  it('needs another signal for a summary-only change', () => {
    const result = scoreChange(jira([{ field: 'summary' }]), bindings, new Map(), { threshold: 0.4 });
    expect(result).toEqual({ kind: 'scored', events: [], renameProposals: [] });
  });

  it('applies the dismiss dampener', () => {
    const damped = [binding('d', 'jira', undefined, { jiraKey: 'PAY-142', dismissCount: 2 })];
    const result = scoreChange(jira([{ field: 'resolution', to: "Won't Do" }]), damped, new Map());
    expect(result.kind === 'scored' && result.events[0]).toMatchObject({
      score: 0.56,
      dedupeKey: 'd|PAY-142|',
      reasons: ["PAY-142 resolved as Won't Do", 'Anchor weight lowered to 0.8 after 2 dismissals'],
    });
  });
});

describe('fix-version wording (UX observation 3)', () => {
  it('prefers the item with both values when Jira sends a move as two items', () => {
    const signals = jiraSignals(
      jira([
        { field: 'Fix Version', from: null, to: '2027.01' },
        { field: 'Fix Version', from: '2026.12', to: '2027.01' },
      ]),
    );
    expect(signals[0]!.reason).toBe('PAY-142 fix versions changed (2026.12 to 2027.01)');
  });
  it('still ranks by score first', () => {
    const signals = jiraSignals(jira([{ field: 'summary', from: 'a', to: 'b' }, { field: 'Fix Version', from: null, to: '2027.01' }]));
    expect(signals[0]!.reason).toBe('PAY-142 fix versions changed (now 2027.01)');
  });
});
