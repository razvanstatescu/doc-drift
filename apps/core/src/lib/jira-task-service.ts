// D35 service: the options for the "Create Jira task" form and the create itself. View rights on the
// page are enough (like Mark verified): the task is created asUser, so Jira decides who may create it.
// Linking the open events to the new key is app metadata, written only after the asUser create worked.
import { bindingsForPage, ensureSchema, openEventsForPage, setFollowUp } from './db';
import { pageDrift, type Gate } from './review-service';
import {
  JIRA_MESSAGES,
  cleanSummary,
  createTask,
  creatableProjects,
  defaultProject,
  defaultSummary,
  taskDescription,
  type JiraRequester,
} from './jira-task';

type Requester = Parameters<typeof pageDrift>[1];

export interface JiraTaskDeps {
  user: Requester & JiraRequester;
  app: Requester;
  gate: Gate;
  siteBase: string;
}

const fail = (error: string, message: string) => ({ ok: false as const, error, message });

/** The summary-level drift for the task text (D30: never hunks), read as the clicking user. */
async function driftFor(pageId: string, deps: JiraTaskDeps) {
  return (await pageDrift(pageId, deps.user, { canEdit: false, appReader: deps.app, siteBase: deps.siteBase })) as {
    title?: string;
    events?: { id: string; ref: string; title?: string | null; whySentence?: string | null; issueKey?: string | null }[];
    affectedSections?: { heading?: string | null }[];
    followUps?: { key: string; url: string | null }[];
  };
}

function pageUrl(siteBase: string, pageId: string): string {
  return `${siteBase}/wiki/pages/viewpage.action?pageId=${encodeURIComponent(pageId)}`;
}

export async function jiraTaskOptions(pageId: string, deps: JiraTaskDeps) {
  const denied = await deps.gate(pageId, 'read');
  if (denied) return denied;
  await ensureSchema();
  const [drift, bindings] = await Promise.all([driftFor(pageId, deps), bindingsForPage(pageId)]);
  const events = drift.events ?? [];
  if (events.length === 0) return fail('no_open_changes', JIRA_MESSAGES.noOpenChanges);
  const projects = await creatableProjects(deps.user);
  if (!projects.ok || projects.projects.length === 0) {
    console.log(`DDS_JIRA_UNAVAILABLE pageId=${pageId} status=${projects.ok ? 'empty' : projects.status}`);
    return fail('jira_unavailable', JIRA_MESSAGES.unavailable);
  }
  const hints = [
    ...bindings.map((b) => b.jiraKey ?? '').filter(Boolean),
    ...events.map((e) => e.issueKey ?? (/^[A-Z][A-Z0-9_]*-\d+$/.test(e.ref) ? e.ref : '')).filter(Boolean),
  ];
  return {
    ok: true as const,
    projects: projects.projects,
    defaultProject: defaultProject(projects.projects, hints),
    summary: defaultSummary(drift.title ?? '', events.map((e) => e.ref)),
    changeCount: events.length,
    followUps: drift.followUps ?? [],
  };
}

export async function createJiraTask(pageId: string, rawProject: unknown, rawSummary: unknown, deps: JiraTaskDeps) {
  const denied = await deps.gate(pageId, 'read');
  if (denied) return denied;
  const projectKey = typeof rawProject === 'string' ? rawProject.trim().toUpperCase() : '';
  if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(projectKey)) return fail('bad_project', JIRA_MESSAGES.badProject);
  const summary = cleanSummary(rawSummary);
  if (!summary) return fail('bad_summary', JIRA_MESSAGES.badSummary);
  await ensureSchema();
  const drift = await driftFor(pageId, deps);
  const events = drift.events ?? [];
  if (events.length === 0) return fail('no_open_changes', JIRA_MESSAGES.noOpenChanges);
  const description = taskDescription({
    pageTitle: drift.title ?? '',
    pageUrl: pageUrl(deps.siteBase, pageId),
    events: events.map((e) => ({ ref: e.ref, title: e.title ?? null, whySentence: e.whySentence ?? null })),
    sections: (drift.affectedSections ?? []).map((s) => s.heading ?? null),
  });
  const created = await createTask(deps.user, projectKey, summary, description);
  if (!created.ok) {
    console.log(`DDS_JIRA_TASK_ERROR pageId=${pageId} error=${created.error} status=${created.status ?? ''}`);
    return fail(created.error, created.error === 'no_issue_type' ? JIRA_MESSAGES.noIssueType : JIRA_MESSAGES.createFailed);
  }
  // Link the changes that were open when the person clicked (snoozed ones too).
  const open = await openEventsForPage(pageId);
  const linked = await setFollowUp(pageId, open.map((e) => e.id), created.key);
  console.log(`DDS_JIRA_TASK_CREATED pageId=${pageId} key=${created.key} linked=${linked}`);
  return {
    ok: true as const,
    key: created.key,
    url: deps.siteBase ? `${deps.siteBase}/browse/${encodeURIComponent(created.key)}` : null,
    linked,
  };
}
