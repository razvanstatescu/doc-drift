import { getScene } from "../../../lib/timeline";

/**
 * JIRA's cues in LOCAL frames (frame 0 = film 2550), from src/data/timeline.json, so a re-voice re-times the scene.
 * JIRA starts half a bar in (2550 % 60 === 30): local beats are multiples of 15, bars fall on 30, 90, 150, 210, 270 and
 * the end (330 = endHit). Events land 0 to 4 frames before their word (V4 M6); real clicks on beats where the word
 * allows.
 */
export const sc = getScene("JIRA");

const w = (line: string, word: string, which: "from" | "to" = "from", nth = 0) => sc.wordAt(line, word, which, nth);

// S19 · "Jira work counts too: close an epic, and the design page that still says it's planned gets flagged."
const jira = w("S19", "jira");
const close = w("S19", "close");
const epic = w("S19", "epic");
const design = w("S19", "design");
const that = w("S19", "that");
const planned = w("S19", "planned");
const gets = w("S19", "gets");
const flagged19 = w("S19", "flagged");
// S20 · "Turn a flag into a Jira task, and see every flagged page on one dashboard."
const s20 = sc.cue("S20");
const flag = w("S20", "flag");
const jira20 = w("S20", "jira");
const every = w("S20", "every");
const flagged20 = w("S20", "flagged");
const one = w("S20", "one");

export const T = {
  // ---- J1 · PAY-18, To Do to Done (p5-jira-rec) ------------------------------------------------------------------
  jira,
  /** The real click on the status "To Do" (2.318 s) 2 frames after the plain cut in: we cut on the action. */
  todoClick: jira - 1,
  /** The real click on "Done" (4.049 s) ... */
  doneClick: close - 17,
  /** ... the status saves (a spinner, ramped and labelled) and turns solid "Done" (5.95 s) just before "close". */
  doneSolid: close - 1,
  close,
  epic,
  /** The camera pushes onto "Decision: ADR-015." in the epic's description on "an epic"; Mist on "ADR-015.". */
  get push() {
    return this.carry - 18;
  },
  get adrMark() {
    return this.carry - 6;
  },

  // ---- J2 · the design page (p5-adr-flagged, then p5-adr-tooltip) ------------------------------------------------
  /**
   * Carry cut: ADR-015's page grows out of the word "ADR-015" (the window and a push through the word). The grow's
   * fastest frames (carry + 8 to 10) fall on "design".
   */
  carry: design - 10,
  carryDur: 16,
  /** The incoming camera lands on the reading pose. */
  get carryLand() {
    return this.carry + 22;
  },
  design,
  /** The spotlight moves to the Status row on "that still says". */
  statusSpot: that - 4,
  planned,
  plannedMark: planned - 4,
  /** "gets flagged": the drift's amber lands on the byline item, then the real tooltip shows the reason. */
  gets,
  flagAt: gets - 4,
  tipAt: gets + 3,
  flagged: flagged19,

  // ---- J3 · Create task -> "Jira task created" (p5-track-rec) ----------------------------------------------------
  /** Plain cut on the beat as S20 starts (the cursor already travelling to "Create task"). */
  j3: sc.snap(s20 - 2),
  /** The real click on "Create task" (14.447 s), on the beat after "flag". */
  createClick: sc.snap(flag + 2),
  /** The real result (17.083 s), after a labelled ramp over the spinner, 3 frames before "Jira task". */
  created: jira20 - 3,
  jira20,
  payMark: jira20 - 2,

  // ---- J4 · the dashboard (p5-dashboard-2, sample data) ----------------------------------------------------------
  /** Plain cut on the beat before "see every flagged page": the rows, big. */
  j4: sc.snap(every - 19),
  every,
  /** Mist on the column of real "Possibly stale" states on "flagged". */
  stateMark: flagged20 - 4,
  /** On "one dashboard" the camera pulls back to the whole dashboard (tiles and rows): the final, composed pose. */
  pull: one - 4,
  pullDur: 20,
  end: sc.durationInFrames,
};
