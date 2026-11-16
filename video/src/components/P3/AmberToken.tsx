import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../lib/time";
import { amber, BRAND } from "../../v4/look";

/**
 * The drift's words on their amber block (the kit's AmberBlock look: beacon fill, Fathom text, its glow), drawn as an
 * exact copy over a twin's own words (same font, same place). The block, the copy and the glow sweep in together
 * under ONE clip, so a letter turns Fathom-on-amber only where the block has passed and the twin's own letters show
 * everywhere else: no doubled glyphs mid-sweep (QA round 2: the amber gate wants the drift to read as amber in V17 and
 * V18, and thin amber mono text alone does not).
 *
 *   <AmberToken at={283} font={{ fontFamily: FONT.sans, fontSize: 30 }}>Possibly stale</AmberToken>
 */
export const AmberToken: React.FC<{
  at: number;
  /** Sweep frames (default 9, the kit's amber). */
  dur?: number;
  font: React.CSSProperties;
  /** Horizontal padding of the block, em (default 0.12). */
  pad?: number;
  children: React.ReactNode;
}> = ({ at, dur = 9, font, pad = 0.12, children }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const b = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  return (
    <span style={{ position: "relative", display: "inline-block", whiteSpace: "pre", ...font }}>
      {/* the glow, revealed with the sweep */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: `-${pad}em`,
          right: `-${pad}em`,
          top: "0.02em",
          bottom: "-0.02em",
          borderRadius: "0.14em",
          boxShadow: `0 0 0 1px ${amber(0.35 * b)}, 0 0.12em 0.6em ${amber(0.42 * b)}`,
          clipPath: `inset(-80% ${(1 - b) * 100}% -80% -40%)`,
        }}
      />
      <span
        style={{
          position: "relative",
          display: "inline-block",
          margin: `0 -${pad}em`,
          padding: `0 ${pad}em`,
          borderRadius: "0.14em",
          background: BRAND.beacon,
          color: BRAND.fathom,
          clipPath: `inset(0 ${(1 - b) * 100}% 0 0 round 0.14em)`,
        }}
      >
        {children}
      </span>
    </span>
  );
};
