import React from "react";
import { AbsoluteFill, HtmlInCanvas, useCurrentFrame } from "remotion";
import { Barrage, barrageLook, SourceLine } from "./Barrage";
import { barrageFx } from "./fx/barrageFx";
import { CaptionBand, Captions } from "./Overlay";
import { Reveal } from "./Reveal";
import { A0Sound } from "./Sound";
import { BLACK } from "./timing";

/**
 * A0 · the cold open (v4: Day evidence → true black → the Night reveal). Timing and the beat sheet: timing.ts.
 * Layers, bottom to top:
 *   1. true black (the ground of the turn)
 *   2. the barrage (Barrage.tsx): the desk of real pages, the pile and every source chip, through ONE GL pass whose
 *      only job is camera motion blur (fx/barrageFx), until the cut to black at f180
 *   3. ours above the pass, never blurred: the Paper band and the three captions (Overlay.tsx), and the subject's
 *      source slot (Barrage.tsx SourceLine)
 *   4. the turn and the reveal (Reveal.tsx): the title on black, the Night ground, the tile, the slip, the lockup
 *   5. the cold open's own sound (Sound.tsx); V00, V01 and the score come from the global AudioLayer
 * The pass needs WebGL: render A0 with --gl=angle (tools/render-master.sh does).
 */
const A0: React.FC = () => {
  const f = useCurrentFrame();
  const look = barrageLook(f);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {look ? (
        <HtmlInCanvas width={1920} height={1080} effects={[barrageFx(look)]}>
          <Barrage f={f} />
        </HtmlInCanvas>
      ) : null}
      {f < BLACK ? (
        <>
          <CaptionBand />
          <Captions f={f} />
          <SourceLine f={f} />
        </>
      ) : null}
      <Reveal f={f} />
      <A0Sound />
    </AbsoluteFill>
  );
};

export default A0;
