import { createContext, useContext } from "react";

/**
 * Set while a kit piece draws over a REAL capture (RealTake's capture layer, ProofFrame's image). V5.md 8.1: nothing is
 * painted on real footage except logged "(Development)" covers; amber appears only on crafted elements. Kit fills
 * (AmberBlock, Bloom) read this and refuse to draw over a capture (they warn instead); a Mist band, an underline, a
 * ring or the spotlight are fine.
 */
export const RealCaptureContext = createContext<string | null>(null);
export const useRealCapture = () => useContext(RealCaptureContext);

const warned = new Set<string>();
export const warnPaint = (msg: string) => {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(msg);
};

const isLogged = (m: { why?: string }) => Boolean(m.why && /development/i.test(m.why));

/** Inside a logged captures.json cover grown by `g` px: a re-cover of it (another fill or a few px more), allowed. */
const recovers = (m: { box: number[] }, logged: { box: number[] }[], g = 12) => {
  const [x, y, w, h] = m.box;
  return logged.some(({ box: [lx, ly, lw, lh] }) => x >= lx - g && y >= ly - g && x + w <= lx + lw + g && y + h <= ly + lh + g);
};

/**
 * The extra covers a kit piece may draw on a real capture (v5 round 2, V5.md 8.1): logged "(Development)" covers (a
 * `why` that names the Development suffix; log each in your scene README with its box) and re-covers of a captures.json
 * cover (inside its box grown by 12 px, e.g. in another fill). Every other cover is NOT drawn, with a warning: crop instead.
 */
export function allowedCovers<M extends { box: number[]; why?: string }>(capture: string, masks: M[], logged: { box: number[] }[] = []): M[] {
  return masks.filter((m) => {
    if (isLogged(m) || recovers(m, logged)) return true;
    warnPaint(
      `${capture}: the cover at [${m.box.join(", ")}] is not drawn: only logged "(Development)" covers go on a real capture (give it a why naming the Development suffix and log it in your README, or crop instead; V5.md 8.1)`,
    );
    return false;
  });
}

/** Warn for extra covers that are not logged "(Development)" covers (kept for compatibility; allowedCovers also filters). */
export function checkCovers(capture: string, masks: { box: number[]; why?: string }[], logged: { box: number[] }[] = []) {
  allowedCovers(capture, masks, logged);
}
