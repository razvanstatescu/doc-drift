import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../../lib/time";
import { amber, BRAND, type Rect } from "../../../v4/kit";

/**
 * JIRA's own piece (the rest is the kit's RealTake and GrowReveal, and FIX's PlateAmber).
 *   AmberColumn   the drift's amber on a column of real states (the dashboard's "Possibly stale" lozenges), multiplied
 *                 into the plate so the real words stay as printed: it sweeps down the column in 10 frames on
 *                 "flagged" and leaves upward in 6 from `out`. Capture px (a RealTake child).
 */
export const AmberColumn: React.FC<{ rect: Rect; at: number; out: number }> = ({ rect, at, out }) => {
  const frame = useCurrentFrame();
  const inn = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
  const gone = tween(frame, out, out + 6, 0, 1, EASE.expoIn);
  if (inn <= 0 || gone >= 1) return null;
  const pad = 10;
  const glowW = rect.w * 0.6;
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: rect.x - glowW / 2,
          top: rect.y - pad,
          width: rect.w + glowW,
          height: rect.h + 2 * pad,
          borderRadius: rect.w,
          background: `radial-gradient(closest-side, ${amber(0.18 * inn * (1 - gone))}, ${amber(0)})`,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: rect.x - pad,
          top: rect.y - pad,
          width: rect.w + 2 * pad,
          height: rect.h + 2 * pad,
          borderRadius: 12,
          background: BRAND.beacon,
          mixBlendMode: "multiply",
          clipPath: `inset(${(1 - inn) * 0}% 0 ${(1 - inn) * 100}% 0 round 12px)`,
          opacity: 1 - gone,
          pointerEvents: "none",
        }}
      />
    </>
  );
};
