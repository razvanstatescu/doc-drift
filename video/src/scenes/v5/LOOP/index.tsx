import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { capPose, capRectToScreen, DAY } from "../../../v4/kit";
import { MERGE, MERGE_CAM } from "./geom";
import { GrowWindow } from "./GrowWindow";
import { BlockTag, FlagLift, Gloss, MergeClock } from "./Overlay";
import { HeadShot, MergeShot, PageShot, PanelShot, RewindShot, SaveShot, SuggestShot } from "./shots";
import { LoopSound } from "./Sound";
import { T } from "./timing";

/**
 * LOOP (v5 round 2, film 900 to 1620, S08 to S12): the film's continuous real block, the judges' proof. V5.md sections
 * 5 and 8. Local frame = film frame - 900; every frame comes from timeline.json (./timing.ts), every rect from the
 * captures (./geom.ts). Nothing is painted on the footage: tight crops at 1:1, Mist bands, and our own elements beside.
 *
 *   0    "Rewind a week": PROMISE's last frames run backwards from "Rewind" (kit RewindFrom); "Last week" on "week".
 *   30   the real block, tagged once "Real product · demo site · Nov 13": "Suggested from this page (2)", both
 *        suggestions ticked, a card at 1:1 after one push-in; Mist on scripts/rollback.sh ("script") and PAY-6
 *        ("Jira issue").
 *   150  the real click on "Save and mark verified" (the recording, 1x) on "Save", with its note.
 *   195  the page's real label "Verified · Doc Drift" on "page", Mist on "Verified".
 *   240  one take, full bleed, no veil: the real Merge dialog of PR #482 (Mist on the rename), the confirm click on a
 *        beat before "merged", the clock "Real time since the merge", "Merged" on a beat, the one push-in and Mist on
 *        "(pull request #482)"; the page opens out of "#482" with its label in the same place; the clock lands on 19 on
 *        "seconds"; the page leans in through the score's silence; on "Possibly" the real label flips and a crafted
 *        "Possibly stale · Doc Drift" lifts out of it, big, beside the clock (kit LiftOut, the one amber); "it may be
 *        out of date" sets under it.
 *   568  the click on the real label, cut on it (570, the beat) to the review panel's first line (Mist on the rename
 *        at "exact change"); the owner's comment rises under it on "tells the page owner" (a Current underline on the
 *        mention); both dim and "No AI made that call." sets under them. Final pose for the whip.
 */
const LOOP: React.FC = () => {
  const frame = useCurrentFrame();
  let picture: React.ReactNode;
  if (frame < T.real) picture = <RewindShot />;
  else if (frame < T.cutB) picture = <SuggestShot />;
  else if (frame < T.cut1) picture = <SaveShot />;
  else if (frame < T.cut2) picture = <HeadShot />;
  else if (frame < T.cut3)
    picture = (
      <GrowWindow
        at={T.grow2}
        dur={T.grow2Dur}
        from={capRectToScreen(capPose(T.grow2, MERGE_CAM, { seed: "loop-merge" }), MERGE.pr482)}
        outgoing={<MergeShot />}
        incoming={<PageShot />}
      />
    );
  else picture = <PanelShot />;
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      {picture}
      <MergeClock />
      <FlagLift />
      <Gloss />
      <BlockTag />
      <LoopSound />
    </AbsoluteFill>
  );
};

export default LOOP;
