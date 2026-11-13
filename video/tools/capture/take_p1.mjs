// P1 take (V11-V12): the runbook reads Unanchored; click the badge; suggestions; type the repository,
// tick scripts/rollback.sh (PAY-6 is pre-checked); "Save and mark verified"; reload; Verified.
import { connect, devMasks, log, sleep, stage, RUNBOOK } from './lib.mjs';

const s = await connect();
const P = 'Payments rollback runbook (PLAT 2720100)';
const stills = [];
async function still(id, shows, extra = {}) {
  await s.still(id);
  const e = stage({ id, file: `captures/${id}.png`, page: P, shows, masks: await devMasks(s.page), ...extra });
  stills.push(e.id);
}

await s.goto(RUNBOOK, 6000);
const badge = s.page.getByText(/Doc Drift \(Development\)/).first();
await badge.waitFor({ state: 'visible', timeout: 60000 });
const badgeText = (await badge.textContent()).trim();
if (!badgeText.startsWith('Unanchored')) throw new Error(`badge reads ${badgeText}`);
await s.moveTo(1500, 700, { steps: 1, stepMs: 0 });
await sleep(1000);
await still('p1-unanchored', `The runbook with its byline badge "${badgeText}".`);

await s.startRecording('p1-anchor');
await sleep(1200);
const bb = await s.box(badge);
await s.hover(bb, 'Doc Drift badge (Unanchored)');
await sleep(1800);
const tip1 = await s.page.getByRole('tooltip').first().innerText().catch(() => '');
await still('p1-unanchored-tooltip', `Hovering the Unanchored badge. Tooltip: "${tip1}"`);
await sleep(400);
await s.click(bb, 'Doc Drift badge (Unanchored)');
const dialog = s.page.getByRole('dialog').first();
await dialog.getByText(/Suggested from this page/).first().waitFor({ state: 'visible', timeout: 60000 });
await sleep(1800);
const sugText = (await dialog.innerText()).replace(/\s+/g, ' ');
await still('p1-suggestions', 'The badge modal for an unanchored page: no anchors yet, "Suggested from this page (2)": PAY-6 (Jira issue, pre-checked) and scripts/rollback.sh ("Needs a repository", weak, unchecked).', { notes: sugText.slice(0, 700) });

const repo = dialog.getByLabel('Repository for suggested paths');
await s.click(await s.box(repo), 'Repository for suggested paths field');
await sleep(300);
await s.type('payments-api', { delay: 85 });
await sleep(900);
let cb = dialog.getByRole('checkbox', { name: /scripts\/rollback\.sh/ });
let cbBox = await cb.first().boundingBox();
if (!cbBox || cbBox.width < 4) cbBox = await s.box(dialog.getByText('scripts/rollback.sh', { exact: true }).first());
await s.click(cbBox, 'Tick suggestion scripts/rollback.sh');
await sleep(1500);
const checked = await cb.first().isChecked().catch(() => null);
const pay6 = await dialog.getByRole('checkbox', { name: /PAY-6/ }).first().isChecked().catch(() => null);
await still('p1-suggestions-ticked', `Repository typed (payments-api); suggestions ticked: scripts/rollback.sh in payments-api (${checked}), PAY-6 (${pay6}).`);

const save = dialog.getByRole('button', { name: 'Save and mark verified' });
await s.click(await s.box(save), 'Save and mark verified');
await dialog.getByText(/Saved \d+ anchors?/).first().waitFor({ state: 'visible', timeout: 60000 });
const savedAt = new Date().toISOString();
await sleep(1600);
const savedText = (await dialog.innerText()).replace(/\s+/g, ' ');
await still('p1-saved', 'After "Save and mark verified": the modal confirms the anchors were saved and the page is Verified.', { notes: savedText.slice(0, 500) });

const reload = dialog.getByRole('button', { name: 'Reload page' });
if (await reload.count()) {
  await s.click(await s.box(reload), 'Reload page');
} else {
  await s.page.reload();
}
await s.page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
const badge2 = s.page.getByText(/Verified · Doc Drift \(Development\)/).first();
await badge2.waitFor({ state: 'visible', timeout: 60000 });
await sleep(2500);
s.mouse = { x: 1500, y: 700 };
await s.moveTo(1500, 700, { steps: 1, stepMs: 0 });
await sleep(600);
await still('p1-verified', 'After reload: the byline badge reads "Verified · Doc Drift (Development)".');
const bb2 = await s.box(badge2);
await s.hover(bb2, 'Doc Drift badge (Verified)');
await sleep(1800);
const tip2 = await s.page.getByRole('tooltip').first().innerText().catch(() => '');
await still('p1-verified-tooltip', `Hovering the Verified badge. Tooltip: "${tip2}"`);
await sleep(600);
await s.moveTo(1500, 700);
await sleep(800);
const rec = await s.stopRecording({ tailMs: 700 });
stage({
  id: 'p1-anchor-rec', file: 'captures/p1-anchor.mp4', kind: 'video', fps: 60, page: P,
  shows: 'Badge Unanchored (hover, tooltip), click; suggestions; type payments-api into "Repository for suggested paths"; tick scripts/rollback.sh; "Save and mark verified"; "Reload page"; badge Verified; hover tooltip.',
  clicks: rec.clicks, hovers: rec.hovers, masks: await devMasks(s.page),
  notes: `Saved at ${savedAt}. Stills in order: ${stills.join(', ')}. The modal title bar reads "Doc Drift" (no suffix); the byline and the sidebar's "Drift dashboard" carry "(Development)": masks are per still. Source frames: ${JSON.stringify(rec.stats)}`,
});
log(`Capture: P1 take on the runbook: badge Unanchored -> typed repository payments-api, ticked scripts/rollback.sh (PAY-6 pre-checked), clicked "Save and mark verified" at ${savedAt}, reloaded: "Verified". Tooltip after: "${tip2}". ${JSON.stringify(rec.stats)}`);
await s.close();
process.exit(0);
