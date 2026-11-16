import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE } from "../../lib/time";
import { Camera3D, ContactShadow, DirBlur, SignalLine } from "../../v4/kit";
import { PageTwin } from "../../v4/twins";
import { PipelineNode } from "../../components/P2/PipelineNode";
import { PrTwin, PR_H, PR_W } from "../../components/P2/PrTwin";
import { RecordChip } from "../../components/P2/RecordChip";
import { CAM_KEYS, CAM_OPTS, lineEase, MATCHER, PAGE, pageProps, PR_POS, RECORD_PATH, recordPoint, RELAY } from "./layout";
import { T } from "./timing";

/**
 * P2's world: one Paper plane under the kit's camera, three stations left to right (the PR, the record's path through
 * the relay and the matcher, the runbook). Everything here is a twin or architecture; proofs, type and the literal are
 * drawn above it in screen space (index.tsx).
 */
export const World: React.FC = () => {
  const frame = useCurrentFrame();
  // the PR card leaves by moving (M3): a push to the left with its smear, as the record takes the amber away
  const out = interpolate(frame, [T.prOut, T.prOut + 13], [0, 1], { ...clamp, easing: EASE.expoIn });
  const outV = interpolate(frame + 0.5, [T.prOut, T.prOut + 13], [0, 1], { ...clamp, easing: EASE.expoIn }) - interpolate(frame - 0.5, [T.prOut, T.prOut + 13], [0, 1], { ...clamp, easing: EASE.expoIn });
  return (
    <Camera3D keys={CAM_KEYS} {...CAM_OPTS}>
      {/* station 1: the pull request */}
      {out < 1 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transform: out > 0 ? `translateX(${-1900 * out}px)` : undefined,
            filter: outV > 0.002 ? "url(#p2-pr-out)" : undefined,
          }}
        >
          <DirBlur id="p2-pr-out" x={Math.min(40, outV * 1900 * 0.05)} />
          <ContactShadow cx={PR_POS.x + PR_W / 2} y={PR_POS.y + PR_H} w={PR_W * 0.86} h={120} strength={0.16} />
          <PrTwin x={PR_POS.x} y={PR_POS.y} mergePress={T.mergePress} mergedAt={T.mergedAt} renameLift={T.renameLift} />
        </div>
      ) : null}

      <PipelineNode cx={RELAY.cx} lineY={RELAY.lineY} label="Bitbucket relay" icon="merge" inAt={T.recordAt} pulseAt={T.relayAt} outAt={T.relayOut} />
      <PipelineNode cx={MATCHER.cx} lineY={MATCHER.lineY} label="Doc Drift matcher" icon="rule" inAt={T.recordAt + 6} pulseAt={T.matcherAt} outAt={T.matcherOut} />

      {/* station 3: the runbook, Verified until the record lands; then the Steps band slips and the byline flags */}
      <ContactShadow cx={PAGE.card.x + PAGE.card.w / 2} y={PAGE.card.y + PAGE.card.h} w={PAGE.card.w * 0.86} h={120} strength={0.16} />
      <PageTwin {...pageProps()} />

    </Camera3D>
  );
};

/**
 * The record, above everything (it pops out of the real header while that proof drops, and must stay crisp): an
 * identical camera, so it rides exactly on the world's line. It docks into the page's edge as the Steps band takes
 * its amber.
 */
export const RecordLayer: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.recordAt || frame >= T.arrive + 4) return null;
  const [rx, ry] = recordPoint(frame);
  const pop = interpolate(frame, [T.recordAt, T.recordAt + 7], [0.5, 1], { ...clamp, easing: EASE.expoOut });
  const into = interpolate(frame, [T.arrive - 5, T.arrive + 3], [1, 0], { ...clamp, easing: EASE.expoIn });
  return (
    <Camera3D keys={CAM_KEYS} {...CAM_OPTS}>
      <div
        style={{
          position: "absolute",
          left: rx,
          top: ry,
          width: "max-content",
          whiteSpace: "nowrap",
          transformOrigin: "100% 50%",
          transform: `translate(-100%, -50%) scale(${pop * (0.35 + 0.65 * into)})`,
          opacity: Math.min(1, into * 1.5),
        }}
      >
        <RecordChip />
      </div>
    </Camera3D>
  );
};

/**
 * The record's line, under the world's stations, in its own layer with an identical camera: masked out under the type
 * zone (the number reads on clean ground) and faded as a trace once the record has landed.
 */
export const LineLayer: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < T.recordAt) return null;
  const trace = interpolate(frame, [T.lineOut, T.lineOut + 12], [1, 0], clamp);
  if (trace <= 0) return null;
  const mask = "linear-gradient(90deg, transparent 0px, transparent 660px, #000 840px)";
  return (
    <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask, opacity: trace < 1 ? trace : undefined }}>
      <Camera3D keys={CAM_KEYS} {...CAM_OPTS}>
        <SignalLine d={RECORD_PATH} at={T.recordAt} dur={T.arrive - T.recordAt} pulse={false} trail width={3} ease={lineEase} />
      </Camera3D>
    </AbsoluteFill>
  );
};
