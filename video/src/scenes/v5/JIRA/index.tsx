import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { Cursor } from "../../../components/Cursor";
import { JIRA_UI, JiraEpicTwin, jiraRect } from "../../../components/P5/JiraEpicTwin";
import { TrackInJiraTwin, trackRect } from "../../../components/P5/TrackInJiraTwin";
import { EASE, tween } from "../../../lib/time";
import { withLead } from "../../../transitions";
import {
  Camera3D,
  DAY,
  InkLabel,
  MorphToReal,
  ProofFrame,
  proofRect,
  PushSwap,
  RebuildFromReal,
  SignalLine,
  SlipReveal,
  Stage,
  type Cam3Key,
  type CameraOptions,
  type Rect,
} from "../../../v4/kit";
import { PageTwin, pageRects, TOOLTIPS, type PageTwinProps } from "../../../v4/twins";
import { capRect, placeOn, screenAt, type Box } from "../FIX/geom";
import { Clock307 } from "../FIX/parts";
import { T as FIX_T } from "../FIX/timing";
import { PayoffShot } from "../PROBLEM/Payoff";
import { DASH, dashRects, SpaceDash } from "./parts";
import { T } from "./timing";

/**
 * JIRA · Jira work counts too (S19 and S20; video/V5.md sections 5 and 8). Round 3: FIX's 3 a.m. payoff holds over the
 * seam and under S19's first word; a slip leaves Night (the bands clear on "Jira"). Then one still world for S19 and the
 * task (each real proof changed in place on its element, the kit's MorphToReal and RebuildFromReal on that element's
 * layer only), one push on the beat to the dashboard, which holds to endHit. Amber only on crafted twins, one per shot.
 *
 *   0 .. slip     the payoff (Night, 03:07) stays: the same frames FIX ended on, its chime ringing on (the L-cut)
 *   slip          the slip reveal (kit T1 as a reveal): the payoff's bands clear and the Jira chain is open on "Jira"
 *   S19           PAY-18 big in the middle; a person's cursor comes to its status, To Do turns Done on "close an
 *                 epic"; PAY-18 makes room as ADR-015 lifts in on "the design page", their link drawn as it lands (the
 *                 link is there before anything is flagged); on "linked" the change runs along it; the page's table
 *                 band slips amber on "gets" and hands the amber to its byline on "flagged", the tooltip "PAY-18 moved
 *                 to Done on Nov 13. Review." opens; the real byline and tooltip in place (p5-adr-tooltip)
 *   S20           "Turn a flag into a Jira task": the page's Track in Jira lifts out (the page racks back, as under the
 *                 real panel), a person's click on Create Jira task on "into", "Jira task created" on "a Jira task",
 *                 then the real notice in place (p5-track-created: "Jira task created / PAY-24 tracks this change.");
 *                 the push to the dashboard ("Confluence space dashboard · sample data from the demo space"): the KPIs
 *                 count up on "see", the drift's amber on the states on "every flagged page", the real rows in place
 *                 (p5-dashboard-2), then the dashboard holds to endHit (the kit's slip reveal into CLOSE)
 */

// =====================================================================================================================
// The payoff, held over the seam
// =====================================================================================================================

/** FIX's payoff on FIX's own frames (a Sequence shifted by FIX's length), so it continues without a seam. */
const PayoffHold: React.FC = () => (
  <Sequence from={-FIX_T.end} layout="none">
    <AbsoluteFill>
      <PayoffShot at={FIX_T.payoff} markAt={FIX_T.payoffMark} sourceAt={FIX_T.payoffSource} sound={false} />
      <Clock307 at={FIX_T.clock} x={66} y={30} />
    </AbsoluteFill>
  </Sequence>
);

// =====================================================================================================================
// The chain: PAY-18, ADR-015, the link, the task
// =====================================================================================================================

const C_FRAME = { x: 960, y: 540, zoom: 1 };
const C_OPTS: CameraOptions = { base: C_FRAME, seed: "jira-chain", creep: 0.5 };
const C_KEYS: Cam3Key[] = [{ at: 0, dur: 0, to: C_FRAME }];
const scr = (r: Rect, f: number) => screenAt(r, f, C_KEYS, C_OPTS);

const JIRA_K = 1.35;
const JIRA_W = JIRA_UI.width * JIRA_K;
const JIRA_Y = 360;
const JIRA_X = 110;
/** PAY-18 big and alone in the middle, then (as ADR-015 lifts in) settling on the left of the chain at 1.35. */
const JIRA_K_MID = 1.9;
const JIRA_MID = { x: Math.round((1920 - JIRA_UI.width * JIRA_K_MID) / 2), y: Math.round(540 - (JIRA_UI.height * JIRA_K_MID) / 2) };
const jiraAt = (f: number) => {
  const m = tween(f, T.adrIn - 4, T.adrIn + 12, 0, 1, EASE.expoInOut);
  return { x: JIRA_MID.x + (JIRA_X - JIRA_MID.x) * m, y: JIRA_MID.y + (JIRA_Y - JIRA_MID.y) * m, k: JIRA_K_MID + (JIRA_K - JIRA_K_MID) * m };
};

const ADR: PageTwinProps = {
  world: "day",
  doc: "adr015",
  k: 1.25,
  x: 1040,
  y: 130,
  // "gets flagged": the table band (the section that names PAY-18) slips amber and hands the amber to the byline item
  // with its swap; the lit item is the shot's one amber
  byline: { kind: "dds", state: "possibly_stale", from: "verified", at: T.bylineAt },
  slip: { at: T.slipFlag, handoff: T.bylineAt },
  tooltip: { text: TOOLTIPS.adrFlagged, at: T.tipAt },
};
const RADR = pageRects(ADR);
const PAY18_TOKEN = RADR.tokens["PAY-18"] ?? { x: RADR.card.x + 140, y: RADR.bands.middle.y + 120, w: 60, h: 26 };
const JIRA_NODE: [number, number] = [JIRA_X + JIRA_W, JIRA_Y + JIRA_UI.node.y * JIRA_K];
const ADR_NODE: [number, number] = [RADR.card.x - 2, PAY18_TOKEN.y + PAY18_TOKEN.h / 2];
const LINK_D = `M ${JIRA_NODE[0] + 2} ${JIRA_NODE[1]} C ${JIRA_NODE[0] + 70} ${JIRA_NODE[1]}, ${ADR_NODE[0] - 70} ${ADR_NODE[1]}, ${ADR_NODE[0]} ${ADR_NODE[1]}`;

const TRACK_K = 1.25;
const TRACK = { x: 800, y: 300 };
const TRACK_BUTTON = trackRect("button", TRACK.x, TRACK.y, TRACK_K);
const TRACK_NOTICE = trackRect("notice", TRACK.x, TRACK.y, TRACK_K);

/** The page racks back under its review panel's Track in Jira (as under the real modal). */
const rackStyle = (f: number): React.CSSProperties => {
  const r = tween(f, T.trackIn, T.trackIn + 14, 0, 1, EASE.cubicInOut);
  return r <= 0.001 ? {} : { opacity: 1 - 0.4 * r, filter: `blur(${(2.4 * r).toFixed(2)}px) grayscale(${(0.9 * r).toFixed(3)})` };
};

/** ADR-015, lifted in on "the design page". */
const AdrLayer: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.adrIn) return null;
  const up = tween(frame, T.adrIn, T.adrLand, 0, 1, EASE.expoOut);
  return (
    <Camera3D keys={C_KEYS} {...C_OPTS}>
      <div style={{ position: "absolute", inset: 0, ...rackStyle(frame) }}>
        <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, (frame - T.adrIn + 1) / 3), transform: up < 1 ? `translateY(${((1 - up) * 36).toFixed(2)}px)` : undefined }}>
          <PageTwin {...ADR} />
        </div>
      </div>
    </Camera3D>
  );
};

/** PAY-18 and the link (and the cursor on the status). */
const EpicLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const done = tween(frame, T.doneClick + 1, T.doneClick + 9, 0, 1, EASE.expoOut);
  const J = jiraAt(frame);
  // the cursor aims at the status as PAY-18 shows it while alone (the click comes well before it moves)
  const status = jiraRect("status", JIRA_MID.x, JIRA_MID.y, JIRA_K_MID);
  return (
    <Camera3D keys={C_KEYS} {...C_OPTS}>
      <div style={{ position: "absolute", inset: 0, ...rackStyle(frame) }}>
        {/* the link is drawn as the page lands (before any flag), then the change runs along it on "linked" */}
        <SignalLine d={LINK_D} at={T.linkAt} dur={12} pulse={false} dashed />
        <SignalLine d={LINK_D} at={T.pulse} dur={T.slipFlag - T.pulse} pulse trail />
        <div style={{ position: "absolute", left: J.x, top: J.y }}>
          <JiraEpicTwin k={J.k} done={done} elev={3} />
        </div>
      </div>
      {frame >= T.cursorIn && frame < T.adrIn ? (
        <Cursor
          points={[
            { frame: T.cursorIn, x: status.x + status.w / 2 + 170, y: status.y + status.h / 2 + 120 },
            { frame: T.doneClick, x: status.x + status.w / 2, y: status.y + status.h / 2, click: true, cursor: "pointer", travel: 14 },
          ]}
          showAt={T.cursorIn}
          hideAt={T.doneClick + 12}
        />
      ) : null}
    </Camera3D>
  );
};

/** The page's Track in Jira, lifted out on "Turn a flag", with a person's click on Create Jira task. */
const TrackLayer: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.trackIn) return null;
  const up = tween(frame, T.trackIn, T.trackIn + 14, 0, 1, EASE.expoOut);
  const press = tween(frame, T.createClick, T.createClick + 2, 0, 1, EASE.linear) * (1 - tween(frame, T.createClick + 3, T.createClick + 6, 0, 1, EASE.linear));
  const busy = tween(frame, T.createClick + 3, T.createClick + 6, 0, 1, EASE.linear) * (1 - tween(frame, T.created - 2, T.created, 0, 1, EASE.linear));
  const created = tween(frame, T.created, T.created + 8, 0, 1, EASE.expoOut);
  return (
    <Camera3D keys={C_KEYS} {...C_OPTS}>
      <div
        style={{
          position: "absolute",
          left: TRACK.x,
          top: TRACK.y,
          opacity: Math.min(1, (frame - T.trackIn + 1) / 3),
          transform: `translateY(${((1 - up) * 30).toFixed(2)}px)`,
          borderRadius: 22 * TRACK_K,
        }}
      >
        <TrackInJiraTwin k={TRACK_K} press={press} busy={busy} created={created} badgeGlow={1} />
      </div>
      {frame < T.created + 10 ? (
        <Cursor
          points={[
            { frame: T.trackIn + 8, x: TRACK_BUTTON.x + TRACK_BUTTON.w / 2 + 170, y: TRACK_BUTTON.y + TRACK_BUTTON.h / 2 + 120 },
            { frame: T.createClick, x: TRACK_BUTTON.x + TRACK_BUTTON.w / 2, y: TRACK_BUTTON.y + TRACK_BUTTON.h / 2, click: true, cursor: "pointer", travel: 12 },
          ]}
          showAt={T.trackIn + 8}
          hideAt={T.created + 4}
        />
      ) : null}
    </Camera3D>
  );
};

// The real byline and tooltip of ADR-015 (p5-adr-tooltip), in place on the crafted byline item, at 0.9. The logged
// "(Development)" cover sits on the hovered item, so it takes the item's own grey #F1F1F2 (logged in README.md).
const PA_CROP: Box = [2236, 446, 548, 172];
const PA_PILL: Box = [2268, 462, 500, 44];
const PA = placeOn(PA_CROP, 0.9, PA_PILL, scr(RADR.badge, T.proofA), T.proofA);
const PA_MASKS = [{ box: [2589, 465, 176, 37] as Box, fill: "#F1F1F2", why: "Development install suffix (logged in captures.json), re-covered in the hovered item's grey" }];
const ProofA = (
  <ProofFrame capture="p5-adr-tooltip" crop={PA.crop} scale={PA.scale} x={PA.x} y={PA.y} at={T.proofA} dur={T.proofAEnd + 8 - T.proofA} creep={PA.creep} enter="none" exit="none" masks={PA_MASKS} tag="Recorded in Confluence" />
);

// The real notice (p5-track-created: "Jira task created" and "PAY-24 tracks this change. When the page is up to date,
// open it and click Mark verified."), in place on the crafted notice, at 0.8. The crop's right edge crosses the notice's
// empty green fill (the text ends at x 2437), so its edge check is off.
const PT_CROP: Box = [1150, 1612, 1310, 188];
const PT_BOX: Box = [1169, 1627, 1291, 157];
const PT = placeOn(PT_CROP, 0.8, PT_BOX, scr(TRACK_NOTICE, T.proofT), T.proofT);
const ProofT = (
  <ProofFrame
    capture="p5-track-created"
    crop={PT.crop}
    scale={PT.scale}
    x={PT.x}
    y={PT.y}
    at={T.proofT}
    dur={T.push + T.pushDur + 4 - T.proofT}
    creep={PT.creep}
    enter="none"
    exit="none"
    cropCheck={false}
    tag="Recorded in Confluence"
  />
);

const Chain: React.FC = () => {
  const frame = useCurrentFrame();
  // ADR-015's layer: the real byline and tooltip in place on it (the twin at rest is the page alone)
  let adr: React.ReactNode = <AdrLayer />;
  if (frame >= T.proofA && frame < T.proofAEnd)
    adr = <MorphToReal at={T.proofA} fromRect={scr(RADR.badge, T.proofA)} toRect={capRect(PA, PA_PILL, T.proofA)} frameRect={proofRect(PA).outer} twin={<AdrLayer />} proof={ProofA} out={T.proofAEnd + 40} />;
  else if (frame >= T.proofAEnd && frame < T.proofAEnd + 14)
    adr = <RebuildFromReal at={T.proofAEnd} fromRect={capRect(PA, PA_PILL, T.proofAEnd)} toRect={scr(RADR.badge, T.proofAEnd)} match={false} grow={8} twin={<AdrLayer />} proof={ProofA} />;
  // the Track in Jira layer: the real notice in place on the crafted one
  let track: React.ReactNode = <TrackLayer />;
  if (frame >= T.proofT)
    track = <MorphToReal at={T.proofT} fromRect={scr(TRACK_NOTICE, T.proofT)} toRect={capRect(PT, PT_BOX, T.proofT)} frameRect={proofRect(PT).outer} twin={<TrackLayer />} proof={ProofT} out={T.push + 60} />;
  return (
    <Stage world="day" motif="grid" light={["50%", "34%"]}>
      {adr}
      <EpicLayer />
      {track}
    </Stage>
  );
};

// =====================================================================================================================
// The dashboard
// =====================================================================================================================

const DASH_K = 1.25;
const DASH_POS = { x: Math.round(960 - (DASH.width * DASH_K) / 2), y: 262 };
const DR = dashRects(DASH_POS.x, DASH_POS.y, DASH_K);
const D_FRAME = { x: 960, y: 560, zoom: 0.98 };
const D_OPTS: CameraOptions = { base: D_FRAME, seed: "jira-dash", creep: 0.8 };
const D_KEYS: Cam3Key[] = [{ at: 0, dur: 0, to: D_FRAME }];

const DashLabel: React.FC = () => (
  <Camera3D keys={D_KEYS} {...D_OPTS}>
    <div style={{ position: "absolute", left: DASH_POS.x, top: DASH_POS.y - 70 }}>
      <InkLabel icon="info" size={30}>
        Confluence space dashboard · sample data from the demo space
      </InkLabel>
    </div>
  </Camera3D>
);

const DashCard: React.FC = () => {
  const frame = useCurrentFrame();
  const kpiRoll = [0, 1, 2].map((i) => tween(frame, T.kpi + 3 * i, T.kpi + 3 * i + 20, 0, 1, EASE.expoOut));
  const band = tween(frame, T.amber, T.amber + 10, 0, 1, EASE.expoOut);
  const bandOut = tween(frame, T.proofDEnd - 6, T.proofDEnd, 0, 1, EASE.expoIn);
  return (
    <Camera3D keys={D_KEYS} {...D_OPTS}>
      <div style={{ position: "absolute", left: DASH_POS.x, top: DASH_POS.y }}>
        <SpaceDash k={DASH_K} kpiDrop={[1, 1, 1]} kpiRoll={kpiRoll} rows={6} band={band} bandOut={bandOut} />
      </div>
    </Camera3D>
  );
};

// The real rows (p5-dashboard-2: the page and state columns, rows 1 to 5), in place on the crafted rows, at 0.9.
const PD_CROP: Box = [705, 1036, 1250, 600];
const PD_ROWS: Box = [705, 1100, 1250, 530];
const PD = (() => {
  const on = screenAt(DR.rows, T.proofD, D_KEYS, D_OPTS);
  const p = placeOn(PD_CROP, 0.9, PD_ROWS, on, T.proofD);
  // centred on the crafted rows (the real table is narrower than the crafted card)
  return { ...p, x: Math.round(on.x + on.w / 2 - (PD_CROP[2] * 0.9 + 28) / 2) };
})();
const ProofD = (
  <ProofFrame
    capture="p5-dashboard-2"
    crop={PD.crop}
    scale={PD.scale}
    x={PD.x}
    y={PD.y}
    at={T.proofD}
    dur={T.proofDEnd + 8 - T.proofD}
    creep={PD.creep}
    enter="none"
    exit="none"
    tag="Recorded in Confluence · sample data from the demo space"
  />
);

const Dash: React.FC = () => {
  const frame = useCurrentFrame();
  let card: React.ReactNode = <DashCard />;
  if (frame >= T.proofD && frame < T.proofDEnd)
    card = <MorphToReal at={T.proofD} fromRect={screenAt(DR.rows, T.proofD, D_KEYS, D_OPTS)} toRect={capRect(PD, PD_ROWS, T.proofD)} frameRect={proofRect(PD).outer} twin={<DashCard />} proof={ProofD} out={T.proofDEnd + 40} />;
  else if (frame >= T.proofDEnd)
    card = <RebuildFromReal at={T.proofDEnd} fromRect={capRect(PD, PD_ROWS, T.proofDEnd)} toRect={screenAt(DR.rows, T.proofDEnd, D_KEYS, D_OPTS)} match={false} grow={8} twin={<DashCard />} proof={ProofD} />;
  return (
    <Stage world="day" motif="grid" light={["50%", "30%"]}>
      <DashLabel />
      {card}
    </Stage>
  );
};

// =====================================================================================================================
// The scene
// =====================================================================================================================

const JIRA: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.slip) shot = <PayoffHold />;
  else if (frame < T.open)
    shot = (
      <AbsoluteFill>
        <Chain />
        <SlipReveal f={frame - T.slip} open={8} traceColor={DAY.trace}>
          <PayoffHold />
        </SlipReveal>
      </AbsoluteFill>
    );
  else shot = <PushSwap at={T.push} dur={T.pushDur} dir="left" outgoing={<Chain />} incoming={<Dash />} />;
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      {shot}
      {/* the payoff's chime rings on from FIX (its tail, from where FIX's Sequence ended): the L-cut */}
      <Sfx id="chime-soft" at={FIX_T.payoffChime - FIX_T.end} gainDb={-10} />
      {/* the slip out of Night: its latch on the slip's first frame */}
      <Sfx id="slip-alt1" at={T.slip - 9} gainDb={-10} />
      {/* S19: a person's click on the status; the flag lands */}
      <Sfx id="click" at={T.doneClick} gainDb={-8} />
      <Sfx id="tick-soft" at={T.slipFlag} gainDb={-12} />
      {/* S20: a person's click on Create Jira task; the push to the dashboard */}
      <Sfx id="click" at={T.createClick} gainDb={-8} />
      <Sfx id="whoosh-short" at={T.push + 2} gainDb={-12} />
    </AbsoluteFill>
  );
};

// no lead tick at the seam: the picture does not cut there (the payoff holds over it); the slip has its own latch
export default withLead(JIRA, []);
