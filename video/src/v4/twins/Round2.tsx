import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { DAY, FONT, NIGHT, nightSweep, sweep } from "../look";
import { AgentPanelTwin } from "./AgentPanelTwin";
import { AnchorRail } from "./AnchorRail";
import { BylineItem } from "./BylineItem";
import { PageTwin, pageRects } from "./PageTwin";
import { TerminalTwin, terminalSize } from "./TerminalTwin";
import type { PageTwinProps } from "./types";

/**
 * Round 2 checks (review T-1 to T-5): one test page per behaviour, 100 frames each, rendered frame by frame into the
 * strips in out/v4/twins/round2/. Registered only in devRoot.tsx (composition "TwinsRound2").
 */
export const ROUND2_PAGE = 100;

const Label: React.FC<{ x: number; y: number; children: React.ReactNode; night?: boolean }> = ({ x, y, children, night }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: FONT.sans, fontSize: 26, fontWeight: 500, color: night ? NIGHT.textMuted : DAY.textMuted }}>{children}</div>
);

/** Page 0: the three byline slip swaps, standalone at k 2.2 (A1 to A2, the flag, the snap back). */
export const SWAPS = { reviewed: 20, flag: 50, snap: 80 } as const;
const Swaps: React.FC = () => (
  <AbsoluteFill style={{ background: sweep() }}>
    <Label x={200} y={150}>{`"Reviewed 34 days ago" to Verified, at ${SWAPS.reviewed}`}</Label>
    <BylineItem x={200} y={200} k={2.2} from="reviewed" state="verified" at={SWAPS.reviewed} />
    <Label x={200} y={400}>{`Verified to Possibly stale (lit), at ${SWAPS.flag}`}</Label>
    <BylineItem x={200} y={450} k={2.2} from="verified" state="possibly_stale" at={SWAPS.flag} />
    <Label x={200} y={650}>{`Possibly stale (lit) to Verified, at ${SWAPS.snap}`}</Label>
    <BylineItem x={200} y={700} k={2.2} from="possibly_stale" state="verified" at={SWAPS.snap} />
  </AbsoluteFill>
);

/** Page 1: step 2's code: old to renamed (the quick fix) at 20, renamed to new (the drafts, P4's snap back) at 60. */
export const STEP2 = { renamed: 20, fixed: 60 } as const;
export const STEP2_PAGE: PageTwinProps = { world: "day", doc: "runbook", k: 1.7, x: 60, y: -380, byline: { kind: "dds", state: "verified" } };
const Step2: React.FC = () => {
  const r = pageRects({ ...STEP2_PAGE, step2: "renamed" });
  return (
    <AbsoluteFill style={{ background: sweep() }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 540, overflow: "hidden" }}>
        <PageTwin {...STEP2_PAGE} step2={{ morphAt: STEP2.renamed, from: "old", to: "renamed" }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 540, width: 1920, height: 540, overflow: "hidden" }}>
        <PageTwin {...STEP2_PAGE} step2={{ morphAt: STEP2.fixed, from: "renamed", to: "new" }} />
      </div>
      <Label x={1240} y={r.step2Code.y - 70}>{`old to renamed at ${STEP2.renamed}`}</Label>
      <Label x={1240} y={540 + r.step2Code.y - 70}>{`renamed to new at ${STEP2.fixed}`}</Label>
    </AbsoluteFill>
  );
};

/** Page 2: AgentPanelTwin arrivals: A1's generic panel prefilled, growing; Drift Reviewer typing, steps, answer. */
const Panels: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: nightSweep("30%", "40%"), clipPath: "inset(0 50% 0 0)" }}>
      <AgentPanelTwin
        variant="generic"
        world="night"
        prefilled
        x={40}
        y={80}
        width={880}
        question={{ text: "How do I roll back payments-api?", at: 0 }}
        answer={{ lines: ["Run the rollback script from the root of the payments-api repo.", "./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT"], at: 14, cps: 120 }}
        source={{ text: "Payments rollback runbook", at: 52 }}
      />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: sweep("70%", "30%"), clipPath: "inset(0 0 0 50%)" }}>
      <AgentPanelTwin
        variant="drift-reviewer"
        x={1000}
        y={80}
        width={880}
        question={{ text: "How do I roll back payments-api?", at: 0, typeDur: 10 }}
        source={{ text: "Payments rollback runbook", at: 14 }}
        steps={[
          { text: "Analyzing: Reviewing your question.", at: 20 },
          { text: "Invoking tool: Read Skills for agents", at: 28 },
          { text: "Invoking tool: Check page freshness", at: 36 },
        ]}
        answer={{
          lines: [
            "{source} is Possibly stale.",
            'What it describes changed in PR #482 on 2026-11-13, after it was last verified. The affected section is "Steps". Do not present steps from this page as current. The review is in the Doc Drift badge on the page.',
          ],
          at: 50,
          cps: 240,
        }}
      />
    </AbsoluteFill>
  </>
);

/** Page 3: TerminalTwin arrives by lifting with its command typed, tagged, sized under 35%, scrolling by whole rows. */
export const TERM = {
  x: 120,
  y: 150,
  width: 1180,
  calls: [
    { cmd: 'find-docs-for-path {"repo": "payments-api", "path": "scripts/rollback.sh"}', at: 4, typeFrames: 0, streamAt: 12, lps: 60, output: "findDocsFlaggedV2" as const, collapse: ["pages.1.url"], focus: "2720100" },
    { cmd: 'check-page-freshness {"pageId": "2720100"}', at: 56, typeFrames: 6, lps: 60, output: "checkFlaggedV2" as const, collapse: ["url", "openDrift"], focus: "status", clear: true },
  ],
};
const Terminal: React.FC = () => {
  const size = terminalSize(TERM);
  return (
    <AbsoluteFill style={{ background: sweep("40%", "30%") }}>
      <TerminalTwin title="Coding agent · MCP" right="doc-drift" tag="Real output: doc-drift MCP" enter={{ at: 2, dur: 14 }} x={TERM.x} y={TERM.y} width={TERM.width} calls={TERM.calls} />
      <Label x={1340} y={160}>{`slab ${Math.round(size.width)} x ${Math.round(size.height)}: ${(size.area * 100).toFixed(1)}% of the frame, ${size.rows} rows`}</Label>
    </AbsoluteFill>
  );
};

/** Page 4: AnchorRail chips sized to content; the first grows as the change docks at 40; the rail leaves at 76. */
export const RAIL = { change: 40, leave: 76 } as const;
const Rail: React.FC = () => {
  const page: PageTwinProps = { world: "day", doc: "runbook", k: 1.1, x: 60, y: 170, byline: { kind: "dds", state: "verified" } };
  const r = pageRects(page);
  return (
    <AbsoluteFill style={{ background: sweep("40%", "40%") }}>
      <PageTwin {...page} />
      <AnchorRail
        anchors={[
          { label: "payments-api: scripts/rollback.sh", kind: "code" },
          { label: "payments-api: deploy/helm/values.yaml", kind: "code" },
          { label: "PAY-6", kind: "jira" },
        ]}
        draw={[2, 6, 10]}
        from={[r.bands.middle, r.bands.middle, r.bands.top]}
        change={{ index: 0, text: "PR #482 · scripts/rollback.sh -> scripts/rollback-v2.sh", at: RAIL.change }}
        pulse={{ index: 0, at: RAIL.change + 6, dur: 14 }}
        leave={{ at: RAIL.leave, dur: 9 }}
        x={1000}
      />
    </AbsoluteFill>
  );
};

const PAGES: React.FC[] = [Swaps, Step2, Panels, Terminal, Rail];
export const ROUND2_FRAMES = PAGES.length * ROUND2_PAGE;

const Round2: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    {PAGES.map((P, i) => (
      <Sequence key={i} from={i * ROUND2_PAGE} durationInFrames={ROUND2_PAGE}>
        <P />
      </Sequence>
    ))}
  </AbsoluteFill>
);

export default Round2;
