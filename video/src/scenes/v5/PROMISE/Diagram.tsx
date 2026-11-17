import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../../brand/icons";
import { SLIP_UNIT } from "../../../brand/tokens";
import { EASE, tween } from "../../../lib/time";
import { Camera3D, MaskLine, PageOverCode, Stage, type Cam3Key, type PageOverCodeProps } from "../../../v4/kit";
import { BRAND, DAY, elevAt, FONT } from "../../../v4/look";
import { pageRects, type PageTwinProps } from "../../../v4/twins";
import { PROMISE_T as T } from "./timing";

/**
 * PROMISE, part 2 (the S06 tail and S07): the Confluence page, then "the page over its code" (R6 technique 4, the kit's
 * PageOverCode), one shot. Round 2: plain at every step, and the flag is the focal moment.
 *
 *   105  cut on the beat after the logo's 3 s to the runbook over the dark layer that holds what it describes, square and
 *        settled, labelled "Confluence" as the word is said; "Atlassian's wiki" follows the label on its words
 *   180  (one framing, labels at 28 px or more) on "code" a window opens around ./scripts/rollback.sh and a pin drops to
 *        the script, on "Jira work" the same for PAY-6
 *   249  on "changes" the script slips underneath, amber, "renamed" (no PR before the voice introduces it); the windows
 *        close, the Steps band takes the amber, and the camera goes up with it, big, onto the byline: it turns
 *        "Possibly stale · Doc Drift" on "flags the page" (the diagram's focal moment)
 *   304  back out to the page's head and the readers: "People" on "people", "AI agents" on "AI agents"
 *   375  "until someone checks": a person lands beside the byline's label, and the person's check on "checks"; LOOP
 *        rewinds from here
 */

const PAGE7: PageTwinProps = { world: "day", k: 1.5, x: 120, y: 150 };
const POC: PageOverCodeProps = {
  page: PAGE7,
  codeAt: T.codeAt,
  jiraAt: T.jiraAt,
  slipAt: T.slipAt,
  closeAt: T.closeAt,
  bandAt: T.bandAt,
  bylineAt: T.bylineAt,
  openDur: T.openDur,
  code: { note: "renamed" },
};
/** The byline badge once it reads "Possibly stale · Doc Drift": one slip unit out of line, its trace at home. */
const BADGE = pageRects({ ...PAGE7, byline: { kind: "dds", state: "possibly_stale" } }).badge;
const BADGE_X1 = BADGE.x + BADGE.w * (1 + SLIP_UNIT);
const BYLINE_CY = BADGE.y + BADGE.h / 2;

// ---------------------------------------------------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------------------------------------------------

/** One framing from the label down to the windows' rows: the anchored words and rows at 28 px or more. */
const PAGE_CAM = { x: 642, y: 490, zoom: 1.2, yaw: 0, pitch: 0 };
/** The flag, big: the title and the byline fill the frame (the badge's words at about 47 px). */
const FLAG_CAM = { x: BADGE.x + (BADGE_X1 - BADGE.x) / 2, y: BYLINE_CY - 4, zoom: 2.4 };
/** The page's head and the readers' column on its right. */
const READERS_CAM = { x: 880, y: 430, zoom: 1.28 };
const KEYS7: Cam3Key[] = [
  { at: T.pageCut, dur: 0, to: PAGE_CAM },
  { at: T.bandAt + 2, dur: 14, to: FLAG_CAM, ease: EASE.expoOut },
  { at: T.pullOut, dur: 16, to: READERS_CAM, ease: EASE.expoInOut },
];

// ---------------------------------------------------------------------------------------------------------------------
// "Confluence", "Atlassian's wiki": the page's label
// ---------------------------------------------------------------------------------------------------------------------

/** The label leaves as the windows open (it has been said; it never shows half-cut at the flag's frame edge). */
const PageLabel: React.FC = () => {
  const frame = useCurrentFrame();
  const out = tween(frame, T.codeAt - 14, T.codeAt - 6, 1, 0, EASE.linear);
  if (out <= 0) return null;
  return (
  <div style={{ position: "absolute", left: PAGE7.x! + 6, top: PAGE7.y! - 84, display: "flex", alignItems: "center", gap: 20, opacity: out }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 66,
        padding: "0 26px 0 20px",
        borderRadius: 16,
        background: DAY.surface,
        boxShadow: elevAt(1),
        fontFamily: FONT.sans,
        fontWeight: 600,
        fontSize: 40,
        color: DAY.text,
        whiteSpace: "nowrap",
      }}
    >
      <Icon name="page" size={36} color={DAY.text} />
      Confluence
    </div>
    <MaskLine at={T.gloss}>
      <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 36, lineHeight: 1.3, color: DAY.textMuted, whiteSpace: "nowrap" }}>Atlassian’s wiki</div>
    </MaskLine>
  </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The readers: "People" and "AI agents" (round 2: no product names before the voice introduces them)
// ---------------------------------------------------------------------------------------------------------------------

const CHIP = { x: 1160, h: 96, gap: 20, tile: 60 } as const;
const CHIP_Y0 = BYLINE_CY - CHIP.h / 2;

const ReaderChip: React.FC<{ icon: IconName; label: string; at: number; i: number }> = ({ icon, label, at, i }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const up = tween(frame, at, at + 12, 0, 1, EASE.expoOut);
  return (
    <div
      style={{
        position: "absolute",
        left: CHIP.x,
        top: CHIP_Y0 + i * (CHIP.h + CHIP.gap),
        height: CHIP.h,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "0 34px 0 18px",
        borderRadius: 26,
        background: DAY.surface,
        boxShadow: elevAt(1 + 2 * up),
        opacity: Math.min(1, (frame - at + 1) / 3),
        transform: `translateY(${((1 - up) * 24).toFixed(2)}px)`,
        fontFamily: FONT.sans,
        fontSize: 36,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: DAY.text,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "grid", placeItems: "center", width: CHIP.tile, height: CHIP.tile, borderRadius: 17, background: DAY.surfaceSunk }}>
        <Icon name={icon} size={34} color={DAY.text} />
      </span>
      {label}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// "until someone checks": a person beside the byline's label, then its check
// ---------------------------------------------------------------------------------------------------------------------

const PERSON = 72;

const PersonCheck: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.person) return null;
  const p = tween(frame, T.person, T.person + 12, 0, 1, EASE.expoOut);
  const c = tween(frame, T.check, T.check + 8, 0, 1, EASE.expoOut);
  const badge = 36;
  return (
    <div
      style={{
        position: "absolute",
        left: BADGE_X1 + 26,
        top: BYLINE_CY - PERSON / 2,
        width: PERSON,
        height: PERSON,
        opacity: Math.min(1, (frame - T.person + 1) / 3),
        transform: `translateY(${((1 - p) * 18).toFixed(2)}px)`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: DAY.surfaceSunk, boxShadow: `inset 0 0 0 2px ${DAY.line}, ${elevAt(1)}`, display: "grid", placeItems: "center" }}>
        <Icon name="user" size={40} color={DAY.text} />
      </div>
      {frame >= T.check ? (
        <div
          style={{
            position: "absolute",
            right: -badge * 0.3,
            bottom: -badge * 0.25,
            width: badge,
            height: badge,
            borderRadius: "50%",
            background: BRAND.current,
            boxShadow: `0 0 0 3px ${DAY.surface}`,
            display: "grid",
            placeItems: "center",
            transform: `scale(${(0.4 + 0.6 * c).toFixed(4)})`,
          }}
        >
          <Icon name="check" size={24} color={DAY.surface} stroke={2.6} />
        </div>
      ) : null}
    </div>
  );
};

export const DiagramWorld: React.FC = () => (
  <Stage world="day" motif="grid" light={["38%", "36%"]} grid={{ opacity: 0.035 }}>
    <Camera3D keys={KEYS7} base={PAGE_CAM} seed="pm-page" creep={1}>
      <PageLabel />
      <PageOverCode {...POC} />
      <ReaderChip icon="user" label="People" at={T.people} i={0} />
      <ReaderChip icon="comment" label="AI agents" at={T.agents} i={1} />
      <PersonCheck />
    </Camera3D>
  </Stage>
);
