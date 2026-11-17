import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Cursor } from "../../components/Cursor";
import { findCapture, type Box, type CaptureMask } from "../../lib/captures";
import { hasStaticFile } from "../../lib/files";
import { EASE, FPS, H, W, tween } from "../../lib/time";
import { DAY, FONT, ink, type Rect } from "../look";
import { cam3At, cam3Transform, stageToScreen, type Cam3, type Cam3Key } from "./camera3d";
import { Lift } from "./lift";
import { allowedCovers, RealCaptureContext } from "./capturectx";
import { InkLabel } from "./stage";
import { LabelSwap } from "./swap";

/**
 * RealTake (v5, R6 technique 1 "direct the real recording", promoted from src/v5/lab/DirectedRecording + common):
 * a real capture at FULL SIZE, directed like a crafted shot.
 *   - camera keys in CAPTURE px zoom to the detail the voice names, never past 1 film px per capture px (warns);
 *   - a spotlight veils (Paper), softens and drains the rest, and travels with the camera;
 *   - speed ramps over waits (4 to 10x) with a speed label and an honest clock in real seconds; 1x for 0.3 s around
 *     every click and result; the ramp's keys land the real clicks and results on the frames you give;
 *   - the kit's cursor only at the recorded click points; the tag once; masks from captures.json always drawn;
 *   - `crop` keeps rows that must never show (an Owner table, "Dana") out of the picture.
 * Video frames are shown with a one-frame Sequence and `trimBefore` (VideoAt): a <Freeze> around a video showed wrong
 * frames on these 4K, 60 fps, 0.5 s-GOP captures (R6 section 7).
 *
 *   <RealTake capture="p2-merge-rec"
 *     time={{ start: 1.023, events: [{ f: 45, t: 2.523 }, { f: 90, t: 5.178 }, { f: 135, t: 12.7 }] }}
 *     camera={[{ at: 0, to: { cx: 1920, cy: 1080, s: 0.54 } }, { at: 47, dur: 20, to: { cx: 1920, cy: 640, s: 0.86 } }]}
 *     spot={[{ at: 10, dur: 26, rect: { x: 690, y: 170, w: 3150, h: 260 }, amount: 1 }]}
 *     clicks={[{ t: 2.523, x: 3621, y: 393 }, { t: 5.178, x: 2256, y: 925 }]}
 *     tag="Recorded in Bitbucket: the real merge" clock={{ zero: 5.178, label: "Since the merge click" }} />
 */

// ---------------------------------------------------------------------------------------------------------------------
// Time: a monotone cubic remap (Fritsch-Butland tangents: smooth speed changes, never backwards)
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

/** Source seconds shown at output frame `f`. Before the first key and after the last it runs at 1x. */
export function remap(f: number, keys: RemapKey[]): number {
  const k = keys;
  if (k.length === 0) return f / FPS;
  if (k.length === 1 || f <= k[0].f) return k[0].t + (f - k[0].f) / FPS;
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

/** Playback rate at output frame `f` (1 = real time). */
export const rateAt = (f: number, keys: RemapKey[]) => (remap(f + 0.5, keys) - remap(f - 0.5, keys)) * FPS;

/** The output frame where source second `t` shows (the inverse of remap; the remap is monotone). */
export function frameAtSource(t: number, keys: RemapKey[]): number {
  let lo = -100000;
  let hi = 100000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (remap(mid, keys) < t) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** An anchor: output frame `f` shows source second `t` (a click, a result), played at 1x for `hold` seconds around it. */
export type TakeEvent = { f: number; t: number; hold?: number };

const warned = new Set<string>();
const warnOnce = (msg: string) => {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(msg);
};

/**
 * Remap keys from anchors: each event plays at 1x for `hold` seconds (default 0.3) centred on it; the waits between run
 * faster (a smooth ramp). `start` is the source second at frame 0 (default: 1x before the first event). Warns when a
 * wait would run under 1x or over 10.5x (R6: ramps at 4 to 10x), or when two events overlap.
 */
export function takeKeys(events: TakeEvent[], opts: { start?: number; label?: string } = {}): RemapKey[] {
  const ev = [...events].sort((a, b) => a.f - b.f);
  const keys: RemapKey[] = [];
  if (opts.start !== undefined) keys.push({ f: 0, t: opts.start });
  for (const e of ev) {
    const h = e.hold ?? 0.3;
    const hf = (h * FPS) / 2;
    const win: RemapKey[] = [
      { f: e.f - hf, t: e.t - h / 2 },
      { f: e.f, t: e.t },
      { f: e.f + hf, t: e.t + h / 2 },
    ];
    for (const w of win) {
      const prev = keys[keys.length - 1];
      if (prev && (w.f <= prev.f || w.t <= prev.t)) {
        warnOnce(`takeKeys${opts.label ? ` ${opts.label}` : ""}: the event at frame ${e.f} (source ${e.t} s) overlaps the one before; keys must increase`);
        continue;
      }
      keys.push(w);
    }
  }
  for (let i = 0; i + 1 < keys.length; i++) {
    const r = (keys[i + 1].t - keys[i].t) / ((keys[i + 1].f - keys[i].f) / FPS);
    if (r < 0.9 || r > 10.5)
      warnOnce(`takeKeys${opts.label ? ` ${opts.label}` : ""}: frames ${keys[i].f.toFixed(1)} to ${keys[i + 1].f.toFixed(1)} run at ${r.toFixed(1)}x (keep waits between 1x and 10x)`);
  }
  return keys;
}

/** The peak rate of the ramp the frame `f` is in (between two 1x windows), rounded: what the speed label says. */
export function rampPeak(f: number, keys: RemapKey[]): number {
  let a = keys[0]?.f ?? f;
  let b = keys[keys.length - 1]?.f ?? f;
  for (let i = 0; i + 1 < keys.length; i++) {
    if (keys[i].f <= f && f <= keys[i + 1].f) {
      // widen to the surrounding 1x windows
      let lo = i;
      let hi = i + 1;
      while (lo > 0 && rateAt((keys[lo - 1].f + keys[lo].f) / 2, keys) > 1.3) lo--;
      while (hi < keys.length - 1 && rateAt((keys[hi].f + keys[hi + 1].f) / 2, keys) > 1.3) hi++;
      a = keys[lo].f;
      b = keys[hi].f;
      break;
    }
  }
  let peak = 1;
  for (let g = a; g <= b; g += 1) peak = Math.max(peak, rateAt(g, keys));
  return Math.round(peak);
}

/**
 * A recording at an arbitrary source second on this frame (the speed-ramp player): a one-frame Sequence starting on the
 * current frame with `trimBefore` = the source frame. Correct on every frame tested, where <Freeze> was not (R6 section 7).
 */
export const VideoAt: React.FC<{ src: string; t: number; style?: React.CSSProperties }> = ({ src, t, style }) => {
  const frame = useCurrentFrame();
  return (
    <Sequence from={frame} durationInFrames={1} layout="none">
      <OffthreadVideo src={src} muted trimBefore={Math.max(0, Math.round(t * FPS))} style={style} />
    </Sequence>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The camera in capture px
// ---------------------------------------------------------------------------------------------------------------------

/** A camera key in capture px: `cx`, `cy` the capture point at the view's centre, `s` film px per capture px (at most 1). */
export type CapKey = { at: number; dur?: number; to: { cx?: number; cy?: number; s?: number }; ease?: (t: number) => number };

export type CapSize = { w: number; h: number };
const CAP_DEFAULT: CapSize = { w: 3840, h: 2160 };

/** Keep the view inside the capture (no edge shows), with a margin for the float. */
function clampCenter(cx: number, cy: number, s: number, cap: CapSize, margin = 10): [number, number] {
  const hx = (W / 2 + margin) / s;
  const hy = (H / 2 + margin) / s;
  return [Math.min(cap.w - hx, Math.max(hx, cx)), Math.min(cap.h - hy, Math.max(hy, cy))];
}

/**
 * The pose at a frame from capture-px keys: the kit's cam3At (log-space zoom, Pot's straight-path look-at, creep and
 * float) on a stage where the capture fits the frame at zoom 1 (stage px = capture px x W / capture width).
 */
export function capPose(frame: number, keys: CapKey[], opts: { creep?: number; float?: number; seed?: string; cap?: CapSize; label?: string } = {}): Cam3 {
  const cap = opts.cap ?? CAP_DEFAULT;
  const k = W / cap.w; // stage px per capture px
  let cur = { cx: cap.w / 2, cy: cap.h / 2, s: k };
  const k3: Cam3Key[] = keys.map((key) => {
    const s = key.to.s ?? cur.s;
    if (s > 1.001) warnOnce(`RealTake${opts.label ? ` ${opts.label}` : ""}: a camera key at frame ${key.at} asks for ${s} film px per capture px (at most 1)`);
    const [cx, cy] = clampCenter(key.to.cx ?? cur.cx, key.to.cy ?? cur.cy, s, cap);
    cur = { cx, cy, s };
    return { at: key.at, dur: key.dur, ease: key.ease, to: { x: cx * k, y: cy * k, zoom: s / k } };
  });
  // Camera3D's calibrated defaults (a held take never measures as frozen): creep 1.5%/s, a 5 px float
  return cam3At(frame, k3, { creep: opts.creep ?? 1.5, float: opts.float ?? 5, seed: opts.seed ?? "take" });
}

/** A capture point on the screen for a pose. */
export const capToScreen = (pose: Cam3, x: number, y: number, cap: CapSize = CAP_DEFAULT): [number, number] =>
  stageToScreen(pose, (x * W) / cap.w, (y * W) / cap.w);

/** A capture rect on the screen. */
export function capRectToScreen(pose: Cam3, r: Rect, cap: CapSize = CAP_DEFAULT): Rect {
  const [x0, y0] = capToScreen(pose, r.x, r.y, cap);
  const [x1, y1] = capToScreen(pose, r.x + r.w, r.y + r.h, cap);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Film px per capture px on screen for a pose (the crispness rule: keep it at 1 or less). */
export const screenScale = (pose: Cam3, cap: CapSize = CAP_DEFAULT) => (pose.zoom * W) / cap.w;

/** The capture world: children laid out in capture px, scaled by the camera (crisp up to 1 film px per capture px). */
export const CaptureWorld: React.FC<{ pose: Cam3; cap?: CapSize; background?: string; children?: React.ReactNode }> = ({ pose, cap = CAP_DEFAULT, background = "#FFFFFF", children }) => (
  <AbsoluteFill style={{ overflow: "hidden", background }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: cam3Transform(pose) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: cap.w, height: cap.h, transformOrigin: "0 0", transform: `scale(${W / cap.w})` }}>{children}</div>
    </div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------------------------------------------------
// The spotlight
// ---------------------------------------------------------------------------------------------------------------------

/** A spotlight key: from `at` over `dur` frames (expo out, default 14) the window moves to `rect` (capture px) at `amount`. */
export type SpotKey = { at: number; dur?: number; rect: Rect; amount: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The spotlight's rect (capture px) and amount at a frame. */
export function spotAt(frame: number, keys: SpotKey[]): { rect: Rect; amount: number } {
  if (keys.length === 0) return { rect: { x: 0, y: 0, w: 0, h: 0 }, amount: 0 };
  let rect = keys[0].rect;
  let amount = frame >= keys[0].at ? keys[0].amount : 0;
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
 * The spotlight in SCREEN px: outside a rounded window the picture is veiled with Paper (60%), softened (3.5 px) and
 * drained (70% grey), R2's modal scrim made local; a hairline ring draws the window. Works over real captures and twins.
 */
export const Spotlight: React.FC<{ rect: Rect; amount: number; radius?: number; veil?: number; mode?: "veil" | "ring" }> = ({ rect, amount, radius = 18, veil = 0.6, mode = "veil" }) => {
  if (amount <= 0.01) return null;
  const hole = roundRect(rect, radius);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {mode === "veil" ? (
        <AbsoluteFill
          style={{
            background: `rgba(242, 246, 247, ${(veil * amount).toFixed(3)})`,
            backdropFilter: `blur(${(3.5 * amount).toFixed(2)}px) grayscale(${(0.7 * amount).toFixed(2)})`,
            clipPath: `path(evenodd, "M-20 -20 H${W + 20} V${H + 20} H-20 Z ${hole}")`,
          }}
        />
      ) : null}
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
// The honest clock and the speed label
// ---------------------------------------------------------------------------------------------------------------------

/** Seconds since `zero` (a source second, e.g. the merge click) at frame `f` of a remapped take, never below 0. */
export const clockValue = (f: number, keys: RemapKey[], zero: number) => Math.max(0, remap(f, keys) - zero);

/**
 * The honest clock: real seconds since the action, on a white card (lifts at `at`). The value is yours (from
 * `clockValue`, or carried across a seam and landed on the measured number); the label can swap ("Since the merge
 * click" to "Merge to flag") and a note can set under it ("Measured on the demo site, Nov 13").
 */
/** The honest clock's label (V5.md 8.6). */
export const CLOCK_LABEL = "Real time since the merge";

export const HonestClock: React.FC<{
  at: number;
  value: number;
  /** Default "Real time since the merge". */
  label?: string;
  swap?: { at: number; label: string };
  note?: { at: number; text: string };
  x?: number;
  y?: number;
  width?: number;
}> = ({ at, value, label = CLOCK_LABEL, swap, note, x = 64, y = 790, width = 470 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const v = Math.floor(value + 1e-6);
  return (
    <Lift at={at} to={4} x={x} y={y} radius={26}>
      <div style={{ width, background: DAY.surface, borderRadius: 26, padding: "22px 30px 24px", boxSizing: "border-box", fontFamily: FONT.sans, color: DAY.text }}>
        <div style={{ fontSize: 26, lineHeight: "32px", color: DAY.textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>
          {swap ? <LabelSwap from={label} to={swap.label} at={swap.at} size={26} weight={500} /> : label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 112, lineHeight: "112px", fontWeight: 600, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>{v}</span>
          <span style={{ fontSize: 44, color: DAY.textMuted, fontWeight: 500 }}>s</span>
        </div>
        {note ? (
          <div style={{ fontSize: 26, lineHeight: "32px", color: DAY.textMuted, marginTop: 6, opacity: tween(frame, note.at, note.at + 6, 0, 1, EASE.linear), whiteSpace: "nowrap" }}>
            {note.text}
          </div>
        ) : null}
      </div>
    </Lift>
  );
};

/** The speed label ("9× speed", an ink chip): honest about a ramp while it runs. */
export const SpeedChip: React.FC<{ rate: number; x?: number; y?: number }> = ({ rate, x = 562, y = 806 }) => (
  <div style={{ position: "absolute", left: x, top: y }}>
    <InkLabel size={26}>{`${Math.round(rate)}× speed`}</InkLabel>
  </div>
);

// ---------------------------------------------------------------------------------------------------------------------
// The take
// ---------------------------------------------------------------------------------------------------------------------

/** A recorded click: the source second it happened and where (capture px). The cursor comes from `from` (default 120, 90 px away). */
export type TakeClick = { t: number; x: number; y: number; cursor?: string; from?: [number, number]; travel?: number };

export type RealTakeProps = {
  /** captures.json id (a still or a recording). */
  capture: string;
  /** Source time for a recording: anchors at 1x (`events`, with `start` at frame 0) or explicit `keys`. */
  time?: { events?: TakeEvent[]; keys?: RemapKey[]; start?: number };
  /** Camera keys in capture px (`s` = film px per capture px, at most 1). Default: the whole capture, fitted. */
  camera?: CapKey[];
  /** Spotlight keys in capture px. */
  spot?: SpotKey[];
  /** Recorded clicks: the kit's cursor shows only around these. */
  clicks?: TakeClick[];
  /** The proof tag, once per take: a string, or with its own frames and place (screen px). */
  tag?: string | { text: string; at?: number; until?: number; x?: number; y?: number };
  /** The speed label while the ramp runs at 3x or more (default OFF since v5 round 2; `true` or a place to show it). */
  speed?: boolean | { x?: number; y?: number };
  /** The honest clock: real seconds since source second `zero` (a 470 px card at 64, 790). Label default "Real time since the merge". For a clock carried across takes, use HonestClock. */
  clock?: { zero: number; label?: string; at?: number; x?: number; y?: number; swap?: { at: number; label: string }; note?: { at: number; text: string } };
  /** How the spotlight emphasises: "veil" (default: the rest veiled, softened, drained), "ring" (only the hairline ring), "none". Round 2: run a take with no veil and a tighter crop. */
  spotlight?: "veil" | "ring" | "none";
  /** Only this region of the capture is drawn (capture px); the rest is `background`. Keeps Owner rows out. */
  crop?: Rect;
  /** Extra covers in capture px, drawn over captures.json's masks (same box + fill re-covers one). */
  masks?: CaptureMask[];
  /** Fill for captures.json masks that name none (one colour, or per index; default white). */
  maskFill?: string | (string | undefined)[];
  creep?: number;
  float?: number;
  seed?: string;
  /** Behind and around the capture (default white, like the product's page). */
  background?: string;
  /** Drawn in capture px over the capture (a Mist band on a real word: <MistBand rect={...} />). */
  children?: React.ReactNode;
  /** Drawn in screen px over everything. */
  overlay?: React.ReactNode;
};

export const RealTake: React.FC<RealTakeProps> = ({
  capture,
  time,
  camera = [],
  spot = [],
  clicks = [],
  tag,
  speed = false,
  clock,
  spotlight = "veil",
  crop,
  masks = [],
  maskFill,
  creep,
  float,
  seed,
  background = "#FFFFFF",
  children,
  overlay,
}) => {
  const frame = useCurrentFrame();
  const cap = findCapture(capture);
  const size: CapSize = { w: cap?.width ?? 3840, h: cap?.height ?? 2160 };
  const pose = capPose(frame, camera, { creep, float, seed: seed ?? capture, cap: size, label: capture });
  const sc = screenScale(pose, size);
  if (sc > 1.04) warnOnce(`RealTake ${capture}: ${sc.toFixed(2)} film px per capture px on screen at frame ${frame} (at most 1; the creep adds about 1.5% a second)`);
  const isVideo = cap?.kind === "video";
  const keys = time?.keys ?? (time?.events ? takeKeys(time.events, { start: time.start, label: capture }) : time?.start !== undefined ? [{ f: 0, t: time.start }] : []);
  const t = isVideo ? remap(frame, keys) : 0;
  const ok = Boolean(cap && hasStaticFile(cap.file));
  const fillOf = (i: number) => (Array.isArray(maskFill) ? maskFill[i] : maskFill);
  // captures.json's covers are the logged "(Development)" ones; extra covers draw only if logged too (V5.md 8.1)
  const allMasks: CaptureMask[] = [...(cap?.masks ?? []).map((m, i) => ({ ...m, fill: m.fill ?? fillOf(i) })), ...allowedCovers(capture, masks, cap?.masks)];
  const s = spotAt(frame, spot);
  const rate = isVideo && keys.length ? rateAt(frame, keys) : 1;
  const tagObj = typeof tag === "string" ? { text: tag } : tag;
  const tagOn = tagObj && frame >= (tagObj.at ?? 6) && (tagObj.until === undefined || frame < tagObj.until);
  const sp = typeof speed === "object" ? speed : {};

  return (
    <AbsoluteFill style={{ background }}>
      <CaptureWorld pose={pose} cap={size} background={background}>
        <div style={{ position: "absolute", left: 0, top: 0, width: size.w, height: size.h, clipPath: crop ? `inset(${crop.y}px ${size.w - crop.x - crop.w}px ${size.h - crop.y - crop.h}px ${crop.x}px)` : undefined }}>
          {ok && cap ? (
            isVideo ? (
              <VideoAt src={staticFile(cap.file)} t={t} style={{ width: size.w, height: size.h }} />
            ) : (
              <Img src={staticFile(cap.file)} style={{ width: size.w, height: size.h, display: "block" }} />
            )
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontSize: 60, color: DAY.textMuted }}>
              {`capture ${capture} not found`}
            </div>
          )}
          {allMasks.map((m, i) => (
            <div key={i} style={{ position: "absolute", left: m.box[0], top: m.box[1], width: m.box[2], height: m.box[3], background: m.fill ?? "#FFFFFF" }} />
          ))}
          <RealCaptureContext.Provider value={capture}>{children}</RealCaptureContext.Provider>
        </div>
        {clicks.map((c, i) => {
          const cf = Math.round(isVideo && keys.length ? frameAtSource(c.t, keys) : c.t * FPS);
          const travel = c.travel ?? 14;
          const [fx, fy] = c.from ?? [c.x + 120, c.y + 90];
          return (
            <Cursor
              key={i}
              scale={2.4 / sc}
              showAt={cf - travel - 2}
              hideAt={cf + 10}
              points={[
                { frame: cf - travel - 2, x: fx, y: fy },
                { frame: cf, x: c.x, y: c.y, click: true, cursor: c.cursor ?? "pointer", travel },
              ]}
            />
          );
        })}
      </CaptureWorld>
      {spotlight !== "none" ? <Spotlight rect={capRectToScreen(pose, s.rect, size)} amount={s.amount} mode={spotlight} /> : null}
      {overlay}
      {tagOn && tagObj ? (
        <div style={{ position: "absolute", left: tagObj.x ?? 64, top: tagObj.y ?? 56, opacity: tween(frame, tagObj.at ?? 6, (tagObj.at ?? 6) + 4, 0, 1, EASE.linear) }}>
          <InkLabel icon="eye" size={26}>
            {tagObj.text}
          </InkLabel>
        </div>
      ) : null}
      {clock && isVideo ? (
        <HonestClock
          at={clock.at ?? Math.max(0, Math.ceil(frameAtSource(clock.zero, keys)))}
          value={clockValue(frame, keys, clock.zero)}
          label={clock.label ?? CLOCK_LABEL}
          swap={clock.swap}
          note={clock.note}
          x={clock.x}
          y={clock.y}
        />
      ) : null}
      {speed && isVideo && rate >= 3 ? <SpeedChip rate={rampPeak(frame, keys)} x={sp.x} y={sp.y} /> : null}
    </AbsoluteFill>
  );
};

/** For a still capture: a capture box in capture px (kept for the box form of captures.json). */
export const boxToRect = (b: Box): Rect => ({ x: b[0], y: b[1], w: b[2], h: b[3] });
