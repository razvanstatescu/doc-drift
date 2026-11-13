import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Icon } from "../../brand/icons";
import { FONT, NIGHT } from "../../brand/tokens";
import { EASE } from "../../lib/time";
import { clamp } from "./fx/motion";
import { HERO_BOX, HERO_H, heroPose, implodeAt, panelOf, slamOn, slamPose, slamShake, stripSpeed, wallBoxes, wallShake } from "./Barrage";
import { LabelChip } from "./PlateCard";
import { PLATES } from "./plates";
import { BAR2, BAR3, BLACK, DIFF_PUNCH, DIFF_TO, HERO, STRIP_DIVE } from "./timing";

/**
 * Everything of ours in the barrage, drawn ABOVE the pass and never distorted: the diff card that opens the film,
 * the three captions (locked top-centre, hard-cut on the bar lines, held perfectly still) and the source chips that
 * keep every plate's source and date on screen while it is.
 */

// ── f0: the diff card ─────────────────────────────────────────────────────────────────────────────────────────────
export const OLD_PATH = "scripts/rollback.sh";
export const NEW_PATH = "scripts/rollback-v2.sh";

/**
 * Frame 0 must read with the sound off: "The code moved." over a merged rename. Night sunk card, mono literals; the old
 * path muted, the new one bright (no amber here: the first amber of the film is the slip at R). It holds a full second,
 * with a small punch-in on beat 2 (ours, so a camera move, never a distortion).
 */
export const DiffCard: React.FC<{ f: number }> = ({ f }) => {
  if (f >= DIFF_TO) return null;
  const push = (1 + 0.02 * (f / DIFF_TO)) * (1 + 0.05 * interpolate(f, [DIFF_PUNCH, DIFF_PUNCH + 5], [0, 1], { ...clamp, easing: EASE.expoOut }));
  const line: React.CSSProperties = {
    fontFamily: FONT.mono,
    fontWeight: 500,
    fontSize: 72,
    lineHeight: "100px",
    letterSpacing: "-0.015em",
    whiteSpace: "pre",
    padding: "0 22px",
    borderRadius: 10,
  };
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 150 }}>
      <div
        style={{
          transform: `scale(${push})`,
          boxSizing: "border-box",
          padding: "42px 56px 50px",
          borderRadius: 24,
          background: NIGHT.surfaceSunk,
          boxShadow: `0 0 0 2px ${NIGHT.line}, 0 30px 90px rgba(0, 0, 0, 0.65)`,
        }}
      >
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              height: 62,
              padding: "0 24px 0 18px",
              borderRadius: 10,
              background: NIGHT.surface,
              boxShadow: `0 0 0 2px ${NIGHT.line}`,
              fontFamily: FONT.sans,
              fontWeight: 600,
              fontSize: 36,
              letterSpacing: "0.005em",
              color: NIGHT.text,
            }}
          >
            <Icon name="merge" size={38} color={NIGHT.textMuted} stroke={1.9} />
            Merged
          </div>
        </div>
        <div style={{ marginTop: 30, marginLeft: -22, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ ...line, color: NIGHT.textMuted, background: "rgba(157, 184, 190, 0.07)" }}>{`- ${OLD_PATH}`}</div>
          <div style={{ ...line, color: NIGHT.text, background: "rgba(242, 246, 247, 0.1)" }}>{`+ ${NEW_PATH}`}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── the captions ──────────────────────────────────────────────────────────────────────────────────────────────────
export const CAPTIONS = [
  { from: 0, to: BAR2 - 1, text: "The code moved." },
  { from: BAR2, to: BAR3 - 1, text: "The docs didn’t." },
  { from: BAR3, to: BLACK - 1, text: "The agents can’t tell." },
] as const;

export const CAPTION_SIZE = 116;

/** Locked top-centre over a soft scrim, at full strength from their first frame (no blank frame between two). */
export const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = CAPTIONS.find((x) => f >= x.from && f <= x.to);
  if (!c) return null;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 340,
          background: "linear-gradient(rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.74) 48%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 96, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 600,
            fontSize: CAPTION_SIZE,
            lineHeight: 1,
            letterSpacing: "-0.028em",
            color: NIGHT.text,
            textShadow: "0 6px 30px rgba(0,0,0,0.75)",
            whiteSpace: "nowrap",
          }}
        >
          {c.text}
        </div>
      </div>
    </>
  );
};

// ── the source chips ──────────────────────────────────────────────────────────────────────────────────────────────
const CHIP = 25;
const CHIP_H = CHIP * 1.72;
/** Where chips may sit: below the caption band, starting inside the title-safe edge (x >= 192; QA v1 #2). */
const ZONE = { x0: 192, x1: 1894, y0: 300, y1: 1080 - 22 };

type ChipAt = { key: string; x: number; y: number; text: string; opacity: number; rotate?: number; origin?: string };

/** Chips for the wall's plates: at each plate's lower-left corner, kept inside the frame; they fade through whips. */
const wallChips = (f: number): ChipAt[] => {
  if (f < DIFF_TO || f >= BAR2) return [];
  const travel = interpolate(stripSpeed(f), [35, 120], [1, 0], clamp);
  const dive = interpolate(f, [STRIP_DIVE.from, STRIP_DIVE.from + 2], [1, 0], clamp);
  const o = travel * dive;
  if (o <= 0.01) return [];
  const sh = wallShake(f);
  return wallBoxes(f).flatMap((b) => {
    const visW = Math.min(b.x1, 1920) - Math.max(b.x0, 0);
    const visH = Math.min(b.y1, 1080) - Math.max(b.y0, ZONE.y0 - 20);
    if (visW < 260 || visH < 36) return []; // a sliver at the edge is texture, not a plate on screen
    const x = Math.max(b.x0 + 6, ZONE.x0);
    const y = Math.min(b.y1 + 12, ZONE.y1 - CHIP_H);
    if (x > ZONE.x1 - 200) return [];
    return [{ key: b.id, x: x + sh.x, y: y + sh.y, text: b.label, opacity: o }];
  });
};

/** The hero's chip, under its lower-left corner, until the dive. */
const heroChip = (f: number): ChipAt[] => {
  if (f < HERO.from || f >= HERO.dive.from) return [];
  const p = heroPose(f);
  return [
    {
      key: "hero",
      x: Math.max(ZONE.x0, HERO_BOX.cx - (HERO_BOX.w / 2) * p.s),
      y: HERO_BOX.cy + (HERO_H / 2) * p.s + 16,
      text: PLATES.wikimedia.label,
      opacity: 1,
      rotate: p.rot,
      origin: `${HERO_BOX.cx}px ${HERO_BOX.cy}px`,
    },
  ];
};

/** A slam's chip, inside the panel's lower-left corner (the panel's own pose), from the slam's first frame. */
const slamChip = (f: number): ChipAt[] => {
  const s = slamOn(f);
  if (!s) return [];
  const pose = slamPose(s, f);
  const sh = slamShake(f);
  const pn = panelOf(s);
  return [
    {
      key: `slam-${s.at}`,
      x: Math.max(ZONE.x0, pn.cx - (pn.w / 2) * pose.k + 22) + sh.x,
      y: pn.cy + (pn.h / 2) * pose.k - 22 - CHIP_H + sh.y,
      text: PLATES[s.id].label,
      opacity: 1,
      rotate: pose.rot,
      origin: `${pn.cx}px ${pn.cy}px`,
    },
  ];
};

export const Chips: React.FC<{ f: number }> = ({ f }) => {
  if (f >= BLACK) return null;
  const chips = [...wallChips(f), ...heroChip(f), ...slamChip(f)];
  if (chips.length === 0) return null;
  const imp = implodeAt(f);
  return (
    <AbsoluteFill style={{ transform: imp < 1 ? `scale(${imp})` : undefined }}>
      {chips.map((c) => (
        <AbsoluteFill key={c.key} style={c.rotate ? { transform: `rotate(${c.rotate}deg)`, transformOrigin: c.origin } : undefined}>
          <div style={{ position: "absolute", left: c.x, top: c.y, opacity: c.opacity }}>
            <LabelChip text={c.text} size={CHIP} />
          </div>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
