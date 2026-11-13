// Our own headful Chrome (never the capture agent's CDP-9222 Chrome): playwright-core + launchPersistentContext
// with a profile under the session scratchpad. CDP runs over a pipe, so no debugging port is opened.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
export const INPAGE = readFileSync(resolve(here, 'inpage.js'), 'utf8');
export const PROFILE =
  process.env.PLATES_PROFILE ||
  '/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/plates-profile';

export async function openBrowser({ width = 1280, height = 1000, dsf = 3 } = {}) {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chrome',
    headless: false,
    viewport: { width, height },
    deviceScaleFactor: dsf,
    colorScheme: 'light',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    args: ['--disable-blink-features=AutomationControlled', '--hide-scrollbars'],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  await ctx.addInitScript(INPAGE);
  return ctx;
}

// Cookie / consent banners: prefer reject or necessary-only; fall back to accept. Searches every frame.
const REJECT = /^(do not consent|reject all|reject all cookies|reject|decline|decline all|deny|necessary only|only necessary|use necessary cookies only|accept only essential cookies|only essential cookies|essential only|reject non-essential|continue without accepting|refuse all|disagree)$/i;
const ACCEPT = /^(consent|accept all|accept all cookies|accept|accept cookies|i accept|agree|i agree|agree and close|got it|allow all|allow all cookies|ok|okay|accept & close|accept and close|yes, i agree)$/i;
const IDS = ['#onetrust-reject-all-handler', '.ot-pc-refuse-all-handler', '#onetrust-accept-btn-handler', '#truste-consent-required', '#truste-consent-button', 'button#didomi-notice-disagree-button', 'button#didomi-notice-agree-button', '#CybotCookiebotDialogBodyButtonDecline', '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll'];

export async function dismissConsent(page, { rounds = 2 } = {}) {
  const clicked = [];
  for (let round = 0; round < rounds; round++) {
    let any = false;
    for (const frame of page.frames()) {
      for (const sel of IDS) {
        try {
          const el = await frame.$(sel);
          if (el && (await el.isVisible())) {
            await el.click({ timeout: 1500 });
            clicked.push(`${sel}@${new URL(frame.url()).host}`);
            any = true;
            break;
          }
        } catch {}
      }
      if (any) break;
      for (const re of [REJECT, ACCEPT]) {
        try {
          const btns = await frame.$$('button, a[role=button], [role=button], input[type=button], input[type=submit]');
          for (const b of btns) {
            const t = ((await b.innerText().catch(() => '')) || (await b.getAttribute('value')) || '').trim().replace(/\s+/g, ' ');
            if (t && re.test(t) && (await b.isVisible())) {
              // Only click inside something that looks like a consent dialog.
              const ok = await b.evaluate((el) => {
                let p = el;
                for (let i = 0; i < 12 && p; i++, p = p.parentElement) {
                  const s = `${p.id} ${p.className} ${p.getAttribute && (p.getAttribute('aria-label') || '')} ${p.getAttribute && (p.getAttribute('role') || '')}`.toLowerCase();
                  if (/cookie|consent|gdpr|privacy|cmp|banner|onetrust|truste|didomi|sp_message|qc-cmp|notice/.test(s)) return true;
                }
                return /cookie|consent|privacy/i.test(document.title) || location.host.includes('privacy') || location.host.includes('consent');
              });
              if (!ok) continue;
              await b.click({ timeout: 1500 });
              clicked.push(`"${t}"@${new URL(frame.url()).host}`);
              any = true;
              break;
            }
          }
        } catch {}
        if (any) break;
      }
      if (any) break;
    }
    if (!any) break;
    await page.waitForTimeout(800);
  }
  return clicked;
}

export async function settle(page, { ms = 1500, idle = 8000 } = {}) {
  try {
    await page.waitForLoadState('networkidle', { timeout: idle });
  } catch {}
  await page.waitForTimeout(ms);
  try {
    await page.evaluate(() => document.fonts && document.fonts.ready);
  } catch {}
}
