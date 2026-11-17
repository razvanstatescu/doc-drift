import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon } from "../../../brand/icons";
import { EASE, tween } from "../../../lib/time";
import { amber, BRAND, ELEV_DARK, elevAt, FONT, NIGHT } from "../../../v4/look";
import { MONO_ADVANCE } from "../../../v4/twins/metrics";
import { CALL, MCP_QUESTION, OUTPUT_LINES } from "./data";

/**
 * The coding assistant as a dark slab (v4's TerminalTwin look: radius 28, a 66 px title bar over a 1.5 px divider,
 * Spline Sans Mono, keys in Night link, strings in Mist, punctuation muted), titled "Coding assistant" with no product
 * mark. It holds the question, the MCP call and exactly three lines of real output (toolOutput.checkFlaggedV2), each
 * rising from behind its own baseline (the functional voice). The first value, "possibly_stale", takes the shot's one
 * amber: a block sweeps behind it and its words turn Fathom where the block has passed.
 */

export const SLAB = { w: 1180, title: 66, padX: 36, padY: 30, size: 28, lh: 46, gap: 14 } as const;
const ADV = (MONO_ADVANCE - 0.01) * SLAB.size; // the mono advance with -0.01 em tracking
const RISE = 13;

export const slabHeight = () => SLAB.title + 1.5 + 2 * SLAB.padY + SLAB.lh * 5 + SLAB.gap;

/** A line rising from behind its own baseline; once up, it is drawn without the clip (so glows are never cut). */
const Rise: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
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

/** The amber block behind a mono span (cols from the line's left), swept left to right over 9 frames, with its bloom. */
function amberGeom(col: number, len: number) {
  const padX = 0.18 * SLAB.size;
  const h = SLAB.size * 1.3;
  return { padX, x: col * ADV - padX, w: len * ADV + 2 * padX, h, top: (SLAB.lh - h) / 2, textW: len * ADV };
}

const AmberBack: React.FC<{ at: number; col: number; len: number }> = ({ at, col, len }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const b = tween(frame, at, at + 9, 0, 1, EASE.expoOut);
  const { x, w, h, top } = amberGeom(col, len);
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: x - w * 0.3,
          top: top - h * 0.9,
          width: w * 1.6,
          height: h * 2.8,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${amber(0.22 * b)} 0%, ${amber(0.08 * b)} 60%, ${amber(0)} 100%)`,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: x,
          top,
          width: w,
          height: h,
          borderRadius: 7,
          background: BRAND.beacon,
          clipPath: `inset(-40% ${(1 - b) * 100}% -40% 0 round 7px)`,
          boxShadow: `0 0 0 1px ${amber(0.35 * b)}, 0 4px 18px ${amber(0.4 * b)}`,
        }}
      />
    </>
  );
};

/** The value's words in Fathom where the block has passed (drawn over the Mist words). */
const AmberFront: React.FC<{ at: number; col: number; len: number; text: string }> = ({ at, col, len, text }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const b = tween(frame, at, at + 9, 0, 1, EASE.expoOut);
  const { padX, w, textW } = amberGeom(col, len);
  const shown = Math.max(0, Math.min(textW, b * w - padX));
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: col * ADV,
        top: 0,
        height: SLAB.lh,
        lineHeight: `${SLAB.lh}px`,
        color: BRAND.fathom,
        whiteSpace: "pre",
        clipPath: `inset(0 ${textW - shown}px 0 0)`,
      }}
    >
      {text}
    </div>
  );
};

export type McpSlabProps = {
  x: number;
  y: number;
  /** Frames: the slab lifts in, the question, the call, the three output lines, the amber. */
  enter: number;
  question: number;
  call: number;
  out: readonly [number, number, number] | readonly number[];
  amberAt: number;
};

export const McpSlab: React.FC<McpSlabProps> = ({ x, y, enter, question, call, out, amberAt }) => {
  const frame = useCurrentFrame();
  const t = tween(frame, enter, enter + 14, 0, 1, EASE.expoOut);
  const level = 1 + 3 * t;
  const h = slabHeight();
  const bodyTop = SLAB.title + 1.5 + SLAB.padY;
  const lineTop = (i: number) => bodyTop + (i === 0 ? 0 : SLAB.gap) + i * SLAB.lh;
  const indent = 2; // output lines sit two columns in, under the call's words
  const amberCol = indent + `"${OUTPUT_LINES[0].key}"`.length + 2; // after `"status": `
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: SLAB.w,
        height: h,
        transform: t < 1 ? `translateY(${(1 - t) * 26}px)` : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 28,
          background: NIGHT.ground,
          boxShadow: `${ELEV_DARK[Math.max(1, Math.min(4, Math.round(level))) as 1 | 2 | 3 | 4]}, ${elevAt(level * 0.6)}`,
          overflow: "hidden",
        }}
      >
        {/* title bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            height: SLAB.title,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 32px",
            borderBottom: `1.5px solid ${NIGHT.line}`,
            fontFamily: FONT.sans,
            fontSize: 30,
            fontWeight: 500,
            color: NIGHT.text,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="terminal" size={30} color={NIGHT.textMuted} />
          Coding assistant
        </div>
        {/* body */}
        <div style={{ position: "absolute", left: SLAB.padX, right: SLAB.padX, top: 0, bottom: 0, fontFamily: FONT.mono, fontSize: SLAB.size, letterSpacing: "-0.01em" }}>
          <Rise at={question} style={{ left: 0, top: lineTop(0), height: SLAB.lh, lineHeight: `${SLAB.lh}px`, whiteSpace: "pre" }}>
            <span style={{ color: NIGHT.textMuted }}>{"› "}</span>
            <span style={{ color: NIGHT.text }}>{MCP_QUESTION}</span>
          </Rise>
          <Rise at={call} style={{ left: 0, top: lineTop(1), height: SLAB.lh, lineHeight: `${SLAB.lh}px`, whiteSpace: "pre" }}>
            <span style={{ display: "inline-block", width: ADV * 2, verticalAlign: "top", height: SLAB.lh, position: "relative" }}>
              <span style={{ position: "absolute", left: ADV * 0.25, top: SLAB.lh / 2 - 7, width: 14, height: 14, borderRadius: 7, background: NIGHT.link }} />
            </span>
            <span style={{ color: NIGHT.link }}>{CALL.server}</span>
            <span style={{ color: NIGHT.textMuted }}>{" · "}</span>
            <span style={{ color: NIGHT.text, fontWeight: 500 }}>{CALL.tool}</span>
          </Rise>
          {/* the one amber sits outside the rising line (so its glow is never clipped); it starts once the line is up */}
          <div style={{ position: "absolute", left: 0, top: lineTop(2), height: SLAB.lh }}>
            <AmberBack at={amberAt} col={amberCol} len={OUTPUT_LINES[0].value.length} />
          </div>
          {OUTPUT_LINES.map((l, i) => {
            const keyTxt = `"${l.key}"`;
            return (
              <Rise key={l.key} at={out[i]} style={{ left: 0, top: lineTop(2 + i), height: SLAB.lh, width: SLAB.w - 2 * SLAB.padX }}>
                <div style={{ position: "relative", height: SLAB.lh, lineHeight: `${SLAB.lh}px`, whiteSpace: "pre" }}>
                  <span>{" ".repeat(indent)}</span>
                  <span style={{ color: NIGHT.link }}>{keyTxt}</span>
                  <span style={{ color: NIGHT.textMuted }}>{": "}</span>
                  <span style={{ color: BRAND.mist, opacity: i === 0 && frame >= amberAt + 9 ? 0 : 1 }}>{l.value}</span>
                  <span style={{ color: NIGHT.textMuted }}>{l.tail}</span>
                </div>
              </Rise>
            );
          })}
          <div style={{ position: "absolute", left: 0, top: lineTop(2), height: SLAB.lh }}>
            <AmberFront at={amberAt} col={amberCol} len={OUTPUT_LINES[0].value.length} text={OUTPUT_LINES[0].value} />
          </div>
        </div>
      </div>
    </div>
  );
};
