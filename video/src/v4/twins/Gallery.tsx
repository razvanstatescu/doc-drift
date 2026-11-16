import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { findCapture } from "../../lib/captures";
import { DAY, FONT, NIGHT, nightSweep, sweep } from "../look";
import { AgentPanelTwin, agentPanelRects } from "./AgentPanelTwin";
import { AnchorRail } from "./AnchorRail";
import { ChangeRecord } from "./ChangeRecord";
import { PageTwin, pageRects } from "./PageTwin";
import { TerminalTwin } from "./TerminalTwin";
import { TOOLTIPS } from "./TooltipTwin";
import { textWidth } from "./metrics";
import type { PageTwinProps } from "./types";

/**
 * Dev/Twins: every shared twin, and the 1:1 checks (twin beside the real capture at matching scale), one page per
 * 100 frames. Render a page's settled still at frame (page x 100 + 90). Stills: out/v4/twins/.
 */

const PAGE_FRAMES = 100;

/** A crop of a real capture at a scale, with its logged masks drawn (as ProofFrame does). */
export const CaptureCrop: React.FC<{ id: string; crop: [number, number, number, number]; scale: number; x: number; y: number; label?: string }> = ({ id, crop, scale, x, y, label }) => {
  const cap = findCapture(id);
  const [cx, cy, cw, ch] = crop;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {label ? <div style={{ fontFamily: FONT.sans, fontSize: 26, fontWeight: 500, color: DAY.textMuted, marginBottom: 12 }}>{label}</div> : null}
      <div style={{ position: "relative", width: cw * scale, height: ch * scale, overflow: "hidden", borderRadius: 12, boxShadow: "0 0 0 1.5px rgba(7,38,48,0.12)" }}>
        {cap ? (
          <>
            <Img src={staticFile(cap.file)} style={{ position: "absolute", left: -cx * scale, top: -cy * scale, width: cap.width * scale, height: cap.height * scale, maxWidth: "none" }} />
            {(cap.masks ?? []).map((m, i) => (
              <div key={i} style={{ position: "absolute", left: (m.box[0] - cx) * scale, top: (m.box[1] - cy) * scale, width: m.box[2] * scale, height: m.box[3] * scale, background: m.fill ?? "#F1F1F2" }} />
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
};

const Label: React.FC<{ x: number; y: number; children: React.ReactNode; night?: boolean }> = ({ x, y, children, night }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: FONT.sans, fontSize: 26, fontWeight: 500, color: night ? NIGHT.textMuted : DAY.textMuted }}>{children}</div>
);

/** Draws pageRects() as outlines over the page, to prove the rects match the drawing. */
const RectsOverlay: React.FC<{ props: PageTwinProps }> = ({ props }) => {
  const r = pageRects(props);
  const box = (rr: { x: number; y: number; w: number; h: number }, c: string, key: string) => (
    <div key={key} style={{ position: "absolute", left: rr.x, top: rr.y, width: rr.w, height: rr.h, boxShadow: `inset 0 0 0 2px ${c}` }} />
  );
  return (
    <>
      {box(r.title, "rgba(255,0,120,0.7)", "t")}
      {box(r.badge, "rgba(255,0,120,0.7)", "b")}
      {box(r.step2Code, "rgba(0,150,255,0.7)", "c")}
      {Object.entries(r.tokens).map(([id, t]) => box(t!, "rgba(0,180,80,0.8)", id))}
    </>
  );
};

const P0: React.FC = () => {
  const props: PageTwinProps = { world: "day", doc: "runbook", k: 1.5, x: 120, y: 60, byline: { kind: "dds", state: "possibly_stale", from: "verified", at: 30 }, tooltip: { text: TOOLTIPS.flagged, at: 50 } };
  const r = pageRects(props);
  return (
    <AbsoluteFill style={{ background: sweep("40%", "40%") }}>
      <PageTwin {...props} />
      <RectsOverlay props={props} />
      <Label x={1080} y={80}>{`PageTwin runbook, k 1.5: card ${Math.round(r.card.w)} x ${Math.round(r.card.h)}`}</Label>
    </AbsoluteFill>
  );
};

/**
 * Byline swap timing (BYLINE_SWAP): A, Verified to Possibly stale at 40, the band slipped amber at 30 and handing its
 * amber to the item at 40; B, the snap back: Possibly stale (lit) to Verified at 70, the band snapping home from 67.
 */
export const SWAP_TEST = {
  a: { world: "day", doc: "runbook", k: 1.3, x: 60, y: 60, byline: { kind: "dds", state: "possibly_stale", from: "verified", at: 40 }, slip: { at: 30, handoff: 40 } } as PageTwinProps,
  b: { world: "day", doc: "runbook", k: 1.3, x: 990, y: 60, byline: { kind: "dds", state: "verified", from: "possibly_stale", at: 70 }, slip: { at: -60, handoff: -50, back: 67 } } as PageTwinProps,
};

const P1: React.FC = () => (
  <AbsoluteFill style={{ background: sweep("50%", "40%") }}>
    <PageTwin {...SWAP_TEST.a} />
    <PageTwin {...SWAP_TEST.b} />
  </AbsoluteFill>
);

const P2: React.FC = () => {
  const frame = useCurrentFrame();
  const e = Math.min(1, frame / 40);
  return (
    <AbsoluteFill style={{ background: sweep("45%", "40%") }}>
      <PageTwin world="day" doc="runbook" k={1.3} x={500} y={120} byline={{ kind: "dds", state: "verified" }} explode={e} perspective={1600} yaw={-12 * e} pitch={6 * e} />
      <Label x={80} y={80}>explode 0 to 1, own perspective</Label>
    </AbsoluteFill>
  );
};

/** 1:1: byline and tooltip, twin over the real crop. Capture px 2x CSS; twin k = 1.8 vs capture scale 0.9 (1.8 / 2). */
const P3: React.FC = () => (
  <AbsoluteFill style={{ background: sweep() }}>
    <CaptureCrop id="p2-flagged-tooltip" crop={[1440, 300, 1460, 360]} scale={0.9} x={160} y={110} label="Real: p2-flagged-tooltip, 0.9 (CSS x 1.8)" />
    <PageTwin world="day" doc="runbook" k={1.8} x={160} y={560} byline={{ kind: "dds", state: "possibly_stale", amber: false }} tooltip={{ text: TOOLTIPS.flagged, at: 0 }} />
    <Label x={160} y={520}>Twin, k 1.8</Label>
  </AbsoluteFill>
);

const P4: React.FC = () => (
  <AbsoluteFill style={{ background: sweep() }}>
    <CaptureCrop id="p1-unanchored-tooltip" crop={[1440, 300, 1460, 360]} scale={0.6} x={100} y={90} label="Real: p1-unanchored-tooltip" />
    <CaptureCrop id="p1-verified-tooltip" crop={[1440, 300, 1460, 360]} scale={0.6} x={1000} y={90} label="Real: p1-verified-tooltip" />
    <PageTwin world="day" doc="runbook" k={1.2} x={100} y={420} byline={{ kind: "dds", state: "unanchored" }} tooltip={{ text: TOOLTIPS.unanchored, at: 0 }} />
    <PageTwin world="day" doc="runbook" k={1.2} x={1000} y={420} byline={{ kind: "dds", state: "verified" }} tooltip={{ text: TOOLTIPS.verified2, at: 0 }} />
  </AbsoluteFill>
);

const P5: React.FC = () => (
  <AbsoluteFill style={{ background: sweep() }}>
    <CaptureCrop id="p2-flagged" crop={[1480, 1940, 1580, 220]} scale={0.6} x={80} y={60} label="Real: p2-flagged (Steps, top)" />
    <CaptureCrop id="p4-step2-fixed" crop={[1480, 1220, 1580, 280]} scale={0.6} x={80} y={300} label="Real: p4-step2-fixed (step 2)" />
    <div style={{ position: "absolute", left: 1040, top: 0, width: 880, height: 1080, overflow: "hidden" }}>
      <PageTwin world="day" doc="runbook" k={1.4} x={0} y={-330} byline={{ kind: "dds", state: "verified" }} step2={{ morphAt: 40 }} />
    </div>
    <Label x={80} y={700}>Twin step 2 morphs old to new at 40</Label>
  </AbsoluteFill>
);

const P6: React.FC = () => (
  <AbsoluteFill style={{ background: nightSweep("40%", "36%") }}>
    <PageTwin world="night" doc="runbook" k={1.5} x={140} y={60} byline={{ kind: "reviewed", text: "Reviewed 34 days ago" }} mark={{ token: "./scripts/rollback.sh", kind: "mist", at: 20 }} />
    <Label x={1180} y={80} night>
      Night, A1: reviewed byline, Mist on the command
    </Label>
  </AbsoluteFill>
);

const P7: React.FC = () => (
  <AbsoluteFill style={{ background: sweep() }}>
    <CaptureCrop id="p5-adr-tooltip" crop={[1440, 300, 1460, 360]} scale={0.6} x={1000} y={90} label="Real: p5-adr-tooltip" />
    <PageTwin world="day" doc="adr015" k={1.4} x={80} y={90} byline={{ kind: "dds", state: "possibly_stale", from: "verified", at: 40 }} slip={{ at: 20, handoff: 40 }} tooltip={{ text: TOOLTIPS.adrFlagged, at: 60 }} />
  </AbsoluteFill>
);

/** Metrics check: bars of the computed width under each string (page kept for reference, not in PAGES). */
export const MetricsCheck: React.FC = () => {
  const rows: { t: string; size: number; weight: number; mono?: boolean }[] = [
    { t: "Payments rollback runbook", size: 48.6, weight: 600 },
    { t: "Possibly stale · Doc Drift", size: 27, weight: 500 },
    { t: "By Razvan Statescu", size: 27, weight: 400 },
    { t: "PR #482 changed deploy/helm/values.yaml", size: 27, weight: 400 },
    { t: "./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT", size: 26.1, weight: 400, mono: true },
    { t: "Agents are told not to trust this page until someone reviews it.", size: 30, weight: 500 },
  ];
  return (
    <AbsoluteFill style={{ background: DAY.surface }}>
      {rows.map((r, i) => {
        const w = textWidth(r.t, { size: r.size, weight: r.weight, mono: r.mono, tracking: r.mono ? -0.01 : r.weight === 600 ? -0.014 : 0 });
        return (
          <div key={i} style={{ position: "absolute", left: 120, top: 100 + i * 140 }}>
            <div
              style={{
                fontFamily: r.mono ? FONT.mono : FONT.sans,
                fontSize: r.size,
                fontWeight: r.weight,
                letterSpacing: r.mono ? "-0.01em" : r.weight === 600 ? "-0.014em" : undefined,
                whiteSpace: "pre",
                color: DAY.text,
                display: "inline-block",
                boxShadow: "inset 0 0 0 1px rgba(255,0,0,0.5)",
              }}
            >
              {r.t}
            </div>
            <div style={{ height: 6, width: w, background: "rgba(0,120,255,0.7)" }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Night, A4: the same page at 3 a.m., now Possibly stale; the byline item is the one amber, its tooltip open. */
const P8: React.FC = () => (
  <AbsoluteFill style={{ background: nightSweep("36%", "36%") }}>
    <PageTwin world="night" doc="runbook" k={1.5} x={140} y={60} byline={{ kind: "dds", state: "possibly_stale", from: "verified", at: 20 }} tooltip={{ text: TOOLTIPS.flagged, at: 50 }} enter={{ at: 0, dur: 14 }} />
    <Label x={1180} y={80} night>
      Night, A4: Possibly stale lit, tooltip
    </Label>
  </AbsoluteFill>
);

/** AnchorRail: V07 (draw), then V08 (the change docks, a pulse runs back, the band slips). */
const P9: React.FC = () => {
  const page: PageTwinProps = { world: "day", doc: "runbook", k: 1.25, x: 110, y: 150, byline: { kind: "dds", state: "possibly_stale", from: "verified", at: 84 }, slip: { at: 70, handoff: 84 } };
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
        draw={[8, 14, 24]}
        from={[r.bands.middle, r.bands.middle, r.bands.top]}
        change={{ index: 0, text: "PR #482 · scripts/rollback.sh -> scripts/rollback-v2.sh", at: 50 }}
        pulse={{ index: 0, at: 56, dur: 14 }}
        x={1060}
      />
    </AbsoluteFill>
  );
};

/** ChangeRecord riding a path (the kit's SignalLine shares the easing), then lit. */
const P10: React.FC = () => {
  const d = "M 200 700 C 700 700, 900 380, 1700 380";
  return (
    <AbsoluteFill style={{ background: sweep() }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={d} stroke="rgba(7,38,48,0.25)" strokeWidth={2.5} fill="none" strokeDasharray="7 7" />
      </svg>
      <ChangeRecord label="PR #482 · 2 files" at={4} along={{ d, at: 10, dur: 60 }} lit={0} />
      <ChangeRecord label="PR #482 · 2 files" at={4} x={420} y={240} lit />
      <Label x={120} y={120}>ChangeRecord: riding (neutral), and lit (the shot's amber)</Label>
    </AbsoluteFill>
  );
};

/** TerminalTwin: find-docs-for-path (QA rows collapsed), then check-page-freshness with the status in amber. */
const P11: React.FC = () => (
  <AbsoluteFill style={{ background: sweep("40%", "30%") }}>
    <TerminalTwin
      title="Coding agent · MCP"
      right="doc-drift"
      x={160}
      y={60}
      width={1600}
      rows={21}
      calls={[
        { cmd: 'find-docs-for-path {"repo": "payments-api", "path": "scripts/rollback.sh"}', at: 2, cps: 160, output: "findDocsFlaggedV2", collapse: ["2752731", "2982418", "pages.1.url"], focus: "2720100", lps: 120 },
        { cmd: 'check-page-freshness {"pageId": "2720100"}', at: 60, cps: 120, output: "checkFlaggedV2", collapse: ["url", "openDrift"], focus: "status", clear: true, lps: 120 },
      ]}
    />
  </AbsoluteFill>
);

/** AgentPanelTwin drift-reviewer, beside the real Rovo answer (R12 crop) at matching scale. */
const P12: React.FC = () => {
  const props = {
    variant: "drift-reviewer" as const,
    world: "day" as const,
    x: 80,
    y: 40,
    width: 860,
    question: { text: "How do I roll back payments-api?", at: 0, typeDur: 12 },
    steps: [
      { text: "Analyzing: Reviewing your question.", at: 16 },
      { text: "Invoking tool: Read Skills for agents", at: 24 },
      { text: "Invoking tool: Check page freshness", at: 32 },
    ],
    answer: {
      lines: [
        "{source} is Possibly stale.",
        'What it describes changed in PR #482 on 2026-11-13, after it was last verified. The affected section is "Steps". Do not present steps from this page as current. The review is in the Doc Drift badge on the page.',
      ],
      at: 44,
      cps: 400,
    },
    source: { text: "Payments rollback runbook", at: 14 },
  };
  const r = agentPanelRects(props);
  return (
    <AbsoluteFill style={{ background: sweep("30%", "30%") }}>
      <AgentPanelTwin {...props} />
      {r.source ? <div style={{ position: "absolute", left: r.source.x, top: r.source.y, width: r.source.w, height: r.source.h, boxShadow: "inset 0 0 0 2px rgba(255,0,120,0.6)" }} /> : null}
      <CaptureCrop id="p3-rovo-v2-answer" crop={[2960, 150, 880, 1000]} scale={0.9} x={1040} y={40} label="Real: p3-rovo-v2-answer" />
    </AbsoluteFill>
  );
};

/** AgentPanelTwin generic (A1, Night): the confident answer that repeats step 2, with its source chip. */
const P13: React.FC = () => (
  <AbsoluteFill style={{ background: nightSweep("50%", "36%") }}>
    <AgentPanelTwin
      variant="generic"
      world="night"
      x={330}
      y={150}
      width={1260}
      question={{ text: "How do I roll back payments-api?", at: 0, typeDur: 22 }}
      answer={{ lines: ["Run the rollback script from the root of the payments-api repo.", "./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT"], at: 30, cps: 120 }}
      source={{ text: "Payments rollback runbook", at: 70 }}
    />
  </AbsoluteFill>
);

/** AgentPanelTwin ghost: the old step ghosts in, slips in amber, falls away; then the answer streams. */
const P14: React.FC = () => (
  <AbsoluteFill style={{ background: sweep("30%", "30%") }}>
    <AgentPanelTwin
      variant="drift-reviewer"
      x={400}
      y={100}
      width={1000}
      question={{ text: "How do I roll back payments-api?", at: 0, typeDur: 10 }}
      ghost={{ text: "./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT", at: 14, slipAt: 26, out: 52 }}
      answer={{ lines: ["{source} is Possibly stale."], at: 66, cps: 90 }}
      source={{ text: "Payments rollback runbook", at: 10 }}
    />
  </AbsoluteFill>
);

/** Scan (P1 V11), a Current underline on ROLLBACK_TIMEOUT, then scripts/rollback.sh lifts off as a chip. */
const P15: React.FC = () => {
  const props: PageTwinProps = { world: "day", doc: "runbook", k: 1.4, x: 120, y: 90, byline: { kind: "dds", state: "unanchored" }, scan: { at: 4, dur: 36 }, mark: { token: "ROLLBACK_TIMEOUT", kind: "current", at: 30 }, lift: { token: "scripts/rollback.sh", at: 50 } };
  const r = pageRects(props);
  const lifted = r.tokensLifted["scripts/rollback.sh"]!;
  return (
    <AbsoluteFill style={{ background: sweep("40%", "40%") }}>
      <PageTwin {...props} />
      <div style={{ position: "absolute", left: lifted.x, top: lifted.y, width: lifted.w, height: lifted.h, boxShadow: "inset 0 0 0 2px rgba(0,180,80,0.7)" }} />
      <Label x={1080} y={110}>scan, Current underline, lift (green: tokensLifted rect)</Label>
    </AbsoluteFill>
  );
};

/** The amber block on a token (the drift only), and step 2 in its fixed form with the new token ids. */
const P16: React.FC = () => (
  <AbsoluteFill style={{ background: sweep("40%", "40%") }}>
    <PageTwin world="day" doc="runbook" k={1.3} x={60} y={110} byline={{ kind: "dds", state: "possibly_stale", amber: false }} mark={{ token: "scripts/rollback.sh", kind: "amber", at: 20 }} />
    <PageTwin world="day" doc="runbook" k={1.0} x={1080} y={110} byline={{ kind: "dds", state: "verified" }} step2="new" mark={{ token: "scripts/rollback-v2.sh", kind: "mist", at: 20 }} />
    <Label x={1080} y={60}>step2 "new", Mist on scripts/rollback-v2.sh</Label>
  </AbsoluteFill>
);

/** 1:1: the properties well against the real header table (rows the twin keeps). */
const P17: React.FC = () => (
  <AbsoluteFill style={{ background: sweep() }}>
    <CaptureCrop id="p2-flagged" crop={[1470, 610, 1540, 520]} scale={0.6} x={100} y={90} label="Real: p2-flagged (header table)" />
    <CaptureCrop id="p5-adr-flagged" crop={[1470, 610, 1540, 470]} scale={0.6} x={1000} y={90} label="Real: p5-adr-flagged (header table)" />
    <div style={{ position: "absolute", left: 100, top: 520, width: 860, height: 520, overflow: "hidden", borderRadius: 24 }}>
      <PageTwin world="day" doc="runbook" k={1.2} x={0} y={-150} byline={{ kind: "dds", state: "verified" }} />
    </div>
    <div style={{ position: "absolute", left: 1000, top: 520, width: 860, height: 520, overflow: "hidden", borderRadius: 24 }}>
      <PageTwin world="day" doc="adr015" k={1.2} x={0} y={-150} byline={{ kind: "dds", state: "verified" }} />
    </div>
  </AbsoluteFill>
);

const PAGES: React.FC[] = [P0, P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14, P15, P16, P17];

const Gallery: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    {PAGES.map((P, i) => (
      <Sequence key={i} from={i * PAGE_FRAMES} durationInFrames={PAGE_FRAMES}>
        <P />
      </Sequence>
    ))}
  </AbsoluteFill>
);

export default Gallery;
