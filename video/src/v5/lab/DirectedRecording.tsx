import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { Cursor } from "../../components/Cursor";
import { EASE, tween } from "../../lib/time";
import { InkLabel, LabelSwap, Lift, WhipBlur } from "../../v4/kit";
import { DAY, FONT } from "../../v4/look";
import {
  Bed,
  Card,
  CaptureWorld,
  capPose,
  capRectToScreen,
  rateAt,
  remap,
  screenScale,
  Spotlight,
  spotAt,
  type CapKey,
  type RemapKey,
  type SpotKey,
  VideoAt,
} from "./common";

/**
 * R6 prototype 1 · The directed recording (v5 technique "Direct the real recording").
 *
 * The real merge of PR #482 at FULL SIZE, one continuous shot, then the real flagged page, in 10 s:
 *   - a camera that picks the detail on the real UI (log-space zoom, never past 1 film px per capture px),
 *   - a spotlight that veils, softens and drains the rest of the frame,
 *   - a speed ramp over the 7 s server wait (7x, labelled), and 1x around every click,
 *   - the ramp also places the two REAL clicks and the real "Merged" on beats of the score,
 *   - the kit's cursor only at the recorded click points and times,
 *   - an honest clock (seconds since the merge click, in real time) carried across the seam to the page, landing
 *     on 19 s (measured: the byline was written 18.6 s after the click) as the spotlight finds "Possibly stale".
 * Lab frames sit on the film's grid from film frame 2077: beats on multiples of 15, bars on 0, 60, 120, 180, 240.
 */

export const DR_DUR = 300;

/** Output frame -> source second of captures/p2-merge.mp4. Measured events: Merge click 2.523 s, dialog 2.72 to 2.80,
 *  confirm click 5.178, dialog gone 5.48, "Merge in progress" 5.83, "Merged" 12.70 (green banner and lozenge). */
const REMAP: RemapKey[] = [
  { f: 0, t: 1.023 },
  { f: 45, t: 2.523 }, // click 1 on beat 3
  { f: 56, t: 2.89 },
  { f: 78, t: 4.778 }, // the cursor's travel, about 2.6x
  { f: 90, t: 5.178 }, // click 2 (confirm) on beat 6
  { f: 100, t: 5.511 },
  { f: 105, t: 5.95 },
  { f: 132, t: 12.55 }, // the server wait, about 7x
  { f: 135, t: 12.7 }, // "Merged" on beat 9
  { f: 180, t: 14.2 },
  { f: 192, t: 14.6 },
];
const CLICK1 = 45;
const CLICK2 = 90;
const MERGED = 135;
const SEAM = 184; // the whip's seam (whoosh peak)
const LAND = 210; // the clock lands on 19 s, the spotlight on the badge (beat 14)

const REC_CAM: CapKey[] = [
  { at: 0, to: { cx: 1920, cy: 1080, s: 0.54 } },
  { at: 4, dur: 36, to: { cx: 2240, cy: 700, s: 0.66 }, ease: EASE.expoInOut }, // toward the header: title and Merge
  { at: 47, dur: 20, to: { cx: 1920, cy: 640, s: 0.86 } }, // the dialog
  { at: 70, dur: 18, to: { cx: 2140, cy: 830, s: 1.0 } }, // detail, 1:1: the confirm button
  { at: 94, dur: 22, to: { cx: 1860, cy: 800, s: 0.7 } }, // back out: header and the banner
  { at: 126, dur: 24, to: { cx: 1560, cy: 590, s: 0.94 } }, // push onto "Merged"
];
const REC_SPOT: SpotKey[] = [
  { at: 0, rect: { x: 0, y: 0, w: 3840, h: 2160 }, amount: 0 },
  { at: 10, dur: 26, rect: { x: 690, y: 170, w: 3150, h: 260 }, amount: 1 }, // the PR header row
  { at: 49, dur: 12, rect: { x: 1310, y: 110, w: 1220, h: 900 }, amount: 1 }, // the dialog
  { at: 74, dur: 12, rect: { x: 1990, y: 862, w: 540, h: 128 }, amount: 1 }, // Merge / Cancel
  { at: 96, dur: 18, rect: { x: 690, y: 170, w: 2310, h: 600 }, amount: 1 }, // header and banner
  { at: 133, dur: 14, rect: { x: 700, y: 182, w: 2280, h: 572 }, amount: 1 }, // Merged: lozenge and banner
];

const PAGE_CAM: CapKey[] = [
  { at: 0, to: { cx: 2050, cy: 900, s: 0.62 } },
  { at: 188, dur: 24, to: { cx: 2150, cy: 620, s: 0.98 } },
];
const PAGE_SPOT: SpotKey[] = [
  { at: 0, rect: { x: 1450, y: 300, w: 1360, h: 230 }, amount: 0 },
  { at: 191, dur: 14, rect: { x: 1450, y: 300, w: 1360, h: 230 }, amount: 1 }, // title and byline
  { at: LAND - 2, dur: 12, rect: { x: 2250, y: 444, w: 372, h: 66 }, amount: 1 }, // "Possibly stale · Doc Drift"
];
/** captures.json masks of p2-flagged (the "(Development)" suffixes), drawn white as the kit does. */
const PAGE_MASKS = [
  [323, 1901, 206, 42],
  [2594, 465, 176, 37],
];

const RecordingShot: React.FC = () => {
  const frame = useCurrentFrame();
  const pose = capPose(frame, REC_CAM, { seed: "dr-rec" });
  const src = remap(frame, REMAP);
  const spot = spotAt(frame, REC_SPOT);
  const s = screenScale(pose);
  return (
    <AbsoluteFill>
      <CaptureWorld pose={pose}>
        <VideoAt src={staticFile("captures/p2-merge.mp4")} t={src} style={{ width: 3840, height: 2160 }} />
        <Cursor
          scale={2.4 / s}
          showAt={6}
          hideAt={116}
          points={[
            { frame: 0, x: 2950, y: 980 },
            { frame: CLICK1, x: 3621, y: 393, click: true, cursor: "pointer" },
            { frame: CLICK2, x: 2256, y: 925, click: true, cursor: "pointer" },
            { frame: 118, x: 2480, y: 1260 },
          ]}
        />
      </CaptureWorld>
      <Spotlight rect={capRectToScreen(pose, spot.rect)} amount={spot.amount} />
    </AbsoluteFill>
  );
};

const PageShot: React.FC = () => {
  const frame = useCurrentFrame();
  const pose = capPose(frame, PAGE_CAM, { seed: "dr-page" });
  const spot = spotAt(frame, PAGE_SPOT);
  return (
    <AbsoluteFill>
      <CaptureWorld pose={pose}>
        <Img src={staticFile("captures/p2-flagged.png")} style={{ width: 3840, height: 2160 }} />
        {PAGE_MASKS.map(([x, y, w, h], i) => (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: w, height: h, background: "#FFFFFF" }} />
        ))}
      </CaptureWorld>
      <Spotlight rect={capRectToScreen(pose, spot.rect)} amount={spot.amount} radius={14} />
    </AbsoluteFill>
  );
};

/** Seconds since the merge click: real time during the recording, then the measured 19 s at the landing. */
function clockAt(frame: number): number {
  const rec = remap(frame, REMAP) - 5.178;
  if (frame <= SEAM - 4) return Math.max(0, rec);
  const from = remap(SEAM - 4, REMAP) - 5.178;
  return from + (19 - from) * tween(frame, SEAM - 4, LAND, 0, 1, EASE.expoOut);
}

const Clock: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < CLICK2) return null;
  const v = Math.min(19, Math.floor(clockAt(frame) + 1e-6));
  return (
    <Lift at={CLICK2 + 1} to={4} x={64} y={790} radius={26}>
      <Card style={{ width: 360 }}>
        <div style={{ fontSize: 26, lineHeight: "32px", color: DAY.textMuted, fontWeight: 500 }}>
          <LabelSwap from="Since the merge click" to="Merge to flag" at={LAND - 1} size={26} weight={500} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 112, lineHeight: "112px", fontWeight: 600, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>{v}</span>
          <span style={{ fontSize: 44, color: DAY.textMuted, fontWeight: 500 }}>s</span>
        </div>
        <div style={{ fontSize: 26, lineHeight: "32px", color: DAY.textMuted, marginTop: 6, opacity: tween(frame, LAND + 4, LAND + 10, 0, 1, EASE.linear) }}>
          Measured on the demo site, Nov 13
        </div>
      </Card>
    </Lift>
  );
};

/** The honest speed label: shown while the recording runs at 3x or more. */
const SpeedChip: React.FC = () => {
  const frame = useCurrentFrame();
  const r = rateAt(frame, REMAP);
  if (frame >= SEAM - 4 || r < 3) return null;
  const shown = Math.round(Math.max(...[110, 115, 120, 125].map((f) => rateAt(f, REMAP))));
  return (
    <div style={{ position: "absolute", left: 452, top: 806 }}>
      <InkLabel size={26}>{`${shown}× speed`}</InkLabel>
    </div>
  );
};

const Tag: React.FC = () => {
  const frame = useCurrentFrame();
  const rec = frame >= 6 && frame < SEAM - 3;
  const page = frame >= 194;
  if (!rec && !page) return null;
  return (
    <div style={{ position: "absolute", left: 64, top: 56 }}>
      <InkLabel icon="eye" size={26}>
        {rec ? "Recorded in Bitbucket: the real merge" : "Recorded in Confluence, flagged 19 s after the merge"}
      </InkLabel>
    </div>
  );
};

export const DirectedRecording: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground, fontFamily: FONT.sans }}>
    <WhipBlur at={SEAM} dur={9} dir="left" from={<RecordingShot />} to={<PageShot />} />
    <Tag />
    <Clock />
    <SpeedChip />
    <Bed filmFrom={2077} dur={DR_DUR} gainDb={-17} />
    <Sfx id="click" at={CLICK1} />
    <Sfx id="tick-soft" at={52} gainDb={-4} />
    <Sfx id="click" at={CLICK2} />
    <Sfx id="tick-soft" at={CLICK2 + 2} gainDb={-2} />
    <Sfx id="reverse-swell" at={MERGED} gainDb={-3} />
    <Sfx id="merge" at={MERGED} gainDb={3} />
    <Sfx id="whoosh-short" at={SEAM} />
    <Sfx id="slip" at={LAND} />
  </AbsoluteFill>
);
