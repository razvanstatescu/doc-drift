import React, { useEffect, useState } from "react";
import { measureText } from "@remotion/layout-utils";
import { continueRender, delayRender, interpolateColors, useCurrentFrame } from "remotion";
import { EASE, springAt, SPRING, tween } from "../../lib/time";
import { DAY, FONT, NIGHT } from "../look";

/**
 * Label swaps (ported from Satchel's motion/ui.tsx PillSwap at 30 fps): the old label falls out upward, the new one
 * rises in from below two frames later, the box's width springs from one label to the other and the colour follows.
 * For a status that changes in a twin ("To Do" to "Done"); the twins' own badges (BylineItem) do their state swaps.
 *
 *   <PillSwap at={sc.wordAt("V23", "done")} from={{ label: "To Do", color: DAY.unanchored }} to={{ label: "Done", color: DAY.verified }} />
 */

const fontsDone = () => typeof document !== "undefined" && document.fonts !== undefined && document.fonts.status === "loaded";

/** True once the brand fonts are loaded; until then it holds the render, so no frame is measured with a fallback. */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(fontsDone);
  const [handle] = useState(() => (fontsDone() ? null : delayRender("kit: waiting for fonts before measuring a label")));
  useEffect(() => {
    if (handle === null) return;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      continueRender(handle);
    };
    document.fonts.ready.then(() => {
      setReady(true);
      release();
    });
    return release;
  }, [handle]);
  return ready;
}

export type SwapSide = { label: string; color: string; bg?: string };

/** The label alone: old out (up), new in (from below), width between them. Inline; inherits the font size. */
export const LabelSwap: React.FC<{
  from: string;
  to: string;
  at: number;
  /** px (default 30). */
  size?: number;
  weight?: number;
  mono?: boolean;
  style?: React.CSSProperties;
}> = ({ from, to, at, size = 30, weight = 600, mono = false, style }) => {
  const frame = useCurrentFrame();
  const ready = useFontsReady();
  const family = mono ? FONT.mono : FONT.sans;
  const width = (t: string) => (ready ? measureText({ text: t, fontFamily: family, fontWeight: weight, fontSize: size }).width : t.length * size * 0.56);
  const wA = width(from);
  const wB = width(to);
  const s = springAt(frame, at, SPRING.land);
  // the old label is gone (3 frames, steady) before the new one shows (from frame 2, expo out): they never overlap
  const out = tween(frame, at, at + 3, 0, -115, EASE.linear);
  const inn = tween(frame, at + 2, at + 8, 115, 0, EASE.expoOut);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        height: "1.25em",
        width: wA + (wB - wA) * s,
        overflow: "hidden",
        verticalAlign: "middle",
        fontFamily: family,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.25,
        ...style,
      }}
    >
      {frame < at + 3 ? <span style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${out}%)`, whiteSpace: "nowrap" }}>{from}</span> : null}
      {frame >= at + 2 ? <span style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${inn}%)`, whiteSpace: "nowrap" }}>{to}</span> : null}
    </span>
  );
};

/** A status pill whose label and colour swap at `at` (a dot in the status colour, label in it, a tinted pill). */
export const PillSwap: React.FC<{
  from: SwapSide;
  to: SwapSide;
  at: number;
  /** Label px (default 30). */
  size?: number;
  dot?: boolean;
  world?: "day" | "night";
  style?: React.CSSProperties;
}> = ({ from, to, at, size = 30, dot = true, world = "day", style }) => {
  const frame = useCurrentFrame();
  const c = tween(frame, at, at + 6, 0, 1, EASE.expoOut);
  const color = interpolateColors(c, [0, 1], [from.color, to.color]);
  const sunk = world === "night" ? NIGHT.surfaceSunk : DAY.surfaceSunk;
  const bg = interpolateColors(c, [0, 1], [from.bg ?? sunk, to.bg ?? sunk]);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.4,
        padding: `${size * 0.32}px ${size * 0.62}px`,
        borderRadius: 999,
        background: bg,
        color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {dot ? <span style={{ width: size * 0.42, height: size * 0.42, borderRadius: 999, background: color, flexShrink: 0 }} /> : null}
      <LabelSwap from={from.label} to={to.label} at={at} size={size} />
    </div>
  );
};
