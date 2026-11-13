import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Badge } from "../../brand/Badge";
import { Icon } from "../../brand/icons";
import { FONT, NIGHT } from "../../brand/tokens";
import { clamp, EASE } from "../../lib/time";
import { setInProgress } from "../../motion/text";
import { RUNBOOK_TITLE } from "./runbook";

/**
 * A generic assistant panel of our own (A1 V06, again in A4 V24): a quiet header, the question as a sent bubble, the
 * answer streaming word by word, and a source chip citing the runbook. Not shaped like any chat product: no avatars, no
 * product marks, no composer bar, no sparkles.
 *
 * Geometry is tuned to the A1 to A2 slip cut (src/transitions.ts): the cut splits the frame at y 373-421 and 659-707,
 * so the question sits in the top band, the answer and its command fill the middle band (which slips out of line), and
 * the source chip sits in the bottom band.
 */
const P = NIGHT;

export const PANEL = { x: 192, y: 116, w: 1536, h: 780 } as const;
const PAD_X = 72;
const LEFT = PANEL.x + PAD_X;
const RIGHT = PANEL.x + PANEL.w - PAD_X;

export type Token = { text: string; mono?: boolean };
/** A line of the answer: tokens stream in one word at a time. */
export type AnswerLine = { tokens: Token[]; size?: number; weight?: number; top: number; lineHeight?: number };

/** Split tokens into words (keeping mono runs whole) so they can stream. */
function words(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    if (t.mono) out.push(t);
    else for (const w of t.text.split(/(?<=\s)/)) if (w.length > 0) out.push({ text: w });
  }
  return out;
}

const Streamed: React.FC<{ line: AnswerLine; at: number; perWord: number; offset: number }> = ({ line, at, perWord, offset }) => {
  const frame = useCurrentFrame();
  const ws = words(line.tokens);
  const size = line.size ?? 44;
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT,
        top: line.top,
        width: RIGHT - LEFT,
        fontFamily: FONT.sans,
        fontWeight: line.weight ?? 500,
        fontSize: size,
        lineHeight: `${line.lineHeight ?? Math.round(size * 1.32)}px`,
        letterSpacing: "-0.01em",
        color: P.text,
      }}
    >
      {ws.map((w, i) => {
        const start = at + (offset + i) * perWord;
        const o = interpolate(frame, [start, start + 4], [0, 1], clamp);
        const style: React.CSSProperties = w.mono
          ? { fontFamily: FONT.mono, fontWeight: 500, fontSize: "0.92em", letterSpacing: "-0.01em", opacity: o, whiteSpace: "pre" }
          : { opacity: o, whiteSpace: "pre-wrap" };
        return (
          <span key={i} style={style}>
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export const wordCount = (lines: AnswerLine[]) => lines.reduce((n, l) => n + words(l.tokens).length, 0);

export const AssistantPanel: React.FC<{
  question: string;
  /** The question bubble rises in here. */
  askAt: number;
  answer: AnswerLine[];
  /** First word of the answer. */
  streamAt: number;
  /** Frames per streamed word (default 2). */
  perWord?: number;
  /** An optional command block after the answer, streamed by character. */
  code?: { text: string; top: number; at: number; frames?: number };
  /** The source chip: rises in at `at`; `badge` adds the page's state badge (the amber one in A4). */
  source: { top: number; at: number; detail?: string; badge?: boolean };
}> = ({ question, askAt, answer, streamAt, perWord = 2, code, source }) => {
  const frame = useCurrentFrame();
  const ask = setInProgress(frame, askAt, 12);
  const src = setInProgress(frame, source.at, 12);
  let offset = 0;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: PANEL.x,
          top: PANEL.y,
          width: PANEL.w,
          height: PANEL.h,
          borderRadius: 24,
          background: P.surface,
          boxShadow: `0 0 0 1px ${P.line}, 0 24px 64px #00000059`,
        }}
      />
      <div style={{ position: "absolute", left: LEFT, top: PANEL.y + 40, display: "flex", alignItems: "center", gap: 14 }}>
        <Icon name="words" size={36} color={P.textMuted} />
        <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 34, lineHeight: "40px", color: P.textMuted }}>Assistant</span>
      </div>
      <div style={{ position: "absolute", left: PANEL.x, right: 1920 - RIGHT, top: 232, display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            padding: "26px 36px",
            borderRadius: 24,
            background: P.surfaceSunk,
            boxShadow: `0 0 0 1px ${P.line}`,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 44,
            lineHeight: "52px",
            letterSpacing: "-0.01em",
            color: P.text,
            opacity: interpolate(ask, [0, 0.4], [0, 1], clamp),
            transform: `translateY(${(1 - ask) * 22}px)`,
            whiteSpace: "nowrap",
          }}
        >
          {question}
        </div>
      </div>
      {answer.map((line, i) => {
        const el = <Streamed key={i} line={line} at={streamAt} perWord={perWord} offset={offset} />;
        offset += words(line.tokens).length;
        return el;
      })}
      {code ? <CommandBlock {...code} /> : null}
      {src > 0 ? (
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: source.top,
            display: "flex",
            alignItems: "center",
            gap: 24,
            opacity: interpolate(src, [0, 0.4], [0, 1], clamp),
            transform: `translateY(${(1 - src) * 16}px)`,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              height: 76,
              padding: "0 30px 0 22px",
              borderRadius: 16,
              background: P.surfaceSunk,
              boxShadow: `0 0 0 1px ${P.line}`,
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: 36,
              lineHeight: 1,
              color: P.text,
              boxSizing: "border-box",
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="page" size={36} color={P.textMuted} />
            {RUNBOOK_TITLE}
            {source.detail ? <span style={{ color: P.textMuted }}>{`· ${source.detail}`}</span> : null}
          </div>
          {source.badge ? <Badge state="possibly_stale" size={2.5} theme="night" /> : null}
        </div>
      ) : null}
    </div>
  );
};

const CommandBlock: React.FC<{ text: string; top: number; at: number; frames?: number }> = ({ text, top, at, frames = 12 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const box = interpolate(frame, [at, at + 5], [0, 1], { ...clamp, easing: EASE.expoOut });
  const n = Math.round(interpolate(frame, [at + 2, at + 2 + frames], [0, text.length], clamp));
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT,
        top,
        boxSizing: "border-box",
        height: 132,
        display: "flex",
        alignItems: "center",
        padding: "0 40px",
        borderRadius: 16,
        background: P.surfaceSunk,
        boxShadow: `0 0 0 1px ${P.line}`,
        opacity: box,
        fontFamily: FONT.mono,
        fontWeight: 500,
        fontSize: 44,
        lineHeight: "60px",
        letterSpacing: "-0.01em",
        color: P.text,
        whiteSpace: "pre",
      }}
    >
      {/* the full text holds the box at its final width; the unstreamed part is transparent */}
      <span>{text.slice(0, n)}</span>
      <span style={{ color: "transparent" }}>{text.slice(n)}</span>
    </div>
  );
};
