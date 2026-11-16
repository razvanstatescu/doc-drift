import { getLength } from "@remotion/paths";
import { toolOutput } from "../../lib/captures";
import { EASE } from "../../lib/time";
import { cam3At, pointOnPath, proofRect, stageToScreen, type Cam3Key, type CameraOptions } from "../../v4/kit";
import type { Rect } from "../../v4/look";
import { pageRects, TOOLTIPS, type PageTwinProps } from "../../v4/twins";
import { MATCHER_H, MATCHER_W, matcherRects } from "../../components/P2/MatcherCard";
import { PR_H, PR_W, prRects } from "../../components/P2/PrTwin";
import { LIT_SIZE, literalNewNameRect, literalTextRect } from "../../components/P2/RenameLiteral";
import { T } from "./timing";

/**
 * P2's world (film px on the stage, before the camera) and the screen placements of everything drawn outside the
 * camera (proofs, type, the literal). One Paper plane with three stations left to right, the slip's direction:
 * the PR card, the record's path through the relay and the matcher, the runbook. The camera tracks about 1.3 frame
 * widths between the first and the last (R3 V13 gap).
 */

// ── the stations ────────────────────────────────────────────────────────────────────────────────────────────────────
export const PR_POS = { x: (1920 - PR_W) / 2, y: (1080 - PR_H) / 2 - 4 };
export const PR = prRects(PR_POS.x, PR_POS.y);

export const LINE_Y = 820;
export const RELAY = { cx: 1880, lineY: LINE_Y };
export const MATCHER = { cx: 2580, lineY: LINE_Y };

/** The runbook twin: Possibly stale from the flag on, its Steps band slipped, the tooltip open. */
export const TOOLTIP_TEXT = TOOLTIPS.flagged;
export const PAGE_BASE: PageTwinProps = { world: "day", doc: "runbook", k: 1.8, width: 520, x: 3260, y: 70 };
export const pageProps = (): PageTwinProps => ({
  ...PAGE_BASE,
  byline: { kind: "dds", state: "possibly_stale", from: "verified", at: T.bylineSwap },
  slip: { at: T.flag, handoff: T.handoff },
  tooltip: { text: TOOLTIP_TEXT, at: T.tooltip },
});
export const PAGE = pageRects(pageProps());

// ── the camera ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Where the camera rests on the page: the page in the right half, the number in the left. */
const PAGE_CAM_X = PAGE.card.x + PAGE.card.w / 2 - 330;

export const CAM_OPTS: CameraOptions = { creep: 1.5, float: 3, seed: "p2" };
export const CAM_KEYS: Cam3Key[] = [
  // V13: a slow push toward the Merge button while the cursor travels (R3: 1.0 to 1.06)
  { at: 0, dur: 50, to: { x: 1010, y: 520, zoom: 1.06 } },
  // the rename row lifts out: ease back to the whole card, square
  { at: T.renameLift, dur: 20, to: { x: 960, y: 560, zoom: 1.0 } },
  // behind R6 the world keeps moving: a slow push toward the files the record will leave from
  { at: T.r6 - 4, dur: 34, to: { x: 1010, y: 590, zoom: 1.045 }, ease: EASE.cubicInOut },
  // the gap: the track with the record, left to right, turning slightly while it travels (M2)
  { at: T.prOut, dur: 52, to: { x: 2150, y: 600, zoom: 0.94, yaw: -2 }, ease: EASE.cubicInOut },
  { at: T.prOut + 52, dur: 56, to: { x: PAGE_CAM_X, y: 540, zoom: 1.0, yaw: 0 }, ease: EASE.cubicInOut },
  // the flag: a push toward the byline, landing on "flagged"
  { at: T.flag - 4, dur: 22, to: { x: PAGE_CAM_X + 40, y: 500, zoom: 1.05 } },
  // V15: the matcher lifts in front; the world settles back behind it
  { at: T.matcherIn, dur: 30, to: { x: PAGE_CAM_X + 20, y: 540, zoom: 0.98 } },
];

export const camAt = (frame: number) => cam3At(frame, CAM_KEYS, CAM_OPTS);

/** A world rect on screen at a frame (2D: valid while the camera is square). */
export function toScreen(r: Rect, frame: number): Rect {
  const cam = camAt(frame);
  const [x0, y0] = stageToScreen(cam, r.x, r.y);
  const [x1, y1] = stageToScreen(cam, r.x + r.w, r.y + r.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ── the literal (screen space) ──────────────────────────────────────────────────────────────────────────────────────
export const LIT_POS = { x: (1920 - literalTextRect(0, 0).w) / 2, y: 572 };
export const LIT_RECT = literalTextRect(LIT_POS.x, LIT_POS.y);
export const LIT_NEW = literalNewNameRect(LIT_POS.x, LIT_POS.y);

/** R6 · the real file header of the rename (p2-pr482-files). Its `rollback-v2.sh` in capture px: 1893-2087 x 1110-1145. */
export const R6 = { crop: [1404, 1090, 1300, 280] as [number, number, number, number], scale: 0.85 };
export const R6_POS = { x: (1920 - (1300 * 0.85 + 28)) / 2, y: 430 };
const r6i = proofRect({ ...R6, ...R6_POS }).image;
export const R6_NEWNAME: Rect = { x: r6i.x + (1893 - 1404) * 0.85, y: r6i.y + (1110 - 1090) * 0.85, w: (2087 - 1893) * 0.85, h: 35 * 0.85 };

// ── the record's path (world) ───────────────────────────────────────────────────────────────────────────────────────
/** The record pops out of the real header's `rollback-v2.sh` (R6) as the proof drops: screen to world at that frame. */
const recStart = (() => {
  const cam = camAt(T.recordAt);
  const sx = R6_NEWNAME.x + R6_NEWNAME.w / 2;
  const sy = R6_NEWNAME.y + R6_NEWNAME.h / 2;
  return [cam.x + (sx - 960) / cam.zoom, cam.y + (sy - 540) / cam.zoom] as [number, number];
})();
/** The record docks at the page's left edge, level with the Steps band (it never crosses the page's text). */
const stepsIn: [number, number] = [PAGE.card.x - 4, PAGE.bands.steps.y + Math.min(120, PAGE.bands.steps.h / 2)];

export const RECORD_PATH = [
  `M ${recStart[0].toFixed(1)} ${recStart[1].toFixed(1)}`,
  `C ${(recStart[0] + 260).toFixed(1)} ${recStart[1].toFixed(1)}, ${RELAY.cx - 560} ${LINE_Y}, ${RELAY.cx - 240} ${LINE_Y}`,
  `L ${MATCHER.cx + 240} ${LINE_Y}`,
  `C ${MATCHER.cx + 500} ${LINE_Y}, ${stepsIn[0] - 240} ${stepsIn[1]}, ${stepsIn[0]} ${stepsIn[1]}`,
].join(" ");

const LEN = getLength(RECORD_PATH);
/** Path length at the relay's and the matcher's centres (the line is straight between their ports). */
const firstLen = getLength(RECORD_PATH.split(" L ")[0]);
const lenAtX = (x: number) => firstLen + (x - (RELAY.cx - 240));
const STOPS: [number, number][] = [
  [T.recordAt, 0],
  [T.relayAt, lenAtX(RELAY.cx) / LEN],
  [T.matcherAt, lenAtX(MATCHER.cx) / LEN],
  [T.arrive, 1],
];

/** The record's progress along its path (0..1) at a frame: it passes each node on its beat. */
export function recordProgress(frame: number): number {
  if (frame <= STOPS[0][0]) return 0;
  for (let i = 1; i < STOPS.length; i++) {
    const [f0, p0] = STOPS[i - 1];
    const [f1, p1] = STOPS[i];
    if (frame <= f1) {
      const t = (frame - f0) / (f1 - f0);
      // ease out of the start and into the page; steady through the nodes
      const e = i === 1 ? t * t * (3 - 2 * t) * 0.5 + t * 0.5 : i === STOPS.length - 1 ? 1 - Math.pow(1 - t, 2.2) : t;
      return p0 + (p1 - p0) * e;
    }
  }
  return 1;
}
export const recordPoint = (frame: number) => pointOnPath(RECORD_PATH, recordProgress(frame));
/** SignalLine easing that keeps the drawn head on the record. */
export const lineEase = (t: number) => recordProgress(T.recordAt + t * (T.arrive - T.recordAt));

// ── proofs (screen space) ───────────────────────────────────────────────────────────────────────────────────────────
/** R5 · the Merge dialog (p2-merge-rec 4.88 to 5.38 s), centred. Its Merge button in capture px: 2189-2323 x 895-954. */
export const R5_DIALOG = { crop: [1320, 120, 1200, 880] as [number, number, number, number], scale: 0.8 };
export const R5_DIALOG_POS = { x: (1920 - (1200 * 0.8 + 28)) / 2, y: (1080 - (880 * 0.8 + 28)) / 2 + 10 };
const r5d = proofRect({ ...R5_DIALOG, ...R5_DIALOG_POS }).image;
const capToR5 = (cx: number, cy: number): [number, number] => [r5d.x + (cx - 1320) * 0.8, r5d.y + (cy - 120) * 0.8];
export const R5_BUTTON: Rect = (() => {
  const [x0, y0] = capToR5(2189, 895);
  const [x1, y1] = capToR5(2323, 954);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
})();
/** The recorded confirm click (2256, 925) on screen. */
export const R5_CLICK = capToR5(2256, 925);
/** R5 · Merged (13.30 s on): breadcrumbs to the Merged banner, whole lines only. */
export const R5_MERGED = { crop: [700, 150, 2260, 610] as [number, number, number, number], scale: 0.6 };
export const R5_MERGED_POS = { x: (1920 - (2260 * 0.6 + 28)) / 2, y: (1080 - (610 * 0.6 + 28)) / 2 - 20 };

/**
 * R7 · the real byline and tooltip (p2-flagged-tooltip), 0.8. The pill (2271-2774 x 460-508) and the tooltip (to 635)
 * are what the twin's badge and tooltip morph into; the real byline sits at the twin's byline height (R2 section 9).
 */
export const R7 = { crop: [1440, 300, 1460, 340] as [number, number, number, number], scale: 0.8 };
export const r7Pos = (twinBylineCenterY: number) => {
  const outerW = 1460 * 0.8 + 28;
  const x = 1920 - outerW - 56;
  const imageY = twinBylineCenterY - ((460 + 508) / 2 - 300) * 0.8;
  return { x, y: imageY - 14 };
};
export const r7Element = (pos: { x: number; y: number }): Rect => {
  const img = proofRect({ ...R7, ...pos }).image;
  return { x: img.x + (2271 - 1440) * 0.8, y: img.y + (460 - 300) * 0.8, w: (2774 - 2271) * 0.8, h: (635 - 460) * 0.8 };
};
/** The hovered pill is #F1F1F2: the logged "(Development)" cover takes the colour of what it covers (R2 section 9). */
export const R7_PILL_MASK = { box: [2594, 465, 176, 37] as [number, number, number, number], fill: "#F1F1F2", why: "Development install suffix on the hovered pill" };

// ── V15 (screen space) ──────────────────────────────────────────────────────────────────────────────────────────────
export const MATCHER_POS = { x: 1920 - MATCHER_W - 70, y: (1080 - MATCHER_H) / 2 + 6 };
/** V15's own camera: the statement and the card hold still on their plane while it creeps in and drifts (M1). */
export const V15_KEYS: Cam3Key[] = [{ at: T.v15, dur: 1, to: { x: 960, y: 540, zoom: 1, yaw: 0, pitch: 0, roll: 0 } }];
export const V15_OPTS: CameraOptions = { creep: 1.6, drift: [-7, -2], float: 2, seed: "p2-v15" };
/** A V15-plane rect on screen at a frame. */
export function v15ToScreen(r: Rect, frame: number): Rect {
  const cam = cam3At(frame, V15_KEYS, V15_OPTS);
  const [x0, y0] = stageToScreen(cam, r.x, r.y);
  const [x1, y1] = stageToScreen(cam, r.x + r.w, r.y + r.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
export const MATCHER_R = matcherRects(MATCHER_POS.x, MATCHER_POS.y);
export const TYPE_X = 112;

/** R8 · the real why sentence and score (p4-panel), over the card's rules: the same words in the same place. */
export const R8 = { crop: [1150, 260, 1550, 260] as [number, number, number, number], scale: 0.6 };
export const R8_POS = { x: MATCHER_POS.x + (MATCHER_W - (1550 * 0.6 + 28)) / 2, y: MATCHER_POS.y + 250 };
const r8i = proofRect({ ...R8, ...R8_POS }).image;
/** "Score 1.00 (threshold" in capture px: about 2370-2650 x 372-402. */
export const R8_SCORE: Rect = { x: r8i.x + (2370 - 1150) * 0.6, y: r8i.y + (372 - 260) * 0.6, w: 280 * 0.6, h: 30 * 0.6 };

/** The two real outputs R9 would compare (kept for a later pass; see README). */
export const RUNS_OUTPUT = { first: toolOutput("checkFlagged"), replay: toolOutput("checkFlaggedV2") };

export const LIT_SIZE_PX = LIT_SIZE;
