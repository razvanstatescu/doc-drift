import { getScene } from "../../../lib/timeline";

/**
 * FIX's cues in LOCAL frames (frame 0 = the scene's start in src/data/timeline.json), all from words and markers, so
 * a re-voice re-times the scene. FIX starts on a bar: local beats are multiples of 15, bars multiples of 60 (S18's
 * downbeat, where the score resolves, is a bar). Events land 0 to 4 frames before their word (V4 M6); real clicks on
 * beats where the word allows.
 */
export const sc = getScene("FIX");

const w = (line: string, word: string, which: "from" | "to" = "from", nth = 0) => sc.wordAt(line, word, which, nth);

// S16 · "Agents never edit the page. A person does: the rename is one click, with no AI."
const agents16 = w("S16", "agents");
const never = w("S16", "never");
const person16 = w("S16", "person");
const theRename = w("S16", "the", "from", 1);
const rename = w("S16", "rename");
const click = w("S16", "click");
const no = w("S16", "no");
const ai = w("S16", "ai", "to");
// S17 · "Our agent drafts the other change, a renamed timeout setting. Nothing changes until a person accepts."
const s17 = sc.cue("S17");
const drafts = w("S17", "drafts");
const renamed = w("S17", "renamed");
const timeout = w("S17", "timeout");
const setting = w("S17", "setting", "to");
const nothing = w("S17", "nothing");
const until = w("S17", "until");
const accepts = w("S17", "accepts");
// S18 · "Verified again. Now agents can cite it, with the right step."
const s18 = sc.cue("S18");
const verified = w("S18", "verified");
const again = w("S18", "again");
const now = w("S18", "now");
const cite = w("S18", "cite");
const withRight = w("S18", "with");
const right = w("S18", "right");

export const T = {
  // ---- P · the page, the agents and a person (0 .. qf) -------------------------------------------------------------
  agents16,
  /** The agents' status turns "Read only" on "never edit" (the swap's words readable on the word). */
  readOnly: never - 3,
  never,
  /** The People chip lifts in on "A person does". */
  personIn: person16 - 4,

  // ---- Q · the quick fix (qf .. r) ----------------------------------------------------------------------------------
  /** Carry cut: the quick fix card grows out of step 2's dead path, on "the rename". */
  qf: theRename - 4,
  qfDur: 16,
  rename,
  /** The real click (p4-review-rec, 38.308 s) lands 2 frames before "click": a short 1:1 proof around it. */
  proofQ: click - 12,
  realClick: click - 2,
  click,
  /** Back to the crafted card (its result line), then Mist on its "No AI used." on "no AI". */
  get proofQEnd() {
    return no - 6;
  },
  noAi: no - 4,
  ai,

  // ---- R · our agent's draft (r .. v) -------------------------------------------------------------------------------
  /** Locked push to the agent as S17 starts. */
  r: s17 - 5,
  rDur: 18,
  /** The draft leaves the agent as the push lands and lands big on "drafts". */
  draftFly: drafts - 16,
  draftLand: drafts - 2,
  drafts,
  /** The change itself, on "a renamed timeout setting": marked, struck, replaced (EditLine). */
  editMark: renamed - 4,
  editStrike: renamed + 2,
  editReplace: timeout - 2,
  setting,
  /** The real draft as a short 1:1 proof; Mist on its "Nothing changes until you accept." on "Nothing". */
  proofR: setting - 4,
  nothingMark: nothing - 4,
  nothing,
  proofREnd: until - 5,
  /** A person's click on Accept fix lands 2 frames before "accepts". */
  acceptClick: accepts - 2,
  accepts,

  // ---- V · Verified again; agents can cite it (v .. payoff) ---------------------------------------------------------
  /** Locked push back to the page, landing on its header just before S18. */
  v: s18 - 22,
  vDur: 14,
  /** The accepted drafts land in step 2 under the push. */
  morph: s18 - 14,
  /** The snap back on snapBack: the band home, the byline item swaps to Verified (readable on "Verified"). */
  hit: s18,
  snapBack: sc.marker("snapBack"),
  bylineAt: verified - 3,
  verified,
  /** "Verified." rises with the swap (never before it). */
  typeAt: verified - 3,
  /** The real "Verified by Razvan Statescu, just now." (p4-accepted), a short 1:1 proof, on "again". */
  proofV: again - 4,
  get proofVEnd() {
    return now - 5;
  },
  again,
  /** Pull back to the page and its readers on "Now agents"; the agents' status turns "Safe to cite" on "cite". */
  pull: now - 4,
  now,
  citeAt: cite - 3,
  cite,
  /** Cut to the 3 a.m. payoff on "with the right step"; its underline lands on "right", its source chip on "right". */
  payoff: withRight - 2,
  payoffMark: right - 6,
  payoffSource: right,
  /** The payoff's chime (PayoffShot plays it at sourceAt + 2); JIRA plays its tail from the same start. */
  get payoffChime() {
    return this.payoffSource + 2;
  },
  right,
  end: sc.durationInFrames,
};
