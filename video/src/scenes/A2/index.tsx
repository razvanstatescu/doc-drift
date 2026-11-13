import React from "react";
import { AbsoluteFill, Freeze, interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { DAY, FONT } from "../../brand/tokens";
import { NEW_PATH, OLD_PATH } from "../../components/A1/runbook";
import { AGENT_H, AgentCard, ANCHOR_H, AnchorCard, LinePulse } from "../../components/A2/Anchors";
import { BAND_W, BANDS, BandPage, bandSlipPx, CARD, type Box } from "../../components/A2/BandPage";
import { DaySlipReveal } from "../../components/A2/DaySlipReveal";
import { Spine, spineHeight } from "../../components/A2/Spine";
import { AnchorLines } from "../../components/AnchorLines";
import { clamp, EASE } from "../../lib/time";
import { getScene } from "../../lib/timeline";
import { Camera } from "../../motion/camera";
import { Whip } from "../../motion/whip";
import { A1_T, A1AssistantShot } from "../A1";

/**
 * A2 · The solution (Day). Local frames, all from the narration cues in timeline.json:
 *
 *   0-5        the Day slip cut as a reveal: A1's last frame is split into the mark's three bands, the middle band
 *              has slipped and the Paper world is behind it on the first frame (with the score's lift); the bands
 *              clear (top and bottom left, middle right) and the Day world is fully open on frame 6
 *   0          the runbook as three bands, framed close
 *   "anchors"  the camera settles back; hairlines draw from each band to its anchor                     (V07)
 *   "change"   the script anchor rolls to its new path; a pulse runs down its line to the page          (V08)
 *   "flagged"  the matching band slips one unit right in amber, with its trace (the one amber)
 *   "Possibly" the Possibly stale badge sets inside the slipped band
 *   V09 - 1 b  the anchors clear; on "every" two lines run from the badge to two agents; on "told" each answers
 *              status: possibly_stale                                                                     (V09)
 *   V10        cut to the spine, already rising on the cut frame, phrase by phrase on the spoken words    (V10)
 *   end        the first half of a whip: the spine accelerates out left and is still moving on A2's last
 *              frame; P1 whips in from the right on its first frames (the seam is between the scenes)
 */
const sc = getScene("A2");

const anchors = sc.wordAt("V07", "anchors");
const flag = sc.wordAt("V08", "flagged");
const spineAt = sc.snap(sc.cue("V10"));
const p4 = sc.wordAt("V10", "then");
export const A2_T = {
  /** The reveal: the Night bands have fully left on this frame (A2 frame 6, the director's f1063). */
  open: 6,
  pull: anchors - 6,
  heading: anchors,
  lines: [anchors + 6, anchors + 14, anchors + 22],
  change: sc.wordAt("V08", "change"),
  pulse: flag - 18,
  flag,
  state: sc.wordAt("V08", "possibly"),
  clear: sc.snap(sc.cue("V09")) - sc.beat(1),
  agentLines: sc.wordAt("V09", "every"),
  told: sc.wordAt("V09", "told"),
  spine: spineAt,
  // the first phrase starts rising one frame before the cut, so the cut frame is never blank Paper
  phrases: [Math.min(sc.wordAt("V10", "anchor"), spineAt - 1), sc.wordAt("V10", "flag"), sc.wordAt("V10", "tell"), p4],
  // the small line sets in the pause before the last phrase, so it is still for its full reading time before the whip
  small: sc.wordAt("V10", "agents", "to") - 2,
  end: sc.durationInFrames,
};
const T = A2_T;
const LINE_DUR = 18;
const LINE_W = 4;

// ---- the diagram, frame px at zoom 1 (the page fills the title-safe height; the composition is centred) ----
/**
 * The runbook's REAL anchors (captures p1-suggestions-ticked, p2-pr482-files; director's note): the same three P1 and
 * P2 show. PR #482 renamed the script (high) and changed values.yaml (medium); the diagram shows the rename.
 */
const REPO = "payments-api";
const HELM_PATH = "deploy/helm/values.yaml";
const JIRA_KEY = "PAY-6";
/** Left edge of the anchor column: the widest card (values.yaml, 23 mono characters at 44 px) ends inside x 1728. */
const ANCHOR_X = 1064;
const centerY = (b: Box) => b.y + b.h / 2;
/** Anchor cards in band order: helm values (top), the script (middle), the Jira issue (bottom). */
const anchorBox = (i: number): Box => ({ x: ANCHOR_X, y: centerY(BANDS[i]) - ANCHOR_H / 2, w: 0, h: ANCHOR_H });
const AGENT_W = 660;
const agentBox = (dy: number): Box => ({ x: ANCHOR_X, y: centerY(BANDS[1]) + dy - AGENT_H / 2, w: AGENT_W, h: AGENT_H });
const AGENT_A = agentBox(-190);
const AGENT_B = agentBox(190);
const CARD_CX = CARD.x + CARD.w / 2;

const Diagram: React.FC = () => {
  const frame = useCurrentFrame();
  const slip = bandSlipPx(frame, T.flag);
  const mid: Box = { ...BANDS[1], x: BANDS[1].x + slip };
  const anchorsOut = interpolate(frame, [T.clear, T.clear + 8], [0, 1], { ...clamp, easing: EASE.expoIn });
  const cardAt = (i: number) => T.lines[i] + 12;
  const at = (i: number): React.CSSProperties => ({ position: "absolute", left: anchorBox(i).x, top: anchorBox(i).y });
  return (
    <Camera keys={[{ frame: T.pull, x: 960, y: 540, zoom: 1, dur: 26, ease: EASE.quintOut }]} base={{ x: CARD_CX, y: 540, zoom: 1.1 }} clamp={false}>
      <BandPage slipAt={T.flag} stateAt={T.state} />
      {anchorsOut < 1 ? (
        <AbsoluteFill style={{ opacity: 1 - anchorsOut, transform: `translateX(${anchorsOut * 24}px)` }}>
          <AnchorLines at={T.lines[0]} dur={LINE_DUR} width={LINE_W} from={BANDS[0]} to={[anchorBox(0)]} />
          <AnchorLines at={T.lines[1]} dur={LINE_DUR} width={LINE_W} from={mid} to={[anchorBox(1)]} />
          <AnchorLines at={T.lines[2]} dur={LINE_DUR} width={LINE_W} from={BANDS[2]} to={[anchorBox(2)]} />
          <LinePulse x1={ANCHOR_X} x2={mid.x + BAND_W} y={centerY(BANDS[1])} at={T.pulse} dur={18} />
          <Heading at={T.heading} />
          <AnchorCard at={cardAt(0)} path={HELM_PATH} sub={{ text: REPO, mono: true }} style={at(0)} />
          <AnchorCard at={cardAt(1)} path={OLD_PATH} sub={{ text: REPO, mono: true }} swap={{ to: NEW_PATH, at: T.change }} style={at(1)} />
          <AnchorCard at={cardAt(2)} path={JIRA_KEY} sub={{ text: "Jira issue", icon: "ticket" }} style={at(2)} />
        </AbsoluteFill>
      ) : null}
      {frame >= T.agentLines ? (
        <>
          <AnchorLines at={T.agentLines} dur={LINE_DUR} stagger={8} width={LINE_W} from={mid} to={[AGENT_A, AGENT_B]} />
          <AgentCard
            icon="words"
            label="Drift Reviewer · Rovo"
            at={T.agentLines + 12}
            answerAt={T.told}
            style={{ position: "absolute", left: AGENT_A.x, top: AGENT_A.y, width: AGENT_W, height: AGENT_H }}
          />
          <AgentCard
            icon="terminal"
            label="Coding agent · MCP"
            at={T.agentLines + 20}
            answerAt={T.told + 4}
            style={{ position: "absolute", left: AGENT_B.x, top: AGENT_B.y, width: AGENT_W, height: AGENT_H }}
          />
        </>
      ) : null}
    </Camera>
  );
};

const Heading: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  return (
    <div
      style={{
        position: "absolute",
        left: ANCHOR_X,
        top: anchorBox(0).y - 76,
        fontFamily: FONT.sans,
        fontWeight: 500,
        fontSize: 44,
        lineHeight: "52px",
        color: DAY.textMuted,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      Anchors
    </div>
  );
};

const SPINE_H = spineHeight(4);
const SpineStage: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <Spine
      x={403}
      y={Math.round((1080 - SPINE_H) / 2)}
      rows={[
        { icon: "anchor", text: "Anchor.", at: T.phrases[0] },
        { icon: "slip", text: "Flag.", at: T.phrases[1], amber: true },
        { icon: "words", text: "Tell the agents.", at: T.phrases[2] },
        { icon: "check", text: "Then a person decides.", at: T.phrases[3] },
      ]}
      small={{ text: "For teams who keep runbooks in Confluence", at: T.small }}
    />
  </AbsoluteFill>
);

/** A1's last frame, frozen, on its Night ground: the picture the reveal splits apart. */
const A1LastFrame: React.FC = () => (
  <Freeze frame={A1_T.end - 1}>
    <World theme="night">
      <A1AssistantShot />
    </World>
  </Freeze>
);

const A2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <World theme="day">
      {frame < T.spine ? (
        <>
          <Diagram />
          {frame < T.open ? (
            <DaySlipReveal f={frame} open={T.open}>
              <A1LastFrame />
            </DaySlipReveal>
          ) : null}
        </>
      ) : (
        // the first half of the whip to P1: the seam (its fastest frame) is P1's first frame
        <Whip at={T.end} dur={8} from={<SpineStage />} to={<AbsoluteFill style={{ background: DAY.ground }} />} />
      )}
      {/* sound: the slip and the score's lift on frame 0 are film-level (src/transitions.ts) */}
      {T.lines.map((l, i) => (
        <Sfx key={`tick-${i}`} id="tick" at={l + 14} gainDb={-3} />
      ))}
      <Sfx id="tick-soft" at={T.change + 4} />
      {/* the latch lands with the band: the kit's 6-frame expo-out is home (90%) two frames in */}
      <Sfx id="slip" at={T.flag + 2} />
      <Sfx id="pop" at={T.agentLines + 13} />
      <Sfx id="pop" at={T.agentLines + 21} />
      {T.phrases.map((p, i) => (
        <Sfx key={`ph-${i}`} id="tick" at={Math.max(p, T.spine) + 2} gainDb={-3} />
      ))}
      {/* the whoosh peaks 3 frames before the seam, in the outgoing scene (the product scenes' convention) */}
      <Sfx id="whoosh-short" at={T.end - 3} />
    </World>
  );
};

export default A2;
