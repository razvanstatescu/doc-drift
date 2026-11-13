// REST helpers for the take scripts (credentials from the environment; never printed).
const SITE = 'https://one-atlas-jzzf.atlassian.net';
const BB = 'https://api.bitbucket.org/2.0';

function basic(userVar, tokenVar) {
  const u = process.env[userVar];
  const t = process.env[tokenVar];
  if (!u || !t) throw new Error(`${userVar}/${tokenVar} not set (load the repo-root .env)`);
  return 'Basic ' + Buffer.from(`${u}:${t}`).toString('base64');
}

async function call(base, auth, method, path, body) {
  const res = await fetch(path.startsWith('http') ? path : base + path, {
    method,
    headers: { Authorization: auth, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, data };
}

export const atl = (method, path, body) => call(SITE, basic('ATLASSIAN_EMAIL', 'ATLASSIAN_API_TOKEN'), method, path, body);
export const bb = (method, path, body) => call(BB, basic('BITBUCKET_EMAIL', 'BITBUCKET_API_TOKEN'), method, path, body);

export async function byline(pageId) {
  const r = await atl('GET', `/wiki/api/v2/pages/${pageId}/properties?key=dds-byline-7f3c2a`);
  return r.status === 200 ? r.data.results?.[0]?.value ?? null : null;
}

export async function footerComments(pageId) {
  const r = await atl('GET', `/wiki/api/v2/pages/${pageId}/footer-comments?body-format=storage&limit=50`);
  return r.status === 200 ? r.data.results : [];
}

export async function pageVersion(pageId) {
  const r = await atl('GET', `/wiki/api/v2/pages/${pageId}`);
  return r.status === 200 ? r.data.version : null;
}
