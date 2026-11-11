# Doc Drift Sentinel: core app

The core Forge app. Confluence is required and Jira is optional (`app.compatibility`). It stores page anchors, receives HMAC-signed change records from the Bitbucket relay and Jira issue events, runs the deterministic matcher, writes each page's state to the byline content property, serves the review panel, the space dashboard and the owner notifications, and exposes the Drift Reviewer Rovo agent, its actions and skill, and a `rovo:mcp` server for coding agents. Milestones M1, M2 and M3 (backend) of [docs/implementation-plan.md](../../docs/implementation-plan.md).

| | |
| --- | --- |
| App ID | `ari:cloud:ecosystem::app/12e968a1-a45d-4524-ba28-d47e2315db1a` |
| Developer Space | Doc Drift (`af90295c-aad7-4188-9754-122ee3c4c6f4`) |
| Development env ID | `b7eadd8c-211c-4cdf-98c0-86172909ead2` (version 4.13.0 on 2026-11-11, M4 settings and review fixes; 4.10.0 was M3 with D29; 4.0.0 was the M2 scope change) |
| MCP endpoint | `https://mcp.atlassian.com/forge/12e968a1-a45d-4524-ba28-d47e2315db1a` (`rovo:mcp` "Doc Drift": `check-page-freshness`, `find-docs-for-path`, `list-stale-pages`) |
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
daily dds-purge ─▶ diff hunks older than 30 days set to NULL (metadata kept)
avi:confluence:trashed|deleted:page ─▶ close events, drop bindings, proposals, state
byline-resolver (asUser checks, D15/D20) ─▶ review panel, binding modal, dashboard ─▶ asApp writes
Rovo chat / Rovo Studio / MCP client ─▶ action (asUser only, D21) ─▶ freshness, docs for a path, stale pages,
   drift context, record verification, submit-fix-proposal ─▶ fix_proposal row (never the page)
review panel Accept fix ─▶ applyProposal: edit check asUser ─▶ storage-edit ─▶ PUT page asUser (version message)
   ─▶ close events, verification (accepted_proposal), byline asApp
```

| Path | What it does |
| --- | --- |
| `src/index.ts` | Function entry points: `ingest` (web trigger), `match` and `notify` (consumers), `jiraEvent`, `confluencePageEvent`, `escalate`, migrations, resolvers, dev driver |
| `src/lib/ingest.ts` | `ingestRecord()`: dedupe, store `change_record`, push **only its ID** to `match-queue`. The relay and the demo replay both use it |
| `src/lib/matching.ts` | Consumer body. Pass 1 scores paths only (threshold 0, no page bodies) to find candidate pages; pass 2 fetches only those bodies asApp and scores for real. Idempotent |
| `src/lib/page-state.ts` | Recomputes `page_state` from bindings and open events (D27 via `nextPageState`, snoozes, `escalationDays`), fills the page owner, writes the byline property asApp |
| `src/lib/review-service.ts` | Review panel and dashboard services: `pageDrift`, `markVerified`, `dismissEvent`, `snoozePage`, `decideRename`, `spaceDashboard`. Each write takes a `Gate` (the resolver's asUser check) |
| `src/lib/review.ts` | Pure helpers: affected sections, event rows, dismiss/snooze input, notifier copy and 24 h plan, Jira event to ChangeRecord, deleted-issue events, dashboard ranking and median. Unit-tested |
| `src/actions/index.ts` | Rovo action entry points (M3): asUser deps, `NeedsAuthenticationError` to `consent_required` (D21), `DDS_TOOL` logs |
| `src/lib/agent-service.ts` | The tools: `checkPageFreshness`, `findDocsForPath`, `listStalePages`, `getDriftContext`, `recordAgentVerification`. Reader-injected, so the dev driver runs them asApp |
| `src/lib/fix-service.ts` | Propose fix: `submitFixProposal` (resolves one block, dry-runs the edit, stores a draft, never writes the page; a new draft for the same block replaces the open one), `listProposals`, `applyProposal` (asUser PUT, version message, verification), `rejectProposal` |
| `src/lib/blocks.ts` | Pure (D29): page blocks (`b1`, `b2`, ... paragraphs, list items, table cells, headings, code bodies) with raw-offset maps; `resolveTarget` (one block, or `spans_blocks` / `not_found` with candidates / `ambiguous`); `applyBlockEdit` (by ID, then the one block that still holds the original; prose edits only the characters that differ, code replaces CDATA raw). Unit-tested |
| `src/lib/storage-edit.ts` | Pure: replaces `originalText` with `proposedText` inside the named section of a storage body, in code macro CDATA or prose, after whitespace normalisation; `not_found`, `ambiguous`, `section_not_found` or `unsupported_span` otherwise. Unit-tested |
| `src/lib/agent-tools.ts` | Pure: input parsing (page ID, URL, title, repo, limit), path/folder/glob matching, `guidance` copy, diff filtering, the 15 KB context cap, version message, draft validation. Unit-tested |
| `src/lib/access.ts` | `makeGate(user, app)`: the asUser operations check and the D20 restriction check, shared by resolvers and actions |
| `prompts/drift-reviewer.md`, `skills/check-page-freshness/SKILL.md` | The agent prompt (resource `agent-prompt`) and the skill |
| `src/lib/notifier.ts` | `notify-queue` consumer body: footer comment with an @mention of the page owner |
| `src/triggers/product-events.ts` | Jira issue updated/deleted, Confluence page trashed/deleted, hourly escalation |
| `src/lib/bindings-service.ts` | Saves a page's anchors (replace-all), closes open events as `resolved`, records a `verification` row, marks the page Verified |
| `src/lib/db.ts` | Forge SQL schema (10 append-only migrations) and queries |
| `src/lib/confluence.ts` | REST v2 pages, properties, operations; v1 current user (admin check) |
| `src/lib/copy.ts`, `anchors.ts`, `ingest-rules.ts`, `suggestions.ts` | Pure helpers (byline copy, anchor validation, dedupe keys, settings parsing, anchor suggestions). Unit-tested |
| `src/lib/demo.ts` | The seeded scenario 01 change record (PR #482), built from `demo/seed/payments-api` with `git diff -M`; identical to `fixtures/scenarios/01-*.json` |
| `src/resolvers/byline.ts`, `src/frontend/byline/` | `byline-resolver`: the byline modal (binding UI F1, review panel F5) **and** the space dashboard (F8). All UI resolvers live on this one function |
| `src/resolvers/settings.ts`, `src/frontend/settings/` | Global settings (`useAsConfig`, F13): sensitivity, ignore globs, branch filter, watched spaces, escalation days, notifications and debounce, Jira on/off, the relay connection panel (last ping, last record, workspace, repos seen), ingest URL, relay secret, demo replay |
| `src/triggers/dev-driver.ts` | Development-only web trigger `dds-dev` for headless end-to-end checks. Inert unless `DDS_DEV_TOKEN` is set (unit-tested). **Must be removed before any production deploy (H1)**: see the warning under Dev driver |
| `static/icons/doc-drift.svg` | Byline manifest icon: `brand/logos/doc-drift-mark.svg` with its metadata block stripped |

### Data (Forge SQL, [data-model.md](../../docs/architecture/data-model.md))

`binding`, `page_state`, `drift_event`, `change_record`, `verification`, `rename_proposal`, `notification`, and from M3 `fix_proposal` (migration v011). Additions to the data model: `drift_event.change_record_id`, `matched_anchor`, `reasons`, `matched_tokens` (removed identifiers the page mentions), `closed_by`; `change_record.dedupe_key`, `origin`, `record` (normalized JSON without hunks), `hunks`, `processed_at`, `outcome` (`title` holds the issue summary for Jira); `verification.drift_since` (oldest closed event, for time to verify). `binding.repo` is stored lowercased. `max_severity`: 0 none, 1 medium, 2 high. All DATETIMEs are UTC.

- **Event status**: `open` (a snoozed event stays `open` with `snoozed_until` set), `dismissed` (with `dismiss_reason`), `resolved` (verified, or `dismiss_reason = page_removed`), `reverted`.
- **`rename_proposal`**: one row per binding and rename (unique on a SHA-256 `proposal_key`: a unique key over the raw paths exceeds the index length limit). `open`, `accepted`, `rejected`.
- **`fix_proposal`**: one row per draft: page, `event_ids` (the open events whose tokens appear in that section, else all open events), `refs` (`PR #482`), section heading as the page spells it, `block_id` and `block_kind` (D29, migrations v012 and v013; NULL on older drafts, which apply by section and text), original text (the whole block, or the span the agent named) and proposed text, rationale, `status` `open`/`accepted`/`rejected` (the UI calls accepted `applied`), `created_by` (the Rovo user's account ID), `applied_version`. Trashing the page rejects its open drafts.
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

- Every resolver checks the user's rights asUser with `GET /wiki/api/v2/pages/{id}/operations` before any asApp write. `read` is enough for Mark verified; Dismiss and Snooze need `update` since M4 (finding M3: a dismissal dampens the anchor for everyone), as do saving anchors, renames and fixes. A view-only user gets `forbidden`, "You need edit rights on this page to dismiss or snooze its changes."
- **Evidence (D30)**: viewers get summaries (ref, author, time, paths with status and line counts, severity, anchor, reasons); `getPageDrift` and `get-drift-context` add raw diffs (`diff`) and full Jira values (`changelog`) only for callers with `update`. Viewers' Jira changelogs keep short values (status, versions) and mark free-text fields `{field, changed: true}`. MCP tools never return hunks. A page the user can't read returns `{ok:false, error:'not_visible', state:'unknown', message:'Page not found or not visible to you.'}` with no title.
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
| `getPageDrift` | `{pageId?}` (defaults to the context page) | `{ok, pageId, title, state, status, statusLabel, canEdit, canVerify, canDismiss, canSnooze, canEditAnchors, canAcceptFix, evidenceLevel, snoozedUntil, space, restricted, verifiedAt, verifiedBy:{accountId, displayName}\|null, events, affectedSections, renameProposals, bindings, suggestions}` (M4 fields below). A restricted page returns `{ok:true, restricted:true, message}` and nothing else |
| `markVerified` | `{pageId?, note?}` | `{ok, state, statusLabel, closedEvents, message}` |
| `dismissEvent` | `{eventId, reason: 'not_relevant'\|'already_updated'\|'false_positive'}` | `{ok, pageId, state, openEvents, message}` |
| `snoozePage` | `{pageId?, days: 1..30}` | `{ok, state, snoozedUntil, message}` |
| `acceptRename` / `rejectRename` | `{proposalId}` | `{ok, pageId, state, message}` |
| `getSpaceDashboard` | `{spaceKey?}` (defaults to the context space) | `{ok, spaceKey, kpis:{anchored, total, anchoredPct, possiblyStale, stale, medianTimeToVerifyDays\|null}, pages:[…], owners:[{ownerId, ownerName, open, pages}], truncated}` |
| `getProposals` | `{pageId?}` | `[{id, eventIds, refs, sectionHeading, blockId, blockKind, originalText, proposedText, rationale, createdBy:{accountId, displayName}\|null, createdAt, status:'open'\|'applied'\|'rejected', appliedVersion?}]`, newest first, 20 at most |
| `applyProposal` | `{proposalId}` | `{ok:true, pageId, version, versionMessage, closedEvents, pendingDrafts, state, statusLabel, message}`. Needs edit rights. Applies to the draft's block (D29). The events close, and a verification is recorded, once no other open draft answers the same events (`pendingDrafts` 0); until then the page stays flagged. `error: 'not_found'` when the block no longer holds the original text; also `ambiguous`, `unsupported_span`, `not_open` (already handled), `forbidden`, `update_failed` |
| `rejectProposal` | `{proposalId}` | `{ok, pageId, message}`. Needs edit rights. The page is unchanged |
| `getRovoAgentInfo` | none | `{ok, agentName: 'Drift Reviewer', agentKey: 'drift-reviewer'}` for `rovo.open({type: 'forge', agentName, agentKey, prompt})` |
| `load`, `checkAnchor`, `save` | M1, unchanged | M1 shapes (`load` is kept as an alias) |

- **M4 fields of `getPageDrift`**:
  - `canVerify` (read: always true here), `canDismiss`, `canSnooze`, `canEditAnchors`, `canAcceptFix` (all `update`).
  - `evidenceLevel`: `'full'` for `update` callers, else `'summary'` (D30).
  - `snoozedUntil`: epoch ms when every open event is snoozed (the latest end), else `null`. Snoozed events are still in `events`.
  - `space: {key, watched, canConfigure, settingsUrl}`: `key` from the module context, else the stored state or bindings; `watched` is false when settings watch selected spaces and this is not one (new changes create no events); `canConfigure` is true for Confluence administrators, who also get `settingsUrl` (the URL saved when an admin last opened settings, else `{siteUrl}/wiki/plugins/servlet/upm`); `null` for others.
- **`events[]`**: `{id, source, ref ('PR #482' or 'PAY-21'), title (PR title or issue summary), author, at, summary, files:[{path, status, oldPath?, linesAdded?, linesRemoved?}], severity, score, anchor, reasons, status: 'open'|'snoozed', snoozedUntil, url (Bitbucket PR link or null)}`, plus for `evidenceLevel: 'full'` only `diff` (the event's files from the PR diff, 4 KB cap, `null` once purged or for Jira) and, for Jira, `changelog:[{field, from, to}]`. High before Medium, newest first within a severity (M3). Only open events (snoozed ones included, with `status: 'snoozed'`).
- **`affectedSections[]`**: `{heading, excerpt (≤ 300 chars, `…` where cut), matchedTokens, codeLines?}` (`codeLines`: up to 5 exact code lines of the section that contain a token; omitted when none) from the page body (asUser, storage format), split at headings (`Top of page` before the first). Tokens: changed paths and old paths, distinctive file names, removed identifiers the page mentions, Jira keys. Whole-token match (`ROLLBACK_TIMEOUT` does not match `ROLLBACK_TIMEOUT_SECS`). At most 5.
- **`renameProposals[]`**: `{id, bindingId, from, to, anchor}`. Accept rewrites the binding's pattern; a binding edited since is refused with `binding_changed`.
- **`bindings[]`**: the M1 `anchors` shape plus `dismissCount`.
- **`pages[]`**: `{pageId, title, url, status, statusLabel, maxSeverity: 'high'|'medium'|null, openEvents, since, ownerId, ownerName}`, Possibly stale and Stale pages only (M3), ranked by severity, then the oldest open drift, then title. `total` is every current page in the space the caller can see (REST v2 listing), minus the space home page (M3); counts are Forge SQL `GROUP BY` over the visible anchored pages.

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

- After a match, every page with a new or reopened event is pushed to `notify-queue`, debounced by `notifyDebounceMinutes` (settings, default 10, 0 for demos, max 60). The queue's `delayInSeconds` caps at 900, so a longer debounce carries `notBefore` and the consumer re-queues itself in hops of up to 900 s (`DDS_NOTIFY_HOP`). The first job to run sends everything not yet notified; later jobs find nothing new.
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
pnpm typecheck && pnpm test          # Vitest: pure helpers plus mocked gate, consent and ingest tests
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

KVS also holds `settings`, `relay-ping` and `settings-location` (the settings page URL, saved when an admin opens it). No secret is ever logged.

### Settings (F13, M4)

| Field | Values | Default | Effect |
| --- | --- | --- | --- |
| `sensitivity` | `strict` 0.4, `balanced` 0.5, `quiet` 0.65 | `balanced` | Matcher threshold |
| `ignoreGlobs` | at most 50, each checked by `validateGlob` | the 9 matcher defaults ("Reset to defaults") | Files never scored |
| `ignoreNonDefaultBranches` | on/off | on | Matcher skips a record whose destination is not its `defaultBranch` (the relay also sends main-branch merges only) |
| `spaceMode`, `spaceKeys` | `all`, or `selected` with at least 1 space key | `all` | Bindings outside the watched spaces are dropped before scoring (`DDS_MATCH_SPACES`); existing events stay |
| `escalationDays` | 1 to 30 | 7 | D27 time escalation (stored values above 30 are clamped) |
| `notifyEnabled` | on/off | on | Footer comments |
| `notifyDebounceMinutes` | 0 to 60 | 10 | Notifier debounce; the M2 field `notifyDelaySeconds` is mapped (rounded up to minutes) on read and on save |
| `jiraEnabled` | on/off | on | Off: the Jira trigger logs `DDS_JIRA_SKIPPED reason=disabled`, and queued Jira records end `skipped:jira disabled` |

- `saveSettings` validates every field and returns `{ok:false, error:'invalid', message, fieldErrors:{field: message}}` with every bad field at once, and saves nothing; fields left out keep their current value. The page also checks inline before saving and shows "Saved" next to the button.
- `load` also returns `defaults`, `limits`, the spaces the admin can see (`GET /wiki/api/v2/spaces`, `read:space:confluence`) and `connection: {workspaceUuid, lastPingAt, lastRecord:{repo, prId, title, receivedAt, outcome}|null, repos:[{repo, records, lastAt}], records30d}` (relay-origin change records only).
- A non-admin sees "Only Confluence administrators can change Doc Drift Sentinel settings. Ask an administrator to make changes here." (`error: 'forbidden'`).

### Dev driver (development only)

> **Warning (H1): remove before production.** The `dds-dev` web trigger, the `dev-driver` function and `src/triggers/dev-driver.ts` must be deleted from the manifest and the code before any production deploy. The driver runs resolver actions asApp with an open permission gate. It is inert without the `DDS_DEV_TOKEN` variable (every request returns 401 and runs nothing; unit-tested), but it must not ship.

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
| `purge` | | Run the daily hunk purge now |
| `relay-activity` | | The settings page's connection data (last relay record, repos seen) |
| `age` | `pageId, days` | Move the page's open events back in time (escalation tests) |
| `jira-event`, `page-event` | `event` | Feed a synthetic product event to the handler |
| `settings` | `settings` | Merge into the stored settings (validated) |
| `changes`, `set-secret` | | As in M1 |
| `tool` | `tool, input, pageId?` | Runs an M3 tool (`check-page-freshness`, `find-docs-for-path`, `list-stale-pages`, `get-drift-context`, `record-verification`, `submit-fix-proposal`) with an asApp reader and an open gate; `pageId` stands in for the Rovo page context |
| `proposals`, `apply-proposal`, `reject-proposal` | `pageId` / `proposalId` | The review panel's proposal calls; apply writes the page **asApp** here (development only) |

The asUser permission checks can't run here (no user): they are in the browser checks below.

## Status (2026-11-11, M4 settings and review fixes, version 4.13.0)

Verified live with the dev driver on DDSTEST page **3080365** ("Doc Drift M4 settings test page", anchor `payments-api: config/workers/pool.yaml`, normal; synthetic PRs #9401 to #9407 change `config/workers/pool.yaml` by 10+10 lines, score 0.58):
- **Sensitivity**: Quiet (0.65): 0 events. Balanced (0.5): 1 event, page Possibly stale.
- **Spaces**: watching only PLAT, the same change created 0 events (`DDS_MATCH_SPACES kept 25 dropped 5`) and `getPageDrift` reported `space: {key: DDSTEST, watched: false}`; with PLAT and DDSTEST selected it flagged again.
- **Jira off**: a synthetic `avi:jira:updated:issue` for PAY-21 logged `DDS_JIRA_SKIPPED reason=disabled`, and a Jira record ended `skipped:jira disabled`; page 3047452 kept 1 open PAY-21 event. Jira on: the same record created an event (left open on that test page).
- **Closing log**: a change touching only `config/workers/pool.test.ts` logged `DDS_MATCH_DONE {"skipped":"all files ignored"}`.
- **getPageDrift** returned the M4 fields (`evidenceLevel: full`, permission flags, `snoozedUntil: null`, `space`), file line counts, and `diff`. `get-drift-context` returned `evidenceLevel: full`.
- **Purge** ran (`DDS_PURGE purged 0`, nothing older than 30 days yet). **Relay activity**: last record PR #13, 11 records from `nano-soft-dev/payments-api`.
- Stored settings migrated from `notifyDelaySeconds: 600` to `notifyDebounceMinutes: 10`; defaults restored afterwards (Balanced, all spaces, notifications on with 10 min, Jira on, branch filter on, 7 days).

Unit tests: HMAC ingest (good, bad, wrong secret, tampered, stale and future, replay and dedupe, oversize over 512 KB, not JSON), consent mapping (`NEEDS_AUTHENTICATION_ERR` to `consent_required`), `makeGate`, dismiss and snooze needing `update`, dev driver inert without its token, settings validation with `fieldErrors`, debounce hops, D30 Jira changelog views.

Needs a browser: the settings page itself (sections, inline errors, Saved, space picker, connection panel, non-admin message), `space.canConfigure`/`settingsUrl` for an admin (open settings once so the location is saved), and `evidenceLevel: 'summary'` for a view-only user.

## Status (2026-11-11, M3 backend, version 4.8.0)

### Verified live (headless: dev driver with an asApp reader, plus REST)

- **check-page-freshness**: by ID, URL and title on DDSTEST 2752731 (Possibly stale, "Cite with caveat: changed by PR #4 on 2026-11-11 and PR #482 on 2026-11-11."); 3047452 Stale with 3 changes; unknown ID 999999999 gives `status: unknown`, `title: null`; no input gives `no_page`.
- **find-docs-for-path**: `payments-api` + `scripts/rollback.sh` finds 2 pages (exact); `nano-soft-dev/payments-api` + `deploy/` finds 5 PLAT pages (folder).
- **list-stale-pages**: all spaces (3 pages, Stale first, owner names) and `PLAT` (Scale payment workers).
- **get-drift-context** on 2752731: 1 section (`Roll back`, exact text), 2 events with only the rollback script's diff, 4.3 KB.
- **Propose fix end to end** on DDSTEST page **3080280** ("Doc Drift M3 fix test page", anchor `payments-api: scripts/payout-retry.sh` critical, synthetic PR #9301 renaming `--count` to `--attempts`): a code-block draft and a prose draft (across `<code>--count</code>`) were stored; a draft with text not on the page returned `not_found` with the page's headings and stored nothing. Apply wrote version 2, message "Doc Drift: accepted proposal for PR #9301", closed the event, recorded a verification (`accepted_proposal`), byline "Doc Drift: Verified". The prose draft became version 3 (`<code>--attempts</code>`). Reject left the page unchanged; applying a rejected draft returned `not_open`.
- **record-verification** (method `agent`) closed 1 event and set Verified.
- **M2 polish**: getPageDrift events High first; `codeLines` (`./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT` on 2752731); PLAT dashboard total 24 (home page excluded), only drifted pages listed.
- Page 3080280 was then reset to its `--count` text (version 4) and re-flagged by PR #9301, ready for the browser check.
- **Block targeting (D29, core 4.10.0)** on 3080280: `get-drift-context` returns section "Retry the payout job" with blocks `b2` heading, `b3` paragraph (matched), `b4` code (matched), verbatim. The live Rovo failure inputs (paragraph and code line joined with ". " and with a newline) return `spans_blocks` with `blockIds: ["b3","b4"]`; unrelated text returns `not_found` with 3 candidates, matched first. Two drafts by `blockId` (b3 paragraph, b4 code body) were stored; accepting b3 wrote version 5 ("Doc Drift: accepted proposal for PR #9301", `pendingDrafts: 1`, still Possibly stale), accepting b4 wrote version 6, closed the event and read Verified. The text kept `<code>--attempts</code>` and the CDATA read `./scripts/payout-retry.sh --attempts 3`. The page was reset to `--count` (version 7) and re-flagged by PR #9301 (Possibly stale, no open drafts).
- **MCP endpoint** live: unauthenticated POST gives 401 `invalid_token` with the OAuth resource metadata.
- The S3 spike app (`d212a098`) was uninstalled from the demo site, so Rovo lists one Drift Reviewer.

### Not verifiable headlessly

The asUser path of every action (Rovo chat and MCP need a signed-in user), the `consent_required` mapping in this app, the Rovo confirmation dialogs for CREATE/UPDATE, the skill attachment, and the asUser page PUT from the review panel. See checks 16 to 24.

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
15. **Settings.** Superseded by the M4 checks below.

### M3 checks (Rovo, review panel, Claude Code)

Rovo messages cost about 10 credits each; keep it to the steps below. Tail logs: `forge logs -e development -s 15m | grep -E "DDS_TOOL|DDS_FIX"`.

16. **One agent.** On any Confluence page, open **Ask Rovo**, then the agent picker. Expect exactly one **Drift Reviewer** (Doc Drift mark), no "Drift Reviewer (spike)".
17. **Freshness in Rovo.** Open https://one-atlas-jzzf.atlassian.net/wiki/spaces/DDSTEST/pages/3080280 and ask Drift Reviewer "Is this page still current?". Expect "Possibly stale", PR #9301 named with its date, no "wrong", and no confirmation prompt (GET). Log: `DDS_TOOL {"tool":"check-page-freshness","surface":"confluence",...,"status":"possibly_stale"}`. If the reply mentions Connected apps, open the Doc Drift byline on the page once, click **Allow access** if asked, and retry.
18. **Draft a fix.** Ask "Draft a fix for the drifted sections of this page". Expect `get-drift-context`, then **two** confirmation dialogs for **Submit fix proposal** (CREATE), one per block: the paragraph (`blockId` b3) and the code block (b4); confirm both. Expect a reply that the drafts wait in the review panel and the page is unchanged. Logs: `DDS_TOOL get-drift-context`, 2 x `DDS_FIX_PROPOSED {"refs":["PR #9301"],...,"blockId":"b3"|"b4"}`, and no `DDS_FIX_REFUSED`. If one appears (`spans_blocks` or `not_found`), the agent must retry once with a `blockId` and then succeed or explain in one sentence. The page text must still say `--count`.
19. **Accept in the review panel.** Click the byline. Under **Proposed fix**, the section "Retry the payout job" shows 2 drafts (diffs with `-`/`+` lines) and **Accept all for this section**. Click it (or **Accept fix** on each). Expect "Accepted. A new page version names PR #9301." Reload: the paragraph reads `--attempts` (still in code style), the code block reads `--attempts 3`, the byline reads **Doc Drift: Verified**, and Page history shows 2 new versions by you with the message "Doc Drift: accepted proposal for PR #9301". After only the first accept the page still reads Possibly stale (1 draft open). Log: `DDS_FIX_APPLIED`.
20. **Propose fix button.** On page 2752731 (Possibly stale), the review panel's **Propose fix** opens the Rovo sidebar with Drift Reviewer and a pre-filled prompt naming the page ID. Don't send it unless you want a second draft.
21. **Record verification.** On page 2752731 tell Drift Reviewer "I re-checked this page against the code, record verification". Expect a confirmation dialog (UPDATE) first, then Verified. Log: `DDS_TOOL record-verification ok:true`. (Replay the demo afterwards to re-flag it.)
22. **MCP setup.** admin.atlassian.com > Apps > Sites > one-atlas-jzzf > Connected apps > **Doc Drift Sentinel** (development) > Details > Tools > turn on "Expose tools to MCP-compatible apps". Then in a terminal: `claude mcp remove dds-spike` (the spike is uninstalled) and `claude mcp add --transport http doc-drift https://mcp.atlassian.com/forge/12e968a1-a45d-4524-ba28-d47e2315db1a`. In Claude Code run `/mcp` > doc-drift > Authenticate, pick one-atlas-jzzf and approve. Expect exactly 3 tools: `check-page-freshness`, `find-docs-for-path`, `list-stale-pages`.
23. **MCP calls.** Ask Claude Code: "Use doc-drift check-page-freshness for https://one-atlas-jzzf.atlassian.net/wiki/spaces/PLAT/pages/2720129" (expect Possibly stale, PR #5); "Use doc-drift find-docs-for-path with repo payments-api and path scripts/rollback.sh" (2 pages); "Use doc-drift list-stale-pages for space PLAT". Logs show `"surface":"external"`. A first call may return `consent_required` ("Grant Doc Drift Sentinel access in Connected apps, then retry."): open the Doc Drift byline on any page once, allow access, and retry (spike C5/C6 behaviour).
24. **Permission-aware.** Via MCP, check pageId 999999999: `status: unknown`, `title: null`. Check the restricted page 2883670 (you are its only viewer): `status: unanchored`, `restricted: true`, guidance "Doc Drift can't watch pages with view restrictions…".

### M4 checks (settings)

25. **Settings page.** Open the Configure page (check 3). Expect sections Detection, Spaces, Escalation and notifications, Jira, a primary **Save settings** button, then Bitbucket relay (a Connected lozenge, the workspace, "Last change: nano-soft-dev/payments-api PR #13 …", "Repositories seen: nano-soft-dev/payments-api") and Demo mode.
26. **Inline validation.** Type 45 in "Days before Possibly stale becomes Stale", 90 in the wait field, add `src/[a` to the globs, and click Save. Expect an error under each field (the globs one from the server: "Fix this glob: src/[a has an unclosed bracket, brace or parenthesis.") and nothing saved. Fix them and save: "Saved" appears next to the button.
27. **Spaces.** Pick Selected spaces with no space and save: "Pick at least 1 space, or watch all spaces." Pick PLAT, save, open a DDSTEST page's Doc Drift panel: `getPageDrift.space.watched` is false (the UI agent shows this). Set All spaces back.
28. **Reset to defaults** fills the 9 default globs. **Non-admin**: as a non-admin user, the page reads "Settings are for Confluence administrators".
29. **Settings link.** After opening settings once as an admin, `getPageDrift.space.settingsUrl` is that page's URL.

Cleanup when M1 is accepted: delete the DDSTEST space, and `forge variables unset -e development DDS_DEV_TOKEN`.
