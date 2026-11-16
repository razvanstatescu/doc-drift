import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { SLIP_UNIT } from "../../brand/tokens";
import { EASE, tween } from "../../lib/time";
import { slipProgress } from "../../motion/slip";
import { FONT, type Rect } from "../look";
import { BYLINE, BylineItem, bylineItemSize, REVIEWED_TEXT, ReviewedLine, reviewedLineWidth } from "./BylineItem";
import { CODE_PAD, layoutRuns, MONO_ADVANCE, textWidth, type Line, type Run } from "./metrics";
import { TOOLTIP, TooltipTwin, tooltipLayout } from "./TooltipTwin";
import { bloomBg, currentLine, elev, mist, palette, withGlow } from "./twinLook";
import type { BylineSpec, DdsState, PageRects, PageTwinProps, TokenId, World } from "./types";

/**
 * PageTwin: the film's hero object. A neutral crafted page card (never shaped like Confluence) that carries the real
 * runbook's words (captures.json runbookText) or ADR-015's. Its sections are the mark's three bands: the header (top),
 * the section that drifts (middle: the runbook's Steps, the ADR's table), and the rest (bottom). The middle band slips
 * one unit right, with its trace, glow and bloom; `explode` sets the bands apart in Z.
 *
 * Layout is computed (not left to the browser), from the fonts' own advance widths, so pageRects() returns the same
 * film-px rects the page draws, at any frame. All layout numbers below are UI px; film px = UI px x k.
 */

// ── Layout constants (UI px) ─────────────────────────────────────────────────────────────────────────────────────────
export const PAGE = {
  width: 600,
  padX: 28,
  radius: 22,
  /** Inner corner radius of a band once the cuts open. */
  cutR: 12,
  /** Gap between bands when the cuts are open (the mark's 12 units). */
  cut: 12,
  crumbs: { size: 13.5, lh: 18, weight: 500, icon: 15, gap: 7 },
  title: { size: 27, lh: 33, weight: 600, tracking: -0.014 },
  author: { size: 15, gap: 16 },
  table: { size: 14.5, lh: 22, keyW: 84, padY: 8, padX: 14, radius: 12 },
  heading: { size: 18, lh: 24, weight: 600 },
  body: { size: 15, lh: 23 },
  code: { size: 14.5, lh: 22, padY: 9, padX: 11, radius: 10, tracking: -0.01 },
  inline: { size: 14 },
  num: 24,
  itemGap: 12,
  bands: { top: [26, 22], middle: [22, 24], bottom: [22, 26] } as Record<BandKey, [number, number]>,
} as const;

/** The real author of both pages (BRIEF decision 6: everything on screen is under Razvan's account). */
export const AUTHOR = "By Razvan Statescu";

type BandKey = "top" | "middle" | "bottom";

// ── The two documents (real words only) ─────────────────────────────────────────────────────────────────────────────
/** Step 2's code states: as written ("old"), after the rename quick fix ("renamed"), after the accepted drafts ("new"). */
export type Step2State = "old" | "renamed" | "new";
type InsKind = "v2" | "secs";
type CodeSeg = { t: string; ins?: InsKind; token?: TokenId };
/**
 * Code lines of step 2 as segments: shared text plus insertions. The quick fix (PR #482's rename) adds "-v2"; the
 * accepted drafts add "_SECS" (p4-step2-fixed). "renamed" is the page between the two (version 2).
 */
const STEP2_CODE: CodeSeg[][] = [
  [{ t: "export " }, { t: "ROLLBACK_TIMEOUT", token: "ROLLBACK_TIMEOUT" }, { t: "_SECS", ins: "secs" }, { t: "=300" }],
  [{ t: "./" }, { t: "scripts/rollback", token: "scripts/rollback.sh" }, { t: "-v2", ins: "v2" }, { t: ".sh", token: "scripts/rollback.sh" }, { t: " --timeout $ROLLBACK_TIMEOUT" }, { t: "_SECS", ins: "secs" }],
];
/** Whether an insertion shows in a state. */
const insIn = (state: Step2State, kind: InsKind) => (kind === "v2" ? state !== "old" : state === "new");

type Block =
  | { k: "crumbs"; items: string[] }
  | { k: "title"; text: string }
  | { k: "byline" }
  | { k: "table"; rows: { key: string; runs: Run[] }[] }
  | { k: "heading"; text: string }
  | { k: "list"; items: { n: number; runs: Run[]; code?: "step2" }[] }
  | { k: "para"; runs: Run[] }
  | { k: "trace"; widths: number[] };

const DOCS: Record<"runbook" | "adr015", Record<BandKey, Block[]>> = {
  runbook: {
    top: [
      { k: "crumbs", items: ["Platform", "Runbooks"] },
      { k: "title", text: "Payments rollback runbook" },
      { k: "byline" },
      {
        k: "table",
        rows: [
          { key: "Service", runs: [{ t: "payments-api", code: true }] },
          { key: "Jira", runs: [{ t: "PAY-6", mono: true, link: true, token: "PAY-6" }, { t: " Safer payments deploys and rollbacks" }] },
        ],
      },
    ],
    middle: [
      { k: "heading", text: "Steps" },
      {
        k: "list",
        items: [
          { n: 1, runs: [{ t: "Confirm the current and previous release." }] },
          { n: 2, runs: [{ t: "Run the rollback script from the root of the " }, { t: "payments-api", code: true }, { t: " repo." }], code: "step2" },
        ],
      },
    ],
    bottom: [
      { k: "heading", text: "If the script times out" },
      { k: "para", runs: [{ t: "A timeout usually means the previous image cannot pull or a pod is failing readiness. Do not run the script twice in parallel." }] },
      { k: "trace", widths: [0.84, 0.58] },
    ],
  },
  adr015: {
    top: [
      { k: "crumbs", items: ["Platform", "Architecture decisions"] },
      { k: "title", text: "ADR-015: Active-passive multi-region database" },
      { k: "byline" },
    ],
    middle: [
      {
        k: "table",
        rows: [
          { key: "Status", runs: [{ t: "Accepted, implementation planned for Q1 2027" }] },
          { key: "Date", runs: [{ t: "2026-09-10" }] },
          { key: "Jira", runs: [{ t: "PAY-18", mono: true, link: true, token: "PAY-18" }, { t: " Multi-region active-passive database" }] },
        ],
      },
    ],
    bottom: [
      { k: "heading", text: "Context" },
      { k: "para", runs: [{ t: "All of payments runs in 1 region. A regional outage would stop every Acme merchant from taking payments until the region recovers." }] },
      { k: "trace", widths: [0.8, 0.52] },
    ],
  },
};

// ── Layout ──────────────────────────────────────────────────────────────────────────────────────────────────────────
type TokenBox = { band: BandKey; x: number; y: number; w: number; h: number; text: string; size: number; mono: boolean };
type Item =
  | { kind: "crumbs"; x: number; y: number; items: string[] }
  | { kind: "title"; x: number; y: number; lines: { text: string; w: number }[] }
  | { kind: "byline"; x: number; y: number; authorW: number; itemX: number }
  | { kind: "table"; x: number; y: number; w: number; h: number; rows: { y: number; key: string; line: Line }[] }
  | { kind: "heading"; x: number; y: number; text: string }
  | { kind: "num"; x: number; y: number; n: number }
  | { kind: "text"; x: number; y: number; lines: Line[] }
  | { kind: "code"; x: number; y: number; w: number; h: number; id: "step2" }
  | { kind: "trace"; x: number; y: number; w: number; widths: number[] };
type BandLayout = { key: BandKey; y: number; h: number; items: Item[] };
export type PageLayout = {
  w: number;
  h: number;
  bands: Record<BandKey, BandLayout>;
  title: Rect;
  byline: Rect;
  bylineItemX: number;
  step2: Rect;
  step2Code: Rect;
  tokens: Partial<Record<TokenId, TokenBox>>;
};

const S = PAGE;
const lineFont = { size: S.body.size, codeSize: S.inline.size };

function codeRect(x: number, y: number, w: number) {
  const h = STEP2_CODE.length * S.code.lh + 2 * S.code.padY;
  return { x, y, w, h };
}

/** Width of the step 2 code well's content at a given state (old or new). */
const codeLineText = (segs: CodeSeg[], state: Step2State) => segs.filter((s) => !s.ins || insIn(state, s.ins)).map((s) => s.t).join("");

function layoutDoc(doc: "runbook" | "adr015", width: number, byline: BylineSpec, author: boolean, step2State: Step2State): PageLayout {
  const inner = width - 2 * S.padX;
  const bands = {} as Record<BandKey, BandLayout>;
  const tokens: PageLayout["tokens"] = {};
  let title: Rect = { x: S.padX, y: 0, w: 0, h: 0 };
  let bylineRect: Rect = { x: S.padX, y: 0, w: inner, h: BYLINE.h };
  let bylineItemX = S.padX;
  let step2: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let step2Code: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let y = 0;
  (["top", "middle", "bottom"] as BandKey[]).forEach((key) => {
    const [padT, padB] = S.bands[key];
    const top = y;
    y += padT;
    const items: Item[] = [];
    const blocks = DOCS[doc][key];
    blocks.forEach((b, bi) => {
      const prev = bi > 0 ? blocks[bi - 1].k : null;
      if (bi > 0) y += b.k === "byline" ? 12 : b.k === "title" ? 12 : b.k === "table" && prev === "byline" ? 18 : b.k === "heading" ? 18 : b.k === "trace" ? 14 : 10;
      switch (b.k) {
        case "crumbs":
          items.push({ kind: "crumbs", x: S.padX, y, items: b.items });
          y += S.crumbs.lh;
          break;
        case "title": {
          const lines = layoutRuns([{ t: b.text }], inner, { size: S.title.size, weight: S.title.weight, tracking: S.title.tracking }).map((l) => ({
            text: l.runs.map((r) => r.t).join(" "),
            w: l.w,
          }));
          items.push({ kind: "title", x: S.padX, y, lines });
          title = { x: S.padX, y, w: Math.max(...lines.map((l) => l.w)), h: lines.length * S.title.lh };
          y += lines.length * S.title.lh;
          break;
        }
        case "byline": {
          const authorW = author ? textWidth(AUTHOR, { size: S.author.size }) : 0;
          bylineItemX = S.padX + (author ? authorW + S.author.gap : 0) - BYLINE.padX;
          items.push({ kind: "byline", x: S.padX, y, authorW, itemX: bylineItemX });
          bylineRect = { x: S.padX, y, w: inner, h: BYLINE.h };
          y += BYLINE.h;
          break;
        }
        case "table": {
          const valW = inner - 2 * S.table.padX - S.table.keyW;
          const rows: { y: number; key: string; line: Line }[] = [];
          const t0 = y;
          let ry = y;
          b.rows.forEach((r, ri) => {
            const lines = layoutRuns(r.runs, valW, { size: S.table.size, codeSize: S.table.size });
            const line = lines[0];
            rows.push({ y: ry, key: r.key, line });
            const vx = S.padX + S.table.padX + S.table.keyW;
            line.runs.forEach((run) => {
              if (run.token) tokens[run.token as TokenId] = { band: key, x: vx + run.x, y: ry + S.table.padY, w: run.w, h: S.table.lh, text: run.t, size: S.table.size, mono: !!(run.mono || run.code) };
            });
            ry += S.table.lh + 2 * S.table.padY + (ri < b.rows.length - 1 ? 0 : 0);
          });
          items.push({ kind: "table", x: S.padX, y: t0, w: inner, h: ry - t0, rows });
          y = ry;
          break;
        }
        case "heading":
          items.push({ kind: "heading", x: S.padX, y, text: b.text });
          y += S.heading.lh;
          break;
        case "list": {
          const tx = S.padX + S.num;
          const tw = inner - S.num;
          b.items.forEach((it, ii) => {
            if (ii > 0) y += S.itemGap;
            const y0 = y;
            items.push({ kind: "num", x: S.padX, y, n: it.n });
            const lines = layoutRuns(it.runs, tw, lineFont);
            items.push({ kind: "text", x: tx, y, lines });
            y += lines.length * S.body.lh;
            if (it.code === "step2") {
              y += 8;
              const c = codeRect(tx, y, tw);
              items.push({ kind: "code", x: c.x, y: c.y, w: c.w, h: c.h, id: "step2" });
              // tokens inside the code well (mono: exact)
              const adv = MONO_ADVANCE * S.code.size + S.code.tracking * S.code.size;
              STEP2_CODE.forEach((segs, li) => {
                let col = 0;
                const ly = c.y + S.code.padY + li * S.code.lh;
                const shown = segs.filter((sg) => !sg.ins || insIn(step2State, sg.ins));
                let lastTok: TokenId | null = null;
                shown.forEach((sg) => {
                  const x = c.x + S.code.padX + col * adv;
                  const w = sg.t.length * adv;
                  if (sg.token) {
                    const id = sg.token;
                    const prevBox = tokens[id];
                    const sameLine = !!prevBox && prevBox.band === key && Math.abs(prevBox.y - ly) < 0.1;
                    if (sameLine && Math.abs(prevBox!.x + prevBox!.w - x) < 0.5) tokens[id] = { ...prevBox!, w: prevBox!.w + w, text: prevBox!.text + sg.t };
                    else if (!sameLine) tokens[id] = { band: key, x, y: ly, w, h: S.code.lh, text: sg.t, size: S.code.size, mono: true };
                    lastTok = id;
                  } else if (sg.ins && lastTok) {
                    // a shown insertion right after a token belongs to it ("scripts/rollback" + "-v2", "ROLLBACK_TIMEOUT" + "_SECS")
                    const box = tokens[lastTok]!;
                    tokens[lastTok] = { ...box, w: box.w + w, text: box.text + sg.t };
                  } else lastTok = null;
                  col += sg.t.length;
                });
                if (li === 1) {
                  const text = codeLineText(segs, step2State);
                  step2Code = { x: c.x + S.code.padX, y: ly, w: text.length * adv, h: S.code.lh };
                  // "./scripts/rollback.sh" (with ./) on the command line
                  const cmdTok = text.indexOf("./");
                  const pathLen = (insIn(step2State, "v2") ? "./scripts/rollback-v2.sh" : "./scripts/rollback.sh").length;
                  tokens["./scripts/rollback.sh"] = { band: key, x: c.x + S.code.padX + cmdTok * adv, y: ly, w: pathLen * adv, h: S.code.lh, text: text.slice(cmdTok, cmdTok + pathLen), size: S.code.size, mono: true };
                }
              });
              // ids of the fixed names point at the same boxes
              if (insIn(step2State, "v2") && tokens["scripts/rollback.sh"]) tokens["scripts/rollback-v2.sh"] = tokens["scripts/rollback.sh"];
              if (insIn(step2State, "secs") && tokens["ROLLBACK_TIMEOUT"]) tokens["ROLLBACK_TIMEOUT_SECS"] = tokens["ROLLBACK_TIMEOUT"];
              y += c.h;
              step2 = { x: S.padX, y: y0, w: inner, h: y - y0 };
            }
          });
          break;
        }
        case "para": {
          const lines = layoutRuns(b.runs, inner, lineFont);
          items.push({ kind: "text", x: S.padX, y, lines });
          y += lines.length * S.body.lh;
          break;
        }
        case "trace":
          items.push({ kind: "trace", x: S.padX, y, w: inner, widths: b.widths });
          y += b.widths.length * 9 + (b.widths.length - 1) * 10;
          break;
      }
    });
    y += padB;
    bands[key] = { key, y: top, h: y - top, items };
  });
  if (doc === "adr015") {
    // The ADR's drifting section is its table (the real review panel names it "Top of page"): step 2 aliases its Jira row.
    const t = bands.middle.items.find((i) => i.kind === "table");
    if (t && t.kind === "table") {
      const last = t.rows[t.rows.length - 1];
      step2 = { x: t.x, y: t.y, w: t.w, h: t.h };
      step2Code = { x: t.x + S.table.padX + S.table.keyW, y: last.y + S.table.padY, w: last.line.w, h: S.table.lh };
    }
  }
  return { w: width, h: y, bands, title, byline: bylineRect, bylineItemX, step2, step2Code, tokens };
}

// ── Props, state at a frame, rects ──────────────────────────────────────────────────────────────────────────────────
const defaults = (p: PageTwinProps) => {
  const k = p.k ?? 1.8;
  const width = p.width ?? S.width;
  const doc = p.doc ?? "runbook";
  const byline: BylineSpec = p.byline ?? { kind: "dds", state: "verified" };
  const author = p.author ?? true;
  // rects follow the static state, or a morph's `to` state (default "new")
  const st2: Step2State = typeof p.step2 === "object" ? p.step2.to ?? "new" : p.step2 ?? "old";
  const L = layoutDoc(doc, width, byline, author, st2);
  const W = width * k;
  const H = L.h * k;
  const x = p.x ?? Math.round((1920 - W) / 2);
  const y = p.y ?? Math.round((1080 - H) / 2);
  return { k, width, doc, byline, author, L, W, H, x, y, world: p.world ?? "day" };
};

/** The state the byline item reads at the end (for its rect). */
const finalState = (b: BylineSpec): DdsState | null => (b.kind === "dds" ? b.state : null);

/**
 * Film-px rects of the page for these props (the resting layout: cuts closed, band at home). `stepsSlipped` is where
 * the middle band sits when slipped; `tokensLifted` where a lifted token floats. Use them to aim cameras, docks and morphs.
 */
export function pageRects(props: PageTwinProps): PageRects & {
  bands: PageRects["bands"] & { middle: Rect };
  middleSlipped: Rect;
  badgeFrom?: Rect;
  badgeSlipped: Rect;
  tokensLifted: Partial<Record<TokenId, Rect>>;
  k: number;
} {
  const d = defaults(props);
  const { k, L, x, y, W } = d;
  const f = (r: Rect): Rect => ({ x: x + r.x * k, y: y + r.y * k, w: r.w * k, h: r.h * k });
  const band = (b: BandKey): Rect => ({ x, y: y + L.bands[b].y * k, w: W, h: L.bands[b].h * k });
  const st = finalState(d.byline);
  const itemSize = st ? bylineItemSize(st, k) : { w: reviewedLineWidth(d.byline.kind === "reviewed" ? d.byline.text : "", k), h: BYLINE.h * k };
  const badge: Rect = { x: x + L.bylineItemX * k, y: y + L.byline.y * k, w: itemSize.w, h: itemSize.h };
  const fromState = d.byline.kind === "dds" && d.byline.from ? d.byline.from : null;
  const badgeFrom = fromState
    ? { ...badge, w: fromState === "reviewed" ? reviewedLineWidth(d.byline.kind === "dds" ? d.byline.fromText ?? REVIEWED_TEXT : REVIEWED_TEXT, k) : bylineItemSize(fromState, k).w }
    : undefined;
  const tt = props.tooltip ? tooltipLayout(props.tooltip.text, k) : { w: TOOLTIP.maxW * k, h: (TOOLTIP.lh + 2 * TOOLTIP.padY) * k };
  const tokens: Partial<Record<TokenId, Rect>> = {};
  const lifted: Partial<Record<TokenId, Rect>> = {};
  (Object.keys(L.tokens) as TokenId[]).forEach((id) => {
    const t = L.tokens[id]!;
    const r = f(t);
    tokens[id] = r;
    lifted[id] = liftedRect(r, k);
  });
  const mid = band("middle");
  return {
    k,
    card: { x, y, w: W, h: L.h * k },
    title: f(L.title),
    byline: f(L.byline),
    badge,
    badgeFrom,
    badgeSlipped: { ...badge, x: badge.x + SLIP_UNIT * badge.w },
    bands: { top: band("top"), steps: mid, middle: mid, bottom: band("bottom") },
    stepsSlipped: { ...mid, x: mid.x + SLIP_UNIT * W },
    middleSlipped: { ...mid, x: mid.x + SLIP_UNIT * W },
    step2: f(L.step2),
    step2Code: f(L.step2Code),
    tokens,
    tokensLifted: lifted,
    tooltip: { x: badge.x, y: badge.y + badge.h + 6 * k, w: tt.w, h: tt.h },
    nodes: {
      top: [x + W, y + (L.bands.top.y + L.bands.top.h / 2) * k],
      steps: [x + W, y + (L.bands.middle.y + L.bands.middle.h / 2) * k],
    },
  };
}

/** Where a lifted token floats: its chip padding added, raised 10 UI px, scaled 1.06 about its centre. */
function liftedRect(r: Rect, k: number): Rect {
  const padX = 7 * k;
  const padY = 3 * k;
  const w = (r.w + 2 * padX) * 1.06;
  const h = (r.h + 2 * padY) * 1.06;
  return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2 - 10 * k, w, h };
}

// ── Pieces ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The look of a lifted token, so a scene's KineticDock can carry the identical chip. */
export const TokenChip: React.FC<{ text: string; k?: number; world?: World; size?: number; style?: React.CSSProperties }> = ({ text, k = 1.8, world = "day", size = S.code.size, style }) => {
  const p = palette(world);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: (S.code.lh + 6) * k,
        padding: `0 ${7 * k}px`,
        borderRadius: 8 * k,
        background: p.surface,
        boxShadow: elev(4, 1, world),
        color: p.text,
        fontFamily: FONT.mono,
        fontSize: size * k,
        letterSpacing: `${S.code.tracking}em`,
        whiteSpace: "pre",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {text}
    </span>
  );
};

type RenderCtx = {
  k: number;
  world: World;
  frame: number;
  mark?: PageTwinProps["mark"];
  lift?: PageTwinProps["lift"];
  /** How far each step 2 insertion is open (0 closed .. 1 open). */
  ins: Record<InsKind, number>;
};

const tokenStyle = (ctx: RenderCtx, id: string | undefined): React.CSSProperties => {
  if (!id) return {};
  const p = palette(ctx.world);
  const s: React.CSSProperties = {};
  if (ctx.mark && ctx.mark.kind === "amber" && ctx.mark.token === id && ctx.frame >= ctx.mark.at) s.color = p.onBeacon;
  if (ctx.lift && ctx.lift.token === id && ctx.frame >= ctx.lift.at) s.opacity = 1 - tween(ctx.frame, ctx.lift.at, ctx.lift.at + 4, 0, 1, EASE.linear);
  return s;
};

const LineView: React.FC<{ line: Line; x: number; y: number; ctx: RenderCtx; size: number; codeSize: number; lh: number }> = ({ line, x, y, ctx, size, codeSize, lh }) => {
  const { k } = ctx;
  const p = palette(ctx.world);
  return (
    <>
      {line.runs.map((r, i) =>
        r.t ? (
          <span
            key={i}
            style={{
              position: "absolute",
              left: (x + r.x) * k,
              top: y * k,
              height: lh * k,
              display: "flex",
              alignItems: "center",
              whiteSpace: "pre",
              fontFamily: r.code || r.mono ? FONT.mono : FONT.sans,
              fontSize: (r.code || r.mono ? codeSize : size) * k,
              letterSpacing: r.code || r.mono ? "-0.01em" : undefined,
              fontWeight: r.bold ? 600 : 400,
              color: r.link ? p.link : r.muted ? p.textMuted : p.text,
              ...tokenStyle(ctx, r.token),
            }}
          >
            {r.code ? (
              <span
                style={{
                  padding: `${0.12 * codeSize * k}px ${CODE_PAD * codeSize * k}px`,
                  borderRadius: 4 * k,
                  background: p.surfaceSunk,
                  lineHeight: 1.15,
                }}
              >
                {r.t}
              </span>
            ) : (
              r.t
            )}
          </span>
        ) : null,
      )}
    </>
  );
};

/** Step 2's code well, old or new, or morphing (the inserted parts open and drop in). */
const Step2Code: React.FC<{ x: number; y: number; w: number; h: number; ctx: RenderCtx }> = ({ x, y, w, h, ctx }) => {
  const { k } = ctx;
  const p = palette(ctx.world);
  const adv = (MONO_ADVANCE + S.code.tracking) * S.code.size * k;
  return (
    <div
      style={{
        position: "absolute",
        left: x * k,
        top: y * k,
        width: w * k,
        height: h * k,
        boxSizing: "border-box",
        padding: `${S.code.padY * k}px ${S.code.padX * k}px`,
        borderRadius: S.code.radius * k,
        background: p.surfaceSunk,
        fontFamily: FONT.mono,
        fontSize: S.code.size * k,
        letterSpacing: `${S.code.tracking}em`,
        lineHeight: `${S.code.lh * k}px`,
        color: p.text,
        whiteSpace: "pre",
      }}
    >
      {STEP2_CODE.map((segs, li) => (
        <div key={li} style={{ display: "flex", height: S.code.lh * k }}>
          {segs.map((s, si) => {
            if (s.ins) {
              // a slip, never a fade: the insertion opens, the text after it slides right, and the inserted characters
              // are uncovered from their start ("-v", then "-v2"), so no frame shows a wrong-looking fragment
              const v = ctx.ins[s.ins];
              if (v <= 0.001) return null;
              const full = s.t.length * adv;
              return (
                <span key={si} style={{ position: "relative", display: "inline-block", width: full * v, height: S.code.lh * k, overflow: "hidden", flex: "none" }}>
                  <span style={{ position: "absolute", left: 0, top: 0, width: full, ...tokenStyle(ctx, s.token) }}>{s.t}</span>
                </span>
              );
            }
            return (
              <span key={si} style={{ flex: "none", ...tokenStyle(ctx, s.token) }}>
                {s.t}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const ItemView: React.FC<{ it: Item; ctx: RenderCtx; byline: BylineSpec; author: boolean; bylineLit: number; bylineHover: number }> = ({ it, ctx, byline, author, bylineLit, bylineHover }) => {
  const { k, world } = ctx;
  const p = palette(world);
  switch (it.kind) {
    case "crumbs":
      return (
        <div
          style={{
            position: "absolute",
            left: it.x * k,
            top: it.y * k,
            height: S.crumbs.lh * k,
            display: "flex",
            alignItems: "center",
            gap: S.crumbs.gap * k,
            fontFamily: FONT.sans,
            fontSize: S.crumbs.size * k,
            fontWeight: S.crumbs.weight,
            color: p.textMuted,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="page" size={S.crumbs.icon * k} color={p.textMuted} />
          {it.items.map((c, i) => (
            <React.Fragment key={c}>
              {i > 0 ? <span style={{ opacity: 0.55 }}>/</span> : null}
              <span>{c}</span>
            </React.Fragment>
          ))}
        </div>
      );
    case "title":
      return (
        <>
          {it.lines.map((l, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: it.x * k,
                top: (it.y + i * S.title.lh) * k,
                height: S.title.lh * k,
                display: "flex",
                alignItems: "center",
                fontFamily: FONT.sans,
                fontSize: S.title.size * k,
                fontWeight: S.title.weight,
                letterSpacing: `${S.title.tracking}em`,
                color: p.text,
                whiteSpace: "nowrap",
              }}
            >
              {l.text}
            </div>
          ))}
        </>
      );
    case "byline":
      return (
        <>
          {author ? (
            <div
              style={{
                position: "absolute",
                left: it.x * k,
                top: it.y * k,
                height: BYLINE.h * k,
                display: "flex",
                alignItems: "center",
                fontFamily: FONT.sans,
                fontSize: S.author.size * k,
                color: p.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {AUTHOR}
            </div>
          ) : null}
          <div style={{ position: "absolute", left: it.itemX * k, top: it.y * k }}>
            {byline.kind === "reviewed" ? (
              <ReviewedLine text={byline.text} world={world} k={k} />
            ) : (
              <BylineItem state={byline.state} from={byline.from} fromText={byline.fromText} at={byline.at} world={world} k={k} lit={bylineLit} hover={bylineHover} />
            )}
          </div>
        </>
      );
    case "table":
      return (
        <div
          style={{
            position: "absolute",
            left: it.x * k,
            top: it.y * k,
            width: it.w * k,
            height: it.h * k,
            borderRadius: S.table.radius * k,
            background: world === "night" ? p.surfaceSunk : p.ground,
          }}
        >
          {it.rows.map((r, i) => (
            <React.Fragment key={r.key}>
              {i > 0 ? (
                <div style={{ position: "absolute", left: S.table.padX * k, right: S.table.padX * k, top: (r.y - it.y) * k - k * 0.75, height: 1.5 * k, background: p.line }} />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: S.table.padX * k,
                  top: (r.y - it.y + S.table.padY) * k,
                  height: S.table.lh * k,
                  display: "flex",
                  alignItems: "center",
                  fontFamily: FONT.sans,
                  fontSize: S.table.size * k,
                  fontWeight: 500,
                  color: p.textMuted,
                }}
              >
                {r.key}
              </div>
              <LineView line={r.line} x={S.table.padX + S.table.keyW} y={r.y - it.y + S.table.padY} ctx={ctx} size={S.table.size} codeSize={S.table.size} lh={S.table.lh} />
            </React.Fragment>
          ))}
        </div>
      );
    case "heading":
      return (
        <div
          style={{
            position: "absolute",
            left: it.x * k,
            top: it.y * k,
            height: S.heading.lh * k,
            display: "flex",
            alignItems: "center",
            fontFamily: FONT.sans,
            fontSize: S.heading.size * k,
            fontWeight: S.heading.weight,
            letterSpacing: "-0.005em",
            color: p.text,
            whiteSpace: "nowrap",
          }}
        >
          {it.text}
        </div>
      );
    case "num":
      return (
        <div
          style={{
            position: "absolute",
            left: it.x * k,
            top: it.y * k,
            height: S.body.lh * k,
            display: "flex",
            alignItems: "center",
            fontFamily: FONT.sans,
            fontSize: S.body.size * k,
            fontVariantNumeric: "tabular-nums",
            color: p.textMuted,
          }}
        >
          {`${it.n}.`}
        </div>
      );
    case "text":
      return (
        <>
          {it.lines.map((l, i) => (
            <LineView key={i} line={l} x={it.x} y={it.y + i * S.body.lh} ctx={ctx} size={S.body.size} codeSize={S.inline.size} lh={S.body.lh} />
          ))}
        </>
      );
    case "code":
      return <Step2Code x={it.x} y={it.y} w={it.w} h={it.h} ctx={ctx} />;
    case "trace":
      return (
        <>
          {it.widths.map((w, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: it.x * k,
                top: (it.y + i * 19) * k,
                width: it.w * w * k,
                height: 9 * k,
                borderRadius: 5 * k,
                background: p.trace,
                opacity: 1 - i * 0.3,
              }}
            />
          ))}
        </>
      );
  }
};

/** The slipped band while it carries the amber: the surface warmed by beacon, so the band reads amber and its words stay readable. */
function amberWash(world: World, a: number) {
  const base = world === "night" ? [14, 61, 72] : [255, 255, 255];
  const mixA = (world === "night" ? 0.2 : 0.17) * a;
  const c = base.map((v, i) => Math.round(v + ([255, 178, 36][i] - v) * mixA));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** The band's amber edge (2 UI px of beacon) plus the brand glow, joined to its shadow. */
function bandGlow(shadow: string, world: World, a: number, k: number) {
  if (a <= 0.001) return shadow;
  return withGlow(`0 0 0 ${2 * k}px rgba(255, 178, 36, ${0.95 * a}), ${shadow === "none" ? "0 0 0 0 transparent" : shadow}`, world, a, k);
}

// ── The component ───────────────────────────────────────────────────────────────────────────────────────────────────
export const PageTwin: React.FC<PageTwinProps> = (props) => {
  const frame = useCurrentFrame();
  const d = defaults(props);
  const { k, L, W, x, y, world, byline, author } = d;
  const p = palette(world);
  const level = props.elev ?? 3;

  // slip of the middle band, and who carries the amber
  const sl = props.slip;
  const s = sl ? slipProgress(frame, sl.at, sl.back) : 0;
  const handoff = sl?.handoff;
  // the amber passes from the band to the byline item over 6 frames (expo out), in step with the byline swap
  const hand = handoff !== undefined ? tween(frame, handoff, handoff + 6, 0, 1, EASE.expoOut) : 0;
  const itemWants = byline.kind === "dds" && byline.amber !== false;
  let bandAmber = 0;
  let itemLit = itemWants ? 1 : 0;
  if (sl) {
    if (handoff !== undefined) {
      bandAmber = s * (1 - hand);
      itemLit = itemWants ? hand : 0;
    } else if (sl.amber === false) {
      bandAmber = 0;
    } else {
      bandAmber = s;
      // the band holds the amber from its slip on (also while it snaps home), so the item never lights up mid-snap
      itemLit = itemWants && frame < sl.at ? 1 : 0;
    }
  }

  const ex = Math.max(0, Math.min(1, props.explode ?? 0));
  const cutOpen = Math.max(s, ex, sl && handoff !== undefined && frame >= sl.at ? s : 0);
  const zs = props.explodeZ ?? [-90, 110, -180];

  // step 2 morph
  const st2 = props.step2;
  const insOpen = (kind: InsKind): number => {
    if (typeof st2 !== "object") return insIn(st2 ?? "old", kind) ? 1 : 0;
    const a = insIn(st2.from ?? "old", kind);
    const b = insIn(st2.to ?? "new", kind);
    if (a === b) return a ? 1 : 0;
    const m = tween(frame, st2.morphAt, st2.morphAt + (st2.dur ?? 8), 0, 1, EASE.expoOut);
    return b ? m : 1 - m;
  };

  const ctx: RenderCtx = { k, world, frame, mark: props.mark, lift: props.lift, ins: { v2: insOpen("v2"), secs: insOpen("secs") } };
  const tooltipOpen = props.tooltip ? tween(frame, props.tooltip.at, props.tooltip.at + 6, 0, 1) * (props.tooltip.out !== undefined ? 1 - tween(frame, props.tooltip.out, props.tooltip.out + 5) : 1) : 0;

  // band backgrounds (UI px, relative to the card)
  const half = (S.cut / 2) * cutOpen;
  const bandBox = (b: BandKey) => {
    const B = L.bands[b];
    const t = b === "top" ? 0 : half;
    const bot = b === "bottom" ? 0 : half;
    return { y: B.y + t, h: B.h - t - bot };
  };
  const R = S.radius * k;
  const r = S.cutR * cutOpen * k;
  const radii: Record<BandKey, string> = {
    top: `${R}px ${R}px ${r}px ${r}px`,
    middle: `${r}px ${Math.max(r, R * s)}px ${Math.max(r, R * s)}px ${r}px`,
    bottom: `${r}px ${r}px ${R}px ${R}px`,
  };

  // entry lift (optional)
  const enter = props.enter;
  const ep = enter ? tween(frame, enter.at, enter.at + (enter.dur ?? 14), 0, 1, EASE.expoOut) : 1;
  const lvl = enter ? (enter.from ?? 1) + (level - (enter.from ?? 1)) * ep : level;
  const rise = enter ? (1 - ep) * 18 * k : 0;

  const yaw = props.yaw ?? 0;
  const pitch = props.pitch ?? 0;
  const persp = props.perspective;
  const rootTransform = [persp ? `perspective(${persp}px)` : "", rise ? `translateY(${rise}px)` : "", pitch ? `rotateX(${pitch}deg)` : "", yaw ? `rotateY(${yaw}deg)` : ""]
    .filter(Boolean)
    .join(" ");

  const markRect = props.mark ? L.tokens[props.mark.token] : undefined;
  const liftBox = props.lift ? L.tokens[props.lift.token] : undefined;

  const bandOrder: BandKey[] = ["top", "middle", "bottom"];
  const zOf = (b: BandKey) => zs[bandOrder.indexOf(b)] * ex;

  const scanY = props.scan && frame >= props.scan.at && frame <= props.scan.at + props.scan.dur ? tween(frame, props.scan.at, props.scan.at + props.scan.dur, 0, L.h, EASE.cubicInOut) : null;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: W,
        height: L.h * k,
        transformStyle: "preserve-3d",
        transform: rootTransform || undefined,
        transformOrigin: "50% 50%",
        ...props.style,
      }}
    >
      {/* the card as one object while the cuts are closed */}
      {cutOpen < 0.999 ? (
        <div style={{ position: "absolute", inset: 0, borderRadius: R, background: p.surface, boxShadow: elev(lvl, 1 - cutOpen, world), opacity: 1 - cutOpen }} />
      ) : null}
      {/* the middle band's trace and bloom (under it) */}
      {s > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: bandBox("middle").y * k,
            width: W,
            height: bandBox("middle").h * k,
            borderRadius: r,
            background: p.trace,
            opacity: Math.min(1, s / 0.25),
            transform: ex > 0 ? `translateZ(${zOf("middle") - 1}px)` : undefined,
          }}
        />
      ) : null}
      {bandAmber > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: SLIP_UNIT * W * s - W * 0.12,
            top: (bandBox("middle").y - 60) * k,
            width: W * 1.24,
            height: (bandBox("middle").h + 120) * k,
            borderRadius: "50%",
            background: bloomBg(bandAmber * 1.25),
            transform: ex > 0 ? `translateZ(${zOf("middle") - 2}px)` : undefined,
          }}
        />
      ) : null}
      {bandOrder.map((b) => {
        const box = bandBox(b);
        const dx = b === "middle" ? SLIP_UNIT * W * s : 0;
        const z = zOf(b);
        const shadow = elev(lvl, cutOpen, world);
        return (
          <div
            key={b}
            style={{
              position: "absolute",
              left: 0,
              top: box.y * k,
              width: W,
              height: box.h * k,
              borderRadius: radii[b],
              background: b === "middle" && bandAmber > 0.001 ? amberWash(world, bandAmber) : p.surface,
              boxShadow: b === "middle" ? bandGlow(shadow, world, bandAmber, k) : shadow,
              transform: dx || z ? `translate3d(${dx}px, 0, ${z}px)` : undefined,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: -box.y * k, width: W, height: L.h * k }}>
              {liftBox && props.lift && liftBox.band === b && frame >= props.lift.at ? (
                <div
                  style={{
                    position: "absolute",
                    left: (liftBox.x - 3) * k,
                    top: (liftBox.y + 1) * k,
                    width: (liftBox.w + 6) * k,
                    height: (liftBox.h - 2) * k,
                    borderRadius: 5 * k,
                    background: p.trace,
                    opacity: tween(frame, props.lift.at, props.lift.at + 6),
                  }}
                />
              ) : null}
              {L.bands[b].items.map((it, i) => (
                <ItemView key={i} it={it} ctx={ctx} byline={byline} author={author} bylineLit={itemLit} bylineHover={tooltipOpen} />
              ))}
              {props.mark && markRect && markRect.band === b ? <TokenMark box={markRect} mark={props.mark} k={k} world={world} frame={frame} /> : null}
              {scanY !== null ? (
                <div style={{ position: "absolute", left: 0, top: (scanY - 70) * k, width: W, height: 70 * k, pointerEvents: "none" }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(180deg, rgba(34, 113, 126, 0) 0%, rgba(34, 113, 126, ${world === "night" ? 0.16 : 0.08}) 100%)`,
                    }}
                  />
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: -1.25 * k, height: 2.5 * k, background: currentLine(world) }} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      {/* hairlines where the bands meet, while the cuts are closed */}
      {cutOpen < 0.999
        ? (["middle", "bottom"] as BandKey[]).map((b) => (
            <div
              key={`div-${b}`}
              style={{
                position: "absolute",
                left: S.padX * k,
                width: W - 2 * S.padX * k,
                top: L.bands[b].y * k - 0.75 * k,
                height: 1.5 * k,
                background: p.line,
                opacity: 1 - cutOpen,
              }}
            />
          ))
        : null}
      {/* a lifted token floats above its band */}
      {liftBox && props.lift && frame >= props.lift.at && (props.lift.dockAt === undefined || frame < props.lift.dockAt) ? (
        <LiftedToken box={liftBox} text={liftBox.text} k={k} world={world} frame={frame} at={props.lift.at} z={zOf(liftBox.band) + 60} dx={liftBox.band === "middle" ? SLIP_UNIT * W * s : 0} />
      ) : null}
      {/* the tooltip opens under the byline item */}
      {props.tooltip ? (
        <div style={{ position: "absolute", left: L.bylineItemX * k, top: (L.byline.y + BYLINE.h + 6) * k, transform: `translateZ(${zOf("top") + 40}px)` }}>
          <TooltipTwin text={props.tooltip.text} at={props.tooltip.at} out={props.tooltip.out} world={world} k={k} />
        </div>
      ) : null}
    </div>
  );
};

const LiftedToken: React.FC<{ box: TokenBox; text: string; k: number; world: World; frame: number; at: number; z: number; dx: number }> = ({ box, text, k, world, frame, at, z, dx }) => {
  const t = tween(frame, at, at + 12, 0, 1, EASE.expoOut);
  const padX = 7;
  const padY = 3;
  return (
    <div
      style={{
        position: "absolute",
        left: (box.x - padX) * k + dx,
        top: (box.y - padY) * k,
        transform: `translate3d(0, ${-10 * k * t}px, ${z * t}px) scale(${1 + 0.06 * t})`,
        transformOrigin: "50% 50%",
      }}
    >
      <TokenChip text={text} k={k} world={world} style={{ boxShadow: elev(Math.max(1, 4 * t), 1, world), height: (box.h + 2 * padY) * k }} />
    </div>
  );
};

/**
 * A marker on a token, drawn over the words: the Mist band (multiply on Day, screen on Night, so the words stay exactly
 * as printed), the Current underline, or the amber block (the drift only), which redraws the token's own words on top.
 */
const TokenMark: React.FC<{ box: TokenBox; mark: NonNullable<PageTwinProps["mark"]>; k: number; world: World; frame: number }> = ({ box, mark, k, world, frame }) => {
  if (frame < mark.at) return null;
  const t = tween(frame, mark.at, mark.at + 8, 0, 1, EASE.expoOut);
  const padX = box.mono ? 1.5 : 4;
  const left = (box.x - padX) * k;
  const width = (box.w + 2 * padX) * k * t;
  if (mark.kind === "current") {
    return <div style={{ position: "absolute", left, top: (box.y + box.h - 3) * k, width, height: 2.5 * k, borderRadius: 2 * k, background: currentLine(world) }} />;
  }
  if (mark.kind === "mist") {
    const m = mist(world);
    return (
      <div
        style={{
          position: "absolute",
          left,
          top: (box.y + 1) * k,
          width,
          height: (box.h - 2) * k,
          borderRadius: 4 * k,
          background: world === "night" ? "rgba(214, 228, 231, 0.22)" : m.bg,
          mixBlendMode: world === "night" ? "screen" : "multiply",
        }}
      />
    );
  }
  // amber: the drift, with its bloom; the words are drawn again on the block in onBeacon
  const p = palette(world);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: left - box.w * 0.25 * k,
          top: (box.y - box.h * 0.6) * k,
          width: (box.w * 1.5 + 2 * padX) * k,
          height: box.h * 2.2 * k,
          borderRadius: "50%",
          background: bloomBg(t),
        }}
      />
      <div style={{ position: "absolute", left, top: (box.y + 1) * k, width, height: (box.h - 2) * k, borderRadius: 4 * k, background: "#FFB224", boxShadow: withGlow("none", world, t, k), overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: padX * k,
            top: -1 * k,
            height: box.h * k,
            display: "flex",
            alignItems: "center",
            whiteSpace: "pre",
            fontFamily: box.mono ? FONT.mono : FONT.sans,
            fontSize: box.size * k,
            letterSpacing: box.mono ? "-0.01em" : undefined,
            color: p.onBeacon,
          }}
        >
          {box.text}
        </div>
      </div>
    </>
  );
};
