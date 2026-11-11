// Resolver for the workspace settings page. Every call first checks, as the calling user, that
// they are a workspace admin: the page is in workspace settings, but display is not authorization.
import Resolver from '@forge/resolver';
import api, { NeedsAuthenticationError, route } from '@forge/api';
import { postSigned } from './lib/core-client';
import { buildPingRecord, classifyCoreResponse, redactUrl, validateIngestUrl, validateSecret } from './lib/ingest';
import { errorMessage, getConfig, getLastDelivery, getSecret, setConfig, setSecret, type DeliveryStatus } from './lib/store';

const resolver = new Resolver();

type Context = { workspaceId?: unknown; extension?: { workspace?: { uuid?: unknown } } };

function workspaceUuid(context: Context): string | undefined {
  const fromContext = context.workspaceId ?? context.extension?.workspace?.uuid;
  return typeof fromContext === 'string' && fromContext.length > 0 ? fromContext : undefined;
}

type AdminCheck = { ok: true; workspace: string } | { ok: false; error: string };

/** `owner` is Bitbucket's workspace admin role. */
async function requireAdmin(context: Context): Promise<AdminCheck> {
  const workspace = workspaceUuid(context);
  if (!workspace) return { ok: false, error: 'Open this page from workspace settings.' };
  try {
    const res = await api.asUser().requestBitbucket(route`/2.0/user/workspaces/${workspace}/permission`, {
      headers: { accept: 'application/json' },
    });
    if (res.ok) {
      const json = (await res.json()) as { permission?: unknown };
      if (json.permission === 'owner') return { ok: true, workspace };
    } else {
      await res.text().catch(() => '');
    }
    return { ok: false, error: 'Only workspace admins can view or change these settings.' };
  } catch (err) {
    // Rethrow so the platform can show its "Allow access" consent prompt to this user.
    if (err instanceof NeedsAuthenticationError) throw err;
    console.warn('relay settings: admin check failed', errorMessage(err));
    return { ok: false, error: 'Could not confirm that you are a workspace admin. Reload the page and try again.' };
  }
}

export interface SettingsView {
  ingestUrl: string;
  hasSecret: boolean;
  secretSavedAt?: string;
  updatedAt?: string;
  lastDelivery?: DeliveryStatus;
}

async function loadView(): Promise<SettingsView> {
  const [config, secret, lastDelivery] = await Promise.all([getConfig(), getSecret(), getLastDelivery()]);
  return {
    ingestUrl: config.ingestUrl ?? '',
    hasSecret: Boolean(secret),
    ...(config.secretSavedAt && { secretSavedAt: config.secretSavedAt }),
    ...(config.updatedAt && { updatedAt: config.updatedAt }),
    ...(lastDelivery && { lastDelivery }),
  };
}

resolver.define('getSettings', async ({ context }) => {
  const admin = await requireAdmin(context as Context);
  if (!admin.ok) return { ok: false, error: admin.error };
  return { ok: true, settings: await loadView() };
});

resolver.define('saveSettings', async ({ payload, context }) => {
  const admin = await requireAdmin(context as Context);
  if (!admin.ok) return { ok: false, error: admin.error };

  const input = (payload ?? {}) as { ingestUrl?: unknown; secret?: unknown };
  const fieldErrors: { ingestUrl?: string; secret?: string } = {};
  const url = validateIngestUrl(input.ingestUrl);
  if (!url.ok) fieldErrors.ingestUrl = url.message;

  // A blank secret keeps the saved one. The secret is never sent back to the page.
  const wantsSecret = typeof input.secret === 'string' && input.secret.trim().length > 0;
  const existing = await getSecret();
  let secret: string | undefined;
  if (wantsSecret) {
    const checked = validateSecret(input.secret);
    if (checked.ok) secret = checked.value;
    else fieldErrors.secret = checked.message;
  } else if (!existing) {
    fieldErrors.secret = 'Paste the shared secret from Doc Drift Sentinel settings.';
  }
  if (fieldErrors.ingestUrl || fieldErrors.secret || !url.ok) return { ok: false, fieldErrors };

  const now = new Date().toISOString();
  const config = await getConfig();
  if (secret) await setSecret(secret);
  await setConfig({
    ...config,
    ingestUrl: url.value,
    updatedAt: now,
    ...(secret && { secretSavedAt: now }),
  });
  console.log('relay settings: saved', { host: redactUrl(url.value), secretChanged: Boolean(secret) });
  return { ok: true, settings: await loadView() };
});

resolver.define('sendPing', async ({ context }) => {
  const admin = await requireAdmin(context as Context);
  if (!admin.ok) return { ok: false, error: admin.error };

  const [config, secret] = await Promise.all([getConfig(), getSecret()]);
  if (!config.ingestUrl || !secret) {
    return { ok: false, error: 'Save the core ingest URL and shared secret first.' };
  }
  try {
    const res = await postSigned(config.ingestUrl, secret, buildPingRecord(admin.workspace));
    const outcome = classifyCoreResponse(res.status);
    console.log('relay settings: ping', { host: redactUrl(config.ingestUrl), status: res.status, ms: res.elapsedMs });
    if (outcome.kind === 'accepted') {
      return { ok: true, status: res.status, elapsedMs: res.elapsedMs, host: redactUrl(config.ingestUrl) };
    }
    return { ok: false, status: res.status, error: outcome.message };
  } catch (err) {
    console.warn('relay settings: ping failed', errorMessage(err));
    return { ok: false, error: `Could not reach ${redactUrl(config.ingestUrl)}. ${errorMessage(err)}` };
  }
});

export const handler = resolver.getDefinitions();
