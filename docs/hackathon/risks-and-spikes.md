# Risks and week-1 spikes

## Week-1 spikes (each under one day)

Update the Status column as spikes finish. Record the outcome in [decisions.md](../decisions.md) when it changes the design.

| # | Spike | Time | Status | Outcome |
| --- | --- | --- | --- | --- |
| S1 | **Relay to core link.** Deploy both apps. Call the core web trigger URL from the relay with egress declared. Confirm a 2xx and HMAC verification. | 2h | **GO** (2026-11-11) | Relay got the merged-PR event about 2 s after the merge, signed the record, and POSTed it to the core static v2 trigger: HMAC verified, stored, 202. Bad signature gives 401. Egress `*.webtrigger.atlassian.app` is enough. See [spikes/S1-RESULT.md](../../spikes/S1-RESULT.md). |
| S2 | **Byline from a content property.** Write `{title, icon, tooltip}` to the property, reload the page, confirm it renders with no function logs. Also find the icon value format and whether the app user can read restricted pages. | 2h | **GO**, icon open (2026-11-11) | Live: the byline renders title + tooltip from the raw-key content property with **0 function calls** on page view (forge logs), and property writes add no page versions. The dev environment appends "(Development)" to the title. Icon `resource:icons;<file>.svg` showed the **generic app icon**; the other icon formats (bare path, data URI, URL) are still to check on S2-2 to S2-4. The state word in the title carries meaning regardless. See [spikes/S2-S7-S12-RESULT.md](../../spikes/S2-S7-S12-RESULT.md). |
| S3 | **External MCP.** Deploy `rovo:mcp` with one tool. Enable it in Connected apps. Add `https://mcp.atlassian.com/forge/<appId>` to Claude Code, complete OAuth, call the tool. | 3h | **GO** (2026-11-11) | Live from Claude Code: admin toggle (one switch per app), `claude mcp add` + `/mcp` OAuth. First call: `NEEDS_AUTHENTICATION_ERR`, which returned `unknown` / `consent_required` with no title (D21 confirmed). After the user opened an app surface once and clicked **Allow access**, the same call returned 200 with the title. **MCP OAuth does not grant app user consent: the judge setup guide must say "open the app once and click Allow access".** The unpermitted-viewer case needs a second account. |
| S4 | **Agent + skill.** Deploy `rovo:agent` with one action and one `rovo:skill`. Invoke it in Rovo chat. Confirm the skill instructions apply. | 3h | **GO** (2026-11-11) | Agent, skill and MCP deploy together. In Rovo chat, "Drift Reviewer (spike)" appears, calls `check-page-freshness`, and answers in the guidance voice ("State: Unknown ... Do not cite it"). Skill attachment is inferred, not observable. |
| S5 | **Jira trigger filter.** Change an anchored issue's status and fixVersion. Confirm the `changelog.items` content, and that summary-only edits are filtered. | 1h | Open | Docs: filter on `fieldId`; fixVersions/components are not in the payload, so fetch the issue |
| S6 | **Diffstat shape.** Log the diffstat for a PR with a rename, a delete and 120+ files. Confirm `status`, `old.path`, `new.path` and pagination. Check whether `requestBitbucket` follows the 302. | 1h | **GO** (2026-11-11) | Both forms work from Forge: `requestBitbucket` follows the PR diffstat 302, and `/diffstat/{src}..{dst}?topic=true` works. Use the range form (event destination hash = pre-merge tip). Build the spec as two interpolations: one value holding `..` makes `route()` throw. Still untested: 120+ files. |
| S7 | **Forge SQL vs custom entities.** Create the `page_state` table and run a grouped dashboard query. Pick one by end of day. | 1d | **GO** (2026-11-11) | Migrations via an install/upgrade trigger, then a queue consumer (900 s), applied 4 DDLs in about 6 s. On 200 rows: GROUP BY dashboard query p50 35 ms / p95 82 ms; top-10 by severity 24 ms. Multi-statement, SLEEP and SET SESSION are rejected. D16 confirmed: Forge SQL. |
| S8 | **Teamwork Graph.** Register one persisted query (page links to external PR) from an admin browser session and run it `asUser`. Timebox 3h, then defer. | 3h | Open | |
| S9 | **Share-link path.** Generate a production share link for a hello-world core app (Confluence required, Jira optional) and the relay. Install both on a second, clean site/workspace, and connect Jira after install. | 2h | Open | Replaces the Marketplace spike (D19). See [distribution.md](distribution.md). |
| S10 | **Scheduled trigger interval and web trigger host pattern.** Confirm allowed `interval` values and the egress host to declare. | 1h | Answered by docs | `interval: hour` is valid; v2 host is `*.webtrigger.atlassian.app` |
| S11 | **Demo site and Rovo.** Provision a Forge demo site, confirm Rovo chat and agents appear, and record its expiry date. | 1h | **GO** (2026-11-11) | The demo site has Rovo (`rovo.isEnabled()` true; agent chat works). |
| S12 | **`forge eligibility`.** Run it on the core app with the static web trigger. | 0.5h | **Done** (2026-11-11) | Core spike (static trigger, no egress) is RoA-eligible; relay is not (egress), as expected. |

The research files in [docs/platform/](../platform/) and [codegeist-rules.md](codegeist-rules.md) answer several of these from the docs already. The spikes still confirm behaviour on a real site.

## Risk register

| Risk | Likelihood | Mitigation / fallback |
| --- | --- | --- |
| Relay to core web trigger egress or HMAC issue | Medium | Fallback: core polls the Bitbucket REST API with a workspace access token (loses Runs on Atlassian). Demo mode replay keeps judging working regardless. |
| Judges lack a Bitbucket team workspace | High | The setup guide marks Bitbucket optional. Demo mode replays seeded change records. The video shows the live path. |
| External MCP blocked (admin toggle, OAuth, client quirks) | Medium | The same tools are available to Rovo Studio custom agents. The video shows both. Document the admin toggle path: Apps > Sites > site > Connected apps. |
| Teamwork Graph persisted query registration fails | Medium | The feature is a Should. Fall back to body parsing. Never block on it. |
| Multi-app (Confluence required, Jira optional) share link fails, or Jira won't connect on the judge's site | Low to Medium | Spike S9. Fallback: make Jira required, or ship Confluence-only with Jira rules behind demo mode. |
| A production deploy during judging breaks judge installs or forces a major version | Medium | Freeze production after Dec 21 ([distribution.md](distribution.md)). Develop in other environments. |
| Byline content property shape differs from the assumption | Low | Fall back to `dynamicProperties` (one function invocation per view). |
| False positives annoy owners | Medium | Default file-level anchors, ignore globs, a 24h notification cap, and a dismiss dampener (−0.1 per dismissal, floor 0.3). |
| Preview modules change (`rovo:mcp`, `rovo:skill`, TWG, multi-app, page banner) | Medium | Keep each behind a thin adapter. Watch the Forge changelog weekly. |
| `forge tunnel` only forwards the CLI user's traffic | Certain | Test multi-user permission cases on a deployed environment. |
