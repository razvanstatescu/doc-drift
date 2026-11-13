// In-page helpers for plate capture. Injected with page.addInitScript / page.evaluate; defines window.__pl.
// Nothing here changes a word on the page: it only finds text, measures boxes and reads attributes.
(() => {
  if (window.__pl) return;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'TEXTAREA']);
  const BLOCK = /^(block|flex|grid|list-item|table|table-row|table-cell|flow-root)$/;
  // Normalise for matching only: typographic quotes/dashes/spaces to ASCII, whitespace collapsed.
  const normCh = (c) => {
    if (/[‘’‚‛′`´]/.test(c)) return "'";
    if (/[“”„‟″]/.test(c)) return '"';
    if (/[‐‑‒–—―−]/.test(c)) return '-';
    if (/[\s  -​  　]/.test(c)) return ' ';
    if (c === '­') return '';
    return c;
  };
  const norm = (s) => Array.from(s).map(normCh).join('').replace(/ +/g, ' ').trim();
  function blockOf(el) {
    while (el && el !== document.body) {
      const d = getComputedStyle(el).display;
      if (BLOCK.test(d)) return el;
      el = el.parentElement;
    }
    return document.body;
  }
  function visible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    return el.getClientRects().length > 0;
  }
  // Build a flat, normalised text of the visible document with a map back to (node, offset).
  function flatten(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        let p = n.parentElement;
        while (p) {
          if (SKIP.has(p.tagName.toUpperCase())) return NodeFilter.FILTER_REJECT;
          p = p.parentElement;
        }
        return visible(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    let flat = '';
    const map = [];
    let prevBlock = null;
    let prevNode = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const b = blockOf(n.parentElement);
      if (prevBlock && b !== prevBlock && !flat.endsWith(' ')) {
        flat += ' ';
        map.push([prevNode, prevNode.length]);
      }
      const t = n.data;
      for (let i = 0; i < t.length; i++) {
        const c = normCh(t[i]);
        if (c === '') continue;
        if (c === ' ' && (flat.endsWith(' ') || flat.length === 0)) continue;
        flat += c;
        map.push([n, i]);
      }
      prevBlock = b;
      prevNode = n;
    }
    return { flat, map };
  }
  function rectsOfRange(r) {
    return Array.from(r.getClientRects())
      .filter((q) => q.width > 0.5 && q.height > 0.5)
      .map((q) => ({ x: q.left, y: q.top, w: q.width, h: q.height }));
  }
  // Merge per-node rects into one rect per line (same top within 3 px).
  function lineRects(rs) {
    const lines = [];
    for (const q of rs.sort((a, b) => a.y - b.y || a.x - b.x)) {
      const L = lines.find((l) => Math.abs(l.cy - (q.y + q.h / 2)) < Math.max(3, q.h * 0.35));
      if (L) {
        const x0 = Math.min(L.x, q.x), y0 = Math.min(L.y, q.y);
        const x1 = Math.max(L.x + L.w, q.x + q.w), y1 = Math.max(L.y + L.h, q.y + q.h);
        Object.assign(L, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      } else lines.push({ ...q, cy: q.y + q.h / 2 });
    }
    return lines.map(({ x, y, w, h }) => ({ x, y, w, h }));
  }
  const union = (rs) => {
    if (!rs.length) return null;
    const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
    const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  // Find the nth occurrence of `needle` (normalised) in the visible text, optionally inside `within` (selector or element).
  function find(needle, { nth = 0, within } = {}) {
    const root = typeof within === 'string' ? document.querySelector(within) : within || document.body;
    if (!root) return null;
    const { flat: flat0, map } = flatten(root);
    let nn = norm(needle);
    let flat = flat0;
    // Case-sensitive first; fall back to case-insensitive (CSS text-transform renders DOM "Editorial" as EDITORIAL).
    if (flat.indexOf(nn) < 0) {
      const lc = (s) => Array.from(s).map((c) => (c.toLowerCase().length === 1 ? c.toLowerCase() : c)).join('');
      flat = lc(flat0);
      nn = lc(nn);
    }
    let idx = -1;
    for (let k = 0; k <= nth; k++) {
      idx = flat.indexOf(nn, idx + 1);
      if (idx < 0) return null;
    }
    const [sn, so] = map[idx];
    const [en, eo] = map[idx + nn.length - 1];
    const r = document.createRange();
    r.setStart(sn, so);
    r.setEnd(en, Math.min(eo + 1, en.length));
    const rects = lineRects(rectsOfRange(r));
    return { exact: r.toString(), rects, union: union(rects), count: flat.split(nn).length - 1, range: r };
  }
  function findInfo(needle, opts) {
    const f = find(needle, opts);
    if (!f) return null;
    const { range, ...rest } = f;
    const el = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    const blk = blockOf(el);
    const br = blk.getBoundingClientRect();
    return { ...rest, block: { tag: blk.tagName, cls: String(blk.className || '').slice(0, 120), text: norm(blk.innerText || '').slice(0, 1200), rect: { x: br.left, y: br.top, w: br.width, h: br.height } } };
  }
  function rectOf(sel, i = 0) {
    const els = typeof sel === 'string' ? Array.from(document.querySelectorAll(sel)).filter(visible) : [sel];
    const el = els[i];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  function rectsOf(sel) {
    return Array.from(document.querySelectorAll(sel)).filter(visible).map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height, text: norm(el.innerText || el.getAttribute('alt') || '').slice(0, 80) };
    });
  }
  // Scroll so that a document-y position lands at a given viewport y.
  function scrollDocTo(docY) {
    window.scrollTo(0, Math.max(0, docY));
    return window.scrollY;
  }
  // All matches of a needle: [{ exact, rects, union }].
  function findAll(needle, { within } = {}) {
    const out = [];
    for (let nth = 0; nth < 50; nth++) {
      const f = find(needle, { nth, within });
      if (!f) break;
      out.push({ exact: f.range.toString(), rects: f.rects, union: f.union });
    }
    return out;
  }
  function scroller(el) {
    for (let p = el && el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) return p;
    }
    return null;
  }
  // Scroll (window, body/html, or the element's own scroll container) so the element's top lands at viewport y.
  async function scrollElTo(el, y) {
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 300));
    const sc = scroller(el);
    const targets = [sc, window, document.scrollingElement, document.body, document.documentElement].filter(Boolean);
    for (let k = 0; k < 6; k++) {
      const d = el.getBoundingClientRect().top - y;
      if (Math.abs(d) < 0.5) break;
      for (const t of targets) {
        const before = el.getBoundingClientRect().top;
        if (t === window) window.scrollBy({ left: 0, top: d, behavior: 'instant' });
        else t.scrollTop += d;
        await new Promise((r) => setTimeout(r, 60));
        if (Math.abs(el.getBoundingClientRect().top - before) > 0.5) break; // this one scrolls
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return el.getBoundingClientRect().top;
  }
  function elOf(needle) {
    const f = find(needle);
    if (!f) return null;
    const n = f.range.startContainer;
    return n.nodeType === 1 ? n : n.parentElement;
  }
  const pad = (r, l, t = l, rr = l, b = t) => ({ x: r.x - l, y: r.y - t, w: r.w + l + rr, h: r.h + t + b });
  // Shrink a crop vertically so no text line is cut by its top or bottom edge (a partial line would show words
  // without their neighbours). Lines inside `keep` (the key text) are never cut; such conflicts are reported.
  function fixCrop(c, keep) {
    const rects = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.data.trim()) continue;
      const el = n.parentElement;
      if (!el || !visible(el)) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const q of r.getClientRects()) if (q.width > 0.5 && q.height > 0.5) rects.push({ l: q.left, r: q.right, t: q.top, b: q.bottom });
    }
    let top = c.y, bottom = c.y + c.h;
    const conflicts = [];
    for (let k = 0; k < 8; k++) {
      let changed = false;
      for (const q of rects) {
        if (q.r <= c.x + 0.5 || q.l >= c.x + c.w - 0.5) continue;
        if (q.t < top - 0.5 && q.b > top + 0.5) {
          // Moving the edge inward would cut the key text: grow outward to take in the whole line instead.
          if (keep && q.b > keep.y + 0.5 && q.t < keep.y + keep.h) { conflicts.push('top'); top = q.t - 0.25; changed = true; continue; }
          top = q.b + 0.25; changed = true;
        }
        if (q.t < bottom - 0.5 && q.b > bottom + 0.5) {
          if (keep && q.t < keep.y + keep.h - 0.5 && q.b > keep.y) { conflicts.push('bottom'); bottom = q.b + 0.25; changed = true; continue; }
          bottom = q.t - 0.25; changed = true;
        }
      }
      if (!changed) break;
    }
    return { crop: { ...c, y: top, h: bottom - top }, moved: { top: top - c.y, bottom: c.y + c.h - bottom }, conflicts: Array.from(new Set(conflicts)) };
  }
  window.__pl = { fixCrop, norm, find, findAll, findInfo, rectOf, rectsOf, union, lineRects, flatten, visible, scrollDocTo, scroller, scrollElTo, elOf, pad, blockOf };
})();
