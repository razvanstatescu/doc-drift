import { getLength } from "@remotion/paths";
import { EASE, tween } from "../../lib/time";
import { cam3At, pointOnPath, proofPoint, stageToScreen, type Cam3Key, type CameraOptions } from "../../v4/kit";
import type { Rect } from "../../v4/look";
import { pageRects, TOOLTIPS, type PageTwinProps } from "../../v4/twins";
import { MATCHER_H, MATCHER_W, matcherRects } from "../../components/P2/MatcherCard";
import { PR_H, PR_W, prRects } from "../../components/P2/PrTwin";
import { literalNewNameRect, literalTextRect } from "../../components/P2/RenameLiteral";
import { T } from "./timing";

/**
 * P2's world (film px on the stage, before the camera) and the screen placements of everything drawn outside the
 * camera (proofs, type, the literal, the token). One Paper plane with three stations left to right, the slip's
 * direction: the PR card, the record's path through the relay and the matcher, the runbook. The camera tracks about
 * 1.3 frame widths between the first and the last (R3 V13 gap).
 */

type Box = [number, number, number, number];

// ── the stations ────────────────────────────────────────────────────────────────────────────────────────────────────
export const PR_POS = { x: (1920 - PR_W) / 2, y: (1080 - PR_H) / 2 - 4 };
export const PR = prRects(PR_POS.x, PR_POS.y);

/** The record's track; the stations stand on stems above it, clear of the number's note (F-1). */
export const LINE_Y = 870;
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
/** Where the camera lands on the page: the page in the right half, the number in the left. */
const PAGE_CAM_X = PAGE.card.x + PAGE.card.w / 2 - 330;
/** The flag's push: the byline item lands at (1250, 330) at 1.16x, the page's left edge clear of the number. */
const FLAG_ZOOM = 1.16;
const badgeC = [PAGE.badge.x + PAGE.badge.w / 2, PAGE.badge.y + PAGE.badge.h / 2];
const FLAG_CAM = { x: badgeC[0] - (1250 - 960) / FLAG_ZOOM, y: badgeC[1] - (330 - 540) / FLAG_ZOOM, zoom: FLAG_ZOOM };

export const CAM_OPTS: CameraOptions = { creep: 1.5, float: 3, seed: "p2" };
export const CAM_KEYS: Cam3Key[] = [
  // V13: a slow push toward the Merge button while the cursor travels (R3: 1.0 to 1.06)
  { at: 0, dur: 50, to: { x: 1010, y: 520, zoom: 1.06 } },
  // "renames": a decisive push onto the rename row as it lifts out
  { at: T.renameLift, dur: 18, to: { x: 980, y: 650, zoom: 1.14 } },
  // behind R6 the world keeps moving
  { at: T.r6 - 4, dur: 30, to: { x: 1000, y: 610, zoom: 1.08 }, ease: EASE.cubicInOut },
  // the gap: the track with the record, left to right, turning slightly while it travels (M2)
  { at: T.prOut, dur: 52, to: { x: 2150, y: 600, zoom: 0.94, yaw: -2 }, ease: EASE.cubicInOut },
  { at: T.prOut + 52, dur: T.flagPush - T.prOut - 52, to: { x: PAGE_CAM_X, y: 540, zoom: 1.0, yaw: 0 }, ease: EASE.cubicInOut },
  // "flagged": the decisive push onto the byline, landing on the word
  { at: T.flagPush, dur: 16, to: FLAG_CAM },
  // V15: the matcher lifts in front; the world eases back behind it (racked)
  { at: T.matcherIn, dur: 30, to: { x: FLAG_CAM.x - 40, y: FLAG_CAM.y + 30, zoom: 1.06 } },
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
export const R6 = { crop: [1404, 1090, 1300, 280] as Box, scale: 0.85 };
export const R6_POS = { x: (1920 - (1300 * 0.85 + 28)) / 2, y: 430 };
export const R6_NEWNAME: Rect = proofPoint({ ...R6, ...R6_POS }, [1893, 1110, 194, 35]);

// ── the record's path (world) ───────────────────────────────────────────────────────────────────────────────────────
/** The record pops out of the real header's `rollback-v2.sh` (R6) as the proof goes: screen to world at that frame. */
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
/** Path length at the relay's and the matcher's centres (the line is straight between them). */
const firstLen = getLength(RECORD_PATH.split(" L ")[0]);
const lenAtX = (x: number) => firstLen + (x - (RELAY.cx - 240));
const STOPS: [number, number][] = [
  [T.recordAt, 0],
  [T.relayAt, lenAtX(RELAY.cx) / LEN],
  [T.matcherAt, lenAtX(MATCHER.cx) / LEN],
  [T.arrive, 1],
];

/** The record's progress along its path (0..1) at a frame: it passes each station on its beat. */
export function recordProgress(frame: number): number {
  if (frame <= STOPS[0][0]) return 0;
  for (let i = 1; i < STOPS.length; i++) {
    const [f0, p0] = STOPS[i - 1];
    const [f1, p1] = STOPS[i];
    if (frame <= f1) {
      const t = (frame - f0) / (f1 - f0);
      // ease out of the start and into the page; steady through the stations
      const e = i === 1 ? t * t * (3 - 2 * t) * 0.5 + t * 0.5 : i === STOPS.length - 1 ? 1 - Math.pow(1 - t, 2.2) : t;
      return p0 + (p1 - p0) * e;
    }
  }
  return 1;
}
export const recordPoint = (frame: number) => pointOnPath(RECORD_PATH, recordProgress(frame));
/** SignalLine easing that keeps the drawn head on the record. */
export const lineEase = (t: number) => recordProgress(T.recordAt + t * (T.arrive - T.recordAt));

// ── R5 · one proof, two framings (screen space) ─────────────────────────────────────────────────────────────────────
/**
 * The Merge dialog (4.88 s on) at 0.8, centred, cropped inside the dialog's own white so every edge is whitespace
 * (the kit's crop guard; the title starts at 1367, the buttons end at 954). Its Merge button: 2189-2323 x 895-954.
 */
export const R5_DIALOG = { crop: [1350, 150, 1140, 840] as Box, scale: 0.8 };
/** Then, on the bar, the Merged banner (13.30 s on) at 0.8: "Merged pull request", the merge line, the commit line. */
export const R5_BANNER = { crop: [700, 505, 1440, 260] as Box, scale: 0.8 };
const R5_CENTER = { x: 960, y: 548 };
const matOf = (c: { crop: Box; scale: number }) => ({ w: c.crop[2] * c.scale + 28, h: c.crop[3] * c.scale + 28 });
export const R5_DIALOG_POS = { x: R5_CENTER.x - matOf(R5_DIALOG).w / 2, y: R5_CENTER.y - matOf(R5_DIALOG).h / 2 };
/** The mat's top-left at a frame: it stays centred while the kit reframes it (6 frames, expo out) at the jump. */
export function r5MatPos(frame: number) {
  const re = tween(frame, T.r5Jump, T.r5Jump + 6, 0, 1, EASE.expoOut);
  const a = matOf(R5_DIALOG);
  const b = matOf(R5_BANNER);
  const w = a.w + (b.w - a.w) * re;
  const h = a.h + (b.h - a.h) * re;
  return { x: R5_CENTER.x - w / 2, y: R5_CENTER.y - h / 2 };
}
export const R5_BUTTON: Rect = proofPoint({ ...R5_DIALOG, ...R5_DIALOG_POS }, [2189, 895, 134, 59]);
/** The recorded confirm click (2256, 925) on screen. */
export const R5_CLICK: [number, number] = (() => {
  const r = proofPoint({ ...R5_DIALOG, ...R5_DIALOG_POS }, [2256, 925, 0, 0]);
  return [r.x, r.y];
})();

// ── R7 (screen space) ───────────────────────────────────────────────────────────────────────────────────────────────
/**
 * R7 · the real byline and tooltip (p2-flagged-tooltip), 0.8. The pill (2271-2774 x 460-508) and the tooltip (to 635)
 * are what the twin's badge and tooltip morph into; the real byline sits at the twin's byline height (R2 section 9).
 * 340 tall: it ends above the header table (no line cut, no owner row).
 */
export const R7 = { crop: [1440, 300, 1460, 340] as Box, scale: 0.8 };
export const r7Pos = (twinBylineCenterY: number) => {
  const outerW = 1460 * 0.8 + 28;
  const x = 1920 - outerW - 56;
  const imageY = twinBylineCenterY - ((460 + 508) / 2 - 300) * 0.8;
  return { x, y: imageY - 14 };
};
export const r7Element = (pos: { x: number; y: number }): Rect => proofPoint({ ...R7, ...pos }, [2271, 460, 503, 175]);
/** The hovered pill is #F1F1F2: the logged "(Development)" cover takes the colour of what it covers (R2 section 9). */
export const R7_PILL_MASK = { box: [2594, 465, 176, 37] as Box, fill: "#F1F1F2", why: "Development install suffix on the hovered pill" };

// ── V15 (screen space) ──────────────────────────────────────────────────────────────────────────────────────────────
/** The card sits 130 px from the right edge, so the push and the creep never take it past the frame (F-3). */
export const MATCHER_POS = { x: 1920 - MATCHER_W - 130, y: (1080 - MATCHER_H) / 2 + 6 };
export const TYPE_X = 132;
/** V15's own camera: square at the statement's first word, a decisive push landing on "call", then a slow creep. */
export const V15_KEYS: Cam3Key[] = [
  { at: T.v15, dur: 1, to: { x: 960, y: 540, zoom: 1, yaw: 0, pitch: 0, roll: 0 } },
  // x, y = the stage point at the view's centre: chosen so the statement and the card both stay 60 px or more inside
  { at: T.v15Push, dur: 12, to: { x: 966, y: 556, zoom: 1.05 } },
];
export const V15_OPTS: CameraOptions = { creep: 0.5, drift: [0, 0], float: 2, seed: "p2-v15" };
/** A V15-plane rect on screen at a frame. */
export function v15ToScreen(r: Rect, frame: number): Rect {
  const cam = cam3At(frame, V15_KEYS, V15_OPTS);
  const [x0, y0] = stageToScreen(cam, r.x, r.y);
  const [x1, y1] = stageToScreen(cam, r.x + r.w, r.y + r.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
export const MATCHER_R = matcherRects(MATCHER_POS.x, MATCHER_POS.y);

/** Where "PR #482" hovers between leaving the tooltip and docking in the matcher: right of the byline item, on clear
 *  ground of the byline row (screen px at the flag's push). */
export const TOKEN_HOVER = { cx: 1645, cy: 300, scale: 1.2 };

/**
 * R8 · the real why sentence and score (p4-panel) over the card's rules: the same words in the same place. The crop
 * starts at 220 (the title whole, below the modal's own header) and ends above "Review (2)".
 */
export const R8 = { crop: [1150, 220, 1550, 300] as Box, scale: 0.6 };
export const R8_POS = { x: MATCHER_POS.x + (MATCHER_W - (1550 * 0.6 + 28)) / 2, y: MATCHER_POS.y + 236 };
/** "Score 1.00 (threshold" in capture px. */
export const R8_SCORE_BOX: Box = [2370, 372, 280, 30];
