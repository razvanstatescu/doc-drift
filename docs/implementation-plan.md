# Implementation plan

Owner: Razvan + Claude Code (agent teams, D22). Written 2026-11-11. This turns [hackathon/timeline.md](hackathon/timeline.md) into milestones, tracks and agent assignments. Update the status columns as work lands.

## Principles for the build

- **De-risk first.** Each Preview or undocumented integration gets a throwaway spike app under `spikes/` before it goes into the real app. A spike ends with a `RESULT.md` (go / no-go / workaround), which is then folded into [risks-and-spikes.md](hackathon/risks-and-spikes.md) and, if it changes the design, [decisions.md](decisions.md).
- **Pure core, thin Forge shell.** Scoring, glob matching, identifier extraction, hashing, state transitions and the HMAC format live in `packages/` with no Forge imports, tested with Vitest. Forge handlers only fetch, call the core and persist.
- **One owner per directory.** Parallel agents never edit the same files. Shared docs (risks-and-spikes, decisions) are updated by the orchestrator, from the spike results.
- **Demo mode from the first pipeline.** As soon as ingest works, the replay of the seeded change record works too.
- **Docs move with the code** (CLAUDE.md working conventions).

## Repo layout

```
package.json, pnpm-workspace.yaml, tsconfig.base.json   root (pnpm workspace: packages/*)
packages/shared/      ChangeRecord types + JSON schema, HMAC sign/verify, page-state enums
packages/matcher/     globs, scoring, identifiers, snippet hashing, Jira rules, state machine; Vitest
fixtures/scenarios/   JSON scenarios + expected outcomes (eval harness input)
apps/core/            Forge app: Confluence required, Jira optional (from M1)
apps/bitbucket-relay/ Forge app: Bitbucket (from M1)
spikes/               throwaway Forge apps, one per spike, each with RESULT.md (not in the pnpm workspace)
demo/seed/            Bitbucket seed (bb_seed.py) and, later, the Confluence/Jira seed
skills/check-page-freshness/SKILL.md
```

The Forge apps bundle their own dependencies. They import `packages/*` through workspace links if `forge deploy` bundles them cleanly (to check in M1); otherwise via a prebuild copy step.

## Milestones

| M | Dates | Scope | Exit criteria | Status |
| --- | --- | --- | --- | --- |
| **M0** | Nov 11 to 16 | Root scaffold. `packages/shared` + `packages/matcher` v0 with 10 fixtures. Spikes S1 (relay to web trigger), S2 (byline content property), S3 (external MCP), S4 (agent + skill), S7 (Forge SQL), S11 (Rovo on the demo site), S12 (`forge eligibility`). S5 (Jira filter) if time allows. | Matcher tests green. A go/no-go for every spike. | **Done** 2026-11-11 (S1, S3, S4, S6, S7, S11, S12 GO; S2 GO except icon; D20 test pending) |
| **M1** | Nov 17 to 23 | `apps/core` skeleton: manifest, SQL schema + migrations, static ingest web trigger, `match-queue` consumer, byline writes, binding modal (UI Kit) with auto-suggest, settings page with the ingest URL/secret and the demo replay. `apps/bitbucket-relay` v1 with its workspace settings page. Confluence seed script for 24 PLAT pages. | Merging scenario 01 flips the right pages to Possibly stale within 15 min, and no others. Demo replay does the same. | **Done** 2026-11-11. Live E2E: merging PR #4 flagged the PLAT Payments rollback runbook (score 1.00, High) **11 s** after the merge; only the expected pages changed. Core 12e968a1 + relay 409a6e1e in development; eval P 1.00 / R 0.94; demo site seeded and 18 PLAT pages bound. Carry-overs to M2: D27 state rule, modal header shows the wrong state ("Doc Drift: Unanchored"), duplicate heading in the modal, debounce, live byline refresh, apply rename proposals. |
| **M2** | Nov 24 to 30 | Jira trigger + rules, review panel (Verify/Dismiss/Snooze), notifier footer comments, space dashboard, escalation trigger, revert and rename handling. 30 fixtures + eval report. | Recall ≥ 0.9, precision ≥ 0.8, zero lockfile/test-only alerts. Dashboard shows real counts. | **Done** 2026-11-11 (core v4.6.0). Live and browser-checked (Claude driving Chrome over CDP): review panel, Anchors tab, Mark verified (badge back to Verified), Drift dashboard, and D27 live (PR #5 to "Scale payment workers" Possibly stale, High, 9 s). Verified headless: Jira beat (~20 s), reverts, page-trash cleanup, notifier, escalation. 238 tests, eval P 1.00 / R 0.94. Polish backlog below. |
| **M3** | Dec 1 to 7 | Actions, Drift Reviewer agent, skill, `rovo:mcp`, Propose fix flow, apply-as-version. Dec 1: F12/F16 decision (major-version trap). | The Rovo chat demo and the Claude Code demo work end to end. | **Done** 2026-11-11 (core v4.10.0). Browser-verified end to end:
  - Propose fix opens Drift Reviewer in Rovo, which drafts one proposal per block (D29); Rovo confirms the CREATE.
  - The review panel shows the drafts as diffs; "Accept all for this section" writes a new page version naming the PR, keeping inline code formatting.
  - The badge turns Verified.

  External MCP is verified from Claude Code (find-docs-for-path). 332 tests. |
| **M4** | Dec 8 to 14 | Admin settings, F12 if chosen, UI polish (ADS tokens), production deploy, share links, judge setup guide, second clean site test. | A clean-site install by the setup guide alone. |  |
| **M5** | Dec 15 to 21 | Bug bash, freeze Dec 18, video, Devpost text, open-source the repo Dec 19, submit Dec 21. | Submitted. |  |

## Tracks (agent assignments)

| Track | Directories | M0 agent |
| --- | --- | --- |
| Matcher and eval | `packages/`, `fixtures/` | matcher agent |
| Bitbucket path | `spikes/s1-*`, later `apps/bitbucket-relay/` | S1 agent |
| Confluence platform | `spikes/s2-confluence/`, later `apps/core` storage + byline | Confluence spike agent (S2, S7, S12) |
| Rovo and MCP | `spikes/s3-rovo/`, later `apps/core` actions/agent/mcp | Rovo spike agent (S3, S4, S11) |
| Demo content | `demo/` | orchestrator (M1) |
| Docs and decisions | `docs/`, `CLAUDE.md` | orchestrator |

**M1 agents (started 2026-11-11):** core app (`apps/core/`), relay (`apps/bitbucket-relay/`), eval and weights (`packages/matcher/`, `fixtures/`), seeding (`demo/`). `packages/shared` is frozen: additive changes only, and only via the orchestrator.

## Steps that need Razvan

- External MCP: enable the tools under Admin > Apps > Sites > Connected apps, and complete the OAuth consent in Claude Code (`/mcp`).
- Any CLI install consent prompt that can't run non-interactively.
- The second clean site (browser signup), by Dec 12.

## Polish backlog (from the M2 browser pass, 2026-11-11)

Fix during M3/M4; none blocks the demo.
1. ~~Review panel: sort events High before Medium.~~ Done (M3).
2. Review panel: rename proposals did not show for the M1 event (created before proposals were stored). Re-check on the next rename merge.
3. ~~Dashboard: "18 of 25" counts the space home page. Exclude the home page so it reads 18 of 24.~~ Done (M3).
4. ~~Dashboard: "Pages with drift" lists Verified pages. Show only drifted pages, and use the empty state when there are none. Remove the duplicate "Pages to review" heading.~~ Done (M3).
5. ~~Matcher reason: for PR #5 (`--count` renamed to `--replicas`), the reasons list only the file change. The removed flag `--count`, which the page mentions, should appear as "Page mentions --count, removed in PR #5". Check the identifier extraction for flags on modified (not removed) lines.~~ Done (M3): removal notices on + lines no longer keep a flag alive.
6. ~~Affected section excerpts flatten code blocks into prose. Consider showing the matched code line in code style.~~ Done (M3).

## M4 working plan (2026-11-11, scoped by Razvan)

In scope: admin settings, UI polish, testing and bug fixing. **Out of scope until Razvan says so:** production deploy, share links, the judge setup guide, the video and Devpost.

| Track | Owner | Work |
| --- | --- | --- |
| A. Settings + backend fixes | settings agent (main tree, only deployer) | F13 admin settings (sensitivity, ignore globs, per-space opt-in, escalation days, notifications, branch filter, demo replay); fixes from QA |
| B. UI polish | UI agent (worktree) | Review panel, Anchors tab, dashboard: consistency, states, a11y (ADS MCP), copy per voice-and-copy |
| C. Reviews | review agent (read-only) | forge-security-review + forge-app-review on both apps, as a findings report |
| D. Live QA | orchestrator in Chrome | Live scenario matrix on PLAT (Bitbucket scenarios 02 to 10 + Jira beats) vs the expected outcomes; relay settings page; edge states; bugs go to track A or B |

Exit: every scenario behaves as its `scenario.json` says on the live site, settings take effect live, no open High findings, and UI polish is merged.

### M4 live QA results (2026-11-11, orchestrator)

All 10 Bitbucket scenarios were merged for real in nano-soft-dev/payments-api, and the live core (v4.10.0) was checked against each `scenario.json`:

| Scenario | PR | Expected | Live result |
| --- | --- | --- | --- |
| 01 rename rollback script | #4 | Rollback runbook flags, High | Pass (score 1.00, High) |
| 09 rename scale flag | #5 | Scale payment workers flags, High | Pass (now names `--count`) |
| 04 tests only | #6 | No alert | Pass (all files ignored, probe skipped) |
| 05 lockfile bump | #7 | No alert | Pass (ignored, probe skipped) |
| 06 comment typo | #8 | No alert | Pass (1 candidate, 0 events) |
| 07 unrelated dir | #9 | No alert | Pass (0 candidates) |
| 02 raise DB pool | #10 | Fail over DB High; Helm chart page Medium | Pass (0.83 High; 0.66 Medium) |
| 08 revert of 02 | #11 | Revert closes both events | Pass (revertedPrId 10, 2 pages) |
| 03 remove v1 refunds | #12 | Refunds guide High; API overview Medium | Pass (1.00 High; 0.72 Medium with REFUNDS_V1_ENABLED) |
| 10 structured logging | #13 | 3 of 11 candidates flag (2 High, 1 Medium) | Pass (11 candidates, 3 events: 1.00, 1.00, 0.68) |

Small issue: when every file is ignored (04, 05), the consumer logs `probe: skipped` but no closing `DDS_MATCH_DONE` line. Add a closing line with the reason.
Note: after 08 (a revert), `bb_seed.py prepare 03` needs `--force`, because 02's change is no longer on main.

### Open findings to schedule (from the M4 review and UI agents, 2026-11-11)
- H1: the `dds-dev` web trigger must be removed (or excluded from the manifest) before any production deploy.
- M1: Confluence viewers (including over MCP) can see Bitbucket diff hunks and Jira details for pages they can view. Decide on the policy: summary only, or full hunks for editors.
- M2: diff hunks are never purged; trust-safety promises 30 days. Add a purge job.
- M3 and D15 mismatch: view-only users can dismiss (and so dampen anchors), but the UI disables it. Align: dismiss and snooze need update rights.
- M4: missing tests for ingest HMAC, action consent mapping and permission gates.
- Snoozed pages show the binding UI instead of "Snoozed until …".
- UI Kit limits: no `Grid` export in @forge/react 12.5.0, and `Select` has no aria-label. Use Inline tiles and a "Critical" checkbox.
- The 3 dependency-audit advisories in transitive Forge SDK packages are to triage.
