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
 *   56    "For teams with docs in Confluence" under the lockup, the gloss "Atlassian's wiki" under "Confluence"     (S06)
 *   165   cut on the beat to the one diagram, the page over its code: the script and PAY-6 under the page, the script
 *         renamed on "changes", the byline flagged on "flags the page", the readers, the empty check            (S07)
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
        {frame < T.cut ? <TurnWorld /> : <DiagramWorld />}
        <TurnReveal />
        <CarriedPath />
      </AbsoluteFill>
      {/* sound (voice and score are global; the score's Day lift lands on frame 0) */}
      <Sfx id="slip-alt1" at={0} gainDb={-3} />
      <Sfx id="tick-soft" at={T.dock - 2} gainDb={-4} />
      <Sfx id="slip" at={T.slip + 2} gainDb={-1} />
      <Sfx id="tick-soft" at={T.gloss + 4} gainDb={-8} />
      <Sfx id="paper-land" at={T.cut} gainDb={-6} />
      <Sfx id="tick-soft" at={T.codeAt + 8} gainDb={-5} />
      <Sfx id="tick-soft" at={T.jiraAt + 8} gainDb={-5} />
      <Sfx id="slip" at={T.slipAt + 2} gainDb={-3} />
      <Sfx id="tick" at={T.bandAt + 3} gainDb={-4} />
      <Sfx id="tick-soft" at={T.bylineAt + 3} gainDb={-3} />
      <Sfx id="tick-soft" at={T.people + 3} gainDb={-6} />
      <Sfx id="tick-soft" at={T.agents + 3} gainDb={-7} />
      <Sfx id="tick-soft" at={T.agents + 5} gainDb={-8} />
      <Sfx id="tick-soft" at={T.check + 3} gainDb={-5} />
    </AbsoluteFill>
  );
};

export default PROMISE;
