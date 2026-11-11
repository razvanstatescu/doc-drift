import type { ExtractedPage } from './page-text.js';
import { normalizePath } from './paths.js';

/** An anchor proposed from page content, for the binding modal's checkboxes. */
export interface SuggestedAnchor {
  anchorType: 'path' | 'glob' | 'repo' | 'jira';
  /** `workspace/slug`. Set on repo anchors, and on paths when the page links exactly one repo. */
  repo?: string;
  pattern?: string;
  jiraKey?: string;
  evidence: 'repo_url' | 'code_block' | 'inline_code' | 'jira_key';
  /** Display label, for example `payments-api: scripts/rollback.sh`. */
  label: string;
}

const BITBUCKET_URL = /https?:\/\/bitbucket\.org\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/src\/[^/\s"'<>]+\/([^\s?#"'<>)]*))?/g;
const JIRA_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g;
/** Prefixes that look like Jira keys but are standards or encodings (`UTF-8`, `SHA-256`). */
const NOT_JIRA_PROJECTS = new Set(['UTF', 'SHA', 'ISO', 'RFC', 'HTTP', 'TLS', 'SSL', 'AES', 'RSA', 'CVE', 'IPV', 'ES']);
const PATH_CHARS = /^[A-Za-z0-9_.*-]+(?:\/[A-Za-z0-9_.*-]+)*\/?$/;
const HOST_LIKE = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const FILE_EXTENSION = /\.[A-Za-z0-9]{1,10}$/;
const SYSTEM_DIRS = new Set(['usr', 'bin', 'sbin', 'etc', 'var', 'tmp', 'dev', 'proc', 'opt', 'home', 'lib', 'sys', 'root', 'mnt', 'Users']);
const TOKEN_SPLIT = /[\s"'`()<>[\]{},;=|&]+/;

/**
 * Reads a token as a repo path or glob, or returns undefined if it does not look like one.
 * Tokens from prose and code need a slash; paths taken from repo URLs do not.
 */
function asRepoPath(token: string, requireSlash = true): { anchorType: 'path' | 'glob'; pattern: string } | undefined {
  const absolute = token.startsWith('/');
  const cleaned = token.replace(/[:.]+$/, '');
  const path = normalizePath(cleaned);
  if ((requireSlash && !path.includes('/')) || !PATH_CHARS.test(path)) return undefined;
  const segments = path.split('/');
  const first = segments[0] ?? '';
  if (segments.length > 1 && HOST_LIKE.test(first)) return undefined;
  if (absolute && SYSTEM_DIRS.has(first)) return undefined;
  if (path.endsWith('/')) return { anchorType: 'glob', pattern: `${path}**` };
  if (path.includes('*')) return { anchorType: 'glob', pattern: path };
  return FILE_EXTENSION.test(segments.at(-1) ?? '') ? { anchorType: 'path', pattern: path } : undefined;
}

function repoLabel(repo: string | undefined): string {
  return repo?.split('/').at(-1) ?? '';
}

/**
 * Suggests anchors from page content: Bitbucket repo and file URLs, repo paths in code blocks and
 * inline code, and Jira keys. Suggestions are proposals only; a person confirms them.
 */
export function suggestAnchors(page: ExtractedPage): SuggestedAnchor[] {
  const found = new Map<string, SuggestedAnchor>();
  const add = (s: SuggestedAnchor) => {
    const key = `${s.anchorType}|${s.repo ?? ''}|${s.pattern ?? s.jiraKey ?? ''}`;
    if (!found.has(key)) found.set(key, s);
  };

  const repos = new Set<string>();
  const urlText = [...page.links, page.text].join('\n');
  const urlPaths: { repo: string; path: string }[] = [];
  for (const [, workspace, slug, path] of urlText.matchAll(BITBUCKET_URL)) {
    if (!workspace || !slug) continue;
    const repo = `${workspace}/${slug}`;
    repos.add(repo);
    if (path) urlPaths.push({ repo, path });
  }
  const onlyRepo = repos.size === 1 ? [...repos][0] : undefined;

  for (const { repo, path } of urlPaths) {
    const p = asRepoPath(path.endsWith('/') || FILE_EXTENSION.test(path) ? path : `${path}/`, false);
    if (p) add({ ...p, repo, evidence: 'repo_url', label: `${repoLabel(repo)}: ${p.pattern}` });
  }
  const sources = [
    ['code_block', page.codeBlocks],
    ['inline_code', page.inlineCode],
  ] as const;
  for (const [evidence, texts] of sources) {
    for (const token of texts.flatMap((t) => t.split(TOKEN_SPLIT))) {
      if (token.includes('://')) continue;
      const p = asRepoPath(token);
      if (!p) continue;
      const label = onlyRepo ? `${repoLabel(onlyRepo)}: ${p.pattern}` : p.pattern;
      add({ ...p, ...(onlyRepo !== undefined && { repo: onlyRepo }), evidence, label });
    }
  }
  for (const [key] of page.text.matchAll(JIRA_KEY)) {
    if (!NOT_JIRA_PROJECTS.has(key.split('-')[0] ?? '')) add({ anchorType: 'jira', jiraKey: key, evidence: 'jira_key', label: key });
  }
  for (const repo of repos) add({ anchorType: 'repo', repo, evidence: 'repo_url', label: `${repoLabel(repo)} (whole repo)` });
  return [...found.values()];
}
