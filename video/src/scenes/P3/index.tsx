import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import type { Box } from "../../lib/captures";
import { EASE, tween } from "../../lib/time";
import {
  cam3At,
  Camera3D,
  DAY,
  FONT,
  KineticLine,
  lineCues,
  MorphToReal,
  Press,
  ProofFrame,
  proofRect,
  RebuildFromReal,
  SignalLine,
  Stage,
  WhipBlur,
  type Cam3Key,
  type Rect,
  type TideProps,
} from "../../v4/kit";
import {
  AgentPanelTwin,
  agentPanelRects,
  jsonLines,
  layoutRuns,
  PageTwin,
  pageRects,
  TerminalTwin,
  terminalSize,
  textWidth,
  type AgentPanelTwinProps,
  type PageTwinProps,
  type TerminalCall,
  type TerminalTwinProps,
} from "../../v4/twins";
import { AmberToken } from "../../components/P3/AmberToken";
import { GhostStep } from "../../components/P3/GhostStep";
import { CountChip, PageCard, PathLink } from "../../components/P3/PageFan";
import {
  ANSWER_LINES,
  ANSWER_TITLE,
  CHECK,
  DO_NOT_PRESENT,
  FIND,
  MCP_TAG,
  OLD_STEP,
  PAGES_PHRASE,
  QA_IDS,
  QUESTION,
  READ_AS_YOU,
  RUNBOOK_ROW,
  STEPS,
} from "../../components/P3/p3data";
import { CAP, inProof, toScreen } from "./geom";
import { sc, T } from "./timing";

/**
 * P3 · Agents (film 2617 to 3277, R3 V16 to V18). Day, tide lines. Two worlds joined by a whip (T9). Round 2 (QA
 * review G-1 to G-9): one focal statement per line in the empty side, one decisive push per line on its key word,
 * nothing arrives empty, no edge cuts. Cue table and proof log: README.md in this folder.
 *
 *   ROVO (0 .. whip)
 *   0         opens composed and moving under the kit's whip from P2: the runbook twin low on the left (its byline
 *             item "Possibly stale · Doc Drift" is the amber)
 *   "Ask"     "Ask Drift Reviewer." (130 px) sets top left; the Drift Reviewer panel slides in on the right (V16)
 *   R10       on the beat inside "Reviewer": the real welcome grows out of the twin's heading, 45 f
 *   "roll"    the line's push: into the panel as the question types; R11 shows the real steps
 *   then      a signal from "Invoking tool: Check page freshness" to the byline item and back
 *   V17       the page leaves left; push into the answer slot; A1's old step appears whole and dimmed, slips one unit
 *             right in amber on "old" and falls away on "step"; "It says why." (left) sets on its words
 *   "says"    the real answer streams in (v2, D38 wording, verbatim), "Possibly stale" on its amber block; R12 grows
 *             out of the first line, cropped between blocks, pushes to 1.0 on "Possibly stale"
 *   "why"     the line's push: onto the reason, "What it describes changed in PR #482 ..."
 *   "Coding"  whip to the terminal
 *
 *   TERMINAL (whip .. end)
 *   V18       the MCP slab (35% of the frame) arrives with find-docs-for-path typed; the pages array streams (the
 *             runbook's row in full, url elided, the QA pages collapsed); its status lands on an amber block on
 *             "same"; the line's push onto it on "signal", back out after "MCP"; "Agents read as you. They never edit
 *             a page." sets above; on "which pages cover a file" the path is underlined and a connector runs to the
 *             runbook's card, tucked under the slab's edge, with "3 pages document this path" (the tool's words);
 *             on "and which to trust" the screen clears, check-page-freshness returns "status": "possibly_stale" on
 *             its amber block (the one amber), and "Do not present steps from this page as current." rises beside
 *             the slab as the line's focal statement, landing on "trust" and holding to the end.
 *   end       the final pose; the kit's downward whip carries it into P4.
 */

// ---------------------------------------------------------------------------------------------------------------------
// The Rovo world (stage px)
// ---------------------------------------------------------------------------------------------------------------------

const PAGE: PageTwinProps = {
  world: "day",
  doc: "runbook",
  // low on the left: its head (title, the amber byline item, the table) under the V16 statement
  x: 40,
  y: 430,
  k: 1.6,
  byline: { kind: "dds", state: "possibly_stale" },
  // the band slipped in P2 and stays out of line, neutral; the byline item carries the amber (R3 section 3)
  slip: { at: -60, amber: false },
  step2: "old",
};
const PR = pageRects(PAGE);

/** The Drift Reviewer panel twin: 780 wide, so its answer breaks lines exactly where the real panel does. */
const PANEL = { x: 1110, y: 70, w: 780 };
const ANSWER_PARAS = [
  ANSWER_LINES[0].replace(ANSWER_TITLE, "{source}"),
  `${ANSWER_LINES[1]} ${ANSWER_LINES[2]} ${ANSWER_LINES[3]}`,
];
const PANEL_PROPS: AgentPanelTwinProps = {
  world: "day",
  variant: "drift-reviewer",
  x: PANEL.x,
  y: PANEL.y,
  width: PANEL.w,
  // content-sized (the default): the card is its header when it lands and grows as the conversation arrives
  question: { text: QUESTION, at: T.typeAt, typeDur: T.typeDur },
  source: { text: ANSWER_TITLE, at: T.send + 6 },
  steps: [
    { text: STEPS[0], at: T.step1 },
    { text: STEPS[1], at: T.step2 },
    { text: STEPS[2], at: T.step3 },
  ],
  answer: { lines: ANSWER_PARAS, at: T.answerAt, cps: 240 },
};
/**
 * The panel's element rects from the twin itself (agentPanelRects), narrowed to INK boxes (text start to end, glyph
 * height) so a morph maps like for like and a capture never starts above 1 film px per capture px.
 */
const PR_PANEL = agentPanelRects(PANEL_PROPS);
const PANEL_R = {
  heading: { x: PR_PANEL.avatar.x, y: PR_PANEL.avatar.y, w: 48 + 16 + textWidth("Drift Reviewer", { size: 30, weight: 600, tracking: -0.01 }), h: 48 } as Rect,
  step: (i: number): Rect => {
    const r = PR_PANEL.steps[i];
    return { x: r.x + 28 + 14, y: r.y + 7, w: textWidth(STEPS[i], { size: 26 }), h: 26 };
  },
  stepIcon: (i: number): Rect => ({ x: PR_PANEL.steps[i].x, y: PR_PANEL.steps[i].y + 6, w: 28, h: 28 }),
  /** The answer's first line once the steps have folded: 30 px glyphs in a 46 px line. */
  answer1: { x: PR_PANEL.answerLines[0].x, y: PR_PANEL.answerLines[0].y + 8, w: PR_PANEL.answerLines[0].w, h: 30 } as Rect,
  answerTop: PR_PANEL.answer.y,
  prLine: PR_PANEL.answerLines[1],
  /** The answer slot before the fold, under the steps (where A1's old step appears). */
  slotTop: PR_PANEL.ghost.y + PR_PANEL.fold,
};

/** "Possibly stale" in the answer's first line, laid out exactly as the twin lays it (its own layoutRuns). */
const POSSIBLY = (() => {
  const chipExtra = 30 * 0.82 + 10 + 2 * 12;
  const lines = layoutRuns(
    [
      { t: ANSWER_TITLE, chip: true, extraW: chipExtra },
      { t: " is Possibly stale." },
    ],
    PANEL.w - 2 * 34,
    { size: 30, codeSize: 30 * 0.88 },
  );
  const runs = lines[0].runs;
  const a = runs.find((r) => r.t === "Possibly");
  const b = runs.find((r) => r.t.startsWith("stale"));
  if (!a || !b) throw new Error("P3: the answer's first line no longer reads '... is Possibly stale.'");
  return { x: PR_PANEL.answerLines[0].x + a.x, y: PR_PANEL.answerLines[0].y, w: b.x + textWidth("stale", { size: 30 }) - a.x };
})();

const ROVO_OPTS = { base: { x: 800, y: 540, zoom: 0.95 }, seed: "p3-rovo" };
const SLOT_C = { x: 1580, y: PANEL_R.slotTop - 20 };
const ROVO_KEYS: Cam3Key[] = [
  // the whip from P2 lands: the content is still sliding left and settles
  { at: 0, dur: 22, to: { x: 960, y: 540, zoom: 0.97 } },
  // a slow drift toward the panel while it lands and R10 is up
  { at: 30, dur: 56, to: { x: 985, y: 530, zoom: 0.99 }, ease: EASE.standard },
  // V16's push, landing on "roll": into the panel as the question types (the page's byline item leaves the frame
  // whole). 1.25, so the twin's steps match R11's capture size when it grows out of them.
  { at: T.push16, dur: 10, to: { x: 1500, y: 330, zoom: 1.25 } },
  // pull back to page and panel for the signal (it follows the pulse to the left)
  { at: T.sigOut - 6, dur: 22, to: { x: 985, y: 560, zoom: 0.95 } },
  // V17: into the answer slot as the page leaves
  { at: T.sigHome - 8, dur: 20, to: { x: SLOT_C.x, y: SLOT_C.y, zoom: 1.12 } },
  // the steps fold away and the answer starts: follow it up
  { at: T.answerAt - 6, dur: 14, to: { y: PANEL_R.answerTop + 110, zoom: 1.06 } },
  // ease back before R12, so the twin's first line is the capture's size when the proof grows out of it (P2)
  { at: T.r12 - 14, dur: 16, to: { x: 1560, y: PANEL_R.answerTop + 118, zoom: 0.94 } },
  // V17's push, landing on "why": onto the reason
  { at: T.pushWhy, dur: 7, to: { x: 1520, y: PANEL_R.prLine.y + 24, zoom: 1.32 } },
  // accelerate into the whip (content travels left)
  { at: T.whip - 8, dur: 8, to: { x: 1520 + 260 }, ease: EASE.expoIn },
];
const rovoCam = (f: number) => cam3At(f, ROVO_KEYS, ROVO_OPTS);

const TIDE: TideProps = {
  top: 840,
  bottom: 1130,
  count: 7,
  wavelength: 620,
  amplitude: 18,
  opacity: 0.22,
  composite: true,
  mask: "linear-gradient(90deg, transparent 0%, #000 18%, #000 82%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 45%)",
};

// The signal: from "Invoking tool: Check page freshness" to the page's byline item, and back.
const STEP3 = PANEL_R.stepIcon(2);
const STEP_PT: [number, number] = [STEP3.x - 10, STEP3.y + STEP3.h / 2];
// the lit byline item sits one slip unit right of its home rect
const BADGE_PT: [number, number] = [PR.badgeSlipped.x + PR.badgeSlipped.w + 22, PR.badgeSlipped.y + PR.badgeSlipped.h / 2];
const SIG_GO = `M ${STEP_PT[0]} ${STEP_PT[1]} C ${STEP_PT[0] - 240} ${STEP_PT[1]}, ${BADGE_PT[0] + 240} ${BADGE_PT[1]}, ${BADGE_PT[0]} ${BADGE_PT[1]}`;
const SIG_BACK = `M ${BADGE_PT[0]} ${BADGE_PT[1]} C ${BADGE_PT[0] + 240} ${BADGE_PT[1]}, ${STEP_PT[0] - 240} ${STEP_PT[1]}, ${STEP_PT[0]} ${STEP_PT[1]}`;

/** A1's old step appears in the answer slot (before the steps fold). */
const GHOST_FONT = 24;
const GHOST = { x: PANEL_R.answer1.x - 6, y: PANEL_R.slotTop - 4 };

const RovoWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = 1 - tween(frame, T.panelIn, T.panelLand + 4, 0, 1, EASE.expoOut);
  // the page leaves by moving once the signal is home (M3), so V17 has the empty side for its statement
  const leave = tween(frame, T.sigHome - 6, T.sigHome + 8, 0, 1, EASE.expoIn);
  const sigFade = 1 - tween(frame, T.sigHome + 2, T.sigHome + 14, 0, 1, EASE.standard);
  return (
    <Camera3D keys={ROVO_KEYS} {...ROVO_OPTS}>
      {leave < 1 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: leave > 0 ? `translateX(${-1300 * leave}px)` : undefined }}>
          <PageTwin {...PAGE} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: slide > 0.0005 ? `translateX(${slide * 900}px)` : undefined }}>
        <AgentPanelTwin {...PANEL_PROPS} />
        {/* the drift words of the answer on their amber block (the shot's one amber once the old step has gone) */}
        {frame >= T.answerAmber ? (
          <div style={{ position: "absolute", left: POSSIBLY.x, top: POSSIBLY.y, height: 46, display: "flex", alignItems: "center" }}>
            <AmberToken at={T.answerAmber} font={{ fontFamily: FONT.sans, fontSize: 30, fontWeight: 400 }}>
              Possibly stale
            </AmberToken>
          </div>
        ) : null}
      </div>
      {frame >= T.sigOut && sigFade > 0 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: sigFade < 1 ? sigFade : undefined }}>
          <SignalLine d={SIG_GO} at={T.sigOut} dur={T.sigHit - T.sigOut} />
          <SignalLine d={SIG_BACK} at={T.sigBack} dur={T.sigHome - T.sigBack} trail={false} />
        </div>
      ) : null}
      <Press at={T.sigHit} x={BADGE_PT[0]} y={BADGE_PT[1]} radius={38} />
      <GhostStep text={OLD_STEP} x={GHOST.x} y={GHOST.y} fontSize={GHOST_FONT} at={T.ghostAt} slipAt={T.slipAt} fallAt={T.fallAt} />
    </Camera3D>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The Rovo proofs (screen px). Each is placed so its element lands on the twin's element on screen, so the real
// screen grows out of the twin with little travel (T3); each starts on a beat, every crop edge sits in whitespace
// (QA G-7, K-2), and no capture ever shows above 1 film px per capture px.
// ---------------------------------------------------------------------------------------------------------------------

const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Place a proof so the capture element `el` sits on the screen rect `target` (clamped into the frame). */
function placeProof(crop: Box, scale: number, el: [number, number, number, number], target: Rect) {
  const { outer } = proofRect({ crop, scale, x: 0, y: 0 });
  const e = inProof(el, crop, scale, 0, 0);
  const x = clampTo(target.x + target.w / 2 - (e.x + e.w / 2), 40, 1920 - 40 - outer.w);
  const y = clampTo(target.y + target.h / 2 - (e.y + e.h / 2), 80, 1080 - 40 - outer.h);
  return { x: Math.round(x), y: Math.round(y) };
}
/** The mat, its tag (37 px above it) and its float shadow: where a morph's clip grows to and a rebuild's wipe runs. */
const proofFrame = (outer: Rect): Rect => ({ x: outer.x - 90, y: outer.y - 70, w: outer.w + 180, h: outer.h + 240 });

const TAG = "Recorded in Rovo";

// R10 · p3-rovo-v2-agent: the welcome (heading, description, starters)
const R10_CROP: Box = [2990, 1060, 840, 590];
const R10_SCALE = 0.9;
const R10_POS = placeProof(R10_CROP, R10_SCALE, CAP.agentHeading, toScreen(rovoCam(T.r10), PANEL_R.heading));
const R10_OUTER = proofRect({ crop: R10_CROP, scale: R10_SCALE, ...R10_POS }).outer;
const R10_EL = inProof(CAP.agentHeading, R10_CROP, R10_SCALE, R10_POS.x, R10_POS.y);

// R11 · p3-rovo-v2-rec 23.5 -> 24.5 s: the question, Referencing, Drift Reviewer is thinking, the steps (the third
// appears at 23.87 s); matched on the first step's text, at 1.0 to meet the pushed-in twin at its size
const R11_CROP: Box = [2990, 220, 840, 580];
const R11_SCALE = 1;
const R11_VIDEO = { from: 23.5, to: 24.5 };
const CAP_STEP1: [number, number, number, number] = [3076, 556, 3611, 588];
const R11_POS = placeProof(R11_CROP, R11_SCALE, CAP_STEP1, toScreen(rovoCam(T.r11), PANEL_R.step(0)));
const R11_OUTER = proofRect({ crop: R11_CROP, scale: R11_SCALE, ...R11_POS }).outer;
const R11_EL = inProof(CAP_STEP1, R11_CROP, R11_SCALE, R11_POS.x, R11_POS.y);

// R12 · p3-rovo-v2-answer: Referencing, the answer and its feedback row, cropped in the whitespace between blocks
// (the question bubble ends at 340, Referencing starts at 388; the icons end at 952, the suggestions start at 1040;
// the content spans x 3036 to 3807). Lands at 0.95 and pushes to 1.0 on "Possibly stale"; the image keeps one size.
const R12_W = 798;
const R12_H = 630;
const R12_TOP = 350;
function r12View(f: number): { crop: Box; scale: number } {
  const p = tween(f, T.r12 + 10, T.possibly + 16, 0, 1, EASE.expoOut);
  const s = 0.95 + 0.05 * p;
  const w = R12_W / s;
  const h = R12_H / s;
  return { crop: [3420 - w / 2, R12_TOP, w, h], scale: s };
}
const R12_V0 = r12View(T.r12);
const R12_POS = placeProof(R12_V0.crop, R12_V0.scale, CAP.answerLine1, toScreen(rovoCam(T.r12), PANEL_R.answer1));
const R12_OUTER = proofRect({ ...R12_V0, ...R12_POS }).outer;
const R12_EL = inProof(CAP.answerLine1, R12_V0.crop, R12_V0.scale, R12_POS.x, R12_POS.y);

const R10Proof: React.FC = () => <ProofFrame capture="p3-rovo-v2-agent" crop={R10_CROP} scale={R10_SCALE} {...R10_POS} at={T.r10} enter="none" exit="none" tag={TAG} />;
const R11Proof: React.FC = () => (
  <ProofFrame capture="p3-rovo-v2-rec" crop={R11_CROP} scale={R11_SCALE} {...R11_POS} at={T.r11} video={R11_VIDEO} enter="none" exit="none" tag={TAG} />
);
const R12Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const v = r12View(frame);
  return <ProofFrame capture="p3-rovo-v2-answer" crop={v.crop} scale={v.scale} {...R12_POS} at={T.r12} enter="none" exit="none" creep={0} tag={TAG} />;
};

type ProofPhase = { at: number; out: number; twinEl: (f: number) => Rect; proofEl: Rect; outer: Rect; node: React.ReactNode };

/**
 * A proof never sits frozen (M1): its mat drifts slowly sideways (0.6 px a frame) with a 3 px sway while it is up. The
 * capture stays at its scale (never above 1 film px per capture px), only its place moves. The twin under it is
 * blurred and dimmed by the kit, so this drift is what keeps the frame alive during a proof.
 */
const PROOF_DRIFT = { vx: 0.6, amp: 3 };
const driftAt = (frame: number, at: number) => {
  const t = Math.max(0, frame - at);
  return { dx: t * PROOF_DRIFT.vx, dy: Math.sin(t / 14) * PROOF_DRIFT.amp };
};
const shift = (r: Rect, d: { dx: number; dy: number }): Rect => ({ ...r, x: r.x + d.dx, y: r.y + d.dy });
const Drifting: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const d = driftAt(frame, at);
  return <AbsoluteFill style={{ transform: `translate(${d.dx}px, ${d.dy}px)` }}>{children}</AbsoluteFill>;
};

/** V16's focal statement (top left, over the sweep), and V17's (left, beside the panel). Screen space: they hold
 * still while the world moves under them, and they stay crisp while a proof dims the twin. */
const STMT16_CUES = lineCues(sc.line("V16"), "Ask Drift\nReviewer.");
const STMT17_CUES = T.stmt17.map((from) => ({ from }));

const RovoShot: React.FC = () => {
  const frame = useCurrentFrame();
  const world = <RovoWorld />;
  const phases: ProofPhase[] = [
    { at: T.r10, out: T.r10Out, twinEl: (f) => toScreen(rovoCam(f), PANEL_R.heading), proofEl: R10_EL, outer: R10_OUTER, node: <R10Proof /> },
    { at: T.r11, out: T.r11Out, twinEl: (f) => toScreen(rovoCam(f), PANEL_R.step(0)), proofEl: R11_EL, outer: R11_OUTER, node: <R11Proof /> },
    { at: T.r12, out: T.r12Out, twinEl: (f) => toScreen(rovoCam(f), PANEL_R.answer1), proofEl: R12_EL, outer: R12_OUTER, node: <R12Proof /> },
  ];
  let body: React.ReactNode = world;
  for (const p of phases) {
    const node = <Drifting at={p.at}>{p.node}</Drifting>;
    if (frame >= p.at && frame < p.out) {
      body = <MorphToReal at={p.at} fromRect={p.twinEl(p.at)} toRect={p.proofEl} twin={world} proof={node} frameRect={proofFrame(p.outer)} />;
    } else if (frame >= p.out && frame < p.out + 8) {
      const d = driftAt(p.out, p.at);
      body = (
        <RebuildFromReal at={p.out} dur={4} fromRect={shift(p.proofEl, d)} toRect={p.twinEl(p.out)} twin={world} proof={node} frameRect={shift(proofFrame(p.outer), d)} />
      );
    }
  }
  return (
    <Stage world="day" motif="tide" tide={TIDE} light={["58%", "30%"]}>
      {body}
      <div style={{ position: "absolute", left: 92, top: 84 }}>
        <KineticLine text={"Ask Drift\nReviewer."} at={T.ask} words={STMT16_CUES} size={130} lineHeight={136} exit={{ at: T.stmt16Out, stagger: 1, dur: 4 }} />
      </div>
      <div style={{ position: "absolute", left: 60, top: 318 }}>
        <KineticLine text={"It says\nwhy."} at={T.stmt17[0]} words={STMT17_CUES} size={116} lineHeight={124} />
      </div>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The terminal world (stage px)
// ---------------------------------------------------------------------------------------------------------------------

const json1 = (o: Record<string, string>) => `{${Object.entries(o).map(([k, v]) => `"${k}": "${v}"`).join(", ")}}`;
const CALLS: TerminalCall[] = [
  {
    cmd: `find-docs-for-path ${json1(FIND.input)}`,
    // the slab arrives with the command in place (QA G-1)
    at: T.cmd1,
    typeFrames: 0,
    output: "findDocsFlaggedV2",
    // the QA pages in the test space are collapsed (never named on screen), the url is elided; "…" lines stand for
    // the omitted top-level keys (ok, repo, and the guidance, which names the QA pages)
    collapse: [...QA_IDS, "pages.1.url"],
    only: ["path", "pages"],
    focus: RUNBOOK_ROW.pageId,
    streamAt: T.out1,
  },
  {
    cmd: `check-page-freshness ${json1(CHECK.input)}`,
    at: T.cmd2,
    typeFrames: 6,
    clear: true,
    output: "checkFlaggedV2",
    // the status and the guidance; "…" lines stand for the rest (the title is in the guidance)
    only: ["status", "guidance"],
    focus: "status",
    streamAt: T.stream2,
  },
];

/** The slab: Spline Sans Mono 30 px, 1000 wide, capped at 35% of the frame (G-1): 12 rows. */
const TERM_PROPS: TerminalTwinProps = {
  title: "Coding agent · MCP",
  calls: CALLS,
  x: 80,
  y: 250,
  width: 1000,
  fontSize: 30,
  tag: MCP_TAG,
  tagSize: 28,
  enter: { at: T.cmd1, dur: 12 },
};
const TS = terminalSize(TERM_PROPS);
const TX = TERM_PROPS.x!;
const TY = TERM_PROPS.y!;
const ADV = (0.6 - 0.01) * TERM_PROPS.fontSize!;
/** Top of body row r (after the 66 px title bar, its 1.5 px divider and 26 px of padding). */
const rowTop = (r: number) => TY + 66 + 1.5 + 26 + r * TS.lh;

/** Command rows of a call (the prompt and the command, wrapped at the slab's columns). */
const cmdRows = (cmd: string) => Math.ceil((cmd.length + 2) / TS.cols);
/** Each call's output lines and its focus token (line index, column, text), from the twin's own JSON layout. */
const CALL_LINES = CALLS.map((c) => {
  const lines = jsonLines((FIND.tool === c.cmd.split(" ")[0] ? FIND : CHECK).output, { collapse: c.collapse, only: c.only, focus: c.focus, cols: TS.cols });
  const fi = lines.findIndex((l) => l.toks.some((t) => t.c === "focus"));
  const l = lines[fi];
  let col = l.indent * 2;
  for (const t of l.toks) {
    if (t.c === "focus") break;
    col += t.t.length;
  }
  return { lines, focus: { index: fi, col, text: l.toks.find((t) => t.c === "focus")!.t } };
});

/** The screen row of a call's focus token at a frame (the view follows the newest line, by whole rows). */
function focusRow(ci: number, frame: number) {
  const c = CALLS[ci];
  const lps = c.lps ?? 45;
  const body = CALL_LINES[ci].lines.length;
  let shownBody = 0;
  for (let i = 0; i < body; i++) if (frame >= (c.streamAt ?? 0) + Math.floor((i / lps) * 30)) shownBody = i + 1;
  const head = cmdRows(c.cmd);
  const scroll = Math.max(0, head + shownBody - TS.rows);
  return head + CALL_LINES[ci].focus.index - scroll;
}
/** The frame a call's focus line appears. */
const focusAt = (ci: number) => (CALLS[ci].streamAt ?? 0) + Math.floor((CALL_LINES[ci].focus.index / (CALLS[ci].lps ?? 45)) * 30);

/** The status value of a call on its amber block, drawn over the twin's own token (same font, same place). */
const TermAmber: React.FC<{ ci: number; until?: number }> = ({ ci, until }) => {
  const frame = useCurrentFrame();
  const at = focusAt(ci);
  if (frame < at || (until !== undefined && frame >= until)) return null;
  const f = CALL_LINES[ci].focus;
  return (
    <div style={{ position: "absolute", left: TX + 34 + f.col * ADV, top: rowTop(focusRow(ci, frame)), height: TS.lh, display: "flex", alignItems: "center" }}>
      <AmberToken at={at} font={{ fontFamily: FONT.mono, fontSize: TERM_PROPS.fontSize, letterSpacing: "-0.01em" }}>
        {f.text}
      </AmberToken>
    </div>
  );
};

/**
 * The find-docs screen once streamed: the command rows and the output scrolled in a 12-row view. The runbook's
 * "anchor" row holds the path, scripts/rollback.sh, after a 3-level indent, `"anchor": ` and `"payments-api: `.
 */
const FIND_LINES = CALL_LINES[0].lines;
const ANCHOR_I = FIND_LINES.findIndex((l) => l.toks.some((t) => t.t.includes("payments-api: scripts/rollback.sh")));
const FIND_SCROLL = Math.max(0, cmdRows(CALLS[0].cmd) + FIND_LINES.length - TS.rows);
const ANCHOR_ROW = cmdRows(CALLS[0].cmd) + ANCHOR_I - FIND_SCROLL;
const PATH_COL = FIND_LINES[ANCHOR_I].indent * 2 + `"anchor": "payments-api: `.length;
const PATH_X0 = TX + 34 + PATH_COL * ADV;
const PATH_X1 = PATH_X0 + "scripts/rollback.sh".length * ADV;
const PATH_Y = rowTop(ANCHOR_ROW) + TS.lh - 8;

/** The page it answers: the runbook's card, its left edge tucked under the slab's right edge. */
const CARD: Rect = { x: TX + TS.width - 40, y: 96, w: 560, h: 236 };
const CARD_NODE: [number, number] = [CARD.x + 150, CARD.y + CARD.h];
/** V18's focal statement, beside the slab. */
const CLAUSE = { x: TX + TS.width + 44, y: 452, size: 96 };

const TERM_OPTS = { base: { x: 720, y: 560, zoom: 0.98, yaw: -6 }, seed: "p3-term" };
const STATUS_C = { x: TX + 34 + CALL_LINES[0].focus.col * ADV + 160, y: rowTop(focusRow(0, T.out1 + 40)) + TS.lh / 2 };
const TERM_KEYS: Cam3Key[] = [
  // the whip lands: the content still travels left and turns square (M2: tilt only while travelling)
  { at: T.whip - 4, dur: 22, to: { x: 960, y: 540, zoom: 1, yaw: 0 } },
  // V18's push, landing on "signal": onto the runbook row's status
  { at: T.push18, dur: 10, to: { x: STATUS_C.x + 60, y: STATUS_C.y, zoom: 1.28 } },
  // back out after "MCP" for the pages
  { at: T.pull18, dur: 18, to: { x: 960, y: 540, zoom: 1 } },
  // the final pose: the slab, the page it answers, the clause; the creep takes it to about 1.03 by the last frame
  { at: T.cmd2, dur: 24, to: { x: 972, y: 545, zoom: 0.98 } },
];

const TerminalWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const cardIn = tween(frame, T.linkAt + 4, T.linkAt + 18, 0, 1, EASE.expoOut);
  return (
    <Camera3D keys={TERM_KEYS} {...TERM_OPTS}>
      {frame >= T.linkAt + 4 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `translateY(${(1 - cardIn) * 26}px)`, opacity: Math.min(1, (frame - T.linkAt - 3) / 3) }}>
          <PageCard rect={CARD} title={RUNBOOK_ROW.title} id={RUNBOOK_ROW.pageId} inset={40} elev={1 + cardIn} />
        </div>
      ) : null}
      <TerminalTwin {...TERM_PROPS} right={frame < T.cmd2 ? FIND.tool : CHECK.tool} />
      <TermAmber ci={0} until={T.cmd2} />
      <TermAmber ci={1} />
      <PathLink path={{ x0: PATH_X0, x1: PATH_X1, y: PATH_Y, stubFrom: PATH_X1 + 2 * ADV + 10 }} origin={[TX + TS.width, PATH_Y]} node={CARD_NODE} at={T.pathAt} linkAt={T.linkAt} out={T.unlink} />
      <CountChip text={PAGES_PHRASE} x={CARD.x + 200} y={CARD.y + CARD.h + 18} at={T.chipAt} />
      <div style={{ position: "absolute", left: TX + 6, top: 92 }}>
        <KineticLine text={READ_AS_YOU} at={T.readAsYou} size={42} weight={500} stagger={2} />
      </div>
      <div style={{ position: "absolute", left: CLAUSE.x, top: CLAUSE.y }}>
        <KineticLine text={"Do not present\nsteps from this\npage as current."} at={T.clause} size={CLAUSE.size} lineHeight={104} stagger={1} lead={0} />
      </div>
    </Camera3D>
  );
};

const TerminalShot: React.FC = () => (
  <Stage world="day" motif="tide" tide={{ ...TIDE, top: 880 }} light={["44%", "30%"]}>
    <TerminalWorld />
  </Stage>
);

if (DO_NOT_PRESENT !== "Do not present steps from this page as current.") throw new Error("P3: the guidance clause changed");

// ---------------------------------------------------------------------------------------------------------------------

const P3: React.FC = () => (
  <AbsoluteFill>
    <WhipBlur at={T.whip} dir="left" from={<RovoShot />} to={<TerminalShot />} />
    {/* sound: the voice and score come from the global layer; the cuts into and out of P3 are the kit's */}
    <Sfx id="swish-up" at={T.panelLand} gainDb={-4} />
    <Sfx id="tick-soft" at={T.r10 + 3} />
    <Sfx id="type-burst" at={T.typeAt} gainDb={-6} />
    <Sfx id="pop" at={T.send} gainDb={-4} />
    <Sfx id="tick-soft" at={T.r11 + 3} />
    <Sfx id="tick" at={T.sigHit} gainDb={-4} />
    <Sfx id="tick-soft" at={T.sigHome} />
    <Sfx id="tick" at={T.slipAt + 6} gainDb={-2} />
    <Sfx id="whoosh-short" at={T.fallAt + 10} gainDb={-8} />
    {[0, 4, 9, 13, 18].map((d) => (
      <Sfx key={d} id="type-key" at={T.answerAt + d} gainDb={-10} />
    ))}
    <Sfx id="tick-soft" at={T.r12 + 3} />
    <Sfx id="whoosh-short" at={T.whip} />
    <Sfx id="tick-soft" at={T.whip + 10} />
    <Sfx id="tick-soft" at={T.out1 + 7} />
    <Sfx id="pop" at={T.linkAt + 12} gainDb={-6} />
    <Sfx id="pop" at={T.chipAt + 6} gainDb={-8} />
    <Sfx id="type-burst" at={T.cmd2} gainDb={-10} />
    {/* QA (metrics, f3189): this tick sat borderline loud against "to"; 3 dB lower */}
    <Sfx id="tick" at={T.stream2 + 1} gainDb={-6} />
    <Sfx id="tick-soft" at={T.clause + 12} />
  </AbsoluteFill>
);

export default P3;
