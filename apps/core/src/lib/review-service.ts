// Review panel and dashboard services (F5, F6, F8). The resolvers check the clicking user's rights
// asUser first (D15, D20) through a `Gate`; these functions then write app-owned state asApp.
// The dev driver passes an open gate and an asApp reader, so it exercises the same code headlessly.
import { randomUUID } from 'node:crypto';
import { PAGE_STATE_LABELS, type StoredPageState } from '@dds/shared';
import { anchorLabel } from './anchors';
import { displayNames, getPageStorage, getSpaceIdByKey, listSpacePages } from './confluence';
import {
  backfillOwners,
  bindingsForPage,
  dashboardRows,
  decideRenameProposal,
  dismissEventRow,
  ensureSchema,
  eventDetailsForPage,
  getBinding,
  getEvent,
  getPageState,
  getRenameProposal,
  incrementDismissCount,
  openRenameProposals,
  ownerCounts,
  recordVerification,
  resolveOpenEvents,
  snoozeOpenEvents,
  statePagesInSpace,
  statusCounts,
  updateBindingPattern,
  verifyDurations,
} from './db';
import { fromSqlDate, toSqlDate } from './ingest-rules';
import { refreshPage } from './page-state';
import {
  affectedSections,
  cleanNote,
  eventFiles,
  eventView,
  isDismissReason,
  medianDaysToVerify,
  parseSnoozeDays,
  rankPages,
  severityName,
  tokensForEvents,
  type DismissReason,
} from './review';
import { suggestionsFor } from './suggestions';

/** api.asApp() or api.asUser(). */
type Requester = Parameters<typeof getPageStorage>[0];

export type Failure = { ok: false; error: string; message: string; restricted?: boolean; state?: 'unknown' };

/** Checks the caller may act on a page: `read` for verify, dismiss and snooze; `update` for anchor changes. */
export type Gate = (pageId: string, need: 'read' | 'update') => Promise<Failure | null>;

export const MESSAGES = {
  notVisible: 'Page not found or not visible to you.',
  restricted: "Restricted pages can't be watched yet.",
  needsEdit: 'You need edit rights on this page to change its anchors.',
  eventGone: 'This change is no longer open. Reload to see the latest.',
  proposalGone: 'This rename was already handled. Reload to see the latest.',
  badReason: 'Pick a reason: Not relevant, Already updated or False positive.',
  badDays: 'Snooze for 1 to 30 days.',
  nothingToSnooze: 'Nothing to snooze. This page has no open changes.',
  bindingChanged: 'This anchor changed since the rename was proposed. Edit anchors instead.',
} as const;

function fail(error: string, message: string, extra: Partial<Failure> = {}): Failure {
  return { ok: false, error, message, ...extra };
}

/** `state` is the contract name; `status` mirrors it for the M1 modal code. */
function stateWords(status: StoredPageState): { state: StoredPageState; status: StoredPageState; statusLabel: string } {
  return { state: status, status, statusLabel: PAGE_STATE_LABELS[status] };
}

// ---------------------------------------------------------------------------
// getPageDrift
// ---------------------------------------------------------------------------
export async function pageDrift(pageId: string, reader: Requester, access: { canEdit: boolean }): Promise<Record<string, unknown>> {
  await ensureSchema();
  const now = Date.now();
  const [page, bindings, state, events, proposals] = await Promise.all([
    getPageStorage(reader, pageId),
    bindingsForPage(pageId),
    getPageState(pageId),
    eventDetailsForPage(pageId),
    openRenameProposals(pageId),
  ]);
  const status: StoredPageState = state?.status ?? (bindings.length > 0 ? 'verified' : 'unanchored');
  const names = await displayNames(reader, [state?.verifiedBy]);
  const views = events.map((e) => {
    const { snoozedUntil: rawSnooze, createdAt, ...rest } = e;
    const snoozedUntil = fromSqlDate(rawSnooze);
    return eventView({ ...rest, createdAt: fromSqlDate(createdAt) ?? now, ...(snoozedUntil !== undefined && { snoozedUntil }) }, now);
  });
  // Polish item 1: High before Medium, newest first within a severity (the query is newest first).
  views.sort((a, b) => (a.severity === b.severity ? b.at - a.at : a.severity === 'high' ? -1 : 1));
  const tokens = tokensForEvents(
    events.map((e) => ({
      files: e.source === 'bitbucket' ? eventFiles(e.files, e.changeFiles) : [],
      matchedTokens: e.matchedTokens,
      issueKey: e.source === 'jira' ? e.ref : null,
    })),
  );
  const bindingById = new Map(bindings.map((b) => [b.id, b]));
  return {
    ok: true,
    pageId,
    title: page.title ?? '',
    ...stateWords(status),
    canEdit: access.canEdit,
    restricted: false,
    verifiedAt: fromSqlDate(state?.verifiedAt) ?? null,
    verifiedBy: state?.verifiedBy ? { accountId: state.verifiedBy, displayName: names.get(state.verifiedBy) ?? null } : null,
    events: views,
    affectedSections: page.storage ? affectedSections(page.storage, tokens) : [],
    renameProposals: proposals
      .filter((p) => bindingById.has(p.bindingId))
      .map((p) => ({ id: p.id, bindingId: p.bindingId, from: p.from, to: p.to, anchor: anchorLabel(bindingById.get(p.bindingId)!) })),
    bindings: bindings.map((b) => ({
      id: b.id,
      anchorType: b.anchorType,
      repo: b.repo ?? '',
      pattern: b.pattern ?? '',
      jiraKey: b.jiraKey ?? '',
      weight: b.weight,
      dismissCount: b.dismissCount ?? 0,
      label: anchorLabel(b),
    })),
    suggestions: page.storage ? suggestionsFor(page.storage, bindings) : [],
  };
}

// ---------------------------------------------------------------------------
// Writes (callers have passed the gate)
// ---------------------------------------------------------------------------
export async function markVerified(pageId: string, actor: string | null, rawNote: unknown, gate: Gate, method: 'manual' | 'agent' | 'dev' = 'manual') {
  const denied = await gate(pageId, 'read');
  if (denied) return denied;
  await ensureSchema();
  const note = cleanNote(rawNote);
  const closed = await resolveOpenEvents(pageId, actor);
  const current = await getPageState(pageId);
  await recordVerification({
    id: randomUUID(),
    pageId,
    spaceKey: current?.spaceKey ?? null,
    userId: actor,
    closedEventIds: [...closed],
    note,
    method,
    driftSince: closed.oldest ?? null,
  });
  const state = await refreshPage(pageId);
  console.log(`DDS_VERIFIED ${JSON.stringify({ pageId, closed: closed.length, status: state.status, method })}`);
  return { ok: true, ...stateWords(state.status), closedEvents: closed.length, message: verifiedMessage(closed.length) };
}

function verifiedMessage(closed: number): string {
  return closed === 0 ? 'Marked verified.' : `Marked verified. Closed ${closed} ${closed === 1 ? 'change' : 'changes'}.`;
}

export async function dismissEvent(eventId: unknown, reason: unknown, actor: string | null, gate: Gate) {
  if (typeof eventId !== 'string' || eventId === '') return fail('bad_request', MESSAGES.eventGone);
  if (!isDismissReason(reason)) return fail('bad_request', MESSAGES.badReason);
  await ensureSchema();
  const event = await getEvent(eventId);
  if (!event) return fail('not_found', MESSAGES.eventGone);
  const denied = await gate(event.pageId, 'read');
  if (denied) return denied;
  if (event.status !== 'open' || !(await dismissEventRow(eventId, reason satisfies DismissReason, actor))) {
    return fail('not_open', MESSAGES.eventGone);
  }
  await incrementDismissCount(event.bindingId);
  const state = await refreshPage(event.pageId);
  console.log(`DDS_DISMISSED ${JSON.stringify({ eventId, pageId: event.pageId, reason, status: state.status, open: state.openEventCount })}`);
  return {
    ok: true,
    pageId: event.pageId,
    ...stateWords(state.status),
    openEvents: state.openEventCount,
    message: state.openEventCount === 0 ? `Dismissed. No open changes left. This page is ${PAGE_STATE_LABELS[state.status]}.` : 'Dismissed.',
  };
}

export async function snoozePage(pageId: string, rawDays: unknown, gate: Gate) {
  const days = parseSnoozeDays(rawDays);
  if (days === undefined) return fail('bad_request', MESSAGES.badDays);
  const denied = await gate(pageId, 'read');
  if (denied) return denied;
  await ensureSchema();
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  const n = await snoozeOpenEvents(pageId, toSqlDate(until));
  if (n === 0) return fail('nothing_open', MESSAGES.nothingToSnooze);
  const state = await refreshPage(pageId);
  console.log(`DDS_SNOOZED ${JSON.stringify({ pageId, days, events: n, status: state.status })}`);
  return { ok: true, ...stateWords(state.status), snoozedUntil: until, message: `Snoozed for ${days} ${days === 1 ? 'day' : 'days'}.` };
}

export async function decideRename(proposalId: unknown, decision: 'accepted' | 'rejected', actor: string | null, gate: Gate) {
  if (typeof proposalId !== 'string' || proposalId === '') return fail('bad_request', MESSAGES.proposalGone);
  await ensureSchema();
  const proposal = await getRenameProposal(proposalId);
  if (!proposal || proposal.status !== 'open') return fail('not_found', MESSAGES.proposalGone);
  const denied = await gate(proposal.pageId, 'update');
  if (denied) return denied;
  if (decision === 'accepted') {
    const binding = await getBinding(proposal.bindingId);
    if (!binding || binding.pattern !== proposal.from) {
      await decideRenameProposal(proposalId, 'rejected', actor);
      return fail('binding_changed', MESSAGES.bindingChanged);
    }
    await updateBindingPattern(binding.id, proposal.to);
  }
  if (!(await decideRenameProposal(proposalId, decision, actor))) return fail('not_found', MESSAGES.proposalGone);
  const state = await refreshPage(proposal.pageId);
  console.log(`DDS_RENAME_${decision.toUpperCase()} ${JSON.stringify({ proposalId, pageId: proposal.pageId, from: proposal.from, to: proposal.to })}`);
  return {
    ok: true,
    pageId: proposal.pageId,
    ...stateWords(state.status),
    message: decision === 'accepted' ? `Anchor updated to ${proposal.to}.` : `Kept the anchor on ${proposal.from}.`,
  };
}

// ---------------------------------------------------------------------------
// getSpaceDashboard
// ---------------------------------------------------------------------------
export async function spaceDashboard(spaceKey: string, reader: Requester, spaceIdHint?: string) {
  await ensureSchema();
  const space = await getSpaceIdByKey(reader, spaceKey);
  const spaceId = spaceIdHint ?? space.id;
  if (!spaceId) return fail('not_visible', 'Space not found or not visible to you.');
  const listing = await listSpacePages(reader, spaceId);
  if (listing.status >= 300) return fail('not_visible', 'Space not found or not visible to you.');
  // Polish item 3: the space home page is not documentation to anchor, so it never counts.
  const listed = listing.pages.filter((p) => p.id !== space.homepageId);
  const visible = new Map(listed.map((p) => [p.id, p]));
  // Permission-aware: only pages the caller can see count or show.
  const pageIds = (await statePagesInSpace(spaceKey)).filter((id) => visible.has(id));
  await backfillOwners(pageIds.flatMap((id) => (visible.get(id)?.ownerId ? [{ pageId: id, ownerId: visible.get(id)!.ownerId! }] : [])));
  const [counts, owners, rows, durations] = await Promise.all([
    statusCounts(pageIds),
    ownerCounts(pageIds),
    dashboardRows(pageIds),
    verifyDurations(pageIds),
  ]);
  const names = await displayNames(reader, [...owners.map((o) => o.ownerId), ...rows.map((r) => r.ownerId)]);
  const total = listed.length;
  const anchored = (counts.verified ?? 0) + (counts.possibly_stale ?? 0) + (counts.stale ?? 0);
  // Polish item 4: only drifted pages are listed; the UI shows its empty state when there are none.
  const pages = rankPages(
    rows.filter((r) => r.status === 'possibly_stale' || r.status === 'stale').map((r) => {
      const p = visible.get(r.pageId);
      const ownerId = r.ownerId ?? p?.ownerId ?? null;
      return {
        pageId: r.pageId,
        title: p?.title ?? '',
        url: p?.url ?? null,
        status: r.status,
        statusLabel: PAGE_STATE_LABELS[r.status],
        maxSeverity: r.maxSeverity,
        openEvents: r.openEvents,
        since: fromSqlDate(r.since) ?? null,
        ownerId,
        ownerName: ownerId ? (names.get(ownerId) ?? null) : null,
      };
    }),
  ).map((p) => ({ ...p, maxSeverity: severityName(p.maxSeverity) }));
  const pairs = durations
    .map((d) => ({ at: fromSqlDate(d.at), since: fromSqlDate(d.since) }))
    .filter((d): d is { at: number; since: number } => d.at !== undefined && d.since !== undefined);
  return {
    ok: true,
    spaceKey,
    kpis: {
      anchored,
      total,
      anchoredPct: total > 0 ? Math.round((anchored / total) * 100) : 0,
      possiblyStale: counts.possibly_stale ?? 0,
      stale: counts.stale ?? 0,
      medianTimeToVerifyDays: medianDaysToVerify(pairs),
    },
    pages,
    owners: owners.map((o) => ({ ownerId: o.ownerId, ownerName: o.ownerId ? (names.get(o.ownerId) ?? null) : null, open: o.open, pages: o.pages })),
    truncated: listing.truncated,
  };
}
