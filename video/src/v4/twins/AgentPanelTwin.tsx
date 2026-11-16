import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { Mark } from "../../brand/Mark";
import { SLIP_UNIT } from "../../brand/tokens";
import { EASE, tween } from "../../lib/time";
import { FONT, type Rect } from "../look";
import { layoutRuns, textWidth, type Line, type Run } from "./metrics";
import { bloomBg, elev, palette, withGlow } from "./twinLook";
import type { World } from "./types";

/**
 * AgentPanelTwin: an agent's chat panel as a crafted card. Two variants:
 * - "drift-reviewer" (P3, Day): header "Drift Reviewer" with our mark as the avatar (48 px: under the 64 px rule, so its
 *   slip does not count as the shot's amber), the question, "Referencing" with the page chip, the real thinking steps
 *   ("Analyzing: Reviewing your question.", "Invoking tool: Read Skills for agents", "Invoking tool: Check page
 *   freshness"), and the real v2 answer. No Rovo marks.
 * - "generic" (A1/A4, Night): an unbranded assistant panel ("AI assistant", a plain chat glyph), not shaped like any
 *   real chat product, with a source chip under the answer.
 * Answer lines take light markup: **bold**, `code`, and {source} for the inline page chip. The answer is laid out once,
 * then revealed by characters (`cps`), so words never jump between lines while it streams.
 */

export type AgentPanelTwinProps = {
  world?: World;
  variant: "drift-reviewer" | "generic";
  /** The question types into its bubble from `at` over `typeDur` frames (default: 34 chars per second). */
  question: { text: string; at: number; typeDur?: number; prefilled?: boolean };
  /** Thinking steps: each shows a spinner from `at`, then a check when the next one starts (or 12 frames later). */
  steps?: { text: string; at: number }[];
  /** The answer paragraphs, streamed from `at` at `cps` characters per second (default 60). */
  answer: { lines: string[]; at: number; cps?: number };
  /** The cited page: a chip in the answer ({source}), after "Referencing" (drift-reviewer), or under the answer (generic). */
  source?: { text: string; at?: number } | string;
  /**
   * The old answer ghosting into the answer slot (P3 V17): the text (mono) appears at `at`, slips one unit right in
   * amber with its trace at `slipAt` (default at + 12), and falls away at `out`. It is the shot's one amber.
   */
  ghost?: { text: string; at: number; slipAt?: number; out: number };
  x?: number;
  y?: number;
  /** Film px (default 780). */
  width?: number;
  /** Film px (default: the height of everything once shown). */
  height?: number;
  /** Elevation (default 3). */
  elev?: 1 | 2 | 3 | 4;
  /** Answer size in film px (default 30). */
  size?: number;
  /** Keep the thinking steps above the answer (default false: they fold away as the answer starts, as in the real panel). */
  keepSteps?: boolean;
  /**
   * Arrive with the question already in its bubble (no typing): the card is never empty (review T-1). Same as
   * `question.prefilled`.
   */
  prefilled?: boolean;
  /**
   * Content-sized: the card's height follows what it shows, growing (8 frames, expo out) as the question, the steps and
   * each answer line arrive (default true unless `height` is given). `grow={false}` keeps the final height from the start.
   */
  grow?: boolean;
  /** The avatar's size in film px (default 48; match the real avatar's size in a morph, review T-3). */
  avatarSize?: number;
  style?: React.CSSProperties;
};

const PAD = 34;
const HEAD_H = 60;

/** A whole line that is a command ("./scripts/rollback.sh ...", "$ ...", or fully in backticks) is set as code. */
const isCodeLine = (line: string) => /^(\.\/|\$ )/.test(line.trim()) || /^`[^`]+`$/.test(line.trim());

/** Parse the light markup into runs. */
function parseLine(line: string, source: string | null): Run[] {
  if (isCodeLine(line)) return [{ t: line.trim().replace(/^`|`$/g, ""), code: true }];
  const runs: Run[] = [];
  const re = /\*\*(.+?)\*\*|`(.+?)`|\{source\}|([^*`{]+|[*`{])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1] !== undefined) runs.push({ t: m[1], bold: true });
    else if (m[2] !== undefined) runs.push({ t: m[2], code: true });
    else if (m[0] === "{source}") runs.push({ t: source ?? "", chip: true, extraW: 0 });
    else runs.push({ t: m[0] });
  }
  return runs;
}

type Block = { kind: "q" | "ref" | "thinking" | "step" | "answer" | "source"; y: number; h: number; lines?: Line[]; text?: string; at?: number; idx?: number; starts?: number[] };

type PanelLayout = {
  world: World;
  width: number;
  height: number;
  size: number;
  lh: number;
  inner: number;
  qSize: number;
  qLines: Line[];
  blocks: Block[];
  answerY: number;
  src: { text: string; at?: number } | null;
  chipExtra: number;
  name: string;
  steps: { text: string; at: number }[];
  /** Height of the thinking block that folds away when the answer starts (0 with keepSteps). */
  fold: number;
};

function layoutPanel(props: AgentPanelTwinProps): PanelLayout {
  const world = props.world ?? (props.variant === "generic" ? "night" : "day");
  const width = props.width ?? 780;
  const size = props.size ?? 30;
  const lh = Math.round(size * 1.52);
  const inner = width - 2 * PAD;
  const src = props.source === undefined ? null : typeof props.source === "string" ? { text: props.source, at: undefined } : props.source;
  const chipExtra = size * 0.82 + 10 + 2 * 12; // icon, gap, padding
  const name = props.variant === "drift-reviewer" ? "Drift Reviewer" : "AI assistant";
  const qSize = size * 0.95;
  const qLines = layoutRuns([{ t: props.question.text }], inner * 0.78 - 48, { size: qSize });
  const blocks: Block[] = [];
  let y = PAD + HEAD_H + 26;
  const qH = qLines.length * Math.round(qSize * 1.4) + 30;
  blocks.push({ kind: "q", y, h: qH, lines: qLines });
  y += qH + 18;
  if (src && props.variant === "drift-reviewer") {
    blocks.push({ kind: "ref", y, h: 52 });
    y += 52 + 22;
  }
  const steps = props.steps ?? [];
  const foldStart = y;
  if (steps.length) {
    blocks.push({ kind: "thinking", y, h: 40, at: steps[0].at });
    y += 46;
    steps.forEach((s, i) => {
      blocks.push({ kind: "step", y, h: 40, text: s.text, at: s.at, idx: i });
      y += 44;
    });
    y += 16;
  }
  const fold = steps.length && !props.keepSteps ? y - foldStart : 0;
  const duringThinking = y;
  const paras = props.answer.lines.map((l) => layoutRuns(parseLine(l, src ? src.text : null).map((r) => (r.chip ? { ...r, extraW: chipExtra } : r)), inner, { size, codeSize: size * 0.88 }));
  const answerY = y;
  let chars = 0;
  paras.forEach((lines, i) => {
    // the character index each line starts at (the answer streams through all lines in order)
    const starts = lines.map((l) => {
      const at0 = chars;
      l.runs.forEach((r) => (chars += r.t.length + (r.space > 0 ? 1 : 0)));
      return at0;
    });
    blocks.push({ kind: "answer", y, h: lines.length * lh, lines, idx: i, starts });
    y += lines.length * lh + (i < paras.length - 1 ? 18 : 0);
  });
  if (src && props.variant === "generic") {
    y += 22;
    blocks.push({ kind: "source", y, h: 50 });
    y += 50;
  }
  const height = props.height ?? Math.max(y - fold, duringThinking + 40) + PAD;

  return { world, width, height, size, lh, inner, qSize, qLines, blocks, answerY, src, chipExtra, name, steps, fold };
}

/** When the question shows, and whether it is already typed. */
const questionTiming = (props: AgentPanelTwinProps) => {
  const prefilled = props.prefilled ?? props.question.prefilled ?? false;
  const typeDur = prefilled ? 0 : props.question.typeDur ?? Math.ceil((props.question.text.length / 34) * 30);
  return { prefilled, typeDur, shownFrom: prefilled ? -Infinity : props.question.at };
};

/** The card's content-sized height at a frame (what it shows then, each part growing in over 8 frames). */
export function agentPanelHeightAt(props: AgentPanelTwinProps, frame: number): number {
  const L = layoutPanel(props);
  if (props.height !== undefined) return props.height;
  if (props.grow === false) return L.height;
  const q = questionTiming(props);
  const g = (at: number, dur = 8) => (at === -Infinity ? 1 : tween(frame, at, at + dur, 0, 1, EASE.expoOut));
  const cps = props.answer.cps ?? 60;
  const fp = L.fold > 0 ? tween(frame, props.answer.at - 4, props.answer.at + 8, 0, 1, EASE.expoInOut) : 0;
  let bottom = PAD + HEAD_H + 12;
  L.blocks.forEach((b) => {
    let at = -Infinity;
    if (b.kind === "q") at = q.shownFrom;
    else if (b.kind === "ref") at = L.src?.at ?? props.question.at + q.typeDur + 10;
    else if (b.kind === "thinking" || b.kind === "step") at = b.at ?? 0;
    else if (b.kind === "source") at = L.src?.at ?? props.answer.at;
    if (b.kind === "answer") {
      (b.lines ?? []).forEach((_, li) => {
        const la = props.answer.at + ((b.starts?.[li] ?? 0) / cps) * 30;
        if (frame < la) return;
        const top = b.y - L.fold * fp + li * L.lh;
        bottom = Math.max(bottom, top + L.lh * g(la, 6));
      });
      return;
    }
    if (frame < at) return;
    const shift = b.y >= L.answerY ? L.fold * fp : 0;
    const folding = b.kind === "thinking" || b.kind === "step" ? fp : 0;
    if (folding >= 1) return;
    bottom = Math.max(bottom, b.y - shift + b.h * g(at) - L.fold * folding);
  });
  return bottom + PAD;
}

/**
 * Film-px rects of the panel's parts for these props (absolute on the stage when x/y are given, else relative to the
 * panel): `panel`, `header`, `avatar`, `question` (the bubble), `referencing`, `thinking`, `steps[i]`, `answer` (all
 * paragraphs), `answerLines[i]` (each laid-out line), `source` (the chip: inline in the first line for drift-reviewer
 * when the answer starts with {source}, or the row under the answer for generic), `ghost`.
 */
export function agentPanelRects(props: AgentPanelTwinProps) {
  const L = layoutPanel(props);
  const ox = props.x ?? 0;
  const oy = props.y ?? 0;
  const r0 = (x: number, y: number, w: number, h: number): Rect => ({ x: ox + x, y: oy + y, w, h });
  // parts after the steps sit where they land once the steps fold away
  const r = (x: number, y: number, w: number, h: number): Rect => r0(x, y >= L.answerY ? y - L.fold : y, w, h);
  const q = L.blocks.find((b) => b.kind === "q")!;
  const qLh = Math.round(L.qSize * 1.4);
  const bw = Math.max(...(q.lines ?? []).map((l) => l.w)) + 48;
  const ref = L.blocks.find((b) => b.kind === "ref");
  const thinking = L.blocks.find((b) => b.kind === "thinking");
  const steps = L.blocks.filter((b) => b.kind === "step");
  const answers = L.blocks.filter((b) => b.kind === "answer");
  const answerLines: Rect[] = [];
  let source: Rect | null = null;
  answers.forEach((b) =>
    (b.lines ?? []).forEach((l, li) => {
      answerLines.push(r(PAD, b.y + li * L.lh, l.w, L.lh));
      l.runs.forEach((run) => {
        if (run.chip && !source) source = r(PAD + run.x, b.y + li * L.lh + L.lh * 0.04, run.w, L.lh * 0.92);
      });
    }),
  );
  const srcRow = L.blocks.find((b) => b.kind === "source");
  if (!source && srcRow && L.src) source = r(PAD, srcRow.y, textWidth(L.src.text, { size: L.size, weight: 500 }) + L.chipExtra, srcRow.h);
  const last = answers[answers.length - 1];
  void qLh;
  return {
    panel: r(0, 0, L.width, L.height),
    header: r(PAD, PAD, L.inner, HEAD_H),
    avatar: r(PAD, PAD + (HEAD_H - (props.avatarSize ?? 48)) / 2, props.avatarSize ?? 48, props.avatarSize ?? 48),
    question: r(L.width - PAD - bw, q.y, bw, q.h),
    referencing: ref ? r(PAD, ref.y, L.inner, ref.h) : null,
    thinking: thinking ? r(PAD, thinking.y, L.inner, thinking.h) : null,
    steps: steps.map((b) => r(PAD + 16, b.y, L.inner - 16, b.h)),
    answer: answers.length ? r(PAD, answers[0].y, L.inner, last.y + last.h - answers[0].y) : r(PAD, L.answerY, L.inner, 0),
    answerLines,
    source: source as Rect | null,
    ghost: r(PAD, L.answerY, L.inner, L.lh),
    /** Height the steps fold away by when the answer starts. */
    fold: L.fold,
  };
}

export const AgentPanelTwin: React.FC<AgentPanelTwinProps> = (props) => {
  const frame = useCurrentFrame();
  const L = layoutPanel(props);
  const { world, width, height, size, lh, inner, qSize, blocks, answerY, src, name, steps, fold } = L;
  const p = palette(world);
  const fp = fold > 0 ? tween(frame, props.answer.at - 4, props.answer.at + 8, 0, 1, EASE.expoInOut) : 0;
  const shiftY = (y0: number) => (y0 >= answerY ? y0 - fold * fp : y0);
  /** The fold: the answer slides up over the steps; a step is cut at the answer's current top (no fade, no overlap). */
  const foldClip = (top: number, h: number) => {
    if (fp <= 0) return undefined;
    const edge = answerY - fold * fp - 10; // the answer's current top, less a small gap
    const visible = Math.max(0, Math.min(h, edge - top));
    return `inset(0px 0px ${(h - visible).toFixed(2)}px 0px)`;
  };
  // ── reveal ──
  const cps = props.answer.cps ?? 60;
  let budget = Math.max(0, ((frame - props.answer.at) / 30) * cps);
  const qt = questionTiming(props);
  const typeDur = qt.typeDur;
  const qN = qt.prefilled ? props.question.text.length : Math.round(props.question.text.length * tween(frame, props.question.at, props.question.at + typeDur, 0, 1, EASE.linear));
  const qShown = frame >= qt.shownFrom;
  const sent = qt.prefilled ? 1 : tween(frame, props.question.at + typeDur, props.question.at + typeDur + 8, 0, 1, EASE.expoOut);
  const panelH = agentPanelHeightAt(props, frame);

  const chip = (text: string, key?: React.Key, cs: number = size) => (
    <span
      key={key}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10 * (cs / size),
        height: lh * 0.92 * (cs / size),
        padding: `0 ${12 * (cs / size)}px`,
        boxSizing: "border-box",
        borderRadius: 10 * (cs / size),
        boxShadow: `inset 0 0 0 2px ${p.line}`,
        color: p.link,
        fontFamily: FONT.sans,
        fontWeight: 500,
        fontSize: cs,
        whiteSpace: "nowrap",
        verticalAlign: "middle",
      }}
    >
      <Icon name="page" size={cs * 0.82} color={p.link} />
      {text}
    </span>
  );

  const renderLine = (line: Line, top: number, key: React.Key) => {
    const runs: React.ReactNode[] = [];
    line.runs.forEach((r, i) => {
      const len = r.t.length + (r.space > 0 ? 1 : 0);
      if (budget <= 0) return;
      if (r.chip) {
        runs.push(
          <span key={i} style={{ position: "absolute", left: r.x, top: 0, height: lh, display: "flex", alignItems: "center", opacity: Math.min(1, budget / 6) }}>
            {chip(r.t)}
          </span>,
        );
        budget -= len;
        return;
      }
      const n = Math.min(r.t.length, Math.floor(budget));
      const solid = r.t.slice(0, Math.max(0, n - 5));
      const fading = r.t.slice(Math.max(0, n - 5), n);
      budget -= len;
      runs.push(
        <span
          key={i}
          style={{
            position: "absolute",
            left: r.x,
            top: 0,
            height: lh,
            display: "flex",
            alignItems: "center",
            whiteSpace: "pre",
            fontFamily: r.code ? FONT.mono : FONT.sans,
            fontSize: r.code ? size * 0.88 : size,
            fontWeight: r.bold ? 600 : 400,
            color: p.text,
          }}
        >
          {r.code ? (
            <span style={{ padding: `0 ${size * 0.88 * 0.28}px`, borderRadius: 6, background: p.surfaceSunk }}>{r.t.slice(0, n)}</span>
          ) : (
            <>
              {solid}
              {fading.split("").map((c, j) => (
                <span key={j} style={{ opacity: 1 - (j + 1) / (fading.length + 1) + (n >= r.t.length ? 1 : 0) }}>
                  {c}
                </span>
              ))}
            </>
          )}
        </span>,
      );
    });
    return (
      <div key={key} style={{ position: "absolute", left: PAD, top, width: inner, height: lh }}>
        {runs}
      </div>
    );
  };

  const night = world === "night";
  return (
    <div
      style={{
        position: props.x !== undefined || props.y !== undefined ? "absolute" : "relative",
        left: props.x,
        top: props.y,
        width,
        height: panelH,
        borderRadius: 30,
        background: p.surface,
        boxShadow: elev(props.elev ?? 3, 1, world),
        fontFamily: FONT.sans,
        color: p.text,
        overflow: "hidden",
        ...props.style,
      }}
    >
      {/* header */}
      <div style={{ position: "absolute", left: PAD, top: PAD, height: HEAD_H, display: "flex", alignItems: "center", gap: 16 }}>
        {props.variant === "drift-reviewer" ? (
          <Mark size={props.avatarSize ?? 48} variant="icon" />
        ) : (
          <span style={{ width: props.avatarSize ?? 48, height: props.avatarSize ?? 48, borderRadius: (props.avatarSize ?? 48) * 0.29, display: "grid", placeItems: "center", background: night ? p.surfaceSunk : p.ground, boxShadow: `inset 0 0 0 1.5px ${p.line}` }}>
            <Icon name="words" size={28} color={p.textMuted} />
          </span>
        )}
        <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em" }}>{name}</span>
      </div>
      <div style={{ position: "absolute", left: PAD, right: PAD, top: PAD + HEAD_H + 12, height: 1.5, background: p.line }} />
      {blocks.map((b, bi) => {
        if (b.kind === "q") {
          if (!qShown) return null;
          const lines = b.lines ?? [];
          const qLh = Math.round(qSize * 1.4);
          const bw = Math.max(...lines.map((l) => l.w)) + 48;
          let left = qN;
          return (
            <div
              key={bi}
              style={{
                position: "absolute",
                right: PAD,
                top: b.y + (1 - sent) * 0,
                width: bw,
                height: b.h,
                borderRadius: 20,
                background: night ? p.surfaceSunk : p.surfaceSunk,
                boxShadow: sent > 0 ? `0 ${2 * sent}px ${6 * sent}px rgba(7,38,48,${0.06 * sent})` : undefined,
              }}
            >
              {lines.map((l, li) => {
                const text = l.runs.map((r) => r.t + (r.space > 0 ? " " : "")).join("");
                const shown = text.slice(0, Math.max(0, left));
                left -= text.length;
                const typing = frame < props.question.at + typeDur;
                return (
                  <div key={li} style={{ position: "absolute", left: 24, top: 15 + li * qLh, height: qLh, display: "flex", alignItems: "center", fontSize: qSize, whiteSpace: "pre", color: p.text }}>
                    {shown}
                    {typing && left <= 0 && left > -text.length - 1 && Math.floor(frame / 8) % 2 === 0 ? <span style={{ width: 2.5, height: qSize * 1.05, background: p.text, marginLeft: 2 }} /> : null}
                  </div>
                );
              })}
            </div>
          );
        }
        if (b.kind === "ref") {
          const at = src?.at ?? props.question.at + typeDur + 10;
          if (frame < at) return null;
          const t = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
          return (
            <div key={bi} style={{ position: "absolute", right: PAD, top: b.y + (1 - t) * 8, opacity: t, height: b.h, display: "flex", alignItems: "center", gap: 12, padding: "0 10px 0 16px", borderRadius: 14, background: night ? p.surfaceSunk : p.ground }}>
              <Icon name="undo" size={24} color={p.textMuted} style={{ transform: "scaleY(-1)" }} />
              <span style={{ fontSize: 24, color: p.textMuted }}>Referencing</span>
              {chip(src!.text, undefined, size * 0.82)}
            </div>
          );
        }
        if (b.kind === "thinking") {
          const at = b.at ?? 0;
          if (frame < at || fp >= 1) return null;
          const done = frame >= props.answer.at;
          const dots = done ? "." : ".".repeat(1 + (Math.floor(frame / 9) % 3));
          return (
            <div key={bi} style={{ position: "absolute", left: PAD, top: b.y, height: b.h, display: "flex", alignItems: "center", gap: 12, fontSize: 26, color: p.textMuted, whiteSpace: "pre", clipPath: foldClip(b.y, b.h) }}>
              {props.variant === "drift-reviewer" ? <Mark size={30} variant="flat-ink" /> : null}
              {`${name} is thinking${dots}`}
            </div>
          );
        }
        if (b.kind === "step") {
          const at = b.at ?? 0;
          if (frame < at || fp >= 1) return null;
          const next = steps[(b.idx ?? 0) + 1]?.at;
          const doneAt = next ?? at + 12;
          const done = frame >= doneAt;
          const t = tween(frame, at, at + 8, 0, 1, EASE.expoOut);
          return (
            <div key={bi} style={{ position: "absolute", left: PAD + 16, top: b.y + (1 - t) * 6, opacity: t, height: b.h, display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: p.text, whiteSpace: "nowrap", clipPath: foldClip(b.y + (1 - t) * 6, b.h) }}>
              {done ? (
                <span style={{ width: 28, height: 28, borderRadius: 14, background: p.verified, display: "grid", placeItems: "center" }}>
                  <Icon name="check" size={20} color={p.surface} stroke={2.6} />
                </span>
              ) : (
                <span style={{ width: 28, height: 28, borderRadius: 14, boxSizing: "border-box", border: `3px solid ${p.line}`, borderTopColor: p.textMuted, transform: `rotate(${frame * 24}deg)` }} />
              )}
              {b.text}
            </div>
          );
        }
        if (b.kind === "answer") return <React.Fragment key={bi}>{(b.lines ?? []).map((l, li) => renderLine(l, shiftY(b.y) + li * lh, `${bi}-${li}`))}</React.Fragment>;
        if (b.kind === "source") {
          const at = src?.at ?? props.answer.at;
          if (frame < at) return null;
          const t = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
          return (
            <div key={bi} style={{ position: "absolute", left: PAD, top: shiftY(b.y) + (1 - t) * 8, opacity: t, height: b.h, display: "flex", alignItems: "center" }}>
              {chip(src!.text)}
            </div>
          );
        }
        return null;
      })}
      {props.ghost ? <Ghost ghost={props.ghost} top={answerY - fold} left={PAD} size={size} lh={lh} world={world} frame={frame} /> : null}
    </div>
  );
};

/** The old answer, ghosting in and slipping out in amber (the shot's one amber, with trace, glow and bloom). */
const Ghost: React.FC<{ ghost: NonNullable<AgentPanelTwinProps["ghost"]>; top: number; left: number; size: number; lh: number; world: World; frame: number }> = ({ ghost, top, left, size, lh, world, frame }) => {
  if (frame < ghost.at || frame > ghost.out + 10) return null;
  const p = palette(world);
  const fs = size * 0.88;
  const w = textWidth(ghost.text, { size: fs, mono: true, tracking: -0.01 }) + 2 * 0.28 * fs;
  const inP = tween(frame, ghost.at, ghost.at + 8, 0, 1, EASE.expoOut);
  const slipAt = ghost.slipAt ?? ghost.at + 12;
  const s = tween(frame, slipAt, slipAt + 6, 0, 1, EASE.expoOut);
  const fall = tween(frame, ghost.out, ghost.out + 10, 0, 1, EASE.expoIn);
  const dx = SLIP_UNIT * w * s;
  return (
    <div style={{ position: "absolute", left, top, width: w, height: lh }}>
      {s > 0.001 ? <div style={{ position: "absolute", inset: `${lh * 0.12}px 0`, borderRadius: 8, background: p.trace, opacity: Math.min(1, s / 0.25) * (1 - fall) }} /> : null}
      {s > 0.001 ? <div style={{ position: "absolute", left: dx - w * 0.3, top: -lh * 0.8, width: w * 1.6, height: lh * 2.6, borderRadius: "50%", background: bloomBg(s * (1 - fall)) }} /> : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: lh * 0.12,
          height: lh * 0.76,
          display: "flex",
          alignItems: "center",
          padding: `0 ${0.28 * fs}px`,
          borderRadius: 8,
          background: s > 0.001 ? `rgba(255, 178, 36, ${s})` : p.surfaceSunk,
          boxShadow: withGlow("none", world, s * (1 - fall), 1.6),
          color: s > 0.5 ? p.onBeacon : p.text,
          fontFamily: FONT.mono,
          fontSize: fs,
          letterSpacing: "-0.01em",
          whiteSpace: "pre",
          opacity: inP * 0.9 * (1 - fall),
          transform: `translate(${dx}px, ${fall * 60}px)`,
        }}
      >
        {ghost.text}
      </div>
    </div>
  );
};
