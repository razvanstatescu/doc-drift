import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../lib/time";
import { KineticLine, type LineMark } from "../../v4/kit";

/**
 * A focal statement set whole on a beat, with a push (QA round 2, K-7: vary the entrance; not every line builds word by
 * word). All its words rise together in `dur` frames and land on `at` while the line settles from `push` x to 1x about
 * its left edge, so it reads as one decisive push onto the words. Words are the narration's own; `exit` throws them
 * off upward as KineticLine does.
 */
export const WholeLine: React.FC<{
  text: string;
  /** Local frame the whole line has landed (put it on a beat). */
  at: number;
  size: number;
  lineHeight?: number;
  /** Starting scale of the push (default 1.16). */
  push?: number;
  /** Frames of the arrival (default 10). */
  dur?: number;
  exit?: { at: number; stagger?: number; dur?: number };
  mark?: LineMark | LineMark[];
  style?: React.CSSProperties;
}> = ({ text, at, size, lineHeight, push = 1.16, dur = 10, exit, mark, style }) => {
  const frame = useCurrentFrame();
  if (frame < at - dur) return null;
  const t = tween(frame, at - dur, at, 0, 1, EASE.expoOut);
  const s = 1 + (push - 1) * (1 - t);
  return (
    <div style={{ transform: s > 1.0005 ? `scale(${s})` : undefined, transformOrigin: "0% 50%", ...style }}>
      <KineticLine text={text} at={at - dur} stagger={0} dur={dur} rise={0.16} smear={0.06} size={size} lineHeight={lineHeight} exit={exit} mark={mark} />
    </div>
  );
};
