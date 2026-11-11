// M4 finding: consent mapping (D21) and the permission gates (D15, D20, M3). Forge modules and the
// Confluence/SQL helpers are mocked; the code under test is the real gate, actions and services.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const confluence = vi.hoisted(() => ({
  pageOperations: vi.fn(),
  getPageMeta: vi.fn(),
}));
const tools = vi.hoisted(() => ({ checkPageFreshness: vi.fn() }));
const db = vi.hoisted(() => ({ getEvent: vi.fn(), ensureSchema: vi.fn(async () => undefined) }));

vi.mock('@forge/api', () => {
  class NeedsAuthenticationError extends Error {
    constructor() {
      super('needs auth');
      this.name = 'NEEDS_AUTHENTICATION_ERR';
    }
  }
  const requester = { requestConfluence: vi.fn(), requestJira: vi.fn() };
  return {
    default: { asUser: () => requester, asApp: () => requester },
    NeedsAuthenticationError,
    route: (s: TemplateStringsArray, ...v: unknown[]) => s.reduce((a, p, i) => a + p + (i < v.length ? String(v[i]) : ''), ''),
  };
});
vi.mock('@forge/kvs', () => ({ kvs: { get: vi.fn(async () => undefined), set: vi.fn(), getSecret: vi.fn(), setSecret: vi.fn() } }));
vi.mock('@forge/sql', () => ({ sql: { prepare: vi.fn() }, migrationRunner: { enqueue: vi.fn() } }));
vi.mock('@forge/events', () => ({ Queue: class { push = vi.fn(); } }));
vi.mock('../src/lib/confluence', async (orig) => ({ ...(await orig<object>()), ...confluence }));
vi.mock('../src/lib/agent-service', async (orig) => ({ ...(await orig<object>()), ...tools }));
vi.mock('../src/lib/db', async (orig) => ({ ...(await orig<object>()), ...db }));

import { checkPageFreshness } from '../src/actions';
import { makeGate } from '../src/lib/access';
import { dismissEvent, MESSAGES, snoozePage, type Gate } from '../src/lib/review-service';
import { devDriver } from '../src/triggers/dev-driver';

const user = { requestConfluence: vi.fn() } as never;
const app = { requestConfluence: vi.fn() } as never;

beforeEach(() => {
  vi.clearAllMocks();
  confluence.getPageMeta.mockResolvedValue({ status: 200 });
});

describe('consent mapping (D21)', () => {
  it('maps NEEDS_AUTHENTICATION_ERR to consent_required', async () => {
    const { NeedsAuthenticationError } = await import('@forge/api');
    tools.checkPageFreshness.mockRejectedValueOnce(new (NeedsAuthenticationError as unknown as new () => Error)());
    const r = await checkPageFreshness({ pageId: '123' }, { accountId: 'u1' });
    expect(r).toMatchObject({ ok: false, error: 'consent_required', status: 'unknown', title: null, pageId: '123' });
    expect(String(r.guidance)).toContain('Connected apps');
  });

  it('maps an error only named NEEDS_AUTHENTICATION_ERR the same way, without echoing a bad page ID', async () => {
    const e = Object.assign(new Error('x'), { name: 'NEEDS_AUTHENTICATION_ERR' });
    tools.checkPageFreshness.mockRejectedValueOnce(e);
    expect(await checkPageFreshness({ pageId: 'not-a-number' }, undefined)).toMatchObject({ error: 'consent_required', pageId: null });
  });

  it('maps other errors to a generic failure that says not to trust the page', async () => {
    tools.checkPageFreshness.mockRejectedValueOnce(new Error('boom'));
    const r = await checkPageFreshness({ pageId: '1' }, undefined);
    expect(r).toMatchObject({ ok: false, error: 'failed', status: 'unknown' });
    expect(String(r.guidance)).toContain('do not present the page as current');
  });
});

describe('makeGate (D15, D20)', () => {
  it('hides pages the user cannot read, with no title or state', async () => {
    confluence.pageOperations.mockResolvedValue({ status: 404, ops: new Set() });
    expect(await makeGate(user, app)('1', 'read')).toEqual({ ok: false, error: 'not_visible', state: 'unknown', message: MESSAGES.notVisible });
    confluence.pageOperations.mockResolvedValue({ status: 200, ops: new Set(['update']) });
    expect(await makeGate(user, app)('1', 'read')).toMatchObject({ error: 'not_visible' });
  });

  it('allows read with read rights and refuses update without update rights', async () => {
    confluence.pageOperations.mockResolvedValue({ status: 200, ops: new Set(['read']) });
    expect(await makeGate(user, app)('1', 'read')).toBeNull();
    expect(await makeGate(user, app)('1', 'update')).toEqual({ ok: false, error: 'forbidden', message: MESSAGES.needsEdit });
    expect(await makeGate(user, app)('1', 'update', 'custom')).toEqual({ ok: false, error: 'forbidden', message: 'custom' });
  });

  it('allows update with update rights', async () => {
    confluence.pageOperations.mockResolvedValue({ status: 200, ops: new Set(['read', 'update']) });
    expect(await makeGate(user, app)('1', 'update')).toBeNull();
  });

  it('reports restricted pages the app cannot read (D20)', async () => {
    confluence.pageOperations.mockResolvedValue({ status: 200, ops: new Set(['read', 'update']) });
    confluence.getPageMeta.mockResolvedValue({ status: 404 });
    expect(await makeGate(user, app)('1', 'read')).toMatchObject({ ok: false, error: 'restricted', restricted: true });
  });
});

describe('dismiss and snooze need update rights (M3)', () => {
  const viewOnly: Gate = vi.fn(async (_pageId, need, message) =>
    need === 'update' ? { ok: false as const, error: 'forbidden', message: message ?? MESSAGES.needsEdit } : null,
  );

  it('refuses dismiss for a view-only user before any write', async () => {
    db.getEvent.mockResolvedValue({ id: 'e1', pageId: 'p1', bindingId: 'b1', status: 'open' });
    const r = await dismissEvent('e1', 'false_positive', 'u1', viewOnly);
    expect(r).toEqual({ ok: false, error: 'forbidden', message: MESSAGES.needsEditToTriage });
    expect(viewOnly).toHaveBeenCalledWith('p1', 'update', MESSAGES.needsEditToTriage);
  });

  it('refuses snooze for a view-only user before any write', async () => {
    const r = await snoozePage('p1', 7, viewOnly);
    expect(r).toEqual({ ok: false, error: 'forbidden', message: MESSAGES.needsEditToTriage });
    expect(db.ensureSchema).not.toHaveBeenCalled();
  });
});

describe('dev driver is inert without its token (H1)', () => {
  const body = JSON.stringify({ action: 'settings', settings: { sensitivity: 'strict' } });

  it('refuses every request when DDS_DEV_TOKEN is not set', async () => {
    const saved = process.env.DDS_DEV_TOKEN;
    delete process.env.DDS_DEV_TOKEN;
    try {
      expect(await devDriver({ body, headers: { 'x-dds-dev-token': ['anything'] } })).toEqual({ outputKey: 'unauthorized' });
      expect(await devDriver({ body, headers: {} })).toEqual({ outputKey: 'unauthorized' });
      expect(db.ensureSchema).not.toHaveBeenCalled();
    } finally {
      if (saved !== undefined) process.env.DDS_DEV_TOKEN = saved;
    }
  });

  it('refuses a wrong token when one is set', async () => {
    process.env.DDS_DEV_TOKEN = 'dev-token-for-tests-0123456789';
    try {
      expect(await devDriver({ body, headers: { 'x-dds-dev-token': ['dev-token-for-tests-012345678X'] } })).toEqual({ outputKey: 'unauthorized' });
      expect(await devDriver({ body, headers: { 'x-dds-dev-token': ['short'] } })).toEqual({ outputKey: 'unauthorized' });
      expect(db.ensureSchema).not.toHaveBeenCalled();
    } finally {
      delete process.env.DDS_DEV_TOKEN;
    }
  });
});
