import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { DAY, typeStyle } from "../../brand/tokens";
import { FadeText } from "../../components/P1/FadeText";
import { SlipBadge } from "../../components/P1/SlipBadge";
import { PILL, ProductStage, WhipIn, WhipOut, type Cam, type Layer } from "../../components/P1/stage";
import { TimerCard } from "../../components/P2/TimerCard";
import { measured } from "../../lib/captures";
import { getScene } from "../../lib/timeline";
import { SetIn } from "../../motion/text";
import { Whip } from "../../motion/whip";

/**
 * P2 · Flag (Day, real). The real merge of PR #482 in Bitbucket (p2-merge-rec), the runbook before (p1-verified)
 * and after (p2-flagged, p2-flagged-tooltip), and the statement card. Local frames from the narration cues:
 *
 *   0          the whip from P1 lands in Bitbucket: PR #482's whole title, branches, tabs and description    (V13)
 *   "teammate" across to the Merge button
 *   "merges"   the cursor clicks Merge (the real click point); the real Merge dialog, punched in
 *   "request"  the cursor clicks the dialog's Merge; the dialog's fade-out is skipped; the timer (top right, over
 *              empty UI) starts counting from the click
 *   then       the merge runs and lands Merged: punch in on the title, the Merged lozenge and banner
 *   "runbook"  whip to Confluence: the same runbook as it was (Verified), push in on the badge             (V14)
 *   "flagged"  the badge reads Possibly stale and slips out of line (the one amber); the timer stops on the
 *              measured 19 s. No recording shows this change live (the take started after it), so the shot is
 *              before and after, with the brand slip as the device
 *   +8         the cursor hovers the badge: the real tooltip names PR #482 and the file it changed (117 frames)
 *   "that"     statement card (a cut on the beat): No AI made that call. / Deterministic matcher · 0 AI calls;
 *              the eval line sets in piece by piece on "Same change", "same result", "every time"; the last 4
 *              frames whip out (P3 lands the whip)                                                         (V15)
 *
 * Time from the Merge click to the flag runs at one compression (18.6 s real in `flag - confirm` frames), so the
 * Bitbucket recording and the timer agree: Merged lands where 7.6 s have passed, as it did in the take.
 */
const sc = getScene("P2");

const SECONDS = measured("mergeToFlagSeconds", 19);
const REAL = 18.6; // measured.mergeToFlagExact: Merge click to the byline written Possibly stale
const flag = sc.wordAt("V14", "flagged");
const confirm = sc.wordAt("V13", "request") + 4;
const perSec = (flag - confirm) / REAL; // frames per real second, Merge click to flag
export const P2_T = {
  pan: sc.wordAt("V13", "teammate"),
  mergeClick: sc.wordAt("V13", "merges") + 3,
  confirm,
  /** Bitbucket showed Merged 7.6 s after the click (source 5.178 s to 12.8 s) */
  merged: Math.round(confirm + 7.6 * perSec),
  /** the whip to Confluence, on the beat before "runbook" */
  toConfluence: sc.snap(sc.wordAt("V14", "runbook") - 3),
  push: sc.wordAt("V14", "runbook") + 4,
  flag,
  /** the hover, once the slip has landed: the tooltip gets about 117 frames before the card */
  tooltip: flag + 8,
  /** the timer leaves on its own beat, after the tooltip is up */
  timerOut: flag + 25,
  /** the card, on the beat at "that": the tooltip's time comes from the card's long hold */
  card: sc.snap(sc.wordAt("V15", "that")),
  line: sc.wordAt("V15", "call", "to"),
  eval1: sc.wordAt("V15", "same"),
  eval2: sc.wordAt("V15", "same", "from", 1),
  eval3: sc.wordAt("V15", "every"),
  end: sc.durationInFrames,
};
const T = P2_T;

// ---- Bitbucket (p2-merge.mp4: Merge click 2.523 s at (3621, 393), confirm 5.178 s at (2256, 925), Merged 12.8 s).
// Content of the open PR (capture px): breadcrumbs y 168 from x 724, title 245-290 (x 727-1709), branches 362-428,
// tabs 487-513, description 677-704 (x 770-2337): x 722-2337 in all, framed whole at 0.96 (title 46 px).
// Merged: title 236, branches + Merged 332, banner 523-744. Merge button 3555-3690 x 362-422.
const BB_CAM: Cam[] = [
  { frame: 0, x: 1530, y: 560, s: 0.96, dur: 0 },
  // across to the Merge button on "teammate"
  { frame: T.pan, x: 3005, y: 560, s: 0.96, dur: 14 },
  // the Merge dialog
  { frame: T.mergeClick + 2, x: 1920, y: 560, s: 0.92, dur: 14 },
  // a cut on the frame the dialog has gone: title, branches, the merge running, the description that names the rename
  { frame: T.confirm + 1, x: 1530, y: 590, s: 0.96, dur: 0 },
  // Merged: title, the Merged lozenge and banner (the top right stays empty for the timer)
  { frame: T.merged, x: 1370, y: 470, s: 1.15, dur: 16 },
];
// the dialog fades out over 5.30-5.45 s with the page ghosting through it: the click frame goes straight to 5.5 s
const BB_TIME: [number, number][] = [
  [0, 0.4],
  [T.mergeClick - 1, 2.45],
  [T.mergeClick + 1, 2.62],
  [T.mergeClick + 8, 3.1],
  [T.confirm - 1, 5.1],
  [T.confirm, 5.18],
  [T.confirm + 1, 5.58],
  [T.merged - 1, 12.6],
  [T.merged, 12.8],
  [T.merged + 60, 15.8],
];
const BB_LAYERS: Layer[] = [{ id: "p2-merge-rec", from: -10000, time: BB_TIME }];
const BB_CURSOR = [
  { frame: T.pan - 10, x: 2900, y: 900 },
  { frame: T.mergeClick, x: 3621, y: 393, click: true, cursor: "pointer" },
  { frame: T.confirm, x: 2256, y: 925, click: true, cursor: "pointer" },
  { frame: T.confirm + 26, x: 2420, y: 1210 },
];

const Bitbucket: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <ProductStage label="Bitbucket" cam={BB_CAM} layers={BB_LAYERS} cursor={BB_CURSOR} cursorShow={T.pan - 10} cursorHide={T.confirm + 20} />
  </AbsoluteFill>
);

// ---- Confluence: the runbook's byline (badge icon at x 2285, "Possibly stale · Doc Drift" ends at 2590)
const C_CAM: Cam[] = [
  { frame: 0, x: 2100, y: 470, s: 1.23, dur: 0 },
  // the badge near the top third, the title just out of frame above it, room for the tooltip below
  { frame: T.push, x: 2451, y: 625, s: 1.9, dur: T.flag - T.push },
];
const C_LAYERS: Layer[] = [
  { id: "p1-verified", from: -10000, to: T.flag },
  { id: "p2-flagged", from: T.flag, to: T.tooltip },
  // hovered: the badge sits on Confluence's hover pill, so the logged cover takes the pill's colour
  { id: "p2-flagged-tooltip", from: T.tooltip, maskFill: PILL },
];
const C_CURSOR = [
  { frame: T.flag - 4, x: 2760, y: 760 },
  { frame: T.tooltip - 1, x: 2470, y: 492, cursor: "pointer" },
];
const BADGE_BOX: [number, number, number, number] = [2274, 459, 326, 49];

const Confluence: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <ProductStage label="Confluence" cam={C_CAM} layers={C_LAYERS} cursor={C_CURSOR} cursorShow={T.flag - 4}>
      <SlipBadge at={T.flag} out={{ id: "p2-flagged", box: BADGE_BOX }} until={T.tooltip} />
      <SlipBadge at={T.flag} out={{ id: "p2-flagged-tooltip", box: BADGE_BOX }} patch={PILL} from={T.tooltip} />
    </ProductStage>
  </AbsoluteFill>
);

// ---- V15: the statement card. The eval line's pieces are laid out from the start and only fade up on their words.
const Statement: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground, alignItems: "center", justifyContent: "center" }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <SetIn at={T.card - 1} align="center" style={{ ...typeStyle("headline"), color: DAY.text }}>
        No AI made that call.
      </SetIn>
      <FadeText at={T.line} style={{ ...typeStyle("body"), color: DAY.text, marginTop: 40, textAlign: "center" }}>
        Deterministic matcher · 0 AI calls
      </FadeText>
      <FadeText
        at={T.eval1}
        parts={[
          { text: "Our eval set: 40 scenarios, ", at: T.eval1 },
          { text: "0 false flags, ", at: T.eval2 },
          { text: "2 known misses", at: T.eval3 },
        ]}
        style={{ ...typeStyle("small"), color: DAY.textMuted, marginTop: 56, textAlign: "center" }}
      />
    </div>
  </AbsoluteFill>
);

const P2: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.toConfluence - 4)
    shot = (
      <WhipIn>
        <Bitbucket />
      </WhipIn>
    );
  else if (frame < T.card) shot = <Whip at={T.toConfluence} dur={8} from={<Bitbucket />} to={<Confluence />} />;
  else
    shot = (
      <WhipOut end={T.end}>
        <Statement />
      </WhipOut>
    );
  return (
    <World theme="day">
      {shot}
      <TimerCard seconds={SECONDS} at={T.confirm} showAt={T.confirm + 2} dur={T.flag - T.confirm} out={T.timerOut} x={1420} y={176} />
      <Sfx id="click" at={T.mergeClick} />
      <Sfx id="click" at={T.confirm} />
      {Array.from({ length: Math.floor((T.flag - T.confirm) / 15) }, (_, i) => (
        <Sfx key={`tick-${i}`} id="clock-tick" at={T.confirm + 15 * (i + 1)} gainDb={-8} />
      ))}
      <Sfx id="merge" at={T.merged} />
      <Sfx id="whoosh-short" at={T.toConfluence} />
      <Sfx id="slip" at={T.flag + 6} />
      <Sfx id="tick-soft" at={T.tooltip} />
      <Sfx id="hit-soft" at={T.card} />
      {[T.eval1, T.eval2, T.eval3].map((f, i) => (
        <Sfx key={`ev-${i}`} id="tick-soft" at={f + 2} gainDb={-4} />
      ))}
      <Sfx id="whoosh-short" at={T.end - 3} />
    </World>
  );
};

export default P2;
