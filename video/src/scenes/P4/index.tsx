import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { DAY } from "../../brand/tokens";
import { SlipBadge } from "../../components/P1/SlipBadge";
import {
  DIM,
  FRAME,
  frameAtTime,
  modalCovers,
  modalMaskCovers,
  ProductStage,
  WhipIn,
  WhipOut,
  type Cam,
  type Cover,
  type Layer,
} from "../../components/P1/stage";
import { AgentTerminal, terminalHeight, type Row } from "../../components/P3/AgentTerminal";
import { toolOutput } from "../../lib/captures";
import { clamp, EASE } from "../../lib/time";
import { getScene } from "../../lib/timeline";

/**
 * P4 · Review (Day, real). The owner's comment (p4-comment), the review panel and the rename quick fix (p4-review-rec),
 * Propose fix and Drift Reviewer drafting (p4-propose-rec), the draft diff and Accept fix (p4-accept-rec), the snap
 * back to Verified, "Safe to cite." (toolOutput.checkVerified) and the page history (p4-history).
 *
 *   0          the whip from P3 lands on the footer comment Doc Drift Sentinel left for the owner        (V19)
 *   "comment"  punch in on the comment
 *   "and"      cut to the page top (22 frames: the cursor reaches the badge as the real hover pill fades in), the
 *              click on "the review"; a cut straight to the loaded review panel: the state and the why sentence
 *   V20        cut to the rename quick fix ("No AI used."); the cursor clicks Replace on "fix"; on "no" punch
 *              in on "No AI used."; then the panel's confirmation                                          (V20)
 *   V21        the remaining change: the cursor clicks Propose fix on "bigger"; Rovo opens with the button's
 *              own prompt; Drift Reviewer's real steps, then a cut to its "Please review" card on "Drift" (the
 *              take's 3 s of empty panel between them are skipped)                                       (V21)
 *   "edit"     the draft as a diff, "Nothing changes until you accept."; on "Nothing" to the footer; the cursor
 *              clicks Accept fix on "changes" and leaves; "Accepted. A new page version names PR #482." holds
 *              still for 61 frames, to the cut to the page (the proof that a person changed the page; the click
 *              is on "changes", not "accepts", because the snap back after it is fixed on snapBack)
 *   snapBack   the page: the badge, out of line since P2, snaps home and reads Verified (markers.snapBack)  (V22)
 *   "Now"      the coding agent's terminal slides up into the frame's bottom: check-page-freshness → verified,
 *              "Safe to cite."; it stays in place for the cut
 *   end        the page history: "Doc Drift: accepted proposal for PR #482"; the last 4 frames whip out
 *
 * p4-propose-rec's logged clicks are estimates (captures.json says so); the Propose fix click uses the frame where
 * the button shows pressed (9.3 s).
 */
const sc = getScene("P4");

const back = sc.marker("snapBack");
export const P4_T = {
  comment: sc.wordAt("V19", "comment"),
  top: sc.snap(sc.wordAt("V19", "and")),
  badgeClick: sc.wordAt("V19", "review") - 4,
  panel: sc.wordAt("V19", "review") - 2,
  quick: sc.snap(sc.cue("V20")),
  replace: sc.wordAt("V20", "fix"),
  noAi: sc.wordAt("V20", "no"),
  replaced: sc.wordAt("V20", "ai", "to") + 1,
  propose: sc.snap(sc.cue("V21")),
  proposeClick: sc.wordAt("V21", "bigger"),
  rovo: sc.wordAt("V21", "bigger") + 2,
  card: sc.wordAt("V21", "drift") + 4,
  diff: sc.snap(sc.wordAt("V21", "edit") - 4),
  footer: sc.wordAt("V21", "nothing"),
  /** Accept fix: early enough that "Accepted. …" (from accept + 3) is still and alone for 61 frames before the page */
  accept: back - 6 - 66,
  /** the page, 6 frames before the snap: the badge is still out of line, glowing */
  page: back - 6,
  back,
  term: sc.wordAt("V22", "now") - 10,
  cite: sc.wordAt("V22", "cite"),
  /** the page history (V21's version message) as the coda, after "Safe to cite." has been read */
  history: sc.snap(sc.cue("V22", "end") + 26),
  end: sc.durationInFrames,
};
const T = P4_T;
const WHY = T.panel + 26;

// ---- the comment (p4-comment): Comments y 1600, author 1726, text 1797-1845 (x 1584-2884)
const COMMENT_CAM: Cam[] = [
  { frame: 0, x: 2240, y: 1700, s: 0.9, dur: 0 },
  // the comments section whole, heading to "Add a comment" (comment text at 32 px)
  { frame: T.comment - 16, x: 2236, y: 1780, s: 1.06, dur: 16 },
];

// ---- p4-review.mp4: the real hover pill fades in under the byline over 25.70-25.82 s; badge click 26.009 s at
// (2601, 427); panel 30.6 s; quick fix 35.2 s; Replace 38.308 s at (1337, 1577); spinner to 41.0 s, the panel
// scrolls from 41.1 s; "Replaced ... in 1 place." banner from 41.6 s (y 1698-1853). The modal spans x 1120-2720,
// y 122-2039: every framing keeps the dimmed page out of view. Panel (30.6 s): header y 288, why sentence 336-440
// (x 1170-2647), "Agents are told …" 494, tabs 590, What changed 674. Quick fix (35.2 s): heading 1354, sentence
// 1436, "Suggested … No AI used. …" 1512 (x 1194-2378), button 1578, Proposed fix 1702.
const REVIEW_TIME: [number, number][] = [
  [T.top, 25.4],
  // the click and the frame after it stay on the hovered badge (no half-loaded modal, no tooltip yet; the real
  // click is at 26.009 s and the tooltip starts to fade in at 26.05 s)
  [T.badgeClick, 25.94],
  [T.panel - 1, 25.95],
  [T.panel, 30.6],
  [T.quick - 1, 32.0],
  [T.quick, 35.2],
  [T.replace - 1, 38.25],
  [T.replace + 1, 38.45],
  // the spinner, up to the frame before the panel scrolls; then the settled banner
  [T.replaced - 1, 40.95],
  [T.replaced, 41.8],
  [T.propose, 43.0],
];
// the pill fades in over 25.70-25.82 s (the cover's fade spans about 4 frames, so a frame of decoder slack is invisible)
const PILL_IN = frameAtTime(REVIEW_TIME, 25.7);
const PILL_ON = frameAtTime(REVIEW_TIME, 25.82);
/** The suffix cover follows the real hover pill as it fades in (white to the pill's grey, as in the recording). */
const pillFill = (f: number) => {
  const v = Math.round(interpolate(f, [PILL_IN, PILL_ON], [255, 240], clamp));
  return `rgb(${v},${v},${v})`;
};
const REVIEW_CAM: Cam[] = [
  // the page top: the title and the whole byline, the badge on the right (byline at 31 px)
  { frame: T.top, x: 2175, y: 470, s: 1.1, dur: 0 },
  // the panel: state, the why sentence, What changed
  { frame: T.panel, x: 1920, y: 560, s: 1.0, dur: 0 },
  // a gentle push onto the why sentence, its 3 lines whole, the modal's top edge (y 122) just out of view (30 px)
  { frame: WHY, x: 1908, y: 514, s: 1.07, dur: 18 },
  // the quick fix card: the rename, "No AI used.", the button
  { frame: T.quick, x: 1772, y: 1470, s: 1.27, dur: 0 },
  { frame: T.noAi - 14, x: 1640, y: 1520, s: 1.55, dur: 14 },
  // the confirmation banner, the footer, the modal's bottom edge just out of view
  { frame: T.replaced, x: 1800, y: 1700, s: 1.25, dur: 0 },
];
const REVIEW_LAYERS: Layer[] = [
  // page top (byline y 426): the logged boxes cover the byline's "(Development)" and the sidebar's
  {
    id: "p4-review-rec",
    from: T.top,
    to: T.panel,
    time: REVIEW_TIME,
    loggedMasks: false,
    covers: [
      { box: [323, 1901, 206, 42], why: "Development install suffix (logged)" },
      { box: [2672, 408, 176, 37], fill: pillFill, why: "Development install suffix (logged), on the hover pill as it fades in" },
    ],
  },
  // modal open: the sidebar and the byline sit under the backdrop
  { id: "p4-review-rec", from: T.panel, to: T.propose, time: REVIEW_TIME, loggedMasks: false, covers: modalCovers("p4-review-rec") },
];
const REVIEW_CURSOR = [
  { frame: T.top - 2, x: 2900, y: 640 },
  // on the badge as the real hover pill starts to fade in, then the click
  { frame: PILL_IN, x: 2601, y: 427, cursor: "pointer" },
  { frame: T.badgeClick, x: 2601, y: 427, click: true, cursor: "pointer" },
  { frame: T.quick + 8, x: 1900, y: 1700 },
  { frame: T.replace, x: 1337, y: 1577, click: true, cursor: "pointer" },
];

// ---- p4-propose.mp4 (salvaged; its click log is an estimate: Propose fix at (1268, 1742) ~10.1 s). The frames show
// the button hovered from 9.0 s, pressed at 9.3 s and loading from 9.4 s; the modal closes at 10.4 s; Rovo shows the
// sent prompt from about 12 s and Drift Reviewer's steps (Submit fix proposal from 24 s) to 27.0 s; the panel is
// empty but for "is thinking" from 27.5 s; the "Please review" card is up at 30.0 s. The cut skips the empty panel.
const PROPOSE_TIME: [number, number][] = [
  [T.propose, 8.3],
  [T.proposeClick - 1, 9.2],
  [T.proposeClick + 1, 9.4],
  [T.rovo - 1, 9.6],
  [T.rovo, 12.0],
  [T.card - 1, 26.8],
  [T.card, 30.1],
  [T.diff, 31.5],
];
const PROPOSE_CAM: Cam[] = [
  // Propose fix and Track in Jira; the modal's bottom edge (y 2039) just out of view
  { frame: T.propose, x: 1811, y: 1685, s: 1.2, dur: 0 },
  // Rovo: the prompt the button sent, then the thinking steps
  { frame: T.rovo, x: 3200, y: 600, s: 1.25, dur: 0 },
  // a cut to the "Please review" card (at 31 s): Please review y 726, Submit fix proposal 873, Section Heading
  // 1089, Rationale 1233-1330 ("PR #482 renamed ROLLBACK_TIMEOUT to ROLLBACK_TIMEOUT_SECS.")
  { frame: T.card, x: 3200, y: 1010, s: 1.25, dur: 0 },
];
const PROPOSE_COVERS: Cover[] = [
  // modal open (to 10.4 s): the byline's tail beside the modal, the sidebar under the backdrop
  ...modalMaskCovers([2672, 465, 176, 37]).map((c) => ({ ...c, to: T.rovo })),
  { box: [319, 1898, 214, 48], fill: DIM, to: T.rovo, why: "sidebar suffix under the backdrop" },
  // Rovo open (from 10.4 s): page not dimmed
  { box: [323, 1901, 206, 42], fill: "#FFFFFF", from: T.rovo, why: "Development install suffix (logged)" },
  { box: [2233, 465, 176, 37], fill: "#FFFFFF", from: T.rovo, why: "Development install suffix (logged)" },
];
const PROPOSE_LAYERS: Layer[] = [{ id: "p4-propose-rec", from: T.propose, to: T.diff, time: PROPOSE_TIME, loggedMasks: false, covers: PROPOSE_COVERS }];
const PROPOSE_CURSOR = [
  { frame: T.propose + 2, x: 1800, y: 1960 },
  { frame: T.proposeClick, x: 1268, y: 1742, click: true, cursor: "pointer" },
];

// ---- p4-accept.mp4: diffs 10.6 s; Accept fix 12.373 s at (1929, 1894); spinner to 16.45 s; "Accepted." from
// 16.47 s, untouched to 16.83 s (small changes elsewhere from 16.87 s); reload; Verified 22.5 s. Its log lists only
// the sidebar mask; the byline's suffix is covered here (Possibly stale x 2679-2841 before the reload, Verified
// x 2612-2773 after it).
const ACCEPT_TIME: [number, number][] = [
  [T.diff, 10.6],
  [T.accept - 1, 12.3],
  [T.accept + 1, 12.45],
  // the spinner in 2 frames; then ONE frame of the take (16.7 s) for the whole banner hold: fully still
  [T.accept + 3, 16.7],
  [T.page - 1, 16.7],
];
const ACCEPT_CAM: Cam[] = [
  // the second draft: the code diff, its reason, "Nothing changes until you accept."
  { frame: T.diff, x: 1675, y: 1200, s: 1.45, dur: 0 },
  // the footer: Accept fix (then the confirmation); the modal's bottom edge just out of view
  { frame: T.footer - 6, x: 1830, y: 1685, s: 1.2, dur: 16 },
];
const ACCEPT_LAYERS: Layer[] = [
  { id: "p4-accept-rec", from: T.diff, to: T.page, time: ACCEPT_TIME, loggedMasks: false, covers: [...modalCovers("p4-accept-rec"), ...modalMaskCovers([2672, 465, 176, 37])] },
];
const ACCEPT_CURSOR = [
  { frame: T.footer - 4, x: 2300, y: 1500 },
  { frame: T.accept, x: 1929, y: 1894, click: true, cursor: "pointer" },
];

// ---- the snap back, on the page (p4-accept-rec before the badge click, 1.0 s, and after the reload, 22.5 s)
const PS_BOX: [number, number, number, number] = [2354, 459, 320, 49];
const V_BOX: [number, number, number, number] = [2354, 459, 256, 49];
const PAGE_LAYERS: Layer[] = [
  { id: "p4-accept-rec", from: T.page, to: T.back, time: [[0, 1.0]], covers: [{ box: [2672, 462, 180, 43], why: "Development install suffix (not in the log)" }] },
  { id: "p4-accept-rec", from: T.back, time: [[0, 22.5]], covers: [{ box: [2605, 462, 180, 43], why: "Development install suffix (not in the log)" }] },
];
// the byline from "Add a reaction" to the badge (the view count's "2" just out of frame), room to slip right
const PAGE_CAM: Cam[] = [{ frame: T.page, x: 2540, y: 625, s: 1.9, dur: 0 }];

// ---- the page history (p4-history): header y 381-402; rows 450-491, 530-571, 610-651, 690-731; the comments run
// x 1946-2976 ("Doc Drift: accepted proposal for PR #482" twice, then "Doc Drift: renamed scripts/rollback.sh …")
const HISTORY_LAYERS: Layer[] = [{ id: "p4-history", from: T.history }];
const HISTORY_CAM: Cam[] = [
  { frame: T.history, x: 1600, y: 470, s: 0.89, dur: 0 },
  // the Comment column and its three Doc Drift versions at the centre ("Changed By" out of view)
  { frame: T.history + 10, x: 2461, y: 505, s: 1.5, dur: 18 },
];

// ---- "Safe to cite." from toolOutput.checkVerified
type Out = { input: Record<string, string>; output: Record<string, unknown> };
const verified = toolOutput("checkVerified") as Out;
const GUIDE = ['"Payments rollback runbook" is Verified.', "Safe to cite."];
if (String(verified.output.guidance) !== GUIDE.join(" ") || String(verified.output.status) !== "verified") {
  throw new Error("P4: captures.json toolOutput.checkVerified changed; update the terminal rows to the new real output");
}
// Real output, trimmed: omitted keys are marked "…" (real order); the guidance value verbatim under its key.
const ROWS: Row[] = [
  { at: T.term, kind: "tool", text: `doc-drift · check-page-freshness { "pageId": "${verified.input.pageId}" }` },
  { at: T.term + 5, kind: "json", indent: 2, text: `{ …, "status": "${String(verified.output.status)}", …,` },
  { at: T.term + 9, kind: "json", indent: 4, text: `"guidance":` },
  { at: T.term + 12, kind: "str", indent: 6, text: GUIDE[0] },
  { at: T.cite - 6, kind: "str", indent: 6, text: GUIDE[1] },
  { at: T.cite - 4, kind: "json", indent: 2, text: "}" },
];
const TERM_ROWS = 6;
const TERM_H = terminalHeight(TERM_ROWS);

/**
 * The terminal docked into the browser frame's bottom: full frame width, clipped to the frame, so no strip of the
 * page shows below or beside it. It slides up at full opacity and stays in place for the cut to the history.
 */
const Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [T.term - 8, T.term + 4], [0, 1], { ...clamp, easing: EASE.expoOut });
  if (p <= 0 || frame >= T.history) return null;
  return (
    <div style={{ position: "absolute", left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h, borderRadius: 24, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: FRAME.h - TERM_H, transform: `translateY(${(1 - p) * (TERM_H + 8)}px)` }}>
        <AgentTerminal rows={ROWS} width={FRAME.w} viewRows={TERM_ROWS} radius="0 0 24px 24px" shadow={false} highlights={[{ from: T.cite - 2, rows: [4, 4] }]} />
      </div>
    </div>
  );
};

const Stage: React.FC<{ label: string; cam: Cam[]; layers: Layer[]; cursor?: { frame: number; x: number; y: number; click?: boolean; cursor?: string }[]; show?: number; hide?: number; children?: React.ReactNode }> = ({
  label,
  cam,
  layers,
  cursor,
  show,
  hide,
  children,
}) => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <ProductStage label={label} cam={cam} layers={layers} cursor={cursor} cursorShow={show} cursorHide={hide}>
      {children}
    </ProductStage>
  </AbsoluteFill>
);

const CommentShot = () => <Stage label="Confluence" cam={COMMENT_CAM} layers={[{ id: "p4-comment", from: -10000 }]} />;

const P4: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.top)
    shot = (
      <WhipIn>
        <CommentShot />
      </WhipIn>
    );
  else if (frame < T.propose) shot = <Stage label="Confluence" cam={REVIEW_CAM} layers={REVIEW_LAYERS} cursor={REVIEW_CURSOR} show={T.top - 2} hide={T.replace + 8} />;
  else if (frame < T.diff) shot = <Stage label="Confluence" cam={PROPOSE_CAM} layers={PROPOSE_LAYERS} cursor={PROPOSE_CURSOR} show={T.propose + 2} hide={T.proposeClick + 6} />;
  // the cursor fades out from the click (5 frames), so it never sits on the banner that replaces the button
  else if (frame < T.page) shot = <Stage label="Confluence" cam={ACCEPT_CAM} layers={ACCEPT_LAYERS} cursor={ACCEPT_CURSOR} show={T.footer - 4} hide={T.accept} />;
  else if (frame < T.history)
    shot = (
      <Stage label="Confluence" cam={PAGE_CAM} layers={PAGE_LAYERS}>
        <SlipBadge at={T.page - 6} back={T.back} out={{ id: "p4-accept-rec", t: 1.0, box: PS_BOX }} home={{ id: "p4-accept-rec", t: 22.5, box: V_BOX }} />
      </Stage>
    );
  else
    shot = (
      <WhipOut end={T.end}>
        <Stage label="Confluence" cam={HISTORY_CAM} layers={HISTORY_LAYERS} />
      </WhipOut>
    );
  return (
    <World theme="day">
      {shot}
      <Terminal />
      <Sfx id="click" at={T.badgeClick} />
      <Sfx id="click" at={T.replace} gainDb={-2} />
      <Sfx id="tick-soft" at={T.replaced} />
      <Sfx id="click" at={T.proposeClick} />
      <Sfx id="type-burst" at={T.rovo + 2} gainDb={-9} />
      <Sfx id="pop" at={T.card} />
      <Sfx id="click" at={T.accept} />
      <Sfx id="merge" at={T.accept + 3} gainDb={-2} />
      {/* the score has its own hit on snapBack and the voice says "Verified." 3 frames later: the snap sits under them */}
      <Sfx id="snap" at={T.back + 2} gainDb={-4} />
      <Sfx id="type-burst" at={T.term} gainDb={-10} />
      <Sfx id="tick-soft" at={T.history} gainDb={-2} />
      <Sfx id="whoosh-short" at={T.end - 3} />
    </World>
  );
};

export default P4;
