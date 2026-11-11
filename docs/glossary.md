# Glossary

Use these terms consistently in code, UI and docs.

| Term | Meaning |
| --- | --- |
| **Anchor** | Something a page describes that we watch: a repo path, a repo glob, a Jira issue or epic, a linked page, or (weakly) a whole repo. |
| **Binding** | The stored link between one page and one anchor, with a weight (critical or normal). One page has many bindings. |
| **Change record** | A normalized description of a change: a merged PR (files, hunks, title, author) or a Jira issue update (changelog). Produced by the relay or the Jira trigger. |
| **Drift event** | A scored match between a change record and a page's binding at or above the threshold. Open, dismissed, resolved, reverted or snoozed. |
| **Drift debt** | The open drift across a space, used on the dashboard. |
| **Score** | 0 to 1 strength of a match, from path match × weight × change magnitude, plus identifier and snippet-hash boosts. |
| **Severity** | High or Medium. High if score ≥ 0.8, an anchored file was removed or renamed, or the anchor is critical. |
| **Threshold** | The minimum score for a drift event. Strict 0.4, Balanced 0.5 (default), Quiet 0.65. |
| **Verification** | A human (or an accepted proposal) confirming a page matches its anchors again. Closes open events. |
| **Page state** | Verified, Possibly stale, Stale or Unanchored (`verified`, `possibly_stale`, `stale`, `unanchored`; plus `unknown` when the caller cannot see the page). |
| **Escalation** | Possibly stale becomes Stale after 7 days (setting), 3+ events, or High severity on a critical anchor. |
| **Relay** | The separate Bitbucket Forge app that forwards merged-PR change records to the core app. |
| **Ingest** | The core app's web trigger that receives change records from the relay. |
| **Demo mode** | Replays a stored change record (PR #482) without Bitbucket. |
| **Drift Reviewer** | The Rovo agent. Explains drift and drafts fixes; never writes. |
| **Freshness check** | The `check-page-freshness` tool any agent calls before citing a page. |
| **Slip / trace** | Brand devices. The slip is an amber band offset from its line (the one thing that changed). The trace is a faint fill where content should be. |
| **Night shift / Day** | The dark (primary) and light brand themes. |
