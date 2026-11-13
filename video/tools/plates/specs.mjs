// Per-plate capture specs. Every in-page function runs in the page (window.__pl from inpage.js) and returns
// rectangles in CSS px relative to the viewport. CSS here only hides consent notices, ads, promos and page chrome;
// it never touches the words that are captured.
//   w, h      viewport (CSS px); captured at deviceScaleFactor 3
//   css       extra CSS (hide notices/ads/chrome)
//   prep      async (page) => {}  extra clicks before measuring
//   wrap      { start, end, next, min, max }: pick a viewport width where the line holding `start`..`end` ends right
//             after `end` (so `next` starts the next line). Used to crop to one sentence without cutting a line.
//   align     async in-page fn: scrolls into position, returns nothing
//   crop      in-page fn(a) -> {x,y,w,h}
//   blur      in-page fn(a) -> [{x,y,w,h,why}]
//   regions   in-page fn(a) -> {name: {x,y,w,h}} (optional, e.g. masthead, date)

// Privacy notices injected as an empty <div> at the end of <body> with a closed shadow root (0x0 host).
const hideShadowNotices = async (page) => {
  await page.evaluate(() => {
    for (const d of document.querySelectorAll('body > div')) {
      const r = d.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && d.childElementCount === 0) d.style.setProperty('display', 'none', 'important');
    }
  });
};
const FC = '.fc-consent-root, .fc-dialog-overlay, .fc-ccpa-root, .fc-message-root, .fc-monetization-dialog-container, iframe[src*="fundingchoices"] { display: none !important; }';

// Shared in-page snippets are inlined in each function (Playwright serialises the function source only).
export const SPECS = {
  // ---------- Bar 1 ----------
  'A2-01': {
    w: 1280, h: 1000,
    crop: (a) => { const pl = window.__pl; const k = pl.find(a.key); const L = k.rects[k.rects.length - 1]; return { x: 0, y: 0, w: window.innerWidth, h: Math.ceil(L.y + L.h + 5) }; },
    regions: () => { const pl = window.__pl; const t = pl.rectOf('h1.title'); const d = pl.rectOf('.dateline'); return { title: t, dateline: d, licence: pl.rectOf('.abs-license') }; },
  },
  'D1-02': {
    w: 1280, h: 1000,
    align: async () => { const pl = window.__pl; await pl.scrollElTo(pl.elOf('Maintaining Playbooks'), 140); },
    crop: (a) => { const pl = window.__pl; const hd = pl.find('Maintaining Playbooks').union; const el = pl.elOf(a.key); const blk = pl.blockOf(el); const b = blk.getBoundingClientRect(); const nx = blk.nextElementSibling ? blk.nextElementSibling.getBoundingClientRect().top : b.bottom + 40; const bottom = Math.min(b.bottom + 22, nx - 6); return { x: b.left - 50, y: hd.y - 40, w: b.width + 100, h: bottom - (hd.y - 40) }; },
  },
  'D1-04': {
    // HN sizes the comment column by its content, so no viewport width breaks the line right after "save.".
    // Crop to the one line that holds the two sentences, ending in the space before the next word ("Spend").
    w: 1280, h: 900,
    crop: () => { const pl = window.__pl; const S = pl.find('Secondly, throw away').rects[0]; const E = pl.find('the moment you hit save.'); const L = E.rects[E.rects.length - 1]; const N = pl.find('Spend your time').rects[0]; if (Math.abs(S.y - L.y) > 2 || Math.abs(N.y - L.y) > 2) throw new Error('expected one line'); const x0 = S.x - 22; const x1 = (L.x + L.w + N.x) / 2; return { x: x0, y: S.y - 4, w: x1 - x0, h: S.h + 5 }; },
    // On a single-comment page the author link has no .hnuser class: select by href too.
    blur: () => Array.from(document.querySelectorAll('a.hnuser, .comhead a[href^="user?id="], a[href^="user?id="]')).filter((e) => window.__pl.visible(e)).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left - 2, y: r.top - 1, w: r.width + 4, h: r.height + 2, why: 'Hacker News handle' }; }),
    check: () => { const pl = window.__pl; const N = pl.find('Spend your time').rects[0]; const E = pl.find('the moment you hit save.'); const L = E.rects[E.rects.length - 1]; return { gapBeforeNextWordPx: N.x - (L.x + L.w) }; },
  },
  'D1-11': {
    // The paragraph alone. (Substack's sticky header would not reappear for an automated reader, and the
    // paragraphs above it are not part of the quote.)
    w: 1280, h: 900,
    css: '[role="dialog"], .modal, [class*="modal-"], [class*="Modal"], .subscribe-prompt, [class*="subscribe-dialog"], [data-testid="subscribe-modal"] { display: none !important; } body { overflow: auto !important; }',
    prep: async (page) => { await page.keyboard.press('Escape'); },
    align: async (a) => { const pl = window.__pl; await pl.scrollElTo(pl.blockOf(pl.elOf(a.key)), 300); },
    crop: (a) => { const pl = window.__pl; const el = pl.blockOf(pl.elOf(a.key)); const b = el.getBoundingClientRect(); const pv = el.previousElementSibling ? el.previousElementSibling.getBoundingClientRect().bottom : b.top - 40; const nx = el.nextElementSibling ? el.nextElementSibling.getBoundingClientRect().top : b.bottom + 40; const top = Math.max(b.top - 14, pv + 6); const bottom = Math.min(b.bottom + 14, nx - 6); return { x: b.left - 24, y: top, w: b.width + 48, h: bottom - top }; },
  },
  'D1-21': {
    // The first sentence fills the top of the comment; crop from the HN bar down to that line, ending in the
    // space before the second sentence ("You are usually ..."). The comment header line ends further left.
    w: 1280, h: 900,
    crop: () => { const pl = window.__pl; const t = document.querySelector('#hnmain').getBoundingClientRect(); const S = pl.find('Documentation rots').rects[0]; const E = pl.find('for the code to work.'); const L = E.rects[E.rects.length - 1]; const N = pl.find('You are usually').rects[0]; if (Math.abs(S.y - L.y) > 2 || Math.abs(N.y - L.y) > 2) throw new Error('expected one line'); const hd = document.querySelector('.comhead').getBoundingClientRect(); const x1 = (L.x + L.w + N.x) / 2; if (hd.right > x1) throw new Error('comment header would be cut'); return { x: t.left, y: t.top, w: x1 - t.left, h: S.y + S.h + 2 - t.top }; },
    // On a single-comment page the author link has no .hnuser class: select by href too.
    blur: () => Array.from(document.querySelectorAll('a.hnuser, .comhead a[href^="user?id="], a[href^="user?id="]')).filter((e) => window.__pl.visible(e)).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left - 2, y: r.top - 1, w: r.width + 4, h: r.height + 2, why: 'Hacker News handle' }; }),
  },
  'D1-12': {
    w: 1280, h: 900,
    align: async (a) => { const pl = window.__pl; await pl.scrollElTo(pl.blockOf(pl.elOf(a.key)), 300); },
    crop: (a) => { const pl = window.__pl; const b = pl.blockOf(pl.elOf(a.key)).getBoundingClientRect(); return { x: b.left - 16, y: b.top - 14, w: b.width + 32, h: b.height + 26 }; },
  },
  // ---------- Bar 2 ----------
  'D1-06': {
    w: 1280, h: 900,
    align: async () => { const pl = window.__pl; const h = document.getElementById('Conclusions'); await pl.scrollElTo(h.closest('h2') || h, 160); },
    crop: (a) => { const pl = window.__pl; const h = document.getElementById('Conclusions'); const hb = (h.closest('.mw-heading') || h.closest('h2') || h).getBoundingClientRect(); const li = pl.blockOf(pl.elOf(a.key)).getBoundingClientRect(); const main = document.querySelector('.mw-parser-output').getBoundingClientRect(); return { x: main.left - 14, y: hb.top - 16, w: main.width + 28, h: li.bottom + 10 - (hb.top - 16) }; },
  },
  'D1-07': {
    w: 1280, h: 900,
    align: async () => { const pl = window.__pl; const h = document.getElementById('What_went_poorly?'); await pl.scrollElTo(h.closest('.mw-heading') || h.closest('h3') || h, 220); },
    crop: (a) => { const pl = window.__pl; const h = document.getElementById('What_went_poorly?'); const hb = (h.closest('.mw-heading') || h.closest('h3') || h).getBoundingClientRect(); const li = pl.blockOf(pl.elOf(a.key)).getBoundingClientRect(); const main = document.querySelector('.mw-parser-output').getBoundingClientRect(); return { x: main.left - 14, y: hb.top - 14, w: main.width + 28, h: li.bottom + 10 - (hb.top - 14) }; },
  },
  'D2-03': {
    w: 1280, h: 900,
    align: async () => { const pl = window.__pl; await pl.scrollElTo(document.querySelector('.page-expiry--expired'), 300); },
    crop: () => { const b = document.querySelector('.page-expiry--expired').getBoundingClientRect(); return { x: b.left - 14, y: b.top - 14, w: b.width + 28, h: b.height + 28 }; },
  },
  'D1-03': {
    w: 1280, h: 900,
    css: FC + ' .placement-top, .google-ad, .adunit { display: none !important; }',
    prep: hideShadowNotices,
    crop: () => { const pl = window.__pl; const d = pl.find('Published Fri 10 May 2019').union; return { x: 40, y: 0, w: 1200, h: d.y + d.h + 16 }; },
    regions: () => { const pl = window.__pl; return { masthead: { x: 0, y: 0, w: 1280, h: 70 }, headline: pl.find('Techie with outdated documentation').union, date: pl.find('Published Fri 10 May 2019').union }; },
  },
  'D2-04': {
    w: 1280, h: 900,
    // write.as renders paragraphs as inline <p> inside one block: scroll the <p> itself.
    align: async (a) => { const pl = window.__pl; const el = pl.elOf(a.key); await pl.scrollElTo(el.closest('p') || pl.blockOf(el), 300); },
    crop: (a) => { const pl = window.__pl; const k = pl.find(a.key); const el = k.range.startContainer.parentElement; let p = el; while (p && getComputedStyle(p).display !== 'block' && p.tagName !== 'P') p = p.parentElement; const b = (el.closest('p') || p).getBoundingClientRect(); return { x: b.left - 16, y: b.top - 14, w: b.width + 32, h: b.height + 26 }; },
  },
  'D2-01': {
    w: 1280, h: 900,
    align: async (a) => { const pl = window.__pl; await pl.scrollElTo(pl.elOf(a.key).closest('blockquote'), 300); },
    crop: (a) => { const pl = window.__pl; const b = pl.elOf(a.key).closest('blockquote').getBoundingClientRect(); const t = pl.find(a.key).union; const x0 = b.left - 16; return { x: x0, y: b.top - 14, w: Math.max(t.x + t.w + 48 - x0, 600), h: b.height + 28 }; },
  },
  'D1-01': {
    w: 1280, h: 900,
    align: async () => { const pl = window.__pl; await pl.scrollElTo(pl.elOf('Documentation is highly valued, but often overlooked'), 160); },
    crop: (a) => { const pl = window.__pl; const hd = pl.blockOf(pl.elOf('Documentation is highly valued, but often overlooked')).getBoundingClientRect(); const li = pl.elOf(a.key).closest('li').getBoundingClientRect(); return { x: hd.left - 16, y: hd.top - 16, w: Math.max(li.right, hd.right) + 16 - (hd.left - 16), h: li.bottom + 12 - (hd.top - 16) }; },
  },
  'D1-05': {
    // The reader's view with the site bar stuck at the top: the paragraph sits just under the bar, and the
    // paragraph above it is fully hidden behind the bar (no peeking descenders).
    w: 1280, h: 900,
    align: async (a) => {
      const pl = window.__pl;
      const el = pl.blockOf(pl.elOf(a.key));
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 600));
      const hbNow = () => { const hdr = Array.from(document.querySelectorAll('body *')).filter((e) => { const p = getComputedStyle(e).position; const r = e.getBoundingClientRect(); return (p === 'fixed' || p === 'sticky') && r.top <= 1 && r.bottom > 20 && r.width > innerWidth * 0.6 && r.height > 30 && r.height < 160 && pl.visible(e); }); return hdr.length ? Math.max(...hdr.map((e) => e.getBoundingClientRect().bottom)) : 0; };
      const prev = el.previousElementSibling;
      const spacing = prev ? el.getBoundingClientRect().top - prev.getBoundingClientRect().bottom : 40;
      const gap = Math.max(4, Math.min(16, spacing - 5));
      for (let k = 0; k < 3; k++) { await pl.scrollElTo(el, hbNow() + gap); await new Promise((r) => setTimeout(r, 500)); }
    },
    crop: (a) => { const pl = window.__pl; const b = pl.blockOf(pl.elOf(a.key)).getBoundingClientRect(); return { x: 0, y: 0, w: window.innerWidth, h: b.bottom + 16 }; },
    check: (a) => { const pl = window.__pl; const el = pl.blockOf(pl.elOf(a.key)); const prev = el.previousElementSibling; const hdr = Array.from(document.querySelectorAll('body *')).filter((e) => { const p = getComputedStyle(e).position; const r = e.getBoundingClientRect(); return (p === 'fixed' || p === 'sticky') && r.top <= 1 && r.bottom > 20 && r.width > innerWidth * 0.6 && pl.visible(e); }); return { headerBottom: hdr.length ? Math.max(...hdr.map((e) => e.getBoundingClientRect().bottom)) : null, paragraphTop: el.getBoundingClientRect().top, previousBottom: prev ? prev.getBoundingClientRect().bottom : null }; },
    noFix: true,
  },
  'D2-02': {
    w: 1280, h: 900,
    align: async (a) => { const pl = window.__pl; await pl.scrollElTo(pl.blockOf(pl.elOf(a.key)), 300); },
    crop: (a) => { const pl = window.__pl; const b = pl.blockOf(pl.elOf(a.key)).getBoundingClientRect(); const k = pl.find(a.key); const L = k.rects[k.rects.length - 1]; return { x: b.left - 14, y: b.top - 14, w: b.width + 28, h: L.y + L.h + 6 - (b.top - 14) }; },
  },
  // ---------- Bar 3 ----------
  'A1-06': {
    w: 1280, h: 900,
    css: '.rightColumn { visibility: hidden !important; }',
    crop: () => { const pl = window.__pl; const d = pl.find('Updated').union; return { x: 0, y: 0, w: window.innerWidth, h: d.y + d.h + 18 }; },
    blur: () => Array.from(document.querySelectorAll('a[href*="/forums/profile/"], img[class*="userPhoto"]')).filter((e) => window.__pl.visible(e)).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left - 3, y: r.top - 2, w: r.width + 6, h: r.height + 4, why: 'community member name or avatar' }; }),
  },
  'A4-02': {
    w: 1280, h: 1000,
    crop: (a) => { const pl = window.__pl; const k = pl.blockOf(pl.elOf(a.key)).getBoundingClientRect(); const top = document.querySelector('#stalker, .issue-header, header#stalker') || document.querySelector('#summary-val'); const t = pl.find('Rovo').union; const crumbs = pl.rectOf('.aui-nav-breadcrumbs') || pl.rectOf('#project-name-val') || t; return { x: 290, y: crumbs.y - 18, w: 980, h: k.bottom + 12 - (crumbs.y - 18) }; },
    blur: () => { const out = []; const rep = document.querySelector('[id^="issue_summary_reporter_"]'); if (rep) { const dd = rep.closest('dd') || rep; const r = dd.getBoundingClientRect(); out.push({ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8, why: 'reporter name and avatar' }); } return out; },
    regions: () => { const pl = window.__pl; return { title: pl.rectOf('#summary-val'), status: pl.find('Gathering Interest')?.union, created: pl.find('Created:')?.union }; },
  },
  'A1-07': {
    w: 1280, h: 900,
    css: '.rightColumn { visibility: hidden !important; }',
    crop: (a) => { const pl = window.__pl; const k = pl.blockOf(pl.elOf(a.key)).getBoundingClientRect(); return { x: 0, y: 0, w: window.innerWidth, h: k.bottom + 16 }; },
    blur: () => Array.from(document.querySelectorAll('a[href*="/forums/profile/"], img[class*="userPhoto"]')).filter((e) => window.__pl.visible(e) && e.getBoundingClientRect().top < 420).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left - 3, y: r.top - 2, w: r.width + 6, h: r.height + 4, why: 'community member name or avatar' }; }),
  },
  'A1-13': {
    // End one abstract line below the key sentence, where the right-hand column also has a gap.
    w: 1280, h: 1000,
    crop: () => { const pl = window.__pl; const n = pl.find('while matched up-to-date evidence'); const L = n.rects[0]; return { x: 0, y: 0, w: window.innerWidth, h: Math.ceil(L.y + L.h + 4) }; },
  },
  R3: {
    w: 1000, h: 800,
    wrap: { start: 'Results: Without the sentence', end: 'followed the stale file.', next: 'Claude Code pointed out', min: 600, max: 1280, oneLine: true },
    crop: (a) => { const pl = window.__pl; const s = pl.find('Results: Without the sentence').rects[0]; const k = pl.find(a.key); const L = k.rects[k.rects.length - 1]; const x0 = s.x - 16; return { x: x0, y: s.y - 10, w: Math.max(L.x + L.w + 16 - x0, 560), h: L.y + L.h + 10 - (s.y - 10) }; },
  },
  'R3-title': {
    of: 'R3', w: 1280, h: 900,
    phrases: ['Stale Instruction Files Override the Code'],
    crop: () => { const pl = window.__pl; const au = pl.rectOf('.authors'); return { x: 0, y: 0, w: window.innerWidth, h: au.y + au.h + 12 }; },
  },
  'A2-02': {
    w: 1280, h: 1000,
    crop: (a) => { const pl = window.__pl; const k = pl.find(a.key); const L = k.rects[k.rects.length - 1]; return { x: 0, y: 0, w: window.innerWidth, h: Math.ceil(L.y + L.h + 5) }; },
  },
  'A1-01': {
    w: 1280, h: 900,
    align: async () => { const pl = window.__pl; await pl.scrollElTo(pl.elOf('Limitations and tips of grounding in Copilot'), 150); },
    crop: (a) => { const pl = window.__pl; const hd = pl.blockOf(pl.elOf('Limitations and tips of grounding in Copilot')).getBoundingClientRect(); const li = pl.elOf(a.key).closest('li').getBoundingClientRect(); return { x: hd.left - 16, y: hd.top - 18, w: Math.max(li.right, hd.right) + 16 - (hd.left - 16), h: li.bottom + 14 - (hd.top - 18) }; },
  },
  'A1-03': {
    w: 1280, h: 900,
    css: FC,
    align: async (a) => { const pl = window.__pl; const h1 = document.querySelector('h1'); h1.scrollIntoView({ block: 'start', behavior: 'instant' }); await new Promise((r) => setTimeout(r, 500)); const hdr = Array.from(document.querySelectorAll('body *')).filter((e) => { const p = getComputedStyle(e).position; const r = e.getBoundingClientRect(); return (p === 'fixed' || p === 'sticky') && r.top <= 1 && r.width > innerWidth * 0.6 && r.height > 30 && r.height < 160 && pl.visible(e); }); const hb = hdr.length ? Math.max(...hdr.map((e) => e.getBoundingClientRect().bottom)) : 0; await pl.scrollElTo(h1, hb + 12); },
    crop: (a) => { const pl = window.__pl; const k = pl.find(a.key).union; return { x: 60, y: 0, w: 985, h: k.y + k.h + 18 }; },
    blur: () => { const pl = window.__pl; const out = []; for (const img of document.querySelectorAll('img')) { const r = img.getBoundingClientRect(); const by = pl.find('Written By'); if (by && r.width > 20 && r.width < 120 && Math.abs(r.top - by.union.y) < 40 && pl.visible(img)) out.push({ x: r.left - 2, y: r.top - 2, w: r.width + 4, h: r.height + 4, why: 'author photo (not needed)' }); } return out; },
  },
  'A1-05': {
    // 700 px wide: the compact article header holds kicker, headline, section and date over the article photo.
    // The photo is blurred around the words (keep = every text line inside the header); the empty ad slot is hidden.
    w: 700, h: 900,
    prep: hideShadowNotices,
    css: FC + ' [class*="top-ad-wrapper"], .adunit, [id^="div-gpt"] { display: none !important; }',
    crop: () => { const hb = document.querySelector('header.article-title').getBoundingClientRect(); return { x: 0, y: 0, w: window.innerWidth, h: hb.bottom }; },
    blurExcept: () => {
      const pl = window.__pl;
      const hero = document.querySelector('header.article-title');
      const hb = hero.getBoundingClientRect();
      const keep = [];
      const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.data.trim() || !pl.visible(n.parentElement)) continue;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const q of r.getClientRects()) if (q.width > 1 && q.height > 1) keep.push({ x: q.left, y: q.top, w: q.width, h: q.height });
      }
      return { area: { x: hb.left, y: hb.top, w: hb.width, h: hb.height }, keep, why: 'article photo behind the headline' };
    },
    check: () => { const pl = window.__pl; const hero = document.querySelector('header.article-title'); return { heroText: pl.norm(hero.innerText) }; },
  },
  'A2-05': {
    w: 1280, h: 1200,
    crop: (a) => { const pl = window.__pl; const k = pl.find(a.key); const L = k.rects[k.rects.length - 1]; let bar = pl.elOf('Technology Radar'); while (bar && bar !== document.body) { const bg = getComputedStyle(bar).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') break; bar = bar.parentElement; } const top = Math.ceil(bar.getBoundingClientRect().top + 0.5); return { x: 0, y: top, w: 1180, h: L.y + L.h + 10 - top }; },
    regions: () => { const pl = window.__pl; return { blip: pl.find('AI-driven documentation sprawl').union, ring: pl.find('Caution').union, published: pl.find('Published : Nov 04, 2026')?.union }; },
  },
  'A3-01': {
    // The data page for the trust question, from the top (survey bar in its resting state, the section title,
    // the page's own summary line and chart) down to the data table with the 48.0% row. No scrolling.
    url: 'https://survey.stackoverflow.co/2026/ai/data/ai-trust',
    w: 1280, h: 1400,
    crop: () => { const pl = window.__pl; const rows = pl.find('Not sure / I do not use AI tools').union; return { x: 0, y: 0, w: window.innerWidth, h: rows.y + rows.h + 18 }; },
    regions: () => { const pl = window.__pl; return { title: pl.find('Trust in AI and other trends')?.union, summary: pl.find('Trust is conditional')?.union, question: pl.find('How much do you trust the output from AI tools or AI agents as part of your workflow?')?.union, row: pl.find('I trust it when I can easily verify the output')?.union }; },
  },
  'A4-01': {
    w: 1280, h: 900,
    prep: async (page) => { const b = await page.$('.alert-bar__close'); if (b && (await b.isVisible())) { await b.click(); await page.waitForTimeout(800); } await page.addStyleTag({ content: '.is-banner-promo { display: none !important; }' }); },
    // The article bar becomes sticky once the reader scrolls past the hero: re-measure after each scroll.
    align: async (a) => {
      const pl = window.__pl;
      const el = pl.blockOf(pl.elOf(a.key));
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 900));
      const hbNow = () => { const hdr = Array.from(document.querySelectorAll('body *')).filter((e) => { const p = getComputedStyle(e).position; const r = e.getBoundingClientRect(); return (p === 'fixed' || p === 'sticky') && r.top <= 1 && r.bottom > 20 && r.width > innerWidth * 0.6 && r.height > 30 && r.height < 160 && pl.visible(e); }); return hdr.length ? Math.max(...hdr.map((e) => e.getBoundingClientRect().bottom)) : 0; };
      for (let k = 0; k < 4; k++) {
        const hb = hbNow();
        await pl.scrollElTo(el, hb + 18);
        await new Promise((r) => setTimeout(r, 900));
        if (Math.abs(el.getBoundingClientRect().top - (hbNow() + 18)) < 1) break;
      }
    },
    crop: (a) => { const pl = window.__pl; const b = pl.blockOf(pl.elOf(a.key)).getBoundingClientRect(); return { x: 0, y: 0, w: window.innerWidth, h: b.bottom + 22 }; },
  },
  'A4-01-title': {
    of: 'A4-01', w: 1280, h: 900,
    phrases: ['The context engine behind your AI', 'May 6, 2026'],
    prep: async (page) => { const b = await page.$('.alert-bar__close'); if (b && (await b.isVisible())) { await b.click(); await page.waitForTimeout(800); } await page.addStyleTag({ content: '.is-banner-promo { display: none !important; }' }); },
    crop: () => { const pl = window.__pl; const d = pl.find('PUBLISHED IN').union; return { x: 0, y: 0, w: window.innerWidth, h: d.y + d.h + 20 }; },
  },
};
