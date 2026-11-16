import React from "react";
import { getLength } from "@remotion/paths";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { EASE, mix, tween } from "../../lib/time";
import { DAY, ELEV, FONT, ink, NIGHT, type Rect } from "../../v4/look";

/**
 * V18 "which pages cover a file": the three pages find-docs-for-path returned, as page cards. They wait as a stack
 * behind the terminal (the page it answers on top), fan out on the narration with a connector from the path to each,
 * and fold back with the runbook on top once check-page-freshness is called on it ("and which to trust").
 *
 * Honesty: only the runbook is named (title and pageId from toolOutput.findDocsFlaggedV2). The other two are QA pages
 * in a test space (R3 risk 9: never show their titles), so their cards carry placeholder lines only, as the terminal
 * collapses their rows to `{ … }`. No card carries a state colour: the terminal's "possibly_stale" is the shot's amber.
 */
export type FanCard = {
  key: string;
  /** The runbook's real title and pageId; QA cards leave both out. */
  title?: string;
  id?: string;
  /** Where the card waits in the stack, and where it lands fanned out (film px, parent space). */
  stack: Rect;
  fan: Rect;
  /** Paint order in the stack (higher on top). */
  z: number;
};

export type PageFanProps = {
  cards: FanCard[];
  /** The point the connectors leave from (the path's node on the terminal's edge). */
  origin: [number, number];
  /** Frame each card leaves the stack (same order as `cards`). Lines draw from the same frame. */
  fanAt: number[];
  /** Frames a card travels (default 15). */
  travel?: number;
  /** The fan folds back (QA cards first, then the selected one) from this frame. */
  foldAt?: number;
  /** The card that is picked ("which to trust"): it lifts and keeps its connector; the others dim. */
  select?: { key: string; at: number };
};

const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: mix(a.w, b.w, t), h: mix(a.h, b.h, t) });

/** The card's node: on its left edge, at the title row. */
const nodeOf = (r: Rect): [number, number] => [r.x, r.y + Math.min(62, r.h * 0.28)];

export const PageCard: React.FC<{ card: FanCard; rect: Rect; elev: number; dim: number }> = ({ card, rect, elev, dim }) => {
  const level = Math.max(1, Math.min(4, Math.round(elev))) as 1 | 2 | 3 | 4;
  const bar = (w: string, h = 16, mt = 16): React.CSSProperties => ({ width: w, height: h, marginTop: mt, borderRadius: h / 2, background: DAY.trace });
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxSizing: "border-box",
        padding: "30px 32px",
        borderRadius: 26,
        background: DAY.surface,
        boxShadow: ELEV[level],
        fontFamily: FONT.sans,
        color: DAY.text,
        opacity: 1 - 0.55 * dim,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: 40 }}>
        <Icon name="page" size={32} color={DAY.textMuted} />
        {card.title ? (
          <span style={{ fontSize: 31, fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{card.title}</span>
        ) : (
          <span style={{ ...bar("62%", 22, 0) }} />
        )}
      </div>
      {card.id ? (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: "-0.01em", color: DAY.textMuted, padding: "3px 12px", borderRadius: 10, background: DAY.surfaceSunk }}>
            {card.id}
          </span>
        </div>
      ) : (
        <div style={{ ...bar("38%", 22, 18) }} />
      )}
      <div style={bar("92%", 16, 24)} />
      <div style={bar("78%")} />
      <div style={bar("64%")} />
    </div>
  );
};

/** A connector from the origin to a card's node, drawn on from `at`; nodes at both ends (R2 section 4). */
/** `strong` 0..1: the picked card's connector darkens to Fathom and thickens. */
const Connector: React.FC<{ from: [number, number]; to: [number, number]; draw: number; strong: number; fade: number }> = ({ from, to, draw, strong, fade }) => {
  if (draw <= 0.001) return null;
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = x1 + (x2 - x1) * 0.5;
  const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  const len = Math.max(1, getLength(d));
  const stroke = ink(0.55 + 0.45 * strong);
  return (
    <g opacity={1 - fade}>
      <path d={d} fill="none" stroke={stroke} strokeWidth={2.5 + 0.75 * strong} strokeLinecap="round" strokeDasharray={`${len * draw} ${len}`} />
      {draw > 0.97 ? <circle cx={x2} cy={y2} r={6.5} fill={DAY.surface} stroke={stroke} strokeWidth={2.5} /> : null}
    </g>
  );
};

/** Each card's rect and elevation at a frame (exported so the scene can aim the camera and the signal at a card). */
export function fanState(p: PageFanProps, frame: number) {
  const travel = p.travel ?? 15;
  const sel = p.select;
  const order = p.cards.map((c, i) => ({ c, i }));
  // fold: QA cards first (staggered 3 f), the selected card last, so it lands on top
  const foldIndex = (key: string) => {
    const others = order.filter(({ c }) => c.key !== sel?.key).map(({ c }) => c.key);
    const k = others.indexOf(key);
    return k >= 0 ? k : others.length;
  };
  return order.map(({ c, i }) => {
    const out = tween(frame, p.fanAt[i], p.fanAt[i] + travel, 0, 1, EASE.expoOut);
    const back = p.foldAt !== undefined ? tween(frame, p.foldAt + foldIndex(c.key) * 3, p.foldAt + foldIndex(c.key) * 3 + travel, 0, 1, EASE.expoInOut) : 0;
    const t = out * (1 - back);
    const rect = lerpRect(c.stack, c.fan, t);
    const picked = sel !== undefined && c.key === sel.key;
    const pick = sel ? tween(frame, sel.at, sel.at + 12, 0, 1, EASE.expoOut) : 0;
    // lift while travelling (1 -> 2), the picked card goes to 3 once chosen
    const elev = 1 + Math.sin(Math.PI * Math.min(1, out)) * 0.6 + t * 0.6 + (picked ? pick * 1.2 : 0);
    const dim = !picked && sel ? pick * (1 - back) : 0;
    // the line draws as the card leaves, and retracts as it folds back (the picked card keeps it)
    const draw = tween(frame, p.fanAt[i] + 1, p.fanAt[i] + travel, 0, 1, EASE.expoOut) * (picked ? 1 : 1 - back);
    return { card: c, rect, elev, dim, draw, picked, pick: picked ? pick : 0, z: t > 0.5 && !picked ? c.z + 10 : picked && pick > 0 ? 100 : c.z };
  });
}

/** The cards (paint them BEHIND the terminal: the stack waits under the slab, the page it answers). */
export const PageFan: React.FC<PageFanProps> = (props) => {
  const frame = useCurrentFrame();
  const st = fanState(props, frame);
  return (
    <>
      {[...st]
        .sort((a, b) => a.z - b.z)
        .map((s) => (
          <PageCard key={s.card.key} card={s.card} rect={s.rect} elev={s.elev} dim={s.dim} />
        ))}
    </>
  );
};

/**
 * The connectors (paint them ABOVE the terminal). `path` underlines the path literal inside the terminal (x0 to x1 at
 * baseline y, Night link, drawn on from `path.at`); the line runs on to `origin` on the slab's edge, where it forks to
 * the cards. Everything retracts as the fan folds.
 */
export const PageFanLines: React.FC<PageFanProps & { path?: { x0: number; x1: number; y: number; at: number; stubFrom?: number } }> = (props) => {
  const frame = useCurrentFrame();
  const st = fanState(props, frame);
  const pickFade = props.select && props.foldAt !== undefined ? tween(frame, props.foldAt + 2, props.foldAt + 8, 0, 1, EASE.standard) : 0;
  const [ox, oy] = props.origin;
  const pa = props.path;
  const under = pa ? tween(frame, pa.at, pa.at + 8, 0, 1, EASE.expoOut) : 0;
  const stub = pa ? tween(frame, pa.at + 5, pa.at + 11, 0, 1, EASE.expoOut) : 0;
  // the underline and the stub go as the fold reels the runbook in (before the screen clears for the next call)
  const out = props.foldAt !== undefined ? tween(frame, props.foldAt + 2, props.foldAt + 8, 0, 1, EASE.standard) : 0;
  const any = st.some((s) => s.draw > 0.001);
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      {pa && under > 0.001 && out < 1 ? (
        <g opacity={1 - out}>
          <line x1={pa.x0} y1={pa.y} x2={pa.x0 + (pa.x1 - pa.x0) * under} y2={pa.y} stroke={NIGHT.link} strokeWidth={3.5} strokeLinecap="round" />
          {stub > 0.001 ? (
            <line
              x1={pa.stubFrom ?? pa.x1}
              y1={pa.y}
              x2={(pa.stubFrom ?? pa.x1) + (ox - (pa.stubFrom ?? pa.x1)) * stub}
              y2={oy}
              stroke={NIGHT.link}
              strokeOpacity={0.6}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ) : null}
        </g>
      ) : null}
      {st.map((s) => (
        <Connector key={s.card.key} from={props.origin} to={nodeOf(s.rect)} draw={s.draw} strong={s.pick} fade={s.picked ? pickFade : s.dim} />
      ))}
      {(any || stub > 0.5) && out < 1 ? <circle cx={ox} cy={oy} r={7.5} fill={DAY.surface} stroke={DAY.text} strokeWidth={2.5} opacity={1 - out} /> : null}
    </svg>
  );
};
