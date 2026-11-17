import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE, H, tween, W } from "../../lib/time";
import { PageTwin, pageRects } from "../twins/PageTwin";
import type { DdsState, PageTwinProps } from "../twins/types";
import { amber, BRAND, DAY, ELEV_DARK, FONT, ink, NIGHT, type Rect } from "../look";
import { Lift } from "./lift";
import { Bloom } from "./stage";

/**
 * PageOverCode (v5, R6 technique 4 "the slip underneath", promoted from src/v5/lab/UnderThePage): the runbook page
 * lies over a dark layer holding what it describes, the code file and the Jira issue. On their words, windows open in
 * the page around each anchored word: the page goes clear there (6%) except the word itself, on a white plate, and a pin
 * drops from it to the thing it names underneath. On the change, the code row slips one unit (the one amber) and
 * renames ("renamed in PR #482") while the page's word does not move. The windows close; the page's Steps band takes the
 * amber and hands it to the byline: "Possibly stale · Doc Drift".
 *
 * World-space: place it inside your Stage and Camera3D (aim the camera with `pageOverCodeRects`). Real strings only.
 *
 *   <PageOverCode page={{ world: "day", k: 1.5, x: 120, y: 70 }} codeAt={sc.wordAt("S07", "code")}
 *     jiraAt={sc.wordAt("S07", "jira")} slipAt={sc.wordAt("S07", "changes")} closeAt={...} bylineAt={sc.wordAt("S07", "flags")} />
 */
export type PageOverCodeProps = {
  /** The runbook page (PageTwin props; PageOverCode sets its byline and slip). */
  page: PageTwinProps;
  /** The code row's window opens and its pin drops (on "code"). */
  codeAt: number;
  /** The Jira row's window opens (on "Jira work"). */
  jiraAt: number;
  /** The code row slips one unit, amber, and renames (on "changes"). Hold it 1.1 s or more before `closeAt` (R6). */
  slipAt: number;
  /** The windows close. */
  closeAt: number;
  /** The Steps band slips and takes the amber (default closeAt + 4). */
  bandAt?: number;
  /** The byline turns Possibly stale and takes the amber (on "flags the page"). */
  bylineAt: number;
  /** The byline's state before (default "verified"). */
  bylineFrom?: DdsState;
  /** The dark layer comes up from translateZ(-220) to 0 over these frames (visible inside a 3D camera). */
  rise?: [number, number];
  /** Frames a window takes to open or close (default 14). */
  openDur?: number;
  code?: { path?: string; repo?: string; newPath?: string; note?: string };
  jira?: { key?: string; title?: string; kind?: string };
};

const CODE_TOKEN = "./scripts/rollback.sh" as const;
const JIRA_TOKEN = "PAY-6" as const;
const CODE_W = 470;

/** Rects for aiming a camera: the page's own rects, the dark layer, and the two rows under the page (stage px). */
export function pageOverCodeRects(p: PageOverCodeProps) {
  const r = pageRects({ ...p.page, byline: { kind: "dds", state: p.bylineFrom ?? "verified" } });
  const card = r.card;
  const tJ = r.tokens[JIRA_TOKEN];
  const tC = r.tokens[CODE_TOKEN];
  const slab: Rect = { x: card.x + 34, y: card.y + 26, w: card.w + 64, h: card.h - 6 };
  const jiraRow: Rect | undefined = tJ ? { x: tJ.x, y: tJ.y + 62, w: 760, h: 40 } : undefined;
  const codeRow: Rect | undefined = tC ? { x: tC.x + 18, y: tC.y + 66, w: CODE_W, h: 48 } : undefined;
  return { page: r, slab, jiraRow, codeRow, jiraToken: tJ, codeToken: tC };
}

/** A vertical mask: opaque everywhere except the given bands, where the page is 6% (the windows). */
function windowMask(bands: [number, number][]): string | undefined {
  const open = bands.filter(([a, b]) => b - a > 2).sort((x, y) => x[0] - y[0]);
  if (!open.length) return undefined;
  const stops: string[] = ["#000 0px"];
  for (const [a, b] of open) {
    stops.push(`#000 ${a - 8}px`, `rgba(0,0,0,0.06) ${a + 8}px`, `rgba(0,0,0,0.06) ${b - 8}px`, `#000 ${b + 8}px`);
  }
  stops.push(`#000 ${H}px`);
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const PageOverCode: React.FC<PageOverCodeProps> = (p) => {
  const frame = useCurrentFrame();
  const { codeAt, jiraAt, slipAt, closeAt, bylineAt, bylineFrom = "verified", rise, openDur = 14 } = p;
  const bandAt = p.bandAt ?? closeAt + 4;
  const code = { path: "scripts/rollback.sh", repo: "in payments-api", newPath: "scripts/rollback-v2.sh", note: "renamed in PR #482", ...p.code };
  const jira = { key: "PAY-6", title: "Safer payments deploys and rollbacks", kind: "Jira issue", ...p.jira };
  const R = pageOverCodeRects(p);
  const tJ = R.jiraToken;
  const tC = R.codeToken;
  const props: PageTwinProps = {
    ...p.page,
    byline: { kind: "dds", state: "possibly_stale", from: bylineFrom, at: bylineAt },
    slip: { at: bandAt, handoff: bylineAt },
  };
  if (!tJ || !tC || !R.jiraRow || !R.codeRow) return <PageTwin {...props} />;

  // each window opens from its word's centre line outward, and all close together
  const shut = tween(frame, closeAt, closeAt + openDur, 0, 1, EASE.expoInOut);
  const win = (t: Rect, at: number): [number, number] => {
    const o = tween(frame, at, at + openDur, 0, 1, EASE.expoInOut) * (1 - shut);
    const c = t.y + t.h / 2;
    const top = t.y - 70;
    const bottom = t.y + t.h + 150;
    return [lerp(c, top, o), lerp(c, bottom, o)];
  };
  const wJ = win(tJ, jiraAt);
  const wC = win(tC, codeAt);
  const openJ = wJ[1] - wJ[0] > 2;
  const openC = wC[1] - wC[0] > 2;
  const mask = windowMask([wJ, wC]);

  // the change under the page
  const slip = tween(frame, slipAt, slipAt + 6, 0, 1, EASE.expoOut);
  const unit = CODE_W * 0.117;
  const codeAmber = slip * (1 - tween(frame, bandAt, bandAt + 6, 0, 1, EASE.expoOut));
  const renamed = frame >= slipAt + 2;
  const under = 1 - tween(frame, closeAt + openDur - 2, closeAt + openDur + 4, 0, 1, EASE.linear);
  const z = rise ? lerp(-220, 0, tween(frame, rise[0], rise[1], 0, 1, EASE.expoInOut)) : 0;

  const rowJ = R.jiraRow;
  const rowC = R.codeRow;
  const pin = (t: Rect, x1: number, y1: number, w: [number, number], open: boolean, key: string) => {
    if (!open) return null;
    const x0 = t.x + t.w / 2;
    const y0 = t.y + t.h + 6;
    const d = tween(w[1], y0 + 4, y1 + 40, 0, 1, EASE.linear); // the pin draws as the window passes
    if (d <= 0) return null;
    return (
      <g key={key}>
        <line x1={x0} y1={y0} x2={lerp(x0, x1, d)} y2={lerp(y0, y1, d)} stroke={BRAND.current} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={x0} cy={y0} r={6} fill={DAY.surface} stroke={BRAND.current} strokeWidth={2.5} />
        {d >= 1 ? <circle cx={x1} cy={y1} r={6} fill={BRAND.fathom} stroke={NIGHT.link} strokeWidth={2.5} /> : null}
      </g>
    );
  };
  const plate = (t: Rect, text: string, w: [number, number]) =>
    w[1] > t.y + t.h * 0.5 && w[0] < t.y + t.h * 0.5 ? (
      <div
        key={text}
        style={{
          position: "absolute",
          left: t.x - 10,
          top: t.y - 6,
          height: t.h + 12,
          padding: "0 10px",
          display: "flex",
          alignItems: "center",
          borderRadius: 10,
          background: DAY.surface,
          boxShadow: `0 0 0 1.5px ${ink(0.12)}, 0 8px 22px ${ink(0.16)}`,
          fontFamily: FONT.mono,
          fontSize: t.h * 0.78,
          color: DAY.text,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    ) : null;

  return (
    <>
      {/* the dark layer: what the page describes */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: z ? `translateZ(${z}px)` : undefined }}>
        <Lift appear at={0} to={2} dark x={R.slab.x} y={R.slab.y} radius={30}>
          <div style={{ width: R.slab.w, height: R.slab.h, borderRadius: 30, background: BRAND.fathom, boxShadow: ELEV_DARK[2] }} />
        </Lift>
        <div style={{ position: "absolute", left: rowJ.x, top: rowJ.y, display: "flex", gap: 16, alignItems: "baseline", whiteSpace: "nowrap", opacity: under, fontFamily: FONT.sans }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 30, color: NIGHT.link }}>{jira.key}</span>
          <span style={{ fontSize: 28, color: NIGHT.text }}>{jira.title}</span>
          <span style={{ fontSize: 24, color: NIGHT.textMuted }}>{jira.kind}</span>
        </div>
        <div style={{ position: "absolute", left: rowC.x, top: rowC.y, width: CODE_W, height: 48, opacity: under }}>
          {slip > 0 ? <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: NIGHT.trace }} /> : null}
          {codeAmber > 0.02 ? <Bloom cx={CODE_W / 2 + unit * slip} cy={24} w={CODE_W * 1.5} h={150} strength={0.3 * codeAmber} /> : null}
          <div
            style={{
              position: "absolute",
              left: unit * slip,
              top: 0,
              height: 48,
              padding: "0 16px",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 14,
              whiteSpace: "nowrap",
              fontFamily: FONT.sans,
              background: codeAmber > 0.02 ? amber(codeAmber) : "transparent",
              boxShadow: codeAmber > 0.02 ? `0 0 26px ${amber(0.45 * codeAmber)}` : undefined,
            }}
          >
            <span style={{ fontFamily: FONT.mono, fontSize: 30, color: codeAmber > 0.5 ? BRAND.fathom : NIGHT.text }}>{renamed ? code.newPath : code.path}</span>
            <span style={{ fontSize: 24, color: codeAmber > 0.5 ? BRAND.fathom : NIGHT.textMuted }}>{renamed ? code.note : code.repo}</span>
          </div>
        </div>
      </div>

      {/* the page: opaque, clear inside the windows (a mask on a leaf wrapper, so 3D survives) */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, WebkitMaskImage: mask, maskImage: mask }}>
        <PageTwin {...props} />
      </div>

      {/* inside the windows: the anchored words on white plates, and their pins down to what they name */}
      {openJ || openC ? (
        <>
          <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {pin(tJ, rowJ.x + 52, rowJ.y - 4, wJ, openJ, "j")}
            {pin(tC, rowC.x + CODE_W / 2 + unit * slip, rowC.y - 4, wC, openC, "c")}
          </svg>
          {openJ ? plate(tJ, JIRA_TOKEN, wJ) : null}
          {openC ? plate(tC, CODE_TOKEN, wC) : null}
        </>
      ) : null}
    </>
  );
};
