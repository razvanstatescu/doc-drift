# Forge platform reference: Bitbucket relay and Jira trigger

Checked 2026-11-11 against developer.atlassian.com and the Bitbucket and Jira OpenAPI specs. Each fact is tagged
**Verified** (with its source) or **Unverified** (spike it in week 1).

Sources used below:
- [BB-EV] https://developer.atlassian.com/platform/forge/events-reference/bitbucket/ (updated Oct 2, 2026)
- [BB-MOD] https://developer.atlassian.com/platform/forge/manifest-reference/modules/index-bitbucket/
- [BB-WS] https://developer.atlassian.com/platform/forge/manifest-reference/modules/bitbucket-workspace-settings-menu-page/
- [BB-API] Bitbucket OpenAPI spec https://dac-static.atlassian.com/cloud/bitbucket/swagger.v3.json (the spec behind https://developer.atlassian.com/cloud/bitbucket/rest/)
- [REQ-BB] https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestbitbucket/
- [BB-HELLO] https://developer.atlassian.com/platform/forge/build-a-hello-world-app-in-bitbucket/
- [DIST] https://developer.atlassian.com/platform/forge/distribute-your-apps/
- [PERMS] https://developer.atlassian.com/platform/forge/manifest-reference/permissions/
- [FETCH] https://developer.atlassian.com/platform/forge/runtime-reference/fetch-api.basic/
- [WT] https://developer.atlassian.com/platform/forge/manifest-reference/modules/web-trigger/
- [KVS] https://developer.atlassian.com/platform/forge/storage-reference/kvs-migration-from-legacy/
- [JIRA-EV] https://developer.atlassian.com/platform/forge/events-reference/jira/
- [TRIG] https://developer.atlassian.com/platform/forge/manifest-reference/modules/trigger/ (updated Oct 9, 2026)
- [FILTER] https://developer.atlassian.com/platform/forge/events-reference/product_events/#filter-out-atlassian-app-events
- [COMPAT] https://developer.atlassian.com/platform/forge/app-compatibility/ (updated Oct 30, 2026)
- [REQ-JIRA] https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestjira/
- [JIRA-API] Jira OpenAPI spec https://dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json

---

## Bitbucket

### 1. Events, payload of the merged event, scopes

**Event names (Verified, [BB-EV])**

| Group | Events | Scope |
|---|---|---|
| Repository | `avi:bitbucket:created:repository`, `avi:bitbucket:updated:repository`, `avi:bitbucket:push:repository`, `avi:bitbucket:deleted:repository`, `avi:bitbucket:created:build-status`, `avi:bitbucket:updated:build-status`, `avi:bitbucket:created:commit-comment` | `read:repository:bitbucket` |
| Pull request | `avi:bitbucket:created:pullrequest`, `avi:bitbucket:updated:pullrequest`, `avi:bitbucket:fulfilled:pullrequest` (merged), `avi:bitbucket:rejected:pullrequest` (declined), `avi:bitbucket:created:pullrequest-comment`, `avi:bitbucket:updated:pullrequest-comment`, `avi:bitbucket:deleted:pullrequest-comment`, `avi:bitbucket:resolved:pullrequest-comment`, `avi:bitbucket:reopened:pullrequest-comment`, `avi:bitbucket:updated:pullrequest-reviewer-status` | `read:pullrequest:bitbucket` |
| Deployment | `avi:bitbucket:pending:deployment`, `avi:bitbucket:started:deployment`, `avi:bitbucket:completed:deployment` | `read:pipeline:bitbucket` |

- Verified [BB-EV]: "An event with the name `avi:bitbucket:fulfilled:pullrequest` is sent when a pull request is merged. The required OAuth scope is `read:pullrequest:bitbucket`."
- Verified [BB-EV]: "In rare circumstances, Bitbucket event delivery can be significantly delayed." Check `timestamp`.
- Verified [BB-EV]: the app "must have permission from the workspace admin to access the data it provides within the event payload."
- Verified [TRIG]: trigger events "may take up to 3 minutes to reach your app".

**`avi:bitbucket:fulfilled:pullrequest` type reference (Verified, copied from [BB-EV])**

Top level: `eventType`, `timestamp` (ISO 8601), `selfGenerated`, `actor`, `repository`, `project`, `workspace`, `pullrequest`.

```ts
interface Actor { type: string; accountId: string; uuid: string; }
interface Repository { uuid: string; slug?: string; }
interface Project { uuid: string; }
interface Workspace { uuid: string; }
interface Hash { hash: string; }
interface Branch { branch: string; commit: Hash; }
interface Title { truncated: boolean; value: string; }
interface Author { type: string; accountId: string; uuid: string; displayName: string; }
interface PullRequest {
  id: number; state: string; source: Branch; destination: Branch;
  title?: Title; author?: Author; mergeCommit: Hash;
  updatedOn?: string; createdOn?: string; commentCount?: number; taskCount?: number;
}
```

Example (trimmed from [BB-EV]):

```json
{
  "actor": { "type": "user", "accountId": "5ffed...", "uuid": "{cc8e193d-...}" },
  "repository": { "uuid": "{15a31549-1cff-45dc-9d0d-310114c5038b}", "slug": "repository-slug" },
  "project": { "uuid": "{1860e69a-...}" },
  "workspace": { "uuid": "{4c16a397-8e48-479c-8ca2-442e46c90570}" },
  "pullrequest": {
    "id": 3, "state": "MERGED",
    "source": { "branch": "feature-x", "commit": { "hash": "cc2758d231fc" } },
    "destination": { "branch": "master", "commit": { "hash": "a37e0ad81173" } },
    "mergeCommit": { "hash": "71e4ecfcd2ba" },
    "title": { "truncated": false, "value": "PR title" },
    "author": { "accountId": "712020:...", "type": "user", "uuid": "{c0de...}", "displayName": "Jane Smith" },
    "commentCount": 2, "taskCount": 2
  },
  "eventType": "avi:bitbucket:fulfilled:pullrequest",
  "timestamp": "2026-03-23T06:03:12.361017Z"
}
```

What the payload does **not** contain (Verified by absence in the type reference, [BB-EV]):
- No workspace slug, no repository `name` or `full_name`, no PR description, no file list. `repository.slug` is optional.
- `title` is an object: read `pullrequest.title?.value`, not `pullrequest.title`.
- Hashes in the example are 12-character short hashes.
- UUIDs come wrapped in `{}`. [BB-WS] notes some Forge APIs (for example storage) do not accept `{}` and points to the `unwrapUuid`/`wrapUuid` helpers.

To get display names: `GET /2.0/repositories/{workspace}/{repo_slug}` returns `name`/`full_name` (scope `read:repository:bitbucket`). `GET /2.0/workspaces/{workspace}` returns the slug (scope `read:workspace:bitbucket`). Both Verified [BB-API]. `{repo_slug}` and `{workspace}` both accept `{uuid}` with braces (Verified, parameter docs in [BB-API]).

Push event (Verified, [BB-EV]): `push` is `CommitPush | TagPush`. `CommitPush` has `ref`, `mainbranch`, `before?`, `after?`, `created`, `closed`, `forced`, `truncated` and `commits[]` (`hash`, `message`, `date`, `author.user`). It is not needed for v1.

`selfGenerated` exists on every Bitbucket event (Verified, [BB-EV]). The `filter.expression` language applies to Bitbucket events as well as Jira events (Verified, [FILTER] lists "Bitbucket events").

### 2. Bitbucket UI modules

Verified [BB-MOD]: the full list of Bitbucket-only modules is `bitbucket:` custom merge check, Dynamic Pipelines provider, project settings menu page, repository code file viewer, code overview card, code overview action, code overview panel, pull request card, pull request action, pull request overview panel, repository main menu page, repository settings menu page, workspace global page, workspace personal settings page and **workspace settings menu page**.

- Verified [BB-WS]: the key is **`bitbucket:workspaceSettingsMenuPage`**, so the plan's guess is right. The module "adds an item in the Forge Apps section of the left navigation of Bitbucket workspace settings menu."
- Verified [BB-WS]: "You can use the UI Kit or Custom UI to create content for this page." Properties are `key`, `resource`, `render: native` (UI Kit), `resolver: { function }` or `{ endpoint }`, and `title` (required).
- Verified [BB-WS]: the URL is `/{workspaceSlug}/workspace/settings/forge/{forgeAppId}/{forgeEnvironmentKey}/{forgeAppModuleKey}`. The extension context has `workspace.uuid` (wrapped in `{}`) and `location`.
- Repository pages: `bitbucket:repoSettingsMenuPage` (repo settings, Forge Apps section) and `bitbucket:repoMainMenuPage` (repo left nav). Verified that the modules exist [BB-MOD]. The `repoMainMenuPage` key spelling is Unverified (it follows the naming pattern, see https://developer.atlassian.com/platform/forge/manifest-reference/modules/bitbucket-repository-main-menu-page).

Minimal YAML (property names from [BB-WS]):

```yaml
modules:
  bitbucket:workspaceSettingsMenuPage:
    - key: relay-settings
      title: Doc Drift relay
      resource: settings
      render: native
      resolver: { function: settings-resolver }
```

### 3. REST: diffstat, diff, pagination, auth context

**PR diffstat** (Verified [BB-API]):
- `GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diffstat` returns **302 only**: "Redirects to the repository diffstat with the revspec that corresponds to the pull request." Scope on the PR endpoint is `read:pullrequest:bitbucket`. The redirect target, `/repositories/{workspace}/{repo_slug}/diffstat/{spec}`, needs `read:repository:bitbucket`.
- Whether `requestBitbucket` follows the 302 and keeps the Authorization header is **Unverified**. No Forge doc covers it. A community report says auth headers were lost on the redirect for non-Forge clients (https://community.atlassian.com/t5/Bitbucket-questions/Diff-for-pull-request-using-bitbucket-api-v2-gives-403-forbidden/qaq-p/763086).
- Deterministic fallback (Verified endpoint, [BB-API]): `GET /2.0/repositories/{workspace}/{repo_slug}/diffstat/{spec}` with `spec` = `"<source>..<destination>"` and `topic=true`. "The first commit: the commit containing the changes we wish to preview. The second commit: the state to which we want to compare." This is the opposite of `git diff` order. `topic=true` gives the three-dot diff against the merge base, which is what the PR shows. In the REST PR object of a merged PR, `destination.commit.hash` is the pre-merge destination tip (the merge commit's first parent), and the PR redirect itself uses `<source>` and that hash with `topic=true`. Verified by a live call, see the validation update below. Whether the **event** payload carries the same pre-merge hash is still **Unverified**. Log it in the spike. A single-commit `spec` (`mergeCommit.hash`) diffs against the first parent (gave the same 11 files in the live test). That is right for merge commits and squash merges but wrong for fast-forward merges with more than one commit.
- Other parameters: `renames` ("true if omitted"), `ignore_whitespace`, `path` (repeatable), and `merge`, which is deprecated in favour of `topic`. Status `555` is returned "If generating the diffstat timed out."

**Diffstat response** (Verified, schemas `paginated_diffstats`, `diffstat`, `commit_file` in [BB-API]):

```json
{ "pagelen": 500, "page": 1, "size": 1, "next": "https://api.bitbucket.org/2.0/...",
  "values": [ { "type": "diffstat", "status": "modified", "lines_added": 2, "lines_removed": 1,
    "old": { "path": "setup.py", "escaped_path": "setup.py", "type": "commit_file" },
    "new": { "path": "setup.py", "escaped_path": "setup.py", "type": "commit_file" } } ] }
```

- `status` enum: `added`, `removed`, `modified`, `renamed`. For `added`, `old` is null. For `removed`, `new` is null. That nullability is Unverified, so code defensively.
- `commit_file.attributes` enum: `link`, `executable`, `subrepository`, `binary`, `lfs`. Use it to skip binary and LFS files.
- **`pagelen`: "The default value is 500 with 5000 being the maximum allowed value"** for diffstats. That differs from the generic 10/100 rule used by other collections. `next` is "Link to the next page if it exists… refrain from constructing your own URLs." It is an absolute URL. `size` and `page` are optional.
- A known community report says Bitbucket Cloud diffstat sometimes shows renames as remove plus add (https://bitbucket.org/atlassianlabs/atlascode/issues/286). Unverified for the current API.

**Raw diff** (Verified [BB-API]): `GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{id}/diff` also returns **302** to `/repositories/{workspace}/{repo_slug}/diff/{spec}`. The response is `text/plain`, "not decoded into unicode", with no pagination, and returns `555` when the diff is too large. Parameters: `context`, `path` (repeatable), `ignore_whitespace`, `binary`, `renames`, `topic`. Fetch a diff for only the anchored paths with `?path=a&path=b` instead of the whole PR.

**`requestBitbucket` and `next` URLs** (Verified [REQ-BB]):

```ts
import api, { route, routeFromAbsolute } from '@forge/api';
const first = await api.asApp().requestBitbucket(route`/2.0/repositories/${workspaceId}/${repoId}/src`);
// next page: next is absolute
await api.asApp().requestBitbucket(routeFromAbsolute(`${firstPage.next}`));
```

- The "path must be constructed using the `route` or `routeFromAbsolute` tagged template function." Do not pass a raw string. `assumeTrustedRoute` exists but is discouraged.
- `requestBitbucket` "expects workspaceId (not workspace slug)". In triggers, `context.workspaceId` is also available (Verified, https://developer.atlassian.com/platform/forge/function-reference/arguments/).
- `asApp()` "use the app user… works regardless of who uses the app". `asUser()` "is only available in modules that support the UI kit". So in a trigger handler use **`asApp()`**. `asUser(accountId)` needs offline impersonation scopes and is not needed here.
- Whether `route` accepts an interpolated `..` range inside the path segment (`${src}..${dst}`) is **Unverified**: the runtime "checks for possible path manipulation attempts". Test it. If it fails, try two interpolations with a literal `..`.

### 4. Installation constraints

- Verified [BB-HELLO]: "Forge apps are not supported on personal workspaces. If you install an app to a personal workspace, you will get an insufficient permissions error." You need "a shared Bitbucket team workspace". "A free Bitbucket team space can have up to 5 users." None of the Forge docs read here require a paid Bitbucket plan for events, REST or UI modules. The plan's claim that required merge checks are Premium-only was not re-checked, and Doc Drift does not use them.
- Verified [BB-HELLO]: `forge install`, then choose Bitbucket and enter `https://bitbucket.org/<workspace>/`. "Forge apps can't be viewed by anonymous users."
- Verified [DIST]: non-contributors can only install when the distribution status is **Sharing** (or Sharing within organization). Deploy to production, then go to Developer console → Distribution → Edit → Sharing, and copy the installation link. The installer must be an admin. "Apps that already have a license in the app manifest or have been submitted for listing on Marketplace can't be shared via installation link."
- Judges therefore need: (a) a Confluence site (plus Jira for the optional part) and the core app's install link, and (b) a Bitbucket **team** workspace where they are admin, plus the relay's install link. Two links and two consents. A demo workspace that you pre-install and invite judges to avoids (b). That is a suggestion, not a doc fact.
- Unverified: Global Apps (EAP) "Confluence, Jira and Bitbucket connections will be supported in EAP" [COMPAT]. That could make a single app possible later. Do not build on an EAP for Codegeist.

### 5. Egress from the relay to the core web trigger

- Verified [PERMS]: `permissions.external.fetch.backend` "declares which external domains your Forge functions can talk to". It accepts a string, `*.domain` wildcard (which "does not include the parent domain"), or `{ address, category, inScopeEUD }`.
- Verified [WT]: web trigger host formats:
  - `urlFormat: v1` (the default): `https://<uuid>.hello.atlassian-dev.net/x1/<id>`
  - `urlFormat: v2` ("Use v2 for new web triggers"): `https://<uuid>.webtrigger.atlassian.app/public/<id>`
- The URL is "stable for each combination of module key, app, site, Atlassian app, Forge environment", and dev differs from prod (Verified, https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger-api/). The relay therefore needs the URL configured per workspace (the settings page), and the core app shows its own URL via `webTrigger.getUrl('ingest-change')`.
- Verified [WT]: web triggers are unauthenticated and have no Atlassian user, so "asUser API calls will not work in web trigger functions". HMAC in the handler is correct. An RFC for platform-HMAC web triggers exists (RFC-141) and is not shipped.
- Verified [WT]: a `dynamic` web trigger counts as egress (a major version), while a `static` one with `outputs` keeps Runs on Atlassian eligibility. The core ingest only needs 202/401, so `type: static` fits.
- Fetch API, Verified [FETCH]: `import { fetch } from '@forge/api'; await fetch(url, options)` (undici). `api.fetch` on the default export works in practice, but the docs show the named import. Unverified.
- Storage, Verified [KVS]: the `storage` export of `@forge/api` stopped receiving updates on March 17, 2025. "If you're building a new app, use the `@forge/kvs` package from the start." Use `kvs.setSecret`/`kvs.getSecret`, with scope `storage:app`.

```yaml
permissions:
  scopes: [read:pullrequest:bitbucket, read:repository:bitbucket, storage:app]
  external:
    fetch:
      backend:
        - '*.webtrigger.atlassian.app'   # v2 web trigger URLs
        - '*.hello.atlassian-dev.net'    # v1 web trigger URLs (default format)
```

---

## Jira

### 6. `avi:jira:updated:issue` payload

Verified [JIRA-EV]:
- Issue events: `avi:jira:created:issue`, `avi:jira:updated:issue`, `avi:jira:deleted:issue`, `avi:jira:assigned:issue`, `avi:jira:viewed:issue`, `avi:jira:mentioned:issue`. All need `read:jira-work`. Related events are `avi:jira:created|deleted:issuelink` and `avi:jira:commented:issue`.
- `avi:jira:deleted:issue`: "Keep in mind that cascading events aren't emitted." Use it to close anchors on deleted issues.
- Common fields: `timestamp` (epoch ms), `webhookTraceValue?`. Updated-issue fields: `eventType`, `selfGenerated`, `customFields?`, `customFieldsStatus?` (`INCLUDED`/`OMITTED`), `skippedCustomFieldIds?`, `jiraEventTypeName?` (for example `issue_resolved`, `issue_moved`, `issue_generic`), `issue`, `atlassianId?`, `changelog`, `associatedUsers?`, `associatedStatuses?`.
- Type reference:

```ts
interface Changelog { items: Change[]; }       // example payloads also carry changelog.id
interface Change {
  field: string; fieldId: string;
  from: string | null; fromString: string | null;
  to: string | null;   toString: string | null;
}
interface Status { self: string; name: string; id: string; statusCategory: StatusCategory; }
interface StatusCategory { self: string; id: number; key: string; colorName: string; name: string; }
// issue.fields is typed as { summary; status; priority?; issuetype } (the example also has parent, project, creator, reporter, assignee)
```

- "For the following fields, the item also contains human-readable labels in `fromString` and `toString`: status, resolution, priority, description, issuetype, versions, fixVersions, components, duedate, timeoriginalestimate, IssueParentAssociation, project. For all other fields, `fromString` and `toString` are null when the corresponding from or to value is present." This matches plan §5.
- The doc example for a **description** change shows `from`, `fromString`, `to` and `toString` all `null`. You learn *that* the description changed, not what it changed to. Example for issuetype: `{"field":"issuetype","fieldId":"issuetype","from":"10006","fromString":"Bug","to":"10004","toString":"Story"}`.
- `associatedStatuses` ("current and previous statuses", each with `statusCategory`) is present on status changes. Together with `issue.fields.status.statusCategory.key` in the payload, the "moved to Done" check needs **no REST call**.
- `issue.fields` in the event does not include `fixVersions` or `components` per the type reference. Read them from REST, or use the changelog strings.
- Unverified: exact `field`/`fieldId` values for parent changes (`IssueParentAssociation` vs `parent`) and for summary (raw value in `from`/`to` or `fromString`). Some actions (linking, logging work) reportedly don't fire `updated:issue` (community, https://community.developer.atlassian.com/t/product-event-aviupdated-issue-doesnt-fire-on-comment-changes/43924/3). Log real payloads in spike 5.

### 7. Trigger `filter`

Verified [TRIG]: `filter` properties. At least one of `appIsLicensed`, `ignoreSelf` or `expression` is required.
- `appIsLicensed: true` skips sites without an active licence. Leave it unset for Codegeist: `license` is undefined for free, dev and staging apps.
- `ignoreSelf: true` drops self-generated events.
- `expression` is a string.
- `onError` (only with `expression`) is one of `IGNORE_AND_LOG` (default), `IGNORE`, `RECEIVE_AND_LOG` or `RECEIVE`.
- Also new: `payload.include.propertyPaths` (entity property enrichment, Preview).

```yaml
trigger:
  - key: issue-updated-trigger-with-ignore-self-and-expression
    function: main
    events: [avi:jira:updated:issue]
    filter:
      appIsLicensed: true
      ignoreSelf: true
      expression: event.issue.fields?.issueType.name == 'Bug'
      onError: RECEIVE_AND_LOG
```

Verified [FILTER]:
- The language is a subset of Jira expressions: member access, optional chaining, indexed access, arrow functions, list literals, conditionals, `try/catch` and others. `event` is a Map.
- The expression must evaluate to Boolean. "Any other evaluation outcome will be considered an error and result in the event being filtered out. This includes… accessing object properties that aren't defined." Errors are logged only in the developer console, not in the tunnel.
- Limits: 10,000 characters and 50,000 steps. The CLI complexity analysis allows "up to 3 inferred variables" and similar, and **deploy fails** if the expression is too complex.
- There is no access to extra context or dynamic data loading.
- Entity properties (Preview): `event.runtime.issue.properties['key'].field` in expressions. Properties must resolve to primitives. A wrong path passes validation but becomes `null` at runtime.
- The doc example uses `issueType`, but the payload key is `issuetype`. Use the payload's casing (Unverified which one the evaluator accepts).

Known problems (community, Unverified by Atlassian):
- `event.changelog.items.some(item => item.toString.includes('x'))` failed deploy with `COMPLEXITY: Expression is too complex`, read as items × string length (Feb 2026, https://community.developer.atlassian.com/t/forge-issue-updated-trigger-filter-expression-is-not-useful/99236). Avoid string methods inside list callbacks.
- A trigger using `event.changelog.items.filter(i => i.field == "status" && i.to == "10319").length > 0 && ...` stopped firing around April 20, 2026, with no answer in the thread (https://community.developer.atlassian.com/t/forge-trigger-aviupdated-issue-stopped-firing-since-april-20th-despite-matching-filter-conditions/100460).
- Ship with `onError: RECEIVE_AND_LOG` and re-check in the handler.

Suggested filter (to test, Unverified):

```yaml
filter:
  ignoreSelf: true
  expression: >-
    event.changelog?.items?.some(i => ['status','resolution','fixVersions','components',
    'description','summary','IssueParentAssociation','parent'].includes(i.fieldId) ||
    i.field == 'IssueParentAssociation') == true
  onError: RECEIVE_AND_LOG
```

### 8. Jira as an optional app inside a Confluence-required app

Verified [COMPAT]:
- `app.compatibility: { confluence: { required: true }, jira: { required: false } }` is the documented example.
- "One Atlassian app where the app must be deployed and installed in before it can be connected to other Atlassian apps." Install with `forge install -p confluence` first, then `forge install -p jira` (from https://developer.atlassian.com/platform/forge/add-support-for-jira-as-an-optional-atlassian-app/).
- "Currently multiple-app compatible Forge apps are restricted to a single site." The installation ID is shared, and storage lives with the required app's location. Uninstalling from the required app removes the app from the optional apps too.
- **"They can only be listed on Marketplace as paid apps; free listings are not supported."**
- Adding an optional app together with new scopes for it is a major version (https://developer.atlassian.com/platform/forge/migrating-a-forge-app-to-support-multiple-atlassian-apps/).
- Calling Jira from the backend works the same way (Verified [REQ-JIRA]): `api.asApp().requestJira(route\`/rest/api/3/issue/${key}\`)`. In the trigger, use `asApp()`. Use `asUser(accountId)` only with `allowImpersonation: true` on the scope ([FILTER] page, "Atlassian app events").
- Unverified: behaviour when Jira is not connected. Expected: the `avi:jira:*` trigger simply never fires, and `requestJira` fails with 401/403/404. Guard every Jira call and hide Jira anchor UI unless `context.installation.contexts` shows a Jira context (field Verified in the function arguments doc; how to tell Jira from Confluence in it is Unverified).

### 9. Jira REST needed

Verified [JIRA-API]:
- Get issue: `GET /rest/api/3/issue/{issueIdOrKey}?fields=status,fixVersions,components,parent,summary,resolution` (scope `read:jira-work`). The status category is in `fields.status.statusCategory` (`id`, `key`, `name`, `colorName`). The `key` values in practice are `new`, `indeterminate`, `done` (and `undefined`). The schema has no enum, so treat this as Unverified. `expand=changelog` is also available.
- **`GET/POST /rest/api/3/search` is deprecated** ("Currently being removed", CHANGE-2046: https://developer.atlassian.com/changelog/#CHANGE-2046). Use **`GET/POST /rest/api/3/search/jql`**. It paginates with `nextPageToken` (no `startAt`; the token "will expire in 7 days"; the response has `isLast`). The default `maxResults` is 50. `fields` defaults to **`id` only**, so always pass `fields=`. `reconcileIssues` gives read-after-write consistency. A count is available at `POST /rest/api/3/search/approximate-count`.
- Example: `route\`/rest/api/3/search/jql?jql=${'key in (ABC-1,ABC-2)'}&fields=status,fixVersions,components,parent\``.

Added 2026-11-12 for D35 (scopes from the Forge MCP `get-api-required-scopes`, Atlassian OpenAPI spec; behaviour verified live on one-atlas-jzzf):
- Create issue: `POST /rest/api/3/issue` needs **`write:jira-work`** (classic). Body `{fields:{project:{key}, issuetype:{id}, summary, description: <ADF doc>}}`; returns `{id, key, self}`. Verified live: CX-11 created asUser from the review panel.
- Issue types for a project: `GET /rest/api/3/issue/createmeta/{projectIdOrKey}/issuetypes` (`read:jira-work`). The response lists types under `issueTypes` (older) or `values`; read both. A Jira Product Discovery project's only standard type is **Idea** (live), so leave `projectTypeKey: 'product_discovery'` projects out of a "create task" list.
- Projects the user can create in: `GET /rest/api/3/project/search?action=create&orderBy=name&maxResults=50` (`read:jira-work`); each value has `key`, `name`, `projectTypeKey`; paginate with `startAt` and `isLast`.
- After a scope change (major version) and `forge install --upgrade`, asUser calls from Rovo/MCP return a consent error until the user opens any of the app's UI once (observed live 2026-11-12, core 5.0.0); the UI renewed the consent without a prompt.
- Native Confluence "Verified" status: **no public write API** (Unverified that one will appear). Teamwork Graph's `ConfluencePage` has a read-only `isVerified`. Content states (`GET/PUT/DELETE /wiki/rest/api/content/{id}/state`, `write:confluence-content`) are a different feature, and **PUT publishes a new page version** (spec text: "creates a new version ... of the content with the new state").

---

## Differences from plan.md

**Relay manifest (§14)**
1. The egress host is incomplete. `*.atlassian-dev.net` matches v1 URLs (`<uuid>.hello.atlassian-dev.net`, because wildcards cover nested subdomains), but v2 URLs are `<uuid>.webtrigger.atlassian.app`, which needs `*.webtrigger.atlassian.app`. Pick one format and declare it. The core `webtrigger` should set `urlFormat: v2` and probably `response: { type: static, outputs: [...] }` (202/401) to keep Runs on Atlassian eligibility.
2. The settings module key `bitbucket:workspaceSettingsMenuPage` is confirmed and supports UI Kit. Add it with a resolver function and resource.
3. Scopes: `read:pullrequest:bitbucket` + `read:repository:bitbucket` + `storage:app` are right. Add `read:workspace:bitbucket` only if you resolve the workspace slug.

**Relay handler (§15)**
4. `event.repository.name` and `full_name` don't exist. Use `repository.uuid` plus optional `slug`, or GET the repository.
5. `event.pullrequest.title` is `{ truncated, value }`, so use `.title?.value`.
6. `routeFromAbsolute` must be imported from `@forge/api`. It's used as `routeFromAbsolute(\`${j.next}\`)`, which matches the sketch's intent.
7. The PR `/diffstat` and `/diff` endpoints are 302 redirects only. Redirect handling through `requestBitbucket` is unverified. Plan a fallback to `/diffstat/{src}..{dst}?topic=true` and `/diff/{spec}`, which need `read:repository:bitbucket`.
8. Diffstat `pagelen` defaults to 500 (max 5000), not a 100 cap. One request with `pagelen=500` covers the plan's 300-file rule. The "5 pages × 100" loop is unnecessary.
9. `storage.getSecret` (`@forge/api`) is legacy. Use `@forge/kvs` `kvs.getSecret`.
10. Use `import { fetch } from '@forge/api'` (documented) instead of `api.fetch`.
11. Ignore merges to non-default branches. The payload has `destination.branch` but no "is default branch" flag, so GET the repository (`?fields=mainbranch.name`) and cache it. A trigger expression cannot do this lookup (no dynamic data loading). See the validation update below.
12. Handle `555` (diff or diffstat timed out) as diffstat-only, and skip `binary`/`lfs` files. The raw diff is undecoded bytes, so slicing to 150,000 characters can split a UTF-8 sequence.

**Bitbucket facts (§5)**
13. The personal-workspace ban is confirmed, and a free team workspace (≤5 users) is enough. The event list has more events than the plan's four (rejected, comments, reviewer status, deployments).

**Jira (§5, §10, §14)**
14. The plan's filter `event.changelog != null && ...` works, but filters nothing useful. Filter on `fieldId` in the expression and keep it simple: string methods inside list callbacks fail deploy on complexity. Add `ignoreSelf: true` and `onError: RECEIVE_AND_LOG`.
15. A description change reports all-null `from`/`to`/`fromString`/`toString`. The rule "description (0.5)" only knows the description changed, so fetch the issue for content.
16. "Won't Do" is a status (or resolution), not a status category. The categories are `new`/`indeterminate`/`done`. Match `statusCategory.key == 'done'` plus `resolution`/status name. `associatedStatuses` and `issue.fields.status.statusCategory` arrive in the payload.
17. `fixVersions` and `components` are not in `issue.fields` of the event. Use the changelog strings or `GET /rest/api/3/issue/{key}?fields=...`.
18. JQL search must use `/rest/api/3/search/jql` (with `nextPageToken`, and `fields` defaults to `id`). The old `/search` is being removed.
19. Add `avi:jira:deleted:issue` to the trigger to resolve anchors on deleted issues.
20. Option (Preview): set an issue entity property on anchored issues and filter with `event.runtime.issue.properties['dds'].anchored == true`. Unanchored issue updates then never invoke the function. It needs `write:jira-work` to set the property.
21. Multi-app (Confluence required, Jira optional) can only be listed on Marketplace as **paid**, which matches §18 item 9. Install into Confluence first, then connect Jira. Guard all Jira calls for sites without Jira.
22. Expect up to 3 minutes of event latency (Jira and Bitbucket triggers). Plan the demo timing around it.

---

## Update (2026-11-11, validation pass)

### Q3. Does `requestBitbucket` follow the PR `/diffstat` and `/diff` 302?
- **Still open.** No Forge doc, forum post or public repo shows `requestBitbucket` with the PR diffstat or diff endpoint. `@forge/api@8.5.0` passes the request to the runtime (`global.__forge_fetch__`) and only exposes a `redirect?: RequestRedirect` option on `RequestInit`. So redirect handling happens in the Forge proxy and cannot be read from the SDK. Verified (package source).
- **The redirect, observed live** (public repo, unauthenticated, 2026-11-11):
  `GET /2.0/repositories/atlassian/atlassian-connect-express/pullrequests/591/diffstat` returns `302` with
  `Location: https://api.bitbucket.org/2.0/repositories/atlassian/atlassian-connect-express/diffstat/atlassian/atlassian-connect-express:981b4fe348a3%0D44e8dba15928?from_pullrequest_id=591&topic=true`.
  `/diff` redirects the same way to `/diff/...`. The target is the same host, so a standard fetch would keep auth. The spec is `<src workspace>/<src repo>:<source hash>%0D<destination hash>` (a CR separator, which supports fork PRs). Verified (live call; same format reported in https://github.com/pingdotgg/t3code/issues/29281, Nov 2026).
- **Equivalence, Verified by live call:** for that PR, these three return the same 11 files: the redirect target, `/diffstat/981b4fe348a3..44e8dba15928?topic=true`, and `/diffstat/a50685cd9829` (the merge commit). The REST PR object gives `source.commit.hash` = `981b4fe348a3`, `destination.commit.hash` = `44e8dba15928` (the merge commit's first parent, so the pre-merge tip) and `merge_commit.hash` = `a50685cd9829`.
- **Recommended path:**
  1. Build the spec yourself and skip the redirect: `route\`/2.0/repositories/${workspaceUuid}/${repoUuid}/diffstat/${src}..${dst}\`` with `topic=true` and `pagelen=500`. Same for `/diff/${src}..${dst}?topic=true&path=...`. Scope `read:repository:bitbucket`. Take `src` and `dst` from the event's `pullrequest.source.commit.hash` and `destination.commit.hash`.
  2. **Guard:** if the event's `dst` turns out to be the post-merge tip, the three-dot diff is empty (merge base = source). On an empty result, re-read `GET /2.0/repositories/{ws}/{repo}/pullrequests/{id}` (`read:pullrequest:bitbucket`) for the hashes, or fall back to `/diffstat/${mergeCommit}` (wrong only for multi-commit fast-forward merges).
  3. Optional spike: call the PR endpoint with `redirect: 'manual'`, read `Location`, and call `routeFromAbsolute(location)`. **Unverified** whether the `%0D` in the path passes the route path-manipulation check. The `..` form avoids the question. Whether `route` accepts `${src}..${dst}` is itself still **Unverified**.

### Q5. Default branch of a repository
- `GET /2.0/repositories/{workspace}/{repo_slug}` returns `mainbranch` (schema `branch`: `{ type: "branch", name, merge_strategies, default_merge_strategy, ... }`). Scope `read:repository:bitbucket`, auth types include `forge-oauth2`. Verified [BB-API].
- Partial response works: `?fields=mainbranch.name` (live test returned `{"mainbranch": {"name": "master", "type": "branch"}}`). Verified (live call on `atlassian/atlassian-connect-express`, 2026-11-11).
- Forge call: `api.asApp().requestBitbucket(route\`/2.0/repositories/${event.workspace.uuid}/${event.repository.uuid}?fields=mainbranch.name\`)`, then compare with `event.pullrequest.destination.branch`. Both path params accept `{uuid}` with braces. Verified [BB-API], [REQ-BB].
- Cache per repo in KVS. `avi:bitbucket:push:repository` carries `push.mainbranch: boolean` per pushed ref, and `avi:bitbucket:updated:repository` carries a `changes` object. Verified [BB-EV]. Whether `changes` includes a `mainbranch` entry when the default branch is renamed is **Unverified**, so give the cache a TTL (for example 1 hour).
- A trigger filter expression cannot look this up ("no access to extra context or dynamic data loading", [FILTER]). Do it in the handler.

## Update (2026-11-11, live check on nano-soft-dev/payments-api)

- `GET /2.0/repositories/{ws}/{repo}/diffstat/{src}..{dst}?topic=true` with commit hashes returned, for a file moved and edited via the `/src` API: `status: "renamed"`, `old.path: scripts/rollback.sh`, `new.path: scripts/rollback-v2.sh`, `lines_added: 3`, `lines_removed: 3`. A one-line edit returned `status: "modified"`. Default `pagelen` 500, `next` null. Verified (live).
- `GET /2.0/repositories/{ws}/{repo}?fields=mainbranch.name` returned `{"mainbranch":{"name":"main"}}`. Verified (live).
- Repo creation through the API failed with "You can't create repositories under this project" for a token without project scopes. Create repos in the UI, or use a token with project scopes.
- The `/src` endpoint (multipart form, `write:repository`) is enough to seed files, create branches (`branch` + `parents`) and delete files (`files` field) without git credentials.

## Update (2026-11-12, phase 2)

- **PR author account.** `avi:bitbucket:fulfilled:pullrequest` carries `pullrequest.author.accountId` (an Atlassian account ID, e.g. `712020:f44b...`) next to `displayName`. The relay (2.2.0) forwards it as `authorAccountId`; the core mentions the author in the drift comment only when `GET /wiki/rest/api/user?accountId=` resolves it on the site (R-6). Verified: https://developer.atlassian.com/platform/forge/events-reference/bitbucket/ (via the Forge MCP). A real merge has not been relayed since.
