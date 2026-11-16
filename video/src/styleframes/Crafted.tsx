import React from "react";
import { Badge, type BadgeState } from "../brand/Badge";
import { Icon, type IconName } from "../brand/icons";
import { Mark } from "../brand/Mark";
import { SLIP_UNIT } from "../brand/tokens";
import { amber, DAY, ELEV, type Elev, FONT, ink } from "./look";

/**
 * Crafted product objects for the Day film: drawn from the brand's interface kit (brand canvas, board 5), never a copy
 * of Confluence. Sizes are UI px times k (k = 2 puts brand UI at film size). Copy is the real runbook's wording
 * (captures.json -> runbookText) and the brand's microcopy library.
 */

/** Inline literal in Spline Sans Mono. `->` is drawn as the brand arrow (Spline Sans has no arrow glyph). */
export const Lit: React.FC<{ children: string; size?: number | string; color?: string; weight?: number; style?: React.CSSProperties }> = ({
  children,
  size = "0.9em",
  color,
  weight = 400,
  style,
}) => {
  const parts = children.split(/\s*->\s*/);
  return (
    <span style={{ fontFamily: FONT.mono, fontSize: size, fontWeight: weight, letterSpacing: "-0.01em", color, whiteSpace: "pre", ...style }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {p}
          {i < parts.length - 1 ? (
            <span style={{ display: "inline-flex", verticalAlign: "-0.14em", margin: "0 0.4em" }}>
              <Icon name="arrow" size="1em" color={color ?? "currentColor"} />
            </span>
          ) : null}
        </React.Fragment>
      ))}
    </span>
  );
};

/** A state badge that has slipped one unit right of its home, its trace left behind, with the slip's bloom. */
export const SlippedBadge: React.FC<{ state?: BadgeState; size: number; slip?: number; bloom?: number }> = ({ state = "possibly_stale", size, slip = 1, bloom = 1 }) => (
  <span style={{ position: "relative", display: "inline-grid" }}>
    {slip > 0.01 ? <span style={{ gridArea: "1 / 1", borderRadius: 8 * size, background: DAY.trace, opacity: Math.min(1, slip / 0.25) }} /> : null}
    <span style={{ gridArea: "1 / 1", position: "relative", transform: `translateX(${slip * SLIP_UNIT * 100}%)` }}>
      {bloom > 0 ? (
        <span
          style={{
            position: "absolute",
            left: "-34%",
            right: "-34%",
            top: "-90%",
            bottom: "-90%",
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${amber(0.26 * bloom)} 0%, ${amber(0.08 * bloom)} 60%, transparent 100%)`,
          }}
        />
      ) : null}
      <Badge state={state} size={size} glow={slip} style={{ position: "relative" }} />
    </span>
  </span>
);

/** A small UI chip at UI size times k. */
export const UiChip: React.FC<{ k: number; children: React.ReactNode; bg?: string; color?: string; mono?: boolean; icon?: IconName }> = ({
  k,
  children,
  bg = DAY.surfaceSunk,
  color = DAY.unanchored,
  mono,
  icon,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5 * k,
      height: 24 * k,
      padding: `0 ${8.5 * k}px`,
      borderRadius: 8 * k,
      background: bg,
      color,
      fontFamily: mono ? FONT.mono : FONT.sans,
      fontWeight: mono ? 400 : 500,
      fontSize: (mono ? 11.5 : 12) * k,
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}
  >
    {icon ? <Icon name={icon} size={14 * k} color={color} /> : null}
    {children}
  </span>
);

/** The drifted token in a code line: the trace under it and a hairline beneath, never a second amber. */
export const Drifted: React.FC<{ children: string; k: number }> = ({ children, k }) => (
  <span style={{ background: DAY.trace, borderRadius: 4 * k, padding: `${1 * k}px ${2.5 * k}px`, margin: `0 ${-1 * k}px`, boxShadow: `inset 0 ${-1.6 * k}px 0 ${DAY.text}` }}>
    {children}
  </span>
);

/**
 * The runbook as a crafted page card: crumbs, title, byline with the state badge, the Steps section with step 2's code
 * well, and the trace where the rest of the page sits. `slip` slides the badge out of line (0 home, 1 slipped).
 */
export const PageCard: React.FC<{
  k?: number;
  width?: number;
  state?: BadgeState;
  slip?: number;
  bloom?: number;
  elev?: Elev;
  radius?: number;
  steps?: 1 | 2 | 3;
  style?: React.CSSProperties;
}> = ({ k = 2, width = 440, state = "possibly_stale", slip = 1, bloom = 1, elev = 3, radius = 24, steps = 3, style }) => {
  const u = (n: number) => n * k;
  const muted = DAY.textMuted;
  const li = (n: number, body: React.ReactNode) => (
    <li style={{ display: "flex", gap: u(10) }}>
      <span style={{ color: muted, fontVariantNumeric: "tabular-nums", minWidth: u(14) }}>{n}.</span>
      <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
    </li>
  );
  return (
    <div
      style={{
        width: u(width),
        boxSizing: "border-box",
        padding: `${u(28)}px ${u(32)}px ${u(30)}px`,
        borderRadius: u(radius) * 0.8,
        background: DAY.surface,
        boxShadow: ELEV[elev],
        fontFamily: FONT.sans,
        color: DAY.text,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: u(6), fontSize: u(13), lineHeight: 1, fontWeight: 500, color: muted }}>
        <Icon name="page" size={u(15)} color={muted} />
        <span>Platform</span>
        <span style={{ opacity: 0.6 }}>/</span>
        <span>Runbooks</span>
      </div>
      <div style={{ marginTop: u(13), fontSize: u(27), lineHeight: `${u(33)}px`, fontWeight: 600, letterSpacing: "-0.014em" }}>Payments rollback runbook</div>
      <div style={{ marginTop: u(14), display: "flex", alignItems: "center", gap: u(10), fontSize: u(13.5), lineHeight: 1, color: muted }}>
        <span
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: u(24),
            height: u(24),
            borderRadius: "50%",
            background: DAY.surfaceSunk,
            boxShadow: `0 0 0 ${u(1)}px ${DAY.line}`,
            color: DAY.text,
            fontSize: u(11),
            fontWeight: 600,
          }}
        >
          D
        </span>
        <span>Owned by Dana</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <SlippedBadge state={state} size={k} slip={state === "possibly_stale" ? slip : 0} bloom={state === "possibly_stale" ? bloom : 0} />
      </div>
      <div style={{ marginTop: u(26), height: u(1), background: DAY.line }} />
      <div style={{ marginTop: u(20), fontSize: u(18), lineHeight: `${u(24)}px`, fontWeight: 600 }}>Steps</div>
      <ol style={{ margin: `${u(12)}px 0 0`, padding: 0, listStyle: "none", display: "grid", gap: u(14), fontSize: u(15), lineHeight: `${u(23)}px` }}>
        {li(1, "Confirm the current and previous release.")}
        {steps >= 2
          ? li(
              2,
              <>
                Run the rollback script from the root of the <Lit>payments-api</Lit> repo.
                <div
                  style={{
                    marginTop: u(9),
                    padding: `${u(9)}px ${u(12)}px`,
                    borderRadius: u(10),
                    background: DAY.surfaceSunk,
                    fontFamily: FONT.mono,
                    fontSize: u(11.6),
                    lineHeight: `${u(20)}px`,
                    letterSpacing: "-0.01em",
                    whiteSpace: "pre",
                  }}
                >
                  {"./scripts/"}
                  <Drifted k={k}>rollback.sh</Drifted>
                  {" --timeout $ROLLBACK_TIMEOUT"}
                </div>
              </>,
            )
          : null}
        {steps >= 3 ? li(3, "Check that the pods are on the previous image tag and passing readiness.") : null}
      </ol>
      <div
        style={{
          marginTop: u(22),
          display: "grid",
          gap: u(10),
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 100%)",
          maskImage: "linear-gradient(180deg, #000 0%, transparent 100%)",
        }}
      >
        {[88, 74, 52].map((w) => (
          <div key={w} style={{ width: `${w}%`, height: u(9), borderRadius: u(5), background: DAY.trace }} />
        ))}
      </div>
    </div>
  );
};

/** An anchor as a chip: the repo (muted) over the path (mono), and, when it changed, what changed and where. */
export const AnchorChip: React.FC<{
  icon?: IconName;
  repo: string;
  path: string;
  change?: { by: string; what: string; to?: string };
  elev?: Elev;
  width?: number;
  style?: React.CSSProperties;
}> = ({ icon = "anchor", repo, path, change, elev = 2, width, style }) => (
  <div
    style={{
      width,
      boxSizing: "border-box",
      padding: "20px 26px 22px",
      borderRadius: 20,
      background: DAY.surface,
      boxShadow: ELEV[elev],
      fontFamily: FONT.sans,
      color: DAY.text,
      ...style,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, lineHeight: 1, fontWeight: 500, color: DAY.textMuted }}>
      <Icon name={icon} size={26} color={DAY.textMuted} />
      {repo}
    </div>
    <div style={{ marginTop: 14 }}>
      <Lit size={32}>{path}</Lit>
    </div>
    {change ? (
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: `2px solid ${DAY.line}`, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 23, lineHeight: 1, fontWeight: 500, color: DAY.textMuted }}>
          <Icon name="merge" size={24} color={DAY.textMuted} />
          <Lit size={22} color={DAY.text} weight={500}>
            {change.by}
          </Lit>
          <span>{change.what}</span>
        </div>
        {change.to ? <Lit size={26} color={DAY.text}>{`-> ${change.to}`}</Lit> : null}
      </div>
    ) : null}
  </div>
);

/** A primary or quiet button at UI size times k (primary fills with the text colour: the brand rule). */
export const UiButton: React.FC<{ k: number; kind?: "primary" | "secondary" | "quiet" | "link"; children: React.ReactNode; style?: React.CSSProperties }> = ({
  k,
  kind = "secondary",
  children,
  style,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      height: 40 * k,
      padding: `0 ${(kind === "quiet" || kind === "link" ? 12 : 18) * k}px`,
      borderRadius: 8 * k,
      background: kind === "primary" ? DAY.text : "transparent",
      color: kind === "primary" ? DAY.ground : kind === "link" ? DAY.link : kind === "quiet" ? DAY.textMuted : DAY.text,
      boxShadow: kind === "secondary" ? `inset 0 0 0 ${1.5 * k}px ${DAY.lineStrong}` : kind === "primary" ? `0 ${2 * k}px ${6 * k}px ${ink(0.18)}` : undefined,
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: 14.5 * k,
      lineHeight: 1,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

/** The brand mark as an avatar or header icon (the Night tile, the primary icon everywhere there is room). */
export const Tile: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => <Mark size={size} variant="icon" style={style} />;
