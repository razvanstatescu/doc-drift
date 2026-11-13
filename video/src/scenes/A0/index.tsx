import React from "react";
import { AbsoluteFill, HtmlInCanvas, useCurrentFrame } from "remotion";
import { Barrage, barrageLook } from "./Barrage";
import { barrageFx } from "./fx/barrageFx";
import { Captions, Chips, DiffCard } from "./Overlay";
import { Reveal } from "./Reveal";
import { A0Sound } from "./Sound";

/**
 * A0 · the cold open (Night). Timing and the beat sheet: timing.ts. Layers, bottom to top:
 *   1. true black (the ground of the barrage and of the turn)
 *   2. the barrage (Barrage.tsx): all third-party plates, through ONE GL pass (fx/barrageFx), until the cut to black
 *   3. ours above the pass, never distorted (Overlay.tsx): the diff card on f0–14, the source chips, the captions
 *   4. the turn and the reveal (Reveal.tsx): the bridge title, the Night ground, the mark, the lockup, the tagline
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
      <DiffCard f={f} />
      <Chips f={f} />
      <Captions f={f} />
      <Reveal f={f} />
      <A0Sound />
    </AbsoluteFill>
  );
};

export default A0;
