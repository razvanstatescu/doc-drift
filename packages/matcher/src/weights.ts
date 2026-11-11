import type { Binding, Severity } from '@dds/shared';
import { BASE_WEIGHT, DAMPENER_FLOOR, DISMISS_PENALTY, HIGH_SEVERITY_SCORE } from './config.js';

/** Anchor weight after the dismiss dampener: −0.1 per dismissal, floor 0.3. */
export function effectiveWeight(binding: Binding): number {
  const dismissals = Math.max(0, binding.dismissCount ?? 0);
  return Math.max(DAMPENER_FLOOR, BASE_WEIGHT - DISMISS_PENALTY * dismissals);
}

/** High if the score is at least 0.8, an anchored file was removed or renamed, or the anchor is critical. */
export function severityFor(score: number, binding: Binding, anchoredFileRemovedOrRenamed: boolean): Severity {
  return score >= HIGH_SEVERITY_SCORE || anchoredFileRemovedOrRenamed || binding.weight === 'critical' ? 'high' : 'medium';
}

/** Rounds a score to 2 decimals and clamps it to [0, 1]. */
export function roundScore(score: number): number {
  return Math.min(1, Math.max(0, Math.round(score * 100) / 100));
}
