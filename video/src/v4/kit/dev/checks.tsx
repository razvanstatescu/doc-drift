import React from "react";
import { AbsoluteFill } from "remotion";
import { ProofFrame, Stage } from "../index";

/** Kit checks (dev only): crops the guard must flag (R7 at h 360, R21 as reviewed) and one it must pass (R7 at h 300). */
export const CropChecks: React.FC = () => (
  <Stage world="day" motif="none">
    <AbsoluteFill>
      <ProofFrame capture="p2-flagged-tooltip" crop={[1440, 300, 1460, 360]} scale={0.5} x={60} y={80} at={0} exit="none" tag="R7 as in R3 (h 360)" />
      <ProofFrame capture="p2-flagged-tooltip" crop={[1440, 300, 1460, 346]} scale={0.5} x={1000} y={80} at={0} exit="none" tag="R7 at h 346 (clean)" />
      <ProofFrame capture="p5-dashboard" crop={[720, 280, 3040, 420]} scale={0.5} x={60} y={480} at={0} exit="none" tag="R21 as reviewed" />
      <ProofFrame capture="p2-merge-rec" crop={[1320, 120, 1200, 880]} scale={0.4} x={1000} y={480} at={0} tag="R5 dialog (recording)" video={{ from: 4.88, to: 6.0 }} />
    </AbsoluteFill>
  </Stage>
);
