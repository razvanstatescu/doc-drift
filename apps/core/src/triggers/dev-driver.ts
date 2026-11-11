// Development-only driver (static web trigger `dds-dev`), used to verify the pipeline end to end
// without a browser. Disabled unless the encrypted environment variable DDS_DEV_TOKEN is set, which
// it must never be in staging or production. Results go to `forge logs` (static responses carry no data).
// Remove this module before the production share links go out (M4).
import { timingSafeEqual } from 'node:crypto';
import { kvs } from '@forge/kvs';
import { saveBindings } from '../lib/bindings-service';
import { getPageProperty } from '../lib/confluence';
import { BYLINE_PROPERTY_KEY } from '../lib/copy';
import { ensureSchema, recentChanges, snapshotForPage } from '../lib/db';
import { DEMO_CHANGE_RECORD, DEMO_PR_ID } from '../lib/demo';
import { ingestRecord } from '../lib/ingest';
import { headerValue } from '../lib/ingest-rules';
import { refreshPage } from '../lib/page-state';
import { fingerprint } from '../lib/settings-store';
import api from '@forge/api';

interface Req {
  body?: string;
  headers?: Record<string, string[] | string | undefined>;
}

function tokenOk(given: string | undefined): boolean {
  const want = process.env.DDS_DEV_TOKEN;
  if (!want || !given) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const log = (tag: string, obj: unknown) => console.log(`${tag} ${JSON.stringify(obj)}`);

export async function devDriver(request: Req): Promise<{ outputKey: string }> {
  if (!tokenOk(headerValue(request.headers, 'x-dds-dev-token'))) return { outputKey: 'unauthorized' };
  let body: { action?: string; pageId?: string; spaceKey?: string; anchors?: unknown[]; secret?: string };
  try {
    body = JSON.parse(request.body ?? '{}');
  } catch {
    return { outputKey: 'bad-request' };
  }
  try {
    await ensureSchema();
    switch (body.action) {
      case 'bind': {
        const res = await saveBindings({
          pageId: String(body.pageId),
          spaceKey: body.spaceKey ?? null,
          anchors: (body.anchors ?? []) as never[],
          actorAccountId: null,
          method: 'dev',
        });
        log('DDS_DEV_BIND', res);
        break;
      }
      case 'replay':
        log('DDS_DEV_REPLAY', await ingestRecord(DEMO_CHANGE_RECORD, 'dev', `dev#${DEMO_PR_ID}#${Date.now()}`));
        break;
      case 'refresh':
        log('DDS_DEV_REFRESH', await refreshPage(String(body.pageId)));
        break;
      case 'inspect':
        log('DDS_DEV_INSPECT', {
          pageId: body.pageId,
          sql: await snapshotForPage(String(body.pageId)),
          byline: await getPageProperty(api.asApp(), String(body.pageId), BYLINE_PROPERTY_KEY),
        });
        break;
      case 'changes':
        log('DDS_DEV_CHANGES', await recentChanges(10));
        break;
      case 'set-secret': {
        // Lets a test script sign requests to ingest-change. Logs only the fingerprint.
        if (typeof body.secret !== 'string' || body.secret.length < 32) return { outputKey: 'bad-request' };
        await kvs.setSecret('relay-secret', body.secret);
        await kvs.set('relay-secret-meta', { fingerprint: fingerprint(body.secret), createdAt: new Date().toISOString(), createdBy: 'dev-driver' });
        log('DDS_DEV_SECRET_SET', { fingerprint: fingerprint(body.secret) });
        break;
      }
      default:
        return { outputKey: 'bad-request' };
    }
    return { outputKey: 'accepted' };
  } catch (e) {
    log('DDS_DEV_ERROR', { action: body.action, message: String((e as Error)?.message ?? e).slice(0, 500) });
    return { outputKey: 'failed' };
  }
}
