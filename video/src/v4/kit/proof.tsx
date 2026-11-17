import React, { createContext, useContext, useEffect, useState } from "react";
import { Video } from "@remotion/media";
import { continueRender, delayRender, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { IconName } from "../../brand/icons";
import { findCapture, type Box, type CaptureMask } from "../../lib/captures";
import { hasStaticFile } from "../../lib/files";
import { EASE, FPS, tween } from "../../lib/time";
import { DAY, FONT, elevAt, ink, type Rect } from "../look";
import { useCam3OrNull } from "./camera3d";
import { allowedCovers, RealCaptureContext } from "./capturectx";
import clipsJson from "./proofclips.json";
import { InkLabel } from "./stage";

/** Pre-cut regions of the recordings (tools/v4/proofclips.mjs; files in public/clips/v4, git-ignored). */
type ProofClip = { id: string; capture: string; file: string; region: Box; t0: number; t1: number; fps: number };
const CLIPS: ProofClip[] = (clipsJson as unknown as { clips?: ProofClip[] }).clips ?? [];
const contains = (outer: Box, inner: Box) =>
  inner[0] >= outer[0] && inner[1] >= outer[1] && inner[0] + inner[2] <= outer[0] + outer[2] && inner[1] + inner[3] <= outer[1] + outer[3];

/** A pre-cut clip holding the whole region `need` (capture px) for source seconds s0 to s1, if one exists on disk. */
export function proofClipFor(capture: string, need: Box, s0: number, s1: number): ProofClip | undefined {
  return CLIPS.find((c) => c.capture === capture && c.t0 <= s0 + 1e-6 && c.t1 >= s1 - 1e-6 && contains(c.region, need) && hasStaticFile(c.file));
}

/**
 * A proof insert (V4.md P1 to P3, R2 section 9): a crop of a real capture in a white mat (outer radius 26, mat 14,
 * inner radius 12), elevation 4, with an ink tag chip on its top-left corner and an optional 26 px note under it.
 *
 *   <ProofFrame capture="p2-flagged-tooltip" crop={[1440, 300, 1460, 360]} scale={0.8}
 *     x={760} y={640} at={sc.snap(sc.wordAt("V14", "flagged"))} dur={45}
 *     tag="Recorded in Confluence" />
 *
 * - `crop` and masks are CAPTURE px (3840 x 2160, 2x of CSS). `scale` is film px per capture px and must be 1 or less
 *   (P2); a larger scale warns in the console and is drawn at 1. The on-screen scale (scale x camera zoom) is checked.
 * - `x`, `y` place the mat's OUTER top-left corner in film px (leave both out to place it yourself, e.g. inside
 *   MorphToReal, with `enter="none"`). `proofRect()` gives the outer and image rects for aiming.
 * - Arrives by lifting at `at` (level 1 to 4, 14 f). With `dur` it leaves at `at + dur` by dropping (8 f); `exit="none"`
 *   keeps it on screen. A still never freezes: inside a Camera3D the camera creeps it; outside one the content creeps
 *   1.5% a second inside the mat (`creep`).
 * - `video`: a segment of a recording, `from` and `to` in SOURCE seconds; each jump cuts, at a local frame (on a beat,
 *   P3), to another source second, optionally with a new `crop` and `scale` (the mat reframes over 6 frames, the
 *   content cuts with a 2-frame push; R3's R5, R14, R16). `to` is where the LAST segment ends; the proof's duration
 *   defaults to the segments' total.
 */
export type ProofTag =
  | "Recorded in Confluence"
  | "Recorded in Bitbucket: the real merge"
  | "Recorded in Bitbucket"
  | "Recorded in Rovo"
  | "Recorded in Jira"
  | "Real output: doc-drift MCP"
  | (string & {});

export type ProofJump = { at: number; to: number; crop?: Box; scale?: number };
export type ProofVideo = { from: number; to: number; jumps?: ProofJump[] };

export type ProofFrameProps = {
  capture: string;
  crop: Box;
  scale: number;
  x?: number;
  y?: number;
  at: number;
  dur?: number;
  tag: ProofTag;
  note?: string;
  video?: ProofVideo;
  /** Yaw in degrees (only while it travels; read square, M2). */
  tilt?: number;
  /** Arrival: "lift" (default) or "none" (already there, e.g. inside a morph). */
  enter?: "lift" | "none";
  /** Departure after `dur`: "drop" (default) or "none". */
  exit?: "drop" | "none";
  /** Content creep inside the mat, % per second (default 1.5 outside a Camera3D, 0 inside one). */
  creep?: number;
  /** Extra covers in capture px, drawn on top of captures.json's masks (same box + a fill re-covers one in its colour). */
  masks?: CaptureMask[];
  /** Fill for captures.json's masks that name none: one colour, or one per mask index (default white). The byline's
   *  hover pill is #F1F1F2 (R2 section 9: a cover takes the colour of what it covers). */
  maskFill?: string | (string | undefined)[];
  /** Play pre-cut clips when they cover the proof (default true; false always decodes the 4K capture). */
  clips?: boolean;
  /** Warn (console and render log) when the crop's top rows, bottom rows or left columns cut content (default true). */
  cropCheck?: boolean;
  icon?: IconName;
  style?: React.CSSProperties;
};

/**
 * The mat. The tag chip (an InkLabel at 26 px, 46.8 px tall) sits ABOVE the mat's top edge and overlaps only the mat's
 * 14 px band: its bottom edge is 10 px into the mat, 4 px clear of the capture (round 2, QA K-3: it used to sit on the
 * capture's first line). Leave about 40 px above a proof for it.
 */
export const MAT = { pad: 14, outerRadius: 26, innerRadius: 12, tagTop: -37, tagLeft: 22 } as const;

/** The outer (mat) and image rects of a proof in film px (for its first crop). */
export function proofRect(p: { crop: Box; scale: number; x?: number; y?: number }): { outer: Rect; image: Rect } {
  const s = Math.min(1, p.scale);
  const w = p.crop[2] * s;
  const h = p.crop[3] * s;
  const x = p.x ?? 0;
  const y = p.y ?? 0;
  return { outer: { x, y, w: w + 2 * MAT.pad, h: h + 2 * MAT.pad }, image: { x: x + MAT.pad, y: y + MAT.pad, w, h } };
}

/** The film-px rect of a CAPTURE rect (e.g. the byline's box) inside a placed proof: for MorphToReal's `toRect`. */
export function proofPoint(p: { crop: Box; scale: number; x?: number; y?: number }, box: Box): Rect {
  const s = Math.min(1, p.scale);
  const img = proofRect(p).image;
  return { x: img.x + (box[0] - p.crop[0]) * s, y: img.y + (box[1] - p.crop[1]) * s, w: box[2] * s, h: box[3] * s };
}

type Segment = { start: number; src: number; crop: Box; scale: number };

function segmentsOf(at: number, crop: Box, scale: number, v?: ProofVideo): Segment[] {
  const first: Segment = { start: at, src: v?.from ?? 0, crop, scale };
  if (!v) return [first];
  const out = [first];
  for (const j of [...(v.jumps ?? [])].sort((a, b) => a.at - b.at)) {
    const prev = out[out.length - 1];
    out.push({ start: j.at, src: j.to, crop: j.crop ?? prev.crop, scale: j.scale ?? prev.scale });
  }
  return out;
}

/** Frames a proof's video lasts (jumps included). */
export function proofVideoFrames(at: number, v: ProofVideo): number {
  const segs = segmentsOf(at, [0, 0, 1, 1], 1, v);
  const last = segs[segs.length - 1];
  return Math.max(1, last.start - at + Math.round((v.to - last.src) * FPS));
}

/**
 * What a proof node will do, read from its props when it is a ProofFrame or ProofMat element (or a fragment of them):
 * the frame it starts leaving (`end`, undefined when it never leaves on its own) and its rect with room for the tag.
 * MorphToReal and RebuildFromReal use it so the twin returns when the proof leaves and the wipe crosses the proof only.
 */
export function proofInfo(node: React.ReactNode): { end?: number; rect?: Rect } | null {
  if (!React.isValidElement(node)) return null;
  if (node.type === React.Fragment) {
    const kids = React.Children.toArray((node.props as { children?: React.ReactNode }).children).map(proofInfo);
    if (kids.length === 0 || kids.some((k) => k === null)) return null;
    const ends = kids.map((k) => k!.end);
    const rects = kids.map((k) => k!.rect).filter((r): r is Rect => r !== undefined);
    const x0 = Math.min(...rects.map((r) => r.x));
    const y0 = Math.min(...rects.map((r) => r.y));
    const x1 = Math.max(...rects.map((r) => r.x + r.w));
    const y1 = Math.max(...rects.map((r) => r.y + r.h));
    return {
      end: ends.every((e) => e !== undefined) ? Math.max(...(ends as number[])) : undefined,
      rect: rects.length ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : undefined,
    };
  }
  const withTag = (r: Rect): Rect => ({ x: r.x, y: r.y + MAT.tagTop - 3, w: r.w, h: r.h - MAT.tagTop + 3 });
  if (node.type === ProofFrame) {
    const p = node.props as ProofFrameProps;
    const cap = findCapture(p.capture);
    const length = p.dur ?? (cap?.kind === "video" && p.video ? proofVideoFrames(p.at, p.video) : 45);
    const placed = p.x !== undefined || p.y !== undefined;
    return { end: p.exit === "none" ? undefined : p.at + length, rect: placed ? withTag(proofRect(p).outer) : undefined };
  }
  if (node.type === ProofMat) {
    const p = node.props as ProofMatProps;
    const placed = p.x !== undefined || p.y !== undefined;
    const outer = { x: p.x ?? 0, y: p.y ?? 0, w: p.w + 2 * MAT.pad, h: p.h + 2 * MAT.pad };
    return { end: p.exit === "none" ? undefined : p.at + (p.dur ?? 45), rect: placed ? withTag(outer) : undefined };
  }
  return null;
}

const warned = new Set<string>();
const warnOnce = (msg: string) => {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(msg);
};

// ---------------------------------------------------------------------------------------------------------------------
// The reveal (MorphToReal's growing window, handed to the mat so its shadow stays soft)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * While MorphToReal grows a proof out of its twin, it passes the window that is open so far (`rect`, in the proof
 * layer's px, which are stage px for a placed mat) and the morph's progress. A mat inside then clips only its OWN
 * content to that window and draws its shadow on a plate the size of the window (rising from level 1 to 4 as it
 * grows), so the shadow stays soft through the morph instead of being cut by a clip. The tag lands at the end.
 */
export type MorphReveal = { rect: Rect; progress: number; radius: number };
export const MorphRevealContext = createContext<MorphReveal | null>(null);

// ---------------------------------------------------------------------------------------------------------------------
// The mat (also for proofs that are not captures: R9's verbatim MCP output)
// ---------------------------------------------------------------------------------------------------------------------

export type ProofMatProps = {
  /** Inner (image) size in film px. */
  w: number;
  h: number;
  x?: number;
  y?: number;
  at: number;
  dur?: number;
  tag: ProofTag;
  note?: string;
  tilt?: number;
  enter?: "lift" | "none";
  exit?: "drop" | "none";
  icon?: IconName;
  /** Inner background (default surface-sunk; the terminal uses Fathom). */
  inner?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** The proof mat around any content: white mat 14 px, radii 26 / 12, elevation 4, tag chip, optional note. */
export const ProofMat: React.FC<ProofMatProps> = ({ w, h, x, y, at, dur = 45, tag, note, tilt = 0, enter = "lift", exit = "drop", icon = "eye", inner, style, children }) => {
  const frame = useCurrentFrame();
  const reveal = useContext(MorphRevealContext);
  const end = at + dur;
  const exitDur = 8;
  if (enter === "lift" && frame < at) return null;
  if (exit === "drop" && frame >= end + exitDur) return null;
  const up = enter === "lift" ? tween(frame, at, at + 14, 0, 1, EASE.expoOut) : 1;
  const down = exit === "drop" ? tween(frame, end, end + exitDur, 0, 1, EASE.expoIn) : 0;
  const level = 1 + 3 * up - 3 * down;
  const opacity = Math.min(enter === "lift" ? tween(frame, at, at + 3, 0, 1, EASE.linear) : 1, exit === "drop" ? 1 - tween(frame, end + exitDur - 3, end + exitDur, 0, 1, EASE.linear) : 1);
  const ty = 26 * (1 - up) + 40 * down;
  const sc = (0.975 + 0.025 * up) * (1 - 0.03 * down);
  const placed = x !== undefined || y !== undefined;
  const mw = w + 2 * MAT.pad;
  const mh = h + 2 * MAT.pad;

  // MorphToReal's window, in the mat's own px: the part of the mat that is open so far
  let win: { x0: number; y0: number; x1: number; y1: number; r: number } | null = null;
  let full = true;
  let labelIn = 1;
  if (reveal) {
    const ox = x ?? 0;
    const oy = y ?? 0;
    const x0 = Math.max(0, reveal.rect.x - ox);
    const y0 = Math.max(0, reveal.rect.y - oy);
    const x1 = Math.min(mw, reveal.rect.x + reveal.rect.w - ox);
    const y1 = Math.min(mh, reveal.rect.y + reveal.rect.h - oy);
    full = x0 <= 0.5 && y0 <= 0.5 && x1 >= mw - 0.5 && y1 >= mh - 0.5;
    if (!full) {
      if (x1 <= x0 || y1 <= y0) return null;
      win = { x0, y0, x1, y1, r: Math.min(MAT.outerRadius, reveal.radius, (y1 - y0) / 2, (x1 - x0) / 2) };
    }
    // the tag and the note land once the whole mat is open (R3: the tag's tick lands with them)
    labelIn = full ? tween(reveal.progress, 0.9, 1, 0, 1, EASE.linear) : 0;
  }
  const shadowLevel = reveal && reveal.progress < 1 ? Math.min(level, 1 + 3 * reveal.progress) : level;
  const label = (node: React.ReactNode, left: number, top: number) =>
    labelIn > 0 ? (
      <div style={{ position: "absolute", left, top, opacity: labelIn < 1 ? labelIn : undefined, transform: labelIn < 1 ? `translateY(${(1 - labelIn) * 8}px)` : undefined }}>{node}</div>
    ) : null;

  return (
    <div
      style={{
        position: placed ? "absolute" : "relative",
        left: x,
        top: y,
        width: mw,
        height: mh,
        transform: `translateY(${ty}px) ${tilt ? `perspective(2400px) rotateY(${tilt}deg) ` : ""}scale(${sc})`,
        transformOrigin: "50% 100%",
        opacity: opacity < 1 ? opacity : undefined,
        ...style,
      }}
    >
      {/* the shadow: on the open window while a morph grows the proof, else on the whole mat */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: win ? win.x0 : 0,
          top: win ? win.y0 : 0,
          width: win ? win.x1 - win.x0 : mw,
          height: win ? win.y1 - win.y0 : mh,
          borderRadius: win ? win.r : MAT.outerRadius,
          boxShadow: elevAt(shadowLevel),
        }}
      />
      <div style={{ position: "absolute", inset: 0, clipPath: win ? `inset(${win.y0}px ${mw - win.x1}px ${mh - win.y1}px ${win.x0}px round ${win.r}px)` : undefined }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: MAT.outerRadius, background: DAY.surface }} />
        <div style={{ position: "absolute", left: MAT.pad, top: MAT.pad, width: w, height: h, borderRadius: MAT.innerRadius, overflow: "hidden", background: inner ?? DAY.surfaceSunk }}>
          {children}
          <div style={{ position: "absolute", inset: 0, borderRadius: MAT.innerRadius, boxShadow: `inset 0 0 0 1.5px ${ink(0.06)}`, pointerEvents: "none" }} />
        </div>
      </div>
      {label(<InkLabel icon={icon}>{tag}</InkLabel>, MAT.tagLeft, MAT.tagTop)}
      {note
        ? label(
            <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 26, lineHeight: "32px", color: DAY.textMuted, whiteSpace: "nowrap" }}>{note}</div>,
            MAT.pad,
            h + 2 * MAT.pad + 16,
          )
        : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The crop guard (round 2, QA K-2): a crop must not cut a line of text (R2 section 9)
// ---------------------------------------------------------------------------------------------------------------------

const cropChecks = new Set<string>();

/** Share of pixels on an edge that are not background (more than 28 levels from the edge's median luminance). */
function notBackground(data: Uint8ClampedArray, w: number, pts: [number, number][]): number {
  const lum = pts.map(([x, y]) => {
    const i = (y * w + x) * 4;
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  });
  const sorted = [...lum].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  return lum.filter((v) => Math.abs(v - median) > 28).length / Math.max(1, lum.length);
}

/** Check one crop of one source frame (capture px) and warn when its top rows, bottom rows or left columns cut content. */
function checkCrop(source: CanvasImageSource, label: string, crop: Box) {
  const [cx, cy, cw, ch] = crop.map((v) => Math.round(v)) as Box;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || cw < 4 || ch < 4) return;
  ctx.drawImage(source, cx, cy, cw, ch, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const row = (y: number) => Array.from({ length: cw }, (_, x) => [x, y] as [number, number]);
  const col = (x: number) => Array.from({ length: ch }, (_, y) => [x, y] as [number, number]);
  const edges: [string, number][] = [
    ["top", Math.max(notBackground(data, cw, row(0)), notBackground(data, cw, row(1)))],
    ["bottom", Math.max(notBackground(data, cw, row(ch - 1)), notBackground(data, cw, row(ch - 2)))],
    ["left", Math.max(notBackground(data, cw, col(0)), notBackground(data, cw, col(1)))],
  ];
  const cut = edges.filter(([, v]) => v > 0.02);
  if (cut.length) {
    console.warn(
      `ProofFrame ${label}: the crop [${crop.join(", ")}] cuts content on its ${cut.map(([n, v]) => `${n} edge (${Math.round(v * 100)}% of its pixels are not background)`).join(", ")}. Move that edge onto whitespace (R2 section 9: never cut a line).`,
    );
  }
}

/**
 * Runs the crop check once per capture, crop and second (per render tab), holding the frame until it is done so the
 * warning lands in the render log. Never blocks a render: any load or seek error, or 4 s, releases it.
 */
const CropGuard: React.FC<{ capture: string; file: string; kind: "still" | "video"; crops: { crop: Box; src: number }[] }> = ({ capture, file, kind, crops }) => {
  const todo = crops.filter((c) => !cropChecks.has(`${capture}|${c.crop.join(",")}|${kind === "video" ? c.src.toFixed(2) : ""}`));
  const [handle] = useState(() => (todo.length ? delayRender(`ProofFrame ${capture}: checking the crop edges`, { timeoutInMilliseconds: 20000 }) : null));
  useEffect(() => {
    if (handle === null) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    const timer = setTimeout(finish, 4000);
    for (const c of todo) cropChecks.add(`${capture}|${c.crop.join(",")}|${kind === "video" ? c.src.toFixed(2) : ""}`);
    const url = staticFile(file);
    try {
      if (kind === "still") {
        const img = new Image();
        img.onload = () => {
          try {
            for (const c of todo) checkCrop(img, capture, c.crop);
          } finally {
            clearTimeout(timer);
            finish();
          }
        };
        img.onerror = () => {
          clearTimeout(timer);
          finish();
        };
        img.src = url;
      } else {
        const video = document.createElement("video");
        video.muted = true;
        video.preload = "auto";
        let i = 0;
        const next = () => {
          if (i >= todo.length) {
            clearTimeout(timer);
            video.removeAttribute("src");
            video.load();
            finish();
            return;
          }
          video.currentTime = todo[i].src + 0.02;
        };
        video.onseeked = () => {
          try {
            checkCrop(video, `${capture} at ${todo[i].src.toFixed(2)} s`, todo[i].crop);
          } catch {
            // a frame we cannot read is not a reason to fail the render
          }
          i++;
          next();
        };
        video.onerror = () => {
          clearTimeout(timer);
          finish();
        };
        video.onloadeddata = () => next();
        video.src = url;
      }
    } catch {
      clearTimeout(timer);
      finish();
    }
    return () => {
      clearTimeout(timer);
      finish();
    };
  }, [handle]);
  return null;
};

// ---------------------------------------------------------------------------------------------------------------------
// The proof
// ---------------------------------------------------------------------------------------------------------------------

export const ProofFrame: React.FC<ProofFrameProps> = ({
  capture,
  crop,
  scale,
  x,
  y,
  at,
  dur,
  tag,
  note,
  video,
  tilt = 0,
  enter = "lift",
  exit = "drop",
  creep,
  masks = [],
  maskFill,
  clips = true,
  cropCheck = true,
  icon = "eye",
  style,
}) => {
  const frame = useCurrentFrame();
  const cam = useCam3OrNull();
  const camZoom = cam?.zoom ?? 1;
  const cap = findCapture(capture);
  const isVideo = cap?.kind === "video";
  if (isVideo && !video) warnOnce(`ProofFrame ${capture}: a recording needs \`video\` (from, to in source seconds)`);
  const segs = segmentsOf(at, crop, scale, isVideo ? video : undefined);
  for (const sg of segs) {
    if (sg.scale > 1) warnOnce(`ProofFrame ${capture}: scale ${sg.scale} is above 1 film px per capture px (P2); drawn at 1`);
    if (Math.min(1, sg.scale) * camZoom > 1.05) warnOnce(`ProofFrame ${capture}: scale ${sg.scale} x camera zoom ${camZoom.toFixed(2)} is above 1 film px per capture px on screen (P2)`);
  }
  const length = dur ?? (isVideo && video ? proofVideoFrames(at, video) : 45);
  if (length < 24) warnOnce(`ProofFrame ${capture}: ${length} frames is under the 24-frame minimum (P2)`);
  const end = at + length;

  // the current segment, and the reframe from the previous one
  let si = 0;
  for (let i = 0; i < segs.length; i++) if (frame >= segs[i].start) si = i;
  const seg = segs[si];
  const prev = si > 0 ? segs[si - 1] : seg;
  const s = Math.min(1, seg.scale);
  const sp = Math.min(1, prev.scale);
  const re = si > 0 ? tween(frame, seg.start, seg.start + 6, 0, 1, EASE.expoOut) : 1;
  const w = prev.crop[2] * sp + (seg.crop[2] * s - prev.crop[2] * sp) * re;
  const h = prev.crop[3] * sp + (seg.crop[3] * s - prev.crop[3] * sp) * re;
  const push = si > 0 ? 1 + 0.03 * (1 - tween(frame, seg.start, seg.start + 3, 0, 1, EASE.expoOut)) : 1;

  // creep inside the mat (never above 1 film px per capture px on screen)
  const creepRate = creep ?? (cam ? 0 : 1.5);
  const since = Math.max(0, frame - at);
  const k = Math.max(1, Math.min(1 / (s * camZoom), Math.exp((Math.log(1 + creepRate / 100) / FPS) * since))) * push;

  const file = cap?.file;
  const ok = Boolean(cap && file && hasStaticFile(file));
  const fillOf = (i: number) => (Array.isArray(maskFill) ? maskFill[i] : maskFill);
  // captures.json's covers are the logged "(Development)" ones; extra covers draw only if logged too (V5.md 8.1)
  const allMasks: CaptureMask[] = [...(cap?.masks ?? []).map((m, i) => ({ ...m, fill: m.fill ?? fillOf(i) })), ...allowedCovers(capture, masks, cap?.masks)];
  const [cx, cy, cw, ch] = seg.crop;

  const media = () => {
    if (!ok || !cap || !file) return null;
    const url = staticFile(file);
    const box = { width: cap.width, height: cap.height, display: "block" } as const;
    if (!isVideo) return <Img src={url} style={box} />;
    if (!video) return null;
    return segs.map((sg, i) => {
      const next = segs[i + 1]?.start ?? end + 8;
      const frames = Math.max(1, next - sg.start);
      // the region this segment can show: its crop, grown to the previous mat while the mat reframes after a jump
      const pv = i > 0 ? segs[i - 1] : sg;
      const ss = Math.min(1, sg.scale);
      const nw = Math.max(sg.crop[2], (pv.crop[2] * Math.min(1, pv.scale)) / ss);
      const nh = Math.max(sg.crop[3], (pv.crop[3] * Math.min(1, pv.scale)) / ss);
      const ncx = sg.crop[0] + sg.crop[2] / 2;
      const ncy = sg.crop[1] + sg.crop[3] / 2;
      const nx = Math.max(0, ncx - nw / 2);
      const ny = Math.max(0, ncy - nh / 2);
      const need: Box = [nx, ny, Math.min(cap.width - nx, nw), Math.min(cap.height - ny, nh)];
      const clip = clips ? proofClipFor(capture, need, sg.src, sg.src + frames / FPS) : undefined;
      return (
        <Sequence key={i} from={sg.start} durationInFrames={frames} layout="none">
          {clip ? (
            <Video
              src={staticFile(clip.file)}
              muted
              trimBefore={Math.round((sg.src - clip.t0) * FPS)}
              style={{ position: "absolute", left: clip.region[0], top: clip.region[1], width: clip.region[2], height: clip.region[3], display: "block" }}
            />
          ) : (
            <Video src={url} muted trimBefore={Math.round(sg.src * FPS)} style={{ position: "absolute", left: 0, top: 0, ...box }} />
          )}
        </Sequence>
      );
    });
  };

  return (
    <ProofMat w={w} h={h} x={x} y={y} at={at} dur={length} tag={tag} note={note} tilt={tilt} enter={enter} exit={exit} icon={icon} style={style}>
      {cropCheck && ok && cap && file ? <CropGuard capture={capture} file={file} kind={isVideo ? "video" : "still"} crops={segs.map((sg) => ({ crop: sg.crop, src: sg.src }))} /> : null}
      {ok ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: cap!.width,
            height: cap!.height,
            transformOrigin: "0 0",
            // the crop's centre sits at the mat's centre; the creep and the jump push scale about it
            transform: `translate(${w / 2}px, ${h / 2}px) scale(${s * k}) translate(${-(cx + cw / 2)}px, ${-(cy + ch / 2)}px)`,
          }}
        >
          <RealCaptureContext.Provider value={capture}>{media()}</RealCaptureContext.Provider>
          {allMasks.map((m, i) => (
            <div key={i} style={{ position: "absolute", left: m.box[0], top: m.box[1], width: m.box[2], height: m.box[3], background: m.fill ?? "#FFFFFF" }} />
          ))}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontSize: 26, color: DAY.textMuted }}>
          {`capture ${capture} not found`}
        </div>
      )}
    </ProofMat>
  );
};
