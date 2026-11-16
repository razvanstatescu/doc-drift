import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../lib/time";
import { amber, BRAND, FONT } from "../../v4/look";

/**
 * The drift's amber block on words that a twin draws (A4: "Possibly stale" in the generic assistant's caveat): a
 * beacon block wipes in left to right behind the words' position at `at` (8 frames), with its glow and bloom, and the
 * same words are redrawn on top in Fathom, at the twin's own size, weight and position, so they read exactly as
 * printed. Amber means drift: one per shot, only on the drift's words.
 */
export const AmberWords: React.FC<{
  text: string;
  /** Left of the words, the line's top and height (stage px). */
  x: number;
  y: number;
  h: number;
  size: number;
  weight?: number;
  at: number;
}> = ({ text, x, y, h, size, weight = 600, at }) => {
  const frame = useCurrentFrame();
  const p = tween(frame, at, at + 8, 0, 1, EASE.expoOut);
  if (p <= 0) return null;
  const pad = size * 0.07;
  return (
    <div
      style={{
        position: "absolute",
        left: x - pad,
        top: y,
        height: h,
        display: "flex",
        alignItems: "center",
        clipPath: `inset(-60% ${((1 - p) * 100).toFixed(2)}% -60% 0)`,
      }}
    >
      {/* the bloom: part of the block, not a second amber */}
      <div
        style={{
          position: "absolute",
          left: "-18%",
          right: "-18%",
          top: -h * 0.5,
          bottom: -h * 0.5,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${amber(0.28 * p)} 0%, ${amber(0.1 * p)} 55%, transparent 100%)`,
        }}
      />
      <span
        style={{
          position: "relative",
          padding: `${size * 0.04}px ${pad}px`,
          borderRadius: size * 0.16,
          background: BRAND.beacon,
          boxShadow: `0 0 0 1px ${amber(0.35 * p)}, 0 ${size * 0.12}px ${size * 0.6}px ${amber(0.4 * p)}`,
          color: BRAND.fathom,
          fontFamily: FONT.sans,
          fontWeight: weight,
          fontSize: size,
          lineHeight: 1.18,
          whiteSpace: "pre",
        }}
      >
        {text}
      </span>
    </div>
  );
};
