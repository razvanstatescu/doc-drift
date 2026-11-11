# Phase 2 backlog: bugs, UX and product improvements (2026-11-11)

Merged from:
- [test-report-2026-11-11.md](test-report-2026-11-11.md) (BUG-xx)
- [ux-review-2026-11-11.md](ux-review-2026-11-11.md) (UX-n)
- [../research/user-needs-and-competitors.md](../research/user-needs-and-competitors.md) (R-n)

Production, share links, the judge guide and video stay out of scope. No new scopes (avoids a major version): R items that need scopes are listed under "Decide by Dec 1".

## Track A: backend (main tree, the only deployer)

| Pri | ID | Item |
| --- | --- | --- |
| P0 | UX-1 | Drift Reviewer and tools must always name the page they answer about; never answer for the Rovo context page when the user asked about another (ties to BUG-04) |
| P0 | BUG-04 | Unparseable page reference (share link, title passed as pageId) falls back to the context page. Resolve share/tiny links and titles; otherwise return a clear "which page?" error |
| P0 | BUG-05 | Agent can't see link text, so accepting a draft duplicates or destroys links and mentions. Expose inline structure in blocks; refuse drafts that would drop links |
| P0 | BUG-01 | A negated ignore glob (`!…`) ignores everything. Reject in validation; the matcher treats negation safely |
| P0 | BUG-02 | A revert of an already-verified change is never scored. It must score as a normal change |
| P0 | BUG-03 | A revert closes the wrong PR when the title holds "#N". Match by the reverted PR's identity |
| P1 | BUG-06..13 | Folder anchor without glob; prefix-less glob in find-docs; diffstat truncated at 500 is invisible (surface it as a reason); trash-restored page keeps its old badge; case-insensitive space keys; a page moved across spaces disappears; view-only users can submit drafts (needs update); a revert delivered before its original |
| P1 | UX obs | "Marked verified." on Unanchored pages; the unicode anchor rejection reason; get-drift-context `truncated` must be honest; dismissing all changes records who verified |
| P1 | UX-2 | Draft pages: "Publish this page first." instead of the restricted message (needs a draft/status flag in getPageDrift) |
| P1 | R-2 | A plain "why flagged" sentence per event and page (`whySentence`), built from the reasons |
| P1 | R-5 | `check-page-freshness`: a `citePolicy` field (`cite` / `cite_with_caveat` / `do_not_cite`) and the affected section headings |
| P1 | R-6 | Drift comment mentions the PR author too when an Atlassian account can be resolved (Bitbucket gives a display name only: mention the owner, name the author) |
| P1 | R-7 | Dismiss "Not relevant" offers "stop watching this path for this page" (a resolver to remove or narrow the binding) |
| P1 | R-8 | Verified context: count changes to anchored code since verification that didn't flag ("12 changes since, none relevant") |
| P2 | BUG-14..19 | Change-wide boosts repeated per anchor; re-saving an anchor keeps dismissCount (reset it on re-add or explicit reset); prefix path-token matches; over-broad `spans_blocks`; a Jira record without changelogId dedupes wrongly; git-quoted unicode paths |
| P1 | R-1 (backend) | Space bulk-anchor: a resolver that runs the suggester over all unanchored pages in a space and returns proposals, plus bulk save |
| P1 | R-4 (backend) | Rename quick-fix: for renamed files, a deterministic proposal "replace old path with new path" in affected blocks (no AI), applied via the existing apply path |

## Track B: UI (worktree)

| Pri | ID | Item |
| --- | --- | --- |
| P0 | UX-3 | After any action, the byline badge refreshes live (`view.refresh` / bridge where possible), else a clear "Reload the page to update the badge" with a button |
| P0 | UX-4 | Event cards: summary first (why sentence, files as a compact list); the raw diff hidden behind "Show diff" |
| P0 | UX-6 | The byline title starts with the state word (backend writes the title; UI copy constants: coordinate via `stateTitle`) |
| P1 | UX-5 | Settings: a "Get started" 3-step section (connect relay, anchor pages, try demo replay); relay connection above the tuning cards |
| P1 | UX-7 | Dashboard: a per-row "Review" action (opens the page) and sortable columns; a filter by state |
| P1 | UX-8 | After Mark verified or Accept, scroll to or focus the success message |
| P1 | UX-9 | Verified line shows who verified ("Verified by Razvan Statescu, 4 hours ago") |
| P1 | UX-10 | The Anchors tab explains what an anchor is (one line), suggestions in mono, "whole repo" demoted and labelled weak |
| P1 | UX-2 (UI) | The draft-page message |
| P1 | R-1 (UI) | Dashboard "Anchor this space" flow: a table of suggested anchors per unanchored page with checkboxes, then Save all |
| P1 | R-3 | Settings "For coding agents" card: the copy-paste CLAUDE.md / AGENTS.md block plus the MCP URL and `claude mcp add` line |
| P1 | R-2, R-4, R-7, R-8 (UI) | Show the why sentence; the rename quick-fix button; the "stop watching this path" option on Dismiss "Not relevant"; the verified-context line |

## Decide by Dec 1 (adds scopes, so a major version)
- Sync with native Confluence "Verified" status.
- Create a Jira task from a drift event.

## Not doing now
- Viewer-persona browser test (needs a second account).
