import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE } from "../lib/time";
import { glowShadow } from "../motion/slip";
import { Icon, type IconName } from "./icons";
import { useTheme } from "./theme";
import { FONT, type Palette, type ThemeName } from "./tokens";

/**
 * Our brand state badge (brand README, Status system; design-reference board 5): radius-cut, 28 px tall, a 16 px
 * icon and a 13 px label at 500, at UI size (k = 1). A state always shows its word and its icon, never colour alone.
 * This is OUR badge for designed shots. Inside Confluence the real badge renders with Atlassian tokens: show that one
 * from a capture.
 */
export type BadgeState = "verified" | "possibly_stale" | "stale" | "unanchored";

export const BADGE_LABEL: Record<BadgeState, string> = {
  verified: "Verified",
  possibly_stale: "Possibly stale",
  stale: "Stale",
  unanchored: "Unanchored",
};

export const BADGE_ICON: Record<BadgeState, IconName> = {
  verified: "check",
  possibly_stale: "slip",
  stale: "clock",
  unanchored: "trace",
};

/** Sizes as multiples of the UI badge (k): md is 84 px tall with a 39 px label. */
export const BADGE_SIZES = { xs: 1.5, sm: 2.25, md: 3, lg: 4, xl: 5.5 } as const;
export type BadgeSize = keyof typeof BADGE_SIZES;

export function badgeColors(state: BadgeState, p: Palette) {
  switch (state) {
    case "verified":
      return { fill: p.verifiedTint, ink: p.verified };
    case "possibly_stale":
      return { fill: p.beacon, ink: p.onBeacon };
    case "stale":
      return { fill: p.staleTint, ink: p.stale };
    case "unanchored":
      return { fill: p.unanchoredTint, ink: p.unanchored };
  }
}

export const Badge: React.FC<{
  state: BadgeState;
  size?: BadgeSize | number;
  theme?: ThemeName;
  /** 0..1 shadow-glow (the one drifted item in view). */
  glow?: number;
  /** Override the label (keep the state's name; for example a trailing count). */
  label?: string;
  style?: React.CSSProperties;
}> = ({ state, size = "md", theme, glow = 0, label, style }) => {
  const p = useTheme(theme);
  const k = typeof size === "number" ? size : BADGE_SIZES[size];
  const c = badgeColors(state, p);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5 * k,
        height: 28 * k,
        padding: `0 ${10 * k}px 0 ${7 * k}px`,
        borderRadius: 8 * k,
        background: c.fill,
        color: c.ink,
        fontFamily: FONT.sans,
        fontWeight: 500,
        fontSize: 13 * k,
        lineHeight: 1,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        boxShadow: glow > 0 ? glowShadow(p, glow, k) : undefined,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <Icon name={BADGE_ICON[state]} size={16 * k} color={c.ink} />
      <span style={{ transform: `translateY(${0.02 * 13 * k}px)` }}>{label ?? BADGE_LABEL[state]}</span>
    </div>
  );
};

/**
 * One badge changing state at `at`: the old one rolls up and out (6 f, expo in), the new one rises in (10 f, expo out,
 * from at + 3). Both are left-aligned in one cell, so the pill's width follows the new label.
 */
export const BadgeSwap: React.FC<{
  from: BadgeState;
  to: BadgeState;
  at: number;
  size?: BadgeSize | number;
  theme?: ThemeName;
  /** Glow on the new badge (for example 1 when it becomes Possibly stale). */
  glowTo?: number;
  glowFrom?: number;
  style?: React.CSSProperties;
}> = ({ from, to, at, size = "md", theme, glowTo = 0, glowFrom = 0, style }) => {
  const frame = useCurrentFrame();
  const outP = interpolate(frame, [at, at + 6], [0, 1], { ...clamp, easing: EASE.expoIn });
  const inP = interpolate(frame, [at + 3, at + 13], [0, 1], { ...clamp, easing: EASE.expoOut });
  return (
    <div style={{ display: "inline-grid", ...style }}>
      {outP < 1 ? (
        <div style={{ gridArea: "1 / 1", opacity: 1 - outP, transform: `translateY(${-outP * 30}%)` }}>
          <Badge state={from} size={size} theme={theme} glow={glowFrom * (1 - outP)} />
        </div>
      ) : null}
      {inP > 0 ? (
        <div style={{ gridArea: "1 / 1", opacity: inP, transform: `translateY(${(1 - inP) * 30}%)` }}>
          <Badge state={to} size={size} theme={theme} glow={glowTo * inP} />
        </div>
      ) : null}
    </div>
  );
};
