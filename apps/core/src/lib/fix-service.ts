// Propose fix (F11, D6): Drift Reviewer submits a draft (submit-fix-proposal), a person accepts or
// rejects it in the review panel. Submitting never writes the page. Accepting writes the page asUser
// (the `user` requester), with the version message naming the change, then closes the proposal's events,
// records a verification (method accepted_proposal) and rewrites the byline asApp (D15).
// D29: a draft targets one page block (`blockId` from get-drift-context, see blocks.ts). A passage that
// runs across blocks is refused with `spans_blocks`; text in no block is `not_found` with candidates.
import { randomUUID } from 'node:crypto';
import { PAGE_STATE_LABELS } from '@dds/shared';
import { FIX_LIMITS, validateFixInput, versionMessage } from './agent-tools';
import { plural, refLabel, stateTitle } from './copy';
import { renameQuickFixes, renameVersionMessage, type RenameQuickFix } from './quick-fix';
import { applyBlockEdit, blockSummary, editBlock, extractBlocks, isNoOp, resolveTarget, targetOriginal, type PageBlock, type TargetResult } from './blocks';
import { displayNames, getPageForEdit, getPageStorage, updatePageBody } from './confluence';
import {
  decideFixProposal,
  decideRenameProposal,
  ensureSchema,
  getBinding,
  getEventFull,
  openRenameProposals,
  updateBindingPattern,
  eventDetailsForPage,
  fixProposalsForPage,
  getFixProposal,
  getPageState,
  insertFixProposal,
  recordVerification,
  resolveEvents,
  type EventDetailRow,
} from './db';
import { fromSqlDate } from './ingest-rules';
import { refreshPage } from './page-state';
import { eventFiles, splitSections, tokenRegExp, tokensForEvents } from './review';
import type { Failure, Gate } from './review-service';
import { applySectionEdit, EDIT_MESSAGES, normalizeWhitespace, stripFence, TOP_OF_PAGE, type EditError } from './storage-edit';

type Requester = Parameters<typeof getPageStorage>[0];

export interface FixDeps {
  /** Reads and page writes: api.asUser() (the dev driver passes api.asApp()). */
  user: Requester;
  gate: Gate;
  accountId: string | null;
}

export const FIX_MESSAGES = {
  needsEdit: 'You need edit rights on this page to accept or reject a draft.',
  needsEditToDraft: 'Drafting a fix needs edit rights on this page. Tell the user that someone with edit rights can draft and accept fixes.',
  needsEditToFix: 'You need edit rights on this page to apply a fix.',
  handled: 'This draft was already handled. Reload to see the latest.',
  nothingOpen: 'This page has no open changes, so there is nothing to draft.',
  tooMany: `This page already has ${FIX_LIMITS.openPerPage} open drafts. Accept or reject some in the review panel first.`,
  saved: 'Draft saved for review. The page is unchanged. A person with edit rights accepts or rejects it in the Doc Drift review panel.',
} as const;

function fail(error: string, message: string): Failure {
  return { ok: false, error, message };
}

const headingKey = (h: string) => normalizeWhitespace(h).toLowerCase();

/** BUG-05: a draft that would rewrite a link, @mention, emoticon, image or macro is refused. */
export const UNSUPPORTED_SPAN_GUIDANCE =
  'This draft changes or removes a link, @mention, emoticon, image or macro in the block. Keep link text and @mention exactly as the block shows them and change only the words around them.';

const RETRY_ONCE = 'Retry at most once, then tell the user in one sentence why no draft was saved.';

/** The open events whose tokens appear in the section; all open events when none do. */
export function eventsForSection(storage: string, heading: string, events: EventDetailRow[]): EventDetailRow[] {
  const section = splitSections(storage).find((s) => headingKey(s.heading) === headingKey(heading));
  if (!section) return events;
  const hit = eventsMentionedIn(section.text, events);
  return hit.length > 0 ? hit : events;
}

function eventTokens(e: EventDetailRow): string[] {
  return tokensForEvents([
    { files: e.source === 'bitbucket' ? eventFiles(e.files, e.changeFiles) : [], matchedTokens: e.matchedTokens, issueKey: e.source === 'jira' ? e.ref : null },
  ]);
}

function eventsMentionedIn(text: string, events: EventDetailRow[]): EventDetailRow[] {
  return events.filter((e) => eventTokens(e).some((t) => tokenRegExp(t).test(text)));
}

/** A proposal's events: those named in its block, else in its section, else every open event. */
export function eventsForBlock(storage: string, block: PageBlock, events: EventDetailRow[]): EventDetailRow[] {
  const hit = eventsMentionedIn(block.text, events);
  return hit.length > 0 ? hit : eventsForSection(storage, block.section, events);
}

const MAX_CANDIDATES = 12;

/** Candidate blocks for the agent's one retry: blocks with a matched token first, at most 12. */
export function candidateList(blocks: PageBlock[], tokens: string[]): Record<string, unknown>[] {
  const res = tokens.map(tokenRegExp);
  const rows = blocks.map((b) => ({ ...blockSummary(b), ...(res.some((re) => re.test(b.text)) && { matched: true }) }));
  return [...rows.filter((r) => r.matched), ...rows.filter((r) => !r.matched)].slice(0, MAX_CANDIDATES);
}

/** The structured refusal for a draft that does not resolve to one block. Nothing is saved. */
export function targetFailure(pageId: string, r: Extract<TargetResult, { ok: false }>, blocks: PageBlock[], tokens: string[], blockId: string | null): Record<string, unknown> {
  if (r.error === 'spans_blocks') {
    const ids = r.blockIds ?? [];
    return {
      ok: false,
      pageId,
      error: 'spans_blocks',
      blockIds: ids,
      blocks: blocks.filter((b) => ids.includes(b.blockId)).map(blockSummary),
      guidance: `originalText runs across ${ids.length} blocks (${ids.join(', ')}). Submit one proposal per block. Use blockId from get-drift-context, with that block's full new text as proposedText. Nothing was saved. ${RETRY_ONCE}`,
    };
  }
  const why =
    r.error === 'ambiguous'
      ? 'originalText appears in more than one place. Pass the blockId of the one to change.'
      : blockId && !blocks.some((b) => b.blockId === blockId)
        ? `No block on the page has blockId ${blockId}.`
        : blockId
          ? `originalText is not in block ${blockId}. Omit originalText to replace the whole block, or copy one line of it verbatim.`
          : 'originalText is not inside any one block of the page.';
  return {
    ok: false,
    pageId,
    error: r.error === 'ambiguous' ? 'ambiguous' : 'not_found',
    candidates: candidateList(r.candidates ?? blocks, tokens),
    guidance: `${why} Pick the block from candidates and call submit-fix-proposal with its blockId and the block's full new text as proposedText. Nothing was saved. ${RETRY_ONCE}`,
  };
}

// ---------------------------------------------------------------------------
// submit-fix-proposal (agent action, CREATE). Never writes the page.
// ---------------------------------------------------------------------------
export async function submitFixProposal(pageId: string, input: Record<string, unknown>, deps: FixDeps): Promise<Record<string, unknown>> {
  const valid = validateFixInput(input);
  if (!valid.ok) return { ok: false, pageId, error: valid.error, guidance: valid.message };
  // BUG-12 (D30): drafting needs edit rights, so a viewer can't fill the draft cap or replace an
  // editor's open draft for the same block.
  const denied = await deps.gate(pageId, 'update', FIX_MESSAGES.needsEditToDraft);
  if (denied) return { ok: false, pageId, title: null, status: denied.state ?? 'unknown', error: denied.error, guidance: denied.message };
  await ensureSchema();
  const page = await getPageStorage(deps.user, pageId);
  if (page.status >= 300 || page.storage === undefined) return { ok: false, pageId, title: null, status: 'unknown', error: 'not_visible', guidance: 'Page not found or not visible to you.' };
  const v = valid.value;
  const events = await eventDetailsForPage(pageId);
  if (events.length === 0) return { ok: false, pageId, error: 'nothing_open', guidance: FIX_MESSAGES.nothingOpen };
  const tokens = [...new Set(events.flatMap(eventTokens))];

  const blocks = extractBlocks(page.storage);
  const resolved = resolveTarget(blocks, { blockId: v.blockId, sectionHeading: input.sectionHeading ? v.sectionHeading : null, originalText: v.originalText });
  if (!resolved.ok) {
    console.log(`DDS_FIX_REFUSED ${JSON.stringify({ pageId, error: resolved.error, byBlock: Boolean(v.blockId), blockIds: resolved.blockIds ?? [] })}`);
    return targetFailure(pageId, resolved, blocks, tokens, v.blockId);
  }
  const target = resolved.target;
  if (isNoOp(target, v.proposedText)) {
    return { ok: false, pageId, error: 'bad_request', guidance: `proposedText is the same as the current text of block ${target.block.blockId}. Nothing was saved.` };
  }
  const dry = editBlock(page.storage, target, v.proposedText);
  if (!dry.ok) {
    console.log(`DDS_FIX_REFUSED ${JSON.stringify({ pageId, error: dry.error, blockId: target.block.blockId })}`);
    return { ok: false, pageId, error: dry.error, blockId: target.block.blockId, guidance: `${UNSUPPORTED_SPAN_GUIDANCE} Nothing was saved. ${RETRY_ONCE}` };
  }

  // A new draft for the same block replaces the open one.
  const open = await fixProposalsForPage(pageId, true, 50);
  const replaced = open.filter((p) => p.blockId === target.block.blockId);
  for (const p of replaced) await decideFixProposal(p.id, 'rejected', deps.accountId);
  if (open.length - replaced.length >= FIX_LIMITS.openPerPage) return { ok: false, pageId, error: 'too_many', guidance: FIX_MESSAGES.tooMany };

  const chosen = eventsForBlock(page.storage, target.block, events);
  const refs = [...new Set(chosen.map((e) => refLabel(e.ref, e.source)))];
  const id = randomUUID();
  await insertFixProposal({
    id,
    pageId,
    eventIds: chosen.map((e) => e.id),
    refs,
    // Stored as the page spells it, so the review panel shows the real heading.
    sectionHeading: target.block.section || TOP_OF_PAGE,
    blockId: target.block.blockId,
    blockKind: target.block.kind,
    originalText: targetOriginal(target),
    proposedText: stripFence(v.proposedText),
    rationale: v.rationale,
    createdBy: deps.accountId,
  });
  console.log(`DDS_FIX_PROPOSED ${JSON.stringify({ proposalId: id, pageId, refs, events: chosen.length, kind: dry.kind, blockId: target.block.blockId, span: Boolean(target.span), replaced: replaced.length })}`);
  return {
    ok: true,
    pageId,
    title: page.title ?? null,
    proposalId: id,
    status: 'open',
    refs,
    sectionHeading: target.block.section,
    blockId: target.block.blockId,
    blockKind: target.block.kind,
    ...(replaced.length > 0 && { replaced: replaced.map((p) => p.id) }),
    guidance: FIX_MESSAGES.saved,
  };
}

// ---------------------------------------------------------------------------
// Review panel: getProposals, applyProposal, rejectProposal
// ---------------------------------------------------------------------------
export async function listProposals(pageId: string, deps: FixDeps): Promise<unknown> {
  const denied = await deps.gate(pageId, 'read');
  if (denied) return denied;
  await ensureSchema();
  const rows = await fixProposalsForPage(pageId, false, 20);
  const names = await displayNames(deps.user, rows.map((r) => r.createdBy));
  return rows.map((r) => ({
    id: r.id,
    eventIds: r.eventIds,
    refs: r.refs,
    sectionHeading: r.sectionHeading,
    blockId: r.blockId,
    blockKind: r.blockKind,
    originalText: r.originalText,
    proposedText: r.proposedText,
    rationale: r.rationale ?? '',
    createdBy: r.createdBy ? { accountId: r.createdBy, displayName: names.get(r.createdBy) ?? null } : null,
    createdAt: fromSqlDate(r.createdAt) ?? null,
    status: r.status === 'accepted' ? 'applied' : r.status,
    ...(r.appliedVersion !== null && { appliedVersion: r.appliedVersion }),
  }));
}

function editFailure(error: EditError): Failure {
  // The panel shows "This section changed since the draft." for `not_found`.
  const code = error === 'section_not_found' || error === 'not_found' || error === 'empty' ? 'not_found' : error;
  return fail(code, EDIT_MESSAGES[error]);
}

export async function applyProposal(proposalId: unknown, deps: FixDeps): Promise<Record<string, unknown>> {
  if (typeof proposalId !== 'string' || proposalId === '') return fail('bad_request', FIX_MESSAGES.handled);
  await ensureSchema();
  const p = await getFixProposal(proposalId);
  if (!p || p.status !== 'open') return fail('not_open', FIX_MESSAGES.handled);
  const denied = await deps.gate(p.pageId, 'update');
  if (denied) return denied.error === 'forbidden' ? fail('forbidden', FIX_MESSAGES.needsEdit) : denied;

  const message = versionMessage(p.refs);
  let put: { status: number; version?: number; error?: unknown } = { status: 0 };
  for (let attempt = 0; attempt < 2; attempt++) {
    const page = await getPageForEdit(deps.user, p.pageId);
    if (page.status >= 300 || page.storage === undefined || !page.id || !page.title || page.version === undefined) {
      return fail('not_visible', 'Page not found or not visible to you.');
    }
    // D29: by block (ID, then the one block that still holds the original); legacy drafts by section and text.
    const edit = p.blockId
      ? applyBlockEdit(page.storage, { blockId: p.blockId, sectionHeading: p.sectionHeading, originalText: p.originalText, proposedText: p.proposedText })
      : applySectionEdit(page.storage, p.sectionHeading, p.originalText, p.proposedText);
    if (!edit.ok) {
      console.log(`DDS_FIX_APPLY_REFUSED ${JSON.stringify({ proposalId, pageId: p.pageId, error: edit.error })}`);
      return editFailure(edit.error);
    }
    put = await updatePageBody(deps.user, { id: page.id, title: page.title, version: page.version }, edit.storage, message);
    if (put.status !== 409) break; // 409: someone saved a newer version first; re-read and re-apply once.
  }
  if (put.status >= 300 || put.version === undefined) {
    console.warn(`DDS_FIX_APPLY_FAILED ${JSON.stringify({ proposalId, pageId: p.pageId, status: put.status, error: JSON.stringify(put.error ?? null).slice(0, 300) })}`);
    return fail('update_failed', `Confluence did not accept the change (status ${put.status}). The page is unchanged.`);
  }
  if (!(await decideFixProposal(proposalId, 'accepted', deps.accountId, put.version))) {
    // Someone decided it between our read and now; the page write stands (it is in page history).
    console.warn(`DDS_FIX_RACE proposalId=${proposalId}`);
  }
  // Several drafts can answer the same events (one per block of a section). The events close, and the
  // verification is recorded, when the last of those drafts is accepted; until then the page stays flagged.
  const siblings = (await fixProposalsForPage(p.pageId, true, 50)).filter((o) => o.id !== p.id && o.eventIds.some((id) => p.eventIds.includes(id)));
  const held = new Set(siblings.flatMap((o) => o.eventIds));
  const closable = p.eventIds.filter((id) => !held.has(id));
  const closed = closable.length > 0 ? await resolveEvents(p.pageId, closable, deps.accountId) : Object.assign([] as string[], { oldest: undefined });
  if (closed.length > 0) {
    const current = await getPageState(p.pageId);
    await recordVerification({
      id: randomUUID(),
      pageId: p.pageId,
      spaceKey: current?.spaceKey ?? null,
      userId: deps.accountId,
      closedEventIds: [...closed],
      note: `${message} (version ${put.version})`,
      method: 'accepted_proposal',
      driftSince: closed.oldest ?? null,
    });
  }
  const state = await refreshPage(p.pageId);
  console.log(`DDS_FIX_APPLIED ${JSON.stringify({ proposalId, pageId: p.pageId, blockId: p.blockId, version: put.version, message, closed: closed.length, pendingDrafts: siblings.length, status: state.status })}`);
  const names = p.refs.length > 0 ? p.refs.join(' and ') : 'Doc Drift';
  const pending = siblings.length > 0 ? ` ${plural(siblings.length, 'more draft')} for the same change ${siblings.length === 1 ? 'is' : 'are'} open.` : '';
  return {
    ok: true,
    pageId: p.pageId,
    version: put.version,
    versionMessage: message,
    closedEvents: closed.length,
    pendingDrafts: siblings.length,
    state: state.status,
    status: state.status,
    statusLabel: PAGE_STATE_LABELS[state.status],
    stateTitle: stateTitle(state.status),
    message: `Accepted. Version ${put.version} names ${names}.${pending}`,
  };
}

export async function rejectProposal(proposalId: unknown, deps: FixDeps): Promise<Record<string, unknown>> {
  if (typeof proposalId !== 'string' || proposalId === '') return fail('bad_request', FIX_MESSAGES.handled);
  await ensureSchema();
  const p = await getFixProposal(proposalId);
  if (!p || p.status !== 'open') return fail('not_open', FIX_MESSAGES.handled);
  const denied = await deps.gate(p.pageId, 'update');
  if (denied) return denied.error === 'forbidden' ? fail('forbidden', FIX_MESSAGES.needsEdit) : denied;
  if (!(await decideFixProposal(proposalId, 'rejected', deps.accountId))) return fail('not_open', FIX_MESSAGES.handled);
  console.log(`DDS_FIX_REJECTED ${JSON.stringify({ proposalId, pageId: p.pageId })}`);
  return { ok: true, pageId: p.pageId, message: 'Rejected the draft. The page is unchanged.' };
}

// ---------------------------------------------------------------------------
// Rename quick fix (R-4): deterministic, no AI. Applied with the same block edit as an accepted draft.
// ---------------------------------------------------------------------------
export async function applyRenameQuickFix(eventId: unknown, deps: FixDeps): Promise<Record<string, unknown>> {
  if (typeof eventId !== 'string' || eventId === '') return fail('bad_request', FIX_MESSAGES.handled);
  await ensureSchema();
  const event = await getEventFull(eventId);
  if (!event || event.status !== 'open') return fail('not_open', 'This change is no longer open. Reload to see the latest.');
  const denied = await deps.gate(event.pageId, 'update');
  if (denied) return denied.error === 'forbidden' ? fail('forbidden', FIX_MESSAGES.needsEditToFix) : denied;
  const ref = refLabel(event.ref, event.source);
  const files = event.source === 'bitbucket' ? eventFiles(event.files, event.changeFiles) : [];

  let put: { status: number; version?: number; error?: unknown } = { status: 0 };
  let applied: { blockId: string; kind: string; section: string; text: string; proposedText: string; occurrences: number }[] = [];
  let fix: RenameQuickFix | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const page = await getPageForEdit(deps.user, event.pageId);
    if (page.status >= 300 || page.storage === undefined || !page.id || !page.title || page.version === undefined) {
      return fail('not_visible', 'Page not found or not visible to you.');
    }
    fix = renameQuickFixes(page.storage, [{ eventId, ref, files }])[0];
    if (!fix) return fail('not_found', 'No block on this page still names the old path. Reload to see the latest.');
    let storage = page.storage;
    applied = [];
    for (const b of fix.blocks) {
      const r = applyBlockEdit(storage, { blockId: b.blockId, sectionHeading: b.section, originalText: b.text, proposedText: b.proposedText });
      if (!r.ok) continue;
      storage = r.storage;
      applied.push(b);
    }
    if (applied.length === 0) return fail('unsupported_span', EDIT_MESSAGES.unsupported_span);
    put = await updatePageBody(deps.user, { id: page.id, title: page.title, version: page.version }, storage, renameVersionMessage(fix.from, fix.to, ref));
    if (put.status !== 409) break;
  }
  if (!fix || put.status >= 300 || put.version === undefined) {
    console.warn(`DDS_RENAME_FIX_FAILED ${JSON.stringify({ eventId, pageId: event.pageId, status: put.status, error: JSON.stringify(put.error ?? null).slice(0, 300) })}`);
    return fail('update_failed', `Confluence did not accept the change (status ${put.status}). The page is unchanged.`);
  }
  const message = renameVersionMessage(fix.from, fix.to, ref);
  // History: one applied draft per block, so the review panel lists what changed and who applied it.
  for (const b of applied) {
    const id = randomUUID();
    await insertFixProposal({
      id,
      pageId: event.pageId,
      eventIds: [eventId],
      refs: [ref],
      sectionHeading: b.section || TOP_OF_PAGE,
      blockId: b.blockId,
      blockKind: b.kind,
      originalText: b.text,
      proposedText: b.proposedText,
      rationale: `Suggested from ${ref}, no AI used: ${fix.from} renamed to ${fix.to}.`,
      createdBy: deps.accountId,
    });
    await decideFixProposal(id, 'accepted', deps.accountId, put.version);
  }
  // The anchor follows the rename when the matcher proposed it and the binding still points at the old path.
  let anchorUpdated = false;
  for (const rp of await openRenameProposals(event.pageId)) {
    if (rp.from !== fix.from || rp.to !== fix.to) continue;
    const binding = await getBinding(rp.bindingId);
    if (binding && binding.pattern === rp.from) {
      await updateBindingPattern(binding.id, rp.to);
      anchorUpdated = true;
    }
    await decideRenameProposal(rp.id, binding && binding.pattern === rp.to ? 'accepted' : 'rejected', deps.accountId);
  }
  const closed = await resolveEvents(event.pageId, [eventId], deps.accountId);
  if (closed.length > 0) {
    const current = await getPageState(event.pageId);
    await recordVerification({
      id: randomUUID(),
      pageId: event.pageId,
      spaceKey: current?.spaceKey ?? null,
      userId: deps.accountId,
      closedEventIds: [...closed],
      note: `${message} (version ${put.version})`,
      method: 'rename_fix',
      driftSince: closed.oldest ?? null,
    });
  }
  const state = await refreshPage(event.pageId);
  const replaced = applied.reduce((n, b) => n + b.occurrences, 0);
  console.log(`DDS_RENAME_FIX_APPLIED ${JSON.stringify({ eventId, pageId: event.pageId, version: put.version, blocks: applied.length, replaced, anchorUpdated, status: state.status })}`);
  return {
    ok: true,
    pageId: event.pageId,
    version: put.version,
    versionMessage: message,
    from: fix.from,
    to: fix.to,
    blocks: applied.map((b) => b.blockId),
    replaced,
    anchorUpdated,
    closedEvents: closed.length,
    state: state.status,
    status: state.status,
    statusLabel: PAGE_STATE_LABELS[state.status],
    stateTitle: stateTitle(state.status),
    message: `Replaced ${plural(replaced, 'mention')} of ${fix.from} in ${plural(applied.length, 'block')}. Version ${put.version} names ${ref}.${anchorUpdated ? ` The anchor now watches ${fix.to}.` : ''}`,
  };
}
