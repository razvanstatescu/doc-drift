import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Badge } from "../../brand/Badge";
import { Cursor } from "../../components/Cursor";
import { EASE, tween } from "../../lib/time";
import { Slip } from "../../motion/slip";
import { amber, BRAND, DAY, elevAt, ELEV_DARK, FONT, NIGHT, T, type Rect } from "../look";
import {
  DEMO_CARRY_FRAMES,
  DEMO_EDITTYPE_FRAMES,
  DEMO_PAGEOVERCODE_FRAMES,
  DEMO_REALTAKE_FRAMES,
  DEMO_REWIND_FRAMES,
  DemoCarry,
  DemoEditType,
  DemoPageOverCode,
  DemoRealTake,
  DemoRewind,
} from "./demos/v5";
import {
  Bloom,
  Breakout,
  Camera3D,
  Eyebrow,
  ExplodedStack,
  InkLabel,
  KineticDock,
  KineticLine,
  Layer,
  Lift,
  MorphToReal,
  NumberRoll,
  PillSwap,
  pointOnPath,
  Press,
  pressAt,
  progressOf,
  ProofFrame,
  proofPoint,
  proofRect,
  PushCut,
  RebuildFromReal,
  SignalLine,
  SlipPush,
  Stage,
  WhipBlur,
  ZoomThrough,
} from "./index";

/**
 * Dev/Kit4: the v4 kit gallery (V4.md section 5). One demo per piece, 120 frames each, in this order:
 *   0 Camera3D + Layer + Lift · 120 Night stage + tide + dark lift · 240 KineticLine + marks · 360 NumberRoll
 *   480 ProofFrame (still) · 600 MorphToReal + RebuildFromReal · 720 ProofFrame (recording, jump + reframe)
 *   840 SignalLine + pointOnPath + KineticDock · 960 ExplodedStack · 1080 Breakout + Press + Cursor · 1200 SlipPush
 *   1320 WhipBlur · 1440 ZoomThrough · 1560 PushCut · 1680 Lift (levels, dark, down)
 * Stills: out/v4/kit/demo-*.png (tools: npx remotion still src/v4/kit/dev/entry.tsx Kit4 ... --frame=N).
 */

// ---------------------------------------------------------------------------------------------------------------------
// Crafted stand-ins (the real twins live in src/v4/twins; these only exercise the kit)
// ---------------------------------------------------------------------------------------------------------------------

const Card: React.FC<{ w: number; h?: number; pad?: number; radius?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({
  w,
  h,
  pad = 44,
  radius = 28,
  children,
  style,
}) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: DAY.surface, padding: pad, boxSizing: "border-box", fontFamily: FONT.sans, color: DAY.text, ...style }}>
    {children}
  </div>
);

const Row: React.FC<{ children: React.ReactNode; muted?: boolean; mono?: boolean; size?: number }> = ({ children, muted, mono, size = 30 }) => (
  <div style={{ fontFamily: mono ? FONT.mono : FONT.sans, fontSize: size, lineHeight: 1.35, color: muted ? DAY.textMuted : DAY.text, fontWeight: mono ? 400 : 500 }}>{children}</div>
);

const Label: React.FC<{ children: React.ReactNode; night?: boolean }> = ({ children, night }) => (
  <div style={{ position: "absolute", left: 60, top: 44, fontFamily: FONT.mono, fontSize: 26, color: night ? NIGHT.textMuted : DAY.textMuted, letterSpacing: "-0.01em" }}>{children}</div>
);

/** A page surface for transitions (title, byline row, steps). */
const PageSurface: React.FC<{ title: string; tint?: string; children?: React.ReactNode }> = ({ title, tint, children }) => (
  <Stage world="day" motif="grid">
    <Camera3D seed={title}>
      <div style={{ position: "absolute", left: 360, top: 170 }}>
        <Card w={1200} h={740} style={{ boxShadow: elevAt(3) }}>
          <Eyebrow icon="page">Platform / Runbooks</Eyebrow>
          <div style={{ ...T.title, fontSize: 72, marginTop: 18, color: tint ?? DAY.text }}>{title}</div>
          <div style={{ height: 2, background: DAY.line, margin: "28px 0" }} />
          {children ?? (
            <>
              <Row>1. Confirm the current and previous release.</Row>
              <Row>2. Run the rollback script from the root of the payments-api repo.</Row>
              <Row mono muted size={28}>
                ./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT
              </Row>
            </>
          )}
        </Card>
      </div>
    </Camera3D>
  </Stage>
);

// ---------------------------------------------------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------------------------------------------------

const DemoCamera: React.FC = () => (
  <Stage world="day" motif="grid">
    <Camera3D
      keys={[
        { at: 18, dur: 24, to: { x: 1150, y: 430, zoom: 1.3 } },
        { at: 62, dur: 26, to: { x: 820, y: 560, zoom: 1.08, yaw: -9, pitch: 5 }, ease: EASE.expoInOut },
        { at: 92, dur: 20, to: { x: 960, y: 540, zoom: 1.0, yaw: 0, pitch: 0 } },
      ]}
    >
      <Lift at={2} to={3} contact x={380} y={210}>
        <Card w={1160} h={600}>
          <Eyebrow icon="page">Platform / Runbooks</Eyebrow>
          <div style={{ ...T.title, marginTop: 18 }}>Payments rollback runbook</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 22 }}>
            <Row muted>By Razvan Statescu</Row>
            <Badge state="possibly_stale" theme="day" size={2} />
          </div>
          <div style={{ height: 2, background: DAY.line, margin: "30px 0 24px" }} />
          <Row>Steps</Row>
          <Row mono muted size={28}>
            2. ./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT
          </Row>
        </Card>
      </Lift>
      <Layer depth={1.14}>
        <Lift at={10} to={4} x={1330} y={150} radius={14}>
          <InkLabel icon="anchor">payments-api: scripts/rollback.sh</InkLabel>
        </Lift>
      </Layer>
    </Camera3D>
    <Label>Camera3D (log zoom, yaw/pitch travel, creep) · Layer depth 1.14 · Lift to 3 with contact</Label>
  </Stage>
);

const DemoNight: React.FC = () => (
  <Stage world="night" motif="tide" tide={{ top: 620, bottom: 1020 }}>
    <Camera3D keys={[{ at: 30, dur: 40, to: { zoom: 1.06, x: 900 } }]}>
      <div style={{ position: "absolute", left: 160, top: 220 }}>
        <KineticLine text="It's 3 a.m. Payments is down." at={6} size={96} world="night" width={900} mark={{ words: [3, 5], kind: "mist", at: 40 }} />
      </div>
      <Lift at={20} to={3} world="night" contact radius={28} x={1100} y={250}>
        <div style={{ width: 640, height: 360, borderRadius: 28, background: NIGHT.surface, padding: 36, boxSizing: "border-box", fontFamily: FONT.mono, fontSize: 28, color: NIGHT.text }}>
          <div style={{ color: NIGHT.textMuted }}>~/payments-api</div>
          <div style={{ marginTop: 18 }}>$ ./scripts/rollback.sh</div>
          <div style={{ color: "#FF7A66", marginTop: 12 }}>zsh: no such file or directory</div>
        </div>
      </Lift>
    </Camera3D>
    <Label night>Stage night + tide (0.5 px/f) · Lift world night (near-black ladder) · KineticLine night + Mist band (night)</Label>
  </Stage>
);

const DemoType: React.FC = () => (
  <Stage world="day" motif="none">
    <Camera3D>
      <div style={{ position: "absolute", left: 140, top: 170 }}>
        <KineticLine text="The code moved." at={4} size={120} mark={{ words: [2, 2], kind: "current", at: 30 }} />
      </div>
      <div style={{ position: "absolute", left: 140, top: 380 }}>
        <KineticLine text="A date can't see a merge." at={22} size={120} mark={{ words: [3, 5], kind: "mist", at: 52 }} />
      </div>
      <div style={{ position: "absolute", left: 140, top: 600 }}>
        <KineticLine text={'"status": "possibly_stale"'} at={40} size={64} mono mark={{ words: [1, 1], kind: "amber", at: 70 }} />
      </div>
      <div style={{ position: "absolute", left: 140, top: 790 }}>
        <KineticLine text="Safe to cite." at={60} size={156} thesis={[2]} />
      </div>
    </Camera3D>
    <Label>KineticLine (rise from a smear, then still) · CurrentUnderline · MistBand (multiply) · AmberBlock · thesis word</Label>
  </Stage>
);

const DemoNumbers: React.FC = () => (
  <Stage world="day" motif="grid" light={["50%", "40%"]}>
    <Camera3D>
      <div style={{ position: "absolute", left: 240, top: 250 }}>
        <Eyebrow icon="clock">Merge to flag</Eyebrow>
        <NumberRoll value={19} at={12} dur={36} unit="s" style={{ marginTop: 10 }} />
        <Eyebrow style={{ marginTop: 18 }}>Measured on the demo site, Nov 13</Eyebrow>
      </div>
      <div style={{ position: "absolute", left: 1150, top: 380 }}>
        <NumberRoll value={18} at={40} dur={30} unit="of 24" size={160} />
        <Eyebrow style={{ marginTop: 12 }}>pages with drift</Eyebrow>
      </div>
      <div style={{ position: "absolute", left: 1150, top: 700 }}>
        <PillSwap at={80} from={{ label: "To Do", color: DAY.unanchored }} to={{ label: "Done", color: DAY.verified, bg: DAY.verifiedTint }} size={34} />
      </div>
    </Camera3D>
    <Label>NumberRoll: tick mode (decaying steps, each changed digit nudges in, lands exactly) · PillSwap at 80</Label>
  </Stage>
);

// R3's R7 crop, 346 tall instead of 360: the tooltip ends at capture row 635 and the next table row's text (which reads
// "Dana (Platform on-call lead)" in the capture, a name V4.md rules out) starts at 650, so the crop ends on row 645,
// in the whitespace between them (R2 section 9: never cut a line; the kit's crop guard checks it).
const R7 = { capture: "p2-flagged-tooltip", crop: [1440, 300, 1460, 346] as [number, number, number, number], scale: 0.8 };

const DemoProof: React.FC = () => {
  const x = 960 - proofRect({ ...R7 }).outer.w / 2;
  return (
    <Stage world="day" motif="grid">
      <Camera3D>
        <div style={{ position: "absolute", left: 300, top: 200, width: 1320 }}>
          <KineticLine text="Flagged 19 s after the merge." at={0} size={80} align="center" width={1320} />
        </div>
        <ProofFrame
          {...R7}
          x={x}
          y={420}
          at={15}
          dur={90}
          tag="Recorded in Confluence"
          note="Real capture, development install"
        />
      </Camera3D>
    </Stage>
  );
};

/** The crafted twin of the title + byline + tooltip, at film size, for the morph. */
const BYLINE_TWIN = { x: 330, y: 380, w: 1260 };
const TwinByline: React.FC = () => (
  <Stage world="day" motif="grid">
    <div style={{ position: "absolute", left: BYLINE_TWIN.x, top: BYLINE_TWIN.y }}>
      <Card w={BYLINE_TWIN.w} h={330} style={{ boxShadow: elevAt(3) }}>
        <div style={{ ...T.title, fontSize: 64 }}>Payments rollback runbook</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 26 }}>
          <Row muted>By Razvan Statescu</Row>
          <div style={{ position: "relative" }}>
            <Bloom cx={190} cy={26} w={420} h={120} strength={0.26} />
            <Slip at={-30} radius={14}>
              <Badge state="possibly_stale" theme="day" size={2} />
            </Slip>
          </div>
        </div>
        <div style={{ marginTop: 22, display: "inline-block", background: NIGHT.ground, color: NIGHT.text, borderRadius: 14, padding: "14px 22px", fontSize: 28, fontFamily: FONT.sans }}>
          PR #482 changed deploy/helm/values.yaml on Nov 13. Review.
        </div>
      </Card>
    </div>
  </Stage>
);
/** Where the twin's badge sits (measured from the layout above: title 64 px, row at +26). */
const TWIN_BADGE: Rect = { x: 686, y: 538, w: 242, h: 56 };

const DemoMorph: React.FC = () => {
  const placed = { ...R7, x: 960 - proofRect(R7).outer.w / 2, y: 420 };
  const capBadge: [number, number, number, number] = [2272, 461, 502, 46];
  const toRect = proofPoint(placed, capBadge);
  // a ProofFrame element straight in: MorphToReal hands it the growing window (its shadow stays soft)
  const proof = <ProofFrame {...placed} at={20} dur={200} enter="none" exit="none" tag="Recorded in Confluence" />;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={80} layout="none">
        <MorphToReal at={20} dur={9} fromRect={TWIN_BADGE} toRect={toRect} twin={<TwinByline />} proof={proof} frameRect={{ x: placed.x - 10, y: placed.y - 40, w: proofRect(placed).outer.w + 20, h: proofRect(placed).outer.h + 60 }} />
      </Sequence>
      <Sequence from={80} layout="none">
        <RebuildFromReal at={8} dur={7} fromRect={toRect} toRect={TWIN_BADGE} twin={<TwinByline />} proof={proof} />
      </Sequence>
      <Label>MorphToReal (T3: the proof grows out of the twin's badge) · RebuildFromReal (T4) at +88</Label>
    </AbsoluteFill>
  );
};

const DemoRecording: React.FC = () => (
  <Stage world="day" motif="grid">
    <Camera3D>
      <ProofFrame
        capture="p2-merge-rec"
        crop={[1320, 120, 1200, 880]}
        scale={0.8}
        x={480}
        y={150}
        at={10}
        tag="Recorded in Bitbucket: the real merge"
        video={{ from: 4.88, to: 14.3, jumps: [{ at: 25, to: 13.3, crop: [700, 180, 2260, 580], scale: 0.6 }] }}
      />
    </Camera3D>
    <Label>ProofFrame recording: 4.88 to 5.38 s, cut on frame 25 to 13.30 s with a new crop (the mat reframes)</Label>
  </Stage>
);

const PATH = "M 420 760 C 760 760, 820 330, 1180 330 S 1500 520, 1540 520";
const DemoSignal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = progressOf(frame, 20, 36);
  const [px, py] = pointOnPath(PATH, t);
  return (
    <Stage world="day" motif="grid">
      <Camera3D keys={[{ at: 20, dur: 36, to: { x: 1050, zoom: 1.05 }, ease: EASE.expoInOut }]}>
        <Lift at={0} to={2} x={220} y={700} radius={20}>
          <Card w={360} h={120} pad={28}>
            <Row>Bitbucket relay</Row>
          </Card>
        </Lift>
        <Lift at={4} to={3} x={1500} y={430} radius={20}>
          <Card w={340} h={180} pad={28}>
            <Row>Doc Drift matcher</Row>
          </Card>
        </Lift>
        <SignalLine d={PATH} at={20} dur={36} />
        {frame >= 20 && frame < 62 ? (
          <div style={{ position: "absolute", left: px + 26, top: py - 74 }}>
            <InkLabel icon="merge">PR #482 · 2 files</InkLabel>
          </div>
        ) : null}
        <KineticDock at={70} dur={24} fromRect={{ x: 1530, y: 470, w: 280, h: 50 }} toRect={{ x: 700, y: 180, w: 420, h: 76 }} hideBefore>
          <div style={{ width: "100%", height: "100%", borderRadius: 14, background: DAY.surface, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontSize: 34, color: DAY.text }}>
            rollback-v2.sh
          </div>
        </KineticDock>
      </Camera3D>
      <Label>SignalLine + pointOnPath (a chip rides the pulse; the camera follows) · KineticDock at 70</Label>
    </Stage>
  );
};

const DemoStack: React.FC = () => {
  const frame = useCurrentFrame();
  const out = tween(frame, 8, 38, 0, 1, EASE.expoInOut);
  const back = tween(frame, 72, 98, 0, 1, EASE.expoInOut);
  const explode = out * (1 - back);
  const layer = (w: number, h: number, x: number, y: number, node: React.ReactNode, dark = false) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 28, background: dark ? NIGHT.ground : DAY.surface, boxShadow: elevAt(2, dark) }}>{node}</div>
  );
  return (
    <Stage world="day" motif="grid">
      <Camera3D>
        <ExplodedStack
          explode={explode}
          yaw={-14 * explode}
          pitch={10 * explode}
          layers={[
            { key: "panel", z: 0, node: layer(1000, 720, 460, 180, <div style={{ padding: 40 }}><Eyebrow icon="page">Doc Drift</Eyebrow></div>) },
            { key: "why", z: 120, node: layer(880, 200, 520, 300, <div style={{ padding: 36, fontFamily: FONT.sans, fontSize: 30, color: DAY.text }}>PR #482 renamed scripts/rollback.sh to scripts/rollback-v2.sh.</div>) },
            { key: "fix", z: 240, node: layer(880, 170, 520, 540, <div style={{ padding: 36, fontFamily: FONT.sans, fontSize: 30, color: DAY.text }}>Quick fix: rename to scripts/rollback-v2.sh</div>) },
            { key: "badge", z: 360, node: <div style={{ position: "absolute", left: 1080, top: 210 }}><Badge state="possibly_stale" theme="day" size={2} /></div> },
          ]}
        />
      </Camera3D>
    </Stage>
  );
};

const DemoBreakout: React.FC = () => {
  const frame = useCurrentFrame();
  const press = pressAt(frame, 80);
  return (
    <Stage world="day" motif="grid">
      <Camera3D>
        <Lift at={0} to={3} x={480} y={170} appear>
          <Card w={960} pad={36}>
            <Eyebrow icon="list">Affected sections</Eyebrow>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {["Prerequisites", "Steps", "If the script times out"].map((t, i) =>
                i === 1 ? (
                  <Breakout key={t} at={30} radius={18}>
                    <div style={{ background: DAY.surface, borderRadius: 18, padding: "20px 24px", border: `2px solid ${DAY.line}` }}>
                      <Row>{t}: names scripts/rollback.sh</Row>
                    </div>
                  </Breakout>
                ) : (
                  <div key={t} style={{ borderRadius: 18, padding: "20px 24px", border: `2px solid ${DAY.line}` }}>
                    <Row muted>{t}</Row>
                  </div>
                ),
              )}
            </div>
            <div style={{ marginTop: 26, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ transform: `scale(${press})`, background: BRAND.fathom, color: DAY.ground, fontFamily: FONT.sans, fontWeight: 600, fontSize: 30, borderRadius: 14, padding: "16px 28px" }}>
                Mark verified
              </div>
            </div>
          </Card>
        </Lift>
        <Press at={80} x={1300} y={655} />
        <Cursor points={[{ frame: 40, x: 1500, y: 900 }, { frame: 80, x: 1300, y: 655, click: true, cursor: "pointer" }]} scale={1.6} showAt={40} />
      </Camera3D>
      <Label>Breakout at 30 (scale 1.07, level 4) · Press + pressAt + Cursor click at 80</Label>
    </Stage>
  );
};

const DemoSlipPush: React.FC = () => (
  <AbsoluteFill>
    <SlipPush at={40} dur={12} from={<PageSurface title="Payments rollback runbook" />} to={<PageSurface title="PR #482: rename rollback script" tint={DAY.text} />} />
    <Label>SlipPush (T5) at 40: three bands, top first, middle last, blur by speed</Label>
  </AbsoluteFill>
);

const DemoWhip: React.FC = () => (
  <AbsoluteFill>
    <WhipBlur
      at={30}
      dir="left"
      from={<PageSurface title="Payments rollback runbook" />}
      to={<WhipBlur at={50} dir="up" from={<PageSurface title="PR #482" />} to={<PageSurface title="Drift Reviewer" />} />}
    />
    <Label>WhipBlur (T9) left at 30, then up at 50 (seam on `at`, directional blur)</Label>
  </AbsoluteFill>
);

const DemoZoom: React.FC = () => (
  <AbsoluteFill>
    <ZoomThrough
      at={40}
      center={[1110, 395]}
      from={
        <PageSurface title="Payments rollback runbook">
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Row muted>By Razvan Statescu</Row>
            <Badge state="possibly_stale" theme="day" size={2} />
          </div>
        </PageSurface>
      }
      to={<PageSurface title="Doc Drift review" />}
    />
    <Label>ZoomThrough (T6) at 40 on the badge: x8 expo in, swap, settle from 0.9</Label>
  </AbsoluteFill>
);

const DemoPushCut: React.FC = () => (
  <AbsoluteFill>
    <PushCut
      at={40}
      from={<PageSurface title="Payments rollback runbook" />}
      to={
        <Stage world="day" motif="grid">
          <ProofFrame {...R7} x={960 - proofRect(R7).outer.w / 2} y={380} at={40} enter="none" exit="none" tag="Recorded in Confluence" />
        </Stage>
      }
    />
    <Label>PushCut (T8) at 40: push in, cut at 5/11 with a 12% Paper flash, settle</Label>
  </AbsoluteFill>
);

const DemoLift: React.FC = () => (
  <Stage world="day" motif="grid">
    <Camera3D>
      {[1, 2, 3, 4].map((lv, i) => (
        <Lift key={lv} at={6 + i * 8} to={lv as 1 | 2 | 3 | 4} contact x={150 + i * 420} y={330} radius={24} down={lv === 4 ? { at: 84 } : undefined}>
          <Card w={340} h={300} radius={24} pad={30}>
            <div style={{ ...T.title, fontSize: 64 }}>{lv}</div>
            <Row muted>{["rest", "lift", "hero", "float"][i]}</Row>
          </Card>
        </Lift>
      ))}
      <Lift at={50} to={4} dark x={760} y={720} radius={20}>
        <div style={{ borderRadius: 20, background: NIGHT.ground, color: NIGHT.text, padding: "22px 30px", fontFamily: FONT.mono, fontSize: 30, boxShadow: ELEV_DARK[1] }}>
          {'"status": "possibly_stale"'}
        </div>
      </Lift>
    </Camera3D>
    <Label>Lift to levels 1 to 4 with contact shadows · dark object · level 4 settles down at 84</Label>
  </Stage>
);

// v5 demos first (Root's Dev/Kit4 is 1800 frames long; the v4 demos follow and the dev entry renders all of them)
const V5_DEMOS: { name: string; C: React.FC; dur: number }[] = [
  { name: "v5-realtake", C: DemoRealTake, dur: DEMO_REALTAKE_FRAMES },
  { name: "v5-edittype", C: DemoEditType, dur: DEMO_EDITTYPE_FRAMES },
  { name: "v5-pageovercode", C: DemoPageOverCode, dur: DEMO_PAGEOVERCODE_FRAMES },
  { name: "v5-carry", C: DemoCarry, dur: DEMO_CARRY_FRAMES },
  { name: "v5-rewind", C: DemoRewind, dur: DEMO_REWIND_FRAMES },
];

const DEMOS: { name: string; C: React.FC }[] = [
  { name: "camera", C: DemoCamera },
  { name: "night", C: DemoNight },
  { name: "type", C: DemoType },
  { name: "numbers", C: DemoNumbers },
  { name: "proof", C: DemoProof },
  { name: "morph", C: DemoMorph },
  { name: "recording", C: DemoRecording },
  { name: "signal", C: DemoSignal },
  { name: "stack", C: DemoStack },
  { name: "breakout", C: DemoBreakout },
  { name: "slippush", C: DemoSlipPush },
  { name: "whip", C: DemoWhip },
  { name: "zoom", C: DemoZoom },
  { name: "pushcut", C: DemoPushCut },
  { name: "lift", C: DemoLift },
];

export const DEMO_FRAMES = 120;

/** Where each demo starts in the gallery (v5 demos, then the v4 demos at 120 frames each). */
export const GALLERY_INDEX: { name: string; from: number; dur: number }[] = (() => {
  const out: { name: string; from: number; dur: number }[] = [];
  let f = 0;
  for (const d of V5_DEMOS) {
    out.push({ name: d.name, from: f, dur: d.dur });
    f += d.dur;
  }
  for (const d of DEMOS) {
    out.push({ name: d.name, from: f, dur: DEMO_FRAMES });
    f += DEMO_FRAMES;
  }
  return out;
})();
export const GALLERY_FRAMES = GALLERY_INDEX.reduce((m, d) => Math.max(m, d.from + d.dur), 0);

const ALL = [...V5_DEMOS.map((d) => ({ name: d.name, C: d.C })), ...DEMOS];

const Gallery: React.FC = () => (
  <AbsoluteFill style={{ background: DAY.ground }}>
    {GALLERY_INDEX.map((g, i) => {
      const C = ALL[i].C;
      return (
        <Sequence key={g.name} from={g.from} durationInFrames={g.dur} name={g.name}>
          <C />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
export default Gallery;

/** For a bloom or glow on the demo badge (unused export keeps amber() referenced for the gallery's palette check). */
export const GALLERY_AMBER = amber(0.3);
