import { EASE } from "../../../lib/time";
import type { CaptureMask } from "../../../lib/captures";
import type { CapKey, Rect, SpotKey, TakeClick } from "../../../v4/kit";
import { SRC, T } from "./timing";

/**
 * Where things are in the Nov 13 captures (capture px, 3840 x 2160), measured on the frames LOOP shows, and the
 * directed camera and spotlight of each part. Never-show rules (V5.md section 4) are met by crops and covers:
 *   - the anchor dialog's header reads "Unanchored" until after Save (y 264 to 308): covered in the dialog's white;
 *     the runbook's header table (Owner "Dana", y 620 on) is dimmed behind the backdrop left of the dialog: covered in
 *     the backdrop's grey;
 *   - the page stills are cropped above the table (y 620), so "Dana" never shows; their "(Development)" masks are drawn;
 *   - the review panel is cropped to its title row and the first sentence of its first line: line 2 ("Score 1.00
 *     (threshold") starts at y 376, the crop ends at 369, and "6 minutes ago" is far below;
 *   - the flagged byline is a still with no tooltip; the panel is opened from a still, so the badge's hover tooltip
 *     (p4-review-rec 26.03 to 26.13 s, "deploy/helm/values.yaml") is never on screen.
 */

// ---------------------------------------------------------------------------------------------------------------------
// S08 and S09: the real suggestions dialog (p1-anchor-rec), 10.26 to 15.5 s
// ---------------------------------------------------------------------------------------------------------------------

/** The modal backdrop's colour over the page (sampled at 12.6 s). */
export const BLANKET = "#8C9098";

/**
 * Covers instead of a crop (a crop edge would show inside the dialog's white): the dialog's header block is covered in
 * its own white (it reads "Unanchored" until after Save), and the dimmed page around the dialog in the backdrop's
 * grey (its header table, "Owner" and "Dana", sits left of the dialog). The dialog is x 1120 to 2720, y 120 to 1804.
 */
export const DIALOG_MASKS: CaptureMask[] = [
  { box: [1122, 150, 1596, 495], fill: "#FFFFFF", why: "the dialog header (Unanchored) and its intro, above the suggestions" },
  { box: [0, 0, 1120, 2160], fill: BLANKET, why: "the dimmed page left of the dialog (its header table)" },
  { box: [2720, 0, 1120, 2160], fill: BLANKET, why: "the dimmed page right of the dialog" },
  { box: [1120, 0, 1600, 120], fill: BLANKET, why: "the dimmed page above the dialog" },
  { box: [1120, 1804, 1600, 356], fill: BLANKET, why: "the dimmed page below the dialog" },
];

export const DIALOG = {
  suggestions: { x: 1160, y: 648, w: 1360, h: 416 },
  rows: { x: 1170, y: 920, w: 660, h: 124 }, // the two suggestions: PAY-6 (Jira issue) and scripts/rollback.sh
  scriptChip: { x: 1255, y: 994, w: 242, h: 30 }, // "scripts/rollback.sh"
  jiraRow: { x: 1255, y: 936, w: 188, h: 30 }, // "PAY-6 Jira issue"
  saveSpot: { x: 1150, y: 1628, w: 1020, h: 134 }, // the button and "... marks this page Verified."
};

/** Camera keys start on the shot's first frame with `dur: 0` (a cut to the pose), so the creep (1% a second) starts
 * there; the landing scale leaves room for the creep, so the picture stays at most 1 film px per capture px. */
export const DIALOG_CAM: CapKey[] = [
  { at: T.real, dur: 0, to: { cx: 1840, cy: 900, s: 0.95 } },
  { at: T.saveSpot, dur: 30, to: { cx: 1840, cy: 1380, s: 0.95 }, ease: EASE.cubicInOut },
];

/** The spotlight is on the suggestions from the cut (a veil fading in on its own would change a third of the frame). */
export const DIALOG_SPOT: SpotKey[] = [
  { at: T.real, dur: 0, rect: DIALOG.suggestions, amount: 0.8 },
  { at: T.rowsSpot, dur: 14, rect: DIALOG.rows, amount: 1 },
  { at: T.saveSpot, dur: 16, rect: DIALOG.saveSpot, amount: 0.9 },
];

export const DIALOG_CLICKS: TakeClick[] = [
  { t: SRC.tick, x: 1218, y: 1010, from: [1560, 880], travel: 14 },
  { t: SRC.save, x: 1346, y: 1673, from: [1240, 1060], travel: 18 },
];

// ---------------------------------------------------------------------------------------------------------------------
// The page (p1-verified, then p2-flagged: the same view, pixel-aligned above y 620; only the byline item differs)
// ---------------------------------------------------------------------------------------------------------------------

export const PAGE_CROP: Rect = { x: 0, y: 0, w: 3840, h: 600 };
export const PAGE = {
  head: { x: 1470, y: 330, w: 1330, h: 190 }, // title and byline
  badgeVerified: { x: 2272, y: 454, w: 270, h: 58 }, // "Verified · Doc Drift"
  badgeStale: { x: 2272, y: 454, w: 338, h: 58 }, // "Possibly stale · Doc Drift"
  /** The badge's text block, for the gloss under it. */
  label: { x: 2285, y: 466, w: 309, h: 34 },
};
export const PAGE_SEED = "loop-page";
/** The page's camera: the kit's creep (1% a second) and float. */
export const PAGE_MOTION = { creep: 1, float: 3 };

const PAGE_REST = { cx: 2150, cy: 596, s: 0.95 };
/** S09: a slow drift toward the label while "the page is Verified" is said (the page is mostly white: the creep alone
 * does not move it visibly). */
export const PAGE_CAM_S09: CapKey[] = [
  { at: T.cut1, dur: 0, to: PAGE_REST },
  { at: T.cut1 + 1, dur: T.cut2 - T.cut1, to: { cx: 2210, cy: 596, s: 0.965 }, ease: EASE.linear },
];
/** On from the cut on the page head (a veil fading in by itself changes a third of the frame), then onto the label. */
export const PAGE_SPOT_S09: SpotKey[] = [
  { at: T.cut1, dur: 0, rect: PAGE.head, amount: 0.6 },
  { at: T.verifiedSpot, dur: 22, rect: PAGE.badgeVerified, amount: 1 },
];

/** S11: the page waits at rest (the clock is the process); on the flag the camera punches in on the real label, with
 * the score's hit: the "19 s" landing is the take's one beat of camera emphasis. */
export const PAGE_CAM_S11: CapKey[] = [
  { at: T.grow2, dur: 0, to: { cx: 2150, cy: 600, s: 0.92 } },
  { at: T.badgeSpot, dur: T.flag - T.badgeSpot, to: { cx: 2210, cy: 600, s: 0.935 }, ease: EASE.linear }, // leaning in, through the silence
  { at: T.flag, dur: 24, to: { cx: 2400, cy: 584, s: 0.975 } },
];
export const PAGE_SPOT_S11: SpotKey[] = [
  { at: T.headSpot2, dur: 14, rect: PAGE.head, amount: 0.85 },
  { at: T.badgeSpot, dur: 16, rect: PAGE.badgeVerified, amount: 1 },
  { at: T.flag - 4, dur: 8, rect: PAGE.badgeStale, amount: 1 }, // wide enough for the new label as it lands
];

/** The click on the label that opens the review panel (the badge is a recorded click point: p4-review-rec 26.009 s). */
export const BADGE_CLICK: TakeClick = { t: T.click3 / 30, x: 2420, y: 484, from: [2760, 760], travel: 22 };

// ---------------------------------------------------------------------------------------------------------------------
// S10: the real merge of PR #482 (p2-merge-rec)
// ---------------------------------------------------------------------------------------------------------------------

export const MERGE = {
  renameLine: { x: 1385, y: 717, w: 580, h: 30 }, // commit message: "Rename rollback script and timeout variable"
  banner: { x: 704, y: 506, w: 2262, h: 256 },
  bannerText: { x: 812, y: 540, w: 880, h: 124 }, // "Merged pull request" and "Merged in ... (pull request #482)"
  pr482: { x: 1408, y: 614, w: 256, h: 32 }, // "(pull request #482)"
};

/** Gentle moves (cubic in-out) on full-bleed footage: no frame changes a quarter of the picture, so the take measures
 * as one shot. */
export const MERGE_CAM: CapKey[] = [
  { at: T.cut2, dur: 0, to: { cx: 1650, cy: 640, s: 0.86 } },
  { at: T.punch, dur: 34, to: { cx: 1420, cy: 640, s: 0.98 }, ease: EASE.cubicInOut },
];
export const MERGE_SPOT: SpotKey[] = [
  { at: T.bannerSpot, dur: 14, rect: MERGE.banner, amount: 0.85 },
  { at: T.punch, dur: 16, rect: MERGE.bannerText, amount: 1 },
];
export const MERGE_CLICKS: TakeClick[] = [{ t: SRC.mergeClick, x: 2256, y: 925, from: [2040, 760], travel: 14 }];

// ---------------------------------------------------------------------------------------------------------------------
// S12: the review panel (p4-panel: identical to p4-review-rec at 30.7 s in this region, mean difference 0.3 of 255)
// ---------------------------------------------------------------------------------------------------------------------

/** "Doc Drift", the title row with its state, and the first sentence of line 1 (inside the modal's white). */
export const PANEL_CROP: Rect = { x: 1132, y: 132, w: 1180, h: 237 };
export const PANEL = {
  sentence: { x: 1150, y: 326, w: 1168, h: 44 }, // "PR #482 renamed ... an anchor of this page."
  rename: { x: 1290, y: 337, w: 698, h: 27 }, // "renamed scripts/rollback.sh to scripts/rollback-v2.sh"
};
export const PANEL_SEED = "loop-panel";
/** The band sits lower than the camera's clamp allows (it is the capture's top): a plain screen offset. */
export const PANEL_DY = 186;
/** A white margin under the band (capture px), the plate's own: the crop has to end 6 px under the sentence. */
export const PANEL_PAD = 16;
export const PANEL_CAM: CapKey[] = [
  { at: T.cut3, dur: 0, to: { cx: 1731, cy: 598, s: 0.9 } },
  { at: T.panelSpot, dur: 22, to: { cx: 1734, cy: 568, s: 0.97 }, ease: EASE.expoInOut },
];
