import React from "react";
import { Img, staticFile } from "remotion";
import { FONT } from "../../brand/tokens";
import { CurrentUnderline, MistBand, white } from "../../v4/kit";
import { elevShadow, SHEET, TEXTURE_BLUR, WASH } from "./paper";
import type { A0Plate, Box } from "./plates";

/**
 * A real page as a sheet of paper on the desk (v4, Day; R2 section 13 frame 1). The plate's words are never changed:
 *   - a TEXTURE sheet is washed 50% toward white and 3 px soft, with its source chip still sharp (drawn by the desk);
 *   - the SUBJECT sheet is crisp, its key sentence exactly as printed and the rest of the page washed 62% toward white;
 *     from `markAt` its key phrase gets the kit's Mist band (multiplied with the page, so the ink stays as printed) and
 *     Current underline, swept left to right line by line (src/v4/kit MistBand / CurrentUnderline with `rect`).
 * `elev` is the sheet's height (0 to 5, continuous: paper.ts), `width` its size in the parent's px.
 */
export const PaperPlate: React.FC<{
  plate: A0Plate;
  width: number;
  role: "subject" | "texture";
  /** Shown part of the plate (plate px). Default: the plate's region. */
  crop?: Box;
  elev?: number;
  /** Subjects: the frame the Mist band starts (the underline follows 3 frames behind; each further line 3 more). */
  markAt?: number;
  /** Frames each mark takes to sweep a line (default 7). */
  markDur?: number;
  /** Override the soft focus (px in the sheet's own space). */
  blur?: number;
  radius?: number;
  /** Subjects: 1 = lit (the default); toward 0 the key sentence washes and the page softens like a texture sheet. */
  lit?: number;
}> = ({ plate, width, role, crop, elev = 2, markAt, markDur = 7, blur, radius = 12, lit = 1 }) => {
  const r = crop ?? plate.region;
  const k = width / r.w;
  const height = r.h * k;
  const subject = role === "subject";
  const soft = blur ?? (subject ? TEXTURE_BLUR * (1 - lit) : TEXTURE_BLUR);
  const at = (bx: Box, pad = 0) => ({ x: (bx.x - r.x) * k - pad, y: (bx.y - r.y) * k - pad * 0.7, w: bx.w * k + 2 * pad, h: bx.h * k + pad * 1.8 });

  // the veil: the whole page washed toward white, with holes at the key sentence on the subject
  const holes = subject
    ? plate.spot
        .map((l) => {
          const a = at(l, l.h * k * 0.35);
          return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}H${(a.x + a.w).toFixed(1)}V${(a.y + a.h).toFixed(1)}H${a.x.toFixed(1)}Z`;
        })
        .join(" ")
    : "";
  const veil = white(subject ? WASH.subject : WASH.texture);
  const lines = subject && markAt !== undefined ? mergeLines(plate.lines) : [];

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: radius,
        background: SHEET,
        boxShadow: elevShadow(elev),
        filter: soft > 0.05 ? `blur(${soft.toFixed(2)}px)` : undefined,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", isolation: "isolate" }}>
        <Img
          src={staticFile(plate.src)}
          style={{ position: "absolute", left: -r.x * k, top: -r.y * k, width: plate.w * k, height: plate.h * k, maxWidth: "none" }}
        />
        <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }}>
          <path d={`M-10 -10H${width + 10}V${height + 10}H-10Z ${holes}`} fillRule="evenodd" fill={veil} />
          {subject && lit < 1 ? <path d={holes} fill={white(WASH.texture * (1 - lit))} /> : null}
        </svg>
        {lines.map((l, i) => {
          const a = at(l);
          const rect = { x: a.x, y: a.y, w: a.w, h: a.h };
          const t0 = (markAt as number) + i * 3;
          return (
            <React.Fragment key={i}>
              <MistBand at={t0} dur={markDur} rect={rect} />
              <CurrentUnderline at={t0 + 3} dur={markDur} rect={rect} />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/** Key-phrase boxes on the same line, merged (two phrases that touch read as one marked run), in reading order. */
export const mergeLines = (ls: Box[]): Box[] => {
  const sorted = [...ls].sort((a, c) => a.y - c.y || a.x - c.x);
  const out: Box[] = [];
  for (const l of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.y - l.y) < l.h * 0.5 && l.x - (last.x + last.w) < 40) {
      const x1 = Math.max(last.x + last.w, l.x + l.w);
      last.y = Math.min(last.y, l.y);
      last.h = Math.max(last.h, l.h);
      last.w = x1 - last.x;
    } else out.push({ ...l });
  }
  return out;
};

/** The source-and-date chip of v1 to v3 (Night). Kept for the style frames (src/styleframes/ColdOpen.tsx). */
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
