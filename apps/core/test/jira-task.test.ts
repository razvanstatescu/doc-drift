import { describe, expect, it, vi } from 'vitest';

vi.mock('@forge/api', () => ({
  route: (strings: TemplateStringsArray, ...values: unknown[]) => strings.reduce((acc, s, i) => acc + s + (i < values.length ? encodeURIComponent(String(values[i])) : ''), ''),
}));

import { cleanSummary, createTask, creatableProjects, defaultProject, defaultSummary, pickIssueType, siteBase, taskDescription } from '../src/lib/jira-task';
import { followUpView } from '../src/lib/review-service';

describe('defaultSummary', () => {
  it('names the page and the single change', () => {
    expect(defaultSummary('Refunds API guide', ['PR #482', 'PR #482'])).toBe('Update "Refunds API guide": anchors changed in PR #482');
  });
  it('counts several changes and clips to 255', () => {
    expect(defaultSummary('Runbook', ['PR #1', 'PAY-2'])).toBe('Update "Runbook": anchors changed in 2 changes');
    expect(defaultSummary('x'.repeat(300), ['PR #1']).length).toBe(255);
  });
});

describe('cleanSummary', () => {
  it('collapses whitespace and enforces 1 to 255 characters', () => {
    expect(cleanSummary('  Fix\nthe   page ')).toBe('Fix the page');
    expect(cleanSummary('   ')).toBeNull();
    expect(cleanSummary('a'.repeat(256))).toBeNull();
    expect(cleanSummary(42)).toBeNull();
  });
});

describe('defaultProject', () => {
  const projects = [
    { key: 'OPS', name: 'Operations' },
    { key: 'PAY', name: 'Payments' },
  ];
  it('prefers the project of a Jira anchor or event', () => {
    expect(defaultProject(projects, ['pay-142'])).toBe('PAY');
  });
  it('ignores keys of projects the user cannot create in, then falls back to the first', () => {
    expect(defaultProject(projects, ['HR-1', 'not a key'])).toBe('OPS');
    expect(defaultProject([], ['PAY-1'])).toBeNull();
  });
});

describe('pickIssueType', () => {
  it('picks Task, else the first standard type, never a subtask', () => {
    expect(pickIssueType([{ id: '1', name: 'Bug' }, { id: '2', name: 'Task' }])).toBe('2');
    expect(pickIssueType([{ id: '3', name: 'Sub-task', subtask: true }, { id: '4', name: 'Story' }])).toBe('4');
    expect(pickIssueType([{ id: '3', name: 'Sub-task', subtask: true }])).toBeNull();
  });
});

describe('taskDescription', () => {
  it('is ADF with the page link, the changes and the sections, as plain text nodes', () => {
    const adf = taskDescription({
      pageTitle: 'Refunds API guide',
      pageUrl: 'https://x.atlassian.net/wiki/pages/viewpage.action?pageId=1',
      events: [{ ref: 'PR #482', title: 'Rename rollback', whySentence: 'PR #482 renamed scripts/rollback.sh.' }],
      sections: ['Roll back', null, 'Roll back'],
    }) as { type: string; content: { type: string; content?: unknown[] }[] };
    expect(adf.type).toBe('doc');
    const json = JSON.stringify(adf);
    expect(json).toContain('"href":"https://x.atlassian.net/wiki/pages/viewpage.action?pageId=1"');
    expect(json).toContain('PR #482');
    expect(json.match(/Roll back/g)).toHaveLength(1);
    expect(json).toContain('does not mark the page Verified');
    // Untrusted page text stays a text node: no markup is interpreted.
    const evil = JSON.stringify(taskDescription({ pageTitle: '<b>x</b>', pageUrl: 'u', events: [], sections: ['[link](http://e)'] }));
    expect(evil).toContain('"text":"<b>x</b>"');
  });
  it('caps the list at 10 changes and says how many more', () => {
    const events = Array.from({ length: 12 }, (_, i) => ({ ref: `PR #${i}` }));
    expect(JSON.stringify(taskDescription({ pageTitle: 'p', pageUrl: 'u', events, sections: [] }))).toContain('and 2 more changes.');
  });
});

describe('createTask', () => {
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
  it('reads the issue types, then creates the task with the picked type', async () => {
    const calls: { path: string; body?: string }[] = [];
    const user = {
      requestJira: vi.fn(async (path: unknown, init?: { body?: string }) => {
        calls.push({ path: String(path), body: init?.body });
        return String(path).includes('createmeta') ? ok({ issueTypes: [{ id: '10', name: 'Task' }] }) : ok({ key: 'PAY-201' });
      }),
    };
    const res = await createTask(user as never, 'PAY', 'Update page', { type: 'doc', version: 1, content: [] });
    expect(res).toEqual({ ok: true, key: 'PAY-201' });
    expect(calls[0]!.path).toBe('/rest/api/3/issue/createmeta/PAY/issuetypes');
    expect(JSON.parse(calls[1]!.body!).fields).toMatchObject({ project: { key: 'PAY' }, issuetype: { id: '10' }, summary: 'Update page' });
  });
  it('reports a Jira refusal without throwing', async () => {
    const user = {
      requestJira: vi.fn(async (path: unknown) =>
        String(path).includes('createmeta') ? ok({ values: [{ id: '10', name: 'Task' }] }) : { ok: false, status: 403, json: async () => ({}), text: async () => 'no' },
      ),
    };
    expect(await createTask(user as never, 'PAY', 's', {})).toEqual({ ok: false, error: 'create_failed', status: 403 });
  });
});

describe('creatableProjects', () => {
  it('drops Product Discovery projects and malformed keys', async () => {
    const user = {
      requestJira: vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ values: [{ key: 'CX', name: 'Core', projectTypeKey: 'product_discovery' }, { key: 'PAY', name: 'Payments', projectTypeKey: 'software' }, { key: 'bad key' }] }),
        text: async () => '',
      })),
    };
    expect(await creatableProjects(user as never)).toEqual({ ok: true, projects: [{ key: 'PAY', name: 'Payments' }] });
  });
});

describe('links', () => {
  it('builds browse links only from an https site URL', () => {
    expect(siteBase('https://one.atlassian.net/')).toBe('https://one.atlassian.net');
    expect(siteBase('javascript:alert(1)')).toBe('');
    expect(followUpView('PAY-1', 'https://one.atlassian.net')).toEqual({ key: 'PAY-1', url: 'https://one.atlassian.net/browse/PAY-1' });
    expect(followUpView(null)).toBeNull();
    expect(followUpView('PAY-1')).toEqual({ key: 'PAY-1', url: null });
  });
});
