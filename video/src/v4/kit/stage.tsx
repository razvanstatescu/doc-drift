import React, { createContext, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../brand/icons";
import { H, W } from "../../lib/time";
import { amber, current, DAY, ELEV_DARK, FONT, ink, NIGHT, nightSweep, sweep, white } from "../look";
import { layerCorrection, useCam3OrNull, StageSlotContext, type Cam3, type StageSlot } from "./camera3d";
import { useRealCapture, warnPaint } from "./capturectx";

/**
 * The v4 stage (V4.md L1, L5, M1): the lit ground with its one motif, parallaxed by the camera.
 *
 *   <Stage world="day" motif="grid">          // outside the camera (recommended)
 *     <Camera3D keys={...}> ...objects... </Camera3D>
 *   </Stage>
 *
 * The Stage finds the first <Camera3D> inside it and moves with it: the sweep's light at 0.3, the grid (or tide) at
 * 0.5. It also works inside a camera (it then counter-moves its ground the same way). Without any camera the motif
 * still moves on its own (tide 0.5 px a frame; the grid drifts slowly), so the ground never freezes.
 */
export type StageProps = {
  world?: "day" | "night";
  /** Light centre of the sweep, as CSS lengths (default Day ["50%", "34%"], Night ["50%", "38%"]). */
  light?: [string, string];
  motif?: "grid" | "tide" | "none";
  /** Grid options (motif "grid"). */
  grid?: GridProps;
  /** Tide options (motif "tide"). */
  tide?: TideProps;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** The Stage around a node (its world and light), or null outside one. MorphToReal uses it to know a ground is behind. */
export type StageInfo = { world: "day" | "night"; light?: [string, string] };
export const StageContext = createContext<StageInfo | null>(null);

export const Stage: React.FC<StageProps> = ({ world = "day", light, motif = "grid", grid, tide, style, children }) => {
  useCurrentFrame(); // re-render every frame so the slot is reset before the camera inside writes it
  const slot = useMemo<StageSlot>(() => ({ pose: null }), []);
  slot.pose = null;
  const outer = useCam3OrNull();
  const night = world === "night";
  return (
    // isolation: the Stage is its own stacking context, so its inner z-order (ground 0, children 1) never leaks into
    // a parent that layers two Stages (MorphToReal, the cuts), and Mist bands multiply only with this Stage
    <AbsoluteFill style={{ background: night ? NIGHT.ground : DAY.ground, color: night ? NIGHT.text : DAY.text, overflow: "hidden", isolation: "isolate", ...style }}>
      <StageSlotContext.Provider value={slot}>
        <StageContext.Provider value={{ world, light }}>
          <AbsoluteFill style={{ zIndex: 1 }}>{children}</AbsoluteFill>
        </StageContext.Provider>
      </StageSlotContext.Provider>
      {/* drawn after the children (so a camera inside has published its pose), behind them on screen */}
      <StageGround slot={slot} outer={outer} world={world} light={light} motif={motif} grid={grid} tide={tide} />
    </AbsoluteFill>
  );
};

const StageGround: React.FC<{
  slot: StageSlot;
  outer: Cam3 | null;
  world: "day" | "night";
  light?: [string, string];
  motif: "grid" | "tide" | "none";
  grid?: GridProps;
  tide?: TideProps;
}> = ({ slot, outer, world, light, motif, grid, tide }) => {
  const frame = useCurrentFrame();
  const night = world === "night";
  const [lx, ly] = light ?? (night ? ["50%", "38%"] : ["50%", "34%"]);
  // The ground is drawn oversized so the light can parallax (and a camera roll never shows an edge).
  const pad = 0.18;
  const ground = night ? nightSweep(lx, ly) : sweep(lx, ly);
  // without a camera the grid drifts on its own (6 px a second, diagonal), so a still shot never freezes
  const self = slot.pose || outer ? 0 : frame * 0.2;
  return (
    <AbsoluteFill style={{ zIndex: 0, pointerEvents: "none" }}>
      <Plane slot={slot} outer={outer} depth={0.3}>
        <div style={{ position: "absolute", left: -W * pad, top: -H * pad, width: W * (1 + 2 * pad), height: H * (1 + 2 * pad), background: ground }} />
      </Plane>
      {motif === "grid" ? (
        <Plane slot={slot} outer={outer} depth={0.5}>
          <div style={{ position: "absolute", inset: 0, transform: self ? `translate(${-self}px, ${-self * 0.5}px)` : undefined }}>
            <Grid night={night} oversize {...grid} />
          </div>
        </Plane>
      ) : null}
      {motif === "tide" ? (
        <Plane slot={slot} outer={outer} depth={0.5}>
          <TideLines night={night} {...tide} />
        </Plane>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * A full-frame plane of the ground at a parallax depth. With a camera inside the Stage (slot), it is a screen-space
 * plane following that camera by `depth`; with the Stage inside a camera (outer), it counter-moves inside the world.
 */
const Plane: React.FC<{ slot: StageSlot; outer: Cam3 | null; depth: number; children: React.ReactNode }> = ({ slot, outer, depth, children }) => {
  const transform = slot.pose ? parallax2d(slot.pose, depth) : outer ? layerCorrection(outer, depth) : undefined;
  const origin = slot.pose ? "50% 50%" : "0 0";
  return <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: origin, transform }}>{children}</div>;
};

/** 2D screen transform of a full-frame plane that follows the camera by `factor` (0 fixed, 1 with the world). */
export function parallax2d(cam: Cam3, factor: number): string {
  const s = Math.pow(cam.zoom, factor);
  const dx = -(cam.x - W / 2) * factor * s;
  const dy = -(cam.y - H / 2) * factor * s;
  return `translate(${dx}px, ${dy}px) rotate(${cam.roll * factor}deg) scale(${s})`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Promoted from src/styleframes/Stage.tsx (R2)
// ---------------------------------------------------------------------------------------------------------------------

export type GridProps = {
  step?: number;
  opacity?: number;
  mask?: string;
  night?: boolean;
  /** Draw past the frame (for parallax); internal default when the Stage moves it. */
  oversize?: boolean;
};

/**
 * The aligned world: 60 px squares (1080 / 18), Fathom hairlines at 5.5% on Day (white at 6% on Night), faded out
 * radially so it lives in the gaps around the hero object. The grid is the reference the slip breaks.
 */
export const Grid: React.FC<GridProps> = ({
  step = 60,
  opacity,
  mask = "radial-gradient(62% 70% at 50% 50%, #000 0%, rgba(0,0,0,0.55) 45%, transparent 85%)",
  night = false,
  oversize = false,
}) => {
  const o = opacity ?? (night ? 0.06 : 0.055);
  const m = oversize ? Math.ceil(480 / step) * step : 0; // extra cells on each side
  const lines: React.ReactNode[] = [];
  for (let x = -m + step; x < W + m; x += step) lines.push(<line key={`x${x}`} x1={x + m + 0.5} y1={0} x2={x + m + 0.5} y2={H + 2 * m} />);
  for (let y = -m + step; y < H + m; y += step) lines.push(<line key={`y${y}`} x1={0} y1={y + m + 0.5} x2={W + 2 * m} y2={y + m + 0.5} />);
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <svg width={W + 2 * m} height={H + 2 * m} style={{ position: "absolute", left: -m, top: -m }}>
        <g stroke={night ? white(o) : ink(o)} strokeWidth={1}>
          {lines}
        </g>
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
  /** Px per frame the phase drifts (default 0.5). */
  speed?: number;
  stroke?: number;
  mask?: string;
  /** Intersect several mask layers (default: they add up). */
  composite?: boolean;
  night?: boolean;
};

/** Contour-like tide lines in `current`. Each line is phase-shifted from its neighbour, so the set reads as water. */
export const TideLines: React.FC<TideProps> = ({
  top = 560,
  bottom = 1040,
  count = 9,
  amplitude = 20,
  wavelength = 520,
  opacity,
  speed = 0.5,
  stroke = 2,
  mask = "linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%)",
  composite = false,
  night = false,
}) => {
  const frame = useCurrentFrame();
  const peak = opacity ?? (night ? 0.42 : 0.3);
  const phase = frame * speed;
  const paths: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const y0 = top + ((bottom - top) * i) / Math.max(1, count - 1);
    const t = count > 1 ? i / (count - 1) : 0.5;
    const o = peak * (0.45 + 0.55 * Math.sin(Math.PI * t));
    let d = "";
    for (let x = -240; x <= W + 240; x += 10) {
      const y = y0 + amplitude * Math.sin(((x + phase + i * 37) / wavelength) * Math.PI * 2 + i * 0.55) * (0.75 + 0.25 * Math.sin(x / 700 + i));
      d += `${x === -240 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(2)} `;
    }
    paths.push(<path key={i} d={d} stroke={night ? `rgba(95, 179, 191, ${o})` : current(o)} strokeWidth={stroke} fill="none" strokeLinecap="round" />);
  }
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask, ...(composite ? { maskComposite: "intersect", WebkitMaskComposite: "source-in" } : {}) }}>
      <svg width={W + 480} height={H} style={{ position: "absolute", left: -240, top: 0, overflow: "visible" }} viewBox={`-240 0 ${W + 480} ${H}`}>
        {paths}
      </svg>
    </AbsoluteFill>
  );
};

/** A soft contact shadow on the ground under a floating object (centre x, the object's bottom y, its width). */
export const ContactShadow: React.FC<{ cx: number; y: number; w: number; h?: number; strength?: number }> = ({ cx, y, w, h = 90, strength = 0.26 }) => (
  <div
    style={{
      position: "absolute",
      left: cx - w / 2,
      top: y - h * 0.42,
      width: w,
      height: h,
      borderRadius: "50%",
      background: `radial-gradient(closest-side, ${ink(strength)} 0%, ${ink(strength * 0.45)} 45%, transparent 100%)`,
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
}> = ({ x, y, w, lift = 1, strength = 0.21, children, style }) => (
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
        transform: "translateY(-50%)",
      }}
    />
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);

/** The slip's bloom: a soft amber light under the ONE drifted element (part of that element, not a second amber). */
export const Bloom: React.FC<{ cx: number; cy: number; w: number; h: number; strength?: number }> = ({ cx, cy, w, h, strength = 0.32 }) => {
  const onCapture = useRealCapture();
  if (onCapture) {
    warnPaint(`Bloom over the real capture ${onCapture}: amber goes on a crafted element beside it (LiftOut), never on the capture`);
    return null;
  }
  return <BloomDiv cx={cx} cy={cy} w={w} h={h} strength={strength} />;
};

const BloomDiv: React.FC<{ cx: number; cy: number; w: number; h: number; strength: number }> = ({ cx, cy, w, h, strength }) => (
  <div
    style={{
      position: "absolute",
      left: cx - w / 2,
      top: cy - h / 2,
      width: w,
      height: h,
      borderRadius: "50%",
      background: `radial-gradient(closest-side, ${amber(strength)} 0%, ${amber(strength * 0.35)} 50%, transparent 100%)`,
      pointerEvents: "none",
    }}
  />
);

/**
 * Our annotation on Day: a Fathom chip with Paper text (the brand's tooltip colours), for source labels, proof tags
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
