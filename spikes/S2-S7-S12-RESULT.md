# Spikes S2, S7, S12: result (2026-11-11)

App: `spikes/s2-confluence` (`dds-spike-s2`). App ID `ari:cloud:ecosystem::app/358919d6-16c9-4eac-af40-7c0e16ece0c2`. Installed in the **development** env, Confluence on one-atlas-jzzf.atlassian.net (installation `836c70a5-6559-47d8-ae3a-f57a87fb3d4e`). Developer Space **"Doc Drift"** `af90295c-aad7-4188-9754-122ee3c4c6f4` (created by this spike, see gotchas).

| Spike | Verdict |
| --- | --- |
| S2 byline from content property | **Backend GO. Rendering PENDING** (browser checks below). D20 open: an app-created page could not lock the app out |
| S7 Forge SQL | **GO.** Use Forge SQL (D16 confirmed) |
| S12 Runs on Atlassian | **GO.** `forge eligibility`: "version [2.2.0] deployed to [development] is eligible for the Runs on Atlassian program" |

## S2: what is proven (automated, from `forge logs`)

- `asApp()` POST/PUT `/wiki/api/v2/pages/{id}/properties` with the raw key works: 200, about 200 to 360 ms per upsert (GET by `?key=`, then POST or PUT with `version.number + 1`).
- **Property writes do not create page versions.** After 5 property versions, the page is still at version 1. So there's no "edited" noise or watcher notification.
- `GET /wiki/api/v2/pages/{id}/operations` returns `{operations: [{operation, targetType}]}`. As the app on a normal page: `read, update, delete, restrict_content, clear_permissions, archive, view_analytics, set_reaction, view_reaction, create_public_link` (targetType `page`), plus `create` rows for child types (`database, folder, attachment, slide, comment, page, embed, whiteboard`). Filter on `targetType === 'page' && operation === 'update'`. The `asUser()` result is pending (button in the modal).
- The byline manifest `icon: resource:icons;unanchored.svg` (resource = a directory of SVGs) passes lint and deploy.
- **D20 surprise:** the app created page S2-6, then replaced its direct permissions with `PUT /pages/{id}/permissions?allow-self-lockout=true` so only Razvan had `read`. GET permissions confirmed `[["read", Razvan]]`. Yet `asApp()` GET page, GET properties and PUT property all still returned 200. Possible causes: a creator exemption, or app users are not blocked at all. Only a page that a person creates and restricts can tell them apart (check 5).
- v2 permissions notes: a principal holds one entry, and `update` implies `read`. POST keeps the app user (creator) as `update`. The app user's accountId on this site is `712020:69b71530-0899-41cc-b673-a32515a36cef`.

### Content-property value shape (as written)
```json
// key: dds-byline-7f3c2a  (raw key, written asApp via REST v2)
{ "title": "Doc Drift: Possibly stale",
  "icon": "resource:icons;possibly-stale.svg",
  "tooltip": "An anchor changed after the last verification" }
```
The icon variants under test are on pages S2-1 to S2-4: `resource:icons;verified.svg`, the bare `possibly-stale.svg`, `data:image/svg+xml;base64,...`, and an undeclared absolute URL. The state word always goes in `title`, so the badge still reads right if the icon falls back.

### Manifest snippets (deployed, lint clean)
```yaml
confluence:contentBylineItem:
  - key: dds-byline
    resource: byline
    render: native
    resolver: { function: resolver }
    viewportContainer: modal
    viewportSize: large
    title: Doc Drift
    tooltip: Doc Drift Sentinel
    icon: resource:icons;unanchored.svg
    contentPropertyKey: dds-byline-7f3c2a      # no dynamicProperties: page views run no function
  - key: dds-probe                             # spike only: detects dynamicProperties fallback calls
    resource: byline
    render: native
    resolver: { function: resolver }
    title: Probe default (manifest)
    contentPropertyKey: dds-probe-91d4e0
    dynamicProperties: { function: dynprops }
confluence:backgroundScript:                   # live refresh: events.on -> updateBylineProperties
  - { key: dds-bg, resource: background, render: native, resolver: { function: bg-resolver } }
resources:
  - { key: byline, path: src/byline/index.jsx }
  - { key: background, path: src/background/index.jsx }
  - { key: icons, path: static/icons }         # verified.svg possibly-stale.svg stale.svg unanchored.svg
permissions:
  scopes: [read:page:confluence, write:page:confluence, read:space:confluence]
```
Live refresh: the byline modal calls `events.emit('dds-byline-refresh', value)`. The background script calls `updateBylineProperties({ propertyKey: 'dds-byline-7f3c2a', valueUpdate })` from `@forge/confluence-bridge@4`. In the spike, the background script also invokes a beacon resolver on each view. Remove that in `apps/core`.

## S2: browser checks pending for Razvan

Log in to one-atlas-jzzf.atlassian.net as yourself. Parent page: https://one-atlas-jzzf.atlassian.net/wiki/spaces/ENGS/pages/2883585 . Afterwards, run `spikes/s2-confluence/scripts/summary.sh` (it parses `forge logs`, which lag 1 to 2 min) and paste the output.

1. **Icon formats and render source.** Open each page and look at the two byline items under the title (title, icon, hover tooltip):
   - S2-1 https://one-atlas-jzzf.atlassian.net/wiki/spaces/ENGS/pages/2752521 : expect "Doc Drift: Verified". Does the icon show a green check (`resource:` form)?
   - S2-2 https://one-atlas-jzzf.atlassian.net/wiki/spaces/ENGS/pages/2719757 : "Doc Drift: Possibly stale". Do two offset bars show (bare path)?
   - S2-3 https://one-atlas-jzzf.atlassian.net/wiki/spaces/ENGS/pages/2752545 : "Doc Drift: Stale". Does a red clock show (data URI)?
   - S2-4 https://one-atlas-jzzf.atlassian.net/wiki/spaces/ENGS/pages/2883607 : "Doc Drift: Unanchored". Does the absolute URL icon show, or the generic app icon?
   - On S2-1 to S2-4 the probe item should read "Probe: from content property". **Pass:** the titles come from the property, and `summary.sh` shows `dynamicProperties calls: 0` for these pages.
2. **Missing property and key form.** S2-5 https://one-atlas-jzzf.atlassian.net/wiki/spaces/ENGS/pages/2883627 : note the byline titles. "Doc Drift" means the manifest default. For the probe, "Probe default (manifest)" means no fallback, and "Probe: from dynamicProperties fn" means a fallback call. Then click **Doc Drift**, then **Write prefixed key**, then **Check my permissions**, and reload. If the title becomes "Doc Drift: PREFIXED KEY READ", Confluence reads `forge-<localId>-<key>`. If it stays "Doc Drift", it reads the raw key only.
3. **Live refresh.** S2-7 https://one-atlas-jzzf.atlassian.net/wiki/spaces/ENGS/pages/2883647 : open the modal and click **Possibly stale**, then close the modal. Does the byline change to "Doc Drift: Possibly stale (live)" **without a reload**? Reload: does it persist?
4. **App-restricted page.** S2-6 https://one-atlas-jzzf.atlassian.net/wiki/spaces/ENGS/pages/2752565 : what does the byline show? (The property says "Doc Drift: Stale (after lockout)".)
5. **Real D20 test.** Create a page yourself in ENGS and restrict viewing to yourself only (Restrictions: "Only specific people can view or edit"). Then run, from `spikes/s2-confluence`:
   `scripts/call.sh '{"action":"inspect","pageId":"<id>"}'` and `scripts/call.sh '{"action":"state","pageId":"<id>","state":"stale","iconMode":"resource"}'`. In `forge logs -e development`, a 404 on `S2_INSPECT`/`S2_STATE` confirms D20 (the app is blocked). A 200 means the app user bypasses page restrictions, and D20 can be relaxed.

## S7: Forge SQL

- **Migrations:** the trigger on `avi:forge:installed:app` and `avi:forge:upgraded:app` pushes to the queue `schema-migration-queue`, and the consumer (`timeoutSeconds: 900`) runs `migrationRunner.enqueue(...).run()` in a 60 s retry loop. On install, it applied all 4 DDLs in about 6 s (enqueue at 14:45:41, done at 14:45:47). The `__migrations` table tracks them.
```yaml
sql: [{ key: main, engine: mysql }]
trigger: [{ key: migration-trigger, function: enqueue-migration, events: [avi:forge:installed:app, avi:forge:upgraded:app] }]
consumer: [{ key: schema-migration-consumer, queue: schema-migration-queue, function: run-migration }]
function: [{ key: run-migration, handler: index.runMigration, timeoutSeconds: 900 }, ...]
```
```sql
CREATE TABLE IF NOT EXISTS page_state (
  page_id VARCHAR(32) NOT NULL, space_key VARCHAR(255) NOT NULL, owner_id VARCHAR(128) NULL,
  status VARCHAR(20) NOT NULL, open_event_count INT NOT NULL DEFAULT 0, max_severity TINYINT NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (page_id));
CREATE INDEX IF NOT EXISTS idx_ps_space_status ON page_state (space_key, status);
CREATE INDEX IF NOT EXISTS idx_ps_owner_status ON page_state (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_ps_status_sev   ON page_state (status, max_severity, updated_at);
```
- **Latency.** Measured in the function around `sql.prepare(q).execute()`, 15 runs each, 200 rows, development env. All values in ms.

| Query | p50 | p95 | max |
| --- | --- | --- | --- |
| `SELECT space_key, status, COUNT(*) n FROM page_state GROUP BY space_key, status` (20 groups) | 35 | 82 | 82 |
| Top 10: `WHERE status IN ('possibly_stale','stale') ORDER BY max_severity DESC, open_event_count DESC, updated_at DESC LIMIT 10` | 24 | 38 | 38 |
| One space: `WHERE space_key='PLAT' GROUP BY status` | 20 | 43 | 43 |
| Owner counts: `GROUP BY owner_id` over open drift | 24 | 200 | 200 |
| Single-row `INSERT ... ON DUPLICATE KEY UPDATE` (matcher hot path) | 26 | 60 | 60 |
| 200-row multi-row upsert, 1 statement, 1,200 bound params | 101 (one run) | | |

  `EXPLAIN` shows that the GROUP BY reads only `idx_ps_space_status` (IndexFullScan plus a coprocessor HashAgg).
- **Query policy, as hit:** `SQL_POLICY_VIOLATION` errors for:
  - multi-statement calls: "Only one statement per query is allowed"
  - `SLEEP`
  - `SET SESSION ...`: "Only session SET autocommit/sql_mode and user variable SET (@var) are allowed"

  These are allowed: `SET @x`, `EXPLAIN`, `SHOW TABLES`, `SHOW INDEX`, `information_schema.statistics`, window functions, CTEs and JSON functions.
- DATETIME values come back as strings without a timezone (`"2026-11-11 14:47:23.164"`). Store UTC.
- **D16 verdict:** Forge SQL. The dashboard is one GROUP BY at about 35 ms p50 with an index-only plan. Custom entities would need to page through every row at 100 per page, or keep hand-maintained counters.

## S12
`forge deploy` prints the eligibility check on every deploy, and `forge eligibility -e development --non-interactive` confirms it. Every version from 2.0.0 to 2.3.0 was eligible. Each one included `sql`, a static v2 web trigger, a queue consumer, an app-lifecycle trigger, a backgroundScript, byline items, and no egress or remotes. Not tested: whether `permissions.external.images` (needed for an absolute-URL icon) breaks eligibility. Avoid it: ship resource or data-URI icons.

## Gotchas
- **No Developer Space existed**, and non-TTY `forge create` fails while prompting for one, even with `--personal`. This spike created "Doc Drift" (`af90295c-aad7-4188-9754-122ee3c4c6f4`) by driving the prompt with `expect`. Other spikes and `apps/*` should pass `--developer-space-id af90295c-aad7-4188-9754-122ee3c4c6f4 --accept-terms`.
- The template `package.json` pins prerelease (`-next`) Forge packages. Bump them to stable: `@forge/react@12.5.0`, `@forge/bridge@7.3.0`, `@forge/api@8.5.0`, `@forge/sql@4.0.10`, `@forge/events@3.0.10`, `@forge/confluence-bridge@4.0.0`.
- Web trigger functions cannot declare `timeoutSeconds` (lint error). Only consumers and scheduled triggers can.
- A static web trigger can't return data. The spike logs its results and reads them with `forge logs`, which lags 1 to 2 min. Calls made in the first seconds after `forge deploy` can still hit the previous version.
- The spike web trigger is gated by the encrypted env var `SPIKE_TOKEN` (header `x-spike-token`). The URL and token are in the gitignored `.spike-url` and `.spike-token`.
- Cleanup when done: `forge uninstall` the spike, and delete the ENGS pages under 2883585.

## Browser results (2026-11-11, Razvan)
- S2-1: byline "Doc Drift: Verified (Development)", tooltip "Re-checked since its anchors last changed", probe "from content property". `summary.sh`: dynamicProperties calls 0. The icon `resource:icons;verified.svg` showed the generic app (hexagon) icon, not the SVG.
- S2-2 to S2-4 (other icon formats), S2-5 (key form via the prefixed write), S2-7 (live refresh) and check 5 (person-restricted page): pending.
