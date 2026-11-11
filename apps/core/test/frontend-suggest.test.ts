// Suggestion strength, order and display (UX-10), and the "Anchor this space" flow (R-1).
import { describe, expect, it } from 'vitest';
import {
  defaultChecked,
  defaultSpaceChecked,
  needsTypedRepo,
  saveSpaceButton,
  skippedPages,
  sortSuggestions,
  spaceSaveItems,
  spaceSaveResults,
  spaceSaveSummary,
  spaceSuggestionPages,
  suggestionDisplay,
  suggestionStrength,
  suggestionToAnchor,
  type SuggestionView,
} from '../src/frontend/shared/suggest';

const repo: SuggestionView = { key: 'repo|payments-api||', label: 'payments-api (whole repo)', anchorType: 'repo', repo: 'payments-api', evidence: 'repo_url', needsRepo: false };
const block: SuggestionView = { key: 'path|payments-api|deploy/helm/values.yaml|', label: 'payments-api: deploy/helm/values.yaml', anchorType: 'path', repo: 'payments-api', pattern: 'deploy/helm/values.yaml', evidence: 'code_block', needsRepo: false };
const inline: SuggestionView = { key: 'path|payments-api|scripts/rollback.sh|', label: 'payments-api: scripts/rollback.sh', anchorType: 'path', repo: 'payments-api', pattern: 'scripts/rollback.sh', evidence: 'inline_code', needsRepo: false };
const jira: SuggestionView = { key: 'jira|||PAY-142', label: 'PAY-142', anchorType: 'jira', jiraKey: 'PAY-142', evidence: 'jira_key', needsRepo: false };
const loose: SuggestionView = { key: 'path||config/workers.yaml|', label: 'config/workers.yaml', anchorType: 'path', pattern: 'config/workers.yaml', evidence: 'inline_code', needsRepo: true };

describe('suggestionStrength', () => {
  it('derives strength when the resolver sends none', () => {
    expect(suggestionStrength(block)).toBe('strong');
    expect(suggestionStrength(inline)).toBe('strong');
    expect(suggestionStrength(jira)).toBe('strong');
    expect(suggestionStrength(repo)).toBe('weak');
    expect(suggestionStrength(loose)).toBe('weak');
  });
  it('lets the resolver decide', () => {
    expect(suggestionStrength({ ...repo, strength: 'strong' })).toBe('strong');
    expect(suggestionStrength({ ...block, weak: true })).toBe('weak');
  });
});

describe('order, defaults and display', () => {
  it('puts strong code-block paths first and the whole repo last', () => {
    expect(sortSuggestions([repo, jira, inline, loose, block]).map((s) => s.key)).toEqual([block.key, inline.key, jira.key, loose.key, repo.key]);
  });
  it('pre-checks strong suggestions only', () => {
    expect(defaultChecked([repo, block, loose, jira])).toEqual({ [block.key]: true, [jira.key]: true });
  });
  it('shows the literal and a short note', () => {
    expect(suggestionDisplay(repo)).toEqual({ code: 'payments-api', note: 'Whole repository. Flags on every merge.' });
    expect(suggestionDisplay(block)).toEqual({ code: 'deploy/helm/values.yaml', note: 'in payments-api' });
    expect(suggestionDisplay(jira)).toEqual({ code: 'PAY-142', note: 'Jira issue' });
    expect(suggestionDisplay(loose)).toEqual({ code: 'config/workers.yaml', note: 'Needs a repository' });
    expect(suggestionDisplay(loose, 'acme/refunds')).toEqual({ code: 'config/workers.yaml', note: 'in refunds' });
  });
  it('turns a suggestion into an anchor', () => {
    expect(suggestionToAnchor(block)).toEqual({ anchorType: 'path', repo: 'payments-api', pattern: 'deploy/helm/values.yaml', weight: 'normal' });
    expect(suggestionToAnchor(loose, ' Refunds ')).toEqual({ anchorType: 'path', repo: 'refunds', pattern: 'config/workers.yaml', weight: 'normal' });
    expect(suggestionToAnchor(jira)).toEqual({ anchorType: 'jira', jiraKey: 'PAY-142', weight: 'normal', label: 'PAY-142' });
  });
});

describe('anchor this space (R-1)', () => {
  const res = [
    { pageId: 11, title: 'Rollback runbook', suggestions: [repo, block] },
    { pageId: '12', title: 'Workers', suggestions: [loose] },
    { pageId: '13', title: 'Nothing here', suggestions: [] },
  ];
  const pages = spaceSuggestionPages(res);

  it('reads the list or a wrapped list and drops pages with no suggestions', () => {
    expect(pages.map((p) => p.pageId)).toEqual(['11', '12']);
    expect(pages[0]!.suggestions.map((s) => s.key)).toEqual([block.key, repo.key]);
    expect(spaceSuggestionPages({ pages: res })).toHaveLength(2);
    expect(spaceSuggestionPages({ ok: false })).toEqual([]);
    expect(skippedPages({ skipped: [{ pageId: '9', title: 'Secret', reason: 'restricted' }] })).toHaveLength(1);
    expect(skippedPages(res)).toEqual([]);
  });

  it('builds the save payload from the checked suggestions', () => {
    const checked = defaultSpaceChecked(pages);
    expect(checked).toEqual({ '11': { [block.key]: true }, '12': {} });
    expect(spaceSaveItems(pages, checked)).toEqual([{ pageId: '11', anchors: [suggestionToAnchor(block)] }]);
    const withLoose = { ...checked, '12': { [loose.key]: true } };
    expect(needsTypedRepo(pages, withLoose, '')).toBe(true);
    expect(needsTypedRepo(pages, withLoose, 'refunds')).toBe(false);
    expect(spaceSaveItems(pages, withLoose, 'refunds')).toHaveLength(2);
    expect(saveSpaceButton(2)).toBe('Save anchors for 2 pages');
    expect(saveSpaceButton(1)).toBe('Save anchors for 1 page');
    expect(saveSpaceButton(0)).toBe('Save anchors');
  });

  it('summarises per-page results', () => {
    const items = [
      { pageId: '11', anchors: [{}, {}] },
      { pageId: '12', anchors: [{}] },
      { pageId: '14', anchors: [{}] },
    ];
    const results = spaceSaveResults(
      { results: [{ pageId: 11, ok: true, saved: 2 }, { pageId: '12', ok: false, error: 'forbidden', message: 'You need edit rights on this page.' }] },
      items,
      [...pages, { pageId: '14', title: 'Late page', suggestions: [] }],
    );
    expect(results).toEqual([
      { pageId: '11', title: 'Rollback runbook', ok: true, text: 'Saved 2 anchors. Verified.' },
      { pageId: '12', title: 'Workers', ok: false, text: 'You need edit rights on this page.' },
      { pageId: '14', title: 'Late page', ok: false, text: 'No result came back. Open the page to check its anchors.' },
    ]);
    expect(spaceSaveSummary(results)).toBe("Anchored 1 of 3 pages. 2 pages weren't saved.");
    expect(spaceSaveSummary(results.slice(0, 1))).toBe('Anchored 1 page.');
    expect(spaceSaveSummary([results[0]!, results[1]!])).toBe("Anchored 1 of 2 pages. 1 page wasn't saved.");
  });
});
