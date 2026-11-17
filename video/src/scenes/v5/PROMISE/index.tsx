import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { DAY } from "../../../v4/look";
import { DiagramWorld } from "./Diagram";
import { PROMISE_T as T } from "./timing";
import { CarriedPath, TurnReveal, TurnWorld } from "./Turn";

/**
 * PROMISE (v5, film 480 to 900, S06 and S07, Day). V5.md section 5: the turn, a burst, then one long hold.
 *
 *   0     daySlip: the carry cut on the dead path, Night to Day, through the slip cut drawn from PROBLEM's frozen last
 *         frame; the path docks as the mark's middle band; "Doc Drift" on "Doc"; the band slips amber on "catches"
 *   56    "For teams with docs" under the lockup; the logo holds about 3 s                                         (S06)
 *   105   cut on the beat to the page itself, labelled "Confluence" and "Atlassian's wiki"; then the one diagram, the
 *         page over its code: the script and PAY-6 under the page, the script renamed on "changes", the byline
 *         flagged big on "flags the page", "People" and "AI agents", a person and a check                     (S07)
 *   420   LOOP opens by rewinding this scene's last frames ("Rewind a week", the kit's RewindFrom)
 *
 * Everything here is a pure function of the frame (RewindFrom freezes it frame by frame, muting the sound).
 */

export { PROMISE_T } from "./timing";

const PROMISE: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      <AbsoluteFill style={{ isolation: "isolate" }}>
        {frame < T.pageCut ? <TurnWorld /> : <DiagramWorld />}
        <TurnReveal />
        <CarriedPath />
      </AbsoluteFill>
      {/* sound (voice and score are global; the score's Day lift lands on frame 0): 7 effects, none repeated more than twice.
          The cut's slip-alt1 is the film-level J-cut lead in src/transitions.ts LEADS (starts 9 frames before frame 0). */}
      <Sfx id="slip" at={T.slip + 2} gainDb={-3} />
      <Sfx id="tick-soft" at={T.codeAt + 8} gainDb={-8} />
      <Sfx id="slip-alt2" at={T.slipAt + 2} gainDb={-6} />
      <Sfx id="hit-soft" at={T.bylineAt + 2} gainDb={-5} />
      <Sfx id="pop" at={T.people + 3} gainDb={-10} />
      <Sfx id="pop" at={T.agents + 3} gainDb={-11} />
      <Sfx id="tick" at={T.check + 3} gainDb={-7} />
    </AbsoluteFill>
  );
};

export default PROMISE;
