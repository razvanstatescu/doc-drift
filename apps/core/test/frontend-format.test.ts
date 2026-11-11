import { describe, expect, it } from 'vitest';
import {
  absoluteDate,
  anchoredPctText,
  anchoredText,
  driftedPages,
  emptyDashboardText,
  eventLead,
  fileChangeParts,
  hasDrift,
  headerLine,
  medianText,
  normalizeSeverity,
  openEvents,
  refLabel,
  relativeTime,
  sortOwners,
  sortEvents,
  sortPages,
  splitExcerpt,
  stateMeta,
  toMs,
  verifiedLine,
} from '../src/frontend/shared/format';

const NOW = Date.UTC(2026, 10, 11, 14, 0);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('stateMeta', () => {
  it('maps every state to a word, an icon and an ADS appearance', () => {
    expect(stateMeta('verified')).toMatchObject({ label: 'Verified', lozenge: 'success', glyph: 'check-circle' });
    expect(stateMeta('possibly_stale')).toMatchObject({ label: 'Possibly stale', lozenge: 'warning' });
    expect(stateMeta('stale')).toMatchObject({ label: 'Stale', lozenge: 'removed', glyph: 'clock' });
    expect(stateMeta('unanchored')).toMatchObject({ label: 'Unanchored', lozenge: 'default' });
  });
  it('falls back to Unanchored for unknown input', () => {
    expect(stateMeta(undefined).label).toBe('Unanchored');
    expect(stateMeta('weird').label).toBe('Unanchored');
  });
});

describe('toMs', () => {
  it('reads epoch ms, numeric strings, ISO and SQL DATETIME (UTC)', () => {
    expect(toMs(NOW)).toBe(NOW);
    expect(toMs(String(NOW))).toBe(NOW);
    expect(toMs('2026-11-11T14:00:00.000Z')).toBe(NOW);
    expect(toMs('2026-11-11 14:00:00.000')).toBe(NOW);
  });
  it('returns null for missing or unreadable values', () => {
    expect(toMs(null)).toBeNull();
    expect(toMs(undefined)).toBeNull();
    expect(toMs('')).toBeNull();
    expect(toMs('not a date')).toBeNull();
  });
});

describe('relativeTime', () => {
  it('uses digits and the copy-library wording', () => {
    expect(relativeTime(NOW - 10 * 1000, NOW)).toBe('Just now');
    expect(relativeTime(NOW - MIN, NOW)).toBe('1 minute ago');
    expect(relativeTime(NOW - 5 * MIN, NOW)).toBe('5 minutes ago');
    expect(relativeTime(NOW - 2 * HOUR, NOW)).toBe('2 hours ago');
    expect(relativeTime(NOW - 30 * HOUR, NOW)).toBe('Yesterday');
    expect(relativeTime(NOW - 3 * DAY, NOW)).toBe('3 days ago');
  });
  it('switches to an absolute date after 13 days, with the year only when it differs', () => {
    expect(relativeTime(NOW - 20 * DAY, NOW)).toBe('Oct 22');
    expect(absoluteDate(Date.UTC(2025, 11, 2), NOW)).toBe('Dec 2, 2025');
  });
  it('treats future times as just now and missing times as empty', () => {
    expect(relativeTime(NOW + HOUR, NOW)).toBe('Just now');
    expect(relativeTime(null, NOW)).toBe('');
  });
});

describe('refLabel and eventLead', () => {
  it('shortens Bitbucket refs and keeps Jira keys', () => {
    expect(refLabel('nano-soft-dev/payments-api#482', 'bitbucket')).toBe('PR #482');
    expect(refLabel('PR #482', 'bitbucket')).toBe('PR #482');
    expect(refLabel('PAY-142', 'jira')).toBe('PAY-142');
  });
  it('names who merged the PR', () => {
    expect(eventLead({ source: 'bitbucket', ref: 'PR #482', author: 'Sam' })).toBe('PR #482 merged by Sam');
    expect(eventLead({ source: 'bitbucket', ref: 'PR #482' })).toBe('PR #482');
    expect(eventLead({ source: 'jira', ref: 'PAY-142', author: 'Sam' })).toBe('PAY-142');
  });
});

describe('fileChangeParts', () => {
  it('describes renames with both paths', () => {
    expect(fileChangeParts({ path: 'scripts/rollback-v2.sh', status: 'renamed', oldPath: 'scripts/rollback.sh' })).toEqual({
      from: 'scripts/rollback.sh',
      verb: 'renamed to',
      path: 'scripts/rollback-v2.sh',
    });
  });
  it('describes added, removed and modified files', () => {
    expect(fileChangeParts({ path: 'a.sh', status: 'added' }).verb).toBe('added');
    expect(fileChangeParts({ path: 'a.sh', status: 'removed' }).verb).toBe('removed');
    expect(fileChangeParts({ path: 'a.sh', status: 'modified' }).verb).toBe('changed');
    expect(fileChangeParts({ path: 'a.sh' }).verb).toBe('changed');
  });
});

describe('splitExcerpt', () => {
  const excerpt = 'Run scripts/rollback.sh with ROLLBACK_TIMEOUT set, then rerun rollback.sh.';
  it('emphasises only the first match (one emphasis per row)', () => {
    const parts = splitExcerpt(excerpt, ['rollback.sh', 'ROLLBACK_TIMEOUT']);
    expect(parts.filter((p) => p.match)).toEqual([{ text: 'rollback.sh', match: true }]);
    expect(parts.map((p) => p.text).join('')).toBe(excerpt);
  });
  it('prefers the longest token at a position and keeps the original casing', () => {
    const parts = splitExcerpt('Use scripts/rollback.sh now', ['rollback', 'scripts/ROLLBACK.sh']);
    expect(parts).toEqual([
      { text: 'Use ', match: false },
      { text: 'scripts/rollback.sh', match: true },
      { text: ' now', match: false },
    ]);
  });
  it('escapes regex characters and handles no tokens', () => {
    expect(splitExcerpt('values (a+b)', ['(a+b)']).find((p) => p.match)?.text).toBe('(a+b)');
    expect(splitExcerpt('plain text', [])).toEqual([{ text: 'plain text', match: false }]);
    expect(splitExcerpt('', ['x'])).toEqual([]);
  });
});

describe('openEvents', () => {
  it('keeps open events and events without a status', () => {
    const evs = [{ status: 'open' }, { status: 'dismissed' }, {}, { status: 'resolved' }];
    expect(openEvents(evs)).toHaveLength(2);
    expect(openEvents(null)).toEqual([]);
  });
});

describe('header lines', () => {
  it('names the verifier and the anchor count', () => {
    expect(verifiedLine({ displayName: 'Dana' }, NOW - 3 * DAY, 3, NOW)).toBe('Verified by Dana, 3 days ago. Watching 3 anchors.');
    expect(verifiedLine(null, NOW - 30 * HOUR, 1, NOW)).toBe('Verified, yesterday. Watching 1 anchor.');
    expect(verifiedLine(null, null, 0, NOW)).toBe('Verified. Watching 0 anchors.');
  });
  it('says what changed for drifted pages without calling the page wrong', () => {
    const line = headerLine('possibly_stale', {
      events: [
        { id: '1', source: 'bitbucket', ref: 'nano-soft-dev/payments-api#482', at: NOW - 2 * HOUR },
        { id: '2', source: 'jira', ref: 'PAY-142', at: NOW - DAY },
      ],
      now: NOW,
    });
    expect(line).toBe('PR #482 changed an anchor 2 hours ago (+1 change). Agents are told not to trust this page until someone reviews it.');
    expect(line).not.toMatch(/wrong|!/);
  });
  it('covers Unanchored and drift without events', () => {
    expect(headerLine('unanchored', {})).toBe('Not linked to code or Jira. Add anchors.');
    expect(headerLine('stale', { events: [] })).toBe('An anchor changed after the last verification.');
  });
});

describe('dashboard KPI text', () => {
  it('formats anchored pages as "18 of 24" and a percentage', () => {
    expect(anchoredText({ anchored: 18, total: 24 })).toBe('18 of 24');
    expect(anchoredPctText({ anchored: 18, total: 24 })).toBe('75%');
    expect(anchoredPctText({ anchored: 0, total: 0, anchoredPct: 0 })).toBe('0%');
  });
  it('formats the median time to verify', () => {
    expect(medianText(1.6)).toBe('1.6 days');
    expect(medianText(1.04)).toBe('1 day');
    expect(medianText(2)).toBe('2 days');
    expect(medianText(0.01)).toBe('Under 3 hours');
    expect(medianText(null)).toBe('No data yet');
  });
  it('writes the empty week line from the copy library', () => {
    expect(emptyDashboardText('PLAT', { anchored: 18, total: 24 })).toBe('No drift in PLAT this week. 18 of 24 pages anchored.');
  });
  it('detects drift from counts or listed pages', () => {
    expect(hasDrift({ possiblyStale: 0, stale: 0 }, 0)).toBe(false);
    expect(hasDrift({ possiblyStale: 3, stale: 0 }, 0)).toBe(true);
    expect(hasDrift({ possiblyStale: 0, stale: 0 }, 1)).toBe(true);
  });
});

describe('normalizeSeverity', () => {
  it('accepts words and the SQL max_severity numbers', () => {
    expect(normalizeSeverity('high')).toBe('high');
    expect(normalizeSeverity(2)).toBe('high');
    expect(normalizeSeverity(1)).toBe('medium');
    expect(normalizeSeverity(0)).toBeNull();
    expect(normalizeSeverity(null)).toBeNull();
  });
});

describe('sortPages', () => {
  it('ranks by severity, then state, open changes, oldest drift and title', () => {
    const pages = [
      { pageId: 'a', title: 'A', status: 'possibly_stale', maxSeverity: 'medium', openEvents: 1, since: NOW - DAY },
      { pageId: 'b', title: 'B', status: 'possibly_stale', maxSeverity: 'high', openEvents: 1, since: NOW - DAY },
      { pageId: 'c', title: 'C', status: 'stale', maxSeverity: 'high', openEvents: 1, since: NOW - DAY },
      { pageId: 'd', title: 'D', status: 'stale', maxSeverity: 2, openEvents: 3, since: NOW - DAY },
      { pageId: 'e', title: 'E', status: 'stale', maxSeverity: 'high', openEvents: 3, since: NOW - 5 * DAY },
      { pageId: 'f', title: 'F', status: 'verified', maxSeverity: null, openEvents: 0 },
    ];
    expect(sortPages(pages).map((p) => p.pageId)).toEqual(['e', 'd', 'c', 'b', 'a', 'f']);
    expect(pages[0]!.pageId).toBe('a');
  });
});

describe('sortOwners', () => {
  it('puts the biggest backlog first and drops owners with nothing open', () => {
    const owners = [
      { ownerId: '1', ownerName: 'Sam', open: 2 },
      { ownerId: '2', ownerName: 'Dana', open: 5 },
      { ownerId: '3', ownerName: 'Ari', open: 2 },
      { ownerId: '4', ownerName: 'Lee', open: 0 },
    ];
    expect(sortOwners(owners).map((o) => o.ownerName)).toEqual(['Dana', 'Ari', 'Sam']);
  });
});

describe('sortEvents (polish item 1)', () => {
  it('puts High before Medium, then the newest first', () => {
    const events = [
      { id: 'm-old', severity: 'medium', at: NOW - 2 * DAY },
      { id: 'h-old', severity: 'high', at: NOW - 3 * DAY },
      { id: 'm-new', severity: 'medium', at: NOW - HOUR },
      { id: 'h-new', severity: 'high', at: NOW - 2 * HOUR },
      { id: 'none', at: NOW },
    ];
    expect(sortEvents(events).map((e) => e.id)).toEqual(['h-new', 'h-old', 'm-new', 'm-old', 'none']);
    expect(events[0]!.id).toBe('m-old');
    expect(sortEvents(null)).toEqual([]);
  });
});

describe('driftedPages (polish item 4)', () => {
  it('keeps Possibly stale and Stale pages only', () => {
    const pages = [
      { pageId: '1', status: 'verified' },
      { pageId: '2', status: 'possibly_stale' },
      { pageId: '3', status: 'stale' },
      { pageId: '4', status: 'unanchored' },
    ];
    expect(driftedPages(pages).map((p) => p.pageId)).toEqual(['2', '3']);
    expect(driftedPages(undefined)).toEqual([]);
  });
});
