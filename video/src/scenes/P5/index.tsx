import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { DAY, FONT } from "../../brand/tokens";
import { modalCovers, PILL, ProductStage, WhipIn, type Cam, type Layer } from "../../components/P1/stage";
import { getScene } from "../../lib/timeline";

/**
 * P5 · Scale (Day, real). Four quick real shots, cut on beats:
 *
 *   0      the whip from P4 lands in Jira: the epic PAY-18's status To Do -> Done, in a close framing on the
 *          status menu (p5-jira-rec; the PAY workflow has no Won't Do, so the epic went to Done)         (V23)
 *   b3     ADR-015, anchored to PAY-18, now Possibly stale; the real tooltip: "PAY-18 moved to Done on Nov 13.
 *          Review." (p5-adr-tooltip; flagged 9 s after the change)
 *   b7     the PLAT Drift dashboard on "every space", labelled "Sample data from the demo space" from its first
 *          frame (p5-dashboard), 2 s
 *   b11    Track in Jira on ADR-015's review: the form (project, prefilled summary), the cursor clicks Create task,
 *          "Jira task created" (PAY-24), the final pose; A4 hard-cuts in (p5-track-rec)
 */
const sc = getScene("P5");

export const P5_T = {
  statusClick: 14,
  doneClick: 26,
  adr: sc.beat(3),
  dash: sc.beat(7),
  track: sc.beat(11),
  taskClick: sc.beat(11) + 18,
  created: sc.beat(11) + 20,
  end: sc.durationInFrames,
};
const T = P5_T;

// ---- Jira (p5-jira.mp4: "To Do" 2.318 s at (2795, 262); the menu y 310-650 ("In Progress", "Done", "View workflow",
// "Explain workflow"); "Done" 4.049 s at (2932, 434); the button settles on a green Done at 6.2 s). A close framing
// (52 px text): the status and its menu, Agents, "Improve Epic" and the details' Assignee and Reporter. The seed
// label row (y 676, "dds-demo") and the watch and share buttons (y 138-201) stay out of view. After Done the toolbar
// reflows ("✓ Done" joins it) and "Improve Epic" runs past the right edge: no framing between those rows holds both.
const JIRA_CAM: Cam[] = [{ frame: 0, x: 3125, y: 432, s: 1.84, dur: 0 }];
// The real cursor crosses the Details header at 2.0 s (a one-frame hover highlight): 1.88 s goes straight to 2.25 s
// (with the 0.04 s by which @remotion/media lands later in the take than ffmpeg's -ss).
// The status button's load (4.2-6.2 s) is compressed into 5 frames.
const JIRA_TIME: [number, number][] = [
  [0, 1.55],
  [T.statusClick - 2, 1.88],
  [T.statusClick - 1, 2.25],
  [T.statusClick + 1, 2.45],
  [T.statusClick + 3, 2.9],
  [T.doneClick - 1, 3.95],
  [T.doneClick + 1, 4.15],
  [T.doneClick + 6, 6.25],
  [T.adr, 7.0],
];
const JIRA_CURSOR = [
  { frame: 2, x: 3300, y: 600 },
  { frame: T.statusClick, x: 2795, y: 262, click: true, cursor: "pointer" },
  { frame: T.doneClick, x: 2932, y: 434, click: true, cursor: "pointer" },
];
const Jira: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <ProductStage label="Jira" cam={JIRA_CAM} layers={[{ id: "p5-jira-rec", from: -10000, time: JIRA_TIME }]} cursor={JIRA_CURSOR} cursorShow={2} cursorHide={T.doneClick + 10} />
  </AbsoluteFill>
);

// ---- ADR-015 with the tooltip (title x 1481-2654 at y 345-398; hover pill 2266-2768; tooltip 2277-2756 x 524-603;
// rows: Status 651 (its text runs to x 2799), Date 741, Deciders 830, Owner 916). The title and the rows' text need
// s <= 1.19; the frame ends just above the seed Deciders row (invented names), so it keeps some page above the title.
const ADR_LAYERS: Layer[] = [
  {
    id: "p5-adr-tooltip",
    from: -10000,
    loggedMasks: false,
    covers: [
      { box: [323, 1645, 206, 42], fill: "#FFFFFF", why: "Development install suffix (logged)" },
      { box: [2589, 465, 176, 37], fill: PILL, why: "Development install suffix (logged), on the hover pill" },
    ],
  },
];
const Adr: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <ProductStage label="Confluence" cam={[{ frame: 0, x: 2140, y: 472, s: 1.19, dur: 0 }]} layers={ADR_LAYERS} cursor={[{ frame: 0, x: 2517, y: 492, cursor: "pointer" }]} />
  </AbsoluteFill>
);

// ---- the dashboard (title y 174; "Drift in PLAT" 312; KPI cards y 460-686 at x 720-1456, 1482-2216, 2242-2878,
// 2902-3760; Anchor this space 784; Pages with drift 952). Framed on the title, the heading, its line (29 px) and the
// first two KPI cards whole. The selected sidebar item is light blue, so its logged cover takes that colour.
const DASH_LAYERS: Layer[] = [
  {
    id: "p5-dashboard",
    from: -10000,
    loggedMasks: false,
    covers: [
      { box: [323, 1389, 206, 42], fill: "rgb(235,242,253)", why: "Development install suffix (logged), on the selected item" },
      { box: [1069, 140, 333, 67], fill: "#FFFFFF", why: "Development install suffix (logged)" },
    ],
  },
];
/** The honesty note for the dashboard's numbers: on screen from the shot's first frame, still. */
const SampleLabel: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: 52,
      top: 30,
      padding: "10px 22px 12px",
      borderRadius: 999,
      background: DAY.surfaceSunk,
      boxShadow: `0 0 0 1px ${DAY.line}`,
      fontFamily: FONT.sans,
      fontWeight: 500,
      fontSize: 30,
      lineHeight: "38px",
      color: DAY.textMuted,
    }}
  >
    Sample data from the demo space
  </div>
);
const Dashboard: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <ProductStage label="Confluence" cam={[{ frame: 0, x: 1460, y: 500, s: 1.05, dur: 0 }]} layers={DASH_LAYERS} overlay={<SampleLabel />} />
  </AbsoluteFill>
);

// ---- Track in Jira (p5-track.mp4): the form has settled at 13.3 s ("Track in Jira" y 1361, project 1532-1611,
// summary 1684-1763, Create task / Cancel 1809-1829); Create task 14.447 s at (1294, 1820); "Jira task created" at
// 17.45 s (Proposed fix 1314, Track in Jira 1531, banner 1664-1751, footer 1836-1899). The modal ends at y 2039 with
// the form and at 1949 after it: the form is framed to y 1923, and the cut to the result (with the content's own
// jump) frames "Proposed fix" to the footer, both clear of the dimmed page.
const TRACK_TIME: [number, number][] = [
  [T.track, 13.3],
  [T.taskClick - 1, 14.4],
  [T.taskClick + 1, 14.5],
  [T.created, 17.45],
  [T.end, 19.8],
];
const TRACK_LAYERS: Layer[] = [{ id: "p5-track-rec", from: T.track, time: TRACK_TIME, loggedMasks: false, covers: modalCovers("p5-track-rec") }];
const TRACK_CURSOR = [
  { frame: T.track, x: 1780, y: 1880 },
  { frame: T.taskClick, x: 1294, y: 1820, click: true, cursor: "pointer" },
];
const Track: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <ProductStage
      label="Confluence"
      cam={[
        // the form: "Proposed fix" to Create task, its fields whole (x 1169-2645), the modal's footer below the frame
        { frame: 0, x: 1907, y: 1525, s: 1.06, dur: 0 },
        // the result: "Proposed fix" to the footer, between the affected-section text (to y 1229) and the modal's end
        { frame: T.created, x: 1803, y: 1591, s: 1.21, dur: 0 },
      ]}
      layers={TRACK_LAYERS}
      cursor={TRACK_CURSOR}
      cursorShow={T.track}
      cursorHide={T.taskClick + 10}
    />
  </AbsoluteFill>
);

const P5: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.adr)
    shot = (
      <WhipIn>
        <Jira />
      </WhipIn>
    );
  else if (frame < T.dash) shot = <Adr />;
  else if (frame < T.track) shot = <Dashboard />;
  else shot = <Track />;
  return (
    <World theme="day">
      {shot}
      <Sfx id="click" at={T.statusClick} gainDb={-3} />
      <Sfx id="click" at={T.doneClick} gainDb={-3} />
      <Sfx id="tick" at={T.adr} gainDb={-3} />
      <Sfx id="tick" at={T.dash} gainDb={-3} />
      <Sfx id="tick" at={T.track} gainDb={-3} />
      <Sfx id="click" at={T.taskClick} gainDb={-3} />
      <Sfx id="pop" at={T.created} />
    </World>
  );
};

export default P5;
