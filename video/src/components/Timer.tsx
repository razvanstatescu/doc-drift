import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../brand/theme";
import { FONT, typeStyle, type ThemeName } from "../brand/tokens";
import { clamp, EASE } from "../lib/time";

/**
 * The merge-to-flag timer (P2): a mono reading that runs from 0 to the REAL measured seconds (captures.json
 * `measured.mergeToFlagSeconds`, via measured() in lib/captures) over `dur` film frames, linearly like a clock, then
 * holds. A hairline under it fills as it runs. Only the final value is a claim; the compressed run is a device.
 *
 *   <Timer at={sc.cue("V14")} dur={45} seconds={measured("mergeToFlagSeconds", 11)} label="Merge to flag" />
 */
export const Timer: React.FC<{
  seconds: number;
  at?: number;
  /** Film frames the count takes (default 45). */
  dur?: number;
  /** "clock" 00:11 (default), "seconds" 11 s, "precise" 11.0 s. */
  format?: "clock" | "seconds" | "precise";
  label?: string;
  /** Reading size in px (default 120). */
  size?: number;
  /** Show the progress hairline (default true). */
  bar?: boolean;
  theme?: ThemeName;
  style?: React.CSSProperties;
}> = ({ seconds, at = 0, dur = 45, format = "clock", label, size = 120, bar = true, theme, style }) => {
  const frame = useCurrentFrame();
  const p = useTheme(theme);
  const t = interpolate(frame, [at, at + dur], [0, seconds], { ...clamp, easing: EASE.linear });
  const done = frame >= at + dur;
  const shown = done ? seconds : t;
  const text =
    format === "clock"
      ? `${String(Math.floor(shown / 60)).padStart(2, "0")}:${String(Math.floor(shown % 60)).padStart(2, "0")}`
      : format === "precise"
        ? `${shown.toFixed(1)} s`
        : `${Math.floor(shown)} s`;
  const fill = interpolate(frame, [at, at + dur], [0, 1], clamp);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 20, ...style }}>
      {label ? <div style={{ ...typeStyle("small"), color: p.textMuted }}>{label}</div> : null}
      <div style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: size, lineHeight: 1, letterSpacing: "-0.03em", color: p.text, fontVariantNumeric: "tabular-nums" }}>
        {text}
      </div>
      {bar ? (
        <div style={{ height: 4, borderRadius: 2, background: p.line, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${fill * 100}%`, background: p.text }} />
        </div>
      ) : null}
    </div>
  );
};
