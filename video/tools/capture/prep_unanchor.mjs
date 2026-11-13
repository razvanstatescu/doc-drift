// P1 prep (off camera): remove the runbook's anchors in the badge modal and save, so it reads Unanchored.
import { connect, log, sleep, RUNBOOK } from './lib.mjs';

const s = await connect();
await s.goto(RUNBOOK, 5000);
await s.page.getByText(/Doc Drift \(Development\)/).first().click();
const dialog = s.page.getByRole('dialog').first();
await dialog.getByText('Anchors', { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
await sleep(1500);
const removes = dialog.getByRole('button', { name: 'Remove', exact: true });
let n = await removes.count();
const anchors = await dialog.locator('code').allInnerTexts();
console.log('anchors before', n, anchors);
while ((await removes.count()) > 0) {
  await removes.first().click();
  await sleep(400);
}
await dialog.getByRole('button', { name: 'Save and mark verified' }).click();
await sleep(5000);
const text = await dialog.innerText();
console.log(text.slice(0, 600));
log(`Confluence: runbook 2720100 badge modal: removed ${n} anchors (${anchors.slice(0, n).join(', ')}) and clicked "Save and mark verified" (P1 prep). Modal said: ${JSON.stringify(text.split('\n').filter(Boolean).slice(0, 4).join(' | ')).slice(0, 200)}`);
await s.close();
process.exit(0);
