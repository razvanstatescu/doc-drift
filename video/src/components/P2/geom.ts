import type { Rect } from "../../v4/look";

/**
 * Small geometry helpers for P2's twins. Spline Sans Mono advances exactly 0.6 em per character (measured on a still,
 * 2026-11-16), so every mono literal's box is known without measuring the DOM, and morphs, docks and match cuts can
 * aim at the exact words.
 */
export const MONO_ADVANCE = 0.6;

/** Width of a mono string at a font size. */
export const monoW = (text: string, size: number) => text.length * size * MONO_ADVANCE;

/** A rect moved by (dx, dy). */
export const shift = (r: Rect, dx: number, dy: number): Rect => ({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h });

/** A rect grown by `m` on every side. */
export const grow = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });

/** The union of rects. */
export const union = (...rs: Rect[]): Rect => {
  const x0 = Math.min(...rs.map((r) => r.x));
  const y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w));
  const y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

export const center = (r: Rect): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];

/** Linear blend of two rects (t 0..1). */
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});
