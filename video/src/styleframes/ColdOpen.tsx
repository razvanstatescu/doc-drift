import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { LabelChip } from "../scenes/A0/PlateCard";
import { type A0Plate, type Box, PLATES, type PlateId } from "../scenes/A0/plates";
import { BRAND, DAY, ELEV, FONT, ink, NIGHT, sweep, T, white } from "./look";
import { InkLabel } from "./Stage";

/**
 * The cold open as a style test: the same barrage moment in two materials.
 * - "dark" is v3's look: true black, every page graded down (brightness 0.6), the page dimmed around its lit sentence,
 *   a teal underline, white captions, dark source chips.
 * - "light" is the Day proposal: real pages as white sheets on the Paper sweep, lifted by the elevation scale, the rest
 *   of each page washed toward white instead of darkened, the key phrase on a Mist band with a Current underline,
 *   Fathom captions, ink source chips. No amber anywhere (the first amber pixel is still the reveal's slip).
 * Same plates, same crops, same positions: only the material changes.
 */
export type CoVariant = "light" | "dark";
export type CoBar = 1 | 2 | 3;

type Placed = {
  id: PlateId;
  cx: number;
  cy: number;
  w: number;
  rot?: number;
  /** The plate read in this beat (lit, sharp, raised). Others are texture (washed, soft, low). */
  subject?: boolean;
  crop?: Box;
};

const b = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

const BARS: Record<CoBar, { caption: string; sheets: Placed[] }> = {
  1: {
    caption: "The code moved.",
    sheets: [
      { id: "wisdom", cx: 250, cy: 360, w: 1100, rot: 1.4 },
      { id: "willison", cx: 1690, cy: 345, w: 1000, rot: -1.1 },
      { id: "arxivDrift", cx: 330, cy: 975, w: 1300, rot: -1.5, crop: b(0, 160, 3055, 520) },
      { id: "hn2026", cx: 1600, cy: 960, w: 1400, rot: 1.2 },
      { id: "sreBook", cx: 975, cy: 625, w: 1480, subject: true },
    ],
  },
  2: {
    caption: "The docs didn't.",
    sheets: [
      { id: "soBlog", cx: 300, cy: 318, w: 1050, rot: -1 },
      { id: "mojRunbook", cx: 1590, cy: 318, w: 1150, rot: 1.2 },
      { id: "register", cx: 340, cy: 1012, w: 1300, rot: -1.4 },
      { id: "ghSurvey", cx: 1660, cy: 1030, w: 950, rot: 1, crop: b(0, 380, 1920, 453) },
      { id: "wikimedia", cx: 960, cy: 652, w: 1360, subject: true },
    ],
  },
  3: {
    caption: "The agents can't tell.",
    sheets: [
      { id: "rovoCommunity", cx: 330, cy: 335, w: 1250, rot: -1.2, crop: b(0, 380, 3840, 380) },
      { id: "staleFiles", cx: 1600, cy: 330, w: 1250, rot: 1 },
      { id: "stalePoisoning", cx: 320, cy: 975, w: 1050, rot: -1.2, crop: b(0, 165, 3055, 560) },
      { id: "copilot", cx: 1620, cy: 985, w: 960, rot: 1.2, crop: b(0, 520, 2589, 369) },
      { id: "atlassian", cx: 960, cy: 640, w: 1500, subject: true, crop: b(716, 40, 2040, 340) },
    ],
  },
};

/** Key-phrase boxes on the same line, merged (two phrases that touch read as one marked run). */
const mergeLines = (ls: Box[]): Box[] => {
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

/** One sheet of a real page in the chosen material. */
const Sheet: React.FC<{ s: Placed; v: CoVariant }> = ({ s, v }) => {
  const plate: A0Plate = PLATES[s.id];
  const r = s.crop ?? plate.region;
  const k = s.w / r.w;
  const h = r.h * k;
  const light = v === "light";
  const lit = !!s.subject;
  const at = (bx: Box, pad = 0) => ({ x: (bx.x - r.x) * k - pad, y: (bx.y - r.y) * k - pad * 0.7, w: bx.w * k + 2 * pad, h: bx.h * k + pad * 1.8 });

  // The spot: everything but the key sentence is washed (light) or darkened (dark). Texture plates get it whole.
  const holes = lit
    ? plate.spot
        .map((l) => {
          const a = at(l, l.h * k * 0.35);
          return `M${a.x} ${a.y}H${a.x + a.w}V${a.y + a.h}H${a.x}Z`;
        })
        .join(" ")
    : "";
  const veil = light ? (lit ? white(0.62) : white(0.5)) : `rgba(0,0,0,${lit ? 0.41 : 0.3})`;
  // every page keeps its source on screen, sharp even when the page is soft; kept inside the frame
  const left = s.cx - s.w / 2;
  // texture labels hug the frame side the plate sits on, and the side of the plate away from the subject
  const onRight = !lit && s.cx > 960;
  const labelPos: React.CSSProperties = lit
    ? { left: 0, top: h + 18 }
    : {
        ...(onRight ? { right: Math.max(8, left + s.w - 1864) } : { left: Math.max(8, 56 - left) }),
        top: s.cy > 700 ? -50 : h + 12,
      };

  return (
    <div
      style={{
        position: "absolute",
        left,
        top: s.cy - h / 2,
        width: s.w,
        height: h,
        transform: s.rot ? `rotate(${s.rot}deg)` : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: light ? 12 : 6,
          overflow: "hidden",
          background: light ? DAY.surface : "#999999",
          boxShadow: light ? ELEV[lit ? 4 : 2] : lit ? "0 30px 80px rgba(0,0,0,0.7)" : "0 16px 40px rgba(0,0,0,0.6)",
          filter: lit ? undefined : `blur(${light ? 3 : 2.5}px)`,
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
            filter: light ? "saturate(0.82)" : `brightness(${lit ? 0.6 : 0.42})`,
          }}
        />
        {/* the key phrase's band sits UNDER the ink (multiply), so the words stay exactly as printed */}
        {light && lit
          ? mergeLines(plate.lines).map((l, i) => {
              const a = at(l, l.h * k * 0.22);
              return (
                <div
                  key={`band${i}`}
                  style={{ position: "absolute", left: a.x, top: a.y, width: a.w, height: a.h, background: BRAND.mist, mixBlendMode: "multiply", borderRadius: 4 }}
                />
              );
            })
          : null}
        <svg width={s.w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
          <path d={`M-10 -10H${s.w + 10}V${h + 10}H-10Z ${holes}`} fillRule="evenodd" fill={veil} />
        </svg>
        {lit
          ? (light ? mergeLines(plate.lines) : plate.lines).map((l, i) => {
              const a = at(l);
              return (
                <div
                  key={`u${i}`}
                  style={{
                    position: "absolute",
                    left: a.x,
                    top: a.y + a.h + Math.max(3, 4 * k),
                    width: a.w,
                    height: Math.max(5, 10 * k),
                    borderRadius: 4,
                    background: light ? BRAND.current : NIGHT.link,
                  }}
                />
              );
            })
          : null}
      </div>
      <div style={{ position: "absolute", ...labelPos }}>
        {light ? (
          <InkLabel size={lit ? 26 : 20}>{plate.label}</InkLabel>
        ) : (
          <LabelChip text={plate.label} size={lit ? 26 : 20} />
        )}
      </div>
    </div>
  );
};

export const ColdOpenFrame: React.FC<{ variant: CoVariant; bar: CoBar }> = ({ variant, bar }) => {
  const light = variant === "light";
  const cfg = BARS[bar];
  const textures = cfg.sheets.filter((s) => !s.subject);
  const subject = cfg.sheets.filter((s) => s.subject);
  return (
    <AbsoluteFill style={{ background: light ? sweep("50%", "58%") : "#000", overflow: "hidden" }}>
      {textures.map((s) => (
        <Sheet key={s.id} s={s} v={variant} />
      ))}
      {/* the caption band: the ground rises over the texture so the statement never sits on a page */}
      <AbsoluteFill
        style={{
          background: light
            ? `linear-gradient(180deg, ${DAY.ground} 0%, ${DAY.ground}F2 150px, ${DAY.ground}00 330px)`
            : "linear-gradient(180deg, #000 0%, #000000F0 150px, #00000000 330px)",
        }}
      />
      {subject.map((s) => (
        <Sheet key={s.id} s={s} v={variant} />
      ))}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 62 }}>
        <div style={{ ...T.display, color: light ? DAY.text : NIGHT.text, textAlign: "center", whiteSpace: "nowrap" }}>{cfg.caption}</div>
      </AbsoluteFill>
      {light ? null : <AbsoluteFill style={{ boxShadow: `inset 0 0 240px ${ink(0)}` }} />}
    </AbsoluteFill>
  );
};

/** Light and dark side by side at half size, labelled, for the comparison board. */
export const ColdOpenCompare: React.FC<{ bar: CoBar }> = ({ bar }) => {
  const scale = 0.48;
  const pw = 1920 * scale;
  const ph = 1080 * scale;
  const gap = 32;
  const left = (1920 - 2 * pw - gap) / 2;
  const top = (1080 - ph) / 2 + 36;
  const panel = (v: CoVariant, x: number, title: string, note: string) => (
    <div style={{ position: "absolute", left: x, top: top - 92 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 26 }}>
        <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 40, color: DAY.text }}>{title}</span>
        <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 26, color: DAY.textMuted }}>{note}</span>
      </div>
      <div style={{ width: pw, height: ph, borderRadius: 18, overflow: "hidden", boxShadow: ELEV[3], position: "relative" }}>
        <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "0 0", position: "absolute" }}>
          <ColdOpenFrame variant={v} bar={bar} />
        </div>
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: sweep("50%", "50%") }}>
      {panel("light", left, "Day", "proposed: pages as paper")}
      {panel("dark", left + pw + gap, "Night", "v3: pages graded into the dark")}
    </AbsoluteFill>
  );
};
