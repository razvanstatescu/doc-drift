import type { CursorPoint } from "../Cursor";
import { FPS } from "../../lib/time";
import { pageRects, type PageTwinProps } from "../../v4/twins";
import type { Cam3 } from "../../v4/kit";
import type { Rect } from "../../v4/look";

/**
 * The seam between A2 and P1 (V4.md section 4: "A2 ends on the runbook twin reading Unanchored, P1 starts on the same
 * composition"). A2's last shot and P1's first frames share these constants:
 *
 * - FRESH_PAGE: a fresh runbook twin whose byline item reads "Unanchored · Doc Drift".
 * - FRESH_CAM: the camera on its title and byline, placed so the byline item's centre sits at BADGE_SCREEN, which is
 *   exactly where R1's real byline lands (R3 section 5: "placed so its byline sits where R1's real byline will land").
 * - The camera does not float here (float 0) and creeps at FRESH_CREEP from A2's push, so the two scenes meet without a
 *   jump: A2's shot starts creeping FRESH_LEAD frames before P1's first frame, and P1's base zoom already carries that.
 */

export const FRESH_PAGE: PageTwinProps = {
  world: "day",
  doc: "runbook",
  k: 1.8,
  width: 520,
  x: 250,
  y: 150,
  byline: { kind: "dds", state: "unanchored" },
};

/** Where the byline item's centre sits on screen in the fresh composition (and where R1's real byline lands). */
export const BADGE_SCREEN: [number, number] = [944, 556];
export const FRESH_ZOOM = 1.15;
/** Camera creep in the fresh composition, % per second (Camera3D's default). */
export const FRESH_CREEP = 1.5;
/** Frames of A2 the fresh composition is on screen before P1 starts (A2's slip push lands it at end - FRESH_LEAD). */
export const FRESH_LEAD = 15;

export const freshRects = pageRects(FRESH_PAGE);
const badge = freshRects.badge;
const bcx = badge.x + badge.w / 2;
const bcy = badge.y + badge.h / 2;

/** The fresh camera at the moment A2's push lands it (A2 frame end - FRESH_LEAD). */
export const FRESH_CAM: Cam3 = {
  x: bcx - (BADGE_SCREEN[0] - 960) / FRESH_ZOOM,
  y: bcy - (BADGE_SCREEN[1] - 540) / FRESH_ZOOM,
  zoom: FRESH_ZOOM,
  yaw: 0,
  pitch: 0,
  roll: 0,
};

/** The zoom creep over n frames (Camera3D's law), so P1 can start where A2's creep has got to. */
export const creepFactor = (frames: number, creep = FRESH_CREEP) => Math.exp((Math.log(1 + creep / 100) / FPS) * frames);

/** P1's camera base: the fresh camera after FRESH_LEAD frames of creep (zoom about the view centre). */
export const P1_BASE: Cam3 = { ...FRESH_CAM, zoom: FRESH_ZOOM * creepFactor(FRESH_LEAD) };

/** A stage rect to the screen for a square camera pose (yaw and pitch 0; the morphs happen at rest). */
export function toScreen(cam: Cam3, r: Rect): Rect {
  const rr = (cam.roll * Math.PI) / 180;
  const map = (x: number, y: number): [number, number] => {
    const dx = (x - cam.x) * cam.zoom;
    const dy = (y - cam.y) * cam.zoom;
    return [960 + dx * Math.cos(rr) - dy * Math.sin(rr), 540 + dx * Math.sin(rr) + dy * Math.cos(rr)];
  };
  const [x0, y0] = map(r.x, r.y);
  return { x: x0, y: y0, w: r.w * cam.zoom, h: r.h * cam.zoom };
}

/** The hover point on the fresh page's byline item (P1 V11), and where the cursor comes from. */
export const HOVER_AT = 10;
export const CURSOR_FROM: [number, number] = [bcx + 90, bcy + 140];
export const CURSOR_HOVER: [number, number] = [bcx + 8, bcy + 4];

/**
 * The cursor's path to the byline item, on a clock where P1's frame 0 is `p1Zero` (0 in P1; A2 passes its fresh shot's
 * frame of P1's start), so both scenes draw the same cursor at the seam.
 */
export function freshCursor(p1Zero: number, click?: number): CursorPoint[] {
  const pts: CursorPoint[] = [
    { frame: p1Zero - FRESH_LEAD, x: CURSOR_FROM[0], y: CURSOR_FROM[1] },
    { frame: p1Zero + HOVER_AT, x: CURSOR_HOVER[0], y: CURSOR_HOVER[1], cursor: "pointer", travel: 14 },
  ];
  if (click !== undefined) pts.push({ frame: p1Zero + click, x: CURSOR_HOVER[0], y: CURSOR_HOVER[1], cursor: "pointer", click: true });
  return pts;
}
