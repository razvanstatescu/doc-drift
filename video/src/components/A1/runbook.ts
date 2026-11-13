import captures from "../../data/captures.json";

/**
 * The runbook's REAL wording for the A1 and A4 mocks: src/data/captures.json -> runbookText (the capture agent read the
 * live page "Payments rollback runbook", PLAT 2720100, version 1). If that block is missing, the fallback below is the
 * same text from the seed page demo/seed/confluence/pages/runbooks/payments-rollback-runbook.xhtml. Never reword it.
 */
export interface RunbookStep {
  n: number;
  text: string;
  inlineCode?: string[];
  code?: string[];
  after?: string;
  afterInlineCode?: string[];
}

const SEED_STEPS: RunbookStep[] = [
  {
    n: 1,
    text: "Confirm the current and previous release. The previous revision is the one you are rolling back to.",
    code: ["kubectl config use-context prod-eu-west-1", "helm history payments -n payments --max 5"],
  },
  {
    n: 2,
    text: "Run the rollback script from the root of the payments-api repo. ROLLBACK_TIMEOUT is in seconds and defaults to 300. Raise it to 600 if the cluster is under load.",
    inlineCode: ["payments-api", "ROLLBACK_TIMEOUT"],
    code: ["export ROLLBACK_TIMEOUT=300", "./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT"],
    after: "The script calls helm rollback payments 0 --wait, so it returns only when the previous release is ready or the timeout expires.",
    afterInlineCode: ["helm rollback payments 0 --wait"],
  },
  {
    n: 3,
    text: "Check that the pods are on the previous image tag and passing readiness.",
    code: [
      "kubectl -n payments get pods -l app=payments-api -o wide",
      "kubectl -n payments get deploy payments-api -o jsonpath='{.spec.template.spec.containers[0].image}'",
    ],
  },
];

type RunbookJson = { pageTitle?: string; steps?: RunbookStep[] };
const RAW = (captures as unknown as { runbookText?: RunbookJson }).runbookText;
const STEPS: RunbookStep[] = RAW?.steps && RAW.steps.length >= 3 ? RAW.steps : SEED_STEPS;

export const RUNBOOK_TITLE: string = RAW?.pageTitle ?? "Payments rollback runbook";

/** Step n of the runbook (1-based). */
export const runbookStep = (n: number): RunbookStep => STEPS.find((s) => s.n === n) ?? SEED_STEPS[n - 1];

/** Step 2's command line that runs the script, exactly as the runbook writes it. */
export const ROLLBACK_CMD: string =
  runbookStep(2).code?.find((l) => l.includes("rollback.sh")) ?? "./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT";

/** The script as the command names it ("./scripts/rollback.sh"). */
export const SCRIPT_CALL: string = ROLLBACK_CMD.split(/\s+/)[0];

/** What zsh prints when that file is gone (the rename). */
export const ZSH_ERROR = `zsh: no such file or directory: ${SCRIPT_CALL}`;

/** The rename in PR #482 (demo/seed, the relay's change record). */
export const OLD_PATH = "scripts/rollback.sh";
export const NEW_PATH = "scripts/rollback-v2.sh";
