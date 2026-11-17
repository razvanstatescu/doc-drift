import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { EASE } from "../../../lib/time";
import { capPose, capRectToScreen, DAY, GrowReveal, MistBand, RealTake, type CapKey, type Rect, type SpotKey } from "../../../v4/kit";
import { PlateAmber } from "../FIX/parts";
import { AmberColumn } from "./parts";
import { T } from "./timing";

/**
 * JIRA · Jira work counts too (film 2550 to 2880, S19 and S20; video/V5.md section 5). A quick run of four real shots,
 * each 2 s or more, all at reading size (the kit's RealTake):
 *
 *   J1  0 .. 84     Jira, the epic PAY-18 "Multi-region active-passive database": the cut lands on the real click on
 *                   "To Do"; the real click on "Done"; the save's spinner at a labelled 6x; solid "Done" on "close";
 *                   then the camera pushes onto the epic's own "Decision: ADR-015." (Mist on "ADR-015.")
 *   J2  84 .. 180   carry cut: ADR-015's page grows out of the word "ADR-015" (the incoming camera starts with the
 *                   title's "ADR-015" exactly on the epic's, then lands at reading size: a push through the word).
 *                   The real crop (title, byline, Status row; never the Deciders or Owner rows): spotlight on the
 *                   Status row and Mist on "planned" on "still says it's planned"; on "gets flagged" the drift's amber
 *                   on the byline item and the real tooltip "PAY-18 moved to Done on Nov 13. Review." (S19)
 *   J3  180 .. 240  plain cut on the beat: the real Track in Jira form (summary prefilled from the flag), the real click
 *                   on "Create task" (14.447 s), the spinner at a labelled 9x, the real "Jira task created / PAY-24
 *                   tracks this change." on "Jira task" (Mist on "PAY-24 tracks this change.")
 *   J4  240 .. 330  plain cut on the beat: the real dashboard (sample data, tagged so): the rows with their real
 *                   "Possibly stale" states, big, on "every flagged page" (the amber on the state column); on "one
 *                   dashboard" the camera pulls back to tiles and rows, the final composed pose for the kit's slip
 *                   reveal into CLOSE at 330 (S20)
 * One amber per shot: the flagged byline item in J2, the column of flagged states in J4 (the drift itself, both times).
 * Masks from captures.json are always drawn; "(Development)" never shows, nor "PLAT" (the dashboard's anchor line is
 * covered), "Score" or "threshold" (J3's crop starts below the panel header), "Dana", Owner or Deciders rows.
 */

const CAP = { w: 3840, h: 2160 };
const TAKE = { creep: 1.5, float: 5 } as const;
const startAt = (f: number, to: CapKey["to"]): CapKey => ({ at: f, dur: 0, to });
const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// ---------------------------------------------------------------------------------------------------------------------
// The carried word: "ADR-015" in the epic's description (J1) and in the design page's title (J2), glyph boxes
// ---------------------------------------------------------------------------------------------------------------------

const ADR_IN_JIRA: Rect = { x: 2259, y: 480, w: 113, h: 21 };
const ADR_IN_TITLE: Rect = { x: 1481, y: 345, w: 220, h: 43 };
/**
 * The incoming camera at the seam: the smallest scale RealTake can hold without its edge clamp moving the centre
 * (0.51: the view is then the whole capture), centred on the capture. The title's "ADR-015" sits here on screen...
 */
const J2_MATCH = { cx: 1920, cy: 1080, s: 0.51 };
const ADR_SEAM: Rect = {
  x: 960 + (ADR_IN_TITLE.x - J2_MATCH.cx) * J2_MATCH.s,
  y: 540 + (ADR_IN_TITLE.y - J2_MATCH.cy) * J2_MATCH.s,
  w: ADR_IN_TITLE.w * J2_MATCH.s,
  h: ADR_IN_TITLE.h * J2_MATCH.s,
};
/** ... so the outgoing camera ends its push with the epic's "ADR-015" on that same rect (centres and widths matched). */
const J1_CARRY = (() => {
  const s = ADR_SEAM.w / ADR_IN_JIRA.w;
  const a = center(ADR_SEAM);
  const b = center(ADR_IN_JIRA);
  return { cx: b.x - (a.x - 960) / s, cy: b.y - (a.y - 540) / s, s };
})();
/** J1 and J2 share the float's seed, so both worlds float together through the seam. */
const CARRY_SEED = "jira-carry";

// ---------------------------------------------------------------------------------------------------------------------
// J1 · PAY-18 To Do to Done (p5-jira-rec)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Jira's own top bar is cut off; the breadcrumb, title, status, menu and description read at 0.8 (the view's top is
 * the capture's top, so the breadcrumb sits just under the tag; the status menu runs off the right edge, its items in).
 */
const J1_CROP: Rect = { x: 0, y: 112, w: 3840, h: 2048 };
const J1_POSE = { cx: 1866, cy: 700, s: 0.8 };
const J1_HEADER: Rect = { x: 700, y: 140, w: 2470, h: 500 };
const J1_DESC_END: Rect = { x: 2116, y: 470, w: 272, h: 40 };
const J1_CAM: CapKey[] = [
  startAt(0, J1_POSE),
  // the push onto "ADR-015": it comes to rest on the word at the seam; the page then opens out of the resting word
  { at: T.push, dur: T.carry - T.push, to: J1_CARRY, ease: EASE.expoInOut },
];
const J1_SPOT: SpotKey[] = [
  { at: 0, dur: 0, rect: J1_HEADER, amount: 0.75 },
  { at: T.push, dur: 14, rect: J1_DESC_END, amount: 0.85 },
];
const TODO_T = 2.318;
const DONE_T = 4.049;
const SOLID_T = 5.95;
/** 1x around both clicks; the menu's wait at about 1.7x (no label under 3x); the save's spinner at a labelled 6x; 1x on. */
const J1_KEYS = [
  { f: 0, t: TODO_T - T.todoClick / 30 },
  { f: T.todoClick, t: TODO_T },
  { f: T.todoClick + 5, t: TODO_T + 5 / 30 },
  { f: T.doneClick - 5, t: DONE_T - 5 / 30 },
  { f: T.doneClick, t: DONE_T },
  { f: T.doneClick + 5, t: DONE_T + 5 / 30 },
  { f: T.doneSolid - 3, t: SOLID_T - 3 / 30 },
  { f: T.doneSolid, t: SOLID_T },
  // the page is still after "Done"; this last stretch runs a touch under 1x so the recording (7.29 s) never runs out
  { f: T.carry + T.carryDur, t: 7.2 },
];

const J1: React.FC = () => (
  <RealTake
    capture="p5-jira-rec"
    time={{ keys: J1_KEYS }}
    camera={J1_CAM}
    spot={J1_SPOT}
    crop={J1_CROP}
    clicks={[
      { t: TODO_T, x: 2795, y: 262, travel: 10 },
      { t: DONE_T, x: 2932, y: 434 },
    ]}
    seed={CARRY_SEED}
    tag={{ text: "Recorded in Jira", at: 0 }}
    speed={{ x: 352, y: 56 }}
  >
    <MistBand rect={{ x: 2256, y: 476, w: 126, h: 30 }} at={T.adrMark} dur={8} />
  </RealTake>
);

// ---------------------------------------------------------------------------------------------------------------------
// J2 · ADR-015, the design page (p5-adr-flagged; p5-adr-tooltip from the tooltip on)
// ---------------------------------------------------------------------------------------------------------------------

/** Title, byline and the Status row; the crop ends on the row's bottom rule, above Date, Deciders and Owner. */
const J2_CROP: Rect = { x: 1440, y: 300, w: 1570, h: 412 };
const J2_READ = { cx: 2225, cy: 567, s: 0.97 };
const J2_CAM: CapKey[] = [
  { at: T.carry, dur: 0, to: J2_MATCH },
  // in step with the window (both expo in-out): the word holds while the page opens around it, then the push in
  { at: T.carry, dur: T.carryLand - T.carry, to: J2_READ, ease: EASE.expoInOut },
];
const TITLE: Rect = { x: 1466, y: 330, w: 1210, h: 80 };
const STATUS_ROW: Rect = { x: 1484, y: 628, w: 1500, h: 76 };
const PLANNED: Rect = { x: 2657, y: 648, w: 122, h: 38 };
/** The byline item "Possibly stale · Doc Drift" (its hover fill from 2266; the suffix after 2589 is masked). */
const PILL: Rect = { x: 2268, y: 466, w: 322, h: 36 };
const PILL_TIP: Rect = { x: 2256, y: 454, w: 516, h: 160 };
const J2_SPOT: SpotKey[] = [
  { at: T.carry, dur: 0, rect: TITLE, amount: 0.75 },
  { at: T.statusSpot, dur: 14, rect: STATUS_ROW, amount: 0.9 },
  { at: T.flagAt, dur: 10, rect: PILL_TIP, amount: 0.9 },
];

const J2: React.FC = () => {
  const frame = useCurrentFrame();
  const tip = frame >= T.tipAt;
  return (
    <RealTake
      capture={tip ? "p5-adr-tooltip" : "p5-adr-flagged"}
      camera={J2_CAM}
      spot={J2_SPOT}
      crop={J2_CROP}
      // the hovered item's grey ends under the amber (its masked suffix would leave a long empty grey pill)
      masks={tip ? [{ box: [2594, 458, 180, 50], fill: "#FFFFFF" }] : []}
      seed={CARRY_SEED}
      tag={{ text: "Recorded in Confluence", at: T.carry + 6 }}
    >
      <MistBand rect={PLANNED} at={T.plannedMark} dur={10} exitAt={T.flagAt} />
      <PlateAmber rect={PILL} at={T.flagAt} />
    </RealTake>
  );
};

/** The carry cut: J2 grows out of the word on J1 (the window), while both cameras push through the word. */
const J1toJ2: React.FC = () => {
  const from = capRectToScreen(capPose(T.carry, J1_CAM, { ...TAKE, seed: CARRY_SEED, cap: CAP }), ADR_IN_JIRA, CAP);
  return <GrowReveal at={T.carry} dur={T.carryDur} from={from} outgoing={<J1 />} incoming={<J2 />} pad={[16, 12]} darken={0.15} />;
};

// ---------------------------------------------------------------------------------------------------------------------
// J3 · Create task, "Jira task created" (p5-track-rec)
// ---------------------------------------------------------------------------------------------------------------------

/** The review panel's lower half: from "Propose fix" down (the header with its score and the affected section with
 * its people sit above y 1240 in both layouts). */
const J3_CROP: Rect = { x: 1150, y: 1240, w: 1550, h: 712 };
const J3_POSE = { cx: 1925, cy: 1593, s: 0.97 };
const FORM: Rect = { x: 1160, y: 1348, w: 1530, h: 500 };
const NOTICE: Rect = { x: 1160, y: 1518, w: 1530, h: 280 };
const PAY24: Rect = { x: 1278, y: 1722, w: 358, h: 32 };
const CREATE_T = 14.447;
const CREATED_T = 17.083;
/**
 * 1x around the click (0.27 s); the spinner's 2.4 s at a labelled ramp (secant 6.5x, so the cubic's peak stays under
 * 10x); 1x into the result, which lands on a key (17.083 s; 17.1 so the decoded frame is the notice's).
 */
const J3_KEYS = [
  { f: T.j3, t: CREATE_T - (T.createClick - T.j3) / 30 },
  { f: T.createClick - 4, t: CREATE_T - 4 / 30 },
  { f: T.createClick, t: CREATE_T },
  { f: T.createClick + 4, t: CREATE_T + 4 / 30 },
  { f: T.created - 3, t: CREATED_T - 0.1 },
  { f: T.created, t: CREATED_T + 0.017 },
  { f: T.j4, t: CREATED_T + 0.017 + (T.j4 - T.created) / 30 },
];
const J3_SPOT: SpotKey[] = [
  { at: T.j3, dur: 0, rect: FORM, amount: 0.9 },
  { at: T.created, dur: 8, rect: NOTICE, amount: 0.9 },
];

const J3: React.FC = () => (
  <RealTake
    capture="p5-track-rec"
    time={{ keys: J3_KEYS }}
    camera={[startAt(T.j3, J3_POSE)]}
    spot={J3_SPOT}
    crop={J3_CROP}
    clicks={[{ t: CREATE_T, x: 1294, y: 1820 }]}
    seed="jira-track"
    tag={{ text: "Recorded in Confluence", at: 0 }}
    speed={{ x: 440, y: 56 }}
  >
    <MistBand rect={PAY24} at={T.payMark} dur={10} />
  </RealTake>
);

// ---------------------------------------------------------------------------------------------------------------------
// J4 · the dashboard (p5-dashboard-2: sample data from the demo space)
// ---------------------------------------------------------------------------------------------------------------------

/** Two tiles (Pages anchored, Possibly stale) and the first five rows (Page, State, Severity), above the backlog. */
const J4_CROP: Rect = { x: 700, y: 290, w: 1540, h: 1360 };
/** "6 pages in PLAT are not anchored. ..." under "Anchor this space": the space key is never shown. */
const J4_MASKS = [{ box: [716, 670, 860, 38] as [number, number, number, number], fill: "#FFFFFF" }];
/** The rows big, with "Pages with drift" whole above them (the view's top at 700). */
const J4_ROWS = { cx: 1330, cy: 1257, s: 0.97 };
const J4_WHOLE = { cx: 1470, cy: 901, s: 0.7 };
const ROWS: Rect = { x: 705, y: 1036, w: 1250, h: 600 };
const STATES: Rect = { x: 1704, y: 1122, w: 226, h: 510 };
const J4_CAM: CapKey[] = [startAt(T.j4, J4_ROWS), { at: T.pull, dur: T.pullDur, to: J4_WHOLE, ease: EASE.expoInOut }];
const J4_SPOT: SpotKey[] = [
  { at: T.j4, dur: 0, rect: ROWS, amount: 0.85 },
  { at: T.pull, dur: T.pullDur, rect: J4_CROP, amount: 0 },
];

const J4: React.FC = () => (
  <RealTake
    capture="p5-dashboard-2"
    camera={J4_CAM}
    spot={J4_SPOT}
    crop={J4_CROP}
    masks={J4_MASKS}
    seed="jira-dash"
    // top right: the dashboard's text runs from the left edge of both poses, and its tiles start below this line
    tag={{ text: "Sample data from the demo space", at: T.j4, x: 1428, y: 56 }}
  >
    {/* the scene's second shot with the drift's amber: every flagged page's state, on "flagged" (it leaves on the pull,
        so the final pose hands CLOSE a calm frame) */}
    <AmberColumn rect={STATES} at={T.stateMark} out={T.pull} />
  </RealTake>
);

// ---------------------------------------------------------------------------------------------------------------------
// The scene
// ---------------------------------------------------------------------------------------------------------------------

const JIRA: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.j3) shot = <J1toJ2 />;
  else if (frame < T.j4) shot = <J3 />;
  else shot = <J4 />;
  return (
    <AbsoluteFill style={{ background: DAY.surface }}>
      {shot}
      {/* FIX's ring tails over the cut (the L-cut): the same chime, from where FIX's Sequence clipped it */}
      <Sfx id="chime-soft" at={-9} gainDb={-6} />
      {/* S19: the real clicks (the first one is the cut's accent: we cut on it); the carry; the flag */}
      <Sfx id="click" at={T.todoClick} gainDb={-3} />
      <Sfx id="click" at={T.doneClick} gainDb={-2} />
      {/* the page opens out of the word: a round pop on the grow's fastest frame, which falls on "design" */}
      <Sfx id="pop" at={T.carry + 9} gainDb={-4} />
      <Sfx id="tick" at={T.flagAt + 3} gainDb={-5} />
      {/* S20: the real Create task click; the cut to the dashboard on the beat */}
      <Sfx id="click" at={T.createClick} gainDb={-2} />
      <Sfx id="tick-soft" at={T.j4} gainDb={-5} />
    </AbsoluteFill>
  );
};

export default JIRA;
