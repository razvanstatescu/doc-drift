import React, { createContext, useContext } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { EASE, FPS, H, W } from "../../lib/time";

/**
 * The v4 scene camera (V4.md M1, M2, M4; ported from Pot's motion/camera.tsx at 30 fps).
 *
 * A pose says which STAGE point (film px on the 1920 x 1080 stage, before the camera) sits at the centre of the view,
 * at what zoom, and how the view is turned (yaw = rotateY, pitch = rotateX, roll = rotateZ, degrees, pivoting on that
 * point). Keys move the camera; between keys it is never fully still: it creeps (zoom +`creep`% per second, default
 * 1.5), drifts (`drift` px per second) and floats (a small hand-held noise), all counted from the latest key's start,
 * so every move starts exactly where the camera is.
 *
 *   <Camera3D keys={[
 *     { at: 0, to: { x: 960, y: 540, zoom: 1 } },
 *     { at: 45, dur: 24, to: { x: 1300, y: 420, zoom: 1.4 } },             // push toward a point, expo out
 *     { at: 120, dur: 30, to: { yaw: -8, pitch: 4 }, ease: EASE.expoInOut }, // a travel in 3D
 *   ]}>
 *     <Layer depth={0.5}>...</Layer>   // parallax: moves half as much as the world
 *     ...objects at depth 1...
 *   </Camera3D>
 */
export type Cam3 = { x: number; y: number; zoom: number; yaw: number; pitch: number; roll: number };
export const CAM3_REST: Cam3 = { x: W / 2, y: H / 2, zoom: 1, yaw: 0, pitch: 0, roll: 0 };

export type Cam3Key = {
  /** Local frame the move starts. */
  at: number;
  /** Frames to land (default: sized by the move, 18 to 36). */
  dur?: number;
  /** Target pose; omitted props carry over from wherever the camera is. */
  to: Partial<Cam3>;
  /** Default expo out (a landing on the word). */
  ease?: (t: number) => number;
};

export type CameraOptions = {
  base?: Partial<Cam3>;
  /** Zoom creep in % per second (default 1.5). 0 turns it off (give a reason in a comment). */
  creep?: number;
  /** Sideways drift in film px per second, [vx, vy] (default [0, 0]). */
  drift?: [number, number];
  /** Hand-held float amplitude in px (default 5; 0 = off). Roll follows at amplitude x 0.03 degrees. */
  float?: number;
  /** Seed for the float noise (two cameras on one screen should differ). */
  seed?: string;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const logLerp = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(Math.max(1e-4, a)), Math.log(Math.max(1e-4, b)), t));

/** Frames a camera move takes when the key gives no `dur` (Pot's pushes sized by duration, inverted). */
export function moveFrames(from: Cam3, to: Cam3): number {
  const dist = Math.hypot(to.x - from.x, to.y - from.y) * Math.max(from.zoom, to.zoom);
  const zoomStops = Math.abs(Math.log2(to.zoom / from.zoom));
  const turn = Math.max(Math.abs(to.yaw - from.yaw), Math.abs(to.pitch - from.pitch), Math.abs(to.roll - from.roll));
  return Math.round(Math.max(18, Math.min(36, 16 + dist / 40 + zoomStops * 14 + turn * 0.8)));
}

/**
 * Interpolate two poses: zoom in log space (constant rate), and the look-at point pre-multiplied by the zoom so the
 * target glides on a straight screen path (Archibald, "animating zooming"): L = Lb - (1 - t)(za / z)(Lb - La).
 */
export function interpolateCam3(a: Cam3, b: Cam3, t: number): Cam3 {
  const zoom = logLerp(a.zoom, b.zoom, t);
  const k = (1 - t) * (a.zoom / zoom);
  return {
    zoom,
    x: b.x - k * (b.x - a.x),
    y: b.y - k * (b.y - a.y),
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
    roll: lerp(a.roll, b.roll, t),
  };
}

/** The camera at a local frame (pure; `useCam3Pose` is the hook form). */
export function cam3At(frame: number, keys: readonly Cam3Key[] = [], opts: CameraOptions = {}): Cam3 {
  const base: Cam3 = { ...CAM3_REST, ...stripUndefined(opts.base ?? {}) };
  const creep = opts.creep ?? 1.5;
  const [vx, vy] = opts.drift ?? [0, 0];
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  const rate = Math.log(1 + creep / 100) / FPS; // log-zoom per frame

  // segment i: from key i's start, interpolate from where the camera was to the key's target, plus creep since start
  let segStart = 0;
  let from = base;
  let target = base;
  let dur = 0;
  let ease: (t: number) => number = EASE.expoOut;
  const evalSeg = (f: number): Cam3 => {
    const t = dur <= 0 ? 1 : Math.max(0, Math.min(1, (f - segStart) / dur));
    const p = dur <= 0 ? target : interpolateCam3(from, target, ease(t));
    const since = Math.max(0, f - segStart);
    return { ...p, zoom: p.zoom * Math.exp(rate * since), x: p.x + (vx * since) / FPS, y: p.y + (vy * since) / FPS };
  };
  for (const k of sorted) {
    if (k.at > frame) break;
    const start = evalSeg(k.at);
    from = start;
    target = { ...start, ...stripUndefined(k.to) };
    dur = k.dur ?? moveFrames(start, target);
    ease = k.ease ?? EASE.expoOut;
    segStart = k.at;
  }
  const pose = evalSeg(frame);
  const f = floatAt(frame, opts.float ?? 5, opts.seed ?? "cam3");
  return { ...pose, x: pose.x + f.x / pose.zoom, y: pose.y + f.y / pose.zoom, roll: pose.roll + f.roll };
}

/**
 * The hand-held float, in screen px: a slow elliptical orbit (period 5 s, so its speed never drops to zero: 0.6 to 1
 * x `amount` px per second x 1.26) plus a little noise so it never reads as mechanical. Roll follows the noise.
 */
export function floatAt(frame: number, amount: number, seed = "cam3"): { x: number; y: number; roll: number } {
  if (amount <= 0) return { x: 0, y: 0, roll: 0 };
  const t = frame / FPS;
  const w = 2 * Math.PI * 0.2; // one orbit every 5 s
  const ph = noise2D(`${seed}p`, 0, 0) * Math.PI; // a per-seed phase
  const nt = t * 0.3;
  return {
    x: amount * (Math.cos(w * t + ph) + 0.3 * noise2D(`${seed}x`, nt, 0)),
    y: amount * 0.7 * (Math.sin(w * t + ph) + 0.3 * noise2D(`${seed}y`, nt, 10)),
    roll: noise2D(`${seed}r`, nt, 20) * amount * 0.03,
  };
}

/** Is this pose turned in 3D (then the world keeps preserve-3d and 3D rotations)? */
const is3d = (c: Cam3) => Math.abs(c.yaw) > 0.005 || Math.abs(c.pitch) > 0.005;

/** CSS transform of the world for a pose (transform-origin 0 0, on a W x H plane). */
export function cam3Transform(c: Cam3): string {
  const turn = is3d(c) ? `rotateX(${c.pitch}deg) rotateY(${c.yaw}deg) ` : "";
  return `translate(${W / 2}px, ${H / 2}px) ${turn}rotate(${c.roll}deg) scale(${c.zoom}) translate(${-c.x}px, ${-c.y}px)`;
}

type CamCtx = { pose: Cam3; perspective: number };
const CameraContext = createContext<CamCtx | null>(null);

/**
 * A slot a <Stage> offers to the first <Camera3D> inside it, so the Stage's ground (drawn after its children in React
 * order, behind them on screen) can parallax with a camera that is its descendant. Internal.
 */
export type StageSlot = { pose: Cam3 | null };
export const StageSlotContext = createContext<StageSlot | null>(null);

/** The current camera pose inside a <Camera3D> (CAM3_REST outside one). */
export function useCam3(): Cam3 {
  return useContext(CameraContext)?.pose ?? CAM3_REST;
}

/** The current camera pose, or null outside a <Camera3D>. */
export function useCam3OrNull(): Cam3 | null {
  return useContext(CameraContext)?.pose ?? null;
}

export type Camera3DProps = CameraOptions & {
  keys?: readonly Cam3Key[];
  /** Perspective in px for yaw and pitch (default 2400: a photographed look; 1600 is dramatic). */
  perspective?: number;
  /** Keep the world in preserve-3d even while it is square (for 3D children such as ExplodedStack). */
  preserve3d?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** The scene camera. Never fully still: see `creep`, `drift` and `float`. */
export const Camera3D: React.FC<Camera3DProps> = ({ keys = [], perspective = 2400, preserve3d = false, style, children, ...opts }) => {
  const frame = useCurrentFrame();
  const pose = cam3At(frame, keys, opts);
  const slot = useContext(StageSlotContext);
  if (slot && !slot.pose) slot.pose = pose; // the Stage around this camera parallaxes its ground with it
  const three = preserve3d || is3d(pose);
  return (
    <AbsoluteFill style={{ overflow: "hidden", perspective: `${perspective}px`, perspectiveOrigin: "50% 50%", ...style }}>
      <CameraContext.Provider value={{ pose, perspective }}>
        <StageSlotContext.Provider value={null}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: W,
              height: H,
              transformOrigin: "0 0",
              transform: cam3Transform(pose),
              transformStyle: three ? "preserve-3d" : undefined,
            }}
          >
            {children}
          </div>
        </StageSlotContext.Provider>
      </CameraContext.Provider>
    </AbsoluteFill>
  );
};

/**
 * Parallax layer inside a <Camera3D> (M4: light 0.3, grid 0.5, objects 1.0, floats 1.1 to 1.15). Depth 1 moves with
 * the world, 0 is fixed to the screen, above 1 moves more (a float near the lens). Coordinates inside stay stage px.
 */
export const Layer: React.FC<{ depth: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ depth, style, children }) => {
  const cam = useCam3OrNull();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: cam ? layerCorrection(cam, depth) : undefined, ...style }}>
      {children}
    </div>
  );
};

/**
 * The transform that makes a plane inside the world (depth 1) behave as if it were at `depth`:
 * L(p) = X + z^(d-1) (p - Xd), where Xd = C + d (X - C), C = the stage centre.
 */
export function layerCorrection(cam: Cam3, depth: number): string {
  if (Math.abs(depth - 1) < 1e-6) return "none";
  const s = Math.pow(cam.zoom, depth - 1);
  const xd = W / 2 + depth * (cam.x - W / 2);
  const yd = H / 2 + depth * (cam.y - H / 2);
  const roll = (depth - 1) * cam.roll; // a far plane turns less with the camera's roll
  return `translate(${cam.x}px, ${cam.y}px) rotate(${-roll * 0}deg) scale(${s}) translate(${-xd}px, ${-yd}px)`;
}

/** Map a stage point to the screen for a pose (2D part; yaw and pitch ignored). For aiming overlays. */
export function stageToScreen(cam: Cam3, x: number, y: number): [number, number] {
  const r = (cam.roll * Math.PI) / 180;
  const dx = (x - cam.x) * cam.zoom;
  const dy = (y - cam.y) * cam.zoom;
  return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), H / 2 + dx * Math.sin(r) + dy * Math.cos(r)];
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] !== undefined) out[k] = o[k];
  return out;
}
