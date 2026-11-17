import React from "react";
import { AbsoluteFill, Freeze, interpolate, interpolateColors, Sequence, useCurrentFrame } from "remotion";
import { Lockup } from "../../../brand/Lockup";
import { Mark } from "../../../brand/Mark";
import { clamp, EASE, tween } from "../../../lib/time";
import { cam3At, Camera3D, MaskLine, screenRectOf, SlipReveal, Stage, type Cam3Key } from "../../../v4/kit";
import { DAY, FONT, ink, NIGHT, type Rect } from "../../../v4/look";
import { textWidth } from "../../../v4/twins";
import { PROBLEM_LAST_TOKEN, PROBLEM_T, ProblemLastShot } from "../PROBLEM";
import { PROMISE_T as T } from "./timing";

/**
 * PROMISE, part 1 (S06): the turn and the lockup. V5.md section 5, R6 techniques 3 (carry cut) and the Day slip cut.
 *
 *   0    the carry cut on the dead path: PROBLEM's frozen last frame (the generic assistant reading the old command)
 *        splits in the mark's three bands and clears into Day (the kit's SlipReveal, A2's Day slip), while the path
 *        "./scripts/rollback.sh" is lifted out of it and held in place: the eye never resets
 *   5    the path flies into the mark that lands around it and docks as the D's middle band, in line (19); "Doc Drift"
 *        rises beside it, readable on "Doc"
 *   30   on "catches" the band slips one unit, amber (the shot's one amber): the brand's own picture of drift caught
 *   56   the camera pulls back; "For teams with docs" sets under the lockup on "for", "in Confluence" on "in", and the
 *        gloss "Atlassian's wiki" under "Confluence" as it is said
 */

// ---------------------------------------------------------------------------------------------------------------------
// Layout (stage px)
// ---------------------------------------------------------------------------------------------------------------------

/** The mark's height; the lockup follows brand/logo.md (name at 42%, gap 28%). */
const M = 280;
const K = M / 512;
const LOCK_W = M + 0.28 * M + textWidth("Doc Drift", { size: 0.42 * M, weight: 600, tracking: -0.02 });
const LINE = { size: 58, lh: 1.25, gap: 52 };
const GLOSS = { size: 38, lh: 1.25, gap: 4 };
const BLOCK_H = M + LINE.gap + LINE.size * LINE.lh + GLOSS.gap + GLOSS.size * GLOSS.lh;
const LOCK = { x: Math.round(960 - LOCK_W / 2), y: Math.round(540 - BLOCK_H / 2) };
/** The middle band's slot in line with the D (slip 0), on the 512 grid: x 110 to 358, y 226 to 286, corners 8. */
const BAND0: Rect = { x: LOCK.x + 110 * K, y: LOCK.y + 226 * K, w: 248 * K, h: 60 * K };

const P1 = "For teams with docs";
const P2 = "in Confluence";
const G = "Atlassian’s wiki";
const wSans = (t: string, size: number, weight = 500) => textWidth(t, { size, weight });
const LINE_W = wSans(`${P1} ${P2}`, LINE.size);
const LINE_X = 960 - LINE_W / 2;
const LINE_Y = LOCK.y + M + LINE.gap;
const P2_X = LINE_X + wSans(`${P1} `, LINE.size);
const CONF_CX = LINE_X + wSans(`${P1} in `, LINE.size) + wSans("Confluence", LINE.size) / 2;
const G_W = wSans(G, GLOSS.size);
const G_Y = LINE_Y + LINE.size * LINE.lh + GLOSS.gap;

// ---------------------------------------------------------------------------------------------------------------------
// Camera: on the lockup, then pulled back to the whole block for the line
// ---------------------------------------------------------------------------------------------------------------------

const LOCK_CAM = { x: 960, y: LOCK.y + M / 2, zoom: 1.2 };
const BLOCK_CAM = { x: 960, y: 540, zoom: 1.0 };
export const KEYS6: Cam3Key[] = [
  { at: 0, dur: 0, to: LOCK_CAM },
  { at: T.pull, dur: 18, to: BLOCK_CAM, ease: EASE.expoOut },
];
export const OPTS6 = { base: LOCK_CAM, seed: "pm-lockup" } as const;

// ---------------------------------------------------------------------------------------------------------------------
// The lockup: the tile and the D's outer bands land around the empty middle slot until the path docks there
// ---------------------------------------------------------------------------------------------------------------------

const LockupBlock: React.FC = () => {
  const frame = useCurrentFrame();
  const tileP = tween(frame, T.tile[0], T.tile[1], 0, 1, EASE.expoOut);
  const landP = tween(frame, T.land[0], T.land[1], 0, 1, EASE.linear);
  const nameP = tween(frame, T.name, T.name + 13, 0, 1, EASE.expoOut);
  const s = tween(frame, T.slip, T.slip + 6, 0, 1, EASE.expoOut);
  const docked = frame >= T.dock;
  const outer = (clip: string, key: string) => (
    <div key={key} style={{ position: "absolute", left: 0, top: 0, width: M, height: M, clipPath: clip }}>
      <Mark size={M} variant="icon" tile={0} land={landP} slip={0} amber={0} glow={0} />
    </div>
  );
  return (
    <div style={{ position: "absolute", left: LOCK.x, top: LOCK.y, width: LOCK_W, height: M }}>
      {/* the ground's contact shadow under the tile (an object on the Day ground, as on the end card) */}
      <div
        style={{
          position: "absolute",
          left: M * 0.06,
          width: M * 0.88,
          top: M - 6,
          height: 40,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${ink(0.3 * tileP)} 0%, ${ink(0.11 * tileP)} 50%, transparent 100%)`,
          filter: "blur(6px)",
        }}
      />
      <div style={{ position: "relative" }}>
        {docked ? (
          <Lockup height={M} variant="icon" theme="day" mark={{ slip: s, tile: 1, land: 1 }} name={1} />
        ) : (
          <>
            <Lockup height={M} variant="icon" theme="day" mark={{ tile: tileP, land: 0, slip: 0, amber: 0, glow: 0 }} name={nameP} />
            {outer(`inset(0px 0px ${(M - 216 * K).toFixed(2)}px 0px)`, "top")}
            {outer(`inset(${(296 * K).toFixed(2)}px 0px 0px 0px)`, "bottom")}
          </>
        )}
      </div>
    </div>
  );
};

/** "For teams with docs" on "for", "in Confluence" on "in" (one line, the functional mask reveal), the gloss under it. */
const ForLine: React.FC = () => {
  const text: React.CSSProperties = { fontFamily: FONT.sans, fontWeight: 500, letterSpacing: "0em", whiteSpace: "nowrap" };
  return (
    <>
      <MaskLine at={T.line1} style={{ position: "absolute", left: LINE_X, top: LINE_Y }}>
        <div style={{ ...text, fontSize: LINE.size, lineHeight: LINE.lh, color: DAY.text }}>{P1}</div>
      </MaskLine>
      <MaskLine at={T.line2} style={{ position: "absolute", left: P2_X, top: LINE_Y }}>
        <div style={{ ...text, fontSize: LINE.size, lineHeight: LINE.lh, color: DAY.text }}>{P2}</div>
      </MaskLine>
      <MaskLine at={T.gloss} style={{ position: "absolute", left: CONF_CX - G_W / 2, top: G_Y }}>
        <div style={{ ...text, fontSize: GLOSS.size, lineHeight: GLOSS.lh, color: DAY.textMuted }}>{G}</div>
      </MaskLine>
    </>
  );
};

/** S06's world: the Day ground, the lockup and the line, under one camera. */
export const TurnWorld: React.FC = () => (
  <Stage world="day" motif="grid" light={["50%", "42%"]} grid={{ opacity: 0.035 }}>
    <Camera3D keys={KEYS6} {...OPTS6}>
      <LockupBlock />
      <ForLine />
    </Camera3D>
  </Stage>
);

// ---------------------------------------------------------------------------------------------------------------------
// The seam: PROBLEM's frozen last frame in the slip reveal, and the carried path
// ---------------------------------------------------------------------------------------------------------------------

/** The path's code run on PROBLEM's last frame: its type size on screen and its plate (measured: 1.18 em, corners 6). */
const TOK = PROBLEM_LAST_TOKEN;
const FS0 = TOK.h / 1.3;
const PAD0 = 0.28 * FS0;
const PLATE0: Rect = { x: TOK.x - PAD0, y: TOK.y + TOK.h / 2 - 0.59 * FS0, w: TOK.w + 2 * PAD0, h: 1.18 * FS0 };
const R0 = 6 * (FS0 / (40 * 0.88));
/** The D's own colours across the middle band (Mark's "icon" look: #FFFFFF to #D6E4E7 over y 120 to 392). */
const BAND_TOP = interpolateColors((226 - 120) / 272, [0, 1], ["#FFFFFF", "#D6E4E7"]);
const BAND_BOTTOM = interpolateColors((286 - 120) / 272, [0, 1], ["#FFFFFF", "#D6E4E7"]);

/**
 * PROBLEM's last frame, frozen, with the path's words lifted out of it (the carried copy is drawn on top). The Sequence
 * shifts time so the frozen frame (479) sits at timeline position 0: a Freeze past the end of a shorter composition
 * (PROMISE alone is 420 frames) is clamped to its last frame otherwise.
 */
export const NightLast: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={-(PROBLEM_T.end - 1)} layout="none">
      <Freeze frame={PROBLEM_T.end - 1}>
        <ProblemLastShot />
      </Freeze>
    </Sequence>
    <div style={{ position: "absolute", left: TOK.x - 1, top: PLATE0.y, width: TOK.w + 2, height: PLATE0.h, background: NIGHT.surfaceSunk }} />
  </AbsoluteFill>
);

/** The kit's slip reveal over the frozen Night frame (A2's Day slip: the next world grows every frame, open on T.reveal). */
export const TurnReveal: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= T.reveal) return null;
  return (
    <SlipReveal f={frame} open={T.reveal}>
      <NightLast />
    </SlipReveal>
  );
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The carried object: the dead path, exactly where it was (Night code run), turning to the Day well as the world turns;
 * then it flies into the mark's empty middle slot, its words shrinking with it and fading, and docks as the band.
 */
export const CarriedPath: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= T.dock + 2) return null;
  const day = tween(frame, 1, 7, 0, 1, EASE.linear);
  const fly = tween(frame, T.fly, T.dock, 0, 1, EASE.cubicInOut);
  const slot = screenRectOf(cam3At(frame, KEYS6, OPTS6), BAND0);
  const r: Rect = { x: lerp(PLATE0.x, slot.x, fly), y: lerp(PLATE0.y, slot.y, fly), w: lerp(PLATE0.w, slot.w, fly), h: lerp(PLATE0.h, slot.h, fly) };
  const arc = -36 * Math.sin(Math.PI * fly);
  const k = r.w / PLATE0.w; // the words shrink with the plate's width, so they always fit it
  const band = tween(frame, T.fly + 6, T.dock - 1, 0, 1, EASE.linear);
  const words = 1 - tween(frame, T.fly + 5, T.fly + 11, 0, 1, EASE.linear);
  const plateTop = interpolateColors(band, [0, 1], [interpolateColors(day, [0, 1], [NIGHT.surfaceSunk, DAY.surfaceSunk]), BAND_TOP]);
  const plateBottom = interpolateColors(band, [0, 1], [interpolateColors(day, [0, 1], [NIGHT.surfaceSunk, DAY.surfaceSunk]), BAND_BOTTOM]);
  const radius = lerp(R0, 8 * K * (slot.h / BAND0.h), fly);
  const handoff = interpolate(frame, [T.dock, T.dock + 2], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y + arc,
        width: r.w,
        height: r.h,
        borderRadius: radius,
        overflow: "hidden",
        opacity: handoff,
        background: `linear-gradient(to bottom, ${plateTop}, ${plateBottom})`,
        boxShadow: fly > 0.02 && fly < 0.98 ? `0 ${(10 * Math.sin(Math.PI * fly)).toFixed(1)}px ${(26 * Math.sin(Math.PI * fly)).toFixed(1)}px ${ink(0.18 * Math.sin(Math.PI * fly))}` : undefined,
      }}
    >
      {words > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: PAD0 * k,
            top: 0,
            height: r.h,
            display: "flex",
            alignItems: "center",
            fontFamily: FONT.mono,
            fontWeight: 400,
            fontSize: FS0 * k,
            whiteSpace: "pre",
            // the ink flips at the plate's midpoint (a cross-fade would pass through zero contrast)
            color: day < 0.5 ? NIGHT.text : DAY.text,
            opacity: words,
          }}
        >
          ./scripts/rollback.sh
        </div>
      ) : null}
    </div>
  );
};
