import React from "react";
import { measureText } from "@remotion/layout-utils";
import { AbsoluteFill, interpolateColors, useCurrentFrame } from "remotion";
import { SLIP_UNIT } from "../../../brand/tokens";
import { EASE, tween } from "../../../lib/time";
import { BYLINE, BylineItem, bylineItemSize, bylineTitle, PageTwin, pageRects, textWidth } from "../../twins";
import { BRAND, DAY, elevAt, FONT, NIGHT } from "../../look";
import {
  AmberBlock,
  cam3At,
  Camera3D,
  cameraToMatch,
  CarryHold,
  clockValue,
  GrowReveal,
  InkLabel,
  KineticDock,
  PushSwap,
  RewindFrom,
  screenRectOf,
  EditLine,
  Eyebrow,
  HonestClock,
  MaskLine,
  PageOverCode,
  pageOverCodeRects,
  RealTake,
  Stage,
  takeKeys,
  TypeToUI,
  useFontsReady,
  WhipBlur,
  type CapKey,
  type SpotKey,
  type TakeEvent,
} from "../index";

/**
 * v5 kit demos (Dev/Kit4, first part). Each is a self-contained shot on its own local frames.
 * DemoRealTake: the real merge of PR #482 (p2-merge-rec) directed at full size, then the real flagged page: R6's P1
 * rebuilt on RealTake (same measured events, camera and spotlight), the clock carried across the whip onto 19 s.
 */

// p2-merge.mp4, measured (R6 section 7): Merge click 2.523 s, dialog 2.72 s, confirm click 5.178 s, "Merge in
// progress" 5.83 s, "Merged" 12.70 s. The anchors land the two clicks and "Merged" on beats 3, 6 and 9.
const MERGE_EVENTS: TakeEvent[] = [
  { f: 45, t: 2.523 },
  { f: 90, t: 5.178 },
  { f: 135, t: 12.7 },
];
const MERGE_START = 1.023;
const MERGE_KEYS = takeKeys(MERGE_EVENTS, { start: MERGE_START, label: "demo merge" });
const CONFIRM = 5.178;
const SEAM = 184; // the whip's seam
const LAND = 210; // the clock lands on 19 s; the spotlight finds the badge

const REC_CAM: CapKey[] = [
  { at: 0, to: { cx: 1920, cy: 1080, s: 0.54 } },
  { at: 4, dur: 36, to: { cx: 2240, cy: 700, s: 0.66 }, ease: EASE.expoInOut }, // the header: title and Merge
  { at: 47, dur: 20, to: { cx: 1920, cy: 640, s: 0.86 } }, // the dialog
  { at: 70, dur: 18, to: { cx: 2140, cy: 830, s: 1.0 } }, // the confirm button, 1:1
  { at: 96, dur: 22, to: { cx: 1860, cy: 800, s: 0.7 } }, // back out: header and banner
  { at: 126, dur: 24, to: { cx: 1560, cy: 590, s: 0.94 } }, // onto "Merged"
];
const REC_SPOT: SpotKey[] = [
  { at: 10, dur: 26, rect: { x: 690, y: 170, w: 3150, h: 260 }, amount: 1 },
  { at: 49, dur: 12, rect: { x: 1310, y: 110, w: 1220, h: 900 }, amount: 1 },
  { at: 74, dur: 12, rect: { x: 1990, y: 862, w: 540, h: 128 }, amount: 1 },
  { at: 96, dur: 18, rect: { x: 690, y: 170, w: 2310, h: 600 }, amount: 1 },
  { at: 133, dur: 14, rect: { x: 700, y: 182, w: 2280, h: 572 }, amount: 1 },
];
// the flagged page: cropped above the header table (its Owner row must never show), the camera on title and byline
const PAGE_CAM: CapKey[] = [
  { at: 0, to: { cx: 2050, cy: 600, s: 0.62 } },
  { at: 188, dur: 24, to: { cx: 2150, cy: 560, s: 0.98 } },
];
const PAGE_SPOT: SpotKey[] = [
  { at: 191, dur: 14, rect: { x: 1450, y: 300, w: 1360, h: 230 }, amount: 1 },
  { at: LAND - 2, dur: 12, rect: { x: 2250, y: 444, w: 372, h: 66 }, amount: 1 },
  // a held take stays alive (R6 6.4): the spotlight drifts back to the title and byline as the line sets
  { at: 262, dur: 18, rect: { x: 1450, y: 300, w: 1360, h: 230 }, amount: 1 },
];
const PAGE_CROP = { x: 0, y: 0, w: 3840, h: 600 };

/** The clock: real seconds since the confirm click during the take, then carried to the measured 19 s at the landing. */
function demoClock(frame: number): number {
  if (frame <= SEAM - 4) return clockValue(frame, MERGE_KEYS, CONFIRM);
  const from = clockValue(SEAM - 4, MERGE_KEYS, CONFIRM);
  return from + (19 - from) * tween(frame, SEAM - 4, LAND, 0, 1, EASE.expoOut);
}

export const DemoRealTake: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: DAY.ground, fontFamily: FONT.sans }}>
      <WhipBlur
        at={SEAM}
        dir="left"
        from={
          <RealTake
            capture="p2-merge-rec"
            time={{ events: MERGE_EVENTS, start: MERGE_START }}
            camera={REC_CAM}
            spot={REC_SPOT}
            clicks={[
              { t: 2.523, x: 3621, y: 393 },
              { t: 5.178, x: 2256, y: 925 },
            ]}
            tag={{ text: "Recorded in Bitbucket: the real merge", at: 6, until: SEAM - 3 }}
          />
        }
        to={<RealTake capture="p2-flagged" camera={PAGE_CAM} spot={PAGE_SPOT} crop={PAGE_CROP} tag={{ text: "Recorded in Confluence", at: 194 }} />}
      />
      <HonestClock
        at={90}
        value={demoClock(frame)}
        label="Since the merge click"
        swap={{ at: LAND - 1, label: "Merge to flag" }}
        note={{ at: LAND + 4, text: "Measured on the demo site, Nov 13" }}
      />
      {/* S11's gloss, set under the badge as it is said (the functional voice) */}
      <div style={{ position: "absolute", left: 1062, top: 512 }}>
        <MaskLine at={236} style={{ fontFamily: FONT.sans, fontSize: 40, fontWeight: 500, color: DAY.text, whiteSpace: "nowrap" }}>
          it may be out of date
        </MaskLine>
      </div>
    </AbsoluteFill>
  );
};
export const DEMO_REALTAKE_FRAMES = 300;

// ---------------------------------------------------------------------------------------------------------------------
// EditType: type becomes UI, strike and replace (R6's P3 on the kit)
// ---------------------------------------------------------------------------------------------------------------------

const ET = { STATE_IN: 10, DOCK: 58, DOCK_DUR: 18, PUSH: 84, MARK: 104, STRIKE: 120, REPLACE: 130, RESULT: 148, PULL: 160, SNAP: 172 };
const ET_CARD = { x: 90, y: 150, w: 1000, h: 700 };
const ET_K = 2.2;
const ET_BY_Y = ET_CARD.y + 218;
const ET_BY_TEXT = "By Razvan Statescu";

export const DemoEditType: React.FC = () => {
  const frame = useCurrentFrame();
  const ready = useFontsReady();
  const byTextW = ready ? measureText({ text: ET_BY_TEXT, fontFamily: FONT.sans, fontWeight: 400, fontSize: 30 }).width : 260;
  const itemX = ET_CARD.x + 56 + byTextW + 26;
  const item = bylineItemSize("possibly_stale", ET_K);
  const itemY = ET_BY_Y + 19 - item.h / 2;
  const land = ET.DOCK + ET.DOCK_DUR;
  // the byline: Verified, then Possibly stale (its swap opens 2 frames before the words land), then Verified on the snap
  const toStale = frame >= land - 5;
  const toVerified = frame >= ET.SNAP - 3;
  const state = toVerified ? "verified" : toStale ? "possibly_stale" : "verified";
  const from = toVerified ? "possibly_stale" : toStale ? "verified" : undefined;
  const swapAt = toVerified ? ET.SNAP : land - 2;
  // the slot: the byline item's words (slipped one unit while Possibly stale)
  const endSize = BYLINE.size * ET_K;
  const wordsW = textWidth(bylineTitle("possibly_stale"), { size: BYLINE.size, weight: BYLINE.weight }) * ET_K;
  const to = { x: itemX + (BYLINE.padX + BYLINE.icon + BYLINE.gap) * ET_K + SLIP_UNIT * wordsW, y: itemY + (item.h - endSize * 1.25) / 2, size: endSize, weight: BYLINE.weight, tracking: 0 };
  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans }}>
      <Stage world="day" motif="grid" light={["30%", "34%"]}>
        <Camera3D
          seed="kit-edit"
          keys={[
            { at: ET.PUSH, dur: 24, to: { x: 700, y: 700, zoom: 1.42 }, ease: EASE.expoInOut },
            { at: ET.PULL, dur: 22, to: { x: 820, y: 560, zoom: 1.12 }, ease: EASE.expoInOut },
          ]}
        >
          <div style={{ position: "absolute", left: ET_CARD.x, top: ET_CARD.y, width: ET_CARD.w, height: ET_CARD.h, borderRadius: 34, background: DAY.surface, boxShadow: elevAt(3) }} />
          <div style={{ position: "absolute", left: ET_CARD.x + 56, top: ET_CARD.y + 52 }}>
            <Eyebrow icon="page" size={26}>
              Platform / Runbooks
            </Eyebrow>
            <div style={{ fontSize: 66, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 14, color: DAY.text }}>Payments rollback runbook</div>
          </div>
          <div style={{ position: "absolute", left: ET_CARD.x + 56, top: ET_BY_Y, fontSize: 30, color: DAY.textMuted, whiteSpace: "nowrap" }}>{ET_BY_TEXT}</div>
          <BylineItem state={state} from={from} at={swapAt} k={ET_K} x={itemX} y={itemY} />
          <div style={{ position: "absolute", left: ET_CARD.x + 56, top: ET_CARD.y + 330, width: ET_CARD.w - 112 }}>
            <div style={{ fontSize: 34, fontWeight: 600, color: DAY.text }}>Steps</div>
            <div style={{ marginTop: 22, background: DAY.surfaceSunk, borderRadius: 18, padding: "22px 28px" }}>
              <MaskLine at={4} style={{ fontFamily: FONT.mono, fontSize: 26, color: DAY.textMuted }}>
                export ROLLBACK_TIMEOUT=300
              </MaskLine>
              <MaskLine at={8}>
                <EditLine pre="./" old="scripts/rollback.sh" neu="scripts/rollback-v2.sh" post=" --timeout $ROLLBACK_TIMEOUT" size={26} mark={ET.MARK} strike={ET.STRIKE} replace={ET.REPLACE} />
              </MaskLine>
            </div>
            <MaskLine at={ET.RESULT} style={{ marginTop: 22, fontSize: 24, color: DAY.textMuted, whiteSpace: "nowrap" }}>
              Replaced <span style={{ fontFamily: FONT.mono }}>scripts/rollback.sh</span> with <span style={{ fontFamily: FONT.mono }}>scripts/rollback-v2.sh</span> in 1 place.
            </MaskLine>
          </div>
          <TypeToUI text="Possibly stale." at={ET.STATE_IN} dock={ET.DOCK} dur={ET.DOCK_DUR} from={{ x: 1150, y: 392, size: 88 }} to={to} block="amber" />
        </Camera3D>
      </Stage>
    </AbsoluteFill>
  );
};
export const DEMO_EDITTYPE_FRAMES = 210;

// ---------------------------------------------------------------------------------------------------------------------
// PageOverCode (R6's P2 on the kit), timed like S07: code, then Jira work, the change, the close, the byline
// ---------------------------------------------------------------------------------------------------------------------

const POC = { codeAt: 30, jiraAt: 58, slipAt: 96, closeAt: 132, bylineAt: 160 };
const POC_PAGE = { world: "day" as const, k: 1.5, x: 120, y: 70 };

export const DemoPageOverCode: React.FC = () => {
  const r = pageOverCodeRects({ page: POC_PAGE, ...POC });
  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans }}>
      <Stage world="day" motif="grid" light={["34%", "34%"]}>
        <Camera3D
          seed="kit-poc"
          keys={[
            { at: 0, to: { x: 820, y: 520, zoom: 0.94, yaw: -13, pitch: 9 } },
            { at: 4, dur: 30, to: { x: 960, y: 540, zoom: 1.0, yaw: 0, pitch: 0 }, ease: EASE.expoInOut },
            { at: POC.bylineAt - 6, dur: 26, to: { x: 885, y: r.page.badge.y + r.page.badge.h / 2 + 200, zoom: 1.18 } },
          ]}
        >
          <PageOverCode page={POC_PAGE} {...POC} rise={[0, 32]} />
        </Camera3D>
      </Stage>
    </AbsoluteFill>
  );
};
export const DEMO_PAGEOVERCODE_FRAMES = 210;

// ---------------------------------------------------------------------------------------------------------------------
// Carry cuts (R6's P4 on the kit): Night terminal to the Day runbook on the dead path; the badge words into the answer
// ---------------------------------------------------------------------------------------------------------------------

const CC = { GROW: 32, GROW_DUR: 18, SLIP: 70, SWAP: 85, PUSH: 96, PUSH_DUR: 14, LAND: 115 };
const CC_TERM = { x: 300, y: 330, w: 1320, h: 300 };
const CC_MONO = 34;
const CC_CODE_RATIO = 14.5 / 22; // the page twin's code metrics: 14.5 px type on a 22 px line, tracking -0.01 em
const CC_LINE = CC_MONO / CC_CODE_RATIO;
const CC_ERR = "zsh: no such file or directory: ";
const CC_PATH = "./scripts/rollback.sh";
const CC_A_KEYS = [
  { at: 0, to: { x: 960, y: 500, zoom: 1 } },
  { at: 12, dur: 26, to: { x: 1180, y: 500, zoom: 1.32 }, ease: EASE.expoInOut },
];
const CC_PAGE = { world: "day" as const, k: 1.8, x: 420, y: 40 };
const CC_CARD = { x: 360, y: 210, w: 1200, h: 650 };
const CC_ANS = { x: 420, y: 470, size: 46 };
const CC_PRE = "Payments rollback runbook is ";
const CC_WORD = "Possibly stale";

export const DemoCarry: React.FC = () => {
  const frame = useCurrentFrame();
  const ready = useFontsReady();
  const mw = (t: string, size: number, weight = 400, mono = true) =>
    ready ? measureText({ text: t, fontFamily: mono ? FONT.mono : FONT.sans, fontWeight: weight, fontSize: size }).width : t.length * size * 0.6;
  const mono = (t: string, size: number) => mw(t, size) - 0.01 * size * t.length;
  const tokA = { x: CC_TERM.x + 44 + mono(CC_ERR, CC_MONO), y: CC_TERM.y + 160, w: mono(CC_PATH, CC_MONO), h: CC_LINE };
  const r = pageRects({ ...CC_PAGE, byline: { kind: "dds", state: "verified" } });
  const tokB = r.tokens["./scripts/rollback.sh"]!;
  const ansWord = { x: CC_ANS.x + mw(CC_PRE, CC_ANS.size, 600, false), y: CC_ANS.y, w: mw(CC_WORD, CC_ANS.size, 600, false), h: CC_ANS.size * 1.25 };

  // seam 1: where the dead path sits on screen at the seam, and the page camera that puts its own path exactly there
  const atSeam = screenRectOf(cam3At(CC.GROW, CC_A_KEYS, { seed: "cc-a", float: 2 }), tokA);
  const B_KEYS = [
    { at: 0, dur: 0, to: cameraToMatch(atSeam, tokB) },
    { at: CC.GROW + CC.GROW_DUR - 4, dur: 32, to: { x: 960, y: 520, zoom: 0.94 }, ease: EASE.expoInOut },
    { at: CC.SWAP - 8, dur: 18, to: { x: 1000, y: 330, zoom: 1.12 } },
  ];
  const carried = frame < CC.GROW ? screenRectOf(cam3At(frame, CC_A_KEYS, { seed: "cc-a", float: 2 }), tokA) : screenRectOf(cam3At(frame, B_KEYS, { seed: "cc-b", float: 2 }), tokB);
  const dayInk = tween(frame, CC.GROW + 5, CC.GROW + 11, 0, 1, EASE.linear);

  const worldA = (
    <Stage world="night" motif="none" light={["58%", "46%"]}>
      <Camera3D keys={CC_A_KEYS} seed="cc-a" float={2}>
        <div style={{ position: "absolute", left: CC_TERM.x, top: CC_TERM.y, width: CC_TERM.w, height: CC_TERM.h, borderRadius: 28, background: NIGHT.surfaceSunk, boxShadow: elevAt(3, false, "night") }} />
        <div style={{ position: "absolute", left: CC_TERM.x + 44, top: CC_TERM.y + 30, fontFamily: FONT.sans, fontSize: 26, color: NIGHT.textMuted }}>Terminal · payments-api</div>
        <div style={{ position: "absolute", left: CC_TERM.x + 44, top: CC_TERM.y + 100, fontFamily: FONT.mono, fontSize: CC_MONO, color: NIGHT.text, whiteSpace: "pre" }}>{"$ ./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT"}</div>
        <div style={{ position: "absolute", left: CC_TERM.x + 44, top: tokA.y, fontFamily: FONT.mono, fontSize: CC_MONO, lineHeight: `${CC_LINE}px`, letterSpacing: "-0.01em", color: NIGHT.textMuted, whiteSpace: "pre" }}>
          {CC_ERR}
          <span style={{ color: NIGHT.text }}>{CC_PATH}</span>
        </div>
      </Camera3D>
    </Stage>
  );
  const worldB = (
    <Stage world="day" motif="grid" light={["50%", "30%"]}>
      <Camera3D keys={B_KEYS} seed="cc-b" float={2}>
        <PageTwin {...CC_PAGE} byline={{ kind: "dds", state: "possibly_stale", from: "verified", at: CC.SWAP, amber: frame < CC.PUSH - 2 }} slip={{ at: CC.SLIP, handoff: CC.SWAP }} />
      </Camera3D>
    </Stage>
  );
  const worldC = (
    <Stage world="day" motif="tide" tide={{ top: 820, bottom: 1060 }} light={["50%", "36%"]}>
      <Camera3D seed="cc-c" float={2}>
        <div style={{ position: "absolute", left: CC_CARD.x, top: CC_CARD.y, width: CC_CARD.w, height: CC_CARD.h, borderRadius: 34, background: DAY.surface, boxShadow: elevAt(3) }} />
        <div style={{ position: "absolute", left: CC_ANS.x, top: CC_CARD.y + 52, fontFamily: FONT.sans, fontSize: 36, fontWeight: 600, color: DAY.text }}>Drift Reviewer</div>
        <div style={{ position: "absolute", left: CC_ANS.x, top: CC_ANS.y, fontFamily: FONT.sans, fontSize: CC_ANS.size, fontWeight: 600, lineHeight: 1.25, color: DAY.text, whiteSpace: "pre", letterSpacing: "-0.01em" }}>
          {CC_PRE}
          {frame >= CC.LAND ? (
            <AmberBlock at={CC.LAND - 1} dur={2}>
              <span>{CC_WORD}</span>
            </AmberBlock>
          ) : (
            <span style={{ display: "inline-block", width: ansWord.w, height: ansWord.h * 0.7, verticalAlign: "-0.05em", borderRadius: 8, background: DAY.trace }} />
          )}
          .
        </div>
        <div style={{ position: "absolute", left: CC_ANS.x, top: CC_ANS.y + 86, width: CC_CARD.w - 120, fontFamily: FONT.sans, fontSize: 34, lineHeight: 1.35, color: DAY.text }}>
          <MaskLine at={CC.LAND + 10}>What it describes changed in PR #482 on 2026-11-13,</MaskLine>
          <MaskLine at={CC.LAND + 14}>after it was last verified.</MaskLine>
        </div>
      </Camera3D>
    </Stage>
  );
  // seam 2: the badge words fly from the byline into the answer's slot while the worlds push
  const badge = screenRectOf(cam3At(CC.PUSH - 1, B_KEYS, { seed: "cc-b", float: 2 }), r.badge);
  const fromR = { x: badge.x + badge.w * 0.2, y: badge.y, w: badge.w * 0.6, h: badge.h };
  return (
    <AbsoluteFill style={{ background: NIGHT.ground, fontFamily: FONT.sans }}>
      <PushSwap at={CC.PUSH} dur={CC.PUSH_DUR} outgoing={<GrowReveal at={CC.GROW} dur={CC.GROW_DUR} from={carried} outgoing={worldA} incoming={worldB} />} incoming={worldC} />
      {frame >= CC.GROW - 2 && frame < CC.GROW + CC.GROW_DUR ? (
        <CarryHold rect={{ x: carried.x - 8, y: carried.y - 2, w: carried.w + 16, h: carried.h + 4 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 8, background: interpolateColors(dayInk, [0, 1], ["#2D4349", DAY.surfaceSunk]) }} />
          <div style={{ position: "absolute", left: 8, top: 2, height: carried.h, fontFamily: FONT.mono, fontSize: carried.h * CC_CODE_RATIO, lineHeight: `${carried.h}px`, letterSpacing: "-0.01em", color: dayInk < 0.5 ? NIGHT.text : DAY.text, whiteSpace: "pre" }}>
            {CC_PATH}
          </div>
        </CarryHold>
      ) : null}
      {frame >= CC.PUSH - 2 && frame < CC.LAND ? (
        <KineticDock at={CC.PUSH - 2} dur={CC.LAND - CC.PUSH + 2} fromRect={fromR} toRect={ansWord} arc={70}>
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: BRAND.beacon, fontFamily: FONT.sans, fontWeight: 600, fontSize: ansWord.h / 1.25, color: BRAND.fathom, whiteSpace: "nowrap" }}>
            {CC_WORD}
          </div>
        </KineticDock>
      ) : null}
    </AbsoluteFill>
  );
};
export const DEMO_CARRY_FRAMES = 195;

// ---------------------------------------------------------------------------------------------------------------------
// RewindFrom: the PageOverCode demo's last frames, backwards, then the next world ("Rewind a week")
// ---------------------------------------------------------------------------------------------------------------------

export const DemoRewind: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {frame < 24 ? (
        <RewindFrom from={DEMO_PAGEOVERCODE_FRAMES - 1} span={170} dur={24} chip="Last week">
          <DemoPageOverCode />
        </RewindFrom>
      ) : (
        <Stage world="day" motif="grid">
          <Camera3D seed="kit-rewind">
            <div style={{ position: "absolute", left: 64, top: 56 }}>
              <InkLabel icon="eye" size={26}>
                Real product · demo site · Nov 13
              </InkLabel>
            </div>
            <PageTwin world="day" k={1.5} x={120} y={70} byline={{ kind: "reviewed", text: "Reviewed 34 days ago" }} />
          </Camera3D>
        </Stage>
      )}
    </AbsoluteFill>
  );
};
export const DEMO_REWIND_FRAMES = 60;
