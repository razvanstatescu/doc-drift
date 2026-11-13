import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE } from "../lib/time";

/** The value of a count from `from` to `to` that runs over [at, at + dur] (local frames). */
export function countAt(frame: number, at: number, dur: number, from: number, to: number, ease: (t: number) => number = EASE.expoOut) {
  return interpolate(frame, [at, at + Math.max(1, dur)], [from, to], { ...clamp, easing: ease });
}

/** Format with a fixed number of decimals and thin grouping (1,240). */
export const formatNumber = (v: number, decimals = 0) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * A number that counts to its value and then holds. Tabular figures so the width never wobbles. Style it with
 * typeStyle(); it renders a bare span.
 */
export const Counter: React.FC<{
  to: number;
  from?: number;
  at?: number;
  dur?: number;
  decimals?: number;
  ease?: (t: number) => number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ to, from = 0, at = 0, dur = 24, decimals = 0, ease = EASE.expoOut, prefix = "", suffix = "", style }) => {
  const frame = useCurrentFrame();
  const raw = countAt(frame, at, dur, from, to, ease);
  const q = Math.pow(10, decimals);
  const v = Math.round(raw * q) / q;
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "pre", ...style }}>
      {prefix}
      {formatNumber(v, decimals)}
      {suffix}
    </span>
  );
};
