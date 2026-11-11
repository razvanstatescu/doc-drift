// Anchor (binding) input validation and identity. Pure: no Forge imports, unit-tested.
import type { AnchorType, AnchorWeight, BitbucketChangeRecord, Binding } from '@dds/shared';

/** What the binding modal sends for one anchor (manual entry or an accepted suggestion). */
export interface AnchorInput {
  anchorType?: string;
  repo?: string;
  pattern?: string;
  jiraKey?: string;
  weight?: string;
}

/** A validated anchor, ready to store. `repo` is lowercased; `pattern` has no leading `./` or `/`. */
export interface NormalizedAnchor {
  anchorType: Exclude<AnchorType, 'page'>;
  repo?: string;
  pattern?: string;
  jiraKey?: string;
  weight: AnchorWeight;
}

export type AnchorResult = { ok: true; value: NormalizedAnchor } | { ok: false; error: string };

const REPO = /^(?:[a-z0-9_.-]+\/)?[a-z0-9_.-]+$|^\{[0-9a-f-]{36}\}$/;
const JIRA_KEY = /^[A-Z][A-Z0-9]+-\d+$/;
const GLOB_CHARS = /[*?[\]{}]/;
const PATTERN_CHARS = /^[A-Za-z0-9_.*?/{}[\],@+=~-]+$/;
const MAX_PATTERN = 512;

/** Strips `./` and leading slashes, like the matcher does. */
export function normalizePattern(pattern: string): string {
  return pattern.trim().replace(/^(?:\.\/)+/, '').replace(/^\/+/, '');
}

/** Accepts `payments-api`, `nano-soft-dev/payments-api`, a `{uuid}` or a Bitbucket repo URL. */
export function normalizeRepo(repo: string): string {
  const trimmed = repo.trim().toLowerCase();
  const url = /^https?:\/\/bitbucket\.org\/([a-z0-9_.-]+)\/([a-z0-9_.-]+)/.exec(trimmed);
  return url ? `${url[1]}/${url[2]}` : trimmed.replace(/\/+$/, '');
}

/**
 * Validates one anchor. Paths with glob characters become `glob` anchors; a path anchor
 * without a pattern is refused (use the whole-repo type for that).
 */
export function normalizeAnchor(input: AnchorInput): AnchorResult {
  const weight: AnchorWeight = input.weight === 'critical' ? 'critical' : 'normal';
  if (input.weight !== undefined && input.weight !== 'critical' && input.weight !== 'normal') {
    return { ok: false, error: 'Weight must be Critical or Normal.' };
  }
  const type = input.anchorType ?? 'path';

  if (type === 'jira') {
    const key = (input.jiraKey ?? input.pattern ?? '').trim().toUpperCase();
    if (!JIRA_KEY.test(key)) return { ok: false, error: 'Enter a Jira issue key, for example PAY-142.' };
    return { ok: true, value: { anchorType: 'jira', jiraKey: key, weight } };
  }

  const repo = normalizeRepo(input.repo ?? '');
  if (!repo) return { ok: false, error: 'Enter a repository, for example payments-api.' };
  if (!REPO.test(repo)) return { ok: false, error: 'Use workspace/repo or the repo slug, for example payments-api.' };

  if (type === 'repo') return { ok: true, value: { anchorType: 'repo', repo, weight } };
  if (type !== 'path' && type !== 'glob') return { ok: false, error: 'Unknown anchor type.' };

  const pattern = normalizePattern(input.pattern ?? '');
  if (!pattern) return { ok: false, error: 'Enter an anchor path, for example scripts/rollback.sh.' };
  if (pattern.length > MAX_PATTERN) return { ok: false, error: 'That path is too long.' };
  if (!PATTERN_CHARS.test(pattern) || pattern.split('/').includes('..')) {
    return { ok: false, error: 'Use a repo-relative path without spaces or "..".' };
  }
  const anchorType = GLOB_CHARS.test(pattern) ? 'glob' : 'path';
  return { ok: true, value: { anchorType, repo, pattern, weight } };
}

/** Identity of an anchor on a page, ignoring weight. Two anchors with the same key are the same anchor. */
export function anchorKey(a: { anchorType: string; repo?: string | null; pattern?: string | null; jiraKey?: string | null }): string {
  return [a.anchorType, a.repo ?? '', a.pattern ?? '', a.jiraKey ?? ''].join('|');
}

/** Display label, matching the matcher's `matchedAnchor`: `payments-api: scripts/rollback.sh`. */
export function anchorLabel(a: { anchorType: string; repo?: string | null; pattern?: string | null; jiraKey?: string | null }): string {
  const shortRepo = (a.repo ?? '').split('/').at(-1) ?? '';
  if (a.anchorType === 'jira') return a.jiraKey ?? '';
  if (a.anchorType === 'repo') return `${shortRepo} (whole repo)`;
  return `${shortRepo}: ${a.pattern ?? ''}`;
}

/**
 * Lowercased repo identifiers a binding may use for this change: `workspace/slug`, `slug`,
 * `{uuid}` and the bare uuid. Used for the indexed `binding.repo IN (...)` lookup.
 */
export function repoCandidates(change: Pick<BitbucketChangeRecord, 'workspace' | 'repoSlug' | 'repoUuid'>): string[] {
  const uuid = change.repoUuid.toLowerCase();
  const bare = uuid.replace(/^\{|\}$/g, '');
  return [...new Set([`${change.workspace}/${change.repoSlug}`.toLowerCase(), change.repoSlug.toLowerCase(), uuid, bare, `{${bare}}`])];
}

/** Plans a replace-all save: which stored bindings to keep (maybe with a new weight), delete, and insert. */
export function planBindingChanges(
  existing: readonly Binding[],
  desired: readonly NormalizedAnchor[],
): { insert: NormalizedAnchor[]; remove: Binding[]; reweight: { id: string; weight: AnchorWeight }[] } {
  const want = new Map(desired.map((a) => [anchorKey(a), a]));
  const have = new Map(existing.map((b) => [anchorKey(b), b]));
  const insert = [...want.entries()].filter(([k]) => !have.has(k)).map(([, a]) => a);
  const remove = [...have.entries()].filter(([k]) => !want.has(k)).map(([, b]) => b);
  const reweight = [...have.entries()]
    .filter(([k, b]) => want.has(k) && want.get(k)!.weight !== b.weight)
    .map(([k, b]) => ({ id: b.id, weight: want.get(k)!.weight }));
  return { insert, remove, reweight };
}
