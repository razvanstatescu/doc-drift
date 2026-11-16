# P2 · Flag (film 2077 to 2617)

v4 build by the Flag owner (V4.md section 6, R3 V13 to V15). Local frame 0 is film 2077 and sits on a bar; beats are
local multiples of 15. Every event is derived from the voice in `timing.ts`; positions are in `layout.ts`.

## Shots (round 2)

| Local | Film | Line | What happens |
| --- | --- | --- | --- |
| 0-45 | 2077-2122 | V13 | PrTwin (Bitbucket named in words, brand primary button), push 1.0 to 1.06, cursor to Merge, press on 42 |
| 45-84 | 2122-2161 | V13 | **R5**, one proof of 39 frames: the dialog grows out of the twin's Merge button, the recorded click (54), a reframing jump on the bar (60) to the Merged banner at 0.8; wipes away 84-88 |
| 88-120 | 2165-2197 | V13 | "renames": a push onto the row as it lifts out into the 64 px literal; `.sh` slides one unit right, `-v2` drops in amber |
| 114-154 | 2191-2231 | V13 | Amber match cut onto the real file header; **R6**; wipes away 150-154 |
| 147-255 | 2224-2332 | gap, V14 | The PR card leaves; the record pops out of the header and rides past the two stations (each drops away once passed) to the runbook's edge; "Merge to flag" counts to 19 s |
| 251-269 | 2328-2346 | V14 | "flagged": a push onto the byline; the Steps band slips amber (lands 263), the byline swaps at 259 and reads "Possibly stale · Doc Drift" from 262 with the amber handed over; the count lands on 19 at 263 |
| 285-334 | 2362-2411 | V14 | **R7** grows out of the twin's badge and tooltip, real byline at the twin's height; wipes away 330-334 |
| 338-382 | 2415-2459 | V14-V15 | "PR #482" lifts out of the twin tooltip, hovers right of the byline, and docks in the matcher's input; the tooltip stays sharp past V15's first beat (360) |
| 350-400 | 2427-2477 | V15 | The number leaves as "No" rises in its place; the matcher arrives at 372 with its rules pending (the page racks out); the rules tick, the result lands on "call" (400) with a push |
| 405-435 | 2482-2512 | V15 | **R8** grows out of the score line over the card (dimmed 18%, blurred); wipes away 431-435 |
| 431-494 | 2508-2571 | V15 | The same change runs twice more; a full copy of the result pill drops exactly onto the first each time (dots fill) |
| 494-540 | 2571-2617 | V15 | Final pose for the kit's whip into P3 |

Proofs sit in front of the world, which dims to 18%, blurs 7 px and drains to grey (the kit's round-2 scrim); each
proof leaves by a 4-frame wipe and creeps 3% a second while it holds (M1).

## Proofs

| # | Capture | Source | Crop (capture px) | Scale | Tag |
| --- | --- | --- | --- | --- | --- |
| R5 | `p2-merge-rec` | 4.87 to 5.37 s, then 13.30 to 14.10 s | dialog 1350, 150, 1140, 840; then banner 700, 505, 1440, 260 | 0.8; 0.8 | Recorded in Bitbucket: the real merge |
| R6 | `p2-pr482-files` | still | 1404, 1090, 1300, 280 | 0.85 | Recorded in Bitbucket |
| R7 | `p2-flagged-tooltip` | still | 1440, 300, 1460, 340 | 0.8 | Recorded in Confluence, flagged 19 s after the merge (approved) |
| R8 | `p4-panel` | still | 1150, 220, 1550, 300 | 0.6 | Recorded in Confluence |

- R5's dialog crop sits inside the dialog's white (the kit's crop guard flagged the earlier border crop); the banner
  crop keeps "Merged pull request", the merge line and the commit line whole and readable at 0.8.
- R7's crop is 340 tall: the whole tooltip, no table row (the owner row never shows). R8 starts at 220 so the title
  is whole. The kit's crop guard prints no warning for any P2 crop.
- R7's tag says when the page was flagged, not when it was recorded: the still was taken at 14:46:48Z, about 35 s
  after the merge click (the byline was written at 18.6 s).
- The "(Development)" cover on R7's hovered pill is filled `#F1F1F2` (captures.json now carries it too).

## Waits cut (P3)

| Proof | Cut | Where | Why |
| --- | --- | --- | --- |
| R5 | Source 5.37 s to 13.30 s (7.9 s: the dialog closing, "Merge in progress") | Local 60 (film 2137), a bar | The merge runs in the background for about 7.6 s; the cut goes from the click to Merged, as the kit's reframing jump (the mat reframes over 6 frames, a 3% push marks the cut) |

The recording's real click is shown at its recorded time and point (5.178 s, capture 2256, 925) with the kit cursor;
the twin's press on its own Merge button (local 42) stands for the first, unshown click that opened the dialog.

## Choices and limits

- The count is a picture of time passing: it runs from 0 at a steady rate while the record travels and lands on the
  measured 19 (captures.json `measured.mergeToFlagSeconds`) on the frame the page flags. Only the landed value is a claim.
- The relay and matcher are architecture, drawn as two stations on the record's track, not UI.
- MatcherCard rows are worded from the real why sentence (`apps/core/src/lib/review.ts`, capture `p4-panel`); the
  three run dots and the result landing on itself are our picture of "same change, same result".
- R9 (the two real outputs side by side) is not in this pass: it would cover the card while its rules and the eval
  line still need their reading time.
- "No AI" here is about detection only, and leaves the frame with the scene (P3 opens on the agent).

## Checks (round 2, render `out/v4/p2/P2.mp4`)

- `tools/qa/motion.py`: 100.0% of frames move (97.6% strict), no frozen hold, no still run over 12 frames.
- `tools/qa/flashcheck.py`: PASS. `tools/qa/amber.py --scene P2`: amber in 10 of 18 seconds (55.6%), never more
  than one amber blob in a sample. Crop guard: no warning.
- Sync: "merges" (44) the press at 42; "flagged," (265) the band lands at 263 and the byline reads at 260 to 262; "call."
  (400) the result lands at 400.
- Sound: the hit on "call." is 12 dB lower than in round 1 (19 dB under its file level), the real click 6 dB lower;
  the slip's latch and the rule ticks sit 3 dB lower than before.
- Reading time: every sentence holds except the tooltip (58 characters, 116 frames by the formula): about 100 frames of
  the twin, held into V15's first beat, plus R7's real copy of the same words.
- Nothing must-read under 26 px on screen; the matcher card and the statement stay 60 px or more inside the frame.
- Stills at every cue: `out/v4/p2/cue-*.png`; contact sheets `contact.png` (every 15 frames) and `cues-contact.png`.
