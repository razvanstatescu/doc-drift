import React from "react";
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { DAY } from "../../brand/tokens";
import { clamp } from "../../lib/time";
import { slipCutGeometry } from "../../motion/slip";

/**
 * The Day slip cut as a REVEAL (A1 to A2, the film's change of light), drawn over A2's first frames.
 *
 * The kit's scene cut (transitions.ts + SlipBands) starts closed on the next scene's first frame and ends in a hard
 * cut, so the Paper world showed only through hairline gaps and then popped in. This uses the kit's own slip geometry
 * (slipCutGeometry: the mark's band rhythm, the 12-unit cuts, the one-unit slip and its trace) and adds an exit that
 * clears the bands progressively: the top and bottom bands slide out left and the middle band carries on to the
 * right, so the Day world is behind the slipped band from the first frame and fully open on `open`.
 *
 * `f` is the frame counted from the start of the cut (0 = A2's first frame). `lead` frames of the slip have already
 * happened on f = 0, so the first frame is already split (the band lands with the score's lift).
 */
const SLIP_FRAMES = 2;

export const DaySlipReveal: React.FC<{
  f: number;
  /** Frames of the slip already done on f = 0 (default 1: the band is 97% home on the first frame). */
  lead?: number;
  /** The frame the Night bands have fully left (default 6). */
  open?: number;
  traceColor?: string;
  /** The outgoing picture (the scene's frozen last frame). */
  children: React.ReactNode;
}> = ({ f, lead = 1, open = 6, traceColor = DAY.trace, children }) => {
  const { width, height } = useVideoConfig();
  if (f >= open) return null;
  // the kit's geometry with no exit of its own: gaps open to 12 units, the middle band slips one unit
  const g = slipCutGeometry(f + lead, width, height, { frames: 1000, slipFrames: SLIP_FRAMES, exit: "cut" });
  // the clear: a gentle ease-in, so the Paper grows every frame instead of arriving at the end
  const t = interpolate(f, [0, open], [0, 1], clamp);
  const leave = t * t;
  const away = leave * width * 1.1;
  const r = g.radius;
  const band = (y0: number, y1: number, x: number, round: string, key: string) => (
    <AbsoluteFill key={key} style={{ clipPath: `inset(${y0}px 0px ${height - y1}px 0px round ${round})`, transform: `translateX(${x}px)` }}>
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
            background: traceColor,
            borderRadius: `0 ${r}px ${r}px 0`,
            opacity: 1 - leave,
          }}
        />
      ) : null}
      {band(g.top.y0, g.top.y1, g.top.x - away, `0px 0px ${r}px ${r}px`, "top")}
      {band(g.mid.y0, g.mid.y1, g.mid.x + away, `${r}px`, "mid")}
      {band(g.bottom.y0, g.bottom.y1, g.bottom.x - away, `${r}px ${r}px 0px 0px`, "bottom")}
    </AbsoluteFill>
  );
};
