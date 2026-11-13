import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { FONT, NIGHT } from "../../brand/tokens";
import { clamp, EASE } from "../../lib/time";
import { Slip } from "../../motion/slip";
import { NEW_PATH, OLD_PATH } from "./runbook";

/**
 * The ghost diff (A1 V04): the rename that broke step 2, as a quiet sunk card that materialises at `at` (opacity and a
 * blur that clears). The new path is the shot's ONE amber element: it slips one unit right of the old path at `slipAt`,
 * leaving its trace. No PR number here: the film shows PR #482 being merged later (P2).
 */
const P = NIGHT;
const MONO = 40;

export const DiffCard: React.FC<{ at: number; slipAt?: number; style?: React.CSSProperties }> = ({ at, slipAt, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 16], [0, 1], { ...clamp, easing: EASE.expoOut });
  if (p <= 0) return null;
  const blur = (1 - p) * 14;
  const line: React.CSSProperties = {
    fontFamily: FONT.mono,
    fontWeight: 500,
    fontSize: MONO,
    lineHeight: "60px",
    letterSpacing: "-0.01em",
    whiteSpace: "pre",
    padding: "0 14px",
  };
  return (
    <div
      style={{
        boxSizing: "border-box",
        padding: "34px 48px 40px",
        borderRadius: 24,
        background: P.surfaceSunk,
        boxShadow: `0 0 0 1px ${P.line}, 0 24px 64px #00000059`,
        opacity: p,
        filter: blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : undefined,
        transform: `translateY(${(1 - p) * 18}px)`,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT.sans, fontWeight: 500, fontSize: 40, lineHeight: "48px", color: P.textMuted }}>
        <Icon name="merge" size={40} color={P.textMuted} stroke={1.9} />
        Renamed · merged 6 days ago
      </div>
      <div style={{ marginTop: 22, marginLeft: -14, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <div style={{ ...line, color: P.textMuted }}>{`- ${OLD_PATH}`}</div>
        <Slip at={slipAt ?? at + 8} radius={10} k={1.6} theme="night">
          <div style={{ ...line, color: P.beaconText }}>{`+ ${NEW_PATH}`}</div>
        </Slip>
      </div>
    </div>
  );
};
