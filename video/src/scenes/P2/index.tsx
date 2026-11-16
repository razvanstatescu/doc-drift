import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ThemeProvider } from "../../brand/theme";
import { clamp } from "../../lib/time";
import { Stage } from "../../v4/kit";
import { Overlay } from "./Overlay";
import { Sound } from "./Sound";
import { T } from "./timing";
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
  // the world dims to 40% (with a little depth of field) while a proof sits in front of it (P2), recedes behind the
  // literal's breakout, and racks out behind the matcher (R2 section 10: blur 8 px, grey, 50%)
  const proof = Math.max(
    interpolate(frame, [T.r5 + 2, T.r5 + 8, T.r5Out, T.r5Out + 6], [0, 1, 1, 0], clamp),
    interpolate(frame, [T.r6 - 6, T.r6, T.r6Out, T.r6Out + 8], [0, 1, 1, 0], clamp),
    interpolate(frame, [T.r7 + 2, T.r7 + 8, T.r7Out, T.r7Out + 6], [0, 1, 1, 0], clamp),
  );
  // the breakout recession takes over from R5's dim without lifting the world back to full in between
  const breakout = interpolate(frame, [T.r5Out, T.r5Out + 10], [0, 1], clamp) * (frame < T.r6 ? 1 : 0);
  const rack = interpolate(frame, [T.matcherIn, T.matcherIn + 12], [0, 1], clamp);
  const opacity = Math.min(1 - 0.6 * proof, 1 - 0.35 * breakout) * (1 - 0.5 * rack);
  const blur = Math.max(4 * proof, 2 * breakout, 8 * rack);
  const filter = blur > 0.05 || rack > 0 ? [blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "", rack > 0 ? `grayscale(${rack.toFixed(3)})` : ""].join(" ").trim() : undefined;
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
