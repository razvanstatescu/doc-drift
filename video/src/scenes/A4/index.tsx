import React, { useId } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { AlertStation } from "../../components/A1/AlertStation";
import { EndCardDay, END } from "../../components/A4/EndCardDay";
import { SlipToDay } from "../../components/A4/SlipToDay";
import { turnTravel } from "../../components/A1/moves";
import { EASE } from "../../lib/time";
import { getScene } from "../../lib/timeline";
import { Camera3D, cam3At, DirBlur, Stage, WhipBlur, type Cam3Key } from "../../v4/kit";
import { AgentPanelTwin, PageTwin, pageRects, textWidth, type PageTwinProps } from "../../v4/twins";

/**
 * A4 · Close (film 4177 to 4657). V4.md section 6. Local frames, all from the narration cues and the endHit marker:
 *
 *   0          opens composed in Night under P5's slip cut: A1's clock rolls in again (already rolling), on 03:06,
 *              framed close as in A1; the minute ticks to 03:07 on "3" and the alert card lifts with it, the camera
 *              tilts down to the whole composition and pushes in slowly, as in A1                             (V24)
 *   "runbook"  whip (as in A1) to the runbook, landing on step 2 where A1's travel ended: the Steps band slips one
 *              unit in amber, hands the amber up to the byline on "tells" ("Possibly stale · Doc Drift", the one
 *              amber), and the camera rises with it (the mirror of A1's travel down), landing on "you"
 *   "and"      a whip-travel across the room to the generic assistant: the same question, and the answer is the
 *              caveat instead of the old step; on "before" the camera pulls back so the flagged page (above step 2)
 *              and the answer share the frame at 1:1
 *   endHit     the last slip into Day: three bands, the middle band's slip lands on endHit (the score's final hit),
 *              the bands clear, and the end card is behind them: the tile's band slips into place (the one amber),
 *              the name sets before "Doc Drift Sentinel"; the camera pulls back from the lockup as "Catch the slip /
 *              before your agents do." rises word by word with V25, then the credit. Creep to the last frame.   (V25)
 */
const sc = getScene("A4");

const endHit = sc.marker("endHit");
const v25 = sc.line("V25").words;
export const A4_T = {
  /** The clock rolls in again as in A1 (already rolling under P5's slip cut), landing on 03:06. */
  rollAt: -4,
  rollLand: 24,
  /** The minute drum ticks 6 to 7 and lands 2 frames before "3"; the alert fires at 03:07, so the card lifts with it. */
  tickAt: sc.wordAt("V24", "3") - 12,
  tickLand: sc.wordAt("V24", "3") - 2,
  cardAt: sc.wordAt("V24", "3") - 8,
  /** The whip's seam on the beat at "runbook". */
  whip1: sc.snap(sc.wordAt("V24", "runbook")),
  /**
   * The whip lands on step 2 (where A1's travel ended): on "runbook" the Steps band slips one unit in amber, on "tells"
   * it hands the amber up to the byline item ("Possibly stale · Doc Drift"), and the camera rises with it, landing on
   * the byline on "you".
   */
  bandSlip: sc.wordAt("V24", "runbook") + 3,
  handoff: sc.wordAt("V24", "tells"),
  rise: sc.wordAt("V24", "runbook") + 5,
  /** The travel to the assistant: its fastest frame sits just before "and". */
  travel: sc.wordAt("V24", "and") - 10,
  /** The question types while the camera travels (so the panel's edge shows no clipped words before); the caveat
   * streams from "and" at 140 characters a second. */
  ask: sc.wordAt("V24", "and") - 12,
  answer: sc.wordAt("V24", "and"),
  pullBack: sc.wordAt("V24", "before") + 6,
  endHit,
  /** After the Night bands clear, the tile's band slips into place (amber). */
  markSlip: endHit + 16,
  name: endHit + 22,
  camOut: sc.wordAt("V25", "sentinel", "to") - 4,
  words: v25.slice(3).map((w) => w.from - 2),
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
 * The assistant stands in front of the page's upper right corner: it overlaps only the empty right side of the header
 * (the title, byline and table text end before it) and stops above step 2, whose slipped line runs further right.
 * So the final pose holds both readers at 1:1: the byline at 27 px, the answer at 34 px.
 */
const PANEL = { x: 980, y: 120, width: 840, size: 34 } as const;

const cx = (r: { x: number; w: number }) => r.x + r.w / 2;
const cy = (r: { y: number; h: number }) => r.y + r.h / 2;

/** Where A1's travel ended: step 2's command. */
const STEP2 = { x: cx(R.card), y: cy(R.step2Code), zoom: 1.4 };
const BYLINE = { x: cx(R.card), y: cy(R.byline) + 50, zoom: 1.3 };
const AGENT = { x: PANEL.x + PANEL.width / 2, y: PANEL.y + 250, zoom: 1.18 };
const BOTH = { x: (R.card.x + PANEL.x + PANEL.width) / 2, y: 500, zoom: 1 };

const ROOM_KEYS: Cam3Key[] = [
  // the mirror of A1: from step 2 the camera rises to the flagged byline (tipping forward on the way)
  ...turnTravel(T.rise, 18, STEP2, BYLINE, { pitch: -5 }),
  // a whip-travel across the room to the assistant (turning on the way), smeared by its speed
  ...turnTravel(T.travel, 14, BYLINE, AGENT, { yaw: 7 }),
  // the pull back: the page and the answer share the frame
  { at: T.pullBack, dur: 30, to: BOTH, ease: EASE.expoInOut },
];
const ROOM_OPTS = { base: STEP2, seed: "room" } as const;

const Room: React.FC = () => {
  const frame = useCurrentFrame();
  const id = "room" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  // a horizontal smear while the camera whips to the assistant (scaled by its screen speed)
  const a = cam3At(frame - 0.5, ROOM_KEYS, ROOM_OPTS);
  const b = cam3At(frame + 0.5, ROOM_KEYS, ROOM_OPTS);
  const speed = Math.abs(b.x - a.x) * b.zoom;
  const blur = Math.min(30, speed * 0.05);
  return (
    <Stage world="night" motif="tide" light={["40%", "34%"]} tide={{ top: 840, bottom: 1110, count: 7 }}>
      <DirBlur id={id} x={blur} />
      <AbsoluteFill style={{ filter: blur > 0.3 ? `url(#${id})` : undefined }}>
        <Camera3D keys={ROOM_KEYS} {...ROOM_OPTS}>
          <PageTwin {...PAGE} />
          <AgentPanelTwin
            world="night"
            variant="generic"
            question={{ text: "How do I roll back payments-api?", at: T.ask, typeDur: 10 }}
            answer={{
              lines: ["Payments rollback runbook is **Possibly stale**.", "What it describes changed in PR #482, after it was last verified."],
              at: T.answer,
              cps: 140,
            }}
            source={{ text: "Payments rollback runbook", at: T.answer + 26 }}
            x={PANEL.x}
            y={PANEL.y}
            width={PANEL.width}
            size={PANEL.size}
            elev={4}
          />
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
  { at: T.name - 2, dur: 20, to: { x: 960 }, ease: EASE.expoInOut },
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
      tiltAt={T.cardAt - 4}
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
