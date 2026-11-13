import { noise2D } from "@remotion/noise";
import { Easing, interpolate, random } from "remotion";

/**
 * Deterministic motion helpers for the barrage (from the Satchel film's H0, same owner). Never Math.random(): every
 * render worker must draw the same pixels for the same frame.
 */
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A value in [0, 1) stable for (seed, frame step); `hold` frames share one value (glitches look stepped). */
export const stepRand = (seed: string, frame: number, hold = 1, salt: string | number = 0) =>
  random(`${seed}|${Math.floor(frame / Math.max(1, hold))}|${salt}`);

/** A 31-bit integer seed for the shader, stepped every `hold` frames. */
export const stepSeed = (frame: number, hold = 2, name = "a0") => Math.floor(stepRand(name, frame, hold, "int") * 2147483646);

/** Hit envelope on a cut: 1 on `at`, about 0.05 after `decay` frames, 0 before. */
export const burst = (frame: number, at: number, decay = 6) => (frame < at ? 0 : Math.exp((-3 * (frame - at)) / Math.max(1, decay)));

/** Sum of hits on a list of cut frames (capped at 1). */
export const bursts = (frame: number, cuts: number[], decay = 6) => Math.min(1, cuts.reduce((a, c) => a + burst(frame, c, decay), 0));

/** Camera shake: smooth noise (a handheld jolt), translate only. */
export const shake = (frame: number, seed: string, amp: number, speed = 0.45) => ({
  x: amp * noise2D(`${seed}x`, frame * speed, 0),
  y: amp * noise2D(`${seed}y`, frame * speed, 0),
});

/** Integrate a speed curve (units per frame) from 0 to `frame`. */
export const integrate = (frame: number, speed: (f: number) => number) => {
  let s = 0;
  const whole = Math.floor(frame);
  for (let f = 0; f < whole; f++) s += speed(f);
  return s + speed(whole) * (frame - whole);
};

/** Punch-in: 0 → about +13% in 2 frames, easing back to a held +6% by about 12 frames (times `amt`). */
export const punchAt = (f: number, at: number, amt = 1) => {
  const t = f - at;
  if (t <= 0) return 0;
  return amt * (0.06 + 0.14 * Math.exp(-t / 4)) * (1 - Math.exp(-t / 0.8));
};

/** Whip between strip positions: a hard in-out, most of the travel in the middle 2 frames. */
export const WHIP_EASE = Easing.bezier(0.75, 0, 0.25, 1);
export const whipAt = (f: number, at: number, dur: number, from: number, to: number) =>
  interpolate(f, [at, at + dur], [from, to], { ...clamp, easing: WHIP_EASE });

export type Cam = { x: number; y: number; s: number };

/** Screen velocity (px/frame) and zoom rate (Δs/s per frame) of a camera path, by central differences. */
export const camMotion = (path: (f: number) => Cam, f: number) => {
  const a = path(f - 0.5);
  const b = path(f + 0.5);
  const c = path(f);
  return { vx: -(b.x - a.x) * c.s, vy: -(b.y - a.y) * c.s, zoomRate: (b.s - a.s) / c.s };
};
