import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../lib/time";
import { BRAND, FONT, NIGHT } from "../look";
import { wrapText } from "./metrics";
import { elev } from "./twinLook";
import type { World } from "./types";

/**
 * The byline tooltip: the real wording (apps/core/src/lib/copy.ts bylineValue), for example
 * "PR #482 changed deploy/helm/values.yaml on Nov 13. Review." Brand tooltip colours: Fathom with Paper text on Day,
 * Paper with Fathom text on Night. Lines wrap at word boundaries, never inside a path.
 */

export const TOOLTIP = { size: 15, lh: 21, padX: 11, padY: 8, radius: 7, maxW: 330, weight: 400 } as const;

/** The real tooltips (as captured), for convenience. */
export const TOOLTIPS = {
  flagged: "PR #482 changed deploy/helm/values.yaml on Nov 13. Review.",
  unanchored: "Not linked to code or Jira. Add anchors.",
  verified2: "Verified on Nov 13. Watching 2 anchors.",
  verified3: "Verified on Nov 13. Watching 3 anchors.",
  adrFlagged: "PAY-18 moved to Done on Nov 13. Review.",
} as const;

/** Lines and film-px size of a tooltip. */
export function tooltipLayout(text: string, k: number, maxW: number = TOOLTIP.maxW) {
  const lines = wrapText(text, maxW - 2 * TOOLTIP.padX, { size: TOOLTIP.size, weight: TOOLTIP.weight });
  const w = Math.max(...lines.map((l) => l.w)) + 2 * TOOLTIP.padX;
  const h = lines.length * TOOLTIP.lh + 2 * TOOLTIP.padY;
  return { lines: lines.map((l) => l.text), w: w * k, h: h * k };
}

export type TooltipTwinProps = {
  text: string;
  at: number;
  out?: number;
  world?: World;
  k?: number;
  /** Max width in UI px before wrapping (default 330). */
  maxW?: number;
  /** Absolute placement (film px, the tooltip's top-left). */
  x?: number;
  y?: number;
  style?: React.CSSProperties;
};

export const TooltipTwin: React.FC<TooltipTwinProps> = ({ text, at, out, world = "day", k = 1.8, maxW, x, y, style }) => {
  const frame = useCurrentFrame();
  const inP = tween(frame, at, at + 7, 0, 1, EASE.expoOut);
  const outP = out !== undefined ? tween(frame, out, out + 5, 0, 1, EASE.expoIn) : 0;
  const v = inP * (1 - outP);
  if (v <= 0.001) return null;
  const L = tooltipLayout(text, k, maxW);
  const night = world === "night";
  return (
    <div
      style={{
        position: x !== undefined || y !== undefined ? "absolute" : "relative",
        left: x,
        top: y,
        width: L.w,
        boxSizing: "border-box",
        padding: `${TOOLTIP.padY * k}px ${TOOLTIP.padX * k}px`,
        borderRadius: TOOLTIP.radius * k,
        background: night ? BRAND.paper : NIGHT.ground,
        color: night ? BRAND.fathom : NIGHT.text,
        boxShadow: elev(2, 1, night ? "night" : "day"),
        fontFamily: FONT.sans,
        fontWeight: TOOLTIP.weight,
        fontSize: TOOLTIP.size * k,
        lineHeight: `${TOOLTIP.lh * k}px`,
        opacity: Math.min(1, v * 1.6),
        transform: `translateY(${(1 - v) * -6 * k}px) scale(${0.97 + 0.03 * v})`,
        transformOrigin: "0% 0%",
        ...style,
      }}
    >
      {L.lines.map((l, i) => (
        <div key={i} style={{ whiteSpace: "nowrap" }}>
          {l}
        </div>
      ))}
    </div>
  );
};
