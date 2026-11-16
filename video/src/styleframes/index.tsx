import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { ColdOpenCompare, ColdOpenFrame } from "./ColdOpen";
import { AgentFrame, EndFrame, HeroFrame, ProofFrame, ReviewFrame } from "./Frames";

/**
 * StyleFrames (v4 research, R2): the light (Day) film's style frames, one page per 60 frames. Each page animates from
 * its own frame 0 (the slip lands by local frame 14) and then holds; render a still at the page's frame + 40.
 * Registered in Root.tsx as a lazy composition, so nothing else in the kit imports this folder.
 *
 *   npx remotion still src/index.ts StyleFrames out/research-v4/r2/<name>.png --frame=<page * 60 + 40> --port=3560
 */
export const PAGE_FRAMES = 60;

export const PAGES = [
  ["co1-light", () => <ColdOpenFrame variant="light" bar={1} />],
  ["co1-dark", () => <ColdOpenFrame variant="dark" bar={1} />],
  ["co2-light", () => <ColdOpenFrame variant="light" bar={2} />],
  ["co2-dark", () => <ColdOpenFrame variant="dark" bar={2} />],
  ["co3-light", () => <ColdOpenFrame variant="light" bar={3} />],
  ["co3-dark", () => <ColdOpenFrame variant="dark" bar={3} />],
  ["co1-compare", () => <ColdOpenCompare bar={1} />],
  ["co2-compare", () => <ColdOpenCompare bar={2} />],
  ["co3-compare", () => <ColdOpenCompare bar={3} />],
  ["hero", () => <HeroFrame />],
  ["hero-tilt", () => <HeroFrame tilt />],
  ["review", () => <ReviewFrame />],
  ["proof", () => <ProofFrame />],
  ["agent", () => <AgentFrame />],
  ["end", () => <EndFrame />],
] as const satisfies readonly (readonly [string, () => React.ReactNode])[];

export const STYLE_FRAMES = PAGES.length * PAGE_FRAMES;

/** The composition frame of a page's local frame. */
export const pageFrame = (name: (typeof PAGES)[number][0], local = 40) => PAGES.findIndex((p) => p[0] === name) * PAGE_FRAMES + local;

const StyleFrames: React.FC = () => {
  const frame = useCurrentFrame();
  const i = Math.min(PAGES.length - 1, Math.floor(frame / PAGE_FRAMES));
  const [, render] = PAGES[i];
  return (
    <AbsoluteFill style={{ background: "#F2F6F7" }}>
      <Sequence from={i * PAGE_FRAMES} layout="none">
        {render()}
      </Sequence>
    </AbsoluteFill>
  );
};

export default StyleFrames;
