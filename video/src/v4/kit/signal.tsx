import React, { useMemo } from "react";
import { getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import { useCurrentFrame } from "remotion";
import { EASE, H, W, tween } from "../../lib/time";
import { BRAND, DAY, NIGHT, current } from "../look";

/**
 * T7, the signal handoff (R3 section 4): a change or a status travels along a path to the next surface. The line draws
 * on (`evolvePath`-style dash) while a pulse rides its head; `pointOnPath()` gives the pulse's film-px position, so
 * the camera (or a ChangeRecord chip) can follow it.
 *
 *   const d = "M 300 540 C 700 540, 900 300, 1500 300";
 *   const at = sc.cue("V13"), dur = 24;
 *   <SignalLine d={d} at={at} dur={dur} pulse trail />
 *   const [px, py] = pointOnPath(d, progressOf(frame, at, dur));   // aim a camera key or dock a chip
 */
export type SignalLineProps = {
  /** SVG path in film px (stage coordinates). */
  d: string;
  at: number;
  dur: number;
  /** Draw the travelling pulse (a white node with a soft ring) at the head. Default true. */
  pulse?: boolean;
  /** Leave the drawn line behind (default true); false draws only a short comet trail behind the pulse. */
  trail?: boolean;
  /** Line colour (default Fathom on Day, Night text on Night). */
  color?: string;
  /** Stroke width (default 2.5, R2: a changed anchor's curve). */
  width?: number;
  /** Dashed (a watched, unchanged connector: 7/7 in `current`). */
  dashed?: boolean;
  /** Easing of the travel (default expo in-out: leaves and lands softly). */
  ease?: (t: number) => number;
  /** Hide the pulse after it lands (default: it stays on the end node for 6 frames, then goes). */
  holdPulse?: number;
  world?: "day" | "night";
};

/** Travel progress 0..1 of a signal at a frame. */
export const progressOf = (frame: number, at: number, dur: number, ease: (t: number) => number = EASE.expoInOut) =>
  tween(frame, at, at + dur, 0, 1, ease);

/** The film-px point at progress t (0..1) along a path. */
export function pointOnPath(d: string, t: number): [number, number] {
  const len = getLength(d);
  const p = getPointAtLength(d, Math.max(0, Math.min(1, t)) * len);
  return p ? [p.x, p.y] : [0, 0];
}

/** The direction (unit vector) of the path at progress t. */
export function tangentOnPath(d: string, t: number): [number, number] {
  const len = getLength(d);
  const v = getTangentAtLength(d, Math.max(0, Math.min(1, t)) * len);
  return v ? [v.x, v.y] : [1, 0];
}

export const SignalLine: React.FC<SignalLineProps> = ({
  d,
  at,
  dur,
  pulse = true,
  trail = true,
  color,
  width = 2.5,
  dashed = false,
  ease = EASE.expoInOut,
  holdPulse = 6,
  world = "day",
}) => {
  const frame = useCurrentFrame();
  const len = useMemo(() => getLength(d), [d]);
  if (frame < at) return null;
  const t = progressOf(frame, at, dur, ease);
  const head = t * len;
  const stroke = color ?? (dashed ? current(1) : world === "night" ? NIGHT.text : BRAND.fathom);
  const tail = trail ? 0 : Math.max(0, head - 220);
  const [px, py] = pointOnPath(d, t);
  const showPulse = pulse && frame < at + dur + holdPulse;
  const pulseIn = tween(frame, at, at + 4, 0, 1, EASE.expoOut);
  const pulseOut = 1 - tween(frame, at + dur + holdPulse - 4, at + dur + holdPulse, 0, 1, EASE.linear);
  // dash: a visible segment from `tail` to `head`; for a dashed line, a 7/7 pattern clipped to the drawn length
  const drawDash = dashed ? undefined : `0 ${tail} ${Math.max(0, head - tail)} ${len + 10}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      {dashed ? (
        <>
          <defs>
            <mask id={`sig-${Math.round(len)}-${at}`} maskUnits="userSpaceOnUse">
              <path d={d} stroke="#fff" strokeWidth={width + 6} fill="none" strokeDasharray={`${head} ${len + 10}`} />
            </mask>
          </defs>
          <path d={d} stroke={stroke} strokeWidth={width} fill="none" strokeDasharray="7 7" strokeLinecap="round" mask={`url(#sig-${Math.round(len)}-${at})`} />
        </>
      ) : (
        <path d={d} stroke={stroke} strokeWidth={width} fill="none" strokeLinecap="round" strokeDasharray={drawDash} />
      )}
      {showPulse ? (
        <g transform={`translate(${px} ${py})`} opacity={pulseIn * pulseOut}>
          <circle r={18} fill={world === "night" ? "rgba(242,246,247,0.10)" : "rgba(7,38,48,0.07)"} />
          <circle r={7} fill={world === "night" ? NIGHT.ground : DAY.surface} stroke={stroke} strokeWidth={2.5} />
        </g>
      ) : null}
    </svg>
  );
};
