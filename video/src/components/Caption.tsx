import React from "react";
import { AbsoluteFill } from "remotion";
import { useTheme } from "../brand/theme";
import { SAFE, typeStyle, type ThemeName, type TypeName } from "../brand/tokens";
import { SetIn } from "../motion/text";

/**
 * Big statement type: Spline Sans 600, sentence case, sets in over 15 frames, then holds perfectly still.
 * Default size is `headline` (120 px); the cold open's captions use `hero` (156 px).
 *
 *   <Caption at={0} center size="hero">The code moved.</Caption>
 *   <Caption at={sc.cue("V05", "end")} lines={["A date can't", "see a merge."]} />
 *
 * Give it its reading time before `out`: holdFrames(text) from lib/time, counted from at + 15.
 */
export const Caption: React.FC<{
  children?: string;
  lines?: string[];
  at?: number;
  out?: number;
  size?: TypeName;
  by?: "line" | "word";
  /** Centre the block in the title-safe area of the frame. */
  center?: boolean;
  align?: "left" | "center" | "right";
  /** Text colour override (default `text`). */
  color?: string;
  maxWidth?: number;
  theme?: ThemeName;
  style?: React.CSSProperties;
}> = ({ children, lines, at = 0, out, size = "headline", by = "line", center = false, align, color, maxWidth = SAFE.w, theme, style }) => {
  const p = useTheme(theme);
  const block = (
    <SetIn
      at={at}
      out={out}
      by={by}
      lines={lines}
      align={align ?? (center ? "center" : "left")}
      style={{ ...typeStyle(size), color: color ?? p.text, maxWidth, ...style }}
    >
      {children}
    </SetIn>
  );
  if (!center) return block;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: `${SAFE.y}px ${SAFE.x}px` }}>{block}</AbsoluteFill>
  );
};
