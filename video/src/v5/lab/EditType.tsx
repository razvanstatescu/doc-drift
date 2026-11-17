import React from "react";
import { measureText } from "@remotion/layout-utils";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { SLIP_UNIT } from "../../brand/tokens";
import { EASE, tween } from "../../lib/time";
import { Bloom, Camera3D, CurrentUnderline, Eyebrow, MistBand, Stage, useFontsReady } from "../../v4/kit";
import { amber, BRAND, DAY, elevAt, FONT } from "../../v4/look";
import { BYLINE, BylineItem, bylineItemSize, textWidth, bylineTitle } from "../../v4/twins";
import { Bed } from "./common";

/**
 * R6 prototype 3 · Type that edits itself (v5 techniques "mask line reveal", "type becomes UI", "strike and replace").
 *
 * Three type devices the v4 kit lacks, on one runbook card, 7 s:
 *   1. Mask line reveal: lines rise from behind their own baseline (no smear, no fade): a calmer second voice beside
 *      KineticLine's word rise, for labels and code.
 *   2. Type becomes UI: the spoken state "Possibly stale." lands big in the type zone, then flies, shrinks and lands
 *      ON the byline as the item's own new words (the twin's slip swap takes the old words out underneath it). The
 *      word the narrator says is, a second later, the product's UI.
 *   3. Strike and replace, in place: the step's command is marked (Mist), struck (an ink rule), and replaced: the old
 *      path slips out one unit under a wipe, the new one opens behind a wipe, the rest of the line reflows with it, the
 *      Current underline marks the change, the real result line rises under it, and the byline snaps back to Verified.
 *      Real strings only: the quick fix replaces scripts/rollback.sh with scripts/rollback-v2.sh in 1 place.
 * Lab frames on the film grid from film frame 3277 (P4's review music): beats on multiples of 15, bars on 0, 60, 120, 180.
 */

export const ET_DUR = 210;

// timing (frames, on the beat grid)
const STATE_IN = 10; // "Possibly stale." rises (lands on beat 1)
const DOCK0 = 58;
const DOCK1 = 76; // the words land on the byline (beat 5 + 1)
const PUSH = 84; // the camera goes to the step
const MARK = 104; // Mist on the old path
const STRIKE = 120; // the ink rule (bar)
const REPLACE = 130; // the swap starts; the new path is open on beat 9 (135)
const RESULT = 148; // the real result line rises
const PULL = 160;
const SNAP = 172; // Verified again

// the card (film px)
const CARD = { x: 90, y: 150, w: 1000, h: 700 };
const K = 2.2; // byline item scale: UI 15 px words read 33 px
const BY_Y = CARD.y + 218;
const BY_TEXT = "By Razvan Statescu";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A line that rises from behind its own baseline (a clip at the line box), expo out. */
export const MaskLine: React.FC<{ at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, dur = 14, children, style }) => {
  const frame = useCurrentFrame();
  const t = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  if (frame < at) return <div style={{ ...style, visibility: "hidden" }}>{children}</div>;
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div style={{ transform: t < 1 ? `translateY(${(1 - t) * 105}%)` : undefined }}>{children}</div>
    </div>
  );
};

/**
 * Strike and replace inside a line: `pre` + old → new + `post`. The old words are marked (Mist) at `mark`, struck at
 * `strike` (an ink rule drawn left to right, the words drop to text-muted), and at `replace` they slip out one unit
 * under a wipe from the left while the new words open behind a wipe to the right; the line's width follows, so `post`
 * reflows smoothly. A Current underline marks the new words once they are in.
 */
export const EditLine: React.FC<{
  pre: string;
  old: string;
  neu: string;
  post: string;
  size: number;
  mono?: boolean;
  weight?: number;
  mark: number;
  strike: number;
  replace: number;
  color?: string;
}> = ({ pre, old, neu, post, size, mono = true, weight = 400, mark, strike, replace, color = DAY.text }) => {
  const frame = useCurrentFrame();
  const ready = useFontsReady();
  const family = mono ? FONT.mono : FONT.sans;
  const w = (t: string) => (ready ? measureText({ text: t, fontFamily: family, fontWeight: weight, fontSize: size }).width : t.length * size * 0.6);
  const wOld = w(old);
  const wNew = w(neu);
  // phase 1: the old words leave (wiped from the left, sliding right one unit) inside their own width
  const out = tween(frame, replace, replace + 5, 0, 1, EASE.expoIn);
  // phase 2: the width follows to the new words and they open behind a wipe to the right (never both at once)
  const inn = tween(frame, replace + 5, replace + 13, 0, 1, EASE.expoOut);
  const struck = tween(frame, strike, strike + 8, 0, 1, EASE.expoOut);
  const unitOld = SLIP_UNIT * wOld + 4;
  const unitNew = SLIP_UNIT * wNew + 4;
  const base: React.CSSProperties = { fontFamily: family, fontSize: size, fontWeight: weight, lineHeight: 1.3, whiteSpace: "pre", color };
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", ...base }}>
      <span>{pre}</span>
      {out < 1 ? (
        <span style={{ position: "relative", display: "inline-block", width: wOld, height: size * 1.3, overflow: "hidden" }}>
          <span
            style={{
              position: "absolute",
              left: unitOld * out,
              top: 0,
              clipPath: out > 0 ? `inset(-20% 0 -20% ${out * 100}%)` : undefined,
              color: struck > 0.5 ? DAY.textMuted : color,
            }}
          >
            {frame >= mark ? (
              <MistBand at={mark} dur={10}>
                <span>{old}</span>
              </MistBand>
            ) : (
              old
            )}
            {struck > 0 ? (
              <span style={{ position: "absolute", left: -2, top: "54%", height: Math.max(3, size * 0.07), width: (wOld + 4) * struck, background: BRAND.fathom, borderRadius: 2 }} />
            ) : null}
          </span>
        </span>
      ) : null}
      {out >= 1 ? (
        <span style={{ position: "relative", display: "inline-block", width: wOld + (wNew - wOld) * inn, height: size * 1.3, overflow: "hidden" }}>
          <span style={{ position: "absolute", left: -unitNew * (1 - inn), top: 0, clipPath: `inset(-20% ${(1 - inn) * 100}% -20% 0)` }}>
            {frame >= replace + 13 ? (
              <CurrentUnderline at={replace + 13} dur={10}>
                <span>{neu}</span>
              </CurrentUnderline>
            ) : (
              neu
            )}
          </span>
        </span>
      ) : null}
      <span>{post}</span>
    </span>
  );
};

export const EditType: React.FC = () => {
  const frame = useCurrentFrame();
  const ready = useFontsReady();
  const byTextW = ready ? measureText({ text: BY_TEXT, fontFamily: FONT.sans, fontWeight: 400, fontSize: 30 }).width : 260;
  const itemX = CARD.x + 56 + byTextW + 26;
  const item = bylineItemSize("possibly_stale", K);
  const itemY = BY_Y + 19 - item.h / 2;

  // the byline: Verified, then (the type lands) Possibly stale, then back to Verified on the snap
  // (each swap's window opens 3 frames before its frame: the old words leave over at - 3 .. at)
  const toStale = frame >= DOCK1 - 5;
  const toVerified = frame >= SNAP - 3;
  const state = toVerified ? "verified" : toStale ? "possibly_stale" : "verified";
  const from = toVerified ? "possibly_stale" : toStale ? "verified" : undefined;
  const swapAt = toVerified ? SNAP : DOCK1 - 2;

  // "Possibly stale." : big in the type zone, then it flies onto the byline item's words
  const d = tween(frame, DOCK0, DOCK1, 0, 1, EASE.expoInOut);
  const bigSize = 88;
  const endSize = BYLINE.size * K;
  const size = lerp(bigSize, endSize, d);
  const wordsW = textWidth(bylineTitle("possibly_stale"), { size: BYLINE.size, weight: BYLINE.weight }) * K;
  const startX = 1150;
  const startY = 392;
  const endX = itemX + (BYLINE.padX + BYLINE.icon + BYLINE.gap) * K + SLIP_UNIT * wordsW;
  const endY = itemY + (item.h - endSize * 1.25) / 2;
  const showBig = frame >= STATE_IN && frame < DOCK1 + 3;
  const block = tween(frame, STATE_IN + 12, STATE_IN + 21, 0, 1, EASE.expoOut);

  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans }}>
      <Stage world="day" motif="grid" light={["30%", "34%"]}>
        <Camera3D
          seed="edit"
          keys={[
            { at: 0, to: { x: 960, y: 540, zoom: 1 } },
            { at: PUSH, dur: 24, to: { x: 700, y: 700, zoom: 1.42 }, ease: EASE.expoInOut }, // onto the step
            { at: PULL, dur: 22, to: { x: 820, y: 560, zoom: 1.12 }, ease: EASE.expoInOut }, // back to the byline and step
          ]}
        >
          {/* the runbook card (a compact twin: the real title, byline and step 2) */}
          <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: 34, background: DAY.surface, boxShadow: elevAt(3) }} />
          <div style={{ position: "absolute", left: CARD.x + 56, top: CARD.y + 52 }}>
            <Eyebrow icon="page" size={26}>
              Platform / Runbooks
            </Eyebrow>
            <div style={{ fontSize: 66, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 14, color: DAY.text }}>Payments rollback runbook</div>
          </div>
          <div style={{ position: "absolute", left: CARD.x + 56, top: BY_Y, fontSize: 30, color: DAY.textMuted, whiteSpace: "nowrap" }}>{BY_TEXT}</div>
          <BylineItem state={state} from={from} at={swapAt} k={K} x={itemX} y={itemY} />
          <div style={{ position: "absolute", left: CARD.x + 56, top: CARD.y + 330, width: CARD.w - 112 }}>
            <div style={{ fontSize: 34, fontWeight: 600, color: DAY.text }}>Steps</div>
            <div style={{ fontSize: 28, color: DAY.text, marginTop: 18, whiteSpace: "nowrap" }}>
              2. Run the rollback script from the root of the <span style={{ fontFamily: FONT.mono, fontSize: 28, background: DAY.surfaceSunk, padding: "2px 8px", borderRadius: 8 }}>payments-api</span> repo.
            </div>
            <div style={{ marginTop: 22, background: DAY.surfaceSunk, borderRadius: 18, padding: "22px 28px" }}>
              <MaskLine at={4} style={{ fontFamily: FONT.mono, fontSize: 26, color: DAY.textMuted }}>
                export ROLLBACK_TIMEOUT=300
              </MaskLine>
              <MaskLine at={8}>
                <EditLine pre="./" old="scripts/rollback.sh" neu="scripts/rollback-v2.sh" post=" --timeout $ROLLBACK_TIMEOUT" size={26} mark={MARK} strike={STRIKE} replace={REPLACE} />
              </MaskLine>
            </div>
            <MaskLine at={RESULT} style={{ marginTop: 22, fontSize: 24, color: DAY.textMuted, whiteSpace: "nowrap" }}>
              Replaced <span style={{ fontFamily: FONT.mono }}>scripts/rollback.sh</span> with <span style={{ fontFamily: FONT.mono }}>scripts/rollback-v2.sh</span> in 1 place.
            </MaskLine>
          </div>

          {/* the spoken state, big, then flying onto the byline (world space, so the camera carries it too) */}
          {showBig ? (
            <div style={{ position: "absolute", left: lerp(startX, endX, d), top: lerp(startY, endY, d), whiteSpace: "nowrap", zIndex: 5 }}>
              {block > 0 ? <Bloom cx={size * 3.2} cy={size * 0.62} w={size * 8} h={size * 2.2} strength={0.28 * block * (1 - d)} /> : null}
              <MaskLine at={STATE_IN} dur={12} style={{ overflow: d > 0 ? "visible" : "hidden" }}>
                <span
                  style={{
                    position: "relative",
                    display: "inline-block",
                    fontSize: size,
                    lineHeight: 1.25,
                    fontWeight: lerp(600, 500, d),
                    letterSpacing: `${lerp(-0.03, 0, d)}em`,
                    color: DAY.text,
                    padding: `0 ${0.12 * size}px`,
                    borderRadius: lerp(0.14 * size, 8, d),
                    background: block > 0 ? `linear-gradient(90deg, ${BRAND.beacon} ${block * 100}%, transparent ${block * 100}%)` : undefined,
                    boxShadow: block > 0.5 ? `0 0 ${lerp(40, 14, d)}px ${amber(0.4)}` : undefined,
                  }}
                >
                  {d < 0.55 ? "Possibly stale." : "Possibly stale"}
                </span>
              </MaskLine>
            </div>
          ) : null}
        </Camera3D>
      </Stage>

      <Bed filmFrom={3277} dur={ET_DUR} gainDb={-16} />
      <Sfx id="swish-up" at={STATE_IN + 6} gainDb={-2} />
      <Sfx id="tick-soft" at={STATE_IN + 14} />
      <Sfx id="slip" at={DOCK1} />
      <Sfx id="tick-soft" at={MARK + 2} gainDb={-3} />
      <Sfx id="tick" at={STRIKE + 1} />
      <Sfx id="pop" at={REPLACE + 6} />
      <Sfx id="tick-soft" at={RESULT + 4} />
      <Sfx id="snap" at={SNAP + 2} gainDb={-4} />
    </AbsoluteFill>
  );
};
