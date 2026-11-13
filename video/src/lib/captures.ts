import capturesJson from "../data/captures.json";
import platesJson from "../data/plates.json";

/**
 * Typed access to the capture agent's src/data/captures.json and the evidence agent's src/data/plates.json (schemas in
 * BRIEF section 5). Coordinates in captures are CAPTURE pixels (2x of CSS).
 */

export type Box = [number, number, number, number]; // x, y, w, h

export interface CaptureMask {
  box: Box;
  why?: string;
  /** Flat fill for the cover (default white, Confluence's light UI). */
  fill?: string;
}

export interface Capture {
  id: string;
  file: string;
  kind: "still" | "video";
  width: number;
  height: number;
  fps?: number;
  takenAt?: string;
  env?: string;
  app?: string;
  page?: string;
  shows?: string;
  clicks?: { x: number; y: number; label?: string; atMs?: number }[];
  masks?: CaptureMask[];
  notes?: string;
  [k: string]: unknown;
}

type CapturesFile = { captures?: Capture[]; toolOutput?: Record<string, unknown>; measured?: Record<string, number> };
const CAPS = capturesJson as unknown as CapturesFile;

export const CAPTURES: Capture[] = CAPS.captures ?? [];

/** A capture by id, or undefined (the capture agent may not have made it yet). */
export const findCapture = (id: string) => CAPTURES.find((c) => c.id === id);

/** A measured number (for example "mergeToFlagSeconds"), or `fallback` when it is not measured yet. */
export const measured = (name: string, fallback: number) => (typeof CAPS.measured?.[name] === "number" ? (CAPS.measured[name] as number) : fallback);

/** Real tool output recorded by the capture agent (for the terminal shots). */
export const toolOutput = (name: string): unknown => CAPS.toolOutput?.[name];

export interface Plate {
  id: string;
  kind: "real" | "quote" | "built";
  file?: string;
  width?: number;
  height?: number;
  source?: string;
  url?: string;
  date?: string;
  readOn?: string;
  text?: string;
  keyPhrases?: { text: string; box: Box }[];
  licence?: string;
  blurred?: unknown[];
  notes?: string;
  [k: string]: unknown;
}

export const PLATES: Plate[] = ((platesJson as unknown as { plates?: Plate[] }).plates ?? []) as Plate[];
export const findPlate = (id: string) => PLATES.find((p) => p.id === id);
