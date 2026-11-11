# Doc Drift Sentinel Relay

The Bitbucket half of Doc Drift Sentinel (milestone M1). When a pull request merges into a repository's main branch, the relay reads its changed files, builds a `ChangeRecord` (`@dds/shared`), signs it, and POSTs it to the core app's ingest web trigger in Confluence. Forge multi-app compatibility excludes Bitbucket, so this is a separate Forge app (see [docs/architecture/overview.md](../../docs/architecture/overview.md)).

| | |
| --- | --- |
| App name | Doc Drift Sentinel Relay |
| App ID | `ari:cloud:ecosystem::app/409a6e1e-dd37-482c-b30f-e56d322b4035` |
| Developer Space | Doc Drift (`af90295c-aad7-4188-9754-122ee3c4c6f4`) |
| Installed | development, Bitbucket workspace `nano-soft-dev` (installation `6e94238f-5912-48c6-8485-962b02059db9`) |
| Scopes | `read:pullrequest:bitbucket`, `read:repository:bitbucket`, `read:workspace:bitbucket` (admin check), `storage:app` |
| Egress | `*.webtrigger.atlassian.app` only |

## What it does

**Trigger `pr-merged`** on `avi:bitbucket:fulfilled:pullrequest` ([src/trigger.ts](src/trigger.ts)):

1. Reads only the fields it needs from the event. It never logs the event, which carries a `contextToken` JWT.
2. Skips the PR if `sent:<repoUuid>#<prId>#<mergeCommit>` is in KVS (already delivered; redeliveries and retries are safe).
3. Skips with a status line if the ingest URL or secret is not configured.
4. Reads `GET /2.0/repositories/{ws}/{repo}?fields=mainbranch.name,full_name,slug`, cached in KVS for 1 hour. Merges into any other branch are ignored. If the main branch is unknown, the PR is relayed anyway.
5. Reads the diffstat with the range form ``route`.../diffstat/${src}..${dst}?topic=true&pagelen=500` `` (two interpolations; one interpolation holding `a..b` makes `route()` throw). It follows `next` links on `api.bitbucket.org` only and stops at 500 files (the shared validator's cap). An empty result falls back to the PR endpoint, then to the merge commit.
6. Fetches the raw diff (same spec) only for 300 files or fewer, and trims it to 200,000 UTF-8 bytes on a character boundary, after the last full line. A failed or oversized diff (555) is skipped and the record goes out with the diffstat only.
7. Builds the record (`workspace` is the workspace slug, from `full_name`), checks it with `parseChangeRecord`, signs it with `signBody` (`x-dds-timestamp`, `x-dds-signature`), and POSTs it.
8. On 2xx it writes the dedupe key (30-day TTL). A 429, a 5xx, a network error, or a Bitbucket 5xx/555 returns an `InvocationError`, so Forge redelivers after 30 s, 2 min, 5 min and 15 min (4 retries at most). A 400, 401 or 404 from the core is final and is shown on the settings page.

**Settings page `relay-settings`** (`bitbucket:workspaceSettingsMenuPage`, UI Kit, [src/frontend/index.tsx](src/frontend/index.tsx)):

- Core ingest URL: must be `https://<id>.webtrigger.atlassian.app/...`, with no port or credentials.
- Shared secret: at least 32 characters. It is stored with `kvs.setSecret` and never sent back to the page. Leave it blank to keep the saved one.
- "Send test ping" POSTs a signed `{ "source": "ping", "workspaceUuid", "sentAt" }` to the saved URL. A 2xx shows "Connected"; anything else shows the reason in plain words.
- "Last merged pull request" shows the last PR the trigger handled (sent, ignored or not sent, and why).
- Every resolver call first checks, as the calling user, `GET /2.0/user/workspaces/{ws}/permission` = `owner` (workspace admin). Showing the page in workspace settings is not authorization.

Pure logic (event parsing, diffstat mapping and pagination, UTF-8 trimming, record building, URL and secret checks, response wording) is in [src/lib/record.ts](src/lib/record.ts) and [src/lib/ingest.ts](src/lib/ingest.ts), tested with Vitest in [test/](test/).

## Requirements for the core app (`apps/core`)

- Verify with `verifyBody` from `@dds/shared` (bare hex signature, ±300 s window). Headers arrive lowercased as `{name: [value]}`.
- **Accept the ping record:** `source: "ping"` is not a `ChangeRecord`, so `parseChangeRecord` rejects it. After the HMAC check, answer `accepted` (202) for `source === "ping"` without storing anything. Suggested additive type for `@dds/shared`: `interface PingRecord { source: 'ping'; workspaceUuid: string; sentAt: string }`.
- Be idempotent per `(repoUuid, prId, mergeCommit)`. The relay dedupes, but two concurrent redeliveries can both send.
- `mergeCommit`, like the commit hashes in the event, is a 12-character short hash.

## Develop, deploy, install

Node 24 only. Every shell command starts with `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null &&`.

```bash
cd apps/bitbucket-relay
npm install                  # links @dds/shared from ../../packages/shared (file: dependency)
npm run build:shared         # builds packages/shared/dist, which the bundler and Vitest import
npm test                     # Vitest
npm run typecheck
forge deploy -e development --non-interactive   # or `npm run deploy` (runs build:shared, typecheck, tests first)
forge install -e development --site https://bitbucket.org/nano-soft-dev/ --product bitbucket --non-interactive --confirm-scopes
forge install --upgrade -e development           # after a scope or egress change
forge logs -e development --since 30m
```

The app is not in the pnpm workspace (`packages/*` only), so it uses npm and a `file:` link. The Forge bundler follows the symlink and bundles `packages/shared/dist`. **Build `packages/shared` before every deploy**, or the deploy bundles a stale or missing `dist`.

Do not add `"type": "module"` to package.json, and never add `app.licensing` to the manifest (D19).

## Configure

1. In Confluence, open Doc Drift Sentinel settings and copy the ingest URL and the shared secret.
2. In Bitbucket, open **Workspace settings > Forge Apps > Doc Drift Sentinel Relay**
   (`https://bitbucket.org/nano-soft-dev/workspace/settings/forge/409a6e1e-dd37-482c-b30f-e56d322b4035/development/relay-settings`; the environment segment is unverified, so use the menu if this 404s).
3. Paste both and select **Save**, then **Send test ping**.

Until `apps/core` serves its ingest trigger, use the S1 spike core (`spikes/s1-core-webtrigger`, Confluence `one-atlas-jzzf`). Its URL and secret are in the S1 agent's scratchpad (`s1-core-url`, `s1-secret`), not in the repo. The spike core was updated on 2026-11-11 to accept the shared signature format and the ping.

## Verified so far (2026-11-11)

- Deployed to development (version 2) and installed in `nano-soft-dev`. `forge lint` is clean. 43 Vitest tests pass.
- Local replay (same pure code, basic-auth REST instead of `requestBitbucket`) against an open scratch PR (#3, 2 added files with multibyte text): the range diffstat paginated across 2 pages with `pagelen=1`, the diff came back (398 bytes), the record passed `parseChangeRecord`, and the S1 spike core answered **202**. A signed ping got **202**, and a ping with the wrong secret got **401** with the expected message. PR #3 was declined and its branch deleted.
- Not yet verified: the settings page in a browser, the admin check (`asUser`), and the live trigger. Those need a real merge into `main`, which waits for the seeding agent.

## Browser checks for Razvan

1. Open the settings page (step 2 above) as a workspace admin. Expect the heading "Doc Drift Sentinel Relay", 2 fields, and "No merged pull requests seen yet." If Bitbucket asks you to allow access, allow it.
2. Paste `http://example.com` and select Save. Expect the URL error that mentions `webtrigger.atlassian.app`.
3. Paste the S1 core URL and secret, then Save. Expect "Saved". Reload the page: the URL is back, the secret field is empty, and the secret line reads "Secret saved ... never shown again."
4. Select **Send test ping**. Expect a green "Connected" message with the HTTP status and time. In the S1 core logs (`cd spikes/s1-core-webtrigger && forge logs -e development`), expect `ingest: ping verified`.
5. Enter a wrong 64-character secret, Save, and ping again. Expect "Not connected" and the signature message. Then restore the right secret.
6. (Needs a merge, so coordinate with the seeding agent.) Merge a scenario PR into `main` of `payments-api`. Within about 3 minutes, `forge logs -e development` shows `relay: core answered { status: 202 ... }`, and **Refresh** on the settings page shows the PR as sent with its file count. A merge into a non-main branch shows as ignored.
7. Optional: open the page as a non-admin member. Expect "Only workspace admins can view or change these settings."
