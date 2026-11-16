# P4 · Review (film 3277 to 3937)

Owner: Review and scale. Direction: `video/V4.md` (P4), beats V19 to V22 in `docs/video/v4/R3-crafted-product.md`.
Timing: `timing.ts` (every cue from `timeline.json`; local frame = film frame - 3277; beats are multiples of 15).

Three worlds, joined by moving transitions (no hard cuts inside the scene). Round 2 (QA `review.md`): one focal statement
per line in the empty side, every proof's twin steps back under it. Round 3 (`review-r2.md` P-1 to P-6, K-7, top 5;
`metrics-r2.md`): statements hold at least 45 frames, two are set whole on the beat with a push, and V22 is a hero beat
that rhymes with P1's V12.

| Local frames | World | What |
| --- | --- | --- |
| 0 to 76 | A, the runbook's foot | Opens composed under the kit's downward whip: the comment card over the page's foot, the page on the right. "One comment." (130 px) set whole on the 30 beat with a push, held in screen space while the world whips under it (46 f). The frame leans in on "owner" as the mention pops; R13 grows out of the comment's body |
| 72 to 81 | A, the byline | Whip up (T9); the cursor reaches the byline item ("Possibly stale · Doc Drift", the amber); click on "opens" |
| 82 to 94 | A to B | Zoom-through (T6) into the panel |
| 94 to 396 | B, the review panel | Lands exploded and folds flat; one push onto the why sentence while it holds flat (P-5); travel to Quick fix; the card breaks out and lands 2 f before "rename"; R14 grows out of it; a copy of "No AI used." lifts out on a high arc into big type; Proposed fix: the spinner while the agent works; Drift Reviewer's "Please review / Submit fix proposal / Confirm selected" card lifts to hero size (1.75x) for the beat in which a person confirms (P-2), then returns as the drafts leave it; the card grows only as each draft docks; R15 |
| 396 to 476 | C, the side view | Whip on "Nothing": the page on the left, exploded, its Steps band out of line carrying the amber (edge, glow, bloom), the drafts hovering above it with dashed drop lines. "Nothing / changes / until a person / accepts." (106 px) in the right column at x 1214: it builds on "Nothing" and "changes", completes whole on "until" (local 429) and rides into the payoff (78 f complete). The footer card under it; R16 grows out of the footer |
| 476 to 500 | C, the payoff | One decisive push (0.72 to 1, 1.39x) onto the byline into P1's V12 framing (the item at 560, 520): the drafts sit on their lines as solid blocks (478, 479), the band latches back into line over 480 to 488 with the snap and its glow fades with the slip, step 2 slips in `_SECS`, the byline slip-swaps to "Verified · Doc Drift" (readable 3756 to 3757). P1's "✓ Verified." (icon 104 px, 120 px type, left 1214 on the byline's row) lands on "Verified." under "accepts." |
| 495 to 660 | C, the tail | R17 lands on the byline (P1's R4 grammar); the terminal rises into the empty lower right from below the frame on "agent" (command typed, real checkVerified, "Real output: doc-drift MCP"); "Safe to cite." (140 px) set whole on the 540 beat with a push and held as a still bar to the end; the terminal leaves to the right; R18; R19 (final pose), centred and unobstructed |

P4's last pose (R19 and "Safe to cite.") is exported as `P4FinalPose`; P5 opens on it (one owner's handover).

## Proofs

Capture px are 3840 x 2160. Every proof starts on a beat. The kit draws each tag above its mat. Under a proof its twin
steps back (MorphToReal: 18%, 7 px blur, drained; R18 uses the same rest by hand). Masks from `captures.json` are drawn
by the kit; a logged cover on a hovered byline pill is re-covered in the pill's own grey `#F1F1F2`.

| # | Local frames | Capture | Crop (x, y, w, h) | Scale | Source and jumps | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| R13 | 45 to 72 (27 f) | `p4-comment` | 1500, 1690, 1420, 180 | 0.9 | still; MorphToReal from the twin's comment body, its body on the twin's | Recorded in Confluence |
| R14 | 180 to 205 (25 f) | `p4-review-rec` | card 1148, 1305, 1530, 340; then result 1148, 1645, 1530, 267 | 0.85 | MorphToReal from the quick fix card. 38.24 s on (the real click at 38.308 s lands on "one-click", local 182); **cut on the 195 beat** to 41.60 s | Recorded in Confluence |
| R15 | 360 to 391 (31 f) | `p4-draft-diff` | 1170, 1310, 1500, 350 | 0.9 | still; MorphToReal from draft 2's diff; it leaves as the whip starts | Recorded in Confluence |
| R16 | 435 to 465 (30 f) | `p4-accept-rec` | footer 1120, 1820, 1600, 170; then notice 1120, 470, 1600, 280 | 0.8 | MorphToReal from the footer card. 12.04 s on (the real click at 12.373 s lands on "accepts", local 445); **cut on the 450 beat** to 18.00 s (the notice reaches the panel's top at 17.88 s) | Recorded in Confluence |
| R17 | 495 to 525 (30 f) | `p4-verified-tooltip` | 2115, 446, 705, 140 | 0.92 | still; P1's R4 grammar: MorphToReal from the byline item, landing on it. "Add a reaction", the hovered pill (2322 to 2805) and its tooltip (rows 524 to 571); every edge on whitespace (2115 lies between the reactions "2" and "Add a reaction"; the table starts on 620) | Recorded in Confluence |
| R18 | 600 to 624 (24 f) | `p4-history` | 700, 370, 2260, 376 | 0.6 | still; the world rests under it (and stays rested under R19). The crop starts left of the table's border | Recorded in Confluence: page history |
| R19 | 630 to 660 (30 f) | `p4-step2-fixed` | 1450, 1222, 1580, 278 | 0.9 | still; MorphToReal from the twin's step 2; its code block centred where A1 punched in on the old step 2 | Recorded in Confluence |

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
  drafts are stored only after a person confirms (R3 risk 5); the hero beat shows exactly that step.
- Propose fix while the agent works: the label hides and a spinner shows, as the UI Kit button does (QA R-1).
- The statements are the narration's own words: "One comment.", "No AI used.", "Nothing changes until a person
  accepts.", "Verified." (P1's line, with its icon), "Safe to cite." (the real guidance's last sentence, also printed in
  the terminal).
- One amber per shot: the byline item (world A), the panel's badge (world B), the slipped Steps band (world C, until it
  latches back); none after the snap back (the resolution).
- The terminal prints the real `toolOutput.checkVerified` (status, citePolicy, guidance; the other keys shown as `…`).

## Checks (round 3, 2026-11-16, `out/v4/p4p5/P4.mp4`)

- `tools/qa/motion.py`: 95.0% moving (strict 72.9%), no frozen hold of 1 s or more (longest 0.30 s).
- `tools/qa/amber.py --after 0`: 10 of 22 (45.5%); 9 of 21 (42.9%) at the film's phase. No sample with two blobs.
- `tools/qa/flashcheck.py`: pass, and the 2-flash target is met: the zoom-through uses its directional blur (the
  5-sample camera blur dipped one frame's local luminance).
- Statement holds (complete and still, to the first frame it leaves): "One comment." 46 f (formula 39), "No AI used."
  47 (47), "Nothing changes until a person accepts." 78 (78), "✓ Verified." 47 (32), "Safe to cite." 120 (47).
- Sync: Quick fix still from 3429 ("rename" 3432); "Verified · Doc Drift" readable from 3758 ("Verified." 3760).
- Stills at every cue and a contact sheet: `out/v4/p4p5/stills/cues/p4-*.png`, `p4-contact.png`.
