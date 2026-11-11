// User-visible strings for the byline badge. Pure: no Forge imports, unit-tested.
// Wording follows brand/voice-and-copy.md: calm, specific, digits, no exclamation marks,
// tooltips under 90 characters, and never "this page is wrong", only "its anchors changed".
import { PAGE_STATE_LABELS, type StoredPageState } from '@dds/shared';

/** The page content property the byline module reads (`contentPropertyKey` in the manifest). Raw key. */
export const BYLINE_PROPERTY_KEY = 'dds-byline-7f3c2a';

/** Hard limit from the copy rules. */
export const TOOLTIP_MAX = 89;

/**
 * What the byline property holds. Only `title` and `tooltip`: an `icon` set through the property
 * renders as the generic app hexagon (live browser test, 2026-11-11), while the manifest icon renders.
 * So the state lives in the title text and the tooltip.
 */
export interface BylineValue {
  title: string;
  tooltip: string;
}

/** Facts the tooltip is built from. Everything is optional except the state. */
export interface BylineFacts {
  state: StoredPageState;
  /** Number of anchors (bindings) on the page. */
  anchorCount?: number;
  /** When the page was last verified (epoch ms). */
  verifiedAt?: number;
  /** Open drift events on the page. */
  openEventCount?: number;
  /** The most recent open event, for the Possibly stale tooltip. */
  latest?: { ref: string; source: 'bitbucket' | 'jira'; files: string[]; at: number };
  /** Oldest open event (epoch ms), for the Stale tooltip. */
  oldestOpenAt?: number;
  /** Clock for "N days", injectable for tests. */
  now?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** `Nov 11`: an absolute date, because a stored property cannot keep "2h ago" current. UTC. */
export function shortDate(epochMs: number): string {
  const d = new Date(epochMs);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** `nano-soft-dev/payments-api#482` -> `PR #482`; a Jira key stays as is. */
export function refLabel(ref: string, source: 'bitbucket' | 'jira'): string {
  if (source === 'jira') return ref;
  const pr = ref.split('#').at(-1);
  return pr ? `PR #${pr}` : ref;
}

/** Trims to the tooltip limit on a word boundary. */
export function clampTooltip(text: string, max = TOOLTIP_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 40 ? cut.slice(0, space) : cut).replace(/[\s.,;:]+$/, '')}…`;
}

/**
 * Files to name in the tooltip. For an exact path anchor, name the anchored path (the one the page
 * documents), so a rename reads "changed scripts/rollback.sh", not the new name.
 */
export function displayFiles(matchedAnchor: string | null, files: string[]): string[] {
  const pattern = matchedAnchor?.split(': ').slice(1).join(': ');
  if (pattern && !/[*?[\]{}]/.test(pattern) && !pattern.endsWith('(whole repo)')) {
    return [pattern, ...files.slice(1)];
  }
  return files;
}

function possiblyStaleTooltip(f: BylineFacts): string {
  const latest = f.latest;
  if (!latest) return 'An anchor changed after the last verification. Review.';
  const who = refLabel(latest.ref, latest.source);
  const when = shortDate(latest.at);
  const more = (f.openEventCount ?? 1) > 1 ? ` (+${plural((f.openEventCount ?? 1) - 1, 'change')})` : '';
  if (latest.source === 'jira') return clampTooltip(`${who} changed on ${when}${more}. Review.`);
  const file = latest.files[0];
  const extraFiles = latest.files.length > 1 ? ` and ${plural(latest.files.length - 1, 'file')}` : '';
  if (!file) return clampTooltip(`${who} changed an anchor on ${when}${more}. Review.`);
  const full = `${who} changed ${file}${extraFiles} on ${when}${more}. Review.`;
  if (full.length <= TOOLTIP_MAX) return full;
  // Long paths: fall back to the file name.
  const base = file.split('/').at(-1) ?? file;
  return clampTooltip(`${who} changed ${base}${extraFiles} on ${when}${more}. Review.`);
}

function staleTooltip(f: BylineFacts): string {
  const n = f.openEventCount ?? 0;
  const changes = n > 0 ? ` (${plural(n, 'change')})` : '';
  const days =
    f.oldestOpenAt !== undefined && f.now !== undefined ? Math.floor((f.now - f.oldestOpenAt) / DAY_MS) : 0;
  const lead = days >= 1 ? `Unreviewed drift for ${plural(days, 'day')}${changes}.` : `Unreviewed drift${changes}.`;
  return clampTooltip(`${lead} Agents told not to trust this page.`);
}

function verifiedTooltip(f: BylineFacts): string {
  const watching = f.anchorCount !== undefined ? ` Watching ${plural(f.anchorCount, 'anchor')}.` : '';
  const when = f.verifiedAt !== undefined ? `Verified on ${shortDate(f.verifiedAt)}.` : 'Verified.';
  return clampTooltip(`${when}${watching}`);
}

/** Builds the byline content-property value for a page state. */
export function bylineValue(f: BylineFacts): BylineValue {
  const title = `Doc Drift: ${PAGE_STATE_LABELS[f.state]}`;
  switch (f.state) {
    case 'verified':
      return { title, tooltip: verifiedTooltip(f) };
    case 'possibly_stale':
      return { title, tooltip: possiblyStaleTooltip(f) };
    case 'stale':
      return { title, tooltip: staleTooltip(f) };
    case 'unanchored':
    default:
      return { title, tooltip: 'Not linked to code or Jira. Add anchors.' };
  }
}
