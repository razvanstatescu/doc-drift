import React from "react";
import { Badge, type BadgeState } from "../../brand/Badge";
import { Icon, type IconName } from "../../brand/icons";
import { Mark } from "../../brand/Mark";
import { DAY, FONT, ink } from "../../v4/look";

/**
 * UI primitives for the P4 and P5 twins (review panel, comment, Jira card, dashboard, Track in Jira). Drawn from the
 * brand's interface kit (canvas board 5) at UI px times `k` (k = 2 puts a 15 px UI body at 30 film px), never a copy
 * of Atlassian's UI: our tokens, our badge, primary buttons filled with `text`. Every string a caller passes comes
 * from apps/core/src/frontend/shared/copy.ts, apps/core/src/lib/copy.ts or the capture (see each twin's header).
 */

export type K = { k: number };

/** Inline code as the panel shows it: Spline Sans Mono in a quiet sunk pill. `bare` drops the pill. */
export const Code: React.FC<{ k: number; children: React.ReactNode; bare?: boolean; color?: string; size?: string | number; style?: React.CSSProperties }> = ({
  k,
  children,
  bare,
  color,
  size = "0.88em",
  style,
}) => (
  <span
    style={{
      fontFamily: FONT.mono,
      fontSize: size,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      color,
      whiteSpace: "pre",
      background: bare ? undefined : DAY.surfaceSunk,
      borderRadius: 4 * k,
      padding: bare ? undefined : `${0.5 * k}px ${3.5 * k}px`,
      margin: bare ? undefined : `0 ${0.5 * k}px`,
      ...style,
    }}
  >
    {children}
  </span>
);

/** The arrow between two paths (Spline Sans has no arrow glyph that matches): the brand icon at text size. */
export const Arrow: React.FC<{ color?: string }> = ({ color = "currentColor" }) => (
  <span style={{ display: "inline-flex", verticalAlign: "-0.14em", margin: "0 0.32em" }}>
    <Icon name="arrow" size="1em" color={color} />
  </span>
);

/** A small chip (severity, labels). */
export const Chip: React.FC<{ k: number; children: React.ReactNode; bg?: string; color?: string; mono?: boolean; icon?: IconName; size?: number }> = ({
  k,
  children,
  bg = DAY.surfaceSunk,
  color = DAY.unanchored,
  mono,
  icon,
  size = 12,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5 * k,
      height: 22 * k,
      padding: `0 ${8 * k}px`,
      borderRadius: 7 * k,
      background: bg,
      color,
      fontFamily: mono ? FONT.mono : FONT.sans,
      fontWeight: mono ? 400 : 600,
      fontSize: (mono ? size - 0.5 : size) * k,
      lineHeight: 1,
      whiteSpace: "nowrap",
      flex: "none",
    }}
  >
    {icon ? <Icon name={icon} size={13 * k} color={color} /> : null}
    {children}
  </span>
);

/** Severity as the panel shows it, in our state colours: High on stale-tint, Medium on unanchored-tint. */
export const Severity: React.FC<{ k: number; level: "High" | "Medium" }> = ({ k, level }) =>
  level === "High" ? (
    <Chip k={k} bg={DAY.staleTint} color={DAY.stale}>
      High
    </Chip>
  ) : (
    <Chip k={k} bg={DAY.unanchoredTint} color={DAY.unanchored}>
      Medium
    </Chip>
  );

/**
 * A button at UI size times k. `primary` fills with the text colour (the brand rule); `default` is a white button
 * with a hairline edge; `subtle` and `link` have no body. `press` 0..1 sinks it (scale 0.97, a darker body);
 * `busy` 0..1 dims the label and shows three dots (the real button's loading state).
 */
export const Button: React.FC<{
  k: number;
  kind?: "primary" | "default" | "subtle" | "link";
  press?: number;
  busy?: number;
  dim?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ k, kind = "default", press = 0, busy = 0, dim = 0, children, style }) => {
  const primary = kind === "primary";
  const body = primary ? DAY.text : kind === "default" ? DAY.surface : "transparent";
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 36 * k,
        padding: `0 ${(kind === "subtle" || kind === "link" ? 10 : 15) * k}px`,
        borderRadius: 8 * k,
        background: body,
        color: primary ? DAY.ground : kind === "link" ? DAY.link : kind === "subtle" ? DAY.textMuted : DAY.text,
        boxShadow:
          kind === "default"
            ? `inset 0 0 0 ${1.25 * k}px ${press > 0 ? DAY.lineStrong : "#C3D3D7"}, 0 ${1 * k}px ${2 * k}px ${ink(0.06)}`
            : primary
              ? `0 ${2 * k}px ${6 * k}px ${ink(0.18 * (1 - press))}`
              : undefined,
        fontFamily: FONT.sans,
        fontWeight: 600,
        fontSize: 14 * k,
        lineHeight: 1,
        whiteSpace: "nowrap",
        transform: press > 0 ? `scale(${1 - 0.03 * press})` : undefined,
        filter: press > 0 && primary ? `brightness(${1 + 0.35 * press})` : undefined,
        opacity: 1 - 0.55 * dim,
        flex: "none",
        ...style,
      }}
    >
      <span style={{ opacity: 1 - 0.75 * busy }}>{children}</span>
      {busy > 0 ? (
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 * k, opacity: busy }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ width: 5 * k, height: 5 * k, borderRadius: "50%", background: primary ? DAY.ground : DAY.textMuted, opacity: 0.4 + 0.2 * i }}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
};

/** Our state badge at UI size times k (word and icon, never colour alone). `glow` only on the shot's one amber. */
export const StateBadge: React.FC<{ k: number; state: BadgeState; glow?: number; style?: React.CSSProperties }> = ({ k, state, glow = 0, style }) => (
  <Badge state={state} size={k * 0.86} glow={glow} theme="day" style={style} />
);

/** Initials in a circle (people). Never a photo, never a made-up name. */
export const Initials: React.FC<{ k: number; text: string; size?: number; bg?: string; color?: string }> = ({
  k,
  text,
  size = 28,
  bg = DAY.surfaceSunk,
  color = DAY.text,
}) => (
  <span
    style={{
      display: "inline-grid",
      placeItems: "center",
      width: size * k,
      height: size * k,
      borderRadius: "50%",
      background: bg,
      boxShadow: `0 0 0 ${1 * k}px ${DAY.line}`,
      color,
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: size * 0.4 * k,
      lineHeight: 1,
      flex: "none",
    }}
  >
    {text}
  </span>
);

/** The app's own identity (the Night tile) at avatar size. At 64 px or less its slip does not count as the amber. */
export const AppTile: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => <Mark size={size} variant="icon" style={style} />;

/** A white card inside a panel: a hairline edge, no shadow (the panel carries the height). */
export const cardStyle = (k: number, extra?: React.CSSProperties): React.CSSProperties => ({
  boxSizing: "border-box",
  borderRadius: 12 * k,
  background: DAY.surface,
  boxShadow: `inset 0 0 0 ${1.25 * k}px ${DAY.line}`,
  ...extra,
});

/** A section heading (h4) inside a panel. */
export const H4: React.FC<{ k: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ k, children, style }) => (
  <div style={{ fontFamily: FONT.sans, fontSize: 16 * k, lineHeight: `${22 * k}px`, fontWeight: 600, color: DAY.text, whiteSpace: "nowrap", ...style }}>
    {children}
  </div>
);

/** Muted helper text. */
export const Muted: React.FC<{ k: number; children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ k, children, size = 13, style }) => (
  <div style={{ fontFamily: FONT.sans, fontSize: size * k, lineHeight: `${(size + 6) * k}px`, color: DAY.textMuted, ...style }}>{children}</div>
);

/**
 * A success notice in our colours (the real UI's success section message): verified-tint body, the check in the
 * verified colour, a title, a body line and an optional quiet button. `show` 0..1 grows it in (height is the
 * caller's: the notice is laid out at full size and revealed).
 */
export const SuccessNotice: React.FC<{ k: number; title: React.ReactNode; body?: React.ReactNode; button?: string; style?: React.CSSProperties }> = ({
  k,
  title,
  body,
  button,
  style,
}) => (
  <div
    style={{
      boxSizing: "border-box",
      display: "flex",
      gap: 12 * k,
      padding: `${14 * k}px ${16 * k}px ${15 * k}px`,
      borderRadius: 12 * k,
      background: DAY.verifiedTint,
      fontFamily: FONT.sans,
      color: DAY.text,
      ...style,
    }}
  >
    <span
      style={{
        flex: "none",
        display: "grid",
        placeItems: "center",
        width: 20 * k,
        height: 20 * k,
        marginTop: 1 * k,
        borderRadius: "50%",
        background: DAY.verified,
      }}
    >
      <Icon name="check" size={14 * k} color={DAY.surface} />
    </span>
    <div style={{ minWidth: 0, display: "grid", gap: 6 * k }}>
      <div style={{ fontSize: 15 * k, lineHeight: `${21 * k}px`, fontWeight: 600 }}>{title}</div>
      {body ? <div style={{ fontSize: 14 * k, lineHeight: `${20 * k}px` }}>{body}</div> : null}
      {button ? (
        <div style={{ marginTop: 2 * k }}>
          <Button k={k * 0.86}>{button}</Button>
        </div>
      ) : null}
    </div>
  </div>
);

/** One line of a diff: "-" in the stale colour on its tint, "+" in the verified colour on its tint. */
export type DiffLine = { sign: "-" | "+" | " "; text: string };

/**
 * A diff well as the panel renders drafts: line numbers in a gutter, "-" and "+" lines in our state colours (diff
 * tints are the one place state colours appear outside badges). Long lines wrap like the real code block.
 */
export const DiffWell: React.FC<{ k: number; lines: DiffLine[]; size?: number; numbers?: boolean; style?: React.CSSProperties }> = ({
  k,
  lines,
  size = 12,
  numbers = true,
  style,
}) => (
  <div
    style={{
      boxSizing: "border-box",
      display: "grid",
      gridTemplateColumns: numbers ? `${22 * k}px 1fr` : "1fr",
      borderRadius: 9 * k,
      overflow: "hidden",
      background: DAY.surfaceSunk,
      fontFamily: FONT.mono,
      fontSize: size * k,
      lineHeight: `${(size + 7) * k}px`,
      letterSpacing: "-0.01em",
      ...style,
    }}
  >
    {lines.map((l, i) => (
      <React.Fragment key={i}>
        {numbers ? (
          <span
            style={{
              padding: `${i === 0 ? 7 * k : 0}px 0 ${i === lines.length - 1 ? 7 * k : 0}px`,
              textAlign: "center",
              color: DAY.textMuted,
              background: "#DDE6E8",
            }}
          >
            {i + 1}
          </span>
        ) : null}
        <span
          style={{
            padding: `${i === 0 ? 7 * k : 0}px ${10 * k}px ${i === lines.length - 1 ? 7 * k : 0}px`,
            color: l.sign === "-" ? DAY.stale : l.sign === "+" ? DAY.verified : DAY.text,
            background: l.sign === "-" ? "rgba(251, 231, 227, 0.75)" : l.sign === "+" ? "rgba(227, 244, 236, 0.85)" : undefined,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {l.sign === " " ? l.text : `${l.sign} ${l.text}`}
        </span>
      </React.Fragment>
    ))}
  </div>
);

/** A code well (plain lines, a gutter with numbers). `children` replaces a line's text when it needs inline marks. */
export const CodeWell: React.FC<{ k: number; lines: React.ReactNode[]; size?: number; style?: React.CSSProperties }> = ({ k, lines, size = 12, style }) => (
  <div
    style={{
      boxSizing: "border-box",
      display: "grid",
      gridTemplateColumns: `${22 * k}px 1fr`,
      borderRadius: 9 * k,
      overflow: "hidden",
      background: DAY.surfaceSunk,
      fontFamily: FONT.mono,
      fontSize: size * k,
      lineHeight: `${(size + 7) * k}px`,
      letterSpacing: "-0.01em",
      ...style,
    }}
  >
    {lines.map((l, i) => (
      <React.Fragment key={i}>
        <span
          style={{
            padding: `${i === 0 ? 7 * k : 0}px 0 ${i === lines.length - 1 ? 7 * k : 0}px`,
            textAlign: "center",
            color: DAY.textMuted,
            background: "#DDE6E8",
          }}
        >
          {i + 1}
        </span>
        <span style={{ padding: `${i === 0 ? 7 * k : 0}px ${10 * k}px ${i === lines.length - 1 ? 7 * k : 0}px`, whiteSpace: "pre", color: DAY.text }}>{l}</span>
      </React.Fragment>
    ))}
  </div>
);

/** The film's 0..1 press curve for a pressable (in 4 f, hold 2 f, out 8 f), from the frame of the click. */
export function pressCurve(frame: number, at: number | undefined) {
  if (at === undefined) return 0;
  const t = frame - at;
  if (t < -4 || t > 10) return 0;
  if (t < 0) return (t + 4) / 4;
  if (t <= 2) return 1;
  return Math.max(0, 1 - (t - 2) / 8);
}
