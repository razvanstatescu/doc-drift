import React from "react";
import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Sfx, SFX } from "../../audio/Sfx";
import { dB } from "../../audio/mix";
import { hasStaticFile } from "../../lib/files";
import { clamp } from "./fx/motion";
import { SLAMS } from "./Barrage";
import {
  ARXIV,
  BAND_BOTTOM,
  BAND_MID,
  BAND_TOP,
  BAR2,
  BAR3,
  BLACK,
  CLIP,
  DIFF_PUNCH,
  HN,
  LAST_SLAM,
  R,
  SLIP_FRAMES,
  TILE_IN,
  WHIP_ARXIV,
  WHIP_HN,
  WHIP_WIKI,
  WIKI,
} from "./timing";

/**
 * A0's own sound (the global AudioLayer plays V00, V01 and the score from R). One cue list on A0's clock, adapted from
 * the Satchel film's H0/Sound.tsx (same owner), v4 on paper:
 *   0–179    M0 (public/music/m0.wav: sparse bar 1, stabs in bar 2, the peak and its riser in bar 3, a HARD STOP on
 *            its last sample at exactly 6.000 s = f180), plus the desk's sounds: the cold hit on f0, a tick on each
 *            punch-in, a paper slide on each whip across the desk, a sheet landing on each landing on the pile
 *   30–174   THE REAL VOICE: Mikey Ariel, foss-north 2019 (CC BY), "Bad documentation or outdated documentation is worse
 *            than no documentation." Gain only (CLIP_DB); no other voice under her words; M0 and every effect are
 *            ducked DUCK_DB under her, and M0 swells back for the stop once she has finished
 *   165–179  the suck-in, ending on its loudest point exactly on the cut
 *   180 →    DIGITAL SILENCE: every cue above is cut dead on f180 (V00 arrives from the AudioLayer at f195)
 *   the reveal: a soft lift as the tile rises, a tick as each band lands, then `slip` (its latch lands with the band)
 * Every cue is a WAV (an MP3 would start about 25 ms late in Remotion: Satchel's QA v5 #7).
 */

/** Her clip is -29 LUFS integrated with a -10.7 dBFS peak: +9.5 dB sets her about level with the narrator (-20 LUFS)
 *  and peaks the cold open at -1.2 dBFS. Measured on the v3 render: 15–42 dB of speech-band separation over the
 *  ducked bed on every word. */
export const CLIP_DB = 9.5;
/** M0 (-15.4 LUFS) sits under the cold open's effects before she speaks. */
const MUSIC_DB = -6;
/** The bed and the effects under her words. */
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

/**
 * A library effect (src/data/sfx.json), placed so its PEAK lands on `at`, ducked under her voice, cut at the black.
 * An id that is not in the library (yet) is skipped, so the list can name an effect before it exists.
 */
const fx = (id: string, at: number, db = 0, duck = true): Cue[] => {
  const e = (SFX as Record<string, Entry>)[id];
  if (!e || !hasStaticFile(e.file)) return [];
  return [
    {
      id: `${id}@${at}`,
      src: e.file,
      start: at - (e.peakFrame ?? 0),
      frames: e.durationInFrames + 1,
      db: (e.gainDb ?? 0) + db,
      env: duck ? voiceDuck : undefined,
      stop: BLACK,
    },
  ];
};

/** The first effect of a list that exists in the library (the paper sounds, with the v3 library as the fallback). */
const first = (ids: string[], at: number, db = 0, duck = true): Cue[] => {
  for (const id of ids) {
    const c = fx(id, at, db, duck);
    if (c.length) return c;
  }
  return [];
};

/** Landings take the two slaps in turn; the bar lines and the last word get the heavier one, with its soft thud. */
const LANDS = ["paper-land", "paper-land-2"];
const landOf = (at: number, i: number) => (at === BAR3 || at === LAST_SLAM ? "paper-land-3" : LANDS[i % LANDS.length]);
const peakOf = (w: { from: number; to: number }) => Math.round((w.from + w.to) / 2);

/** The cue list, built at render time (the static-file lookup needs the bundle). */
export const buildCues = (): Cue[] => [
  // ── the bed and the voice ──────────────────────────────────────────────────────────────────────────────────────
  { id: "m0", src: "music/m0.wav", start: 0, frames: BLACK, db: MUSIC_DB, env: musicEnv, stop: BLACK },
  { id: "ariel", src: CLIP.src, start: CLIP.at, frames: CLIP.frames + 1, db: CLIP_DB, stop: BLACK },
  // ── bar 1: the diff card and its punch, the whips across the desk, the punches ────────────────────────────────────
  ...fx("hit-deep", 2, -3, false), // the cold hit: starts on f0 (its peak is 2 frames in)
  ...fx("tick", DIFF_PUNCH, -4, false), // the diff card's punch on beat 2
  ...first(["paper-slide", "whoosh-short"], peakOf(WHIP_ARXIV), -2, false),
  ...fx("tick", ARXIV.push.from, -6, false), // the landing on arXiv, beat 3
  ...first(["paper-slide", "whoosh-short"], peakOf(WHIP_HN), -3),
  ...fx("tick", HN.punch.from, -5),
  ...first(["paper-slide", "whoosh-short"], peakOf(WHIP_WIKI), -3),
  // ── bar 2: the Wikimedia report lifts, its punch, the pull-back, the pile ─────────────────────────────────────────
  ...fx("hit-soft", BAR2, -2),
  ...first(["paper-land-3", "paper-land", "pop"], BAR2 + 1, -4),
  ...fx("tick-soft", WIKI.punch.to, -2),
  ...first(["paper-slide", "whoosh-short"], WIKI.pull.from + 3, -6),
  ...SLAMS.flatMap((s, i) => first([landOf(s.at, i), "paper-land", "tick-soft"], s.at + 2, s.at === BAR3 || s.at === LAST_SLAM ? -2 : -5)),
  ...fx("hit-soft", BAR3, -3),
  ...fx("hit-soft", LAST_SLAM, -4), // the last word
  // ── the stop ─────────────────────────────────────────────────────────────────────────────────────────────────────
  ...fx("suck-in", BLACK - 1, 1, false), // ends on its loudest point on f179; the cut silences everything on f180
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

export const A0Sound: React.FC = () => {
  const cues = React.useMemo(buildCues, []);
  return (
  <>
    {cues.map((c) => (
      <CuePart key={c.id} cue={c} />
    ))}
    {/* the reveal: a soft lift as the tile rises, a tick as each band lands, then the slip (its latch lands with the band) */}
    <Sfx id="swish-up" at={TILE_IN + 8} gainDb={-6} />
    <Sfx id="tick-soft" at={BAND_TOP} gainDb={-2} />
    <Sfx id="tick-soft" at={BAND_MID} gainDb={-3} />
    <Sfx id="tick-soft" at={BAND_BOTTOM} gainDb={-2} />
    <Sfx id="slip" at={R + SLIP_FRAMES} />
  </>
  );
};
