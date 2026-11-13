import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { DAY } from "../../brand/tokens";
import { modalCovers, ProductStage, WhipIn, WhipOut, type Cam, type Layer } from "../../components/P1/stage";
import { EASE } from "../../lib/time";
import { getScene } from "../../lib/timeline";

/**
 * P1 · Anchor (Day, real). The P1 take on the runbook (captures p1-unanchored, p1-anchor-rec, p1-verified) and the
 * Drift dashboard's "Anchor this space" (p5-dashboard, taken after the runbook was anchored). Local frames, all from
 * the narration cues:
 *
 *   0–6        the whip in from A2 (A2's whip ends on its last frame; P1 lands it over 7 frames, from the right)
 *   "Doc"      punch in on the title and the byline badge, which reads Unanchored                          (V11)
 *   badge      the cursor clicks the badge (the real click point); the badge modal opens and holds 10 frames,
 *              then an eased punch to "Suggested from this page (2)": PAY-6 and scripts/rollback.sh
 *   "already"  the real take: the repository typed into "Repository for suggested paths" (payments-api)
 *   "anchors"  the cursor ticks scripts/rollback.sh (the real click), now "in payments-api"
 *   "Save"     pull back to the form; the cursor clicks "Save and mark verified"; a cut straight to the settled
 *              confirmation (header Verified, "Saved 2 anchors. This page is Verified.", the 2 anchors), held 1 s
 *              (the save spinner and the half-refreshed frames are skipped)                                  (V12)
 *   "page"     cut to the reloaded page, 6 frames still, then a push to 1.9x on the badge: Verified
 *   then       1 s of the dashboard's "Anchor this space" button: "6 pages in PLAT are not anchored" (the dashboard
 *              after the anchoring, so nothing contradicts the shot before it); the last 4 frames whip out
 *
 * The recording is time-remapped (stage.tsx). Nothing is drawn over the UI except the logged "(Development)" covers.
 */
const sc = getScene("P1");

const doc = sc.wordAt("V11", "doc");
const verified = sc.wordAt("V12", "verified");
const save = sc.wordAt("V12", "save");
export const P1_T = {
  punch: doc - 20,
  doc,
  badgeClick: doc + 15,
  modal: doc + 17,
  /** the opened modal holds 10 frames before the eased punch to the suggestions */
  modalPunch: doc + 27,
  fieldClick: sc.wordAt("V11", "already") - 8,
  tick: sc.wordAt("V11", "anchors"),
  pull: sc.wordAt("V11", "anchors") + 28,
  save,
  /** the settled confirmation, straight after the click */
  confirm: save + 2,
  /** the reloaded page: 6 frames still, then the push lands in "Verified" */
  page: save + 29,
  push: save + 35,
  verified,
  /** the dashboard, on the beat after "Verified" has been heard and read */
  dash: sc.snap(verified + 24),
  end: sc.durationInFrames,
};
const T = P1_T;

// capture px (3840 x 2160): the real click points come from captures.json → p1-anchor-rec.clicks
const BADGE = { x: 2514, y: 484 };
const FIELD = { x: 1880, y: 874 };
const TICK = { x: 1218, y: 1010 };
const SAVE = { x: 1346, y: 1673 };

const CAM: Cam[] = [
  { frame: 0, x: 2250, y: 700, s: 0.72, dur: 0 },
  // title and byline (the byline reads at 34 px)
  { frame: T.punch, x: 2100, y: 470, s: 1.23, dur: T.doc - T.punch },
  // the modal opens (its top half) and holds, then an eased punch to the suggestions box
  { frame: T.modal, x: 1920, y: 600, s: 1.0, dur: 0 },
  { frame: T.modalPunch, x: 1666, y: 880, s: 1.55, dur: 22, ease: EASE.cubicInOut },
  // pull back to the form: the ticked suggestions down to "Save and mark verified"
  { frame: T.pull, x: 1910, y: 1322, s: 1.08, dur: 18, ease: EASE.quintOut },
  // a cut to the settled confirmation: header (Verified), "Saved 2 anchors. This page is Verified.", the anchors
  { frame: T.confirm, x: 1920, y: 680, s: 1.0, dur: 0 },
  // a cut to the reloaded page (title and byline), then the push to the badge, as in P2
  { frame: T.page, x: 2100, y: 470, s: 1.23, dur: 0 },
  { frame: T.push, x: 2451, y: 625, s: 1.9, dur: 14 },
  // the dashboard: the "Anchor this space" button and its line (47 px), "Pages with drift" below; the KPI cards
  // (y 460-686) and the drift table (from y 1206) are out of view
  { frame: T.dash, x: 1141, y: 951, s: 1.7, dur: 0 },
];

/**
 * Scene frame -> p1-anchor.mp4 seconds (clicks in the take: field 9.313 s, tick 12.263 s, save 14.698 s). After the
 * save click the take shows a spinner, two scroll jumps and a half-refreshed modal ("Saved…" above "No anchors yet")
 * until about 17.9 s: the cut goes from the pressed button (14.8 s) straight to the settled state (18.1 s).
 */
const ANCHOR_TIME: [number, number][] = [
  [T.modal, 6.9],
  [T.fieldClick, 9.3],
  [T.fieldClick + 2, 9.55],
  [T.fieldClick + 33, 10.9],
  [T.tick - 1, 12.2],
  [T.tick + 1, 12.5],
  [T.save - 1, 14.64],
  [T.save + 1, 14.8],
  [T.confirm, 18.1],
  [T.page - 1, 18.6],
];

const LAYERS: Layer[] = [
  { id: "p1-unanchored", from: -10000, to: T.modal },
  // the modal is open for the whole span; under it the byline reads Unanchored, whose suffix ends at x 2754
  { id: "p1-anchor-rec", from: T.modal, to: T.page, time: ANCHOR_TIME, loggedMasks: false, covers: modalCovers("p1-anchor-rec", 2754) },
  { id: "p1-verified", from: T.page, to: T.dash },
  {
    id: "p5-dashboard",
    from: T.dash,
    loggedMasks: false,
    covers: [
      { box: [323, 1389, 206, 42], fill: "rgb(235,242,253)", why: "Development install suffix (logged), on the selected item" },
      { box: [1069, 140, 333, 67], fill: "#FFFFFF", why: "Development install suffix (logged)" },
    ],
  },
];

const CURSOR = [
  { frame: T.punch + 4, x: 2960, y: 760 },
  { frame: T.badgeClick, x: BADGE.x, y: BADGE.y, click: true, cursor: "pointer" },
  { frame: T.fieldClick, x: FIELD.x, y: FIELD.y, click: true, cursor: "text" },
  { frame: T.tick, x: TICK.x, y: TICK.y, click: true, cursor: "pointer" },
  { frame: T.save, x: SAVE.x, y: SAVE.y, click: true, cursor: "pointer" },
];

/** P1's picture without sound. */
export const P1Content: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <ProductStage label="Confluence" cam={CAM} layers={LAYERS} cursor={CURSOR} cursorShow={T.punch + 4} cursorHide={T.save + 2} />
  </AbsoluteFill>
);

const P1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <World theme="day">
      {/* A2's exit whip ends on A2's last frame; P1 lands it (from the right, with the same blur) over frames 0-6.
          The last 4 frames whip out again; P2 lands that one. */}
      {frame < T.end - 4 ? (
        <WhipIn at={0} dur={14}>
          <P1Content />
        </WhipIn>
      ) : (
        <WhipOut end={T.end}>
          <P1Content />
        </WhipOut>
      )}
      <Sfx id="click" at={T.badgeClick} />
      <Sfx id="click" at={T.fieldClick} gainDb={-4} />
      <Sfx id="type-burst" at={T.fieldClick + 8} gainDb={-7} />
      <Sfx id="click" at={T.tick} />
      <Sfx id="tick-soft" at={T.tick + 1} />
      <Sfx id="click" at={T.save} />
      <Sfx id="chime-soft" at={T.verified} />
      <Sfx id="tick-soft" at={T.dash} gainDb={-2} />
      <Sfx id="whoosh-short" at={T.end - 3} />
    </World>
  );
};

export default P1;
