import React from "react";
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import sfxJson from "../data/sfx.json";
import { hasStaticFile } from "../lib/files";
import { dB } from "./mix";

/** One entry of src/data/sfx.json (owned by the audio agent). Frames at 30 fps. */
export type SfxEntry = { file: string; durationInFrames: number; peakFrame?: number; gainDb?: number; desc?: string };

export const SFX = sfxJson as unknown as Record<string, SfxEntry>;

/**
 * Place a sound effect so its PEAK lands on local frame `at` (a whoosh's peak on the cut, a latch on the landing).
 * Unknown ids and missing files render nothing, so scenes can name effects before the library exists.
 *
 *   <Sfx id="slip" at={sc.beat(4)} />
 *   <Sfx id="latch" at={back + 2} gainDb={-3} />
 */
export const Sfx: React.FC<{ id: string; at: number; gainDb?: number; rate?: number }> = ({ id, at, gainDb = 0, rate = 1 }) => {
  const e = SFX[id];
  if (!e || !hasStaticFile(e.file)) return null;
  const start = at - Math.round((e.peakFrame ?? 0) / rate); // timeline frame where the file starts
  const trimTimeline = start < 0 ? -start : 0; // frames lost before the enclosing sequence's frame 0
  const trimBefore = Math.round(trimTimeline * rate); // in source frames
  const length = e.durationInFrames - trimBefore;
  if (length <= 0) return null;
  return (
    <Audio
      name={`sfx:${id}`}
      src={staticFile(e.file)}
      from={Math.max(0, start)}
      trimBefore={trimBefore || undefined}
      durationInFrames={length}
      playbackRate={rate}
      volume={dB((e.gainDb ?? 0) + gainDb)}
    />
  );
};
