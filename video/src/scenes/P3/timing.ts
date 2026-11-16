import { getScene } from "../../lib/timeline";

/**
 * P3's cues in LOCAL frames (frame 0 = film 2617), all derived from src/data/timeline.json word timings, so a re-voice
 * re-times the scene. Events land 0 to 4 frames before their word (V4.md M6). Proofs start on beats (P2): the scene
 * starts on a bar (film 2617 % 60 === 37), so local beats are multiples of 15 and `sc.snap` keeps us on them.
 *
 * Round 2 (QA review G-1 to G-9, director's decisions): one focal statement per line (V16 "Ask Drift Reviewer.", V17
 * "It says why.", V18 the guidance's "Do not present steps from this page as current."), one decisive push per line on
 * its key word ("roll back", "why", "signal"), nothing arrives empty.
 */
export const sc = getScene("P3");

const w = (line: string, word: string, which: "from" | "to" = "from", nth = 0) => sc.wordAt(line, word, which, nth);
/** The first beat at or after a local frame. */
const beatAtOrAfter = (f: number) => {
  const b = sc.snap(f);
  return b >= f ? b : b + 15;
};

// ---- V16 · "Ask Drift Reviewer, our Rovo agent, how to roll back."  [2632..2739]
const ask = w("V16", "ask");
const drift = w("V16", "drift");
const reviewer = w("V16", "reviewer");
const how = w("V16", "how");
const roll = w("V16", "roll");
const backEnd = w("V16", "back", "to");

// ---- V17 · "It doesn't repeat the old step. It says the page is Possibly stale, and why."  [2827..2980]
const v17 = sc.cue("V17");
const doesnt = w("V17", "doesn");
const old = w("V17", "old");
const stepEnd = w("V17", "step", "to");
const it2 = w("V17", "it", "from", 1);
const says = w("V17", "says");
const possibly = w("V17", "possibly");
const why = w("V17", "why");

// ---- V18 · "Coding agents get the same signal over MCP: which pages cover a file, and which to trust."  [3022..3207]
const v18 = sc.cue("V18");
const same = w("V18", "same");
const signal = w("V18", "signal");
const mcpEnd = w("V18", "mcp", "to");
const which = w("V18", "which");
const pages = w("V18", "pages");
const file = w("V18", "file");
const and = w("V18", "and");
const trust = w("V18", "trust");

export const T = {
  // V16: the page is composed at 0 (the kit's whip from P2 lands on it); the panel slides in, prefilled, on "Drift".
  panelIn: ask - 6,
  panelLand: drift - 2,
  ask,
  drift,
  /** "Ask Drift Reviewer." (130 px) sets word by word on the narration; it leaves with the push into the panel. */
  stmt16: [ask, drift, reviewer],
  /** It leaves (thrown off upward) before the push brings the panel under it. */
  stmt16Out: how - 7,
  /**
   * R10 [R3: 2677]: the real panel grows out of the twin's heading on the beat inside "Reviewer" [2662] and holds
   * through "our Rovo agent". 45 f.
   */
  r10: beatAtOrAfter(drift + 12),
  r10Out: beatAtOrAfter(drift + 12) + 45,
  /** The question types on "how to roll back" and is sent on its last word. */
  typeAt: how - 1,
  typeDur: backEnd - 4 - (how - 1),
  send: backEnd - 2,
  /** V16's decisive push: into the panel, landing on "roll". */
  push16: roll - 10,
  roll,
  /** Drift Reviewer is thinking: the first two steps (the twin), then R11 shows the real third arrive. */
  thinkAt: backEnd + 2,
  step1: backEnd + 6,
  step2: backEnd + 11,
  /** R11 [2752]: the real steps, p3-rovo-v2-rec 23.5 -> 24.5 s (the third step appears at 23.87 s, 11 f in). 30 f. */
  r11: beatAtOrAfter(backEnd + 12),
  get r11Out() {
    return this.r11 + 30;
  },
  get step3() {
    // the twin's third step appears when the real one does inside R11 (hidden behind the proof then)
    return this.r11 + 11;
  },
  /** The signal from "Invoking tool: Check page freshness" to the page's byline item and back [2782..2827]. */
  get sigOut() {
    return this.r11Out + 2;
  },
  get sigHit() {
    return this.r11Out + 18;
  },
  get sigBack() {
    return this.r11Out + 22;
  },
  get sigHome() {
    return this.r11Out + 38;
  },
  // V17: push into the answer slot (the page racks out and drains).
  v17,
  /** The ghost settles in whole on "It doesn't" (no typing, QA G-6), slips on "old", falls on "step". */
  ghostAt: doesnt - 4,
  slipAt: old - 2,
  fallAt: stepEnd - 4,
  /**
   * "It says why." sets whole on "says" (QA round 2, G-10: "It says" no longer hangs alone), so it holds to the whip;
   * the line's decisive push still lands on "why". Screen space, left.
   */
  stmt17: [it2, says, says + 3],
  /** The real answer streams in line by line [2887..2902]; "Possibly stale" gets its amber block once streamed. */
  answerAt: says - 6,
  get answerAmber() {
    return this.answerAt + 10;
  },
  /**
   * R12 [2902]: by MorphToReal from the answer's first line, landing on "Possibly", then a push to 1.0 on "Possibly
   * stale". 45 f: it hands back just before "why", where the twin takes the line's decisive push.
   */
  r12: sc.snap(says + 18),
  get r12Out() {
    return this.r12 + 45;
  },
  possibly,
  why,
  /** V17's decisive push: onto the reason ("What it describes changed in PR #482 ..."), landing on "why". */
  get pushWhy() {
    return this.r12Out;
  },
  /** The whip to the terminal: its seam on the beat at "Coding" [3022]. */
  whip: sc.snap(v18),
  // V18
  v18,
  /** The slab lands with find-docs-for-path already typed (QA G-1: never arrive empty). */
  cmd1: sc.snap(v18) - 2,
  /**
   * Its output starts streaming as the slab lands (QA round 2, G-1: no empty body), paced so the runbook row's status,
   * the amber, lands just before "same" (the scene derives the line rate from that row's index).
   */
  out1: sc.snap(v18) + 1,
  statusBy: same - 3,
  same,
  /** V18's decisive push: onto the runbook row's status, landing on "signal"; back out after "MCP". */
  push18: signal - 10,
  signal,
  pull18: mcpEnd - 14,
  /** "Agents read as you. They never edit a page." (small) sets once the camera is back, holds to the end. */
  readAsYou: mcpEnd + 2,
  which,
  pages,
  file,
  /** "which pages cover a file": the path is underlined and a connector runs to the page; the count chip pops. */
  pathAt: which - 4,
  linkAt: which - 2,
  chipAt: pages - 3,
  /** The connector goes before the old output dims for the next call. */
  unlink: file - 12,
  /** The find-docs output dims under a veil until the next command appears (QA round 2, G-11: never blank). */
  dimOld: and - 26,
  /**
   * check-page-freshness appears already typed as the screen clears, and its output streams at once; the clause must
   * be still 94 frames before the scene cut (QA round 2 metrics), so this runs a little ahead of "and".
   */
  cmd2: and - 16,
  stream2: and - 14,
  and,
  /**
   * "Do not present steps from this page as current." rises out of the streamed guidance word by word and is still
   * by "which" (564), holding 94 frames to the scene cut.
   */
  clause: and - 10,
  trust,
  end: sc.durationInFrames,
};
