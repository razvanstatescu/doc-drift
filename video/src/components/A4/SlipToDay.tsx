import React, { useId } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DAY } from "../../brand/tokens";
import { clamp, EASE } from "../../lib/time";
import { slipCutGeometry } from "../../motion/slip";

/**
 * A4's last slip into Day (endHit): the live Night picture is split into the mark's three bands (the kit's
 * slipCutGeometry: the 94 / 12 / 60 / 12 / 94 rhythm, the cuts opening to 12 units, the middle band slipping one unit
 * with its trace), with the Day end card BEHIND them. The middle band's slip lands on `land` (the score's final hit),
 * holds `hold` frames so the slip reads, then the bands clear: top and bottom out to the left, the middle carrying on
 * to the right, accelerating (expo in) with a directional smear scaled by their speed, so the Paper world opens in
 * `clear` frames. Nothing freezes: the Night picture keeps moving inside its bands.
 *
 * Before `land - slipFrames` only `night` renders; after the clear only `day` renders.
 */
export const SlipToDay: React.FC<{
  land: number;
  slipFrames?: number;
  hold?: number;
  clear?: number;
  night: React.ReactNode;
  day: React.ReactNode;
}> = ({ land, slipFrames = 6, hold = 3, clear = 11, night, day }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = "slip2day" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const start = land - slipFrames;
  const clearAt = land + hold;
  const end = clearAt + clear;
  // each world is its own stacking context, so a z-index inside one (the Stage's) never paints over the other
  if (frame < start) return <AbsoluteFill style={{ isolation: "isolate" }}>{night}</AbsoluteFill>;
  if (frame >= end) return <AbsoluteFill style={{ isolation: "isolate" }}>{day}</AbsoluteFill>;

  const f = frame - start;
  const g = slipCutGeometry(f, width, height, { frames: 1000, slipFrames, exit: "cut" });
  const leaveAt = (fr: number) => interpolate(fr, [clearAt, end], [0, 1], { ...clamp, easing: EASE.expoIn });
  const leave = leaveAt(frame);
  const speed = Math.abs(leaveAt(frame + 0.5) - leaveAt(frame - 0.5)) * width * 1.15; // px per frame
  const blur = Math.min(36, speed * 0.06);
  const away = leave * width * 1.15;
  const r = g.radius;
  const band = (y0: number, y1: number, x: number, round: string, key: string) => (
    <AbsoluteFill key={key} style={{ clipPath: `inset(${y0}px 0px ${height - y1}px 0px round ${round})`, transform: x ? `translateX(${x.toFixed(2)}px)` : undefined }}>
      {night}
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      <AbsoluteFill style={{ isolation: "isolate" }}>{day}</AbsoluteFill>
      {g.trace.w > 0.5 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: g.trace.y0,
            width: g.trace.w + r,
            height: g.trace.y1 - g.trace.y0,
            background: DAY.trace,
            borderRadius: `0 ${r}px ${r}px 0`,
            opacity: 1 - leave,
          }}
        />
      ) : null}
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${blur.toFixed(2)} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ isolation: "isolate", filter: blur > 0.3 ? `url(#${id})` : undefined }}>
        {band(g.top.y0, g.top.y1, g.top.x - away, `0px 0px ${r}px ${r}px`, "top")}
        {band(g.mid.y0, g.mid.y1, g.mid.x + away, `${r}px`, "mid")}
        {band(g.bottom.y0, g.bottom.y1, g.bottom.x - away, `${r}px ${r}px 0px 0px`, "bottom")}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
