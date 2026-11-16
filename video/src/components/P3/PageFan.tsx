import React from "react";
import { getLength } from "@remotion/paths";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { EASE, tween } from "../../lib/time";
import { DAY, ELEV, elevAt, FONT, ink, NIGHT, type Rect } from "../../v4/look";

/**
 * V18 "which pages cover a file": the page find-docs-for-path returned that the terminal answers, as a page card
 * tucked under the slab's edge (the slab overlaps the page it answers), plus the count in the tool's own words.
 *
 * Honesty (QA G-8): find-docs-for-path returned 3 pages; two are QA pages in a test space that are never named on
 * screen (R3 risk 9). So the film shows the runbook's card (title and pageId from toolOutput) and a chip quoting the
 * opening of the tool's guidance, "3 pages document this path", instead of anonymous skeleton cards. No card carries a
 * state colour: the terminal's "possibly_stale" is the shot's amber.
 */

/** The runbook's page card: page icon, title, pageId and trace lines for its body. `inset` leaves room on the left for
 * the slab's edge that overlaps it. */
export const PageCard: React.FC<{ rect: Rect; title: string; id: string; inset?: number; elev?: number }> = ({ rect, title, id, inset = 0, elev = 2 }) => {
  const bar = (wd: string, h = 16, mt = 16): React.CSSProperties => ({ width: wd, height: h, marginTop: mt, borderRadius: h / 2, background: DAY.trace });
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxSizing: "border-box",
        padding: `30px 32px 30px ${32 + inset}px`,
        borderRadius: 26,
        background: DAY.surface,
        boxShadow: elevAt(elev),
        fontFamily: FONT.sans,
        color: DAY.text,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: 40 }}>
        <Icon name="page" size={32} color={DAY.textMuted} />
        <span style={{ fontSize: 31, fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{title}</span>
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center" }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: "-0.01em", color: DAY.textMuted, padding: "3px 12px", borderRadius: 10, background: DAY.surfaceSunk }}>{id}</span>
      </div>
      <div style={bar("92%", 16, 24)} />
      <div style={bar("78%")} />
      <div style={bar("64%")} />
    </div>
  );
};

/** The count, quoted from the tool's guidance: a quiet chip that lifts in under the card. */
export const CountChip: React.FC<{ text: string; x: number; y: number; at: number }> = ({ text, x, y, at }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const t = tween(frame, at, at + 12, 0, 1, EASE.expoOut);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + (1 - t) * 18,
        opacity: Math.min(1, (frame - at + 1) / 3),
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        height: 52,
        padding: "0 20px 0 16px",
        borderRadius: 16,
        background: DAY.surface,
        boxShadow: elevAt(1 + t),
        fontFamily: FONT.sans,
        fontSize: 28,
        fontWeight: 500,
        color: DAY.textMuted,
        whiteSpace: "nowrap",
      }}
    >
      <Icon name="list" size={28} color={DAY.textMuted} />
      {text}
    </div>
  );
};

/**
 * The path, underlined inside the terminal (x0 to x1 at baseline y, Night link), a lighter stub to `origin` on the
 * slab's edge, and a connector from there to the card's node, drawn on from `at` and retracted from `out`.
 */
export const PathLink: React.FC<{ path: { x0: number; x1: number; y: number; stubFrom: number }; origin: [number, number]; node: [number, number]; at: number; linkAt: number; out: number }> = ({
  path,
  origin,
  node,
  at,
  linkAt,
  out,
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const under = tween(frame, at, at + 8, 0, 1, EASE.expoOut);
  const stub = tween(frame, at + 4, at + 10, 0, 1, EASE.expoOut);
  const link = tween(frame, linkAt, linkAt + 14, 0, 1, EASE.expoOut);
  const gone = tween(frame, out, out + 7, 0, 1, EASE.standard);
  if (gone >= 1) return null;
  const [ox, oy] = origin;
  const [nx, ny] = node;
  const mx = ox + (nx - ox) * 0.5;
  const d = `M ${ox} ${oy} C ${mx} ${oy}, ${mx} ${ny}, ${nx} ${ny}`;
  const len = Math.max(1, getLength(d));
  return (
    <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", opacity: 1 - gone }}>
      <line x1={path.x0} y1={path.y} x2={path.x0 + (path.x1 - path.x0) * under} y2={path.y} stroke={NIGHT.link} strokeWidth={3.5} strokeLinecap="round" />
      {stub > 0.001 ? (
        <line x1={path.stubFrom} y1={path.y} x2={path.stubFrom + (ox - path.stubFrom) * stub} y2={oy} stroke={NIGHT.link} strokeOpacity={0.6} strokeWidth={2.5} strokeLinecap="round" />
      ) : null}
      {link > 0.001 ? (
        <>
          <path d={d} fill="none" stroke={ink(0.85)} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${len * link} ${len}`} />
          {link > 0.97 ? <circle cx={nx} cy={ny} r={6.5} fill={DAY.surface} stroke={ink(0.85)} strokeWidth={2.5} /> : null}
        </>
      ) : null}
      {stub > 0.5 ? <circle cx={ox} cy={oy} r={7.5} fill={DAY.surface} stroke={DAY.text} strokeWidth={2.5} /> : null}
    </svg>
  );
};

/** ELEV re-exported for callers that place the card with a lift. */
export { ELEV };
