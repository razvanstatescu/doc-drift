// Thin Confluence REST helpers. `requester` is api.asApp() or api.asUser().
// Paths and scopes: docs/platform/forge-confluence.md and the S2 spike (REST v2 for pages,
// properties and operations; v1 only for the current user's global operations).
import { route, type RequestInit, type Response } from '@forge/api';

/** api.asApp() or api.asUser(). */
type Requester = { requestConfluence: (path: ReturnType<typeof route>, init?: RequestInit) => Promise<Response> };

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export interface PageBody {
  status: number;
  id?: string;
  title?: string;
  spaceId?: string;
  storage?: string;
}

/** GET a page with its storage-format body. A non-2xx status means "cannot read" (404 for restricted pages, D20). */
export async function getPageStorage(requester: Requester, pageId: string): Promise<PageBody> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { status: res.status };
  const out = (await res.json()) as { id: string; title: string; spaceId: string; body?: { storage?: { value?: string } } };
  return { status: res.status, id: out.id, title: out.title, spaceId: out.spaceId, storage: out.body?.storage?.value ?? '' };
}

/** GET a page without its body (cheap visibility check). */
export async function getPageMeta(requester: Requester, pageId: string): Promise<{ status: number; title?: string }> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { status: res.status };
  const out = (await res.json()) as { title: string };
  return { status: res.status, title: out.title };
}

/**
 * The caller's permitted operations on a page (`GET /pages/{id}/operations`), page-level rows only.
 * Used asUser before any asApp write (D15). Never use v1 /permission/check.
 */
export async function pageOperations(requester: Requester, pageId: string): Promise<{ status: number; ops: Set<string> }> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/operations`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { status: res.status, ops: new Set() };
  const out = (await res.json()) as { operations?: { operation: string; targetType: string }[] };
  return {
    status: res.status,
    ops: new Set((out.operations ?? []).filter((o) => o.targetType === 'page').map((o) => o.operation)),
  };
}

/**
 * Whether the current user is a Confluence administrator: v1 current user with `expand=operations`
 * includes `administer` on `application` for admins. Scope `read:confluence-user`.
 */
export async function currentUserIsAdmin(requester: Requester): Promise<boolean> {
  const res = await requester.requestConfluence(route`/wiki/rest/api/user/current?expand=operations`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    console.warn(`DDS_ADMIN_CHECK status=${res.status}`);
    return false;
  }
  const out = (await res.json()) as { operations?: { operation: string; targetType: string }[] };
  const ops = out.operations ?? [];
  const admin = ops.some((o) => o.operation === 'administer' && o.targetType === 'application');
  if (!admin) console.log(`DDS_ADMIN_CHECK not admin ops=${JSON.stringify(ops.map((o) => `${o.operation}:${o.targetType}`))}`);
  return admin;
}

/**
 * Creates or updates a page content property under the exact (raw) key. Property writes do not
 * create page versions (S2). Retries once on a version conflict.
 */
export async function upsertPageProperty(
  requester: Requester,
  pageId: string,
  key: string,
  value: unknown,
): Promise<{ status: number; op: 'post' | 'put' | 'get'; error?: unknown }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const getRes = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties?key=${key}`, {
      headers: { Accept: 'application/json' },
    });
    if (!getRes.ok) return { status: getRes.status, op: 'get', error: await readBody(getRes) };
    const existing = ((await getRes.json()) as { results?: { id: string; version: { number: number } }[] }).results?.[0];
    const res = existing
      ? await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties/${existing.id}`, {
          method: 'PUT',
          headers: JSON_HEADERS,
          body: JSON.stringify({ key, value, version: { number: existing.version.number + 1, message: 'Doc Drift Sentinel state' } }),
        })
      : await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ key, value }),
        });
    if (res.ok) return { status: res.status, op: existing ? 'put' : 'post' };
    if (res.status !== 409 || attempt === 1) return { status: res.status, op: existing ? 'put' : 'post', error: await readBody(res) };
  }
  return { status: 500, op: 'put' };
}

export async function getPageProperty(requester: Requester, pageId: string, key: string): Promise<{ status: number; value?: unknown }> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties?key=${key}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { status: res.status };
  const hit = ((await res.json()) as { results?: { value: unknown }[] }).results?.[0];
  return { status: res.status, value: hit?.value };
}
