import React from "react";
import { getLength, getPointAtLength } from "@remotion/paths";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { EASE, tween } from "../../lib/time";
import { FONT } from "../look";
import { textWidth } from "./metrics";
import { bloomBg, elev, palette, withGlow } from "./twinLook";
import type { World } from "./types";

/**
 * ChangeRecord: the relay's change record as a small card, "PR #482 · 2 files" (the merge icon, the PR in mono, the
 * count in sans). It rides a SignalLine: give it the same path, start and duration (`along`) and it sits on the pulse
 * (same expo in-out travel as the kit's progressOf). `lit` makes it the shot's amber (R3 V13: the record that carries
 * the -v2 rename).
 */

const R = { size: 15, padX: 12, h: 38, icon: 18, gap: 8, radius: 11 } as const;

export type ChangeRecordProps = {
  label: string;
  /** Frame it lifts in. */
  at: number;
  /** Centre of the card (film px), when it is not riding a path. Without x, y and along, it sits in the flow (inline). */
  x?: number;
  y?: number;
  /** Ride a path: its centre follows the point at progress (expo in-out from `at` over `dur`, like SignalLine). */
  along?: { d: string; at: number; dur: number; ease?: (t: number) => number };
  /** The shot's amber: amber edge, glow and bloom. 0..1 or boolean. */
  lit?: number | boolean;
  world?: World;
  /** UI px to film px (default 1.8: 27 px text). */
  k?: number;
  /** Leave by dropping into its target at `out` (scale down and fade over 6 frames). */
  out?: number;
  style?: React.CSSProperties;
};

/** Film-px size of the record. */
export function changeRecordSize(label: string, k = 1.8) {
  const [head, ...rest] = label.split(" · ");
  const tail = rest.length ? ` · ${rest.join(" · ")}` : "";
  const w = R.padX * 2 + R.icon + R.gap + textWidth(head, { size: R.size, mono: true, tracking: -0.01 }) + textWidth(tail, { size: R.size, weight: 500 });
  return { w: w * k, h: R.h * k };
}

export const ChangeRecord: React.FC<ChangeRecordProps> = ({ label, at, x, y, along, lit = false, world = "day", k = 1.8, out, style }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const p = palette(world);
  const t = tween(frame, at, at + 12, 0, 1, EASE.expoOut);
  const appear = tween(frame, at, at + 4, 0, 1, EASE.linear);
  const gone = out !== undefined ? tween(frame, out, out + 6, 0, 1, EASE.expoIn) : 0;
  if (gone >= 1) return null;
  const { w, h } = changeRecordSize(label, k);
  const inFlow = x === undefined && y === undefined && !along;
  let cx = x ?? 960;
  let cy = y ?? 540;
  if (along) {
    const len = getLength(along.d);
    const pt = tween(frame, along.at, along.at + along.dur, 0, 1, along.ease ?? EASE.expoInOut);
    const q = getPointAtLength(along.d, pt * len) ?? { x: cx, y: cy };
    cx = q.x;
    cy = q.y;
  }
  const a = typeof lit === "boolean" ? (lit ? 1 : 0) : lit;
  const [head, ...rest] = label.split(" · ");
  const tail = rest.length ? ` · ${rest.join(" · ")}` : "";
  return (
    <div style={inFlow ? { position: "relative", display: "inline-block", width: w, height: h, verticalAlign: "middle", ...style } : { position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, ...style }}>
      {a > 0.001 ? <div style={{ position: "absolute", left: -w * 0.35, top: -h * 1.2, width: w * 1.7, height: h * 3.4, borderRadius: "50%", background: bloomBg(a * appear) }} /> : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          gap: R.gap * k,
          padding: `0 ${R.padX * k}px`,
          boxSizing: "border-box",
          borderRadius: R.radius * k,
          background: p.surface,
          boxShadow: withGlow(a > 0.001 ? `0 0 0 ${2 * k}px rgba(255, 178, 36, ${0.95 * a}), ${elev(1 + 2 * t, 1, world)}` : elev(1 + 2 * t, 1, world), world, a, k),
          opacity: appear * (1 - gone),
          transform: `translateY(${(1 - t) * 10}px) scale(${1 - 0.4 * gone})`,
          whiteSpace: "nowrap",
        }}
      >
        <Icon name="merge" size={R.icon * k} color={p.textMuted} />
        <span style={{ fontFamily: FONT.mono, fontSize: R.size * k, letterSpacing: "-0.01em", color: p.text }}>{head}</span>
        {tail ? <span style={{ marginLeft: -R.gap * k, fontFamily: FONT.sans, fontWeight: 500, fontSize: R.size * k, color: p.textMuted, whiteSpace: "pre" }}>{tail}</span> : null}
      </div>
    </div>
  );
};
