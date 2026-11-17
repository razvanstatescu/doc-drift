import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../../lib/time";
import { BYLINE, bylineItemSize } from "../../../v4/twins";
import { capPose, capRectToScreen, DAY, FONT, HonestClock, InkLabel, LiftOut, MaskLine } from "../../../v4/kit";
import { FLAGGED_ITEM, LIFT, PAGE_CAM, PAGE_MOTION, PAGE_SEED } from "./geom";
import { clockAt, T } from "./timing";

/**
 * The real block's one tag (V5.md 8.6: one tag per real block, no other labels on the footage). It steps aside while the
 * merge take's push-in carries the real PR title under its corner (QA L2-2), and returns on the review panel.
 */
export const BlockTag: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.real) return null;
  const away = tween(frame, T.punch, T.punch + 6, 0, 1, EASE.linear) * (1 - tween(frame, T.cut3, T.cut3 + 4, 0, 1, EASE.linear));
  const opacity = tween(frame, T.real, T.real + 4, 0, 1, EASE.linear) * (1 - away);
  if (opacity <= 0.01) return null;
  return (
    <div style={{ position: "absolute", left: 64, top: 56, opacity }}>
      <InkLabel icon="eye" size={26}>
        Real product · demo site · Nov 13
      </InkLabel>
    </div>
  );
};

/**
 * The honest clock, "Real time since the merge", from the merge click through the reveal (it is carried across it)
 * to the panel: it lands on 19 on "seconds" and holds; on the flag its label turns "Merge to flag".
 */
export const MergeClock: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.merge + 1 || frame >= T.cut3) return null;
  return (
    <HonestClock
      at={T.merge + 1}
      value={clockAt(frame)}
      swap={{ at: T.flag + 1, label: "Merge to flag" }}
      note={{ at: T.note, text: "Measured on the demo site, Nov 13" }}
    />
  );
};

/** The real label on screen at the flag (the lifted copy starts exactly on it). */
const flaggedLabel = () => capRectToScreen(capPose(T.flag, PAGE_CAM, { seed: PAGE_SEED, ...PAGE_MOTION }), FLAGGED_ITEM);

/** The flag made unmissable: a crafted "Possibly stale · Doc Drift" lifts out of the real label (untouched) and lands
 * big beside the clock, carrying the amber (kit LiftOut). */
export const FlagLift: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.flag || frame >= T.cut3) return null;
  return <LiftOut from={flaggedLabel()} at={T.flag} dur={T.liftDur} to={LIFT.to} size={LIFT.size} />;
};

/** "it may be out of date", set under the lifted label as it is said (the functional voice: a mask line). */
export const Gloss: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.gloss || frame >= T.cut3) return null;
  const item = bylineItemSize("possibly_stale", LIFT.size / BYLINE.size);
  const padY = 0.24 * LIFT.size;
  return (
    <div style={{ position: "absolute", left: LIFT.to.x, top: LIFT.to.y + item.h + padY + 14 }}>
      <MaskLine at={T.gloss} style={{ fontFamily: FONT.sans, fontSize: 44, lineHeight: "54px", fontWeight: 500, color: DAY.text, whiteSpace: "nowrap" }}>
        it may be out of date
      </MaskLine>
    </div>
  );
};
