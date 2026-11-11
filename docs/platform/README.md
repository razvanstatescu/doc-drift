# Platform reference (Forge, verified 2026-11-11)

These files record what the current Atlassian docs say, with every fact marked **Verified** (with a source URL) or **Unverified**. Each ends with a "Differences from plan.md" section. Research agents wrote them from the docs; a real site has not confirmed them yet. The week-1 spikes ([hackathon/risks-and-spikes.md](../hackathon/risks-and-spikes.md)) do that.

| File | Covers |
| --- | --- |
| [forge-platform.md](forge-platform.md) | Runtime and packages, web triggers, queues, scheduled triggers, storage (KVS, secrets, entities, Forge SQL), egress, limits, environments, distribution, multi-app |
| [forge-confluence.md](forge-confluence.md) | Byline item and `contentPropertyKey`, other Confluence modules, UI Kit, REST v2/v1 paths, scopes, Confluence events |
| [forge-rovo-mcp.md](forge-rovo-mcp.md) | `rovo:agent`, `action`, `rovo:skill`, `rovo:mcp` and external MCP, Forge LLMs, Rovo credits, Teamwork Graph |
| [forge-bitbucket-jira.md](forge-bitbucket-jira.md) | Bitbucket events, payloads, workspace settings module, diffstat/diff REST, Jira update event, trigger filters, Jira REST |
| [../hackathon/codegeist-rules.md](../hackathon/codegeist-rules.md) | Codegeist dates, requirements, judging, prizes, Runs on Atlassian, Marketplace, partner brand rules |

When a doc fact and a spike result disagree, the spike wins. Update the file and log a decision in [decisions.md](../decisions.md).

## Manifest and code corrections to the plan-v1 sketches

Apply these when writing the real manifests. The sketches are in [source/plan-v1.md](../source/plan-v1.md) §14 and §15.

### Core app
- [ ] **Scopes:** `write:page:confluence` is required (content-property writes), not optional. Drop `read:confluence-props`/`write:confluence-props` (REST v2 does not use them). Add `search:confluence` (CQL) and `read:confluence-content.summary` (Confluence events), plus label scopes if labels are written. Keep the scope list short: a very long granular list can break web trigger URL creation ("Request Entity Too Large").
- [ ] **Web trigger:** `urlFormat: v2`, `response: { type: static }` with outputs for 202/400/401. The handler returns an output key.
- [ ] **Queues:** push record IDs, not diffs (100 KB per event when `timeoutSeconds` > 55). Consumers must be idempotent.
- [ ] **Forge SQL:** `sql: [{ key: main, engine: mysql }]` plus a migration consumer on `avi:forge:installed:app` / `avi:forge:upgraded:app` (`timeoutSeconds: 900`). Ship from day 1.
- [ ] **`confluence:spacePage`** needs a `route`, or deploy fails.
- [ ] **`confluence:globalSettings`:** add `useAsConfig: true`.
- [ ] **Byline:** the backend writes a flat `{title, icon, tooltip}` of strings under `contentPropertyKey`. `icon` is a path relative to a declared resource (or an absolute URL), so ship 4 state SVGs in the byline resource. A `data:` URI is the fallback. Put the state word in the title too. Use the UUID-like key: duplicate keys on a page stop updates. S2 tests whether Confluence reads the raw key or the hook's `forge-<localId>-<key>` form.
- [ ] **Permission checks:** `asUser()` `GET /wiki/api/v2/pages/{id}/operations`, never v1 `/permission/check`. Restricted pages are unsupported (D20). No `asApp()` fallback in MCP tools (D21). Add `confluence:backgroundScript` only if live refresh via `updateBylineProperties` matters.
- [ ] **Optional:** a `confluence:contentProperty` index (`dds_state`, no hyphens) for CQL-queryable state.
- [ ] **Confluence triggers:** `avi:confluence:updated:page` (filter out `selfGenerated`) and page trashed/deleted.
- [ ] **Jira trigger:** filter on changelog `fieldId` (complex expressions fail at deploy), `ignoreSelf: true`, `onError: RECEIVE_AND_LOG`. Also subscribe to `avi:jira:deleted:issue`. Fetch the issue for `fixVersions`, `components` and description. JQL uses `/rest/api/3/search/jql` (with explicit `fields`), not `/search`.
- [ ] **`rovo:skill`:** only `key`, `source.dir`, `dependencies.tools`. Name and description go in the SKILL.md frontmatter; `name` must equal the folder name.
- [ ] **`rovo:mcp`:** Forge CLI 13.3.0 or later. Expose only the read tools.
- [ ] **Actions:** `limit` is `integer`. MCP handlers fall back to `asApp()` with an explicit permission check.
- [ ] **Major-version traps:** adding `sql`, `llm` (Forge LLMs, now GA) or Teamwork Graph scopes after install forces a major version, which judges' admins must re-approve. Decide by Dec 1, before the production share links go out.
- [ ] **No `app.licensing`** in either manifest. It disables share links (D19). One app ID per app.
- [ ] Runtime `nodejs24.x` and scheduled `interval: hour` are valid.

### Bitbucket relay
- [ ] **Egress:** `*.webtrigger.atlassian.app` (v2 web trigger host), not `*.atlassian-dev.net`.
- [ ] **Settings module:** `bitbucket:workspaceSettingsMenuPage` (confirmed, UI Kit supported).
- [ ] **Payload:** `repository` has `uuid` and optional `slug` only, with no `name`/`full_name`. The title is `pullrequest.title.value`. There is no default-branch flag, so look it up.
- [ ] **Diffstat/diff:** the PR endpoints return 302, and whether `requestBitbucket` follows the redirect is unverified. Build `/diffstat/{src}..{dst}?topic=true` (and the matching `/diff`) yourself. A live check confirmed it returns the same files. Treat an empty result as an error.
- [ ] **Default branch:** `GET /2.0/repositories/{ws}/{repo}?fields=mainbranch.name`, cached, to ignore merges to non-default branches. `pagelen` defaults to 500 (max 5000), so the 5×100 loop is unnecessary. Handle status 555.
- [ ] **Imports:** `routeFromAbsolute` and `fetch` from `@forge/api`. Use `@forge/kvs` (including `kvs.setSecret`) instead of the legacy `storage`.
- [ ] The core web trigger URL is per product context and environment, so it is configurable in the relay settings.
