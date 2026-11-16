import React from "react";
import { Composition, registerRoot } from "remotion";
import { loadBrandFonts } from "../../../brand/fonts";
import { FPS, H, W } from "../../../lib/time";
import Gallery from "../Gallery";

/**
 * A kit-only entry point, so kit renders never depend on the scene files (Root imports every scene; one broken scene
 * breaks every render). Same compositions as Dev/Kit4 in Root.tsx.
 *   npx remotion render src/v4/kit/dev/entry.tsx Kit4 out/v4/kit/x.mp4 --port=3510 --concurrency=6
 *   npx remotion still src/v4/kit/dev/entry.tsx Kit4 out/v4/kit/x.png --frame=120 --port=3510
 */
loadBrandFonts();

const KitRoot: React.FC = () => <Composition id="Kit4" component={Gallery} durationInFrames={1800} fps={FPS} width={W} height={H} />;

registerRoot(KitRoot);
