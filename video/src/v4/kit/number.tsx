import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { tween } from "../../lib/time";
import { DAY, FONT, NIGHT } from "../look";
import { DirectionalBlur } from "./blur";
import { LAND } from "./type";

/**
 * Rolling tabular digits (R2 section 5 "Number": 300 / 300, unit 0.4 of it in text-muted, -5% tracking), ported
 * from Pot's MoneyRoll "tick" mode at 30 fps: the value steps through up to 20 values with decaying steps (fast
 * first, slow landing), each changed digit slides in from a small nudge with a light smear, digits stay readable on
 * every frame, never overshoot and land exactly on `value` at `at + dur`. Columns that appear (9 to 10) grow.
 *
 *   <NumberRoll value={19} at={sc.wordAt("V13", "nineteen")} dur={36} unit="s" />          // "19 s"
 *   <NumberRoll value={18} at={at} dur={30} unit="of 24" size={200} />                      // "18 of 24"
 */
export type NumberRollProps = {
  value: number;
  at: number;
  dur: number;
  from?: number;
  decimals?: number;
  /** Text after the number, in the unit style, separated by a thin gap ("s", "of 24"). */
  unit?: string;
  /** Text before the number (number style). */
  prefix?: string;
  /** Number size in px (default 300). */
  size?: number;
  /** Unit size as a share of `size` (default 0.4). */
  unitScale?: number;
  color?: string;
  unitColor?: string;
  weight?: number;
  world?: "day" | "night";
  /** Distinct values on the way (default up to 20). */
  ticks?: number;
  /** Easing of the steps (default quint out: decaying). */
  ease?: (t: number) => number;
  style?: React.CSSProperties;
};

const PUNCH = Easing.bezier(0.22, 1, 0.36, 1);
const NUDGE = 0.16; // em

const fmt = (v: number, decimals: number) => Math.abs(v).toFixed(decimals);

export const NumberRoll: React.FC<NumberRollProps> = ({
  value,
  at,
  dur,
  from = 0,
  decimals = 0,
  unit,
  prefix,
  size = 300,
  unitScale = 0.4,
  color,
  unitColor,
  weight = 600,
  world = "day",
  ticks,
  ease = PUNCH,
  style,
}) => {
  const frame = useCurrentFrame();
  const lt = frame - at;
  const unitQ = Math.pow(10, decimals);
  const span = Math.round(Math.abs(value - from) * unitQ);
  const N = Math.max(1, Math.min(ticks ?? 20, span));
  const valueAt = (k: number) => (k >= N ? value : k <= 0 ? from : Math.round((from + (value - from) * ease(k / N)) * unitQ) / unitQ);
  const timeAt = (k: number) => Math.round((k * dur) / N);
  let kk = 0;
  if (lt >= 0) {
    while (kk < N && timeAt(kk + 1) <= lt) kk++;
  }
  const started = lt >= 0 && kk > 0;
  const vCur = valueAt(kk);
  const vPrev = kk > 0 ? valueAt(kk - 1) : vCur;
  const interval = Math.max(1, timeAt(kk + 1) - timeAt(kk));
  const slide = Math.max(1, Math.min(2, interval));
  const q = started ? tween(lt, timeAt(kk), timeAt(kk) + slide, 0, 1, LAND) : 1;
  const qv = started ? tween(lt + 0.5, timeAt(kk), timeAt(kk) + slide, 0, 1, LAND) - tween(lt - 0.5, timeAt(kk), timeAt(kk) + slide, 0, 1, LAND) : 0;
  const dir = value >= from ? 1 : -1;

  const A = fmt(vPrev, decimals);
  const B = fmt(vCur, decimals);
  const [ai, af = ""] = A.split(".");
  const [bi, bf = ""] = B.split(".");
  const n = Math.max(ai.length, bi.length);
  const pa = ai.padStart(n, " ");
  const pb = bi.padStart(n, " ");
  const cols: { a: string; b: string }[] = [];
  for (let i = 0; i < n; i++) cols.push({ a: pa[i], b: pb[i] });
  const fcols: { a: string; b: string }[] = [];
  for (let i = 0; i < decimals; i++) fcols.push({ a: af[i] ?? "0", b: bf[i] ?? "0" });

  const ink = color ?? (world === "night" ? NIGHT.text : DAY.text);
  const cell = (c: { a: string; b: string }, key: string) => {
    const appear = c.a === " " && c.b !== " ";
    const vanish = c.a !== " " && c.b === " ";
    if (c.a === " " && c.b === " ") return null;
    const moving = c.a !== c.b && !vanish;
    const y = moving ? dir * NUDGE * (1 - q) : 0;
    const sigma = moving ? Math.min(size * 0.03, Math.abs(NUDGE * qv) * size * 0.5) : 0;
    const wq = appear ? q : vanish ? 1 - q : 1;
    return (
      <span
        key={key}
        style={{
          position: "relative",
          display: "inline-block",
          width: wq < 1 ? `calc(${wq} * (1ch - 0.05em))` : undefined,
          overflow: wq < 1 ? "hidden" : undefined,
          verticalAlign: "bottom",
        }}
      >
        <DirectionalBlur inline y={sigma} region={0.4} style={{ transform: y ? `translateY(${y}em)` : undefined }}>
          {vanish ? c.a : c.b}
        </DirectionalBlur>
      </span>
    );
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily: FONT.sans,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.05em",
        color: ink,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
      aria-label={`${prefix ?? ""}${fmt(value, decimals)}${unit ? ` ${unit}` : ""}`}
    >
      {prefix ? <span>{prefix}</span> : null}
      {value < 0 || (from < 0 && lt < 0) ? <span>{"−"}</span> : null}
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        {cols.map((c, i) => cell(c, `i${i}`))}
        {decimals > 0 ? <span>.</span> : null}
        {fcols.map((c, i) => cell(c, `f${i}`))}
      </span>
      {unit ? (
        <span
          style={{
            fontSize: size * unitScale,
            letterSpacing: "-0.01em",
            color: unitColor ?? (world === "night" ? NIGHT.textMuted : DAY.textMuted),
            marginLeft: size * 0.06,
            fontWeight: 500,
          }}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );
};
