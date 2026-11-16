import { NIGHT } from "../../v4/look";

/**
 * The Night look for the bookends (A1, A4), R2's elevation rules carried onto the Night ground. On Night a Fathom
 * tinted shadow would vanish into the Fathom ground, so the shadow tint here is a deeper Fathom (an in-between value
 * below Night sunk), and every lifted object carries a 1.5 px Night `line` edge and a faint top-edge light, the way
 * ELEV_DARK does on Day. Levels are continuous, so a lift can interpolate its shadow.
 */

/** The shadow tint on Night: deeper than Night sunk (#05191F), so a lifted object darkens the ground under it. */
export const deep = (a: number) => `rgba(1, 10, 13, ${a})`;
/** Night `line` (#1D5360) at an alpha: the edge ring of a lifted object. */
export const edge = (a: number) => `rgba(29, 83, 96, ${a})`;
/** Paper at an alpha: top-edge light, the trace on Night, veils. */
export const paper = (a: number) => `rgba(242, 246, 247, ${a})`;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Box shadow for an object at elevation `level` (0 to 4, continuous) on the Night ground. Higher is bigger, softer
 * and a little deeper. `edgeAlpha` 0 drops the ring (for objects that draw their own border).
 */
export function elevNight(level: number, edgeAlpha = 0.9): string {
  const l = Math.max(0, Math.min(4, level));
  const t = l / 4;
  const parts = [
    `inset 0 1.5px 0 ${paper(lerp(0.04, 0.08, t))}`,
    edgeAlpha > 0 ? `0 0 0 1.5px ${edge(edgeAlpha)}` : null,
    `0 ${lerp(1, 6, t).toFixed(1)}px ${lerp(2, 12, t).toFixed(1)}px ${deep(lerp(0.25, 0.32, t))}`,
    `0 ${lerp(4, 30, t).toFixed(1)}px ${lerp(12, 64, t).toFixed(1)}px ${deep(lerp(0.2, 0.36, t))}`,
    `0 ${lerp(8, 80, t).toFixed(1)}px ${lerp(24, 160, t).toFixed(1)}px ${deep(lerp(0.12, 0.34, t))}`,
  ].filter(Boolean);
  return parts.join(", ");
}

/** A Night card's material: Night surface with a faint light from above (an in-between of surface and line at the top). */
export const nightCard = (top = "#11434F", bottom: string = NIGHT.surface) => `linear-gradient(180deg, ${top} 0%, ${bottom} 62%)`;

/** The dark slab (terminal) on Night: Night sunk, lifted one step higher than its neighbours. */
export const nightSlab = `linear-gradient(180deg, #071F26 0%, ${NIGHT.surfaceSunk} 40%)`;

/** Progress of a lift: 0 at `at`, 1 after `dur` frames (expo out), as an elevation from `from` to `to`. */
export function liftLevel(p: number, from: number, to: number) {
  return lerp(from, to, clamp01(p));
}
