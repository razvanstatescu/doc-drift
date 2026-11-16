import React from "react";
import { Composition, registerRoot } from "remotion";
import { loadBrandFonts } from "../../brand/fonts";
import Gallery from "./Gallery";
import Round2, { ROUND2_FRAMES } from "./Round2";

/**
 * Dev-only entry for the twins gallery, so the twins owner can render checks while other scenes are mid-edit:
 *   npx remotion still src/v4/twins/devRoot.tsx Twins out/v4/twins/<name>.png --frame=<n> --port=3511
 * The film's own registration (Root.tsx, Dev/Twins) renders the same Gallery.
 */
loadBrandFonts();

const DevRoot: React.FC = () => (
  <>
    <Composition id="Twins" component={Gallery} durationInFrames={1800} fps={30} width={1920} height={1080} />
    <Composition id="TwinsRound2" component={Round2} durationInFrames={ROUND2_FRAMES} fps={30} width={1920} height={1080} />
  </>
);

registerRoot(DevRoot);
