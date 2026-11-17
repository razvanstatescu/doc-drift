import { getScene } from "../../../lib/timeline";

/**
 * FIX's cues in LOCAL frames (frame 0 = film 2100), from src/data/timeline.json, so a re-voice re-times the scene.
 * FIX starts on a bar (2100 % 60 === 0): local beats are multiples of 15, bars multiples of 60. Events land 0 to 4
 * frames before their word (V4 M6); real clicks land on beats where the word allows.
 */
export const sc = getScene("FIX");

const w = (line: string, word: string, which: "from" | "to" = "from", nth = 0) => sc.wordAt(line, word, which, nth);

// S16 · "People fix the page, never agents: the rename is one click, no AI."
const people = w("S16", "people");
const never = w("S16", "never");
const agents16 = w("S16", "agents");
const rename = w("S16", "rename");
const one = w("S16", "one");
const click = w("S16", "click");
const no = w("S16", "no");
const ai = w("S16", "ai", "to");
// S17 · "Drift Reviewer drafts other edits. Nothing changes until a person accepts."
const s17 = sc.cue("S17");
const drafts = w("S17", "drafts");
const other = w("S17", "other");
const nothing = w("S17", "nothing");
const accepts = w("S17", "accepts");
// S18 · "Verified again. Now agents can cite it."
const s18 = sc.cue("S18");
const verified = w("S18", "verified");
const now = w("S18", "now");
const cite = w("S18", "cite");
const it = w("S18", "it", "to");

export const T = {
  // ---- F1 · the page and who may fix it (0 .. f2) ------------------------------------------------------------------
  people,
  /** The two agent chips set beside the page with their "Read only" tag on "never agents", for 1 s. */
  chipsIn: never - 4,
  never,
  agents16,
  /** Plain cut on the beat into the real review panel, before "the rename". */
  f2: sc.snap(rename - 8),
  rename,

  // ---- F2 · the real Quick fix (p4-review-rec) ---------------------------------------------------------------------
  /** The real click on "Replace in 1 place" (38.308 s) on the beat before "click". */
  qfClick: sc.snap(click),
  one,
  click,
  /** Mist on the real "No AI used." on "no AI". */
  noAi: no - 4,
  no,
  ai,
  /**
   * The real result (41.15 s): the recording's panel jumps 730 px down to "Replaced ... in 1 place."; the camera takes
   * the jump and pans it (12 frames), so "No AI used." rides out of the frame as "AI" ends, and the result holds 0.4 s
   * before S17. The spinner before it is ramped (labelled), 1x around the click and the result.
   */
  qfResult: s17 - 24,

  // ---- F3 · the real draft and the real Accept (p4-accept-rec) -----------------------------------------------------
  /** Plain cut on the beat into the drafts as S17 starts. */
  f3: s17,
  drafts,
  other,
  nothing,
  /** The real click on "Accept fix" (12.373 s), 2 frames before "accepts". */
  acceptClick: accepts - 2,
  accepts,

  // ---- F4 · the held resolution -------------------------------------------------------------------------------------
  /** Cut on the beat to the real page header, still flagged (the amber on its byline item). */
  f4: sc.snap(accepts + 30),
  /** The score's hit (bar line of S18) and the snap back: the amber leaves, the real byline reads Verified. */
  hit: s18,
  snapBack: sc.marker("snapBack"),
  verified,
  /** "Verified." rises (the kit's TypeToUI, 12 frames) so it is up 2 frames before the word, on the snap. */
  typeAt: verified - 14,
  /** Its flight onto the real byline's word starts on "again" and lasts 18 frames (type becomes UI). */
  typeDock: verified + 12,
  typeDur: 18,
  get typeLand() {
    return this.typeDock + this.typeDur;
  },
  now,
  /** The real output line rises on "Now agents" (functional mask reveal) and "Safe to cite." is marked on "cite". */
  outIn: now - 2,
  cite,
  it,
  /** The ring that tails into JIRA (an L-cut). */
  ring: it - 2,
  end: sc.durationInFrames,
};
