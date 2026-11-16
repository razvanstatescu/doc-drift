# P3 · Agents (film 2617 to 3277)

Owner: Agents (V4.md section 4). Direction: V4.md section 6 (P3) and R3 V16 to V18. Day, tide lines.

Files: `index.tsx` (the scene), `timing.ts` (every cue from `timeline.json` word timings), `geom.ts` (stage to screen,
capture to proof rects, and the capture element boxes measured for the morphs). Scene parts in `src/components/P3/`:
`GhostStep.tsx` (V17's old step that ghosts in and slips), `PageFan.tsx` (V18's three page cards and connectors),
`p3data.ts` (every real value, asserted against `captures.json` at import, so a re-shoot fails loudly).
`AgentTerminal.tsx` there is v3's terminal and is no longer used by P3.

## Beats (local frames; film = local + 2617)

| Local | Event |
| --- | --- |
| 0 | Opens composed and moving under the kit's whip from P2 (the content still slides left): the runbook twin, its byline item "Possibly stale · Doc Drift" the amber, the Steps band slipped and neutral |
| 12 to 30 | The Drift Reviewer panel twin slides in from the right, landing on "Drift" (28) |
| 45 to 90 | **R10**: MorphToReal from the panel's heading on the beat inside "Reviewer", through "our Rovo agent"; RebuildFromReal to 97 |
| 94 to 114 | "How do I roll back payments-api?" types on "how to roll back"; the camera pushes in once R10 has rebuilt |
| 120 to 135 | Referencing, then "Drift Reviewer is thinking." and the first two steps (twin) |
| 135 to 165 | **R11**: the real steps; "Invoking tool: Check page freshness" appears 11 frames in (146) |
| 167 to 203 | A signal from that step to the page's byline item (ring on 183) and back, the camera following it |
| 195 to 214 | Push into the answer slot; the page racks out (blur, drained to grey), so the ghost is the shot's one amber |
| 213 to 274 | A1's old step (`./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT`) ghosts in, replays on "repeat", slips one unit right in amber on "old" (242), falls away on "step." (256) |
| 269 to 300 | The steps fold away (as in the real panel) and the real answer streams in (v2, D38 wording, verbatim) |
| 300 to 360 | **R12** by MorphToReal from the answer's first line, landing on "Possibly" (308); push to 1.0 on "Possibly stale"; pan to the PR #482 line, landing on "why" (352); RebuildFromReal to 367, then a slow push on the reason |
| 405 | Whip (T9) to the terminal, its seam on the beat at "Coding" (R3 had 390: the answer gets 15 more frames of reading) |
| 411 to 440 | `find-docs-for-path {"repo": "payments-api", "path": "scripts/rollback.sh"}` types; the title bar names the tool |
| 442 to 455 | The output streams: the runbook's row in full (url elided), the two QA pages collapsed; its status, the amber, lands before "signal" |
| 474 | "Agents read as you. They never edit a page." sets above the slab and holds to the end |
| 502 to 538 | "which pages cover a file": the path is underlined, the stack of three pages behind the slab fans out, a connector from the path to each |
| 552 to 581 | "and which to trust": the runbook card is picked, the fan folds back with it on top, the screen clears, `check-page-freshness {"pageId": "2720100"}` types and returns `"status": "possibly_stale"` (the one amber, 573) and the guidance |
| 581 to 660 | The guidance holds still (a bar and more); the final pose for the kit's downward whip into P4 |

## Proofs

| # | Capture | Local frames | Crop (capture px) | Scale | Start of morph | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| R10 | `p3-rovo-v2-agent` (still) | 45 to 90, rebuild to 97 | 2990, 1060, 840, 590 | 0.9 | 0.62 | Recorded in Rovo |
| R11 | `p3-rovo-v2-rec`, source 23.5 to 24.5 s, real time | 135 to 165, rebuild to 172 | 2990, 220, 840, 580 | 0.9 | 0.91 | Recorded in Rovo |
| R12 | `p3-rovo-v2-answer` (still) | 300 to 360, rebuild to 367 | 2996, 236, 844, 676 at 0.9, then 760 x 608 windows at 1.0 | 0.9 to 1.0 | 0.97 | Recorded in Rovo |
| V18 | `toolOutput.findDocsFlaggedV2`, `checkFlaggedV2` (verbatim, keys and pages elided with `…`) | 405 to 660 | — | — | — | Real output: doc-drift MCP, called as Razvan Statescu, Nov 13 |

- "Start of morph" is the capture's on-screen scale on the morph's first frame: every proof stays at or under 1 film px
  per capture px for its whole life (proofs live in screen space, outside the camera).
- R10 starts on the beat at 45 rather than R3's 60, so the empty twin panel shows for under a beat; it is 45 frames.
- R11 starts at 23.5 s rather than R3's 24.0 s so the proof shows the third step arrive (23.87 s, measured frame by
  frame); it ends at 24.5 s. No wait is cut inside any P3 proof.
- Masks from `captures.json` are drawn by `ProofFrame` (both "(Development)" covers sit outside these crops).
- The Rovo answer was asked after the settings demo replay of seeded PR #482, not after the real merge, so no tag says
  "after the merge". Real footage in P3: 135 frames (20%), 390 frames (59%) with the verbatim MCP output.

## Tests (2026-11-16, `out/v4/p3/`)

- `npx remotion render src/index.ts P3 out/v4/p3/P3.mp4 --port=3516 --concurrency=6`: 30 s.
- `tools/qa/motion.py --scene P3`: 97.1% moving (strict 92.6%), no frozen hold, no run over 12 static frames.
- `tools/qa/flashcheck.py`: pass (worst local window 1.5 flashes a second).
- Amber, scanned frame by frame: one drift element at a time (the byline item, then the ghost, then each call's
  status); the only overlaps are the real "DR" avatar inside R10 for its first 5 frames and our 48 px mark.
- Stills at every cue: `out/v4/p3/stills/`, sheets `P3-cues-sheet.jpg` and `P3-sheet-2fps.jpg`.

Reading time (BRIEF: 30 x max(0.8 + 0.25 x words, chars / 15) frames, from the moment the words are still):

| Text | Needs | On screen and still |
| --- | --- | --- |
| The question | 69 | 291 |
| Each thinking step | 70 | 123 to 145 |
| Answer, first sentence ("… is Possibly stale.") | 88 | 129 (twin or R12) |
| Answer, second sentence ("What it describes changed in PR #482 …") | 160 | 121; the guidance repeats it for 79 more |
| MCP tag | 124 | 251 |
| `find-docs-for-path` command | 148 | 38 while typed and in view; the tool's name stays in the title bar to 562, the path in the anchor row |
| "Agents read as you. They never edit a page." | 92 | 160 |
| `check-page-freshness` command | 84 | 89, plus the 9-frame cut |
| Guidance (all four sentences) | 421 | 79, plus the cut (the direction asks for a bar: met) |

The answer's last two sentences and the full guidance cannot get their formula time in this scene's 22 s; the
narration carries "Possibly stale, and why", and the guidance repeats the answer.
