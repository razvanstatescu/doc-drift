import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { EASE, tween } from "../../lib/time";
import { DAY, elevAt, FONT, ink, type Rect } from "../../v4/look";

/**
 * Carried objects for P1 (R1 T9, R3 V11/V12): a literal that lifts off the page and flies into its suggestion row, and
 * the word "Verified" that leaves the notice and lands in the byline. Stage coordinates (inside the scene's camera).
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** A carried token's flight: leaves briskly, lands soft (no long hover at either end, unlike expo in-out). */
const FLIGHT = Easing.bezier(0.45, 0, 0.15, 1);

/**
 * A token copy (S-2): on `liftAt` a white chip with the word pops off its home on the page toward the camera (1.45x,
 * 22 px up, elevation 4, its contact shadow left on the page below, wide enough to cover its own line), then flies on an
 * arc above everything to its row and
 * settles into the row's own chip (the white turns to the row's sunk well and the height goes). The page's own word stays
 * where it is: Doc Drift reads it, it does not take it away.
 */
export const FlyToken: React.FC<{
  text: string;
  /** The word's box on the page (stage px). */
  home: Rect;
  /** The row chip it docks on (stage px). */
  to: Rect;
  /** Mono size at the destination (film px); the chip is laid out at this size and scaled. */
  font: number;
  liftAt: number;
  flyAt: number;
  land: number;
  /** Arc height in px (up). */
  arc?: number;
}> = ({ text, home, to, font, liftAt, flyAt, land, arc = 90 }) => {
  const frame = useCurrentFrame();
  if (frame < liftAt || frame >= land + 1) return null;
  const up = tween(frame, liftAt, liftAt + 12, 0, 1, EASE.expoOut);
  const t = tween(frame, flyAt, land, 0, 1, FLIGHT);
  // at rest the chip's text sits exactly on the page's word; lifted, it is 1.2x and 52 px higher
  const homeScale = home.h / (to.h * 0.82);
  const liftedScale = homeScale * (1 + 0.45 * up);
  const s = lerp(liftedScale, 1, t);
  const hx = home.x + home.w / 2;
  const hy = home.y + home.h / 2;
  const cx = lerp(hx, to.x + to.w / 2, t);
  const cy = lerp(hy - 22 * up, to.y + to.h / 2, t) - arc * Math.sin(Math.PI * t);
  const settle = tween(frame, land - 5, land, 0, 1, EASE.linear);
  const level = (1 + 3 * up) * (1 - settle);
  const opacity = tween(frame, liftAt, liftAt + 2, 0, 1, EASE.linear);
  // the contact shadow stays on the page under the lifted chip until it flies
  const contact = up * (1 - tween(frame, flyAt, flyAt + 8, 0, 1, EASE.linear));
  const cw = to.w * liftedScale;
  return (
    <>
      {contact > 0.01 ? (
        <div
          style={{
            position: "absolute",
            left: hx - cw * 0.45,
            top: hy - 4,
            width: cw * 0.9,
            height: 26,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${ink(0.16 * contact)} 0%, ${ink(0.05 * contact)} 60%, transparent 100%)`,
            zIndex: 39,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: cx - to.w / 2,
          top: cy - to.h / 2,
          width: to.w,
          height: to.h,
          transform: `scale(${s})`,
          transformOrigin: "50% 50%",
          opacity: opacity < 1 ? opacity : undefined,
          borderRadius: font * 0.36,
          background: settle > 0 ? mixHex(DAY.surface, DAY.surfaceSunk, settle) : DAY.surface,
          boxShadow: [`0 0 0 1.5px ${ink(0.1 * (1 - settle))}`, level > 0.01 ? elevAt(level) : ""].filter(Boolean).join(", "),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.mono,
          fontSize: font,
          letterSpacing: "-0.01em",
          color: DAY.text,
          whiteSpace: "pre",
          zIndex: 40,
        }}
      >
        {text}
      </div>
    </>
  );
};

/**
 * A word that leaves one place and lands in another (stage px), keeping its weight, scaling its size from `fromFont`
 * to `toFont`. It rides on a soft white plate while it travels so it reads over anything it crosses.
 */
export const FlyWord: React.FC<{
  text: string;
  from: Rect;
  to: Rect;
  fromFont: number;
  toFont: number;
  weight?: number;
  toWeight?: number;
  at: number;
  land: number;
  /** Frames it stays on its landing spot after `land` (it hands over to the element drawn there). */
  hold?: number;
  arc?: number;
}> = ({ text, from, to, fromFont, toFont, weight = 600, toWeight, at, land, hold = 4, arc = 60 }) => {
  const frame = useCurrentFrame();
  if (frame < at || frame >= land + hold) return null;
  const t = tween(frame, at, land, 0, 1, EASE.expoInOut);
  const lift = Math.sin(Math.PI * Math.min(1, t * 1.1));
  const cx = lerp(from.x + from.w / 2, to.x + to.w / 2, t);
  const cy = lerp(from.y + from.h / 2, to.y + to.h / 2, t) - arc * Math.sin(Math.PI * t);
  // laid out at the destination size, scaled from the source size
  const s = lerp(fromFont / toFont, 1, t) * (1 + 0.08 * lift);
  // the white plate is opaque for the whole flight (it covers what it lands on) and fades with the word after landing
  const plateIn = tween(frame, at, at + 3, 0, 1, EASE.linear);
  const out = tween(frame, land + 2, land + hold, 0, 1, EASE.linear);
  const w = to.w;
  const h = to.h;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        transform: `scale(${s})`,
        transformOrigin: "50% 50%",
        opacity: out > 0 ? 1 - out : undefined,
        zIndex: 30,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: `${-h * 0.22}px ${-h * 0.3}px`,
          borderRadius: h * 0.3,
          background: DAY.surface,
          boxShadow: elevAt(1 + 3 * lift),
          opacity: plateIn,
        }}
      />
      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          alignItems: "center",
          fontFamily: FONT.sans,
          fontWeight: lift > 0.5 ? weight : (toWeight ?? weight),
          fontSize: toFont,
          lineHeight: 1,
          color: DAY.text,
          whiteSpace: "pre",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Mix two #RRGGBB colours. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
