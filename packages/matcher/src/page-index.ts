import { tokenize } from './identifiers.js';
import { extractPageText } from './page-text.js';
import { codeLineHashes } from './snippets.js';

/**
 * What the matcher needs to know about one page: token sets and code line hashes, no page body.
 * Build it with {@link indexPage}.
 */
export interface PageIndex {
  pageId: string;
  /** Identifier-like tokens in the title and all page text. */
  tokens: ReadonlySet<string>;
  /** Identifier-like tokens in code blocks and inline code only. */
  codeTokens: ReadonlySet<string>;
  /** Hashes of normalized code block lines. */
  codeLineHashes: ReadonlySet<string>;
}

export interface PageSource {
  pageId: string;
  title?: string;
  /** Page body in Confluence storage format. */
  storage: string;
}

/** Indexes a page body for identifier and snippet matching. */
export function indexPage(page: PageSource): PageIndex {
  const extracted = extractPageText(page.storage);
  const code = [...extracted.codeBlocks, ...extracted.inlineCode].join('\n');
  return {
    pageId: page.pageId,
    tokens: new Set(tokenize(`${page.title ?? ''}\n${extracted.text}`)),
    codeTokens: new Set(tokenize(code)),
    codeLineHashes: codeLineHashes(extracted.codeBlocks),
  };
}

/** Indexes several pages into the map {@link scoreChange} expects. */
export function indexPages(pages: readonly PageSource[]): Map<string, PageIndex> {
  return new Map(pages.map((p) => [p.pageId, indexPage(p)]));
}
