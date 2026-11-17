import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { Cursor } from "../../../components/Cursor";
import { findCapture } from "../../../lib/captures";
import { FPS } from "../../../lib/time";
import { DAY, elevAt, RealCaptureContext, VideoAt, type Rect } from "../../../v4/kit";

/**
 * A real capture, cropped tight and shown at reading size (round 2, V5.md 8.1 and 8.2): only the crop is drawn, on a
 * white mat with a soft shadow; nothing is painted on it (captures.json's "(Development)" covers are drawn, Mist bands
 * and rings go in `children`, capture px). The FOCUS point (capture px) sits at `place` (screen px); `scale` is film px
 * per capture px (at most 1); grow `scale` for the take's one push-in and the focus stays where the eye is. The creep
 * (1% a second from `from`) and a 2 px float keep a held card alive. A recording plays at source second `t`.
 */
export type RealCardProps = {
  capture: string;
  crop: Rect;
  focus: { x: number; y: number };
  place: { x: number; y: number };
  scale: number;
  /** The card's first frame (the creep starts here). */
  from: number;
  /** Source second for a recording. */
  t?: number;
  /** White mat around the crop, screen px (default 16). */
  mat?: number;
  /** A recorded click on this card: the frame it lands on and where (capture px). */
  click?: { frame: number; x: number; y: number; from: [number, number]; travel?: number };
  creep?: number;
  children?: React.ReactNode;
};

/** The card's crop on screen at a frame (for marks and carries placed in screen px). */
export function realCardRect(p: Pick<RealCardProps, "crop" | "focus" | "place" | "scale" | "from" | "creep">, frame: number): Rect {
  const s = cardScale(p, frame);
  const f = floatOf(frame);
  return { x: p.place.x - (p.focus.x - p.crop.x) * s + f.x, y: p.place.y - (p.focus.y - p.crop.y) * s + f.y, w: p.crop.w * s, h: p.crop.h * s };
}

const cardScale = (p: Pick<RealCardProps, "scale" | "from" | "creep">, frame: number) =>
  p.scale * Math.exp((Math.log(1 + (p.creep ?? 1) / 100) * Math.max(0, frame - p.from)) / FPS);

const floatOf = (frame: number) => {
  const w = (2 * Math.PI) / (5 * FPS);
  return { x: 2 * Math.cos(w * frame), y: 1.4 * Math.sin(w * frame) };
};

export const RealCard: React.FC<RealCardProps> = (p) => {
  const frame = useCurrentFrame();
  const cap = findCapture(p.capture);
  const r = realCardRect(p, frame);
  const s = r.w / p.crop.w;
  const mat = p.mat ?? 16;
  const cw = cap?.width ?? 3840;
  const ch = cap?.height ?? 2160;
  const world: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: cw,
    height: ch,
    transformOrigin: "0 0",
    transform: `scale(${s}) translate(${-p.crop.x}px, ${-p.crop.y}px)`,
  };
  return (
    <>
      <div style={{ position: "absolute", left: r.x - mat, top: r.y - mat, width: r.w + 2 * mat, height: r.h + 2 * mat, borderRadius: 18, background: DAY.surface, boxShadow: elevAt(3) }} />
      <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, overflow: "hidden", borderRadius: 6 }}>
        <div style={world}>
          {cap ? (
            cap.kind === "video" ? (
              <VideoAt src={staticFile(cap.file)} t={p.t ?? 0} style={{ width: cw, height: ch }} />
            ) : (
              <Img src={staticFile(cap.file)} style={{ width: cw, height: ch, display: "block" }} />
            )
          ) : null}
          {(cap?.masks ?? []).map((m, i) => (
            <div key={i} style={{ position: "absolute", left: m.box[0], top: m.box[1], width: m.box[2], height: m.box[3], background: m.fill ?? "#FFFFFF" }} />
          ))}
          <RealCaptureContext.Provider value={p.capture}>{p.children}</RealCaptureContext.Provider>
        </div>
      </div>
      {p.click ? (
        <div style={{ position: "absolute", left: r.x, top: r.y, width: 0, height: 0 }}>
          <div style={{ ...world, pointerEvents: "none" }}>
            <Cursor
              scale={2.4 / s}
              showAt={p.click.frame - (p.click.travel ?? 16) - 2}
              hideAt={p.click.frame + 10}
              points={[
                { frame: p.click.frame - (p.click.travel ?? 16) - 2, x: p.click.from[0], y: p.click.from[1] },
                { frame: p.click.frame, x: p.click.x, y: p.click.y, click: true, cursor: "pointer", travel: p.click.travel ?? 16 },
              ]}
            />
          </div>
        </div>
      ) : null}
    </>
  );
};
