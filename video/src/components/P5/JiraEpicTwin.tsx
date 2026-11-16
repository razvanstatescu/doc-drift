import React from "react";
import { Icon } from "../../brand/icons";
import { DAY, ELEV, FONT, type Elev, type Rect } from "../../v4/look";

/**
 * JiraEpicTwin: the epic PAY-18 as a plain card that names Jira in words (no Jira marks, no Atlassian blue; V4.md
 * honesty list). Real values only (captures p5-jira-before, p5-jira-done): "PAY-18", "Multi-region active-passive
 * database", the Payments space, status To Do, then Done (the PAY workflow has no Won't Do).
 *
 * `done` 0..1 flips the status pill: "To Do" rolls up and out, "Done" rises in with its check.
 */

export const JIRA = {
  product: "Jira",
  space: "Payments",
  key: "PAY-18",
  kind: "Epic",
  title: "Multi-region active-passive database",
  todo: "To Do",
  done: "Done",
  statusLabel: "Status",
} as const;

export const JIRA_UI = {
  width: 560,
  height: 226,
  /** The status pill (for the cursor and the pulse's start). */
  status: { x: 28, y: 170, w: 120, h: 34 },
  /** The node on the card's right edge where the anchor line leaves. */
  node: { x: 560, y: 118 },
  /** The key and title row. */
  title: { x: 28, y: 64, w: 504, h: 82 },
} as const;

export const jiraRect = (key: "status" | "title", x: number, y: number, k: number): Rect => {
  const r = JIRA_UI[key];
  return { x: x + r.x * k, y: y + r.y * k, w: r.w * k, h: r.h * k };
};

export const JiraEpicTwin: React.FC<{ k?: number; done?: number; elev?: Elev; style?: React.CSSProperties }> = ({ k = 1.8, done = 0, elev = 3, style }) => {
  const u = (n: number) => n * k;
  const d = Math.max(0, Math.min(1, done));
  return (
    <div
      style={{
        position: "relative",
        width: u(JIRA_UI.width),
        height: u(JIRA_UI.height),
        boxSizing: "border-box",
        borderRadius: u(20),
        background: DAY.surface,
        boxShadow: ELEV[elev],
        fontFamily: FONT.sans,
        color: DAY.text,
        ...style,
      }}
    >
      {/* product named in words, the space, the issue type */}
      <div
        style={{
          position: "absolute",
          left: u(28),
          top: u(24),
          display: "flex",
          alignItems: "center",
          gap: u(8),
          fontSize: u(18.5),
          lineHeight: 1,
          fontWeight: 500,
          color: DAY.textMuted,
          whiteSpace: "nowrap",
        }}
      >
        <Icon name="ticket" size={u(20)} color={DAY.textMuted} />
        <span style={{ fontWeight: 600, color: DAY.text }}>{JIRA.product}</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>{JIRA.space}</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>{JIRA.kind}</span>
      </div>
      <div style={{ position: "absolute", left: u(28), top: u(64), display: "grid", gap: u(8) }}>
        <span style={{ fontFamily: FONT.mono, fontSize: u(18.5), lineHeight: 1, color: DAY.textMuted, letterSpacing: "-0.01em" }}>{JIRA.key}</span>
        <span style={{ fontSize: u(23), lineHeight: `${u(30)}px`, fontWeight: 600, letterSpacing: "-0.012em", whiteSpace: "nowrap" }}>{JIRA.title}</span>
      </div>
      <div style={{ position: "absolute", left: u(28), right: u(28), top: u(154), height: Math.max(1.5, u(1)), background: DAY.line }} />
      <div style={{ position: "absolute", left: u(28), top: u(170), display: "flex", alignItems: "center", gap: u(14) }}>
        <span style={{ display: "inline-grid", height: u(34), overflow: "hidden", borderRadius: u(9) }}>
          {d < 1 ? (
            <span
              style={{
                gridArea: "1 / 1",
                display: "inline-flex",
                alignItems: "center",
                gap: u(6),
                padding: `0 ${u(13)}px`,
                background: DAY.surfaceSunk,
                color: DAY.text,
                fontSize: u(14.5),
                fontWeight: 600,
                lineHeight: 1,
                transform: `translateY(${-100 * Math.min(1, d * 1.6)}%)`,
              }}
            >
              {JIRA.todo}
            </span>
          ) : null}
          {d > 0 ? (
            <span
              style={{
                gridArea: "1 / 1",
                display: "inline-flex",
                alignItems: "center",
                gap: u(6),
                padding: `0 ${u(13)}px`,
                background: DAY.verifiedTint,
                color: DAY.verified,
                fontSize: u(14.5),
                fontWeight: 600,
                lineHeight: 1,
                transform: `translateY(${100 * (1 - Math.min(1, Math.max(0, d * 1.6 - 0.6)))}%)`,
              }}
            >
              <Icon name="check" size={u(14)} color={DAY.verified} />
              {JIRA.done}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
};
