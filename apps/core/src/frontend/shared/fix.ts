// Pure helpers for the Propose fix flow (F11, D6): the Rovo prompt, the bridge payload, the two-line
// diff and the proposal copy. No Forge imports, so Vitest covers them (test/frontend-fix.test.ts).
// Agents never write pages: the prompt tells Drift Reviewer to draft only, and the page changes
// only when a person clicks Accept fix.
import { refLabel } from './format';

export const PROPOSE_FIX_HELP = 'Drift Reviewer drafts the change. Nothing changes until you accept it.';
export const FIX_NOT_FOUND_TITLE = 'This section changed since the draft.';
export const FIX_NOT_FOUND_BODY = 'Ask Drift Reviewer for a new draft.';

const TITLE_MAX = 120;

/** One line, trimmed and capped: a page title is untrusted text, so it never adds lines to the prompt. */
export function promptTitle(title: string | null | undefined): string {
  const flat = String(title ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').replace(/"/g, "'").trim();
  return flat.length > TITLE_MAX ? `${flat.slice(0, TITLE_MAX - 1).trimEnd()}…` : flat;
}

/** The prompt that opens Drift Reviewer from the review panel. */
export function fixPrompt(title: string | null | undefined, pageId: string): string {
  const t = promptTitle(title);
  const page = t ? `page "${t}" (id ${pageId})` : `page id ${pageId}`;
  return `Draft a fix for the drifted sections of ${page}. Use get-drift-context, then submit-fix-proposal once per changed block. Do not edit the page.`;
}

export interface RovoForgePayload {
  type: 'forge';
  agentName: string;
  agentKey: string;
  prompt: string;
}

/**
 * `rovo.open()` payload from the `getRovoAgentInfo` resolver result. Accepts `{agentName, agentKey}`,
 * `{name, key}` or `{agent: {...}}`. Null when the resolver failed or names no agent.
 */
export function rovoOpenPayload(info: unknown, prompt: string): RovoForgePayload | null {
  if (!info || typeof info !== 'object') return null;
  const r = info as Record<string, unknown>;
  if (r.ok === false || r.error) return null;
  const a = (r.agent && typeof r.agent === 'object' ? r.agent : r) as Record<string, unknown>;
  const agentName = a.agentName ?? a.name;
  const agentKey = a.agentKey ?? a.key;
  if (typeof agentName !== 'string' || typeof agentKey !== 'string' || !agentName || !agentKey) return null;
  return { type: 'forge', agentName, agentKey, prompt };
}

function lines(text: string | null | undefined): string[] {
  const t = String(text ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '');
  return t === '' ? [] : t.split('\n');
}

/** "- original" and "+ proposed", one prefix per line, for a `diff` CodeBlock. */
export function diffText(originalText: string | null | undefined, proposedText: string | null | undefined): string {
  return [...lines(originalText).map((l) => `- ${l}`), ...lines(proposedText).map((l) => `+ ${l}`)].join('\n');
}

export interface ProposalView {
  id: string;
  eventIds?: string[];
  sectionHeading?: string;
  blockId?: string | null;
  blockKind?: string | null;
  originalText?: string;
  proposedText?: string;
  rationale?: string;
  createdBy?: { accountId?: string; displayName?: string } | null;
  createdAt?: number;
  status?: string;
}

export interface EventRef {
  id: string;
  source: string;
  ref: string;
}

/** Open proposals, newest first. */
export function openProposals<T extends ProposalView>(proposals: T[] | null | undefined): T[] {
  return (proposals ?? []).filter((p) => p && p.status === 'open').sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export interface ProposalGroup<T> {
  key: string;
  heading: string;
  proposals: T[];
}

function blockOrder(p: ProposalView): number {
  const m = /^b(\d+)$/.exec(String(p.blockId ?? ''));
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Drafts grouped by section heading (D29: one draft per block, so a section can have several). Groups
 * keep the order of their newest draft; inside a group, drafts follow the page (block order).
 */
export function groupBySection<T extends ProposalView>(proposals: T[] | null | undefined): ProposalGroup<T>[] {
  const groups = new Map<string, ProposalGroup<T>>();
  for (const p of proposals ?? []) {
    const heading = p.sectionHeading ?? '';
    const key = heading.trim().toLowerCase();
    const g = groups.get(key) ?? { key, heading, proposals: [] };
    g.proposals.push(p);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ ...g, proposals: [...g.proposals].sort((a, b) => blockOrder(a) - blockOrder(b)) }));
}

/**
 * All drafts in page order (block order across the page), for the footer "Accept fix", which accepts
 * them one by one. Drafts without a block ID (older than D29) go last, oldest first.
 */
export function pageOrder<T extends ProposalView>(proposals: T[] | null | undefined): T[] {
  return [...(proposals ?? [])].sort((a, b) => blockOrder(a) - blockOrder(b) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

/** "A", "A and B", "A, B and C". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** "PR #482", "PR #482 and PAY-142", or null when no event of the proposal is known. */
export function proposalSource(p: Pick<ProposalView, 'eventIds'>, events: EventRef[] | null | undefined): string | null {
  const byId = new Map((events ?? []).map((e) => [String(e.id), e]));
  const refs: string[] = [];
  for (const id of p.eventIds ?? []) {
    const e = byId.get(String(id));
    if (!e) continue;
    const label = refLabel(e.ref, e.source);
    if (!refs.includes(label)) refs.push(label);
  }
  return refs.length ? joinList(refs) : null;
}

/** "Drafted by Drift Reviewer from PR #482. Nothing changes until you accept." */
export function fixAttribution(source: string | null): string {
  return `Drafted by Drift Reviewer${source ? ` from ${source}` : ''}. Nothing changes until you accept.`;
}

/** "Accepted. A new page version names PR #482." */
export function acceptedTitle(source: string | null): string {
  return source ? `Accepted. A new page version names ${source}.` : 'Accepted. The page has a new version.';
}
