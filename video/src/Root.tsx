import React from "react";
import { Composition, Folder } from "remotion";
import { loadBrandFonts } from "./brand/fonts";
import { Kit, KIT_FRAMES } from "./Kit";
import { FPS, H, W } from "./lib/time";
import { TIMELINE } from "./lib/timeline";
import { Body, BODY_FRAMES, Main, ScenePreview } from "./Main";

// Holds every render until Spline Sans and Spline Sans Mono are ready (fails the render if a file is missing).
loadBrandFonts();

/**
 * Compositions (1920x1080, 30 fps), all timed from src/data/timeline.json:
 * - Main: the whole film.
 * - Body: everything after A0 (render-master.sh renders A0 with --gl=angle and Body without, then joins them).
 * - Scenes/<id>: one per scene, with that scene's slice of voice and score. "A0" is also the split render's first part.
 * - Dev/Kit: the kit gallery, Night and Day.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={TIMELINE.totalFrames} fps={FPS} width={W} height={H} />
    <Composition id="Body" component={Body} durationInFrames={BODY_FRAMES} fps={FPS} width={W} height={H} />
    <Folder name="Scenes">
      {TIMELINE.scenes.map((sc) => (
        <Composition
          key={sc.id}
          id={sc.id}
          component={ScenePreview}
          defaultProps={{ id: sc.id }}
          durationInFrames={Math.max(1, sc.durationInFrames)}
          fps={FPS}
          width={W}
          height={H}
        />
      ))}
    </Folder>
    <Folder name="Dev">
      <Composition id="Kit" component={Kit} durationInFrames={KIT_FRAMES} fps={FPS} width={W} height={H} />
    </Folder>
  </>
);
