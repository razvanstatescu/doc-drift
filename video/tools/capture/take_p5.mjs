// P5 (V23): a Jira epic (PAY-18) moved to Done flags ADR-015; the Drift dashboard; "Track in Jira".
//   node take_p5.mjs jira        record the status change in Jira, measure, then the flagged ADR page and its panel
//   node take_p5.mjs dashboard   stills (and a short scroll recording) of the PLAT Drift dashboard
//   node take_p5.mjs track       ADR-015 review panel: Track in Jira -> Create Jira task -> created
import fs from 'node:fs';
import path from 'node:path';
import { connect, devMasks, log, sleep, stage, HERE, H } from './lib.mjs';
import { atl, byline } from './rest.mjs';

const ADR = '2752707';
const ADR_URL = `https://one-atlas-jzzf.atlassian.net/wiki/spaces/PLAT/pages/${ADR}`;
const JIRA_URL = 'https://one-atlas-jzzf.atlassian.net/browse/PAY-18';
const DASH = 'https://one-atlas-jzzf.atlassian.net/wiki/spaces/PLAT/apps/12e968a1-a45d-4524-ba28-d47e2315db1a/b7eadd8c-211c-4cdf-98c0-86172909ead2/drift-dashboard';
const P_ADR = 'ADR-015: Active-passive multi-region database (PLAT 2752707)';
const phase = process.argv[2];
const s = await connect();
async function still(id, page, shows, extra = {}) {
  await s.still(id);
  return stage({ id, file: `captures/${id}.png`, page, shows, masks: await devMasks(s.page), ...extra });
}
const meta = () => JSON.parse(fs.readFileSync(path.join(HERE, 'meta.json'), 'utf8'));
const saveMeta = (m) => fs.writeFileSync(path.join(HERE, 'meta.json'), JSON.stringify(m, null, 2) + '\n');
const badgeLoc = () => s.page.getByText(/Doc Drift \(Development\)/).first();

async function openPanel(id, label) {
  const b = await s.box(badgeLoc());
  await s.click(b, label);
  const dialog = s.page.getByRole('dialog').first();
  await dialog.getByText(/What changed|Anchors/).first().waitFor({ state: 'visible', timeout: 60000 });
  await sleep(2500);
  return dialog;
}

if (phase === 'jira') {
  const before = await byline(ADR);
  if (!before?.title?.startsWith('Verified')) throw new Error(`ADR-015 byline ${JSON.stringify(before)}`);
  await s.goto(JIRA_URL, 7000);
  const status = s.page.locator('[data-testid="issue-field-status.ui.status-view.status-button.status-button"]');
  await status.waitFor({ state: 'visible', timeout: 60000 });
  if ((await status.innerText()).trim() !== 'To Do') throw new Error(`PAY-18 status ${await status.innerText()}`);
  await s.moveTo(900, 700, { steps: 1, stepMs: 0 });
  await sleep(1200);
  await still('p5-jira-before', 'Jira PAY-18 (epic "Multi-region active-passive database")', 'The epic PAY-18 in Jira, status To Do.');
  await s.startRecording('p5-jira');
  await sleep(1200);
  await s.click(await s.box(status), 'Status: To Do');
  const done = s.page.getByRole('option', { name: 'Done' }).first();
  await done.waitFor({ state: 'visible', timeout: 20000 });
  await sleep(900);
  await still('p5-jira-menu', 'Jira PAY-18', 'The status menu of PAY-18 (In Progress, Done). This workflow has no Won\'t Do status.');
  await s.click(await s.box(done), 'Done');
  const tJira = Date.now();
  await s.page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="issue-field-status.ui.status-view.status-button.status-button"]');
    return b && b.innerText.trim() === 'Done';
  }, null, { timeout: 30000 });
  await sleep(2500);
  await still('p5-jira-done', 'Jira PAY-18', 'PAY-18 after the change: status Done.');
  const recJ = await s.stopRecording({ tailMs: 500 });
  stage({ id: 'p5-jira-rec', file: 'captures/p5-jira.mp4', kind: 'video', fps: 60, page: 'Jira PAY-18', shows: 'PAY-18 status To Do -> click -> Done.', clicks: recJ.clicks, hovers: recJ.hovers, notes: `Done clicked at ${new Date(tJira).toISOString()}. Source frames: ${JSON.stringify(recJ.stats)}` });
  log(`Jira: moved PAY-18 (epic, anchor of ADR-015) from To Do to Done in the issue view at ${new Date(tJira).toISOString()} (the PAY workflow has no Won't Do status)`);

  // Wait for the flag.
  let tFlag = null;
  let flagged = null;
  for (let i = 0; i < 600 && !tFlag; i++) {
    const b = await byline(ADR).catch(() => null);
    if (b?.title && !b.title.startsWith('Verified')) {
      tFlag = Date.now();
      flagged = b;
    } else await sleep(1000);
  }
  const secs = tFlag ? (tFlag - tJira) / 1000 : null;
  log(`Measured: ADR-015 byline read "${flagged?.title}" ${secs?.toFixed(1)} s after PAY-18 moved to Done (tooltip "${flagged?.tooltip}")`);
  const m = meta();
  m.measured.jiraToFlagSeconds = secs ? Math.round(secs) : null;
  m.measured.jiraToFlagNote = 'From the click on Done in the PAY-18 status menu to the first REST read (1 s polling) of ADR-015\'s byline property that was no longer Verified.';
  saveMeta(m);

  await s.goto(ADR_URL, 5000);
  await badgeLoc().waitFor({ state: 'visible', timeout: 60000 });
  await s.moveTo(1500, 700, { steps: 1, stepMs: 0 });
  await sleep(1500);
  await s.startRecording('p5-adr');
  await sleep(1000);
  await still('p5-adr-flagged', P_ADR, `ADR-015 after PAY-18 moved to Done: badge "${(await badgeLoc().textContent()).trim()}".`);
  await s.hover(await s.box(badgeLoc()), 'Doc Drift badge (Possibly stale)');
  await sleep(1800);
  const tip = await s.page.getByRole('tooltip').first().innerText().catch(() => '');
  await still('p5-adr-tooltip', P_ADR, `Hovering the badge on ADR-015. Tooltip: "${tip}"`);
  await sleep(400);
  const dialog = await openPanel('p5-adr', 'Doc Drift badge (Possibly stale)');
  const text = (await dialog.innerText()).replace(/\s+/g, ' ');
  await still('p5-adr-panel', P_ADR, 'The review panel on ADR-015: the Jira change (PAY-18 moved to Done) and the affected sections.', { notes: text.slice(0, 900) });
  await s.moveTo(960, 600);
  await s.wheel(500, { x: 960, y: 600 });
  await sleep(1500);
  await still('p5-adr-panel-2', P_ADR, 'The review panel on ADR-015, scrolled: affected sections and actions.');
  const recA = await s.stopRecording({ tailMs: 500 });
  stage({ id: 'p5-adr-rec', file: 'captures/p5-adr.mp4', kind: 'video', fps: 60, page: P_ADR, shows: 'ADR-015 flagged by the Jira change: badge, tooltip, review panel.', clicks: recA.clicks, hovers: recA.hovers, masks: await devMasks(s.page), notes: `Source frames: ${JSON.stringify(recA.stats)}` });
  log(`Capture: P5 ADR-015 flagged (${flagged?.title}), tooltip "${tip}", review panel opened (not changed).`);
}

if (phase === 'dashboard') {
  await s.goto(DASH, 5000);
  await s.page.getByText('Pages anchored').first().waitFor({ state: 'visible', timeout: 60000 });
  await sleep(3000);
  await s.moveTo(1850, 900, { steps: 1, stepMs: 0 });
  const kpis = (await s.page.locator('body').innerText()).match(/Pages anchored[\s\S]{0,200}/)?.[0]?.replace(/\s+/g, ' ');
  await still('p5-dashboard', 'PLAT Drift dashboard', `The Drift dashboard for PLAT (sample data from the demo space). ${kpis}`);
  await s.startRecording('p5-dashboard');
  await sleep(1200);
  await s.wheel(420, { x: 1100, y: 700 });
  await sleep(1800);
  await still('p5-dashboard-2', 'PLAT Drift dashboard', 'The Drift dashboard scrolled to "Pages with drift" and the owner backlog.');
  await s.wheel(-420, { x: 1100, y: 700 });
  await sleep(1200);
  const rec = await s.stopRecording({ tailMs: 400 });
  stage({ id: 'p5-dashboard-rec', file: 'captures/p5-dashboard.mp4', kind: 'video', fps: 60, page: 'PLAT Drift dashboard', shows: 'The dashboard, a slow scroll down to the drifted pages and back.', clicks: rec.clicks, hovers: rec.hovers, masks: await devMasks(s.page), notes: `Source frames: ${JSON.stringify(rec.stats)}` });
  log(`Capture: P5 dashboard stills and scroll. KPIs: ${kpis}`);
}

if (phase === 'track') {
  await s.goto(ADR_URL, 5000);
  await badgeLoc().waitFor({ state: 'visible', timeout: 60000 });
  await s.moveTo(1500, 700, { steps: 1, stepMs: 0 });
  await sleep(1200);
  await s.startRecording('p5-track');
  await sleep(1000);
  const dialog = await openPanel('p5-track', 'Doc Drift badge');
  const create = dialog.getByRole('button', { name: 'Create Jira task' });
  await s.moveTo(960, 640);
  const cb = await s.wheelTo(create, { x: 960, y: 640 });
  await sleep(1000);
  await still('p5-track-section', P_ADR, 'The "Track in Jira" section of the review panel.');
  await s.click(cb, 'Create Jira task');
  const go = dialog.getByRole('button', { name: 'Create task', exact: true });
  await go.waitFor({ state: 'visible', timeout: 60000 });
  await sleep(2000);
  const form = (await dialog.innerText()).replace(/\s+/g, ' ');
  const gb = await s.wheelTo(go, { x: 960, y: 640 });
  await sleep(800);
  await still('p5-track-form', P_ADR, 'The Create Jira task form: project and prefilled summary.', { notes: form.slice(-600) });
  await s.click(gb, 'Create task');
  await dialog.getByText('Jira task created').first().waitFor({ state: 'visible', timeout: 60000 });
  await sleep(2000);
  const done = await dialog.getByText('Jira task created').first().locator('xpath=ancestor::*[3]').innerText().catch(() => '');
  await s.wheelTo(dialog.getByText('Jira task created').first(), { x: 960, y: 640 });
  await sleep(800);
  await still('p5-track-created', P_ADR, `The task was created: ${done.replace(/\s+/g, ' ').slice(0, 200)}`);
  const rec = await s.stopRecording({ tailMs: 500 });
  stage({ id: 'p5-track-rec', file: 'captures/p5-track.mp4', kind: 'video', fps: 60, page: P_ADR, shows: 'Review panel on ADR-015: Track in Jira, Create Jira task, the form, Create task, "Jira task created".', clicks: rec.clicks, hovers: rec.hovers, masks: await devMasks(s.page), notes: `Source frames: ${JSON.stringify(rec.stats)}` });
  log(`Jira: created a task from ADR-015's review panel ("Track in Jira"): ${done.replace(/\s+/g, ' ').slice(0, 200)}`);
}

await s.close();
process.exit(0);
void H;
void atl;
