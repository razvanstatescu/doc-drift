import { measured } from "../../lib/captures";
import { getScene } from "../../lib/timeline";

/**
 * P2 · Flag: every event in LOCAL frames (frame 0 = film 2077), derived from the voice's word timings in
 * src/data/timeline.json, so a re-voice re-times the scene. Beats fall on local multiples of 15 (film frame % 15 = 7),
 * bars on multiples of 60. Visual events land 0 to 4 frames before their word (V4.md M6). R3 section 5 gives the
 * same plan in absolute film frames (subtract 2077).
 */
export const sc = getScene("P2");

/** Snap down to the beat at or before a local frame (proofs start on a beat). */
const beatAtOrBefore = (f: number) => Math.floor(f / 15) * 15;

const w13 = {
  now: sc.wordAt("V13", "now"),
  teammate: sc.wordAt("V13", "teammate"),
  merges: sc.wordAt("V13", "merges"),
  pull: sc.wordAt("V13", "pull"),
  renames: sc.wordAt("V13", "renames"),
  rollback: sc.wordAt("V13", "rollback"),
  script: sc.wordAt("V13", "script"),
  end: sc.cue("V13", "end"),
};
const w14 = {
  seconds: sc.wordAt("V14", "seconds"),
  runbook: sc.wordAt("V14", "runbook"),
  flagged: sc.wordAt("V14", "flagged"),
  exact: sc.wordAt("V14", "exact"),
  change: sc.wordAt("V14", "change"),
  end: sc.cue("V14", "end"),
};
const w15 = {
  start: sc.cue("V15"),
  no: sc.wordAt("V15", "no"),
  ai: sc.wordAt("V15", "ai"),
  made: sc.wordAt("V15", "made"),
  that: sc.wordAt("V15", "that"),
  call: sc.wordAt("V15", "call"),
  same1: sc.wordAt("V15", "same"),
  change: sc.wordAt("V15", "change"),
  same2: sc.wordAt("V15", "same", "from", 1),
  result: sc.wordAt("V15", "result"),
  every: sc.wordAt("V15", "every"),
  time: sc.wordAt("V15", "time"),
  end: sc.cue("V15", "end"),
};

/** The real merge recording (captures.json p2-merge-rec): the dialog's Merge (confirm) click and Merged. */
export const MERGE_REC = {
  /** R5 starts this far into the recording (the dialog is open and still). */
  dialogFrom: 4.88,
  /** The confirm click (clicks[1].atMs = 5178). */
  confirmAt: 5.178,
  /** Merged shows from 13.3 s (R3 section 6). */
  mergedFrom: 13.3,
} as const;

const r5 = beatAtOrBefore(w13.merges + 4); // 45, on "merges"
const r5Jump = r5 + 15; // 60, the bar: the wait from 5.38 s to 13.30 s is cut here (logged in README.md)

/** Frames a proof takes to wipe away (left to right, the slip's direction) while its twin comes back. */
export const WIPE = 4;

export const T = {
  w13,
  w14,
  w15,
  end: sc.durationInFrames,

  // ── V13 · the PR twin, the real merge, the rename ───────────────────────────────────────────────────────────────
  /** The cursor comes in, travels to the twin's Merge button and presses it 2 frames before "merges". */
  cursorIn: 8,
  mergePress: w13.merges - 2,
  /** R5: one proof. The real Merge dialog grows out of the twin's Merge button on the beat at "merges"... */
  r5,
  /** ...the real confirm click at its recorded time (5.178 s) and point, with the kit cursor... */
  r5Click: r5 + Math.round((MERGE_REC.confirmAt - MERGE_REC.dialogFrom) * 30),
  /** ...and a reframing jump on the bar to the Merged banner (13.30 s on, at 0.8). */
  r5Jump,
  /** R5 ends (39 frames: the dialog 15, Merged 24) and wipes away; the twin is back, Merged. */
  r5Out: r5Jump + 24,
  /** The twin reads Merged from the frame the proof showed it. */
  mergedAt: r5Jump,
  /** The rename row lifts out of the twin and grows into the 64 px literal, on "renames" (the camera pushes in). */
  renameLift: w13.renames - 2,
  /** `.sh` slides one unit right, then `-v2` drops into the gap in amber (lands before "rollback"). */
  renameSlide: w13.renames + 8,
  renameDrop: w13.renames + 12,
  /** R6: the real file header (p2-pr482-files), an amber match cut from the literal, on the beat at "script". */
  r6: beatAtOrBefore(w13.script),
  r6Out: beatAtOrBefore(w13.script) + 30,

  // ── The gap: the change record's journey, merge to flag ─────────────────────────────────────────────────────────
  /** The record pops out of the real header as R6 wipes away and rides its line; the PR card leaves; the camera tracks. */
  recordAt: beatAtOrBefore(w13.script) + 30,
  prOut: beatAtOrBefore(w13.script) + 27,
  /** The timer: "Merge to flag" counts from 0 and lands on the measured value with the flag. */
  timerIn: beatAtOrBefore(w13.script) + 42,
  /** Pulses as the record passes each station (on beats: 2 and 4 beats after it leaves); each leaves once passed. */
  relayAt: beatAtOrBefore(w13.script) + 60,
  matcherAt: beatAtOrBefore(w13.script) + 90,
  relayOut: beatAtOrBefore(w13.script) + 108,
  matcherOut: beatAtOrBefore(w13.script) + 118,
  /** The record reaches the runbook's left edge, level with the Steps band. */
  arrive: w14.flagged - 10,

  // ── V14 · the flag ──────────────────────────────────────────────────────────────────────────────────────────────
  /** The Steps band slips amber (6 frames) and lands 2 frames before "flagged"; the count lands with it. */
  flag: w14.flagged - 8,
  land: w14.flagged - 2,
  /** The byline swaps to "Possibly stale · Doc Drift" (the shared swap reads by at + 3, so 3 frames before the word). */
  bylineSwap: w14.flagged - 6,
  /** The amber hands off from the band to the byline as the byline swaps (director, round 2: handoff = byline.at). */
  handoff: w14.flagged - 6,
  /** The camera pushes onto the byline, landing on "flagged" (the line's one decisive push). */
  flagPush: w14.flagged - 14,
  tooltip: w14.flagged + 4,
  /** The record's line fades as a trace once the page has flagged. */
  lineOut: w14.flagged + 6,
  /** R7: the real byline and tooltip, by T3 from the twin's badge and tooltip, on the beat before "with the exact". */
  r7: beatAtOrBefore(w14.exact - 8),
  r7Out: beatAtOrBefore(w14.exact - 8) + 45,
  /**
   * "PR #482" lifts out of the twin tooltip once R7 has gone, hovers over the page (the flag's link to the matcher)
   * and carries into the matcher's input as the card arrives (R3 V14 to V15).
   */
  tokenLift: beatAtOrBefore(w14.exact - 8) + 45 + 8,
  tokenGo: w15.no + 6,
  dock: w15.no + 20,
  /** The number leaves upward as the statement's first word rises into the same place (the left never empties). */
  timerOut: w15.no - 12,
  /** V15's plane (statement, matcher card) exists from here: its camera starts square, its first word rises next. */
  v15: w15.no - 12,

  // ── V15 · the matcher ───────────────────────────────────────────────────────────────────────────────────────────
  /**
   * The matcher lifts in front of the page with its content (the rules pending), just after V15's first beat, so the
   * twin tooltip holds into it; the page racks out behind the card (R2 section 10).
   */
  matcherIn: w15.no + 10,
  /** Run 1: the rules tick, the score crosses the threshold, and the result lands on "call". */
  rows: [w15.no + 21, w15.no + 25, w15.no + 29] as const,
  score: w15.call - 12,
  result: w15.call - 6,
  /** The V15 camera's decisive push, landing on "call". */
  v15Push: w15.call - 8,
  zeroChip: w15.call + 4,
  evalLine: w15.call + 6,
  /** R8: the real why sentence and score (p4-panel), by T3 from the score line. */
  r8: beatAtOrBefore(w15.call + 5),
  r8Out: w15.change - 2,
  /** The same change runs again: on "change" its result lands exactly on the last on "result", and once more on "time". */
  runs: [
    { at: w15.change - 2, result: w15.result - 2 },
    { at: w15.every - 2, result: w15.time - 1 },
  ],
};

/** The measured number (captures.json measured.mergeToFlagSeconds), never typed by hand. */
export const MERGE_TO_FLAG = measured("mergeToFlagSeconds", 19);
