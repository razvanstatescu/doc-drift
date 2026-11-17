import React from "react";
import { measureText } from "@remotion/layout-utils";
import { useCurrentFrame } from "remotion";
import { SLIP_UNIT } from "../../brand/tokens";
import { EASE, tween } from "../../lib/time";
import { amber, BRAND, DAY, FONT, NIGHT } from "../look";
import { useFontsReady } from "./swap";
import { Bloom } from "./stage";
import { CurrentUnderline, MistBand } from "./type";

/**
 * EditType (v5, R6 techniques 7, 8 and 14, promoted from src/v5/lab/EditType): type that edits itself.
 *   MaskLine   the functional voice: a line rises from behind its own baseline in 12 to 14 frames (labels, code,
 *              results). No smear, no fade.
 *   EditLine   strike and replace in place: the old words are marked (Mist), struck (an ink rule), then slip out one
 *              unit under a wipe; the line's width follows to the new words, which open behind a wipe; a Current
 *              underline marks them. The two phases never overlap: no frame shows both.
 *   TypeToUI   type becomes UI: the spoken words land big beside the object, then fly, shrink and land on the UI's own
 *              slot as its words. Open the UI's swap so its old words have left before the landing: the flying words
 *              are drawn until `dock + dur + 1`, over the UI's new words, never beside the old ones.
 */

// ---------------------------------------------------------------------------------------------------------------------
// MaskLine
// ---------------------------------------------------------------------------------------------------------------------

export const MaskLine: React.FC<{
  at: number;
  /** Frames to rise (default 13). */
  dur?: number;
  /** The line leaves upward through its own box from this frame (6 frames). */
  out?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, dur = 13, out, children, style }) => {
  const frame = useCurrentFrame();
  if (frame < at) return <div style={{ ...style, visibility: "hidden" }}>{children}</div>;
  const t = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  const q = out !== undefined ? tween(frame, out, out + 6, 0, 1, EASE.expoIn) : 0;
  if (q >= 1) return <div style={{ ...style, visibility: "hidden" }}>{children}</div>;
  const y = (1 - t) * 105 - q * 105;
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div style={{ transform: y !== 0 ? `translateY(${y}%)` : undefined }}>{children}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// EditLine
// ---------------------------------------------------------------------------------------------------------------------

export type EditLineProps = {
  /** The text before the edited words, the old words, the new words, the text after (it reflows). */
  pre: string;
  old: string;
  neu: string;
  post: string;
  size: number;
  mono?: boolean;
  weight?: number;
  /** Mist band on the old words (omit for none). */
  mark?: number;
  /** The ink rule across the old words (omit for none). */
  strike?: number;
  /** The swap starts: the old words leave in 5 frames, then the new ones open in 8. */
  replace: number;
  /** Underline the new words in Current once they are in (default true). */
  underline?: boolean;
  color?: string;
  world?: "day" | "night";
  style?: React.CSSProperties;
};

export const EditLine: React.FC<EditLineProps> = ({ pre, old, neu, post, size, mono = true, weight = 400, mark, strike, replace, underline = true, color, world = "day", style }) => {
  const frame = useCurrentFrame();
  const ready = useFontsReady();
  const family = mono ? FONT.mono : FONT.sans;
  const ink = color ?? (world === "night" ? NIGHT.text : DAY.text);
  const muted = world === "night" ? NIGHT.textMuted : DAY.textMuted;
  const w = (t: string) => (ready ? measureText({ text: t, fontFamily: family, fontWeight: weight, fontSize: size }).width : t.length * size * 0.6);
  const wOld = w(old);
  const wNew = w(neu);
  const out = tween(frame, replace, replace + 5, 0, 1, EASE.expoIn);
  const inn = tween(frame, replace + 5, replace + 13, 0, 1, EASE.expoOut);
  const struck = strike !== undefined ? tween(frame, strike, strike + 8, 0, 1, EASE.expoOut) : 0;
  const unitOld = SLIP_UNIT * wOld + 4;
  const unitNew = SLIP_UNIT * wNew + 4;
  const base: React.CSSProperties = { fontFamily: family, fontSize: size, fontWeight: weight, lineHeight: 1.3, whiteSpace: "pre", color: ink };
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", ...base, ...style }}>
      <span>{pre}</span>
      {out < 1 ? (
        <span style={{ position: "relative", display: "inline-block", width: wOld, height: size * 1.3, overflow: "hidden" }}>
          <span
            style={{
              position: "absolute",
              left: unitOld * out,
              top: 0,
              clipPath: out > 0 ? `inset(-20% 0 -20% ${out * 100}%)` : undefined,
              color: struck > 0.5 ? muted : ink,
            }}
          >
            {mark !== undefined && frame >= mark ? (
              <MistBand at={mark} dur={10} world={world}>
                <span>{old}</span>
              </MistBand>
            ) : (
              old
            )}
            {struck > 0 ? (
              <span style={{ position: "absolute", left: -2, top: "54%", height: Math.max(3, size * 0.07), width: (wOld + 4) * struck, background: world === "night" ? NIGHT.text : BRAND.fathom, borderRadius: 2 }} />
            ) : null}
          </span>
        </span>
      ) : (
        <span style={{ position: "relative", display: "inline-block", width: wOld + (wNew - wOld) * inn, height: size * 1.3, overflow: "hidden" }}>
          <span style={{ position: "absolute", left: -unitNew * (1 - inn), top: 0, clipPath: `inset(-20% ${(1 - inn) * 100}% -20% 0)` }}>
            {underline && frame >= replace + 13 ? (
              <CurrentUnderline at={replace + 13} dur={10} world={world}>
                <span>{neu}</span>
              </CurrentUnderline>
            ) : (
              neu
            )}
          </span>
        </span>
      )}
      <span>{post}</span>
    </span>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// TypeToUI
// ---------------------------------------------------------------------------------------------------------------------

/** A text box: its top-left (in the same space as the UI, usually stage px inside your Camera3D) and its font. */
export type TypeBox = { x: number; y: number; size: number; weight?: number; tracking?: number };

export type TypeToUIProps = {
  /** The spoken words, set big ("Possibly stale."). */
  text: string;
  /** The words as they read in the UI slot (default `text` without a final period); they take over at mid-flight. */
  landText?: string;
  /** The big words rise (12 frames; land 0 to 4 frames before the word). */
  at: number;
  /** The flight starts. */
  dock: number;
  /** Flight frames (default 18, expo in-out). */
  dur?: number;
  /** Where the big words sit, and the slot they land on (the UI's own text box and size). */
  from: TypeBox;
  to: TypeBox;
  /** The highlight behind the big words, swept in 9 frames from `at + 12`: "amber" only for the drift (it travels into the UI with the words), "mist", or "none" (default). */
  block?: "amber" | "mist" | "none";
  /** The flying words are drawn until this frame (default dock + dur + 1). */
  hideAt?: number;
  font?: "sans" | "mono";
  color?: string;
  world?: "day" | "night";
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const warnedVerified = new Set<string>();
/** Verified never carries amber (v5 round 2): an amber block on a "Verified" line is refused and drawn as Mist. */
const verifiedBlock = (text: string): "mist" => {
  if (!warnedVerified.has(text)) {
    warnedVerified.add(text);
    console.warn(`TypeToUI "${text}": Verified never carries amber (one amber per shot is the drift); drawn with the Mist block`);
  }
  return "mist";
};

export const TypeToUI: React.FC<TypeToUIProps> = ({ text, landText, at, dock, dur = 18, from, to, block: blockIn = "none", hideAt, font = "sans", color, world = "day" }) => {
  const block = blockIn === "amber" && /verified/i.test(`${text} ${landText ?? ""}`) ? verifiedBlock(text) : blockIn;
  const frame = useCurrentFrame();
  const end = hideAt ?? dock + dur + 1;
  if (frame < at || frame >= end) return null;
  const d = tween(frame, dock, dock + dur, 0, 1, EASE.expoInOut);
  const size = lerp(from.size, to.size, d);
  const weight = lerp(from.weight ?? 600, to.weight ?? 500, d);
  const track = lerp(from.tracking ?? -0.03, to.tracking ?? 0, d);
  const words = d < 0.55 ? text : (landText ?? text.replace(/\.$/, ""));
  const b = block !== "none" ? tween(frame, at + 12, at + 21, 0, 1, EASE.expoOut) : 0;
  const ink = color ?? (world === "night" && block !== "amber" ? NIGHT.text : DAY.text);
  const bg =
    b > 0
      ? `linear-gradient(90deg, ${block === "amber" ? BRAND.beacon : BRAND.mist} ${b * 100}%, transparent ${b * 100}%)`
      : undefined;
  return (
    <div style={{ position: "absolute", left: lerp(from.x, to.x, d), top: lerp(from.y, to.y, d), whiteSpace: "nowrap", zIndex: 5 }}>
      {block === "amber" && b > 0 ? <Bloom cx={size * 3.2} cy={size * 0.62} w={size * 8} h={size * 2.2} strength={0.28 * b * (1 - d)} /> : null}
      <MaskLine at={at} dur={12} style={{ overflow: d > 0 ? "visible" : "hidden" }}>
        <span
          style={{
            position: "relative",
            display: "inline-block",
            fontFamily: font === "mono" ? FONT.mono : FONT.sans,
            fontSize: size,
            lineHeight: 1.25,
            fontWeight: weight,
            letterSpacing: `${track}em`,
            color: ink,
            padding: `0 ${0.12 * size}px`,
            margin: `0 ${-0.12 * size}px`,
            borderRadius: lerp(0.14 * size, 8, d),
            background: bg,
            backgroundBlendMode: block === "mist" ? "multiply" : undefined,
            boxShadow: block === "amber" && b > 0.5 ? `0 0 ${lerp(40, 14, d)}px ${amber(0.4)}` : undefined,
          }}
        >
          {words}
        </span>
      </MaskLine>
    </div>
  );
};

/** The three type devices together (V5.md calls them EditType). */
export const EditType = { MaskLine, EditLine, TypeToUI } as const;
