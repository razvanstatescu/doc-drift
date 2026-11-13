import React from "react";
import { AbsoluteFill, Img, Series, staticFile } from "remotion";
import { Badge, BadgeSwap, type BadgeState } from "./brand/Badge";
import { Icon, ICON_NAMES } from "./brand/icons";
import { Lockup } from "./brand/Lockup";
import { Mark, MarkReveal } from "./brand/Mark";
import { useTheme, World } from "./brand/theme";
import { FONT, typeStyle, type ThemeName } from "./brand/tokens";
import { AnchorLines } from "./components/AnchorLines";
import { BrowserFrame, frameContent } from "./components/BrowserFrame";
import { Caption } from "./components/Caption";
import { Chip, Code } from "./components/Chip";
import { QuoteCard } from "./components/QuoteCard";
import { Shot } from "./components/Shot";
import { StatCard } from "./components/StatCard";
import { Terminal } from "./components/Terminal";
import { Timer } from "./components/Timer";
import { Sfx } from "./audio/Sfx";
import { measured } from "./lib/captures";
import { Slip, SlipCut } from "./motion/slip";
import { SetIn } from "./motion/text";
import { Whip } from "./motion/whip";

/**
 * The kit gallery (composition "Kit"): every kit component on Night and on Day, one page per 120 frames, each page
 * animating from its own frame 0 and then holding. Review it in Studio or with stills; kitFrame("mark", 30) gives
 * the composition frame of a page's local frame. Sample copy comes from the brand files and the script, not invented.
 */
export const KIT_PAGES = ["brand-night", "brand-day", "mark", "mark-check", "type-night", "type-day", "cards-night", "terminal", "anchors", "anchors-night", "slipcut", "shot", "whip"] as const;
export type KitPage = (typeof KIT_PAGES)[number];
export const KIT_PAGE_FRAMES = 120;
export const KIT_FRAMES = KIT_PAGES.length * KIT_PAGE_FRAMES;
export const kitFrame = (page: KitPage, local: number) => KIT_PAGES.indexOf(page) * KIT_PAGE_FRAMES + local;

const STATES: BadgeState[] = ["verified", "possibly_stale", "stale", "unanchored"];

const PageLabel: React.FC<{ children: string }> = ({ children }) => {
  const p = useTheme();
  return <div style={{ position: "absolute", left: 96, top: 48, ...typeStyle("credit"), color: p.textMuted }}>{children}</div>;
};

const Note: React.FC<{ children: string; x: number; y: number }> = ({ children, x, y }) => {
  const p = useTheme();
  return <div style={{ position: "absolute", left: x, top: y, fontFamily: FONT.mono, fontSize: 20, color: p.textMuted }}>{children}</div>;
};

const BrandSheet: React.FC<{ theme: ThemeName }> = ({ theme }) => (
  <World theme={theme}>
    <BrandSheetBody theme={theme} />
  </World>
);

const BrandSheetBody: React.FC<{ theme: ThemeName }> = ({ theme }) => {
  const p = useTheme();
  return (
    <>
      <PageLabel>{`Kit · brand on ${theme === "night" ? "Night shift" : "Day"}`}</PageLabel>
      <div style={{ position: "absolute", left: 96, top: 116, display: "flex", alignItems: "center", gap: 120 }}>
        <Lockup height={132} />
        <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
          <Mark size={132} variant={theme === "night" ? "icon" : "icon-light"} />
          <Mark size={132} variant={theme === "night" ? "flat" : "flat-ink"} />
          <Mark size={64} variant={theme === "night" ? "icon" : "icon-light"} />
          <Mark size={32} variant={theme === "night" ? "flat" : "flat-ink"} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 96, top: 316, display: "flex", gap: 36, alignItems: "center" }}>
        {STATES.map((s) => (
          <Badge key={s} state={s} size="md" />
        ))}
      </div>
      <div style={{ position: "absolute", left: 96, top: 436, display: "flex", gap: 24, alignItems: "center" }}>
        {STATES.map((s) => (
          <Badge key={s} state={s} size="sm" />
        ))}
        {STATES.map((s) => (
          <Badge key={`xs-${s}`} state={s} size="xs" />
        ))}
      </div>
      <div style={{ position: "absolute", left: 96, top: 540, width: 1728, display: "flex", flexWrap: "wrap", rowGap: 22 }}>
        {ICON_NAMES.map((n) => (
          <div key={n} style={{ width: 96, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Icon name={n} size={44} color={p.textMuted} />
            <span style={{ fontFamily: FONT.mono, fontSize: 15, color: p.textMuted }}>{n}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 96, top: 790, display: "flex", gap: 28, alignItems: "center" }}>
        <Chip prefix="payments-api:" icon="anchor" size={40}>
          scripts/rollback.sh
        </Chip>
        <Chip icon="page" size={40}>
          deploy/helm/**
        </Chip>
        <Chip icon="ticket" size={40}>
          PAY-142
        </Chip>
      </div>
      <div style={{ position: "absolute", left: 96, top: 900, display: "flex", gap: 28, alignItems: "center" }}>
        <Chip tone="sunk" size={40}>
          {"rollback.sh -> rollback-v2.sh"}
        </Chip>
        <Chip tone="beacon" icon="slip" size={40}>
          status: possibly_stale
        </Chip>
      </div>
    </>
  );
};

const MarkPage: React.FC = () => (
  <World theme="night">
    <PageLabel>Kit · the mark (exact artwork; only the slipped band moves). Static slip 0, 0.5, 1, then MarkReveal from f0</PageLabel>
    {[0, 0.5, 1].map((s, i) => (
      <div key={s} style={{ position: "absolute", left: 96 + i * 400, top: 150 }}>
        <Mark size={340} variant="icon" slip={s} />
        <Note x={130} y={360}>{`slip ${s}`}</Note>
      </div>
    ))}
    <div style={{ position: "absolute", left: 1350, top: 150 }}>
      <MarkReveal size={340} variant="icon" at={0} />
      <Note x={100} y={360}>MarkReveal</Note>
    </div>
    <div style={{ position: "absolute", left: 96, top: 640 }}>
      <Lockup height={150} at={0} />
    </div>
    <div style={{ position: "absolute", left: 1350, top: 610, display: "flex", gap: 40, alignItems: "center" }}>
      <Mark size={170} variant="flat" slip={0} />
      <Mark size={170} variant="flat" slip={1} />
    </div>
  </World>
);

/** The artwork check: each file in public/brand (left of each pair) beside the Mark component (right), 400 px. */
const MarkCheck: React.FC = () => {
  const pairs: { file: string; variant: "icon" | "icon-light" | "flat" | "flat-ink"; ground: string }[] = [
    { file: "brand/doc-drift-icon.svg", variant: "icon", ground: "#072630" },
    { file: "brand/doc-drift-icon-light.svg", variant: "icon-light", ground: "#F2F6F7" },
    { file: "brand/doc-drift-mark-reversed.svg", variant: "flat", ground: "#072630" },
    { file: "brand/doc-drift-mark.svg", variant: "flat-ink", ground: "#F2F6F7" },
  ];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {pairs.map((pr, i) => (
        <div key={pr.file} style={{ position: "absolute", left: (i % 2) * 960, top: Math.floor(i / 2) * 540, width: 960, height: 540, background: pr.ground }}>
          <Img src={staticFile(pr.file)} style={{ position: "absolute", left: 40, top: 70, width: 400, height: 400 }} />
          <div style={{ position: "absolute", left: 520, top: 70 }}>
            <Mark size={400} variant={pr.variant} />
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

const TypeNight: React.FC = () => {
  const p = useTheme("night");
  return (
    <World theme="night">
      <PageLabel>Kit · type on Night: Caption (hero), QuoteCard, SetIn body, small, credit, Code</PageLabel>
      <div style={{ position: "absolute", left: 96, top: 120 }}>
        <Caption at={0} size="hero">
          The code moved.
        </Caption>
      </div>
      <div style={{ position: "absolute", left: 96, top: 380 }}>
        <QuoteCard
          at={6}
          width={1000}
          size={56}
          quote="Bad documentation or outdated documentation is worse than no documentation."
          source="Docs or it didn't happen, foss-north"
          year={2019}
        />
      </div>
      <div style={{ position: "absolute", left: 1180, top: 400, width: 640, display: "flex", flexDirection: "column", gap: 40 }}>
        <SetIn at={10} style={{ ...typeStyle("body"), color: p.text }}>
          {"It's 3 a.m. Payments is down."}
        </SetIn>
        <SetIn at={14} style={{ ...typeStyle("small"), color: p.textMuted }}>
          For teams who keep runbooks in Confluence
        </SetIn>
        <div style={{ ...typeStyle("literal") }}>
          <Code>./scripts/rollback.sh</Code>
        </div>
        <div style={{ ...typeStyle("literal") }}>
          <Code color={p.textMuted}>{"rollback.sh -> rollback-v2.sh"}</Code>
        </div>
        <div style={{ ...typeStyle("credit"), color: p.textMuted }}>foss-north 2019 · CC BY</div>
      </div>
    </World>
  );
};

const TypeDay: React.FC<{ theme?: ThemeName }> = ({ theme = "day" }) => (
  <World theme={theme}>
    <PageLabel>{`Kit · type on ${theme === "day" ? "Day" : "Night"}: Caption (headline), StatCard (count), Timer`}</PageLabel>
    <div style={{ position: "absolute", left: 96, top: 130 }}>
      <Caption at={0}>{"A date can't see a merge."}</Caption>
    </div>
    <div style={{ position: "absolute", left: 96, top: 470, display: "flex", gap: 40, alignItems: "stretch" }}>
      <StatCard at={4} value={0} label="AI calls" note="Deterministic matcher" />
      <StatCard at={8} value={40} count={{ dur: 30 }} label="scenarios" note="Our eval set" />
      <div style={{ paddingTop: 40, paddingLeft: 40 }}>
        <Timer at={10} dur={45} seconds={measured("mergeToFlagSeconds", 11)} label="Merge to flag" />
      </div>
    </div>
  </World>
);

const TerminalPage: React.FC = () => (
  <World theme="day">
    <PageLabel>Kit · Terminal (streams lines; state words in their colours)</PageLabel>
    <div style={{ position: "absolute", left: 160, top: 130 }}>
      <Terminal
        width={1600}
        height={860}
        title="Coding agent · MCP"
        lines={[
          { at: 0, kind: "cmd", text: "Before I edit deploy/helm/values.yaml, which docs describe it?" },
          { at: 42, kind: "tool", text: "doc-drift · find-docs-for-path (payments-api, deploy/helm/values.yaml)" },
          { at: 52, kind: "json", text: '{ "title": "Payments rollback runbook", "status": "possibly_stale" }' },
          { at: 56, kind: "json", text: '{ "title": "Scaling payment workers", "status": "verified" }' },
          { at: 68, kind: "tool", text: "doc-drift · check-page-freshness (Payments rollback runbook)" },
          {
            at: 78,
            kind: "json",
            text: '"guidance": "Do not present steps from this page as current. Cite with caveat: changed by PR #482 on 2026-12-02."',
          },
          { at: 94, kind: "agent", text: "I'll update the runbook in the same PR." },
        ]}
      />
    </div>
  </World>
);

const AnchorsPage: React.FC<{ theme?: ThemeName }> = ({ theme = "day" }) => {
  const p = useTheme(theme);
  const token = { x: 400, y: 444, w: 482, h: 64 };
  const chips = [
    { x: 1010, y: 262, w: 0, h: 76 },
    { x: 1010, y: 452, w: 0, h: 76 },
    { x: 1010, y: 642, w: 0, h: 76 },
  ];
  return (
    <World theme={theme}>
      <PageLabel>Kit · AnchorLines from a token to chips; Slip with trace and glow, snap back with BadgeSwap</PageLabel>
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 200,
          width: 800,
          height: 560,
          borderRadius: 24,
          background: p.surface,
          boxShadow: `0 0 0 1px ${p.line}`,
          padding: "56px 64px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ ...typeStyle("title"), fontSize: 52, lineHeight: "60px", color: p.text }}>Payments rollback runbook</div>
        <div style={{ ...typeStyle("small"), color: p.textMuted, marginTop: 36 }}>Step 1. Page the on-call engineer.</div>
      </div>
      <div style={{ position: "absolute", left: 160, top: 448, ...typeStyle("small"), color: p.textMuted }}>Step 2. Run</div>
      <div style={{ position: "absolute", left: token.x, top: token.y, height: token.h, display: "flex", alignItems: "center" }}>
        <Code style={{ fontSize: 40, background: p.surfaceSunk, padding: "6px 14px", borderRadius: 10 }}>./scripts/rollback.sh</Code>
      </div>
      <AnchorLines at={10} from={token} to={chips} />
      <div style={{ position: "absolute", left: chips[0].x, top: chips[0].y }}>
        <Chip prefix="payments-api:" icon="anchor" size={40}>
          scripts/rollback.sh
        </Chip>
      </div>
      <div style={{ position: "absolute", left: chips[1].x, top: chips[1].y }}>
        <Chip icon="page" size={40}>
          deploy/helm/**
        </Chip>
      </div>
      <div style={{ position: "absolute", left: chips[2].x, top: chips[2].y }}>
        <Chip icon="ticket" size={40}>
          PAY-142
        </Chip>
      </div>
      <div style={{ position: "absolute", left: 96, top: 860, display: "flex", gap: 80, alignItems: "center" }}>
        <Slip at={20} back={80} radius={24}>
          <BadgeSwap from="possibly_stale" to="verified" at={80} size="md" glowFrom={0} />
        </Slip>
        <Sfx id="slip" at={20 + 6} />
        <Sfx id="snap" at={80 + 2} />
        <div style={{ ...typeStyle("credit"), color: p.textMuted }}>slips at f20 (6 f), snaps back at f80 (8 f)</div>
      </div>
    </World>
  );
};

const SlipCutPage: React.FC = () => (
  <SlipCut
    at={30}
    from={
      <World theme="night">
        <PageLabel>Kit · SlipCut at f30 (8 f): Night slips, Day is behind it</PageLabel>
        <Caption center size="hero" lines={["It's 3 a.m.", "Payments is down."]} />
      </World>
    }
    to={
      <World theme="day">
        <PageLabel>Kit · after the slip cut</PageLabel>
        <Caption center size="headline" lines={["Doc Drift Sentinel anchors", "each Confluence page to the code", "and Jira work it describes."]} />
      </World>
    }
  />
);

const ShotPage: React.FC = () => {
  const box = frameContent(1600, 880, "Sample capture (kit page rendered at 2x)");
  return (
    <World theme="day">
      <PageLabel>Kit · BrowserFrame + Shot: punch-in f20, cursor click f30, loupe f50, a mask over the lockup name</PageLabel>
      <div style={{ position: "absolute", left: 160, top: 120 }}>
        <BrowserFrame width={1600} height={880} label="Sample capture (kit page rendered at 2x)">
          <Shot
            src="kit/sample-capture.png"
            srcWidth={3840}
            srcHeight={2160}
            width={box.width}
            height={box.height}
            keys={[{ frame: 20, x: 1250, y: 740, zoom: 1.6 }]}
            cursor={[
              { frame: 0, x: 2200, y: 1500 },
              { frame: 30, x: 960, y: 760, click: true, cursor: "pointer" },
            ]}
            loupe={{ from: 50, x: 1180, y: 760, zoom: 2, radius: 160, at: [1240, 560] }}
            masks={[{ box: [560, 290, 1100, 150], why: "kit test of a flat cover" }]}
          />
        </BrowserFrame>
      </div>
    </World>
  );
};

const WhipPage: React.FC = () => (
  <Whip
    at={40}
    from={
      <World theme="day">
        <PageLabel>Kit · Whip at f40 (8 f), directional blur on the moving layer only</PageLabel>
        <Caption center size="headline">
          Bitbucket
        </Caption>
      </World>
    }
    to={
      <World theme="day" ground="surface">
        <PageLabel>Kit · after the whip</PageLabel>
        <Caption center size="headline">
          Confluence
        </Caption>
      </World>
    }
  />
);

const PAGES: Record<KitPage, React.FC> = {
  "brand-night": () => <BrandSheet theme="night" />,
  "brand-day": () => <BrandSheet theme="day" />,
  mark: MarkPage,
  "mark-check": MarkCheck,
  "type-night": TypeNight,
  "type-day": () => <TypeDay theme="day" />,
  "cards-night": () => <TypeDay theme="night" />,
  terminal: TerminalPage,
  anchors: () => <AnchorsPage theme="day" />,
  "anchors-night": () => <AnchorsPage theme="night" />,
  slipcut: SlipCutPage,
  shot: ShotPage,
  whip: WhipPage,
};

export const Kit: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Series>
      {KIT_PAGES.map((page) => {
        const Page = PAGES[page];
        return (
          <Series.Sequence key={page} durationInFrames={KIT_PAGE_FRAMES} name={page}>
            <Page />
          </Series.Sequence>
        );
      })}
    </Series>
  </AbsoluteFill>
);
