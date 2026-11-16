import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { EASE, H, W } from "../../lib/time";
import { cam3At, cam3Transform, type Cam3, type Cam3Key, InkLabel, stageToScreen, sweep } from "../../v4/kit";
import { DIFF_ROWS_CY, DIFF_SIZE, DiffSheet } from "./DiffSheet";
import type { BarrageLook } from "./fx/barrageShader";
import { mergeLooks } from "./fx/looks";
import { clamp, lerp, stepSeed, WHIP_EASE } from "./fx/motion";
import { elevShadow } from "./paper";
import { PaperPlate } from "./PlateCard";
import { type A0Plate, type Box, type PlateId, PLATES } from "./plates";
import { ARXIV, BAR3, BLACK, DIFF_PUNCH, HN, IMPLODE, LAST_SLAM, WHIP_ARXIV, WHIP_HN, WHIP_WIKI, WIKI } from "./timing";

/**
 * The barrage, v4: the evidence as paper on a lit desk (V4.md section 6; R2 section 13, frame 1). Everything here is
 * drawn inside ONE GL pass (index.tsx) whose only job is camera motion blur (directional on the whips, radial on the
 * punches, the landings and the draw-in); there is no grade and no glitch. The caption band, the captions and the
 * subject's source slot sit above the pass, still (Overlay.tsx, SourceLine below).
 *
 *   the DESK    a world of sheets on the Paper sweep, seen by the kit's camera (src/v4/kit cam3At: log-space zoom with
 *               a straight-path look-at, a creep between moves, the hand-held float), keyed below; it leans into its
 *               whips (yaw and pitch from its own velocity, M2) and never stops. Bar 1 is a strip: our diff card,
 *               arXiv, Google's SRE book (crossed by a whip), the two Hacker News comments; bar 2 opens below it on
 *               the Wikimedia report. The subject of each beat lifts from elevation 2 to 4 as the camera arrives and
 *               settles when it leaves; texture sheets stay soft and washed.
 *   the PILE    from f98, sheets land one on another under the camera: each drops from the air (elevation 5, a little
 *               larger and turned) onto the pile in 3 frames, its key sentence always whole and on the same band of
 *               the screen (one footprint), its phrase marked as it lands.
 *   the SOURCES every plate on screen keeps its source and date: the subject in one fixed slot at the lower left
 *               (above the pass, so it never jumps or smears), texture sheets with a chip beside them.
 *
 * Photosensitivity on Day: the frame stays near page white (relative luminance about 0.85), so cuts barely move it;
 * the risk is text-dense against blank windows, and dark chips arriving and leaving. So subjects keep their key
 * sentence on one band, everything else on a page is washed, sheets land with one footprint, the subject's chip has
 * one slot, and texture chips dim through whips (tools/qa/flashcheck.py: at most 2 flashes in any second).
 */

// ── the camera ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** The screen point the desk camera aims at: a little below centre, so subjects sit under the caption band. */
export const ANCHOR = { x: 960, y: 640 };

/** A framing: the world point that sits on ANCHOR, at zoom `s`. */
type Frame = { x: number; y: number; s: number };
const creep = (c: Frame, k: number, dx = 0, dy = 0): Frame => ({ x: c.x + dx, y: c.y + dy, s: c.s * k });
/** A framing as a kit pose (the kit aims the view centre; ANCHOR sits 100 px below it). */
const pose = (c: Frame, extra: Partial<Cam3> = {}): Partial<Cam3> => ({ x: c.x, y: c.y - (ANCHOR.y - H / 2) / c.s, zoom: c.s, ...extra });

// ── the desk ─────────────────────────────────────────────────────────────────────────────────────────────────────────
type DeskItem = {
  key: string;
  /** A third-party plate; none = our diff card. */
  plate?: PlateId;
  /** World centre, width (world px) and turn (degrees). */
  x: number;
  y: number;
  w: number;
  rot: number;
  role: "subject" | "texture";
  crop?: Box;
  /** Subjects: the frame they start lifting to elevation 4, the frame they start settling back to 2. */
  up?: number;
  down?: number;
  /** Subjects: the frame their Mist band starts (the underline follows). */
  mark?: number;
  /** Which lower corner carries a texture's source chip (default left). */
  chip?: "left" | "right";
  /** Subjects: the frame they start turning to texture (washed and soft, under the pile). */
  fade?: number;
};

const b = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

/** Where the diff card sits on the desk (world px), and its rows' centre (the punch's target). */
const DIFF_AT = { x: -1850, y: 0 };
const DIFF_ROWS = { x: DIFF_AT.x, y: DIFF_AT.y - DIFF_SIZE.h / 2 + DIFF_ROWS_CY };
/** The Wikimedia station, below the Hacker News comments (bar 2 opens there with a whip down the desk). */
const WIKI_AT = { x: 3300, y: 1380 };

export const DESK: DeskItem[] = [
  // bar 1: the strip, left to right
  { key: "diff", x: DIFF_AT.x, y: DIFF_AT.y, w: DIFF_SIZE.w, rot: 0, role: "subject", up: -100, down: WHIP_ARXIV.from + 1 },
  { key: "willison", plate: "willison", x: -400, y: -392, w: 1250, rot: -1.5, role: "texture" },
  { key: "wisdom", plate: "wisdom", x: -250, y: 356, w: 1350, rot: 1.2, role: "texture" },
  { key: "arxivDrift", plate: "arxivDrift", x: 0, y: 0, w: 1700, rot: 0, role: "subject", up: WHIP_ARXIV.from + 1, down: WHIP_HN.from + 1, mark: ARXIV.mark },
  { key: "sreBook", plate: "sreBook", x: 1650, y: 26, w: 1500, rot: 0.7, role: "texture" },
  { key: "hn2026", plate: "hn2026", x: 3230, y: -18, w: 1560, rot: 0, role: "subject", up: WHIP_HN.from + 2, down: WHIP_WIKI.from + 1, mark: HN.mark },
  { key: "hn2021", plate: "hn2021", x: 2622, y: 112, w: 1480, rot: 0.4, role: "subject", up: WHIP_HN.from + 4, down: WHIP_WIKI.from + 1, mark: HN.mark2 },
  // off to the side of the whip down (the whip crosses open desk, so no page flicks past an edge)
  { key: "sweGoogle", plate: "sweGoogle", x: 4560, y: 720, w: 1500, rot: -0.9, role: "texture" },
  // bar 2: the Wikimedia report (it settles under the pile and washes), and the desk around the pile
  { key: "wikimedia", plate: "wikimedia", x: WIKI_AT.x, y: WIKI_AT.y, w: 1640, rot: 0, role: "subject", up: WIKI.lift, down: 100, mark: WIKI.mark, fade: 100 },
  { key: "willison2", plate: "willison", x: 1880, y: 1470, w: 1050, rot: -1.6, role: "texture" },
  { key: "survey", plate: "survey", x: 4600, y: 1330, w: 1100, rot: 1.4, role: "texture" },
  { key: "wisdom2", plate: "wisdom", x: 3200, y: 1990, w: 1400, rot: 1.0, role: "texture" },
];

const plateOf = (it: DeskItem): A0Plate | undefined => (it.plate ? PLATES[it.plate] : undefined);
const regionOf = (it: DeskItem): Box | undefined => {
  const p = plateOf(it);
  return p ? (it.crop ?? p.region) : undefined;
};
const heightOf = (it: DeskItem) => {
  const r = regionOf(it);
  return r ? (it.w * r.h) / r.w : DIFF_SIZE.h * (it.w / DIFF_SIZE.w);
};
const itemOf = (key: string) => DESK.find((d) => d.key === key) as DeskItem;

/** A world point of a desk plate, from a point in the plate's own pixels (unrotated sheets only). */
const worldOf = (key: string, px: number, py: number) => {
  const it = itemOf(key);
  const r = regionOf(it) as Box;
  const k = it.w / r.w;
  return { x: it.x - it.w / 2 + (px - r.x) * k, y: it.y - heightOf(it) / 2 + (py - r.y) * k };
};
/** The world box around some plate boxes of a desk plate (unrotated). */
const worldBox = (key: string, bs: Box[]) => {
  const ps = bs.flatMap((q) => [worldOf(key, q.x, q.y), worldOf(key, q.x + q.w, q.y + q.h)]);
  const x0 = Math.min(...ps.map((p) => p.x));
  const x1 = Math.max(...ps.map((p) => p.x));
  const y0 = Math.min(...ps.map((p) => p.y));
  const y1 = Math.max(...ps.map((p) => p.y));
  return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};

// the stops: each lands a little wide on its whip, then punches in on the beat onto the marked sentence
const ARX = worldBox("arxivDrift", PLATES.arxivDrift.spot.slice(0, 1));
/** Hacker News: from "Documentation" (the 2026 comment's first word) to the end of both marked phrases. */
const HNB = (() => {
  const a = worldBox("hn2026", [{ x: 79, y: 168, w: 1034 - 79, h: 50 }]);
  const c = worldBox("hn2021", PLATES.hn2021.lines);
  return { cx: (Math.min(a.x0, c.x0) + Math.max(a.x1, c.x1)) / 2, cy: (a.y0 + c.y1) / 2 };
})();
const WIK = worldBox("wikimedia", PLATES.wikimedia.spot);

const C_DIFF: Frame = { x: DIFF_AT.x, y: DIFF_AT.y + 6, s: 1.0 };
const C_DIFF_P: Frame = { x: DIFF_ROWS.x, y: DIFF_ROWS.y, s: 1.13 };
/** Screen y the arXiv key line sits on (below the anchor), so the paper's title stays clear of the caption band. */
const ARX_Y = 740;
const C_ARX: Frame = { x: ARX.cx - 30, y: ARX.cy - (ARX_Y - ANCHOR.y) / 1.45, s: 1.45 };
const C_ARX_P: Frame = { x: ARX.cx - 130 / 2.2, y: ARX.cy - (ARX_Y - ANCHOR.y) / 2.2, s: 2.2 };
const C_HN: Frame = { x: HNB.cx + 30, y: HNB.cy - 12, s: 1.25 };
const C_HN_P: Frame = { x: HNB.cx, y: HNB.cy, s: 1.52 };
const C_WIKI: Frame = { x: WIKI_AT.x - 40, y: WIKI_AT.y + 30, s: 1.2 };
const C_WIKI_P: Frame = { x: WIK.cx, y: WIK.cy, s: 1.88 };
const C_PILE: Frame = { x: WIKI_AT.x - 20, y: WIKI_AT.y + 10, s: 1.22 };

/**
 * The desk camera's moves (kit Cam3Keys: each starts at `at` from wherever the camera is). Whips are 6 to 7 frames,
 * hard in and out (WHIP_EASE), and land on a beat or the bar; punches land on the beat (expo out).
 */
const DESK_KEYS: Cam3Key[] = [
  { at: 0, dur: DIFF_PUNCH, to: pose(creep(C_DIFF, 1.025, 0, 10)), ease: EASE.linear },
  { at: DIFF_PUNCH, dur: 5, to: pose(C_DIFF_P) },
  { at: WHIP_ARXIV.from, dur: WHIP_ARXIV.to - WHIP_ARXIV.from, to: pose(C_ARX), ease: WHIP_EASE },
  { at: ARXIV.push.from, dur: ARXIV.push.to - ARXIV.push.from, to: pose(C_ARX_P) },
  { at: WHIP_HN.from, dur: WHIP_HN.to - WHIP_HN.from, to: pose(C_HN), ease: WHIP_EASE },
  { at: HN.punch.from, dur: HN.punch.to - HN.punch.from, to: pose(C_HN_P) },
  { at: WHIP_WIKI.from, dur: WHIP_WIKI.to - WHIP_WIKI.from, to: pose(C_WIKI), ease: WHIP_EASE },
  { at: WIKI.punch.from, dur: WIKI.punch.to - WIKI.punch.from, to: pose(C_WIKI_P) },
  { at: WIKI.pull.from, dur: WIKI.pull.to - WIKI.pull.from, to: pose(C_PILE), ease: EASE.cubicInOut },
  // bar 3: the desk turns and drifts under the pile, faster and faster (the pile itself stays near square)
  { at: BAR3, dur: BLACK - BAR3, to: pose(creep(C_PILE, 1.1, 190, 40), { roll: -6 }), ease: Easing.in(Easing.quad) },
];
/** The kit's creep (1.5% a second) and a small hand-held float keep every hold alive. */
const DESK_CAM = { base: pose(C_DIFF), creep: 1.5, float: 4, seed: "a0-desk" };

export const deskCam = (f: number): Cam3 => cam3At(f, DESK_KEYS, DESK_CAM);

/** World → screen through the desk camera (2D part). */
export const deskToScreen = (c: Cam3, x: number, y: number) => {
  const [sx, sy] = stageToScreen(c, x, y);
  return { x: sx, y: sy };
};

/** Screen velocity (px per frame) and zoom rate of the desk camera, by central differences. */
export const deskMotion = (f: number) => {
  const a = deskCam(f - 0.5);
  const c = deskCam(f + 0.5);
  const m = deskCam(f);
  return { vx: -(c.x - a.x) * m.zoom, vy: -(c.y - a.y) * m.zoom, zoomRate: (c.zoom - a.zoom) / m.zoom };
};

/** The tilt while the camera travels (M2: up to 12°, only in motion): the plane leans into the whip. */
const tiltAt = (f: number) => {
  const m = deskMotion(f);
  return { yaw: Math.max(-9, Math.min(9, -m.vx / 110)), pitch: Math.max(-7, Math.min(7, m.vy / 70)) };
};

// ── a desk sheet ─────────────────────────────────────────────────────────────────────────────────────────────────────
const LIFT_FRAMES = 13;
const SETTLE_FRAMES = 10;
const elevOf = (it: DeskItem, f: number) => {
  if (it.role === "texture") return 1.6;
  const up = it.up ?? -1000;
  const rise = interpolate(f, [up, up + LIFT_FRAMES], [2, 4], { ...clamp, easing: EASE.expoOut });
  if (it.down === undefined) return rise;
  return rise - 2 * interpolate(f, [it.down, it.down + SETTLE_FRAMES], [0, 1], { ...clamp, easing: EASE.cubicInOut });
};

const DeskSheet: React.FC<{ it: DeskItem; f: number }> = ({ it, f }) => {
  const h = heightOf(it);
  const e = elevOf(it, f);
  // a lifted sheet is a little closer to the camera
  const lift = 1 + 0.012 * Math.max(0, e - 2);
  const p = plateOf(it);
  return (
    <div
      style={{
        position: "absolute",
        left: it.x - it.w / 2,
        top: it.y - h / 2,
        width: it.w,
        height: h,
        transform: `rotate(${it.rot}deg) scale(${lift})`,
      }}
    >
      {p ? (
        <PaperPlate
          plate={p}
          crop={it.crop}
          width={it.w}
          role={it.role}
          elev={e}
          markAt={it.mark}
          lit={it.fade === undefined ? 1 : 1 - interpolate(f, [it.fade, it.fade + 10], [0, 1], { ...clamp, easing: EASE.cubicInOut })}
        />
      ) : (
        <DiffSheet elev={e} under={interpolate(f, [DIFF_PUNCH + 1, DIFF_PUNCH + 9], [0, 1], { ...clamp, easing: EASE.quintOut })} />
      )}
    </div>
  );
};

/** Is a desk sheet anywhere near the view (a cheap cull)? */
const nearView = (it: DeskItem, c: Cam3) => {
  const p = deskToScreen(c, it.x, it.y);
  const half = (Math.hypot(it.w, heightOf(it)) / 2) * c.zoom * 1.1;
  return p.x + half > -60 && p.x - half < W + 60 && p.y + half > -60 && p.y - half < H + 60;
};

const Desk: React.FC<{ f: number }> = ({ f }) => {
  const c = deskCam(f);
  const t = tiltAt(f);
  return (
    <AbsoluteFill style={{ perspective: "2600px", perspectiveOrigin: "50% 50%" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: cam3Transform({ ...c, yaw: t.yaw, pitch: t.pitch }) }}>
        {DESK.filter((it) => nearView(it, c)).map((it) => (
          <DeskSheet key={it.key} it={it} f={f} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── the pile (bars 2–3) ──────────────────────────────────────────────────────────────────────────────────────────────
/** Every sheet lands on this footprint (screen px), its key sentence at the centre; the last one is wider. */
export const PANEL = { w: 1500, h: 560, cx: 960, cy: 650 };
export const PANEL_WIDE = { ...PANEL, w: 1700, h: 540 };

/**
 * A landing: `z0` is its zoom as it lands (by default its lit sentence fills the panel's width, at most 84 px a line);
 * `punch` (frames after the landing) and `z1` push in further (at most 110 px a line). Every zoom keeps the whole
 * sentence inside the panel, centred.
 */
export type Slam = { at: number; len: number; id: PlateId; z0?: number; punch?: number; z1?: number; wide?: boolean; crop?: Box };
/** Back to back from f98 to the black (v3's cut list, which sits on M0's stabs). */
export const SLAMS: Slam[] = [
  { at: 98, len: 6, id: "mojRunbook", punch: 3, z1: 2.4 },
  { at: 104, len: 6, id: "register" },
  { at: 110, len: 5, id: "ghSurvey", z0: 1.5 },
  { at: 115, len: 5, id: "soBlog", punch: 1, z1: 1.35 },
  { at: BAR3, len: 8, id: "rovoCommunity", punch: 2, z1: 2.2, crop: b(0, 470, 3840, 290) }, // bar 3's downbeat: the first Rovo item
  { at: 128, len: 7, id: "stalePoisoning" },
  { at: 135, len: 6, id: "staleFiles" },
  { at: 141, len: 5, id: "copilot" },
  { at: 146, len: 6, id: "rovo730", punch: 2, z1: 2.0 }, // the second Rovo item, apart from the first
  { at: LAST_SLAM, len: BLACK - LAST_SLAM, id: "atlassian", punch: 4, z1: 2.3, wide: true, crop: b(716, 40, 2040, 340) }, // Atlassian's own line
];
export const slamOn = (f: number): Slam | undefined => SLAMS.find((s) => f >= s.at && f < s.at + s.len);
export const panelOf = (s: Slam) => (s.wide ? PANEL_WIDE : PANEL);

/** The pile's pose for a landing: dropped from the air, a little larger and turned, tossed from alternate sides. */
export const slamPose = (s: Slam, f: number) => {
  const t = f - s.at;
  const side = SLAMS.indexOf(s) % 2 ? 1 : -1;
  const land = interpolate(t, [0, 3], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const last = s.at === LAST_SLAM;
  return {
    k: lerp(1.085, 1, land) * (1 + 0.0028 * Math.max(0, t - 3)),
    rot: last ? lerp(side * 1.6, 0.25, land) : lerp(side * 2.6, side * 0.85, land),
    dx: lerp(side * -60, 0, land),
    dy: lerp(-26, 0, land),
    elev: lerp(5, 4, land),
  };
};

const unionOf = (bs: Box[]): Box => {
  const x0 = Math.min(...bs.map((q) => q.x));
  const y0 = Math.min(...bs.map((q) => q.y));
  const x1 = Math.max(...bs.map((q) => q.x + q.w));
  const y1 = Math.max(...bs.map((q) => q.y + q.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/** A slam's plate fitted into its panel (contain), then zoomed on its lit sentence (whole and centred). */
const panelFit = (s: Slam, f: number) => {
  const plate = PLATES[s.id];
  const panel = panelOf(s);
  const r = s.crop ?? plate.region;
  const fw = Math.min(panel.w - 60, (panel.h - 60) * (r.w / r.h));
  const k = fw / r.w;
  const fh = r.h * k;
  const left0 = (panel.w - fw) / 2;
  const top0 = (panel.h - fh) / 2;
  const sent = unionOf(plate.spot);
  const sentLine = Math.max(...plate.spot.map((q) => q.h));
  const zFit = Math.max(1, (0.96 * panel.w) / (sent.w * k));
  const zLand = Math.min(zFit, s.z0 ?? Math.max(1, Math.min((0.88 * panel.w) / (sent.w * k), 84 / (sentLine * k))));
  const zKey = s.punch !== undefined ? Math.max(zLand, Math.min(s.z1 ?? 1.6, zFit, 110 / (sentLine * k))) : zLand;
  const t = f - s.at;
  const pp = s.punch !== undefined ? interpolate(t, [s.punch, s.punch + 5], [0, 1], { ...clamp, easing: EASE.expoOut }) : 0;
  const z = zLand * Math.pow(zKey / zLand, pp);
  const fx = left0 + (sent.x + sent.w / 2 - r.x) * k;
  const fy = top0 + (sent.y + sent.h / 2 - r.y) * k;
  return { plate, panel, r, fw, k, left0, top0, fx, fy, z };
};

/** A sheet on the pile: the top one lands; the ones beneath wash and soften like texture within 4 frames of being
 *  covered (only their edges show, so their words never compete with the page on top). */
const SlamSheet: React.FC<{ s: Slam; f: number; top: boolean; coveredAt?: number }> = ({ s, f, top, coveredAt }) => {
  const p = slamPose(s, top ? f : s.at + 40);
  const lit = top || coveredAt === undefined ? 1 : 1 - interpolate(f, [coveredAt, coveredAt + 4], [0, 1], { ...clamp, easing: EASE.cubicInOut });
  const fit = panelFit(s, top ? f : s.at + s.len - 1);
  const { panel } = fit;
  return (
    <div
      style={{
        position: "absolute",
        left: panel.cx - panel.w / 2,
        top: panel.cy - panel.h / 2,
        width: panel.w,
        height: panel.h,
        transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.rot}deg) scale(${p.k})`,
        borderRadius: 14,
        background: "#FFFFFF",
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: 14, boxShadow: elevShadow(top ? p.elev : 2.4) }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 14, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: `${fit.fx}px ${fit.fy}px`,
            transform: `translate(${panel.w / 2 - fit.fx}px, ${panel.h / 2 - fit.fy}px) scale(${fit.z})`,
          }}
        >
          <div style={{ position: "absolute", left: fit.left0, top: fit.top0 }}>
            <PaperPlate plate={fit.plate} crop={s.crop} width={fit.fw} role="subject" elev={0} radius={0} markAt={s.at + (s.punch ?? 0) + 1} markDur={5} lit={lit} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Pile: React.FC<{ f: number }> = ({ f }) => {
  const cur = SLAMS.findIndex((s) => f >= s.at && f < s.at + s.len);
  if (cur < 0) return null;
  const shown = SLAMS.slice(Math.max(0, cur - 2), cur + 1);
  return (
    <AbsoluteFill>
      {shown.map((s) => {
        const next = SLAMS[SLAMS.indexOf(s) + 1];
        return <SlamSheet key={s.at} s={s} f={f} top={s === SLAMS[cur]} coveredAt={next?.at} />;
      })}
    </AbsoluteFill>
  );
};

// ── the sources ──────────────────────────────────────────────────────────────────────────────────────────────────────
const CHIP = 26;
const CHIP_H = CHIP * 1.8;
/** Where texture chips may sit: below the caption band, inside the frame. */
const ZONE = { x0: 56, x1: W - 56, y0: 304, y1: H - 18 };
const chipW = (text: string) => text.length * CHIP * 0.53 + CHIP * 1.4;

type ChipAt = { key: string; x: number; y: number; text: string; opacity?: number };
type ScreenBox = { x0: number; x1: number; y0: number; y1: number };

/** The screen box of a rotated rectangle (centre, size, degrees) under a transform to screen. */
const screenBox = (cx: number, cy: number, w: number, h: number, rot: number, to: (x: number, y: number) => { x: number; y: number }): ScreenBox => {
  const a = (rot * Math.PI) / 180;
  const pts = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([u, v]) => to(cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

/** A chip under the sheet's lower corner; above it when there is no room below; inside the frame always. */
const placeChip = (key: string, text: string, bx: ScreenBox, side: "left" | "right" = "left"): ChipAt | null => {
  const visW = Math.min(bx.x1, W) - Math.max(bx.x0, 0);
  const visH = Math.min(bx.y1, H) - Math.max(bx.y0, ZONE.y0 - 10);
  if (visW < 420 || visH < 60) return null; // a sliver at an edge is texture, not a page on screen (no chip flicks)
  const w = chipW(text);
  const x = side === "left" ? Math.min(Math.max(bx.x0 + 4, ZONE.x0), ZONE.x1 - w) : Math.max(ZONE.x0, Math.min(bx.x1 - 4, ZONE.x1) - w);
  let y = bx.y1 + 14;
  if (y + CHIP_H > ZONE.y1) y = bx.y0 - CHIP_H - 12 >= ZONE.y0 ? bx.y0 - CHIP_H - 12 : Math.min(bx.y1, ZONE.y1) - CHIP_H - 16;
  y = Math.max(ZONE.y0, Math.min(ZONE.y1 - CHIP_H, y));
  return { key, x, y, text };
};

/**
 * The subject's source: ONE fixed slot at the lower left, drawn above the pass (crisp, never smeared; SourceLine
 * below), so the subject's chip never jumps or blinks: its label swaps on a whip's fastest frame, when the desk is a
 * blur, or on the landing that brings the next page. Texture sheets keep their own chip beside them, inside the pass.
 */
export const SOURCE_SLOT = { x: 212, bottom: H - 60 };
const SLOT_BOX: ScreenBox = { x0: SOURCE_SLOT.x - 16, x1: SOURCE_SLOT.x + 760, y0: SOURCE_SLOT.bottom - 2 * CHIP_H - 30, y1: SOURCE_SLOT.bottom + 12 };
const mid = (w: { from: number; to: number }) => Math.round((w.from + w.to) / 2);

/** The source labels of the subject on screen at frame f, top to bottom (verbatim from plates.json). */
export const sourcesAt = (f: number): string[] => {
  if (f >= BLACK) return [];
  const s = slamOn(f);
  if (s) return [PLATES[s.id].label];
  if (f >= mid(WHIP_WIKI)) return [PLATES.wikimedia.label];
  if (f >= mid(WHIP_HN)) return [PLATES.hn2026.label, PLATES.hn2021.label];
  if (f >= mid(WHIP_ARXIV)) return [PLATES.arxivDrift.label];
  return []; // our own diff card has no source
};
/** The frame the slot first fills (it lifts in once; after that only its label swaps). */
const SLOT_IN = mid(WHIP_ARXIV);

const overlaps = (a: ScreenBox, c: ScreenBox) => a.x0 < c.x1 && a.x1 > c.x0 && a.y0 < c.y1 && a.y1 > c.y0;

/** Texture sheets' chips: beside their sheet while the camera rests; they dim through a whip (the page is a smear). */
const textureChips = (f: number): ChipAt[] => {
  const m = deskMotion(f);
  const travel = interpolate(Math.hypot(m.vx, m.vy), [30, 110], [1, 0], clamp);
  if (travel <= 0.01) return [];
  const c = deskCam(f);
  const to = (x: number, y: number) => deskToScreen(c, x, y);
  const cover = slamOn(f) ? panelOf(slamOn(f) as Slam) : null;
  return DESK.flatMap((it) => {
    const p = plateOf(it);
    if (!p || it.role !== "texture" || !nearView(it, c)) return [];
    const bx = screenBox(it.x, it.y, it.w, heightOf(it), it.rot + c.roll, to);
    // under the pile, a desk sheet is only seen at the edges: a sliver
    if (cover) {
      const px0 = cover.cx - cover.w / 2;
      const px1 = cover.cx + cover.w / 2;
      const outside = Math.max(0, px0 - Math.max(0, bx.x0)) + Math.max(0, Math.min(W, bx.x1) - px1);
      if (outside < 260) return [];
    }
    let ch = placeChip(it.key, p.label, bx, it.chip);
    // never under the subject's source slot: take the sheet's other corner
    if (ch && overlaps({ x0: ch.x, x1: ch.x + chipW(ch.text), y0: ch.y, y1: ch.y + CHIP_H }, SLOT_BOX)) ch = placeChip(it.key, p.label, bx, "right");
    return ch ? [{ ...ch, opacity: travel }] : [];
  });
};

const Chips: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill>
    {textureChips(f).map((c) => (
      <div key={c.key} style={{ position: "absolute", left: c.x, top: c.y, opacity: c.opacity }}>
        <InkLabel size={CHIP}>{c.text}</InkLabel>
      </div>
    ))}
  </AbsoluteFill>
);

// ── the draw-in ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** f173–179: every sheet is drawn to the centre (the suck-in's inhale), then the hard cut to black. */
export const implodeAt = (f: number) => interpolate(f, [IMPLODE.from - 1, IMPLODE.to - 1], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
const IMPLODE_AT = { x: 960, y: 610 };
const implodeTransform = (f: number) => {
  const imp = implodeAt(f);
  return imp > 0 ? `scale(${1 - 0.68 * imp}) rotate(${9 * imp}deg)` : undefined;
};

/** The subject's source slot, above the pass: lifts in once, then holds; labels stack upward from the slot's bottom. */
export const SourceLine: React.FC<{ f: number }> = ({ f }) => {
  const labels = sourcesAt(f);
  if (labels.length === 0) return null;
  const p = interpolate(f, [SLOT_IN, SLOT_IN + 5], [0, 1], { ...clamp, easing: EASE.expoOut });
  return (
    <AbsoluteFill style={{ transformOrigin: `${IMPLODE_AT.x}px ${IMPLODE_AT.y}px`, transform: implodeTransform(f) }}>
      <div
        style={{
          position: "absolute",
          left: SOURCE_SLOT.x,
          bottom: H - SOURCE_SLOT.bottom,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 10,
          opacity: Math.min(1, p * 2),
          transform: p < 1 ? `translateY(${(1 - p) * 22}px)` : undefined,
        }}
      >
        {labels.map((t) => (
          <InkLabel key={t} size={CHIP}>
            {t}
          </InkLabel>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Barrage: React.FC<{ f: number }> = ({ f }) => {
  if (f >= BLACK) return null;
  return (
    <AbsoluteFill style={{ background: sweep("50%", "58%"), overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: `${IMPLODE_AT.x}px ${IMPLODE_AT.y}px`, transform: implodeTransform(f) }}>
        <Desk f={f} />
        <Pile f={f} />
        <Chips f={f} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── the pass ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** The pass at frame f: motion blur only (no grade, no glitch), clamped at the edges (an opaque full frame). */
export const barrageLook = (f: number): BarrageLook | null => {
  if (f >= BLACK) return null;
  const parts: Omit<BarrageLook, "time" | "seed">[] = [{ clampEdges: true }];
  const s = slamOn(f);
  if (!s) {
    // the desk camera: half a frame of shutter on slow moves, up to nearly two on the fastest whip frames, so a page
    // smears across the frame in one continuous streak instead of flicking past an edge
    const m = deskMotion(f);
    const speed = Math.hypot(m.vx, m.vy);
    const shutter = speed > 120 ? interpolate(speed, [120, 700], [1, 1.8], clamp) : 0.5;
    parts.push({ blurX: m.vx * shutter, blurY: m.vy * shutter, zoom: Math.min(0.22, Math.abs(m.zoomRate) * shutter), centerX: ANCHOR.x / W, centerY: ANCHOR.y / H });
  } else {
    // a landing: a short radial smear as the sheet drops onto the pile, and its punch's
    const k0 = slamPose(s, f - 0.5).k * panelFit(s, f - 0.5).z;
    const k1 = slamPose(s, f + 0.5).k * panelFit(s, f + 0.5).z;
    const pn = panelOf(s);
    parts.push({ zoom: Math.min(0.2, (0.5 * Math.abs(k1 - k0)) / Math.max(k0, k1)), centerX: pn.cx / W, centerY: pn.cy / H });
  }
  const imp0 = 1 - 0.68 * implodeAt(f - 0.5);
  const imp1 = 1 - 0.68 * implodeAt(f + 0.5);
  if (imp1 < 1) parts.push({ zoom: Math.min(0.32, (0.5 * Math.abs(imp1 - imp0)) / imp1), centerX: IMPLODE_AT.x / W, centerY: IMPLODE_AT.y / H });
  return mergeLooks(f, stepSeed(f, 2), ...parts);
};
