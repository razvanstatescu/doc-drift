// P3 (V16-V17): on the flagged runbook, open Rovo, pick Drift Reviewer, ask the question, record the
// answer streaming in, then stills of the full answer. node take_p3.mjs <take-id> ["question"]
import fs from 'node:fs';
import path from 'node:path';
import { connect, devMasks, log, sleep, stage, HERE, RUNBOOK } from './lib.mjs';

const id = process.argv[2] || 'p3-rovo';
const question = process.argv[3] || 'How do I roll back payments-api?';
const P = 'Payments rollback runbook (PLAT 2720100), Rovo chat with Drift Reviewer';
const s = await connect();
const panel = () => s.page.locator('[data-testid="ConversationAssistant"]').first();
async function still(sid, shows, extra = {}) {
  await s.still(sid);
  return stage({ id: sid, file: `captures/${sid}.png`, page: P, shows, masks: await devMasks(s.page), ...extra });
}

await s.goto(RUNBOOK, 6000);
await s.page.getByText(/Doc Drift \(Development\)/).first().waitFor({ state: 'visible', timeout: 60000 });
// Off camera: close any open menu, a fresh chat when asked (a second attempt), then start with the Rovo panel closed.
await s.page.keyboard.press('Escape');
await sleep(600);
if (process.argv.includes('--new-chat')) {
  if (!(await s.page.locator('[data-testid="rovo-chat-header-close-button"]').count())) {
    await s.page.getByRole('button', { name: 'Ask Rovo' }).first().click();
    await sleep(4000);
  }
  const nc = s.page.locator('[data-testid="rovo-chat-header-new-chat-button"]').first();
  if ((await nc.count()) && (await nc.isEnabled())) {
    await nc.click();
    await sleep(2500);
    log('Rovo: started a new chat (off camera) before a second attempt');
  }
}
if (await s.page.locator('[data-testid="rovo-chat-header-close-button"]').count()) {
  await s.page.locator('[data-testid="rovo-chat-header-close-button"]').first().click();
  await sleep(1500);
}
await s.moveTo(1200, 700, { steps: 1, stepMs: 0 });
await sleep(800);
const badgeText = (await s.page.getByText(/Doc Drift \(Development\)/).first().textContent()).trim();

await s.startRecording(id);
await sleep(1200);
await s.click(await s.box(s.page.getByRole('button', { name: 'Ask Rovo' }).first()), 'Ask Rovo');
await panel().waitFor({ state: 'visible', timeout: 30000 });
await sleep(2500);
// Dismiss the phone promo card if it shows (clutter; a per-user dismissal).
const promo = panel().getByRole('button', { name: 'Dismiss' });
if (await promo.count()) {
  await s.click(await s.box(promo.first()), 'Dismiss promo');
  await sleep(800);
}
await s.click(await s.box(s.page.locator('[data-testid="agent-title-pressable"]').first()), 'Change agent (Rovo)');
const search = s.page.getByPlaceholder('Search agents');
await search.waitFor({ state: 'visible', timeout: 20000 });
await sleep(700);
await s.click(await s.box(search), 'Search agents');
await s.type('Drift', { delay: 110 });
await sleep(1500);
const item = s.page.getByText('Drift Reviewer', { exact: true }).filter({ visible: true }).first();
await item.waitFor({ state: 'visible', timeout: 20000 });
await s.click(await s.box(item), 'Drift Reviewer');
await sleep(3000);
const agentTitle = (await s.page.locator('[data-testid="agent-title-pressable"]').first().innerText()).trim();
await still(`${id}-agent`, `Rovo panel with the agent switched to "${agentTitle}" on the runbook (context: the page).`);

const input = s.page.getByRole('textbox', { name: /Ask, @mention/ }).first();
await s.click(await s.box(input), 'Chat input');
await sleep(400);
await s.type(question, { delay: 70 });
await sleep(1200);
await still(`${id}-question`, `The question typed to Drift Reviewer: "${question}".`);
const tAsk = Date.now();
await s.page.keyboard.press('Enter');
if (s.rec) s.rec.clicks.push({ x: null, y: null, label: 'Enter (send)', atEpochMs: tAsk });

// Follow the answer until it is stable for 7 s and no Stop button is shown.
let last = '';
let stableSince = Date.now();
const samples = [];
for (let i = 0; i < 400; i++) {
  await sleep(500);
  const txt = await panel().innerText().catch(() => '');
  const stop = await panel().getByRole('button', { name: /^Stop/ }).count().catch(() => 0);
  if (txt !== last) {
    last = txt;
    stableSince = Date.now();
    samples.push({ atMs: Date.now() - tAsk, len: txt.length });
  }
  if (!stop && Date.now() - stableSince > 7000 && Date.now() - tAsk > 12000) break;
}
const tDone = stableSince;
await sleep(800);
await still(`${id}-answer`, 'Drift Reviewer\'s full answer (bottom of the conversation, as the panel shows it after streaming).');
const rec = await s.stopRecording({ tailMs: 600 });
fs.writeFileSync(path.join(HERE, `${id}-answer.txt`), last);

// Stills of the whole answer: scroll the conversation from the top.
const scroller = await panel().evaluateHandle((root) => {
  const all = [...root.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
  return all.sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || null;
});
const dims = await scroller.evaluate((e) => (e ? { sh: e.scrollHeight, ch: e.clientHeight } : null)).catch(() => null);
const pages = [];
if (dims) {
  let k = 0;
  for (let top = 0; top < dims.sh; top += Math.max(200, dims.ch - 80)) {
    await scroller.evaluate((e, t) => e.scrollTo(0, t), top);
    await sleep(700);
    const sid = `${id}-answer-part${++k}`;
    await still(sid, `Drift Reviewer's answer, part ${k} (conversation scrolled to ${top} px of ${dims.sh}).`);
    pages.push(sid);
    if (top + dims.ch >= dims.sh) break;
  }
  await scroller.evaluate((e) => e.scrollTo(0, e.scrollHeight));
}
stage({
  id: `${id}-rec`, file: `captures/${id}.mp4`, kind: 'video', fps: 60, page: P,
  shows: `Badge "${badgeText}". Ask Rovo; switch agent: search "Drift", pick Drift Reviewer; type "${question}"; Enter; the answer streams in.`,
  clicks: rec.clicks.map((c) => c), hovers: rec.hovers, masks: await devMasks(s.page),
  notes: `Sent at atMs ${tAsk - rec.stats.firstFrameEpochMs}; answer stable from atMs ${tDone - rec.stats.firstFrameEpochMs}. Text growth samples: ${JSON.stringify(samples.slice(0, 40))}. Full panel text: tools/capture/${id}-answer.txt. Answer stills: ${pages.join(', ')}. Source frames: ${JSON.stringify(rec.stats)}`,
});
const says = { possiblyStale: /possibly stale/i.test(last), pr: /#482/.test(last), rename: /rollback-v2|renam/i.test(last) };
log(`Rovo: asked Drift Reviewer "${question}" on the runbook (take ${id}); answer took ${((tDone - tAsk) / 1000).toFixed(0)} s; says Possibly stale: ${says.possiblyStale}, names PR #482: ${says.pr}, mentions the rename: ${says.rename}`);
console.log(last.slice(-3000));
await s.close();
process.exit(0);
