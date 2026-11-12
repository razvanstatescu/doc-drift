// "Create Jira task" (D35): a person turns a page's open drift into a Jira follow-up from the review
// panel. Created asUser (Jira enforces Create issues in the project), never by an agent, and never
// verifies the page: closing the task does not change the page state. The description carries the
// summary-level evidence only (D30: no diff hunks), built deterministically with no AI.
import { route } from '@forge/api';
import { plural } from './copy';

/** api.asUser(). */
export interface JiraRequester {
  requestJira: (path: ReturnType<typeof route>, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;
}

export const JIRA_MESSAGES = {
  unavailable: "Jira isn't available on this site, or you can't create work items in any project.",
  noOpenChanges: 'This page has no open changes to track.',
  badProject: 'Pick a Jira project.',
  badSummary: 'Write a summary of 1 to 255 characters.',
  noIssueType: "This project has no issue type a task can use. Pick another project.",
  createFailed: "Jira didn't create the work item. Check that you can create work items in this project.",
} as const;

export interface JiraProject {
  key: string;
  name: string;
}

export interface TaskEvent {
  ref: string;
  title?: string | null;
  whySentence?: string | null;
}

export interface TaskInput {
  pageTitle: string;
  pageUrl: string;
  events: TaskEvent[];
  sections: (string | null)[];
}

const PROJECT_KEY = /^[A-Z][A-Z0-9_]{0,63}$/;
const ISSUE_KEY = /^([A-Z][A-Z0-9_]*)-\d+$/;

/** "Update Refunds API guide: anchors changed in PR #482". Clipped to Jira's 255 characters. */
export function defaultSummary(pageTitle: string, refs: string[]): string {
  const unique = [...new Set(refs)];
  const what = unique.length === 1 ? unique[0]! : plural(unique.length, 'change');
  const s = `Update "${pageTitle.trim() || 'Untitled page'}": anchors changed in ${what}`;
  return s.length > 255 ? `${s.slice(0, 254)}…` : s;
}

/** Trims and checks a summary: one line, 1 to 255 characters. */
export function cleanSummary(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.replace(/\s+/g, ' ').trim();
  return s.length >= 1 && s.length <= 255 ? s : null;
}

/** The project a task should default to: one named by the page's Jira anchors or events, else the first. */
export function defaultProject(projects: JiraProject[], issueKeys: string[]): string | null {
  const keys = new Set(projects.map((p) => p.key));
  for (const k of issueKeys) {
    const m = ISSUE_KEY.exec(k.toUpperCase());
    if (m && keys.has(m[1]!)) return m[1]!;
  }
  return projects[0]?.key ?? null;
}

/** "Task" when the project has it, else the first standard (non-subtask) type. */
export function pickIssueType(types: { id: string; name: string; subtask?: boolean }[]): string | null {
  const standard = types.filter((t) => !t.subtask);
  return (standard.find((t) => t.name.toLowerCase() === 'task') ?? standard[0])?.id ?? null;
}

type Adf = Record<string, unknown>;
const text = (t: string, marks?: Adf[]): Adf => ({ type: 'text', text: t, ...(marks && { marks }) });
const para = (...content: Adf[]): Adf => ({ type: 'paragraph', content });
const item = (...content: Adf[]): Adf => ({ type: 'listItem', content: [para(...content)] });

/** The task description in Atlassian Document Format. Page text is copied as text, never as markup. */
export function taskDescription(input: TaskInput): Adf {
  const events = input.events.slice(0, 10);
  const sections = [...new Set(input.sections.filter((s): s is string => Boolean(s && s.trim())))].slice(0, 10);
  const content: Adf[] = [
    para(
      text('Doc Drift Sentinel flagged '),
      text(input.pageTitle || 'this page', [{ type: 'link', attrs: { href: input.pageUrl } }]),
      text(' as Possibly stale: code or work items it is anchored to changed.'),
    ),
  ];
  if (events.length) {
    content.push(para(text('What changed', [{ type: 'strong' }])));
    content.push({
      type: 'bulletList',
      content: events.map((e) => item(text(e.ref, [{ type: 'code' }]), text(` ${[e.title, e.whySentence].filter(Boolean).join(': ').slice(0, 600)}`))),
    });
    if (input.events.length > events.length) content.push(para(text(`and ${plural(input.events.length - events.length, 'more change')}.`)));
  }
  if (sections.length) {
    content.push(para(text('Sections to re-read', [{ type: 'strong' }])));
    content.push({ type: 'bulletList', content: sections.map((s) => item(text(s))) });
  }
  content.push(para(text('Closing this task does not mark the page Verified. When the page is up to date, open it and click Mark verified.')));
  return { type: 'doc', version: 1, content };
}

/** Projects the caller can create work items in (`action=create`), by name. */
export async function creatableProjects(user: JiraRequester): Promise<{ ok: true; projects: JiraProject[] } | { ok: false; status: number }> {
  const res = await user.requestJira(route`/rest/api/3/project/search?action=create&orderBy=name&maxResults=50`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { ok: false, status: res.status };
  const out = (await res.json()) as { values?: { key?: string; name?: string; projectTypeKey?: string }[] };
  // Product Discovery projects hold ideas, not tasks (live: the fallback type there is "Idea").
  const projects = (out.values ?? [])
    .filter((p) => p.key && PROJECT_KEY.test(p.key) && p.projectTypeKey !== 'product_discovery')
    .map((p) => ({ key: p.key!, name: p.name ?? p.key! }));
  return { ok: true, projects };
}

/** Creates the task asUser. Returns the new key or Jira's status. */
export async function createTask(user: JiraRequester, projectKey: string, summary: string, description: Adf): Promise<{ ok: true; key: string } | { ok: false; error: string; status?: number }> {
  const types = await user.requestJira(route`/rest/api/3/issue/createmeta/${projectKey}/issuetypes`, { headers: { Accept: 'application/json' } });
  if (!types.ok) return { ok: false, error: 'create_failed', status: types.status };
  const meta = (await types.json()) as { issueTypes?: { id: string; name: string; subtask?: boolean }[]; values?: { id: string; name: string; subtask?: boolean }[] };
  const typeId = pickIssueType(meta.issueTypes ?? meta.values ?? []);
  if (!typeId) return { ok: false, error: 'no_issue_type' };
  const res = await user.requestJira(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { project: { key: projectKey }, issuetype: { id: typeId }, summary, description } }),
  });
  if (!res.ok) {
    console.warn(`DDS_JIRA_TASK_FAILED status=${res.status} ${(await res.text()).slice(0, 300)}`);
    return { ok: false, error: 'create_failed', status: res.status };
  }
  const out = (await res.json()) as { key?: string };
  return out.key && ISSUE_KEY.test(out.key) ? { ok: true, key: out.key } : { ok: false, error: 'create_failed' };
}

/** `https://site.atlassian.net` from the resolver context, or '' when it isn't an https URL. */
export function siteBase(siteUrl: unknown): string {
  return typeof siteUrl === 'string' && /^https:\/\/[^/\s]+/.test(siteUrl) ? siteUrl.replace(/\/+$/, '') : '';
}

/**
 * Every Jira project key the requester can browse (up to 200), for filtering suggested keys.
 * null when Jira is not reachable or the read fails, so callers keep their suggestions.
 */
export async function jiraProjectKeys(requester: JiraRequester): Promise<Set<string> | null> {
  const keys = new Set<string>();
  try {
    for (let startAt = 0; startAt < 200; startAt += 50) {
      const res = await requester.requestJira(route`/rest/api/3/project/search?startAt=${startAt}&maxResults=50`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return startAt === 0 ? null : keys;
      const out = (await res.json()) as { values?: { key?: string }[]; isLast?: boolean };
      for (const p of out.values ?? []) if (p.key) keys.add(p.key.toUpperCase());
      if (out.isLast !== false) break;
    }
    return keys;
  } catch {
    return null;
  }
}
