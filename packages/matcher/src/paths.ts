import picomatch from 'picomatch';
import type { BitbucketChangeRecord, Binding, ChangedFile } from '@dds/shared';
import { MATCH_STRENGTH } from './config.js';

type Matcher = (path: string) => boolean;

/** Strips `./` and leading slashes so `/deploy/helm/**` and `deploy/helm/**` mean the same thing. */
export function normalizePath(path: string): string {
  return path.trim().replace(/^(?:\.\/)+/, '').replace(/^\/+/, '');
}

/** Builds a predicate for ignore globs. Patterns without a slash match the file name at any depth. */
export function ignoreMatcher(globs: readonly string[]): Matcher {
  if (globs.length === 0) return () => false;
  const patterns = globs.map(normalizePath).map((g) => (g.includes('/') ? g : `**/${g}`));
  const isMatch = picomatch(patterns, { dot: true });
  return (path) => isMatch(normalizePath(path));
}

/** Longest glob accepted in settings and anchors. */
export const MAX_GLOB_LENGTH = 200;

/**
 * Checks one glob before it is saved (ignore globs in settings). Returns a short reason, or null when
 * the glob is usable: not empty, no whitespace, at most {@link MAX_GLOB_LENGTH} characters, and balanced
 * brackets, braces and parentheses (picomatch `strictBrackets`).
 */
export function validateGlob(glob: string): string | null {
  const g = normalizePath(glob);
  if (g.length === 0) return 'is empty';
  if (g.length > MAX_GLOB_LENGTH) return `is longer than ${MAX_GLOB_LENGTH} characters`;
  if (/\s/.test(g)) return 'has a space';
  try {
    picomatch.makeRe(g.includes('/') ? g : `**/${g}`, { dot: true, strictBrackets: true });
  } catch {
    return 'has an unclosed bracket, brace or parenthesis';
  }
  return null;
}

/** Caches compiled anchor globs for the duration of one scoring run. */
export class GlobCache {
  private readonly cache = new Map<string, Matcher>();

  get(pattern: string): Matcher {
    let m = this.cache.get(pattern);
    if (!m) {
      const isMatch = picomatch(normalizePath(pattern), { dot: true });
      // Wrap: picomatch's second parameter is `returnObject`, so never pass it through callbacks like `some`.
      m = (path) => isMatch(path);
      this.cache.set(pattern, m);
    }
    return m;
  }
}

/** True when a binding's `repo` names the change's repository (`workspace/slug`, `slug` or UUID). */
export function repoMatches(bindingRepo: string | undefined, change: BitbucketChangeRecord): boolean {
  if (!bindingRepo) return false;
  const want = bindingRepo.trim().toLowerCase();
  const uuid = change.repoUuid.toLowerCase();
  return (
    want === `${change.workspace}/${change.repoSlug}`.toLowerCase() ||
    want === change.repoSlug.toLowerCase() ||
    want === uuid ||
    `{${want}}` === uuid
  );
}

/**
 * Path match strength of one file against one binding: exact 1.0, glob 0.6, repo-wide 0.2, else 0.
 * A renamed file matches on its old path as well as its new one.
 */
export function pathMatchStrength(binding: Binding, file: ChangedFile, globs: GlobCache): number {
  const paths = [file.path, file.oldPath].filter((p): p is string => p !== undefined).map(normalizePath);
  switch (binding.anchorType) {
    case 'path': {
      const pattern = binding.pattern ? normalizePath(binding.pattern) : undefined;
      return pattern !== undefined && paths.includes(pattern) ? MATCH_STRENGTH.exact : 0;
    }
    case 'glob': {
      if (!binding.pattern) return 0;
      const isMatch = globs.get(binding.pattern);
      return paths.some(isMatch) ? MATCH_STRENGTH.glob : 0;
    }
    case 'repo':
      return MATCH_STRENGTH.repo;
    default:
      return 0;
  }
}
