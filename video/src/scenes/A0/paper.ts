import { BRAND, DAY, elevAt, ink } from "../../v4/kit";

/**
 * The cold open's paper (v4, Day): elevation, washes and marks, from the shared kit (src/v4/kit: `elevAt`, the look).
 * The kit's ladder runs from 0 to 4; a sheet still in the air before it lands on the pile sits one step above it, 5
 * (bigger, softer, fainter: Josh Comeau's rule that higher means softer), so the landing reads as a drop.
 */
// level 4 as the kit's ladder has it (src/v4/look.ts, round 2: a stronger ring and contact layer), and the air above
const L4 = { ring: 0.12, layers: [[6, 12, 0.105], [28, 56, 0.15], [72, 144, 0.16]] } as const;
const L5 = { ring: 0.1, layers: [[11, 24, 0.09], [46, 96, 0.12], [112, 210, 0.13]] } as const;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The Day box-shadow at any elevation 0 to 5 (the kit's `elevAt` up to 4, the air above it). Fathom-tinted. */
export const elevShadow = (e: number): string => {
  if (e <= 4) return elevAt(Math.max(0, e));
  const t = Math.min(1, e - 4);
  const parts = [`0 0 0 1.5px ${ink(+lerp(L4.ring, L5.ring, t).toFixed(4))}`];
  for (let k = 0; k < 3; k++) {
    const [y4, b4, a4] = L4.layers[k];
    const [y5, b5, a5] = L5.layers[k];
    parts.push(`0 ${lerp(y4, y5, t).toFixed(2)}px ${lerp(b4, b5, t).toFixed(2)}px ${ink(+lerp(a4, a5, t).toFixed(4))}`);
  }
  return parts.join(", ");
};

/**
 * Washes (R2 section 13, frame 1): a texture page is washed 50% toward white and 3 px soft; the subject page keeps its
 * key sentence exactly as printed and is washed 62% everywhere else. Words are never changed, only veiled.
 */
export const WASH = { texture: 0.5, subject: 0.62 } as const;
/** Texture pages are 3 px soft at rest (on screen; the desk's zoom scales it a little, like depth of field). */
export const TEXTURE_BLUR = 3;

/**
 * The marker band behind a key phrase: Mist, multiplied with the page, so the ink stays exactly as printed and only
 * the paper under it turns Mist. (R2 section 6.)
 */
export const MIST = BRAND.mist;
/** The underline under a marked phrase: Current (never text). */
export const CURRENT = BRAND.current;

/** Paper and ink on Day. */
export const PAPER = DAY.ground;
export const SHEET = DAY.surface;
export const INK = DAY.text;
