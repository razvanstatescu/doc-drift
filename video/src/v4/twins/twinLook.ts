import { glowShadow } from "../../motion/slip";
import { amber, BRAND, DAY, NIGHT } from "../look";
import type { World } from "./types";

/**
 * Twin-only look helpers. Colours come from the brand palettes; the elevation ladder repeats look.ts's ELEV and
 * ELEV_DARK numbers with an alpha scale, so a band can fade its own shadow in while the card's shadow fades out.
 */

export const palette = (w: World = "day") => (w === "night" ? NIGHT : DAY);

const fathom = (a: number) => `rgba(7, 38, 48, ${+a.toFixed(4)})`;
const deep = (a: number) => `rgba(1, 10, 13, ${+a.toFixed(4)})`;
const wh = (a: number) => `rgba(255, 255, 255, ${+a.toFixed(4)})`;

type Layer = [number, number, number, number]; // y, blur, spread, alpha
const DAY_LADDER: Record<number, { ring: number; layers: Layer[] }> = {
  1: { ring: 0.07, layers: [[1, 2, 0, 0.06], [4, 12, 0, 0.05]] },
  2: { ring: 0.065, layers: [[2, 4, 0, 0.06], [12, 28, 0, 0.07], [32, 64, 0, 0.06]] },
  3: { ring: 0.06, layers: [[3, 6, 0, 0.06], [18, 40, 0, 0.08], [56, 112, 0, 0.11]] },
  4: { ring: 0.06, layers: [[6, 12, 0, 0.08], [28, 56, 0, 0.12], [72, 144, 0, 0.15]] },
};
/** Night: the same ladder in a deep tint at about 3x, with the top-edge light of a lit surface. */
const NIGHT_LADDER: Record<number, { ring: number; layers: Layer[] }> = {
  1: { ring: 0.05, layers: [[1, 2, 0, 0.22], [4, 12, 0, 0.18]] },
  2: { ring: 0.05, layers: [[2, 4, 0, 0.22], [12, 28, 0, 0.24], [32, 64, 0, 0.2]] },
  3: { ring: 0.055, layers: [[3, 6, 0, 0.22], [18, 40, 0, 0.28], [56, 112, 0, 0.32]] },
  4: { ring: 0.06, layers: [[6, 12, 0, 0.26], [28, 56, 0, 0.32], [72, 144, 0, 0.38]] },
};

/**
 * box-shadow for an elevation (1..4) at an alpha scale (0..1). Night adds a top-edge light and a faint rim. A fractional
 * level cross-fades the two levels around it, so a lift grows its shadow smoothly.
 */
export function elev(level: number, a = 1, world: World = "day"): string {
  if (a <= 0.001 || level <= 0) return "none";
  const lv = Math.max(1, Math.min(4, level));
  const lo = Math.floor(lv);
  const f = lv - lo;
  if (f > 0.01 && lo < 4) {
    const parts = [elevAt(lo, a * (1 - f), world), elevAt(lo + 1, a * f, world)].filter((x) => x !== "none");
    return parts.length ? parts.join(", ") : "none";
  }
  return elevAt(Math.round(lv), a, world);
}

function elevAt(level: number, a: number, world: World): string {
  if (a <= 0.001) return "none";
  const L = Math.max(1, Math.min(4, Math.round(level)));
  if (world === "night") {
    const n = NIGHT_LADDER[L];
    return [`inset 0 1px 0 ${wh(0.07 * a)}`, `0 0 0 1.5px ${wh(n.ring * a)}`, ...n.layers.map(([y, b, s, al]) => `0 ${y}px ${b}px ${s}px ${deep(al * a)}`)].join(", ");
  }
  const d = DAY_LADDER[L];
  return [`0 0 0 1.5px ${fathom(d.ring * a)}`, ...d.layers.map(([y, b, s, al]) => `0 ${y}px ${b}px ${s}px ${fathom(al * a)}`)].join(", ");
}

/** Dark objects on Day (the terminal): look.ts ELEV_DARK with an alpha scale. */
export function elevDark(level: number, a = 1): string {
  const L = Math.max(1, Math.min(4, Math.round(level)));
  const lad: Record<number, Layer[]> = {
    1: [[1, 2, 0, 0.18], [6, 16, 0, 0.14]],
    2: [[2, 4, 0, 0.16], [14, 32, 0, 0.16], [36, 72, 0, 0.12]],
    3: [[4, 8, 0, 0.16], [22, 48, 0, 0.18], [64, 128, 0, 0.18]],
    4: [[6, 12, 0, 0.18], [32, 64, 0, 0.22], [80, 160, 0, 0.22]],
  };
  return [`inset 0 1px 0 ${wh((L === 4 ? 0.09 : 0.08) * a)}`, ...lad[L].map(([y, b, s, al]) => `0 ${y}px ${b}px ${s}px ${fathom(al * a)}`)].join(", ");
}

/** The slip's glow on an element (brand shadow-glow), joined to its own shadow. */
export function withGlow(shadow: string, world: World, strength: number, k: number): string {
  if (strength <= 0.001) return shadow;
  const g = glowShadow(palette(world), strength, k);
  return shadow === "none" ? g : `${g}, ${shadow}`;
}

/** The slip's bloom: a soft amber light under the drifted element (part of it, not a second amber). */
export const bloomBg = (strength: number) =>
  `radial-gradient(closest-side, ${amber(0.26 * strength)} 0%, ${amber(0.1 * strength)} 55%, ${amber(0)} 100%)`;

/** Mist band colours (the marker on words that are not the drift). */
export const mist = (world: World) => (world === "night" ? { bg: "rgba(214, 228, 231, 0.17)", blend: "normal" as const } : { bg: BRAND.mist, blend: "multiply" as const });

/** The Current underline colour (teal, never text). Night uses the Night link teal so it reads on Fathom. */
export const currentLine = (world: World) => (world === "night" ? NIGHT.link : BRAND.current);

export { amber };
