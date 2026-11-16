import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { EASE, tween } from "../../lib/time";
import { FONT, NIGHT, type Rect } from "../../v4/look";

/**
 * A1 V06, the confidence beat (review N-3): the generic assistant's command, set as a copyable code block the way any
 * assistant presents one. A bordered block around the command line (the twin's own code run stays inside it, untouched)
 * with a "Copy" button at its right, as generic assistants show. Drawn over the panel in stage px from the command
 * line's rect (agentPanelRects().answerLines). It materialises at `at`: the border draws in from its left over 8
 * frames and the button rises in, so the block "lands" as the command finishes streaming.
 */
export const CopyBlock: React.FC<{ line: Rect; right: number; at: number; size: number }> = ({ line, right, at, size }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const p = tween(frame, at, at + 8, 0, 1, EASE.expoOut);
  const btn = tween(frame, at + 3, at + 11, 0, 1, EASE.expoOut);
  const padX = 12;
  const h = line.h + 10;
  const left = line.x - padX;
  const width = right - left;
  const label = Math.round(size * 0.7);
  return (
    <div style={{ position: "absolute", left, top: line.y - 5, width, height: h }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 14,
          boxShadow: `inset 0 0 0 2px rgba(157, 184, 190, ${(0.34 * p).toFixed(3)})`,
          clipPath: `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0 round 14px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 10,
          top: (h - label * 1.7) / 2,
          height: label * 1.7,
          display: "flex",
          alignItems: "center",
          gap: label * 0.35,
          padding: `0 ${label * 0.55}px`,
          borderRadius: 10,
          background: NIGHT.surfaceSunk,
          boxShadow: `inset 0 0 0 1.5px ${NIGHT.line}`,
          color: NIGHT.textMuted,
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: label,
          lineHeight: 1,
          opacity: btn,
          transform: `translateY(${((1 - btn) * 8).toFixed(2)}px)`,
          whiteSpace: "nowrap",
        }}
      >
        <Icon name="copy" size={label * 1.05} color={NIGHT.textMuted} />
        Copy
      </div>
    </div>
  );
};
