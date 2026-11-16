import React, { useId } from "react";

/**
 * The film's blur grammar (ported from Pot's motion/effects/blur.tsx): a directional smear via an SVG
 * <feGaussianBlur stdDeviation="X Y"> (CSS blur() reads as defocus). Use it on moving things only: words rising,
 * whips, zoom-throughs. A filter flattens 3D: wrap a whole stage or a leaf element, never a layer inside a 3D world.
 * The DOM shape never changes when the blur turns on or off, so children are never remounted.
 */
const EPS = 0.25;
const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

export const DirectionalBlur: React.FC<{
  x?: number;
  y?: number;
  /** An inline-block span (words) instead of a full-size block. */
  inline?: boolean;
  /** Filter region padding as a fraction of the element box (default 0.15 block, 0.6 inline). */
  region?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x = 0, y = 0, inline = false, region, style, children }) => {
  const id = `dblur-${cleanId(useId())}`;
  const sx = Math.abs(x) < EPS ? 0 : Math.abs(x);
  const sy = Math.abs(y) < EPS ? 0 : Math.abs(y);
  const on = sx > 0 || sy > 0;
  const Tag = inline ? "span" : "div";
  const pad = (region ?? (inline ? 0.6 : 0.15)) * 100;
  return (
    <Tag
      style={{
        position: inline ? "relative" : "absolute",
        ...(inline ? { display: "inline-block" } : { inset: 0 }),
        filter: on ? `url(#${id})` : undefined,
        ...style,
      }}
    >
      {on ? (
        <svg width={0} height={0} style={{ position: "absolute", width: 0, height: 0 }} aria-hidden>
          <defs>
            <filter id={id} x={`${-pad}%`} y={`${-pad}%`} width={`${100 + 2 * pad}%`} height={`${100 + 2 * pad}%`} colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`${sx} ${sy}`} />
            </filter>
          </defs>
        </svg>
      ) : null}
      {children}
    </Tag>
  );
};

/** Smear sigma (px) for a move of `pxPerFrame` this frame: k x displacement (default 0.5), capped. */
export const smearSigma = (pxPerFrame: number, k = 0.5, max = 96) => Math.min(max, Math.abs(pxPerFrame) * k);

/** A smear that peaks at `at` and decays x`decay` per frame (default 0.5 at 30 fps: gone in 3 to 4 frames). */
export const smearDecay = (frame: number, at: number, peak: number, decay = 0.5) => (frame < at ? 0 : peak * Math.pow(decay, frame - at));
