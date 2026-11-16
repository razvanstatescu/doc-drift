import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { SLIP_UNIT } from "../../brand/tokens";
import { clamp, EASE, tween } from "../../lib/time";
import { KineticLine, type WordTiming } from "../../v4/kit";
import { amber, DAY, elevAt, FONT } from "../../v4/look";
import { textWidth } from "../../v4/twins";

/**
 * V10's spine (R3 section 5, V4.md section 6): "Anchor. Flag. Tell the agents. Then a person decides." The first three
 * phrases land, one per spoken word, on three bands (the mark's bands: white rails from the left edge, all ending at one
 * line); on "Flag." its band slips one slip unit right in amber, so it ends one unit past the others (the mark's own
 * shape), with its trace at home and its bloom: the shot's one amber, about 10% of the frame (S-7: not full bleed).
 * "Then a person decides." is set below the rails in plain type (the person is not a machine step), and a cursor
 * arrives and rests on the slipped band without moving it (putting it back belongs to V22). The small line "For teams
 * who keep runbooks in Confluence" sets in the pause after "agents" so it holds still for its full reading time.
 *
 * Screen px (inside a creeping camera). Nothing here moves after it lands, except the camera (a still bar, M1).
 */

export const SPINE = {
  x: 196,
  bandTop: 104,
  bandH: 170,
  gap: 26,
  size: 120,
  fourthGap: 62,
  smallGap: 40,
  smallSize: 40,
} as const;

export const spineBand = (i: number) => {
  const y = SPINE.bandTop + i * (SPINE.bandH + SPINE.gap);
  return { y, h: SPINE.bandH };
};
const fourthTop = () => spineBand(2).y + SPINE.bandH + SPINE.fourthGap;
export const spineSmallTop = () => fourthTop() + SPINE.size + SPINE.smallGap;

const BAND_X = -120;
/** All three bands end on one line, just past the longest phrase ("Tell the agents."). */
const BAND_END = SPINE.x + textWidth("Tell the agents.", { size: SPINE.size, weight: 600, tracking: -0.028 }) + 84;
const BAND_W = BAND_END - BAND_X;
/** One slip unit of a band (11.7% of its length). */
export const SPINE_SLIP = SLIP_UNIT * BAND_W;
/** Where the slipped band's right end sits (for aiming a cursor on it). */
export const SPINE_END = BAND_END;

/** The slipped band's trace at home and its bloom, drawn under all the bands (L4: the amber comes with both). */
const BandGlow: React.FC<{ i: number; slip: number }> = ({ i, slip }) => {
  if (slip <= 0.001) return null;
  const { y, h } = spineBand(i);
  const dx = slip * SPINE_SLIP;
  const r = 18;
  return (
    <>
      <div style={{ position: "absolute", left: BAND_X, top: y, width: dx + r, height: h, borderRadius: `0 ${r}px ${r}px 0`, background: DAY.trace, opacity: Math.min(1, slip / 0.25) }} />
      <div
        style={{
          position: "absolute",
          left: dx - 40,
          top: y - h * 0.5,
          width: BAND_END + 160,
          height: h * 2,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${amber(0.2 * slip)} 0%, ${amber(0.06 * slip)} 60%, transparent 100%)`,
        }}
      />
    </>
  );
};

/** One full-width band. `slip` 0..1 moves it one slip unit right and turns it amber. */
const Band: React.FC<{ i: number; slip?: number; arrive: number; children?: React.ReactNode }> = ({ i, slip = 0, arrive, children }) => {
  const frame = useCurrentFrame();
  const { y, h } = spineBand(i);
  // the rails lift in (M3), staggered, already moving on the cut frame
  const up = tween(frame, arrive, arrive + 14, 0, 1, EASE.expoOut);
  const dx = slip * SPINE_SLIP;
  const r = 18;
  return (
    <div
      style={{
        position: "absolute",
        left: BAND_X + dx,
        top: y + (1 - up) * 22,
        width: BAND_W,
        height: h,
        borderRadius: r,
        background: slip > 0 ? mix("#FFFFFF", DAY.beacon, Math.min(1, slip * 1.4)) : DAY.surface,
        boxShadow: [elevAt(1 + up), slip > 0 ? `0 0 0 1.5px ${amber(0.35 * slip)}, 0 14px 40px ${amber(0.28 * slip)}` : ""].filter(Boolean).join(", "),
        opacity: up < 1 ? Math.min(1, up * 4) : undefined,
      }}
    >
      <div style={{ position: "absolute", left: SPINE.x - BAND_X, top: 0, height: h, display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
};

export const Spine: React.FC<{
  /** Frames each rail lifts in, with its phrase (never an empty band waiting for its word). */
  arrive: [number, number, number];
  /** Word cues of the four phrases (local frames), and the frame the Flag band slips. */
  words: { anchor: WordTiming[]; flag: WordTiming[]; tell: WordTiming[]; then: WordTiming[] };
  flagSlip: number;
  small: number;
}> = ({ arrive, words, flagSlip, small }) => {
  const frame = useCurrentFrame();
  const slip = tween(frame, flagSlip, flagSlip + 6, 0, 1, EASE.expoOut);
  const smallIn = interpolate(frame, [small, small + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  const line = (text: string, w: WordTiming[], color?: string) => (
    <KineticLine text={text} at={w[0]?.from ?? 0} words={w} size={SPINE.size} weight={600} color={color} style={{ whiteSpace: "nowrap", lineHeight: 1 }} />
  );
  return (
    <>
      <BandGlow i={1} slip={slip} />
      <Band i={0} arrive={arrive[0]}>
        {line("Anchor.", words.anchor)}
      </Band>
      <Band i={1} arrive={arrive[1]} slip={slip}>
        {line("Flag.", words.flag, DAY.onBeacon)}
      </Band>
      <Band i={2} arrive={arrive[2]}>
        {line("Tell the agents.", words.tell)}
      </Band>
      <div style={{ position: "absolute", left: SPINE.x, top: fourthTop(), height: SPINE.size, display: "flex", alignItems: "center" }}>
        {line("Then a person decides.", words.then)}
      </div>
      <div
        style={{
          position: "absolute",
          left: SPINE.x + 4,
          top: spineSmallTop() + (1 - smallIn) * 14,
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: SPINE.smallSize,
          lineHeight: 1.2,
          color: DAY.textMuted,
          opacity: smallIn,
          whiteSpace: "nowrap",
        }}
      >
        For teams who keep runbooks in Confluence
      </div>
    </>
  );
};

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
