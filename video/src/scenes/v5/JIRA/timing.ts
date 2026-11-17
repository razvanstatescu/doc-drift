import { getScene } from "../../../lib/timeline";

/**
 * JIRA's cues in LOCAL frames (frame 0 = the scene's start in src/data/timeline.json), all from words, so a re-voice
 * re-times the scene. JIRA starts on a bar: local beats are multiples of 15, bars multiples of 60, and its end is
 * endHit (the kit's slip reveal into CLOSE). Events land 0 to 4 frames before their word (V4 M6).
 *
 * Round 3: FIX's 3 a.m. payoff stays on screen over the seam and under S19's first words; a slip leaves Night so the
 * Jira chain is open on "Jira". One still world for S19 and the first half of S20 (the chain, the flag, the task), each
 * real proof changed in place on its element; one push to the dashboard, which then holds to the end.
 */
export const sc = getScene("JIRA");

const w = (line: string, word: string, which: "from" | "to" = "from", nth = 0) => sc.wordAt(line, word, which, nth);

// S19 · "Jira work counts too: close an epic, and the design page linked to it gets flagged."
const jira = w("S19", "jira");
const close = w("S19", "close");
const design = w("S19", "design");
const linked = w("S19", "linked");
const gets = w("S19", "gets");
const flagged19 = w("S19", "flagged");
// S20 · "Turn a flag into a Jira task, and see every flagged page on one dashboard."
const turn = w("S20", "turn");
const into = w("S20", "into");
const jira20 = w("S20", "jira");
const see = w("S20", "see");
const every = w("S20", "every");
const flagged20 = w("S20", "flagged");

export const T = {
  // ---- the payoff, held over the seam -------------------------------------------------------------------------------
  /** The slip out of Night starts here (its latch on this frame); the bands have left 8 frames later, on "Jira". */
  slip: jira - 9,
  get open() {
    return this.slip + 8;
  },
  jira,

  // ---- S19 · the Jira chain -----------------------------------------------------------------------------------------
  /** A person's cursor comes to the status; To Do turns Done on "close an epic". */
  cursorIn: close - 22,
  doneClick: close - 4,
  close,
  /** ADR-015 lifts in on "the design page" (landed 2 frames before "design"), and its link to PAY-18 draws as it lands. */
  adrIn: design - 14,
  get adrLand() {
    return this.adrIn + 12;
  },
  get linkAt() {
    return this.adrIn + 12;
  },
  design,
  /** On "linked" the change runs along the link from PAY-18's Done to the page. */
  pulse: linked - 4,
  linked,
  /** "gets flagged": the page's table band slips amber (on "gets") and hands the amber to the byline (on "flagged"). */
  slipFlag: gets - 4,
  bylineAt: flagged19 - 3,
  get tipAt() {
    return this.bylineAt + 6;
  },
  /** The real byline and tooltip (p5-adr-tooltip) in place, 24 frames, then back to the twin. */
  get proofA() {
    return this.tipAt + 8;
  },
  get proofAEnd() {
    return this.proofA + 24;
  },

  // ---- S20 · the task, then the dashboard -------------------------------------------------------------------------
  /** The page's Track in Jira lifts out on "Turn a flag"; a person's click on Create Jira task on "into". */
  trackIn: turn - 6,
  createClick: into - 2,
  /** "Jira task created" on "a Jira task", then the real notice (p5-track-created) in place. */
  created: jira20 - 3,
  get proofT() {
    return this.created + 1;
  },
  /** The push to the dashboard (the real notice rides out with it), mid-push on the beat. */
  get push() {
    return this.proofT + 23;
  },
  pushDur: 12,
  /** The dashboard: the KPIs count up on "see", the drift's amber on the states on "every flagged page". */
  kpi: see - 4,
  amber: every - 4,
  /** The real rows (p5-dashboard-2) in place on "flagged page", then back to the twin, which holds to endHit. */
  proofD: flagged20 + 1,
  get proofDEnd() {
    return this.proofD + 28;
  },
  end: sc.durationInFrames,
};
