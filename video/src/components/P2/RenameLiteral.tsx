import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE } from "../../lib/time";
import { amber, DAY, ELEV, FONT, type Rect } from "../../v4/look";
import { monoW } from "./geom";

/**
 * The rename, as one literal (R3 V13): the PR's rename row lifts out of the card to elevation 4 and grows into a 64 px
 * mono literal, `scripts/rollback.sh`. Then `.sh` slides one unit right (the slip's direction) and `-v2` drops into
 * the gap in amber, with its glow and bloom: `scripts/rollback-v2.sh`, the code that moved. That `-v2` is the shot's
 * one amber. Real strings only (the PR renames scripts/rollback.sh to scripts/rollback-v2.sh).
 */
export const LIT_SIZE = 64;
const HEAD = "scripts/rollback";
const TAIL = ".sh";
const V2 = "-v2";
export const LIT_PAD = { x: 52, y: 34 };

/** The literal's text box (film px) when its text's top-left sits at (x, y). */
export const literalTextRect = (x: number, y: number, size = LIT_SIZE): Rect => ({ x, y, w: monoW(HEAD + V2 + TAIL, size), h: size * 1.25 });
/** The `rollback-v2.sh` part of the final literal (for the match cut into the real file header). */
export const literalNewNameRect = (x: number, y: number, size = LIT_SIZE): Rect => ({
  x: x + monoW("scripts/", size),
  y,
  w: monoW("rollback-v2.sh", size),
  h: size * 1.25,
});
/** The `-v2` block. */
export const literalV2Rect = (x: number, y: number, size = LIT_SIZE): Rect => ({ x: x + monoW(HEAD, size), y, w: monoW(V2, size), h: size * 1.25 });

export const RenameLiteral: React.FC<{
  /** Where the old path sits in the PR card (film px): the literal grows out of it. */
  from: Rect;
  /** Top-left of the final literal's text (film px). */
  x: number;
  y: number;
  /** Lift start (12 frames, expo out). */
  at: number;
  /** `.sh` slides one unit right (6 frames). */
  slide: number;
  /** `-v2` drops into the gap (8 frames), amber. */
  drop: number;
  size?: number;
  /** 0..1: the amber's glow and bloom (the scene fades them when the amber passes on). */
  amberGlow?: number;
  style?: React.CSSProperties;
}> = ({ from, x, y, at, slide, drop, size = LIT_SIZE, amberGlow = 1, style }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const grow = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  const lift = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: EASE.expoOut });
  const slid = interpolate(frame, [slide, slide + 6], [0, 1], { ...clamp, easing: EASE.expoOut });
  const dropP = interpolate(frame, [drop, drop + 8], [0, 1], { ...clamp, easing: EASE.expoOut });
  const glow = interpolate(frame, [drop + 2, drop + 10], [0, 1], clamp) * amberGlow;
  const gap = monoW(V2, size);
  const lh = size * 1.25;
  // grow from the row's path box: same top-left, scaled so the old path's height matches
  const s0 = from.h / lh;
  const sc = s0 + (1 - s0) * grow;
  const tx = from.x + (x - from.x) * grow;
  const ty = from.y + (y - from.y) * grow;
  const slabW = monoW(HEAD + V2 + TAIL, size) + LIT_PAD.x * 2;
  const slabH = lh + LIT_PAD.y * 2;
  const text: React.CSSProperties = { fontFamily: FONT.mono, fontSize: size, lineHeight: `${lh}px`, letterSpacing: 0, whiteSpace: "pre", color: DAY.text };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${sc})`, ...style }}>
      {/* the breakout slab: it lifts from the row (elevation 1) to a float (4) */}
      <div
        style={{
          position: "absolute",
          left: -LIT_PAD.x,
          top: -LIT_PAD.y,
          width: slabW,
          height: slabH,
          borderRadius: 30,
          background: DAY.surface,
          boxShadow: lift < 0.5 ? ELEV[2] : ELEV[4],
          opacity: interpolate(grow, [0, 0.35], [0, 1], clamp),
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", height: lh }}>
        <span style={text}>{HEAD}</span>
        <span style={{ position: "relative", width: gap * slid, height: lh, flexShrink: 0 }}>
          {/* the slot the code moved into: its trace first, then the new name drops in */}
          <span style={{ position: "absolute", left: 4, right: 4, top: lh * 0.14, bottom: lh * 0.1, borderRadius: 10, background: DAY.trace, opacity: slid * (1 - dropP) }} />
          {dropP > 0 ? (
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: gap,
                height: lh,
                transform: `translateY(${(1 - dropP) * -lh * 0.9}px)`,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: -gap * 0.9,
                  right: -gap * 0.9,
                  top: -lh * 0.9,
                  bottom: -lh * 0.9,
                  borderRadius: "50%",
                  background: `radial-gradient(closest-side, ${amber(0.3 * glow)} 0%, ${amber(0.1 * glow)} 55%, transparent 100%)`,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: -3,
                  right: -3,
                  top: lh * 0.08,
                  bottom: lh * 0.04,
                  borderRadius: 10,
                  background: DAY.beacon,
                  boxShadow: `0 0 0 1px rgba(199,119,0,${0.35 * glow}), 0 10px 30px ${amber(0.3 * glow)}`,
                }}
              />
              <span style={{ ...text, position: "relative", color: DAY.onBeacon }}>{V2}</span>
            </span>
          ) : null}
        </span>
        <span style={text}>{TAIL}</span>
      </div>
    </div>
  );
};
