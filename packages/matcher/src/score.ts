import type { BitbucketChangeRecord, Binding, ChangeRecord, ChangedFile, JiraChangeRecord } from '@dds/shared';
import { COSMETIC_FACTOR, IDENTIFIER_BOOST, SNIPPET_BOOST, resolveConfig, type MatcherConfig } from './config.js';
import { isCosmeticOnly } from './cosmetic.js';
import { parseUnifiedDiff, type FileDiff } from './diff.js';
import { removedIdentifiers, type RemovedIdentifiers } from './identifiers.js';
import { jiraSignals } from './jira.js';
import type { PageIndex } from './page-index.js';
import { GlobCache, ignoreMatcher, normalizePath, pathMatchStrength, repoMatches } from './paths.js';
import * as reason from './reasons.js';
import { detectRevert } from './revert.js';
import { removedLineHashes } from './snippets.js';
import type { DriftEvent, MatchResult, RenameProposal } from './types.js';
import { effectiveWeight, roundScore, severityFor } from './weights.js';

/** Page indexes by page ID. Pages missing from the map are scored on paths only (no boosts). */
export type PagesIndex = ReadonlyMap<string, PageIndex>;

interface FileMatch {
  file: ChangedFile;
  term: number;
  cosmetic: boolean;
}

/** Change-wide evidence computed once per change record. */
interface ChangeEvidence {
  identifiers: RemovedIdentifiers;
  lineHashes: ReadonlySet<string>;
  label: string;
}

function filePaths(file: ChangedFile): string[] {
  return file.oldPath === undefined ? [file.path] : [file.path, file.oldPath];
}

function shortRepo(repo: string | undefined): string {
  return repo?.split('/').at(-1) ?? '';
}

function anchorLabel(binding: Binding): string {
  if (binding.anchorType === 'jira') return binding.jiraKey ?? binding.id;
  if (binding.anchorType === 'repo') return `${shortRepo(binding.repo)} (whole repo)`;
  return `${shortRepo(binding.repo)}: ${binding.pattern ?? ''}`;
}

/** Magnitude: 1 for removed or renamed files, else log-scaled line churn capped at 1. */
function magnitude(file: ChangedFile): number {
  if (file.status === 'removed' || file.status === 'renamed') return 1;
  return Math.min(1, Math.log10(1 + file.linesAdded + file.linesRemoved) / 2);
}

/** Scores every file against one binding and keeps the strongest (scores take the max, never a sum). */
function matchFiles(
  binding: Binding,
  files: readonly ChangedFile[],
  diffs: ReadonlyMap<string, FileDiff>,
  globs: GlobCache,
): { best: FileMatch; matched: ChangedFile[] } | undefined {
  const weight = effectiveWeight(binding);
  let best: FileMatch | undefined;
  const matched: ChangedFile[] = [];
  for (const file of files) {
    const strength = pathMatchStrength(binding, file, globs);
    if (strength === 0) continue;
    matched.push(file);
    const diff = diffs.get(file.path);
    const cosmetic = file.status === 'modified' && diff !== undefined && isCosmeticOnly(diff);
    const term = weight * strength * (0.5 + 0.5 * magnitude(file)) * (cosmetic ? COSMETIC_FACTOR : 1);
    if (!best || term > best.term) best = { file, term, cosmetic };
  }
  return best && { best, matched };
}

function pageEvidence(page: PageIndex | undefined, evidence: ChangeEvidence): { identifiers: string[]; snippetLines: number } {
  if (!page) return { identifiers: [], snippetLines: 0 };
  const identifiers = [
    ...[...evidence.identifiers.codeShaped].filter((t) => page.tokens.has(t)),
    ...[...evidence.identifiers.plain].filter((t) => page.codeTokens.has(t)),
  ];
  const snippetLines = [...evidence.lineHashes].filter((h) => page.codeLineHashes.has(h)).length;
  return { identifiers, snippetLines };
}

function renameProposalFor(binding: Binding, files: readonly ChangedFile[]): RenameProposal | undefined {
  if (binding.anchorType !== 'path' || !binding.pattern) return undefined;
  const pattern = normalizePath(binding.pattern);
  const renamed = files.find((f) => f.status === 'renamed' && f.oldPath !== undefined && normalizePath(f.oldPath) === pattern);
  return renamed && { bindingId: binding.id, pageId: binding.pageId, from: pattern, to: normalizePath(renamed.path) };
}

function scoreBitbucket(
  change: BitbucketChangeRecord,
  bindings: readonly Binding[],
  pages: PagesIndex,
  config: MatcherConfig,
): MatchResult {
  if (config.ignoreNonDefaultBranches && change.defaultBranch && change.destinationBranch !== change.defaultBranch) {
    return { kind: 'skipped', reason: 'non_default_branch' };
  }
  const isIgnored = ignoreMatcher(config.ignoreGlobs);
  const files = change.files.filter((f) => !filePaths(f).every(isIgnored));
  if (files.length === 0) return { kind: 'skipped', reason: 'no_relevant_files' };

  const revert = detectRevert(change.title);
  if (revert) return { kind: 'revert', revert };

  const relevant = new Set(files.flatMap(filePaths));
  const diffs = change.hunks
    ? parseUnifiedDiff(change.hunks).filter((d) => relevant.has(d.path) || (d.oldPath !== undefined && relevant.has(d.oldPath)))
    : [];
  const diffByPath = new Map(diffs.map((d) => [d.path, d]));
  const evidence: ChangeEvidence = {
    identifiers: removedIdentifiers(diffs),
    lineHashes: removedLineHashes(diffs),
    label: `PR #${change.prId}`,
  };
  const ref = `${change.workspace}/${change.repoSlug}#${change.prId}`;
  const globs = new GlobCache();
  const events: DriftEvent[] = [];
  const renameProposals: RenameProposal[] = [];

  for (const binding of bindings) {
    if (!['path', 'glob', 'repo'].includes(binding.anchorType) || !repoMatches(binding.repo, change)) continue;
    const rename = renameProposalFor(binding, files);
    if (rename) renameProposals.push(rename);

    const match = matchFiles(binding, files, diffByPath, globs);
    if (!match) continue;
    const { identifiers, snippetLines } = pageEvidence(pages.get(binding.pageId), evidence);
    const score = roundScore(
      match.best.term + (identifiers.length > 0 ? IDENTIFIER_BOOST : 0) + (snippetLines > 0 ? SNIPPET_BOOST : 0),
    );
    if (score < config.threshold) continue;

    const repoWide = binding.anchorType === 'repo';
    const reasons = [
      repoWide ? reason.repoWideReason(files.length, change.repoSlug) : reason.fileReason(match.best.file, match.best.cosmetic),
    ];
    if (!repoWide && match.matched.length > 1) reasons.push(reason.moreFilesReason(match.matched.length - 1));
    if (identifiers.length > 0) reasons.push(reason.identifierReason(identifiers, evidence.label));
    if (snippetLines > 0) reasons.push(reason.snippetReason(snippetLines, evidence.label));
    if (binding.dismissCount) reasons.push(reason.dampenerReason(binding.dismissCount, effectiveWeight(binding)));

    const fileGone = !repoWide && match.matched.some((f) => f.status === 'removed' || f.status === 'renamed');
    events.push({
      pageId: binding.pageId,
      bindingId: binding.id,
      source: 'bitbucket',
      ref,
      dedupeKey: `${binding.id}|${ref}`,
      score,
      severity: severityFor(score, binding, fileGone),
      matchedAnchor: anchorLabel(binding),
      files: match.matched.map((f) => f.path),
      reasons,
      matchedIdentifiers: identifiers,
      matchedSnippetLines: snippetLines,
    });
  }
  return { kind: 'scored', events: sortEvents(events), renameProposals };
}

function scoreJira(change: JiraChangeRecord, bindings: readonly Binding[], config: MatcherConfig): MatchResult {
  const signals = jiraSignals(change);
  const strongest = signals[0];
  const events: DriftEvent[] = [];
  for (const binding of bindings) {
    if (!strongest || binding.anchorType !== 'jira' || binding.jiraKey !== change.issueKey) continue;
    const score = roundScore(strongest.score * effectiveWeight(binding));
    if (score < config.threshold) continue;
    const reasons = [...new Set(signals.map((s) => s.reason))];
    if (binding.dismissCount) reasons.push(reason.dampenerReason(binding.dismissCount, effectiveWeight(binding)));
    events.push({
      pageId: binding.pageId,
      bindingId: binding.id,
      source: 'jira',
      ref: change.issueKey,
      dedupeKey: `${binding.id}|${change.issueKey}|${change.changelogId ?? ''}`,
      score,
      severity: severityFor(score, binding, false),
      matchedAnchor: anchorLabel(binding),
      files: [],
      reasons,
      matchedIdentifiers: [],
      matchedSnippetLines: 0,
    });
  }
  return { kind: 'scored', events: sortEvents(events), renameProposals: [] };
}

function sortEvents(events: DriftEvent[]): DriftEvent[] {
  return events.sort((a, b) => b.score - a.score || a.pageId.localeCompare(b.pageId) || a.bindingId.localeCompare(b.bindingId));
}

/**
 * Scores one change record against the bindings of the affected repo or issue.
 *
 * Deterministic, no network and no LLM. For Bitbucket changes the score per binding is
 * `weight × match × (0.5 + 0.5 × magnitude)` over the strongest matching file, plus 0.3 if the page
 * mentions an identifier the change removed and 0.4 if a page code block contains a removed line
 * (boosts only after a path match), capped at 1. Jira changes score by the rules in detection.md.
 *
 * @param change a validated change record (see `parseChangeRecord` in `@dds/shared`)
 * @param bindings candidate bindings; ones for other repos or issues are ignored
 * @param pagesIndex page indexes by page ID, from `indexPages`
 * @param config threshold, ignore globs and branch policy; defaults to Balanced
 * @returns drift events at or above the threshold, strongest first, plus rename proposals;
 *   or a revert to close the reverted PR's events; or the reason the change was skipped
 */
export function scoreChange(
  change: ChangeRecord,
  bindings: readonly Binding[],
  pagesIndex: PagesIndex,
  config: Partial<MatcherConfig> = {},
): MatchResult {
  const resolved = resolveConfig(config);
  return change.source === 'bitbucket'
    ? scoreBitbucket(change, bindings, pagesIndex, resolved)
    : scoreJira(change, bindings, resolved);
}
