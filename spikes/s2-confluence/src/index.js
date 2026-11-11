// Spike S2 + S7 backend. Every log line starts with a tag (S2_..., S7_...) so `forge logs | grep` finds it.
import api from '@forge/api';
import Resolver from '@forge/resolver';
import { Queue } from '@forge/events';
import { BYLINE_KEY, PROBE_KEY, bylineValue } from './lib/states';
import {
  upsertPageProperty,
  deletePagePropertyByKey,
  listPageProperties,
  getPageOperations,
  listSpaces,
  findOrCreatePage,
  getPage,
  restrictPageToUser,
  lockPageToUser,
  getPagePermissions,
} from './lib/confluence';
import { runMigrationWithRetry, applyMigrations, seed, bench, policyProbe } from './lib/db';

const log = (tag, obj) => console.log(`${tag} ${JSON.stringify(obj)}`);

// ---------------------------------------------------------------------------
// Byline modal resolver (function key: resolver). Runs only when a user opens the byline.
// ---------------------------------------------------------------------------
const bylineResolver = new Resolver();

bylineResolver.define('context', async ({ context }) => {
  const pageId = context.extension?.content?.id;
  const props = await listPageProperties(api.asApp(), pageId);
  log('S2_MODAL_CONTEXT', { pageId, localId: context.localId, moduleKey: context.moduleKey, props });
  return { pageId, localId: context.localId, accountId: context.accountId, props };
});

// Write a state asApp after checking the clicking user can update the page (asUser /operations).
bylineResolver.define('setState', async ({ payload, context }) => {
  const pageId = context.extension?.content?.id;
  const ops = await getPageOperations(api.asUser(), pageId);
  const canUpdate = ops.status === 200 && ops.body.operations?.some((o) => o.operation === 'update' && o.targetType === 'page');
  if (!canUpdate) {
    log('S2_SETSTATE_DENIED', { pageId, ops });
    return { ok: false, reason: 'no update permission', ops };
  }
  const value = bylineValue(payload.state, payload.iconMode || 'resource', ' (live)');
  const res = await upsertPageProperty(api.asApp(), pageId, BYLINE_KEY, value);
  log('S2_SETSTATE', { pageId, state: payload.state, res });
  return { ok: res.status < 300, value, res };
});

// S2 question: does asUser GET /operations return read/update for the viewing user?
bylineResolver.define('myOperations', async ({ context }) => {
  const pageId = context.extension?.content?.id;
  const asUser = await getPageOperations(api.asUser(), pageId);
  const asApp = await getPageOperations(api.asApp(), pageId);
  log('S2_OPERATIONS', { pageId, accountId: context.accountId, asUser, asApp });
  return { asUser, asApp };
});

// S2 question: does the byline read forge-<localId>-<key>? Remove the raw key, write the prefixed one.
bylineResolver.define('writePrefixed', async ({ context }) => {
  const pageId = context.extension?.content?.id;
  const prefixedKey = `forge-${context.localId}-${BYLINE_KEY}`;
  const del = await deletePagePropertyByKey(api.asApp(), pageId, BYLINE_KEY);
  const res = await upsertPageProperty(api.asApp(), pageId, prefixedKey, {
    title: 'Doc Drift: PREFIXED KEY READ',
    icon: 'resource:icons;stale.svg',
    tooltip: 'Value came from the forge-<localId>-<key> property',
  });
  log('S2_PREFIXED', { pageId, prefixedKey, del, res });
  return { prefixedKey, del, res };
});

export const handler = bylineResolver.getDefinitions();

// ---------------------------------------------------------------------------
// Probe byline dynamicProperties (function key: dynprops). If this logs on a page view,
// Confluence invoked a function to render the byline.
// ---------------------------------------------------------------------------
export const dynamicProps = async (payload, context) => {
  log('S2_DYNPROPS_CALLED', {
    pageId: payload?.extension?.content?.id,
    localId: payload?.localId,
    accountId: context?.principal?.accountId,
  });
  return { title: 'Probe: from dynamicProperties fn', tooltip: 'dynamicProperties function ran' };
};

// ---------------------------------------------------------------------------
// Background script resolver (function key: bg-resolver). Spike-only page-view beacon.
// ---------------------------------------------------------------------------
const bgResolver = new Resolver();
bgResolver.define('seen', async ({ payload, context }) => {
  log('S2_BG_SEEN', {
    pageId: context.extension?.content?.id,
    bgLocalId: context.localId,
    accountId: context.accountId,
    userView: payload, // what the frontend (asUser via requestConfluence) could read
  });
  return true;
});
export const bgHandler = bgResolver.getDefinitions();

// ---------------------------------------------------------------------------
// S7 migrations: trigger on installed/upgraded -> queue -> consumer (900 s).
// ---------------------------------------------------------------------------
const migrationQueue = new Queue({ key: 'schema-migration-queue' });
export const enqueueMigration = async (event) => {
  log('S7_ENQUEUE', { eventType: event?.eventType });
  await migrationQueue.push({ body: { reason: event?.eventType || 'manual' } });
};
export const runMigration = async () => runMigrationWithRetry();

// ---------------------------------------------------------------------------
// Spike driver: static v2 web trigger. Results go to logs (static responses can't carry data).
// ---------------------------------------------------------------------------
const TEST_PAGES = [
  { slug: 'S2-1', title: 'S2-1 Verified, icon resource:icons;file', state: 'verified', iconMode: 'resource', probe: true },
  { slug: 'S2-2', title: 'S2-2 Possibly stale, icon bare relative path', state: 'possibly_stale', iconMode: 'bare', probe: true },
  { slug: 'S2-3', title: 'S2-3 Stale, icon data URI', state: 'stale', iconMode: 'datauri', probe: true },
  { slug: 'S2-4', title: 'S2-4 Unanchored, icon absolute URL (undeclared)', state: 'unanchored', iconMode: 'absolute', probe: true },
  { slug: 'S2-5', title: 'S2-5 No property (defaults, then prefixed-key test)', state: null, probe: false },
  { slug: 'S2-6', title: 'S2-6 View-restricted page (D20)', state: 'possibly_stale', iconMode: 'resource', probe: true, restrict: true },
  { slug: 'S2-7', title: 'S2-7 Live refresh via backgroundScript', state: 'verified', iconMode: 'resource', probe: false },
];

async function setup({ spaceId, restrictTo }) {
  const app = api.asApp();
  const parent = await findOrCreatePage(app, {
    spaceId,
    title: 'Doc Drift Sentinel spike S2',
    html: '<p>Throwaway test pages for spike S2 (byline from a content property). Safe to delete.</p>',
  });
  log('S2_SETUP_PARENT', parent);
  const results = [];
  for (const p of TEST_PAGES) {
    const page = await findOrCreatePage(app, {
      spaceId,
      parentId: parent.id,
      title: p.title,
      html: `<p>Spike S2 test page ${p.slug}. Check the byline under the title.</p>`,
    });
    const r = { slug: p.slug, title: p.title, page };
    if (page.id && p.state) {
      r.byline = await upsertPageProperty(app, page.id, BYLINE_KEY, bylineValue(p.state, p.iconMode));
    }
    if (page.id && p.probe) {
      r.probe = await upsertPageProperty(app, page.id, PROBE_KEY, {
        title: 'Probe: from content property',
        icon: 'resource:icons;unanchored.svg',
        tooltip: 'Probe value read from the content property',
      });
    }
    if (page.id && p.restrict && restrictTo) {
      r.restrict = await restrictPageToUser(app, page.id, restrictTo);
      r.afterRestrict = {
        getPage: await getPage(app, page.id),
        listProps: await listPageProperties(app, page.id),
        write: await upsertPageProperty(app, page.id, BYLINE_KEY, bylineValue('stale', 'resource', ' (after restrict)')),
        ops: await getPageOperations(app, page.id),
      };
    }
    results.push(r);
    log('S2_SETUP_PAGE', r);
  }
  return results;
}

async function drive(body) {
  const app = api.asApp();
  switch (body.action) {
    case 'spaces':
      return log('S2_SPACES', await listSpaces(app));
    case 'setup':
      return setup(body);
    case 'state':
      return log('S2_STATE', await upsertPageProperty(app, body.pageId, BYLINE_KEY, bylineValue(body.state, body.iconMode)));
    case 'raw':
      return log('S2_RAW', await upsertPageProperty(app, body.pageId, body.key, body.value));
    case 'delete':
      return log('S2_DELETE', await deletePagePropertyByKey(app, body.pageId, body.key));
    case 'inspect':
      return log('S2_INSPECT', {
        pageId: body.pageId,
        page: await getPage(app, body.pageId),
        props: await listPageProperties(app, body.pageId),
        ops: await getPageOperations(app, body.pageId),
      });
    case 'lockout': {
      const lock = await lockPageToUser(app, body.pageId, body.accountId, body.operations);
      return log('S2_LOCKOUT', {
        pageId: body.pageId,
        lock,
        getPage: await getPage(app, body.pageId),
        listProps: await listPageProperties(app, body.pageId),
        write: await upsertPageProperty(app, body.pageId, BYLINE_KEY, bylineValue('stale', 'resource', ' (after lockout)')),
        ops: await getPageOperations(app, body.pageId),
        permsAfter: await getPagePermissions(app, body.pageId),
      });
    }
    case 'sql-migrate':
      return log('S7_MIGRATE_DIRECT', await applyMigrations());
    case 'sql-seed':
      return log('S7_SEED', await seed(body.n || 200));
    case 'sql-bench':
      return log('S7_BENCH', await bench(body.iterations || 15));
    case 'sql-policy':
      return log('S7_POLICY', await policyProbe());
    default:
      throw new Error(`unknown action ${body.action}`);
  }
}

export const spikeTrigger = async (request) => {
  const token = request.headers?.['x-spike-token']?.[0];
  if (!process.env.SPIKE_TOKEN || token !== process.env.SPIKE_TOKEN) {
    return { outputKey: 'unauthorized' };
  }
  let body;
  try {
    body = JSON.parse(request.body || '{}');
  } catch {
    return { outputKey: 'bad-request' };
  }
  const t0 = Date.now();
  try {
    await drive(body);
    log('SPIKE_DONE', { action: body.action, ms: Date.now() - t0 });
    return { outputKey: 'accepted' };
  } catch (e) {
    log('SPIKE_ERROR', { action: body.action, message: String(e?.message || e), stack: e?.stack?.slice(0, 600) });
    return { outputKey: 'failed' };
  }
};
