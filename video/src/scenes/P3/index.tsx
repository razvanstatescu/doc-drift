import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import type { Box } from "../../lib/captures";
import { EASE, tween } from "../../lib/time";
import {
  cam3At,
  Camera3D,
  InkLabel,
  KineticLine,
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
  NIGHT,
  type TideProps,
} from "../../v4/kit";
import { AgentPanelTwin, agentPanelRects, PageTwin, pageRects, TerminalTwin, textWidth, type AgentPanelTwinProps, type PageTwinProps, type TerminalCall } from "../../v4/twins";
import { GhostStep } from "../../components/P3/GhostStep";
import { PageFan, PageFanLines, type FanCard, type PageFanProps } from "../../components/P3/PageFan";
import { ANSWER_LINES, ANSWER_TITLE, CHECK, FIND, MCP_TAG, OLD_STEP, QA_IDS, QUESTION, READ_AS_YOU, RUNBOOK_ROW, STEPS } from "../../components/P3/p3data";
import { CAP, inProof, toScreen } from "./geom";
import { T } from "./timing";

/**
 * P3 · Agents (film 2617 to 3277, R3 V16 to V18). Day, tide lines. Two worlds joined by a whip (T9). Cue table and
 * proof log: README.md in this folder.
 *
 *   ROVO (0 .. whip)
 *   0         opens composed and moving under the kit's whip from P2: the runbook twin on the left (its byline item
 *             "Possibly stale · Doc Drift" is the amber; the Steps band stays slipped, neutral)
 *   "Ask"     the Drift Reviewer panel twin slides in from the right and lands on "Drift"                    (V16)
 *   R10       on the beat inside "Reviewer": the real welcome grows out of the twin's heading (MorphToReal) and holds
 *             through "our Rovo agent", 45 f
 *   "how"     the question types and is sent on "back"; Drift Reviewer is thinking (the twin's steps)
 *   R11       the real steps (p3-rovo-v2-rec 23.5 to 24.5 s): "Invoking tool: Check page freshness" appears
 *   then      a signal runs from that step to the page's byline item and back
 *   V17       push into the answer slot (the page racks out and drains, so it carries no amber); A1's old step
 *             ghosts in, replays on "repeat", slips one unit right in amber with its trace, falls away on "step"
 *   "says"    the real answer streams in (v2, D38 wording, verbatim); R12 grows out of its first line on a beat,
 *             pushes to 1.0 on "Possibly stale" and pans to the PR #482 line on "why"
 *   "Coding"  whip to the terminal, on the beat
 *
 *   TERMINAL (whip .. end)
 *   V18       the MCP slab overlapping the page it answers (the runbook card on top of a stack of three, behind its
 *             corner): find-docs-for-path types, the pages array streams (the runbook's row in full with its url
 *             elided, the two QA pages collapsed to { … }), its status the amber just before "signal"; on "MCP"
 *             "Agents read as you. They never edit a page." sets above it; on "which pages cover a file" the path is
 *             underlined and the stack fans out, a connector from the path to each page; on "and which to trust" the
 *             runbook is picked, the fan folds back with it on top, the screen clears and check-page-freshness
 *             returns "status": "possibly_stale" (the one amber) and the guidance, which holds still to the end.
 *   end       the final pose; the kit's downward whip carries it into P4.
 */

// ---------------------------------------------------------------------------------------------------------------------
// The Rovo world (stage px)
// ---------------------------------------------------------------------------------------------------------------------

const PAGE: PageTwinProps = {
  world: "day",
  doc: "runbook",
  // the twin is 600 UI px wide: at k 1.6 (960 px) the whole card and its slipped band sit left of the panel
  x: 30,
  y: 110,
  k: 1.6,
  byline: { kind: "dds", state: "possibly_stale" },
  // the band slipped in P2 and stays out of line, neutral; the byline item carries the amber (R3 section 3)
  slip: { at: -60, amber: false },
  step2: "old",
};
const PR = pageRects(PAGE);

/** The Drift Reviewer panel twin: 780 wide, so its answer breaks lines exactly where the real panel does. */
const PANEL = { x: 1110, y: 60, w: 780 };
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
  /** The 48 px mark and the name (30 px, 600). */
  heading: { x: PR_PANEL.avatar.x, y: PR_PANEL.avatar.y, w: 48 + 16 + textWidth("Drift Reviewer", { size: 30, weight: 600, tracking: -0.01 }), h: 48 } as Rect,
  /** Step i's text (26 px), after its 28 px check and a 14 px gap. */
  step: (i: number): Rect => {
    const r = PR_PANEL.steps[i];
    return { x: r.x + 28 + 14, y: r.y + 7, w: textWidth(STEPS[i], { size: 26 }), h: 26 };
  },
  /** The check icon of step i (the signal leaves from the third). */
  stepIcon: (i: number): Rect => ({ x: PR_PANEL.steps[i].x, y: PR_PANEL.steps[i].y + 6, w: 28, h: 28 }),
  /** The answer's first line where it lands after the steps fold away: 30 px glyphs in a 46 px line. */
  answer1: { x: PR_PANEL.answerLines[0].x, y: PR_PANEL.answerLines[0].y + 8, w: PR_PANEL.answerLines[0].w, h: 30 } as Rect,
  answerTop: PR_PANEL.answer.y,
  /** The PR #482 line (the second paragraph's first line). */
  prLine: PR_PANEL.answerLines[1],
  /** The answer slot before the fold, under the steps (where A1's old step ghosts in). */
  slotTop: PR_PANEL.ghost.y + PR_PANEL.fold,
};

const ROVO_OPTS = { base: { x: 790, y: 540, zoom: 0.95 }, seed: "p3-rovo" };
const ANSWER_C = { x: PANEL.x + PANEL.w / 2 - 20, y: PANEL_R.answerTop + 80 };
const ROVO_KEYS: Cam3Key[] = [
  // the whip from P2 lands: the content is still sliding left and settles
  { at: 0, dur: 22, to: { x: 955, y: 540, zoom: 0.97 } },
  // a slow drift toward the panel while it lands and R10 is up
  { at: 30, dur: 56, to: { x: 985, y: 530, zoom: 0.99 }, ease: EASE.standard },
  // push to the panel for the question and the steps, once R10 has rebuilt into the twin (T4 moves the world itself)
  { at: T.r10Out + 7, dur: 22, to: { x: 1440, y: 420, zoom: 1.12 } },
  // pull back to page and panel for the signal (it follows the pulse to the left)
  { at: T.sigOut - 6, dur: 22, to: { x: 960, y: 450, zoom: 0.97 } },
  // into the answer slot (under the steps): the page leaves the frame
  { at: T.sigHome - 8, dur: 20, to: { x: ANSWER_C.x, y: PANEL_R.slotTop - 40, zoom: 1.12 } },
  // the steps fold away and the answer starts: follow it up
  { at: T.answerAt - 6, dur: 14, to: { y: ANSWER_C.y, zoom: 1.08 } },
  // ease back before R12, so the twin's first line is the capture's size when the proof grows out of it (P2)
  { at: T.r12 - 14, dur: 16, to: { x: ANSWER_C.x - 20, y: ANSWER_C.y + 40, zoom: 0.95 } },
  // after R12, a slow push on the reason ("What it describes changed in PR #482 ...") while it is read
  { at: T.r12Out + 2, dur: 34, to: { x: ANSWER_C.x, y: PANEL_R.prLine.y + 40, zoom: 1.12 }, ease: EASE.standard },
  // accelerate into the whip (content travels left)
  { at: T.whip - 8, dur: 8, to: { x: ANSWER_C.x + 260 }, ease: EASE.expoIn },
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

/** A1's old step ghosts into the top of the answer slot. */
const GHOST_FONT = 24;
const GHOST = { x: PANEL_R.answer1.x - 6, y: PANEL_R.slotTop - 4 };

const RovoWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = 1 - tween(frame, T.panelIn, T.panelLand + 4, 0, 1, EASE.expoOut);
  // rack focus from the page to the panel (R2 section 10): it blurs and drains, so its amber leaves with it
  const rack = tween(frame, T.sigHome - 8, T.sigHome + 10, 0, 1, EASE.standard);
  const sigFade = 1 - tween(frame, T.sigHome + 2, T.sigHome + 14, 0, 1, EASE.standard);
  return (
    <Camera3D keys={ROVO_KEYS} {...ROVO_OPTS}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          filter: rack > 0.001 ? `blur(${7 * rack}px) grayscale(${rack})` : undefined,
          opacity: rack > 0.001 ? 1 - 0.3 * rack : undefined,
        }}
      >
        <PageTwin {...PAGE} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: slide > 0.0005 ? `translateX(${slide * 900}px)` : undefined }}>
        <AgentPanelTwin {...PANEL_PROPS} />
      </div>
      {frame >= T.sigOut && sigFade > 0 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: sigFade < 1 ? sigFade : undefined }}>
          <SignalLine d={SIG_GO} at={T.sigOut} dur={T.sigHit - T.sigOut} />
          <SignalLine d={SIG_BACK} at={T.sigBack} dur={T.sigHome - T.sigBack} trail={false} />
        </div>
      ) : null}
      <Press at={T.sigHit} x={BADGE_PT[0]} y={BADGE_PT[1]} radius={38} />
      <GhostStep
        text={OLD_STEP}
        x={GHOST.x}
        y={GHOST.y}
        fontSize={GHOST_FONT}
        at={T.ghostAt}
        typeFrom={T.ghostType}
        typeDur={T.ghostTypeDur}
        slipAt={T.slipAt}
        fallAt={T.fallAt}
      />
    </Camera3D>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The Rovo proofs (screen px). Each is placed so its element lands on the twin's element on screen, so the real
// screen grows out of the twin with little travel (T3); each starts on a beat and never draws a capture above 1 film
// px per capture px (the twin's element is the capture's size at the morph's first frame).
// ---------------------------------------------------------------------------------------------------------------------

const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Place a proof so the capture element `el` sits on the screen rect `target` (clamped into the frame). */
function placeProof(crop: Box, scale: number, el: [number, number, number, number], target: Rect) {
  const { outer } = proofRect({ crop, scale, x: 0, y: 0 });
  const e = inProof(el, crop, scale, 0, 0);
  const x = clampTo(target.x + target.w / 2 - (e.x + e.w / 2), 40, 1920 - 40 - outer.w);
  const y = clampTo(target.y + target.h / 2 - (e.y + e.h / 2), 60, 1080 - 40 - outer.h);
  return { x: Math.round(x), y: Math.round(y) };
}
/** The morph's frame: the mat plus room for its tag and its float shadow, so nothing pops when the clip lets go. */
const morphFrame = (outer: Rect): Rect => ({ x: outer.x - 90, y: outer.y - 60, w: outer.w + 180, h: outer.h + 230 });

const TAG = "Recorded in Rovo";

// R10 · p3-rovo-v2-agent: the welcome (heading, description, starters)
const R10_CROP: Box = [2990, 1060, 840, 590];
const R10_SCALE = 0.9;
const R10_POS = placeProof(R10_CROP, R10_SCALE, CAP.agentHeading, toScreen(rovoCam(T.r10), PANEL_R.heading));
const R10_OUTER = proofRect({ crop: R10_CROP, scale: R10_SCALE, ...R10_POS }).outer;
const R10_EL = inProof(CAP.agentHeading, R10_CROP, R10_SCALE, R10_POS.x, R10_POS.y);

// R11 · p3-rovo-v2-rec 23.5 -> 24.5 s: the question, Referencing, Drift Reviewer is thinking, the steps (the third
// appears at 23.87 s); matched on the first step's text
const R11_CROP: Box = [2990, 220, 840, 580];
const R11_SCALE = 0.9;
const R11_VIDEO = { from: 23.5, to: 24.5 };
const CAP_STEP1: [number, number, number, number] = [3076, 556, 3611, 588];
const R11_POS = placeProof(R11_CROP, R11_SCALE, CAP_STEP1, toScreen(rovoCam(T.r11), PANEL_R.step(0)));
const R11_OUTER = proofRect({ crop: R11_CROP, scale: R11_SCALE, ...R11_POS }).outer;
const R11_EL = inProof(CAP_STEP1, R11_CROP, R11_SCALE, R11_POS.x, R11_POS.y);

// R12 · p3-rovo-v2-answer: the answer. Lands at 0.9 on the whole exchange, pushes to 1.0 on "Possibly", pans to the
// PR #482 line on "why". The image keeps one size (760 x 608): the crop shrinks as the scale grows (never above 1).
const R12_W = 760;
const R12_H = 608;
const R12_C0 = { cx: 2996 + 844 / 2, cy: 236 + 676 / 2, s: 0.9 }; // the question, Referencing and the whole answer
const R12_C1 = { cx: 3030 + 380, cy: 290 + 304, s: 1 }; // the state line in the upper third
const R12_C2 = { cx: 3030 + 380, cy: 345 + 304, s: 1 }; // the PR #482 line centred
function r12View(f: number): { crop: Box; scale: number } {
  const p1 = tween(f, T.r12 + 10, T.possibly + 16, 0, 1, EASE.expoOut);
  // the pan to the PR #482 line runs from the end of push 1 and lands on "why", so the insert never sits still
  const p2 = tween(f, T.possibly + 16, T.why - 1, 0, 1, EASE.standard);
  const s = R12_C0.s + (R12_C1.s - R12_C0.s) * p1;
  const cx = R12_C0.cx + (R12_C1.cx - R12_C0.cx) * p1 + (R12_C2.cx - R12_C1.cx) * p2;
  const cy = R12_C0.cy + (R12_C1.cy - R12_C0.cy) * p1 + (R12_C2.cy - R12_C1.cy) * p2;
  const w = R12_W / s;
  const h = R12_H / s;
  return { crop: [cx - w / 2, cy - h / 2, w, h], scale: s };
}
const R12_V0 = r12View(T.r12);
const R12_POS = placeProof(R12_V0.crop, R12_V0.scale, CAP.answerLine1, toScreen(rovoCam(T.r12), PANEL_R.answer1));
const R12_OUTER = proofRect({ ...R12_V0, ...R12_POS }).outer;
const R12_EL = inProof(CAP.answerLine1, R12_V0.crop, R12_V0.scale, R12_POS.x, R12_POS.y);
/** Where the first line sits in the proof when it hands back to the twin (after both pushes). */
const R12_EL_OUT = (() => {
  const v = r12View(T.r12Out);
  return inProof(CAP.answerLine1, v.crop, v.scale, R12_POS.x, R12_POS.y);
})();

const R10Proof: React.FC = () => <ProofFrame capture="p3-rovo-v2-agent" crop={R10_CROP} scale={R10_SCALE} {...R10_POS} at={T.r10} enter="none" exit="none" tag={TAG} />;
const R11Proof: React.FC = () => (
  <ProofFrame capture="p3-rovo-v2-rec" crop={R11_CROP} scale={R11_SCALE} {...R11_POS} at={T.r11} video={R11_VIDEO} enter="none" exit="none" tag={TAG} />
);
const R12Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const v = r12View(frame);
  return <ProofFrame capture="p3-rovo-v2-answer" crop={v.crop} scale={v.scale} {...R12_POS} at={T.r12} enter="none" exit="none" creep={0} tag={TAG} />;
};

type ProofPhase = { at: number; out: number; twinEl: (f: number) => Rect; proofIn: Rect; proofOut: Rect; frame: Rect; node: React.ReactNode };

const RovoShot: React.FC = () => {
  const frame = useCurrentFrame();
  const world = <RovoWorld />;
  const phases: ProofPhase[] = [
    { at: T.r10, out: T.r10Out, twinEl: (f) => toScreen(rovoCam(f), PANEL_R.heading), proofIn: R10_EL, proofOut: R10_EL, frame: R10_OUTER, node: <R10Proof /> },
    { at: T.r11, out: T.r11Out, twinEl: (f) => toScreen(rovoCam(f), PANEL_R.step(0)), proofIn: R11_EL, proofOut: R11_EL, frame: R11_OUTER, node: <R11Proof /> },
    { at: T.r12, out: T.r12Out, twinEl: (f) => toScreen(rovoCam(f), PANEL_R.answer1), proofIn: R12_EL, proofOut: R12_EL_OUT, frame: R12_OUTER, node: <R12Proof /> },
  ];
  let body: React.ReactNode = world;
  for (const p of phases) {
    if (frame >= p.at && frame < p.out) {
      body = <MorphToReal at={p.at} fromRect={p.twinEl(p.at)} toRect={p.proofIn} twin={world} proof={p.node} frameRect={morphFrame(p.frame)} />;
    } else if (frame >= p.out && frame < p.out + 8) {
      body = <RebuildFromReal at={p.out} fromRect={p.proofOut} toRect={p.twinEl(p.out)} twin={world} proof={p.node} />;
    }
  }
  return (
    <Stage world="day" motif="tide" tide={TIDE} light={["58%", "30%"]}>
      {body}
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The terminal world (stage px)
// ---------------------------------------------------------------------------------------------------------------------

/** The slab: Spline Sans Mono 34 px (53 px lines, 20.06 px a character), 58 columns, 13 rows. */
const TERM = { x: 120, y: 190, w: 1240, font: 34, rows: 13 };
const TERM_LH = Math.round(TERM.font * 1.55);
const CH = (0.6 - 0.01) * TERM.font;
/** Top of body row r (after the 66 px title bar, its 1.5 px divider and 26 px of padding). */
const rowTop = (r: number) => TERM.y + 66 + 1.5 + 26 + r * TERM_LH;
/** The slab's fill on Day (Night ground). */
const DAY_TERM_BG = NIGHT.ground;

const json1 = (o: Record<string, string>) => `{${Object.entries(o).map(([k, v]) => `"${k}": "${v}"`).join(", ")}}`;
const CALLS: TerminalCall[] = [
  {
    cmd: `find-docs-for-path ${json1(FIND.input)}`,
    at: T.cmd1,
    // typed at reading pace and done just before the output streams (the line then scrolls out of the 13-row view;
    // the title bar keeps the tool's name)
    cps: Math.ceil((json1(FIND.input).length + 19) / ((T.out1 - 2 - T.cmd1) / 30)),
    output: "findDocsFlaggedV2",
    // the QA pages in the test space are collapsed (never named on screen), the url is elided; "…" lines stand for
    // the omitted top-level keys (ok, repo, and the guidance, which names the QA pages)
    collapse: [...QA_IDS, "pages.1.url"],
    only: ["path", "pages"],
    // the runbook's status is the shot's amber until the next call clears the screen
    focus: RUNBOOK_ROW.pageId,
    streamAt: T.out1,
  },
  {
    cmd: `check-page-freshness ${json1(CHECK.input)}`,
    at: T.cmd2,
    cps: 140,
    clear: true,
    output: "checkFlaggedV2",
    only: ["status", "citePolicy", "guidance"],
    focus: "status",
    streamAt: T.stream2 - 1,
  },
];

/**
 * The find-docs screen once streamed: 2 command rows and 19 output rows, scrolled by 8 in a 13-row view, so the
 * runbook's "anchor" row (output row 9) sits on view row 3. Its value's path, scripts/rollback.sh, spans characters
 * 25 to 44 after a 3-level indent (3 x 2 x 0.59 em).
 */
const ANCHOR_ROW = 2 + 9 - 8;
const PATH_X0 = TERM.x + 34 + 3 * 2 * 0.59 * TERM.font + 25 * CH;
const PATH_X1 = TERM.x + 34 + 3 * 2 * 0.59 * TERM.font + 44 * CH;
const PATH_Y = rowTop(ANCHOR_ROW) + TERM_LH - 9;

const CARD = { w: 540, h: 236 };
const STACK = { x: 1150, y: 98 };
const FAN_X = 1530;
const FAN: PageFanProps = {
  cards: [
    { key: QA_IDS[0], stack: { x: STACK.x + 40, y: STACK.y - 32, ...CARD }, fan: { x: FAN_X, y: 94, ...CARD }, z: 1 },
    {
      key: RUNBOOK_ROW.pageId,
      title: RUNBOOK_ROW.title,
      id: RUNBOOK_ROW.pageId,
      stack: { x: STACK.x, y: STACK.y, ...CARD },
      fan: { x: FAN_X, y: 376, ...CARD },
      z: 3,
    },
    { key: QA_IDS[1], stack: { x: STACK.x + 20, y: STACK.y - 16, ...CARD }, fan: { x: FAN_X, y: 658, ...CARD }, z: 2 },
  ] as FanCard[],
  origin: [TERM.x + TERM.w, PATH_Y],
  fanAt: T.fan,
  foldAt: T.fold,
  select: { key: RUNBOOK_ROW.pageId, at: T.pick },
};

const TERM_OPTS = { base: { x: 690, y: 560, zoom: 0.98, yaw: -6 }, seed: "p3-term" };
const TERM_KEYS: Cam3Key[] = [
  // the whip lands: the content still travels left and turns square (M2: tilt only while travelling)
  { at: T.whip - 4, dur: 22, to: { x: 930, y: 580, zoom: 1, yaw: 0 } },
  // pull back and right for the fan (the mono still reads 28 px)
  { at: T.which - 10, dur: 22, to: { x: 1130, y: 560, zoom: 0.83 } },
  // back to the slab and the page it answers: which to trust. Statement to slab bottom is 928 px: centred at 0.98,
  // the creep brings it to about 1.02 by the last frame with both ends 68 px or more inside the frame
  { at: T.pick, dur: 26, to: { x: 950, y: 534, zoom: 0.98 } },
];

const TerminalWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const tag = tween(frame, T.whip + 4, T.whip + 16, 0, 1, EASE.expoOut);
  return (
    <Camera3D keys={TERM_KEYS} {...TERM_OPTS}>
      <PageFan {...FAN} />
      <TerminalTwin
        title="Coding agent · MCP"
        right={frame < T.cmd2 ? FIND.tool : CHECK.tool}
        x={TERM.x}
        y={TERM.y}
        width={TERM.w}
        fontSize={TERM.font}
        rows={TERM.rows}
        calls={CALLS}
      />
      {/* the slab's top padding: rows scrolled out of the view would peek into it, cut by the title bar */}
      <div style={{ position: "absolute", left: TERM.x + 2, top: TERM.y + 67.5, width: TERM.w - 4, height: 24, background: DAY_TERM_BG }} />
      <PageFanLines {...FAN} path={{ x0: PATH_X0, x1: PATH_X1, y: PATH_Y, at: T.which - 4, stubFrom: PATH_X1 + 2 * CH + 10 }} />
      <div style={{ position: "absolute", left: TERM.x + 22, top: TERM.y - 40 - 18 * (1 - tag), opacity: tag < 1 ? tag : undefined }}>
        <InkLabel icon="eye">{MCP_TAG}</InkLabel>
      </div>
      <div style={{ position: "absolute", left: TERM.x + 4, top: 70 }}>
        <KineticLine text={READ_AS_YOU} at={T.readAsYou} size={42} weight={500} stagger={2} />
      </div>
    </Camera3D>
  );
};

const TerminalShot: React.FC = () => (
  <Stage world="day" motif="tide" tide={{ ...TIDE, top: 880 }} light={["44%", "30%"]}>
    <TerminalWorld />
  </Stage>
);

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
    <Sfx id="type-burst" at={T.cmd1} gainDb={-8} />
    <Sfx id="tick-soft" at={T.out1 + 7} />
    {T.fan.map((f, i) => (
      <Sfx key={`pop${i}`} id="pop" at={f + 9} gainDb={-6} />
    ))}
    <Sfx id="type-burst" at={T.cmd2} gainDb={-8} />
    <Sfx id="tick" at={T.stream2} gainDb={-3} />
    <Sfx id="tick-soft" at={T.stream2 + 8} />
  </AbsoluteFill>
);

export default P3;
