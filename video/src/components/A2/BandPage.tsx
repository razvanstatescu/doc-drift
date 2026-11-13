import React from "react";
import { interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { Badge } from "../../brand/Badge";
import { Icon } from "../../brand/icons";
import { DAY, FONT, SLIP_UNIT } from "../../brand/tokens";
import { clamp } from "../../lib/time";
import { setInProgress } from "../../motion/text";
import { Slip, slipProgress } from "../../motion/slip";
import { RUNBOOK_TITLE } from "../A1/runbook";

/**
 * The runbook drawn as the brand's three bands (A2): a page card whose body is the mark's D rhythm, 94 : 12 : 60 : 12 :
 * 94 on the logo grid. A page has sections; each band is one. When an anchor changes, the matching band slips one
 * unit right in amber, leaving its trace, and the Possibly stale badge sets inside it: the slipped band IS the badge,
 * so the shot keeps exactly one amber element. Frame px at zoom 1; the card fills the title-safe height.
 */

export const CARD = { x: 192, y: 112, w: 700, h: 856 } as const;
const PAD = 56;
const BANDS_TOP = CARD.y + 290;
const BANDS_TOTAL = 520;
const U = BANDS_TOTAL / 272;
export const BAND_W = 530;
const BAND_X = CARD.x + PAD;
/** The website's three-band glyph: text colour at 92% (site/assets/site.css .bands). */
const BAND_OPACITY = 0.92;
const BAND_RADIUS = 8 * U; // the mark's 8-unit fillet
/** The badge inside the slipped band (k): 101 px tall in a 115 px band. */
const BADGE_K = 3.6;

export type Box = { x: number; y: number; w: number; h: number };

/** The three bands (top, middle, bottom), frame px. */
export const BANDS: Box[] = (() => {
  const h = [94 * U, 60 * U, 94 * U];
  const g = 12 * U;
  const y0 = BANDS_TOP;
  const y1 = y0 + h[0] + g;
  const y2 = y1 + h[1] + g;
  return [
    { x: BAND_X, y: y0, w: BAND_W, h: h[0] },
    { x: BAND_X, y: y1, w: BAND_W, h: h[1] },
    { x: BAND_X, y: y2, w: BAND_W, h: h[2] },
  ];
})();

/** How far the middle band has slipped at `frame`, px (follows the kit's slip curve). */
export const bandSlipPx = (frame: number, at: number) => slipProgress(frame, at) * SLIP_UNIT * BAND_W;

export const BandPage: React.FC<{
  /** The middle band slips out of line here (V08 "flagged"). */
  slipAt: number;
  /** The badge sets inside the slipped band here (V08 "Possibly stale"). */
  stateAt: number;
}> = ({ slipAt, stateAt }) => {
  const frame = useCurrentFrame();
  const s = slipProgress(frame, slipAt);
  const fill = interpolateColors(s, [0, 1], [DAY.text, DAY.beacon]);
  const st = setInProgress(frame, stateAt, 12);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
          borderRadius: 28,
          background: DAY.surface,
          boxShadow: `0 0 0 2px ${DAY.line}`,
        }}
      />
      <div style={{ position: "absolute", left: BAND_X, top: CARD.y + 50, display: "flex", alignItems: "center", gap: 14 }}>
        <Icon name="page" size={40} color={DAY.textMuted} />
        <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 36, lineHeight: "40px", color: DAY.textMuted }}>Runbook</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: BAND_X,
          top: CARD.y + 106,
          width: CARD.w - 2 * PAD,
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: 60,
          lineHeight: "66px",
          letterSpacing: "-0.02em",
          color: DAY.text,
        }}
      >
        {RUNBOOK_TITLE}
      </div>
      {[0, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: BANDS[i].x,
            top: BANDS[i].y,
            width: BANDS[i].w,
            height: BANDS[i].h,
            borderRadius: BAND_RADIUS,
            background: DAY.text,
            opacity: BAND_OPACITY,
          }}
        />
      ))}
      <div style={{ position: "absolute", left: BANDS[1].x, top: BANDS[1].y }}>
        <Slip at={slipAt} radius={BAND_RADIUS} k={3} theme="day">
          <div
            style={{
              width: BAND_W,
              height: BANDS[1].h,
              borderRadius: BAND_RADIUS,
              background: fill,
              opacity: BAND_OPACITY + (1 - BAND_OPACITY) * s,
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {st > 0 ? (
              <div style={{ opacity: interpolate(st, [0, 0.45], [0, 1], clamp), transform: `translateY(${(1 - st) * 40}%)` }}>
                <Badge state="possibly_stale" size={BADGE_K} theme="day" />
              </div>
            ) : null}
          </div>
        </Slip>
      </div>
    </div>
  );
};
