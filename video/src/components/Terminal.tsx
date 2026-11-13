import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../brand/icons";
import { BRAND, FONT, NIGHT } from "../brand/tokens";
import { clamp } from "../lib/time";
import { scaleShadow } from "./BrowserFrame";

/**
 * A terminal panel rebuilt from REAL tool output (BRIEF decision 10): a dark panel (Night surface-sunk) in Spline Sans
 * Mono, a prompt, and lines that stream in at their own frames. Commands type on; output lines appear whole, the way a
 * terminal prints. No third-party logo, no window chrome; an optional quiet title.
 *
 * Colour roles: JSON keys in `link`, strings in `text`, punctuation and comments muted, and the four state words in
 * their state colours. `possibly_stale` is amber, so it is the shot's one amber element: keep other amber out.
 *
 *   <Terminal width={1500} height={760} title="Coding agent · MCP" lines={[
 *     { at: 0, kind: "cmd", text: "Which docs describe deploy/helm/values.yaml?" },
 *     { at: 40, kind: "tool", text: "doc-drift · find-docs-for-path (payments-api, deploy/helm/values.yaml)" },
 *     { at: 52, kind: "json", text: '{ "title": "Payments rollback runbook", "status": "possibly_stale" }' },
 *   ]} />
 */
export type TermLine = {
  /** Local frame the line appears (a command starts typing here). */
  at: number;
  text: string;
  /** cmd: a prompt line that types on. out: plain output. json: highlighted. tool: a tool call. dim: a comment. agent: the agent's prose. */
  kind?: "cmd" | "out" | "json" | "tool" | "dim" | "agent";
  /** Frames to type a command (default: 1 frame per 1.6 characters). */
  typeFrames?: number;
  /** Indent in characters. */
  indent?: number;
};

const P = NIGHT;
const C = {
  text: P.text,
  muted: P.textMuted,
  key: P.link,
  string: BRAND.mist,
  number: BRAND.mist,
  prompt: P.textMuted,
  tool: P.link,
};

const STATE_COLOR: Record<string, string> = {
  possibly_stale: P.beacon,
  verified: P.verified,
  stale: P.stale,
  unanchored: P.unanchored,
};

type Span = { text: string; color: string; weight?: number };

const TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(possibly_stale|verified|stale|unanchored)\b|(-?\b\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)|([{}[\],:])/g;

/** Highlight one line of JSON-ish output. */
export function highlight(text: string): Span[] {
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
      } else {
        out.push({ text: m[1], color: STATE_COLOR[inner] ?? C.string });
      }
    } else if (m[3] !== undefined) {
      out.push({ text: m[3], color: STATE_COLOR[m[3]] });
    } else if (m[4] !== undefined) {
      out.push({ text: m[4], color: C.number });
    } else if (m[5] !== undefined) {
      out.push({ text: m[5], color: C.muted });
    }
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), color: C.text });
  return out;
}

function spansFor(line: TermLine, shown: string): Span[] {
  switch (line.kind) {
    case "cmd":
      return [{ text: shown, color: C.text, weight: 500 }];
    case "dim":
      return [{ text: shown, color: C.muted }];
    case "tool": {
      // "server · tool (args)": the tool name in link colour, the rest muted
      const m = shown.match(/^(.*?·\s*)([\w-]+)(.*)$/);
      if (!m) return [{ text: shown, color: C.tool }];
      return [
        { text: m[1], color: C.muted },
        { text: m[2], color: C.tool, weight: 500 },
        { text: m[3], color: C.muted },
      ];
    }
    case "agent":
      return highlightStates(shown, C.text);
    case "json":
      return highlight(shown);
    default:
      return highlightStates(shown, C.text);
  }
}

/** Plain text with only the state words coloured. */
function highlightStates(text: string, color: string): Span[] {
  const out: Span[] = [];
  let last = 0;
  for (const m of text.matchAll(/\b(possibly_stale|verified|stale|unanchored)\b/g)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i), color });
    out.push({ text: m[1], color: STATE_COLOR[m[1]] });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), color });
  return out;
}

export const Terminal: React.FC<{
  lines: TermLine[];
  width: number;
  height: number;
  /** Mono size in px (default 40: literals stay >= 40 px). */
  fontSize?: number;
  title?: string;
  /** Prompt glyph for cmd lines (default "›"). */
  prompt?: string;
  /** Show only the last N visible lines (the terminal scrolls). */
  maxLines?: number;
  /** Panel shadow scale (0 = flat). */
  shadow?: number;
  style?: React.CSSProperties;
}> = ({ lines, width, height, fontSize = 40, title, prompt = "›", maxLines, shadow = 2, style }) => {
  const frame = useCurrentFrame();
  const lh = Math.round(fontSize * 1.5);
  const visible = lines.filter((l) => frame >= l.at);
  const shownLines = maxLines ? visible.slice(-maxLines) : visible;
  const last = visible[visible.length - 1];
  const typingLast = last?.kind === "cmd" && frame < last.at + (last.typeFrames ?? Math.ceil(last.text.length / 1.6));
  const caretOn = typingLast || Math.floor(frame / 16) % 2 === 0;
  const titleH = title ? 76 : 0;
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 24,
        background: P.surfaceSunk,
        boxShadow: shadow > 0 ? `0 0 0 1px ${P.line}, ${scaleShadow(P.shadowRaise, shadow)}` : `0 0 0 1px ${P.line}`,
        overflow: "hidden",
        boxSizing: "border-box",
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
            fontSize: 26,
            color: P.textMuted,
          }}
        >
          <Icon name="terminal" size={30} color={P.textMuted} />
          {title}
        </div>
      ) : null}
      <div style={{ padding: `${title ? 36 : 44}px 48px`, fontFamily: FONT.mono, fontSize, lineHeight: `${lh}px`, letterSpacing: "-0.01em" }}>
        {shownLines.map((l, i) => {
          const isLast = l === last;
          const typeFrames = l.typeFrames ?? Math.ceil(l.text.length / 1.6);
          const shown = l.kind === "cmd" ? l.text.slice(0, Math.max(0, Math.round(((frame - l.at) / typeFrames) * l.text.length))) : l.text;
          const appear = l.kind === "cmd" ? 1 : interpolate(frame, [l.at, l.at + 2], [0, 1], clamp);
          const spans = spansFor(l, shown);
          return (
            <div
              key={`${l.at}-${i}`}
              style={{
                display: "flex",
                opacity: appear,
                paddingLeft: (l.indent ?? 0) * fontSize * 0.6,
                marginTop: l.kind === "cmd" && i > 0 ? lh * 0.5 : 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {l.kind === "cmd" ? <span style={{ color: C.prompt, marginRight: "0.6em", flexShrink: 0 }}>{prompt}</span> : null}
              <span>
                {spans.map((s, j) => (
                  <span key={j} style={{ color: s.color, fontWeight: s.weight ?? 400 }}>
                    {s.text}
                  </span>
                ))}
                {isLast && caretOn && l.kind === "cmd" ? (
                  <span style={{ display: "inline-block", width: "0.55em", height: "1.05em", verticalAlign: "-0.2em", marginLeft: "0.08em", background: P.textMuted }} />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
