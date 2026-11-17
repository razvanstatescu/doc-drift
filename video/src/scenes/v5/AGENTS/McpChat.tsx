import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../../brand/icons";
import { EASE, tween } from "../../../lib/time";
import { amber, BRAND, ELEV_DARK, elevAt, FONT, NIGHT, type Rect } from "../../../v4/look";
import { textWidth } from "../../../v4/twins";
import { CALL, MCP_QUESTION, MCP_REPLY, TOLD } from "./data";

/**
 * The coding assistant (V5 section 8, round 3): the section's one dark object, a crafted card titled "Coding assistant"
 * with no product mark, shaped like a terminal session. It arrives holding the whole exchange: the question (mono, after
 * a prompt), the MCP call `doc-drift · check-page-freshness` (small), and, set off by a rule, what the assistant is told,
 * in plain words: "Told to the coding assistant:" over the tool's real output, its status label ("Possibly stale", the
 * shot's one amber) and its guidance clause. No JSON.
 */

export const CHAT = {
  w: 1160,
  title: 66,
  padX: 40,
  padY: 28,
  q: 28,
  qLh: 46,
  call: 24,
  callLh: 40,
  told: 24,
  toldLh: 36,
  reply: 40,
  replyLh: 54,
  reply2: 36,
  reply2Lh: 52,
  /** The output block's indent: two mono columns under the call, after its rule. */
  indent: 30,
} as const;

/** Layout of the card (card px). */
function layout() {
  const qY = CHAT.title + 1.5 + CHAT.padY;
  const callY = qY + CHAT.qLh + 4;
  const toldY = callY + CHAT.callLh + 10;
  const replyY = toldY + CHAT.toldLh;
  const reply2Y = replyY + CHAT.replyLh;
  const height = reply2Y + CHAT.reply2Lh + CHAT.padY;
  const statusW = textWidth(MCP_REPLY.status, { size: CHAT.reply, weight: 600 });
  return { qY, callY, toldY, replyY, reply2Y, height, statusW, blockX: CHAT.padX + CHAT.indent };
}
export const chatLayout = layout;

const PAD_A = 0.16 * CHAT.reply;
const BLOCK_H = CHAT.reply * 1.24;

/** The status words' amber block, card px (the carry cut lands the answer's words on it). */
export function chatStatusRect(): Rect {
  const L = layout();
  return { x: L.blockX - PAD_A, y: L.replyY + (CHAT.replyLh - BLOCK_H) / 2, w: L.statusW + 2 * PAD_A, h: BLOCK_H };
}

/** The call's words ("doc-drift · check-page-freshness"), card px. */
export function chatCallRect(): Rect {
  const L = layout();
  const x0 = CHAT.padX + 22;
  const w = textWidth(`${CALL.server} · ${CALL.tool}`, { size: CHAT.call, mono: true, tracking: -0.01 });
  return { x: x0, y: L.callY + (CHAT.callLh - CHAT.call * 1.1) / 2, w, h: CHAT.call * 1.1 };
}

export type McpChatProps = {
  x: number;
  y: number;
  /** The status's amber: fully on from this frame (the carry cut brings it in already lit). */
  amberAt: number;
};

export const McpChat: React.FC<McpChatProps> = ({ x, y, amberAt }) => {
  const frame = useCurrentFrame();
  const L = layout();
  const b = tween(frame, amberAt, amberAt + 1, 0, 1, EASE.linear);
  const blockW = L.statusW + 2 * PAD_A;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: CHAT.w, height: L.height }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 28,
          background: NIGHT.ground,
          boxShadow: `${ELEV_DARK[4]}, ${elevAt(2.4)}`,
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
        {/* the session: the question after a prompt */}
        <div style={{ position: "absolute", left: CHAT.padX, top: L.qY, height: CHAT.qLh, display: "flex", alignItems: "center", fontFamily: FONT.mono, fontSize: CHAT.q, letterSpacing: "-0.01em", whiteSpace: "pre" }}>
          <span style={{ color: NIGHT.textMuted }}>{"› "}</span>
          <span style={{ color: NIGHT.text }}>{MCP_QUESTION}</span>
        </div>
        {/* the MCP call, small */}
        <div style={{ position: "absolute", left: CHAT.padX, top: L.callY, height: CHAT.callLh, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.mono, fontSize: CHAT.call, letterSpacing: "-0.01em", whiteSpace: "pre" }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: NIGHT.link, flexShrink: 0 }} />
          <span style={{ color: NIGHT.link }}>{CALL.server}</span>
          <span style={{ color: NIGHT.textMuted }}>·</span>
          <span style={{ color: NIGHT.textMuted }}>{CALL.tool}</span>
        </div>
        {/* what the assistant is told: the tool's output, set off by a rule under the call */}
        <div style={{ position: "absolute", left: CHAT.padX + 6, top: L.toldY + 4, width: 2.5, height: L.reply2Y + CHAT.reply2Lh - L.toldY - 8, borderRadius: 2, background: NIGHT.line }} />
        <div style={{ position: "absolute", left: L.blockX, top: L.toldY, height: CHAT.toldLh, display: "flex", alignItems: "center", fontSize: CHAT.told, color: NIGHT.textMuted, whiteSpace: "pre" }}>{TOLD}</div>
        {b > 0.001 ? (
          <>
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: L.blockX - PAD_A - blockW * 0.3,
                top: L.replyY + (CHAT.replyLh - BLOCK_H) / 2 - BLOCK_H,
                width: blockW * 1.6,
                height: BLOCK_H * 3,
                borderRadius: "50%",
                background: `radial-gradient(closest-side, ${amber(0.22 * b)} 0%, ${amber(0.08 * b)} 60%, ${amber(0)} 100%)`,
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: L.blockX - PAD_A,
                top: L.replyY + (CHAT.replyLh - BLOCK_H) / 2,
                width: blockW,
                height: BLOCK_H,
                borderRadius: 8,
                background: BRAND.beacon,
                opacity: b,
                boxShadow: `0 0 0 1px ${amber(0.35 * b)}, 0 4px 18px ${amber(0.4 * b)}`,
              }}
            />
          </>
        ) : null}
        <div style={{ position: "absolute", left: L.blockX, top: L.replyY, height: CHAT.replyLh, display: "flex", alignItems: "center", fontSize: CHAT.reply, whiteSpace: "pre" }}>
          <span style={{ fontWeight: 600, color: b > 0.5 ? BRAND.fathom : NIGHT.text }}>{MCP_REPLY.status}</span>
          <span style={{ color: NIGHT.text }}>.</span>
        </div>
        <div style={{ position: "absolute", left: L.blockX, top: L.reply2Y, height: CHAT.reply2Lh, display: "flex", alignItems: "center", fontSize: CHAT.reply2, color: NIGHT.text, whiteSpace: "pre" }}>
          {MCP_REPLY.guidance}
        </div>
      </div>
    </div>
  );
};
