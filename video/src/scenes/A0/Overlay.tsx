import React from "react";
import { AbsoluteFill } from "remotion";
import { DAY, KineticLine } from "../../v4/kit";
import { BAR2, BAR3, BLACK } from "./timing";

/**
 * Ours, above the pass and never blurred (v4, Day): the Paper band that rises over the sheets, so a statement never
 * sits on a page, and the three captions at 156 px Fathom (R2 section 5, Display), set with the kit's KineticLine.
 * A caption lands on its bar line (its words rise out of a short smear in 4 frames) and then holds perfectly still
 * while the desk keeps moving under it; it leaves upward in the 2 frames before the next bar line. Reading time
 * (BRIEF: 30 x max(0.8 + 0.25 x words, chars / 15)) holds for all three: 58, 52 and 54 still frames.
 * Frame 0 is already composed: "The code moved." is set on the film's first frame.
 */
export const CAPTIONS = [
  { from: 0, to: BAR2, text: "The code moved.", at: -30 },
  { from: BAR2, to: BAR3, text: "The docs didn’t.", at: BAR2 },
  { from: BAR3, to: BLACK, text: "The agents can’t tell.", at: BAR3 },
] as const;

/** The caption's line box, top (px). */
const TOP = 62;

export const CaptionBand: React.FC = () => (
  <AbsoluteFill
    style={{
      // opaque to just below the caption's baseline (the statement never sits on a page), then a short soft edge
      background: `linear-gradient(180deg, ${DAY.ground} 0%, ${DAY.ground} 236px, ${DAY.ground}C8 282px, ${DAY.ground}00 346px)`,
    }}
  />
);

export const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = CAPTIONS.find((x) => f >= x.from && f < x.to);
  if (!c) return null;
  const last = c.to >= BLACK; // the last caption holds to the cut to black
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: TOP }}>
      <KineticLine
        text={c.text}
        at={c.at}
        size={156}
        lineHeight={164}
        align="center"
        color={DAY.text}
        dur={4}
        stagger={0.5}
        exit={last ? undefined : { at: c.to - 2, dur: 2, stagger: 0 }}
        style={{ whiteSpace: "nowrap" }}
      />
    </div>
  );
};
