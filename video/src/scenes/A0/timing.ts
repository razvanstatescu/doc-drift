import { Easing, interpolate } from "remotion";
import clipsJson from "../../../public/clips/clips.json";
import { getScene } from "../../lib/timeline";

/**
 * A0, the cold open (v4: Day evidence, true black, the Night reveal). Local frames (A0 starts at film frame 0, so they
 * equal film frames). 120 BPM at 30 fps: a beat is 15 f, a bar 60 f. The barrage is built on M0's three bars (m0.wav
 * is exactly 180 f and stops dead on its last sample), so its cut list is fixed; everything from the black on hangs
 * off timeline.json (blackStart, V00, the reveal R, V01), so a new voice take re-times the turn and the reveal.
 *
 * The evidence is paper on a lit desk (V4.md section 6, R2 frame 1): real pages as white sheets on the Paper sweep,
 * the subject sharp and lifted, texture sheets soft and washed, every key phrase marked with the Mist band and the
 * Current underline on the beat. One camera travels the desk; it never stops.
 *
 *   bar 1    0–59   "The code moved."          f0 our diff card, already composed; a punch-in on beat 2 (f15) and the
 *                                              Current underline under the new path; f24–30 a whip slides across the
 *                                              desk to arXiv's "63.2%" (lands on beat 3, the arXiv sheet lifting);
 *                                              f38–45 a whip across Google's SRE book to the Hacker News comments
 *                                              (lands on beat 4); f53–60 a whip down the desk
 *   bar 2   60–119  "The docs didn't."         the Wikimedia report lifts as the whip lands on the bar; a punch-in
 *                                              lands on "Documentation was outdated" on beat 2 (f75), marked as Ariel
 *                                              says "outdated"; f91–98 the camera pulls back; from f98 sheets land on
 *                                              the pile, back to back
 *   bar 3  120–179  "The agents can't tell."   the landings speed up (8, 7, 6, 5, 6 frames) while the desk turns under
 *                                              the pile; the last is Atlassian's own line (f152, punched in, held to
 *                                              f172); f173–179 every sheet is drawn to the centre
 *          180      HARD CUT to true black and digital silence (M0, the riser and the suck-in stop dead)
 *          V00      "That's why we built Doc Drift Sentinel." on the black, word by word with the voice; it holds
 *                   until the last word has ended, then leaves upward as the Night ground lifts
 *          R − 13   the tile lifts in on the Night sweep
 *          R − 11, R − 8, R − 5   the top, middle and bottom bands land, each on a tick (the D is whole and aligned)
 *          R        THE SLIP: the middle band slips out of line in amber, with its glow and bloom (the score's first
 *                   downbeat). The first amber pixel of the film. Tide lines start beneath
 *          R + 12   the tile settles into the horizontal lockup; the name sets in; the tagline sets in with V01; a
 *                   gentle push and the moving tide keep the frame alive to the end
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

/** The clip's t = 0 plays on this frame: "Bad" lands near f40, "outdated" near f77 and "documentation." ends near f172. */
export const CLIP_AT = 30;
export const CLIP = {
  src: ARIEL.file,
  at: CLIP_AT,
  frames: Math.ceil(ARIEL.durationSeconds * 30),
  /** Speech span on A0's clock (from the clip's measured onset and end). */
  speechFrom: CLIP_AT + ARIEL.speechOnsetSeconds * 30,
  speechTo: CLIP_AT + ARIEL.speechEndSeconds * 30,
};

// ── bar 1: the desk ─────────────────────────────────────────────────────────────────────────────────────────────────
/** The diff card's punch-in on beat 2, with the Current underline under the new path. */
export const DIFF_PUNCH = 15;
/**
 * The camera's whips across the desk (hard in-out, most of the travel in the middle frames, motion blur from the
 * pass): each lands on a beat or the bar.
 */
export const WHIP_ARXIV = { from: 24, to: 30 };
export const WHIP_HN = { from: 38, to: 45 };
export const WHIP_WIKI = { from: 53, to: 60 };
export const WHIPS = [WHIP_ARXIV, WHIP_HN, WHIP_WIKI];
/** arXiv: the whip lands at 1.7 and pushes to 2.0 (expo out); the key sentence is marked as the push lands. */
export const ARXIV = { push: { from: 30, to: 35 }, mark: 31 };
/** Hacker News: the whip lands on beat 4 and punches in on the two comments; each is marked in turn. */
export const HN = { punch: { from: 45, to: 49 }, mark: 46, mark2: 50 };

// ── bar 2: the Wikimedia report, then the pile ──────────────────────────────────────────────────────────────────────
/** The punch lands on "Documentation was outdated" on beat 2 of the bar (f75); the band is drawn as Ariel says
 *  "outdated" (f77–89). */
export const WIKI = { lift: 55, punch: { from: 70, to: 75 }, mark: 76, pull: { from: 91, to: 98 } };

// ── bars 2–3: the pile ──────────────────────────────────────────────────────────────────────────────────────────────
/** Bar 3's last landing: Atlassian's own line, held to the draw-in. */
export const LAST_SLAM = 152;
/** f173–179: every sheet is drawn to the centre (the suck-in's inhale). */
export const IMPLODE = { from: 173, to: BLACK };

// ── the turn and the reveal (all from timeline.json) ────────────────────────────────────────────────────────────
/**
 * The bridge title holds, complete, until V00's last word has ended (its word frames in timeline.json), then leaves
 * upward through its own mask as the Night ground lifts (QA v1 #4: never leave while "Sentinel" is being spoken).
 */
const V00_LAST = V00.words.length > 0 ? V00.words[V00.words.length - 1].to : V00.end - 4;
export const TITLE_OUT = V00_LAST;
export const TITLE_OUT_FRAMES = 4;
/** The Night ground lifts out of the black as the title leaves. */
export const GROUND = { from: TITLE_OUT, to: TITLE_OUT + 14 };
/** The tile lifts in (13 frames, expo out, its shadow growing), then the three bands land on ticks, top to bottom. */
export const TILE_IN = Math.max(R - 14, TITLE_OUT + 2);
export const TILE_FRAMES = 13;
export const BAND_TOP = Math.max(R - 11, TITLE_OUT + 4);
export const BAND_MID = Math.max(R - 8, BAND_TOP + 3);
export const BAND_BOTTOM = Math.max(R - 5, BAND_MID + 3);
export const BAND_FRAMES = 6;
export const SLIP_FRAMES = 6;
/** Tide lines start beneath the mark with the slip, drawn in from the left. */
export const TIDE_IN = { from: R, frames: 30 };
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
