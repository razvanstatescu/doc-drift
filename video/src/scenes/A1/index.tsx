import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { AlertShot } from "../../components/A1/AlertShot";
import { AssistantPanel } from "../../components/A1/AssistantPanel";
import { DiffCard } from "../../components/A1/DiffCard";
import { CODE2, LAYOUT, RunbookPage, X0 } from "../../components/A1/RunbookPage";
import { ROLLBACK_CMD, ZSH_ERROR } from "../../components/A1/runbook";
import { Caption } from "../../components/Caption";
import { Terminal } from "../../components/Terminal";
import { clamp, EASE } from "../../lib/time";
import { getScene } from "../../lib/timeline";
import { Camera, type CamKey } from "../../motion/camera";
import { Whip } from "../../motion/whip";

/**
 * A1 · The problem, 3 a.m. (Night). Every frame below comes from the narration cues in timeline.json (local frames):
 *
 *   0          the 3 a.m. page: clock and alert card on screen from the first frame, settling (V02)
 *   V03        whip to the runbook; punch in on step 2 (1.3x, every line whole), landing on "rollback.sh"   (V03)
 *   V04 - 1 b  the terminal slides up and the page dims and blurs behind it; the command types; the error
 *              lands on V04
 *   "script"   the ghost diff: the new path is the shot's one amber element, slipped one unit right     (V04)
 *   "still"    cut to the byline; the check after it draws on at "fine" (its only appearance)          (V05)
 *   "month"    statement card: A date can't see a merge. (already rising on the cut frame)
 *   "agent"    the assistant: the question, then an answer that repeats step 2 and cites the page    (V06)
 *   end        holds on its final pose; A2 opens by slipping this frame apart (A1AssistantShot, frozen)
 */
const sc = getScene("A1");

const whip = sc.snap(sc.cue("V03"));
const punchLand = sc.wordAt("V03", "rollback");
const error = sc.snap(sc.cue("V04"));
const typeStart = error - 30;
const termIn = typeStart - 10;
const stream = sc.wordAt("V06", "and");
export const A1_T = {
  /**
   * A0 hard-cuts into A1, so A1 opens on content: the clock and the card start their set-ins before the scene and are
   * on screen from frame 0 (clock about 98% set, card fully opaque and 16 px low), settling with a small move. The
   * alert sound starts on frame 0.
   */
  clock: -10,
  card: -8,
  whip,
  punchStart: punchLand - 18,
  punchLand,
  termIn,
  typeStart,
  error,
  diff: sc.wordAt("V04", "script"),
  byline: sc.snap(sc.wordAt("V05", "still")),
  check: sc.wordAt("V05", "fine"),
  statement: sc.snap(sc.wordAt("V05", "month")),
  assistant: sc.snap(sc.wordAt("V06", "agent")),
  stream,
  code: stream + 22,
  source: sc.wordAt("V06", "confidence"),
  end: sc.durationInFrames,
};
const T = A1_T;

// ---- camera on the runbook page (frame px at zoom 1; see RunbookPage LAYOUT) ----
/** Step 2 whole: its text, its command and the line after it, every line inside the frame. */
const PUNCH = 1.3;
const STEP2_CY = (LAYOUT.s2 + LAYOUT.after + 100) / 2;
const BYLINE_ZOOM = 1.5;
const headCY = (LAYOUT.eyebrow + LAYOUT.byline + 44) / 2;

const PAGE_KEYS: CamKey[] = [
  { frame: T.punchStart, x: 960, y: STEP2_CY, zoom: PUNCH, dur: T.punchLand - T.punchStart },
  // V05: a cut (dur 0) to the title and byline
  { frame: T.byline, x: X0 + (960 - 192) / BYLINE_ZOOM, y: headCY + (540 - 470) / BYLINE_ZOOM, zoom: BYLINE_ZOOM, dur: 0 },
];

/** V04: the terminal over the page, the ghost diff under it on the right; the pair is centred in the frame. */
const TERM = { x: 192, y: 287, w: 1536, h: 208 };
const DIFF_TOP = TERM.y + TERM.h + 44;

/** The runbook stage: the page under its camera, and (V04) the terminal and the ghost diff over it. */
const RunbookStage: React.FC = () => {
  const frame = useCurrentFrame();
  const inV04 = frame >= T.termIn && frame < T.byline;
  // the page recedes to about 25% and softens, so only the terminal and the diff read
  const back = inV04 ? interpolate(frame, [T.termIn, T.termIn + 12], [0, 1], { ...clamp, easing: EASE.expoOut }) : 0;
  const slide = interpolate(frame, [T.termIn, T.termIn + 14], [1, 0], { ...clamp, easing: EASE.expoOut });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - 0.75 * back, filter: back > 0.01 ? `blur(${(6 * back).toFixed(2)}px)` : undefined }}>
        <Camera keys={PAGE_KEYS} clamp={false}>
          <RunbookPage byline="check" checkAt={T.check} />
        </Camera>
      </AbsoluteFill>
      {inV04 ? (
        <>
          <div style={{ position: "absolute", left: TERM.x, top: TERM.y, transform: `translateY(${slide * (1080 - TERM.y + 40)}px)` }}>
            <Terminal
              width={TERM.w}
              height={TERM.h}
              lines={[
                { at: T.typeStart, kind: "cmd", text: ROLLBACK_CMD, typeFrames: T.error - 6 - T.typeStart },
                { at: T.error, kind: "out", text: ZSH_ERROR },
              ]}
            />
          </div>
          <DiffCard at={T.diff} style={{ position: "absolute", right: 192, top: DIFF_TOP }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * The assistant shot (V06), the scene's final pose. Exported so A2 can open by slipping A1's last frame apart:
 * A2 renders it inside <Freeze frame={A1_T.end - 1}> (visual only; the sound stays here).
 */
export const A1AssistantShot: React.FC = () => (
  <AssistantPanel
    question="How do I roll back payments-api?"
    askAt={T.assistant + 2}
    streamAt={T.stream}
    answer={[
      {
        top: 436,
        size: 42,
        lineHeight: 58,
        tokens: [{ text: "Run the rollback script from the root of the " }, { text: "payments-api", mono: true }, { text: " repo." }],
      },
    ]}
    code={{ text: ROLLBACK_CMD, top: 512, at: T.code, frames: 12 }}
    source={{ top: 728, at: T.source, detail: "Step 2" }}
  />
);

const A1: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.statement) {
    shot = <Whip at={T.whip} dur={8} from={<AlertShot clockAt={T.clock} cardAt={T.card} />} to={<RunbookStage />} />;
  } else if (frame < T.assistant) {
    // the set-in starts 2 frames before the cut, so the cut frame already shows the line rising
    shot = (
      <Caption at={T.statement - 2} center size="headline">
        A date can’t see a merge.
      </Caption>
    );
  } else {
    shot = <A1AssistantShot />;
  }
  return (
    <World theme="night">
      {shot}
      {/* sound: the voice and score come from the global layer; the slip into A2 is film-level (transitions.ts) */}
      <Sfx id="alert" at={2} />
      <Sfx id="whoosh-short" at={T.whip} />
      <Sfx id="type-burst" at={T.typeStart} gainDb={-3} />
      <Sfx id="error-blip" at={T.error} />
      <Sfx id="tick" at={T.check + 2} gainDb={-2} />
      {[0, 4, 9, 13, 18, 24, 28].map((d) => (
        <Sfx key={`key-${d}`} id="type-key" at={T.stream + d} gainDb={-6} />
      ))}
      {[0, 5, 9].map((d) => (
        <Sfx key={`code-${d}`} id="type-key" at={T.code + 2 + d} gainDb={-7} />
      ))}
      <Sfx id="tick-soft" at={T.source} gainDb={-2} />
    </World>
  );
};

export default A1;
