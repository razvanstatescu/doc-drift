/** Default ignore globs (features.md, F13). Patterns without a slash match a file name at any depth. */
export const DEFAULT_IGNORE_GLOBS: readonly string[] = [
  '**/*.test.*',
  '**/__tests__/**',
  '**/*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '**/*.snap',
  '**/dist/**',
  '**/*.md',
];

/** Sensitivity presets: the minimum score for a drift event. */
export const SENSITIVITY_THRESHOLDS = { strict: 0.4, balanced: 0.5, quiet: 0.65 } as const;
export type Sensitivity = keyof typeof SENSITIVITY_THRESHOLDS;

/** Path match strength per anchor type (detection.md). */
export const MATCH_STRENGTH = { exact: 1, glob: 0.6, repo: 0.2 } as const;

/** Added when the page mentions an identifier the change removed. */
export const IDENTIFIER_BOOST = 0.3;
/** Added when a page code block contains a line the change removed. */
export const SNIPPET_BOOST = 0.4;
/** Scores at or above this are High severity. */
export const HIGH_SEVERITY_SCORE = 0.8;

/**
 * Numeric weight of a code anchor (path, glob, repo) by its `weight` setting (D26, set by the eval).
 * A normal anchor is weaker evidence: shared files such as `deploy/helm/values.yaml` are anchored by
 * many pages, and a small edit to one of them alone (0.43 for +1/-1) must not alert. It needs a removed
 * identifier or quoted line the page uses, or a removed, renamed or heavily changed file (0.58 at 20
 * lines, 0.7 at 100+). A critical anchor alerts on any non-cosmetic change to the file.
 * Jira anchors are not scaled by this: Jira rule scores are already per signal (see `JIRA_SCORES`).
 */
export const ANCHOR_WEIGHTS = { critical: 1, normal: 0.7 } as const;
/** @deprecated Use `ANCHOR_WEIGHTS.critical`. Kept for compatibility. */
export const BASE_WEIGHT = ANCHOR_WEIGHTS.critical;
/** Each dismissal takes this much off the anchor's weight... */
export const DISMISS_PENALTY = 0.1;
/** ...down to this floor. */
export const DAMPENER_FLOOR = 0.3;

/**
 * Multiplier for a modified file whose diff only touches comments or whitespace.
 * Not in detection.md: added so comment typos and reformatting stay below the threshold
 * unless the page quotes a removed identifier or line. 0.4 (D26, was 0.5) caps a cosmetic file term
 * at 0.4 even on a critical anchor with 100+ changed lines, so it never alerts alone at Balanced;
 * at 0.5 a 110-line comment block on a critical script scored exactly 0.5 and alerted.
 */
export const COSMETIC_FACTOR = 0.4;

/** Jira rule scores (detection.md, Jira rules). */
export const JIRA_SCORES = {
  doneOrWontDo: 0.7,
  fixVersionsOrComponents: 0.6,
  parent: 0.6,
  description: 0.5,
  summary: 0.3,
} as const;

export interface MatcherConfig {
  /** Minimum score for a drift event. Defaults to Balanced (0.5). */
  threshold: number;
  /** Files matching any of these are dropped before scoring. */
  ignoreGlobs: readonly string[];
  /** Skip PRs merged into a branch other than the repo's default branch, when it is known. */
  ignoreNonDefaultBranches: boolean;
  /** Code anchor weights by setting. Optional; defaults to `ANCHOR_WEIGHTS` (normal 0.7, critical 1). */
  anchorWeights?: { readonly critical: number; readonly normal: number };
  /**
   * Also count removed plain lowercase words (`router`, `pool`) that appear in page code as identifier
   * evidence. Off by default (D26): it caused the only false positive on the demo set.
   */
  plainWordIdentifiers?: boolean;
}

export const DEFAULT_CONFIG: Readonly<MatcherConfig> = {
  threshold: SENSITIVITY_THRESHOLDS.balanced,
  ignoreGlobs: DEFAULT_IGNORE_GLOBS,
  ignoreNonDefaultBranches: true,
};

/** Fills in defaults for any field the caller left out. */
export function resolveConfig(config: Partial<MatcherConfig> = {}): MatcherConfig {
  return { ...DEFAULT_CONFIG, ...config };
}
