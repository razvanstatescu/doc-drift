# FIX (v5 round 2): a person fixes it

Film 2100 to 2640 (540 frames), lines S16 to S18. Owner: Review and scale. Brief: `video/V5.md` sections 5 and 8.
Render: `out/v5/fixjira/FIX.mp4`. Every cue comes from `timing.ts` (words and the `snapBack` marker).

Round 2: crafted twins lead each line, big; short real proofs at reading size show it is real (the kit's
MorphToReal, then RebuildFromReal back, one tag each); nothing is painted on a real capture (amber only on our twins).

| Local frames | World | What (word it lands on) |
| --- | --- | --- |
| 0 to 103 | P, the page and its readers | Opens composed under the kit's slip push: the runbook twin, flagged (its lit byline item is the one amber), and PROMISE's reader chips. The agents' status slips from "Possibly stale" to "Read only" on "never edit" (readable on 20); "People", "Edits the page", lifts in on "A person" (66) |
| 103 to 190 | Q, the quick fix | Carry cut: the card grows out of step 2's dead path (the camera starts with the card's `scripts/rollback.sh` exactly on the page's). The real click as a short 1:1 proof (`p4-review-rec`, 37.97 to 39.0 s, the click on 140, "click" 142); back to the card with its result; Mist on its "No AI used." on "no" (163) |
| 190 to 398 | R, our agent's draft | Locked push to Drift Reviewer ("Our agent"); its draft flies out of the chip and lands big on "drafts" (214). The old setting name sits on the drift's amber from "renamed" (265); EditLine strikes it and opens `ROLLBACK_TIMEOUT_SECS` on "timeout setting" (285 to 298). The real draft as a short 1:1 proof (`p4-draft-diff`, 306 to 352), Mist on its "Nothing changes until you accept." on "Nothing" (327). A person's click on Accept fix on "accepts" (378); "Accepted" |
| 398 to 513 | V, verified | Locked push back to the page, close on its header (the lit item about 55 px). On "Verified" the item slip-swaps to "Verified · Doc Drift" (old words gone 419, new readable 422) with the film's one snap (420, the score's downbeat); no amber after. The real "Verified by Razvan Statescu, just now." as a short proof on "again" (`p4-accepted`, 434 to 464). Pull back to the readers on "Now agents" (465); the agents' status turns "Safe to cite" on "cite" (readable 496) |
| 513 to 540 | payoff | Plain cut on "with the right step" to the Night owner's `PayoffShot` (`../PROBLEM/Payoff`): the 3 a.m. assistant now answers `./scripts/rollback-v2.sh --timeout $ROLLBACK_TIMEOUT_SECS`, underlined on "right" (517 to 525), citing "Payments rollback runbook · Verified" (523). Its chime (525) rings on over the plain cut into JIRA, which plays its tail (the L-cut) |

## Proofs (all at 1:1, tagged "Recorded in Confluence")

| Capture | Crop (x, y, w, h) | Frames | Morph from / to |
| --- | --- | --- | --- |
| `p4-review-rec` 37.97 to 39.0 s | 1148, 1305, 1530, 340 | 130 to 161 | the twin card / the real card (1168, 1390, 1503, 243); the kit cursor only at the recorded click (1337, 1577, 38.308 s) |
| `p4-draft-diff` | 1176, 1340, 1484, 320 | 306 to 352 | the big code line / `+ export ROLLBACK_TIMEOUT_SECS=300` (1258, 1440); the Mist on 1658, 1627, 382, 23 |
| `p4-accepted` | 1150, 318, 526, 66 | 434 to 464 | the byline item / "Verified by Razvan Statescu, just now." (1169, 337); the crop stops before "Watching 3 anchors." and below the panel's sticky header |

Covers: none beyond the logged `captures.json` "(Development)" masks; every crop lies clear of the byline pill, so no
extra cover is needed (round 1's scrim-grey covers are gone with those shots).

## Sound (10 effects in 18 s: 33 a minute, each 12 to 28 dB under the voice by RMS)

tick-soft on the agents' status (19), pop on the carry (113), the real click (140), whoosh-short on the push to R
(199), pop as the draft lands (214), a person's click on Accept fix (378), whoosh-short on the push to V (408), `snap`
on the score's downbeat as the byline swaps (420, the film's one snap); the PayoffShot's own tick-soft (523) and chime
(525). The kit plays FIX's lead (`LEADS.FIX`, swish-up); nothing here duplicates it at frame 0.

## QA (2026-11-17, `out/v5/fixjira/FIX.mp4`)

- `tools/qa/motion.py`: 86.5% moving (pass); M1 notes three still runs on the proofs (14 to 23 frames).
- `tools/qa/flashcheck.py`: pass, 2-flash target met.
- `tools/qa/amber.py`: 3 of 18 s (the flag in P, the old setting name in R); no sample with two blobs. After the swap
  nothing is amber.
- `tools/qa/rhythm.py --scene FIX`: 7 shots, median 1.33 s, 13.3 moving transitions and 6.7 hard cuts a minute (the
  proofs' morphs count as transitions), 40 interrupts a minute, longest gap 3.7 s.
