import React from "react";
import { Icon } from "../../brand/icons";
import { DAY, FONT } from "../../v4/look";
import { CURRENT, elevShadow, SHEET } from "./paper";

/**
 * Frame 0 (v4, Day): our own diff card as a white sheet on the desk. It must read with the sound off: "The code moved."
 * over a merged rename. Diff tints are the one place state colours may appear outside a badge (R2 section 6); the new
 * path gets the Current underline on beat 2. No amber: the first amber of the film is the slip at R.
 * Fixed layout (film px at camera zoom 1) so the camera can aim at the rows: DIFF_SIZE and DIFF_ROWS_CY.
 */
export const OLD_PATH = "scripts/rollback.sh";
export const NEW_PATH = "scripts/rollback-v2.sh";

const PAD = { top: 46, side: 56, bottom: 54 };
const CHIP_H = 64;
const GAP = 34;
const ROW_H = 96;
const ROW_GAP = 10;
const MONO = 62;
export const DIFF_SIZE = { w: 1120, h: PAD.top + CHIP_H + GAP + ROW_H * 2 + ROW_GAP + PAD.bottom };
/** The two rows' centre, from the sheet's top (the punch-in's target). */
export const DIFF_ROWS_CY = PAD.top + CHIP_H + GAP + ROW_H + ROW_GAP / 2;

const Row: React.FC<{ sign: "-" | "+"; path: string; tint: string; signColor: string; color: string; under?: number }> = ({
  sign,
  path,
  tint,
  signColor,
  color,
  under = 0,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      height: ROW_H,
      padding: "0 26px",
      borderRadius: 14,
      background: tint,
      fontFamily: FONT.mono,
      fontWeight: 500,
      fontSize: MONO,
      letterSpacing: "-0.015em",
      whiteSpace: "pre",
      color,
    }}
  >
    <span style={{ color: signColor, width: "1.2ch", display: "inline-block" }}>{sign === "-" ? "−" : "+"}</span>
    <span style={{ position: "relative" }}>
      {path}
      {under > 0 ? (
        <span
          style={{ position: "absolute", left: 0, bottom: -12, width: `${under * 100}%`, height: 9, borderRadius: 99, background: CURRENT }}
        />
      ) : null}
    </span>
  </div>
);

export const DiffSheet: React.FC<{ elev: number; under: number }> = ({ elev, under }) => (
  <div
    style={{
      width: DIFF_SIZE.w,
      height: DIFF_SIZE.h,
      boxSizing: "border-box",
      padding: `${PAD.top}px ${PAD.side}px ${PAD.bottom}px`,
      borderRadius: 26,
      background: SHEET,
      boxShadow: elevShadow(elev),
    }}
  >
    <div style={{ display: "flex" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          height: CHIP_H,
          padding: "0 26px 0 20px",
          borderRadius: 16,
          background: DAY.surfaceSunk,
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: 34,
          letterSpacing: "0.003em",
          color: DAY.text,
        }}
      >
        <Icon name="merge" size={36} color={DAY.textMuted} stroke={1.9} />
        Merged
      </div>
    </div>
    <div style={{ marginTop: GAP, display: "flex", flexDirection: "column", gap: ROW_GAP }}>
      <Row sign="-" path={OLD_PATH} tint={DAY.staleTint} signColor={DAY.stale} color={DAY.textMuted} />
      <Row sign="+" path={NEW_PATH} tint={DAY.verifiedTint} signColor={DAY.verified} color={DAY.text} under={under} />
    </div>
  </div>
);
