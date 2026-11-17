import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../../lib/time";
import { ELEV_DARK, FONT, NIGHT } from "../../../v4/look";
import { textWidth } from "../../../v4/twins";

/**
 * A gloss chip that sets word by word with the voice ("Rovo · Atlassian's AI", "MCP · an open standard for AI tools"):
 * the kit's ink label, each word rising from behind its own baseline (the functional mask reveal, 12 frames, expo out)
 * on its own cue; the chip lands holding the first word and grows for each later one (8 frames, expo out). It leaves by
 * sinking back (6 frames) from `out`.
 * The first word is the name, in 600; the rest is its gloss, in 500 and muted.
 */
export type GlossWord = { text: string; at: number };

const RISE = 12;
const GROW = 8;

export function glossWidth(words: GlossWord[], size: number) {
  const gap = size * 0.3;
  const padL = size * 0.66;
  const padR = size * 0.66;
  const ws = words.map((wd, i) => textWidth(wd.text, { size, weight: i === 0 ? 600 : 500 }));
  return { ws, gap, padL, padR, total: padL + padR + ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1) };
}

export const GlossChip: React.FC<{ words: GlossWord[]; size?: number; out?: number; x: number; y: number; align?: "left" | "right" }> = ({
  words,
  size = 30,
  out,
  x,
  y,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  if (frame < words[0].at) return null;
  const { ws, gap, padL, padR } = glossWidth(words, size);
  const h = Math.round(size * 1.8);
  // the chip lands holding its first word; later words grow it over GROW frames as each starts
  let width = padL + padR + ws[0];
  words.forEach((wd, i) => {
    if (i === 0) return;
    const g = tween(frame, wd.at, wd.at + GROW, 0, 1, EASE.expoOut);
    width += (ws[i] + gap) * g;
  });
  const sink = out !== undefined ? tween(frame, out, out + 6, 0, 1, EASE.expoIn) : 0;
  if (sink >= 1) return null;
  const appear = tween(frame, words[0].at, words[0].at + 6, 0, 1, EASE.expoOut);
  let cx = padL;
  return (
    <div
      style={{
        position: "absolute",
        left: align === "left" ? x : x - width,
        top: y + (1 - appear) * 10 + sink * 10,
        width,
        height: h,
        borderRadius: size * 0.38,
        background: NIGHT.ground,
        boxShadow: ELEV_DARK[2],
        overflow: "hidden",
        opacity: 1 - sink,
        clipPath: sink > 0 ? `inset(0 0 ${sink * 100}% 0 round ${size * 0.38}px)` : undefined,
      }}
    >
      {words.map((wd, i) => {
        const left = cx;
        cx += ws[i] + gap;
        if (frame < wd.at) return null;
        const t = tween(frame, wd.at, wd.at + RISE, 0, 1, EASE.expoOut);
        return (
          <div key={i} style={{ position: "absolute", left, top: 0, height: h, overflow: "hidden" }}>
            <div
              style={{
                height: h,
                display: "flex",
                alignItems: "center",
                transform: t < 1 ? `translateY(${(1 - t) * 105}%)` : undefined,
                fontFamily: FONT.sans,
                fontSize: size,
                lineHeight: 1,
                fontWeight: i === 0 ? 600 : 500,
                color: i === 0 ? NIGHT.text : NIGHT.textMuted,
                whiteSpace: "nowrap",
                letterSpacing: "0.005em",
              }}
            >
              {wd.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
