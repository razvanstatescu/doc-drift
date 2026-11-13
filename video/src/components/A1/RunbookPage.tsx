import React from "react";
import { useCurrentFrame } from "remotion";
import { Badge } from "../../brand/Badge";
import { Icon } from "../../brand/icons";
import { FONT, NIGHT } from "../../brand/tokens";
import { EASE, tween } from "../../lib/time";
import { Slip } from "../../motion/slip";
import { RUNBOOK_TITLE, runbookStep } from "./runbook";

/**
 * The 3 a.m. runbook as a generic wiki page of our own (Night surface), laid out in FRAME px at zoom 1 so a <Camera>
 * can punch in on it. It is not shaped like Confluence: no sidebar, no avatars, no breadcrumb, no app chrome. The words
 * are the real runbook's (runbook.ts). The page runs past the bottom of the frame; the camera frames what matters.
 *
 * Byline: "check" (A1) is "Last reviewed 34 days ago" with a check that draws on at `checkAt`; "flagged" (A4) carries
 * the amber Possibly stale badge, which slips out of line at `slipAt` (the shot's one amber element).
 */

export const PAGE = { x: 176, y: 52, w: 1568, h: 1660 } as const;
const PAD = 96;
/** Content left edge (title, byline, headings, step numbers). */
export const X0 = PAGE.x + PAD; // 272
/** Step text and code blocks start here. */
export const TX = X0 + 64; // 336
export const TW = PAGE.x + PAGE.w - PAD - TX; // 1312

const BODY = 34;
const BODY_LH = 50;
const CODE = 32;
const CODE_LH = 46;
const CODE_PAD_Y = 22;
const codeH = (lines: number) => lines * CODE_LH + 2 * CODE_PAD_Y;

/** Block tops (frame px at zoom 1). Paragraph heights assume the line counts noted; checked on stills. */
export const LAYOUT = {
  eyebrow: 96,
  title: 140, // 76/84
  byline: 246, // 44 tall (check) or 63 (badge)
  divider: 336,
  steps: 372, // "Steps" 44/52
  s1: 456, // 2 lines
  c1: 572,
  s2: 748, // 2 lines
  c2: 864,
  after: 1024, // 2 lines
  s3: 1168, // 1 line
  c3: 1234,
} as const;

/** Step 2's code block, the shot's subject (frame px at zoom 1). */
export const CODE2 = { x: TX, y: LAYOUT.c2, w: TW, h: codeH(2) };
/** The title and byline block. */
export const HEAD = { x: X0, y: LAYOUT.title, w: TW + 64, h: LAYOUT.byline + 64 - LAYOUT.title };

const P = NIGHT;

const inlineCodeStyle: React.CSSProperties = {
  fontFamily: FONT.mono,
  fontSize: "0.88em",
  letterSpacing: "-0.01em",
  padding: "0.05em 0.3em",
  borderRadius: 8,
  background: P.surfaceSunk,
  color: P.text,
};

/** A paragraph with the runbook's inline code marked in mono. */
const Rich: React.FC<{ text: string; codes?: string[] }> = ({ text, codes = [] }) => {
  if (codes.length === 0) return <>{text}</>;
  const esc = codes.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${esc.join("|")})`, "g"));
  return (
    <>
      {parts.map((part, i) =>
        codes.includes(part) ? (
          <span key={i} style={inlineCodeStyle}>
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

const Para: React.FC<{ top: number; text: string; codes?: string[]; color?: string }> = ({ top, text, codes, color = P.text }) => (
  <div
    style={{
      position: "absolute",
      left: TX,
      top,
      width: TW,
      fontFamily: FONT.sans,
      fontWeight: 400,
      fontSize: BODY,
      lineHeight: `${BODY_LH}px`,
      letterSpacing: "-0.005em",
      color,
    }}
  >
    <Rich text={text} codes={codes} />
  </div>
);

const Num: React.FC<{ top: number; n: number }> = ({ top, n }) => (
  <div
    style={{
      position: "absolute",
      left: X0,
      top,
      width: 48,
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: BODY,
      lineHeight: `${BODY_LH}px`,
      color: P.textMuted,
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {`${n}.`}
  </div>
);

const CodeBlock: React.FC<{ top: number; lines: string[] }> = ({ top, lines }) => (
  <div
    style={{
      position: "absolute",
      left: TX,
      top,
      width: TW,
      height: codeH(lines.length),
      boxSizing: "border-box",
      padding: `${CODE_PAD_Y}px 32px`,
      borderRadius: 14,
      background: P.surfaceSunk,
      boxShadow: `0 0 0 1px ${P.line}`,
      fontFamily: FONT.mono,
      fontWeight: 400,
      fontSize: CODE,
      lineHeight: `${CODE_LH}px`,
      letterSpacing: "-0.01em",
      color: P.text,
      whiteSpace: "pre",
      overflow: "hidden",
    }}
  >
    {lines.join("\n")}
  </div>
);

/**
 * The check after "Last reviewed 34 days ago": it appears only when it draws on at `at` (A1 V05, on "fine"), so the
 * tick is never seen, lost on a cut and seen again. It sits after the text, so no empty slot shows before it.
 */
const DrawnCheck: React.FC<{ at?: number; size: number }> = ({ at, size }) => {
  const frame = useCurrentFrame();
  const p = at === undefined ? 1 : tween(frame, at, at + 9, 0, 1, EASE.expoOut);
  if (p <= 0) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ display: "block", overflow: "visible" }} aria-hidden>
      <path
        d="M4.5 10.5l3.75 3.75L15.5 6.5"
        pathLength={1}
        stroke={P.verified}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};

/** The A4 byline badge size (k): 84 px tall at zoom 1. */
const FLAG_BADGE = 3;

export const RunbookPage: React.FC<{
  byline: "check" | "flagged";
  /** "check": the check after the text draws on here (and is hidden before). */
  checkAt?: number;
  /** "flagged": the badge slips out of line here. */
  slipAt?: number;
}> = ({ byline, checkAt, slipAt = 0 }) => {
  const s1 = runbookStep(1);
  const s2 = runbookStep(2);
  const s3 = runbookStep(3);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: PAGE.x,
          top: PAGE.y,
          width: PAGE.w,
          height: PAGE.h,
          borderRadius: 24,
          background: P.surface,
          boxShadow: `0 0 0 1px ${P.line}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: X0,
          top: LAYOUT.title,
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: 76,
          lineHeight: "84px",
          letterSpacing: "-0.02em",
          color: P.text,
          whiteSpace: "nowrap",
        }}
      >
        {RUNBOOK_TITLE}
      </div>
      {byline === "check" ? (
        <div style={{ position: "absolute", left: X0, top: LAYOUT.byline, display: "flex", alignItems: "center", gap: 14, height: 44 }}>
          <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: BODY, lineHeight: "44px", color: P.textMuted }}>Last reviewed 34 days ago</span>
          <DrawnCheck at={checkAt} size={36} />
        </div>
      ) : (
        <div style={{ position: "absolute", left: X0, top: LAYOUT.byline - 6, display: "flex", alignItems: "center", height: 28 * FLAG_BADGE }}>
          <Slip at={slipAt} radius={8 * FLAG_BADGE} k={FLAG_BADGE} theme="night">
            <Badge state="possibly_stale" size={FLAG_BADGE} theme="night" />
          </Slip>
          {/* room for the badge to slip one unit (about 46 px) without touching the text */}
          <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: BODY, lineHeight: "44px", color: P.textMuted, marginLeft: 76 }}>
            Last reviewed 34 days ago
          </span>
        </div>
      )}
      <div style={{ position: "absolute", left: X0, top: LAYOUT.divider, width: TW + 64, height: 1, background: P.line }} />
      <div
        style={{
          position: "absolute",
          left: X0,
          top: LAYOUT.steps,
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: 44,
          lineHeight: "52px",
          letterSpacing: "-0.01em",
          color: P.text,
        }}
      >
        Steps
      </div>
      <Num top={LAYOUT.s1} n={1} />
      <Para top={LAYOUT.s1} text={s1.text} codes={s1.inlineCode} />
      {s1.code ? <CodeBlock top={LAYOUT.c1} lines={s1.code} /> : null}
      <Num top={LAYOUT.s2} n={2} />
      <Para top={LAYOUT.s2} text={s2.text} codes={s2.inlineCode} />
      {s2.code ? <CodeBlock top={LAYOUT.c2} lines={s2.code} /> : null}
      {s2.after ? <Para top={LAYOUT.after} text={s2.after} codes={s2.afterInlineCode} /> : null}
      <Num top={LAYOUT.s3} n={3} />
      <Para top={LAYOUT.s3} text={s3.text} codes={s3.inlineCode} />
      {s3.code ? <CodeBlock top={LAYOUT.c3} lines={s3.code} /> : null}
      <IconRow />
    </div>
  );
};

/** A quiet page icon above the title, so the surface reads as a document. */
const IconRow: React.FC = () => (
  <div style={{ position: "absolute", left: X0, top: LAYOUT.eyebrow, display: "flex", alignItems: "center", gap: 12, color: P.textMuted }}>
    <Icon name="page" size={34} color={P.textMuted} />
    <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 30, lineHeight: "34px" }}>Runbook</span>
  </div>
);
