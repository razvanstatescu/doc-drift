import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Lockup } from "../../brand/Lockup";
import { Mark } from "../../brand/Mark";
import { EASE } from "../../lib/time";
import { amber, Camera3D, KineticLine, Layer, Lift, lineCues, Stage, TideLines } from "../../v4/kit";
import { clamp } from "./fx/motion";
import {
  BAND_BOTTOM,
  BAND_FRAMES,
  BAND_MID,
  BAND_TOP,
  BLACK,
  END,
  GROUND,
  NAME_IN,
  R,
  settleAt,
  SLIP_FRAMES,
  TAGLINE_IN,
  TIDE_IN,
  TILE_FRAMES,
  TILE_IN,
  TITLE_OUT,
  TITLE_OUT_FRAMES,
  V00,
  V01,
} from "./timing";

/**
 * The turn and the reveal (everything after the black), timed from timeline.json (v4), on the kit's Night stage:
 *   f180       TRUE BLACK (a black veil over the Night stage) and digital silence
 *   V00        the narrator's line as a title on the black, each word rising on its cue (KineticLine); it holds until
 *              the last word has ended, then leaves upward as the veil lifts off the Night sweep
 *   TILE_IN    the app's tile lifts in (the kit's Lift, Night ladder: 13 frames, its shadow growing)
 *   R − 11..5  the top, middle and bottom bands land on ticks: the D is whole and in line
 *   R          THE SLIP: the middle band slides out of line in amber, its glow on the tile and its bloom beneath (the
 *              film's first amber); the tide lines start beneath
 *   R + 12     the tile settles into the horizontal lockup; the name sets in; the tagline sets in with V01
 *   to END     one Camera3D over the whole turn: it creeps (1.5% a second) and floats, and the tide drifts, so no frame
 *              is ever frozen (v3 froze the lockup for 2.8 s)
 * The mark is the brand's own artwork (src/brand/Mark.tsx; the name from Lockup.tsx): the bands are uncovered by wipes
 * and never moved, only the slipped band moves, and the whole mark moves as one.
 */

// ── geometry ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** The big mark: its 512 canvas at this size, centred (the tile is the whole canvas). */
export const BIG = { size: 600, cx: 960, cy: 512 };
/** The tile's corner radius (the artwork's 112 of 512). */
const TILE_RADIUS = (112 / 512) * BIG.size;
/** The lockup (brand/logo.md): icon height H, name at 42% of H, gap 28% of H. */
export const LOCK_H = 216;
/** "Doc Drift Sentinel" in Spline Sans 600 at -0.02em, in em of the font size (measured on a v3 render), so the row
 *  (tile to the name's last stroke) centres exactly. */
const NAME_EM = 7.73;
const ROW_W = LOCK_H * (1 + 0.28 + 0.42 * NAME_EM);
export const LOCK = { x: 960 - ROW_W / 2, cy: 452 };
const LOCK_MARK = { cx: LOCK.x + LOCK_H / 2, cy: LOCK.cy };
/** The tagline: a clear second line under the lockup. */
const TAGLINE = { top: 628, size: 64 };

// ── the bridge title ─────────────────────────────────────────────────────────────────────────────────────────────────
/** "That's why we built / Doc Drift Sentinel." (the name on its own line), cued word by word from V00. */
const TITLE_TEXT = (() => {
  const words = V00.text.split(" ");
  const split = Math.max(1, words.findIndex((w) => w.toLowerCase().startsWith("doc")));
  return `${words.slice(0, split).join(" ")}\n${words.slice(split).join(" ")}`;
})();

/** Its cues from V00's words; the first word shows on the line's first frame, f195 (the aligner runs late on it, and
 *  the cut's true black holds to f194). */
const TITLE_CUES = (() => {
  const c = lineCues(V00, TITLE_TEXT);
  c[0] = { from: V00.from + 6 };
  return c;
})();

export const BridgeTitle: React.FC<{ f: number }> = ({ f }) => {
  if (f < V00.from - 8 || f >= TITLE_OUT + TITLE_OUT_FRAMES + 2) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <KineticLine
        text={TITLE_TEXT}
        at={V00.from}
        words={TITLE_CUES}
        size={100}
        lineHeight={116}
        tracking="-0.022em"
        align="center"
        world="night"
        dur={8}
        exit={{ at: TITLE_OUT, dur: TITLE_OUT_FRAMES, stagger: 0.5 }}
        style={{ whiteSpace: "nowrap" }}
      />
    </AbsoluteFill>
  );
};

// ── the ground and the tide ──────────────────────────────────────────────────────────────────────────────────────────
/** The veil: true black from the cut until the title leaves, then the Night sweep lifts out of it. */
const veilAt = (f: number) => 1 - interpolate(f, [GROUND.from, GROUND.to], [0, 1], { ...clamp, easing: EASE.quintOut });

/** Tide lines beneath the lockup: they start with the slip, drawn in from the left, and drift (0.5 px a frame). */
const Tide: React.FC<{ f: number }> = ({ f }) => {
  const p = interpolate(f, [TIDE_IN.from, TIDE_IN.from + TIDE_IN.frames], [0, 1], { ...clamp, easing: EASE.quintOut });
  if (p <= 0) return null;
  const edge = p * 130 - 15; // the drawing edge, % of the width (with a soft 15% leading fade)
  const mask = `linear-gradient(90deg, #000 ${Math.max(0, edge - 15)}%, transparent ${edge}%)`;
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <TideLines
        night
        top={800}
        bottom={1110}
        count={7}
        amplitude={18}
        wavelength={600}
        opacity={0.5}
        stroke={2.5}
        speed={0.5}
        composite
        mask="linear-gradient(180deg, transparent 0%, #000 40%, #000 100%), linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)"
      />
    </AbsoluteFill>
  );
};

// ── the mark ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** 0..1 wipe of a band (left to right, expo out), from its landing frame. */
const wipe = (f: number, at: number) => interpolate(f, [at, at + BAND_FRAMES], [0, 1], { ...clamp, easing: EASE.expoOut });

/**
 * The bands' wipes as one clip path over the artwork (512 units, scaled to `size`): each band's rectangle opens left
 * to right from its landing frame, and stays open (wide enough for the slipped band) once it has landed.
 */
const bandClip = (f: number, size: number) => {
  const u = size / 512;
  const rect = (x: number, y: number, w: number, h: number) =>
    `M${(x * u).toFixed(2)} ${(y * u).toFixed(2)}h${(w * u).toFixed(2)}v${(h * u).toFixed(2)}h${(-w * u).toFixed(2)}Z`;
  const open = (p: number) => (p >= 1 ? 420 : 320 * p);
  const parts: string[] = [];
  const top = wipe(f, BAND_TOP);
  const mid = wipe(f, BAND_MID);
  const bot = wipe(f, BAND_BOTTOM);
  if (top > 0) parts.push(rect(96, 104, open(top), 124));
  if (mid > 0) parts.push(rect(96, 214, open(mid), 84));
  if (bot > 0) parts.push(rect(96, 284, open(bot), 124));
  return parts.length ? `path('${parts.join(" ")}')` : "path('M0 0Z')";
};

const slipAt = (f: number) => interpolate(f, [R, R + SLIP_FRAMES], [0, 1], { ...clamp, easing: EASE.expoOut });
/** The bloom: a breath of amber light under the slipped band as it latches, settling to the tile's own glow. */
const bloomAt = (f: number) => {
  const s = slipAt(f);
  if (s <= 0) return 0;
  const after = Math.max(0, f - R - SLIP_FRAMES);
  return s * (0.45 + 0.55 * Math.exp(-after / 9));
};

/**
 * The tile: it lifts in big at the centre, its bands land and slip, then the whole tile glides into its place in the
 * lockup (one transform, so the artwork, its shadow and its glow stay exactly together).
 */
const RevealMark: React.FC<{ f: number }> = ({ f }) => {
  if (f < TILE_IN) return null;
  const s = settleAt(f);
  const k = 1 + (LOCK_H / BIG.size - 1) * s;
  const dx = (LOCK_MARK.cx - BIG.cx) * s;
  const dy = (LOCK_MARK.cy - BIG.cy) * s;
  const slip = slipAt(f);
  const bloom = bloomAt(f);
  const size = BIG.size;
  return (
    <div
      style={{
        position: "absolute",
        left: BIG.cx - size / 2,
        top: BIG.cy - size / 2,
        width: size,
        height: size,
        transform: `translate(${dx}px, ${dy}px) scale(${k})`,
        transformOrigin: "50% 50%",
      }}
    >
      {bloom > 0 ? (
        <div
          style={{
            position: "absolute",
            left: size * 0.12,
            top: size * 0.24,
            width: size * 1.05,
            height: size * 0.52,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${amber(0.3 * bloom)} 0%, ${amber(0.1 * bloom)} 55%, transparent 100%)`,
          }}
        />
      ) : null}
      <Lift at={TILE_IN} dur={TILE_FRAMES} from={1} to={3} world="night" radius={TILE_RADIUS} w={size} h={size}>
        <div style={{ position: "relative", width: size, height: size }}>
          <Mark size={size} variant="icon" land={0} tile={1} glow={slip} />
          <div style={{ position: "absolute", inset: 0, clipPath: bandClip(f, size) }}>
            <Mark size={size} variant="icon" land={1} tile={0} slip={slip} amber={slip} />
          </div>
        </div>
      </Lift>
    </div>
  );
};

// ── the name and the tagline ─────────────────────────────────────────────────────────────────────────────────────────
const nameAt = (f: number) => interpolate(f, [NAME_IN, NAME_IN + 15], [0, 1], { ...clamp, easing: EASE.expoOut });

/** The name, set by the brand's Lockup in its place beside the tile (the tile itself is the gliding mark above). */
const RevealName: React.FC<{ f: number }> = ({ f }) => {
  const name = nameAt(f);
  if (name <= 0) return null;
  return (
    <div style={{ position: "absolute", left: LOCK.x, top: LOCK.cy - LOCK_H / 2, height: LOCK_H }}>
      <Lockup height={LOCK_H} variant="icon" theme="night" mark={{ tile: 0, land: 0 }} name={name} />
    </div>
  );
};

/** The tagline under the lockup, set in with V01 ("Docs that know when the code moved.") as one line, then held. */
const Tagline: React.FC<{ f: number }> = ({ f }) => {
  if (f < TAGLINE_IN) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: TAGLINE.top }}>
      <KineticLine text={V01.text} at={TAGLINE_IN} size={TAGLINE.size} weight={500} align="center" world="night" stagger={1} dur={10} style={{ whiteSpace: "nowrap" }} />
    </div>
  );
};

export const Reveal: React.FC<{ f: number }> = ({ f }) => {
  if (f < BLACK || f >= END) return null;
  const veil = veilAt(f);
  return (
    <Stage world="night" motif="none" light={["50%", "44%"]}>
      {veil > 0 ? <AbsoluteFill style={{ background: "#000", opacity: veil }} /> : null}
      {/* one camera over the whole turn: its creep starts on the cut to black */}
      <Camera3D keys={[{ at: BLACK, dur: 0, to: { x: 960, y: 540, zoom: 1 } }]} creep={1.4} float={4} seed="a0-reveal">
        <Layer depth={0.5}>
          <Tide f={f} />
        </Layer>
        <BridgeTitle f={f} />
        <RevealMark f={f} />
        <RevealName f={f} />
        <Tagline f={f} />
      </Camera3D>
    </Stage>
  );
};
