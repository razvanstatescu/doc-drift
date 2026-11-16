import type { CSSProperties } from "react";
import { BRAND, DAY, FONT, NIGHT } from "../brand/tokens";

/**
 * The light (Day) film look, v4 research (R2). Everything here is built from brand/tokens.json: the grounds are Paper,
 * white and surface-sunk; every shadow and edge is tinted with Fathom (#072630), never grey or black; amber stays the
 * one slip per shot. Values are at FILM size (1920 x 1080), where crafted UI is drawn at about 2x of UI size.
 * See docs/video/v4/R2-light-style.md for the rules and the stills that prove them.
 */

/** Fathom at an alpha: the tint of every Day shadow, edge and veil. */
export const ink = (a: number) => `rgba(7, 38, 48, ${a})`;
/** White at an alpha (top-edge light on dark objects, veils on light pages). */
export const white = (a: number) => `rgba(255, 255, 255, ${a})`;
/** Beacon at an alpha (the slip's bloom only). */
export const amber = (a: number) => `rgba(255, 178, 36, ${a})`;
/** Current at an alpha (tide lines, connector hairlines). Never text. */
export const current = (a: number) => `rgba(34, 113, 126, ${a})`;

export type Elev = 0 | 1 | 2 | 3 | 4;

/**
 * The elevation scale on Day. One light, straight above. Each level is an edge (a 1.5 px Fathom ring that defines a
 * white card on Paper), a tight contact layer and one or two soft ambient layers. Level 2 at UI size is the brand's
 * shadow-raise (0 1px 2px 10%, 0 8px 24px 8%) drawn at film size.
 *   0 ground · 1 rest (sheets, chips, rows) · 2 lift (cards) · 3 hero (the one hero object) · 4 float (over a hero)
 */
export const ELEV: Record<Elev, string> = {
  0: "none",
  1: [`0 0 0 1.5px ${ink(0.07)}`, `0 1px 2px ${ink(0.06)}`, `0 4px 12px ${ink(0.05)}`].join(", "),
  2: [`0 0 0 1.5px ${ink(0.065)}`, `0 2px 4px ${ink(0.06)}`, `0 12px 28px ${ink(0.07)}`, `0 32px 64px ${ink(0.06)}`].join(", "),
  // Round 2 (QA K-5, 2026-11-16): hero and float objects carry a 11 to 12% Fathom ring and a contact layer about 30%
  // stronger, so white cards hold their edge on the Paper sweep at 1080p and after YouTube's encode.
  3: [`0 0 0 1.5px ${ink(0.11)}`, `0 3px 6px ${ink(0.08)}`, `0 18px 40px ${ink(0.1)}`, `0 56px 112px ${ink(0.12)}`].join(", "),
  4: [`0 0 0 1.5px ${ink(0.12)}`, `0 6px 12px ${ink(0.105)}`, `0 28px 56px ${ink(0.15)}`, `0 72px 144px ${ink(0.16)}`].join(", "),
};

/** Dark objects on Day (the terminal, ink labels): the same light, a little deeper, plus a top-edge highlight. */
export const ELEV_DARK: Record<Exclude<Elev, 0>, string> = {
  1: [`inset 0 1px 0 ${white(0.08)}`, `0 1px 2px ${ink(0.18)}`, `0 6px 16px ${ink(0.14)}`].join(", "),
  2: [`inset 0 1px 0 ${white(0.08)}`, `0 2px 4px ${ink(0.16)}`, `0 14px 32px ${ink(0.16)}`, `0 36px 72px ${ink(0.12)}`].join(", "),
  3: [`inset 0 1px 0 ${white(0.08)}`, `0 4px 8px ${ink(0.16)}`, `0 22px 48px ${ink(0.18)}`, `0 64px 128px ${ink(0.18)}`].join(", "),
  4: [`inset 0 1px 0 ${white(0.09)}`, `0 6px 12px ${ink(0.18)}`, `0 32px 64px ${ink(0.22)}`, `0 80px 160px ${ink(0.22)}`].join(", "),
};

/**
 * The Day ground is never one flat fill: a studio sweep from white at the light's centre, through Paper, to
 * surface-sunk at the corners. Only token colours, so it stays in the brand.
 */
export const sweep = (cx = "50%", cy = "34%") =>
  // Round 2 (QA K-5): the outer stop is `line` (#D6E4E7), one step darker than surface-sunk, so the frame's edges sit a
  // step below Paper and white objects read as figures (the corners land near #E2EBED, the light stays white).
  `radial-gradient(130% 95% at ${cx} ${cy}, ${DAY.surface} 0%, #F7FAFA 26%, ${DAY.ground} 52%, ${DAY.line} 100%)`;

/** Hairlines at film size: dividers inside white objects, and the trace fill. */
export const HAIR = { line: DAY.line, strong: DAY.lineStrong, width: 2 } as const;

/** The film type scale (px at 1080p). Display and headline as in the kit; labels and UI sizes added for the Day look. */
export const T = {
  display: { fontFamily: FONT.sans, fontSize: 156, lineHeight: "164px", fontWeight: 600, letterSpacing: "-0.03em" },
  headline: { fontFamily: FONT.sans, fontSize: 120, lineHeight: "126px", fontWeight: 600, letterSpacing: "-0.028em" },
  title: { fontFamily: FONT.sans, fontSize: 80, lineHeight: "88px", fontWeight: 600, letterSpacing: "-0.02em" },
  lead: { fontFamily: FONT.sans, fontSize: 44, lineHeight: "56px", fontWeight: 500, letterSpacing: "-0.01em" },
  /** Eyebrows, source labels, small credits: the smallest must-read size. */
  label: { fontFamily: FONT.sans, fontSize: 30, lineHeight: "38px", fontWeight: 500, letterSpacing: "0" },
  mono: { fontFamily: FONT.mono, fontWeight: 400, letterSpacing: "-0.01em" },
} as const satisfies Record<string, CSSProperties>;

export { BRAND, DAY, FONT, NIGHT };

/** A rectangle in film px on the 1920 x 1080 stage, before the camera. */
export type Rect = { x: number; y: number; w: number; h: number };

/**
 * The Night ground, lit like the Day sweep: a slightly lifted centre (Night surface) falling to Night ground and, at the
 * corners, Night sunk. Only token colours. The light point moves toward the subject, as on Day.
 */
export const nightSweep = (cx = "50%", cy = "38%") =>
  `radial-gradient(130% 95% at ${cx} ${cy}, ${NIGHT.surface} 0%, #0B3540 24%, ${NIGHT.ground} 56%, ${NIGHT.surfaceSunk} 100%)`;

// ---------------------------------------------------------------------------------------------------------------------
// Interpolable elevation (kit): the ELEV and ELEV_DARK ladders as numbers, so a lift can grow its shadow smoothly.
// elevAt(2) equals ELEV[2] (and elevAt(2, true) equals ELEV_DARK[2]) up to rounding; elevAt(2.5) is half way.
// ---------------------------------------------------------------------------------------------------------------------

type ShadowLayer = [y: number, blur: number, alpha: number];
/** Day: [ring alpha, contact, ambient 1, ambient 2] per level (the 1.5 px Fathom ring is the edge). */
const DAY_LADDER: { ring: number; layers: ShadowLayer[] }[] = [
  { ring: 0, layers: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
  { ring: 0.07, layers: [[1, 2, 0.06], [4, 12, 0.05], [16, 32, 0]] },
  { ring: 0.065, layers: [[2, 4, 0.06], [12, 28, 0.07], [32, 64, 0.06]] },
  { ring: 0.11, layers: [[3, 6, 0.08], [18, 40, 0.1], [56, 112, 0.12]] },
  { ring: 0.12, layers: [[6, 12, 0.105], [28, 56, 0.15], [72, 144, 0.16]] },
];
/** Dark objects: [top-edge light alpha, contact, ambient 1, ambient 2] per level. */
const DARK_LADDER: { top: number; layers: ShadowLayer[] }[] = [
  { top: 0, layers: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
  { top: 0.08, layers: [[1, 2, 0.18], [6, 16, 0.14], [20, 40, 0]] },
  { top: 0.08, layers: [[2, 4, 0.16], [14, 32, 0.16], [36, 72, 0.12]] },
  { top: 0.08, layers: [[4, 8, 0.16], [22, 48, 0.18], [64, 128, 0.18]] },
  { top: 0.09, layers: [[6, 12, 0.18], [32, 64, 0.22], [80, 160, 0.22]] },
];

const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Night: objects on the Fathom ground. A Fathom-tinted shadow vanishes there, so these are near-black (Night sunk,
 *  deepened) with a top-edge light, the way NIGHT.shadowRaise is built. */
const NIGHT_LADDER: { top: number; layers: ShadowLayer[] }[] = [
  { top: 0, layers: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
  { top: 0.05, layers: [[1, 2, 0.3], [4, 12, 0.28], [16, 32, 0]] },
  { top: 0.06, layers: [[2, 4, 0.32], [12, 28, 0.34], [32, 64, 0.26]] },
  { top: 0.06, layers: [[3, 6, 0.34], [18, 40, 0.4], [56, 112, 0.34]] },
  { top: 0.07, layers: [[6, 12, 0.36], [28, 56, 0.46], [72, 144, 0.4]] },
];
const nightShade = (a: number) => `rgba(1, 10, 13, ${a})`;

/**
 * The box-shadow at a fractional elevation (0 to 4). `dark` for Fathom objects on Day (one step higher by rule);
 * `world: "night"` for anything on the Night ground (near-black shadows and a top-edge light).
 */
export function elevAt(level: number, dark = false, world: "day" | "night" = "day"): string {
  const l = Math.max(0, Math.min(4, level));
  if (l <= 0.001) return "none";
  const i = Math.min(3, Math.floor(l));
  const t = l - i;
  const mix = (a: number, b: number) => a + (b - a) * t;
  if (world === "night") {
    const a = NIGHT_LADDER[i];
    const b = NIGHT_LADDER[i + 1];
    const layers = a.layers.map((la, k) => {
      const lb = b.layers[k];
      return `0 ${r2(mix(la[0], lb[0]))}px ${r2(mix(la[1], lb[1]))}px ${nightShade(r3(mix(la[2], lb[2])))}`;
    });
    return [`inset 0 1px 0 ${white(r3(mix(a.top, b.top)))}`, ...layers].join(", ");
  }
  if (dark) {
    const a = DARK_LADDER[i];
    const b = DARK_LADDER[i + 1];
    const layers = a.layers.map((la, k) => {
      const lb = b.layers[k];
      return `0 ${r2(mix(la[0], lb[0]))}px ${r2(mix(la[1], lb[1]))}px ${ink(r3(mix(la[2], lb[2])))}`;
    });
    return [`inset 0 1px 0 ${white(r3(mix(a.top, b.top)))}`, ...layers].join(", ");
  }
  const a = DAY_LADDER[i];
  const b = DAY_LADDER[i + 1];
  const layers = a.layers.map((la, k) => {
    const lb = b.layers[k];
    return `0 ${r2(mix(la[0], lb[0]))}px ${r2(mix(la[1], lb[1]))}px ${ink(r3(mix(la[2], lb[2])))}`;
  });
  return [`0 0 0 1.5px ${ink(r3(mix(a.ring, b.ring)))}`, ...layers].join(", ");
}
