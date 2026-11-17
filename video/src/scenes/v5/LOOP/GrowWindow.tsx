import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, H, tween, W } from "../../../lib/time";
import { ink, type Rect } from "../../../v4/kit";

/**
 * The carry cut inside LOOP's long take (R6 technique 3): the incoming world opens as a rounded window growing out of
 * the object that stays on screen (the clock card), while the outgoing world keeps playing underneath, untouched.
 * Unlike the kit's GrowReveal it neither scales nor darkens the outgoing world, and it grows on a gentle ease, so no
 * frame changes a quarter of the picture at once: the take still measures as one shot (R6 section 6.8).
 * A hairline ring and a soft shadow draw the window's edge, so it reads on white pages.
 */
export const GrowWindow: React.FC<{
  at: number;
  dur: number;
  from: Rect;
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
  pad?: [number, number];
  radius?: number;
}> = ({ at, dur, from, outgoing, incoming, pad = [16, 12], radius = 26 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return <AbsoluteFill>{outgoing}</AbsoluteFill>;
  const g = tween(frame, at, at + dur, 0, 1, EASE.cubicInOut);
  if (g >= 1) return <AbsoluteFill>{incoming}</AbsoluteFill>;
  const start: Rect = { x: from.x - pad[0], y: from.y - pad[1], w: from.w + 2 * pad[0], h: from.h + 2 * pad[1] };
  const end: Rect = { x: -60, y: -60, w: W + 120, h: H + 120 };
  const lerp = (a: number, b: number) => a + (b - a) * g;
  const win: Rect = { x: lerp(start.x, end.x), y: lerp(start.y, end.y), w: lerp(start.w, end.w), h: lerp(start.h, end.h) };
  const r = lerp(radius, 0);
  const edge = 1 - tween(frame, at + dur - 5, at + dur, 0, 1, EASE.linear);
  return (
    <AbsoluteFill>
      <AbsoluteFill>{outgoing}</AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: win.x,
          top: win.y,
          width: win.w,
          height: win.h,
          borderRadius: r,
          boxShadow: `0 0 0 2px ${ink(0.14 * edge)}, 0 24px 60px ${ink(0.16 * edge)}`,
        }}
      />
      <AbsoluteFill style={{ clipPath: `inset(${win.y}px ${W - win.x - win.w}px ${H - win.y - win.h}px ${win.x}px round ${r}px)` }}>{incoming}</AbsoluteFill>
    </AbsoluteFill>
  );
};
