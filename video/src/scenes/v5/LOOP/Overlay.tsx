import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, tween } from "../../../lib/time";
import { DAY, FONT, HonestClock, InkLabel, LabelSwap, MaskLine, SpeedChip } from "../../../v4/kit";
import { PAGE_CAM_S11 } from "./geom";
import { pageLabelOnScreen } from "./shots";
import { clockAt, clockPeak, clockRate, T } from "./timing";

/**
 * The real block's tag, once for the whole block ("Real product · demo site · Nov 13"), and beside it a small context
 * label naming the tool on screen (Confluence, Bitbucket, Confluence), which swaps with the world.
 */
export const BlockTag: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.real) return null;
  // the context label: Confluence; it leaves on the cut into Bitbucket and lands again on "Bitbucket"; Confluence again
  // as the page opens out of the clock
  const away = frame >= T.cut2 && frame < T.bitbucketChip;
  const tool =
    frame < T.cut2 ? (
      "Confluence"
    ) : frame < T.grow2 + 10 ? (
      "Bitbucket"
    ) : (
      <LabelSwap from="Bitbucket" to="Confluence" at={T.grow2 + 10} size={26} weight={500} />
    );
  const toolIn = frame < T.cut2 ? 1 : tween(frame, T.bitbucketChip, T.bitbucketChip + 4, 0, 1, EASE.linear);
  const toolOut = tween(frame, T.cut2, T.cut2 + 3, 1, 0, EASE.linear);
  return (
    <div style={{ position: "absolute", left: 64, top: 56, display: "flex", gap: 12, opacity: tween(frame, T.real, T.real + 4, 0, 1, EASE.linear) }}>
      <InkLabel icon="eye" size={26}>
        Real product · demo site · Nov 13
      </InkLabel>
      {away && toolOut <= 0.01 ? null : (
        <div style={{ opacity: away ? toolOut : toolIn }}>
          <InkLabel size={26}>{away ? "Confluence" : tool}</InkLabel>
        </div>
      )}
    </div>
  );
};

/**
 * The honest clock from the merge click to the flag, carried across the reveal (it is the object the page opens out
 * of), and the speed label while a ramp runs.
 */
export const MergeClock: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.merge + 1 || frame >= T.cut3) return null;
  const peak = clockPeak(frame);
  const rate = clockRate(frame);
  const chip = peak >= 3 ? tween(rate, 1.6, 2.4, 0, 1, EASE.linear) : 0;
  return (
    <>
      <HonestClock
        at={T.merge + 1}
        value={clockAt(frame)}
        label="Since the merge click"
        swap={{ at: T.flag + 1, label: "Merge to flag" }}
        note={{ at: T.note, text: "Measured on the demo site, Nov 13" }}
      />
      {chip > 0.01 ? (
        <div style={{ opacity: chip }}>
          <SpeedChip rate={peak} />
        </div>
      ) : null}
    </>
  );
};

/** The clock card's rect on screen (the HonestClock defaults: x 64, y 790, 470 wide; 194 tall before its note). */
export const CLOCK_RECT = { x: 64, y: 790, w: 470, h: 194 };

/** "it may be out of date", set under the page's label as it is said (the functional voice: a mask line). */
export const Gloss: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.gloss || frame >= T.cut3) return null;
  const label = pageLabelOnScreen(frame, PAGE_CAM_S11);
  return (
    <div style={{ position: "absolute", left: label.x - 2, top: label.y + label.h + 22 }}>
      <MaskLine at={T.gloss} style={{ fontFamily: FONT.sans, fontSize: 44, lineHeight: "54px", fontWeight: 500, color: DAY.text, whiteSpace: "nowrap" }}>
        it may be out of date
      </MaskLine>
    </div>
  );
};
