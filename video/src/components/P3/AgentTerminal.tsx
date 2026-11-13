import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { BRAND, FONT, NIGHT } from "../../brand/tokens";
import { clamp, EASE } from "../../lib/time";
import { scaleShadow } from "../BrowserFrame";

/**
 * A coding agent's terminal rebuilt from REAL tool output (P3, P4), styled like the kit's <Terminal> (Night
 * surface-sunk panel, Spline Sans Mono, keys in `link`, strings in mist, state values in their state colours), with
 * what the kit panel does not do:
 * - `scroll`: the view moves by whole rows in ONE smooth move at a given frame (a new call clears the previous one
 *   out of view), instead of a step per printed row;
 * - rows of an earlier call can be drawn muted from a frame on (`dimFrom`), so the one amber value in view is the
 *   current one;
 * - rows can be highlighted while the narration names them.
 *
 * Each row is ONE visual line at a fixed index (callers wrap long values at the terminal's width and mark omissions
 * with "…"). Text is coloured by a JSON-ish tokenizer: "key": in link colour, "strings" in mist, state words in state
 * colours. A "tool" row is `server · tool-name` plus optional JSON arguments.
 */
export type Row = {
  at: number;
  text: string;
  kind?: "tool" | "json" | "dim" | "str";
  indent?: number;
  /** The row belongs to an earlier call: from this frame it is drawn muted. */
  dimFrom?: number;
};

const P = NIGHT;
const C = { text: P.text, muted: P.textMuted, key: P.link, string: BRAND.mist };
const STATE: Record<string, string> = { possibly_stale: P.beacon, verified: P.verified, stale: P.stale, unanchored: P.unanchored };

type Span = { text: string; color: string; weight?: number };

const TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|([{}[\],:])/g;

function jsonSpans(text: string): Span[] {
  const out: Span[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i), color: C.text });
    if (m[1] !== undefined) {
      const inner = m[1].slice(1, -1);
      if (m[2] !== undefined) {
        out.push({ text: m[1], color: C.key });
        out.push({ text: m[2], color: C.muted });
      } else out.push({ text: m[1], color: STATE[inner] ?? C.string });
    } else if (m[3] !== undefined) out.push({ text: m[3], color: C.muted });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), color: C.text });
  return out;
}

function spansFor(r: Row, dim: boolean): Span[] {
  if (dim || r.kind === "dim") return [{ text: r.text, color: C.muted }];
  if (r.kind === "str") return [{ text: r.text, color: C.string }];
  if (r.kind === "tool") {
    const m = r.text.match(/^(.*?·\s*)([\w-]+)(.*)$/);
    if (!m) return [{ text: r.text, color: C.key, weight: 500 }];
    return [{ text: m[1], color: C.muted }, { text: m[2], color: C.key, weight: 500 }, ...jsonSpans(m[3])];
  }
  return jsonSpans(r.text);
}

export type Highlight = { from: number; to?: number; rows: [number, number] };
export type Scroll = { at: number; rows: number; dur?: number };

export const terminalTitleH = 76;
export const terminalPadY = 36;
/** Height of an AgentTerminal (to lay things out under it). */
export const terminalHeight = (viewRows: number, fontSize = 40, title = true) =>
  (title ? terminalTitleH : 0) + 2 * terminalPadY + viewRows * Math.round(fontSize * 1.5);

export const AgentTerminal: React.FC<{
  rows: Row[];
  width: number;
  /** Rows the viewport shows. */
  viewRows: number;
  scroll?: Scroll[];
  fontSize?: number;
  title?: string;
  highlights?: Highlight[];
  /** Corner radius (24 floats; a terminal docked into a frame's bottom passes "0 0 24px 24px"). */
  radius?: number | string;
  shadow?: boolean;
  style?: React.CSSProperties;
}> = ({ rows, width, viewRows, scroll = [], fontSize = 40, title = "Coding agent · MCP", highlights = [], radius = 24, shadow = true, style }) => {
  const frame = useCurrentFrame();
  const lh = Math.round(fontSize * 1.5);
  const titleH = title ? terminalTitleH : 0;
  const height = terminalHeight(viewRows, fontSize, Boolean(title));
  const shown = rows.map((r, i) => ({ r, i })).filter(({ r }) => frame >= r.at);
  // the view's top row: each scroll moves it from where it was to `rows` in one eased move
  let top = 0;
  for (const sc of [...scroll].sort((a, b) => a.at - b.at)) {
    if (frame < sc.at) break;
    top = interpolate(frame, [sc.at, sc.at + (sc.dur ?? 13)], [top, sc.rows], { ...clamp, easing: EASE.cubicInOut });
  }
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: radius,
        background: P.surfaceSunk,
        boxShadow: shadow ? `0 0 0 1px ${P.line}, ${scaleShadow(P.shadowRaise, 2)}` : `0 0 0 1px ${P.line}`,
        overflow: "hidden",
        ...style,
      }}
    >
      {title ? (
        <div
          style={{
            height: titleH,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "0 40px",
            borderBottom: `1px solid ${P.line}`,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 28,
            color: P.textMuted,
          }}
        >
          <Icon name="terminal" size={32} color={P.textMuted} />
          {title}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: titleH + terminalPadY, height: viewRows * lh, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${-top * lh}px)` }}>
          {highlights.map((h, i) => {
            const on = interpolate(frame, [h.from, h.from + 6], [0, 1], clamp) * (h.to === undefined ? 1 : interpolate(frame, [h.to, h.to + 6], [1, 0], clamp));
            if (on <= 0) return null;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 24,
                  right: 24,
                  top: h.rows[0] * lh - 4,
                  height: (h.rows[1] - h.rows[0] + 1) * lh + 8,
                  borderRadius: 12,
                  background: P.surface,
                  boxShadow: `inset 3px 0 0 ${P.lineStrong}`,
                  opacity: on,
                }}
              />
            );
          })}
          {shown.map(({ r, i }) => {
            const dim = r.dimFrom !== undefined && frame >= r.dimFrom;
            const appear = interpolate(frame, [r.at, r.at + 2], [0, 1], clamp);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 48 + (r.indent ?? 0) * fontSize * 0.565,
                  top: i * lh,
                  height: lh,
                  display: "flex",
                  alignItems: "center",
                  whiteSpace: "pre",
                  fontFamily: FONT.mono,
                  fontSize,
                  letterSpacing: "-0.01em",
                  opacity: appear,
                }}
              >
                {spansFor(r, dim).map((s, j) => (
                  <span key={j} style={{ color: s.color, fontWeight: s.weight ?? 400 }}>
                    {s.text}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
