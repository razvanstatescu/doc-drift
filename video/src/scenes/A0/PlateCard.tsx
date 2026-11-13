import React from "react";
import { Img, staticFile } from "remotion";
import { FONT } from "../../brand/tokens";
import { type A0Plate, type Box, LIGHT_GRADE, PAGE_GRADED } from "./plates";

/** The underline under a key phrase: Night's link teal (cool; amber is reserved for the reveal). */
const UNDERLINE = "#5FB3BF";

/**
 * A plate (its region) at `width`, drawn INSIDE the barrage pass. `zoom` (>= 1) punches in on the key phrase within
 * the card's own box, pulling it to the centre (capped so the whole phrase stays in); `underline` (0..1) wipes a teal
 * bar under the key phrase, line by line; `spot` (0..1) dims the rest of the page around the key phrase (a grade:
 * the words stay as they are); `dim` (0..1) darkens the whole card (a neighbour while the camera reads a subject).
 * The plate is graded down (`grade`, CSS brightness). With `label`, the card carries its source and date on a chip
 * under it (the tunnel's cards).
 */
export const PlateCard: React.FC<{
  plate: A0Plate;
  width: number;
  zoom?: number;
  focus?: Box;
  underline?: number;
  spot?: number;
  /** With `spot`: false dims the whole card (texture), true keeps the key sentence lit. */
  lit?: boolean;
  dim?: number;
  grade?: number;
  label?: number; // chip font size in the card's px (0 = none)
  radius?: number;
}> = ({ plate, width, zoom = 1, focus, underline = 0, spot = 0, lit = true, dim = 0, grade = LIGHT_GRADE, label = 0, radius = 6 }) => {
  const r = plate.region;
  const k = width / r.w;
  const height = r.h * k;
  const fb = focus ?? plate.key;
  const kx = (fb.x + fb.w / 2 - r.x) * k;
  const ky = (fb.y + fb.h / 2 - r.y) * k;
  const z = Math.min(zoom, Math.max(1, Math.min((0.94 * width) / (fb.w * k), (0.86 * height) / (fb.h * k))));
  const c = z > 1 ? Math.min(1, (z - 1) / 0.25) : 0;
  const total = plate.lines.reduce((a, l) => a + l.w, 0);
  let acc = 0;
  return (
    <div style={{ position: "relative", width, height }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: radius, background: PAGE_GRADED }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: `${kx}px ${ky}px`,
            transform: z > 1 ? `translate(${(width / 2 - kx) * c}px, ${(height / 2 - ky) * c}px) scale(${z})` : undefined,
          }}
        >
          <Img
            src={staticFile(plate.src)}
            style={{
              position: "absolute",
              left: -r.x * k,
              top: -r.y * k,
              width: plate.w * k,
              height: plate.h * k,
              maxWidth: "none",
              filter: `brightness(${grade})`,
            }}
          />
          {underline > 0
            ? plate.lines.map((l, i) => {
                const share = Math.max(0, Math.min(1, (underline * total - acc) / l.w));
                acc += l.w;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: (l.x - r.x) * k,
                      top: (l.y + l.h - r.y) * k + 2 * k,
                      width: l.w * share * k,
                      height: Math.max(4, 11 * k),
                      background: UNDERLINE,
                      borderRadius: 3,
                    }}
                  />
                );
              })
            : null}
          {spot > 0.001 ? <Spotlight plate={plate} k={k} width={width} height={height} amount={spot} lit={lit} /> : null}
        </div>
        {dim > 0.001 ? <div style={{ position: "absolute", inset: 0, background: "#000", opacity: 0.5 * dim }} /> : null}
      </div>
      {label > 0 ? (
        <div style={{ position: "absolute", left: 0, top: height + label * 0.5 }}>
          <LabelChip text={plate.label} size={label} />
        </div>
      ) : null}
    </div>
  );
};

/** How dark the spotlight makes the page around the lit sentence (black at this opacity, times `spot`). */
export const SPOT_DIM = 0.48;

/** Everything but the key phrase's lines, darkened: the eye lands on the phrase (holes padded around each line). */
const Spotlight: React.FC<{ plate: A0Plate; k: number; width: number; height: number; amount: number; lit: boolean }> = ({ plate, k, width, height, amount, lit }) => {
  const r = plate.region;
  const holes = (lit ? plate.spot : [])
    .map((l) => {
      const px = l.h * 0.35;
      const x0 = (l.x - r.x - px) * k;
      const y0 = (l.y - r.y - px * 0.7) * k;
      const x1 = (l.x + l.w - r.x + px) * k;
      const y1 = (l.y + l.h - r.y + px * 1.1) * k;
      return `M${x0} ${y0}H${x1}V${y1}H${x0}Z`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={`M-4000 -4000H${width + 4000}V${height + 4000}H-4000Z ${holes}`} fillRule="evenodd" fill="#000" opacity={SPOT_DIM * amount} />
    </svg>
  );
};

/** The source-and-date chip (ours): small, Night sunk with a hairline, Spline Sans 500. Used inside and outside the pass. */
export const LabelChip: React.FC<{ text: string; size?: number; style?: React.CSSProperties }> = ({ text, size = 26, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      height: size * 1.72,
      padding: `0 ${size * 0.62}px`,
      borderRadius: size * 0.3,
      background: "rgba(5, 25, 31, 0.88)",
      boxShadow: `0 0 0 ${Math.max(1, size * 0.04)}px rgba(79, 137, 148, 0.45)`,
      color: "#F2F6F7",
      fontFamily: FONT.sans,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: "0.005em",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {text}
  </div>
);

/** Fit a plate region inside a box (contain). */
export const fitWidth = (plate: A0Plate, boxW: number, boxH: number) => Math.min(boxW, boxH * (plate.region.w / plate.region.h));
