# Kit status

**v5 round 2 ready** (2026-11-17, video/V5.md section 8): J-cuts at film level (`LEADS`, `withLead`), `LiftOut`, a
rewind that reads as one, RealTake without the veil, the paint guard on real captures, the honest clock's new label,
and Verified never amber. Every prop still works (two defaults changed: `speed` off, RewindFrom's sine curve).

**v5 ready** (2026-11-17, video/V5.md, D41): the kit serves v5, and every v4 prop still works. All of R6's lab pieces are
promoted into the kit (RealTake, PageOverCode, EditType, carry cuts, RewindFrom), plus the v5 scene cuts and
`tools/qa/rhythm.py`. Import from `src/v4/kit`; do not import from `src/v5/lab`.

## v5 round 2: what changed

Stills and renders are in `out/v5/kit/` (`liftout-*.png`, `liftout.mp4`, `rewind-film.mp4`, `rewind-film-strip.png`).
The paint guard's warnings show in `remotion render` logs (not in `remotion still`); `KitPaintChecks` in the kit's dev
entry triggers both.

| Item | What changed | What you may need to touch |
| --- | --- | --- |
| 1 J-cuts | `LEADS` in `src/transitions.ts`, keyed by the INCOMING scene: `{ id, at, gainDb }[]`, where `at` is the effect's PEAK relative to the boundary. Its onset (`leadOnset(s)` = `at - peakFrame`) should be 4 to 10 frames before the boundary; Main plays leads at film level (a scene's own Sequence would clip them) and warns otherwise. Defaults (onset): PROMISE `slip-alt1` at 0 (-9), LOOP `whoosh-short` at -2 (-6), AGENTS `swish-up` at 4 (-6), FIX `swish-up` at 4 (-6), JIRA `tick-soft` at -6 (-6, under FIX's ring), CLOSE `swish-up` at 4 (-6). Checked in the film: LOOP's lead rises from f894 and peaks on f898. | **Set your own in your own file**: `export default withLead(MyScene, [{ id: "swish-up", at: 4, gainDb: -2 }])` in your scene's `index.tsx`; `withLead(MyScene, [])` turns the default off. A scene's own lead wins over `LEADS`. **Delete the in-scene copy** where the default is your first sound, or the film plays both: PROMISE `slip-alt1` at 0, AGENTS `swish-up` at `T.open + 6`. LOOP: the default is your `whoosh-short` moved to lead; keep yours at `rewindAt + 20` only if you want a second one. |
| 2 `LiftOut` | New (`liftout.tsx`). A crafted copy of the real byline item (the twins' `BylineItem`: "Possibly stale · Doc Drift", its slip, trace, glow and bloom) starts exactly on the real label's screen rect and flies, with a small arc, to a big place beside it. The amber is on the copy only; its white card fades in only once it has left the label, so nothing is drawn over the capture. Props: `from` (the real label's SCREEN rect: `capRectToScreen(pose, ITEM)`), `at`, `dur` (18, expo out), `to` (`{ x, y }`, the big label's top left), `size` (100: type px), `state` ("possibly_stale"; "verified" never lights), `card` (true), `out?` (drops back and fades in 8 frames), `arc` (40). The big label is about 15.6 times `size` wide (1,560 px at 100): the demo uses 76 at (600, 831). Demo: Kit4 975 to 1094. | FIX and JIRA: put the amber on `LiftOut` instead of on the capture (LOOP already does). |
| 3 Rewind | `RewindFrom` uses a sine in-out curve by default (new `ease` prop; it was expo in-out, which crossed the span in about 5 frames). It warns under 15 frames, and when `from` is past the composition's last frame (Remotion clamps a frozen frame there, so a short test composition shows the wrong frames). In the film (LOOP: 26 frames at 0, span 200) the reverse motion is visible on every frame from f901 to f923, with the scrub texture; PROMISE's own two cuts show as two jumps inside it (f914, f918). Strip: `out/v5/kit/rewind-film-strip.png`. | Nothing. For a tighter rewind, 18 to 20 frames. |
| 4 No veil, no paint | RealTake `spotlight`: "veil" (default), "ring" (only the hairline ring around the window, nothing veiled), "none". Use "ring" or "none" with a tighter `crop`. Paint guard: inside a real capture (RealTake's children, ProofFrame's media) `AmberBlock` and `Bloom` refuse to draw and warn; Mist bands, underlines, rings and the spotlight are fine. Extra `masks` on RealTake and ProofFrame draw only when logged (a `why` naming the Development suffix) or when they re-cover a captures.json cover (inside its box grown by 12 px, e.g. in another fill). Any other cover is not drawn, with a warning. | JIRA: the J4 cover `[716, 670, 860, 38]` (the "6 pages in PLAT are not anchored" line) is no longer drawn: crop it instead (the crop's top at 710 or lower). The tooltip re-cover `[2594, 458, 180, 50]` still draws. |
| 5 Clock | `CLOCK_LABEL` = "Real time since the merge" is the default label of `HonestClock` and of RealTake's `clock` (its `label` is now optional). RealTake's `speed` chip is off by default (pass `speed` to show it). | Nothing (an explicit label or `speed={false}` still works). |
| 6 Verified never amber | The amber on "Verified · Doc Drift" at f2460 to 2463 was FIX's own `PlateAmber` (in `src/scenes/v5/FIX/parts.tsx`, not the twins or the kit): a beacon fill multiplied over the real byline, wiping out over 5 frames from `out={T.hit}`, while the capture had already switched to p4-verified at `T.hit`. The twins are clean: `BylineItem` lights only "possibly_stale", and its swap has the old word out before the new one comes in. Kit guards: `TypeToUI` refuses an amber block on a "Verified" line (Mist instead, with a warning); `LiftOut` never lights "verified". | FIX has removed `PlateAmber`. JIRA still imports it (a tsc error at `src/scenes/v5/JIRA/index.tsx:6`) and paints it on the real ADR pill: use `LiftOut`. |

## v5: the new pieces (all ready, 2026-11-17)

Demos are the first 1,095 frames of Dev/Kit4: RealTake 0 to 299, EditType 300 to 509, PageOverCode 510 to 719, carry
cuts 720 to 914, rewind 915 to 974, LiftOut 975 to 1094 (round 2). Stills, sheets and renders are in `out/v5/kit/`. Kit-only renders:
`npx remotion render src/v4/kit/dev/entry.tsx Kit4 ... --frames=...`.

| Piece | API |
| --- | --- |
| `RealTake` (R6 technique 1) | **`capture`**: a captures.json id, a still or a recording.<br>**`time`**: `{ events: { f, t, hold? }[], start? }`. Each event lands source second `t` on frame `f`, at 1x for `hold` s (0.3); the waits between ramp smoothly. Or explicit `{ keys: { f, t }[] }`.<br>**`camera`**: `{ at, dur?, to: { cx, cy, s }, ease? }[]` in CAPTURE px. `s` is film px per capture px, at most 1; it warns past that.<br>**`spot`**: `{ at, dur?, rect, amount }[]` in capture px. The rest is veiled, softened and drained, and the window rides the camera.<br>**`clicks`**: `{ t, x, y, cursor?, from?, travel? }[]`. The kit cursor shows only around these.<br>**`tag`**: a string, or `{ text, at?, until?, x?, y? }`. Once per take.<br>**`spotlight`**: "veil" (default), "ring" (no veil), "none" (round 2).<br>**`speed`**: the "N× speed" label while the ramp runs at 3x or more. Default off (round 2).<br>**`clock`**: `{ zero, label?, at?, x?, y?, swap?, note? }` (label "Real time since the merge"). Real seconds since source second `zero`.<br>**`crop`**: capture px. Only this region is drawn, so Owner rows and "Dana" never show.<br>**`masks`/`maskFill`**: captures.json masks are always drawn; extra covers only when logged (round 2).<br>**`creep`** (1.5), **`float`** (5), **`seed`**, **`background`** (white).<br>**`children`**: capture px, over the capture (`<MistBand rect>` on a real word).<br>**`overlay`**: screen px.<br>Video frames come from **`VideoAt`**, a one-frame Sequence with `trimBefore` (the Freeze fix).<br>Demo: `out/v5/kit/realtake-merge.mp4` (87% moving, no hold). |
| Take helpers | `takeKeys(events, { start? })`, `remap(f, keys)`, `rateAt(f, keys)`, `frameAtSource(t, keys)` (the frame a source second lands on: aim marks and sounds with it), `rampPeak(f, keys)`, `VideoAt` (`src`, `t`), `capPose(frame, camKeys, opts)`, `capToScreen`, `capRectToScreen`, `screenScale`, `CaptureWorld`, `Spotlight` (`rect` and `amount` in SCREEN px; also over twins: R6 technique 12), `spotAt`, `clockValue(f, keys, zero)`, `HonestClock` (`at`, `value`, `label` (`CLOCK_LABEL`), `swap?`, `note?`, `x` (64), `y` (790), `width` (470); carry it across a seam yourself, as the demo does), `SpeedChip` (`rate`, `x` (562), `y`). |
| `PageOverCode` (R6 technique 4) | `page` (PageTwin props for the runbook; it sets the byline and slip), `codeAt` (the code row's window opens, on "code"), `jiraAt` (on "Jira work"), `slipAt` (the code row slips amber and renames, on "changes"; hold it 1.1 s or more), `closeAt`, `bandAt?` (closeAt + 4: the Steps band takes the amber), `bylineAt` (Possibly stale, on "flags the page"), `bylineFrom?` ("verified"), `rise?` ([from, to]: the dark layer comes up, inside a 3D camera), `openDur?` (14), `code?`, `jira?` (real strings by default). World space: put it inside your Stage and Camera3D; aim with `pageOverCodeRects(props)` (`page`, `slab`, `codeRow`, `jiraRow`, tokens). The people and agent chips of S07 are scene content. |
| `EditType` | **`MaskLine`**: `at`, `dur` (13), `out?`. The functional voice.<br>**`EditLine`**: `pre`, `old`, `neu`, `post`, `size`, `mono`, `weight`, `mark?`, `strike?`, `replace`, `underline`, `world`. Strike and replace. The old words leave over 5 frames, then the new ones open over 8: never both.<br>**`TypeToUI`**: `text`, `landText?`, `at` (the big words rise), `dock` (the flight starts), `dur` (18), `from`/`to` (`{ x, y, size, weight?, tracking? }`: `to` is the UI slot's own text box), `block` ("amber" only for the drift, "mist", "none"), `hideAt?` (dock + dur + 1), `font`, `world`. Type becomes UI. Open the UI's swap so its old words have left 2 frames before `dock + dur` (see the demo with BylineItem).<br>**`EditType`**: `{ MaskLine, EditLine, TypeToUI }`. |
| Carry cuts (R6 technique 3) | `screenRectOf(pose, stageRect)`, `cameraToMatch(screenRect, stageRect)` (the incoming camera's first key, `dur: 0`), `GrowReveal` (`at`, `dur` (16), `from` (screen rect of the carried object), `outgoing`, `incoming`, `pad`, `radius`, `darken` (0.5)), `PushSwap` (`at`, `dur` (14), `outgoing`, `incoming`, `dir`), `CarryHold` (`rect`: the carried object on top, in the incoming twin's own metrics), and `KineticDock` for the flight into a slot. |
| `RewindFrom` | `from` (the source scene's frame to start from, e.g. PROMISE's last), `span` (source frames to rewind), `dur` (output frames), `at?`, `chip?` ("Last week"), `texture?` (0 to 1), `ease?` (sine in-out; give it 15 frames or more), `children` (the other scene: `<PROMISE />`; frozen frame by frame, so muted). Crafted scenes only (footage goes through VideoAt). |
| Scene cuts | `src/transitions.ts`:<br>**LOOP→AGENTS**: `whip` left, 9 f (`whoosh-short` on the seam, `tick-soft` on the landing).<br>**AGENTS→FIX**: `slipPush`, 12 f (`whoosh-short` at 6, `tick-soft` at 11).<br>**JIRA→CLOSE**: `slip` with `reveal` on endHit 2880 (the score's hit is the sound).<br>v4 entries are removed; all kinds are kept, and a cut's `sfx` may be a list. The incoming scene opens composed; its first sound leads its picture from `LEADS` or `withLead` (round 2). |
| `tools/qa/rhythm.py` | `python3 tools/qa/rhythm.py <video> [--scene ID] [--body-from S] [--json out]`. Reports the median shot, shots of 8 s or more, body time in shots of 4 s or more, shots under 1 s, moving transitions and hard cuts a minute, all, major and medium interrupts a minute, the share inside a composition, the longest gaps, time in major/medium gaps over 4 s, and cuts and moves on a strong sound hit (share, lift), with V5's gates. On v4 it reproduces R6's numbers (median 1.53 s, 20.7 moving a minute, 30.4 major a minute, longest gap 5.7 s, hard cuts on a hit 36%, lift 1.29). Camera moves on full-bleed footage count as transitions and major interrupts: inside a take, move at most every 2 to 3 s (R6 6.5.7) and let the spotlight and the cursor do the in-between work. |

## Round 3: what changed

| Item | What changed | What you may need to touch |
| --- | --- | --- |
| K-5 Day contrast, one more step | `sweep()`: the stops sit further in (`#FFFFFF 0%, #F7FAFA 18%, ground 38%, surface-sunk 62%, line 90%`), so the darker tones reach toward the subject. `ELEV[3]`/`ELEV[4]` (and `elevAt`) rings 15% / 16.5%, contact and ambient layers about 30% stronger again. Measured on f1090, f3395, f4140 (Main): corners 4 to 5 levels darker, the bottom band up to 5; the ground grades in 1 to 2 level steps (no banding under a 5x stretch); flats clean; flashcheck passes on f1060 to 1125. Before and after: `out/v4/kit/contrast-r3/`. | Nothing. |
| K-6 rebuild splice | `RebuildFromReal`: the twin stays at rest (dim, blurred, grey: unreadable) while the wipe crosses the proof, so the proof's words never sit beside readable twin words; it also starts matched to the proof's scale and place (`toRect` on `fromRect`), then sharpens and grows back over `grow` frames (default 4) from the wipe's last frames: with `dur` 4, frames at+2 to at+6, done before P1 (7-frame window) or P3 (8) swap back to their world. Checked on R12's exit (f2961 to 2972, `out/v4/kit/strip-rebuild-r12-r3.png`): the splice at f2963 to 2964 is gone; flashcheck passes. New props `match` (true), `grow` (4). | For the scale match to help, pass `fromRect`/`toRect` that cover the SAME words in the proof and in the twin (P3's R12 rects are one line each, but the twin wraps fewer words per line, so the match is about 0.97 there; the rest-during-wipe fix covers it anyway). |


## Round 2 (QA K-1 to K-5): what changed (round 2 ready, kept for reference)

| Item | What changed | What you may need to touch |
| --- | --- | --- |
| K-1 twin behind a proof | `MorphToReal`: while the proof is up the twin rests at `twinRest` **0.18** (was 0.4), blurred `twinBlur` **7 px** and drained to grey `twinDrain` **1** (R2's modal scrim; it also keeps the twin's amber out of the shot), over 6 frames. It **comes back over 6 frames** when the proof leaves: `out` (new), read automatically from a ProofFrame or ProofMat `proof` (`at + dur`, unless `exit="none"`). A ground is drawn behind the dimmed twin when no Stage encloses it (no black). New `twinMask` hides the twin inside `fromRect`. | `twinRest={1}` keeps full opacity but now blurs and drains: add `twinBlur={0} twinDrain={0}` only if you really want the twin crisp (the review says it should not be). Custom proof nodes (P1's `R1Node`...) give no `out`: pass `out={...}` or switch to RebuildFromReal as before. |
| K-1 rebuild | `RebuildFromReal` (T4) is now a **4-frame left-to-right wipe** (expo in-out, 16 px slide) instead of a 7-frame dissolve: each pixel shows the proof or the twin, never both. The twin returns from `twinFrom` 0.18 / `twinBlurFrom` 7 / `twinDrainFrom` 1 (MorphToReal's defaults) over 6 frames. Before `at` it shows the proof over the resting twin, so it follows MorphToReal with no jump. The wipe crosses `frameRect` (new), read from a ProofFrame/ProofMat `proof`, else the whole stage. | If you passed a custom `twinRest` to MorphToReal, pass the same as `twinFrom`. For a custom proof node, pass `frameRect` = its outer rect plus the tag (else the wipe sweeps the whole frame and crosses the proof in about 2 frames). `fromRect`/`toRect` are kept but no longer move anything. |
| K-3 tag | The tag chip sits **above the mat's top edge** and overlaps only the 14 px mat band (`MAT.tagTop` -37, was -24): it never covers the capture's first line. | Leave about 40 px above a proof. A layer-mode morph's `frameRect` needs 40 px above the mat (P2's `grow(outer, 240)` is fine). |
| K-2 crop guard | `ProofFrame` checks the crop's top rows, bottom rows and left columns in the capture (the PNG, or the recording's frame at the segment's second) and warns once per crop when more than 2% of an edge is not background: `ProofFrame <id>: the crop [...] cuts content on its bottom edge (19% ...)`. It prints in **`remotion render` logs** and the Studio console (`remotion still` does not forward browser logs). `cropCheck={false}` silences it. | Render your scene once and read the `ProofFrame` lines. Known: R7 as in R3 (h 360) cuts the next table row; **use `[1440, 300, 1460, 346]`** (the tooltip ends on row 635, the table text starts on 650; h 300 cut the tooltip's "Review."). R21 `[720, 280, 3040, 420]` cuts its left edge (48%). R5's dialog crop is borderline (3 to 4%). |
| K-4 cursor | `src/components/Cursor.tsx`: default `scale` **2.4** (was 1.5): an arrow about 30 px tall, with a soft Fathom drop shadow; the click ring keeps its old size. | A2 and P1 pass `scale={1.45 / cam.zoom}`: change it to `2.4 / cam.zoom` (or leave `scale` out outside a camera). |
| K-5 Day contrast | `src/v4/look.ts`: the sweep's outer stop is `line` #D6E4E7 (was surface-sunk); `ELEV[3]`/`ELEV[4]` and `elevAt` carry an 11%/12% Fathom ring (was 6%) and contact layers about 30% stronger; `ContactShadow`, `Float` and `Lift`'s contact default about 30% stronger. Measured on f1250, f2900, f3450, f4070 (Main): the frame edges 1 to 6 levels darker, hero edges crisper; the sweep shows no banding beyond 8-bit steps under a 5x contrast stretch; flats stay clean; flashcheck passes on f1920 to 1960 and f3440 to 3480. Before and after: `out/v4/kit/contrast/`. | Nothing (automatic). If you hard-coded your own shadows, use `elevAt()`. |

Also new since round 1: `SlipReveal` (the P5 to A4 cut, as a reveal), `PillSwap`/`LabelSwap`, `proofInfo()`,
`StageContext`, a kit-only check composition `KitChecks` in `src/v4/kit/dev/entry.tsx` (crop-guard cases).

```ts
import { Stage, Camera3D, Layer, useCam3, Lift, KineticLine, lineCues, ProofFrame, proofRect, proofPoint,
  MorphToReal, NumberRoll /* ... */ } from "../../v4/kit"; // also re-exports the look (ink, ELEV, elevAt, T, DAY ...)
```

Frames are scene-local, coordinates are film px on the 1920 x 1080 stage (before the camera), capture coordinates
are capture px (3840 x 2160).

## Rules of thumb (read these)

1. **Every shot is `<Stage>` outside, `<Camera3D>` inside.** The Stage draws the lit ground and parallaxes it with the
   first camera inside it (light 0.3, grid or tide 0.5). A Stage with no camera measures as FROZEN in motion.py (the
   5.5% grid is below the threshold): always put a Camera3D in it, even with no keys.
2. **Camera3D never freezes by default**: creep 1.5% per second plus a 5 px elliptical float (its speed never reaches
   zero). Measured: a held card and a lone line of type on Paper both read 100% moving. Keys move from wherever the
   camera is; the creep restarts at each key, so long scenes do not run away. Do not turn both off without a reason.
3. **Read square, move tilted (M2).** Yaw and pitch only during travel; land at 0 before text is read.
4. **3D**: no opacity, filter, clip-path, mask, mix-blend or overflow on anything between a `preserve-3d` parent and
   its 3D children (ExplodedStack, a tilted Camera3D). Put them on leaves.
5. **Lift draws its shadow on a plate behind its children**: the children must be a sized, in-flow box (or give Lift
   `w`/`h`), and pass the child's corner `radius` (default 28).
6. **Proofs**: scale is film px per capture px, at most 1, and the on-screen scale (scale x camera zoom) is checked;
   inside a Camera3D the camera creeps the proof, outside one the content creeps 1.5%/s inside the mat. Masks from
   captures.json are always drawn, each in its own `fill` (white when it names none; the director set `#F1F1F2` on
   p2-flagged-tooltip's pill); re-cover one in another colour with `masks` (same box + `fill`) or `maskFill`.
   Start proofs on a beat (`frame % 15 === 7`, film frames).
7. **One amber per shot**: AmberBlock, Bloom, a slipped badge. Mist band and Current underline for emphasis.
8. **Scene cuts are drawn over YOUR first frames** (see below): end on your final pose; open composed and moving.
9. If a render fails in a scene file you do not own, kit-only renders still work:
   `npx remotion render src/v4/kit/dev/entry.tsx Kit4 out/v4/<you>/x.mp4 --port=<yours>`.

## Scene cuts in v4 (history: v5's are in the table above)

| Out → in | Frame | Cut | Sound |
| --- | --- | --- | --- |
| A1 → A2 | 1057 | sound only (A2's DaySlipReveal draws it) | `slip` latch on frame 0 |
| P1 → P2 | 2077 | `slipPush` 12 f: three bands push left, top first, bottom +2, middle +4 (the slip), blur by speed | `whoosh-short`, peak at +6 |
| P2 → P3 | 2617 | `whip` left 9 f, seam at +3.5, horizontal blur | `whoosh-short`, peak at +4 |
| P3 → P4 | 3277 | `whip` down 9 f (P4 comes in from the top), vertical blur | `whoosh-short`, peak at +4 |
| P5 → A4 | 4177 | `slip` with `reveal` (QA fix, 2026-11-16): P5's Day frame is split on the bar with the middle band one unit out and its Night trace; the top and bottom bands slide out left, the middle carries on right (ease-in), so A4's Night grows every frame and is fully open at 4185 (luma 239 → 218 → ... → 47, largest step 47, was a 173 one-frame cut). `SlipReveal` in the kit, A2's DaySlipReveal behaviour | `slip`, latch on the bar (+0) |

The cut uses the outgoing scene's FROZEN last frame (its copies are muted by `<Freeze>`) and moves the incoming
scene's one live instance (it keeps its own sound and is never remounted). Every scene still starts on its timeline
frame. Kinds available for later: `slip` (optionally `reveal`), `slipPush`, `whip` (`dir`), `push` (T8). Checked on the real timeline
(`out/v4/kit/cut-p*-sheet.png`); Body renders are pixel-identical to Main (the split render is unaffected).

## Exports

| Export | Props (defaults) and notes |
| --- | --- |
| `Stage` | `world` ("day"), `light` (Day ["50%","34%"], Night ["50%","38%"]; move it toward the subject), `motif` ("grid"; "tide", "none"), `grid?: GridProps`, `tide?: TideProps` (e.g. `{ top: 620, bottom: 1020 }`). It is its own stacking context (isolation), so Mist bands multiply only inside it. |
| `Grid`, `TideLines`, `ContactShadow`, `Float`, `Bloom`, `InkLabel`, `Eyebrow` | promoted from `src/styleframes/Stage.tsx`; Grid and TideLines take `night`. |
| Round 2 (v5) | `LiftOut`, `LiftOutProps`; `RealCaptureContext`, `useRealCapture()` (the capture id while drawing over a real capture, else null), `allowedCovers(capture, masks, logged)`, `checkCovers(...)` (kept), `warnPaint`; `CLOCK_LABEL`; `sineInOut`. From `src/transitions.ts`: `LEADS`, `withLead(scene, lead)`, `leadsFor(id, scene)`, `leadOnset(s)`. |
| `Camera3D` | `keys: { at, dur?, to: Partial<Cam3>, ease? }[]` (dur sized by the move, 18 to 36; ease expo out), `base`, `creep` (1.5 %/s), `drift: [vx, vy]` (px/s, default 0), `float` (5 px), `seed` (vary it when two cameras share a screen), `perspective` (2400), `preserve3d`. Zoom interpolates in log space with Pot's straight-path look-at. |
| `Cam3`, `CAM3_REST` | `{ x, y, zoom, yaw, pitch, roll }`: x, y is the stage point at the view centre (960, 540 at rest). |
| `useCam3()`, `useCam3OrNull()`, `cam3At(frame, keys, opts)` | the pose inside a camera; the pure function to aim things where the camera will be. `stageToScreen(cam, x, y)` maps a stage point to the screen (2D part). |
| `Layer` | `depth` (light 0.3, grid 0.5, objects 1, floats 1.1 to 1.15) inside a Camera3D. |
| `Lift` | `at`, `to`, `from` (1), `dur` (14, expo out), `rise` (26 px), `contact` (true or strength), `dark` (Fathom object on Day), `world` ("night" for the Night ladder), `radius` (28), `appear` (rest visible before `at`), `down: { at, dur?, to? }`, `x`, `y`, `w`, `h`, `style`. Fades only over its first 3 frames. `elevAt(level, dark?, world?)` gives the same shadows for your own objects. |
| `KineticLine` | `text` ("\n" breaks; U+00A0 joins), `at`, `words` (cues; `lineCues(sc.line(id), text)`), `size` (120), `weight` (600), `color`, `align`, `width`, `lineHeight`, `tracking`, `mono`, `stagger` (3), `lead` (6: lands 0 to 2 f before the word), `dur` (10), `rise` (0.34 em), `smear` (0.11 em), `thesis: number[]` (arrive from 1.6x), `mark: { words: [i, j], kind, at, dur? }` (or an array), `exit: { at, stagger?, dur? }`, `world`, `renderWord`. `lineLanded()` gives the frame the last word has landed (reading time starts there). |
| `MistBand`, `CurrentUnderline`, `AmberBlock` | `at`, `dur` (10; amber 9), `world`, `exitAt`; wrap words, or pass `rect` to mark a region of a real plate (A0). |
| `NumberRoll` | `value`, `at`, `dur`, `from` (0), `decimals`, `unit` ("s", "of 24"), `prefix`, `size` (300; unit 0.4 of it, text-muted), `ticks` (20), `world`. Pot's tick mode: decaying steps, lands exactly. |
| `ProofFrame` | `capture`, `crop`, `scale`, `x`, `y` (mat's outer top-left), `at`, `dur` (45, or the video's length), `tag`, `note`, `video: { from, to, jumps?: { at, to, crop?, scale? }[] }` (source seconds; jumps at local frames; a jump may reframe to a new crop: R5, R14, R16), `tilt`, `enter` ("lift"; "none" inside a morph), `exit` ("drop" after `dur`; "none"), `creep`, `masks`, `maskFill`. Warns (console) on scale > 1, on-screen scale > 1.05, and under 24 frames. |
| `ProofMat` | the same mat, tag and note around any children (`w`, `h` inner size): R9's verbatim MCP output. |
| `proofRect(p)`, `proofPoint(p, captureBox)` | the mat and image rects; the film rect of a capture box inside a placed proof (MorphToReal's `toRect`). |
| `MorphToReal` (T3) | `at`, `dur` (9), `fromRect` (the twin's element), `toRect` (the same element inside the placed proof: `proofPoint`), `twin`, `proof` (the proof with `enter="none"`), `twinRest` (0.18 since round 2), `twinBlur` (7), `twinDrain` (1), `twinMask`, `out`, `radius` (24), `frameRect` (where the window grows to; default the whole stage), `clip` ("auto"). **Soft shadow (2026-11-16, director's fix):** when `proof` is a ProofFrame or ProofMat element (or a fragment of them), the growing window is handed to the mat, which clips only its own content and draws its shadow on the open window (level 1 to 4 as it grows); the tag and note land when the mat is fully open. Any other node is clipped as a layer, as before (`clip="layer"` forces that; P2's `grow(outer, 240)` frameRects keep working either way). |
| `RebuildFromReal` (T4) | `at`, `dur` (4 since round 2: a wipe), `fromRect` (proof element), `toRect` (twin element; the twin starts matched onto `fromRect`, round 3), `twin`, `proof`, `twinFrom` (0.18), `twinBlurFrom` (7), `twinDrainFrom` (1), `frameRect`, `match` (true), `grow` (4). |
| `SlipPush` (T5) | `at`, `dur` (12), `from`, `to`, `direction` ("left"). |
| `ZoomThrough` (T6) | `at`, `center: [x, y]`, `from`, `to`, `inDur` (8), `outDur` (4), `peak` (8), `motionBlur` (true: CameraMotionBlur, 5 samples, on the 4 fastest frames, M5; it renders `from` 5 times there). Crafted DOM only. |
| `PushCut` (T8) | `at`, `dur` (7), `from`, `to`, `outScale`/`inScale` (1.04), `flash`, `flashColor`. |
| `WhipBlur` (T9) | `at` (the seam: put the whoosh peak here), `dur` (9), `from`, `to`, `dir`, `blurPerPx`, `maxBlur`. |
| `SignalLine` (T7) | `d`, `at`, `dur`, `pulse` (true), `trail` (true), `dashed`, `color`, `width` (2.5), `ease` (expo in-out), `holdPulse` (6), `world`. `pointOnPath(d, t)`, `tangentOnPath`, `progressOf(frame, at, dur)` to ride or follow the pulse. |
| `ExplodedStack` (T10) | `explode` (0 to 1), `yaw`, `pitch` (up to 15 while exploded), `layers: { key, z, node }[]`, `perspective` (1350), `width`, `height`, `x`, `y`, `origin`. |
| `Breakout` | `at`, `dur` (10), `scale` (1.07), `move` ([0, -6]), `back`, `radius` (20), `from` (0). Wrap the row in place. |
| `KineticDock` | `at`, `dur`, `fromRect`, `toRect`, `arc` (60), `lift` (4), `hideBefore`, `ease`. Lay the token out at toRect's size. |
| `Press`, `pressAt(frame, at)` | the click ring at `x`, `y`; the matching squash for the pressed control. Use with `src/components/Cursor` (`click: true` on the same frame; default scale 2.4 since round 2). |
| `PillSwap`, `LabelSwap`, `useFontsReady` | a status pill whose label falls out and the new one rises in (never overlapping) while its width and colour follow: `from`/`to: { label, color, bg? }`, `at`, `size` (30), `dot`, `world`. For a twin's status change (Jira "To Do" to "Done"); the byline badge swaps live in the twins. |
| `DirectionalBlur`, `smearSigma`, `smearDecay` | Pot's blur grammar for your own moving things (exported from the index; `DirBlur`, the bare SVG filter, stays exported too). |

## Examples

Camera, layers, lift (a push onto the word, a float that parallaxes):

```tsx
const sc = getScene("A2");
<Stage world="day" motif="grid" light={["40%", "30%"]}>
  <Camera3D keys={[
    { at: sc.wordAt("V08", "anchors") - 3, dur: 24, to: { x: 1100, y: 470, zoom: 1.25 } },
    { at: sc.cue("V09") - 10, dur: 30, to: { x: 960, y: 540, zoom: 1.05, yaw: -8 }, ease: EASE.expoInOut },
    { at: sc.cue("V09") + 20, dur: 18, to: { yaw: 0 } },          // square again before the words are read
  ]}>
    <Lift at={0} to={3} contact x={380} y={210}><PageTwin ... /></Lift>
    <Layer depth={1.12}><Lift at={12} to={4} x={1330} y={150} radius={14}><InkLabel icon="anchor">PAY-6</InkLabel></Lift></Layer>
  </Camera3D>
</Stage>
```

A proof (R7), on a beat, its masks re-covered in the pill's grey:

```tsx
const at = sc.snap(sc.wordAt("V14", "flagged"));                      // a beat (frame % 15 === 7 on the film)
<ProofFrame capture="p2-flagged-tooltip" crop={[1440, 300, 1460, 346]} scale={0.8} x={362} y={420} at={at} dur={45}
  tag="Recorded in Confluence" />   // the pill's mask fill (#F1F1F2) now comes from captures.json
```

Note for R7, R4, R17 (the 1460 x 360 byline crops in R3): the last capture px begin the next table row of the
runbook, whose cell reads "Dana (Platform on-call lead)" in the capture. For R7 use `[1440, 300, 1460, 346]` (round 2:
h 300 cut the tooltip's last line); for R4 and R17 let the crop guard check your height.

T3 from a twin rect to a proof rect (the twin owner's `pageRects()` gives the twin's badge):

```tsx
const placed = { capture: "p2-flagged-tooltip", crop: [1440, 300, 1460, 346] as Box, scale: 0.8, x: 362, y: 420 };
const toRect = proofPoint(placed, [2272, 461, 502, 46]);              // the real byline pill, capture px
const outer = proofRect(placed).outer;
<MorphToReal at={at} fromRect={pageRects(pageProps).badge} toRect={toRect}
  frameRect={{ x: outer.x - 10, y: outer.y - 40, w: outer.w + 20, h: outer.h + 60 }}
  twin={<RunbookShot />}
  proof={<ProofFrame {...placed} at={at} dur={60} enter="none" tag="Recorded in Confluence" masks={...} />} />
```

Big type timed to the narration (on-screen words that differ from the spoken ones simply follow at `stagger`):

```tsx
const sc = getScene("P4");
<KineticLine text="Safe to cite." at={sc.cue("V22")} words={lineCues(sc.line("V22"), "Safe to cite.")} size={156}
  mark={{ words: [0, 2], kind: "current", at: sc.wordAt("V22", "cite", "to") }} />
// or one cue: words={[{ from: sc.wordAt("V05", "date") }]} and the rest follow every 3 frames
```

## Tools

- `python3 tools/qa/motion.py <video> [--from S --to S] [--scene ID] [--scenes] [--json out.json] [--quiet]`: moving
  share, frozen seconds, holds of 1 s or more with timestamps, M1 runs over 12 frames, gates. v3 gives R1's numbers
  (25.3% moving, 38 holds, 78.5 s). The kit gallery: 91.6% (its only holds are demos without a camera).
- `python3 tools/qa/amber.py <video> [--scene ID] [--after S] [--method r1|raw] [--json out.json]`: amber seconds
  (R1's method by default; v3 gives R1's 18 of 142 after 13 s) against the 40% gate, counted from A2 on for the film,
  and samples with more than one separate amber blob (read them against the picture: real captures are exempt).
- `node tools/v4/proofclips.mjs [--force] [--extra requests.json] [--list]`: pre-cuts the recording proofs (R3's R1,
  R5, R11, R14, R16 with margins) into `public/clips/v4/` and writes `src/v4/kit/proofclips.json`. ProofFrame plays a
  clip only when it holds the whole region and every second the proof shows (else the 4K capture), so nothing can
  change a frame: measured against the 4K path, mean difference 0.03 of 255. A 45-frame recording proof renders in
  7 s instead of 35 s. Need another segment? Send me (or the director) `{ capture, crop, scale, t0, t1, after? }`.
- Kit-only entry: `src/v4/kit/dev/entry.tsx` (composition Kit4).

## Cost

A 4K 60 fps recording in a ProofFrame is the expensive part of a render when no clip covers it (each tab seeks the
4K source). Render a scene in one range rather than many small ones.
