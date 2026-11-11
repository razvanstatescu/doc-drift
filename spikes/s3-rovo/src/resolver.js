import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('logRovo', ({ payload, context }) => {
  console.log(`[spike-page] rovo.isEnabled=${payload?.enabled} accountId=${context?.accountId}`);
  return true;
});

resolver.define('asUserProbe', async ({ context }) => {
  try {
    const res = await api.asUser().requestConfluence(route`/wiki/api/v2/pages?limit=1`, {
      headers: { Accept: 'application/json' },
    });
    const body = res.ok ? await res.json() : null;
    const first = body?.results?.[0];
    console.log(`[spike-page] asUserProbe status=${res.status} accountId=${context?.accountId} firstPageId=${first?.id}`);
    return { asUser: res.ok ? 'ok' : `http-${res.status}`, firstPageId: first?.id ?? null, firstPageTitle: first?.title ?? null };
  } catch (err) {
    console.log(`[spike-page] asUserProbe threw name=${err?.name} status=${err?.status} message=${err?.message}`);
    // Re-throw so the platform can render its consent prompt for NEEDS_AUTHENTICATION_ERR.
    throw err;
  }
});

export const handler = resolver.getDefinitions();
