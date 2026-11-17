# FIX (v5 round 3): a person fixes it

Film 2100 to 2640 (540 frames), lines S16 to S18. Owner: Review and scale. Brief: `video/V5.md` sections 5 and 8.
Render: `out/v5/fixjira/FIX.mp4`. Every cue comes from `timing.ts` (words and the `snapBack` marker).

Round 3 (the polish round): one still world for all three lines, the runbook on the right and its readers on the left
(PROMISE's chips); the cards lift over the page (which racks back: dim, soft, grey) and never over the readers; each
real proof is changed in place on its card (the kit's MorphToReal and RebuildFromReal on the card's layer only, never a
whole-frame swap); the one cut is the carry into the 3 a.m. payoff, on a beat. Nothing is painted on a real capture
(amber only on our crafted twins; Mist bands only).

| Local frames | What (word it lands on) |
| --- | --- |
| 0 to 103 | Opens composed under the kit's slip push: the runbook twin, flagged (its lit byline item is the one amber), and the readers. The agents' status slips from "Possibly stale" to "Read only" on "never edit" (readable on 20); "People · Edits the page" lifts in on "A person" (66 to 70) and holds to the end |
| 103 to 195 | The quick fix card, labelled "File path renamed · one-click fix, no AI", flies out of step 2's dead path and lands big on "rename" (110). It turns into the real card in place (`p4-review-rec`, its "Replace in 1 place" on the twin's button, 120): the cursor's click at the recorded time and place lands on "one click" (132, "one" 134); Mist on the real "No AI used." on "no" (163). Back to the card, done (180), which flies back into step 2 as the path turns `rollback-v2.sh` (186 to 195): nothing reads "No AI" after S16 |
| 195 to 366 | "Drift Reviewer · Our agent" joins the readers on "Our agent" (193). Its draft ("Wording changed · drafted by our agent") flies out of the chip and lands big on "drafts" (214). The calm hold: from "renamed" (265) the old name sits on the drift's amber; on "timeout" (285) `_SECS` is written in by a wipe while `=300` moves along, on one baseline and one size, with no empty frame. The real draft in place (`p4-draft-diff`, its `export ROLLBACK_TIMEOUT_SECS=300` on the twin's code line, 306 to 350), Mist on "Nothing changes until you accept." on "Nothing" (327). The Accept fix button lifts on "until" (352) |
| 366 to 461 | The button turns into the real footer in place (`p4-accept-rec` from 11.97 s): the cursor's click on the real Accept fix lands on "accepts" (378, the recording's own click at 12.373 s); the same real panel then shows "Accepted. A new page version names PR #482." (388, the recording at 18 s). Nothing reads as the agent accepting: the draft (ours, dimmed behind the real panel) leaves (396 to 404); the page comes forward with step 2 accepted (404 to 412). On "Verified" the byline item slip-swaps to "Verified · Doc Drift" (old words gone 419, new readable 422) with the film's one snap on the score's downbeat (420); no amber after. On "again" (432) the same real panel moves to its own line, "Verified by Razvan Statescu, just now." (the panel line as `p4-accepted` shows it), in its own place on the page's Steps, never at the byline. It drops on "Now" (461) |
| 461 to 510 | The agents' status turns "Safe to cite" on "Now agents" (readable 478), held to the carry and into it (about 40 frames) |
| 510 to 540 | Carry on the beat before "with the right step": a window grows out of step 2's command (16 frames, the Day world darkening), and on its first frame the 3 a.m. answer's command sits exactly on the page's (same place, same size), then relaxes to PROBLEM's framing (the Night owner's `PayoffShot`), with a small 03:07 clock. The command is underlined on "right" (517 to 527); the source "Payments rollback runbook · Verified" lands on 527. JIRA holds this shot over the seam (to its frame 24, 2.2 s in all) and leaves Night with a slip |

## Proofs (each changed in place on its card, tagged "Recorded in Confluence")

| Capture | Crop (x, y, w, h) | Scale | Frames | In place on |
| --- | --- | --- | --- | --- |
| `p4-review-rec` 37.9 to 39.9 s | 1150, 1320, 1250, 325 | 0.9 | 120 to 186 | the twin's "Replace in 1 place"; cursor at the recorded click (1337, 1577; 38.308 s); Mist on 1496, 1500, 130, 28 |
| `p4-draft-diff` | 1176, 1325, 1040, 345 | 0.9 | 306 to 356 | the twin's code line / `export ROLLBACK_TIMEOUT_SECS=300` (1288, 1440, 466, 22); Mist on 1658, 1627, 382, 23 |
| `p4-accept-rec` 11.97 s, 18.0 s, 18.2 s | 1176, 1846, 870, 156; then 1190, 506, 840, 70; then 1150, 318, 526, 66 | 0.9 | 366 to 470 | the twin's Accept fix (1837, 1862, 183, 63); cursor at the recorded click (1929, 1894; 12.373 s); the mat reframes in place to the notice (388) and the panel line (432) |

Crop edge checks are off on two crops, each with its reason in the code: `p4-draft-diff`'s right edge crosses the diff's
empty grey box (the code ends at x 2121), and `p4-accept-rec`'s notice crop sits inside the notice's empty green fill.
No text line is cut. The panel-line crop stops before "Watching 3 anchors."; the proof's creep is kept low (0.6% a
second) so "now." stays inside it to the end.

Covers: none beyond the logged `captures.json` "(Development)" masks (none of them falls inside these crops).

## Sound

tick-soft on the agents' status (19), pop as the quick fix lands (109), the click on the real button (132), pop as the
draft lands (213), the click on the real Accept fix (378), `snap` on the score's downbeat as the byline swaps (peak
420, the film's one snap), whoosh-short into the carry (peak 510); then the PayoffShot's own tick-soft (523) and chime
(529), whose tail JIRA plays (the L-cut). With the kit's lead (`LEADS.FIX`, swish-up) that is 10 in 18 s.

## QA (2026-11-17, `out/v5/fixjira/FIX.mp4`)

- `tools/qa/motion.py`: 99.8% moving, no still run over 1 frame (round 2's near-stills at 147, 329 and 443 are gone:
  every proof creeps inside its mat at 2.5% a second, 0.6 on the narrow panel line, and the world floats).
- `tools/qa/flashcheck.py`: pass, 0 flashes; one whole-frame change, the carry into Night (510 to 522).
- `tools/qa/amber.py`: 1 of 18 s (raw decode 5 of 18); never more than one amber blob. The page's amber drains while a
  card is up, so the draft's drift block is that shot's one amber.
- `tools/qa/rhythm.py --scene FIX`: 2 shots, median 9.0 s (round 2: 1.33 s), one moving transition (the carry,
  516 to 521), 6.7 major interrupts a minute, longest gap 3.7 s. The carry starts on the beat (510); rhythm.py places
  its middle at 518.5, between beats, where no strong onset falls, so it scores 0 cuts on a hit.
- Sync (each event to its word): "Read only" 20 / "never" 20; People 66 to 70 / "person" 70; card 110 / "rename" 112;
  click 132 / "one" 134; Mist 163 / "no" 167; draft 214 / "drafts" 216; amber 265 / "renamed" 269; `_SECS` 285 /
  "timeout" 287; Mist 327 / "Nothing" 331; click 378 / "accepts" 380; Verified readable 422 / "Verified" 422; panel
  line 438 / "again" 438; "Safe to cite" readable 478 / "agents" 478 (18 frames before "cite": cued on the agents so it
  holds about 40 frames before the carry takes it); underline about 521 / "right" 523.
- Effects 8 to 28 dB under the voice by RMS (`sfxmargin.py`); 10 in 18 s with the lead.
