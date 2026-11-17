import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import type { IconName } from "../../../brand/icons";
import { Cursor } from "../../../components/Cursor";
import { QF_CARD_UI, QuickFixCard, STR } from "../../../components/P4/ReviewPanelTwin";
import { Button } from "../../../components/P4/ui";
import { EASE, tween } from "../../../lib/time";
import {
  Camera3D,
  DAY,
  elevAt,
  floatAt,
  GrowReveal,
  InkLabel,
  MistBand,
  MorphToReal,
  ProofFrame,
  proofRect,
  RebuildFromReal,
  Stage,
  type Cam3Key,
  type CameraOptions,
  type Rect,
} from "../../../v4/kit";
import { agentPanelRects, PageTwin, pageRects, textWidth, type PageTwinProps } from "../../../v4/twins";
import { PANEL } from "../PROBLEM";
import { FIXED_CMD, PAYOFF_SOURCE, PayoffShot } from "../PROBLEM/Payoff";
import { capAt, capRect, center, placeOn, screenAt, type Box } from "./geom";
import { Clock307, DRAFT, DraftCard, draftCodeRect, ReaderChip, type ChipStatus } from "./parts";
import { T } from "./timing";

/**
 * FIX · a person fixes it (S16 to S18; video/V5.md sections 5 and 8). Round 3: one still world and cards lifted over
 * it; each real proof is changed in place on its card (the kit's MorphToReal and RebuildFromReal on the card's layer
 * only, never a whole-frame swap); the only cut is the carry into the 3 a.m. payoff, on a beat. No paint on any real
 * capture (amber only on our crafted twins; Mist bands only).
 *
 *   World      the runbook (flagged: its byline item is the one amber) on the right and its two readers on the left,
 *              PROMISE's chips "AI agents" and "People". The page racks back (dim, soft, grey) while a card is up; the
 *              readers never do.
 *   S16        "AI agents · never edit the page" is written in on "never edit"; "People · edit the page" lifts in on
 *              "A person does"; the quick fix card ("Linked file renamed · one-click fix, no AI") flies out of step 2's
 *              dead path and lands big on "the rename"; it turns into the real card in place (p4-review-rec) with the
 *              real click on "one click" and Mist on "No AI used." on "no AI"; back to the card, done, which flies
 *              back into step 2 (now renamed) as S16 ends
 *   S17        our agent's draft ("Drafted by our agent · applied only by a person", labelled "Other text on the page
 *              · drafted by our agent") flies out of "AI agents" and lands big on "drafts"; on "a renamed timeout
 *              setting" the old name sits on the drift's amber and "_SECS" is written in (one baseline, no empty frame); the real draft in place
 *              (p4-draft-diff), Mist on "Nothing changes until you accept."; the Accept fix button lifts on "until"
 *              and turns into the real footer (p4-accept-rec): the cursor's click on the real Accept fix on "accepts",
 *              then the same real panel's "Accepted. A new page version names PR #482."
 *   S18        the draft leaves; the page comes forward with step 2 accepted; on "Verified" (the snap, the score's
 *              downbeat) the byline slip-swaps to "Verified · Doc Drift"; the real panel moves to its own line,
 *              "Verified by Razvan Statescu, just now.", on "again" (in its own place, never at the byline); it drops
 *              on "Now" and the agents read "Safe to cite"; on the beat before "with the right step" the window grows
 *              out of step 2's command into 3 a.m. (the Night owner's PayoffShot, with a 03:07 clock): the same
 *              assistant answers with the right step and cites the page as Verified. JIRA keeps the payoff on screen
 *              under S19's first words and leaves Night with a slip.
 */

// =====================================================================================================================
// The world: the runbook and its readers
// =====================================================================================================================

const PAGE_K = 1.4;
const PAGE_BASE: PageTwinProps = { world: "day", doc: "runbook", k: PAGE_K, x: 800, y: 96, step2: "old", byline: { kind: "dds", state: "possibly_stale" } };
/** Step 2 is renamed by the quick fix as S16 ends, then takes the accepted draft; the byline slip-swaps on "Verified". */
const pageAt = (frame: number): PageTwinProps => ({
  ...PAGE_BASE,
  step2: frame < T.morph - 2 ? { morphAt: T.qfOut + 4, from: "old", to: "renamed" } : { morphAt: T.morph, from: "renamed", to: "new" },
  byline: { kind: "dds", state: "verified", from: "possibly_stale", at: T.bylineAt },
});
const RP = pageRects(PAGE_BASE);
const RN = pageRects({ ...PAGE_BASE, step2: "new" });
/** Step 2's dead path, `./scripts/rollback.sh`: the quick fix card flies out of it and back into it. */
const DEAD_PATH: Rect = RP.tokens["./scripts/rollback.sh"] ?? RP.step2Code;

// The camera is still (no keys after the first): a slow creep and the hand-held float keep the frame alive.
const W_FRAME = { x: 985, y: 534, zoom: 1.1 };
const W_OPTS: CameraOptions = { base: W_FRAME, seed: "fix-world", creep: 0.4 };
const W_KEYS: Cam3Key[] = [{ at: 0, dur: 0, to: W_FRAME }];

/** The page racks back while a card is up (the readers stay sharp). */
const rackAt = (f: number) =>
  Math.max(
    tween(f, T.qfLift, T.qfLift + 16, 0, 1, EASE.cubicInOut) * (1 - tween(f, T.qfOut, T.qfOut + 10, 0, 1, EASE.cubicInOut)),
    tween(f, T.draftFly, T.draftFly + 16, 0, 1, EASE.cubicInOut) * (1 - tween(f, T.cardsOut, T.cardsOut + 16, 0, 1, EASE.cubicInOut)),
  );
const rackStyle = (r: number): React.CSSProperties =>
  r <= 0.001 ? {} : { opacity: 1 - 0.4 * r, filter: `blur(${(2.4 * r).toFixed(2)}px) grayscale(${(0.9 * r).toFixed(3)})` };

const CHIP_X = 330;
/** PROMISE's two readers, centred on the page: "AI agents" (there from the start) and "People" (in on "A person"). */
const CHIPS = { agents: 400, people: 526 } as const;
const STATUS: Record<"never" | "edit" | "cite", ChipStatus> = {
  never: { icon: "lock", text: "never edit the page" },
  edit: { icon: "pencil", text: "edit the page" },
  cite: { icon: "check", text: "Safe to cite" },
};
/** The agents' status: written in on "never edit", "Safe to cite" on "Now agents". */
const agentsStatus = (f: number) =>
  f < T.citeAt - 8
    ? { status: null, next: { status: STATUS.never, at: T.readOnly } }
    : { status: STATUS.never, next: { status: STATUS.cite, at: T.citeAt, tone: "verified" as const } };

const World: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Camera3D keys={W_KEYS} {...W_OPTS}>
      <div style={{ position: "absolute", inset: 0, ...rackStyle(rackAt(frame)) }}>
        <PageTwin {...pageAt(frame)} />
      </div>
      <ReaderChip icon="comment" label="AI agents" {...agentsStatus(frame)} x={CHIP_X} y={CHIPS.agents} appear />
      <ReaderChip icon="user" label="People" status={STATUS.edit} x={CHIP_X} y={CHIPS.people} at={T.personIn} />
    </Camera3D>
  );
};

// =====================================================================================================================
// Shared: cards over the world, labels, proofs placed in screen space
// =====================================================================================================================

/** The lifted cards' own hand-held float (screen px), so a held card is never frozen. */
const fl = (f: number) => floatAt(f, 3, "fix-cards");
const shift = (r: Rect, f: number): Rect => {
  const o = fl(f);
  return { ...r, x: r.x + o.x, y: r.y + o.y };
};

/** A small dark label over a card (right-aligned to `right`), in and out with its card. */
const Label: React.FC<{ right: number; y: number; at: number; out: number; icon: IconName; children: React.ReactNode }> = ({ right, y, at, out, icon, children }) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > out + 8) return null;
  const up = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
  const dn = tween(frame, out, out + 7, 0, 1, EASE.expoIn);
  const o = fl(frame);
  return (
    <div style={{ position: "absolute", right: 1920 - right - o.x, top: y + o.y, opacity: Math.min(1, up * 3) * (1 - dn), transform: `translateY(${((1 - up) * 14 + dn * 10).toFixed(2)}px)` }}>
      <InkLabel icon={icon} size={24}>
        {children}
      </InkLabel>
    </div>
  );
};

/** A card's flight between a small source rect and its place (expo out in, expo in out): the transform to apply. */
const flight = (place: Rect, from: Rect, t: number): string | undefined => {
  if (t >= 1) return undefined;
  const s = from.w / place.w + (1 - from.w / place.w) * t;
  const cx = from.x + from.w / 2 + (place.x + place.w / 2 - (from.x + from.w / 2)) * t;
  const cy = from.y + from.h / 2 + (place.y + place.h / 2 - (from.y + from.h / 2)) * t;
  return `translate(${(cx - s * (place.x + place.w / 2)).toFixed(2)}px, ${(cy - s * (place.y + place.h / 2)).toFixed(2)}px) scale(${s.toFixed(4)})`;
};

// =====================================================================================================================
// S16 · the quick fix
// =====================================================================================================================

const QF_K = 2.2;
const QF: Rect = { x: 760, y: 160, w: QF_CARD_UI.w * QF_K, h: QF_CARD_UI.h * QF_K };
const QF_BUTTON: Rect = { x: QF.x + 14 * QF_K, y: QF.y + (QF_CARD_UI.h - 13 - 36) * QF_K, w: textWidth(STR.qfButton, { size: 14 * QF_K, weight: 600 }) + 30 * QF_K, h: 36 * QF_K };
const DEAD_ON_LIFT = screenAt(DEAD_PATH, T.qfLift, W_KEYS, W_OPTS);
const DEAD_ON_OUT = screenAt(DEAD_PATH, T.qfOut + 6, W_KEYS, W_OPTS);

/** The crafted quick fix card: out of step 2's dead path on "the rename", done after the proof, back into step 2. */
const QfCard: React.FC = () => {
  const frame = useCurrentFrame();
  const inT = tween(frame, T.qfLift, T.qfLand, 0, 1, EASE.expoOut);
  const outT = tween(frame, T.qfOut, T.qfOut + 9, 0, 1, EASE.expoInOut);
  const done = tween(frame, T.proofQEnd - 2, T.proofQEnd + 4, 0, 1, EASE.expoOut);
  const tf = frame < T.qfOut ? flight(QF, DEAD_ON_LIFT, inT) : flight(QF, DEAD_ON_OUT, 1 - outT);
  const o = fl(frame);
  const opacity = Math.min(1, (frame - T.qfLift + 1) / 3) * (1 - tween(frame, T.qfOut + 5, T.qfOut + 9, 0, 1, EASE.linear));
  return (
    <AbsoluteFill style={{ transform: `translate(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px)` }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: tf, opacity }}>
        <div style={{ position: "absolute", left: QF.x, top: QF.y, borderRadius: 12 * QF_K, boxShadow: elevAt(3) }}>
          <QuickFixCard k={QF_K} done={done} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// The real card (p4-review-rec, the Quick fix at 38.308 s) in place: its "Replace in 1 place" on the crafted button.
const PQ_CROP: Box = [1150, 1320, 1250, 325];
const PQ_BTN: Box = [1194, 1545, 286, 63];
const PQ = placeOn(PQ_CROP, 0.9, PQ_BTN, QF_BUTTON, T.proofQ);
const PQ_DUR = T.proofQEnd + 8 - T.proofQ;
const PQ_FROM = 38.308 - (T.realClick - T.proofQ) / 30;
const ProofQ = (
  <ProofFrame
    capture="p4-review-rec"
    crop={PQ.crop}
    scale={PQ.scale}
    x={PQ.x}
    y={PQ.y}
    at={T.proofQ}
    dur={PQ_DUR}
    creep={PQ.creep}
    enter="none"
    exit="none"
    video={{ from: PQ_FROM, to: PQ_FROM + PQ_DUR / 30 }}
    tag="Recorded in Confluence"
  />
);
const PQ_CLICK = capAt(PQ, 1337, 1577, T.realClick);
const PQ_NO_AI = capRect(PQ, [1496, 1500, 130, 28], T.noAi + 5);

const QuickFix: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.qfLift || frame > T.qfOut + 10) return null;
  let card: React.ReactNode = <QfCard />;
  if (frame >= T.proofQ && frame < T.proofQEnd) {
    card = (
      <>
        <MorphToReal at={T.proofQ} fromRect={shift(QF_BUTTON, T.proofQ)} toRect={capRect(PQ, PQ_BTN, T.proofQ)} frameRect={proofRect(PQ).outer} twin={<QfCard />} proof={ProofQ} out={T.proofQEnd + 40} />
        <Cursor
          points={[
            { frame: T.proofQ + 2, x: PQ_CLICK[0] + 70, y: PQ_CLICK[1] + 52, cursor: "pointer" },
            { frame: T.realClick, x: PQ_CLICK[0], y: PQ_CLICK[1], click: true, cursor: "pointer", travel: 8 },
          ]}
          showAt={T.proofQ + 2}
          hideAt={T.proofQEnd - 8}
        />
        {/* the real sentence, marked on "no AI" (a Mist band; nothing painted on the capture) */}
        {frame >= T.noAi ? <MistBand rect={PQ_NO_AI} at={T.noAi} dur={10} /> : null}
      </>
    );
  } else if (frame >= T.proofQEnd) {
    card = <RebuildFromReal at={T.proofQEnd} fromRect={capRect(PQ, PQ_BTN, T.proofQEnd)} toRect={shift(QF_BUTTON, T.proofQEnd)} twin={<QfCard />} proof={ProofQ} />;
  }
  return (
    <AbsoluteFill>
      {card}
      <Label right={QF.x + QF.w} y={QF.y - 57} at={T.qfLift + 4} out={T.qfOut} icon="rename">
        Linked file renamed · one-click fix, no AI
      </Label>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// S17 · our agent's draft, and a person's Accept
// =====================================================================================================================

const DR: Rect = { x: 760, y: 210, w: DRAFT.w, h: DRAFT.h };
const DR_CODE = draftCodeRect(DR.x, DR.y);
const ACC_K = 2;
const ACC_W = textWidth(STR.acceptFix, { size: 14 * ACC_K, weight: 600 }) + 30 * ACC_K;
const ACC: Rect = { x: DR.x + DR.w - ACC_W, y: DR.y + DR.h + 63, w: ACC_W, h: 36 * ACC_K };
/** The "AI agents" chip on the screen as our agent's draft flies out of it. */
const AGENT_ON_FLY = screenAt({ x: CHIP_X, y: CHIPS.agents, w: 400, h: 100 }, T.draftFly, W_KEYS, W_OPTS);

/** The crafted draft (and, from "until", the Accept fix button under it): leaves dimmed behind the real panel. */
const DraftLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const fly = tween(frame, T.draftFly, T.draftLand, 0, 1, EASE.expoOut);
  const accIn = tween(frame, T.acceptIn, T.acceptIn + 12, 0, 1, EASE.expoOut);
  const gone = tween(frame, T.cardsOut, T.cardsOut + 8, 0, 1, EASE.expoIn);
  const o = fl(frame);
  return (
    <AbsoluteFill style={{ transform: `translate(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px)`, opacity: (1 - gone) * Math.min(1, (frame - T.draftFly + 1) / 3) }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: flight(DR, AGENT_ON_FLY, fly) }}>
        <DraftCard x={DR.x} y={DR.y} drift={T.drift} replace={T.replace} />
      </div>
      {accIn > 0 ? (
        <div style={{ position: "absolute", left: ACC.x, top: ACC.y, opacity: Math.min(1, accIn * 3), transform: `translateY(${((1 - accIn) * 20).toFixed(2)}px)`, borderRadius: 8 * ACC_K, boxShadow: elevAt(2) }}>
          <Button k={ACC_K} kind="primary">
            {STR.acceptFix}
          </Button>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// The real draft (p4-draft-diff: the diff, its rationale and "Drafted by Drift Reviewer from PR #482. Nothing changes
// until you accept."), in place: its "export ROLLBACK_TIMEOUT_SECS=300" on the crafted code line. The crop's right edge
// crosses the diff's empty grey box (the code ends at x 2121), so its edge check is off.
const PR_CROP: Box = [1176, 1325, 1040, 345];
const PR_LINE: Box = [1288, 1440, 466, 22];
const PR = placeOn(PR_CROP, 0.9, PR_LINE, DR_CODE, T.proofR);
const PR_DUR = T.proofREnd + 8 - T.proofR;
const ProofR = (
  <ProofFrame capture="p4-draft-diff" crop={PR.crop} scale={PR.scale} x={PR.x} y={PR.y} at={T.proofR} dur={PR_DUR} creep={PR.creep} enter="none" exit="none" cropCheck={false} tag="Recorded in Confluence" />
);
const PR_NOTHING = capRect(PR, [1658, 1627, 382, 23], T.nothingMark + 5);

// The real footer (p4-accept-rec at 11.97 s), in place: its Accept fix on the crafted button. The recording's own
// click (12.373 s) lands on "accepts"; then the same panel at 18 s shows "Accepted. A new page version names PR #482."
// (the notice's first line; the crop's edges cross its empty green fill, so its edge check is off), and on "again" its
// own line "Verified by Razvan Statescu, just now." (the panel's header line, as p4-accepted shows it).
const PA_CROP: Box = [1176, 1846, 870, 156];
const PA_BTN: Box = [1837, 1862, 183, 63];
// a low creep: the sentence crop ends 6 capture px after "now.", and the creep counts from the footer (3 s earlier)
const PA_PLACE = placeOn(PA_CROP, 0.9, PA_BTN, ACC, T.proofA, 0.6);
const PA_DUR = T.proofAEnd - T.proofA;
const PA_FROM = 12.373 - (T.acceptClick - T.proofA) / 30;
const ProofA = (
  <ProofFrame
    capture="p4-accept-rec"
    crop={PA_PLACE.crop}
    scale={PA_PLACE.scale}
    x={PA_PLACE.x}
    y={PA_PLACE.y}
    at={T.proofA}
    dur={PA_DUR}
    creep={PA_PLACE.creep}
    enter="none"
    exit="drop"
    cropCheck={false}
    video={{
      from: PA_FROM,
      to: 18.2 + (T.proofAEnd + 12 - T.verifiedJump) / 30,
      jumps: [
        { at: T.acceptedJump, to: 18.0, crop: [1190, 506, 840, 70] },
        { at: T.verifiedJump, to: 18.2, crop: [1150, 318, 526, 66] },
      ],
    }}
    tag="Recorded in Confluence"
  />
);
const PA_CLICK = capAt(PA_PLACE, PA_BTN[0] + PA_BTN[2] / 2, PA_BTN[1] + PA_BTN[3] / 2, T.acceptClick);

const Draft: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.draftFly) return null;
  let layer: React.ReactNode = frame < T.cardsOut + 8 ? <DraftLayer /> : null;
  if (frame >= T.proofR && frame < T.proofREnd) {
    layer = (
      <>
        <MorphToReal at={T.proofR} fromRect={shift(DR_CODE, T.proofR)} toRect={capRect(PR, PR_LINE, T.proofR)} frameRect={proofRect(PR).outer} twin={<DraftLayer />} proof={ProofR} out={T.proofREnd + 40} />
        {frame >= T.nothingMark ? <MistBand rect={PR_NOTHING} at={T.nothingMark} dur={10} /> : null}
      </>
    );
  } else if (frame >= T.proofREnd && frame < T.proofA) {
    layer = <RebuildFromReal at={T.proofREnd} fromRect={capRect(PR, PR_LINE, T.proofREnd)} toRect={shift(DR_CODE, T.proofREnd)} twin={<DraftLayer />} proof={ProofR} />;
  } else if (frame >= T.proofA) {
    layer = (
      <>
        <MorphToReal
          at={T.proofA}
          fromRect={shift(ACC, T.proofA)}
          toRect={capRect(PA_PLACE, PA_BTN, T.proofA)}
          frameRect={proofRect(PA_PLACE).outer}
          twin={frame < T.cardsOut + 8 ? <DraftLayer /> : null}
          proof={ProofA}
          out={T.proofAEnd + 60}
        />
        <Cursor
          points={[
            { frame: T.proofA + 2, x: PA_CLICK[0] + 96, y: PA_CLICK[1] + 70, cursor: "pointer" },
            { frame: T.acceptClick, x: PA_CLICK[0], y: PA_CLICK[1], click: true, cursor: "pointer", travel: 9 },
          ]}
          showAt={T.proofA + 2}
          hideAt={T.acceptClick + 7}
        />
      </>
    );
  }
  return (
    <AbsoluteFill>
      {layer}
      <Label right={DR.x + DR.w} y={DR.y - 57} at={T.draftFly + 6} out={T.proofA} icon="words">
        Other text on the page · drafted by our agent
      </Label>
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// The scene
// =====================================================================================================================

/** The window into 3 a.m. grows out of step 2's command (the right step), on the page as the carry starts. */
const CMD_ON_CARRY = screenAt(RN.step2Code, T.payoff, W_KEYS, W_OPTS);
/**
 * The payoff's command text on the screen on its first frame (as PayoffShot frames it: PROBLEM's last pose, pushed in
 * 1.28x on the command, with its hand-held float), so the carry can start with it exactly on step 2's command.
 */
const PAYOFF_CMD: Rect = (() => {
  const R = agentPanelRects({ ...PANEL, answer: { ...PANEL.answer, lines: [PANEL.answer.lines[0], FIXED_CMD] }, source: { text: PAYOFF_SOURCE, at: 0 } });
  const cmd = R.answerLines[R.answerLines.length - 1];
  const code = (PANEL.size ?? 40) * 0.88;
  const z = 1.28;
  const f = floatAt(T.payoff, 5, "p-payoff");
  const tx = cmd.x + 0.28 * code;
  const ty = cmd.y + (cmd.h - code * 1.3) / 2;
  return { x: 960 + (tx - 960) * z - f.x, y: 540 + (ty - (cmd.y + cmd.h / 2)) * z - f.y, w: textWidth(FIXED_CMD, { size: code, mono: true }) * z, h: code * 1.3 * z };
})();

const Day: React.FC = () => (
  <Stage world="day" motif="grid" light={["58%", "34%"]}>
    <World />
    <QuickFix />
    <Draft />
  </Stage>
);

/**
 * 3 a.m., matched: on the carry's first frame the answer's command sits exactly on the page's step 2 command (same
 * place, same size), then it relaxes to PROBLEM's framing a little faster than the window grows (so the window never
 * reaches the scaled frame's edge).
 */
const Night: React.FC = () => {
  const frame = useCurrentFrame();
  const g = tween(frame, T.payoff, T.payoff + 16, 0, 1, EASE.expoInOut);
  const t = Math.min(1, g * 1.4);
  const s0 = CMD_ON_CARRY.w / PAYOFF_CMD.w;
  const s = s0 + (1 - s0) * t;
  const [sx, sy] = center(CMD_ON_CARRY);
  const [px, py] = center(PAYOFF_CMD);
  const cx = sx + (px - sx) * t;
  const cy = sy + (py - sy) * t;
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: t < 1 ? `translate(${(cx - px * s).toFixed(2)}px, ${(cy - py * s).toFixed(2)}px) scale(${s.toFixed(4)})` : undefined }}>
      <PayoffShot at={T.payoff} markAt={T.payoffMark} sourceAt={T.payoffSource} />
      <Clock307 at={T.clock} x={66} y={30} />
    </AbsoluteFill>
  );
};

const FIX: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <GrowReveal at={T.payoff} dur={16} from={CMD_ON_CARRY} pad={[16, 12]} darken={0.5} outgoing={<Day />} incoming={<Night />} />
    {/* S16: "Read only" on "never"; the card lands on "the rename"; the real click */}
    <Sfx id="tick-soft" at={T.readOnly + 2} gainDb={-10} />
    <Sfx id="pop" at={T.qfLand - 1} gainDb={-12} />
    <Sfx id="click" at={T.realClick} gainDb={-8} />
    {/* S17: the draft lands; the click on the real Accept fix */}
    <Sfx id="pop" at={T.draftLand - 1} gainDb={-12} />
    <Sfx id="click" at={T.acceptClick} gainDb={-8} />
    {/* S18: the snap on the score's downbeat (the film's one snap) as the byline swaps; the carry into 3 a.m., started
        on the beat, its whoosh peaking as the window opens widest (the payoff's own tick and chime follow; JIRA plays
        the chime's tail, the L-cut) */}
    <Sfx id="snap" at={T.hit - 2} gainDb={-7} />
    <Sfx id="whoosh-short" at={T.payoff + 4} gainDb={-10} />
  </AbsoluteFill>
);

export default FIX;
