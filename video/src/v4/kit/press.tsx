import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE } from "../../lib/time";
import { ink } from "../look";

/**
 * Clicks (ported from Satchel's motion/ui.tsx pressAt): `Press` draws the click ring at (x, y) on `at`, for a scripted
 * <Cursor> (src/components/Cursor.tsx) or a click with no cursor; `pressAt()` is the matching squash for the pressed
 * control (scale 1 to 0.96 and back over 6 frames), so the button and the ring land together.
 *
 *   <div style={{ transform: `scale(${pressAt(frame, at)})` }}><PrimaryButton/></div>
 *   <Press at={at} x={1210} y={844} />
 */
export function pressAt(frame: number, at: number, depth = 0.04) {
  const f = frame - at;
  if (f < 0 || f > 8) return 1;
  return interpolate(f, [0, 2, 4, 8], [1, 1 - depth, 1 - depth, 1], { ...clamp, easing: EASE.cubicInOut });
}

export const Press: React.FC<{
  at: number;
  /** Film px (or the parent's px). */
  x: number;
  y: number;
  /** Ring radius at its widest (default 46). */
  radius?: number;
  world?: "day" | "night";
  color?: string;
}> = ({ at, x, y, radius = 46, world = "day", color }) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0 || f > 16) return null;
  const t = interpolate(f, [0, 16], [0, 1], { ...clamp, easing: EASE.expoOut });
  const c = color ?? (world === "night" ? "rgba(242,246,247,0.6)" : ink(0.42));
  const r = radius * (0.3 + 0.7 * t);
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: "50%",
        border: `3px solid ${c}`,
        boxSizing: "border-box",
        opacity: 1 - t,
        pointerEvents: "none",
      }}
    />
  );
};
