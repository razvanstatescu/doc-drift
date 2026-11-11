# S1 result: Bitbucket relay to core static web trigger (2026-11-11)

**Verdict: GO.** A Forge app installed in Bitbucket, triggered by `avi:bitbucket:fulfilled:pullrequest`, can POST
an HMAC-signed change record to another Forge app's static v2 web trigger (installed on Confluence). The core
verified the HMAC, stored the record in KVS and returned 202. A bad signature got a 401. No fallback was needed.

## Apps registered (Developer Space "Doc Drift", af90295c-aad7-4188-9754-122ee3c4c6f4)

| App | Dir | App ID | Installed (development) |
| --- | --- | --- | --- |
| s1-core-webtrigger | `spikes/s1-core-webtrigger/` | `ari:cloud:ecosystem::app/2e68abfe-b88b-4f3a-a3b3-242085ee080c` | Confluence, one-atlas-jzzf.atlassian.net |
| s1-relay | `spikes/s1-relay/` | `ari:cloud:ecosystem::app/10b5bea9-56ce-415b-a355-71cfb5bace46` | Bitbucket, nano-soft-dev |

Core web trigger URL (dev): `https://c51cc8bf-63be-435d-9ced-66f000d7a4c0.webtrigger.atlassian.app/public/<token>`.
Both apps hold `DDS_HMAC_SECRET` (encrypted); the relay also has `DDS_CORE_URL` (plain).

## Working manifests (trimmed: `app.id`, `runtime` omitted; runtime `nodejs24.x`)

```yaml
# core
modules:
  webtrigger:
    - key: ingest-change
      function: ingest
      urlFormat: v2
      response:
        type: static
        outputs:
          - { key: accepted,     statusCode: 202, contentType: application/json, body: '{"status":"accepted"}' }
          - { key: bad-request,  statusCode: 400, contentType: application/json, body: '{"status":"bad_request"}' }
          - { key: unauthorized, statusCode: 401, contentType: application/json, body: '{"status":"unauthorized"}' }
  function:
    - { key: ingest, handler: index.ingest }      # returns { outputKey }
permissions:
  scopes: [storage:app]
```

```yaml
# relay
modules:
  trigger:
    - { key: pr-merged, function: on-merged, events: [avi:bitbucket:fulfilled:pullrequest] }
  function:
    - { key: on-merged, handler: index.onMerged }
permissions:
  scopes: [read:pullrequest:bitbucket, read:repository:bitbucket]
  external:
    fetch:
      backend:
        - address: '*.webtrigger.atlassian.app'   # object form; plain strings are deprecated
          inScopeEUD: false
```

## Commands that worked non-interactively

- `forge create --template webtrigger|product-trigger --developer-space-id <id> --accept-terms <name>`
- `forge variables set -e development --encrypt DDS_HMAC_SECRET "<value>"`
- `forge deploy -e development --non-interactive`
- `forge install -e development --site one-atlas-jzzf.atlassian.net --product confluence --non-interactive --confirm-scopes`
- `forge install -e development --site https://bitbucket.org/nano-soft-dev/ --product bitbucket --non-interactive --confirm-scopes`
- `forge webtrigger create -f ingest-change -s one-atlas-jzzf.atlassian.net -p confluence -e development`

## End-to-end timeline (PR #1, scenario 01)

- Merged 14:43:41 UTC. The relay was invoked at 14:43:43 (2 s). PR #2 was 1 s.
- Run 1 crashed on a `route()` error (see gotchas). Forge redelivered the event at +22 s, +54 s and +115 s
  (`retryContext.retryCount` 1 to 3, `retryReason: FUNCTION_ERROR_HOSTED_APP_CODE`). Retry 3 ran the fixed deploy.
- Relay POST, 748 bytes: **202**. Core log: `HMAC verified`, `stored in KVS` (read back with 2 files). Bad-signature POST: **401**.
- The record has 2 files: `modified deploy/helm/values.yaml` (+1 -1) and `renamed scripts/rollback.sh -> scripts/rollback-v2.sh` (+3 -3).
- curl against the core directly: valid 202, bad signature 401, timestamp 1,000 s old 401, missing headers 401, non-JSON 400.

## Merged-PR event payload (real, field paths)

- `eventType` = `avi:bitbucket:fulfilled:pullrequest`, `timestamp` (ISO, µs), `selfGenerated` (false)
- `actor.{type, accountId, uuid}`
- `repository.{uuid, slug}`: `slug` was present (`payments-api`). No `name`/`full_name`.
- `project.uuid`, `workspace.uuid`. UUIDs are `{...}`-wrapped.
- `pullrequest.id`, `.state` (`MERGED`), `.title.{value, truncated}`, `.author.{type, accountId, uuid, displayName}`
- `pullrequest.source.{branch, commit.hash}`, `.destination.{branch, commit.hash}`, `.mergeCommit.hash` (12-char short hashes)
- `pullrequest.{taskCount, commentCount, createdOn, updatedOn, closedOn}`
- Not in the docs: `bbcShardId`, `bbcRegion`, `permissions.{scopes, external}`, `context.{cloudId, moduleKey, userAccess.enabled}`,
  `contextToken` (a signed JWT), and `retryContext.{retryData, retryCount, retryReason}` on redeliveries only.
- 2nd handler argument: `context` keys `principal, installContext, installation, workspaceId`.
  `installContext` = `ari:cloud:bitbucket::workspace/<uuid>`, and `workspaceId` = the `{uuid}`.
- **`destination.commit.hash` in the event is the pre-merge destination tip** (`e30840941563`, the same as the REST PR
  object before and after the merge). So `/diffstat/{src}..{dst}?topic=true` from event hashes is correct. This closes the open question.

## Diffstat: which form worked (all via `api.asApp().requestBitbucket`)

| Form | Result |
| --- | --- |
| `/pullrequests/{id}/diffstat` (default redirect) | **200, 2 files.** The Forge proxy follows the 302 and keeps auth. |
| Same, `{ redirect: 'manual' }` | 302, `Location: .../diffstat/nano-soft-dev/payments-api:<src>%0D<dst>?from_pullrequest_id=1&topic=true` |
| ``route`.../diffstat/${src}..${dst}?topic=true&pagelen=500` `` (two interpolations, literal `..`) | **200, 2 files** (recommended: deterministic, no redirect hop) |
| ``route`.../diffstat/${`${src}..${dst}`}` `` (one interpolation) | **`route()` throws** "Disallowing path manipulation attempt" |
| `/diffstat/{mergeCommit}` | 200, 2 files |
| `/diff/${src}..${dst}?topic=true` | 200, text/plain, 1,103 bytes |
| `?fields=mainbranch.name,full_name,slug` on the repo | 200, `{"full_name":"nano-soft-dev/payments-api","slug":"payments-api","mainbranch":{"name":"main"}}` |

`res.url` is always the outbound proxy (`forge-outbound-proxy.prod.atl-paas.net/...`) and `res.redirected` is false,
so you can't see from the response whether a redirect was followed.

## Egress and eligibility

- `*.webtrigger.atlassian.app` in `fetch.backend` is enough. The app-to-app call is not blocked, and there is no 403/BLOCKED_EGRESS.
  The install prompt lists it as `webtrigger.atlassian.app`.
- The web trigger response carries `x-ratelimit-limit: 300` (per second) and `25000, 25000;w=60` (per minute).
- `forge eligibility` core: **eligible for Runs on Atlassian** (static trigger, KVS only). `forge deploy` prints the same.
- `forge eligibility` relay: not eligible, "App is egressing data" (expected).

## Gotchas

1. **`route()` throws synchronously** when one interpolation contains `..`. It throws while the route is built, so a
   try around the `await` alone won't catch it. Use two interpolations with a literal `..`.
2. **An uncaught error makes Forge redeliver the event** (3 retries over about 2 minutes, using the latest deployed code).
   The core ingest must be idempotent per `(workspace, repo, pr.id, mergeCommit)`. The relay should catch errors it can't recover from.
3. **The event carries a `contextToken` JWT.** Never log full events in the real relay.
4. **Web trigger header names arrive lowercased** (`x-dds-signature`, `x-dds-timestamp`) as `{name: [value]}`, among
   about 30 platform headers (`atl-edge-*`, `x-b3-*`, ...). Look up headers case-insensitively.
5. **`forge create` needs a Developer Space.** None existed at first. The CLI can only create one through an
   interactive prompt that fails in a non-TTY shell. "Doc Drift" then appeared mid-run (probably created by Razvan
   or another agent). For clean-machine runs, create it once at developer.atlassian.com/console.
6. **Undocumented platform HMAC option:** the CLI 15.1.0 manifest schema allows
   `webtrigger[].request.authentication: hmacSharedSecret | none`, and `forge webtrigger create` has
   `--readSecretKey` ("secret key for an authenticated (HMAC) web trigger") and `--noKeyExpiry`. The `webtrigger`
   template sets `authentication: none`. Nothing is in the public docs (search-forge-docs: no hits). Not tested.
   Our in-handler HMAC works, so keep it, and revisit only if the platform option gets documented.
7. A personal registration (`--personal`) exists as an alternative to Developer Spaces. Not used.

## Side effects to know

- Scenario 01 is now **merged into `payments-api/main`** (PR #1). Reseed before the demo recording.
- Retest PR #2 merged `spike/s1-change-1` into a throwaway `spike/s1-base` branch (main untouched). The branch
  `spike/s1-base` is left in the repo, so delete it when convenient.
- The secret lives only in the Forge variables and a 0600 scratchpad file outside the repo.

## Implications for M1

- The relay design in docs/platform holds: use the range form with event hashes (the PR endpoint also works as a backup),
  default branch via `?fields=mainbranch.name`, and egress `*.webtrigger.atlassian.app`.
- The ingest output keys `accepted`/`bad-request`/`unauthorized` work. The core stays Runs on Atlassian eligible.
- Docs to update (orchestrator): forge-bitbucket-jira.md Q3 (302 followed, event dst = pre-merge), `route` `..` rule,
  retry behaviour, extra payload fields; forge-platform.md (app-to-app works, platform HMAC field); risks-and-spikes S1 = GO.
