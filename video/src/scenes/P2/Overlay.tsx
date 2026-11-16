import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Cursor } from "../../components/Cursor";
import { clamp, EASE } from "../../lib/time";
import { Camera3D, DAY, elevAt, FONT, InkLabel, KineticLine, MorphToReal, NIGHT, ProofFrame, proofPoint, proofRect } from "../../v4/kit";
import type { Rect } from "../../v4/look";
import { textWidth, TOOLTIP } from "../../v4/twins";
import { center } from "../../components/P2/geom";
import { MatcherCard } from "../../components/P2/MatcherCard";
import { MergeTimer } from "../../components/P2/MergeTimer";
import { LIT_SIZE, RenameLiteral } from "../../components/P2/RenameLiteral";
import {
  LIT_NEW,
  LIT_POS,
  MATCHER_POS,
  MATCHER_R,
  PAGE,
  PAGE_BASE,
  PR,
  R5_BANNER,
  R5_BUTTON,
  R5_CLICK,
  R5_DIALOG,
  r5MatPos,
  R6,
  R6_NEWNAME,
  R6_POS,
  R7,
  r7Element,
  R7_PILL_MASK,
  r7Pos,
  R8,
  R8_POS,
  R8_SCORE_BOX,
  TOKEN_HOVER,
  toScreen,
  TYPE_X,
  V15_KEYS,
  V15_OPTS,
  v15ToScreen,
} from "./layout";
import { MERGE_REC, MERGE_TO_FLAG, sc, T, WIPE } from "./timing";

const TAG_MERGE = "Recorded in Bitbucket: the real merge";

/**
 * A proof leaves by a wipe in the slip's direction (left to right, WIPE frames) while its twin comes back: no
 * dissolve, so the two never double-expose (QA K-1). `rect` is the proof's outer rect on screen.
 */
const Wipe: React.FC<{ at: number; rect: Rect; children: React.ReactNode }> = ({ at, rect, children }) => {
  const frame = useCurrentFrame();
  if (frame >= at + WIPE) return null;
  if (frame < at) return <AbsoluteFill>{children}</AbsoluteFill>;
  const t = interpolate(frame + 1, [at, at + WIPE], [0, 1], clamp);
  const left = rect.x - 60 + (rect.w + 120) * t;
  return <AbsoluteFill style={{ clipPath: `inset(-400px -400px -400px ${left.toFixed(1)}px)` }}>{children}</AbsoluteFill>;
};

/**
 * A proof outside the camera keeps moving while it holds (M1): a slow push about its centre, 3% a second, which keeps
 * every proof under 1 film px per capture px on screen (R5 and R7 reach 0.84, R6 0.88, R8 0.62).
 */
const Creep: React.FC<{ at: number; cx: number; cy: number; children: React.ReactNode }> = ({ at, cx, cy, children }) => {
  const frame = useCurrentFrame();
  const k = 1 + 0.03 * Math.max(0, frame - at) / 30;
  return <AbsoluteFill style={{ transformOrigin: `${cx}px ${cy}px`, transform: `scale(${k.toFixed(5)})` }}>{children}</AbsoluteFill>;
};

// ── V13 · the merge ─────────────────────────────────────────────────────────────────────────────────────────────────
const mergeBtn = toScreen(PR.merge, T.r5);
const [mbx, mby] = center(toScreen(PR.merge, T.mergePress));

const CURSOR = [
  { frame: T.cursorIn, x: 1780, y: 1020 },
  { frame: T.mergePress, x: mbx, y: mby, click: true, cursor: "pointer", travel: 26 },
  { frame: T.r5Click, x: R5_CLICK[0], y: R5_CLICK[1], click: true, cursor: "pointer", travel: T.r5Click - T.mergePress - 1 },
];

/** R5: one proof. The dialog grows out of the twin's Merge button, the real click, then on the bar the Merged banner. */
const R5: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.r5 || frame >= T.r5Out + WIPE) return null;
  const pos = r5MatPos(frame);
  const proof = (
    <ProofFrame
      capture="p2-merge-rec"
      crop={R5_DIALOG.crop}
      scale={R5_DIALOG.scale}
      x={pos.x}
      y={pos.y}
      at={T.r5}
      dur={T.r5Out - T.r5}
      enter="none"
      exit="none"
      video={{
        from: MERGE_REC.dialogFrom,
        to: MERGE_REC.mergedFrom + (T.r5Out - T.r5Jump) / 30,
        jumps: [{ at: T.r5Jump, to: MERGE_REC.mergedFrom, crop: R5_BANNER.crop, scale: R5_BANNER.scale }],
      }}
      tag={TAG_MERGE}
    />
  );
  const outer = { ...pos, w: R5_BANNER.crop[2] * R5_BANNER.scale + 28, h: R5_BANNER.crop[3] * R5_BANNER.scale + 28 };
  return (
    <Wipe at={T.r5Out} rect={outer}>
      <Creep at={T.r5} cx={960} cy={548}>
        <MorphToReal at={T.r5} dur={9} fromRect={mergeBtn} toRect={R5_BUTTON} twin={null} twinRest={1} proof={proof} />
      </Creep>
    </Wipe>
  );
};

// ── V13 · the rename literal and its amber match cut into the real file header (R6) ─────────────────────────────────
const litFrom = toScreen(PR.renameOld, T.renameLift);
/** The literal's `rollback-v2.sh` lands on the real header's `rollback-v2.sh` (T2, 6 frames, expo in). */
const matchMap = (() => {
  const s = Math.sqrt((R6_NEWNAME.w / LIT_NEW.w) * (R6_NEWNAME.h / LIT_NEW.h));
  const [ax, ay] = center(LIT_NEW);
  const [bx, by] = center(R6_NEWNAME);
  return { s, ax, ay, bx, by };
})();

const Literal: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.renameLift || frame >= T.r6) return null;
  const t = interpolate(frame, [T.r6 - 6, T.r6], [0, 1], { ...clamp, easing: EASE.expoIn });
  const s = 1 + (matchMap.s - 1) * t;
  const tx = (matchMap.bx - matchMap.ax) * t;
  const ty = (matchMap.by - matchMap.ay) * t;
  return (
    <AbsoluteFill style={{ transformOrigin: `${matchMap.ax}px ${matchMap.ay}px`, transform: t > 0 ? `translate(${tx}px, ${ty}px) scale(${s})` : undefined }}>
      <RenameLiteral from={litFrom} x={LIT_POS.x} y={LIT_POS.y} at={T.renameLift} slide={T.renameSlide} drop={T.renameDrop} size={LIT_SIZE} />
    </AbsoluteFill>
  );
};

const R6Proof: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.r6) return null;
  // shot B keeps the match's velocity: a 6-frame settle from 1.03
  const settle = interpolate(frame, [T.r6, T.r6 + 6], [1.03, 1], { ...clamp, easing: EASE.expoOut });
  const [ox, oy] = center(R6_NEWNAME);
  return (
    <Wipe at={T.r6Out} rect={proofRect({ ...R6, ...R6_POS }).outer}>
      <AbsoluteFill style={{ transformOrigin: `${ox}px ${oy}px`, transform: `scale(${(settle * (1 + (0.03 * Math.max(0, frame - T.r6)) / 30)).toFixed(5)})` }}>
        <ProofFrame capture="p2-pr482-files" crop={R6.crop} scale={R6.scale} {...R6_POS} at={T.r6} dur={T.r6Out - T.r6} enter="none" exit="none" tag="Recorded in Bitbucket" />
      </AbsoluteFill>
    </Wipe>
  );
};

// ── V14 · the flag, proved (R7) ─────────────────────────────────────────────────────────────────────────────────────
const R7Proof: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.r7 || frame >= T.r7Out + WIPE) return null;
  const badge = toScreen(PAGE.badge, T.r7);
  const tip = toScreen(PAGE.tooltip, T.r7);
  const twinRect: Rect = { x: Math.min(badge.x, tip.x), y: badge.y, w: Math.max(badge.x + badge.w, tip.x + tip.w) - Math.min(badge.x, tip.x), h: tip.y + tip.h - badge.y };
  const pos = r7Pos(badge.y + badge.h / 2);
  return (
    <Wipe at={T.r7Out} rect={proofRect({ ...R7, ...pos }).outer}>
      <Creep at={T.r7} cx={center(proofRect({ ...R7, ...pos }).outer)[0]} cy={center(proofRect({ ...R7, ...pos }).outer)[1]}>
      <MorphToReal
        at={T.r7}
        dur={9}
        fromRect={twinRect}
        toRect={r7Element(pos)}
        twin={null}
        twinRest={1}
        proof={
          <ProofFrame
            capture="p2-flagged-tooltip"
            crop={R7.crop}
            scale={R7.scale}
            {...pos}
            at={T.r7}
            dur={T.r7Out - T.r7}
            enter="none"
            exit="none"
            masks={[R7_PILL_MASK]}
            tag="Recorded in Confluence, flagged 19 s after the merge"
          />
        }
      />
      </Creep>
    </Wipe>
  );
};

// ── V14 to V15 · "PR #482" lifts out of the tooltip and carries into the matcher (R3) ───────────────────────────────
const CHIP_W = 7 * 0.6 * 26 + 28;
const CHIP_H = 44;
/** "PR #482" in the twin tooltip (its first words, from the twins' own tooltip metrics), on screen at a frame. */
const tooltipPr = (frame: number): Rect => {
  const tt = toScreen(PAGE.tooltip, frame);
  const k = (PAGE_BASE.k ?? 1.8) * (tt.w / PAGE.tooltip.w);
  const w = textWidth("PR #482", { size: TOOLTIP.size, weight: TOOLTIP.weight }) * k;
  return { x: tt.x + TOOLTIP.padX * k, y: tt.y + TOOLTIP.padY * k, w, h: TOOLTIP.lh * k };
};

const Token: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.tokenLift || frame >= T.dock) return null;
  const from = tooltipPr(T.tokenLift);
  const [fx, fy] = center(from);
  const s0 = from.w / CHIP_W;
  const to = v15ToScreen(MATCHER_R.prChip, T.dock);
  const [tx, ty] = center(to);
  let cx: number;
  let cy: number;
  let s: number;
  let level: number;
  if (frame < T.tokenGo) {
    // lift out of the tooltip and rise toward the camera, then hover (a slow bob)
    const u = interpolate(frame, [T.tokenLift, T.tokenLift + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
    const bob = Math.sin((frame - T.tokenLift) / 7) * 3 * u;
    cx = fx + (TOKEN_HOVER.cx - fx) * u;
    cy = fy + (TOKEN_HOVER.cy - fy) * u + bob;
    s = s0 + (TOKEN_HOVER.scale - s0) * u;
    level = 1 + 3 * u;
  } else {
    // carry into the matcher's input as the card arrives (an arc, expo in and out)
    const u = interpolate(frame, [T.tokenGo, T.dock], [0, 1], { ...clamp, easing: EASE.expoInOut });
    cx = TOKEN_HOVER.cx + (tx - TOKEN_HOVER.cx) * u;
    cy = TOKEN_HOVER.cy + (ty - TOKEN_HOVER.cy) * u - Math.sin(Math.PI * u) * 50;
    s = TOKEN_HOVER.scale + (to.w / CHIP_W - TOKEN_HOVER.scale) * u;
    level = 4 - 3 * u;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: cx - CHIP_W / 2,
        top: cy - CHIP_H / 2,
        width: CHIP_W,
        height: CHIP_H,
        transform: `scale(${s})`,
        borderRadius: 12,
        boxShadow: elevAt(level, true),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        background: NIGHT.ground,
        color: NIGHT.text,
        fontFamily: FONT.mono,
        fontSize: 26,
        whiteSpace: "pre",
      }}
    >
      PR #482
    </div>
  );
};

// ── V15 · the matcher ───────────────────────────────────────────────────────────────────────────────────────────────
const V15_WORDS = sc.line("V15").words;

/** The matcher card dims to 18% with depth of field while the real panel sits in front of it (P2, QA K-1). */
const Matcher: React.FC = () => {
  const frame = useCurrentFrame();
  const p = Math.max(
    interpolate(frame, [T.r8 + 2, T.r8 + 8], [0, 1], clamp) * interpolate(frame, [T.r8Out, T.r8Out + WIPE], [1, 0], clamp),
    0,
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p > 0 ? 1 - 0.82 * p : undefined, filter: p > 0.02 ? `blur(${(7 * p).toFixed(2)}px)` : undefined }}>
      <MatcherCard x={MATCHER_POS.x} y={MATCHER_POS.y} inAt={T.matcherIn} dockAt={T.dock} rows={T.rows} score={T.score} result={T.result} runs={T.runs} />
    </div>
  );
};

const Statement: React.FC = () => {
  const frame = useCurrentFrame();
  const chip = interpolate(frame, [T.zeroChip, T.zeroChip + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  const evalIn = interpolate(frame, [T.evalLine, T.evalLine + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  return (
    <div style={{ position: "absolute", left: TYPE_X, top: 214 }}>
      <KineticLine text={"No AI made\nthat call."} at={V15_WORDS[0]?.from ?? T.matcherIn} words={V15_WORDS.slice(0, 5)} size={124} />
      <div style={{ marginTop: 44, height: 64, transform: `translateY(${(1 - chip) * 18}px)`, opacity: chip > 0 ? Math.min(1, chip * 3) : 0 }}>
        <InkLabel size={34}>0 AI calls</InkLabel>
      </div>
      <div
        style={{
          marginTop: 40,
          width: 640,
          fontFamily: FONT.sans,
          fontSize: 32,
          lineHeight: "42px",
          fontWeight: 500,
          color: DAY.textMuted,
          transform: `translateY(${(1 - evalIn) * 14}px)`,
          opacity: evalIn > 0 ? Math.min(1, evalIn * 3) : 0,
        }}
      >
        Our eval set: 40 scenarios,
        <br />0 false flags, 2 known misses
      </div>
    </div>
  );
};

const V15Layer: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.v15) return null;
  return (
    <Camera3D keys={V15_KEYS} {...V15_OPTS}>
      <Matcher />
      <Statement />
    </Camera3D>
  );
};

/** R8: the real why sentence and score, grown out of the card's score line, placed over the card's rules on screen. */
const R8Proof: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.r8 || frame >= T.r8Out + WIPE) return null;
  const at = v15ToScreen({ x: R8_POS.x, y: R8_POS.y, w: 0, h: 0 }, T.r8);
  const pos = { x: at.x, y: at.y };
  return (
    <Wipe at={T.r8Out} rect={proofRect({ ...R8, ...pos }).outer}>
      <Creep at={T.r8} cx={center(proofRect({ ...R8, ...pos }).outer)[0]} cy={center(proofRect({ ...R8, ...pos }).outer)[1]}>
      <MorphToReal
        at={T.r8}
        dur={9}
        fromRect={v15ToScreen(MATCHER_R.scoreLine, T.r8)}
        toRect={proofPoint({ ...R8, ...pos }, R8_SCORE_BOX)}
        twin={null}
        twinRest={1}
        proof={<ProofFrame capture="p4-panel" crop={R8.crop} scale={R8.scale} {...pos} at={T.r8} dur={T.r8Out - T.r8} enter="none" exit="none" tag="Recorded in Confluence" />}
      />
      </Creep>
    </Wipe>
  );
};

export const Overlay: React.FC = () => (
  <AbsoluteFill>
    <R5 />
    <Literal />
    <R6Proof />
    <MergeTimer x={TYPE_X} y={150} value={MERGE_TO_FLAG} at={T.timerIn} land={T.land} out={T.timerOut} />
    <R7Proof />
    <V15Layer />
    <Token />
    <R8Proof />
    <Cursor points={CURSOR} showAt={T.cursorIn} hideAt={T.r5Jump - 4} />
  </AbsoluteFill>
);
