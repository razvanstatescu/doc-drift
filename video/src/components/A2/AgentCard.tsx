import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../brand/icons";
import { EASE, tween } from "../../lib/time";
import { DAY, elevAt, FONT } from "../../v4/look";

/**
 * V09's two readers (R3 section 5): "Drift Reviewer · Rovo agent" and "Coding agent · MCP", plain cards that name the
 * product in words (no product marks, no Atlassian blue), each printing the same `"status": "possibly_stale"` on
 * "told". The status stays in the text colour: the byline badge is the shot's one amber (L4).
 *
 * Sizes are film px. The card arrives by lifting (M3) at `at`; `print` types the status line in 8 frames.
 */

export const STATUS_KEY = '"status": ';
export const STATUS_VALUE = '"possibly_stale"';

export const AGENT_CARD = { w: 572, padX: 34, padY: 30, head: 42, gap: 20, status: 32, statusLine: 44, radius: 30 } as const;
export const agentCardHeight = () => AGENT_CARD.padY * 2 + AGENT_CARD.head + AGENT_CARD.gap * 2 + 2 + AGENT_CARD.statusLine;

export const AgentCard: React.FC<{
  icon: IconName;
  name: string;
  kind: string;
  x: number;
  y: number;
  at: number;
  print: number;
  /** Extra vertical offset (px) that eases to 0 at `snap` (the two lines snap to one baseline on "same"). */
  offset?: number;
  snap?: number;
}> = ({ icon, name, kind, x, y, at, print, offset = 0, snap }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const up = tween(frame, at, at + 14, 0, 1, EASE.expoOut);
  const fade = tween(frame, at, at + 3, 0, 1, EASE.linear);
  const dy = snap !== undefined ? offset * (1 - tween(frame, snap, snap + 7, 0, 1, EASE.expoOut)) : offset;
  const full = STATUS_KEY + STATUS_VALUE;
  const n = Math.max(0, Math.min(full.length, Math.round(tween(frame, print, print + 8, 0, full.length, EASE.linear))));
  const keyShown = full.slice(0, Math.min(n, STATUS_KEY.length));
  const valShown = n > STATUS_KEY.length ? full.slice(STATUS_KEY.length, n) : "";
  const c = AGENT_CARD;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + dy + (1 - up) * 26,
        width: c.w,
        boxSizing: "border-box",
        padding: `${c.padY}px ${c.padX}px`,
        borderRadius: c.radius,
        background: DAY.surface,
        boxShadow: elevAt(1 + 2 * up),
        opacity: fade < 1 ? fade : undefined,
        transform: `scale(${0.975 + 0.025 * up})`,
        transformOrigin: "50% 100%",
        fontFamily: FONT.sans,
        color: DAY.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: c.head, whiteSpace: "nowrap" }}>
        <Icon name={icon} size={36} color={DAY.textMuted} />
        <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em" }}>{name}</span>
        <span style={{ fontSize: 32, fontWeight: 500, color: DAY.textMuted }}>· {kind}</span>
      </div>
      <div style={{ height: 2, background: DAY.line, margin: `${c.gap}px 0` }} />
      <div style={{ height: c.statusLine, display: "flex", alignItems: "center", fontFamily: FONT.mono, fontSize: c.status, letterSpacing: "-0.01em", whiteSpace: "pre" }}>
        <span style={{ color: DAY.textMuted }}>{keyShown}</span>
        <span style={{ color: DAY.text, fontWeight: 500 }}>{valShown}</span>
        {n > 0 && n < full.length ? <span style={{ display: "inline-block", width: 3, height: 30, background: DAY.text, marginLeft: 2 }} /> : null}
      </div>
    </div>
  );
};
