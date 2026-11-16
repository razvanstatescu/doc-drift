import React from "react";
import { noise2D } from "@remotion/noise";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { Cursor, type CursorPoint } from "../../components/Cursor";
import { COMMENT_UI, CommentTwin, commentRect } from "../../components/P4/CommentTwin";
import {
  AgentCard,
  DraftCard,
  DRAFT_UI,
  FooterCard,
  PANEL_UI,
  PROPOSED_UI,
  ProposedFixCard,
  proposedSlots,
  QF_CARD_UI,
  QuickFixCard,
  reviewPanelLayers,
  STR,
  SuccessNotice,
} from "../../components/P4/ReviewPanelTwin";
import { SLIP_UNIT } from "../../brand/tokens";
import { toolOutput } from "../../lib/captures";
import { slipProgress } from "../../motion/slip";
import { EASE, tween } from "../../lib/time";
import {
  cam3At,
  Camera3D,
  CurrentUnderline,
  DAY,
  ELEV,
  ExplodedStack,
  FONT,
  Layer,
  Lift,
  MorphToReal,
  Press,
  ProofFrame,
  proofRect,
  SignalLine,
  Stage,
  WhipBlur,
  ZoomThrough,
  elevAt,
  type Cam3Key,
  type CameraOptions,
  type Rect,
} from "../../v4/kit";
import { DirectionalBlur } from "../../v4/kit/blur";
import { PageTwin, pageRects, TerminalTwin, textWidth, type PageTwinProps } from "../../v4/twins";
import { center, inProof, lerpRect, projectStack, screenAt } from "./geom";
import { T } from "./timing";

/**
 * P4 · Review (film 3277 to 3937, R3 V19 to V22). Day, grid. Three worlds:
 *
 *   A · the runbook and its footer comment (0 .. zoom)
 *   0         opens composed and moving under the kit's downward whip from P3: the runbook's Steps band (out of
 *             line since P2) and, over the page's foot, the comment card; it lifts on "The page owner" and its
 *             mention pops on "owner"                                                                         (V19)
 *   R13       a beat before "comment": the real comment grows out of the twin's body (MorphToReal), 27 f
 *   whip      up to the byline (T9, content travelling down); the cursor reaches the byline item (the amber)
 *   "opens"   click; T6 zoom-through into the panel
 *
 *   B · the review panel (zoom .. side)
 *   "review"  the panel lands exploded (its sections apart in Z, yaw -12) and folds flat to be read: the header and
 *             its Possibly stale badge (the one amber; the page behind is racked out and drained), the why sentence,
 *             "Review (2)" "Anchors (3)", What changed, Affected section
 *   travel    the camera pulls back and travels to Quick fix (the header's badge stays in frame, racked: the
 *             amber), the stack opening a little while it moves; the card breaks out, turns flat to camera and lands
 *             centred on "rename"; the panel racks out behind it                                              (V20)
 *   R14       on "one-click": the real click (p4-review-rec 38.31 s) and, cut on the next beat, the real result
 *   "no AI"   the card slides left and "No AI used." lifts out of it into big type, still for 47 f; it leaves
 *             before V21 (the rename fix only)
 *   V21       the quick fix card settles back; Proposed fix comes forward; the cursor clicks Propose fix on "bigger";
 *             a signal reaches a small Drift Reviewer card; its review rows tick and a person confirms; the two
 *             drafts fly back and land in the card as diffs with the real lines (never on the page)          (V21)
 *   R15       by MorphToReal from draft 2, 40 f
 *
 *   C · the page with the drafts hovering (side .. end)
 *   side      whip into an exploded side view: the drafts hover above the runbook (its Steps band still out of line,
 *             its byline item the amber), dashed drop lines to the lines they would replace; the footer card lifts
 *             in square, the cursor travels to Accept fix
 *   R16       the real click on "accepts", then, cut on the beat, "Accepted. A new page version names PR #482."
 *   snapBack  the drafts drop into the page, the band snaps home over 8 f, the byline turns Verified         (V22)
 *   R17       by MorphToReal from the byline item; the terminal lifts in over the page's empty corner and prints the
 *             real checkVerified, "Safe to cite." landing on "cite" and holding still
 *   tail      R18 the page history; R19 step 2 as it now reads, centred where A1 punched in on the old step 2
 *   end       R19 is the final pose; P5's slip push carries it out (P4 to P5 is continuous, one owner).
 */

// =====================================================================================================================
// Shared geometry
// =====================================================================================================================

const K_PAGE = 1.8;
const PAGE_BASE: PageTwinProps = { world: "day", doc: "runbook", k: K_PAGE, x: 420, y: 72, step2: "old" };
/** The Steps band stays out of line since P2, neutral; the byline item carries the amber (R3 section 3, as in P3). */
const PAGE_A: PageTwinProps = { ...PAGE_BASE, byline: { kind: "dds", state: "possibly_stale" }, slip: { at: -60, amber: false } };
const RA = pageRects(PAGE_A);

const textW = (t: string, size: number, weight = 400) => textWidth(t, { size, weight });
/** UI width of one of our buttons (padding 15 each side, 14 px 600). */
const buttonW = (label: string) => textW(label, 14, 600) + 30;

// =====================================================================================================================
// World A · the page and its footer comment
// =====================================================================================================================

const K_COMMENT = 1.75;
const COMMENT_W = COMMENT_UI.width * K_COMMENT;
const COMMENT_H = COMMENT_UI.height * K_COMMENT;
const COMMENT_X = Math.round(960 - COMMENT_W / 2);
/** The comment card floats over the page's foot (its last band), under the slipped Steps band. */
const COMMENT_Y = Math.round(RA.bands.bottom.y + 14);
const COMMENT_CY = COMMENT_Y + COMMENT_H / 2;

const COMMENT_VIEW_Y = Math.round((RA.bands.middle.y - 40 + COMMENT_Y + COMMENT_H) / 2);
const A_COMMENT_OPTS: CameraOptions = { base: { x: 960, y: COMMENT_VIEW_Y + 120, zoom: 1.0 }, seed: "p4-comment" };
const A_COMMENT_KEYS: Cam3Key[] = [
  // the whip from P3 lands: the content is still travelling down, and settles on the comment
  { at: 0, dur: 22, to: { x: 960, y: COMMENT_VIEW_Y, zoom: 1.04 } },
  // accelerate up the page into the whip
  { at: T.whip - 6, dur: 6, to: { y: COMMENT_VIEW_Y - 120 }, ease: EASE.expoIn },
];

const BYLINE_C = center(RA.badge);
const A_BYLINE_OPTS: CameraOptions = { base: { x: BYLINE_C[0] - 150, y: RA.byline.y + 150, zoom: 1.2 }, seed: "p4-byline" };
const A_BYLINE_KEYS: Cam3Key[] = [{ at: T.whip - 2, dur: 16, to: { x: BYLINE_C[0] - 150, y: RA.byline.y + 70, zoom: 1.24 } }];
/** The byline item on screen when it is clicked. */
const BADGE_ON_CLICK = screenAt(RA.badge, T.click, A_BYLINE_KEYS, A_BYLINE_OPTS);
const CLICK_PT: [number, number] = [BADGE_ON_CLICK.x + BADGE_ON_CLICK.w * 0.42, BADGE_ON_CLICK.y + BADGE_ON_CLICK.h * 0.55];

// R13: p4-comment, the comment's body. Crop and scale per R3; the proof sits over the twin, its body on the twin's.
const R13_CROP: [number, number, number, number] = [1500, 1690, 1420, 180];
const R13_SCALE = 0.9;
const R13_BODY_CAP: [number, number, number, number] = [1584, 1775, 1298, 85];
const R13_TWIN_BODY = screenAt(commentRect("body", COMMENT_X, COMMENT_Y, K_COMMENT), T.r13, A_COMMENT_KEYS, A_COMMENT_OPTS);
const R13_POS = (() => {
  const w = R13_CROP[2] * R13_SCALE + 28;
  const x = Math.round(960 - w / 2);
  // body (capture) top sits 85 capture px into the crop; put it on the twin's body top
  const y = Math.round(R13_TWIN_BODY.y - 14 - (R13_BODY_CAP[1] - R13_CROP[1]) * R13_SCALE);
  return { x, y };
})();
const R13_RECTS = proofRect({ crop: R13_CROP, scale: R13_SCALE, ...R13_POS });
const R13_BODY = inProof(R13_RECTS.image, R13_CROP, R13_SCALE, R13_BODY_CAP);

const WorldA: React.FC<{ pose: "comment" | "byline" }> = ({ pose }) => {
  const frame = useCurrentFrame();
  const pop = tween(frame, T.pop, T.pop + 12, 0, 1, EASE.expoOut);
  return (
    <Stage world="day" motif="grid" light={pose === "comment" ? ["50%", "72%"] : ["46%", "20%"]}>
      <Camera3D keys={pose === "comment" ? A_COMMENT_KEYS : A_BYLINE_KEYS} {...(pose === "comment" ? A_COMMENT_OPTS : A_BYLINE_OPTS)}>
        <PageTwin {...PAGE_A} />
        <Lift at={T.commentLift} from={1} to={3} appear contact={0.14} radius={20 * K_COMMENT} x={COMMENT_X} y={COMMENT_Y}>
          <CommentTwin k={K_COMMENT} mentionPop={pop} elev={0} />
        </Lift>
      </Camera3D>
    </Stage>
  );
};

/** World A at the comment, with R13 growing out of the twin's body. */
const CommentShot: React.FC = () => (
  <MorphToReal
    at={T.r13}
    fromRect={R13_TWIN_BODY}
    toRect={R13_BODY}
    twin={
      <Iso>
        <WorldA pose="comment" />
      </Iso>
    }
    proof={
      <ProofFrame
        capture="p4-comment"
        crop={R13_CROP}
        scale={R13_SCALE}
        {...R13_POS}
        at={T.r13}
        dur={T.r13End - T.r13}
        enter="none"
        tag="Recorded in Confluence"
      />
    }
  />
);

const BylineShot: React.FC = () => {
  const cursor: CursorPoint[] = [
    { frame: T.whip + 1, x: CLICK_PT[0] + 260, y: CLICK_PT[1] + 210 },
    { frame: T.click, x: CLICK_PT[0], y: CLICK_PT[1], click: true, cursor: "pointer", travel: 8 },
  ];
  return (
    <AbsoluteFill>
      <Iso>
        <WorldA pose="byline" />
      </Iso>
      <Press at={T.click} x={CLICK_PT[0]} y={CLICK_PT[1]} />
      <Cursor points={cursor} showAt={T.whip + 1} />
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// World B · the review panel
// =====================================================================================================================

const K_PANEL = 1.8;
const PANEL_X = 294;
const PANEL_Y = 50;
const PANEL_W = PANEL_UI.base.w * K_PANEL;
const PANEL_H = PANEL_UI.base.h * K_PANEL;
const P = (ui: { x: number; y: number; w: number; h: number }): Rect => ({
  x: PANEL_X + ui.x * K_PANEL,
  y: PANEL_Y + ui.y * K_PANEL,
  w: ui.w * K_PANEL,
  h: ui.h * K_PANEL,
});

const QF_STAGE = P(QF_CARD_UI);
const PROPOSED_STAGE = P(PANEL_UI.proposed);
const ARRIVE = T.zoom + 8;

const B_OPTS: CameraOptions = { base: { x: 960, y: 470, zoom: 0.95 }, seed: "p4-panel" };
const B_KEYS: Cam3Key[] = [
  // the zoom-through lands: settle on the header, the why and the tabs
  { at: ARRIVE, dur: 26, to: { x: 960, y: 420, zoom: 1.0 } },
  // travel to Quick fix (the card at the left of the frame, room on the right for the type that follows)
  // (pulled back so the header and its Possibly stale badge stay in frame, racked, above the floats: the one amber)
  { at: T.travel, dur: 18, to: { x: QF_STAGE.x + QF_STAGE.w / 2 - 20, y: 690, zoom: 0.88 }, ease: EASE.expoInOut },
  // pan as "No AI used." flies in: the card moves left and the ground opens on the right for the type
  { at: T.noAiLift, dur: 16, to: { x: QF_STAGE.x + QF_STAGE.w / 2 + 300 } },
  // down to Proposed fix while the type leaves
  { at: T.noAiOut + 2, dur: 20, to: { x: PROPOSED_STAGE.x + PROPOSED_STAGE.w / 2 + 300, y: 728, zoom: 0.8 }, ease: EASE.expoInOut },
];

// The quick fix card's breakout: from its place in the panel to a big, square card at the left of the frame.
const QF_FROM = screenAt(QF_STAGE, T.breakout, B_KEYS, B_OPTS);
const QF_SCALE = 860 / QF_STAGE.w;
/** The card square to camera: centred while V20 is read, then to the left as the big type comes in. */
const QF_TO: Rect = { x: 530, y: 290, w: 860, h: QF_STAGE.h * QF_SCALE };
const QF_LEFT: Rect = { ...QF_TO, x: 110, y: 304 };
const qfK = K_PANEL; // the card is laid out at the panel's k and scaled as a whole
const QF_BACK = T.noAiOut - 2; // it settles back into the panel

/** The quick fix card's rect on screen at a frame (lifting out, holding, settling back). */
const qfRect = (f: number): { r: Rect; lift: number; turn: number } => {
  const up = tween(f, T.breakout, T.breakout + 12, 0, 1, EASE.expoOut);
  const back = tween(f, QF_BACK, QF_BACK + 12, 0, 1, EASE.expoInOut);
  const home = screenAt(QF_STAGE, Math.min(f, QF_BACK + 12), B_KEYS, B_OPTS);
  const aside = tween(f, T.noAiLift, T.noAiLift + 14, 0, 1, EASE.expoInOut);
  const out = lerpRect(lerpRect(QF_FROM, QF_TO, up), QF_LEFT, aside);
  return { r: lerpRect(out, home, back), lift: up * (1 - back), turn: (1 - up) * -9 + back * -6 };
};

// "No AI used." in the card's help line (UI px inside the card), and its big type slot.
const NOAI_UI = (() => {
  const x = 14 + textW("Suggested from PR #482. ", 12);
  return { x, y: 13 + 44 + 7, w: textW("No AI used.", 12), h: 17 };
})();
const NOAI_SIZE = 128;
const NOAI_W = textW("No AI used.", NOAI_SIZE, 600) * 0.985;
const NOAI_SLOT: Rect = { x: 1040, y: 452, w: NOAI_W, h: NOAI_SIZE * 1.1 };
const noAiFrom = (): Rect => {
  const r = qfRect(T.noAiLift).r;
  const s = r.w / (QF_CARD_UI.w * qfK);
  return { x: r.x + NOAI_UI.x * qfK * s, y: r.y + NOAI_UI.y * qfK * s, w: NOAI_UI.w * qfK * s, h: NOAI_UI.h * qfK * s };
};

// The Proposed fix card: from the panel's section to a big card at the left; the drafts land in its slots.
const K_PROP = 1.85;
/** The card's scale once the drafts are in (it grows; the frame pulls back on it). */
const PROP_END = 0.8;
const PROP_FROM = screenAt(PROPOSED_STAGE, T.proposeIn, B_KEYS, B_OPTS);
const PROP_TO = { x: 80, y: 150 };
const PROP_W = PROPOSED_UI.w * K_PROP;
const SLOTS = proposedSlots(K_PROP);
const propBtn: [number, number] = [PROP_TO.x + (20 + buttonW(STR.proposeButton) / 2) * K_PROP, PROP_TO.y + 108.5 * K_PROP];
const PROP_EDGE: [number, number] = [PROP_TO.x + PROP_W, propBtn[1]];

// The small Drift Reviewer card, to the right.
const K_AGENT = 1.8;
const AGENT_POS = { x: 1330, y: 226 };
const agentConfirm: [number, number] = [AGENT_POS.x + (16 + 11 + (buttonW("Confirm selected") * 0.82) / 2) * K_AGENT, AGENT_POS.y + 147.8 * K_AGENT];
const AGENT_ROWS: Rect = { x: AGENT_POS.x + 27 * K_AGENT, y: AGENT_POS.y + 85 * K_AGENT, w: 250 * K_AGENT, h: 38 * K_AGENT };

const K_FLY = K_PROP * PROP_END;
const slotAt = (r: Rect): Rect => ({ x: PROP_TO.x + r.x * PROP_END, y: PROP_TO.y + r.y * PROP_END, w: r.w * PROP_END, h: r.h * PROP_END });
const DRAFT1_TO = slotAt(SLOTS.draft1);
const DRAFT2_TO = slotAt(SLOTS.draft2);

// R14: p4-review-rec, the card (38.20 s on) then, cut on the beat, the result (41.60 s on). Same width, same place.
const R14_CROP_A: [number, number, number, number] = [1170, 1330, 1500, 290];
const R14_CROP_B: [number, number, number, number] = [1170, 1630, 1500, 290];
const R14_SCALE = 0.85;
const R14_POS = { x: Math.round(960 - (1500 * R14_SCALE + 28) / 2), y: 392 };
const R14_IMG = proofRect({ crop: R14_CROP_A, scale: R14_SCALE, ...R14_POS }).image;
const R14_CLICK = inProof(R14_IMG, R14_CROP_A, R14_SCALE, [1337, 1577, 0, 0]);

// R15: p4-draft-diff, draft 2 (the code diff, its rationale, the attribution).
const R15_CROP: [number, number, number, number] = [1170, 1310, 1500, 350];
const R15_SCALE = 0.9;
const R15_POS = { x: Math.round(960 - (1500 * R15_SCALE + 28) / 2), y: 560 };
const R15_IMG = proofRect({ crop: R15_CROP, scale: R15_SCALE, ...R15_POS }).image;
const R15_DIFF = inProof(R15_IMG, R15_CROP, R15_SCALE, [1194, 1332, 1452, 192]);
const DRAFT2_DIFF: Rect = { x: DRAFT2_TO.x + 12 * K_FLY, y: DRAFT2_TO.y + 11 * K_FLY, w: (DRAFT_UI.w - 24) * K_FLY, h: (4 * 16.5 + 12) * K_FLY };

const WorldB: React.FC = () => {
  const frame = useCurrentFrame();
  const arrive = tween(frame, ARRIVE, T.flat, 0, 1, EASE.expoOut);
  const bumpT = tween(frame, T.travel, T.breakout, 0, 1, EASE.linear);
  const bump = bumpT > 0 && bumpT < 1 ? Math.sin(Math.PI * bumpT) : 0;
  const explode = 1 - arrive + 0.32 * bump;
  const yaw = -12 * (1 - arrive) - 6 * bump;
  const pitch = 6 * (1 - arrive) + 2 * bump;
  // rack focus behind the breakout card; dims under the proofs. Only once the stack is flat (filters flatten 3D).
  const rack = tween(frame, T.breakout, T.breakout + 12, 0, 1, EASE.standard) * (1 - tween(frame, T.proposeIn + 40, T.proposeIn + 60, 0, 0.4, EASE.standard));
  const dim =
    1 -
    0.6 *
      Math.max(
        tween(frame, T.r14, T.r14 + 6) * (1 - tween(frame, T.r14End, T.r14End + 8)),
        tween(frame, T.r15 + 2, T.r15 + 8) * (1 - tween(frame, T.r15End, T.r15End + 8)),
      );
  const after = frame >= T.r14Cut;
  const layers = reviewPanelLayers({
    k: K_PANEL,
    badge: "possibly_stale",
    badgeGlow: 1,
    open: after ? 1 : 2,
    highOut: tween(frame, T.r14End, T.r14End + 10, 0, 1, EASE.expoOut),
    renamed: after,
    hideQfCard: frame >= T.breakout && frame < QF_BACK + 12,
    qfDone: after ? 1 : 0,
    hide: { proposed: frame >= T.proposeIn },
  });
  const blur = 4 * rack;
  return (
    <Stage world="day" motif="grid" light={["50%", "30%"]}>
      <Camera3D keys={B_KEYS} {...B_OPTS}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: dim < 1 ? dim : undefined,
            filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
          }}
        >
          {/* the page behind the panel, racked out and drained (it carries no amber here) */}
          <div style={{ position: "absolute", inset: 0, filter: "blur(8px) grayscale(1)", opacity: 0.5 }}>
            <PageTwin {...PAGE_A} />
          </div>
          <ExplodedStack explode={explode} yaw={yaw} pitch={pitch} layers={layers} x={PANEL_X} y={PANEL_Y} width={PANEL_W} height={PANEL_H} />
        </div>
      </Camera3D>
    </Stage>
  );
};

/** The floats of world B, square to camera: the quick fix card, "No AI used.", Proposed fix, the agent, the drafts. */
const FloatsB: React.FC = () => {
  const frame = useCurrentFrame();
  // ---- quick fix card
  const qf = qfRect(frame);
  const showQf = frame >= T.breakout && frame < QF_BACK + 12;
  const qfS = qf.r.w / (QF_CARD_UI.w * qfK);
  const qfDone = tween(frame, T.r14End - 4, T.r14End + 4, 0, 1, EASE.expoOut);
  const noAiOut = tween(frame, T.noAiLift, T.noAiLift + 6, 0, 1, EASE.linear);
  // ---- "No AI used." big type
  const dock = tween(frame, T.noAiLift, T.noAiLand, 0, 1, EASE.expoInOut);
  const from = noAiFrom();
  const r = lerpRect(from, NOAI_SLOT, dock);
  const leave = tween(frame, T.noAiOut, T.noAiOut + 10, 0, 1, EASE.expoIn);
  const leaveV = (tween(frame + 0.5, T.noAiOut, T.noAiOut + 10, 0, 1, EASE.expoIn) - tween(frame - 0.5, T.noAiOut, T.noAiOut + 10, 0, 1, EASE.expoIn)) * 1100;
  const showType = frame >= T.noAiLift && leave < 1;
  // ---- Proposed fix card
  const pin = tween(frame, T.proposeIn, T.proposeIn + 14, 0, 1, EASE.expoOut);
  const propR = lerpRect(PROP_FROM, { x: PROP_TO.x, y: PROP_TO.y, w: PROP_W, h: 164 * K_PROP }, pin);
  const shrink = 1 - (1 - PROP_END) * tween(frame, T.confirm + 2, T.draft1 + 8, 0, 1, EASE.expoInOut);
  const propS = (propR.w / PROP_W) * shrink;
  const showProp = frame >= T.proposeIn;
  const press = pressCurve(frame, T.proposeClick);
  const busy = tween(frame, T.proposeClick + 3, T.proposeClick + 6) * (1 - tween(frame, T.confirm + 2, T.confirm + 6));
  const draftsIn = tween(frame, T.confirm + 2, T.draft1 + 8, 0, 1, EASE.expoOut);
  // ---- agent card and the signal
  const rows = (frame >= T.rows[0] ? 1 : 0) + (frame >= T.rows[1] ? 1 : 0);
  const confirmPress = pressCurve(frame, T.confirm);
  const agentMid: [number, number] = [AGENT_POS.x - 4, AGENT_POS.y + 28 * K_AGENT];
  const sigD = `M ${PROP_EDGE[0] + 6} ${PROP_EDGE[1]} C ${PROP_EDGE[0] + 90} ${PROP_EDGE[1]}, ${agentMid[0] - 90} ${agentMid[1]}, ${agentMid[0]} ${agentMid[1]}`;
  const dim =
    1 -
    0.6 *
      Math.max(
        tween(frame, T.r14, T.r14 + 6) * (1 - tween(frame, T.r14End, T.r14End + 8)),
        tween(frame, T.r15 + 2, T.r15 + 8) * (1 - tween(frame, T.r15End, T.r15End + 8)),
      );
  return (
    <AbsoluteFill style={{ opacity: dim < 1 ? dim : undefined }}>
      {showQf ? (
        <div
          style={{
            position: "absolute",
            left: qf.r.x,
            top: qf.r.y,
            width: QF_CARD_UI.w * qfK,
            height: QF_CARD_UI.h * qfK,
            transformOrigin: "0 0",
            transform: `scale(${qfS}) perspective(1600px) rotateY(${qf.turn}deg)`,
            borderRadius: 12 * qfK,
            boxShadow: elevAt(1 + 3 * qf.lift),
          }}
        >
          <QuickFixCard k={qfK} done={qfDone} noAiOut={noAiOut * (1 - tween(frame, QF_BACK, QF_BACK + 4))} />
        </div>
      ) : null}
      {showType ? (
        <div
          style={{
            position: "absolute",
            left: r.x + leave * 980,
            top: r.y,
            width: NOAI_SLOT.w,
            height: NOAI_SLOT.h,
            transformOrigin: "0 0",
            transform: `scale(${r.w / NOAI_SLOT.w})`,
          }}
        >
          <DirectionalBlur x={Math.min(40, Math.abs(leaveV) * 0.5)}>
            <div
              style={{
                fontFamily: FONT.sans,
                fontSize: NOAI_SIZE,
                lineHeight: `${NOAI_SIZE * 1.1}px`,
                fontWeight: 600,
                letterSpacing: "-0.028em",
                color: DAY.text,
                whiteSpace: "nowrap",
              }}
            >
              <CurrentUnderline at={T.no + 2}>No AI</CurrentUnderline> used.
            </div>
          </DirectionalBlur>
        </div>
      ) : null}
      {showProp ? (
        <div style={{ position: "absolute", left: propR.x, top: propR.y, transformOrigin: "0 0", transform: `scale(${propS})` }}>
          <ProposedFixCard k={K_PROP} press={press} busy={busy} draftsIn={draftsIn} draft1={frame >= T.draft1 + 10} draft2={frame >= T.draft2 + 10} />
        </div>
      ) : null}
      {frame >= T.proposeClick && frame < T.r15 ? <SignalLine d={sigD} at={T.proposeClick + 1} dur={10} pulse trail /> : null}
      {frame >= T.agentIn ? (
        <Lift at={T.agentIn} from={1} to={3} radius={18 * K_AGENT} x={AGENT_POS.x} y={AGENT_POS.y}>
          <AgentCard
            k={K_AGENT}
            rows={rows}
            confirmPress={confirmPress}
            confirmed={tween(frame, T.confirm + 4, T.confirm + 10)}
            style={{ boxShadow: "none" }}
          />
        </Lift>
      ) : null}
      {/* the drafts fly from the agent's review rows to their slots in Proposed fix (never to the page) */}
      {frame >= T.draft1 && frame < T.draft1 + 10 ? (
        <Dock at={T.draft1} dur={10} fromRect={AGENT_ROWS} toRect={DRAFT1_TO}>
          <DraftCard k={K_FLY} which={1} elevated />
        </Dock>
      ) : null}
      {frame >= T.draft2 && frame < T.draft2 + 10 ? (
        <Dock at={T.draft2} dur={10} fromRect={AGENT_ROWS} toRect={DRAFT2_TO}>
          <DraftCard k={K_FLY} which={2} elevated />
        </Dock>
      ) : null}
    </AbsoluteFill>
  );
};

/** A card flying from one rect to another (laid out at the target size), with its own shadow. */
const Dock: React.FC<{ at: number; dur: number; fromRect: Rect; toRect: Rect; children: React.ReactNode }> = ({ at, dur, fromRect, toRect, children }) => {
  const frame = useCurrentFrame();
  const t = tween(frame, at, at + dur, 0, 1, EASE.expoInOut);
  const r = lerpRect(fromRect, toRect, t);
  const arc = -70 * Math.sin(Math.PI * t);
  return (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y + arc,
        width: toRect.w,
        height: toRect.h,
        transformOrigin: "0 0",
        transform: `scale(${r.w / toRect.w})`,
        opacity: tween(frame, at, at + 3),
      }}
    >
      {children}
    </div>
  );
};

/**
 * A world in its own stacking context: the kit's Stage gives its children zIndex 1 without one, which would paint
 * them over the floats, cursors and proofs drawn after it.
 */
const Iso: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ isolation: "isolate", ...style }}>{children}</AbsoluteFill>
);

/**
 * The floats (cards square to camera, big type, cursors) are drawn in screen space, so they get none of the camera's
 * creep: this gives them the same hand-held float (5 px, a slow 1% breathe), so a held card never freezes (M1).
 */
const FloatHold: React.FC<{ seed: string; children: React.ReactNode }> = ({ seed, children }) => {
  const frame = useCurrentFrame();
  const t = (frame / 30) * 0.3;
  const x = noise2D(`${seed}x`, t, 0) * 5;
  const y = noise2D(`${seed}y`, t, 7) * 3.5;
  const s = 1 + 0.006 * noise2D(`${seed}s`, t * 0.7, 3);
  return <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: "50% 50%" }}>{children}</AbsoluteFill>;
};

/** The film's press curve for a twin control (in 4 f, hold 2, out 8). */
function pressCurve(frame: number, at: number) {
  const t = frame - at;
  if (t < -4 || t > 10) return 0;
  if (t < 0) return (t + 4) / 4;
  if (t <= 2) return 1;
  return Math.max(0, 1 - (t - 2) / 8);
}

const ShotB: React.FC = () => {
  const frame = useCurrentFrame();
  const btn = (() => {
    const q = qfRect(T.cursorIn + 14).r;
    const s = q.w / (QF_CARD_UI.w * qfK);
    return [q.x + (14 + buttonW(STR.qfButton) / 2) * qfK * s, q.y + (QF_CARD_UI.h - 13 - 18) * qfK * s] as [number, number];
  })();
  const cursor: CursorPoint[] = [
    { frame: T.cursorIn, x: btn[0] + 300, y: btn[1] + 220 },
    { frame: T.r14 - 2, x: btn[0] + 6, y: btn[1] + 4, cursor: "pointer", travel: 16 },
  ];
  const cursor2: CursorPoint[] = [
    { frame: T.proposeIn + 10, x: propBtn[0] + 260, y: propBtn[1] + 230 },
    { frame: T.proposeClick, x: propBtn[0], y: propBtn[1], click: true, cursor: "pointer", travel: 14 },
    { frame: T.confirm, x: agentConfirm[0], y: agentConfirm[1], click: true, cursor: "pointer", travel: 18 },
  ];
  return (
    <AbsoluteFill>
      <Iso>
        <WorldB />
      </Iso>
      <FloatHold seed="p4-floats-b">
        <FloatsB />
        <Cursor points={cursor} showAt={T.cursorIn} hideAt={T.r14} />
        <Cursor points={cursor2} showAt={T.proposeIn + 10} hideAt={T.confirm + 8} />
        <Press at={T.proposeClick} x={propBtn[0]} y={propBtn[1]} />
        <Press at={T.confirm} x={agentConfirm[0]} y={agentConfirm[1]} />
      </FloatHold>
      {/* R14: the real click and, cut on the beat, the real result (one proof; the jump reframes to the result) */}
      {frame >= T.r14 ? (
        <ProofFrame
          capture="p4-review-rec"
          crop={R14_CROP_A}
          scale={R14_SCALE}
          {...R14_POS}
          at={T.r14}
          video={{ from: T.r14Src, to: 42.1, jumps: [{ at: T.r14Cut, to: 41.6, crop: R14_CROP_B }] }}
          tag="Recorded in Confluence"
        />
      ) : null}
      {frame >= T.r14 && frame < T.r14Cut ? (
        <Cursor
          points={[
            { frame: T.r14, x: R14_CLICK.x + 40, y: R14_CLICK.y + 30, cursor: "pointer" },
            { frame: T.r14Click, x: R14_CLICK.x, y: R14_CLICK.y, click: true, cursor: "pointer", travel: 3 },
          ]}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** World B with R15 growing out of draft 2. */
const ShotBWithR15: React.FC = () => (
  <MorphToReal
    at={T.r15}
    fromRect={DRAFT2_DIFF}
    toRect={R15_DIFF}
    twinRest={1}
    twin={<ShotB />}
    proof={
      <ProofFrame
        capture="p4-draft-diff"
        crop={R15_CROP}
        scale={R15_SCALE}
        {...R15_POS}
        at={T.r15}
        dur={T.r15End - T.r15}
        enter="none"
        tag="Recorded in Confluence"
      />
    }
  />
);

// =====================================================================================================================
// World C · the page with the drafts hovering, the snap back, Safe to cite, the tail
// =====================================================================================================================

const PAGE_C: PageTwinProps = {
  ...PAGE_BASE,
  byline: { kind: "dds", state: "verified", from: "possibly_stale", at: T.back + 1 },
  // the Steps band stays out of line (neutral) until the snap back; the byline item is the one amber until it turns Verified
  slip: { at: -100, back: T.back, amber: false },
  step2: { morphAt: T.back + 3, dur: 10 },
};
const RC = pageRects(PAGE_C);
const STACK_P = 1350;

/**
 * The drafts hover above the Steps band. D1 and D2 are their rects on the page plane (where they would land); T1 and T2
 * are the lines they would replace (step 2's sentence, its code well), outlined on the page and joined to the drafts
 * by dashed drop lines: an exploded drawing that shows the drafts are not on the page.
 */
const K_DRAFT = 1.0;
const T1: Rect = { x: 513, y: RC.step2.y, w: RC.step2.x + RC.step2.w - 513, h: 41 };
const T2: Rect = { x: 513, y: (RC.tokens.ROLLBACK_TIMEOUT?.y ?? 749) - 16, w: RC.step2.x + RC.step2.w - 513, h: 111 };
const DW = DRAFT_UI.w * K_DRAFT;
/** Hovering: over the page's right half, so the byline item (the amber) and step 2's targets stay in view. */
const D1: Rect = { x: 1000, y: 446, w: DW, h: DRAFT_UI.h1 * K_DRAFT };
const D2: Rect = { x: 986, y: 690, w: DW, h: DRAFT_UI.h2 * K_DRAFT };
/** Landing: each draft centred on the lines it replaces (they travel down onto them as they drop). */
const D1_LAND: Rect = { ...D1, x: T1.x + T1.w / 2 - DW / 2, y: T1.y + T1.h / 2 - D1.h / 2 };
const D2_LAND: Rect = { ...D2, x: T2.x + T2.w / 2 - DW / 2, y: T2.y + T2.h / 2 - D2.h / 2 };
const Z1 = 330;
const Z2 = 420;
const STACK_O: [number, number] = [RC.card.x + RC.card.w / 2, RC.step2.y];

const C_OPTS: CameraOptions = { base: { x: 1030, y: RC.step2.y + 30, zoom: 0.9 }, seed: "p4-drafts" };
const STEP2C = center(RC.step2Code);
const C_KEYS: Cam3Key[] = [
  // the whip lands: the side view (content still travelling left), a slow orbit while the drafts hover
  { at: T.side - 4, dur: 30, to: { x: 980, y: RC.step2.y + 10, zoom: 0.92 } },
  // to the byline as the page snaps back and turns Verified
  { at: T.back - 2, dur: 20, to: { x: BYLINE_C[0] - 120, y: RC.byline.y + 120, zoom: 1.28 } },
  // pull back: the page and the terminal over its empty corner
  { at: T.term - 4, dur: 24, to: { x: 1090, y: 640, zoom: 1.0 } },
  // behind R18, to step 2 (R19 grows out of it where A1 punched in on the old step 2)
  { at: T.r18 + 4, dur: 22, to: { x: STEP2C[0], y: STEP2C[1], zoom: 1.24 } },
];

// The footer card (square, in front) and Accept fix.
const K_FOOT = 1.55;
const FOOT_POS = { x: 1010, y: 860 };
const ACCEPT_PT: [number, number] = [
  FOOT_POS.x + (18 + buttonW(STR.dismiss) + 8 + buttonW(STR.snooze) + 8 + buttonW(STR.markVerified) + 8 + buttonW(STR.acceptFix) / 2) * K_FOOT,
  FOOT_POS.y + (16 + 18) * K_FOOT,
];

// R16: p4-accept-rec, the footer (the click on "accepts") then, cut on the beat, "Accepted." at the panel's top.
const R16_CROP_A: [number, number, number, number] = [1120, 1820, 1600, 170];
const R16_CROP_B: [number, number, number, number] = [1120, 470, 1600, 280];
const R16_SCALE = 0.8;
const R16_X = Math.round(960 - (1600 * R16_SCALE + 28) / 2);
const R16_POS_A = { x: R16_X, y: 620 };
const R16_IMG_A = proofRect({ crop: R16_CROP_A, scale: R16_SCALE, ...R16_POS_A }).image;
const R16_CLICK = inProof(R16_IMG_A, R16_CROP_A, R16_SCALE, [1929, 1894, 0, 0]);

// R17: p4-verified-tooltip, the byline item and its tooltip (the crop stops above the page's table).
const R17_CROP: [number, number, number, number] = [1440, 300, 1460, 300];
const R17_SCALE = 0.8;
const R17_ITEM_CAP: [number, number, number, number] = [2352, 462, 250, 44];
const R17_TWIN = screenAt(RC.badge, T.r17, C_KEYS, C_OPTS);
const R17_POS = (() => {
  const x = Math.round(R17_TWIN.x - 14 - (R17_ITEM_CAP[0] - R17_CROP[0]) * R17_SCALE);
  const y = Math.round(R17_TWIN.y - 14 - (R17_ITEM_CAP[1] - R17_CROP[1]) * R17_SCALE);
  return { x: Math.max(60, Math.min(1920 - 60 - 1196, x)), y: Math.max(80, y) };
})();
const R17_ITEM = inProof(proofRect({ crop: R17_CROP, scale: R17_SCALE, ...R17_POS }).image, R17_CROP, R17_SCALE, R17_ITEM_CAP);
/** The hovered pill's grey under the logged cover (the white default would show on the pill). */
const PILL_MASK = {
  box: [2605, 465, 176, 37] as [number, number, number, number],
  fill: "#F1F1F2",
  why: "Development install suffix (logged), on the hovered pill",
};

// R18: p4-history, the version history with the Doc Drift messages.
const R18_CROP: [number, number, number, number] = [720, 370, 2240, 376];
const R18_SCALE = 0.6;
const R18_POS = { x: Math.round(960 - (2240 * R18_SCALE + 28) / 2), y: 360 };

// R19: p4-step2-fixed, step 2 as it now reads; its code block centred where A1 punched in on the old step 2.
const R19_CROP: [number, number, number, number] = [1480, 1230, 1520, 250];
const R19_SCALE = 0.9;
const R19_CODE_CAP: [number, number, number, number] = [1530, 1362, 1470, 116];
const R19_POS = (() => {
  const cx = (R19_CODE_CAP[0] - R19_CROP[0] + R19_CODE_CAP[2] / 2) * R19_SCALE;
  const cy = (R19_CODE_CAP[1] - R19_CROP[1] + R19_CODE_CAP[3] / 2) * R19_SCALE;
  return { x: Math.round(960 - 14 - cx), y: Math.round(540 - 14 - cy) };
})();
const R19_CODE = inProof(proofRect({ crop: R19_CROP, scale: R19_SCALE, ...R19_POS }).image, R19_CROP, R19_SCALE, R19_CODE_CAP);
const R19_TWIN = screenAt(RC.step2Code, T.r19, C_KEYS, C_OPTS);

// The terminal: the real checkVerified.
type Out = { input: Record<string, string>; output: Record<string, unknown> };
const VERIFIED = toolOutput("checkVerified") as Out;
if (String(VERIFIED?.output?.guidance) !== '"Payments rollback runbook" is Verified. Safe to cite.' || VERIFIED.output.status !== "verified") {
  throw new Error("P4: captures.json toolOutput.checkVerified changed; check the terminal against the new real output");
}
const TERM = { x: 990, y: 596, w: 880 };

/** The stack's turn at a frame: the side view orbits slowly, then squares up on the snap back. */
const viewC = (frame: number) => {
  const orbit = tween(frame, T.side - 4, T.back - 4, 0, 1, EASE.standard);
  const square = tween(frame, T.back - 2, T.back + 12, 0, 1, EASE.expoOut);
  return { yaw: (14 - 4 * orbit) * (1 - square), pitch: (11 - 3 * orbit) * (1 - square), drop: tween(frame, T.back - 8, T.back + 2, 0, 1, EASE.expoIn) };
};

/** Dashed drop lines and the target outlines (Current, never amber), projected with the stack's own math. */
const DropLines: React.FC = () => {
  const frame = useCurrentFrame();
  const { yaw, pitch, drop } = viewC(frame);
  const draw = tween(frame, T.side + 2, T.side + 16, 0, 1, EASE.expoOut);
  const gone = tween(frame, T.back - 4, T.back + 2, 0, 1, EASE.linear);
  if (draw <= 0 || gone >= 1) return null;
  const v = { ox: STACK_O[0], oy: STACK_O[1], P: STACK_P, yaw, pitch };
  const pr = (x: number, y: number, z: number) => projectStack(x, y, z, v);
  const poly = (r: Rect) => [pr(r.x, r.y, 0), pr(r.x + r.w, r.y, 0), pr(r.x + r.w, r.y + r.h, 0), pr(r.x, r.y + r.h, 0)].map((p) => p.join(",")).join(" ");
  const lines: [number, number, number, number][] = [];
  const add = (d: Rect, z: number, t: Rect) => {
    const zz = z * (1 - drop);
    const a = pr(d.x, d.y + d.h, zz);
    const b = pr(d.x + d.w, d.y + d.h, zz);
    const c = pr(t.x, t.y, 0);
    const e = pr(t.x + t.w, t.y, 0);
    lines.push([a[0], a[1], c[0], c[1]], [b[0], b[1], e[0], e[1]]);
  };
  add(lerpRect(D1, D1_LAND, drop), Z1, T1);
  add(lerpRect(D2, D2_LAND, drop), Z2, T2);
  const stroke = `rgba(34, 113, 126, ${0.55 * (1 - gone)})`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {[T1, T2].map((t, i) => (
        <polygon key={i} points={poly(t)} fill={`rgba(214, 228, 231, ${0.32 * draw * (1 - gone)})`} stroke={stroke} strokeWidth={2} strokeDasharray="8 7" />
      ))}
      {lines.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x1 + (x2 - x1) * draw}
          y2={y1 + (y2 - y1) * draw}
          stroke={stroke}
          strokeWidth={2.5}
          strokeDasharray="9 8"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

const WorldC: React.FC = () => {
  const frame = useCurrentFrame();
  const { yaw, pitch, drop } = viewC(frame);
  const draftsGone = tween(frame, T.back + 1, T.back + 5, 0, 1, EASE.linear);
  const dim =
    1 -
    0.6 *
      Math.max(
        tween(frame, T.r16 + 2, T.r16 + 8) * (1 - tween(frame, T.r16End, T.r16End + 8)),
        tween(frame, T.r17 + 2, T.r17 + 8) * (1 - tween(frame, T.r17End, T.r17End + 8)),
        tween(frame, T.r18, T.r18 + 6) * (1 - tween(frame, T.r19 + 2, T.r19 + 6)),
      );
  const layers = [
    {
      key: "page",
      z: 0,
      node: (
        <>
          <PageTwin {...PAGE_C} />
          <RenamedLine2 />
        </>
      ),
    },
    ...(draftsGone < 1
      ? [
          { key: "d1", z: Z1 * (1 - drop), node: <Hover r={lerpRect(D1, D1_LAND, drop)} which={1} k={K_DRAFT} fade={draftsGone} /> },
          { key: "d2", z: Z2 * (1 - drop), node: <Hover r={lerpRect(D2, D2_LAND, drop)} which={2} k={K_DRAFT} fade={draftsGone} /> },
        ]
      : []),
  ];
  // the terminal arrives by lifting (it has its own dark elevation)
  const tu = tween(frame, T.term, T.term + 14, 0, 1, EASE.expoOut);
  return (
    <Stage world="day" motif="grid" light={["46%", "28%"]}>
      <Camera3D keys={C_KEYS} {...C_OPTS}>
        <div style={{ position: "absolute", inset: 0, opacity: dim < 1 ? dim : undefined }}>
          <ExplodedStack explode={1} yaw={yaw} pitch={pitch} layers={layers} perspective={STACK_P} origin={STACK_O} />
          <DropLines />
          {frame >= T.term ? (
            <Layer depth={1.1}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: `translateY(${26 * (1 - tu)}px) scale(${0.975 + 0.025 * tu})`,
                  transformOrigin: `${TERM.x + TERM.w / 2}px ${TERM.y + 300}px`,
                  opacity: Math.min(1, (frame - T.term + 1) / 3),
                }}
              >
                <TerminalTwin
                  title="Coding agent · MCP"
                  right="doc-drift"
                  x={TERM.x}
                  y={TERM.y}
                  width={TERM.w}
                  fontSize={28}
                  calls={[
                    {
                      cmd: `check-page-freshness {"pageId": "${VERIFIED.input.pageId}"}`,
                      at: T.cmdAt,
                      cps: 130,
                      output: "checkVerified",
                      only: ["status", "citePolicy", "guidance"],
                      streamAt: T.outAt,
                      lps: 60,
                    },
                  ]}
                />
              </div>
            </Layer>
          ) : null}
        </div>
      </Camera3D>
    </Stage>
  );
};

/**
 * STOPGAP (asked of the twins owner): after V20's quick fix the page's step 2 reads `./scripts/rollback-v2.sh --timeout
 * $ROLLBACK_TIMEOUT` (version 2), but PageTwin's step2 has only "old" (rollback.sh) and "new" (both fixes). This draws
 * line 2 as it really read then, on the well's own colour and metrics, slipping with the band; as the drafts land it
 * opens `_SECS` with PageTwin's own morph curve and is removed once both read the same.
 */
const MONO_ADV = (0.6 - 0.01) * 14.5 * K_PAGE;
const WELL_RIGHT = RC.step2.x + RC.step2.w - 11 * K_PAGE;
const RenamedLine2: React.FC = () => {
  const frame = useCurrentFrame();
  const morph = PAGE_C.step2 && typeof PAGE_C.step2 === "object" ? PAGE_C.step2 : { morphAt: T.back + 3, dur: 10 };
  const end = morph.morphAt + (morph.dur ?? 10);
  if (frame >= end) return null;
  const sl = slipProgress(frame, -100, T.back);
  const fix = tween(frame, morph.morphAt, end, 0, 1, EASE.expoOut);
  return (
    <div
      style={{
        position: "absolute",
        left: RC.step2Code.x - 2,
        top: RC.step2Code.y,
        width: WELL_RIGHT - RC.step2Code.x + 2,
        height: RC.step2Code.h,
        background: DAY.surfaceSunk,
        transform: sl > 0 ? `translateX(${sl * SLIP_UNIT * RC.card.w}px)` : undefined,
        display: "flex",
        paddingLeft: 2,
        fontFamily: FONT.mono,
        fontSize: 14.5 * K_PAGE,
        letterSpacing: "-0.01em",
        lineHeight: `${RC.step2Code.h}px`,
        color: DAY.text,
        whiteSpace: "pre",
      }}
    >
      <span style={{ flex: "none" }}>./scripts/rollback-v2.sh --timeout $ROLLBACK_TIMEOUT</span>
      {fix > 0.001 ? (
        <span style={{ display: "inline-block", width: 5 * MONO_ADV * fix, overflow: "hidden", flex: "none" }}>
          <span style={{ display: "inline-block", transform: `translateY(${(1 - fix) * -0.7 * RC.step2Code.h}px)`, opacity: fix }}>_SECS</span>
        </span>
      ) : null}
    </div>
  );
};

/** A draft hovering above the page plane: its own shadow; it fades only as it merges into the page. */
const Hover: React.FC<{ r: Rect; which: 1 | 2; k: number; fade: number }> = ({ r, which, k, fade }) => (
  <div style={{ position: "absolute", left: r.x, top: r.y, opacity: fade > 0 ? 1 - fade : undefined }}>
    <DraftCard k={k} which={which} style={{ boxShadow: ELEV[3] }} />
  </div>
);

const ShotC: React.FC = () => {
  const frame = useCurrentFrame();
  const footIn = frame >= T.footerIn;
  const accepted = tween(frame, T.r16End - 2, T.r16End + 6, 0, 1, EASE.expoOut);
  // the "Accepted." notice stays (bottom right) until the terminal needs its corner
  const footOut = tween(frame, T.term - 12, T.term - 2, 0, 1, EASE.expoIn);
  const cursor: CursorPoint[] = [
    { frame: T.footerIn + 6, x: ACCEPT_PT[0] + 280, y: ACCEPT_PT[1] + 160 },
    { frame: T.r16 - 2, x: ACCEPT_PT[0] + 4, y: ACCEPT_PT[1] + 2, cursor: "pointer", travel: 18 },
  ];
  return (
    <AbsoluteFill>
      <Iso>
        <WorldC />
      </Iso>
      <FloatHold seed="p4-floats-c">
        {footIn && footOut < 1 ? (
          <div style={{ position: "absolute", left: FOOT_POS.x, top: FOOT_POS.y + footOut * 260 }}>
            <Lift at={T.footerIn} from={1} to={4} radius={18 * K_FOOT}>
              {accepted < 1 ? (
                <div style={{ opacity: 1 - accepted }}>
                  <FooterCard k={K_FOOT} style={{ boxShadow: "none" }} />
                </div>
              ) : null}
              {accepted > 0 ? (
                <div style={{ position: accepted < 1 ? "absolute" : "relative", left: 0, top: 0, opacity: accepted }}>
                  <SuccessNotice
                    k={K_FOOT}
                    title={`Accepted. A new page version names PR #482.`}
                    body={STR.reloadPage}
                    style={{ background: DAY.verifiedTint, boxShadow: ELEV[4], borderRadius: 18 * K_FOOT, minWidth: 520 * K_FOOT }}
                  />
                </div>
              ) : null}
            </Lift>
          </div>
        ) : null}
        <Cursor points={cursor} showAt={T.footerIn + 6} hideAt={T.r16} />
      </FloatHold>
      {/* R16: the real click on "accepts", then, cut on the beat, "Accepted." (one proof; the jump reframes) */}
      {frame >= T.r16 ? (
        <ProofFrame
          capture="p4-accept-rec"
          crop={R16_CROP_A}
          scale={R16_SCALE}
          {...R16_POS_A}
          at={T.r16}
          video={{ from: T.r16Src, to: 18.5, jumps: [{ at: T.r16Cut, to: 18.0, crop: R16_CROP_B }] }}
          tag="Recorded in Confluence"
        />
      ) : null}
      {frame >= T.r16 && frame < T.r16Cut ? (
        <Cursor
          points={[
            { frame: T.r16, x: R16_CLICK.x + 36, y: R16_CLICK.y + 26, cursor: "pointer" },
            { frame: T.r16Click, x: R16_CLICK.x, y: R16_CLICK.y, click: true, cursor: "pointer", travel: 4 },
          ]}
        />
      ) : null}
      {frame >= T.r18 ? (
        <ProofFrame
          capture="p4-history"
          crop={R18_CROP}
          scale={R18_SCALE}
          {...R18_POS}
          at={T.r18}
          dur={T.r18End - T.r18}
          tag="Recorded in Confluence: page history"
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** World C with R17 (the byline) and R19 (step 2) growing out of the twin. */
const ShotCWithProofs: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.r19) {
    return (
      <MorphToReal
        at={T.r17}
        fromRect={R17_TWIN}
        toRect={R17_ITEM}
        twinRest={1}
        twin={<ShotC />}
        proof={
          <ProofFrame
            capture="p4-verified-tooltip"
            crop={R17_CROP}
            scale={R17_SCALE}
            {...R17_POS}
            at={T.r17}
            dur={T.r17End - T.r17}
            enter="none"
            masks={[PILL_MASK]}
            tag="Recorded in Confluence"
          />
        }
      />
    );
  }
  return (
    <MorphToReal
      at={T.r19}
      fromRect={R19_TWIN}
      toRect={R19_CODE}
      twin={<ShotC />}
      proof={
        <ProofFrame capture="p4-step2-fixed" crop={R19_CROP} scale={R19_SCALE} {...R19_POS} at={T.r19} enter="none" exit="none" tag="Recorded in Confluence" />
      }
    />
  );
};

/** P4's last pose (R19 over the page), for P5's slip push out of it. */
export const P4FinalPose: React.FC = () => <ShotCWithProofs />;

// =====================================================================================================================
// The scene
// =====================================================================================================================

const P4: React.FC = () => {
  const frame = useCurrentFrame();
  let picture: React.ReactNode;
  if (frame < T.zoom) picture = <WhipBlur at={T.whip} dir="down" from={<CommentShot />} to={<BylineShot />} />;
  else if (frame < T.side - 6) picture = <ZoomThrough at={T.zoom} center={CLICK_PT} from={<BylineShot />} to={frame < T.r15 ? <ShotB /> : <ShotBWithR15 />} />;
  else picture = <WhipBlur at={T.side} dir="left" from={<ShotBWithR15 />} to={<ShotCWithProofs />} />;
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      {picture}
      {/* V19 */}
      <Sfx id="pop" at={T.pop + 3} gainDb={-5} />
      <Sfx id="tick-soft" at={T.r13 + 6} />
      <Sfx id="whoosh-short" at={T.whip} gainDb={-2} />
      <Sfx id="click" at={T.click} />
      <Sfx id="whoosh-short" at={T.zoom + 8} gainDb={-3} />
      {/* V20 */}
      <Sfx id="swish-up" at={T.breakout + 10} gainDb={-2} />
      <Sfx id="tick-soft" at={T.r14 + 4} />
      <Sfx id="click" at={T.r14Click} />
      <Sfx id="tick-soft" at={T.r14Cut + 1} />
      <Sfx id="pop" at={T.noAiLand} gainDb={-4} />
      <Sfx id="whoosh-short" at={T.noAiOut + 6} gainDb={-6} />
      {/* V21 */}
      <Sfx id="click" at={T.proposeClick} />
      <Sfx id="pop" at={T.agentIn + 10} gainDb={-6} />
      <Sfx id="tick-soft" at={T.rows[0]} />
      <Sfx id="tick-soft" at={T.rows[1]} />
      <Sfx id="click" at={T.confirm} gainDb={-3} />
      <Sfx id="pop" at={T.draft1 + 10} gainDb={-3} />
      <Sfx id="pop" at={T.draft2 + 10} gainDb={-4} />
      <Sfx id="tick-soft" at={T.r15 + 4} />
      <Sfx id="whoosh-short" at={T.side} gainDb={-2} />
      <Sfx id="pop" at={T.footerIn + 8} gainDb={-6} />
      <Sfx id="click" at={T.r16Click} />
      <Sfx id="tick-soft" at={T.r16Cut + 1} />
      {/* V22: the score has its own hit on snapBack and the voice says "Verified." 3 f later */}
      <Sfx id="snap" at={T.back + 2} gainDb={-3} />
      <Sfx id="tick-soft" at={T.r17 + 4} />
      <Sfx id="type-burst" at={T.cmdAt} gainDb={-10} />
      <Sfx id="tick-soft" at={T.r18 + 4} />
      <Sfx id="tick-soft" at={T.r19 + 4} />
    </AbsoluteFill>
  );
};

export default P4;
