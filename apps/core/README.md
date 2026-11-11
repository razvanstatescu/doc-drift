# Doc Drift Sentinel: core app

The core Forge app. Confluence is required and Jira is optional (`app.compatibility`). It stores page anchors, receives HMAC-signed change records from the Bitbucket relay and Jira issue events, runs the deterministic matcher, writes each page's state to the byline content property, and serves the review panel, the space dashboard and the owner notifications. Milestones M1 and M2 (backend) of [docs/implementation-plan.md](../../docs/implementation-plan.md).

| | |
| --- | --- |
| App ID | `ari:cloud:ecosystem::app/12e968a1-a45d-4524-ba28-d47e2315db1a` |
| Developer Space | Doc Drift (`af90295c-aad7-4188-9754-122ee3c4c6f4`) |
| Development env ID | `b7eadd8c-211c-4cdf-98c0-86172909ead2` (version 4.5.0 on 2026-11-11; 4.0.0 was the M2 scope change) |
| Installed | development, one-atlas-jzzf.atlassian.net: Confluence (required) + Jira (connected). Installation `27236af5-036e-44ad-bb1d-d3bec72a5122` |
| Runs on Atlassian | Eligible (every deploy so far) |

## Architecture

```
relay ──POST (HMAC)──▶ webtrigger ingest-change ──▶ change_record (SQL) ──id──▶ match-queue
avi:jira:updated:issue / deleted:issue ──▶ Jira ChangeRecord ──▶ ingestRecord() ──▶ match-queue
settings "Replay seeded change" ──▶ the same ingestRecord() ──────────────────▶ match-queue
                                                                                   │
match consumer: bindings by repo or Jira key ─▶ candidate page bodies asApp ─▶ scoreChange
   ─▶ revert? close the reverted PR's events ─▶ else upsert drift_event + rename_proposal
   ─▶ recompute page_state (nextPageState, D27) ─▶ byline property ─▶ notify-queue (delayInSeconds)
notify consumer ─▶ footer comment @owner (1 per page per 24 h; appends inside the window)
hourly dds-escalation ─▶ Possibly stale past escalationDays ─▶ Stale; bylines whose snooze ended
avi:confluence:trashed|deleted:page ─▶ close events, drop bindings, proposals, state
byline-resolver (asUser checks, D15/D20) ─▶ review panel, binding modal, dashboard ─▶ asApp writes
```

| Path | What it does |
| --- | --- |
| `src/index.ts` | Function entry points: `ingest` (web trigger), `match` and `notify` (consumers), `jiraEvent`, `confluencePageEvent`, `escalate`, migrations, resolvers, dev driver |
| `src/lib/ingest.ts` | `ingestRecord()`: dedupe, store `change_record`, push **only its ID** to `match-queue`. The relay and the demo replay both use it |
| `src/lib/matching.ts` | Consumer body. Pass 1 scores paths only (threshold 0, no page bodies) to find candidate pages; pass 2 fetches only those bodies asApp and scores for real. Idempotent |
| `src/lib/page-state.ts` | Recomputes `page_state` from bindings and open events (D27 via `nextPageState`, snoozes, `escalationDays`), fills the page owner, writes the byline property asApp |
| `src/lib/review-service.ts` | Review panel and dashboard services: `pageDrift`, `markVerified`, `dismissEvent`, `snoozePage`, `decideRename`, `spaceDashboard`. Each write takes a `Gate` (the resolver's asUser check) |
| `src/lib/review.ts` | Pure helpers: affected sections, event rows, dismiss/snooze input, notifier copy and 24 h plan, Jira event to ChangeRecord, deleted-issue events, dashboard ranking and median. Unit-tested |
| `src/lib/notifier.ts` | `notify-queue` consumer body: footer comment with an @mention of the page owner |
| `src/triggers/product-events.ts` | Jira issue updated/deleted, Confluence page trashed/deleted, hourly escalation |
| `src/lib/bindings-service.ts` | Saves a page's anchors (replace-all), closes open events as `resolved`, records a `verification` row, marks the page Verified |
| `src/lib/db.ts` | Forge SQL schema (10 append-only migrations) and queries |
| `src/lib/confluence.ts` | REST v2 pages, properties, operations; v1 current user (admin check) |
| `src/lib/copy.ts`, `anchors.ts`, `ingest-rules.ts`, `suggestions.ts` | Pure helpers (byline copy, anchor validation, dedupe keys, settings parsing, anchor suggestions). Unit-tested |
| `src/lib/demo.ts` | The seeded scenario 01 change record (PR #482), built from `demo/seed/payments-api` with `git diff -M`; identical to `fixtures/scenarios/01-*.json` |
| `src/resolvers/byline.ts`, `src/frontend/byline/` | `byline-resolver`: the byline modal (binding UI F1, review panel F5) **and** the space dashboard (F8). All UI resolvers live on this one function |
| `src/resolvers/settings.ts`, `src/frontend/settings/` | Global settings (`useAsConfig`): ingest URL, relay secret, relay ping status, sensitivity, ignore globs, demo replay |
| `src/triggers/dev-driver.ts` | Development-only web trigger `dds-dev` for headless end-to-end checks. Inert unless `DDS_DEV_TOKEN` is set. **Remove in M4** |
| `static/icons/doc-drift.svg` | Byline manifest icon: `brand/logos/doc-drift-mark.svg` with its metadata block stripped |

### Data (Forge SQL, [data-model.md](../../docs/architecture/data-model.md))

`binding`, `page_state`, `drift_event`, `change_record`, `verification`, `rename_proposal`, `notification`. Additions to the data model: `drift_event.change_record_id`, `matched_anchor`, `reasons`, `matched_tokens` (removed identifiers the page mentions), `closed_by`; `change_record.dedupe_key`, `origin`, `record` (normalized JSON without hunks), `hunks`, `processed_at`, `outcome` (`title` holds the issue summary for Jira); `verification.drift_since` (oldest closed event, for time to verify). `binding.repo` is stored lowercased. `max_severity`: 0 none, 1 medium, 2 high. All DATETIMEs are UTC.

- **Event status**: `open` (a snoozed event stays `open` with `snoozed_until` set), `dismissed` (with `dismiss_reason`), `resolved` (verified, or `dismiss_reason = page_removed`), `reverted`.
- **`rename_proposal`**: one row per binding and rename (unique on a SHA-256 `proposal_key`: a unique key over the raw paths exceeds the index length limit). `open`, `accepted`, `rejected`.
- **`notification`**: one row per page: the footer comment ID and version, the 24 h window start, the notified `eventId@changeRecordId` keys, and `body_lines` (`LINES` is a reserved word in MySQL).

Migrations run from `avi:forge:installed:app` / `avi:forge:upgraded:app` through `dds-migration-queue` (900 s consumer), and `ensureSchema()` also runs them lazily once per warm container. Never edit a shipped migration; append a new one.

### Byline

- Property key `dds-byline-7f3c2a` (raw key), value `{title, tooltip}`. **No `icon` in the property**: a property icon renders as the generic app hexagon (live test, 2026-11-11), while the manifest icon renders. So the state word lives in the title (`Doc Drift: Possibly stale`) and the tooltip carries the detail (`PR #482 changed scripts/rollback.sh on Nov 11. Review.`).
- The manifest default (no property yet) reads `Doc Drift: Unanchored`.
- Property writes do not create page versions (page 2752731 is still version 1 after 6 property writes).
- The manifest `title` is the state-neutral `Doc Drift`: the modal's top bar shows it (the M1 "Doc Drift: Unanchored" header bug). The page byline gets its state title from the property.
- Tooltips: `PR #482 changed scripts/rollback.sh on Nov 11. Review.`, `PAY-21 moved to Done on Nov 11. Review.`, `… Snoozed until Nov 18.` when every open event is snoozed, `Unreviewed drift for 8 days (1 change). Agents told not to trust this page.` `(+N changes)` counts distinct changes, not events.
- Tooltips use an absolute date ("on Nov 11"), because a stored property can't keep "2h ago" current.

### Permissions (D15, D20, D21)

- Every resolver checks the user's rights asUser with `GET /wiki/api/v2/pages/{id}/operations` before any asApp write. `read` is enough for Mark verified, Dismiss and Snooze (architecture/overview.md: "read for verify"); saving anchors and accepting or rejecting a rename need `update`. A page the user can't read returns `{ok:false, error:'not_visible', state:'unknown', message:'Page not found or not visible to you.'}` with no title.
- The dashboard reads asUser: only pages in the caller's space listing count or show.
- Restricted pages (D20, confirmed live): if the user can see the page but the asApp `GET /pages/{id}` returns 404/403, the modal shows "Restricted pages can't be watched yet." and saves nothing.
- Settings resolvers check that the caller is a Confluence admin (`/wiki/rest/api/user/current?expand=operations` has `administer` on `application`). Display conditions are not authorization.
- Scopes: `read:page:confluence`, `write:page:confluence`, `read:confluence-user`, `storage:app`, and from M2 (version 4.0.0): `write:comment:confluence` (footer comments), `read:space:confluence` (space ID by key), `read:confluence-content.summary` + `write:confluence-content` (page trashed/deleted events need both, per the Confluence events reference), `read:jira-work` (Jira trigger and issue fetch). `search:confluence` is still not needed. Every scope change is a major version, so batch them before Dec 1.

### Ingest contract (for the relay)

- `POST` the JSON body; headers `x-dds-signature` (hex HMAC-SHA256 of `${timestamp}.${body}`) and `x-dds-timestamp` (Unix seconds), from `signBody` in `@dds/shared`. ±300 s window.
- Body: a `ChangeRecord` (`parseChangeRecord`; unknown fields dropped), or a ping `{source: "ping", workspaceUuid, sentAt}` which records the connection in KVS (`relay-ping`) and never runs the matcher.
- Responses: 202 `accepted`, 400 `bad-request` (not JSON or invalid record), 401 `unauthorized` (no secret configured, malformed, stale or bad signature). A 5xx means a platform or SQL error; retry.
- Dedupe key `repoUuid#prId#mergeCommit`. A duplicate returns 202 and is re-queued only if its first run never finished.

## Resolver contract (`byline-resolver`, M2)

All calls go to the `byline-resolver` function (the byline modal and the dashboard's `confluence:spacePage` both use it). Times are epoch milliseconds. Failures are `{ok:false, error, message}` with a user-facing `message`; `error` is one of `not_visible`, `restricted`, `forbidden`, `bad_request`, `not_found`, `not_open`, `nothing_open`, `binding_changed`.

| Call | Payload | Returns |
| --- | --- | --- |
| `getPageDrift` | `{pageId?}` (defaults to the context page) | `{ok, pageId, title, state, status, statusLabel, canEdit, restricted, verifiedAt, verifiedBy:{accountId, displayName}\|null, events, affectedSections, renameProposals, bindings, suggestions}`. A restricted page returns `{ok:true, restricted:true, message}` and nothing else |
| `markVerified` | `{pageId?, note?}` | `{ok, state, statusLabel, closedEvents, message}` |
| `dismissEvent` | `{eventId, reason: 'not_relevant'\|'already_updated'\|'false_positive'}` | `{ok, pageId, state, openEvents, message}` |
| `snoozePage` | `{pageId?, days: 1..30}` | `{ok, state, snoozedUntil, message}` |
| `acceptRename` / `rejectRename` | `{proposalId}` | `{ok, pageId, state, message}` |
| `getSpaceDashboard` | `{spaceKey?}` (defaults to the context space) | `{ok, spaceKey, kpis:{anchored, total, anchoredPct, possiblyStale, stale, medianTimeToVerifyDays\|null}, pages:[…], owners:[{ownerId, ownerName, open, pages}], truncated}` |
| `load`, `checkAnchor`, `save` | M1, unchanged | M1 shapes (`load` is kept as an alias) |

- **`events[]`**: `{id, source, ref ('PR #482' or 'PAY-21'), title (PR title or issue summary), author, at, summary, files:[{path, status, oldPath?}], severity, score, anchor, reasons, status: 'open'|'snoozed', snoozedUntil, url (Bitbucket PR link or null)}`, newest first. Only open events (snoozed ones included, with `status: 'snoozed'`).
- **`affectedSections[]`**: `{heading, excerpt (≤ 300 chars, `…` where cut), matchedTokens}` from the page body (asUser, storage format), split at headings (`Top of page` before the first). Tokens: changed paths and old paths, distinctive file names, removed identifiers the page mentions, Jira keys. Whole-token match (`ROLLBACK_TIMEOUT` does not match `ROLLBACK_TIMEOUT_SECS`). At most 5.
- **`renameProposals[]`**: `{id, bindingId, from, to, anchor}`. Accept rewrites the binding's pattern; a binding edited since is refused with `binding_changed`.
- **`bindings[]`**: the M1 `anchors` shape plus `dismissCount`.
- **`pages[]`**: `{pageId, title, url, status, statusLabel, maxSeverity: 'high'|'medium'|null, openEvents, since, ownerId, ownerName}`, anchored pages only, ranked by severity, then the oldest open drift, then title. `total` is every current page in the space the caller can see (REST v2 listing); counts are Forge SQL `GROUP BY` over the visible anchored pages.

### Page state (D27, `nextPageState` in `@dds/matcher`)

- The first drift on a Verified page is always Possibly stale, whatever its severity.
- Possibly stale becomes Stale when the oldest unsnoozed event is `escalationDays` old (default 7, settings), or 3+ **distinct changes** are open, or a High event on a critical anchor comes from a change other than the page's first open change. Stale stays Stale until verified or every event is dismissed.
- Snoozed events don't count. If every open event is snoozed, the page reads Possibly stale (never Verified or Stale) and the tooltip says until when. A snooze that ends restarts that event's escalation clock at the snooze end.
- Time escalation runs in the hourly `dds-escalation` scheduled trigger; count and further-High escalation happen when the event lands.

### Jira (F4)

- `avi:jira:updated:issue`, filtered on changelog `fieldId` in `status, resolution, fixVersions, components, description, summary, parent, IssueParentAssociation`, `ignoreSelf`, `onError: RECEIVE_AND_LOG`. The handler re-checks the fields, skips issues no page anchors, fetches the issue asApp (`summary, status, resolution, fixVersions, components, parent`), builds a Jira ChangeRecord (`statusCategory` from the issue, display values from `fromString`/`toString`, fix versions and components filled from the issue when the changelog has none) and calls `ingestRecord` (origin `jira`, issue summary as the title).
- `avi:jira:deleted:issue` (`ignoreSelf`): every page anchored to the issue gets an event "`PAY-22` was deleted" (score 0.7; High on a critical anchor). The matcher has no rule for it, so `processChange` scores it.
- Live: moving `PAY-21` (label `dds-test`) to Done flagged DDSTEST page 3047452 in about 20 s; changelog `resolution` + `status`, `statusCategory: done`.

### Notifier (F7)

- After a match, every page with a new or reopened event is pushed to `notify-queue` with `delayInSeconds` = `notifyDelaySeconds` (settings, default 600, 0 for demos, max 900). The first job to run sends everything not yet notified; later jobs find nothing new (debounce).
- Comment: `@owner PR #482 (merged by Sam Rivera) changed 2 files this page documents. Review in the Doc Drift badge.` Jira: `@owner PAY-21 moved to Done. This page is anchored to it. Review in the Doc Drift badge.` Owner = the page's `ownerId`.
- At most 1 comment per page per 24 h. Inside the window the same comment gets `Since then: …` paragraphs (PUT with the stored version), and the `notification` row keeps every line. Snoozed events don't notify. `notifyEnabled: false` turns it off.

### Reverts and page removal

- A PR titled `Revert "<title>"` closes the open events of the original change as `reverted`: by `(pull request #N)` when present, else by the original title among stored change records in the same repo. A revert of a revert scores as a normal change.
- `avi:confluence:trashed:page` / `deleted:page` (selfGenerated dropped in the handler: `ignoreSelf` is Jira-only, `forge lint` rejects it here): open events close as `resolved` with `page_removed`, and the page's bindings, rename proposals, notification row and `page_state` are deleted.

## Build, test, deploy, install

Every command needs Node 24: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && ...`

The app is a pnpm workspace member (`apps/core` in `pnpm-workspace.yaml`). `forge deploy` bundles `@dds/shared` and `@dds/matcher` through the workspace symlinks, but it resolves their `exports.default`, which is the **built `dist/`**. So always build the packages first:

```sh
pnpm install                         # at the repo root
cd apps/core
pnpm run prebuild:packages           # tsc for @dds/shared and @dds/matcher
pnpm typecheck && pnpm test          # 57 Vitest tests over the pure helpers
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

KVS also holds `settings` (`{sensitivity, ignoreGlobs, escalationDays, notifyEnabled, notifyDelaySeconds}`; `saveSettings` keeps the current value of any field the form leaves out) and `relay-ping`. No secret is ever logged.

### Dev driver (development only)

`POST` to the `dds-dev` web trigger URL with header `x-dds-dev-token` and a JSON body. Each result is logged (`DDS_DEV_<ACTION>`) **and** written to the content property `dds-dev-result` of `resultPageId` (default DDSTEST page 2752731), so a script reads it over REST at once instead of waiting for `forge logs`. Get the URL with `forge webtrigger create -f dds-dev ...`.

| Action | Body | Does |
| --- | --- | --- |
| `bind` | `pageId, spaceKey, anchors` | Replace anchors and mark Verified |
| `replay` | | Demo record, fresh dedupe key |
| `ingest` | `record, title?, sync?` | Any ChangeRecord (PRs, reverts, Jira), fresh dedupe key; `sync: true` also matches inline and returns the outcome |
| `match` | `changeRecordId` | Re-run the matcher |
| `refresh`, `inspect` | `pageId` | Recompute state; SQL rows + byline property |
| `drift` | `pageId` | `getPageDrift` with an asApp reader |
| `verify`, `snooze`, `dismiss`, `accept-rename`, `reject-rename` | as the resolvers | The resolver services with an open gate (no user) |
| `dashboard` | `spaceKey` | `getSpaceDashboard` with an asApp reader |
| `escalate`, `notify` | `pageId` for notify | Run the hourly job or the notifier now |
| `age` | `pageId, days` | Move the page's open events back in time (escalation tests) |
| `jira-event`, `page-event` | `event` | Feed a synthetic product event to the handler |
| `settings` | `settings` | Merge into the stored settings (validated) |
| `changes`, `set-secret` | | As in M1 |

The asUser permission checks can't run here (no user): they are in the browser checks below.

## Status (2026-11-11, M2 backend)

### Verified live on the demo site (headless, dev driver + REST)

All on DDSTEST page 3047452 ("Doc Drift M2 test page", anchors `scripts/deploy.sh` critical, `src/app.ts` normal, `PAY-21`) unless noted.
- **D27**: a first High on the critical anchor read Possibly stale (not Stale); a further High from another PR escalated to Stale; 3 distinct Medium changes escalated on the third; one event aged 8 days was escalated by the hourly job (`Unreviewed drift for 8 days (1 change)…`).
- **Rename**: the rename PR stored a proposal; accept rewrote the binding to `scripts/deploy-v2.sh`; a second accept returned "already handled".
- **Verify** closed 2 events, wrote a verification row with `drift_since`, byline Verified. **Dismiss**: a bad reason is refused; 3 dismissals raised the anchor's `dismissCount` to 3, the page went back to Verified after the last, and the same-size change then scored under the threshold (dampener). **Snooze**: 40 days refused; 7 days turned a Stale page Possibly stale with `… Snoozed until Nov 18.`, and the hourly job left it alone.
- **Revert** by title (`Revert "Switch deploy to helmfile"`) and by number (`(pull request #9010)`) closed the original events; the page returned to Verified.
- **Jira**: moving `PAY-21` to Done flagged the page in about 20 s (real `avi:jira:updated:issue`); the review view shows the issue summary, the actor and the 2 sections that mention `PAY-21`.
- **Deleted issue** (synthetic event through the driver: the API account can't delete issues, 403): page 3047509 flagged with `PAY-22 was deleted`.
- **Page trashed** (real event): 19 s after trashing page 3047509, its event closed and its 2 bindings and state were gone.
- **Notifier**: footer comment 3080240 @mentions the owner; 10 later changes in the window appended `Since then:` lines to the same comment; with a 20 s delay, 2 PRs became 1 update about 25 s later.
- **getPageDrift** (asApp reader): events with file statuses and old paths, affected sections (`Deploy`, excerpt with `./scripts/deploy.sh`), rename proposals, bindings, suggestions.
- **Dashboard** DDSTEST: total 3, anchored 2, Possibly stale 2, median time to verify 4 days; PLAT: total 25, anchored 18 (72%), Stale 1 (the PLAT rollback runbook, flagged under the M1 rule before D27; it stays Stale until someone verifies it).
- Matcher: 144 tests and the eval still green (precision 1.00, recall 0.94). Core: 57 Vitest tests.

### Built but not yet clicked in a browser

- Every resolver's asUser path: the operations check, `not_visible`, `forbidden`, restricted pages, `verifiedBy.displayName` and owner names read asUser.
- The UI (review panel, dashboard): built by the UI agent in a separate worktree, not deployed from this tree.

### Not done

- Live byline refresh without a reload (`confluence:backgroundScript`).
- 30-day hunk purge (scheduled trigger).
- A real `avi:jira:deleted:issue` (needs an account with delete permission).
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

### M2 checks (after the UI worktree is merged and deployed)

8. **Review panel.** Open https://one-atlas-jzzf.atlassian.net/wiki/spaces/DDSTEST/pages/3047452 . The byline reads **Doc Drift: Possibly stale**, tooltip "PAY-21 moved to Done on Nov 11. Review." Click it. Expect the modal header "Doc Drift" (no state), the state word and icon, a `PAY-21` row (Medium, title "Doc Drift test: rollback timeout follow-up"), and affected sections "Top of page" and "Follow-up work".
9. **Verify.** Click **Mark verified** with a note. Expect "Marked verified. Closed 1 change." and, after a reload, **Doc Drift: Verified**. Logs: `DDS_VERIFIED`.
10. **Dismiss and snooze.** Move `PAY-21` back to In Progress, then to Done again; within about 30 s the page flags again. Dismiss with "False positive": the page goes back to Verified. Repeat and click **Snooze 7 days**: the tooltip ends "Snoozed until …".
11. **Rename.** Replay the demo (settings) and open page 2752731: the panel offers `scripts/rollback.sh` to `scripts/rollback-v2.sh`. Click **Reject** (keep the demo anchor as is). Accept needs edit rights; as a view-only user expect "You need edit rights on this page to change its anchors."
12. **Footer comment.** Page 3047452 has one Doc Drift comment that mentions you and lists every change since its first line. Check that Confluence sent you a mention notification.
13. **Dashboard.** Open the DDSTEST space, then the Doc Drift space page. Expect KPI tiles (3 pages, 2 anchored), pages ranked by severity, and you as owner. Repeat in PLAT: 25 pages, 18 anchored, the rollback runbook Stale on top.
14. **Restricted page (D20).** On the restricted page from check 5, `getPageDrift` returns `restricted: true` and the panel says "Restricted pages can't be watched yet."
15. **Settings.** `escalationDays`, `notifyEnabled` and `notifyDelaySeconds` are stored with the other settings (current values: 7, on, 600). If the settings form does not show them yet, saving it keeps them.

Cleanup when M1 is accepted: delete the DDSTEST space, and `forge variables unset -e development DDS_DEV_TOKEN`.
