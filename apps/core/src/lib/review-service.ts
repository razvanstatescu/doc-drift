// Review panel and dashboard services (F5, F6, F8). The resolvers check the clicking user's rights
// asUser first (D15, D20) through a `Gate`; these functions then write app-owned state asApp.
// The dev driver passes an open gate and an asApp reader, so it exercises the same code headlessly.
import { randomUUID } from 'node:crypto';
import { PAGE_STATE_LABELS, type Binding, type StoredPageState } from '@dds/shared';
import { anchorLabel } from './anchors';
import { GlobCache, normalizePath, pathMatchStrength, SENSITIVITY_THRESHOLDS } from '@dds/matcher';
import { displayNames, getPageStorage, getSpaceIdByKey, listSpacePages } from './confluence';
import { plural, stateTitle } from './copy';
import { renameQuickFixes } from './quick-fix';
import {
  backfillOwners,
  bindingsForPage,
  changesByIds,
  dashboardRows,
  decideRenameProposal,
  changesSince,
  deleteBinding,
  dismissEventRow,
  ensureSchema,
  eventChangesSince,
  getEventFull,
  openEventsForPage,
  setBindingExclude,
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
  statePagesAmong,
  statusCounts,
  updateBindingPattern,
  verifyDurations,
  type ChangeDetail,
} from './db';
import { diffForPaths, evidenceLevelFor, jiraChangelogView } from './agent-tools';
import { fromSqlDate, spaceWatched, toSqlDate } from './ingest-rules';
import { getSettings } from './settings-store';
import { refreshPage } from './page-state';
import {
  affectedSections,
  cleanNote,
  eventFiles,
  eventView,
  isDismissReason,
  medianDaysToVerify,
  pageWhySentence,
  parseSnoozeDays,
  rankPages,
  severityName,
  tokensForEvents,
  whySentence,
  type DismissReason,
} from './review';
import { suggestionsFor } from './suggestions';

/** api.asApp() or api.asUser(). */
type Requester = Parameters<typeof getPageStorage>[0];

export type Failure = { ok: false; error: string; message: string; restricted?: boolean; state?: 'unknown' };

/**
 * Checks the caller may act on a page: `read` for verify; `update` for dismiss, snooze (M3, D15),
 * anchor changes and fixes. `message` replaces the default "needs edit rights" wording.
 */
export type Gate = (pageId: string, need: 'read' | 'update', message?: string) => Promise<Failure | null>;

export const MESSAGES = {
  notVisible: 'Page not found or not visible to you.',
  restricted: "Restricted pages can't be watched yet.",
  needsEdit: 'You need edit rights on this page to change its anchors.',
  needsEditToTriage: 'You need edit rights on this page to dismiss or snooze its changes.',
  eventGone: 'This change is no longer open. Reload to see the latest.',
  proposalGone: 'This rename was already handled. Reload to see the latest.',
  badReason: 'Pick a reason: Not relevant, Already updated or False positive.',
  badDays: 'Snooze for 1 to 30 days.',
  nothingToSnooze: 'Nothing to snooze. This page has no open changes.',
  nothingToVerify: 'This page has no anchors, so there is nothing to verify. Add anchors first.',
  draft: 'Publish this page first, then add anchors.',
  stopWatchingNothing: 'This change has no file this anchor still watches.',
  bindingChanged: 'This anchor changed since the rename was proposed. Edit anchors instead.',
} as const;

function fail(error: string, message: string, extra: Partial<Failure> = {}): Failure {
  return { ok: false, error, message, ...extra };
}

/** `state` is the contract name; `status` mirrors it for the M1 modal code; `stateTitle` is the byline title. */
export function stateWords(status: StoredPageState): { state: StoredPageState; status: StoredPageState; statusLabel: string; stateTitle: string } {
  return { state: status, status, statusLabel: PAGE_STATE_LABELS[status], stateTitle: stateTitle(status) };
}

// ---------------------------------------------------------------------------
// getPageDrift
// ---------------------------------------------------------------------------
/** What the resolver knows about the caller and the page's space (getPageDrift contract, M4). */
export interface DriftAccess {
  /** `update` on the page (asUser operations). Read access is already checked. */
  canEdit: boolean;
  /** The space key from the module context, when there is one. */
  spaceKeyHint?: string | null;
  /** The caller is a Confluence administrator, so the panel can link to the settings page. */
  canConfigure?: boolean;
  settingsUrl?: string | null;
  /** asApp, for display names the caller's own lookup could not resolve. */
  appReader?: Requester;
}

export async function pageDrift(pageId: string, reader: Requester, access: DriftAccess): Promise<Record<string, unknown>> {
  await ensureSchema();
  const now = Date.now();
  const [page, bindings, state, events, proposals, settings] = await Promise.all([
    getPageStorage(reader, pageId),
    bindingsForPage(pageId),
    getPageState(pageId),
    eventDetailsForPage(pageId),
    openRenameProposals(pageId),
    getSettings(),
  ]);
  // D30: raw diffs and full Jira values only for callers who can edit the page.
  const evidenceLevel = evidenceLevelFor(access.canEdit);
  const changes = evidenceLevel === 'full' ? await changesByIds([...new Set(events.map((e) => e.changeRecordId))]) : new Map<string, ChangeDetail>();
  const status: StoredPageState = state?.status ?? (bindings.length > 0 ? 'verified' : 'unanchored');
  const names = await namesWithFallback(reader, access.appReader, [state?.verifiedBy]);
  const threshold = SENSITIVITY_THRESHOLDS[settings.sensitivity] ?? SENSITIVITY_THRESHOLDS.balanced;
  const views = events.map((e) => {
    const { snoozedUntil: rawSnooze, createdAt, ...rest } = e;
    const snoozedUntil = fromSqlDate(rawSnooze);
    const view = eventView({ ...rest, createdAt: fromSqlDate(createdAt) ?? now, ...(snoozedUntil !== undefined && { snoozedUntil }) }, now);
    if (evidenceLevel !== 'full') return view;
    const change = changes.get(e.changeRecordId);
    const paths = view.files.flatMap((f) => (f.oldPath ? [f.path, f.oldPath] : [f.path]));
    return {
      ...view,
      diff: e.source === 'bitbucket' ? diffForPaths(change?.hunks, paths) : null,
      ...(e.source === 'jira' && change?.record?.source === 'jira' && { changelog: jiraChangelogView(change.record.changelog, 'full') }),
    };
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
  const sections = page.storage ? affectedSections(page.storage, tokens) : [];
  // R-2: one deterministic sentence per event, naming the first section that mentions it.
  const eventById = new Map(events.map((e) => [e.id, e]));
  const withWhy = views.map((v) => {
    const e = eventById.get(v.id)!;
    const own = tokensForEvents([{ files: v.files, matchedTokens: e.matchedTokens, issueKey: e.source === 'jira' ? e.ref : null }]);
    const section = sections.find((sec) => sec.matchedTokens.some((t) => own.includes(t)))?.heading ?? null;
    return { ...v, whySentence: whySentence({ ...v, matchedTokens: e.matchedTokens }, { threshold, section }) };
  });
  const bindingById = new Map(bindings.map((b) => [b.id, b]));
  // Snoozed: every open event is snoozed into the future. The events are still returned.
  const snoozes = views.map((v) => v.snoozedUntil);
  const snoozedUntil = snoozes.length > 0 && snoozes.every((t) => t !== null && t > now) ? Math.max(...(snoozes as number[])) : null;
  const spaceKey = access.spaceKeyHint ?? state?.spaceKey ?? bindings.find((b) => b.spaceKey)?.spaceKey ?? null;
  const verifiedAt = fromSqlDate(state?.verifiedAt) ?? null;
  const verifiedContext = verifiedAt !== null ? await verifiedContextFor(pageId, bindings, state!.verifiedAt!) : null;
  const renameQuickFix = page.storage
    ? renameQuickFixes(page.storage, withWhy.map((v) => ({ eventId: v.id, ref: v.ref, files: v.files })))
    : [];
  return {
    ok: true,
    pageId,
    title: page.title ?? '',
    page: { status: 'current' as const },
    ...stateWords(status),
    whySentence: pageWhySentence(withWhy.map((v) => ({ ...v, matchedTokens: eventById.get(v.id)!.matchedTokens }))),
    canEdit: access.canEdit,
    canVerify: true,
    canDismiss: access.canEdit,
    canSnooze: access.canEdit,
    canEditAnchors: access.canEdit,
    canAcceptFix: access.canEdit,
    evidenceLevel,
    snoozedUntil,
    space: {
      key: spaceKey,
      watched: spaceWatched(settings, spaceKey),
      canConfigure: access.canConfigure ?? false,
      settingsUrl: access.canConfigure ? (access.settingsUrl ?? null) : null,
    },
    restricted: false,
    verifiedAt,
    verifiedBy: state?.verifiedBy ? { accountId: state.verifiedBy, displayName: names.get(state.verifiedBy) ?? null } : null,
    verifiedContext,
    events: withWhy,
    affectedSections: sections,
    renameQuickFix,
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
      exclude: b.exclude ?? [],
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
  // UX observation 1: an Unanchored page has nothing to verify; "Marked verified." would mislead.
  if ((await bindingsForPage(pageId)).length === 0) return fail('unanchored', MESSAGES.nothingToVerify);
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
  // Dismissing dampens the anchor for later changes, so it needs edit rights (M3).
  const denied = await gate(event.pageId, 'update', MESSAGES.needsEditToTriage);
  if (denied) return denied;
  if (event.status !== 'open' || !(await dismissEventRow(eventId, reason satisfies DismissReason, actor))) {
    return fail('not_open', MESSAGES.eventGone);
  }
  await incrementDismissCount(event.bindingId);
  // UX observation: dismissing the last open change is a review. Record who did it, so the panel says
  // "Verified by Dana" instead of an anonymous "Verified".
  if ((await openEventsForPage(event.pageId)).length === 0) {
    const current = await getPageState(event.pageId);
    await recordVerification({
      id: randomUUID(),
      pageId: event.pageId,
      spaceKey: current?.spaceKey ?? null,
      userId: actor,
      closedEventIds: [eventId],
      note: `Dismissed the last open change (${reason})`,
      method: 'dismissed',
      driftSince: null,
    });
  }
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
  const denied = await gate(pageId, 'update', MESSAGES.needsEditToTriage);
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
export async function spaceDashboard(rawSpaceKey: string, reader: Requester, spaceIdHint?: string) {
  // BUG-10: `plat` means PLAT (global keys are uppercase); personal `~` keys keep their case.
  const spaceKey = rawSpaceKey.startsWith('~') ? rawSpaceKey : rawSpaceKey.toUpperCase();
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
  // BUG-11: keyed on the space's page listing, not the stored space key, so a page moved in counts here.
  const pageIds = await statePagesAmong([...visible.keys()]);
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
        lastChangeAt: fromSqlDate(r.lastAt) ?? null,
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

// ---------------------------------------------------------------------------
// Helpers for getPageDrift (phase 2)
// ---------------------------------------------------------------------------
/** Display names via the caller, then asApp for any the caller's lookup missed ("always set when known"). */
async function namesWithFallback(reader: Requester, app: Requester | undefined, ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const names = await displayNames(reader, ids);
  const missing = ids.filter((id): id is string => !!id && !names.has(id));
  if (app && missing.length > 0) for (const [k, v] of await displayNames(app, missing)) names.set(k, v);
  return names;
}

const shortRepo = (r: string | null | undefined) => (r ?? '').toLowerCase().split('/').at(-1) ?? '';

/**
 * R-8: changes to the page's anchored code or Jira work since it was verified (`changesSince`), and how
 * many of them flagged it (`relevant`). "12 changes since, none relevant" shows the watch is working.
 */
export async function verifiedContextFor(pageId: string, bindings: Binding[], verifiedAtSql: string): Promise<{ changesSince: number; relevant: number; since: number | null }> {
  const code = bindings.filter((b) => b.anchorType === 'path' || b.anchorType === 'glob' || b.anchorType === 'repo');
  const jiraKeys = [...new Set(bindings.filter((b) => b.anchorType === 'jira' && b.jiraKey).map((b) => b.jiraKey!))];
  const repos = [...new Map(code.filter((b) => b.repo).map((b) => {
    const r = b.repo!.toLowerCase();
    return [r, r.includes('/') ? { full: r, slug: shortRepo(r) } : { full: null, slug: r }] as const;
  })).values()];
  const since = fromSqlDate(verifiedAtSql) ?? null;
  if (repos.length === 0 && jiraKeys.length === 0) return { changesSince: 0, relevant: 0, since };
  const [changes, flagged] = await Promise.all([changesSince(repos, jiraKeys, verifiedAtSql), eventChangesSince(pageId, verifiedAtSql)]);
  const globs = new GlobCache();
  const touching = changes.filter((c) => {
    if (c.source === 'jira') return c.issueKey !== null && jiraKeys.includes(c.issueKey);
    return code.some((b) => shortRepo(b.repo) === shortRepo(c.repo) && c.files.some((f) => pathMatchStrength(b, f, globs) > 0));
  });
  return { changesSince: touching.length, relevant: touching.filter((c) => flagged.has(c.id)).length, since };
}

// ---------------------------------------------------------------------------
// stopWatchingPath (R-7): "Not relevant" narrows the anchor
// ---------------------------------------------------------------------------
/**
 * Stops watching an event's files for its page. An exact path anchor is removed; a glob or whole-repo
 * anchor gets the files on its exclude list. A still-open event is dismissed as `not_relevant` (without
 * raising the dampener: the anchor no longer sees these files). Needs edit rights (D31).
 */
export async function stopWatchingPath(eventId: unknown, actor: string | null, gate: Gate) {
  if (typeof eventId !== 'string' || eventId === '') return fail('bad_request', MESSAGES.eventGone);
  await ensureSchema();
  const event = await getEventFull(eventId);
  if (!event) return fail('not_found', MESSAGES.eventGone);
  const denied = await gate(event.pageId, 'update', MESSAGES.needsEdit);
  if (denied) return denied;
  if (event.source !== 'bitbucket') return fail('bad_request', 'Only code anchors can stop watching a path. Remove the Jira anchor in Anchors instead.');
  const binding = await getBinding(event.bindingId);
  if (!binding || binding.pageId !== event.pageId) return fail('binding_changed', 'This anchor was changed or removed since. Reload to see the latest.');
  const files = eventFiles(event.files, event.changeFiles);
  const paths = [...new Set(files.flatMap((f) => (f.oldPath ? [f.path, f.oldPath] : [f.path])).map(normalizePath))];
  let action: 'removed' | 'narrowed';
  let excluded: string[] = [];
  if (binding.anchorType === 'path') {
    await deleteBinding(binding.id);
    action = 'removed';
  } else {
    const current = binding.exclude ?? [];
    excluded = paths.filter((p) => !current.includes(p));
    if (excluded.length === 0 && current.length > 0) return fail('nothing_open', MESSAGES.stopWatchingNothing);
    await setBindingExclude(binding.id, [...current, ...excluded]);
    action = 'narrowed';
  }
  if (event.status === 'open') await dismissEventRow(eventId, 'not_relevant', actor);
  const state = await refreshPage(event.pageId);
  const label = anchorLabel(binding);
  const what = paths.length === 1 ? paths[0]! : plural(paths.length, 'file');
  console.log(`DDS_STOP_WATCHING ${JSON.stringify({ eventId, pageId: event.pageId, bindingId: binding.id, action, excluded, status: state.status })}`);
  return {
    ok: true,
    pageId: event.pageId,
    action,
    bindingId: binding.id,
    anchor: label,
    excluded,
    ...stateWords(state.status),
    openEvents: state.openEventCount,
    message: action === 'removed' ? `Stopped watching ${what} for this page. The anchor is removed.` : `Stopped watching ${what} for this page. ${label} still watches the rest.`,
  };
}
