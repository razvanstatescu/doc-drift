import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../brand/icons";
import { DAY, FONT } from "../../brand/tokens";
import { clamp, EASE } from "../../lib/time";
import { setInProgress } from "../../motion/text";

/**
 * A2's anchor pieces, sized for the 1.35x diagram.
 *
 * AnchorCard: one anchor as a two-line card, the way the product lists anchors ("scripts/rollback.sh in payments-api"):
 * the path in Spline Sans Mono 44, the repository (or "Jira issue") under it in 34. With `swap`, the path rolls to its
 * new value at `swap.at` (V08: the script is renamed) and the card widens by the extra characters, in `ch` units
 * (monospace), so nothing needs measuring. LinePulse runs a short dark segment along a straight anchor line (the change
 * travelling to the page). AgentCard is a card for an agent that reads the page (V09).
 */

const PATH = 44;
const SUB = 34;
export const ANCHOR_H = 22 + 54 + 6 + 40 + 22; // 144

export const AnchorCard: React.FC<{
  path: string;
  sub: { text: string; mono?: boolean; icon?: IconName };
  /** The card lands here (as its line arrives). */
  at: number;
  swap?: { to: string; at: number };
  style?: React.CSSProperties;
}> = ({ path, sub, at, swap, style }) => {
  const frame = useCurrentFrame();
  const land = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  if (land <= 0) return null;
  const sAt = swap?.at ?? Infinity;
  const out = swap ? interpolate(frame, [sAt, sAt + 5], [0, 1], { ...clamp, easing: EASE.expoIn }) : 0;
  const inn = swap ? interpolate(frame, [sAt + 5, sAt + 15], [0, 1], { ...clamp, easing: EASE.expoOut }) : 0;
  const w = swap ? interpolate(frame, [sAt + 2, sAt + 12], [path.length, swap.to.length], { ...clamp, easing: EASE.expoOut }) : path.length;
  const lineStyle: React.CSSProperties = { position: "absolute", left: 0, top: 0, whiteSpace: "pre" };
  return (
    <div
      style={{
        boxSizing: "border-box",
        padding: "22px 30px",
        borderRadius: 20,
        background: DAY.surface,
        boxShadow: `0 0 0 2px ${DAY.line}`,
        opacity: land,
        transform: `translateX(${(1 - land) * -20}px)`,
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: `${w}ch`,
          height: 54,
          overflow: "hidden",
          fontFamily: FONT.mono,
          fontWeight: 400,
          fontSize: PATH,
          lineHeight: "54px",
          letterSpacing: "-0.01em",
          color: DAY.text,
        }}
      >
        {out < 1 ? <span style={{ ...lineStyle, opacity: 1 - out, transform: `translateY(${-out * 105}%)` }}>{path}</span> : null}
        {swap && inn > 0 ? <span style={{ ...lineStyle, opacity: inn, transform: `translateY(${(1 - inn) * 105}%)` }}>{swap.to}</span> : null}
      </div>
      <div
        style={{
          marginTop: 6,
          height: 40,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: sub.mono ? FONT.mono : FONT.sans,
          fontWeight: sub.mono ? 400 : 500,
          fontSize: SUB,
          lineHeight: "40px",
          letterSpacing: sub.mono ? "-0.01em" : undefined,
          color: DAY.textMuted,
          whiteSpace: "pre",
        }}
      >
        {sub.icon ? <Icon name={sub.icon} size={34} color={DAY.textMuted} stroke={1.9} /> : null}
        {sub.text}
      </div>
    </div>
  );
};

/** A dark segment that runs along a straight horizontal line from x1 to x2 at y, over [at, at + dur]. */
export const LinePulse: React.FC<{ x1: number; x2: number; y: number; at: number; dur?: number; length?: number }> = ({ x1, x2, y, at, dur = 16, length = 84 }) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + dur + 2) return null;
  const t = interpolate(frame, [at, at + dur], [0, 1], { ...clamp, easing: EASE.cubicInOut });
  const dir = Math.sign(x2 - x1);
  const head = x1 + (x2 - x1) * t;
  const tail = head - dir * length * Math.min(1, t * 4) * (1 - Math.max(0, t - 0.85) / 0.15);
  const fade = interpolate(frame, [at + dur, at + dur + 2], [1, 0], clamp);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}>
      <line x1={tail} y1={y} x2={head} y2={y} stroke={DAY.text} strokeWidth={8} strokeLinecap="round" opacity={fade} />
      <circle cx={head} cy={y} r={9} fill={DAY.text} opacity={fade} />
    </svg>
  );
};

export const AGENT_H = 30 + 54 + 14 + 54 + 30; // 182

export const AgentCard: React.FC<{
  icon: IconName;
  label: string;
  /** The card lands here. */
  at: number;
  /** The answer `status: possibly_stale` sets in here. */
  answerAt: number;
  style?: React.CSSProperties;
}> = ({ icon, label, at, answerAt, style }) => {
  const frame = useCurrentFrame();
  const land = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  const ans = setInProgress(frame, answerAt, 12);
  if (land <= 0) return null;
  return (
    <div
      style={{
        boxSizing: "border-box",
        padding: "30px 36px",
        borderRadius: 24,
        background: DAY.surface,
        boxShadow: `0 0 0 2px ${DAY.line}`,
        opacity: land,
        transform: `translateX(${(1 - land) * -24}px)`,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, height: 54 }}>
        <Icon name={icon} size={46} color={DAY.textMuted} stroke={1.9} />
        <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 46, lineHeight: "54px", letterSpacing: "-0.01em", color: DAY.text, whiteSpace: "nowrap" }}>
          {label}
        </span>
      </div>
      <div style={{ marginTop: 14, height: 54, overflow: "hidden" }}>
        <div
          style={{
            fontFamily: FONT.mono,
            fontWeight: 500,
            fontSize: 44,
            lineHeight: "54px",
            letterSpacing: "-0.01em",
            whiteSpace: "pre",
            opacity: interpolate(ans, [0, 0.45], [0, 1], clamp),
            transform: `translateY(${(1 - ans) * 105}%)`,
          }}
        >
          <span style={{ color: DAY.textMuted }}>status: </span>
          <span style={{ color: DAY.text }}>possibly_stale</span>
        </div>
      </div>
    </div>
  );
};
