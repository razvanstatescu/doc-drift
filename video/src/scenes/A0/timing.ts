import { Easing, interpolate } from "remotion";
import clipsJson from "../../../public/clips/clips.json";
import { getScene } from "../../lib/timeline";

/**
 * A0, the cold open. Local frames (A0 starts at film frame 0, so they equal film frames today). 120 BPM at 30 fps: a
 * beat is 15 f, a bar 60 f. The barrage is built on M0's three bars (m0.wav is exactly 180 f and stops dead on its
 * last sample), so its cut list is fixed; everything from the black on hangs off timeline.json (blackStart, V00, the
 * reveal R, V01), so a new voice take re-times the turn and the reveal.
 *
 *   bar 1    0–59   "The code moved."          f0–29 our diff card (the film reads from frame 0), punched in on beat 2;
 *                                              f30 cut to the wall of evidence on arXiv's "63.2%"; a whip across
 *                                              Google's SRE book lands on two Hacker News comments on beat 4; f55–59
 *                                              the camera dives through them
 *   bar 2   60–119  "The docs didn't."         the Wikimedia incident report slams onto the glass over the dimmed
 *                                              tunnel and holds (punch on "Documentation was outdated" as Ariel says
 *                                              "outdated"); f93–97 dive; slams back to back from f98
 *   bar 3  120–179  "The agents can't tell."   the tunnel accelerates and rolls; slams of 8, 7, 6, 5 and 6 frames;
 *                                              the last is Atlassian's own line (f152, 19 clean frames to f172);
 *                                              f173–179 the whole barrage is sucked to the centre
 *          180      HARD CUT to true black and digital silence (M0, the riser and the suck-in stop dead)
 *          V00      "That's why we built Doc Drift Sentinel." on the black, word by word with the voice; it holds
 *                   until the last word has ended, then clears as the ground lifts to Night
 *          R − 11   the top band lands (tick)
 *          R − 5    the bottom band lands with the trace between them (tick)
 *          R        THE SLIP: the middle band slides out of the trace in amber, with its glow (slip; the score's
 *                   first downbeat). The first amber pixel of the film
 *          R + 12   the mark settles into the horizontal lockup (its tile fades in); the name sets in; the
 *                   tagline sets in with V01
 *          END      hard cut into A1
 */
const sc = getScene("A0");
export const SC = sc;

export const BEAT = 15;
export const BAR = 60;
export const BAR2 = 60;
export const BAR3 = 120;
/** The hard cut to black (bar 4's downbeat). M0 is three bars long, so this is 180. */
export const BLACK = sc.marker("blackStart");
if (BLACK !== 180) console.warn(`A0: blackStart is ${BLACK}; the barrage and M0 are built for 180`);

/** The reveal: the middle band slips on this frame (the score's first downbeat). */
export const R = sc.marker("reveal");
export const END = sc.durationInFrames;

export const V00 = sc.line("V00");
export const V01 = sc.line("V01");

// ── the real voice (Mikey Ariel, CC BY; public/clips/clips.json) ────────────────────────────────────────────────────
type ClipJson = { id: string; file: string; durationSeconds: number; speechOnsetSeconds: number; speechEndSeconds: number };
const ARIEL = (clipsJson as unknown as { clips: ClipJson[] }).clips.find((c) => c.id === "ariel");
if (!ARIEL) throw new Error("A0: clip 'ariel' missing from public/clips/clips.json");

/** The clip's t = 0 plays on this frame: "Bad" lands near f38 and "documentation." ends near f172.5, before the suck. */
export const CLIP_AT = 30;
export const CLIP = {
  src: ARIEL.file,
  at: CLIP_AT,
  frames: Math.ceil(ARIEL.durationSeconds * 30),
  /** Speech span on A0's clock (from the clip's measured onset and end). */
  speechFrom: CLIP_AT + ARIEL.speechOnsetSeconds * 30,
  speechTo: CLIP_AT + ARIEL.speechEndSeconds * 30,
};

// ── the barrage's cut list (bars 1–3) ────────────────────────────────────────────────────────────────────────────
/**
 * Bar 1: our diff card holds a full second (the film's thesis image must read with the sound off; QA v1 #1), with a
 * punch-in on beat 2, then the cut to the wall on beat 3.
 */
export const DIFF_TO = 30;
export const DIFF_PUNCH = 15;
/** The whip from the arXiv read to the Hacker News comments (peak f42; it lands on beat 4, f45). */
export const WHIPS = [{ at: 39, dur: 6 }];
/** Punch-ins on the strip's key phrases: the arXiv push from the cut, then the Hacker News punch. */
export const PUNCHES = [DIFF_TO, 46];
/** The strip dives through the last bar-1 plate into the hero. */
export const STRIP_DIVE = { from: 55, to: BAR2 };

/** Bar 3's last slam: Atlassian's own line, held to the suck-in. */
export const LAST_SLAM = 152;
/** Bar 2: the hero on the glass, its punch on "outdated", and the dive into the slams. */
export const HERO = { from: BAR2, punch: 73, dive: { from: 93, to: 98 } };
/** f173–179: everything is sucked in toward the centre (the suck-in's inhale). */
export const IMPLODE = { from: 173, to: BLACK };

// ── the turn and the reveal (all from timeline.json) ────────────────────────────────────────────────────────────
/**
 * The bridge title holds, complete, until V00's last word has ended (its word frames in timeline.json), then clears
 * as the Night ground lifts (QA v1 #4: it used to fade while "Sentinel" was still being spoken).
 */
const V00_LAST = V00.words.length > 0 ? V00.words[V00.words.length - 1].to : V00.end - 4;
export const TITLE_OUT = V00_LAST;
export const TITLE_OUT_FRAMES = 4;
/** The two bands land after the title has gone, a short pickup into the slip (R − 11 and R − 5 today). */
export const BAND_TOP = Math.max(R - 11, TITLE_OUT + TITLE_OUT_FRAMES + 2);
export const BAND_BOTTOM = Math.max(R - 5, BAND_TOP + 4);
export const SLIP_FRAMES = 6;
/** The slipped mark holds for a breath, then glides into the horizontal lockup (eases out of the big mark, lands soft). */
export const SETTLE = { from: R + 12, frames: 18 };
export const SETTLE_EASE = Easing.bezier(0.3, 0, 0.1, 1);
export const settleAt = (f: number) =>
  interpolate(f, [SETTLE.from, SETTLE.from + SETTLE.frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: SETTLE_EASE });
/** The name sets in once the moving mark has cleared its place (82% of the glide); the tagline follows with V01. */
export const NAME_IN = (() => {
  for (let f = SETTLE.from; f < SETTLE.from + SETTLE.frames; f++) if (settleAt(f) >= 0.82) return f;
  return SETTLE.from + SETTLE.frames;
})();
export const TAGLINE_IN = Math.max(NAME_IN + 3, V01.from + 3);
