import React from "react";
import { Badge } from "../brand/Badge";
import { Icon } from "../brand/icons";
import { DAY, ELEV, type Elev, FONT } from "./look";
import { Drifted, Lit, Tile, UiButton, UiChip } from "./Crafted";

/**
 * The review panel, crafted from the brand's interface kit (canvas board 5) and the real panel's content (captures
 * p4-panel and p4-affected: the why sentence, What changed, Affected section, the rename Quick fix, "No AI used").
 * One amber: the header badge. The changed token carries the trace, not a second amber.
 */
export const ReviewPanel: React.FC<{
  k?: number;
  width?: number;
  elev?: Elev;
  /** Lift the first event row out of the panel toward the camera (0..1). */
  breakout?: number;
  style?: React.CSSProperties;
}> = ({ k = 1.6, width = 790, elev = 3, breakout = 0, style }) => {
  const u = (n: number) => n * k;
  const h4: React.CSSProperties = { fontSize: u(16), lineHeight: `${u(22)}px`, fontWeight: 600, margin: 0 };
  return (
    <div
      style={{
        width: u(width),
        borderRadius: u(22),
        background: DAY.surface,
        boxShadow: ELEV[elev],
        fontFamily: FONT.sans,
        color: DAY.text,
        overflow: "visible",
        ...style,
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: u(12), padding: `${u(18)}px ${u(24)}px`, borderBottom: `${u(1)}px solid ${DAY.line}` }}>
        <Tile size={u(30)} />
        <span style={{ fontSize: u(21), lineHeight: 1, fontWeight: 600, letterSpacing: "-0.01em" }}>Payments rollback runbook</span>
        <Badge state="possibly_stale" size={k} glow={1} />
        <span style={{ flex: 1 }} />
        <Icon name="x" size={u(20)} color={DAY.textMuted} />
      </div>
      {/* the why */}
      <div style={{ padding: `${u(16)}px ${u(24)}px 0`, fontSize: u(15), lineHeight: `${u(23)}px` }}>
        PR #482 renamed <Lit>scripts/rollback.sh</Lit> to <Lit>scripts/rollback-v2.sh</Lit>, an anchor of this page.
        <div style={{ marginTop: u(6), display: "flex", alignItems: "center", gap: u(7), fontSize: u(13), lineHeight: `${u(18)}px`, color: DAY.textMuted }}>
          <Icon name="hand" size={u(15)} color={DAY.textMuted} />
          Agents are told not to trust this page until someone reviews it.
        </div>
      </div>
      {/* body */}
      <div style={{ display: "flex", gap: u(22), padding: `${u(18)}px ${u(24)}px ${u(20)}px` }}>
        <div style={{ width: u(336), flex: "none", display: "grid", gap: u(10), alignContent: "start" }}>
          <h4 style={h4}>What changed</h4>
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "grid",
              gap: u(10),
              padding: `${u(13)}px ${u(15)}px`,
              borderRadius: u(14),
              background: DAY.surface,
              boxShadow: breakout > 0 ? ELEV[4] : `inset 0 0 0 ${u(1)}px ${DAY.line}`,
              transform: breakout > 0 ? `translate(${-u(18) * breakout}px, ${-u(6) * breakout}px) scale(${1 + 0.07 * breakout})` : undefined,
              transformOrigin: "100% 50%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: u(8), fontSize: u(14), lineHeight: 1 }}>
              <Icon name="merge" size={u(17)} color={DAY.textMuted} />
              <span style={{ fontWeight: 600 }}>PR #482 merged</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: u(12.5), color: DAY.textMuted }}>6 minutes ago</span>
            </div>
            <div style={{ display: "grid", gap: u(3), padding: `${u(7)}px ${u(10)}px`, borderRadius: u(8), background: DAY.surfaceSunk }}>
              <Lit size={u(12.2)} color={DAY.textMuted}>
                scripts/rollback.sh
              </Lit>
              <Lit size={u(12.2)}>{"-> scripts/rollback-v2.sh"}</Lit>
            </div>
            <div style={{ display: "flex", gap: u(7), flexWrap: "wrap" }}>
              <UiChip k={k} bg={DAY.staleTint} color={DAY.stale}>
                High
              </UiChip>
              <UiChip k={k} mono>
                payments-api: scripts/rollback.sh
              </UiChip>
            </div>
          </div>
          <div style={{ display: "grid", gap: u(9), padding: `${u(12)}px ${u(15)}px`, borderRadius: u(14), boxShadow: `inset 0 0 0 ${u(1)}px ${DAY.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: u(8), fontSize: u(14), lineHeight: 1 }}>
              <Icon name="merge" size={u(17)} color={DAY.textMuted} />
              <span style={{ fontWeight: 600 }}>PR #482 merged</span>
              <span style={{ flex: 1 }} />
              <UiChip k={k}>Medium</UiChip>
            </div>
            <Lit size={u(12.2)} color={DAY.text}>
              deploy/helm/values.yaml · +1 −1
            </Lit>
            <div style={{ display: "flex" }}>
              <UiChip k={k} mono>
                payments-api: deploy/helm/values.yaml
              </UiChip>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "grid", gap: u(10), alignContent: "start" }}>
          <h4 style={h4}>Affected section</h4>
          <div style={{ padding: `${u(13)}px ${u(15)}px`, borderRadius: u(14), background: DAY.ground }}>
            <div style={{ fontSize: u(13), lineHeight: 1, fontWeight: 600, color: DAY.textMuted }}>Steps</div>
            <div style={{ marginTop: u(9), fontSize: u(14), lineHeight: `${u(21)}px` }}>
              2. Run the rollback script from the root of the <Lit>payments-api</Lit> repo.
            </div>
            <div
              style={{
                marginTop: u(9),
                padding: `${u(8)}px ${u(10)}px`,
                borderRadius: u(8),
                background: DAY.surface,
                boxShadow: `inset 0 0 0 ${u(1)}px ${DAY.line}`,
                fontFamily: FONT.mono,
                fontSize: u(11.4),
                lineHeight: `${u(19)}px`,
                letterSpacing: "-0.01em",
                whiteSpace: "pre",
              }}
            >
              {"./scripts/"}
              <Drifted k={k}>rollback.sh</Drifted>
              {" --timeout $ROLLBACK_TIMEOUT"}
            </div>
          </div>
          <h4 style={{ ...h4, marginTop: u(8) }}>Quick fix</h4>
          <div style={{ padding: `${u(12)}px ${u(15)}px`, borderRadius: u(14), boxShadow: `inset 0 0 0 ${u(1)}px ${DAY.line}`, fontSize: u(13.5), lineHeight: `${u(20)}px` }}>
            Replace <Lit>scripts/rollback.sh</Lit> with <Lit>scripts/rollback-v2.sh</Lit> in 1 place.
            <div style={{ marginTop: u(5), fontSize: u(12), lineHeight: `${u(17)}px`, color: DAY.textMuted }}>Suggested from PR #482. No AI used.</div>
          </div>
        </div>
      </div>
      {/* footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: u(8), padding: `${u(14)}px ${u(24)}px`, borderTop: `${u(1)}px solid ${DAY.line}` }}>
        <UiButton k={k} kind="quiet">
          Dismiss
        </UiButton>
        <UiButton k={k} kind="link">
          Snooze 7 days
        </UiButton>
        <UiButton k={k} kind="primary">
          Mark verified
        </UiButton>
      </div>
    </div>
  );
};
