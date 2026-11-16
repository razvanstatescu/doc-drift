import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Badge } from "../../brand/Badge";
import { Icon } from "../../brand/icons";
import { SLIP_UNIT } from "../../brand/tokens";
import { clamp, EASE } from "../../lib/time";
import { amber, DAY, ELEV, FONT, ink, NIGHT, type Rect } from "../../v4/look";
import { monoW } from "./geom";

/**
 * MatcherCard (R3 V15): what the deterministic matcher did with PR #482, worded from the real why sentence the review
 * panel shows (capture p4-panel; apps/core/src/lib/review.ts whySentence):
 *   the anchor `payments-api: scripts/rollback.sh`;
 *   "The page mentions ROLLBACK_TIMEOUT and rollback.sh, which PR #482 removed.";
 *   "Section "Steps" names it.";
 *   "Score 1.00 (threshold 0.5)." and the page's state, Possibly stale (the shot's one amber, with trace and bloom).
 * The record ("PR #482", the change) docks into its input. `runs` replays the same change: each run's score lands on the
 * same point and its result lands exactly on the last one, with no offset. "Deterministic matcher" is our label for
 * the core app's matcher (architecture, not UI); no AI is involved in detection (CLAUDE.md non-negotiables).
 */
export const MATCHER_W = 1000;
export const MATCHER_H = 760;

const PAD = 52;
const INPUT_Y = 140;
const INPUT_H = 76;
const ROW_Y = [252, 316, 418] as const;
const DIV_Y = 494;
const SCORE_Y = 524;
const TRACK_Y = 598;
const RESULT_Y = 650;
const BADGE_K = 2.4;
const TRACK_X0 = PAD;
const TRACK_X1 = MATCHER_W - PAD;

export type MatcherRects = { card: Rect; input: Rect; prChip: Rect; scoreLine: Rect; result: Rect };

export const matcherRects = (x: number, y: number): MatcherRects => ({
  card: { x, y, w: MATCHER_W, h: MATCHER_H },
  input: { x: x + PAD, y: y + INPUT_Y, w: MATCHER_W - 2 * PAD, h: INPUT_H },
  prChip: { x: x + PAD + 18, y: y + INPUT_Y + (INPUT_H - 44) / 2, w: monoW("PR #482", 26) + 28, h: 44 },
  scoreLine: { x: x + PAD, y: y + SCORE_Y, w: 560, h: 42 },
  result: { x: x + PAD, y: y + RESULT_Y, w: 0, h: 28 * BADGE_K },
});

const Lit: React.FC<{ children: string; size?: number }> = ({ children, size = 26 }) => (
  <span style={{ fontFamily: FONT.mono, fontSize: size, letterSpacing: 0, whiteSpace: "pre" }}>{children}</span>
);

/** A row: its check pops in, then its words set (they rise 10 px from a 6-frame smear). */
const Row: React.FC<{ y: number; at: number; again?: number[]; children: React.ReactNode }> = ({ y, at, again = [], children }) => {
  const frame = useCurrentFrame();
  const set = interpolate(frame, [at + 1, at + 9], [0, 1], { ...clamp, easing: EASE.expoOut });
  const pop = interpolate(frame, [at, at + 6], [0.4, 1], { ...clamp, easing: EASE.expoOut });
  // a re-run ticks the same check again: a short pulse, the words do not move
  const re = again.reduce((m, a) => Math.max(m, frame >= a && frame < a + 8 ? interpolate(frame, [a, a + 2, a + 8], [0, 1, 0], clamp) : 0), 0);
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", left: PAD, top: y, right: PAD, display: "flex", gap: 20, alignItems: "flex-start" }}>
      <span
        style={{
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: DAY.text,
          transform: `scale(${pop * (1 + 0.12 * re)})`,
          boxShadow: re > 0 ? `0 0 0 ${6 * re}px ${ink(0.08)}` : undefined,
        }}
      >
        <Icon name="check" size={26} color={DAY.ground} stroke={2.4} />
      </span>
      <div
        style={{
          fontSize: 29,
          lineHeight: "38px",
          fontWeight: 500,
          color: DAY.text,
          transform: `translateY(${(1 - set) * 10}px)`,
          opacity: set,
          filter: set < 0.8 ? `blur(${(1 - set) * 3}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const MatcherCard: React.FC<{
  x: number;
  y: number;
  /** The card lifts in (from elevation 1, 14 frames). */
  inAt: number;
  /** The record docks into the input here. */
  dockAt: number;
  rows: readonly [number, number, number];
  score: number;
  result: number;
  /** Later runs of the same change: the record re-enters at `at`, the result lands on the last at `result`. */
  runs?: { at: number; result: number }[];
  style?: React.CSSProperties;
}> = ({ x, y, inAt, dockAt, rows, score, result, runs = [], style }) => {
  const frame = useCurrentFrame();
  if (frame < inAt) return null;
  const lift = interpolate(frame, [inAt, inAt + 14], [0, 1], { ...clamp, easing: EASE.expoOut });
  const docked = frame >= dockAt;
  // the current run (0 = the first)
  const runIdx = runs.reduce((n, r, i) => (frame >= r.at ? i + 1 : n), 0);
  const run = runIdx === 0 ? { at: dockAt, result, score } : { at: runs[runIdx - 1].at, result: runs[runIdx - 1].result, score: runs[runIdx - 1].result - 6 };
  // the input: a re-run slides the same record out right and in again from the left
  const reIn = runIdx === 0 ? 1 : interpolate(frame, [run.at, run.at + 7], [0, 1], { ...clamp, easing: EASE.expoOut });
  const chipX = (1 - reIn) * -60;
  const chipO = runIdx === 0 ? 1 : reIn;
  // the score dot travels 0 to 1.00 on each run
  const dot = interpolate(frame, [run.score, run.score + 8], [0, 1], { ...clamp, easing: EASE.expoOut });
  const scoreSet = interpolate(frame, [score, score + 8], [0, 1], { ...clamp, easing: EASE.expoOut });
  // the result: slips in amber (6 f) with its trace, glow and bloom
  const landed = interpolate(frame, [result, result + 6], [0, 1], { ...clamp, easing: EASE.expoOut });
  const reruns = runs.map((r) => r.result);
  const twinDrop = runs
    .map((r) => (frame >= r.result - 7 && frame < r.result + 10 ? { p: interpolate(frame, [r.result - 7, r.result], [0, 1], { ...clamp, easing: EASE.expoIn }), since: frame - r.result } : null))
    .find((v) => v !== null);
  const badgeH = 28 * BADGE_K;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: MATCHER_W,
        height: MATCHER_H,
        borderRadius: 38,
        background: DAY.surface,
        boxShadow: lift < 0.5 ? ELEV[2] : ELEV[4],
        transform: `translateY(${(1 - lift) * 36}px) scale(${0.97 + 0.03 * lift})`,
        fontFamily: FONT.sans,
        color: DAY.text,
        ...style,
      }}
    >
      {/* header */}
      <div style={{ position: "absolute", left: PAD, top: 44, display: "flex", alignItems: "center", gap: 22 }}>
        <span style={{ display: "grid", placeItems: "center", width: 64, height: 64, borderRadius: 20, background: DAY.surfaceSunk }}>
          <Icon name="rule" size={36} color={DAY.text} />
        </span>
        <span style={{ fontSize: 42, lineHeight: "48px", fontWeight: 600, letterSpacing: "-0.015em" }}>Deterministic matcher</span>
      </div>
      {/* input: the change record */}
      <div
        style={{
          position: "absolute",
          left: PAD,
          top: INPUT_Y,
          width: MATCHER_W - 2 * PAD,
          height: INPUT_H,
          borderRadius: 20,
          background: DAY.ground,
          boxShadow: `inset 0 0 0 1.5px ${ink(0.05)}`,
          overflow: "hidden",
        }}
      >
        {docked ? (
          <div style={{ position: "absolute", left: 18, top: 0, height: INPUT_H, display: "flex", alignItems: "center", gap: 18, transform: `translateX(${chipX}px)`, opacity: chipO }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 44,
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
            <span style={{ display: "inline-flex", alignItems: "center", color: DAY.text }}>
              <Lit>scripts/rollback.sh</Lit>
              <span style={{ margin: "0 12px" }}>
                <Icon name="arrow" size={26} color={DAY.textMuted} />
              </span>
              <Lit>scripts/rollback-v2.sh</Lit>
            </span>
          </div>
        ) : (
          <div style={{ position: "absolute", left: 18, top: (INPUT_H - 44) / 2, width: monoW("PR #482", 26) + 28, height: 44, borderRadius: 12, background: DAY.trace }} />
        )}
      </div>
      {/* the rules, from the real why sentence */}
      <Row y={ROW_Y[0]} at={rows[0]} again={runs.map((r) => r.at + 2)}>
        <span style={{ color: DAY.textMuted, marginRight: 14 }}>Anchor</span>
        <Lit size={27}>payments-api: scripts/rollback.sh</Lit>
      </Row>
      <Row y={ROW_Y[1]} at={rows[1]} again={runs.map((r) => r.at + 4)}>
        The page mentions <Lit size={27}>ROLLBACK_TIMEOUT</Lit> and <Lit size={27}>rollback.sh</Lit>,<br />
        which PR #482 removed.
      </Row>
      <Row y={ROW_Y[2]} at={rows[2]} again={runs.map((r) => r.at + 6)}>
        Section &ldquo;Steps&rdquo; names it.
      </Row>
      <div style={{ position: "absolute", left: PAD, right: PAD, top: DIV_Y, height: 2, background: DAY.line, opacity: scoreSet }} />
      {/* the score against the threshold */}
      <div
        style={{
          position: "absolute",
          left: PAD,
          top: SCORE_Y,
          fontSize: 32,
          lineHeight: "42px",
          fontWeight: 500,
          opacity: scoreSet,
          transform: `translateY(${(1 - scoreSet) * 10}px)`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        Score <span style={{ fontWeight: 600 }}>1.00</span> <span style={{ color: DAY.textMuted }}>(threshold 0.5)</span>
      </div>
      <div style={{ position: "absolute", left: TRACK_X0, top: TRACK_Y, width: TRACK_X1 - TRACK_X0, height: 4, borderRadius: 2, background: DAY.line, opacity: scoreSet }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: 4, borderRadius: 2, width: `${dot * 100}%`, background: DAY.text }} />
        <div style={{ position: "absolute", left: "50%", top: -12, width: 3, height: 28, marginLeft: -1.5, borderRadius: 2, background: DAY.lineStrong }} />
        <div
          style={{
            position: "absolute",
            left: `${dot * 100}%`,
            top: -10,
            width: 24,
            height: 24,
            marginLeft: -12,
            borderRadius: "50%",
            background: DAY.text,
            boxShadow: `0 0 0 5px ${DAY.surface}`,
          }}
        />
      </div>
      {/* the result: the page's state, Possibly stale, slipped one unit with its trace, glow and bloom */}
      {frame >= result ? (
        <div style={{ position: "absolute", left: PAD, top: RESULT_Y, height: badgeH, display: "flex", alignItems: "center" }}>
          <span style={{ position: "relative", display: "inline-grid" }}>
            <span style={{ gridArea: "1 / 1", borderRadius: 8 * BADGE_K, background: DAY.trace, opacity: landed }} />
            <span style={{ gridArea: "1 / 1", position: "relative", transform: `translateX(${landed * SLIP_UNIT * 100}%)` }}>
              <span
                style={{
                  position: "absolute",
                  left: "-40%",
                  right: "-40%",
                  top: "-110%",
                  bottom: "-110%",
                  borderRadius: "50%",
                  background: `radial-gradient(closest-side, ${amber(0.28 * landed)} 0%, ${amber(0.09 * landed)} 60%, transparent 100%)`,
                }}
              />
              <Badge state="possibly_stale" size={BADGE_K} theme="day" glow={landed} style={{ position: "relative" }} />
              {/* a re-run's result drops onto this one and registers exactly: an outline that lands with no offset */}
              {twinDrop ? (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 8 * BADGE_K,
                    boxShadow: `0 0 0 3px ${DAY.text}`,
                    transform: `translateY(${(1 - twinDrop.p) * -70}px)`,
                    opacity: twinDrop.since < 0 ? 0.9 : interpolate(twinDrop.since, [0, 10], [0.9, 0], clamp),
                  }}
                />
              ) : null}
            </span>
          </span>
          {/* one dot per run: each fills as that run lands on the same result */}
          <span style={{ marginLeft: 76, display: "inline-flex", gap: 12, opacity: landed }}>
            {[result, ...reruns].map((at, i) => (
              <span
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  boxShadow: `inset 0 0 0 2.5px ${DAY.text}`,
                  background: frame >= at ? DAY.text : "transparent",
                  transform: `scale(${frame >= at && frame < at + 6 ? 1.25 : 1})`,
                }}
              />
            ))}
          </span>
        </div>
      ) : null}
    </div>
  );
};
