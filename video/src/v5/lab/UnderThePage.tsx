import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { EASE, tween } from "../../lib/time";
import { Bloom, Camera3D, KineticLine, Lift, Stage } from "../../v4/kit";
import { amber, BRAND, DAY, ELEV_DARK, FONT, ink, NIGHT, type Rect } from "../../v4/look";
import { PageTwin, pageRects, type PageTwinProps } from "../../v4/twins";
import { Bed } from "./common";

/**
 * R6 prototype 2 · Under the page (v5 techniques "X-ray reveal" and "the slip happens underneath").
 *
 * The two abstract ideas of the film as one physical picture, in 7 s, with no diagram and no jargon:
 *   1. "A page linked to the code and Jira work it describes": the runbook lies on a dark layer that holds what it
 *      describes; a wipe opens the page from its header down to step 2; inside it the page goes clear except the two
 *      anchored words, which stay, and a pin drops from each to the thing it names (PAY-6, scripts/rollback.sh).
 *   2. "The code moved under the doc": the code row slips one unit (the brand's slip, the one amber) and renames to
 *      rollback-v2.sh, its pin leans off true, while the page's words do not move. The page closes, the Steps band takes
 *      the amber and hands it to the byline: "Possibly stale · Doc Drift".
 * Lab frames on the film grid from film frame 1057 (A2's Day act): beats on multiples of 15, bars on 0, 60, 120, 180.
 */

export const UP_DUR = 240;

const P: PageTwinProps = { world: "day", k: 1.5, x: 120, y: 70 };
const OPEN0 = 26; // the wipe starts at the header table
const OPEN1 = 76; // ... and has passed step 2
const CODE_SLIP = 120; // the code renames (a bar)
const CLOSE0 = 154; // the slipped code row holds 1.1 s under the unmoved page word before the page closes
const CLOSE1 = 166;
const BAND_SLIP = 168;
const SWAP = 180; // the byline swap on the bar (readable at 183)

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const UnderThePage: React.FC = () => {
  const frame = useCurrentFrame();
  const props: PageTwinProps = {
    ...P,
    byline: { kind: "dds", state: "possibly_stale", from: "verified", at: SWAP },
    slip: { at: BAND_SLIP, handoff: SWAP },
  };
  const r = pageRects({ ...P, byline: { kind: "dds", state: "verified" } });
  const card = r.card;
  const tJira = r.tokens["PAY-6"]!;
  const tCode = r.tokens["./scripts/rollback.sh"]!;

  // the opening: top edge fixed just above the Jira row, bottom edge travels down past step 2, then closes back up
  const top = tJira.y - 70;
  const bottomOpen = tCode.y + tCode.h + 150;
  const open = tween(frame, OPEN0, OPEN1, 0, 1, EASE.expoInOut) * (1 - tween(frame, CLOSE0, CLOSE1, 0, 1, EASE.expoInOut));
  const bottom = lerp(top, bottomOpen, open);
  const lensOn = bottom - top > 2;

  // the dark layer: what the page describes, under it
  const slab: Rect = { x: card.x + 34, y: card.y + 26, w: card.w + 64, h: card.h - 6 };
  const rowJ = { x: tJira.x, y: tJira.y + 62 };
  const rowC = { x: tCode.x + 18, y: tCode.y + 66 };

  // the change: the code row slips one unit right, amber, and renames
  const slip = tween(frame, CODE_SLIP, CODE_SLIP + 6, 0, 1, EASE.expoOut);
  const codeW = 470;
  const unit = codeW * 0.117;
  const codeAmber = slip * (1 - tween(frame, BAND_SLIP, BAND_SLIP + 6, 0, 1, EASE.expoOut)); // hands the amber to the page
  const renamed = frame >= CODE_SLIP + 2;

  // pins: from the page word (bottom centre) to its target (top centre); the code pin follows the slipped row
  const pinJ = { x0: tJira.x + tJira.w / 2, y0: tJira.y + tJira.h + 6, x1: rowJ.x + 52, y1: rowJ.y - 4 };
  const pinC = { x0: tCode.x + tCode.w / 2, y0: tCode.y + tCode.h + 6, x1: rowC.x + codeW / 2 + unit * slip, y1: rowC.y - 4 };
  const pinDraw = (y: number) => tween(bottom, y - 10, y + 60, 0, 1, EASE.linear); // a pin draws as the wipe passes

  // camera: the layers apart and turned at first, square and together before anything is read, then onto the byline
  const together = tween(frame, 8, 40, 0, 1, EASE.expoInOut);
  // once the page has closed, the code layer's words go under it (they never show through the slipped band's cuts)
  const under = 1 - tween(frame, CLOSE1 - 2, CLOSE1 + 4, 0, 1, EASE.linear);
  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans }}>
      <Stage world="day" motif="grid" light={["34%", "34%"]}>
        <Camera3D
          seed="under"
          keys={[
            { at: 0, to: { x: 820, y: 520, zoom: 0.94, yaw: -13, pitch: 9 } },
            { at: 6, dur: 36, to: { x: 960, y: 540, zoom: 1.0, yaw: 0, pitch: 0 }, ease: EASE.expoInOut },
            // onto the byline, keeping the page in the left two thirds so the type zone stays clear
            { at: SWAP - 6, dur: 26, to: { x: 885, y: r.badge.y + r.badge.h / 2 + 200, zoom: 1.18 } },
          ]}
        >
          {/* the dark layer under the page: it starts below and comes up under it */}
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `translateZ(${lerp(-220, 0, together)}px)` }}>
            <Lift appear at={0} to={2} dark x={slab.x} y={slab.y} radius={30}>
              <div style={{ width: slab.w, height: slab.h, borderRadius: 30, background: BRAND.fathom, boxShadow: ELEV_DARK[2] }} />
            </Lift>
            {/* the Jira issue */}
            <div style={{ position: "absolute", left: rowJ.x, top: rowJ.y, display: "flex", gap: 16, alignItems: "baseline", whiteSpace: "nowrap", opacity: under }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 30, color: NIGHT.link }}>PAY-6</span>
              <span style={{ fontSize: 28, color: NIGHT.text }}>Safer payments deploys and rollbacks</span>
              <span style={{ fontSize: 24, color: NIGHT.textMuted }}>Jira issue</span>
            </div>
            {/* the code file: its trace stays home, the row slips and renames */}
            <div style={{ position: "absolute", left: rowC.x, top: rowC.y, width: codeW, height: 48, opacity: under }}>
              {slip > 0 ? <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: NIGHT.trace }} /> : null}
              {codeAmber > 0.02 ? <Bloom cx={codeW / 2 + unit * slip} cy={24} w={codeW * 1.5} h={150} strength={0.3 * codeAmber} /> : null}
              <div
                style={{
                  position: "absolute",
                  left: unit * slip,
                  top: 0,
                  height: 48,
                  padding: "0 16px",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  whiteSpace: "nowrap",
                  background: codeAmber > 0.02 ? amber(codeAmber) : "transparent",
                  boxShadow: codeAmber > 0.02 ? `0 0 26px ${amber(0.45 * codeAmber)}` : undefined,
                }}
              >
                <span style={{ fontFamily: FONT.mono, fontSize: 30, color: codeAmber > 0.5 ? BRAND.fathom : NIGHT.text }}>
                  {renamed ? "scripts/rollback-v2.sh" : "scripts/rollback.sh"}
                </span>
                <span style={{ fontSize: 24, color: codeAmber > 0.5 ? BRAND.fathom : NIGHT.textMuted }}>{renamed ? "renamed in PR #482" : "in payments-api"}</span>
              </div>
            </div>
          </div>

          {/* the page: opaque outside the opening, clear inside it */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 1920,
              height: 1080,
              WebkitMaskImage: lensOn
                ? `linear-gradient(to bottom, #000 0px, #000 ${top - 8}px, rgba(0,0,0,0.06) ${top + 8}px, rgba(0,0,0,0.06) ${bottom - 8}px, #000 ${bottom + 8}px, #000 1080px)`
                : undefined,
              maskImage: lensOn
                ? `linear-gradient(to bottom, #000 0px, #000 ${top - 8}px, rgba(0,0,0,0.06) ${top + 8}px, rgba(0,0,0,0.06) ${bottom - 8}px, #000 ${bottom + 8}px, #000 1080px)`
                : undefined,
            }}
          >
            <PageTwin {...props} />
          </div>

          {/* inside the opening: the anchored words stay, on white plates, and their pins drop to what they name */}
          {lensOn ? (
            <>
              <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                {[
                  { p: pinJ, d: pinDraw(tJira.y + tJira.h) },
                  { p: pinC, d: pinDraw(tCode.y + tCode.h) },
                ].map(({ p, d }, i) =>
                  d > 0 ? (
                    <g key={i} opacity={Math.min(1, open * 1.5)}>
                      <line x1={p.x0} y1={p.y0} x2={lerp(p.x0, p.x1, d)} y2={lerp(p.y0, p.y1, d)} stroke={BRAND.current} strokeWidth={2.5} strokeLinecap="round" />
                      <circle cx={p.x0} cy={p.y0} r={6} fill={DAY.surface} stroke={BRAND.current} strokeWidth={2.5} />
                      {d >= 1 ? <circle cx={p.x1} cy={p.y1} r={6} fill={BRAND.fathom} stroke={NIGHT.link} strokeWidth={2.5} /> : null}
                    </g>
                  ) : null,
                )}
              </svg>
              {[
                { t: tJira, text: "PAY-6" },
                { t: tCode, text: "./scripts/rollback.sh" },
              ].map(({ t, text }) =>
                bottom > t.y + 4 ? (
                  <div
                    key={text}
                    style={{
                      position: "absolute",
                      left: t.x - 10,
                      top: t.y - 6,
                      height: t.h + 12,
                      padding: "0 10px",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 10,
                      background: DAY.surface,
                      boxShadow: `0 0 0 1.5px ${ink(0.12)}, 0 8px 22px ${ink(0.16)}`,
                      fontFamily: FONT.mono,
                      fontSize: t.h * 0.78,
                      color: DAY.text,
                      whiteSpace: "nowrap",
                      opacity: Math.min(1, open * 2),
                    }}
                  >
                    {text}
                  </div>
                ) : null,
              )}
            </>
          ) : null}
        </Camera3D>
      </Stage>

      {/* the type zone beside the object: one short line, then the turn */}
      <div style={{ position: "absolute", left: 1282, top: 330, width: 610 }}>
        {frame < CODE_SLIP - 2 ? (
          <KineticLine text={"Linked to the\ncode it describes."} at={OPEN0 + 6} size={68} exit={{ at: CODE_SLIP - 10 }} mark={{ words: [3, 3], kind: "mist", at: OPEN1 - 6 }} />
        ) : (
          <KineticLine text={"The code moved.\nThe page didn't."} at={CODE_SLIP + 2} words={[{ from: CODE_SLIP + 8 }, undefined, undefined, { from: CODE_SLIP + 30 }]} size={68} />
        )}
      </div>

      <Bed filmFrom={1057} dur={UP_DUR} gainDb={-16} />
      <Sfx id="swish-up" at={OPEN0 + 10} gainDb={-2} />
      <Sfx id="tick-soft" at={OPEN0 + 18} />
      <Sfx id="tick-soft" at={OPEN1 - 8} />
      <Sfx id="slip" at={CODE_SLIP + 6} />
      <Sfx id="tick" at={BAND_SLIP + 4} gainDb={-4} />
      <Sfx id="tick-soft" at={SWAP + 3} />
    </AbsoluteFill>
  );
};
