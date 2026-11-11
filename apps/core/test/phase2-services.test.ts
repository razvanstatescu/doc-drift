// Phase 2, Track A: service behaviour with Forge, Confluence and SQL mocked (the code under test is real).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const confluence = vi.hoisted(() => ({
  getPageInfo: vi.fn(),
  getPageStorage: vi.fn(),
  findPagesByTitle: vi.fn(),
}));
const db = vi.hoisted(() => ({
  ensureSchema: vi.fn(async () => undefined),
  bindingsForPage: vi.fn(async () => []),
  getEventFull: vi.fn(),
  getBinding: vi.fn(),
  eventDetailsForPage: vi.fn(async () => []),
}));

vi.mock('@forge/api', () => {
  const requester = { requestConfluence: vi.fn(), requestJira: vi.fn() };
  return {
    default: { asUser: () => requester, asApp: () => requester },
    NeedsAuthenticationError: class extends Error {},
    route: (s: TemplateStringsArray, ...v: unknown[]) => s.reduce((a, p, i) => a + p + (i < v.length ? String(v[i]) : ''), ''),
  };
});
vi.mock('@forge/kvs', () => ({ kvs: { get: vi.fn(async () => undefined), set: vi.fn(), getSecret: vi.fn(), setSecret: vi.fn() } }));
vi.mock('@forge/sql', () => ({ sql: { prepare: vi.fn() }, migrationRunner: { enqueue: vi.fn() } }));
vi.mock('@forge/events', () => ({ Queue: class { push = vi.fn(); } }));
vi.mock('../src/lib/confluence', async (orig) => ({ ...(await orig<object>()), ...confluence }));
vi.mock('../src/lib/db', async (orig) => ({ ...(await orig<object>()), ...db }));

import { resolvePage, type ToolDeps } from '../src/lib/agent-service';
import { submitFixProposal } from '../src/lib/fix-service';
import { markVerified, stopWatchingPath, type Gate } from '../src/lib/review-service';

const req = { requestConfluence: vi.fn() } as never;
const open: Gate = async () => null;
const viewOnly: Gate = async (_p, need, message) => (need === 'update' ? { ok: false, error: 'forbidden', message: message ?? 'needs edit' } : null);
const deps = (contextPageId: string | null = '3080280'): ToolDeps => ({ user: req, app: req, gate: open, accountId: 'u1', contextPageId });

beforeEach(() => vi.clearAllMocks());

describe('BUG-04: the page the user named, never the open page', () => {
  it('an unreadable link asks which page instead of using the Rovo context', async () => {
    const r = await resolvePage({ pageUrl: 'https://one-atlas-jzzf.atlassian.net/wiki/spaces/PLAT/overview' }, deps());
    expect(r).toMatchObject({ result: { ok: false, error: 'no_page', status: 'unknown', title: null, citePolicy: 'do_not_cite' } });
    expect(String((r as { result: { guidance: string } }).result.guidance)).toContain('Do not answer for the open page');
  });
  it('a title put in pageId is looked up as a title', async () => {
    confluence.findPagesByTitle.mockResolvedValueOnce({ status: 200, pages: [{ id: '2752731', title: 'DDS test: Payments rollback runbook' }] });
    expect(await resolvePage({ pageId: 'DDS test: Payments rollback runbook' }, deps())).toEqual({ pageId: '2752731', resolvedFrom: 'title' });
    expect(confluence.findPagesByTitle).toHaveBeenCalledWith(req, 'DDS test: Payments rollback runbook', 5);
  });
  it('a tiny link resolves to its page; the context is used only when nothing was named', async () => {
    confluence.getPageInfo.mockResolvedValueOnce({ status: 200, title: 'X', url: 'https://one-atlas-jzzf.atlassian.net/wiki/spaces/DDSTEST/pages/2752731/X' });
    expect(await resolvePage({ pageUrl: 'https://one-atlas-jzzf.atlassian.net/wiki/x/2wAq' }, deps())).toEqual({ pageId: '2752731', resolvedFrom: 'tinyUrl' });
    expect(await resolvePage({}, deps())).toEqual({ pageId: '3080280', resolvedFrom: 'context' });
  });
  it('a link to another site is refused (observation 9)', async () => {
    confluence.getPageInfo.mockResolvedValueOnce({ status: 200, title: 'Here', url: 'https://one-atlas-jzzf.atlassian.net/wiki/spaces/PLAT/pages/2720129/Here' });
    const r = await resolvePage({ pageUrl: 'https://other-site.atlassian.net/wiki/spaces/X/pages/2720129/T' }, deps());
    expect(r).toMatchObject({ result: { ok: false, error: 'other_site', title: null } });
  });
});

describe('BUG-12: drafting a fix needs edit rights', () => {
  it('a view-only user is refused before the page is read or a draft replaced', async () => {
    const r = await submitFixProposal('3080280', { blockId: 'b3', proposedText: 'x' }, { user: req, gate: viewOnly, accountId: 'viewer' });
    expect(r).toMatchObject({ ok: false, error: 'forbidden' });
    expect(String(r.guidance)).toContain('edit rights');
    expect(confluence.getPageStorage).not.toHaveBeenCalled();
    expect(db.eventDetailsForPage).not.toHaveBeenCalled();
  });
});

describe('Mark verified on an Unanchored page (observation 1)', () => {
  it('says there is nothing to verify instead of "Marked verified."', async () => {
    db.bindingsForPage.mockResolvedValueOnce([]);
    expect(await markVerified('1', 'u1', null, open)).toEqual({ ok: false, error: 'unanchored', message: 'This page has no anchors, so there is nothing to verify. Add anchors first.' });
  });
});

describe('stopWatchingPath (R-7)', () => {
  it('needs edit rights', async () => {
    db.getEventFull.mockResolvedValueOnce({ id: 'e1', pageId: 'p1', bindingId: 'b1', source: 'bitbucket', status: 'open', files: ['a.sh'], changeFiles: [] });
    expect(await stopWatchingPath('e1', 'u1', viewOnly)).toMatchObject({ ok: false, error: 'forbidden' });
    expect(db.getBinding).not.toHaveBeenCalled();
  });
  it('refuses Jira events and unknown events', async () => {
    db.getEventFull.mockResolvedValueOnce({ id: 'e2', pageId: 'p1', bindingId: 'b1', source: 'jira', status: 'open', files: [], changeFiles: [] });
    expect(await stopWatchingPath('e2', 'u1', open)).toMatchObject({ ok: false, error: 'bad_request' });
    db.getEventFull.mockResolvedValueOnce(undefined);
    expect(await stopWatchingPath('nope', 'u1', open)).toMatchObject({ ok: false, error: 'not_found' });
  });
});
