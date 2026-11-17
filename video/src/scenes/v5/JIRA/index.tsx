import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { Cursor } from "../../../components/Cursor";
import { JIRA_UI, JiraEpicTwin, jiraRect } from "../../../components/P5/JiraEpicTwin";
import { TRACK_UI, TrackInJiraTwin, trackRect } from "../../../components/P5/TrackInJiraTwin";
import { EASE, tween } from "../../../lib/time";
import {
  Camera3D,
  DAY,
  InkLabel,
  Lift,
  MorphToReal,
  ProofFrame,
  proofRect,
  PushSwap,
  RebuildFromReal,
  SignalLine,
  Stage,
  type Cam3Key,
  type CameraOptions,
  type Rect,
} from "../../../v4/kit";
import { PageTwin, pageRects, TOOLTIPS, type PageTwinProps } from "../../../v4/twins";
import { inProof, screenAt } from "../FIX/geom";
import { T as FIX_T } from "../FIX/timing";
import { dashRects, Pay24Card, PAY24, SpaceDash } from "./parts";
import { T } from "./timing";

/**
 * JIRA · Jira work counts too (S19 and S20; video/V5.md sections 5 and 8). Round 2: crafted-led, 12 s, with short real
 * proofs at reading size (the kit's MorphToReal and RebuildFromReal, tagged once each); amber only on crafted twins.
 *
 * FIX cuts to JIRA plainly on its last frame (the payoff); the payoff's chime rings on over the cut (the L-cut: its tail is
 * played here), under the kit's lead tick (LEADS.JIRA).
 *
 *   J       0 .. d     the Jira chain, one world: PAY-18 big, "Jira · Payments · Epic"; a person moves it To Do to
 *                      Done on "close"; the real Done as a short proof; the camera opens on "the design page" to
 *                      ADR-015; the anchor line draws from PAY-18 on "linked to it" and the change runs along it; the
 *                      page's table band slips amber and hands it to its byline item ("Possibly stale · Doc Drift")
 *                      on "gets flagged", with the real tooltip's words; the real byline and tooltip as a short proof
 *                      (S19). Then "Turn a flag into a Jira task": the page's Track in Jira lifts out, a person's click
 *                      on "into", "Jira task created" on "Jira task", and PAY-24 joins the chain big on "task"
 *   D       d .. end   locked push to the space's dashboard, labelled "Confluence space dashboard · sample data from
 *                      the demo space": the KPI cards drop and count up on "see", the rows set in on "every", the drift's
 *                      amber on their states on "flagged"; the real rows as a short proof; on "one dashboard" the
 *                      camera pulls back to the whole, the final pose the kit's slip reveal carries into CLOSE (S20)
 */

// =====================================================================================================================
// J · the Jira chain
// =====================================================================================================================

const JIRA_K = 1.35;
const JIRA_POS = { x: 80, y: 330 };
const JIRA_W = JIRA_UI.width * JIRA_K;
const JIRA_NODE: [number, number] = [JIRA_POS.x + JIRA_W, JIRA_POS.y + JIRA_UI.node.y * JIRA_K];
const JIRA_CARD: Rect = { x: JIRA_POS.x, y: JIRA_POS.y, w: JIRA_W, h: JIRA_UI.height * JIRA_K };

const ADR: PageTwinProps = {
  world: "day",
  doc: "adr015",
  k: 1.35,
  x: 1020,
  y: 150,
  // "gets flagged": the table band (the section that names PAY-18) slips amber and hands the amber to the byline item
  // with its swap; the lit item is the shot's one amber
  byline: { kind: "dds", state: "possibly_stale", from: "verified", at: T.bylineAt },
  slip: { at: T.slip, handoff: T.bylineAt },
  tooltip: { text: TOOLTIPS.adrFlagged, at: T.tipAt },
};
const RADR = pageRects(ADR);
const PAY18_TOKEN = RADR.tokens["PAY-18"] ?? { x: RADR.card.x + 140, y: RADR.bands.middle.y + 120, w: 60, h: 26 };
const ADR_NODE: [number, number] = [RADR.card.x - 2, PAY18_TOKEN.y + PAY18_TOKEN.h / 2];
const ANCHOR_D = `M ${JIRA_NODE[0] + 2} ${JIRA_NODE[1]} C ${JIRA_NODE[0] + 70} ${JIRA_NODE[1]}, ${ADR_NODE[0] - 70} ${ADR_NODE[1]}, ${ADR_NODE[0]} ${ADR_NODE[1]}`;

const TRACK_K = 1.25;
const TRACK_POS = { x: 965, y: 270 };
const TRACK_BUTTON = trackRect("button", TRACK_POS.x, TRACK_POS.y, TRACK_K);
const PAY24_K = 1.05;
const PAY24_POS = { x: 120, y: 700 };

const CHAIN = { x: 955, y: 520, zoom: 1 };
const J_OPTS: CameraOptions = { base: CHAIN, seed: "jira-chain" };
const J_KEYS: Cam3Key[] = [
  // PAY-18 big as the line starts
  { at: T.j, dur: 0, to: { x: JIRA_POS.x + JIRA_W / 2 + 10, y: JIRA_POS.y + 150, zoom: 1.4 } },
  // "the design page": open to the chain, which then holds (the flag and the task play inside it)
  { at: T.open, dur: 22, to: CHAIN, ease: EASE.expoInOut },
];

const WorldJ: React.FC = () => {
  const frame = useCurrentFrame();
  const done = tween(frame, T.doneClick + 1, T.doneClick + 9, 0, 1, EASE.expoOut);
  const press = tween(frame, T.createClick, T.createClick + 2, 0, 1, EASE.linear) * (1 - tween(frame, T.createClick + 3, T.createClick + 6, 0, 1, EASE.linear));
  const busy = tween(frame, T.createClick + 3, T.createClick + 6, 0, 1, EASE.linear) * (1 - tween(frame, T.created - 2, T.created, 0, 1, EASE.linear));
  const created = tween(frame, T.created, T.created + 8, 0, 1, EASE.expoOut);
  const statusC = jiraRect("status", JIRA_POS.x, JIRA_POS.y, JIRA_K);
  const adrIn = tween(frame, T.open + 2, T.open + 14, 0, 1, EASE.expoOut);
  return (
    <Stage world="day" motif="grid" light={["50%", "34%"]}>
      <Camera3D keys={J_KEYS} {...J_OPTS}>
        {/* ADR-015 arrives as the camera opens on "the design page" (no peek at the edge before) */}
        <div style={{ position: "absolute", inset: 0, opacity: adrIn, transform: adrIn < 1 ? `translateY(${((1 - adrIn) * 30).toFixed(2)}px)` : undefined }}>
          <PageTwin {...ADR} />
        </div>
        {/* the anchor: drawn on "linked to it", then the change runs along it to the page */}
        <SignalLine d={ANCHOR_D} at={T.link} dur={12} pulse={false} dashed />
        <SignalLine d={ANCHOR_D} at={T.link + 8} dur={T.slip - T.link - 6} pulse trail />
        <Lift at={T.j - 30} from={1} to={3} appear radius={20 * JIRA_K} contact={0.12} x={JIRA_POS.x} y={JIRA_POS.y}>
          <JiraEpicTwin k={JIRA_K} done={done} elev={0} />
        </Lift>
        {/* "Turn a flag into a Jira task": the page's Track in Jira lifts out over it */}
        <Lift at={T.trackIn} from={1} to={4} radius={22 * TRACK_K} x={TRACK_POS.x} y={TRACK_POS.y}>
          <TrackInJiraTwin k={TRACK_K} press={press} busy={busy} created={created} badgeGlow={1} />
        </Lift>
        {/* PAY-24 joins the chain, big, on "task" */}
        <Lift at={T.pay24} from={1} to={4} radius={24 * PAY24_K} x={PAY24_POS.x} y={PAY24_POS.y}>
          <Pay24Card k={PAY24_K} />
        </Lift>
        {frame < T.proofJ ? (
          <Cursor
            points={[
              { frame: T.doneClick - 16, x: statusC.x + statusC.w / 2 + 150, y: statusC.y + statusC.h / 2 + 110 },
              { frame: T.doneClick, x: statusC.x + statusC.w / 2, y: statusC.y + statusC.h / 2, click: true, cursor: "pointer", travel: 14 },
            ]}
            scale={2.4 / 1.28}
            showAt={T.doneClick - 16}
            hideAt={T.proofJ - 2}
          />
        ) : null}
        {frame >= T.trackIn + 6 && frame < T.created + 10 ? (
          <Cursor
            points={[
              { frame: T.trackIn + 6, x: TRACK_BUTTON.x + TRACK_BUTTON.w / 2 + 160, y: TRACK_BUTTON.y + TRACK_BUTTON.h / 2 + 120 },
              { frame: T.createClick, x: TRACK_BUTTON.x + TRACK_BUTTON.w / 2, y: TRACK_BUTTON.y + TRACK_BUTTON.h / 2, click: true, cursor: "pointer", travel: 12 },
            ]}
            showAt={T.trackIn + 6}
            hideAt={T.created + 6}
          />
        ) : null}
      </Camera3D>
    </Stage>
  );
};

// The real Done (p5-jira-done): the breadcrumb's key and the title row with the status, at 0.85 across the frame.
const PJ_CROP: [number, number, number, number] = [700, 140, 2220, 160];
const PJ_SCALE = 0.85;
const PJ_POS = { x: Math.round(960 - (2220 * PJ_SCALE + 28) / 2), y: 420 };
const PJ_IMG = proofRect({ crop: PJ_CROP, scale: PJ_SCALE, ...PJ_POS }).image;
/** The title row with the status (the element the card's title and status stand for). */
const PJ_ROW = inProof(PJ_IMG, PJ_CROP, PJ_SCALE, [714, 228, 2163, 66]);
const ProofJ = <ProofFrame capture="p5-jira-done" crop={PJ_CROP} scale={PJ_SCALE} {...PJ_POS} at={T.proofJ} dur={T.proofJEnd + 8 - T.proofJ} enter="none" exit="none" tag="Recorded in Jira" />;
const CARD_ROW: Rect = { x: JIRA_POS.x + 28 * JIRA_K, y: JIRA_POS.y + 64 * JIRA_K, w: (JIRA_UI.width - 56) * JIRA_K, h: 140 * JIRA_K };

// The real byline and tooltip of ADR-015 (p5-adr-tooltip), at 1:1. The logged "(Development)" cover sits on the hovered
// item, so it takes the item's own grey #F1F1F2 (the cover is logged in README.md).
const PA_CROP: [number, number, number, number] = [1440, 300, 1460, 312];
const PA_SCALE = 1;
const PA_POS = { x: Math.round(960 - (1460 + 28) / 2), y: 380 };
const PA_IMG = proofRect({ crop: PA_CROP, scale: PA_SCALE, ...PA_POS }).image;
const PA_ITEM = inProof(PA_IMG, PA_CROP, PA_SCALE, [2266, 462, 502, 44]);
const PA_MASKS = [{ box: [2589, 465, 176, 37] as [number, number, number, number], fill: "#F1F1F2", why: "Development install suffix (logged in captures.json), re-covered in the hovered item's grey" }];
const ProofA = (
  <ProofFrame capture="p5-adr-tooltip" crop={PA_CROP} scale={PA_SCALE} {...PA_POS} at={T.proofA} dur={T.proofAEnd + 8 - T.proofA} enter="none" exit="none" masks={PA_MASKS} tag="Recorded in Confluence" />
);

const ShotJ: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.proofJEnd) {
    const from = screenAt(CARD_ROW, T.proofJ, J_KEYS, J_OPTS);
    return <MorphToReal at={T.proofJ} fromRect={from} toRect={PJ_ROW} twin={<WorldJ />} proof={ProofJ} out={T.proofJEnd + 40} />;
  }
  if (frame < T.proofA) return <RebuildFromReal at={T.proofJEnd} fromRect={PJ_ROW} toRect={screenAt(CARD_ROW, T.proofJEnd, J_KEYS, J_OPTS)} twin={<WorldJ />} proof={ProofJ} />;
  if (frame < T.proofAEnd) {
    const from = screenAt(RADR.badge, T.proofA, J_KEYS, J_OPTS);
    return <MorphToReal at={T.proofA} fromRect={from} toRect={PA_ITEM} twin={<WorldJ />} proof={ProofA} out={T.proofAEnd + 40} />;
  }
  return <RebuildFromReal at={T.proofAEnd} fromRect={PA_ITEM} toRect={screenAt(RADR.badge, T.proofAEnd, J_KEYS, J_OPTS)} twin={<WorldJ />} proof={ProofA} />;
};

// =====================================================================================================================
// D · the space's dashboard
// =====================================================================================================================

const DASH_K = 1.25;
const DASH_POS = { x: Math.round(960 - (980 * DASH_K) / 2), y: 230 };
const DR = dashRects(DASH_POS.x, DASH_POS.y, DASH_K);
const D_WHOLE = { x: 960, y: 560, zoom: 0.98 };
const D_OPTS: CameraOptions = { base: D_WHOLE, seed: "jira-dash" };
const D_KEYS: Cam3Key[] = [
  // in close on the rows, then one slow pull back over the line to the whole dashboard on "one dashboard"
  { at: T.d, dur: 0, to: { x: 960, y: 600, zoom: 1.12 } },
  { at: T.d + 2, dur: T.pull + T.pullDur - T.d - 2, to: D_WHOLE, ease: EASE.cubicInOut },
];

const WorldD: React.FC = () => {
  const frame = useCurrentFrame();
  const kpiDrop = [0, 1, 2].map((i) => tween(frame, T.kpi + 3 * i, T.kpi + 3 * i + 12, 0, 1, EASE.linear));
  const kpiRoll = [0, 1, 2].map((i) => tween(frame, T.kpi + 2 + 3 * i, T.kpi + 22 + 3 * i, 0, 1, EASE.linear));
  const rows = tween(frame, T.rows, T.rows + 10, 0, 6, EASE.linear);
  const band = tween(frame, T.amber, T.amber + 10, 0, 1, EASE.expoOut);
  const bandOut = tween(frame, T.pull, T.pull + 8, 0, 1, EASE.expoIn);
  return (
    <Stage world="day" motif="grid" light={["50%", "30%"]}>
      <Camera3D keys={D_KEYS} {...D_OPTS}>
        <div style={{ position: "absolute", left: DASH_POS.x, top: DASH_POS.y - 64 }}>
          <InkLabel icon="info" size={30}>
            Confluence space dashboard · sample data from the demo space
          </InkLabel>
        </div>
        <div style={{ position: "absolute", left: DASH_POS.x, top: DASH_POS.y }}>
          <SpaceDash k={DASH_K} kpiDrop={kpiDrop} kpiRoll={kpiRoll} rows={rows} band={band} bandOut={bandOut} />
        </div>
      </Camera3D>
    </Stage>
  );
};

// The real rows (p5-dashboard-2: the page and state columns, rows 1 to 5), at 0.9.
const PD_CROP: [number, number, number, number] = [705, 1036, 1250, 600];
const PD_SCALE = 0.9;
const PD_POS = { x: Math.round(960 - (1250 * PD_SCALE + 28) / 2), y: 300 };
const PD_IMG = proofRect({ crop: PD_CROP, scale: PD_SCALE, ...PD_POS }).image;
const PD_ROWS = inProof(PD_IMG, PD_CROP, PD_SCALE, [705, 1100, 1250, 530]);
const ProofD = (
  <ProofFrame
    capture="p5-dashboard-2"
    crop={PD_CROP}
    scale={PD_SCALE}
    {...PD_POS}
    at={T.proofD}
    dur={T.proofDEnd + 8 - T.proofD}
    enter="none"
    exit="none"
    tag="Recorded in Confluence · sample data from the demo space"
  />
);

const ShotD: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.proofDEnd) return <MorphToReal at={T.proofD} fromRect={screenAt(DR.rows, T.proofD, D_KEYS, D_OPTS)} toRect={PD_ROWS} twin={<WorldD />} proof={ProofD} out={T.proofDEnd + 40} />;
  return <RebuildFromReal at={T.proofDEnd} fromRect={PD_ROWS} toRect={screenAt(DR.rows, T.proofDEnd, D_KEYS, D_OPTS)} twin={<WorldD />} proof={ProofD} />;
};

// =====================================================================================================================
// The scene
// =====================================================================================================================

const JIRA: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.d) shot = <ShotJ />;
  else shot = <PushSwap at={T.d} dur={T.dDur} dir="left" outgoing={<ShotJ />} incoming={<ShotD />} />;
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      {shot}
      {/* the payoff's chime, on from FIX (the same sound, from where FIX's Sequence ended): the L-cut */}
      <Sfx id="chime-soft" at={FIX_T.payoffChime - FIX_T.end} gainDb={-10} />
      {/* S19: a person's click on the status; the flag lands (the cut's lead is the kit's, LEADS.JIRA) */}
      <Sfx id="click" at={T.doneClick} gainDb={-8} />
      <Sfx id="tick" at={T.bylineAt} gainDb={-12} />
      {/* S20: a person's click on Create Jira task; PAY-24 lands; the push to the dashboard */}
      <Sfx id="click" at={T.createClick} gainDb={-8} />
      <Sfx id="pop" at={T.pay24 + 2} gainDb={-12} />
      <Sfx id="whoosh-short" at={T.d + 7} gainDb={-12} />
    </AbsoluteFill>
  );
};

export default JIRA;
