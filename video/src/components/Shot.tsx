import React from "react";
import { magnify } from "@remotion/effects/magnify";
import { Video } from "@remotion/media";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useTheme } from "../brand/theme";
import { FONT } from "../brand/tokens";
import { findCapture, type Box, type CaptureMask } from "../lib/captures";
import { hasStaticFile } from "../lib/files";
import { clamp, EASE } from "../lib/time";
import { cameraAt, cameraTransform, type CamKey, type CamState } from "../motion/camera";
import { scaleShadow } from "./BrowserFrame";
import { Cursor, type CursorPoint } from "./Cursor";

/**
 * A real product capture (public/captures/, listed in src/data/captures.json) in a viewport of `width` x `height`
 * frame px. Everything you pass is in CAPTURE px (2x of CSS), the same space as captures.json's clicks and masks:
 *
 *   <Shot id="p2-badge-stale" width={1600} height={900}
 *     crop={[0, 0, 2880, 1620]}
 *     keys={[{ frame: 20, x: 1910, y: 300, zoom: 1.6 }]}          // punch-in, expo out, then still
 *     loupe={{ from: 40, to: 100, x: 1910, y: 300, zoom: 2 }}     // a loupe on a small detail
 *     cursor={[{ frame: 0, x: 1400, y: 900 }, { frame: 30, x: 1910, y: 300, click: true, cursor: "pointer" }]}
 *   />
 *
 * Masks from captures.json (the "(Development)" suffix) are always drawn as flat covers that move with the image.
 * A capture that does not exist yet renders a labelled placeholder instead of failing the render.
 */
export type Loupe = {
  /** Local frames it shows (fades in at `from`, out at `to`). */
  from: number;
  to?: number;
  /** The detail, capture px. */
  x: number;
  y: number;
  /** Magnification over the current on-screen scale (default 2). */
  zoom?: number;
  /** Radius in frame px (default 170). */
  radius?: number;
  /** Where the loupe sits, in viewport px (default: over the detail). */
  at?: [number, number];
  /** "dom" (default): a second, sharper copy of the capture; "effect": the magnify() effect (GPU; render with --gl=angle). */
  kind?: "dom" | "effect";
};

export const Shot: React.FC<{
  /** Capture id in captures.json. */
  id?: string;
  /** Or a file under public/ with its pixel size (kit tests, generated images). */
  src?: string;
  srcWidth?: number;
  srcHeight?: number;
  kind?: "still" | "video";
  width: number;
  height: number;
  /** Region shown at zoom 1, capture px (default: the whole capture). */
  crop?: Box;
  /** "cover" (default) fills the viewport with the crop; "contain" fits it whole. */
  fit?: "cover" | "contain";
  /** Punch-in keyframes in capture px (see motion/camera). */
  keys?: CamKey[];
  loupe?: Loupe | Loupe[];
  /** Extra covers on top of captures.json's masks. */
  masks?: CaptureMask[];
  /** Fill for masks that do not name one (default white). */
  maskFill?: string;
  /** A scripted cursor in capture px. */
  cursor?: CursorPoint[];
  /** Capture px per CSS px, for the cursor's size (default 2). */
  dpr?: number;
  /** Cursor size over the real one (default 1.5, so it reads at phone size). */
  cursorScale?: number;
  /** Video captures: skip this many frames of the source; speed. */
  trimBefore?: number;
  playbackRate?: number;
  background?: string;
  style?: React.CSSProperties;
}> = ({
  id,
  src,
  srcWidth,
  srcHeight,
  kind,
  width,
  height,
  crop,
  fit = "cover",
  keys = [],
  loupe,
  masks = [],
  maskFill = "#FFFFFF",
  cursor,
  dpr = 2,
  cursorScale = 1.5,
  trimBefore,
  playbackRate,
  background,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = useTheme();
  const cap = id ? findCapture(id) : undefined;
  const file = cap?.file ?? src;
  const capW = cap?.width ?? srcWidth ?? 0;
  const capH = cap?.height ?? srcHeight ?? 0;
  const capKind = cap?.kind ?? kind ?? (file && /\.(mp4|mov|webm|mkv)$/i.test(file) ? "video" : "still");

  if (!file || !capW || !capH || !hasStaticFile(file)) {
    return (
      <div
        style={{
          position: "relative",
          width,
          height,
          background: p.surfaceSunk,
          border: `2px dashed ${p.lineStrong}`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.mono,
          fontSize: 28,
          color: p.textMuted,
          ...style,
        }}
      >
        {`capture ${id ?? src ?? "?"} not found`}
      </div>
    );
  }

  const [cx, cy, cw, ch] = crop ?? [0, 0, capW, capH];
  const base = fit === "contain" ? Math.min(width / cw, height / ch) : Math.max(width / cw, height / ch);
  const rest: CamState = { x: cx + cw / 2, y: cy + ch / 2, zoom: 1 };
  const cam = clampToCrop(cameraAt(frame, keys, rest), [cx, cy, cw, ch], width, height, base);
  const scale = base * cam.zoom;
  const allMasks = [...(cap?.masks ?? []), ...masks];
  const loupes = loupe ? (Array.isArray(loupe) ? loupe : [loupe]) : [];
  const effectLoupes = loupes.filter((l) => l.kind === "effect");
  const url = staticFile(file);

  // screen position (viewport px) of a capture point
  const toScreen = (x: number, y: number): [number, number] => [width / 2 + scale * (x - cam.x), height / 2 + scale * (y - cam.y)];

  const media = (extraEffects: boolean, key: string) =>
    capKind === "video" ? (
      <Video key={key} src={url} muted trimBefore={trimBefore} playbackRate={playbackRate} style={{ width: capW, height: capH, display: "block" }} />
    ) : (
      <Img
        key={key}
        src={url}
        style={{ width: capW, height: capH, display: "block" }}
        effects={
          extraEffects && effectLoupes.length > 0
            ? effectLoupes.map((l) =>
                magnify({
                  center: [l.x / capW, l.y / capH],
                  // grows from 100% (no change) to the full zoom as the loupe comes in
                  magnification: 100 * (1 + ((l.zoom ?? 2) - 1) * loupeIn(frame, l)),
                  size: (l.radius ?? 170) / scale,
                  feather: 2 / scale,
                  scaling: "soft",
                  disabled: loupeIn(frame, l) <= 0,
                }),
              )
            : undefined
        }
      />
    );

  const stageContent = (withEffects: boolean, withCursor: boolean) => (
    <>
      {media(withEffects, withEffects ? "media" : "media-copy")}
      {allMasks.map((m, i) => (
        <div key={i} style={{ position: "absolute", left: m.box[0], top: m.box[1], width: m.box[2], height: m.box[3], background: m.fill ?? maskFill }} />
      ))}
      {withCursor && cursor ? <Cursor points={cursor} scale={dpr * cursorScale} /> : null}
    </>
  );

  return (
    <div style={{ position: "relative", width, height, overflow: "hidden", background: background ?? p.surface, ...style }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: capW, height: capH, transformOrigin: "0 0", transform: cameraTransform(cam, width, height, base) }}>
        {stageContent(true, true)}
      </div>
      {loupes.map((l, i) => {
        const vis = loupeIn(frame, l);
        if (vis <= 0) return null;
        const r = l.radius ?? 170;
        const m = l.zoom ?? 2;
        const effect = l.kind === "effect";
        // the effect magnifies in place, so its ring sits on the detail; the DOM loupe can sit anywhere
        const [ax, ay] = effect ? toScreen(l.x, l.y) : (l.at ?? toScreen(l.x, l.y));
        const pop = 0.86 + 0.14 * vis;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: ax - r,
              top: ay - r,
              width: 2 * r,
              height: 2 * r,
              borderRadius: "50%",
              overflow: "hidden",
              opacity: vis,
              transform: `scale(${pop})`,
              boxShadow: effect
                ? `0 0 0 4px ${p.surface}, 0 0 0 5px ${p.lineStrong}`
                : `0 0 0 4px ${p.surface}, 0 0 0 5px ${p.lineStrong}, ${scaleShadow(p.shadowRaise, 2)}`,
              background: effect ? "transparent" : (background ?? p.surface),
            }}
          >
            {effect ? null : (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: capW,
                  height: capH,
                  transformOrigin: "0 0",
                  transform: `translate(${r}px, ${r}px) scale(${scale * m}) translate(${-l.x}px, ${-l.y}px)`,
                }}
              >
                {stageContent(false, false)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** 0..1 visibility of a loupe: in over 10 f (expo out), out over 6 f. */
function loupeIn(frame: number, l: Loupe) {
  const a = interpolate(frame, [l.from, l.from + 10], [0, 1], { ...clamp, easing: EASE.expoOut });
  const b = l.to === undefined ? 1 : interpolate(frame, [l.to, l.to + 6], [1, 0], { ...clamp, easing: EASE.expoIn });
  return a * b;
}

/** Keep the view inside the crop at the current zoom (centre it when the crop is smaller than the view). */
function clampToCrop(c: CamState, crop: Box, viewW: number, viewH: number, base: number): CamState {
  const [cx, cy, cw, ch] = crop;
  const halfW = viewW / (2 * base * c.zoom);
  const halfH = viewH / (2 * base * c.zoom);
  const fit = (v: number, half: number, start: number, size: number) =>
    half * 2 >= size ? start + size / 2 : Math.max(start + half, Math.min(start + size - half, v));
  return { x: fit(c.x, halfW, cx, cw), y: fit(c.y, halfH, cy, ch), zoom: c.zoom };
}
