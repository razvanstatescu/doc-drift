import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { AGENT_CARD, AgentCard, agentCardHeight } from "../../components/A2/AgentCard";
import { DaySlipReveal } from "../../components/A2/DaySlipReveal";
import { Spine, spineBand } from "../../components/A2/Spine";
import { Cursor } from "../../components/Cursor";
import { FRESH_CAM, FRESH_PAGE, freshCursor } from "../../components/P1/fresh";
import { EASE, tween } from "../../lib/time";
import { getScene, sceneLength } from "../../lib/timeline";
import { Camera3D, SignalLine, SlipPush, Stage, useCam3, type Cam3Key } from "../../v4/kit";
import { AnchorRail, anchorRailRects, BylineItem, PageTwin, pageRects, ReviewedLine, type PageTwinProps } from "../../v4/twins";
import A1 from "../A1";

/**
 * A2 · The solution (Day), V07 to V10 (R3 section 5; V4.md section 6). Crafted only: it promises, P1 to P5 prove.
 * All frames are local, from the narration cues in timeline.json:
 *
 *   0-10      the Day slip cut as a reveal: A1's frozen last frame splits into the mark's three bands and clears; the
 *             Day world is already composed behind it (the runbook, the same page A1 showed at night, now in Day)
 *   anchors   the page separates into its three bands (in Z, the camera turning while it does, M2)
 *   code      the camera travels right and lands square; connectors draw from the Steps band to
 *             payments-api: scripts/rollback.sh and payments-api: deploy/helm/values.yaml; "Jira": from the header
 *             band to PAY-6, under "Anchors"
 *   describes the date line rolls out and the byline gains "Verified · Doc Drift"
 *   change    PR #482 docks on the first anchor; flagged: the Steps band slips one unit right in amber with its trace;
 *   Possibly  the amber passes to the byline: "Possibly stale · Doc Drift" (the band stays out of line, neutral),
 *             with a punch toward the byline landing on the word
 *   V09       pull back and track right; two signal lines leave the badge for "Drift Reviewer · Rovo agent" and
 *             "Coding agent · MCP"; each prints "status": "possibly_stale" on "told"; on "same" they snap level
 *   465       slip push (T5) to the spine, V10: one phrase per word on three full-width bands; Flag's band slips amber
 *   645       slip push to a fresh runbook twin reading "Unanchored · Doc Drift", composed exactly as P1 opens
 *
 * One amber per shot: none before "flagged"; the band, then the badge (V08, V09); the Flag band (V10); none at the end.
 */
const sc = getScene("A2");
const w7 = (w: string) => sc.wordAt("V07", w);
const w8 = (w: string) => sc.wordAt("V08", w);
const w9 = (w: string) => sc.wordAt("V09", w);
const v10 = sc.line("V10").words;

export const A2_T = {
  reveal: 10,
  explode: w7("anchors") - 3,
  turnBack: w7("anchors") + 22,
  track: w7("code") - 6,
  label: w7("code") - 6,
  code1: w7("code") - 2,
  code2: w7("code") + 5,
  jira: w7("jira") - 2,
  dateOut: w7("describes") - 8,
  gain: w7("describes") - 3,
  change: w8("change") - 2,
  slip: w8("flagged") - 3,
  punch: w8("flagged") + 4,
  handoff: w8("possibly") - 4,
  railOut: w8("stale") + 4,
  pull: sc.cue("V09") - 8,
  lineA: w9("every") - 2,
  lineB: w9("every") + 4,
  /** The readers arrive with "every agent" (their names then hold for their reading time before the push). */
  cardA: w9("agent") + 4,
  cardB: w9("agent") + 10,
  print: w9("told") - 4,
  same: w9("same") - 3,
  spine: 465,
  flagSlip: v10[1].from - 4,
  small: v10[4].from + 3,
  cursor: v10[5].from - 4,
  /** The push to the fresh runbook: late enough that "Then a person decides." holds still for its reading time. */
  fresh: 650,
  end: sc.durationInFrames,
};
const T = A2_T;

// ---- the hero page (stage px) ----
const HERO_BASE: PageTwinProps = { world: "day", doc: "runbook", k: 1.8, width: 520, x: 200, y: 112 };
const heroVerified = pageRects({ ...HERO_BASE, byline: { kind: "dds", state: "verified" } });
const heroReviewed = pageRects({ ...HERO_BASE, byline: { kind: "reviewed", text: "Reviewed 34 days ago" } });
const heroFlagged = pageRects({ ...HERO_BASE, byline: { kind: "dds", state: "possibly_stale" } });
const card = heroVerified.card;
const badge = heroVerified.badge;
const k = heroVerified.k;

/** Z of the bands follows the camera: apart while it turns, nearly flat once it reads square (M2). */
function zScale(frame: number) {
  return tween(frame, T.explode, T.explode + 18, 0, 1, EASE.expoOut) * (1 - 0.92 * tween(frame, T.turnBack, T.turnBack + 26, 0, 1, EASE.expoInOut));
}

const heroAt = (frame: number): PageTwinProps => {
  const z = zScale(frame);
  const byline: PageTwinProps["byline"] =
    frame < T.gain + 9 ? { kind: "reviewed", text: "Reviewed 34 days ago" } : { kind: "dds", state: "possibly_stale", from: "verified", at: T.handoff };
  return {
    ...HERO_BASE,
    byline,
    explode: tween(frame, T.explode, T.explode + 16, 0, 1, EASE.expoOut),
    explodeZ: [-90 * z, 110 * z, -180 * z],
    slip: { at: T.slip, handoff: T.handoff },
  };
};

// ---- anchors (stage px) ----
const RAIL_X = card.x + card.w + 170;
/** The runbook's real anchors at merge time (A2 may show all three, R3 section 8 item 3), ordered by source height. */
const ANCHORS = [
  { label: "PAY-6", kind: "jira" as const },
  { label: "payments-api: scripts/rollback.sh", kind: "code" as const },
  { label: "payments-api: deploy/helm/values.yaml", kind: "code" as const },
];
const ANCHOR_FROM = [heroVerified.bands.top, heroVerified.bands.steps, heroVerified.bands.steps];
const RENAME = "PR #482 · scripts/rollback.sh -> scripts/rollback-v2.sh";
const RAIL = anchorRailRects({ anchors: ANCHORS, draw: [0, 0, 0], from: ANCHOR_FROM, x: RAIL_X });
const RAIL_CHANGED = anchorRailRects({ anchors: ANCHORS, draw: [0, 0, 0], from: ANCHOR_FROM, x: RAIL_X, change: { index: 1, text: RENAME, at: 0 } });
const railRight = Math.max(...RAIL.chips.map((c) => c.x + c.w));
const changeChip = RAIL_CHANGED.chips[1];
/** The page and the whole rail in one square view (the connectors are read here). */
const WIDE_ZOOM = Math.min(0.92, (1920 - 220) / (railRight - card.x));
const WIDE_X = (card.x + railRight) / 2;

// ---- V09's readers (stage px) ----
const CARD_H = agentCardHeight();
const CARD_A = { x: 1170, y: 520 };
const CARD_B = { x: CARD_A.x + AGENT_CARD.w + 44, y: CARD_A.y };
const B_DROP = 52;
// the flagged item's words slip one unit right onto their amber block (BylineItem), so the lines leave past it
const bx = heroFlagged.badge.x + heroFlagged.badge.w * 1.1 + 12;
const by = heroFlagged.badge.y + heroFlagged.badge.h / 2;
const topA = CARD_A.x + AGENT_CARD.w / 2;
const topB = CARD_B.x + AGENT_CARD.w / 2;
const PATH_A = `M ${bx} ${by} L ${topA - 70} ${by} Q ${topA} ${by} ${topA} ${by + 70} L ${topA} ${CARD_A.y + 4}`;
const PATH_B = `M ${bx} ${by} L ${topB - 70} ${by} Q ${topB} ${by} ${topB} ${by + 70} L ${topB} ${CARD_B.y + B_DROP + 4}`;

const WORLD_KEYS: Cam3Key[] = [
  // the reveal: close on the page A1 showed (its title, the date line, step 2), easing back as the bands clear
  { at: 0, dur: 64, to: { x: card.x + card.w / 2 + 10, y: card.y + 430, zoom: 1.14 }, ease: EASE.standard },
  // "anchors": the page comes apart in Z while the camera turns and pulls back (M2: tilt only while it explodes)
  { at: T.explode, dur: 24, to: { yaw: -10, pitch: 4, zoom: 0.94, x: card.x + card.w / 2 + 90, y: 548 }, ease: EASE.expoInOut },
  // back to square on the way right
  { at: T.turnBack, dur: 30, to: { yaw: 0, pitch: 0, x: WIDE_X - 120, y: 548, zoom: WIDE_ZOOM + 0.02 }, ease: EASE.expoInOut },
  // the lateral track while the connectors draw (R3: 18% of the frame width in all), then creep
  { at: T.turnBack + 30, dur: 40, to: { x: WIDE_X, zoom: WIDE_ZOOM } },
  // V08: to the rename as it docks on its anchor (read square, 26 px or more), then back for the slip
  { at: T.change - 10, dur: 16, to: { x: changeChip.x + changeChip.w / 2 - 120, y: changeChip.y + changeChip.h / 2 + 40, zoom: 1.12 }, ease: EASE.expoInOut },
  { at: T.slip - 12, dur: 12, to: { x: WIDE_X - 40, y: 600, zoom: WIDE_ZOOM + 0.05 }, ease: EASE.expoInOut },
  // punch toward the byline, landing on "Possibly"
  { at: T.punch, dur: 24, to: { x: badge.x + badge.w / 2 + 150, y: badge.y + 230, zoom: 1.34 }, ease: EASE.expoOut },
  // V09: pull back and track right to the two readers
  { at: T.pull, dur: 30, to: { x: 1270, y: 560, zoom: 0.8 }, ease: EASE.expoInOut },
];

/**
 * "The byline gains Verified · Doc Drift": the date line A1 showed ("Reviewed 34 days ago") rolls up and out and the
 * state rises in where it was. The page draws its own byline before and after; during the swap a white patch covers the
 * page's row (the top band is white there) and these two overlays play the swap, then hand back on the same pixels.
 */
const SWAP_PATCH = (() => {
  const a = heroReviewed.badge;
  const x0 = Math.min(a.x, badge.x) - 6;
  const x1 = Math.max(a.x + a.w, badge.x + badge.w) + 10;
  return { x: x0, y: Math.min(a.y, badge.y) - 6, w: x1 - x0, h: Math.max(a.h, badge.h) + 12 };
})();
const DateSwap: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.dateOut || frame >= T.gain + 9) return null;
  const out = tween(frame, T.dateOut, T.dateOut + 7, 0, 1, EASE.expoIn);
  const p = tween(frame, T.gain, T.gain + 9, 0, 1, EASE.expoOut);
  const r = heroReviewed.badge;
  return (
    <>
      <div style={{ position: "absolute", left: SWAP_PATCH.x, top: SWAP_PATCH.y, width: SWAP_PATCH.w, height: SWAP_PATCH.h, background: "#FFFFFF" }} />
      {out < 1 ? (
        <div style={{ position: "absolute", left: r.x, top: r.y, height: r.h, display: "flex", alignItems: "center", opacity: 1 - out, transform: `translateY(${-out * 18}px)` }}>
          <ReviewedLine text="Reviewed 34 days ago" world="day" k={k} />
        </div>
      ) : null}
      {frame >= T.gain ? (
        <div style={{ position: "absolute", left: badge.x, top: badge.y + (1 - p) * 16, opacity: Math.min(1, p * 2.5) }}>
          <BylineItem state="verified" world="day" k={k} />
        </div>
      ) : null}
    </>
  );
};

const Rails: React.FC = () => {
  const frame = useCurrentFrame();
  const away = tween(frame, T.railOut, T.railOut + 12, 0, 1, EASE.expoIn);
  if (away >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, transform: away > 0 ? `translateX(${away * 1100}px)` : undefined }}>
      <AnchorRail
        anchors={ANCHORS}
        draw={[T.jira, T.code1, T.code2]}
        from={ANCHOR_FROM}
        x={RAIL_X}
        change={{ index: 1, text: RENAME, at: T.change }}
        pulse={{ index: 1, at: T.change + 8, dur: 20 }}
        world="day"
      />
    </div>
  );
};

/** S1: the page, its anchors, the flag, and the two readers, under one camera. */
const WorldShot: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage world="day" motif="grid" light={["40%", "38%"]}>
      <Camera3D keys={WORLD_KEYS} base={{ x: card.x + card.w / 2 + 10, y: 556, zoom: 1.08 }} seed="a2-world" perspective={2200}>
        <PageTwin {...heroAt(frame)} />
        <DateSwap />
        <Rails />
        <SignalLine d={PATH_A} at={T.lineA} dur={18} />
        <SignalLine d={PATH_B} at={T.lineB} dur={18} />
        <AgentCard icon="words" name="Drift Reviewer" kind="Rovo agent" x={CARD_A.x} y={CARD_A.y} at={T.cardA} print={T.print} />
        <AgentCard icon="terminal" name="Coding agent" kind="MCP" x={CARD_B.x} y={CARD_B.y} offset={B_DROP} snap={T.same} at={T.cardB} print={T.print + 2} />
      </Camera3D>
    </Stage>
  );
};

/** S2: the spine (a still bar: the camera only creeps). */
const SpineShot: React.FC = () => (
  <Stage world="day" motif="grid" light={["38%", "40%"]}>
    <Camera3D keys={[{ at: T.spine, dur: 0, to: { x: 960, y: 540, zoom: 1, yaw: 0, pitch: 0, roll: 0 } }]} float={0} creep={1.5} seed="a2-spine">
      <Spine
        arrive={T.spine - 2}
        words={{ anchor: [v10[0]], flag: [v10[1]], tell: [v10[2], v10[3], v10[4]], then: [v10[5], v10[6], v10[7], v10[8]] }}
        flagSlip={T.flagSlip}
        small={T.small}
      />
      <SpineCursor />
    </Camera3D>
  </Stage>
);

/** "Then a person decides.": a cursor arrives and rests on the slipped band, without moving it. */
const SpineCursor: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.cursor - 16) return null;
  const band = spineBand(1);
  return (
    <Cursor
      points={[
        { frame: T.cursor - 16, x: 1560, y: 1010 },
        { frame: T.cursor, x: 1240, y: band.y + band.h * 0.56, cursor: "pointer", travel: 16 },
      ]}
      scale={1.6}
      showAt={T.cursor - 16}
      theme="day"
    />
  );
};

/** S3: the fresh runbook twin, as P1 opens (its own clock starts at the push, so its creep meets P1's). */
const FreshShot: React.FC = () => (
  <Sequence from={T.fresh} layout="none" name="Fresh runbook">
    <Stage world="day" motif="grid" light={["46%", "36%"]}>
      <Camera3D base={FRESH_CAM} float={0} creep={1.5} seed="p1">
        <PageTwin {...FRESH_PAGE} />
        <FreshCursor />
      </Camera3D>
    </Stage>
  </Sequence>
);

/** P1's cursor, already on its way to the byline item (the same path P1 draws, on this shot's clock). */
const FreshCursor: React.FC = () => {
  const cam = useCam3();
  const pts = freshCursor(T.end - T.fresh);
  return <Cursor points={pts} scale={1.45 / cam.zoom} showAt={2} theme="day" />;
};

/** A1's last frame, frozen: the picture the Day slip cut splits (visual only: media inside a Freeze is muted). */
const A1LastFrame: React.FC = () => (
  <Freeze frame={sceneLength("A1") - 1}>
    <A1 />
  </Freeze>
);

const A2: React.FC = () => {
  const frame = useCurrentFrame();
  let picture: React.ReactNode;
  if (frame < T.spine) picture = <WorldShot />;
  else if (frame < T.spine + 12) picture = <SlipPush at={T.spine} from={<WorldShot />} to={<SpineShot />} />;
  else if (frame < T.fresh) picture = <SpineShot />;
  else if (frame < T.fresh + 10) picture = <SlipPush at={T.fresh} dur={10} from={<SpineShot />} to={<FreshShot />} />;
  else picture = <FreshShot />;
  return (
    <AbsoluteFill>
      {picture}
      {frame < T.reveal ? (
        <DaySlipReveal f={frame} open={T.reveal}>
          <A1LastFrame />
        </DaySlipReveal>
      ) : null}
      {/* sound: the slip and the score's lift on frame 0 are film-level (transitions.ts); effects stay under the voice */}
      <Sfx id="whoosh-short" at={T.explode + 6} gainDb={-10} />
      <Sfx id="tick-soft" at={T.code1 + 14} gainDb={-3} />
      <Sfx id="pop" at={T.code1 + 16} gainDb={-6} />
      <Sfx id="pop" at={T.code2 + 16} gainDb={-6} />
      <Sfx id="tick-soft" at={T.jira + 14} gainDb={-3} />
      <Sfx id="pop" at={T.jira + 16} gainDb={-6} />
      <Sfx id="tick" at={T.gain + 2} gainDb={-4} />
      <Sfx id="tick" at={T.change + 2} gainDb={-3} />
      <Sfx id="slip" at={T.slip + 6} />
      <Sfx id="pop" at={T.cardA + 4} gainDb={-5} />
      <Sfx id="pop" at={T.cardB + 4} gainDb={-5} />
      <Sfx id="tick-soft" at={T.same + 4} gainDb={-3} />
      <Sfx id="whoosh-short" at={T.spine + 6} gainDb={-4} />
      {[v10[0].from, v10[1].from, v10[2].from, v10[5].from].map((f, i) => (
        <Sfx key={`ph-${i}`} id="tick" at={f} gainDb={-3} />
      ))}
      <Sfx id="whoosh-short" at={T.fresh + 6} gainDb={-4} />
    </AbsoluteFill>
  );
};

export default A2;
