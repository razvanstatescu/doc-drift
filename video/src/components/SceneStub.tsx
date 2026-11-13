import React from "react";
import { useCurrentFrame } from "remotion";
import { World } from "../brand/theme";
import { FONT, typeStyle, type ThemeName } from "../brand/tokens";
import { getScene } from "../lib/timeline";
import { FPS } from "../lib/time";
import { Caption } from "./Caption";

/** Which world a scene lives in (BRIEF decision 2): Night for the cold open and act A1, Day from A2 on. */
export const worldOf = (sceneId: string): ThemeName => (sceneId === "A0" || sceneId === "A1" ? "night" : "day");

export const SCENE_NAMES: Record<string, string> = {
  A0: "Cold open",
  A1: "The problem",
  A2: "The solution",
  P1: "Anchor",
  P2: "Flag",
  P3: "Agents",
  P4: "Review",
  P5: "Scale",
  A4: "Close",
};

/**
 * Placeholder for a scene not built yet: the scene id and each narration line, set in the kit's type as it is
 * spoken, on the scene's world. Its timing comes only from timeline.json, like a real scene.
 */
export const SceneStub: React.FC<{ id: string }> = ({ id }) => {
  const frame = useCurrentFrame();
  const sc = getScene(id);
  const theme = worldOf(id);
  const current = [...sc.lines].reverse().find((l) => frame >= l.from);
  const index = current ? sc.lines.indexOf(current) + 1 : 0;
  return (
    <World theme={theme} ground={id === "A0" ? "black" : "default"}>
      <div style={{ position: "absolute", left: 96, top: 72, display: "flex", gap: 24, alignItems: "baseline" }}>
        <span style={{ ...typeStyle("small"), fontWeight: 600, opacity: 0.9 }}>{id}</span>
        <span style={{ ...typeStyle("credit"), opacity: 0.6 }}>
          {SCENE_NAMES[id] ?? "Scene"} · stub · {(frame / FPS).toFixed(1)} s of {(sc.durationInFrames / FPS).toFixed(1)} s
        </span>
      </div>
      {current ? (
        <Caption key={current.id} at={current.from} size="title" by="word" center>
          {current.text}
        </Caption>
      ) : (
        <Caption at={0} size="headline" center>
          {SCENE_NAMES[id] ?? id}
        </Caption>
      )}
      <div style={{ position: "absolute", left: 96, bottom: 72, fontFamily: FONT.mono, fontSize: 26, opacity: 0.55 }}>
        {current ? `${current.id} · line ${index} of ${sc.lines.length}` : `${sc.lines.length} lines`}
      </div>
    </World>
  );
};
