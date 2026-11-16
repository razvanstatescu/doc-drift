import React from "react";
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { DAY } from "../../brand/tokens";
import { clamp } from "../../lib/time";
import { slipCutGeometry } from "../../motion/slip";

/**
 * T1 as a REVEAL (the slip cut that opens instead of cutting; ported from A2's DaySlipReveal, the film's other change
 * of light): the outgoing picture is already split on f = 0 in the mark's three bands (the 12-unit cuts open, the
 * middle band one unit out with its trace), and the bands clear progressively, the top and bottom sliding out to the
 * left and the middle carrying on to the right on a gentle ease-in, so the next world grows every frame and is fully
 * open on `open`. Draw it ABOVE the incoming scene. `lead` frames of the slip have happened on f = 0 (lead 1 with the
 * 2-frame slip: the band is 97% home on the first frame), so the latch sound lands on f = 0 with the band.
 *
 *   {f < 8 ? <SlipReveal f={f} open={8} traceColor={NIGHT.trace}><Freeze frame={last}>{outgoing}</Freeze></SlipReveal> : null}
 */
export const SlipReveal: React.FC<{
  /** Frame counted from the start of the reveal (0 = the incoming scene's first frame). */
  f: number;
  /** Frames of the slip already done on f = 0 (default 1). */
  lead?: number;
  /** The frame the bands have fully left (default 8). */
  open?: number;
  /** Frames the slip itself takes (default 2). */
  slipFrames?: number;
  /** The trace's fill at the middle band's home (default Day's trace; NIGHT.trace when the next world is Night). */
  traceColor?: string;
  /** The outgoing picture (the scene's frozen last frame). */
  children: React.ReactNode;
}> = ({ f, lead = 1, open = 8, slipFrames = 2, traceColor = DAY.trace, children }) => {
  const { width, height } = useVideoConfig();
  if (f >= open) return null;
  // the kit's slip geometry with no exit of its own: the cuts open to 12 units, the middle band slips one unit
  const g = slipCutGeometry(f + lead, width, height, { frames: 1000, slipFrames, exit: "cut" });
  // the clear: a gentle ease-in, so the next world grows every frame instead of arriving at the end
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
