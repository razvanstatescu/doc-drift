import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Cursor } from "../../components/Cursor";
import { clamp, EASE } from "../../lib/time";
import { Camera3D, DAY, FONT, InkLabel, KineticDock, KineticLine, MorphToReal, NIGHT, ProofFrame, proofRect, PushCut } from "../../v4/kit";
import type { Rect } from "../../v4/look";
import { textWidth, TOOLTIP } from "../../v4/twins";
import { center, grow, union } from "../../components/P2/geom";
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
  R5_CLICK,
  R5_BUTTON,
  R5_DIALOG,
  R5_DIALOG_POS,
  R5_MERGED,
  R5_MERGED_POS,
  R6,
  R6_NEWNAME,
  R6_POS,
  R7,
  r7Element,
  R7_PILL_MASK,
  r7Pos,
  R8,
  R8_POS,
  R8_SCORE,
  toScreen,
  TYPE_X,
  V15_KEYS,
  V15_OPTS,
  v15ToScreen,
} from "./layout";
import { MERGE_REC, MERGE_TO_FLAG, sc, T } from "./timing";

const TAG_MERGE = "Recorded in Bitbucket: the real merge";

// ── V13 · the merge ─────────────────────────────────────────────────────────────────────────────────────────────────
const mergeBtn = toScreen(PR.merge, T.r5);
const [mbx, mby] = center(toScreen(PR.merge, T.mergePress));
const r5Outer = proofRect({ ...R5_DIALOG, ...R5_DIALOG_POS }).outer;

const CURSOR = [
  { frame: T.cursorIn, x: 1780, y: 1020 },
  { frame: T.mergePress, x: mbx, y: mby, click: true, cursor: "pointer", travel: 26 },
  { frame: T.r5Click, x: R5_CLICK[0], y: R5_CLICK[1], click: true, cursor: "pointer", travel: T.r5Click - T.mergePress - 1 },
];

const R5: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.r5 || frame >= T.r5Out + 9) return null;
  const dialog = (
    <ProofFrame
      capture="p2-merge-rec"
      crop={R5_DIALOG.crop}
      scale={R5_DIALOG.scale}
      {...R5_DIALOG_POS}
      at={T.r5}
      enter="none"
      exit="none"
      video={{ from: MERGE_REC.dialogFrom, to: MERGE_REC.dialogFrom + (T.r5Jump - T.r5) / 30 }}
      tag={TAG_MERGE}
    />
  );
  const merged = (
    <ProofFrame
      capture="p2-merge-rec"
      crop={R5_MERGED.crop}
      scale={R5_MERGED.scale}
      {...R5_MERGED_POS}
      at={T.r5Jump}
      dur={T.r5Out - T.r5Jump}
      enter="none"
      video={{ from: MERGE_REC.mergedFrom, to: MERGE_REC.mergedFrom + (T.r5Out - T.r5Jump) / 30 }}
      tag={TAG_MERGE}
    />
  );
  return (
    <PushCut
      at={T.r5Jump - 2}
      dur={4}
      flash={false}
      inScale={1.03}
      outScale={1.03}
      from={<MorphToReal at={T.r5} dur={9} fromRect={mergeBtn} toRect={R5_BUTTON} twin={null} twinRest={1} frameRect={grow(r5Outer, 240)} proof={dialog} />}
      to={merged}
    />
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
    <AbsoluteFill style={{ transformOrigin: `${ox}px ${oy}px`, transform: settle !== 1 ? `scale(${settle})` : undefined }}>
      <ProofFrame capture="p2-pr482-files" crop={R6.crop} scale={R6.scale} {...R6_POS} at={T.r6} dur={T.r6Out - T.r6} enter="none" tag="Recorded in Bitbucket" />
    </AbsoluteFill>
  );
};

// ── V14 · the flag, proved (R7) ─────────────────────────────────────────────────────────────────────────────────────
const R7Proof: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.r7 || frame >= T.r7Out + 9) return null;
  const badge = toScreen(PAGE.badge, T.r7);
  const twinRect = union(badge, toScreen(PAGE.tooltip, T.r7));
  const pos = r7Pos(badge.y + badge.h / 2);
  const outer = proofRect({ ...R7, ...pos }).outer;
  return (
    <MorphToReal
      at={T.r7}
      dur={9}
      fromRect={twinRect}
      toRect={r7Element(pos)}
      twin={null}
      twinRest={1}
      frameRect={grow(outer, 240)}
      proof={
        <ProofFrame
          capture="p2-flagged-tooltip"
          crop={R7.crop}
          scale={R7.scale}
          {...pos}
          at={T.r7}
          dur={T.r7Out - T.r7}
          enter="none"
          masks={[R7_PILL_MASK]}
          tag="Recorded in Confluence, flagged 19 s after the merge"
        />
      }
    />
  );
};

// ── V15 · the matcher ───────────────────────────────────────────────────────────────────────────────────────────────
const V15_WORDS = sc.line("V15").words;

/** "PR #482" in the twin tooltip (its first words, from the twins' own tooltip metrics), on screen when it lifts. */
const tooltipPr = (): Rect => {
  const tt = toScreen(PAGE.tooltip, T.prLift);
  const k = (PAGE_BASE.k ?? 1.8) * (tt.w / PAGE.tooltip.w);
  const w = textWidth("PR #482", { size: TOOLTIP.size, weight: TOOLTIP.weight }) * k;
  return { x: tt.x + TOOLTIP.padX * k, y: tt.y + TOOLTIP.padY * k, w, h: TOOLTIP.lh * k };
};

const PrToken: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.prLift || frame >= T.dock) return null;
  const to = MATCHER_R.prChip;
  return (
    <KineticDock at={T.prLift} dur={T.dock - T.prLift} fromRect={tooltipPr()} toRect={to} arc={-80}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          width: to.w,
          height: to.h,
          boxSizing: "border-box",
          padding: "0 14px",
          borderRadius: 12,
          background: NIGHT.ground,
          color: NIGHT.text,
          fontFamily: FONT.mono,
          fontSize: 26,
          whiteSpace: "pre",
        }}
      >
        PR #482
      </span>
    </KineticDock>
  );
};

const R8Proof: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.r8 || frame >= T.r8Out + 9) return null;
  const outer = proofRect({ ...R8, ...R8_POS }).outer;
  return (
    <MorphToReal
      at={T.r8}
      dur={9}
      fromRect={v15ToScreen(MATCHER_R.scoreLine, T.r8)}
      toRect={R8_SCORE}
      twin={null}
      twinRest={1}
      frameRect={grow(outer, 240)}
      proof={<ProofFrame capture="p4-panel" crop={R8.crop} scale={R8.scale} {...R8_POS} at={T.r8} dur={T.r8Out - T.r8} enter="none" tag="Recorded in Confluence" />}
    />
  );
};

/** The matcher card dims to 40% while the real panel sits in front of it (P2). */
const Matcher: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [T.r8 + 2, T.r8 + 8, T.r8Out, T.r8Out + 6], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p > 0 ? 1 - 0.6 * p : undefined, filter: p > 0.02 ? `blur(${(3 * p).toFixed(2)}px)` : undefined }}>
      <MatcherCard x={MATCHER_POS.x} y={MATCHER_POS.y} inAt={T.matcherIn} dockAt={T.dock} rows={T.rows} score={T.score} result={T.result} runs={T.runs} />
    </div>
  );
};

const Statement: React.FC = () => {
  const frame = useCurrentFrame();
  const chip = interpolate(frame, [T.zeroChip, T.zeroChip + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  const evalIn = interpolate(frame, [T.evalLine, T.evalLine + 12], [0, 1], { ...clamp, easing: EASE.expoOut });
  if (frame < T.v15) return null;
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
      <PrToken />
      <Statement />
    </Camera3D>
  );
};

export const Overlay: React.FC = () => (
  <AbsoluteFill>
    <R5 />
    <Literal />
    <R6Proof />
    <MergeTimer x={TYPE_X} y={150} value={MERGE_TO_FLAG} at={T.timerIn} land={T.flag} out={T.timerOut} />
    <R7Proof />
    <V15Layer />
    <R8Proof />
    <Cursor points={CURSOR} showAt={T.cursorIn} hideAt={T.r5Jump + 2} />
  </AbsoluteFill>
);
