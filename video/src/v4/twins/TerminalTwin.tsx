import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { toolOutput } from "../../lib/captures";
import { EASE, tween } from "../../lib/time";
import { amber, BRAND, FONT, NIGHT } from "../look";
import { MONO_ADVANCE } from "./metrics";
import { InkLabel } from "../kit";
import { elevDark } from "./twinLook";
import type { World } from "./types";

/**
 * TerminalTwin: the MCP terminal as a Fathom slab (R2 section 8: radius 28, the dark elevation, a 66 px title bar over a
 * 1.5 px divider, Spline Sans Mono with keys in Night link, strings in Mist, punctuation muted). Output is REAL: pass a
 * toolOutput key from captures.json ("findDocsFlaggedV2", "checkFlaggedV2", "checkVerified", ...) and its `output` is
 * pretty-printed as JSON. `collapse` turns a path into `{ … }` / `[ … ]` / `"…"`, `only` keeps some top-level keys (a
 * `…` line stands for the rest), `focus` makes one value the shot's amber. Commands type in, output streams by line.
 */

export type ToolKey = "checkBefore" | "findDocsFlagged" | "checkFlagged" | "checkVerified" | "findDocsFlaggedV2" | "checkFlaggedV2";

export type TerminalCall = {
  /** The command line, for example `find-docs-for-path {"repo": "payments-api", "path": "scripts/rollback.sh"}`. */
  cmd: string;
  /** Frame the prompt appears and typing starts. */
  at: number;
  /**
   * A captures.json toolOutput key (its `output` is shown), `{ json }`, `{ text }`, plain text (a string that is not a
   * key), or any JSON value as is.
   */
  output: ToolKey | { json: unknown } | { text: string } | string | unknown;
  /**
   * What to show collapsed: dotted JSON paths ("pages.0", "url"), or an id: an object in an array whose `pageId` or
   * `id` equals it ("2752731") becomes `{ … }`.
   */
  collapse?: string[];
  /** Keep only these top-level keys; consecutive omitted keys read as one `…` line. */
  only?: string[];
  /** The one value drawn amber: a dotted path ("status", "pages.1.status"), or a page id (that page's "status"). */
  focus?: string;
  /** Frame output starts streaming (default: typing done + 8). */
  streamAt?: number;
  /** Typing speed, chars per second (default 42). */
  cps?: number;
  /**
   * Frames the command takes to type (overrides `cps`). 0: the command is already typed when the call appears (with
   * `enter`, the slab arrives with its command in place); about 6: a quick type (review G-1).
   */
  typeFrames?: number;
  /** Lines per second while streaming (default 45). */
  lps?: number;
  /** Prompt (default "›"; "$" for a shell). */
  prompt?: string;
  /** Clear the screen when this call starts. */
  clear?: boolean;
};

export type TerminalTwinProps = {
  title: string;
  calls: TerminalCall[];
  /** Right side of the title bar (for example the tool name), mono in Night link. */
  right?: string;
  world?: World;
  x?: number;
  y?: number;
  /** Film px (default 920). */
  width?: number;
  /** Visible body rows (default: the tallest screen, at most 22). The view follows the newest line. */
  rows?: number;
  /** Mono size in film px (default 26; line height x 1.55). */
  fontSize?: number;
  /** Elevation on Day (dark ladder, default 4). */
  elev?: 1 | 2 | 3 | 4;
  /**
   * Size guide (review G-1, R2 section 8): the slab's area at zoom 1 stays at or under this share of the 1920 x 1080
   * frame (default 0.35) by showing fewer rows; the view scrolls. Pass 1 to turn it off. `terminalSize()` reports it.
   */
  maxArea?: number;
  /** The proof tag over the slab's top-left, for example "Real output: doc-drift MCP" (scenes pass the full text). */
  tag?: string;
  /** Tag size in film px (default 28, over the 26 px floor). */
  tagSize?: number;
  /** Arrive by lifting (V4.md M3): from elevation 1, rising 26 px, at full opacity, from `at` over `dur` (default 14). */
  enter?: { at: number; dur?: number };
  /** 0..1: step back behind something in front (blur up to 6 px and scale 0.97), never by opacity (review R-6). */
  dim?: number;
  style?: React.CSSProperties;
};

const TITLE_H = 66;
const BODY_PAD = 26;
const FRAME_AREA = 1920 * 1080;

/** The slab's film-px size for these props (after the size guide), and its share of the frame's area. */
export function terminalSize(p: Pick<TerminalTwinProps, "calls" | "width" | "rows" | "fontSize" | "maxArea">) {
  const width = p.width ?? 920;
  const fontSize = p.fontSize ?? 26;
  const lh = Math.round(fontSize * 1.55);
  const cols = Math.floor((width - 2 * 34) / ((MONO_ADVANCE - 0.01) * fontSize));
  const screens = buildScreens(p.calls, cols);
  const tallest = Math.min(22, Math.max(...screens.map((sc) => sc.lines.length)));
  let rows = p.rows ?? tallest;
  const cap = (p.maxArea ?? 0.35) * FRAME_AREA;
  const maxRows = Math.max(3, Math.floor((cap / width - TITLE_H - 1.5 - 2 * BODY_PAD) / lh));
  rows = Math.min(rows, maxRows);
  const height = TITLE_H + 1.5 + rows * lh + 2 * BODY_PAD;
  return { width, height, rows, lh, cols, area: (width * height) / FRAME_AREA };
}

type C = "key" | "str" | "num" | "punct" | "text" | "focus" | "prompt" | "cmd" | "dim";
type Tok = { t: string; c: C };
type TLine = { indent: number; toks: Tok[] };

const COLORS: Record<C, string> = {
  key: NIGHT.link,
  str: BRAND.mist,
  num: "#8FD3C0",
  punct: NIGHT.textMuted,
  text: NIGHT.text,
  focus: NIGHT.beacon,
  prompt: NIGHT.textMuted,
  cmd: NIGHT.text,
  dim: NIGHT.textMuted,
};

/** Resolve a call's output to a JSON value or text lines. */
function resolve(output: unknown): { json?: unknown; text?: string } {
  if (typeof output === "string") {
    const real = toolOutput(output) as { output?: unknown } | undefined;
    if (real && typeof real === "object" && "output" in real) return { json: real.output };
    return { text: output };
  }
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const keys = Object.keys(output);
    if (keys.length === 1 && keys[0] === "json") return { json: (output as { json: unknown }).json };
    if (keys.length === 1 && keys[0] === "text") return { text: String((output as { text: unknown }).text) };
  }
  return { json: output };
}

/**
 * Honesty guard (V4.md: never show the "DDS test" QA pages): an object whose title names a QA page, and any string
 * that names one, are always shown collapsed. The real output stays real; it is only trimmed, with "…".
 */
const QA_TITLE = /DDS test|\(UX review\)/;
const isQaObject = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as Record<string, unknown>).title === "string" && QA_TITLE.test((v as Record<string, string>).title);

/** An object's id for collapse/focus by id. */
const idOf = (v: unknown): string | undefined => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const id = o.pageId ?? o.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : undefined;
};

/** Split a long string value into chunks of at most `max` chars at spaces (never inside a word). */
function chunk(s: string, first: number, rest: number): string[] {
  const out: string[] = [];
  let cur = "";
  let lim = first;
  for (const word of s.split(/(?<= )/)) {
    if (cur.length + word.length > lim && cur.length > 0) {
      out.push(cur);
      cur = "";
      lim = rest;
    }
    cur += word;
  }
  if (cur) out.push(cur);
  return out;
}

/** Pretty-print JSON into colour-tokenised lines, with collapse, only, focus and wrapping at `cols` chars. */
export function jsonLines(value: unknown, opts: { collapse?: string[]; only?: string[]; focus?: string; cols: number }): TLine[] {
  const collapse = new Set(opts.collapse ?? []);
  const lines: TLine[] = [];
  const IND = 2;
  // focus by id: the status of the object with that id
  let focusPath = opts.focus;
  const findId = (v: unknown, path: string): string | undefined => {
    if (idOf(v) !== undefined && idOf(v) === opts.focus && path !== "") return `${path}.status`;
    if (v && typeof v === "object") {
      for (const [kk, x] of Object.entries(v as Record<string, unknown>)) {
        const r = findId(x, path ? `${path}.${kk}` : kk);
        if (r) return r;
      }
    }
    return undefined;
  };
  if (opts.focus && !/[.]/.test(opts.focus) && !(value && typeof value === "object" && opts.focus in (value as object))) focusPath = findId(value, "") ?? opts.focus;
  const emit = (v: unknown, path: string, indent: number, prefix: Tok[], comma: boolean) => {
    const tail: Tok[] = comma ? [{ t: ",", c: "punct" }] : [];
    const isFocus = focusPath !== undefined && path === focusPath;
    if (v !== null && typeof v === "object") {
      const arr = Array.isArray(v);
      const [o, c] = arr ? ["[", "]"] : ["{", "}"];
      const vid = idOf(v);
      if (collapse.has(path) || (vid !== undefined && collapse.has(vid)) || isQaObject(v)) {
        lines.push({ indent, toks: [...prefix, { t: `${o} … ${c}`, c: "punct" }, ...tail] });
        return;
      }
      const entries = arr ? (v as unknown[]).map((x, i) => [String(i), x] as const) : Object.entries(v as Record<string, unknown>);
      lines.push({ indent, toks: [...prefix, { t: o, c: "punct" }] });
      let skipping = false;
      const keep = !arr && path === "" && opts.only ? new Set(opts.only) : null;
      entries.forEach(([kk, x], i) => {
        const last = i === entries.length - 1;
        if (keep && !keep.has(kk)) {
          if (!skipping) lines.push({ indent: indent + 1, toks: [{ t: "…", c: "dim" }] });
          skipping = true;
          return;
        }
        skipping = false;
        const childPath = path ? `${path}.${kk}` : kk;
        const pre: Tok[] = arr ? [] : [{ t: JSON.stringify(kk), c: "key" }, { t: ": ", c: "punct" }];
        emit(x, childPath, indent + 1, pre, !last);
      });
      lines.push({ indent, toks: [{ t: c, c: "punct" }, ...tail] });
      return;
    }
    if (typeof v === "string") {
      if (collapse.has(path) || QA_TITLE.test(v)) {
        lines.push({ indent, toks: [...prefix, { t: '"…"', c: "str" }, ...tail] });
        return;
      }
      const raw = JSON.stringify(v);
      const used = indent * IND + prefix.reduce((s, t) => s + t.t.length, 0);
      const room = opts.cols - used - (comma ? 1 : 0);
      if (raw.length <= room) {
        lines.push({ indent, toks: [...prefix, { t: raw, c: isFocus ? "focus" : "str" }, ...tail] });
        return;
      }
      const parts = chunk(raw, room, opts.cols - (indent + 1) * IND - 1);
      parts.forEach((part, i) => {
        const last = i === parts.length - 1;
        const toks: Tok[] = [...(i === 0 ? prefix : []), { t: part.replace(/ $/, last ? "" : " "), c: isFocus ? "focus" : "str" }, ...(last ? tail : [])];
        lines.push({ indent: i === 0 ? indent : indent + 1, toks });
      });
      return;
    }
    lines.push({ indent, toks: [...prefix, { t: String(v), c: isFocus ? "focus" : "num" }, ...tail] });
  };
  emit(value, "", 0, [], false);
  return lines;
}

/** Colour a command line: the tool name, then JSON-ish arguments. */
function cmdToks(cmd: string): Tok[] {
  const sp = cmd.indexOf(" ");
  const name = sp < 0 ? cmd : cmd.slice(0, sp);
  const rest = sp < 0 ? "" : cmd.slice(sp);
  const toks: Tok[] = [{ t: name, c: "cmd" }];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|([{}[\],:])|([^"{}[\],:]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rest))) {
    if (m[1]) {
      toks.push({ t: m[1], c: m[2] ? "key" : "str" });
      if (m[2]) toks.push({ t: m[2], c: "punct" });
    } else if (m[3]) toks.push({ t: m[3], c: "punct" });
    else if (m[4]) toks.push({ t: m[4], c: "text" });
  }
  return toks;
}

/** Wrap a token list at `cols` chars (at token or space boundaries); continuation lines indent 2. */
function wrapToks(toks: Tok[], cols: number, contIndent = 2): Tok[][] {
  const out: Tok[][] = [[]];
  let col = 0;
  const pieces: Tok[] = [];
  toks.forEach((t) => t.t.split(/(?<= )/).forEach((p) => pieces.push({ t: p, c: t.c })));
  pieces.forEach((p) => {
    if (col + p.t.replace(/ $/, "").length > cols && col > 0) {
      out.push([{ t: " ".repeat(contIndent), c: "text" }]);
      col = contIndent;
    }
    out[out.length - 1].push(p);
    col += p.t.length;
  });
  return out;
}

type ScreenLine = { toks: Tok[]; indent: number; shownAt: number; typing?: { start: number; cps: number; lead: number; len: number }; cmdEnd?: number };
type Screen = { lines: ScreenLine[] };

/** Builds every line with the frame it appears at. */
function buildScreens(calls: TerminalCall[], cols: number) {
  const screens: { from: number; lines: Screen["lines"] }[] = [];
  let cur: Screen["lines"] = [];
  let curFrom = 0;
  calls.forEach((call, ci) => {
    if (call.clear && ci > 0) {
      screens.push({ from: curFrom, lines: cur });
      cur = [];
      curFrom = call.at;
    } else if (ci === 0) curFrom = call.at;
    if (cur.length) cur.push({ toks: [], indent: 0, shownAt: call.at });
    const prompt: Tok = { t: `${call.prompt ?? "›"} `, c: "prompt" };
    const wrapped = wrapToks([prompt, ...cmdToks(call.cmd)], cols);
    const typeDur = call.typeFrames ?? Math.ceil((call.cmd.length / (call.cps ?? 42)) * 30);
    const cps = typeDur > 0 ? (call.cmd.length / typeDur) * 30 : Infinity;
    const typedEnd = call.at + typeDur;
    const streamAt = call.streamAt ?? typedEnd + 8;
    let typed = 0;
    wrapped.forEach((toks, wi) => {
      const total = toks.reduce((sum, t) => sum + t.t.length, 0);
      const lead = wi === 0 ? prompt.t.length : toks[0]?.t.length ?? 0; // the prompt, or the continuation indent
      const start = typeDur > 0 ? call.at + Math.round((typed / call.cmd.length) * typeDur) : call.at;
      cur.push({ toks, indent: 0, shownAt: start, typing: typeDur > 0 ? { start, cps, lead, len: total } : undefined, cmdEnd: wi === wrapped.length - 1 ? streamAt : undefined });
      typed += total - lead;
    });
    const lps = call.lps ?? 45;
    const res = resolve(call.output);
    const body: TLine[] = res.json !== undefined ? jsonLines(res.json, { collapse: call.collapse, only: call.only, focus: call.focus, cols }) : (res.text ?? "").split("\n").map((l) => ({ indent: 0, toks: [{ t: l, c: "text" as C }] }));
    body.forEach((l, i) => cur.push({ ...l, shownAt: streamAt + Math.floor((i / lps) * 30) }));
  });
  screens.push({ from: curFrom, lines: cur });
  return screens;
}

export const TerminalTwin: React.FC<TerminalTwinProps> = (props) => {
  const { title, calls, right, world = "day", x, y, fontSize = 26, elev = 4, style } = props;
  const frame = useCurrentFrame();
  const enter = props.enter;
  if (enter && frame < enter.at) return null;
  const size = terminalSize(props);
  const { width, lh, cols, rows: visRows } = size;
  const padX = 34;
  const screens = buildScreens(calls, cols);
  const screen = [...screens].reverse().find((sc) => frame >= sc.from) ?? screens[0];
  const shown = screen.lines.filter((l) => frame >= l.shownAt);
  // scroll by whole rows: the rows above the view are not drawn, so nothing is ever cut under the title bar
  const scrollRows = Math.max(0, shown.length - visRows);
  const night = world === "night";
  const blinkOn = Math.floor(frame / 15) % 2 === 0;
  const t = enter ? tween(frame, enter.at, enter.at + (enter.dur ?? 14), 0, 1, EASE.expoOut) : 1;
  const level = 1 + (elev - 1) * t;
  const dim = Math.max(0, Math.min(1, props.dim ?? 0));
  const tagSize = props.tagSize ?? 28;
  const transform = [t < 1 ? `translateY(${(1 - t) * 26}px) scale(${0.985 + 0.015 * t})` : "", dim > 0 ? `scale(${1 - 0.03 * dim})` : ""].filter(Boolean).join(" ");
  return (
    <div
      style={{
        position: x !== undefined || y !== undefined ? "absolute" : "relative",
        left: x,
        top: y,
        width,
        transform: transform || undefined,
        transformOrigin: "50% 50%",
        filter: dim > 0 ? `blur(${(6 * dim).toFixed(2)}px)` : undefined,
        ...style,
      }}
    >
      {props.tag ? (
        <div style={{ position: "absolute", left: 0, top: -(tagSize * 1.8 + 14) }}>
          <InkLabel icon="eye" size={tagSize}>
            {props.tag}
          </InkLabel>
        </div>
      ) : null}
      <div
        style={{
          position: "relative",
          width,
          borderRadius: 28,
          background: night ? NIGHT.surfaceSunk : NIGHT.ground,
          boxShadow: night ? `0 0 0 1.5px ${NIGHT.line}, inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px rgba(1,10,13,0.5)` : elevDarkAt(level),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            height: TITLE_H,
            padding: "0 30px",
            borderBottom: `1.5px solid ${NIGHT.line}`,
            fontFamily: FONT.sans,
            fontSize: 26,
            fontWeight: 500,
            color: NIGHT.textMuted,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="terminal" size={28} color={NIGHT.textMuted} />
          {title}
          <span style={{ flex: 1 }} />
          {right ? <span style={{ fontFamily: FONT.mono, fontSize: 24, color: NIGHT.link }}>{right}</span> : null}
        </div>
        <div style={{ position: "relative", height: visRows * lh + 2 * BODY_PAD }}>
          <div style={{ position: "absolute", left: padX, right: padX, top: BODY_PAD, height: visRows * lh, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, fontFamily: FONT.mono, fontSize, lineHeight: `${lh}px`, letterSpacing: "-0.01em", whiteSpace: "pre" }}>
              {shown.map((l, i) => {
                if (i < scrollRows) return null;
                let toks = l.toks;
                let cursor = false;
                if (l.typing) {
                  const n = Math.min(l.typing.len, l.typing.lead + Math.max(0, Math.floor(((frame - l.typing.start) / 30) * l.typing.cps)));
                  let left = n;
                  toks = [];
                  for (const tk of l.toks) {
                    if (left <= 0) break;
                    toks.push({ ...tk, t: tk.t.slice(0, left) });
                    left -= tk.t.length;
                  }
                  cursor = n < l.typing.len ? true : l.cmdEnd !== undefined && frame < l.cmdEnd && i === shown.length - 1;
                } else if (l.cmdEnd !== undefined && frame < l.cmdEnd && i === shown.length - 1) cursor = true;
                const isFocusLine = l.toks.some((tk) => tk.c === "focus");
                return (
                  <div key={i} style={{ position: "absolute", left: 0, top: (i - scrollRows) * lh, height: lh, paddingLeft: `${l.indent * 2 * (MONO_ADVANCE - 0.01)}em`, whiteSpace: "pre" }}>
                    {isFocusLine ? <FocusBloom toks={l.toks} indent={l.indent} fontSize={fontSize} lh={lh} at={l.shownAt} frame={frame} /> : null}
                    {toks.map((tk, j) => (
                      <span key={j} style={{ position: "relative", color: COLORS[tk.c], fontWeight: tk.c === "cmd" ? 500 : 400 }}>
                        {tk.t}
                      </span>
                    ))}
                    {cursor && blinkOn ? (
                      <span style={{ display: "inline-block", width: "0.6em", height: lh * 0.62, transform: `translateY(${lh * 0.1}px)`, background: NIGHT.text, opacity: 0.85 }} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** The dark elevation at a fractional level (the two levels around it cross-fade). */
function elevDarkAt(level: number) {
  const lv = Math.max(1, Math.min(4, level));
  const lo = Math.floor(lv);
  const f = lv - lo;
  if (f > 0.01 && lo < 4) return `${elevDark(lo, 1 - f)}, ${elevDark(lo + 1, f)}`;
  return elevDark(Math.round(lv));
}

/** The focus value's soft amber bloom (the shot's one amber, with its glow). */
const FocusBloom: React.FC<{ toks: Tok[]; indent: number; fontSize: number; lh: number; at: number; frame: number }> = ({ toks, indent, fontSize, lh, at, frame }) => {
  let col = indent * 2;
  let start = 0;
  let len = 0;
  for (const t of toks) {
    if (t.c === "focus") {
      start = col;
      len = t.t.length;
      break;
    }
    col += t.t.length;
  }
  const adv = (MONO_ADVANCE - 0.01) * fontSize;
  const a = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
  const w = len * adv;
  return (
    <div
      style={{
        position: "absolute",
        left: start * adv - w * 0.25,
        top: -lh * 0.45,
        width: w * 1.5,
        height: lh * 1.9,
        borderRadius: "50%",
        background: `radial-gradient(closest-side, ${amber(0.2 * a)} 0%, ${amber(0.07 * a)} 60%, ${amber(0)} 100%)`,
      }}
    />
  );
};
