import { SFX } from "./audio/Sfx";
import { DAY } from "./brand/tokens";
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
  sfx?: CutSfx | CutSfx[];
  /**
   * Open as a REVEAL (the kit's SlipReveal, A2's DaySlipReveal behaviour) instead of holding the bands and cutting:
   * split on the cut's first frame with the band already landed (`lead` of the 2-frame slip done), then the bands
   * clear progressively so the next world grows every frame and is fully open on `frames`.
   */
  reveal?: { lead?: number; slipFrames?: number };
} & SlipCutOptions;
export type SlipPushSceneCut = { kind: "slipPush"; frames: number; direction?: "left" | "right"; maxBlur?: number; sfx?: CutSfx | CutSfx[] };
export type WhipSceneCut = { kind: "whip"; frames: number; dir: "left" | "right" | "up" | "down"; maxBlur?: number; sfx?: CutSfx | CutSfx[] };
export type PushSceneCut = { kind: "push"; frames: number; flash?: string; sfx?: CutSfx | CutSfx[] };
export type SceneCut = SlipSceneCut | SlipPushSceneCut | WhipSceneCut | PushSceneCut;

export const CUTS: Record<string, SceneCut> = {
  // v5 (video/V5.md section 7). Each cut is drawn over the incoming scene's first frames; whips and pushes end in a
  // landing tick (R6 section 6.7: a swell alone does not read as sync). The incoming scene's first sound leads its
  // picture from LEADS (below), at film level.
  // LOOP to AGENTS (1575): a whip to the left, the seam at 3.5 of 9 frames.
  LOOP: { kind: "whip", frames: 9, dir: "left", sfx: [{ id: "whoosh-short", at: 4 }, { id: "tick-soft", at: 8 }] },
  // AGENTS to FIX (2100): the slip push, the middle band last.
  AGENTS: { kind: "slipPush", frames: 12, direction: "left", sfx: [{ id: "whoosh-short", at: 6 }, { id: "tick-soft", at: 11 }] },
  // JIRA to CLOSE (2880, endHit): the three-band slip reveal into the end card on the score's hit (no effect of its
  // own: the hit is the score's; the slip budget is 6 for the film).
  JIRA: { kind: "slip", frames: 8, traceColor: DAY.trace, reveal: { lead: 1, slipFrames: 2 } },
  // PROBLEM to PROMISE (480) and PROMISE to LOOP (900) are drawn by their scenes (the carry cut and slip cut; the
  // rewind with RewindFrom); FIX to JIRA (2550) is a plain cut on an action. v4's entries (A1, P1, P2, P3, P5) are gone;
  // their kinds (slip, slipPush, whip, push, slip with reveal) all stay available.
};

/**
 * J-cuts (V5.md section 8.7, R6 6.7): each section's first sound starts 4 to 10 frames BEFORE its picture. A sound
 * placed inside the incoming scene cannot do that (its Sequence starts on the boundary and clips anything earlier), so
 * these lead sounds live at FILM level: key = the INCOMING scene id; `at` is where the effect's PEAK lands relative to
 * the boundary (negative = before it); its onset is `at - peakFrame`, which should sit 4 to 10 frames before.
 *
 * Defaults: the incoming section's first designed sound, moved to lead its picture. Where a default IS your scene's
 * first sound (PROMISE's slip-alt1 at 0, AGENTS's swish-up at T.open + 6, LOOP's whoosh-short at rewindAt + 20),
 * delete your in-scene copy, or the film plays both.
 *
 * To set your own, in YOUR scene file (no edit here): wrap the default export,
 *   export default withLead(AGENTS, [{ id: "swish-up", at: 4, gainDb: -2 }]);   // [] = no lead for this scene
 * A scene's own lead wins over LEADS. `leadOnset()` tells you where a lead starts (onset = at - peakFrame); Main warns
 * in the Studio and in `remotion render` logs when one does not start 4 to 10 frames early.
 */
export const LEADS: Record<string, CutSfx[]> = {
  // Round 3: placed so each lead is within 6 dB of the score (5 ms RMS) 4 to 10 frames before its cut, measured on the
  // v5 cut-2 stems (audible lead in brackets); every one stays 11 dB or more under the voice in any word it touches.
  // the Day slip: the slide starts 9 frames early, its latch on the cut (PROMISE's own first sound) [8.85 f]
  PROMISE: [{ id: "slip-alt1", at: 0, gainDb: -3 }],
  // into "Rewind a week": a short whoosh starting 7 frames early, its peak 3 frames before the rewind moves [5.95 f]
  LOOP: [{ id: "whoosh-short", at: -3, gainDb: -4 }],
  // the Rovo panel's rise (AGENTS's own first sound), starting 9 frames early, peaking as the whip begins [6.6 f]
  AGENTS: [{ id: "swish-up", at: 1, gainDb: -4 }],
  // a rise that ends on the cut, into the slip push [7.0 f]
  FIX: [{ id: "swish-up", at: 0, gainDb: -6 }],
  // a soft tick 6 frames before the plain cut, under the payoff chime's ring (the L-cut) [5.85 f]
  JIRA: [{ id: "tick-soft", at: -6, gainDb: -6 }],
  // a rise that ends on the end card's hit, audible over the score's riser [8.2 f]
  CLOSE: [{ id: "swish-up", at: 0, gainDb: -4 }],
};

/** A cut's sounds as a list. */
export function cutSfxList(cut: SceneCut): CutSfx[] {
  return cut.sfx === undefined ? [] : Array.isArray(cut.sfx) ? cut.sfx : [cut.sfx];
}

/** Frame (into the cut) where a cut sound peaks (`s`, or the cut's first sound). */
export function sfxAt(cut: SceneCut, s?: CutSfx): number {
  const sfx = s ?? cutSfxList(cut)[0];
  if (sfx?.at !== undefined) return sfx.at;
  if (cut.kind === "slip") return cut.reveal ? 0 : (cut.slipFrames ?? 6);
  return Math.floor(cut.frames / 2);
}

/** Frame (into the cut) where a cut's first sound peaks (v4 name, kept). */
export function cutSfxAt(cut: SceneCut): number {
  return sfxAt(cut);
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

/**
 * A scene's own lead sounds, set in the scene's file: `export default withLead(Scene, [{ id, at, gainDb }])`.
 * `[]` turns the default off. Main plays them at film level (they can start before the scene's first frame).
 */
export function withLead<T extends object>(scene: T, lead: CutSfx[]): T & { lead: CutSfx[] } {
  return Object.assign(scene, { lead });
}

/** The lead sounds of the scene `id`: its own (withLead) if it set any, else the default in LEADS. */
export function leadsFor(id: string, scene?: unknown): CutSfx[] {
  const own = scene ? (scene as { lead?: CutSfx[] }).lead : undefined;
  return own ?? LEADS[id] ?? [];
}

/** Where a lead sound's ONSET lands relative to its boundary (frames; a J-cut wants -10 to -4). */
export function leadOnset(s: CutSfx): number {
  return (s.at ?? 0) - (SFX[s.id]?.peakFrame ?? 0);
}
