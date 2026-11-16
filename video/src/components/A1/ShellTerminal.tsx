import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { clamp, EASE, tween } from "../../lib/time";
import { FONT, NIGHT } from "../../v4/look";
import { deep, edge, elevNight, nightSlab, paper } from "./night";

/**
 * The 3 a.m. shell (A1 V04): a generic terminal of our own, the dark slab of the shot, one step higher than the page it
 * sits over. The runbook's step 2 command types at `typeAt` (one character per frame or faster, so it lands before the
 * error), Enter lands, then zsh's error prints at `errorAt`. No product marks, no window buttons.
 *
 * It arrives by lifting (M3): from `at` it rises from elevation 2 to 4 over 14 frames, 60 px up from below.
 */

export const SHELL = { w: 1380, titleH: 72, padX: 56, padY: 34, line: 60, size: 40 } as const;

const P = NIGHT;

export const ShellTerminal: React.FC<{
  x: number;
  y: number;
  at: number;
  /** The command (step 2's line, verbatim). */
  cmd: string;
  typeAt: number;
  /** Frames to type the command. */
  typeDur: number;
  /** The error line and when it prints. */
  error: string;
  errorAt: number;
  title?: string;
}> = ({ x, y, at, cmd, typeAt, typeDur, error, errorAt, title = "zsh · payments-api" }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const lift = tween(frame, at, at + 14, 0, 1, EASE.expoOut);
  const n = Math.round(interpolate(frame, [typeAt, typeAt + typeDur], [0, cmd.length], clamp));
  const typing = frame >= typeAt && frame < errorAt;
  const errP = tween(frame, errorAt, errorAt + 5, 0, 1, EASE.expoOut);
  const h = SHELL.titleH + SHELL.padY * 2 + SHELL.line * 2;
  const mono: React.CSSProperties = {
    fontFamily: FONT.mono,
    fontWeight: 400,
    fontSize: SHELL.size,
    lineHeight: `${SHELL.line}px`,
    letterSpacing: "-0.01em",
    whiteSpace: "pre",
  };
  return (
    <div style={{ position: "absolute", left: x, top: y, width: SHELL.w, height: h }}>
      <div
        style={{
          position: "absolute",
          left: SHELL.w * 0.1,
          right: SHELL.w * 0.1,
          top: h - 10 + 24 * lift,
          height: 70 + 40 * lift,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${deep(0.55)} 0%, ${deep(0.2)} 55%, transparent 100%)`,
          filter: `blur(${10 + 10 * lift}px)`,
          opacity: interpolate(frame, [at, at + 3], [0, 1], clamp),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 30,
          background: nightSlab,
          boxShadow: elevNight(2 + 2 * lift, 0.95),
          overflow: "hidden",
          transform: `translateY(${((1 - lift) * 60).toFixed(2)}px)`,
          opacity: interpolate(frame, [at, at + 3], [0, 1], clamp),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            height: SHELL.titleH,
            padding: `0 ${SHELL.padX - 8}px`,
            borderBottom: `1.5px solid ${edge(0.9)}`,
            background: paper(0.025),
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 28,
            color: P.textMuted,
          }}
        >
          <Icon name="terminal" size={30} color={P.textMuted} />
          {title}
        </div>
        <div style={{ padding: `${SHELL.padY}px ${SHELL.padX}px` }}>
          <div style={{ ...mono, color: P.text }}>
            <span style={{ color: P.link }}>%</span> {cmd.slice(0, n)}
            {typing ? (
              <span
                style={{
                  display: "inline-block",
                  width: "0.56em",
                  height: SHELL.size * 1.05,
                  marginLeft: 2,
                  verticalAlign: "-0.18em",
                  background: paper(0.8),
                }}
              />
            ) : null}
          </div>
          {errP > 0 ? (
            <div style={{ ...mono, color: P.stale, opacity: errP, transform: `translateY(${((1 - errP) * 10).toFixed(2)}px)` }}>{error}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
