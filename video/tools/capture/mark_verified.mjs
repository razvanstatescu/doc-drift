// Restore helper (UI, as Razvan): open a page's Doc Drift badge and click "Mark verified".
// node tools/capture/mark_verified.mjs <pageId> "<why>"
import { connect, log, sleep } from './lib.mjs';
import { byline } from './rest.mjs';

const pageId = process.argv[2];
const why = process.argv[3] || '';
const s = await connect();
await s.goto(`https://one-atlas-jzzf.atlassian.net/wiki/spaces/PLAT/pages/${pageId}`, 6000);
await s.page.getByText(/Doc Drift \(Development\)/).first().click();
const dialog = s.page.getByRole('dialog').first();
const mv = dialog.getByRole('button', { name: 'Mark verified', exact: true });
await mv.waitFor({ state: 'visible', timeout: 60000 });
await sleep(1200);
await mv.click();
await dialog.getByText(/Marked verified|Verified/).first().waitFor({ state: 'visible', timeout: 60000 });
await sleep(2500);
const b = await byline(pageId);
log(`Restore: page ${pageId} "Mark verified" in its review panel (${why}); byline now ${JSON.stringify(b)}`);
await s.close();
process.exit(0);
