# P4 · Review (film 3277 to 3937)

Owner: Review and scale. Direction: `video/V4.md` (P4), beats V19 to V22 in `docs/video/v4/R3-crafted-product.md`.
Timing: `timing.ts` (every cue from `timeline.json`; local frame = film frame - 3277; beats are multiples of 15).

Three worlds, joined by moving transitions (no hard cuts inside the scene):

| Local frames | World | What |
| --- | --- | --- |
| 0 to 76 | A, the runbook's foot | Opens composed under the kit's downward whip. The comment card lifts on "The page owner"; the mention pops on "owner"; R13 |
| 72 to 81 | A, the byline | Whip up (T9); the cursor reaches the byline item ("Possibly stale · Doc Drift", the amber); click on "opens" |
| 82 to 94 | A to B | Zoom-through (T6) into the panel |
| 94 to 403 | B, the review panel | Lands exploded (yaw -12, layers in Z), folds flat to read; travel to Quick fix; breakout; R14; "No AI used." big type (leaves before V21); Proposed fix; the Drift Reviewer card; the drafts land in the panel; R15 |
| 403 to 660 | C, the page and the drafts | Whip (T9) into the side view: the drafts hover above the page, dashed drop lines to the lines they would replace, the Steps band slipped amber; Accept fix; R16; snapBack (480): the drafts drop in, the band snaps home, Verified; R17; the terminal (real checkVerified, "Safe to cite."); R18; R19 (final pose) |

P4's last pose is exported as `P4FinalPose`; P5 opens on it (continuous handover, one owner).

## Proofs

Capture px are 3840 x 2160. Every proof starts on a beat. Masks from `captures.json` are drawn by the kit; where a
logged cover sits on a hovered byline pill it is re-covered in the pill's own grey `#F1F1F2` (sampled; the pill runs
around the box on every side, so the cover is invisible).

| # | Local frames | Capture | Crop (x, y, w, h) | Scale | Source and jumps | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| R13 | 45 to 72 (27 f) | `p4-comment` | 1500, 1690, 1420, 180 | 0.9 | still; MorphToReal from the twin's comment body | Recorded in Confluence |
| R14 | 180 to 210 (30 f) | `p4-review-rec` | card 1170, 1330, 1500, 290; then result 1170, 1630, 1500, 290 | 0.85 | 38.24 to 38.74 s (the real click at 38.308 s lands on "one-click", local 182); **cut on the 195 beat** to 41.60 to 42.10 s (the replace spinner, 38.45 to 41.0 s, is skipped) | Recorded in Confluence |
| R15 | 360 to 400 (40 f) | `p4-draft-diff` | 1170, 1310, 1500, 350 | 0.9 | still; MorphToReal from draft 2's diff | Recorded in Confluence |
| R16 | 435 to 465 (30 f) | `p4-accept-rec` | footer 1120, 1820, 1600, 170; then notice 1120, 470, 1600, 280 | 0.8 | 12.04 to 12.54 s (the real click at 12.373 s lands on "accepts", local 445); **cut on the 450 beat** to 18.00 to 18.50 s (the accept spinner and the panel's re-render are skipped). R3 had 17.60 s: the notice reaches the panel's top only at 17.88 s | Recorded in Confluence |
| R17 | 495 to 525 (30 f) | `p4-verified-tooltip` | 1440, 300, 1460, 300 | 0.8 | still; MorphToReal from the byline item. h 300, not 360: the next 60 px begin the table row naming Dana | Recorded in Confluence |
| R18 | 600 to 630 (30 f) | `p4-history` | 720, 370, 2240, 376 | 0.6 | still; in front of the page (dimmed to 40%) | Recorded in Confluence: page history |
| R19 | 630 to 660 (30 f) | `p4-step2-fixed` | 1480, 1230, 1520, 250 | 0.9 | still; MorphToReal from the twin's step 2; its code block is centred on the frame, where A1 punched in on the old step 2 | Recorded in Confluence |

The real cursor never shows; the kit's cursor appears only at the recorded click points (R14 1337, 1577 at 38.308 s;
R16 1929, 1894 at 12.373 s).

## Honesty notes

- Drafting never touches the page: the drafts fly from the Drift Reviewer card into the panel's Proposed fix; in the
  side view they hover above the page (drop lines to their target lines); they drop in only after the person's click
  (R16), on snapBack.
- "No AI used." is the rename quick fix's own line; the big type leaves the frame 6 frames before V21 starts.
- The agent card shows the real review step ("Please review", two "Submit fix proposal", "Confirm selected"): the
  drafts are stored only after a person confirms (R3 risk 5).
- STOPGAP in world C (`RenamedLine2`): after the quick fix the page's step 2 reads `./scripts/rollback-v2.sh --timeout
  $ROLLBACK_TIMEOUT` (version 2). PageTwin's `step2` has only "old" and "new", so this scene draws that line itself on
  the well's colour and metrics until PageTwin can (asked of the twins owner).
- The terminal prints the real `toolOutput.checkVerified` (status, citePolicy, guidance; the other keys shown as `…`).

## Checks (2026-11-16, `out/v4/p4p5/P4.mp4`)

- `tools/qa/motion.py`: 99.1% moving (strict 76.8%), no frozen hold of 1 s or more (longest 0.10 s).
- `tools/qa/amber.py --after 0`: 10 of 22 sampled seconds (45.5%), never more than one amber blob. One amber per shot:
  the byline item (world A, the side view until snapBack), the panel's Possibly stale badge (world B, racked behind the
  floats in V20 and V21); none after snapBack (the resolution).
- `tools/qa/flashcheck.py`: pass.
- Reading holds: "No AI used." still 47 f (needs 47); "Safe to cite." still about 59 f before R18 (needs 47). UI lines
  inside twins are shorter than the formula and are shown again in their proofs: "Accepts 2 drafts in page order."
  (about 45 f with R16), "Accepted. A new page version names PR #482." (about 56 f with R16).
- Stills at every cue and a contact sheet: `out/v4/p4p5/stills/cues/p4-*.png`, `p4-contact.png`; twins beside their
  captures: `out/v4/p4p5/twins/0.png` to `7.png` (`npx remotion still src/components/P4/dev/index.ts P4P5Twins ...`).
