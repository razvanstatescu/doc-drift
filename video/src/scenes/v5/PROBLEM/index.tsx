import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../../../audio/Sfx";
import { Icon } from "../../../brand/icons";
import { AlertStation, CLOCK_SIZE } from "../../../components/A1/AlertStation";
import { landFor, TRAVEL } from "../../../components/A1/ClockRoll";
import { turnTravel } from "../../../components/A1/moves";
import { ROLLBACK_CMD, ZSH_ERROR } from "../../../components/A1/runbook";
import { SHELL, ShellTerminal } from "../../../components/A1/ShellTerminal";
import { clamp, EASE, tween } from "../../../lib/time";
import { getScene } from "../../../lib/timeline";
import { cam3At, Camera3D, cameraToMatch, GrowReveal, KineticLine, PushSwap, screenRectOf, Stage, type Cam3Key } from "../../../v4/kit";
import { FONT, NIGHT, type Rect } from "../../../v4/look";
import {
  AgentPanelTwin,
  agentPanelHeightAt,
  agentPanelRects,
  PageTwin,
  pageRects,
  textWidth,
  type AgentPanelTwinProps,
  type PageTwinProps,
} from "../../../v4/twins";
import { CHANGE_H, CHANGE_W, ChangeCard } from "./ChangeCard";

/**
 * PROBLEM (v5, film 0 to 480, S01 to S05, Night). V5.md section 5. Five shots, medium pace; the dead path
 * ./scripts/rollback.sh is the object carried through the section. Local frames = film frames; all from timeline.json.
 *
 *   0       cold open on sound: the pager tones over the Night ground, then 03:07 rolls in; its last drum lands on "3";
 *           the card lifts on "Payments" and the rate rolls to 14% before "down"; the camera tilts down to it   (S01)
 *   120     cut on the bar to the runbook, labelled "A page in Confluence"; on "run" the camera travels to step 2 and
 *           the Mist band (with its Current underline) marks ./scripts/rollback.sh on "rollback script"          (S02)
 *   200     carry cut on the dead path: the terminal grows out of it, the command runs and fails on "script"; the
 *           change card lifts and its new path slips one unit in amber on "renamed" (the one amber) with one push;
 *           "6 days ago" on "last week"                                                                            (S03)
 *   282     carry cut on the change card: the page's head pushes in, the card flies to hang outside the page; the
 *           Mist band on "Reviewed 34 days ago" at "review date"; "A review date can't see a code change." sets beside,
 *           word by word with the voice                                                                           (S04)
 *   390     cut on "AI" to the generic AI assistant, already asked; the answer streams step 2's old command, the source
 *           chip lands, the command is underlined on "old step" with one push; the score's beat of silence      (S05)
 *   480     PROMISE opens on this frame, frozen: the dead path carried into Day, then the slip cut
 */
const sc = getScene("PROBLEM");

export const PROBLEM_T = {
  // S01
  /**
   * The drums are already rolling (smeared) on frame 0, under the pager's tones: never a still wrong time. -6 (not -2,
   * -4 or -8) keeps the digits passing through the clock's right half under the 2-flash target (flashcheck: 4 in 1 s).
   */
  clockAt: -6,
  clockLand: landFor(-6, sc.wordAt("S01", "3") - 2, TRAVEL[3], CLOCK_SIZE),
  cardAt: sc.wordAt("S01", "payments") - 7,
  rateAt: sc.wordAt("S01", "payments") - 4,
  tiltAt: sc.wordAt("S01", "3") + 2,
  // S02
  cut1: sc.snap(sc.cue("S02")),
  travel: sc.wordAt("S02", "run") - 6,
  /** The Mist band and its underline grow across the path in about 7 frames: landed as "rollback" is said. */
  mark: sc.wordAt("S02", "rollback") - 9,
  // S03: the carry into the terminal (grow reveal), the run and the error, the change card
  carry1: sc.wordAt("S03", "that") - 13,
  carry1Dur: 14,
  enter: sc.wordAt("S03", "that"),
  error: sc.wordAt("S03", "script") - 4,
  cardIn: sc.wordAt("S03", "was") - 4,
  slip: sc.wordAt("S03", "renamed") - 6,
  push: sc.wordAt("S03", "renamed") - 12,
  ago: sc.wordAt("S03", "last") - 8,
  // S04: the carry of the card (locked push) into the page's head
  carry2: sc.wordAt("S04", "the") - 5,
  carry2Dur: 12,
  bylineMark: sc.wordAt("S04", "review") - 8,
  // S05
  cut2: sc.snap(sc.wordAt("S05", "ai")),
  answer: sc.wordAt("S05", "reads") - 4,
  source: sc.wordAt("S05", "old") + 6,
  /** The underline crosses the whole command (about 8 frames to land within 4 px). */
  underline: sc.wordAt("S05", "old") - 10,
  push2: sc.wordAt("S05", "old") - 12,
  end: sc.durationInFrames,
};
const T = PROBLEM_T;

const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

// ---------------------------------------------------------------------------------------------------------------------
// Shot 1 · the alert (S01): v4's clock and card.
// ---------------------------------------------------------------------------------------------------------------------

const AlertShot: React.FC = () => (
  <AlertStation clockAt={T.clockAt} clockLand={T.clockLand} cardAt={T.cardAt} rateAt={T.rateAt} tiltAt={T.tiltAt} outAt={T.cut1} seed="p-alert" />
);

// ---------------------------------------------------------------------------------------------------------------------
// Shot 2 · the runbook (S02): the Night page twin, "A page in Confluence", step 2 marked.
// ---------------------------------------------------------------------------------------------------------------------

const PAGE2: PageTwinProps = {
  world: "night",
  doc: "runbook",
  y: 120,
  byline: { kind: "reviewed", text: "Reviewed 34 days ago" },
  mark: { token: "./scripts/rollback.sh", kind: "mist", at: T.mark },
};
const R2 = pageRects(PAGE2);
const TOK2 = R2.tokens["./scripts/rollback.sh"] as Rect;
/** The head (label, title, byline, table) at 1.55x, then a straight travel down to step 2 at the same zoom. */
const HEAD2 = { x: 960, y: 362, zoom: 1.55 };
const STEP2 = { x: 1000, y: 800, zoom: 1.55 };
const KEYS2: Cam3Key[] = [{ at: T.cut1, dur: 0, to: HEAD2 }, ...turnTravel(T.travel, 18, HEAD2, STEP2, { pitch: 5 })];
const OPTS2 = { base: HEAD2, seed: "p-page" } as const;

/** A small context label above the page (V5.md: "A page in Confluence"). */
const ContextLabel: React.FC<{ x: number; y: number; text: string }> = ({ x, y, text }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      display: "flex",
      alignItems: "center",
      gap: 12,
      height: 50,
      padding: "0 20px 0 16px",
      borderRadius: 14,
      background: NIGHT.surfaceSunk,
      boxShadow: `inset 0 0 0 1.5px ${NIGHT.line}`,
      fontFamily: FONT.sans,
      fontWeight: 500,
      fontSize: 28,
      color: NIGHT.textMuted,
      whiteSpace: "nowrap",
    }}
  >
    <Icon name="page" size={28} color={NIGHT.textMuted} />
    {text}
  </div>
);

/** The Current underline under a token (with the Night Mist band, as on Day: V4 review N-4). */
const TokenUnderline: React.FC<{ r: Rect; at: number }> = ({ r, at }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y + r.h + 1, width: r.w * tween(frame, at, at + 10, 0, 1, EASE.expoOut), height: 4, borderRadius: 2, background: NIGHT.link }} />
  );
};

const PageShot: React.FC = () => (
  <Stage world="night" motif="grid" light={["50%", "32%"]} grid={{ opacity: 0.04 }}>
    <Camera3D keys={KEYS2} {...OPTS2}>
      <ContextLabel x={R2.card.x + 6} y={R2.card.y - 70} text="A page in Confluence" />
      <PageTwin {...PAGE2} />
      <TokenUnderline r={TOK2} at={T.mark + 2} />
    </Camera3D>
  </Stage>
);

// ---------------------------------------------------------------------------------------------------------------------
// Shot 3 · the terminal (S03): it grows out of the dead path; the command fails; the change card.
// ---------------------------------------------------------------------------------------------------------------------

const TERM = { x: 270, y: 250 } as const;
/** The command's path in the terminal (stage px): after "% ", Spline Sans Mono 40 at -0.01 em. */
const ADV3 = 0.6 * SHELL.size - 0.01 * SHELL.size;
const TOK3: Rect = { x: TERM.x + SHELL.padX + 2 * ADV3, y: TERM.y + SHELL.titleH + SHELL.padY, w: 21 * ADV3, h: SHELL.line };
const CARD3 = { x: Math.round((1920 - CHANGE_W) / 2), y: 568 } as const;
const REST3 = { x: 960, y: 470, zoom: 1 };
/** The push on "renamed": the command, the error line and the whole change card, 1.3x. */
const PUSH3 = { x: 960, y: (TOK3.y + CARD3.y + CHANGE_H) / 2, zoom: 1.3 };

/** Shot 2's token on screen at the seam, and the terminal camera that puts its own path exactly there. */
const SEAM1_RECT = screenRectOf(cam3At(T.carry1, KEYS2, OPTS2), TOK2);
const MATCH3 = cameraToMatch(SEAM1_RECT, TOK3);
const KEYS3: Cam3Key[] = [
  { at: T.carry1, dur: 0, to: MATCH3 },
  { at: T.carry1 + T.carry1Dur, dur: 22, to: REST3, ease: EASE.expoInOut },
  { at: T.push, dur: 14, to: PUSH3, ease: EASE.expoOut },
];
const OPTS3 = { base: MATCH3, seed: "p-term", float: 2 } as const;

const TerminalShot: React.FC = () => (
  <Stage world="night" motif="none" light={["50%", "44%"]}>
    <Camera3D keys={KEYS3} {...OPTS3}>
      <ShellTerminal x={TERM.x} y={TERM.y} at={T.carry1 - 20} cmd={ROLLBACK_CMD} typeAt={T.carry1 - 20} typeDur={1} error={ZSH_ERROR} errorAt={T.error} />
      <ChangeCard x={CARD3.x} y={CARD3.y} at={T.cardIn} slipAt={T.slip} agoAt={T.ago} />
    </Camera3D>
  </Stage>
);

// ---------------------------------------------------------------------------------------------------------------------
// Shot 4 · the page's review date (S04): the page's head on the left, the card hanging outside it, the statement.
// ---------------------------------------------------------------------------------------------------------------------

const PAGE4: PageTwinProps = { world: "night", doc: "runbook", x: 48, y: 74, byline: { kind: "reviewed", text: "Reviewed 34 days ago" } };
const R4 = pageRects(PAGE4);
const REST4 = { x: 960, y: 540, zoom: 1 };
const KEYS4: Cam3Key[] = [{ at: T.carry2, dur: 0, to: REST4 }];
const OPTS4 = { base: REST4, seed: "p-date" } as const;
/** The card's slot in this world: hanging outside the page (a clear gap from its edge), lower right, at half size. */
const CARD4_SCALE = 0.5;
const CARD4: Rect = { x: 1920 - 52 - CHANGE_W * CARD4_SCALE, y: 708, w: CHANGE_W * CARD4_SCALE, h: CHANGE_H * CARD4_SCALE };
/** The statement beside the page: three lines, measured so the longest fits the zone. */
const STATE_LINES = ["A review date", "can’t see a", "code change."];
const STATE_X = R4.card.x + R4.card.w + 70;
const STATE_W = 1920 - 60 - STATE_X;
const STATE_SIZE = Math.min(96, Math.floor(STATE_W / Math.max(...STATE_LINES.map((l) => textWidth(l, { size: 1, weight: 600, tracking: -0.028 })))));
const STATE_LH = Math.round(STATE_SIZE * 1.06);
const STATE_TOP = 150;
/**
 * The statement's words land (within 4 px, about 3 frames into their rise) 2 frames before their spoken words; "A review
 * date" lands as "date" is said (the byline carries "review date" itself), then the voice's own words.
 */
const S04 = sc.line("S04").words;
const wordFrom = (prefix: string, nth = 0) => {
  const m = S04.filter((w) => w.text.toLowerCase().replace(/[^a-z']/g, "").startsWith(prefix));
  return (m[Math.min(nth, m.length - 1)] ?? S04[0]).from;
};
const LAND = (f: number) => f - 2 - 3;
const STATE_CUES: number[][] = [
  [LAND(wordFrom("date")), LAND(wordFrom("date") + 3), LAND(wordFrom("date") + 6)],
  [LAND(wordFrom("can")), LAND(wordFrom("see")), LAND(wordFrom("a", 1))],
  [LAND(wordFrom("code")), LAND(wordFrom("change"))],
];

/** The Night Mist band and its Current underline on the reviewed line ("Reviewed 34 days ago"), on "review date". */
const BylineMark: React.FC<{ r: Rect; at: number }> = ({ r, at }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const p = tween(frame, at, at + 10, 0, 1, EASE.expoOut);
  return (
    <>
      <div style={{ position: "absolute", left: r.x - 4, top: r.y + 2, width: (r.w + 8) * p, height: r.h - 4, borderRadius: 8, background: "rgba(214, 228, 231, 0.17)" }} />
      <div style={{ position: "absolute", left: r.x, top: r.y + r.h + 2, width: r.w * tween(frame, at + 2, at + 12, 0, 1, EASE.expoOut), height: 4, borderRadius: 2, background: NIGHT.link }} />
    </>
  );
};

const BylineShot: React.FC = () => (
  <Stage world="night" motif="grid" light={["36%", "30%"]} grid={{ opacity: 0.04 }}>
    <Camera3D keys={KEYS4} {...OPTS4}>
      <PageTwin {...PAGE4} />
      <BylineMark r={R4.badge} at={T.bylineMark} />
      <div style={{ position: "absolute", left: STATE_X, top: STATE_TOP, width: STATE_W }}>
        {STATE_LINES.map((line, i) => (
          <KineticLine key={line} text={line} at={STATE_CUES[i][0]} words={STATE_CUES[i].map((f) => ({ from: f }))} lead={0} size={STATE_SIZE} lineHeight={STATE_LH} world="night" />
        ))}
      </div>
    </Camera3D>
  </Stage>
);

// ---------------------------------------------------------------------------------------------------------------------
// Shot 5 · the generic AI assistant (S05), PROBLEM's final pose.
// ---------------------------------------------------------------------------------------------------------------------

const PANEL: AgentPanelTwinProps = {
  world: "night",
  variant: "generic",
  question: { text: "How do I roll back payments-api?", at: T.cut2, prefilled: true },
  answer: { lines: ["Run the rollback script from the root of the `payments-api` repo.", ROLLBACK_CMD], at: T.answer, cps: 140 },
  source: { text: "Payments rollback runbook", at: T.source },
  x: (1920 - 1360) / 2,
  y: 230,
  width: 1360,
  size: 40,
  elev: 4,
};
const PR5 = agentPanelRects(PANEL);
/** The old command's line, and its dead path (the code run's text, after its 0.28 em padding). */
const CMD5 = PR5.answerLines[PR5.answerLines.length - 1];
const CODE5 = (PANEL.size ?? 40) * 0.88;
export const TOK5: Rect = { x: CMD5.x + 0.28 * CODE5, y: CMD5.y + (CMD5.h - CODE5 * 1.3) / 2, w: 21 * 0.6 * CODE5, h: CODE5 * 1.3 };
const CMD5_W = textWidth(ROLLBACK_CMD, { size: CODE5, mono: true }) + 2 * 0.28 * CODE5;
/** One push on "old step": onto the command, 1.28x, the whole card in frame. */
const PUSH5 = { x: 960, y: CMD5.y + CMD5.h / 2, zoom: 1.28 };
const KEYS5: Cam3Key[] = [
  { at: T.cut2, dur: 0, to: { zoom: 0.98 } },
  { at: T.push2, dur: 14, to: PUSH5, ease: EASE.expoOut },
];
const opts5 = (frame: number) => ({ base: { x: 960, y: PR5.panel.y + agentPanelHeightAt(PANEL, frame) / 2, zoom: 0.98 }, seed: "p-assist" });

/** The dead path's place on screen on PROBLEM's last frame (PROMISE carries it from there). */
export const PROBLEM_LAST_TOKEN: Rect = screenRectOf(cam3At(T.end - 1, KEYS5, opts5(T.end - 1)), TOK5);

/**
 * The assistant shot (S05), the scene's final pose. Exported so PROMISE can open on PROBLEM's frozen last frame
 * (visual only; the sound stays here).
 */
export const ProblemLastShot: React.FC = () => {
  const frame = useCurrentFrame();
  const under = tween(frame, T.underline, T.underline + 10, 0, 1, EASE.expoOut);
  return (
    <Stage world="night" motif="tide" light={["50%", "36%"]} tide={{ top: 850, bottom: 1110, count: 7 }}>
      <Camera3D keys={KEYS5} {...opts5(frame)}>
        <AgentPanelTwin {...PANEL} />
        {frame >= T.underline ? (
          <div style={{ position: "absolute", left: CMD5.x, top: CMD5.y + CMD5.h - 6, width: CMD5_W * under, height: 4, borderRadius: 2, background: NIGHT.link }} />
        ) : null}
      </Camera3D>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The scene: cuts and carries.
// ---------------------------------------------------------------------------------------------------------------------

/** Seam 1: the terminal grows out of the page's dead path (the kit's GrowReveal); the path itself rides on top. */
const Carry1: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <GrowReveal at={T.carry1} dur={T.carry1Dur} from={SEAM1_RECT} darken={0.55} outgoing={<PageShot />} incoming={<TerminalShot />} />
      {frame < T.carry1 + 6 ? (
        // the carried path: the page's marked token, held exactly in place while the terminal opens around it
        <div
          style={{
            position: "absolute",
            left: SEAM1_RECT.x - 6,
            top: SEAM1_RECT.y,
            height: SEAM1_RECT.h,
            padding: "0 6px",
            display: "flex",
            alignItems: "center",
            borderRadius: 8,
            background: "rgba(66, 90, 96, 1)",
            fontFamily: FONT.mono,
            fontSize: SEAM1_RECT.h * (14.5 / 22),
            letterSpacing: "-0.01em",
            color: NIGHT.text,
            whiteSpace: "pre",
            opacity: interpolate(frame, [T.carry1 + 3, T.carry1 + 6], [1, 0], clamp),
          }}
        >
          ./scripts/rollback.sh
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Seam 2 (the kit's PushSwap): the terminal pushes out left, the page's head pushes in, the change card flies to its slot. */
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t });
const Carry2: React.FC = () => {
  const frame = useCurrentFrame();
  const fly = tween(frame, T.carry2 - 2, T.carry2 + T.carry2Dur + 4, 0, 1, EASE.expoInOut);
  const fromR = screenRectOf(cam3At(T.carry2 - 2, KEYS3, OPTS3), { x: CARD3.x, y: CARD3.y, w: CHANGE_W, h: CHANGE_H });
  // its slot, where the page's world has it on this frame (so once landed it creeps with that world)
  const toR = screenRectOf(cam3At(frame, KEYS4, OPTS4), CARD4);
  const r = lerpRect(fromR, toR, fly);
  const flying = frame >= T.carry2 - 2 && frame < T.carry2 + T.carry2Dur + 4;
  const arc = flying ? -60 * Math.sin(Math.PI * fly) : 0;
  return (
    <AbsoluteFill>
      <PushSwap at={T.carry2} dur={T.carry2Dur} outgoing={<TerminalShotWithoutCard />} incoming={<BylineShot />} />
      {/* the carried card: in flight during the push, then settled in its slot */}
      <div style={{ position: "absolute", left: r.x, top: r.y + arc, width: CHANGE_W, height: CHANGE_H, transformOrigin: "0 0", transform: `scale(${(r.w / CHANGE_W).toFixed(4)})` }}>
        <ChangeCard x={0} y={0} at={T.cardIn} slipAt={T.slip} agoAt={T.ago} settled />
      </div>
    </AbsoluteFill>
  );
};

/** The terminal shot without its card (the card is the carried object during seam 2). */
const TerminalShotWithoutCard: React.FC = () => (
  <Stage world="night" motif="none" light={["50%", "44%"]}>
    <Camera3D keys={KEYS3} {...OPTS3}>
      <ShellTerminal x={TERM.x} y={TERM.y} at={T.carry1 - 20} cmd={ROLLBACK_CMD} typeAt={T.carry1 - 20} typeDur={1} error={ZSH_ERROR} errorAt={T.error} />
    </Camera3D>
  </Stage>
);

const PROBLEM: React.FC = () => {
  const frame = useCurrentFrame();
  let shot: React.ReactNode;
  if (frame < T.cut1) shot = <AlertShot />;
  else if (frame < T.carry1) shot = <PageShot />;
  else if (frame < T.carry1 + T.carry1Dur) shot = <Carry1 />;
  else if (frame < T.carry2) shot = <TerminalShot />;
  else if (frame < T.cut2) shot = <Carry2 />;
  else shot = <ProblemLastShot />;
  return (
    <AbsoluteFill style={{ background: NIGHT.ground }}>
      <AbsoluteFill style={{ isolation: "isolate" }}>{shot}</AbsoluteFill>
      {/* sound (voice and score are global): the cold open's pager, the clock, the card, the error, the slip, the stream */}
      <Sfx id="alert" at={2} gainDb={-2} />
      <Sfx id="clock-tick" at={T.clockLand - 1} gainDb={-2} />
      <Sfx id="swish-up" at={T.cardAt + 8} gainDb={-5} />
      <Sfx id="tick-soft" at={T.mark + 3} gainDb={-2} />
      <Sfx id="whoosh-short" at={T.carry1 + 7} gainDb={-6} />
      <Sfx id="type-key" at={T.enter} gainDb={-2} />
      <Sfx id="error-blip" at={T.error} />
      <Sfx id="slip" at={T.slip + 6} gainDb={-3} />
      <Sfx id="whoosh-short" at={T.carry2 + 6} gainDb={-5} />
      <Sfx id="tick" at={T.bylineMark + 4} gainDb={-3} />
      {[0, 4, 8, 13, 17, 22].map((d) => (
        <Sfx key={`k-${d}`} id="type-key" at={T.answer + d} gainDb={-8} />
      ))}
      <Sfx id="tick-soft" at={T.source + 2} gainDb={-3} />
    </AbsoluteFill>
  );
};

export default PROBLEM;
