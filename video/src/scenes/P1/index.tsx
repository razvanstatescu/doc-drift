import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { Cursor, type CursorPoint } from "../../components/Cursor";
import { FlyToken, FlyWord } from "../../components/P1/Fly";
import { CURSOR_FROM, FRESH_LEAD, FRESH_PAGE, freshCursor, freshRects, P1_BASE, toScreen } from "../../components/P1/fresh";
import { SuggestionsTwin, suggestionsLayout } from "../../components/P1/SuggestionsTwin";
import { EASE, tween } from "../../lib/time";
import { getScene } from "../../lib/timeline";
import { Camera3D, cam3At, MorphToReal, ProofFrame, PushCut, RebuildFromReal, Stage, useCam3, type Cam3, type Cam3Key } from "../../v4/kit";
import type { Rect } from "../../v4/look";
import { BYLINE, PageTwin, pageRects, textWidth, TOOLTIPS, type PageTwinProps } from "../../v4/twins";

/**
 * P1 · Anchor (Day), V11 and V12 (R3 section 5). Explain with twins, prove with real captures (R1, R2, R3, R4).
 * All frames are local, from the narration cues in timeline.json:
 *
 *   0       the fresh runbook twin from A2's last shot ("Unanchored · Doc Drift"); the cursor rests on the byline item
 *   13      the tooltip twin: "Not linked to code or Jira. Add anchors."
 *   30      R1 (T3 from the byline item): the real byline and tooltip, "Real capture, development install"
 *           (the still p1-unanchored-tooltip: p1-anchor-rec's logged mask is measured on its Verified end and would
 *           cover part of "Doc Drift" at 3.97-4.97 s); 60: T4 back to the twin, the cursor leaves, the tooltip closes
 *   70      the camera pulls back to the whole page; a scan line reads it ("Doc Drift reads ...")
 *   paths   `scripts/rollback.sh` lifts off step 2's code; "Jira keys": `PAY-6` lifts off the header table
 *   136     the suggestions panel lifts in over the page's right edge, the page racks out of focus; the camera tracks
 *           right with the flying tokens (yaw -6 while it travels, square when it lands)
 *   suggests  the two tokens dock as the rows: PAY-6 (Jira issue, checked), scripts/rollback.sh (Needs a repository, Weak)
 *   180     R2 (T3 from the suggestions card): the real card; 225: T4 back
 *   226     "payments-api" types into "Repository for suggested paths"; row 2 reads "in payments-api" and is ticked
 *   255     the click on "Save and mark verified", and R3 by a push-cut: "Saved 2 anchors. This page is Verified."
 *   287     "Verified" lifts out of the notice and flies into the byline as the camera returns to the page
 *   Verified  it lands: "Verified · Doc Drift"; 300: R4 (T3 from the badge), the real Verified byline and tooltip
 *   330     T4 back: the final pose (the twin, Verified, its tooltip), handed to the kit's slipPush scene cut
 *
 * One amber per shot: none in P1. Proofs are never restyled; their logged masks are drawn, and the byline masks are
 * re-covered in the hover pill's own grey (#F1F1F2, sampled) so they are invisible.
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
  scan: { at: 70, dur: 34 },
  liftA: w11("paths") - 2,
  liftB: w11("jira") - 2,
  flyA: w11("paths") + 8,
  flyB: w11("jira") + 6,
  panel: 136,
  rack: 138,
  dockB: w11("suggests") - 4,
  dockA: w11("suggests") - 2,
  r2: 180,
  r2Out: 225,
  field: 224,
  type: 227,
  check2: 246,
  save: 255,
  r3: 255,
  saved: 263,
  r3Out: 282,
  verifiedLift: 289,
  land: w12("verified") - 2,
  /** The suggestions panel leaves by moving once its word has gone. */
  panelOut: w12("verified") + 3,
  r4: 315,
  r4Out: 345,
  end: sc.durationInFrames,
};
const T = P1_T;

// ---- the world (stage px) ----
const PANEL = { x: 1010, y: 168 };
const L = suggestionsLayout(PANEL);
const card = freshRects.card;
const k = freshRects.k;
const tokens = freshRects.tokens;
const rollbackHome = tokens["scripts/rollback.sh"] as Rect;
const payHome = tokens["PAY-6"] as Rect;

/** The page's props at a frame: the byline swaps to Verified as the word lands; the tooltip is the hover's. */
const pageAt = (frame: number): PageTwinProps => ({
  ...FRESH_PAGE,
  byline: { kind: "dds", state: "verified", from: "unanchored", at: T.land - 7 },
  tooltip: frame < 200 ? { text: TOOLTIPS.unanchored, at: T.tooltip, out: T.unhover + 2 } : { text: TOOLTIPS.verified2, at: T.land + 12 },
  scan: T.scan,
});

const verifiedRects = pageRects({ ...FRESH_PAGE, byline: { kind: "dds", state: "verified" } });
const unanchoredBadge = freshRects.badge;
const verifiedBadge = verifiedRects.badge;
/** The word "Verified" inside the byline item (after its icon). */
const bylineWordRect: Rect = {
  x: verifiedBadge.x + (BYLINE.padX + BYLINE.icon + BYLINE.gap) * k,
  y: verifiedBadge.y,
  w: textWidth("Verified", { size: BYLINE.size, weight: BYLINE.weight }) * k,
  h: verifiedBadge.h,
};

const panelCx = L.panel.x + L.panel.w / 2;
const badgeCx = unanchoredBadge.x + unanchoredBadge.w / 2;
const badgeCy = unanchoredBadge.y + unanchoredBadge.h / 2;

/** The camera back on the byline for V12's landing: the Verified item where the real Verified pill lands in R4. */
const R1_SCALE = 0.75;
/** h 300, not R3's 360: the last 60 capture px start the next table row, whose cell names a person (kit STATUS note). */
const R1_CROP: [number, number, number, number] = [1440, 300, 1460, 300];
/** The real byline pills (hover grey), capture px, measured on the stills: Unanchored 2271-2756, Verified 2271-2705. */
const PILL_UN = { x0: 2271, x1: 2757, y0: 460, y1: 508 };
const PILL_VER = { x0: 2271, x1: 2706, y0: 460, y1: 508 };

const KEYS: Cam3Key[] = [
  // the whole page for the scan
  { at: T.r1Out, dur: 22, to: { x: card.x + card.w / 2 + 30, y: card.y + card.h / 2 - 10, zoom: 0.93 }, ease: EASE.expoInOut },
  // track right with the flying tokens, turned while it travels (M2)
  { at: T.liftA + 2, dur: 30, to: { x: 1180, y: 520, zoom: 0.88, yaw: -6, pitch: 1.5 }, ease: EASE.expoInOut },
  // land square on the panel
  { at: T.panel - 4, dur: 30, to: { x: panelCx - 30, y: L.panel.y + L.panel.h / 2 - 6, zoom: 1, yaw: 0, pitch: 0 }, ease: EASE.expoOut },
  // behind R2: closer on the field, the rows and the save button
  { at: T.r2 + 14, dur: 30, to: { x: panelCx + 10, y: (L.field.y + L.save.y + L.save.h) / 2, zoom: 1.12 } },
  // behind R3: up to the panel's top, where the notice appears
  { at: T.r3 + 8, dur: 20, to: { x: panelCx - 60, y: L.notice.y + 250, zoom: 1.04 } },
];

/** The close framing on the byline (P1's own start), re-aimed so the Verified item sits where R4's real pill lands. */
function closeOnVerified(): Cam3Key {
  const at = T.verifiedLift - 1;
  const dur = T.land - at + 1;
  const [px, py] = r1PillCenterScreen(PILL_VER);
  const z = P1_BASE.zoom;
  const vcx = verifiedBadge.x + verifiedBadge.w / 2;
  const vcy = verifiedBadge.y + verifiedBadge.h / 2;
  return { at, dur, to: { x: vcx - (px - 960) / z, y: vcy - (py - 540) / z, zoom: z }, ease: EASE.expoInOut };
}

const CAM_OPTS = { base: P1_BASE, float: 0, creep: 1.5, seed: "p1" } as const;

// R1 is placed from the camera at its first frame: its real byline pill lands exactly on the twin's byline item.
const camAtR1 = cam3At(T.r1, KEYS, CAM_OPTS);
const twinBadgeR1 = toScreen(camAtR1, unanchoredBadge);
const R1_POS = {
  x: Math.round(twinBadgeR1.x + twinBadgeR1.w / 2 - ((PILL_UN.x0 + PILL_UN.x1) / 2 - R1_CROP[0]) * R1_SCALE - 14),
  y: Math.round(twinBadgeR1.y + twinBadgeR1.h / 2 - ((PILL_UN.y0 + PILL_UN.y1) / 2 - R1_CROP[1]) * R1_SCALE - 14),
};
/** A real pill's rect on screen inside the R1/R4 proof (same place for both, the rhyme). */
const pillRect = (p: typeof PILL_UN): Rect => ({
  x: R1_POS.x + 14 + (p.x0 - R1_CROP[0]) * R1_SCALE,
  y: R1_POS.y + 14 + (p.y0 - R1_CROP[1]) * R1_SCALE,
  w: (p.x1 - p.x0) * R1_SCALE,
  h: (p.y1 - p.y0) * R1_SCALE,
});
function r1PillCenterScreen(p: typeof PILL_UN): [number, number] {
  const r = pillRect(p);
  return [r.x + r.w / 2, r.y + r.h / 2];
}

const ALL_KEYS: Cam3Key[] = [...KEYS, closeOnVerified()];
const camAt = (f: number) => cam3At(f, ALL_KEYS, CAM_OPTS);

// R2 sits centred on the twin's card where the camera holds it at the morph.
const R2_CROP: [number, number, number, number] = [1170, 656, 1500, 400];
const R2_SCALE = 0.8;
const cardR2 = toScreen(camAt(T.r2), L.card);
const R2_POS = {
  x: Math.round(Math.max(60, Math.min(1920 - 60 - (R2_CROP[2] * R2_SCALE + 28), cardR2.x + cardR2.w / 2 - (R2_CROP[2] * R2_SCALE) / 2 - 14))),
  y: Math.round(cardR2.y + cardR2.h / 2 - (R2_CROP[3] * R2_SCALE) / 2 - 14),
};
const R2_IMAGE: Rect = { x: R2_POS.x + 14, y: R2_POS.y + 14, w: R2_CROP[2] * R2_SCALE, h: R2_CROP[3] * R2_SCALE };

const R3_CROP: [number, number, number, number] = [1120, 240, 1600, 520];
const R3_SCALE = 0.7;
const R3_POS = { x: Math.round((1920 - (R3_CROP[2] * R3_SCALE + 28)) / 2), y: Math.round((1080 - (R3_CROP[3] * R3_SCALE + 28)) / 2) + 10 };
/** The real notice box in p1-saved (capture px 1168-2671, 512-751, sampled), on screen inside R3. */
const R3_NOTICE: Rect = { x: R3_POS.x + 14 + (1168 - R3_CROP[0]) * R3_SCALE, y: R3_POS.y + 14 + (512 - R3_CROP[1]) * R3_SCALE, w: 1504 * R3_SCALE, h: 240 * R3_SCALE };

const HOVER_GREY = "#F1F1F2";
const TAG = "Recorded in Confluence";

const R1Node: React.FC = () => (
  <ProofFrame
    capture="p1-unanchored-tooltip"
    crop={R1_CROP}
    scale={R1_SCALE}
    x={R1_POS.x}
    y={R1_POS.y}
    at={T.r1}
    dur={T.r1Out - T.r1}
    enter="none"
    exit="none"
    tag={TAG}
    note="Real capture, development install"
    masks={[{ box: [2578, 465, 176, 37], fill: HOVER_GREY, why: "the logged suffix cover, in the hover pill's grey" }]}
  />
);

const R2Node: React.FC = () => (
  <ProofFrame capture="p1-suggestions" crop={R2_CROP} scale={R2_SCALE} x={R2_POS.x} y={R2_POS.y} at={T.r2} dur={T.r2Out - T.r2} enter="none" exit="none" tag={TAG} />
);

const R3Node: React.FC = () => (
  <ProofFrame capture="p1-saved" crop={R3_CROP} scale={R3_SCALE} x={R3_POS.x} y={R3_POS.y} at={T.r3} dur={T.r3Out - T.r3} enter="none" exit="none" tag={TAG} />
);

const R4Node: React.FC = () => (
  <ProofFrame
    capture="p1-verified-tooltip"
    crop={R1_CROP}
    scale={R1_SCALE}
    x={R1_POS.x}
    y={R1_POS.y}
    at={T.r4}
    dur={T.r4Out - T.r4}
    enter="none"
    exit="none"
    tag={TAG}
    masks={[{ box: [2526, 465, 176, 37], fill: HOVER_GREY, why: "the logged suffix cover, in the hover pill's grey" }]}
  />
);

// ---- cursors (in the world; counter-scaled so they keep their screen size) ----
const check2C: [number, number] = [L.check2.x + L.check2.w / 2, L.check2.y + L.check2.h / 2];
const saveC: [number, number] = [L.save.x + L.save.w * 0.42, L.save.y + L.save.h / 2];
const fieldC: [number, number] = [L.field.x + 300, L.field.y + L.field.h / 2];

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
  return <Cursor points={points} scale={1.45 / cam.zoom} showAt={show} hideAt={hide} theme="day" />;
};

/** The page goes soft and drained behind the panel (R2 section 10, rack focus), and comes back for "Verified". */
const RackPage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const r = tween(frame, T.rack, T.rack + 12, 0, 1, EASE.expoOut) * (1 - tween(frame, T.verifiedLift, T.verifiedLift + 10, 0, 1, EASE.expoOut));
  if (r < 0.01) return <>{children}</>;
  return <div style={{ position: "absolute", inset: 0, filter: `blur(${(6 * r).toFixed(2)}px) grayscale(${(0.7 * r).toFixed(2)})`, opacity: 1 - 0.25 * r }}>{children}</div>;
};

/** The whole twin world under its camera. */
const TwinWorld: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Camera3D keys={ALL_KEYS} {...CAM_OPTS}>
      <RackPage>
        <PageTwin {...pageAt(frame)} />
      </RackPage>
      <SuggestionsTwin
        x={PANEL.x}
        y={PANEL.y}
        appear={T.panel}
        rows={[T.dockB, T.dockA]}
        typed={{ at: T.type, dur: 11 }}
        check2={T.check2}
        savePress={T.save}
        saved={T.saved}
        verifiedLift={T.verifiedLift}
        leave={T.panelOut}
      />
      <FlyToken text="scripts/rollback.sh" home={rollbackHome} to={L.chip2} font={L.chipFont} liftAt={T.liftA} flyAt={T.flyA} land={T.dockA} arc={120} />
      <FlyToken text="PAY-6" home={payHome} to={L.chip1} font={L.chipFont} liftAt={T.liftB} flyAt={T.flyB} land={T.dockB} arc={70} />
      <FlyWord text="Verified" from={L.verifiedWord} to={bylineWordRect} fromFont={L.noticeFont} toFont={BYLINE.size * k} weight={600} toWeight={500} at={T.verifiedLift} land={T.land} hold={6} arc={80} />
      <WorldCursor points={CURSOR_V11} show={-FRESH_LEAD + 2} hide={T.unhover + 6} />
      <WorldCursor points={CURSOR_V12} show={T.field - 12} hide={T.save + 4} />
    </Camera3D>
  );
};

/** The world dimmed behind a proof (R3 section 3: the twin stays behind at 40%). */
const Dimmed: React.FC<{ to?: number; children: React.ReactNode }> = ({ to = 0.4, children }) => <AbsoluteFill style={{ opacity: to }}>{children}</AbsoluteFill>;

const screenOf = (f: number, r: Rect) => toScreen(camAt(f), r);


const P1: React.FC = () => {
  const frame = useCurrentFrame();
  const world = <TwinWorld />;
  let picture: React.ReactNode = world;

  if (frame >= T.r1 && frame < T.r1Out) {
    picture = (
      <MorphToReal at={T.r1} fromRect={screenOf(T.r1, unanchoredBadge)} toRect={pillRect(PILL_UN)} clip="inner" twin={world} proof={<R1Node />} />
    );
  } else if (frame >= T.r1Out && frame < T.r1Out + 8) {
    picture = (
      <>
        <Dimmed to={0.4 * (1 - tween(frame, T.r1Out, T.r1Out + 7))}>{world}</Dimmed>
        <RebuildFromReal at={T.r1Out} fromRect={pillRect(PILL_UN)} toRect={screenOf(T.r1Out, unanchoredBadge)} twin={world} proof={<R1Node />} />
      </>
    );
  } else if (frame >= T.r2 && frame < T.r2Out) {
    picture = <MorphToReal at={T.r2} fromRect={screenOf(T.r2, L.card)} toRect={R2_IMAGE} clip="inner" twin={world} proof={<R2Node />} />;
  } else if (frame >= T.r2Out && frame < T.r2Out + 8) {
    picture = (
      <>
        <Dimmed to={0.4 * (1 - tween(frame, T.r2Out, T.r2Out + 7))}>{world}</Dimmed>
        <RebuildFromReal at={T.r2Out} fromRect={R2_IMAGE} toRect={screenOf(T.r2Out, L.card)} twin={world} proof={<R2Node />} />
      </>
    );
  } else if (frame >= T.r3 && frame < T.r3Out) {
    const behind = (
      <>
        <Dimmed>{world}</Dimmed>
        <R3Node />
      </>
    );
    picture = frame < T.r3 + 8 ? <PushCut at={T.r3} from={world} to={behind} /> : behind;
  } else if (frame >= T.r3Out && frame < T.r3Out + 8) {
    // T4: the real notice hands back to the twin's notice (the same object continues)
    picture = (
      <>
        <Dimmed to={0.4 * (1 - tween(frame, T.r3Out, T.r3Out + 7))}>{world}</Dimmed>
        <RebuildFromReal at={T.r3Out} fromRect={R3_NOTICE} toRect={screenOf(T.r3Out, L.notice)} twin={world} proof={<R3Node />} />
      </>
    );
  } else if (frame >= T.r4 && frame < T.r4Out) {
    picture = (
      <MorphToReal at={T.r4} fromRect={screenOf(T.r4, verifiedBadge)} toRect={pillRect(PILL_VER)} clip="inner" twin={world} proof={<R4Node />} />
    );
  } else if (frame >= T.r4Out && frame < T.r4Out + 8) {
    picture = (
      <>
        <Dimmed to={0.4 * (1 - tween(frame, T.r4Out, T.r4Out + 7))}>{world}</Dimmed>
        <RebuildFromReal at={T.r4Out} fromRect={pillRect(PILL_VER)} toRect={screenOf(T.r4Out, verifiedBadge)} twin={world} proof={<R4Node />} />
      </>
    );
  }

  return (
    <AbsoluteFill>
      <Stage world="day" motif="grid" light={["46%", "36%"]}>
        {picture}
      </Stage>
      {/* sound: effects sit well under the voice (V4.md section 3) */}
      <Sfx id="tick-soft" at={T.r1 + 4} gainDb={-4} />
      <Sfx id="pop" at={T.liftA + 1} gainDb={-6} />
      <Sfx id="pop" at={T.liftB + 1} gainDb={-6} />
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
