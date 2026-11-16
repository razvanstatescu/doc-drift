import { getScene } from "../../lib/timeline";

/**
 * P5's cues in LOCAL frames (frame 0 = film 3937), from src/data/timeline.json word timings. P5 starts on a bar, so
 * local beats are multiples of 15. Events land 0 to 4 frames before their word (V4.md M6). R3's film frames are in
 * brackets (local = film - 3937). Show no number for the Jira flag time (R3 risk 7).
 */
export const sc = getScene("P5");

const w = (word: string, which: "from" | "to" = "from", nth = 0) => sc.wordAt("V23", word, which, nth);
const beatAtOrAfter = (f: number) => {
  const b = sc.snap(f);
  return b >= f ? b : b + 15;
};

// V23 · "Jira changes count too. And every space gets a drift dashboard."  [3952..4084]
const jira = w("jira");
const changes = w("changes");
const count = w("count");
const every = w("every");
const space = w("space");
const drift = w("drift");
const dashboard = w("dashboard");

export const T = {
  /** The slip push out of P4's last pose (T5), 12 f. */
  push: 0,
  jira,
  /** "Jira changes count too." set whole on the beat as the line starts, with a push (QA K-7, P-1: 71 f). */
  jiraAt: sc.snap(jira),
  /** PAY-18 flips To Do -> Done on "changes" [3965]; the change runs along the anchor to ADR-015. */
  done: changes - 4,
  changes,
  /** ADR-015's table band slips amber on "count" [3977] and hands the amber to its byline item. */
  slip: count - 6,
  count,
  get handoff() {
    return this.count + 4;
  },
  /** R20 [3997]: the split proof, the Jira strip above the ADR byline and tooltip, joined by a drawn line. */
  r20: beatAtOrAfter(count + 14),
  get r20End() {
    return this.r20 + 28;
  },
  /** The slip push to the dashboard: "every space" (its title is in by "space"). */
  get dash() {
    return Math.min(every + 3, this.r20End - 2);
  },
  space,
  /** KPI cards drop flat and roll; the rows set in; ADR-015's row slips on "drift". */
  get kpi() {
    return this.dash + 12;
  },
  drift,
  /** ADR-015's row slips (6 f) and lands 0 to 2 f before "drift" [4053]. */
  rowSlip: drift - 6,
  dashboard,
  /** "gets a drift dashboard." lands whole on "gets" (P-1: the line completes a beat earlier). */
  gets: w("gets"),
  /** R21 [4057]: by MorphToReal from the KPI row. 40 f. */
  get r21() {
    return beatAtOrAfter(this.kpi + 18);
  },
  get r21End() {
    return this.r21 + 40;
  },
  /** Track in Jira (no voice): the push, the click, "Jira task created". It starts 6 f after R21 so the dashboard's
   *  statement holds (P-1), and keeps R22 on the 195 beat. */
  get track() {
    return this.r21End + 6;
  },
  get click() {
    return this.track + 15;
  },
  get created() {
    return this.click + 6;
  },
  /** P-4: one push onto "Jira task created" and "PAY-24 tracks this change." */
  get noticePush() {
    return this.created + 2;
  },
  /** R22 [4132]: by MorphToReal from the created message. 30 f. */
  get r22() {
    return beatAtOrAfter(this.created + 8);
  },
  get r22End() {
    return this.r22 + 30;
  },
  end: sc.durationInFrames,
};
