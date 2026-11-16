import { METRIC_CHARS, SANS_WIDTHS } from "./metricsData";

/**
 * Deterministic text measuring for the twins: widths come from the fonts' own advance tables (metricsData.ts), so a
 * layout computed here is the same in Studio, in a render, and before the fonts finish loading. Used for line breaks,
 * token rects and pageRects().
 */

type Weight = 300 | 400 | 500 | 600 | 700;
const TABLE: Record<number, Map<string, number>> = {};

function table(weight: number): Map<string, number> {
  const w = (([300, 400, 500, 600, 700] as Weight[]).reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a), 400 as Weight)) as Weight;
  if (!TABLE[w]) {
    const vals = SANS_WIDTHS[w].split(",").map(Number);
    const m = new Map<string, number>();
    Array.from(METRIC_CHARS).forEach((c, i) => m.set(c, vals[i]));
    TABLE[w] = m;
  }
  return TABLE[w];
}

/** Spline Sans Mono's advance: 0.6 em for every glyph. */
export const MONO_ADVANCE = 0.6;

export type FontSpec = {
  size: number;
  weight?: number;
  mono?: boolean;
  /** CSS letter-spacing in em (for example -0.01). */
  tracking?: number;
};

/** Width in px of a single-line string set in Spline Sans or Spline Sans Mono. */
export function textWidth(text: string, f: FontSpec): number {
  const n = Array.from(text).length;
  const track = (f.tracking ?? 0) * f.size * n;
  if (f.mono) return n * MONO_ADVANCE * f.size + track;
  const t = table(f.weight ?? 400);
  let sum = 0;
  for (const c of text) sum += t.get(c) ?? 560;
  return (sum / 1000) * f.size + track;
}

/** A run of inline text: plain, inline code, bold, or a token the page can lift or mark. */
export type Run = {
  t: string;
  code?: boolean;
  mono?: boolean;
  bold?: boolean;
  link?: boolean;
  token?: string;
  muted?: boolean;
  /** An inline chip (atomic, sans 500), drawn by the caller; `extraW` is its icon and padding. */
  chip?: boolean;
  extraW?: number;
};

export type PlacedRun = Run & { x: number; w: number; space: number };
export type Line = { runs: PlacedRun[]; w: number };

/** Inline code chips: the well's padding on each side, as a share of the font size. */
export const CODE_PAD = 0.28;

/**
 * Greedy line breaking over styled runs. Words never split; a code run or a token never breaks inside. Spaces are kept
 * at the end of a run, so placed runs carry their own spacing. Returns lines with each run's x and width.
 */
export function layoutRuns(runs: Run[], maxWidth: number, base: { size: number; weight?: number; codeSize?: number; tracking?: number }): Line[] {
  type Piece = Run & { w: number; space: number };
  const pieces: Piece[] = [];
  for (const r of runs) {
    const font = (rr: Run): FontSpec =>
      rr.code || rr.mono ? { size: base.codeSize ?? base.size, mono: true, tracking: -0.01 } : { size: base.size, weight: rr.bold ? 600 : base.weight ?? 400, tracking: base.tracking };
    if (r.code || r.token || r.chip) {
      // Atomic run (keeps its trailing space outside the chip).
      const trail = r.t.match(/\s+$/)?.[0] ?? "";
      const core = r.t.slice(0, r.t.length - trail.length);
      const pad = (r.code ? 2 * CODE_PAD * (base.codeSize ?? base.size) : 0) + (r.extraW ?? 0);
      const f = r.chip ? { size: base.size, weight: 500 } : font(r);
      pieces.push({ ...r, t: core, w: textWidth(core, f) + pad, space: trail ? textWidth(" ", { size: base.size, weight: base.weight }) : 0 });
      continue;
    }
    const words = r.t.match(/[^\s]+\s*|\s+/g) ?? [];
    for (const w of words) {
      const core = w.replace(/\s+$/, "");
      const trail = w.length - core.length;
      pieces.push({ ...r, t: core, w: textWidth(core, font(r)), space: trail ? textWidth(" ", font(r)) : 0 });
    }
  }
  const lines: Line[] = [];
  let cur: PlacedRun[] = [];
  let x = 0;
  const flush = () => {
    if (cur.length) {
      const last = cur[cur.length - 1];
      lines.push({ runs: cur, w: last.x + last.w });
    }
    cur = [];
    x = 0;
  };
  pieces.forEach((p) => {
    if (cur.length && x + p.w > maxWidth + 0.5) flush();
    cur.push({ ...p, x, w: p.w, space: p.space });
    x += p.w + p.space;
  });
  flush();
  return lines;
}

/** Simple word wrap for one style; returns the lines as strings and their widths. */
export function wrapText(text: string, maxWidth: number, f: FontSpec): { text: string; w: number }[] {
  const lines = layoutRuns([{ t: text }], maxWidth, { size: f.size, weight: f.weight, tracking: f.tracking });
  return lines.map((l) => ({ text: l.runs.map((r, i) => r.t + (i < l.runs.length - 1 ? " " : "")).join(""), w: l.w }));
}
