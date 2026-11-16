import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { Cursor, type CursorPoint } from "../../components/Cursor";
import { DASH, DASH_UI, DashboardTwin, dashRect } from "../../components/P5/DashboardTwin";
import { JIRA_UI, JiraEpicTwin, jiraRect } from "../../components/P5/JiraEpicTwin";
import { TRACK_UI, TrackInJiraTwin, trackRect } from "../../components/P5/TrackInJiraTwin";
import { WholeLine } from "../../components/P4/WholeLine";
import { EASE, tween } from "../../lib/time";
import { slipProgress } from "../../motion/slip";
import {
  Camera3D,
  DAY,
  InkLabel,
  KineticLine,
  Lift,
  lineCues,
  MorphToReal,
  Press,
  ProofFrame,
  proofRect,
  SignalLine,
  SlipPush,
  Stage,
  type Cam3Key,
  type CameraOptions,
} from "../../v4/kit";
import { PageTwin, pageRects, textWidth, type PageTwinProps } from "../../v4/twins";
import { P4FinalPose } from "../P4";
import { sc as sc4 } from "../P4/timing";
import { inProof, screenAt } from "../P4/geom";
import { sc, T } from "./timing";

/**
 * P5 · Scale (film 3937 to 4177, R3 V23). Day, grid. Opens on P4's last pose (R19, "Safe to cite.") pushed out by a
 * slip push (T5). Round 2 (QA R-2, R-10, R-13, R-14, metrics' amber gap): one statement per half of the line in the
 * empty side; the ADR's slipped band (the one amber) stays in shot through R20; R21 shows the four real KPI cards.
 *
 *   J · Jira and ADR-015 (0 .. dash)
 *   "Jira"     "Jira changes count too." in the empty lower left; the epic PAY-18 as a plain card that names Jira in
 *              words, joined by its anchor to ADR-015 (Verified)
 *   "changes"  To Do -> Done; the change runs along the anchor (the connector turns solid)
 *   "count"    the decisive push toward ADR-015 as its table band slips amber and hands the amber to its byline item,
 *              "Possibly stale · Doc Drift" (the shot's one amber, in shot to the end of the world)
 *   R20        R2's proof composition: the Jira strip across the top, the real ADR byline and tooltip on the left with
 *              its byline row at the height of the twin's lit item (claim and receipt rhyme); the Jira card steps back
 *   D · the dashboard (dash .. track)
 *   "space"    "Every space gets a drift dashboard." in the empty top left; the dashboard on the right ("Sample data
 *              from the demo space"); the KPI cards drop flat and count up from 0 to 18 of 24, 6, 0 (Under 3 hours is
 *              not a count) and stop; the six rows set in; ADR-015's row slips on "drift"
 *   R21        grows out of the KPI row: the four real KPI cards at 0.6, under the dashboard; the twin's KPI row steps
 *              back, its amber row stays
 *   T · Track in Jira (track .. end)
 *   click      Create Jira task; "Jira task created", "PAY-24 tracks this change. When the page is up to date, open it
 *              and click Mark verified." (the real form between the two clicks is shortened; R22 proves the result)
 *   R22        by MorphToReal from the created message; the twin rebuilds into the final pose, which the kit's slip cut
 *              carries into A4 (Night).
 */

const Iso: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ isolation: "isolate" }}>{children}</AbsoluteFill>;

/** The kit's resting twin under a proof (MorphToReal's defaults: 18%, 7 px blur, drained), for plain proofs. */
const restStyle = (k: number): React.CSSProperties | undefined => {
  if (k <= 0.001) return undefined;
  return { opacity: 1 - 0.82 * k, filter: `blur(${(7 * k).toFixed(2)}px) grayscale(${k.toFixed(3)})` };
};
const restAt = (frame: number, at: number, end: number) => tween(frame, at + 1, at + 7, 0, 1, EASE.expoOut) * (1 - tween(frame, end, end + 6, 0, 1, EASE.expoOut));

// =====================================================================================================================
// World J · PAY-18 and ADR-015
// =====================================================================================================================

const K_JIRA = 1.42;
const JIRA_POS = { x: 150, y: 330 };
const JIRA_W = JIRA_UI.width * K_JIRA;
const JIRA_NODE: [number, number] = [JIRA_POS.x + JIRA_W, JIRA_POS.y + JIRA_UI.node.y * K_JIRA];

const ADR: PageTwinProps = {
  world: "day",
  doc: "adr015",
  k: 1.25,
  x: 1040,
  y: 250,
  // the table band slips amber on "count" and hands the amber to the byline item with its swap (handoff = byline.at):
  // the lit item is the shot's one amber, and it stays in shot through R20, which rhymes with it from the left
  byline: { kind: "dds", state: "possibly_stale", from: "verified", at: T.count - 1 },
  slip: { at: T.slip, handoff: T.count - 1 },
};
const RADR = pageRects(ADR);
const PAY18 = RADR.tokens["PAY-18"] ?? { x: RADR.card.x + 160, y: RADR.bands.middle.y + 130, w: 64, h: 28 };
const ADR_NODE: [number, number] = [RADR.card.x - 2, PAY18.y + PAY18.h / 2];
const ANCHOR_D = `M ${JIRA_NODE[0] + 2} ${JIRA_NODE[1]} C ${JIRA_NODE[0] + 70} ${JIRA_NODE[1]}, ${ADR_NODE[0] - 70} ${ADR_NODE[1]}, ${ADR_NODE[0]} ${ADR_NODE[1]}`;

const J_OPTS: CameraOptions = { base: { x: 870, y: 540, zoom: 1.0 }, seed: "p5-jira" };
const J_KEYS: Cam3Key[] = [
  // the slip push lands (content still travelling left)
  { at: 0, dur: 20, to: { x: 1000, y: 540, zoom: 1.0 } },
  // the one decisive push of the line: toward ADR-015 on "count", as its band slips (its slipped band stays in frame)
  { at: T.count - 6, dur: 14, to: { x: 1012, y: 540, zoom: 1.05 } },
];

const JIRA_TITLE_AT_R20 = screenAt(jiraRect("title", JIRA_POS.x, JIRA_POS.y, K_JIRA), T.r20, J_KEYS, J_OPTS);

// R20: two proofs, one claim (R2's proof composition). The Jira strip (Done) across the top; the ADR's real byline and
// tooltip on the left, its byline row at the height of the twin's lit byline (the claim and its receipt rhyme), over the
// Jira card, which steps back. The Jira crop stops above the breadcrumb's row (152) and the buttons (from 300) (R-10).
const R20A_CROP: [number, number, number, number] = [700, 136, 2260, 161];
const R20A_SCALE = 0.6;
const R20A_POS = { x: 70, y: 80 };
/** R20a's title row with the Done button (capture px), and the twin card's title row it grows out of. */
const R20A_TITLE = inProof(proofRect({ crop: R20A_CROP, scale: R20A_SCALE, ...R20A_POS }).image, R20A_CROP, R20A_SCALE, [714, 228, 2156, 66]);
// ADR byline and tooltip: the two-line tooltip ends on capture row 603 and the table starts on 620, so h 312 shows the
// whole tooltip and nothing of the row below.
const R20B_CROP: [number, number, number, number] = [1440, 300, 1460, 312];
const R20B_SCALE = 0.6;
/** The real byline row (capture px): the item and its pill. */
const R20B_ROW_CAP: [number, number, number, number] = [1440, 462, 1460, 44];
const TWIN_BYLINE_AT_R20 = screenAt(RADR.byline, T.r20, J_KEYS, J_OPTS);
const R20B_POS = {
  x: 52,
  y: Math.round(TWIN_BYLINE_AT_R20.y + TWIN_BYLINE_AT_R20.h / 2 - 14 - (R20B_ROW_CAP[1] - R20B_CROP[1] + R20B_ROW_CAP[3] / 2) * R20B_SCALE),
};
/** The hovered pill's grey under the logged cover. */
const ADR_PILL_MASK = {
  box: [2589, 465, 176, 37] as [number, number, number, number],
  fill: "#F1F1F2",
  why: "Development install suffix (logged), on the hovered pill",
};

/**
 * V23's first statement (screen space: the push does not move it), set whole on the beat as the line starts, with a
 * push (QA K-7, P-1: it holds 71 f, to the slip push out).
 */
const J_TEXT = "Jira changes\ncount too.";
const StatementJ: React.FC = () => (
  <div style={{ position: "absolute", left: 76, top: 790 }}>
    <WholeLine text={J_TEXT} at={T.jiraAt} size={120} />
  </div>
);

const WorldJ: React.FC = () => {
  const frame = useCurrentFrame();
  const done = tween(frame, T.done, T.done + 8, 0, 1, EASE.expoOut);
  // R20a grows out of the Jira card, which goes (blur, then gone) under it with its connector; ADR-015 and its lit
  // byline stay as they are (QA K-1: the element the proof stands for leaves; R-10: no stray twin words beside it)
  const gone = tween(frame, T.r20 + 1, T.r20 + 7, 0, 1, EASE.expoOut);
  return (
    <Stage world="day" motif="grid" light={["62%", "34%"]}>
      <Camera3D keys={J_KEYS} {...J_OPTS}>
        <PageTwin {...ADR} />
        <div style={{ position: "absolute", inset: 0, opacity: gone > 0.001 ? 1 - gone : undefined, filter: gone > 0.001 ? `blur(${(8 * gone).toFixed(2)}px)` : undefined }}>
          {/* the anchor: watched (dashed Current), then the change runs along it and it turns solid */}
          <SignalLine d={ANCHOR_D} at={-40} dur={1} pulse={false} dashed />
          <SignalLine d={ANCHOR_D} at={T.changes} dur={T.slip + 4 - T.changes} pulse trail />
          <Lift at={-30} from={1} to={3} appear radius={20 * K_JIRA} contact={0.12} x={JIRA_POS.x} y={JIRA_POS.y}>
            <JiraEpicTwin k={K_JIRA} done={done} elev={0} />
          </Lift>
        </div>
      </Camera3D>
    </Stage>
  );
};

const ShotJ: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <MorphToReal
        at={T.r20}
        fromRect={JIRA_TITLE_AT_R20}
        toRect={R20A_TITLE}
        // QA P-6: the world steps back under R20 like under every other proof (the Jira card itself goes)
        twin={
          <Iso>
            <WorldJ />
          </Iso>
        }
        proof={
          <ProofFrame capture="p5-jira-done" crop={R20A_CROP} scale={R20A_SCALE} {...R20A_POS} at={T.r20} dur={T.r20End - T.r20} enter="none" tag="Recorded in Jira" />
        }
      />
      <StatementJ />
      {frame >= T.r20 + 3 ? (
        <>
          <ProofFrame
            capture="p5-adr-tooltip"
            crop={R20B_CROP}
            scale={R20B_SCALE}
            {...R20B_POS}
            at={T.r20 + 3}
            dur={T.r20End - T.r20 - 3}
            masks={[ADR_PILL_MASK]}
            tag="Recorded in Confluence"
          />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// World D · the dashboard
// =====================================================================================================================

const K_DASH = 1.15;
const DASH_POS = { x: Math.round(1920 - 82 - DASH_UI.width * K_DASH), y: 96 };
const D_OPTS: CameraOptions = { base: { x: 820, y: 540, zoom: 1.0 }, seed: "p5-dash" };
const D_KEYS: Cam3Key[] = [
  // the slip push lands
  { at: T.dash, dur: 22, to: { x: 960, y: 540, zoom: 1.0 } },
];

// R21: the four real KPI cards (columns 720 to 3759, rows 460 to 687), at 0.6 (QA R-2, R-13), under the dashboard.
const R21_CROP: [number, number, number, number] = [704, 448, 3072, 252];
const R21_SCALE = 0.6;
const R21_W = Math.round(3072 * R21_SCALE + 28);
const R21_POS = { x: Math.round(960 - R21_W / 2), y: 1080 - 30 - Math.round(252 * R21_SCALE + 28) };
const R21_KPI = inProof(proofRect({ crop: R21_CROP, scale: R21_SCALE, ...R21_POS }).image, R21_CROP, R21_SCALE, [720, 460, 3039, 227]);
const R21_TWIN = screenAt(dashRect("kpiRow", DASH_POS.x, DASH_POS.y, K_DASH), T.r21, D_KEYS, D_OPTS);

/**
 * V23's second statement, in the empty top left of the dashboard shot: "Every space" on its words, then "gets a drift
 * dashboard." whole on "gets" (QA P-1: the last word lands a beat and a half earlier), held to the push out (52 f).
 */
const D_TEXT = "Every space\ngets a drift\ndashboard.";
const D_CUES = (() => {
  const cues = lineCues(sc.line("V23"), D_TEXT);
  const g = cues[2]?.from ?? T.gets;
  return cues.map((c, i) => (i >= 3 ? { from: g + (i - 2) } : c));
})();
const StatementD: React.FC = () => (
  <div style={{ position: "absolute", left: 76, top: 120 }}>
    <KineticLine text={D_TEXT} at={T.space - 9} words={D_CUES} size={110} />
  </div>
);

const WorldD: React.FC = () => {
  const frame = useCurrentFrame();
  const kpiDrop = [0, 1, 2, 3].map((i) => tween(frame, T.kpi + 3 * i, T.kpi + 3 * i + 12, 0, 1, EASE.linear));
  // the counts run up from 0 to the real values and stop there (QA R-14)
  const kpiRoll = [0, 1, 2, 3].map((i) => tween(frame, T.kpi + 2 + 3 * i, T.kpi + 22 + 3 * i, 0, 1, EASE.linear));
  // the six rows set in quickly, so ADR-015's row is in before it slips on "drift"
  const rows = tween(frame, T.kpi + 4, T.kpi + 12, 0, 6, EASE.linear);
  const slip = slipProgress(frame, T.rowSlip);
  const kpiRest = restAt(frame, T.r21, T.r21End);
  return (
    <Stage world="day" motif="grid" light={["62%", "30%"]}>
      <Camera3D keys={D_KEYS} {...D_OPTS}>
        <div style={{ position: "absolute", left: DASH_POS.x, top: DASH_POS.y }}>
          <DashboardTwin k={K_DASH} kpiDrop={kpiDrop} kpiRoll={kpiRoll} rows={rows} slip={slip} label={false} kpiRest={kpiRest} />
        </div>
        {/* R3 risk 8: the numbers are the demo space's, always labelled (at a must-read size) */}
        <div style={{ position: "absolute", left: DASH_POS.x + DASH_UI.width * K_DASH - 4, top: DASH_POS.y - 56, transform: "translateX(-100%)" }}>
          <InkLabel icon="info" size={28}>
            {DASH.label}
          </InkLabel>
        </div>
      </Camera3D>
    </Stage>
  );
};

const ShotD: React.FC = () => (
  <AbsoluteFill>
    <MorphToReal
      at={T.r21}
      fromRect={R21_TWIN}
      toRect={R21_KPI}
      // only the twin's KPI row steps back (WorldD's kpiRest): its rows and the one amber row stay as they are
      twinRest={1}
      twinBlur={0}
      twinDrain={0}
      twin={
        <Iso>
          <WorldD />
        </Iso>
      }
      proof={
        <ProofFrame
          capture="p5-dashboard"
          crop={R21_CROP}
          scale={R21_SCALE}
          {...R21_POS}
          at={T.r21}
          dur={T.r21End - T.r21}
          enter="none"
          tag="Recorded in Confluence, sample data from the demo space"
        />
      }
    />
    <StatementD />
  </AbsoluteFill>
);

// =====================================================================================================================
// World T · Track in Jira
// =====================================================================================================================

const K_TRACK = 1.75;
const TRACK_POS = { x: Math.round(960 - (TRACK_UI.width * K_TRACK) / 2), y: 196 };
/** The created message's centre (stage px), where the tail's push lands. */
const NOTICE_C: [number, number] = (() => {
  const n = trackRect("notice", TRACK_POS.x, TRACK_POS.y, K_TRACK);
  return [n.x + n.w / 2, n.y + n.h / 2];
})();
const T_OPTS: CameraOptions = { base: { x: 1000, y: 540, zoom: 0.98 }, seed: "p5-track" };
const T_KEYS: Cam3Key[] = [
  { at: T.track, dur: 22, to: { x: 960, y: 540, zoom: 1.0 } },
  // P-4: one push onto "Jira task created" and "PAY-24 tracks this change." (the tail's focal element), then held
  // (1.22x, the card whole: its header and the one amber badge stay in, nothing is cut by the frame)
  { at: T.noticePush, dur: 12, to: { x: NOTICE_C[0], y: NOTICE_C[1] - 44, zoom: 1.22 } },
];
const BUTTON = (() => {
  const b = trackRect("button", TRACK_POS.x, TRACK_POS.y, K_TRACK);
  const w = (textWidth("Create Jira task", { size: 14, weight: 600 }) + 30) * K_TRACK;
  return { x: b.x, y: b.y + 18 * K_TRACK, w, h: 36 * K_TRACK };
})();
const BUTTON_ON_CLICK = screenAt(BUTTON, T.click, T_KEYS, T_OPTS);
const CLICK_PT: [number, number] = [BUTTON_ON_CLICK.x + BUTTON_ON_CLICK.w * 0.55, BUTTON_ON_CLICK.y + BUTTON_ON_CLICK.h * 0.55];

// R22: the created message, placed over the twin's own message (which steps back under it).
const R22_CROP: [number, number, number, number] = [1150, 1610, 1550, 190];
const R22_SCALE = 0.85;
const R22_MSG_CAP: [number, number, number, number] = [1168, 1626, 1504, 160];
const R22_TWIN = screenAt(trackRect("notice", TRACK_POS.x, TRACK_POS.y, K_TRACK), T.r22, T_KEYS, T_OPTS);
const R22_POS = {
  x: Math.round(R22_TWIN.x + R22_TWIN.w / 2 - 14 - (R22_MSG_CAP[0] - R22_CROP[0] + R22_MSG_CAP[2] / 2) * R22_SCALE),
  y: Math.round(R22_TWIN.y + R22_TWIN.h / 2 - 14 - (R22_MSG_CAP[1] - R22_CROP[1] + R22_MSG_CAP[3] / 2) * R22_SCALE),
};
const R22_MSG = inProof(proofRect({ crop: R22_CROP, scale: R22_SCALE, ...R22_POS }).image, R22_CROP, R22_SCALE, R22_MSG_CAP);

const WorldT: React.FC = () => {
  const frame = useCurrentFrame();
  const press = (() => {
    const t = frame - T.click;
    if (t < -4 || t > 10) return 0;
    return t < 0 ? (t + 4) / 4 : t <= 2 ? 1 : Math.max(0, 1 - (t - 2) / 8);
  })();
  const busy = tween(frame, T.click + 2, T.click + 4) * (1 - tween(frame, T.created - 1, T.created + 1));
  const created = tween(frame, T.created, T.created + 10, 0, 1, EASE.expoOut);
  const noticeRest = restAt(frame, T.r22, T.r22End);
  return (
    <Stage world="day" motif="grid" light={["50%", "30%"]}>
      <Camera3D keys={T_KEYS} {...T_OPTS}>
        <div style={{ position: "absolute", left: TRACK_POS.x, top: TRACK_POS.y }}>
          <TrackInJiraTwin k={K_TRACK} press={press} busy={busy} created={created} badgeGlow={1} noticeRest={noticeRest} />
        </div>
      </Camera3D>
    </Stage>
  );
};

const ShotT: React.FC = () => {
  const cursor: CursorPoint[] = [
    { frame: T.track + 8, x: CLICK_PT[0] + 320, y: CLICK_PT[1] + 220 },
    { frame: T.click, x: CLICK_PT[0], y: CLICK_PT[1], click: true, cursor: "pointer", travel: 12 },
  ];
  return (
    <MorphToReal
      at={T.r22}
      fromRect={R22_TWIN}
      toRect={R22_MSG}
      // only the twin's message steps back (noticeRest): the card around it, and its one amber badge, stay
      twinRest={1}
      twinBlur={0}
      twinDrain={0}
      twin={
        <AbsoluteFill>
          <Iso>
            <WorldT />
          </Iso>
          <Press at={T.click} x={CLICK_PT[0]} y={CLICK_PT[1]} />
          <Cursor points={cursor} showAt={T.track + 8} hideAt={T.click + 8} />
        </AbsoluteFill>
      }
      proof={
        <ProofFrame
          capture="p5-track-created"
          crop={R22_CROP}
          scale={R22_SCALE}
          {...R22_POS}
          at={T.r22}
          dur={T.r22End - T.r22}
          enter="none"
          tag="Recorded in Confluence"
        />
      }
    />
  );
};

// =====================================================================================================================
// The scene
// =====================================================================================================================

/**
 * P4's last pose for the slip push, on P4's own clock (P4 and P5 are one owner's continuous handover): P5's frame 0 is
 * P4's frame 659, and the pose keeps creeping while the bands push it out. (Freeze cannot be used: it clamps the frame
 * to the composition's length, so inside P5's own 240-frame composition it could never reach 659.)
 */
const P4Last: React.FC = () => (
  <Sequence from={-(sc4.durationInFrames - 1)} layout="none" name="P4 last pose">
    <P4FinalPose />
  </Sequence>
);

const P5: React.FC = () => {
  const frame = useCurrentFrame();
  let picture: React.ReactNode;
  if (frame < T.dash) picture = <SlipPush at={T.push} from={<P4Last />} to={<ShotJ />} />;
  else if (frame < T.track) picture = <SlipPush at={T.dash} from={<ShotJ />} to={<ShotD />} />;
  else picture = <SlipPush at={T.track} from={<ShotD />} to={<ShotT />} />;
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      {picture}
      <Sfx id="whoosh-short" at={T.push + 6} gainDb={-3} />
      <Sfx id="tick" at={T.done + 4} gainDb={-2} />
      {/* the ADR's flag: the brand's slip, its latch on "count" */}
      <Sfx id="slip" at={T.slip + 6} gainDb={-2} />
      <Sfx id="tick-soft" at={T.r20 + 4} />
      <Sfx id="whoosh-short" at={T.dash + 6} gainDb={-4} />
      {[0, 1, 2, 3].map((i) => (
        <Sfx key={i} id="tick-soft" at={T.kpi + 12 + 3 * i} gainDb={-4} />
      ))}
      <Sfx id="tick-soft" at={T.r21 + 4} />
      <Sfx id="whoosh-short" at={T.track + 6} gainDb={-4} />
      <Sfx id="click" at={T.click} />
      <Sfx id="pop" at={T.created + 2} gainDb={-3} />
      <Sfx id="tick-soft" at={T.r22 + 4} />
    </AbsoluteFill>
  );
};

export default P5;
