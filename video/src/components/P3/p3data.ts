import { findCapture, toolOutput } from "../../lib/captures";
import capturesJson from "../../data/captures.json";

/**
 * P3's real values, read from src/data/captures.json (capture agent) and checked here, so a re-shoot that changes
 * them fails the render loudly instead of drifting on screen. Nothing in P3 is typed by hand except through these
 * constants, and each constant is asserted against the capture it comes from.
 *
 * Only the v2 Rovo captures (core 5.5.0, D38 wording) and the V2 tool outputs are used. The v1 captures and
 * `checkFlagged` are superseded (D38): they said "changed by PR #482".
 */

const fail = (what: string) => {
  throw new Error(`P3: captures.json changed (${what}); update src/components/P3/p3data.ts to the new real output`);
};

// ---- Drift Reviewer's answer (p3-rovo-v2-answer, verbatim; D38: "what it describes changed", never "the page was
// changed"). The capture's notes carry the full answer; the panel text is in tools/capture/p3-rovo-v2-answer.txt.
// The twin shows the first two paragraphs' first four sentences; the fifth ("The review is in the Doc Drift badge on
// the page.") is left out, as R2 frame 5 does (a twin may drop rows, never add words).
export const QUESTION = "How do I roll back payments-api?";
export const ANSWER_TITLE = "Payments rollback runbook";
export const ANSWER_LINES = [
  "Payments rollback runbook is Possibly stale.",
  "What it describes changed in PR #482 on 2026-11-13, after it was last verified.",
  'The affected section is "Steps".',
  "Do not present steps from this page as current.",
] as const;
{
  const notes = String(findCapture("p3-rovo-v2-answer")?.notes ?? "");
  if (!notes.includes(ANSWER_LINES.join(" "))) fail("p3-rovo-v2-answer answer text");
  const q = String(findCapture("p3-rovo-v2-question")?.shows ?? "");
  if (!q.includes(QUESTION)) fail("p3-rovo-v2-question");
}

/**
 * The real thinking steps under "Drift Reviewer is thinking." (p3-rovo-v2-rec, read frame by frame 2026-11-16): the
 * first two show by 23.5 s, the third ("Invoking tool: Check page freshness") appears at 23.87 s; the answer replaces
 * them at about 28.7 s.
 */
export const THINKING = "Drift Reviewer is thinking.";
export const STEPS = ["Analyzing: Reviewing your question.", "Invoking tool: Read Skills for agents", "Invoking tool: Check page freshness"] as const;
/** Seconds into p3-rovo-v2-rec where the third step appears (R11 starts before it, so the proof shows it arrive). */
export const CHECK_STEP_AT_S = 23.87;

// ---- A1's old answer: step 2's command exactly as the runbook writes it (runbookText, PLAT 2720100 version 1).
type RunbookText = { pageTitle?: string; steps?: { n: number; code?: string[] }[] };
const RUNBOOK = (capturesJson as unknown as { runbookText?: RunbookText }).runbookText;
export const OLD_STEP: string = RUNBOOK?.steps?.find((s) => s.n === 2)?.code?.find((l) => l.includes("rollback.sh")) ?? "";
if (OLD_STEP !== "./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT") fail("runbookText step 2 command");

// ---- The MCP calls (toolOutput.findDocsFlaggedV2 and checkFlaggedV2: doc-drift MCP, development install, called as
// Razvan Statescu on 2026-11-13 at 19:01:40 local).
type Page = { pageId: string; title: string; anchor: string; match: string; status: string; statusLabel: string; citePolicy: string; url: string };
type Find = { tool: string; server: string; calledAt: string; input: { repo: string; path: string }; output: { ok: boolean; pages: Page[]; guidance: string } };
type Drift = { source: string; ref: string; summary: string; severity: string; score: number; at: string };
type Check = {
  tool: string;
  server: string;
  calledAt: string;
  input: { pageId: string };
  output: { ok: boolean; pageId: string; title: string; status: string; statusLabel: string; citePolicy: string; openDrift: Drift[]; guidance: string };
};

export const FIND = toolOutput("findDocsFlaggedV2") as Find;
export const CHECK = toolOutput("checkFlaggedV2") as Check;
if (!FIND || FIND.tool !== "find-docs-for-path" || FIND.input.repo !== "payments-api" || FIND.input.path !== "scripts/rollback.sh") fail("findDocsFlaggedV2 input");
if (!CHECK || CHECK.tool !== "check-page-freshness" || CHECK.input.pageId !== "2720100") fail("checkFlaggedV2 input");

/** The runbook's row of find-docs-for-path, and the other two (QA pages in the DDSTEST space: never named on screen). */
export const RUNBOOK_ROW: Page = FIND.output.pages.find((p) => p.pageId === CHECK.input.pageId) as Page;
export const RUNBOOK_INDEX = FIND.output.pages.findIndex((p) => p.pageId === CHECK.input.pageId);
export const QA_IDS = FIND.output.pages.filter((p) => p.pageId !== CHECK.input.pageId).map((p) => p.pageId);
if (!RUNBOOK_ROW || RUNBOOK_ROW.title !== ANSWER_TITLE || RUNBOOK_ROW.status !== "possibly_stale" || FIND.output.pages.length !== 3) {
  fail("findDocsFlaggedV2 pages");
}
if (CHECK.output.status !== "possibly_stale" || CHECK.output.title !== ANSWER_TITLE) fail("checkFlaggedV2 status");

/**
 * How many pages find-docs-for-path found, in the tool's own words (the opening of its `guidance`, which goes on to
 * name the QA pages, so only this clause is shown: QA G-8).
 */
export const PAGES_PHRASE = "3 pages document this path";
if (!FIND.output.guidance.startsWith(`${PAGES_PHRASE}:`)) fail("findDocsFlaggedV2 guidance opening");

/** V18's focal statement: the guidance's own clause, verbatim (QA G-2). */
export const DO_NOT_PRESENT = "Do not present steps from this page as current.";

/** The guidance value of check-page-freshness, verbatim (D38 wording), split at its sentences for the terminal. */
export const GUIDANCE = CHECK.output.guidance;
export const GUIDANCE_SENTENCES = [
  '"Payments rollback runbook" is Possibly stale.',
  "Do not present steps from this page as current.",
  "Cite with caveat: what it describes changed in PR #482 on 2026-11-13, after it was last verified.",
  'Affected: "Steps".',
] as const;
if (GUIDANCE_SENTENCES.join(" ") !== GUIDANCE) fail("checkFlaggedV2 guidance");
if (!GUIDANCE.includes(DO_NOT_PRESENT) || !ANSWER_LINES.includes(DO_NOT_PRESENT as (typeof ANSWER_LINES)[number])) fail("the 'Do not present' clause");

/** The proof tag of the terminal (R3 V18). The calls were made at 19:01:40 local on Nov 13, as Razvan Statescu. */
export const MCP_TAG = "Real output: doc-drift MCP, called as Razvan Statescu, Nov 13";
if (!FIND.server.includes("as Razvan Statescu") || !CHECK.server.includes("as Razvan Statescu") || !CHECK.calledAt.startsWith("2026-11-13")) {
  fail("toolOutput server or date");
}

/** The small line under the terminal (BRIEF V18). True: agent and MCP tools run asUser() only, and agents never write pages. */
export const READ_AS_YOU = "Agents read as you. They never edit a page.";
