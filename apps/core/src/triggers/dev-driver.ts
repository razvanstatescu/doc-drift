// Development-only driver (static web trigger `dds-dev`), used to verify the pipeline end to end
// without a browser. Disabled unless the encrypted environment variable DDS_DEV_TOKEN is set, which
// it must never be in staging or production. Static responses carry no data, so each result is logged
// (`forge logs`) and also written to the content property `dds-dev-result` of `resultPageId`
// (default: DDSTEST test page 2752731), where a test script can read it at once over REST.
// Resolver-equivalent actions use an open permission gate and an asApp reader: the asUser checks
// themselves need a browser (README, manual checks).
// H1: REMOVE this module, the `dds-dev` web trigger and the `dev-driver` function before any production deploy.
import { timingSafeEqual } from 'node:crypto';
import api from '@forge/api';
import { kvs } from '@forge/kvs';
import { parseChangeRecord } from '@dds/shared';
import {
  checkPageFreshness,
  findDocsForPath,
  getDriftContext,
  listStalePages,
  recordAgentVerification,
  type ToolDeps,
} from '../lib/agent-service';
import { saveBindings } from '../lib/bindings-service';
import { applyProposal, listProposals, rejectProposal, submitFixProposal } from '../lib/fix-service';
import { getPageProperty, upsertPageProperty } from '../lib/confluence';
import { BYLINE_PROPERTY_KEY } from '../lib/copy';
import { devAgeOpenEvents, ensureSchema, recentChanges, relayActivity, snapshotForPage } from '../lib/db';
import { DEMO_CHANGE_RECORD, DEMO_PR_ID } from '../lib/demo';
import { ingestRecord } from '../lib/ingest';
import { headerValue, parseSettings } from '../lib/ingest-rules';
import { processChange } from '../lib/matching';
import { notifyPage } from '../lib/notifier';
import { refreshPage } from '../lib/page-state';
import { decideRename, dismissEvent, markVerified, pageDrift, snoozePage, spaceDashboard, type Gate } from '../lib/review-service';
import { fingerprint, getSettings, saveSettings } from '../lib/settings-store';
import { confluencePageEvent, escalate, jiraEvent, purge } from './product-events';

interface Req {
  body?: string;
  headers?: Record<string, string[] | string | undefined>;
}

type Body = {
  action?: string;
  pageId?: string;
  spaceKey?: string;
  anchors?: unknown[];
  secret?: string;
  record?: unknown;
  title?: string;
  eventId?: string;
  reason?: string;
  days?: number;
  note?: string;
  proposalId?: string;
  event?: unknown;
  settings?: Record<string, unknown>;
  changeRecordId?: string;
  resultPageId?: string;
  sync?: boolean;
  tool?: string;
  input?: Record<string, unknown>;
};

export const DEV_RESULT_PROPERTY_KEY = 'dds-dev-result';
const DEFAULT_RESULT_PAGE = '2752731';

function tokenOk(given: string | undefined): boolean {
  const want = process.env.DDS_DEV_TOKEN;
  if (!want || !given) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const log = (tag: string, obj: unknown) => console.log(`${tag} ${JSON.stringify(obj)}`);

/** The driver has no user: it skips the asUser checks (they are covered by the browser checks). */
const openGate: Gate = async () => null;

async function run(body: Body): Promise<unknown> {
  const pageId = String(body.pageId ?? '');
  switch (body.action) {
    case 'bind':
      return saveBindings({ pageId, spaceKey: body.spaceKey ?? null, anchors: (body.anchors ?? []) as never[], actorAccountId: null, method: 'dev' });
    case 'replay':
      return ingestRecord(DEMO_CHANGE_RECORD, 'dev', `dev#${DEMO_PR_ID}#${Date.now()}`);
    case 'ingest': {
      // Any change record (revert, Jira, D27 tests). A fresh dedupe key makes each call a new change.
      const parsed = parseChangeRecord(body.record);
      if (!parsed.ok) return { ok: false, errors: parsed.errors.slice(0, 5) };
      const res = await ingestRecord(parsed.value, 'dev', `dev#${Date.now()}#${Math.random().toString(36).slice(2, 8)}`, { title: body.title ?? null });
      // `sync: true` matches inline, so the result carries the outcome (the queue still gets the job; it is idempotent).
      return body.sync ? { ...res, match: await processChange(res.changeRecordId) } : res;
    }
    case 'match':
      return processChange(String(body.changeRecordId));
    case 'refresh':
      return refreshPage(pageId);
    case 'inspect':
      return { pageId, sql: await snapshotForPage(pageId), byline: await getPageProperty(api.asApp(), pageId, BYLINE_PROPERTY_KEY) };
    case 'changes':
      return recentChanges(10);
    case 'drift':
      return pageDrift(pageId, api.asApp(), { canEdit: true });
    case 'verify':
      return markVerified(pageId, null, body.note, openGate, 'dev');
    case 'dismiss':
      return dismissEvent(body.eventId, body.reason, null, openGate);
    case 'snooze':
      return snoozePage(pageId, body.days, openGate);
    case 'accept-rename':
      return decideRename(body.proposalId, 'accepted', null, openGate);
    case 'reject-rename':
      return decideRename(body.proposalId, 'rejected', null, openGate);
    case 'dashboard':
      return spaceDashboard(String(body.spaceKey ?? ''), api.asApp());
    // M3 agent tools with an asApp reader and an open gate (the asUser path needs Rovo or an MCP client).
    case 'tool': {
      const deps: ToolDeps = { user: api.asApp(), app: api.asApp(), gate: openGate, accountId: null, contextPageId: body.pageId ?? null };
      const input = body.input ?? {};
      switch (body.tool) {
        case 'check-page-freshness':
          return checkPageFreshness(input, deps);
        case 'find-docs-for-path':
          return findDocsForPath(input, deps);
        case 'list-stale-pages':
          return listStalePages(input, deps);
        case 'get-drift-context':
          return getDriftContext(input, deps);
        case 'record-verification':
          return recordAgentVerification(input, deps);
        case 'submit-fix-proposal':
          return submitFixProposal(String(input.pageId ?? body.pageId ?? ''), input, deps);
        default:
          return undefined;
      }
    }
    case 'proposals':
      return listProposals(pageId, { user: api.asApp(), gate: openGate, accountId: null });
    case 'apply-proposal':
      return applyProposal(body.proposalId, { user: api.asApp(), gate: openGate, accountId: null });
    case 'reject-proposal':
      return rejectProposal(body.proposalId, { user: api.asApp(), gate: openGate, accountId: null });
    case 'escalate':
      await escalate();
      return { ok: true };
    case 'purge':
      await purge();
      return { ok: true };
    case 'relay-activity':
      return relayActivity();
    case 'notify':
      return notifyPage(pageId);
    case 'age':
      // Moves the page's open events back `days` days (time-based escalation test).
      return { aged: await devAgeOpenEvents(pageId, Number(body.days ?? 0)) };
    case 'jira-event':
      await jiraEvent((body.event ?? {}) as never);
      return { ok: true };
    case 'page-event':
      await confluencePageEvent((body.event ?? {}) as never);
      return { ok: true };
    case 'settings': {
      const current = await getSettings();
      const parsed = parseSettings({ ...current, ...(body.settings ?? {}) }, current);
      if (!parsed.ok) return parsed;
      await saveSettings(parsed.value);
      return parsed;
    }
    case 'set-secret': {
      // Lets a test script sign requests to ingest-change. Logs only the fingerprint.
      if (typeof body.secret !== 'string' || body.secret.length < 32) return undefined;
      await kvs.setSecret('relay-secret', body.secret);
      await kvs.set('relay-secret-meta', { fingerprint: fingerprint(body.secret), createdAt: new Date().toISOString(), createdBy: 'dev-driver' });
      return { fingerprint: fingerprint(body.secret) };
    }
    default:
      return undefined;
  }
}

async function writeResult(resultPageId: string, action: string, result: unknown): Promise<void> {
  let json = JSON.stringify(result ?? null);
  if (json.length > 30_000) json = JSON.stringify({ truncated: true, head: json.slice(0, 29_000) });
  await upsertPageProperty(api.asApp(), resultPageId, DEV_RESULT_PROPERTY_KEY, { action, at: new Date().toISOString(), result: JSON.parse(json) });
}

export async function devDriver(request: Req): Promise<{ outputKey: string }> {
  if (!tokenOk(headerValue(request.headers, 'x-dds-dev-token'))) return { outputKey: 'unauthorized' };
  let body: Body;
  try {
    body = JSON.parse(request.body ?? '{}');
  } catch {
    return { outputKey: 'bad-request' };
  }
  const action = String(body.action ?? '');
  const resultPage = String(body.resultPageId ?? DEFAULT_RESULT_PAGE);
  try {
    await ensureSchema();
    const result = await run(body);
    if (result === undefined) return { outputKey: 'bad-request' };
    log(`DDS_DEV_${action.toUpperCase().replace(/-/g, '_')}`, result);
    await writeResult(resultPage, action, result);
    return { outputKey: 'accepted' };
  } catch (e) {
    const message = String((e as Error)?.message ?? e).slice(0, 500);
    log('DDS_DEV_ERROR', { action, message });
    try {
      await writeResult(resultPage, action, { error: message });
    } catch {
      // ignore
    }
    return { outputKey: 'failed' };
  }
}
