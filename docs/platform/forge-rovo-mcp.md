# Forge Rovo, MCP, LLMs, credits and Teamwork Graph: verified reference

Checked on 2026-11-11 against developer.atlassian.com, support.atlassian.com and community.developer.atlassian.com.
"Verified" means the fact was read on the linked page on that date. "Community (staff)" means an Atlassian staff post on CDAC. "Unverified" means inference or a third-party claim.

Short source keys used below:

- [AGENT] https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/ (updated Oct 2, 2026)
- [ACTION] https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-action/ (updated Aug 3, 2026)
- [SKILL] https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-skill/ (updated Oct 29, 2026)
- [MCP] https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-mcp/ (updated Oct 29, 2026)
- [MCP-HW] https://developer.atlassian.com/platform/forge/build-a-hello-world-rovo-mcp/
- [MCP-JIRA] https://developer.atlassian.com/platform/forge/read-jira-issues-with-a-rovo-mcp-tool/
- [CL-3495] https://developer.atlassian.com/platform/forge/changelog/#CHANGE-3495 (1 Oct 2026; text read via mirror https://github.com/ryanackley/forge-sim/issues/46)
- [RFC134] https://community.developer.atlassian.com/t/rfc-134-forge-rovo-tools-and-mcp/100683
- [EXT-AI] https://community.developer.atlassian.com/t/external-ai-access-and-teamwork-graph-integration-for-forge-apps/102929
- [BRIDGE] https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/rovo/
- [LLM] https://developer.atlassian.com/platform/forge/runtime-reference/forge-llms-api/, [LLM-REF] .../forge-llms-api-reference/, [LLM-PRICE] .../forge-llms-api-pricing/, [LLM-MODELS] .../forge-llms-models/, [LLM-LIM] https://developer.atlassian.com/platform/forge/limits-llm/
- [LLM-GA] https://www.atlassian.com/blog/development/forge-llms-api-is-now-ga-heres-how-you-can-build-ai-native-apps-on-atlassian
- [FPP] https://developer.atlassian.com/platform/forge/forge-platform-pricing/
- [CREDITS] https://support.atlassian.com/rovo/docs/rovo-usage-limits/
- [SUP-MCP] https://support.atlassian.com/organization-administration/docs/configure-tools-for-an-external-mcp-server/
- [METERS] https://community.developer.atlassian.com/t/forge-access-to-customer-platform-usage-meters-rovo-credits-automation-steps-and-extra-usage-controls/102558
- [TWG-CALL] https://developer.atlassian.com/platform/teamwork-graph/call-the-teamwork-graph-api/, [TWG-CUR] .../curated-queries/, [TWG-PQ] .../persisted-cypher-queries/, [TWG-SCOPES] .../scopes/, [TWG-LIM] .../limitations-and-considerations/, [TWG-CL] .../changelog/, [TWG-REL] .../api-reference/relationship-types/content-entity-links-entity/
- [TWG-BRIDGE] https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/requestTeamworkGraph/
- [FORGE-CL] https://developer.atlassian.com/platform/forge/changelog/

---

## 1. `rovo:agent`

Release phase: no Preview banner on the page (GA). Verified [AGENT].

| Property | Type | Required | Notes |
|---|---|---|---|
| `key` | string | yes | regex `^[a-zA-Z0-9_-]+$` |
| `name` | string | yes | max 30 characters |
| `description` | string | no | shown to users |
| `icon` | string | no | `resource:<key>;<path>` or absolute URL. Falls back to a generic avatar |
| `prompt` | string | yes | Inline, or `resource:<resourceKey>;<relative path>`. The resource form needs Forge CLI 10.6.0+ |
| `conversationStarters` | string[] | no | suggested prompts |
| `actions` | string[] | no | action keys |
| `skills` | string[] | no | `rovo:skill` keys, unique. Part of the skill Preview |
| `followUpPrompt` | string | no | generates follow-up suggestions after an answer |

All Verified [AGENT]. Minimal YAML copied from the docs:

```yaml
modules:
  rovo:agent:
    - key: risk-agent
      name: "My Risk Register Assistant"
      description: A Rovo Agent that helps you manage your project risks
      icon: resource:example-resource;icons/risk-agent.svg
      prompt: resource:agent-resource;prompts/agent-prompt.txt
      conversationStarters:
        - Fetch my active project risks
      actions:
        - fetch-all-risks
resources:
  - key: example-resource
    path: static/hello-world/build
  - key: agent-resource
    path: resource/agent
```

- Safety screening: "Atlassian performs safety screening on Agents at our sole discretion". It can block deployment or suspend use of Rovo APIs. The same notice appears on the agent, action, skill and MCP pages. Verified [AGENT].
- Data access: an app-based agent sees only the workspace where the app is installed. Cross-product access needs multi-app compatibility. Verified [AGENT].
- Where users invoke it: the Rovo Chat side panel ("Ask Rovo" in the top nav), the `/ai` AI toolbar in the Confluence and Jira editors, Automation rules (asynchronous, with an extra prompt from the rule author), and programmatically through `rovo.open()` from `@forge/bridge`. Verified [AGENT], [MCP-HW].
- `rovo.open({ type: "forge", agentName, agentKey, prompt? })` opens the chat sidebar with your agent and an optional pre-filled prompt. It works in all Jira and Confluence modules, and only for Forge agents in the same app. Verified [BRIDGE]. Useful for a "Review with Drift Reviewer" button in the byline modal.
- Docs guidance: keep the prompt for role, tone and boundaries. Put task procedures in `rovo:skill` and executable operations in `action`. Long inline prompts inflate manifest size. Verified [AGENT].

## 2. `action`

Release phase: GA (no banner). Verified [ACTION].

| Property | Required | Notes |
|---|---|---|
| `key` | yes | regex `^[a-zA-Z0-9_-]+$`. Under 64 characters if exposed through `rovo:mcp` [MCP] |
| `name` | yes | human-friendly, shown in the UI |
| `function` or `endpoint` | yes | `function` = Forge function key. `endpoint` = Forge Remote endpoint key |
| `actionVerb` | yes | `GET`, `CREATE`, `UPDATE`, `DELETE`, `TRIGGER` |
| `description` | yes | what the LLM reads to decide when to call it |
| `inputs` | yes (mandatory, even if empty) | map of `inputName: { title, type, required, description }` |
| `inputs.*.type` | yes | `string`, `integer`, `number`, `boolean` only (flat, no objects or arrays) |
| `inputs.*.required` | yes | boolean |

All Verified [ACTION].

```yaml
modules:
  action:
    - key: fetch-timesheet-by-date
      name: Fetch timesheet by date
      function: getTimesheetByDate
      actionVerb: GET
      description: |
        Retrieve a user's timesheet based on a date
      inputs:
        timesheetDate:
          title: Timesheet Date
          type: string
          required: true
          description: "The date that the user wants a timesheet for"
  function:
    - key: getTimesheetByDate
      handler: index.getTimesheetByDate
```

- Handler signature: `(payload, context)`. `payload` holds the inputs plus `payload.context` with `cloudId`, `moduleKey` and, when invoked on a product surface, a product object. For Confluence that is `confluence: { url, resourceType, contentId, spaceKey, spaceId }`; for Jira, `jira: { url, resourceType, issueKey, issueId, issueType, issueTypeId, projectKey, projectId }`. The second argument `context` contains the user's `accountId`. Verified [ACTION], [MCP-HW].
- Trust rule from the docs: inputs are LLM-extracted and can be hallucinated. Never use them for authorization. Read `accountId` from `context`. Verified [ACTION].
- Return value: "any string or JSON object", which the agent turns into natural language. Verified [ACTION].
- Size limit: the action module "can only handle data up to 5 MB". Verified [ACTION].
- Automation: agents triggered by Automation rules will not invoke `CREATE`, `UPDATE`, `DELETE` or `TRIGGER` actions. Verified [ACTION].
- Confirmation: `GET` runs without confirmation, and non-GET verbs make Rovo Chat ask the user to confirm. Staff added "there are currently no differences in the other verbs". Community (staff), 2024: https://community.developer.atlassian.com/t/whats-the-impact-of-actionverb-in-rovo-action/86069. Whether external MCP clients apply any confirmation is Unverified (MCP clients usually apply their own tool-approval UI).
- Description length: RFC staff said tool descriptions should be about 40 to 100 tokens and "we will most likely enforce such a limit". Community (staff) [RFC134]. Not in the docs yet.

## 3. `rovo:skill`

Status: Preview. Deployable to development, staging and production. Verified [SKILL]. An older September doc snapshot said EAP and development only, so that restriction no longer applies.

Manifest properties (exact). Verified [SKILL]:

| Property | Required | Notes |
|---|---|---|
| `key` | yes | regex `^[a-zA-Z0-9_-]+$` |
| `source.dir` | yes | relative path from the manifest dir. Must exist, contain `SKILL.md` and be unique across skills |
| `dependencies.tools` | yes if `dependencies` is set | action keys from the same app, no duplicates |

There is no `name`, `description` or `path` property in the manifest. Name and description live in the SKILL.md frontmatter.

```yaml
modules:
  rovo:skill:
    - key: jira-issue-analyst
      source:
        dir: skills/jira-issue-analyst
      dependencies:
        tools:
          - get-project-issues
  rovo:agent:
    - key: issue-analyst-agent
      name: Issue analyst
      prompt: Help users understand the status of work in their Jira projects.
      skills:
        - jira-issue-analyst
```

SKILL.md frontmatter (Agent Skills spec). Verified [SKILL]:

| Field | Required | Rule |
|---|---|---|
| `name` | yes | 1 to 64 chars, lowercase letters, digits and single hyphens. Must equal the parent directory name |
| `description` | yes | 1 to 1,024 chars. Use at least 50 so the agent can discover it |
| `compatibility` | no | 1 to 500 chars |
| `metadata` | no | string key-value pairs |
| `license` | no | |
| `allowed-tools` | no | space-separated tool keys. If set, it must include every `dependencies.tools` entry |

```markdown
---
name: jira-issue-analyst
description: Retrieve and summarize Jira issues for a project or sprint when users need an issue analysis.
allowed-tools: get-project-issues
---
# Jira issue analysis
Use `get-project-issues` to retrieve the issues ...
```

- Layout: `skills/<name>/SKILL.md` plus optional `references/` files, referenced by relative path. Keep the body to 500 lines or fewer (the CLI warns). Verified [SKILL].
- Limits: directory at most 100 MB uncompressed. Tool dependencies must be `action` modules of the same app. Verified [SKILL].
- Preview limitations: no skill-to-skill dependencies, and no executable scripts. Verified [SKILL].
- Attachment: a Forge agent can use only the skills listed in its `skills` property. The agent picks a skill by its description, and explicit invocation by name is not supported in Preview. Verified [SKILL].
- Scopes: no new scopes or consent step, so declare the scopes the actions need. Verified [SKILL].
- Skills for agents outside your app: the docs describe skills only through the Forge agent's `skills` property. The RFC idea of a registry that Rovo Chat or other agents discover is not documented. Unverified.
- "Change skill text without a new version": RFC staff said skill content deploys as a resource, so guidance updates on each `forge deploy`. Community (staff) [RFC134] post 22. The docs only say Forge "validates and bundles each skill when you deploy". Unverified in docs.

## 4. `rovo:mcp`

Status: Preview for Rovo Studio agents. External third-party AI clients are also Preview, announced 1 Oct 2026. Verified [MCP], [CL-3495].

| Property | Required | Notes |
|---|---|---|
| `key` | yes | regex `^[a-zA-Z0-9_-]+$` |
| `name` | yes | max 30 characters |
| `tools` | yes | action keys. Each key under 64 chars, at most 50 actions |

At most one `rovo:mcp` module per app. Tools come from the latest app version when products run different versions. Verified [MCP].

```yaml
modules:
  rovo:mcp:
    - key: timesheet-mcp
      name: "Timesheet MCP"
      tools:
        - fetch-timesheet-by-date
        - update-timesheet
```

- Prerequisite: Forge CLI 13.3.0 or later. `forge module add` can scaffold it. Verified [MCP-HW].
- Inside Rovo: tools appear only to custom agents built in Rovo Studio. The user opens Create agent, then Tools, then Add tools, then Connected apps, then picks your app's tool, then Publishes. Verified [MCP-HW]. The RFC idea of tools callable from plain Rovo Chat without an agent is not in the docs. Unverified.
- Rovo itself must be activated on the site to use tools in Rovo Studio. Verified [MCP-HW].

External MCP path. Verified unless marked:

1. Endpoint: `https://mcp.atlassian.com/forge/<appId>`, where `<appId>` is the UUID after `ari:cloud:ecosystem::app/` in `app.id`. Verified [MCP]. (The RFC shapes `.../v1/forge/...` are obsolete.)
2. Admin enablement: off by default and set per installation (per site). The admin goes to Atlassian Administration, then Apps, Sites, the site, Connected apps, the app, app details, and turns on tools. Verified [MCP]. The changelog says that during Preview "enabling external access exposes all tools declared in the module" [CL-3495]. Staff said per-tool choice in the admin UI and on the OAuth screen is planned for GA [EXT-AI]. Treat the switch as all-or-nothing for now.
3. OAuth: an OAuth 2.1 consent screen. The user picks a site (only sites where the app is installed and exposure is on), reviews scopes and tools, and approves. Verified [MCP].
4. Claude Code, copied from the docs:
   ```bash
   claude mcp add --transport http doc-drift https://mcp.atlassian.com/forge/<appId>
   ```
   Then run `/mcp` in a session to connect and complete OAuth. Verified [MCP-HW].
5. Cursor: add a remote server in `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global) as `{ "mcpServers": { "doc-drift": { "url": "https://mcp.atlassian.com/forge/<appId>" } } }`. Cursor supports OAuth for remote servers. Verified on Cursor docs (https://cursor.com/docs/context/mcp). Atlassian lists Claude Desktop, Codex and Cursor as example clients [CL-3495]. Cursor end to end with this endpoint is Unverified.
6. Rovo licence: not required. "A customer's site does not need Rovo enabled or licensed for an external AI client to access an app's rovo:mcp tools." Community (staff) [EXT-AI].

Permission model:

- Calls run "subject to the invoking user's own permissions on that site". Verified [MCP]. The changelog adds that every tool call respects the user's existing site permissions [CL-3495].
- `asUser()` from external clients has a known issue. "For reliable `asUser()` execution from a third-party client, the tool's user must have an app consent entry for this app in their Connected apps. Without this consent entry, `asUser()` calls can fail when invoked remotely... Until it's resolved, use `asApp()` if you can't guarantee the user has this consent entry." Verified [MCP-JIRA].
- So `asApp()` is not blocked today. That contradicts the RFC ("asApp() will be actively prevented"). Verified [MCP-JIRA] vs [RFC134].
- Invocation source: the payload shape for external calls (surface attribution, whether `payload.context` carries a product object) is not specified. Staff said attribution "isn't fully specified yet" [RFC134] post 21. Expect `cloudId` and `accountId`, and no `confluence` object. Unverified.
- Timeouts for MCP-invoked actions were an open item in the RFC. Assume normal Forge function limits. Unverified.
- Rovo credits for external MCP calls to Forge tools: [SUP-MCP] says MCP calls from AI clients consume Rovo credits, but it describes the Atlassian Rovo MCP server. Whether Forge app tools are metered is Unverified.

## 5. Forge LLMs

- Status: GA since 29 July 2026 ("generally available for all developers"). Verified [LLM-GA]. The pages carry no Preview banner. Verified [LLM].
- Manifest: the `llm` module is required, or lint fails. Adding it, or a new model family, triggers a major version upgrade that admins must approve. Admins see LLM use in the Marketplace listing and at install. Verified [LLM-REF], [LLM].
  ```yaml
  modules:
    llm:
      - key: llm-app
        model:
          - claude
  ```
- API: `@forge/llm` exposes `list()`, `chat(prompt)` and `stream(prompt)`. A prompt is `{ model, messages[], temperature?, max_completion_tokens?, top_p?, tools?, tool_choice? }` and the response carries `choices[]` plus `usage`. Text only. Do not set both `temperature` and `top_p`, and omit both for `claude-opus-4-7`, `claude-opus-4-8`, `claude-opus-5` and `claude-sonnet-5`. Verified [LLM-REF], [LLM-MODELS].
- Models (ACTIVE): `claude-haiku-4-5-20251001`, `claude-sonnet-4-5-20250929`, `claude-sonnet-4-6`, `claude-sonnet-5`, `claude-opus-4-6`, `claude-opus-4-7`, `claude-opus-4-8`, `claude-opus-5`. Verified [LLM-MODELS].
- Limits per installation: 100 requests/min, 500k tokens/min per model, 5 min inference (needs async events with a matching timeout). Context window: Haiku 200K/64K; Sonnet and Opus 1M/128K. Verified [LLM-LIM].
- Billing: developer-paid with no free quota ("All token usage is billed"). Rates: Haiku 4.5 is 10 credits per 1M tokens, Sonnet 4.5 is 30, Opus 4.6 is 50. Input credits cost $0.10 and output credits $0.50, so Haiku works out to $1/$5 per 1M tokens. Verified [LLM-PRICE], [FPP].
- Moderation: requests go through the same moderation as Atlassian first-party AI, and high-risk messages are blocked. Verified [LLM].
- Runs on Atlassian: apps that use only Forge LLMs keep eligibility. Verified [LLM-REF], [LLM-GA].
- Codegeist: no participant credit program or free LLM allowance was found. Unverified. Assume your own Forge bill pays for LLM use.

## 6. Rovo credits

- Basic Rovo agents (no model selection) and Rovo Chat quick answers cost 10 credits per billable event. Advanced agents (with model selection), Think deeper and similar features cost variable credits. Each chat user message is a billable event, and each agent invocation is one. This rate card applies from 31 Aug 2026. Verified [CREDITS].
- Enriched Teamwork Graph API and tool calls ("cross-product traversals", including `cypher`) cost variable credits, mostly 1 to 10 per call. Single-product lookups and writes are free. Verified [CREDITS]. Whether a Forge app's `customQuery` call counts as "enriched" is Unverified, but it is likely.
- Extra-usage billing starts 3 Dec 2026 at a list price of $0.01 per credit. Extra usage is on by default, and admins can cap or disable it. Allowances per user per month: Jira or Confluence Standard 25, Premium 70; Collections 250/700/1,500. Verified [CREDITS].
- Features in beta do not count unless stated. Verified [CREDITS].
- Who pays: the customer org pays Rovo credits. The developer pays Forge compute and storage for the action run. Verified [FPP].
- App visibility: no API or scope lets an app read the customer's meter. Usage is visible only under Admin, Usage, Meters, plus CSV export. Community (staff confirmed) [METERS].
- Rovo enablement prerequisite: "To turn on Rovo, your organization admin must be on a verified business domain". Generic domains like gmail.com cannot enable it. Verified [CREDITS]. Codegeist builders report no Rovo Chat on free developer sites (https://community.developer.atlassian.com/t/rovo-chat-agents-not-available-on-free-developer-site-for-codegeist-2026/103526). A Forge demo site from `forge site provision` includes enterprise Rovo (https://developer.atlassian.com/platform/forge/provision-a-demo-development-site/). Site lifetime is 90 days by default (third-party summary, Unverified).

## 7. Teamwork Graph API from Forge

- Status: the Consumption API moved to Preview on 15 Oct 2026, with at least 1 month's notice for breaking changes. Verified [TWG-CL], [TWG-CALL]. The `requestTeamworkGraph()` bridge API moved to Preview on 11 Nov 2026. Verified [FORGE-CL].
- Query modes. Verified [TWG-CALL], [TWG-CUR], [TWG-PQ]:
  - Raw `cypherQuery` is unavailable to new apps.
  - Curated queries are typed GraphQL fields that need no registration. Useful ones here: `confluencePageOwners(id)`, `confluencePageContributors(id)`, `confluencePageCreator(id)`, `confluencePageLinkedConfluencePages(id)`, `jiraWorkItemLinkedExternalPullRequests(id)`. There is no curated "page to pull request" field.
  - Persisted Cypher: register once and run via `customQuery(queryKey, queryParams, first)`, with `first` at most 25. Query text is immutable; changing it gives a new key.
- Registration. Verified [TWG-PQ]:
  - Use TWG Labs Query Builder (https://teamwork-graph.atlassian.com/query-builder, "Saved queries" tab) or `POST https://<site>.atlassian.net/gateway/api/twg/cypher-queries` with `{ appId, name, cypher, paramsSchema? }`.
  - The caller must be a contributor on the app and must carry a user identity (`401 UNIDENTIFIED_CALLER` otherwise).
  - Propagation takes about 1 minute. Resubmitting the same text is idempotent (200 with the same key).
  - Only the owning app can execute a key (`NOT_OWNER`).
- Auth: backend calls use `api.asUser().requestTeamworkGraph(query, variables)`; the frontend uses `requestTeamworkGraph(query, variables)` from `@forge/bridge`. "Calls always run as the current user; Forge apps can't call the Teamwork Graph API as the app." Verified [TWG-BRIDGE]. Rows are permission-filtered per user. Verified [TWG-PQ].
- Scopes: one per object type, in the form `read:graph:<object>:<product>`, all read-only. Verified [TWG-SCOPES].
  - Declare every type the traversal touches, including intermediate hops.
  - A missing or admin-disabled scope returns empty results, not an error.
  - The EAP scopes `read:graph:confluence` and `read:graph:jira` are retired.
  - Forge caps an app at 50 scopes.
  - Scopes relevant here: `read:graph:page:confluence`, `read:graph:issue:jira`, `read:graph:pull-request:external`, `read:graph:repository:external`, `read:graph:commit:external`, `read:graph:user:atlassian`.
- Install friction: "Installing apps with the Teamwork Graph scopes requires organization administrator permissions". The API is supported only for apps installed in Jira or Confluence. Atlassian recommends Runs on Atlassian. Verified [TWG-LIM].
- Relationship from page to code: `ContentEntityLinksEntity`, Cypher name `content_entity_links_entity`. It runs from Confluence page, blogpost or comment to "all types that can be extracted by Atlassian's Object Resolver Service". The listed types include External pull request (`ati:cloud:jira:pull-request`, `ati:cloud:graph:pull-request`), External repository, External commit, External branch and Jira work item. TTL is 730 days. Verified [TWG-REL]. Example persisted query, not yet tested (Unverified):
  ```cypher
  MATCH (p:ConfluencePage {ari: $pageAri})-[:content_entity_links_entity]->(pr:ExternalPullRequest) RETURN collect(distinct pr) as prs
  ```
- Whether Bitbucket Cloud PRs appear as `ExternalPullRequest` nodes linked from pages (as opposed to Jira dev-panel data only) is Unverified. Test this in the week-1 spike.

---

## Differences from plan.md

Items marked **[design]** or **[manifest]** change the design or the manifest.

1. **[manifest] `rovo:skill` skeleton is wrong.** The module has `key`, `source.dir` and `dependencies.tools`. It has no name, description or path. Use:
   ```yaml
   rovo:skill:
     - key: check-page-freshness-skill
       source: { dir: skills/check-page-freshness }
       dependencies: { tools: [check-page-freshness, get-drift-context] }
   ```
   In SKILL.md, `name: check-page-freshness` must equal the directory name. If `allowed-tools` is set, it must list every dependency.
2. **[design] The skill cannot reach other agents.** A skill attaches only to your own Forge agent's `skills` list and is chosen by its description. It cannot be named explicitly. Feature 10 ("SKILL.md telling *any* agent to call the tool before citing") does not work through `rovo:skill`. For customer Studio agents and external clients, put the "call before citing" guidance in the action `description` and in the tool result's `guidance` field.
3. **[design] `asUser()` from external MCP clients is unreliable.** It can fail unless the user has a consent entry for the app in their Connected apps. Docs say to fall back to `asApp()`.
   - Plan §5 and §11 assume `asUser()` everywhere for MCP. Add an `asApp()` fallback that runs an explicit permission check for `accountId` (for example, the Confluence content permission check API) before returning titles or status.
   - Have the demo user open the app once in Confluence to grant consent.
   - The RFC claim that `asApp()` is blocked is outdated.
4. **[design] Teamwork Graph cannot be used in MCP tools for now.** TWG is `asUser`-only and external `asUser` is flaky (item 3), so keep TWG out of MCP tool handlers. Use it only in UI and resolver flows (the bridge `requestTeamworkGraph` is now Preview), and possibly in Rovo-invoked actions (Unverified).
5. **[design] TWG scopes raise install friction.** TWG scopes make installation need an org admin, and adding them later forces a major version and re-consent. Decide in week 1 whether TWG ships. If it does, the plan's scope list is missing `read:graph:pull-request:external` and `read:graph:repository:external`, plus `read:graph:user:atlassian` if you use the owner or contributor queries.
6. **[design] There is no curated query for page-to-PR.** That needs a persisted `content_entity_links_entity` query. For "suggest owner", use the curated `confluencePageOwners` and `confluencePageContributors` instead of custom Cypher.
7. **[design] TWG calls may cost customer credits.** Enriched TWG calls (`cypher`, cross-product traversals) can consume 1 to 10 customer Rovo credits each. Keep "suggest anchors" explicitly user-triggered, as the plan already does, and say so on the listing.
8. **[design] Rovo is missing on free developer sites with gmail-domain orgs.** Rovo needs a verified business domain. Use `forge site provision` (demo site with enterprise Rovo) for the agent demo, and keep the judge path working without Rovo.
   - External MCP needs no Rovo licence (staff), which strengthens leading with MCP.
   - Rovo Studio tool use does need Rovo activated.
9. **[design] Studio tools are reachable only through custom agents.** `rovo:mcp` tools reach customer Studio agents only. There is no documented native Rovo Chat tool use without an agent (the RFC idea). The plan's wording "admins add your tool to their agents" is right. Don't claim that Rovo itself checks freshness automatically.
10. **[design] The external MCP admin switch is all-or-nothing during Preview.** The changelog says enabling external access exposes every tool in the module; the docs describe per-tool toggles, and staff say per-tool control comes at GA. Never put `record-verification` or any write action in `rovo:mcp.tools` unless you accept it being exposed externally. The plan keeps it agent-only, which is good.
11. **[manifest] Use `integer` for `limit`.** `list-stale-pages.limit` is typed `number`; use `integer`. `inputs` is mandatory on every action, and the type must be one of string, integer, number or boolean.
12. **[design] UPDATE and CREATE actions need confirmation.** Non-GET actions prompt the user to confirm in Rovo Chat, and agents run from Automation never call them. If the plan later wants an Automation rule that runs Drift Reviewer and posts the footer comment, that action must be `GET` (bad practice) or done outside the agent.
13. **[manifest/design] Forge LLMs is GA, not Preview** (since 29 Jul 2026). The optional Forge LLM triage needs `modules.llm: [{ key, model: [claude] }]`. Adding that module later is a major version with admin re-approval, so include it before Marketplace submission or drop the feature. Haiku costs $1/$5 per 1M tokens, billed to you.
14. **[manifest] The CLI minimum is 13.3.0** for `rovo:mcp`. The prompt-as-resource form needs 10.6.0 or later. The plan's `prompt: resource:agent-prompt;prompt.md` with `resources: [{ key: agent-prompt, path: prompts }]` matches the documented format.
15. **[minor] The MCP URL is confirmed.** Open question 3's URL `https://mcp.atlassian.com/forge/<appId>` is correct. Add `--transport http` to `claude mcp add` and run `/mcp` to start OAuth. Cursor uses `{"mcpServers":{"doc-drift":{"url":"..."}}}`.
16. **[minor] TWG registration is a UI flow.** Open question 8's 401 is the documented `UNIDENTIFIED_CALLER`. Register through TWG Labs Query Builder (UI) as an app contributor, not an admin token. A `404 NOT_FOUND` means persisted Cypher is not enabled for that environment.
17. **[minor] Keep tool descriptions short.** The plan's action descriptions are fine, but keep them to about 40 to 100 tokens. Atlassian signalled a possible enforced limit and a future separate human-facing description field.
18. **[minor] Credit numbers confirmed.** The figures (10 credits per basic agent run, $0.01 overage from 3 Dec 2026, no meter API) match the docs. Note that advanced agents with model selection are variable-priced, and the rate card is dated 31 Aug 2026.

## Update (2026-11-11, Forge MCP server check)

Source: the Forge MCP server `search-forge-docs`, reading https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-mcp/ and https://developer.atlassian.com/platform/forge/build-a-hello-world-rovo-mcp/ .

- **Correction: external exposure is per tool, not all-or-nothing.** The admin opens the app under Apps > Sites > site > Connected apps and, "Under **Tools**, turn[s] on the tools you want to expose to external clients". It is set per installation (per site). Verified. We still keep write and agent-only actions out of `rovo:mcp` `tools`, so they can never be exposed by mistake.
- **Manifest confirmed:** `rovo:mcp` takes `key`, `name` (30 chars max) and `tools` (action keys, each under 64 chars, at most 50). At most one per app. Verified.
- **Rovo Studio needs Rovo activated** on the site. External MCP clients connect at `https://mcp.atlassian.com/forge/<appId UUID>` with OAuth 2.1, limited to sites where the app is installed and exposure is enabled. Verified.
- **Claude Code setup (official example):** `claude mcp add --transport http doc-drift https://mcp.atlassian.com/forge/<appId>`, then `/mcp` to connect and complete OAuth. Verified.
- **Data access:** tools see only the data of the Atlassian app they're installed in, unless the app is multi-app compatible. Our Confluence-required, Jira-optional setup covers both. If products run different app versions, the tools come from the latest version. Verified.
- **Action payload context** includes `cloudId`, `moduleKey`, and (in Confluence) `confluence.contentId`, `spaceKey`, `spaceId`, `url`, `resourceType`. The docs suggest checking LLM-supplied IDs against this context. Verified.

- **Correction (live admin UI, 2026-11-11):** the admin page shows a single toggle, "Expose tools to MCP-compatible apps", under Details > Tools. It is all-or-nothing per app installation, despite the docs' per-tool wording. The toggle is visible even for a development-environment app that has not been shared.
