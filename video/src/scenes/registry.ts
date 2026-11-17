import type { ComponentType } from "react";
import PROBLEM from "./v5/PROBLEM";
import PROMISE from "./v5/PROMISE";
import LOOP from "./v5/LOOP";
import AGENTS from "./v5/AGENTS";
import FIX from "./v5/FIX";
import JIRA from "./v5/JIRA";
import CLOSE from "./v5/CLOSE";

/**
 * Scene components by id (v5, video/V5.md). The ORDER and the timing of the film come from the `scenes` of
 * src/data/timeline.json; each scene renders inside a <Sequence> at its span, so useCurrentFrame() is local to the scene.
 * A scene in the timeline without an entry here renders as a SceneStub.
 *
 * v4's scenes (src/scenes/A0 ... A4) are kept for reference; they read v4 cue ids and throw with the v5 timeline, so
 * they are not imported here. v4's timeline is src/data/timeline-v4.json.
 */
export const SCENES: Record<string, ComponentType> = { PROBLEM, PROMISE, LOOP, AGENTS, FIX, JIRA, CLOSE };
