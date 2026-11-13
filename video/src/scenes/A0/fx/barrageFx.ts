import { createEffect } from "remotion";
import { type BarrageGl, type BarrageLook, cleanupBarrage, drawBarrage, setupBarrage, uploadBarrage } from "./barrageShader";

/**
 * The barrage pass as a Remotion effect for <HtmlInCanvas effects>: one custom WebGL2 pass instead of a chain of
 * built-in effects (each built-in effect is its own pass and texture upload). Adapted from the Satchel film's H0
 * (same owner). The single-backend `createEffect` form is still supported in Remotion 4.0.543 (docs/video/appendix/
 * tool-facts.md 1.4); remotion.config.ts pins the preferred backend to webgl2 and the render needs --gl=angle.
 *
 *   <HtmlInCanvas width={1920} height={1080} effects={[barrageFx(barrageLook(frame))]}>…plates…</HtmlInCanvas>
 *
 * The chain holds the frame (delayRender) until the pass has drawn, so it is render-safe.
 */
export const barrageFx = createEffect<BarrageLook, BarrageGl>({
  type: "dds.a0.barrage",
  label: "barrageFx()",
  documentationLink: null,
  backend: "webgl2",
  calculateKey: (p) => JSON.stringify(p),
  setup: (target) => {
    // The chain's pool already created this context (premultiplied, preserveDrawingBuffer); this returns it.
    const gl = target.getContext("webgl2", { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error("barrageFx: WebGL2 unavailable (render with --gl=angle)");
    return setupBarrage(gl);
  },
  apply: ({ source, width, height, params, state, flipSourceY }) => {
    uploadBarrage(state, source as TexImageSource, flipSourceY);
    drawBarrage(state, width, height, params);
  },
  cleanup: (s) => cleanupBarrage(s),
  schema: {},
  validateParams: (p) => {
    if (typeof p !== "object" || p === null || typeof p.time !== "number" || typeof p.seed !== "number") {
      throw new TypeError("barrageFx() needs { time, seed } (use mergeLooks())");
    }
  },
});
