// Spike S3/S4/S11. Throwaway. Fake freshness result, real asUser() page read.
import api, { route } from '@forge/api';

const CONSENT_MSG =
  'Grant Doc Drift Sentinel access in Connected apps, then retry.';

function resolvePageId(payload) {
  if (payload.pageId && /^\d+$/.test(String(payload.pageId).trim())) {
    return { pageId: String(payload.pageId).trim(), via: 'input.pageId' };
  }
  const m = payload.pageUrl && String(payload.pageUrl).match(/\/pages\/(\d+)/);
  if (m) return { pageId: m[1], via: 'input.pageUrl' };
  const ctxId = payload.context?.confluence?.contentId;
  if (ctxId) return { pageId: String(ctxId), via: 'context.confluence.contentId' };
  return { pageId: null, via: payload.title ? 'title-only (not resolved in spike)' : 'none' };
}

// Log everything except the inputs' free text, so we can see the invocation shape
// for Rovo chat vs. Rovo Studio vs. external MCP (S3).
function logInvocation(tag, payload, context) {
  const { context: payloadContext, ...inputs } = payload ?? {};
  console.log(`[${tag}] inputs=${JSON.stringify(inputs)}`);
  console.log(`[${tag}] payload.context=${JSON.stringify(payloadContext ?? null)}`);
  const c = context ?? {};
  console.log(
    `[${tag}] context keys=${JSON.stringify(Object.keys(c))} accountId=${c.accountId ?? c.principal?.accountId ?? 'none'} ` +
      `accountType=${c.accountType ?? 'n/a'} cloudId=${c.cloudId ?? 'n/a'} moduleKey=${c.moduleKey ?? 'n/a'} ` +
      `installContext=${c.installContext ?? 'n/a'} env=${c.environmentType ?? 'n/a'}`
  );
  // Full dump (no tokens are present in the context object) for shape discovery.
  console.log(`[${tag}] context.raw=${JSON.stringify(c)}`);
}

export async function checkPageFreshness(payload, context) {
  logInvocation('check-page-freshness', payload, context);
  const { pageId, via } = resolvePageId(payload ?? {});

  if (!pageId) {
    console.log('[check-page-freshness] asUser=skipped reason=no-page-id');
    return {
      pageId: null,
      title: null,
      status: 'unknown',
      guidance: 'Could not identify the page. Pass a numeric pageId or a page URL.',
      spike: { resolvedVia: via, asUser: 'skipped' },
    };
  }

  let asUser = 'not-run';
  let httpStatus = null;
  let title = null;
  try {
    const res = await api
      .asUser()
      .requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
        headers: { Accept: 'application/json' },
      });
    httpStatus = res.status;
    if (res.ok) {
      const body = await res.json();
      title = body.title ?? null;
      asUser = 'ok';
    } else {
      asUser = `http-${res.status}`;
      const text = await res.text();
      console.log(`[check-page-freshness] asUser body=${text.slice(0, 300)}`);
    }
  } catch (err) {
    // Missing user consent (D21) surfaces as NeedsAuthenticationError:
    // err.name === 'NEEDS_AUTHENTICATION_ERR', err.status === 401.
    asUser = `threw:${err?.name ?? 'Error'}`;
    httpStatus = err?.status ?? null;
    console.log(
      `[check-page-freshness] asUser threw name=${err?.name} status=${err?.status} message=${err?.message} ` +
        `serviceKey=${err?.serviceKey ?? 'n/a'} options=${JSON.stringify(err?.options ?? null)}`
    );
  }
  console.log(`[check-page-freshness] asUser=${asUser} httpStatus=${httpStatus} pageId=${pageId} via=${via}`);

  if (asUser.startsWith('threw:NEEDS_AUTHENTICATION_ERR')) {
    return {
      pageId,
      title: null,
      status: 'unknown',
      error: 'consent_required',
      guidance: CONSENT_MSG,
      spike: { resolvedVia: via, asUser, httpStatus },
    };
  }
  if (asUser !== 'ok') {
    // 403/404: the caller cannot view the page, or it does not exist. No title.
    return {
      pageId,
      title: null,
      status: 'unknown',
      guidance: 'You cannot view this page, or it does not exist. Do not cite it.',
      spike: { resolvedVia: via, asUser, httpStatus },
    };
  }

  // Fake freshness result (spike).
  return {
    pageId,
    title,
    status: 'possibly_stale',
    verifiedAt: '2026-11-02T10:00:00Z',
    verifiedBy: 'spike-user',
    openDrift: [
      {
        source: 'bitbucket',
        ref: 'PR #482',
        summary: 'Changed src/payments/retry.ts, which this page is anchored to',
        score: 0.82,
        at: '2026-11-10T14:00:00Z',
      },
    ],
    guidance:
      'Do not present steps from this page as current. Cite with caveat: anchors changed by PR #482 on 2026-11-10.',
    spike: { resolvedVia: via, asUser, httpStatus },
  };
}

export async function recordVerification(payload, context) {
  logInvocation('record-verification', payload, context);
  console.log(`[record-verification] would record pageId=${payload?.pageId} note=${payload?.note ?? ''}`);
  return { ok: true, verifiedAt: new Date().toISOString(), spike: 'logged only, nothing written' };
}
