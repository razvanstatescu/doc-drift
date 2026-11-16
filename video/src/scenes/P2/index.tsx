import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ThemeProvider } from "../../brand/theme";
import { clamp } from "../../lib/time";
import { Stage } from "../../v4/kit";
import { Overlay } from "./Overlay";
import { Sound } from "./Sound";
import { T, WIPE } from "./timing";
import { LineLayer, RecordLayer, World } from "./World";

/**
 * P2 · Flag (film 2077 to 2617), v4 (V4.md section 6; R3 V13 to V15). Day, the grid motif, one camera that never
 * stops. Explain with twins, prove with real captures in the same line:
 *
 *   V13  PrTwin (Bitbucket named in words); the cursor presses Merge; R5 the real merge grows out of the Merge button
 *        (the dialog, the recorded confirm click, then Merged, the wait cut on the bar); the rename row lifts out into
 *        a 64 px literal where `-v2` drops in amber; R6 by an amber match cut into the real file header.
 *   gap  The record carries the amber through "Bitbucket relay" and "Doc Drift matcher" while "Merge to flag" rolls
 *        to the measured 19 s at 300 px; it lands on the runbook as the page flags.
 *   V14  The Steps band slips amber and docks in the byline, "Possibly stale · Doc Drift"; the tooltip names PR #482;
 *        R7 the real byline and tooltip grow out of the twin's.
 *   V15  "No AI made that call." beside the matcher card: the rules from the real why sentence, Score 1.00 (threshold
 *        0.5), the Possibly stale result as the one amber; R8 the real why sentence; the same change runs twice more
 *        and lands exactly on the same result; the eval line.
 *
 * Opens composed under P1's slip-push scene cut; ends on its final pose for the whip into P3 (kit, transitions.ts).
 * Timing: ./timing.ts (local frames from the voice). Layout: ./layout.ts. Cut waits and choices: ./README.md.
 */
const P2: React.FC = () => {
  const frame = useCurrentFrame();
  // While a proof sits in front, its twin (the world) dims to 18% and blurs 7 px (QA K-1), and comes back as the proof
  // wipes away (WIPE frames, no double exposure). It recedes behind the literal's breakout, and racks out behind the
  // matcher (R2 section 10: blur 8 px, grey, 50%).
  const up = (a: number, b: number) => interpolate(frame, [a, b], [0, 1], clamp);
  const down = (a: number) => interpolate(frame, [a, a + WIPE], [1, 0], clamp);
  const proof = Math.max(
    up(T.r5 + 2, T.r5 + 8) * down(T.r5Out),
    up(T.r6 - 6, T.r6) * down(T.r6Out),
    up(T.r7 + 2, T.r7 + 8) * down(T.r7Out),
  );
  const breakout = up(T.r5Out, T.r5Out + WIPE) * (frame < T.r6 ? 1 : 0);
  const rack = up(T.matcherIn - 2, T.matcherIn + 6);
  const opacity = Math.min(1 - 0.82 * proof, 1 - 0.35 * breakout) * (1 - 0.5 * rack);
  const blur = Math.max(7 * proof, 2 * breakout, 8 * rack);
  // the kit's scrim (round 2): a twin under a proof is also drained to grey, which keeps its amber out of the shot
  const grey = Math.max(proof, rack);
  const filter = blur > 0.05 || grey > 0 ? [blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "", grey > 0 ? `grayscale(${grey.toFixed(3)})` : ""].join(" ").trim() : undefined;
  return (
    <ThemeProvider theme="day">
      <Stage world="day" motif="grid" light={["58%", "36%"]}>
        <AbsoluteFill style={{ opacity: opacity < 1 ? opacity : undefined, filter }}>
          <LineLayer />
          <World />
        </AbsoluteFill>
        <Overlay />
        <RecordLayer />
      </Stage>
      <Sound />
    </ThemeProvider>
  );
};

export default P2;
