import { describe, expect, it } from 'vitest';
import { confusion, loadFixtures, runFixture } from './fixtures.js';

const fixtures = loadFixtures();

describe('eval: fixtures/scenarios', () => {
  it('has scenarios to run', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
  });

  it.each(fixtures.map((f) => [f.id, f] as const))('%s', (_, fixture) => {
    expect(runFixture(fixture).failures).toEqual([]);
  });

  it('meets the targets: recall >= 0.9, precision >= 0.8, no alerts on test-only or lockfile changes', () => {
    const runs = fixtures.map((f) => ({ fixture: f, run: runFixture(f) }));
    const outcomes = runs.flatMap((r) => r.run.outcomes);
    const c = confusion(outcomes);
    const passed = runs.filter((r) => r.run.failures.length === 0).length;
    const rows = runs.map(({ fixture, run }) => {
      const flagged = run.outcomes.filter((o) => o.actual).map((o) => `${o.pageId}=${o.score}`).join(' ') || '-';
      return `  ${run.failures.length === 0 ? 'pass' : 'FAIL'}  ${fixture.id.padEnd(28)} ${fixture.label.padEnd(9)} ${flagged}`;
    });
    console.log(
      [
        `Doc Drift matcher eval: ${passed} of ${fixtures.length} scenarios pass, ${outcomes.length} page decisions`,
        ...rows,
        '',
        '                 flagged   not flagged',
        `  should flag     ${String(c.tp).padStart(4)}   ${String(c.fn).padStart(6)}`,
        `  should not      ${String(c.fp).padStart(4)}   ${String(c.tn).padStart(6)}`,
        '',
        `  precision ${c.precision.toFixed(2)}   recall ${c.recall.toFixed(2)}`,
      ].join('\n'),
    );
    expect(c.recall).toBeGreaterThanOrEqual(0.9);
    expect(c.precision).toBeGreaterThanOrEqual(0.8);
    const mustBeQuiet = outcomes.filter((o) => /test-only|lockfile/.test(o.fixtureId));
    expect(mustBeQuiet.length).toBeGreaterThan(0);
    expect(mustBeQuiet.filter((o) => o.actual)).toEqual([]);
  });
});
