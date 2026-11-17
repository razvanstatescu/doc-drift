import { getScene } from "../../../lib/timeline";

/**
 * AGENTS (v5 round 2, S13 to S15; V5.md sections 5 and 8): every frame local, from cues in src/data/timeline.json.
 * The scene starts on a bar, so beats sit on local multiples of 15 and bars on multiples of 60 (S15 starts on one).
 * A word lands 0 to 4 frames before it is said: a word's mask reveal (12 frames, expo out) starts LEAD frames before
 * it, so it is readable 4 frames before and settled 2 before.
 */
export const sc = getScene("AGENTS");
const w = (line: string, prefix: string, nth = 0) => sc.wordAt(line, prefix, "from", nth);
const end = (line: string, prefix: string, nth = 0) => sc.wordAt(line, prefix, "to", nth);

/** Frames a revealed word's reveal starts before its spoken word. */
export const LEAD = 8;

// S13: "In Rovo, Atlassian's AI, ask our agent how to roll back."
const rovo = w("S13", "rovo");
const our = w("S13", "our");
const how = w("S13", "how");
const back = end("S13", "back");
// S14: "Instead of the old step, it warns the page may be out of date, and why."
const instead = w("S14", "instead");
const step = w("S14", "step");
const it = w("S14", "it");
const page = w("S14", "page");
const may = w("S14", "may");
const and = w("S14", "and");
const why = w("S14", "why");
// S15: "Coding assistants get the same check over MCP, an open standard for AI tools."
const s15 = sc.cue("S15");
const check = w("S15", "check");

export const T = {
  // ---- station 1: the carried words, then Drift Reviewer told big (crafted), one short real proof ----
  /** The page card (the carried "Possibly stale") makes room and the panel arrives, so it is in by "Rovo". */
  open: Math.max(2, rovo - 6),
  openDur: 16,
  /** "Rovo · Atlassian's AI", word by word. */
  chipWords: [rovo, w("S13", "atlassian"), w("S13", "ai")].map((f) => f - LEAD),
  /** It leaves on the beat after its reading time (2 s + 0.2 s a word from "Rovo"). */
  chipOut: sc.snap(rovo + 84),
  /** "our agent", beside the panel's name. */
  agentChip: our - LEAD,
  agentChipOut: sc.snap(how + 20),
  /** The question types on "how to roll back", each word about 2 frames before it is said. */
  typeAt: how - 4,
  typeEnd: w("S13", "back") + 8,
  /** Sent: the question leaves the input for the conversation (the real panel's own order). */
  send: back + 1,
  /** S13's one camera beat: a slow drift down onto the input as the question types (calm: no push and pull). */
  pushAsk: how - 8,
  /** The steps: the third ("Invoking tool: Check page freshness") on "step". */
  steps: [instead - 2, instead + 10, step - 3],
  /** The answer starts on "it warns", its slot empty; the camera leans in a little as it does. */
  answerAt: it,
  leanIn: it - 6,
  /** The page's "Possibly stale" flies into the answer's slot, landing on "page" (before "may"). */
  carryAt: it + 4,
  carryLand: Math.min(page, may - 5),
  /**
   * The short real proof: the real answer at 1:1 grows out of the twin on the beat before "and why" and wipes back on
   * the beat after it (so the reason is read in the real answer). Until then the twin's amber carries "may be out of
   * date". Placed so the take from the whip's landing to the proof runs 8 s or more (the film's third long shot).
   */
  proofAt: sc.snap(why - 6),
  /** Mist on the second sentence, line by line, on "and why" (in the proof and in the twin under it). */
  mist2a: and - 4,
  mist2b: why - 4,
  rebuildAt: sc.snap(why + 20),
  // ---- station 2: the coding assistant in plain words ----
  /**
   * A carry cut on the bar: the twin's amber "Possibly stale" holds its place and the coding assistant's card, already
   * holding the whole exchange (question, call, reply), forms around those same words; the camera then settles.
   */
  cutChat: s15,
  settle: 36,
  /** "the same check": Mist on the call (check-page-freshness), on "check". */
  callMark: check - 4,
  mcpWords: [w("S15", "mcp"), w("S15", "an"), w("S15", "open"), w("S15", "standard"), w("S15", "for"), w("S15", "ai"), w("S15", "tools")].map((f) => f - LEAD),
  /** The camera finds the gloss under the card on "an open standard". */
  pushGloss: w("S15", "open") - 6,
  end: sc.durationInFrames,
} as const;
