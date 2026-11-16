import React, { useContext, useId } from "react";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SLIP_UNIT } from "../../brand/tokens";
import { EASE, H, W, tween } from "../../lib/time";
import { DAY, sweep, type Rect } from "../look";
import { MorphRevealContext, ProofFrame, ProofMat, proofInfo } from "./proof";
import { StageContext } from "./stage";

/**
 * The v4 transitions inside a scene (R3 section 4): T3 MorphToReal, T4 RebuildFromReal, T5 SlipPush, T6 ZoomThrough,
 * T8 PushCut, T9 WhipBlur. `from`, `to`, `twin` and `proof` are full-stage nodes (laid out in film px on the 1920 x
 * 1080 stage), so the moves can transform them in stage coordinates. `at` and `dur` are local frames.
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------------------------------------------------------------
// T3 and T4
// ---------------------------------------------------------------------------------------------------------------------

export type MorphProps = {
  at: number;
  /** Frames (T3 default 9). */
  dur?: number;
  /** The twin element's rect, film px. */
  fromRect: Rect;
  /** The same element's rect inside the proof at its final place (`proofPoint`). */
  toRect: Rect;
  twin: React.ReactNode;
  proof: React.ReactNode;
  /**
   * The twin while the proof is up (round 2, QA K-1: the twin must not show its own words at a second size around
   * the proof). Opacity (default 0.18, was 0.4), blur in px (default 7) and drain to grey 0 to 1 (default 1, R2's
   * modal scrim, which also keeps the twin's own amber out of the shot). `twinRest={1} twinBlur={0} twinDrain={0}`
   * keeps the twin as it was.
   */
  twinRest?: number;
  twinBlur?: number;
  twinDrain?: number;
  /** Also hide the twin inside `fromRect` (plus 8 px) while the proof is up (default false). */
  twinMask?: boolean;
  /**
   * The frame the proof starts leaving: the twin returns to itself over 6 frames from here. Default: read from a
   * ProofFrame or ProofMat `proof` (its `at + dur`, unless `exit="none"`); otherwise the twin rests until the scene
   * switches to RebuildFromReal.
   */
  out?: number;
  /** Corner radius of the growing clip (default 24). */
  radius?: number;
  /** The proof's full frame rect (the window grows to it; default the whole stage). */
  frameRect?: Rect;
  /**
   * How the proof is revealed. "inner": the window is handed to the proof's mat (ProofFrame, ProofMat), which clips
   * only its own content and keeps its shadow soft, sized to the window. "layer": the whole proof layer is clipped
   * (any node). "auto" (default): "inner" when `proof` is a ProofFrame or ProofMat element (or a fragment of them).
   */
  clip?: "auto" | "inner" | "layer";
};

/** Is this node a proof mat (or a fragment of them), so MorphToReal can hand it the window? */
function isProofNode(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false;
  if (node.type === ProofFrame || node.type === ProofMat) return true;
  if (node.type === React.Fragment) {
    const kids = React.Children.toArray((node.props as { children?: React.ReactNode }).children);
    return kids.length > 0 && kids.every(isProofNode);
  }
  return false;
}

/** Uniform scale + translate that maps rect `a` onto rect `b` (centres matched; the scale fits the width). */
function rectMap(a: Rect, b: Rect) {
  const s = Math.sqrt((b.w / a.w) * (b.h / a.h));
  return { s, tx: b.x + b.w / 2 - s * (a.x + a.w / 2), ty: b.y + b.h / 2 - s * (a.y + a.h / 2) };
}

/** The twin's state: k = 0 is itself, k = 1 is at rest behind a proof. */
function twinStyle(k: number, rest: { o: number; b: number; d: number }, mask?: Rect): React.CSSProperties | undefined {
  if (k <= 0.001 && !mask) return undefined;
  const o = 1 + (rest.o - 1) * k;
  const b = rest.b * k;
  const d = rest.d * k;
  const filters = [b > 0.2 ? `blur(${b.toFixed(2)}px)` : "", d > 0.01 ? `grayscale(${d.toFixed(3)})` : ""].filter(Boolean).join(" ");
  return {
    opacity: o < 0.999 ? o : undefined,
    filter: filters || undefined,
    clipPath: mask ? `path(evenodd, "M-40 -40 H${W + 40} V${H + 40} H-40 Z M${mask.x} ${mask.y} h${mask.w} v${mask.h} h${-mask.w} Z")` : undefined,
  };
}

/**
 * A ground behind a twin that is dimmed, when no Stage encloses it (a twin that carries its own Stage would otherwise
 * show the film's black through it). Inside a Stage, that Stage's ground is already there.
 */
const TwinGround: React.FC<{ on: boolean }> = ({ on }) => {
  const stage = useContext(StageContext);
  if (!on || stage) return null;
  return <AbsoluteFill style={{ background: sweep() }} />;
};

/**
 * T3, the signature: the proof's element box starts exactly on the twin's element box and the capture grows out of it
 * to its frame (expo out) while the twin steps back (dims, blurs and drains over 6 frames); when the proof leaves
 * (`out`, or a ProofFrame's own `at + dur`) the twin comes back over 6 frames. Before `at` only the twin shows.
 */
export const MorphToReal: React.FC<MorphProps> = ({
  at,
  dur = 9,
  fromRect,
  toRect,
  twin,
  proof,
  twinRest = 0.18,
  twinBlur = 7,
  twinDrain = 1,
  twinMask = false,
  out,
  radius = 24,
  frameRect,
  clip = "auto",
}) => {
  const frame = useCurrentFrame();
  const e = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  const outAt = out ?? proofInfo(proof)?.end;
  const k = tween(frame, at + 1, at + 7, 0, 1, EASE.expoOut) * (outAt !== undefined ? 1 - tween(frame, outAt, outAt + 6, 0, 1, EASE.expoOut) : 1);
  const m = rectMap(toRect, fromRect); // at e = 0 the proof's element sits on the twin's element
  const s = lerp(m.s, 1, e);
  const tx = lerp(m.tx, 0, e);
  const ty = lerp(m.ty, 0, e);
  const fr = frameRect ?? { x: 0, y: 0, w: W, h: H };
  const box = {
    x: lerp(toRect.x, fr.x, e),
    y: lerp(toRect.y, fr.y, e),
    r: lerp(toRect.x + toRect.w, fr.x + fr.w, e),
    b: lerp(toRect.y + toRect.h, fr.y + fr.h, e),
  };
  const inner = clip === "inner" || (clip === "auto" && isProofNode(proof));
  const win: Rect = { x: box.x, y: box.y, w: box.r - box.x, h: box.b - box.y };
  const mask = twinMask && k > 0.001 ? { x: fromRect.x - 8, y: fromRect.y - 8, w: fromRect.w + 16, h: fromRect.h + 16 } : undefined;
  return (
    <AbsoluteFill>
      <TwinGround on={k > 0.001} />
      <AbsoluteFill style={twinStyle(k, { o: twinRest, b: twinBlur, d: twinDrain }, mask)}>{twin}</AbsoluteFill>
      {frame >= at ? (
        <AbsoluteFill
          style={{
            transformOrigin: "0 0",
            transform: e < 1 ? `translate(${tx}px, ${ty}px) scale(${s})` : undefined,
            clipPath: !inner && e < 1 ? `inset(${box.y}px ${W - box.r}px ${H - box.b}px ${box.x}px round ${radius}px)` : undefined,
          }}
        >
          {inner ? <MorphRevealContext.Provider value={{ rect: win, progress: e, radius }}>{proof}</MorphRevealContext.Provider> : proof}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

export type RebuildProps = {
  at: number;
  /** Frames of the wipe (default 4, round 2: was a 7-frame dissolve). */
  dur?: number;
  /** The proof element's rect (the twin starts matched onto it, round 3). */
  fromRect: Rect;
  /** The twin element's rect (where the twin's element grows back to). */
  toRect: Rect;
  twin: React.ReactNode;
  proof: React.ReactNode;
  /** Where the twin rests when the rebuild starts: MorphToReal's `twinRest`, `twinBlur`, `twinDrain` (same defaults). */
  twinFrom?: number;
  twinBlurFrom?: number;
  twinDrainFrom?: number;
  /** The proof's rect the wipe crosses (default: read from a ProofFrame or ProofMat `proof`, else the whole stage). */
  frameRect?: Rect;
  /**
   * Round 3 (QA K-6): the twin stays at rest (unreadable) while the wipe crosses, and starts at the proof's scale and
   * place (its `toRect` element on the proof's `fromRect` element; pass rects that cover the SAME words for this to
   * help); it sharpens and grows back to its own geometry over `grow` frames (default 4, expo out) from the wipe's last
   * frames. `match={false}` keeps the twin in place.
   */
  match?: boolean;
  grow?: number;
};

/**
 * T4, back from a proof when the same object continues (round 2 and 3, QA K-1 and K-6): the proof is wiped off left to
 * right in `dur` frames (4, expo in-out) with a 16 px slide in the slip's direction over the twin still at rest (dim,
 * blurred, grey, and matched to the proof's scale and place), so no frame shows the proof's words beside readable twin
 * words; then the twin sharpens and grows back to its own geometry. Each pixel shows the proof or the twin, never both.
 * Before `at` it shows the proof over the resting twin, so it can follow MorphToReal directly.
 */
export const RebuildFromReal: React.FC<RebuildProps> = ({
  at,
  dur = 4,
  fromRect,
  toRect,
  twin,
  proof,
  twinFrom = 0.18,
  twinBlurFrom = 7,
  twinDrainFrom = 1,
  frameRect,
  match = true,
  grow = 4,
}) => {
  const frame = useCurrentFrame();
  const e = tween(frame, at, at + dur, 0, 1, EASE.expoInOut);
  // The twin stays at rest (dim, blurred, grey: unreadable) while the wipe crosses the proof, so the proof's words are
  // never beside readable twin words; it sharpens and grows back over `grow` frames from the wipe's last frames (with
  // dur 4: frames at+2 to at+6, done before a scene that renders the rebuild for 7 frames swaps back to its world).
  const backFrom = at + Math.max(1, dur - 2);
  const back = tween(frame, backFrom, backFrom + grow, 0, 1, EASE.expoOut);
  const k = 1 - back;
  const fr = frameRect ?? proofInfo(proof)?.rect ?? { x: 0, y: 0, w: W, h: H };
  const cutX = fr.x + e * fr.w;
  // the twin's element sits on the proof's element (when the rects name the same words) until it grows back
  const m = rectMap(toRect, fromRect);
  const g = back;
  const matched = match && frame >= at && g < 1;
  const tf = matched ? `translate(${lerp(m.tx, 0, g)}px, ${lerp(m.ty, 0, g)}px) scale(${lerp(m.s, 1, g)})` : undefined;
  const style = twinStyle(k, { o: twinFrom, b: twinBlurFrom, d: twinDrainFrom });
  return (
    <AbsoluteFill>
      <TwinGround on={k > 0.001 || matched} />
      <AbsoluteFill style={{ ...style, transformOrigin: "0 0", transform: tf }}>{twin}</AbsoluteFill>
      {e < 1 ? (
        <AbsoluteFill
          style={{
            clipPath: frame >= at ? `polygon(${cutX}px -200px, ${W + 200}px -200px, ${W + 200}px ${H + 200}px, ${cutX}px ${H + 200}px)` : undefined,
            transform: frame >= at ? `translateX(${16 * e}px)` : undefined,
          }}
        >
          {proof}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Directional blur (shared)
// ---------------------------------------------------------------------------------------------------------------------

/** An SVG directional blur filter; render it once and reference it by `url(#id)`. */
export const DirBlur: React.FC<{ id: string; x?: number; y?: number }> = ({ id, x = 0, y = 0 }) => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={`${Math.max(0, x)} ${Math.max(0, y)}`} />
    </filter>
  </svg>
);

const useSafeId = (prefix: string) => prefix + useId().replace(/[^a-zA-Z0-9_-]/g, "");

// ---------------------------------------------------------------------------------------------------------------------
// T5 slip push
// ---------------------------------------------------------------------------------------------------------------------

/** The mark's vertical rhythm on its 272-unit D: band 94, cut 12, band 60, cut 12, band 94. */
export const BANDS = { top: 94, cut: 12, mid: 60, total: 272 } as const;

/** Band edges in px for a frame of height h: [y0, y1] for top, middle, bottom (cuts split evenly between them). */
export function bandEdges(h = H): [number, number][] {
  const u = h / BANDS.total;
  const c1 = (BANDS.top + BANDS.cut / 2) * u;
  const c2 = (BANDS.top + BANDS.cut + BANDS.mid + BANDS.cut / 2) * u;
  return [
    [0, c1],
    [c1, c2],
    [c2, h],
  ];
}

export type SlipPushProps = {
  at: number;
  /** Frames (default 12): each band travels for dur - 4, the bands start 2 frames apart, the middle last. */
  dur?: number;
  from: React.ReactNode;
  to: React.ReactNode;
  /** Direction the content travels (default "left": the slip's direction reads left to right, new surface from the right). */
  direction?: "left" | "right";
  /** Max blur px at peak speed (default 28). */
  blur?: number;
};

/**
 * T5: surface to surface inside an act. The frame splits into the mark's three bands; each band of the old surface
 * pushes out while the same band of the new one pushes in (expo in and out), the top and bottom first, the middle band
 * 2 frames later (the slip), with a directional blur scaled by speed.
 */
export const SlipPush: React.FC<SlipPushProps> = ({ at, dur = 12, from, to, direction = "left", blur = 28 }) => {
  const frame = useCurrentFrame();
  const id = useSafeId("slippush");
  if (frame < at) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= at + dur) return <AbsoluteFill>{to}</AbsoluteFill>;
  const sign = direction === "left" ? -1 : 1;
  const step = dur >= 10 ? 2 : 1; // stagger between bands
  const travel = Math.max(4, dur - 2 * step);
  const delays = [0, 2 * step, step]; // top, middle (last: the slip), bottom
  const edges = bandEdges();
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: DAY.ground }}>
      {edges.map(([y0, y1], i) => {
        const start = at + delays[i];
        const t = tween(frame, start, start + travel, 0, 1, EASE.expoInOut);
        const v = Math.abs(tween(frame + 0.5, start, start + travel, 0, 1, EASE.expoInOut) - tween(frame - 0.5, start, start + travel, 0, 1, EASE.expoInOut)) * W;
        const b = Math.min(blur, v * 0.06);
        const off = sign * t * W;
        const clip = `inset(${y0}px 0px ${H - y1}px 0px)`;
        const bid = `${id}-${i}`;
        return (
          <AbsoluteFill key={i} style={{ clipPath: clip }}>
            <DirBlur id={bid} x={b} />
            <AbsoluteFill style={{ filter: b > 0.4 ? `url(#${bid})` : undefined }}>
              <AbsoluteFill style={{ transform: `translateX(${off}px)` }}>{from}</AbsoluteFill>
              <AbsoluteFill style={{ transform: `translateX(${off - sign * W}px)` }}>{to}</AbsoluteFill>
            </AbsoluteFill>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// T6 zoom-through
// ---------------------------------------------------------------------------------------------------------------------

export type ZoomThroughProps = {
  at: number;
  /** The clicked element's centre, film px. */
  center: [number, number];
  from: React.ReactNode;
  to: React.ReactNode;
  /** Frames zooming in (default 8, expo in to x8), then the swap. */
  inDur?: number;
  /** Frames the next shot settles from 0.9 to 1 (default 4, expo out). */
  outDur?: number;
  /** Peak zoom (default 8). Crafted DOM only, never a bitmap past 1:1. */
  peak?: number;
  /** Real motion blur (CameraMotionBlur, 5 samples) on the 4 fastest frames (default true, M5); false uses a cheap blur. */
  motionBlur?: boolean;
};

/** The zooming layer computes its own scale from its frame, so CameraMotionBlur's sub-frame samples see the motion. */
const ZoomLayer: React.FC<{ at: number; swap: number; center: [number, number]; peak: number; children: React.ReactNode }> = ({ at, swap, center, peak, children }) => {
  const frame = useCurrentFrame();
  const t = tween(frame, at, swap, 0, 1, EASE.expoIn);
  const z = Math.exp(Math.log(peak) * t);
  return <AbsoluteFill style={{ transformOrigin: `${center[0]}px ${center[1]}px`, transform: `scale(${z})` }}>{children}</AbsoluteFill>;
};

/** T6: a click on a crafted element opens the next surface: zoom 1 to 8 into the element, swap at the peak. */
export const ZoomThrough: React.FC<ZoomThroughProps> = ({ at, center, from, to, inDur = 8, outDur = 4, peak = 8, motionBlur = true }) => {
  const frame = useCurrentFrame();
  const id = useSafeId("zoomthru");
  if (frame < at) return <AbsoluteFill>{from}</AbsoluteFill>;
  const swap = at + inDur;
  if (frame < swap) {
    const layer = (
      <ZoomLayer at={at} swap={swap} center={center} peak={peak}>
        {from}
      </ZoomLayer>
    );
    if (motionBlur && frame >= swap - 4) {
      return (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <CameraMotionBlur samples={5} shutterAngle={180}>
            {layer}
          </CameraMotionBlur>
        </AbsoluteFill>
      );
    }
    const t = tween(frame, at, swap, 0, 1, EASE.expoIn);
    const b = motionBlur ? 0 : Math.min(18, Math.max(0, (t - 0.4) * 30));
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <DirBlur id={id} x={b * 0.6} y={b * 0.6} />
        <AbsoluteFill style={{ filter: b > 0.4 ? `url(#${id})` : undefined }}>{layer}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const t = tween(frame, swap, swap + outDur, 0, 1, EASE.expoOut);
  const z = lerp(0.9, 1, t);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "50% 50%", transform: t < 1 ? `scale(${z})` : undefined }}>{to}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// T8 push-cut
// ---------------------------------------------------------------------------------------------------------------------

export type PushCutProps = {
  at: number;
  /** Frames (default 7; the cut lands at 5/11 of them). */
  dur?: number;
  from: React.ReactNode;
  to: React.ReactNode;
  /** Outgoing push (default 1.04). */
  outScale?: number;
  /** Incoming start scale (default 1.04; it settles to 1, within the crispness rule). */
  inScale?: number;
  /** A 2-frame Paper flash at 12% on the cut (default on; run flashcheck.py). */
  flash?: boolean;
  flashColor?: string;
};

/** The push-cut at frame f of a `dur`-frame cut (the same numbers as the `push` scene cut in src/transitions.ts). */
export function pushCutAt(f: number, dur: number, outScale = 1.04, inScale = 1.04) {
  const frames = Math.max(2, dur);
  const cutAt = Math.max(1, Math.round((frames * 5) / 11));
  if (f < cutAt) {
    const t = Math.max(0, Math.min(1, (f + 1) / cutAt));
    return { side: "out" as const, scale: 1 + (outScale - 1) * t * t, flash: f === cutAt - 1 ? 0.06 : 0 };
  }
  const t = Math.max(0, Math.min(1, (f - cutAt + 1) / (frames - cutAt)));
  const q = 1 - (1 - t) * (1 - t);
  return { side: "in" as const, scale: inScale + (1 - inScale) * q, flash: Math.max(0, 0.12 * (1 - (f - cutAt) / 2)) };
}

/** T8: a proof cut in on a word. The outgoing shot pushes in (quad in), cut at 5/11 with a Paper flash, the incoming settles. */
export const PushCut: React.FC<PushCutProps> = ({ at, dur = 7, from, to, outScale = 1.04, inScale = 1.04, flash = true, flashColor = DAY.ground }) => {
  const frame = useCurrentFrame();
  if (frame < at) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= at + dur) return <AbsoluteFill>{to}</AbsoluteFill>;
  const p = pushCutAt(frame - at, dur, outScale, inScale);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${p.scale})` }}>{p.side === "out" ? from : to}</AbsoluteFill>
      {flash && p.flash > 0 ? <AbsoluteFill style={{ background: flashColor, opacity: p.flash }} /> : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// T9 whip
// ---------------------------------------------------------------------------------------------------------------------

export type WhipDir = "left" | "right" | "up" | "down";

export type WhipBlurProps = {
  at: number;
  /** Total frames, half before and half after `at` (default 9). The seam crosses the centre on `at`. */
  dur?: number;
  from: React.ReactNode;
  to: React.ReactNode;
  /** Direction the content travels. */
  dir: WhipDir;
  /** Blur px per px of motion per frame (default 0.05), capped at `maxBlur` (default 40). */
  blurPerPx?: number;
  maxBlur?: number;
};

/** The whip strip's travel (0..1) at a frame: expo in to the seam on `at`, expo out after it. */
export function whipTravel(f: number, at: number, dur: number) {
  const half = dur / 2;
  if (f <= at - half) return 0;
  if (f >= at + half) return 1;
  return f < at ? 0.5 * EASE.expoIn((f - (at - half)) / half) : 0.5 + 0.5 * EASE.expoOut((f - at) / half);
}

/** T9: a whip pan with a directional blur scaled by speed. Put the whoosh's peak on `at`. */
export const WhipBlur: React.FC<WhipBlurProps> = ({ at, dur = 9, from, to, dir, blurPerPx = 0.05, maxBlur = 40 }) => {
  const frame = useCurrentFrame();
  const id = useSafeId("whipblur");
  const half = dur / 2;
  if (frame < at - half) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= at + half) return <AbsoluteFill>{to}</AbsoluteFill>;
  const horizontal = dir === "left" || dir === "right";
  const sign = dir === "left" || dir === "up" ? -1 : 1;
  const span = horizontal ? W : H;
  const t = whipTravel(frame, at, dur);
  const speed = Math.abs(whipTravel(frame + 0.5, at, dur) - whipTravel(frame - 0.5, at, dur)) * span;
  const blur = Math.min(maxBlur, speed * blurPerPx);
  const offset = sign * t * span;
  const move = (d: number) => (horizontal ? `translateX(${d}px)` : `translateY(${d}px)`);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <DirBlur id={id} x={horizontal ? blur : 0} y={horizontal ? 0 : blur} />
      <AbsoluteFill style={{ filter: blur > 0.3 ? `url(#${id})` : undefined }}>
        <AbsoluteFill style={{ transform: move(offset) }}>{from}</AbsoluteFill>
        <AbsoluteFill style={{ transform: move(offset - sign * span) }}>{to}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The slip unit as a share of the frame width (for scene cuts and slips drawn by hand). */
export const SLIP_SHARE = SLIP_UNIT;
