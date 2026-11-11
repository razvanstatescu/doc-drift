// Rovo action entry points (manifest `action` modules). The same actions serve the Drift Reviewer agent,
// the check-page-freshness skill and the `rovo:mcp` server for external clients (Claude Code, Cursor).
// Everything runs asUser, with no asApp fallback (D21). Without the user's consent entry in Connected
// apps, requestConfluence throws NeedsAuthenticationError, and the tool returns `consent_required`.
// Inputs are LLM-extracted: they pick the page, never authorize anything (accountId comes from context).
import api, { NeedsAuthenticationError } from '@forge/api';
import { makeGate } from '../lib/access';
import {
  checkPageFreshness as checkFreshness,
  findDocsForPath as findDocs,
  getDriftContext as driftContext,
  listStalePages as listStale,
  recordAgentVerification,
  resolvePage,
  type ToolDeps,
} from '../lib/agent-service';
import { consentRequired } from '../lib/agent-tools';
import { submitFixProposal as submitFix } from '../lib/fix-service';

type Payload = Record<string, unknown> & { context?: { confluence?: { contentId?: unknown }; cloudId?: string; moduleKey?: string } };
type Context = { accountId?: string; principal?: { accountId?: string } } | undefined;

function depsFor(payload: Payload, context: Context): ToolDeps {
  const user = api.asUser();
  const app = api.asApp();
  const contentId = payload?.context?.confluence?.contentId;
  return {
    user,
    app,
    gate: makeGate(user, app),
    accountId: context?.accountId ?? context?.principal?.accountId ?? null,
    contextPageId: contentId === undefined || contentId === null ? null : String(contentId),
  };
}

function isConsentError(e: unknown): boolean {
  return e instanceof NeedsAuthenticationError || (e as { name?: string })?.name === 'NEEDS_AUTHENTICATION_ERR';
}

/** Runs one tool: logs the call shape (never free text), maps consent and unexpected errors to results. */
async function run(tool: string, payload: Payload, context: Context, fn: (input: Payload, deps: ToolDeps) => Promise<Record<string, unknown>>) {
  const input = { ...(payload ?? {}) };
  delete input.context;
  const surface = payload?.context?.confluence ? 'confluence' : 'external';
  const started = Date.now();
  try {
    const deps = depsFor(payload ?? {}, context);
    const result = await fn(input, deps);
    console.log(
      `DDS_TOOL ${JSON.stringify({ tool, surface, inputs: Object.keys(input), account: deps.accountId ? 'yes' : 'no', ok: result.ok, status: result.status ?? null, error: result.error ?? null, ms: Date.now() - started })}`,
    );
    return result;
  } catch (e) {
    if (isConsentError(e)) {
      console.log(`DDS_TOOL ${JSON.stringify({ tool, surface, error: 'consent_required', ms: Date.now() - started })}`);
      const id = typeof input.pageId === 'string' && /^\d+$/.test(input.pageId) ? input.pageId : null;
      return consentRequired(id);
    }
    console.error(`DDS_TOOL_ERROR ${JSON.stringify({ tool, surface, message: String((e as Error)?.message ?? e).slice(0, 300) })}`);
    return { ok: false, status: 'unknown', error: 'failed', guidance: 'Doc Drift could not finish this check. Try again in a minute. Until then, do not present the page as current.' };
  }
}

export const checkPageFreshness = (payload: Payload, context: Context) => run('check-page-freshness', payload, context, checkFreshness);
export const findDocsForPath = (payload: Payload, context: Context) => run('find-docs-for-path', payload, context, findDocs);
export const listStalePages = (payload: Payload, context: Context) => run('list-stale-pages', payload, context, listStale);
export const getDriftContext = (payload: Payload, context: Context) => run('get-drift-context', payload, context, driftContext);
export const recordVerification = (payload: Payload, context: Context) => run('record-verification', payload, context, recordAgentVerification);
export const submitFixProposal = (payload: Payload, context: Context) =>
  run('submit-fix-proposal', payload, context, async (input, deps) => {
    const resolved = await resolvePage({ pageId: input.pageId, pageUrl: input.pageUrl }, deps);
    if ('result' in resolved) return resolved.result;
    return submitFix(resolved.pageId, input, deps);
  });
