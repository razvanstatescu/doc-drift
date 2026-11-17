import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { EASE, tween } from "../../../lib/time";
import { toolOutput } from "../../../lib/captures";
import { textWidth } from "../../../v4/twins/metrics";
import { capPose, capRectToScreen, DAY, MistBand, RealTake, TypeToUI, type CapKey, type Rect, type SpotKey } from "../../../v4/kit";
import { AgentChips, OutputLine, PlateAmber } from "./parts";
import { T } from "./timing";

/**
 * FIX · a person fixes it (film 2100 to 2550, S16 to S18; video/V5.md section 5). A quick run into a station, then the
 * held resolution. Four shots, all real captures at reading size (the kit's RealTake), cut on beats:
 *
 *   F1  0 .. 90     the real runbook header, flagged (the one amber on its byline item); on "never agents" the two
 *                   agent chips set beside the page, "Read only"                                               (S16)
 *   F2  90 .. 180   the real Quick fix card (p4-review-rec 37.3 to 41.6 s): the real click on "Replace in 1 place" on
 *                   "one click" (1x), the Mist on "No AI used." on "no AI", the spinner at a labelled 6x, then the real
 *                   result at 1x ("Replaced ... in 1 place."); "No AI used." leaves the frame with the panel's scroll
 *   F3  180 .. 345  the real draft (p4-draft-diff, matched to p4-accept-rec at 11.7 s, the same pixels 313 px apart,
 *                   so the switch is invisible): the step's line red and green on "drafts other edits", the Mist on
 *                   "Nothing changes until you accept." on "Nothing changes"; then the real click on "Accept fix"
 *                   (12.373 s) on "accepts", and the spinner at a labelled 5x. Rovo's confirmation step is not shown
 *                                                                                                              (S17)
 *   F4  345 .. 450  the held resolution on the header again: the flagged byline with its amber; on the score's hit
 *                   the amber leaves and the real byline reads "Verified · Doc Drift" (p4-verified); "Verified." rises
 *                   on its word and flies onto the real word (the kit's TypeToUI: type becomes UI); on "Now agents can
 *                   cite it" the real checkVerified line, "Safe to cite." marked on "cite"; a ring tails into JIRA
 *                                                                                                              (S18)
 * Every shot opens composed (the camera's first key has dur 0, the spotlight is on from the first frame); the proof
 * tag stays put across the four shots (one tag, never re-animated at a cut).
 */

const TAG = "Recorded in Confluence";
const CAP = { w: 3840, h: 2160 };
const TAKE = { creep: 1.5, float: 5 } as const;
/** The speed label sits right of the tag (never over the spotlit card). */
const SPEED = { x: 440, y: 56 };
/** A camera that starts on a pose at the shot's first frame (dur 0: the first frame is already on the pose). */
const startAt = (f: number, to: CapKey["to"]): CapKey => ({ at: f, dur: 0, to });
/** The tag, shown from the scene's start, so it stays put through the cuts. */
const tag = { text: TAG, at: 2 };

// ---------------------------------------------------------------------------------------------------------------------
// The runbook's header (F1 and F4): the title and the byline, cropped above the page's table (its rows name people)
// ---------------------------------------------------------------------------------------------------------------------

const HEADER_CROP: Rect = { x: 1400, y: 300, w: 1640, h: 300 };
const HEADER_POSE = { cx: 2140, cy: 560, s: 0.92 };
/** The flagged byline item in p2-flagged ("Possibly stale · Doc Drift", its icon included). */
const FLAGGED_ITEM: Rect = { x: 2283, y: 470, w: 309, h: 30 };
/** The Verified item in p4-verified, and its word "Verified" (glyphs 2394 to 2479, cap top 474, baseline 492). */
const VERIFIED_ITEM: Rect = { x: 2362, y: 470, w: 244, h: 30 };
const VERIFIED_WORD: Rect = { x: 2394, y: 474, w: 86, h: 18 };
/** The author, "By Razvan Statescu" with the avatar (S16 "People"). */
const AUTHOR: Rect = { x: 1482, y: 456, w: 290, h: 56 };
const HEADER_ALL: Rect = { x: 1460, y: 318, w: 1340, h: 214 };

const F1_CAM: CapKey[] = [startAt(0, HEADER_POSE)];
const F1_SPOT: SpotKey[] = [
  { at: 0, dur: 10, rect: AUTHOR, amount: 0.9 },
  // "People" lights the author; on "fix the page" the window opens to the whole header
  { at: T.people + 12, dur: 14, rect: HEADER_ALL, amount: 0.9 },
];

/** F1: the real header, flagged; the agents beside it, read only. */
const F1: React.FC = () => (
  <RealTake
    capture="p2-flagged"
    camera={F1_CAM}
    spot={F1_SPOT}
    crop={HEADER_CROP}
    seed="fix-header"
    tag={tag}
    overlay={<AgentChips at={T.chipsIn} x={352} y={700} />}
  >
    <PlateAmber rect={FLAGGED_ITEM} />
  </RealTake>
);

// ---------------------------------------------------------------------------------------------------------------------
// F2 · the real Quick fix (p4-review-rec): the click at 38.308 s, "No AI used.", the result at 41.15 s
// ---------------------------------------------------------------------------------------------------------------------

/** The Quick fix card before the result; the result notice after the panel's scroll (41.15 s). */
const QF_CARD: Rect = { x: 1150, y: 1326, w: 1540, h: 326 };
const QF_RESULT: Rect = { x: 1150, y: 1648, w: 1540, h: 272 };
const NO_AI: Rect = { x: 1494, y: 1499, w: 134, h: 30 };
/** The modal's scrim over the page (measured 140, 144, 152): masks that sit on it are filled with it, not white. */
const SCRIM = "rgb(140, 144, 152)";
/** The panel's own scroll at the result (measured: every line moves up 730 px between 41.13 and 41.15 s). */
const QF_SCROLL = 730;
const QF_RESULT_T = 41.167;
/** 1x through the click and into "no AI"; the spinner at a labelled ramp; 1x into the result. */
const F2_RAMP = T.qfResult - 18;
const F2_KEYS = [
  { f: T.f2, t: 38.308 - (T.qfClick - T.f2) / 30 },
  { f: T.qfClick, t: 38.308 },
  { f: F2_RAMP, t: 38.308 + (F2_RAMP - T.qfClick) / 30 },
  { f: T.qfResult - 4, t: QF_RESULT_T - 4 / 30 },
  { f: T.qfResult, t: QF_RESULT_T },
  { f: T.f3, t: QF_RESULT_T + (T.f3 - T.qfResult) / 30 },
];
/**
 * One pose for the card; on the result the camera takes the recording's jump (it moves up by the scroll on that very
 * frame, so the picture does not change) and then pans down to the result: the jump becomes a scroll. Creep is off in
 * this take so the compensation is exact (the float keeps it alive).
 */
const F2_POSE = { cx: 1920, cy: 1540, s: 0.97 };
const F2_CAM: CapKey[] = [
  startAt(T.f2, F2_POSE),
  { at: T.qfResult, dur: 0, to: { cy: F2_POSE.cy - QF_SCROLL } },
  { at: T.qfResult, dur: 12, to: { cy: 1593 }, ease: EASE.expoInOut },
];
const F2_SPOT: SpotKey[] = [
  { at: T.f2, dur: 0, rect: QF_CARD, amount: 1 },
  { at: T.qfResult, dur: 0, rect: { ...QF_CARD, y: QF_CARD.y - QF_SCROLL }, amount: 1 },
  { at: T.qfResult, dur: 12, rect: QF_RESULT, amount: 1 },
];

const F2Mist: React.FC = () => {
  const frame = useCurrentFrame();
  const rect = frame < T.qfResult ? NO_AI : { ...NO_AI, y: NO_AI.y - QF_SCROLL };
  return <MistBand rect={rect} at={T.noAi} dur={10} exitAt={T.qfResult + 8} />;
};

const F2: React.FC = () => (
  <RealTake
    capture="p4-review-rec"
    time={{ keys: F2_KEYS }}
    camera={F2_CAM}
    spot={F2_SPOT}
    clicks={[{ t: 38.308, x: 1337, y: 1577 }]}
    // the byline item's suffix shows through the scrim right of the modal here too (408 px down in this recording)
    masks={[{ box: [2719, 403, 134, 48], fill: SCRIM }]}
    seed="fix-qf"
    creep={0}
    tag={tag}
    speed={SPEED}
  >
    {/* the band rides the panel's scroll (the line is 730 px higher in the capture after the jump) */}
    <F2Mist />
  </RealTake>
);

// ---------------------------------------------------------------------------------------------------------------------
// F3 · the real draft and the real Accept: p4-draft-diff, then p4-accept-rec (the same pixels 313 px higher)
// ---------------------------------------------------------------------------------------------------------------------

/** The accept recording at 11.6 s equals p4-draft-diff shifted up by 313 px (measured: no pixel differs by 40). */
const SHIFT = 313;
const up = (r: Rect): Rect => ({ ...r, y: r.y - SHIFT });
const DRAFT_LINES: Rect = { x: 1180, y: 796, w: 1480, h: 192 };
const DRAFTED: Rect = { x: 1180, y: 1072, w: 880, h: 52 };
const NOTHING: Rect = { x: 1656, y: 1084, w: 386, h: 28 };
const FOOTER: Rect = { x: 1150, y: 1848, w: 900, h: 152 };
/**
 * The page's byline item shows through the modal's scrim just right of the modal, with its "(Development)" suffix:
 * p4-draft-diff's own mask paints it white (a white bar on the grey scrim) and p4-accept-rec has none. Cover it with
 * the scrim's own grey (measured 140, 144, 152), from the modal's edge (2721) on.
 */
const SCRIM_MASK = [{ box: [2721, 460, 132, 48] as [number, number, number, number], fill: SCRIM }];
/** Where the take changes source (invisible). */
const F3_SWAP = T.nothing + 30;
const F3_CAM_D: CapKey[] = [
  startAt(T.f3, { cx: 1930, cy: 960, s: 0.94 }),
  // a slow push onto the drafted lines on "drafts other edits"
  { at: T.drafts - 6, dur: 30, to: { cx: 1910, cy: 940, s: 0.99 } },
];
const F3_CAM_A: CapKey[] = [
  ...F3_CAM_D.map((k) => ({ ...k, to: { ...k.to, cy: (k.to.cy ?? 0) - SHIFT } })),
  // down to the footer for the click on "accepts" (3 s after the push)
  { at: F3_SWAP + 6, dur: 16, to: { cx: 1720, cy: 1700, s: 0.96 } },
];
const F3_SPOT_D: SpotKey[] = [
  { at: T.f3, dur: 0, rect: DRAFT_LINES, amount: 1 },
  { at: T.nothing - 6, dur: 14, rect: DRAFTED, amount: 1 },
];
const F3_SPOT_A: SpotKey[] = [...F3_SPOT_D.map((k) => ({ ...k, rect: up(k.rect) })), { at: F3_SWAP + 8, dur: 14, rect: FOOTER, amount: 1 }];
/** The accept recording: held still (nothing moves in it from 11.0 to 12.3 s), 1x through the click, the spinner at 5x. */
const F3_KEYS = [
  { f: F3_SWAP, t: 11.7 },
  { f: T.acceptClick - 5, t: 12.373 - 5 / 30 },
  { f: T.acceptClick, t: 12.373 },
  { f: T.acceptClick + 5, t: 12.373 + 5 / 30 },
  { f: T.f4 - 8, t: 16.3 },
  { f: T.f4, t: 16.3 + 8 / 30 },
];

const F3: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < F3_SWAP)
    return (
      <RealTake capture="p4-draft-diff" camera={F3_CAM_D} spot={F3_SPOT_D} masks={SCRIM_MASK} seed="fix-draft" tag={tag}>
        <MistBand rect={NOTHING} at={T.nothing - 4} dur={10} />
      </RealTake>
    );
  return (
    <RealTake
      capture="p4-accept-rec"
      time={{ keys: F3_KEYS }}
      camera={F3_CAM_A}
      spot={F3_SPOT_A}
      masks={SCRIM_MASK}
      clicks={[{ t: 12.373, x: 1929, y: 1894 }]}
      seed="fix-draft"
      tag={tag}
      speed={SPEED}
    >
      <MistBand rect={up(NOTHING)} at={T.nothing - 4} dur={10} />
    </RealTake>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// F4 · the held resolution
// ---------------------------------------------------------------------------------------------------------------------

const F4_CAM: CapKey[] = [startAt(T.f4, HEADER_POSE)];
const F4_SPOT: SpotKey[] = [{ at: T.f4, dur: 0, rect: HEADER_ALL, amount: 0.7 }];

/**
 * "Verified." lands on the real byline's word: the kit's TypeToUI flies a text box onto `to`, the UI slot's own text
 * box. The slot is the real word "Verified" where it sits on screen at the landing; the type's size makes Spline Sans'
 * "Verified" (400, the UI's weight) as wide as the real word, and the box is placed so the two caps share their centre
 * (Spline Sans in TypeToUI's 1.25 line box, measured on frame 366: cap top 0.258 em, cap height 0.733 em). The flying
 * words dissolve into the real word over the landing's last 4 frames (TypeLanding).
 */
const WORD_ON_SCREEN = capRectToScreen(capPose(T.typeLand, F4_CAM, { ...TAKE, seed: "fix-header", cap: CAP }), VERIFIED_WORD, CAP);
const UI_SIZE = (WORD_ON_SCREEN.w / textWidth("Verified", { size: 100, weight: 400 })) * 100;
const CAP_MID = 0.258 + 0.733 / 2;
const TYPE_FROM = { x: 352, y: 590, size: 120, weight: 600, tracking: -0.03 };
const TYPE_TO = { x: WORD_ON_SCREEN.x, y: WORD_ON_SCREEN.y + WORD_ON_SCREEN.h / 2 - CAP_MID * UI_SIZE, size: UI_SIZE, weight: 400, tracking: 0 };

const TypeLanding: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = 1 - tween(frame, T.typeLand - 4, T.typeLand + 1, 0, 1, EASE.linear);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      <TypeToUI text="Verified." at={T.typeAt} dock={T.typeDock} dur={T.typeDur} from={TYPE_FROM} to={TYPE_TO} />
    </div>
  );
};

/** The real checkVerified guidance, verbatim, split around "Safe to cite.". */
const GUIDANCE = JSON.stringify(String((toolOutput("checkVerified") as { output: { guidance: string } }).output.guidance));
const FOCUS = "Safe to cite.";
if (!GUIDANCE.includes(FOCUS)) throw new Error("FIX: checkVerified's guidance no longer says \"Safe to cite.\"; check the line");
const PRE = GUIDANCE.slice(0, GUIDANCE.indexOf(FOCUS));

const F4: React.FC = () => {
  const frame = useCurrentFrame();
  const flagged = frame < T.hit;
  const overlay = (
    <>
      <TypeLanding />
      <OutputLine at={T.outIn} mark={T.cite - 4} x={352} y={700} pre={PRE} focus={FOCUS} />
    </>
  );
  return (
    <RealTake
      capture={flagged ? "p2-flagged" : "p4-verified"}
      camera={F4_CAM}
      spot={F4_SPOT}
      crop={HEADER_CROP}
      seed="fix-header"
      tag={tag}
      overlay={overlay}
    >
      {/* the drift's amber, then (on the hit) it leaves by a wipe off the now Verified item */}
      <PlateAmber rect={flagged ? FLAGGED_ITEM : VERIFIED_ITEM} out={T.hit} />
    </RealTake>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The scene
// ---------------------------------------------------------------------------------------------------------------------

const FIX: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.f2) shot = <F1 />;
  else if (frame < T.f3) shot = <F2 />;
  else if (frame < T.f4) shot = <F3 />;
  else shot = <F4 />;
  return (
    <AbsoluteFill style={{ background: DAY.surface }}>
      {shot}
      {/* S16: the chips land; the cut on the beat; the real click (the cut in is the kit's slip push, with its own sound) */}
      <Sfx id="pop" at={T.chipsIn + 3} gainDb={-6} />
      <Sfx id="tick-soft" at={T.f2} gainDb={-6} />
      <Sfx id="click" at={T.qfClick} gainDb={-2} />
      {/* S17: the real Accept click */}
      <Sfx id="click" at={T.acceptClick} gainDb={-2} />
      {/* S18: the cut to the header; the snap on the score's hit (the film's one snap); the type lands; the ring that
          tails into JIRA (an L-cut: JIRA plays the same chime from its frame -9, so the cut never clips it) */}
      <Sfx id="tick-soft" at={T.f4} gainDb={-6} />
      <Sfx id="snap" at={T.hit} gainDb={-2} />
      <Sfx id="tick" at={T.typeLand} gainDb={-6} />
      <Sfx id="chime-soft" at={T.ring} gainDb={-6} />
    </AbsoluteFill>
  );
};

export default FIX;
