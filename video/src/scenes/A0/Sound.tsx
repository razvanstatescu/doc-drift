import React from "react";
import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Sfx, SFX } from "../../audio/Sfx";
import { dB } from "../../audio/mix";
import { clamp } from "./fx/motion";
import { SLAMS } from "./Barrage";
import { BAND_BOTTOM, BAND_TOP, BAR2, BAR3, BLACK, CLIP, DIFF_PUNCH, DIFF_TO, HERO, LAST_SLAM, PUNCHES, R, SLIP_FRAMES, STRIP_DIVE, WHIPS } from "./timing";

/**
 * A0's own sound (the global AudioLayer plays V00, V01 and the score from R). One cue list on A0's clock, adapted from
 * the Satchel film's H0/Sound.tsx (same owner):
 *   0–179    M0 (public/music/m0.wav: sparse bar 1, stabs in bar 2, the peak and its riser in bar 3, a HARD STOP on
 *            its last sample at exactly 6.000 s = f180), plus the barrage's hits: the cold hit on f0, a tick on the
 *            diff card's punch (f15), the cut to the wall (f30), whooshes on the whip and the dives, quiet ticks on the
 *            punches, quiet glitches on the slams
 *   30–174   THE REAL VOICE: Mikey Ariel, foss-north 2019 (CC BY), "Bad documentation or outdated documentation is worse
 *            than no documentation." Gain only (CLIP_DB); no other voice under her words; M0 and every hit are ducked
 *            DUCK_DB under her, and M0 swells back for the stop once she has finished
 *   165–179  the suck-in, ending on its loudest point exactly on the cut
 *   180 →    DIGITAL SILENCE: every cue above is cut dead on f180 (V00 arrives from the AudioLayer at f195)
 *   R − 11, R − 5   two soft ticks as the bands land;  R + 6   `slip`: its latch lands with the band
 * Every cue is a WAV (an MP3 would start about 25 ms late in Remotion: Satchel's QA v5 #7).
 */

/** Her clip is -29 LUFS integrated with a -10.7 dBFS peak: +9.5 dB sets her about level with the narrator (-20 LUFS)
 *  and peaks the cold open at -1.2 dBFS. (+13 dB, the first estimate, would clip at +2.3 dBFS.) Measured on the A0
 *  render: 15–42 dB of speech-band separation over the ducked bed on every word. */
export const CLIP_DB = 9.5;
/** M0 (-15.4 LUFS) sits under the cold open's hits before she speaks. */
const MUSIC_DB = -6;
/** The bed and the hits under her words. */
const DUCK_DB = -10;

type Entry = { file: string; durationInFrames: number; peakFrame?: number; gainDb?: number };

const trap = (f: number, a: number, b: number, ramp: number) => interpolate(f, [a - ramp, a, b, b + ramp], [0, 1, 1, 0], clamp);
/** 1 → DUCK_DB across her whole line (it stays down through her short pauses). */
const voiceDuck = (f: number) => dB(DUCK_DB * trap(f, CLIP.speechFrom - 1, CLIP.speechTo, 3));
/** The bed builds back into the stop once she has finished. */
const musicEnv = (f: number) => voiceDuck(f) * dB(2.5 * interpolate(f, [CLIP.speechTo + 1, BLACK - 1], [0, 1], clamp));

type Cue = {
  id: string;
  src: string;
  /** A0 frame on which the file's t = 0 plays. */
  start: number;
  /** The file's length in frames (ceil). */
  frames: number;
  db: number;
  env?: (f: number) => number;
  /** A0 frame on which it is cut dead. */
  stop?: number;
};

/** A library effect (src/data/sfx.json), placed so its PEAK lands on `at`, ducked under her voice, cut at the black. */
const fx = (id: string, at: number, db = 0, duck = true): Cue => {
  const e = (SFX as Record<string, Entry>)[id];
  if (!e) throw new Error(`A0: no sfx "${id}" in sfx.json`);
  return {
    id: `${id}@${at}`,
    src: e.file,
    start: at - (e.peakFrame ?? 0),
    frames: e.durationInFrames + 1,
    db: (e.gainDb ?? 0) + db,
    env: duck ? voiceDuck : undefined,
    stop: BLACK,
  };
};

const GLITCHES = ["glitch-1", "glitch-2", "glitch-3"];
const WHIP_PEAK = (w: { at: number; dur: number }) => w.at + w.dur / 2;

export const CUES: Cue[] = [
  // ── the bed and the voice ──────────────────────────────────────────────────────────────────────────────────────
  { id: "m0", src: "music/m0.wav", start: 0, frames: BLACK, db: MUSIC_DB, env: musicEnv, stop: BLACK },
  { id: "ariel", src: CLIP.src, start: CLIP.at, frames: CLIP.frames + 1, db: CLIP_DB, stop: BLACK },
  // ── bar 1: the diff card and its punch, the cut to the wall, the whip, the punch, the dive ─────────────────────────
  fx("hit-deep", 2, -3, false), // the cold hit: starts on f0 (its peak is 2 frames in)
  fx("tick", DIFF_PUNCH, -4, false), // the diff card's punch on beat 2
  fx("glitch-2", DIFF_TO, -3, false), // the cut to the wall on beat 3
  fx("whoosh-short", WHIP_PEAK(WHIPS[0]), -3),
  fx("tick", PUNCHES[1], -5),
  fx("whoosh-short", STRIP_DIVE.to - 1, -3), // the dive into the hero
  // ── bar 2: the hero on the glass, its punch, the dive, the slams ────────────────────────────────────────────────
  fx("hit-soft", BAR2, -2),
  fx("glitch-1", BAR2, -6),
  fx("tick-soft", HERO.punch, -2),
  fx("whoosh-short", HERO.dive.to - 1, -4),
  ...SLAMS.map((s, i) => fx(GLITCHES[i % GLITCHES.length], s.at, s.at === BAR3 || s.at === LAST_SLAM ? -4 : -7)),
  fx("hit-soft", BAR3, -3),
  fx("hit-soft", LAST_SLAM, -4), // the last slam
  // ── the stop ─────────────────────────────────────────────────────────────────────────────────────────────────────
  fx("suck-in", BLACK - 1, 1, false), // ends on its loudest point on f179; the cut silences everything on f180
];

/** The part of a cue inside [start, stop), with its gain and envelope evaluated per A0 frame. */
const CuePart: React.FC<{ cue: Cue }> = ({ cue }) => {
  const a = Math.max(0, cue.start);
  const b = Math.min(cue.start + cue.frames, cue.stop ?? Infinity);
  if (b <= a) return null;
  const trim = a - cue.start;
  return (
    <Sequence from={a} durationInFrames={b - a} layout="none" name={`a0:${cue.id}`}>
      <CueAudio cue={cue} a={a} trim={trim} />
    </Sequence>
  );
};

const CueAudio: React.FC<{ cue: Cue; a: number; trim: number }> = ({ cue, a, trim }) => {
  const fr = useCurrentFrame(); // frames since this cue's Sequence started
  const f = a + fr;
  const g = dB(cue.db) * (cue.env ? cue.env(f) : 1);
  return <Audio src={staticFile(cue.src)} trimBefore={trim > 0 ? trim : undefined} volume={Math.max(0, g)} />;
};

export const A0Sound: React.FC = () => (
  <>
    {CUES.map((c) => (
      <CuePart key={c.id} cue={c} />
    ))}
    {/* the reveal: two soft ticks as the bands land, then the slip (its latch lands with the band) */}
    <Sfx id="tick-soft" at={BAND_TOP} gainDb={-2} />
    <Sfx id="tick-soft" at={BAND_BOTTOM} gainDb={-2} />
    <Sfx id="slip" at={R + SLIP_FRAMES} />
  </>
);

