// M4 UI polish helpers: the review list with snoozed events, permission gates, D30 evidence,
// compact file rows, diff clipping, consent errors, anchor validation, draft page order and copy.
import { describe, expect, it } from 'vitest';
import {
  COPY,
  acceptAllHelp,
  anchorsSavedTitle,
  dashboardTitle,
  dismissConfirm,
  dismissHelp,
  dismissedTitle,
  noAnchoredPages,
  pagesTableLabel,
  showAll,
  snoozedBody,
  snoozedUntilText,
  tabLabel,
  unwatchedBody,
} from '../src/frontend/shared/copy';
import { pageOrder } from '../src/frontend/shared/fix';
import {
  anchorInputError,
  capabilities,
  clipLines,
  compactFile,
  evidenceLevel,
  gateNote,
  headerLine,
  isConsentError,
  isViewOnly,
  jiraChangeLines,
  joinOr,
  lineCounts,
  reviewEvents,
  snoozedUntilOf,
} from '../src/frontend/shared/format';

const NOW = Date.UTC(2026, 10, 11, 14, 0);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('reviewEvents', () => {
  it('keeps open and snoozed events, so a fully snoozed page still shows its review panel', () => {
    const evs = [{ status: 'open' }, { status: 'snoozed' }, {}, { status: 'dismissed' }, { status: 'resolved' }];
    expect(reviewEvents(evs)).toHaveLength(3);
    expect(reviewEvents([{ status: 'snoozed' }])).toHaveLength(1);
    expect(reviewEvents(undefined)).toEqual([]);
  });
});

describe('snoozedUntilOf', () => {
  it('prefers the page-level snooze when it is in the future', () => {
    expect(snoozedUntilOf(NOW + DAY, [], NOW)).toBe(NOW + DAY);
    expect(snoozedUntilOf(String(NOW + DAY), [], NOW)).toBe(NOW + DAY);
  });
  it('falls back to the latest snoozed event, and ignores past snoozes', () => {
    const evs = [
      { status: 'snoozed', snoozedUntil: NOW + 2 * DAY },
      { status: 'snoozed', snoozedUntil: NOW + 7 * DAY },
      { status: 'open', snoozedUntil: NOW + 9 * DAY },
    ];
    expect(snoozedUntilOf(null, evs, NOW)).toBe(NOW + 7 * DAY);
    expect(snoozedUntilOf(NOW - DAY, [{ status: 'snoozed', snoozedUntil: NOW - HOUR }], NOW)).toBeNull();
  });
});

describe('headerLine with snoozed events', () => {
  it('counts snoozed events and names the snooze end', () => {
    const line = headerLine('possibly_stale', {
      events: [{ id: '1', source: 'bitbucket', ref: 'ws/payments-api#482', at: NOW - 2 * HOUR, status: 'snoozed' }],
      snoozedUntil: NOW + 7 * DAY,
      now: NOW,
    });
    expect(line).toBe('PR #482 changed an anchor 2 hours ago. Snoozed until Nov 18. Agents are told not to trust this page until someone reviews it.');
  });
});

describe('capabilities and gate notes', () => {
  it('reads each flag and falls back to canEdit when one is missing', () => {
    const caps = capabilities({ canEdit: true, canDismiss: false });
    expect(caps).toEqual({ verify: true, dismiss: false, snooze: true, editAnchors: true, acceptFix: true, proposeFix: true });
    expect(capabilities({ canEdit: false }).verify).toBe(false);
    expect(capabilities(null).editAnchors).toBe(false);
  });
  it('uses canAcceptFix for Propose fix too', () => {
    expect(capabilities({ canEdit: true, canAcceptFix: false }).proposeFix).toBe(false);
  });
  it('is view only when every write is off', () => {
    expect(isViewOnly(capabilities({ canEdit: false }))).toBe(true);
    expect(isViewOnly(capabilities({ canEdit: false, canVerify: true }))).toBe(false);
  });
  it('gives one short reason for the controls that are off', () => {
    const caps = capabilities({ canEdit: true, canDismiss: false, canSnooze: false });
    expect(gateNote(caps, ['dismiss', 'snooze', 'verify'])).toBe('You need edit rights on this page to dismiss changes or snooze it.');
    expect(gateNote(caps, ['verify'])).toBe('');
    expect(gateNote(capabilities({}), ['editAnchors'])).toBe('You need edit rights on this page to change its anchors.');
  });
  it('keeps every reason under the 90 character tooltip limit', () => {
    const off = capabilities({ canEdit: false });
    for (const k of ['verify', 'dismiss', 'snooze', 'editAnchors', 'acceptFix', 'proposeFix'] as const) {
      expect(gateNote(off, [k]).length).toBeLessThan(90);
    }
  });
  it('joins with "or"', () => {
    expect(joinOr([])).toBe('');
    expect(joinOr(['A', 'B'])).toBe('A or B');
    expect(joinOr(['A', 'B', 'C'])).toBe('A, B or C');
  });
});

describe('evidence (D30)', () => {
  it('is a summary unless the resolver says full', () => {
    expect(evidenceLevel('full')).toBe('full');
    expect(evidenceLevel('summary')).toBe('summary');
    expect(evidenceLevel(undefined)).toBe('summary');
  });
  it('formats line counts from any of the known field names', () => {
    expect(lineCounts({ path: 'a', linesAdded: 12, linesRemoved: 3 })).toBe('+12 −3');
    expect(lineCounts({ path: 'a', additions: 4 })).toBe('+4');
    expect(lineCounts({ path: 'a', deletions: 2 })).toBe('−2');
    expect(lineCounts({ path: 'a' })).toBe('');
  });
  it('renders renames as old and new, other files as a path and status', () => {
    expect(compactFile({ path: 'b.sh', oldPath: 'a.sh', status: 'renamed' })).toEqual({ from: 'a.sh', path: 'b.sh', status: 'renamed', counts: '' });
    expect(compactFile({ path: 'a.sh', status: 'added', linesAdded: 5 })).toEqual({ path: 'a.sh', status: 'added', counts: '+5' });
    expect(compactFile({ path: 'a.sh', status: 'modified' }).status).toBe('changed');
    expect(compactFile({ path: 'a.sh', status: 'removed' }).status).toBe('removed');
  });
  it('clips long diffs and says how many lines were left out', () => {
    const text = Array.from({ length: 50 }, (_, i) => `+ line ${i}`).join('\n');
    const clip = clipLines(text, 40);
    expect(clip.text.split('\n')).toHaveLength(40);
    expect(clip.hidden).toBe(10);
    expect(clipLines('a\nb\n', 40)).toEqual({ text: 'a\nb', hidden: 0 });
    expect(clipLines(null, 40)).toEqual({ text: '', hidden: 0 });
  });
});

describe('jiraChangeLines', () => {
  it('writes one short line per field change', () => {
    expect(
      jiraChangeLines([
        { field: 'status', from: 'In progress', to: 'Done' },
        { field: 'assignee', from: null, to: 'Dana' },
        { field: 'labels', from: 'v1', to: null },
        { field: 'description', changed: true },
      ]),
    ).toEqual(['status: In progress \u2192 Done', 'assignee: set to Dana', 'labels: cleared (was v1)', 'description changed']);
    expect(jiraChangeLines(undefined)).toEqual([]);
    expect(jiraChangeLines(Array.from({ length: 9 }, () => ({ field: 'x', changed: true })))).toHaveLength(5);
  });
});

describe('isConsentError', () => {
  it('spots the consent code and the platform auth error', () => {
    expect(isConsentError({ ok: false, error: 'consent_required' })).toBe(true);
    expect(isConsentError(new Error('NEEDS_AUTHENTICATION_ERR'))).toBe(true);
    expect(isConsentError({ ok: false, error: 'not_visible', message: 'Page not found or not visible to you.' })).toBe(false);
    expect(isConsentError(null)).toBe(false);
  });
});

describe('anchorInputError', () => {
  it('validates Jira keys', () => {
    expect(anchorInputError({ anchorType: 'jira', pattern: '' })?.field).toBe('pattern');
    expect(anchorInputError({ anchorType: 'jira', pattern: 'pay 142' })?.message).toBe('Use an issue key like PAY-142.');
    expect(anchorInputError({ anchorType: 'jira', pattern: 'PAY-142' })).toBeNull();
  });
  it('needs a repository for paths and whole repositories', () => {
    expect(anchorInputError({ anchorType: 'repo', repo: '' })?.field).toBe('repo');
    expect(anchorInputError({ anchorType: 'repo', repo: 'payments-api' })).toBeNull();
    expect(anchorInputError({ anchorType: 'path', repo: 'pay ments', pattern: 'a' })?.field).toBe('repo');
  });
  it('checks paths and globs', () => {
    expect(anchorInputError({ anchorType: 'path', repo: 'r', pattern: '' })?.field).toBe('pattern');
    expect(anchorInputError({ anchorType: 'path', repo: 'r', pattern: 'a b.sh' })?.message).toBe('A path or glob has no spaces.');
    expect(anchorInputError({ anchorType: 'path', repo: 'r', pattern: 'deploy/{a,b' })?.message).toMatch(/Close every bracket/);
    expect(anchorInputError({ anchorType: 'path', repo: 'r', pattern: 'deploy/helm/**' })).toBeNull();
    expect(anchorInputError({ anchorType: 'path', repo: 'r', pattern: 'src/[ab]/*.ts' })).toBeNull();
  });
});

describe('pageOrder', () => {
  it('orders drafts by block across sections; drafts without a block go last, oldest first', () => {
    const list = [
      { id: 'x', blockId: 'b7', createdAt: 3 },
      { id: 'old2', createdAt: 9 },
      { id: 'y', blockId: 'b2', createdAt: 5 },
      { id: 'old1', createdAt: 1 },
    ];
    expect(pageOrder(list).map((p) => p.id)).toEqual(['y', 'x', 'old1', 'old2']);
    expect(pageOrder(null)).toEqual([]);
  });
});

describe('copy', () => {
  it('follows the voice rules: no exclamation marks, no "wrong", no DDS or DocDrift', () => {
    const all = [
      ...Object.values(COPY),
      tabLabel('Review', 2),
      unwatchedBody('PLAT'),
      snoozedUntilText(NOW + 7 * DAY, NOW),
      dismissConfirm(3),
      dismissHelp(3),
      dismissedTitle(2, 'Not relevant'),
      snoozedBody(2),
      acceptAllHelp(2),
      anchorsSavedTitle(3),
      showAll(9, 'change'),
      dashboardTitle('PLAT'),
      pagesTableLabel('PLAT'),
      noAnchoredPages('PLAT'),
    ];
    for (const s of all) {
      expect(s).not.toMatch(/!|\bwrong\b|\bDDS\b|DocDrift/);
    }
  });
  it('reads naturally in singular and plural', () => {
    expect(dismissConfirm(1)).toBe('Dismiss change');
    expect(dismissConfirm(3)).toBe('Dismiss 3 changes');
    expect(dismissedTitle(1, 'False positive')).toBe('Dismissed 1 change as false positive.');
    expect(snoozedUntilText(NOW + 7 * DAY, NOW)).toBe('Snoozed until Nov 18');
    expect(anchorsSavedTitle(0)).toBe('Anchors removed. This page is Unanchored.');
    expect(anchorsSavedTitle(1)).toBe('Saved 1 anchor. This page is Verified.');
    expect(acceptAllHelp(1)).toBe('Accepts the draft above.');
    expect(unwatchedBody(null)).toBe("Changes won't flag pages in this space until an admin turns on watching.");
    expect(dashboardTitle(null)).toBe('Drift dashboard');
  });
});
