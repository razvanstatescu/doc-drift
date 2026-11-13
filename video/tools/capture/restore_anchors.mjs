// Restore (UI, as Razvan): set the runbook's anchors back to the pre-shoot three
// (payments-api: scripts/rollback.sh critical, payments-api: deploy/helm/values.yaml, PAY-6) and save.
import { connect, log, sleep, RUNBOOK } from './lib.mjs';

const WANT = [
  { label: 'payments-api: scripts/rollback.sh', repo: 'payments-api', path: 'scripts/rollback.sh', critical: true },
  { label: 'payments-api: deploy/helm/values.yaml', repo: 'payments-api', path: 'deploy/helm/values.yaml', critical: false },
  { label: 'PAY-6', jira: 'PAY-6', critical: false },
];
const s = await connect();
await s.goto(RUNBOOK, 6000);
await s.page.getByText(/Doc Drift \(Development\)/).first().click();
const dialog = s.page.getByRole('dialog').first();
await dialog.getByText(/Anchors/).first().waitFor({ state: 'visible', timeout: 60000 });
await sleep(1500);
// With open changes the modal has tabs; the anchor editor is under "Anchors".
const tab = dialog.getByRole('tab', { name: /Anchors/ });
if (await tab.count()) {
  await tab.first().click();
  await sleep(1200);
}
const rowTexts = async () => (await dialog.getByRole('row').all()).length;
// Remove anchors that are not wanted.
for (const r of await dialog.getByRole('row').all()) {
  const code = await r.locator('code').first().innerText().catch(() => null);
  if (code && !WANT.some((w) => w.label === code.trim())) {
    await r.getByRole('button', { name: 'Remove' }).click();
    await sleep(400);
    log(`Restore: runbook anchor removed in the modal: ${code.trim()}`);
  }
}
// Add the missing ones.
for (const w of WANT) {
  if ((await dialog.getByRole('row').filter({ hasText: w.label }).count()) > 0) continue;
  if (w.jira) {
    await dialog.locator('#dds-anchor-type').click();
    await s.page.getByText('Jira issue', { exact: true }).last().click();
    await sleep(300);
    await dialog.getByLabel('Issue key').fill(w.jira);
  } else {
    await dialog.getByLabel('Repository', { exact: true }).fill(w.repo);
    await dialog.getByLabel('Anchor path', { exact: true }).fill(w.path);
  }
  await dialog.getByRole('button', { name: 'Add anchor', exact: true }).click();
  await dialog.getByRole('row').filter({ hasText: w.label }).waitFor({ state: 'visible', timeout: 30000 });
  log(`Restore: runbook anchor added in the modal: ${w.label}`);
}
// Weights.
for (const w of WANT) {
  const cb = dialog.getByRole('row').filter({ hasText: w.label }).getByRole('checkbox');
  if ((await cb.isChecked()) !== w.critical) await cb.click();
  await sleep(200);
}
const final = [];
for (const r of await dialog.getByRole('row').all()) {
  const code = await r.locator('code').first().innerText().catch(() => null);
  if (code) final.push(`${code.trim()}=${(await r.getByRole('checkbox').isChecked()) ? 'critical' : 'normal'}`);
}
await dialog.getByRole('button', { name: 'Save and mark verified' }).click();
await dialog.getByText(/Saved \d+ anchors?/).first().waitFor({ state: 'visible', timeout: 60000 });
const msg = (await dialog.getByText(/Saved \d+ anchors?/).first().innerText()).trim();
log(`Restore: runbook anchors saved in the modal: ${final.join(', ')}. "${msg}" (rows seen: ${await rowTexts()})`);
await s.close();
process.exit(0);
