// Renders brand/social-card/social-card.html to site/assets/social-card.png (1200 x 630).
// Usage (Node 24, from the repo root): node scripts/site/render-social-card.mjs
// Uses the playwright-core that the video workspace already installs, driving the system Chrome.
import { chromium } from '../../video/node_modules/playwright-core/index.mjs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`file://${root}brand/social-card/social-card.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}site/assets/social-card.png` });
await browser.close();
console.log('site/assets/social-card.png');
