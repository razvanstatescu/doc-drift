import type { BarrageLook, Vec3 } from "./barrageShader";

/**
 * Look builders for the barrage pass (px at 1080p), adapted from the Satchel film's H0 (same owner) for a calmer brand
 * (BRIEF section 7: distortion only on third-party plates, only on cut frames). Two kinds of partial:
 *   - the GRADE, constant on every frame: one grade for every third-party plate (warm hues drained, about 25%
 *     desaturated, a cool lift in the shadows, a soft vignette). The light pages are graded down before the pass
 *     (CSS brightness on each plate), as in Satchel.
 *   - the HIT, only on a cut frame and the one after it: RGB split, a turbulence kick, a few slices, scanlines.
 * Motion blur (whips, punches, the dive, the tunnel) is camera motion, not distortion, so it runs whenever the camera
 * moves. mergeLooks() adds the amounts up.
 */
type Partial = Omit<BarrageLook, "time" | "seed">;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The one grade for all third-party plates. */
export const gradeLook = (): Partial => ({
  warm: 1,
  desat: 0.25,
  contrast: 0.04,
  shadowTint: [0.9, 0.97, 1.04] as Vec3,
  vignette: 0.32,
});

/**
 * A cut's hit at intensity i (0..1; i = burst(f, cut, decay)). `slices` scales the slice glitch (0 on light pages,
 * where a shifted band would move page white across the black: local flashes).
 */
export const hitLook = (i: number, frame: number, slices = 1): Partial => {
  if (i <= 0.001) return {};
  return {
    rgb: lerp(0, 16, Math.pow(i, 1.4)),
    rgbAngle: 0.18 * Math.sin(frame * 0.7),
    rgbRadial: 0.5,
    warp: lerp(0, 46, i * i),
    warpSize: 340,
    warpEvo: frame * 0.21,
    slices: slices * Math.max(0, i - 0.35) * 0.9,
    sliceShift: lerp(20, 120, i),
    scan: 0.22 * i,
    scanGap: 4,
    roll: 0.5 * i,
    grain: 0.12 * i,
  };
};

/** Motion blur from a camera velocity (px/f) and zoom rate; shutter 0.5 = 180°. */
export const motionLook = (vx: number, vy: number, zoomRate: number, shutter = 0.5): Partial => ({
  blurX: vx * shutter,
  blurY: vy * shutter,
  zoom: Math.min(0.3, Math.abs(zoomRate) * shutter),
});

/** Later partials win, except the amounts listed here, which add up. */
const ADDITIVE = new Set(["wave", "sway", "warp", "rgb", "slices", "scan", "roll", "grain", "blurX", "blurY", "zoom", "flash"]);
export const mergeLooks = (time: number, seed: number, ...parts: Partial[]): BarrageLook => {
  const out: Record<string, unknown> = { time, seed };
  for (const p of parts) {
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) continue;
      if (ADDITIVE.has(k) && typeof v === "number" && typeof out[k] === "number") out[k] = (out[k] as number) + v;
      else out[k] = v;
    }
  }
  return out as BarrageLook;
};
