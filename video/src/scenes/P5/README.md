# P5 · Scale (film 3937 to 4177)

Owner: Review and scale. Direction: `video/V4.md` (P5), beat V23 in `docs/video/v4/R3-crafted-product.md`.
Timing: `timing.ts` (local frame = film frame - 3937; beats are multiples of 15).

| Local frames | World | What |
| --- | --- | --- |
| 0 to 12 | P4 to J | Slip push (T5) out of P4's last pose (R19), on P4's own clock (a negative-from Sequence; `Freeze` clamps to the composition length and cannot reach P4's frame 659 inside P5) |
| 12 to 86 | J | PAY-18 (a plain card naming Jira in words) joined by its anchor to ADR-015 (Verified). "changes": To Do to Done, the change runs along the anchor. "count": the ADR's table band slips amber, then hands the amber to its byline item, "Possibly stale · Doc Drift". R20 |
| 86 to 158 | D | Slip push to the dashboard: "Drift in PLAT", its lead, KPI cards drop flat and roll to 18 of 24, 6, 0, Under 3 hours; the six rows; ADR-015's row ("Just now") slips amber on "drift". Labelled "Sample data from the demo space" (an ink chip at 28 px, and in R21's tag). R21 |
| 158 to 240 | T | Slip push to ADR-015's Track in Jira; the cursor clicks Create Jira task; "Jira task created", "PAY-24 tracks this change. When the page is up to date, open it and click Mark verified." R22; the final pose, which the kit's slip cut carries into A4 (Night) |

No number for the Jira flag time is shown (R3 risk 7). The real flow has a form (Project, Summary, Create task)
between the two clicks; the twin shortens it to the button and the result, and R22 shows the real result.

## Proofs

| # | Local frames | Capture | Crop (x, y, w, h) | Scale | Notes | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| R20a | 60 to 88 (28 f) | `p5-jira-done` | 700, 150, 2260, 160 | 0.6 | still; with R20b, one claim, joined by a drawn line from Done to the byline item | Recorded in Jira |
| R20b | 63 to 88 | `p5-adr-tooltip` | 1440, 300, 1460, 312 | 0.65 | still; ends at capture y 612, above the table (620: its rows name people); the logged cover re-covered in the hovered pill's grey `#F1F1F2` | Recorded in Confluence |
| R21 | 120 to 160 (40 f) | `p5-dashboard` | 720, 280, 3040, 420 | 0.5 | still; MorphToReal from the twin's KPI row | Recorded in Confluence, sample data from the demo space |
| R22 | 195 to 225 (30 f) | `p5-track-created` | 1150, 1610, 1550, 190 | 0.85 | still; MorphToReal from the twin's created message | Recorded in Confluence |

## Checks (2026-11-16, `out/v4/p4p5/P5.mp4`)

- `tools/qa/motion.py`: 100.0% moving (strict 78.3%), no frozen hold of 1 s or more.
- `tools/qa/amber.py --after 0`: 3 of 8 sampled seconds (37.5%; the 40% gate is counted on the film from A2 on). One
  amber per shot: ADR-015's band, then its byline item; the dashboard's ADR-015 row; Track in Jira's header badge.
- `tools/qa/flashcheck.py`: pass.
- Stills at every cue and a contact sheet: `out/v4/p4p5/stills/cues/p5-*.png`, `p5-contact.png`.
