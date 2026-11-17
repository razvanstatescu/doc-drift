import React from "react";
import { useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { ROLLBACK_CMD } from "../../../components/A1/runbook";
import { EASE, tween } from "../../../lib/time";
import { Camera3D, Stage, type Cam3Key } from "../../../v4/kit";
import { NIGHT } from "../../../v4/look";
import { AgentPanelTwin, agentPanelRects, textWidth, type AgentPanelTwinProps } from "../../../v4/twins";
import { PANEL } from "./index";

/**
 * The payoff (V5.md section 8, decision 4; S18 "...with the right step"): back at 3 a.m., the same generic AI assistant,
 * framed exactly as PROBLEM left it (pushed in on the command), now answers with the fixed step 2 and cites the page as
 * verified. The page is fixed and verified, so citing its step is honest. A whole Night shot: render it as the shot.
 *
 *   import { PayoffShot } from "../PROBLEM/Payoff";
 *   <PayoffShot at={cut} markAt={sc.wordAt("S18", "right") - 10} sourceAt={...} />
 *
 * All frames are the caller's local frames. It arrives composed on `at` (the question asked, the answer there; or set
 * `stream` to stream it from `at`), the Current underline crosses the new command from `markAt` (landed within 4 px
 * about 8 frames later), and the source chip "Payments rollback runbook · Verified" lands on `sourceAt`. No amber: the
 * shot's state is the word "Verified". Pure per frame; it holds (with camera creep) for as long as it is rendered.
 */

/** Step 2's command as the fixed page has it (PageTwin's "new" state: the rename and the _SECS setting). */
export const FIXED_CMD = ROLLBACK_CMD.replace("rollback.sh", () => "rollback-v2.sh").replace("$ROLLBACK_TIMEOUT", () => "$ROLLBACK_TIMEOUT_SECS");
export const PAYOFF_SOURCE = "Payments rollback runbook · Verified";

export type PayoffShotProps = {
  /** The cut: the shot's first frame (caller's local frame). */
  at: number;
  /** The underline under the new command starts (default at + 4; it lands about 8 frames later). Put it on "right step". */
  markAt?: number;
  /** The source chip "Payments rollback runbook · Verified" lands (default at + 10). */
  sourceAt?: number;
  /** Stream the answer from `at` (140 characters a second) instead of arriving with it (default false). */
  stream?: boolean;
  /** Its two effects: a soft tick as the underline lands, a soft chime as the source lands (default true). */
  sound?: boolean;
};

export const PayoffShot: React.FC<PayoffShotProps> = ({ at, markAt = at + 4, sourceAt = at + 10, stream = false, sound = true }) => {
  const frame = useCurrentFrame();
  const panel: AgentPanelTwinProps = {
    ...PANEL,
    question: { ...PANEL.question, at: stream ? at : at - 600, prefilled: true },
    answer: { lines: [PANEL.answer.lines[0], FIXED_CMD], at: stream ? at : at - 600, cps: 140 },
    source: { text: PAYOFF_SOURCE, at: sourceAt },
  };
  const R = agentPanelRects(panel);
  const cmd = R.answerLines[R.answerLines.length - 1];
  const code = (panel.size ?? 40) * 0.88;
  const cmdW = textWidth(FIXED_CMD, { size: code, mono: true }) + 2 * 0.28 * code;
  // PROBLEM's last framing: pushed in on the command (1.28x); the creep restarts on the cut
  const pose = { x: 960, y: cmd.y + cmd.h / 2, zoom: 1.28 };
  const keys: Cam3Key[] = [{ at, dur: 0, to: pose }];
  const under = tween(frame, markAt, markAt + 10, 0, 1, EASE.expoOut);
  return (
    <>
      <Stage world="night" motif="tide" light={["50%", "36%"]} tide={{ top: 850, bottom: 1110, count: 7 }}>
        <Camera3D keys={keys} base={pose} seed="p-payoff">
          <AgentPanelTwin {...panel} />
          {frame >= markAt ? (
            <div style={{ position: "absolute", left: cmd.x, top: cmd.y + cmd.h - 6, width: cmdW * under, height: 4, borderRadius: 2, background: NIGHT.link }} />
          ) : null}
        </Camera3D>
      </Stage>
      {sound ? (
        <>
          <Sfx id="tick-soft" at={markAt + 6} gainDb={-8} />
          <Sfx id="chime-soft" at={sourceAt + 2} gainDb={-10} />
        </>
      ) : null}
    </>
  );
};
