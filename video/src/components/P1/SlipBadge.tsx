import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { DAY, SLIP_UNIT } from "../../brand/tokens";
import { findCapture, type Box } from "../../lib/captures";
import { glowShadow, slipProgress, SNAP_FRAMES } from "../../motion/slip";
import { CAP, VideoAt } from "./stage";

/**
 * The film's slip on the REAL byline badge (P2 and P4): the badge's own pixels, cut from a capture, slide one slip
 * unit right (6 f, expo out) with the amber glow, and a trace stays at the home position. On `back` it snaps home
 * (8 f) and the glow fades. Drawn in capture space inside <ProductStage>, over the layer that shows the same page.
 * The badge text is never redrawn: every pixel of the moving piece is the capture itself.
 *
 * - `home`: the badge it becomes on the snap (for example Verified): its pixels replace `out` once the badge is more
 *   than half way home (the glow is down to half), so the new word never sits out of line in the amber ring. The
 *   trace shrinks to the home badge's width and fades out over the snap's first 3 frames, so no empty slot is left
 *   beside the shorter word.
 * - `patch`: the colour behind the badge at home (white, or Confluence's hover pill), hiding the base layer's badge.
 * - `from` / `until`: local frames this piece is drawn (to swap pixels when the base layer changes).
 */
export type BadgePixels = {
  /** Capture id the pixels come from. */
  id: string;
  /** Recordings: the source second to cut from. */
  t?: number;
  /** Icon and label, with a little padding, in capture px. Keep the "(Development)" suffix out of it. */
  box: Box;
};

const Pixels: React.FC<{ px: BadgePixels }> = ({ px }) => {
  const cap = findCapture(px.id);
  if (!cap) return null;
  const url = staticFile(cap.file);
  const style: React.CSSProperties = { position: "absolute", left: -px.box[0], top: -px.box[1], width: cap.width ?? CAP.w, height: cap.height ?? CAP.h };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: px.box[2], height: px.box[3], overflow: "hidden" }}>
      {cap.kind === "video" ? <VideoAt src={url} t={px.t ?? 0} style={style} /> : <Img src={url} style={style} />}
    </div>
  );
};

export const SlipBadge: React.FC<{
  out: BadgePixels;
  home?: BadgePixels;
  at: number;
  back?: number;
  patch?: string;
  from?: number;
  until?: number;
  /** Corner radius in capture px. */
  radius?: number;
  /** Glow scale in capture px (1 = UI size). */
  k?: number;
}> = ({ out, home, at, back, patch = "#FFFFFF", from, until, radius = 14, k = 2.2 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  if (from !== undefined && frame < from) return null;
  if (until !== undefined && frame >= until) return null;
  if (back !== undefined && frame >= back + SNAP_FRAMES) return null;
  const s = slipProgress(frame, at, back);
  // one distance for the whole move (from the out-of-line badge), so the snap lands exactly where the slip began
  const dx = s * SLIP_UNIT * out.box[2];
  const snapping = back !== undefined && frame >= back;
  const homeNow = home !== undefined && snapping && s < 0.5;
  const px = homeNow && home ? home : out;
  const w = Math.max(out.box[2], home?.box[2] ?? 0);
  const [x, y, , h] = out.box;
  const traceW = snapping && home ? home.box[2] : out.box[2];
  const traceO = snapping ? Math.max(0, 1 - (frame - (back ?? 0)) / 3) : Math.min(1, s / 0.25);
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: patch }} />
      <div style={{ position: "absolute", left: x, top: y, width: traceW, height: h, borderRadius: radius, background: DAY.trace, opacity: traceO }} />
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: px.box[2],
          height: h,
          borderRadius: radius,
          overflow: "hidden",
          background: patch,
          transform: `translateX(${dx}px)`,
          boxShadow: glowShadow(DAY, s, k),
        }}
      >
        <Pixels px={px} />
      </div>
    </>
  );
};
