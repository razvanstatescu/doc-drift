import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../brand/icons";
import { clamp, EASE } from "../../lib/time";
import { BRAND, DAY, ELEV, FONT, ink, type Rect } from "../../v4/look";
import { monoW } from "./geom";

/**
 * PrTwin: pull request #482 as a plain neutral card (V4.md honesty list: Bitbucket is named in words only, no product
 * marks, no Atlassian blue; the primary button fills with the text colour). Every string is from the real PR
 * (captures p2-pr482, p2-pr482-files, p2-merged): the title, "#482", the branch line, Open, the Merge button, "Files
 * changed 2" and the two file rows with their real line counts. It simplifies the page (no sidebar, no Approve, no
 * description, no activity) and adds nothing the real page lacks.
 *
 * Layout is absolute in film px from the card's top-left, so `prRects()` can aim morphs and docks at exact words.
 */
export const PR_W = 1400;
export const PR_H = 604;

const PADX = 60;
const TITLE_Y = 104;
const META_Y = 198;
const META_H = 48;
const MERGE = { x: PR_W - PADX - 180, y: 188, w: 180, h: 68 };
const DIV_Y = 290;
const FILES_Y = 324;
const ROW_H = 78;
const ROW_Y = [384, 474] as const;
const PATH_SIZE = 30;
const PATH_X = PADX + 78;
const ARROW_W = 30;
const ARROW_GAP = 16;
const OLD = "scripts/rollback.sh";
const NEW = "scripts/rollback-v2.sh";
const VALUES = "deploy/helm/values.yaml";
const BRANCH = "scenario/rename-rollback-script";

export type PrRects = {
  card: Rect;
  title: Rect;
  merge: Rect;
  lozenge: Rect;
  valuesRow: Rect;
  renameRow: Rect;
  /** `scripts/rollback.sh` in the rename row. */
  renameOld: Rect;
  /** `scripts/rollback-v2.sh` in the rename row. */
  renameNew: Rect;
};

const LOZ_X = PADX + 64 + 84 + monoW(BRANCH, 26) + 28 + 16 + ARROW_W + 16 + monoW("main", 26) + 28 + 16;

/** Film-px rects of the card's parts for a card whose top-left is (x, y). */
export function prRects(x: number, y: number): PrRects {
  const r = (dx: number, dy: number, w: number, h: number): Rect => ({ x: x + dx, y: y + dy, w, h });
  const textY = (row: number) => ROW_Y[row] + (ROW_H - 36) / 2;
  return {
    card: r(0, 0, PR_W, PR_H),
    title: r(PADX, TITLE_Y, 1150, 64),
    merge: r(MERGE.x, MERGE.y, MERGE.w, MERGE.h),
    lozenge: r(LOZ_X, META_Y + 2, 120, 44),
    valuesRow: r(PADX, ROW_Y[0], PR_W - 2 * PADX, ROW_H),
    renameRow: r(PADX, ROW_Y[1], PR_W - 2 * PADX, ROW_H),
    renameOld: r(PATH_X, textY(1), monoW(OLD, PATH_SIZE), 36),
    renameNew: r(PATH_X + monoW(OLD, PATH_SIZE) + ARROW_GAP * 2 + ARROW_W, textY(1), monoW(NEW, PATH_SIZE), 36),
  };
}

const Chip: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      height: 44,
      padding: "0 14px",
      borderRadius: 12,
      background: DAY.surfaceSunk,
      color: DAY.text,
      fontFamily: mono ? FONT.mono : FONT.sans,
      fontSize: 26,
      fontWeight: mono ? 400 : 500,
      whiteSpace: "pre",
      boxSizing: "border-box",
    }}
  >
    {children}
  </span>
);

const Count: React.FC<{ add: number; del: number }> = ({ add, del }) => (
  <span style={{ display: "inline-flex", gap: 14, fontFamily: FONT.mono, fontSize: 28, fontWeight: 500 }}>
    <span style={{ color: DAY.verified }}>{`+${add}`}</span>
    <span style={{ color: DAY.stale }}>{`−${del}`}</span>
  </span>
);

const FileRow: React.FC<{ y: number; icon: IconName; children: React.ReactNode; add: number; del: number; style?: React.CSSProperties }> = ({
  y,
  icon,
  children,
  add,
  del,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: PADX,
      top: y,
      width: PR_W - 2 * PADX,
      height: ROW_H,
      borderRadius: 18,
      background: DAY.ground,
      boxShadow: `inset 0 0 0 1.5px ${ink(0.05)}`,
      ...style,
    }}
  >
    <div style={{ position: "absolute", left: 26, top: (ROW_H - 32) / 2 }}>
      <Icon name={icon} size={32} color={DAY.textMuted} />
    </div>
    <div style={{ position: "absolute", left: PATH_X - PADX, top: (ROW_H - 36) / 2, height: 36, display: "flex", alignItems: "center" }}>{children}</div>
    <div style={{ position: "absolute", right: 28, top: (ROW_H - 34) / 2, height: 34, display: "flex", alignItems: "center" }}>
      <Count add={add} del={del} />
    </div>
  </div>
);

const Path: React.FC<{ children: string; color?: string }> = ({ children, color = DAY.text }) => (
  <span style={{ fontFamily: FONT.mono, fontSize: PATH_SIZE, lineHeight: "36px", color, whiteSpace: "pre", letterSpacing: 0 }}>{children}</span>
);

export const PrTwin: React.FC<{
  /** Top-left of the card, film px on the stage. */
  x: number;
  y: number;
  /** The cursor presses Merge here (a 6-frame dip). */
  mergePress?: number;
  /** From here the PR reads Merged: the lozenge swaps and the Merge button leaves (as on the real page). */
  mergedAt?: number;
  /** From here the rename row's old path has lifted out: a trace stays at its place. */
  renameLift?: number;
  style?: React.CSSProperties;
}> = ({ x, y, mergePress, mergedAt, renameLift, style }) => {
  const frame = useCurrentFrame();
  const merged = mergedAt !== undefined && frame >= mergedAt;
  const since = mergePress === undefined ? 99 : frame - mergePress;
  const press = since >= 0 && since < 8 ? interpolate(since, [0, 2, 5, 8], [1, 0.94, 0.95, 1], clamp) : 1;
  const pressDark = since >= 0 && since < 8 ? interpolate(since, [0, 2, 8], [0, 1, 0], clamp) : 0;
  const leave = mergedAt === undefined ? 0 : interpolate(frame, [mergedAt, mergedAt + 8], [0, 1], { ...clamp, easing: EASE.expoIn });
  const lifted = renameLift === undefined ? 0 : interpolate(frame, [renameLift, renameLift + 6], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: PR_W,
        height: PR_H,
        borderRadius: 36,
        background: DAY.surface,
        boxShadow: ELEV[3],
        fontFamily: FONT.sans,
        color: DAY.text,
        ...style,
      }}
    >
      {/* the product, named in words; the repository path as the page shows it */}
      <div style={{ position: "absolute", left: PADX, top: 48, display: "flex", alignItems: "center", gap: 14, fontSize: 30, lineHeight: "36px" }}>
        <span style={{ fontWeight: 600 }}>Bitbucket</span>
        <span style={{ color: DAY.textMuted, fontWeight: 500 }}>nano-soft-dev / payments-api / Pull requests</span>
      </div>
      <div style={{ position: "absolute", left: PADX, top: TITLE_Y, fontSize: 54, lineHeight: "64px", fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
        Rename rollback script and timeout variable
      </div>
      {/* the meta row: the author's avatar (a neutral glyph), the number, the branches and the state */}
      <div style={{ position: "absolute", left: PADX, top: META_Y, height: META_H, display: "flex", alignItems: "center" }}>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: "50%", background: DAY.surfaceSunk, marginRight: 16 }}>
          <Icon name="user" size={28} color={DAY.textMuted} />
        </span>
        <span style={{ width: 84, fontSize: 30, fontWeight: 500, color: DAY.textMuted }}>#482</span>
        <Chip mono>{BRANCH}</Chip>
        <span style={{ margin: "0 16px" }}>
          <Icon name="arrow" size={ARROW_W} color={DAY.textMuted} />
        </span>
        <Chip mono>main</Chip>
        <span style={{ marginLeft: 16, display: "inline-grid" }}>
          {merged ? (
            <span
              style={{
                gridArea: "1 / 1",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                height: 44,
                padding: "0 18px 0 14px",
                borderRadius: 12,
                background: DAY.text,
                color: DAY.ground,
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              <Icon name="merge" size={26} color={DAY.ground} />
              Merged
            </span>
          ) : (
            <span
              style={{
                gridArea: "1 / 1",
                display: "inline-flex",
                alignItems: "center",
                height: 44,
                padding: "0 18px",
                borderRadius: 12,
                background: BRAND.mist,
                color: DAY.text,
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              Open
            </span>
          )}
        </span>
      </div>
      {leave < 1 ? (
        <div
          style={{
            position: "absolute",
            left: MERGE.x,
            top: MERGE.y,
            width: MERGE.w,
            height: MERGE.h,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: DAY.text,
            color: DAY.ground,
            fontSize: 30,
            fontWeight: 600,
            boxShadow: `0 4px 12px ${ink(0.2 * (1 - pressDark * 0.6))}, inset 0 0 0 999px ${ink(0.35 * pressDark)}`,
            transform: `scale(${press}) translateX(${leave * 40}px)`,
            opacity: 1 - leave,
          }}
        >
          Merge
        </div>
      ) : null}
      <div style={{ position: "absolute", left: PADX, right: PADX, top: DIV_Y, height: 2, background: DAY.line }} />
      <div style={{ position: "absolute", left: PADX, top: FILES_Y, display: "flex", alignItems: "center", gap: 14, fontSize: 30, lineHeight: "36px", fontWeight: 600 }}>
        Files changed
        <span style={{ display: "inline-grid", placeItems: "center", minWidth: 40, height: 36, padding: "0 10px", borderRadius: 10, background: DAY.surfaceSunk, fontSize: 26 }}>2</span>
      </div>
      <FileRow y={ROW_Y[0]} icon="diff" add={1} del={1}>
        <Path>{VALUES}</Path>
      </FileRow>
      <FileRow y={ROW_Y[1]} icon="rename" add={3} del={3}>
        <span style={{ position: "relative", display: "inline-flex" }}>
          {lifted > 0 ? (
            <span style={{ position: "absolute", inset: "2px -6px", borderRadius: 10, background: DAY.trace, opacity: lifted }} />
          ) : null}
          <span style={{ opacity: 1 - lifted }}>
            <Path>{OLD}</Path>
          </span>
        </span>
        <span style={{ margin: `0 ${ARROW_GAP}px` }}>
          <Icon name="arrow" size={ARROW_W} color={DAY.textMuted} />
        </span>
        <Path>{NEW}</Path>
      </FileRow>
    </div>
  );
};
