// Affected section excerpts (polish item 6). The resolver flattens a section's text, code blocks
// included, into one line. These helpers put the matched code back in code style: a whole command
// becomes its own code line, a lone path inside a sentence becomes inline code. If the resolver
// sends `codeLines` (the section's code lines that contain a token), those are used as is.
// No Forge imports, so Vitest covers them (test/frontend-excerpt.test.ts).
import { splitExcerpt } from './format';

export interface InlinePart {
  text: string;
  kind: 'text' | 'match' | 'code';
}

export type ExcerptBlock = { type: 'prose'; parts: InlinePart[] } | { type: 'code'; text: string };

/** Commands that start a code line when they sit right before a code-like word (`export X=1`). */
const COMMANDS = new Set([
  'export', 'sudo', 'kubectl', 'helm', 'bash', 'sh', 'zsh', 'git', 'npm', 'pnpm', 'yarn', 'npx', 'node',
  'python', 'python3', 'pip', 'curl', 'docker', 'make', 'cd', 'terraform', 'aws', 'gcloud', 'go', 'cargo',
]);

const MAX_RUN_WORDS = 12;
const TRAILING_PUNCT = /[.,;:!?)\]]+$/;
const SENTENCE_END = /(^|[.:!?…])$/;

/** A path, flag, assignment, variable, file name or CONSTANT_NAME. Plain words and numbers are not code. */
export function isCodeWord(word: string): boolean {
  const w = word.replace(/^[("'`]+/, '').replace(/["'`]+$/, '');
  if (w.length < 2) return false;
  if (/^--?[A-Za-z]/.test(w)) return true;
  if (/[/=$_{}<>|]/.test(w)) return true;
  // File names and dotted names: `values.yaml`, `rollback.sh`, `payments.svc`. Not "e.g" or "i.e".
  if (/^[\w.-]*[A-Za-z0-9]\.[A-Za-z][\w.-]*$/.test(w) && !/^[a-z]\.[a-z]$/i.test(w.replace(/\.$/, ''))) return true;
  return false;
}

interface Word {
  start: number;
  end: number; // exclusive, after any trailing punctuation is trimmed
  core: string;
  punct: boolean; // trailing punctuation was trimmed (ends a clause)
}

function wordAt(text: string, start: number, end: number): Word {
  const raw = text.slice(start, end);
  const m = raw.match(TRAILING_PUNCT);
  const cut = m && m[0].length < raw.length ? m[0].length : 0;
  return { start, end: end - cut, core: raw.slice(0, raw.length - cut), punct: cut > 0 };
}

/** The whitespace-delimited word that contains [from, to). */
function wordAround(text: string, from: number, to: number): Word {
  let s = from;
  let e = to;
  while (s > 0 && !/\s/.test(text[s - 1]!)) s--;
  while (e < text.length && !/\s/.test(text[e]!)) e++;
  return wordAt(text, s, e);
}

function nextWord(text: string, pos: number): Word | null {
  let s = pos;
  while (s < text.length && /\s/.test(text[s]!)) s++;
  if (s >= text.length) return null;
  let e = s;
  while (e < text.length && !/\s/.test(text[e]!)) e++;
  return wordAt(text, s, e);
}

function prevWord(text: string, pos: number): Word | null {
  let e = pos;
  while (e > 0 && /\s/.test(text[e - 1]!)) e--;
  if (e <= 0) return null;
  let s = e;
  while (s > 0 && !/\s/.test(text[s - 1]!)) s--;
  return wordAt(text, s, e);
}

function prose(text: string): ExcerptBlock[] {
  return text.trim() ? [{ type: 'prose', parts: [{ text, kind: 'text' }] }] : [];
}

/** The excerpt with the first matched token emphasised, and the code around it in code style. */
function heuristicBlocks(excerpt: string, tokens: string[]): ExcerptBlock[] {
  const parts = splitExcerpt(excerpt, tokens, 1);
  const i = parts.findIndex((p) => p.match);
  if (i < 0) return prose(excerpt);
  const from = parts.slice(0, i).reduce((n, p) => n + p.text.length, 0);
  const to = from + parts[i]!.text.length;

  const hit = wordAround(excerpt, from, to);
  // A token that is not code (a Jira key, a plain word) keeps the bold emphasis.
  if (!isCodeWord(hit.core) || hit.end < to) {
    return [{ type: 'prose', parts: parts.map((p) => ({ text: p.text, kind: p.match ? 'match' : 'text' })) }];
  }

  let start = hit.start;
  let end = hit.end;
  let words = 1;
  // Right: flags, paths and variables that follow (`--timeout $ROLLBACK_TIMEOUT`).
  if (!hit.punct) {
    for (let w = nextWord(excerpt, end); w && words < MAX_RUN_WORDS && isCodeWord(w.core); w = nextWord(excerpt, end)) {
      end = w.end;
      words++;
      if (w.punct) break;
    }
  }
  // Left: code-like words and a leading command (`export ROLLBACK_TIMEOUT=300`), never across a full stop.
  for (let w = prevWord(excerpt, start); w && words < MAX_RUN_WORDS && !w.punct; w = prevWord(excerpt, start)) {
    if (!isCodeWord(w.core) && !COMMANDS.has(w.core)) break;
    start = w.start;
    words++;
  }

  const before = excerpt.slice(0, start);
  const run = excerpt.slice(start, end);
  const after = excerpt.slice(end);
  const ownLine = words >= 2 && SENTENCE_END.test(before.trimEnd());
  if (ownLine) return [...prose(before), { type: 'code', text: run }, ...prose(after)];
  return [
    {
      type: 'prose',
      parts: [
        ...(before ? [{ text: before, kind: 'text' as const }] : []),
        { text: run, kind: 'code' as const },
        ...(after ? [{ text: after, kind: 'text' as const }] : []),
      ],
    },
  ];
}

const flatten = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Uses the resolver's code lines: each one found in the excerpt is cut out and shown in code style. */
function codeLineBlocks(excerpt: string, tokens: string[], codeLines: string[]): ExcerptBlock[] {
  const found: { index: number; length: number; line: string }[] = [];
  const missing: string[] = [];
  for (const line of codeLines) {
    const flat = flatten(line);
    if (!flat) continue;
    const index = excerpt.indexOf(flat);
    if (index >= 0 && !found.some((f) => index < f.index + f.length && f.index < index + flat.length)) {
      found.push({ index, length: flat.length, line: line.trim() });
    } else missing.push(line.trim());
  }
  found.sort((a, b) => a.index - b.index);

  const out: ExcerptBlock[] = [];
  let last = 0;
  let emphasised = false;
  const pushProse = (text: string) => {
    if (!text.trim()) return;
    const parts: InlinePart[] = emphasised
      ? [{ text, kind: 'text' }]
      : splitExcerpt(text, tokens, 1).map((p) => ({ text: p.text, kind: p.match ? 'match' : 'text' }));
    if (parts.some((p) => p.kind === 'match')) emphasised = true;
    out.push({ type: 'prose', parts });
  };
  const pushCode = (line: string) => {
    const prev = out.at(-1);
    if (prev?.type === 'code') prev.text = `${prev.text}\n${line}`;
    else out.push({ type: 'code', text: line });
  };
  for (const f of found) {
    // A whitespace-only gap pushes no prose, so neighbouring code lines share one block.
    pushProse(excerpt.slice(last, f.index));
    pushCode(f.line);
    last = f.index + f.length;
  }
  pushProse(excerpt.slice(last));
  for (const line of missing) if (line) pushCode(line);
  return out;
}

/**
 * Blocks for one affected section: prose runs (with at most one emphasis) and code lines.
 * One emphasis per section keeps to the brand's one-slip-per-view rule.
 */
export function excerptBlocks(excerpt: string, tokens: string[], codeLines?: string[] | null): ExcerptBlock[] {
  if (!excerpt && !codeLines?.length) return [];
  if (codeLines?.length) return codeLineBlocks(excerpt || '', tokens, codeLines);
  return heuristicBlocks(excerpt, tokens);
}
