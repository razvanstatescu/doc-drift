# Architecture overview

## Two Forge apps

Forge multi-app compatibility (Preview) covers Jira, Confluence and Compass, not Bitbucket. A Bitbucket-context call to another product fails ("Request jira is not allowed from bitbucket context"). Atlassian staff call cross-app coordination with Bitbucket "entirely do-it-yourself at this time". So we ship two apps:

| App | Products | Job |
| --- | --- | --- |
| **doc-drift-sentinel** (core) | Confluence required, Jira optional | Bindings, matcher, byline badge, review panel, dashboard, settings, Jira trigger, Rovo agent, skill, actions, `rovo:mcp` |
| **dds-bitbucket-relay** | Bitbucket | Listens for merged PRs, reads the diffstat (+ diff), and POSTs a compact, HMAC-signed change record to the core app's web trigger |

```
Bitbucket workspace                      Atlassian site (Confluence + Jira)
┌────────────────────────┐               ┌──────────────────────────────────────────────┐
│ dds-bitbucket-relay     │  HTTPS POST   │ doc-drift-sentinel (core)                    │
│ trigger: fulfilled:PR   │──────────────▶│ webtrigger: ingest-change (HMAC verified)    │
│ fn: read diffstat+diff  │  (HMAC)       │   └─▶ queue: match-queue (debounce 600s)     │
│ storage: relay secret   │               │ trigger: avi:jira:updated:issue (filtered)   │
└────────────────────────┘               │   └─▶ queue: match-queue                     │
                                         │ consumer: matcher (timeoutSeconds 120)       │
                                         │   ├─ anchor lookup (Forge SQL / entities)    │
                                         │   ├─ score + DriftEvent upsert               │
                                         │   └─ write content property (byline state)   │
                                         │ consumer: notifier (footer comment, mention) │
                                         │ scheduled: escalate Possibly stale → Stale   │
                                         │ UI: contentBylineItem (review panel, modal)  │
                                         │     spacePage (drift dashboard)              │
                                         │     contextMenu ("Anchor selection")         │
                                         │     globalSettings / spaceSettings           │
                                         │ Rovo: agent drift-reviewer, skill            │
                                         │       check-page-freshness, actions          │
                                         │ rovo:mcp: doc-drift tools                    │
                                         └──────────────────────────────────────────────┘
```

## Data flow

1. **Bitbucket path.** `avi:bitbucket:fulfilled:pullrequest`, then the relay reads `/diffstat` (paginated, capped at 500 files) and `/diff` (skipped above 300 files, trimmed to 150 KB). It builds a `ChangeRecord`, signs it with HMAC-SHA256, and POSTs it to `ingest-change`.
2. **Jira path.** `avi:jira:updated:issue` with a trigger filter on `changelog.items` becomes a `ChangeRecord` (source `jira`).
3. **Ingest.** The web trigger verifies the HMAC, stores the `change_record`, and pushes **only its ID** to `match-queue` (with `delayInSeconds` for debounce). A consumer with a timeout over 55s has a 100 KB per-event cap, so never push diffs. Retries have no fixed count (24h window), so consumers must be idempotent (`dedupeKey`).
   - The web trigger uses `urlFormat: v2` and a **static response** (`response.type: static`, outputs 202/400/401). The handler returns an output key. A dynamic trigger counts as egress and makes the core app ineligible for Runs on Atlassian.
   - The URL is per Atlassian app (product context) and environment. Fetch it in the Confluence context, show it in settings, and make it configurable in the relay.
4. **Match.** The consumer looks up anchors by repo or Jira key, scores each one ([detection.md](detection.md)), upserts `drift_event` rows, recomputes `page_state`, and writes the byline content property.
5. **Notify.** The `notify-queue` consumer posts or updates the footer comment, at most once per page per 24h.
6. **Escalate.** A scheduled trigger moves Possibly stale to Stale after N days.
7. **Read surfaces.** The byline, review panel, dashboard, agent actions and MCP tools read state. Every user-facing read goes `asUser()`.

## Permission model

- Background detection runs `asApp()`. Triggers and queue consumers cannot call as a user.
- **The app user cannot read pages with view restrictions, and their events do not arrive** (open Atlassian tickets ECO-822 and ECO-961). So restricted pages are **unsupported in v1** (D20). The binding modal (which runs `asUser()`) detects a restriction and shows "Restricted pages can't be watched yet" instead of saving anchors.
- Every user-facing read (review panel, agent action, MCP tool) goes `asUser()`, so page restrictions are respected. There is **no `asApp()` fallback in MCP tools** (D21). Checking another user's permission from an app context is not reliable, so if the user has not granted consent, the tool returns a "grant access in Connected apps" error.
- Pages the caller cannot read return `status: "unknown"` and no title.
- **Page body writes** (apply an accepted fix) are `asUser()` only, on click.
- **State writes** (byline content property, "Mark verified") need page edit rights, so they would fail as a view-only user. The resolver first checks the clicking user's rights `asUser()` with `GET /wiki/api/v2/pages/{id}/operations` (read for verify, update for apply fix), then writes `asApp()`. Do not use v1 `/permission/check`: it needs Confluence Administrator and reportedly fails `asApp()`. `write:page:confluence` is required for content-property writes in any case.
- Labels and CQL search need REST v1 ([platform/forge-confluence.md](../platform/forge-confluence.md)).
- Confluence events worth subscribing to: `avi:confluence:updated:page` (re-index code blocks and identifiers; ignore `selfGenerated` events) and page trashed/deleted (close events, drop bindings).

## Runs on Atlassian and egress

- Runs on Atlassian is **not a Codegeist 2026 prize**. It is only a Marketplace badge and a privacy point in the pitch. Keep the core app eligible if it is cheap: static web trigger, no egress. Check with `forge eligibility`.
- The relay needs egress to the core app's web trigger host. For v2 URLs, declare `*.webtrigger.atlassian.app` (`*.atlassian-dev.net` only matches v1). Whether one Forge app may call another's web trigger is undocumented: spike S1. The relay will not be Runs on Atlassian. Accept that.
- **Fallback if the relay is blocked:** the core app polls the Bitbucket REST API with a workspace access token (Forge secret) on a scheduled trigger. That needs egress to `api.bitbucket.org` and loses Runs on Atlassian for the core app. Use it only as a fallback.
- GitHub/GitLab: there is no first-class Forge event path. Teamwork Graph has External pull request/commit/repository objects for discovery only. Post-hackathon.

## UI technology

UI Kit (`render: native`) for the byline modal, settings and dashboard. It is faster to build, uses Atlassian Design System components and tokens automatically, and looks native, which helps the Design score. Switch the review panel to Custom UI only if a rich diff viewer is needed. Inside Confluence, the app follows Atlassian tokens. Our brand palette applies to our own surfaces only (see [brand/README.md](../../brand/README.md)).

## Planned repo structure (not created yet)

```
doc-drift/
  apps/core/            manifest.yml, src/{triggers,consumers,resolvers,actions,lib}, src/frontend/{byline,dashboard,settings}
  apps/bitbucket-relay/ manifest.yml, src/{onMerged.ts, settings.tsx}
  packages/matcher/     pure TS: globs, scoring, identifiers, hashing (no Forge deps), Vitest
  packages/shared/      types, ChangeRecord schema, HMAC
  fixtures/scenarios/   30 JSON scenarios + expected outcomes
  skills/check-page-freshness/SKILL.md
  demo/seed/            scripts to create 24 pages, repo commits, PR branches
```

## Manifests and code sketches

The draft manifests and TypeScript sketches are in [docs/source/plan-v1.md](../source/plan-v1.md) §14 and §15. They were not verified when written. Before using a field name, scope or module key, check it against [docs/platform/](../platform/). Those files record what the current Atlassian docs say and where the plan differs.
