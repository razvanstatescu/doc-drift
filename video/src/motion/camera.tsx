import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE } from "../lib/time";

/**
 * A camera with keyframed punch-ins (BRIEF section 7: 1.0 to 1.3-1.8, expo out, then still).
 * A key says: from `frame`, move so that content point (x, y) sits at the centre of the view at `zoom`, landing in
 * `dur` frames (default 20) with expo out; then hold perfectly still until the next key. A key that starts while
 * the previous move is still running starts from wherever the camera is, so moves chain without a jump.
 *
 *   <Camera keys={[{ frame: 30, x: 1340, y: 220, zoom: 1.6 }, { frame: 120, x: 960, y: 540, zoom: 1 }]}>
 *     ...content laid out in frame px...
 *   </Camera>
 */
export type CamKey = {
  frame: number;
  /** Content point to centre, in content px. */
  x: number;
  y: number;
  zoom: number;
  /** Frames to land (default 20). */
  dur?: number;
  ease?: (t: number) => number;
};

export type CamState = { x: number; y: number; zoom: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The camera at `frame`, given a resting state `base` before the first key. Keys are sorted by frame. */
export function cameraAt(frame: number, keys: CamKey[], base: CamState): CamState {
  const sorted = [...keys].sort((a, b) => a.frame - b.frame);
  let move: { from: CamState; to: CamKey; dur: number; ease: (t: number) => number } | null = null;
  const valueAt = (f: number): CamState => {
    if (!move) return base;
    const t = move.dur <= 0 ? 1 : Math.max(0, Math.min(1, (f - move.to.frame) / move.dur));
    const e = move.ease(t);
    return { x: lerp(move.from.x, move.to.x, e), y: lerp(move.from.y, move.to.y, e), zoom: lerp(move.from.zoom, move.to.zoom, e) };
  };
  for (const k of sorted) {
    if (k.frame > frame) break;
    const from = valueAt(k.frame);
    move = { from, to: k, dur: k.dur ?? 20, ease: k.ease ?? EASE.expoOut };
  }
  return valueAt(frame);
}

/** Keep the view inside the content: at zoom z the view covers (viewW / z) x (viewH / z) content px. */
export function clampCamera(c: CamState, contentW: number, contentH: number, viewW: number, viewH: number, scale = 1): CamState {
  const halfW = viewW / (2 * scale * c.zoom);
  const halfH = viewH / (2 * scale * c.zoom);
  const fit = (v: number, half: number, size: number) => (half * 2 >= size ? size / 2 : Math.max(half, Math.min(size - half, v)));
  return { x: fit(c.x, halfW, contentW), y: fit(c.y, halfH, contentH), zoom: c.zoom };
}

/** CSS transform placing content point (x, y) at the view centre at the given zoom (transform-origin 0 0). */
export const cameraTransform = (c: CamState, viewW: number, viewH: number, scale = 1) =>
  `translate(${viewW / 2}px, ${viewH / 2}px) scale(${scale * c.zoom}) translate(${-c.x}px, ${-c.y}px)`;

/**
 * Full-frame camera over content laid out in frame px (1920x1080). Pass `clamp={false}` to allow framing past the
 * content's edges (the ground colour shows there).
 */
export const Camera: React.FC<{
  keys: CamKey[];
  /** Resting state before the first key (default: frame centre, zoom 1). */
  base?: CamState;
  clamp?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ keys, base, clamp = true, style, children }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const b = base ?? { x: width / 2, y: height / 2, zoom: 1 };
  let c = cameraAt(frame, keys, b);
  if (clamp) c = clampCamera(c, width, height, width, height);
  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: cameraTransform(c, width, height) }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
