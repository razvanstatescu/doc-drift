import React from "react";
import { Composition, Folder, registerRoot } from "remotion";
import { loadBrandFonts } from "../../brand/fonts";
import { FPS, H, W } from "../../lib/time";
import { DebugFreeze } from "./DebugFreeze";
import { DirectedRecording, DR_DUR } from "./DirectedRecording";
import { UnderThePage, UP_DUR } from "./UnderThePage";
import { EditType, ET_DUR } from "./EditType";
import { CarryCuts, CC_DUR } from "./CarryCuts";

/**
 * The v5 R6 lab (docs/video/v5/R6-motion-and-editing.md): prototypes of the techniques the v4 kit does not have.
 * Its own entry, so it never touches src/Root.tsx or a scene. From video/ (Node 24):
 *   npx remotion render src/v5/lab/entry.tsx R6-DirectedRecording out/v5/r6/directed-recording.mp4 --port=3530 --concurrency=6
 *   npx remotion still src/v5/lab/entry.tsx R6-DirectedRecording out/v5/r6/x.png --frame=135 --port=3530
 */
loadBrandFonts();

const LabRoot: React.FC = () => (
  <Folder name="Dev">
    <Composition id="R6-DirectedRecording" component={DirectedRecording} durationInFrames={DR_DUR} fps={FPS} width={W} height={H} />
    <Composition id="R6-UnderThePage" component={UnderThePage} durationInFrames={UP_DUR} fps={FPS} width={W} height={H} />
    <Composition id="R6-EditType" component={EditType} durationInFrames={ET_DUR} fps={FPS} width={W} height={H} />
    <Composition id="R6-CarryCuts" component={CarryCuts} durationInFrames={CC_DUR} fps={FPS} width={W} height={H} />
    <Composition id="R6-DebugFreeze" component={DebugFreeze} durationInFrames={10} fps={FPS} width={W} height={H} />
  </Folder>
);

registerRoot(LabRoot);
