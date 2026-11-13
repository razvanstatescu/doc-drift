import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../brand/theme";
import { SLIP_UNIT, type Palette, type ThemeName } from "../brand/tokens";
import { clamp, EASE, tween } from "../lib/time";

/**
 * The film's one motion idea (brand README, Motion; BRIEF section 7):
 * - SLIP: an element slides one slip unit (11.7% of its own width) to the right in 180 ms (6 f), ease out, and glows.
 * - TRACE: a flat fill stays where it belongs for as long as it is out of line.
 * - SNAP BACK: verifying slides it home in 240 ms (8 f) and the glow fades. Put the latch SFX at back + 2.
 * - SLIP CUT: the whole frame splits into three bands (the mark's own proportions); the middle band slips right and the
 *   next shot is behind it, then the cut lands.
 */

export const SLIP_FRAMES = 6; // 180 ms
export const SNAP_FRAMES = 8; // 240 ms

/** How far out of line (0..1) an element is: out at `at`, home again at `back` (both local frames). */
export function slipProgress(frame: number, at: number, back?: number, slipFrames = SLIP_FRAMES, snapFrames = SNAP_FRAMES) {
  const out = tween(frame, at, at + slipFrames, 0, 1, EASE.expoOut);
  if (back === undefined) return out;
  return out * (1 - tween(frame, back, back + snapFrames, 0, 1, EASE.expoOut));
}

/** shadow-glow at a strength (0..1) and a scale k (1 = UI size). */
export function glowShadow(p: Palette, strength: number, k = 1) {
  if (strength <= 0) return "none";
  const a = (x: number) => Math.round(x * strength * 255).toString(16).padStart(2, "0");
  return p.name === "night"
    ? `0 0 0 ${k}px #FFB224${a(0x59 / 255)}, 0 ${8 * k}px ${32 * k}px #FFB224${a(0x40 / 255)}`
    : `0 0 0 ${k}px #C77700${a(0x59 / 255)}, 0 ${8 * k}px ${24 * k}px #FFB224${a(0x33 / 255)}`;
}

/**
 * Wrap anything (a badge, a step, a band) to slip it out of line at `at` and snap it back at `back`. The slide is a
 * percentage of the element's own width, so nothing needs measuring. The trace and the glow follow the slip.
 * Use it for the ONE amber element of a shot. Sound: <Sfx id="slip" at={at + SLIP_FRAMES} /> (its latch lands with
 * the band) and <Sfx id="snap" at={back + 2} />.
 */
export const Slip: React.FC<{
  at: number;
  back?: number;
  /** Slide as a share of the element's width (default 0.117, the slip unit). */
  unit?: number;
  /** Draw the trace at the home position (default true). */
  trace?: boolean;
  /** Glow while out of line (default true). */
  glow?: boolean;
  /** Corner radius shared by the trace and the glow, px. */
  radius?: number;
  /** Scale of the glow (1 = UI size). */
  k?: number;
  theme?: ThemeName;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, back, unit = SLIP_UNIT, trace = true, glow = true, radius = 8, k = 2, theme, style, children }) => {
  const frame = useCurrentFrame();
  const p = useTheme(theme);
  const s = slipProgress(frame, at, back);
  return (
    <div style={{ position: "relative", display: "inline-block", ...style }}>
      {trace && s > 0.001 ? (
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, background: p.trace, opacity: Math.min(1, s / 0.25) }} />
      ) : null}
      <div
        style={{
          position: "relative",
          transform: s > 0 ? `translateX(${s * unit * 100}%)` : undefined,
          borderRadius: radius,
          boxShadow: glow ? glowShadow(p, s, k) : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// The slip cut
// ---------------------------------------------------------------------------------------------

/** The mark's vertical rhythm on its 272-unit D: band 94, cut 12, band 60, cut 12, band 94. */
const D = { top: 94, cut: 12, mid: 60, total: 272 };

export type SlipCutOptions = {
  /** Frames the cut lasts (default 8). The slip itself takes `slipFrames` (6); the rest holds before the cut. */
  frames?: number;
  slipFrames?: number;
  /** Fill drawn at the middle band's home position over the next shot (default: Day's trace, since cuts go into Day). */
  traceColor?: string;
  /** "cut": the bands vanish on the last frame (default). "clear": they leave, top and bottom left, middle right. */
  exit?: "cut" | "clear";
  /** Frames of the "clear" exit (default 3). */
  exitFrames?: number;
};

/** Geometry of the three bands at frame f of a slip cut, in px. */
export function slipCutGeometry(f: number, width: number, height: number, o: SlipCutOptions = {}) {
  const frames = o.frames ?? 8;
  const slipFrames = o.slipFrames ?? 6;
  const exitFrames = o.exitFrames ?? 3;
  const u = height / D.total;
  const p = interpolate(f, [0, slipFrames], [0, 1], { ...clamp, easing: EASE.expoOut });
  const gap = D.cut * u * p; // cuts open to the logo's 12 units
  const c1 = (D.top + D.cut / 2) * u; // centre lines of the two cuts
  const c2 = (D.top + D.cut + D.mid + D.cut / 2) * u;
  const dx = SLIP_UNIT * width * p; // the middle band slips one unit
  const radius = 8 * u * p; // the mark's 8-unit fillet, grown with the cut
  const leave = o.exit === "clear" ? interpolate(f, [frames - exitFrames, frames], [0, 1], { ...clamp, easing: EASE.expoIn }) : 0;
  return {
    p,
    top: { y0: 0, y1: c1 - gap / 2, x: -leave * width * 1.1 },
    mid: { y0: c1 + gap / 2, y1: c2 - gap / 2, x: dx + leave * width * 1.1 },
    bottom: { y0: c2 + gap / 2, y1: height, x: -leave * width * 1.1 },
    radius,
    trace: { x: 0, y0: c1 + gap / 2, y1: c2 - gap / 2, w: dx },
  };
}

/**
 * The OUTGOING picture split into the three bands at frame `f` of the cut (gaps are transparent, so whatever is
 * underneath shows through), plus the trace. Render it ON TOP of the next shot.
 */
export const SlipBands: React.FC<{ f: number; options?: SlipCutOptions; children: React.ReactNode }> = ({ f, options = {}, children }) => {
  const { width, height } = useVideoConfig();
  const g = slipCutGeometry(f, width, height, options);
  const r = g.radius;
  const band = (y0: number, y1: number, x: number, round: string, key: string) => (
    <AbsoluteFill key={key} style={{ clipPath: `inset(${y0}px 0px ${height - y1}px 0px round ${round})`, transform: x ? `translateX(${x}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill>
      {g.trace.w > 0.5 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: g.trace.y0,
            width: g.trace.w + r,
            height: g.trace.y1 - g.trace.y0,
            background: options.traceColor ?? "#0A2F3817",
            borderRadius: `0 ${r}px ${r}px 0`,
          }}
        />
      ) : null}
      {band(g.top.y0, g.top.y1, g.top.x, `0px 0px ${r}px ${r}px`, "top")}
      {band(g.mid.y0, g.mid.y1, g.mid.x, `${r}px`, "mid")}
      {band(g.bottom.y0, g.bottom.y1, g.bottom.x, `${r}px ${r}px 0px 0px`, "bottom")}
    </AbsoluteFill>
  );
};

/**
 * A slip cut inside one scene: `from` until `at`, then `to` with `from` split on top for `frames`, then `to` alone.
 * Sound: <Sfx id="slip" at={at + 6} /> (its latch lands with the band). Wrap `from` in <Freeze> if it should hold
 * still while it slips. Each band draws `from` again, so keep heavy media out of the outgoing layer if you can.
 */
export const SlipCut: React.FC<SlipCutOptions & { at: number; from: React.ReactNode; to: React.ReactNode }> = ({ at, from, to, ...o }) => {
  const frame = useCurrentFrame();
  const frames = o.frames ?? 8;
  if (frame < at) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= at + frames) return <AbsoluteFill>{to}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <AbsoluteFill>{to}</AbsoluteFill>
      <SlipBands f={frame - at} options={o}>
        {from}
      </SlipBands>
    </AbsoluteFill>
  );
};
