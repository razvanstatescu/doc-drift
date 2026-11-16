import { H, W } from "../../lib/time";
import { cam3At, stageToScreen, type Cam3, type Cam3Key, type CameraOptions, type Rect } from "../../v4/kit";

/** Screen rect of a stage rect for a camera pose (2D: yaw and pitch ignored; keep the world square when aiming). */
export const toScreen = (r: Rect, cam: Cam3): Rect => {
  const [x0, y0] = stageToScreen(cam, r.x, r.y);
  const [x1, y1] = stageToScreen(cam, r.x + r.w, r.y + r.h);
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
};

/** Screen rect of a stage rect at a local frame, for a camera's keys and options. */
export const screenAt = (r: Rect, frame: number, keys: readonly Cam3Key[], opts: CameraOptions): Rect => toScreen(r, cam3At(frame, keys, opts));

export const center = (r: Rect): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];

/** A rect inside a proof's image (capture px) in film px, given the image's film rect and the crop. */
export const inProof = (image: Rect, crop: [number, number, number, number], scale: number, box: [number, number, number, number]): Rect => ({
  x: image.x + (box[0] - crop[0]) * scale,
  y: image.y + (box[1] - crop[1]) * scale,
  w: box[2] * scale,
  h: box[3] * scale,
});

/** Interpolate two rects. */
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

/** Projection of a point on a plane at depth z inside a perspective box (perspective P, origin o), flat (no turn). */
export const project = (x: number, y: number, z: number, P: number, o: [number, number]): [number, number] => {
  const m = P / (P - z);
  return [o[0] + (x - o[0]) * m, o[1] + (y - o[1]) * m];
};

export const STAGE: Rect = { x: 0, y: 0, w: W, h: H };

/** The 3D view of an ExplodedStack: its origin (stage px), perspective and turn (CSS rotateX(pitch) rotateY(yaw)). */
export type StackView = { ox: number; oy: number; P: number; yaw: number; pitch: number };

/**
 * Where a point of a stack layer lands on the stage: (x, y) on the layer, z its depth. Same math as the CSS: rotateY,
 * then rotateX, about the origin, then the perspective about the same origin.
 */
export const projectStack = (x: number, y: number, z: number, v: StackView): [number, number] => {
  const dx = x - v.ox;
  const dy = y - v.oy;
  const ry = (v.yaw * Math.PI) / 180;
  const rx = (v.pitch * Math.PI) / 180;
  const x1 = dx * Math.cos(ry) + z * Math.sin(ry);
  const z1 = -dx * Math.sin(ry) + z * Math.cos(ry);
  const y2 = dy * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = dy * Math.sin(rx) + z1 * Math.cos(rx);
  const m = v.P / (v.P - z2);
  return [v.ox + x1 * m, v.oy + y2 * m];
};
