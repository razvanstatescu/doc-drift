// After the P1 take (off camera): restore the runbook's original anchors exactly:
// scripts/rollback.sh critical, deploy/helm/values.yaml normal (added by hand: the page never names it), PAY-6 normal.
import { connect, log, sleep, RUNBOOK } from './lib.mjs';

const s = await connect();
await s.goto(RUNBOOK, 6000);
await s.page.getByText(/Doc Drift \(Development\)/).first().click();
const dialog = s.page.getByRole('dialog').first();
await dialog.getByText('Anchors', { exact: true }).first().waitFor({ state: 'visible', timeout: 60000 });
await sleep(1500);
const row = dialog.getByRole('row').filter({ hasText: 'payments-api: scripts/rollback.sh' });
const crit = row.getByRole('checkbox');
if (!(await crit.isChecked())) await crit.click();
await sleep(400);
await dialog.getByLabel('Repository', { exact: true }).fill('payments-api');
await dialog.getByLabel('Anchor path', { exact: true }).fill('deploy/helm/values.yaml');
await dialog.getByRole('button', { name: 'Add anchor', exact: true }).click();
await dialog.getByRole('row').filter({ hasText: 'payments-api: deploy/helm/values.yaml' }).waitFor({ state: 'visible', timeout: 30000 });
await sleep(500);
const rows = (await dialog.getByRole('row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
const crits = [];
for (const r of await dialog.getByRole('row').all()) {
  const cb = r.getByRole('checkbox');
  if (await cb.count()) crits.push(`${(await r.locator('code').first().innerText()).trim()}=${(await cb.isChecked()) ? 'critical' : 'normal'}`);
}
console.log(rows, crits);
await dialog.getByRole('button', { name: 'Save and mark verified' }).click();
await dialog.getByText(/Saved \d+ anchors?/).first().waitFor({ state: 'visible', timeout: 60000 });
const msg = (await dialog.getByText(/Saved \d+ anchors?/).first().innerText()).trim();
log(`Confluence: runbook 2720100 (off camera, after the P1 take): ticked Critical on scripts/rollback.sh, added payments-api: deploy/helm/values.yaml by hand, clicked "Save and mark verified": "${msg}" Anchors: ${crits.join(', ')}`);
await s.close();
process.exit(0);
