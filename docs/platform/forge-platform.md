# Forge platform reference (verified 2026-11-11)

Scope: what Doc Drift Sentinel needs from the Forge platform. There are two apps: **core**, which requires Confluence and treats Jira as optional, and **bitbucket-relay**, a Bitbucket app that POSTs to the core app's web trigger.

Legend: **Verified** means read on the cited page today. **Unverified** means not stated in the docs, or inferred.

---

## 1. Runtime and packages

- `app.runtime.name` accepts `nodejs24.x` ("(recommended)"), `nodejs22.x` and `nodejs20.x`. **`nodejs24.x` is valid and recommended.** Verified: https://developer.atlassian.com/platform/forge/manifest-reference/
- Node.js 20 reached end of life on 2026-04-30. `nodejs20.x` is still available, but the docs recommend 22 or 24. Verified: https://developer.atlassian.com/platform/forge/function-reference/nodejs-runtime/
- Changing `runtime.name` alone does not trigger a major version, so deploying to production auto-upgrades all sites. Verified: https://developer.atlassian.com/platform/forge/runtime-reference/
- Other `app.runtime` fields: `architecture` (`arm64` | `x86_64`, default `x86_64`) and `memoryMB` (default 512, range 128–1024, which functions can override). Verified: manifest reference above.
  ```yaml
  app:
    runtime:
      name: nodejs24.x
      memoryMB: 512        # optional
      architecture: arm64  # optional
  ```
- Bundling: the default is Webpack via the CLI. `app.package.bundler: manual@2026` (Preview) with `app.package.path` lets you ship precompiled code. `app.package.extraFiles` adds non-code files. Verified: manifest reference.
- TypeScript: handler types come from `import type { WebTriggerRequest, WebTriggerContext, WebTriggerResponse } from "@forge/api"`. Verified: https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/. TS sources bundle out of the box (templates ship `.ts`/`.tsx`). The docs do not state ESM (`"type":"module"`) support. Community posts report CLI friction with ESM packages. **Unverified.** Plan to use TS compiled by the default bundler, without `"type":"module"`.
- CLI Node requirement: from 2026-10-26 the CLI needs Node **22.23.4, 24.22.1, 26.12.1 or newer**. Verified: https://developer.atlassian.com/platform/forge/changelog/
- Latest npm versions (registry, 2026-11-11). Verified with `registry.npmjs.org`:

  | package | latest | published |
  |---|---|---|
  | @forge/cli | 15.1.0 | 2026-11-09 |
  | @forge/api | 8.5.0 | 2026-11-09 |
  | @forge/events | 3.0.10 | 2026-11-09 |
  | @forge/kvs | 2.1.2 | 2026-11-09 |
  | @forge/sql | 4.0.10 | 2026-11-09 |
  | @forge/react | 12.5.0 | 2026-11-09 |
  | @forge/bridge | 7.3.0 | 2026-11-09 |
  | @forge/resolver | 2.0.2 | 2026-10-26 |
  | @forge/confluence-bridge | 4.0.0 | 2026-06-22 |

## 2. Web triggers

**Manifest** (Verified: https://developer.atlassian.com/platform/forge/manifest-reference/modules/web-trigger/)
- Fields:
  - `key`
  - `function` (or `endpoint` for Forge Remote)
  - `urlFormat`: `v1` (default) or `v2`. The docs say "Use `v2` for new web triggers".
  - `response.type`: `static` or `dynamic`. The default is **dynamic**.
  - `response.outputs[]` (required when static), each with `key`, `statusCode`, optional `contentType` and optional `body`.
- Copied example (static, v2):
  ```yaml
  modules:
    webtrigger:
      - key: no-egress-web-trigger
        function: no-egress-function
        urlFormat: v2
        response:
          type: static
          outputs:
            - key: status-ok
              statusCode: 200
              contentType: application/json
              body: '{"body": "Allowed static response"}'
            - key: status-error
              statusCode: 403
              contentType: text/plain
              body: 'Error: Forbidden'
  ```
  A static handler returns `{ outputKey: "status-ok" }`. A dynamic handler returns `{ statusCode, headers: { "Content-Type": ["application/json"] }, body }`.
- **Static vs dynamic and Runs on Atlassian:** "only `static` web triggers are eligible for the Runs on Atlassian program". Dynamic triggers "are not eligible". Adding the first dynamic trigger "is considered as egress and will become a major version update". Verified: same page and https://developer.atlassian.com/platform/forge/runs-on-atlassian-apps/
- Switching `urlFormat` changes the URL. Old URLs keep working. Verified.

**URL host patterns** (Verified, from the manifest page examples)
- v1: `https://<uuid>.hello.atlassian-dev.net/x1/<token>`
- v2: `https://<uuid>.webtrigger.atlassian.app/public/<token>`. The URL is installation-based.

**Getting the URL**
- CLI: `forge webtrigger create` (also `list` and `delete`). It prompts for the installation and function, and accepts `--functionKey`. Re-running for the same function and installation returns the same URL. Verified: https://developer.atlassian.com/platform/forge/cli-reference/webtrigger/
- Runtime API. Verified: https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger-api/
  ```ts
  import { webTrigger } from "@forge/api";
  webTrigger.getUrl(moduleKey: string, forceCreate?: boolean): Promise<string>;
  webTrigger.queryUrls(moduleKey?: string): Promise<{ moduleKey: string; url: string }[]>;
  webTrigger.deleteUrl(webTriggerUrl: string): Promise<void>;
  ```
- The URL "is stable for each combination of" module key, app, site, **Atlassian app**, and environment. Redeploying production does not change it. Development gets a different URL. Verified: same page.
- Gotcha: many granular scopes can cause "Request Entity Too Large" when getting a URL. The documented fix is fewer scopes, or non-granular scopes. Verified: CLI webtrigger page.

**Request and response** (Verified: https://developer.atlassian.com/platform/forge/events-reference/web-trigger/)
- Request fields: `method` and `path` (required), `userPath` (required), `headers` (object), `body` (string), `queryParameters` (object).
- Response fields: `statusCode` (required), `body`, `headers`, `statusText`. A non-JSON-compatible return becomes a 500.
- Responses carry `X-Ratelimit-Limit`, `X-Ratelimit-Remaining` and `X-Ratelimit-Reset` headers. Payload sizes follow the function payload limits in §7.

**Auth**
- "Web trigger URLs are publicly available and are not authenticated by the Forge platform".
- No user context is attached, so "`asUser` API calls will not work".
- You must implement auth in the handler (HMAC or shared secret). There is no manifest auth option.
- Verified: manifest page.

**Rate limits**
- Web triggers count toward invocation limits: 7,000/min and 300/s per installation. Use `X-Ratelimit-Reset` on a 429. Verified: https://developer.atlassian.com/platform/forge/limits-invocation/
- URL get/create/delete operations have their own per-minute limits. The exact numbers were not found. **Unverified.**

**Calling from another Forge app**
- The docs have nothing specific on this. **Unverified.**
- Backend fetch to any undeclared non-Atlassian domain "will fail". Verified: https://developer.atlassian.com/platform/forge/runtime-egress-permissions/
- So the relay must declare the host. For v2 URLs, `*.webtrigger.atlassian.app` covers the per-install subdomain, because wildcards include "all nested subdomains" but not the parent. Verified: https://developer.atlassian.com/platform/forge/manifest-reference/permissions/
- Whether `*.atlassian.app` counts as "internal" Atlassian traffic is **Unverified**. Declare it anyway and confirm on the week-1 spike (open question 1).

## 3. Async events and queues (`@forge/events`)

Verified: https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/ and https://developer.atlassian.com/platform/forge/limits-async-events/

```ts
import { Queue, AsyncEvent, InvocationError, InvocationErrorCode } from '@forge/events';
const queue = new Queue<Body>({ key: 'match-queue' });
const { jobId } = await queue.push([{ body: { a: 1 }, delayInSeconds: 600, concurrency: { key: 'page-123', limit: 1 } }]);
const stats = await queue.getJob(jobId).getStats(); // { success, inProgress, failed }; .cancel()
export async function handler(event: AsyncEvent<Body>, context) {
  event.body; event.jobId; event.eventId; event.queueName; event.retryContext?.retryCount;
  return new InvocationError({ retryAfter: 60, retryReason: InvocationErrorCode.FUNCTION_RETRY_REQUEST, retryData: {} });
}
```
```yaml
modules:
  consumer:
    - key: queue-consumer
      queue: queue-name
      function: consumer-function
  function:
    - key: consumer-function
      handler: consumer.handler
      timeoutSeconds: 600   # on the function, not the consumer; max 900
```

- `body` must be an object.
- `delayInSeconds` goes up to 15 min.
- `concurrency: { key, limit }` is an optional per-event field. It is useful for serialising per page.
- Limits, per installation:
  - 50 events per push.
  - 500 events/min.
  - **200 KB combined per push**.
  - **100 KB per individual event when the consumer's timeout is >55 s**.
  - `retryData` up to 4 KB.
  - Cyclic chain: 1,000 pushes from one initial invocation.
- Retries:
  - Exponential backoff up to about 15 min.
  - `retryAfter` is capped at 900 s.
  - **No fixed max retry count.** Events retry within a 24 h retention window (up to 96 h after platform errors), then app-error events are dropped.
- Default consumer timeout is 55 s. It extends to 900 s with `timeoutSeconds`. Verified: limits-invocation.

## 4. Scheduled triggers

Verified: https://developer.atlassian.com/platform/forge/manifest-reference/modules/scheduled-trigger/

- `interval` takes one of `fiveMinute`, `hour`, `day`, `week`.
- Optional `filter.appIsLicensed: true`.
- An app can declare at most 5 scheduled triggers.
- The first run comes about 5 min after deploy. Changing any scheduled trigger recreates all of them and resets their start times.
- Runs have no user context. A thrown error is **not retried**. Invocations are spread across the interval, and duplicates are possible, so handlers must be idempotent.
- Default timeout is 55 s, extendable with `timeoutSeconds` up to 900.

```yaml
modules:
  scheduledTrigger:
    - key: escalate
      function: escalate
      interval: hour
  function:
    - key: escalate
      handler: escalate.handler
      timeoutSeconds: 60
```

Product triggers (`trigger`): filter options are `appIsLicensed`, `ignoreSelf`, `expression`, and `onError` (`IGNORE_AND_LOG` default | `IGNORE` | `RECEIVE_AND_LOG` | `RECEIVE`). Events "may take up to 3 minutes" to arrive. Verified: https://developer.atlassian.com/platform/forge/manifest-reference/modules/trigger/

## 5. Storage

### KVS (`@forge/kvs`, scope `storage:app`)
Verified: https://developer.atlassian.com/platform/forge/runtime-reference/storage-api-basic-api/ and https://developer.atlassian.com/platform/forge/limits-kvs-ce/

- API:
  ```ts
  kvs.get(key, opts?); kvs.set(key, value, { ttl: { value: 7, unit: 'DAYS' } }); kvs.delete(key);
  kvs.query().where('key', WhereConditions.beginsWith('x'))
  ```
- Keys: up to 500 chars, matching `/^(?!\s+$)[a-zA-Z0-9:._\s-#]+$/`.
- Values: up to 240 KiB, object depth 31. TTL max 1 year, and expired data may take up to 48 h to be deleted.
- Rate limits: 1,000 RPS. Reads and writes are each 4,000/min, counted in 10 KB units.
- Transactions: up to 25 ops and 4 MB.
- Legacy `storage` from `@forge/api` is unsupported. Migrate to `@forge/kvs`.

### Secret store
- API (same scope):
  ```ts
  kvs.setSecret(key, value, opts?); kvs.getSecret(key); kvs.deleteSecret(key)
  ```
- Values up to 128 KiB. Verified: https://developer.atlassian.com/platform/forge/runtime-reference/storage-api-secret/
- Environment variables are an alternative. From 2026-11-11 each environment is limited to 50 plain and **10 encrypted** variables, 3 KB values and 128-char keys. Verified: changelog.

### Custom entities
Verified: https://developer.atlassian.com/platform/forge/storage-reference/entities-manifest/ and https://developer.atlassian.com/platform/forge/runtime-reference/storage-api-query-complex/

- Declared under `app.storage.entities[]`. Each entity has:
  - `name`
  - `attributes`, each with a `type` of `string` | `integer` | `float` | `boolean` | `any`
  - `indexes`: either a plain attribute name, or a named index with `range` (one attribute) and optional `partition` (a list)
- Changing entities after deploy:
  - Entities and attributes can never be deleted.
  - Indexes in staging or prod cannot be deleted.
  - `--major-version` deploys ignore `storage`.
- Limits:
  - 20 entities/app, 50 attributes and 7 indexes per entity.
  - Combined range values up to 900 B, combined partition values up to 1,700 B.
  - Values up to 240 KiB.
  - Up to 100 conditions per query.
- Query API:
  ```ts
  await kvs.entity('page_state').query().index('by-space-status', { partition: ['ENG'] })
    .where(WhereConditions.greaterThan(0)).sort(SortOrder.DESC).limit(100).cursor(c).getMany(); // { results:[{key,value}], nextCursor? }
  ```
- `limit` defaults to 10, max 100. `and`/`or` filters run in memory, so a page can come back empty with a cursor.
- **No count or aggregate** in the documented API.

### Forge SQL (`@forge/sql`)
Verified: https://developer.atlassian.com/platform/forge/manifest-reference/modules/sql/, https://developer.atlassian.com/platform/forge/limits-sql/, https://developer.atlassian.com/platform/forge/storage-reference/sql-api/ and https://developer.atlassian.com/platform/forge/storage-reference/sql-api-schema/

- **Status.** Current pages carry no Preview label. The Runs on Atlassian page refers to "EAP and Preview releases of Forge SQL" as earlier stages. No GA announcement was found, so GA status is **Unverified**.
- **Manifest.** Enabled with the module below, once per app. **Adding it triggers a major version.**
  ```yaml
  modules:
    sql:
      - key: main
        engine: mysql
  ```
- **Database.** MySQL-compatible TiDB, with one database per installation. Not supported in AGC.
- **Querying:**
  ```ts
  import { sql, migrationRunner } from '@forge/sql';
  const r = await sql.prepare<Row>('SELECT space_key, status, COUNT(*) AS n FROM page_state GROUP BY space_key, status').execute(); // r.rows
  await sql.prepare('INSERT INTO t VALUES (?, ?)').bindParams(a, b).execute();
  ```
  - `sql.executeRaw(q)` takes no params.
  - Results come back as JSON, so dates arrive as strings.
  - One statement per call.
- **Query policy.**
  - Not restricted: GROUP BY and aggregates. Grouped queries are standard MySQL, so the dashboard's grouped counts work as normal queries. That this works is inferred, not tested (**Unverified**, test in spike 7).
  - Restricted: multi-statement calls, `SET` (except `@var`), most `SHOW`, SQL-level `PREPARE`, `USE`, cross-install references, and some audited functions (`SLEEP`, `AES_*`, …). See https://developer.atlassian.com/platform/forge/storage-reference/sql-query-policy/
- **Migrations.**
  - API: `migrationRunner.enqueue('v001_x', DDL).enqueue(...).run()`, and `.list()` to inspect.
  - Recommended: an async consumer (`timeoutSeconds: 900`) fed by a `trigger` on `avi:forge:installed:app` and `avi:forge:upgraded:app`.
  - The upgraded event fires only on major upgrades, so add a scheduled trigger fallback.
  - Use idempotent DDL (`CREATE TABLE IF NOT EXISTS`) and a 60 s retry loop to cope with the 25 DDL/min limit.
- **Limits per install:**
  - Storage: 1 GiB prod, 256 MiB staging, 128 MiB dev/custom.
  - 200 tables. 150 DML/s, 25 DDL/min.
  - Rows up to 6 MiB. 16 MiB memory per query.
  - Requests up to 1 MiB, responses up to 4 MiB.
  - Timeouts: SELECT 5 s, DML 10 s, DDL 20 s. Query time is capped at 62.5 s per minute.
  - No foreign keys.
- **Tunnel.** SQL run while tunnelling hits the provisioned database. Verified: https://developer.atlassian.com/platform/forge/storage-reference/sql-tutorial/

### Data lifecycle (hosted storage)
Verified 2026-11-13 via the Forge MCP docs search:
- Every hosted store (KVS, custom entities, Forge SQL, Object Store) encrypts data on disk, scopes it per installation, and keeps it in the host Atlassian app's location (data residency is inherited). https://developer.atlassian.com/platform/forge/storage-reference/
- On uninstall, data is soft-deleted and **retained for 28 days**. A reinstall is a new installation; the developer can ask Atlassian support to re-link the old data within 21 days, with customer consent. Data an app deletes itself is also kept soft-deleted for the retention period (recoverable on request within 21 days). https://developer.atlassian.com/platform/forge/storage-reference/hosted-storage-data-lifecycle/
- Used on the public privacy page (`site/privacy.html`).

### Recommendation
Use **Forge SQL** for `binding`, `page_state`, `drift_event`, `change_record` and `verification`. The dashboard needs grouped counts per space and status, and custom entities have no aggregates: you would page through 100 rows at a time, or maintain counters by hand. Keep KVS for settings and the secret store for the HMAC secret. Fall back to custom entities only if spike 7 fails.

### Pricing
Billing started 2026-01-01 and counts **all environments**, including dev. Verified: https://developer.atlassian.com/platform/forge/forge-platform-pricing/

| Item | Free per app per month | Overage |
|---|---|---|
| Compute | 200k GB-s | $0.000025/GB-s |
| KVS reads | 0.1 GB | $0.055/GB |
| KVS writes | 0.1 GB | $1.09/GB |
| SQL compute | 1 h | $0.143/h |
| SQL requests | 100k | $1.929/1M |
| SQL storage | 730 GB-h | $0.0007685/GB-h |
| Logs | 1 GB | $1.005/GB |

## 6. Egress, permissions, Runs on Atlassian

- `permissions.external.fetch.backend` and `.client` take a string, `{ address, category: analytics, inScopeEUD }`, or `{ remote: <key> }`.
- Other `external` keys: `fonts`, `styles`, `frames`, `images`, `media`, `scripts`.
- Wildcards: `*.x.com` covers nested subdomains but not `x.com` itself.
- Verified: https://developer.atlassian.com/platform/forge/manifest-reference/permissions/
- Calls to undeclared domains fail. Modifying egress entries "may result in a major version upgrade". Atlassian API redirects count as internal traffic. Verified: runtime-egress-permissions.
- Runs on Atlassian: an eligible manifest lists **none** of the following. Check with `forge eligibility`. Verified: https://developer.atlassian.com/platform/forge/runs-on-atlassian-apps/
  - external domains (analytics excepted)
  - remotes
  - Connect modules
  - providers
  - **dynamic web triggers**
- Consequence for this project:
  - The core app is eligible only if `ingest-change` is **static**, and if it does not use dynamic responses, egress or remotes.
  - The relay declares egress, so it is not eligible. The plan already accepts this.

## 7. Limits

Verified: https://developer.atlassian.com/platform/forge/limits-invocation/

| Item | Limit |
|---|---|
| UI modules / resolvers | 25 s |
| Web trigger, `action`, `rovo:agentConnector` | **55 s** |
| Async consumer, scheduled trigger | 55 s by default, up to 900 s with `timeoutSeconds` |
| Events delivered to Forge Remote | 5 s |
| Memory | 512 MB by default, 1,024 MB max (`memoryMB`). `/tmp` is 512 MB, not persisted |
| Request payload per invocation | 5 MB |
| Frontend `invoke` | 500 KB request, 5 MB response |
| Single outbound request (async only) | 180 s |
| Egress calls per invocation | 100 per runtime minute, excluding `requestConfluence`/`requestJira` |
| Egress calls per app | 50k/min |
| Invocation rate | 1,200/min per user per install. 7,000/min and 300/s per install |
| Logs | 100 lines per runtime minute, 200 KB per invocation |

RFC-152 (2026-10-23) proposes raising the memory maximum. Verified: changelog.

## 8. Environments, tunnel, deploy and install, distribution, multi-app

- **Environments.** There are three by default: `development` (title suffix "(DEVELOPMENT)"), `staging` ("(STAGING)") and `production` (no suffix). Custom environments come from `forge environments`. Verified: https://developer.atlassian.com/platform/forge/environments-and-versions/
- **Install flags.** Verified: https://developer.atlassian.com/platform/forge/cli-reference/install/
  - `forge install` takes `-e/--environment`, `-s/--site`, and `-p/--product`, where `-p` accepts Jira, Confluence, Compass or Bitbucket.
  - `--upgrade [all|code]`, `--confirm-scopes`, `--license`, `--major-version`, `--non-interactive`.
  - Subcommand: `forge install list`.
- **Tunnel.** Verified: https://developer.atlassian.com/platform/forge/tunneling/
  - It only shows your own requests ("You will not see requests from other users").
  - It forwards resolvers and web triggers. The page does not say whether scheduled triggers or async events go through the tunnel.
  - Tunnelled resolvers "won't time out", so timeouts must be tested deployed.
  - Logs do not reach `forge logs`. Manifest changes need a deploy.
- **Distribution.** Verified: https://developer.atlassian.com/platform/forge/distribute-your-apps/
  - To share by link: deploy to production, then Developer console > Distribution > sharing, then copy the install link. Only site admins can install.
  - The sharing flow selects which Atlassian apps the install targets. For multi-app, the app installs into the required app, and "Admins can also choose to connect it to any additional supported Atlassian apps during installation."
  - Bitbucket apps can be upgraded or uninstalled from workspace settings.
  - New on 2026-10-28: org-level sharing. Only members of the owner's org can install, and the app cannot be listed. It does not suit judges.
- **Multi-app compatibility.** Verified: https://developer.atlassian.com/platform/forge/app-compatibility/, https://developer.atlassian.com/platform/forge/migrating-a-forge-app-to-support-multiple-atlassian-apps/ and https://developer.atlassian.com/platform/forge/add-support-for-jira-as-an-optional-atlassian-app/
  - Manifest:
    ```yaml
    app:
      compatibility:
        confluence:
          required: true
        jira:
          required: false
    ```
  - Exactly one required app. **Only Jira and Confluence** can be required or optional. Bitbucket is supported only in the Global Apps EAP. Compass is optional-only according to the tutorial pages.
  - The required app governs install, upgrade, uninstall, storage location and residency.
  - Uninstalling requires removing the app from the optional apps first.
  - The app is restricted to a single site. The compatibility model cannot be changed after installs exist.
  - **Marketplace: multi-app apps with a required app "can only be listed on Marketplace as paid apps; free listings are not supported".**
  - Connecting Jira later:
    - Developers: `forge install -p jira` against the same site, after the Confluence install.
    - Admins: "via Atlassian Administration". The exact UI path is not documented (**Unverified**).
  - Adding an optional app is not a major version, unless new scopes are added. "Whenever you change permissions, you must upgrade the app's installation" (`forge install --upgrade`).
  - The current pages show no Preview label for multi-app. The plan calls it Preview, which is **Unverified**.
  - Runtime detection of whether Jira is connected is not documented (**Unverified**). Handle `requestJira` failures gracefully.
  - Cross-app storage calls need `@forge/api` 5.1.1 or later.

## 9. Judge copy vs Marketplace copy (one app ID twice?)

- One app ID cannot back two separate "copies". The documented route is that apps "that already have a license in the app manifest or have been submitted for listing on Marketplace can't be shared via installation link". You must "copy the app's code, create a new, unlicensed version of the app, and share this version via installation link." Verified: distribute-your-apps.
- Creating the copy: `forge register` "updates the manifest with a new app ID". Running it again on the same directory disconnects the old environments and variables, so use a separate directory or branch for the judge copy. Its options include `-s/--developer-space-id`. Verified: https://developer.atlassian.com/platform/forge/cli-reference/register/
- Judge copy rules:
  - It must have no `app.licensing` block.
  - It must never be submitted for listing.
  - It gets its own web trigger URLs, storage and secrets.
  - It is still multi-app (Confluence required).
- Marketplace copy: it is multi-app with a required app, so it must be a **paid** listing, which in turn needs `app.licensing.enabled: true`. Inferred from the paid-only rule (**Unverified** that licensing is mandatory at submission).

---

## Differences from plan.md

1. **The web trigger has no `urlFormat` or `response`, so it defaults to v1 and dynamic.**
   - Dynamic counts as egress and makes the core app *ineligible* for Runs on Atlassian. This contradicts §6, "core app can stay egress-free".
   - Fix: add `urlFormat: v2` and `response: { type: static, outputs: [...] }`, with outputs such as `accepted` 202, `unauthorized` 401 and `bad-request` 400. The handler returns `{ outputKey }`. It cannot echo dynamic data such as job IDs.
2. **The relay egress `'*.atlassian-dev.net'` only matches v1 URLs** (`<uuid>.hello.atlassian-dev.net`). v2 URLs are `<uuid>.webtrigger.atlassian.app`. Declare `*.webtrigger.atlassian.app`, and keep `*.hello.atlassian-dev.net` only if v1 is used. Resolves open question 10.
3. **`interval: hour` is valid.** The allowed values are `fiveMinute | hour | day | week`, and an app can have at most 5 scheduled triggers. Scheduled runs are not retried and may duplicate, so escalation must be idempotent. Resolves open question 10.
4. **The core manifest has no `sql` module, migration path or `app.storage`.** §12 prefers Forge SQL, which needs:
   - `modules.sql: [{ key: main, engine: mysql }]`, which is a major version.
   - A migration consumer with `timeoutSeconds: 900`, plus a `trigger` on `avi:forge:installed:app` and `avi:forge:upgraded:app`, plus a scheduled fallback.

   Add these from the first deploy so that judges never see a major-version upgrade. If custom entities are chosen instead, `app.storage.entities` is missing. Note also that `page_state` has two partition-plus-status indexes and `binding` has three, within the 7 allowed per entity.
5. **The dashboard recommendation** in §12 and open question 7: custom entities have no count or aggregate and return at most 100 rows per page. Forge SQL GROUP BY is the right choice. Its per-statement timeouts are SELECT 5 s and DML 10 s.
6. **Payload cap for long consumers.** `matcher` has `timeoutSeconds: 120` (more than 55 s), so each event body is capped at **100 KB**, not the 200 KB in §5. Push IDs and refs, not diffs.
7. **Retries.** §5 omits them. There is no fixed retry count, events retry within a 24 h window, and `InvocationError` with `retryAfter` (≤900 s) is available. `concurrency: { key, limit }` on push is new and suits per-page serialisation.
8. **The web trigger runs for 55 s**, not 25 s. It has no `asUser`. Only `asApp` works there, which is consistent with the plan.
9. **Granular-scope risk.** The core app's long granular scope list can make `getUrl` and `webtrigger create` fail with "Request Entity Too Large". Test this early.
10. **The web trigger URL is per Atlassian app and environment.** Fetch it in the Confluence context (the settings page resolver calls `webTrigger.getUrl('ingest-change')`). The dev and prod URLs differ, so the relay needs a configurable URL.
11. **Jira trigger.** Add `ignoreSelf: true` and an `onError` mode. Trigger events can take up to 3 minutes to arrive, which matters for the demo timing.
12. **Multi-app.**
    - The plan calls it "(Preview)", but the docs show no label.
    - Jira is connected by the admin during install or later via Atlassian Administration, or by `forge install -p jira` for developers.
    - Adding Jira scopes later is a major version, so keep `read:jira-work` in from day 1.
    - The paid-only listing rule is confirmed.
13. **The judge copy must have no `app.licensing`** and must be a separate `forge register`ed codebase with a new ID. The Marketplace copy needs licensing for its paid listing.
14. **Billing counts dev and staging usage** (SQL has 1 compute-hour free per month), and **environment variables are capped at 10 encrypted per environment**. Store the HMAC secret with `kvs.setSecret`, not in variables.
15. **Runtime and tooling.** `nodejs24.x` is correct. Pin `@forge/cli` 15.x, which needs local Node 22.23.4+ or 24.22.1+. Consider `memoryMB` and `arm64`. The `@forge/react` "11.4.0+" note is stale (latest is 12.5.0), and `@forge/confluence-bridge` is now 4.0.0.
16. **Tunnel.** Tunnelled resolvers never time out, so the 25 s and 55 s timeouts can only be validated on a deployed environment (§5 covers only the multi-user caveat).
17. **Relay module.** `bitbucket:workspaceSettingsMenuPage` exists (https://developer.atlassian.com/platform/forge/manifest-reference/modules/bitbucket-workspace-settings-menu-page/). It takes `key`, `title`, `resource`, `render` and `resolver`.

## Update (2026-11-11, afternoon)

- **Bitbucket share links exist now.** Bitbucket Forge apps "can continue to distribute them via the developer console after you list them". Verified: https://developer.atlassian.com/platform/marketplace/listing-forge-apps/ . Forge apps do not run on personal workspaces. Verified: https://support.atlassian.com/bitbucket-cloud/kb/forge-installation-error-insufficient-permissions-to-install-app-in-bitbucket-cloud/
- **Admin path to connect Jira later.** Atlassian Administration > Apps > Sites > site > Connected apps > View app details > Connections > Connect. This replaces the "UI path not documented" note in §8. Verified: https://support.atlassian.com/organization-administration/docs/managing-an-installed-app/
- **Relay to core web trigger.** Still not documented. Web trigger hosts are not on the egress page's internal list, so declare `*.webtrigger.atlassian.app`. A 2022 reply from an Atlassian engineer says web trigger egress must be declared per domain: https://community.developer.atlassian.com/t/forge-webtrigger-url/57130 . No report of the pattern working or failing was found. **Unverified.** Spike it this week.
- **Share-link lifecycle.** Generating a new link disables the old one, and this cannot be undone. Major versions can be bulk-upgraded without admin approval only when the target adds no escalating scopes or egress and licensing does not change. Verified: https://developer.atlassian.com/platform/forge/distribute-your-apps/ . No install cap or link expiry is documented. **Unverified.**
- **Multi-app bug (fixed).** `jira:fullPage` resolvers in a Jira-required, Confluence-optional app failed FCT validation. The fix was confirmed Jul 6, 2026: https://community.developer.atlassian.com/t/multi-platform-app-throws-failed-to-validate-fct-on-jira-fullpage/101308
- **Changelog, Nov 11.** Environment limits are now 50 plain variables and 10 encrypted secrets per environment. Verified: https://developer.atlassian.com/changelog/

## Update (2026-11-11, Forge MCP server check)

Source: the Forge MCP server `search-forge-docs`.

- **Static web trigger confirmed.** `urlFormat: v2`, `response: { type: static, outputs: [{ key, statusCode, contentType?, body? }] }`, and the handler returns `{ outputKey }`. Adding a static trigger is a minor version. Switching static to dynamic, or adding the first dynamic trigger, is a major version. Changing `urlFormat` after first use changes the URL. `asUser` calls do not work in web trigger functions. The URL is per installation: `https://<installation-uuid>.webtrigger.atlassian.app/public/<token>`. `forge webtrigger create` needs site admin rights; in code, use the web trigger runtime API (`getUrl`). Verified: https://developer.atlassian.com/platform/forge/manifest-reference/modules/web-trigger/ and https://developer.atlassian.com/platform/forge/cli-reference/webtrigger/
- **App-to-app web trigger calls:** still undocumented. Spike S1 stays open.
- **Forge SQL limits, per install:**
  - Storage: 1 GiB production, 256 MiB staging, **128 MiB development**.
  - 200 tables. 150 DML requests per second. 25 DDL requests per minute. 6 MiB per row.
  - Per query: 16 MiB memory, 1 MiB request, 4 MiB response. 62.5 s of query time per minute.
  - Timeouts: SELECT 5 s, INSERT/UPDATE/DELETE 10 s, DDL 20 s.
  - No foreign keys (JOINs work). One statement per query. Restricted keywords are rejected with `SQL_POLICY_VIOLATION`.
  - Avoid `AUTO_INCREMENT`; use `AUTO_RANDOM` or `BINARY(16)` UUIDs.
  - Run migrations from an async consumer (up to 15 min) with idempotent DDL. Adding `sql` to an existing app is a major version.

  Verified: https://developer.atlassian.com/platform/forge/limits-sql/ and https://developer.atlassian.com/platform/forge/storage-reference/sql/ . Fine for our data volumes. Keep diff hunks out of SQL rows, or cap them, to stay within the development 128 MiB.
