# R3 · Crafted product moments with real proof (launch film v4)

Research and plan for the product part of the film, V07 to V23 (film frames 1057 to 4177, 104 s), written 2026-11-16 for the v4 redesign. Razvan's note on v3: the story works, but it looks boring and cheap because it shows long stretches of plain Confluence screens. v4 tells the product part with crafted visuals in our Day look, and proves each claim with a short, framed piece of the real product.

Inputs: `video/BRIEF.md`, `video/SCENES.md`, `video/src/data/timeline.json` (narration locked), `video/src/data/captures.json`, `video/out/doc-drift-v3.mp4`, `apps/core/src/frontend/**` and `apps/core/src/lib/copy.ts`, `site/index.html`, the Pot film kit (`near/Pot/marketing/video/src/ui/README.md`). Evidence grids (frame timings in the real recordings, v3 contact sheets) are in `video/out/research-v4/r3/`.

## 1. The answer in brief

- **The grammar is "explain, then prove".** Each narration line gets a crafted shot: a rebuilt piece of our UI (a *twin*) on the Paper ground that moves, with one amber element. Inside the same line, the twin hands over to a *proof insert*: a 1 to 2 s crop of a real capture, framed and tagged. The handover is a morph on the matching element: the twin's badge, row or button lands exactly on the same words in the capture, and the real screen grows out around it.
- **Proof ratio: 23% of V07 to V23 is real screen footage** (22 inserts, 725 frames, 24.2 s of 104 s), and 32% with the verbatim MCP output on screen. Over P1 to P5 alone it is 29%. The 14 inserts marked *must* (515 frames, 17%) are the floor; cut the *nice* ones first, never a must.
- **A2 (V07 to V10) stays crafted, with no proof insert.** It promises; P1 to P5 prove every claim it makes within 50 s. The twins in A2 already carry the runbook's real text, anchors and state words, so P1 can morph the same page into the real one.
- **Transitions are all DOM and all built from the slip**: a morph to the real capture (8 to 10 frames), the amber match cut, a three-band slip push, a zoom-through into a crafted element, a signal handoff along a line, a push-cut for quick inserts, and the existing slip cut, whip and snap back. No GPU transitions in the body render.
- **Needs a decision before building (proposed D39):** v4 shows crafted twins of our own UI in the product acts. D37 and research 7.5 said mocks appear only in the problem act. The safeguard that replaces that rule is section 3: in P1 to P5 every crafted claim is proven by a real insert in the same line (A2's claims are all proven again there), twins use only real strings and real data, and proof inserts are never restyled.

## 2. What premium launch films do, and what we take

Searched 2026-11-16. I found no published breakdown of the Linear, Vercel, Arc or Dia, Notion or Cursor launch films; for those I used their shipped surfaces on Mobbin, as references for layout only. None of these products appears in the film.

| Source | What they do | The one thing we take |
| --- | --- | --- |
| Stripe, Connect front end: https://stripe.com/en-ro/blog/connect-front-end-experience | Product UI is drawn in code, in CSS 3D (`perspective`, `preserve-3d`, `translateZ` per layer), with custom cubic-bezier curves and "in most cases ... under 500 milliseconds" | Twins are DOM, layered in Z with CSS 3D; moves land in 6 to 15 frames on expo out |
| Raycast, kinetic product motion (Steve Lemuel): https://contra.com/p/llNMeeMX-raycast-kinetic-product-motion | UI rebuilt in Figma "ensuring pixel-perfect alignment with Raycast's official design system", fast "instant" easing, an audio cue for each action | Twins are rebuilt from our real components and copy file, never redesigned; one small sound per UI action |
| Linear homepage sections on Mobbin: https://mobbin.com/sites/sections/51e7f400-3bc1-4432-9f3b-117d49cd19c1 and https://mobbin.com/sites/sections/b8f0bfb5-9da2-45b1-978f-1251f7ec3a49 | One crisp card in front of a dimmed product context; a tilted plane that falls off into the ground | A proof insert sits in front of its own twin, which dims to 40% behind it; twins tilt up to 12°, proofs at most 6° |
| One North on animating Figma's multiplayer cursors: https://www.onenorth.com/insights/story-first-then-make-it-beautiful/ | "Getting that timing right, so it actually matched the real Figma high-five animation, took many rounds of iteration." "Let animation earn its place." | A twin's behaviour matches the real UI's: the same steps, the same order, the same words. Waits we cut from real clips are cut on a beat and logged |
| Figma Config 2026 opening film by Relay: https://figma.com/blog/the-visual-identity-behind-config-2026 | Elements "threading, stacking, looping, and breaking out of containers entirely" | Breakouts: the Quick fix card and the draft diff lift out of the review panel and turn to camera |
| "Cinematic shot" skill for filming software UI: https://www.ui-skills.com/skills/1weiho/cinematic-shot | Hero shots at set magnifications; "Never upscale a 1× bitmap"; "No restyling the real UI"; the camera keeps drifting | The crispness rule in section 3 and the "never restyle a proof" rule |
| Grammarly for developers hero on Mobbin: https://mobbin.com/sites/sections/6cc25036-b072-445c-9612-c0d83c5c8196 | A code card behind a message card, with a floating suggestion and Accept and Dismiss | V20 and V21 compose the fix as a card floating over the page it changes |
| Agent diff reviews on Mobbin (Replit https://mobbin.com/screens/e92dd0ec-6660-4610-930a-38900c351734, Devin https://mobbin.com/screens/e48cb198-fd26-4a92-b17a-a988aa5cbef8, Antimetal https://mobbin.com/sites/sections/38557cd6-0834-4d5a-b186-89ac968d8332) | The agent's change is a red and green diff with one explicit apply action | The draft twin reads as a diff waiting for one person's click, which is what our panel does |
| Page verification badges on Mobbin (Notion https://mobbin.com/screens/96596a0d-32a0-4dcc-aa99-573ff6e90b64, Slite https://mobbin.com/screens/0d8f2e51-bf8f-43b5-91ff-3596447128c1) | Trust shown as a badge in the page header, with a popover that explains it | The byline badge and its tooltip are the hero element of the film; Notion's date-based verification is also the idea A1 argues against ("a date can't see a merge") |
| Pot film UI kit (local): `near/Pot/marketing/video/src/ui/README.md` | App-faithful replicas where every state is a prop; breakouts as sibling layers over the screen, never inside clipped layers; 1:1 comparison renders against captures | Same discipline for our twins, including a still per twin compared with its capture |
| Remotion docs: https://www.remotion.dev/docs/transitions/presentations and https://www.remotion.dev/docs/motion-blur/camera-motion-blur | 22 presentations; CameraMotionBlur renders `samples` sub-frames ("Recommended values: 5-10") and "is destructive to colors" | Use motion blur only on whips and zoom-throughs, with 5 or 6 samples, and check the amber and Paper flats after |

## 3. Rules for v4's product part

**Twins (crafted UI).** Spline Sans and Day tokens, our badges (word and icon), primary buttons filled with `text`. Every string comes from `apps/core/src/frontend/shared/copy.ts`, `apps/core/src/lib/copy.ts` or the capture itself, and every value from `captures.json` (PR #482, PAY-6, PAY-18, PAY-24, Razvan Statescu, Nov 13, 19 s). A twin may simplify a layout (drop rows, enlarge type) but never adds a control, a state, a step or a word that the real UI does not have. No Atlassian product marks or Atlassian blue in twins; Bitbucket, Jira and Rovo twins are plain cards that name the product in words only.

**Proof inserts (real captures).**
- Framing: `ProofFrame`, a white card with radius 24, a 1 px `line` hairline and `shadow-raise`, on the Paper ground, flat or tilted at most 6°, camera drift at most 1.03 while it holds. The twin stays behind it, dimmed to 40%.
- Tag: a pill above the card's top-left corner, Spline Sans 600 at 30 px, `textMuted` on `surfaceSunk`. Wording: "Recorded in Confluence", "Recorded in Bitbucket: the real merge", "Recorded in Rovo", "Recorded in Jira", "Real output: doc-drift MCP". I recommend "Recorded" over "Live": the clips are recordings of the development install from Nov 13, and some waits are cut.
- Crispness: never more than 1 film px per capture px (captures are 2x CSS, so 1.0 already shows CSS text at 28 px). Each crop in section 6 is sized so the insert holds at 0.6 to 1.0 and any punch-in stops at 1.0.
- Length: 30 to 60 frames, never under 24, starting on a beat (beats fall on frames where frame mod 15 = 7). The twin carries the readable text; the proof only has to be recognised as the same words in the same place.
- Honesty: the "(Development)" masks stay on (`Shot` draws them). A jump over a spinner is a cut on a beat with a 2-frame push, logged in `captures.json`. Recordings show no real cursor; the kit's cursor appears only at recorded click points and times.
- Sound: `tick-soft` when the tag lands; `click` on a real click frame; the real UI's own result sounds as listed per line.

**Camera and amber.** Lateral tracks run left to right, the slip's direction. Twins tilt up to 12° of yaw and 8° of pitch at perspective 2400 px (1350 px for the exploded panel). One amber element per shot, as in the brief. From V14 to V22, whenever the runbook twin is on screen its Steps band stays slipped with its trace and its badge is the amber element, so the drift reads as one continuous state until the snap back. Still bars, needed after fast stretches: V10, the V15 statement, the V18 guidance and "Safe to cite." at V22.

## 4. Transitions catalogue

| # | Transition | When | Frames @30 | Build in Remotion 4.0.543 | Cost |
| --- | --- | --- | --- | --- | --- |
| T1 | **Slip cut** (exists) | Between worlds: A1 to A2 (exists), P5 to A4 | 8 (6 slip + 2 clear) | `SlipCut`/`SlipBands`: 3 bands by `clip-path: inset()`, middle `translateX(0.117W)` on expo out | Both shots for 8 frames, DOM |
| T2 | **Amber match cut** | The amber element crosses from one shot to the next (rename literal to file header, band to badge, badge to snap) | 0, plus 4 to 6 frames of matched motion on each side | Both shots get the same `matchRect` in film px; shot A's camera keys end on it, shot B starts on it and keeps the velocity | Free |
| T3 | **Morph to real** (the signature) | Every twin-to-proof handover | 8 to 10 | `MorphToReal`: scale and translate the capture so its element box lands on the twin's element box; `clip-path: inset(... round 24px)` grows from the element rect to the frame rect on expo out; twin opacity 1 to 0 over frames 2 to 8 | DOM, cheap; decode the capture once |
| T4 | **Rebuild from real** | Back from a proof when the same object continues | 6 to 8 | The reverse of T3: twin layers set in on the same rects while the capture goes to 0.98 and fades | Cheap |
| T5 | **Slip push** | Surface to surface inside an act (page to PR, PR to page, panel to agent) | 10 to 12 | 3 bands, each `translateX` with expo in and out, staggered by 2 frames with the middle band last; directional blur from `Whip`'s SVG filter, scaled by speed | Like `Whip` |
| T6 | **Zoom-through** | A click on a crafted element opens the next surface (badge to review panel) | 12 (8 in, 4 out) | Wrapper `scale` 1 to 8 around the element's centre (expo in), swap at peak, next shot 0.9 to 1 (expo out). Crafted DOM only, never a bitmap past 1:1 | Cheap; `CameraMotionBlur` with 5 samples on the 4 fastest frames costs 5x there |
| T7 | **Signal handoff** | A change or a status travels to the next surface | 12 to 20 | `@remotion/paths` `evolvePath` for the line and `getPointAtLength` for the pulse; camera x follows the pulse; the next shot's line enters at the same y | Cheap |
| T8 | **Push-cut** | A proof cut in on a word | 6 to 8 | `pushCut()` (a DOM presentation) with `flashColor: '#F2F6F7'`, `flashOpacity: 0.12`, `flashFrames: 2`, `incomingEndScale` kept within the crispness rule | Cheap; run `flashcheck.py` |
| T9 | **Whip** (exists) | Bitbucket to Confluence, Confluence to terminal | 8 to 10 | `Whip` | Cheap |
| T10 | **Exploded collapse** | The 3D review panel folds flat before a proof | 12 to 16 | `ExplodedStack` `explode` 1 to 0 and `yaw` to 0, then T3. No opacity, filter, clip or mask on any `preserve-3d` ancestor (they flatten 3D, as the Pot kit notes) | CSS 3D, cheap |
| T11 | **Snap back** (exists) | V22 only, the film's resolution | 8 | `Slip` with `back`; `snap` SFX at back + 2 | Free |

Not used: crossfades as whole transitions, dips to white or black, cube, flip, book-flip, ripple, film-burn, dreamy-zoom, crosswarp, dissolve. The shader presentations (`blurSlide`, `zoomBlur`, `linearBlur`, `crossZoom`, `swap`, `zoomInOut`, and the rest marked GPU in the package) run through HTML-in-canvas: in Studio they need Chrome 149 or newer with `#canvas-draw-element` on, and at render time WebGL. `tools/render-master.sh` renders the body without `--gl=angle` on purpose, to keep DOM anti-aliasing. Body render cost is driven by decoding the 4K, 60 fps recordings: trim each proof clip to the seconds used before the render.

## 5. Beat by beat, V07 to V23

Frames are absolute film frames from `timeline.json`; word times are in brackets. Proof inserts are numbered R1 to R22, with crops and times in section 6. Twin clicks land 0 to 4 frames before the spoken word; where a real click exists, the twin's cursor only travels and the click itself is the real one.

### A2 · The solution (1057 to 1717): crafted only

**V07 · 1087 to 1244 · "Doc Drift Sentinel anchors each Confluence page to the code and Jira work it describes."** Shot 1057 to 1270.
- Twin: `PageTwin` with the runbook's real text (title; the header table with "Jira PAY-6 Safer payments deploys and rollbacks"; step 2 with `./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT`), left of centre at yaw −8°. On "anchors" [1124] the page separates into its three section bands in Z. On "code" [1183] hairlines draw from the Steps band to `payments-api: scripts/rollback.sh` and `payments-api: deploy/helm/values.yaml`; on "Jira" [1201] from the header band to `PAY-6` (Jira issue), under a small "Anchors" label. On "describes" [1222] the byline gains "Verified · Doc Drift".
- Camera: a lateral track right of 18% of the frame width while the lines draw, then still. Amber: none; everything is still in line.
- In: the existing Day slip cut at 1057, with the twin already composed behind the bands. Out: continuous.
- Proof: none in A2; anchoring is proven by R1 to R4.
- Sound: `tick-soft` as each line lands and `pop` for each chip, both quiet.

**V08 · 1282 to 1396 · "When those change, the page is flagged: Possibly stale."** Shot 1270 to 1410.
- Twin: on "change" [1298] a chip "PR #482 · scripts/rollback.sh → scripts/rollback-v2.sh" docks on the first anchor chip and a pulse runs back along its line. On "flagged" [1336] the Steps band slips one unit right, amber, leaving its trace. On "Possibly" [1364] the amber leaves the band and becomes the byline item "Possibly stale · Doc Drift"; the band stays out of line, now neutral.
- Camera: punch 1.0 to 1.35 (expo out) toward the byline, landing on "Possibly". Amber: the band, then the badge.
- Proof: none (R7 proves it). Sound: `tick` at 1298; `slip` with its latch on 1342.

**V09 · 1417 to 1497 · "And every agent that reads it is told the same."** Shot 1410 to 1530.
- Twin: pull back to 0.9 and track right. Two signal lines (T7) leave the badge for two cards, "Drift Reviewer · Rovo agent" and "Coding agent · MCP"; each prints `"status": "possibly_stale"` in mono on "told" [1474], and on "same" [1485] the two lines snap to one baseline.
- Amber: the badge only; the status text stays in `text`. Proof: none (R11, R12 and V18 prove it).
- Sound: `pop` as each line lands [1462, 1474].

**V10 · 1537 to 1675 · "Anchor. Flag. Tell the agents. Then a person decides."** Shot 1530 to 1717.
- Twin: the spine, one phrase per beat in a single 120 px slot on one of three full-width bands: "Anchor." [1539], "Flag." [1566, its band slips amber], "Tell the agents." [1593], "Then a person decides." [1633]. On the last phrase a cursor arrives and rests on the slipped band without moving it, because the putting back belongs to V22. The phrases then stack for reading, with "For teams who keep runbooks in Confluence" below [1656].
- Camera: locked, a still bar. Out: T5 slip push at 1687 to a fresh runbook twin reading "Unanchored · Doc Drift", placed so its byline sits where R1's real byline will land.
- Sound: `tick` per phrase (the `slip` sound stays reserved for page state changes); `whoosh-short` peaking at 1717.

### P1 · Anchor (1717 to 2077)

**V11 · 1732 to 1929 · "Open any page. Doc Drift reads the paths and Jira keys already on it, and suggests anchors."**
- 1717 to 1747, twin: the cursor goes to the byline; the tooltip twin shows "Not linked to code or Jira. Add anchors.".
- **R1** at 1747 by T3 from the byline item: the real hover tooltip and the real click on the badge (film 1774).
- 1777 to 1897, twin (T4 back from the proof): a scan hairline passes down the page [1788 to 1821]. On "paths" [1821] `scripts/rollback.sh` lifts out of step 2's code, and on "Jira keys" [1840] `PAY-6` lifts out of the header table. Both fly right and dock as the rows of `SuggestionsTwin` on "suggests" [1895]: `PAY-6` Jira issue, checked; `scripts/rollback.sh` Needs a repository, Weak, unchecked.
- **R2** at 1897 by T3 from the suggestion box.
- Camera: a track of 22% of the width with the flying tokens, yaw −6° to 0°. Amber: none in P1.
- Sound: `click` on R1's real click; `tick-soft` per docked row.

**V12 · 1972 to 2037 · "Save, and the page is Verified."**
- 1942 to 1972, twin: "payments-api" types into "Repository for suggested paths" (`type-burst`); row 2 becomes "`scripts/rollback.sh` in payments-api" and ticks; the cursor goes to "Save and mark verified" and clicks on 1972, just before "Save".
- **R3** at 1972 by T8: the real "Saved 2 anchors. This page is Verified." notice.
- 2002 to 2017, twin: the word "Verified" lifts out of the notice and flies into the byline, landing on "Verified" [2016] as the Verified badge.
- **R4** at 2017 by T3 from the badge. Out: T5 slip push to the PR twin, 2047 to 2077.
- Sound: `click` 1972, `chime-soft` 2016, `whoosh-short` peaking at 2077.

### P2 · Flag (2077 to 2617)

**V13 · 2092 to 2214 · "Now a teammate merges a pull request that renames the rollback script."**
- 2077 to 2122, twin: `PrTwin`, a plain card with "Rename rollback script and timeout variable", "#482", `scenario/rename-rollback-script → main`, Open, and two file rows, `deploy/helm/values.yaml +1 −1` and `scripts/rollback.sh → scripts/rollback-v2.sh +3 −3`. The cursor travels to Merge; push 1.0 to 1.06.
- **R5** at 2122 on "merges": the real Merge dialog and confirm click (film 2131), then the real Merged state.
- 2167 to 2182, twin: the rename row grows into a 64 px mono literal; `rollback.sh` slides one unit right and `-v2` drops in, amber. **R6** at 2182 by T2 on the amber literal.
- 2212 to 2287, no voice: the change record ("PR #482 · 2 files") rides a signal line right through two nodes, "Bitbucket relay" and "Doc Drift matcher", toward the page. `MergeTimer` rides above it: "Merge to flag", 0 to 19 s, with "Measured on the demo site, Nov 13".
- Camera: a lateral track of about 1.2 frame widths following the pulse. Amber: the `-v2` literal, then the record that carries it.
- Sound: `click` on the real click, `merge` when Merged shows, `clock-tick` on the beats 2227 to 2272, `whoosh-short` at 2287.

**V14 · 2287 to 2408 · "Seconds later, the runbook is flagged, with the exact change."**
- Twin: the record reaches the runbook twin (Verified) and a pulse enters the Steps band. On "flagged" [2342] the band slips amber and docks as "Possibly stale · Doc Drift"; the tooltip twin opens with "PR #482 changed deploy/helm/values.yaml on Nov 13. Review."; the timer stays pinned at "19 s".
- **R7** at 2347 by T3 from the badge and tooltip. 2392 to 2425: "PR #482" lifts out of the tooltip and carries over into the matcher.
- Sound: `slip` with its latch on 2342; `tick-soft` on the tag.

**V15 · 2437 to 2582 · "No AI made that call. Same change, same result, every time."**
- Twin: `MatcherCard`. The record enters "Deterministic matcher" and three rows tick in, worded from the real why sentence: the anchor `payments-api: scripts/rollback.sh`; "The page mentions ROLLBACK_TIMEOUT and rollback.sh, which PR #482 removed."; "Section "Steps" names it." The output reads "Score 1.00 (threshold 0.5)", then Possibly stale (the amber element). To the left, "No AI made that call." sets [2439 to 2477] and holds still, with a "0 AI calls" chip.
- **R8** (optional) at 2482 by T3 from the score line.
- 2512 to 2542, twin: the record runs twice more and each result lands exactly on the last, with no offset. Small: "Our eval set: 40 scenarios, 0 false flags, 2 known misses".
- **R9** at 2542: the two real outputs side by side, aligned line for line. Out: T9 whip at 2602, peak 2617.
- Sound: `tick` per rule row, `hit-soft` on "call" [2477], `tick-soft` per result row.

### P3 · Agents (2617 to 3277)

**V16 · 2632 to 2739 · "Ask Drift Reviewer, our Rovo agent, how to roll back."**
- Twin: the runbook twin (Possibly stale, the amber badge) on the left; `AgentPanelTwin` slides in from the right (T5) with the header "Drift Reviewer".
- **R10** at 2677 on "our Rovo agent", by T3 from the panel header.
- 2707 to 2752, twin: "How do I roll back payments-api?" types and sends. Sound: `type-burst` at 2712.

**V17 · 2827 to 2980 · "It doesn't repeat the old step. It says the page is Possibly stale, and why."**
- **R11** at 2752: the real thinking steps, ending "Invoking tool: Check page freshness". 2782 to 2827: a signal runs from that step to the twin's badge and back.
- 2827 to 2887, twin: A1's old answer (the step 2 command) ghosts into the answer slot, slips one unit right in amber with its trace, and falls away. The page is off-frame, so this is the shot's one amber element.
- 2887 to 2902, twin: the real answer streams in line by line. **R12** at 2902 by T3 from its first line, then a push to 1.0 on "is Possibly stale." [2925] and on "What it describes changed in PR #482 on 2026-11-13" [2969].
- Out: T9 whip to the terminal at 3007. Sound: `tick-soft` on the tags; quiet `type-key` while the answer streams.

**V18 · 3022 to 3207 · "Coding agents get the same signal over MCP: which pages cover a file, and which to trust."**
- Twin: `TerminalTwin` in Day colours, mono at 40 px, built from real output only. `find-docs-for-path {"repo": "payments-api", "path": "scripts/rollback.sh"}` types [3025]. The pages array streams: the PLAT runbook row in full (`"anchor": "payments-api: scripts/rollback.sh"`, `"match": "exact"`, `"status": "possibly_stale"`, `"citePolicy": "cite_with_caveat"`), the two QA pages collapsed to `{ … }`. On "which pages cover a file" [3125 to 3157] lines fan out from the path to three page cards. Then `check-page-freshness {"pageId": "2720100"}` types [3175] and returns `"status": "possibly_stale"` (the amber element) and the `checkFlaggedV2` guidance in full, which holds still for a bar. Small: "Agents read as you. They never edit a page."
- Proof: the verbatim JSON, tagged "Real output: doc-drift MCP, called as Razvan Statescu, Nov 13". No screen capture of a terminal exists; a 3 s recording of a real agent calling the tool would be a stronger proof if the director wants one.
- Out: 3207 to 3277, "Possibly stale" lifts out of the guidance and drops to the page footer; a whip down at 3277.
- Sound: `type-burst` at 3025 and 3175; `pop` per page card.

### P4 · Review (3277 to 3937)

**V19 · 3292 to 3386 · "The page owner gets one comment, and opens the review."**
- Twin: `CommentTwin` rises into view: "Doc Drift Sentinel", then "@Razvan Statescu PR #482 (merged by Razvan Statescu) changed 2 files this page documents. Review in the Doc Drift badge."; the mention pops on "owner" [3308].
- **R13** at 3322 by T3.
- 3352 to 3427, twin: a whip up to the byline, a cursor click on the badge [3365], then T6 zoom-through into the exploded `ReviewPanelTwin`: header and why sentence, the "Review (2)" and "Anchors (3)" tabs, two What changed cards (High, Medium), Affected section, Quick fix, Proposed fix and the footer, separated in Z at yaw −10°.
- Amber: the badge, then the panel's Possibly stale lozenge. Sound: `pop` 3308, `click` 3365, `whoosh-short` at the zoom peak.

**V20 · 3427 to 3521 · "A rename gets a one-click fix, with no AI."**
- Twin: the camera dollies past the layers to Quick fix, which breaks out (Z +200) and turns flat to camera: "Replace `scripts/rollback.sh` with `scripts/rollback-v2.sh` in 1 place." / "Suggested from PR #482. No AI used. Edits the page as you, with a version message that names the PR." / [Replace in 1 place]. The cursor travels to the button.
- **R14** at 3457 by T8: the real click (film 3466), then the real result line.
- 3487 to 3532, twin: "No AI used." lifts out of the card into big type on "no AI" [3500].
- Sound: `click` on the real click; `tick-soft` on the result.

**V21 · 3562 to 3742 · "For anything bigger, Drift Reviewer drafts the edit. Nothing changes until a person accepts."**
- Twin: Proposed fix comes forward ("Drift Reviewer drafts the change. Nothing changes until you accept it."). The cursor clicks Propose fix [3582]; a signal goes to a small "Drift Reviewer" card, and two draft cards come back [3605 to 3645] and land in the panel as diffs with the real lines.
- **R15** at 3637 by T3 from draft 2.
- 3677 to 3727, twin: an exploded side view in which the drafts hover above the page layer, which still shows `ROLLBACK_TIMEOUT`. The cursor travels to Accept fix ("Accepts 2 drafts in page order.").
- **R16** at 3727 by T8: the real click on Accept fix (film 3738), then "Accepted. A new page version names PR #482."
- Amber: the panel lozenge. Sound: `click` 3582, `pop` per landing draft, `click` on the real click, `tick-soft` on "Accepted."

**V22 · 3757 to 3836 · "Verified. Now the agent can cite it."** (the tail runs to 3937)
- Twin: on the snapBack bar [3757], a T2 cut to the runbook twin with the drafts still hovering and the Steps band still slipped amber. The drafts drop into the page, the band snaps back into line over 8 frames, the glow fades and the byline turns "Verified · Doc Drift".
- **R17** at 3772 by T3 from the badge.
- 3802 to 3847, twin: the terminal prints the real `checkVerified`: `"status": "verified"`, `"citePolicy": "cite"`, `"guidance": "\"Payments rollback runbook\" is Verified. Safe to cite."`, holding still on "Safe to cite.".
- Tail, 3847 to 3937, no voice, the full band in the music: **R18** (page history) at 3847, then **R19** (step 2 as it now reads) at 3877, framed where A1 punched in on the old step 2, so the problem's image comes back fixed. Out: T5 at 3907.
- Sound: `snap` at 3759 with the score's hit; `tick-soft` per proof.

### P5 · Scale (3937 to 4177)

**V23 · 3952 to 4084 · "Jira changes count too. And every space gets a drift dashboard."**
- Twin: `JiraEpicTwin` "PAY-18 · Multi-region active-passive database", To Do, joined by an anchor line to an "ADR-015: Active-passive multi-region database" twin (Verified). On "changes" [3965] the status flips to Done and a pulse runs along the line; on "count" [3977] the ADR's band slips amber and becomes "Possibly stale · Doc Drift".
- **R20** at 3997: a split proof, the Jira strip above the ADR byline and tooltip, joined by a drawn line.
- 4027 to 4057, twin: `DashboardTwin`, "Drift in PLAT" and its lead line; the KPI cards drop flat from a tilt and roll to 18 of 24, 6, 0 and Under 3 hours; the six drift rows follow (ADR-015 "Just now"). Label: "Sample data from the demo space".
- **R21** at 4057 by T3 from the KPI row.
- 4097 to 4132, twin: the ADR's Track in Jira section; the cursor clicks Create Jira task [4105] and "Jira task created" appears with "PAY-24 tracks this change. When the page is up to date, open it and click Mark verified." **R22** at 4132.
- Out: 4162 to 4177, handed to A4's cut into Night on the bar.
- Sound: `tick` on Done, `slip` on the ADR flag (latch 3983), `tick` per KPI on beats, `click` 4105.

## 6. Proof inserts

Crops are `x, y, w, h` in capture px (3840x2160). Scale is film px per capture px, at most 1.0. "Must" means the claim is not shown anywhere else.

| # | Film frames | Line | Capture (`captures.json` id) | In → out (s) | Crop | Scale | Tag | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | 1747–1777 (30) | V11 | `p1-anchor-rec` | 3.97 → 4.97; click at 4.87 = film 1774 | 1440, 300, 1460, 360 | 0.75 | Recorded in Confluence | must |
| R2 | 1897–1942 (45) | V11 | `p1-suggestions` | still | 1170, 656, 1500, 400 | 0.8 | Recorded in Confluence | must |
| R3 | 1972–2002 (30) | V12 | `p1-saved` | still | 1120, 240, 1600, 520 | 0.7 | Recorded in Confluence | nice |
| R4 | 2017–2047 (30) | V12 | `p1-verified-tooltip` | still | 1440, 300, 1460, 360 | 0.75 | Recorded in Confluence | must |
| R5 | 2122–2167 (45) | V13 | `p2-merge-rec` | 4.88 → 5.38 (click 5.18 = film 2131), cut on the 2137 beat to 13.30 → 14.30 | dialog 1320, 120, 1200, 880; then merged 700, 180, 2260, 580 | 0.8; 0.6 | Recorded in Bitbucket: the real merge | must |
| R6 | 2182–2212 (30) | V13 | `p2-pr482-files` | still | 1404, 1090, 1300, 280 | 0.85 | Recorded in Bitbucket | nice |
| R7 | 2347–2392 (45) | V14 | `p2-flagged-tooltip` | still | 1440, 300, 1460, 360 | 0.8 | Recorded in Confluence, 19 s after the merge | must |
| R8 | 2482–2512 (30) | V15 | `p4-panel` | still | 1150, 260, 1550, 260 | 0.85 | Recorded in Confluence | optional |
| R9 | 2542–2587 (45) | V15 | `toolOutput.checkFlagged` and `checkFlaggedV2`, `openDrift` only | verbatim text | both `PR #482` entries; their `at` values (14:46:30Z for the real merge, 16:59:16Z for the demo replay of the same PR) stay visible | — | Real output: doc-drift MCP | nice |
| R10 | 2677–2707 (30) | V16 | `p3-rovo-v2-agent` | still | 2990, 1060, 840, 590 | 0.9 | Recorded in Rovo | must |
| R11 | 2752–2782 (30) | V17 | `p3-rovo-v2-rec` | 24.0 → 25.0 | 2990, 220, 840, 580 | 0.9 | Recorded in Rovo | nice |
| R12 | 2902–2962 (60) | V17 | `p3-rovo-v2-answer` | still | 3020, 236, 800, 640 | 0.95 to 1.0 | Recorded in Rovo | must |
| R13 | 3322–3352 (30) | V19 | `p4-comment` | still | 1500, 1690, 1420, 180 | 0.9 | Recorded in Confluence | must |
| R14 | 3457–3487 (30) | V20 | `p4-review-rec` | 38.00 → 38.50 (click 38.31 = film 3466), cut on the 3472 beat to 41.60 → 42.10 | card 1170, 1330, 1500, 290; then result 1170, 1650, 1500, 260 | 0.85 | Recorded in Confluence | must |
| R15 | 3637–3677 (40) | V21 | `p4-draft-diff` | still | 1170, 1310, 1500, 350 | 0.9 | Recorded in Confluence | must |
| R16 | 3727–3757 (30) | V21 | `p4-accept-rec` | 12.00 → 12.50 (click 12.37 = film 3738), cut on the 3742 beat to 17.60 → 18.10 | footer 1120, 1820, 1600, 170; then notice 1120, 470, 1600, 280 | 0.8 | Recorded in Confluence | must |
| R17 | 3772–3802 (30) | V22 | `p4-verified-tooltip` | still | 1440, 300, 1460, 360 | 0.8 | Recorded in Confluence | must |
| R18 | 3847–3877 (30) | V22 tail | `p4-history` | still | 720, 370, 2240, 376 | 0.6 | Recorded in Confluence: page history | nice |
| R19 | 3877–3907 (30) | V22 tail | `p4-step2-fixed` | still | 1480, 1230, 1520, 250 | 0.9 | Recorded in Confluence | nice |
| R20 | 3997–4027 (30) | V23 | `p5-jira-done` above `p5-adr-tooltip` | stills | Jira 700, 150, 2260, 160; ADR 1440, 300, 1460, 360 | 0.6; 0.65 | Recorded in Jira; Recorded in Confluence | must |
| R21 | 4057–4097 (40) | V23 | `p5-dashboard` | still | 720, 280, 3040, 420 | 0.5 | Recorded in Confluence, sample data from the demo space | must |
| R22 | 4132–4162 (30) | V23 tail | `p5-track-created` | still | 1150, 1610, 1550, 190 | 0.85 | Recorded in Confluence | nice |

| Act | Screen proof frames | Share of the act |
| --- | --- | --- |
| A2 (660 f) | 0 | 0% |
| P1 (360 f) | R1 to R4: 135 | 38% |
| P2 (540 f) | R5 to R8: 150 (plus 45 f of R9 tool output) | 28% |
| P3 (660 f) | R10 to R12: 120 (plus about 180 f of verbatim MCP output) | 18% |
| P4 (660 f) | R13 to R19: 220 (plus 45 f of verbatim MCP output) | 33% |
| P5 (240 f) | R20 to R22: 100 | 42% |
| V07 to V23 (3120 f) | 725 (24.2 s) | **23%**, or 32% with tool output |

Timings were checked frame by frame in the recordings (grids in `video/out/research-v4/r3/`): Merged shows from 13.3 s in `p2-merge-rec`; the tooltip in `p2-flag-rec` shows from 7.2 to 9.5 s (that clip is 8 fps, so use the still); the quick fix result shows from 41.5 s; "Accepted." shows from about 17 s; PAY-18 shows Done from 6 s; Drift Reviewer's tool steps show from 23.5 to 28.5 s and the answer from 29 s.

## 7. Components to build

Reuse from v3: `Shot`, `BrowserFrame` (only for the rare full-screen moment), `Cursor`, `Slip`, `SlipCut`, `Whip`, `Camera`, `Badge`/`BadgeSwap`, `Chip`, `AnchorLines`, `Counter`, `SetIn`, `Terminal`/`AgentTerminal`, `TimerCard`.

| Component | Props that animate | Mirrors (capture) | Real strings it uses |
| --- | --- | --- | --- |
| `PageTwin` | `state`, `bands` (explode into 3), `slip`, `badgeIn`, `tooltip {text, t}`, `step2` before/after, `scan`, `lift {token, t}` | runbook page and byline (`p1-unanchored`, `p2-flagged`, `p4-verified`, `p4-step2-fixed`) | `runbookText`; `stateTitle()`: "Unanchored · Doc Drift", "Verified · Doc Drift", "Possibly stale · Doc Drift"; the four tooltips as captured |
| `AnchorRail` | `draw[]`, `pulse {line, t}`, `change {line, text}` | Anchors table, "Anchor …" lines | "payments-api: scripts/rollback.sh", "payments-api: deploy/helm/values.yaml", "PAY-6", "Jira issue", "Anchors" |
| `SuggestionsTwin` | `typed`, `checked[2]`, `savePress`, `notice` | anchors modal (`p1-suggestions`, `-ticked`, `p1-saved`) | `COPY.suggested` "(2)", `suggestedHelp`, `suggestRepo`, "Needs a repository", `weak`, `saveAnchors`, `unsaved`, `saveHelp`, `anchorsSavedTitle(2)`, `reloadBadge` |
| `PrTwin` (neutral card) | `state` open/merged, `mergePress`, `renameSlip` | `p2-pr482`, `p2-pr482-files`, `p2-merged` | PR title, "#482", branch line, file rows, `ROLLBACK_TIMEOUT` → `ROLLBACK_TIMEOUT_SECS` |
| `SignalLine` and `ChangeRecord` | `d`, `t`, `trail`, `nodes` | relay to core to byline (architecture, not UI) | "PR #482", "2 files", "Bitbucket relay", "Doc Drift matcher" |
| `MergeTimer` | `value` 0 to 19 | `measured.mergeToFlagSeconds` | "Merge to flag", "19 s", "Measured on the demo site, Nov 13" |
| `MatcherCard` | `rows`, `score`, `runs` (stacked, zero offset), `state` | the why sentence in `p4-panel` | why-sentence clauses, "Score 1.00 (threshold 0.5)", "Deterministic matcher · 0 AI calls", the eval line |
| `AgentPanelTwin` (no Rovo marks) | `typed`, `steps`, `answerChars`, `oldStepGhost`, `focus` | `p3-rovo-v2-*` | "Drift Reviewer", its intro, "How do I roll back payments-api?", the three step labels, the v2 answer verbatim |
| `TerminalTwin` | `calls[]`, `typed`, `streamed`, `focusKey` | `toolOutput` (no capture) | `findDocsFlaggedV2` (QA rows collapsed to `{ … }`), `checkFlaggedV2`, `checkVerified`; "Agents read as you. They never edit a page." |
| `CommentTwin` | `appear`, `mentionPop` | `p4-comment` | the comment text verbatim |
| `ReviewPanelTwin` (exploded) | `explode`, `yaw`, `focus`, `quickFix {press, done}`, `drafts {appear, hover, accepted}`, `acceptPress` | `p4-panel`, `p4-affected`, `p4-quickfix-done`, `p4-draft-diff`, `p4-accept-button`, `p4-accepted` | why sentence, `trustLine`, `tabLabel`, `whatChanged`, severity words, `showDiff`, `quickFix`, `quickFixSource` + `quickFixHelp`, `quickFixButton`, `quickFixDoneTitle`, `PROPOSE_FIX_HELP`, draft lines, `fixAttribution`, `acceptAllHelp(2)`, footer buttons, `acceptedTitle` |
| `JiraEpicTwin` (neutral) | `status` | `p5-jira-before`, `p5-jira-done` | "PAY-18", "Multi-region active-passive database", "To Do", "Done" |
| `DashboardTwin` | `counts`, `rows`, `tilt` | `p5-dashboard` | `dashboardTitle`, `dashboardLead`, KPI labels and values, `pagesWithDrift`, `rankedBy`, the 6 rows, "Sample data from the demo space" |
| `TrackInJiraTwin` | `press`, `created` | `p5-track-*` | `jiraTask`, `jiraTaskHelp`, `createJiraTask`, `jiraCreated`, "PAY-24 tracks this change." + `jiraCreatedBody` |
| `ProofFrame` (kit) | `capture`, `crop`, `video {from, to, jumps}`, `scale`, `rect`, `tag`, `drift` | any capture; masks via `Shot` | the tag strings in section 3 |
| `MorphToReal`, `RebuildFromReal`, `SlipPush`, `ExplodedStack`, `KineticDock` (kit) | `at`, `dur`, `fromRect`, `toRect`; layers and `explode`; phrase from rect to slot | — | — |

Each twin gets a test still rendered next to its capture at the same scale (the Pot kit's 1:1 check), so word order and wording can be compared before animation.

## 8. Risks: where a crafted shot could overclaim

1. **The byline is plain text.** The real byline reads "Possibly stale · Doc Drift" with the app icon; the coloured lozenge appears in the modal and on the dashboard, never in the byline. A twin may use our badge, but must carry the same words including "· Doc Drift", and the proof shows the real look within the same line.
2. **The tooltip names values.yaml.** The real tooltip is "PR #482 changed deploy/helm/values.yaml on Nov 13. Review.", because it names the latest event. Never the website mock's "PR #482 changed scripts/rollback.sh 2 minutes ago."
3. **Only two suggestions.** P1 suggested PAY-6 and a Weak `scripts/rollback.sh` that needed a repository, and saved 2 anchors ("Watching 2 anchors"). `deploy/helm/values.yaml` was added by hand off camera before the merge. A2 may show all 3 anchors (true at merge time); P1 must not show values.yaml as suggested.
4. **The Rovo answer.** Use the v2 captures and the v2 answer only (the v1 captures and `checkFlagged`'s guidance are superseded, D38). The answer names PR #482 and "Steps", not the rename. It was asked after the demo replay of the same PR, so its tag must not say "after the merge".
5. **Drafting has a confirmation step.** In the real flow Rovo asks "Confirm selected" before the drafts are stored, and they appear in the panel, not the page. The twin shortens this, but must never show the agent touching the page layer.
6. **Where "No AI" is true.** It is true for detection and for the rename quick fix. Drift Reviewer and Propose fix use AI and Rovo credits, so the "No AI" type leaves the frame before V21 starts.
7. **Timing.** Merge to flag is 19 s (18.6 measured). The owner comment came 24 s after the merge only because "Wait before commenting" was set to 0 for the shoot (the demo site normally uses 10 minutes), so V19 shows no timer. The Jira flag took 9 s; show no number for it.
8. **Sample data.** The dashboard numbers (18 of 24, 6 Possibly stale) are from the demo space at capture time and always carry the label; counters roll to the real values and stop there.
9. **Names and invented data.** On screen the merger and commenter are Razvan Statescu, which decision 6 accepts. Twins never use the website's invented Sam, Dana-as-user, PAY-142 or PAY-201, and never show the "DDS test" QA page titles.
10. **Look-alikes and the rules.** Bitbucket, Jira and Rovo twins carry no product marks and no Atlassian blue; only proofs show the real products. Log D39 (section 1) so that crafted product shots are a recorded choice, with every claim still shown in real footage.
11. **Production risks.** Text in tilted CSS 3D goes soft: read text flat or within 6°. Opacity or filters on a `preserve-3d` ancestor flatten the 3D. CameraMotionBlur shifts flat colours. Some masks fall under a modal (in `p1-saved` the byline mask sits at 2578 to 2754, 465 to 502, inside the modal's crop area): check that each cover is invisible on the frame used. With 22 short inserts, run `flashcheck.py`, and run the reading-time formula on every twin sentence.
