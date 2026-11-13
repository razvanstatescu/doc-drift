// Capture library for the launch video: drives the logged-in Chrome on CDP port 9222.
// Stills: Emulation.setDeviceMetricsOverride 1920x1080 CSS at deviceScaleFactor 2, then
// Page.captureScreenshot (3840x2160 PNG). Recordings: Page.startScreencast (JPEG, every frame),
// each frame's timestamp kept, assembled into a constant 60 fps H.264 MP4 that keeps real timing.
// Clicks and hovers are dispatched through the same CDP session and logged in capture pixels.
// No CSS is ever injected into the product.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const VIDEO = path.resolve(HERE, '../..');
export const OUT = path.join(VIDEO, 'public', 'captures');
export const STAGE = path.join(HERE, 'entries');
export const FRAMES = path.join(HERE, 'frames');
export const W = 1920;
export const H = 1080;
export const DSF = 2;
export const SITE = 'https://one-atlas-jzzf.atlassian.net';
export const RUNBOOK = `${SITE}/wiki/spaces/PLAT/pages/2720100/Payments+rollback+runbook`;

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(STAGE, { recursive: true });
fs.mkdirSync(FRAMES, { recursive: true });

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const nowIso = () => {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const local = new Date(d.getTime() + off * 60000).toISOString().slice(0, 19);
  return `${local}${sign}${pad(off / 60)}:${pad(off % 60)}`;
};

export function log(line) {
  const text = `- ${nowIso()} ${line}`;
  fs.appendFileSync(path.join(HERE, 'LOG.md'), text + '\n');
  console.log(text);
}

/** Connects to the shared Chrome and returns the page whose URL contains `match` (or the first). */
export async function connect(match) {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find((p) => match && p.url().includes(match)) || context.pages()[0];
  if (!page) page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const s = new Session(browser, context, page, cdp);
  await s.emulate();
  return s;
}

export class Session {
  constructor(browser, context, page, cdp) {
    Object.assign(this, { browser, context, page, cdp });
    this.rec = null;
    this.pending = [];
    this.deferEncode = true;
    this.mouse = { x: W / 2, y: H / 2 };
  }

  async emulate() {
    await this.cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DSF, mobile: false, screenWidth: W, screenHeight: H });
    await this.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  }

  async goto(url, settleMs = 2500) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
    await sleep(settleMs);
  }

  /** PNG at 3840x2160 into public/captures/<id>.png. Returns the path. */
  async still(id, { clip } = {}) {
    const params = { format: 'png', fromSurface: true, captureBeyondViewport: false };
    if (clip) params.clip = { ...clip, scale: 1 };
    const { data } = await this.cdp.send('Page.captureScreenshot', params);
    const file = path.join(OUT, `${id}.png`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    return file;
  }

  /** Bounding box (CSS px) of the first visible match of a Playwright locator. */
  async box(locator, { timeout = 10000 } = {}) {
    const loc = typeof locator === 'string' ? this.page.locator(locator) : locator;
    await loc.first().waitFor({ state: 'visible', timeout });
    const b = await loc.first().boundingBox();
    if (!b) throw new Error(`no box for ${locator}`);
    return b;
  }

  /** Moves the mouse along a straight path (CSS px) with small steps, like a hand would. */
  async moveTo(x, y, { steps = 18, stepMs = 12 } = {}) {
    const { x: x0, y: y0 } = this.mouse;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const px = x0 + (x - x0) * e;
      const py = y0 + (y - y0) * e;
      await this.cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px, y: py, button: 'none', pointerType: 'mouse' });
      if (stepMs) await sleep(stepMs);
    }
    this.mouse = { x, y };
  }

  /** Clicks the centre of a box (or a point), logging it in capture pixels. */
  async click(target, label, { hoverMs = 250, moveSteps = 18 } = {}) {
    const p = target.width !== undefined ? { x: target.x + target.width / 2, y: target.y + target.height / 2 } : target;
    await this.moveTo(p.x, p.y, { steps: moveSteps });
    if (hoverMs) await sleep(hoverMs);
    const at = Date.now();
    await this.cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1, pointerType: 'mouse' });
    await sleep(70);
    await this.cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1, pointerType: 'mouse' });
    const entry = { x: Math.round(p.x * DSF), y: Math.round(p.y * DSF), label, atEpochMs: at };
    if (this.rec) this.rec.clicks.push(entry);
    return entry;
  }

  /** Hovers a box centre (logged as a hover, not a click). */
  async hover(target, label, { moveSteps = 18 } = {}) {
    const p = target.width !== undefined ? { x: target.x + target.width / 2, y: target.y + target.height / 2 } : target;
    await this.moveTo(p.x, p.y, { steps: moveSteps });
    const entry = { x: Math.round(p.x * DSF), y: Math.round(p.y * DSF), label, atEpochMs: Date.now() };
    if (this.rec) this.rec.hovers.push(entry);
    return entry;
  }

  /** Smooth mouse-wheel scroll at the current mouse position (or at x,y), dy CSS px in small steps. */
  async wheel(dy, { x, y, step = 60, stepMs = 16 } = {}) {
    const px = x ?? this.mouse.x;
    const py = y ?? this.mouse.y;
    if (x !== undefined) await this.moveTo(px, py, { steps: 8 });
    const n = Math.max(1, Math.round(Math.abs(dy) / step));
    for (let i = 0; i < n; i++) {
      await this.cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: px, y: py, deltaX: 0, deltaY: Math.sign(dy) * step, pointerType: 'mouse' });
      await sleep(stepMs);
    }
    if (this.rec) this.rec.hovers.push({ x: Math.round(px * DSF), y: Math.round(py * DSF), label: `wheel ${dy > 0 ? 'down' : 'up'} ${Math.abs(dy)} css px`, atEpochMs: Date.now() });
  }

  /** Wheel-scrolls (at x,y) until the locator's box is inside [top, bottom] of the viewport. */
  async wheelTo(locator, { x, y, top = 140, bottom = H - 140, maxSteps = 40 } = {}) {
    for (let i = 0; i < maxSteps; i++) {
      const b = await locator.first().boundingBox();
      if (!b) return null;
      if (b.y >= top && b.y + b.height <= bottom) return b;
      const dy = b.y < top ? -Math.min(300, top - b.y + 40) : Math.min(300, b.y + b.height - bottom + 40);
      await this.wheel(dy, { x, y });
      await sleep(250);
    }
    return locator.first().boundingBox();
  }

  async type(text, { delay = 45 } = {}) {
    await this.page.keyboard.type(text, { delay });
  }

  /** Starts a screencast into frames/<id>/, keeping every frame's timestamp. */
  async startRecording(id) {
    const dir = path.join(FRAMES, id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const rec = { id, dir, frames: [], clicks: [], hovers: [], startEpochMs: Date.now(), n: 0 };
    this.rec = rec;
    this._onFrame = async (ev) => {
      const name = `f${String(rec.n++).padStart(6, '0')}.jpg`;
      fs.writeFileSync(path.join(dir, name), Buffer.from(ev.data, 'base64'));
      rec.frames.push({ name, ts: ev.metadata.timestamp, w: ev.metadata.deviceWidth, h: ev.metadata.deviceHeight });
      try {
        await this.cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId });
      } catch {}
    };
    this.cdp.on('Page.screencastFrame', this._onFrame);
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * DSF, maxHeight: H * DSF, everyNthFrame: 1 });
    // Nudge one frame out even on a still page.
    await this.cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: this.mouse.x, y: this.mouse.y, button: 'none', pointerType: 'mouse' });
    await sleep(400);
    return rec;
  }

  /** Stops the screencast and assembles public/captures/<id>.mp4 at a constant 60 fps. */
  async stopRecording({ tailMs = 600 } = {}) {
    await sleep(tailMs);
    const rec = this.rec;
    const endEpoch = Date.now() / 1000;
    await this.cdp.send('Page.stopScreencast');
    this.cdp.off('Page.screencastFrame', this._onFrame);
    await sleep(300);
    this.rec = null;
    const frames = rec.frames.filter((f) => fs.existsSync(path.join(rec.dir, f.name))).sort((a, b) => a.ts - b.ts);
    if (frames.length === 0) throw new Error('no frames recorded');
    const t0 = frames[0].ts;
    fs.writeFileSync(path.join(rec.dir, 'frames.json'), JSON.stringify({ id: rec.id, endEpoch, clicks: rec.clicks, hovers: rec.hovers, frames }, null, 1));
    const out = path.join(OUT, `${rec.id}.mp4`);
    // Encoding blocks the event loop for seconds; takes call finishPending() at the end instead.
    if (this.deferEncode) this.pending.push(() => assemble(rec.dir, frames, endEpoch, out));
    else assemble(rec.dir, frames, endEpoch, out);
    const durationS = endEpoch - t0;
    const clicks = rec.clicks.map(({ atEpochMs, ...c }) => ({ ...c, atMs: Math.round(atEpochMs - t0 * 1000) }));
    const hovers = rec.hovers.map(({ atEpochMs, ...c }) => ({ ...c, atMs: Math.round(atEpochMs - t0 * 1000) }));
    const gaps = frames.slice(1).map((f, i) => f.ts - frames[i].ts);
    const stats = {
      frames: frames.length,
      durationS: +durationS.toFixed(3),
      sourceFps: +(frames.length / durationS).toFixed(1),
      maxGapMs: Math.round(Math.max(0, ...gaps) * 1000),
      frameSize: `${frames[0].w}x${frames[0].h} css`,
      firstFrameEpochMs: Math.round(t0 * 1000),
    };
    return { file: out, clicks, hovers, stats, t0Epoch: t0 };
  }

  /** Encodes every deferred recording (call after the take's last UI step). */
  finishPending() {
    while (this.pending.length) this.pending.shift()();
  }

  async close() {
    this.finishPending();
    try {
      await this.cdp.send('Emulation.clearDeviceMetricsOverride');
    } catch {}
    try {
      await this.cdp.detach();
    } catch {}
  }
}

/**
 * Constant 60 fps MP4 from screencast frames with real timing: output frame k shows the latest source
 * frame whose timestamp is at or before t0 + k/60 (symlinked sequence, then libx264 crf 14 yuv420p).
 */
export function assemble(dir, frames, endEpoch, out) {
  const seq = path.join(dir, 'seq');
  fs.rmSync(seq, { recursive: true, force: true });
  fs.mkdirSync(seq);
  const t0 = frames[0].ts;
  const n = Math.max(1, Math.ceil((endEpoch - t0) * 60));
  let j = 0;
  for (let k = 0; k < n; k++) {
    const t = t0 + k / 60 + 1e-6;
    while (j + 1 < frames.length && frames[j + 1].ts <= t) j++;
    fs.symlinkSync(path.join(dir, frames[j].name), path.join(seq, `${String(k).padStart(6, '0')}.jpg`));
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(seq, '%06d.jpg'),
    '-vf', `scale=${W * DSF}:${H * DSF}:flags=lanczos,format=yuv420p`, '-r', '60', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow',
    '-g', '30', '-an', '-movflags', '+faststart', out]);
  return n;
}

/** Writes one captures.json entry to entries/<id>.json (merged later by merge.mjs). */
export function stage(entry) {
  const base = { kind: 'still', width: W * DSF, height: H * DSF, takenAt: nowIso(), env: 'development', app: process.env.CAPTURE_APP || 'core 5.4.0', masks: [], clicks: [] };
  const e = { ...base, ...entry };
  fs.writeFileSync(path.join(STAGE, `${e.id}.json`), JSON.stringify(e, null, 2) + '\n');
  return e;
}

/** Boxes (capture px) of every visible element whose text contains "(Development)". */
export async function devMasks(page, why = 'Development install suffix (BRIEF decision 7)') {
  const boxes = await page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const i = n.textContent.indexOf('(Development)');
      if (i < 0) continue;
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + '(Development)'.length);
      // Clip to every ancestor that clips its content (scroll containers), then to the viewport.
      const clips = [];
      for (let e = n.parentElement; e; e = e.parentElement) {
        const st = getComputedStyle(e);
        if (/(auto|scroll|hidden|clip)/.test(st.overflowY + st.overflowX)) clips.push(e.getBoundingClientRect());
      }
      clips.push({ left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight });
      for (const b of r.getClientRects()) {
        let l = b.left, t = b.top, rr = b.right, bb = b.bottom;
        for (const c of clips) {
          l = Math.max(l, c.left);
          t = Math.max(t, c.top);
          rr = Math.min(rr, c.right);
          bb = Math.min(bb, c.bottom);
        }
        if (rr - l > 1 && bb - t > 1) out.push([l, t, rr - l, bb - t]);
      }
    }
    return out;
  });
  return boxes.map(([x, y, w, h]) => ({ box: [Math.floor(x * 2) - 4, Math.floor(y * 2) - 4, Math.ceil(w * 2) + 8, Math.ceil(h * 2) + 8], why }));
}
