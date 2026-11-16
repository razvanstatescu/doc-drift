import React from "react";
import { AbsoluteFill, Composition, Img, staticFile, useCurrentFrame } from "remotion";
import { loadBrandFonts } from "../../../brand/fonts";
import { findCapture } from "../../../lib/captures";
import { getScene } from "../../../lib/timeline";
import { DAY, FONT, sweep } from "../../../v4/look";
import { CommentTwin } from "../CommentTwin";
import { AgentCard, DraftCard, FooterCard, ProposedFixCard, QuickFixCard, ReviewPanelTwin } from "../ReviewPanelTwin";
import { DashboardTwin } from "../../P5/DashboardTwin";
import { JiraEpicTwin } from "../../P5/JiraEpicTwin";
import { TrackInJiraTwin } from "../../P5/TrackInJiraTwin";

/**
 * Review-and-scale owner's dev entry (not part of the film): each P4/P5 twin next to its capture, for the 1:1 check
 * R3 section 7 asks for. Render a page with:
 *   npx remotion still src/components/P4/dev/index.ts P4P5Twins out/v4/p4p5/twins/<n>.png --frame=<page> --port=3517
 */
loadBrandFonts();

/** A capture crop at a scale, with its logged masks drawn (white unless the mask says otherwise). */
const Crop: React.FC<{ id: string; crop: [number, number, number, number]; scale: number; x: number; y: number; maskFill?: string }> = ({
  id,
  crop,
  scale,
  x,
  y,
  maskFill = "#FFFFFF",
}) => {
  const c = findCapture(id);
  if (!c) return null;
  const [cx, cy, cw, ch] = crop;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: cw * scale,
        height: ch * scale,
        overflow: "hidden",
        borderRadius: 12,
        boxShadow: `0 0 0 2px ${DAY.line}`,
      }}
    >
      <Img src={staticFile(c.file)} style={{ position: "absolute", left: -cx * scale, top: -cy * scale, width: c.width * scale, height: c.height * scale }} />
      {(c.masks ?? []).map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (m.box[0] - cx) * scale,
            top: (m.box[1] - cy) * scale,
            width: m.box[2] * scale,
            height: m.box[3] * scale,
            background: m.fill ?? maskFill,
          }}
        />
      ))}
    </div>
  );
};

const Label: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: FONT.sans, fontSize: 22, fontWeight: 600, color: DAY.textMuted }}>{children}</div>
);

const pages: React.ReactNode[] = [
  // 0 comment
  <>
    <Label x={60} y={40}>
      capture p4-comment (0.9)
    </Label>
    <Crop id="p4-comment" crop={[1480, 1580, 1480, 300]} scale={0.9} x={60} y={80} />
    <Label x={60} y={400}>
      CommentTwin (k 1.9)
    </Label>
    <div style={{ position: "absolute", left: 60, top: 440 }}>
      <CommentTwin k={1.9} />
    </div>
  </>,
  // 1 review panel
  <>
    <Label x={40} y={20}>
      capture p4-panel (0.5)
    </Label>
    <Crop id="p4-panel" crop={[1120, 120, 1600, 1920]} scale={0.5} x={40} y={56} />
    <Label x={900} y={20}>
      ReviewPanelTwin (k 1.18)
    </Label>
    <div style={{ position: "absolute", left: 900, top: 56 }}>
      <ReviewPanelTwin k={1.18} badgeGlow={1} />
    </div>
  </>,
  // 2 quick fix
  <>
    <Label x={60} y={30}>
      capture p4-review-rec frame (quick fix) via p4-affected (0.8)
    </Label>
    <Crop id="p4-affected" crop={[1150, 1330, 1550, 340]} scale={0.8} x={60} y={70} />
    <Label x={60} y={380}>
      QuickFixCard (k 1.9), then done
    </Label>
    <div style={{ position: "absolute", left: 60, top: 420 }}>
      <QuickFixCard k={1.9} />
    </div>
    <div style={{ position: "absolute", left: 760, top: 420 }}>
      <QuickFixCard k={1.9} done={1} />
    </div>
  </>,
  // 3 drafts
  <>
    <Label x={30} y={20}>
      capture p4-draft-diff (0.5)
    </Label>
    <Crop id="p4-draft-diff" crop={[1120, 640, 1600, 1260]} scale={0.5} x={30} y={56} />
    <Label x={880} y={20}>
      ProposedFixCard with drafts (k 1.4)
    </Label>
    <div style={{ position: "absolute", left: 880, top: 56 }}>
      <ProposedFixCard k={1.4} draftsIn={1} draft1 draft2 />
    </div>
  </>,
  // 4 footer + agent card
  <>
    <Label x={60} y={30}>
      capture p4-accept-button footer (0.8)
    </Label>
    <Crop id="p4-accept-button" crop={[1120, 1820, 1600, 180]} scale={0.8} x={60} y={70} />
    <Label x={60} y={250}>
      FooterCard (k 1.6)
    </Label>
    <div style={{ position: "absolute", left: 60, top: 290 }}>
      <FooterCard k={1.6} />
    </div>
    <Label x={60} y={480}>
      capture p4-rovo-review-card (0.5) · AgentCard (k 1.6)
    </Label>
    <Crop id="p4-rovo-review-card" crop={[3040, 560, 760, 1500]} scale={0.38} x={60} y={520} />
    <div style={{ position: "absolute", left: 420, top: 520 }}>
      <AgentCard k={1.6} rows={2} />
    </div>
    <div style={{ position: "absolute", left: 980, top: 520 }}>
      <DraftCard k={1.4} which={2} />
    </div>
  </>,
  // 5 jira
  <>
    <Label x={60} y={30}>
      capture p5-jira-before / p5-jira-done (0.6)
    </Label>
    <Crop id="p5-jira-before" crop={[700, 140, 2260, 180]} scale={0.6} x={60} y={70} />
    <Crop id="p5-jira-done" crop={[700, 140, 2260, 180]} scale={0.6} x={60} y={190} />
    <Label x={60} y={330}>
      JiraEpicTwin (k 1.8), To Do and Done
    </Label>
    <div style={{ position: "absolute", left: 60, top: 370 }}>
      <JiraEpicTwin k={1.6} />
    </div>
    <div style={{ position: "absolute", left: 1000, top: 370 }}>
      <JiraEpicTwin k={1.6} done={1} />
    </div>
  </>,
  // 6 dashboard
  <>
    <Label x={20} y={10}>
      capture p5-dashboard (0.3)
    </Label>
    <Crop id="p5-dashboard" crop={[700, 240, 3100, 1700]} scale={0.3} x={20} y={44} />
    <Label x={970} y={10}>
      DashboardTwin (k 0.92)
    </Label>
    <div style={{ position: "absolute", left: 960, top: 44 }}>
      <DashboardTwin k={0.92} slip={1} />
    </div>
  </>,
  // 7 track in jira
  <>
    <Label x={40} y={20}>
      capture p5-track-created (0.45)
    </Label>
    <Crop id="p5-track-created" crop={[1120, 120, 1600, 1860]} scale={0.45} x={40} y={56} />
    <Label x={840} y={20}>
      TrackInJiraTwin (k 1.4), before and created
    </Label>
    <div style={{ position: "absolute", left: 840, top: 56 }}>
      <TrackInJiraTwin k={1.4} />
    </div>
    <div style={{ position: "absolute", left: 840, top: 600 }}>
      <TrackInJiraTwin k={1.4} created={1} />
    </div>
  </>,
];

const Gallery: React.FC = () => {
  const frame = useCurrentFrame();
  const page = pages[Math.min(pages.length - 1, Math.max(0, frame))];
  return <AbsoluteFill style={{ background: sweep() }}>{page}</AbsoluteFill>;
};

/** P4 and P5 alone (no audio), so a broken file elsewhere in the film cannot block this owner's checks. */
export const DevRoot: React.FC = () => (
  <>
    <Composition id="P4P5Twins" component={Gallery} durationInFrames={pages.length} fps={30} width={1920} height={1080} />
    <Composition
      id="P4Dev"
      lazyComponent={() => import("../../../scenes/P4")}
      durationInFrames={getScene("P4").durationInFrames}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="P5Dev"
      lazyComponent={() => import("../../../scenes/P5")}
      durationInFrames={getScene("P5").durationInFrames}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
