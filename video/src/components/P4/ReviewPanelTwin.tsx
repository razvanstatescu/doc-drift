import React from "react";
import { Icon } from "../../brand/icons";
import { DAY, ELEV, FONT, type Elev, type Rect } from "../../v4/look";
import { AppTile, Arrow, Button, Code, CodeWell, H4, Muted, Severity, StateBadge, SuccessNotice, cardStyle } from "./ui";

/**
 * ReviewPanelTwin: the Doc Drift review panel on the runbook, crafted in our look (R2 frame 3, src/styleframes/
 * ReviewPanel.tsx) with the real panel's content and order (apps/core/src/frontend/byline/review.jsx; captures
 * p4-panel, p4-affected, p4-quickfix-done, p4-draft-diff, p4-accept-button, p4-accepted):
 *   header (tile, page title, state badge) · the why sentence and the trust line · tabs "Review (2)" "Anchors (3)" ·
 *   What changed (PR #482 High, PR #482 Medium) · Affected section (Steps) · Quick fix · Proposed fix · footer.
 * Two columns instead of the real single column, so it fits 16:9 (a twin may simplify a layout, never add to it).
 * "Renamed anchors" and "Track in Jira" are dropped here (P5 shows Track in Jira on ADR-015).
 *
 * Every section sits at a fixed rect (PANEL_UI, UI px), so the same nodes compose the flat panel and the exploded
 * stack (`reviewPanelLayers`), and scenes can aim cameras, breakouts and morphs at `panelRect()`.
 *
 * Strings: whySentence and trustLine from format.ts, tabLabel, whatChanged, affectedSection, quickFix, quickFixSource
 * + quickFixHelp, quickFixButton ("Replace in 1 place"), quickFixDoneTitle, proposedFix, PROPOSE_FIX_HELP,
 * proposeFix, dismiss, snooze, markVerified, acceptFix, acceptAllHelp(2), the event rows as captured.
 */

export const STR = {
  title: "Payments rollback runbook",
  why2: ["PR #482 renamed ", "scripts/rollback.sh", " to ", "scripts/rollback-v2.sh", ", an anchor of this page."],
  why1: ["PR #482 changed ", "deploy/helm/values.yaml", " (2 lines), an anchor of this page."],
  trust: "Agents are told not to trust this page until someone reviews it.",
  whatChanged: "What changed",
  affected: "Affected section",
  quickFix: "Quick fix",
  proposedFix: "Proposed fix",
  mergedBy: "merged by Razvan Statescu",
  /** The row's "· 6 minutes ago", on its own line in the narrower card (the dot drops with the break). */
  ago: "6 minutes ago",
  prTitle: "Rename rollback script and timeout variable",
  qfFrom: "scripts/rollback.sh",
  qfTo: "scripts/rollback-v2.sh",
  qfHelp: "Suggested from PR #482. No AI used. Edits the page as you, with a version message that names the PR.",
  qfButton: "Replace in 1 place",
  qfDone: ["Replaced ", "scripts/rollback.sh", " with ", "scripts/rollback-v2.sh", " in 1 place."],
  reloadPage: "Reload the page to see the change.",
  reloadButton: "Reload page",
  proposeHelp: "Drift Reviewer drafts the change. Nothing changes until you accept it.",
  proposeButton: "Propose fix",
  dismiss: "Dismiss",
  snooze: "Snooze 7 days",
  markVerified: "Mark verified",
  acceptFix: "Accept fix",
  acceptHelp: "Accepts 2 drafts in page order.",
  steps: "Steps",
  stepText: ["Run the rollback script from the root of the ", "payments-api", " repo."],
} as const;

export type PanelSection = "base" | "header" | "why" | "tabs" | "changedHead" | "high" | "medium" | "affected" | "quickfix" | "proposed" | "footer";

/** Section rects in UI px (multiply by k). The panel is 740 x 836 UI px. */
export const PANEL_UI: Record<PanelSection, { x: number; y: number; w: number; h: number }> = {
  base: { x: 0, y: 0, w: 740, h: 836 },
  header: { x: 0, y: 0, w: 740, h: 70 },
  why: { x: 28, y: 84, w: 684, h: 54 },
  tabs: { x: 28, y: 150, w: 684, h: 38 },
  changedHead: { x: 28, y: 206, w: 316, h: 24 },
  high: { x: 28, y: 238, w: 316, h: 166 },
  medium: { x: 28, y: 416, w: 316, h: 148 },
  affected: { x: 368, y: 206, w: 344, h: 196 },
  quickfix: { x: 368, y: 416, w: 344, h: 214 },
  proposed: { x: 368, y: 644, w: 344, h: 110 },
  footer: { x: 0, y: 768, w: 740, h: 68 },
};

/** The quick fix card inside its section (below the h4), UI px relative to the panel. */
export const QF_CARD_UI = { x: 368, y: 448, w: 344, h: 182 };

/** A section's rect in film px, given the panel's top-left in film px and k. */
export const panelRect = (key: PanelSection | "qfCard", x: number, y: number, k: number): Rect => {
  const r = key === "qfCard" ? QF_CARD_UI : PANEL_UI[key];
  return { x: x + r.x * k, y: y + r.y * k, w: r.w * k, h: r.h * k };
};

export type ReviewPanelProps = {
  k?: number;
  elev?: Elev;
  /** The header badge's state and glow (glow > 0 only when it is the shot's one amber). */
  badge?: "possibly_stale" | "verified";
  badgeGlow?: number;
  /** Open changes: 2 before the quick fix, 1 after it (tab count and why sentence follow). */
  open?: 2 | 1;
  /** 0..1, the High card leaving (resolved by the quick fix). */
  highOut?: number;
  qfPress?: number;
  qfBusy?: number;
  /** 0..1, the quick fix card's button row replaced by the result. */
  qfDone?: number;
  /** The Affected section's code after the quick fix (rollback-v2.sh). */
  renamed?: boolean;
  pfPress?: number;
  pfBusy?: number;
  /** Drafts are waiting: Accept fix is the footer's primary, Mark verified turns default. */
  drafts?: boolean;
  acceptPress?: number;
  acceptBusy?: number;
  /** Sections drawn elsewhere (a breakout): hidden in place, their layout kept. */
  hide?: Partial<Record<PanelSection, boolean>>;
  /** Hide only the quick fix card (its heading stays): the card is breaking out, drawn by the scene. */
  hideQfCard?: boolean;
};

const at = (r: { x: number; y: number; w: number; h: number }, k: number): React.CSSProperties => ({
  position: "absolute",
  left: r.x * k,
  top: r.y * k,
  width: r.w * k,
  height: r.h * k,
  boxSizing: "border-box",
});

// ---------------------------------------------------------------------------------------------------------------
// Sections (each one renders at its own rect inside a panel-sized box)
// ---------------------------------------------------------------------------------------------------------------

const Header: React.FC<{ k: number; badge: "possibly_stale" | "verified"; glow: number }> = ({ k, badge, glow }) => (
  <div
    style={{ ...at(PANEL_UI.header, k), display: "flex", alignItems: "center", gap: 14 * k, padding: `0 ${28 * k}px`, fontFamily: FONT.sans, color: DAY.text }}
  >
    <AppTile size={30 * k} />
    <span style={{ fontSize: 22 * k, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.012em", whiteSpace: "nowrap" }}>{STR.title}</span>
    <StateBadge k={k} state={badge} glow={glow} />
    <span style={{ flex: 1 }} />
    <Icon name="x" size={20 * k} color={DAY.textMuted} />
  </div>
);

const Why: React.FC<{ k: number; open: 2 | 1 }> = ({ k, open }) => {
  const parts = open === 2 ? STR.why2 : STR.why1;
  return (
    <div style={{ ...at(PANEL_UI.why, k), fontFamily: FONT.sans, color: DAY.text }}>
      <div style={{ fontSize: 15 * k, lineHeight: `${23 * k}px`, whiteSpace: "nowrap" }}>
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <Code key={i} k={k} bare size="0.92em">
              {p}
            </Code>
          ) : (
            <React.Fragment key={i}>{p}</React.Fragment>
          ),
        )}
      </div>
      <div
        style={{
          marginTop: 7 * k,
          display: "flex",
          alignItems: "center",
          gap: 7 * k,
          fontSize: 13 * k,
          lineHeight: `${18 * k}px`,
          color: DAY.textMuted,
          whiteSpace: "nowrap",
        }}
      >
        <Icon name="hand" size={15 * k} color={DAY.textMuted} />
        {STR.trust}
      </div>
    </div>
  );
};

const Tabs: React.FC<{ k: number; open: 2 | 1 }> = ({ k, open }) => (
  <div style={{ ...at(PANEL_UI.tabs, k), fontFamily: FONT.sans }}>
    <div style={{ display: "flex", gap: 26 * k, fontSize: 14 * k, lineHeight: `${20 * k}px`, height: 36 * k, alignItems: "flex-start" }}>
      <span style={{ position: "relative", fontWeight: 600, color: DAY.text, paddingTop: 4 * k }}>
        {`Review (${open})`}
        <span style={{ position: "absolute", left: 0, right: 0, bottom: -10 * k, height: 2.5 * k, borderRadius: 2 * k, background: DAY.text }} />
      </span>
      <span style={{ fontWeight: 500, color: DAY.textMuted, paddingTop: 4 * k }}>Anchors (3)</span>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 36 * k, height: Math.max(1.5, 1.25 * k), background: DAY.line }} />
  </div>
);

const ChangedHead: React.FC<{ k: number }> = ({ k }) => (
  <div style={{ ...at(PANEL_UI.changedHead, k) }}>
    <H4 k={k}>{STR.whatChanged}</H4>
  </div>
);

/** The first line of an event row: the ref as code, who and when, the severity on the right. */
const EventHead: React.FC<{ k: number; level: "High" | "Medium" }> = ({ k, level }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 * k }}>
    <div style={{ flex: 1, minWidth: 0, fontSize: 13 * k, lineHeight: `${19 * k}px`, color: DAY.text }}>
      <div style={{ whiteSpace: "nowrap" }}>
        <Code k={k}>PR #482</Code> {STR.mergedBy}
      </div>
      <div style={{ color: DAY.textMuted }}>{STR.ago}</div>
    </div>
    <Severity k={k} level={level} />
  </div>
);

export const EventCard: React.FC<{ k: number; level: "High" | "Medium"; style?: React.CSSProperties }> = ({ k, level, style }) => (
  <div style={{ ...cardStyle(k), padding: `${12 * k}px ${13 * k}px`, display: "grid", gap: 8 * k, alignContent: "start", fontFamily: FONT.sans, ...style }}>
    <EventHead k={k} level={level} />
    <div style={{ fontSize: 12.5 * k, lineHeight: `${17 * k}px`, color: DAY.textMuted, whiteSpace: "nowrap" }}>{STR.prTitle}</div>
    {level === "High" ? (
      <div
        style={{
          padding: `${6 * k}px ${9 * k}px`,
          borderRadius: 8 * k,
          background: DAY.surfaceSunk,
          fontFamily: FONT.mono,
          fontSize: 11 * k,
          lineHeight: `${17 * k}px`,
          color: DAY.text,
          whiteSpace: "nowrap",
        }}
      >
        <div>scripts/rollback.sh</div>
        <div>
          <Arrow />
          scripts/rollback-v2.sh · +3 −3
        </div>
      </div>
    ) : (
      <div style={{ fontFamily: FONT.mono, fontSize: 11 * k, lineHeight: `${17 * k}px`, color: DAY.text, whiteSpace: "nowrap" }}>
        deploy/helm/values.yaml · +1 −1
      </div>
    )}
    <div style={{ fontSize: 12 * k, lineHeight: `${17 * k}px`, color: DAY.text, whiteSpace: "nowrap" }}>
      Anchor{" "}
      <Code k={k} size="0.92em">
        {level === "High" ? "payments-api: scripts/rollback.sh" : "payments-api: deploy/helm/values.yaml"}
      </Code>
    </div>
  </div>
);

const Affected: React.FC<{ k: number; renamed: boolean }> = ({ k, renamed }) => (
  <div style={{ ...at(PANEL_UI.affected, k), display: "grid", gap: 10 * k, alignContent: "start", fontFamily: FONT.sans }}>
    <H4 k={k}>{STR.affected}</H4>
    <div style={{ padding: `${12 * k}px ${12 * k}px ${13 * k}px`, borderRadius: 12 * k, background: DAY.ground, display: "grid", gap: 7 * k }}>
      <div style={{ fontSize: 12.5 * k, lineHeight: 1, fontWeight: 600, color: DAY.textMuted }}>{STR.steps}</div>
      <div style={{ fontSize: 13 * k, lineHeight: `${19 * k}px`, color: DAY.text }}>
        {STR.stepText[0]}
        <Code k={k}>{STR.stepText[1]}</Code>
        {STR.stepText[2]}
      </div>
      <div
        style={{
          padding: `${7 * k}px ${8 * k}px`,
          borderRadius: 8 * k,
          background: DAY.surface,
          boxShadow: `inset 0 0 0 ${1 * k}px ${DAY.line}`,
          fontFamily: FONT.mono,
          fontSize: 10.2 * k,
          lineHeight: `${17 * k}px`,
          letterSpacing: "-0.01em",
          whiteSpace: "pre",
          overflow: "hidden",
          color: DAY.text,
        }}
      >
        <div>export ROLLBACK_TIMEOUT=300</div>
        <div>
          {"./scripts/"}
          <span
            style={{ background: renamed ? undefined : DAY.trace, borderRadius: 3 * k, boxShadow: renamed ? undefined : `inset 0 ${-1.4 * k}px 0 ${DAY.text}` }}
          >
            {renamed ? "rollback-v2.sh" : "rollback.sh"}
          </span>
          {" --timeout $ROLLBACK_TIMEOUT"}
        </div>
      </div>
    </div>
  </div>
);

/**
 * The quick fix card (the one in the panel and the one that breaks out are the same node, so the breakout is honest).
 * `done` swaps the button row for the real result line; `noAiOut` leaves a trace where "No AI used." lifted away.
 */
export const QuickFixCard: React.FC<{ k: number; press?: number; busy?: number; done?: number; noAiOut?: number; style?: React.CSSProperties }> = ({
  k,
  press = 0,
  busy = 0,
  done = 0,
  noAiOut = 0,
  style,
}) => (
  <div
    style={{
      ...cardStyle(k),
      width: QF_CARD_UI.w * k,
      height: QF_CARD_UI.h * k,
      padding: `${13 * k}px ${14 * k}px`,
      fontFamily: FONT.sans,
      color: DAY.text,
      position: "relative",
      ...style,
    }}
  >
    <div style={{ fontSize: 14 * k, lineHeight: `${22 * k}px` }}>
      Replace <Code k={k}>{STR.qfFrom}</Code> with <Code k={k}>{STR.qfTo}</Code> in 1 place.
    </div>
    <div style={{ marginTop: 7 * k, fontSize: 12 * k, lineHeight: `${17 * k}px`, color: DAY.textMuted }}>
      {"Suggested from PR #482. "}
      <span style={{ position: "relative", whiteSpace: "nowrap" }}>
        {noAiOut > 0 ? (
          <span
            style={{ position: "absolute", inset: `${-1 * k}px ${-2 * k}px`, borderRadius: 4 * k, background: DAY.trace, opacity: Math.min(1, noAiOut * 3) }}
          />
        ) : null}
        <span style={{ position: "relative", opacity: 1 - Math.min(1, noAiOut * 2) }}>No AI used.</span>
      </span>
      {" Edits the page as you, with a version message that names the PR."}
    </div>
    <div style={{ position: "absolute", left: 14 * k, right: 14 * k, bottom: 13 * k, height: 52 * k }}>
      {done < 1 ? (
        <div style={{ position: "absolute", left: 0, bottom: 0, opacity: 1 - done, transform: `translateY(${-6 * k * done}px)` }}>
          <Button k={k} press={press} busy={busy}>
            {STR.qfButton}
          </Button>
        </div>
      ) : null}
      {done > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            gap: 10 * k,
            padding: `0 ${12 * k}px`,
            borderRadius: 10 * k,
            background: DAY.verifiedTint,
            opacity: done,
            transform: `translateY(${6 * k * (1 - done)}px)`,
            fontSize: 12.5 * k,
            lineHeight: `${17 * k}px`,
            fontWeight: 600,
          }}
        >
          <span style={{ flex: "none", display: "grid", placeItems: "center", width: 17 * k, height: 17 * k, borderRadius: "50%", background: DAY.verified }}>
            <Icon name="check" size={12 * k} color={DAY.surface} />
          </span>
          <span>
            {STR.qfDone[0]}
            <Code k={k} bare>
              {STR.qfDone[1]}
            </Code>
            {STR.qfDone[2]}
            <Code k={k} bare>
              {STR.qfDone[3]}
            </Code>
            {STR.qfDone[4]}
          </span>
        </div>
      ) : null}
    </div>
  </div>
);

const QuickFix: React.FC<{ k: number; press: number; busy: number; done: number; hideCard?: boolean }> = ({ k, press, busy, done, hideCard }) => (
  <div style={{ ...at(PANEL_UI.quickfix, k) }}>
    <H4 k={k}>{STR.quickFix}</H4>
    <div style={{ position: "absolute", left: 0, top: (QF_CARD_UI.y - PANEL_UI.quickfix.y) * k, visibility: hideCard ? "hidden" : undefined }}>
      <QuickFixCard k={k} press={press} busy={busy} done={done} />
    </div>
  </div>
);

const Proposed: React.FC<{ k: number; press: number; busy: number }> = ({ k, press, busy }) => (
  <div style={{ ...at(PANEL_UI.proposed, k), display: "grid", gap: 8 * k, alignContent: "start" }}>
    <H4 k={k}>{STR.proposedFix}</H4>
    <Muted k={k} size={12}>
      {STR.proposeHelp}
    </Muted>
    <div>
      <Button k={k} press={press} busy={busy}>
        {STR.proposeButton}
      </Button>
    </div>
  </div>
);

export const FooterButtons: React.FC<{ k: number; drafts: boolean; acceptPress?: number; acceptBusy?: number; dim?: number }> = ({
  k,
  drafts,
  acceptPress = 0,
  acceptBusy = 0,
  dim = 0,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 * k }}>
    <Button k={k} dim={dim}>
      {STR.dismiss}
    </Button>
    <Button k={k} dim={dim}>
      {STR.snooze}
    </Button>
    <Button k={k} kind={drafts ? "default" : "primary"} dim={dim}>
      {STR.markVerified}
    </Button>
    {drafts ? (
      <Button k={k} kind="primary" press={acceptPress} busy={acceptBusy}>
        {STR.acceptFix}
      </Button>
    ) : null}
  </div>
);

const Footer: React.FC<{ k: number; drafts: boolean; acceptPress: number; acceptBusy: number }> = ({ k, drafts, acceptPress, acceptBusy }) => (
  <div style={{ ...at(PANEL_UI.footer, k), padding: `${16 * k}px ${28 * k}px 0` }}>
    <FooterButtons k={k} drafts={drafts} acceptPress={acceptPress} acceptBusy={acceptBusy} />
  </div>
);

/** The panel's body: the white card, the header and footer dividers. Carries the elevation. */
const Base: React.FC<{ k: number; elev: Elev }> = ({ k, elev }) => (
  <div style={{ ...at(PANEL_UI.base, k), borderRadius: 22 * k, background: DAY.surface, boxShadow: ELEV[elev] }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: PANEL_UI.header.h * k, height: Math.max(1.5, 1.25 * k), background: DAY.line }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: PANEL_UI.footer.y * k, height: Math.max(1.5, 1.25 * k), background: DAY.line }} />
  </div>
);

// ---------------------------------------------------------------------------------------------------------------
// The panel, flat or as layers
// ---------------------------------------------------------------------------------------------------------------

export type PanelLayer = { key: PanelSection; z: number; node: React.ReactNode };

/** Default Z (film px) of each section when the stack is fully exploded: the drift's story reads front to back. */
export const PANEL_Z: Record<PanelSection, number> = {
  base: 0,
  header: 150,
  why: 110,
  tabs: 70,
  changedHead: 90,
  high: 190,
  medium: 140,
  affected: 120,
  quickfix: 230,
  proposed: 160,
  footer: 100,
};

/**
 * The panel as one node per section, each in a panel-sized box with the section at its own rect, so stacking them
 * with no Z gives exactly the flat panel. Use with the kit's ExplodedStack (`z` is the exploded depth).
 */
export function reviewPanelLayers(p: ReviewPanelProps): PanelLayer[] {
  const k = p.k ?? 1.8;
  const open = p.open ?? 2;
  const highOut = p.highOut ?? 0;
  const W = PANEL_UI.base.w * k;
  const H = PANEL_UI.base.h * k;
  const box = (key: PanelSection, child: React.ReactNode): PanelLayer => ({
    key,
    z: PANEL_Z[key],
    node: (
      <div key={key} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, visibility: p.hide?.[key] ? "hidden" : undefined }}>
        {child}
      </div>
    ),
  });
  const high =
    highOut < 1 ? (
      <div style={{ ...at(PANEL_UI.high, k), opacity: 1 - highOut, transform: `translateX(${-40 * k * highOut}px) scale(${1 - 0.04 * highOut})` }}>
        <EventCard k={k} level="High" style={{ height: PANEL_UI.high.h * k }} />
      </div>
    ) : null;
  // after the quick fix the Medium card moves up into the High card's place
  const mediumShift = highOut * (PANEL_UI.high.y - PANEL_UI.medium.y) * k;
  return [
    box("base", <Base k={k} elev={p.elev ?? 3} />),
    box("header", <Header k={k} badge={p.badge ?? "possibly_stale"} glow={p.badgeGlow ?? 0} />),
    box("why", <Why k={k} open={open} />),
    box("tabs", <Tabs k={k} open={open} />),
    box("changedHead", <ChangedHead k={k} />),
    box("high", high),
    box(
      "medium",
      <div style={{ ...at(PANEL_UI.medium, k), transform: mediumShift ? `translateY(${mediumShift}px)` : undefined }}>
        <EventCard k={k} level="Medium" style={{ height: PANEL_UI.medium.h * k }} />
      </div>,
    ),
    box("affected", <Affected k={k} renamed={p.renamed ?? false} />),
    box("quickfix", <QuickFix k={k} press={p.qfPress ?? 0} busy={p.qfBusy ?? 0} done={p.qfDone ?? 0} hideCard={p.hideQfCard} />),
    box("proposed", <Proposed k={k} press={p.pfPress ?? 0} busy={p.pfBusy ?? 0} />),
    box("footer", <Footer k={k} drafts={p.drafts ?? false} acceptPress={p.acceptPress ?? 0} acceptBusy={p.acceptBusy ?? 0} />),
  ];
}

/** The flat panel (all layers at Z 0), absolutely sized; place it with `style` (left/top) or inside a positioned box. */
export const ReviewPanelTwin: React.FC<ReviewPanelProps & { style?: React.CSSProperties }> = ({ style, ...p }) => {
  const k = p.k ?? 1.8;
  return (
    <div style={{ position: "relative", width: PANEL_UI.base.w * k, height: PANEL_UI.base.h * k, ...style }}>
      {reviewPanelLayers(p).map((l) => (
        <React.Fragment key={l.key}>{l.node}</React.Fragment>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// V21: the Proposed fix card with drafts, the footer card, the drafts themselves
// ---------------------------------------------------------------------------------------------------------------

export const DRAFT1 = {
  lines: [
    {
      sign: "-" as const,
      text: "Run the rollback script from the root of the payments-api repo. ROLLBACK_TIMEOUT is in seconds and defaults to 300. Raise it to 600 if the cluster is under load.",
    },
    {
      sign: "+" as const,
      text: "Run the rollback script from the root of the payments-api repo. ROLLBACK_TIMEOUT_SECS is in seconds and defaults to 300. Raise it to 600 if the cluster is under load.",
    },
  ],
};
export const DRAFT2 = {
  lines: [
    { sign: "-" as const, text: "export ROLLBACK_TIMEOUT=300" },
    { sign: "-" as const, text: "./scripts/rollback-v2.sh --timeout $ROLLBACK_TIMEOUT" },
    { sign: "+" as const, text: "export ROLLBACK_TIMEOUT_SECS=300" },
    { sign: "+" as const, text: "./scripts/rollback-v2.sh --timeout $ROLLBACK_TIMEOUT_SECS" },
  ],
};
export const DRAFT_RATIONALE = "PR #482 renamed ROLLBACK_TIMEOUT to ROLLBACK_TIMEOUT_SECS.";
export const DRAFT_ATTRIBUTION = "Drafted by Drift Reviewer from PR #482. Nothing changes until you accept.";

/** Draft card width in UI px (both drafts). */
export const DRAFT_UI = { w: 560, h1: 190, h2: 156 };

/**
 * One drafted change as the panel shows it (p4-draft-diff): the diff, the rationale and the attribution. Long diff
 * lines wrap as in the real code block. Its Accept and Reject buttons are dropped (the footer's Accept fix is the
 * action this film shows).
 */
export const DraftCard: React.FC<{ k: number; which: 1 | 2; style?: React.CSSProperties; elevated?: boolean }> = ({ k, which, style, elevated }) => {
  const lines = which === 1 ? DRAFT1.lines : DRAFT2.lines;
  return (
    <div
      style={{
        ...cardStyle(k),
        width: DRAFT_UI.w * k,
        height: (which === 1 ? DRAFT_UI.h1 : DRAFT_UI.h2) * k,
        padding: `${11 * k}px ${12 * k}px`,
        display: "grid",
        gap: 8 * k,
        alignContent: "start",
        fontFamily: FONT.sans,
        color: DAY.text,
        boxShadow: elevated ? ELEV[2] : cardStyle(k).boxShadow,
        ...style,
      }}
    >
      <DiffBlock k={k} lines={lines} />
      <div style={{ fontSize: 13 * k, lineHeight: `${19 * k}px` }}>{DRAFT_RATIONALE}</div>
      <Muted k={k} size={11.5} style={{ whiteSpace: "nowrap" }}>
        {DRAFT_ATTRIBUTION}
      </Muted>
    </div>
  );
};

/** The draft's diff well (gutter numbers, "-" and "+" lines in our state colours). */
const DiffBlock: React.FC<{ k: number; lines: { sign: "-" | "+"; text: string }[] }> = ({ k, lines }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `${20 * k}px 1fr`,
      borderRadius: 8 * k,
      overflow: "hidden",
      background: DAY.surfaceSunk,
      fontFamily: FONT.mono,
      fontSize: 10.6 * k,
      lineHeight: `${16.5 * k}px`,
      letterSpacing: "-0.01em",
    }}
  >
    {lines.map((l, i) => (
      <React.Fragment key={i}>
        <span
          style={{
            padding: `${i === 0 ? 6 * k : 0}px 0 ${i === lines.length - 1 ? 6 * k : 0}px`,
            textAlign: "center",
            color: DAY.textMuted,
            background: "#DDE6E8",
          }}
        >
          {i + 1}
        </span>
        <span
          style={{
            padding: `${i === 0 ? 6 * k : 0}px ${9 * k}px ${i === lines.length - 1 ? 6 * k : 0}px`,
            color: l.sign === "-" ? DAY.stale : DAY.verified,
            background: l.sign === "-" ? "rgba(251, 231, 227, 0.8)" : "rgba(227, 244, 236, 0.9)",
            whiteSpace: "pre-wrap",
          }}
        >
          {`${l.sign} ${l.text}`}
        </span>
      </React.Fragment>
    ))}
  </div>
);

/**
 * The Proposed fix section broken out of the panel for V21: the heading, then either the help line and Propose fix,
 * or (from `draftsIn`) the "Steps" group with the two drafts landing in page order. `slots` gives the film-px rects
 * where each draft lands (relative to the card), so the scene can fly drafts in with a KineticDock.
 */
export const PROPOSED_UI = { w: 600, h: 474 };
export const proposedSlots = (k: number) => ({
  draft1: { x: 20 * k, y: 96 * k, w: DRAFT_UI.w * k, h: DRAFT_UI.h1 * k },
  draft2: { x: 20 * k, y: (96 + DRAFT_UI.h1 + 12) * k, w: DRAFT_UI.w * k, h: DRAFT_UI.h2 * k },
  /** Before the drafts: the help line (one line at 14.5) and the button below it. */
  button: { x: 20 * k, y: 104 * k, w: 118 * k, h: 36 * k },
});
/** Card height before the drafts (UI px). */
export const PROPOSED_H0 = 164;

export const ProposedFixCard: React.FC<{
  k: number;
  /** Button press and busy (before the drafts). */
  press?: number;
  busy?: number;
  /** 0..1 the help line and button give way to the "Steps" group. */
  draftsIn?: number;
  /** Which drafts are drawn in their slots (the scene flies them in, then sets these). */
  draft1?: boolean;
  draft2?: boolean;
  style?: React.CSSProperties;
}> = ({ k, press = 0, busy = 0, draftsIn = 0, draft1, draft2, style }) => {
  const s = proposedSlots(k);
  const h = (PROPOSED_UI.h - (1 - draftsIn) * (PROPOSED_UI.h - PROPOSED_H0)) * k;
  return (
    <div
      style={{
        position: "relative",
        width: PROPOSED_UI.w * k,
        height: h,
        boxSizing: "border-box",
        borderRadius: 18 * k,
        background: DAY.surface,
        boxShadow: ELEV[4],
        fontFamily: FONT.sans,
        color: DAY.text,
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ position: "absolute", left: 20 * k, top: 18 * k }}>
        <H4 k={k}>{STR.proposedFix}</H4>
      </div>
      {draftsIn < 1 ? (
        <div style={{ position: "absolute", left: 20 * k, top: 52 * k, right: 20 * k, opacity: 1 - draftsIn }}>
          <Muted k={k} size={14.5} style={{ whiteSpace: "nowrap" }}>
            {STR.proposeHelp}
          </Muted>
          <div style={{ marginTop: 18 * k }}>
            <Button k={k} press={press} busy={busy}>
              {STR.proposeButton}
            </Button>
          </div>
        </div>
      ) : null}
      {draftsIn > 0 ? (
        <div style={{ position: "absolute", left: 20 * k, top: 56 * k, opacity: draftsIn }}>
          <div style={{ fontSize: 13.5 * k, lineHeight: 1, fontWeight: 600, color: DAY.textMuted }}>{STR.steps}</div>
        </div>
      ) : null}
      {draft1 ? (
        <div style={{ position: "absolute", left: s.draft1.x, top: s.draft1.y }}>
          <DraftCard k={k} which={1} />
        </div>
      ) : null}
      {draft2 ? (
        <div style={{ position: "absolute", left: s.draft2.x, top: s.draft2.y }}>
          <DraftCard k={k} which={2} />
        </div>
      ) : null}
    </div>
  );
};

/** The footer as its own card for the V21 side view: the four buttons and "Accepts 2 drafts in page order." */
export const FooterCard: React.FC<{ k: number; acceptPress?: number; acceptBusy?: number; dim?: number; style?: React.CSSProperties }> = ({
  k,
  acceptPress = 0,
  acceptBusy = 0,
  dim = 0,
  style,
}) => (
  <div
    style={{
      display: "inline-grid",
      gap: 10 * k,
      padding: `${16 * k}px ${18 * k}px ${15 * k}px`,
      borderRadius: 18 * k,
      background: DAY.surface,
      boxShadow: ELEV[4],
      fontFamily: FONT.sans,
      ...style,
    }}
  >
    <FooterButtons k={k} drafts acceptPress={acceptPress} acceptBusy={acceptBusy} dim={dim} />
    <Muted k={k} size={12.5}>
      {STR.acceptHelp}
    </Muted>
  </div>
);

/** Film-px offset of the Accept fix button's centre inside a FooterCard (for the cursor). */
export const footerAcceptCenter = (k: number) => ({ x: (18 + 4 * 8 + 97 + 124 + 131 + 52) * k, y: (16 + 18) * k });

/**
 * The small "Drift Reviewer" card that V21's signal reaches: the agent named in words (no Rovo marks), our tile at
 * avatar size, and its real review step from Rovo: "Please review", two "Submit fix proposal" actions, and the person's
 * "Confirm selected" (risk 5 in R3: the drafts are stored only after a person confirms, and they go to the panel).
 */
export const AgentCard: React.FC<{ k: number; rows?: number; confirmPress?: number; confirmed?: number; style?: React.CSSProperties }> = ({
  k,
  rows = 0,
  confirmPress = 0,
  confirmed = 0,
  style,
}) => (
  <div
    style={{
      width: 300 * k,
      boxSizing: "border-box",
      padding: `${14 * k}px ${16 * k}px ${16 * k}px`,
      borderRadius: 18 * k,
      background: DAY.surface,
      boxShadow: ELEV[3],
      fontFamily: FONT.sans,
      color: DAY.text,
      ...style,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 * k }}>
      <AppTile size={28 * k} />
      <div style={{ display: "grid", gap: 3 * k }}>
        <span style={{ fontSize: 15 * k, lineHeight: 1, fontWeight: 600 }}>Drift Reviewer</span>
        <span style={{ fontSize: 11.5 * k, lineHeight: 1, color: DAY.textMuted }}>Rovo agent</span>
      </div>
    </div>
    <div
      style={{
        marginTop: 12 * k,
        padding: `${10 * k}px ${11 * k}px`,
        borderRadius: 11 * k,
        boxShadow: `inset 0 0 0 ${1.25 * k}px ${DAY.line}`,
        display: "grid",
        gap: 8 * k,
      }}
    >
      <div style={{ fontSize: 12.5 * k, lineHeight: 1, fontWeight: 600 }}>Please review</div>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8 * k,
            fontSize: 12 * k,
            lineHeight: 1,
            opacity: rows > i ? 1 : 0,
            transform: `translateY(${rows > i ? 0 : 4 * k}px)`,
          }}
        >
          <span style={{ display: "grid", placeItems: "center", width: 15 * k, height: 15 * k, borderRadius: 4 * k, background: DAY.text }}>
            <Icon name="check" size={11 * k} color={DAY.surface} />
          </span>
          <span style={{ fontWeight: 600 }}>Submit fix proposal</span>
        </div>
      ))}
      <div style={{ marginTop: 2 * k, display: "flex", gap: 6 * k, opacity: rows >= 2 ? 1 - 0.5 * confirmed : 0 }}>
        <Button k={k * 0.82} kind="primary" press={confirmPress}>
          Confirm selected
        </Button>
        <Button k={k * 0.82} kind="subtle">
          Cancel
        </Button>
      </div>
    </div>
  </div>
);

export { SuccessNotice, CodeWell };
