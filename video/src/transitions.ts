import { DAY, NIGHT } from "./brand/tokens";
import { EASE, H, W } from "./lib/time";
import type { SlipCutOptions } from "./motion/slip";

/**
 * Cuts BETWEEN scenes (Kit owner; V4.md section 4). Key = the OUTGOING scene id. Every scene still starts exactly on
 * its timeline frame (audio sync): a cut is drawn over the INCOMING scene's first `frames` frames, from the outgoing
 * scene's FROZEN last frame (its Sequence runs `frames` longer, frozen) and the incoming scene, which the cut moves as
 * its kind needs. The cut's sound sits at film level, so neither scene's Sequence can clip it.
 *
 *   slip      T1: the outgoing frame splits in the mark's three bands, the middle slips one unit, the incoming scene is
 *             still behind; the bands vanish on the last frame (or "clear").
 *   slipPush  T5: both frames split in the three bands; each band of the outgoing frame pushes out while the same band
 *             of the incoming scene pushes in (expo in-out), top first, bottom 2 frames later, the middle last (the
 *             slip), with a directional blur scaled by speed.
 *   whip      T9: the two frames travel on one strip (`dir` = where the content goes); the seam crosses the centre half
 *             way through the cut, the fastest frame (the whoosh peaks there); directional blur scaled by speed.
 *   push      T8: the outgoing frame pushes in to 1.04 (quad in), cut at 5/11 with a 2-frame Paper flash at 12%,
 *             the incoming scene settles from 1.04 to 1 (quad out).
 *
 * Consequences for builders: end your scene on its final pose (its last frame is what leaves), and open the next one
 * already composed and moving (its first frames are seen through the cut).
 */

/** A cut's sound: the effect's PEAK lands `at` frames into the cut (default: the band's landing, or the middle). */
export type CutSfx = { id: string; at?: number; gainDb?: number };

export type SlipSceneCut = {
  kind: "slip";
  frames: number;
  sfx?: CutSfx;
  /**
   * Open as a REVEAL (the kit's SlipReveal, A2's DaySlipReveal behaviour) instead of holding the bands and cutting:
   * split on the cut's first frame with the band already landed (`lead` of the 2-frame slip done), then the bands
   * clear progressively so the next world grows every frame and is fully open on `frames`.
   */
  reveal?: { lead?: number; slipFrames?: number };
} & SlipCutOptions;
export type SlipPushSceneCut = { kind: "slipPush"; frames: number; direction?: "left" | "right"; maxBlur?: number; sfx?: CutSfx };
export type WhipSceneCut = { kind: "whip"; frames: number; dir: "left" | "right" | "up" | "down"; maxBlur?: number; sfx?: CutSfx };
export type PushSceneCut = { kind: "push"; frames: number; flash?: string; sfx?: CutSfx };
export type SceneCut = SlipSceneCut | SlipPushSceneCut | WhipSceneCut | PushSceneCut;

export const CUTS: Record<string, SceneCut> = {
  // A1 to A2: the film's change of light. Since v1 the PICTURE of this cut lives in A2's first frames
  // (src/components/A2/DaySlipReveal, fed A1's frozen last frame): the frame is already split on A2's first frame
  // (markers.daySlip, the score's lift), the Paper world is behind the slipped band, and the bands clear by frame 6.
  // So this entry carries the SOUND only: `frames: 0` adds no picture tail, and the slip's latch lands on daySlip with
  // the band and the lift (the slide part of the sound runs over A1's last frames, at film level, so nothing is clipped).
  A1: { kind: "slip", frames: 0, traceColor: DAY.trace, sfx: { id: "slip", at: 0 } },
  // P1 to P2 (2077): P1's last frame leaves in three bands over P2's opening; the whoosh peaks mid-cut.
  P1: { kind: "slipPush", frames: 12, direction: "left", sfx: { id: "whoosh-short", at: 6 } },
  // P2 to P3 (2617): a whip to the left, the seam on frame 4.5.
  P2: { kind: "whip", frames: 9, dir: "left", sfx: { id: "whoosh-short", at: 4 } },
  // P3 to P4 (3277): a whip downward (the content travels down; P4 comes in from the top).
  P3: { kind: "whip", frames: 9, dir: "down", sfx: { id: "whoosh-short", at: 4 } },
  // P5 to A4 (4177, on the bar): the film's last change of light, as a reveal (QA 2026-11-16: the held bands then a
  // hard Day-to-Night cut at 4185 read as a cut 8 frames late). The Day frame is split on the bar with the middle band
  // one unit out (landed: lead 1 of the 2-frame slip) and its Night trace; A4's Night shows in the cuts and grows every
  // frame as the top and bottom bands slide out left and the middle carries on right; fully open at 4185. The slip's
  // latch lands on the bar, with the band.
  P5: { kind: "slip", frames: 8, traceColor: NIGHT.trace, reveal: { lead: 1, slipFrames: 2 }, sfx: { id: "slip", at: 0 } },
};

/** Frame (into the cut) where a cut's sound peaks. */
export function cutSfxAt(cut: SceneCut): number {
  if (cut.sfx?.at !== undefined) return cut.sfx.at;
  if (cut.kind === "slip") return cut.reveal ? 0 : (cut.slipFrames ?? 6);
  return Math.floor(cut.frames / 2);
}

// ---------------------------------------------------------------------------------------------------------------------
// Geometry (pure; Main draws both sides of a cut from the same numbers)
// ---------------------------------------------------------------------------------------------------------------------

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The mark's three bands as [y0, y1] px (band 94, cut 12, band 60, cut 12, band 94 on 272; cuts split evenly). */
export function cutBands(h = H): [number, number][] {
  const u = h / 272;
  const c1 = (94 + 6) * u;
  const c2 = (94 + 12 + 60 + 6) * u;
  return [
    [0, c1],
    [c1, c2],
    [c2, h],
  ];
}

/** slipPush at frame f of the cut: per band [top, middle, bottom], the outgoing offset (px) and the blur (px). */
export function slipPushAt(f: number, cut: SlipPushSceneCut): { y0: number; y1: number; out: number; in: number; blur: number }[] {
  const frames = cut.frames;
  const sign = (cut.direction ?? "left") === "left" ? -1 : 1;
  const step = frames >= 10 ? 2 : 1;
  const travel = Math.max(4, frames - 2 * step);
  const delays = [0, 2 * step, step]; // top, middle (last), bottom
  const maxBlur = cut.maxBlur ?? 28;
  const p = (g: number, d: number) => EASE.expoInOut(clamp01((g - d) / travel));
  // sampled one frame ahead: the cut's first frame already moves and its last frame is home
  return cutBands().map(([y0, y1], i) => {
    const t = p(f + 1, delays[i]);
    const v = Math.abs(p(f + 1.5, delays[i]) - p(f + 0.5, delays[i])) * W; // px per frame
    const out = sign * t * W;
    return { y0, y1, out, in: out - sign * W, blur: Math.min(maxBlur, v * 0.06) };
  });
}

/** whip at frame f of the cut: the outgoing offset along the axis, the incoming one, and the blur. */
export function whipAt(f: number, cut: WhipSceneCut): { axis: "x" | "y"; out: number; in: number; blur: number } {
  const frames = cut.frames;
  const half = frames / 2;
  const travel = (g: number) => (g <= 0 ? 0 : g >= frames ? 1 : g < half ? 0.5 * EASE.expoIn(g / half) : 0.5 + 0.5 * EASE.expoOut((g - half) / half));
  const horizontal = cut.dir === "left" || cut.dir === "right";
  const sign = cut.dir === "left" || cut.dir === "up" ? -1 : 1;
  const span = horizontal ? W : H;
  const t = travel(f + 1); // one frame ahead: frame 0 already moves, the last frame has landed (seam at f = 3.5 of 9)
  const v = Math.abs(travel(f + 1.5) - travel(f + 0.5)) * span;
  const out = sign * t * span;
  return { axis: horizontal ? "x" : "y", out, in: out - sign * span, blur: Math.min(cut.maxBlur ?? 40, v * 0.05) };
}

/** push at frame f of the cut: which side shows, its scale, and the flash opacity. */
export function pushAt(f: number, cut: PushSceneCut): { side: "out" | "in"; scale: number; flash: number } {
  const frames = Math.max(2, cut.frames);
  const cutAt = Math.max(1, Math.round((frames * 5) / 11));
  if (f < cutAt) {
    const t = clamp01((f + 1) / cutAt);
    return { side: "out", scale: 1 + 0.04 * t * t, flash: f === cutAt - 1 ? 0.06 : 0 };
  }
  const t = clamp01((f - cutAt + 1) / (frames - cutAt));
  const q = 1 - (1 - t) * (1 - t);
  return { side: "in", scale: 1.04 - 0.04 * q, flash: Math.max(0, 0.12 * (1 - (f - cutAt) / 2)) };
}

/** The flash colour of a push cut (default Paper). */
export const pushFlash = (cut: PushSceneCut) => cut.flash ?? DAY.ground;
