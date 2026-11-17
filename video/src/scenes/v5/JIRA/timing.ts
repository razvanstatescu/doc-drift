import { getScene } from "../../../lib/timeline";

/**
 * JIRA's cues in LOCAL frames (frame 0 = the scene's start in src/data/timeline.json), all from words, so a re-voice
 * re-times the scene. JIRA starts on a bar: local beats are multiples of 15, bars multiples of 60, and its end is
 * endHit (the kit's slip reveal into CLOSE). Events land 0 to 4 frames before their word (V4 M6).
 */
export const sc = getScene("JIRA");

const w = (line: string, word: string, which: "from" | "to" = "from", nth = 0) => sc.wordAt(line, word, which, nth);

// S19 · "Jira work counts too: close an epic, and the design page linked to it gets flagged."
const jira = w("S19", "jira");
const close = w("S19", "close");
const epic = w("S19", "epic", "to");
const design = w("S19", "design");
const linked = w("S19", "linked");
const gets = w("S19", "gets");
const flagged19 = w("S19", "flagged");
// S20 · "Turn a flag into a Jira task, and see every flagged page on one dashboard."
const turn = w("S20", "turn");
const into = w("S20", "into");
const jira20 = w("S20", "jira");
const task = w("S20", "task");
const and20 = w("S20", "and");
const see = w("S20", "see");
const every = w("S20", "every");
const flagged20 = w("S20", "flagged");
const page20 = w("S20", "page");
const one = w("S20", "one");

export const T = {
  // ---- J · the Jira chain: PAY-18, the anchor, ADR-015 flagged, the task (0 .. d) -------------------------------
  /** The plain cut from FIX's payoff lands on PAY-18 (the line starts a second later, on "Jira"). */
  j: 0,
  jira,
  /** "close an epic": the status goes To Do to Done (a person's click), then the real Done as a short proof. */
  doneClick: close - 4,
  close,
  proofJ: close + 6,
  get proofJEnd() {
    return this.proofJ + 26;
  },
  epic,
  /** "the design page": the camera opens to ADR-015, the page PAY-18's description names. */
  open: design - 10,
  design,
  /** "linked to it": the anchor line draws from PAY-18 to the page, and the change runs along it. */
  link: linked - 3,
  linked,
  /** "gets flagged": the page's table band slips amber and hands it to the byline item, then the tooltip. */
  slip: gets - 2,
  bylineAt: flagged19 - 5,
  tipAt: flagged19,
  flagged: flagged19,
  /** The real byline and tooltip (p5-adr-tooltip) as a short proof. */
  proofA: flagged19 + 8,
  get proofAEnd() {
    return turn - 2;
  },
  /** "Turn a flag into a Jira task": the page's Track in Jira, a person's click on "into", the task on "Jira task". */
  turn,
  trackIn: turn + 2,
  createClick: into - 2,
  created: jira20 - 3,
  /** PAY-24, big, joins the chain on "task". */
  pay24: task - 4,
  task,

  // ---- D · every flagged page, one dashboard (d .. end) --------------------------------------------------------
  /** Locked push to the dashboard on "and see". */
  d: and20 - 4,
  dDur: 14,
  /** The KPI cards drop and count up on "see"; the rows set in on "every"; the drift's amber on the states on "flagged". */
  kpi: see - 6,
  rows: every - 6,
  every,
  amber: flagged20 - 4,
  /** The real rows as a short proof on "page". */
  proofD: page20 - 6,
  get proofDEnd() {
    return one - 3;
  },
  /** "one dashboard": the camera pulls back to the whole dashboard and holds the final pose. */
  pull: one - 4,
  pullDur: 18,
  end: sc.durationInFrames,
};
