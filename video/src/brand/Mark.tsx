import React, { useId } from "react";
import { interpolateColors, useCurrentFrame } from "remotion";
import { EASE, tween } from "../lib/time";

/**
 * The Doc Drift Sentinel mark, built from the EXACT paths of public/brand/doc-drift-icon.svg (and the light and flat
 * files, which share them). Never redraw it. On the 512 grid: tile, top band, bottom band, trace, slipped band.
 *
 * Only the slipped band may move (brand/logo.md): `slip` slides it from the trace position (0, in line with the D) to
 * its drawn position (1, +56 units). At slip = 1, land = 1, tile = 1 the output is the file's artwork exactly.
 * `land` reveals the bands with a left-to-right wipe (the artwork is uncovered, never moved).
 */

// ---- the artwork's paths, verbatim ----
const TILE =
  "M332.8 0c62.726 0 94.089 0 118.047 12.207a112 112 0 0 1 48.946 48.946c12.207 23.958 12.207 55.321 12.207 118.047L512 332.8c0 62.726 0 94.089 -12.207 118.047a112 112 0 0 1 -48.946 48.946c-23.958 12.207 -55.321 12.207 -118.047 12.207L179.2 512c-62.726 0 -94.089 0 -118.047 -12.207a112 112 0 0 1 -48.946 -48.946c-12.207 -23.958 -12.207 -55.321 -12.207 -118.047L0 179.2c0 -62.726 0 -94.089 12.207 -118.047a112 112 0 0 1 48.946 -48.946c23.958 -12.207 55.321 -12.207 118.047 -12.207Z";
const DOC_TOP = "M140 120H222A136 136 0 0 1 347.19 202.88A8 8 0 0 1 339.83 214H118A8 8 0 0 1 110 206V150A30 30 0 0 1 140 120Z";
const DOC_BOTTOM = "M118 298H339.83A8 8 0 0 1 347.19 309.12A136 136 0 0 1 222 392H140A30 30 0 0 1 110 362V306A8 8 0 0 1 118 298Z";
const DRIFT_TRACE = "M118 226H348.1A8 8 0 0 1 355.98 232.62A136 136 0 0 1 355.98 279.38A8 8 0 0 1 348.1 286H118A8 8 0 0 1 110 278V234A8 8 0 0 1 118 226Z";
const DRIFT_SLICE = "M174 226H404.1A8 8 0 0 1 411.98 232.62A136 136 0 0 1 411.98 279.38A8 8 0 0 1 404.1 286H174A8 8 0 0 1 166 278V234A8 8 0 0 1 174 226Z";

/** The band's slip on the logo grid (56 of 512 units). */
export const MARK_SLIP_UNITS = 56;

export type MarkVariant = "icon" | "icon-light" | "flat" | "flat-ink";

type IconLook = {
  kind: "icon";
  tile: [string, string];
  lift: { color: string; opacity: number };
  glowOpacity: number;
  doc: [string, string];
  stroke: { color: string; opacity: number };
  trace: { color: string; opacity: number };
};
type FlatLook = { kind: "flat"; band: string; trace: { color: string; opacity: number }; slice: string };

const AMBER: [string, string] = ["#FFD166", "#FF9F1C"];

const LOOKS: Record<MarkVariant, IconLook | FlatLook> = {
  // doc-drift-icon.svg (Night shift tile)
  icon: {
    kind: "icon",
    tile: ["#0E3D48", "#05191F"],
    lift: { color: "#22717E", opacity: 0.5 },
    glowOpacity: 0.4,
    doc: ["#FFFFFF", "#D6E4E7"],
    stroke: { color: "#FFFFFF", opacity: 0.08 },
    trace: { color: "#FFFFFF", opacity: 0.1 },
  },
  // doc-drift-icon-light.svg (Day tile)
  "icon-light": {
    kind: "icon",
    tile: ["#FFFFFF", "#E6EEF0"],
    lift: { color: "#FFFFFF", opacity: 0.8 },
    glowOpacity: 0.28,
    doc: ["#0F3E49", "#072630"],
    stroke: { color: "#0A2F38", opacity: 0.1 },
    trace: { color: "#0A2F38", opacity: 0.09 },
  },
  // doc-drift-mark-reversed.svg (paper on dark grounds)
  flat: { kind: "flat", band: "#F2F6F7", trace: { color: "#F2F6F7", opacity: 0.16 }, slice: "#FFAA1F" },
  // doc-drift-mark.svg (ink on light grounds)
  "flat-ink": { kind: "flat", band: "#0A2F38", trace: { color: "#0A2F38", opacity: 0.14 }, slice: "#FFAA1F" },
};

export type MarkProps = {
  /** Rendered size of the 512 canvas, in px. */
  size: number;
  variant?: MarkVariant;
  /** 0 = the middle band in line with the D (at the trace), 1 = its drawn position (+56 units). Default 1. */
  slip?: number;
  /** 0..1: the middle band's colour, from the D's own colour to the slip amber. Default: follows `slip`. */
  amber?: number;
  /** 0..1: reveal of the bands (left-to-right wipe, top, middle, bottom staggered). Default 1. */
  land?: number;
  /** 0..1: opacity of the tile (icon variants). Default 1. */
  tile?: number;
  /** 0..1: the tile's amber glow (icon variants). Default: follows `amber`. */
  glow?: number;
  style?: React.CSSProperties;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Wipe progress of band i (0 top, 1 middle, 2 bottom) for an overall land progress. */
const bandLand = (land: number, i: number) => {
  if (land >= 1) return 1;
  const start = i * 0.18;
  return EASE.expoOut(clamp01((land - start) / (1 - 2 * 0.18)));
};

export const Mark: React.FC<MarkProps> = ({ size, variant = "icon", slip = 1, amber, land = 1, tile = 1, glow, style }) => {
  const uid = "dds" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const look = LOOKS[variant];
  const a = clamp01(amber ?? slip);
  const g = clamp01(glow ?? a);
  const dx = -MARK_SLIP_UNITS * (1 - slip);
  const l = [bandLand(land, 0), bandLand(land, 1), bandLand(land, 2)];
  // Wipe clips, in each band's own coordinates (the D spans x 110..358; the slice 166..414).
  const clipW = (p: number, from: number, to: number) => (p >= 1 ? 1000 : from + (to - from) * p);

  let middleFill: string;
  let defs: React.ReactNode;
  if (look.kind === "icon") {
    // The D's gradient sampled across the middle band (y 226..286 of 120..392), blended toward the slip amber.
    const docAt = (y: number) => interpolateColors((y - 120) / 272, [0, 1], look.doc);
    const m1 = interpolateColors(a, [0, 1], [docAt(226), AMBER[0]]);
    const m2 = interpolateColors(a, [0, 1], [docAt(286), AMBER[1]]);
    middleFill = `url(#${uid}-mid)`;
    defs = (
      <defs>
        <linearGradient id={`${uid}-tile`} x1="0" y1="0" x2="0" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={look.tile[0]} />
          <stop offset="1" stopColor={look.tile[1]} />
        </linearGradient>
        <radialGradient id={`${uid}-lift`} cx="140" cy="60" r="380" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={look.lift.color} stopOpacity={look.lift.opacity} />
          <stop offset="1" stopColor={look.lift.color} stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={`${uid}-glow`}
          cx="290"
          cy="256"
          r="178.56"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0 256) scale(1 0.5) translate(0 -256)"
        >
          <stop offset="0" stopColor="#FFB224" stopOpacity={look.glowOpacity} />
          <stop offset="1" stopColor="#FFB224" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-doc`} x1="0" y1="120" x2="0" y2="392" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={look.doc[0]} />
          <stop offset="1" stopColor={look.doc[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-mid`} x1="0" y1="226" x2="0" y2="286" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={m1} />
          <stop offset="1" stopColor={m2} />
        </linearGradient>
        {wipeClips(uid, l, clipW)}
      </defs>
    );
  } else {
    middleFill = interpolateColors(a, [0, 1], [look.band, look.slice]);
    defs = <defs>{wipeClips(uid, l, clipW)}</defs>;
  }

  const bandFill = look.kind === "icon" ? `url(#${uid}-doc)` : look.band;
  const trace = look.trace;

  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={{ display: "block", overflow: "visible", ...style }} aria-label="Doc Drift Sentinel logo">
      {defs}
      {look.kind === "icon" && tile > 0 ? (
        <g opacity={tile}>
          <path d={TILE} fill={`url(#${uid}-tile)`} />
          <path d={TILE} fill={`url(#${uid}-lift)`} />
          {g > 0 ? <path d={TILE} fill={`url(#${uid}-glow)`} opacity={g} /> : null}
          <path d={TILE} fill="none" stroke={look.stroke.color} strokeOpacity={look.stroke.opacity} strokeWidth={2} />
        </g>
      ) : null}
      <g>
        {l[0] > 0 ? <path d={DOC_TOP} fill={bandFill} clipPath={l[0] < 1 ? `url(#${uid}-c0)` : undefined} /> : null}
        {l[2] > 0 ? <path d={DOC_BOTTOM} fill={bandFill} clipPath={l[2] < 1 ? `url(#${uid}-c2)` : undefined} /> : null}
        {l[1] > 0 ? (
          <path d={DRIFT_TRACE} fill={trace.color} fillOpacity={trace.opacity} clipPath={l[1] < 1 ? `url(#${uid}-ct)` : undefined} />
        ) : null}
        {l[1] > 0 ? (
          <g transform={dx !== 0 ? `translate(${dx} 0)` : undefined}>
            <path d={DRIFT_SLICE} fill={middleFill} clipPath={l[1] < 1 ? `url(#${uid}-c1)` : undefined} />
          </g>
        ) : null}
      </g>
    </svg>
  );
};

function wipeClips(uid: string, l: number[], clipW: (p: number, from: number, to: number) => number) {
  return (
    <>
      <clipPath id={`${uid}-c0`}>
        <rect x="100" y="110" width={clipW(l[0], 0, 270)} height="114" />
      </clipPath>
      <clipPath id={`${uid}-c2`}>
        <rect x="100" y="288" width={clipW(l[2], 0, 270)} height="114" />
      </clipPath>
      <clipPath id={`${uid}-ct`}>
        <rect x="100" y="216" width={clipW(l[1], 0, 270)} height="80" />
      </clipPath>
      {/* The slice's clip lives in the slice group's coordinates, so it moves with the band. */}
      <clipPath id={`${uid}-c1`}>
        <rect x="156" y="216" width={clipW(l[1], 0, 270)} height="80" />
      </clipPath>
    </>
  );
}

/**
 * The reveal, animated from frame `at` (local frames): the tile fades in, the bands land (wipe), then the middle band
 * slips into place in amber. Everything holds still afterwards. Defaults: tile 0 to 8, bands land 2 to 17,
 * slip at +24 over 6 frames (180 ms, expo out).
 */
export const MarkReveal: React.FC<
  Omit<MarkProps, "slip" | "land" | "tile" | "amber" | "glow"> & {
    at?: number;
    landFrames?: number;
    slipAt?: number;
    slipFrames?: number;
    /** Skip the tile fade (the tile is already there). */
    tileIn?: boolean;
  }
> = ({ at = 0, landFrames = 15, slipAt, slipFrames = 6, tileIn = true, ...rest }) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  const sAt = slipAt ?? at + 24;
  const tileOp = tileIn ? tween(f, 0, 8, 0, 1, EASE.expoOut) : 1;
  const land = tween(f, 2, 2 + landFrames, 0, 1, EASE.linear);
  const slip = tween(frame, sAt, sAt + slipFrames, 0, 1, EASE.expoOut);
  return <Mark {...rest} tile={tileOp} land={land} slip={slip} />;
};
