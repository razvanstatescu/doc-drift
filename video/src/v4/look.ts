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
  3: [`0 0 0 1.5px ${ink(0.06)}`, `0 3px 6px ${ink(0.06)}`, `0 18px 40px ${ink(0.08)}`, `0 56px 112px ${ink(0.11)}`].join(", "),
  4: [`0 0 0 1.5px ${ink(0.06)}`, `0 6px 12px ${ink(0.08)}`, `0 28px 56px ${ink(0.12)}`, `0 72px 144px ${ink(0.15)}`].join(", "),
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
  `radial-gradient(130% 95% at ${cx} ${cy}, ${DAY.surface} 0%, #F7FAFA 26%, ${DAY.ground} 52%, ${DAY.surfaceSunk} 100%)`;

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
