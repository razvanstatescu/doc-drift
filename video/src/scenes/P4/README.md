# P4 · Review (film 3277 to 3937)

Owner: Review and scale. Direction: `video/V4.md` (P4), beats V19 to V22 in `docs/video/v4/R3-crafted-product.md`.
Timing: `timing.ts` (every cue from `timeline.json`; local frame = film frame - 3277; beats are multiples of 15).

Three worlds, joined by moving transitions (no hard cuts inside the scene). Round 2 (QA `out/v4/qa/review.md` R-1 to
R-15, K-1, ranked improvements 1 and 2; `metrics.md`): one focal statement per line in the empty side, every proof's
twin steps back under it, and V22 is the payoff.

| Local frames | World | What |
| --- | --- | --- |
| 0 to 76 | A, the runbook's foot | Opens composed under the kit's downward whip: the comment card over the page's foot, the page on the right. "One comment." (130 px, Fathom) lands in the empty top left on "one" and "comment" (the key word arrives from 1.6x). The frame leans in on "owner" as the mention pops; R13 grows out of the comment's body |
| 72 to 81 | A, the byline | Whip up (T9); the cursor reaches the byline item ("Possibly stale · Doc Drift", the amber); click on "opens" |
| 82 to 94 | A to B | Zoom-through (T6) into the panel |
| 94 to 396 | B, the review panel | Lands exploded, folds flat to read; travel to Quick fix; the card breaks out and lands 1 to 2 f before "rename"; R14 grows out of it; the card moves aside and a copy of "No AI used." lifts out of its sentence (the sentence stays whole) on a high arc into big type (leaves before V21); Proposed fix: the click on "bigger", a spinner replaces the label (as the UI Kit button does); the Drift Reviewer card; the drafts fly back and the card grows only as each one docks; R15 |
| 396 to 480 | C, the side view | Whip on "Nothing" (T9): the page on the left, exploded, the drafts hovering above it with dashed drop lines to the lines they would replace (where the slipped band is now). "Nothing changes / until a person / accepts." (110 px) in the right column, each word on its narration word; the footer card under it; R16 grows out of the footer; the "Accepted." toast lifts into the empty lower right after R16 |
| 478 to 498 | C, the payoff | One decisive push (0.72 to 0.95) as the page squares up: the drafts drop and sit on their lines as solid blocks (2 f), the band slips home over 8 f with the score's hit (snapBack 480), step 2 slips in its `_SECS` insertions, the byline slip-swaps to "Verified · Doc Drift" (readable at 481, film 3758: 2 f before "Verified.") |
| 495 to 660 | C, the tail | R17; the terminal lifts into the empty lower right (command already typed, real checkVerified, "Real output: doc-drift MCP"); "Safe to cite." (140 px) lands on "cite" top right and holds as a still bar to the end; the terminal leaves to the right; R18; R19 (final pose), centred and unobstructed |

P4's last pose (R19 and "Safe to cite.") is exported as `P4FinalPose`; P5 opens on it (one owner's handover).

## Proofs

Capture px are 3840 x 2160. Every proof starts on a beat. The kit draws each tag above its mat. Under a proof its twin
steps back (MorphToReal: 18%, 7 px blur, drained; R18 uses the same rest by hand). Masks from `captures.json` are drawn
by the kit; a logged cover on a hovered byline pill is re-covered in the pill's own grey `#F1F1F2`.

| # | Local frames | Capture | Crop (x, y, w, h) | Scale | Source and jumps | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| R13 | 45 to 72 (27 f) | `p4-comment` | 1500, 1690, 1420, 180 | 0.9 | still; MorphToReal from the twin's comment body, its body on the twin's | Recorded in Confluence |
| R14 | 180 to 205 (25 f) | `p4-review-rec` | card 1148, 1305, 1530, 340; then result 1148, 1645, 1530, 267 | 0.85 | MorphToReal from the quick fix card. 38.24 s on (the real click at 38.308 s lands on "one-click", local 182); **cut on the 195 beat** to 41.60 s. The crops start left of the "Quick fix" heading and the success box (R-7) | Recorded in Confluence |
| R15 | 360 to 391 (31 f) | `p4-draft-diff` | 1170, 1310, 1500, 350 | 0.9 | still; MorphToReal from draft 2's diff; it leaves as the whip starts | Recorded in Confluence |
| R16 | 435 to 465 (30 f) | `p4-accept-rec` | footer 1120, 1820, 1600, 170; then notice 1120, 470, 1600, 280 | 0.8 | MorphToReal from the footer card. 12.04 s on (the real click at 12.373 s lands on "accepts", local 445); **cut on the 450 beat** to 18.00 s (the notice reaches the panel's top at 17.88 s) | Recorded in Confluence |
| R17 | 495 to 525 (30 f) | `p4-verified-tooltip` | 1440, 300, 1460, 300 | 0.75 | still; MorphToReal from the byline item. The one-line tooltip ends on row 571 and the table starts on 620: h 300 shows all of it and none of the row below | Recorded in Confluence |
| R18 | 600 to 624 (24 f) | `p4-history` | 700, 370, 2260, 376 | 0.6 | still; the world rests under it (and stays rested under R19). The crop starts left of the table's border | Recorded in Confluence: page history |
| R19 | 630 to 660 (30 f) | `p4-step2-fixed` | 1450, 1222, 1580, 278 | 0.9 | still; MorphToReal from the twin's step 2; its code block centred where A1 punched in on the old step 2. "2." clear of the left edge, nothing of step 3 | Recorded in Confluence |

The real cursor never shows; the kit's cursor appears only at the recorded click points (R14 1337, 1577 at 38.308 s;
R16 1929, 1894 at 12.373 s).

## Honesty notes

- Drafting never touches the page: the drafts fly from the Drift Reviewer card into the panel's Proposed fix; in the
  side view they hover above the page (drop lines to their target lines); they land only after the person's click
  (R16), on snapBack, and the page then shows `step2: "new"` (PageTwin's own slip morph from "renamed").
- Step 2 reads `./scripts/rollback-v2.sh --timeout $ROLLBACK_TIMEOUT` between the quick fix and the drafts (PageTwin
  `step2: "renamed"`, version 2 of the page).
- "No AI used." is the rename quick fix's own line, lifted as a copy (the card's sentence stays whole); the big type
  leaves the frame before V21 starts.
- The agent card shows the real review step ("Please review", two "Submit fix proposal", "Confirm selected"): the
  drafts are stored only after a person confirms (R3 risk 5).
- Propose fix while the agent works: the label hides and a spinner shows, as the UI Kit button does (QA R-1).
- The statements are the narration's own words: "One comment.", "No AI used.", "Nothing changes until a person
  accepts.", "Safe to cite." (the real guidance's last sentence, also printed in the terminal).
- The terminal prints the real `toolOutput.checkVerified` (status, citePolicy, guidance; the other keys shown as `…`).

## Checks (round 2, 2026-11-16, `out/v4/p4p5/P4.mp4`)

- `tools/qa/motion.py`: 97.1% moving (strict 74.2%), no frozen hold of 1 s or more (longest 0.33 s).
- `tools/qa/amber.py --after 0`: 10 of 22 (45.5%) at the scene's own phase; 9 of 21 (42.9%) at the film's phase (film
  frames 3300, 3330 ...). No sample with two amber blobs. None after the snap back, by design (the resolution).
- `tools/qa/flashcheck.py`: pass. The kit's crop guard printed no warning in the render log.
- Sync: the Quick fix card is flat and still from local 152 (film 3429, 3 f before "rename"); "Verified · Doc Drift"
  is fully readable from local 479 to 480 (film 3756 to 3757, 3 to 4 f before "Verified."); the drafts sit on their
  lines as solid blocks at 478 and 479 and the band slips home over 480 to 488 with the snap.
- Reading holds after the last word lands: "One comment." 14 f (formula 39; the line is spoken at its words and the
  whip on "opens" carries it out), "No AI used." 47 f (47), "Nothing changes until a person accepts." 23 f (formula 78;
  it leaves as the payoff starts), "Safe to cite." 111 f (47).
- `whoosh-short` on the whip and after the zoom-through lowered to -6 and -7 dB (metrics: 6 dB under the voice).
- Stills at every cue and a contact sheet: `out/v4/p4p5/stills/cues/p4-*.png`, `p4-contact.png`; twins beside their
  captures: `out/v4/p4p5/twins/0.png` to `7.png` (`npx remotion still src/components/P4/dev/index.ts P4P5Twins ...`).
