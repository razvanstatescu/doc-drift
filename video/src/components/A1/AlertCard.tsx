import React, { useId } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { clamp, EASE, tween } from "../../lib/time";
import { FONT, NIGHT } from "../../v4/look";
import { deep, elevNight, nightCard } from "./night";

/**
 * The 3 a.m. alert (A1 V02, again in A4 V24): a generic alert card of our own on the Night ground. A red SEV-2 pill in
 * the Stale colour, "payments-api", "Error rate 14%" and "Triggered 03:07", with the error spike drawn beside it.
 * Deliberately unbranded and not shaped like any paging or chat product (no left colour bar, no avatars, no buttons).
 *
 * Motion (M3: arrive by lifting): from `at` the card rises from elevation 1 to 3 over `liftDur` frames (expo out,
 * shadow and contact shadow growing). The error rate rolls from 0.4% to 14% from `rateAt` and the spike draws with it;
 * after that, the live point breathes every two beats (a ring, never a flash). `settled` renders the card already
 * lifted and rolled (A4, which opens composed).
 */

/** Error rate in %, one sample per minute up to 03:07 (illustrative shape of a spike to 14%). */
const SERIES = [0.3, 0.4, 0.3, 0.3, 0.5, 0.4, 0.3, 0.4, 0.6, 0.5, 1.4, 4.2, 9.1, 14];

export const ALERT = { w: 1180, h: 372 } as const;

const P = NIGHT;

const Spark: React.FC<{ p: number; w: number; h: number; pulseFrom: number }> = ({ p, w, h, pulseFrom }) => {
  const frame = useCurrentFrame();
  const uid = "spark" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const max = 14;
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * w, h - (v / max) * h] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  const end = pts[pts.length - 1];
  // the live point breathes on every second beat once the line is drawn
  const since = frame - pulseFrom;
  const ringK = since >= 0 && p >= 0.999 ? (since % 30) / 30 : 0;
  const ring = ringK > 0 ? 0.55 * (1 - ringK) : 0;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.stale} stopOpacity={0.22} />
          <stop offset="1" stopColor={P.stale} stopOpacity={0} />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <rect x={0} y={-20} width={w * p} height={h + 40} />
        </clipPath>
      </defs>
      <line x1={0} y1={h} x2={w} y2={h} stroke={P.line} strokeWidth={2} />
      <path d={area} fill={`url(#${uid}-fill)`} clipPath={`url(#${uid}-clip)`} />
      <path d={d} fill="none" stroke={P.stale} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      {p > 0.97 ? <circle cx={end[0]} cy={end[1]} r={9} fill={P.stale} /> : null}
      {ring > 0 ? <circle cx={end[0]} cy={end[1]} r={9 + 24 * EASE.expoOut(ringK)} fill="none" stroke={P.stale} strokeWidth={2.5} opacity={ring} /> : null}
    </svg>
  );
};

/** "14%" rolling up from 0.4: whole-number steps once past 1, so it reads as a live counter landing. */
const rateText = (v: number) => (v < 1 ? v.toFixed(1) : String(Math.round(v)));

export const AlertCard: React.FC<{
  x: number;
  y: number;
  /** Lift start (local frame). */
  at: number;
  liftDur?: number;
  /** The error rate starts rolling here (and the spike draws). */
  rateAt: number;
  rateDur?: number;
  /** Render as already lifted and rolled. */
  settled?: boolean;
}> = ({ x, y, at, liftDur = 14, rateAt, rateDur = 16, settled = false }) => {
  const frame = useCurrentFrame();
  const lift = settled ? 1 : tween(frame, at, at + liftDur, 0, 1, EASE.expoOut);
  if (!settled && frame < at) return null;
  const level = 1 + 2 * lift;
  const rateP = settled ? 1 : tween(frame, rateAt, rateAt + rateDur, 0, 1, EASE.expoOut);
  const rate = 0.4 + (14 - 0.4) * rateP;
  const sparkP = settled ? 1 : tween(frame, rateAt - 4, rateAt + rateDur + 4, 0, 1, EASE.quintOut);
  // the card comes up from the ground: 46 px lower, 3% smaller, its first frames soft (M3)
  const ty = (1 - lift) * 46;
  const sc = 0.97 + 0.03 * lift;
  const op = settled ? 1 : interpolate(frame, [at, at + 3], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: ALERT.w, height: ALERT.h }}>
      {/* contact shadow on the ground: wider and softer as the card rises */}
      <div
        style={{
          position: "absolute",
          left: ALERT.w * (0.12 - 0.04 * lift),
          right: ALERT.w * (0.12 - 0.04 * lift),
          top: ALERT.h - 20 + 26 * lift,
          height: 60 + 50 * lift,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${deep(0.5 - 0.12 * lift)} 0%, ${deep(0.2)} 50%, transparent 100%)`,
          filter: `blur(${8 + 10 * lift}px)`,
          opacity: op,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          padding: "50px 64px 0",
          borderRadius: 38,
          background: nightCard(),
          boxShadow: elevNight(level),
          transform: `translateY(${ty.toFixed(2)}px) scale(${sc.toFixed(4)})`,
          opacity: op,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              height: 62,
              padding: "0 24px 0 18px",
              borderRadius: 16,
              background: P.staleTint,
              boxShadow: `inset 0 0 0 1.5px rgba(255, 122, 102, 0.28)`,
              color: P.stale,
              fontFamily: FONT.sans,
              fontWeight: 600,
              fontSize: 34,
              lineHeight: 1,
              boxSizing: "border-box",
            }}
          >
            <Icon name="alert" size={34} color={P.stale} stroke={2} />
            SEV-2
          </div>
          <span style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 44, letterSpacing: "-0.01em", color: P.text }}>payments-api</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 36 }}>
          <div>
            <div
              style={{
                fontFamily: FONT.sans,
                fontWeight: 600,
                fontSize: 96,
                lineHeight: "102px",
                letterSpacing: "-0.03em",
                color: P.text,
                whiteSpace: "nowrap",
              }}
            >
              Error rate{" "}
              <span style={{ display: "inline-block", minWidth: "1.9em", fontVariantNumeric: "tabular-nums" }}>{`${rateText(rate)}%`}</span>
            </div>
            <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 38, lineHeight: "50px", color: P.textMuted, marginTop: 12 }}>Triggered 03:07</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Spark p={sparkP} w={310} h={156} pulseFrom={rateAt + rateDur + 15} />
          </div>
        </div>
      </div>
    </div>
  );
};
