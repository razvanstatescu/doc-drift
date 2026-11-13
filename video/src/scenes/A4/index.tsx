import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { AlertShot } from "../../components/A1/AlertShot";
import { AssistantPanel } from "../../components/A1/AssistantPanel";
import { LAYOUT, RunbookPage } from "../../components/A1/RunbookPage";
import { OLD_PATH } from "../../components/A1/runbook";
import { EndCard } from "../../components/A4/EndCard";
import { clamp } from "../../lib/time";
import { getScene } from "../../lib/timeline";
import { Camera } from "../../motion/camera";

/**
 * A4 · Close (Night). The bookend: the same 3 a.m., but this time the page and the agent both say so before step 2.
 * Local frames, all from the narration cues and the endHit marker in timeline.json:
 *
 *   0           the alert again (the same card as A1), on screen from the first frame              (V24)
 *   "a.m." end  cut to the runbook: the title, the Possibly stale badge in the byline, step 2 below;
 *               the badge slips out of line on "runbook" (the shot's one amber element)
 *   "and"       cut to the assistant: same question, but the answer is the caveat, not the old step,
 *               and its source carries the badge
 *   endHit - 1 bar: cut to the Night ground; the mark builds large (A0's reveal), the middle band's slip
 *               LANDS exactly on endHit (the score's final hit, and the slip's latch); it settles into the
 *               lockup at the frame centre, the name sets before "Doc Drift Sentinel" is spoken          (V25)
 *   "Catch"     the lockup lifts as the tagline sets, then the small credit line; hold; fade to black over
 *               the last 15 frames
 */
const sc = getScene("A4");

const endHit = sc.marker("endHit");
const agent = sc.snap(sc.wordAt("V24", "and"));
export const A4_T = {
  /** P5 hard-cuts into A4, so it opens on content (as A1 does): clock and card already set, settling. */
  clock: -10,
  card: -8,
  runbook: sc.snap(sc.wordAt("V24", "a.m", "to")),
  badgeSlip: sc.wordAt("V24", "runbook"),
  agent,
  stream: agent + 3,
  source: sc.wordAt("V24", "agent", "to"),
  reveal: endHit - 30,
  /** A 3-frame slip that starts 2 frames early is home (99%) exactly on endHit. */
  slip: endHit - 2,
  slipFrames: 3,
  settle: endHit + 8,
  /** The lockup lifts to make room just before "Catch", so the tagline rises into clear space on the word. */
  lift: sc.wordAt("V25", "catch") - 8,
  name: sc.wordAt("V25", "doc") - 16,
  tagline: sc.wordAt("V25", "catch"),
  credit: sc.wordAt("V25", "catch") + 8,
  fade: sc.durationInFrames - 15,
  end: sc.durationInFrames,
};
const T = A4_T;

/**
 * The runbook framed whole and calm, eyebrow to step 2's command inside the title-safe area (y 108-972), with the frame's
 * bottom edge falling in the gap after the paragraph under the command, so no line is sliced.
 */
const Z = 0.93;
const BOTTOM_GAP = LAYOUT.after + 100 + (LAYOUT.s3 - LAYOUT.after - 100) / 2; // between "The script calls..." and step 3
const PAGE_CAM = { x: 960, y: BOTTOM_GAP - 540 / Z, zoom: Z };

const A4: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.runbook) {
    shot = <AlertShot clockAt={T.clock} cardAt={T.card} />;
  } else if (frame < T.agent) {
    shot = (
      <Camera keys={[]} base={PAGE_CAM} clamp={false}>
        <RunbookPage byline="flagged" slipAt={T.badgeSlip} />
      </Camera>
    );
  } else if (frame < T.reveal) {
    shot = (
      <AssistantPanel
        question="How do I roll back payments-api?"
        askAt={T.agent - 12}
        streamAt={T.stream}
        perWord={1.2}
        answer={[
          { top: 424, size: 50, weight: 600, lineHeight: 62, tokens: [{ text: "The runbook is Possibly stale." }] },
          {
            top: 500,
            size: 44,
            lineHeight: 58,
            // a PR reference reads in the sentence's own type; only the pasteable path is mono
            tokens: [{ text: "PR #482 renamed " }, { text: OLD_PATH, mono: true }, { text: " after it was last verified." }],
          },
        ]}
        source={{ top: 680, at: T.source, badge: true }}
      />
    );
  } else {
    shot = (
      <EndCard
        revealAt={T.reveal}
        slipAt={T.slip}
        slipFrames={T.slipFrames}
        settleAt={T.settle}
        nameAt={T.name}
        liftAt={T.lift}
        taglineAt={T.tagline}
        creditAt={T.credit}
      />
    );
  }
  const black = interpolate(frame, [T.fade - 1, T.end - 1], [0, 1], clamp);
  return (
    <World theme="night">
      {shot}
      {black > 0 ? <AbsoluteFill style={{ background: "#000000", opacity: black }} /> : null}
      {/* sound: voice and score are global; the score's own final hit lands on endHit */}
      <Sfx id="alert" at={2} gainDb={-6} />
      {/* the latch lands with the badge: the kit's 6-frame expo-out is home (90%) two frames in */}
      <Sfx id="slip" at={T.badgeSlip + 2} gainDb={-3} />
      {[0, 4, 8, 13, 17].map((d) => (
        <Sfx key={`key-${d}`} id="type-key" at={T.stream + d} gainDb={-7} />
      ))}
      <Sfx id="tick-soft" at={T.source} gainDb={-2} />
      <Sfx id="tick-soft" at={T.reveal + 9} gainDb={-4} />
      <Sfx id="tick-soft" at={T.reveal + 15} gainDb={-4} />
      {/* the mark's slip lands on endHit, with the score's final hit */}
      <Sfx id="slip" at={endHit} />
    </World>
  );
};

export default A4;
