import React from "react";
import { AbsoluteFill, random } from "remotion";
import { integrate } from "./fx/motion";

/**
 * The z-tunnel (from the Satchel film's H0, same owner): `count` cards on a helix around the camera axis, flying
 * toward the camera and wrapping to the far end, an endless doomscroll of the evidence. Plain CSS 3D inside the pass:
 * every card shares the screen centre as its transform origin, so perspective() inside each transform gives one common
 * vanishing point, and zIndex = depth sorts them explicitly (isolation keeps those z-indices off the slams).
 *
 * Deterministic: positions come from random(seed + i); the distance travelled is the integral of `speed`, so a speed
 * ramp is just a different speed curve. Cards fade in from the dark (no pop) and never turn more than about 30°.
 */
export type TunnelItem = { node: React.ReactNode; w: number; h: number };

export type TunnelProps = {
  frame: number; // the tunnel's own clock
  item: (index: number) => TunnelItem; // the card for an endless index (each wrap gets a new one)
  count?: number;
  depth?: number; // px of tunnel
  near?: number; // closest z (px toward the camera) before wrapping
  perspective?: number;
  radius?: readonly [number, number];
  cardScale?: number;
  speed: (f: number) => number; // px per frame along z
  seed?: string;
  phase?: number; // progress offset (0..1) so the tunnel starts full
  roll?: number; // degrees, the whole tunnel about the view axis
  centerY?: number; // the vanishing point's y (px)
};

export const Tunnel: React.FC<TunnelProps> = ({
  frame,
  item,
  count = 14,
  depth = 4600,
  near = 640,
  perspective = 900,
  radius = [420, 800],
  cardScale = 0.62,
  speed,
  seed = "a0-tunnel",
  phase = 0.15,
  roll = 0,
  centerY = 540,
}) => {
  const travel = integrate(frame, speed);
  const cards = Array.from({ length: count }, (_, i) => {
    const theta = 2 * Math.PI * (i * 0.381966 + 0.08 * random(`${seed}-th${i}`));
    const r = radius[0] + (radius[1] - radius[0]) * random(`${seed}-r${i}`);
    const x = Math.cos(theta) * r * 1.3;
    const y = Math.sin(theta) * r * 0.72;
    const u = i / count + phase + travel / depth;
    const lap = Math.floor(u);
    const frac = u - lap;
    const z = -depth + near + frac * depth;
    return {
      i,
      idx: i + lap * count,
      x,
      y,
      z,
      fog: Math.min(1, Math.max(0, (frac - 0.02) / 0.3)),
      rotY: (-x / 1100) * 30,
      rotX: (y / 700) * 18,
      rotZ: (random(`${seed}-rz${i}`) - 0.5) * 10,
    };
  }).sort((a, b) => a.z - b.z);

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        isolation: "isolate",
        transformOrigin: `960px ${centerY}px`,
        transform: roll ? `rotate(${roll}deg) scale(${1 + Math.abs(roll) / 90})` : undefined,
      }}
    >
      {cards.map((c) => {
        if (c.fog <= 0) return null;
        const it = item(c.idx);
        return (
          <div
            key={c.i}
            style={{
              position: "absolute",
              left: 960 - it.w / 2,
              top: centerY - it.h / 2,
              width: it.w,
              height: it.h,
              transformOrigin: "50% 50%",
              transform: `perspective(${perspective}px) translate3d(${c.x}px, ${c.y}px, ${c.z}px) rotateY(${c.rotY}deg) rotateX(${c.rotX}deg) rotateZ(${c.rotZ}deg) scale(${cardScale})`,
              opacity: c.fog,
              zIndex: Math.round(c.z + 100000),
            }}
          >
            {it.node}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
