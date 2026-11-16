import React, { useId } from "react";
import { getLength, getPointAtLength } from "@remotion/paths";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { EASE, tween } from "../../lib/time";
import { BRAND, FONT, NIGHT, type Rect } from "../look";
import { textWidth } from "./metrics";
import { elev, palette } from "./twinLook";
import type { AnchorSpec, World } from "./types";

/**
 * AnchorRail: a page's anchors as chips, joined to the page band they belong to (R2 section 4). Labels are the real
 * ones (apps/core lib/anchors.ts anchorLabel: "payments-api: scripts/rollback.sh"; a Jira anchor is its key, which the
 * anchors UI types as "Jira issue"). A watched anchor's connector is a 2 px dashed Current curve; a changed one a 2.5 px
 * Fathom curve. Connectors leave from a node on the band's right edge and never cross (chips are ordered by the height
 * of their source). Under the chips' first row sits the "Anchors" label (COPY.anchors), unless `title={false}`.
 */

/** UI px (film = x k). */
const CHIP = { size: 16, sub: 14.5, padX: 13, padY: 10, icon: 18, gap: 9, radius: 11, lh: 22, changeSize: 13.5, changeLh: 20 } as const;

export type AnchorPulse = { index: number; at: number; dur?: number; dir?: "toPage" | "toChip" };

export type AnchorRailProps = {
  anchors: AnchorSpec[];
  /** Frame each connector starts to draw (one per anchor). The chip lifts in as its line arrives. */
  draw: number[];
  /** The page band the connectors leave from (film px; node on its right edge), or one rect per anchor. */
  from: Rect | Rect[];
  /** A pulse along one connector (or several). Default direction: from the chip to the page (the change arriving). */
  pulse?: AnchorPulse | AnchorPulse[];
  /** A change docks on one anchor's chip at `at` ("PR #482 · scripts/rollback.sh -> scripts/rollback-v2.sh"); its connector turns solid. */
  change?: { index: number; text: string; at: number };
  /** Anchors drawn as changed from the start (solid Fathom connector). */
  changed?: number[];
  world?: World;
  /** UI px to film px for the chips (default 1.8: labels 29 px). */
  k?: number;
  /** Left edge of the chips (film px). Default: 200 px right of the source. */
  x?: number;
  /** Top of the first chip (film px). Default: the stack centred on the source nodes. */
  y?: number;
  /** Vertical gap between chips (film px, default 34). */
  gap?: number;
  /** Fixed chip width (film px). Default: each chip fits its label. */
  width?: number;
  /** The "Anchors" label over the chips (default true). */
  title?: boolean;
  /** Frames a connector takes to draw (default 14). */
  drawDur?: number;
  /** Leave at `at` over `dur` (default 9): the curves retract toward the page while the chips slide right and drop. */
  leave?: { at: number; dur?: number };
};

/** How a change line is laid out: "PR #482 · a -> b" stacks the PR over the rename, so the chip grows mostly in height. */
function changeRows(text: string): { head: string; body: string | null } {
  const i = text.indexOf(" · ");
  return i < 0 ? { head: text, body: null } : { head: text.slice(0, i), body: text.slice(i + 3) };
}
/** Mono width of a change string where "->" is drawn as the arrow icon (0.95 em plus 0.45 em each side). */
const arrowedWidth = (t: string, size: number) => {
  const parts = t.split(/\s*->\s*/);
  return parts.reduce((w, p) => w + textWidth(p, { size, mono: true, tracking: -0.01 }), 0) + (parts.length - 1) * 1.85 * size;
};

const labelOf = (a: AnchorSpec) => a.label;

/**
 * Film-px geometry of the rail: chip rects, source nodes, chip nodes and connector paths. With `frame`, the chips below
 * a docking change move down as it opens (what the rail draws at that frame); without it, the layout after the change.
 */
export function anchorRailRects(p: AnchorRailProps, frame?: number) {
  const k = p.k ?? 1.8;
  const n = p.anchors.length;
  const sources: Rect[] = Array.isArray(p.from) ? p.from : p.anchors.map(() => p.from as Rect);
  const srcNodes = sources.map((r) => [r.x + r.w, r.y + r.h / 2] as [number, number]);
  // chips are sized to what they show at this frame: the label, then (as a change docks) the change line
  const cp = p.change ? (frame === undefined ? 1 : tween(frame, p.change.at, p.change.at + 12, 0, 1, EASE.expoOut)) : 0;
  const rows = p.change ? changeRows(p.change.text) : null;
  const chipW = p.anchors.map((a, i) => {
    const labelW = textWidth(labelOf(a), { size: CHIP.size, mono: true, tracking: -0.01 }) + (a.kind === "jira" ? textWidth(" Jira issue", { size: CHIP.sub, weight: 500 }) + 6 : 0);
    const base = (labelW + CHIP.icon + CHIP.gap + 2 * CHIP.padX) * k;
    if (p.width !== undefined) return p.width;
    if (!p.change || p.change.index !== i || !rows) return base;
    const headW = arrowedWidth(rows.head, CHIP.changeSize) + CHIP.icon + CHIP.gap;
    const bodyW = rows.body ? arrowedWidth(rows.body, CHIP.changeSize) + CHIP.icon + CHIP.gap : 0;
    const full = (Math.max(headW, bodyW) + 2 * CHIP.padX) * k;
    return base + Math.max(0, full - base) * cp;
  });
  const chipH = (CHIP.lh + 2 * CHIP.padY) * k;
  const changeH = ((rows && rows.body ? 2 : 1) * (CHIP.changeLh + 6) + 12) * k;
  const gap = p.gap ?? 34;
  // order by source height (no crossings), then stack
  const order = p.anchors.map((_, i) => i).sort((a, b) => srcNodes[a][1] - srcNodes[b][1] || a - b);
  const heights = p.anchors.map((_, i) => chipH + (p.change && p.change.index === i ? changeH * cp : 0));
  const total = order.reduce((s, i) => s + heights[i], 0) + gap * (n - 1);
  const midY = srcNodes.reduce((s, q) => s + q[1], 0) / Math.max(1, n);
  const top = p.y ?? midY - total / 2;
  const left = p.x ?? Math.max(...srcNodes.map((q) => q[0])) + 200;
  const chips: Rect[] = new Array(n);
  let cy = top;
  order.forEach((i) => {
    chips[i] = { x: left, y: cy, w: chipW[i], h: heights[i] };
    cy += heights[i] + gap;
  });
  const chipNodes = chips.map((c) => [c.x, c.y + chipH / 2] as [number, number]);
  const paths = p.anchors.map((_, i) => {
    const [x1, y1] = srcNodes[i];
    const [x2, y2] = chipNodes[i];
    const mx = x1 + (x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  });
  return { k, chips, chipH, changeH, srcNodes, chipNodes, paths, titleAt: { x: left, y: top - 56 } };
}

const Arrowed: React.FC<{ text: string; size: number; color: string }> = ({ text, size, color }) => {
  const parts = text.split(/\s*->\s*/);
  return (
    <span style={{ fontFamily: FONT.mono, fontSize: size, letterSpacing: "-0.01em", color, whiteSpace: "pre", display: "inline-flex", alignItems: "center" }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {p}
          {i < parts.length - 1 ? (
            <span style={{ display: "inline-flex", margin: "0 0.45em" }}>
              <Icon name="arrow" size={size * 0.95} color={color} />
            </span>
          ) : null}
        </React.Fragment>
      ))}
    </span>
  );
};

export const AnchorRail: React.FC<AnchorRailProps> = (props) => {
  const frame = useCurrentFrame();
  const world = props.world ?? "day";
  const pal = palette(world);
  const G = anchorRailRects(props, frame);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { k } = G;
  const drawDur = props.drawDur ?? 14;
  const pulses = props.pulse ? (Array.isArray(props.pulse) ? props.pulse : [props.pulse]) : [];
  const fathom = world === "night" ? NIGHT.text : BRAND.fathom;
  const teal = world === "night" ? NIGHT.link : BRAND.current;
  const firstDraw = Math.min(...props.draw);
  const lv = props.leave ? tween(frame, props.leave.at, props.leave.at + (props.leave.dur ?? 9), 0, 1, EASE.expoIn) : 0;
  if (lv >= 1) return null;
  const titleIn = tween(frame, firstDraw, firstDraw + 10, 0, 1, EASE.expoOut) * (1 - lv);
  return (
    <>
      {props.title !== false && frame >= firstDraw ? (
        <div
          style={{
            position: "absolute",
            left: G.titleAt.x,
            top: G.titleAt.y + (1 - titleIn) * 10,
            opacity: titleIn,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: FONT.sans,
            fontSize: 28,
            fontWeight: 500,
            color: pal.textMuted,
          }}
        >
          <Icon name="anchor" size={30} color={pal.textMuted} />
          Anchors
        </div>
      ) : null}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
        <defs>
          {G.paths.map((d, i) => {
            const len = getLength(d);
            const t = tween(frame, props.draw[i] ?? 0, (props.draw[i] ?? 0) + drawDur, 0, 1, EASE.expoInOut) * (1 - lv);
            return (
              <mask key={i} id={`rail-${uid}-${i}`} maskUnits="userSpaceOnUse" x={-200} y={-200} width={2320} height={1480}>
                <path d={d} fill="none" stroke="#fff" strokeWidth={8} strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - t)} />
              </mask>
            );
          })}
        </defs>
        {G.paths.map((d, i) => {
          const start = props.draw[i] ?? 0;
          if (frame < start) return null;
          const isChanged = (props.changed ?? []).includes(i);
          const turned = props.change && props.change.index === i ? tween(frame, props.change.at, props.change.at + 8, 0, 1, EASE.expoOut) : 0;
          const solid = isChanged ? 1 : turned;
          const nodeIn = tween(frame, start, start + 6, 0, 1, EASE.expoOut);
          const endIn = tween(frame, start + drawDur * 0.8, start + drawDur + 2, 0, 1, EASE.expoOut) * (lv > 0.5 ? 0 : 1);
          const maskId = `url(#rail-${uid}-${i})`;
          const [x1, y1] = G.srcNodes[i];
          const [x2, y2] = G.chipNodes[i];
          const nodeStroke = solid > 0.5 ? fathom : teal;
          return (
            <g key={i}>
              <g mask={maskId}>
                {solid < 1 ? <path d={d} fill="none" stroke={teal} strokeOpacity={0.85 * (1 - solid)} strokeWidth={2} strokeDasharray="7 7" strokeLinecap="round" /> : null}
                {solid > 0 ? <path d={d} fill="none" stroke={fathom} strokeOpacity={solid} strokeWidth={2.5} strokeLinecap="round" /> : null}
              </g>
              <circle cx={x1} cy={y1} r={6 * nodeIn * (1 - lv)} fill={pal.surface} stroke={nodeStroke} strokeWidth={2.5} />
              <circle cx={x2} cy={y2} r={6 * endIn} fill={pal.surface} stroke={nodeStroke} strokeWidth={2.5} />
            </g>
          );
        })}
        {pulses.map((pu, j) => {
          const d = G.paths[pu.index];
          if (!d || frame < pu.at) return null;
          const dur = pu.dur ?? 14;
          const t = tween(frame, pu.at, pu.at + dur, 0, 1, EASE.expoInOut);
          if (frame > pu.at + dur + 4) return null;
          const len = getLength(d);
          const along = pu.dir === "toChip" ? t : 1 - t;
          const pt = getPointAtLength(d, along * len) ?? { x: 0, y: 0 };
          const fade = 1 - tween(frame, pu.at + dur, pu.at + dur + 4, 0, 1, EASE.linear);
          return (
            <g key={`p${j}`} opacity={fade}>
              <circle cx={pt.x} cy={pt.y} r={16} fill={fathom} opacity={0.12} />
              <circle cx={pt.x} cy={pt.y} r={7.5} fill={pal.surface} stroke={fathom} strokeWidth={3} />
            </g>
          );
        })}
      </svg>
      {props.anchors.map((a, i) => {
        const start = props.draw[i] ?? 0;
        const arrive = start + drawDur * 0.65;
        if (frame < arrive) return null;
        const t = tween(frame, arrive, arrive + 13, 0, 1, EASE.expoOut);
        const appear = tween(frame, arrive, arrive + 4, 0, 1, EASE.linear);
        const c = G.chips[i];
        const ch = props.change && props.change.index === i ? props.change : null;
        const cp = ch ? tween(frame, ch.at, ch.at + 12, 0, 1, EASE.expoOut) : 0;
        const level = 1 + t + (cp > 0 ? cp : 0);
        const u = (n: number) => n * k;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: c.x + lv * 80,
              top: c.y + (1 - t) * 12 + lv * 10,
              width: c.w,
              boxSizing: "border-box",
              borderRadius: u(CHIP.radius),
              background: pal.surface,
              boxShadow: elev(level * (1 - lv) + lv, 1, world),
              opacity: appear * (lv > 0.7 ? 1 - (lv - 0.7) / 0.3 : 1),
              overflow: "hidden",
            }}
          >
            <div style={{ height: G.chipH, display: "flex", alignItems: "center", gap: u(CHIP.gap), padding: `0 ${u(CHIP.padX)}px`, whiteSpace: "nowrap" }}>
              <Icon name={a.kind === "jira" ? "ticket" : "anchor"} size={u(CHIP.icon)} color={pal.textMuted} />
              <span style={{ fontFamily: FONT.mono, fontSize: u(CHIP.size), letterSpacing: "-0.01em", color: pal.text }}>{a.label}</span>
              {a.kind === "jira" ? <span style={{ fontFamily: FONT.sans, fontSize: u(CHIP.sub), fontWeight: 500, color: pal.textMuted }}>Jira issue</span> : null}
            </div>
            {ch && cp > 0 ? (
              <div style={{ height: c.h - G.chipH, overflow: "hidden" }}>
                <div style={{ margin: `0 ${u(CHIP.padX)}px`, height: 1.5 * k, background: pal.line }} />
                {(() => {
                  const r = changeRows(ch.text);
                  const row = (content: React.ReactNode, icon: boolean, key: string) => (
                    <div
                      key={key}
                      style={{
                        height: (CHIP.changeLh + 6) * k,
                        display: "flex",
                        alignItems: "center",
                        gap: u(CHIP.gap),
                        padding: `0 ${u(CHIP.padX)}px`,
                        transform: `translateX(${(1 - cp) * 60}px)`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {icon ? <Icon name="merge" size={u(CHIP.icon)} color={pal.textMuted} /> : <span style={{ width: u(CHIP.icon), flex: "none" }} />}
                      {content}
                    </div>
                  );
                  return (
                    <div style={{ paddingTop: 6 * k }}>
                      {row(<Arrowed text={r.head} size={u(CHIP.changeSize)} color={pal.text} />, true, "h")}
                      {r.body ? row(<Arrowed text={r.body} size={u(CHIP.changeSize)} color={pal.text} />, false, "b") : null}
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
};
