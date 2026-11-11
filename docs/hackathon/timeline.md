# Timeline

Codegeist 2026. Build window Nov 10 to Dec 22, 2026. For the rules and deadlines as verified, see [codegeist-rules.md](codegeist-rules.md).

## Key dates

| Date | Milestone |
| --- | --- |
| Oct 27 | Submission period opened |
| Nov 10 to 16 | Week 1: spikes ([risks-and-spikes.md](risks-and-spikes.md)). Provision the Forge **demo site** (`forge site provision`, 90-day life, has Rovo). |
| Nov 17, 12:00 PM ET | Codegeist Build Session (Zoom, "AI workflows with Forge and Rovo"). Ask about multiple install links and the judge environment (Rovo, Bitbucket plan). |
| Dec 1 | Decide whether Forge LLM (F16) and Teamwork Graph (F12) ship. Adding them later is a major version. |
| Dec 3 | Rovo credit metering starts (affects the cost story) |
| Dec 12 | Share links (core + relay) generated from production and tested on a clean site by someone outside the team ([distribution.md](distribution.md)) |
| **Dec 18** | **Feature freeze** |
| Dec 18 to 19 | Record the video |
| Dec 19 | Open-source the repo (github.com/razvanstatescu/doc-drift, private until then): pick a licence, scan history for secrets, check that docs hold nothing private, write the README |
| Dec 20 | Devpost text |
| **Dec 21** | **Submit to Devpost** |
| Dec 22, 12:00 PM PT | Official deadline. Buffer only. |
| Jan 5 to Feb 3, 2027 | Judging. Install links and the demo site must stay alive. |
| ~Feb 9, 2027 | The demo site, provisioned Nov 11, 2026, expires (90 days). That is after judging ends (Feb 3) but before winners are announced (~Feb 15). |
| ~Feb 15, 2027 | Winners announced. Keep production and the share links unchanged until then. |

Devpost category: **Apps for Software Teams** ("deployment awareness" is in its brief). All five judging criteria weigh 20%. Ties break on Technological Implementation first.

## Week by week

| Week | Dates | Goals | Definition of done |
| --- | --- | --- | --- |
| 1 | Nov 10 to 16 | Spikes on all open questions. Dev site and Bitbucket team workspace. Repo scaffold. Matcher package with 10 fixtures. | Relay fires on a real merge and posts to the core web trigger. Byline renders from a content property. A `rovo:mcp` hello-world tool is called from Claude Code. Go/no-go written down for each risky module. |
| 2 | Nov 17 to 23 | Data model. Binding modal with auto-suggest from the body. Ingest to matcher to drift_event pipeline. Badge state writes. Seed script for 24 pages. | Merging the seeded PR flips the right 3 pages to Possibly stale within 15 minutes. No other pages change. Demo mode replay works. |
| 3 | Nov 24 to 30 | Jira trigger and rules. Review panel v1 (Verify/Dismiss/Snooze). Notifier footer comments. Dashboard v1. Escalation trigger. Revert and rename handling. | All 30 fixtures pass at the target precision/recall. Dashboard shows real counts. |
| 4 | Dec 1 to 7 | Drift Reviewer agent, actions, skill, MCP tools. Propose fix flow. Apply-as-version (Should). | Rovo chat demo works end to end. Claude Code demo works. Credit use per review measured (target: one agent run per fix, no LLM in detection). |
| 5 | Dec 8 to 14 | Admin settings. TWG suggest anchors (Should). UI polish. Demo mode polish. Judge setup guide. Production deploy and share links. | Share-link install tested on a fresh site by someone outside the team, following only the setup guide. |
| 6 | Dec 15 to 22 | Bug bash. Feature freeze Dec 18. Video Dec 18 to 19. Devpost text Dec 20. **Submit Dec 21.** Dec 22 is buffer only. | Devpost submitted with the install links, a video under 5 minutes and the setup guide. |

## Team (confirmed 2026-11-11, D22)

Razvan plus Claude Code, running several agents in parallel. Razvan is experienced and fast, so the team counts as the plan's full team, and **the full MoSCoW scope stays**. There is no pre-emptive cut: use the cut order only if a week's definition of done slips. Parallelise by track (backend/Forge, UI Kit, Rovo/MCP, eval harness, demo seed) with separate agents.

## Scope cuts

See [product/features.md](../product/features.md#scope-cut-order). Never cut: relay + matcher, byline, review panel, agent, MCP, demo mode.
