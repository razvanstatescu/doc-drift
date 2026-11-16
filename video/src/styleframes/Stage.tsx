import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../brand/icons";
import { amber, current, DAY, ELEV_DARK, FONT, ink, NIGHT, sweep } from "./look";

/**
 * The Day stage: the sweep ground plus at most one background motif, each with a job.
 * - grid: the aligned world. 60 px squares (1080 / 18), Fathom hairlines at 5%, faded out radially so it lives in the
 *   gaps around the hero object. It never moves on its own: it is the reference the slip breaks.
 * - tide: the current. Contour lines in `current` at 14-30%, drifting 0.5 px a frame, behind hero art and brand
 *   moments only, masked away from reading text.
 */
export const DayStage: React.FC<{
  /** Light centre of the sweep. */
  light?: [string, string];
  grid?: boolean | { mask?: string; opacity?: number };
  tide?: false | TideProps;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ light = ["50%", "34%"], grid = false, tide = false, children, style }) => (
  <AbsoluteFill style={{ background: sweep(light[0], light[1]), color: DAY.text, overflow: "hidden", ...style }}>
    {grid ? <Grid {...(typeof grid === "object" ? grid : {})} /> : null}
    {tide ? <TideLines {...tide} /> : null}
    {children}
  </AbsoluteFill>
);

export const Grid: React.FC<{ step?: number; opacity?: number; mask?: string }> = ({
  step = 60,
  opacity = 0.055,
  mask = "radial-gradient(62% 70% at 50% 50%, #000 0%, rgba(0,0,0,0.55) 45%, transparent 85%)",
}) => {
  const lines: React.ReactNode[] = [];
  for (let x = step; x < 1920; x += step) lines.push(<line key={`x${x}`} x1={x + 0.5} y1={0} x2={x + 0.5} y2={1080} />);
  for (let y = step; y < 1080; y += step) lines.push(<line key={`y${y}`} x1={0} y1={y + 0.5} x2={1920} y2={y + 0.5} />);
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g stroke={ink(opacity)} strokeWidth={1}>{lines}</g>
      </svg>
    </AbsoluteFill>
  );
};

export type TideProps = {
  /** Vertical band the lines occupy. */
  top?: number;
  bottom?: number;
  count?: number;
  amplitude?: number;
  wavelength?: number;
  /** Peak opacity (centre line); the outer lines fade to about half. */
  opacity?: number;
  /** Px per frame the phase drifts. */
  speed?: number;
  stroke?: number;
  mask?: string;
  /** Intersect several mask layers (default: they add up). */
  composite?: boolean;
};

/** Contour-like tide lines in `current`. Each line is phase-shifted from its neighbour, so the set reads as water. */
export const TideLines: React.FC<TideProps> = ({
  top = 560,
  bottom = 1040,
  count = 9,
  amplitude = 20,
  wavelength = 520,
  opacity = 0.3,
  speed = 0.5,
  stroke = 2,
  mask = "linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%)",
  composite = false,
}) => {
  const frame = useCurrentFrame();
  const phase = frame * speed;
  const paths: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const y0 = top + ((bottom - top) * i) / Math.max(1, count - 1);
    const t = count > 1 ? i / (count - 1) : 0.5;
    const o = opacity * (0.45 + 0.55 * Math.sin(Math.PI * t));
    let d = "";
    for (let x = -40; x <= 1960; x += 10) {
      const y = y0 + amplitude * Math.sin(((x + phase + i * 37) / wavelength) * Math.PI * 2 + i * 0.55) * (0.75 + 0.25 * Math.sin(x / 700 + i));
      d += `${x === -40 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(2)} `;
    }
    paths.push(<path key={i} d={d} stroke={current(o)} strokeWidth={stroke} fill="none" strokeLinecap="round" />);
  }
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask, ...(composite ? { maskComposite: "intersect", WebkitMaskComposite: "source-in" } : {}) }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {paths}
      </svg>
    </AbsoluteFill>
  );
};

/** A soft contact shadow on the ground under a floating object (centre x, the object's bottom y, its width). */
export const ContactShadow: React.FC<{ cx: number; y: number; w: number; h?: number; strength?: number }> = ({ cx, y, w, h = 90, strength = 0.2 }) => (
  <div
    style={{
      position: "absolute",
      left: cx - w / 2,
      top: y - h * 0.42,
      width: w,
      height: h,
      borderRadius: "50%",
      background: `radial-gradient(closest-side, ${ink(strength)} 0%, ${ink(strength * 0.45)} 45%, transparent 100%)`,
      filter: "blur(6px)",
    }}
  />
);

/**
 * A floating object: absolutely placed, with its contact shadow attached to its own bottom edge, so the shadow always
 * sits under the object whatever its height. `lift` is how high it floats (a bigger, softer, fainter shadow).
 */
export const Float: React.FC<{
  x: number;
  y: number;
  w?: number;
  lift?: number;
  strength?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, lift = 1, strength = 0.16, children, style }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, ...style }}>
    <div
      style={{
        position: "absolute",
        left: "8%",
        right: "8%",
        top: `calc(100% + ${-18 + 22 * lift}px)`,
        height: 40 + 50 * lift,
        borderRadius: "50%",
        background: `radial-gradient(closest-side, ${ink(strength / (0.6 + 0.4 * lift))} 0%, ${ink(strength * 0.35)} 50%, transparent 100%)`,
        filter: `blur(${4 + 6 * lift}px)`,
        transform: "translateY(-50%)",
      }}
    />
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);

/** The slip's bloom: a soft amber light under the ONE drifted element (part of that element, not a second amber). */
export const Bloom: React.FC<{ cx: number; cy: number; w: number; h: number; strength?: number }> = ({ cx, cy, w, h, strength = 0.32 }) => (
  <div
    style={{
      position: "absolute",
      left: cx - w / 2,
      top: cy - h / 2,
      width: w,
      height: h,
      borderRadius: "50%",
      background: `radial-gradient(closest-side, ${amber(strength)} 0%, ${amber(strength * 0.35)} 50%, transparent 100%)`,
    }}
  />
);

/**
 * Our annotation on Day: a Fathom chip with Paper text (the brand's tooltip colours), for source labels, proof labels
 * and the like. It reads as "a note from us" against any light page or capture.
 */
export const InkLabel: React.FC<{ children: React.ReactNode; icon?: IconName; size?: number; dot?: string; style?: React.CSSProperties }> = ({
  children,
  icon,
  size = 26,
  dot,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.45,
      height: size * 1.8,
      padding: `0 ${size * 0.66}px 0 ${(icon || dot ? 0.55 : 0.66) * size}px`,
      borderRadius: size * 0.38,
      background: NIGHT.ground,
      color: NIGHT.text,
      boxShadow: ELEV_DARK[2],
      fontFamily: FONT.sans,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: "0.005em",
      whiteSpace: "nowrap",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {dot ? <span style={{ width: size * 0.36, height: size * 0.36, borderRadius: "50%", background: dot, boxShadow: `0 0 0 ${size * 0.14}px ${dot}33` }} /> : null}
    {icon ? <Icon name={icon} size={size * 1.05} color={NIGHT.textMuted} /> : null}
    {children}
  </div>
);

/** An eyebrow line above an object: Spline Sans 500, text-muted, sentence case, with an optional icon. */
export const Eyebrow: React.FC<{ children: React.ReactNode; icon?: IconName; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children,
  icon,
  size = 30,
  color = DAY.textMuted,
  style,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.4, fontFamily: FONT.sans, fontWeight: 500, fontSize: size, lineHeight: 1.2, color, ...style }}>
    {icon ? <Icon name={icon} size={size * 1.05} color={color} /> : null}
    {children}
  </div>
);
