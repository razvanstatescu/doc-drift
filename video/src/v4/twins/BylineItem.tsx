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
 *
 * Swaps are SLIP swaps (round 2, review T-5): the old words slide out to the right while a wipe takes them from the left,
 * then the new words slide in from the left behind a wipe that opens to the right. No opacity, never a cross-dissolve,
 * never both labels at once. Between two Doc Drift states only the words swap (the icon stays); from A1's
 * "Reviewed 34 days ago" the whole line swaps.
 */

export const STATE_WORD: Record<DdsState, string> = { verified: "Verified", possibly_stale: "Possibly stale", stale: "Stale", unanchored: "Unanchored" };
/** The real byline title: `${label} · Doc Drift`. */
export const bylineTitle = (s: DdsState) => `${STATE_WORD[s]} · Doc Drift`;

/** Geometry in UI px (film = x k). */
export const BYLINE = { size: 15, weight: 500, h: 28, padX: 7, icon: 17, gap: 7, radius: 6 } as const;

/** A1's generic line before Doc Drift. */
export const REVIEWED_TEXT = "Reviewed 34 days ago";

/** Film-px size of the item for a state (its pill: padding, icon, words). */
export function bylineItemSize(state: DdsState, k: number, size: number = BYLINE.size) {
  const s = size / BYLINE.size;
  const w = (BYLINE.padX * 2 + BYLINE.icon + BYLINE.gap) * s + textWidth(bylineTitle(state), { size, weight: BYLINE.weight });
  return { w: w * k, h: BYLINE.h * s * k };
}

/** Film-px width of the reviewed line. */
export function reviewedLineWidth(text: string, k: number, size: number = BYLINE.size) {
  const s = size / BYLINE.size;
  return ((BYLINE.padX * 2 + BYLINE.icon + BYLINE.gap) * s + textWidth(text, { size, weight: 400 })) * k;
}

/**
 * The byline swap, in frames relative to `at`: the old words leave over [at + outStart, at] (linear: slide right one
 * unit while the wipe takes them from the left; gone at `at`), the new words arrive over [at, at + inEnd] (expo out:
 * about 90% uncovered at at + 1, 99% at at + 2, fully readable and still at at + 3). Never both visible.
 */
export const BYLINE_SWAP = { outStart: -3, inEnd: 3 } as const;

/** Progress of a byline swap at a frame: `out` 0..1 for the old words, `in` 0..1 for the new ones. */
export function bylineSwapProgress(frame: number, at: number) {
  return {
    out: interpolate(frame, [at + BYLINE_SWAP.outStart, at], [0, 1], { ...clamp, easing: EASE.linear }),
    in: interpolate(frame, [at, at + BYLINE_SWAP.inEnd], [0, 1], { ...clamp, easing: EASE.expoOut }),
  };
}

export type BylineFrom = DdsState | "reviewed";

export type BylineItemProps = {
  state: DdsState;
  /**
   * What the byline read before `at`: a Doc Drift state, or "reviewed" (A1's "Reviewed 34 days ago", `fromText`).
   * The swap is a 6-frame slip centred on `at` (BYLINE_SWAP): the old words are gone at `at`, the new ones are fully
   * readable at at + 3. To land the new words on a word of narration, set at = word - 3 (readable on the word) down
   * to word - 7 (4 frames early).
   */
  from?: BylineFrom;
  /** The reviewed line's words when `from` is "reviewed" (default "Reviewed 34 days ago"). */
  fromText?: string;
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

/** A Doc Drift side's words, with its amber block, trace and slip, laid out from the words' own left edge. */
const DdsWords: React.FC<{ state: DdsState; world: World; k: number; size: number; lit: number; slip: boolean }> = ({ state, world, k, size, lit, slip }) => {
  const p = palette(world);
  const s = size / BYLINE.size;
  const u = (n: number) => n * s * k;
  const h = u(BYLINE.h);
  const wordsW = textWidth(bylineTitle(state), { size, weight: BYLINE.weight }) * k;
  const padW = u(4);
  const blockH = u(BYLINE.size) * 1.32;
  const dx = slip ? lit * SLIP_UNIT * (wordsW + 2 * padW) : 0;
  return (
    <>
      {lit > 0.001 ? (
        <>
          {slip ? (
            <span style={{ position: "absolute", left: -padW, top: (h - blockH) / 2, width: wordsW + 2 * padW, height: blockH, borderRadius: u(4), background: p.trace, opacity: Math.min(1, lit / 0.25) }} />
          ) : null}
          <span
            style={{
              position: "absolute",
              left: -padW + dx,
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
          left: dx,
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
    </>
  );
};

/** The bloom under lit words (a glow, so it may fade with what it belongs to). */
const WordsBloom: React.FC<{ state: DdsState; k: number; size: number; lit: number; slip: boolean; left: number; vis: number }> = ({ state, k, size, lit, slip, left, vis }) => {
  if (lit * vis <= 0.001) return null;
  const s = size / BYLINE.size;
  const h = BYLINE.h * s * k;
  const wordsW = textWidth(bylineTitle(state), { size, weight: BYLINE.weight }) * k;
  const padW = 4 * s * k;
  const blockH = BYLINE.size * s * k * 1.32;
  const dx = slip ? lit * SLIP_UNIT * (wordsW + 2 * padW) : 0;
  return (
    <span
      style={{
        position: "absolute",
        left: left - padW + dx - (wordsW + 2 * padW) * 0.3,
        top: (h - blockH) / 2 - blockH * 1.1,
        width: (wordsW + 2 * padW) * 1.6,
        height: blockH * 3.2,
        borderRadius: "50%",
        background: bloomBg(lit * vis),
      }}
    />
  );
};

/**
 * A stationary window that a side slides through: "out" slides right by `dist` while the wipe eats it from the left;
 * "in" slides from `dist` left of home while the wipe opens to the right. No opacity.
 */
const SlipWindow: React.FC<{ left: number; width: number; h: number; mode: "out" | "in" | "still"; p: number; dist: number; children: React.ReactNode }> = ({
  left,
  width,
  h,
  mode,
  p,
  dist,
  children,
}) => {
  const m = h; // vertical margin, so glows above and below are not cut
  const clip = mode === "out" ? `inset(0px 0px 0px ${(p * 100).toFixed(3)}%)` : mode === "in" ? `inset(0px ${((1 - p) * 100).toFixed(3)}% 0px 0px)` : undefined;
  const tx = mode === "out" ? p * dist : mode === "in" ? -(1 - p) * dist : 0;
  return (
    <span style={{ position: "absolute", left, top: -m, width, height: h + 2 * m, clipPath: clip, WebkitClipPath: clip }}>
      <span style={{ position: "absolute", left: 0, top: m, width, height: h, transform: tx ? `translateX(${tx}px)` : undefined }}>{children}</span>
    </span>
  );
};

export const BylineItem: React.FC<BylineItemProps> = ({ state, from, fromText = REVIEWED_TEXT, at, world = "day", k = 1.8, size = BYLINE.size, lit, slip = true, hover = 0, x, y, style }) => {
  const frame = useCurrentFrame();
  const p = palette(world);
  const s = size / BYLINE.size;
  const u = (n: number) => n * s * k;
  const h = u(BYLINE.h);
  const swapping = from !== undefined && at !== undefined && from !== state;
  const sw = swapping ? bylineSwapProgress(frame, at!) : { out: 1, in: 1 };
  const litOf = (st: DdsState) => (lit === undefined ? (st === "possibly_stale" ? 1 : 0) : typeof lit === "boolean" ? (lit && st === "possibly_stale" ? 1 : 0) : st === "possibly_stale" ? lit : 0);

  const wNew = bylineItemSize(state, k, size).w;
  const wOld = !swapping ? 0 : from === "reviewed" ? reviewedLineWidth(fromText, k, size) : bylineItemSize(from as DdsState, k, size).w;
  const width = Math.max(wNew, sw.out < 1 ? wOld : 0);
  const wordsX = u(BYLINE.padX + BYLINE.icon + BYLINE.gap);
  const iconX = u(BYLINE.padX);
  const iconTop = (h - u(BYLINE.icon)) / 2;
  const unit = (w: number) => SLIP_UNIT * w + u(4);
  const ddsIcon = <Mark size={u(BYLINE.icon)} variant={world === "night" ? "flat" : "flat-ink"} />;

  // the reviewed line as one layer (check and words)
  const reviewed = (
    <>
      <span style={{ position: "absolute", left: iconX, top: iconTop }}>
        <Icon name="check" size={u(BYLINE.icon)} color={p.textMuted} stroke={2} />
      </span>
      <span style={{ position: "absolute", left: wordsX, top: 0, height: h, display: "flex", alignItems: "center", color: p.textMuted, fontFamily: FONT.sans, fontWeight: 400, fontSize: u(BYLINE.size), lineHeight: 1, whiteSpace: "nowrap" }}>
        {fromText}
      </span>
    </>
  );
  const ddsFace = (st: DdsState, l: number) => (
    <>
      <span style={{ position: "absolute", left: iconX, top: iconTop }}>{ddsIcon}</span>
      <span style={{ position: "absolute", left: wordsX, top: 0, width: 0, height: h }}>
        <DdsWords state={st} world={world} k={k} size={size} lit={l} slip={slip} />
      </span>
    </>
  );

  const litNew = litOf(state);
  const wordsSpan = (st: DdsState) => textWidth(bylineTitle(st), { size, weight: BYLINE.weight }) * k;
  let layers: React.ReactNode;
  if (!swapping) {
    layers = (
      <>
        <WordsBloom state={state} k={k} size={size} lit={litNew} slip={slip} left={wordsX} vis={1} />
        {ddsFace(state, litNew)}
      </>
    );
  } else if (from === "reviewed") {
    // the whole line swaps: the check and words slide out, the icon and the Doc Drift words slide in
    layers = (
      <>
        {sw.out < 1 ? (
          <SlipWindow left={0} width={wOld + unit(wOld)} h={h} mode="out" p={sw.out} dist={unit(wOld)}>
            {reviewed}
          </SlipWindow>
        ) : null}
        {sw.in > 0 ? (
          <>
            <WordsBloom state={state} k={k} size={size} lit={litNew} slip={slip} left={wordsX} vis={sw.in} />
            <SlipWindow left={0} width={wNew + unit(wNew)} h={h} mode="in" p={sw.in} dist={unit(wNew)}>
              {ddsFace(state, litNew)}
            </SlipWindow>
          </>
        ) : null}
      </>
    );
  } else {
    // Doc Drift to Doc Drift: the icon stays in line, the words slip out and in
    const old = from as DdsState;
    const litOld = litOf(old);
    const oldW = wordsSpan(old) + u(8);
    const newW = wordsSpan(state) + u(8);
    layers = (
      <>
        <span style={{ position: "absolute", left: iconX, top: iconTop }}>{ddsIcon}</span>
        {sw.out < 1 ? (
          <>
            <WordsBloom state={old} k={k} size={size} lit={litOld} slip={slip} left={wordsX} vis={1 - sw.out} />
            <SlipWindow left={wordsX - u(4)} width={oldW + unit(oldW) * 2} h={h} mode="out" p={sw.out} dist={unit(oldW)}>
              <span style={{ position: "absolute", left: u(4), top: 0, width: 0, height: h }}>
                <DdsWords state={old} world={world} k={k} size={size} lit={litOld} slip={slip} />
              </span>
            </SlipWindow>
          </>
        ) : null}
        {sw.in > 0 ? (
          <>
            <WordsBloom state={state} k={k} size={size} lit={litNew} slip={slip} left={wordsX} vis={sw.in} />
            <SlipWindow left={wordsX - u(4)} width={newW + unit(newW) * 2} h={h} mode="in" p={sw.in} dist={unit(newW)}>
              <span style={{ position: "absolute", left: u(4), top: 0, width: 0, height: h }}>
                <DdsWords state={state} world={world} k={k} size={size} lit={litNew} slip={slip} />
              </span>
            </SlipWindow>
          </>
        ) : null}
      </>
    );
  }

  return (
    <span
      style={{
        position: x !== undefined || y !== undefined ? "absolute" : "relative",
        left: x,
        top: y,
        display: "inline-block",
        width,
        height: h,
        verticalAlign: "middle",
        ...style,
      }}
    >
      {hover > 0.001 ? (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: wNew,
            height: h,
            borderRadius: u(BYLINE.radius),
            background: world === "night" ? `rgba(255, 255, 255, ${0.08 * hover})` : `rgba(7, 38, 48, ${0.06 * hover})`,
          }}
        />
      ) : null}
      {layers}
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
