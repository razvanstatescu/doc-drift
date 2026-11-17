import React from "react";
import { Sfx } from "../../../audio/Sfx";
import { T } from "./timing";

/**
 * LOOP's designed effects (12 in 22.5 s, 32 a minute; R6 section 6.7): each peak on its contact frame, a hit on every
 * cut. The score carries the rest: the band strips to bass and ticks for the 19 s roll, half a bar of silence before the flag, the
 * full band and a sub hit on "Possibly". Nothing sounds inside that silence but the barely audible slide of the latch.
 */
export const LoopSound: React.FC = () => (
  <>
    {/* the rewind: a short whoosh on the scrub's fastest frames, a crisp tick on the cut into the real block */}
    <Sfx id="whoosh-short" at={T.rewindAt + 20} gainDb={-5} />
    <Sfx id="tick" at={T.real} gainDb={-3} />
    {/* the real clicks in the dialog */}
    <Sfx id="click" at={T.tick} gainDb={-2} />
    <Sfx id="click" at={T.save} gainDb={-1} />
    {/* the page with its real label: the cut on the score's backbeat */}
    <Sfx id="pop" at={T.cut1} gainDb={-1} />
    {/* into Bitbucket, on the bar line */}
    <Sfx id="tick" at={T.cut2} gainDb={-3} />
    {/* the merge: the confirm click on a beat; the soft confirm starts as the dialog closes, inside "merged" */}
    <Sfx id="click" at={T.merge} />
    <Sfx id="merge" at={T.merge + 8} gainDb={2} />
    {/* the page opens out of the clock */}
    <Sfx id="whoosh-short" at={T.grow2 + 12} gainDb={-7} />
    {/* the flag: the page's state changes (the latch on the contact frame, with the score's sub hit) */}
    <Sfx id="slip-alt2" at={T.flag} gainDb={-1} />
    {/* the click that opens the review panel: the cut is on it */}
    <Sfx id="click" at={T.click3} gainDb={-1} />
    {/* "No AI made that call.": the panel dims */}
    <Sfx id="hit-soft" at={T.dim + 4} gainDb={-6} />
  </>
);
