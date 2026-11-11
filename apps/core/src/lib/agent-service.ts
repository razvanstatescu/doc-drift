// Rovo actions and MCP tools (docs/architecture/agent-tools.md). Every read goes through `user`, which is
// api.asUser() in the action entry points (D21: no asApp fallback); the dev driver passes api.asApp() to
// exercise the same code headlessly. A page the caller can't see returns `status: "unknown"` and no
// title. Every result carries `guidance` (D14).
import { PAGE_STATE_LABELS, type StoredPageState } from '@dds/shared';
import { GlobCache } from '@dds/matcher';
import { appCannotRead } from './access';
import {
  CHECK_BEFORE_CITING,
  diffForPaths,
  fitContext,
  freshnessGuidance,
  isoTime,
  MATCH_RANK,
  matchBinding,
  NO_PAGE_GUIDANCE,
  parseLimit,
  parsePageRef,
  parseRepo,
  parseSpaceKey,
  SECTION_TEXT_MAX,
  clip,
  UNTRUSTED_RULE,
  unknownPage,
  type PathMatch,
} from './agent-tools';
import { anchorLabel } from './anchors';
import { plural, refLabel } from './copy';
import { displayNames, findPagesByTitle, getPageInfo, getPageStorage } from './confluence';
import {
  bindingsForPage,
  bindingsForRepoName,
  changesByIds,
  driftedPages,
  ensureSchema,
  eventDetailsForPage,
  getPageState,
  openEventsForPage,
  pageStatesFor,
} from './db';
import { fromSqlDate } from './ingest-rules';
import { eventFiles, MAX_SECTIONS, severityName, splitSectionsDetailed, tokenRegExp, tokensForEvents } from './review';
import { markVerified, type Gate } from './review-service';

type Requester = Parameters<typeof getPageInfo>[0];

export interface ToolDeps {
  /** asUser in production. */
  user: Requester;
  /** asApp, only for the D20 restriction check and app-owned writes after the gate. */
  app: Requester;
  gate: Gate;
  accountId: string | null;
  /** `payload.context.confluence.contentId` when Rovo runs on a page. */
  contextPageId?: string | null;
}

type Result = Record<string, unknown>;

/** Resolves the page from the inputs: ID, URL, exact title (asUser search), or the Rovo page context. */
export async function resolvePage(input: Record<string, unknown>, deps: ToolDeps): Promise<{ pageId: string } | { result: Result }> {
  const ref = parsePageRef(input, deps.contextPageId);
  if ('pageId' in ref) return { pageId: ref.pageId };
  if (ref.via === 'none') return { result: { ok: false, pageId: null, title: null, status: 'unknown', error: 'no_page', guidance: NO_PAGE_GUIDANCE } };
  const found = await findPagesByTitle(deps.user, ref.title, 5);
  if (found.pages.length === 0) return { result: unknownPage(null, 'No page you can view has that title. Do not cite it.') };
  if (found.pages.length > 1) {
    return {
      result: {
        ok: false,
        pageId: null,
        title: null,
        status: 'unknown',
        error: 'ambiguous_title',
        candidates: found.pages.map((p) => ({ pageId: p.id, title: p.title, url: p.url ?? null })),
        guidance: 'More than one page has this title. Call again with the pageId of the one you mean.',
      },
    };
  }
  return { pageId: found.pages[0]!.id };
}

// ---------------------------------------------------------------------------
// check-page-freshness
// ---------------------------------------------------------------------------
export async function checkPageFreshness(input: Record<string, unknown>, deps: ToolDeps): Promise<Result> {
  const resolved = await resolvePage(input, deps);
  if ('result' in resolved) return resolved.result;
  const { pageId } = resolved;
  const info = await getPageInfo(deps.user, pageId);
  if (info.status >= 300) return unknownPage(pageId);
  await ensureSchema();
  const [restricted, state, events, bindings] = await Promise.all([
    appCannotRead(deps.app, pageId),
    getPageState(pageId),
    openEventsForPage(pageId),
    bindingsForPage(pageId),
  ]);
  const now = Date.now();
  let status: StoredPageState = state?.status ?? (bindings.length > 0 ? 'verified' : 'unanchored');
  if (restricted) status = 'unanchored';
  const names = state?.verifiedBy ? await displayNames(deps.user, [state.verifiedBy]) : new Map<string, string>();
  const drift = restricted
    ? []
    : events.map((e) => {
        const at = fromSqlDate(e.createdAt) ?? now;
        const snoozedUntil = fromSqlDate(e.snoozedUntil);
        return {
          source: e.source,
          ref: refLabel(e.ref, e.source),
          summary: e.summary,
          severity: e.severity,
          score: e.score,
          at: isoTime(at),
          ...(snoozedUntil !== undefined && snoozedUntil > now && { snoozedUntil: isoTime(snoozedUntil) }),
          _at: at,
          _ref: e.ref,
        };
      });
  return {
    ok: true,
    pageId,
    title: info.title ?? null,
    url: info.url ?? null,
    status,
    statusLabel: PAGE_STATE_LABELS[status],
    ...(restricted && { restricted: true }),
    verifiedAt: isoTime(fromSqlDate(state?.verifiedAt)),
    verifiedBy: state?.verifiedBy ? (names.get(state.verifiedBy) ?? null) : null,
    openDrift: drift.map(({ _at, _ref, ...d }) => d),
    guidance: freshnessGuidance(
      status,
      drift.map((d) => ({ source: d.source, ref: d._ref, at: d._at })),
      { now, restricted },
    ),
  };
}

// ---------------------------------------------------------------------------
// find-docs-for-path
// ---------------------------------------------------------------------------
const MAX_DOC_PAGES = 25;

export async function findDocsForPath(input: Record<string, unknown>, deps: ToolDeps): Promise<Result> {
  const repo = parseRepo(input.repo);
  const path = typeof input.path === 'string' ? input.path.trim() : '';
  if (!repo || !path) {
    return { ok: false, pages: [], error: 'bad_request', guidance: 'Pass repo as workspace/slug (or slug) and a repo-relative path, folder or glob.' };
  }
  await ensureSchema();
  const bindings = await bindingsForRepoName(repo.full, repo.slug);
  const globs = new GlobCache();
  const best = new Map<string, { match: PathMatch; anchor: string }>();
  for (const b of bindings) {
    const match = matchBinding(b, path, globs);
    if (!match) continue;
    const cur = best.get(b.pageId);
    if (!cur || MATCH_RANK[match] > MATCH_RANK[cur.match]) best.set(b.pageId, { match, anchor: anchorLabel(b) });
  }
  const candidates = [...best.entries()].sort((a, b) => MATCH_RANK[b[1].match] - MATCH_RANK[a[1].match]).slice(0, MAX_DOC_PAGES);
  // Permission-aware: only pages the caller can view are listed at all.
  const infos = await Promise.all(candidates.map(([pageId]) => getPageInfo(deps.user, pageId)));
  const visible = candidates.filter((_, i) => infos[i]!.status < 300);
  const states = await pageStatesFor(visible.map(([id]) => id));
  const pages = visible
    .map(([pageId, m]) => {
      const info = infos[candidates.findIndex(([id]) => id === pageId)]!;
      const status: StoredPageState = states.get(pageId) ?? 'verified';
      return { pageId, title: info.title ?? '', url: info.url ?? null, anchor: m.anchor, match: m.match, status, statusLabel: PAGE_STATE_LABELS[status] };
    })
    .sort((a, b) => MATCH_RANK[b.match] - MATCH_RANK[a.match] || driftRank(b.status) - driftRank(a.status) || a.title.localeCompare(b.title));
  const drifted = pages.filter((p) => p.status === 'possibly_stale' || p.status === 'stale').length;
  const guidance =
    pages.length === 0
      ? 'No Confluence page you can view is anchored to this path.'
      : `${plural(pages.length, 'page')} ${pages.length === 1 ? 'documents' : 'document'} this path.${drifted > 0 ? ` ${drifted} of them ${drifted === 1 ? 'is' : 'are'} Possibly stale or Stale.` : ''} ${CHECK_BEFORE_CITING}`;
  return { ok: true, repo: repo.full ?? repo.slug, path, pages, guidance };
}

function driftRank(s: StoredPageState): number {
  return s === 'stale' ? 2 : s === 'possibly_stale' ? 1 : 0;
}

// ---------------------------------------------------------------------------
// list-stale-pages
// ---------------------------------------------------------------------------
export async function listStalePages(input: Record<string, unknown>, deps: ToolDeps): Promise<Result> {
  const spaceKey = parseSpaceKey(input.spaceKey);
  const limit = parseLimit(input.limit, 10, 50);
  await ensureSchema();
  const rows = await driftedPages(spaceKey, Math.min(150, limit * 3));
  const infos = await Promise.all(rows.map((r) => getPageInfo(deps.user, r.pageId)));
  const visible = rows.map((r, i) => ({ r, info: infos[i]! })).filter((x) => x.info.status < 300).slice(0, limit);
  const names = await displayNames(deps.user, visible.map((x) => x.r.ownerId));
  const pages = visible.map(({ r, info }) => ({
    pageId: r.pageId,
    title: info.title ?? '',
    url: info.url ?? null,
    spaceKey: r.spaceKey,
    status: r.status,
    statusLabel: PAGE_STATE_LABELS[r.status],
    severity: severityName(r.maxSeverity),
    openEvents: r.openEvents,
    owner: r.ownerId ? (names.get(r.ownerId) ?? null) : null,
    since: isoTime(fromSqlDate(r.since)),
    lastChange: r.lastSummary,
  }));
  const guidance =
    pages.length === 0
      ? `No Possibly stale or Stale pages that you can view${spaceKey ? ` in ${spaceKey}` : ''}.`
      : `${plural(pages.length, 'page')} ${pages.length === 1 ? 'is' : 'are'} Possibly stale or Stale. Do not present steps from them as current. Call check-page-freshness for the caveat before citing one.`;
  return { ok: true, spaceKey, pages, guidance };
}

// ---------------------------------------------------------------------------
// get-drift-context (agent only)
// ---------------------------------------------------------------------------
export const CONTEXT_INSTRUCTIONS =
  `${UNTRUSTED_RULE} To propose a fix, call submit-fix-proposal with pageId, sectionHeading (exactly as listed), originalText (copied exactly from that section's text, the smallest passage that needs to change) and proposedText. Never edit the page; a person accepts or rejects the draft.`;

export async function getDriftContext(input: Record<string, unknown>, deps: ToolDeps): Promise<Result> {
  const resolved = await resolvePage(input, deps);
  if ('result' in resolved) return resolved.result;
  const { pageId } = resolved;
  const page = await getPageStorage(deps.user, pageId);
  if (page.status >= 300 || page.storage === undefined) return unknownPage(pageId);
  if (await appCannotRead(deps.app, pageId)) {
    return { ok: false, pageId, title: page.title ?? null, status: 'unanchored', restricted: true, error: 'restricted', guidance: freshnessGuidance('unanchored', [], { restricted: true }) };
  }
  await ensureSchema();
  const [state, events] = await Promise.all([getPageState(pageId), eventDetailsForPage(pageId)]);
  const status: StoredPageState = state?.status ?? 'unanchored';
  if (events.length === 0) {
    return { ok: true, pageId, title: page.title ?? null, status, statusLabel: PAGE_STATE_LABELS[status], sections: [], events: [], guidance: 'This page has no open changes, so there is nothing to draft.' };
  }
  const changes = await changesByIds([...new Set(events.map((e) => e.changeRecordId))]);
  const now = Date.now();
  const views = events
    .map((e) => {
      const files = e.source === 'bitbucket' ? eventFiles(e.files, e.changeFiles) : [];
      const change = changes.get(e.changeRecordId);
      const tokens = tokensForEvents([{ files, matchedTokens: e.matchedTokens, issueKey: e.source === 'jira' ? e.ref : null }]);
      const paths = files.flatMap((f) => (f.oldPath ? [f.path, f.oldPath] : [f.path]));
      const jira = change?.record && change.record.source === 'jira' ? change.record.changelog : undefined;
      return {
        eventId: e.id,
        source: e.source,
        ref: refLabel(e.ref, e.source),
        title: e.changeTitle,
        author: e.changeAuthor,
        at: isoTime(fromSqlDate(e.createdAt) ?? now),
        severity: e.severity,
        summary: e.summary,
        reasons: e.reasons,
        files,
        ...(e.matchedTokens.length > 0 && { removedIdentifiers: e.matchedTokens }),
        diff: e.source === 'bitbucket' ? diffForPaths(change?.hunks, paths) : null,
        ...(jira && { changelog: jira.slice(0, 20) }),
        _tokens: tokens,
      };
    })
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));

  const sections = [];
  for (const s of splitSectionsDetailed(page.storage)) {
    const hitEvents = views.filter((v) => v._tokens.some((t) => tokenRegExp(t).test(s.text)));
    if (hitEvents.length === 0) continue;
    const matched = [...new Set(hitEvents.flatMap((v) => v._tokens.filter((t) => tokenRegExp(t).test(s.text))))];
    sections.push({ heading: s.heading, text: clip(s.text, SECTION_TEXT_MAX), matchedTokens: matched, eventIds: hitEvents.map((v) => v.eventId) });
    if (sections.length >= MAX_SECTIONS) break;
  }
  const ctx = fitContext({
    ok: true,
    pageId,
    title: page.title ?? null,
    status,
    statusLabel: PAGE_STATE_LABELS[status],
    instructions: CONTEXT_INSTRUCTIONS,
    sections,
    events: views.map(({ _tokens, ...v }) => v),
    guidance:
      sections.length > 0
        ? `Draft replacement text only for the ${plural(sections.length, 'section')} listed, then call submit-fix-proposal once per section. Never edit the page.`
        : 'No section of this page mentions the changed files or identifiers. Explain the change instead of drafting a fix.',
  });
  return ctx;
}

// ---------------------------------------------------------------------------
// record-verification (agent only, UPDATE: Rovo asks the user to confirm)
// ---------------------------------------------------------------------------
export async function recordAgentVerification(input: Record<string, unknown>, deps: ToolDeps): Promise<Result> {
  const resolved = await resolvePage(input, deps);
  if ('result' in resolved) return resolved.result;
  const { pageId } = resolved;
  const r = await markVerified(pageId, deps.accountId, input.note, deps.gate, 'agent');
  if (!r.ok) {
    const f = r as { error: string; message: string; state?: string };
    return { ok: false, pageId, title: null, status: f.state ?? 'unknown', error: f.error, guidance: f.message };
  }
  const ok = r as { status: StoredPageState; closedEvents: number; message: string };
  return {
    ok: true,
    pageId,
    status: ok.status,
    statusLabel: PAGE_STATE_LABELS[ok.status],
    verifiedAt: new Date().toISOString(),
    closedEvents: ok.closedEvents,
    guidance: `${ok.message} The page reads ${PAGE_STATE_LABELS[ok.status]}.`,
  };
}
