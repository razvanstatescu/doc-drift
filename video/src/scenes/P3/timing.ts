import { getScene } from "../../lib/timeline";

/**
 * P3's cues in LOCAL frames (frame 0 = film 2617), all derived from src/data/timeline.json word timings, so a re-voice
 * re-times the scene. Events land 0 to 4 frames before their word (V4.md M6). Proofs start on beats (P2): the scene
 * starts on a bar (film 2617 % 60 === 37), so local beats are multiples of 15 and `sc.snap` keeps us on them.
 *
 * R3's numbers in brackets are absolute film frames (local = film - 2617).
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
const our = w("V16", "our");
void our;
const how = w("V16", "how");
const backEnd = w("V16", "back", "to");

// ---- V17 · "It doesn't repeat the old step. It says the page is Possibly stale, and why."  [2827..2980]
const v17 = sc.cue("V17");
const doesnt = w("V17", "doesn");
const repeat = w("V17", "repeat");
const old = w("V17", "old");
const stepEnd = w("V17", "step", "to");
const says = w("V17", "says");
const possibly = w("V17", "possibly");
const why = w("V17", "why");

// ---- V18 · "Coding agents get the same signal over MCP: which pages cover a file, and which to trust."  [3022..3207]
const v18 = sc.cue("V18");
const same = w("V18", "same");
const mcp = w("V18", "mcp");
const which = w("V18", "which");
const pages = w("V18", "pages");
const cover = w("V18", "cover");
const file = w("V18", "file");
const and = w("V18", "and");
const trust = w("V18", "trust");

export const T = {
  // V16: the page is composed at 0 (the kit's whip from P2 lands on it); the panel slides in and lands on "Drift".
  panelIn: ask - 6,
  panelLand: drift - 2,
  ask,
  drift,
  /**
   * R10 [R3: 2677]: the real panel grows out of the twin's heading on the beat inside "Reviewer" [2662] and holds
   * through "our Rovo agent", so the empty twin panel is on screen for under a beat. 45 f.
   */
  r10: beatAtOrAfter(drift + 12),
  r10Out: beatAtOrAfter(drift + 12) + 45,
  /** The question types on "how to roll back" and is sent on its last word. */
  typeAt: how - 1,
  typeDur: backEnd - 4 - (how - 1),
  send: backEnd - 2,
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
  /** The signal from "Invoking tool: Check page freshness" to the page's badge and back [2782..2827]. */
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
  // V17: push into the answer slot (the page leaves frame: the ghost's slip is the one amber).
  v17,
  ghostAt: doesnt - 4,
  ghostType: repeat - 2,
  ghostTypeDur: old - 4 - (repeat - 2),
  slipAt: old - 2,
  fallAt: stepEnd - 4,
  /** The real answer streams in line by line [2887..2902]. */
  answerAt: says - 6,
  /** R12 [2902]: by MorphToReal from the answer's first line, then pushes to 1.0 on "Possibly" and on "why". 60 f. */
  r12: sc.snap(says + 18),
  get r12Out() {
    return this.r12 + 60;
  },
  possibly,
  why,
  /**
   * The whip to the terminal: its seam on the beat at "Coding" [3022] (R3 had 3007, a beat earlier). The answer gets
   * those 15 frames of reading, and the coding agent's terminal arrives on its word.
   */
  whip: sc.snap(v18),
  // V18
  v18,
  /** find-docs-for-path types once the whip has landed, before "agents". */
  cmd1: sc.snap(v18) + 6,
  /**
   * Its output streams once the command is typed (at reading pace), so the runbook row's status, the amber, lands just
   * before "signal" ("the same signal").
   */
  out1: w("V18", "signal") - 9,
  same,
  mcp,
  /** "Agents read as you. They never edit a page." sets under the terminal on "MCP" and holds to the end. */
  readAsYou: mcp + 2,
  which,
  pages,
  cover,
  file,
  /** The fan: each card leaves the stack 0 to 4 f before its word. */
  fan: [which - 2, pages - 3, cover - 4] as [number, number, number],
  /**
   * "and which to trust": the runbook card is picked (the QA cards dim, their connectors retract), the fan folds back
   * with the runbook landing on top (its connector reels it in), then the screen clears and check-page-freshness types.
   */
  pick: and - 6,
  fold: and - 2,
  cmd2: w("V18", "which", "from", 1) - 2,
  /** Its output streams so "status": "possibly_stale" (the one amber) lands a few frames before "trust". */
  stream2: trust - 4,
  trust,
  end: sc.durationInFrames,
};
