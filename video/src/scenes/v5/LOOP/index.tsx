import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DAY } from "../../../v4/kit";
import { BADGE_CLICK, PAGE_CAM_S09, PAGE_CAM_S11, PAGE_SPOT_S09, PAGE_SPOT_S11 } from "./geom";
import { GrowWindow } from "./GrowWindow";
import { BlockTag, CLOCK_RECT, Gloss, MergeClock } from "./Overlay";
import { DialogShot, MergeShot, PageShot, PanelShot, RewindShot } from "./shots";
import { LoopSound } from "./Sound";
import { T } from "./timing";

/**
 * LOOP (v5, film 900 to 1575, S08 to S12): the film's continuous real block, the judges' proof. V5.md section 5.
 * Local frame = film frame - 900; every frame comes from timeline.json (./timing.ts), every rect from the captures
 * (./geom.ts). Four shots, two of them long takes:
 *
 *   0    "Rewind a week": PROMISE's last frames run backwards, fast, with the "Last week" chip (kit RewindFrom).
 *   30   cut on the beat into the real block, tagged once "Real product · demo site · Nov 13". The real suggestions
 *        dialog at 1x, its header covered: the typed repository, the real tick on scripts/rollback.sh on a beat (Mist on
 *        "script"), Mist on PAY-6 on "Jira issue", the real click on "Save and mark verified" on "Save".
 *   195  cut on the score's backbeat (the button busy after the click) to the real runbook head, cropped above its
 *        table, on "page"; the spotlight finds "Verified · Doc Drift" on "Verified".
 *   240  cut on the line into one directed take of 10.5 s: the real Merge dialog of PR #482 (Mist on the rename), the
 *        real confirm click on a beat before "merged", the clock "Since the merge click", the wait ramped at about 8x
 *        with its label, "Merged" on a beat, the punch-in and Mist on "(pull request #482)"; the page opens out of the
 *        clock; the clock ramps (label) through "19 seconds later", runs 1x through the score's half bar of silence,
 *        and the real flagged label lands on "Possibly" with the clock on 19 ("Merge to flag", "Measured on the demo
 *        site, Nov 13"); "it may be out of date" sets under the label.
 *   554  the click on the label, cut on it (555, the beat) to the real review panel: its first sentence ("PR #482 renamed
 *        scripts/rollback.sh to scripts/rollback-v2.sh, an anchor of this page."), Mist on the rename at "exact
 *        change"; the panel dims and "No AI made that call." sets under it with the voice. Final pose for the whip.
 */
const LOOP: React.FC = () => {
  const frame = useCurrentFrame();
  let picture: React.ReactNode;
  if (frame < T.real) picture = <RewindShot />;
  else if (frame < T.cut1) picture = <DialogShot />;
  else if (frame < T.cut2) picture = <PageShot camera={PAGE_CAM_S09} spot={PAGE_SPOT_S09} />;
  else if (frame < T.cut3)
    picture = (
      <GrowWindow
        at={T.grow2}
        dur={T.grow2Dur}
        from={CLOCK_RECT}
        outgoing={<MergeShot />}
        incoming={<PageShot camera={PAGE_CAM_S11} spot={PAGE_SPOT_S11} flipAt={T.flag} click={BADGE_CLICK} />}
      />
    );
  else picture = <PanelShot />;
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      {picture}
      <Gloss />
      <MergeClock />
      <BlockTag />
      <LoopSound />
    </AbsoluteFill>
  );
};

export default LOOP;
