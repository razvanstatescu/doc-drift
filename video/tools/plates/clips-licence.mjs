// Re-read each clip's licence on the live page today and save a dated screenshot to public/clips/licence-<id>.png.
// YouTube: the watch page with the description expanded (title, channel and the Licence row in view).
// FOSDEM: the talk page (title, speaker, and the licence sentence in the footer).
// A dated caption strip is added below the screenshot (outside the page area). Prints what was read.
// Usage: node tools/plates/clips-licence.mjs [id ...]
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser, dismissConsent, settle } from './browser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../../public/clips');
const CACHE = resolve(here, 'cache');
const only = process.argv.slice(2);
const CLIPS = [
  { id: 'ariel', kind: 'youtube', url: 'https://www.youtube.com/watch?v=Rq98-audaEc' },
  { id: 'osmani', kind: 'youtube', url: 'https://www.youtube.com/watch?v=zMM5zqesL1g' },
  { id: 'khirnov', kind: 'fosdem', url: 'https://archive.fosdem.org/2025/schedule/event/fosdem-2025-6023-multiview-decoding-in-libavcodec-and-ffmpeg-cli/' },
];

const ctx = await openBrowser({ width: 1280, height: 1400, dsf: 2 });
const page = ctx.pages()[0] || (await ctx.newPage());
const results = {};
for (const c of CLIPS.filter((c) => !only.length || only.includes(c.id))) {
  const r = { id: c.id, url: c.url, readAt: new Date().toISOString() };
  try {
    await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page, { ms: 3000, idle: 8000 });
    r.consent = await dismissConsent(page, { rounds: 3 });
    await settle(page, { ms: 2500, idle: 8000 });
    if (c.kind === 'youtube') {
      // Pause playback (no audio needed) and expand the description.
      await page.evaluate(() => { const v = document.querySelector('video'); if (v) { v.muted = true; v.pause(); } });
      for (const sel of ['#description-inline-expander #expand', 'tp-yt-paper-button#expand', '#expand', '#description #expand']) {
        const el = await page.$(sel);
        if (el && (await el.isVisible())) { await el.click(); break; }
      }
      await page.waitForTimeout(2000);
      await page.evaluate(() => { const v = document.querySelector('video'); if (v) { v.muted = true; v.pause(); } });
      r.read = await page.evaluate(() => {
        const pl = window.__pl;
        const { flat } = pl.flatten();
        const m = flat.match(/Licen[cs]e\s+(Creative Commons[^.]*?\(reuse allowed\))/i) || flat.match(/(Creative Commons Attribution licen[cs]e \(reuse allowed\))/i);
        const title = pl.norm((document.querySelector('h1.ytd-watch-metadata, #title h1, h1') || {}).innerText || '');
        const channel = pl.norm((document.querySelector('#owner #channel-name, ytd-channel-name') || {}).innerText || '');
        return { licence: m ? m[0] : null, title, channel };
      });
      // Bring the licence row into view with the title still on screen if possible.
      await page.evaluate(() => {
        const f = window.__pl.find('Creative Commons');
        if (!f) return;
        const r = f.union;
        if (r.y > window.innerHeight - 80) window.scrollBy(0, r.y - (window.innerHeight - 160));
      });
      await page.waitForTimeout(800);
    } else {
      r.read = await page.evaluate(() => {
        const pl = window.__pl;
        const { flat } = pl.flatten();
        const m = flat.match(/This work is licensed under the .{0,120}?Licen[cs]e\.?/i);
        const h = Array.from(document.querySelectorAll('h1, h2, h3')).map((e) => pl.norm(e.innerText || '')).find((t) => /multiview/i.test(t));
        return { licence: m ? m[0] : null, title: h || null };
      });
    }
    const shot = `${CACHE}/licence-${c.id}-page.png`;
    await page.screenshot({ path: shot, fullPage: c.kind === 'fosdem' });
    let crop = '';
    if (c.kind === 'youtube') {
      const pr = await page.evaluate(() => { const e = document.querySelector('#primary'); const r = e ? e.getBoundingClientRect() : null; return r ? { x: 0, y: 0, w: Math.min(window.innerWidth, r.right + 12), h: window.innerHeight } : null; });
      if (pr) crop = [pr.x, pr.y, pr.w, pr.h].map((v) => Math.round(v * 2)).join(',');
    }
    // Caption strip below the screenshot (python/PIL), outside the page area.
    const caption = `Read ${r.readAt.slice(0, 16).replace('T', ' ')} UTC  ·  ${c.url}  ·  ${r.read.licence ? 'licence on the page: "' + r.read.licence + '"' : 'LICENCE TEXT NOT FOUND'}`;
    execFileSync('python3', ['-I', resolve(here, 'caption.py'), shot, `${OUT}/licence-${c.id}.png`, caption, crop]);
    r.file = `clips/licence-${c.id}.png`;
    unlinkSync(shot);
  } catch (e) {
    r.error = String(e && e.message ? e.message : e).slice(0, 300);
  }
  results[c.id] = r;
  console.log(JSON.stringify(r));
}
writeFileSync(`${CACHE}/licence-read.json`, JSON.stringify(results, null, 1));
await ctx.close();
