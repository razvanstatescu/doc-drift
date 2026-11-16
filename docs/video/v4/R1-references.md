# R1: what makes Satchel and Pot look premium, measured against v3

Research for the v4 redesign of the launch film (light Day theme, far fewer raw Confluence screens). Written 2026-11-16.
Inputs: `video/out/doc-drift-v3.mp4` (2:35, 30 fps), Satchel `satchel-2-v6.mp4` (2:18, 30 fps), Pot `PotDemo.mp4`
(1:22, 60 fps), and the three projects' docs and motion code. Nothing was rendered.

| Short | Absolute path |
| --- | --- |
| `POT/` | `/Users/razvanstatescu/Documents/Work/near/Pot/marketing/video/src/` |
| `SAT/` | `/Users/razvanstatescu/Documents/Work/near/Satchel/marketing/video/src2/` |
| `V3/` | `/Users/razvanstatescu/Documents/Work/doc-drift/video/src/` |
| `R1/` | `/Users/razvanstatescu/Documents/Work/doc-drift/video/out/research-v4/r1/` (contact sheets, strips, data, `scripts/`) |

## 0. Findings in brief

1. **v3 stands still half the time.** 38 frozen holds of 1 s or more add up to 78.4 s, 50.5% of the film. Satchel: 6
   holds, 9.6 s (7%). Pot: none. Frames with visible change: v3 25%, Satchel 81%, Pot 98%. This is the largest gap we
   measured. It comes from two v3 rules applied to the whole frame instead of only to the type: text "holds perfectly
   still while read" and camera moves end "then still" (`video/BRIEF.md` §7, `V3/motion/camera.tsx`).
2. **The cut rate is not the problem.** v3's body has more hard cuts per minute (7.2) than Satchel (3.7) or Pot (4.4).
   The references use more moving transitions instead (7.4 and 9.5 per minute, v3 5.5) and keep moving between them.
3. **Emptiness is not the problem either.** v3 covers more of the frame with content (22.6% non-ground pixels) than
   Satchel (16.1%) or Pot (11.6%). Adding objects will not fix v3; moving fewer objects well will.
4. **Neither reference shows a raw screen capture after its cold open.** Both rebuild their product UI as frame-driven
   components with the real copy (Pot checked its screens against captures to about 1 px). v3 spends about 44% of its
   running time on browser-framed captures whose body text is 18–22 px.
5. **The references show consequences outside the UI, at hero size**: cards lift out of the screen, the card leaps out
   of the phone, numbers roll at 200 px. In v3 every state change happens inside small real UI; the payoff at 2:05.2
   (Possibly stale to Verified) is a 1-frame text swap.
6. **Headline sizes are similar** (110–160 px in all three). The references set them at weight 800 with tight tracking,
   next to the product, word by word on the voice. v3 sets 600-weight statements alone on empty ground: they read as
   slides.
7. **v3 loses its brand colour.** Beacon amber is visible in 13% of v3's seconds after the cold open and in 2 of the 82
   seconds of the product act, because real Confluence renders our badge as a pale tint (about `#F8E0A8`). Satchel's
   coral shows in 61% of its seconds after the cold open, Pot's marigold in 67% after its reveal: one accent per frame,
   but in most frames.
8. **Pot's kit is the most reusable for a calm, light brand** (camera rig, blur grammar, whips, kinetic type, highlight
   block, number rolls, breakouts). It is built for 60 fps. Satchel's kit is 30 fps, but its look (ink outlines, hard
   shadows, squash, swinging charms) belongs to Satchel; a few pieces port cleanly.

## 1. Method

- **Motion.** Each film decoded at 30 fps (Pot resampled from 60), 480×270 grey. Per frame: the share of pixels whose
  value changed by more than 6 levels. A frame "moves" when 0.2% or more of the picture changed (about 260 px; a single
  changing digit stays below it). A **frozen hold** is 30 or more consecutive non-moving frames. A strict re-run at 12
  levels keeps the ranking (v3 22.7%, Satchel 74.1%, Pot 82.1%).
- **Cuts.** ffmpeg scene score per frame, cuts at 0.2 (as asked) and 0.12. Designed seams (whips, floods, morphs) often
  do not register, so "shots" means hard cuts only. **Transition events**: clusters of frames where 25% or more of the
  picture changes; 1–2 frames = hard cut, 3 or more = moving transition.
- **Frame fill**: pixels that differ from the frame's dominant colour (1-fps frames). **Brand accent**: 1-fps frames with
  0.05% or more of pixels near the accent (beacon `#FFB224`, coral `#FF5C4D`, marigold `#FFB320`). **Type**: line
  heights on full-resolution frames plus each project's tokens.
- **Layers, picture-type shares, camera**: estimates from the 1-fps sheets and 10/30-fps strips (`R1/*-sheet-1fps-*.jpg`,
  `R1/strip10-*.jpg`, `R1/strip30-*.jpg`, `R1/craft-compare.jpg`). Raw data: `R1/summary.json`, `acts.json`,
  `events.json`, `fill.json`, `body-shots.json`, `*-motion.json`; scripts in `R1/scripts/` (path constants point at this
  session's scratchpad; edit before re-running).

## 2. Measured comparison

"Body" = the film after its cold open (v3 from 0:13.2, Satchel from 0:08.7, Pot whole film).

| Measure | v3 | Satchel v6 | Pot |
| --- | --- | --- | --- |
| Length | 2:35, 30 fps | 2:18, 30 fps | 1:22, 60 fps |
| Shots at scene score 0.2 (whole film) | 15, mean 10.4 s | 15, mean 9.2 s | 7, mean 11.7 s |
| Shots at 0.12 (whole film) | 31, mean 5.0 s, median 3.0 s | 33, mean 4.2 s, median 1.5 s | 12, mean 6.8 s, median 2.6 s |
| Shots at 0.12 (body) | 24, mean 5.9 s, median 4.0 s | 17, mean 7.6 s, median 6.4 s | 12, mean 6.8 s |
| Frames that move | **25.5%** | 80.8% | 98.1% |
| Seconds that are fully frozen | **41.0%** | 4.3% | 0% |
| Frozen holds of 1 s or more | **38 holds, 78.4 s (50.5%)** | 6 holds, 9.6 s (7%) | 0 |
| Longest frozen hold | 4.5 s (0:38.8) | 3.0 s (0:30.3) | 0.8 s |
| Mean frame difference (0–255) | 1.05 | 3.23 | 3.04 |
| Moving transitions per minute (body) | 5.5 | 7.4 | 9.5 |
| Hard cuts per minute (body) | **7.2** | 3.7 | 4.4 |
| Camera | Punch-ins and pans on captures, expo out, zoom interpolated linearly, then still. No drift | Locked flat camera; 1 punch-in, board pans with speed lines; objects carry the motion; 1 flip, 1 blind, 2 frame peels | Never still: noise drift 8 px and ±0.4°, 4–8% creep per scene, 1.25–1.5× pushes, 1-frame reveal snaps, blur whips, 1→6× dolly into the dots, 3D-tilted phone, isometric x-ray |
| Layers per frame (inspection) | 2–3: ground, one card or capture, type | 4–6: ground, caption, hero card, charms, hands, chips, sparkles | 4–6: ground or bubble wall, 3D phone, breakout card, big type, highlight block, sticker or particles |
| Headline type | Spline Sans 600, 120 px, −2.5%; lines measure 95–121 px | Funnel Display 800, 110–160 px, −3.5%; 120–138 px | Gabarito 800, 110–160 px, −2.5%; 95–119 px |
| Seconds with the brand accent visible (after the opening) | **13%** beacon (2 of 82 s in the product act) | 61% coral | 67% marigold (none before the reveal, by design) |
| Text that carries meaning | Real UI at 18–22 px in wide shots (30–50 px punched in) | UI text is never must-read; a caption repeats the fact | Must-read ≥ 28 px; big type repeats the key line |
| Frame fill (non-ground pixels) | 22.6% | 16.1% | 11.6% |
| Running time by picture type (estimate) | Raw captures ~44%, our mocks and diagrams ~34%, type-only cards ~11%, logo ~8%, plates 4%, illustration 0 | Raw captures 0 after the cold open (plates 6%), rebuilt UI ~29%, illustration with captions ~60%, end card 5% | Raw captures 0, rebuilt app UI and built chat mocks ~71%, diagram ~16%, logo and end ~12% |
| Bitrate (rough proxy; CRF 16 for v3 and Pot, Satchel 16–18, unsure) | 0.86 Mb/s | 3.63 Mb/s | 16.3 Mb/s (60 fps, grain) |

## 3. Act by act

| Role | v3 | Satchel | Pot |
| --- | --- | --- | --- |
| Opening | A0 0:00–0:13 (barrage built on Satchel's H0, then the reveal): 60% moving; lockup frozen 2.8 s at 0:10.4 | H0 0:00–0:09: 74%; then the card slams in and the whole idea plays in 3 s (0:08.5–0:11) | Frame 0 is mid-avalanche; reveal snap back to a wall of bubbles at 0:00.4 |
| Problem | A1 0:13–0:35, Night mocks: **15%** moving; 7 frozen holds, 15.9 s | C1 1:05–1:17, the catch: 94%; the blind falls, characters react | Act 1 0:00–0:18: 100%; chat avalanche, money roll, strike-through cards, "Leo is typing…" |
| Idea | A2 0:35–0:57, band diagram and list: **23%**; 5 holds, 11.3 s | H1–P6 0:09–1:05: 78%; slaps, hand-offs, phone plus card | Act 2 0:18–0:24: 87%; dot floods, logo lid lands, marigold contracts into the phone |
| Product | P1–P5 0:57–2:19, real captures: **24%**; 21 holds, 38.4 s | T0–T7 1:17–2:12: 80%; records draw, scan beam, stamps, rebuilt browser | Act 3 0:24–1:04.5: 99.5%; 3D phone, type zone, breakouts, whips between two phones |
| How it works | A type card inside P2 (1:21–1:27) | T1–T3 1:17–1:35: records and the contract plaque | Act 4 1:04.5–1:18: 98% (72% strict, grain); x-ray stack with a pulse |
| Close | A4 2:19–2:35: 22%; 4 holds, 9.8 s; fades to black | E1 2:12–2:18: 96%; lockup, caption stickers | Act 5 1:18–1:22: 92%; 1–2% creep, no fade |

v3 drops from 60% in the cold open to 15–24% in every later act. Both references stay between 74% and 100% in every act.

## 4. Techniques Satchel and Pot have and v3 does not

Reuse: **as-is** (copy, swap tokens), **adapt** (port the idea or the math), **no** (brand-specific).

**T1. No dead frames: the world drifts, the type stays.** Pot's camera never stops (noise drift plus a 4–8% push per
scene) while its big type sits still in screen space. Satchel keeps captions still while the charms blink, sway, peek.
- Where: Pot whole film (longest frozen run 0.8 s), e.g. Act 3 0:24–1:04; Satchel 1:45–1:53.
- Built: `POT/motion/camera.tsx` `driftAt`, `cameraAt(…, { creep })`, `useCamera`; `POT/scenes/shared/world.tsx` `TypeZone`.
- As-is (pass fps 30). For us: still type over a page world that creeps 1–2% per second with 4–6 px drift.

**T2. One world, many stations.** All product beats live in one 3D space; the camera whips between stations, so scene
changes read as camera moves, not cuts.
- Where: Pot 0:30–1:04 (Maya's and Leo's phones 1.2 frame-widths apart; whips at about 0:31 and 0:36.8).
- Built: `POT/scenes/shared/world.tsx` `WorldStage`, `WorldPhone`, `CAM`, `PHONE_HOME`; `POT/scenes/shared/handoffs.ts`.
- Adapt (phone becomes page). For us: PR card, runbook page, Rovo answer and terminal as four stations on one Paper plane.

**T3. The product as a physical object.** Tilted 8–12°, entering in six held poses, with side thickness and a soft
contact shadow.
- Where: Pot 0:23.9–0:25 (entry), all of Act 3 (rest pose rotX 8°, rotY −12°).
- Built: `POT/motion/camera.tsx` `Stage3D`, `Camera`, `Layer`, `Slab`, `heldEntryPose`, `ContactShadow`; `POT/ui/Phone.tsx`.
- Adapt (body tokens, shadow colour to Fathom). For us: the runbook as a tilted page sheet with 6–10 px thickness,
  replacing the flat browser frame.

**T4. Breakouts: the consequence leaves the UI.** A twin of a UI card lifts toward the camera (z 240, ×1.6), its shadow
growing, holds while read, then returns.
- Where: Pot 0:43.4 ("Approved by Pot rules"), 1:00–1:02 (refund table); Satchel 0:21.9–0:22.4, the card leaps out of
  the phone (concepts-v2 §4.1: "the consequences happen outside the phone").
- Built: `POT/motion/camera.tsx` `BreakOut`, `breakoutLifted`; `POT/scenes/act3/c-lib/LiftTwin.tsx`; `POT/motion/color.ts` `depthShadow`.
- As-is. For us: lift the byline badge, the rename quick fix and the MCP `guidance` line out of the page at 2–3×.

**T5. Big kinetic type beside the product, in an 800 weight.** The narrated line at 110–160 px, −2.5 to −3.5%; whole
words rise 32–76 px out of a vertical smear into fixed slots, landing 0–4 frames before the spoken word.
- Where: Pot 0:26–0:28 (rules), 0:35.0–0:36.7 ("No wallet. No seed phrase. No gas."), 0:37.6–0:39; Satchel captions on
  every shot (0:43, 1:35). Compare v3 1:24.5 with Satchel 1:38 and Pot 0:38.6 in `R1/craft-compare.jpg`.
- Built: `POT/motion/text/KineticText.tsx` `WordRise`, `ScalePunch`, `wordsFromSeconds`, `voLanding`;
  `POT/scenes/act3/c-lib/BigLine.tsx`; `SAT/motion/script.tsx` `CaptionSlap`; `SAT/motion/type.tsx` `LineRise`.
- Adapt: Spline Sans stops at 700 (`V3/brand/fonts.ts`); feed word times from `video/src/data/timeline.json`. For us:
  2–5 words per beat beside the page ("Possibly stale.", "19 seconds.", "0 AI calls.") instead of separate cards.

**T6. One highlight device per line.** A solid block wipes left to right behind one word in 10–12 frames, once the line
is readable.
- Where: Pot 0:02.2 ("money problem"), 0:35–0:36 ("No" ×3), 0:47.9 ("one OK"); Satchel `Marker` (lemon swash).
- Built: `POT/motion/text/marks.tsx` `HighlightBar`, `StrikeThrough`; `SAT/motion/type.tsx` `Marker`.
- As-is. For us: the beacon block behind "Possibly stale" is the frame's one amber; `StrikeThrough` crosses out
  `scripts/rollback.sh`.

**T7. One blur grammar: directional smear.** Fast moves get an axis-only blur of about 0.5 × px per frame, decaying ×0.7
per frame; arriving words start smeared. No defocus blur anywhere.
- Where: Pot 0:36.8–0:37.3, 0:49.4–0:50.3, every word arrival; Satchel stretches instead (bible §2.12).
- Built: `POT/motion/effects/blur.tsx` `DirectionalBlur`, `smearSigma`, `smearDecay`; `SAT/motion/motion.ts` `smear`.
- As-is. For us: every whip and every flying chip gets 2–6 frames of smear; v3's moves have none.

**T8. Blur-matched whip as the default seam.** A accelerates out with its smear rising, the cut lands at peak speed, B
continues the vector and clears.
- Where: Pot 0:36.8–0:37.4, 0:49.2–0:50.4.
- Built: `POT/motion/transitions/presentations.tsx` `whipPan`, `whipSlide`; `POT/motion/transitions/wrappers.tsx` `hyper`, `Swap`.
- As-is (halve the 60-fps frame counts). For us: PR → page → agent → terminal, replacing most hard cuts.

**T9. A carried object across the seam.** One object travels through the cut so the eye never resets.
- Where: Pot 0:17.5–0:18.4 (a typing dot becomes the flood and the logo's dots), 0:36.9 ("+ $150" chip); Satchel
  0:10–0:11 and 2:05–2:08 (the card passed between hands).
- Built: `POT/scenes/act3/c-lib/Flyer.tsx`, `POT/motion/dots.tsx` `TypingDots`; `SAT/motion/HandOff.tsx` (no: its
  pendulum is Satchel's personality).
- Adapt. For us: the amber band leaves the diff as `rollback-v2.sh`, lands as the page's slipped section, then becomes
  the badge the agents receive.

**T10. An effect becomes the next ground.** A shape floods the frame, then contracts into the next object.
- Where: Pot 0:18.0 (flood), 0:23.3–0:23.9 (marigold contracts into the phone screen).
- Built: `POT/motion/transitions/presentations.tsx` `flood`, `colorFlood`; `POT/scenes/act2/MarigoldToPhone.tsx` `phoneInset`.
- As-is. For us: after the reveal, the mark's band widens to fill the frame and contracts into the runbook page.

**T11. A signature transition, rationed and slow enough to read.** Satchel's frame peel (22 frames) twice, the Night
blind once, the flip once, each on a story turn.
- Where: Satchel 0:20.5–0:20.8 and about 2:11–2:12 (peels), 1:04.8–1:05.3 (blind), 1:18.2–1:18.5 (flip).
- Built: `SAT/motion/transitions.tsx` `peelOff`; `SAT/motion/Sticker.tsx` `peelGeometry`; `SAT/motion/script.tsx` `NightBlind`, `FlipCard`.
- No (sticker look); our equivalent is `V3/motion/slip.tsx` `SlipCut`. For us: run the slip cut over 12–18 frames with
  a visible trace, 2–3 times (v3's lasts 6 frames, 0:35.2–0:35.4).

**T12. Camera grammar.** Zoom in log space with the look-at point pre-multiplied (no swimming); push size by duration
(1.25/1.4/1.5×); reveals as a 1-frame scale jump plus a tail; zoom-through into the next subject.
- Where: Pot 0:00.4 (snap back), 0:17.0–0:18.0 (dolly into the dots), 0:43.1 (0.7 snap toward the dots).
- Built: `POT/motion/camera.tsx` `interpolateCamera`, `pushKeys`, `pushRatio`, `revealSnapKeys`; `presentations.tsx` `zoomThrough`, `scaleCut`.
- As-is (`V3/motion/camera.tsx` lerps zoom linearly, then holds). For us: zoom through the slipped band into the diff;
  snap back from the badge to the page.

**T13. Hero number rolls.** Numbers that matter roll at hero size through about 20 decaying steps, tabular, landing exactly.
- Where: Pot 0:03–0:04 ($1,236.00), 0:44 ($450 to $366.12), 1:02 ($22.00); Satchel 0:27–0:30 (fill amounts).
- Built: `POT/motion/numbers.tsx` `MoneyRoll` (tick, roll, count), `CountUp`; `SAT/motion/type.tsx` `Counter`.
- Adapt (formatter). For us: "Merge to flag: 19 s" at 220 px or more (v3 1:11–1:18: a ~60 px corner chip); "40
  scenarios · 0 false flags".

**T14. State-driven rebuilt UI.** Screens rebuilt as components whose props are the story state, with the real copy:
any state can animate, at any scale, crisp.
- Where: Satchel 1:45–2:03 (sale page: rows check, stamps land, Buy lights), 0:20–0:41 (phone screens); Pot 0:24–1:04.
- Built: `SAT/components/ui/SalePage.tsx` (`verdict`, `records`, `buy`, `scan`), `SAT/components/ui/kit.tsx`;
  `POT/ui/screens/*`, `POT/ui/sheets/*`, `POT/ui/atoms/*`.
- Adapt (the pattern). For us: rebuild our own surfaces (badge, review panel, Anchors tab, dashboard tiles, Rovo
  answer, MCP terminal) from `video/src/data/captures.json`; keep short real-footage inserts (§8).

**T15. Status pill swap and presses.** The pill's width springs between labels while the old word rolls out and the new
rolls in; buttons dip into their shadow with a touch dot.
- Where: Satchel 1:42–1:44 ("Paused for sale"), 0:35–0:36 (Send press); Pot 0:39 (keypad), 0:41.7.
- Built: `SAT/motion/ui.tsx` `PillSwap`, `pressAt`, `PrimaryButton`; `POT/motion/effects/press.tsx` `pressAt`, `TouchDot`.
- As-is. For us: Unanchored → Verified → Possibly stale → Verified as pill swaps at 2–3×, not the 1-frame swap at 2:05.2.

**T16. A check sweep with per-row results.** A beam passes a list; rows resolve one by one; the verdict waits.
- Where: Satchel 1:46–1:52 (three records, three stamps); Pot 0:42–0:43.4 ("Checking Pot rules…" then Approved).
- Built: `SAT/illustration/props/ScanBeam.tsx`; `SAT/motion/script.tsx` `RecordOutline` (its stamps: no).
- Adapt. For us: the matcher as a beam over the anchor list; `scripts/rollback.sh` resolves "renamed in PR #482" and
  slips, the others resolve unchanged.

**T17. An exploded-layer explainer with a travelling pulse.** The product turns to line art, goes isometric and
separates into labelled slabs; a pulse lights each layer as it is named.
- Where: Pot 1:04–1:14.
- Built: `POT/scenes/act4/xray.tsx` `XrayScene`, `xrayStackPose`; `xray-math.ts`; `s12-plates.tsx` `Plate`, `plateZ`, `PULSE_LOCAL`.
- Adapt (scene code, reusable math). For us: merge → signed change record → web trigger → deterministic matcher →
  byline → Rovo and MCP, with a PR #482 pulse; it shows "no AI in the hot path" instead of stating it on a card.

**T18. Depth layers and rationed delight.** 4–6 layers per frame with shadows that grow with height; 1–4 delight
moments per film.
- Where: Pot 0:43.5 (12-particle burst); Satchel 0:22.4–0:23 (sparkles), 2:15–2:16.
- Built: `POT/motion/color.ts` `depthShadow` (the same two-layer recipe as our `shadow-raise`); `POT/motion/effects/Burst.tsx`;
  `SAT/motion/fx.tsx` `SparkBurst`.
- As-is (`depthShadow`); adapt Burst (never amber: amber means drift). For us: a faint wall of pages at 0.5× parallax,
  lifted cards with `depthShadow`, at most one quiet green burst at Verified.

## 5. What looks cheap in v3

1. **Frozen frames everywhere** (50.5% of the film). Longest: 0:38.8 (4.5 s, A2 diagram), 2:30.6 (4.2 s, end card),
   1:45.3 (3.8 s, MCP terminal), 0:13.7 (3.4 s, 03:07 alert), 0:22.0 (3.2 s), 1:19.1 (3.1 s). A still frame under a
   voice reads as a slideshow.
2. **0:09.2: the mark's slip takes about 2 frames.** The signature move is over before it registers.
3. **0:10.4–0:13.2 and 2:30.6–2:34.8: lockup and end card dead still**, then a fade to black. Pot's critic called the
   same thing "dead air" (`Pot/marketing/video/brief/review-1.md` P1-3) and fixed it with 1–2% creep.
4. **0:35.2–0:35.4: the Day slip cut, the film's change of light, is 6 frames** of shuffled bands with no build-up, then
   a still page. Pot pushes into its dot for about 1 s before its flood (0:17.0–0:18.0).
5. **0:35.5–0:50: the A2 diagram.** The page's bands are three solid dark rectangles that read as placeholders or
   redactions (my reading); chips at about 22 px; one plane in the left half; the slip (0:44.5) is a 530 × 113 px bar,
   3% of the frame, in a diagram that holds still around it.
6. **0:27.6–0:30.3, 0:51–0:57, 1:21–1:27: statement cards.** Type alone on flat ground at weight 600; the 1:21 card holds
   about 5 s while small sub-lines set in word by word.
7. **0:57–2:18: browser-framed captures, about 44% of the film**, with an 11 px "Confluence"/"Bitbucket" label on top and
   body text at 18–22 px in wide shots (1:05, 1:52, 2:13). It reads as a screen recording.
8. **1:10.2–1:10.6: a pan across Bitbucket's empty page** and its default "configure a build tool" illustration.
9. **1:11–1:18: the best number (merge to flag, 19 s) is a ~60 px corner chip** over a static page.
10. **1:40–1:48: the MCP terminal** is a static dark panel with 25 px JSON and a dim highlight row.
11. **2:05.23: the payoff is a 1-frame text swap** (Possibly stale to Verified) in a real byline; the glow vanishes in 1
    frame; no snap-back move is visible at that scale.
12. **2:08–2:18: five real screens at 1–2 s each** with 20 px text: unreadable and generic.
13. **0:57–2:19: the brand colour disappears.** Beacon amber shows in 2 of the product act's 82 seconds; the real
    Possibly stale badge is a pale tint (about `#F8E0A8`, 1:18.5, 1:52.5), so the product half looks like Atlassian's
    UI, not ours.
14. **Throughout: one flat plane, faint shadows, no parallax, no foreground layer, no motion blur**; zoom is linear and
    stops dead.
15. **Throughout: more hard cuts than moving transitions in the body** (7.2 against 5.5 per minute); the references are
    the other way round.

## 6. Top 8 changes for v4, ranked

1. **The frame never freezes.** No frozen run longer than 12 frames; the world creeps 1–2% per second with 4–6 px drift;
   type sits in screen space and stays still. Target: 75% or more frames moving (v3 25%), under 5 s of frozen holds
   (v3 78 s). Impact: very high; the largest measured gap, and the fix is mechanical (T1).
2. **One Paper world with stations and a 3D page, instead of browser-framed captures.** Rebuild our own surfaces as
   state-driven components with the copy from `captures.json`; real footage stays as 2–4 short proof inserts mapped onto
   the 3D page. Impact: very high; removes the screen-recording read (T2, T3, T14).
3. **Every state change happens big and outside the UI, in full beacon amber.** Breakouts and pill swaps for Verified,
   Possibly stale and the snap back; the slipped band as the carried object. Target: the one amber in at least half of
   the seconds after the opening (v3 13%, Satchel 61%, Pot 67%). Impact: high; the three key moments become the best
   shots and the brand colour returns (T4, T9, T15).
4. **A type zone instead of statement cards.** Spline Sans 700 at 120–160 px, words rising from a smear on the voice, the
   amber highlight block as the one amber. Impact: high; works muted and removes the slides (T5, T6).
5. **One transition system.** Blur whips between stations by default, carried-object match cuts, the slip cut as the
   rationed signature (12–18 frames, 2–3 uses), the flood from the mark into the page. Target: at least 2 moving
   transitions per hard cut. Impact: medium-high (T7–T11).
6. **Pot's camera grammar.** Log-space zoom, pushes sized by duration, reveal snaps, zoom-through; drop "then still".
   Impact: medium; supports 1 and 5 (T12).
7. **Show the claims instead of carding them.** "19 s" as a 220 px roll, the eval counts, the matcher sweep over the
   anchor list, the pipeline as an exploded stack with a PR #482 pulse. Impact: medium; the technical story becomes
   visible to judges (T13, T16, T17).
8. **Depth and a quiet background layer.** 4–5 layers per frame: a page wall at 0.5× parallax, the page, lifted cards
   with `depthShadow`, type, one accent. Impact: medium (T18).

## 7. Porting notes

- **Pot's kit is 60 fps.** `POT/motion/time.ts` sets `FPS = 60`; durations, `TRANSITION_FRAMES`, `UI_FRAMES`,
  `BREAKOUT_RETURN_FRAMES` (20) and the smear's per-frame decay assume it. Springs take `fps`, so pass 30 and halve the
  frame constants (or express them in seconds).
- **Brand coupling.** Pot's kit imports `../brand/tokens` (`day`, `night`) and `../brand/fonts` (`DISPLAY`). A shim maps
  ink and on-brand to Fathom `#072630`, brand to beacon `#FFB224`, ground to Paper `#F2F6F7`, `EGGPLANT` to Fathom,
  `DISPLAY` to Spline Sans.
- **Packages.** `video/package.json` already has `@remotion/noise`, `paths`, `shapes`, `transitions`, `layout-utils` and
  `motion-blur` at 4.0.543; Pot and Satchel use 4.0.537. Not typechecked here (unsure about small API changes).
  `lucide-react` is not installed; v3 has its own icons (`V3/brand/icons.tsx`).
- **3D traps** (Pot's camera header): `opacity`, `filter`, `clip-path`, masks and `overflow` flatten `preserve-3d`, so
  breakout cards are siblings of the page, never children of a clipped screen. `Slab` costs about 10 ms per layer per
  frame. Pot rendered with `--gl=angle`.
- **Satchel's kit** is 30 fps like ours, but most of it is Satchel's look. Port `PillSwap`, `pressAt`, `RecordOutline`,
  `ScanBeam`, `PushIn`, `Parallax2D`; leave the rest.
- **Keep from v3:** `V3/lib/timeline.ts` (voice-driven cues), `V3/motion/slip.tsx` (retimed), `V3/brand/Mark.tsx`,
  `V3/brand/Badge.tsx`, the audio pipeline, and the cold-open barrage if the film keeps one.

## 8. Open questions and uncertainties

1. **How much rebuilt UI do the rules allow?** The rules ask for "footage that shows the Project functioning", and
   `docs/video/research.md` §2 concluded that the how-it-works act must be real recordings. Pot rebuilt its UI for a
   different hackathon. Suggested split: real footage for anchor, merge to flag, the Rovo answer and accept fix (short,
   on the 3D page, key region broken out); rebuilt components for the explanation. Needs Razvan's call.
2. **Change 1 contradicts `video/BRIEF.md` §7** ("everything on a grid and still"). If v4 adopts it, it needs an entry
   in `docs/decisions.md` (not edited here).
3. Satchel's motion score owes a lot to its charms' idle motion. A mascot does not fit our calm voice; the page wall
   and camera creep are proposed instead. Whether they alone reach 75% moving is untested.
4. Smaller caveats: Pot's Night acts are inflated by grain at the loose threshold (Act 4: 98% loose, 72% strict);
   picture-type shares and layer counts are estimates; "my reading" items in §5 are judgment; Satchel's CRF is unknown.
