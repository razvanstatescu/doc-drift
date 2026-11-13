// Load one or more URLs in our own Chrome and report whether a text occurs (normalised), with context.
// Usage: node tools/plates/probe-text.mjs "<needle>" <url> [<url> ...]
import { openBrowser, dismissConsent, settle } from './browser.mjs';

const [needle, ...urls] = process.argv.slice(2);
const ctx = await openBrowser({ width: 1280, height: 1000, dsf: 1 });
const page = ctx.pages()[0] || (await ctx.newPage());
for (const url of urls) {
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page, { ms: 2500 });
    await dismissConsent(page);
    await settle(page, { ms: 1500, idle: 4000 });
    // Some pages lazy-render charts: scroll through once.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    const res = await page.evaluate((n) => {
      const { flat } = window.__pl.flatten();
      const nn = window.__pl.norm(n);
      const i = flat.indexOf(nn);
      return { len: flat.length, at: i, ctx: i >= 0 ? flat.slice(Math.max(0, i - 200), i + nn.length + 200) : null };
    }, needle);
    console.log('==', url, '->', page.url(), r && r.status(), JSON.stringify(res));
  } catch (e) {
    console.log('==', url, 'ERROR', String(e).slice(0, 200));
  }
}
await ctx.close();
