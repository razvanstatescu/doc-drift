// BUG-13 follow-up (2026-11-20): a revert delivered before its change only counts within a window.
// Without it, an old `Revert "Bump deps"` closed a new PR with the same title the moment it flagged
// (and, in QA, a reused PR number did the same: the one-off "rename counted as quiet" flake).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: { q: string; params: unknown[] }[] = [];
vi.mock('@forge/sql', () => ({
  sql: {
    prepare: (q: string) => ({
      bindParams: (...params: unknown[]) => ({
        execute: async () => {
          calls.push({ q, params });
          return { rows: [{ id: 'r1', title: 'Revert "Bump deps"', pr_id: 7 }] };
        },
      }),
    }),
  },
  migrationRunner: { enqueue: vi.fn() },
}));

import { EARLY_REVERT_WINDOW_HOURS, revertCandidates } from '../src/lib/db';

beforeEach(() => {
  calls.length = 0;
});

describe('revertCandidates', () => {
  it('only looks at reverts received in the 24 hours before the change', async () => {
    const rows = await revertCandidates('Nano-Soft-Dev/Payments-API', 'change-1');
    expect(EARLY_REVERT_WINDOW_HOURS).toBe(24);
    expect(calls).toHaveLength(1);
    const { q, params } = calls[0]!;
    expect(q).toMatch(/received_at < \(SELECT received_at FROM change_record WHERE id = \?\)/);
    expect(q).toMatch(/received_at >= DATE_SUB\(\(SELECT received_at FROM change_record WHERE id = \?\), INTERVAL 24 HOUR\)/);
    expect(params).toEqual(['nano-soft-dev/payments-api', 'Revert "%', 'change-1', 'change-1']);
    expect(rows).toEqual([{ id: 'r1', title: 'Revert "Bump deps"', prId: 7 }]);
  });
});
