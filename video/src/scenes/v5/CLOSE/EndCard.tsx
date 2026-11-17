import React from "react";
import { useCurrentFrame } from "remotion";
import { measureText } from "@remotion/layout-utils";
import { Lockup } from "../../../brand/Lockup";
import { EASE, tween } from "../../../lib/time";
import { CurrentUnderline, DAY, FONT, ink, KineticLine, Lift, useFontsReady } from "../../../v4/kit";
import { CARD, CUE, DUR, LINE, TAGLINE, URL } from "./timing";

/**
 * The v5 end card on Paper (V5.md section 5, CLOSE), first copied from v4's src/components/A4/EndCardDay.tsx and
 * rebuilt here. Laid out in film px on the 1920 x 1080 stage; the scene's Stage and Camera3D frame it.
 *
 *   the lockup     "Doc Drift" (the brand's Lockup, the Night tile). It lands big at the centre on the hit, with its
 *                  middle band in line; as the kit's slip reveal clears, the band slips out in amber (the logo's own
 *                  move, continuing the reveal's middle band: the graphic match). The name sets on "Doc Drift", and
 *                  the lockup glides up into its place at the top before "for Confluence"
 *   the line       "For Confluence · with Jira and Bitbucket", set in three groups on their words (mask reveals)
 *   the URL        razvanstatescu.github.io/doc-drift at reading size, on a white card that lifts on "Get it here";
 *                  the Current underline is drawn on "here"
 *   the tagline    "Docs that know when the code moved." on S22, word by word (KineticLine)
 *   the credit     "Built on Atlassian Forge for Codegeist 2026", small and muted. No maker line.
 * The mark's slip is the card's one amber. Nothing fades out: the scene's camera creeps to the last frame.
 */

/** A functional line reveal: the words rise from behind their own baseline (no smear, no fade), 13 frames, expo out. */
const Mask: React.FC<{ at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, dur = DUR.mask, children, style }) => {
  const frame = useCurrentFrame();
  const t = tween(frame, at, at + dur, 0, 1, EASE.expoOut);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.04em 0.16em", margin: "-0.06em -0.04em -0.16em", ...style }}>
      <span style={{ display: "inline-block", visibility: frame < at ? "hidden" : undefined, transform: t < 1 ? `translateY(${((1 - t) * 108).toFixed(2)}%)` : undefined, whiteSpace: "pre" }}>
        {children}
      </span>
    </span>
  );
};

/** The lockup: the brand's own artwork and name, moved only as one (and its slip, the one part that may move). */
const LockupLanding: React.FC = () => {
  const frame = useCurrentFrame();
  const ready = useFontsReady();
  const H = CARD.icon;
  const nameSize = H * 0.42;
  const nameW = ready ? measureText({ text: "Doc Drift", fontFamily: FONT.sans, fontWeight: 600, fontSize: nameSize, letterSpacing: "-0.02em" }).width : nameSize * 4.3;
  const rowW = H + H * 0.28 + nameW;

  // it lands on the hit: up from below its place, growing a little, its contact shadow opening (expo out)
  const land = tween(frame, 0, CUE.land, 0, 1, EASE.expoOut);
  const slip = tween(frame, CUE.slip, CUE.slip + 6, 0, 1, EASE.expoOut);
  const name = tween(frame, CUE.name, CUE.name + DUR.name, 0, 1, EASE.expoOut);
  // alone at first, the tile sits at the centre; as the name sets the row forms around the centre
  const alone = 1 - tween(frame, CUE.name - 1, CUE.name + 13, 0, 1, EASE.expoOut);
  // then it glides (as one) to the S21 card, and settles into the final card before the tagline
  const glide = tween(frame, CUE.glide, CUE.glide + CARD.glideFrames, 0, 1, EASE.cubicInOut);
  const settle = tween(frame, CUE.settle, CUE.settle + CARD.glideFrames, 0, 1, EASE.cubicInOut);
  const s = Math.exp(Math.log(CARD.hero) + (Math.log(CARD.mid) - Math.log(CARD.hero)) * glide - Math.log(CARD.mid) * settle);
  const cy = CARD.heroCy + (CARD.midCy - CARD.heroCy) * glide + (CARD.lockupCy - CARD.midCy) * settle;
  const tx = s * alone * (rowW / 2 - H / 2);
  const rise = (1 - land) * 30;
  const k = s * (0.965 + 0.035 * land);
  return (
    <div
      style={{
        position: "absolute",
        left: 960 - rowW / 2,
        top: CARD.lockupCy - H / 2,
        width: rowW,
        height: H,
        transformOrigin: "50% 50%",
        transform: `translate(${tx.toFixed(2)}px, ${(cy - CARD.lockupCy + rise).toFixed(2)}px) scale(${k.toFixed(4)})`,
      }}
    >
      {/* the ground's contact shadow under the tile (the light is above; the tile is an object on the Paper) */}
      <div
        style={{
          position: "absolute",
          left: H * 0.06,
          width: H * 0.88,
          top: H - 6 + (1 - land) * 10,
          height: 40,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${ink(0.3 * land)} 0%, ${ink(0.11 * land)} 50%, transparent 100%)`,
          filter: "blur(6px)",
        }}
      />
      <div style={{ position: "relative" }}>
        <Lockup height={H} variant="icon" theme="day" mark={{ slip, tile: 1, land: 1 }} name={name} />
      </div>
    </div>
  );
};

/** The line under the lockup, set in three groups on their words; it settles up with the lockup before S22. */
const WorksWith: React.FC = () => {
  const frame = useCurrentFrame();
  const settle = tween(frame, CUE.settle, CUE.settle + CARD.glideFrames, 0, 1, EASE.cubicInOut);
  return (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: CARD.lineMidTop + (CARD.lineTop - CARD.lineMidTop) * settle,
      textAlign: "center",
      fontFamily: FONT.sans,
      fontWeight: 500,
      fontSize: CARD.lineSize,
      lineHeight: `${Math.round(CARD.lineSize * 1.25)}px`,
      letterSpacing: "-0.01em",
      color: DAY.text,
      whiteSpace: "nowrap",
    }}
  >
    {LINE.map((w, i) => (
      <React.Fragment key={i}>
        <Mask at={w.at}>{w.muted ? <span style={{ color: DAY.textMuted }}>{w.text}</span> : w.text}</Mask>
        {i < LINE.length - 1 ? " " : null}
      </React.Fragment>
    ))}
  </div>
  );
};

/** The URL at reading size on a white card that lifts on "Get it here"; the Current underline is drawn on "here". */
const UrlCard: React.FC = () => {
  const ready = useFontsReady();
  const w = (ready ? measureText({ text: URL, fontFamily: FONT.mono, fontWeight: 500, fontSize: CARD.urlSize, letterSpacing: "-0.01em" }).width : URL.length * CARD.urlSize * 0.6) + 2 * CARD.urlPadX;
  const h = Math.round(CARD.urlSize * 1.3) + 2 * CARD.urlPadY;
  return (
    <Lift at={CUE.url} dur={DUR.lift} from={1} to={3} radius={24} x={960 - w / 2} y={CARD.urlCy - h / 2} w={w} h={h}>
      <div
        style={{
          width: w,
          height: h,
          boxSizing: "border-box",
          borderRadius: 24,
          background: DAY.surface,
          padding: `${CARD.urlPadY}px ${CARD.urlPadX}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Mask at={CUE.url + 1} style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: CARD.urlSize, lineHeight: `${Math.round(CARD.urlSize * 1.3)}px`, letterSpacing: "-0.01em", color: DAY.text }}>
          <CurrentUnderline at={CUE.here} dur={10}>
            {URL}
          </CurrentUnderline>
        </Mask>
      </div>
    </Lift>
  );
};

/** The credit: small, muted, set once the URL is in. */
const Credit: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, top: CARD.creditTop, textAlign: "center" }}>
    <Mask at={CUE.credit} style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 30, lineHeight: "38px", color: DAY.textMuted }}>
      Built on Atlassian Forge for Codegeist 2026
    </Mask>
  </div>
);

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <LockupLanding />
      <WorksWith />
      <UrlCard />
      {frame >= TAGLINE.at - TAGLINE.lead - 2 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: CARD.tagTop }}>
          <KineticLine
            text={TAGLINE.text}
            at={TAGLINE.at}
            words={TAGLINE.words}
            lead={TAGLINE.lead}
            dur={TAGLINE.dur}
            size={CARD.tagSize}
            lineHeight={CARD.tagLine}
            align="center"
            color={DAY.text}
            style={{ whiteSpace: "nowrap" }}
          />
        </div>
      ) : null}
      <Credit />
    </div>
  );
};
