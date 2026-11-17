import { findCapture, toolOutput, type Box } from "../../../lib/captures";
import type { Rect } from "../../../v4/look";

/**
 * AGENTS' real values, read from src/data/captures.json (capture agent) and asserted here, so a re-shoot that changes
 * them fails the render loudly instead of drifting on screen. Adapted from v4's src/components/P3/p3data.ts (D38: only
 * the v2 Rovo capture and the V2 tool output; the v1 ones said "changed by PR #482").
 *
 * The Rovo answer was recorded after settings > "Replay seeded PR #482" flagged the page, not after the real merge, so
 * nothing here says or tags "after the merge" (R5 section 10.1).
 */

const fail = (what: string) => {
  throw new Error(`AGENTS: captures.json changed (${what}); update src/scenes/v5/AGENTS/data.ts to the new real output`);
};

// ---- Drift Reviewer in Rovo (core 5.5.0, Nov 13) ------------------------------------------------------------------------
export const ANSWER_STILL = "p3-rovo-v2-answer";
export const PAGE_TITLE = "Payments rollback runbook";
export const QUESTION = "How do I roll back payments-api?";
/** The answer, verbatim (the twin shows its first four sentences; the fifth points at the badge and is left out). */
export const ANSWER_LINES = [
  "Payments rollback runbook is Possibly stale.",
  "What it describes changed in PR #482 on 2026-11-13, after it was last verified.",
  'The affected section is "Steps".',
  "Do not present steps from this page as current.",
] as const;
/** The real thinking steps under "Drift Reviewer is thinking." (p3-rovo-v2-rec, 21.88 s and 23.78 s). */
export const STEPS = ["Analyzing: Reviewing your question.", "Invoking tool: Read Skills for agents", "Invoking tool: Check page freshness"] as const;
{
  const still = findCapture(ANSWER_STILL);
  if (!still || !String(still.notes ?? "").includes(ANSWER_LINES.join(" "))) fail(`${ANSWER_STILL} answer text`);
  if (!String(findCapture("p3-rovo-v2-question")?.shows ?? "").includes(QUESTION)) fail("p3-rovo-v2-question");
  if (!String(still?.takenAt ?? "").startsWith("2026-11-13")) fail("the Rovo capture's date");
}

/**
 * The agent's own welcome before a question, as the real panel shows it (p3-rovo-v2-rec at 11.8 s; the words are the
 * agent's manifest description and conversation starters, apps/core/manifest.yml, in the order Rovo lists them).
 */
export const WELCOME = {
  description: "Checks whether a Confluence page's code anchors changed, explains the change, and drafts fixes for you to accept.",
  starters: ["Draft a fix for the drifted sections of this page", "Is this page still current?", "What changed since this page was verified?"],
} as const;

/** The proof's tag (once per real block, V5 section 8). */
export const ROVO_TAG = "Recorded in Rovo";

/**
 * The real answer at 1:1 (p3-rovo-v2-answer): the question bubble (rows 244 to 340), "Referencing" (388 to 464), the
 * answer's first line (552 to 598) and the paragraph's first two lines (636 to 714). Every edge sits in whitespace: the
 * paragraph's third line starts on row 731, the content spans x 3036 to 3807. No command is in it.
 */
export const PROOF_CROP: Box = [3020, 228, 812, 496];
/**
 * Word boxes on the answer still, capture px, measured from its pixels: line 1 "[chip] ... is Possibly stale." on rows
 * 561 to 590 ("Possibly" 3496 to 3603, "stale." 3614 to 3680); the paragraph's line 1 "What it describes changed in PR
 * #482 on 2026-11-13," x 3037 to 3743, rows 636 to 662; line 2 "after it was last verified." x 3037 to 3349, rows 683
 * to 704.
 */
export const ANSWER_BOX = {
  line1: [3036, 552, 646, 46] as Box,
  possiblyStale: { x: 3496, y: 563, w: 176, h: 24 } as Rect,
  sentence2a: { x: 3037, y: 638, w: 706, h: 22 } as Rect,
  sentence2b: { x: 3037, y: 683, w: 312, h: 22 } as Rect,
};

// ---- The coding assistant: real MCP output (toolOutput.checkFlaggedV2), in plain words ----------------------------------
type Check = {
  tool: string;
  server: string;
  calledAt: string;
  input: { pageId: string };
  output: { ok: boolean; title: string; status: string; statusLabel: string; guidance: string };
};
export const CHECK = toolOutput("checkFlaggedV2") as Check;
if (!CHECK || CHECK.tool !== "check-page-freshness" || CHECK.input?.pageId !== "2720100") fail("checkFlaggedV2 input");
if (CHECK.output.status !== "possibly_stale" || CHECK.output.statusLabel !== "Possibly stale" || CHECK.output.title !== PAGE_TITLE) {
  fail("checkFlaggedV2 status");
}
if (!CHECK.calledAt.startsWith("2026-11-13") || !CHECK.server.startsWith("doc-drift MCP")) fail("checkFlaggedV2 server or date");

/** The guidance's own clause, verbatim. */
export const DO_NOT_PRESENT = "Do not present steps from this page as current.";
if (!CHECK.output.guidance.includes(` ${DO_NOT_PRESENT} `)) fail("the guidance clause");
if (!ANSWER_LINES.includes(DO_NOT_PRESENT)) fail("the answer's clause");

/** The question to the coding assistant (ours: the chat card is crafted; what it shows back is the tool's real output). */
export const MCP_QUESTION = "Is the payments rollback runbook safe to follow?";
/** The reply in plain words: the tool's status label, then its guidance clause (both verbatim). */
export const MCP_REPLY = { status: CHECK.output.statusLabel, guidance: DO_NOT_PRESENT } as const;
/** The call, small: the MCP server and the tool. */
export const CALL = { server: "doc-drift", tool: CHECK.tool } as const;
export const MCP_TAG = "Real output: doc-drift MCP";
/** What frames the reply as the tool's output: what the coding assistant is told (round 3). */
export const TOLD = "Told to the coding assistant:";
