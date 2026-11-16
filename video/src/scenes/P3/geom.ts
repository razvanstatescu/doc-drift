import type { Box } from "../../lib/captures";
import { MAT, stageToScreen, type Cam3, type Rect } from "../../v4/kit";

/**
 * Geometry helpers for P3: stage rects to screen rects through a camera pose, and capture rects to film rects inside a
 * proof's mat. Proofs live in SCREEN space (outside the camera), so a camera zoom never pushes a capture past 1 film
 * px per capture px (P2).
 */

/** A stage rect on screen for a pose (axis-aligned; the camera's float roll is a fraction of a degree). */
export function toScreen(cam: Cam3, r: Rect): Rect {
  const [x1, y1] = stageToScreen(cam, r.x, r.y);
  const [x2, y2] = stageToScreen(cam, r.x + r.w, r.y + r.h);
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

/** A capture-px box [x0, y0, x1, y1] inside a proof placed at (x, y) (the mat's outer top-left) with crop and scale. */
export function inProof(el: [number, number, number, number], crop: Box, scale: number, x: number, y: number): Rect {
  return {
    x: x + MAT.pad + (el[0] - crop[0]) * scale,
    y: y + MAT.pad + (el[1] - crop[1]) * scale,
    w: (el[2] - el[0]) * scale,
    h: (el[3] - el[1]) * scale,
  };
}

/** Pad a rect on every side. */
export const pad = (r: Rect, px: number): Rect => ({ x: r.x - px, y: r.y - px, w: r.w + 2 * px, h: r.h + 2 * px });

/**
 * Element boxes measured in the captures (capture px, [x0, y0, x1, y1]), by row and column ink profiles
 * (2026-11-16). They are the morph anchors: the twin's element and the capture's element are matched on these.
 */
export const CAP = {
  /** p3-rovo-v2-agent: Drift Reviewer's welcome heading (the DR tile and the name), its description and starters. */
  agentHeading: [3196, 1084, 3610, 1162] as [number, number, number, number],
  agentDescription: [3115, 1193, 3687, 1300] as [number, number, number, number],
  /** p3-rovo-v2-rec at 24.5 s: "Drift Reviewer is thinking." and its three steps; the third is the tool call. */
  thinking: [3006, 496, 3401, 528] as [number, number, number, number],
  stepsBlock: [3006, 496, 3617, 772] as [number, number, number, number],
  checkStep: [3076, 740, 3617, 772] as [number, number, number, number],
  /** p3-rovo-v2-answer: the question, the Referencing row, the answer's first line and its paragraph lines. */
  question: [3339, 280, 3782, 307] as [number, number, number, number],
  answerLine1: [3048, 561, 3680, 591] as [number, number, number, number],
  answerPr: [3037, 636, 3743, 663] as [number, number, number, number],
  answerPara: [3037, 636, 3743, 855] as [number, number, number, number],
};
