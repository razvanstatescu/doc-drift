import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Icon } from "../brand/icons";
import { Mark } from "../brand/Mark";
import { Cursor } from "../components/Cursor";
import { findCapture } from "../lib/captures";
import { EASE, tween } from "../lib/time";
import { AnchorChip, Lit, PageCard, SlippedBadge, Tile } from "./Crafted";
import { current, DAY, ELEV, ELEV_DARK, FONT, ink, NIGHT, T } from "./look";
import { ReviewPanel } from "./ReviewPanel";
import { ContactShadow, DayStage, Eyebrow, Float, InkLabel } from "./Stage";

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 2 · The solution hero: the crafted runbook card, the badge slipping, the anchors as chips.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Connector hairline between two frame points, with a node at each end. */
const Wire: React.FC<{ from: [number, number]; to: [number, number]; strong?: boolean }> = ({ from, to, strong }) => {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const stroke = strong ? DAY.text : current(0.55);
  return (
    <g>
      <path d={`M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke={stroke} strokeWidth={strong ? 2.5 : 2} strokeDasharray={strong ? undefined : "7 7"} />
      <circle cx={x1} cy={y1} r={6} fill={DAY.surface} stroke={stroke} strokeWidth={2.5} />
      <circle cx={x2} cy={y2} r={6} fill={DAY.surface} stroke={stroke} strokeWidth={2.5} />
    </g>
  );
};

export const HeroFrame: React.FC<{ tilt?: boolean }> = ({ tilt = false }) => {
  const frame = useCurrentFrame();
  const slip = tween(frame, 8, 14, 0, 1, EASE.expoOut);
  const k = 1.8;
  const cardX = 176;
  const cardY = 150;
  const cardR = cardX + 470 * k;
  const chipX = 1196;
  // card rows in frame px (UI y times k): the title, step 2's code line
  const yTitle = cardY + 74 * k;
  const yCode = cardY + 326 * k;
  return (
    <DayStage light={["44%", "40%"]} grid={{ mask: "radial-gradient(70% 80% at 64% 52%, #000 0%, rgba(0,0,0,0.5) 50%, transparent 88%)" }}>
      <AbsoluteFill style={{ perspective: 2800, perspectiveOrigin: "40% 50%" }}>
        <AbsoluteFill style={{ transform: tilt ? "rotateY(-7deg) rotateX(2.5deg) scale(0.98)" : undefined, transformStyle: "preserve-3d" }}>
          <Float x={cardX} y={cardY} lift={1.4} strength={0.18}>
            <PageCard k={k} width={470} slip={slip} steps={2} />
          </Float>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <Wire from={[cardR, yTitle]} to={[chipX, 262]} />
            <Wire from={[cardR, yCode]} to={[chipX, 520]} strong />
            <Wire from={[cardR, yCode]} to={[chipX, 790]} strong />
          </svg>
          <Float x={chipX} y={196} lift={0.5} strength={0.1}>
            <AnchorChip icon="ticket" repo="Jira" path="PAY-6" width={520} elev={1} />
          </Float>
          <Float x={chipX} y={410} lift={1} strength={0.14}>
            <AnchorChip repo="payments-api" path="scripts/rollback.sh" change={{ by: "PR #482", what: "renamed it", to: "scripts/rollback-v2.sh" }} elev={3} width={520} />
          </Float>
          <Float x={chipX} y={700} lift={0.7} strength={0.12}>
            <AnchorChip repo="payments-api" path="deploy/helm/values.yaml" change={{ by: "PR #482", what: "changed 2 lines" }} width={520} />
          </Float>
        </AbsoluteFill>
      </AbsoluteFill>
    </DayStage>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 3 · The review panel, over the page (depth of field), the change lifted toward the camera.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const ReviewFrame: React.FC<{ breakout?: boolean }> = ({ breakout = true }) => {
  const k = 1.6;
  const px = 556;
  const py = 132;
  return (
    <DayStage light={["58%", "38%"]} grid={{ mask: "radial-gradient(80% 80% at 50% 50%, #000 0%, rgba(0,0,0,0.45) 55%, transparent 90%)" }}>
      {/* the page behind the modal: out of focus and drained, the way a modal dims what is under it (so its badge is no second amber) */}
      <div style={{ position: "absolute", left: 70, top: 168, filter: "blur(8px) grayscale(1)", opacity: 0.5 }}>
        <PageCard k={1.75} slip={0} bloom={0} elev={2} steps={2} />
      </div>
      <Float x={px} y={py} lift={1.6} strength={0.2}>
        <ReviewPanel k={k} breakout={breakout ? 1 : 0} />
      </Float>
      <div style={{ position: "absolute", left: 0, top: 0 }}>
        <Cursor points={[{ frame: 0, x: px + 1196, y: py + 828, cursor: "pointer" }]} scale={1.7} />
      </div>
    </DayStage>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 4 · The proof insert: our claim, big; the real capture small and confident, labelled, cropped to the proof.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A real capture in a white mat, cropped to the part that proves the claim, with its logged masks drawn. */
export const ProofCapture: React.FC<{
  id: string;
  crop: [number, number, number, number];
  width: number;
  maskFill?: string;
  label: string;
  note?: string;
  style?: React.CSSProperties;
}> = ({ id, crop, width, maskFill = "#F1F1F2", label, note, style }) => {
  const cap = findCapture(id);
  const [cx, cy, cw, ch] = crop;
  const k = width / cw;
  const height = ch * k;
  const mat = 14;
  return (
    <div style={{ position: "absolute", ...style }}>
      <div style={{ position: "relative", padding: mat, borderRadius: 26, background: DAY.surface, boxShadow: ELEV[4] }}>
        <div style={{ position: "relative", width, height, overflow: "hidden", borderRadius: 26 - mat, boxShadow: `inset 0 0 0 1.5px ${ink(0.06)}` }}>
          {cap ? (
            <>
              <Img
                src={staticFile(cap.file)}
                style={{ position: "absolute", left: -cx * k, top: -cy * k, width: cap.width * k, height: cap.height * k, maxWidth: "none" }}
              />
              {(cap.masks ?? []).map((m, i) => (
                <div
                  key={i}
                  style={{ position: "absolute", left: (m.box[0] - cx) * k, top: (m.box[1] - cy) * k, width: m.box[2] * k, height: m.box[3] * k, background: m.fill ?? maskFill }}
                />
              ))}
            </>
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: FONT.mono, fontSize: 24, color: DAY.textMuted }}>{`capture ${id} missing`}</div>
          )}
        </div>
        <div style={{ position: "absolute", left: -18, top: -30 }}>
          <InkLabel icon="eye" size={26}>
            {label}
          </InkLabel>
        </div>
      </div>
      {note ? <div style={{ marginTop: 22, marginLeft: 6, ...T.label, fontSize: 26, color: DAY.textMuted }}>{note}</div> : null}
    </div>
  );
};

export const ProofFrame: React.FC = () => {
  const top = 262;
  const badgeY = top + 36 + 6 + 300 + 34 + 38; // centre of the badge row
  const crop: [number, number, number, number] = [1440, 300, 1380, 340];
  const w = 860;
  const capBadgeY = (482 - crop[1]) * (w / crop[2]); // the real byline row inside the crop
  return (
    <DayStage light={["30%", "42%"]} grid={{ opacity: 0.045, mask: "radial-gradient(60% 70% at 28% 50%, #000 0%, transparent 85%)" }}>
      <div style={{ position: "absolute", left: 176, top }}>
        <Eyebrow icon="merge">Merge to flag, PR #482</Eyebrow>
        <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 18, fontFamily: FONT.sans, fontWeight: 600, color: DAY.text }}>
          <span style={{ fontSize: 300, lineHeight: "300px", letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums" }}>19</span>
          <span style={{ fontSize: 120, lineHeight: "120px", letterSpacing: "-0.03em", color: DAY.textMuted }}>s</span>
        </div>
        <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 22 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, height: 76, padding: "0 22px", borderRadius: 16, background: DAY.surface, boxShadow: ELEV[2] }}>
            <Icon name="merge" size={34} color={DAY.textMuted} />
            <span style={{ fontFamily: FONT.sans, fontSize: 34, fontWeight: 500, color: DAY.text }}>Merged</span>
          </span>
          <Icon name="arrow" size={40} color={DAY.textMuted} />
          <SlippedBadge size={2.7} />
        </div>
        <div style={{ marginTop: 44, ...T.label, color: DAY.textMuted, maxWidth: 700 }}>Measured on the demo site, Nov 13, 2026.</div>
      </div>
      <ProofCapture
        id="p2-flagged-tooltip"
        crop={crop}
        width={w}
        label="Live in Confluence"
        note="Real capture, development install"
        style={{ left: 930, top: badgeY - 14 - capBadgeY }}
      />
    </DayStage>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 5 · The agent moment: Drift Reviewer's answer and the MCP terminal, one signal, two readers.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const J = { key: NIGHT.link, str: "#D6E4E7", punct: NIGHT.textMuted, state: NIGHT.beacon, text: NIGHT.text };

type Tok = [string, string?];
const TermLine: React.FC<{ toks: Tok[]; indent?: number }> = ({ toks, indent = 0 }) => (
  <div style={{ paddingLeft: `${indent * 1.2}ch`, whiteSpace: "pre" }}>
    {toks.map(([t, c], i) => (
      <span key={i} style={{ color: c ?? J.text }}>
        {t}
      </span>
    ))}
  </div>
);

export const AgentFrame: React.FC = () => {
  const ans: React.CSSProperties = { fontSize: 31, lineHeight: "46px", color: DAY.text };
  return (
    <DayStage light={["34%", "30%"]} tide={{ top: 760, bottom: 1080, count: 7, wavelength: 640, opacity: 0.2, composite: true, mask: "linear-gradient(90deg, transparent 0%, #000 22%, #000 70%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 40%)" }}>
      {/* Rovo: the answer card */}
      <div style={{ position: "absolute", left: 150, top: 98 }}>
        <Eyebrow icon="words">Rovo chat · Drift Reviewer</Eyebrow>
      </div>
      <Float x={150} y={158} w={820} lift={1.2} strength={0.15}>
        <div style={{ boxSizing: "border-box", padding: "34px 64px 40px 40px", borderRadius: 30, background: DAY.surface, boxShadow: ELEV[3], fontFamily: FONT.sans }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ padding: "16px 24px", borderRadius: 20, background: DAY.surfaceSunk, fontSize: 30, lineHeight: 1.2, color: DAY.text }}>How do I roll back payments-api?</div>
          </div>
          <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 16 }}>
            <Tile size={52} />
            <span style={{ fontSize: 28, fontWeight: 600, color: DAY.text }}>Drift Reviewer</span>
          </div>
          <div style={{ marginTop: 20, ...ans }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "2px 14px 2px 10px",
                borderRadius: 10,
                boxShadow: `inset 0 0 0 2px ${DAY.line}`,
                color: DAY.link,
                fontWeight: 500,
              }}
            >
              <Icon name="page" size={28} color={DAY.link} />
              Payments rollback runbook
            </span>{" "}
            is <span style={{ fontWeight: 600 }}>Possibly stale</span>.
          </div>
          <div style={{ marginTop: 16, ...ans }}>
            What it describes changed in PR #482 on <span style={{ whiteSpace: "nowrap" }}>2026-11-13,</span> after it was last verified. The affected section is "Steps".{" "}
            <span style={{ fontWeight: 600 }}>Do not present steps from this page as current.</span>
          </div>
        </div>
      </Float>
      {/* the coding agent: the MCP terminal, a dark object on the Day stage, one step closer to the camera */}
      <Float x={930} y={352} w={840} lift={1.8} strength={0.24}>
        <div style={{ borderRadius: 28, background: NIGHT.ground, boxShadow: ELEV_DARK[4], overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              height: 66,
              padding: "0 30px",
              borderBottom: `1.5px solid ${NIGHT.line}`,
              fontFamily: FONT.sans,
              fontSize: 24,
              fontWeight: 500,
              color: NIGHT.textMuted,
            }}
          >
            <Icon name="terminal" size={27} color={NIGHT.textMuted} />
            Coding agent · MCP
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: FONT.mono, fontSize: 22, color: NIGHT.link }}>check-page-freshness</span>
          </div>
          <div style={{ padding: "26px 34px 34px", fontFamily: FONT.mono, fontSize: 26, lineHeight: "41px", letterSpacing: "-0.01em" }}>
            <TermLine toks={[["› ", J.punct], ["doc-drift · ", J.punct], ["{ ", J.punct], ['"pageId"', J.key], [": ", J.punct], ['"2720100"', J.str], [" }", J.punct]]} />
            <div style={{ height: 14 }} />
            <TermLine toks={[["{", J.punct]]} />
            <TermLine indent={1} toks={[['"title"', J.key], [": ", J.punct], ['"Payments rollback runbook"', J.str], [",", J.punct]]} />
            <TermLine indent={1} toks={[['"status"', J.key], [": ", J.punct], ['"possibly_stale"', J.state], [",", J.punct]]} />
            <TermLine indent={1} toks={[['"citePolicy"', J.key], [": ", J.punct], ['"cite_with_caveat"', J.str], [",", J.punct]]} />
            <TermLine indent={1} toks={[['"guidance"', J.key], [": ", J.punct], ['"… Do not present steps', J.str]]} />
            <TermLine indent={2} toks={[['from this page as current. …"', J.str]]} />
            <TermLine toks={[["}", J.punct]]} />
          </div>
        </div>
      </Float>
    </DayStage>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 6 · The end card on Day.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const EndFrame: React.FC = () => {
  const icon = 132;
  return (
    <DayStage
      light={["50%", "36%"]}
      tide={{ top: 850, bottom: 1110, count: 7, opacity: 0.24, amplitude: 18, composite: true, mask: "linear-gradient(180deg, transparent 0%, #000 45%, #000 100%), linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)" }}
    >
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170 }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: icon * 0.28 }}>
          <ContactShadow cx={icon / 2} y={icon + 6} w={icon * 0.9} h={40} strength={0.22} />
          <Mark size={icon} variant="icon" />
          <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: icon * 0.42, letterSpacing: "-0.02em", color: DAY.text, lineHeight: 1 }}>Doc Drift Sentinel</span>
        </div>
        <div style={{ marginTop: 92, ...T.headline, fontSize: 124, lineHeight: "128px", color: DAY.text, textAlign: "center" }}>
          Catch the slip
          <br />
          before your agents do.
        </div>
        <div style={{ marginTop: 78, ...T.label, fontSize: 32, color: DAY.textMuted }}>Built on Atlassian Forge for Codegeist 2026</div>
      </AbsoluteFill>
    </DayStage>
  );
};
