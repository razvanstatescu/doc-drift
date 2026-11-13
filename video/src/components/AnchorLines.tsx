import React from "react";
import { evolvePath } from "@remotion/paths";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../brand/theme";
import type { ThemeName } from "../brand/tokens";
import { clamp, EASE } from "../lib/time";

/** A box in the same px space as the lines (usually frame px). */
export type LineBox = { x: number; y: number; w: number; h: number };

/**
 * Hairlines drawn from a token in the page (`scripts/rollback.sh`) to the code-path chips it is anchored to
 * (research 7.2, act A2 and P1). Each line leaves the token's right edge, curves with level tangents and lands on a
 * chip's left edge; lines draw on over `dur` frames (expo out), staggered, with a small dot at each end.
 * Render it as a full-frame overlay in the same coordinate space as the boxes.
 *
 *   <AnchorLines at={sc.wordAt("V07", "anchors")} from={{ x: 300, y: 512, w: 420, h: 60 }}
 *     to={[{ x: 1100, y: 300, w: 640, h: 84 }, { x: 1100, y: 500, w: 420, h: 84 }]} />
 */
export const AnchorLines: React.FC<{
  from: LineBox;
  to: LineBox[];
  at?: number;
  dur?: number;
  stagger?: number;
  /** Line colour (default line-strong). */
  color?: string;
  /** Stroke width px (default 3: a hairline at film scale). */
  width?: number;
  /** Dots at both ends (default true). */
  dots?: boolean;
  /** Leave from the token's bottom edge instead of its right edge. */
  fromSide?: "right" | "bottom";
  theme?: ThemeName;
}> = ({ from, to, at = 0, dur = 18, stagger = 5, color, width = 3, dots = true, fromSide = "right", theme }) => {
  const frame = useCurrentFrame();
  const p = useTheme(theme);
  const stroke = color ?? p.lineStrong;
  const sx = fromSide === "right" ? from.x + from.w : from.x + from.w / 2;
  const sy = fromSide === "right" ? from.y + from.h / 2 : from.y + from.h;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {to.map((b, i) => {
          const start = at + i * stagger;
          const prog = interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: EASE.expoOut });
          if (prog <= 0.001) return null;
          const ex = b.x;
          const ey = b.y + b.h / 2;
          const d =
            fromSide === "right"
              ? `M ${sx} ${sy} C ${sx + (ex - sx) * 0.5} ${sy}, ${ex - (ex - sx) * 0.5} ${ey}, ${ex} ${ey}`
              : `M ${sx} ${sy} C ${sx} ${sy + (ey - sy) * 0.6}, ${ex - (ex - sx) * 0.4} ${ey}, ${ex} ${ey}`;
          const { strokeDasharray, strokeDashoffset } = evolvePath(prog, d);
          const endDot = interpolate(prog, [0.85, 1], [0, 1], clamp);
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
              {dots ? <circle cx={sx} cy={sy} r={width * 2} fill={stroke} /> : null}
              {dots && endDot > 0 ? <circle cx={ex} cy={ey} r={width * 2 * endDot} fill={stroke} /> : null}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
