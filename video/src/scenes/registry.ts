import type { ComponentType } from "react";
import A0 from "./A0";
import A1 from "./A1";
import A2 from "./A2";
import P1 from "./P1";
import P2 from "./P2";
import P3 from "./P3";
import P4 from "./P4";
import P5 from "./P5";
import A4 from "./A4";

/**
 * Scene components by id. The ORDER and the timing of the film come from the `scenes` of src/data/timeline.json; each
 * scene renders inside a <Sequence> at its span, so useCurrentFrame() is local to the scene. A scene in the timeline
 * without an entry here renders as a SceneStub.
 */
export const SCENES: Record<string, ComponentType> = { A0, A1, A2, P1, P2, P3, P4, P5, A4 };
