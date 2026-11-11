// Anchor suggestions in the UI (UX-10, R-1): strength, order, display and the anchors they save.
// Shared by the byline Anchors tab and the dashboard's "Anchor this space" flow. Pure: no Forge
// imports, so Vitest covers it (test/frontend-suggest.test.ts).
import { plural } from './format';

export interface SuggestionView {
  key: string;
  label?: string;
  anchorType: string;
  repo?: string;
  pattern?: string;
  jiraKey?: string;
  evidence?: string;
  needsRepo?: boolean;
  /** Optional from the resolver; derived here when absent. */
  strength?: 'strong' | 'weak';
  weak?: boolean;
}

export type Strength = 'strong' | 'weak';

/**
 * Strong suggestions are pre-checked; weak ones start unchecked. The resolver's `strength` (or
 * `weak`) wins. Otherwise a whole repository is weak (it flags on every merge), and so is a path on
 * a page that links no repository (it needs one typed in before it can be saved).
 */
export function suggestionStrength(s: SuggestionView): Strength {
  if (s.strength === 'strong' || s.strength === 'weak') return s.strength;
  if (typeof s.weak === 'boolean') return s.weak ? 'weak' : 'strong';
  if (s.anchorType === 'repo') return 'weak';
  if (s.needsRepo) return 'weak';
  return 'strong';
}

const EVIDENCE_RANK: Record<string, number> = { code_block: 0, inline_code: 1, jira_key: 2, repo_url: 3 };

/** Strong first, then code blocks before inline code before Jira keys; whole repos last. Stable. */
export function sortSuggestions<T extends SuggestionView>(list: T[] | null | undefined): T[] {
  const rank = (s: T) => (suggestionStrength(s) === 'weak' ? 10 : 0) + (s.anchorType === 'repo' ? 5 : 0) + (EVIDENCE_RANK[s.evidence ?? ''] ?? 4);
  return (list ?? [])
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .map((x) => x.s);
}

/** The keys to pre-check: every strong suggestion. */
export function defaultChecked(list: SuggestionView[] | null | undefined): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const s of list ?? []) if (suggestionStrength(s) === 'strong') out[s.key] = true;
  return out;
}

/** The literal shown in code style, and a short note after it. */
export function suggestionDisplay(s: SuggestionView, typedRepo = ''): { code: string; note: string } {
  const repo = typedRepo.trim();
  if (s.anchorType === 'jira') return { code: s.jiraKey || s.label || '', note: 'Jira issue' };
  if (s.anchorType === 'repo') return { code: s.repo || (s.label || '').replace(/ \(whole repo\)$/, ''), note: 'Whole repository. Flags on every merge.' };
  const code = s.pattern || s.label || '';
  if (s.needsRepo) return { code, note: repo ? `in ${repo.split('/').pop()}` : 'Needs a repository' };
  return { code, note: s.repo ? `in ${s.repo.split('/').pop()}` : '' };
}

export interface AnchorInputView {
  anchorType: string;
  repo?: string;
  pattern?: string;
  jiraKey?: string;
  weight: 'normal' | 'critical';
  label?: string;
}

/** A checked suggestion as an anchor to save. A path on a page with no repository takes `typedRepo`. */
export function suggestionToAnchor(s: SuggestionView, typedRepo = ''): AnchorInputView {
  if (s.anchorType === 'jira') return { anchorType: 'jira', jiraKey: s.jiraKey, weight: 'normal', ...(s.label ? { label: s.label } : {}) };
  const repo = s.repo || typedRepo.trim().toLowerCase();
  return { anchorType: s.anchorType, repo, pattern: s.pattern || '', weight: 'normal' };
}

// ---------------------------------------------------------------------------
// R-1: "Anchor this space"
// ---------------------------------------------------------------------------

export interface SpaceSuggestionPage {
  pageId: string;
  title: string;
  url?: string;
  suggestions: SuggestionView[];
}

/** `suggestSpaceAnchors` returns a list, or `{ pages }` / `{ items }`; pages without suggestions are dropped. */
export function spaceSuggestionPages(res: unknown): SpaceSuggestionPage[] {
  const r = res as { pages?: unknown; items?: unknown } | unknown[] | null | undefined;
  const raw = Array.isArray(r) ? r : Array.isArray(r?.pages) ? r.pages : Array.isArray(r?.items) ? r.items : [];
  return (raw as SpaceSuggestionPage[])
    .filter((p) => p && p.pageId !== undefined && p.pageId !== null)
    .map((p) => ({ ...p, pageId: String(p.pageId), title: p.title || 'Untitled page', suggestions: sortSuggestions(p.suggestions || []) }))
    .filter((p) => p.suggestions.length > 0);
}

/** Pages the resolver skipped (restricted, drafts), with a reason. */
export function skippedPages(res: unknown): { pageId: string; title: string; reason?: string }[] {
  const r = res as { skipped?: unknown } | null | undefined;
  return Array.isArray(r?.skipped) ? (r.skipped as { pageId: string; title: string; reason?: string }[]) : [];
}

/** checked[pageId][suggestionKey]: strong suggestions on. */
export function defaultSpaceChecked(pages: SpaceSuggestionPage[]): Record<string, Record<string, boolean>> {
  const out: Record<string, Record<string, boolean>> = {};
  for (const p of pages) out[p.pageId] = defaultChecked(p.suggestions);
  return out;
}

/** True when a checked path needs a repository and none is typed. */
export function needsTypedRepo(pages: SpaceSuggestionPage[], checked: Record<string, Record<string, boolean>>, typedRepo: string): boolean {
  if (typedRepo.trim()) return false;
  return pages.some((p) => p.suggestions.some((s) => s.needsRepo && checked[p.pageId]?.[s.key]));
}

/** The `saveSpaceAnchors` payload: one item per page with at least 1 checked suggestion. */
export function spaceSaveItems(
  pages: SpaceSuggestionPage[],
  checked: Record<string, Record<string, boolean>>,
  typedRepo = '',
): { pageId: string; anchors: AnchorInputView[] }[] {
  return pages
    .map((p) => ({ pageId: p.pageId, anchors: p.suggestions.filter((s) => checked[p.pageId]?.[s.key]).map((s) => suggestionToAnchor(s, typedRepo)) }))
    .filter((i) => i.anchors.length > 0);
}

/** "Save anchors for 3 pages" */
export const saveSpaceButton = (n: number): string => (n === 0 ? 'Save anchors' : `Save anchors for ${plural(n, 'page')}`);

export interface SpaceSaveResult {
  pageId: string;
  title: string;
  ok: boolean;
  /** One line: "Saved 3 anchors." or the resolver's reason. */
  text: string;
}

/**
 * Per-page results from `saveSpaceAnchors` (a list, or `{ results }` / `{ pages }`), joined with
 * the titles we showed. A page with no result counts as not saved.
 */
export function spaceSaveResults(res: unknown, items: { pageId: string; anchors: unknown[] }[], pages: SpaceSuggestionPage[]): SpaceSaveResult[] {
  const r = res as { results?: unknown; pages?: unknown } | unknown[] | null | undefined;
  const raw = (Array.isArray(r) ? r : Array.isArray(r?.results) ? r.results : Array.isArray(r?.pages) ? r.pages : []) as {
    pageId?: string | number;
    ok?: boolean;
    error?: string;
    message?: string;
    saved?: number;
    count?: number;
  }[];
  const byId = new Map(raw.filter((x) => x && x.pageId !== undefined).map((x) => [String(x.pageId), x]));
  return items.map((item) => {
    const title = pages.find((p) => p.pageId === item.pageId)?.title || 'Untitled page';
    const got = byId.get(item.pageId);
    if (!got) return { pageId: item.pageId, title, ok: false, text: 'No result came back. Open the page to check its anchors.' };
    const ok = got.ok !== false && !got.error;
    if (!ok) return { pageId: item.pageId, title, ok, text: got.message || got.error || "Couldn't save the anchors." };
    const n = typeof got.saved === 'number' ? got.saved : typeof got.count === 'number' ? got.count : item.anchors.length;
    return { pageId: item.pageId, title, ok, text: `Saved ${plural(n, 'anchor')}. Verified.` };
  });
}

/** "Anchored 4 pages." / "Anchored 3 of 4 pages. 1 page wasn't saved." */
export function spaceSaveSummary(results: SpaceSaveResult[]): string {
  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  if (failed === 0) return `Anchored ${plural(ok, 'page')}.`;
  return `Anchored ${ok} of ${plural(results.length, 'page')}. ${plural(failed, 'page')} ${failed === 1 ? "wasn't" : "weren't"} saved.`;
}
