// Phase 2 Track B helpers: why sentences, verified context (R-8, UX-9), drafts (UX-2), diffs (UX-4),
// stop watching (R-7), rename quick fix (R-4), dashboard sort and filter (UX-7), coding-agent copy (R-3).
import { describe, expect, it } from 'vitest';
import { AGENT_INSTRUCTION, COPY, MCP_ADD_COMMAND, MCP_URL, quickFixSource, stoppedWatching } from '../src/frontend/shared/copy';
import {
  dismissedSinceVerified,
  filterPagesByState,
  inlineCodeParts,
  isDraftPage,
  lastVerifiedLine,
  pageSortKeys,
  plainSentence,
  quickFixButton,
  quickFixDoneTitle,
  quickFixPlaces,
  stopWatchTargets,
  stripGitHeaders,
  trustLine,
  usableQuickFixes,
  verifiedContextLine,
} from '../src/frontend/shared/format';

const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);
const HOUR = 3600_000;

describe('inlineCodeParts', () => {
  it('splits backticked literals into code parts', () => {
    expect(inlineCodeParts('PR #482 renamed `scripts/rollback.sh`, which step 2 uses.')).toEqual([
      { kind: 'text', text: 'PR #482 renamed ' },
      { kind: 'code', text: 'scripts/rollback.sh' },
      { kind: 'text', text: ', which step 2 uses.' },
    ]);
  });
  it('keeps unpaired backticks as text and handles empty input', () => {
    expect(inlineCodeParts('a `b')).toEqual([{ kind: 'text', text: 'a `b' }]);
    expect(inlineCodeParts('')).toEqual([]);
    expect(inlineCodeParts(null)).toEqual([]);
    expect(plainSentence('Renamed `a` to `b`.')).toBe('Renamed a to b.');
  });
});

describe('verified context (R-8) and last verified (UX-9)', () => {
  it('says how many changes the watch saw', () => {
    expect(verifiedContextLine({ changesSince: 12, relevant: 0 })).toBe('12 changes to anchored code since, none flagged.');
    expect(verifiedContextLine({ changesSince: 1 })).toBe('1 change to anchored code since, none flagged.');
    expect(verifiedContextLine({ changesSince: 5, relevant: 2 })).toBe('5 changes to anchored code since, 2 flagged.');
    expect(verifiedContextLine({ changesSince: 0, relevant: 0 })).toBe('No changes to anchored code since.');
  });
  it('says nothing without a count', () => {
    expect(verifiedContextLine(null)).toBe('');
    expect(verifiedContextLine({})).toBe('');
    expect(verifiedContextLine({ changesSince: -1 })).toBe('');
  });
  it('detects a dismiss after the last verification', () => {
    const verifiedAt = NOW - 4 * HOUR;
    expect(dismissedSinceVerified([{ status: 'dismissed', dismissedAt: NOW - HOUR }], verifiedAt)).toBe(true);
    expect(dismissedSinceVerified([{ status: 'dismissed', dismissedAt: NOW - 5 * HOUR }], verifiedAt)).toBe(false);
    expect(dismissedSinceVerified([{ status: 'open', at: NOW }], verifiedAt)).toBe(false);
    expect(dismissedSinceVerified([], verifiedAt)).toBe(false);
  });
  it('names who verified last', () => {
    expect(lastVerifiedLine({ displayName: 'Dana' }, NOW - 4 * HOUR, NOW)).toBe('No open changes. Last verified by Dana, 4 hours ago.');
    expect(lastVerifiedLine(null, NOW - 30 * HOUR, NOW)).toBe('No open changes. Last verified, yesterday.');
    expect(lastVerifiedLine(null, null, NOW)).toBe('No open changes.');
  });
  it('keeps the trust line and the snooze', () => {
    expect(trustLine(null, NOW)).toBe('Agents are told not to trust this page until someone reviews it.');
    expect(trustLine(Date.UTC(2026, 10, 18), NOW)).toBe('Snoozed until Nov 18. Agents are told not to trust this page until someone reviews it.');
  });
});

describe('isDraftPage (UX-2)', () => {
  it('reads page.status and the fallbacks', () => {
    expect(isDraftPage({ page: { status: 'draft' } })).toBe(true);
    expect(isDraftPage({ page: { status: 'current' } })).toBe(false);
    expect(isDraftPage({ draft: true })).toBe(true);
    expect(isDraftPage({ error: 'draft' })).toBe(true);
    expect(isDraftPage({ restricted: true })).toBe(false);
    expect(isDraftPage(null)).toBe(false);
    expect(COPY.draftTitle).toBe('Publish this page first.');
    expect(COPY.draftBody).toContain('Doc Drift watches published pages.');
  });
});

describe('stripGitHeaders (UX-4)', () => {
  it('drops git plumbing and keeps hunks', () => {
    const diff = [
      'diff --git a/scripts/rollback.sh b/scripts/rollback-v2.sh',
      'similarity index 56%',
      'rename from scripts/rollback.sh',
      'rename to scripts/rollback-v2.sh',
      'index a41f113..9c2e0b1 100755',
      '--- a/scripts/rollback.sh',
      '+++ b/scripts/rollback-v2.sh',
      '@@ -1,3 +1,3 @@',
      '-TIMEOUT=$ROLLBACK_TIMEOUT',
      '+TIMEOUT=$ROLLBACK_TIMEOUT_SECS',
      '--- not a header, a removed line starting with dashes',
    ].join('\n');
    expect(stripGitHeaders(diff).split('\n')).toEqual([
      '+++ b/scripts/rollback-v2.sh',
      '@@ -1,3 +1,3 @@',
      '-TIMEOUT=$ROLLBACK_TIMEOUT',
      '+TIMEOUT=$ROLLBACK_TIMEOUT_SECS',
      '--- not a header, a removed line starting with dashes',
    ]);
  });
  it('handles new and deleted files and empty input', () => {
    expect(stripGitHeaders('new file mode 100644\n--- /dev/null\n+++ b/a.ts\n+x')).toBe('+++ b/a.ts\n+x');
    expect(stripGitHeaders('')).toBe('');
    expect(stripGitHeaders(null)).toBe('');
  });
});

describe('stopWatchTargets (R-7)', () => {
  it('lists each anchored path once and skips Jira events', () => {
    const events = [
      { id: 'e1', source: 'bitbucket', anchor: 'deploy/helm/values.yaml' },
      { id: 'e2', source: 'bitbucket', anchor: 'deploy/helm/values.yaml' },
      { id: 'e3', source: 'jira', anchor: 'PAY-142' },
      { id: 'e4', source: 'bitbucket', anchor: null },
      { id: 'e5', source: 'bitbucket', anchor: 'scripts/**', watchPath: 'scripts/rollback.sh' },
    ];
    expect(stopWatchTargets(events)).toEqual([
      { eventId: 'e1', path: 'deploy/helm/values.yaml' },
      { eventId: 'e5', path: 'scripts/rollback.sh' },
    ]);
    expect(stopWatchTargets(null)).toEqual([]);
  });
  it('reports what stopped', () => {
    expect(stoppedWatching(['a.ts', 'b.ts'])).toBe('Stopped watching a.ts, b.ts for this page.');
    expect(stoppedWatching([])).toBe('');
  });
});

describe('rename quick fix (R-4)', () => {
  const fix = { eventId: 'e1', from: 'scripts/rollback.sh', to: 'scripts/rollback-v2.sh', blocks: 2 };
  it('counts places from a number or a list', () => {
    expect(quickFixPlaces(fix)).toBe(2);
    expect(quickFixPlaces({ blocks: ['b1', 'b2', 'b3'] })).toBe(3);
    expect(quickFixPlaces({ blocks: null })).toBe(0);
    expect(quickFixPlaces({ blocks: -1 })).toBe(0);
  });
  it('labels the button and the result', () => {
    expect(quickFixButton(fix)).toBe('Replace in 2 places');
    expect(quickFixButton({ blocks: 1 })).toBe('Replace in 1 place');
    expect(quickFixButton({})).toBe('Replace');
    expect(quickFixDoneTitle(fix)).toBe('Replaced scripts/rollback.sh with scripts/rollback-v2.sh in 2 places.');
    expect(quickFixSource('PR #482')).toBe('Suggested from PR #482. No AI used.');
    expect(quickFixSource('')).toBe('No AI used.');
  });
  it('drops fixes that cannot apply', () => {
    expect(usableQuickFixes([fix, { eventId: 'e2', from: 'a', to: 'a' }, { eventId: '', from: 'a', to: 'b' }])).toEqual([fix]);
    expect(usableQuickFixes(undefined)).toEqual([]);
  });
});

describe('dashboard sort and filter (UX-7)', () => {
  const pages = [
    { pageId: '1', title: 'Rollback runbook', status: 'stale', maxSeverity: 'high', openEvents: 12, since: NOW - 3 * HOUR, ownerName: 'Dana' },
    { pageId: '2', title: 'Refunds API', status: 'possibly_stale', maxSeverity: 'medium', openEvents: 3, lastChangeAt: NOW - HOUR, ownerName: null },
  ];
  it('filters by state', () => {
    expect(filterPagesByState(pages, 'stale').map((p) => p.pageId)).toEqual(['1']);
    expect(filterPagesByState(pages, 'possibly_stale').map((p) => p.pageId)).toEqual(['2']);
    expect(filterPagesByState(pages, 'all')).toHaveLength(2);
    expect(filterPagesByState(pages, 'nonsense')).toHaveLength(2);
  });
  it('builds prefixed, unique sort keys', () => {
    const a = pageSortKeys(pages[0]!);
    const b = pageSortKeys(pages[1]!);
    expect(new Set(Object.values(a)).size).toBe(Object.keys(a).length);
    expect(a.severity).toBe('severity:2');
    expect(b.severity).toBe('severity:1');
    expect(a.open).toBe('open:12');
    expect(b.since).toBe(`since:${NOW - HOUR}`);
    expect(b.owner).toBe('owner:~');
    // The ADS table compares with a numeric collator, so 3 sorts before 12.
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'accent' });
    expect(collator.compare(b.open, a.open)).toBeLessThan(0);
  });
});

describe('coding-agent block (R-3)', () => {
  it('points at the core app MCP endpoint', () => {
    expect(MCP_URL).toBe('https://mcp.atlassian.com/forge/12e968a1-a45d-4524-ba28-d47e2315db1a');
    expect(MCP_ADD_COMMAND).toBe(`claude mcp add --transport http doc-drift ${MCP_URL}`);
  });
  it('is one calm paragraph that names the tool and the precedence rule', () => {
    expect(AGENT_INSTRUCTION).toContain('`check-page-freshness`');
    expect(AGENT_INSTRUCTION).toContain('trust the code');
    expect(AGENT_INSTRUCTION).not.toMatch(/\n|!/);
  });
});
