import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import { AudioLayer } from "./audio/AudioLayer";
import { Sfx } from "./audio/Sfx";
import { BRAND } from "./brand/tokens";
import { SceneStub } from "./components/SceneStub";
import { sceneSpan, TIMELINE, type SceneSpan } from "./lib/timeline";
import { SlipBands } from "./motion/slip";
import { SCENES } from "./scenes/registry";
import { CUTS } from "./transitions";

/** Where the body starts: the end of the first scene (A0). tools/render-master.sh joins the A0 and Body renders here. */
export const BODY_START = TIMELINE.scenes.length > 0 ? TIMELINE.scenes[0].from + TIMELINE.scenes[0].durationInFrames : 0;
export const BODY_FRAMES = Math.max(1, TIMELINE.totalFrames - BODY_START);

const SceneById: React.FC<{ id: string }> = ({ id }) => {
  const Scene = SCENES[id];
  return Scene ? <Scene /> : <SceneStub id={id} />;
};

/**
 * One scene at its timeline span. If transitions.ts gives the scene an exit cut, the Sequence runs `frames` longer:
 * during that tail the scene's last frame is frozen and split into the slip cut's bands, drawn above the next scene.
 */
const SceneSlot: React.FC<{ span: SceneSpan }> = ({ span }) => {
  const frame = useCurrentFrame(); // absolute film frame
  const cut = CUTS[span.id];
  const tail = cut ? cut.frames : 0;
  const inTail = cut !== undefined && frame >= span.from + span.durationInFrames;
  return (
    <Sequence from={span.from} durationInFrames={span.durationInFrames + tail} name={span.id} style={inTail ? { zIndex: 2 } : undefined}>
      {inTail ? (
        <SlipBands f={frame - span.from - span.durationInFrames} options={cut}>
          <Freeze frame={span.durationInFrames - 1}>
            <SceneById id={span.id} />
          </Freeze>
        </SlipBands>
      ) : (
        <SceneById id={span.id} />
      )}
    </Sequence>
  );
};

/** The whole film on the film clock: every scene at its span, the scene cuts, and the global sound. */
export const Film: React.FC = () => (
  <AbsoluteFill style={{ background: BRAND.black }}>
    {TIMELINE.scenes.map((span) => (
      <SceneSlot key={span.id} span={span} />
    ))}
    {TIMELINE.scenes.map((span) => {
      // a cut's sound lives at the film level, so the outgoing scene's Sequence ending cannot clip its tail
      const cut = CUTS[span.id];
      if (!cut?.sfx) return null;
      const at = span.from + span.durationInFrames + (cut.sfx.at ?? cut.slipFrames ?? 6);
      return <Sfx key={`cut-${span.id}`} id={cut.sfx.id} at={at} gainDb={cut.sfx.gainDb} />;
    })}
    <AudioLayer />
  </AbsoluteFill>
);

/** Composition "Main": the whole film, totalFrames long. */
export const Main: React.FC = () => <Film />;

/**
 * Composition "Body": the film from the end of A0 on (for the split render: A0 needs --gl=angle, the body must not
 * get it). It is the same Film shifted, so sounds that cross the join are cut exactly at the join and nothing is lost.
 */
export const Body: React.FC = () => (
  <Sequence from={-BODY_START} name="Film from A1">
    <Film />
  </Sequence>
);

/**
 * One scene alone with its slice of the film's voice and score (the per-scene compositions). The scene sees its own
 * local frames; the audio layer is shifted so it plays what the film plays at those frames.
 */
export const ScenePreview: React.FC<{ id: string }> = ({ id }) => {
  const span = sceneSpan(id);
  return (
    <AbsoluteFill style={{ background: BRAND.black }}>
      <SceneById id={id} />
      <Sequence from={-span.from} layout="none" name="Film audio">
        <AudioLayer />
      </Sequence>
    </AbsoluteFill>
  );
};
