import { getScene } from "../../../lib/timeline";

/**
 * PROMISE's cues (v5, film 480 to 900, S06 and S07). Local frames = film - 480, all from timeline.json. Visual events
 * land (within 4 px of rest) 0 to 4 frames before the word they show.
 */
const sc = getScene("PROMISE");
const w = (line: string, word: string, nth = 0) => sc.wordAt(line, word, "from", nth);

export const PROMISE_T = {
  // ---- the turn (daySlip): PROBLEM's frozen last frame opens in the mark's three bands into Day ----
  /** The slip reveal has cleared on this frame. */
  reveal: 8,
  /** The carried path holds in place while the world turns, flies from here ... */
  fly: 5,
  /** ... and docks as the mark's middle band, in line with the D (the real band takes over here). */
  dock: 19,
  /** The tile fades in, the top and bottom bands wipe in. */
  tile: [1, 9] as const,
  land: [3, 16] as const,
  /** "Doc Drift" rises from its own mask (13 frames), readable as "Doc" is said. */
  name: w("S06", "doc") - 10,
  /** The middle band slips one unit and turns amber on "catches". */
  slip: w("S06", "catches") - 4,
  // ---- S06: who it is for; the logo holds about 3 s (round 2), then the page itself is "docs in Confluence" ----
  /** The camera pulls back from the lockup to make room for the line under it. */
  pull: w("S06", "for") - 14,
  line1: w("S06", "for") - 7,
  /** Cut on the beat to the Confluence page, its label "Confluence" readable as the word is said. */
  pageCut: sc.snap(w("S06", "confluence") - 1),
  gloss: w("S06", "atlassian") - 9,
  // ---- S07: the page over its code, one shot with the S06 tail ----
  codeAt: w("S07", "code") - 10,
  jiraAt: w("S07", "jira") - 9,
  slipAt: w("S07", "changes") - 5,
  /** The windows close (12 frames) once "changes" is said, and the Steps band takes the amber as they shut. */
  openDur: 12,
  closeAt: w("S07", "changes") + 6,
  bandAt: w("S07", "changes") + 16,
  bylineAt: w("S07", "flags") - 4,
  /** Back out from the flag to the page's head and the readers' column, before "people". */
  pullOut: w("S07", "for") - 16,
  people: w("S07", "people") - 6,
  agents: w("S07", "ai") - 6,
  /** "until someone checks": a person lands beside the byline's label on "until", its check on "checks". */
  person: w("S07", "until") - 5,
  check: w("S07", "checks") - 5,
  end: sc.durationInFrames,
};
