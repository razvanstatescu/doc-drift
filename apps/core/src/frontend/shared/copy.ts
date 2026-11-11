// UI copy for the byline modal and the space dashboard, in one place so the wording stays consistent
// with brand/voice-and-copy.md: sentence case, digits, no exclamation marks, no emoji, never "this
// page is wrong" (only "its anchors changed"). Pure strings and tiny functions, no Forge imports, so
// Vitest covers them (test/frontend-format.test.ts).
import { absoluteDate, plural } from './format';

export const COPY = {
  // Shared
  tryAgain: 'Try again',
  close: 'Close',
  cancel: 'Cancel',
  notVisible: 'Page not found or not visible to you.',
  spaceNotVisible: 'Space not found or not visible to you.',
  actionFailed: "That didn't go through.",
  tryLater: 'Try again in a minute.',
  // UX-3: the byline modal can't refresh its own badge (updateBylineProperties must run from another
  // module on the page), so every success that changes the state offers a Reload page button.
  reloadBadge: 'Reload the page to see the new badge.',
  reloadPage: 'Reload the page to see the change.',
  reloadButton: 'Reload page',
  draftTitle: 'Publish this page first.',
  draftBody: 'Doc Drift watches published pages. Publish it, then add anchors from this badge.',

  // Loading and load errors
  loadingPage: "Checking this page's anchors…",
  loadFailed: "Couldn't load the drift for this page.",
  loadingDashboard: 'Counting drift…',
  dashboardFailed: "Couldn't load the dashboard.",

  // Access states
  consentTitle: 'Allow access to see drift.',
  consentBody: 'Doc Drift Sentinel reads pages as you. Grant access in Connected apps, then try again.',
  restrictedTitle: "Restricted pages can't be watched yet.",
  restrictedBody:
    "This page has view restrictions, so Doc Drift Sentinel can't read it or receive its updates. Remove the restriction to add anchors.",
  unwatchedTitle: "This space isn't watched yet.",
  openSettings: 'Open settings',
  viewOnlyTitle: 'View only',
  viewOnlyBody: 'You can see what changed. You need edit rights on this page to act on it.',

  // Review panel
  whatChanged: 'What changed',
  affectedSection: 'Affected section',
  proposedFix: 'Proposed fix',
  renamedAnchors: 'Renamed anchors',
  noAffectedSection: 'No section on this page names the changed files. Read the whole page before you verify it.',
  summaryOnly: 'Full diff is visible to page editors.',
  acceptFix: 'Accept fix',
  acceptDraft: 'Accept draft',
  rejectDraft: 'Reject draft',
  acceptAllSection: 'Accept all for this section',
  markVerified: 'Mark verified',
  snooze: 'Snooze 7 days',
  dismiss: 'Dismiss',
  proposeFix: 'Propose fix',
  dismissReason: 'Why dismiss?',
  acceptRename: 'Move anchor',
  keepRename: 'Keep',
  snoozedLozenge: 'Snoozed',
  showDiff: 'Show diff',
  hideDiff: 'Hide diff',
  quickFix: 'Quick fix',
  quickFixHelp: 'Edits the page as you, with a version message that names the PR.',
  quickFixFailed: "Couldn't apply the quick fix.",
  stopWatchFailed: "Dismissed, but couldn't stop watching every path.",

  // Anchors explainer (UX-10)
  watchAllFiles: 'Watch all files',
  watchAllPending: 'Watches every file again after you save.',
  anchorExplainer: 'An anchor is a file, folder or Jira issue this page describes. When it changes, the page is flagged.',
  weak: 'Weak',

  // Notices after actions
  verified: 'Marked Verified. Agents can cite this page again.',
  snoozed: 'Snoozed for 7 days.',
  draftRejected: 'Rejected the draft. The page is unchanged.',
  rovoOff: "Rovo isn't turned on for this site.",
  rovoOffBody: 'An admin can turn it on in Atlassian Administration.',
  rovoFailed: "Couldn't open Drift Reviewer.",

  // Anchors tab
  anchors: 'Anchors',
  anchorsTable: 'Anchors on this page',
  noAnchors: 'No anchors yet. Pick suggestions below or add one by hand.',
  suggested: 'Suggested from this page',
  suggestedHelp: 'Checked suggestions are added when you save. Weak ones start unchecked.',
  suggestRepo: 'Repository for suggested paths',
  suggestRepoMissing: 'This page links no repository. Enter one to add the suggested paths.',
  addAnchor: 'Add an anchor',
  addAnchorButton: 'Add anchor',
  critical: 'Critical anchor',
  criticalHelp: 'Critical anchors raise the severity of changes to them.',
  globHelp: 'Globs work too, for example',
  remove: 'Remove',
  duplicateAnchor: 'This anchor is already in the list.',
  saveAnchors: 'Save and mark verified',
  saveHelp: 'Saving replaces the anchors and marks this page Verified.',
  unsaved: 'You have unsaved changes.',
  saveFailed: "Couldn't save the anchors.",
  anchorsRemoved: 'Anchors removed. This page is Unanchored.',

  // Dashboard
  noSpace: 'No space in context',
  noSpaceBody: "Open the Drift dashboard from a space's sidebar.",
  dashboardLead: 'Agents are told not to trust Possibly stale and Stale pages until someone reviews them.',
  pagesWithDrift: 'Pages with drift',
  rankedBy: 'Ranked by severity, then state and open changes.',
  ownerBacklog: 'Owner backlog',
  ownerTable: 'Open changes by page owner',
  noOwner: 'No owner',
  emptyAnchoredBody: 'Open a page and click the Doc Drift badge to anchor it to code or Jira work.',
  emptyDriftBody: 'Pages show up here when the code or Jira work they describe changes.',
  kpiAnchored: 'Pages anchored',
  kpiPossiblyStale: 'Possibly stale',
  kpiStale: 'Stale',
  kpiMedian: 'Median time to verify',
  review: 'Review',
  stateFilter: 'Show',
  noFilterMatch: 'No pages in this state.',

  // Anchor this space (R-1)
  anchorSpace: 'Anchor this space',
  anchorSpaceLead: 'Suggestions come from each page: paths in code, Jira keys and repository links. Strong ones are checked. Saving marks each page Verified.',
  loadingSuggestions: 'Reading unanchored pages…',
  suggestionsFailed: "Couldn't load suggestions.",
  noSuggestions: 'No suggestions found. Unanchored pages here name no paths, Jira keys or repositories.',
  anchorSpaceForbidden: 'Only space admins and page editors can anchor pages in bulk.',
  anchorSpaceForbiddenBody: 'Ask a space admin, or open a page you can edit and use its Doc Drift badge.',
  spaceRepo: 'Repository for paths on pages that link none',
  spaceRepoMissing: 'Enter a repository for the checked paths, or uncheck them.',
  suggestionsTable: 'Suggested anchors per page',
  saveResultsTable: 'Result per page',
  anchorSpaceDone: 'Done',
  spaceSaveFailed: "Couldn't save the anchors.",

  // Settings: get started (UX-5) and coding agents (R-3)
  getStarted: 'Get started',
  stepDone: 'Done',
  forCodingAgents: 'For coding agents',
} as const;

/** R-3: the MCP endpoint for the core app (one app ID, D19). */
export const MCP_URL = 'https://mcp.atlassian.com/forge/12e968a1-a45d-4524-ba28-d47e2315db1a';

/** R-3: one line to add the server to Claude Code. */
export const MCP_ADD_COMMAND = `claude mcp add --transport http doc-drift ${MCP_URL}`;

/**
 * R-3: the copy-paste block for CLAUDE.md or AGENTS.md. One paragraph: check freshness before relying
 * on a page, and trust the code when the two disagree.
 */
export const AGENT_INSTRUCTION =
  'Before you rely on a Confluence page, call the `check-page-freshness` tool from the doc-drift MCP server with its page ID or URL. ' +
  'If the state is not `verified`, do not present its steps as current, and tell the user which page needs a review. ' +
  'When a page and the code disagree, trust the code.';

/** "Suggested from PR #482. No AI used." (rename quick fix, R-4) */
export const quickFixSource = (ref: string | null | undefined): string => (ref ? `Suggested from ${ref}. No AI used.` : 'No AI used.');

/** "Stopped watching `deploy/helm/values.yaml` for this page." (plain, for a notice body) */
export const stoppedWatching = (paths: string[]): string =>
  paths.length === 0 ? '' : `Stopped watching ${paths.join(', ')} for this page.`;

/** "Review (2)", "Anchors (3)". */
export const tabLabel = (name: string, n: number): string => `${name} (${n})`;

/** "Changes won't flag pages in PLAT until an admin turns on watching." */
export const unwatchedBody = (spaceKey: string | null | undefined): string =>
  `Changes won't flag pages in ${spaceKey || 'this space'} until an admin turns on watching.`;

/** "Snoozed until Nov 18" */
export const snoozedUntilText = (ms: number, now: number = Date.now()): string => `Snoozed until ${absoluteDate(ms, now)}`;

/** Confirm button for the dismiss form: "Dismiss change" or "Dismiss 3 changes". */
export const dismissConfirm = (n: number): string => (n === 1 ? 'Dismiss change' : `Dismiss ${n} changes`);

/** "Dismissing closes this change without editing the page. The reason tunes future alerts." */
export const dismissHelp = (n: number): string =>
  `Dismissing closes ${n === 1 ? 'this change' : `all ${n} changes`} without editing the page. The reason tunes future alerts.`;

/** "Dismissed 2 changes as not relevant." */
export const dismissedTitle = (n: number, reasonLabel: string): string => `Dismissed ${plural(n, 'change')} as ${reasonLabel.toLowerCase()}.`;

/** "The 2 open changes stay on the page until someone reviews them." */
export const snoozedBody = (n: number): string => `The ${plural(n, 'open change')} stay on the page until someone reviews them.`;

/** "Accepts 2 drafts in page order." (footer helper under Accept fix) */
export const acceptAllHelp = (n: number): string => (n === 1 ? 'Accepts the draft above.' : `Accepts ${n} drafts in page order.`);

/** "Saved 3 anchors. This page is Verified." */
export const anchorsSavedTitle = (n: number, statusLabel = 'Verified'): string =>
  n === 0 ? COPY.anchorsRemoved : `Saved ${plural(n, 'anchor')}. This page is ${statusLabel}.`;

/** "Show all 9 changes" */
export const showAll = (n: number, noun: string): string => `Show all ${plural(n, noun)}`;

/** "Drift in PLAT" */
export const dashboardTitle = (spaceKey: string | null | undefined): string => (spaceKey ? `Drift in ${spaceKey}` : 'Drift dashboard');

/** "Pages with drift in PLAT" (the table's accessible label) */
export const pagesTableLabel = (spaceKey: string | null | undefined): string => `Pages with drift${spaceKey ? ` in ${spaceKey}` : ''}`;

/** "No pages in PLAT are anchored yet." */
export const noAnchoredPages = (spaceKey: string | null | undefined): string => `No pages in ${spaceKey || 'this space'} are anchored yet.`;

/** R-7: paths a glob or repo anchor no longer watches. "Not watching deploy/values.yaml." */
export const notWatchingLine = (paths: string[]): string => {
  const shown = paths.slice(0, 3).join(', ');
  const more = paths.length > 3 ? ` and ${paths.length - 3} more` : '';
  return `Not watching ${shown}${more}.`;
};
