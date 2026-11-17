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

/**
 * Every piece of type LANDS 2 frames before its word (V5.md, R6 6.6: 0 to 4 before). "Landed" is where the QA's sync
 * pass reads it: the element has done 96% of its travel, about half of an expo-out tween and 0.8 of KineticLine's
 * entry. So each start is the word, minus 2, minus that much of its own duration (calibrated on the v5 round-1
 * measurements: a 15-frame name landed 8 frames after it started, a 13-frame mask 6, a 14-frame lift 7, the tagline 7).
 */
const LAND_BEFORE = 2;
export const DUR = { name: 15, mask: 12, lift: 14, tag: 10 } as const;
const startFor = (word: number, framesToLand: number) => word - LAND_BEFORE - framesToLand;

export const URL = "razvanstatescu.github.io/doc-drift";

/** "For Confluence · with Jira and Bitbucket", word by word, each with the spoken word it lands on. */
export const LINE: { text: string; muted?: boolean; at: number }[] = [
  { text: "For", at: startFor(sc.wordAt("S21", "for"), 6) },
  { text: "Confluence", at: startFor(sc.wordAt("S21", "confluence"), 6) },
  { text: "·", muted: true, at: startFor(sc.wordAt("S21", "with"), 6) },
  { text: "with", at: startFor(sc.wordAt("S21", "with"), 6) },
  { text: "Jira", at: startFor(sc.wordAt("S21", "jira"), 6) },
  { text: "and", at: startFor(sc.wordAt("S21", "and"), 6) },
  { text: "Bitbucket", at: startFor(sc.wordAt("S21", "bitbucket"), 6) },
];

/** The tagline's words start this many frames before their word (KineticLine's lead). */
export const TAG_LEAD = LAND_BEFORE + 8;

export const CUE = {
  /** The lockup's landing from the hit (frames). */
  land: 14,
  /** The band's slip: as the kit's reveal clears (its middle band carries on to the right until f8). */
  slip: 8,
  name: startFor(sc.wordAt("S21", "doc"), 8),
  /** The glide starts as "Drift" ends, and lands before "for". */
  glide: sc.wordAt("S21", "drift", "to") - 4,
  /** The URL card lands on "Get"; the underline is drawn on "here". */
  url: startFor(sc.wordAt("S21", "get"), 7),
  here: sc.wordAt("S21", "here") - LAND_BEFORE - 4,
  credit: sc.wordAt("S21", "here", "to") + 3,
  /** The settle into the final card lands as the tagline's first word starts rising. */
  settle: sc.wordAt("S22", "docs") - TAG_LEAD - 14,
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
  return { text, at: S22.from, words: lineCues(S22, text), lead: TAG_LEAD, dur: DUR.tag };
})();
