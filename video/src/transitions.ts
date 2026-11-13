import { DAY } from "./brand/tokens";
import type { SlipCutOptions } from "./motion/slip";

/**
 * Cuts BETWEEN scenes (kit agent and director). Key = the OUTGOING scene id. Main holds that scene's last frame for
 * `frames` more frames and splits it into the slip cut's three bands ON TOP of the next scene's first frames, so the
 * next scene still starts exactly on its timeline frame (audio sync). Every other boundary is a hard cut; cuts inside
 * a scene are the scene's own business (<SlipCut>, <Whip>).
 *
 * Consequences for builders: the outgoing scene should end on its final pose (its last frame is what slips), and the
 * incoming scene's first `frames` frames are seen through the bands, so it should open already composed.
 */
export type SceneCut = {
  kind: "slip";
  frames: number;
  /** An effect from sfx.json whose peak lands `at` frames into the cut (default: when the band lands). */
  sfx?: { id: string; at?: number; gainDb?: number };
} & SlipCutOptions;

export const CUTS: Record<string, SceneCut> = {
  // A1 to A2: the film's change of light. Since v1 the PICTURE of this cut lives in A2's first frames
  // (src/components/A2/DaySlipReveal, fed A1's frozen last frame): the frame is already split on A2's first frame
  // (markers.daySlip, the score's lift), the Paper world is behind the slipped band, and the bands clear by frame 6.
  // The kit's tail could only start closed and end in a hard cut. So this entry carries the SOUND only: `frames: 0`
  // adds no picture tail, and the slip's latch lands on daySlip with the band and the lift (the slide part of the
  // sound runs over A1's last frames, at film level, so nothing is clipped).
  A1: { kind: "slip", frames: 0, traceColor: DAY.trace, sfx: { id: "slip", at: 0 } },
};
