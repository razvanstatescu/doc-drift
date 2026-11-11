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

/** Base numeric weight of every anchor. `critical` changes severity, not score. */
export const BASE_WEIGHT = 1;
/** Each dismissal takes this much off the anchor's weight... */
export const DISMISS_PENALTY = 0.1;
/** ...down to this floor. */
export const DAMPENER_FLOOR = 0.3;

/**
 * Multiplier for a modified file whose diff only touches comments or whitespace.
 * Not in detection.md: added so comment typos and reformatting stay below the threshold
 * unless the page quotes a removed identifier or line.
 */
export const COSMETIC_FACTOR = 0.5;

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
