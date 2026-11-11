// R-1: anchor a whole space at once. `suggestSpaceAnchors` runs the F1 page-body suggester over the
// space's unanchored pages (asUser reads: only pages the caller can see); `saveSpaceAnchors` saves the
// chosen anchors page by page, each after its own D15 check (edit rights asUser) and D20 check, and
// reports partial results. Deterministic, no LLM.
import { PAGE_STATE_LABELS } from '@dds/shared';
import { appCannotRead } from './access';
import { anchorKey, type AnchorInput } from './anchors';
import { saveBindings } from './bindings-service';
import { getPageStorage, getSpaceIdByKey, listSpacePages, pageOperations } from './confluence';
import { stateTitle } from './copy';
import { bindingCountsFor, bindingsForPage, ensureSchema } from './db';
import { MESSAGES } from './review-service';
import { suggestionsFor, type SuggestionView } from './suggestions';

type Requester = Parameters<typeof getPageStorage>[0];

export const SPACE_SUGGEST_LIMITS = { defaultPages: 20, maxPages: 50, maxReads: 60, batch: 5, maxSaveItems: 25 } as const;

export interface SpaceSuggestion {
  pageId: string;
  title: string;
  url: string | null;
  suggestions: SuggestionView[];
  /** D20: the app can't read pages with view restrictions, so they are listed but can't be anchored. */
  skipped?: 'restricted';
}

export const normalizeSpaceKey = (k: string) => (k.startsWith('~') ? k : k.toUpperCase());

/** Code anchors with a known repo are the strongest suggestions; a page with them sorts first. */
function strength(s: SuggestionView[]): number {
  return s.filter((x) => (x.anchorType === 'path' || x.anchorType === 'glob') && !x.needsRepo).length * 10 + s.length;
}

/**
 * Suggested anchors for up to `limit` unanchored pages of a space (default 20, at most 50). Pages with
 * no suggestion are left out; restricted pages are listed with `skipped: 'restricted'`.
 * Returns the array on success, or `{ok:false, error, message}`.
 */
export async function suggestSpaceAnchors(rawKey: unknown, rawLimit: unknown, reader: Requester, app: Requester, spaceIdHint?: string): Promise<SpaceSuggestion[] | { ok: false; error: string; message: string }> {
  const key = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (!/^~?[A-Za-z0-9_-]{1,255}$/.test(key)) return { ok: false, error: 'bad_request', message: 'Pass a space key, such as PLAT.' };
  const spaceKey = normalizeSpaceKey(key);
  const n = typeof rawLimit === 'number' || typeof rawLimit === 'string' ? Number(rawLimit) : NaN;
  const limit = Number.isInteger(n) && n >= 1 ? Math.min(SPACE_SUGGEST_LIMITS.maxPages, n) : SPACE_SUGGEST_LIMITS.defaultPages;
  await ensureSchema();
  const space = await getSpaceIdByKey(reader, spaceKey);
  const spaceId = spaceIdHint ?? space.id;
  if (!spaceId) return { ok: false, error: 'not_visible', message: 'Space not found or not visible to you.' };
  const listing = await listSpacePages(reader, spaceId, 2000);
  if (listing.status >= 300) return { ok: false, error: 'not_visible', message: 'Space not found or not visible to you.' };
  const pages = listing.pages.filter((p) => p.id !== space.homepageId);
  const counts = await bindingCountsFor(pages.map((p) => p.id));
  const unanchored = pages.filter((p) => !counts.has(p.id));

  const out: SpaceSuggestion[] = [];
  let reads = 0;
  for (let i = 0; i < unanchored.length && out.filter((x) => !x.skipped).length < limit && reads < SPACE_SUGGEST_LIMITS.maxReads; i += SPACE_SUGGEST_LIMITS.batch) {
    const batch = unanchored.slice(i, i + SPACE_SUGGEST_LIMITS.batch);
    reads += batch.length;
    const rows = await Promise.all(
      batch.map(async (p): Promise<SpaceSuggestion | undefined> => {
        const [body, restricted] = await Promise.all([getPageStorage(reader, p.id), appCannotRead(app, p.id)]);
        if (body.status >= 300 || body.storage === undefined) return undefined;
        const base = { pageId: p.id, title: body.title ?? p.title, url: p.url ?? null };
        if (restricted) return { ...base, suggestions: [], skipped: 'restricted' };
        const suggestions = suggestionsFor(body.storage, []);
        return suggestions.length > 0 ? { ...base, suggestions } : undefined;
      }),
    );
    for (const r of rows) if (r) out.push(r);
  }
  const ranked = out
    .filter((x) => !x.skipped)
    .sort((a, b) => strength(b.suggestions) - strength(a.suggestions) || a.title.localeCompare(b.title))
    .slice(0, limit);
  console.log(`DDS_SPACE_SUGGEST ${JSON.stringify({ spaceKey, pages: pages.length, unanchored: unanchored.length, read: reads, suggested: ranked.length, restricted: out.filter((x) => x.skipped).length })}`);
  return [...ranked, ...out.filter((x) => x.skipped)];
}

export interface SaveSpaceItemResult {
  pageId: string;
  ok: boolean;
  anchors?: number;
  state?: string;
  stateTitle?: string;
  statusLabel?: string;
  error?: string;
  message?: string;
}

/**
 * Saves anchors for several pages. Each page is checked on its own (edit rights asUser, D15; the D20
 * restriction check) and its new anchors are added to the ones it already has (never a replace), then
 * it is marked Verified as in the binding modal. Returns every page's result: some can fail.
 */
export async function saveSpaceAnchors(
  rawItems: unknown,
  ctx: { user: Requester; app: Requester; accountId: string | null; spaceKey: string | null },
): Promise<Record<string, unknown>> {
  const items = Array.isArray(rawItems) ? rawItems : [];
  if (items.length === 0) return { ok: false, error: 'bad_request', message: 'Pick at least 1 page to anchor.' };
  if (items.length > SPACE_SUGGEST_LIMITS.maxSaveItems) {
    return { ok: false, error: 'bad_request', message: `Save at most ${SPACE_SUGGEST_LIMITS.maxSaveItems} pages at a time.` };
  }
  await ensureSchema();
  const results: SaveSpaceItemResult[] = [];
  for (const raw of items) {
    const item = (raw ?? {}) as { pageId?: unknown; anchors?: unknown };
    const pageId = typeof item.pageId === 'string' || typeof item.pageId === 'number' ? String(item.pageId) : '';
    const anchors = Array.isArray(item.anchors) ? (item.anchors as AnchorInput[]) : [];
    if (!/^\d{1,20}$/.test(pageId) || anchors.length === 0) {
      results.push({ pageId, ok: false, error: 'bad_request', message: 'Each page needs a pageId and at least 1 anchor.' });
      continue;
    }
    const ops = await pageOperations(ctx.user, pageId);
    if (ops.status >= 300 || !ops.ops.has('read')) {
      results.push({ pageId, ok: false, error: 'not_visible', message: MESSAGES.notVisible });
      continue;
    }
    if (!ops.ops.has('update')) {
      results.push({ pageId, ok: false, error: 'forbidden', message: MESSAGES.needsEdit });
      continue;
    }
    if (await appCannotRead(ctx.app, pageId)) {
      results.push({ pageId, ok: false, error: 'restricted', message: MESSAGES.restricted });
      continue;
    }
    const existing = await bindingsForPage(pageId);
    const have = new Set(existing.map((b) => anchorKey(b)));
    const merged: AnchorInput[] = [
      ...existing.map((b) => ({ anchorType: b.anchorType, repo: b.repo, pattern: b.pattern, jiraKey: b.jiraKey, weight: b.weight })),
      ...anchors.filter((a) => !have.has(anchorKey({ anchorType: a.anchorType ?? 'path', repo: a.repo?.toLowerCase(), pattern: a.pattern, jiraKey: a.jiraKey }))),
    ];
    const saved = await saveBindings({ pageId, spaceKey: ctx.spaceKey, anchors: merged, actorAccountId: ctx.accountId, method: 'binding' });
    if (!saved.ok) {
      results.push({ pageId, ok: false, error: 'bad_request', message: saved.errors.map((e) => e.error).join(' ') });
      continue;
    }
    const st = saved.state.status;
    results.push({ pageId, ok: true, anchors: existing.length + saved.added - saved.removed, state: st, statusLabel: PAGE_STATE_LABELS[st], stateTitle: stateTitle(st) });
  }
  const savedCount = results.filter((r) => r.ok).length;
  const failed = results.length - savedCount;
  console.log(`DDS_SPACE_ANCHORS_SAVED ${JSON.stringify({ pages: results.length, saved: savedCount, failed })}`);
  return {
    ok: true,
    saved: savedCount,
    failed,
    results,
    message:
      failed === 0
        ? `Anchored ${savedCount} ${savedCount === 1 ? 'page' : 'pages'}. ${savedCount === 1 ? 'It is' : 'They are'} Verified.`
        : `Anchored ${savedCount} of ${results.length} pages. ${failed} could not be saved; see each page's message.`,
  };
}
