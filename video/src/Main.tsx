import React, { useId } from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import { AudioLayer } from "./audio/AudioLayer";
import { Sfx } from "./audio/Sfx";
import { BRAND } from "./brand/tokens";
import { SceneStub } from "./components/SceneStub";
import { H, W } from "./lib/time";
import { sceneSpan, TIMELINE, type SceneSpan } from "./lib/timeline";
import { SlipBands } from "./motion/slip";
import { SlipReveal } from "./v4/kit/reveal";
import { SCENES } from "./scenes/registry";
import { CUTS, cutSfxAt, pushAt, pushFlash, slipPushAt, whipAt, type SceneCut } from "./transitions";

/** Where the body starts: the end of the first scene (A0). tools/render-master.sh joins the A0 and Body renders here. */
export const BODY_START = TIMELINE.scenes.length > 0 ? TIMELINE.scenes[0].from + TIMELINE.scenes[0].durationInFrames : 0;
export const BODY_FRAMES = Math.max(1, TIMELINE.totalFrames - BODY_START);

const SceneById: React.FC<{ id: string }> = ({ id }) => {
  const Scene = SCENES[id];
  return Scene ? <Scene /> : <SceneStub id={id} />;
};

const cleanId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");

/** A directional blur filter (the film's whip grammar), referenced by url(#id). Renders nothing visible. */
const BlurDef: React.FC<{ id: string; x: number; y: number }> = ({ id, x, y }) => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={`${Math.max(0, x)} ${Math.max(0, y)}`} />
    </filter>
  </svg>
);

const bandClip = (y0: number, y1: number) => `inset(${y0}px 0px ${H - y1}px 0px)`;

/**
 * The OUTGOING side of a scene cut at frame `f` of the cut: `children` is the scene frozen on its last frame (each
 * copy is muted by <Freeze>). Drawn above the incoming scene.
 */
const CutOut: React.FC<{ cut: SceneCut; f: number; children: React.ReactNode }> = ({ cut, f, children }) => {
  const base = "cutout" + cleanId(useId());
  if (cut.kind === "slip") {
    if (cut.reveal) {
      return (
        <SlipReveal f={f} lead={cut.reveal.lead} open={cut.frames} slipFrames={cut.reveal.slipFrames} traceColor={cut.traceColor}>
          {children}
        </SlipReveal>
      );
    }
    return (
      <SlipBands f={f} options={cut}>
        {children}
      </SlipBands>
    );
  }
  if (cut.kind === "slipPush") {
    const bands = slipPushAt(f, cut);
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {bands.map((b, i) => (
          <AbsoluteFill key={i} style={{ clipPath: bandClip(b.y0, b.y1) }}>
            <BlurDef id={`${base}-${i}`} x={b.blur} y={0} />
            <AbsoluteFill style={{ transform: `translateX(${b.out}px)`, filter: b.blur > 0.4 ? `url(#${base}-${i})` : undefined }}>{children}</AbsoluteFill>
          </AbsoluteFill>
        ))}
      </AbsoluteFill>
    );
  }
  if (cut.kind === "whip") {
    const w = whipAt(f, cut);
    const move = w.axis === "x" ? `translateX(${w.out}px)` : `translateY(${w.out}px)`;
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <BlurDef id={base} x={w.axis === "x" ? w.blur : 0} y={w.axis === "y" ? w.blur : 0} />
        <AbsoluteFill style={{ transform: move, filter: w.blur > 0.4 ? `url(#${base})` : undefined }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // push: the outgoing frame pushes in until the cut, then it is gone
  const p = pushAt(f, cut);
  if (p.side === "in") return null;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${p.scale})` }}>{children}</AbsoluteFill>
      {p.flash > 0 ? <AbsoluteFill style={{ background: pushFlash(cut), opacity: p.flash }} /> : null}
    </AbsoluteFill>
  );
};

/**
 * The INCOMING scene: always one live instance (key "main", never remounted, it keeps the scene's own sound), moved
 * by the entry cut during the cut's frames; a slip push adds two frozen (muted) copies for its top and bottom bands.
 */
const CutIn: React.FC<{ id: string; cut?: SceneCut; f: number }> = ({ id, cut, f }) => {
  const base = "cutin" + cleanId(useId());
  let mainStyle: React.CSSProperties | undefined;
  let mainBlur: { x: number; y: number } | null = null;
  const extras: React.ReactNode[] = [];
  if (cut && cut.kind === "slipPush") {
    const bands = slipPushAt(f, cut);
    const mid = bands[1];
    mainStyle = { clipPath: bandClip(mid.y0, mid.y1), transform: `translateX(${mid.in}px)` };
    mainBlur = { x: mid.blur, y: 0 };
    for (const i of [0, 2]) {
      const b = bands[i];
      extras.push(
        <AbsoluteFill key={`band${i}`} style={{ clipPath: bandClip(b.y0, b.y1) }}>
          <BlurDef id={`${base}-${i}`} x={b.blur} y={0} />
          <AbsoluteFill style={{ transform: `translateX(${b.in}px)`, filter: b.blur > 0.4 ? `url(#${base}-${i})` : undefined }}>
            <Freeze frame={f}>
              <SceneById id={id} />
            </Freeze>
          </AbsoluteFill>
        </AbsoluteFill>,
      );
    }
  } else if (cut && cut.kind === "whip") {
    const w = whipAt(f, cut);
    mainStyle = { transform: w.axis === "x" ? `translateX(${w.in}px)` : `translateY(${w.in}px)` };
    mainBlur = { x: w.axis === "x" ? w.blur : 0, y: w.axis === "y" ? w.blur : 0 };
  } else if (cut && cut.kind === "push") {
    const p = pushAt(f, cut);
    mainStyle = p.side === "out" ? { opacity: 0 } : { transform: `scale(${p.scale})` };
    if (p.side === "in" && p.flash > 0) extras.push(<AbsoluteFill key="flash" style={{ background: pushFlash(cut), opacity: p.flash }} />);
  }
  const blurOn = mainBlur !== null && (mainBlur.x > 0.4 || mainBlur.y > 0.4);
  return (
    <AbsoluteFill style={{ overflow: cut ? "hidden" : undefined }}>
      {mainBlur ? <BlurDef id={`${base}-main`} x={mainBlur.x} y={mainBlur.y} /> : null}
      <AbsoluteFill key="main" style={{ ...mainStyle, filter: blurOn ? `url(#${base}-main)` : undefined }}>
        <SceneById id={id} />
      </AbsoluteFill>
      {extras}
    </AbsoluteFill>
  );
};

/**
 * One scene at its timeline span. If transitions.ts gives the scene an EXIT cut, its Sequence runs `frames` longer and
 * that tail draws the scene's frozen last frame through the cut, above the next scene. If the PREVIOUS scene has a cut,
 * this scene's first `frames` frames are moved by it (CutIn). The scene itself always starts on its timeline frame.
 */
const SceneSlot: React.FC<{ span: SceneSpan; prev?: SceneSpan }> = ({ span, prev }) => {
  const frame = useCurrentFrame(); // film frame
  const exit = CUTS[span.id];
  const tail = exit ? exit.frames : 0;
  const end = span.from + span.durationInFrames;
  const inTail = exit !== undefined && tail > 0 && frame >= end;
  const entry = prev && prev.from + prev.durationInFrames === span.from ? CUTS[prev.id] : undefined;
  const ef = frame - span.from;
  const entering = entry && entry.frames > 0 && ef >= 0 && ef < entry.frames ? entry : undefined;
  return (
    <Sequence from={span.from} durationInFrames={span.durationInFrames + tail} name={span.id} style={inTail ? { zIndex: 2 } : undefined}>
      {inTail ? (
        <CutOut cut={exit} f={frame - end}>
          <Freeze frame={span.durationInFrames - 1}>
            <SceneById id={span.id} />
          </Freeze>
        </CutOut>
      ) : (
        <CutIn id={span.id} cut={entering} f={ef} />
      )}
    </Sequence>
  );
};

/** The whole film on the film clock: every scene at its span, the scene cuts, and the global sound. */
export const Film: React.FC = () => (
  <AbsoluteFill style={{ background: BRAND.black }}>
    {TIMELINE.scenes.map((span, i) => (
      <SceneSlot key={span.id} span={span} prev={i > 0 ? TIMELINE.scenes[i - 1] : undefined} />
    ))}
    {TIMELINE.scenes.map((span) => {
      // a cut's sound lives at the film level, so the outgoing scene's Sequence ending cannot clip its tail
      const cut = CUTS[span.id];
      if (!cut?.sfx) return null;
      const at = span.from + span.durationInFrames + cutSfxAt(cut);
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

/** Film px of the frame (for cut previews in the kit gallery). */
export const FRAME = { w: W, h: H } as const;
