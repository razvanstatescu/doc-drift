import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { Icon } from "../../brand/icons";
import { Cursor, type CursorPoint } from "../../components/Cursor";
import { FlyToken, SlotWord } from "../../components/P1/Fly";
import { CURSOR_FROM, FRESH_LEAD, FRESH_PAGE, freshCursor, freshRects, P1_BASE, toScreen } from "../../components/P1/fresh";
import { savedRects, SuggestionsTwin, suggestionsLayout } from "../../components/P1/SuggestionsTwin";
import type { Box } from "../../lib/captures";
import { EASE, tween } from "../../lib/time";
import { getScene } from "../../lib/timeline";
import { Camera3D, cam3At, KineticLine, lineCues, MorphToReal, ProofFrame, proofPoint, PushCut, RebuildFromReal, Stage, useCam3, type Cam3, type Cam3Key } from "../../v4/kit";
import { DAY, elevAt, FONT, type Rect } from "../../v4/look";
import { BYLINE, PageTwin, pageRects, textWidth, TOOLTIPS, type PageTwinProps } from "../../v4/twins";

/**
 * P1 · Anchor (Day), V11 and V12 (R3 section 5; rounds 2 and 3 after the QA reviews S-2, S-5, S-6 and K-7).
 * Explain with twins, prove with real captures (R1, R2, R3, R4). Frames are local, from the narration cues:
 *
 *   0       the fresh runbook twin from A2's last shot ("Unanchored · Doc Drift"); the cursor rests on the byline item
 *   13      the tooltip twin: "Not linked to code or Jira. Add anchors."
 *   30      R1 (T3 from the byline item): the real byline and tooltip, "Real capture, development install" (the still
 *           p1-unanchored-tooltip: p1-anchor-rec's logged mask is measured on its Verified end and would cover part of
 *           "Doc Drift" at 3.97-4.97 s); 60: the wipe back to the twin, the cursor leaves, the tooltip closes
 *   70      the whole page; a scan line reads it ("Doc Drift reads ...")
 *   paths   one decisive push into step 2's code; `scripts/rollback.sh` lifts off it as a chip at elevation 4
 *   Jira    `PAY-6` lifts off the header table as the camera travels right (turned while it travels, square on landing)
 *   136     the suggestions panel lifts in under the two flying chips, its card already holding room for both rows
 *   158     the chips dock into their own rows (PAY-6 checked; scripts/rollback.sh "Needs a repository", Weak, unchecked),
 *           never on the Save button or the card's border (S-2)
 *   suggests  the line's statement rises word by word in the empty side: "Suggests anchors."
 *   180     R2 (T3 from the card): the real card; 225: the wipe back; the statement leaves by moving
 *   227     "payments-api" types into "Repository for suggested paths"; row 2 rolls to "in payments-api", is ticked
 *   255     the click on "Save and mark verified": R3 by a push-cut, the real notice; behind it the panel saves and
 *           re-centres lower, and the camera widens so the notice and the byline are both in frame
 *   283     a copy of "Verified" lifts out of the notice (the sentence stays whole), glides level between the page's title
 *           and byline, waits over its slot while the old words leave, and seats as the new ones uncover (S-6); the
 *           panel leaves by moving; one decisive push onto the byline, then it settles; "✓ Verified." is set whole
 *           with a push, after the copy, on the word (K-7)
 *   315     R4 (T3 from the byline item, a tight crop at 1:1): the real Verified byline and tooltip; 345: the wipe back
 *   360     the final pose, carried off by the kit's slipPush scene cut
 *
 * One amber per shot: none in P1. Proofs are never restyled; their logged masks are drawn (the byline pill's in its
 * own #F1F1F2), each crop is checked by the kit's crop guard, and each tag has 40 px above its mat.
 */
const sc = getScene("P1");
const w11 = (word: string) => sc.wordAt("V11", word);
const w12 = (word: string) => sc.wordAt("V12", word);

export const P1_T = {
  hover: 10,
  tooltip: 13,
  r1: 30,
  r1Out: 60,
  /** The hover ends (the cursor leaves as the camera pulls back) and the tooltip closes. */
  unhover: 64,
  scan: { at: 70, dur: 30 },
  /** The decisive push of V11 (director's decision 2), landing on "paths". */
  push: w11("paths") - 12,
  liftA: w11("paths") - 4,
  flyA: w11("paths") + 8,
  liftB: w11("jira") - 4,
  flyB: w11("jira") + 5,
  travel: w11("paths") + 8,
  panel: 136,
  rack: 138,
  /**
   * S-2 (round 3): the card already has room for both rows when the panel lifts in (the flying tokens are over it by
   * then), so each token docks into its own row and never on the Save button or the card's border.
   */
  rowsGrow: 128,
  dockB: w11("suggests") - 20,
  dockA: w11("suggests") - 16,
  r2: 180,
  r2Out: 225,
  /** "Suggests anchors." leaves by moving once read (from about f200, it holds 40 frames). */
  say1Out: 240,
  field: 224,
  type: 227,
  check2: 246,
  save: 255,
  r3: 255,
  saved: 263,
  r3Out: 277,
  /**
   * S-6 (round 3): the copy of "Verified" lifts out of the notice (2 frames up, clear of its sentence), glides level
   * between the page's title and byline (7 frames), waits over its slot (2) while the old words leave beneath it, and
   * seats (1) as the new words uncover; the panel leaves as it glides.
   */
  verifiedLift: 283,
  flight: { rise: 2, glide: 7, hover: 2, drop: 1 },
  panelOut: 286,
  /** The byline's slip swap: the old words gone at `swap`, "Verified · Doc Drift" readable at swap + 3 (2 frames early). */
  swap: w12("verified") - 5,
  /** The copy seats one frame after `swap`, over the new word as it uncovers: the byline reads Verified 4 frames early. */
  land: w12("verified") - 4,
  /** The decisive push of V12 onto the byline as the copy seats, then it settles for R4. */
  push2: w12("verified") - 5,
  settle: w12("verified") + 5,
  /** V12's statement, set whole with a push (K-7) once the copy has seated (S-6), readable on "Verified". */
  say2: w12("verified") - 2,
  r4: 315,
  r4Out: 345,
  end: sc.durationInFrames,
};
const T = P1_T;

// ---- the world (stage px) ----
const PANEL = { x: 1010, y: 168 };
const L = suggestionsLayout(PANEL);
/**
 * When it saves, the panel re-centres on its shorter content (behind R3), 130 px down: the notice's top edge then
 * sits below the free line between the page's title and byline, the lane the copy of "Verified" travels (S-6).
 */
const SAVED_SHIFT = 130;
const SAVED = savedRects(L, SAVED_SHIFT);
const card = freshRects.card;
const k = freshRects.k;
const tokens = freshRects.tokens;
const rollbackHome = tokens["scripts/rollback.sh"] as Rect;
const payHome = tokens["PAY-6"] as Rect;
const verifiedRects = pageRects({ ...FRESH_PAGE, byline: { kind: "dds", state: "verified" } });
const unanchoredBadge = freshRects.badge;
const verifiedBadge = verifiedRects.badge;
const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

/** The page's props at a frame: the byline swaps to Verified as the word lands; the tooltip is the hover's. */
const pageAt = (frame: number): PageTwinProps => ({
  ...FRESH_PAGE,
  byline: { kind: "dds", state: "verified", from: "unanchored", at: T.swap },
  tooltip: frame < 200 ? { text: TOOLTIPS.unanchored, at: T.tooltip, out: T.unhover + 2 } : { text: TOOLTIPS.verified2, at: T.land + 12 },
  scan: T.scan,
});

/** The word "Verified" inside the byline item (after its icon). */
const bylineWordRect: Rect = {
  x: verifiedBadge.x + (BYLINE.padX + BYLINE.icon + BYLINE.gap) * k,
  y: verifiedBadge.y,
  w: textWidth("Verified", { size: BYLINE.size, weight: BYLINE.weight }) * k,
  h: verifiedBadge.h,
};
/**
 * The copy's lane: the free line between the title's baseline and the byline's capitals (title 27 UI px on a 33 px
 * line, byline 15 UI px centred in its 28 px item), about 50 px of clear paper at k 1.8.
 */
const TITLE_BASELINE = freshRects.title.y + (freshRects.title.h - 1.2 * 27 * k) / 2 + 0.96 * 27 * k;
const BYLINE_CAPS = cy(verifiedBadge) + (0.36 - 0.7) * BYLINE.size * k;
const LANE = (TITLE_BASELINE + BYLINE_CAPS) / 2;

// ---- camera ----
/** On the panel, its left edge at 700 px so the line's statement has the left side. */
const PANEL_CAM: Partial<Cam3> = { x: L.panel.x + 260, y: L.panel.y + L.panel.h / 2, zoom: 1, yaw: 0, pitch: 0 };
/** Wide: the page's title and byline and the re-centred notice, all whole (S-6), for the flight of "Verified". */
const WIDE = (() => {
  const x0 = card.x - 40;
  const x1 = SAVED.notice.x + SAVED.notice.w + 40;
  const y0 = freshRects.title.y - 120;
  const y1 = SAVED.notice.y + SAVED.notice.h + 120;
  const zoom = Math.min(1.1, 1920 / (x1 - x0), 1080 / (y1 - y0));
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, zoom };
})();
/** The end framing: the Verified item at screen (625, 520), zoom 1 (R4 lands on it; the statement has the right side). */
const END_AT: [number, number] = [625, 520];
const camOn = (r: Rect, at: [number, number], zoom: number): Partial<Cam3> => ({ x: cx(r) - (at[0] - 960) / zoom, y: cy(r) - (at[1] - 540) / zoom, zoom });

const KEYS: Cam3Key[] = [
  // the whole page for the scan
  { at: T.r1Out, dur: 22, to: { x: cx(card) + 30, y: card.y + card.h / 2 - 10, zoom: 0.93 }, ease: EASE.expoInOut },
  // "paths": one decisive push into step 2's code line, where the path lifts off
  { at: T.push, dur: 12, to: { x: cx(rollbackHome) + 40, y: cy(rollbackHome) - 40, zoom: 1.4 }, ease: EASE.expoOut },
  // travel right with the flying chips, turned while it travels (M2)
  { at: T.travel, dur: 26, to: { x: 1060, y: 480, zoom: 0.95, yaw: -6, pitch: 1.5 }, ease: EASE.expoInOut },
  // land square on the panel
  { at: T.travel + 26, dur: 26, to: PANEL_CAM, ease: EASE.expoOut },
  // behind R2: closer on the field, the rows and the save button
  { at: T.r2 + 14, dur: 28, to: { x: (PANEL_CAM.x ?? 0) + 20, y: (L.field.y + L.save.y + L.save.h) / 2, zoom: 1.08 } },
  // behind R3: wide, so the notice and the byline are both whole when "Verified" leaves
  { at: T.saved, dur: 18, to: WIDE, ease: EASE.expoInOut },
  // "Verified": one decisive push onto the byline item (1.35x), then it settles where R4 lands
  { at: T.push2, dur: 9, to: camOn(verifiedBadge, END_AT, 1.35), ease: EASE.expoOut },
  { at: T.settle, dur: 9, to: camOn(verifiedBadge, END_AT, 1), ease: EASE.standard },
];
const CAM_OPTS = { base: P1_BASE, float: 0, creep: 1.5, seed: "p1" } as const;
const camAt = (f: number) => cam3At(f, KEYS, CAM_OPTS);
const screenOf = (f: number, r: Rect) => toScreen(camAt(f), r);

// ---- proofs ----
const TAG = "Recorded in Confluence";
const HOVER_GREY = "#F1F1F2";

/** R1: the real Unanchored byline and its tooltip (h 300: the tooltip whole, the table row below it out). */
const R1_CROP: Box = [1440, 300, 1460, 300];
const R1_SCALE = 0.75;
/** The real byline pill (hover grey), capture px, measured on the still: 2271-2756, 460-507. */
const PILL_UN: Box = [2271, 460, 486, 48];
const twinBadgeR1 = screenOf(T.r1, unanchoredBadge);
const R1_POS = {
  x: Math.round(cx(twinBadgeR1) - (PILL_UN[0] + PILL_UN[2] / 2 - R1_CROP[0]) * R1_SCALE - 14),
  y: Math.round(cy(twinBadgeR1) - (PILL_UN[1] + PILL_UN[3] / 2 - R1_CROP[1]) * R1_SCALE - 14),
};
const R1_PLACED = { crop: R1_CROP, scale: R1_SCALE, x: R1_POS.x, y: R1_POS.y };
const R1_EL = (
  <ProofFrame
    capture="p1-unanchored-tooltip"
    {...R1_PLACED}
    at={T.r1}
    dur={T.r1Out - T.r1}
    enter="none"
    exit="none"
    tag={TAG}
    note="Real capture, development install"
    maskFill={HOVER_GREY}
  />
);

/** R2: the real suggestions card (the whole card: title to row 2). */
const R2_CROP: Box = [1170, 656, 1500, 400];
const R2_SCALE = 0.8;
const cardR2 = screenOf(T.r2, L.card);
const R2_W = R2_CROP[2] * R2_SCALE + 28;
const R2_POS = {
  x: Math.round(Math.max(660, Math.min(1920 - 40 - R2_W, cx(cardR2) - R2_W / 2))),
  y: Math.round(Math.max(60, cy(cardR2) - (R2_CROP[3] * R2_SCALE + 28) / 2)),
};
const R2_PLACED = { crop: R2_CROP, scale: R2_SCALE, x: R2_POS.x, y: R2_POS.y };
const R2_EL = <ProofFrame capture="p1-suggestions" {...R2_PLACED} at={T.r2} dur={T.r2Out - T.r2} enter="none" exit="none" tag={TAG} />;

/** R3: the real modal header and notice after the save. */
const R3_CROP: Box = [1120, 240, 1600, 520];
const R3_SCALE = 0.7;
const R3_PLACED = { crop: R3_CROP, scale: R3_SCALE, x: Math.round((1920 - (R3_CROP[2] * R3_SCALE + 28)) / 2), y: Math.round((1080 - (R3_CROP[3] * R3_SCALE + 28)) / 2) + 20 };
/** The real notice box in p1-saved (capture px 1168-2671, 512-751, sampled). */
const R3_NOTICE = proofPoint(R3_PLACED, [1168, 512, 1504, 240]);
const R3_EL = <ProofFrame capture="p1-saved" {...R3_PLACED} at={T.r3} dur={T.r3Out - T.r3} enter="none" exit="none" tag={TAG} />;

/**
 * R4: a tight crop at 1:1: "Add a reaction", the real Verified byline item and its tooltip. Every edge is on whitespace
 * (checked: the column at 2032 lies between "Listen" and the reaction icon; the tooltip's box starts at 2250, under
 * the end of "reaction", so no edge can sit between them).
 */
const R4_CROP: Box = [2032, 446, 708, 140];
/** 0.92, not 1: the content then has room to creep inside the mat (at 1:1 it cannot, and the shot freezes, M1). */
const R4_SCALE = 0.92;
const PILL_VER: Box = [2271, 460, 435, 48];
const twinBadgeR4 = screenOf(T.r4, verifiedBadge);
const R4_POS = {
  x: Math.round(cx(twinBadgeR4) - (PILL_VER[0] + PILL_VER[2] / 2 - R4_CROP[0]) * R4_SCALE - 14),
  y: Math.round(cy(twinBadgeR4) - (PILL_VER[1] + PILL_VER[3] / 2 - R4_CROP[1]) * R4_SCALE - 14),
};
const R4_PLACED = { crop: R4_CROP, scale: R4_SCALE, x: R4_POS.x, y: R4_POS.y };
const R4_EL = (
  <ProofFrame capture="p1-verified-tooltip" {...R4_PLACED} at={T.r4} dur={T.r4Out - T.r4} enter="none" exit="none" tag={TAG} maskFill={HOVER_GREY} creep={5} />
);

// ---- cursors (in the world; counter-scaled so they keep their screen size) ----
const check2C: [number, number] = [cx(L.check2), cy(L.check2)];
const saveC: [number, number] = [L.save.x + L.save.w * 0.42, cy(L.save)];
const fieldC: [number, number] = [L.field.x + 300, cy(L.field)];
const CURSOR_V11: CursorPoint[] = [...freshCursor(0), { frame: T.unhover + 10, x: CURSOR_FROM[0] + 260, y: CURSOR_FROM[1] + 380, travel: 14 }];
const CURSOR_V12: CursorPoint[] = [
  { frame: T.field - 12, x: fieldC[0] + 120, y: fieldC[1] + 150 },
  { frame: T.field, x: fieldC[0], y: fieldC[1], cursor: "text", click: true, travel: 10 },
  { frame: T.check2, x: check2C[0], y: check2C[1], cursor: "pointer", click: true, travel: 10 },
  { frame: T.save, x: saveC[0], y: saveC[1], cursor: "pointer", click: true, travel: 8 },
];

const WorldCursor: React.FC<{ points: CursorPoint[]; show: number; hide: number }> = ({ points, show, hide }) => {
  const cam = useCam3();
  const frame = useCurrentFrame();
  if (frame < show - 1 || frame > hide + 6) return null;
  return <Cursor points={points} scale={2.4 / cam.zoom} showAt={show} hideAt={hide} theme="day" />;
};

/** The page goes soft and drained behind the panel (R2 section 10, rack focus), and comes back for "Verified". */
const RackPage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const r = tween(frame, T.rack, T.rack + 12, 0, 1, EASE.expoOut) * (1 - tween(frame, T.verifiedLift - 4, T.verifiedLift + 6, 0, 1, EASE.expoOut));
  if (r < 0.01) return <>{children}</>;
  return <div style={{ position: "absolute", inset: 0, filter: `blur(${(6 * r).toFixed(2)}px) grayscale(${(0.7 * r).toFixed(2)})`, opacity: 1 - 0.25 * r }}>{children}</div>;
};

/** The whole twin world under its camera. */
const TwinWorld: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Camera3D keys={KEYS} {...CAM_OPTS}>
      <RackPage>
        <PageTwin {...pageAt(frame)} />
      </RackPage>
      <SuggestionsTwin
        x={PANEL.x}
        y={PANEL.y}
        appear={T.panel}
        rows={[T.dockB, T.dockA]}
        rowsGrow={T.rowsGrow}
        typed={{ at: T.type, dur: 11 }}
        check2={T.check2}
        savePress={T.save}
        saved={T.saved}
        verifiedLift={T.verifiedLift}
        savedShift={SAVED_SHIFT}
        leave={T.panelOut}
      />
      <FlyToken text="scripts/rollback.sh" home={rollbackHome} to={L.chip2} font={L.chipFont} liftAt={T.liftA} flyAt={T.flyA} land={T.dockA} arc={130} />
      {/* PAY-6 comes in level with its row (a slight dip, no arc over the repository field) */}
      <FlyToken text="PAY-6" home={payHome} to={L.chip1} font={L.chipFont} liftAt={T.liftB} flyAt={T.flyB} land={T.dockB} arc={-15} />
      <SlotWord
        text="Verified"
        from={SAVED.verifiedWord}
        to={bylineWordRect}
        fromFont={L.noticeFont}
        toFont={BYLINE.size * k}
        textW={bylineWordRect.w}
        lane={LANE}
        at={T.verifiedLift}
        rise={T.flight.rise}
        glide={T.flight.glide}
        hover={T.flight.hover}
        drop={T.flight.drop}
        hold={4}
      />
      <WorldCursor points={CURSOR_V11} show={-FRESH_LEAD + 2} hide={T.unhover + 6} />
      <WorldCursor points={CURSOR_V12} show={T.field - 12} hide={T.save + 4} />
    </Camera3D>
  );
};

/** The line's one focal statement (director's decision 1): Fathom, in the empty side, still while read, leaves by moving. */
const SuggestsLine: React.FC = () => {
  const frame = useCurrentFrame();
  const words = lineCues(sc.line("V11"), "Suggests anchors.");
  const start = (words[0]?.from ?? T.dockB) - 8;
  if (frame < start) return null;
  const away = tween(frame, T.say1Out, T.say1Out + 10, 0, 1, EASE.expoIn);
  if (away >= 1) return null;
  return (
    <div style={{ position: "absolute", left: 110, top: 372, transform: away > 0 ? `translateX(${-away * 900}px)` : undefined }}>
      <KineticLine text={"Suggests\nanchors."} at={start} words={words} size={120} lineHeight={128} />
    </div>
  );
};

/**
 * V12's statement: the Verified icon and "Verified." on the byline's row, in the right side. Set whole on the beat with
 * a push (round 3, K-7: "Suggests anchors." builds word by word, this one does not): icon and word arrive together,
 * pushed in from 0.9x with a 3-frame focus pull, 2 frames after the copy of "Verified" has seated in the byline (S-6),
 * so it reads on the word.
 */
const VerifiedLine: React.FC = () => {
  const frame = useCurrentFrame();
  const at = T.say2;
  if (frame < at) return null;
  const push = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
  const o = tween(frame, at, at + 2, 0, 1, EASE.linear);
  const focus = 1 - tween(frame, at, at + 3, 0, 1, EASE.linear);
  const icon = 104;
  return (
    <div
      style={{
        position: "absolute",
        left: 1214,
        top: END_AT[1] - 64,
        height: 128,
        display: "flex",
        alignItems: "center",
        gap: 26,
        opacity: o < 1 ? o : undefined,
        transform: push < 1 ? `scale(${0.9 + 0.1 * push})` : undefined,
        transformOrigin: "12% 50%",
        filter: focus > 0.02 ? `blur(${(5 * focus).toFixed(2)}px)` : undefined,
      }}
    >
      <span
        style={{
          width: icon,
          height: icon,
          borderRadius: "50%",
          background: DAY.verifiedTint,
          boxShadow: elevAt(1 + 1.5 * push),
          display: "grid",
          placeItems: "center",
          flex: "none",
        }}
      >
        <Icon name="check" size={icon * 0.62} color={DAY.verified} stroke={2.4} />
      </span>
      <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 120, lineHeight: 1.05, letterSpacing: "-0.028em", color: DAY.text, whiteSpace: "nowrap" }}>Verified.</span>
    </div>
  );
};

const P1: React.FC = () => {
  const frame = useCurrentFrame();
  const world = <TwinWorld />;
  let picture: React.ReactNode = world;

  if (frame >= T.r1 && frame < T.r1Out) {
    picture = <MorphToReal at={T.r1} fromRect={twinBadgeR1} toRect={proofPoint(R1_PLACED, PILL_UN)} twin={world} proof={R1_EL} />;
  } else if (frame >= T.r1Out && frame < T.r1Out + 7) {
    picture = <RebuildFromReal at={T.r1Out} fromRect={proofPoint(R1_PLACED, PILL_UN)} toRect={screenOf(T.r1Out, unanchoredBadge)} twin={world} proof={R1_EL} />;
  } else if (frame >= T.r2 && frame < T.r2Out) {
    picture = <MorphToReal at={T.r2} fromRect={cardR2} toRect={proofPoint(R2_PLACED, R2_CROP)} twin={world} proof={R2_EL} />;
  } else if (frame >= T.r2Out && frame < T.r2Out + 7) {
    picture = <RebuildFromReal at={T.r2Out} fromRect={proofPoint(R2_PLACED, R2_CROP)} toRect={screenOf(T.r2Out, L.card)} twin={world} proof={R2_EL} />;
  } else if (frame >= T.r3 && frame < T.r3Out) {
    const behind = <MorphToReal at={T.r3} dur={4} fromRect={R3_NOTICE} toRect={R3_NOTICE} twin={world} proof={R3_EL} />;
    picture = frame < T.r3 + 8 ? <PushCut at={T.r3} from={world} to={behind} /> : behind;
  } else if (frame >= T.r3Out && frame < T.r3Out + 7) {
    picture = <RebuildFromReal at={T.r3Out} fromRect={R3_NOTICE} toRect={screenOf(T.r3Out, SAVED.notice)} twin={world} proof={R3_EL} />;
  } else if (frame >= T.r4 && frame < T.r4Out) {
    picture = <MorphToReal at={T.r4} fromRect={twinBadgeR4} toRect={proofPoint(R4_PLACED, PILL_VER)} twin={world} proof={R4_EL} />;
  } else if (frame >= T.r4Out && frame < T.r4Out + 7) {
    picture = <RebuildFromReal at={T.r4Out} fromRect={proofPoint(R4_PLACED, PILL_VER)} toRect={screenOf(T.r4Out, verifiedBadge)} twin={world} proof={R4_EL} />;
  }

  return (
    <AbsoluteFill>
      <Stage world="day" motif="grid" light={["46%", "36%"]}>
        {picture}
      </Stage>
      <SuggestsLine />
      <VerifiedLine />
      {/* sound: effects sit well under the voice (V4.md section 3) */}
      <Sfx id="tick-soft" at={T.r1 + 4} gainDb={-4} />
      <Sfx id="whoosh-short" at={T.push + 6} gainDb={-12} />
      {/* metrics r2: this pop sat 5.3 dB under the voice on "the"; 3.5 dB lower */}
      <Sfx id="pop" at={T.liftA + 2} gainDb={-9.5} />
      <Sfx id="pop" at={T.liftB + 2} gainDb={-6} />
      <Sfx id="tick-soft" at={T.dockB} gainDb={-2} />
      <Sfx id="tick-soft" at={T.dockA} gainDb={-2} />
      <Sfx id="tick-soft" at={T.r2 + 4} gainDb={-4} />
      <Sfx id="click" at={T.field} gainDb={-6} />
      {[0, 3, 6, 9].map((d) => (
        <Sfx key={`key-${d}`} id="type-key" at={T.type + d} gainDb={-8} />
      ))}
      <Sfx id="click" at={T.check2} gainDb={-4} />
      <Sfx id="click" at={T.save} gainDb={-2} />
      <Sfx id="tick-soft" at={T.r3 + 6} gainDb={-4} />
      <Sfx id="chime-soft" at={T.land + 2} gainDb={-1} />
      <Sfx id="tick-soft" at={T.r4 + 4} gainDb={-4} />
    </AbsoluteFill>
  );
};

export default P1;
