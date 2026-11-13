import platesJson from "../../data/plates.json";

/**
 * The cold open's third-party material: 20 of the evidence agent's 27 processed plates (public/plates/, real captures
 * with private people blurred, words unchanged; src/data/plates.json; credits in CREDITS.md). Key-phrase boxes come
 * straight from plates.json, so a re-made plate keeps its punch-ins. Coordinates are plate pixels (captured at 3x).
 *
 * Selection (BRIEF decision 1, plates.json `balance`):
 *   - Rovo appears twice (A1-06 first in bar 3, A4-02 just before the end, apart); A1-07 is out.
 *   - One Wikimedia item (D1-06, the hero; D1-07 is out). Microsoft once (A1-01; D1-05 and A1-03 are out).
 *   - Out as well: D2-04 and A1-05 (time), A2-02 (a third arXiv title), the two optional title companions.
 *   - The last word is Atlassian's own (A4-01).
 * Grade: one for every plate. Each is graded down to LIGHT_GRADE before the pass (all 20 are light pages), and the
 * pass drains warm hues and desaturates about 25% (fx/looks.ts gradeLook). Crops keep away from the amber-ish bits
 * anyway: Hacker News' orange bar (D1-21), The Register's masthead and kicker (D1-03), a blurred orange avatar
 * (A1-06), the survey's header art (A3-01), the arXiv bar on a slam (A1-13).
 * Attribution: every plate carries its `label` (source and date, verbatim from plates.json) while it is on screen.
 */
export type Box = { x: number; y: number; w: number; h: number };

type KeyJson = { text: string; box: number[]; lines?: number[][] };
type PlateJson = { id: string; file: string; width: number; height: number; label: string; bar: number; keyPhrases: KeyJson[] };
const ALL = (platesJson as unknown as { plates: PlateJson[] }).plates;

export type A0Plate = {
  id: string;
  /** Path under public/. */
  src: string;
  /** Natural size of the PNG. */
  w: number;
  h: number;
  /** The part of the plate that is shown (plate px). */
  region: Box;
  /** What a punch-in centres and keeps whole: the key phrase's union, or the whole sentence it sits in. */
  key: Box;
  /** The key phrase, one box per line (the underline). */
  lines: Box[];
  /** The sentence the spotlight keeps lit, one box per line (default: `lines`). */
  spot: Box[];
  /** Source and date, verbatim from plates.json. */
  label: string;
};

type Opts = {
  region?: Box;
  /** The whole sentence around the key phrase (plate px, measured from the plate's ink), lit by the spotlight. */
  sentence?: Box[];
  /** Punch on the whole sentence instead of the key phrase alone (so a punch never cuts its start). */
  focusSentence?: boolean;
  /** An explicit punch focus (plate px): where a punch's frame edges must fall between words. */
  focus?: Box;
};

const box = (a: number[]): Box => ({ x: a[0], y: a[1], w: a[2], h: a[3] });
const b = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

const union = (bs: Box[]): Box => {
  const x0 = Math.min(...bs.map((b) => b.x));
  const y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.w));
  const y1 = Math.max(...bs.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/**
 * A plate by id, its key phrase(s) picked by the start of their text (several phrases are underlined in turn and the
 * focus is their union), optionally cropped to `region`.
 */
const plate = (id: string, phrase: string | string[], o: Opts = {}): A0Plate => {
  const p = ALL.find((x) => x.id === id);
  if (!p) throw new Error(`A0: plate ${id} is not in plates.json`);
  const ks = (Array.isArray(phrase) ? phrase : [phrase]).map((ph) => {
    const k = p.keyPhrases.find((x) => x.text.startsWith(ph));
    if (!k) throw new Error(`A0: plate ${id} has no key phrase starting "${ph}"`);
    return k;
  });
  const lines = ks.flatMap((k) => (k.lines ?? [k.box]).map(box));
  const key = union(ks.map((k) => box(k.box)));
  return {
    id,
    src: p.file,
    w: p.width,
    h: p.height,
    region: o.region ?? { x: 0, y: 0, w: p.width, h: p.height },
    key: o.focus ?? (o.focusSentence && o.sentence ? union(o.sentence) : key),
    lines,
    spot: o.sentence ?? lines,
    label: p.label,
  };
};

/** Brightness of every plate (a grade, words untouched): page white lands near 0.32 relative luminance. */
export const LIGHT_GRADE = 0.6;
/** The tunnel's plates sit further back in the dark. */
export const TUNNEL_GRADE = 0.42;
/** Page white at LIGHT_GRADE: the slam panel's ground, so every light page keeps one footprint. */
export const PAGE_GRADED = "#999999";

export const PLATES = {
  // ── bar 1 · "The code moved." (the wall) ─────────────────────────────────────────────────────────────────────────
  arxivDrift: plate("A2-01", ["63.2%", "without updating"], {
    region: { x: 0, y: 160, w: 3055, h: 662 }, // the main column, below arXiv's header bar (the chip names the source)
    sentence: [b(1710, 693, 1168, 52), b(120, 756, 420, 52)], // "We find that 63.2% of AI PRs change code without updating / any documentation."
  }),
  sreBook: plate("D1-02", ["go out of date", "at the same rate"], { sentence: [b(644, 312, 1630, 67)] }),
  hn2026: plate("D1-21", "rots a lot", {
    region: { x: 0, y: 76, w: 1987, h: 141 }, // below Hacker News' orange bar
    sentence: [b(79, 168, 1896, 50)],
  }),
  hn2021: plate("D1-04", "out of date the moment"),
  wisdom: plate("D1-11", "runbooks are always"),
  willison: plate("D1-12", "easy for them"),
  // ── bar 2 · "The docs didn't." ──────────────────────────────────────────────────────────────────────────────────
  wikimedia: plate("D1-06", "Documentation was outdated", { sentence: [b(78, 565, 1242, 65)], focusSentence: true }), // the hero (CC BY-SA)
  mojRunbook: plate("D2-03", "might mean", { sentence: [b(490, 186, 1050, 70)] }),
  register: plate("D1-03", "outdated documentation", {
    region: { x: 0, y: 530, w: 3600, h: 460 }, // headline and standfirst (no masthead, no kicker)
    sentence: [b(36, 560, 3462, 127), b(37, 709, 2036, 129)],
    focusSentence: true,
  }),
  soBlog: plate("D2-01", ["90% of our", "doesn't work"], { sentence: [b(104, 85, 1690, 76)] }),
  ghSurvey: plate("D1-01", ["outdated documentation", "93% of"], { sentence: [b(80, 515, 1680, 66), b(120, 590, 448, 60)], focusSentence: true }),
  sweGoogle: plate("D2-02", "Documents without owners"),
  // ── bar 3 · "The agents can't tell." ────────────────────────────────────────────────────────────────────────────
  rovoCommunity: plate("A1-06", "always reads", {
    region: { x: 0, y: 0, w: 3840, h: 760 }, // above the avatar row
    sentence: [b(87, 628, 2245, 92)], // the whole title, "ROVO Agent - It always reads from an OLD confluence source."
    focusSentence: true,
  }),
  stalePoisoning: plate("A1-13", "Outdated Retrieval", {
    region: { x: 0, y: 165, w: 3055, h: 924 }, // no arXiv bar, no sidebar
    sentence: [b(63, 333, 2795, 80), b(61, 418, 303, 64)], // the whole title
    focusSentence: true,
  }),
  staleFiles: plate("R3", ["90.1%", "followed the stale file"], { sentence: [b(52, 13, 1616, 52)], focusSentence: true }),
  survey: plate("A3-01", ["I trust it", "48.0%"], { region: { x: 150, y: 2540, w: 3540, h: 920 } }), // tunnel only
  copilot: plate("A1-01", "outdated answers", { sentence: [b(99, 626, 2060, 74)], focusSentence: true }),
  rovo730: plate("A4-02", ["outdated information", "same confidence"], { sentence: [b(985, 1505, 912, 56), b(90, 1565, 430, 56)] }),
  // the last slam: its punch frames the whole sentence, and its left edge falls between "Teamwork" (ends x 710) and
  // "Graph:" (starts x 723) on the title above, so no word is cut
  atlassian: plate("A4-01", ["only as good", "most don"], { sentence: [b(768, 268, 1891, 62)], focus: b(796, 268, 1891, 62) }),
  radar: plate("A2-05", "AI-driven", { region: { x: 0, y: 249, w: 3540, h: 900 } }), // the teal title block (tunnel only)
} satisfies Record<string, A0Plate>;

export type PlateId = keyof typeof PLATES;

/** Number of distinct plates the cold open shows (for the report and the credits). */
export const PLATE_COUNT = Object.keys(PLATES).length;
