import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE, tween } from "../lib/time";
import { Mark, type MarkProps, type MarkVariant } from "./Mark";
import { useTheme } from "./theme";
import { FONT, type ThemeName } from "./tokens";

/**
 * The horizontal lockup (brand/logo.md): the icon, then "Doc Drift Sentinel" in Spline Sans 600 at 42% of the icon
 * height, a gap of 28% of the icon height, vertically centred. 120 px wide minimum. Never the name without the mark.
 *
 * Static by default. With `at`, it animates: the mark reveals (tile, bands land, the slip at at + 24), then the name
 * sets in from its own mask at at + 26 over 15 frames, and everything holds still.
 */
export const Lockup: React.FC<{
  /** Icon height in px. */
  height: number;
  /** Default: "icon" on Night, "icon-light" on Day. */
  variant?: MarkVariant;
  theme?: ThemeName;
  /** Animate from this local frame. */
  at?: number;
  /** Static overrides for the mark (slip, land, tile...). Ignored when `at` is set. */
  mark?: Partial<Omit<MarkProps, "size" | "variant">>;
  /** Static 0..1 progress of the name (1 = set). Ignored when `at` is set. */
  name?: number;
  style?: React.CSSProperties;
}> = ({ height, variant, theme, at, mark, name = 1, style }) => {
  const frame = useCurrentFrame();
  const p = useTheme(theme);
  const v = variant ?? (p.name === "night" ? "icon" : "icon-light");

  let markProps: Partial<MarkProps> = mark ?? {};
  let nameP = name;
  if (at !== undefined) {
    const f = frame - at;
    markProps = {
      tile: tween(f, 0, 8, 0, 1, EASE.expoOut),
      land: tween(f, 2, 17, 0, 1, EASE.linear),
      slip: tween(f, 24, 30, 0, 1, EASE.expoOut),
    };
    nameP = tween(f, 26, 41, 0, 1, EASE.expoOut);
  }

  const fontSize = height * 0.42;
  const opacity = interpolate(nameP, [0, 0.45], [0, 1], clamp);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.28, ...style }}>
      <Mark size={height} variant={v} {...markProps} />
      <div style={{ overflow: "hidden", padding: "0.1em 0.05em 0.2em", margin: "-0.1em -0.05em -0.2em" }}>
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: p.text,
            whiteSpace: "nowrap",
            opacity,
            transform: nameP < 1 ? `translateY(${(1 - nameP) * 105}%)` : undefined,
          }}
        >
          Doc Drift Sentinel
        </div>
      </div>
    </div>
  );
};
