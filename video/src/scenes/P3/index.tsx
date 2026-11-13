import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Sfx } from "../../audio/Sfx";
import { World } from "../../brand/theme";
import { DAY, typeStyle } from "../../brand/tokens";
import { FadeText } from "../../components/P1/FadeText";
import { ProductStage, WhipIn, WhipOut, type Cam, type Layer } from "../../components/P1/stage";
import { AgentTerminal, terminalHeight, type Row } from "../../components/P3/AgentTerminal";
import { toolOutput } from "../../lib/captures";
import { getScene } from "../../lib/timeline";
import { Whip } from "../../motion/whip";

/**
 * P3 · Agents (Day, real). Rovo with Drift Reviewer on the runbook, the core 5.5.0 re-capture (p3-rovo-v2-rec, one
 * take, time-remapped; D38), and a coding agent's terminal rebuilt from the real MCP output (captures.json
 * toolOutput.findDocsFlaggedV2, checkFlaggedV2). The superseded p3-rovo-* captures and checkFlagged are not used.
 *
 *   0          the whip from P2 lands on Rovo, open on the runbook: Drift Reviewer's own welcome (its name and
 *              what it does)                                                                         (V16)
 *   "agent"    down to the chat input; the cursor clicks it; the question types: "How do I roll back
 *              payments-api?"; sent on "back"
 *   then       the real thinking steps, compressed (Check page freshness among them); the take's 5 frames of raw
 *              link text before the answer renders are skipped
 *   V17        the answer streams in (real speed) and holds; on "Possibly" punch in on "Payments rollback runbook
 *              is Possibly stale." (the link re-renders as a chip during the move); on "why" move to "What it
 *              describes changed in PR #482 on 2026-11-13, after it was last verified."                    (V17)
 *   V18        whip to the terminal (a beat before V18): find-docs-for-path (payments-api, scripts/rollback.sh)
 *              and the runbook's row, highlighted on "same signal"; then check-page-freshness clears the first
 *              call out in one smooth scroll and prints status, the openDrift ref and the guidance, highlighted on
 *              "and which to trust", held still for 3.4 s. Real values only; omitted keys, the two QA pages from a
 *              DDSTEST space and the second drift entry are marked "…"                                      (V18)
 */
const sc = getScene("P3");

const possibly = sc.wordAt("V17", "possibly");
const why = sc.wordAt("V17", "why");
export const P3_T = {
  inputClick: sc.wordAt("V16", "agent") - 10,
  typeFrom: sc.wordAt("V16", "agent") - 4,
  typeTo: sc.wordAt("V16", "back", "to"),
  send: sc.wordAt("V16", "back", "to") + 3,
  thinkTo: sc.cue("V17") - 4,
  punch: possibly - 18,
  possibly,
  punch2: why - 12,
  why,
  /** the whip to the terminal, a beat before V18 (on the grid) */
  toTerminal: sc.snap(sc.cue("V18")) - sc.beat(1),
  call1: sc.snap(sc.cue("V18")) - 8,
  result1: sc.wordAt("V18", "same") - 4,
  signal: sc.wordAt("V18", "signal"),
  call2: sc.wordAt("V18", "cover") - 6,
  trust: sc.wordAt("V18", "and", "from", 0),
  end: sc.durationInFrames,
};
const T = P3_T;

// ---- Rovo (p3-rovo-v2.mp4: input click 14.635 s at (3402, 1918); typing 15.1-17.6 s; Enter 18.934 s; thinking
// steps 19.1-28.47 s; raw link text 28.50-28.65 s; the answer streams 28.67-28.85 s; the link re-renders as a chip
// at 31.05 s and the suggestions shift). Panel x 2963-3840. Welcome: heading y 1105-1140, description 1193-1299,
// suggestions 1397-1619, context 1770, input 1898. Answer: "… is Possibly stale." y 561-590 (x 3048-3680 as a chip),
// "What it describes changed in PR #482 on 2026-11-13," 636-662 (x 3037-3743), then 683, 731, 779, 833 ("page.").
const CAM: Cam[] = [
  // Drift Reviewer's own welcome: its name and what it does
  { frame: 0, x: 3173, y: 1355, s: 1.2, dur: 0 },
  // down to the chat input as the cursor comes in
  { frame: T.inputClick - 12, x: 3173, y: 1740, s: 1.2, dur: 14 },
  // a cut, on the frame the question appears: the question, Referencing the runbook, the agent's steps
  { frame: T.send + 1, x: 3225, y: 540, s: 1.3, dur: 0 },
  // the whole answer as it streams in (45 px)
  { frame: T.thinkTo, x: 3340, y: 708, s: 1.6, dur: 14 },
  // on "Possibly": the state line near the centre (57 px), "Referencing Payments rollback runbook" whole above it
  { frame: T.punch, x: 3382, y: 574, s: 2.05, dur: T.possibly - T.punch },
  // on "why": the reason, "What it describes changed in PR #482 …", at the centre
  { frame: T.punch2, x: 3390, y: 668, s: 2.15, dur: T.why - T.punch2 },
];
const TIME: [number, number][] = [
  [0, 12.7],
  [T.inputClick, 14.65],
  [T.typeFrom, 15.1],
  [T.typeTo, 17.6],
  [T.send - 1, 18.8],
  [T.send, 19.15],
  // @remotion/media can land a frame or two (up to about 0.04 s) away from ffmpeg's -ss in these 60 fps takes, so
  // every key sits at least 0.05 s inside a stable stretch of the take
  [T.thinkTo - 1, 28.4],
  [T.thinkTo, 28.71],
  [T.thinkTo + 6, 28.93],
  // the answer holds as rendered (link underlined, no suggestions yet), then switches to the chip during the punch
  [T.punch + 1, 30.8],
  [T.punch + 2, 31.15],
  [T.toTerminal + 4, 31.5],
];
const LAYERS: Layer[] = [{ id: "p3-rovo-v2-rec", from: -10000, time: TIME }];
const CURSOR = [
  { frame: T.inputClick - 14, x: 3700, y: 1560 },
  { frame: T.inputClick, x: 3402, y: 1918, click: true, cursor: "text" },
];

const Rovo: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <ProductStage label="Confluence" cam={CAM} layers={LAYERS} cursor={CURSOR} cursorShow={T.inputClick - 14} cursorHide={T.inputClick + 10} />
  </AbsoluteFill>
);

// ---- the terminal, from toolOutput (asserted below, so a re-shoot that changes the output fails loudly)
type Out = { input: Record<string, string>; output: Record<string, unknown> };
const find = toolOutput("findDocsFlaggedV2") as Out;
const check = toolOutput("checkFlaggedV2") as Out;
const page = (find.output.pages as { title: string; status: string; citePolicy: string; pageId: string }[]).find((x) => x.pageId === "2720100");
const drift = check.output.openDrift as { ref: string }[];
const guidance = String(check.output.guidance);
// the guidance value verbatim, wrapped at the terminal's width (one sentence per row; the long one on two rows)
const G = [
  '"Payments rollback runbook" is Possibly stale.',
  "Do not present steps from this page as current.",
  "Cite with caveat: what it describes changed in",
  "PR #482 on 2026-11-13, after it was last verified.",
  'Affected: "Steps".',
];
if (!page || `${G[0]} ${G[1]} ${G[2]} ${G[3]} ${G[4]}` !== guidance || drift[0]?.ref !== "PR #482" || String(check.output.status) !== "possibly_stale") {
  throw new Error("P3: captures.json toolOutput (V2) changed; update the terminal rows to the new real output");
}

// Real output, trimmed: every omitted key, array item or value is marked "…" (keys keep their real order).
const R2 = (k: number) => T.call2 + 14 + k * 2;
const ROWS: Row[] = [
  { at: T.call1, kind: "tool", text: "doc-drift · find-docs-for-path" },
  { at: T.call1 + 3, kind: "json", indent: 2, text: `{ "repo": "${find.input.repo}", "path": "${find.input.path}" }` },
  { at: T.result1, kind: "json", indent: 2, text: `{ …, "pages": [ …,` },
  { at: T.result1 + 3, kind: "json", indent: 6, text: `{ …, "title": "${page.title}", …,` },
  { at: T.result1 + 6, kind: "json", indent: 8, text: `"status": "${page.status}", …,` },
  { at: T.result1 + 9, kind: "json", indent: 8, text: `"citePolicy": "${page.citePolicy}" },` },
  { at: T.result1 + 12, kind: "json", indent: 6, text: "… ], … }" },
  { at: R2(0), kind: "tool", text: `doc-drift · check-page-freshness { "pageId": "${check.input.pageId}" }` },
  { at: R2(1.5), kind: "json", indent: 2, text: `{ …, "status": "${String(check.output.status)}", …,` },
  { at: R2(3), kind: "json", indent: 4, text: `"openDrift": [ { …, "ref": "${drift[0].ref}", … }, … ], …,` },
  { at: R2(4.5), kind: "json", indent: 4, text: `"guidance":` },
  { at: R2(5.5), kind: "str", indent: 6, text: G[0] },
  { at: R2(6.5), kind: "str", indent: 6, text: G[1] },
  { at: R2(7.5), kind: "str", indent: 6, text: G[2] },
  { at: R2(8.5), kind: "str", indent: 6, text: G[3] },
  { at: R2(9.5), kind: "str", indent: 6, text: G[4] },
  { at: R2(10.5), kind: "json", indent: 2, text: "}" },
].map((r, i) => (i < 7 ? { ...r, dimFrom: T.call2 } : r)) as Row[];

const VIEW_ROWS = 10;
const TERM_W = 1536;
const TERM_H = terminalHeight(VIEW_ROWS);
const SMALL = "Agents read as you. They never edit a page.";
const TOP = Math.round((1080 - (TERM_H + 40 + 56)) / 2);

const TerminalShot: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    <AgentTerminal
      rows={ROWS}
      width={TERM_W}
      viewRows={VIEW_ROWS}
      scroll={[{ at: T.call2, rows: 7, dur: 13 }]}
      highlights={[
        { from: T.signal, to: T.call2, rows: [3, 5] },
        { from: T.trust, rows: [10, 15] },
      ]}
      style={{ position: "absolute", left: (1920 - TERM_W) / 2, top: TOP }}
    />
    <FadeText at={T.call1 + 12} style={{ ...typeStyle("small"), color: DAY.textMuted, position: "absolute", left: (1920 - TERM_W) / 2 + 8, top: TOP + TERM_H + 40 }}>
      {SMALL}
    </FadeText>
  </AbsoluteFill>
);

const P3: React.FC = () => {
  const frame = useCurrentFrame();
  const shot =
    frame < T.toTerminal - 4 ? (
      <WhipIn>
        <Rovo />
      </WhipIn>
    ) : (
      <Whip
        at={T.toTerminal}
        dur={8}
        from={<Rovo />}
        to={
          <WhipOut end={T.end}>
            <TerminalShot />
          </WhipOut>
        }
      />
    );
  return (
    <World theme="day">
      {shot}
      <Sfx id="click" at={T.inputClick} gainDb={-3} />
      <Sfx id="type-burst" at={T.typeFrom + 2} gainDb={-6} />
      <Sfx id="type-burst" at={T.typeFrom + 24} gainDb={-8} />
      <Sfx id="tick-soft" at={T.send} />
      <Sfx id="tick" at={T.possibly} gainDb={-3} />
      <Sfx id="whoosh-short" at={T.toTerminal} />
      <Sfx id="type-burst" at={T.call1} gainDb={-8} />
      <Sfx id="tick-soft" at={T.result1} />
      <Sfx id="type-burst" at={T.call2 + 14} gainDb={-8} />
      <Sfx id="tick-soft" at={T.trust} />
      <Sfx id="whoosh-short" at={T.end - 3} />
    </World>
  );
};

export default P3;
