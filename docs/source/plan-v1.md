# Doc Drift Sentinel: Features and Implementation Plan (Codegeist 2026)

Doc Drift Sentinel is buildable on Forge in 42 days, with one big change to the architecture: Bitbucket cannot be part of the same Forge install as Confluence, so you ship two Forge apps (a Confluence+Jira core app and a small Bitbucket relay). Every other piece you need (byline badge, page banner, Jira change events, Rovo agent, reusable skill, and MCP tools that Claude Code or Cursor can call) is documented and usable today. Build the core so detection is deterministic and needs no LLM. Use AI only when a human asks for a proposed fix. Lead the pitch with "agents should not cite docs that the code has already invalidated". The only competitors are age-based staleness apps and Atlassian's manual "Verified" status.

## TL;DR

- **Feasible, with one architectural constraint.** Forge multi-app compatibility covers Jira, Confluence and Compass, not Bitbucket. Ship a core app (Confluence required, Jira optional) that holds the byline, dashboard, Jira trigger, Rovo agent, skill and `rovo:mcp` tools, plus a Bitbucket relay app that listens to `avi:bitbucket:fulfilled:pullrequest`, reads the diffstat and pushes a compact change record to the core app's web trigger. Include a "replay seeded PR" demo mode so judges never depend on Bitbucket setup.
- **Differentiation is real and narrow.** Existing Marketplace apps (Recheck, Page Review Manager, Stale Content Auditor, Clearlane Content Review, Stale Page Finder) and native Confluence "Verified" all work from age or manual review. None ties staleness to code, Jira or decision changes, and none exposes freshness to agents. One Atlassian Community user puts the gap this way: "what actually invalidates technical docs isn't time passing, it's the system changing underneath them."
- **Win strategy.** A submission can win one Grand Prize plus only one Bonus Prize, so build the agent, skill and MCP surface as one story, and submit for Marketplace listing by Dec 11 (that bonus has 6 winners, the widest net). Keep detection credit-free, put LLM work behind an explicit "Propose fix" click, freeze features Dec 18 and submit Dec 21.

## Key Findings

### 1. What changed versus the original concept

| Assumption in concept | Verified reality (Nov 2026) | Impact |
|---|---|---|
| One app covers Confluence, Jira, Bitbucket | Multi-app compatibility is Preview and limited to Jira, Confluence, Compass.\[1\] Only Jira or Confluence can be the required app. Atlassian staff call cross-app coordination with Bitbucket "entirely do-it-yourself at this time." A Bitbucket-context call to another product fails with "Request jira is not allowed from bitbucket context." | Two Forge apps, two install links. A Codegeist forum answer says the rules ask for an install link plus setup steps "They don't say how many."\[2\] |
| Inline banner needs a macro workaround | `confluence:pageBanner` exists, supported on pages, live docs and spaces.\[3\] Atlassian capped it at 48px height for CLS reasons and moved it back to Preview.\[4\] Community reports layout shift and loading spinners because it renders on every page.\[5\] | Use the byline badge as the primary signal. The banner is a "Could", shown only for Stale pages. |
| Byline badge needs a function call per page view | `contentPropertyKey` (Forge CLI 12.6.1+) renders title, icon and tooltip from a content property "instead of executing the dynamicProperties function."\[6\] | Write the badge state into a content property when drift is detected. Zero invocations on page view. |
| External MCP clients may not be able to reach Forge tools | Docs updated Oct 29, 2026: tools "can also be connected to third-party, MCP-compatible AI clients (Preview)" at `https://mcp.atlassian.com/forge/<appId>`. External exposure is "disabled by default", enabled per site by an admin, with an OAuth 2.1 consent screen.\[7\] | Claude Code and Cursor demo is possible. Admin toggle is a judge setup step. |
| Teamwork Graph supports ad hoc Cypher | Teamwork Graph API moved to Preview.\[8\] Raw Cypher at request time is refused. You register persisted Cypher queries (queryKey) or use curated typed queries.\[9\] Scopes follow `read:graph:<object>:<product>`.\[8\] `requestTeamworkGraph` is `asUser()` only.\[9\] | Use it for interactive "suggest anchors" only, never in background triggers. |
| Any bonus prize can stack | "The same Submission can win up to one Grand Prize and one Bonus Prize."\[10\] | Pick a headline bonus. Do not dilute scope chasing all four. |

### 2. Codegeist rules that shape the plan

- Marketplace bonus text: "All Eligible Submissions that are published to the Marketplace or submitted for listing. Provide either the link to the listing or link to the Marketplace review ticket." $1,500, 6 winners.\[10\] The rules set no separate Marketplace deadline, so the ticket must exist by the Dec 22, 12:00 PM PT submission deadline.\[10\]
- Judging runs Jan 5 to Feb 3, 2027.\[10\] Your install links and demo site must stay alive through February.
- An unofficial note says an app submitted for listing cannot be shared through an installation link.\[11\] Mitigation: register a second app ID (same code) for judge installs.
- Multi-app Forge apps listed on Marketplace must be paid apps ("free listings are not supported").\[12\] The core app uses Jira as an optional app, so its listing must be paid. Bitbucket Forge apps get informational listings and keep developer-console distribution.\[13\]

### 3. Competitive landscape

| Product | Trigger for "stale" | Agent-aware | Code-aware |
|---|---|---|---|
| Confluence Verified (native, Apr 2024) | Manual. Only page owners and admins can set it. Automation can flag inactive verified pages.\[14\] The status "sits on the page itself, not on a specific version."\[15\] | No | No |
| Recheck (Codegeist 2026, Vinit Shah) | Stale page reviews. GitHub repo vinit1009/forge-app-policies lists "Recheck: stale page reviews for Confluence" as one of Shah's Codegeist 2026 apps, next to Stamp, Handoff and Guardrails. That confirms the name and tagline only, not its features. | Unknown | No |
| Page Review Manager | Review cadence, due-soon, reminders, Jira follow-up. One governed space per install.\[16\] | No | No |
| Stale Content Auditor | Fresh/Aging/Stale buckets by day thresholds.\[17\] Its Marketplace listing: "A page counts from its last edit or its last recorded review, whichever is newer" | No | No |
| Stale Page Finder | Age thresholds of "90 days, 180 days, a year, or custom" (Marketplace listing), filtered by space, with bulk labeling for review | No | No |
| Clearlane Content Review | Time since edit or "Still accurate" confirmation (3 months to 2 years) | "Works with Rovo" (unspecified)\[18\] | No |
| Accord (Codegeist 2026) | Decision drift between Jira releases and Confluence decisions, Rovo/MCP read-only actions\[19\] | Yes | No |
| Precedent (Codegeist 2026) | Decision memory, flags Jira work that contradicts decisions, MCP for coding agents\[20\]\[21\] | Yes | No |
| Swimm | Smart tokens, smart paths and code snippets coupled to code. Auto-sync handles small changes. swimm.io: "If Swimm's Auto-sync algorithm determines that a change in the code is impactful enough that it warrants getting more information, Swimm's verification check fails." | Partial | Yes, repo-hosted Markdown only |

Takeaway: the gap is "Confluence pages coupled to code and Jira, with freshness exposed to agents." Accord and Precedent occupy decision drift. Stay clear of them by anchoring on code paths and Jira scope changes, and mention decisions only as a secondary anchor type.

### 4. User need evidence

- Atlassian Community thread on archiving pages for Rovo: "A page untouched for two years can still be completely correct, and a page reviewed last month can already be wrong - because what actually invalidates technical docs isn't time passing, it's the system changing underneath them." Same thread: "How-tos, process docs, configuration guides: these are the dangerous ones... an agent will happily serve them."\[22\]
- Rovo does not prefer newer pages. The Atlassian Community article "When 2 Pages are the Same Which Wins in Rovo? [Champions Slack Insider]" answers a question from Yong Yang: "Short answer: It doesn't 'pick the newest' automatically." The Community thread "How does Rovo handle conflicting or incomplete information?" agrees: "Rovo can't automatically identify official sources of truth" and "If pages conflict, it won't reliably pick the correct version or flag contradictions." A Rovo review test "could not determine that Rovo consistently treats a reviewed or recently updated page as more authoritative."
- Incident cost: ITOC360's blameless-postmortem guide, "Based on analysis of 1,500+ production incidents across SRE organizations," lists "Missing / stale runbook" as a contributing factor in 12% (configuration change leads at 37%). That is vendor data, not independently verified. Several SRE guides also say a stale runbook is worse than none.

**Primary persona:** platform/SRE lead who owns runbooks and on-call docs in Confluence and whose team now asks Rovo or coding agents for procedures. **Secondary:** engineering manager or DevEx lead accountable for onboarding docs and agent answer quality.

**Jobs to be done:** (1) When code or scope changes, tell me which pages it broke before someone follows them at 3am. (2) Stop agents from citing pages I have not re-verified. (3) Make fixing a drifted page take 2 minutes, not a context-rebuilding hour. (4) Show me drift debt per space so I can prioritize.

## Details

### 5. Forge technical feasibility (verified items and gaps)

**Confluence**
- `confluence:contentBylineItem`: properties include `title`, `icon`, `tooltip`, `dynamicProperties`, `contentPropertyKey`, `viewportSize` (`small` to `fullscreen`, plus `resizable` and custom sizes in Preview), `viewportContainer` (`popup` or `modal`), `displayConditions`. Custom UI links need `router.navigate`. Refresh after change with `useContentProperty` (`@forge/react` 11.4.0+) or `updateBylineProperties` (`@forge/confluence-bridge` 3.1.0+).\[6\]
- Other modules confirmed: `confluence:pageBanner`, `confluence:spacePage`, `confluence:globalPage`, `confluence:contextMenu`, `confluence:contentAction`, `confluence:backgroundScript`, `confluence:spaceSettings`, `confluence:globalSettings`, `macro`, `confluence:contentProperty`.\[6\]
- REST (verify exact paths in week 1): v2 pages with `body-format=storage` or `atlas_doc_format`, page versions, page content properties (`/pages/{id}/properties`), footer and inline comments, labels. Page owner is on the v2 page object as `ownerId` (verify).
- Human-approved edit options, ranked: (1) footer comment with the proposal plus "Open editor" (safest, no write scope on page body). (2) `asUser()` page update with version message "Doc Drift: accepted proposal for PR #N", reversible through page history. (3) Inline comment anchored to the affected passage (best UX, most fragile because of text selection matching). There is no "suggested edit" API in Confluence. Ship (1) as Must and (2) as Should.
- Permissions: run detection `asApp()`, but every user-facing read (review panel, agent action, MCP tool) goes `asUser()` so page restrictions are respected. MCP tools run "subject to the invoking user's own permissions on that site."\[7\]

**Bitbucket**
- Events: `avi:bitbucket:created:pullrequest`, `avi:bitbucket:updated:pullrequest`, `avi:bitbucket:fulfilled:pullrequest` ("sent when a pull request is merged", scope `read:pullrequest:bitbucket`), and `avi:bitbucket:push:repository` (community-confirmed spelling; `pushed` does not fire).\[23\]\[24\] The payload includes repository UUID, pull request ID, source/destination branches and `mergeCommit.hash`.\[25\]
- Changed files: `GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{id}/diffstat` (redirects to repository diffstat for the PR revspec) and `/diff` for hunks. Pages hold up to 100 entries, so paginate. Call through `api.asApp().requestBitbucket(route\`...\`)`.\[26\]\[27\]\[28\] Needs `read:repository:bitbucket`.\[29\]\[30\]
- Installation: Forge apps do not run on personal workspaces, so judges need a team workspace. Required merge checks are Premium only, which this plan does not use.\[2\]\[31\]
- GitHub/GitLab: no first-class Forge event path. Teamwork Graph has "External pull request", "External commit" and "External repository" objects, and Confluence pages have a "Content entity links entity" relationship to them.\[32\]\[33\] That covers discovery, not real-time triggering. GitHub is post-hackathon.

**Jira (core app, optional Jira compatibility)**
- `avi:jira:updated:issue` payload includes `changelog` with `from`/`to` raw values. `fromString`/`toString` are populated only for `status`, `resolution`, `priority`, `description`, `issuetype`, `versions`, `fixVersions`, `components`, `duedate`, `timeoriginalestimate`, `IssueParentAssociation`, `project`. Scope `read:jira-work`.\[34\] Use a trigger filter expression on `event.changelog.items` to drop irrelevant updates before invocation.\[35\]\[36\]
- Relevant scope changes: status category to Done or Won't Do, `fixVersions`, `components`, `description`, parent/epic re-association, summary (raw value only).
- Page-to-epic discovery: parse Jira keys from page body (regex `[A-Z][A-Z0-9]+-\d+` plus Jira macro parameters). Teamwork Graph links pages to Jira work items for the interactive suggestion step.

**Rovo**
- `rovo:agent`: prompt plus `actions` list (and `skills`). Agents are subject to Atlassian safety screening.\[7\]\[37\]
- `action`: `key`, `name`, `function` (or `endpoint`), `actionVerb` (`GET`, `UPDATE`, ...), `description`, typed `inputs`.\[7\]\[38\] The same action can serve your agent, skills and MCP.\[39\]
- `rovo:skill` (Preview): SKILL.md instructions plus files plus action dependencies. Skill directory max 100 MB. "Tool dependencies must be action modules declared by the same app."\[40\]\[41\] Skill content deploys as a resource, so you can change instructions without a new major version.\[42\]
- `rovo:mcp` (Preview): one per app, `name` up to 30 characters, at most 50 actions, action keys under 64 characters.\[7\] Tools appear to customer-built agents in Rovo Studio.\[38\] This is how "other agents check freshness before citing": admins add your tool to their agents, and external clients connect over MCP.
- Cost: from Dec 3, 2026, Rovo credit overage bills at $0.01/credit. A basic agent run or Rovo Chat answer costs 10 credits.\[43\]\[44\] Forge LLM calls (Preview) are billed to you, the developer. Atlassian's Forge LLMs pricing doc says "Forge LLMs usage is charged to the developer of the Forge app" and "The Forge LLMs API does not include a free monthly usage quota" (billing started June 1, 2026). Teamwork Graph "enriched context" access can consume Rovo credits.\[45\] There is no API for apps to read the customer's credit meter.\[46\]

**Teamwork Graph**
- Preview, same support as GA, "minimum 1-month deprecation notice" for breaking changes. Persisted query registration takes about a minute to distribute.\[9\] A Codegeist builder reported the registration endpoint answered 401 to an API token and only worked from a logged-in admin browser session.\[47\] Plan an hour for this.
- Useful for: pages a user owns or contributed to, page links to PRs/repos/work items.\[48\] Not useful for: background detection (asUser only), writing freshness back (the `graph:connector` module is GA but ingests external-system objects, not annotations on Confluence pages).\[49\]\[50\]

**Forge platform limits that matter**
- Default function timeout 25s for UI/resolver invocations. Async event consumers default to 55s, configurable to 900s with `timeoutSeconds`. Single outbound request cap 180s in async.\[51\]\[52\]\[53\]
- Async events: 50 events per push, 500 events/minute, 200 KB payload, `delayInSeconds` up to 15 minutes (use this for debouncing), cyclic chain limit 1000 pushes.\[51\]\[54\]
- `forge tunnel` only forwards traffic for the CLI user.\[55\] Test multi-user permission cases on a deployed environment.

### 6. Architecture

```
Bitbucket workspace                      Atlassian site (Confluence + Jira)
┌────────────────────────┐               ┌──────────────────────────────────────────────┐
│ dds-bitbucket-relay     │  HTTPS POST   │ doc-drift-sentinel (core)                    │
│ trigger: fulfilled:PR   │──────────────▶│ webtrigger: ingest-change (HMAC verified)    │
│ fn: read diffstat+diff  │  (HMAC)       │   └─▶ queue: match-queue (debounce 600s)     │
│ storage: relay secret   │               │ trigger: avi:jira:updated:issue (filtered)   │
└────────────────────────┘               │   └─▶ queue: match-queue                     │
                                         │ consumer: matcher (timeoutSeconds 120)       │
                                         │   ├─ anchor lookup (Forge SQL / entities)    │
                                         │   ├─ score + DriftEvent upsert               │
                                         │   └─ write content property (byline state)   │
                                         │ consumer: notifier (footer comment, mention) │
                                         │ scheduled: escalate Possibly stale → Stale   │
                                         │ UI: contentBylineItem (review panel, modal)  │
                                         │     spacePage (drift dashboard)              │
                                         │     contextMenu ("Anchor selection")         │
                                         │     globalSettings / spaceSettings           │
                                         │ Rovo: agent drift-reviewer, skill            │
                                         │       check-page-freshness, actions          │
                                         │ rovo:mcp: doc-drift tools                    │
                                         └──────────────────────────────────────────────┘
```

Fallback if the relay is blocked: the core app polls Bitbucket REST with a workspace access token stored as a Forge secret, using a scheduled trigger. That needs egress to `api.bitbucket.org`, which removes "Runs on Atlassian" eligibility for the core app, so treat it as fallback only. The relay itself needs egress to your site's web trigger URL, so the relay will not be Runs on Atlassian either. Accept that. The core app can stay egress-free.

### 7. Feature spec (MoSCoW for the hackathon)

**Must**
1. Anchor binding UI in the byline modal: repo + path or glob, Jira issue/epic, linked page. Auto-suggest from page body (repo URLs, file paths in code blocks, backticked paths, Jira keys).
2. Bitbucket relay plus ingest web trigger, and a Jira update trigger.
3. Deterministic matcher with scoring, debounce, rename handling, revert handling, ignore patterns.
4. Byline badge with 4 states written through `contentPropertyKey`.
5. Review panel: trigger (PR title, author, merged time, changed files, hunk excerpt or Jira changelog), affected page sections, severity, actions Mark verified / Dismiss as not relevant / Snooze 7 days / Propose fix.
6. Drift Reviewer Rovo agent plus actions `get-drift-context`, `check-page-freshness`, `record-verification`.
7. `rovo:mcp` exposing `check-page-freshness`, `find-docs-for-path`, `list-stale-pages`.
8. Space dashboard: drift debt, top stale pages, owner backlog.
9. Demo mode: "Replay seeded PR" button in global settings that injects a stored change record.

**Should**
10. `rovo:skill` "check-page-freshness" with SKILL.md telling any agent to call the tool before citing a page and to caveat answers from Possibly stale pages.
11. Apply accepted proposal as a new page version `asUser()`.
12. Teamwork Graph "Suggest anchors from links" (persisted query) in the binding modal.
13. Admin settings: sensitivity preset, ignore globs, per-space opt-in, notification routing.
14. Footer comment notification mentioning the owner.

**Could**
15. Page banner (48px) for Stale pages only.
16. Optional Forge LLM gray-zone triage (developer-paid) behind a setting.
17. Readership weighting from page analytics (availability varies by plan; verify).
18. Slack notification via egress (breaks Runs on Atlassian; skip for the hackathon build).

**Won't (hackathon)**
GitHub/GitLab real-time, symbol-level tree-sitter anchors, Teamwork Graph connector write-back, silent auto-edits, Compass anchors.

### 8. UX flows

1. **Install and connect.** Admin installs the core app (Confluence, then connect Jira). The settings page shows a generated relay secret and the ingest URL. Admin installs the relay app in a Bitbucket team workspace, opens its workspace settings page and pastes the URL and secret. Test button: relay posts a ping and the core app shows "Connected: workspace acme, 4 repos seen".
2. **Bind anchors.** Byline shows "Unanchored". Click to open the modal with three suggested anchors parsed from the page ("payments-api: /deploy/helm/**", "PAY-142 epic", "payments-api: scripts/rollback.sh") with checkboxes. Manual add form: repo picker, path/glob, weight (critical/normal). Save writes Binding rows and sets the badge to Verified with timestamp.
3. **Badge states and tooltips.**
   - Verified (green check): "Verified by Dana 3d ago. Watching 3 anchors."
   - Possibly stale (yellow): "PR #482 changed deploy/helm/values.yaml 2h ago. Review."
   - Stale (red): "Unreviewed drift for 7 days (2 changes). Agents told not to trust this page."
   - Unanchored (grey): "Not linked to code or Jira. Add anchors."
4. **Review panel** (modal, `viewportSize: large`): left column lists drift events (PR or Jira change, score, matched anchor, files). Right column shows page sections with matched passages highlighted (match by path string, identifiers, code block hash). Footer: Mark verified, Dismiss (reason required: not relevant / already updated / false positive), Snooze, Propose fix (opens Rovo agent with context or calls the action).
5. **Notifications:** footer comment on the page, "@owner PR #482 (merged by Sam) changed 2 files this page documents. Review in the Doc Drift badge." One comment per page per 24h, then updates are appended to the open drift event.
6. **Space dashboard** (`confluence:spacePage`): KPI tiles (anchored pages %, Possibly stale count, Stale count, median time-to-verify). Table ranked by `severity x readership weight` (readership falls back to "linked from N pages" if analytics are unavailable). Owner backlog grouped by owner.
7. **Rovo chat:** "Is the payments rollback runbook still valid?" Agent calls `check-page-freshness` and answers "Possibly stale: PR #482 renamed scripts/rollback.sh to scripts/rollback-v2.sh after the page was verified." Then "Propose fix": agent calls `get-drift-context`, drafts a replacement for the affected step, and the user clicks the review panel's accept button (the agent never writes).
8. **MCP for coding agents:** in Claude Code, "Before I edit deploy/helm/values.yaml, which docs describe it?" calls `find-docs-for-path`. After the change, "Is the rollback runbook still trustworthy?" calls `check-page-freshness`.
9. **Admin settings:** sensitivity (Strict 0.4 / Balanced 0.5 / Quiet 0.65 threshold), ignore globs default `**/*.test.*, **/__tests__/**, **/*.lock, package-lock.json, yarn.lock, pnpm-lock.yaml, **/*.snap, **/dist/**, **/*.md`, per-space opt-in, escalation days (default 7).

### 9. MCP / action tool surface

Forge action inputs are flat typed fields, so keep inputs simple and return JSON strings.

| Tool (action key) | Inputs | Output (JSON) |
|---|---|---|
| `check-page-freshness` | `pageId` (string, optional), `pageUrl` (string, optional), `title` (string, optional) | `{ pageId, title, status: "verified"\|"possibly_stale"\|"stale"\|"unanchored", verifiedAt, verifiedBy, openDrift: [{ source: "bitbucket"\|"jira", ref, summary, score, at }], guidance }` |
| `find-docs-for-path` | `repo` (string), `path` (string) | `{ pages: [{ pageId, title, url, anchor, status }] }` |
| `list-stale-pages` | `spaceKey` (string, optional), `limit` (number, optional) | `{ pages: [{ pageId, title, status, score, owner, since }] }` |
| `get-drift-context` (agent only) | `pageId` (string) | `{ page: { title, sections: [...] }, events: [{ diffHunks or changelog }] }`, capped at about 15 KB |
| `record-verification` (agent only, `actionVerb: UPDATE`) | `pageId`, `note` | `{ ok, verifiedAt }` |

`guidance` text example: "Do not present steps from this page as current. Cite with caveat: changed by PR #482 on 2026-12-02."

### 10. Change detection and scoring

Hybrid algorithm: deterministic first, LLM only on demand.

```
on ChangeRecord(cr):                       // from relay or Jira trigger
  files = cr.files.filter(f => !ignored(f.path))
  if files.empty and cr.source == 'bitbucket': return
  if isRevert(cr):                          // "Revert \"...\"" message or revert of known PR
     closeEventsFor(cr.revertedPrId, reason='reverted'); return
  candidates = anchors.byRepo(cr.repo)      // index lookup
  for a in candidates:
    s = 0
    for f in files:
      m = pathMatch(a, f)                   // exact=1.0, glob=0.6, repo-wide=0.2
      if m == 0: continue
      mag = f.status in [removed, renamed] ? 1.0 : min(1, log10(1 + f.added + f.removed) / 2)
      s = max(s, a.weight * m * (0.5 + 0.5 * mag))
      if f.status == renamed: proposeAnchorRename(a, f.oldPath, f.newPath)
    s += 0.3 if pageMentionsChangedIdentifiers(a.page, cr.removedIdentifiers)
    s += 0.4 if pageCodeBlockHashMatchesRemovedLines(a.page, cr.hunks)
    s = min(1, s)
    if s >= threshold (0.5 balanced): upsertDriftEvent(a.page, cr, s)
  enqueue(recompute pages touched, delayInSeconds=600)   // debounce bursts of PRs

Jira rule: anchored issue changelog has status category→Done/Won't Do (0.7), fixVersions/components (0.6),
           description (0.5), parent change (0.6); summary-only (0.3, needs another signal)
Severity: High if s>=0.8 or anchored file removed/renamed or anchor weight=critical; else Medium.
State: Verified → Possibly stale on first event ≥ threshold;
       Possibly stale → Stale after 7 days unresolved or 3+ events or High severity on a critical anchor.
```

Design choices, ranked:
1. **Path and glob anchors (Must).** Cheap, explainable, high recall. False positives come from broad globs, so default new anchors to file-level and flag globs covering more than 50 files.
2. **Identifier overlap (Must).** Extract removed or renamed identifiers from `-` lines (function names, env vars, CLI flags, config keys: regex `[A-Za-z_][A-Za-z0-9_.-]{3,}`), match against page text. This catches "the page says `ROLLBACK_TIMEOUT` and the PR renamed it". Swimm's smart tokens do the same thing at authoring time.\[56\]
3. **Snippet hash (Should).** Hash normalized lines of each page code block (trim, collapse whitespace). If any removed diff line hash appears in a page code block, add 0.4. Very high precision.
4. **LLM judgment (Could/on demand).** Only in the review flow, through the Rovo agent (customer credits, user-initiated) or optional Forge LLM gray-zone triage for 0.3 to 0.5 scores (developer-paid). Never in the hot path.

Edge cases: renames update anchors automatically after owner confirmation (the Swimm Auto-sync idea); deletes are High; monorepos rely on path anchors (repo-level anchors weigh 0.2 and never alert alone); large diffs (more than 300 files) are treated as diffstat-only with no hunks fetched; merges to non-default branches are ignored (setting).

**Evaluation plan:** 30 seeded scenarios on 24 pages. 20 true drift (rename script, change env var, change helm value, delete endpoint, epic marked Won't Do, component moved) and 10 non-drift (test-only change, lockfile bump, comment typo, formatting, unrelated directory, revert pair). Targets on the seeded set: recall ≥ 0.9, precision ≥ 0.8, zero alerts on lockfile and test-only cases. Store as JSON fixtures and run the matcher in Vitest, and show the confusion matrix in the Devpost write-up.

### 11. Trust, safety, privacy

- No silent edits. Every page write is `asUser()`, triggered by a click, with a version message naming the PR.
- Permission-aware reads. Agent and MCP outputs use `asUser()`. Pages the caller cannot read return `status: "unknown"` and no title.
- Data sent to LLMs: only when a user clicks Propose fix, with the affected sections plus up to 200 diff lines. No full repo contents. Say this in the privacy policy.
- Storage: anchors, scores, PR metadata and file paths. No page bodies stored. Diff hunks kept up to 30 days for the review panel, then purged.
- Audit trail: Verification rows record who, when, which drift events were closed, and why.
- Prompt injection: SKILL.md and agent prompt state that page and diff content are untrusted evidence, never instructions.

### 12. Data model

Prefer Forge SQL for the dashboard's grouped queries if the week-1 spike confirms it works in your environment. Otherwise use custom entities with indexes.

| Table / entity | Key fields | Indexes |
|---|---|---|
| `binding` | id, pageId, spaceKey, anchorType (path\|glob\|jira\|page), repo, pattern, jiraKey, weight, createdBy, createdAt | (repo), (jiraKey), (pageId) |
| `page_state` | pageId, spaceKey, ownerId, status, verifiedAt, verifiedBy, openEventCount, maxSeverity, readershipWeight | (spaceKey, status), (ownerId, status) |
| `drift_event` | id, pageId, source, ref (repo#PR or issueKey), summary, files JSON, score, severity, status (open\|dismissed\|resolved\|reverted), dedupeKey, createdAt | (pageId, status), (dedupeKey) |
| `change_record` | id, source, repo, prId, mergeCommit, files JSON, hunksRef, receivedAt | (repo, prId) |
| `verification` | id, pageId, userId, at, closedEventIds, note, method (manual\|accepted_proposal) | (pageId) |
| `settings` (KVS) | threshold, ignoreGlobs, enabledSpaces, escalationDays, relaySecretHash | n/a |

## Implementation Plan

**Team assumption:** 2 engineers full time (E1 backend/Forge, E2 frontend/Rovo) plus the user on product, design, demo and part-time code. A third engineer takes the eval harness and Marketplace work.

### 13. Repo structure

```
doc-drift/
  apps/core/            manifest.yml, src/{triggers,consumers,resolvers,actions,lib}, static/{byline,dashboard,settings}
  apps/bitbucket-relay/ manifest.yml, src/{onMerged.ts, settings.tsx}
  packages/matcher/     pure TS: globs, scoring, identifiers, hashing (no Forge deps)
  packages/shared/      types, ChangeRecord schema, HMAC
  fixtures/scenarios/   30 JSON scenarios + expected outcomes
  skills/check-page-freshness/SKILL.md
  demo/seed/            scripts to create 24 pages, repo commits, PR branches
```

### 14. Manifest skeletons (verify scope names with `forge lint`)

```yaml
# apps/core/manifest.yml
app:
  id: ari:cloud:ecosystem::app/<core-id>
  runtime: { name: nodejs24.x }
  compatibility:
    confluence: { required: true }
    jira: { required: false }
permissions:
  scopes:
    - read:page:confluence
    - write:page:confluence        # Should: apply accepted proposal asUser
    - read:space:confluence
    - read:comment:confluence
    - write:comment:confluence
    - read:confluence-props
    - write:confluence-props
    - read:jira-work
    - read:graph:page:confluence   # Should: TWG suggest anchors
    - read:graph:issue:jira
    - storage:app
modules:
  confluence:contentBylineItem:
    - key: dds-byline
      title: Doc Drift
      resource: byline
      render: native
      resolver: { function: ui-resolver }
      contentPropertyKey: dds-byline-7f3c2a
      viewportContainer: modal
      viewportSize: large
  confluence:spacePage:
    - key: dds-dashboard
      title: Drift dashboard
      resource: dashboard
      render: native
      resolver: { function: ui-resolver }
  confluence:contextMenu:
    - key: dds-anchor-selection
      title: Anchor to code
      resource: byline
      render: native
      resolver: { function: ui-resolver }
  confluence:globalSettings:
    - key: dds-settings
      title: Doc Drift settings
      resource: settings
      render: native
      resolver: { function: ui-resolver }
  webtrigger:
    - key: ingest-change
      function: ingest
  trigger:
    - key: jira-updated
      function: on-jira-updated
      events: [avi:jira:updated:issue]
      filter:
        expression: event.changelog != null && event.changelog.items.length > 0
  scheduledTrigger:
    - key: escalate
      function: escalate
      interval: hour
  consumer:
    - key: match-consumer
      queue: match-queue
      function: matcher
    - key: notify-consumer
      queue: notify-queue
      function: notifier
  rovo:agent:
    - key: drift-reviewer
      name: Drift Reviewer
      description: Reviews Confluence pages flagged by Doc Drift and proposes edits for human approval.
      prompt: resource:agent-prompt;prompt.md
      actions: [check-page-freshness, get-drift-context, record-verification]
      skills: [check-page-freshness-skill]
  rovo:skill:
    - key: check-page-freshness-skill
      # name/description/path per rovo:skill reference (Preview)
  rovo:mcp:
    - key: doc-drift-mcp
      name: Doc Drift
      tools: [check-page-freshness, find-docs-for-path, list-stale-pages]
  action:
    - key: check-page-freshness
      name: Check page freshness
      function: act-check
      actionVerb: GET
      description: Returns whether a Confluence page is verified or has drifted because its code or Jira anchors changed. Call before citing a page.
      inputs:
        pageId: { title: Page ID, type: string, required: false, description: Confluence page ID }
        pageUrl: { title: Page URL, type: string, required: false, description: Full page URL }
        title: { title: Page title, type: string, required: false, description: Exact or partial title }
    - key: find-docs-for-path
      name: Find docs for code path
      function: act-find
      actionVerb: GET
      description: Lists Confluence pages anchored to a repository file or directory.
      inputs:
        repo: { title: Repository slug, type: string, required: true, description: Bitbucket repo slug }
        path: { title: File path, type: string, required: true, description: Path in repo }
    # list-stale-pages, get-drift-context, record-verification similar
  function:
    - { key: ui-resolver, handler: resolvers.handler }
    - { key: ingest, handler: ingest.handler }
    - { key: on-jira-updated, handler: jira.handler }
    - { key: matcher, handler: matcher.handler, timeoutSeconds: 120 }
    - { key: notifier, handler: notifier.handler }
    - { key: escalate, handler: escalate.handler }
    - { key: act-check, handler: actions.check }
    - { key: act-find, handler: actions.find }
resources:
  - { key: byline, path: src/frontend/byline.tsx }
  - { key: dashboard, path: src/frontend/dashboard.tsx }
  - { key: settings, path: src/frontend/settings.tsx }
  - { key: agent-prompt, path: prompts }
```

```yaml
# apps/bitbucket-relay/manifest.yml
app:
  id: ari:cloud:ecosystem::app/<relay-id>
  runtime: { name: nodejs24.x }
permissions:
  scopes: [read:pullrequest:bitbucket, read:repository:bitbucket, storage:app]
  external:
    fetch:
      backend: ['*.atlassian-dev.net']   # verify web trigger host pattern in week 1
modules:
  trigger:
    - key: on-merged
      function: on-merged
      events: [avi:bitbucket:fulfilled:pullrequest]
  # workspace settings page module for URL + secret (verify module key: bitbucket:workspaceSettingsMenuPage)
  function:
    - { key: on-merged, handler: onMerged.handler }
```

UI choice: UI Kit (`render: native`) for byline, settings and dashboard. It is faster to build, uses Atlassian Design System components and tokens automatically, and looks native (Design score). Switch the review panel to Custom UI only if you need a rich diff viewer.

### 15. Code sketches (TypeScript)

**Relay: merged PR handler**
```ts
import api, { route, storage } from '@forge/api';
import { createHmac } from 'crypto';

export async function handler(event: any) {
  const ws = event.workspace?.uuid, repo = event.repository.uuid, pr = event.pullrequest.id;
  const files: any[] = [];
  let url = route`/2.0/repositories/${ws}/${repo}/pullrequests/${pr}/diffstat?pagelen=100`;
  for (let page = 0; page < 5 && url; page++) {            // cap 500 files
    const r = await api.asApp().requestBitbucket(url);
    const j = await r.json();
    for (const v of j.values) files.push({
      status: v.status, path: v.new?.path ?? v.old?.path, oldPath: v.old?.path,
      added: v.lines_added, removed: v.lines_removed });
    url = j.next ? routeFromAbsolute(j.next) : null;
  }
  let hunks = '';
  if (files.length <= 300) {
    const d = await api.asApp().requestBitbucket(route`/2.0/repositories/${ws}/${repo}/pullrequests/${pr}/diff`);
    hunks = (await d.text()).slice(0, 150_000);              // keep under 200 KB push limit downstream
  }
  const body = JSON.stringify({ source: 'bitbucket', repo: event.repository.name ?? repo, prId: pr,
    title: event.pullrequest.title, mergeCommit: event.pullrequest.mergeCommit?.hash, files, hunks });
  const { url: target, secret } = await storage.getSecret('core-link');
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  await api.fetch(target, { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-dds-sig': sig } });
}
```

**Matcher core (pure, unit-tested)**
```ts
import picomatch from 'picomatch';
export function scoreAnchor(a: Anchor, cr: ChangeRecord, page: PageIndex, cfg: Cfg): number {
  let s = 0;
  for (const f of cr.files) {
    if (cfg.ignore.some(g => picomatch.isMatch(f.path, g))) continue;
    const m = a.type === 'path' ? (f.path === a.pattern || f.oldPath === a.pattern ? 1 : 0)
            : a.type === 'glob' ? (picomatch.isMatch(f.path, a.pattern) ? 0.6 : 0)
            : a.type === 'repo' ? 0.2 : 0;
    if (!m) continue;
    const mag = f.status === 'removed' || f.status === 'renamed' ? 1
              : Math.min(1, Math.log10(1 + f.added + f.removed) / 2);
    s = Math.max(s, a.weight * m * (0.5 + 0.5 * mag));
  }
  if (s > 0 && intersects(page.identifiers, removedIdentifiers(cr.hunks))) s += 0.3;
  if (s > 0 && intersects(page.codeLineHashes, removedLineHashes(cr.hunks))) s += 0.4;
  return Math.min(1, s);
}
```

**Rovo/MCP action**
```ts
import api, { route } from '@forge/api';
export async function check(payload: { pageId?: string; pageUrl?: string; title?: string }) {
  const pageId = payload.pageId ?? idFromUrl(payload.pageUrl) ?? await findByTitleAsUser(payload.title);
  if (!pageId) return JSON.stringify({ status: 'unknown', guidance: 'Page not found or not visible to you.' });
  const r = await api.asUser().requestConfluence(route`/wiki/api/v2/pages/${pageId}`);
  if (r.status !== 200) return JSON.stringify({ status: 'unknown' }); // respects restrictions
  const st = await getPageState(pageId);
  return JSON.stringify({
    pageId, title: (await r.json()).title, status: st.status, verifiedAt: st.verifiedAt,
    openDrift: (await openEvents(pageId)).map(e => ({ source: e.source, ref: e.ref, summary: e.summary, score: e.score, at: e.createdAt })),
    guidance: st.status === 'verified' ? 'Safe to cite.' : `Do not present as current. Cite with caveat: ${st.lastSummary}.`,
  });
}
```

### 16. Week-by-week plan (Nov 10 to Dec 22)

| Week | Dates | Goals | Definition of done |
|---|---|---|---|
| 1 | Nov 10 to 16 | Spikes on all open questions (section 18). Dev site + Bitbucket team workspace. Repo scaffold. Matcher package with 10 fixtures. | Relay fires on a real merge and posts to the core web trigger. Byline renders from a content property. A `rovo:mcp` hello-world tool is called from Claude Code. Go/no-go on each risky module written down. |
| 2 | Nov 17 to 23 | Data model. Binding modal with auto-suggest from body. Ingest to matcher to drift_event pipeline. Badge state writes. Seed script for 24 pages. | Merging the seeded PR flips the right 3 pages to Possibly stale within 15 minutes. No other pages change. |
| 3 | Nov 24 to 30 | Jira trigger and rules. Review panel v1 (Verify/Dismiss/Snooze). Notifier footer comments. Dashboard v1. Escalation trigger. Revert and rename handling. | All 30 fixtures pass at the target precision/recall. Dashboard shows real counts. |
| 4 | Dec 1 to 7 | Drift Reviewer agent, actions, skill, MCP tools. Propose fix flow. Apply-as-version (Should). Marketplace listing assets drafted (privacy, support, screenshots). | Rovo chat demo works end to end. Claude Code demo works. Credit use per review measured (target: one agent run per fix, no LLM in detection). |
| 5 | Dec 8 to 14 | Admin settings. TWG suggest anchors (Should). UI polish with design tokens. Demo mode replay. **Submit Marketplace listing by Dec 11.** Register judge-copy app ID. | Listing review ticket link saved. Judge install tested on a fresh site by someone outside the team. |
| 6 | Dec 15 to 22 | Bug bash. Feature freeze Dec 18. Video recorded Dec 18 to 19. Devpost text Dec 20. **Submit Dec 21.** Dec 22 buffer only. | Devpost submitted with both install links, video under 5 minutes, setup guide, Marketplace ticket link. |

**Scope-cut order (cut from the top when behind):** page banner, Forge LLM triage, readership weighting, TWG suggest anchors, apply-as-version (keep the comment), Jira rules beyond status/fixVersion, `rovo:skill` (keep the action plus MCP), dashboard owner backlog. Never cut: relay+matcher, byline, review panel, agent, MCP, demo mode.

### 17. Risk register

| Risk | Likelihood | Mitigation / fallback |
|---|---|---|
| Relay to core web trigger egress or HMAC issue | Medium | Fallback: core polls Bitbucket REST with workspace access token (loses Runs on Atlassian). Demo mode replay keeps judging working regardless. |
| Judges lack a Bitbucket team workspace | High | Setup guide marks Bitbucket optional. Demo mode replays seeded change records. Video shows the live path. |
| External MCP blocked (admin toggle, OAuth, client quirks) | Medium | Same tools available to Rovo Studio custom agents. Video shows both. Document the admin toggle path: Apps > Sites > site > Connected apps.\[7\] |
| Teamwork Graph persisted query registration fails | Medium | Feature is Should. Fall back to body parsing. Never block on it. |
| Multi-app paid listing requirement slows the Marketplace submission | Medium | Start listing Dec 1. If paid listing setup blocks, submit the listing for the core app and document the ticket. The rule accepts "submitted for listing".\[10\] |
| Listed app cannot be installed via share link | Medium | Separate judge-copy app ID, deployed to production, shared through the developer console. |
| Byline content property shape differs from assumption | Low | Fallback to `dynamicProperties` function (one invocation per view). |
| False positives annoy owners | Medium | Default file-level anchors, ignore globs, 24h notification cap, Dismiss reasons feed a per-anchor dampener (−0.1 per dismissal, floor 0.3). |

### 18. Open questions to resolve in week 1 (each under one day)

1. **Relay to core link works.** Deploy both apps, call the web trigger URL from the relay with egress declared, confirm 202 and HMAC verify. 2 hours.
2. **Byline from content property.** Write `{title, icon, tooltip}` to the property, reload page, confirm render without function logs. 2 hours.
3. **External MCP.** Deploy `rovo:mcp` with one tool, enable in Connected apps, add `https://mcp.atlassian.com/forge/<appId>` to Claude Code, complete OAuth, call the tool. 3 hours.
4. **Agent + skill.** Deploy `rovo:agent` with one action and one `rovo:skill`, invoke in Rovo chat, confirm skill instructions apply. 3 hours.
5. **Jira trigger filter.** Change an anchored issue's status and fixVersion, confirm `changelog.items` content and that summary-only edits are filtered. 1 hour.
6. **Diffstat shape.** Log the diffstat for a PR with a rename, a delete and 120+ files. Confirm `status`, `old.path`, `new.path`, pagination. 1 hour.
7. **Forge SQL vs custom entities.** Create the `page_state` table, run a grouped dashboard query. Pick one by end of day.
8. **Teamwork Graph.** Register one persisted query (page links to external PR) from an admin browser session, run it `asUser`. Timebox 3 hours, then defer.
9. **Marketplace path.** Open the partner/vendor profile, confirm the paid-listing requirement for multi-app, list required assets. 2 hours.
10. **Scheduled trigger interval and web trigger host pattern.** Confirm allowed `interval` values and the egress host to declare. 1 hour.

### 19. Demo environment

- Dev site (go.atlassian.com/cloud-dev) with Confluence + Jira, space "PLAT" with 24 pages: 8 runbooks (rollback, rotate secrets, scale workers, failover DB), 6 service overviews, 4 onboarding guides, 4 ADRs, 2 API guides.\[55\] Each page has realistic code blocks referencing repo paths and env vars.
- Bitbucket team workspace "acme-eng", repos `payments-api` (helm, scripts, src) and `platform-tools`. 10 pre-built branches for scripted merges, one per scenario. Seed script uses the Bitbucket REST API to open and merge them on cue.
- Jira project PAY with epics linked from pages.
- A "wrong answer" fixture: rollback runbook says `./scripts/rollback.sh --timeout ROLLBACK_TIMEOUT`, PR #482 renames to `rollback-v2.sh` and env var `ROLLBACK_TIMEOUT_SECS`.

### 20. Marketplace submission checklist

| Date | Item |
|---|---|
| Nov 14 | Partner profile created. Decide pricing (paid listing required for multi-app; consider a free tier for small teams if allowed, verify). |
| Dec 1 | Privacy policy and support page (GitHub Pages), EULA, data-handling statement (no page bodies stored, LLM only on click). |
| Dec 5 | Listing copy, 5 screenshots (badge, review panel, dashboard, Rovo chat, Claude Code), icon, highlights. |
| Dec 8 | Security self-assessment answers, data residency notes, scopes justification. Production deploy of core app. |
| Dec 11 | Submit listing, save review ticket link. Bitbucket relay: informational listing (optional). |
| Dec 12 | Judge-copy app registered, deployed, share link tested on a clean site. |

### 21. Demo video script (4:40)

| Time | Shot | Voiceover |
|---|---|---|
| 0:00 to 0:25 | Incident Slack mock, on-call opens Confluence runbook | "At 3am, the runbook says run rollback.sh. That script was renamed two weeks ago." |
| 0:25 to 0:50 | Rovo chat confidently quoting the old step | "Rovo and coding agents read the same page. Age-based staleness tools say it's fresh: it was edited last month." |
| 0:50 to 1:20 | Binding modal, auto-suggested anchors, save, green Verified badge | "Doc Drift anchors pages to the code and Jira work they describe." |
| 1:20 to 2:00 | Merge PR #482 in Bitbucket, cut to page: badge turns Possibly stale, tooltip shows PR | "Merge happens. Within minutes the page is flagged, with the exact change." |
| 2:00 to 2:45 | Review panel, highlighted step, Propose fix, Drift Reviewer draft, Accept, badge green | "A Rovo agent drafts the edit. A human accepts it. Nothing changes silently." |
| 2:45 to 3:25 | Rovo chat asks again: answer now caveated or correct. Then Claude Code calls `check-page-freshness` and `find-docs-for-path` | "Any agent can check freshness before citing, inside Rovo or from Claude Code over MCP." |
| 3:25 to 3:55 | Jira epic marked Won't Do flips an ADR page. Space dashboard drift debt | "Jira scope changes count too. Leads see drift debt per space." |
| 3:55 to 4:25 | Architecture slide: two apps, zero-LLM detection, credits only on fix, eval matrix | "Detection is deterministic: 30 seeded scenarios, measured precision and recall." |
| 4:25 to 4:40 | Vision | "Docs that agents can trust, because they know when to stop trusting them." |

### 22. Devpost text outline mapped to criteria

- **Technological Implementation:** two-app architecture with HMAC-verified relay, async debounce, content-property byline (no per-view compute), `asUser` permission-aware agent tools, eval harness results.
- **Design:** UI Kit with design tokens, four-state badge, one-click review, no silent edits.
- **Potential Impact:** stale runbooks as incident contributors, Rovo not preferring newer pages, credit-light design for Dec 3 metering.
- **Innovation:** change-triggered staleness instead of age, freshness as a tool other agents call, pre-change "docs for this path" lookup for coding agents.
- **Presentation:** wrong-answer demo, before/after, under 5 minutes.
- **Bonus mapping:** Best Agents (agent + skill + actions), Best app with Atlassian MCP (`rovo:mcp` used from Claude Code), Best Teamwork Graph (anchor suggestion, if shipped), Best Marketplace published app (review ticket link). Lead with MCP/agents, since only one bonus can be won.

**Pitch narrative:** problem (docs rot when systems change, not when calendars turn), wrong-answer demo, the fix (anchors, drift, human-approved edits), agent integration (freshness as a shared tool), vision (a freshness signal every agent in the Atlassian ecosystem checks before citing).

## Recommendations

1. Commit to the two-app architecture today and build demo mode in week 2. Do not let Bitbucket setup become a judging dependency.
2. Keep detection deterministic. Use AI only for proposed fixes. This is both your cost story and your trust story.
3. Make MCP plus agents the headline bonus. Submit the Marketplace listing on Dec 11 with a separate judge-copy app, and publish precision/recall from the seeded set.

## Caveats

- Some details are inferred and unverified: exact Confluence v2 endpoint paths and granular scope names, the byline content property value shape, the diffstat field names, Forge SQL availability in your account, scheduled trigger intervals, and the relay's egress host pattern. Each has a week-1 check.
- `rovo:mcp`, `rovo:skill`, Teamwork Graph API, multi-app compatibility and page banner are all Preview. They are supported but can change on shorter deprecation windows.
- The 12% stale-runbook incident figure comes from ITOC360, a vendor, not independent research. The claim that listed apps cannot be shared via install link comes from an unofficial GitHub note. Atlassian's Forge LLMs pricing doc confirms that Forge LLM usage is billed to developers. Recheck's exact features were not reviewed beyond its name and tagline.

## Start-today checklist

1. Create dev site and Bitbucket team workspace. Register both app IDs.
2. Run spikes 1, 2 and 3 from section 18 (relay link, byline property, external MCP).
3. Scaffold the monorepo and write the first 10 matcher fixtures.
4. Draft the 24 demo pages and the PR #482 scenario.
5. Create the Marketplace partner profile and draft the privacy policy.

## Sources

1. [App compatibility - Forge](https://developer.atlassian.com/platform/forge/app-compatibility/)
2. [Codegeist 2026: two installation links, and which Bitbucket plan do judges test on?](https://community.developer.atlassian.com/t/codegeist-2026-two-installation-links-and-which-bitbucket-plan-do-judges-test-on/103715)
3. [Confluence page banner](https://developer.atlassian.com/platform/forge/manifest-reference/modules/confluence-page-banner/)
4. [Feedback on Height Restriction in Confluence Page Banner Module (48px Limit) - Forge Modules and Product Triggers - The Atlassian Developer Community](https://community.developer.atlassian.com/t/feedback-on-height-restriction-in-confluence-page-banner-module-48px-limit/93479)
5. [Feedback on the new page banner module - Forge UI Kit and Custom UI - The Atlassian Developer Community](https://community.developer.atlassian.com/t/feedback-on-the-new-page-banner-module/92605)
6. [Confluence content byline item](https://developer.atlassian.com/platform/forge/manifest-reference/modules/confluence-content-byline-item/)
7. [Rovo MCP](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-mcp/)
8. [Forge changelog](https://developer.atlassian.com/platform/forge/changelog/)
9. [Atlassian Teamwork Graph API: Forge Rovo Agent - DEV Community](https://dev.to/mihai_leanzero/atlassian-teamwork-graph-api-forge-rovo-agent-3mcc)
10. [Codegeist 2026: Build with context. Ship with confidence.](https://codegeist2026.devpost.com/rules)
11. [Dec 23, 01:30 IST · Codegeist 2026 (Atlassian Forge) — discussion first · Issue #86 · JannetEkka/DSProjects · GitHub](https://github.com/JannetEkka/DSProjects/issues/86)
12. [Migrating a Forge app to support multiple Atlassian apps](https://developer.atlassian.com/platform/forge/migrating-a-forge-app-to-support-multiple-atlassian-apps/)
13. [List a Forge app on the Atlassian Marketplace](https://developer.atlassian.com/platform/marketplace/listing-forge-apps/)
14. [Verified Pages feature ensure content integrity in Confluence](https://apps4agile.com/curated-product-news/verified-pages-feature-ensure-content-integrity-in-confluence/)
15. [Confluence Page Approval Workflow, Step by Step - DEV Community](https://dev.to/mihai_leanzero/confluence-page-approval-workflow-step-by-step-3p6)
16. [Getting Started for Page Review Manager for Confluence · GitHub](https://gist.github.com/shimuzhi/ecdd962e439267073f7738f5bfa45d9c)
17. [Stale Content Auditor for Confluence](https://marketplace.atlassian.com/apps/1040161133/stale-content-auditor-for-confluence)
18. [Content Review & Content Audit for Confluence by Clearlane](https://marketplace.atlassian.com/apps/3829462350/content-review-content-audit-for-confluence-by-clearlane)
19. [GitHub - ZNLong2203/Accord-codegeist-2026: Evidence-backed decision drift for Jira releases and Confluence decisions. Built on Forge for Codegeist 2026. · GitHub](https://github.com/ZNLong2203/Accord-codegeist-2026)
20. [GitHub - qybaihe/precedent: Decision memory for Jira, Confluence, Rovo and AI coding agents (MCP). Codegeist 2026 Forge app. · GitHub](https://github.com/qybaihe/precedent)
21. [GitHub - zouhirmahjoubi/precedent: Remembers what your team decided and why, and flags new Jira work that goes against it. Forge app for Codegeist 2026. · GitHub](https://github.com/zouhirmahjoubi/precedent)
22. [Do you archive/delete old Confluence pages or keep everything for Rovo to have it "in context"?](https://community.atlassian.com/forums/Atlassian-AI-Rovo-discussions/Do-you-archive-delete-old-Confluence-pages-or-keep-everything/td-p/3256709)
23. [Bitbucket events - Forge](https://developer.atlassian.com/platform/forge/events-reference/bitbucket/)
24. [Solved: "avi:bitbucket:pushed:repository" event not workin...](https://community.atlassian.com/forums/Forge-for-Bitbucket-Cloud/quot-avi-bitbucket-pushed-repository-quot-event-not-working/td-p/2660892)
25. [Bitbucket Cascade Merge issue for Forge - Forge Platform and Tools - The Atlassian Developer Community](https://community.developer.atlassian.com/t/bitbucket-cascade-merge-issue-for-forge/78039)
26. [Bitbucket authentication](https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestbitbucket/)
27. [The Bitbucket Cloud REST API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/)
28. [How do I get list of changed files from one commit to another commit in bitbucket api](https://community.atlassian.com/forums/Bitbucket-questions/How-do-I-get-list-of-changed-files-from-one-commit-to-another/qaq-p/2583534)
29. [Bitbucket git operations from a remote - Forge](https://developer.atlassian.com/platform/forge/remote/bitbucket-git-operations/)
30. [Assign PRs randomly to a specific list of users in Bitbucket Cloud - DEV Community](https://dev.to/atlassian/assign-prs-randomly-to-a-specific-list-of-users-in-bitbucket-cloud-2l5m)
31. [Build a Bitbucket hello world app](https://developer.atlassian.com/platform/forge/build-a-hello-world-app-in-bitbucket/)
32. [External pull request - Teamwork Graph](https://developer.atlassian.com/platform/teamwork-graph/api-reference/object-types/ExternalPullRequest/)
33. [Confluence database - Teamwork Graph](https://developer.atlassian.com/platform/teamwork-graph/api-reference/object-types/ConfluenceDatabase/)
34. [Jira events](https://developer.atlassian.com/platform/forge/events-reference/jira/)
35. [Forge Trigger avi:jira:updated:issue stopped firing since April 20th despite matching filter conditions - Forge Modules and Product Triggers - The Atlassian Developer Community](https://community.developer.atlassian.com/t/forge-trigger-aviupdated-issue-stopped-firing-since-april-20th-despite-matching-filter-conditions/100460)
36. [Trigger](https://developer.atlassian.com/platform/forge/manifest-reference/modules/trigger/)
37. [Rovo modules](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-index/)
38. [Action](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-action/)
39. [RFC-134: Forge Rovo Tools and MCP - Request for Comments (RFC) - The Atlassian Developer Community](https://community.developer.atlassian.com/t/rfc-134-forge-rovo-tools-and-mcp/100683)
40. [Rovo Skill](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-skill/)
41. [Atlassian MCP Server and Forge rovo:mcp Explained](https://www.oneteem.com/blog/forge-topics-25/atlassian-mcp-server-forge-rovo-mcp-46)
42. [RFC-134: Forge Rovo Tools and MCP - Page 2 - Request for Comments (RFC) - The Atlassian Developer Community](https://community.developer.atlassian.com/t/rfc-134-forge-rovo-tools-and-mcp/100683?page=2)
43. [Rovo review: How Atlassian’s AI works and what it can (and can’t) do](https://www.eesel.ai/blog/rovo)
44. [Rovo credits: what uses them and how to cap the bill before 3 December](https://viter.io/blog/rovo-credits)
45. [How Rovo credits work](https://support.atlassian.com/rovo/docs/rovo-usage-limits/)
46. [Forge access to customer Platform usage meters (Rovo credits / Automation steps) and extra-usage controls? - Forge - The Atlassian Developer Community](https://community.developer.atlassian.com/t/forge-access-to-customer-platform-usage-meters-rovo-credits-automation-steps-and-extra-usage-controls/102558)
47. [GitHub - DesignMaster-Solutions/handoff-brief: Forge app: Teamwork Graph handoff brief for business teams (Codegeist 2026) · GitHub](https://github.com/DesignMaster-Solutions/handoff-brief)
48. [Relationship types - Teamwork Graph](https://developer.atlassian.com/platform/teamwork-graph/api-reference/relationship-types/overview/)
49. [Teamwork Graph connector](https://developer.atlassian.com/platform/forge/manifest-reference/modules/teamwork-graph-connector/)
50. [Bring any data into Atlassian system of work - Inside Atlassian](https://www.atlassian.com/blog/development/building-teamwork-graph-connectors-forge)
51. [Async Events API - Forge](https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/)
52. [Invocation limits - Forge](https://developer.atlassian.com/platform/forge/limits-invocation/)
53. [Use a long-running function](https://developer.atlassian.com/platform/forge/use-a-long-running-function/)
54. [Async events limits](https://developer.atlassian.com/platform/forge/limits-async-events/)
55. [Build a Confluence hello world app](https://developer.atlassian.com/platform/forge/build-a-hello-world-app-in-confluence/)
56. [Swimm Alternative: How Swimm Documentation Works (2026)](https://repowise.dev/compare/swimm-alternative)
