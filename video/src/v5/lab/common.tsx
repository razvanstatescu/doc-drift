import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { dB } from "../../audio/mix";
import { EASE, FPS, H, W, tween } from "../../lib/time";
import { cam3At, cam3Transform, stageToScreen, type Cam3, type Cam3Key } from "../../v4/kit";
import { DAY, FONT, ink, type Rect } from "../../v4/look";

/**
 * R6 lab helpers (v5 motion research, docs/video/v5/R6-motion-and-editing.md). Built ON the v4 kit, never inside it.
 *   Bed            the film's score from a chosen film frame, so the lab's frames sit on the film's beat grid
 *   remap()        a monotone time remap (speed ramps) for real recordings: output frame -> source seconds
 *   capPose()      the kit's camera (log-space zoom, creep, float) driven in CAPTURE px (3840 x 2160)
 *   CaptureWorld   a 4K capture laid out at its own size and scaled by the camera (crisp up to 1 film px per capture px)
 *   Spotlight      the rest of the frame veiled and softened, a rounded window on the detail that matters
 */

// ---------------------------------------------------------------------------------------------------------------------
// The score on the film's beat grid
// ---------------------------------------------------------------------------------------------------------------------

/** Film frame where the score starts (timeline.json music[0].from). */
const SCORE_FROM = 277;

/**
 * The film's score from film frame `filmFrom`. With filmFrom % 15 === 7 (a body beat), the lab's beats fall on
 * multiples of 15 and its bars wherever (filmFrom + f) % 60 === 37 (filmFrom 2077: bars on 0, 60, 120 ...).
 */
export const Bed: React.FC<{ filmFrom: number; dur: number; gainDb?: number }> = ({ filmFrom, dur, gainDb = -15 }) => (
  <Audio name="bed" src={staticFile("music/score.wav")} trimBefore={filmFrom - SCORE_FROM} durationInFrames={dur} volume={dB(gainDb)} />
);

// ---------------------------------------------------------------------------------------------------------------------
// Speed ramps: a monotone cubic time remap (Fritsch-Butland tangents: smooth speed changes, never backwards)
// ---------------------------------------------------------------------------------------------------------------------

/** A remap key: output frame `f` shows source second `t`. Keys must increase in both. */
export type RemapKey = { f: number; t: number };

function tangents(k: RemapKey[]): number[] {
  const n = k.length;
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) m.push((k[i + 1].t - k[i].t) / (k[i + 1].f - k[i].f));
  const d: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) d.push(m[i - 1] * m[i] <= 0 ? 0 : 2 / (1 / m[i - 1] + 1 / m[i]));
  d.push(m[n - 2]);
  return d;
}

/** Source seconds shown at output frame `f`. Before the first key / after the last, it runs at 1x. */
export function remap(f: number, keys: RemapKey[]): number {
  const k = keys;
  if (f <= k[0].f) return k[0].t + (f - k[0].f) / FPS;
  const last = k[k.length - 1];
  if (f >= last.f) return last.t + (f - last.f) / FPS;
  const d = tangents(k);
  let i = 0;
  while (i < k.length - 2 && f > k[i + 1].f) i++;
  const h = k[i + 1].f - k[i].f;
  const s = (f - k[i].f) / h;
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
  const h10 = s ** 3 - 2 * s ** 2 + s;
  const h01 = -2 * s ** 3 + 3 * s ** 2;
  const h11 = s ** 3 - s ** 2;
  return h00 * k[i].t + h10 * h * d[i] + h01 * k[i + 1].t + h11 * h * d[i + 1];
}

/**
 * A recording shown at an arbitrary source second on this frame (the speed-ramp player). Measured in this lab: a
 * <Freeze> around OffthreadVideo or @remotion/media's Video does NOT reliably show the frozen time on this 4K, 60 fps,
 * 0.5 s-GOP capture (it showed the first seconds); a one-frame Sequence starting on the current frame with
 * `trimBefore` = the source frame does, on every frame tested (out/v5/r6/stills/dbg2-sheet.jpg).
 */
export const VideoAt: React.FC<{ src: string; t: number; style?: React.CSSProperties }> = ({ src, t, style }) => {
  const frame = useCurrentFrame();
  return (
    <Sequence from={frame} durationInFrames={1} layout="none">
      <OffthreadVideo src={src} muted trimBefore={Math.max(0, Math.round(t * FPS))} style={style} />
    </Sequence>
  );
};

/** Playback rate at output frame `f` (1 = real time). */
export const rateAt = (f: number, keys: RemapKey[]) => (remap(f + 0.5, keys) - remap(f - 0.5, keys)) * FPS;

// ---------------------------------------------------------------------------------------------------------------------
// A camera in capture px
// ---------------------------------------------------------------------------------------------------------------------

export const CAP = { w: 3840, h: 2160 } as const;

/** A camera key in capture px: `cx`, `cy` the capture point at the centre of the view, `s` film px per capture px. */
export type CapKey = { at: number; dur?: number; to: { cx?: number; cy?: number; s?: number }; ease?: (t: number) => number };

/** Keep the view inside the capture (no edge ever shows), with a margin for the float. */
function clampCenter(cx: number, cy: number, s: number, margin = 10): [number, number] {
  const hx = (W / 2 + margin) / s;
  const hy = (H / 2 + margin) / s;
  return [Math.min(CAP.w - hx, Math.max(hx, cx)), Math.min(CAP.h - hy, Math.max(hy, cy))];
}

/**
 * The pose at a frame, from capture-px keys: the kit's cam3At (log-space zoom, Pot's straight-path look-at, creep and
 * a hand-held float) on a stage where the capture fits the frame at zoom 1 (stage px = capture px / 2, zoom = 2s).
 */
export function capPose(frame: number, keys: CapKey[], opts: { creep?: number; float?: number; seed?: string } = {}): Cam3 {
  let cur = { cx: CAP.w / 2, cy: CAP.h / 2, s: 0.5 };
  const k3: Cam3Key[] = keys.map((k) => {
    const s = k.to.s ?? cur.s;
    const [cx, cy] = clampCenter(k.to.cx ?? cur.cx, k.to.cy ?? cur.cy, s);
    cur = { cx, cy, s };
    return { at: k.at, dur: k.dur, ease: k.ease, to: { x: cx / 2, y: cy / 2, zoom: s * 2 } };
  });
  return cam3At(frame, k3, { creep: opts.creep ?? 1, float: opts.float ?? 3, seed: opts.seed ?? "lab" });
}

/** A capture point (capture px) on the screen (film px) for a pose. */
export const capToScreen = (pose: Cam3, x: number, y: number): [number, number] => stageToScreen(pose, x / 2, y / 2);

/** A capture rect on the screen. */
export function capRectToScreen(pose: Cam3, r: Rect): Rect {
  const [x0, y0] = capToScreen(pose, r.x, r.y);
  const [x1, y1] = capToScreen(pose, r.x + r.w, r.y + r.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Film px per capture px on screen for a pose (the crispness rule: keep it at 1 or less). */
export const screenScale = (pose: Cam3) => pose.zoom / 2;

/** The capture world: children are laid out in capture px (3840 x 2160) and scaled by the camera. */
export const CaptureWorld: React.FC<{ pose: Cam3; children: React.ReactNode; background?: string }> = ({ pose, children, background = "#FFFFFF" }) => (
  <AbsoluteFill style={{ overflow: "hidden", background }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: cam3Transform(pose) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: CAP.w, height: CAP.h, transformOrigin: "0 0", transform: "scale(0.5)" }}>{children}</div>
    </div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------------------------------------------------
// Spotlight
// ---------------------------------------------------------------------------------------------------------------------

/** A spotlight key: from `at` over `dur` frames (expo out) the window moves to `rect` (capture px) at `amount` (0..1). */
export type SpotKey = { at: number; dur?: number; rect: Rect; amount: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The spotlight's capture rect and amount at a frame. */
export function spotAt(frame: number, keys: SpotKey[]): { rect: Rect; amount: number } {
  let rect = keys[0].rect;
  let amount = keys[0].amount;
  for (const k of keys) {
    if (frame < k.at) break;
    const t = tween(frame, k.at, k.at + (k.dur ?? 14), 0, 1, EASE.expoOut);
    rect = { x: lerp(rect.x, k.rect.x, t), y: lerp(rect.y, k.rect.y, t), w: lerp(rect.w, k.rect.w, t), h: lerp(rect.h, k.rect.h, t) };
    amount = lerp(amount, k.amount, t);
  }
  return { rect, amount };
}

const roundRect = (r: Rect, rad: number) => {
  const q = Math.max(0, Math.min(rad, r.w / 2, r.h / 2));
  return `M${r.x + q} ${r.y} H${r.x + r.w - q} A${q} ${q} 0 0 1 ${r.x + r.w} ${r.y + q} V${r.y + r.h - q} A${q} ${q} 0 0 1 ${r.x + r.w - q} ${r.y + r.h} H${r.x + q} A${q} ${q} 0 0 1 ${r.x} ${r.y + r.h - q} V${r.y + q} A${q} ${q} 0 0 1 ${r.x + q} ${r.y} Z`;
};

/**
 * The spotlight in screen px: outside a rounded window the picture is veiled with Paper, softened and drained (R2's
 * modal scrim, so a real capture's own colours never compete with the detail); a hairline ring draws the window.
 */
export const Spotlight: React.FC<{ rect: Rect; amount: number; radius?: number; veil?: number }> = ({ rect, amount, radius = 18, veil = 0.6 }) => {
  if (amount <= 0.01) return null;
  const hole = roundRect(rect, radius);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `rgba(242, 246, 247, ${(veil * amount).toFixed(3)})`,
          backdropFilter: `blur(${(3.5 * amount).toFixed(2)}px) grayscale(${(0.7 * amount).toFixed(2)})`,
          clipPath: `path(evenodd, "M-20 -20 H${W + 20} V${H + 20} H-20 Z ${hole}")`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: radius,
          boxShadow: `0 0 0 2px ${ink(0.16 * amount)}, 0 18px 48px ${ink(0.1 * amount)}`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------------------------------------------------

/** A white card for a running number (the honest clock). */
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; level?: number }> = ({ children, style }) => (
  <div style={{ background: DAY.surface, borderRadius: 26, padding: "22px 30px 24px", fontFamily: FONT.sans, color: DAY.text, ...style }}>{children}</div>
);

/** Frame-local helper: the current frame. */
export const useF = () => useCurrentFrame();
