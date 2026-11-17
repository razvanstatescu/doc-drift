import React from "react";
import { Sfx } from "../../../audio/Sfx";
import { T } from "./timing";

/**
 * LOOP's designed effects (11 in 24 s, about 28 a minute; V5.md 8.7): each on its contact frame, 6 dB or more under the
 * voice, a hit on every cut. The score carries the rest: it is silent from f1335 (local 435) and lands its band and sub
 * hit on the flag (469); nothing of ours sounds in that silence, and the slip's latch lands with the lifted label in
 * the gap between "Possibly" and "stale", off the words.
 */
export const LoopSound: React.FC = () => (
  <>
    {/* the rewind: a short whoosh across the scrub, a crisp tick on the cut into the real block */}
    <Sfx id="whoosh-short" at={T.rewindAt + 14} gainDb={-10} />
    <Sfx id="tick" at={T.real} gainDb={-3} />
    {/* the real click on "Save and mark verified" */}
    <Sfx id="click" at={T.save} gainDb={-6} />
    {/* the cut to the real label, on the score's backbeat */}
    <Sfx id="pop" at={T.cut1} gainDb={-8} />
    {/* into Bitbucket, on the bar line */}
    <Sfx id="tick" at={T.cut2} gainDb={-6} />
    {/* the merge: the confirm click on a beat; the soft confirm peaks 1 frame after the marker, as the dialog closes */}
    <Sfx id="click" at={T.merge} gainDb={-6} />
    <Sfx id="merge" at={T.merge + 5} gainDb={-3} />
    {/* the page opens out of "#482" */}
    <Sfx id="whoosh-short" at={T.grow2 + 10} gainDb={-8} />
    {/* the flag: the lifted label lands (the slip's latch), in the gap between the words */}
    <Sfx id="slip" at={T.latch} gainDb={-6} />
    {/* the click that opens the review panel: the cut is on it */}
    <Sfx id="click" at={T.click3} gainDb={-6} />
    {/* "No AI made that call.": the panel dims */}
    <Sfx id="hit-soft" at={T.dim} gainDb={-6} />
  </>
);
