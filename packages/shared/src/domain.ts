/**
 * Page states as stored and returned by the API. `unknown` is never stored:
 * it is returned to a caller who cannot view the page.
 */
export const PAGE_STATES = ['verified', 'possibly_stale', 'stale', 'unanchored', 'unknown'] as const;
export type PageState = (typeof PAGE_STATES)[number];

/** The states a page can actually be in (everything except `unknown`). */
export type StoredPageState = Exclude<PageState, 'unknown'>;

/** User-facing names for each state. Always shown with an icon. */
export const PAGE_STATE_LABELS: Readonly<Record<PageState, string>> = {
  verified: 'Verified',
  possibly_stale: 'Possibly stale',
  stale: 'Stale',
  unanchored: 'Unanchored',
  unknown: 'Unknown',
};

export const SEVERITIES = ['high', 'medium'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const DRIFT_EVENT_STATUSES = ['open', 'dismissed', 'resolved', 'reverted', 'snoozed'] as const;
export type DriftEventStatus = (typeof DRIFT_EVENT_STATUSES)[number];

export const ANCHOR_TYPES = ['path', 'glob', 'jira', 'page', 'repo'] as const;
export type AnchorType = (typeof ANCHOR_TYPES)[number];

export const ANCHOR_WEIGHTS = ['critical', 'normal'] as const;
export type AnchorWeight = (typeof ANCHOR_WEIGHTS)[number];

/**
 * The stored link between one page and one anchor.
 *
 * - `path` and `glob` use `repo` + `pattern` (repo-relative, no leading slash needed).
 * - `repo` uses `repo` only (the whole repository, weak signal).
 * - `jira` uses `jiraKey`.
 * - `page` (a linked Confluence page) is stored but not scored by the matcher yet.
 *
 * `repo` may be `workspace/slug`, the bare `slug`, or the repository UUID (`{...}`).
 */
export interface Binding {
  id: string;
  pageId: string;
  anchorType: AnchorType;
  repo?: string;
  pattern?: string;
  jiraKey?: string;
  weight: AnchorWeight;
  /** Times an event from this binding was dismissed. Feeds the dismiss dampener. */
  dismissCount?: number;
  /**
   * Repo-relative paths or globs this binding no longer watches ("stop watching this path for this
   * page", R-7). A file matching any of them never matches the binding.
   */
  exclude?: string[];
}
