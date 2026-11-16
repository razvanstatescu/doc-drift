# P5 · Scale (film 3937 to 4177)

Owner: Review and scale. Direction: `video/V4.md` (P5), beat V23 in `docs/video/v4/R3-crafted-product.md`.
Timing: `timing.ts` (local frame = film frame - 3937; beats are multiples of 15).

Round 2 (QA `out/v4/qa/review.md` R-2, R-10, R-13, R-14; `metrics.md`'s amber gap at f3960 to 4050): V23's two halves
each get a focal statement in the empty side; the ADR's lit byline (the one amber) stays in shot through R20; R21 is
the four real KPI cards; the KPI counts run up from 0 and stop.

| Local frames | World | What |
| --- | --- | --- |
| 0 to 12 | P4 to J | Slip push (T5) out of P4's last pose (R19, "Safe to cite."), on P4's own clock (a negative-from Sequence; `Freeze` clamps to the composition length and cannot reach P4's frame 659 inside P5) |
| 12 to 86 | J | "Jira changes / count too." (120 px, lower left). PAY-18 (a plain card naming Jira in words) joined by its anchor to ADR-015 (Verified). "changes": To Do to Done, the change runs along the anchor. "count": the line's one decisive push toward ADR-015 as its table band slips amber and hands the amber to its byline item (lit "Possibly stale · Doc Drift", in shot to the push out). R20: the Jira strip grows out of the Jira card across the top; the real ADR byline and tooltip on the left, rhyming with the twin's lit byline |
| 86 to 158 | D | Slip push to the dashboard (right): "Every space / gets a drift / dashboard." (110 px) in the empty top left; "Drift in PLAT", its lead, the KPI cards drop flat and count up from 0 to 18 of 24, 6 (0 and Under 3 hours are not counts) and stop; the six rows set in; ADR-015's row ("Just now") slips amber 0 to 2 f before "drift". Labelled "Sample data from the demo space" (an ink chip at 28 px, and in R21's tag). R21 under it; only the twin's KPI row steps back |
| 158 to 240 | T | Slip push to ADR-015's Track in Jira; the cursor clicks Create Jira task; "Jira task created", "PAY-24 tracks this change. When the page is up to date, open it and click Mark verified." R22 over the twin's own message (which steps back; the card's amber badge stays); the final pose, which the kit's slip cut carries into A4 (Night) |

No number for the Jira flag time is shown (R3 risk 7). The real flow has a form (Project, Summary, Create task)
between the two clicks; the twin shortens it to the button and the result, and R22 shows the real result.

## Proofs

| # | Local frames | Capture | Crop (x, y, w, h) | Scale | Notes | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| R20a | 60 to 88 (28 f) | `p5-jira-done` | 700, 136, 2260, 161 | 0.6 | still; MorphToReal out of the Jira card's title row, which goes under it (the rest of the world stays); across the top. The breadcrumb (rows 152 to 183) and the title row with Done (228 to 293), stopping above the buttons (300) (R-10) | Recorded in Jira |
| R20b | 63 to 88 | `p5-adr-tooltip` | 1440, 300, 1460, 312 | 0.6 | still; on the left, its byline row at the height of the twin's lit byline (R2's claim and receipt). The two-line tooltip ends on row 603 and the table starts on 620 (its rows name people): h 312. The logged cover re-covered in the hovered pill's grey `#F1F1F2` | Recorded in Confluence |
| R21 | 120 to 160 (40 f) | `p5-dashboard` | 704, 448, 3072, 252 | 0.6 | still; the four KPI cards only (columns 720 to 3759, rows 460 to 687) (R-2, R-13); MorphToReal from the twin's KPI row | Recorded in Confluence, sample data from the demo space |
| R22 | 195 to 225 (30 f) | `p5-track-created` | 1150, 1610, 1550, 190 | 0.85 | still; MorphToReal from the twin's created message, placed over it | Recorded in Confluence |

## Checks (round 2, 2026-11-16, `out/v4/p4p5/P5.mp4`)

- `tools/qa/motion.py`: 100.0% moving (strict 98.8%), no frozen hold of 1 s or more.
- `tools/qa/amber.py --after 0`: 3 of 8 at the scene's own 1 fps phase. At the film's phase (film frames 3960, 3990 ...;
  local 23 + 30 n) the raw read finds the one amber in 7 of 8 samples: all but 3960, which is before the flag (the
  story). R1's JPEG method counts only the Track in Jira badge (173, 203, 233): the lit ADR byline (World J, 0.11 to
  0.13% raw) and the dashboard's ADR-015 row (0.06 to 0.08% raw) are under its size floor at these framings.
- `tools/qa/flashcheck.py`: pass.
- Reading holds after the last word lands: "Jira changes count too." 33 f (formula 54), "Every space gets a drift
  dashboard." 27 f (formula 70); both lines are read along with the voice and leave with their shot's slip push.
- Stills at every cue and a contact sheet: `out/v4/p4p5/stills/cues/p5-*.png`, `p5-contact.png`.
