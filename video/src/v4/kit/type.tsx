import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { EASE, tween } from "../../lib/time";
import { BRAND, DAY, FONT, NIGHT, amber, type Rect } from "../look";
import { DirectionalBlur } from "./blur";
import { useRealCapture, warnPaint } from "./capturectx";

/**
 * Kinetic type for v4 (V4.md M6, L3; ported from Pot's text/KineticText.tsx WordRise and text/marks.tsx at 30 fps).
 * Whole words rise out of a vertical smear into fixed slots on their cue (the layout never reflows), then hold
 * perfectly still. Marks on words: the Mist band (multiply) and the Current underline for emphasis; AmberBlock only on
 * the drift. "\n" in `text` breaks the line; U+00A0 joins words into one unit ("rollback.sh moved").
 *
 *   const sc = getScene("A1");
 *   <KineticLine text="A date can't see a merge." at={sc.cue("V05")} words={sc.line("V05").words.slice(...)} />
 *   <KineticLine text="Safe to cite." at={sc.wordAt("V22", "safe")} size={156}
 *     mark={{ words: [0, 2], kind: "current", at: sc.wordAt("V22", "cite") }} />
 */

/** Pot's default entry curve (bezier .22,.78,.51,.94): ~85% of the travel in the first half, a long soft tail. */
export const LAND = Easing.bezier(0.22, 0.78, 0.51, 0.94);
/** Pot's exit curve: thrown off, accelerating. */
export const THROW = Easing.bezier(0.29, 0, 0.63, 0.04);

/** A word timing in LOCAL frames (src/lib/timeline.ts: `sc.line("V05").words`). */
export type WordTiming = { from: number; to?: number; text?: string };

export type MarkKind = "mist" | "current" | "amber";
/** A mark over words i..j of the line (inclusive, 0-based), drawn from `at`. */
export type LineMark = { words: [number, number]; kind: MarkKind; at: number; dur?: number };

export type KineticLineProps = {
  text: string;
  /** Local frame the first word starts rising (when there are no `words`, and as the fallback). */
  at: number;
  /**
   * Cues, one per word of `text`, by index (extra entries are ignored; missing ones follow the last at `stagger`).
   * A word starts rising `lead` frames before its cue, so it reads as landed 0 to 2 frames before it is heard.
   * `lineCues(sc.line("V05"), text)` builds them from the narration.
   */
  words?: (WordTiming | undefined)[];
  /** px (default 120, the headline). */
  size?: number;
  weight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  /** Max line width in px (wraps between words). */
  width?: number;
  /** Line height in px (default 1.05 x size). */
  lineHeight?: number;
  /** Letter spacing (default by size: -0.03em at 156, -0.028em at 120, -0.02em at 80, -0.01em below). */
  tracking?: string;
  mono?: boolean;
  /** Frames between words without cues (default 3). */
  stagger?: number;
  /** Frames a word starts before its cue (default 6). */
  lead?: number;
  /** Entry frames (default 10). */
  dur?: number;
  /** Rise distance in em (default 0.34). */
  rise?: number;
  /** Vertical smear at the start, em (default 0.11; 0 = none). */
  smear?: number;
  /** Indices of thesis words: they arrive from 1.6x instead of rising (one per line at most). */
  thesis?: number[];
  mark?: LineMark | LineMark[];
  /** Words leave upward from `exit.at`, `stagger` (default 1) apart, `dur` (default 4) each. */
  exit?: { at: number; stagger?: number; dur?: number };
  world?: "day" | "night";
  /** Wrap a word's content (e.g. a Slip on one word). */
  renderWord?: (text: string, index: number) => React.ReactNode;
  style?: React.CSSProperties;
};

type Tok = { kind: "word"; text: string; index: number } | { kind: "br" };

function tokenize(text: string): Tok[] {
  const out: Tok[] = [];
  let index = 0;
  text.split("\n").forEach((line, li) => {
    if (li > 0) out.push({ kind: "br" });
    for (const w of line.split(/[ \t]+/).filter(Boolean)) out.push({ kind: "word", text: w, index: index++ });
  });
  return out;
}

const cleanWord = (t: string) => t.toLowerCase().replace(/[^a-z0-9#']/g, "");

/**
 * Cues for on-screen words from a narration line (src/lib/timeline.ts: `getScene("P4").line("V22")`): each word of
 * `text` takes the next spoken word that matches it (case and punctuation ignored, either one a prefix of the other);
 * words that are not spoken get no cue and follow the previous one at `stagger`. Pass the result as `words`.
 *
 *   const sc = getScene("P4");
 *   <KineticLine text="Safe to cite." at={sc.cue("V22")} words={lineCues(sc.line("V22"), "Safe to cite.")} />
 */
export function lineCues(line: { words: { text: string; from: number; to: number }[] }, text: string): (WordTiming | undefined)[] {
  const shown = tokenize(text).filter((t): t is { kind: "word"; text: string; index: number } => t.kind === "word");
  const out: (WordTiming | undefined)[] = [];
  let k = 0;
  for (const w of shown) {
    const c = cleanWord(w.text);
    let hit = -1;
    for (let j = k; j < line.words.length; j++) {
      const v = cleanWord(line.words[j].text);
      if (c && v && (v.startsWith(c) || c.startsWith(v))) {
        hit = j;
        break;
      }
    }
    if (hit >= 0) {
      out.push({ from: line.words[hit].from, to: line.words[hit].to, text: line.words[hit].text });
      k = hit + 1;
    } else out.push(undefined);
  }
  return out;
}

/** The frame each word of `text` starts rising. */
export function wordStarts(text: string, at: number, words?: (WordTiming | undefined)[], stagger = 3, lead = 6): number[] {
  const n = tokenize(text).filter((t) => t.kind === "word").length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const w = words?.[i];
    if (w) out.push(w.from - lead);
    else if (i > 0) out.push(out[i - 1] + stagger);
    else out.push(at);
  }
  return out;
}

/** The frame the last word of a line has landed (start of its hold), for reading-time checks. */
export function lineLanded(text: string, at: number, words?: (WordTiming | undefined)[], stagger = 3, lead = 6, dur = 10): number {
  const s = wordStarts(text, at, words, stagger, lead);
  return (s.length ? s[s.length - 1] : at) + dur;
}

const trackingFor = (size: number) => (size >= 150 ? "-0.03em" : size >= 110 ? "-0.028em" : size >= 70 ? "-0.02em" : "-0.01em");

export const KineticLine: React.FC<KineticLineProps> = ({
  text,
  at,
  words,
  size = 120,
  weight = 600,
  color,
  align = "left",
  width,
  lineHeight,
  tracking,
  mono = false,
  stagger = 3,
  lead = 6,
  dur = 10,
  rise = 0.34,
  smear = 0.11,
  thesis = [],
  mark,
  exit,
  world = "day",
  renderWord,
  style,
}) => {
  const frame = useCurrentFrame();
  const toks = tokenize(text);
  const starts = wordStarts(text, at, words, stagger, lead);
  const marks = mark ? (Array.isArray(mark) ? mark : [mark]) : [];
  const ink = color ?? (world === "night" ? NIGHT.text : DAY.text);

  const wordEl = (t: { text: string; index: number }) => {
    const start = starts[t.index];
    const started = frame >= start;
    const e = tween(frame, start, start + dur, 0, 1, LAND);
    const q = exit ? tween(frame, exit.at + t.index * (exit.stagger ?? 1), exit.at + t.index * (exit.stagger ?? 1) + (exit.dur ?? 4), 0, 1, THROW) : 0;
    const isThesis = thesis.includes(t.index);
    const y = isThesis ? 0 : (1 - e) * rise - q * rise;
    const sc = isThesis ? 1.6 + (1 - 1.6) * e : 1;
    const sigma = (smear * (1 - e) + smear * q) * size;
    const opacity = started ? (0.2 + 0.8 * tween(frame, start, start + 5, 0, 1, EASE.linear)) * (1 - q) : 0;
    const content = renderWord ? renderWord(t.text, t.index) : t.text;
    if (e >= 1 && q <= 0) return <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>{content}</span>;
    return (
      <DirectionalBlur
        inline
        y={sigma}
        x={isThesis ? sigma * 0.5 : 0}
        style={{ transform: `translateY(${y}em) scale(${sc})`, opacity, transformOrigin: "50% 60%", whiteSpace: "nowrap" }}
      >
        {content}
      </DirectionalBlur>
    );
  };

  // lay the tokens out, grouping each mark's run of words inside its mark
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    if (t.kind === "br") {
      nodes.push(<br key={`br${i}`} />);
      i++;
      continue;
    }
    const m = marks.find((mk) => mk.words[0] === t.index);
    if (i > 0 && toks[i - 1].kind === "word") nodes.push(" ");
    if (m) {
      const run: React.ReactNode[] = [];
      let j = i;
      while (j < toks.length) {
        const u = toks[j];
        if (u.kind !== "word" || u.index > m.words[1]) break;
        if (j > i) run.push(" ");
        run.push(<React.Fragment key={j}>{wordEl(u)}</React.Fragment>);
        j++;
      }
      const Mark = m.kind === "mist" ? MistBand : m.kind === "current" ? CurrentUnderline : AmberBlock;
      nodes.push(
        <Mark key={`m${i}`} at={m.at} dur={m.dur} world={world}>
          {run}
        </Mark>,
      );
      i = j;
      continue;
    }
    nodes.push(<React.Fragment key={i}>{wordEl(t)}</React.Fragment>);
    i++;
  }

  return (
    <div
      style={{
        fontFamily: mono ? FONT.mono : FONT.sans,
        fontWeight: mono ? 400 : weight,
        fontSize: size,
        lineHeight: lineHeight ? `${lineHeight}px` : 1.05,
        letterSpacing: tracking ?? (mono ? "-0.01em" : trackingFor(size)),
        color: ink,
        textAlign: align,
        width,
        ...style,
      }}
    >
      {nodes}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------------------------------------------------

export type MarkProps = {
  at: number;
  /** Frames of the sweep (default 10; amber 9). */
  dur?: number;
  world?: "day" | "night";
  /** Mark a region instead of wrapping words: a Rect in the parent's px (e.g. a key phrase on a real plate). */
  rect?: Rect;
  /** Sweep it away (same direction) from this frame. */
  exitAt?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

/** Visible sweep interval [a, b] (0..1 of the width) of a mark at a frame. */
function sweepOf(frame: number, at: number, dur: number, exitAt?: number) {
  const b = tween(frame, at, at + dur, 0, 1, LAND);
  const a = exitAt !== undefined ? tween(frame, exitAt, exitAt + dur, 0, 1, EASE.expoInOut) : 0;
  return { a, b, show: b - a > 0.0005 };
}

/**
 * The Mist band: a marker band over the words (or over `rect` on a real plate), drawn left to right, multiplied into
 * what is under it so the words stay exactly as printed (R2 section 6). Night: a soft light band (screen).
 */
export const MistBand: React.FC<MarkProps> = ({ at, dur = 10, world = "day", rect, exitAt, children, style }) => {
  const frame = useCurrentFrame();
  const { a, b, show } = sweepOf(frame, at, dur, exitAt);
  const night = world === "night";
  const band = (box: React.CSSProperties) =>
    show ? (
      <span
        aria-hidden
        style={{
          position: "absolute",
          ...box,
          background: night ? "rgba(157, 184, 190, 0.26)" : BRAND.mist,
          mixBlendMode: night ? "screen" : "multiply",
          borderRadius: 4,
          clipPath: `inset(0 ${(1 - b) * 100}% 0 ${a * 100}%)`,
          pointerEvents: "none",
        }}
      />
    ) : null;
  if (rect) {
    const pad = rect.h * 0.22;
    return band({ left: rect.x - pad * 0.6, top: rect.y - pad, width: rect.w + pad * 1.2, height: rect.h + 2 * pad, display: "block", ...style });
  }
  return (
    <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", ...style }}>
      <span style={{ position: "relative" }}>{children}</span>
      {band({ left: "-0.1em", right: "-0.1em", top: "0.06em", bottom: "0.02em" })}
    </span>
  );
};

/** The Current underline: a rule in `current` (Night: link) under the words or the rect, drawn left to right. Never text. */
export const CurrentUnderline: React.FC<MarkProps> = ({ at, dur = 10, world = "day", rect, exitAt, children, style }) => {
  const frame = useCurrentFrame();
  const { a, b, show } = sweepOf(frame, at, dur, exitAt);
  const color = world === "night" ? NIGHT.link : BRAND.current;
  const rule = (box: React.CSSProperties) =>
    show ? (
      <span
        aria-hidden
        style={{
          position: "absolute",
          ...box,
          borderRadius: 4,
          background: color,
          clipPath: `inset(0 ${(1 - b) * 100}% 0 ${a * 100}% round 4px)`,
          pointerEvents: "none",
        }}
      />
    ) : null;
  if (rect) {
    const t = Math.max(5, rect.h * 0.12);
    return rule({ left: rect.x, top: rect.y + rect.h + Math.max(3, rect.h * 0.08), width: rect.w, height: t, display: "block", ...style });
  }
  return (
    <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", ...style }}>
      <span style={{ position: "relative" }}>{children}</span>
      {rule({ left: 0, right: 0, bottom: "-0.06em", height: "max(5px, 0.07em)" })}
    </span>
  );
};

/**
 * The amber block: the drift's highlight sweeping behind the words (Pot's HighlightBar), with its bloom. Text on the
 * block is Fathom (on Night the passed part of the word turns Fathom as the block sweeps). Amber means drift: use it
 * only on the drifted words, once per shot (L4).
 */
export const AmberBlock: React.FC<MarkProps> = ({ at, dur = 9, world = "day", rect, exitAt, children, style }) => {
  const frame = useCurrentFrame();
  const onCapture = useRealCapture();
  if (onCapture) {
    // V5.md 8.1: amber only on crafted elements; never painted over a real capture (use LiftOut beside it)
    warnPaint(`AmberBlock over the real capture ${onCapture}: amber goes on a crafted element beside it (LiftOut), never on the capture`);
    return rect ? null : <span style={style}>{children}</span>;
  }
  const { a, b, show } = sweepOf(frame, at, dur, exitAt);
  const padX = 0.12;
  const bloom = show ? Math.min(1, (b - a) * 1.4) : 0;
  const block = (box: React.CSSProperties) =>
    show ? (
      <span
        aria-hidden
        style={{
          position: "absolute",
          ...box,
          background: BRAND.beacon,
          borderRadius: "0.14em",
          clipPath: `inset(-60% ${(1 - b) * 100}% -60% ${a * 100}% round 0.14em)`,
          boxShadow: `0 0 0 1px ${amber(0.35 * bloom)}, 0 0.12em 0.6em ${amber(0.42 * bloom)}`,
          pointerEvents: "none",
        }}
      />
    ) : null;
  if (rect) return block({ left: rect.x, top: rect.y, width: rect.w, height: rect.h, display: "block", borderRadius: 8, ...style });
  const night = world === "night";
  // Day text is already Fathom; on Night, draw the Fathom copy only where the block has passed
  return (
    <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", ...style }}>
      {block({ left: `-${padX}em`, right: `-${padX}em`, top: "0.02em", bottom: "-0.02em" })}
      <span style={{ position: "relative", display: "inline-block" }}>{children}</span>
      {night && show ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            color: BRAND.fathom,
            whiteSpace: "nowrap",
            clipPath: `inset(0 ${(1 - b) * 100}% 0 ${a * 100}%)`,
          }}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
};
