// notify-queue consumer body (F7): a footer comment that @mentions the page owner, at most one per
// page per 24 h. Inside the window the existing comment gets a new paragraph instead, and the record
// keeps every line. Debounced by the queue's delayInSeconds. Comments are written asApp (no page text changes).
import api from '@forge/api';
import { createFooterComment, displayNames, getPageMeta, updateFooterComment } from './confluence';
import { ensureSchema, eventDetailsForPage, getNotification, getPageState, saveNotification } from './db';
import { fromSqlDate, toSqlDate } from './ingest-rules';
import { groupForNotification, notificationBody, notificationLine, planNotification } from './review';
import { getSettings } from './settings-store';

export interface NotifyOutcome {
  pageId: string;
  outcome: 'disabled' | 'none' | 'created' | 'appended' | 'failed';
  lines: number;
  status?: number;
}

/** An event is notified once per change record: a replay that reopens the event notifies again. */
const sentKey = (e: { id: string; changeRecordId: string }) => `${e.id}@${e.changeRecordId}`;

export async function notifyPage(pageId: string): Promise<NotifyOutcome> {
  const settings = await getSettings();
  if (!settings.notifyEnabled) return { pageId, outcome: 'disabled', lines: 0 };
  await ensureSchema();
  const now = Date.now();
  const [events, existing, state] = await Promise.all([eventDetailsForPage(pageId), getNotification(pageId), getPageState(pageId)]);
  const sent = new Set(existing?.eventIds ?? []);
  const fresh = events.filter((e) => !sent.has(sentKey(e)) && !(e.snoozedUntil && (fromSqlDate(e.snoozedUntil) ?? 0) > now));
  // R-6: mention the PR author too, but only when their account resolves on this site (else name them).
  const authorIds = [...new Set(fresh.map((e) => e.changeAuthorAccountId).filter((a): a is string => !!a))];
  const known = authorIds.length > 0 ? await displayNames(api.asApp(), authorIds) : new Map<string, string>();
  const withAuthors = fresh.map((e) => ({ ...e, changeAuthorAccountId: e.changeAuthorAccountId && known.has(e.changeAuthorAccountId) ? e.changeAuthorAccountId : null }));
  // eventDetailsForPage is newest first; the comment reads oldest first.
  const lines = groupForNotification([...withAuthors].reverse()).map(notificationLine);
  const plan = planNotification(
    existing && { windowStart: fromSqlDate(existing.windowStart) ?? 0, commentId: existing.commentId },
    lines.length,
    now,
  );
  if (plan === 'none') return { pageId, outcome: 'none', lines: 0 };

  const ownerId = state?.ownerId ?? (await getPageMeta(api.asApp(), pageId)).ownerId ?? null;
  const eventIds = [...sent, ...fresh.map(sentKey)];

  if (plan === 'append' && existing?.commentId) {
    const all = [...existing.lines, ...lines];
    const res = await updateFooterComment(api.asApp(), existing.commentId, existing.commentVersion + 1, notificationBody(existing.ownerId, all));
    if (res.status >= 300) {
      // The comment may have been deleted. Keep the record (the cap still holds) and log.
      console.warn(`DDS_NOTIFY_APPEND_FAILED ${JSON.stringify({ pageId, status: res.status })}`);
    }
    await saveNotification({
      ...existing,
      commentVersion: res.status < 300 ? (res.version ?? existing.commentVersion + 1) : existing.commentVersion,
      eventIds,
      lines: all,
    });
    console.log(`DDS_NOTIFY ${JSON.stringify({ pageId, outcome: 'appended', lines })}`);
    return { pageId, outcome: 'appended', lines: lines.length, status: res.status };
  }

  const res = await createFooterComment(api.asApp(), pageId, notificationBody(ownerId, lines));
  if (res.status >= 300 || !res.id) {
    console.warn(`DDS_NOTIFY_FAILED ${JSON.stringify({ pageId, status: res.status, error: JSON.stringify(res.error ?? '').slice(0, 300) })}`);
    return { pageId, outcome: 'failed', lines: lines.length, status: res.status };
  }
  await saveNotification({ pageId, commentId: res.id, commentVersion: res.version ?? 1, windowStart: toSqlDate(now), eventIds, lines, ownerId });
  console.log(`DDS_NOTIFY ${JSON.stringify({ pageId, outcome: 'created', commentId: res.id, owner: ownerId !== null, lines })}`);
  return { pageId, outcome: 'created', lines: lines.length, status: res.status };
}
