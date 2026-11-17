# JIRA (v5 round 3): Jira work counts too

Film 2640 to 3000 (360 frames, 12 s), lines S19 and S20. Owner: Review and scale. Brief: `video/V5.md` sections 5 and
8. Render: `out/v5/fixjira/JIRA.mp4`. Every cue comes from `timing.ts` (words only).

Round 3: FIX's 3 a.m. payoff holds over the seam and under S19's first word, then a slip leaves Night. One still world
for S19 and the task (each real proof changed in place on its element: MorphToReal and RebuildFromReal on that
element's layer only), one push on the beat to the dashboard, which holds to endHit. Amber only on crafted twins, one
per shot. No lead sound at the seam (`withLead(JIRA, [])`): the picture does not cut there; the slip has its latch.

| Local frames | What (word it lands on) |
| --- | --- |
| 0 to 24 | The payoff, on FIX's own frames (a Sequence shifted by FIX's length, so it continues with no seam): the 3 a.m. answer with the right step, "Payments rollback runbook · Verified", 03:07. Its chime rings on (the L-cut). 2.2 s in all with FIX's part |
| 24 to 32 | The kit's slip reveal (T1 as a reveal): the payoff's three bands open and clear; the Jira chain is open on 32, one frame before "Jira" (33) |
| 32 to 106 | PAY-18 big and alone ("Jira · Payments · Epic", "Multi-region active-passive database", To Do); a person's cursor comes to its status (63) and To Do turns Done on "close" (click 81). The calm moment (2.5 s with no large change) |
| 106 to 176 | PAY-18 settles left as ADR-015 lifts in on "the design page" (landed 118, "design" 120), and their link is drawn as it lands (118 to 130): the link is on screen before anything is flagged. On "linked" the change runs along it (139 to 153); the page's table band slips amber on "gets" (153) and hands the amber to its byline, "Possibly stale · Doc Drift", readable on "flagged" (165); the tooltip "PAY-18 moved to Done on Nov 13. Review." opens (168) |
| 176 to 206 | The real byline and tooltip in place on the twin's (`p5-adr-tooltip`, 176 to 200), back to the twin (200 to 206) |
| 206 to 266 | "Turn a flag into a Jira task": the page's Track in Jira lifts out (206; the page racks back, as under the real modal, so the panel's badge is the one amber); a person's click on Create Jira task on "into" (231); "Jira task created" on "a Jira task" (242, "Jira" 245); the real notice in place (`p5-track-created`, 243: "Jira task created" and "PAY-24 tracks this change. When the page is up to date, open it and click Mark verified.") |
| 266 to 278 | The push to the dashboard (mid-push on the beat at 270); the real notice rides out with the chain |
| 278 to 360 | The dashboard, labelled "Confluence space dashboard · sample data from the demo space": the KPIs count up on "see" (275: 18 of 24, 6, 0), the drift's amber under the State column on "every flagged page" (285); the real rows in place (`p5-dashboard-2`, 300 to 328), back to the twin (no amber after), which holds to endHit: the final pose for the kit's slip reveal into CLOSE. On screen 3.0 s (3.2 s with the push); see the note below |

Not 4 s on the dashboard: "a Jira task" ends on 268 and its real notice needs its 24 frames (243 to 266) before the
push, and Create Jira task lives in the page's review panel (D35), not on the dashboard, so the dashboard cannot carry
it. The dashboard holds from the push to endHit, with no camera move.

## Proofs

| Capture | Crop (x, y, w, h) | Scale | Frames | In place on | Tag |
| --- | --- | --- | --- | --- | --- |
| `p5-adr-tooltip` | 2236, 446, 548, 172 | 0.9 | 176 to 206 | the twin's byline item (pill 2268, 462, 500, 44) | Recorded in Confluence |
| `p5-track-created` | 1150, 1612, 1310, 188 | 0.8 | 243 to 282 | the twin's notice (1169, 1627, 1291, 157) | Recorded in Confluence |
| `p5-dashboard-2` | 705, 1036, 1250, 600 | 0.9 | 300 to 336 | the twin's rows (705, 1100, 1250, 530) | Recorded in Confluence · sample data from the demo space |

Covers (logged): on `p5-adr-tooltip` the `captures.json` "(Development)" cover [2589, 465, 176, 37] is re-covered in
the hovered item's own grey `#F1F1F2` (same box; its `why` names the suffix). No other cover. The `p5-track-created`
crop's right edge crosses the notice's empty green fill (its text ends at x 2437), so its edge check is off; no text
line is cut.

Round 2's Done proof (`p5-jira-done`) and the PAY-24 card are gone: the real tooltip says "PAY-18 moved to Done", and
the real notice names PAY-24.

## Sound

The payoff chime's tail from FIX (the L-cut), slip-alt1 with its latch on the slip (24), a person's click on the status
(81), tick-soft as the flag lands (153), a person's click on Create Jira task (231), whoosh-short on the push (peak 272).

## QA (2026-11-17, `out/v5/fixjira/JIRA.mp4`)

- `tools/qa/motion.py`: 98.1% moving, no still run over 3 frames (round 2's near-still on the ADR proof is gone).
- `tools/qa/flashcheck.py`: pass, 0 flashes; one whole-frame change, the slip out of Night (24 to 32).
- `tools/qa/amber.py`: 3 of 12 s; never more than one amber blob (the Track in Jira badge is the one amber under the
  racked page; the dashboard's band leaves before the hold to endHit).
- `tools/qa/rhythm.py --scene JIRA`: 2 shots, median 6.0 s (round 2: 1.8 s), no hard cut (the rebuilds sharpen in
  place), one moving transition (the push, 272 to 277) on a strong hit (lift 2.7), longest gap 2.67 s (PAY-18, 32 to
  112: the scene's calm moment).
- Sync: chain open 32 / "Jira" 33 (was +33); Done 81 to 85 / "close" 85; ADR-015 landed 118 / "design" 120 (was -11);
  the change along the link 139 / "linked" 143; band 153 / "gets" 157; byline readable 165 / "flagged" 165; click 231 /
  "into" 233; "Jira task created" 242 / "Jira" 245; KPIs 275 / "see" 279; amber 285 / "every" 289.
- Effects 8 to 23 dB under the voice by RMS; the slip's latch (24) falls in the gap before S19's first word.
