// P2 (V13-V15): Bitbucket PR #482 -> Merge -> the runbook flags. Phases:
//   node take_p2.mjs stills          PR overview and Files changed stills (no state change)
//   node take_p2.mjs explore-dialog  opens the Merge dialog, lists it, cancels (no state change)
//   node take_p2.mjs merge           records the merge, measures merge-to-flag, records the reload,
//                                    the tooltip, then the owner's footer comment
import fs from 'node:fs';
import path from 'node:path';
import { connect, devMasks, log, sleep, stage, HERE, RUNBOOK, nowIso } from './lib.mjs';
import { bb, byline, footerComments } from './rest.mjs';

const PR = Number(process.env.PR_ID || 482);
const PR_URL = `https://bitbucket.org/nano-soft-dev/payments-api/pull-requests/${PR}`;
const PAGE = '2720100';
const phase = process.argv[2];
const s = await connect();
const P_BB = `Bitbucket nano-soft-dev/payments-api PR #${PR}`;
const P_RB = 'Payments rollback runbook (PLAT 2720100)';

async function still(id, page, shows, extra = {}) {
  await s.still(id);
  return stage({ id, file: `captures/${id}.png`, page, shows, masks: await devMasks(s.page), ...extra });
}

const mergeButton = () => s.page.getByRole('button', { name: 'Merge', exact: true }).first();

if (phase === 'stills') {
  const pr = await bb('GET', `/repositories/nano-soft-dev/payments-api/pullrequests/${PR}`);
  if (pr.status !== 200 || pr.data.state !== 'OPEN') throw new Error(`PR #${PR} is ${pr.status} ${pr.data?.state}`);
  await s.goto(PR_URL, 7000);
  await mergeButton().waitFor({ state: 'visible', timeout: 60000 });
  await s.moveTo(1700, 900, { steps: 1, stepMs: 0 });
  await sleep(1200);
  await still(`p2-pr${PR}`, P_BB, `Bitbucket pull request #${PR} "${pr.data.title}", open, ${pr.data.source.branch.name} -> main, before the merge.`);
  await s.page.getByRole('tab', { name: /Files changed/ }).first().click().catch(async () => s.page.getByText('Files changed').first().click());
  await sleep(6000);
  await still(`p2-pr${PR}-files`, P_BB, `Files changed tab of PR #${PR}: deploy/helm/values.yaml (ROLLBACK_TIMEOUT -> ROLLBACK_TIMEOUT_SECS) and scripts/rollback.sh renamed to scripts/rollback-v2.sh.`);
  await s.page.evaluate(() => window.scrollBy(0, 700));
  await sleep(1500);
  await still(`p2-pr${PR}-files-2`, P_BB, `Files changed tab of PR #${PR}, scrolled to the rename diff.`);
  await s.page.getByRole('tab', { name: /Overview/ }).first().click().catch(async () => s.page.getByText('Overview').first().click());
  await sleep(3000);
  log(`Capture: P2 stills of PR #${PR} (overview, files changed). No state change.`);
}

if (phase === 'explore-dialog') {
  await s.goto(PR_URL, 7000);
  await mergeButton().click();
  await sleep(3000);
  const dlg = s.page.getByRole('dialog').first();
  console.log((await dlg.innerText()).slice(0, 1500));
  const ctrls = await dlg.evaluate((d) => [...d.querySelectorAll('button,input,select,textarea,[role=combobox]')].map((e) => ({ tag: e.tagName, t: (e.innerText || e.value || '').trim().slice(0, 80), type: e.type, checked: e.checked, aria: e.getAttribute('aria-label') })));
  console.log(JSON.stringify(ctrls));
  await s.still('_explore-merge-dialog');
  fs.renameSync(path.join(HERE, '../../public/captures/_explore-merge-dialog.png'), path.join(HERE, 'frames', '_explore-merge-dialog.png'));
  await dlg.getByRole('button', { name: 'Cancel' }).click();
  await sleep(1000);
  log(`Bitbucket: opened and cancelled the Merge dialog of PR #${PR} (exploration, no merge).`);
}

if (phase === 'merge') {
  const pr = await bb('GET', `/repositories/nano-soft-dev/payments-api/pullrequests/${PR}`);
  if (pr.status !== 200 || pr.data.state !== 'OPEN' || pr.data.title !== 'Rename rollback script and timeout variable') throw new Error(`PR #${PR}: ${pr.status} ${pr.data?.state} ${pr.data?.title}`);
  const before = await byline(PAGE);
  if (!before?.title?.startsWith('Verified')) throw new Error(`runbook byline is ${JSON.stringify(before)}`);
  await s.goto(PR_URL, 7000);
  const mb = mergeButton();
  await mb.waitFor({ state: 'visible', timeout: 60000 });
  await s.moveTo(1500, 800, { steps: 1, stepMs: 0 });
  await sleep(1000);

  // B: the merge.
  await s.startRecording('p2-merge');
  await sleep(1500);
  await s.click(await s.box(mb), 'Merge');
  const dlg = s.page.getByRole('dialog').first();
  await dlg.waitFor({ state: 'visible', timeout: 30000 });
  await sleep(1800);
  const dlgText = (await dlg.innerText()).replace(/\s+/g, ' ').slice(0, 600);
  await still('p2-merge-dialog', P_BB, `The Merge dialog of PR #${PR}.`, { notes: dlgText });
  const confirm = dlg.getByRole('button', { name: 'Merge', exact: true }).last();
  const cbox = await s.box(confirm);
  await s.click(cbox, 'Merge (confirm)');
  const tMerge = Date.now();
  // Poll the byline property from here on.
  const observations = [];
  let tFlag = null;
  let flagged = null;
  const poller = (async () => {
    while (!tFlag) {
      const t = Date.now();
      const b = await byline(PAGE).catch(() => null);
      observations.push({ atMs: t - tMerge, title: b?.title ?? null });
      if (b?.title?.startsWith('Possibly stale') || b?.title?.startsWith('Stale')) {
        tFlag = t;
        flagged = b;
        break;
      }
      if (t - tMerge > 15 * 60 * 1000) break;
      await sleep(Math.max(0, 1000 - (Date.now() - t)));
    }
  })();
  await s.page.getByText('Merged', { exact: true }).first().waitFor({ state: 'visible', timeout: 120000 });
  await sleep(2500);
  await still('p2-merged', P_BB, `PR #${PR} after the merge: state Merged.`);
  const recMerge = await s.stopRecording({ tailMs: 500 });
  const merged = await bb('GET', `/repositories/nano-soft-dev/payments-api/pullrequests/${PR}`);
  stage({
    id: 'p2-merge-rec', file: 'captures/p2-merge.mp4', kind: 'video', fps: 60, page: P_BB,
    shows: `PR #${PR} overview; click Merge; the Merge dialog; click Merge; the pull request reads Merged.`,
    clicks: recMerge.clicks, hovers: recMerge.hovers, masks: [],
    notes: `Merge confirm clicked at ${new Date(tMerge).toISOString()} (atMs ${tMerge - recMerge.stats.firstFrameEpochMs}). Bitbucket: state ${merged.data?.state}, updated_on ${merged.data?.updated_on}, merge commit ${merged.data?.merge_commit?.hash}. Source frames: ${JSON.stringify(recMerge.stats)}`,
  });
  log(`Bitbucket: MERGED PR #${PR} through the UI (Merge dialog confirm at ${new Date(tMerge).toISOString()}); API: ${merged.data?.state}, merge commit ${merged.data?.merge_commit?.hash}, updated_on ${merged.data?.updated_on}`);

  // C: the runbook, reloaded once the property flips.
  await s.goto(RUNBOOK, 4000);
  const badge = s.page.getByText(/Doc Drift \(Development\)/).first();
  await badge.waitFor({ state: 'visible', timeout: 60000 });
  await s.moveTo(1500, 700, { steps: 1, stepMs: 0 });
  const shownBefore = (await badge.textContent()).trim();
  await s.startRecording('p2-flag');
  await sleep(800);
  await still('p2-before-reload', P_RB, `The runbook opened right after the merge, before the flag: badge "${shownBefore}".`);
  await poller;
  if (!tFlag) throw new Error('no flag within 15 minutes');
  const secs = (tFlag - tMerge) / 1000;
  log(`Measured: runbook byline property read "${flagged.title}" ${secs.toFixed(1)} s after the Merge click (polled every 1 s; tooltip "${flagged.tooltip}")`);
  await sleep(1200);
  await s.page.reload({ waitUntil: 'domcontentloaded' });
  await s.page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
  const badge2 = s.page.getByText(/(Possibly stale|Stale) · Doc Drift \(Development\)/).first();
  await badge2.waitFor({ state: 'visible', timeout: 60000 });
  await sleep(2500);
  s.mouse = { x: 1500, y: 700 };
  await still('p2-flagged', P_RB, `After reload: the badge reads "${(await badge2.textContent()).trim()}".`);
  const bb2 = await s.box(badge2);
  await s.hover(bb2, 'Doc Drift badge (Possibly stale)');
  await sleep(1800);
  const tip = await s.page.getByRole('tooltip').first().innerText().catch(() => '');
  await still('p2-flagged-tooltip', P_RB, `Hovering the Possibly stale badge. Tooltip: "${tip}"`);
  await sleep(800);
  await s.moveTo(1500, 700);
  await sleep(600);
  const recFlag = await s.stopRecording({ tailMs: 500 });
  stage({
    id: 'p2-flag-rec', file: 'captures/p2-flag.mp4', kind: 'video', fps: 60, page: P_RB,
    shows: `The runbook right after the merge (badge "${shownBefore}"), waiting until the byline property flips, then a reload: "Possibly stale"; hover: tooltip.`,
    clicks: recFlag.clicks, hovers: recFlag.hovers, masks: await devMasks(s.page),
    notes: `Flag observed over REST ${secs.toFixed(1)} s after the Merge click; the reload starts about 1.2 s later. Source frames: ${JSON.stringify(recFlag.stats)}`,
  });
  const meta = JSON.parse(fs.readFileSync(path.join(HERE, 'meta.json'), 'utf8'));
  meta.measured = {
    ...meta.measured,
    mergeToFlagSeconds: Math.round(secs),
    mergeToFlagExact: +secs.toFixed(1),
    mergeClickAt: new Date(tMerge).toISOString(),
    flaggedAt: new Date(tFlag).toISOString(),
    method: 'From the click on the Merge dialog\'s Merge button (Bitbucket UI, PR #482) to the first REST read (polled every 1 s) of the runbook\'s byline content property dds-byline-7f3c2a whose title starts with "Possibly stale". Development install, demo site, 2026-11-13.',
    bitbucketMerge: { state: merged.data?.state, mergeCommit: merged.data?.merge_commit?.hash, updatedOn: merged.data?.updated_on },
    observations,
  };
  fs.writeFileSync(path.join(HERE, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

  // D: the owner's footer comment.
  let comment = null;
  for (let i = 0; i < 90 && !comment; i++) {
    const list = await footerComments(PAGE);
    comment = list.find((c) => new Date(c.version?.createdAt || 0).getTime() > tMerge - 5000 && /PR #\d+/.test(c.body?.storage?.value || '')) || null;
    if (!comment) await sleep(2000);
  }
  if (comment) {
    const tComment = new Date(comment.version.createdAt).getTime();
    log(`Confluence: the app posted footer comment ${comment.id} on the runbook ${((tComment - tMerge) / 1000).toFixed(0)} s after the merge: ${(comment.body?.storage?.value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200)}`);
    meta.measured.commentAfterMergeSeconds = Math.round((tComment - tMerge) / 1000);
    meta.measured.commentId = comment.id;
    fs.writeFileSync(path.join(HERE, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  } else {
    log('Confluence: no footer comment seen within 3 minutes of the merge');
  }
  console.log(JSON.stringify({ secs, comment: comment?.id }));
}

await s.close();
process.exit(0);
