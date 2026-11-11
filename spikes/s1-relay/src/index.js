// Spike S1, relay side: on a merged PR, log the event shape, try several ways to get the changed
// files, build a compact change record, sign it and POST it to the core app's web trigger.
// Never logs DDS_HMAC_SECRET or the signature. DDS_CORE_URL is logged by host only.
import api, { route, routeFromAbsolute, fetch } from '@forge/api';
import { createHmac } from 'node:crypto';

// Run a Bitbucket call and log what happened, so the spike shows which form works.
async function tryBitbucket(label, r, init) {
  try {
    const res = await api.asApp().requestBitbucket(r, init);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    console.log(`bb[${label}]`, {
      status: res.status,
      redirected: res.redirected,
      url: res.url,
      location: res.headers.get('location'),
      bytes: text.length,
      values: Array.isArray(json?.values) ? json.values.length : undefined,
      next: json?.next ?? undefined,
      sample: json ? JSON.stringify(json).slice(0, 400) : text.slice(0, 200),
    });
    return { status: res.status, json, text };
  } catch (err) {
    console.log(`bb[${label}] threw`, String(err && err.message ? err.message : err));
    return { status: 0, error: String(err) };
  }
}

function toFile(d) {
  return {
    status: d.status,
    old: d.old?.path ?? null,
    new: d.new?.path ?? null,
    added: d.lines_added,
    removed: d.lines_removed,
  };
}

export async function onMerged(event, context) {
  // 1. The real payload, in full (no secrets in it), plus the context keys.
  console.log('event (full):', JSON.stringify(event));
  console.log('context keys:', Object.keys(context || {}), 'workspaceId:', context?.workspaceId,
    'installContext:', context?.installContext);

  const ws = event.workspace?.uuid;
  const repo = event.repository?.uuid;
  const pr = event.pullrequest || {};
  const src = pr.source?.commit?.hash;
  const dst = pr.destination?.commit?.hash;
  const merge = pr.mergeCommit?.hash;

  // 2. Default branch.
  const repoInfo = await tryBitbucket('mainbranch',
    route`/2.0/repositories/${ws}/${repo}?fields=mainbranch.name,full_name,slug`);
  const mainbranch = repoInfo.json?.mainbranch?.name;

  // 3. REST PR object, to compare its hashes with the event's.
  const prRest = await tryBitbucket('pr-rest',
    route`/2.0/repositories/${ws}/${repo}/pullrequests/${pr.id}?fields=source.commit.hash,destination.commit.hash,merge_commit.hash,state`);

  // 4. Diffstat, every form.
  const viaPr = await tryBitbucket('pr-diffstat-follow',
    route`/2.0/repositories/${ws}/${repo}/pullrequests/${pr.id}/diffstat`);
  await tryBitbucket('pr-diffstat-manual',
    route`/2.0/repositories/${ws}/${repo}/pullrequests/${pr.id}/diffstat`, { redirect: 'manual' });
  const viaRange = await tryBitbucket('range-two-interp',
    route`/2.0/repositories/${ws}/${repo}/diffstat/${src}..${dst}?topic=true&pagelen=500`);
  // Known (S1 run 1): route() throws "Disallowing path manipulation attempt" for one interpolation
  // holding `a..b`. It throws synchronously, so it must be inside a try.
  try {
    await tryBitbucket('range-one-interp',
      route`/2.0/repositories/${ws}/${repo}/diffstat/${`${src}..${dst}`}?topic=true&pagelen=500`);
  } catch (err) {
    console.log('bb[range-one-interp] route() threw', String(err && err.message ? err.message : err));
  }
  const viaMerge = await tryBitbucket('merge-commit',
    route`/2.0/repositories/${ws}/${repo}/diffstat/${merge}?pagelen=500`);
  const diff = await tryBitbucket('range-diff',
    route`/2.0/repositories/${ws}/${repo}/diff/${src}..${dst}?topic=true`);
  if (viaPr.json?.next) {
    await tryBitbucket('next-page', routeFromAbsolute(`${viaPr.json.next}`));
  }

  let diffstatVia = null;
  let values = [];
  for (const [name, r] of [['range', viaRange], ['pr-follow', viaPr], ['merge-commit', viaMerge]]) {
    if (r.status === 200 && Array.isArray(r.json?.values) && r.json.values.length > 0) {
      diffstatVia = name;
      values = r.json.values;
      break;
    }
  }

  // 5. Compact change record.
  const record = {
    v: 1,
    source: 'bitbucket',
    deliveredAt: new Date().toISOString(),
    eventTimestamp: event.timestamp,
    workspace: { uuid: ws },
    repo: { uuid: repo, slug: event.repository?.slug ?? repoInfo.json?.slug ?? null, mainbranch },
    pr: {
      id: pr.id,
      title: pr.title?.value ?? null,
      author: pr.author?.displayName ?? null,
      destinationBranch: pr.destination?.branch,
      src, dst, merge,
      restDst: prRest.json?.destination?.commit?.hash,
    },
    diffstatVia,
    diffBytes: diff.text ? diff.text.length : null,
    files: values.map(toFile),
  };

  // 6. Sign and POST.
  const url = process.env.DDS_CORE_URL;
  const secret = process.env.DDS_HMAC_SECRET;
  if (!url || !secret) {
    console.error('relay: DDS_CORE_URL or DDS_HMAC_SECRET not set');
    return;
  }
  const body = JSON.stringify(record);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  console.log('relay: POST', { host: new URL(url).host, bodyBytes: body.length, files: record.files.length, diffstatVia });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dds-timestamp': timestamp, 'x-dds-signature': signature },
      body,
    });
    const resText = await res.text();
    console.log('relay: core responded', {
      status: res.status,
      body: resText.slice(0, 300),
      ratelimitRemaining: res.headers.get('x-ratelimit-remaining'),
    });
  } catch (err) {
    console.error('relay: POST threw', String(err && err.message ? err.message : err));
  }

  // 7. Same POST with a bad signature, to see the 401 from the relay side too.
  try {
    const bad = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dds-timestamp': timestamp, 'x-dds-signature': 'sha256=00' },
      body,
    });
    console.log('relay: bad-signature POST status', bad.status);
  } catch (err) {
    console.error('relay: bad POST threw', String(err));
  }
}
