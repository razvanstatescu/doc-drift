import React from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, Freeze, Img, staticFile, useCurrentFrame } from "remotion";
import { useTheme } from "../../brand/theme";
import { DAY, FONT } from "../../brand/tokens";
import { findCapture, type Box } from "../../lib/captures";
import { hasStaticFile } from "../../lib/files";
import { FPS } from "../../lib/time";
import { cameraAt } from "../../motion/camera";
import { Whip } from "../../motion/whip";
import { BrowserFrame } from "../BrowserFrame";
import { Cursor, type CursorPoint } from "../Cursor";

/**
 * Shared pieces for the product scenes P1 to P5 (product builder). Real UI from captures.json sits in our BrowserFrame
 * on the Day ground; a camera moves over the capture in CAPTURE px (2x of CSS, 3840 x 2160 for every capture).
 *
 * Differences from the kit's <Shot>, and why:
 * - Several captures of one surface share ONE camera and ONE cursor (a cut from a still to the recording of the same
 *   screen keeps the framing, the way an edit of one take would).
 * - Camera keys use an ABSOLUTE scale `s` (frame px per capture px), so legibility is plain arithmetic: Confluence's
 *   14 px CSS text is 28 capture px, so it reads at 28 px or more when s >= 1.
 * - Recordings are time-remapped with <Freeze> around @remotion/media's <Video> (a piecewise-linear map from scene
 *   frame to source seconds), so typing, streaming and spinners can be compressed while the motion stays real.
 * - Logged masks can take a fill: behind Confluence's modals the page is dimmed, so a white cover would show. Extra
 *   covers can be limited to frame ranges.
 */

/** The frame for real UI: 1600 x 900 at (160, 90) with a 64 px label bar, so the camera's view is 1600 x 836. */
export const FRAME = { x: 160, y: 90, w: 1600, h: 900 } as const;
export const BAR = 64;
export const VIEW = { w: FRAME.w, h: FRAME.h - BAR } as const;
export const CAP = { w: 3840, h: 2160 } as const;
/** Confluence's modal backdrop over the page and the hover pill of a byline item (both sampled from the stills). */
export const DIM = "#8D8F98";
export const PILL = "#F1F1F2";
/** The Doc Drift modal spans x 1120 to 2720 in every modal still and recording. */
export const MODAL = { left: 1120, right: 2720 } as const;

/** A camera key: centre (x, y) in capture px at scale s, reached `dur` frames after `frame` (expo out), then still. */
export type Cam = { frame: number; x: number; y: number; s: number; dur?: number; ease?: (t: number) => number };
export type CamState = { x: number; y: number; s: number };

/** Keep the view inside the capture. */
export function clampCam(c: CamState, view: { w: number; h: number } = VIEW): CamState {
  const fit = (v: number, half: number, size: number) => (half * 2 >= size ? size / 2 : Math.max(half, Math.min(size - half, v)));
  return { x: fit(c.x, view.w / (2 * c.s), CAP.w), y: fit(c.y, view.h / (2 * c.s), CAP.h), s: c.s };
}

/** The camera at `frame`. The first key is the resting state (give it frame 0 and dur 0). */
export function camAt(frame: number, keys: Cam[], view: { w: number; h: number } = VIEW): CamState {
  const sorted = [...keys].sort((a, b) => a.frame - b.frame);
  const first = sorted[0];
  const c = cameraAt(
    frame,
    sorted.map((k) => ({ frame: k.frame, x: k.x, y: k.y, zoom: k.s, dur: k.dur ?? 20, ease: k.ease })),
    { x: first.x, y: first.y, zoom: first.s },
  );
  return clampCam({ x: c.x, y: c.y, s: c.zoom }, view);
}

/**
 * A recording showing source second `t`, whatever the scene frame is. <Freeze> alone is not enough: Remotion clamps
 * the frozen frame to the composition's length (Scenes/P1 is 360 frames, so 14 s of source would read as 11.97 s).
 * So the whole seconds go into `trimBefore` and only the fraction is frozen.
 */
export const VideoAt: React.FC<{ src: string; t: number; style?: React.CSSProperties }> = ({ src, t, style }) => {
  const whole = Math.max(0, Math.floor(t));
  return (
    <Freeze frame={Math.max(0, t - whole) * FPS}>
      <Video src={src} muted trimBefore={whole * FPS} style={style} />
    </Freeze>
  );
};

/** The first scene frame whose source time (mapTime) reaches `t` (for covers that must follow the recording). */
export function frameAtTime(keys: [number, number][], t: number): number {
  for (let i = 1; i < keys.length; i++) {
    const [f0, t0] = keys[i - 1];
    const [f1, t1] = keys[i];
    if (t1 >= t && t1 !== t0) return Math.ceil(f0 + ((t - t0) / (t1 - t0)) * (f1 - f0));
  }
  return keys.length > 0 ? keys[keys.length - 1][0] : 0;
}

/** Piecewise-linear map from scene frame to source seconds, held outside its range. */
export function mapTime(frame: number, keys: [number, number][]): number {
  if (keys.length === 0) return 0;
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, t1] = keys[i];
    const [f0, t0] = keys[i - 1];
    if (frame <= f1) return f1 === f0 ? t1 : t0 + ((t1 - t0) * (frame - f0)) / (f1 - f0);
  }
  return keys[keys.length - 1][1];
}

/** A flat cover. `fill` may follow the frame (a cover on a hover pill that fades in with the recording). */
export type Cover = { box: Box; fill?: string | ((frame: number) => string); from?: number; to?: number; why?: string };

export type Layer = {
  /** Capture id in captures.json. */
  id: string;
  /** Local frames the layer is on screen: from (inclusive) to (exclusive). */
  from: number;
  to?: number;
  /** Recordings: [scene frame, source seconds] pairs (see mapTime). Stills ignore it. */
  time?: [number, number][];
  /** Fill for the logged masks of this capture (default white). */
  maskFill?: string;
  /** Extra covers, drawn after the logged masks. */
  covers?: Cover[];
  /** false: skip the logged masks (only where a logged box is wrong for this capture; say why in `covers`). */
  loggedMasks?: boolean;
};

/** One capture (still or time-remapped recording) at capture size, with its covers. */
export const CaptureLayer: React.FC<{ layer: Layer }> = ({ layer }) => {
  const frame = useCurrentFrame();
  const cap = findCapture(layer.id);
  if (!cap || !hasStaticFile(cap.file)) {
    return (
      <AbsoluteFill style={{ width: CAP.w, height: CAP.h, background: "#E8EEEF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 64, color: "#4A6670" }}>{`capture ${layer.id} not found`}</div>
      </AbsoluteFill>
    );
  }
  const url = staticFile(cap.file);
  const logged = layer.loggedMasks === false ? [] : (cap.masks ?? []).map((m) => ({ box: m.box, fill: m.fill ?? layer.maskFill }));
  const covers = [...logged, ...(layer.covers ?? [])].filter(
    (m: Cover) => (m.from === undefined || frame >= m.from) && (m.to === undefined || frame < m.to),
  );
  const media =
    cap.kind === "video" ? (
      <VideoAt src={url} t={mapTime(frame, layer.time ?? [[0, 0]])} style={{ width: cap.width, height: cap.height, display: "block" }} />
    ) : (
      <Img src={url} style={{ width: cap.width, height: cap.height, display: "block" }} />
    );
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: cap.width, height: cap.height }}>
      {media}
      {covers.map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: m.box[0],
            top: m.box[1],
            width: m.box[2],
            height: m.box[3],
            background: typeof m.fill === "function" ? m.fill(frame) : (m.fill ?? "#FFFFFF"),
          }}
        />
      ))}
    </div>
  );
};

/** Confluence's modal casts a soft shadow on the dimmed page just right of its edge (sampled, x 2720 to 2748). */
const EDGE_SHADOW =
  "linear-gradient(to right, rgb(124,126,133) 0px, rgb(132,134,142) 1px, rgb(135,137,145) 2px, rgb(136,138,146) 6px, rgb(138,140,148) 10px, rgb(139,141,150) 14px, rgb(140,142,151) 20px, rgb(141,143,152) 28px)";

/**
 * Covers for a logged "(Development)" mask while the Doc Drift modal is open (x 1120 to 2720). The part of the
 * byline under the modal is hidden by the modal itself, so no cover is drawn there (a white box would sit on the
 * modal's content). The part on the dimmed page is covered in the backdrop's colour, with the modal's own shadow
 * redrawn at its edge. `tail`: where the suffix really ends, when the logged box is for another state of the badge
 * (a recording's masks are measured on its last still).
 */
export function modalMaskCovers(box: Box, tail = 0): Cover[] {
  const [x, y, w, h] = box;
  const right = Math.max(x + w, tail);
  if (right <= MODAL.right) return [];
  if (x >= MODAL.right) return [{ box: [x - 4, y - 3, right - x + 8, h + 6], fill: DIM, why: "suffix on the dimmed page" }];
  return [{ box: [MODAL.right, y - 3, Math.max(right, MODAL.right + 30) - MODAL.right + 4, h + 6], fill: EDGE_SHADOW, why: "suffix tail on the dimmed page" }];
}

/** All logged masks of a capture, as covers for a shot where the modal is open (use with loggedMasks: false). */
export function modalCovers(id: string, tail = 0): Cover[] {
  const cap = findCapture(id);
  return (cap?.masks ?? []).flatMap((m) => {
    const [x, y, w, h] = m.box;
    // a mask left of the modal (the sidebar's "Drift dashboard (Development)") sits on the dimmed page
    if (x + w <= MODAL.left) return [{ box: [x - 4, y - 3, w + 8, h + 6] as Box, fill: DIM, why: m.why }];
    return modalMaskCovers(m.box, y > 380 && y < 520 ? tail : 0);
  });
}

/**
 * The kit cursor starts each move `travel` frames before its target frame (12 to 26 f from the distance). When two
 * targets are closer in time than that, the next move would start before the previous click lands: cap each move to
 * the gap, so the cursor is ON every target at its frame.
 */
export function fitCursor(points: CursorPoint[]): CursorPoint[] {
  const pts = [...points].sort((a, b) => a.frame - b.frame);
  return pts.map((b, i) => {
    if (i === 0 || b.travel !== undefined) return b;
    const a = pts[i - 1];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const natural = Math.round(Math.max(12, Math.min(26, 10 + d / 55)));
    return { ...b, travel: Math.max(6, Math.min(natural, b.frame - a.frame - 2)) };
  });
}

/**
 * The stage: our frame, the captures under one camera, a cursor of constant on-screen size, and anything else drawn
 * in capture space (children: slip badges, tooltips). `overlay` is drawn in view px above everything.
 */
export const ProductStage: React.FC<{
  label?: string;
  cam: Cam[];
  layers: Layer[];
  cursor?: CursorPoint[];
  cursorShow?: number;
  cursorHide?: number;
  /** On-screen cursor scale (1 = a 32 px cursor). */
  cursorScale?: number;
  children?: React.ReactNode;
  overlay?: React.ReactNode;
  frame?: { x: number; y: number; w: number; h: number };
}> = ({ label, cam, layers, cursor, cursorShow, cursorHide, cursorScale = 1.45, children, overlay, frame: box = FRAME }) => {
  const frame = useCurrentFrame();
  const p = useTheme("day");
  const view = { w: box.w, h: box.h - (label ? BAR : 0) };
  const c = camAt(frame, cam, view);
  const active = layers.filter((l) => frame >= l.from && (l.to === undefined || frame < l.to));
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y }}>
      <BrowserFrame width={box.w} height={box.h} label={label} theme="day">
        <div style={{ position: "absolute", left: 0, top: 0, width: view.w, height: view.h, overflow: "hidden", background: p.surface }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: CAP.w,
              height: CAP.h,
              transformOrigin: "0 0",
              transform: `translate(${view.w / 2}px, ${view.h / 2}px) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`,
            }}
          >
            {active.map((l) => (
              <CaptureLayer key={`${l.id}-${l.from}`} layer={l} />
            ))}
            {children}
            {cursor && cursor.length > 0 ? <Cursor points={fitCursor(cursor)} scale={cursorScale / c.s} showAt={cursorShow} hideAt={cursorHide} theme="day" /> : null}
          </div>
          {overlay}
        </div>
      </BrowserFrame>
    </div>
  );
};

/**
 * Whips between the product scenes are split at the scene boundary, as A2 hands over to P1: the outgoing scene whips
 * its last picture out to the Day ground in its last 4 frames, the incoming scene whips its first picture in over its
 * first 4, so the seam (the fastest frame) lands on the bar line where the scenes meet. Put the whoosh in the
 * outgoing scene, its peak 3 frames before the end.
 */
const Ground: React.FC = () => <AbsoluteFill style={{ background: DAY.ground }} />;
export const WhipOut: React.FC<{ end: number; children: React.ReactNode }> = ({ end, children }) => (
  <Whip at={end} dur={8} from={children} to={<Ground />} />
);
/** `dur` 8 lands in 4 frames (the seam on frame `at`); a longer `dur` gives the incoming picture a longer landing. */
export const WhipIn: React.FC<{ at?: number; dur?: number; children: React.ReactNode }> = ({ at = 0, dur = 8, children }) => (
  <Whip at={at} dur={dur} from={<Ground />} to={children} />
);
