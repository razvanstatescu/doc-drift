import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { DaySlipReveal } from "../../components/A2/DaySlipReveal";
import { Spine, SPINE_END, SPINE_SLIP, spineBand } from "../../components/A2/Spine";
import { Cursor } from "../../components/Cursor";
import { FRESH_CAM, FRESH_PAGE, freshCursor } from "../../components/P1/fresh";
import { EASE, tween } from "../../lib/time";
import { getScene, sceneLength } from "../../lib/timeline";
import { Camera3D, cam3At, KineticLine, SignalLine, SlipPush, Stage, useCam3, type Cam3Key } from "../../v4/kit";
import { AgentPanelTwin, agentPanelRects, AnchorRail, anchorRailRects, PageTwin, pageRects, TerminalTwin, terminalSize, type AgentPanelTwinProps, type PageTwinProps, type TerminalTwinProps } from "../../v4/twins";
import A1 from "../A1";

/**
 * A2 · The solution (Day), V07 to V10 (R3 section 5; V4.md section 6). Crafted only: it promises, P1 to P5 prove.
 * All frames are local, from the narration cues in timeline.json (round 3: S-4, S-10, S-11 and the V07 statement):
 *
 *   0-10      the Day slip cut as a reveal: A1's frozen last frame splits into the mark's three bands and clears; the
 *             Day world is already composed and moving behind it: the runbook (the page A1 showed at night, now in
 *             Day) fills the frame and the camera pushes slowly toward its date line, so nothing waits for "anchors"
 *   anchors   the page separates into its three bands (in Z) as the camera turns and pulls back (M2)
 *   code      the camera travels right and lands square; connectors draw from the Steps band to
 *             payments-api: scripts/rollback.sh and payments-api: deploy/helm/values.yaml; "Jira": from the header
 *             band to PAY-6, under "Anchors". The line's statement sets above the rail in two beats, "Anchored to
 *             code" with the code chips and "and Jira." with PAY-6, and leaves by moving before V08
 *   describes the date line rolls out and the byline gains "Verified · Doc Drift"
 *   change    PR #482 docks on the first anchor; flagged: the Steps band slips one unit right in amber with its trace,
 *             and the rail leaves (no chip is ever cut by the frame in the punch, S-11)
 *   Possibly  a punch into the page's header, 2.2x: the amber passes to the byline item, "Possibly stale · Doc Drift"
 *             at 60 px, the shot's focal element (the band stays out of line, neutral, below the frame)
 *   V09       pull back to the whole page and the two readers; two signal lines leave the badge for "Drift Reviewer ·
 *             Rovo agent" and "Coding agent · MCP" (in a lane right of the slipped band, S-10); each prints
 *             "status": "possibly_stale" on "told"; on "same" one decisive push onto the two status lines
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
  /**
   * Connectors start drawing 14 frames before their word: the rail's chip lifts in as its line arrives (about 12 frames
   * in), so each chip lands 0 to 4 frames before "code" and "Jira" (M6).
   */
  code1: w7("code") - 14,
  code2: w7("code") - 11,
  jira: w7("jira") - 14,
  /**
   * V07's statement (round 3), in two beats: "Anchored to code" lands 1 frame before "code" with the code chips,
   * "and Jira." 3 frames before "Jira" with PAY-6 (cues are the frames each word reads as landed, KineticLine lead 6).
   */
  say: [w7("code") - 4, w7("code") - 2, w7("code"), w7("jira") - 4, w7("jira") - 2],
  /** It leaves by moving after about 60 frames complete, before V08's visit to the change. */
  sayOut: w8("change") - 30,
  /** "The byline gains Verified · Doc Drift": the twin's slip swap from A1's date line, readable 2 frames before the word. */
  gain: w7("describes") - 5,
  change: w8("change") - 2,
  slip: w8("flagged") - 3,
  /** S-11: the rail leaves as the band slips, so no chip is ever cut by the frame during the punch-in. */
  railOut: w8("flagged") - 1,
  punch: w8("flagged") + 4,
  /** BylineItem's slip swap reads about 3 frames after `at`: this lands "Possibly stale" 2 frames before the word. */
  handoff: w8("possibly") - 5,
  pull: sc.cue("V09") - 8,
  /** The two readers arrive with "every agent", already showing their question and command (never empty). */
  readers: w9("every") + 2,
  /** The MCP slab lifts in 6 frames later, fading in over 10 (metrics r2: it popped in one frame at f1435). */
  term: w9("every") + 8,
  /** Each signal leaves the badge and lands in its reader just before "told". */
  lineA: w9("reads") - 4,
  lineB: w9("reads") + 2,
  print: w9("told") - 4,
  same: w9("same") - 2,
  /** The push to the spine ends as "Anchor." rises, so no empty band frame shows (metrics: f1530-1532). */
  spine: 468,
  flagSlip: v10[1].from - 4,
  small: v10[4].from + 3,
  /** The cursor (a person) arrives on "person" and rests on the slipped band. */
  cursor: v10[7].from - 3,
  /** The push to the fresh runbook (on the beat); its last band settles 3 frames before P1, so the seam does not snap. */
  fresh: 645,
  end: sc.durationInFrames,
};
const T = A2_T;

// ---- the hero page (stage px) ----
const HERO_BASE: PageTwinProps = { world: "day", doc: "runbook", k: 1.8, width: 520, x: 200, y: 112 };
const heroVerified = pageRects({ ...HERO_BASE, byline: { kind: "dds", state: "verified" } });
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
    frame < T.gain + 20
      ? { kind: "dds", state: "verified", from: "reviewed", fromText: "Reviewed 34 days ago", at: T.gain }
      : { kind: "dds", state: "possibly_stale", from: "verified", at: T.handoff };
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
/** The rail sits 53 px below its centred stack, so its "Anchors" label clears V07's statement above it. */
const RAIL_Y = 510;
const RENAME = "PR #482 · scripts/rollback.sh -> scripts/rollback-v2.sh";
const RAIL = anchorRailRects({ anchors: ANCHORS, draw: [0, 0, 0], from: ANCHOR_FROM, x: RAIL_X, y: RAIL_Y });
const RAIL_CHANGED = anchorRailRects({ anchors: ANCHORS, draw: [0, 0, 0], from: ANCHOR_FROM, x: RAIL_X, y: RAIL_Y, change: { index: 1, text: RENAME, at: 0 } });
const railRight = Math.max(...RAIL.chips.map((c) => c.x + c.w));
const changeChip = RAIL_CHANGED.chips[1];
/** The page and the whole rail in one square view (the connectors are read here). */
const WIDE_ZOOM = Math.min(0.92, (1920 - 220) / (railRight - card.x));
const WIDE_X = (card.x + railRight) / 2;
const WIDE_Y = 548;
const SAY_TOP = 104;

// ---- V09's readers (stage px): a small Drift Reviewer panel and a small MCP terminal, real twins (S-3) ----
/**
 * The readers sit right of the slipped Steps band with a 110 px lane between (S-10: the signal lines run down that
 * lane, clear of the band's card, instead of across its corner).
 */
const STEPS_RIGHT = heroFlagged.stepsSlipped.x + heroFlagged.stepsSlipped.w;
const READERS_X = STEPS_RIGHT + 110;
const READER_W = 760;
const READER_SIZE = 40;
const PANEL_V09: AgentPanelTwinProps = {
  world: "day",
  variant: "drift-reviewer",
  question: { text: "How do I roll back payments-api?", at: T.readers, prefilled: true },
  answer: { lines: ["{source} is Possibly stale."], at: T.print, cps: 90 },
  source: "Payments rollback runbook",
  x: READERS_X,
  y: 70,
  width: READER_W,
  size: READER_SIZE,
  elev: 3,
};
const panelV09 = agentPanelRects(PANEL_V09);
const TERM_V09: TerminalTwinProps = {
  title: "Coding agent · MCP",
  right: "doc-drift",
  calls: [{ cmd: 'check-page-freshness {"pageId": "2720100"}', at: T.term, output: "checkFlaggedV2", only: ["status"], typeFrames: 0, streamAt: T.print + 2 }],
  x: READERS_X,
  y: panelV09.panel.y + panelV09.panel.h + 36,
  width: READER_W,
  fontSize: READER_SIZE,
  enter: { at: T.term },
};
const termV09 = terminalSize(TERM_V09);
// the flagged item's words slip one unit right onto their amber block (BylineItem), so the lines leave past it
const bx = heroFlagged.badge.x + heroFlagged.badge.w * 1.1 + 12;
const by = heroFlagged.badge.y + heroFlagged.badge.h / 2;
/** The lines run right along the byline row (the header's empty right margin), then down the lane to each reader. */
const laneX = STEPS_RIGHT + 52;
const yA = panelV09.answer.y + panelV09.answer.h / 2;
const yB = (TERM_V09.y ?? 0) + 66 + 24 + termV09.lh * 3.5;
const lane = (y: number) => `M ${bx} ${by} L ${laneX - 40} ${by} Q ${laneX} ${by} ${laneX} ${by + Math.sign(y - by) * 40} L ${laneX} ${y - Math.sign(y - by) * 40} Q ${laneX} ${y} ${laneX + 40} ${y} L ${READERS_X - 6} ${y}`;
const PATH_A = lane(yA);
const PATH_B = lane(yB);
/** S-10: the whole page (its slipped band too) and both readers, with margins, in one square view. */
const READERS_BOX = { x0: card.x - 50, x1: READERS_X + READER_W + 50, y0: 40, y1: (TERM_V09.y ?? 0) + termV09.height + 40 };
const READERS_ZOOM = Math.min(1.02, 1920 / (READERS_BOX.x1 - READERS_BOX.x0), 1080 / (READERS_BOX.y1 - READERS_BOX.y0));
/** The push's centre: the readers in the middle, and far enough right that the slipped badge and its bloom are out. */
const BADGE_OUT = heroFlagged.badge.x + heroFlagged.badge.w * 1.15 + 60;
const PUSH_X = Math.max(READERS_X + READER_W / 2, BADGE_OUT + 960 / 1.42 + 10);

/**
 * V08's punch (round 3): into the page's header so the byline item reads at 60 px (27 px type at 2.2x and the creep),
 * the shot's focal element: the title, the byline row and the Service and Jira table whole and centred (about 30 px
 * from each side); the frame's bottom edge falls between the table and the end of the header's card, so no edge sits
 * near it, and the slipped Steps band (and its bloom while it is amber) stays below the frame.
 */
const PUNCH = { x: card.x + card.w / 2, y: 286, zoom: 2.2 };

const WORLD_KEYS: Cam3Key[] = [
  // the reveal (S-4): the page fills the frame from the slip cut and the camera is already moving, a slow push toward
  // its title and date line until "anchors"
  { at: 0, dur: T.explode, to: { x: card.x + card.w / 2 - 10, y: 445, zoom: 1.7 }, ease: EASE.linear },
  // "anchors": the page comes apart in Z while the camera turns and pulls back (M2: tilt only while it explodes)
  { at: T.explode, dur: 24, to: { yaw: -10, pitch: 4, zoom: 0.94, x: card.x + card.w / 2 + 90, y: WIDE_Y }, ease: EASE.expoInOut },
  // back to square on the way right
  { at: T.turnBack, dur: 30, to: { yaw: 0, pitch: 0, x: WIDE_X - 120, y: WIDE_Y, zoom: WIDE_ZOOM + 0.02 }, ease: EASE.expoInOut },
  // the lateral track while the connectors draw (R3: 18% of the frame width in all), then creep
  { at: T.turnBack + 30, dur: 40, to: { x: WIDE_X, zoom: WIDE_ZOOM } },
  // V08: to the rename as it docks on its anchor (read square, 26 px or more), then back for the slip
  { at: T.change - 10, dur: 16, to: { x: changeChip.x + changeChip.w / 2 - 120, y: changeChip.y + changeChip.h / 2 + 40, zoom: 1.12 }, ease: EASE.expoInOut },
  { at: T.slip - 12, dur: 12, to: { x: WIDE_X - 40, y: 600, zoom: WIDE_ZOOM + 0.05 }, ease: EASE.expoInOut },
  // the punch into the header, landing on "Possibly" (2.23x with the creep); then a slow ease back that the creep
  // cancels, so the zoom holds at 2.23 to 2.24 (the item's type at 60 px, the title 26 px from the frame's edge)
  { at: T.punch, dur: 24, to: PUNCH, ease: EASE.expoOut },
  { at: T.punch + 24, dur: T.pull - T.punch - 24, to: { zoom: PUNCH.zoom * 0.994 }, ease: EASE.linear },
  // V09: pull back to the whole page and both readers
  { at: T.pull, dur: 28, to: { x: (READERS_BOX.x0 + READERS_BOX.x1) / 2, y: (READERS_BOX.y0 + READERS_BOX.y1) / 2, zoom: READERS_ZOOM }, ease: EASE.expoInOut },
  // "the same": one decisive push onto the two readers' status lines (about 1.45x, director's decision 2), then it
  // settles a little. The badge leaves the frame whole rather than as a sliver at its edge (QA G-4, N-6).
  { at: T.same, dur: 9, to: { x: PUSH_X, y: (yA + yB) / 2 - 30, zoom: 1.5 }, ease: EASE.expoOut },
  { at: T.same + 12, dur: 20, to: { zoom: 1.42 }, ease: EASE.standard },
];
const WORLD_BASE = { x: card.x + card.w / 2, y: 470, zoom: 1.6 };
/** V07's statement, in screen px: left-aligned with the rail's chips as the camera holds the wide view (no float). */
const SAY_X = (() => {
  const cam = cam3At(T.say[4] + 30, WORLD_KEYS, { base: WORLD_BASE, float: 0 });
  return Math.round(960 + (RAIL_X - cam.x) * cam.zoom);
})();

/** The rail: chips sized to their labels; the rename docks and the chip grows; it leaves with `leave` (S-9). */
const Rails: React.FC = () => (
  <AnchorRail
    anchors={ANCHORS}
    draw={[T.jira, T.code1, T.code2]}
    from={ANCHOR_FROM}
    x={RAIL_X}
    y={RAIL_Y}
    change={{ index: 1, text: RENAME, at: T.change }}
    pulse={{ index: 1, at: T.change + 8, dur: 20 }}
    leave={{ at: T.railOut, dur: 7 }}
    world="day"
  />
);

/**
 * V07's one focal statement (round 3, review top 5 item 2): Fathom, 120 px, in the empty side above the rail. It sets in
 * two beats with the chips (a different entrance from P1's word-by-word line, K-7), holds still, and leaves upward.
 */
const AnchoredLine: React.FC = () => {
  const frame = useCurrentFrame();
  const first = T.say[0] - 6;
  if (frame < first || frame > T.sayOut + 14) return null;
  return (
    <div style={{ position: "absolute", left: SAY_X, top: SAY_TOP }}>
      <KineticLine text={"Anchored to\ncode and Jira."} at={first} words={T.say.map((from) => ({ from }))} size={120} lineHeight={128} exit={{ at: T.sayOut, stagger: 1, dur: 5 }} />
    </div>
  );
};

/**
 * A lift for a dark twin that draws its own rise (TerminalTwin `enter`): its opacity comes up evenly over 10 frames
 * while it rises, so the dark slab never lands on the light ground in one frame (metrics r2: f1435).
 */
const LiftIn: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const o = tween(frame, at, at + 10, 0, 1, EASE.linear);
  return <div style={{ position: "absolute", inset: 0, opacity: o < 1 ? o : undefined }}>{children}</div>;
};

/** On V09's push the page steps back (blur and drain, R2's rack focus), so its edge in frame reads as depth, not a cut. */
const RackOnPush: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const r = tween(frame, T.same, T.same + 9, 0, 1, EASE.expoOut);
  if (r < 0.01) return <>{children}</>;
  return <div style={{ position: "absolute", inset: 0, filter: `blur(${(6 * r).toFixed(2)}px) grayscale(${(0.7 * r).toFixed(2)})`, opacity: 1 - 0.3 * r }}>{children}</div>;
};

/** Arrival by lifting for a twin that draws its own shadow: rises 26 px and settles, fading only over 3 frames (M3). */
const Arrive: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const up = tween(frame, at, at + 14, 0, 1, EASE.expoOut);
  const o = tween(frame, at, at + 3, 0, 1, EASE.linear);
  return <div style={{ position: "absolute", inset: 0, opacity: o < 1 ? o : undefined, transform: `translateY(${(1 - up) * 26}px)` }}>{children}</div>;
};

/** S1: the page, its anchors, the flag, and the two readers, under one camera. */
const WorldShot: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage world="day" motif="grid" light={["40%", "38%"]}>
      <Camera3D keys={WORLD_KEYS} base={WORLD_BASE} seed="a2-world" perspective={2200}>
        <RackOnPush>
          <PageTwin {...heroAt(frame)} />
        </RackOnPush>
        <Rails />
        <SignalLine d={PATH_A} at={T.lineA} dur={16} />
        <SignalLine d={PATH_B} at={T.lineB} dur={16} />
        <Arrive at={T.readers}>
          <AgentPanelTwin {...PANEL_V09} />
        </Arrive>
        <LiftIn at={T.term}>
          <TerminalTwin {...TERM_V09} />
        </LiftIn>
      </Camera3D>
    </Stage>
  );
};

/** S2: the spine (a still bar: the camera only creeps). */
const SpineShot: React.FC = () => (
  <Stage world="day" motif="grid" light={["38%", "40%"]}>
    <Camera3D keys={[{ at: T.spine, dur: 0, to: { x: 960, y: 540, zoom: 1, yaw: 0, pitch: 0, roll: 0 } }]} float={0} creep={1.5} seed="a2-spine">
      <Spine
        arrive={[T.spine + 2, v10[1].from - 16, v10[2].from - 10]}
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
        { frame: T.cursor - 16, x: SPINE_END + 420, y: 1010 },
        { frame: T.cursor, x: SPINE_END + SPINE_SLIP - 120, y: band.y + band.h * 0.56, cursor: "pointer", travel: 16 },
      ]}
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
  return <Cursor points={pts} scale={2.4 / cam.zoom} showAt={2} theme="day" />;
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
  else if (frame < T.fresh + 12) picture = <SlipPush at={T.fresh} dur={12} from={<SpineShot />} to={<FreshShot />} />;
  else picture = <FreshShot />;
  return (
    <AbsoluteFill>
      {picture}
      {frame < T.spine ? <AnchoredLine /> : null}
      {frame < T.reveal ? (
        <DaySlipReveal f={frame} open={T.reveal}>
          <A1LastFrame />
        </DaySlipReveal>
      ) : null}
      {/* sound: the slip and the score's lift on frame 0 are film-level (transitions.ts); effects stay under the voice */}
      <Sfx id="whoosh-short" at={T.explode + 6} gainDb={-10} />
      <Sfx id="pop" at={T.code1 + 12} gainDb={-6} />
      <Sfx id="pop" at={T.code2 + 12} gainDb={-7} />
      <Sfx id="pop" at={T.jira + 12} gainDb={-6} />
      <Sfx id="tick" at={T.gain + 1} gainDb={-4} />
      <Sfx id="tick" at={T.change + 2} gainDb={-3} />
      <Sfx id="slip" at={T.slip + 6} />
      <Sfx id="pop" at={T.readers + 4} gainDb={-6} />
      <Sfx id="pop" at={T.readers + 10} gainDb={-7} />
      <Sfx id="tick-soft" at={T.print + 2} gainDb={-4} />
      <Sfx id="tick-soft" at={T.print + 6} gainDb={-5} />
      <Sfx id="whoosh-short" at={T.spine + 6} gainDb={-4} />
      {[v10[0].from, v10[1].from, v10[2].from, v10[5].from].map((f, i) => (
        <Sfx key={`ph-${i}`} id="tick" at={f} gainDb={-3} />
      ))}
      <Sfx id="whoosh-short" at={T.fresh + 6} gainDb={-4} />
    </AbsoluteFill>
  );
};

export default A2;
