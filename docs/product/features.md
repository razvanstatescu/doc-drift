# Features and UX flows

Hackathon scope in MoSCoW order. The numbers are stable IDs. Refer to them in issues and commits ("F5 review panel").

## Must

| # | Feature | Notes |
| --- | --- | --- |
| F1 | Anchor binding UI in the byline modal | Anchor types: repo + path, repo + glob, Jira issue/epic, linked page. Auto-suggest from the page body: repo URLs, file paths in code blocks, backticked paths, Jira keys. Pages with view restrictions show "Restricted pages can't be watched yet" (D20). |
| F2 | Bitbucket relay + ingest web trigger, Jira update trigger | See [architecture/overview.md](../architecture/overview.md) |
| F3 | Deterministic matcher | Scoring, debounce, rename handling, revert handling, ignore patterns. See [architecture/detection.md](../architecture/detection.md) |
| F4 | Byline badge with 4 states | Written through `contentPropertyKey`, so a page view runs no function |
| F5 | Review panel | Trigger details (PR title, author, merged time, changed files, hunk excerpt or Jira changelog), affected page sections, severity. Actions: Mark verified / Dismiss (with reason) / Snooze 7 days / Propose fix |
| F6 | Drift Reviewer Rovo agent | Actions `get-drift-context`, `check-page-freshness`, `record-verification` |
| F7 | `rovo:mcp` server | Tools `check-page-freshness`, `find-docs-for-path`, `list-stale-pages` |
| F8 | Space dashboard | Drift debt, top stale pages, owner backlog |
| F9 | Demo mode | "Replay seeded PR" button in global settings that injects a stored change record. Judging must never depend on Bitbucket setup. |

## Should

| # | Feature |
| --- | --- |
| F10 | `rovo:skill` "check-page-freshness": SKILL.md tells Drift Reviewer to call the tool before citing a page and to caveat answers from Possibly stale pages. Skills attach only to our own agent; other agents get the same instruction from action descriptions and the `guidance` field. |
| F11 | Apply accepted proposal as a new page version, `asUser()` |
| F12 | Teamwork Graph "Suggest anchors from links" (persisted query) in the binding modal. TWG scopes need an org admin to install, may spend customer Rovo credits, and adding them later forces a major version: decide by Dec 1. |
| F13 | Admin settings: sensitivity preset, ignore globs, per-space opt-in, notification routing |
| F14 | Footer comment notification mentioning the owner |

## Could

| # | Feature |
| --- | --- |
| F15 | Page banner (48 px) for Stale pages only |
| F16 | Optional Forge LLM gray-zone triage (developer-paid) behind a setting |
| F17 | Readership weighting from page analytics (availability varies by plan) |
| F18 | Slack notification via egress (breaks Runs on Atlassian; skip for the hackathon) |

## Won't (hackathon)

GitHub/GitLab real-time, symbol-level tree-sitter anchors, Teamwork Graph connector write-back, silent auto-edits, Compass anchors.

## Scope-cut order

When behind schedule, cut from the top: page banner, Forge LLM triage, readership weighting, TWG suggest anchors, apply-as-version (keep the comment), Jira rules beyond status/fixVersion, `rovo:skill` (keep the action and MCP), dashboard owner backlog.

**Never cut:** relay + matcher, byline, review panel, agent, MCP, demo mode.

## Page states

| State | Enters when | Leaves when |
| --- | --- | --- |
| Unanchored | Page has no bindings | First binding saved (goes to Verified) |
| Verified | Bindings saved, or a human verifies | First drift event at or above the threshold |
| Possibly stale | An anchor changed after the last verification | Verified, all events dismissed, or escalated |
| Stale | Possibly stale for 7 days unresolved (setting), or 3+ open events, or a further High severity event on a critical anchor while already Possibly stale (D27) | Verified or all events dismissed |

## UX flows

### 1. Install and connect
The admin installs the core app (Confluence, then connects Jira). The settings page shows a generated relay secret and the ingest URL. The admin installs the relay app in a Bitbucket team workspace, opens its workspace settings page, and pastes the URL and secret. A test button makes the relay post a ping, and the core app shows "Connected: workspace acme, 4 repos seen".

### 2. Bind anchors
The byline shows "Unanchored". Clicking it opens the modal with suggested anchors parsed from the page, with checkboxes, for example "payments-api: /deploy/helm/**", "PAY-142 epic" and "payments-api: scripts/rollback.sh". There is a manual add form: repo picker, path/glob, weight (critical/normal). Save writes the bindings and sets the badge to Verified with a timestamp.

### 3. Badge states and tooltips
See the tooltip table in [brand/voice-and-copy.md](../../brand/voice-and-copy.md).

### 4. Review panel
A modal (`viewportSize: large`). The left column lists drift events: PR or Jira change, score, matched anchor, files. The right column shows page sections with matched passages highlighted (matched by path string, identifiers, code block hash). Footer: Mark verified, Dismiss (reason required: not relevant / already updated / false positive), Snooze, Propose fix (opens the Rovo agent with context, or calls the action). The visual reference is the canvas's Interface kit board ([brand/design-reference.md](../../brand/design-reference.md)).

### 5. Notifications
A footer comment on the page: "@owner PR #482 (merged by Sam) changed 2 files this page documents. Review in the Doc Drift badge." At most one comment per page per 24 hours. After that, updates are appended to the open drift event.

### 6. Space dashboard (`confluence:spacePage`)
KPI tiles: anchored pages %, Possibly stale count, Stale count, median time-to-verify. A table ranked by `severity x readership weight`; readership falls back to "linked from N pages" if analytics are unavailable. An owner backlog grouped by owner.

### 7. Rovo chat
"Is the payments rollback runbook still valid?" The agent calls `check-page-freshness` and answers: "Possibly stale: PR #482 renamed scripts/rollback.sh to scripts/rollback-v2.sh after the page was verified." Then "Propose fix": the agent calls `get-drift-context` and drafts a replacement for the affected step. The user accepts it with the review panel's accept button. **The agent never writes.**

### 8. MCP for coding agents
In Claude Code: "Before I edit deploy/helm/values.yaml, which docs describe it?" calls `find-docs-for-path`. After the change, "Is the rollback runbook still trustworthy?" calls `check-page-freshness`.

### 9. Admin settings
- Sensitivity: Strict 0.4 / Balanced 0.5 / Quiet 0.65 threshold.
- Ignore globs, default: `**/*.test.*, **/__tests__/**, **/*.lock, package-lock.json, yarn.lock, pnpm-lock.yaml, **/*.snap, **/dist/**, **/*.md`.
- Per-space opt-in.
- Escalation days (default 7).
- Ignore merges to non-default branches (default on).
