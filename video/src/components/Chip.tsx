import React from "react";
import { Icon, type IconName } from "../brand/icons";
import { useTheme } from "../brand/theme";
import { FONT, type ThemeName } from "../brand/tokens";

/** Split a literal on "->" and the arrow character, so arrows are drawn as icons (Spline Sans has no U+2192). */
function withArrows(text: string, size: number | string, color: string) {
  const parts = text.split(/\s*(?:->|→)\s*/);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 ? (
        <span style={{ display: "inline-flex", verticalAlign: "-0.12em", margin: "0 0.35em" }}>
          <Icon name="arrow" size={size} color={color} />
        </span>
      ) : null}
    </React.Fragment>
  ));
}

/**
 * An inline literal in Spline Sans Mono (a path, a key, a command) for use inside sentences or lines.
 * "rollback.sh -> rollback-v2.sh" draws a real arrow.
 */
export const Code: React.FC<{ children: string; color?: string; weight?: number; theme?: ThemeName; style?: React.CSSProperties }> = ({
  children,
  color,
  weight = 400,
  theme,
  style,
}) => {
  const p = useTheme(theme);
  const c = color ?? p.text;
  return (
    <span style={{ fontFamily: FONT.mono, fontWeight: weight, letterSpacing: "-0.01em", color: c, whiteSpace: "pre", ...style }}>
      {withArrows(children, "0.9em", c)}
    </span>
  );
};

/**
 * A code-path chip: `payments-api: scripts/rollback.sh`, `deploy/helm/**`, `PAY-142`. Mono (>= 40 px), radius-cut
 * at film scale, a hairline on surface. `tone="beacon"` makes it the shot's one amber element (fill beacon, on-beacon
 * text). A `prefix` ("payments-api:") reads muted before the path.
 */
export const Chip: React.FC<{
  children: string;
  prefix?: string;
  icon?: IconName;
  /** Font size in px (default 44). */
  size?: number;
  tone?: "default" | "beacon" | "sunk";
  theme?: ThemeName;
  style?: React.CSSProperties;
}> = ({ children, prefix, icon, size = 44, tone = "default", theme, style }) => {
  const p = useTheme(theme);
  const bg = tone === "beacon" ? p.beacon : tone === "sunk" ? p.surfaceSunk : p.surface;
  const ink = tone === "beacon" ? p.onBeacon : p.text;
  const muted = tone === "beacon" ? p.onBeacon : p.textMuted;
  const border = tone === "beacon" ? "transparent" : p.line;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.4 * size,
        height: 1.9 * size,
        padding: `0 ${0.62 * size}px 0 ${(icon ? 0.5 : 0.62) * size}px`,
        borderRadius: 0.36 * size,
        background: bg,
        boxShadow: `0 0 0 ${tone === "beacon" ? 0 : 2}px ${border}`,
        fontFamily: FONT.mono,
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.01em",
        color: ink,
        whiteSpace: "pre",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={size * 0.95} color={muted} /> : null}
      <span>
        {prefix ? <span style={{ color: muted }}>{prefix} </span> : null}
        {withArrows(children, size * 0.9, ink)}
      </span>
    </div>
  );
};
