import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/**
 * Spline Sans (400 to 700 used) and Spline Sans Mono (400 and 500 used), both SIL OFL 1.1 (public/fonts/OFL-*.txt).
 * The woff2 files in public/fonts are the exact variable files @remotion/google-fonts points at (Spline Sans v16,
 * Spline Sans Mono v13, latin and latin-ext subsets, wght 300 to 700), stored locally so renders never depend on the
 * network or on a font CDN changing a file. loadFont() from @remotion/fonts holds every render until each face is
 * ready and FAILS the render if a file is missing, so a fallback font can never slip into a frame.
 *
 * Note: neither subset has U+2192 (the arrow). Draw arrows with <Icon name="arrow"> or <Code> (which swaps "->" and
 * the arrow character for the icon), never as a glyph.
 */

const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF";

const FACES = [
  { family: "Spline Sans", file: "fonts/SplineSans-latin.woff2", unicodeRange: LATIN },
  { family: "Spline Sans", file: "fonts/SplineSans-latin-ext.woff2", unicodeRange: LATIN_EXT },
  { family: "Spline Sans Mono", file: "fonts/SplineSansMono-latin.woff2", unicodeRange: LATIN },
  { family: "Spline Sans Mono", file: "fonts/SplineSansMono-latin-ext.woff2", unicodeRange: LATIN_EXT },
];

let started: Promise<unknown> | null = null;

/** Call once at module level (Root.tsx). Idempotent. */
export function loadBrandFonts() {
  if (!started) {
    started = Promise.all(
      FACES.map((f) =>
        loadFont({ family: f.family, url: staticFile(f.file), format: "woff2", weight: "300 700", style: "normal", unicodeRange: f.unicodeRange }),
      ),
    );
  }
  return started;
}
