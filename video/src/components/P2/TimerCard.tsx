import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { scaleShadow } from "../BrowserFrame";
import { DAY, FONT } from "../../brand/tokens";
import { clamp, EASE } from "../../lib/time";

/**
 * The merge-to-flag timer as a compact card over the product shots (P2). It counts from 0 to the REAL measured
 * seconds (captures.json measured.mergeToFlagSeconds) between `at` (the Merge click) and `at + dur` (the badge
 * flips), linearly, like a stopwatch, then holds; only the final value is a claim. Same reading as the kit's <Timer>
 * ("seconds" format), with a smaller label so the card fits the empty top-right of every framing it sits over.
 * `showAt` (default `at`): when the card lands, if it should wait for something under it to clear (the count still
 * starts at `at`). It leaves over 8 frames from `out`.
 */
export const TimerCard: React.FC<{ seconds: number; at: number; showAt?: number; dur: number; out: number; x: number; y: number; width?: number }> = ({
  seconds,
  at,
  showAt,
  dur,
  out,
  x,
  y,
  width = 300,
}) => {
  const frame = useCurrentFrame();
  const show = showAt ?? at;
  const inP = interpolate(frame, [show, show + 10], [0, 1], { ...clamp, easing: EASE.expoOut });
  const outP = interpolate(frame, [out, out + 8], [0, 1], { ...clamp, easing: EASE.standard });
  if (inP <= 0 || outP >= 1) return null;
  const t = interpolate(frame, [at, at + dur], [0, seconds], { ...clamp, easing: EASE.linear });
  const shown = frame >= at + dur ? seconds : Math.floor(t);
  const fill = interpolate(frame, [at, at + dur], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        boxSizing: "border-box",
        padding: "26px 34px 30px",
        borderRadius: 24,
        background: DAY.surface,
        boxShadow: `0 0 0 1px ${DAY.line}, ${scaleShadow(DAY.shadowRaise, 2.5)}`,
        opacity: inP * (1 - outP),
        transform: `translateY(${(1 - inP) * -24 + outP * -16}px)`,
      }}
    >
      <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 34, lineHeight: "42px", color: DAY.textMuted }}>Merge to flag</div>
      <div
        style={{
          marginTop: 10,
          fontFamily: FONT.mono,
          fontWeight: 500,
          fontSize: 104,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: DAY.text,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "pre",
        }}
      >
        {`${String(shown).padStart(2, " ")} s`}
      </div>
      <div style={{ marginTop: 18, height: 4, borderRadius: 2, background: DAY.line, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${fill * 100}%`, background: DAY.text }} />
      </div>
    </div>
  );
};
