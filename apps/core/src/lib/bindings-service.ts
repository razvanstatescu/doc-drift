// Saving a page's anchors (F1). The resolver checks the clicking user's rights asUser first (D15);
// this module then writes asApp: bindings, a verification row, page_state and the byline property.
import { randomUUID } from 'node:crypto';
import { anchorKey, anchorLabel, normalizeAnchor, planBindingChanges, type AnchorInput, type NormalizedAnchor } from './anchors';
import {
  bindingsForPage,
  deleteBinding,
  ensureSchema,
  insertBinding,
  recordVerification,
  resetDismissCount,
  setBindingExclude,
  resolveOpenEvents,
  setBindingWeight,
} from './db';
import { refreshPage, type RefreshResult } from './page-state';

export interface SaveBindingsInput {
  pageId: string;
  spaceKey: string | null;
  anchors: AnchorInput[];
  actorAccountId: string | null;
  method: 'binding' | 'dev';
}

export type SaveBindingsResult =
  | { ok: true; added: number; removed: number; reweighted: number; closedEvents: number; state: RefreshResult }
  | { ok: false; errors: { index: number; error: string }[] };

/** Validates every anchor; returns per-anchor errors so the modal can point at the bad row. */
export function validateAnchors(anchors: AnchorInput[]): { ok: true; value: NormalizedAnchor[]; resetKeys: Set<string>; clearKeys: Set<string> } | { ok: false; errors: { index: number; error: string }[] } {
  const value: NormalizedAnchor[] = [];
  const errors: { index: number; error: string }[] = [];
  const resetKeys = new Set<string>();
  const clearKeys = new Set<string>();
  anchors.forEach((a, index) => {
    const r = normalizeAnchor(a);
    if (r.ok) {
      value.push(r.value);
      if (a?.resetDismissCount === true) resetKeys.add(anchorKey(r.value));
      if (a?.clearExclude === true) clearKeys.add(anchorKey(r.value));
    } else errors.push({ index, error: r.error });
  });
  if (anchors.length > 50) errors.push({ index: 50, error: 'A page can have at most 50 anchors.' });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value, resetKeys, clearKeys };
}

/**
 * Replaces the page's anchors with `anchors`, then marks the page Verified: open events close as
 * `resolved`, a verification row records who and which events, and the byline is rewritten.
 */
export async function saveBindings(input: SaveBindingsInput): Promise<SaveBindingsResult> {
  await ensureSchema();
  const valid = validateAnchors(input.anchors);
  if (!valid.ok) return valid;
  const existing = await bindingsForPage(input.pageId);
  const plan = planBindingChanges(existing, valid.value, valid.resetKeys, valid.clearKeys);
  for (const b of plan.remove) await deleteBinding(b.id);
  for (const id of plan.resetDampener) await resetDismissCount(id);
  for (const id of plan.clearExclude) await setBindingExclude(id, []);
  for (const r of plan.reweight) await setBindingWeight(r.id, r.weight);
  for (const a of plan.insert) await insertBinding(randomUUID(), input.pageId, input.spaceKey, a, input.actorAccountId);

  const closed = await resolveOpenEvents(input.pageId, input.actorAccountId);
  await recordVerification({
    id: randomUUID(),
    pageId: input.pageId,
    spaceKey: input.spaceKey,
    userId: input.actorAccountId,
    closedEventIds: [...closed],
    note: `Anchors saved: ${valid.value.length}`,
    method: input.method,
    driftSince: closed.oldest ?? null,
  });
  const state = await refreshPage(input.pageId, { spaceKeyHint: input.spaceKey });
  console.log(
    `DDS_BINDINGS_SAVED ${JSON.stringify({ pageId: input.pageId, added: plan.insert.length, removed: plan.remove.length, reweighted: plan.reweight.length, dampenerReset: plan.resetDampener.length, closed: closed.length, status: state.status })}`,
  );
  return { ok: true, added: plan.insert.length, removed: plan.remove.length, reweighted: plan.reweight.length, closedEvents: closed.length, state };
}

export { suggestionsFor, type SuggestionView } from './suggestions';
export { anchorLabel };
