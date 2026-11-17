import { cam3At, stageToScreen, type Cam3, type Cam3Key, type CameraOptions, type Rect } from "../../../v4/kit";

/**
 * Geometry helpers for FIX and JIRA (copied from v4 P4's geom.ts, which v5 scenes do not import): stage rects on the
 * screen for a camera, rects inside a proof's image, and interpolation.
 */

/** Screen rect of a stage rect for a camera pose (2D: keep the world square when aiming). */
export const toScreen = (r: Rect, cam: Cam3): Rect => {
  const [x0, y0] = stageToScreen(cam, r.x, r.y);
  const [x1, y1] = stageToScreen(cam, r.x + r.w, r.y + r.h);
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
};

/** Screen rect of a stage rect at a local frame, for a camera's keys and options. */
export const screenAt = (r: Rect, frame: number, keys: readonly Cam3Key[], opts: CameraOptions): Rect => toScreen(r, cam3At(frame, keys, opts));

export const center = (r: Rect): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];

/** A rect inside a proof's image (capture px box) in film px, given the image's film rect, the crop and the scale. */
export const inProof = (image: Rect, crop: [number, number, number, number], scale: number, box: [number, number, number, number]): Rect => ({
  x: image.x + (box[0] - crop[0]) * scale,
  y: image.y + (box[1] - crop[1]) * scale,
  w: box[2] * scale,
  h: box[3] * scale,
});

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

/** Grow a rect by `d` px on every side. */
export const grow = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
