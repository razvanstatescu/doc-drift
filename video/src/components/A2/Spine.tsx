import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../brand/icons";
import { DAY, FONT, typeStyle } from "../../brand/tokens";
import { clamp } from "../../lib/time";
import { setInProgress } from "../../motion/text";

/**
 * The spine (A2 V10): four phrases set one by one on their spoken words, each with its icon in a quiet tile, and a
 * small line under them. The flag's tile is the shot's one amber element (beacon fill, on-beacon icon, like the badge's
 * own icon). Everything else is on one grid and, once set, holds perfectly still.
 */
export type SpineRow = { icon: IconName; text: string; at: number; amber?: boolean };

const SIZE = 96;
const LH = 104;
const GAP = 30;
const TILE = 104;
const TILE_GAP = 44;

export const Spine: React.FC<{ rows: SpineRow[]; small: { text: string; at: number }; x: number; y: number }> = ({ rows, small, x, y }) => {
  const frame = useCurrentFrame();
  const sm = setInProgress(frame, small.at, 15);
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {rows.map((r, i) => {
        const p = setInProgress(frame, r.at, 15);
        const tileP = setInProgress(frame, r.at, 12);
        if (p <= 0) return <div key={i} style={{ height: LH + (i < rows.length - 1 ? GAP : 0) }} />;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: TILE_GAP, height: LH, marginBottom: i < rows.length - 1 ? GAP : 0 }}>
            <div
              style={{
                width: TILE,
                height: TILE,
                flexShrink: 0,
                borderRadius: 24,
                background: r.amber ? DAY.beacon : DAY.surface,
                boxShadow: r.amber ? undefined : `0 0 0 2px ${DAY.line}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: interpolate(tileP, [0, 0.4], [0, 1], clamp),
                transform: `scale(${0.86 + 0.14 * tileP})`,
              }}
            >
              <Icon name={r.icon} size={56} color={r.amber ? DAY.onBeacon : DAY.textMuted} stroke={1.9} />
            </div>
            <div style={{ overflow: "hidden", padding: "0.08em 0.04em 0.16em", margin: "-0.08em -0.04em -0.16em" }}>
              <div
                style={{
                  fontFamily: FONT.sans,
                  fontWeight: 600,
                  fontSize: SIZE,
                  lineHeight: `${LH}px`,
                  letterSpacing: "-0.025em",
                  color: DAY.text,
                  whiteSpace: "nowrap",
                  opacity: interpolate(p, [0, 0.45], [0, 1], clamp),
                  transform: p < 1 ? `translateY(${(1 - p) * 105}%)` : undefined,
                }}
              >
                {r.text}
              </div>
            </div>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 56,
          marginLeft: TILE + TILE_GAP,
          ...typeStyle("small"),
          color: DAY.textMuted,
          whiteSpace: "nowrap",
          opacity: interpolate(sm, [0, 0.6], [0, 1], clamp),
          transform: `translateY(${(1 - sm) * 0.2}em)`,
        }}
      >
        {small.text}
      </div>
    </div>
  );
};

/** Height of the spine block for `n` rows plus the small line (to centre it). */
export const spineHeight = (n: number) => n * LH + (n - 1) * GAP + 56 + 56;
