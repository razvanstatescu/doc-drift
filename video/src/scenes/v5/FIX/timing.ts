import { getScene } from "../../../lib/timeline";

/**
 * FIX's cues in LOCAL frames (frame 0 = the scene's start in src/data/timeline.json), all from words and markers, so
 * a re-voice re-times the scene. FIX starts on a bar: local beats are multiples of 15, bars multiples of 60 (S18's
 * downbeat, where the score resolves, is a bar). Events land 0 to 4 frames before their word (V4 M6).
 *
 * Round 3: one world for S16 to S18 (the page and its readers, the camera still), the cards lifted over it, each real
 * proof changed in place on its card; the only cut is the carry into the 3 a.m. payoff, on a beat.
 */
export const sc = getScene("FIX");

const w = (line: string, word: string, which: "from" | "to" = "from", nth = 0) => sc.wordAt(line, word, which, nth);

// S16 · "Agents never edit the page. A person does: the rename is one click, with no AI."
const never = w("S16", "never");
const person16 = w("S16", "person");
const theRename = w("S16", "the", "from", 1);
const rename = w("S16", "rename");
const one = w("S16", "one");
const no = w("S16", "no");
const ai = w("S16", "ai", "to");
// S17 · "Our agent drafts the other change, a renamed timeout setting. Nothing changes until a person accepts."
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
const agents = w("S18", "agents");
const withRight = w("S18", "with");
const right = w("S18", "right");

export const T = {
  // ---- S16 ----------------------------------------------------------------------------------------------------------
  /** "AI agents · never edit the page": the status is written in on "never edit" (readable on the word). */
  readOnly: never - 3,
  never,
  /** "People · edit the page" lifts in on "A person does" (held to the carry: the readers are never covered). */
  personIn: person16 - 4,
  /** The quick fix card flies out of step 2's dead path and lands big on "rename" (the page racks back under it). */
  qfLift: theRename - 4,
  qfLand: rename - 2,
  rename,
  /** The card turns into the real one in place (p4-review-rec): the real click on "one click". */
  proofQ: one - 14,
  realClick: one - 2,
  one,
  /** Mist on the real "No AI used." on "no AI". */
  noAi: no - 4,
  /** Back to the card (now done), which flies back into step 2 as S16 ends: no "No AI" after S16. */
  proofQEnd: ai - 8,
  qfOut: ai - 2,
  ai,

  // ---- S17 ----------------------------------------------------------------------------------------------------------
  /** Our agent's draft flies out of "AI agents" and lands big on "drafts". */
  draftFly: drafts - 12,
  draftLand: drafts - 2,
  drafts,
  /** The change itself: the old name sits on the drift's amber from "renamed"; "_SECS" is written in on "timeout". */
  drift: renamed - 4,
  replace: timeout - 2,
  setting,
  /** The draft turns into the real one in place (p4-draft-diff); Mist on "Nothing changes until you accept.". */
  proofR: setting - 4,
  nothingMark: nothing - 4,
  nothing,
  /** Back to the card; the Accept fix button lifts under it on "until". */
  proofREnd: until - 7,
  acceptIn: until - 5,
  /**
   * The button turns into the real footer (p4-accept-rec at 11.97 s): the cursor's click on the real Accept fix lands on
   * "accepts" (the recording's own click, 12.373 s); then the same real panel shows "Accepted. A new page version names
   * PR #482." (the recording at 18 s).
   */
  proofA: accepts - 14,
  acceptClick: accepts - 2,
  accepts,
  get acceptedJump() {
    return this.acceptClick + 10;
  },
  /** The draft (our agent's, dimmed behind the real panel) leaves; the page comes forward with step 2 accepted. */
  get cardsOut() {
    return this.acceptClick + 18;
  },
  get morph() {
    return this.acceptClick + 26;
  },

  // ---- S18 ----------------------------------------------------------------------------------------------------------
  /** On "Verified" (snapBack) the page's byline slip-swaps to Verified with the snap, on the score's downbeat. */
  hit: s18,
  snapBack: sc.marker("snapBack"),
  bylineAt: verified - 3,
  verified,
  /** The same real panel moves to its own line "Verified by Razvan Statescu, just now." on "again" (never at the byline). */
  verifiedJump: again - 6,
  again,
  /** The real panel drops on "Now"; the agents read "Safe to cite" on "Now agents" (held to the carry, about 1.3 s). */
  proofAEnd: now - 8,
  now,
  citeAt: agents - 3,
  agents,
  /** Carry into the 3 a.m. payoff, out of step 2's command, on the beat before "with the right step". */
  payoff: sc.snap(withRight - 4),
  get clock() {
    return this.payoff + 6;
  },
  /** The underline crosses the command from here and lands about 2 frames before "right" (its tick at +6). */
  payoffMark: right - 6,
  /** The payoff's source chip and its chime (PayoffShot plays it at sourceAt + 2); JIRA plays the chime's tail. */
  payoffSource: right + 4,
  get payoffChime() {
    return this.payoffSource + 2;
  },
  right,
  end: sc.durationInFrames,
};
