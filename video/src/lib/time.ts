import { Easing, interpolate, spring } from "remotion";

/**
 * Global numbers for the Doc Drift film (numbers copied from the Satchel kit and its hypermotion cookbook, sections 0
 * and 2). 1920x1080, 30 fps, 120 BPM: a beat is exactly 15 frames, a bar 60. Every helper here works in FRAMES,
 * because every position in src/data/timeline.json is a frame. `s()` converts seconds when you need it.
 */
export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const BPM = 120;
export const BEAT = 15; // frames per beat at 120 BPM and 30 fps
export const BAR = 60; // frames per bar (4 beats)

/** Seconds to frames (rounded). */
export const s = (sec: number) => Math.round(sec * FPS);

/** Frame of beat n, counted cumulatively (never add rounded beat lengths). Fractions allowed: beat(1.5) = 23. */
export const beat = (n: number) => Math.round(n * BEAT);

/** Frame of bar n (4 beats each). */
export const bar = (n: number) => Math.round(n * BAR);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Hypermotion easings: hard acceleration, long soft landing. No bounce anywhere in this film. */
export const EASE = {
  /** Default landing: type, cards, punch-ins, the slip. */
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  /** Leaving a shot into a cut (whip out, zoom-through). */
  expoIn: Easing.bezier(0.7, 0, 0.84, 0),
  /** Reveals that start and stop on screen (mask wipes). */
  expoInOut: Easing.bezier(0.87, 0, 0.13, 1),
  /** Slower settles. */
  quintOut: Easing.bezier(0.22, 1, 0.36, 1),
  /** Camera drift, parallax (matches a product --ease-standard). */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Single-tween whip, out and in in one curve. */
  whip: Easing.bezier(0.9, 0, 0.1, 1),
  /** Gentle loops. */
  cubicInOut: Easing.bezier(0.65, 0, 0.35, 1),
  linear: (t: number) => t,
} as const;

/**
 * Spring presets. Satchel's five, plus the critically damped ones this calmer brand leans on. Remotion's `damping` is
 * the coefficient c, so zeta = c / (2 * sqrt(stiffness * mass)). Never use damping under 12 (cartoon bounce).
 */
export const SPRING = {
  lift: { stiffness: 260, damping: 22, mass: 1 },
  handoff: { stiffness: 120, damping: 18, mass: 1.2 }, // ~700 ms card move
  slam: { stiffness: 320, damping: 24, mass: 0.9 }, // tiny overshoot; type only, sparingly
  snap: { stiffness: 500, damping: 40, mass: 0.6 }, // UI snaps, no overshoot
  soft: { stiffness: 90, damping: 20, mass: 1 },
  land: { stiffness: 380, damping: 31, mass: 1 }, // zeta 0.8: +1.5% at f8, settles in 12 f. Cards and panels
  carry: { stiffness: 200, damping: 22.6, mass: 1 }, // zeta 0.8: big moves, the cursor
  fade: { stiffness: 1600, damping: 80, mass: 1 }, // zeta 1.0, about 6 f. Opacity and colour only
} as const;

export type SpringConfig = { stiffness: number; damping: number; mass: number };

/** interpolate() between two frames, clamped, with an easing (default expo out). */
export function tween(frame: number, start: number, end: number, from = 0, to = 1, easing: (t: number) => number = EASE.expoOut) {
  if (end <= start) return frame >= start ? to : from;
  return interpolate(frame, [start, end], [from, to], { ...clamp, easing });
}

/** tween() with seconds instead of frames (Satchel's signature). */
export function tweenS(frame: number, startSec: number, endSec: number, from = 0, to = 1, easing: (t: number) => number = EASE.expoOut) {
  return tween(frame, s(startSec), s(endSec), from, to, easing);
}

/** A spring that starts at frame `start` (0 before it). */
export function springAt(frame: number, start: number, config: SpringConfig = SPRING.land, durationInFrames?: number) {
  return spring({ frame: frame - start, fps: FPS, config, durationInFrames });
}

/**
 * Reading time (cookbook section 4): frames a text needs on screen, counted from the moment it is STILL.
 * hold = fps x max(0.8 + 0.25 x words, chars / 15)
 */
export function holdFrames(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(FPS * Math.max(0.8 + 0.25 * words, text.length / 15));
}

/** Linear interpolation, for when you already have an eased progress. */
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
