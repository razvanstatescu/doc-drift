import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../brand/icons";
import { clamp, EASE } from "../../lib/time";
import { current, DAY, ELEV, FONT, type Rect } from "../../v4/look";

/**
 * A station on the change record's path (architecture, not UI): "Bitbucket relay" (the relay app that reads a merged
 * PR's diff and signs a change record) and "Doc Drift matcher" (the core app's deterministic matcher). A white card on
 * the signal line; when the record passes through, it lifts one level and a Current ring opens (never amber: the
 * record carries the shot's amber).
 */
export const NODE_W = 430;
export const NODE_H = 124;

/** A station stands this far above the track; a stem joins it to the track where the record passes. */
export const NODE_RISE = 140;

/** The card's rect and the point on the track under it, for a station over the track point (cx, lineY). */
export const nodeGeom = (cx: number, lineY: number) => {
  const cy = lineY - NODE_RISE;
  const rect: Rect = { x: cx - NODE_W / 2, y: cy - NODE_H / 2, w: NODE_W, h: NODE_H };
  return { rect, tap: [cx, lineY] as [number, number] };
};

export const PipelineNode: React.FC<{
  /** The track point under the station. */
  cx: number;
  lineY: number;
  label: string;
  icon: IconName;
  /** The frame the record passes through (the pulse peaks here). */
  pulseAt?: number;
  /** Arrives by lifting at this frame (12 frames, expo out). */
  inAt?: number;
  /** Leaves by moving: drops away from this frame (12 frames, expo in). */
  outAt?: number;
}> = ({ cx, lineY, label, icon, pulseAt, inAt, outAt }) => {
  const frame = useCurrentFrame();
  const { rect } = nodeGeom(cx, lineY);
  if (inAt !== undefined && frame < inAt) return null;
  const gone = outAt === undefined ? 0 : interpolate(frame, [outAt, outAt + 12], [0, 1], { ...clamp, easing: EASE.expoIn });
  if (gone >= 1) return null;
  const arrive = inAt === undefined ? 1 : interpolate(frame, [inAt, inAt + 13], [0, 1], { ...clamp, easing: EASE.expoOut });
  const since = pulseAt === undefined ? 99 : frame - pulseAt;
  const pulse = since >= -4 && since < 20 ? interpolate(since, [-4, 0, 20], [0, 1, 0], { ...clamp, easing: EASE.quintOut }) : 0;
  const ring = since >= 0 && since < 22 ? interpolate(since, [0, 22], [0, 1], { ...clamp, easing: EASE.expoOut }) : -1;
  const stemTop = rect.y + rect.h;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transform: gone > 0 ? `translateY(${gone * 420}px)` : undefined }}>
    <div
      style={{
        position: "absolute",
        left: cx - 1.5,
        top: stemTop,
        width: 3,
        height: lineY - stemTop,
        borderRadius: 2,
        background: `linear-gradient(180deg, ${DAY.lineStrong} 0%, ${DAY.text} 100%)`,
        opacity: arrive * (0.35 + 0.65 * pulse),
        transformOrigin: "50% 100%",
        transform: `scaleY(${arrive})`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: cx - 9,
        top: lineY - 9,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: DAY.surface,
        boxShadow: `0 0 0 3px ${DAY.text}, 0 0 0 ${3 + 10 * pulse}px ${current(0.25 * pulse)}`,
        opacity: arrive,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        transform: `translateY(${(1 - arrive) * 26 - pulse * 6}px)`,
      }}
    >
      {ring >= 0 ? (
        <div
          style={{
            position: "absolute",
            inset: -18 * ring,
            borderRadius: 34 + 18 * ring,
            boxShadow: `0 0 0 ${2.5}px ${current(0.5 * (1 - ring))}`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 30,
          background: DAY.surface,
          boxShadow: pulse > 0.4 ? ELEV[3] : arrive < 0.6 ? ELEV[1] : ELEV[2],
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 34px 0 26px",
          boxSizing: "border-box",
          fontFamily: FONT.sans,
          color: DAY.text,
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 64,
            height: 64,
            borderRadius: 20,
            background: pulse > 0 ? `color-mix(in srgb, ${DAY.surfaceSunk} ${100 - pulse * 60}%, ${DAY.line})` : DAY.surfaceSunk,
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={34} color={DAY.text} />
        </span>
        <span style={{ fontSize: 32, lineHeight: "38px", fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{label}</span>
      </div>
    </div>
    </div>
  );
};
