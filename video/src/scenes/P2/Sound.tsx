import React from "react";
import { Sfx } from "../../audio/Sfx";
import { T } from "./timing";

/**
 * P2's effects (R3 V13 to V15), all from src/data/sfx.json, each placed so its peak lands on the frame it marks.
 * The voice and the score come from the global audio layer; effects stay under the voice (extra gain 0 or below).
 */
export const Sound: React.FC = () => (
  <>
    {/* V13: the twin's Merge press, the real confirm click, Merged */}
    <Sfx id="click" at={T.mergePress} gainDb={-3} />
    <Sfx id="tick-soft" at={T.r5 + 2} gainDb={-5} />
    <Sfx id="click" at={T.r5Click} />
    <Sfx id="merge" at={T.r5Jump} />
    {/* the rename: the row lifts, -v2 drops in */}
    <Sfx id="swish-up" at={T.renameLift + 8} gainDb={-4} />
    <Sfx id="tick" at={T.renameDrop + 3} gainDb={-2} />
    <Sfx id="tick-soft" at={T.r6 + 2} gainDb={-5} />
    {/* the gap: the clock under the record's journey, a pop as it passes each node */}
    {[T.recordAt + 15, T.recordAt + 30, T.recordAt + 45].map((f) => (
      <Sfx key={`clock-${f}`} id="clock-tick" at={f} gainDb={-5} />
    ))}
    <Sfx id="pop" at={T.relayAt} gainDb={-6} />
    <Sfx id="pop" at={T.matcherAt} gainDb={-7} />
    {/* V14: the slip's latch lands with the Steps band, then the tooltip and R7's tag */}
    <Sfx id="slip" at={T.flag + 6} />
    <Sfx id="tick-soft" at={T.tooltip} gainDb={-6} />
    <Sfx id="tick-soft" at={T.r7 + 2} gainDb={-5} />
    {/* V15: one tick per rule, the hit on "call", R8's tag, and a soft tick as each re-run lands */}
    {T.rows.map((f, i) => (
      <Sfx key={`row-${i}`} id="tick" at={f} gainDb={-6} />
    ))}
    <Sfx id="hit-soft" at={T.w15.call} gainDb={-2} />
    <Sfx id="tick-soft" at={T.r8 + 2} gainDb={-5} />
    {T.runs.map((r, i) => (
      <Sfx key={`run-${i}`} id="tick-soft" at={r.result} gainDb={-4} />
    ))}
  </>
);
