import React from "react";
import { useTheme } from "../brand/theme";
import { FONT, type ThemeName } from "../brand/tokens";

/** Scale every px length in a CSS shadow (UI tokens are at 1x; the film draws UI at about 2x). */
export const scaleShadow = (shadow: string, k: number) => shadow.replace(/(-?\d*\.?\d+)px/g, (_, n) => `${+(Number(n) * k).toFixed(2)}px`);

/**
 * Our own minimal frame for real UI (BRIEF section 7): radius 24, a hairline, shadow-raise, nothing that imitates a
 * browser (no tabs, no traffic lights, no address bar). An optional quiet label bar names the surface ("Confluence",
 * "Bitbucket"). Children fill the content area (use <Shot> inside).
 */
export const BrowserFrame: React.FC<{
  width: number;
  height: number;
  theme?: ThemeName;
  radius?: number;
  /** A short name in a slim top bar. Omit for no bar. */
  label?: string;
  /** Shadow scale (default 2: the UI shadow at film size). 0 for flat. */
  shadow?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ width, height, theme, radius = 24, label, shadow = 2, style, children }) => {
  const p = useTheme(theme);
  const bar = label ? 64 : 0;
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: radius,
        background: p.surface,
        boxShadow: shadow > 0 ? `0 0 0 1px ${p.line}, ${scaleShadow(p.shadowRaise, shadow)}` : `0 0 0 1px ${p.line}`,
        overflow: "hidden",
        ...style,
      }}
    >
      {label ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: bar,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `1px solid ${p.line}`,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 26,
            color: p.textMuted,
            letterSpacing: "0.005em",
          }}
        >
          {label}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: bar, bottom: 0, overflow: "hidden" }}>{children}</div>
    </div>
  );
};

/** The content box of a BrowserFrame (to size a <Shot> inside it). */
export const frameContent = (width: number, height: number, label?: string) => ({ width, height: height - (label ? 64 : 0) });
