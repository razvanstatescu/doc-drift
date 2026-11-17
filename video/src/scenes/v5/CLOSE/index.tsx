import React from "react";
import { Sfx } from "../../../audio/Sfx";
import { Camera3D, Stage } from "../../../v4/kit";
import { EndCard } from "./EndCard";
import { CUE } from "./timing";

/**
 * v5 scene CLOSE (video/V5.md section 5): the end card on Paper, S21 and S22, film 2880 to 3150. It opens composed on
 * endHit, under the kit's three-band slip reveal (drawn by Main from JIRA's frozen last frame), and holds to the film's
 * last frame on one creeping camera, with the tide as a calm horizon. Timing: timing.ts; the card: EndCard.tsx.
 * The score's end swell (E2) and the voice come from the global AudioLayer; this scene adds one soft landing sound.
 */
const TIDE_MASK = "linear-gradient(180deg, transparent 0%, #000 45%, #000 100%), linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)";

const CLOSE: React.FC = () => (
  <Stage world="day" motif="tide" light={["50%", "30%"]} tide={{ top: 966, bottom: 1140, count: 6, amplitude: 16, opacity: 0.22, composite: true, mask: TIDE_MASK }}>
    <Camera3D creep={1.2} float={3} seed="v5-close">
      <EndCard />
    </Camera3D>
    {/* the URL card lands on "Get it here" */}
    <Sfx id="pop" at={CUE.url + 3} gainDb={-6} />
  </Stage>
);

export default CLOSE;
