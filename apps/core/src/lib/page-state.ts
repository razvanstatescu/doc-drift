// Recomputes a page's state from its bindings and open events, stores it, and writes the byline
// content property asApp. Deterministic and idempotent: running it twice gives the same result.
import api from '@forge/api';
import { nextPageState } from '@dds/matcher';
import type { StoredPageState } from '@dds/shared';
import { BYLINE_PROPERTY_KEY, bylineValue, displayFiles, refLabel } from './copy';
import { upsertPageProperty } from './confluence';
import { bindingsForPage, getPageState, openEventsForPage, upsertPageState } from './db';
import { fromSqlDate, severityRank } from './ingest-rules';

export interface RefreshResult {
  pageId: string;
  status: StoredPageState;
  openEventCount: number;
  maxSeverity: number;
  byline: { status: number; op: string };
}

export async function refreshPage(pageId: string, spaceKeyHint?: string | null): Promise<RefreshResult> {
  const [bindings, openEvents, current] = await Promise.all([
    bindingsForPage(pageId),
    openEventsForPage(pageId),
    getPageState(pageId),
  ]);
  const now = Date.now();
  const status = nextPageState({
    current: current?.status ?? 'unanchored',
    bindingCount: bindings.length,
    openEvents: openEvents.map((e) => ({ severity: e.severity, critical: e.critical, createdAt: fromSqlDate(e.createdAt) ?? now })),
    now,
  });
  const maxSeverity = Math.max(0, ...openEvents.map((e) => severityRank(e.severity)));
  const latest = openEvents[0];
  const lastSummary = latest ? `${refLabel(latest.ref, latest.source)}: ${latest.summary}` : null;
  const spaceKey = spaceKeyHint ?? current?.spaceKey ?? bindings.find((b) => b.spaceKey)?.spaceKey ?? null;

  await upsertPageState({ pageId, spaceKey, status, openEventCount: openEvents.length, maxSeverity, lastSummary });

  const createdTimes = openEvents.map((e) => fromSqlDate(e.createdAt) ?? now);
  const value = bylineValue({
    state: status,
    anchorCount: bindings.length,
    ...(current?.verifiedAt ? { verifiedAt: fromSqlDate(current.verifiedAt) } : {}),
    openEventCount: openEvents.length,
    ...(latest && {
      latest: { ref: latest.ref, source: latest.source, files: displayFiles(latest.matchedAnchor, latest.files), at: fromSqlDate(latest.createdAt) ?? now },
    }),
    ...(createdTimes.length > 0 && { oldestOpenAt: Math.min(...createdTimes) }),
    now,
  });
  const byline = await upsertPageProperty(api.asApp(), pageId, BYLINE_PROPERTY_KEY, value);
  if (byline.status >= 300) {
    console.warn(`DDS_BYLINE_WRITE_FAILED pageId=${pageId} status=${byline.status} op=${byline.op}`);
  }
  console.log(
    `DDS_PAGE_STATE ${JSON.stringify({ pageId, status, openEventCount: openEvents.length, maxSeverity, title: value.title, tooltip: value.tooltip, bylineStatus: byline.status })}`,
  );
  return { pageId, status, openEventCount: openEvents.length, maxSeverity, byline: { status: byline.status, op: byline.op } };
}
