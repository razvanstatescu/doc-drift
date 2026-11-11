// Thin REST v2 helpers. `requester` is api.asApp() or api.asUser().
import { route } from '@forge/api';

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

async function body(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

// Create or update a page content property under the exact key given.
// Returns { op, status, ms, id?, error? } so callers can log outcomes.
export async function upsertPageProperty(requester, pageId, key, value, message = 'Doc Drift spike S2') {
  const t0 = Date.now();
  const getRes = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties?key=${key}`, {
    headers: { Accept: 'application/json' },
  });
  if (!getRes.ok) {
    return { op: 'get', status: getRes.status, ms: Date.now() - t0, error: await body(getRes) };
  }
  const existing = (await getRes.json()).results?.[0];
  let res;
  if (existing) {
    res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties/${existing.id}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ key, value, version: { number: existing.version.number + 1, message } }),
    });
  } else {
    res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ key, value }),
    });
  }
  const out = await body(res);
  return {
    op: existing ? 'put' : 'post',
    status: res.status,
    ms: Date.now() - t0,
    id: out?.id,
    error: res.ok ? undefined : out,
  };
}

export async function deletePagePropertyByKey(requester, pageId, key) {
  const getRes = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties?key=${key}`);
  if (!getRes.ok) return { status: getRes.status };
  const existing = (await getRes.json()).results?.[0];
  if (!existing) return { status: 204, note: 'absent' };
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties/${existing.id}`, {
    method: 'DELETE',
  });
  return { status: res.status };
}

export async function listPageProperties(requester, pageId) {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties?limit=50`, {
    headers: { Accept: 'application/json' },
  });
  const out = await body(res);
  return {
    status: res.status,
    properties: res.ok ? out.results.map((p) => ({ key: p.key, value: p.value, version: p.version?.number })) : out,
  };
}

// GET /pages/{id}/operations: the caller's permitted operations on the page.
export async function getPageOperations(requester, pageId) {
  const t0 = Date.now();
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/operations`, {
    headers: { Accept: 'application/json' },
  });
  return { status: res.status, ms: Date.now() - t0, body: await body(res) };
}

export async function listSpaces(requester) {
  const res = await requester.requestConfluence(route`/wiki/api/v2/spaces?limit=50`, {
    headers: { Accept: 'application/json' },
  });
  const out = await body(res);
  return res.ok
    ? out.results.map((s) => ({ id: s.id, key: s.key, name: s.name, type: s.type, homepageId: s.homepageId }))
    : { status: res.status, error: out };
}

// Find a page by exact title in a space, or create it (storage format body).
export async function findOrCreatePage(requester, { spaceId, title, parentId, html }) {
  const find = await requester.requestConfluence(
    route`/wiki/api/v2/pages?space-id=${spaceId}&title=${title}&limit=1`,
    { headers: { Accept: 'application/json' } }
  );
  if (find.ok) {
    const hit = (await find.json()).results?.[0];
    if (hit) return { id: hit.id, created: false, status: 200 };
  }
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      spaceId,
      status: 'current',
      title,
      parentId,
      body: { representation: 'storage', value: html },
    }),
  });
  const out = await body(res);
  return res.ok ? { id: out.id, created: true, status: res.status } : { status: res.status, error: out };
}

export async function getPage(requester, pageId) {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
    headers: { Accept: 'application/json' },
  });
  const out = await body(res);
  return {
    status: res.status,
    title: res.ok ? out.title : undefined,
    version: res.ok ? out.version?.number : undefined,
    error: res.ok ? undefined : out,
  };
}

// Add direct read/update permissions for one user (makes the page view-restricted).
// allow-self-lockout=true lets the app user lock itself out, which is the point of the D20 test.
export async function restrictPageToUser(requester, pageId, accountId) {
  const res = await requester.requestConfluence(
    route`/wiki/api/v2/pages/${pageId}/permissions?allow-self-lockout=true`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        permissions: [
          { operation: 'read', principals: [{ principalType: 'user', principalId: accountId }] },
          { operation: 'update', principals: [{ principalType: 'user', principalId: accountId }] },
        ],
      }),
    }
  );
  return { status: res.status, body: await body(res) };
}

// Replace ALL direct permissions with one user (PUT). Removes the app user's creator entry too,
// which reproduces the D20 case: a page the app user cannot see.
export async function lockPageToUser(requester, pageId, accountId, operations = ['read', 'update']) {
  const res = await requester.requestConfluence(
    route`/wiki/api/v2/pages/${pageId}/permissions?allow-self-lockout=true`,
    {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        permissions: operations.map((operation) => ({
          operation,
          principals: [{ principalType: 'user', principalId: accountId }],
        })),
      }),
    }
  );
  return { status: res.status, body: await body(res) };
}

export async function getPagePermissions(requester, pageId) {
  const res = await requester.requestConfluence(route`/wiki/api/v2/pages/${pageId}/permissions`, {
    headers: { Accept: 'application/json' },
  });
  const out = await body(res);
  return { status: res.status, results: res.ok ? out.results.map((r) => [r.operation, r.principal.principalId]) : out };
}
