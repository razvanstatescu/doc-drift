# P3 · Agents (film 2617 to 3277)

Owner: Agents (V4.md section 4). Direction: V4.md section 6 (P3), R3 V16 to V18, and round 2 (QA `out/v4/qa/review.md`
G-1 to G-9, `metrics.md` P3; the director's one focal statement and one decisive push per line). Day, tide lines.

Files: `index.tsx` (the scene), `timing.ts` (every cue from `timeline.json` word timings), `geom.ts` (stage to screen,
capture to proof rects, capture element boxes). Scene parts in `src/components/P3/`: `GhostStep.tsx` (V17's old step,
whole and dimmed), `PageFan.tsx` (V18's page card, path link and count chip), `AmberToken.tsx` (the drift words on
their amber block, drawn over a twin's own words with one sweep clip), `p3data.ts` (every real value, asserted against
`captures.json` at import). `AgentTerminal.tsx` is v3's and unused.

## Beats (local frames; film = local + 2617)

| Local | Event |
| --- | --- |
| 0 | Opens composed and moving under the kit's whip from P2: the runbook twin low on the left, its byline item "Possibly stale · Doc Drift" the amber |
| 12 to 44 | "Ask Drift / Reviewer." (130 px, Fathom) sets top left on its words; the panel twin slides in on the right, content-sized (its header), landing on "Drift" |
| 45 to 90 | **R10** grows out of the panel's heading on the beat inside "Reviewer"; the twin blurs and drains under it (kit) |
| 88 to 94 | The statement leaves; **push** into the panel (1.25), landing on "roll" (103); the byline item leaves the frame whole by 99 |
| 94 to 116 | The question types and is sent; the card grows with it |
| 135 to 165 | **R11** (1.0): the real steps; "Invoking tool: Check page freshness" appears at 146 |
| 167 to 203 | A signal from that step to the byline item (ring on 183) and back; then the page leaves by moving |
| 213 to 274 | A1's old step (`./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT`) appears whole and dimmed (no typing, G-6), slips one unit right in amber on "old" (242), falls on "step." (256) |
| 268 to 360 | "It says / why." (116 px) sets left on "It says"; the answer streams (v2, D38, verbatim); "Possibly stale" on its amber block from 283 |
| 300 to 345 | **R12** from the answer's first line, landing on "Possibly", push to 1.0 on "Possibly stale"; cropped between blocks (G-7) |
| 345 to 352 | **Push** onto the reason, landing on "why" with the statement's last word |
| 405 | Whip (T9) to the terminal on "Coding" |
| 403 | The slab (30 px mono, 1000 x 683: 33% of the frame, G-1) lifts in with `find-docs-for-path {...}` already typed and its tag (28 px, G-9) |
| 432 to 451 | The output streams; the runbook row's status on its amber block (439, "same"); **push** onto it, landing on "signal" (451); back out after "MCP" |
| 492 | "Agents read as you. They never edit a page." sets above the slab |
| 504 to 540 | "which pages cover a file": the path underlined, a connector to the runbook's card (tucked under the slab), "3 pages document this path" (the tool's own words, G-8) |
| 548 to 576 | The screen clears; `check-page-freshness {"pageId": "2720100"}` types (6 f) and returns `"status": "possibly_stale"` on its amber block; "Do not present steps from this page as current." (96 px) rises beside the slab and lands on "trust" (G-2) |
| 576 to 660 | Final pose, still but for the creep; the kit's downward whip into P4 |

## Proofs

| # | Capture | Local frames | Crop (capture px) | Scale | Morph start | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| R10 | `p3-rovo-v2-agent` | 45 to 90, wipe to 94 | 2990, 1060, 840, 590 | 0.9 | 0.62 | Recorded in Rovo |
| R11 | `p3-rovo-v2-rec`, source 23.5 to 24.5 s | 135 to 165, wipe to 169 | 2990, 220, 840, 580 | 1.0 | 1.01 (first frame) | Recorded in Rovo |
| R12 | `p3-rovo-v2-answer` | 300 to 345, wipe to 349 | 3000, 350, 840, 663 at 0.95; 3021, 350, 798, 630 at 1.0 | 0.95 to 1.0 | 0.96 | Recorded in Rovo |
| V18 | `toolOutput.findDocsFlaggedV2`, `checkFlaggedV2` (verbatim; keys and QA pages elided with `…`) | 403 to 660 | — | — | — | Real output: doc-drift MCP, called as Razvan Statescu, Nov 13 |

- Every crop edge was checked against the capture (the crop guard's rule): 0.0% content on any edge. R12 starts below
  the question bubble (ends at 340) and stops above the suggestions (start at 1040).
- Proofs live in screen space (never above 1 film px per capture px); their mats drift 0.6 px a frame with a 3 px sway
  so a proof never freezes the frame.
- R11 starts at 23.5 s so the proof shows the third step arrive (23.87 s). No wait is cut inside any P3 proof.
- The Rovo answer was asked after the settings demo replay of seeded PR #482, so no tag says "after the merge".

## Tests (round 2, 2026-11-16, `out/v4/p3/`)

- Render `P3.mp4`: about 30 s. `motion.py --scene P3`: 100.0% moving (strict 98.2%), no hold, no run over 12 frames.
- `flashcheck.py`: pass. `amber.py --scene P3`: 13 of 22 seconds (59.1%), no sample with two amber blobs (was 4 of 22).
- Stills at every cue: `stills/`; sheets `P3-cues-sheet.jpg`, `P3-sheet-2fps.jpg`.

Reading time (30 x max(0.8 + 0.25 x words, chars / 15) frames, from still):

| Text | Needs | Still on screen |
| --- | --- | --- |
| "Ask Drift Reviewer." | 47 | 46 |
| "It says why." | 47 | about 45 |
| "Do not present steps from this page as current." | 94 | 84, plus the 9-frame cut |
| "3 pages document this path" | 62 | 148 |
| "Agents read as you. They never edit a page." | 92 | 158 |
| Answer, first sentence | 88 | 129 (twin or R12) |
| The full guidance and the answer's later sentences | 400 or more | texture; the clause carries them |
