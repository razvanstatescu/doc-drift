# Data model

**Leaning Forge SQL:** custom entities cannot count or aggregate, and the dashboard needs grouped counts per space/status/owner. Forge SQL needs `modules.sql: [{key: main, engine: mysql}]`, plus a migration consumer (`timeoutSeconds: 900`) on `avi:forge:installed:app` and `avi:forge:upgraded:app`. Adding `sql` later is a major version, so ship it from day 1. Spike S7 confirms. Settings and secrets go in KVS (`@forge/kvs`, `kvs.setSecret` for the relay secret). See [platform/forge-platform.md](../platform/forge-platform.md).

| Table / entity | Key fields | Indexes |
| --- | --- | --- |
| `binding` | id, pageId, spaceKey, anchorType (path\|glob\|jira\|page\|repo), repo, pattern, jiraKey, weight (critical\|normal), dismissDampener, createdBy, createdAt | (repo), (jiraKey), (pageId) |
| `page_state` | pageId, spaceKey, ownerId, status, verifiedAt, verifiedBy, openEventCount, maxSeverity, lastSummary, readershipWeight | (spaceKey, status), (ownerId, status) |
| `drift_event` | id, pageId, bindingId, source (bitbucket\|jira), ref (repo#PR or issueKey), summary, files JSON, score, severity, status (open\|dismissed\|resolved\|reverted\|snoozed), dismissReason, snoozedUntil, dedupeKey, createdAt | (pageId, status), (dedupeKey) |
| `change_record` | id, source, repo, prId, title, author, mergeCommit, files JSON, hunksRef, receivedAt | (repo, prId) |
| `verification` | id, pageId, userId, at, closedEventIds, note, method (manual\|accepted_proposal\|agent) | (pageId) |
| `settings` (KVS) | threshold, ignoreGlobs, enabledSpaces, escalationDays, relaySecretHash, ignoreNonDefaultBranches | n/a |

Fields beyond the original plan (`dismissDampener`, `lastSummary`, `snoozed`, `bindingId`, `title`/`author`) are implied by the features and copy. Confirm them when building.

## Byline content property

The matcher writes the badge state (title, icon, tooltip) to the page content property named by the byline's `contentPropertyKey` (planned key: `dds-byline-7f3c2a`). Page views then run no function. For details, see [platform/forge-confluence.md](../platform/forge-confluence.md):
- The backend must write the exact key itself. `useContentProperty` may save under a prefixed key the byline does not read (unverified).
- `updateBylineProperties` only refreshes the screen, and must run from another module (for example `confluence:backgroundScript`) if live refresh matters.
- The icon value format is undocumented. Spike S2 must find it.

## CQL-queryable state (proposed)

Add a `confluence:contentProperty` index module (key `dds_state`, no hyphens) over a page property holding `status` and `openEventCount`. That makes page state searchable with CQL and usable in display conditions. It is a candidate for `list-stale-pages` and the dashboard if Forge SQL disappoints.

## Core types (in `packages/shared`)

```ts
type ChangeRecord = {
  source: 'bitbucket' | 'jira';
  repo?: string; prId?: number; title?: string; author?: string; mergeCommit?: string;
  files: { status: 'added'|'modified'|'removed'|'renamed'; path: string; oldPath?: string; added: number; removed: number }[];
  hunks?: string;              // raw diff, <= 150 KB, absent for > 300 files
  issueKey?: string; changelog?: { field: string; from?: string; to?: string }[];
};
```

## Retention

- No page bodies stored.
- Diff hunks kept for up to 30 days for the review panel, then purged.
- Anchors, scores, PR metadata and file paths are kept.
