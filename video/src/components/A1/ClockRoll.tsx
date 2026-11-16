import React, { useId } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE } from "../../lib/time";
import { FONT, NIGHT } from "../../v4/look";

/**
 * The huge 3 a.m. clock (A1 V02, again in A4 V24): `03:07` in Spline Sans Mono, each digit an odometer drum.
 *
 * - Roll in (`at` .. `land`): every drum rolls up through a few digits and lands on its value (cubic out), staggered
 *   left to right so the last drum lands on `land`. Use landFor() to put the landing QA sees (within 4 px) 0 to 4 frames
 *   before the spoken "3".
 * - Tick (`from` + `tick`): the drums count up from `from` ("03:06") to `text` ("03:07"); drums that match do not move.
 *   With both, the clock rolls in to `from` first, then ticks (A4: the same clock as A1, and the minute turns on "3").
 *
 * While a drum moves fast it is smeared along its axis (a vertical-only blur scaled by its speed), so the first frames
 * read as motion, not as wrong digits. Once landed nothing moves: the camera carries the motion.
 *
 * Geometry: each drum is a window one row tall (row = 1.22 em, so a landed digit has clear space above and below)
 * with soft top and bottom edges. The block is `size` px type; its box is the window height tall.
 */

const ROW = 1.22; // row pitch and window height, in em

/** How many rows each drum travels when it rolls in, left to right (the colon is skipped). */
export const TRAVEL = [4, 7, 5, 9];

/**
 * The drums land on a cubic ease-out: fast and smeared at first, decisive at the end (an expo-out tail looks settled
 * long before its last frame, which put the landing 11 frames ahead of its word). With cubic out, the distance left is
 * D (1 - t)^3, so a drum is within 4 px of rest at t4 = 1 - (4 / D)^(1/3).
 */
const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * The `land` frame that puts a drum of `rows` rows within 4 px of rest on `settle` (the "lands" frame QA measures),
 * for a roll starting at `at`, at type size `size`.
 */
export function landFor(at: number, settle: number, rows: number, size: number) {
  const D = Math.max(1, rows * ROW * size);
  const t4 = 1 - Math.cbrt(4 / D);
  return at + Math.max(1, Math.round((settle - at) / t4));
}

type Leg = { start: number; land: number; rows: number };

const DrumDigit: React.FC<{ digit: number; legs: Leg[]; size: number; color: string }> = ({ digit, legs, size, color }) => {
  const frame = useCurrentFrame();
  const id = "drum" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const row = ROW * size;
  const total = legs.reduce((n, l) => n + l.rows, 0);
  // the strip lists the digits counting up into the target: digit - total .. digit (mod 10)
  const seq = Array.from({ length: total + 1 }, (_, i) => (((digit - total + i) % 10) + 10) % 10);
  const travel = (f: number) => {
    let pos = 0;
    for (const l of legs) {
      if (l.rows <= 0) continue;
      pos += l.land <= l.start ? (f >= l.start ? l.rows : 0) : interpolate(f, [l.start, l.land], [0, l.rows], { ...clamp, easing: cubicOut });
    }
    return pos;
  };
  const pos = travel(frame);
  const speed = Math.abs(travel(frame + 0.5) - travel(frame - 0.5)) * row; // px per frame
  const sigma = Math.min(size * 0.16, speed * 0.32);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: "0.6em",
        height: row,
        overflow: "hidden",
        verticalAlign: "top",
        WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)",
        maskImage: "linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)",
      }}
    >
      {sigma > 0.25 ? (
        <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
          <filter id={id} x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`0 ${sigma.toFixed(2)}`} />
          </filter>
        </svg>
      ) : null}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          transform: `translateY(${(-pos * row).toFixed(2)}px)`,
          filter: sigma > 0.25 ? `url(#${id})` : undefined,
          color,
        }}
      >
        {seq.map((d, i) => (
          <span key={i} style={{ display: "block", height: row, lineHeight: `${row}px`, textAlign: "center" }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
};

const digitsOf = (t: string) => t.replace(":", "").split("").map(Number);
const up = (from: number, to: number) => (((to - from) % 10) + 10) % 10;

export const ClockRoll: React.FC<{
  /** "HH:MM" the clock ends on. */
  text?: string;
  /** Roll in: first frame (the drums are already moving fast on it) and the frame the LAST drum lands. */
  at?: number;
  land?: number;
  /** Tick: count up from this "HH:MM" to `text` over `tick` (A4: "03:06" to "03:07" on "3"). */
  from?: string;
  tick?: { at: number; land: number };
  /** Type size in px. */
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ text = "03:07", at, land, from, tick, size = 320, color = NIGHT.text, style }) => {
  const frame = useCurrentFrame();
  const target = digitsOf(text);
  const start = from ? digitsOf(from) : target;
  const rollIn = at !== undefined && land !== undefined;
  const span = rollIn ? Math.max(8, (land as number) - (at as number)) : 0;
  // roll-in landings: the drums finish at 45%, 62%, 80% and 100% of the span
  const lands = [0.45, 0.62, 0.8, 1].map((k) => (at ?? 0) + Math.round(span * k));
  const colonP = rollIn ? interpolate(frame, [at as number, (at as number) + Math.round(span * 0.45)], [0, 1], { ...clamp, easing: EASE.expoOut }) : 1;
  const row = ROW * size;
  let di = 0;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "flex-start",
        height: row,
        fontFamily: FONT.mono,
        fontWeight: 500,
        fontSize: size,
        letterSpacing: "0",
        fontVariantNumeric: "tabular-nums",
        color,
        ...style,
      }}
      aria-label={text}
    >
      {text.split("").map((ch, i) => {
        if (ch === ":") {
          return (
            <span
              key={i}
              style={{
                display: "inline-flex",
                justifyContent: "center",
                width: "0.42em",
                height: row,
                lineHeight: `${row}px`,
                transform: `translateY(${((1 - colonP) * 0.5 * row).toFixed(2)}px)`,
                opacity: interpolate(colonP, [0, 0.4], [0, 1], clamp),
              }}
            >
              :
            </span>
          );
        }
        const n = di++;
        const legs: Leg[] = [];
        if (rollIn) legs.push({ start: at as number, land: lands[Math.min(n, lands.length - 1)], rows: TRAVEL[n % TRAVEL.length] });
        if (from && tick) legs.push({ start: tick.at, land: tick.land, rows: up(start[n], target[n]) });
        return <DrumDigit key={i} digit={target[n]} legs={legs} size={size} color={color} />;
      })}
    </div>
  );
};
