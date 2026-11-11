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
| **M2** | Nov 24 to 30 | Jira trigger + rules, review panel (Verify/Dismiss/Snooze), notifier footer comments, space dashboard, escalation trigger, revert and rename handling. 30 fixtures + eval report. | Recall ≥ 0.9, precision ≥ 0.8, zero lockfile/test-only alerts. Dashboard shows real counts. |  |
| **M3** | Dec 1 to 7 | Actions, Drift Reviewer agent, skill, `rovo:mcp`, Propose fix flow, apply-as-version. Dec 1: F12/F16 decision (major-version trap). | The Rovo chat demo and the Claude Code demo work end to end. |  |
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
