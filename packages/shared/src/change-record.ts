export const FILE_STATUSES = ['added', 'modified', 'removed', 'renamed'] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

/** One entry of a Bitbucket diffstat, normalized. */
export interface ChangedFile {
  status: FileStatus;
  /** Repo-relative path after the change (for `removed`, the path that was removed). */
  path: string;
  /** Path before the change. Required for `renamed`. */
  oldPath?: string;
  linesAdded: number;
  linesRemoved: number;
}

/** A merged Bitbucket pull request, as sent by the relay. */
export interface BitbucketChangeRecord {
  source: 'bitbucket';
  workspace: string;
  repoSlug: string;
  repoUuid: string;
  prId: number;
  title: string;
  author: string;
  mergeCommit: string;
  sourceBranch: string;
  destinationBranch: string;
  /** The repository's main branch, when the relay knows it. Used to ignore non-default merges. */
  defaultBranch?: string;
  files: ChangedFile[];
  /** Raw unified diff (`/diff`), at most 150 KB. Absent for PRs over 300 files. */
  hunks?: string;
  /**
   * True when the PR changed more files than the record carries (the relay keeps the first 500). The core
   * then cannot tell "not changed" from "dropped" for the rest (BUG-08), so it says so on the event.
   */
  filesTruncated?: boolean;
  /** How many files the PR changed in total, when the relay knows (at least `files.length`). */
  totalFiles?: number;
  /** The PR author's Atlassian account ID (Bitbucket `author.account_id`), for an @mention (R-6). */
  authorAccountId?: string;
}

/** One changelog item of a Jira issue update, normalized (not the raw webhook). */
export interface JiraFieldChange {
  /** Field id or display name, for example `status`, `resolution`, `fixVersions`, `Epic Link`. */
  field: string;
  from?: string | null;
  to?: string | null;
}

export const STATUS_CATEGORIES = ['new', 'indeterminate', 'done'] as const;
export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

/** A Jira issue update on an anchored issue, as built by the Jira trigger. */
export interface JiraChangeRecord {
  source: 'jira';
  issueKey: string;
  /** Changelog id from the event, used for deduplication. */
  changelogId?: string;
  author?: string;
  /** The issue's current status category, fetched by the handler (the event payload carries it). */
  statusCategory?: StatusCategory;
  changelog: JiraFieldChange[];
}

/** A normalized description of a change: a merged PR or a Jira issue update. */
export type ChangeRecord = BitbucketChangeRecord | JiraChangeRecord;

/** Size and count limits enforced by the validator. */
export const CHANGE_RECORD_LIMITS = {
  maxFiles: 500,
  /** The relay trims the diff to 150 KB of text; this leaves headroom for multibyte characters. */
  maxHunksBytes: 200_000,
  maxChangelogItems: 100,
  maxStringLength: 1_000,
} as const;
