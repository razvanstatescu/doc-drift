import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../../brand/icons";
import { AppTile } from "../../../components/P4/ui";
import { EASE, tween } from "../../../lib/time";
import { amber, BRAND, DAY, EditLine, elevAt, FONT } from "../../../v4/kit";
import { textWidth } from "../../../v4/twins";

/**
 * FIX's crafted pieces (v5 round 2: crafted leads, short real proofs; video/V5.md section 8). Nothing here draws on a
 * real capture.
 *   ReaderChip     PROMISE's reader chips (same size and look): a tile, a label, and a status line whose words slip-swap
 *                  ("Read only", "Edits the page", "Safe to cite"), as the byline's words do
 *   DraftCard      our agent's draft, big: the step's setting line as an EditLine (`ROLLBACK_TIMEOUT` struck and
 *                  replaced by `ROLLBACK_TIMEOUT_SECS`)
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

export const DRAFT = { w: 1180, h: 300, code: 50, pad: 40 } as const;
/** Where the code line sits inside the card (film px from the card's top-left), for morphs and marks. */
export const draftCodeRect = (x: number, y: number) => ({ x: x + DRAFT.pad + 30, y: y + 128, w: 0.6 * DRAFT.code * 32, h: DRAFT.code * 1.3 });

/**
 * Our agent's draft as one big card: a small "Draft · Drift Reviewer" head, then the step's setting line in a code well,
 * edited in place by the kit's EditLine (strike, then replace on "timeout"). The old name is the drift: from `drift` it
 * sits on the drift's amber block (crafted, under the words), which leaves with the old words on `replace`. `accepted`
 * 0..1 turns the head to "Accepted" with a check (the person's click on Accept fix).
 */
export const DraftCard: React.FC<{ x: number; y: number; drift: number; strike: number; replace: number; accepted?: number }> = ({
  x,
  y,
  drift,
  strike,
  replace,
  accepted = 0,
}) => {
  const frame = useCurrentFrame();
  const inn = tween(frame, drift, drift + 8, 0, 1, EASE.expoOut);
  const out = tween(frame, replace, replace + 5, 0, 1, EASE.expoIn);
  const preW = textWidth("export ", { size: DRAFT.code, mono: true });
  const oldW = textWidth("ROLLBACK_TIMEOUT", { size: DRAFT.code, mono: true });
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
      <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em" }}>{accepted >= 0.5 ? "Accepted" : "Draft"}</span>
      <span style={{ fontSize: 26, fontWeight: 500, color: DAY.textMuted }}>· Drift Reviewer</span>
      {accepted > 0 ? (
        <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: "50%", background: DAY.verified, opacity: accepted, transform: `scale(${(0.6 + 0.4 * accepted).toFixed(3)})` }}>
          <Icon name="check" size={22} color={DAY.surface} />
        </span>
      ) : null}
    </div>
    <div
      style={{
        marginTop: 30,
        padding: "22px 30px",
        borderRadius: 18,
        background: DAY.surfaceSunk,
        display: "flex",
        alignItems: "center",
        height: DRAFT.code * 1.3 + 44,
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "relative" }}>
        {inn > 0 && out < 1 ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: preW - 6,
              top: 0,
              width: oldW + 12,
              height: DRAFT.code * 1.3,
              borderRadius: 10,
              background: BRAND.beacon,
              boxShadow: `0 0 26px ${amber(0.4 * inn * (1 - out))}`,
              clipPath: `inset(-40% ${((1 - inn) * 100).toFixed(1)}% -40% ${(out * 100).toFixed(1)}%)`,
            }}
          />
        ) : null}
        <EditLine pre="export " old="ROLLBACK_TIMEOUT" neu="ROLLBACK_TIMEOUT_SECS" post="=300" size={DRAFT.code} mono strike={strike} replace={replace} style={{ position: "relative" }} />
      </div>
    </div>
  </div>
  );
};
