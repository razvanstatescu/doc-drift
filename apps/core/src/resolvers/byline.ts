// Resolver `byline-resolver`: the byline modal (binding UI F1, review panel F5) and the space
// dashboard (F8) call it. Every user-facing read goes asUser; app-owned state is written asApp only
// after the clicking user's rights are checked asUser with GET /pages/{id}/operations (D15).
// Restricted pages are unsupported (D20): if the user can see a page and the app can't, it is restricted.
import api from '@forge/api';
import Resolver from '@forge/resolver';
import { PAGE_STATE_LABELS } from '@dds/shared';
import { anchorLabel, normalizeAnchor, type AnchorInput } from '../lib/anchors';
import { saveBindings, suggestionsFor } from '../lib/bindings-service';
import { refLabel, stateTitle } from '../lib/copy';
import { normalizeSpaceKey, saveSpaceAnchors, suggestSpaceAnchors } from '../lib/space-anchors';
import { appCannotRead as appCannotReadAs, makeGate, notVisible } from '../lib/access';
import { AGENT } from '../lib/agent-meta';
import { currentUserIsAdmin, getPageStatus, getPageStorage, pageOperations } from '../lib/confluence';
import { getSettingsLocation } from '../lib/settings-store';
import { applyProposal, applyRenameQuickFix, listProposals, rejectProposal } from '../lib/fix-service';
import { bindingsForPage, ensureSchema, getPageState, openEventsForPage } from '../lib/db';
import { fromSqlDate } from '../lib/ingest-rules';
import {
  decideRename,
  dismissEvent,
  markVerified,
  MESSAGES,
  pageDrift,
  snoozePage,
  spaceDashboard,
  stateWords,
  stopWatchingPath,
  type Gate,
} from '../lib/review-service';

interface ResolverContext {
  accountId?: string;
  siteUrl?: string;
  localId?: string;
  extension?: { content?: { id?: string | number }; space?: { key?: string; id?: string | number } };
}

const resolver = new Resolver();

function pageIdOf(context: ResolverContext, payload?: unknown): string | undefined {
  const fromPayload = (payload as { pageId?: unknown } | undefined)?.pageId;
  const id = fromPayload ?? context.extension?.content?.id;
  return id === undefined || id === null || id === '' ? undefined : String(id);
}

const appCannotRead = (pageId: string) => appCannotReadAs(api.asApp(), pageId);

/** asUser permission check, then the D20 restriction check. Logged, never trusted from the client. */
const userGate: Gate = (pageId, need, message) => makeGate(api.asUser(), api.asApp())(pageId, need, message);

// ---------------------------------------------------------------------------
// Review panel (M2 contract)
// ---------------------------------------------------------------------------
resolver.define('getPageDrift', async ({ payload, context }) => {
  const ctx = context as ResolverContext;
  const pageId = pageIdOf(ctx, payload);
  if (!pageId) return notVisible();
  const user = await pageOperations(api.asUser(), pageId);
  if (user.status >= 300 || !user.ops.has('read')) return notVisible();
  if (await appCannotRead(pageId)) {
    // UX-2: an unpublished draft is not restricted; the app can't read it until it is published.
    if ((await getPageStatus(api.asUser(), pageId)) === 'draft') {
      console.log(`DDS_BYLINE_DRAFT pageId=${pageId}`);
      return { ok: true, pageId, draft: true, page: { status: 'draft' }, restricted: false, ...stateWords('unanchored'), canEdit: user.ops.has('update'), message: MESSAGES.draft };
    }
    console.log(`DDS_BYLINE_RESTRICTED pageId=${pageId}`);
    return { ok: true, pageId, restricted: true, page: { status: 'current' }, state: 'unanchored', canEdit: user.ops.has('update'), message: MESSAGES.restricted };
  }
  const canConfigure = await currentUserIsAdmin(api.asUser());
  return pageDrift(pageId, api.asUser(), {
    canEdit: user.ops.has('update'),
    spaceKeyHint: ctx.extension?.space?.key ?? null,
    canConfigure,
    settingsUrl: canConfigure ? await settingsUrlFor(ctx) : null,
    appReader: api.asApp(),
  });
});

/**
 * The settings page URL: the location saved the last time an administrator opened settings, else the
 * Manage apps page (its Configure link opens the same settings).
 */
async function settingsUrlFor(ctx: ResolverContext): Promise<string> {
  const saved = await getSettingsLocation();
  if (saved) return saved;
  const site = typeof ctx.siteUrl === 'string' && /^https:\/\//.test(ctx.siteUrl) ? ctx.siteUrl.replace(/\/+$/, '') : '';
  return `${site}/wiki/plugins/servlet/upm`;
}

resolver.define('markVerified', async ({ payload, context }) => {
  const ctx = context as ResolverContext;
  const pageId = pageIdOf(ctx, payload);
  if (!pageId) return notVisible();
  return markVerified(pageId, ctx.accountId ?? null, (payload as { note?: unknown })?.note, userGate);
});

resolver.define('dismissEvent', async ({ payload, context }) => {
  const p = (payload ?? {}) as { eventId?: unknown; reason?: unknown };
  return dismissEvent(p.eventId, p.reason, (context as ResolverContext).accountId ?? null, userGate);
});

resolver.define('snoozePage', async ({ payload, context }) => {
  const pageId = pageIdOf(context as ResolverContext, payload);
  if (!pageId) return notVisible();
  return snoozePage(pageId, (payload as { days?: unknown })?.days, userGate);
});

resolver.define('acceptRename', async ({ payload, context }) => {
  return decideRename((payload as { proposalId?: unknown })?.proposalId, 'accepted', (context as ResolverContext).accountId ?? null, userGate);
});

resolver.define('rejectRename', async ({ payload, context }) => {
  return decideRename((payload as { proposalId?: unknown })?.proposalId, 'rejected', (context as ResolverContext).accountId ?? null, userGate);
});

// ---------------------------------------------------------------------------
// Propose fix (M3, F11, D6). Drafts come from Drift Reviewer (submit-fix-proposal); the page text
// changes only here, asUser, when a person with edit rights clicks Accept fix.
// ---------------------------------------------------------------------------
const fixDeps = (ctx: ResolverContext) => ({ user: api.asUser(), gate: userGate, accountId: ctx.accountId ?? null });

resolver.define('getProposals', async ({ payload, context }) => {
  const ctx = context as ResolverContext;
  const pageId = pageIdOf(ctx, payload);
  if (!pageId) return notVisible();
  return listProposals(pageId, fixDeps(ctx));
});

resolver.define('applyProposal', async ({ payload, context }) => {
  return applyProposal((payload as { proposalId?: unknown })?.proposalId, fixDeps(context as ResolverContext));
});

resolver.define('rejectProposal', async ({ payload, context }) => {
  return rejectProposal((payload as { proposalId?: unknown })?.proposalId, fixDeps(context as ResolverContext));
});

// ---------------------------------------------------------------------------
// Phase 2: stop watching a path (R-7), rename quick fix (R-4), anchor a whole space (R-1)
// ---------------------------------------------------------------------------
resolver.define('stopWatchingPath', async ({ payload, context }) => {
  return stopWatchingPath((payload as { eventId?: unknown })?.eventId, (context as ResolverContext).accountId ?? null, userGate);
});

resolver.define('applyRenameQuickFix', async ({ payload, context }) => {
  return applyRenameQuickFix((payload as { eventId?: unknown })?.eventId, fixDeps(context as ResolverContext));
});

resolver.define('suggestSpaceAnchors', async ({ payload, context }) => {
  const ctx = context as ResolverContext;
  const p = (payload ?? {}) as { spaceKey?: unknown; limit?: unknown };
  const key = String(p.spaceKey ?? ctx.extension?.space?.key ?? '').trim();
  const hint = ctx.extension?.space?.key && key && ctx.extension.space.key.toUpperCase() === key.toUpperCase() && ctx.extension.space.id !== undefined ? String(ctx.extension.space.id) : undefined;
  return suggestSpaceAnchors(key, p.limit, api.asUser(), api.asApp(), hint);
});

resolver.define('saveSpaceAnchors', async ({ payload, context }) => {
  const ctx = context as ResolverContext;
  const p = (payload ?? {}) as { items?: unknown; spaceKey?: unknown };
  const key = String(p.spaceKey ?? ctx.extension?.space?.key ?? '').trim();
  return saveSpaceAnchors(p.items, { user: api.asUser(), app: api.asApp(), accountId: ctx.accountId ?? null, spaceKey: key ? normalizeSpaceKey(key) : null });
});

/** What `rovo.open({type: 'forge', agentName, agentKey})` needs: the manifest's rovo:agent name and key. */
resolver.define('getRovoAgentInfo', async () => ({ ok: true, agentName: AGENT.name, agentKey: AGENT.key }));

// ---------------------------------------------------------------------------
// Space dashboard (F8). Reads asUser, so only pages the caller can see count or show.
// ---------------------------------------------------------------------------
resolver.define('getSpaceDashboard', async ({ payload, context }) => {
  const ctx = context as ResolverContext;
  const raw = String((payload as { spaceKey?: unknown })?.spaceKey ?? ctx.extension?.space?.key ?? '').trim();
  if (!raw) return { ok: false, error: 'not_visible', message: 'Space not found or not visible to you.' };
  // BUG-10: case-insensitive (`plat` is PLAT).
  const spaceKey = normalizeSpaceKey(raw);
  const ctxKey = ctx.extension?.space?.key;
  const hint = ctxKey && normalizeSpaceKey(ctxKey) === spaceKey && ctx.extension?.space?.id !== undefined ? String(ctx.extension.space.id) : undefined;
  return spaceDashboard(spaceKey, api.asUser(), hint);
});

// ---------------------------------------------------------------------------
// Binding modal (M1). `load` is kept as an alias for older UI code.
// ---------------------------------------------------------------------------
resolver.define('load', async ({ context }) => {
  const ctx = context as ResolverContext;
  const pageId = pageIdOf(ctx);
  if (!pageId) return { error: 'no_page' };

  const user = await pageOperations(api.asUser(), pageId);
  if (user.status >= 300 || !user.ops.has('read')) return { error: 'not_visible' };
  if (await appCannotRead(pageId)) {
    console.log(`DDS_BYLINE_RESTRICTED pageId=${pageId}`);
    return { pageId, restricted: true };
  }

  await ensureSchema();
  const [page, bindings, state, events] = await Promise.all([
    getPageStorage(api.asUser(), pageId),
    bindingsForPage(pageId),
    getPageState(pageId),
    openEventsForPage(pageId),
  ]);
  const status = state?.status ?? (bindings.length > 0 ? 'verified' : 'unanchored');
  return {
    pageId,
    restricted: false,
    title: page.title ?? '',
    canEdit: user.ops.has('update'),
    status,
    statusLabel: PAGE_STATE_LABELS[status],
    verifiedAt: fromSqlDate(state?.verifiedAt) ?? null,
    anchors: bindings.map((b) => ({
      id: b.id,
      anchorType: b.anchorType,
      repo: b.repo ?? '',
      pattern: b.pattern ?? '',
      jiraKey: b.jiraKey ?? '',
      weight: b.weight,
      label: anchorLabel(b),
    })),
    suggestions: page.storage ? suggestionsFor(page.storage, bindings) : [],
    events: events.slice(0, 5).map((e) => ({
      id: e.id,
      ref: refLabel(e.ref, e.source),
      summary: e.summary,
      severity: e.severity,
      anchor: e.matchedAnchor,
      at: fromSqlDate(e.createdAt) ?? null,
    })),
  };
});

/** Validates one anchor typed in the manual form, so the modal can show the error inline. */
resolver.define('checkAnchor', async ({ payload }) => {
  const r = normalizeAnchor((payload ?? {}) as AnchorInput);
  return r.ok ? { ok: true, anchor: { ...r.value, label: anchorLabel(r.value) }, ...(r.warning && { warning: r.warning }) } : r;
});

resolver.define('save', async ({ payload, context }) => {
  const ctx = context as ResolverContext;
  const pageId = pageIdOf(ctx);
  if (!pageId) return { ok: false, message: 'No page in context.' };

  // D15: check the clicking user's rights asUser before any asApp write.
  const user = await pageOperations(api.asUser(), pageId);
  if (!user.ops.has('update')) {
    console.log(`DDS_BYLINE_SAVE_DENIED pageId=${pageId} status=${user.status}`);
    return { ok: false, message: MESSAGES.needsEdit };
  }
  if (await appCannotRead(pageId)) return { ok: false, restricted: true, message: MESSAGES.restricted };

  const anchors = Array.isArray((payload as { anchors?: unknown })?.anchors) ? ((payload as { anchors: AnchorInput[] }).anchors) : [];
  const result = await saveBindings({
    pageId,
    spaceKey: ctx.extension?.space?.key ?? null,
    anchors,
    actorAccountId: ctx.accountId ?? null,
    method: 'binding',
  });
  if (!result.ok) return { ok: false, errors: result.errors, message: 'Some anchors need a fix.' };
  return { ok: true, status: result.state.status, statusLabel: PAGE_STATE_LABELS[result.state.status], stateTitle: stateTitle(result.state.status), closedEvents: result.closedEvents };
});

export const handler = resolver.getDefinitions();
