import { getScene } from "../../../lib/timeline";
import { lineCues } from "../../../v4/kit";

/**
 * CLOSE (V5.md section 5): local frames 0 to 269 (film 2880 to 3149). Everything hangs off timeline.json, so a new voice
 * take re-times the card:
 *   f0        endHit: the kit's three-band slip reveal opens onto the card (it clears by f8); the lockup lands big
 *   f8        the tile's middle band slips out in amber as the reveal's middle band clears (the graphic match)
 *   "Doc"     the name sets; the row forms around the centre
 *   "Drift"   (its end) the lockup glides up to the S21 card (larger, upper middle)
 *   "for", "with", "and"   "For Confluence · with Jira and Bitbucket", three groups, each on its word
 *   "Get"     the URL card lifts; "here": the Current underline
 *   S22       the lockup and the line settle up together into the final card, and "Docs that know when the code
 *             moved." rises word by word into the room they leave; the credit is already in
 *   to 269    the camera creeps to the last frame; no fade
 * Type lands 0 to 4 frames before its word (V5.md, R6 6.6).
 */
const sc = getScene("CLOSE");
export const SC = sc;
const S22 = sc.line("S22");

/** Frames a type reveal starts before its word. */
const LEAD = 4;

export const URL = "razvanstatescu.github.io/doc-drift";

export const CUE = {
  /** The lockup's landing from the hit (frames). */
  land: 14,
  /** The band's slip: as the kit's reveal clears (its middle band carries on to the right until f8). */
  slip: 8,
  name: sc.wordAt("S21", "doc") - LEAD,
  /** The glide starts as "Drift" ends, and lands before "for". */
  glide: sc.wordAt("S21", "drift", "to") - 4,
  /** The settle into the final card: the lockup and the line move up together, landing before "Docs" rises. */
  settle: sc.wordAt("S22", "docs") - 6 - 14,
  line: [sc.wordAt("S21", "for") - LEAD, sc.wordAt("S21", "with") - LEAD, sc.wordAt("S21", "and") - LEAD] as const,
  url: sc.wordAt("S21", "get") - LEAD,
  here: sc.wordAt("S21", "here"),
  credit: sc.wordAt("S21", "here", "to") + 3,
};

/** The card's layout (film px), top to bottom in the order the voice names it. */
export const CARD = {
  /** The lockup's icon height in its place, and its hero scale on the hit. */
  icon: 128,
  /** Three layouts: the hero lockup on the hit, the S21 card (lockup and line as the focus), the final card. */
  hero: 2.2,
  heroCy: 520,
  mid: 1.5,
  midCy: 318,
  lockupCy: 190,
  glideFrames: 14,
  lineMidTop: 452,
  lineTop: 282,
  lineSize: 52,
  tagTop: 420,
  tagSize: 112,
  tagLine: 120,
  urlCy: 802,
  urlSize: 50,
  urlPadX: 44,
  urlPadY: 22,
  creditTop: 914,
} as const;

export const TAGLINE = (() => {
  const text = "Docs that know\nwhen the code moved.";
  return { text, at: S22.from, words: lineCues(S22, text) };
})();
