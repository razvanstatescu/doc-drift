import React from "react";
import { AbsoluteFill, Freeze, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, H, tween, W } from "../../lib/time";
import { DAY, FONT, type Rect } from "../look";
import { stageToScreen, type Cam3 } from "./camera3d";
import { InkLabel } from "./stage";

/**
 * Carry cuts and the rewind (v5, R6 technique 3, promoted from src/v5/lab/CarryCuts): one object holds its place on
 * screen through the seam while the world changes around it, so the eye never resets.
 *   1. Find the carried rect on screen in the outgoing world: `screenRectOf(cam3At(...), stageRect)` (or a twin's
 *      `pageRects()` through the camera).
 *   2. Build the incoming camera so the same element lands on the same rect: `cameraToMatch(screenRect, stageRect)` is
 *      a camera pose ({ x, y, zoom }) for the incoming world's first key (dur 0).
 *   3. GrowReveal (the incoming world opens as a window growing out of the object) or PushSwap (both worlds push while
 *      the object flies, with KineticDock, into its slot; the slot shows a trace until it lands).
 *   4. Draw the carried object on top with CarryHold, in the incoming twin's own metrics (else it doubles at the seam).
 * RewindFrom plays another scene's frames backwards, fast, with a light scrub texture and a "Last week" chip.
 */

/** A stage rect on the screen for a pose (2D: yaw and pitch ignored). */
export function screenRectOf(pose: Cam3, r: Rect): Rect {
  const [x0, y0] = stageToScreen(pose, r.x, r.y);
  const [x1, y1] = stageToScreen(pose, r.x + r.w, r.y + r.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The camera (x, y, zoom) that puts the stage rect `stage` exactly on the screen rect `screen` (zoom from the widths). */
export function cameraToMatch(screen: Rect, stage: Rect): { x: number; y: number; zoom: number } {
  const zoom = screen.w / stage.w;
  return {
    x: stage.x + stage.w / 2 - (screen.x + screen.w / 2 - W / 2) / zoom,
    y: stage.y + stage.h / 2 - (screen.y + screen.h / 2 - H / 2) / zoom,
    zoom,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });

/**
 * The grow reveal: the incoming world opens as a rounded window growing out of `from` (the carried object's screen
 * rect, padded) to the whole frame over `dur` frames (expo in-out), while the outgoing world scales 1 to 1.05 and
 * darkens (`darken` 0.5: Night to Day). Before `at` only the outgoing world; after the reveal only the incoming one.
 */
export const GrowReveal: React.FC<{
  at: number;
  dur?: number;
  from: Rect;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
  /** Padding around the object's rect at the start (default [14, 10]). */
  pad?: [number, number];
  radius?: number;
  darken?: number;
}> = ({ at, dur = 16, from, outgoing, incoming, pad = [14, 10], radius = 14, darken = 0.5 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return <AbsoluteFill>{outgoing}</AbsoluteFill>;
  const g = tween(frame, at, at + dur, 0, 1, EASE.expoInOut);
  if (g >= 1) return <AbsoluteFill>{incoming}</AbsoluteFill>;
  const start: Rect = { x: from.x - pad[0], y: from.y - pad[1], w: from.w + 2 * pad[0], h: from.h + 2 * pad[1] };
  const win = lerpRect(start, { x: -40, y: -40, w: W + 80, h: H + 80 }, g);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${1 + 0.05 * g})`, filter: darken > 0 ? `brightness(${1 - darken * g})` : undefined }}>{outgoing}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(${win.y}px ${W - win.x - win.w}px ${H - win.y - win.h}px ${win.x}px round ${lerp(radius, 0, g)}px)` }}>{incoming}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The locked push: the outgoing world pushes out and the incoming pushes in (expo in-out), side by side. */
export const PushSwap: React.FC<{ at: number; dur?: number; outgoing: React.ReactNode; incoming: React.ReactNode; dir?: "left" | "right" }> = ({
  at,
  dur = 14,
  outgoing,
  incoming,
  dir = "left",
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return <AbsoluteFill>{outgoing}</AbsoluteFill>;
  const p = tween(frame, at, at + dur, 0, 1, EASE.expoInOut);
  if (p >= 1) return <AbsoluteFill>{incoming}</AbsoluteFill>;
  const sign = dir === "left" ? -1 : 1;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateX(${sign * p * W}px)` }}>{outgoing}</AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${sign * (p - 1) * W}px)` }}>{incoming}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The carried object, drawn at a screen rect on top of both worlds (lay it out at the rect's size). */
export const CarryHold: React.FC<{ rect: Rect; children?: React.ReactNode; style?: React.CSSProperties }> = ({ rect, children, style }) => (
  <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, ...style }}>{children}</div>
);

// ---------------------------------------------------------------------------------------------------------------------
// RewindFrom
// ---------------------------------------------------------------------------------------------------------------------

/** Sine in-out: the speed peaks at 1.57x the average, so the reverse motion is visible from start to end. */
export const sineInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const warnedShort = new Set<string>();
const warnShort = (m: string) => {
  if (warnedShort.has(m)) return;
  warnedShort.add(m);
  console.warn(m);
};

/**
 * "Rewind a week": another scene's frames played BACKWARDS, fast, from source frame `from` back across `span` source
 * frames in `dur` output frames (sine in-out by default, so the reverse motion is visible over the whole rewind: give it 15
 * to 20 frames or more, starting on "Rewind"), with a light scrub
 * texture (a few moving scan lines, a slight vertical blur scaled by speed) and a chip ("Last week"). Pass the other
 * scene as children (it is frozen frame by frame, so its sound is muted):
 *
 *   {frame < 20 ? <RewindFrom from={419} span={150} dur={20} chip="Last week"><PROMISE /></RewindFrom> : <LoopWorld />}
 *
 * `span` may be many times `dur` (PROMISE's whole 420 frames in 26, say): while the rewind runs fast, each output frame
 * blends `blend` source frames spread over the stretch it passes (v5 round 3), so a long span reads as a smeared reverse
 * scrub and the source's own cuts become short dissolves instead of one-frame jumps.
 *
 * Crafted scenes only: a recording inside a Freeze can show the wrong frame (use RealTake's VideoAt for footage).
 */
export const RewindFrom: React.FC<{
  from: number;
  span: number;
  dur: number;
  /** Start the rewind at this local frame (default 0). */
  at?: number;
  /** The chip (default "Last week"; null for none). It stays up `chipHold` frames past the end (default 0). */
  chip?: string | null;
  chipHold?: number;
  /** Scrub texture strength 0 to 1 (default 1). */
  texture?: number;
  /** The speed curve (default sine in-out: the reverse motion stays visible over the whole rewind; v5 round 2). */
  ease?: (t: number) => number;
  /** Source frames blended into each output frame while it runs at 1.5 source frames a frame or more (default 6, at
   *  most 8; 1 = off). Each sample renders the children once more (only on the fast frames). */
  blend?: number;
  /** The stretch of source travel each output frame blends, in output frames (default 2.5: neighbours overlap, so a
   *  source cut dissolves over about 3 frames). */
  shutter?: number;
  children: React.ReactNode;
}> = ({ from, span, dur, at = 0, chip = "Last week", texture = 1, ease = sineInOut, blend = 6, shutter = 2.5, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (dur < 15) warnShort(`RewindFrom: ${dur} frames reads as a jump, not a rewind; give it 15 to 20 frames or more (V5 round 2)`);
  // Remotion clamps a frozen frame to the composition's last frame: in a composition shorter than `from`, the rewind
  // would show the wrong frames (Main and the scene compositions are long enough; a short test composition is not)
  if (from >= durationInFrames) warnShort(`RewindFrom: from ${from} is past this composition's last frame (${durationInFrames - 1}); Remotion clamps it, so the rewind shows the wrong frames here`);
  const srcAt = (f: number) => Math.max(0, Math.round(from - span * tween(f, at, at + dur, 0, 1, ease)));
  const speed = Math.abs(tween(frame + 0.5, at, at + dur, 0, 1, ease) - tween(frame - 0.5, at, at + dur, 0, 1, ease)) * span; // source frames per frame
  // the temporal blend: n samples spread over the source stretch this frame passes (equal weights; repeats merge)
  const n = speed >= 1.5 ? Math.max(1, Math.min(8, Math.round(blend))) : 1;
  const samples: { f: number; w: number }[] = [];
  for (let i = 0; i < n; i++) {
    const s = srcAt(n === 1 ? frame : frame + (-0.5 + (i + 0.5) / n) * shutter);
    const last = samples[samples.length - 1];
    if (last && last.f === s) last.w += 1 / n;
    else samples.push({ f: s, w: 1 / n });
  }
  let acc = 0;
  const layers = samples.map((sm, i) => {
    acc += sm.w;
    // stacked over the layers below at w / (sum so far): the result is the weighted average of all samples
    return (
      <AbsoluteFill key={i} style={{ opacity: i === 0 ? undefined : sm.w / acc }}>
        <Freeze frame={sm.f}>{children}</Freeze>
      </AbsoluteFill>
    );
  });
  const k = Math.min(1, speed / 12) * texture;
  const lines = [0.18, 0.43, 0.71, 0.86].map((y0, i) => ((y0 + frame * (0.037 + i * 0.011)) % 1) * H);
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      <AbsoluteFill style={{ filter: k > 0.05 ? `blur(${(1.2 * k).toFixed(2)}px)` : undefined, transform: k > 0.05 ? `translateY(${(Math.sin(frame * 2.1) * 2 * k).toFixed(2)}px)` : undefined }}>
        {layers}
      </AbsoluteFill>
      {k > 0.05
        ? lines.map((y, i) => (
            <div key={i} style={{ position: "absolute", left: 0, top: y, width: W, height: 2 + (i % 2), background: `rgba(255, 255, 255, ${(0.35 * k).toFixed(3)})`, pointerEvents: "none" }} />
          ))
        : null}
      {chip ? (
        <div style={{ position: "absolute", left: 64, top: 56, opacity: tween(frame, at, at + 4, 0, 1, EASE.linear), fontFamily: FONT.sans }}>
          <InkLabel icon="history" size={26}>
            {chip}
          </InkLabel>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
