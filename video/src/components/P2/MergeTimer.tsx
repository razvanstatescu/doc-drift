import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { clamp, EASE } from "../../lib/time";
import { NumberRoll } from "../../v4/kit";
import { DAY, FONT } from "../../v4/look";

/**
 * MergeTimer (R3 V13 gap, R2 frame 4): the film's best number at hero size. "Merge to flag" over a 300 px count (the
 * kit's NumberRoll) that runs from 0 like a clock and lands on the measured seconds (captures.json
 * measured.mergeToFlagSeconds, 19) on the frame the page flags, with "Measured on the demo site, Nov 13" under it.
 * The count is a picture of time passing; only the landed value is the claim, and it is the measured one.
 */
export const TIMER_DIGIT = 300;

export const MergeTimer: React.FC<{
  /** Screen position of the block's top-left (film px). */
  x: number;
  y: number;
  /** The measured value it lands on. */
  value: number;
  /** The block lifts in, and the count starts, at `at`; it lands on `value` at `land`. */
  at: number;
  land: number;
  /** The block leaves (moves up and out) from here. */
  out?: number;
}> = ({ x, y, value, at, land, out }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const inP = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  // it leaves upward, fast, clearing its place for the statement that rises into it (never both readable at once)
  const outP = out === undefined ? 0 : interpolate(frame, [out, out + 6], [0, 1], { ...clamp, easing: EASE.cubicInOut });
  if (outP >= 1) return null;
  // a small settle when the count lands with the flag
  const settle = frame >= land ? interpolate(frame, [land, land + 3, land + 10], [1, 1.02, 1], { ...clamp, easing: EASE.quintOut }) : 1;
  const smear = (1 - inP) * 8 + outP * 12;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        color: DAY.text,
        fontFamily: FONT.sans,
        transform: `translateY(${(1 - inP) * 40 - outP * 260}px)`,
        opacity: Math.min(1, inP * 2.5) * Math.pow(1 - outP, 2),
        filter: smear > 0.3 ? `blur(${(smear * 0.35).toFixed(2)}px)` : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, lineHeight: "40px", fontWeight: 500, color: DAY.textMuted }}>
        <Icon name="merge" size={34} color={DAY.textMuted} />
        Merge to flag
      </div>
      <div style={{ marginTop: 6, height: TIMER_DIGIT, transformOrigin: "0% 80%", transform: settle !== 1 ? `scale(${settle})` : undefined }}>
        <NumberRoll value={value} at={at + 2} dur={land - at - 2} unit="s" size={TIMER_DIGIT} ease={(t) => t} unitColor={DAY.textMuted} />
      </div>
      <div style={{ marginTop: 22, fontSize: 32, lineHeight: "40px", fontWeight: 500, color: DAY.textMuted, whiteSpace: "nowrap" }}>Measured on the demo site, Nov 13</div>
    </div>
  );
};
