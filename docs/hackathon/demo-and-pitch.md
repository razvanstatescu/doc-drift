# Demo environment, video and Devpost

## Demo environment

- **Demo site: https://one-atlas-jzzf.atlassian.net** (`one-atlas-jzzf`). Provisioned 2026-11-11, **expires 2027-02-09**.
- **Forge demo site** (`forge site provision`): includes enterprise Jira, Confluence and Rovo. Free dev sites (go.atlassian.com/cloud-dev) reportedly lack Rovo. One active demo site per developer, and each expires after 90 days, so check that it survives judging (to Feb 3) and ideally winner announcement (~Feb 15). Run the demo on the same production app the judges install ([distribution.md](distribution.md)).
- **Judges may not have Rovo.** The setup guide says how to get a Rovo-enabled site, and the app degrades gracefully without Rovo: the badge, review panel, dashboard and MCP still work.
- Space **PLAT** with 24 pages: 8 runbooks (rollback, rotate secrets, scale workers, failover DB), 6 service overviews, 4 onboarding guides, 4 ADRs, 2 API guides. Each page has realistic code blocks referencing repo paths and env vars. **No demo page may have view restrictions** (D20).
- **Bitbucket team workspace `nano-soft-dev`** (https://bitbucket.org/nano-soft-dev), project `DDD` (Doc Drift Demo). Forge does not run on personal workspaces. The repo `payments-api` (private, `main`) is seeded from [demo/seed/](../../demo/seed/) with `bb_seed.py`. Scenario branches are created ahead of time; PRs are opened and merged on cue. PR numbers start at #1, so the live demo uses the real number, and only demo mode keeps the #482 story. Repos `payments-api` (helm, scripts, src) and `platform-tools`. 10 pre-built branches for scripted merges, one per scenario. A seed script uses the Bitbucket REST API to open and merge them on cue.
- **Jira project PAY** with epics linked from pages (`PAY-142`).
- **Demo personas:** Dana (page owner, verifies), Sam (merges PR #482).
- **The wrong-answer fixture:** the rollback runbook says `./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT`. PR #482 renames it to `rollback-v2.sh` and the env var to `ROLLBACK_TIMEOUT_SECS`.
- **Demo mode:** a "Replay seeded PR" button in global settings injects the stored PR #482 change record, so judges never need Bitbucket.

## Video script

The video must be under 5 minutes, public on YouTube, and show the app running. **Judges do not have to watch past 3:00**, so the full end-to-end flow and the agent and MCP proof (bonus evidence) must land before 3:00. Avoid third-party marks without permission: no Slack UI mock; use a generic pager/alert card instead. Keep any Claude Code branding incidental (a terminal).

### Revised script (v2, 2026-11-11). Core story ends at 2:55.

| Time | Shot | Voiceover |
| --- | --- | --- |
| 0:00 to 0:20 | Generic on-call alert card. On-call opens the Confluence runbook. Rovo chat confidently quotes the old step. | "At 3am, the runbook says run rollback.sh. That script was renamed two weeks ago, and Rovo still quotes it." |
| 0:20 to 0:30 | Age-based "fresh" label next to the page | "Age-based tools call this page fresh. It was edited last month." |
| 0:30 to 0:55 | Binding modal, auto-suggested anchors, save, green Verified badge | "Doc Drift Sentinel anchors pages to the code and Jira work they describe." |
| 0:55 to 1:25 | Merge PR #482 in Bitbucket. Cut to the page: the badge turns Possibly stale, the tooltip shows the PR. | "Merge happens. Within minutes the page is flagged, with the exact change." |
| 1:25 to 2:05 | Review panel, highlighted step, Propose fix, Drift Reviewer draft, Accept, badge green | "A Rovo agent drafts the edit. A human accepts it. Nothing changes silently." |
| 2:05 to 2:40 | Rovo chat asks again: caveated or correct. A terminal coding agent calls `find-docs-for-path`, then `check-page-freshness`, over MCP. | "Any agent can check freshness before citing, inside Rovo or from a coding agent over MCP." |
| 2:40 to 2:55 | Jira epic marked Won't Do flips an ADR page. Dashboard drift debt. | "Jira scope changes count too. Leads see drift debt per space." |
| 2:55 to 3:00 | Logo and tagline | "Doc Drift Sentinel. Catch the slip before your agents do." |
| 3:00 to 3:40 (bonus) | Architecture slide: two apps, zero-LLM detection, credits only on fix, eval confusion matrix | "Detection is deterministic: 30 seeded scenarios, measured precision and recall." |
| 3:40 to 3:55 (bonus) | Vision | "Docs that agents can trust, because they know when to stop trusting them." |

The original 4:40 script, with MCP at 2:45 to 3:25, is in [plan-v1 §21](../source/plan-v1.md).

Visuals follow [brand/](../../brand/): Night shift look, the slip as the only amber, the thumbnail "Catch the slip before your agents do."

## Devpost text, mapped to the judging criteria

Category: **Apps for Software Teams**. The five criteria weigh 20% each. Ties break in this order, so lead with Technological Implementation. The text must also explain how the project meets the technology requirement (Forge plus Confluence, Jira and Bitbucket).

- **Technological implementation:** two-app architecture with an HMAC-verified relay, async debounce, a content-property byline (no per-view compute), permission-aware `asUser` agent tools, eval harness results.
- **Design:** UI Kit with design tokens, a four-state badge, one-click review, no silent edits.
- **Potential impact:** stale runbooks as incident contributors, Rovo not preferring newer pages, a credit-light design for Dec 3 metering.
- **Innovation:** change-triggered staleness instead of age, freshness as a tool other agents call, a pre-change "docs for this path" lookup for coding agents.
- **Presentation:** the wrong-answer demo, before/after, under 5 minutes.

## Bonus strategy

A submission can win one Grand Prize plus at most one Bonus Prize. Lead with **MCP/agents**: Best Agents (agent + skill + actions), Best app with Atlassian MCP (`rovo:mcp` used from Claude Code). Also eligible: Best Teamwork Graph (anchor suggestion, if shipped). Not pursued: Best Marketplace published app (D19, share link only). Do not dilute scope chasing bonuses.

## Judge setup guide (to write)

1. Install the core app (link), connect Jira.
2. Optional: install the Bitbucket relay in a team workspace, paste the URL and secret.
3. Or use Demo mode: Settings > Replay seeded PR.
4. Enable external MCP: Apps > Sites > site > Connected apps. Add the MCP URL to Claude Code.
5. Ask Drift Reviewer in Rovo chat.
