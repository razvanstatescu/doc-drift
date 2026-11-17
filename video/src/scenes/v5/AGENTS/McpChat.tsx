import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../../brand/icons";
import { EASE, tween } from "../../../lib/time";
import { amber, BRAND, ELEV_DARK, elevAt, FONT, NIGHT, type Rect } from "../../../v4/look";
import { textWidth } from "../../../v4/twins";
import { CALL, MCP_QUESTION, MCP_REPLY } from "./data";

/**
 * The coding assistant as a crafted chat card in plain words (V5 section 8): a dark card titled "Coding assistant"
 * with no product mark. It arrives with the question already asked; the MCP call shows small; the reply is the tool's
 * real output in plain words: its status label ("Possibly stale", the shot's one amber) and its guidance clause. No JSON.
 * Lines rise from behind their own baseline (the functional voice); the amber block sweeps behind the status.
 */

export const CHAT = {
  w: 1120,
  title: 66,
  padX: 40,
  padY: 30,
  q: 32,
  reply: 40,
  replyLh: 54,
  call: 23,
} as const;

const RISE = 12;

/** Layout of the card (card px). */
function layout() {
  const inner = CHAT.w - 2 * CHAT.padX;
  const bubbleW = textWidth(MCP_QUESTION, { size: CHAT.q }) + 2 * 26;
  const bubbleH = Math.round(CHAT.q * 1.4) + 26;
  const top = CHAT.title + 1.5 + CHAT.padY;
  const bubble: Rect = { x: CHAT.w - CHAT.padX - bubbleW, y: top, w: bubbleW, h: bubbleH };
  const callY = bubble.y + bubble.h + 22;
  const callH = 34;
  const replyY = callY + callH + 14;
  const statusW = textWidth(MCP_REPLY.status, { size: CHAT.reply, weight: 600 });
  const height = replyY + 2 * CHAT.replyLh + CHAT.padY - 4;
  return { inner, bubble, callY, callH, replyY, statusW, height };
}
export const chatLayout = layout;

/** The status words' amber block, card px (the carry cut lands the twin's amber words on it). */
export function chatStatusRect(): Rect {
  const L = layout();
  const padA = 0.16 * CHAT.reply;
  const blockH = CHAT.reply * 1.24;
  return { x: CHAT.padX - padA, y: L.replyY + (CHAT.replyLh - blockH) / 2, w: L.statusW + 2 * padA, h: blockH };
}

/** The call's words ("doc-drift · check-page-freshness"), card px. */
export function chatCallRect(): Rect {
  const L = layout();
  const w = 10 + 10 + textWidth(`${CALL.server} · ${CALL.tool}`, { size: CHAT.call, mono: true, tracking: -0.01 }) + 20;
  return { x: CHAT.padX + 20, y: L.callY + (L.callH - CHAT.call * 1.1) / 2, w: w - 20, h: CHAT.call * 1.1 };
}

/** A line rising from behind its own baseline; once up, it is drawn without the clip (so glows are never cut). */
const Rise: React.FC<{ at: number; style: React.CSSProperties; children: React.ReactNode }> = ({ at, style, children }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const t = tween(frame, at, at + RISE, 0, 1, EASE.expoOut);
  if (t >= 0.999) return <div style={{ position: "absolute", ...style }}>{children}</div>;
  return (
    <div style={{ position: "absolute", overflow: "hidden", ...style }}>
      <div style={{ transform: `translateY(${(1 - t) * 105}%)` }}>{children}</div>
    </div>
  );
};

export type McpChatProps = {
  x: number;
  y: number;
  /** The card lifts in (it arrives with the question asked). */
  enter: number;
  call: number;
  status: number;
  guidance: number;
};

export const McpChat: React.FC<McpChatProps> = ({ x, y, enter, call, status, guidance }) => {
  const frame = useCurrentFrame();
  const L = layout();
  const t = tween(frame, enter, enter + 14, 0, 1, EASE.expoOut);
  const level = 1 + 3 * t;
  // the status's amber block sweeps in over 9 frames, from its own left edge
  const b = tween(frame, status + 2, status + 11, 0, 1, EASE.expoOut);
  const padA = 0.16 * CHAT.reply;
  const blockW = L.statusW + 2 * padA;
  const blockH = CHAT.reply * 1.24;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: CHAT.w, height: L.height, transform: t < 1 ? `translateY(${(1 - t) * 26}px)` : undefined }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 28,
          background: NIGHT.ground,
          boxShadow: `${ELEV_DARK[Math.max(1, Math.min(4, Math.round(level))) as 1 | 2 | 3 | 4]}, ${elevAt(level * 0.6)}`,
          overflow: "hidden",
          fontFamily: FONT.sans,
        }}
      >
        {/* title bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            height: CHAT.title,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 34px",
            borderBottom: `1.5px solid ${NIGHT.line}`,
            fontSize: 30,
            fontWeight: 500,
            color: NIGHT.text,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="terminal" size={30} color={NIGHT.textMuted} />
          Coding assistant
        </div>
        {/* the question, already asked */}
        <div
          style={{
            position: "absolute",
            left: L.bubble.x,
            top: L.bubble.y,
            width: L.bubble.w,
            height: L.bubble.h,
            borderRadius: 20,
            background: NIGHT.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: CHAT.q,
            color: NIGHT.text,
            whiteSpace: "nowrap",
          }}
        >
          {MCP_QUESTION}
        </div>
        {/* the MCP call, small */}
        <Rise at={call} style={{ left: CHAT.padX, top: L.callY, height: L.callH }}>
          <div style={{ height: L.callH, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.mono, fontSize: CHAT.call, letterSpacing: "-0.01em", whiteSpace: "pre" }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: NIGHT.link, flexShrink: 0 }} />
            <span style={{ color: NIGHT.link }}>{CALL.server}</span>
            <span style={{ color: NIGHT.textMuted }}>·</span>
            <span style={{ color: NIGHT.textMuted }}>{CALL.tool}</span>
          </div>
        </Rise>
        {/* the reply, in the tool's own words: the status (the one amber), then the guidance */}
        {frame >= status ? (
          <>
            {b > 0.001 ? (
              <>
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: CHAT.padX - padA - blockW * 0.3,
                    top: L.replyY + (CHAT.replyLh - blockH) / 2 - blockH,
                    width: blockW * 1.6,
                    height: blockH * 3,
                    borderRadius: "50%",
                    background: `radial-gradient(closest-side, ${amber(0.22 * b)} 0%, ${amber(0.08 * b)} 60%, ${amber(0)} 100%)`,
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: CHAT.padX - padA,
                    top: L.replyY + (CHAT.replyLh - blockH) / 2,
                    width: blockW,
                    height: blockH,
                    borderRadius: 8,
                    background: BRAND.beacon,
                    clipPath: `inset(-40% ${(1 - b) * 100}% -40% 0 round 8px)`,
                    boxShadow: `0 0 0 1px ${amber(0.35 * b)}, 0 4px 18px ${amber(0.4 * b)}`,
                  }}
                />
              </>
            ) : null}
            <Rise at={status} style={{ left: CHAT.padX, top: L.replyY, height: CHAT.replyLh }}>
              <div style={{ height: CHAT.replyLh, display: "flex", alignItems: "center", fontSize: CHAT.reply, whiteSpace: "pre" }}>
                <span style={{ position: "relative", fontWeight: 600, color: NIGHT.text }}>
                  {MCP_REPLY.status}
                  {/* the words turn Fathom where the amber block has passed */}
                  <span
                    aria-hidden
                    style={{ position: "absolute", left: 0, top: 0, color: BRAND.fathom, clipPath: `inset(0 ${Math.max(0, L.statusW - (b * blockW - padA))}px 0 0)` }}
                  >
                    {MCP_REPLY.status}
                  </span>
                </span>
                <span style={{ color: NIGHT.text }}>.</span>
              </div>
            </Rise>
          </>
        ) : null}
        <Rise at={guidance} style={{ left: CHAT.padX, top: L.replyY + CHAT.replyLh, height: CHAT.replyLh }}>
          <div style={{ height: CHAT.replyLh, display: "flex", alignItems: "center", fontSize: CHAT.reply, color: NIGHT.text, whiteSpace: "pre" }}>{MCP_REPLY.guidance}</div>
        </Rise>
      </div>
    </div>
  );
};
