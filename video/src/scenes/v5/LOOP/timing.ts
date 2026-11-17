import { FPS } from "../../../lib/time";
import { getScene } from "../../../lib/timeline";
import { remap, takeKeys, type RemapKey } from "../../../v4/kit";

/**
 * LOOP timing (v5 round 2, film 900 to 1620, S08 to S12). Every frame is LOCAL (film minus 900) and comes from the
 * voice's word timings in timeline.json; source seconds are the measured events of the Nov 13 captures. LOOP starts on
 * a bar, so a local frame divisible by 15 is a beat. Marks start 6 frames before their word (a sweep reads from about
 * its 4th frame), cuts and clicks 1 to 4 frames before.
 */
export const sc = getScene("LOOP");
const word = (line: string, prefix: string) => sc.wordAt(line, prefix);

/** The spoken words the picture lands on. */
export const WORD = {
  rewind: word("S08", "rewind"), // 3
  week: word("S08", "week"), // 18
  links: word("S08", "links"), // 64
  script: word("S08", "script"), // 97
  jira: word("S08", "jira"), // 117
  save: word("S09", "save"), // 169
  page9: word("S09", "page"), // 196
  verified: word("S09", "verified"), // 212
  then: word("S10", "then"), // 243
  rename: word("S10", "rename"), // 254
  merged: word("S10", "merged"), // 274
  pull: word("S10", "pull"), // 323
  n482: word("S10", "482"), // 346
  seconds: word("S11", "seconds"), // 407
  later: word("S11", "later"), // 419
  page11: word("S11", "page"), // 440
  possibly: word("S11", "possibly"), // 469
  stale: word("S11", "stale"), // 488
  it11: word("S11", "it"), // 512
  it12: word("S12", "it"), // 557
  exact: word("S12", "exact"), // 575
  tells: word("S12", "tells"), // 614
  owner: word("S12", "owner"), // 636
  no: word("S12", "no"), // 664
};

/** Measured source seconds (captures.json clicks; frame scans of the recordings). */
export const SRC = {
  /** p1-anchor-rec: the click on "Save and mark verified". */
  save: 14.698,
  /** p2-merge-rec: the confirm click in the Merge dialog, "Merged", the last frame. */
  mergeClick: 5.178,
  merged: 12.7,
  mergeEnd: 15.85,
};

const merge = sc.snap(WORD.merged - 2); // 270: the confirm click on a beat, 4 frames before "merged"
const flag = sc.marker("flag"); // 469: the score's band and sub hit; the real label flips on "Possibly"

export const T = {
  // S08: the rewind starts on "Rewind"; the real block starts on the beat after "week"
  rewindAt: 1,
  rewindDur: 26,
  weekChip: WORD.week - 4, // 14
  real: sc.snap(WORD.week + 10), // 30
  markSuggest: WORD.links - 6, // 58: "Suggested from this page": Doc Drift found them, as "links the page to" is said
  rowsIn: WORD.script - 15, // 82: the two suggestions rise under the heading as "to the script" is said
  markScript: WORD.script - 5, // 92
  markJira: WORD.jira - 5, // 112
  pushA: WORD.jira + 7, // 124: the excerpts' one push-in, to reading size, through "it names"
  // S09
  cutB: WORD.save - 13, // 156: the button (the suggestions held as long as the click allows)
  save: sc.snap(WORD.save - 2), // 165: the real click on "Save and mark verified", on a beat
  cut1: WORD.page9 - 1, // 195: cut on the score's backbeat to the page's real label, on "page"
  markVerified: WORD.verified - 6, // 206
  // S10 and S11: one take, from the merge dialog to the flag
  cut2: sc.snap(WORD.then - 3), // 240
  markRename: WORD.rename - 6, // 248: "Rename rollback script" in the commit message
  markTimeout: WORD.merged + 22, // 296: "and timeout variable" in the PR title (S17's "other change", set up)
  merge, // 270
  merged: merge + 45, // 315: "Merged" on a beat (the ramp's keys put it there)
  punch: merge + 47, // 317: the take's one push-in, onto "Merged pull request ... (pull request #482)"
  punchDur: 34,
  mark482: WORD.pull - 6, // 317
  grow2: WORD.n482 + 6, // 352: the page opens out of "(pull request #482)", its label in the same place
  grow2Dur: 20,
  clock18: WORD.seconds - 2, // 405: the clock reads 18 on "seconds" (even pacing from "Merged"), and 19 on the flip
  note: WORD.stale + 6, // 494: "Measured on the demo site, Nov 13" sets under the landed clock
  leanIn: WORD.seconds, // 407: the page leans in to the label through the score's silence, landing on the flag
  flag, // 469
  liftDur: 18, // the crafted label lands 487, in the gap before "stale"
  latch: WORD.stale - 3, // 485: the slip's latch as the lifted label lands, off the words
  gloss: WORD.it11 - 6, // 506: "it may be out of date" under the lifted label
  approach: WORD.it11 + 10, // 522: the camera follows the cursor to the real label
  // S12
  click3: sc.snap(WORD.it12 + 13) - 2, // 568: the click on the real label, as "It names" ends
  cut3: sc.snap(WORD.it12 + 13), // 570: cut on it, on the beat, to the review panel's first line ("the exact change")
  markExact: WORD.exact - 5, // 570
  comment: WORD.tells - 6, // 608: the owner's comment rises under the panel line
  markOwner: WORD.owner - 6, // 630
  dim: WORD.no - 4, // 660: the panel dims as "No AI made that call." starts
  end: sc.durationInFrames, // 720
};

/** p1-anchor-rec around the Save click: 1x. */
export const SAVE_KEYS: RemapKey[] = [{ f: T.save, t: SRC.save }];

/** p2-merge-rec around the click and "Merged": 1x for 0.3 s around each, the wait between sped up (no label: the
 * clock beside it reads real time). */
const MERGE_KEYS: RemapKey[] = takeKeys(
  [
    { f: T.merge, t: SRC.mergeClick, hold: 0.2 }, // a short hold: the dialog closes on the merge marker
    { f: T.merged, t: SRC.merged },
  ],
  { label: "LOOP merge" },
);
const AFTER_MERGED = MERGE_KEYS[MERGE_KEYS.length - 1]; // 319.5, 12.85 s

/**
 * The honest clock: real seconds since the confirm click ("Real time since the merge"). The merge footage plays on the
 * same clock (they never disagree). After "Merged" it counts at an even pace to 18 on "seconds", then on to 19 exactly
 * on the flip (the measured 18.6 s, rounded): it never sits on 19 while the page still reads Verified. After the flip it
 * holds 19, labelled "Merge to flag".
 */
function clockRaw(f: number): number {
  if (f <= AFTER_MERGED.f) return remap(f, MERGE_KEYS) - SRC.mergeClick;
  const c0 = AFTER_MERGED.t - SRC.mergeClick; // 7.67 s
  if (f <= T.clock18) return c0 + ((18 - c0) * (f - AFTER_MERGED.f)) / (T.clock18 - AFTER_MERGED.f);
  if (f < T.flag) return 18 + (f - T.clock18) / (T.flag - T.clock18);
  return 19;
}

export const clockAt = (f: number) => Math.max(0, clockRaw(f));

/**
 * The merge footage's source seconds, every frame from the cut to the end of the reveal: it follows the clock, and holds
 * its last frame for the reveal's last frames (the page is static there and the window has nearly covered it).
 */
export const MERGE_VIDEO_KEYS: RemapKey[] = (() => {
  const keys: RemapKey[] = [];
  let last = -1;
  for (let f = T.cut2 - 2; f <= T.grow2 + T.grow2Dur + 2; f++) {
    const t = Math.min(SRC.mergeEnd, clockRaw(f) + SRC.mergeClick);
    keys.push({ f, t: t <= last ? last + 1e-4 : t });
    last = keys[keys.length - 1].t;
  }
  return keys;
})();
