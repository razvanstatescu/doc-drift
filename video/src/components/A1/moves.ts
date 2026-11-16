import type { Cam3, Cam3Key } from "../../v4/kit";

/**
 * A camera travel that turns in 3D on the way and lands square (V4.md M2: yaw and pitch only while the camera
 * travels; read square). Two keys meet at the midpoint (the geometric mean of the zooms, the mean of x and y): the
 * first eases in (cubic), the second eases out (cubic), so the speed matches where they meet, and the turn peaks
 * there and is back to 0 on landing.
 */
const cubicIn = (t: number) => t * t * t;
const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3);

type Pose = Pick<Cam3, "x" | "y" | "zoom">;

export function turnTravel(at: number, dur: number, from: Pose, to: Pose, turn: { yaw?: number; pitch?: number }): Cam3Key[] {
  const h = Math.max(2, Math.round(dur / 2));
  const mid = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
    zoom: Math.sqrt(from.zoom * to.zoom),
    yaw: turn.yaw ?? 0,
    pitch: turn.pitch ?? 0,
  };
  return [
    { at, dur: h, to: mid, ease: cubicIn },
    { at: at + h, dur: Math.max(2, dur - h), to: { ...to, yaw: 0, pitch: 0 }, ease: cubicOut },
  ];
}
