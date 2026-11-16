import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { Mark } from "../../brand/Mark";
import { SLIP_UNIT } from "../../brand/tokens";
import { clamp, EASE } from "../../lib/time";
import { FONT } from "../look";
import { textWidth } from "./metrics";
import { bloomBg, palette, withGlow } from "./twinLook";
import type { DdsState, World } from "./types";

/**
 * The byline item, as the real one reads (apps/core/src/lib/copy.ts stateTitle()): the app icon, then
 * "Possibly stale · Doc Drift". Text and icon, not a coloured lozenge (R3 section 8, item 1). When it is the shot's one
 * amber element ("lit"), the film marks it the brand's way: the words slip one unit right onto an amber block, their
 * trace left at home, with glow and bloom; the icon stays in line. The words never change.
 */

export const STATE_WORD: Record<DdsState, string> = { verified: "Verified", possibly_stale: "Possibly stale", stale: "Stale", unanchored: "Unanchored" };
/** The real byline title: `${label} · Doc Drift`. */
export const bylineTitle = (s: DdsState) => `${STATE_WORD[s]} · Doc Drift`;

/** Geometry in UI px (film = x k). */
export const BYLINE = { size: 15, weight: 500, h: 28, padX: 7, icon: 17, gap: 7, radius: 6 } as const;

/** Film-px size of the item for a state (its pill: padding, icon, words). */
export function bylineItemSize(state: DdsState, k: number, size: number = BYLINE.size) {
  const s = size / BYLINE.size;
  const w = (BYLINE.padX * 2 + BYLINE.icon + BYLINE.gap) * s + textWidth(bylineTitle(state), { size, weight: BYLINE.weight });
  return { w: w * k, h: BYLINE.h * s * k };
}

export type BylineItemProps = {
  state: DdsState;
  /** Shown until `at`; then the item swaps to `state` (old rolls up and out, new rises in). */
  from?: DdsState;
  at?: number;
  world?: World;
  /** UI px to film px (default 1.8). */
  k?: number;
  /** UI font size (default 15: 27 px on film at k 1.8). */
  size?: number;
  /**
   * The amber, 0..1 (or a boolean). Default: lit while the shown state is Possibly stale. Pass 0 or false when another
   * element (the slipped Steps band) is the shot's amber.
   */
  lit?: number | boolean;
  /** Slip one unit right while lit (default true). */
  slip?: boolean;
  /** 0..1 hover background (the tooltip is open). */
  hover?: number;
  /** Absolute placement (film px). Without it the item sits in the flow. */
  x?: number;
  y?: number;
  style?: React.CSSProperties;
};

const Face: React.FC<{ state: DdsState; world: World; k: number; size: number; lit: number; slip: boolean; hover: number }> = ({ state, world, k, size, lit, slip, hover }) => {
  const p = palette(world);
  const s = size / BYLINE.size;
  const u = (n: number) => n * s * k;
  const { w } = bylineItemSize(state, k, size);
  const h = u(BYLINE.h);
  // the words: their box (the icon stays home; when lit, the words slip one unit right onto the amber block)
  const wordsX = u(BYLINE.padX + BYLINE.icon + BYLINE.gap);
  const wordsW = textWidth(bylineTitle(state), { size, weight: BYLINE.weight }) * k;
  const padW = u(4);
  const blockH = u(BYLINE.size) * 1.32;
  const dx = slip ? lit * SLIP_UNIT * (wordsW + 2 * padW) : 0;
  return (
    <span style={{ position: "relative", display: "inline-block", width: w, height: h, verticalAlign: "middle" }}>
      {hover > 0.001 ? (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: u(BYLINE.radius),
            background: world === "night" ? `rgba(255, 255, 255, ${0.08 * hover})` : `rgba(7, 38, 48, ${0.06 * hover})`,
          }}
        />
      ) : null}
      <span style={{ position: "absolute", left: u(BYLINE.padX), top: (h - u(BYLINE.icon)) / 2 }}>
        <Mark size={u(BYLINE.icon)} variant={world === "night" ? "flat" : "flat-ink"} />
      </span>
      {lit > 0.001 ? (
        <>
          {slip ? (
            <span
              style={{
                position: "absolute",
                left: wordsX - padW,
                top: (h - blockH) / 2,
                width: wordsW + 2 * padW,
                height: blockH,
                borderRadius: u(4),
                background: p.trace,
                opacity: Math.min(1, lit / 0.25),
              }}
            />
          ) : null}
          <span
            style={{
              position: "absolute",
              left: wordsX - padW + dx - (wordsW + 2 * padW) * 0.3,
              top: (h - blockH) / 2 - blockH * 1.1,
              width: (wordsW + 2 * padW) * 1.6,
              height: blockH * 3.2,
              borderRadius: "50%",
              background: bloomBg(lit),
            }}
          />
          <span
            style={{
              position: "absolute",
              left: wordsX - padW + dx,
              top: (h - blockH) / 2,
              width: wordsW + 2 * padW,
              height: blockH,
              borderRadius: u(4),
              background: `rgba(255, 178, 36, ${lit})`,
              boxShadow: withGlow("none", world, lit, k),
            }}
          />
        </>
      ) : null}
      <span
        style={{
          position: "absolute",
          left: wordsX + dx,
          top: 0,
          height: h,
          display: "flex",
          alignItems: "center",
          color: lit > 0.5 ? p.onBeacon : p.text,
          fontFamily: FONT.sans,
          fontWeight: BYLINE.weight,
          fontSize: u(BYLINE.size),
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {bylineTitle(state)}
      </span>
    </span>
  );
};

export const BylineItem: React.FC<BylineItemProps> = ({ state, from, at, world = "day", k = 1.8, size = BYLINE.size, lit, slip = true, hover = 0, x, y, style }) => {
  const frame = useCurrentFrame();
  const swapping = from !== undefined && at !== undefined && from !== state;
  const outP = swapping ? interpolate(frame, [at, at + 6], [0, 1], { ...clamp, easing: EASE.expoIn }) : 1;
  const inP = swapping ? interpolate(frame, [at + 3, at + 13], [0, 1], { ...clamp, easing: EASE.expoOut }) : 1;
  const litOf = (st: DdsState, amount: number) => {
    const base = lit === undefined ? (st === "possibly_stale" ? 1 : 0) : typeof lit === "boolean" ? (lit && st === "possibly_stale" ? 1 : 0) : st === "possibly_stale" ? lit : 0;
    return base * amount;
  };
  const h = BYLINE.h * (size / BYLINE.size) * k;
  return (
    <span
      style={{
        position: x !== undefined || y !== undefined ? "absolute" : "relative",
        left: x,
        top: y,
        display: "inline-grid",
        height: h,
        ...style,
      }}
    >
      {swapping && outP < 1 ? (
        <span style={{ gridArea: "1 / 1", opacity: 1 - outP, transform: `translateY(${-outP * 0.35 * h}px)` }}>
          <Face state={from!} world={world} k={k} size={size} lit={litOf(from!, 1)} slip={slip} hover={hover} />
        </span>
      ) : null}
      {inP > 0 ? (
        <span style={{ gridArea: "1 / 1", opacity: swapping ? inP : 1, transform: swapping ? `translateY(${(1 - inP) * 0.35 * h}px)` : undefined }}>
          <Face state={state} world={world} k={k} size={size} lit={litOf(state, inP)} slip={slip} hover={hover} />
        </span>
      ) : null}
    </span>
  );
};

/** A1's generic byline line: a check and "Reviewed 34 days ago". No Doc Drift. */
export const ReviewedLine: React.FC<{ text: string; world?: World; k?: number; size?: number }> = ({ text, world = "day", k = 1.8, size = BYLINE.size }) => {
  const p = palette(world);
  const s = size / BYLINE.size;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: BYLINE.gap * s * k,
        height: BYLINE.h * s * k,
        padding: `0 ${BYLINE.padX * s * k}px`,
        color: p.textMuted,
        fontFamily: FONT.sans,
        fontWeight: 400,
        fontSize: size * k,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <Icon name="check" size={BYLINE.icon * s * k} color={p.textMuted} stroke={2} />
      <span>{text}</span>
    </span>
  );
};

/** Film-px width of the reviewed line. */
export function reviewedLineWidth(text: string, k: number, size: number = BYLINE.size) {
  const s = size / BYLINE.size;
  return ((BYLINE.padX * 2 + BYLINE.icon + BYLINE.gap) * s + textWidth(text, { size, weight: 400 })) * k;
}
