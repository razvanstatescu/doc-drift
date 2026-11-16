import React from "react";
import { DAY, ELEV, FONT, ink, type Elev, type Rect } from "../../v4/look";
import { AppTile, Initials } from "./ui";

/**
 * CommentTwin: the one footer comment Doc Drift Sentinel left for the page owner after the merge (capture p4-comment;
 * the text is verbatim from captures.json -> p4-comment.notes). Our look: a white card with the app's tile as the
 * author's avatar, the mention as a Mist pill (never Atlassian blue). The line break sits where the capture breaks
 * ("... this page documents." / "Review in the Doc Drift badge."), so the morph to R13 lands word on word.
 *
 * Props are state only: `mentionPop` 0..1 is the pop on "owner" (the scene drives it), `elev` the card's height.
 */

export const COMMENT = {
  author: "Doc Drift Sentinel",
  mention: "Razvan Statescu",
  line1: "PR #482 (merged by Razvan Statescu) changed 2 files this page documents.",
  line2: "Review in the Doc Drift badge.",
  heading: "Comments",
} as const;

/** Layout in UI px (multiply by k). The card's inner rects, so scenes can aim a morph or a camera at them. */
export const COMMENT_UI = {
  width: 776,
  height: 196,
  pad: 30,
  /** "Comments" heading row. */
  heading: { x: 30, y: 26, w: 200, h: 22 },
  /** Avatar and author row. */
  author: { x: 30, y: 66, w: 320, h: 32 },
  /** The body's two lines (mention pill + line 1, then line 2). */
  body: { x: 72, y: 110, w: 676, h: 58 },
  /** The mention pill alone. */
  mention: { x: 72, y: 110, w: 132, h: 25 },
} as const;

/** A rect inside the card in film px, given the card's top-left (film px) and k. */
export const commentRect = (key: "heading" | "author" | "body" | "mention", x: number, y: number, k: number): Rect => {
  const r = COMMENT_UI[key];
  return { x: x + r.x * k, y: y + r.y * k, w: r.w * k, h: r.h * k };
};

export const CommentTwin: React.FC<{
  k?: number;
  /** 0..1, the mention's pop (scale up and settle, a soft ring). */
  mentionPop?: number;
  elev?: Elev;
  /** Show the "Comments" heading row (default true). */
  heading?: boolean;
  style?: React.CSSProperties;
}> = ({ k = 1.9, mentionPop = 0, elev = 3, heading = true, style }) => {
  const u = (n: number) => n * k;
  const pop = Math.max(0, Math.min(1, mentionPop));
  const bump = Math.sin(Math.PI * Math.min(1, pop * 1.25));
  const ring = pop;
  return (
    <div
      style={{
        position: "relative",
        width: u(COMMENT_UI.width),
        height: u(COMMENT_UI.height),
        boxSizing: "border-box",
        borderRadius: u(20),
        background: DAY.surface,
        boxShadow: ELEV[elev],
        fontFamily: FONT.sans,
        color: DAY.text,
        ...style,
      }}
    >
      {heading ? (
        <div
          style={{
            position: "absolute",
            left: u(30),
            top: u(24),
            fontSize: u(15),
            lineHeight: `${u(22)}px`,
            fontWeight: 600,
            color: DAY.textMuted,
            letterSpacing: "0.01em",
          }}
        >
          {COMMENT.heading}
        </div>
      ) : null}
      {heading ? <div style={{ position: "absolute", left: u(30), right: u(30), top: u(54), height: Math.max(1.5, u(1)), background: DAY.line }} /> : null}
      {/* author */}
      <div style={{ position: "absolute", left: u(30), top: u(66), display: "flex", alignItems: "center", gap: u(12) }}>
        <AppTile size={u(32)} />
        <span style={{ fontSize: u(16), lineHeight: 1, fontWeight: 600 }}>{COMMENT.author}</span>
      </div>
      {/* body */}
      <div style={{ position: "absolute", left: u(72), top: u(110), fontSize: u(15), lineHeight: `${u(29)}px`, whiteSpace: "nowrap" }}>
        <div>
          <span style={{ position: "relative", display: "inline-block", verticalAlign: "top", marginRight: u(6) }}>
            {ring > 0 && ring < 1 ? (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: u(14),
                  boxShadow: `0 0 0 ${u(2 + 8 * ring)}px ${ink(0.1 * (1 - ring))}`,
                }}
              />
            ) : null}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: u(5),
                height: u(25),
                marginTop: u(2),
                padding: `0 ${u(9)}px 0 ${u(3)}px`,
                borderRadius: u(13),
                background: DAY.line,
                color: DAY.text,
                fontWeight: 500,
                fontSize: u(14.5),
                lineHeight: 1,
                transform: `scale(${1 + 0.1 * bump})`,
                transformOrigin: "50% 60%",
                boxShadow: bump > 0.01 ? `0 ${u(3)}px ${u(10)}px ${ink(0.12 * bump)}` : undefined,
              }}
            >
              <Initials k={k} text="RS" size={19} bg={DAY.surface} />
              {COMMENT.mention}
            </span>
          </span>
          {COMMENT.line1}
        </div>
        <div>{COMMENT.line2}</div>
      </div>
    </div>
  );
};
