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
  ownerId?: string;
  storage?: string;
  /** Absolute web URL when the response has `_links.base`. */
  url?: string;
}

/** GET a page with its storage-format body. A non-2xx status means "cannot read" (404 for restricted pages, D20). */
export async function getPageStorage(requester: Requester, pageId: string): Promise<PageBody> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { status: res.status };
  const out = (await res.json()) as { id: string; title: string; spaceId: string; ownerId?: string; body?: { storage?: { value?: string } }; _links?: { webui?: string; base?: string } };
  const url = out._links?.webui ? `${out._links.base ?? ''}${out._links.webui}` : undefined;
  return {
    status: res.status,
    id: out.id,
    title: out.title,
    spaceId: out.spaceId,
    ...(out.ownerId && { ownerId: out.ownerId }),
    storage: out.body?.storage?.value ?? '',
    ...(url && { url }),
  };
}

/**
 * The page's status as the requester sees it: `current`, or `draft` for a page that was never
 * published (GET /pages/{id} without a status filter is 404 for it). Undefined when not visible.
 */
export async function getPageStatus(requester: Requester, pageId: string): Promise<string | undefined> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}?status=current&status=draft&include-version=false`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return undefined;
  return ((await res.json()) as { status?: string }).status;
}

export interface PageMeta {
  status: number;
  title?: string;
  spaceId?: string;
  ownerId?: string;
}

/** GET a page without its body (cheap visibility check). */
export async function getPageMeta(requester: Requester, pageId: string): Promise<PageMeta> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { status: res.status };
  const out = (await res.json()) as { title: string; spaceId?: string; ownerId?: string };
  return { status: res.status, title: out.title, ...(out.spaceId && { spaceId: out.spaceId }), ...(out.ownerId && { ownerId: out.ownerId }) };
}

// ---------------------------------------------------------------------------
// Footer comments (notifier). Scope write:comment:confluence.
// ---------------------------------------------------------------------------
export async function createFooterComment(
  requester: Requester,
  pageId: string,
  storage: string,
): Promise<{ status: number; id?: string; version?: number; error?: unknown }> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/footer-comments`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ pageId, body: { representation: 'storage', value: storage } }),
  });
  if (!res.ok) return { status: res.status, error: await readBody(res) };
  const out = (await res.json()) as { id: string; version?: { number?: number } };
  return { status: res.status, id: out.id, version: out.version?.number ?? 1 };
}

export async function updateFooterComment(
  requester: Requester,
  commentId: string,
  version: number,
  storage: string,
): Promise<{ status: number; version?: number; error?: unknown }> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/footer-comments/${commentId}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ version: { number: version, message: 'Doc Drift Sentinel' }, body: { representation: 'storage', value: storage } }),
  });
  if (!res.ok) return { status: res.status, error: await readBody(res) };
  const out = (await res.json()) as { version?: { number?: number } };
  return { status: res.status, version: out.version?.number ?? version };
}

// ---------------------------------------------------------------------------
// Spaces and users (dashboard). Scopes read:space:confluence, read:page:confluence, read:confluence-user.
// ---------------------------------------------------------------------------
export async function getSpaceIdByKey(
  requester: Requester,
  spaceKey: string,
): Promise<{ status: number; id?: string; name?: string; homepageId?: string }> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/spaces?keys=${spaceKey}&limit=1`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { status: res.status };
  const hit = ((await res.json()) as { results?: { id: string; name?: string; homepageId?: string | number }[] }).results?.[0];
  return hit
    ? {
        status: res.status,
        id: String(hit.id),
        ...(hit.name && { name: hit.name }),
        ...(hit.homepageId !== undefined && hit.homepageId !== null && { homepageId: String(hit.homepageId) }),
      }
    : { status: 404 };
}

export interface SpacePage {
  id: string;
  title: string;
  ownerId?: string;
  url?: string;
}

/**
 * Every current page in a space that the requester can see (asUser: permission-aware), paginated.
 * `truncated` is true when the cap was hit.
 */
export async function listSpacePages(requester: Requester, spaceId: string, maxPages = 5000): Promise<{ status: number; pages: SpacePage[]; truncated: boolean }> {
  const pages: SpacePage[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < Math.ceil(maxPages / 250); i++) {
    const res = cursor
      ? await requester.requestConfluence(route`/wiki/api/v2/spaces/${spaceId}/pages?status=current&limit=250&cursor=${cursor}`, { headers: { Accept: 'application/json' } })
      : await requester.requestConfluence(route`/wiki/api/v2/spaces/${spaceId}/pages?status=current&limit=250`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { status: res.status, pages, truncated: false };
    const out = (await res.json()) as {
      results?: { id: string; title: string; ownerId?: string; _links?: { webui?: string } }[];
      _links?: { next?: string; base?: string };
    };
    const base = out._links?.base ?? '';
    for (const p of out.results ?? []) {
      pages.push({
        id: String(p.id),
        title: p.title,
        ...(p.ownerId && { ownerId: p.ownerId }),
        ...(p._links?.webui && { url: `${base}${p._links.webui}` }),
      });
    }
    const next = out._links?.next;
    if (!next) return { status: res.status, pages, truncated: false };
    cursor = new URLSearchParams(next.split('?')[1] ?? '').get('cursor') ?? undefined;
    if (!cursor) return { status: res.status, pages, truncated: false };
  }
  return { status: 200, pages, truncated: true };
}

/**
 * Current spaces the requester can see (settings space picker), sorted by name. Scope
 * `read:space:confluence`. `truncated` is true when the cap was hit.
 */
export async function listSpaces(requester: Requester, max = 1000): Promise<{ status: number; spaces: { key: string; name: string; type?: string }[]; truncated: boolean }> {
  const spaces: { key: string; name: string; type?: string }[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < Math.ceil(max / 250); i++) {
    const res = cursor
      ? await requester.requestConfluence(route`/wiki/api/v2/spaces?status=current&limit=250&cursor=${cursor}`, { headers: { Accept: 'application/json' } })
      : await requester.requestConfluence(route`/wiki/api/v2/spaces?status=current&limit=250`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { status: res.status, spaces, truncated: false };
    const out = (await res.json()) as { results?: { key: string; name?: string; type?: string }[]; _links?: { next?: string } };
    for (const sp of out.results ?? []) spaces.push({ key: sp.key, name: sp.name ?? sp.key, ...(sp.type && { type: sp.type }) });
    const next = out._links?.next;
    cursor = next ? (new URLSearchParams(next.split('?')[1] ?? '').get('cursor') ?? undefined) : undefined;
    if (!cursor) return { status: res.status, spaces: sortSpaces(spaces), truncated: false };
  }
  return { status: 200, spaces: sortSpaces(spaces), truncated: true };
}

function sortSpaces<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

/** Display names by account ID (v1 user lookup, one call per distinct user). Unknown users are left out. */
export async function displayNames(requester: Requester, accountIds: (string | null | undefined)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(accountIds.filter((a): a is string => !!a))].slice(0, 25);
  await Promise.all(
    ids.map(async (id) => {
      const res = await requester.requestConfluence(route`/wiki/rest/api/user?accountId=${id}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const u = (await res.json()) as { displayName?: string; publicName?: string };
      const name = u.displayName ?? u.publicName;
      if (name) out.set(id, name);
    }),
  );
  return out;
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

// ---------------------------------------------------------------------------
// Agent tools and Propose fix (M3). Scopes read:page:confluence, write:page:confluence.
// ---------------------------------------------------------------------------
export interface PageInfo {
  status: number;
  id?: string;
  title?: string;
  spaceId?: string;
  ownerId?: string;
  /** Absolute page URL when the response carries `_links.base`, else the relative `webui` path. */
  url?: string;
}

function pageUrl(links: { webui?: string; base?: string } | undefined): string | undefined {
  if (!links?.webui) return undefined;
  return `${links.base ?? ''}${links.webui}`;
}

/** GET a page without its body, with its web URL. */
export async function getPageInfo(requester: Requester, pageId: string): Promise<PageInfo> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { status: res.status };
  const out = (await res.json()) as { id: string; title: string; spaceId?: string; ownerId?: string; _links?: { webui?: string; base?: string } };
  const url = pageUrl(out._links);
  return {
    status: res.status,
    id: String(out.id),
    title: out.title,
    ...(out.spaceId && { spaceId: String(out.spaceId) }),
    ...(out.ownerId && { ownerId: out.ownerId }),
    ...(url && { url }),
  };
}

/** Current pages with this exact title, as the requester sees them (asUser: permission-aware). */
export async function findPagesByTitle(requester: Requester, title: string, limit = 5): Promise<{ status: number; pages: { id: string; title: string; spaceId?: string; url?: string }[] }> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages?title=${title}&status=current&limit=${limit}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { status: res.status, pages: [] };
  const out = (await res.json()) as { results?: { id: string; title: string; spaceId?: string; _links?: { webui?: string } }[]; _links?: { base?: string } };
  return {
    status: res.status,
    pages: (out.results ?? []).map((p) => {
      const url = pageUrl({ ...(p._links?.webui && { webui: p._links.webui }), ...(out._links?.base && { base: out._links.base }) });
      return { id: String(p.id), title: p.title, ...(p.spaceId && { spaceId: String(p.spaceId) }), ...(url && { url }) };
    }),
  };
}

export interface EditablePage {
  status: number;
  id?: string;
  title?: string;
  spaceId?: string;
  version?: number;
  storage?: string;
}

/** GET a page's storage body and version number, for an edit. */
export async function getPageForEdit(requester: Requester, pageId: string): Promise<EditablePage> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { status: res.status };
  const out = (await res.json()) as { id: string; title: string; spaceId?: string; version?: { number?: number }; body?: { storage?: { value?: string } } };
  return {
    status: res.status,
    id: String(out.id),
    title: out.title,
    ...(out.spaceId && { spaceId: String(out.spaceId) }),
    version: out.version?.number ?? 1,
    storage: out.body?.storage?.value ?? '',
  };
}

/**
 * PUT a new page version with a storage body and a version message. Page text is only ever written
 * asUser, on a human click (D6, D15). A 409 means someone saved a newer version first.
 */
export async function updatePageBody(
  requester: Requester,
  page: { id: string; title: string; version: number },
  storage: string,
  message: string,
): Promise<{ status: number; version?: number; error?: unknown }> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${page.id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      id: page.id,
      status: 'current',
      title: page.title,
      body: { representation: 'storage', value: storage },
      version: { number: page.version + 1, message },
    }),
  });
  if (!res.ok) return { status: res.status, error: await readBody(res) };
  const out = (await res.json()) as { version?: { number?: number } };
  return { status: res.status, version: out.version?.number ?? page.version + 1 };
}

/** A space's key by its ID (BUG-11 moved pages, when the event carries no key). Scope read:space:confluence. */
export async function getSpaceKeyById(requester: Requester, spaceId: string): Promise<string | undefined> {
  const res = await requester.requestConfluence(route`/wiki/api/v2/spaces/${spaceId}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return undefined;
  return ((await res.json()) as { key?: string }).key;
}
