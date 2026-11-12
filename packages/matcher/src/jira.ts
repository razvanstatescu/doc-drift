import type { JiraChangeRecord, JiraFieldChange } from '@dds/shared';
import { JIRA_SCORES } from './config.js';

export interface JiraSignal {
  score: number;
  reason: string;
}

const WONT_DO = /^won['’]?t do$/i;

function isWontDo(value: string | null | undefined): boolean {
  return value != null && WONT_DO.test(value.trim());
}

/** Lowercases and drops spaces, `_` and `-`, so `Fix Version`, `fixVersions` and `fix_versions` compare equal. */
function fieldKey(field: string): string {
  return field.toLowerCase().replace(/[\s_-]/g, '');
}

function transition(item: JiraFieldChange): string {
  if (item.from && item.to) return ` (${item.from} to ${item.to})`;
  if (item.to) return ` (now ${item.to})`;
  return '';
}

function signalFor(item: JiraFieldChange, change: JiraChangeRecord): JiraSignal | undefined {
  const key = change.issueKey;
  switch (fieldKey(item.field)) {
    case 'status':
      if (isWontDo(item.to)) return { score: JIRA_SCORES.doneOrWontDo, reason: `${key} moved to Won't Do` };
      if (change.statusCategory === 'done') {
        return { score: JIRA_SCORES.doneOrWontDo, reason: `${key} moved to ${item.to ?? 'Done'}` };
      }
      return undefined;
    case 'resolution':
      return isWontDo(item.to) ? { score: JIRA_SCORES.doneOrWontDo, reason: `${key} resolved as Won't Do` } : undefined;
    case 'fixversion':
    case 'fixversions':
      return { score: JIRA_SCORES.fixVersionsOrComponents, reason: `${key} fix versions changed${transition(item)}` };
    case 'component':
    case 'components':
      return { score: JIRA_SCORES.fixVersionsOrComponents, reason: `${key} components changed${transition(item)}` };
    case 'parent':
    case 'parentlink':
    case 'epiclink':
    case 'issueparentassociation':
      return { score: JIRA_SCORES.parent, reason: `${key} moved to a different parent${transition(item)}` };
    case 'description':
      return { score: JIRA_SCORES.description, reason: `${key} description edited` };
    case 'summary':
      return { score: JIRA_SCORES.summary, reason: `${key} summary edited` };
    default:
      return undefined;
  }
}

/**
 * Jira rules (detection.md): Done or Won't Do 0.7, fix versions or components 0.6, parent 0.6,
 * description 0.5, summary 0.3. Returns every signal, strongest first. Signals do not add up:
 * the change scores as its strongest signal.
 */
export function jiraSignals(change: JiraChangeRecord): JiraSignal[] {
  // Jira sends a fix-version move as two items (`null → 2027.01`, `2026.12 → 2027.01`). Among equal
  // scores, an item with both values reads better ("2026.12 to 2027.01"), so it comes first.
  const both = (item: JiraFieldChange) => (item.from && item.to ? 1 : 0);
  return change.changelog
    .map((item) => ({ item, signal: signalFor(item, change) }))
    .filter((x): x is { item: JiraFieldChange; signal: JiraSignal } => x.signal !== undefined)
    .sort((a, b) => b.signal.score - a.signal.score || both(b.item) - both(a.item))
    .map((x) => x.signal);
}
