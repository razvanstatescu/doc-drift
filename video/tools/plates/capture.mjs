// Capture pass: for each plate, open the live page in our own headful Chrome at deviceScaleFactor 3 (light scheme),
// dismiss consent, apply the spec (notice/ad CSS, wrap width, scroll), re-read the key sentence on the live page,
// measure the crop, key-phrase, blur and region boxes from the DOM, and save the full viewport to
// public/plates/raw/<id>.png plus a record to tools/plates/cache/rec-<id>.json. process.py makes the plates.
// Usage: node tools/plates/capture.mjs [id ...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITEMS } from './items.mjs';
import { SPECS } from './specs.mjs';
import { openBrowser, dismissConsent, settle } from './browser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(here, '../../public/plates/raw');
const CACHE = resolve(here, 'cache');
mkdirSync(RAW, { recursive: true });
mkdirSync(CACHE, { recursive: true });
const DSF = 3;
const only = process.argv.slice(2);

const jobs = Object.entries(SPECS)
  .filter(([id]) => !only.length || only.includes(id))
  .map(([id, spec]) => {
    const item = ITEMS.find((i) => i.id === (spec.of || id));
    return { id, spec, item };
  });

const ctx = await openBrowser({ width: 1280, height: 1000, dsf: DSF });
const page = ctx.pages()[0] || (await ctx.newPage());

async function findWrapWidth(wrap, h) {
  for (let W = wrap.max; W >= wrap.min; W -= 2) {
    await page.setViewportSize({ width: W, height: h });
    await page.waitForTimeout(70);
    const ok = await page.evaluate((wr) => {
      const pl = window.__pl;
      const s = pl.find(wr.start), e = pl.find(wr.end), n = pl.find(wr.next);
      if (!s || !e || !n) return null;
      const s0 = s.rects[0], eL = e.rects[e.rects.length - 1], n0 = n.rects[0];
      // `next` must start a new line right after `end`; with oneLine, `start`..`end` must also be one line.
      return (!wr.oneLine || Math.abs(s0.y - eL.y) < 3) && n0.y > eL.y + 3;
    }, wrap);
    if (ok === null) return { error: 'wrap texts not found' };
    if (ok) return { width: W };
  }
  return { error: 'no width found' };
}

for (const { id, spec, item } of jobs) {
  const url = spec.url || item.url;
  const W = spec.w || 1280, H = spec.h || 1000;
  const rec = { id, of: spec.of || null, bar: item.bar, url, viewport: { w: W, h: H }, dsf: DSF, capturedAt: new Date().toISOString(), notes: [] };
  try {
    await page.setViewportSize({ width: W, height: H });
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    rec.httpStatus = resp && resp.status();
    await settle(page, { ms: 2500 });
    rec.consent = await dismissConsent(page);
    await settle(page, { ms: 1500, idle: 5000 });
    if (spec.css) await page.addStyleTag({ content: spec.css });
    if (spec.prep) await spec.prep(page);
    await page.waitForTimeout(500);
    if (spec.wrap) {
      const r = await findWrapWidth(spec.wrap, H);
      if (r.error) throw new Error(`wrap: ${r.error}`);
      rec.viewport.w = r.width;
      rec.notes.push(`Viewport width ${r.width} CSS px chosen so the line ends after "${spec.wrap.end}" (the next words start the next line).`);
      await page.waitForTimeout(400);
    }
    rec.finalUrl = page.url();
    rec.title = await page.title();
    // Re-read the key text on the live page.
    const key = item.key;
    if (spec.align) await page.evaluate(spec.align, { key });
    if (spec.postAlign) await spec.postAlign(page, key);
    await page.waitForTimeout(900);
    rec.key = await page.evaluate((key) => {
      const pl = window.__pl;
      const f = pl.findInfo(key);
      return f ? { text: key, exact: f.exact, count: f.count, rects: f.rects, union: f.union, blockText: f.block.text } : { text: key, found: false };
    }, key);
    if (rec.key.found === false) throw new Error('key text not found on the live page');
    rec.crop = await page.evaluate(spec.crop, { key });
    if (!spec.noFix) {
      const fx = await page.evaluate(({ crop, key }) => window.__pl.fixCrop(crop, window.__pl.find(key)?.union), { crop: rec.crop, key });
      if (fx.moved.top > 0.5 || fx.moved.bottom > 0.5) rec.notes.push(`Crop edges moved to avoid cutting text lines (top +${fx.moved.top.toFixed(1)} px, bottom -${fx.moved.bottom.toFixed(1)} px CSS).`);
      if (fx.conflicts.length) rec.notes.push(`Crop ${fx.conflicts.join(' and ')} edge grown to take in a whole text line beside the key text.`);
      rec.cropBeforeFix = rec.crop;
      rec.crop = fx.crop;
    }
    rec.check = spec.check ? await page.evaluate(spec.check, { key }) : null;
    // Licence lines and links as stated on the page today (for plates.json; read, never inferred).
    rec.licenceOnPage = await page.evaluate(() => {
      const pl = window.__pl;
      const links = Array.from(document.querySelectorAll('a[href*="creativecommons.org"], a[href*="nationalarchives.gov.uk/doc/open-government-licence"], a[href*="opendatacommons.org"], a[href*="arxiv.org/licenses"], a[rel="license"]')).map((a) => ({ text: pl.norm(a.innerText || a.getAttribute('title') || a.querySelector('img')?.getAttribute('alt') || ''), href: a.href })).slice(0, 6);
      const { flat } = pl.flatten();
      const lines = [];
      const re = /([^.]{0,90}(licen[cs]ed under|creative commons|open government licence|released under|open database licen[cs]e)[^.]{0,120})/gi;
      let m;
      while ((m = re.exec(flat)) && lines.length < 4) lines.push(m[1].trim());
      return { links, lines };
    });
    rec.blurs = spec.blur ? await page.evaluate(spec.blur, { key }) : [];
    rec.blurExcept = spec.blurExcept ? await page.evaluate(spec.blurExcept, { key }) : null;
    rec.regions = spec.regions ? await page.evaluate(spec.regions, { key }) : null;
    const phrases = spec.phrases || item.phrases || [];
    rec.phrases = await page.evaluate(({ phrases, crop }) => {
      const pl = window.__pl;
      const inside = (u) => u && u.x + u.w / 2 >= crop.x && u.x + u.w / 2 <= crop.x + crop.w && u.y + u.h / 2 >= crop.y && u.y + u.h / 2 <= crop.y + crop.h;
      return phrases.map((t) => {
        const all = pl.findAll(t);
        const m = all.find((f) => inside(f.union));
        return m ? { text: t, exact: m.exact, rects: m.rects, union: m.union } : { text: t, missing: true, occurrences: all.length };
      });
    }, { phrases, crop: rec.crop });
    rec.scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    // No focus rings or hover states in the capture.
    await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    await page.mouse.move(rec.viewport.w - 3, H - 3);
    await page.waitForTimeout(300);
    rec.raw = `public/plates/raw/${id}.png`;
    await page.screenshot({ path: `${RAW}/${id}.png` });
    rec.ok = true;
  } catch (e) {
    rec.ok = false;
    rec.error = String(e && e.message ? e.message : e).slice(0, 400);
    try {
      await page.screenshot({ path: `${CACHE}/fail-${id}.png` });
    } catch {}
  }
  writeFileSync(`${CACHE}/rec-${id}.json`, JSON.stringify(rec, null, 1));
  const miss = (rec.phrases || []).filter((p) => p.missing).map((p) => p.text);
  console.log(id, rec.ok ? 'ok' : `FAILED: ${rec.error}`, rec.crop ? `crop ${Math.round(rec.crop.w)}x${Math.round(rec.crop.h)}` : '', miss.length ? `missing phrases: ${miss.join(' | ')}` : '', `w=${rec.viewport.w}`);
}
await ctx.close();
