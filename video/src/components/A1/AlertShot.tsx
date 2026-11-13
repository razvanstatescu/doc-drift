import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { FONT, NIGHT } from "../../brand/tokens";
import { clamp, EASE, SPRING, springAt, tween } from "../../lib/time";
import { setInProgress } from "../../motion/text";

/**
 * The 3 a.m. page (A1 V02, again in A4 V24): a large mono clock and a generic alert card of our own. Night surface, a
 * red SEV-2 pill in the Stale colour, the service, the error rate and when it fired, plus a small error-rate line.
 * Deliberately unbranded and not shaped like any paging or chat product (no left colour bar, no avatars, no buttons).
 *
 * The clock sets in at `clockAt`; the card drifts in at `cardAt` on a critically damped spring (about 20 frames), its
 * line draws on, and then everything holds perfectly still.
 */

const P = NIGHT;
export const CLOCK = { top: 196, size: 232 } as const;
export const CARD = { x: 400, y: 504, w: 1120, h: 372 } as const;

/** The pulse ring starts on the scene's beat grid (scenes start on bars, a beat is 15 frames). */
const PULSE_FROM = 30;

/** Error rate in %, one sample per minute up to 03:07 (illustrative shape of a spike to 14%). */
const SERIES = [0.3, 0.4, 0.3, 0.3, 0.5, 0.4, 0.3, 0.4, 0.6, 0.5, 1.4, 4.2, 9.1, 14];

const Spark: React.FC<{ at: number; w: number; h: number }> = ({ at, w, h }) => {
  const frame = useCurrentFrame();
  const p = tween(frame, at, at + 22, 0, 1, EASE.expoOut);
  const max = 14;
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * w, h - (v / max) * h] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const end = pts[pts.length - 1];
  // the live point breathes on every second beat once the line is drawn (no text moves; the score has the low pulse)
  const since = frame - PULSE_FROM;
  const cycleStart = frame - (((since % 30) + 30) % 30);
  // a ring only starts on a cycle that begins after the line is drawn, so the first one never pops in mid-way
  const ringK = since >= 0 && cycleStart >= at + 22 ? (frame - cycleStart) / 30 : 0;
  const ring = ringK > 0 ? 0.6 * (1 - ringK) : 0;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }} aria-hidden>
      <line x1={0} y1={h} x2={w} y2={h} stroke={P.line} strokeWidth={2} />
      <path d={d} fill="none" stroke={P.stale} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      {p > 0.97 ? <circle cx={end[0]} cy={end[1]} r={8} fill={P.stale} /> : null}
      {ring > 0 ? <circle cx={end[0]} cy={end[1]} r={8 + 22 * EASE.expoOut(ringK)} fill="none" stroke={P.stale} strokeWidth={2.5} opacity={ring} /> : null}
    </svg>
  );
};

export const AlertShot: React.FC<{ clockAt?: number; cardAt?: number }> = ({ clockAt = 0, cardAt = 15 }) => {
  const frame = useCurrentFrame();
  const clockP = setInProgress(frame, clockAt, 15);
  const land = springAt(frame, cardAt, SPRING.soft);
  const cardOpacity = interpolate(frame, [cardAt, cardAt + 8], [0, 1], clamp);
  return (
    <AbsoluteFill>
      {/* the clock: rises out of its own mask, then holds */}
      <div style={{ position: "absolute", left: 0, right: 0, top: CLOCK.top, display: "flex", justifyContent: "center" }}>
        <div style={{ overflow: "hidden", padding: "0.04em 0.06em 0.08em", margin: "-0.04em -0.06em -0.08em" }}>
          <div
            style={{
              fontFamily: FONT.mono,
              fontWeight: 500,
              fontSize: CLOCK.size,
              lineHeight: `${CLOCK.size}px`,
              letterSpacing: "-0.04em",
              color: P.text,
              fontVariantNumeric: "tabular-nums",
              transform: clockP < 1 ? `translateY(${(1 - clockP) * 105}%)` : undefined,
              opacity: interpolate(clockP, [0, 0.45], [0, 1], clamp),
            }}
          >
            03:07
          </div>
        </div>
      </div>
      {/* the card */}
      {frame >= cardAt ? (
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            top: CARD.y,
            width: CARD.w,
            height: CARD.h,
            boxSizing: "border-box",
            padding: "52px 64px",
            borderRadius: 24,
            background: P.surface,
            boxShadow: `0 0 0 1px ${P.line}, 0 2px 0 #FFFFFF0F inset, 0 24px 64px #00000066`,
            opacity: cardOpacity,
            transform: `translateY(${(1 - land) * 56}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                height: 60,
                padding: "0 22px 0 16px",
                borderRadius: 14,
                background: P.staleTint,
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
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 34 }}>
            <div>
              <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 104, lineHeight: "108px", letterSpacing: "-0.03em", color: P.text }}>
                Error rate 14%
              </div>
              <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 40, lineHeight: "52px", color: P.textMuted, marginTop: 14 }}>Triggered 03:07</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Spark at={cardAt + 10} w={300} h={150} />
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
