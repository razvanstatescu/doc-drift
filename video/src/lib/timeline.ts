import raw from "../data/timeline.json";
import { BAR, BEAT, FPS } from "./time";

/**
 * Typed access to src/data/timeline.json (owned by the audio agent; schema in BRIEF section 5). Every frame in the
 * file is ABSOLUTE (the film clock). Scenes never hard-code film frames: they ask getScene("<id>") for their own
 * span and get LOCAL frames back (frame 0 = the scene's first frame, which is what useCurrentFrame() returns inside
 * the scene). Re-voicing the film then re-times every scene automatically.
 *
 *   const sc = getScene("A1");
 *   sc.cue("V03")            // local frame where line V03 starts
 *   sc.cue("V03", "end")     // local frame where it ends
 *   sc.wordAt("V03", "rollback")  // local frame of the word "rollback.sh"
 *   sc.marker("reveal")      // a film marker in this scene's local frames (may be negative or past the end)
 *   sc.durationInFrames      // scene length
 */

export interface Word {
  text: string;
  from: number;
  to: number;
}

export interface VoLine {
  id: string;
  scene: string;
  from: number;
  durationInFrames: number;
  file?: string | null;
  text: string;
  words?: Word[];
  [k: string]: unknown;
}

export interface SceneSpan {
  id: string;
  from: number;
  durationInFrames: number;
  [k: string]: unknown;
}

export interface MusicEntry {
  id: string;
  file: string;
  from: number;
  durationInFrames: number;
  gainDb?: number;
  /** How far this entry ducks under the voice, dB (default MIX.duckDb). */
  duckDb?: number;
  [k: string]: unknown;
}

/** Optional mix block the audio agent may add to timeline.json; the defaults live in src/audio/mix.ts. */
export interface MixSettings {
  voDb?: number;
  duckDb?: number;
  attackFrames?: number;
  releaseFrames?: number;
}

export interface Timeline {
  placeholder?: boolean;
  fps: number;
  bpm: number;
  totalFrames: number;
  markers: Record<string, number>;
  scenes: SceneSpan[];
  vo: VoLine[];
  music: MusicEntry[];
  duck: [number, number][];
  mix?: MixSettings;
}

function normalize(input: unknown): Timeline {
  const t = (input ?? {}) as Partial<Timeline>;
  const scenes = [...(t.scenes ?? [])].sort((a, b) => a.from - b.from);
  const lastEnd = scenes.reduce((m, sc) => Math.max(m, sc.from + sc.durationInFrames), 0);
  return {
    placeholder: t.placeholder,
    fps: t.fps ?? FPS,
    bpm: t.bpm ?? 120,
    totalFrames: Math.max(1, t.totalFrames ?? lastEnd),
    markers: t.markers ?? {},
    scenes,
    vo: [...(t.vo ?? [])].sort((a, b) => a.from - b.from),
    music: t.music ?? [],
    duck: (t.duck ?? []).filter((d): d is [number, number] => Array.isArray(d) && d.length === 2),
    mix: t.mix,
  };
}

export const TIMELINE: Timeline = normalize(raw);

if (TIMELINE.fps !== FPS) {
  // The kit assumes 30 fps everywhere (beats are 15 frames). Fail loudly rather than drift.
  throw new Error(`timeline.json says fps ${TIMELINE.fps}; the film is built for ${FPS}`);
}

/** The film's scene ids, in timeline order. */
export const SCENE_ORDER: string[] = TIMELINE.scenes.map((sc) => sc.id);

/** The beat grid runs from the reveal (the score starts on R); before the reveal, from frame 0. */
export const GRID_ORIGIN: number = TIMELINE.markers.scoreStart ?? TIMELINE.markers.reveal ?? 0;

/** Snap an ABSOLUTE frame to the nearest beat (or `unit`) of the film's grid. */
export const snapToGrid = (absFrame: number, unit = BEAT) => GRID_ORIGIN + Math.round((absFrame - GRID_ORIGIN) / unit) * unit;

/** Absolute marker frame. Throws on a missing marker so typos surface early. */
export function marker(name: string): number {
  const v = TIMELINE.markers[name];
  if (typeof v !== "number") throw new Error(`Marker "${name}" not in timeline.json (have: ${Object.keys(TIMELINE.markers).join(", ")})`);
  return v;
}

/** Absolute marker frame, or `fallback` when the marker is not there (yet). */
export const markerOr = (name: string, fallback: number) => (typeof TIMELINE.markers[name] === "number" ? TIMELINE.markers[name] : fallback);

/** A scene's absolute span. Throws on an unknown id. */
export function sceneSpan(id: string): SceneSpan {
  const sc = TIMELINE.scenes.find((x) => x.id === id);
  if (!sc) throw new Error(`Scene "${id}" not in timeline.json (have: ${SCENE_ORDER.join(", ")})`);
  return sc;
}

export const sceneLength = (id: string) => sceneSpan(id).durationInFrames;

/** A VO line with absolute frames. Throws on an unknown id. */
export function voLine(id: string): VoLine {
  const l = TIMELINE.vo.find((x) => x.id === id);
  if (!l) throw new Error(`VO line "${id}" not in timeline.json`);
  return l;
}

/** Word timings for a line (absolute). Estimated from character counts when the file has none. */
export function wordsOf(l: VoLine): Word[] {
  if (l.words && l.words.length > 0) return l.words;
  const words = l.text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 1);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return words.map((w, i) => {
    const a = l.from + Math.round((acc / total) * l.durationInFrames);
    acc += weights[i];
    const b = l.from + Math.round((acc / total) * l.durationInFrames);
    return { text: w, from: a, to: Math.max(a + 1, b) };
  });
}

/** A VO line in a scene's LOCAL frames. */
export interface LocalLine {
  id: string;
  text: string;
  file?: string | null;
  /** Local first frame. */
  from: number;
  durationInFrames: number;
  /** Local frame just after the last one (exclusive). */
  end: number;
  /** Word timings in local frames. */
  words: Word[];
  /** The line as written in timeline.json (absolute frames). */
  abs: VoLine;
}

export interface SceneTiming {
  id: string;
  /** Absolute first frame of the scene. */
  from: number;
  durationInFrames: number;
  /** Absolute frame just after the scene (exclusive). */
  end: number;
  /** VO lines of this scene, local frames, in order. */
  lines: LocalLine[];
  has: (lineId: string) => boolean;
  /** A line of this scene (throws if it is not in this scene, so typos surface early). */
  line: (lineId: string) => LocalLine;
  /** Local frame where a line starts ("start") or ends ("end"). */
  cue: (lineId: string, which?: "start" | "end") => number;
  /** Local frame of the n-th word (0-based; negative counts from the end) of a line. */
  word: (lineId: string, n: number, which?: "from" | "to") => number;
  /**
   * Local frame of the first word whose text starts with `prefix` (case and punctuation ignored); `nth` picks a later
   * match. A word that is not found falls back to the line's start, with a console warning (words come from the take).
   */
  wordAt: (lineId: string, prefix: string, which?: "from" | "to", nth?: number) => number;
  /** A film marker in local frames. Throws if missing. */
  marker: (name: string) => number;
  toLocal: (absFrame: number) => number;
  toAbs: (localFrame: number) => number;
  /** Local frame of beat n counted from the scene start (scenes start on bars, so this sits on the film grid). */
  beat: (n: number) => number;
  /** Local frame of bar n counted from the scene start. */
  bar: (n: number) => number;
  /** Snap a local frame to the film's beat grid (or `unit` frames), returning a local frame. */
  snap: (localFrame: number, unit?: number) => number;
}

const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9#']/g, "");

const warned = new Set<string>();
const warnOnce = (msg: string) => {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(msg);
};

const cache = new Map<string, SceneTiming>();

/** Timing for one scene, in its local frames. Memoised. Throws on an unknown scene id. */
export function getScene(id: string): SceneTiming {
  const hit = cache.get(id);
  if (hit) return hit;
  const span = sceneSpan(id);
  const from = span.from;
  const toLocal = (abs: number) => abs - from;
  const lines: LocalLine[] = TIMELINE.vo
    .filter((l) => l.scene === id)
    .map((l) => ({
      id: l.id,
      text: l.text,
      file: l.file,
      from: l.from - from,
      durationInFrames: l.durationInFrames,
      end: l.from - from + l.durationInFrames,
      words: wordsOf(l).map((w) => ({ text: w.text, from: w.from - from, to: w.to - from })),
      abs: l,
    }));
  const line = (lid: string) => {
    const l = lines.find((x) => x.id === lid);
    if (!l) throw new Error(`Line "${lid}" is not in scene ${id} (have: ${lines.map((x) => x.id).join(", ") || "none"})`);
    return l;
  };
  const timing: SceneTiming = {
    id,
    from,
    durationInFrames: span.durationInFrames,
    end: from + span.durationInFrames,
    lines,
    has: (lid) => lines.some((x) => x.id === lid),
    line,
    cue: (lid, which = "start") => (which === "start" ? line(lid).from : line(lid).end),
    word: (lid, n, which = "from") => {
      const l = line(lid);
      if (l.words.length === 0) return l.from;
      const i = n < 0 ? l.words.length + n : n;
      const w = l.words[Math.max(0, Math.min(i, l.words.length - 1))];
      return w[which];
    },
    wordAt: (lid, prefix, which = "from", nth = 0) => {
      const l = line(lid);
      const p = clean(prefix);
      const matches = l.words.filter((w) => clean(w.text).startsWith(p));
      const w = matches[Math.min(nth, matches.length - 1)];
      if (!w) {
        // Word timings come from the voice take and may be spelled for TTS ("rollback dot S H"), so a missing word
        // falls back to the line's start instead of breaking the render. Check the warning in the Studio console.
        warnOnce(`timeline: no word starting with "${prefix}" in ${lid} ("${l.text}"); using the line start`);
        return l.from;
      }
      return w[which];
    },
    marker: (name) => toLocal(marker(name)),
    toLocal,
    toAbs: (local) => local + from,
    beat: (n) => Math.round(n * BEAT),
    bar: (n) => Math.round(n * BAR),
    snap: (local, unit = BEAT) => snapToGrid(local + from, unit) - from,
  };
  cache.set(id, timing);
  return timing;
}

/** Local start frame of a VO line within its own scene (sugar for getScene(line.scene).cue(id)). */
export function cueLocal(lineId: string, which: "start" | "end" = "start"): number {
  const l = voLine(lineId);
  return getScene(l.scene).cue(lineId, which);
}

/** Which scene is on screen at an absolute frame (the last scene that started at or before it). */
export function sceneAt(absFrame: number): SceneSpan | undefined {
  let found: SceneSpan | undefined;
  for (const sc of TIMELINE.scenes) if (sc.from <= absFrame) found = sc;
  return found;
}
