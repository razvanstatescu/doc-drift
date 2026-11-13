import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { EASE } from "../../lib/time";
import type { BarrageLook } from "./fx/barrageShader";
import { gradeLook, hitLook, mergeLooks, motionLook } from "./fx/looks";
import { burst, type Cam, camMotion, clamp, lerp, shake, stepSeed, WHIP_EASE } from "./fx/motion";
import { fitWidth, PlateCard, SPOT_DIM } from "./PlateCard";
import { type A0Plate, type Box, type PlateId, PLATES, TUNNEL_GRADE } from "./plates";
import { BAR2, BAR3, BLACK, DIFF_TO, HERO, IMPLODE, LAST_SLAM, PUNCHES, STRIP_DIVE, WHIPS } from "./timing";
import { Tunnel, type TunnelItem } from "./Tunnel";

/**
 * The barrage: every third-party plate on a black ground, drawn as a pure function of the frame and run through ONE GL
 * pass (index.tsx). Nothing in here is ours to keep still: the diff card, the captions and the source chips are drawn
 * above the pass, untouched (Overlay.tsx). Adapted from the Satchel film's H0 (same owner): a wall with whips and
 * punches in bar 1, a hero on the glass over a tunnel in bar 2, slams back to back to the black.
 *
 * Photosensitivity (Satchel's QA, and three flashcheck runs here): every plate is a light page, so
 *   - the slams share one panel (one footprint, no dark gap between two pages; the last one is a little wider),
 *   - the spotlight (each page dimmed around its lit sentence) is a constant grade from a plate's first frame, never
 *     a ramp, and every slam centres its lit sentence, so the bright band stays put from slam to slam,
 *   - bar 1's clippings sit edge to edge along the camera's path, so the whips slide page to page,
 *   - the slam-in is only 1.1 → 1, there are no slice glitches, and the tunnel's plates sit darker than the subjects.
 * Result on the A0 render: at most 1 flash in any second, whole frame and every 341 × 256 window.
 */

// ── world helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
/** The camera's anchor on screen: a little below centre, so subjects sit under the caption band. */
export const ANCHOR = { x: 960, y: 600 };

type KeyCam = { f: number; cam: Cam; ease?: (t: number) => number };
/** Piecewise camera: each key's ease shapes the segment that ends on it; scale moves in log space. */
const keyed = (f: number, keys: KeyCam[]): Cam => {
  if (f <= keys[0].f) return keys[0].cam;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (f <= b.f) {
      const t = (b.ease ?? EASE.linear)(Math.max(0, Math.min(1, (f - a.f) / (b.f - a.f))));
      return { x: lerp(a.cam.x, b.cam.x, t), y: lerp(a.cam.y, b.cam.y, t), s: a.cam.s * Math.pow(b.cam.s / a.cam.s, t) };
    }
  }
  return keys[keys.length - 1].cam;
};
const drift = (c: Cam, k: number): Cam => ({ ...c, s: c.s * k });

// ── bar 1: the wall ───────────────────────────────────────────────────────────────────────────────────────────────
type WallItem = { id: PlateId; x: number; y: number; w: number; rot: number };
/**
 * World px (centre, width, degrees): a strip of clippings, edge to edge along the camera's path, so the whip slides
 * from page to page instead of crossing black (a dark gap in a whip was a flash pair: flashcheck, run 2). The two
 * subjects (arXiv, the 2026 Hacker News comment) are square to the camera; Google's SRE book between them is crossed by
 * the whip; the texture leans a little around them.
 */
export const WALL: WallItem[] = [
  { id: "willison", x: -700, y: -360, w: 1250, rot: -1.5 },
  { id: "wisdom", x: -400, y: 330, w: 1350, rot: 1.2 },
  { id: "arxivDrift", x: 0, y: 0, w: 1700, rot: 0 },
  { id: "sreBook", x: 1614, y: 40, w: 1500, rot: 0 },
  { id: "hn2026", x: 3190, y: -10, w: 1600, rot: 0 },
  { id: "hn2021", x: 3250, y: 132, w: 1600, rot: 0.8 }, // far enough below the 2026 comment for its source chip
];
/** The plates the camera reads (their key sentence is lit); the others are texture, dimmed whole. */
const SUBJECTS: PlateId[] = ["arxivDrift", "hn2026"];
const itemOf = (id: PlateId) => WALL.find((w) => w.id === id) as WallItem;
const hOf = (it: WallItem) => (it.w * PLATES[it.id].region.h) / PLATES[it.id].region.w;

/** A world point of a wall plate, from a point in the plate's own pixels (unrotated subjects only). */
const worldOf = (id: PlateId, px: number, py: number) => {
  const it = itemOf(id);
  const p = PLATES[id];
  const k = it.w / p.region.w;
  return { x: it.x - it.w / 2 + (px - p.region.x) * k, y: it.y - hOf(it) / 2 + (py - p.region.y) * k };
};
const centreOf = (id: PlateId, b: Box) => worldOf(id, b.x + b.w / 2, b.y + b.h / 2);

// The stops. arXiv: its "63.2%" sentence sits low (y 730 on screen), so the paper's heading clears the caption band
// (QA v1 #3); the cut lands at 1.7 and pushes to 2.0. Then the whip to the two Hacker News comments and the punch.
const P1c = centreOf("arxivDrift", PLATES.arxivDrift.spot[0]); // "We find that 63.2% of AI PRs change code without updating"
const STAT_Y = 730;
const A1 = { x: P1c.x, y: P1c.y - (STAT_Y - ANCHOR.y) / 1.7, s: 1.7 };
const P1 = { x: P1c.x, y: P1c.y - (STAT_Y - ANCHOR.y) / 2.0, s: 2.0 };
const S3 = { x: 3220, y: 40, s: 1.15 };
const P3c = centreOf("hn2026", PLATES.hn2026.key);
const P3 = { x: P3c.x, y: P3c.y - 40, s: 1.7 }; // the two comments sit centred in the frame under the caption

const STRIP_KEYS: KeyCam[] = [
  { f: DIFF_TO, cam: A1 },
  { f: PUNCHES[0] + 5, cam: P1, ease: EASE.expoOut },
  { f: WHIPS[0].at, cam: drift(P1, 1.01) },
  { f: WHIPS[0].at + WHIPS[0].dur, cam: S3, ease: WHIP_EASE },
  { f: PUNCHES[1], cam: drift(S3, 1.008) },
  { f: PUNCHES[1] + 4, cam: P3, ease: EASE.expoOut },
  { f: STRIP_DIVE.from, cam: drift(P3, 1.012) },
];

/** The strip camera (bar 1): world point at the anchor, and the zoom. The last 5 frames dive through the HN line. */
export const stripCam = (f: number): Cam => {
  const c = keyed(f, STRIP_KEYS);
  const d = interpolate(f, [STRIP_DIVE.from, STRIP_DIVE.to], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return { x: c.x, y: c.y, s: c.s * Math.pow(6, d) };
};

/** World → screen through the strip camera. */
export const stripToScreen = (cam: Cam, x: number, y: number) => ({ x: ANCHOR.x + (x - cam.x) * cam.s, y: ANCHOR.y + (y - cam.y) * cam.s });

/** Each subject's read starts with its punch; its underline wipes in as the punch lands. */
const READS: { id: PlateId; from: number }[] = [
  { id: "arxivDrift", from: PUNCHES[0] },
  { id: "hn2026", from: PUNCHES[1] },
];
/**
 * The spotlight is a constant grade (every plate's key sentence lit, the rest of its page dimmed) from its first frame:
 * a spotlight that ramps on after a page lands is a flash pair (flashcheck, run 1). Only the underline moves.
 */
export const SPOT = 0.85;
/** Page white under the spotlight: the slam panel's ground, so the panel and the dimmed page are one tone. */
const PAGE_SPOT = (() => {
  const v = Math.round(255 * 0.6 * (1 - SPOT_DIM * SPOT));
  return `rgb(${v}, ${v}, ${v})`;
})();
const wallFocus = (id: PlateId, f: number) => {
  const own = READS.find((r) => r.id === id);
  const under = own ? interpolate(f, [own.from + 2, own.from + 8], [0, 1], clamp) : 0;
  return { spot: SPOT, under, dim: 0, lit: SUBJECTS.includes(id) };
};

/** The wall's jolt on the cut and the punches (the chips above the pass follow it). */
export const wallShake = (f: number) => shake(f, "a0-wall", 9 * (burst(f, DIFF_TO, 4) + 0.6 * burst(f, PUNCHES[1], 4)));

const Wall: React.FC<{ f: number }> = ({ f }) => {
  const cam = stripCam(f);
  const sh = wallShake(f);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${ANCHOR.x + sh.x}px, ${ANCHOR.y + sh.y}px) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`,
        }}
      >
        {WALL.map((it) => {
          const h = hOf(it);
          const fo = wallFocus(it.id, f);
          return (
            <div key={it.id} style={{ position: "absolute", left: it.x - it.w / 2, top: it.y - h / 2, width: it.w, height: h, rotate: `${it.rot}deg` }}>
              <PlateCard plate={PLATES[it.id]} width={it.w} underline={fo.under} spot={fo.spot} lit={fo.lit} dim={fo.dim} radius={4} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Screen-space boxes of the wall plates (rotated corners → axis-aligned), for the source chips above the pass. */
export const wallBoxes = (f: number) => {
  const cam = stripCam(f);
  return WALL.map((it) => {
    const h = hOf(it);
    const a = (it.rot * Math.PI) / 180;
    const pts = [
      [-it.w / 2, -h / 2],
      [it.w / 2, -h / 2],
      [it.w / 2, h / 2],
      [-it.w / 2, h / 2],
    ].map(([u, v]) => stripToScreen(cam, it.x + u * Math.cos(a) - v * Math.sin(a), it.y + u * Math.sin(a) + v * Math.cos(a)));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return { id: it.id, label: PLATES[it.id].label, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), bl: pts[3] };
  });
};

/** How fast the strip camera travels (screen px per frame), for fading the chips through whips. */
export const stripSpeed = (f: number) => {
  const m = camMotion(stripCam, f);
  return Math.hypot(m.vx, m.vy);
};

// ── bar 2: the hero on the glass ──────────────────────────────────────────────────────────────────────────────────
export const HERO_BOX = { w: 1640, cx: 960, cy: 616 };
export const HERO_H = (HERO_BOX.w * PLATES.wikimedia.region.h) / PLATES.wikimedia.region.w;

export const heroPose = (f: number) => {
  const t = f - HERO.from;
  const slam = interpolate(t, [0, 2], [1.06, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const push = 1 + 0.03 * interpolate(f, [HERO.from + 2, HERO.dive.from], [0, 1], clamp);
  const dive = interpolate(f, [HERO.dive.from, HERO.dive.to], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return { s: slam * push * Math.pow(7, dive), rot: interpolate(t, [0, 2], [-2.2, -0.8], clamp) * (1 - dive), dive };
};
/** The punch on the whole bullet ("Documentation was outdated for jobrunner, dsh, and salt"), capped to fit the card. */
const heroZoom = (f: number) => interpolate(f, [HERO.punch, HERO.punch + 6], [1, 1.9], { ...clamp, easing: EASE.expoOut });

const HeroCard: React.FC<{ f: number }> = ({ f }) => {
  const p = heroPose(f);
  return (
    <div
      style={{
        position: "absolute",
        left: HERO_BOX.cx - HERO_BOX.w / 2,
        top: HERO_BOX.cy - HERO_H / 2,
        width: HERO_BOX.w,
        height: HERO_H,
        transform: `scale(${p.s}) rotate(${p.rot}deg)`,
        transformOrigin: "50% 50%",
        boxShadow: "0 0 0 3px rgba(242, 246, 247, 0.16), 0 30px 80px rgba(0, 0, 0, 0.6)",
        borderRadius: 6,
      }}
    >
      <PlateCard
        plate={PLATES.wikimedia}
        width={HERO_BOX.w}
        zoom={heroZoom(f)}
        underline={interpolate(f, [HERO.punch + 3, HERO.punch + 11], [0, 1], clamp)}
        spot={SPOT}
      />
    </div>
  );
};

/** Black over the tunnel while the hero is on the glass (it lifts through the dive). */
const heroDim = (f: number) => interpolate(f, [HERO.dive.from, HERO.dive.to], [0.62, 0], clamp);

// ── bars 2–3: the tunnel ──────────────────────────────────────────────────────────────────────────────────────────
/** The tunnel's stream: plates of every bar, no Rovo items (they appear exactly twice, as slams). */
const TUNNEL: PlateId[] = [
  "sweGoogle",
  "ghSurvey",
  "radar",
  "soBlog",
  "stalePoisoning",
  "mojRunbook",
  "staleFiles",
  "willison",
  "survey",
  "copilot",
  "register",
  "wisdom",
  "sreBook",
  "hn2021",
  "arxivDrift",
  "hn2026",
];
const TUNNEL_AREA = 1150 * 650;
const tunnelItem = (idx: number): TunnelItem => {
  const id = TUNNEL[(((idx * 5 + 3) % TUNNEL.length) + TUNNEL.length) % TUNNEL.length];
  const p = PLATES[id];
  const a = p.region.w / p.region.h;
  const w = Math.min(1720, Math.sqrt(TUNNEL_AREA * a));
  return { node: <PlateCard plate={p} width={w} grade={TUNNEL_GRADE} label={22} radius={4} />, w, h: w / a };
};

/** px per frame along z: cruising behind the hero, then a 2.7 s acceleration into the black. */
export const tunnelSpeed = (f: number) => (f < HERO.dive.from ? 55 : 55 + 245 * Math.pow(Math.min(1, (f - HERO.dive.from) / 80), 1.4));
const rollAt = (f: number) => (f < BAR3 ? 0 : 14 * Math.pow((f - BAR3) / (BLACK - BAR3), 2));

// ── bars 2–3: the slams ───────────────────────────────────────────────────────────────────────────────────────────
/** Every slam lands on this graded page panel: one footprint for every light page (photosensitivity). */
export const PANEL = { w: 1600, h: 700, cx: 960, cy: 636 };
/** The last slam (Atlassian's own line) gets a wider panel, so its sentence lands bigger: one change of footprint. */
export const PANEL_WIDE = { ...PANEL, w: 1820 };

/**
 * A slam: `z0` is its zoom as it lands (most land readable, their sentence at 40–60 px); `punch` (frame of the slam)
 * and `z1` punch in further on the key phrase. Every zoom is capped so the sentence (or key phrase) stays whole.
 */
export type Slam = { at: number; len: number; id: PlateId; z0?: number; punch?: number; z1?: number; wide?: boolean };
/** Back to back from the hero's dive to the black: no dark gap ever opens between two pages. */
export const SLAMS: Slam[] = [
  { at: 98, len: 6, id: "mojRunbook", punch: 3, z1: 1.12 },
  { at: 104, len: 6, id: "register" },
  { at: 110, len: 5, id: "soBlog" },
  { at: 115, len: 5, id: "ghSurvey", punch: 1, z1: 1.1 },
  { at: BAR3, len: 8, id: "rovoCommunity", punch: 2, z1: 1.6 }, // bar 3's downbeat: the first Rovo item
  { at: 128, len: 7, id: "stalePoisoning", z0: 1.06 },
  { at: 135, len: 6, id: "staleFiles" },
  { at: 141, len: 5, id: "copilot", z0: 1.19 },
  { at: 146, len: 6, id: "rovo730", punch: 2, z1: 2.0 }, // the second Rovo item, apart from the first
  { at: LAST_SLAM, len: BLACK - LAST_SLAM, id: "atlassian", punch: 4, z1: 2.3, wide: true }, // the last word: Atlassian's own line
];
export const slamOn = (f: number): Slam | undefined => SLAMS.find((s) => f >= s.at && f < s.at + s.len);
export const panelOf = (s: Slam) => (s.wide ? PANEL_WIDE : PANEL);

/** The panel's pose for a slam: a short slam-in (1.1 → 1), a slow push, a held tilt that alternates. */
export const slamPose = (s: Slam, f: number) => {
  const t = f - s.at;
  const k = interpolate(t, [0, 2], [1.1, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) * (1 + 0.003 * Math.max(0, t - 2));
  const sign = SLAMS.indexOf(s) % 2 ? 1 : -1;
  return { k, rot: sign * (t === 0 ? 1.8 : 0.8) };
};

/** A plate fitted into the panel, punched in on its key phrase inside the panel (the page continues around it). */
const PanelPlate: React.FC<{ plate: A0Plate; zoom: number; underline: number; spot: number; panel: typeof PANEL }> = ({ plate, zoom, underline, spot, panel: PANEL }) => {
  const fw = fitWidth(plate, PANEL.w - 40, PANEL.h - 40);
  const k = fw / plate.region.w;
  const fh = plate.region.h * k;
  const left0 = (PANEL.w - fw) / 2;
  const top0 = (PANEL.h - fh) / 2;
  const fb = plate.key;
  const fx = left0 + (fb.x + fb.w / 2 - plate.region.x) * k;
  const fy = top0 + (fb.y + fb.h / 2 - plate.region.y) * k;
  const z = Math.min(zoom, Math.max(1, Math.min((0.92 * PANEL.w) / (fb.w * k), (0.62 * PANEL.h) / (fb.h * k))));
  // the lit sentence always sits at the panel's centre, so the bright band stays in one place from slam to slam
  const c = 1;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${fx}px ${fy}px`,
        transform: `translate(${(PANEL.w / 2 - fx) * c}px, ${(PANEL.h / 2 - fy) * c}px) scale(${z})`,
      }}
    >
      <div style={{ position: "absolute", left: left0, top: top0 }}>
        <PlateCard plate={plate} width={fw} underline={underline} spot={spot} radius={0} />
      </div>
    </div>
  );
};

const SlamView: React.FC<{ f: number }> = ({ f }) => {
  const s = slamOn(f);
  if (!s) return null;
  const t = f - s.at;
  const pose = slamPose(s, f);
  const PANEL = panelOf(s);
  const z0 = s.z0 ?? 1;
  const zoom = s.punch !== undefined ? interpolate(t, [s.punch, s.punch + 4], [z0, s.z1 ?? 1.6], { ...clamp, easing: EASE.expoOut }) : z0;
  const from = s.punch ?? 1;
  const under = interpolate(t, [from + 1, from + 5], [0.2, 1], clamp);
  const spot = SPOT; // constant from the slam's first frame (see SPOT)
  return (
    <div
      style={{
        position: "absolute",
        left: PANEL.cx - PANEL.w / 2,
        top: PANEL.cy - PANEL.h / 2,
        width: PANEL.w,
        height: PANEL.h,
        transform: `scale(${pose.k}) rotate(${pose.rot}deg)`,
        background: PAGE_SPOT,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <PanelPlate plate={PLATES[s.id]} zoom={zoom} underline={under} spot={spot} panel={PANEL} />
    </div>
  );
};

/** f173–179: the whole barrage is sucked in toward the centre (the suck-in's inhale), then the hard cut to black. */
export const implodeAt = (f: number) =>
  1 - 0.42 * interpolate(f, [IMPLODE.from, IMPLODE.to - 1], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });

/** The jolt on every slam (the slam chips above the pass follow it). */
export const slamShake = (f: number) => shake(f, "a0-slam", 8 * Math.min(1, SLAMS.reduce((a, s) => a + burst(f, s.at, 3), 0)));

export const Barrage: React.FC<{ f: number }> = ({ f }) => {
  if (f < DIFF_TO || f >= BLACK) return null;
  const imp = implodeAt(f);
  const sh = slamShake(f);
  return (
    <AbsoluteFill style={{ background: "#000", transform: imp < 1 ? `scale(${imp})` : undefined }}>
      {f < BAR2 ? (
        <Wall f={f} />
      ) : (
        <>
          <AbsoluteFill style={{ translate: `${sh.x}px ${sh.y}px` }}>
            <Tunnel frame={f - BAR2} speed={(tf) => tunnelSpeed(tf + BAR2)} item={tunnelItem} roll={rollAt(f)} centerY={600} />
          </AbsoluteFill>
          {f < HERO.dive.to ? <AbsoluteFill style={{ background: "#000", opacity: heroDim(f) }} /> : null}
          {f < HERO.dive.to ? <HeroCard f={f} /> : null}
          <AbsoluteFill style={{ translate: `${sh.x}px ${sh.y}px` }}>
            <SlamView f={f} />
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── the pass ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Cut frames and their weights: the cut to the wall, the whip's peak, the hero, every slam. */
const CUTS: [number, number][] = [
  [DIFF_TO, 1],
  [WHIPS[0].at + WHIPS[0].dur / 2, 0.6],
  [BAR2, 1],
  ...SLAMS.map((s): [number, number] => [s.at, s.at === BAR3 || s.at === LAST_SLAM ? 1 : 0.75]),
];

/** The barrage's look at frame f (null outside the barrage: nothing to process). */
export const barrageLook = (f: number): BarrageLook | null => {
  if (f < DIFF_TO || f >= BLACK) return null;
  const hit = Math.min(1, CUTS.reduce((a, [at, w]) => a + w * burst(f, at, 2), 0));
  const parts = [gradeLook(), hitLook(hit, f, 0)];
  if (f < BAR2) {
    const mo = camMotion(stripCam, f);
    parts.push(motionLook(mo.vx, mo.vy, mo.zoomRate));
    parts.push({ centerX: ANCHOR.x / 1920, centerY: ANCHOR.y / 1080 });
  } else if (f < HERO.dive.to) {
    const s0 = heroPose(f - 0.5).s;
    const s1 = heroPose(f + 0.5).s;
    const z0 = heroZoom(f - 0.5);
    const z1 = heroZoom(f + 0.5);
    parts.push({
      zoom: Math.min(0.3, 0.5 * (Math.abs(s1 - s0) / heroPose(f).s + Math.abs(z1 - z0) / heroZoom(f) * 0.5)),
      centerX: HERO_BOX.cx / 1920,
      centerY: HERO_BOX.cy / 1080,
    });
  } else {
    const slam = slamOn(f);
    parts.push({ zoom: slam ? 0.004 : Math.min(0.12, tunnelSpeed(f) / 2600), rgbRadial: 0.6, centerX: 0.5, centerY: PANEL.cy / 1080 });
  }
  if (f >= IMPLODE.from) parts.push({ zoom: 0.12 * interpolate(f, [IMPLODE.from, BLACK - 1], [0, 1], clamp), centerX: 0.5, centerY: 0.5 });
  return mergeLooks(f, stepSeed(f, 2), ...parts);
};
