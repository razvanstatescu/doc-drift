# Audio: Doc Drift Sentinel launch film

Made 2026-11-13 by the audio agent: the narration, `src/data/timeline.json`, the effects library (`src/data/sfx.json`) and
the music. **Nobody has listened to any of it.** Every judgement below comes from measurement: Scribe transcripts, EBU R128
loudness, onset, pitch (YIN) and formant (LPC) checks, and band energies. A person has to listen before anything locks
(research section 12, item 8).

## Listen first

| # | File | What to judge |
| --- | --- | --- |
| 1 | `tools/audio/cache/qa/preview-mix.wav` (local, git-ignored) | The whole film's audio without effects: M0 on f0, V00 on black, the score from R with its gain and ducking, every line. The lift at **0:35.2**, the snap back at **2:05.2**, the end hit at **2:27.2**. Mix balance (score `gainDb` -12, duck -8 dB) is a guess |
| 2 | `public/vo/audition/eric-all.wav`, `daniel-all.wav`, `brian-all.wav` | Confirm Eric (V02, V07, V14 at equal loudness) |
| 3 | `public/vo/V03.wav`, `V16.wav`, `V07.wav`, `V18.wav` | "rollback dot S H", "Rovo", "Jira", "MCP" |
| 4 | `public/music/m0.wav`, then `public/music/score.wav` 0:00-0:30 | The cold-open bed into its hard stop; the title swell, Night, the lift at 0:26 |
| 5 | `public/sfx/slip.wav`, `snap.wav` and their `-alt` takes | The brand's two sounds. `slip` is a composite (see Effects) |
| 6 | `public/vo/V00.wav`, `V01.wav` vs `tools/audio/cache/vo/alt/V00.plain.wav`, `V01.plain.wav` | The two lines read with a "measured" direction tag vs without |

## Files

| Path | What |
| --- | --- |
| `public/vo/V00.wav` ... `V25.wav` | Narration, 48 kHz 16-bit mono, -20.0 LUFS integrated each, sample peak <= -3 dBFS (true peak <= -2.9 dBTP). 99.3 s in all |
| `public/vo/audition/` | 3 voices x (V02, V07, V14) plus one `-all` file per voice, mastered like the final lines |
| `public/music/m0.wav`, `m0-4bar.wav` | Cold-open bed, 3 bars (6.000 s = 180 f) and 4 bars (8.000 s = 240 f), hard stop. 48 kHz 16-bit stereo |
| `public/music/score.wav` | The score from R to the film's end: 146.000 s = 4380 f. 48 kHz 16-bit stereo, -16.2 LUFS, true peak -3.0 dBTP |
| `public/sfx/*.wav` | 31 effects + 8 alternates, 48 kHz 16-bit stereo |
| `src/data/timeline.json`, `src/data/sfx.json` | Schemas as BRIEF section 5 (extra fields listed below) |
| `tools/audio/` | `config.mjs` (voice, lines, respellings), `vo.mjs`, `audition.mjs`, `timeline.mjs`, `music.mjs`, `arrange.py` + `arrangements/*.json`, `qa.mjs`, `run.mjs`, `gen-log.jsonl` (every paid call), `qa-report.json` |
| `tools/sfx/` | `specs.mjs` (prompts, takes, notes), `generate.mjs`, `composite.mjs`, `process.mjs`, `qa-report.json`, `composites.json` |
| `tools/audio/cache/`, `tools/sfx/cache/` | Raw takes, transcripts, music source takes, the preview mix (git-ignored) |

## Voice: Eric, kept

All three voices read all three lines word-perfect (Scribe `scribe_v3`, no keyterms). Measured on the mastered takes:

| Voice | Pace | Total (3 lines) | Median F0 per line (Hz) | Notes |
| --- | --- | --- | --- | --- |
| **Eric** `cjVigY5qzO86Huf0OWal` | 170 wpm, 16.7 chars/s | 11.18 s | 212, 152, 147 | Tenor; the most urgent "It's 3 a.m." (rises to 274 Hz on "3") |
| Daniel `onwK4e9ZLuTAKqWW03F9` | 150 wpm, 14.8 chars/s | 12.56 s | 137, 143, 131 | British, formal; about 12% slower |
| Brian `n8kTUi6dVrplENT9Un56` | 167 wpm, 16.4 chars/s | 11.38 s | 141, 123, 108 | Deepest |

No clear problem with Eric, so he stays (BRIEF decision 3). Nothing set him apart for the worse: same word accuracy, no breaths or bursts at the edges for any voice, and each level-matches to -20 LUFS with at most 3.5 dB of peak limiting. His pace leaves the most air in the scenes. To swap: `VOICE` in `tools/audio/config.mjs`, then `node tools/audio/run.mjs`.

## Narration

- **Model** `eleven_v4`, stability 0.5, similarity 0.8, `wav_48000` straight from the API (this payg account accepts it), `/with-timestamps`, one request per line with `previous_text`/`next_text` from the script neighbours (V00 gets the barrage captions as context).
- **Mastering** (`vo-core.mjs`): speech found on a 10 ms envelope (peak - 42 dB), edge bursts and breaths dropped (Satchel rule), 40 ms lead and 60 ms tail with fades, one gain to -20 LUFS integrated, and a lookahead peak limiter at -3 dBFS sample peak. v4 takes have a 17-20 dB crest on word onsets, so plain gain could not level-match them under a peak cap. Limiting is at most 4.8 dB (V25), on single onsets.
- **QA per line**: Scribe on every take, compared after normalising (numbers, "a.m.", spaces; "Dock" counts as "Doc", the homophone). Up to 3 takes.
- **Takes**: 26 lines, 31 TTS calls. V00 and V25 were retaken only because Scribe wrote "Dock Drift" (a homophone; the comparer now accepts it). V00 and V01 were then re-voiced once with a direction tag (below).
- **Forced alignment** (`/v1/forced-alignment`) on every shipped file with the spoken text; the words are mapped back onto the script words (V03's "rollback dot S H" becomes the one word `rollback.sh.`). `timeline.json` `words` are in film frames. The aligner marks V00's "That's" at 0.18 s into the file, while the voiced /ð/ starts at 0.04 s, so its caption may run about 3 frames late.

**Spellings and readings** (`SAY` in `config.mjs`; captions keep the script text). Checked by Scribe (no keyterms), the model's normalized alignment, voicing and LPC formants (`voicing.py`):

| Word | Sent as | Measured |
| --- | --- | --- |
| rollback.sh | "rollback dot S H" | v4 reads `rollback.sh`, "rollback dot sh" and "rollback dot S H" alike: after "dot" come two vowels, /ɛ/ (F1 536, F2 1814 Hz) then /eɪ/, i.e. "ess aitch". Sent spelled out, as the brief asks |
| 3 a.m. | as written | Read "three a.m." (Scribe: "3:00 a.m."), about 0.2 s before "Payments" |
| MCP | as written | Letters, 0.58 s for "M C P", then a 0.55-0.68 s pause at the colon |
| Rovo | as written | First vowel F1 about 320 Hz, F2 about 1000 Hz: back and rounded, "ROH-voh" (an "RAH" would show F1 near 700) |
| Jira | as written | First vowel F1 about 200 Hz, F2 about 2000 Hz: "JEE-ruh" |
| PR | (not in the narration) | V13 says "pull request" in full |
| step 2, AI | as written | "step two"; "A I" |

**Direction tags**: V00 `[calm, measured]`, V01 `[warm, measured]`, sent before the line (not spoken, never in captions). Without them V00 and V01 came back at 19 chars/s against a median of 16. The tag barely changed the pace, which is just this voice's rate on short lines with no pauses. It did lower the median pitch (V00 167 to 140 Hz, V01 141 to 125 Hz), a calmer read, so the tagged takes ship. The untagged takes are in `tools/audio/cache/vo/alt/`.

## Timeline (`src/data/timeline.json`)

R (reveal, score start) = **f277** = V00's speech end (f262) + 15 f. V01 at R + 15 = f292. A0 ends at R + 120 = f397. Every scene boundary after that is a whole number of bars from R. Every line starts on a beat from R, with at least 1 beat between a line's file end and the next line. **Total 4657 f = 155.23 s (2:35.2).**

| Scene | From (f) | To (f) | Length | Bars (target) | Lines |
| --- | --- | --- | --- | --- | --- |
| A0 | 0 | 397 | 13.23 s | R + 2 bars | V00 (f195), V01 (f292) |
| A1 | 397 | 1057 | 22.00 s | **11** (10) | V02, V03, V04, V05, V06 |
| A2 | 1057 | 1717 | 22.00 s | 11 (10-12) | V07, V08, V09, V10 |
| P1 | 1717 | 2077 | 12.00 s | 6 (6) | V11, V12 |
| P2 | 2077 | 2617 | 18.00 s | 9 (9) | V13, V14, V15 |
| P3 | 2617 | 3277 | 22.00 s | 11 (11) | V16, V17, V18 |
| P4 | 3277 | 3937 | 22.00 s | 11 (11) | V19, V20, V21, V22 |
| P5 | 3937 | 4177 | 8.00 s | 4 (4) | V23 |
| A4 | 4177 | 4657 | 16.00 s | 8 (7-8) | V24, V25 |

- **A1 is 1 bar over its target.** Its five lines (14.1 s of speech) fit 10 bars only with 1-beat gaps everywhere and a 1-beat lead. That is too fast for an alert card, a runbook step, a terminal error, the "A date can't see a merge." card and an assistant answer. **No line needs trimming.**
- **Air where the picture needs it**: P2 has 73 f between V13 and V14 (merge and timer); V22 sits on a bar line (f3757 = `snapBack`), 1 beat after V21, with 101 f to P4's end; A4 has the end card from `endHit` (f4417) and 94 f after V25.
- **Line frames**: V00 195-264, V01 292-359, V02 427, V03 517, V04 637, V05 742, V06 877, V07 1087, V08 1282, V09 1417, V10 1537, V11 1732, V12 1972, V13 2092, V14 2287, V15 2437, V16 2632, V17 2827, V18 3022, V19 3292, V20 3427, V21 3562, V22 3757, V23 3952, V24 4207, V25 4447 (to 4563). Per-scene lead, gaps and picture reasons are in `SCENES` in `timeline.mjs`; `tools/audio/cache/timeline.md` is the full table.
- **Markers**: `blackStart` 180, `v00` 195, `reveal` = `scoreStart` 277, one per scene start (`A0` ... `A4`), `daySlip` 1057 (= A2, the lift), `snapBack` 3757 (V22, the score's small hit), `endHit` 4417 (the end card lands; V25 two beats later), `filmEnd` 4657.
- **duck**: each VO span padded 5 f before and 10 f after, merged (26 ranges).
- **Extra fields**: `music[0]` carries `duckDb` (-8, a suggestion: research says ramp 6 f in, 12 f out), `bpm`, `firstBeatSec`, `lufs`, `cues` (M1-M7 in film frames) and `hits`; `voice` names the narrator. `timeline.mjs` marks the score `pending` and warns if a re-voice moves the grid away from the score's edit.

## Music

**Model: `music_v2_5`, chosen by test** (`music.mjs --test`: the same 3-section plan, 24 s, on both models). v2.5 changed exactly on the section boundary: no energy above 4 kHz in "Night", then +30 dB of highs at 8.00 s and the backbeat from beat 17. Its tempo was 120.014 BPM. `music_v1` ignored the sections, with a four-on-the-floor kick and hats from bar 1 and only a small change around 8.5 s; its tempo was 119.995 BPM. This is the opposite of the Satchel finding; here the plan chunks carry bracketed directions (`[Night] {only a low pulse ...}`). Output is `pcm_48000`, wrapped as WAV.

**M0, the cold-open bed** (`music.mjs --m0`, one take, D minor, 20 s, 119.992 BPM, beats at 0.004 + k/2 s), edited on bar lines by `arrange.py`. The bed has a synthesized riser (180 Hz to 2.4 kHz, noise opening) that is still at full level into the 6 ms ramp, so it ends in a hard stop.

| File | Bars (source seconds) | Riser | Stop |
| --- | --- | --- | --- |
| `m0.wav` (6.000 s, f0-179) | 1: sparse sub pulse and ticks (0-2); 2: build, stabs (10-12); 3: peak (18-20) | 3.5-6.0 s | f180 |
| `m0-4bar.wav` (8.000 s) | 0-2, 8-10, 12-14, 18-20 | 5.0-8.0 s | f240 |

Both are -15.4 / -15.2 LUFS, true peak -2.7 dBTP. The A0 builder places M0, as it does the real voice clip and the cold open's hits.

**The score** (`music.mjs --score`: one take, seed 7101, 152 s, F major family, synths and electronic drums, no vocals; 120.003 BPM after the edit, grid jitter 6.2 ms, first beat 0.2 f after R). The take followed the big contrasts but ran Night 3 bars long. The lift came at source 32 s (plan 26) and the final hit at 144 s (plan 138), and "resolve" and "build" came out as one steady groove. The edit (`arrangements/score.json`) is one splice: source 6-12 s is removed (3 Night bars; the 2-loud/2-quiet bar pattern carries across, and levels match within 1.6 dB). After film second 6, film time = source time - 6. Cue frames are absolute:

| Cue | Frames | What |
| --- | --- | --- |
| M1 | 277-397 | Warm title swell from silence under V01, no drums |
| M2 | 397-1057 | Night: low pulse, ticking hats, dark pad; rises over the last 3 bars |
| M3 | 1057-1717 | **The lift on A2's first frame** (measured onset f1057.0): kick, backbeat, bright synths |
| M4 | 1717-3277 | Steady groove under P1-P3; two kick drop-out fills (f1957-2017, f2452-2482) |
| M5 | 3277-3937 | P4 resolves: low-pass 900 Hz from P4's first frame, opening over the 2 bars before `snapBack`; full band and a small synthesized sub hit at f3757 |
| M6 | 3937-4417 | Groove, then a synthesized riser from f4237 and a 2-bar high-pass build into `endHit` |
| M7 | 4417-4657 | Final hit on `endHit` (the take's own hit, measured f4417.6, plus a sub hit), ring-out to silence on the last frame |

Mix suggestion (in `timeline.json`): VO at 0 dB, score `gainDb` -12 with a -8 dB duck. The score's short-term max is -14.6 LUFS and VO is about -20, so the bed sits about 6 dB under the voice between lines and about 15 dB under while ducked. Tune by ear.

## Effects (`src/data/sfx.json`, `public/sfx/`)

`eleven_text_to_sound_v3`, `wav_48000`, 40 generations. Each take is trimmed to a 5 ms lead with end-click removal and fades, peak-normalised to -3 dBFS (impacts and whooshes loudness-matched among themselves), and measured. `peakFrame` is the frame you mean. For most effects that is the loudest 10 ms. For `slip` it is the latch. For `reverse-swell`, `riser-2bar` and `suck-in` it is the last frame (they end on their peak). For `type-burst`, `stutter` and `downlifter` it is the onset. `gainDb` puts each at its intended mix level (K-weighted momentary max), with mix peaks capped at -1 dBFS. Extra fields: `peakSec`, `durationSec`, `hits` (transient frames, for multi-hit sounds), `take`, `alt`.

| Effects | Notes |
| --- | --- |
| `slip` (16 f, latch on frame 10) | **Composite** (`composite.mjs`). None of the 4 generations had both parts: 2 latched with an inaudible slide (-26 dB), 2 slid audibly but never latched. It is take 3's slide, 12 dB under take 1's dry latch (40 ms decay). The 4 generations are kept as `slip-alt1`...`alt4` |
| `snap` (5 f) | Take 3 of 4: centroid 6.5 kHz (the slip's is 3.6 kHz), 20 ms decay. Two re-prompted takes were needed; the first two were duller and rang 0.15-0.18 s. Alternates `snap-alt1`...`alt3` |
| `boom` (83 f, hit on frame 3) | Take 0 of 2: hit at 85 ms, 2 s tail. `boom-alt` peaks at 0.28 s |
| `alert` (13 f) | Take 1 of 2: three even tones 125 ms apart, about 4.2 kHz, generic beeps. `alert-alt` has only two tones |
| `tick`, `tick-soft`, `click`, `type-key`, `type-burst`, `pop` | UI. `type-burst` has 8 key hits in 1 s |
| `whoosh-short` (9 f, peak 4), `whoosh`, `swish-up`, `reverse-swell`, `riser-2bar` (120 f, ends on its top), `downlifter` | Air. `whoosh-short` is a retake (the first was 5 frames) |
| `hit-soft`, `hit-deep`, `sub-drop` | Impacts. Saturated for harmonics, but `hit-soft` (centroid 75 Hz), `boom` (69 Hz) and `sub-drop` (38 Hz) are sub-heavy and may vanish on phone and laptop speakers |
| `glitch-1`/`-2`/`-3` (4-6 f), `shutter`, `stutter`, `suck-in` (ends on frame 14), `static` | Barrage only |
| `error-blip`, `clock-tick`, `merge`, `chime-soft` | Story. `clock-tick` is a retake (the first came back near-silent) |

The full catalog with frames and gains is `src/data/sfx.json`; measurements per take are in `tools/sfx/qa-report.json`.

## QA (`tools/audio/qa-report.json`)

- **Words**: the 26 lines placed as in the timeline (one 155 s stem), Scribed in one pass, match the script. The only differences are Scribe writing "DocDrift" for "Doc Drift" (4 times), and every line is heard inside its own span.
- **Loudness**: every VO line -20.0 LUFS (spread 0.0 LU), true peak <= -2.9 dBTP.
- **Tempo**: score 120.003 BPM; M0 source 119.992 BPM; both within 0.1 BPM. The splices move whole bars, so the grid holds by construction. M0's low-band hits sit 6 ms (median) from the grid.
- **Files**: all 80 WAVs decode with no ffmpeg errors at 48 kHz; every `sfx.json` entry has its file.
- **Not checked**: anything a person hears, such as timbre, warmth, cheesiness, whether the slip sounds premium, and whether "Rovo" sounds natural.

## Credits

Account counter `character_count`: 15,255 used before the first call, 17,708 after the QA Scribe, so **2,453 credits** of the 8,000 cap (the counter is shared with other agents and lags, so this is an upper bound for this work). Roughly, from counter snapshots: probes 89, audition about 173, narration about 450, music test + M0 about 470, score about 1,040, effects about 200, QA Scribe about 40. All 179 paid calls are in `tools/audio/gen-log.jsonl`.

## Re-run

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null
node tools/audio/run.mjs                 # narration (cached) -> timeline -> QA (add --scribe for the paid transcript)
node tools/audio/audition.mjs            # re-master the audition (cached takes)
python3 -I tools/audio/arrange.py tools/audio/arrangements/score.json    # re-cut the score
python3 -I tools/audio/arrange.py tools/audio/arrangements/m0-3bar.json  # and m0-4bar.json
node tools/sfx/process.mjs               # re-trim and re-catalog the effects (no spend)
node tools/audio/music.mjs --score --seed 7102   # a second score take (paid, about 1,100 credits), then a new edit list
```

## v5 (2026-11-17)

Made by the audio agent for launch film v5 (D41, [V5.md](../../V5.md)): narration S01-S22, a new `src/data/timeline.json` and `public/music/score-v5.wav`. **No new music was generated**: the score is a new edit of v4's take. Nobody has listened yet; every judgement below is measured. v4 stays reproducible: V00-V25, `score.wav` and `m0*.wav` are untouched; v4's timeline is now `src/data/timeline-v4.json` (`timeline.mjs` writes it and reproduces the committed v4 file byte for byte; the extended `arrange.py` re-renders `score.wav` byte for byte).

### Listen first

| # | File | What to judge |
| --- | --- | --- |
| 1 | `tools/audio/cache/qa/preview-mix-v5.wav` (local) | The whole film without effects. The hard stop and the Day lift at **0:15.5-0:16.0**; the roll (bass and ticks) and the flag hit at **0:42.5-0:45.6**; the FIX low-pass from 1:10 opening into the snap back at **1:22.0**; the build and end hit at **1:36.0**; the stretched ring-out to **1:45.0**. Balance (score -12 dB, duck -8 dB, Night +4 dB) is a measured guess |
| 2 | `public/vo/S21.wav`, `S22.wav`; alternates `cache/vo/S21.t0.wav`, `cache/vo/alt/S22.plain.t0.wav` | The close. S21 is the highest line (median 203 Hz, rising on "Get it here") and sits right before S22, the lowest (115 Hz, tagged `[warm, measured]` like v4's V01). A second S21 take reads the same way. The untagged S22 is 158 Hz but 19 chars/s, v4's reason to tag this line |
| 3 | `public/vo/S12.wav`, `S16.wav` | The slowest reads (12.5, 12.4 chars/s): pauses at "change. / No AI" and "agents: / the rename" |
| 4 | `public/vo/S10.wav`, `S11.wav` | "four eighty-two" and "Nineteen seconds" (Scribe hears "482" and "Nineteen") |
| 5 | `public/music/score-v5.wav` 1:36-1:45 | The 2.5x phase-vocoder stretch of the final C major chord: phasiness or warble |

### Narration

- **Settings as v4**: Eric `cjVigY5qzO86Huf0OWal`, `eleven_v4`, stability 0.5, similarity 0.8, `wav_48000`, `/with-timestamps`, `previous_text`/`next_text` from the script neighbours (S01 opens cold, so none), seeds 5000 + 10 x line + take, mastering by `vo-core.mjs` (-20 LUFS, -3 dBFS sample peak, 40 ms lead, 60 ms tail). Lines and spellings: `LINES_V5` and `SAY_V5` in `config.mjs`; `--film v5` is the default of `vo.mjs`, `qa.mjs` and `run.mjs`.
- **Spellings**: "482" is sent as "four eighty-two", "19" as "Nineteen"; "3 a.m.", "Rovo" and "MCP" go as written (v4 measured them). Captions keep the script; `mapWords` maps the aligned spoken words back ("four eighty-two." becomes the word `482.`).
- **Takes**: all 22 lines word-perfect on the first take. One retake of S21 (a pitch outlier; it read the same, and take 1 ships: 0.18 s shorter, 1.6 dB less limiting). One untagged S22 is kept aside (`vo.mjs --variant plain`). `vo.mjs --pick S21=0` ships another take.
- **V02/V04 not reused**, by measurement against the v5 lines (median F0 165.6 Hz):

| Candidate | F0 vs v5 median | Spectrum distance to v5 lines | Chars/s |
| --- | --- | --- | --- |
| S01 (new) / V02 (v4) | +1.0 / **+3.6 semitones** (V02's urgent "3") | 2.6 / 2.0 dB | 15.4 / 15.8 |
| S03 (new) / V04 (v4) | -1.0 / -1.6 semitones | 1.7 / 1.6 dB | 17.2 / 18.3 |

  The v5 lines' own spectrum distances are 1.7 dB median, 3.5 dB max, so both pairs are within the normal spread on timbre; pitch decides S01, S03 is a tie, and the default (new takes, read in the v5 context) holds.

| Line | From (f) | File (s) | Chars/s | F0 (Hz) | Line | From (f) | File (s) | Chars/s | F0 (Hz) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | 45 | 2.15 | 15.4 | 176 | S12 | 1455 | 3.98 | 12.5 | 136 |
| S02 | 120 | 2.69 | 16.9 | 157 | S13 | 1590 | 5.52 | 13.6 | 154 |
| S03 | 210 | 2.20 | 17.2 | 157 | S14 | 1770 | 4.20 | 17.4 | 169 |
| S04 | 285 | 2.68 | 19.0 | 169 | S15 | 1920 | 5.46 | 14.5 | 151 |
| S05 | 375 | 3.06 | 17.0 | 163 | S16 | 2100 | 5.50 | 12.4 | 158 |
| S06 | 495 | 4.99 | 15.6 | 174 | S17 | 2280 | 5.05 | 15.3 | 180 |
| S07 | 660 | 7.75 | 15.3 | 167 | S18 | 2460 | 2.86 | 14.4 | 184 |
| S08 | 900 | 5.19 | 15.7 | 162 | S19 | 2550 | 5.85 | 17.5 | 168 |
| S09 | 1065 | 2.21 | 15.5 | 188 | S20 | 2730 | 4.96 | 15.5 | 145 |
| S10 | 1140 | 4.40 | 13.4 | 164 | S21 | 2895 | 4.59 | 14.5 | 203 |
| S11 | 1290 | 5.20 | 14.0 | 174 | S22 | 3045 | 2.27 | 16.7 | 115 |

92.76 s of narration. Every line -20.0 LUFS, true peak -3.6 to -2.9 dBTP.

### Timeline (`src/data/timeline.json`, built by `timeline-v5.mjs`)

**Total 3150 f = 105.00 s.** 30 fps, 120 BPM, the beat grid from frame 0 (`scoreStart` 0).

| Scene | From | To | Frames | Bars | Lines |
| --- | --- | --- | --- | --- | --- |
| PROBLEM | 0 | 480 | 480 | 8 | S01-S05 |
| PROMISE | 480 | 900 | 420 | 7 | S06, S07 |
| LOOP | 900 | 1575 | 675 | 11.25 | S08-S12 |
| AGENTS | 1575 | 2100 | 525 | 8.75 | S13-S15 |
| FIX | 2100 | 2550 | 450 | 7.5 | S16-S18 |
| JIRA | 2550 | 2880 | 330 | 5.5 | S19, S20 |
| CLOSE | 2880 | 3150 | 270 | 4.5 | S21, S22 |

- **Markers**: `daySlip` 480, `merge` 1174 ("merged"), `flag` 1369 ("Possibly"), `snapBack` 2462 ("Verified"; S18 starts on the bar line 2460), `endHit` 2880, `filmEnd` 3150, plus one per scene start.
- **Rules**: every line on a beat, S18 on a bar line; at least 0.3 s between one line's last word and the next line's first; a 0.4 s breath added before S11 (the 19 s roll) and S18 (the snap back). Silences between words run 0.32-0.92 s (median 0.62). The two over 1 s are the chosen beats: 1.14 s at the Day turn and 1.16 s before S18. Beat quantisation sets the gaps: a 0.2 or 0.25 s minimum gives the same layout. Extra air: S01 starts at 1.5 s (the clock and alert land), and there is one extra beat before S15 (the whip to the terminal).
- **Bar lines**: PROMISE and CLOSE must start on bar lines (the score's lift and final hit are downbeats). LOOP and FIX start on bar lines at no cost. AGENTS (f1575) and JIRA (f2550) start on beats, because a bar line there would add over 1 s of silence. In those two scenes `sc.bar(n)` is off the film's bar lines; use `sc.snap(f, BAR)`. CLOSE ends 1.3 s after "moved." on a beat.
- **For the picture team**: the v4 scene modules call `getScene("A0")` and the like when imported, so they throw against this timeline until the scene registry is replaced. `timeline-v5.md` in the cache has the full line table.

### Music (`public/music/score-v5.wav`, `arrangements/score-v5.json`)

The edit: 105.000 s, 48 kHz 16-bit stereo, -15.8 LUFS, true peak -3.0 dBTP, 120.003 BPM (grid RMS 5.6 ms, first beat 4.8 ms in). The source is v4's take (seed 7101). Its 8-bar phrases run from its lift at source 32 s, and each phrase ends on a fill bar.

| Cue | Frames | What |
| --- | --- | --- |
| N1 | 0-465 | Night: source 16-31.5 s at +4 dB (sub pulse, ticks, dark pad; 2 loud / 2 quiet bars, rising) |
| N2 | 465-480 | Hard stop: one beat of silence before `daySlip` (S05 ends at f463) |
| D1 | 480-1275 | The take's own lift (source 32) on `daySlip`, then the drive |
| D2 | 1275-1369 | The 19 s roll: the band strips to bass and ticks |
| D3 | 1369-2100 | Full band back with a sub hit on the sixteenth of "Possibly". One 16-bar splice at f1380 (source 62 to 94) skips a kick drop-out bar and 2 phrases |
| F1 | 2100-2460 | FIX: low-pass 900 Hz, opening over the 2 beats before S18 |
| F2 | 2460-2760 | `snapBack`: full band and a small sub hit on S18's bar line |
| E1 | 2760-2880 | Build: a 2-bar riser, then a 1-bar high-pass |
| E2 | 2880-3150 | `endHit`: the take's final hit (source 144) and a sub hit. Its C major ring-out is stretched 2.5x, so it rings under S21 and S22 to the last frame |

Measured: 0.5 s of silence (-96 dB) before the lift's kick on f480. The strip takes mids down 10 dB and highs down 15 dB, with the sub kept. FIX highs fall to -69 dB by 71 s and recover over 81-82 s. The ring decays about 2 dB/s. The seams jump no more than an ordinary kick does.

`arrange.py` gained four options, all of which leave the v4 edits unchanged:
- `stretch` segments (phase vocoder with identity phase locking, stereo coherent);
- `points` cutoff curves for sweeps (adjacent sweeps used to leave about 21 ms unfiltered at their boundary);
- `rampIn`/`rampOut` for the strip;
- `startFadeMs`.

**Mix** (timeline `music[0]`, `duck` and `mix`): score `gainDb` -12, `duckDb` -8, attack 6 f, release 12 f, as v4. The duck follows v4's rule (lines padded 5 f before, 10 f after), with `DUCK_RULES` around the hits:
- S06 and S18 duck from their first word, so the lift and the resolution land first;
- S17 releases at its last word, so the score opens in the breath;
- S20 releases 12 f before `endHit`, so the build swells under "dashboard" and the hit lands at full;
- CLOSE does not duck, so the hit rings under S21 and S22.

Measured music level under the voice: -35 to -37 LUFS in every scene (15-17 dB under the voice), against -40.8 for the Night before the +4 dB.

### QA (`tools/audio/qa-report-v5.json`)

- **WER** (Scribe on the 105 s narration bed, normalised, Levenshtein): **2.37% raw** (6 of 253 words), all from Scribe writing "DocDrift" as one word 3 times. **0.00%** with that spelling split. Every line is heard inside its own span.
- **Loudness**: 22 lines at -20.0 LUFS (spread 0.0 LU), true peak at most -2.9 dBTP. Preview mix -20.0 LUFS, true peak -5.1 dBTP.
- **Files**: 107 WAVs decode at 48 kHz.
- **Credits**: 390 (`character_count` 17,861 to 18,251). 73 paid calls (24 TTS, 25 Scribe, 24 alignments), all in `gen-log.jsonl`, with line ids S01-S22.

### Re-run (v5)

```bash
node tools/audio/run.mjs                    # vo (cached) -> timeline-v5 -> QA -> timeline-v5   (--scribe: paid WER)
python3 -I tools/audio/arrange.py tools/audio/arrangements/score-v5.json && node tools/audio/timeline-v5.mjs
node tools/audio/run.mjs --film v4          # v4, from its caches, into src/data/timeline-v4.json and qa-report.json
```
