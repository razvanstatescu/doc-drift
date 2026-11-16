import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { SLIP_UNIT } from "../../brand/tokens";
import { clamp, EASE, tween } from "../../lib/time";
import { amber, FONT, NIGHT } from "../../v4/look";
import { NEW_PATH, OLD_PATH } from "./runbook";
import { deep, elevNight, paper } from "./night";

/**
 * The ghost diff (A1 V04): the rename that broke step 2. It ghosts in at `at` (a ghost may fade: opacity and a blur
 * that clears, M3), then at `slipAt` the new path, set on a beacon band, slips one slip unit (11.7% of its own width)
 * to the right of the old path in 6 frames, leaving its trace at home and its bloom under it: the shot's ONE amber.
 * The old path stays muted and struck through. No PR number here: the film shows PR #482 being merged later (P2).
 */

const P = NIGHT;
const MONO = 46;
const LINE = 70;
/** The band's horizontal padding (the path sits inside it). */
const BAND_PAD = 18;

export const DIFF = { w: 880, h: 330 } as const;

export const GhostDiff: React.FC<{ x: number; y: number; at: number; slipAt: number; label?: string }> = ({
  x,
  y,
  at,
  slipAt,
  label = "Renamed · merged 6 days ago",
}) => {
  const frame = useCurrentFrame();
  const p = tween(frame, at, at + 16, 0, 1, EASE.expoOut);
  if (frame < at) return null;
  const blur = (1 - p) * 12;
  const s = tween(frame, slipAt, slipAt + 6, 0, 1, EASE.expoOut);
  const strike = tween(frame, slipAt - 2, slipAt + 8, 0, 1, EASE.expoOut);
  const line: React.CSSProperties = {
    fontFamily: FONT.mono,
    fontWeight: 500,
    fontSize: MONO,
    lineHeight: `${LINE}px`,
    letterSpacing: "-0.01em",
    whiteSpace: "pre",
  };
  // the band: "+ scripts/rollback-v2.sh" with its padding; it slips by one unit of its own width
  const bandText = `+ ${NEW_PATH}`;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: DIFF.w,
        height: DIFF.h,
        opacity: p,
        filter: blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : undefined,
        transform: `translateY(${((1 - p) * 22).toFixed(2)}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          padding: "40px 52px",
          borderRadius: 34,
          background: `linear-gradient(180deg, rgba(14, 61, 72, 0.92) 0%, rgba(11, 53, 64, 0.92) 100%)`,
          boxShadow: elevNight(3),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT.sans, fontWeight: 500, fontSize: 34, lineHeight: "44px", color: P.textMuted }}>
          <Icon name="merge" size={36} color={P.textMuted} stroke={1.9} />
          {label}
        </div>
        <div style={{ position: "relative", marginTop: 30 }}>
          {/* the old path, struck through as the new one slips out */}
          <div style={{ ...line, position: "relative", display: "inline-block", padding: `0 ${BAND_PAD}px`, color: P.textMuted }}>
            {"- "}
            <span style={{ position: "relative" }}>
              {OLD_PATH}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "52%",
                  height: 3,
                  width: `${(strike * 100).toFixed(2)}%`,
                  background: paper(0.55),
                  borderRadius: 2,
                }}
              />
            </span>
          </div>
          {/* the new line: an inline box, so the slip is a share of its own width and the trace matches it exactly */}
          <div style={{ position: "relative", display: "inline-block", marginTop: 10 }}>
            {s > 0.001 ? (
              <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: paper(0.1), opacity: Math.min(1, s / 0.25) }} />
            ) : null}
            {/* the bloom: part of the slipped element, not a second amber */}
            {s > 0.001 ? (
              <div
                style={{
                  position: "absolute",
                  left: "-20%",
                  right: "-20%",
                  top: -60,
                  bottom: -60,
                  borderRadius: "50%",
                  transform: `translateX(${(s * SLIP_UNIT * 100).toFixed(2)}%)`,
                  background: `radial-gradient(closest-side, ${amber(0.3 * s)} 0%, ${amber(0.1 * s)} 50%, transparent 100%)`,
                }}
              />
            ) : null}
            <div
              style={{
                position: "relative",
                boxSizing: "border-box",
                padding: `6px ${BAND_PAD}px`,
                borderRadius: 14,
                background: interpolateBand(s),
                boxShadow: s > 0 ? `0 0 0 1.5px ${amber(0.35 * s)}, 0 10px 34px ${amber(0.28 * s)}, 0 4px 10px ${deep(0.3)}` : undefined,
                transform: s > 0 ? `translateX(${(s * SLIP_UNIT * 100).toFixed(3)}%)` : undefined,
                ...line,
                color: s > 0.5 ? P.onBeacon : P.text,
              }}
            >
              {bandText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** The band's fill: Night surface-sunk while in line, beacon once it slips (the colour lands with the slip). */
function interpolateBand(s: number) {
  if (s <= 0) return "rgba(5, 25, 31, 0.6)";
  const t = interpolate(s, [0, 0.6], [0, 1], clamp);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${mix(5, 255)}, ${mix(25, 178)}, ${mix(31, 36)})`;
}
