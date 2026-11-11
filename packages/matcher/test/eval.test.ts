import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ANCHOR_WEIGHTS, COSMETIC_FACTOR, IDENTIFIER_BOOST, MATCH_STRENGTH, SENSITIVITY_THRESHOLDS, SNIPPET_BOOST } from '../src/index.js';
import { confusion, loadFixtures, runFixture, type Fixture, type FixtureRun, type PageOutcome } from './fixtures.js';

const REPORT = fileURLToPath(new URL('../../../fixtures/eval-report.json', import.meta.url));
const fixtures = loadFixtures();
/** Fixtures whose every page decision must be "no alert" (targets in detection.md). */
const MUST_BE_QUIET = /tests?-only|lockfile/;

function pct(n: number): string {
  return n.toFixed(2);
}

function row(fixture: Fixture, run: FixtureRun): string {
  const c = confusion(run.outcomes);
  const cell = (o: PageOutcome) => `${o.pageId}=${o.score ?? o.rawScore ?? 0}${o.expected === o.actual ? '' : o.actual ? ' (FP)' : ' (FN)'}`;
  const shown = run.outcomes.filter((o) => o.actual || o.expected).map(cell).join(' ') || '-';
  return `  ${run.failures.length === 0 ? 'pass' : 'FAIL'}  ${fixture.id.padEnd(38)} ${fixture.label.padEnd(9)} ${String(c.tp).padStart(2)} ${String(c.fp).padStart(2)} ${String(c.fn).padStart(2)}  ${shown}`;
}

describe('eval: fixtures/scenarios', () => {
  it('has scenarios to run', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(30);
  });

  it.each(fixtures.map((f) => [f.id, f] as const))('%s', (_, fixture) => {
    expect(runFixture(fixture).failures).toEqual([]);
  });

  it('meets the targets: recall >= 0.9, precision >= 0.8, no alerts on test-only or lockfile changes', () => {
    const runs = fixtures.map((f) => ({ fixture: f, run: runFixture(f) }));
    const outcomes = runs.flatMap((r) => r.run.outcomes);
    const c = confusion(outcomes);
    const passed = runs.filter((r) => r.run.failures.length === 0).length;
    const bySource = (['hand-written', 'demo', 'jira-beat', 'edge'] as const).map((source) => {
      const sub = runs.filter((r) => (r.fixture.source ?? 'hand-written') === source).flatMap((r) => r.run.outcomes);
      return { source, scenarios: runs.filter((r) => (r.fixture.source ?? 'hand-written') === source).length, ...confusion(sub) };
    });
    const quiet = outcomes.filter((o) => MUST_BE_QUIET.test(o.fixtureId));
    const severityChecked = outcomes.filter((o) => o.actual && o.expected && o.expectedSeverity);
    const severityRight = severityChecked.filter((o) => o.severity === o.expectedSeverity).length;

    console.log(
      [
        `Doc Drift matcher eval: ${passed} of ${fixtures.length} scenarios pass, ${outcomes.length} page decisions`,
        `  ${'result'.padEnd(4)} ${'scenario'.padEnd(38)} ${'label'.padEnd(9)} TP FP FN  pages (score; FP/FN marked)`,
        ...runs.map(({ fixture, run }) => row(fixture, run)),
        '',
        '                 flagged   not flagged',
        `  should flag     ${String(c.tp).padStart(4)}   ${String(c.fn).padStart(6)}`,
        `  should not      ${String(c.fp).padStart(4)}   ${String(c.tn).padStart(6)}`,
        '',
        `  precision ${pct(c.precision)}   recall ${pct(c.recall)}   severity ${severityRight}/${severityChecked.length}   quiet-set alerts ${quiet.filter((o) => o.actual).length}`,
        ...bySource.map((s) => `  ${s.source.padEnd(13)} ${String(s.scenarios).padStart(2)} scenarios  TP ${s.tp}  FP ${s.fp}  FN ${s.fn}  precision ${pct(s.precision)}  recall ${pct(s.recall)}`),
      ].join('\n'),
    );

    // Sensitivity sweep: normal anchor weight × threshold (critical stays 1). Shows how wide the good region is.
    const normals = [0.5, 0.6, 0.7, 0.8, 0.9, 1];
    const thresholds = [0.4, 0.45, 0.5, 0.55, 0.6, 0.65];
    const sweep = normals.flatMap((normal) =>
      thresholds.map((threshold) => {
        const sc = confusion(fixtures.flatMap((f) => runFixture(f, { threshold, anchorWeights: { critical: ANCHOR_WEIGHTS.critical, normal } }).outcomes));
        return { normal, threshold, tp: sc.tp, fp: sc.fp, fn: sc.fn, precision: Number(pct(sc.precision)), recall: Number(pct(sc.recall)) };
      }),
    );
    const ok = (x: (typeof sweep)[number]) => x.precision >= 0.8 && x.recall >= 0.9;
    console.log(
      [
        '',
        '  sweep: precision/recall by normal weight (rows) and threshold (columns); * meets both targets',
        `  normal  ${thresholds.map((t) => t.toFixed(2).padEnd(12)).join('')}`,
        ...normals.map(
          (n) => `  ${n.toFixed(1).padEnd(7)} ${sweep.filter((x) => x.normal === n).map((x) => `${pct(x.precision)}/${pct(x.recall)}${ok(x) ? '*' : ' '}`.padEnd(12)).join('')}`,
        ),
      ].join('\n'),
    );

    const report = {
      generatedBy: 'packages/matcher/test/eval.test.ts (pnpm eval)',
      config: {
        threshold: SENSITIVITY_THRESHOLDS.balanced,
        anchorWeights: ANCHOR_WEIGHTS,
        matchStrength: MATCH_STRENGTH,
        identifierBoost: IDENTIFIER_BOOST,
        snippetBoost: SNIPPET_BOOST,
        cosmeticFactor: COSMETIC_FACTOR,
      },
      totals: {
        scenarios: fixtures.length,
        scenariosPassing: passed,
        pageDecisions: outcomes.length,
        confusion: { tp: c.tp, fp: c.fp, fn: c.fn, tn: c.tn },
        precision: Number(pct(c.precision)),
        recall: Number(pct(c.recall)),
        severityAgreement: { right: severityRight, checked: severityChecked.length },
        quietSetAlerts: quiet.filter((o) => o.actual).length,
      },
      sweep,
      bySource: bySource.map(({ source, scenarios, tp, fp, fn, tn, precision, recall }) => ({
        source, scenarios, confusion: { tp, fp, fn, tn }, precision: Number(pct(precision)), recall: Number(pct(recall)),
      })),
      scenarios: runs.map(({ fixture, run }) => {
        const sc = confusion(run.outcomes);
        return {
          id: fixture.id,
          source: fixture.source ?? 'hand-written',
          label: fixture.label,
          title: fixture.title,
          pass: run.failures.length === 0,
          failures: run.failures,
          confusion: { tp: sc.tp, fp: sc.fp, fn: sc.fn, tn: sc.tn },
          pages: run.outcomes
            .filter((o) => o.expected || o.actual || o.rawScore !== undefined)
            .map(({ step, pageId, expected, actual, score, rawScore, severity, expectedSeverity, reasons }) => ({
              step, pageId, expected, actual, score, rawScore, severity, expectedSeverity, reasons,
            })),
        };
      }),
    };
    writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);

    expect(c.recall).toBeGreaterThanOrEqual(0.9);
    expect(c.precision).toBeGreaterThanOrEqual(0.8);
    expect(quiet.length).toBeGreaterThan(0);
    expect(quiet.filter((o) => o.actual)).toEqual([]);
  });
});
