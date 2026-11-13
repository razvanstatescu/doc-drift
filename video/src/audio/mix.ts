import { interpolate } from "remotion";
import { TIMELINE, type MusicEntry } from "../lib/timeline";

/** Decibels to a linear gain (Remotion volumes are linear and summed). */
export const dB = (d: number) => Math.pow(10, d / 20);

/**
 * Mix defaults (cookbook section 5: duck about 9-12 dB under speech, 6 f attack, 12 f release). The audio agent can
 * override any of them with a "mix" block in timeline.json without touching code:
 *   "mix": { "voDb": 0, "duckDb": -9, "attackFrames": 6, "releaseFrames": 12 }
 */
export const MIX = {
  voDb: 0,
  duckDb: -9,
  attackFrames: 6,
  releaseFrames: 12,
  ...(TIMELINE.mix ?? {}),
};

/** Duck ranges: timeline.duck, or (if the file has none) every VO line's span. Absolute frames. */
const DUCK: [number, number][] =
  TIMELINE.duck.length > 0 ? TIMELINE.duck : TIMELINE.vo.map((l) => [l.from, l.from + l.durationInFrames] as [number, number]);

/** 0..1: how far the score is ducked at an absolute frame (linear in dB between the ramps). */
export function duckAt(absFrame: number): number {
  let k = 0;
  for (const [a, b] of DUCK) {
    if (absFrame < a - MIX.attackFrames || absFrame > b + MIX.releaseFrames) continue;
    const v = interpolate(absFrame, [a - MIX.attackFrames, a, b, b + MIX.releaseFrames], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    k = Math.max(k, v);
  }
  return k;
}

/** Linear gain of a score entry at an absolute frame: its own gainDb plus the duck (its own duckDb, else MIX's). */
export const musicGainAt = (absFrame: number, m: MusicEntry) => {
  const depth = typeof m.duckDb === "number" ? m.duckDb : MIX.duckDb;
  return dB((m.gainDb ?? 0) + duckAt(absFrame) * depth);
};
