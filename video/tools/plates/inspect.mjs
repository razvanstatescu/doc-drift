// Recon pass: open each item's page in our own headful Chrome, dismiss consent, find the key text, and write a
// report (exact text found, nearby headings, dates, licence lines) plus a 1x viewport screenshot centred on the key.
// Usage: node tools/plates/inspect.mjs <outDir> [id ...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ITEMS } from './items.mjs';
import { openBrowser, dismissConsent, settle } from './browser.mjs';

const out = resolve(process.argv[2]);
const only = process.argv.slice(3);
mkdirSync(out, { recursive: true });
const ctx = await openBrowser({ width: 1280, height: 1000, dsf: 1 });
const page = ctx.pages()[0] || (await ctx.newPage());
const report = {};
for (const it of ITEMS.filter((i) => !only.length || only.includes(i.id))) {
  const r = { id: it.id, url: it.url };
  try {
    const resp = await page.goto(it.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    r.status = resp && resp.status();
    await settle(page, { ms: 2500 });
    r.consent = await dismissConsent(page);
    await settle(page, { ms: 1500, idle: 4000 });
    r.finalUrl = page.url();
    r.title = await page.title();
    r.info = await page.evaluate((key) => {
      const pl = window.__pl;
      const meta = {};
      for (const m of document.querySelectorAll('meta[property], meta[name]')) {
        const k = m.getAttribute('property') || m.getAttribute('name');
        if (/published|modified|date|site_name|author|og:title|citation_(date|online|title|publication)|dc\./i.test(k)) meta[k] = m.getAttribute('content');
      }
      const times = Array.from(document.querySelectorAll('time')).slice(0, 8).map((t) => ({ dt: t.getAttribute('datetime'), text: pl.norm(t.innerText || '') }));
      const heads = Array.from(document.querySelectorAll('h1,h2')).filter(pl.visible).slice(0, 10).map((h) => pl.norm(h.innerText).slice(0, 160));
      const { flat } = pl.flatten();
      const lic = [];
      const re = /(licen[cs]e[^.]{0,160}|creative commons[^.]{0,160}|open government licence[^.]{0,160}|cc[- ]by[^.]{0,80}|copyright[^.]{0,120}|©[^.]{0,120}|all rights reserved[^.]{0,40})/gi;
      let m;
      while ((m = re.exec(flat)) && lic.length < 12) lic.push(m[0]);
      const f = pl.findInfo(key);
      return { meta, times, heads, lic, found: f, textLen: flat.length };
    }, it.key);
    if (r.info.found) {
      await page.evaluate((key) => {
        const f = window.__pl.find(key);
        const y = f.union.y + window.scrollY - window.innerHeight * 0.4;
        window.scrollTo(0, Math.max(0, y));
      }, it.key);
      await page.waitForTimeout(700);
      r.after = await page.evaluate((key) => ({ scrollY: window.scrollY, rect: window.__pl.find(key)?.union }), it.key);
    }
    await page.screenshot({ path: `${out}/${it.id}.png` });
    writeFileSync(`${out}/${it.id}.txt`, await page.evaluate(() => window.__pl.flatten().flat));
  } catch (e) {
    r.error = String(e).slice(0, 300);
  }
  report[it.id] = r;
  console.log(it.id, r.status, r.error ? `ERROR ${r.error}` : r.info?.found ? `found x${r.info.found.count}` : 'NOT FOUND', JSON.stringify(r.consent || []));
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
await ctx.close();
