// Quick look at a page in our own Chrome: consent dismissed, optional CSS, optional scroll to a text, 1x screenshot,
// plus a list of fixed/sticky elements and the ancestor chain of the target (to write capture specs).
// Usage: node tools/plates/look.mjs <out.png> <url> [--w 1280] [--h 1000] [--text "..."] [--y 200] [--css "..."] [--wait 2500]
import { openBrowser, dismissConsent, settle } from './browser.mjs';

const args = process.argv.slice(2);
const out = args[0];
const url = args[1];
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const W = Number(opt('w', 1280)), H = Number(opt('h', 1000));
const text = opt('text', null), Y = Number(opt('y', 200)), css = opt('css', null), wait = Number(opt('wait', 2500));
const ctx = await openBrowser({ width: W, height: H, dsf: 1 });
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
await settle(page, { ms: wait });
const consent = await dismissConsent(page);
await settle(page, { ms: 1200, idle: 4000 });
if (css) await page.addStyleTag({ content: css });
if (args.includes('--prescroll')) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
  });
  await page.waitForTimeout(1000);
}
let info = {};
if (text) {
  info = await page.evaluate(async ({ text, Y }) => {
    const pl = window.__pl;
    const f = pl.find(text);
    if (!f) return { found: false };
    const el = f.range.startContainer.parentElement;
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 500));
    // then nudge so the text sits at Y (handles inner scroll containers too)
    let p = el;
    let sc = null;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) { sc = p; break; }
      p = p.parentElement;
    }
    for (let k = 0; k < 4; k++) {
      const r = pl.find(text).union;
      const d = r.y - Y;
      if (Math.abs(d) < 1) break;
      if (sc) sc.scrollTop += d; else window.scrollBy({ left: 0, top: d, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 400));
    }
    const chain = [];
    for (let q = el; q && q !== document.body && chain.length < 10; q = q.parentElement) {
      const rr = q.getBoundingClientRect();
      chain.push(`${q.tagName.toLowerCase()}${q.id ? '#' + q.id : ''}${q.className && typeof q.className === 'string' ? '.' + q.className.trim().split(/\s+/).slice(0, 4).join('.') : ''} [${Math.round(rr.left)},${Math.round(rr.top)},${Math.round(rr.width)}x${Math.round(rr.height)}]`);
    }
    return { found: true, scroller: sc ? sc.className || sc.tagName : 'window', chain, rect: pl.find(text).union };
  }, { text, Y });
  await page.waitForTimeout(600);
}
const click = opt('click', null);
if (click) {
  // click the first visible element whose text matches, nearest to the target text if one was given
  const ok = await page.evaluate(({ click, text }) => {
    const pl = window.__pl;
    const t = text ? pl.find(text) : null;
    const cands = Array.from(document.querySelectorAll('a,button,[role=button],summary')).filter((e) => pl.visible(e) && pl.norm(e.innerText || '').toLowerCase() === click.toLowerCase());
    if (!cands.length) return false;
    let best = cands[0];
    if (t) {
      const d = (e) => { const r = e.getBoundingClientRect(); return Math.hypot(r.left - t.union.x, r.top - t.union.y); };
      best = cands.sort((a, b) => d(a) - d(b))[0];
    }
    best.click();
    return true;
  }, { click, text });
  console.log('clicked', click, ok);
  await page.waitForTimeout(2500);
}
const fixed = await page.evaluate(() =>
  Array.from(document.querySelectorAll('body *'))
    .filter((e) => {
      const p = getComputedStyle(e).position;
      return (p === 'fixed' || p === 'sticky') && window.__pl.visible(e);
    })
    .slice(0, 25)
    .map((e) => {
      const r = e.getBoundingClientRect();
      return `${getComputedStyle(e).position} ${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)}]`;
    }),
);
await page.screenshot({ path: out });
console.log(JSON.stringify({ url: page.url(), consent, info, fixed }, null, 1));
await ctx.close();
