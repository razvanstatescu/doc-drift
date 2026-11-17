import { findCapture, toolOutput } from "../../../lib/captures";
import type { Rect } from "../../../v4/look";

/**
 * AGENTS' real values, read from src/data/captures.json (capture agent) and asserted here, so a re-shoot that changes
 * them fails the render loudly instead of drifting on screen. Adapted from v4's src/components/P3/p3data.ts (D38: only
 * the v2 Rovo captures and the V2 tool output; the v1 ones said "changed by PR #482").
 *
 * The Rovo recording was made after settings > "Replay seeded PR #482" flagged the page, not after the real merge, so
 * nothing here says or tags "after the merge" (R5 section 10.1).
 */

const fail = (what: string) => {
  throw new Error(`AGENTS: captures.json changed (${what}); update src/scenes/v5/AGENTS/data.ts to the new real output`);
};

// ---- Rovo: the recording and the answer still (core 5.5.0, Nov 13) ----------------------------------------------------
export const REC = "p3-rovo-v2-rec";
export const ANSWER_STILL = "p3-rovo-v2-answer";

export const QUESTION = "How do I roll back payments-api?";
/** The answer's first two sentences, verbatim (the spotlight's words). */
export const ANSWER_FIRST_TWO = ["Payments rollback runbook is Possibly stale.", "What it describes changed in PR #482 on 2026-11-13, after it was last verified."] as const;
{
  const rec = findCapture(REC);
  const still = findCapture(ANSWER_STILL);
  if (!rec || rec.kind !== "video" || rec.width !== 3840) fail(`${REC} capture`);
  if (!still || !String(still.notes ?? "").includes(ANSWER_FIRST_TWO.join(" "))) fail(`${ANSWER_STILL} answer text`);
  if (!String(findCapture("p3-rovo-v2-question")?.shows ?? "").includes(QUESTION)) fail("p3-rovo-v2-question");
  if (!String(rec?.takenAt ?? "").startsWith("2026-11-13") || !String(still?.takenAt ?? "").startsWith("2026-11-13")) fail("Rovo capture dates");
  const clicks = (rec?.clicks ?? []) as { label?: string; atMs?: number; x?: number | null; y?: number | null }[];
  const dr = clicks.find((c) => c.label === "Drift Reviewer");
  if (!dr || dr.atMs !== 10741 || dr.x !== 3251 || dr.y !== 454) fail(`${REC} Drift Reviewer click`);
}

/** The take's proof tag (once): the recording is real; the page was flagged by the seeded replay of PR #482. */
export const ROVO_TAG = "Recorded in Rovo · demo site, Nov 13";

/**
 * Measured on p3-rovo-v2.mp4 (60 fps, 3840 x 2160, the panel is x 2963 to 3840), frame by frame on 2026-11-17:
 * the panel opens at 2.467 s (the greeting fades in to 2.77 s); the agent list shows the Drift Reviewer row from
 * 9.633 s; the recorded click on it at 10.741 s (3251, 454), the header and welcome switch over 10.82 to 11.15 s;
 * typing runs 15.23 to 17.53 s ("How" done 15.35, "roll" from 15.87, "back" from 16.25, "?" at 17.53); Enter at
 * 18.934 s; "Drift Reviewer is thinking." at 19.8 s, its steps at 21.88 s and 23.78 s (Check page freshness); the
 * answer replaces the thinking at 28.5 s (streams to 28.85 s; the link re-renders as a chip at 31.05 s).
 */
export const REC_T = {
  panelOpen: 2.467,
  listRow: 9.633,
  clickDrift: 10.741,
  typeStart: 15.23,
  typeEnd: 17.533,
  enter: 18.934,
  thinking: 19.8,
  checkStep: 23.78,
  answerStart: 28.5,
} as const;

/** The Drift Reviewer row in the agent list (the recorded click point) and where the cursor came from (the search box). */
export const CLICK_DRIFT = { x: 3251, y: 454, from: [3341, 338] as [number, number] };

/** The panel in capture px (its left border is x 2962; the top bar ends at 95). */
export const PANEL: Rect = { x: 2963, y: 96, w: 877, h: 2064 };

/**
 * Word boxes on the answer still (p3-rovo-v2-answer), capture px, measured from its pixels: line 1 "[chip] ... is
 * Possibly stale." on rows 561 to 590 ("Possibly" 3496 to 3603, "stale." 3614 to 3680); the paragraph's line 1 "What
 * it describes changed in PR #482 on 2026-11-13," x 3037 to 3743, rows 636 to 662; line 2 "after it was last
 * verified." x 3037 to 3349, rows 683 to 704.
 */
export const ANSWER_BOX = {
  possiblyStale: { x: 3496, y: 563, w: 176, h: 24 } as Rect,
  sentence2a: { x: 3037, y: 638, w: 706, h: 22 } as Rect,
  sentence2b: { x: 3037, y: 683, w: 312, h: 22 } as Rect,
  /** The first two sentences (the spotlight). */
  firstTwo: { x: 3020, y: 538, w: 760, h: 188 } as Rect,
};

// ---- The coding assistant: real MCP output (toolOutput.checkFlaggedV2) -------------------------------------------------
type Check = {
  tool: string;
  server: string;
  calledAt: string;
  input: { pageId: string };
  output: { ok: boolean; title: string; status: string; statusLabel: string; guidance: string };
};
export const CHECK = toolOutput("checkFlaggedV2") as Check;
if (!CHECK || CHECK.tool !== "check-page-freshness" || CHECK.input?.pageId !== "2720100") fail("checkFlaggedV2 input");
if (CHECK.output.status !== "possibly_stale" || CHECK.output.statusLabel !== "Possibly stale" || CHECK.output.title !== "Payments rollback runbook") {
  fail("checkFlaggedV2 status");
}
if (!CHECK.calledAt.startsWith("2026-11-13") || !CHECK.server.startsWith("doc-drift MCP")) fail("checkFlaggedV2 server or date");

/** The guidance's own clause, verbatim (the third output line shows it between ellipses: the value goes on both sides). */
export const DO_NOT_PRESENT = "Do not present steps from this page as current.";
if (!CHECK.output.guidance.includes(` ${DO_NOT_PRESENT} `)) fail("the guidance clause");

/** The question typed to the coding assistant (ours: the slab is crafted, its output is real; R5 A14). */
export const MCP_QUESTION = "Is the payments rollback runbook safe to follow?";
/** The call: the MCP server and the tool. */
export const CALL = { server: "doc-drift", tool: CHECK.tool } as const;
/** The three output lines, as JSON tokens (key, value, trailing punctuation). The first value is the one amber. */
export const OUTPUT_LINES = [
  { key: "status", value: JSON.stringify(CHECK.output.status), tail: "," },
  { key: "statusLabel", value: JSON.stringify(CHECK.output.statusLabel), tail: "," },
  { key: "guidance", value: `"… ${DO_NOT_PRESENT} …"`, tail: "" },
] as const;
export const MCP_TAG = "Real output: doc-drift MCP, Nov 13";
