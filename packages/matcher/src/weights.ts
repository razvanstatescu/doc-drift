import type { Binding, Severity } from '@dds/shared';
import { ANCHOR_WEIGHTS, DAMPENER_FLOOR, DISMISS_PENALTY, HIGH_SEVERITY_SCORE, type MatcherConfig } from './config.js';

type Weights = NonNullable<MatcherConfig['anchorWeights']>;

/**
 * Weight of a code anchor after the dismiss dampener: the anchor's base weight (normal 0.7,
 * critical 1, D26) minus 0.1 per dismissal, floor 0.3.
 */
export function effectiveWeight(binding: Binding, weights: Weights = ANCHOR_WEIGHTS): number {
  const dismissals = Math.max(0, binding.dismissCount ?? 0);
  const base = binding.weight === 'critical' ? weights.critical : weights.normal;
  return Math.max(DAMPENER_FLOOR, base - DISMISS_PENALTY * dismissals);
}

/**
 * Multiplier for Jira rule scores: only the dismiss dampener (1 minus 0.1 per dismissal, floor 0.3).
 * Jira rules are already scored per signal, so `normal` and `critical` change severity only.
 */
export function jiraDampener(binding: Binding): number {
  const dismissals = Math.max(0, binding.dismissCount ?? 0);
  return Math.max(DAMPENER_FLOOR, 1 - DISMISS_PENALTY * dismissals);
}

/** High if the score is at least 0.8, an anchored file was removed or renamed, or the anchor is critical. */
export function severityFor(score: number, binding: Binding, anchoredFileRemovedOrRenamed: boolean): Severity {
  return score >= HIGH_SEVERITY_SCORE || anchoredFileRemovedOrRenamed || binding.weight === 'critical' ? 'high' : 'medium';
}

/** Rounds a score to 2 decimals and clamps it to [0, 1]. */
export function roundScore(score: number): number {
  return Math.min(1, Math.max(0, Math.round(score * 100) / 100));
}
