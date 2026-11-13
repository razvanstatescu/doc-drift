import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../brand/icons";
import { useTheme } from "../brand/theme";
import { FONT, typeStyle, type ThemeName } from "../brand/tokens";
import { clamp, EASE } from "../lib/time";
import { Counter } from "../motion/counter";
import { SetIn } from "../motion/text";

/**
 * A stat card for designed shots: one big value, a label, an optional small note. Flat (cards do not float), a
 * hairline on surface, radius 24. With `count`, a numeric value counts up from `count.from` over `count.dur` frames.
 * Numbers must come from the claims ledger: the eval harness or the demo space, labelled as such.
 *
 *   <StatCard at={0} value={0} label="AI calls" note="Deterministic matcher" />
 *   <StatCard at={6} value="40" label="scenarios" note="Our eval set" />
 */
export const StatCard: React.FC<{
  value: string | number;
  label: string;
  note?: string;
  icon?: IconName;
  at?: number;
  count?: { from?: number; dur?: number; decimals?: number };
  /** Value size in px (default 140). */
  size?: number;
  width?: number;
  theme?: ThemeName;
  style?: React.CSSProperties;
}> = ({ value, label, note, icon, at = 0, count, size = 140, width = 560, theme, style }) => {
  const frame = useCurrentFrame();
  const p = useTheme(theme);
  const land = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  if (land <= 0) return null;
  const valueNode =
    typeof value === "number" && count ? (
      <Counter to={value} from={count.from ?? 0} at={at + 4} dur={count.dur ?? 24} decimals={count.decimals ?? 0} />
    ) : (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    );
  return (
    <div
      style={{
        width,
        padding: "48px 56px 52px",
        borderRadius: 24,
        background: p.surface,
        boxShadow: `0 0 0 1px ${p.line}`,
        boxSizing: "border-box",
        opacity: land,
        transform: `translateY(${(1 - land) * 20}px)`,
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={52} color={p.textMuted} style={{ marginBottom: 28 }} /> : null}
      <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: size, lineHeight: 1, letterSpacing: "-0.035em", color: p.text }}>{valueNode}</div>
      <SetIn at={at + 6} mode="fade" style={{ ...typeStyle("body"), color: p.text, marginTop: 20 }}>
        {label}
      </SetIn>
      {note ? (
        <SetIn at={at + 10} mode="fade" style={{ ...typeStyle("small"), color: p.textMuted, marginTop: 8 }}>
          {note}
        </SetIn>
      ) : null}
    </div>
  );
};
