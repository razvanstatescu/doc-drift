import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { Cursor } from "../../../components/Cursor";
import { QF_CARD_UI, QuickFixCard, STR } from "../../../components/P4/ReviewPanelTwin";
import { Button } from "../../../components/P4/ui";
import { EASE, tween } from "../../../lib/time";
import {
  Camera3D,
  cameraToMatch,
  DAY,
  FONT,
  GrowReveal,
  MaskLine,
  MistBand,
  MorphToReal,
  ProofFrame,
  proofRect,
  PushSwap,
  RebuildFromReal,
  Stage,
  type Cam3Key,
  type CameraOptions,
  type Rect,
} from "../../../v4/kit";
import { bylineItemSize, PageTwin, pageRects, textWidth, type PageTwinProps } from "../../../v4/twins";
import { inProof, screenAt } from "./geom";
import { PayoffShot } from "../PROBLEM/Payoff";
import { DRAFT, DraftCard, draftCodeRect, MarkTile, ReaderChip, type ChipStatus } from "./parts";
import { T } from "./timing";

/**
 * FIX · a person fixes it (S16 to S18; video/V5.md sections 5 and 8). Round 2: crafted leads tell each line, big; short
 * real proofs at reading size show it is real (the kit's MorphToReal, then RebuildFromReal back, tagged once each); no
 * paint on any real capture (amber only on our crafted twins).
 *
 *   P  0 .. qf       the runbook (flagged: its byline item is the one amber) and its readers, PROMISE's chips: the two
 *                    agents' status slips to "Read only" on "never edit"; "People" lifts in on "A person does" with
 *                    "Edits the page"                                                                           (S16)
 *   Q  qf .. r       carry cut: the quick fix card grows out of step 2's dead path on "the rename", big; the real
 *                    click (p4-review-rec 38.308 s) as a short 1:1 proof on "one click"; back to the card, now with its
 *                    result, Mist on "No AI used." on "no AI"
 *   R  r .. v        locked push to our agent, Drift Reviewer; its draft lands big on "drafts"; the change itself on "a
 *                    renamed timeout setting": `ROLLBACK_TIMEOUT` struck and replaced by `ROLLBACK_TIMEOUT_SECS` (the
 *                    kit's EditLine); the real draft as a short proof, Mist on its "Nothing changes until you accept." on
 *                    "Nothing"; a person's click on Accept fix on "accepts"                                       (S17)
 *   V  v .. payoff   locked push back to the page, on its header, big: on "Verified" (snapBack) the byline item
 *                    slip-swaps to "Verified · Doc Drift" with the snap and its amber leaves; the real "Verified by Razvan
 *                    Statescu, just now." (p4-accepted) as a short proof on "again"; on "Now agents" the camera pulls
 *                    back to the readers: the agents' status turns "Safe to cite" on "cite"
 *   payoff           cut on "with the right step" to 3 a.m. (the Night owner's PayoffShot): the same assistant now
 *                    answers with the right step, citing "Payments rollback runbook · Verified"; its chime rings on over
 *                    the plain cut into JIRA (the L-cut: JIRA plays the chime's tail)                              (S18)
 */

// =====================================================================================================================
// P and V · the runbook and its readers
// =====================================================================================================================

const PAGE_X = 800;
const PAGE_Y = 96;
const PAGE_K = 1.4;
const PAGE_P: PageTwinProps = { world: "day", doc: "runbook", k: PAGE_K, x: PAGE_X, y: PAGE_Y, step2: "old", byline: { kind: "dds", state: "possibly_stale" } };
const RP = pageRects(PAGE_P);
/** Step 2's dead path, `./scripts/rollback.sh`: the object the quick fix card grows out of. */
const DEAD_PATH: Rect = RP.tokens["./scripts/rollback.sh"] ?? RP.step2Code;
const PAGE_V: PageTwinProps = {
  ...PAGE_P,
  // the quick fix renamed the path; the accepted draft lands under the push back (renamed -> new)
  step2: { morphAt: T.morph, from: "renamed", to: "new" },
  // the slip swap: the lit "Possibly stale" leaves with its amber at bylineAt, "Verified" is readable 3 frames later
  byline: { kind: "dds", state: "verified", from: "possibly_stale", at: T.bylineAt },
};
const RV = pageRects(PAGE_V);

const CHIP_X = 330;
const CHIPS = { rovo: 250, code: 366, people: 560 } as const;
const STATUS: Record<string, ChipStatus> = {
  stale: { icon: "slip", text: "Possibly stale" },
  readOnly: { icon: "lock", text: "Read only" },
  edits: { icon: "pencil", text: "Edits the page" },
  verified: { icon: "check", text: "Verified" },
  cite: { icon: "check", text: "Safe to cite" },
};

const P_FRAME = { x: 985, y: 534, zoom: 1.1 };
const P_OPTS: CameraOptions = { base: P_FRAME, seed: "fix-page" };
const P_KEYS: Cam3Key[] = [{ at: 0, dur: 0, to: P_FRAME }];

/** P: the page and its readers. */
const WorldP: React.FC = () => (
  <Stage world="day" motif="grid" light={["58%", "34%"]}>
    <Camera3D keys={P_KEYS} {...P_OPTS}>
      <PageTwin {...PAGE_P} />
      <ReaderChip icon="comment" label="Rovo agent" status={STATUS.stale} next={{ status: STATUS.readOnly, at: T.readOnly }} x={CHIP_X} y={CHIPS.rovo} appear />
      <ReaderChip icon="terminal" label="Coding assistant" status={STATUS.stale} next={{ status: STATUS.readOnly, at: T.readOnly + 2 }} x={CHIP_X} y={CHIPS.code} appear />
      <ReaderChip icon="user" label="People" status={STATUS.edits} x={CHIP_X} y={CHIPS.people} at={T.personIn} />
    </Camera3D>
  </Stage>
);

const V_OPTS: CameraOptions = { base: P_FRAME, seed: "fix-verified" };
/**
 * S18's framing: close on the page's header, the title's first letter to the lit item's last (its words about 55 px),
 * so the slip-swap to Verified is the one thing that changes.
 */
const ITEM_CAM = (() => {
  const left = RV.title.x;
  const right = RV.badge.x + bylineItemSize("possibly_stale", PAGE_K).w;
  return { x: (left + right) / 2, y: (RV.title.y + RV.byline.y + RV.byline.h) / 2 + 6, zoom: 3.0 };
})();
const V_KEYS: Cam3Key[] = [
  // the push back lands close on the byline item, still lit (the one decisive framing of S18)
  { at: T.v, dur: 0, to: ITEM_CAM },
  // "Now agents can cite it": back to the readers
  { at: T.pull, dur: 22, to: P_FRAME, ease: EASE.expoInOut },
];

/** V: the page verified, then its readers. */
const WorldV: React.FC = () => (
  <Stage world="day" motif="grid" light={["58%", "34%"]}>
    <Camera3D keys={V_KEYS} {...V_OPTS}>
      <PageTwin {...PAGE_V} />
      <ReaderChip icon="comment" label="Rovo agent" status={STATUS.readOnly} next={{ status: STATUS.cite, at: T.citeAt, tone: "verified" }} x={CHIP_X} y={CHIPS.rovo} appear />
      <ReaderChip icon="terminal" label="Coding assistant" status={STATUS.readOnly} next={{ status: STATUS.cite, at: T.citeAt + 2, tone: "verified" }} x={CHIP_X} y={CHIPS.code} appear />
      <ReaderChip icon="user" label="People" status={STATUS.edits} next={{ status: STATUS.verified, at: T.bylineAt, tone: "verified" }} x={CHIP_X} y={CHIPS.people} appear />
    </Camera3D>
  </Stage>
);

// The real "Verified by Razvan Statescu, just now." (p4-accepted: the panel after Accept fix), cropped to that sentence:
// the line above is under the panel's sticky header and "Watching 3 anchors." is left out.
const PV_CROP: [number, number, number, number] = [1150, 318, 526, 66];
const PV_SCALE = 1;
const PV_POS = { x: Math.round(960 - (526 + 28) / 2), y: 760 };
const PV_IMG = proofRect({ crop: PV_CROP, scale: PV_SCALE, ...PV_POS }).image;
/** The sentence's words in the proof (the element the byline item stands for). */
const PV_WORDS = inProof(PV_IMG, PV_CROP, PV_SCALE, [1169, 337, 499, 28]);
// The real sentence gets its own row, under the byline: it opens in place (its window grows from its own words, not
// from the byline item, whose row holds "By Razvan Statescu") and is wiped off in place (no match), so the two texts
// never share a baseline.
const ProofV = (
  <ProofFrame capture="p4-accepted" crop={PV_CROP} scale={PV_SCALE} {...PV_POS} at={T.proofV} dur={T.proofVEnd + 8 - T.proofV} enter="none" exit="none" tag="Recorded in Confluence" />
);

const ShotV: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.proofVEnd) return <MorphToReal at={T.proofV} fromRect={PV_WORDS} toRect={PV_WORDS} twin={<WorldV />} proof={ProofV} out={T.proofVEnd + 40} />;
  return <RebuildFromReal at={T.proofVEnd} fromRect={PV_WORDS} toRect={PV_WORDS} match={false} twin={<WorldV />} proof={ProofV} />;
};

// =====================================================================================================================
// Q · the quick fix
// =====================================================================================================================

const QF_K = 2.4;
const QF_W = QF_CARD_UI.w * QF_K;
const QF_H = QF_CARD_UI.h * QF_K;
const QF_X = Math.round(960 - QF_W / 2);
const QF_Y = 360;
const QF_RECT: Rect = { x: QF_X, y: QF_Y, w: QF_W, h: QF_H };
const Q_FRAME = { x: 960, y: 540, zoom: 1 };
const Q_OPTS: CameraOptions = { base: Q_FRAME, seed: "fix-qf" };
/** The card's first code chip, `scripts/rollback.sh` (its text box), on the stage. */
const CARD_PATH: Rect = (() => {
  const size = 14 * QF_K;
  const code = 0.88 * size;
  const x = QF_X + 14 * QF_K + textWidth("Replace ", { size, weight: 400 }) + 4 * QF_K;
  return { x, y: QF_Y + 13 * QF_K + (22 * QF_K - code * 1.25) / 2, w: textWidth("scripts/rollback.sh", { size: code, mono: true }), h: code * 1.25 };
})();
/** The page's `scripts/rollback.sh` (inside step 2's dead path) on screen at the carry. */
const PAGE_PATH: Rect = RP.tokens["scripts/rollback.sh"] ?? DEAD_PATH;
const Q_MATCH = cameraToMatch(screenAt(PAGE_PATH, T.qf, P_KEYS, P_OPTS), CARD_PATH);
const Q_KEYS: Cam3Key[] = [
  // the seam: the card's path sits exactly on the page's, then the camera eases out to the card
  { at: T.qf, dur: 0, to: Q_MATCH },
  { at: T.qf, dur: 24, to: Q_FRAME, ease: EASE.expoInOut },
];
/**
 * "No AI used." inside the card (the help line's second sentence), film px on the stage. The card's first sentence
 * wraps to two 22-unit lines at this width ("Replace scripts/rollback.sh with / scripts/rollback-v2.sh in 1 place."),
 * so the help line starts at 13 + 2 x 22 + 7 units.
 */
const NO_AI_RECT: Rect = (() => {
  const size = 12 * QF_K;
  const pre = textWidth("Suggested from PR #482. ", { size, weight: 400 });
  return { x: QF_X + 14 * QF_K + pre, y: QF_Y + (13 + 2 * 22 + 7) * QF_K, w: textWidth("No AI used.", { size, weight: 400 }), h: 17 * QF_K };
})();

const WorldQ: React.FC = () => {
  const frame = useCurrentFrame();
  const done = tween(frame, T.proofQEnd - 2, T.proofQEnd + 4, 0, 1, EASE.expoOut);
  return (
    <Stage world="day" motif="grid" light={["50%", "34%"]}>
      <Camera3D keys={Q_KEYS} {...Q_OPTS}>
        <div style={{ position: "absolute", left: QF_X, top: QF_Y - 76, fontFamily: FONT.sans, fontSize: 40, fontWeight: 600, letterSpacing: "-0.012em", color: DAY.text }}>
          {STR.quickFix}
        </div>
        <div style={{ position: "absolute", left: QF_X, top: QF_Y }}>
          <QuickFixCard k={QF_K} done={done} />
        </div>
        <MistBand rect={NO_AI_RECT} at={T.noAi} dur={10} />
      </Camera3D>
    </Stage>
  );
};

// The real click (p4-review-rec, the Quick fix card at 38.308 s), at 1:1, placed where the crafted card is.
const PQ_CROP: [number, number, number, number] = [1148, 1305, 1530, 340];
const PQ_SCALE = 1;
const PQ_CARD_CAP: [number, number, number, number] = [1168, 1390, 1503, 243];
const PQ_POS = { x: Math.round(960 - (1530 + 28) / 2), y: Math.round(QF_Y + QF_H / 2 - (PQ_CARD_CAP[1] - PQ_CROP[1] + PQ_CARD_CAP[3] / 2) * PQ_SCALE - 14) };
const PQ_IMG = proofRect({ crop: PQ_CROP, scale: PQ_SCALE, ...PQ_POS }).image;
const PQ_CARD = inProof(PQ_IMG, PQ_CROP, PQ_SCALE, PQ_CARD_CAP);
const PQ_CLICK = inProof(PQ_IMG, PQ_CROP, PQ_SCALE, [1337, 1577, 0, 0]);
const PQ_FROM = 38.308 - (T.realClick - T.proofQ) / 30;
const ProofQ = (
  <ProofFrame
    capture="p4-review-rec"
    crop={PQ_CROP}
    scale={PQ_SCALE}
    {...PQ_POS}
    at={T.proofQ}
    dur={T.proofQEnd + 8 - T.proofQ}
    enter="none"
    exit="none"
    video={{ from: PQ_FROM, to: PQ_FROM + (T.proofQEnd + 8 - T.proofQ) / 30 }}
    tag="Recorded in Confluence"
  />
);
const CARD_ON_PROOF = screenAt(QF_RECT, T.proofQ, Q_KEYS, Q_OPTS);
const CARD_ON_REBUILD = screenAt(QF_RECT, T.proofQEnd, Q_KEYS, Q_OPTS);

const ShotQ: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.proofQEnd)
    return (
      <AbsoluteFill>
        <MorphToReal at={T.proofQ} fromRect={CARD_ON_PROOF} toRect={PQ_CARD} twin={<WorldQ />} proof={ProofQ} out={T.proofQEnd + 40} />
        {frame >= T.proofQ ? (
          <Cursor
            points={[
              { frame: T.proofQ, x: PQ_CLICK.x + 60, y: PQ_CLICK.y + 44, cursor: "pointer" },
              { frame: T.realClick, x: PQ_CLICK.x, y: PQ_CLICK.y, click: true, cursor: "pointer", travel: 7 },
            ]}
            showAt={T.proofQ + 2}
            hideAt={T.proofQEnd - 2}
          />
        ) : null}
      </AbsoluteFill>
    );
  return <RebuildFromReal at={T.proofQEnd} fromRect={PQ_CARD} toRect={CARD_ON_REBUILD} twin={<WorldQ />} proof={ProofQ} />;
};

// =====================================================================================================================
// R · our agent's draft
// =====================================================================================================================

const AGENT_CHIP = { x: 200, y: 222 };
const AGENT_SCALE = 1.3;
const DRAFT_X = 560;
const DRAFT_Y = 410;
const ACCEPT_K = 2.2;
const ACCEPT_W = textWidth(STR.acceptFix, { size: 14 * ACCEPT_K, weight: 600 }) + 30 * ACCEPT_K;
const ACCEPT_X = DRAFT_X + DRAFT.w - ACCEPT_W;
const ACCEPT_Y = DRAFT_Y + DRAFT.h + 44;
const ACCEPT_C = { x: ACCEPT_X + ACCEPT_W / 2, y: ACCEPT_Y + 18 * ACCEPT_K };
const R_FRAME = { x: 960, y: 520, zoom: 1 };
const R_OPTS: CameraOptions = { base: R_FRAME, seed: "fix-draft" };
const R_KEYS: Cam3Key[] = [{ at: T.r, dur: 0, to: R_FRAME }];
const CODE_RECT = draftCodeRect(DRAFT_X, DRAFT_Y);

const WorldR: React.FC = () => {
  const frame = useCurrentFrame();
  // the draft leaves the agent chip and lands big on "drafts"
  const fly = tween(frame, T.draftFly, T.draftLand, 0, 1, EASE.expoOut);
  const fromX = AGENT_CHIP.x + 170;
  const fromY = AGENT_CHIP.y + 80;
  const s = 0.18 + 0.82 * fly;
  const dx = (1 - fly) * (fromX - DRAFT_X);
  const dy = (1 - fly) * (fromY - DRAFT_Y);
  const acceptIn = tween(frame, T.proofREnd + 2, T.proofREnd + 14, 0, 1, EASE.expoOut);
  const press = tween(frame, T.acceptClick, T.acceptClick + 2, 0, 1, EASE.linear) * (1 - tween(frame, T.acceptClick + 3, T.acceptClick + 6, 0, 1, EASE.linear));
  const accepted = tween(frame, T.acceptClick + 2, T.acceptClick + 10, 0, 1, EASE.expoOut);
  return (
    <Stage world="day" motif="grid" light={["56%", "32%"]}>
      <Camera3D keys={R_KEYS} {...R_OPTS}>
        <div style={{ position: "absolute", left: AGENT_CHIP.x, top: AGENT_CHIP.y, transformOrigin: "0 0", transform: `scale(${AGENT_SCALE})` }}>
          <ReaderChip tile={<MarkTile />} label="Drift Reviewer" status={{ icon: "comment", text: "Our agent" }} x={0} y={0} appear />
        </div>
        {frame >= T.draftFly ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: `${DRAFT_X}px ${DRAFT_Y}px`,
              transform: fly < 1 ? `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${s.toFixed(4)})` : undefined,
              opacity: Math.min(1, (frame - T.draftFly + 1) / 3),
            }}
          >
            <DraftCard x={DRAFT_X} y={DRAFT_Y} drift={T.editMark} strike={T.editStrike} replace={T.editReplace} accepted={accepted} />
          </div>
        ) : null}
        {acceptIn > 0 ? (
          <div style={{ position: "absolute", left: ACCEPT_X, top: ACCEPT_Y, opacity: Math.min(1, acceptIn * 3), transform: `translateY(${((1 - acceptIn) * 22).toFixed(2)}px)` }}>
            <Button k={ACCEPT_K} kind="primary" press={press}>
              {STR.acceptFix}
            </Button>
          </div>
        ) : null}
        {acceptIn > 0 ? (
          <Cursor
            points={[
              { frame: T.proofREnd + 6, x: ACCEPT_C.x + 220, y: ACCEPT_C.y + 150 },
              { frame: T.acceptClick, x: ACCEPT_C.x, y: ACCEPT_C.y, click: true, cursor: "pointer", travel: 16 },
            ]}
            showAt={T.proofREnd + 6}
          />
        ) : null}
      </Camera3D>
    </Stage>
  );
};

// The real draft (p4-draft-diff, draft 2: the code diff, its rationale and "Drafted by Drift Reviewer from PR #482.
// Nothing changes until you accept."), at 1:1. The crop holds the whole diff well (to x 2660).
const PR_CROP: [number, number, number, number] = [1176, 1340, 1484, 320];
const PR_SCALE = 1;
const PR_POS = { x: Math.round(960 - (1484 + 28) / 2), y: 330 };
const PR_IMG = proofRect({ crop: PR_CROP, scale: PR_SCALE, ...PR_POS }).image;
/** `+ export ROLLBACK_TIMEOUT_SECS=300`: the element the big code line stands for. */
const PR_LINE = inProof(PR_IMG, PR_CROP, PR_SCALE, [1258, 1440, 495, 22]);
const PR_NOTHING = inProof(PR_IMG, PR_CROP, PR_SCALE, [1658, 1627, 382, 23]);
const ProofR = (
  <ProofFrame capture="p4-draft-diff" crop={PR_CROP} scale={PR_SCALE} {...PR_POS} at={T.proofR} dur={T.proofREnd + 8 - T.proofR} enter="none" exit="none" tag="Recorded in Confluence" />
);
const CODE_ON_PROOF = screenAt(CODE_RECT, T.proofR, R_KEYS, R_OPTS);
const CODE_ON_REBUILD = screenAt(CODE_RECT, T.proofREnd, R_KEYS, R_OPTS);

const ShotR: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.proofREnd)
    return (
      <AbsoluteFill>
        <MorphToReal at={T.proofR} fromRect={CODE_ON_PROOF} toRect={PR_LINE} twin={<WorldR />} proof={ProofR} out={T.proofREnd + 40} />
        {/* the real sentence, marked on "Nothing" (the proof's creep moves its words by about 3 px over the mark) */}
        {frame >= T.nothingMark ? <MistBand rect={PR_NOTHING} at={T.nothingMark} dur={10} /> : null}
      </AbsoluteFill>
    );
  return <RebuildFromReal at={T.proofREnd} fromRect={PR_LINE} toRect={CODE_ON_REBUILD} twin={<WorldR />} proof={ProofR} />;
};

// =====================================================================================================================
// The scene
// =====================================================================================================================

/** P to Q: the quick fix card grows out of step 2's dead path. */
const DEAD_PATH_ON_CARRY = screenAt(DEAD_PATH, T.qf, P_KEYS, P_OPTS);

const FIX: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.r) shot = <GrowReveal at={T.qf} dur={T.qfDur} from={DEAD_PATH_ON_CARRY} pad={[10, 8]} darken={0.15} outgoing={<WorldP />} incoming={<ShotQ />} />;
  else if (frame < T.v) shot = <PushSwap at={T.r} dur={T.rDur} dir="left" outgoing={<ShotQ />} incoming={<ShotR />} />;
  else if (frame < T.payoff) shot = <PushSwap at={T.v} dur={T.vDur} dir="right" outgoing={<ShotR />} incoming={<ShotV />} />;
  // the Night owner's payoff: framed as PROBLEM left it, the new command underlined on "right step", the source
  // "Payments rollback runbook · Verified" landing on "right"; its chime rings on over the cut into JIRA (the L-cut)
  else shot = <PayoffShot at={T.payoff} markAt={T.payoffMark} sourceAt={T.payoffSource} />;
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      {shot}
      {/* S16: the agents' status turns on "never"; the carry; the real click */}
      <Sfx id="tick-soft" at={T.readOnly + 2} gainDb={-10} />
      <Sfx id="pop" at={T.qf + 10} gainDb={-10} />
      <Sfx id="click" at={T.realClick} gainDb={-8} />
      {/* S17: the push; the draft lands; the new words; a person's click */}
      <Sfx id="whoosh-short" at={T.r + 7} gainDb={-12} />
      <Sfx id="pop" at={T.draftLand} gainDb={-12} />
      <Sfx id="click" at={T.acceptClick} gainDb={-8} />
      {/* S18: the push back; the snap on the score's downbeat (the film's one snap) as the byline swaps */}
      <Sfx id="whoosh-short" at={T.v + 10} gainDb={-12} />
      <Sfx id="snap" at={T.hit} gainDb={-6} />
    </AbsoluteFill>
  );
};

export default FIX;
