import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE } from "../../lib/time";

/**
 * A quiet line that fades up while it rises 0.2 em: opacity runs LINEARLY over `dur` frames (default 10), so it sets
 * in instead of popping (the kit's SetIn "fade" mode reaches full opacity in about 2 frames). Then it holds still.
 *
 * `parts` sets a line in piece by piece without moving anything: every piece is laid out from the first frame and
 * only fades up at its own frame (the eval line on P2's card: its numbers appear one by one and never change).
 */
export const FadeText: React.FC<{
  at: number;
  dur?: number;
  parts?: { text: string; at: number }[];
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, dur = 10, parts, children, style }) => {
  const frame = useCurrentFrame();
  const piece = (from: number) => {
    const o = interpolate(frame, [from, from + dur], [0, 1], clamp);
    const y = interpolate(frame, [from, from + dur + 4], [0.2, 0], { ...clamp, easing: EASE.expoOut });
    return { opacity: o, transform: y > 0 ? `translateY(${y}em)` : undefined, display: "inline-block", whiteSpace: "pre" as const };
  };
  if (parts) {
    return (
      <div style={style}>
        {parts.map((p, i) => (
          <span key={i} style={piece(p.at)}>
            {p.text}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div style={style}>
      <span style={piece(at)}>{children}</span>
    </div>
  );
};
