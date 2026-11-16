import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { Cursor, type CursorPoint } from "../../components/Cursor";
import { DASH, DASH_UI, DashboardTwin, dashRect } from "../../components/P5/DashboardTwin";
import { JIRA_UI, JiraEpicTwin } from "../../components/P5/JiraEpicTwin";
import { TRACK_UI, TrackInJiraTwin, trackRect } from "../../components/P5/TrackInJiraTwin";
import { EASE, tween } from "../../lib/time";
import { slipProgress } from "../../motion/slip";
import {
  Camera3D,
  DAY,
  InkLabel,
  Lift,
  MorphToReal,
  Press,
  ProofFrame,
  proofRect,
  SignalLine,
  SlipPush,
  Stage,
  type Cam3Key,
  type CameraOptions,
  type Rect,
} from "../../v4/kit";
import { PageTwin, pageRects, textWidth, type PageTwinProps } from "../../v4/twins";
import { P4FinalPose } from "../P4";
import { sc as sc4 } from "../P4/timing";
import { inProof, screenAt } from "../P4/geom";
import { T } from "./timing";

/**
 * P5 · Scale (film 3937 to 4177, R3 V23). Day, grid. Opens on P4's last pose (R19) pushed out by a slip push (T5).
 *
 *   J · Jira and ADR-015 (0 .. dash)
 *   "Jira"     the epic PAY-18 as a plain card that names Jira in words, joined by its anchor to ADR-015 (Verified)
 *   "changes"  To Do -> Done; the change runs along the anchor (the connector turns solid)
 *   "count"    ADR-015's table band slips amber and hands the amber to its byline item: "Possibly stale · Doc Drift"
 *   R20        the Jira strip above the ADR byline and tooltip, joined by a drawn line (two proofs, one claim)
 *   D · the dashboard (dash .. track)
 *   "space"    "Drift in PLAT" and its lead (always labelled "Sample data from the demo space"); the KPI cards drop
 *              flat and roll to 18 of 24, 6, 0, Under 3 hours; the six rows set in; ADR-015's row slips on "drift"
 *   R21        by MorphToReal from the KPI row
 *   T · Track in Jira (track .. end)
 *   click      Create Jira task; "Jira task created", "PAY-24 tracks this change. When the page is up to date, open it
 *              and click Mark verified." (the real form between the two clicks is shortened; R22 proves the result)
 *   R22        by MorphToReal from the created message; the twin rebuilds into the final pose, which the kit's slip cut
 *              carries into A4 (Night).
 */

const Iso: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ isolation: "isolate" }}>{children}</AbsoluteFill>;

const dimAt = (frame: number, at: number, end: number) => tween(frame, at + 2, at + 8) * (1 - tween(frame, end, end + 8));

// =====================================================================================================================
// World J · PAY-18 and ADR-015
// =====================================================================================================================

const K_JIRA = 1.42;
const JIRA_POS = { x: 70, y: 372 };
const JIRA_W = JIRA_UI.width * K_JIRA;
const JIRA_NODE: [number, number] = [JIRA_POS.x + JIRA_W, JIRA_POS.y + JIRA_UI.node.y * K_JIRA];

const ADR: PageTwinProps = {
  world: "day",
  doc: "adr015",
  k: 1.45,
  x: 1050,
  y: 150,
  byline: { kind: "dds", state: "possibly_stale", from: "verified", at: T.count - 1 },
  slip: { at: T.slip, handoff: T.handoff },
};
const RADR = pageRects(ADR);
const PAY18 = RADR.tokens["PAY-18"] ?? { x: RADR.card.x + 200, y: RADR.bands.middle.y + 160, w: 80, h: 32 };
const ADR_NODE: [number, number] = [RADR.card.x - 2, PAY18.y + PAY18.h / 2];
const ANCHOR_D = `M ${JIRA_NODE[0] + 2} ${JIRA_NODE[1]} C ${JIRA_NODE[0] + 90} ${JIRA_NODE[1]}, ${ADR_NODE[0] - 90} ${ADR_NODE[1]}, ${ADR_NODE[0]} ${ADR_NODE[1]}`;

const J_OPTS: CameraOptions = { base: { x: 900, y: 520, zoom: 0.96 }, seed: "p5-jira" };
const J_KEYS: Cam3Key[] = [
  // the slip push lands (content still travelling left)
  { at: 0, dur: 20, to: { x: 980, y: 520, zoom: 0.98 } },
  // a slow push toward the ADR as it flags
  { at: T.done, dur: 30, to: { x: 1010, y: 505, zoom: 1.02 }, ease: EASE.standard },
];

// R20: two proofs, one claim. The Jira strip (Done) above the ADR's byline and tooltip.
const R20A_CROP: [number, number, number, number] = [700, 150, 2260, 160];
const R20A_SCALE = 0.6;
const R20A_POS = { x: 116, y: 236 };
const R20B_CROP: [number, number, number, number] = [1440, 300, 1460, 312];
const R20B_SCALE = 0.65;
const R20B_POS = { x: 820, y: 560 };
const R20A_DONE = inProof(proofRect({ crop: R20A_CROP, scale: R20A_SCALE, ...R20A_POS }).image, R20A_CROP, R20A_SCALE, [2711, 231, 159, 61]);
const R20B_ITEM = inProof(proofRect({ crop: R20B_CROP, scale: R20B_SCALE, ...R20B_POS }).image, R20B_CROP, R20B_SCALE, [2268, 462, 320, 44]);
const R20_LINE = `M ${R20A_DONE.x + R20A_DONE.w / 2} ${R20A_DONE.y + R20A_DONE.h + 4} C ${R20A_DONE.x + R20A_DONE.w / 2} ${R20A_DONE.y + 200}, ${R20B_ITEM.x + R20B_ITEM.w / 2} ${R20B_ITEM.y - 160}, ${R20B_ITEM.x + R20B_ITEM.w / 2} ${R20B_ITEM.y - 4}`;
/** The hovered pill's grey under the logged cover. */
const ADR_PILL_MASK = {
  box: [2589, 465, 176, 37] as [number, number, number, number],
  fill: "#F1F1F2",
  why: "Development install suffix (logged), on the hovered pill",
};

const WorldJ: React.FC = () => {
  const frame = useCurrentFrame();
  const done = tween(frame, T.done, T.done + 8, 0, 1, EASE.expoOut);
  const dim = 1 - 0.6 * dimAt(frame, T.r20, T.r20End);
  return (
    <Stage world="day" motif="grid" light={["56%", "30%"]}>
      <Camera3D keys={J_KEYS} {...J_OPTS}>
        <div style={{ position: "absolute", inset: 0, opacity: dim < 1 ? dim : undefined }}>
          <PageTwin {...ADR} />
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
      <Iso>
        <WorldJ />
      </Iso>
      {frame >= T.r20 ? (
        <>
          <ProofFrame capture="p5-jira-done" crop={R20A_CROP} scale={R20A_SCALE} {...R20A_POS} at={T.r20} dur={T.r20End - T.r20} tag="Recorded in Jira" />
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
          {frame < T.r20End ? <SignalLine d={R20_LINE} at={T.r20 + 8} dur={12} pulse={false} /> : null}
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// =====================================================================================================================
// World D · the dashboard
// =====================================================================================================================

const K_DASH = 1.42;
const DASH_POS = { x: Math.round(960 - (DASH_UI.width * K_DASH) / 2), y: 118 };
const D_OPTS: CameraOptions = { base: { x: 1010, y: 520, zoom: 0.98 }, seed: "p5-dash" };
const D_KEYS: Cam3Key[] = [
  { at: T.dash, dur: 22, to: { x: 960, y: 470, zoom: 1.0 } },
  // pull back a little as the rows set in
  { at: T.kpi + 8, dur: 30, to: { x: 960, y: 520, zoom: 0.97 }, ease: EASE.standard },
];

// R21: the KPI row.
const R21_CROP: [number, number, number, number] = [720, 280, 3040, 420];
const R21_SCALE = 0.5;
const R21_POS = { x: Math.round(960 - (3040 * R21_SCALE + 28) / 2), y: 250 };
const R21_KPI = inProof(proofRect({ crop: R21_CROP, scale: R21_SCALE, ...R21_POS }).image, R21_CROP, R21_SCALE, [720, 459, 3040, 228]);
const R21_TWIN = screenAt(dashRect("kpiRow", DASH_POS.x, DASH_POS.y, K_DASH), T.r21, D_KEYS, D_OPTS);

const WorldD: React.FC = () => {
  const frame = useCurrentFrame();
  const kpiDrop = [0, 1, 2, 3].map((i) => tween(frame, T.kpi + 3 * i, T.kpi + 3 * i + 12, 0, 1, EASE.linear));
  const kpiRoll = [0, 1, 2, 3].map((i) => tween(frame, T.kpi + 2 + 3 * i, T.kpi + 22 + 3 * i, 0, 1, EASE.linear));
  const rows = tween(frame, T.kpi + 6, T.kpi + 20, 0, 6, EASE.linear);
  const slip = slipProgress(frame, T.rowSlip);
  const dim = 1 - 0.6 * dimAt(frame, T.r21, T.r21End);
  return (
    <Stage world="day" motif="grid" light={["50%", "26%"]}>
      <Camera3D keys={D_KEYS} {...D_OPTS}>
        <div style={{ position: "absolute", left: DASH_POS.x, top: DASH_POS.y, opacity: dim < 1 ? dim : undefined }}>
          <DashboardTwin k={K_DASH} kpiDrop={kpiDrop} kpiRoll={kpiRoll} rows={rows} slip={slip} label={false} />
        </div>
        {/* R3 risk 8: the numbers are the demo space's, always labelled (at a must-read size) */}
        <div
          style={{
            position: "absolute",
            left: DASH_POS.x + DASH_UI.width * K_DASH - 18,
            top: DASH_POS.y - 58,
            transform: "translateX(-100%)",
            opacity: dim < 1 ? dim : undefined,
          }}
        >
          <InkLabel icon="info" size={28}>
            {DASH.label}
          </InkLabel>
        </div>
      </Camera3D>
    </Stage>
  );
};

const ShotD: React.FC = () => (
  <MorphToReal
    at={T.r21}
    fromRect={R21_TWIN}
    toRect={R21_KPI}
    twinRest={1}
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
);

// =====================================================================================================================
// World T · Track in Jira
// =====================================================================================================================

const K_TRACK = 1.75;
const TRACK_POS = { x: Math.round(960 - (TRACK_UI.width * K_TRACK) / 2), y: 196 };
const T_OPTS: CameraOptions = { base: { x: 1000, y: 540, zoom: 0.98 }, seed: "p5-track" };
const T_KEYS: Cam3Key[] = [
  { at: T.track, dur: 22, to: { x: 960, y: 540, zoom: 1.0 } },
  // a slow push toward the result
  { at: T.created, dur: 50, to: { x: 960, y: 560, zoom: 1.04 }, ease: EASE.standard },
];
const BUTTON = (() => {
  const b = trackRect("button", TRACK_POS.x, TRACK_POS.y, K_TRACK);
  const w = (textWidth("Create Jira task", { size: 14, weight: 600 }) + 30) * K_TRACK;
  return { x: b.x, y: b.y + 18 * K_TRACK, w, h: 36 * K_TRACK };
})();
const BUTTON_ON_CLICK = screenAt(BUTTON, T.click, T_KEYS, T_OPTS);
const CLICK_PT: [number, number] = [BUTTON_ON_CLICK.x + BUTTON_ON_CLICK.w * 0.55, BUTTON_ON_CLICK.y + BUTTON_ON_CLICK.h * 0.55];

// R22: the created message.
const R22_CROP: [number, number, number, number] = [1150, 1610, 1550, 190];
const R22_SCALE = 0.85;
const R22_POS = { x: Math.round(960 - (1550 * R22_SCALE + 28) / 2), y: 470 };
const R22_MSG = inProof(proofRect({ crop: R22_CROP, scale: R22_SCALE, ...R22_POS }).image, R22_CROP, R22_SCALE, [1168, 1626, 1504, 160]);
const R22_TWIN = screenAt(trackRect("notice", TRACK_POS.x, TRACK_POS.y, K_TRACK), T.r22, T_KEYS, T_OPTS);

const WorldT: React.FC = () => {
  const frame = useCurrentFrame();
  const press = (() => {
    const t = frame - T.click;
    if (t < -4 || t > 10) return 0;
    return t < 0 ? (t + 4) / 4 : t <= 2 ? 1 : Math.max(0, 1 - (t - 2) / 8);
  })();
  const busy = tween(frame, T.click + 2, T.click + 4) * (1 - tween(frame, T.created - 1, T.created + 1));
  const created = tween(frame, T.created, T.created + 10, 0, 1, EASE.expoOut);
  const dim = 1 - 0.6 * dimAt(frame, T.r22, T.r22End);
  return (
    <Stage world="day" motif="grid" light={["50%", "30%"]}>
      <Camera3D keys={T_KEYS} {...T_OPTS}>
        <div style={{ position: "absolute", left: TRACK_POS.x, top: TRACK_POS.y, opacity: dim < 1 ? dim : undefined }}>
          <TrackInJiraTwin k={K_TRACK} press={press} busy={busy} created={created} badgeGlow={1} />
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
      twinRest={1}
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
      <Sfx id="slip" at={T.slip + 6} />
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
