// Resolver for the byline modal (binding UI, F1). Every user-facing read goes asUser; app-owned
// state is written asApp only after the clicking user's rights are checked asUser (D15).
import api from '@forge/api';
import Resolver from '@forge/resolver';
import { PAGE_STATE_LABELS } from '@dds/shared';
import { anchorLabel, normalizeAnchor, type AnchorInput } from '../lib/anchors';
import { saveBindings, suggestionsFor } from '../lib/bindings-service';
import { refLabel } from '../lib/copy';
import { getPageMeta, getPageStorage, pageOperations } from '../lib/confluence';
import { bindingsForPage, ensureSchema, getPageState, openEventsForPage } from '../lib/db';
import { fromSqlDate } from '../lib/ingest-rules';

interface BylineContext {
  accountId?: string;
  extension?: { content?: { id?: string | number }; space?: { key?: string } };
}

const resolver = new Resolver();

function pageIdOf(context: BylineContext): string | undefined {
  const id = context.extension?.content?.id;
  return id === undefined ? undefined : String(id);
}

/**
 * D20: the app user cannot read pages with view restrictions (confirmed live 2026-11-11: asApp
 * GET page, properties and operations all return 404). If the user can see the page and the app
 * can't, the page is restricted.
 */
async function appCannotRead(pageId: string): Promise<boolean> {
  const asApp = await getPageMeta(api.asApp(), pageId);
  return asApp.status === 404 || asApp.status === 403;
}

resolver.define('load', async ({ context }) => {
  const ctx = context as BylineContext;
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
  return r.ok ? { ok: true, anchor: { ...r.value, label: anchorLabel(r.value) } } : r;
});

resolver.define('save', async ({ payload, context }) => {
  const ctx = context as BylineContext;
  const pageId = pageIdOf(ctx);
  if (!pageId) return { ok: false, message: 'No page in context.' };

  // D15: check the clicking user's rights asUser before any asApp write.
  const user = await pageOperations(api.asUser(), pageId);
  if (!user.ops.has('update')) {
    console.log(`DDS_BYLINE_SAVE_DENIED pageId=${pageId} status=${user.status}`);
    return { ok: false, message: 'You need edit rights on this page to change its anchors.' };
  }
  if (await appCannotRead(pageId)) return { ok: false, restricted: true, message: "Restricted pages can't be watched yet." };

  const anchors = Array.isArray((payload as { anchors?: unknown })?.anchors) ? ((payload as { anchors: AnchorInput[] }).anchors) : [];
  const result = await saveBindings({
    pageId,
    spaceKey: ctx.extension?.space?.key ?? null,
    anchors,
    actorAccountId: ctx.accountId ?? null,
    method: 'binding',
  });
  if (!result.ok) return { ok: false, errors: result.errors, message: 'Some anchors need a fix.' };
  return { ok: true, status: result.state.status, statusLabel: PAGE_STATE_LABELS[result.state.status], closedEvents: result.closedEvents };
});

export const handler = resolver.getDefinitions();
