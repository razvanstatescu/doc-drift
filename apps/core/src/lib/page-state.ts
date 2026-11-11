// Recomputes a page's state from its bindings and open events, stores it, and writes the byline
// content property asApp. Deterministic and idempotent: running it twice gives the same result.
import api from '@forge/api';
import { nextPageState } from '@dds/matcher';
import type { StoredPageState } from '@dds/shared';
import { BYLINE_PROPERTY_KEY, bylineValue, displayFiles, refLabel } from './copy';
import { getPageMeta, upsertPageProperty } from './confluence';
import { bindingsForPage, getPageState, openEventsForPage, upsertPageState } from './db';
import { fromSqlDate, severityRank } from './ingest-rules';
import { getSettings } from './settings-store';

export interface RefreshResult {
  pageId: string;
  status: StoredPageState;
  previous: StoredPageState | null;
  openEventCount: number;
  maxSeverity: number;
  byline: { status: number; op: string };
}

export interface RefreshOptions {
  spaceKeyHint?: string | null;
  /**
   * When false, skip the SQL and byline writes if the state did not change (the hourly escalation run).
   * Default true: every refresh rewrites the byline.
   */
  writeIfUnchanged?: boolean;
}

export async function refreshPage(pageId: string, opts: RefreshOptions | string | null = {}): Promise<RefreshResult> {
  const options: RefreshOptions = typeof opts === 'string' || opts === null ? { spaceKeyHint: opts } : opts;
  const [bindings, openEvents, current, settings] = await Promise.all([
    bindingsForPage(pageId),
    openEventsForPage(pageId),
    getPageState(pageId),
    getSettings(),
  ]);
  const now = Date.now();
  const summaries = openEvents.map((e) => {
    const snoozedUntil = fromSqlDate(e.snoozedUntil);
    return {
      severity: e.severity,
      critical: e.critical,
      createdAt: fromSqlDate(e.createdAt) ?? now,
      ref: e.ref,
      ...(snoozedUntil !== undefined && { snoozedUntil }),
    };
  });
  const status = nextPageState({
    current: current?.status ?? 'unanchored',
    bindingCount: bindings.length,
    openEvents: summaries,
    now,
    escalationDays: settings.escalationDays,
  });
  const maxSeverity = Math.max(0, ...openEvents.map((e) => severityRank(e.severity)));
  const previous = current?.status ?? null;
  if (options.writeIfUnchanged === false && previous === status) {
    return { pageId, status, previous, openEventCount: openEvents.length, maxSeverity, byline: { status: 0, op: 'skipped' } };
  }

  const latest = openEvents[0];
  const lastSummary = latest ? `${refLabel(latest.ref, latest.source)}: ${latest.summary}` : null;
  const spaceKey = options.spaceKeyHint ?? current?.spaceKey ?? bindings.find((b) => b.spaceKey)?.spaceKey ?? null;
  // The page owner is the notifier's recipient and the dashboard's owner column. Fetched once.
  let ownerId = current?.ownerId ?? null;
  if (!ownerId && bindings.length > 0) {
    const meta = await getPageMeta(api.asApp(), pageId);
    ownerId = meta.ownerId ?? null;
  }

  await upsertPageState({ pageId, spaceKey, ownerId, status, openEventCount: openEvents.length, maxSeverity, lastSummary });

  const createdTimes = summaries.map((e) => e.createdAt);
  const allSnoozed = summaries.length > 0 && summaries.every((e) => e.snoozedUntil !== undefined && e.snoozedUntil > now);
  const value = bylineValue({
    state: status,
    anchorCount: bindings.length,
    ...(current?.verifiedAt ? { verifiedAt: fromSqlDate(current.verifiedAt) } : {}),
    openEventCount: new Set(openEvents.map((e) => e.ref)).size,
    ...(latest && {
      latest: {
        ref: latest.ref,
        source: latest.source,
        files: displayFiles(latest.matchedAnchor, latest.files),
        at: fromSqlDate(latest.createdAt) ?? now,
        summary: latest.summary,
      },
    }),
    ...(createdTimes.length > 0 && { oldestOpenAt: Math.min(...createdTimes) }),
    ...(allSnoozed && { snoozedUntil: Math.max(...summaries.map((e) => e.snoozedUntil ?? 0)) }),
    now,
  });
  const byline = await upsertPageProperty(api.asApp(), pageId, BYLINE_PROPERTY_KEY, value);
  if (byline.status >= 300) {
    console.warn(`DDS_BYLINE_WRITE_FAILED pageId=${pageId} status=${byline.status} op=${byline.op}`);
  }
  console.log(
    `DDS_PAGE_STATE ${JSON.stringify({ pageId, previous, status, openEventCount: openEvents.length, maxSeverity, title: value.title, tooltip: value.tooltip, bylineStatus: byline.status })}`,
  );
  return { pageId, status, previous, openEventCount: openEvents.length, maxSeverity, byline: { status: byline.status, op: byline.op } };
}
