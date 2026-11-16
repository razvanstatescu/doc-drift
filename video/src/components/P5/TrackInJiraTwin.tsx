import React from "react";
import { Icon } from "../../brand/icons";
import { DAY, ELEV, FONT, type Rect } from "../../v4/look";
import { AppTile, Button, H4, Muted, StateBadge } from "../P4/ui";

/**
 * TrackInJiraTwin: ADR-015's review panel, cut down to its header and the "Track in Jira" section (D35), from
 * captures p5-track-section and p5-track-created and the copy file (jiraTask, jiraTaskHelp, createJiraTask,
 * jiraCreated, jiraCreatedBody; the body's "PAY-24 tracks this change." is the real result). The real flow has a
 * form between the two clicks (Project, Summary, Create task); the twin shortens it to the button and the result,
 * and R22 proves the result.
 *
 * Props: `press`/`busy` on Create Jira task, `created` 0..1 (the success message replaces the button), `badgeGlow`
 * (the header badge is the shot's one amber).
 */

export const TRACK = {
  title: "ADR-015: Active-passive multi-region database",
  why: "PAY-18 moved to Done, and this page is anchored to it.",
  section: "Track in Jira",
  help: "Creates a Jira task as you, with the changes and sections to re-read. Closing it does not mark the page Verified.",
  button: "Create Jira task",
  created: "Jira task created",
  key: "PAY-24",
  body: " tracks this change. When the page is up to date, open it and click Mark verified.",
  dismiss: "Dismiss",
  snooze: "Snooze 7 days",
  markVerified: "Mark verified",
} as const;

export const TRACK_UI = {
  width: 700,
  height: 412,
  /** The Create Jira task button (cursor target). */
  button: { x: 28, y: 214, w: 152, h: 36 },
  /** The created message (morph source for R22). */
  notice: { x: 28, y: 196, w: 644, h: 120 },
  /** The header badge. */
  badge: { x: 470, y: 22, w: 130, h: 24 },
} as const;

export const trackRect = (key: "button" | "notice" | "badge", x: number, y: number, k: number): Rect => {
  const r = TRACK_UI[key];
  return { x: x + r.x * k, y: y + r.y * k, w: r.w * k, h: r.h * k };
};

export const TrackInJiraTwin: React.FC<{
  k?: number;
  press?: number;
  busy?: number;
  created?: number;
  badgeGlow?: number;
  style?: React.CSSProperties;
}> = ({ k = 1.7, press = 0, busy = 0, created = 0, badgeGlow = 1, style }) => {
  const u = (n: number) => n * k;
  const c = Math.max(0, Math.min(1, created));
  return (
    <div
      style={{
        position: "relative",
        width: u(TRACK_UI.width),
        height: u(TRACK_UI.height),
        boxSizing: "border-box",
        borderRadius: u(22),
        background: DAY.surface,
        boxShadow: ELEV[3],
        fontFamily: FONT.sans,
        color: DAY.text,
        ...style,
      }}
    >
      {/* header: the page, its state */}
      <div style={{ position: "absolute", left: u(28), right: u(28), top: u(16), height: u(36), display: "flex", alignItems: "center", gap: u(12) }}>
        <AppTile size={u(28)} />
        <span style={{ fontSize: u(18), lineHeight: 1, fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{TRACK.title}</span>
        <StateBadge k={k} state="possibly_stale" glow={badgeGlow} />
      </div>
      <div style={{ position: "absolute", left: u(28), top: u(62), fontSize: u(15), lineHeight: `${u(22)}px`, color: DAY.text, whiteSpace: "nowrap" }}>
        {TRACK.why}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: u(100), height: Math.max(1.5, u(1)), background: DAY.line }} />
      {/* Track in Jira */}
      <div style={{ position: "absolute", left: u(28), right: u(28), top: u(118) }}>
        <H4 k={k}>{TRACK.section}</H4>
        <Muted k={k} size={12.5} style={{ marginTop: u(6), maxWidth: u(600) }}>
          {TRACK.help}
        </Muted>
      </div>
      <div style={{ position: "absolute", left: u(28), right: u(28), top: u(196), height: u(120) }}>
        {c < 1 ? (
          <div style={{ position: "absolute", left: 0, top: u(18), opacity: 1 - c, transform: `translateY(${-u(8) * c}px)` }}>
            <Button k={k} press={press} busy={busy}>
              {TRACK.button}
            </Button>
          </div>
        ) : null}
        {c > 0 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              gap: u(12),
              padding: `${u(15)}px ${u(16)}px`,
              borderRadius: u(12),
              background: DAY.verifiedTint,
              opacity: c,
              transform: `translateY(${u(10) * (1 - c)}px) scale(${0.98 + 0.02 * c})`,
              transformOrigin: "0% 50%",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                flex: "none",
                display: "grid",
                placeItems: "center",
                width: u(20),
                height: u(20),
                marginTop: u(1),
                borderRadius: "50%",
                background: DAY.verified,
              }}
            >
              <Icon name="check" size={u(14)} color={DAY.surface} />
            </span>
            <div style={{ display: "grid", gap: u(7) }}>
              <div style={{ fontSize: u(16), lineHeight: `${u(21)}px`, fontWeight: 600 }}>{TRACK.created}</div>
              <div style={{ fontSize: u(15), lineHeight: `${u(22)}px` }}>
                <span style={{ color: DAY.link, fontWeight: 600 }}>{TRACK.key}</span>
                {TRACK.body}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: u(334), height: Math.max(1.5, u(1)), background: DAY.line }} />
      <div style={{ position: "absolute", left: u(28), top: u(350), display: "flex", gap: u(8) }}>
        <Button k={k}>{TRACK.dismiss}</Button>
        <Button k={k}>{TRACK.snooze}</Button>
        <Button k={k} kind="primary">
          {TRACK.markVerified}
        </Button>
      </div>
    </div>
  );
};
