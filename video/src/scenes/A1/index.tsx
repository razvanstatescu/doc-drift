import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { AlertStation } from "../../components/A1/AlertStation";
import { DIFF, GhostDiff } from "../../components/A1/GhostDiff";
import { ROLLBACK_CMD, ZSH_ERROR } from "../../components/A1/runbook";
import { turnTravel } from "../../components/A1/moves";
import { SHELL, ShellTerminal } from "../../components/A1/ShellTerminal";
import { EASE, tween } from "../../lib/time";
import { getScene } from "../../lib/timeline";
import { Camera3D, KineticLine, NIGHT, Stage, WhipBlur, type Cam3Key } from "../../v4/kit";
import { AgentPanelTwin, PageTwin, pageRects, textWidth, type AgentPanelTwinProps, type PageTwinProps } from "../../v4/twins";

/**
 * A1 · 3 a.m. (Night, film 397 to 1057). V4.md section 6. Local frames, all from the narration cues in timeline.json:
 *
 *   0          (hard cut from A0 on the bar) the huge 03:07 is already rolling in; the last drum lands on "3"   (V02)
 *   "Payments" the alert card has lifted from the ground; on "down" the error rate rolls to 14%; a slow push
 *   V03        whip with blur to the runbook (Night page twin, "Reviewed 34 days ago"); on "says" the camera
 *              travels down to step 2 and the Mist band marks ./scripts/rollback.sh on "rollback.sh"        (V03)
 *   V04 - 40   the shell lifts over the page (the page racks out); step 2's command types; the zsh error
 *              lands on V04; on "script" the ghost diff ghosts in; on "renamed" the new path slips one unit
 *              in amber, the shot's one amber                                                             (V04)
 *   V05        the shell and the diff drop away, the page racks back in, the camera travels up to the byline;
 *              on "fine" a Current underline draws under the date; after "fine." the type rises beside the page
 *              in three lines: A date / can't see / a merge.                                               (V05)
 *   V06        whip to the generic assistant: the question types, the answer streams and repeats the old
 *              step on "same step", the source chip lands on "confidence"; the camera keeps moving to the end   (V06)
 *   end        A2 opens by slipping this frame apart (A1AssistantShot, frozen at A1_T.end - 1)
 */
const sc = getScene("A1");

const error = sc.snap(sc.cue("V04"));
export const A1_T = {
  /** The clock is rolling on frame 0 (it started 6 frames before the cut); the last drum lands 2 frames before "3". */
  clockAt: -6,
  clockLand: sc.wordAt("V02", "3") - 2,
  /** The card lifts for 14 frames and lands on "Payments". */
  cardAt: sc.wordAt("V02", "payments") - 14,
  /** The error rate rolls as the card lands (done before "down"), so "Error rate 14%" holds its reading time. */
  rateAt: sc.wordAt("V02", "payments") - 4,
  whip1: sc.snap(sc.cue("V03")),
  travel: sc.wordAt("V03", "says"),
  mark: sc.wordAt("V03", "rollback") - 4,
  termAt: error - 40,
  typeAt: error - 34,
  typeDur: 26,
  error,
  diff: sc.wordAt("V04", "script") - 4,
  slip: sc.wordAt("V04", "renamed") - 6,
  /** V05: the shell and the diff drop and the camera travels up 4 frames after the beat (the zsh error holds 104). */
  back: sc.snap(sc.cue("V05")) + 4,
  check: sc.wordAt("V05", "fine") - 4,
  /**
   * "A date can't see a merge." rises in the pause after "fine.", line by line (4 frames apart, words 3 apart), and is
   * still about 21 frames later: 72 frames before the whip, for a reading time of 69.
   */
  type: sc.wordAt("V05", "fine", "to") - 3,
  whip2: sc.snap(sc.cue("V06")),
  ask: sc.wordAt("V06", "ask"),
  /**
   * The answer streams from right after "agent," at 90 characters a second: the old command lands on "same step", and
   * the first sentence is still for 120 frames to A1's end (126 with A2's slip reveal; its reading time is 126).
   */
  answer: sc.wordAt("V06", "and") - 8,
  step: sc.wordAt("V06", "same") - 2,
  source: sc.wordAt("V06", "confidence") - 2,
  end: sc.durationInFrames,
};
const T = A1_T;

// ---------------------------------------------------------------------------------------------------------------------
// The runbook station (V03 to V05): one continuous shot of the Night page twin, with the shell and the ghost diff
// lifting over it for V04 and the type zone beside it for V05.
// ---------------------------------------------------------------------------------------------------------------------

const PAGE: PageTwinProps = {
  world: "night",
  doc: "runbook",
  byline: { kind: "reviewed", text: "Reviewed 34 days ago" },
  mark: { token: "./scripts/rollback.sh", kind: "mist", at: T.mark },
};
const R = pageRects(PAGE);
const cx = (r: { x: number; w: number }) => r.x + r.w / 2;
const cy = (r: { y: number; h: number }) => r.y + r.h / 2;

/** Camera poses on the page (stage px). */
const HEAD = { x: cx(R.card), y: (R.title.y + R.byline.y + R.byline.h) / 2 + 40, zoom: 1.28 };
const STEP2 = { x: cx(R.card), y: cy(R.step2Code), zoom: 1.42 };
/** V04: the shell and the diff, framed at 1:1 around step 2. */
const V04_CAM = { x: 960, y: cy(R.step2Code) + 60, zoom: 1 };
/** Screen-space layout of V04 at zoom 1, converted to stage px. */
const toStage = (sx: number, sy: number) => ({ x: V04_CAM.x + (sx - 960), y: V04_CAM.y + (sy - 540) });
const SHELL_AT = toStage(150, 238);
const DIFF_AT = toStage(1920 - 150 - DIFF.w, 238 + SHELL.titleH + SHELL.padY * 2 + SHELL.line * 2 + 46);
/**
 * V05: the page's head on the left at 1:1 (the byline reads 27 px), the type zone on the right, in three lines that
 * are measured so the longest fits the zone: "A date / can't see / a merge.".
 */
const V05_CAM = { x: R.card.x + (960 - 84), y: cy(R.byline) + 60, zoom: 1 };
const TYPE_LINES = ["A date", "can’t see", "a merge."];
const TYPE_X = R.card.x + R.card.w + 76;
const TYPE_W = V05_CAM.x + (1836 - 960) - TYPE_X;
const TYPE_SIZE = Math.min(124, Math.floor(TYPE_W / Math.max(...TYPE_LINES.map((l) => textWidth(l, { size: 1, weight: 600, tracking: -0.028 })))));
const TYPE_LH = Math.round(TYPE_SIZE * 1.04);
const TYPE_TOP = cy(R.byline) - (TYPE_LINES.length * TYPE_LH) / 2 - 6;

const RUNBOOK_KEYS: Cam3Key[] = [
  // the whip lands on the head, then the camera travels down to step 2 on "says" (the page tips back on the way and
  // lands square), landing on "rollback.sh"
  ...turnTravel(T.travel, 20, HEAD, STEP2, { pitch: 6 }),
  // V04: pull back to frame the shell and the diff over the page
  { at: T.termAt - 2, dur: 22, to: V04_CAM, ease: EASE.expoOut },
  // V05: travel up to the byline (tipping forward on the way), the page on the left, room for the type on the right
  ...turnTravel(T.back, 24, V04_CAM, V05_CAM, { pitch: -5 }),
];

const RunbookStation: React.FC = () => {
  const frame = useCurrentFrame();
  // the page racks out while the shell is up (V04) and back in when it leaves (V05)
  const rackOut = tween(frame, T.termAt, T.termAt + 12, 0, 1, EASE.expoOut) * (1 - tween(frame, T.back, T.back + 14, 0, 1, EASE.expoOut));
  // the shell and the diff leave by moving: they drop out of frame as the camera travels up
  const drop = tween(frame, T.back, T.back + 12, 0, 1, EASE.expoIn);
  return (
    <Stage world="night" motif="grid" light={["50%", "30%"]} grid={{ opacity: 0.04 }}>
      <Camera3D keys={RUNBOOK_KEYS} base={HEAD} seed="runbook">
        <div style={{ position: "absolute", inset: 0, filter: rackOut > 0.01 ? `blur(${(7 * rackOut).toFixed(2)}px) brightness(${(1 - 0.45 * rackOut).toFixed(3)})` : undefined }}>
          <PageTwin {...PAGE} />
        </div>
        {frame >= T.termAt && drop < 1 ? (
          <div style={{ position: "absolute", inset: 0, transform: drop > 0 ? `translateY(${(drop * 900).toFixed(1)}px)` : undefined }}>
            <ShellTerminal x={SHELL_AT.x} y={SHELL_AT.y} at={T.termAt} cmd={ROLLBACK_CMD} typeAt={T.typeAt} typeDur={T.typeDur} error={ZSH_ERROR} errorAt={T.error} />
            <GhostDiff x={DIFF_AT.x} y={DIFF_AT.y} at={T.diff} slipAt={T.slip} />
          </div>
        ) : null}
        {/* "Reviewed 34 days ago": a Current underline under the date on "fine" */}
        {frame >= T.check ? (
          <div
            style={{
              position: "absolute",
              left: R.badge.x + R.badge.h * 0.95,
              top: R.badge.y + R.badge.h - 1,
              width: (R.badge.w - R.badge.h * 1.2) * tween(frame, T.check, T.check + 10, 0, 1, EASE.expoOut),
              height: 4,
              borderRadius: 2,
              background: NIGHT.link,
            }}
          />
        ) : null}
        {frame >= T.type - 2 ? (
          <div style={{ position: "absolute", left: TYPE_X, top: TYPE_TOP, width: TYPE_W }}>
            {TYPE_LINES.map((line, i) => (
              <KineticLine key={line} text={line} at={T.type + i * 4} size={TYPE_SIZE} lineHeight={TYPE_LH} world="night" stagger={3} />
            ))}
          </div>
        ) : null}
      </Camera3D>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The assistant (V06), A1's final pose.
// ---------------------------------------------------------------------------------------------------------------------

/** The generic assistant, centred: 1240 px wide, the answer at 40 px (the old command at 35 px mono, on one line). */
const PANEL: AgentPanelTwinProps = {
  world: "night",
  variant: "generic",
  question: { text: "How do I roll back payments-api?", at: T.ask, typeDur: 22 },
  answer: { lines: ["Run the rollback script from the root of the `payments-api` repo.", `\`${ROLLBACK_CMD}\``], at: T.answer, cps: 90 },
  source: { text: "Payments rollback runbook", at: T.source },
  x: (1920 - 1240) / 2,
  y: 250,
  width: 1240,
  size: 40,
  elev: 4,
};
/**
 * The old command's line in the panel (stage px), from AgentPanelTwin's layout (padding 34, header 60 + 26, the
 * question block 83 + 18, the first answer line 61 + 18). agentPanelRects() would give it, but it is not exported from
 * src/v4/twins yet; checked on stills.
 */
const CMD = {
  x: (PANEL.x ?? 0) + 34,
  y: (PANEL.y ?? 0) + 300,
  h: 61,
  w: textWidth(ROLLBACK_CMD, { size: 40 * 0.88, mono: true }) + 2 * 0.28 * 40 * 0.88,
};

/**
 * On "same step" the old command gets the same Night Mist band that marked it on the page in V03 (the twins' Night
 * mist, rgba(214, 228, 231, 0.17)): the rhyme says it is the same step. Not amber: nothing in this shot is the drift.
 */
const CommandMist: React.FC = () => {
  const frame = useCurrentFrame();
  const p = tween(frame, T.step, T.step + 10, 0, 1, EASE.expoOut);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: CMD.x - 6,
        top: CMD.y + 6,
        width: CMD.w + 12,
        height: CMD.h - 12,
        borderRadius: 10,
        background: "rgba(214, 228, 231, 0.17)",
        clipPath: `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0 round 10px)`,
      }}
    />
  );
};

/**
 * The assistant shot (V06), the scene's final pose. Exported so A2 can open by slipping A1's last frame apart:
 * A2 renders it inside <Freeze frame={A1_T.end - 1}> (visual only; the sound stays in A1).
 */
export const A1AssistantShot: React.FC = () => (
  <Stage world="night" motif="tide" light={["50%", "36%"]} tide={{ top: 850, bottom: 1110, count: 7 }}>
    <Camera3D
      keys={[{ at: T.step - 8, dur: 34, to: { x: 960, y: CMD.y + CMD.h / 2 - 20, zoom: 1.06 }, ease: EASE.expoOut }]}
      base={{ x: 960, y: (PANEL.y ?? 0) + 250, zoom: 0.97 }}
      seed="assistant"
    >
      <AgentPanelTwin {...PANEL} />
      <CommandMist />
    </Camera3D>
  </Stage>
);

const A1: React.FC = () => {
  const frame = useCurrentFrame();
  const alert = (
    <AlertStation clockAt={T.clockAt} clockLand={T.clockLand} cardAt={T.cardAt} rateAt={T.rateAt} tiltAt={T.cardAt - 4} outAt={T.whip1} />
  );
  let shot: React.ReactNode;
  if (frame < T.whip2 - 6) shot = <WhipBlur at={T.whip1} dur={10} dir="left" from={alert} to={<RunbookStation />} />;
  else shot = <WhipBlur at={T.whip2} dur={10} dir="left" from={<RunbookStation />} to={<A1AssistantShot />} />;
  return (
    <World theme="night">
      <AbsoluteFill>{shot}</AbsoluteFill>
      {/* sound: the voice and score come from the global layer; the slip into A2 is film-level (transitions.ts) */}
      <Sfx id="alert" at={4} />
      {[16, 24, 32, T.clockLand].map((f, i) => (
        <Sfx key={`tick-${i}`} id="clock-tick" at={f} gainDb={-4} />
      ))}
      <Sfx id="swish-up" at={T.cardAt + 10} gainDb={-4} />
      <Sfx id="whoosh-short" at={T.whip1} />
      <Sfx id="tick-soft" at={T.mark + 4} gainDb={-2} />
      <Sfx id="type-burst" at={T.typeAt} gainDb={-3} />
      <Sfx id="error-blip" at={T.error} />
      <Sfx id="slip" at={T.slip + 6} gainDb={-3} />
      <Sfx id="whoosh-short" at={T.back + 6} gainDb={-7} />
      <Sfx id="tick" at={T.check + 4} gainDb={-2} />
      <Sfx id="whoosh-short" at={T.whip2} />
      {[0, 4, 9, 13, 18].map((d) => (
        <Sfx key={`q-${d}`} id="type-key" at={T.ask + 2 + d} gainDb={-8} />
      ))}
      {[0, 4, 9, 13, 18, 24, 28].map((d) => (
        <Sfx key={`key-${d}`} id="type-key" at={T.answer + d} gainDb={-7} />
      ))}
      <Sfx id="tick-soft" at={T.source + 2} gainDb={-2} />
    </World>
  );
};

export default A1;
