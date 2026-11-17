import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, tween, W } from "../../../lib/time";
import { getScene } from "../../../lib/timeline";
import {
  Camera3D,
  capPose,
  capRectToScreen,
  DAY,
  elevAt,
  ink,
  InkLabel,
  KineticLine,
  lineCues,
  MistBand,
  RealTake,
  RewindFrom,
  screenScale,
  Stage,
  type CapKey,
  type Rect,
  type SpotKey,
  type TakeClick,
} from "../../../v4/kit";
import PROMISE from "../PROMISE";
import {
  BADGE_CLICK,
  BLANKET,
  DIALOG,
  DIALOG_CAM,
  DIALOG_CLICKS,
  DIALOG_MASKS,
  DIALOG_SPOT,
  MERGE,
  MERGE_CAM,
  MERGE_CLICKS,
  MERGE_SPOT,
  PAGE,
  PAGE_CROP,
  PAGE_MOTION,
  PAGE_SEED,
  PANEL,
  PANEL_CAM,
  PANEL_CROP,
  PANEL_DY,
  PANEL_PAD,
  PANEL_SEED,
} from "./geom";
import { DIALOG_KEYS, MERGE_VIDEO_KEYS, sc, T } from "./timing";

/** PROMISE's last frames, backwards, fast ("Rewind a week"); the "Last week" chip lands on "week". */
export const RewindShot: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <RewindFrom from={getScene("PROMISE").durationInFrames - 1} span={180} dur={T.rewindDur} at={T.rewindAt} chip={null}>
        <PROMISE />
      </RewindFrom>
      {frame >= T.weekChip ? (
        <div style={{ position: "absolute", left: 64, top: 56, opacity: tween(frame, T.weekChip, T.weekChip + 4, 0, 1, EASE.linear) }}>
          <InkLabel icon="history" size={26}>
            Last week
          </InkLabel>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** S08 and S09: the real suggestions dialog at 1x: the tick on the script, the marks, the Save click. */
export const DialogShot: React.FC = () => (
  <RealTake
    capture="p1-anchor-rec"
    time={{ keys: DIALOG_KEYS }}
    camera={DIALOG_CAM}
    spot={DIALOG_SPOT}
    clicks={DIALOG_CLICKS}
    masks={DIALOG_MASKS}
    background={BLANKET}
    seed="loop-dialog"
    speed={false}
  >
    <MistBand rect={DIALOG.scriptChip} at={T.markScript} />
    <MistBand rect={DIALOG.jiraRow} at={T.markJira} />
  </RealTake>
);

/**
 * The runbook's page head, cropped above its table: p1-verified, then on `flipAt` p2-flagged (the same view; only the
 * byline item differs, so the swap is the real state change and nothing else moves). `click` is on the flagged page.
 */
export const PageShot: React.FC<{ camera: CapKey[]; spot: SpotKey[]; flipAt?: number; click?: TakeClick }> = ({ camera, spot, flipAt, click }) => {
  const frame = useCurrentFrame();
  const flagged = flipAt !== undefined && frame >= flipAt;
  return (
    <RealTake
      capture={flagged ? "p2-flagged" : "p1-verified"}
      camera={camera}
      spot={spot}
      crop={PAGE_CROP}
      seed={PAGE_SEED}
      creep={PAGE_MOTION.creep}
      float={PAGE_MOTION.float}
      speed={false}
      clicks={flagged && click ? [click] : []}
    />
  );
};

/** The page's label on screen (for the gloss under it). */
export const pageLabelOnScreen = (frame: number, camera: CapKey[]): Rect =>
  capRectToScreen(capPose(frame, camera, { seed: PAGE_SEED, ...PAGE_MOTION }), PAGE.label);

/** S10: the real merge of PR #482, directed: the dialog, the confirm click, the ramped wait, "Merged", #482. */
export const MergeShot: React.FC = () => (
  <RealTake
    capture="p2-merge-rec"
    time={{ keys: MERGE_VIDEO_KEYS }}
    camera={MERGE_CAM}
    spot={MERGE_SPOT}
    clicks={MERGE_CLICKS}
    seed="loop-merge"
    speed={false}
  >
    <MistBand rect={MERGE.renameLine} at={T.markRename} />
    <MistBand rect={MERGE.pr482} at={T.mark482} />
  </RealTake>
);

/**
 * The panel band's veils (capture px): from "names", Paper softens and drains everything but the first sentence (the
 * spotlight); on "No AI made that call." the whole band dims under an ink scrim, as the statement sets.
 */
const PanelVeil: React.FC = () => {
  const frame = useCurrentFrame();
  const open = tween(frame, T.panelSpot, T.panelSpot + 14, 0, 1, EASE.expoOut);
  const dim = tween(frame, T.dim, T.dim + 6, 0, 1, EASE.expoOut);
  const c = PANEL_CROP;
  const hole = PANEL.sentence;
  const rx = hole.x - c.x;
  const ry = hole.y - c.y;
  const around = `path(evenodd, "M0 0 H${c.w} V${c.h} H0 Z M${rx} ${ry} H${rx + hole.w} V${ry + hole.h} H${rx} Z")`;
  const box: React.CSSProperties = { position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h };
  return (
    <>
      {open > 0.01 ? (
        <div
          style={{
            ...box,
            background: `rgba(242, 246, 247, ${(0.6 * open).toFixed(3)})`,
            backdropFilter: `blur(${(3.5 * open).toFixed(2)}px) grayscale(${(0.7 * open).toFixed(2)})`,
            clipPath: around,
          }}
        />
      ) : null}
      {dim > 0.01 ? (
        <div style={{ ...box, background: ink(0.1 * dim), backdropFilter: `blur(${(1.5 * dim).toFixed(2)}px) grayscale(${(0.8 * dim).toFixed(2)})` }} />
      ) : null}
    </>
  );
};

/**
 * S12: the review panel, cropped to its title row and the first sentence of its first line, on the Day stage. The
 * spotlight and a punch-in find the sentence on "names", the Mist band marks the rename on "exact change"; on "No AI
 * made that call." the panel dims and the statement sets under it, word by word with the voice.
 */
export const PanelShot: React.FC = () => {
  const frame = useCurrentFrame();
  const pose = capPose(frame, PANEL_CAM, { seed: PANEL_SEED });
  const band = capRectToScreen(pose, PANEL_CROP);
  // the crop ends 6 px under the sentence (line 2 starts 13 px below it): the plate under the band gives it a margin
  const pad = PANEL_PAD * screenScale(pose);
  const dim = tween(frame, T.dim, T.dim + 6, 0, 1, EASE.expoOut);
  const text = "No AI made that call.";
  return (
    <Stage world="day" motif="grid" light={["50%", "42%"]}>
      <Camera3D seed="loop-panel-stage">
        <div style={{ position: "absolute", left: 0, top: 660, width: W }}>
          <KineticLine text={text} at={T.dim} words={lineCues(sc.line("S12"), text)} size={96} align="center" width={W} />
        </div>
      </Camera3D>
      <div style={{ position: "absolute", left: band.x, top: band.y + PANEL_DY, width: band.w, height: band.h + pad, background: DAY.surface, boxShadow: elevAt(3) }} />
      <div style={{ position: "absolute", left: band.x, top: band.y + band.h + PANEL_DY - 0.5, width: band.w, height: pad + 0.5, background: ink(0.1 * dim) }} />
      <AbsoluteFill style={{ transform: `translateY(${PANEL_DY}px)` }}>
        <RealTake capture="p4-panel" camera={PANEL_CAM} crop={PANEL_CROP} seed={PANEL_SEED} background="transparent" speed={false}>
          <MistBand rect={PANEL.rename} at={T.markExact} />
          <PanelVeil />
        </RealTake>
      </AbsoluteFill>
    </Stage>
  );
};
