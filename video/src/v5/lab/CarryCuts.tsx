import React from "react";
import { measureText } from "@remotion/layout-utils";
import { AbsoluteFill, interpolateColors, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { EASE, H, W, tween } from "../../lib/time";
import { AmberBlock, Bloom, cam3At, Camera3D, MistBand, Stage, stageToScreen, useFontsReady, type Cam3Key } from "../../v4/kit";
import { amber, BRAND, DAY, elevAt, FONT, NIGHT, type Rect } from "../../v4/look";
import { PageTwin, pageRects, type PageTwinProps } from "../../v4/twins";
import { Bed } from "./common";
import { MaskLine } from "./EditType";

/**
 * R6 prototype 4 · Carry cuts (v5 technique "one object carries the eye across the seam").
 *
 * Two seams, two variants, three worlds, 6.5 s, and the eye never resets:
 *   Seam 1, the GROW REVEAL (Night to Day): the dead path in the 3 a.m. error is the carried object; the next world opens
 *     as a window growing out of it, and the same words are the runbook's step 2: the page is where the dead step came
 *     from. Then the camera pulls back to show the page.
 *   Seam 2, the LOCKED PUSH: the page's badge words lift off as the carried object; the page pushes out left, the agent's
 *     answer pushes in from the right, and the words land in the answer's own slot: "... runbook is Possibly stale."
 * Both cuts are on the film's own bars: the lab bed starts at film frame 1017, so lab f40 is the film's Night-to-Day bar
 * (1057) and f100 the next bar. Real strings only (the verbatim Drift Reviewer answer, D38).
 */

export const CC_DUR = 195;

const SEAM1 = 40;
const GROW0 = 32;
const GROW1 = 50;
const SLIP = 70;
const SWAP = 85;
const PUSH0 = 96;
const PUSH1 = 110;
const LAND = 115;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
const rectOnScreen = (pose: ReturnType<typeof cam3At>, r: Rect): Rect => {
  const [x0, y0] = stageToScreen(pose, r.x, r.y);
  const [x1, y1] = stageToScreen(pose, r.x + r.w, r.y + r.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

// --- world A: 3 a.m. (Night) -------------------------------------------------------------------------------------------
const TERM = { x: 300, y: 330, w: 1320, h: 300 };
const MONO = 34;
/** The page twin's code metrics (PageTwin S.code): 14.5 px type on a 22 px line, tracking -0.01 em. */
const CODE_RATIO = 14.5 / 22;
const LINE_A = MONO / CODE_RATIO;
const ERR_PRE = "zsh: no such file or directory: ";
const PATH = "./scripts/rollback.sh";
const A_KEYS: Cam3Key[] = [
  { at: 0, to: { x: 960, y: 500, zoom: 1 } },
  { at: 12, dur: 26, to: { x: 1180, y: 500, zoom: 1.32 }, ease: EASE.expoInOut }, // to the detail before the cut
];

// --- world B: the runbook (Day) -----------------------------------------------------------------------------------------
const P: PageTwinProps = { world: "day", k: 1.8, x: 420, y: 40 };

// --- world C: the agent's answer (Day) ----------------------------------------------------------------------------------
const CARD = { x: 360, y: 210, w: 1200, h: 650 };
const ANS = { x: 420, y: 470, size: 46 };
const ANS_PRE = "Payments rollback runbook is ";
const ANS_WORD = "Possibly stale";

function useLayout() {
  const ready = useFontsReady();
  const mw = (t: string, size: number, weight = 400, mono = true) =>
    ready ? measureText({ text: t, fontFamily: mono ? FONT.mono : FONT.sans, fontWeight: weight, fontSize: size }).width : t.length * size * 0.6;
  const mono = (t: string, size: number) => mw(t, size) - 0.01 * size * t.length; // with the -0.01 em tracking
  const tokA: Rect = { x: TERM.x + 44 + mono(ERR_PRE, MONO), y: TERM.y + 160, w: mono(PATH, MONO), h: LINE_A };
  const r = pageRects({ ...P, byline: { kind: "dds", state: "verified" } });
  const tokB = r.tokens["./scripts/rollback.sh"]!;
  const ansWord: Rect = { x: ANS.x + mw(ANS_PRE, ANS.size, 600, false), y: ANS.y, w: mw(ANS_WORD, ANS.size, 600, false), h: ANS.size * 1.25 };
  return { tokA, tokB, r, ansWord, mw };
}

const WorldA: React.FC<{ tokA: Rect }> = ({ tokA }) => {
  const frame = useCurrentFrame();
  return (
    <Stage world="night" motif="none" light={["58%", "46%"]}>
      <Camera3D keys={A_KEYS} seed="carry-a" float={2}>
        <div style={{ position: "absolute", left: TERM.x, top: TERM.y, width: TERM.w, height: TERM.h, borderRadius: 28, background: NIGHT.surfaceSunk, boxShadow: elevAt(3, false, "night") }} />
        <div style={{ position: "absolute", left: TERM.x + 44, top: TERM.y + 30, fontFamily: FONT.sans, fontSize: 26, color: NIGHT.textMuted }}>Terminal · payments-api</div>
        <div style={{ position: "absolute", left: TERM.x + 44, top: TERM.y + 100, fontFamily: FONT.mono, fontSize: MONO, color: NIGHT.text, whiteSpace: "pre" }}>
          {"$ ./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT"}
        </div>
        {frame >= 4 ? (
          <div style={{ position: "absolute", left: TERM.x + 44, top: tokA.y, fontFamily: FONT.mono, fontSize: MONO, lineHeight: `${LINE_A}px`, letterSpacing: "-0.01em", color: NIGHT.textMuted, whiteSpace: "pre" }}>
            {ERR_PRE}
            <MistBand at={16} world="night">
              <span style={{ color: NIGHT.text }}>{PATH}</span>
            </MistBand>
          </div>
        ) : null}
        <div style={{ position: "absolute", left: 300, top: 200, fontFamily: FONT.mono, fontSize: 64, color: NIGHT.text, letterSpacing: "-0.02em" }}>03:07</div>
      </Camera3D>
    </Stage>
  );
};

export const CarryCuts: React.FC = () => {
  const frame = useCurrentFrame();
  const { tokA, tokB, r, ansWord } = useLayout();

  // the token's place on screen at the seam (A's camera), and B's camera built to put the page's token exactly there
  const poseA = cam3At(SEAM1, A_KEYS, { seed: "carry-a", float: 2 });
  const at = rectOnScreen(poseA, tokA);
  const zB = at.w / tokB.w;
  const matchB = { x: tokB.x + tokB.w / 2 - (at.x + at.w / 2 - W / 2) / zB, y: tokB.y + tokB.h / 2 - (at.y + at.h / 2 - H / 2) / zB, zoom: zB };
  const B_KEYS: Cam3Key[] = [
    { at: 0, dur: 0, to: matchB },
    { at: SEAM1 + 4, dur: 32, to: { x: 960, y: 520, zoom: 0.94 }, ease: EASE.expoInOut }, // pull back: the page around the words
    { at: SWAP - 8, dur: 18, to: { x: 1000, y: 330, zoom: 1.12 } }, // toward the byline before the push
  ];
  const poseB = cam3At(frame, B_KEYS, { seed: "carry-b", float: 2 });

  // seam 1: B grows out of the token (rounded window), A falls back; the token itself is carried on top
  const g = tween(frame, GROW0, GROW1, 0, 1, EASE.expoInOut);
  const tokNowA = rectOnScreen(cam3At(frame, A_KEYS, { seed: "carry-a", float: 2 }), tokA);
  const tokNowB = rectOnScreen(poseB, tokB);
  const carried = frame < SEAM1 ? tokNowA : tokNowB;
  const win = lerpRect({ x: carried.x - 14, y: carried.y - 10, w: carried.w + 28, h: carried.h + 20 }, { x: -40, y: -40, w: W + 80, h: H + 80 }, g);
  const dayInk = tween(frame, SEAM1 - 3, SEAM1 + 3, 0, 1, EASE.linear);

  // seam 2: the badge words lift off and land in the answer's slot while B pushes out and C pushes in
  const push = tween(frame, PUSH0, PUSH1, 0, 1, EASE.expoInOut);
  const badgeOnScreen = rectOnScreen(cam3At(PUSH0 - 1, B_KEYS, { seed: "carry-b", float: 2 }), r.badge);
  const fly = tween(frame, PUSH0 - 2, LAND, 0, 1, EASE.expoInOut);
  const fromR: Rect = { x: badgeOnScreen.x + badgeOnScreen.w * 0.2, y: badgeOnScreen.y, w: badgeOnScreen.w * 0.6, h: badgeOnScreen.h };
  const flyR = lerpRect(fromR, ansWord, fly);
  const arc = -70 * Math.sin(Math.PI * fly);

  const pageProps: PageTwinProps = {
    ...P,
    byline: { kind: "dds", state: "possibly_stale", from: "verified", at: SWAP, amber: frame < PUSH0 - 2 },
    slip: { at: SLIP, handoff: SWAP },
  };

  const worldB = (
    <Stage world="day" motif="grid" light={["50%", "30%"]}>
      <Camera3D keys={B_KEYS} seed="carry-b" float={2}>
        <PageTwin {...pageProps} />
      </Camera3D>
    </Stage>
  );

  const worldC = (
    <Stage world="day" motif="tide" tide={{ top: 820, bottom: 1060 }} light={["50%", "36%"]}>
      <Camera3D seed="carry-c" float={2}>
        <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: 34, background: DAY.surface, boxShadow: elevAt(3) }} />
        <div style={{ position: "absolute", left: ANS.x, top: CARD.y + 52, display: "flex", alignItems: "baseline", gap: 14, fontFamily: FONT.sans }}>
          <span style={{ fontSize: 36, fontWeight: 600, color: DAY.text }}>Drift Reviewer</span>
          <span style={{ fontSize: 28, color: DAY.textMuted }}>Rovo agent</span>
        </div>
        <div style={{ position: "absolute", right: W - (CARD.x + CARD.w - 60), top: CARD.y + 128, padding: "14px 24px", borderRadius: 20, background: DAY.surfaceSunk, fontSize: 30, color: DAY.text, fontFamily: FONT.sans }}>
          How do I roll back payments-api?
        </div>
        <div style={{ position: "absolute", left: ANS.x, top: ANS.y, fontFamily: FONT.sans, fontSize: ANS.size, fontWeight: 600, lineHeight: 1.25, color: DAY.text, whiteSpace: "pre", letterSpacing: "-0.01em" }}>
          {ANS_PRE}
          {frame >= LAND ? (
            <AmberBlock at={LAND - 1} dur={2}>
              <span>{ANS_WORD}</span>
            </AmberBlock>
          ) : (
            <span style={{ display: "inline-block", width: ansWord.w, height: ansWord.h * 0.7, verticalAlign: "-0.05em", borderRadius: 8, background: DAY.trace }} />
          )}
          .
        </div>
        <div style={{ position: "absolute", left: ANS.x, top: ANS.y + 86, width: CARD.w - 120, fontFamily: FONT.sans, fontSize: 34, lineHeight: 1.35, color: DAY.text }}>
          <MaskLine at={LAND + 10}>What it describes changed in PR #482 on 2026-11-13,</MaskLine>
          <MaskLine at={LAND + 14}>after it was last verified.</MaskLine>
        </div>
      </Camera3D>
    </Stage>
  );

  return (
    <AbsoluteFill style={{ background: NIGHT.ground, fontFamily: FONT.sans }}>
      {/* seam 1: A behind, falling back; B inside the growing window */}
      {frame < GROW1 ? (
        <AbsoluteFill style={{ transform: `scale(${1 + 0.05 * g})`, filter: g > 0.01 ? `brightness(${1 - 0.5 * g})` : undefined }}>
          <WorldA tokA={tokA} />
        </AbsoluteFill>
      ) : null}
      {frame >= GROW0 && frame < PUSH1 ? (
        <AbsoluteFill
          style={{
            clipPath: g < 1 ? `inset(${win.y}px ${W - win.x - win.w}px ${H - win.y - win.h}px ${win.x}px round ${lerp(14, 0, g)}px)` : undefined,
            transform: frame >= PUSH0 ? `translateX(${-push * W}px)` : undefined,
          }}
        >
          {worldB}
        </AbsoluteFill>
      ) : null}
      {frame >= PUSH0 ? <AbsoluteFill style={{ transform: push < 1 ? `translateX(${(1 - push) * W}px)` : undefined }}>{worldC}</AbsoluteFill> : null}

      {/* the carried token across seam 1: Night mist to Day well, it never leaves its place */}
      {frame >= GROW0 - 2 && frame < GROW1 ? (
        <>
          <div
            style={{
              position: "absolute",
              left: carried.x - 8,
              top: carried.y - 2,
              width: carried.w + 16,
              height: carried.h + 4,
              borderRadius: 8,
              // opaque: the Night mist on the terminal (#05191F + mist 26%) crossing to the Day code well at the seam
              background: interpolateColors(dayInk, [0, 1], ["#2D4349", DAY.surfaceSunk]),
            }}
          />
          <div
            style={{
              position: "absolute",
              left: carried.x,
              top: carried.y,
              height: carried.h,
              fontFamily: FONT.mono,
              fontSize: carried.h * CODE_RATIO,
              lineHeight: `${carried.h}px`,
              letterSpacing: "-0.01em",
              color: dayInk < 0.5 ? NIGHT.text : DAY.text,
              whiteSpace: "pre",
            }}
          >
            {PATH}
          </div>
        </>
      ) : null}

      {/* the carried state across seam 2: the badge words on their amber, lifted, landing in the answer */}
      {frame >= PUSH0 - 2 && frame < LAND ? (
        <div style={{ position: "absolute", left: flyR.x, top: flyR.y + arc, width: flyR.w, height: flyR.h }}>
          <Bloom cx={flyR.w / 2} cy={flyR.h / 2} w={flyR.w * 1.8} h={flyR.h * 3} strength={0.3} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: lerp(6, 10, fly),
              background: BRAND.beacon,
              boxShadow: `${elevAt(1 + 3 * Math.sin(Math.PI * fly))}, 0 0 18px ${amber(0.4)}`,
              fontFamily: FONT.sans,
              fontWeight: lerp(500, 600, fly),
              fontSize: flyR.h / 1.25,
              color: BRAND.fathom,
              whiteSpace: "nowrap",
            }}
          >
            {ANS_WORD}
          </div>
        </div>
      ) : null}

      <Bed filmFrom={1017} dur={CC_DUR} gainDb={-15} />
      <Sfx id="error-blip" at={5} gainDb={-6} />
      <Sfx id="reverse-swell" at={SEAM1} gainDb={-2} />
      <Sfx id="hit-soft" at={SEAM1} gainDb={-2} />
      <Sfx id="slip" at={SLIP + 6} />
      <Sfx id="tick-soft" at={SWAP + 3} />
      <Sfx id="whoosh-short" at={PUSH0 + 7} />
      <Sfx id="pop" at={LAND} />
      <Sfx id="tick-soft" at={LAND + 12} gainDb={-3} />
    </AbsoluteFill>
  );
};

