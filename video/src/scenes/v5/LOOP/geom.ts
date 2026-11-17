import { EASE } from "../../../lib/time";
import type { CapKey, Rect, TakeClick } from "../../../v4/kit";
import { SRC, T } from "./timing";

/**
 * Where things are in the Nov 13 captures (capture px, 3840 x 2160), measured on the frames LOOP shows. Round 2: no
 * paint on real footage (V5.md 8.1). The never-show rules are met by crops only; the only covers drawn are
 * captures.json's logged "(Development)" masks:
 *   - the anchors dialog is shown as two tight crops below its header ("Unanchored" is at y 264 to 308): the suggestions
 *     box and the Save button with its note;
 *   - the page is cropped above its header table (Owner "Dana" starts at y 620);
 *   - the review panel is cropped to its title row and the first sentence of line 1 (line 2, with "Score 1.00
 *     (threshold", starts at y 376; the crop ends at 369);
 *   - the owner's comment is cropped to its body: the author line above it shows the old app name;
 *   - the flagged label is a still with no tooltip, and the panel opens from a still, so the hover tooltip naming
 *     "deploy/helm/values.yaml" (p4-review-rec 26.03 to 26.13 s) never shows.
 */

// ---------------------------------------------------------------------------------------------------------------------
// S08 and S09: the anchors dialog (p1-suggestions-ticked, identical to p1-anchor-rec at 14.3 s in this region)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * "Suggested from this page (2)" with both suggestions ticked, as two excerpts at 1:1 (round 3): the heading, and the
 * two rows cropped before the "Weak" tag (x 1706 on). One crop cannot hold both without the "Weak" tag or a cut
 * sentence: the line between them reads "... when you save. Weak ones start unchecked." and runs past x 1706.
 */
export const SUGGEST_HEAD_CROP: Rect = { x: 1180, y: 674, w: 476, h: 58 };
export const SUGGEST_ROWS_CROP: Rect = { x: 1180, y: 926, w: 524, h: 118 };
export const SUGGEST = {
  heading: { x: 1195, y: 687, w: 396, h: 32 }, // "Suggested from this page"
  scriptChip: { x: 1259, y: 994, w: 236, h: 30 }, // "scripts/rollback.sh"
  jiraRow: { x: 1255, y: 936, w: 188, h: 30 }, // "PAY-6 Jira issue"
};

/** "Save and mark verified" and its note ("... marks this page Verified."), from the recording (the real click). */
export const SAVE_CROP: Rect = { x: 1150, y: 1626, w: 1018, h: 138 };
export const SAVE_CLICK = { x: 1346, y: 1673, from: [1560, 1520] as [number, number] };

/** The runbook's title and byline (p1-verified), above its table. */
export const HEAD_CROP: Rect = { x: 1470, y: 330, w: 1330, h: 190 };
/** "Verified" in the real label. */
export const VERIFIED_WORD = { x: 2318, y: 470, w: 96, h: 28 };

// ---------------------------------------------------------------------------------------------------------------------
// S10: the real merge of PR #482 (p2-merge-rec), full bleed, no veil
// ---------------------------------------------------------------------------------------------------------------------

export const MERGE = {
  renameWords: { x: 1385, y: 717, w: 302, h: 30 }, // commit message: "Rename rollback script"
  titleTimeout: { x: 1247, y: 214, w: 463, h: 46 }, // the PR title's "and timeout variable"
  pr482: { x: 1408, y: 614, w: 256, h: 32 }, // "(pull request #482)" in the Merged banner
};
const PR482_CENTER = { x: 1536, y: 630 };

/**
 * The window into the page opens on "(pull request #482)" and the page's label is in the same place: both land at
 * MATCH on screen, at nearly the same size.
 */
export const MATCH = { x: 1000, y: 452 };
const MERGE_S = 0.96;
export const MERGE_CAM: CapKey[] = [
  { at: T.cut2, dur: 0, to: { cx: 1650, cy: 640, s: 0.86 } },
  {
    at: T.punch,
    dur: T.punchDur,
    to: { cx: PR482_CENTER.x - (MATCH.x - 960) / MERGE_S, cy: PR482_CENTER.y - (MATCH.y - 540) / MERGE_S, s: MERGE_S },
    ease: EASE.cubicInOut,
  },
];
export const MERGE_CLICKS: TakeClick[] = [{ t: SRC.mergeClick, x: 2256, y: 925, from: [2040, 760], travel: 14 }];

// ---------------------------------------------------------------------------------------------------------------------
// S11: the page (p1-verified, then p2-flagged: the same view, pixel-aligned above y 620; only the byline item differs)
// ---------------------------------------------------------------------------------------------------------------------

export const PAGE_CROP: Rect = { x: 0, y: 0, w: 3840, h: 600 };
export const PAGE_SEED = "loop-page";
/** The page's camera: a light creep (the take's scale stays at most 1 to the click). */
export const PAGE_MOTION = { creep: 0.5, float: 3 };
/** The real label (with its icon), Verified and then Possibly stale: its centre is where "#482" was. */
const LABEL_CENTER = { x: 2405, y: 483 };
/** The real "Possibly stale · Doc Drift" item in p2-flagged, with the pill's padding (the kit's LiftOut demo). */
export const FLAGGED_ITEM: Rect = { x: 2256, y: 448, w: 360, h: 58 };
const PAGE_S = 0.95;
export const PAGE_CAM: CapKey[] = [
  { at: T.grow2, dur: 0, to: { cx: LABEL_CENTER.x - (MATCH.x - 960) / PAGE_S, cy: LABEL_CENTER.y - (MATCH.y - 540) / PAGE_S, s: PAGE_S } },
  // the page leans in to the label through the silence, landing as it flips; then it follows the cursor to the label
  { at: T.leanIn, dur: T.flag - T.leanIn, to: { cx: 2330, cy: 568, s: 0.97 }, ease: EASE.standard },
  { at: T.approach, dur: T.click3 - T.approach, to: { cx: 2400, cy: 562, s: 0.98 }, ease: EASE.cubicInOut },
];
/** The click on the label that opens the review panel (the badge is a recorded click point: p4-review-rec 26.009 s). */
export const BADGE_CLICK: TakeClick = { t: T.click3 / 30, x: 2420, y: 484, from: [2760, 760], travel: 22 };

/** The lifted label: about 76 px type beside the clock (the kit's demo: 76 px fits between the clock and the edge). */
export const LIFT = { to: { x: 600, y: 806 }, size: 76 };

// ---------------------------------------------------------------------------------------------------------------------
// S12: the review panel (p4-panel: identical to p4-review-rec at 30.7 s here) and the owner's comment (p4-comment)
// ---------------------------------------------------------------------------------------------------------------------

/** "Doc Drift", the title row with its state, and the first sentence of line 1 (inside the modal's white). */
export const PANEL_CROP: Rect = { x: 1132, y: 132, w: 1180, h: 237 };
export const PANEL = {
  sentence: { x: 1170, y: 349 }, // the push-in's focus
  rename: { x: 1290, y: 337, w: 698, h: 27 }, // "renamed scripts/rollback.sh to scripts/rollback-v2.sh"
};

/** The comment's body: "@Razvan Statescu PR #482 (merged by Razvan Statescu) changed 2 files this page documents.
 * Review in the Doc Drift badge." (the author line above, y 1700 to 1747, is cropped out). */
export const COMMENT_CROP: Rect = { x: 1568, y: 1762, w: 1334, h: 112 };
export const COMMENT = {
  mention: { x: 1588, y: 1778, w: 278, h: 38 }, // the "@Razvan Statescu" chip: the page owner
};
