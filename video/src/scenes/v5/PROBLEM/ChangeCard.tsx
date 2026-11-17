import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../../brand/icons";
import { SLIP_UNIT } from "../../../brand/tokens";
import { deep, elevNight, nightCard, paper } from "../../../components/A1/night";
import { NEW_PATH, OLD_PATH } from "../../../components/A1/runbook";
import { clamp, EASE, tween } from "../../../lib/time";
import { amber, BRAND, FONT, NIGHT } from "../../../v4/look";

/**
 * S03's change card (V5.md section 5), one row on the Night ground:
 *   scripts/rollback.sh  →  scripts/rollback-v2.sh  · 6 days ago
 * It lifts in at `at`; at `slipAt` the new path, on a beacon band, slips one slip unit right of its home in 6 frames,
 * with its trace and bloom (the shot's one amber) while the old path is struck; "· 6 days ago" rises from its baseline
 * at `agoAt` (on "last week"). Generic and unbranded: no PR number, no product name. Laid out in stage px at `x`, `y`;
 * CHANGE gives its size and the band's rect for carry cuts.
 */

export const CHANGE = { size: 38, padX: 40, padY: 30, gap: 20, arrow: 36, label: 32 } as const;
const ADV = 0.6 * CHANGE.size; // Spline Sans Mono advance
const BAND_PAD = 16;
const BAND_W = NEW_PATH.length * ADV + BAND_PAD * 2;
/** Room after the band's home for its slip (a transform does not move the layout), so the label never collides. */
const SLIP_ROOM = SLIP_UNIT * BAND_W + 8;
export const CHANGE_W = CHANGE.padX * 2 + OLD_PATH.length * ADV + CHANGE.gap * 3 + CHANGE.arrow + BAND_W + SLIP_ROOM + 190;
export const CHANGE_H = CHANGE.padY * 2 + CHANGE.size * 1.6;

export const ChangeCard: React.FC<{ x: number; y: number; at: number; slipAt: number; agoAt: number; settled?: boolean }> = ({ x, y, at, slipAt, agoAt, settled = false }) => {
  const frame = useCurrentFrame();
  if (!settled && frame < at) return null;
  const lift = settled ? 1 : tween(frame, at, at + 12, 0, 1, EASE.expoOut);
  const op = settled ? 1 : interpolate(frame, [at, at + 3], [0, 1], clamp);
  const s = tween(frame, slipAt, slipAt + 6, 0, 1, EASE.expoOut);
  const strike = tween(frame, slipAt - 2, slipAt + 8, 0, 1, EASE.expoOut);
  const ago = tween(frame, agoAt, agoAt + 13, 0, 1, EASE.expoOut);
  const lineH = CHANGE.size * 1.6;
  const mono: React.CSSProperties = { fontFamily: FONT.mono, fontWeight: 500, fontSize: CHANGE.size, lineHeight: `${lineH}px`, letterSpacing: "-0.01em", whiteSpace: "pre" };
  return (
    <div style={{ position: "absolute", left: x, top: y, width: CHANGE_W, height: CHANGE_H, opacity: op, transform: `translateY(${((1 - lift) * 30).toFixed(2)}px)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: nightCard(), boxShadow: elevNight(1 + 2 * lift) }} />
      <div style={{ position: "absolute", left: CHANGE.padX, top: CHANGE.padY, height: lineH, display: "flex", alignItems: "center", gap: CHANGE.gap }}>
        {/* the old path, struck as the new one slips out */}
        <span style={{ ...mono, position: "relative", color: NIGHT.textMuted }}>
          {OLD_PATH}
          <span style={{ position: "absolute", left: 0, top: "52%", height: 3, width: `${(strike * 100).toFixed(2)}%`, background: paper(0.55), borderRadius: 2 }} />
        </span>
        <Icon name="arrow" size={CHANGE.arrow} color={NIGHT.textMuted} />
        {/* the new path: in line until it slips one unit right on its beacon band, the trace left at home */}
        <span style={{ position: "relative", display: "inline-block" }}>
          {s > 0.001 ? <span style={{ position: "absolute", inset: 0, borderRadius: 12, background: paper(0.1), opacity: Math.min(1, s / 0.25) }} /> : null}
          {s > 0.001 ? (
            <span
              style={{
                position: "absolute",
                left: "-20%",
                right: "-20%",
                top: -50,
                bottom: -50,
                borderRadius: "50%",
                transform: `translateX(${(s * SLIP_UNIT * 100).toFixed(2)}%)`,
                background: `radial-gradient(closest-side, ${amber(0.3 * s)} 0%, ${amber(0.1 * s)} 50%, transparent 100%)`,
              }}
            />
          ) : null}
          <span
            style={{
              ...mono,
              position: "relative",
              display: "inline-block",
              padding: `0 ${BAND_PAD}px`,
              borderRadius: 12,
              background: s > 0.001 ? `rgb(${Math.round(5 + 250 * Math.min(1, s / 0.6))}, ${Math.round(25 + 153 * Math.min(1, s / 0.6))}, ${Math.round(31 + 5 * Math.min(1, s / 0.6))})` : "rgba(5, 25, 31, 0.6)",
              boxShadow: s > 0 ? `0 0 0 1.5px ${amber(0.35 * s)}, 0 10px 34px ${amber(0.28 * s)}, 0 4px 10px ${deep(0.3)}` : undefined,
              transform: s > 0 ? `translateX(${(s * SLIP_UNIT * 100).toFixed(3)}%)` : undefined,
              color: s > 0.5 ? BRAND.fathom : NIGHT.text,
            }}
          >
            {NEW_PATH}
          </span>
        </span>
        {/* "· 6 days ago" rises from its own baseline on "last week" */}
        <span style={{ display: "inline-block", overflow: "hidden", marginLeft: SLIP_ROOM }}>
          <span
            style={{
              display: "inline-block",
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: CHANGE.label,
              lineHeight: `${lineH}px`,
              color: NIGHT.textMuted,
              whiteSpace: "nowrap",
              transform: `translateY(${((1 - ago) * 105).toFixed(2)}%)`,
              visibility: frame < agoAt ? "hidden" : undefined,
            }}
          >
            · 6 days ago
          </span>
        </span>
      </div>
    </div>
  );
};
