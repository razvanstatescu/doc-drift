import { FPS } from "../../../lib/time";
import { getScene } from "../../../lib/timeline";
import { remap, takeKeys, type RemapKey } from "../../../v4/kit";

/**
 * LOOP timing (v5, film 900 to 1575, S08 to S12). Every frame is LOCAL (film minus 900) and comes from the voice's word
 * timings in timeline.json; source seconds are the measured events of the Nov 13 captures. LOOP starts on a bar, so a
 * local frame divisible by 15 is a beat of the score.
 */
export const sc = getScene("LOOP");
const word = (line: string, prefix: string) => sc.wordAt(line, prefix);

/** The spoken words the picture lands on (each event 0 to 4 frames before its word). */
export const WORD = {
  rewind: word("S08", "rewind"), // 3
  week: word("S08", "week"), // 18
  doc: word("S08", "doc"), // 45
  links: word("S08", "links"), // 64
  script: word("S08", "script"), // 97
  jira: word("S08", "jira"), // 117
  save: word("S09", "save"), // 169
  page9: word("S09", "page"), // 196
  verified: word("S09", "verified"), // 212
  then: word("S10", "then"), // 243
  rename: word("S10", "rename"), // 254
  merged: word("S10", "merged"), // 274
  bitbucket: word("S10", "bitbucket"), // 290
  pull: word("S10", "pull"), // 323
  n482: word("S10", "482"), // 346
  nineteen: word("S11", "19"), // 393
  page11: word("S11", "page"), // 440
  says: word("S11", "says"), // 450
  possibly: word("S11", "possibly"), // 469
  it11: word("S11", "it"), // 512
  it12: word("S12", "it"), // 557
  names: word("S12", "names"), // 562
  exact: word("S12", "exact"), // 575
  no: word("S12", "no"), // 628
};

/** Measured source seconds (captures.json clicks; R6 section 7; frame scans of the recordings). */
export const SRC = {
  /** p1-anchor-rec: the tick on scripts/rollback.sh, the click on "Save and mark verified". */
  tick: 12.263,
  save: 14.698,
  /** p2-merge-rec: the confirm click in the Merge dialog, "Merged", the last frame. */
  mergeClick: 5.178,
  merged: 12.7,
  mergeEnd: 15.85,
};

const merge = sc.snap(WORD.merged - 2); // 270: the confirm click on a beat, 4 frames before "merged"

export const T = {
  // S08: the rewind lands on the bar's second beat, where the real block starts
  rewindAt: 1,
  rewindDur: 28,
  weekChip: WORD.week - 4, // 14: "Last week" lands on "week"
  real: sc.snap(WORD.week + 10), // 30
  rowsSpot: sc.snap(WORD.script - 4) - 3, // 87: the spotlight narrows to the two suggestions as the cursor arrives
  tick: sc.snap(WORD.script - 4), // 90: the real tick on scripts/rollback.sh, on a beat
  markScript: WORD.script - 3, // 94
  markJira: WORD.jira - 3, // 114
  saveSpot: WORD.save - 29, // 140: the camera and the spotlight go down to the button
  // S09
  save: sc.snap(WORD.save - 2), // 165: the real click on "Save and mark verified", on a beat
  cut1: WORD.page9 - 1, // 195: cut on the score's backbeat (the button busy after the click) to the page, on "page"
  verifiedSpot: WORD.verified - 3, // 209
  // S10: one directed take from the dialog to the flag
  cut2: sc.snap(WORD.then - 3), // 240: plain cut on the line, on a beat
  markRename: WORD.rename - 4, // 250
  bitbucketChip: WORD.bitbucket - 3, // 287: the context label lands on "Bitbucket"
  merge, // 270
  merged: merge + 45, // 315: "Merged" on a beat (the ramp's keys put it there)
  bannerSpot: merge + 6, // 276
  punch: merge + 47, // 317: punch-in on "Merged pull request ... (pull request #482)"
  mark482: WORD.pull - 4, // 319
  grow2: WORD.n482 + 24, // 370: the page opens out of the clock as "482" ends
  grow2Dur: 24,
  // S11
  rampFrom: 385, // the clock ramps from 1x here (the merge footage ends at 15.85 s: the window has covered it by then)
  silence: WORD.page11 - 1, // 439: the score's half bar of silence; the clock runs 1x from 18 to 19
  headSpot2: WORD.page11 - 3, // 437
  badgeSpot: WORD.says - 4, // 446
  flag: sc.marker("flag"), // 469
  note: sc.marker("flag") + 25, // 494: "Measured on the demo site, Nov 13" sets under the landed clock, during "stale"
  gloss: WORD.it11 - 3, // 509: "it may be out of date" under the label
  // S12
  click3: sc.snap(WORD.it12 - 2) - 1, // 554: the click on the label
  cut3: sc.snap(WORD.it12 - 2), // 555: cut on the click, on the beat, 2 frames before "It"
  panelSpot: WORD.names - 2, // 560
  markExact: WORD.exact - 4, // 571
  dim: WORD.no - 4, // 624
  end: sc.durationInFrames, // 675
};

/** p1-anchor-rec: the tick and the Save click land on their beats; 1x before and after (0.97x between, unseen). */
export const DIALOG_KEYS: RemapKey[] = [
  { f: T.tick, t: SRC.tick },
  { f: T.save, t: SRC.save },
];

/** p2-merge-rec around the click and "Merged": 1x for 0.3 s around each, the wait between ramped (peak about 8x). */
const MERGE_KEYS: RemapKey[] = takeKeys(
  [
    { f: T.merge, t: SRC.mergeClick },
    { f: T.merged, t: SRC.merged },
  ],
  { label: "LOOP merge" },
);
const AFTER_MERGED = MERGE_KEYS[MERGE_KEYS.length - 1]; // 319.5, 12.85 s

/**
 * The honest clock: real seconds since the confirm click. The merge footage plays at the same clock (so the clock and
 * the picture never disagree); after it, the page's wait ramps on a raised-cosine rate from 1x to a peak and back to
 * 1x, landing 18 s on the half-bar silence; then 1x to 19 on the flag (the measured 18.6 s, rounded), and it stops.
 */
function clockRaw(f: number): number {
  if (f <= AFTER_MERGED.f) return remap(f, MERGE_KEYS) - SRC.mergeClick;
  const c0 = AFTER_MERGED.t - SRC.mergeClick + (Math.min(f, T.rampFrom) - AFTER_MERGED.f) / FPS;
  if (f <= T.rampFrom) return c0;
  const L = T.silence - T.rampFrom;
  const cStart = AFTER_MERGED.t - SRC.mergeClick + (T.rampFrom - AFTER_MERGED.f) / FPS;
  const delta = 18 - cStart;
  const peak = 2 * ((delta * FPS) / L - 1) + 1;
  if (f <= T.silence) {
    const x = f - T.rampFrom;
    // integral of 1 + (peak - 1) (1 - cos(2 pi x / L)) / 2, in seconds
    const integral = x + ((peak - 1) / 2) * (x - (L / (2 * Math.PI)) * Math.sin((2 * Math.PI * x) / L));
    return cStart + integral / FPS;
  }
  if (f < T.flag) return 18 + (f - T.silence) / FPS;
  return 19;
}

export const clockAt = (f: number) => Math.max(0, clockRaw(f));

/** The clock's rate at a frame (1 = real time). */
export const clockRate = (f: number) => (clockRaw(f + 0.5) - clockRaw(f - 0.5)) * FPS;

/** The rounded peak rate of the ramp a frame is in (what the speed label says), or 0 outside a ramp. */
export function clockPeak(f: number): number {
  const ramps: [number, number][] = [
    [T.merge + 4.5, T.merged - 4.5],
    [T.rampFrom, T.silence],
  ];
  for (const [a, b] of ramps) {
    if (f < a || f > b) continue;
    let peak = 1;
    for (let g = a; g <= b; g += 0.5) peak = Math.max(peak, clockRate(g));
    return Math.round(peak);
  }
  return 0;
}

/**
 * The merge footage's source seconds, sampled every frame from the cut to the end of the reveal (it follows the clock;
 * it never passes the recording's last frame before the reveal has covered it).
 */
export const MERGE_VIDEO_KEYS: RemapKey[] = (() => {
  const keys: RemapKey[] = [];
  for (let f = T.cut2 - 2; f <= T.grow2 + T.grow2Dur + 2; f++) keys.push({ f, t: Math.min(SRC.mergeEnd, clockRaw(f) + SRC.mergeClick) });
  return keys;
})();
