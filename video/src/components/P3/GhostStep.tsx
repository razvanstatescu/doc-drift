import React from "react";
import { interpolateColors, useCurrentFrame } from "remotion";
import { SLIP_UNIT } from "../../brand/tokens";
import { EASE, tween } from "../../lib/time";
import { amber, DAY, FONT, ink } from "../../v4/look";

/**
 * V17 "It doesn't repeat the old step.": A1's old answer, step 2's command, appears WHOLE in Drift Reviewer's answer
 * slot as a dimmed, dashed ghost (the brand's trace shape): a memory of what the generic assistant said in A1, never
 * typed, with no cursor, so the agent never seems to write it (QA G-6). It is then caught: it slips one unit right in
 * amber, leaving its trace and bloom (the shot's one amber, the page being off frame or drained), and falls away.
 *
 *   <GhostStep text={OLD_STEP} x={1180} y={540} at={212} slipAt={242} fallAt={256} />
 *
 * `x`, `y` are the well's home (top-left) in the parent's px. Fades are allowed here: it is a ghost and a trace (M3).
 */
export const GhostStep: React.FC<{
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  /** The ghost settles in, whole (10 f, expo out: a soft focus pull and a small rise). */
  at: number;
  /** The slip: one unit right in 6 f, the well turns amber, its trace and bloom appear. */
  slipAt: number;
  /** It falls away (18 f, expo in) and the trace fades after it. */
  fallAt: number;
  /** Opacity of the ghost before it is caught (default 0.55: dimmed, clearly not the agent's answer). */
  ghost?: number;
}> = ({ text, x, y, fontSize = 30, at, slipAt, fallAt, ghost = 0.55 }) => {
  const frame = useCurrentFrame();
  const form = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
  const s = tween(frame, slipAt, slipAt + 6, 0, 1, EASE.expoOut);
  const fall = tween(frame, fallAt, fallAt + 18, 0, 1, EASE.expoIn);
  const traceOut = tween(frame, fallAt + 6, fallAt + 18, 0, 1, EASE.standard);
  if (frame < at || traceOut >= 1) return null;

  const padY = Math.round(fontSize * 0.55);
  const padX = Math.round(fontSize * 0.8);
  const radius = Math.round(fontSize * 0.55);
  const opacity = (ghost + (1 - ghost) * s) * form * (1 - fall);
  const textColor = interpolateColors(s, [0, 1], [DAY.textMuted, DAY.onBeacon]);

  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {/* the trace at home: where the old step sat, for as long as it is out of line */}
      {s > 0.001 ? (
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, background: DAY.trace, opacity: Math.min(1, s / 0.25) * (1 - traceOut) }} />
      ) : null}
      <div
        style={{
          position: "relative",
          transform: `translate(${s * SLIP_UNIT * 100}%, ${fall * 230 + (1 - form) * 10}px) rotate(${fall * 6}deg) scale(${1 - 0.05 * fall})`,
          transformOrigin: "30% 50%",
          opacity,
          filter: form < 1 ? `blur(${(1 - form) * 6}px)` : undefined,
        }}
      >
        {/* the slip's bloom: part of the one drifted element, not a second amber */}
        {s > 0.001 ? (
          <div
            style={{
              position: "absolute",
              left: "-18%",
              right: "-18%",
              top: "-110%",
              bottom: "-110%",
              borderRadius: "50%",
              background: `radial-gradient(closest-side, ${amber(0.3 * s)} 0%, ${amber(0.1 * s)} 55%, transparent 100%)`,
            }}
          />
        ) : null}
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            padding: `${padY}px ${padX}px`,
            borderRadius: radius,
            fontFamily: FONT.mono,
            fontSize,
            lineHeight: `${Math.round(fontSize * 1.3)}px`,
            letterSpacing: "-0.01em",
            whiteSpace: "pre",
            background: s > 0 ? interpolateColors(s, [0, 1], ["rgba(232, 238, 239, 0.55)", DAY.beacon]) : "rgba(232, 238, 239, 0.55)",
            boxShadow: s > 0 ? `0 0 0 2px rgba(199, 119, 0, ${0.35 * s}), 0 10px 28px ${amber(0.28 * s)}, 0 2px 6px ${ink(0.1 * s)}` : undefined,
          }}
        >
          {/* the dashed edge of a ghost, fading out as it is caught */}
          <div style={{ position: "absolute", inset: 0, borderRadius: radius, border: `2px dashed ${ink(0.32)}`, opacity: 1 - s }} />
          <span style={{ position: "relative", color: textColor }}>{text}</span>
        </div>
      </div>
    </div>
  );
};

/** The well's size for a text and font size (for placing it; Spline Sans Mono advances 0.6 em). */
export const ghostSize = (text: string, fontSize = 30) => ({
  w: Math.round(text.length * fontSize * 0.6 + 2 * Math.round(fontSize * 0.8)),
  h: Math.round(fontSize * 1.3 + 2 * Math.round(fontSize * 0.55)),
});
