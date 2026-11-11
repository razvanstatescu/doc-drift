import { describe, expect, it } from 'vitest';
import { bylineValue } from '../src/lib/copy';
import {
  affectedSections,
  deletedIssueEvents,
  deletedIssueRecord,
  EXCERPT_MAX,
  eventView,
  excerptAround,
  groupForNotification,
  isDeletedIssueRecord,
  isDismissReason,
  jiraChangeRecord,
  type JiraChangelogItem,
  medianDaysToVerify,
  notificationBody,
  notificationLine,
  NOTIFY_WINDOW_MS,
  parseSnoozeDays,
  planNotification,
  rankPages,
  relevantJiraItems,
  splitSections,
  tokensForEvents,
  TOP_OF_PAGE,
} from '../src/lib/review';

const NOW = Date.UTC(2026, 10, 11, 14, 0);
const DAY = 24 * 60 * 60 * 1000;

const RUNBOOK = `<p>How to roll back payments-api.</p>
<h2>Prerequisites</h2><p>Access to the cluster.</p>
<h2>Step 2: run the rollback</h2>
<p>Run <code>./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT</code> from the repo root.</p>
<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[export ROLLBACK_TIMEOUT=300
./scripts/rollback.sh]]></ac:plain-text-body></ac:structured-macro>
<h3>Helm values</h3><p>See deploy/helm/values.yaml for <code>ROLLBACK_TIMEOUT_SECS</code>.</p>`;

describe('affected sections', () => {
  it('splits storage at headings, keeping the text before the first heading', () => {
    expect(splitSections(RUNBOOK).map((s) => s.heading)).toEqual([TOP_OF_PAGE, 'Prerequisites', 'Step 2: run the rollback', 'Helm values']);
  });

  it('finds sections whose text or code mention a changed path or removed identifier', () => {
    const tokens = tokensForEvents([
      { files: [{ path: 'scripts/rollback-v2.sh', oldPath: 'scripts/rollback.sh' }], matchedTokens: ['ROLLBACK_TIMEOUT'] },
    ]);
    expect(tokens).toEqual(['scripts/rollback-v2.sh', 'rollback-v2.sh', 'scripts/rollback.sh', 'rollback.sh', 'ROLLBACK_TIMEOUT']);
    const sections = affectedSections(RUNBOOK, tokens);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.heading).toBe('Step 2: run the rollback');
    expect(sections[0]!.matchedTokens.sort()).toEqual(['ROLLBACK_TIMEOUT', 'rollback.sh', 'scripts/rollback.sh']);
    expect(sections[0]!.excerpt).toContain('./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT');
    expect(sections[0]!.codeLines).toEqual(['export ROLLBACK_TIMEOUT=300', './scripts/rollback.sh']);
  });

  it('omits codeLines when no code line matches', () => {
    const [s] = affectedSections('<h2>A</h2><p>Uses PAY-12.</p>', ['PAY-12']);
    expect(s).toEqual({ heading: 'A', excerpt: 'Uses PAY-12.', matchedTokens: ['PAY-12'] });
  });

  it('matches whole tokens only: ROLLBACK_TIMEOUT is not inside ROLLBACK_TIMEOUT_SECS', () => {
    const sections = affectedSections('<h2>Helm values</h2><p>Set <code>ROLLBACK_TIMEOUT_SECS</code>.</p>', ['ROLLBACK_TIMEOUT']);
    expect(sections).toEqual([]);
  });

  it('matches Jira keys and caps the excerpt at 300 characters', () => {
    const long = `<h2>Epic</h2><p>${'Background text. '.repeat(40)}Tracked in PAY-12. ${'More text after. '.repeat(40)}</p>`;
    const [s] = affectedSections(long, tokensForEvents([{ files: [], matchedTokens: [], issueKey: 'PAY-12' }]));
    expect(s!.matchedTokens).toEqual(['PAY-12']);
    expect(s!.excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX);
    expect(s!.excerpt).toContain('PAY-12');
    expect(s!.excerpt.startsWith('…')).toBe(true);
    expect(s!.excerpt.endsWith('…')).toBe(true);
    expect(excerptAround('short text', 0)).toBe('short text');
  });

  it('returns nothing without tokens or body', () => {
    expect(affectedSections(RUNBOOK, [])).toEqual([]);
    expect(affectedSections('', ['x'])).toEqual([]);
  });
});

describe('eventView', () => {
  const base = {
    id: 'e1',
    source: 'bitbucket' as const,
    ref: 'nano-soft-dev/payments-api#482',
    summary: 'scripts/rollback.sh renamed to scripts/rollback-v2.sh',
    matchedAnchor: 'payments-api: scripts/rollback.sh',
    files: ['scripts/rollback-v2.sh'],
    reasons: ['scripts/rollback.sh renamed to scripts/rollback-v2.sh'],
    score: 1,
    severity: 'high' as const,
    createdAt: NOW - DAY,
    changeTitle: 'Rename rollback script',
    changeAuthor: 'Sam Rivera',
    changeFiles: [{ status: 'renamed' as const, path: 'scripts/rollback-v2.sh', oldPath: 'scripts/rollback.sh', linesAdded: 3, linesRemoved: 3 }],
    repo: 'nano-soft-dev/payments-api',
    prId: 482,
  };

  it('shapes a Bitbucket event for the review panel', () => {
    expect(eventView(base, NOW)).toEqual({
      id: 'e1',
      source: 'bitbucket',
      ref: 'PR #482',
      title: 'Rename rollback script',
      author: 'Sam Rivera',
      at: NOW - DAY,
      summary: base.summary,
      // D30 summary: paths with status and line counts.
      files: [{ path: 'scripts/rollback-v2.sh', status: 'renamed', oldPath: 'scripts/rollback.sh', linesAdded: 3, linesRemoved: 3 }],
      severity: 'high',
      score: 1,
      anchor: 'payments-api: scripts/rollback.sh',
      reasons: base.reasons,
      status: 'open',
      snoozedUntil: null,
      url: 'https://bitbucket.org/nano-soft-dev/payments-api/pull-requests/482',
    });
  });

  it('marks snoozed events and leaves Jira events without files', () => {
    expect(eventView({ ...base, snoozedUntil: NOW + DAY }, NOW)).toMatchObject({ status: 'snoozed', snoozedUntil: NOW + DAY });
    expect(eventView({ ...base, snoozedUntil: NOW - 1 }, NOW)).toMatchObject({ status: 'open', snoozedUntil: null });
    const jira = eventView({ ...base, source: 'jira', ref: 'PAY-12', files: [], changeFiles: [], repo: null, prId: null }, NOW);
    expect(jira).toMatchObject({ ref: 'PAY-12', files: [], url: null });
  });
});

describe('input checks', () => {
  it('accepts the 3 dismiss reasons only', () => {
    expect(['not_relevant', 'already_updated', 'false_positive'].every(isDismissReason)).toBe(true);
    expect(isDismissReason('wrong')).toBe(false);
  });
  it('accepts 1 to 30 snooze days', () => {
    expect(parseSnoozeDays(7)).toBe(7);
    expect(parseSnoozeDays('3')).toBe(3);
    expect(parseSnoozeDays(0)).toBeUndefined();
    expect(parseSnoozeDays(31)).toBeUndefined();
    expect(parseSnoozeDays(1.5)).toBeUndefined();
  });
});

describe('notifier', () => {
  it('writes one line per change in the product voice', () => {
    const groups = groupForNotification([
      { source: 'bitbucket', ref: 'ws/repo#482', files: ['a.sh'], reasons: [], changeAuthor: 'Sam' },
      { source: 'bitbucket', ref: 'ws/repo#482', files: ['b.yaml', 'a.sh'], reasons: [], changeAuthor: 'Sam' },
      { source: 'jira', ref: 'PAY-12', files: [], reasons: ['PAY-12 moved to Done'], changeAuthor: null },
    ]);
    expect(groups.map(notificationLine)).toEqual([
      'PR #482 (merged by Sam) changed 2 files this page documents.',
      'PAY-12 moved to Done. This page is anchored to it.',
    ]);
    expect(notificationLine({ source: 'bitbucket', ref: 'ws/r#1', author: null, fileCount: 1, reason: null })).toBe(
      'PR #1 changed 1 file this page documents.',
    );
  });

  it('mentions the owner, ends with the review hint, and appends later lines', () => {
    const body = notificationBody('5b10ac8d82e05b22cc7d4ef5', ['PR #482 (merged by Sam) changed 2 files this page documents.', 'PR #483 <x> changed 1 file this page documents.']);
    expect(body).toBe(
      '<p><ac:link><ri:user ri:account-id="5b10ac8d82e05b22cc7d4ef5" /></ac:link> PR #482 (merged by Sam) changed 2 files this page documents. Review in the Doc Drift badge.</p>' +
        '<p>Since then: PR #483 &lt;x&gt; changed 1 file this page documents.</p>',
    );
    expect(notificationBody(null, ['x.'])).toBe('<p>x. Review in the Doc Drift badge.</p>');
  });

  it('posts at most 1 comment per page per 24 h', () => {
    expect(planNotification(undefined, 0, NOW)).toBe('none');
    expect(planNotification(undefined, 1, NOW)).toBe('create');
    expect(planNotification({ windowStart: NOW - 3600_000, commentId: 'c1' }, 1, NOW)).toBe('append');
    expect(planNotification({ windowStart: NOW - NOTIFY_WINDOW_MS, commentId: 'c1' }, 1, NOW)).toBe('create');
    expect(planNotification({ windowStart: NOW, commentId: null }, 1, NOW)).toBe('create');
  });
});

describe('Jira trigger', () => {
  const event: Parameters<typeof jiraChangeRecord>[0] & { changelog: { items: JiraChangelogItem[] } } = {
    issue: { key: 'PAY-12', fields: { summary: 'Rollback epic', status: { name: 'Done', statusCategory: { key: 'done' } } } },
    changelog: {
      id: '10442',
      items: [
        { field: 'status', fieldId: 'status', from: '10000', fromString: 'In Progress', to: '10001', toString: 'Done' },
        { field: 'Rank', fieldId: 'customfield_10019', from: null, to: null },
        { field: 'Fix Version', fieldId: 'fixVersions', from: null, fromString: null, to: '10020', toString: '2.4' },
        { field: 'IssueParentAssociation', fieldId: 'parent', from: null, toString: 'PAY-1' },
        { field: 'description', fieldId: 'description', from: null, fromString: null, to: null, toString: null },
      ],
    },
  };

  it('keeps only the fields the rules use', () => {
    expect(relevantJiraItems(event.changelog.items).map((i) => i.fieldId)).toEqual(['status', 'fixVersions', 'parent', 'description']);
    expect(relevantJiraItems(undefined)).toEqual([]);
  });

  it('builds a change record with the current status category and display values', () => {
    const built = jiraChangeRecord(event, { fixVersions: [{ name: '2.4' }, { name: '2.5' }], components: [] }, 'Dana');
    expect(built).toEqual({
      title: 'Rollback epic',
      record: {
        source: 'jira',
        issueKey: 'PAY-12',
        changelogId: '10442',
        author: 'Dana',
        statusCategory: 'done',
        changelog: [
          { field: 'status', from: 'In Progress', to: 'Done' },
          { field: 'fixVersions', from: null, to: '2.4' },
          { field: 'IssueParentAssociation', from: null, to: 'PAY-1' },
          { field: 'description', from: null, to: null },
        ],
      },
    });
  });

  it('fills fixVersions from the fetched issue when the changelog has no display value', () => {
    const built = jiraChangeRecord(
      { issue: { key: 'PAY-3' }, changelog: { id: 1, items: [{ fieldId: 'fixVersions', field: 'Fix Version', to: null, toString: null }] } },
      { fixVersions: [{ name: '2.5' }] },
    );
    expect(built?.record.changelog).toEqual([{ field: 'fixVersions', from: null, to: '2.5' }]);
    expect(built?.record.statusCategory).toBeUndefined();
  });

  it('ignores updates without relevant fields', () => {
    expect(jiraChangeRecord({ issue: { key: 'PAY-1' }, changelog: { items: [{ fieldId: 'labels' }] } }, undefined)).toBeUndefined();
  });

  it('turns a deleted issue into events on every anchored page', () => {
    const record = deletedIssueRecord('PAY-12', 123);
    expect(isDeletedIssueRecord(record)).toBe(true);
    const events = deletedIssueEvents('PAY-12', record.changelogId!, [
      { id: 'b1', pageId: 'p1', jiraKey: 'PAY-12', weight: 'critical' },
      { id: 'b2', pageId: 'p2', jiraKey: 'PAY-12', weight: 'normal' },
      { id: 'b3', pageId: 'p3', jiraKey: 'PAY-13', weight: 'normal' },
    ]);
    expect(events.map((e) => [e.pageId, e.severity, e.reasons[0]])).toEqual([
      ['p1', 'high', 'PAY-12 was deleted'],
      ['p2', 'medium', 'PAY-12 was deleted'],
    ]);
  });
});

describe('dashboard', () => {
  it('ranks by severity, then the oldest drift, then title', () => {
    const rows = [
      { title: 'B', maxSeverity: 0, since: null },
      { title: 'A', maxSeverity: 1, since: NOW - DAY },
      { title: 'C', maxSeverity: 2, since: NOW - DAY },
      { title: 'D', maxSeverity: 2, since: NOW - 5 * DAY },
      { title: 'A0', maxSeverity: 0, since: null },
    ];
    expect(rankPages(rows).map((r) => r.title)).toEqual(['D', 'C', 'A', 'A0', 'B']);
  });

  it('computes the median time to verify in days', () => {
    expect(medianDaysToVerify([])).toBeNull();
    expect(medianDaysToVerify([{ at: NOW, since: NOW - DAY }, { at: NOW, since: NOW - 3 * DAY }, { at: NOW, since: NOW - 2 * DAY }])).toBe(2);
    expect(medianDaysToVerify([{ at: NOW, since: NOW - DAY }, { at: NOW, since: NOW - 2.2 * DAY }])).toBe(1.6);
  });
});

describe('byline when snoozed', () => {
  it('says until when instead of "Review."', () => {
    const v = bylineValue({
      state: 'possibly_stale',
      openEventCount: 1,
      latest: { ref: 'ws/payments-api#482', source: 'bitbucket', files: ['scripts/rollback.sh'], at: NOW },
      snoozedUntil: NOW + 7 * DAY,
    });
    expect(v.tooltip).toBe('PR #482 changed scripts/rollback.sh on Nov 11. Snoozed until Nov 18.');
    expect(v.tooltip.length).toBeLessThan(90);
  });

  it('says what happened to a Jira anchor', () => {
    const v = bylineValue({
      state: 'possibly_stale',
      openEventCount: 1,
      latest: { ref: 'PAY-21', source: 'jira', files: [], at: NOW, summary: 'PAY-21 moved to Done' },
    });
    expect(v.tooltip).toBe('PAY-21 moved to Done on Nov 11. Review.');
  });
});
