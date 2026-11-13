import React from "react";
import { Audio } from "@remotion/media";
import { staticFile, useCurrentFrame } from "remotion";
import { hasStaticFile } from "../lib/files";
import { TIMELINE } from "../lib/timeline";
import { dB, MIX, musicGainAt } from "./mix";

/** Frames of room after each voice line's measured end, so a tail is never clipped. */
const VO_TAIL = 6;

/**
 * The film's global sound: every `vo` line and every `music` entry of timeline.json, placed at their absolute frames,
 * with the score ducked under the voice. MOUNT IT AT THE FILM'S FRAME 0 (Main does; a scene preview wraps it in
 * <Sequence from={-scene.from}>), because it reads the absolute frame from useCurrentFrame() to compute the duck.
 * Scenes place their own effects with <Sfx>; the cold open's own bed and clip live inside A0.
 *
 * Files that do not exist yet are skipped, so a render never fails on a missing take. Volume is a number computed
 * per frame (Remotion now recommends this over a volume callback, and it keeps the frame origin unambiguous).
 */
export const AudioLayer: React.FC<{ vo?: boolean; music?: boolean }> = ({ vo = true, music = true }) => {
  const frame = useCurrentFrame(); // absolute film frame
  return (
    <>
      {music
        ? TIMELINE.music
            .filter((m) => hasStaticFile(m.file))
            .map((m) => (
              <Audio
                key={`music-${m.id}`}
                name={`music:${m.id}`}
                src={staticFile(m.file)}
                from={m.from}
                durationInFrames={m.durationInFrames}
                volume={musicGainAt(frame, m)}
              />
            ))
        : null}
      {vo
        ? TIMELINE.vo
            .filter((l) => hasStaticFile(l.file))
            .map((l) => (
              <Audio
                key={`vo-${l.id}`}
                name={`vo:${l.id}`}
                src={staticFile(l.file as string)}
                from={l.from}
                durationInFrames={l.durationInFrames + VO_TAIL}
                volume={dB(MIX.voDb)}
              />
            ))
        : null}
    </>
  );
};
