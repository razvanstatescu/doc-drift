# JIRA (v5 round 2): Jira work counts too

Film 2640 to 3000 (360 frames, 12 s), lines S19 and S20. Owner: Review and scale. Brief: `video/V5.md` sections 5 and
8. Render: `out/v5/fixjira/JIRA.mp4`. Every cue comes from `timing.ts` (words only).

Round 2: crafted-led (v4's Jira, ADR and dashboard twins), with short real proofs at reading size (MorphToReal, then
RebuildFromReal back, one tag each); amber only on crafted twins. FIX cuts in plainly on its payoff's last frame; the
payoff's chime rings on over the cut (its tail is played here) under the kit's lead tick (`LEADS.JIRA`).

| Local frames | World | What (word it lands on) |
| --- | --- | --- |
| 0 to 110 | J, PAY-18 | Opens composed on the epic, big: "Jira · Payments · Epic", PAY-18, "Multi-region active-passive database", To Do. A person's click moves it to Done on "close" (click 81, Done readable 85). The real Done as a short proof (`p5-jira-done`, 91 to 117) |
| 110 to 269 | J, the chain | The camera opens on "the design page" and ADR-015 arrives (110 to 132). The anchor line draws from PAY-18 on "linked" (140) and the change runs along it; the page's table band slips amber (155) and hands it to the byline item, "Possibly stale · Doc Drift", readable on "flagged" (163), with the tooltip "PAY-18 moved to Done on Nov 13. Review." (165). The real byline and tooltip as a short proof (`p5-adr-tooltip`, 173 to 210). "Turn a flag into a Jira task": the page's Track in Jira lifts out (214), a person's click on Create Jira task on "into" (231), "Jira task created" on "Jira task" (242), and PAY-24 joins the chain big on "task" (252) |
| 269 to 360 | D, the dashboard | Locked push on "and see" to the space's dashboard, labelled "Confluence space dashboard · sample data from the demo space": the KPI cards drop and count up (18 of 24, 6, 0) on "see", the rows set in on "every", the drift's amber band under the State column on "flagged" (295). The real rows as a short proof (`p5-dashboard-2`, 305 to 328). One slow pull back over the line reaches the whole dashboard on "one dashboard" (345) and holds: the final pose for the kit's slip reveal into CLOSE |

The dashboard twin (`parts.tsx`, copied from v4's DashboardTwin and simplified) drops the space key title, the lead
line and the Severity, Open changes and Owner columns; the rows are the capture's six in its order.

## Proofs

| Capture | Crop (x, y, w, h) | Scale | Frames | Tag |
| --- | --- | --- | --- | --- |
| `p5-jira-done` | 700, 140, 2220, 160 | 0.85 | 91 to 117 | Recorded in Jira |
| `p5-adr-tooltip` | 1440, 300, 1460, 312 | 1 | 173 to 210 | Recorded in Confluence |
| `p5-dashboard-2` | 705, 1036, 1250, 600 | 0.9 | 305 to 328 | Recorded in Confluence · sample data from the demo space |

Covers (logged): on `p5-adr-tooltip` the `captures.json` "(Development)" cover [2589, 465, 176, 37] is re-covered in
the hovered item's own grey `#F1F1F2` (same box; its `why` names the suffix). No other cover: the dashboard crop starts
below "6 pages in PLAT are not anchored" (y 670 to 708), so nothing there is covered.

## Sound (in 12 s: the chime's tail, 5 effects, the kit's lead: about 30 a minute)

The PayoffShot's chime tail from FIX (the same file from frame 16 on: the L-cut), a person's click on the status (81),
tick as the flag lands (160), a person's click on Create Jira task (231), pop as PAY-24 lands (254), whoosh-short on the
push to the dashboard (276). Each is 8 to 19 dB under the voice by RMS.

## QA (2026-11-17, `out/v5/fixjira/JIRA.mp4`)

- `tools/qa/motion.py`: 92.2% moving (pass); M1 notes one still run on the ADR proof (28 frames).
- `tools/qa/flashcheck.py`: pass, 2-flash target met.
- `tools/qa/amber.py`: 3 of 12 s (the flag, the state band); no sample with two blobs.
- `tools/qa/rhythm.py --scene JIRA`: median shot 1.3 s, 25 moving transitions a minute (proof morphs and camera
  moves), 55 interrupts a minute, 55% inside a composition, longest gap 3.2 s, cuts and moves on a hit 83% (lift 2.6).
