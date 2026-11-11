import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseChangeRecord, type Binding, type Severity } from '@dds/shared';
import { indexPages, scoreChange, type MatcherConfig, type MatchResult, type PageSource } from '../src/index.js';

/** Where the eval scenarios live (repo root `fixtures/scenarios`). */
export const SCENARIO_DIR = fileURLToPath(new URL('../../../fixtures/scenarios/', import.meta.url));

export interface ExpectedFlag {
  pageId: string;
  minScore?: number;
  maxScore?: number;
  severity?: Severity;
}

export interface StepExpectation {
  outcome: MatchResult['kind'];
  /** Pages that must flag. Every other page in the fixture must not. */
  flagged: ExpectedFlag[];
  skipReason?: string;
  revertedTitle?: string;
  renameProposals?: { bindingId: string; from: string; to: string }[];
}

export interface Fixture {
  id: string;
  label: 'drift' | 'no_drift';
  title: string;
  notes: string;
  config?: Partial<MatcherConfig>;
  pages: PageSource[];
  bindings: Binding[];
  steps: { change: unknown; expect: StepExpectation }[];
}

export function loadFixtures(): Fixture[] {
  return readdirSync(SCENARIO_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(`${SCENARIO_DIR}${f}`, 'utf8')) as Fixture);
}

/** One (step, page) decision: should it flag, did it flag. */
export interface PageOutcome {
  fixtureId: string;
  pageId: string;
  expected: boolean;
  actual: boolean;
  score?: number;
}

export interface FixtureRun {
  failures: string[];
  outcomes: PageOutcome[];
}

/** Runs every step of a fixture and compares the result with its expectations. */
export function runFixture(fx: Fixture): FixtureRun {
  const failures: string[] = [];
  const outcomes: PageOutcome[] = [];
  const index = indexPages(fx.pages);
  fx.steps.forEach((step, i) => {
    const at = `${fx.id} step ${i + 1}`;
    const parsed = parseChangeRecord(step.change);
    if (!parsed.ok) {
      failures.push(`${at}: invalid change record: ${parsed.errors.join('; ')}`);
      return;
    }
    const result = scoreChange(parsed.value, fx.bindings, index, fx.config);
    const want = step.expect;
    if (result.kind !== want.outcome) failures.push(`${at}: outcome ${result.kind}, expected ${want.outcome}`);
    if (want.skipReason && (result.kind !== 'skipped' || result.reason !== want.skipReason)) {
      failures.push(`${at}: expected skip reason ${want.skipReason}`);
    }
    if (want.revertedTitle && (result.kind !== 'revert' || result.revert.revertedTitle !== want.revertedTitle)) {
      failures.push(`${at}: expected revert of "${want.revertedTitle}"`);
    }
    const events = result.kind === 'scored' ? result.events : [];
    if (want.renameProposals) {
      const got = result.kind === 'scored' ? result.renameProposals.map(({ bindingId, from, to }) => ({ bindingId, from, to })) : [];
      if (JSON.stringify(got) !== JSON.stringify(want.renameProposals)) {
        failures.push(`${at}: rename proposals ${JSON.stringify(got)}`);
      }
    }
    for (const page of fx.pages) {
      const pageEvents = events.filter((e) => e.pageId === page.pageId);
      const top = pageEvents[0];
      const expected = want.flagged.find((f) => f.pageId === page.pageId);
      outcomes.push({ fixtureId: fx.id, pageId: page.pageId, expected: !!expected, actual: !!top, ...(top && { score: top.score }) });
      if (!expected) {
        if (top) failures.push(`${at}: page ${page.pageId} flagged (${top.score}) but should not: ${top.reasons.join('; ')}`);
        continue;
      }
      if (!top) {
        failures.push(`${at}: page ${page.pageId} should flag but did not`);
        continue;
      }
      if (expected.minScore !== undefined && top.score < expected.minScore) failures.push(`${at}: page ${page.pageId} score ${top.score} < ${expected.minScore}`);
      if (expected.maxScore !== undefined && top.score > expected.maxScore) failures.push(`${at}: page ${page.pageId} score ${top.score} > ${expected.maxScore}`);
      const severity = pageEvents.some((e) => e.severity === 'high') ? 'high' : 'medium';
      if (expected.severity && severity !== expected.severity) failures.push(`${at}: page ${page.pageId} severity ${severity}, expected ${expected.severity}`);
    }
  });
  return { failures, outcomes };
}

export interface Confusion {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
}

export function confusion(outcomes: readonly PageOutcome[]): Confusion {
  const n = (expected: boolean, actual: boolean) => outcomes.filter((o) => o.expected === expected && o.actual === actual).length;
  const tp = n(true, true);
  const fp = n(false, true);
  const fn = n(true, false);
  const tn = n(false, false);
  return { tp, fp, fn, tn, precision: tp + fp === 0 ? 1 : tp / (tp + fp), recall: tp + fn === 0 ? 1 : tp / (tp + fn) };
}
