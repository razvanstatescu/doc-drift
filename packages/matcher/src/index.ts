export {
  ANCHOR_WEIGHTS,
  COSMETIC_FACTOR,
  DEFAULT_CONFIG,
  DEFAULT_IGNORE_GLOBS,
  HIGH_SEVERITY_SCORE,
  IDENTIFIER_BOOST,
  JIRA_SCORES,
  MATCH_STRENGTH,
  SENSITIVITY_THRESHOLDS,
  SNIPPET_BOOST,
  resolveConfig,
  type MatcherConfig,
  type Sensitivity,
} from './config.js';
export { parseUnifiedDiff, type FileDiff } from './diff.js';
export { GlobCache, normalizePath, pathMatchStrength } from './paths.js';
export { detectRevert } from './revert.js';
export { indexPage, indexPages, type PageIndex, type PageSource } from './page-index.js';
export { extractPageText, type ExtractedPage } from './page-text.js';
export { scoreChange, type PagesIndex } from './score.js';
export {
  DEFAULT_ESCALATION_DAYS,
  ESCALATION_EVENT_COUNT,
  nextPageState,
  type OpenEventSummary,
  type PageStateInput,
} from './state.js';
export { suggestAnchors, type SuggestedAnchor } from './suggest.js';
export type { DriftEvent, MatchResult, RenameProposal, RevertInfo, SkipReason } from './types.js';
export { effectiveWeight, jiraDampener, severityFor } from './weights.js';
