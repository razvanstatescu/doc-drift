import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Lockup } from "../../brand/Lockup";
import { clamp, EASE, tween } from "../../lib/time";
import { DAY, FONT, ink, T } from "../../v4/look";

/**
 * The end card on Day (A4 V25, R2 frame 6), laid out in film px on the 1920 x 1080 stage (the scene's camera frames it):
 * the horizontal lockup with the Night tile on a contact shadow, "Catch the slip / before your agents do." at 124 px,
 * and "Built on Atlassian Forge for Codegeist 2026" at 32 px text-muted. No maker line. The ground and the tide lines
 * are the scene's Stage.
 *
 * Motion: the tile is there with its middle band in line (no amber) when the Night bands clear; at `slipAt` the band
 * slips into place in amber (the logo's own move, 6 frames, the card's one amber). The name sets in from its mask at
 * `nameAt`. The tagline's words rise from a short vertical smear on their spoken frames (`words`, local), then hold
 * still; the credit sets in at `creditAt`.
 */

export const END = {
  icon: 132,
  /** Lockup row centre (film px). */
  lockupCy: 236,
  /** Tagline block top, line height 128. */
  tagTop: 404,
  tagLine: 128,
  creditTop: 726,
} as const;

/** The two tagline lines, word by word. */
export const TAGLINE: string[][] = [
  ["Catch", "the", "slip"],
  ["before", "your", "agents", "do."],
];

const Word: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const frame = useCurrentFrame();
  const p = tween(frame, at, at + 12, 0, 1, EASE.expoOut);
  const speed = Math.abs(tween(frame + 0.5, at, at + 12, 0, 1, EASE.expoOut) - tween(frame - 0.5, at, at + 12, 0, 1, EASE.expoOut));
  const blur = Math.min(10, speed * 60);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.03em 0.18em", margin: "-0.06em -0.03em -0.18em" }}>
      <span
        style={{
          display: "inline-block",
          transform: `translateY(${((1 - p) * 72).toFixed(2)}%)`,
          opacity: interpolate(p, [0, 0.35], [0, 1], clamp),
          filter: blur > 0.3 ? `blur(${(blur * 0.25).toFixed(2)}px)` : undefined,
          whiteSpace: "pre",
        }}
      >
        {text}
      </span>
    </span>
  );
};

export const EndCardDay: React.FC<{
  /** The tile's band slips into place (amber) here. */
  slipAt: number;
  nameAt: number;
  /** Local frame each tagline word rises (7 words, in order). */
  words: number[];
  creditAt: number;
}> = ({ slipAt, nameAt, words, creditAt }) => {
  const frame = useCurrentFrame();
  const slip = tween(frame, slipAt, slipAt + 6, 0, 1, EASE.expoOut);
  const name = tween(frame, nameAt, nameAt + 15, 0, 1, EASE.expoOut);
  const credit = tween(frame, creditAt, creditAt + 15, 0, 1, EASE.expoOut);
  const icon = END.icon;
  let wi = 0;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* the lockup, centred on the frame's vertical axis; the tile on its own contact shadow */}
      <div style={{ position: "absolute", left: 0, right: 0, top: END.lockupCy - icon / 2, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: icon * 0.06,
              width: icon * 0.88,
              top: icon - 8,
              height: 44,
              borderRadius: "50%",
              background: `radial-gradient(closest-side, ${ink(0.26)} 0%, ${ink(0.1)} 50%, transparent 100%)`,
              filter: "blur(6px)",
            }}
          />
          <div style={{ position: "relative" }}>
            <Lockup height={icon} variant="icon" theme="day" mark={{ slip, tile: 1, land: 1 }} name={name} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: END.tagTop, textAlign: "center" }}>
        {TAGLINE.map((line, li) => (
          <div
            key={li}
            style={{
              ...T.headline,
              fontSize: 124,
              lineHeight: `${END.tagLine}px`,
              color: DAY.text,
              whiteSpace: "nowrap",
            }}
          >
            {line.map((w, i) => {
              const at = words[wi++] ?? 0;
              return (
                <React.Fragment key={i}>
                  <Word text={w} at={at} />
                  {i < line.length - 1 ? " " : null}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: END.creditTop,
          textAlign: "center",
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 32,
          lineHeight: "40px",
          color: DAY.textMuted,
          opacity: interpolate(credit, [0, 0.5], [0, 1], clamp),
          transform: `translateY(${((1 - credit) * 16).toFixed(2)}px)`,
        }}
      >
        Built on Atlassian Forge for Codegeist 2026
      </div>
    </div>
  );
};
