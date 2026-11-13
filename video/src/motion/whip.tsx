import React, { useId } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE } from "../lib/time";

/**
 * A whip pan between two surfaces (Bitbucket to Confluence, Confluence to the terminal), BRIEF section 7: 8 to 10
 * frames. The two surfaces sit side by side on one strip that travels one frame width: it accelerates out of the old
 * surface (expo in) and lands on the new one (expo out). The seam crosses the centre on `at`, the fastest frame:
 * put the whoosh's peak there. A directional blur scaled by the strip's speed is applied only while it moves, so
 * both surfaces are sharp before and after.
 *
 *   <Whip at={sc.cue("V14")} from={<BitbucketShot />} to={<ConfluenceShot />} direction="left" />
 */
export const Whip: React.FC<{
  at: number;
  from: React.ReactNode;
  to: React.ReactNode;
  /** Total frames, half before and half after `at` (default 8). */
  dur?: number;
  /** Direction the content travels (default "left": the old surface exits left, the new one enters from the right). */
  direction?: "left" | "right" | "up" | "down";
  /** Blur px per px of motion per frame (default 0.05), capped at `maxBlur`. */
  blurPerPx?: number;
  maxBlur?: number;
}> = ({ at, from, to, dur = 8, direction = "left", blurPerPx = 0.05, maxBlur = 40 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = "whip" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const half = dur / 2;
  if (frame < at - half) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= at + half) return <AbsoluteFill>{to}</AbsoluteFill>;

  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "left" || direction === "up" ? -1 : 1;
  const span = horizontal ? width : height;
  // strip travel 0..1: expo in up to the seam at the centre (0.5 on `at`), expo out after it
  const travel = (f: number) => {
    if (f <= at - half) return 0;
    if (f >= at + half) return 1;
    return f < at ? 0.5 * EASE.expoIn((f - (at - half)) / half) : 0.5 + 0.5 * EASE.expoOut((f - at) / half);
  };
  const t = travel(frame);
  const speed = Math.abs(travel(frame + 0.5) - travel(frame - 0.5)) * span; // px per frame
  const blur = Math.min(maxBlur, speed * blurPerPx);
  const offset = sign * t * span;
  const move = (d: number) => (horizontal ? `translateX(${d}px)` : `translateY(${d}px)`);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={horizontal ? `${blur} 0` : `0 ${blur}`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: blur > 0.3 ? `url(#${id})` : undefined }}>
        <AbsoluteFill style={{ transform: move(offset) }}>{from}</AbsoluteFill>
        <AbsoluteFill style={{ transform: move(offset - sign * span) }}>{to}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
