# JIRA (v5): Jira work counts too

Film 2550 to 2880 (330 frames), lines S19 and S20. Owner: Review and scale. Brief: `video/V5.md` sections 5 and 7.
Render: `out/v5/fixjira/JIRA.mp4`.

Four real shots of 2 s or more (the kit's `RealTake`). FIX to JIRA is a plain cut on an action (the real click on
"To Do" 2 frames in) with FIX's ring as an L-cut; JIRA to CLOSE is the kit's slip reveal at 330, so JIRA ends on a
composed pose.

| Shot | Frames | Capture | What happens (word it lands on) |
| --- | --- | --- | --- |
| J1 | 0 to 78 | `p5-jira-rec` 2.25 to 7.2 s | Epic PAY-18 "Multi-region active-passive database", tagged "Recorded in Jira". The real click on "To Do" at 2 (the cut lands on it), the menu, the real click on "Done" at 38, the save's spinner at a labelled ramp (8x), solid "Done" at 54 ("close" 55). The camera pushes onto the epic's "Decision: ADR-015." from 60; Mist on "ADR-015." at 72 |
| J2 | 78 to 180 | `p5-adr-flagged`, `p5-adr-tooltip` from 157 | Carry cut: the design page grows out of the word (the kit's `GrowReveal`). The incoming camera starts with the title's "ADR-015" exactly on the epic's (0.51, the smallest scale RealTake holds without its edge clamp moving the centre; the outgoing push ends on the matching scale, 0.99), both cameras share the float's seed, then push in to reading size; the grow's fastest frames fall on "design" (88). Status row lit on "that still says" (106), Mist on "planned" at 136 ("planned" 140). On "gets flagged": the drift's amber on the byline item at 150 ("gets" 154), the real tooltip "PAY-18 moved to Done on Nov 13. Review." at 157 ("flagged" 161). The crop ends on the Status row's rule: no Date, Deciders or Owner rows |
| J3 | 180 to 240 | `p5-track-rec` 13.9 to 18.0 s | Plain cut on the beat ("Turn" 182). The real Track in Jira form (summary prefilled from the flag), the real click on "Create task" at 195, the spinner at a labelled ramp (10x), the real "Jira task created / PAY-24 tracks this change." at 212 ("Jira" 215), Mist on "PAY-24 tracks this change." at 213. The crop starts below the panel's header (its score) and its affected section (its people) |
| J4 | 240 to 330 | `p5-dashboard-2` | Plain cut on the beat. The rows (page and state) big, tagged "Sample data from the demo space" (top right: the dashboard's text runs from the left of both poses). The drift's amber sweeps down the column of real "Possibly stale" states at 265 ("flagged" 269). On "one dashboard" (301) the camera pulls back to the tiles "Pages anchored 18 of 24" and "Possibly stale 6" over the rows, the amber leaves, and the pose holds still for the slip reveal |

Measured on the captures (capture px):
- `p5-jira-rec`: "To Do" clicked 2.318 s (2795, 262), menu open 2.43 s, "Done" clicked 4.049 s (2932, 434), status
  faded "Done" with a spinner 4.17 to 5.9 s, solid "Done" from 5.95 s; the recording ends at 7.29 s. "ADR-015" in the
  description 2259 to 2372 x 480 to 500.
- `p5-adr-flagged`: title "ADR-015" glyphs 1481 to 1701 x 345 to 387; byline item 2268 to 2590 x 466 to 502 (suffix
  masked from 2589); Status row 620 to 710, "planned" 2661 to 2775 x 651 to 682. `p5-adr-tooltip`: the hovered item's
  grey runs to 2768, so an extra white mask ends it under the amber; tooltip 2277 to 2757 x 524 to 603.
- `p5-track-rec`: "Create task" clicked 14.447 s (1294, 1820); the notice shows at 17.083 s (1168 to 2671 x 1629 to
  1787); "PAY-24 tracks this change." 1282 to 1632 x 1725 to 1751. After the result the affected section's people
  sit at y 1163 to 1229, so the crop starts at 1240.
- `p5-dashboard-2`: tiles y 300 to 528; rows 1126 to 1739 (state lozenges 1710 to 1924); "6 pages in PLAT are not
  anchored ..." (716 to 1576 x 670 to 708) is covered: the space key is never shown.

Sound (6 effects, 33 a minute): FIX's chime continues from -9 (the L-cut); the two real clicks (the first is the
cut's accent); a pop on the carry's fastest frame; a tick as the amber lands; the real Create task click; a tick-soft
on the cut to the dashboard.

QA on the render: motion 93.9% moving (pass); flash pass (1 flash at most in a local window); amber 3 of 11 s (J2's
flag and J4's column, one per shot); rhythm: median shot 3.0 s, all interrupts 54.5 a minute, inside a composition
60%, longest gap 2.3 s; the carry is not counted on a hit (the voice masks the pop's onset), the hard cut is.
