import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { Icon } from "../../../brand/icons";
import type { Box } from "../../../lib/captures";
import { EASE, tween, W } from "../../../lib/time";
import { AmberToken } from "../../../components/P3/AmberToken";
import {
  amber,
  BRAND,
  cam3At,
  Camera3D,
  cameraToMatch,
  DAY,
  elevAt,
  FONT,
  InkLabel,
  KineticDock,
  MistBand,
  MorphToReal,
  ProofFrame,
  proofPoint,
  proofRect,
  RebuildFromReal,
  screenRectOf,
  Stage,
  type Cam3Key,
  type Rect,
} from "../../../v4/kit";
import { AgentPanelTwin, agentPanelRects, BYLINE, BylineItem, bylineItemSize, bylineTitle, layoutRuns, textWidth, type AgentPanelTwinProps } from "../../../v4/twins";
import { ANSWER_BOX, ANSWER_LINES, ANSWER_STILL, MCP_TAG, PAGE_TITLE, PROOF_CROP, QUESTION, ROVO_TAG, STEPS } from "./data";
import { GlossChip, glossWidth, type GlossWord } from "./GlossChip";
import { chatCallRect, chatLayout, chatStatusRect, CHAT, McpChat } from "./McpChat";
import { T } from "./timing";

/**
 * AGENTS (v5 round 2, S13 to S15; V5.md sections 5 and 8). Crafted leads, one short real proof, never a twin beside a
 * real capture, no paint on real footage, one amber per shot.
 *
 *   Station 1 (to S15's bar). It opens on the carried words: the runbook's card, big, its "Possibly stale · Doc Drift"
 *   the one amber. On "Rovo" the card makes room and Drift Reviewer's panel (a crafted twin at 1.15x: 30 px and up)
 *   slides in with the chip "Rovo · Atlassian's AI" set word by word; "our agent" sets beside the panel's name; the
 *   question types on "how to roll back" under S13's push. S14: the real thinking steps ("Check page freshness" on
 *   "step"); on "it warns" the answer starts with its slot empty, and the page's "Possibly stale" lifts off the card on
 *   its amber and lands in the slot on "page" (the card's amber leaves with it). On the beat after "may" the real
 *   answer (p3-rovo-v2-answer) grows out of the twin's first line at 1:1, tagged once "Recorded in Rovo", with Mist on
 *   its "Possibly stale" and, on "and why", on its second sentence; on "why" it wipes back to the twin (marked the
 *   same), which pushes into the reason.
 *   Station 2 (S15). A cut on the bar to the coding assistant: a crafted chat card in plain words, arriving with the
 *   question asked; the MCP call, small, on "get"; the tool's real output as the reply, "Possibly stale" (the one amber)
 *   on "same" and its guidance on "check", under one push; "MCP · an open standard for AI tools" word by word, the
 *   camera finding it on "open standard". Tagged once "Real output: doc-drift MCP". No JSON.
 */

// ---------------------------------------------------------------------------------------------------------------------
// Station 1: the page card (the carried words)
// ---------------------------------------------------------------------------------------------------------------------

const KB = 1.9; // the badge's UI px to film px
const CARD_PAD = 34;
const TITLE_SIZE = 32;
const BADGE = (() => {
  const item = bylineItemSize("possibly_stale", KB);
  const wordsW = textWidth(bylineTitle("possibly_stale"), { size: BYLINE.size, weight: BYLINE.weight }) * KB;
  const padW = 4 * KB;
  const slip = 0.117 * (wordsW + 2 * padW);
  return { w: item.w, h: item.h, slip, wordsW, padW, wordsX: (BYLINE.padX + BYLINE.icon + BYLINE.gap) * KB };
})();
const CARD_W = Math.round(CARD_PAD * 2 + Math.max(textWidth(PAGE_TITLE, { size: TITLE_SIZE, weight: 600, tracking: -0.01 }) + 44, BADGE.w + BADGE.slip + 8));
const CARD_H = Math.round(30 + 44 + 14 + BADGE.h + 28);
const BADGE_Y = 30 + 44 + 14;
/** Where the card rests once Rovo is open (stage px, its top-left and centre height), and how big it opens. */
const CARD = { x: 84, cy: 572, rest: 1.15, open: 1.6 };

/** The card's place and scale at a frame: big at the centre, then making room for Rovo. */
function cardPose(frame: number) {
  const p = tween(frame, T.open, T.open + T.openDur - 2, 0, 1, EASE.expoOut);
  // its words carried, it leaves left as the twin comes back from the proof (the frame is the answer's)
  const leave = tween(frame, T.rebuildAt, T.rebuildAt + 12, 0, 1, EASE.expoIn);
  const s = CARD.open + (CARD.rest - CARD.open) * p;
  const cx0 = W / 2;
  const cy0 = 540;
  const cx1 = CARD.x + (CARD_W * CARD.rest) / 2;
  const cx = cx0 + (cx1 - cx0) * p - leave * 900;
  const cy = cy0 + (CARD.cy - cy0) * p;
  return { s, x: cx - (CARD_W * s) / 2, y: cy - (CARD_H * s) / 2 };
}

const CARRY_FROM = T.carryAt;
/** The amber leaves the badge with its words (6 frames): the slipped words return home as their copy lifts off. */
const badgeLit = (frame: number) => 1 - tween(frame, CARRY_FROM, CARRY_FROM + 6, 0, 1, EASE.expoOut);

/** "Possibly stale" on the badge's amber block, stage px, with the card at rest (BylineItem's own geometry). */
function badgeWordsRect(): Rect {
  const pose = cardPose(CARRY_FROM);
  const h = BYLINE.h * KB;
  const blockH = BYLINE.size * KB * 1.32;
  const psW = textWidth("Possibly stale", { size: BYLINE.size, weight: BYLINE.weight }) * KB;
  const r = { x: CARD_PAD + BADGE.wordsX + BADGE.slip - BADGE.padW, y: BADGE_Y + (h - blockH) / 2, w: psW + 2 * BADGE.padW, h: blockH };
  return { x: pose.x + r.x * pose.s, y: pose.y + r.y * pose.s, w: r.w * pose.s, h: r.h * pose.s };
}

const PageCard: React.FC = () => {
  const frame = useCurrentFrame();
  const pose = cardPose(frame);
  return (
    <div
      style={{
        position: "absolute",
        left: pose.x,
        top: pose.y,
        width: CARD_W,
        height: CARD_H,
        transformOrigin: "0 0",
        transform: `scale(${pose.s})`,
        borderRadius: 28,
        background: DAY.surface,
        boxShadow: elevAt(3),
        fontFamily: FONT.sans,
        color: DAY.text,
      }}
    >
      <div style={{ position: "absolute", left: CARD_PAD, top: 30, height: 44, display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap" }}>
        <Icon name="page" size={32} color={DAY.textMuted} />
        <span style={{ fontSize: TITLE_SIZE, fontWeight: 600, letterSpacing: "-0.01em" }}>{PAGE_TITLE}</span>
      </div>
      <BylineItem state="possibly_stale" world="day" k={KB} lit={badgeLit(frame)} x={CARD_PAD} y={BADGE_Y} />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Station 1: Drift Reviewer, told big (a crafted twin of the real panel, at 1.15x)
// ---------------------------------------------------------------------------------------------------------------------

const PANEL = { x: 800, y: 150, w: 930, h: 750, size: 30, scale: 1.12 };
const ANSWER_PARAS = [ANSWER_LINES[0].replace(PAGE_TITLE, "{source}"), `${ANSWER_LINES[1]} ${ANSWER_LINES[2]} ${ANSWER_LINES[3]}`];
const PANEL_PROPS: AgentPanelTwinProps = {
  world: "day",
  variant: "drift-reviewer",
  x: PANEL.x,
  y: PANEL.y,
  width: PANEL.w,
  size: PANEL.size,
  // the real panel's shape: the conversation on top, the input at the bottom (drawn below); the question is typed in
  // the input on "how to roll back" and arrives in the conversation when sent
  height: PANEL.h,
  question: { text: QUESTION, at: T.send, typeDur: 1 },
  source: { text: PAGE_TITLE, at: T.send + 7 },
  steps: STEPS.map((text, i) => ({ text, at: T.steps[i] })),
  answer: { lines: ANSWER_PARAS, at: T.answerAt, cps: 60 },
};
const PR = agentPanelRects(PANEL_PROPS);
const INNER = PANEL.w - 2 * 34;
/** A rect in the twin's own (unscaled) px to stage px. */
const scaled = (r: Rect): Rect => ({ x: PANEL.x + (r.x - PANEL.x) * PANEL.scale, y: PANEL.y + (r.y - PANEL.y) * PANEL.scale, w: r.w * PANEL.scale, h: r.h * PANEL.scale });

/** "Possibly stale" in the answer's first line, laid out as the twin lays it (its own layoutRuns), unscaled px. */
const POSSIBLY = (() => {
  const chipExtra = PANEL.size * 0.82 + 10 + 2 * 12;
  const lines = layoutRuns([{ t: PAGE_TITLE, chip: true, extraW: chipExtra }, { t: " is Possibly stale." }], INNER, { size: PANEL.size, codeSize: PANEL.size * 0.88 });
  const runs = lines[0].runs;
  const a = runs.find((r) => r.t === "Possibly");
  const b = runs.find((r) => r.t.startsWith("stale"));
  if (lines.length !== 1 || !a || !b) throw new Error("AGENTS: the answer's first line no longer reads '[page] is Possibly stale.' on one line");
  const l0 = PR.answerLines[0];
  return { x: l0.x + a.x, y: l0.y, w: b.x + textWidth("stale", { size: PANEL.size }) - a.x, h: l0.h };
})();
/** The amber block around those words (AmberToken's 0.12 em padding). */
const SLOT: Rect = { x: POSSIBLY.x - 0.12 * PANEL.size, y: POSSIBLY.y + POSSIBLY.h / 2 - PANEL.size * 0.6, w: POSSIBLY.w + 0.24 * PANEL.size, h: PANEL.size * 1.2 };

/** The second sentence ("What it describes ... last verified.") on the twin's paragraph lines, unscaled px. */
const SENTENCE2: Rect[] = (() => {
  const lines = layoutRuns([{ t: ANSWER_PARAS[1] }], INNER, { size: PANEL.size, codeSize: PANEL.size * 0.88 });
  const words = ANSWER_LINES[1].split(" ").length;
  const out: Rect[] = [];
  let n = 0;
  lines.forEach((l, li) => {
    if (n >= words) return;
    const take = l.runs.slice(0, Math.min(l.runs.length, words - n));
    n += take.length;
    const last = take[take.length - 1];
    const r = PR.answerLines[1 + li];
    out.push({ x: r.x + take[0].x, y: r.y + r.h / 2 - PANEL.size * 0.42, w: last.x + last.w - take[0].x, h: PANEL.size * 0.84 });
  });
  return out;
})();

/** The welcome's name, unscaled px (centred in the empty conversation, as in the real panel). */
const WELCOME_Y = PANEL.y + 250;

/** The panel's foot, as the real one: the page as context, and the input the question is typed into (unscaled px). */
const INPUT = { h: 66, ctxH: 40, gap: 12 };
const PanelFoot: React.FC = () => {
  const frame = useCurrentFrame();
  const inputY = PANEL.y + PANEL.h - 34 - INPUT.h;
  const ctxY = inputY - INPUT.gap - INPUT.ctxH;
  const n = frame < T.typeAt ? 0 : frame >= T.send ? 0 : Math.round(QUESTION.length * tween(frame, T.typeAt, T.typeEnd, 0, 1, EASE.linear));
  const typing = frame >= T.typeAt && frame < T.send;
  const caretOn = typing && Math.floor(frame / 8) % 2 === 0;
  const size = PANEL.size * 0.95;
  return (
    <>
      <div style={{ position: "absolute", left: PANEL.x + 34, top: ctxY, height: INPUT.ctxH, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.sans, fontSize: 22, color: DAY.textMuted, whiteSpace: "nowrap" }}>
        Context:
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 12px", borderRadius: 9, boxShadow: `inset 0 0 0 2px ${DAY.line}`, color: DAY.link, fontWeight: 500 }}>
          <Icon name="page" size={20} color={DAY.link} />
          {PAGE_TITLE}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: PANEL.x + 34,
          top: inputY,
          width: PANEL.w - 68,
          height: INPUT.h,
          borderRadius: 16,
          boxShadow: `inset 0 0 0 2px ${typing ? DAY.lineStrong : DAY.line}`,
          display: "flex",
          alignItems: "center",
          padding: "0 22px",
          boxSizing: "border-box",
          fontFamily: FONT.sans,
          fontSize: size,
          whiteSpace: "pre",
        }}
      >
        {n > 0 ? <span style={{ color: DAY.text }}>{QUESTION.slice(0, n)}</span> : <span style={{ color: DAY.textMuted, fontSize: size * 0.8 }}>{typing ? "" : "Ask, @mention, or / for actions"}</span>}
        {caretOn ? <span style={{ display: "inline-block", width: 2.5, height: size * 1.05, marginLeft: 2, background: DAY.text }} /> : null}
        <span style={{ flex: 1 }} />
        <span style={{ width: 40, height: 40, borderRadius: 20, display: "grid", placeItems: "center", background: n >= QUESTION.length ? DAY.text : DAY.surfaceSunk }}>
          <span style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: `11px solid ${n >= QUESTION.length ? DAY.surface : DAY.textMuted}`, transform: "translateY(-1px)" }} />
        </span>
      </div>
    </>
  );
};

const PanelTwin: React.FC = () => {
  const frame = useCurrentFrame();
  const slotOn = frame >= T.answerAt && frame < T.carryLand;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 1080, transformOrigin: `${PANEL.x}px ${PANEL.y}px`, transform: `scale(${PANEL.scale})` }}>
      <AgentPanelTwin {...PANEL_PROPS} />
      <PanelFoot />
      {/* before the question, the agent's own welcome, as the real panel shows it: its name, big */}
      {frame < T.send + 4 ? (
        <div
          style={{
            position: "absolute",
            left: PANEL.x,
            top: WELCOME_Y,
            width: PANEL.w,
            textAlign: "center",
            fontFamily: FONT.sans,
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: DAY.text,
            opacity: 1 - tween(frame, T.send, T.send + 4, 0, 1, EASE.linear),
          }}
        >
          Drift Reviewer
        </div>
      ) : null}
      {/* the answer's slot waits for the page's words: covered, with a trace where they will land */}
      {slotOn ? (
        <>
          <div style={{ position: "absolute", left: SLOT.x - 2, top: SLOT.y - 4, width: SLOT.w + 4, height: SLOT.h + 8, background: DAY.surface }} />
          {frame >= T.answerAt + 13 ? <div style={{ position: "absolute", left: SLOT.x, top: SLOT.y, width: SLOT.w, height: SLOT.h, borderRadius: 5, background: DAY.trace }} /> : null}
        </>
      ) : null}
      {/* landed: the page's words on their amber, exactly over the twin's own (the shot's one amber) */}
      {frame >= T.carryLand - 1 ? (
        <div style={{ position: "absolute", left: POSSIBLY.x, top: POSSIBLY.y, height: POSSIBLY.h, display: "flex", alignItems: "center" }}>
          {/* fully on at carryLand, the frame the flying copy is gone (no frame without the amber) */}
          <AmberToken at={T.carryLand - 1} dur={1} font={{ fontFamily: FONT.sans, fontSize: PANEL.size, fontWeight: 400 }}>
            Possibly stale
          </AmberToken>
        </div>
      ) : null}
      {/* "and why": the reason marked, line by line (the same marks as the proof's) */}
      {SENTENCE2.map((r, i) => (
        <MistBand key={i} rect={r} at={i === 0 ? T.mist2a : T.mist2b} dur={i === 0 ? 10 : 8} />
      ))}
    </div>
  );
};

/** The panel slides in from the right on "Rovo" (expo out) as the card makes room (both fast at first, so they never meet); the chips ride with it. */
const panelSlide = (frame: number) => (1 - tween(frame, T.open, T.open + T.openDur, 0, 1, EASE.expoOut)) * 1200;

const CHIP_ROVO: GlossWord[] = [
  { text: "Rovo", at: T.chipWords[0] },
  { text: "· Atlassian's", at: T.chipWords[1] },
  { text: "AI", at: T.chipWords[2] },
];
const CHIP_AGENT: GlossWord[] = [
  { text: "our", at: T.agentChip },
  { text: "agent", at: T.agentChip + 6 },
];
/** "our agent" sits under the welcome's name, centred on it (stage px). */
const AGENT_CHIP = (() => {
  const w = glossWidth(CHIP_AGENT, 30).total;
  const cx = PANEL.x + (PANEL.w / 2) * PANEL.scale;
  return { x: cx - w / 2, y: scaled({ x: 0, y: WELCOME_Y + 70, w: 0, h: 0 }).y };
})();

/** The page's words fly from the card into the answer's slot, on their amber, landing flush on the twin's words. */
const CarriedWords: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < CARRY_FROM || frame >= T.carryLand) return null;
  const from = badgeWordsRect();
  const to = scaled(SLOT);
  const font = PANEL.size * PANEL.scale;
  return (
    <KineticDock at={CARRY_FROM} dur={T.carryLand - CARRY_FROM} fromRect={from} toRect={to} arc={70} lift={4}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 0.14 * font,
          background: BRAND.beacon,
          boxShadow: `0 0 0 1px ${amber(0.35)}, 0 6px 22px ${amber(0.45)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.sans,
          fontWeight: 400,
          fontSize: font,
          lineHeight: 1,
          color: BRAND.fathom,
          whiteSpace: "nowrap",
        }}
      >
        Possibly stale
      </div>
    </KineticDock>
  );
};

const ROVO_KEYS: Cam3Key[] = [
  { at: 0, dur: 0, to: { x: 960, y: 540, zoom: 1 } },
  // S13's one camera beat: a slow drift down onto the input as the question types; it holds through S14 (calm), so the
  // card, the panel and the carry stay whole in frame
  { at: T.pushAsk, dur: 60, to: { x: 963, y: 590, zoom: 1.025 }, ease: EASE.standard },
  // "it warns": a lean toward the answer. Card (from x 84) and panel (to x 1842) must stay whole in frame with the
  // creep until the card leaves, so the zoom stays under 1.05 (1920 - 2 x 30 margins over their 1758 px)
  { at: T.leanIn, dur: 24, to: { x: 963, y: 560, zoom: 1.035 }, ease: EASE.standard },
];
const ROVO_CAM = { creep: 0.5, float: 4, seed: "agents-rovo" };
const rovoPose = (f: number) => cam3At(f, ROVO_KEYS, ROVO_CAM);

const RovoWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = panelSlide(frame);
  return (
    <Camera3D keys={ROVO_KEYS} {...ROVO_CAM}>
      <PageCard />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 1080, transform: slide > 0.5 ? `translateX(${slide}px)` : undefined }}>
        <PanelTwin />
        <GlossChip words={CHIP_ROVO} x={PANEL.x} y={PANEL.y - 72} out={T.chipOut} />
        <GlossChip words={CHIP_AGENT} x={AGENT_CHIP.x} y={AGENT_CHIP.y} out={T.agentChipOut} />
      </div>
      <CarriedWords />
    </Camera3D>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Station 1: the one real proof (screen px): the real answer at 1:1, grown out of the twin's first line
// ---------------------------------------------------------------------------------------------------------------------

const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** The twin's first answer line on screen at a frame. */
const twinLine1 = (f: number) => screenRectOf(rovoPose(f), scaled(PR.answerLines[0]));
const PROOF = (() => {
  const base = { crop: PROOF_CROP, scale: 1 };
  const { outer } = proofRect({ ...base, x: 0, y: 0 });
  const e = proofPoint({ ...base, x: 0, y: 0 }, ANSWER_BOX.line1);
  const target = twinLine1(T.proofAt);
  const x = Math.round(clampTo(target.x + target.w / 2 - (e.x + e.w / 2), 40, W - 40 - outer.w));
  const y = Math.round(clampTo(target.y + target.h / 2 - (e.y + e.h / 2), 84, 1080 - 40 - outer.h));
  const placed = { ...base, x, y };
  return { placed, outer: proofRect(placed).outer, line1: proofPoint(placed, ANSWER_BOX.line1) };
})();
const capRect = (r: Rect): Box => [r.x, r.y, r.w, r.h];
const PROOF_MIST = {
  possibly: proofPoint(PROOF.placed, capRect(ANSWER_BOX.possiblyStale)),
  s2a: proofPoint(PROOF.placed, capRect(ANSWER_BOX.sentence2a)),
  s2b: proofPoint(PROOF.placed, capRect(ANSWER_BOX.sentence2b)),
};
/** The mat, its tag above it and its float shadow: where the morph's clip grows to and the rebuild's wipe runs. */
const PROOF_FRAME: Rect = { x: PROOF.outer.x - 90, y: PROOF.outer.y - 70, w: PROOF.outer.w + 180, h: PROOF.outer.h + 240 };

/** A proof never sits frozen: its mat drifts sideways (0.6 px a frame) with a 3 px sway while it is up. */
const driftAt = (frame: number) => {
  const t = Math.max(0, frame - T.proofAt);
  return { dx: t * 0.6, dy: Math.sin(t / 14) * 3 };
};
const shift = (r: Rect, d: { dx: number; dy: number }): Rect => ({ ...r, x: r.x + d.dx, y: r.y + d.dy });

const RovoProof: React.FC = () => {
  const frame = useCurrentFrame();
  const d = driftAt(frame);
  return (
    <AbsoluteFill style={{ transform: `translate(${d.dx}px, ${d.dy}px)` }}>
      <ProofFrame capture={ANSWER_STILL} {...PROOF.placed} at={T.proofAt} enter="none" exit="none" tag={ROVO_TAG} />
      {/* Mist, never paint: the page's state as the twin marked it, then the reason on "and why" */}
      <MistBand rect={PROOF_MIST.possibly} at={T.proofAt - 4} />
      <MistBand rect={PROOF_MIST.s2a} at={T.mist2a} />
      <MistBand rect={PROOF_MIST.s2b} at={T.mist2b} dur={8} />
    </AbsoluteFill>
  );
};

const StationRovo: React.FC = () => {
  const frame = useCurrentFrame();
  const world = <RovoWorld />;
  let body: React.ReactNode = world;
  if (frame >= T.proofAt && frame < T.rebuildAt) {
    body = <MorphToReal at={T.proofAt} fromRect={twinLine1(T.proofAt)} toRect={PROOF.line1} twin={world} proof={<RovoProof />} frameRect={PROOF_FRAME} out={T.rebuildAt} />;
  } else if (frame >= T.rebuildAt && frame < T.rebuildAt + 10) {
    const d = driftAt(T.rebuildAt);
    body = (
      <RebuildFromReal at={T.rebuildAt} dur={4} fromRect={shift(PROOF.line1, d)} toRect={twinLine1(T.rebuildAt)} twin={world} proof={<RovoProof />} frameRect={shift(PROOF_FRAME, d)} />
    );
  }
  return (
    <Stage world="day" motif="grid" light={["40%", "34%"]}>
      {body}
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Station 2: the coding assistant, in plain words
// ---------------------------------------------------------------------------------------------------------------------

const CHAT_H = chatLayout().height;
const CHAT_X = Math.round((W - CHAT.w) / 2);
const CHAT_Y = Math.round((1080 - (64 + CHAT_H + 28 + 54)) / 2 + 64);
const CHIP_MCP: GlossWord[] = ["MCP", "· an", "open", "standard", "for", "AI", "tools"].map((text, i) => ({ text, at: T.mcpWords[i] }));
/** The carry cut: the chat camera starts so the reply's "Possibly stale" sits exactly where the twin's was. */
const STATUS_STAGE: Rect = (() => {
  const r = chatStatusRect();
  return { x: CHAT_X + r.x, y: CHAT_Y + r.y, w: r.w, h: r.h };
})();
const TWIN_WORDS_SCREEN = screenRectOf(cam3At(T.cutChat - 1, ROVO_KEYS, ROVO_CAM), scaled(SLOT));
const CHAT_KEYS: Cam3Key[] = [
  { at: T.cutChat, dur: 0, to: cameraToMatch(TWIN_WORDS_SCREEN, STATUS_STAGE) },
  // then it settles onto the card (fast at the cut, slow after), the reply a little forward, the gloss's row below
  { at: T.cutChat, dur: T.settle, to: { x: 920, y: 580, zoom: 1.05 }, ease: EASE.expoOut },
  // on "an open standard" it drifts down to the gloss under the card (a small beat, not a new shot)
  { at: T.pushGloss, dur: 30, to: { x: 900, y: 612, zoom: 1.07 }, ease: EASE.standard },
];
const CALL_STAGE: Rect = (() => {
  const r = chatCallRect();
  return { x: CHAT_X + r.x, y: CHAT_Y + r.y, w: r.w, h: r.h };
})();

const StationChat: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage world="day" motif="tide" tide={{ top: 840, bottom: 1080 }} light={["50%", "38%"]}>
      <Camera3D keys={CHAT_KEYS} creep={1.2} float={4} seed="agents-chat">
        <div style={{ position: "absolute", left: CHAT_X, top: CHAT_Y - 64, opacity: tween(frame, T.cutChat + 2, T.cutChat + 6, 0, 1, EASE.linear) }}>
          <InkLabel icon="eye" size={28}>
            {MCP_TAG}
          </InkLabel>
        </div>
        {/* arrives holding the whole exchange (the carry cut lands on its reply) */}
        <McpChat x={CHAT_X} y={CHAT_Y} enter={T.cutChat - 20} call={T.cutChat - 20} status={T.cutChat - 20} guidance={T.cutChat - 20} />
        {/* "the same check": the call itself, marked */}
        <MistBand rect={CALL_STAGE} at={T.callMark} world="night" />
        <GlossChip words={CHIP_MCP} x={CHAT_X} y={CHAT_Y + CHAT_H + 28} />
      </Camera3D>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------------------------------

/** Effects at or under 35 a minute, each well under the voice (V5 section 8). The scene cuts' sounds are the kit's. */
const Sounds: React.FC = () => (
  <>
    <Sfx id="type-burst" at={T.typeAt + 1} gainDb={-8} />
    <Sfx id="whoosh-short" at={T.carryLand - 7} gainDb={-8} />
    <Sfx id="tick-soft" at={T.carryLand} gainDb={-2} />
    <Sfx id="tick" at={T.proofAt} gainDb={-5} />
    <Sfx id="tick" at={T.rebuildAt + 2} gainDb={-6} />
    <Sfx id="tick" at={T.cutChat} gainDb={-2} />
    <Sfx id="pop" at={T.mcpWords[0] + 3} gainDb={-5} />
  </>
);

const AGENTS: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      {frame < T.cutChat ? <StationRovo /> : <StationChat />}
      <Sounds />
    </AbsoluteFill>
  );
};

export default AGENTS;
