import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { MarkReveal } from "../../brand/Mark";
import { FONT, NIGHT, typeStyle } from "../../brand/tokens";
import { clamp, EASE, mix, tween } from "../../lib/time";
import { setInProgress } from "../../motion/text";

/**
 * The close (A4 V25), the bookend of A0's reveal: on the Night ground the mark builds large at the centre with the
 * kit's MarkReveal (tile, the top and bottom bands land, the trace, then the middle band slips into place in amber,
 * starting at `slipAt` for `slipFrames`), then settles into the horizontal lockup at the frame centre (brand/logo.md:
 * name in Spline Sans 600 at 42% of the icon height, gap 28%). At `liftAt` the lockup lifts to make room and the
 * tagline sets under it, then the small credit line. Everything then holds still.
 *
 * The move into the lockup needs no text measuring: the row is [ghost name][gap][mark][gap][name], so the mark sits at
 * the centre; translating the row by -25% of its own width (+ a quarter of the mark) centres the lockup instead.
 */
const M = 168; // final icon height
const BIG = 360; // the reveal's size (A0's is about 360 px)
const NAME = M * 0.42;
const GAP = M * 0.28;
const LOCKUP_CY = 316; // centre of the lockup once the tagline is in

const nameStyle: React.CSSProperties = {
  fontFamily: FONT.sans,
  fontWeight: 600,
  fontSize: NAME,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  color: NIGHT.text,
  whiteSpace: "nowrap",
};

export const EndCard: React.FC<{
  revealAt: number;
  slipAt: number;
  slipFrames?: number;
  settleAt: number;
  nameAt: number;
  liftAt: number;
  taglineAt: number;
  creditAt: number;
}> = ({ revealAt, slipAt, slipFrames = 6, settleAt, nameAt, liftAt, taglineAt, creditAt }) => {
  const frame = useCurrentFrame();
  const p = tween(frame, settleAt, settleAt + 22, 0, 1, EASE.quintOut);
  const lift = tween(frame, liftAt, liftAt + 16, 0, 1, EASE.expoOut);
  const scale = mix(BIG / M, 1, p);
  const ty = mix(0, LOCKUP_CY - 540, lift);
  const nameP = setInProgress(frame, nameAt, 15);
  const tag = [setInProgress(frame, taglineAt, 15), setInProgress(frame, taglineAt + 3, 15)];
  const credit = setInProgress(frame, creditAt, 15);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            transform: `translate(calc(${-25 * p}% + ${(M / 4) * p}px), ${ty}px)`,
          }}
        >
          <div style={{ ...nameStyle, visibility: "hidden" }} aria-hidden>
            Doc Drift Sentinel
          </div>
          <div style={{ width: GAP, flexShrink: 0 }} />
          <div style={{ width: M, height: M, flexShrink: 0, transform: `scale(${scale})` }}>
            <MarkReveal size={M} variant="icon" at={revealAt} slipAt={slipAt} slipFrames={slipFrames} />
          </div>
          <div style={{ width: GAP, flexShrink: 0 }} />
          <div style={{ overflow: "hidden", padding: "0.1em 0.05em 0.2em", margin: "-0.1em -0.05em -0.2em" }}>
            <div
              style={{
                ...nameStyle,
                opacity: interpolate(nameP, [0, 0.45], [0, 1], clamp),
                transform: nameP < 1 ? `translateY(${(1 - nameP) * 105}%)` : undefined,
              }}
            >
              Doc Drift Sentinel
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 488, textAlign: "center" }}>
        {["Catch the slip", "before your agents do."].map((line, i) => (
          <div key={line} style={{ overflow: "hidden", padding: "0.08em 0.04em 0.16em", margin: "-0.08em -0.04em -0.16em" }}>
            <div
              style={{
                ...typeStyle("headline"),
                color: NIGHT.text,
                opacity: interpolate(tag[i], [0, 0.45], [0, 1], clamp),
                transform: tag[i] < 1 ? `translateY(${(1 - tag[i]) * 105}%)` : undefined,
              }}
            >
              {line}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 836,
          textAlign: "center",
          ...typeStyle("small"),
          color: NIGHT.textMuted,
          opacity: interpolate(credit, [0, 0.6], [0, 1], clamp),
          transform: `translateY(${(1 - credit) * 0.2}em)`,
        }}
      >
        Built on Atlassian Forge for Codegeist 2026 · Nano Soft
      </div>
    </AbsoluteFill>
  );
};
