// Anchor suggestions for the binding modal. Pure apart from `checkedSuggestions` (one Jira read).
import { extractPageText, suggestAnchors, type SuggestedAnchor } from '@dds/matcher';
import { anchorKey } from './anchors';

type AnchorLike = { anchorType: string; repo?: string | null; pattern?: string | null; jiraKey?: string | null };

function looseKey(a: AnchorLike): string {
  return anchorKey({ ...a, repo: a.repo ? (a.repo.toLowerCase().split('/').at(-1) ?? '') : a.repo });
}

export interface SuggestionView {
  key: string;
  label: string;
  anchorType: SuggestedAnchor['anchorType'];
  repo?: string;
  pattern?: string;
  jiraKey?: string;
  evidence: SuggestedAnchor['evidence'];
  /** Paths found on a page that links no repo need a repo before they can be saved. */
  needsRepo: boolean;
}

/** Anchor suggestions from the page body, minus anchors the page already has. */
export function suggestionsFor(storage: string, existing: { anchorType: string; repo?: string; pattern?: string; jiraKey?: string }[]): SuggestionView[] {
  // Compare on the short repo name: `payments-api` and `nano-soft-dev/payments-api` are the same anchor.
  const have = new Set(existing.map(looseKey));
  return suggestAnchors(extractPageText(storage))
    .map((s) => {
      const repo = s.repo?.toLowerCase();
      const view: SuggestionView = {
        key: anchorKey({ anchorType: s.anchorType, repo, pattern: s.pattern, jiraKey: s.jiraKey }),
        label: s.label,
        anchorType: s.anchorType,
        ...(repo !== undefined && { repo }),
        ...(s.pattern !== undefined && { pattern: s.pattern }),
        ...(s.jiraKey !== undefined && { jiraKey: s.jiraKey }),
        evidence: s.evidence,
        needsRepo: (s.anchorType === 'path' || s.anchorType === 'glob') && repo === undefined,
      };
      return view;
    })
    .filter((s) => !have.has(looseKey(s)))
    // A path found on a page that links no repo: hide it when an anchor already watches that path.
    .filter((s) => !(s.needsRepo && existing.some((b) => b.pattern === s.pattern)))
    .slice(0, 30);
}


/**
 * UX observation 10: drops suggested Jira keys whose project is not on this site (`ARM-64`,
 * `COVID-19`). `projects` null means the list could not be read: keep every suggestion.
 */
export function withKnownProjects<T extends { anchorType: string; jiraKey?: string }>(list: T[], projects: Set<string> | null): T[] {
  if (!projects) return list;
  return list.filter((s) => s.anchorType !== 'jira' || projects.has((s.jiraKey ?? '').split('-')[0] ?? ''));
}

/** `suggestionsFor`, then drops look-alike Jira keys. Reads the project list only when a key was suggested. */
export async function checkedSuggestions(
  storage: string,
  existing: Parameters<typeof suggestionsFor>[1],
  projectKeys: () => Promise<Set<string> | null>,
): Promise<SuggestionView[]> {
  const list = suggestionsFor(storage, existing);
  return list.some((s) => s.anchorType === 'jira') ? withKnownProjects(list, await projectKeys()) : list;
}
