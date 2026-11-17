import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../../brand/icons";
import { SLIP_UNIT } from "../../../brand/tokens";
import { EASE, tween } from "../../../lib/time";
import { Camera3D, PageOverCode, pageOverCodeRects, Stage, type Cam3Key, type PageOverCodeProps } from "../../../v4/kit";
import { DAY, elevAt, FONT, ink } from "../../../v4/look";
import { pageRects, type PageTwinProps } from "../../../v4/twins";
import { PROMISE_T as T } from "./timing";

/**
 * PROMISE, part 2 (S07): the one diagram, "the page over its code" (R6 technique 4, the kit's PageOverCode), one hold.
 *
 *   165  cut on the beat: the runbook swings square over the dark layer that holds what it describes
 *   180  on "code" a window opens in the page around ./scripts/rollback.sh and a pin drops to the script; on "Jira work"
 *        the same for PAY-6
 *   249  on "changes" the script slips underneath, amber, "renamed in PR #482", while the page's words do not move;
 *        the windows close, the Steps band takes the amber and hands it up to the byline: "Possibly stale · Doc Drift"
 *        on "flags the page", with one push toward it
 *   321  on "people" the People chip lights beside the byline; on "AI agents" the Rovo agent and Coding assistant chips,
 *        each showing "Possibly stale" (no amber: the byline holds the shot's one amber)
 *   394  on "checks" an empty check waits beside the byline's label; LOOP rewinds from here ("Rewind a week")
 */

const PAGE7: PageTwinProps = { world: "day", k: 1.5, x: 120, y: 70 };
const POC: PageOverCodeProps = {
  page: PAGE7,
  codeAt: T.codeAt,
  jiraAt: T.jiraAt,
  slipAt: T.slipAt,
  closeAt: T.closeAt,
  bandAt: T.bandAt,
  bylineAt: T.bylineAt,
  rise: [T.cut, T.cut + 16],
  openDur: T.openDur,
};
const R7 = pageOverCodeRects(POC);
/** The byline badge once it reads "Possibly stale · Doc Drift" (wider than "Verified · Doc Drift"). */
const BADGE_STALE = pageRects({ ...PAGE7, byline: { kind: "dds", state: "possibly_stale" } }).badge;

// ---------------------------------------------------------------------------------------------------------------------
// Camera: the layers apart and turned on the cut, square before the first window; one push toward the byline on "flags"
// ---------------------------------------------------------------------------------------------------------------------

const TURNED = { x: 600, y: 520, zoom: 1.0, yaw: -12, pitch: 8, roll: 0 };
/** The page and its dark layer, centred. */
const PAGE_CAM = { x: 620, y: 540, zoom: 1.06, yaw: 0, pitch: 0 };
/**
 * Up toward the byline as the amber passes up the page (just after the Steps band takes it, once the windows are shut),
 * nearly settled as the byline turns: the page's head, the byline, and the column where the readers will light.
 */
const BYLINE_CAM = { x: 870, y: 380, zoom: 1.15 };
const KEYS7: Cam3Key[] = [
  { at: T.cut, dur: 0, to: TURNED },
  { at: T.cut, dur: 15, to: PAGE_CAM, ease: EASE.expoOut },
  { at: T.bandAt + 2, dur: 14, to: BYLINE_CAM, ease: EASE.expoOut },
];

// ---------------------------------------------------------------------------------------------------------------------
// The readers: People, Rovo agent, Coding assistant
// ---------------------------------------------------------------------------------------------------------------------

const CHIP = { x: 1160, y: 196, w: 400, h: 100, gap: 16, tile: 58 } as const;

const ReaderChip: React.FC<{ icon: IconName; label: string; at: number; i: number }> = ({ icon, label, at, i }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const up = tween(frame, at, at + 12, 0, 1, EASE.expoOut);
  return (
    <div
      style={{
        position: "absolute",
        left: CHIP.x,
        top: CHIP.y + i * (CHIP.h + CHIP.gap),
        width: CHIP.w,
        height: CHIP.h,
        opacity: Math.min(1, (frame - at + 1) / 3),
        transform: `translateY(${((1 - up) * 24).toFixed(2)}px)`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: 24, background: DAY.surface, boxShadow: elevAt(1 + 2 * up) }} />
      <div
        style={{
          position: "absolute",
          left: 21,
          top: (CHIP.h - CHIP.tile) / 2,
          width: CHIP.tile,
          height: CHIP.tile,
          borderRadius: 16,
          background: DAY.surfaceSunk,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name={icon} size={32} color={DAY.text} />
      </div>
      <div style={{ position: "absolute", left: 21 + CHIP.tile + 18, top: 15, fontFamily: FONT.sans, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 31, fontWeight: 600, lineHeight: "38px", letterSpacing: "-0.01em", color: DAY.text }}>{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 25, fontWeight: 500, lineHeight: "32px", color: DAY.text }}>
          <Icon name="slip" size={25} color={DAY.text} />
          Possibly stale
        </div>
      </div>
    </div>
  );
};

/** The empty check beside the byline's label: someone has yet to check (it waits; LOOP rewinds from here). */
const EmptyCheck: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const p = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
  const size = 40;
  return (
    <div
      style={{
        position: "absolute",
        // after the flagged badge, which sits one slip unit out of line (its trace at home)
        left: BADGE_STALE.x + BADGE_STALE.w * (1 + SLIP_UNIT) + 22,
        top: BADGE_STALE.y + BADGE_STALE.h / 2 - size / 2,
        width: size,
        height: size,
        borderRadius: 10,
        background: DAY.surface,
        boxShadow: `inset 0 0 0 3px ${ink(0.42)}, ${elevAt(1)}`,
        opacity: Math.min(1, (frame - at + 1) / 3),
        transform: `scale(${(0.6 + 0.4 * p).toFixed(4)})`,
      }}
    />
  );
};

export const DiagramWorld: React.FC = () => (
  <Stage world="day" motif="grid" light={["38%", "36%"]} grid={{ opacity: 0.035 }}>
    <Camera3D keys={KEYS7} base={PAGE_CAM} seed="pm-page" creep={1}>
      <PageOverCode {...POC} />
      <ReaderChip icon="user" label="People" at={T.people} i={0} />
      <ReaderChip icon="comment" label="Rovo agent" at={T.agents} i={1} />
      <ReaderChip icon="terminal" label="Coding assistant" at={T.agents + 2} i={2} />
      <EmptyCheck at={T.check} />
    </Camera3D>
  </Stage>
);

export { R7 };
