// P4 (V19-V22) on the flagged runbook. Phases, run one at a time:
//   review    footer comment -> back up -> badge -> review panel (why, changes, affected section) -> quick fix applied
//   propose   review panel -> Propose fix -> Rovo (Drift Reviewer, pre-filled prompt) -> send -> confirm CREATE -> reply
//   accept    review panel -> the draft as a diff -> Accept fix -> reload -> Verified (+ tooltip)
//   history   page history with the Doc Drift version messages
import fs from 'node:fs';
import path from 'node:path';
import { connect, devMasks, log, sleep, stage, HERE, RUNBOOK } from './lib.mjs';
import { pageVersion } from './rest.mjs';

const P = 'Payments rollback runbook (PLAT 2720100)';
const phase = process.argv[2];
const s = await connect();
async function still(id, shows, extra = {}) {
  await s.still(id);
  return stage({ id, file: `captures/${id}.png`, page: P, shows, masks: await devMasks(s.page), ...extra });
}
const badge = () => s.page.getByText(/Doc Drift \(Development\)/).first();
const dialog = () => s.page.getByRole('dialog').first();
const MX = 960; // modal centre x for wheel scrolling
const MY = 600;

async function openPanel(label) {
  await s.click(await s.box(badge()), label);
  await dialog().getByText(/What changed|Anchors/).first().waitFor({ state: 'visible', timeout: 60000 });
  await sleep(2500);
}

if (phase === 'review') {
  await s.goto(RUNBOOK, 6000);
  await badge().waitFor({ state: 'visible', timeout: 60000 });
  await s.moveTo(1500, 600, { steps: 1, stepMs: 0 });
  await sleep(1000);
  await s.startRecording('p4-review');
  await sleep(1200);
  const comment = s.page.getByText(/Review in the Doc Drift badge/).first();
  await s.moveTo(1100, 600);
  await s.wheelTo(comment, { x: 1100, y: 600, top: 300, bottom: 900 });
  await sleep(1800);
  const ctext = await comment.locator('xpath=ancestor::*[4]').innerText().catch(() => '');
  await still('p4-comment', 'The footer comment Doc Drift Sentinel posted after the merge, mentioning the page owner.', { notes: ctext.replace(/\s+/g, ' ').slice(0, 400) });
  await sleep(600);
  await s.wheelTo(badge(), { x: 1100, y: 600, top: 150, bottom: 700 });
  await sleep(1000);
  await openPanel('Doc Drift badge (Possibly stale)');
  const text1 = (await dialog().innerText()).replace(/\s+/g, ' ');
  await still('p4-panel', 'The review panel opens: header with the state and the why sentence, "What changed".', { notes: text1.slice(0, 1200) });
  fs.writeFileSync(path.join(HERE, 'p4-panel.txt'), await dialog().innerText());
  const affected = dialog().getByText('Affected section', { exact: true }).first();
  await s.moveTo(MX, MY);
  await s.wheelTo(affected, { x: MX, y: MY, top: 120, bottom: 500 });
  await sleep(1500);
  await still('p4-affected', 'The review panel scrolled to "Affected section": the step that names the changed path and identifier.');
  const qf = dialog().getByRole('button', { name: /^Replace in \d+ places?$|^Replace$/ }).first();
  const qb = await s.wheelTo(qf, { x: MX, y: MY, top: 300, bottom: 1000 });
  await sleep(1500);
  await still('p4-quickfix', 'The rename quick fix: Replace scripts/rollback.sh with scripts/rollback-v2.sh. "Suggested from PR #482. No AI used."');
  await s.click(qb, 'Quick fix: Replace');
  const tQf = Date.now();
  await dialog().getByRole('button', { name: 'Reload page' }).first().waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
  await sleep(2500);
  const notice = await dialog().innerText();
  await s.wheelTo(dialog().getByRole('button', { name: 'Reload page' }).first(), { x: MX, y: MY, top: 150, bottom: 950 });
  await sleep(1200);
  await still('p4-quickfix-done', 'After the quick fix: the panel confirms the page was edited (a new version naming PR #482).', { notes: notice.replace(/\s+/g, ' ').slice(0, 900) });
  const rec = await s.stopRecording({ tailMs: 500 });
  const v = await pageVersion('2720100');
  stage({ id: 'p4-review-rec', file: 'captures/p4-review.mp4', kind: 'video', fps: 60, page: P, shows: 'Scroll to the owner comment, back up, open the badge: review panel (why, what changed, affected section), the rename quick fix, Replace.', clicks: rec.clicks, hovers: rec.hovers, masks: await devMasks(s.page), notes: `Quick fix clicked at ${new Date(tQf).toISOString()}; page now version ${v?.number} "${v?.message}". Source frames: ${JSON.stringify(rec.stats)}` });
  log(`Confluence: P4 quick fix applied from the review panel at ${new Date(tQf).toISOString()}: runbook now v${v?.number} "${v?.message}"`);
}

if (phase === 'propose') {
  await s.goto(RUNBOOK, 6000);
  await badge().waitFor({ state: 'visible', timeout: 60000 });
  if (await s.page.locator('[data-testid="rovo-chat-header-close-button"]').count()) {
    await s.page.locator('[data-testid="rovo-chat-header-close-button"]').first().click();
    await sleep(1200);
  }
  await s.moveTo(1500, 600, { steps: 1, stepMs: 0 });
  await sleep(800);
  await s.startRecording('p4-propose');
  await sleep(1000);
  await openPanel('Doc Drift badge (Possibly stale)');
  fs.writeFileSync(path.join(HERE, 'p4-panel-after-qf.txt'), await dialog().innerText());
  const pf = dialog().getByRole('button', { name: 'Propose fix', exact: true }).first();
  await s.moveTo(MX, MY);
  const pb = await s.wheelTo(pf, { x: MX, y: MY, top: 300, bottom: 950 });
  await sleep(1200);
  await still('p4-propose-button', 'The remaining change (the timeout variable) with "Propose fix": "Drift Reviewer drafts the change. Nothing changes until you accept it."');
  await s.click(pb, 'Propose fix');
  const panel = s.page.locator('[data-testid="ConversationAssistant"]').first();
  await panel.waitFor({ state: 'visible', timeout: 60000 });
  await sleep(4000);
  const input = s.page.getByRole('textbox', { name: /Ask, @mention/ }).first();
  const prompt = await input.innerText().catch(() => '');
  await still('p4-rovo-prompt', `Rovo opened from Propose fix: agent Drift Reviewer, the prompt pre-filled: "${prompt.trim()}"`);
  await s.click(await s.box(input), 'Chat input');
  await sleep(300);
  await s.page.keyboard.press('End');
  const tSend = Date.now();
  await s.page.keyboard.press('Enter');
  if (s.rec) s.rec.clicks.push({ x: null, y: null, label: 'Enter (send)', atEpochMs: tSend });
  // Confirm each CREATE action the agent asks for, then wait for the reply to settle.
  const confirms = [];
  let last = '';
  let stableSince = Date.now();
  for (let i = 0; i < 600; i++) {
    await sleep(500);
    const btn = panel.getByRole('button', { name: /^(Confirm|Allow|Yes|Approve|Continue|Run)$/ }).first();
    if (await btn.count() && await btn.isVisible().catch(() => false)) {
      await sleep(1500);
      const ctx = (await panel.innerText()).slice(-500).replace(/\s+/g, ' ');
      const k = confirms.length + 1;
      await still(`p4-rovo-confirm-${k}`, `Rovo asks to confirm the Drift Reviewer action (CREATE, submit-fix-proposal), confirmation ${k}.`, { notes: ctx });
      const cb = await s.box(btn);
      await s.click(cb, `Confirm action ${k}`);
      confirms.push({ k, at: new Date().toISOString(), label: await btn.innerText().catch(() => '') , ctx });
      log(`Rovo: confirmed Drift Reviewer action ${k} (${ctx.slice(-160)})`);
      stableSince = Date.now();
      continue;
    }
    const txt = await panel.innerText().catch(() => '');
    const stop = await panel.getByRole('button', { name: /^Stop/ }).count().catch(() => 0);
    if (txt !== last) {
      last = txt;
      stableSince = Date.now();
    }
    if (!stop && Date.now() - stableSince > 9000 && Date.now() - tSend > 20000) break;
  }
  await sleep(800);
  await still('p4-rovo-drafted', 'Drift Reviewer\'s reply after storing the draft(s): the page is unchanged until someone accepts.');
  fs.writeFileSync(path.join(HERE, 'p4-propose-answer.txt'), last);
  const rec = await s.stopRecording({ tailMs: 500 });
  stage({ id: 'p4-propose-rec', file: 'captures/p4-propose.mp4', kind: 'video', fps: 60, page: `${P}, review panel and Rovo`, shows: 'Review panel: Propose fix -> Rovo opens with Drift Reviewer and the pre-filled prompt -> send -> the agent drafts; CREATE confirmations -> reply.', clicks: rec.clicks, hovers: rec.hovers, masks: await devMasks(s.page), notes: `Sent at atMs ${tSend - rec.stats.firstFrameEpochMs}. Confirmations: ${JSON.stringify(confirms.map((c) => c.at))}. Reply text: tools/capture/p4-propose-answer.txt. Source frames: ${JSON.stringify(rec.stats)}` });
  log(`Rovo: Propose fix sent the pre-filled prompt to Drift Reviewer; ${confirms.length} confirmation(s) clicked; reply settled.`);
  console.log(last.slice(-2500));
}

if (phase === 'confirm') {
  // Rovo is open on the runbook with Drift Reviewer's "Please review" card (two Submit fix proposal actions).
  const panel = s.page.locator('[data-testid="ConversationAssistant"]').first();
  await panel.waitFor({ state: 'visible', timeout: 30000 });
  s.mouse = { x: 1700, y: 450 };
  await s.moveTo(1700, 450, { steps: 1, stepMs: 0 });
  await sleep(800);
  await still('p4-rovo-review-card', 'Rovo after Propose fix: the prompt the button sent to Drift Reviewer, and the "Please review" card with two "Submit fix proposal" actions (blocks b21 and b22, section Steps, rationale "PR #482 renamed ROLLBACK_TIMEOUT to ROLLBACK_TIMEOUT_SECS.").');
  await s.startRecording('p4-confirm');
  await sleep(1000);
  const confirm = panel.getByRole('button', { name: 'Confirm selected' }).first();
  // Scroll through both proposals slowly, then to the button.
  await s.wheel(260, { x: 1700, y: 450 });
  await sleep(1400);
  await still('p4-rovo-review-card-2', 'The "Please review" card scrolled: the second proposal (block b22, the code block).');
  const cb = await s.wheelTo(confirm, { x: 1700, y: 450, top: 120, bottom: 690 });
  await sleep(1200);
  await still('p4-rovo-confirm', 'The bottom of the card: "Confirm selected" and "Cancel" (the CREATE confirmation Rovo asks for before the agent stores drafts).');
  await s.click(cb, 'Confirm selected');
  const tConfirm = Date.now();
  let last = '';
  let stableSince = Date.now();
  for (let i = 0; i < 400; i++) {
    await sleep(500);
    const txt = await panel.innerText().catch(() => '');
    const stop = await panel.getByRole('button', { name: /^Stop/ }).count().catch(() => 0);
    if (txt !== last) {
      last = txt;
      stableSince = Date.now();
    }
    if (!stop && Date.now() - stableSince > 8000 && Date.now() - tConfirm > 12000) break;
  }
  await sleep(600);
  await still('p4-rovo-drafted', 'Drift Reviewer\'s reply after the confirmation: the drafts are stored for review; the page is unchanged until someone accepts.');
  fs.writeFileSync(path.join(HERE, 'p4-confirm-answer.txt'), last);
  const rec = await s.stopRecording({ tailMs: 500 });
  stage({ id: 'p4-confirm-rec', file: 'captures/p4-confirm.mp4', kind: 'video', fps: 60, page: `${P}, Rovo with Drift Reviewer`, shows: 'The Please review card: scroll through the two Submit fix proposal actions, click "Confirm selected", Drift Reviewer replies.', clicks: rec.clicks, hovers: rec.hovers, masks: await devMasks(s.page), notes: `Confirm clicked at atMs ${tConfirm - rec.stats.firstFrameEpochMs}. Reply text: tools/capture/p4-confirm-answer.txt. Source frames: ${JSON.stringify(rec.stats)}` });
  log(`Rovo: clicked "Confirm selected" on Drift Reviewer's two Submit fix proposal actions (CREATE) at ${new Date(tConfirm).toISOString()}; reply settled.`);
  console.log(last.slice(-2000));
}

if (phase === 'accept') {
  await s.goto(RUNBOOK, 6000);
  await badge().waitFor({ state: 'visible', timeout: 60000 });
  if (await s.page.locator('[data-testid="rovo-chat-header-close-button"]').count()) {
    await s.page.locator('[data-testid="rovo-chat-header-close-button"]').first().click();
    await sleep(1200);
  }
  await s.moveTo(1500, 600, { steps: 1, stepMs: 0 });
  await sleep(800);
  await s.startRecording('p4-accept');
  await sleep(1000);
  await openPanel('Doc Drift badge (Possibly stale)');
  fs.writeFileSync(path.join(HERE, 'p4-panel-drafts.txt'), await dialog().innerText());
  const pfx = dialog().getByText('Proposed fix', { exact: true }).first();
  await s.moveTo(MX, MY);
  await s.wheelTo(pfx, { x: MX, y: MY, top: 120, bottom: 400 });
  await sleep(1500);
  await still('p4-draft-diff', 'The drafted fix in the review panel, shown as a diff, waiting for a person.');
  const accept = dialog().getByRole('button', { name: 'Accept fix', exact: true }).first();
  const ab = await s.wheelTo(accept, { x: MX, y: MY, top: 300, bottom: 1000 });
  await sleep(1200);
  await still('p4-accept-button', 'The footer with "Accept fix" (primary).');
  await s.click(ab, 'Accept fix');
  const tAcc = Date.now();
  await dialog().getByText(/Accepted/).first().waitFor({ state: 'visible', timeout: 90000 });
  await sleep(2000);
  await s.wheelTo(dialog().getByText(/Accepted/).first(), { x: MX, y: MY, top: 150, bottom: 900 });
  await sleep(1000);
  const notice = (await dialog().innerText()).replace(/\s+/g, ' ');
  await still('p4-accepted', 'After Accept fix: the panel confirms a new page version names PR #482.', { notes: notice.slice(0, 900) });
  const reload = dialog().getByRole('button', { name: 'Reload page' }).first();
  if (await reload.count()) await s.click(await s.box(reload), 'Reload page');
  else await s.page.reload();
  await s.page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
  const b2 = s.page.getByText(/Verified · Doc Drift \(Development\)/).first();
  await b2.waitFor({ state: 'visible', timeout: 90000 });
  await sleep(2500);
  s.mouse = { x: 1500, y: 600 };
  await still('p4-verified', 'After reload: badge "Verified · Doc Drift (Development)"; the page text now reads rollback-v2.sh and ROLLBACK_TIMEOUT_SECS.');
  await s.hover(await s.box(b2), 'Doc Drift badge (Verified)');
  await sleep(1800);
  const tip = await s.page.getByRole('tooltip').first().innerText().catch(() => '');
  await still('p4-verified-tooltip', `Hovering the Verified badge. Tooltip: "${tip}"`);
  await s.moveTo(1500, 600);
  await sleep(600);
  // The edited step 2.
  const step = s.page.getByText(/rollback-v2\.sh --timeout/).first();
  await s.moveTo(1100, 600);
  await s.wheelTo(step, { x: 1100, y: 600, top: 350, bottom: 750 });
  await sleep(1800);
  await still('p4-step2-fixed', 'Step 2 of the runbook after the accepted fixes.');
  const rec = await s.stopRecording({ tailMs: 500 });
  const v = await pageVersion('2720100');
  stage({ id: 'p4-accept-rec', file: 'captures/p4-accept.mp4', kind: 'video', fps: 60, page: P, shows: 'Review panel: the draft diff, Accept fix, accepted; reload; badge Verified (tooltip); step 2 now reads rollback-v2.sh and ROLLBACK_TIMEOUT_SECS.', clicks: rec.clicks, hovers: rec.hovers, masks: await devMasks(s.page), notes: `Accept fix clicked at ${new Date(tAcc).toISOString()}; page now version ${v?.number} "${v?.message}". Tooltip "${tip}". Source frames: ${JSON.stringify(rec.stats)}` });
  log(`Confluence: P4 Accept fix at ${new Date(tAcc).toISOString()}; runbook v${v?.number} "${v?.message}"; badge Verified; tooltip "${tip}"`);
}

if (phase === 'history') {
  await s.goto('https://one-atlas-jzzf.atlassian.net/wiki/pages/viewpreviousversions.action?pageId=2720100', 8000);
  await s.moveTo(1850, 1000, { steps: 1, stepMs: 0 });
  await sleep(1500);
  const txt = (await s.page.locator('body').innerText()).replace(/\s+/g, ' ');
  await still('p4-history', 'Page history of the runbook: the Doc Drift versions with their messages naming PR #482.', { notes: (txt.match(/Doc Drift[^.]*PR #\d+/g) || []).join(' | ') });
  log(`Capture: P4 page history still. Messages: ${(txt.match(/Doc Drift[^.]*PR #\d+/g) || []).join(' | ')}`);
}

await s.close();
process.exit(0);
