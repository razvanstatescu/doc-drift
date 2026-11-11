// Propose fix (F11, D6): Drift Reviewer submits a draft (submit-fix-proposal), a person accepts or
// rejects it in the review panel. Submitting never writes the page. Accepting writes the page asUser
// (the `user` requester), with the version message naming the change, then closes the proposal's events,
// records a verification (method accepted_proposal) and rewrites the byline asApp (D15).
import { randomUUID } from 'node:crypto';
import { PAGE_STATE_LABELS } from '@dds/shared';
import { FIX_LIMITS, validateFixInput, versionMessage } from './agent-tools';
import { refLabel } from './copy';
import { displayNames, getPageForEdit, getPageStorage, updatePageBody } from './confluence';
import {
  countOpenFixProposals,
  decideFixProposal,
  ensureSchema,
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
import { applySectionEdit, EDIT_MESSAGES, normalizeWhitespace, TOP_OF_PAGE, type EditError } from './storage-edit';

type Requester = Parameters<typeof getPageStorage>[0];

export interface FixDeps {
  /** Reads and page writes: api.asUser() (the dev driver passes api.asApp()). */
  user: Requester;
  gate: Gate;
  accountId: string | null;
}

export const FIX_MESSAGES = {
  needsEdit: 'You need edit rights on this page to accept or reject a draft.',
  handled: 'This draft was already handled. Reload to see the latest.',
  nothingOpen: 'This page has no open changes, so there is nothing to draft.',
  tooMany: `This page already has ${FIX_LIMITS.openPerPage} open drafts. Accept or reject some in the review panel first.`,
  saved: 'Draft saved for review. The page is unchanged. A person with edit rights accepts or rejects it in the Doc Drift review panel.',
} as const;

function fail(error: string, message: string): Failure {
  return { ok: false, error, message };
}

const headingKey = (h: string) => normalizeWhitespace(h).toLowerCase();

/** Why a draft was refused at submit time, addressed to the agent. */
const SUBMIT_ERRORS: Record<EditError, string> = {
  not_found: 'originalText is not in that section of the current page.',
  ambiguous: 'originalText appears more than once in that section. Use a longer passage.',
  section_not_found: 'No section of the page has that heading.',
  unsupported_span: 'originalText spans a code block and prose. Propose one change per block.',
  empty: 'originalText is empty.',
};

/** The open events whose tokens appear in the section; all open events when none do. */
export function eventsForSection(storage: string, heading: string, events: EventDetailRow[]): EventDetailRow[] {
  const section = splitSections(storage).find((s) => headingKey(s.heading) === headingKey(heading));
  if (!section) return events;
  const hit = events.filter((e) => {
    const tokens = tokensForEvents([
      { files: e.source === 'bitbucket' ? eventFiles(e.files, e.changeFiles) : [], matchedTokens: e.matchedTokens, issueKey: e.source === 'jira' ? e.ref : null },
    ]);
    return tokens.some((t) => tokenRegExp(t).test(section.text));
  });
  return hit.length > 0 ? hit : events;
}

// ---------------------------------------------------------------------------
// submit-fix-proposal (agent action, CREATE). Never writes the page.
// ---------------------------------------------------------------------------
export async function submitFixProposal(pageId: string, input: Record<string, unknown>, deps: FixDeps): Promise<Record<string, unknown>> {
  const valid = validateFixInput(input);
  if (!valid.ok) return { ok: false, pageId, error: valid.error, guidance: valid.message };
  const denied = await deps.gate(pageId, 'read');
  if (denied) return { ok: false, pageId, title: null, status: denied.state ?? 'unknown', error: denied.error, guidance: denied.message };
  await ensureSchema();
  const page = await getPageStorage(deps.user, pageId);
  if (page.status >= 300 || page.storage === undefined) return { ok: false, pageId, title: null, status: 'unknown', error: 'not_visible', guidance: 'Page not found or not visible to you.' };
  const v = valid.value;
  const dry = applySectionEdit(page.storage, v.sectionHeading, v.originalText, v.proposedText);
  if (!dry.ok) {
    return {
      ok: false,
      pageId,
      error: dry.error,
      guidance: `${SUBMIT_ERRORS[dry.error]} Call get-drift-context again, copy originalText exactly from one section's text, and pass that section's heading as sectionHeading. Nothing was saved.`,
      headings: splitSections(page.storage).map((s) => s.heading).slice(0, 30),
    };
  }
  const events = await eventDetailsForPage(pageId);
  if (events.length === 0) return { ok: false, pageId, error: 'nothing_open', guidance: FIX_MESSAGES.nothingOpen };
  if ((await countOpenFixProposals(pageId)) >= FIX_LIMITS.openPerPage) return { ok: false, pageId, error: 'too_many', guidance: FIX_MESSAGES.tooMany };
  const chosen = eventsForSection(page.storage, v.sectionHeading, events);
  const refs = [...new Set(chosen.map((e) => refLabel(e.ref, e.source)))];
  const id = randomUUID();
  // Store the heading as the page spells it, so the review panel shows the real heading.
  const heading = splitSections(page.storage).find((s) => headingKey(s.heading) === headingKey(v.sectionHeading))?.heading ?? (v.sectionHeading || TOP_OF_PAGE);
  await insertFixProposal({
    id,
    pageId,
    eventIds: chosen.map((e) => e.id),
    refs,
    sectionHeading: heading,
    originalText: v.originalText,
    proposedText: v.proposedText,
    rationale: v.rationale,
    createdBy: deps.accountId,
  });
  console.log(`DDS_FIX_PROPOSED ${JSON.stringify({ proposalId: id, pageId, refs, events: chosen.length, kind: dry.kind })}`);
  return { ok: true, pageId, title: page.title ?? null, proposalId: id, status: 'open', refs, sectionHeading: heading, guidance: FIX_MESSAGES.saved };
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
    const edit = applySectionEdit(page.storage, p.sectionHeading, p.originalText, p.proposedText);
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
  const closed = await resolveEvents(p.pageId, p.eventIds, deps.accountId);
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
  const state = await refreshPage(p.pageId);
  console.log(`DDS_FIX_APPLIED ${JSON.stringify({ proposalId, pageId: p.pageId, version: put.version, message, closed: closed.length, status: state.status })}`);
  return {
    ok: true,
    pageId: p.pageId,
    version: put.version,
    versionMessage: message,
    closedEvents: closed.length,
    state: state.status,
    status: state.status,
    statusLabel: PAGE_STATE_LABELS[state.status],
    message: `Accepted. Version ${put.version} names ${p.refs.length > 0 ? p.refs.join(' and ') : 'Doc Drift'}.`,
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
