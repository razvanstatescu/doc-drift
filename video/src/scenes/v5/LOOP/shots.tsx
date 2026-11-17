import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, tween, W } from "../../../lib/time";
import { getScene } from "../../../lib/timeline";
import {
  Camera3D,
  CurrentUnderline,
  Eyebrow,
  ink,
  InkLabel,
  KineticLine,
  lineCues,
  MaskLine,
  MistBand,
  RealTake,
  remap,
  RewindFrom,
  Stage,
} from "../../../v4/kit";
import PROMISE from "../PROMISE";
import {
  BADGE_CLICK,
  COMMENT,
  COMMENT_CROP,
  HEAD_CROP,
  MERGE,
  MERGE_CAM,
  MERGE_CLICKS,
  PAGE_CAM,
  PAGE_CROP,
  PAGE_MOTION,
  PAGE_SEED,
  PANEL,
  PANEL_CROP,
  SAVE_CLICK,
  SAVE_CROP,
  SUGGEST,
  SUGGEST_HEAD_CROP,
  SUGGEST_ROWS_CROP,
  VERIFIED_WORD,
} from "./geom";
import { RealCard, realCardRect } from "./RealCard";
import { MERGE_VIDEO_KEYS, SAVE_KEYS, sc, T } from "./timing";

/**
 * PROMISE's last 97 frames, backwards (the kit's RewindFrom, sine in-out), from "Rewind": the check, the person and the
 * reader chips retract over 24 frames of visible reverse motion, each frame 3% to 12% new. A longer span reaches
 * PROMISE's pull-out (its frames 306 to 320 move up to 43 levels a frame) and plays as one-frame jumps again (measured:
 * 120 frames gives three jumps, 200 gives the three the QA saw). The "Last week" chip lands on "week".
 */
const REWIND_SPAN = 97;
export const RewindShot: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <RewindFrom from={getScene("PROMISE").durationInFrames - 1} span={REWIND_SPAN} dur={T.rewindDur} at={T.rewindAt} chip={null}>
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

/** The Day stage behind the real cards (its camera carries the statement in S12; the cards keep their own creep). */
const CardStage: React.FC<{ children?: React.ReactNode; over?: React.ReactNode }> = ({ children, over }) => (
  <Stage world="day" motif="grid" light={["50%", "44%"]}>
    <Camera3D seed="loop-cards">{over}</Camera3D>
    {children}
  </Stage>
);

/**
 * S08: "Suggested from this page (2)", Mist on "Suggested from this page" as "links the page" is said; its two
 * suggestions, both ticked, rise under it on "to the script" (Mist on each as it is named); one push-in to 1:1 through
 * "it names". Two excerpts of the real box (no "Weak" tag), held until the click.
 */
export const SuggestShot: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = tween(frame, T.pushA, T.pushA + 28, 0.9, 1, EASE.cubicInOut);
  const left = 960 - (SUGGEST_ROWS_CROP.w * scale) / 2;
  // the heading alone in the middle; on "to the script" it moves up and the two suggestions rise under it
  const rise = tween(frame, T.rowsIn, T.rowsIn + 14, 0, 1, EASE.expoOut);
  const headTop = 500 - 104 * rise - 30 * tween(frame, T.pushA, T.pushA + 28, 0, 1, EASE.cubicInOut);
  const rowsTop = headTop + SUGGEST_HEAD_CROP.h * scale + 2 * 16 + 26 + 180 * (1 - rise);
  return (
    <CardStage>
      <RealCard capture="p1-suggestions-ticked" crop={SUGGEST_HEAD_CROP} focus={{ x: SUGGEST_HEAD_CROP.x, y: SUGGEST_HEAD_CROP.y }} place={{ x: left, y: headTop }} scale={scale} from={T.real}>
        <MistBand rect={SUGGEST.heading} at={T.markSuggest} dur={16} />
      </RealCard>
      {frame >= T.rowsIn ? (
        <div style={{ opacity: tween(frame, T.rowsIn, T.rowsIn + 4, 0, 1, EASE.linear) }}>
          <RealCard capture="p1-suggestions-ticked" crop={SUGGEST_ROWS_CROP} focus={{ x: SUGGEST_ROWS_CROP.x, y: SUGGEST_ROWS_CROP.y }} place={{ x: left, y: rowsTop }} scale={scale} from={T.rowsIn}>
            <MistBand rect={SUGGEST.scriptChip} at={T.markScript} />
            <MistBand rect={SUGGEST.jiraRow} at={T.markJira} />
          </RealCard>
        </div>
      ) : null}
    </CardStage>
  );
};

/** S09: the real click on "Save and mark verified" (the recording at 1x), its note "... marks this page Verified.". */
export const SaveShot: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <CardStage>
      <RealCard
        capture="p1-anchor-rec"
        crop={SAVE_CROP}
        focus={{ x: SAVE_CLICK.x, y: SAVE_CLICK.y }}
        place={{ x: 647, y: 518 }}
        scale={1}
        from={T.cutB}
        t={remap(frame, SAVE_KEYS)}
        click={{ frame: T.save, x: SAVE_CLICK.x, y: SAVE_CLICK.y, from: SAVE_CLICK.from, travel: T.save - T.cutB - 1 }}
      />
    </CardStage>
  );
};

/** S09: the page's real label, "Verified · Doc Drift", with Mist on "Verified". */
export const HeadShot: React.FC = () => (
  <CardStage>
    <RealCard capture="p1-verified" crop={HEAD_CROP} focus={{ x: HEAD_CROP.x + HEAD_CROP.w / 2, y: HEAD_CROP.y + HEAD_CROP.h / 2 }} place={{ x: 960, y: 540 }} scale={1} from={T.cut1}>
      <MistBand rect={VERIFIED_WORD} at={T.markVerified} />
    </RealCard>
  </CardStage>
);

/** S10: the real merge of PR #482, full bleed and crisp (no veil): the dialog, the click, "Merged", the push to #482. */
export const MergeShot: React.FC = () => (
  <RealTake capture="p2-merge-rec" time={{ keys: MERGE_VIDEO_KEYS }} camera={MERGE_CAM} clicks={MERGE_CLICKS} spotlight="none" seed="loop-merge">
    <MistBand rect={MERGE.renameWords} at={T.markRename} />
    <MistBand rect={MERGE.titleTimeout} at={T.markTimeout} />
    <MistBand rect={MERGE.pr482} at={T.mark482} />
  </RealTake>
);

/** S11: the page, full bleed and crisp; its real label flips on the flag (p1-verified to p2-flagged, nothing else
 * changes); the click on it opens the panel. */
export const PageShot: React.FC = () => {
  const frame = useCurrentFrame();
  const flagged = frame >= T.flag;
  return (
    <RealTake
      capture={flagged ? "p2-flagged" : "p1-verified"}
      camera={PAGE_CAM}
      crop={PAGE_CROP}
      seed={PAGE_SEED}
      creep={PAGE_MOTION.creep}
      float={PAGE_MOTION.float}
      spotlight="none"
      clicks={flagged ? [BADGE_CLICK] : []}
    />
  );
};

/** The comment's small context label (the viewers asked where the notice goes). */
const COMMENT_LABEL_Y = 452;

/** S12: the panel's first line (Mist on the rename), then the owner's comment under it (a Current underline on the
 * mention, the page owner: Mist hardly shows on the blue chip); on "No AI made that call." both dim and the line sets
 * under them, word by word with the voice. */
export const PanelShot: React.FC = () => {
  const frame = useCurrentFrame();
  const text = "No AI made that call.";
  const pScale = tween(frame, T.cut3, T.cut3 + 22, 0.9, 0.98, EASE.cubicInOut);
  const pushed = (a: number, b: number) => tween(frame, T.cut3, T.cut3 + 22, a, b, EASE.cubicInOut);
  const panel = { crop: PANEL_CROP, focus: PANEL.sentence, place: { x: pushed(463, 419), y: pushed(400, 383) }, scale: pScale, from: T.cut3 };
  const rise = tween(frame, T.comment, T.comment + 14, 0, 1, EASE.expoOut);
  const comment = { crop: COMMENT_CROP, focus: { x: COMMENT_CROP.x, y: COMMENT_CROP.y }, place: { x: 307, y: 506 + 40 * (1 - rise) }, scale: 0.98, from: T.comment };
  const dim = tween(frame, T.dim, T.dim + 6, 0, 1, EASE.expoOut);
  const scrim = (r: { x: number; y: number; w: number; h: number }) =>
    dim > 0.01 ? <div style={{ position: "absolute", left: r.x - 16, top: r.y - 16, width: r.w + 32, height: r.h + 32, borderRadius: 18, background: ink(0.12 * dim), backdropFilter: `grayscale(${(0.8 * dim).toFixed(2)})` }} /> : null;
  return (
    <CardStage
      over={
        <div style={{ position: "absolute", left: 0, top: 724, width: W }}>
          <KineticLine text={text} at={T.dim} words={lineCues(sc.line("S12"), text)} size={96} align="center" width={W} />
        </div>
      }
    >
      <RealCard capture="p4-panel" {...panel}>
        <MistBand rect={PANEL.rename} at={T.markExact} />
      </RealCard>
      {scrim(realCardRect(panel, frame))}
      {frame >= T.comment ? (
        <div style={{ opacity: tween(frame, T.comment, T.comment + 4, 0, 1, EASE.linear) }}>
          <div style={{ position: "absolute", left: comment.place.x - 4, top: COMMENT_LABEL_Y }}>
            <MaskLine at={T.comment}>
              <Eyebrow icon="comment" size={28}>
                A comment on the page, to its owner
              </Eyebrow>
            </MaskLine>
          </div>
          <RealCard capture="p4-comment" {...comment}>
            <CurrentUnderline rect={COMMENT.mention} at={T.markOwner} />
          </RealCard>
          {scrim(realCardRect(comment, frame))}
        </div>
      ) : null}
    </CardStage>
  );
};
