import React from "react";
import { EASE } from "../../lib/time";
import { Camera3D, Layer, Stage, type Cam3Key } from "../../v4/kit";
import { AlertCard, ALERT } from "./AlertCard";
import { ClockRoll } from "./ClockRoll";

/**
 * The 3 a.m. station (A1 V02, again in A4 V24): the huge mono clock and the alert card on the lit Night ground. Stage
 * coordinates (film px before the camera). The clock sits on a slightly deeper plane (0.9) than the card, so camera
 * moves separate them in depth.
 *
 * Camera (the same in both scenes, so the rhyme is felt): it opens framed on the clock alone, a little close; as the
 * card lifts it tilts down and eases back to the whole composition, then pushes in slowly until the shot leaves.
 */
export const CLOCK_SIZE = 300;
/** Clock block (the drums' windows), stage px. */
export const CLOCK_BOX = { x: (1920 - 2.82 * CLOCK_SIZE) / 2, y: 104, w: 2.82 * CLOCK_SIZE, h: 1.22 * CLOCK_SIZE } as const;
/** Alert card top-left, stage px. */
export const CARD_POS = { x: (1920 - ALERT.w) / 2, y: 548 } as const;

const ON_CLOCK = { x: 960, y: CLOCK_BOX.y + CLOCK_BOX.h / 2 + 40, zoom: 1.12 };
const WHOLE = { x: 960, y: 532, zoom: 1 };

/** Camera keys: on the clock, the tilt down as the card lifts (`tiltAt`), then the slow push until `outAt`. */
export function alertKeys(tiltAt: number, outAt: number): Cam3Key[] {
  const land = tiltAt + 24;
  return [
    { at: tiltAt, dur: 24, to: WHOLE, ease: EASE.expoInOut },
    { at: land, dur: Math.max(12, outAt - land), to: { zoom: 1.04 }, ease: EASE.standard },
  ];
}

export const AlertStation: React.FC<{
  /** The clock rolls in from `clockAt`; its last drum lands on `clockLand`. */
  clockAt: number;
  clockLand: number;
  /** Then it ticks from this time to 03:07 over `clockTick` (A4: "03:06", the minute turns on "3"). */
  clockFrom?: string;
  clockTick?: { at: number; land: number };
  cardAt: number;
  rateAt: number;
  /** The camera tilts from the clock to the whole composition here. */
  tiltAt: number;
  /** The shot leaves here (the push runs until then). */
  outAt: number;
  seed?: string;
}> = ({ clockAt, clockLand, clockFrom, clockTick, cardAt, rateAt, tiltAt, outAt, seed = "alert" }) => (
  <Stage world="night" motif="grid" light={["50%", "40%"]} grid={{ opacity: 0.045, mask: "radial-gradient(70% 70% at 50% 52%, #000 0%, rgba(0,0,0,0.45) 50%, transparent 88%)" }}>
    <Camera3D keys={alertKeys(tiltAt, outAt)} base={ON_CLOCK} seed={seed}>
      <Layer depth={0.9}>
        <div style={{ position: "absolute", left: CLOCK_BOX.x, top: CLOCK_BOX.y }}>
          <ClockRoll at={clockAt} land={clockLand} from={clockFrom} tick={clockTick} size={CLOCK_SIZE} />
        </div>
      </Layer>
      <AlertCard x={CARD_POS.x} y={CARD_POS.y} at={cardAt} rateAt={rateAt} />
    </Camera3D>
  </Stage>
);
