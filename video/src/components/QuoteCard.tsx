import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../brand/theme";
import { FONT, typeStyle, type ThemeName } from "../brand/tokens";
import { clamp, EASE } from "../lib/time";
import { SetIn } from "../motion/text";

/**
 * A verbatim quote with its source and year in small plain type: the Night world's house style for words other people
 * wrote (BRIEF decisions 1 and 11). Never edit the words; individuals are named only as their source
 * ("Hacker News comment, 2021"). The card lands in 12 frames, the quote sets in line by line, the credit last.
 *
 *   <QuoteCard at={0} quote="Outdated docs are worse than no docs." source="Hacker News comment" year={2021} />
 */
export const QuoteCard: React.FC<{
  quote: string;
  source: string;
  year?: string | number;
  at?: number;
  out?: number;
  width?: number;
  /** Quote size in px (default 60; keep 56 or more). */
  size?: number;
  /** Add curly quotes around the text (default true). */
  marks?: boolean;
  theme?: ThemeName;
  style?: React.CSSProperties;
}> = ({ quote, source, year, at = 0, out, width = 1280, size = 60, marks = true, theme = "night", style }) => {
  const frame = useCurrentFrame();
  const p = useTheme(theme);
  const land = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  const leave = out === undefined ? 0 : interpolate(frame, [out, out + 8], [0, 1], { ...clamp, easing: EASE.expoIn });
  if (land <= 0 || leave >= 1) return null;
  const text = marks ? `“${quote.replace(/^["“]|["”]$/g, "")}”` : quote;
  const credit = year !== undefined ? `${source}, ${year}` : source;
  return (
    <div
      style={{
        width,
        padding: "64px 72px 60px",
        borderRadius: 24,
        background: p.surface,
        boxShadow: `0 0 0 1px ${p.line}`,
        opacity: land * (1 - leave),
        transform: `translateY(${(1 - land) * 24}px)`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <SetIn
        at={at + 4}
        by="word"
        stagger={1}
        dur={14}
        style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: size, lineHeight: `${Math.round(size * 1.28)}px`, letterSpacing: "-0.015em", color: p.text }}
      >
        {text}
      </SetIn>
      <SetIn at={at + 14} mode="fade" style={{ ...typeStyle("credit"), color: p.textMuted, marginTop: 36 }}>
        {credit}
      </SetIn>
    </div>
  );
};
