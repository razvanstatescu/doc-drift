import type { ChangeRecord, Severity } from '@dds/shared';

/** A scored match between a change and one page binding, at or above the threshold. */
export interface DriftEvent {
  pageId: string;
  bindingId: string;
  source: ChangeRecord['source'];
  /** `workspace/repo#PR` for Bitbucket, the issue key for Jira. */
  ref: string;
  /** Stable per binding and change, so retried queue events upsert instead of duplicating. */
  dedupeKey: string;
  /** 0 to 1, rounded to 2 decimals. */
  score: number;
  severity: Severity;
  /** Display label of the binding, for example `payments-api: scripts/rollback.sh`. */
  matchedAnchor: string;
  /** Changed files that matched the binding (empty for Jira). */
  files: string[];
  /** Human-readable reasons, strongest first, in the product voice. */
  reasons: string[];
  /** Removed identifiers the page mentions, for highlighting in the review panel. */
  matchedIdentifiers: string[];
  /** Removed lines found in the page's code blocks. */
  matchedSnippetLines: number;
}

/** A renamed file that an exact path binding points at. Applied only after the owner confirms. */
export interface RenameProposal {
  bindingId: string;
  pageId: string;
  from: string;
  to: string;
}

/** A change whose title says it reverts another PR. The caller closes that PR's events as `reverted`. */
export interface RevertInfo {
  revertedTitle: string;
  revertedPrId?: number;
}

export type SkipReason = 'no_relevant_files' | 'non_default_branch';

export type MatchResult =
  | { kind: 'scored'; events: DriftEvent[]; renameProposals: RenameProposal[] }
  | { kind: 'revert'; revert: RevertInfo }
  | { kind: 'skipped'; reason: SkipReason };
