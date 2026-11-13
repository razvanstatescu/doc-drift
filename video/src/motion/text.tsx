import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { clamp, EASE } from "../lib/time";

/**
 * Text that sets in, then holds PERFECTLY still while it is read (BRIEF section 7: 12-18 frames, Spline Sans 600).
 * Each line (or word) rises out of its own mask with expo out, with a short opacity ramp so the first frames are soft.
 * After `at + dur + stagger * (n - 1)` nothing moves. `out` (optional) takes it away again with expo in.
 *
 *   <SetIn at={sc.cue("V05")} style={typeStyle("headline")}>A date can't see a merge.</SetIn>
 *   <SetIn at={12} by="word" stagger={2} lines={["Anchor.", "Flag."]} />
 *
 * Reading time starts when the text is still: use holdFrames(text) from lib/time before `out`.
 */
export type SetInProps = {
  /** Local frame the set-in starts. Default 0. */
  at?: number;
  /** Frames per line or word (default 15). */
  dur?: number;
  /** Unit that sets in: a line (default), each word, or the whole block at once. */
  by?: "line" | "word" | "block";
  /** "mask": rises out of a mask (default). "fade": fades up while rising 0.2 em. */
  mode?: "mask" | "fade";
  /** Frames between units (default 3 for lines, 2 for words). */
  stagger?: number;
  /** Local frame the exit starts (optional). */
  out?: number;
  /** Frames of the exit (default 8). */
  outDur?: number;
  /** Lines to set. Otherwise the children string (split on "\n"). */
  lines?: string[];
  children?: string;
  style?: React.CSSProperties;
  /** Text alignment of the block. */
  align?: "left" | "center" | "right";
};

/** Progress of a unit that starts at `start` (0..1), for custom set-ins. */
export const setInProgress = (frame: number, start: number, dur = 15) =>
  interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: EASE.expoOut });

export const SetIn: React.FC<SetInProps> = ({
  at = 0,
  dur = 15,
  by = "line",
  mode = "mask",
  stagger,
  out,
  outDur = 8,
  lines,
  children,
  style,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const textLines = lines ?? (children ?? "").split("\n");
  const step = stagger ?? (by === "word" ? 2 : 3);
  const exit = out === undefined ? 0 : interpolate(frame, [out, out + outDur], [0, 1], { ...clamp, easing: EASE.expoIn });
  if (out !== undefined && frame >= out + outDur) return null;

  const unit = (text: string, i: number, key: string, inline: boolean) => {
    const start = at + i * (by === "block" ? 0 : step);
    const p = setInProgress(frame, start, dur);
    const opacity = interpolate(p, [0, 0.45], [0, 1], clamp) * (1 - exit);
    const y = mode === "mask" ? (1 - p) * 105 - exit * 105 : (1 - p) * 20;
    const inner: React.CSSProperties = {
      // words are inline boxes and never break; a line is a block and wraps inside its own mask
      display: inline ? "inline-block" : "block",
      transform: y !== 0 ? (mode === "mask" ? `translateY(${y}%)` : `translateY(${y / 100}em)`) : undefined,
      opacity,
      whiteSpace: inline ? "pre" : "pre-wrap",
    };
    if (mode === "fade") return <span key={key} style={inner}>{text}</span>;
    // The mask: room for descenders and accents inside it, given back to the layout by negative margins. Lines use a
    // block mask (no percentage widths), so a shrink-to-fit parent sizes it from the text and nothing wraps early.
    const mask: React.CSSProperties = inline
      ? { display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.08em 0.04em 0.16em", margin: "-0.08em -0.04em -0.16em" }
      : { display: "block", overflow: "hidden", padding: "0.08em 0.04em 0.16em", margin: "-0.08em -0.04em -0.16em" };
    return (
      <span key={key} style={mask}>
        <span style={inner}>{text}</span>
      </span>
    );
  };

  let n = 0;
  return (
    <div style={{ textAlign: align, ...style }}>
      {textLines.map((line, li) => {
        if (by !== "word") return unit(line, n++, `l${li}`, false);
        const words = line.split(" ");
        return (
          <div key={li} style={{ display: "block" }}>
            {words.map((w, wi) => (
              <React.Fragment key={wi}>
                {unit(w, n++, `w${li}-${wi}`, true)}
                {wi < words.length - 1 ? " " : null}
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
};
