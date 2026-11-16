# P2 · Flag (film 2077 to 2617)

v4 build by the Flag owner (V4.md section 6, R3 V13 to V15). Local frame 0 is film 2077 and sits on a bar; beats are
local multiples of 15. Every event is derived from the voice in `timing.ts`; positions are in `layout.ts`.

## Shots

| Local | Film | Line | What happens |
| --- | --- | --- | --- |
| 0-45 | 2077-2122 | V13 | PrTwin (Bitbucket named in words, brand primary button), camera push 1.0 to 1.06, cursor to Merge, press on 42 |
| 45-81 | 2122-2158 | V13 | **R5** grows out of the twin's Merge button: the Merge dialog, the recorded confirm click (54), then Merged (from 60) |
| 88-120 | 2165-2197 | V13 | The rename row lifts out into a 64 px literal; `.sh` slides one unit right, `-v2` drops in amber |
| 114-150 | 2191-2227 | V13 | Amber match cut: the literal's `rollback-v2.sh` lands on the real file header; **R6** |
| 147-160 | 2224-2237 | gap | The PR card leaves by a push; the record pops out of the real header carrying the amber |
| 150-255 | 2227-2332 | gap, V14 | The record rides through "Bitbucket relay" and "Doc Drift matcher" to the runbook; "Merge to flag" counts to 19 s |
| 263-275 | 2340-2352 | V14 | The Steps band slips amber, the amber docks in the byline ("Possibly stale · Doc Drift"), the tooltip opens; the count lands on 19 |
| 285-330 | 2362-2407 | V14 | **R7** grows out of the twin's badge and tooltip, real byline at the twin's byline height |
| 352-405 | 2429-2482 | V15 | "No AI made that call." sets on the left while the page and tooltip stay sharp; from 366 the matcher lifts in front of the racked page, "PR #482" docks from the tooltip, the rules tick, the result lands on "call" |
| 405-431 | 2482-2508 | V15 | **R8** grows out of the score line: the real why sentence and score |
| 431-494 | 2508-2571 | V15 | The same change runs twice more; each result lands exactly on the last (dots fill) |
| 494-540 | 2571-2617 | V15 | Final pose for the kit's whip into P3 |

## Proofs

| # | Capture | Source | Crop (capture px) | Scale | Tag |
| --- | --- | --- | --- | --- | --- |
| R5 | `p2-merge-rec` | 4.87 to 5.37 s, then 13.30 to 14.00 s | dialog 1320, 120, 1200, 880; merged 700, 150, 2260, 610 | 0.8; 0.6 | Recorded in Bitbucket: the real merge |
| R6 | `p2-pr482-files` | still | 1404, 1090, 1300, 280 | 0.85 | Recorded in Bitbucket |
| R7 | `p2-flagged-tooltip` | still | 1440, 300, 1460, 340 | 0.8 | Recorded in Confluence, flagged 19 s after the merge |
| R8 | `p4-panel` | still | 1150, 260, 1550, 260 | 0.6 | Recorded in Confluence |

- R5's merged crop starts at y 150 (not R3's 180) so the breadcrumb line is whole.
- R7's crop is 340 tall (not R3's 360): it ends above the header table, so no line of the table is cut and the owner
  row never shows.
- R7's tag says when the page was flagged, not when it was recorded: the still was taken at 14:46:48Z, about 35 s
  after the merge click (the byline was written at 18.6 s). R3's "Recorded in Confluence, 19 s after the merge" would
  misdate the recording.
- R7 adds one cover on top of the logged mask: the same box (2594, 465, 176, 37) filled `#F1F1F2`, the colour of the
  hovered pill it sits on (the logged mask has no fill and would draw white on grey). Nothing else is retouched.

## Waits cut (P3)

| Proof | Cut | Where | Why |
| --- | --- | --- | --- |
| R5 | Source 5.37 s to 13.30 s (7.9 s: the dialog closing, "Merge in progress") | Local 60 (film 2137), a bar | The merge runs in the background for about 7.6 s; the cut goes from the click to Merged. A 3% push across 4 frames marks it |

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

## Checks (2026-11-16, render `out/v4/p2/P2.mp4`)

- `tools/qa/motion.py`: 98.3% of frames move (84.1% strict), no frozen hold, longest still run 4 frames.
- `tools/qa/flashcheck.py`: PASS (local windows at most 1.5 flashes a second).
- `tools/qa/amber.py --scene P2`: amber in 10 of 18 seconds (55.6%), never more than one amber blob in a sample.
- Reading time (BRIEF formula): every sentence holds, except the tooltip (58 characters, 116 frames by the formula):
  about 100 frames of the twin plus R7's real copy of the same words in the same place.
- Nothing must-read under 26 px on screen (the record's label is drawn at k 2.1 so it stays at 29 px during the
  track at zoom 0.94).
- Stills at every cue: `out/v4/p2/cue-*.png` (local frame in the name); contact sheets `contact.png` (every 15
  frames) and `cues-contact.png`.
