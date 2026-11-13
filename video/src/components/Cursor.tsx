import React from "react";
import { MacOSCursor } from "@remotion/mac-cursors";
import { interpolate, spring, useCurrentFrame } from "remotion";
import { useTheme } from "../brand/theme";
import type { ThemeName } from "../brand/tokens";
import { clamp, EASE, FPS } from "../lib/time";

/**
 * A scripted macOS cursor (@remotion/mac-cursors). The real cursor is hidden in recordings; this one moves on a
 * critically damped spring between known targets, arrives at each point ON its `frame`, and pulses on clicks.
 * Coordinates are in the parent's px (inside <Shot>, capture px; elsewhere, frame px).
 *
 *   <Cursor points={[
 *     { frame: 0, x: 900, y: 700 },
 *     { frame: 40, x: 1310, y: 212, click: true, cursor: "pointer" },
 *   ]} />
 */
export type CursorPoint = {
  frame: number;
  x: number;
  y: number;
  /** Click on arrival: a 4-frame press and a ring. */
  click?: boolean;
  /** CSS cursor name on arrival ("default", "pointer", "text"). Default "default". */
  cursor?: string;
  /** Frames the move into this point takes (default from the distance: 12 to 26). */
  travel?: number;
};

const travelFor = (d: number) => Math.round(Math.max(12, Math.min(26, 10 + d / 55)));

export function cursorAt(frame: number, points: CursorPoint[]) {
  const pts = [...points].sort((a, b) => a.frame - b.frame);
  let x = pts[0]?.x ?? 0;
  let y = pts[0]?.y ?? 0;
  let cursor = pts[0]?.cursor ?? "default";
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const travel = b.travel ?? travelFor(d);
    const start = b.frame - travel;
    if (frame < start) break;
    const t = spring({ frame: frame - start, fps: FPS, config: { stiffness: 120, damping: 26, mass: 1 }, durationInFrames: travel });
    const k = Math.min(1, t);
    // a slight arc, like a hand: up to 5% of the distance, perpendicular to the move
    const arc = Math.sin(Math.PI * k) * d * 0.05;
    const nx = d > 0 ? -(b.y - a.y) / d : 0;
    const ny = d > 0 ? (b.x - a.x) / d : 0;
    x = a.x + (b.x - a.x) * k + nx * arc;
    y = a.y + (b.y - a.y) * k + ny * arc;
    if (frame >= b.frame - 2) cursor = b.cursor ?? "default";
  }
  return { x, y, cursor };
}

export const Cursor: React.FC<{
  points: CursorPoint[];
  /** Cursor scale (1 = 32 px CSS cursor). Inside a 2x capture use 2. Default 1.5 (frame px). */
  scale?: number;
  /** Fade in from this frame / out from this frame (local). */
  showAt?: number;
  hideAt?: number;
  theme?: ThemeName;
}> = ({ points, scale = 1.5, showAt, hideAt, theme }) => {
  const frame = useCurrentFrame();
  const p = useTheme(theme);
  if (points.length === 0) return null;
  const { x, y, cursor } = cursorAt(frame, points);
  const fadeIn = showAt === undefined ? 1 : interpolate(frame, [showAt, showAt + 5], [0, 1], clamp);
  const fadeOut = hideAt === undefined ? 1 : interpolate(frame, [hideAt, hideAt + 5], [1, 0], clamp);
  const opacity = fadeIn * fadeOut;
  if (opacity <= 0) return null;
  // the latest click at or before this frame
  const click = [...points].filter((pt) => pt.click && pt.frame <= frame).sort((a, b) => b.frame - a.frame)[0];
  const since = click ? frame - click.frame : 99;
  const press = since < 6 ? interpolate(since, [0, 1, 4, 6], [1, 0.88, 0.88, 1], clamp) : 1;
  const ring = since < 16 ? interpolate(since, [0, 16], [0, 1], { ...clamp, easing: EASE.expoOut }) : 1;
  const ringColor = p.name === "night" ? "rgba(242,246,247,0.55)" : "rgba(7,38,48,0.38)";
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity, pointerEvents: "none" }}>
      {since < 16 && click ? (
        <div
          style={{
            position: "absolute",
            left: click.x,
            top: click.y,
            width: 2 * 30 * scale,
            height: 2 * 30 * scale,
            marginLeft: -30 * scale,
            marginTop: -30 * scale,
            borderRadius: "50%",
            border: `${2 * scale}px solid ${ringColor}`,
            transform: `scale(${0.25 + 0.75 * ring})`,
            opacity: 1 - ring,
            boxSizing: "border-box",
          }}
        />
      ) : null}
      <MacOSCursor cursor={cursor} style={{ left: x, top: y, scale: `${scale * press}` }} />
    </div>
  );
};
