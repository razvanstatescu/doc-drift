import React from "react";
import { Badge } from "../../brand/Badge";
import { Icon, type IconName } from "../../brand/icons";
import { SLIP_UNIT } from "../../brand/tokens";
import { EASE } from "../../lib/time";
import { glowShadow } from "../../motion/slip";
import { amber, DAY, ELEV, FONT, ink, type Rect } from "../../v4/look";
import { Initials, Severity } from "../P4/ui";

/**
 * DashboardTwin: the space's Drift dashboard ("Drift in PLAT"), from capture p5-dashboard and the copy file
 * (dashboardTitle, dashboardLead, kpiAnchored, kpiPossiblyStale, kpiStale, kpiMedian, pagesWithDrift, rankedBy).
 * Values are the demo space's at capture time and the twin always carries "Sample data from the demo space" (R3 risk
 * 8): 18 of 24 anchored (75% of the space), 6 Possibly stale, 0 Stale, median time to verify Under 3 hours, and the
 * six drift rows in the capture's order (ADR-015 "Just now", the rest "Yesterday", all owned by Razvan Statescu).
 *
 * One amber per shot: ADR-015's row (the page the film just flagged) is the slipped one, its badge amber with trace
 * and bloom; the other rows keep their state word and icon in a quiet colour. The Action column is dropped.
 *
 * Animated by props: `kpiDrop[i]` 0..1 (a card falls flat from a tilt), `kpiRoll[i]` 0..1 (its digits roll and stop
 * on the real value), `rows` 0..6 (rows set in one after another), `slip` 0..1 (ADR-015's row out of line).
 */

export const DASH = {
  title: "Drift in PLAT",
  lead: "Agents are told not to trust Possibly stale and Stale pages until someone reviews them.",
  label: "Sample data from the demo space",
  pagesWithDrift: "Pages with drift",
  rankedBy: "Ranked by severity, then state and open changes.",
  kpis: [
    { label: "Pages anchored", value: "18", tail: " of 24", sub: "75% of the space", icon: undefined },
    { label: "Possibly stale", value: "6", tail: "", sub: "6 pages", icon: "alert" as IconName },
    { label: "Stale", value: "0", tail: "", sub: "0 pages", icon: "clock" as IconName },
    { label: "Median time to verify", value: "3", head: "Under ", tail: " hours", sub: "", icon: undefined },
  ],
  columns: ["Page", "State", "Severity", "Open changes", "Since", "Owner"],
  rows: [
    { page: "Scale payment workers", sev: "High" as const, open: 1, since: "Yesterday" },
    { page: "Refunds API guide", sev: "High" as const, open: 1, since: "Yesterday" },
    { page: "Payments codebase tour", sev: "High" as const, open: 1, since: "Yesterday" },
    { page: "Payments local development setup", sev: "High" as const, open: 1, since: "Yesterday" },
    { page: "ADR-015: Active-passive multi-region database", sev: "High" as const, open: 1, since: "Just now", drift: true },
    { page: "Payments API service overview", sev: "Medium" as const, open: 2, since: "Yesterday" },
  ],
  owner: "Razvan Statescu",
} as const;

/** Layout in UI px. */
export const DASH_UI = {
  width: 980,
  height: 640,
  pad: 36,
  title: { x: 36, y: 32 },
  kpiRow: { x: 36, y: 128, w: 908, h: 112 },
  kpiGap: 14,
  tableTop: 296,
  rowH: 42,
  /** Column x offsets from the table's left (UI px). */
  cols: [0, 322, 476, 566, 676, 764],
} as const;

export const dashRect = (key: "kpiRow" | "rows" | "title", x: number, y: number, k: number): Rect => {
  if (key === "kpiRow") {
    const r = DASH_UI.kpiRow;
    return { x: x + r.x * k, y: y + r.y * k, w: r.w * k, h: r.h * k };
  }
  if (key === "title") return { x: x + 36 * k, y: y + 28 * k, w: 600 * k, h: 72 * k };
  return { x: x + 36 * k, y: y + (DASH_UI.tableTop + 70) * k, w: 908 * k, h: 6 * DASH_UI.rowH * k };
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** One digit on a wheel: spins `turns` times and stops on `to` as p goes 0 to 1 (tabular figures). */
const Wheel: React.FC<{ to: number; p: number; turns?: number; h: number }> = ({ to, p, turns = 1, h }) => {
  const e = EASE.expoOut(clamp01(p));
  const pos = to + 10 * turns * (1 - e); // counts down onto the value
  const base = Math.floor(pos);
  const frac = pos - base;
  const digit = (n: number) => ((n % 10) + 10) % 10;
  return (
    <span style={{ position: "relative", display: "inline-block", height: h, overflow: "hidden", verticalAlign: "bottom", width: "0.62em" }}>
      {[0, 1].map((i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: h,
            lineHeight: `${h}px`,
            textAlign: "center",
            transform: `translateY(${(i - frac) * h * -1}px)`,
          }}
        >
          {digit(base + i)}
        </span>
      ))}
    </span>
  );
};

const RollNumber: React.FC<{ value: string; p: number; h: number }> = ({ value, p, h }) => (
  <span style={{ display: "inline-flex", fontVariantNumeric: "tabular-nums" }}>
    {value.split("").map((c, i) => (
      <Wheel key={i} to={Number(c)} p={p} turns={1 + (value.length - 1 - i)} h={h} />
    ))}
  </span>
);

const KpiCard: React.FC<{ k: number; i: number; drop: number; roll: number; w: number }> = ({ k, i, drop, roll, w }) => {
  const kp = DASH.kpis[i];
  const d = EASE.expoOut(clamp01(drop));
  const h = 30 * k;
  return (
    <div
      style={{
        width: w,
        height: DASH_UI.kpiRow.h * k,
        boxSizing: "border-box",
        padding: `${14 * k}px ${16 * k}px`,
        borderRadius: 12 * k,
        background: DAY.surface,
        boxShadow:
          d < 1
            ? `inset 0 0 0 ${1.25 * k}px ${DAY.line}, 0 ${(1 - d) * 26 * k}px ${(1 - d) * 40 * k}px ${ink(0.12 * (1 - d))}`
            : `inset 0 0 0 ${1.25 * k}px ${DAY.line}`,
        transform: d < 1 ? `perspective(${1400 * k}px) translateY(${-(1 - d) * 46 * k}px) rotateX(${(1 - d) * 38}deg)` : undefined,
        transformOrigin: "50% 100%",
        opacity: Math.min(1, drop * 4),
        fontFamily: FONT.sans,
        color: DAY.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 * k, fontSize: 12.5 * k, lineHeight: 1, color: DAY.textMuted, whiteSpace: "nowrap" }}>
        {kp.icon ? <Icon name={kp.icon} size={14 * k} color={DAY.textMuted} /> : null}
        {kp.label}
      </div>
      <div
        style={{
          marginTop: 9 * k,
          height: h,
          display: "flex",
          alignItems: "flex-end",
          fontSize: 26 * k,
          lineHeight: `${h}px`,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {"head" in kp && kp.head ? <span style={{ whiteSpace: "pre" }}>{kp.head}</span> : null}
        <RollNumber value={kp.value} p={roll} h={h} />
        {kp.tail ? <span style={{ whiteSpace: "pre" }}>{kp.tail}</span> : null}
      </div>
      {kp.sub ? <div style={{ marginTop: 10 * k, fontSize: 12 * k, lineHeight: 1, color: DAY.textMuted, whiteSpace: "nowrap" }}>{kp.sub}</div> : null}
    </div>
  );
};

/** A quiet state chip for rows that are not the shot's amber: the same word and icon, no beacon fill. */
const QuietState: React.FC<{ k: number }> = ({ k }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5 * k,
      height: 22 * k,
      padding: `0 ${8 * k}px 0 ${6 * k}px`,
      borderRadius: 7 * k,
      background: DAY.surfaceSunk,
      color: DAY.textMuted,
      fontSize: 12 * k,
      fontWeight: 500,
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}
  >
    <Icon name="slip" size={13 * k} color={DAY.textMuted} />
    Possibly stale
  </span>
);

const Row: React.FC<{ k: number; i: number; show: number; slip: number }> = ({ k, i, show, slip }) => {
  const r = DASH.rows[i];
  const s = clamp01(show);
  const e = EASE.expoOut(s);
  const drift = "drift" in r && r.drift;
  const c = DASH_UI.cols;
  const cell = (n: number, child: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ position: "absolute", left: c[n] * k, top: 0, height: DASH_UI.rowH * k, display: "flex", alignItems: "center", ...extra }}>{child}</div>
  );
  return (
    <div
      style={{
        position: "relative",
        height: DASH_UI.rowH * k,
        opacity: Math.min(1, s * 2.5),
        transform: `translateY(${(1 - e) * 14 * k}px)`,
        borderBottom: `${Math.max(1.5, 1 * k)}px solid ${DAY.line}`,
      }}
    >
      {cell(0, <span style={{ color: DAY.link, fontWeight: 500, whiteSpace: "nowrap" }}>{r.page}</span>)}
      {cell(
        1,
        drift ? (
          <span style={{ position: "relative", display: "inline-grid" }}>
            {slip > 0.01 ? <span style={{ gridArea: "1 / 1", borderRadius: 7 * k, background: DAY.trace, opacity: Math.min(1, slip / 0.25) }} /> : null}
            <span style={{ gridArea: "1 / 1", position: "relative", transform: `translateX(${slip * SLIP_UNIT * 100}%)` }}>
              {slip > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    left: "-30%",
                    right: "-30%",
                    top: "-80%",
                    bottom: "-80%",
                    borderRadius: "50%",
                    background: `radial-gradient(closest-side, ${amber(0.26 * slip)} 0%, ${amber(0.08 * slip)} 60%, transparent 100%)`,
                  }}
                />
              ) : null}
              <Badge
                state="possibly_stale"
                size={k * 0.79}
                glow={slip}
                theme="day"
                style={{ position: "relative", boxShadow: glowShadow(DAY, slip, k * 0.8) }}
              />
            </span>
          </span>
        ) : (
          <QuietState k={k} />
        ),
      )}
      {cell(2, <Severity k={k} level={r.sev} />)}
      {cell(3, <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.open}</span>)}
      {cell(4, <span style={{ whiteSpace: "nowrap", fontWeight: drift ? 600 : 400 }}>{r.since}</span>)}
      {cell(
        5,
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 * k, whiteSpace: "nowrap" }}>
          <Initials k={k} text="RS" size={22} />
          {DASH.owner}
        </span>,
      )}
    </div>
  );
};

export const DashboardTwin: React.FC<{
  k?: number;
  kpiDrop?: number[];
  kpiRoll?: number[];
  rows?: number;
  slip?: number;
  /** Show the honesty label (always true in the film; false only for a 1:1 comparison). */
  label?: boolean;
  style?: React.CSSProperties;
}> = ({ k = 1.5, kpiDrop = [1, 1, 1, 1], kpiRoll = [1, 1, 1, 1], rows = 6, slip = 0, label = true, style }) => {
  const u = (n: number) => n * k;
  const kw = (DASH_UI.kpiRow.w - 3 * DASH_UI.kpiGap) / 4;
  return (
    <div
      style={{
        position: "relative",
        width: u(DASH_UI.width),
        height: u(DASH_UI.height),
        boxSizing: "border-box",
        borderRadius: u(22),
        background: DAY.surface,
        boxShadow: ELEV[3],
        fontFamily: FONT.sans,
        color: DAY.text,
        ...style,
      }}
    >
      <div style={{ position: "absolute", left: u(36), top: u(32), fontSize: u(28), lineHeight: 1, fontWeight: 600, letterSpacing: "-0.015em" }}>
        {DASH.title}
      </div>
      <div style={{ position: "absolute", left: u(36), top: u(76), fontSize: u(14), lineHeight: `${u(20)}px`, color: DAY.text, whiteSpace: "nowrap" }}>
        {DASH.lead}
      </div>
      {label ? (
        <div
          style={{
            position: "absolute",
            right: u(32),
            top: u(26),
            display: "inline-flex",
            alignItems: "center",
            gap: u(7),
            height: u(28),
            padding: `0 ${u(12)}px`,
            borderRadius: u(14),
            background: DAY.surfaceSunk,
            color: DAY.textMuted,
            fontSize: u(13),
            fontWeight: 500,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="info" size={u(14)} color={DAY.textMuted} />
          {DASH.label}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: u(DASH_UI.kpiRow.x), top: u(DASH_UI.kpiRow.y), display: "flex", gap: u(DASH_UI.kpiGap) }}>
        {[0, 1, 2, 3].map((i) => (
          <KpiCard key={i} k={k} i={i} drop={kpiDrop[i] ?? 1} roll={kpiRoll[i] ?? 1} w={u(kw)} />
        ))}
      </div>
      <div style={{ position: "absolute", left: u(36), top: u(DASH_UI.tableTop - 30), fontSize: u(18), lineHeight: 1, fontWeight: 600 }}>
        {DASH.pagesWithDrift}
      </div>
      <div style={{ position: "absolute", left: u(36), top: u(DASH_UI.tableTop - 2), fontSize: u(12.5), lineHeight: 1, color: DAY.textMuted }}>
        {DASH.rankedBy}
      </div>
      <div style={{ position: "absolute", left: u(36), right: u(36), top: u(DASH_UI.tableTop + 26) }}>
        <div
          style={{
            position: "relative",
            height: u(34),
            borderBottom: `${Math.max(2, u(1.5))}px solid ${DAY.line}`,
            fontSize: u(12),
            fontWeight: 600,
            color: DAY.textMuted,
          }}
        >
          {DASH.columns.map((col, i) => (
            <div key={col} style={{ position: "absolute", left: u(DASH_UI.cols[i]), top: u(10), whiteSpace: "nowrap" }}>
              {col}
            </div>
          ))}
        </div>
        <div style={{ fontSize: u(13.5), color: DAY.text }}>
          {DASH.rows.map((_, i) => (
            <Row key={i} k={k} i={i} show={rows - i} slip={slip} />
          ))}
        </div>
      </div>
    </div>
  );
};
