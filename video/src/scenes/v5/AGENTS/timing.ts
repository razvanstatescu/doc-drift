import { getScene } from "../../../lib/timeline";
import type { RemapKey } from "../../../v4/kit";
import { REC_T } from "./data";

/**
 * AGENTS (v5, film 1575 to 2100, S13 to S15): every frame, local, from src/data/timeline.json. Beats sit on local
 * multiples of 15 (1575 is a beat); bars on 45, 105, ..., 345 (the score's new 8-bar phrase starts on S15), 525.
 * Words land 0 to 4 frames before they are said: a word's mask reveal (12 frames, expo out) starts 8 frames before it, so
 * it is readable 4 frames before and settled (95% up) 2 frames before.
 */
export const sc = getScene("AGENTS");
const w = (line: string, prefix: string, nth = 0) => sc.wordAt(line, prefix, "from", nth);

/** Frames a revealed word's reveal starts before its spoken word (readable 4 frames before, settled 2 before). */
export const LEAD = 8;

// ---- S13: "In Rovo, Atlassian's AI, ask our agent, Drift Reviewer, how to roll back." -----------------------------------
const rovo = w("S13", "rovo"); // 22
const ask = w("S13", "ask"); // 93
const drift = w("S13", "drift"); // 122
const how = w("S13", "how"); // 152

// ---- S14: "Instead of the old step, it warns the page may be out of date, and why." ------------------------------------
const instead = w("S14", "instead"); // 197
const it = w("S14", "it"); // 241
const may = w("S14", "may"); // 272
const and = w("S14", "and"); // 304
const why = w("S14", "why"); // 310

// ---- S15: "Coding assistants get the same check over MCP, an open standard for AI tools." -------------------------------
const s15 = sc.cue("S15"); // 345, a bar: the score's new phrase
const get = w("S15", "get"); // 374
const same = w("S15", "same"); // 386
const check = w("S15", "check"); // 395

export const T = {
  // station 1: the page and Rovo
  /** The Rovo strip slides in from the right and the page makes room (the panel opens on "Rovo"). */
  open: rovo - 7,
  openDur: 14,
  /** The gloss chip, word by word: "Rovo" · "Atlassian's" · "AI". */
  chipWords: [rovo - LEAD, w("S13", "atlassian") - LEAD, w("S13", "ai") - LEAD],
  /** The chip leaves on the beat after its reading time (2 s + 0.2 s a word from "Rovo"), before the click. */
  chipOut: sc.snap(rovo + 84),
  /** Jump cut (in the strip) to the agent list, Drift Reviewer found, on a beat before "ask". */
  cutList: sc.snap(ask - 3),
  /** The recorded click on Drift Reviewer, 3 frames before "Drift". */
  click: drift - 3,
  /** Jump cut to the input, the question typing on "how to roll back" (a beat). */
  cutType: sc.snap(how),
  /** Jump cut to the sent question and the thinking, on S14's first beat. */
  cutThink: sc.snap(instead),
  /** Jump cut to the answer on "it warns" (a beat). */
  cutAnswer: sc.snap(it),
  /** The spotlight finds the first two sentences as the answer lands (the cut and the spotlight are one event). */
  spotOn: sc.snap(it),
  /** The camera pushes to 1:1 on the second sentence ("and why"), as its Mist sweeps. */
  pushWhy: and - 6,
  /** The badge's words fly from the page into the answer, landing 3 frames before "may". */
  carryLand: may - 3,
  carryDur: 14,
  /** Mist on the second sentence, line by line, on "and why". */
  mist2a: and - 4,
  mist2b: why - 3,
  // station 2: the coding assistant
  cutSlab: s15,
  question: s15 + 4,
  tag: s15 + 11,
  call: get - 6,
  out: [get + 1, get + 4, get + 7],
  amber: same - 5,
  push: get + 2,
  /** The camera finds the gloss chip on "open standard". */
  pushGloss: w("S15", "open") - 3,
  mcpWords: [w("S15", "mcp"), w("S15", "an"), w("S15", "open"), w("S15", "standard"), w("S15", "for"), w("S15", "ai"), w("S15", "tools")].map((f) => f - LEAD),
  end: sc.durationInFrames,
  check,
} as const;

/**
 * The take's time keys (output frame -> source second of p3-rovo-v2.mp4), one set per jump-cut segment:
 *   A  the panel opens (1x from 2.467 s, just open)
 *   B  the agent list with Drift Reviewer (1x; the click at 10.741 s lands on T.click)
 *   C  typing at 1.33x (no label under 3x): "roll" from 156, "back" from 165, the question whole by 189
 *   D  the thinking ramped at 6x (labelled, with real seconds since Enter): the "Check page freshness" step at 217
 */
export const KEYS: Record<"A" | "B" | "C" | "D", RemapKey[]> = {
  A: [{ f: T.open, t: REC_T.panelOpen + 0.01 }],
  B: [
    { f: T.cutList, t: REC_T.clickDrift - (T.click - T.cutList) / 30 },
    { f: T.click, t: REC_T.clickDrift },
  ],
  C: [
    { f: T.cutType, t: 15.6 },
    { f: T.cutThink, t: 17.6 },
  ],
  D: [
    { f: T.cutThink, t: 19.4 },
    { f: T.cutAnswer, t: 28.45 },
  ],
};
