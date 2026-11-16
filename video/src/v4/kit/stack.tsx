import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, H, W, tween } from "../../lib/time";
import { elevAt, type Rect } from "../look";

/**
 * T10 and the lifted pieces: ExplodedStack (a panel exploded into its layers in 3D), Breakout (a row lifts out of its
 * panel to elevation 4) and KineticDock (a token flies from one place to another).
 *
 * 3D GOTCHA (MDN transform-style): opacity < 1, filter, clip-path, mask, mix-blend-mode, isolation and any overflow
 * other than visible flatten preserve-3d. Keep them on LEAF elements (inside a layer's own node), never on the stack,
 * its layers, or anything between a Camera3D world and the stack.
 */

export type StackLayer = {
  key: string;
  /** Depth of the layer when fully exploded, px toward the lens (0 = the base plane). */
  z: number;
  node: React.ReactNode;
};

export type ExplodedStackProps = {
  /** 0 = flat (the layers coincide), 1 = fully exploded. */
  explode: number;
  /** Degrees (rotateY). Up to 15 for an exploded stack (M2). */
  yaw: number;
  /** Degrees (rotateX). */
  pitch: number;
  layers: StackLayer[];
  /** Perspective px (default 1350, R3: the exploded panel). */
  perspective?: number;
  /** Size of the stack's plane (default the full stage). Layers are laid out in this box's px. */
  width?: number;
  height?: number;
  /** Where the stack sits on the stage (top-left, film px; default 0, 0). */
  x?: number;
  y?: number;
  /** Pivot of the rotation inside the box (default its centre). */
  origin?: [number, number];
  style?: React.CSSProperties;
};

/**
 * T10: the layers of a panel spread along z (each at `z * explode`) inside a perspective box turned by yaw and pitch.
 * Animate `explode` 1 to 0 and `yaw`/`pitch` to 0 to fold it flat (then hand over with MorphToReal).
 */
export const ExplodedStack: React.FC<ExplodedStackProps> = ({ explode, yaw, pitch, layers, perspective = 1350, width = W, height = H, x = 0, y = 0, origin, style }) => {
  const [ox, oy] = origin ?? [width / 2, height / 2];
  return (
    <div style={{ position: "absolute", left: x, top: y, width, height, perspective: `${perspective}px`, perspectiveOrigin: `${ox}px ${oy}px`, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transformOrigin: `${ox}px ${oy}px`,
          transform: `rotateX(${pitch}deg) rotateY(${yaw}deg)`,
        }}
      >
        {layers.map((l) => (
          <div key={l.key} style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translateZ(${l.z * explode}px)` }}>
            {l.node}
          </div>
        ))}
      </div>
    </div>
  );
};

export type BreakoutProps = {
  at: number;
  /** Frames to lift (default 10, R2 section 10). */
  dur?: number;
  /** Lifted scale (default 1.07). */
  scale?: number;
  /** Outward move in px while lifting (default [0, -6]). */
  move?: [number, number];
  /** Settle back into the panel from this frame (optional). */
  back?: number;
  /** Corner radius of the row (for its shadow plate; default 20). */
  radius?: number;
  /** Elevation the row rests at before it breaks out (default 0: flush in its panel). */
  from?: 0 | 1 | 2;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/**
 * A row lifts out of its panel to elevation 4 (scale 1.07, a slight move outward, 10 f, expo out) and holds.
 * Wrap the row in place inside its panel; the shadow is a leaf plate behind it.
 */
export const Breakout: React.FC<BreakoutProps> = ({ at, dur = 10, scale = 1.07, move = [0, -6], back, radius = 20, from = 0, style, children }) => {
  const frame = useCurrentFrame();
  const up = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  const dn = back !== undefined ? tween(frame, back, back + dur, 0, 1, EASE.expoOut) : 0;
  const t = up * (1 - dn);
  const level = from + (4 - from) * t;
  return (
    <div
      style={{
        position: "relative",
        zIndex: t > 0 ? 5 : undefined,
        transform: t > 0 ? `translate(${move[0] * t}px, ${move[1] * t}px) scale(${1 + (scale - 1) * t})` : undefined,
        transformOrigin: "50% 50%",
        ...style,
      }}
    >
      {level > 0.001 ? <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: elevAt(level), pointerEvents: "none" }} /> : null}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};

export type KineticDockProps = {
  at: number;
  dur: number;
  /** Where the token starts and where it docks, film px (the token is laid out at toRect's size). */
  fromRect: Rect;
  toRect: Rect;
  /** Arc height in px at mid-flight (default 60; negative arcs downward). */
  arc?: number;
  /** Peak elevation in flight (default 4). */
  lift?: number;
  /** Hide before `at` (default false: it waits at fromRect). */
  hideBefore?: boolean;
  ease?: (t: number) => number;
  children?: React.ReactNode;
};

/**
 * A token flies from one place to another: it lifts off fromRect, travels on a slight arc while scaling to toRect's
 * size (expo in-out), and lands flush. Lay the token out at toRect's size; it is scaled to fromRect at the start.
 */
export const KineticDock: React.FC<KineticDockProps> = ({ at, dur, fromRect, toRect, arc = 60, lift = 4, hideBefore = false, ease = EASE.expoInOut, children }) => {
  const frame = useCurrentFrame();
  if (hideBefore && frame < at) return null;
  const t = tween(frame, at, at + dur, 0, 1, ease);
  const s0 = fromRect.w / toRect.w;
  const s = s0 + (1 - s0) * t;
  const cx = fromRect.x + fromRect.w / 2 + (toRect.x + toRect.w / 2 - fromRect.x - fromRect.w / 2) * t;
  const cy = fromRect.y + fromRect.h / 2 + (toRect.y + toRect.h / 2 - fromRect.y - fromRect.h / 2) * t - arc * Math.sin(Math.PI * t);
  const level = 1 + (lift - 1) * Math.sin(Math.PI * t);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - toRect.w / 2,
        top: cy - toRect.h / 2,
        width: toRect.w,
        height: toRect.h,
        transform: `scale(${s})`,
        transformOrigin: "50% 50%",
        zIndex: 10,
      }}
    >
      {t > 0 && t < 1 ? <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 14, boxShadow: elevAt(level), pointerEvents: "none" }} /> : null}
      <div style={{ position: "relative", width: "100%", height: "100%" }}>{children}</div>
    </div>
  );
};
