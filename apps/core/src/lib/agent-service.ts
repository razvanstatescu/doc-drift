// Rovo actions and MCP tools (docs/architecture/agent-tools.md). Every read goes through `user`, which is
// api.asUser() in the action entry points (D21: no asApp fallback); the dev driver passes api.asApp() to
// exercise the same code headlessly. A page the caller can't see returns `status: "unknown"` and no
// title. Every result carries `guidance` (D14).
import { PAGE_STATE_LABELS, type StoredPageState } from '@dds/shared';
import { GlobCache } from '@dds/matcher';
import { appCannotRead } from './access';
import {
  CHECK_BEFORE_CITING,
  citePolicyFor,
  OTHER_SITE_GUIDANCE,
  pageLead,
  UNREADABLE_URL_GUIDANCE,
  urlHost,
  diffForPaths,
  evidenceLevelFor,
  fitContext,
  freshnessGuidance,
  isoTime,
  jiraChangelogView,
  MATCH_RANK,
  matchBinding,
  NO_PAGE_GUIDANCE,
  parseLimit,
  parsePageRef,
  parseRepo,
  parseSpaceKey,
  SECTION_TEXT_MAX,
  clip,
  type ContextBlock,
  UNTRUSTED_RULE,
  unknownPage,
  type PathMatch,
} from './agent-tools';
import { anchorLabel } from './anchors';
import { extractBlocks, type PageBlock } from './blocks';
import { plural, refLabel } from './copy';
import { displayNames, findPagesByTitle, getPageInfo, getPageStorage, pageOperations } from './confluence';
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
import { eventFiles, MAX_SECTIONS, severityName, tokenRegExp, tokensForEvents } from './review';
import { sectionHits } from './quick-fix';
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

export type ResolvedFrom = 'pageId' | 'pageUrl' | 'tinyUrl' | 'title' | 'context';

/**
 * Resolves the page from the inputs: ID, URL (page, tiny or legacy link), exact title (asUser search),
 * or, only when no page was named at all, the Rovo page context (BUG-04). A link we can't read is
 * `no_page` asking which page, never the open page. A link to another site is `other_site`.
 */
export async function resolvePage(input: Record<string, unknown>, deps: ToolDeps): Promise<{ pageId: string; resolvedFrom: ResolvedFrom } | { result: Result }> {
  const ref = parsePageRef(input, deps.contextPageId);
  if ('pageId' in ref) {
    if (ref.host) {
      // Observation 9: `other-site.atlassian.net/.../pages/2720129` is not page 2720129 on this site.
      const info = await getPageInfo(deps.user, ref.pageId);
      const here = info.url ? urlHost(info.url) : undefined;
      if (here && here !== ref.host) {
        return { result: { ok: false, pageId: null, title: null, status: 'unknown', citePolicy: 'do_not_cite', error: 'other_site', guidance: OTHER_SITE_GUIDANCE } };
      }
    }
    return { pageId: ref.pageId, resolvedFrom: ref.via };
  }
  if (ref.via === 'none') {
    const unreadable = ref.reason === 'unreadable_url';
    return {
      result: { ok: false, pageId: null, title: null, status: 'unknown', citePolicy: 'do_not_cite', error: 'no_page', guidance: unreadable ? UNREADABLE_URL_GUIDANCE : NO_PAGE_GUIDANCE },
    };
  }
  const found = await findPagesByTitle(deps.user, ref.title, 5);
  if (found.pages.length === 0) return { result: { ...unknownPage(null, 'No page you can view has that title. Ask the user for the page link. Do not cite it.'), citePolicy: 'do_not_cite' } };
  if (found.pages.length > 1) {
    return {
      result: {
        ok: false,
        pageId: null,
        title: null,
        status: 'unknown',
        citePolicy: 'do_not_cite',
        error: 'ambiguous_title',
        candidates: found.pages.map((p) => ({ pageId: p.id, title: p.title, url: p.url ?? null })),
        guidance: 'More than one page has this title. Ask the user which one, or call again with the pageId of the one you mean.',
      },
    };
  }
  return { pageId: found.pages[0]!.id, resolvedFrom: 'title' };
}

// ---------------------------------------------------------------------------
// check-page-freshness
// ---------------------------------------------------------------------------
export async function checkPageFreshness(input: Record<string, unknown>, deps: ToolDeps): Promise<Result> {
  const resolved = await resolvePage(input, deps);
  if ('result' in resolved) return resolved.result;
  const { pageId, resolvedFrom } = resolved;
  const info = await getPageStorage(deps.user, pageId);
  if (info.status >= 300) return { ...unknownPage(pageId), citePolicy: 'do_not_cite' };
  await ensureSchema();
  const [restricted, state, events, bindings] = await Promise.all([
    appCannotRead(deps.app, pageId),
    getPageState(pageId),
    eventDetailsForPage(pageId),
    bindingsForPage(pageId),
  ]);
  const now = Date.now();
  let status: StoredPageState = state?.status ?? (bindings.length > 0 ? 'verified' : 'unanchored');
  if (restricted) status = 'unanchored';
  const names = state?.verifiedBy ? await displayNames(deps.user, [state.verifiedBy]) : new Map<string, string>();
  if (state?.verifiedBy && !names.has(state.verifiedBy)) for (const [k, v] of await displayNames(deps.app, [state.verifiedBy])) names.set(k, v);
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
  // R-5: the sections that name the change (summary level: headings and block IDs only, D30).
  const tokens = tokensForEvents(
    events.map((e) => ({ files: e.source === 'bitbucket' ? eventFiles(e.files, e.changeFiles) : [], matchedTokens: e.matchedTokens, issueKey: e.source === 'jira' ? e.ref : null })),
  );
  const sections = !restricted && info.storage ? sectionHits(info.storage, tokens).map(({ heading, blockIds }) => ({ heading, blockIds })) : [];
  const title = info.title ?? null;
  const lead = pageLead(title, PAGE_STATE_LABELS[status]);
  const where = sections.length > 0 ? ` Affected: ${sections.map((x) => `"${x.heading}"`).join(', ')}.` : '';
  // D35: Jira work items people created to fix the open drift.
  const trackedIn = restricted ? [] : [...new Set(events.map((e) => e.followUpKey).filter((k): k is string => Boolean(k)))];
  const tracked = trackedIn.length > 0 ? ` An update is tracked in ${trackedIn.join(', ')}.` : '';
  return {
    ok: true,
    pageId,
    title,
    url: info.url ?? null,
    resolvedFrom,
    status,
    statusLabel: PAGE_STATE_LABELS[status],
    citePolicy: citePolicyFor(status, restricted),
    ...(restricted && { restricted: true }),
    verifiedAt: isoTime(fromSqlDate(state?.verifiedAt)),
    verifiedBy: state?.verifiedBy ? (names.get(state.verifiedBy) ?? null) : null,
    openDrift: drift.map(({ _at, _ref, ...d }) => d),
    affectedSections: sections,
    ...(trackedIn.length > 0 && { trackedIn }),
    guidance: `${lead} ${freshnessGuidance(
      status,
      drift.map((d) => ({ source: d.source, ref: d._ref, at: d._at })),
      { now, restricted },
    )}${status === 'possibly_stale' || status === 'stale' ? `${where}${tracked}` : ''}`,
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
  // Observation 8: within a match kind, the more specific anchor (longer static path) ranks first.
  const best = new Map<string, { match: PathMatch; anchor: string; specificity: number }>();
  for (const b of bindings) {
    const match = matchBinding(b, path, globs);
    if (!match) continue;
    const cur = best.get(b.pageId);
    const specificity = (b.pattern ?? '').replace(/[*?[\]{}].*$/, '').length;
    if (!cur || MATCH_RANK[match] > MATCH_RANK[cur.match] || (MATCH_RANK[match] === MATCH_RANK[cur.match] && specificity > cur.specificity)) {
      best.set(b.pageId, { match, anchor: anchorLabel(b), specificity });
    }
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
      return { pageId, title: info.title ?? '', url: info.url ?? null, anchor: m.anchor, match: m.match, status, statusLabel: PAGE_STATE_LABELS[status], citePolicy: citePolicyFor(status), _spec: m.specificity };
    })
    .sort((a, b) => MATCH_RANK[b.match] - MATCH_RANK[a.match] || b._spec - a._spec || driftRank(b.status) - driftRank(a.status) || a.title.localeCompare(b.title))
    .map(({ _spec, ...p }) => p);
  const drifted = pages.filter((p) => p.status === 'possibly_stale' || p.status === 'stale').length;
  const guidance =
    pages.length === 0
      ? 'No Confluence page you can view is anchored to this path.'
      : `${plural(pages.length, 'page')} ${pages.length === 1 ? 'documents' : 'document'} this path: ${pages.slice(0, 5).map((p) => `"${p.title}" (${p.statusLabel})`).join(', ')}${pages.length > 5 ? ` and ${pages.length - 5} more` : ''}.${drifted > 0 ? ` ${drifted} of them ${drifted === 1 ? 'is' : 'are'} Possibly stale or Stale.` : ''} ${CHECK_BEFORE_CITING} Name each page by its title.`;
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
  const limitNote = input.limit !== undefined && input.limit !== null && input.limit !== '' && String(input.limit).trim() !== String(limit) ? ` limit ${JSON.stringify(input.limit)} is not 1 to 50, so ${limit} was used.` : '';
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
    citePolicy: citePolicyFor(r.status),
  }));
  const guidance =
    pages.length === 0
      ? `No Possibly stale or Stale pages that you can view${spaceKey ? ` in ${spaceKey}` : ''}.`
      : `${plural(pages.length, 'page')} ${pages.length === 1 ? 'is' : 'are'} Possibly stale or Stale: ${pages.slice(0, 5).map((p) => `"${p.title}" (${p.statusLabel})`).join(', ')}${pages.length > 5 ? ` and ${pages.length - 5} more` : ''}. Do not present steps from them as current. Call check-page-freshness for the caveat before citing one, and name each page by its title.`;
  return { ok: true, spaceKey, limit, pages, guidance: `${guidance}${limitNote ? ` Note:${limitNote}` : ''}` };
}

// ---------------------------------------------------------------------------
// get-drift-context (agent only)
// ---------------------------------------------------------------------------
/** D30: a viewer without edit rights gets summaries only. */
export const SUMMARY_EVIDENCE_GUIDANCE =
  'You can view this page but not edit it, so diffs and full Jira text are left out. Explain the change from the summary; a person with edit rights can draft a fix.';

export const CONTEXT_INSTRUCTIONS =
  `${UNTRUSTED_RULE} Each section lists its blocks (paragraph, list-item, table-cell, heading, code). To propose a fix, call submit-fix-proposal once per block that must change, with pageId, blockId and proposedText: the block's full new text, copied verbatim from the block's text with only the needed change. For a code block, proposedText is the whole new code body; to change one line only, also pass that line, verbatim, as originalText. Never put two blocks in one proposal. Link text and @mention appear in the block text as the page shows them: keep them exactly, or the draft is refused. Never edit the page; a person accepts or rejects each draft.`;

/** Blocks shown per section before unmatched ones are left out (the neighbours of a matched block stay). */
export const MAX_SECTION_BLOCKS = 30;

/** The blocks of one section for get-drift-context: verbatim text, `matched` where a token appears. */
export function contextBlocks(blocks: PageBlock[], patterns: RegExp[]): { blocks: ContextBlock[]; blocksOmitted?: number; matchedOmitted?: number } {
  const all: ContextBlock[] = blocks.map((b) => {
    const text = clip(b.text, SECTION_TEXT_MAX);
    return {
      blockId: b.blockId,
      kind: b.kind,
      text,
      ...(patterns.some((re) => re.test(b.text)) && { matched: true as const }),
      ...(text !== b.text && { truncated: true as const }),
    };
  });
  if (all.length <= MAX_SECTION_BLOCKS) return { blocks: all };
  const near = all.filter((b, i) => b.matched || all[i - 1]?.matched || all[i + 1]?.matched);
  // Matched blocks first, so a section with more than 30 matches drops neighbours before matches.
  const keepSet = new Set([...near.filter((b) => b.matched), ...near.filter((b) => !b.matched)].slice(0, MAX_SECTION_BLOCKS));
  const keep = all.filter((b) => keepSet.has(b));
  const matchedOmitted = all.filter((b) => b.matched && !keepSet.has(b)).length;
  return { blocks: keep, blocksOmitted: all.length - keep.length, ...(matchedOmitted > 0 && { matchedOmitted }) };
}

export async function getDriftContext(input: Record<string, unknown>, deps: ToolDeps): Promise<Result> {
  const resolved = await resolvePage(input, deps);
  if ('result' in resolved) return resolved.result;
  const { pageId, resolvedFrom } = resolved;
  const page = await getPageStorage(deps.user, pageId);
  if (page.status >= 300 || page.storage === undefined) return unknownPage(pageId);
  if (await appCannotRead(deps.app, pageId)) {
    return { ok: false, pageId, title: page.title ?? null, status: 'unanchored', restricted: true, error: 'restricted', guidance: freshnessGuidance('unanchored', [], { restricted: true }) };
  }
  await ensureSchema();
  // D30: raw diffs and full Jira values only for callers with update rights on the page (asUser).
  const [state, events, ops] = await Promise.all([getPageState(pageId), eventDetailsForPage(pageId), pageOperations(deps.user, pageId)]);
  const evidenceLevel = evidenceLevelFor(ops.status < 300 && ops.ops.has('update'));
  const status: StoredPageState = state?.status ?? 'unanchored';
  if (events.length === 0) {
    return {
      ok: true,
      pageId,
      title: page.title ?? null,
      url: page.url ?? null,
      resolvedFrom,
      status,
      statusLabel: PAGE_STATE_LABELS[status],
      sections: [],
      events: [],
      guidance: `${pageLead(page.title, PAGE_STATE_LABELS[status])} It has no open changes, so there is nothing to draft.`,
    };
  }
  const changes = await changesByIds([...new Set(events.map((e) => e.changeRecordId))]);
  const full = evidenceLevel === 'full';
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
        ...(full && { diff: e.source === 'bitbucket' ? diffForPaths(change?.hunks, paths) : null }),
        ...(jira && { changelog: jiraChangelogView(jira, evidenceLevel) }),
        _tokens: tokens,
      };
    })
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));

  const sections = [];
  const bySection = new Map<number, PageBlock[]>();
  for (const b of extractBlocks(page.storage)) bySection.set(b.sectionIndex, [...(bySection.get(b.sectionIndex) ?? []), b]);
  for (const group of bySection.values()) {
    const text = group.map((b) => b.text).join('\n');
    const hitEvents = views.filter((v) => v._tokens.some((t) => tokenRegExp(t).test(text)));
    if (hitEvents.length === 0) continue;
    const matched = [...new Set(hitEvents.flatMap((v) => v._tokens.filter((t) => tokenRegExp(t).test(text))))];
    sections.push({ heading: group[0]!.section, matchedTokens: matched, eventIds: hitEvents.map((v) => v.eventId), ...contextBlocks(group, matched.map(tokenRegExp)) });
    if (sections.length >= MAX_SECTIONS) break;
  }
  const lead = pageLead(page.title, PAGE_STATE_LABELS[status]);
  const ctx = fitContext({
    ok: true,
    pageId,
    title: page.title ?? null,
    url: page.url ?? null,
    resolvedFrom,
    status,
    statusLabel: PAGE_STATE_LABELS[status],
    instructions: CONTEXT_INSTRUCTIONS,
    evidenceLevel,
    sections,
    events: views.map(({ _tokens, ...v }) => v),
    guidance: `${lead} ` + (!full
      ? `${SUMMARY_EVIDENCE_GUIDANCE} ${sections.length > 0 ? `${plural(sections.length, 'section')} ${sections.length === 1 ? 'mentions' : 'mention'} the change.` : 'No section mentions the changed files or identifiers.'}`
      : sections.length > 0
        ? `Draft replacement text only for the ${plural(sections.length, 'section')} listed. Call submit-fix-proposal once per block that must change (usually the blocks marked matched), with its blockId. Never merge blocks. Never edit the page.`
        : 'No section of this page mentions the changed files or identifiers. Explain the change instead of drafting a fix.'),
  });
  // Observation 4: say so when matched blocks were left out, so an agent never thinks it fixed every step.
  const matchedOmitted = ctx.sections.reduce((n, sec) => n + ((sec as { matchedOmitted?: number }).matchedOmitted ?? 0), 0);
  const omitted = ctx.sections.reduce((n, sec) => n + (sec.blocksOmitted ?? 0), 0);
  if (omitted > 0 || matchedOmitted > 0) {
    ctx.truncated = true;
    if (matchedOmitted > 0) {
      (ctx as Record<string, unknown>).matchedOmitted = matchedOmitted;
      ctx.guidance = `${ctx.guidance} ${plural(matchedOmitted, 'matched block')} did not fit and ${matchedOmitted === 1 ? 'is' : 'are'} not listed: tell the user the draft covers only the blocks shown.`;
    }
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// record-verification (agent only, UPDATE: Rovo asks the user to confirm)
// ---------------------------------------------------------------------------
export async function recordAgentVerification(input: Record<string, unknown>, deps: ToolDeps): Promise<Result> {
  const resolved = await resolvePage(input, deps);
  if ('result' in resolved) return resolved.result;
  const { pageId, resolvedFrom } = resolved;
  const r = await markVerified(pageId, deps.accountId, input.note, deps.gate, 'agent');
  if (!r.ok) {
    const f = r as { error: string; message: string; state?: string };
    // A page the caller can see keeps its title in the answer (UX-1); an invisible one never does.
    const info = f.error === 'not_visible' ? undefined : await getPageInfo(deps.user, pageId);
    const title = info && info.status < 300 ? (info.title ?? null) : null;
    return { ok: false, pageId, title, resolvedFrom, status: f.error === 'unanchored' ? 'unanchored' : (f.state ?? 'unknown'), error: f.error, guidance: title ? `"${title}": ${f.message}` : f.message };
  }
  const ok = r as { status: StoredPageState; closedEvents: number; message: string };
  const info = await getPageInfo(deps.user, pageId);
  const title = info.status < 300 ? (info.title ?? null) : null;
  return {
    ok: true,
    pageId,
    title,
    url: info.url ?? null,
    resolvedFrom,
    status: ok.status,
    statusLabel: PAGE_STATE_LABELS[ok.status],
    verifiedAt: new Date().toISOString(),
    closedEvents: ok.closedEvents,
    guidance: `${title ? `"${title}": ` : ''}${ok.message} The page reads ${PAGE_STATE_LABELS[ok.status]}.`,
  };
}
