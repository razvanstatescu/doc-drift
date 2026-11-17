import React from "react";
import { Icon, type IconName } from "../../../brand/icons";
import { EASE } from "../../../lib/time";
import { amber, BRAND, DAY, ELEV, FONT, ink, type Rect } from "../../../v4/look";

/**
 * JIRA's crafted pieces (v5 round 2; nothing here draws on a real capture):
 *   Pay24Card   the Jira task the flag became, big: "PAY-24" with "tracks this change." (the real result's words)
 *   SpaceDash   the space's drift dashboard as a crafted twin, copied from v4's DashboardTwin and simplified (a twin may
 *               simplify, never add): the KPI cards (they drop flat and count up from 0 to the real values) and the rows
 *               with their state, page and since; no space key, no lead line, no owner column. The drift's amber is
 *               one band under the State column ("every flagged page"), crafted, never on a real capture.
 */

// ---------------------------------------------------------------------------------------------------------------------
// PAY-24
// ---------------------------------------------------------------------------------------------------------------------

export const PAY24 = { w: 600, h: 230 } as const;

/** The created Jira task (PAY-24), named in words like the PAY-18 card (no Jira marks). */
export const Pay24Card: React.FC<{ k?: number }> = ({ k = 1 }) => {
  const u = (n: number) => n * k;
  return (
    <div
      style={{
        position: "relative",
        width: u(PAY24.w),
        height: u(PAY24.h),
        boxSizing: "border-box",
        padding: `${u(28)}px ${u(32)}px`,
        borderRadius: u(24),
        background: DAY.surface,
        boxShadow: ELEV[3],
        fontFamily: FONT.sans,
        color: DAY.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: u(10), fontSize: u(24), lineHeight: 1, fontWeight: 500, color: DAY.textMuted, whiteSpace: "nowrap" }}>
        <Icon name="ticket" size={u(26)} color={DAY.textMuted} />
        <span style={{ fontWeight: 600, color: DAY.text }}>Jira</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>Payments</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>Task</span>
      </div>
      <div style={{ marginTop: u(22), fontFamily: FONT.mono, fontSize: u(76), lineHeight: 1, fontWeight: 500, letterSpacing: "-0.02em", color: DAY.link }}>PAY-24</div>
      <div style={{ marginTop: u(16), fontSize: u(26), lineHeight: 1, color: DAY.text, whiteSpace: "nowrap" }}>tracks this change.</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The space's drift dashboard
// ---------------------------------------------------------------------------------------------------------------------

const KPIS = [
  { label: "Pages anchored", value: 18, tail: " of 24", sub: "75% of the space", icon: undefined as IconName | undefined },
  { label: "Possibly stale", value: 6, tail: "", sub: "6 pages", icon: "alert" as IconName },
  { label: "Stale", value: 0, tail: "", sub: "0 pages", icon: "clock" as IconName },
] as const;

/** The six rows of p5-dashboard, in the capture's order. */
export const ROWS = [
  { page: "Scale payment workers", since: "Yesterday" },
  { page: "Refunds API guide", since: "Yesterday" },
  { page: "Payments codebase tour", since: "Yesterday" },
  { page: "Payments local development setup", since: "Yesterday" },
  { page: "ADR-015: Active-passive multi-region database", since: "Just now" },
  { page: "Payments API service overview", since: "Yesterday" },
] as const;

/** Layout in UI px. */
export const DASH = {
  width: 980,
  height: 560,
  pad: 36,
  kpi: { y: 36, h: 118, gap: 16 },
  heading: 196,
  table: 236,
  head: 36,
  rowH: 44,
  /** Column x from the table's left: Page, State, Since. */
  cols: [0, 540, 780],
  states: { x: 540 - 12, w: 210 },
} as const;

/** Stage rects (film px) of the rows block and the State column, for a dashboard at (x, y) with scale k. */
export const dashRects = (x: number, y: number, k: number) => {
  const top = y + (DASH.table + DASH.head) * k;
  const left = x + DASH.pad * k;
  return {
    kpis: { x: left, y: y + DASH.kpi.y * k, w: (DASH.width - 2 * DASH.pad) * k, h: DASH.kpi.h * k } as Rect,
    rows: { x: left, y: top, w: (DASH.width - 2 * DASH.pad) * k, h: 6 * DASH.rowH * k } as Rect,
    states: { x: left + DASH.states.x * k, y: top - 8 * k, w: DASH.states.w * k, h: (6 * DASH.rowH + 16) * k } as Rect,
  };
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const CountUp: React.FC<{ value: number; p: number }> = ({ value, p }) => {
  if (value === 0) return <span style={{ fontVariantNumeric: "tabular-nums" }}>0</span>;
  return <span style={{ fontVariantNumeric: "tabular-nums", display: "inline-block", minWidth: `${String(value).length * 0.62}em` }}>{Math.round(value * EASE.expoOut(clamp01(p)))}</span>;
};

const Kpi: React.FC<{ k: number; i: number; drop: number; roll: number; w: number }> = ({ k, i, drop, roll, w }) => {
  const kp = KPIS[i];
  const d = EASE.expoOut(clamp01(drop));
  return (
    <div
      style={{
        width: w,
        height: DASH.kpi.h * k,
        boxSizing: "border-box",
        padding: `${16 * k}px ${18 * k}px`,
        borderRadius: 14 * k,
        background: DAY.surface,
        boxShadow:
          d < 1 ? `inset 0 0 0 ${1.25 * k}px ${DAY.line}, 0 ${(1 - d) * 26 * k}px ${(1 - d) * 40 * k}px ${ink(0.12 * (1 - d))}` : `inset 0 0 0 ${1.25 * k}px ${DAY.line}`,
        transform: d < 1 ? `perspective(${1400 * k}px) translateY(${-(1 - d) * 46 * k}px) rotateX(${(1 - d) * 38}deg)` : undefined,
        transformOrigin: "50% 100%",
        opacity: Math.min(1, drop * 4),
        fontFamily: FONT.sans,
        color: DAY.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 * k, fontSize: 14 * k, lineHeight: 1, color: DAY.textMuted, whiteSpace: "nowrap" }}>
        {kp.icon ? <Icon name={kp.icon} size={16 * k} color={DAY.textMuted} /> : null}
        {kp.label}
      </div>
      <div style={{ marginTop: 12 * k, fontSize: 34 * k, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
        <CountUp value={kp.value} p={roll} />
        {kp.tail ? <span style={{ whiteSpace: "pre" }}>{kp.tail}</span> : null}
      </div>
      <div style={{ marginTop: 12 * k, fontSize: 13.5 * k, lineHeight: 1, color: DAY.textMuted, whiteSpace: "nowrap" }}>{kp.sub}</div>
    </div>
  );
};

const State: React.FC<{ k: number }> = ({ k }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6 * k,
      height: 26 * k,
      padding: `0 ${9 * k}px 0 ${7 * k}px`,
      borderRadius: 8 * k,
      background: DAY.surfaceSunk,
      color: DAY.text,
      fontSize: 14 * k,
      fontWeight: 600,
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}
  >
    <Icon name="slip" size={15 * k} color={DAY.text} />
    Possibly stale
  </span>
);

/**
 * The dashboard. `kpiDrop[i]`/`kpiRoll[i]` 0..1 per card, `rows` 0..6 (rows set in one after another), `band` 0..1 (the
 * drift's amber band sweeps down the State column), `bandOut` 0..1 (it leaves).
 */
export const SpaceDash: React.FC<{ k?: number; kpiDrop?: number[]; kpiRoll?: number[]; rows?: number; band?: number; bandOut?: number }> = ({
  k = 1.2,
  kpiDrop = [1, 1, 1],
  kpiRoll = [1, 1, 1],
  rows = 6,
  band = 0,
  bandOut = 0,
}) => {
  const u = (n: number) => n * k;
  const kw = (DASH.width - 2 * DASH.pad - 2 * DASH.kpi.gap) / 3;
  const b = clamp01(band) * (1 - clamp01(bandOut));
  return (
    <div
      style={{
        position: "relative",
        width: u(DASH.width),
        height: u(DASH.height),
        boxSizing: "border-box",
        borderRadius: u(24),
        background: DAY.surface,
        boxShadow: ELEV[3],
        fontFamily: FONT.sans,
        color: DAY.text,
      }}
    >
      <div style={{ position: "absolute", left: u(DASH.pad), top: u(DASH.kpi.y), display: "flex", gap: u(DASH.kpi.gap) }}>
        {[0, 1, 2].map((i) => (
          <Kpi key={i} k={k} i={i} drop={kpiDrop[i] ?? 1} roll={kpiRoll[i] ?? 1} w={u(kw)} />
        ))}
      </div>
      <div style={{ position: "absolute", left: u(DASH.pad), top: u(DASH.heading), fontSize: u(22), lineHeight: 1, fontWeight: 600, letterSpacing: "-0.01em" }}>Pages with drift</div>
      <div style={{ position: "absolute", left: u(DASH.pad), right: u(DASH.pad), top: u(DASH.table) }}>
        {/* the drift's amber: one band under the State column, sweeping down (crafted; under the words) */}
        {b > 0.001 ? (
          <div
            style={{
              position: "absolute",
              left: u(DASH.states.x),
              top: u(DASH.head - 8),
              width: u(DASH.states.w),
              height: u(6 * DASH.rowH + 16),
              borderRadius: u(14),
              background: BRAND.beacon,
              boxShadow: `0 0 ${u(30)}px ${amber(0.45 * b)}`,
              clipPath: `inset(0 0 ${((1 - b) * 100).toFixed(1)}% 0 round ${u(14)}px)`,
            }}
          />
        ) : null}
        <div style={{ position: "relative", height: u(DASH.head), borderBottom: `${Math.max(2, u(1.5))}px solid ${DAY.line}`, fontSize: u(14), fontWeight: 600, color: DAY.textMuted }}>
          {["Page", "State", "Since"].map((col, i) => (
            <div key={col} style={{ position: "absolute", left: u(DASH.cols[i]), top: u(10), whiteSpace: "nowrap" }}>
              {col}
            </div>
          ))}
        </div>
        <div style={{ fontSize: u(17), color: DAY.text }}>
          {ROWS.map((r, i) => {
            const s = clamp01(rows - i);
            const e = EASE.expoOut(s);
            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  height: u(DASH.rowH),
                  opacity: Math.min(1, s * 2.5),
                  transform: `translateY(${((1 - e) * 14 * k).toFixed(2)}px)`,
                  borderBottom: `${Math.max(1.5, u(1))}px solid ${DAY.line}`,
                }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, height: u(DASH.rowH), display: "flex", alignItems: "center", color: DAY.link, fontWeight: 500, whiteSpace: "nowrap" }}>{r.page}</div>
                <div style={{ position: "absolute", left: u(DASH.cols[1]), top: 0, height: u(DASH.rowH), display: "flex", alignItems: "center" }}>
                  <State k={k} />
                </div>
                <div style={{ position: "absolute", left: u(DASH.cols[2]), top: 0, height: u(DASH.rowH), display: "flex", alignItems: "center", whiteSpace: "nowrap", fontWeight: r.since === "Just now" ? 600 : 400 }}>
                  {r.since}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
