import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../lib/time";
import { elevAt, ink, type Elev } from "../look";

/**
 * Arrival by lifting (V4.md M3, R2 section 10): the object rises from elevation `from` (default 1) to `to` over `dur`
 * frames (default 14, expo out). Its shadow grows, its contact shadow widens, it travels up `rise` px and scales from
 * 0.975. It is invisible before `at` and fades in over the first 3 frames only (the one fade R2 allows); everything
 * else is the lift. Pass `appear={false}` to have it lie at `from` before `at` and only lift then.
 *
 *   <Lift at={sc.cue("V08")} to={3} contact radius={36} style={{ left: 420, top: 180 }}>
 *     <PageTwin ... />
 *   </Lift>
 *
 * The shadow is drawn on a LEAF plate behind the children (3D-safe), with the children's corner `radius`. Lift is
 * absolutely placed when you give it `style.left/top` (or `x`/`y`); otherwise it is an in-flow block.
 */
export type LiftProps = {
  at: number;
  dur?: number;
  from?: Elev;
  to: Elev;
  /** Fathom objects on Day (ELEV_DARK ladder). */
  dark?: boolean;
  /** "night" for objects on the Night ground (near-black shadows, top-edge light). Default "day". */
  world?: "day" | "night";
  /** A contact shadow on the ground under the object's bottom edge (true, or its strength). */
  contact?: boolean | number;
  /** Corner radius of the object (so the shadow plate matches it). Default 28. */
  radius?: number;
  /** Px the object rises while it lifts (default 26). */
  rise?: number;
  /** Visible before `at`, resting at `from` (default false: it arrives at `at`). */
  appear?: boolean;
  /** Lower it again: from `down.at` it settles to `down.to` (default 1) over `down.dur` (default 10). */
  down?: { at: number; dur?: number; to?: Elev };
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** The elevation and travel of a lift at a frame (for objects that draw their own shadow). */
export function liftAt(frame: number, at: number, dur = 14, from: Elev = 1, to: Elev = 3) {
  const p = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  return { p, level: from + (to - from) * p, opacity: tween(frame, at, at + 3, 0, 1, EASE.linear) };
}

export const Lift: React.FC<LiftProps> = ({
  at,
  dur = 14,
  from = 1,
  to,
  dark = false,
  world = "day",
  contact = false,
  radius = 28,
  rise = 26,
  appear = false,
  down,
  x,
  y,
  w,
  h,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  if (!appear && frame < at) return null;
  const up = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  const dn = down ? tween(frame, down.at, down.at + (down.dur ?? 10), 0, 1, EASE.expoOut) : 0;
  const restLevel = down?.to ?? 1;
  const level = (from + (to - from) * up) * (1 - dn) + restLevel * dn;
  const opacity = appear ? 1 : tween(frame, at, at + 3, 0, 1, EASE.linear);
  const hgt = Math.max(0, Math.min(1, (level - 1) / 3)); // how high it floats: 0 at rest, 1 at float
  const ty = rise * (1 - up) - rise * 0.25 * dn;
  const scale = 0.975 + 0.025 * up;
  const strength = typeof contact === "number" ? contact : world === "night" ? 0.5 : 0.21; // round 2: +30% (K-5)
  const placed = x !== undefined || y !== undefined || style?.left !== undefined || style?.top !== undefined;
  const shade = (a: number) => (world === "night" ? `rgba(1, 10, 13, ${a})` : ink(a));
  return (
    <div
      style={{
        position: placed ? "absolute" : "relative",
        left: x,
        top: y,
        width: w,
        height: h,
        ...style,
      }}
    >
      {contact ? (
        <div
          style={{
            position: "absolute",
            left: `${12 - 6 * hgt}%`,
            right: `${12 - 6 * hgt}%`,
            top: `calc(100% + ${2 + 34 * hgt}px)`,
            height: 26 + 80 * hgt,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${shade(strength / (0.7 + 0.8 * hgt))} 0%, ${shade(strength * 0.3)} 50%, transparent 100%)`,
            transform: "translateY(-50%)",
            opacity,
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div style={{ position: "relative", transform: `translateY(${ty}px) scale(${scale})`, transformOrigin: "50% 100%", opacity: opacity < 1 ? opacity : undefined }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: elevAt(level, dark, world), pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>{children}</div>
      </div>
    </div>
  );
};
