import React from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, Freeze, Sequence, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";

/** Debug: which source time does each method show? Frame n asks for source frame 360 + 6n (30 fps grid).
 *  Left: @remotion/media Video in Freeze. Right: OffthreadVideo with trimBefore in a Sequence that starts on this frame. */
export const DebugFreeze: React.FC = () => {
  const frame = useCurrentFrame();
  const n = 360 + 6 * frame;
  return (
    <AbsoluteFill style={{ background: "white" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 960, height: 540, overflow: "hidden" }}>
        <Freeze frame={n}>
          <Video src={staticFile("captures/p2-merge.mp4")} muted style={{ width: 960, height: 540 }} />
        </Freeze>
      </div>
      <div style={{ position: "absolute", left: 960, top: 0, width: 960, height: 540, overflow: "hidden" }}>
        <Sequence from={frame} durationInFrames={1} layout="none">
          <OffthreadVideo src={staticFile("captures/p2-merge.mp4")} muted trimBefore={n} style={{ width: 960, height: 540 }} />
        </Sequence>
      </div>
      <div style={{ position: "absolute", left: 40, bottom: 40, fontSize: 60, color: "red" }}>{`src frame ${n} = ${(n / 30).toFixed(2)} s`}</div>
    </AbsoluteFill>
  );
};
