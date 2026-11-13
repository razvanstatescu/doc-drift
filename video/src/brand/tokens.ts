import type { CSSProperties } from "react";

/**
 * Doc Drift Sentinel brand tokens for the film, from brand/tokens.json (copied verbatim; if that file changes, change
 * this one). Two worlds: NIGHT (Night shift: the cold open, the reveal and act A1) and DAY (from A2 on).
 * Hard rules (BRIEF section 6): one beacon (amber) element per shot; amber as text on Day uses beaconText (#8A5300);
 * primary buttons fill with `text`; Spline Sans for reading, Spline Sans Mono only for literals.
 */

export type ThemeName = "night" | "day";

export interface Palette {
  name: ThemeName;
  /** Page background. Fathom by night, Paper by day. */
  ground: string;
  /** Cards and panels on ground. */
  surface: string;
  /** Code blocks, wells, empty states. */
  surfaceSunk: string;
  /** Decorative hairlines and dividers. */
  line: string;
  /** Control borders, focus rings (3:1). */
  lineStrong: string;
  text: string;
  textMuted: string;
  link: string;
  /** The slip. One per shot. */
  beacon: string;
  /** Text and icons on beacon. */
  onBeacon: string;
  /** Amber as text or an icon on ground or surface. */
  beaconText: string;
  /** The trace: a fill at the position content should hold. Fills only, never text. */
  trace: string;
  verified: string;
  verifiedTint: string;
  stale: string;
  staleTint: string;
  unanchored: string;
  unanchoredTint: string;
  /** Things that float (modals, popovers, our BrowserFrame). */
  shadowRaise: string;
  /** The one drifted item in view. */
  shadowGlow: string;
}

export const NIGHT: Palette = {
  name: "night",
  ground: "#072630",
  surface: "#0E3D48",
  surfaceSunk: "#05191F",
  line: "#1D5360",
  lineStrong: "#4F8994",
  text: "#F2F6F7",
  textMuted: "#9DB8BE",
  link: "#5FB3BF",
  beacon: "#FFB224",
  onBeacon: "#072630",
  beaconText: "#FFB224",
  trace: "#FFFFFF1A",
  verified: "#4FD1A1",
  verifiedTint: "#0F3A33",
  stale: "#FF7A66",
  staleTint: "#3A1F1C",
  unanchored: "#9DB0B5",
  unanchoredTint: "#16353D",
  shadowRaise: "0 1px 0 #FFFFFF0F inset, 0 12px 32px #00000066",
  shadowGlow: "0 0 0 1px #FFB22459, 0 8px 32px #FFB22440",
};

export const DAY: Palette = {
  name: "day",
  ground: "#F2F6F7",
  surface: "#FFFFFF",
  surfaceSunk: "#E8EEEF",
  line: "#D6E4E7",
  lineStrong: "#6B878D",
  text: "#072630",
  textMuted: "#4A6670",
  link: "#1B6470",
  beacon: "#FFB224",
  onBeacon: "#072630",
  beaconText: "#8A5300",
  trace: "#0A2F3817",
  verified: "#0F7A57",
  verifiedTint: "#E3F4EC",
  stale: "#A93522",
  staleTint: "#FBE7E3",
  unanchored: "#52676C",
  unanchoredTint: "#E8EEEF",
  shadowRaise: "0 1px 2px #0726301A, 0 8px 24px #07263014",
  shadowGlow: "0 0 0 1px #C7770059, 0 8px 24px #FFB22433",
};

export const PALETTES: Record<ThemeName, Palette> = { night: NIGHT, day: DAY };

/** Brand constants (logo, illustration, marketing). `current` is never text. */
export const BRAND = {
  fathom: "#072630",
  shoal: "#0E3D48",
  current: "#22717E",
  paper: "#F2F6F7",
  mist: "#D6E4E7",
  beaconHigh: "#FFD166",
  beaconLow: "#FF9F1C",
  beacon: "#FFB224",
  /** The flat mark's ink (doc-drift-mark.svg). */
  ink: "#0A2F38",
  /** The flat mark's slip fill. */
  slipFlat: "#FFAA1F",
  /** The cold open's other ground (BRIEF decision 2: black and Fathom). */
  black: "#000000",
} as const;

export const FONT = {
  sans: '"Spline Sans", ui-sans-serif, system-ui, sans-serif',
  mono: '"Spline Sans Mono", ui-monospace, Menlo, monospace',
} as const;

/** UI-scale radii (px at 1x). Scale them with the UI when you draw UI at video size. */
export const RADIUS = { cut: 8, card: 14, panel: 24, pill: 999 } as const;

/** UI-scale spacing (4 px grid). */
export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48, 16: 64 } as const;

/**
 * The slip unit S: 11.7% (60 of 512 on the logo grid). In motion, a drifted element slides 1 S of its own width to the
 * right (brand README, Motion). The logo's own band slips exactly 56 units: Mark.tsx uses the artwork, not this.
 */
export const SLIP_UNIT = 0.117;

type TypeSpec = { fontFamily: string; fontSize: number; lineHeight: number; fontWeight: number; letterSpacing?: string };

/** The brand's UI type ramp at 1x (brand/tokens.json). Multiply fontSize and lineHeight by k for video. */
export const TYPE_UI: Record<string, TypeSpec> = {
  display: { fontFamily: FONT.sans, fontSize: 72, lineHeight: 76, fontWeight: 600, letterSpacing: "-0.02em" },
  title: { fontFamily: FONT.sans, fontSize: 48, lineHeight: 54, fontWeight: 600, letterSpacing: "-0.015em" },
  headingLg: { fontFamily: FONT.sans, fontSize: 32, lineHeight: 40, fontWeight: 600, letterSpacing: "-0.01em" },
  headingMd: { fontFamily: FONT.sans, fontSize: 22, lineHeight: 30, fontWeight: 600 },
  headingSm: { fontFamily: FONT.sans, fontSize: 18, lineHeight: 26, fontWeight: 600 },
  body: { fontFamily: FONT.sans, fontSize: 16, lineHeight: 24, fontWeight: 400 },
  bodySm: { fontFamily: FONT.sans, fontSize: 14, lineHeight: 20, fontWeight: 400 },
  caption: { fontFamily: FONT.sans, fontSize: 12, lineHeight: 16, fontWeight: 500, letterSpacing: "0.01em" },
  code: { fontFamily: FONT.mono, fontSize: 14, lineHeight: 20, fontWeight: 400 },
  codeSm: { fontFamily: FONT.mono, fontSize: 12, lineHeight: 18, fontWeight: 500 },
};

/**
 * The film's type ramp at 1920x1080 (BRIEF section 7: headlines >= 120 px, body >= 56 px, literals >= 40 px, inside
 * the central 80% of the frame). Spline Sans 600 for statements; mono only for literals.
 */
export const TYPE = {
  /** Cold-open captions and the end card line. */
  hero: { fontFamily: FONT.sans, fontSize: 156, lineHeight: 164, fontWeight: 600, letterSpacing: "-0.03em" },
  /** Statements ("A date can't see a merge."). */
  headline: { fontFamily: FONT.sans, fontSize: 120, lineHeight: 128, fontWeight: 600, letterSpacing: "-0.025em" },
  /** Card titles and large UI labels in designed shots. */
  title: { fontFamily: FONT.sans, fontSize: 80, lineHeight: 88, fontWeight: 600, letterSpacing: "-0.02em" },
  /** Body copy on screen. */
  body: { fontFamily: FONT.sans, fontSize: 56, lineHeight: 72, fontWeight: 500, letterSpacing: "-0.01em" },
  /** "Small:" lines in the script (muted, one line). Smallest reading size in the film. */
  small: { fontFamily: FONT.sans, fontSize: 44, lineHeight: 56, fontWeight: 500, letterSpacing: "-0.005em" },
  /** Source and date credits on plates and quotes. */
  credit: { fontFamily: FONT.sans, fontSize: 30, lineHeight: 38, fontWeight: 500, letterSpacing: "0" },
  /** Paths, keys, commands (>= 40 px). */
  literal: { fontFamily: FONT.mono, fontSize: 44, lineHeight: 60, fontWeight: 400, letterSpacing: "-0.01em" },
  /** A literal as the subject of a shot. */
  literalLg: { fontFamily: FONT.mono, fontSize: 64, lineHeight: 80, fontWeight: 500, letterSpacing: "-0.015em" },
} as const satisfies Record<string, TypeSpec>;

export type TypeName = keyof typeof TYPE;

/** CSS for a ramp style, with optional overrides. (Line heights are px: a bare number would be a multiplier in CSS.) */
export function typeStyle(name: TypeName, overrides: CSSProperties = {}): CSSProperties {
  const t: TypeSpec = TYPE[name];
  return {
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    lineHeight: `${t.lineHeight}px`,
    fontWeight: t.fontWeight,
    letterSpacing: t.letterSpacing,
    fontKerning: "normal",
    ...overrides,
  };
}

/** CSS for a UI ramp style drawn at k times its size. */
export function uiType(name: keyof typeof TYPE_UI, k: number, overrides: CSSProperties = {}): CSSProperties {
  const t = TYPE_UI[name];
  return { ...t, fontSize: t.fontSize * k, lineHeight: `${t.lineHeight * k}px`, ...overrides };
}

/** Title-safe area: the central 80% of the frame. */
export const SAFE = { x: 192, y: 108, w: 1536, h: 864 } as const;
