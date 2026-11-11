# Doc Drift Sentinel: core app

The core Forge app. Confluence is required and Jira is optional (`app.compatibility`). It stores page anchors, receives HMAC-signed change records from the Bitbucket relay, runs the deterministic matcher, and writes each page's state to the byline content property. Milestone M1 of [docs/implementation-plan.md](../../docs/implementation-plan.md).

| | |
| --- | --- |
| App ID | `ari:cloud:ecosystem::app/12e968a1-a45d-4524-ba28-d47e2315db1a` |
| Developer Space | Doc Drift (`af90295c-aad7-4188-9754-122ee3c4c6f4`) |
| Development env ID | `b7eadd8c-211c-4cdf-98c0-86172909ead2` (version 3.2.0 on 2026-11-11) |
| Installed | development, one-atlas-jzzf.atlassian.net: Confluence (required) + Jira (connected). Installation `27236af5-036e-44ad-bb1d-d3bec72a5122` |
| Runs on Atlassian | Eligible (every deploy so far) |

## Architecture

```
relay ──POST (HMAC)──▶ webtrigger ingest-change ──▶ change_record (SQL) ──id──▶ match-queue
settings "Replay seeded change" ──▶ the same ingestRecord() ──────────────────▶ match-queue
                                                                                   │
match consumer: bindings by repo ─▶ fetch candidate page bodies asApp (storage) ─▶ scoreChange
                ─▶ upsert drift_event ─▶ recompute page_state (nextPageState) ─▶ byline property
byline modal (asUser checks) ─▶ save anchors ─▶ binding + verification rows ─▶ page_state Verified ─▶ byline property
```

| Path | What it does |
| --- | --- |
| `src/index.ts` | Function entry points: `ingest` (web trigger), `match` (consumer), migrations, resolvers, dev driver |
| `src/lib/ingest.ts` | `ingestRecord()`: dedupe, store `change_record`, push **only its ID** to `match-queue`. The relay and the demo replay both use it |
| `src/lib/matching.ts` | Consumer body. Pass 1 scores paths only (threshold 0, no page bodies) to find candidate pages; pass 2 fetches only those bodies asApp and scores for real. Idempotent |
| `src/lib/page-state.ts` | Recomputes `page_state` from bindings and open events, writes the byline property asApp |
| `src/lib/bindings-service.ts` | Saves a page's anchors (replace-all), closes open events as `resolved`, records a `verification` row, marks the page Verified |
| `src/lib/db.ts` | Forge SQL schema (5 append-only migrations) and queries |
| `src/lib/confluence.ts` | REST v2 pages, properties, operations; v1 current user (admin check) |
| `src/lib/copy.ts`, `anchors.ts`, `ingest-rules.ts`, `suggestions.ts` | Pure helpers (byline copy, anchor validation, dedupe keys, settings parsing, anchor suggestions). Unit-tested |
| `src/lib/demo.ts` | The seeded scenario 01 change record (PR #482), built from `demo/seed/payments-api` with `git diff -M`; identical to `fixtures/scenarios/01-*.json` |
| `src/resolvers/byline.ts`, `src/frontend/byline/` | Byline modal: the binding UI (F1) |
| `src/resolvers/settings.ts`, `src/frontend/settings/` | Global settings (`useAsConfig`): ingest URL, relay secret, relay ping status, sensitivity, ignore globs, demo replay |
| `src/triggers/dev-driver.ts` | Development-only web trigger `dds-dev` for headless end-to-end checks. Inert unless `DDS_DEV_TOKEN` is set. **Remove in M4** |
| `static/icons/doc-drift.svg` | Byline manifest icon: `brand/logos/doc-drift-mark.svg` with its metadata block stripped |

### Data (Forge SQL, [data-model.md](../../docs/architecture/data-model.md))

`binding`, `page_state`, `drift_event`, `change_record`, `verification`. Additions to the data model: `drift_event.change_record_id`, `matched_anchor` and `reasons`; `change_record.dedupe_key`, `origin`, `record` (normalized JSON without hunks), `hunks`, `processed_at`, `outcome`. `binding.repo` is stored lowercased. `max_severity`: 0 none, 1 medium, 2 high. All DATETIMEs are UTC.

Migrations run from `avi:forge:installed:app` / `avi:forge:upgraded:app` through `dds-migration-queue` (900 s consumer), and `ensureSchema()` also runs them lazily once per warm container. Never edit a shipped migration; append a new one.

### Byline

- Property key `dds-byline-7f3c2a` (raw key), value `{title, tooltip}`. **No `icon` in the property**: a property icon renders as the generic app hexagon (live test, 2026-11-11), while the manifest icon renders. So the state word lives in the title (`Doc Drift: Possibly stale`) and the tooltip carries the detail (`PR #482 changed scripts/rollback.sh on Nov 11. Review.`).
- The manifest default (no property yet) reads `Doc Drift: Unanchored`.
- Property writes do not create page versions (page 2752731 is still version 1 after 6 property writes).
- Tooltips use an absolute date ("on Nov 11"), because a stored property can't keep "2h ago" current.

### Permissions (D15, D20, D21)

- The modal's `load` and `save` check the user's rights asUser with `GET /wiki/api/v2/pages/{id}/operations`. Saving needs `update`; every app-owned write after that is asApp.
- Restricted pages (D20, confirmed live): if the user can see the page but the asApp `GET /pages/{id}` returns 404/403, the modal shows "Restricted pages can't be watched yet." and saves nothing.
- Settings resolvers check that the caller is a Confluence admin (`/wiki/rest/api/user/current?expand=operations` has `administer` on `application`). Display conditions are not authorization.
- Scopes: `read:page:confluence`, `write:page:confluence`, `read:confluence-user`, `storage:app`. `search:confluence` and `read:confluence-content.summary` come in M2 with CQL and Confluence events. Every scope change is a major version, so batch them before Dec 1.

### Ingest contract (for the relay)

- `POST` the JSON body; headers `x-dds-signature` (hex HMAC-SHA256 of `${timestamp}.${body}`) and `x-dds-timestamp` (Unix seconds), from `signBody` in `@dds/shared`. ±300 s window.
- Body: a `ChangeRecord` (`parseChangeRecord`; unknown fields dropped), or a ping `{source: "ping", workspaceUuid, sentAt}` which records the connection in KVS (`relay-ping`) and never runs the matcher.
- Responses: 202 `accepted`, 400 `bad-request` (not JSON or invalid record), 401 `unauthorized` (no secret configured, malformed, stale or bad signature). A 5xx means a platform or SQL error; retry.
- Dedupe key `repoUuid#prId#mergeCommit`. A duplicate returns 202 and is re-queued only if its first run never finished.

## Build, test, deploy, install

Every command needs Node 24: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && ...`

The app is a pnpm workspace member (`apps/core` in `pnpm-workspace.yaml`). `forge deploy` bundles `@dds/shared` and `@dds/matcher` through the workspace symlinks, but it resolves their `exports.default`, which is the **built `dist/`**. So always build the packages first:

```sh
pnpm install                         # at the repo root
cd apps/core
pnpm run prebuild:packages           # tsc for @dds/shared and @dds/matcher
pnpm typecheck && pnpm test          # 36 Vitest tests over the pure helpers
forge lint
forge deploy -e development --non-interactive     # or: pnpm deploy:dev (builds packages first)
forge install -e development --site one-atlas-jzzf.atlassian.net --product confluence --non-interactive --confirm-scopes
forge install -e development --site one-atlas-jzzf.atlassian.net --product jira --non-interactive --confirm-scopes   # optional
forge install -e development --upgrade ...        # after a scope change
```

A scope change makes `forge deploy` stop on `MAJOR_VERSION_RULE`; rerun with `--approve MAJOR_VERSION_RULE` only while no judge installs exist.

Web trigger URLs: the settings page shows the ingest URL (`webTrigger.getUrl`). From the CLI: `forge webtrigger create -f ingest-change -s one-atlas-jzzf.atlassian.net -p confluence -e development`. Current dev URL: `https://27236af5-036e-44ad-bb1d-d3bec72a5122.webtrigger.atlassian.app/public/CQnkCYa_S50FsZrpcq8Y8Sd00gY`.

### Environment variables and secrets

| Name | Where | Purpose |
| --- | --- | --- |
| Relay secret | KVS secret store, key `relay-secret` (`kvs.setSecret`) | HMAC key. Generated on the settings page and shown once. `relay-secret-meta` keeps only an 8-character SHA-256 fingerprint for display |
| `DDS_DEV_TOKEN` | Forge variable, **development only**, encrypted | Enables the `dds-dev` driver. Never set it in staging or production |

KVS also holds `settings` (`{sensitivity, ignoreGlobs}`) and `relay-ping`. No secret is ever logged.

### Dev driver (development only)

`POST` to the `dds-dev` web trigger URL with header `x-dds-dev-token` and a JSON body. Results go to `forge logs`. Actions: `bind` (`pageId`, `spaceKey`, `anchors`), `replay` (demo record, fresh dedupe key), `refresh`, `inspect` (SQL rows + byline property for `pageId`), `changes`, `set-secret` (lets a test script sign requests; logs only the fingerprint). Get its URL with `forge webtrigger create -f dds-dev ...`.

## Status (2026-11-11)

### Done and verified on the demo site

- Bundling of the workspace packages (step 0): works with a package build first; no copy step needed.
- Manifest, scopes, Forge SQL + migrations (all 5 applied on install in about 7 s).
- `ingest-change`: no secret 401, bad signature 401, non-JSON 400, invalid record 400, ping 202 (no matcher run), valid change 202, duplicate 202 + deduped. Verified with real signed requests.
- `match-queue` consumer: test page 2752731 (space DDSTEST) anchored to `payments-api: scripts/rollback.sh`. Replaying PR #482 flipped it Verified to **Possibly stale, High** (score 1.00: rename plus the page mentions `ROLLBACK_TIMEOUT`) in about 4 s. Byline property: `Doc Drift: Possibly stale` / `PR #482 changed scripts/rollback.sh on Nov 11. Review.` A redelivered change record refreshed the event instead of duplicating it; re-saving anchors closed the event and wrote a verification row; a later replay reopened it.
- Rename proposals are detected and logged (`DDS_MATCH_RENAME_PROPOSAL`), not applied.
- Reverts close the reverted PR's open events, matching by PR number or, when the revert carries none, by the original title against stored `change_record` titles.

### Built but not yet clicked in a browser

- The byline modal (binding UI) and the settings page. Their resolvers share the code paths verified above, but the UI, the asUser operations check, the admin check and the restricted-page message need the browser checks below.

### Not done (later milestones)

- Debounce (`delayInSeconds`): jobs are queued with no delay. The consumer is idempotent, so bursts are safe, just not batched.
- Applying rename proposals, review panel (Verify, Dismiss, Snooze), notifier, dashboard, escalation trigger, Jira trigger, Confluence page events, Rovo agent, actions, skill, `rovo:mcp` (M2, M3).
- Live byline refresh without a reload (`confluence:backgroundScript` + `updateBylineProperties`): not added. The modal says "Reload the page to update the badge."
- 30-day hunk purge (scheduled trigger).
- The byline icon is the light-theme mark; it has low contrast in Confluence dark mode.

## Manual browser checks for Razvan

Log in to one-atlas-jzzf.atlassian.net as yourself. Tail logs meanwhile: `cd apps/core && forge logs -e development -s 15m` (1 to 2 min lag).

1. **Byline on the test page.** Open https://one-atlas-jzzf.atlassian.net/wiki/spaces/DDSTEST/pages/2752731 . Expect a byline item with the Doc Drift mark reading **Doc Drift: Possibly stale**, tooltip "PR #482 changed scripts/rollback.sh on Nov 11. Review."
2. **Binding modal.** Click the byline item. Expect: the Possibly stale state (icon and word), a "What changed" row for `PR #482` (High, anchor `payments-api: scripts/rollback.sh`), the anchor table with 1 row, and suggestions from the page body (`payments-api: deploy/helm/values.yaml`, `payments-api (whole repo)`). Tick `deploy/helm/values.yaml`, add a manual anchor (Repository `payments-api`, Anchor path `deploy/helm/**`, Weight Critical), and click **Save anchors and mark verified**. Expect "Saved 3 anchors. This page is Verified." Reload: the byline reads **Doc Drift: Verified**, tooltip "Verified on … Watching 3 anchors." Logs: `DDS_BINDINGS_SAVED`.
3. **Settings page.** Open https://one-atlas-jzzf.atlassian.net/wiki/plugins/servlet/upm , find Doc Drift Sentinel (Development), and click **Configure** (or Confluence settings, then the app's configure link). Expect: the ingest URL above, "Connected: workspace {11111111-…}" from my test ping, and a secret with fingerprint `d376f98b` (set by my test script). Click **Rotate secret**: a new secret shows once. Paste it and the ingest URL into the relay's workspace settings, then use the relay's **Send test ping**; reload settings and check the workspace UUID.
4. **Demo replay.** On the settings page, click **Replay seeded change**. After about a minute, reload the test page: it should read **Doc Drift: Possibly stale** again (logs: `DDS_INGEST stored ... origin=demo`, `DDS_MATCH_DONE`).
5. **Restricted page (D20).** In DDSTEST, create a page and restrict viewing to yourself only. Open the Doc Drift byline item on it. Expect "Restricted pages can't be watched yet." and no Save button. Logs: `DDS_BYLINE_RESTRICTED`.
6. **View-only user (D15, optional).** As a user with view but not edit rights on page 2752731, open the modal. Expect "You need edit rights on this page to change its anchors." and a disabled Save button.
7. **Non-admin settings (optional).** As a non-admin, the settings resolvers return "Only Confluence administrators can change Doc Drift Sentinel settings." If you, an admin, see that message, send me the `DDS_ADMIN_CHECK` log line: the admin check would need adjusting.

Cleanup when M1 is accepted: delete the DDSTEST space, and `forge variables unset -e development DDS_DEV_TOKEN`.
