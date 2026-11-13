import React from "react";
import { AbsoluteFill, interpolate, interpolateColors } from "remotion";
import { BRAND, FONT, NIGHT } from "../../brand/tokens";
import { EASE } from "../../lib/time";
import { clamp } from "./fx/motion";
import { BAND_BOTTOM, BAND_TOP, BLACK, NAME_IN, R, SETTLE, settleAt, SLIP_FRAMES, TAGLINE_IN, TITLE_OUT, TITLE_OUT_FRAMES, V00, V01 } from "./timing";

/**
 * The turn and the reveal (everything after the black), timed from timeline.json:
 *   V00        the narrator's line as a title on the black, each word as it is spoken; it holds until the last word
 *              has ended, then clears as the Night ground lifts
 *   R − 11     faint grid lines draw across; the top band lands on its lines
 *   R − 5      the bottom band lands; the trace sits faintly between them
 *   R          THE SLIP: the middle band slides out of the trace into its place in amber, and the glow blooms
 *   R + 14     the mark settles into the horizontal lockup and its own tile fades in around it (the icon: the
 *              reveal "lands on Night like the app icon's tile", BRIEF decision 2); the name sets in; the tagline
 *              sets in with V01
 * The mark is the exact artwork: the flat mark (public/brand/doc-drift-mark-reversed.svg) while it builds and slips,
 * the icon (doc-drift-icon.svg) once it is in the lockup, paths and gradients verbatim below. The bands are uncovered
 * by a wipe and never moved; only the slipped band moves (brand/logo.md); the whole mark moves as one.
 */

// ── the artwork (doc-drift-mark-reversed.svg and doc-drift-icon.svg, verbatim) ────────────────────────────────────
const DOC_TOP = "M140 120H222A136 136 0 0 1 347.19 202.88A8 8 0 0 1 339.83 214H118A8 8 0 0 1 110 206V150A30 30 0 0 1 140 120Z";
const DOC_BOTTOM = "M118 298H339.83A8 8 0 0 1 347.19 309.12A136 136 0 0 1 222 392H140A30 30 0 0 1 110 362V306A8 8 0 0 1 118 298Z";
const DRIFT_TRACE = "M118 226H348.1A8 8 0 0 1 355.98 232.62A136 136 0 0 1 355.98 279.38A8 8 0 0 1 348.1 286H118A8 8 0 0 1 110 278V234A8 8 0 0 1 118 226Z";
const DRIFT_SLICE = "M174 226H404.1A8 8 0 0 1 411.98 232.62A136 136 0 0 1 411.98 279.38A8 8 0 0 1 404.1 286H174A8 8 0 0 1 166 278V234A8 8 0 0 1 174 226Z";
const TILE =
  "M332.8 0c62.726 0 94.089 0 118.047 12.207a112 112 0 0 1 48.946 48.946c12.207 23.958 12.207 55.321 12.207 118.047L512 332.8c0 62.726 0 94.089 -12.207 118.047a112 112 0 0 1 -48.946 48.946c-23.958 12.207 -55.321 12.207 -118.047 12.207L179.2 512c-62.726 0 -94.089 0 -118.047 -12.207a112 112 0 0 1 -48.946 -48.946c-12.207 -23.958 -12.207 -55.321 -12.207 -118.047L0 179.2c0 -62.726 0 -94.089 12.207 -118.047a112 112 0 0 1 48.946 -48.946c23.958 -12.207 55.321 -12.207 118.047 -12.207Z";
const PAPER = "#F2F6F7";
const TRACE_OPACITY = 0.16;
const SLICE = BRAND.slipFlat; // #FFAA1F, the flat mark's slip
const SLIP_UNITS = 56;

// ── geometry ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** The big mark: its 512 canvas at this size (the D itself is 272/512 of it: about 360 px tall). */
export const BIG = { size: 680, cx: 952, cy: 540 };
/** The lockup (brand/logo.md): icon height H, name at 42% of H, gap 28% of H. */
export const LOCK_H = 228;
const NAME_SIZE = LOCK_H * 0.42;
const GAP = LOCK_H * 0.28;
/** "Doc Drift Sentinel" in Spline Sans 600 at -0.02em, in em of the font size: its ink measured on a full-size render
 *  (733 px at 95.8 px) plus the D's left side bearing, so the row (tile to the name's last stroke) centres exactly. */
const NAME_EM = 7.73;
const NAME_W = NAME_EM * NAME_SIZE;
/** The row: the tile, the gap, the name. Centred on the frame (the tile's edge is the lockup's left edge). */
const ROW_W = LOCK_H + GAP + NAME_W;
const LOCK_LEFT = 960 - ROW_W / 2;
export const LOCK = { x: LOCK_LEFT, cy: 462 };
const LOCK_MARK = { cx: LOCK_LEFT + LOCK_H / 2, cy: LOCK.cy };
/** The tagline: a clear second line under the lockup (QA v1: it read small), about as wide as the lockup itself. */
const TAGLINE = { cy: 670, size: 60 };



// ── the bridge title ──────────────────────────────────────────────────────────────────────────────────────────────
/**
 * "That's why we built Doc Drift Sentinel." on the black, centre, white, 100 px: each word sets in a few frames ahead
 * of its sound (the aligner runs late on the first word, so it shows on the line's first frame), then the whole title
 * holds and clears before the mark. Two lines, the name on its own.
 */
export const BridgeTitle: React.FC<{ f: number }> = ({ f }) => {
  if (f < V00.from || f >= TITLE_OUT + TITLE_OUT_FRAMES) return null;
  const words = V00.words.length > 0 ? V00.words : V00.text.split(" ").map((t) => ({ text: t, from: V00.from, to: V00.end }));
  const split = Math.max(1, words.findIndex((w) => w.text.toLowerCase().startsWith("doc")));
  const lines = [words.slice(0, split), words.slice(split)];
  const exit = interpolate(f, [TITLE_OUT, TITLE_OUT + TITLE_OUT_FRAMES], [0, 1], { ...clamp, easing: EASE.expoIn });
  let i = 0;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: 1 - exit }}>
      <div
        style={{
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: 100,
          lineHeight: "116px",
          letterSpacing: "-0.022em",
          color: NIGHT.text,
          textAlign: "center",
          transform: exit > 0 ? `translateY(${-10 * exit}px)` : undefined,
        }}
      >
        {lines.map((ws, li) => (
          <div key={li} style={{ whiteSpace: "nowrap" }}>
            {ws.map((w, wi) => {
              const at = i++ === 0 ? V00.from : w.from - 3;
              const p = interpolate(f, [at, at + 8], [0, 1], { ...clamp, easing: EASE.expoOut });
              return (
                <React.Fragment key={wi}>
                  <span
                    style={{
                      display: "inline-block",
                      opacity: interpolate(p, [0, 0.5], [0, 1], clamp),
                      transform: p < 1 ? `translateY(${(1 - p) * 0.16}em)` : undefined,
                    }}
                  >
                    {w.text}
                  </span>
                  {wi < ws.length - 1 ? " " : null}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── the ground ────────────────────────────────────────────────────────────────────────────────────────────────────
/** True black from the cut until the title clears; the Night ground (Fathom) lifts in as it goes, under the mark. */
export const RevealGround: React.FC<{ f: number }> = ({ f }) => {
  if (f < BLACK) return null;
  const lift = interpolate(f, [TITLE_OUT, BAND_TOP + 6], [0, 1], { ...clamp, easing: EASE.quintOut });
  return <AbsoluteFill style={{ background: interpolateColors(lift, [0, 1], [BRAND.black, NIGHT.ground]) }} />;
};

// ── the grid lines the bands land on ──────────────────────────────────────────────────────────────────────────────
/** The bands' edges on the big mark (512 units): the top band 120–214, the bottom band 298–392. */
const GRID = [
  { y: 120, at: BAND_TOP - 1 },
  { y: 214, at: BAND_TOP },
  { y: 298, at: BAND_BOTTOM - 2 },
  { y: 392, at: BAND_BOTTOM - 1 },
];
export const GridLines: React.FC<{ f: number }> = ({ f }) => {
  if (f < GRID[0].at) return null;
  const fade = 1 - interpolate(f, [SETTLE.from, SETTLE.from + 8], [0, 1], clamp);
  if (fade <= 0) return null;
  const u = BIG.size / 512;
  const top = BIG.cy - BIG.size / 2;
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {GRID.map((g, i) => {
        const p = interpolate(f, [g.at, g.at + 7], [0, 1], { ...clamp, easing: EASE.expoOut });
        return (
          <div
            key={i}
            style={{ position: "absolute", left: 0, top: top + g.y * u - 1, width: 1920 * p, height: 2, background: NIGHT.line, opacity: 0.9 }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ── the mark ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Band wipes (left to right, 6 frames, expo out), the trace, the slip, the glow and the icon at frame f. */
const markState = (f: number) => {
  const wipe = (at: number) => interpolate(f, [at, at + 6], [0, 1], { ...clamp, easing: EASE.expoOut });
  const slip = interpolate(f, [R, R + SLIP_FRAMES], [0, 1], { ...clamp, easing: EASE.expoOut });
  const bloom = f >= R + SLIP_FRAMES ? Math.exp(-(f - R - SLIP_FRAMES) / 7) : 0;
  // the icon: its tile fades in, and the bands take the icon's own colours, while the mark settles into the lockup
  const icon = interpolate(f, [SETTLE.from + 4, SETTLE.from + SETTLE.frames], [0, 1], { ...clamp, easing: EASE.cubicInOut });
  return {
    top: wipe(BAND_TOP),
    bottom: wipe(BAND_BOTTOM),
    trace: interpolate(f, [BAND_BOTTOM, BAND_BOTTOM + 6], [0, 1], clamp),
    sliceOn: f >= R,
    slip,
    glow: f >= R ? slip * (0.85 + 0.45 * bloom) : 0,
    icon,
  };
};

const MarkArt: React.FC<{ f: number; size: number }> = ({ f, size }) => {
  const m = markState(f);
  const clipW = (p: number) => (p >= 1 ? 1000 : 270 * p);
  const slide = m.slip < 1 ? `translate(${-SLIP_UNITS * (1 - m.slip)} 0)` : undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={{ display: "block", overflow: "visible" }} aria-label="Doc Drift Sentinel logo">
      <defs>
        {/* doc-drift-icon.svg's gradients, verbatim */}
        <linearGradient id="a0-tile" x1="0" y1="0" x2="0" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0E3D48" />
          <stop offset="1" stopColor="#05191F" />
        </linearGradient>
        <radialGradient id="a0-lift" cx="140" cy="60" r="380" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22717E" stopOpacity="0.5" />
          <stop offset="1" stopColor="#22717E" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="a0-glow" cx="290" cy="256" r="178.56" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 256) scale(1 0.5) translate(0 -256)">
          <stop offset="0" stopColor="#FFB224" stopOpacity="0.4" />
          <stop offset="1" stopColor="#FFB224" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="a0-doc" x1="0" y1="120" x2="0" y2="392" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D6E4E7" />
        </linearGradient>
        <linearGradient id="a0-amber" x1="0" y1="226" x2="0" y2="286" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFD166" />
          <stop offset="1" stopColor="#FF9F1C" />
        </linearGradient>
        <clipPath id="a0-c0">
          <rect x="100" y="110" width={clipW(m.top)} height="114" />
        </clipPath>
        <clipPath id="a0-c2">
          <rect x="100" y="288" width={clipW(m.bottom)} height="114" />
        </clipPath>
      </defs>
      {/* the tile (fades in with the lockup), with its lift, its glow and its edge */}
      {m.icon > 0 ? (
        <g opacity={m.icon}>
          <path d={TILE} fill="url(#a0-tile)" />
          <path d={TILE} fill="url(#a0-lift)" />
          <path d={TILE} fill="url(#a0-glow)" />
          <path d={TILE} fill="none" stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={2} />
        </g>
      ) : null}
      {/* before the tile: the same glow, straight on the Night ground, blooming with the slip */}
      {m.glow > 0 && m.icon < 1 ? <rect x="-256" y="0" width="1024" height="512" fill="url(#a0-glow)" opacity={Math.min(1.3, m.glow) * (1 - m.icon)} /> : null}
      {m.top > 0 ? <path d={DOC_TOP} fill={PAPER} clipPath={m.top < 1 ? "url(#a0-c0)" : undefined} /> : null}
      {m.bottom > 0 ? <path d={DOC_BOTTOM} fill={PAPER} clipPath={m.bottom < 1 ? "url(#a0-c2)" : undefined} /> : null}
      {m.icon > 0 ? (
        <g opacity={m.icon}>
          <path d={DOC_TOP} fill="url(#a0-doc)" />
          <path d={DOC_BOTTOM} fill="url(#a0-doc)" />
        </g>
      ) : null}
      {m.trace > 0 ? (
        <>
          <path d={DRIFT_TRACE} fill={PAPER} fillOpacity={TRACE_OPACITY * m.trace * (1 - m.icon)} />
          {m.icon > 0 ? <path d={DRIFT_TRACE} fill="#FFFFFF" fillOpacity={0.1 * m.icon} /> : null}
        </>
      ) : null}
      {m.sliceOn ? (
        <g transform={slide}>
          <path d={DRIFT_SLICE} fill={SLICE} />
          {m.icon > 0 ? <path d={DRIFT_SLICE} fill="url(#a0-amber)" opacity={m.icon} /> : null}
        </g>
      ) : null}
    </svg>
  );
};

/** The mark: big and centred while it builds and slips, then settling into its place in the lockup. */
export const RevealMark: React.FC<{ f: number }> = ({ f }) => {
  if (f < BAND_TOP - 4) return null;
  const s = settleAt(f);
  const size = BIG.size + (LOCK_H - BIG.size) * s;
  const cx = BIG.cx + (LOCK_MARK.cx - BIG.cx) * s;
  const cy = BIG.cy + (LOCK_MARK.cy - BIG.cy) * s;
  return (
    <div style={{ position: "absolute", left: cx - size / 2, top: cy - size / 2, width: size, height: size }}>
      <MarkArt f={f} size={size} />
    </div>
  );
};

// ── the name and the tagline ──────────────────────────────────────────────────────────────────────────────────────
/** The name, exactly as the kit's Lockup sets it (Spline Sans 600 at 42% of the icon, -0.02em), rising from its mask. */
export const LockupName: React.FC<{ f: number }> = ({ f }) => {
  const p = interpolate(f, [NAME_IN, NAME_IN + 15], [0, 1], { ...clamp, easing: EASE.expoOut });
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: LOCK.x + LOCK_H + GAP,
        top: LOCK.cy - NAME_SIZE / 2,
        overflow: "hidden",
        padding: "0.1em 0.05em 0.2em",
        margin: "-0.1em -0.05em -0.2em",
        fontSize: NAME_SIZE,
      }}
    >
      <div
        style={{
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: NAME_SIZE,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: NIGHT.text,
          whiteSpace: "nowrap",
          opacity: interpolate(p, [0, 0.45], [0, 1], clamp),
          transform: p < 1 ? `translateY(${(1 - p) * 105}%)` : undefined,
        }}
      >
        Doc Drift Sentinel
      </div>
    </div>
  );
};

/** The tagline under the lockup, set in with V01 ("Docs that know when the code moved."), then perfectly still. */
export const Tagline: React.FC<{ f: number }> = ({ f }) => {
  const p = interpolate(f, [TAGLINE_IN, TAGLINE_IN + 15], [0, 1], { ...clamp, easing: EASE.expoOut });
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: TAGLINE.cy - TAGLINE.size * 0.6, display: "flex", justifyContent: "center" }}>
      <div style={{ overflow: "hidden", padding: "0.08em 0.04em 0.18em", margin: "-0.08em -0.04em -0.18em" }}>
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: TAGLINE.size,
            lineHeight: 1.2,
            letterSpacing: "-0.012em",
            color: NIGHT.text,
            whiteSpace: "nowrap",
            opacity: interpolate(p, [0, 0.45], [0, 1], clamp),
            transform: p < 1 ? `translateY(${(1 - p) * 105}%)` : undefined,
          }}
        >
          {V01.text}
        </div>
      </div>
    </div>
  );
};

export const Reveal: React.FC<{ f: number }> = ({ f }) => {
  if (f < BLACK) return null;
  return (
    <AbsoluteFill>
      <RevealGround f={f} />
      <BridgeTitle f={f} />
      <GridLines f={f} />
      <RevealMark f={f} />
      <LockupName f={f} />
      <Tagline f={f} />
    </AbsoluteFill>
  );
};
