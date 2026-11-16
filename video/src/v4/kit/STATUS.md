# Kit status

**round 2 ready** (2026-11-16, after the visual review `out/v4/qa/review.md`, Kit K-1 to K-5). Every prop from round 1
still works; the changes and the props you may want to touch are in "Round 2" right below. Round 1 notes follow.

## Round 2 (QA K-1 to K-5): what changed

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

## Scene cuts (src/Main.tsx + src/transitions.ts)

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
| `RebuildFromReal` (T4) | `at`, `dur` (4 since round 2: a wipe), `fromRect`, `toRect` (kept), `twin`, `proof`, `twinFrom` (0.18), `twinBlurFrom` (7), `twinDrainFrom` (1), `frameRect`. |
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
