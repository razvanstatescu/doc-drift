import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../lib/time";
import { BylineItem, BYLINE, bylineItemSize } from "../twins/BylineItem";
import type { DdsState } from "../twins/types";
import { DAY, elevAt, type Rect } from "../look";

/**
 * LiftOut (v5 round 2, V5.md 8.1 and 8.2): where drift shows on a real capture, a CRAFTED copy of the label lifts out
 * of the real one and lands big beside it (about 100 px type), carrying the amber; the real capture is never painted
 * and stays untouched underneath. The copy is our BylineItem twin ("Possibly stale · Doc Drift" with its slip, trace,
 * glow and bloom), drawn at its final size and scaled down so it starts exactly on the real label's screen rect.
 * Verified never carries amber.
 *
 *   const label = capRectToScreen(pose, FLAGGED_ITEM);   // the real byline item, from capture px to screen px
 *   <LiftOut from={label} at={sc.marker("flag") - sc.from} to={{ x: 980, y: 660 }} />
 */
export type LiftOutProps = {
  /** The real label's rect on screen (screen px; from capture px with capRectToScreen). */
  from: Rect;
  /** The lift starts (the copy appears on the real label and rises). */
  at: number;
  /** Frames of the flight to the big place (default 18, expo out). */
  dur?: number;
  /** Top-left of the big label on screen. */
  to: { x: number; y: number };
  /** Type size of the big label, px (default 100). */
  size?: number;
  /** The state it reads (default "possibly_stale", which carries the amber; "verified" never does). */
  state?: DdsState;
  /** A white card behind the big label, fading in once it has left the real label (default true). */
  card?: boolean;
  /** It leaves from this frame: drops back toward the real label and fades (8 frames). */
  out?: number;
  /** Arc of the flight, px (default 40, upward). */
  arc?: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const LiftOut: React.FC<LiftOutProps> = ({ from, at, dur = 18, to, size = 100, state = "possibly_stale", card = true, out, arc = 40 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const k = size / BYLINE.size;
  const item = bylineItemSize(state, k);
  const t = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  const back = out !== undefined ? tween(frame, out, out + 8, 0, 1, EASE.expoIn) : 0;
  if (back >= 1) return null;
  const s0 = from.h / item.h; // the copy starts at the real label's height
  const s = lerp(s0, 1, t) * (1 - 0.35 * back);
  const x = lerp(from.x, to.x, t);
  const y = lerp(from.y, to.y, t) - arc * Math.sin(Math.PI * t) + 30 * back;
  const appear = tween(frame, at, at + 3, 0, 1, EASE.linear);
  const opacity = appear * (1 - tween(frame, out ?? 1e9, (out ?? 1e9) + 8, 0, 1, EASE.linear));
  // the card (and its shadow) only once the copy has cleared the real label: nothing is painted over the capture
  const plate = card ? tween(t, 0.35, 0.8, 0, 1, EASE.linear) : 0;
  const padX = 0.32 * size;
  const padY = 0.24 * size;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: item.w,
        height: item.h,
        transformOrigin: "0 0",
        transform: `scale(${s})`,
        opacity: opacity < 1 ? opacity : undefined,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {plate > 0 ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -padX,
            top: -padY,
            width: item.w + 2 * padX + item.w * 0.14,
            height: item.h + 2 * padY,
            borderRadius: 0.36 * size,
            background: DAY.surface,
            boxShadow: elevAt(1 + 3 * plate),
            opacity: plate,
          }}
        />
      ) : null}
      <BylineItem state={state} k={k} lit={state === "possibly_stale" ? 1 : 0} />
    </div>
  );
};
