# FIX (v5): a person fixes it

Film 2100 to 2550 (450 frames), lines S16 to S18. Owner: Review and scale. Brief: `video/V5.md` sections 5 and 7.
Render: `out/v5/fixjira/FIX.mp4`.

Four shots, all real captures at reading size through the kit's `RealTake`. Every shot opens composed: its first
camera key has `dur: 0` (a `dur: 1` key shows the whole capture for one frame) and its spotlight is on from the first
frame. One tag, "Recorded in Confluence", stays put through all four shots.

| Shot | Frames | Capture | What happens (word it lands on) |
| --- | --- | --- | --- |
| F1 | 0 to 90 | `p2-flagged`, header crop | Author lit on "People" (2); the header on "fix the page" (14); the agent chips "Rovo agent", "Coding assistant" and the "Read only" tag lift in at 44 ("never agents" 48 to 58). The flagged byline item carries the drift's amber |
| F2 | 90 to 180 | `p4-review-rec` 37.3 to 41.6 s | Cut on the beat before "the rename" (92). The real click on "Replace in 1 place" at 120 ("click" 122). Mist on "No AI used." at 140 ("no" 144). The spinner at a labelled ramp (6x), then at 156 the recording's own 730 px scroll to "Replaced ... in 1 place.": the camera takes the jump on that frame and pans it in 12 frames, so "No AI used." rides out of the frame as "AI" ends (163); the result holds to the cut |
| F3 | 180 to 345 | `p4-draft-diff`, then `p4-accept-rec` from 292 | The drafted step, red and green, lit on "Drift Reviewer drafts" (180). Mist on "Nothing changes until you accept." at 258 ("Nothing" 262). The invisible source switch at 292 (the recording at 11.7 s is the still shifted 313 px). Camera to the footer, the real "Accept fix" click at 311 ("accepts" 313), the spinner at a labelled ramp. Rovo's confirmation step is never shown |
| F4 | 345 to 450 | `p2-flagged`, then `p4-verified` from 360 | The header again, flagged (amber). On the score's hit (360, the one `snap`) the amber leaves and the real byline reads "Verified · Doc Drift". "Verified." rises (up at 360, "Verified" 362), flies on "again" (374 to 392) and lands on the real word (the kit's `TypeToUI`, dissolving into the word over its last 4 frames). The real `checkVerified` guidance line rises at 402 ("Now" 404), "Safe to cite." marked at 429 ("cite" 433) |

Measured on the captures (capture px):
- `p4-review-rec`: Quick fix card 1168 to 2672 x 1390 to 1634; "No AI used." 1496 to 1626 x 1500 to 1528; the click
  (1337, 1577) at 38.308 s; every line moves up 730 px between 41.13 and 41.15 s, when the result notice shows
  (1168 to 2672 x 1662 to 1902).
- `p4-accept-rec`: static 11.0 to 12.25 s; "Accept fix" clicked at 12.373 s (1929, 1894).
- `p4-verified`: "Verified" glyphs 2394 to 2479, cap top 474, baseline 492, ink (80, 82, 87).
- Spline Sans in `TypeToUI`'s 1.25 line box: cap top 0.258 em, cap height 0.733 em (measured on frame 366).
- The page's byline item shows through the review modal's scrim with its "(Development)" suffix (right of the modal,
  x 2720 to 2848): `p4-draft-diff`'s own mask paints it white and `p4-accept-rec` has none. Both, and
  `p4-review-rec` (y 403), get an extra mask in the scrim's grey (140, 144, 152).

Sound (8 effects, 32 a minute): pop on the chips, tick-soft on the cut at 90, the two real clicks, tick-soft on the
cut at 345, `snap` on the hit at 360, tick on the type's landing, and `chime-soft` at 441: the ring tails into JIRA
as an L-cut (JIRA plays the same chime from its frame -9, since FIX's Sequence ends at 450).

QA on the render: motion 87.1% moving (pass); flash pass (1.5 flashes at most in a local window); amber 4 of 15 s
(the flag in F1 and F4 only, as the story asks); rhythm: median shot 2.7 s, moving transitions 8 a minute, major
interrupts 20 a minute, longest gap 2.4 s, cuts on a hit 60%. The rhythm tool counts F2's scroll pan and F3's
camera move to the footer as moving transitions, so it sees a 0.4 s "shot" after the pan (F2's result hold).
