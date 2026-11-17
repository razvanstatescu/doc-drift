import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { EASE, tween, W } from "../../../lib/time";
import {
  amber,
  BRAND,
  cam3At,
  Camera3D,
  capPose,
  capRectToScreen,
  capToScreen,
  clockValue,
  DAY,
  elevAt,
  FONT,
  InkLabel,
  ink,
  KineticDock,
  Lift,
  MistBand,
  rampPeak,
  RealTake,
  screenRectOf,
  SpeedChip,
  Stage,
  type Cam3Key,
  type CapKey,
  type Rect,
  type RemapKey,
  type SpotKey,
  type TakeClick,
} from "../../../v4/kit";
import type { CaptureMask } from "../../../lib/captures";
import { BYLINE, BylineItem, bylineTitle, PageTwin, pageRects, textWidth, type PageTwinProps } from "../../../v4/twins";
import { ANSWER_BOX, ANSWER_STILL, CLICK_DRIFT, MCP_TAG, REC, REC_T, ROVO_TAG } from "./data";
import { GlossChip, type GlossWord } from "./GlossChip";
import { McpSlab, SLAB, slabHeight } from "./McpSlab";
import { KEYS, T } from "./timing";

/**
 * AGENTS (v5, film 1575 to 2100, S13 to S15; video/V5.md section 5). Two stations, slower than v4.
 *
 *   Station 1, the page and Rovo (0 to 344). The runbook's head (a twin: title and the lit byline "Possibly stale · Doc
 *   Drift", no Steps, so no command is ever in frame) sits alone, composed for the kit's whip. On "Rovo" the real Rovo
 *   panel slides in at reading size and the page makes room; a chip sets "Rovo · Atlassian's AI" word by word. The
 *   panel is ONE directed take of p3-rovo-v2-rec with jump cuts, all on beats, never past 1 film px per capture px:
 *     A  15   the panel just open (1x), the greeting
 *     B  90   the agent list, Drift Reviewer found; the recorded click lands 3 frames before "Drift" (1x); a push in
 *     C  150  the question typing on "how to roll back" (1.33x, the bottom of the panel)
 *     D  195  sent; the thinking at 6x with "6× speed" and real seconds since Enter ("Check page freshness" on "step")
 *     E  240  the real answer (p3-rovo-v2-answer) on "it warns"; the spotlight finds its first two sentences; the
 *             badge's words lift off the page on their amber and land on the answer's own "Possibly stale" 3 frames
 *             before "may", where the amber drains into the Mist band; Mist on the second sentence on "and why"
 *   Station 2, the coding assistant (345 to 524): a hard cut on the bar (the score's new phrase) to the dark slab
 *   "Coding assistant": the question, the call `doc-drift · check-page-freshness` on "get", three real output lines,
 *   "possibly_stale" the one amber on "the same check", a push in; "MCP · an open standard for AI tools" word by word.
 * The take is tagged once ("Recorded in Rovo · demo site, Nov 13": it was recorded after the seeded replay of PR #482,
 * so never "after the merge"), the output once ("Real output: doc-drift MCP, Nov 13").
 */

// ---------------------------------------------------------------------------------------------------------------------
// Station 1: the page (a twin, on the Day stage)
// ---------------------------------------------------------------------------------------------------------------------

const K = 1.7;
/** The runbook twin at 520 UI px (the head's rows still fit on one line), its cuts open so the head is its own card. */
const PAGE: PageTwinProps = {
  world: "day",
  k: K,
  width: 520,
  x: Math.round((W - 520 * K) / 2),
  y: 330,
  byline: { kind: "dds", state: "possibly_stale", amber: false },
  elev: 3,
  explode: 1, // opens the cuts only: no perspective reaches the twin here, so nothing moves in depth
};
const RECTS = pageRects(PAGE);
/** The head card: the top band with its gap half taken off (PAGE.cut 12 UI px), corners R above and cutR below. */
const HEAD: Rect = { ...RECTS.bands.top, h: RECTS.bands.top.h - 6 * K };
/** The page makes room for Rovo: the stage pans so the card sits 84 px from the left edge. */
const PAN = PAGE.x! - 84;
const STAGE_KEYS: Cam3Key[] = [
  { at: 0, dur: 0, to: { x: 960, y: 540, zoom: 1 } },
  { at: T.open, dur: 16, to: { x: 960 + PAN, y: 540, zoom: 1 }, ease: EASE.expoOut },
];
const STAGE_CAM = { creep: 0.5, float: 4, seed: "agents-page" };

const CARRY_AT = T.carryLand - T.carryDur;
/** The byline's amber leaves with its words (6 frames, expo out): the slipped words return home as their copy lifts. */
const bylineLit = (frame: number) => 1 - tween(frame, CARRY_AT, CARRY_AT + 6, 0, 1, EASE.expoOut);

/** The byline item's words "Possibly stale" on their amber block, in stage px, at a lit level (BylineItem's own geometry). */
function bylineWordsRect(lit: number): Rect {
  const u = K; // size 15 = BYLINE.size
  const wordsX = (BYLINE.padX + BYLINE.icon + BYLINE.gap) * u;
  const wordsW = textWidth(bylineTitle("possibly_stale"), { size: BYLINE.size, weight: BYLINE.weight }) * K;
  const padW = 4 * u;
  const dx = lit * 0.117 * (wordsW + 2 * padW);
  const h = BYLINE.h * u;
  const blockH = BYLINE.size * u * 1.32;
  const psW = textWidth("Possibly stale", { size: BYLINE.size, weight: BYLINE.weight }) * K;
  return { x: RECTS.badge.x + wordsX + dx - padW, y: RECTS.badge.y + (h - blockH) / 2, w: psW + 2 * padW, h: blockH };
}

const PageHead: React.FC = () => {
  const frame = useCurrentFrame();
  const b = RECTS.badge;
  const wordsX = (BYLINE.padX + BYLINE.icon + BYLINE.gap) * K;
  return (
    <>
      {/* the head card's own shadow, drawn whole (the twin below is cut at the head's edge) */}
      <div
        style={{
          position: "absolute",
          left: HEAD.x,
          top: HEAD.y,
          width: HEAD.w,
          height: HEAD.h,
          borderRadius: `${22 * K}px ${22 * K}px ${12 * K}px ${12 * K}px`,
          boxShadow: elevAt(3),
        }}
      />
      {/* only the page's head, clipped to its own card (the Steps band, its command and its shadow never show) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: 1080,
          clipPath: `inset(${HEAD.y}px ${W - HEAD.x - HEAD.w}px ${1080 - HEAD.y - HEAD.h}px ${HEAD.x}px round ${22 * K}px ${22 * K}px ${12 * K}px ${12 * K}px)`,
        }}
      >
        <PageTwin {...PAGE} />
      </div>
      {/* the byline item, drawn again over the twin's own so its amber can leave smoothly with the carried words */}
      <div style={{ position: "absolute", left: b.x + wordsX - 4, top: b.y, width: b.w - wordsX + 8, height: b.h, background: DAY.surface }} />
      <BylineItem state="possibly_stale" world="day" k={K} lit={bylineLit(frame)} x={b.x} y={b.y} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Station 1: the Rovo strip (one directed take, jump cuts on beats)
// ---------------------------------------------------------------------------------------------------------------------

const CAP = { w: 3840, h: 2160 };
/** The panel and its left border; below the top bar (whose "Ask Rovo" click is not shown: the panel slides in). */
const CROP: Rect = { x: 2962, y: 96, w: 878, h: 2064 };
const STRIP = { creep: 0.6, float: 3, seed: "rovo" };

type Seg = { id: string; from: number; to: number; capture: string; keys?: RemapKey[]; camera: CapKey[]; spot?: SpotKey[]; clicks?: TakeClick[]; masks?: CaptureMask[] };

const SEGS: Seg[] = [
  {
    id: "A",
    from: T.open,
    to: T.cutList,
    capture: REC,
    keys: KEYS.A,
    camera: [{ at: T.open, dur: 0, to: { cx: 3840, cy: 685, s: 0.93 } }],
    // the "Ask Rovo" button's own tooltip ("Chat" and its shortcut) hangs into the header from the top bar, which is
    // cropped out; it carries nothing, so the header's white covers it (its blank middle, no UI text)
    masks: [{ box: [3352, 96, 136, 104], fill: "#FFFFFF", why: "Ask Rovo tooltip, its button cropped out" }],
  },
  {
    id: "B",
    from: T.cutList,
    to: T.cutType,
    capture: REC,
    keys: KEYS.B,
    camera: [
      { at: T.cutList, dur: 0, to: { cx: 3840, cy: 667, s: 0.96 } },
      // after the click the greeting has gone: push in to 1:1, the welcome's heading sets at the bottom
      { at: T.click + 2, dur: 16, to: { cx: 3840, cy: 650, s: 1 }, ease: EASE.expoInOut },
    ],
    clicks: [{ t: REC_T.clickDrift, x: CLICK_DRIFT.x, y: CLICK_DRIFT.y, from: CLICK_DRIFT.from, travel: 14 }],
  },
  { id: "C", from: T.cutType, to: T.cutThink, capture: REC, keys: KEYS.C, camera: [{ at: T.cutType, dur: 0, to: { cx: 3840, cy: 1610, s: 1 } }] },
  { id: "D", from: T.cutThink, to: T.cutAnswer, capture: REC, keys: KEYS.D, camera: [{ at: T.cutThink, dur: 0, to: { cx: 3840, cy: 650, s: 1 } }] },
  {
    id: "E",
    from: T.cutAnswer,
    to: T.cutSlab,
    capture: ANSWER_STILL,
    camera: [
      { at: T.cutAnswer, dur: 0, to: { cx: 3840, cy: 673, s: 0.94 } },
      // "and why": a push to 1:1 on the second sentence while its Mist sweeps
      { at: T.pushWhy, dur: 18, to: { cx: 3840, cy: 650, s: 1 }, ease: EASE.expoInOut },
    ],
    spot: [{ at: T.spotOn, dur: 14, rect: ANSWER_BOX.firstTwo, amount: 1 }],
  },
];

const segAt = (frame: number) => SEGS.find((s) => frame >= s.from && frame < s.to);
const poseOf = (seg: Seg, frame: number) => capPose(frame, seg.camera, { ...STRIP, cap: CAP });

/** The strip slides in from the right on "Rovo" (expo out), then stays. */
const slideX = (frame: number) => (1 - tween(frame, T.open, T.open + T.openDur, 0, 1, EASE.expoOut)) * 900;

/** The words the badge carried, landed: amber over the real words (multiply), draining into the Mist band. */
const LandedMark: React.FC<{ rect: Rect; at: number }> = ({ rect, at }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const a = 1 - tween(frame, at, at + 9, 0, 1, EASE.cubicInOut);
  const pad = rect.h * 0.22;
  const box: React.CSSProperties = { position: "absolute", left: rect.x - pad * 0.6, top: rect.y - pad, width: rect.w + pad * 1.2, height: rect.h + 2 * pad, borderRadius: 4, mixBlendMode: "multiply" };
  return (
    <>
      {a < 0.999 ? <div style={{ ...box, background: BRAND.mist, opacity: 1 - a }} /> : null}
      {a > 0.001 ? <div style={{ ...box, background: BRAND.beacon, opacity: a }} /> : null}
    </>
  );
};

const RovoStrip: React.FC = () => {
  const frame = useCurrentFrame();
  const seg = segAt(frame);
  if (!seg) return null;
  const pose = poseOf(seg, frame);
  const left = capToScreen(pose, CROP.x, 0, CAP)[0];
  const dx = slideX(frame);
  return (
    <AbsoluteFill style={{ transform: dx > 0.5 ? `translateX(${dx}px)` : undefined }}>
      {/* the panel's white runs to the frame's edge under the creep; a soft shadow lifts its left edge off the stage */}
      <div style={{ position: "absolute", left: left + 1, top: -20, width: W - left + 60, height: 1120, background: "#FFFFFF" }} />
      <div style={{ position: "absolute", left: left - 34, top: -20, width: 34, height: 1120, background: `linear-gradient(to right, ${ink(0)}, ${ink(0.06)})` }} />
      <RealTake
        key={seg.id}
        capture={seg.capture}
        time={seg.keys ? { keys: seg.keys } : undefined}
        camera={seg.camera}
        spot={seg.spot}
        clicks={seg.clicks}
        masks={seg.masks}
        crop={CROP}
        speed={false}
        background="transparent"
        {...STRIP}
      >
        {seg.id === "E" ? (
          <>
            <LandedMark rect={ANSWER_BOX.possiblyStale} at={T.carryLand} />
            <MistBand rect={ANSWER_BOX.sentence2a} at={T.mist2a} />
            <MistBand rect={ANSWER_BOX.sentence2b} at={T.mist2b} dur={8} />
          </>
        ) : null}
      </RealTake>
    </AbsoluteFill>
  );
};

const CHIP_ROVO: GlossWord[] = [
  { text: "Rovo", at: T.chipWords[0] },
  { text: "· Atlassian's", at: T.chipWords[1] },
  { text: "AI", at: T.chipWords[2] },
];

// ---------------------------------------------------------------------------------------------------------------------
// Station 1: overlays (the take's tag, the honest ramp, the carried words)
// ---------------------------------------------------------------------------------------------------------------------

/** The stage's right edge beside the strip (right-aligned labels end here). */
const LABEL_RIGHT = 1016;

const RightAligned: React.FC<{ y: number; width: number; children: React.ReactNode }> = ({ y, width, children }) => (
  <div style={{ position: "absolute", left: LABEL_RIGHT - width, top: y }}>{children}</div>
);

/** Real seconds since Enter while the thinking runs at 6x: a small white card beside the speed label. */
const ThinkClock: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.cutThink + 1 || frame >= T.cutAnswer) return null;
  const v = Math.floor(clockValue(frame, KEYS.D, REC_T.enter) + 1e-6);
  const rate = rampPeak(frame, KEYS.D);
  const cardW = 300;
  return (
    <>
      <Lift at={T.cutThink + 1} to={2} x={LABEL_RIGHT - cardW} y={790} radius={22}>
        <div style={{ width: cardW, boxSizing: "border-box", padding: "16px 24px 18px", borderRadius: 22, background: DAY.surface, fontFamily: FONT.sans, color: DAY.text }}>
          <div style={{ fontSize: 24, lineHeight: "30px", fontWeight: 500, color: DAY.textMuted, whiteSpace: "nowrap" }}>Since the question</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 60, lineHeight: "64px", fontWeight: 600, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{v}</span>
            <span style={{ fontSize: 30, fontWeight: 500, color: DAY.textMuted }}>s</span>
          </div>
        </div>
      </Lift>
      {/* the speed label beside the clock: the ramp and the real seconds read as one pair */}
      <SpeedChip rate={rate} x={LABEL_RIGHT - cardW - 24 - 168} y={832} />
    </>
  );
};

/** The badge's words "Possibly stale" on their amber, lifted off the page and flown into the answer's own words. */
const CarriedWords: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < CARRY_AT || frame >= T.carryLand) return null;
  const from = screenRectOf(cam3At(CARRY_AT, STAGE_KEYS, STAGE_CAM), bylineWordsRect(1));
  const segE = SEGS[SEGS.length - 1];
  const real = capRectToScreen(poseOf(segE, T.carryLand), ANSWER_BOX.possiblyStale, CAP);
  const toW = real.w + 12;
  const toH = (from.h * toW) / from.w;
  const to: Rect = { x: real.x - 6, y: real.y + real.h / 2 - toH / 2 + 1, w: toW, h: toH };
  const font = BYLINE.size * K * (to.w / from.w);
  return (
    <KineticDock at={CARRY_AT} dur={T.carryDur} fromRect={from} toRect={to} arc={46} lift={4}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 4 * K * (to.w / from.w),
          background: BRAND.beacon,
          boxShadow: `0 0 0 1px ${amber(0.35)}, 0 6px 22px ${amber(0.45)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.sans,
          fontWeight: BYLINE.weight,
          fontSize: font,
          lineHeight: 1,
          color: BRAND.fathom,
          whiteSpace: "nowrap",
        }}
      >
        Possibly stale
      </div>
    </KineticDock>
  );
};

const StationRovo: React.FC = () => {
  const frame = useCurrentFrame();
  const tagW = 26 * 0.55 + 27 + textWidth(ROVO_TAG, { size: 26, weight: 500 }) + 26 * 0.66 + 4;
  return (
    <AbsoluteFill>
      <Stage world="day" motif="grid" light={["24%", "40%"]}>
        <Camera3D keys={STAGE_KEYS} {...STAGE_CAM}>
          <PageHead />
        </Camera3D>
      </Stage>
      <RovoStrip />
      {frame >= T.open + T.openDur + 2 ? (
        <RightAligned y={986} width={tagW}>
          <div style={{ opacity: tween(frame, T.open + T.openDur + 2, T.open + T.openDur + 6, 0, 1, EASE.linear) }}>
            <InkLabel icon="eye" size={26}>
              {ROVO_TAG}
            </InkLabel>
          </div>
        </RightAligned>
      ) : null}
      {/* "Rovo · Atlassian's AI" beside the panel's head, growing away from it (never over the real UI) */}
      <GlossChip words={CHIP_ROVO} x={LABEL_RIGHT} y={64} out={T.chipOut} align="right" />
      <ThinkClock />
      <CarriedWords />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// Station 2: the coding assistant
// ---------------------------------------------------------------------------------------------------------------------

const SLAB_H = slabHeight();
const SLAB_X = Math.round((W - SLAB.w) / 2);
const SLAB_Y = 345;
const CHIP_MCP: GlossWord[] = ["MCP", "· an", "open", "standard", "for", "AI", "tools"].map((text, i) => ({ text, at: T.mcpWords[i] }));
const SLAB_KEYS: Cam3Key[] = [
  { at: T.cutSlab, dur: 0, to: { x: 960, y: 540, zoom: 1 } },
  // one decisive push toward the output on "get the same check"
  { at: T.push, dur: 22, to: { x: 960, y: 588, zoom: 1.05 }, ease: EASE.expoInOut },
  // then the camera finds the gloss under the slab on "an open standard"
  { at: T.pushGloss, dur: 24, to: { x: 900, y: 604, zoom: 1.11 }, ease: EASE.expoInOut },
];

const StationSlab: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage world="day" motif="tide" tide={{ top: 820, bottom: 1060 }} light={["50%", "38%"]}>
      <Camera3D keys={SLAB_KEYS} creep={1.2} float={4} seed="agents-slab">
        {frame >= T.tag ? (
          <div style={{ position: "absolute", left: SLAB_X, top: SLAB_Y - 66, opacity: tween(frame, T.tag, T.tag + 4, 0, 1, EASE.linear) }}>
            <InkLabel icon="eye" size={28}>
              {MCP_TAG}
            </InkLabel>
          </div>
        ) : null}
        <McpSlab x={SLAB_X} y={SLAB_Y} enter={T.cutSlab} question={T.question} call={T.call} out={T.out} amberAt={T.amber} />
        <GlossChip words={CHIP_MCP} x={SLAB_X} y={SLAB_Y + SLAB_H + 30} />
      </Camera3D>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------------------------------

const Sounds: React.FC = () => (
  <>
    <Sfx id="swish-up" at={T.open + 6} gainDb={-2} />
    <Sfx id="click" at={T.click} />
    <Sfx id="type-burst" at={T.cutType + 1} gainDb={-4} />
    <Sfx id="pop" at={T.cutAnswer} gainDb={-2} />
    <Sfx id="whoosh-short" at={T.carryLand - 7} gainDb={-6} />
    <Sfx id="tick-soft" at={T.carryLand} />
    {/* the cut to the coding assistant lands on the score's new phrase with a crisp tick (a strong onset) */}
    <Sfx id="tick" at={T.cutSlab} />
    <Sfx id="pop" at={T.mcpWords[0] + 2} gainDb={-2} />
  </>
);

const AGENTS: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: DAY.ground }}>
      {frame < T.cutSlab ? <StationRovo /> : <StationSlab />}
      <Sounds />
    </AbsoluteFill>
  );
};

export default AGENTS;
