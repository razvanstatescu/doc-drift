import { getScene } from "../../lib/timeline";

/**
 * P4's cues in LOCAL frames (frame 0 = film 3277), derived from src/data/timeline.json, so a re-voice re-times the
 * scene. P4 starts on a bar (3277 % 60 === 37), so local beats are multiples of 15 and `sc.snap` keeps proofs on them.
 * Events land 0 to 4 frames before their word (V4.md M6). R3's film frames are in brackets (local = film - 3277).
 */
export const sc = getScene("P4");

const w = (line: string, word: string, which: "from" | "to" = "from", nth = 0) => sc.wordAt(line, word, which, nth);
/** The first beat at or after a local frame. */
const beatAtOrAfter = (f: number) => {
  const b = sc.snap(f);
  return b >= f ? b : b + 15;
};

// V19 · "The page owner gets one comment, and opens the review."  [3292..3386]
const owner = w("V19", "owner");
const one = w("V19", "one");
const comment = w("V19", "comment");
const opens = w("V19", "opens");
const review = w("V19", "review");
// V20 · "A rename gets a one-click fix, with no AI."  [3427..3521]
const v20 = sc.cue("V20");
const rename = w("V20", "rename");
const oneClick = w("V20", "one");
const no = w("V20", "no");
const ai = w("V20", "ai", "to");
// V21 · "For anything bigger, Drift Reviewer drafts the edit. Nothing changes until a person accepts."  [3562..3742]
const v21 = sc.cue("V21");
const bigger = w("V21", "bigger");
const drift = w("V21", "drift");
const drafts = w("V21", "drafts");
const edit = w("V21", "edit");
const nothing = w("V21", "nothing");
const person = w("V21", "person");
const accepts = w("V21", "accepts");
// V22 · "Verified. Now the agent can cite it."  [3757..3836]
const back = sc.marker("snapBack");
const verified = w("V22", "verified");
const now = w("V22", "now");
const cite = w("V22", "cite");

export const T = {
  // ---- World A: the comment, then the byline -------------------------------------------------------------------
  /** The comment card rises on "The page owner" (lands 2 f before "page"). */
  commentLift: w("V19", "page") - 16,
  /** The mention pops on "owner". */
  pop: owner - 3,
  owner,
  one,
  comment,
  /** "One comment." set whole on the beat before "one" with a push (QA K-7, P-1: it holds to the whip, 46 f). */
  oneAt: sc.snap(owner),
  get oneOut() {
    return this.whip;
  },
  /** P-5: one push onto the why sentence while the panel holds flat, before the travel to Quick fix. */
  get flatPush() {
    return this.flat - 4;
  },
  /** R13 [3322]: a beat before "comment", by MorphToReal from the comment's body. 27 f (whip at its end). */
  r13: beatAtOrAfter(comment - 13),
  get r13End() {
    return this.whip - 4;
  },
  /** The whip up to the byline (seam), 9 f: lands a few frames before the click on "opens". */
  whip: opens - 6,
  /** The cursor clicks the byline's item on "opens" [3365]; the zoom-through follows. */
  click: opens - 1,
  get zoom() {
    return this.click + 1;
  },
  review,

  // ---- World B: the exploded review panel ---------------------------------------------------------------------
  /** The stack has folded flat by here (read square). */
  get flat() {
    return this.zoom + 30;
  },
  /** The camera travels down the panel to Quick fix, the stack opening a little while it moves. */
  travel: rename - 22,
  /** The Quick fix card breaks out and turns flat to camera, landing 0 to 4 f before "rename" [3432] (QA: was 5 early). */
  breakout: rename - 9,
  rename,
  /** The cursor travels to Replace in 1 place (the click itself is the real one, in R14). */
  cursorIn: rename + 6,
  /**
   * R14 [3457]: the real click (p4-review-rec 38.308 s) lands on "one-click": the segment starts at 38.24 s, so the
   * click is 2 f in, on the word. Cut on the next beat to the result (41.60 s), 15 f.
   */
  r14: beatAtOrAfter(oneClick - 4),
  r14Src: 38.24,
  get r14Click() {
    return this.r14 + Math.round((38.308 - 38.2) * 30);
  },
  get r14Cut() {
    return this.r14 + 15;
  },
  /** 25 f: the proof is gone (its 8 f drop) before "No AI used." lifts out of the card. */
  get r14End() {
    return this.r14 + 25;
  },
  /** A copy of "No AI used." lifts out of the card (6 f, expo out) and lands as big type on "no" [3500]. */
  noAiLift: no - 7,
  noAiLand: no - 1,
  no,
  ai,
  /** The big type leaves (10 f; it must be gone before V21: "No AI" is only for the rename fix). Still 47 f first. */
  noAiOut: v21 - 16,
  v20,

  // ---- V21: Proposed fix, the drafts --------------------------------------------------------------------------
  /** The quick fix card settles back and Proposed fix comes forward. */
  proposeIn: v21 - 12,
  v21,
  /** The cursor clicks Propose fix on "bigger" [3582]. */
  proposeClick: bigger - 2,
  /** The signal reaches the small Drift Reviewer card; its review rows tick; a person confirms. */
  agentIn: bigger + 2,
  drift,
  get rows() {
    return [drift - 2, drift + 3];
  },
  confirm: drift + 10,
  /** P-2: Drift Reviewer's card lifts to hero size for one beat while its rows tick and a person confirms. */
  get heroUp() {
    return this.rows[0] - 8;
  },
  get heroBack() {
    return this.confirm + 2;
  },
  /** The drafts fly back and land in the panel as diffs on "drafts the edit" [3605..3645]. */
  draft1: drafts - 10,
  draft2: drafts - 6,
  drafts,
  edit,
  /** R15 [3637]: by MorphToReal from draft 2; it ends as the whip to the side view starts (31 f). */
  r15: beatAtOrAfter(drafts + 6),
  get r15End() {
    return this.side - 5;
  },
  /** The whip into the exploded side view (seam) on "Nothing": the V21 statement starts with it. */
  get side() {
    return nothing;
  },
  nothing,
  changes: w("V21", "changes"),
  until: w("V21", "until"),
  a21: w("V21", "a", "from", 1),
  /** The footer card (Accept fix) lifts in, square, as the side view lands; the cursor travels to it. */
  get footerIn() {
    return this.side + 2;
  },
  person,
  accepts,
  /**
   * R16 [3727]: the real click on Accept fix (p4-accept-rec 12.373 s) lands on "accepts": the segment starts so the
   * click is on the word; cut on the next beat to "Accepted." (18.00 s: the panel re-renders with the notice at the top
   * from 17.88 s, not 17.60 s as R3 has it).
   */
  r16: beatAtOrAfter(accepts - 12),
  get r16Src() {
    return 12.373 - (accepts - this.r16) / 30;
  },
  get r16Click() {
    return accepts;
  },
  get r16Cut() {
    return this.r16 + 15;
  },
  get r16End() {
    return this.r16 + 30;
  },

  // ---- V22: the snap back, Safe to cite, the tail --------------------------------------------------------------
  /** snapBack [3757]: the drafts land as solid blocks, the band snaps home over 8 f (the score's hit), Verified. */
  back,
  verified,
  /** The byline's slip swap: readable by +3, so "Verified · Doc Drift" reads 2 f before "Verified." [3760]. */
  bylineAt: verified - 5,
  /** P-3: one decisive push (0.72 to 1.0, 1.39x) onto the byline as it swaps on the hit, the Steps band in shot. */
  push: back - 4,
  /** V21's statement completes on "until" (the rest of the line set whole) and rides into the payoff (P-1). */
  get v21Out() {
    return verified + 24;
  },
  /** P1's "✓ Verified." (same size and place, the rhyme with V12) lands on "Verified." and holds 47 f. */
  get verifiedOut() {
    return verified + 51;
  },
  /** R17 [3772]: by MorphToReal from the byline item. 30 f. */
  r17: beatAtOrAfter(verified + 10),
  get r17End() {
    return this.r17 + 30;
  },
  now,
  /** The terminal rises in from below on "agent" [3806], its command already typed (its tag clears "✓ Verified."). */
  term: w("V22", "agent") + 3,
  /** The output streams from here (60 lines/s), done well before "cite". */
  get outAt() {
    return this.term + 4;
  },
  cite,
  /** "Safe to cite." set whole on the beat before "cite" with a push (QA K-7). */
  citeAt: sc.snap(cite),
  /** The tail (no voice): R18 the page history, then R19 step 2 as it now reads. */
  get r18() {
    return beatAtOrAfter(cite + 50);
  },
  get r18End() {
    return this.r18 + 24;
  },
  get r19() {
    return this.r18 + 30;
  },
  end: sc.durationInFrames,
};
