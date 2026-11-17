import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../../brand/icons";
import { AppTile } from "../../../components/P4/ui";
import { EASE, tween } from "../../../lib/time";
import { amber, BRAND, current, DAY, elevAt, FONT, NIGHT } from "../../../v4/kit";
import { textWidth } from "../../../v4/twins";

/**
 * FIX's crafted pieces (v5 round 3; nothing here draws on a real capture):
 *   ReaderChip   PROMISE's reader chips (same size and look): a tile, a label, and a status line whose words slip-swap
 *                ("Read only", "Edits the page", "Verified", "Safe to cite"), as the byline's words do
 *   DraftCard    our agent's draft, big: the step's setting line on one baseline and one size; the old name sits on the
 *                drift's amber, then "_SECS" is written in by a wipe while "=300" moves along (no empty frame)
 *   Clock307     a small 03:07 chip for the 3 a.m. payoff (Night)
 */

// ---------------------------------------------------------------------------------------------------------------------
// Reader chips (PROMISE's look: 400 x 100, a 58 px tile, a 31 px label over a 25 px status line)
// ---------------------------------------------------------------------------------------------------------------------

export const CHIP = { w: 400, h: 100, tile: 58 } as const;

export type ChipStatus = { icon: IconName | "lock" | "pencil"; text: string };

/** A 20-grid glyph we lack in the brand set (drawn in the brand's stroke). */
const Glyph: React.FC<{ name: ChipStatus["icon"]; size: number; color: string }> = ({ name, size, color }) => {
  if (name === "lock")
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="9" width="12" height="8.5" rx="2" />
        <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
      </svg>
    );
  if (name === "pencil")
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12.5 4.5l3 3L7 16H4v-3z" />
        <path d="M10.5 6.5l3 3" />
      </svg>
    );
  return <Icon name={name} size={size} color={color} />;
};

const StatusWords: React.FC<{ s: ChipStatus; color: string }> = ({ s, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <Glyph name={s.icon} size={25} color={color} />
    {s.text}
  </span>
);

/**
 * One reader chip. It lifts in at `at` (12 frames) unless `appear` (on screen from the start). Its status line
 * slip-swaps from `status` to `next.status` around `next.at` (old words gone at `at`, new readable at `at + 3`).
 */
export const ReaderChip: React.FC<{
  icon?: IconName;
  tile?: React.ReactNode;
  label: string;
  status: ChipStatus;
  next?: { status: ChipStatus; at: number; tone?: "verified" };
  x: number;
  y: number;
  at?: number;
  appear?: boolean;
}> = ({ icon, tile, label, status, next, x, y, at = 0, appear = false }) => {
  const frame = useCurrentFrame();
  if (!appear && frame < at) return null;
  const up = appear ? 1 : tween(frame, at, at + 12, 0, 1, EASE.expoOut);
  const out = next ? tween(frame, next.at - 3, next.at, 0, 1, EASE.expoIn) : 0;
  const inn = next ? tween(frame, next.at, next.at + 3, 0, 1, EASE.expoOut) : 0;
  const unit = 18;
  const swapped = next && frame >= next.at;
  const nextColor = next?.tone === "verified" ? DAY.verified : DAY.text;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: CHIP.w,
        height: CHIP.h,
        opacity: appear ? 1 : Math.min(1, (frame - at + 1) / 3),
        transform: `translateY(${((1 - up) * 24).toFixed(2)}px)`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: 24, background: DAY.surface, boxShadow: elevAt(1 + 2 * up) }} />
      <div
        style={{
          position: "absolute",
          left: 21,
          top: (CHIP.h - CHIP.tile) / 2,
          width: CHIP.tile,
          height: CHIP.tile,
          borderRadius: 16,
          background: DAY.surfaceSunk,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        {tile ?? (icon ? <Icon name={icon} size={32} color={DAY.text} /> : null)}
      </div>
      <div style={{ position: "absolute", left: 21 + CHIP.tile + 18, top: 15, right: 12, fontFamily: FONT.sans, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 31, fontWeight: 600, lineHeight: "38px", letterSpacing: "-0.01em", color: DAY.text }}>{label}</div>
        <div style={{ position: "relative", height: 32, fontSize: 25, fontWeight: 500, lineHeight: "32px", color: DAY.text }}>
          {!swapped ? (
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: out > 0 ? `translateX(${(out * unit).toFixed(2)}px)` : undefined,
                clipPath: out > 0 ? `inset(-20% 0 -20% ${(out * 100).toFixed(1)}%)` : undefined,
              }}
            >
              <StatusWords s={status} color={DAY.text} />
            </span>
          ) : (
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                color: nextColor,
                transform: inn < 1 ? `translateX(${(-(1 - inn) * unit).toFixed(2)}px)` : undefined,
                clipPath: inn < 1 ? `inset(-20% ${((1 - inn) * 100).toFixed(1)}% -20% 0)` : undefined,
              }}
            >
              <StatusWords s={next!.status} color={nextColor} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/** Our mark as a chip tile (Drift Reviewer is our agent). */
export const MarkTile: React.FC = () => <AppTile size={44} />;

// ---------------------------------------------------------------------------------------------------------------------
// The draft, big
// ---------------------------------------------------------------------------------------------------------------------

const PRE = "export ";
const OLD = "ROLLBACK_TIMEOUT";
const ADD = "_SECS";
const POST = "=300";
const CODE = 44;
const PAD = 36;
const WELL = 28;
/** The draft card: sized to its code line (44 px mono, one line) in a code well, under a 44 px head. */
export const DRAFT = (() => {
  const lineH = CODE * 1.3;
  const w = Math.ceil(textWidth(PRE + OLD + ADD + POST, { size: CODE, mono: true }) + 2 * WELL + 2 * PAD);
  const h = Math.ceil(PAD - 6 + 44 + 20 + lineH + 40 + PAD);
  return { w, h, code: CODE, pad: PAD, well: WELL, lineH };
})();
/** The code line's text box inside the card (film px from the card's top-left), for morphs and marks. */
export const draftCodeRect = (x: number, y: number) => ({
  x: x + PAD + WELL,
  y: y + PAD - 6 + 44 + 20 + 20,
  w: textWidth(PRE + OLD + ADD + POST, { size: CODE, mono: true }),
  h: DRAFT.lineH,
});

/**
 * Our agent's draft as one big card: a small "Draft · Drift Reviewer" head, then the step's setting line in a code well,
 * on one baseline and one size. From `drift` the old name sits on the drift's amber block (crafted, under the words);
 * on `replace` a wipe writes "_SECS" in after it while "=300" moves along and the amber leaves (no empty frame: the
 * shared "ROLLBACK_TIMEOUT" never moves). The new words get a Current underline.
 */
export const DraftCard: React.FC<{ x: number; y: number; drift: number; replace: number }> = ({ x, y, drift, replace }) => {
  const frame = useCurrentFrame();
  const size = DRAFT.code;
  const preW = textWidth(PRE, { size, mono: true });
  const oldW = textWidth(OLD, { size, mono: true });
  const addW = textWidth(ADD, { size, mono: true });
  const amberIn = tween(frame, drift, drift + 8, 0, 1, EASE.expoOut);
  const wipe = tween(frame, replace, replace + 9, 0, 1, EASE.expoInOut);
  const amberOut = tween(frame, replace, replace + 6, 0, 1, EASE.expoIn);
  const under = tween(frame, replace + 9, replace + 19, 0, 1, EASE.expoOut);
  const lineH = DRAFT.lineH;
  const text: React.CSSProperties = { position: "absolute", top: 0, fontFamily: FONT.mono, fontSize: size, lineHeight: `${lineH}px`, letterSpacing: 0, color: DAY.text, whiteSpace: "pre" };
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: DRAFT.w,
        height: DRAFT.h,
        boxSizing: "border-box",
        padding: `${DRAFT.pad - 6}px ${DRAFT.pad}px`,
        borderRadius: 30,
        background: DAY.surface,
        boxShadow: elevAt(3),
        fontFamily: FONT.sans,
        color: DAY.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: 44 }}>
        <AppTile size={40} />
        <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em" }}>Draft</span>
        <span style={{ fontSize: 26, fontWeight: 500, color: DAY.textMuted }}>· Drift Reviewer</span>
      </div>
      <div style={{ position: "relative", marginTop: 20, height: lineH + 40, borderRadius: 18, background: DAY.surfaceSunk }}>
        <div style={{ position: "absolute", left: DRAFT.well, top: 20, height: lineH }}>
          {/* the drift's amber under the old name (crafted); it leaves as the new words are written */}
          {amberIn > 0 && amberOut < 1 ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: preW - 6,
                top: 0,
                width: oldW + 12,
                height: lineH,
                borderRadius: 10,
                background: BRAND.beacon,
                boxShadow: `0 0 26px ${amber(0.4 * amberIn * (1 - amberOut))}`,
                clipPath: `inset(-40% ${((1 - amberIn) * 100).toFixed(1)}% -40% ${(amberOut * 100).toFixed(1)}%)`,
              }}
            />
          ) : null}
          <span style={{ ...text, left: 0 }}>{PRE + OLD}</span>
          {/* "_SECS" written in by a wipe, "=300" moving along with the wipe's edge */}
          <span style={{ ...text, left: preW + oldW, clipPath: `inset(-20% ${((1 - wipe) * 100).toFixed(2)}% -20% 0)` }}>{ADD}</span>
          <span style={{ ...text, left: preW + oldW + addW * wipe }}>{POST}</span>
          {under > 0 ? (
            <div style={{ position: "absolute", left: preW, top: lineH - 6, width: (oldW + addW) * under, height: 4, borderRadius: 2, background: current(0.9) }} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 03:07
// ---------------------------------------------------------------------------------------------------------------------

/** The 3 a.m. clock, small, for the payoff (Night): it tells the return without a word. */
export const Clock307: React.FC<{ at: number; x?: number; y?: number }> = ({ at, x = 64, y = 56 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const up = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        height: 52,
        padding: "0 20px 0 16px",
        borderRadius: 16,
        background: NIGHT.surface,
        boxShadow: `inset 0 0 0 1.5px ${NIGHT.line}`,
        color: NIGHT.text,
        fontFamily: FONT.mono,
        fontSize: 30,
        letterSpacing: "0.02em",
        opacity: Math.min(1, up * 3),
        transform: `translateY(${((1 - up) * 12).toFixed(2)}px)`,
      }}
    >
      <Icon name="clock" size={26} color={NIGHT.text} />
      03:07
    </div>
  );
};
