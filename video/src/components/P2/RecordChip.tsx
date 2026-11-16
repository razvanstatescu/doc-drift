import React from "react";
import { amber, DAY, FONT } from "../../v4/look";
import { ChangeRecord } from "../../v4/twins";

/**
 * The change record on its way (R3 V13 gap): the shared ChangeRecord twin ("PR #482 · 2 files") carrying the rename's
 * amber `-v2` at its leading edge, with its glow and bloom. Amber here is the drift the record carries; it is the
 * shot's one amber and it passes into the runbook's Steps band when the record lands.
 */
export const RecordChip: React.FC<{ glow?: number }> = ({ glow = 1 }) => (
  <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 0 }}>
    <div
      style={{
        position: "absolute",
        left: "40%",
        right: "-30%",
        top: "-120%",
        bottom: "-120%",
        borderRadius: "50%",
        background: `radial-gradient(closest-side, ${amber(0.26 * glow)} 0%, ${amber(0.08 * glow)} 60%, transparent 100%)`,
      }}
    />
    <div style={{ position: "relative" }}>
      <ChangeRecord label="PR #482 · 2 files" at={-1000} k={2.1} />
    </div>
    <span
      style={{
        position: "relative",
        marginLeft: -10,
        display: "inline-flex",
        alignItems: "center",
        height: 58,
        padding: "0 15px",
        borderRadius: 15,
        background: DAY.beacon,
        color: DAY.onBeacon,
        fontFamily: FONT.mono,
        fontSize: 31,
        letterSpacing: 0,
        whiteSpace: "pre",
        boxShadow: `0 0 0 1px rgba(199,119,0,${0.35 * glow}), 0 10px 28px ${amber(0.32 * glow)}`,
      }}
    >
      -v2
    </span>
  </div>
);
