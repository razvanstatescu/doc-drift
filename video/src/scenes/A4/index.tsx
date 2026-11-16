import React, { useId } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { AlertStation, CLOCK_SIZE } from "../../components/A1/AlertStation";
import { landFor } from "../../components/A1/ClockRoll";
import { EndCardDay, END } from "../../components/A4/EndCardDay";
import { SlipToDay } from "../../components/A4/SlipToDay";
import { AmberWords } from "../../components/A4/AmberWords";
import { turnTravel } from "../../components/A1/moves";
import { EASE, tween } from "../../lib/time";
import { getScene } from "../../lib/timeline";
import { Camera3D, cam3At, DirBlur, Stage, WhipBlur, type Cam3Key } from "../../v4/kit";
import { AgentPanelTwin, agentPanelRects, PageTwin, pageRects, textWidth, type AgentPanelTwinProps, type PageTwinProps } from "../../v4/twins";

/**
 * A4 · Close (film 4177 to 4657). V4.md section 6. Local frames, all from the narration cues and the endHit marker:
 *
 *   0          opens composed in Night under P5's slip reveal: A1's clock rolls in again (already rolling), on 03:06,
 *              framed close as in A1; the minute ticks to 03:07 on "3" and the alert card lifts with it, the camera
 *              tilts down to the whole composition and pushes in slowly, as in A1                             (V24)
 *   "runbook"  whip (as in A1) to the runbook, framed with the byline above and step 2 below: the Steps band slips
 *              one unit in amber as it arrives and hands the amber up to the byline, readable 2 frames before
 *              "tells" ("Possibly stale · Doc Drift", the one amber)
 *   "and"      a whip-travel across the room to the generic assistant, which lifts in already asked while the page
 *              racks out behind it; the caveat replaces the old step and holds at the medium framing (1.3x, the
 *              badge out of frame) until the slip
 *   endHit     the last slip into Day: three bands, the middle band's slip lands on endHit (the score's final hit),
 *              the bands clear, and the end card is behind them: the tile's band slips into place (the one amber),
 *              the lockup centres and the name sets before "Doc Drift Sentinel"; the camera pulls back from the lockup
 *              and is still before "Catch the slip / before your agents do." rises word by word (each word in its
 *              slot 2 frames before it is spoken), then the credit. Creep to the last frame.                    (V25)
 */
const sc = getScene("A4");

const endHit = sc.marker("endHit");
const v25 = sc.line("V25").words;
export const A4_T = {
  /** The clock rolls in again as in A1 (already rolling under P5's slip cut), landing on 03:06. */
  rollAt: -4,
  rollLand: 24,
  /**
   * The minute drum ticks 6 to 7 and is within 4 px of rest 2 frames before "3"; the alert fires at 03:07, so the card
   * lifts with it.
   */
  tickAt: sc.wordAt("V24", "3") - 10,
  tickLand: landFor(sc.wordAt("V24", "3") - 10, sc.wordAt("V24", "3") - 2, 1, CLOCK_SIZE),
  cardAt: sc.wordAt("V24", "3") - 8,
  /** The whip's seam on the beat at "runbook". */
  whip1: sc.snap(sc.wordAt("V24", "runbook")),
  /**
   * The whip lands on a medium framing of the page (byline above, step 2 below): the Steps band slips one unit in amber
   * as it arrives, and hands the amber up to the byline item ("Possibly stale · Doc Drift"), which reads amber 2 frames
   * before "tells".
   */
  bandSlip: sc.wordAt("V24", "runbook") - 1,
  handoff: sc.wordAt("V24", "tells") - 4,
  /** "and your agent": the camera travels to the assistant (landing 2 frames before "agent") as it lifts in, already
   * asked (N-1), and the page racks out behind it. */
  travel: sc.wordAt("V24", "and") - 7,
  panelIn: sc.wordAt("V24", "and") - 6,
  /** The caveat streams from "and" at 140 characters a second and holds at the medium framing until the slip (N-5). */
  answer: sc.wordAt("V24", "and"),
  /** "Possibly stale" has streamed in about 9 frames later; its amber block wipes in then. */
  staleAmber: sc.wordAt("V24", "and") + 10,
  endHit,
  /** After the Night bands clear, the tile's band slips into place (amber). */
  markSlip: endHit + 16,
  name: endHit + 22,
  /** The camera pulls back from the lockup during "Sentinel" and is still before "Catch". */
  camOut: sc.wordAt("V25", "sentinel"),
  /** Each tagline word starts 7 frames before its word: its 12-frame rise is within 4 px of its slot 1 to 2 frames before. */
  words: v25.slice(3).map((w) => w.from - 7),
  credit: sc.wordAt("V25", "agents") + 4,
  end: sc.durationInFrames,
};
const T = A4_T;

// ---------------------------------------------------------------------------------------------------------------------
// The resolved room: the flagged runbook and the assistant with the caveat, one Night world.
// ---------------------------------------------------------------------------------------------------------------------

const PAGE: PageTwinProps = {
  world: "night",
  doc: "runbook",
  x: 96,
  y: 96,
  byline: { kind: "dds", state: "possibly_stale" },
  slip: { at: T.bandSlip, handoff: T.handoff },
};
const R = pageRects(PAGE);
/**
 * The assistant lifts in just past the page's right edge. Its caveat is read at the medium framing, 1.3x (the answer at
 * 44 px), the panel centred, held until the slip (N-5); there the page's badge is out of frame (N-6) and the page is
 * racked out behind the panel.
 */
const PANEL = { x: 1150, y: 150, width: 840, size: 34 } as const;
/** The generic assistant: it lifts in already asked (prefilled, N-1), grows as the caveat streams. */
const PANEL_PROPS: AgentPanelTwinProps = {
  world: "night",
  variant: "generic",
  question: { text: "How do I roll back payments-api?", at: T.panelIn, prefilled: true },
  answer: {
    lines: ["Payments rollback runbook is **Possibly stale**.", "What it describes changed in PR #482, after it was last verified."],
    at: T.answer,
    cps: 140,
  },
  source: { text: "Payments rollback runbook", at: T.answer + 26 },
  x: PANEL.x,
  y: PANEL.y,
  width: PANEL.width,
  size: PANEL.size,
  elev: 4,
};
/**
 * The caveat's own drift words, "Possibly stale", carry the shot's one amber once they have streamed in (the page's badge
 * is out of frame here, N-6): placed from the twin's layout (its first answer line, after "Payments rollback runbook is ").
 */
const CAVEAT_LINE = agentPanelRects(PANEL_PROPS).answerLines[0];
const STALE_X = CAVEAT_LINE.x + textWidth("Payments rollback runbook is ", { size: PANEL.size, weight: 400 });
/** The panel's height: padding 34, header 60 + 26, the question 75 + 18, the caveat 1 + 2 lines of 52 + 18, source 22 + 50. */
const PANEL_H = 34 + 60 + 26 + 75 + 18 + 52 + 18 + 104 + 22 + 50 + 34;

const cx = (r: { x: number; w: number }) => r.x + r.w / 2;

/** The page beat: the byline above, step 2 below, the whole page width; the bottom band stays out of frame. */
const PAGE_CAM = { x: cx(R.card), y: 455, zoom: 1.2 };
/** The caveat: the panel centred at 1.3x; the badge (right edge at R.badge.x + R.badge.w) at least 14 px out of frame. */
const AGENT_ZOOM = 1.3;
const AGENT = {
  x: Math.max(PANEL.x + PANEL.width / 2, R.badgeSlipped.x + R.badgeSlipped.w + 14 + 960 / AGENT_ZOOM),
  y: PANEL.y + PANEL_H / 2 - 4,
  zoom: AGENT_ZOOM,
};

const ROOM_KEYS: Cam3Key[] = [
  // "and your agent": a whip-travel across the room to the assistant (turning on the way), smeared by its speed
  ...turnTravel(T.travel, 16, PAGE_CAM, AGENT, { yaw: 7 }),
];
const ROOM_OPTS = { base: PAGE_CAM, seed: "room" } as const;

/** The assistant arrives by lifting (M3) as the camera travels to it: 40 px up, from 97%, its first 3 frames soft. */
const PanelLift: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  if (frame < T.panelIn) return null;
  const p = tween(frame, T.panelIn, T.panelIn + 14, 0, 1, EASE.expoOut);
  const o = tween(frame, T.panelIn, T.panelIn + 3, 0, 1, EASE.linear);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, transform: `translateY(${((1 - p) * 40).toFixed(2)}px) scale(${(0.97 + 0.03 * p).toFixed(4)})`, transformOrigin: `${PANEL.x + PANEL.width / 2}px ${PANEL.y + PANEL_H}px` }}>
      {children}
    </div>
  );
};

const Room: React.FC = () => {
  const frame = useCurrentFrame();
  const id = "room" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  // a horizontal smear while the camera whips to the assistant (scaled by its screen speed)
  const a = cam3At(frame - 0.5, ROOM_KEYS, ROOM_OPTS);
  const b = cam3At(frame + 0.5, ROOM_KEYS, ROOM_OPTS);
  const speed = Math.abs(b.x - a.x) * b.zoom;
  const blur = Math.min(30, speed * 0.05);
  // the page racks out as the assistant lifts in front of it (blurred, darker, desaturated toward the Night ground,
  // never a neutral grey): the panel is the read
  const rack = tween(frame, T.panelIn, T.panelIn + 14, 0, 1, EASE.expoOut);
  return (
    <Stage world="night" motif="tide" light={["58%", "36%"]} tide={{ top: 840, bottom: 1110, count: 7 }}>
      <DirBlur id={id} x={blur} />
      <AbsoluteFill style={{ filter: blur > 0.3 ? `url(#${id})` : undefined }}>
        <Camera3D keys={ROOM_KEYS} {...ROOM_OPTS}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              filter: rack > 0.01 ? `blur(${(7 * rack).toFixed(2)}px) saturate(${(1 - 0.55 * rack).toFixed(3)}) brightness(${(1 - 0.38 * rack).toFixed(3)})` : undefined,
            }}
          >
            <PageTwin {...PAGE} />
          </div>
          <PanelLift>
            <AgentPanelTwin {...PANEL_PROPS} />
            <AmberWords text="Possibly stale" x={STALE_X} y={CAVEAT_LINE.y} h={CAVEAT_LINE.h} size={PANEL.size} at={T.staleAmber} />
          </PanelLift>
        </Camera3D>
      </AbsoluteFill>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The end card (Day), behind the last slip.
// ---------------------------------------------------------------------------------------------------------------------

/** The lockup row: tile, gap (28% of the tile), name at 42% of the tile (brand/logo.md); the tile's centre on stage. */
const LOCKUP_W = END.icon * 1.28 + textWidth("Doc Drift Sentinel", { size: END.icon * 0.42, weight: 600, tracking: -0.02 });
const TILE_CX = 960 - LOCKUP_W / 2 + END.icon / 2;
/** On the tile alone while the bands clear; it travels to centre the lockup as the name sets; then out to the card. */
const END_BASE = { x: TILE_CX, y: END.lockupCy + 6, zoom: 1.32 };
const END_KEYS: Cam3Key[] = [
  // centre the lockup as the name sets: under way as the bands clear, within 4 px of rest before "Doc"
  { at: T.markSlip - 2, dur: 18, to: { x: 960 }, ease: EASE.expoInOut },
  { at: T.camOut, dur: 26, to: { x: 960, y: 520, zoom: 1 }, ease: EASE.expoInOut },
];

const End: React.FC = () => (
  <Stage
    world="day"
    motif="tide"
    light={["50%", "30%"]}
    tide={{ top: 850, bottom: 1110, count: 7, opacity: 0.24, amplitude: 18, mask: "linear-gradient(180deg, transparent 0%, #000 45%, #000 100%), linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)" }}
  >
    <Camera3D keys={END_KEYS} base={END_BASE} creep={1.2} seed="end">
      <EndCardDay slipAt={T.markSlip} nameAt={T.name} words={T.words} creditAt={T.credit} />
    </Camera3D>
  </Stage>
);

const A4: React.FC = () => {
  const frame = useCurrentFrame();
  const alert = (
    <AlertStation
      clockAt={T.rollAt}
      clockLand={T.rollLand}
      clockFrom="03:06"
      clockTick={{ at: T.tickAt, land: T.tickLand }}
      cardAt={T.cardAt}
      rateAt={T.cardAt - 30}
      tiltAt={T.tickLand - 2}
      outAt={T.whip1}
      seed="alert4"
    />
  );
  const night = frame < T.whip1 + 6 ? <WhipBlur at={T.whip1} dur={10} dir="left" from={alert} to={<Room />} /> : <Room />;
  return (
    <World theme="night">
      <SlipToDay land={T.endHit} night={night} day={<End />} />
      {/* sound: voice and score are global; the score's own final hit lands on endHit */}
      <Sfx id="clock-tick" at={T.tickLand} gainDb={-3} />
      <Sfx id="alert" at={T.cardAt + 2} gainDb={-8} />
      <Sfx id="swish-up" at={T.cardAt + 10} gainDb={-5} />
      <Sfx id="whoosh-short" at={T.whip1} />
      <Sfx id="slip" at={T.bandSlip + 6} gainDb={-6} />
      <Sfx id="whoosh-short" at={T.travel + 7} gainDb={-3} />
      {[0, 4, 8, 13, 17, 22].map((d) => (
        <Sfx key={`key-${d}`} id="type-key" at={T.answer + d} gainDb={-8} />
      ))}
      <Sfx id="slip" at={T.endHit} />
      <Sfx id="tick-soft" at={T.markSlip + 6} gainDb={-3} />
    </World>
  );
};

export default A4;
