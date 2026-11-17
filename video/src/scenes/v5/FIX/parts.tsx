import React from "react";
import { useCurrentFrame } from "remotion";
import { Icon, type IconName } from "../../../brand/icons";
import { EASE, tween } from "../../../lib/time";
import { amber, BRAND, DAY, elevAt, FONT, InkLabel, MaskLine, MistBand, NIGHT, type Rect } from "../../../v4/kit";

/**
 * FIX's own pieces (v5, video/V5.md section 5). Everything else is the kit's RealTake on the real captures.
 *   AgentChips     the two agents beside the page, tagged "Read only" (S16 "never agents")
 *   PlateAmber     the drift's amber on a real plate's byline item, multiplied so the real words stay as printed;
 *                  it leaves by a wipe on the snap back
 *   OutputLine     the real checkVerified guidance as one terminal line: the slab unrolls and the line rises with the
 *                  kit's MaskLine (the functional type voice), "Safe to cite." marked on "cite"
 * "Verified." becoming the byline's word is the kit's EditType TypeToUI (index.tsx).
 */

// ---------------------------------------------------------------------------------------------------------------------
// The agents, read only
// ---------------------------------------------------------------------------------------------------------------------

const Chip: React.FC<{ icon: IconName; label: string; up: number }> = ({ icon, label, up }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 16,
      height: 84,
      padding: "0 30px 0 22px",
      borderRadius: 22,
      background: DAY.surface,
      boxShadow: elevAt(1 + 2 * up),
      fontFamily: FONT.sans,
      fontSize: 34,
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: DAY.text,
      whiteSpace: "nowrap",
    }}
  >
    <span style={{ display: "grid", placeItems: "center", width: 50, height: 50, borderRadius: 14, background: DAY.surfaceSunk }}>
      <Icon name={icon} size={30} color={DAY.text} />
    </span>
    {label}
  </div>
);

/** The two agent chips and their "Read only" tag: lift in on "never agents" (staggered 3 f), leave with the cut. */
export const AgentChips: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const up = (i: number) => tween(frame, at + 3 * i, at + 3 * i + 12, 0, 1, EASE.expoOut);
  const item = (i: number, node: React.ReactNode) => (
    <div style={{ transform: `translateY(${(1 - up(i)) * 26}px)`, opacity: Math.min(1, up(i) * 4) }}>{node}</div>
  );
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 18 }}>
      <div style={{ display: "flex", gap: 18 }}>
        {item(0, <Chip icon="comment" label="Rovo agent" up={up(0)} />)}
        {item(1, <Chip icon="terminal" label="Coding assistant" up={up(1)} />)}
      </div>
      {item(2, <InkLabel icon="eye" size={30}>Read only</InkLabel>)}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The amber on a real plate
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The drift's one amber on a real byline item (capture px): beacon multiplied into the plate (the real words stay as
 * printed, dark on amber), with its bloom. From `out` it leaves by a wipe left to right in 5 frames (the snap back).
 */
export const PlateAmber: React.FC<{ rect: Rect; at?: number; out?: number }> = ({ rect, at = -100, out }) => {
  const frame = useCurrentFrame();
  const inn = tween(frame, at, at + 9, 0, 1, EASE.expoOut);
  const gone = out === undefined ? 0 : tween(frame, out, out + 5, 0, 1, EASE.expoIn);
  if (inn <= 0 || gone >= 1) return null;
  const pad = 8;
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: rect.x - rect.w * 0.1,
          top: rect.y - rect.h * 0.9,
          width: rect.w * 1.2,
          height: rect.h * 2.8,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${amber(0.22 * inn * (1 - gone))}, ${amber(0)})`,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: rect.x - pad,
          top: rect.y - pad,
          width: rect.w + 2 * pad,
          height: rect.h + 2 * pad,
          borderRadius: 10,
          background: BRAND.beacon,
          mixBlendMode: "multiply",
          clipPath: `inset(-2px ${(1 - inn) * 100}% -2px ${gone * 100}% round 10px)`,
          pointerEvents: "none",
        }}
      />
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// The real output line
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The real checkVerified guidance as one terminal line on a dark slab (Night ground, the terminal's look): the slab
 * unrolls in 12 frames and the line rises from behind its baseline (the kit's MaskLine, 13 frames); a tag "Real output:
 * doc-drift MCP" above it; the Mist band on "Safe to cite." at `mark`. `pre` and `focus` are the line split around the
 * marked words (verbatim).
 */
export const OutputLine: React.FC<{ at: number; mark: number; x: number; y: number; pre: string; focus: string; size?: number }> = ({
  at,
  mark,
  x,
  y,
  pre,
  focus,
  size = 30,
}) => {
  const frame = useCurrentFrame();
  if (frame < at - 1) return null;
  const up = tween(frame, at, at + 12, 0, 1, EASE.expoOut);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateY(${(1 - up) * 24}px)` }}>
      <div style={{ position: "absolute", left: 0, top: -64, opacity: Math.min(1, up * 3) }}>
        <InkLabel icon="eye" size={28}>
          Real output: doc-drift MCP
        </InkLabel>
      </div>
      <div
        style={{
          padding: "26px 34px",
          borderRadius: 24,
          background: NIGHT.ground,
          boxShadow: elevAt(2 + 2 * up, true),
          clipPath: `inset(0 0 ${(1 - up) * 100}% 0 round 24px)`,
        }}
      >
        <MaskLine at={at + 3} dur={13} style={{ height: size * 1.5 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: size, lineHeight: `${size * 1.5}px`, letterSpacing: "-0.01em", color: NIGHT.text, whiteSpace: "pre" }}>
            <span style={{ color: NIGHT.link }}>{'"guidance"'}</span>
            <span style={{ color: NIGHT.textMuted }}>: </span>
            <span style={{ color: BRAND.mist }}>
              {pre}
              <MistBand at={mark} world="night">
                {focus}
              </MistBand>
              {'"'}
            </span>
          </div>
        </MaskLine>
      </div>
    </div>
  );
};
