import { BRAND, DAY, elevAt, ink } from "../../v4/kit";

/**
 * The cold open's paper (v4, Day): elevation, washes and marks, from the shared kit (src/v4/kit: `elevAt`, the look).
 * The kit's ladder runs from 0 to 4; a sheet still in the air before it lands on the pile sits one step above it, 5
 * (bigger, softer, fainter: Josh Comeau's rule that higher means softer), so the landing reads as a drop.
 */
/** The kit's level 4, parsed from `elevAt(4)` (so the air above it follows any change to the kit's ladder). */
type Shadow = { ring: number; layers: [number, number, number][] };
const parse = (css: string): Shadow => {
  const parts = css.split(/,(?![^(]*\))/).map((x) => x.trim());
  const alpha = (x: string) => Number((x.match(/rgba\([^)]*,\s*([0-9.]+)\)/) ?? [])[1] ?? 0);
  const ring = alpha(parts.find((x) => x.startsWith("0 0 0")) ?? "");
  const layers = parts
    .filter((x) => !x.startsWith("0 0 0") && !x.startsWith("inset"))
    .map((x) => {
      const n = x.match(/^0\s+([0-9.]+)px\s+([0-9.]+)px/);
      return [Number(n?.[1] ?? 0), Number(n?.[2] ?? 0), alpha(x)] as [number, number, number];
    });
  return { ring, layers };
};
const L4 = parse(elevAt(4));
/** One step above: the same light, higher (offsets x1.7, blur x1.6, alpha x0.85, the ring a little fainter). */
const L5: Shadow = { ring: L4.ring * 0.85, layers: L4.layers.map(([y, bl, a]) => [y * 1.7, bl * 1.6, a * 0.85] as [number, number, number]) };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The Day box-shadow at any elevation 0 to 5 (the kit's `elevAt` up to 4, the air above it). Fathom-tinted. */
export const elevShadow = (e: number): string => {
  if (e <= 4) return elevAt(Math.max(0, e));
  const t = Math.min(1, e - 4);
  const parts = [`0 0 0 1.5px ${ink(+lerp(L4.ring, L5.ring, t).toFixed(4))}`];
  L4.layers.forEach(([y4, b4, a4], k) => {
    const [y5, b5, a5] = L5.layers[k];
    parts.push(`0 ${lerp(y4, y5, t).toFixed(2)}px ${lerp(b4, b5, t).toFixed(2)}px ${ink(+lerp(a4, a5, t).toFixed(4))}`);
  });
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
