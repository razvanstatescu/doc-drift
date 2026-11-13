# Tool facts for the launch video (checked 2026-11-13)

> **Appendix to [../research.md](../research.md).** A research log written by a sub-task on 2026-11-13 and kept as delivered. Spot-check by the main session, same day, against the npm registry: `remotion` 4.0.543 (published 2026-11-11), `@remotion/effects` 4.0.543, `@remotion/mac-cursors` 4.0.543, `openai` 7.56.0. The official pages the sub-task downloaded were in a temporary folder and are not kept; every fact has its source URL.

Scope: Remotion, ElevenLabs API, OpenAI image generation, and what can be copied from the Satchel film.
Baseline: the Satchel tool sheet of 2026-10-22 (`/Users/razvanstatescu/Documents/Work/near/Satchel/marketing/notes/tools.md`).

**How to read the tags**

- **VERIFIED**: I opened the official page or source today (official docs as raw markdown, the npm registry, the GitHub releases API, the vendor's published OpenAPI spec, or the official SDK source).
- **VERIFIED (summary)**: official page, but read through a summarising fetch, so wording and table mapping may be off. Re-read before relying on it.
- **UNVERIFIED**: search snippet, third party, or my own inference.
- **LOCAL**: measured or written down by the Satchel team on this machine; not re-tested today.

**Nothing was executed.** No paid API was called, no key or `.env` was read, and no code was typechecked or rendered against the new versions. Every "should work" below needs a render test.


---

## 0. What changed since 2026-10-22, in one table

| Tool | Then | Now | Action |
|---|---|---|---|
| Remotion | 4.0.537 | **4.0.543** (2026-11-11). No Remotion 5 | Pin 4.0.543 for every `remotion` and `@remotion/*` package |
| Remotion Chrome | 157.0.8080.0 | **158.0.8127.2** (from 4.0.540) | Re-test the barrage pass; two HTML-in-canvas bugs are fixed in 158 |
| Remotion effects | WebGL2 only | Every built-in effect also has a **WebGPU** version; default backend order is WebGPU, WebGL2, 2D (4.0.540) | Set `Config.setPreferredEffectBackend('webgl2')` if you want the behaviour the old film was measured on |
| Remotion light leaks | `@remotion/light-leaks` | **Deprecated**; use `lightLeak()` from `@remotion/effects/light-leak` | Do not install `@remotion/light-leaks` |
| ElevenLabs music | `music_v1` (default in helper) | `music_v1` **deprecated, removed 2027-01-31**; `music_v2_5` is the recommended model. API default is still `music_v1` | Always pass `model_id`. `music_v1` still works for this film (freeze is Dec 18) |
| ElevenLabs SFX | `eleven_text_to_sound_v2` | **`eleven_text_to_sound_v3`** released to all (Nov 2); v2 **deprecated, removed 2027-03-01**. API default is still v2 | Pass `model_id: 'eleven_text_to_sound_v3'` |
| ElevenLabs STT | `scribe_v1` | `scribe_v1` deprecated; **`scribe_v3`** released Nov 9 | Change the helper default to `scribe_v3` |
| ElevenLabs TTS | `eleven_v4` | Unchanged: `eleven_v4` is still the newest and recommended narration model | None |
| OpenAI images | `gpt-image-2.5-flare` / `-sunburst` | **`gpt-image-2.6-flare` / `gpt-image-2.6-sunburst`** released **2026-11-04** | Change the helper default; add `complexity`, `markup`, `gif`, `svg` |
| OpenAI video | `sora-2` listed for the key, uncalled | **Sora 2 and the Videos API were shut down on 2026-09-24**; no replacement | No OpenAI video. See §3.4 for alternatives |

---

## 1. Remotion

### 1.1 Version and release history

| Fact | Status | Source |
|---|---|---|
| Latest stable is **4.0.543**, published to npm 2026-11-11 16:43 UTC; GitHub release 2026-11-11 19:24 UTC | VERIFIED | https://registry.npmjs.org/remotion , https://github.com/remotion-dev/remotion/releases/tag/v4.0.543 |
| npm dist-tags: `latest: 4.0.543`. The `alpha` (4.1.0-alpha12) and `canary` tags are stale leftovers | VERIFIED | https://registry.npmjs.org/remotion |
| **There is no Remotion 5.** "Remotion 5.0 is not yet released. This is an incomplete list of breaking changes that are planned" | VERIFIED | https://www.remotion.dev/docs/5-0-migration |
| Releases since the old film: 4.0.538 (Oct 22), 539 (Oct 26), 540 (Nov 2), 541 (Nov 5), 542 (Nov 9), 543 (Nov 11) | VERIFIED | npm registry `time` field |
| Bundled Chrome: **158.0.8127.2** from 4.0.540; 157.0.8080.0 from 4.0.534 | VERIFIED | https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell |
| All `remotion` and `@remotion/*` packages must be the same exact version (no `^`) | VERIFIED | https://www.remotion.dev/docs/5-0-migration (upgrade section) |

The old `package.json` has `"@remotion/fonts": "^4.0.537"` with a caret. Pin it exactly.

### 1.2 What changed between 4.0.537 and 4.0.543 that matters to us

All rows VERIFIED from the GitHub release notes (`https://github.com/remotion-dev/remotion/releases/tag/v4.0.<n>`).

| Version | Change | Why it matters |
|---|---|---|
| 538 | `@remotion/media`: new `preservePitch` prop on `<Video>` and `<Audio>` | Speed changes no longer have to shift pitch |
| 538 | `<HtmlInCanvas>` shows a notice when not supported instead of crashing | Studio in a Chrome without the flag no longer throws |
| 538 | Memory leak fixed when replacing `<Sequence>` children; many Studio performance fixes | Long timelines |
| 539 | `@remotion/effects`: `curves()` and `shatter()` added | New looks |
| 539 | `@remotion/transitions`: fix capturing bare `OffthreadVideo` scenes | Shader transitions over screen recordings |
| 539 | Renderer: no deadlock when merging 32+ audio tracks | We will have many SFX tracks |
| 539 | CLI: `--license-key`, `--is-production` flags | Licence telemetry |
| 540 | **Every effect now has a WebGPU version**; new `preferredEffectBackend` option (`--preferred-effect-backend`, `Config.setPreferredEffectBackend()`), default `auto` = WebGPU, then WebGL2, then 2D | Changes which code path the built-in effects run on. See §1.4 |
| 540 | `createEffect()` gains `implementations` keyed by `webgpu` / `webgl2` / `2d`; the single-`backend` form "remains supported" | The old `barrageFx` (single `backend: 'webgl2'`) is still valid |
| 540 | Chrome upgraded to 158.0.8127.2 | Fixes "canvas with opacity: 0 can crash HTML-in-canvas" and the `object-fit` bug |
| 540 | "Recover canvas effects after WebGL context loss", "Fix WebGL state leaking between canvas effects", "Avoid Chromium crashes during WebGL effect cleanup" | Directly relevant to the barrage pass and pitfall 2 in the old notes |
| 540 | `@remotion/motion-blur`: fix `HtmlInCanvasMotionBlur` render failure | It was broken in 537 to 539 renders |
| 540 | `@remotion/effects`: weather (rain, snow), burn and wipe effects; `@remotion/transitions`: `cube()` presentation, free | New looks |
| 540 | Bundler upgraded to Rspack 2.3; "Fix long `<OffthreadVideo>` renders on Chrome 158" | Build and long-video stability |
| 541 | Studio: "Render and replace" (swap a scene for its rendered video) | Lets you freeze a heavy scene |
| 541 | Renderer: fixes for hangs and page reuse after a browser crash | Stability with `--gl=angle` |
| 541 | `@remotion/motion-blur`: one sample when the shutter angle is 0 | Cheap way to switch blur off per frame |
| 542 | `@remotion/effects`: `magnify()` and `lightning()` | `magnify()` is a ready-made loupe for UI call-outs |
| 542 | **"Fix missing images and videos inside `<HtmlInCanvas>`"**; `<Img>` and `<Html5Video>` now default to `crossOrigin="anonymous"` inside `<HtmlInCanvas>` | The barrage is `<Img>` cards inside `<HtmlInCanvas>`. Remote assets must send CORS headers or they error (they used to vanish silently). Same-origin `public/` files are unaffected |
| 542 | Fix playback stutter when resizing `<HtmlInCanvas>`; fix `<Sequence>` inside `<ThreeCanvas>` crash in Studio | Studio only |
| 542 | `remotion elements use` CLI; `create-video --skills` | Elements library and skills install |
| 543 | Renderer: `chromiumOptions.flags` / `--chromium-flags`, `--chromium-features`, `--chromium-blink-features` | Escape hatch for Chrome flags |
| 543 | Renderer: `proResBitsPerMacroblock` / `--prores-bits-per-macroblock` | ProRes file size control |
| 543 | Studio: audio level meters; fix `<HtmlInCanvas>` flicker when resizing | Mixing by eye in Studio |
| 543 | "remotion.pro is retired, buy a license now at https://www.remotion.dev/pricing" | Licence purchase moved |

**Breaking changes:** none announced in 4.0.538 to 4.0.543. The behaviour changes to watch are the effect backend default (540), the `crossOrigin` default inside `<HtmlInCanvas>` (542), and the new Chrome (540).

**Planned for 5.0 (not released), worth writing code for now** (VERIFIED, https://www.remotion.dev/docs/5-0-migration): default GL renderer becomes `angle`; default colour space becomes `bt709`; invalid props fail the render; `@remotion/google-fonts` `loadFont()` must name weights and subsets; `TransitionSeries layout="none"` removed; `measureSpring()` loses `from`/`to`; `fitText()` throws on zero-width text; `@remotion/light-leaks` no longer published.

### 1.3 Package state at 4.0.543

npm facts VERIFIED via `https://registry.npmjs.org/@remotion%2f<name>/latest`; doc facts VERIFIED on the page given.

| Package | State | Notes and source |
|---|---|---|
| `@remotion/effects` | 4.0.543, since 4.0.464 | **90 effect entry points**, each imported as `@remotion/effects/<name>`. Applied through the `effects` prop of `<Solid>`, `<HtmlInCanvas>`, `<Video>` (`@remotion/media`), `<Img>`, `<CanvasImage>`, `<AnimatedImage>`, `<Gif>`, `<RemotionRiveCanvas>` and `@remotion/shapes`. `effectsOutputSize` (4.0.536) fixes the effect resolution. Licence: Remotion License. https://www.remotion.dev/docs/effects , https://www.remotion.dev/docs/effects/api |
| `HtmlInCanvas` (in `remotion`) | Since 4.0.455. **Still experimental** | "an experimental browser API ... behind a flag"; "The API is unstable - Chrome may change the API or even remove it in the future." Details in §1.4. https://www.remotion.dev/docs/html-in-canvas |
| `@remotion/media` | 4.0.543. npm description still says "Experimental WebCodecs-based media tags", but the docs say "For new code, use `<Video />` from `@remotion/media`" | `<Video>`, `<Audio>`. Details in §1.5. https://www.remotion.dev/docs/video-tags |
| `@remotion/transitions` | 4.0.543 | 21 presentations. Details below |
| `@remotion/motion-blur` | 4.0.543 | `<HtmlInCanvasMotionBlur>` (4.0.529, experimental) is "the state-of-the-art recommended way"; props `width`, `height`, `samples`, `shutterAngle`, plus the timing props. `<CameraMotionBlur>` and `<Trail>` remain. Call `useCurrentFrame()` in a child. https://www.remotion.dev/docs/motion-blur , https://www.remotion.dev/docs/motion-blur/html-in-canvas-motion-blur |
| `@remotion/light-leaks` | 4.0.543, **deprecated** | "deprecated and will no longer be published starting with Remotion 5.0. Migrate to `lightLeak()` from `@remotion/effects/light-leak`." https://www.remotion.dev/docs/light-leaks/light-leak |
| `@remotion/captions` | 4.0.543 | Unchanged API; `parseVtt()` fixes in 540. Caption Elements exist (see below). https://www.remotion.dev/docs/captions |
| `@remotion/elevenlabs` | 4.0.543 | "Work with the output of the ElevenLabs API": `elevenLabsTranscriptToCaptions()`, `detectElevenLabsTranscriptFormat()`. Converts ElevenLabs transcripts to `@remotion/captions` format. https://www.remotion.dev/docs/elevenlabs |
| `@remotion/sfx` | 4.0.543, since 4.0.429 | 32 sounds as remote URLs, peak normalised to -3 dB, "can be used without attribution". Useful ones: `whip`, `whoosh`, `pageTurn`, `uiSwitch`, `mouseClick`, `shutterModern`, `shutterOld`, `ding`, `recordScratch`. The rest are memes. Licence per sound is on each sound's page. https://www.remotion.dev/docs/sfx |
| `@remotion/mac-cursors` | 4.0.543, **new since 4.0.513** | `<MacOSCursor cursor="pointer" style={{left, top, scale}} />`; 39 bundled macOS cursor SVGs, hotspot at the component origin; custom cursors via `customCursor`. This is the official cursor component. https://www.remotion.dev/docs/mac-cursors/mac-os-cursor |
| `@remotion/three` | 4.0.543 | Has a `webgpu` export. `<Sequence>` inside `<ThreeCanvas>` Studio crash fixed in 542 |
| `@remotion/lottie`, `@remotion/rive` | 4.0.543 | `<RemotionRiveCanvas>` accepts `effects` |
| `@remotion/starburst`, `@remotion/animated-emoji`, `@remotion/rounded-text-box`, `@remotion/svg-3d-engine` | 4.0.543 | Exist on npm |
| `@remotion/web-renderer` | 4.0.543 | Client-side rendering; not needed for us |
| Screen recording, device frame, zoom-on-click packages | **Do not exist** | `@remotion/recorder`, `@remotion/cursor`, `@remotion/device-frames`, `@remotion/zoom`, `@remotion/screen-recording` all return "not found" on npm. The Remotion Recorder is a template, not a package, and the 4.0.541 notes removed it from the Products navbar |

**Effect names in `@remotion/effects` 4.0.543** (VERIFIED from the package `exports` map; import path is the name):
`barrel-distortion, bevel-alpha, blur, brightness, burlap, checkerboard, chromatic-aberration, color-correction, color-key, contour-lines, contrast, corner-pin, curves, cylinder, dot-grid, drop-shadow, duotone, emboss, evolve, exposure, film-burn, fisheye, flannel, fractal-noise, glow, grayscale, gridlines, halftone, halftone-linear-gradient, hue, invert, iris-wipe, lens-blur, levels, light-leak, light-trail, lightning, linear-gradient, linear-gradient-tint, linear-progressive-blur, linear-progressive-pixelate, lines, liquid-contours, long-shadows, lut, magnify, mirror, noise, noise-displacement, outline, page-turn, paper, pattern, pixel-dissolve, pixelate, radial-progressive-blur, radial-progressive-pixelate, radial-wipe, rain-fall, region-blur, rings, roughen-edges, saturation, scale, scanlines, shadows-highlights, shatter, shine, shrinkwrap, skew, snow-fall, speckle, sphere, starburst, tear, thermal-vision, tile, tint, translate, turbulent-displace, tv-signal-off, venetian-blinds, vibrance, vignette, wave, waves, white-balance, white-noise, zigzag, zoom-blur`.
Useful for product UI: `magnify`, `region-blur` (hide private data), `corner-pin` (map a screenshot onto a surface), `shine`, `drop-shadow`, `linear-progressive-blur`, `chromatic-aberration`, `scanlines`, `lut`, `curves`.

**Transitions** (VERIFIED, https://www.remotion.dev/docs/transitions/presentations and per-presentation pages):

| Kind | Presentations | Requirement |
|---|---|---|
| DOM | `fade`, `slide`, `wipe`, `flip`, `clockWipe`, `iris`, `pushCut` (4.0.500), `cube` (4.0.540), `none` | None |
| HTML-in-canvas shader | `blurSlide`, `bookFlip`, `crosswarp`, `crossZoom`, `dissolve`, `dreamyZoom`, `filmBurn`, `linearBlur`, `ripple`, `swap`, `zoomBlur`, `zoomInOut` | **Render: no flag needed** (Remotion's Chrome has it on) but pass `--gl=angle` for WebGL. **Studio preview: Chrome with `chrome://flags/#canvas-draw-element` enabled.** They accept `effects` and `effectsOutputSize` |

This confirms the correction in the old `tech.md` §4: the cookbook's "12 transitions need a flag and will not render" is wrong for renders. It is still true for the Studio preview.

**Elements** (VERIFIED, https://www.remotion.dev/docs/elements and the docs sitemap): a catalogue of copy-in React building blocks at https://www.remotion.dev/elements , installed by `npx remotion elements use` or from Studio. Categories and items: captions (basic, moving-pill, popping-word, rounded, word-highlight), text (circle-marker, crossed-off, cylinder-text, news-article-highlight, spinning-text-wheel, strike-through, text-marker), backgrounds (liquid-contours, moving-waves, moving-zigzags, notebook-paper, paper-texture, rotating-starburst), data (bar, line, pie charts, number-counter), layouts (picture-in-picture-transition, slide-to-split-screen), overlays (lower thirds, social-safe-zones), storytelling (on-screen-messages, polaroid-pictures, speed-lines), commerce (peel, shine, tear), audio visualisers, maps, YouTube (comment highlight, end card, subscribe nudge). The source is copied into the project, so it can be restyled to the brand.

### 1.4 HtmlInCanvas, WebGL and the effect backend

| Fact | Status | Source |
|---|---|---|
| Studio preview needs Chrome 149+ with `chrome://flags/#canvas-draw-element` set to Enabled | VERIFIED | https://www.remotion.dev/docs/html-in-canvas |
| Rendering needs no flag: "We compiled a version of Chrome and made it the default, and enabled the flag for you." Works with `npx remotion render`, Studio renders, Lambda, Vercel, SSR since 4.0.455 | VERIFIED | same |
| "If your effect uses a WebGL shader, pass `--gl=angle` to make the render work", or `Config.setChromiumOpenGlRenderer('angle')` | VERIFIED | same |
| Nesting `<HtmlInCanvas>` needs Chrome 157.0.8080.0+; supported in server renders from 4.0.534; check with `HtmlInCanvas.isNestingSupported()` | VERIFIED | same |
| Cross-origin content JavaScript cannot read is **omitted** from the canvas. From 4.0.542 `<Img>`, `<Html5Video>` (and `<OffthreadVideo>` in preview) default to `crossOrigin="anonymous"` inside it. CSS background images have no such attribute: use same-origin, data or blob URLs | VERIFIED | same |
| Scaling: canvas and WebGL elements are not upscaled by `--scale`. `<HtmlInCanvas>` and `<Solid>` take `pixelDensity`; use `usePixelDensity()` to follow the render scale. **Videos cannot be upscaled** | VERIFIED | https://www.remotion.dev/docs/scaling |
| Open Chrome bugs: "HTML-in-canvas does crash page on WebGL context loss" (open); "Incorrect 3D occlusion" (open). Unreported: backfaces stay visible despite `backface-visibility: hidden`; blend, backdrop and mask effects differ; positioned nested canvas displaced | VERIFIED | https://www.remotion.dev/docs/html-in-canvas-bugs |
| Fixed in Chrome 158: `opacity: 0` canvas crash (158.0.8118.0), `object-fit` handling (158.0.8121.0) | VERIFIED | same |
| `preferredEffectBackend`: values `webgpu`, `webgl2`, `2d`; default `auto` (WebGPU, then WebGL2, then 2D); falls back when a backend is unavailable; Lambda picks WebGL2 or 2D; also applies to Studio | VERIFIED | https://www.remotion.dev/docs/options/preferred-effect-backend |
| "Effects are grouped by adjacent backend while rendering." | VERIFIED | https://www.remotion.dev/docs/create-effect |
| `createEffect()` params: `type`, `label`, `documentationLink`, `backend` or `implementations`, `calculateKey`, `setup`, `apply`, `cleanup`, `schema`, `validateParams`. `apply` receives `source`, `target`, `state`, `params`, `width`, `height`, `gpuDevice`, `flipSourceY` | VERIFIED | same |

**Recommendation (my inference, UNVERIFIED):** the Satchel barrage was built and measured as one custom WebGL2 pass. A custom effect with `backend: 'webgl2'` stays WebGL2 whatever the preference is. If you also chain built-in effects, they now default to WebGPU, so a chain can mix backends ("grouped by adjacent backend"), which may add copies between groups. To keep one backend and the measured cost, set `Config.setPreferredEffectBackend('webgl2')` and keep `--gl=angle`, then compare against `auto` with `npx remotion benchmark`. I found no official statement on WebGPU availability in the headless shell on Apple Silicon.

### 1.5 Screen recordings in Remotion

There is **no official "screen recording" guide and no official auto-zoom or cursor-smoothing package** (VERIFIED by the docs sitemap, https://www.remotion.dev/docs-sitemap.xml , and npm). The building blocks are official; the choreography is ours.

**Embedding** (VERIFIED, https://www.remotion.dev/docs/video-tags , https://www.remotion.dev/docs/media/video , https://www.remotion.dev/docs/videos):

- Use `<Video>` from `@remotion/media` (Mediabunny and WebCodecs). It is frame-perfect, the fastest to render, loopable, and supports `effects`.
- Supported containers: `.mp4`, `.mov`, `.webm`, `.mkv`, `.m3u8` and audio containers. Supported codecs: **H.264, VP8, VP9**, AAC, MP3, Opus, FLAC, Vorbis. ProRes works in preview and render. **H.265 and AV1 are not in the `<Video>` list**; they fall back to `<OffthreadVideo>` at render and `<Html5Video>` in preview.
- CORS is required for remote URLs. Put recordings in `public/` and use `staticFile()`.

| Need | Prop or pattern | Notes |
|---|---|---|
| Place on the timeline | `from`, or wrap in `<Sequence>` | `from` on media since 4.0.446 |
| Trim the start | `trimBefore={frames}` | In composition frames |
| Trim the end | `durationInFrames={sourceFrames}` | `trimAfter` is **deprecated** on `<Video>` and `<Audio>`. The clip occupies `durationInFrames / playbackRate` timeline frames |
| Constant speed change | `playbackRate={2}` | Reverse is not supported. Pitch follows speed unless `preservePitch` (4.0.538). Mute screen recordings anyway |
| Different speeds per segment | `<Series>` of `<Video trimBefore={passedVideoTime} playbackRate={speed}>` with `premountFor` | Official snippet: https://www.remotion.dev/docs/videos/different-segments-at-different-speeds |
| Smooth speed ramp | Accumulate the speed function, then `<Sequence from={frame}><OffthreadVideo trimBefore={Math.round(remapped)} playbackRate={speed(frame)} /></Sequence>` | **"This does not work with `<Video>` from `@remotion/media` yet."** Use `<OffthreadVideo>` and append `#disable` to the URL. https://www.remotion.dev/docs/videos/accelerated-video |
| Speed up a whole scene, animations included | `<Sequence playbackRate={2}>` (4.0.528) | "must remain constant across frames" |
| Freeze frame | `<Sequence freeze={frame}>` (4.0.476) | Good for a hit-stop on a UI state |
| Crop | `cropLeft`, `cropRight`, `cropTop`, `cropBottom` (0 to 1, 4.0.500) | On `<Video>` and `<Sequence>` |
| Fit | `objectFit`, `style`, `className` | Size and position with CSS |
| Buffer before showing | `premountFor` (4.0.495) | Avoids a first-frame hitch in Studio |
| Preview memory | `maxCanvasSinkFrameSize={{width: 960}}` (4.0.530) | Preview only; render is unaffected |
| Loupe on a UI detail | `effects={[magnify({center:[x,y], magnification:200, size:180, feather:12})]}` | 4.0.542; `shape` circle or square. https://www.remotion.dev/docs/effects/magnify |
| Fake cursor | `<MacOSCursor>` from `@remotion/mac-cursors` | Animate `left`/`top` with a spring; scale it up for 1080p |
| Hide private data | `region-blur` effect | From the effects list |

**Zoom into a recording (pattern, UNVERIFIED as "official"):** wrap the `<Video>` in a div and animate `transform: scale()` with a `transformOrigin` at the click point, driven by `interpolate()`/`spring()` from a hand-written list of `{frame, x, y, zoom}` keyframes. Keep the transform on the wrapper, not on the video. Because videos are not upscaled by `--scale`, record at **2x the composition size at least in the regions you zoom** (a 4K or Retina recording for a 1080p film allows a 2x punch-in at native sharpness).

**Auto-zoom and cursor smoothing in code (third party, UNVERIFIED):**
- Remotion has no API for it. Tools in this genre record cursor position and clicks separately, then render their own cursor.
- A search turned up an MIT "Screen Studio Effects" repository described as the auto-zoom and spring-settling maths ported from Cap (open-source recorder), with a cursor pipeline of shake filter, densify, spring (tension 170, mass 1, friction 20). I did not open the repository; treat names and numbers as leads only.
- A macOS recorder write-up describes its cursor post-processing as: resample to timeline fps, clamp outlier jumps, detect stillness and snap to the median, smooth cursor-type flicker, normalise coordinates (https://dev.to/snazarofff/building-a-mac-screen-recorder-that-adds-zoom-animations-from-click-data-528m , search snippet only).
- Practical route for us: we control the demo, so **script the cursor**. Hide the real cursor while recording (or record UI states as stills), and draw `<MacOSCursor>` on a spring path between known targets. The zoom keyframes come from the same target list. This is deterministic and needs no cursor capture.

**Source recording advice:**

| Fact | Status | Source |
|---|---|---|
| "Variable frame rate ... is most common for screen recordings, where a frame is only sampled when the content has changed." Do not use the average frame rate of a VFR file; use Mediabunny's `computeFrameRateMetrics()` (`bestGuessFrameRate`, `frameRateIsConstant`) | VERIFIED | https://www.remotion.dev/docs/mediabunny/frame-rate |
| Remotion publishes no rule such as "convert to constant frame rate" or "record at 60" on the pages I read | VERIFIED (absence on the pages read) | `media/video`, `video-tags`, `videos/*`, `mediabunny/frame-rate` |
| Write animations in seconds times `fps` so the film can be rendered at 30 or 60 | VERIFIED | https://www.remotion.dev/docs/multiple-fps |

**Recommendation (my inference, UNVERIFIED):** macOS screen recordings are VFR and often HEVC. Before importing, transcode to **constant-frame-rate H.264** at an integer multiple of the composition rate, with a short GOP so seeks are cheap, and drop the audio:
`ffmpeg -i in.mov -vf "fps=60" -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -g 30 -an -movflags +faststart public/rec/x.mp4`
Record at 60 fps even for a 30 fps film: it gives clean 0.5x slow motion and 2x speed-ups without duplicate or dropped frames. If the film stays at 30 fps (the old pacing grid is 120 BPM = 15 frames per beat), 60 fps sources map 2:1.

### 1.6 Rendering

| Topic | Fact | Status | Source |
|---|---|---|---|
| GL backend | Values `angle`, `egl`, `swiftshader`, `swangle`, `vulkan`, `angle-egl`. Default in 4.0 is `null` (Chrome decides); in headless mode "Chromium disables the GPU". On a desktop with WebGL/WebGPU/Three.js, "`angle` is recommended". Default becomes `angle` in 5.0 | VERIFIED | https://www.remotion.dev/docs/gl-options , https://www.remotion.dev/docs/gpu |
| `angle` memory | "Memory leaks are a known problem with `angle`. We recommend to split up long renders into multiple parts" | VERIFIED | https://www.remotion.dev/docs/gl-options |
| What the GPU speeds up | WebGL, video decoding, `box-shadow`, `text-shadow`, gradients, `filter: blur()`, `drop-shadow`, `transform`, many 2D canvas operations | VERIFIED | https://www.remotion.dev/docs/gpu |
| Apple Silicon numbers | Without `--gl=angle`, GL and chained-SVG routes cost 11 to 20 times more; with it, each technique cost at most about 8 ms per frame at 1080p on an M5 Pro. `--gl=angle` changed edge anti-aliasing in non-GL scenes (0.6 to 2.7 % of pixels), so the old film rendered only the GL intro with `angle` and joined the parts | LOCAL | `/Users/razvanstatescu/Documents/Work/near/Satchel/marketing/notes/intro-research/tech.md`, `/Users/razvanstatescu/Documents/Work/near/Satchel/marketing/tools/render-master.sh` |
| Concurrency | `--concurrency <n or %>`: browser tabs rendering in parallel; max is the CPU thread count. The old film used 8 | VERIFIED / LOCAL | https://www.remotion.dev/docs/options/concurrency |
| Shared-memory capture | From 4.0.534 on Apple Silicon with macOS 15+, video renders pass uncompressed bitmaps to FFmpeg. **`imageFormat` and `jpegQuality` then have no effect.** Opt out with `--disable-shared-memory-capture` | VERIFIED | https://www.remotion.dev/docs/shared-memory-capture |
| CRF | H.264 range 1 to 51, **default 18**; lower is better. Cannot be combined with `--video-bitrate`. The old film used `--crf=16` because grain and scanlines are hard for H.264 | VERIFIED / LOCAL | https://www.remotion.dev/docs/encoding |
| x264 preset | `--x264-preset`, default `medium`; `slow` or `slower` for a master | VERIFIED | https://www.remotion.dev/docs/cli/render |
| ProRes | `--codec=prores --prores-profile=hq` to `.mov`. Profiles: proxy 45, light 102, standard 147, **hq 220 (default)**, 4444 330, 4444-xq 500 Mbps. No CRF. Default audio codec for ProRes is `pcm-16`. Alpha needs 4444, PNG frames and `yuva444p10le` | VERIFIED | https://www.remotion.dev/docs/prores , https://www.remotion.dev/docs/encoding |
| Hardware encoding | `--hardware-acceleration if-possible` uses VideoToolbox on macOS (ProRes, H.264, H.265). **Not compatible with `--crf`**; files are larger; use `--video-bitrate=8M` for 1080p H.264 | VERIFIED | https://www.remotion.dev/docs/hardware-acceleration |
| Colour space | `--color-space` values `default` (= `bt601`), `bt709`, `bt2020-ncl`. Default is `default`; "Export your video in `bt709` for more accurate colors"; it becomes the default in 5.0. PNG image format is recommended for accuracy where frames are still captured as images | VERIFIED | https://www.remotion.dev/docs/options/color-space , https://www.remotion.dev/docs/quality |
| Audio | `--audio-codec` (for example `aac`, `pcm-16`), `--audio-bitrate`, `--sample-rate` (default **48000**; "Match this to your source audio to avoid resampling artifacts"), `--separate-audio-to` | VERIFIED | https://www.remotion.dev/docs/cli/render |
| Pixel format | `yuv420p` (default), `yuv422p`, `yuv444p`, 10-bit variants, `yuva420p`, `yuva444p10le` | VERIFIED | same |
| Sharp text | A 1080p render looks soft on a 2x display; `--scale=2` renders 4K with vector content at full detail (text, SVG, large images; not videos) | VERIFIED | https://www.remotion.dev/docs/quality , https://www.remotion.dev/docs/scaling |
| Volume | Remotion sums tracks linearly and does no loudness processing | LOCAL | cookbook §5 |

**Recommendation for a YouTube master (my inference, UNVERIFIED):**
- Simple and proven here: `--codec=h264 --crf=16 --x264-preset=slow --color-space=bt709 --audio-codec=aac --audio-bitrate=320k`, then two-pass `loudnorm` to -14 LUFS / -1 dBTP with ffmpeg and re-mux (what `render-master.sh` does). YouTube re-encodes anyway, so a visually lossless H.264 upload is enough.
- If the master may be re-cut or re-graded: render `--codec=prores --prores-profile=hq` (audio `pcm-16` by default), keep it as the archive, and upload it or an H.264 made from it. ProRes HQ at 1080p30 for 2.5 minutes is roughly 4 GB.
- Consider `--scale=2` (3840x2160) for the upload: YouTube gives 4K uploads a better codec ladder, and UI text stays crisp. The cost is 4 times the pixels per frame, and any `<HtmlInCanvas>`/`<Solid>` needs `pixelDensity`, and recordings must be high-resolution to benefit.
- Set `Config.setColorSpace('bt709')` now; it is the 5.0 default.

### 1.7 Licence

| Fact | Status | Source |
|---|---|---|
| **Free License:** "For individuals and companies of up to 3 people. Create and automate, all features included, unlimited commercial use." | VERIFIED | https://www.remotion.dev/docs/license/pricing |
| Eligible: an individual (personal or commercial use); "an organization or team of individuals with up to 3 people"; non-profits; those evaluating. "Even if you are incorporated, you can operate under the Free License, as long as your total headcount is 3 or less." No account needed | VERIFIED | https://www.remotion.dev/docs/license/faq |
| Eligibility counts the company's **total headcount**, not the number of people using Remotion ("Our company has 20 people, but only one uses Remotion" still needs a licence) | VERIFIED | same |
| Agency case: if you deliver only a finished video file, the client's headcount does not count; contractors who operate Remotion on the project are added to yours | VERIFIED | same |
| **Company License** (4 people or more): Remotion for Creators **$25 per month per seat** (one per person who makes videos, including by prompting an agent; "AI agents" themselves need no seat); Remotion for Automators $0.01 per render, minimum $100 per month. Enterprise from $500 per month. Buy at https://www.remotion.dev/dashboard | VERIFIED | https://www.remotion.dev/docs/license/pricing |
| remotion.pro is retired | VERIFIED | release notes 4.0.543 |

For this project: if the maker (Nano Soft) has 3 people or fewer in total, the Free License covers the video. With 4 or more it needs one Creators seat ($25 per month) per person working on the video. I do not know the headcount.

### 1.8 Skills and AI docs for coding agents

| Fact | Status | Source |
|---|---|---|
| Official Agent Skills are installed with `npx remotion skills add` (in a Remotion project), `npx skills add remotion-dev/skills`, `gh skill install remotion-dev/skills`, or `npx create-video@latest --skills` | VERIFIED | https://www.remotion.dev/docs/ai/skills |
| Skills (13): `/remotion-best-practices` (umbrella), `/remotion-create`, `/remotion-markup`, `/remotion-studio`, `/remotion-render`, `/remotion-maps`, `/remotion-captions`, `/remotion-saas`, `/remotion-interactivity`, `/remotion-docs`, `/remotion-license` (4.0.540), `/remotion-upgrade`, `/remotion-multimedia` | VERIFIED | same, and https://github.com/remotion-dev/remotion/tree/main/packages/skills |
| Claude Code plugin: `claude plugin marketplace add remotion-dev/claude-code-plugin` then `claude plugin install remotion@remotion`; invoke as `/remotion:remotion-create` | VERIFIED | https://www.remotion.dev/docs/ai/claude-code-plugin |
| Plugins also exist for Codex, Cursor, GitHub Copilot CLI and Kimi Code. WebMCP lets an agent drive Remotion Studio | VERIFIED | https://www.remotion.dev/docs/ai/plugins , https://www.remotion.dev/docs/ai/webmcp |
| **There is no official system prompt page any more.** `https://www.remotion.dev/docs/ai/system-prompt` returns 404, and the AI section lists none. The only system prompt is a short example inside the code-generation guide | VERIFIED | https://www.remotion.dev/docs/ai/ , https://www.remotion.dev/docs/ai/generate |
| Docs are agent-readable: append `.md` to any docs URL, or send `Accept: text/markdown`. Index at https://www.remotion.dev/llms.txt (no `llms-full.txt`) | VERIFIED | https://www.remotion.dev/docs/ai/ |
| The skill on this machine (`~/.claude/skills/remotion-best-practices`, files dated 2026-02-25) is the **old single-skill layout** with 36 rule files. It predates effects, HtmlInCanvas, `@remotion/media` timing props and the deprecations above | LOCAL | `/Users/razvanstatescu/.claude/skills/remotion-best-practices/` |

Action: in the new video project run `npx remotion skills add` so the implementer gets the current skills, and tell it to prefer them (and `/remotion-docs`) over the February copy.

---

## 2. ElevenLabs API

Primary source: the live OpenAPI spec at https://api.elevenlabs.io/openapi.json (400 paths, fetched today) and the docs as markdown (append `.md`; index https://elevenlabs.io/docs/llms.txt). Base URL `https://api.elevenlabs.io`, header `xi-api-key`.

### 2.1 Text to speech

**Models** (VERIFIED, https://elevenlabs.io/docs/overview/models):

| Model id | Position | Limit per request | Notes |
|---|---|---|---|
| `eleven_v4` | "Our most emotive, high quality speech synthesis model". Recommended for "professional content, audiobooks & video narration" (with `eleven_multilingual_v2`) | 10,000 characters | 90+ languages. Settings: Stability and Similarity only (plus `clone_strength` for fine-tuned professional clones) |
| `eleven_v4_turbo` | Real-time, about 100 ms | | Half price |
| `eleven_v3` | "previous generation" expressive model | 5,000 | **Request stitching is not available** |
| `eleven_v3_conversational` | Real-time v3 | | |
| `eleven_multilingual_v2` | "Lifelike, consistent quality"; "Most stable on long-form generations" | 10,000 | 29 languages. Still the **API default `model_id`** in the spec. Supports `style`, `use_speaker_boost`, SSML `<break>` |
| `eleven_flash_v2_5`, `eleven_flash_v2` | Fast and cheap | 40,000 / 30,000 | `eleven_turbo_v2_5` and `eleven_turbo_v2` are deprecated in their favour |

**Use `eleven_v4` for narration** (unchanged from the old sheet). The docs say "Eleven v4 is a net upgrade over Eleven v3 ... We strongly recommend switching to v4". Always pass `model_id`; the API default is not v4.

**Timestamps** (VERIFIED, spec): `POST /v1/text-to-speech/{voice_id}/with-timestamps` (and `/stream/with-timestamps`) returns `{audio_base64, alignment, normalized_alignment}` with per-character start and end times. LOCAL from the old sheet: v4 timings are quantised to 40 ms and TTS alignment put the first word 0.10 s early, so use forced alignment on the final audio for captions.

**Controls on `eleven_v4`** (VERIFIED, https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4 and https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices):

| Control | Fact |
|---|---|
| Audio tags | Square-bracket tags direct delivery: `[whispers]`, `[sighs]`, `[excited]`, `[curious]`, `[sarcastic]`, `[laughs]`, `[pauses]`, free-form ones such as `[Quiet, measured narration]`, `[Gradually building energy]`, `[Quick, light, playful pace]`. "They're not perfect yet". A tag can be read as a sound-effect request (`[applause]`, `[gunshot]` produce sounds), so describe the voice quality explicitly |
| Pauses and pacing | "Eleven v4 and Eleven v3 do not support SSML break tags. Use audio tags, punctuation (ellipses), and text structure". Ellipses add pauses and weight; CAPITALS add emphasis |
| SSML | "Style and Speed sliders are not available in Eleven v4, and SSML is not supported." |
| Speed | **Conflict.** The page above says no Speed slider. The API schema still has `voice_settings.speed`, and the Nov 2 changelog says v4 history items "keep `clone_strength` and `speed`". LOCAL: the Satchel config notes "speed had no measurable effect". Treat `speed` as ineffective on v4 and time the read with text and tags, or time-stretch in ffmpeg |
| Pronunciation | IPA wrapped in slashes inside the text: `"/ˌbaɪoʊˈkemɪstri/"`. Pronunciation dictionaries: up to 3 locators per request |
| Determinism | `seed` (0 to 4294967295), best effort only |
| Normalisation | `apply_text_normalization`: `auto`, `on`, `off` |
| Model drift | "Eleven v4 is under active, continuous development ... its behavior may shift over time". Generate all final lines in one session and keep the files |

**Request stitching** (VERIFIED, spec and https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching): `previous_text`, `next_text`, `previous_request_ids`, `next_request_ids` (at most 3 ids each). If both `previous_text` and `previous_request_ids` are sent, the text is ignored. "The request IDs should be no older than two hours." Not available on `eleven_v3`; the guide's examples use `eleven_v4`. Unavailable in zero-retention mode.

**Request body** (VERIFIED, spec): `text`, `model_id`, `language_code`, `voice_settings{stability 0.5, similarity_boost 0.75, style 0, use_speaker_boost true, speed 1.0, clone_strength}`, `pronunciation_dictionary_locators`, `seed`, `previous_text`, `next_text`, `previous_request_ids`, `next_request_ids`, `use_pvc_as_ivc`, `apply_text_normalization`, `audio_effects{filter_preset_id, distance, environment_id, send_level, background_noise_id, pan}`. Reverb and pan produce stereo and are rejected for `pcm_*`, `ulaw_*`, `alaw_*`. Catalogue: `GET /v1/audio-effects/catalog`.

**Output formats** (VERIFIED, spec enum for `output_format`, default `mp3_44100_128`):
`mp3_22050_32, mp3_24000_48, mp3_44100_32/64/96/128/192, opus_48000_32/64/96/128/192, pcm_8000/16000/22050/24000/32000/44100/48000, wav_8000/16000/22050/24000/32000/44100/48000, ulaw_8000, alaw_8000`.

| Plan rule | Status | Source |
|---|---|---|
| "MP3 with 192kbps bitrate requires you to be subscribed to Creator tier or above." | VERIFIED | spec, `output_format` description |
| "PCM and WAV formats with 44.1kHz sample rate requires you to be subscribed to Pro tier or above." The text does not mention 48 kHz | VERIFIED | same |
| `mp3_44100_192` worked on the pay-as-you-go tier on 2026-10-22 | LOCAL | old tools.md §3 |
| Whether pay-as-you-go can get 44.1 or 48 kHz WAV/PCM | NOT VERIFIED | Probe with one short line |

There is no 48 kHz MP3 for speech (only Opus, PCM, WAV at 48 kHz). Remotion renders at 48 kHz by default, so either request `wav_48000`/`pcm_48000` if the plan allows it, or accept one resample from 44.1 kHz.

**Text to Dialogue** (VERIFIED, spec): `POST /v1/text-to-dialogue[/with-timestamps]`, `inputs[{text, voice_id}]`, default `model_id` `eleven_v3`, up to 10 voices, keep total text at or below 2,000 characters; supports `previous_text`/`future_text` (100 characters) and request ids. Only needed if the film has two voices.

### 2.2 Sound effects

`POST /v1/sound-generation?output_format=...` (VERIFIED, spec and https://elevenlabs.io/docs/overview/capabilities/sound-effects)

| Field | Fact |
|---|---|
| `model_id` | `eleven_text_to_sound_v2` (**API default; deprecated, removed 2027-03-01**) or `eleven_text_to_sound_v3` ("SFX v3"). "If your requests don't set `model_id`, set it explicitly" |
| SFX v3 vs v2 | v3 "follows prompts that contain several instructions more closely, handles prompts with music or vocals better, sounds more natural, and is less likely to clip on high-frequency sounds such as chimes and whistles". Exact repetition counts ("triangle hit 4 times") "are not always followed". Describe action, setting and performance, not a category |
| `duration_seconds` | Spec: 0.5 to 30, or null for automatic. The capability page says "Range: 0.1 to 30 seconds". **Maximum 30 seconds per generation** |
| `loop` | Boolean; "sound effect that loops smoothly" |
| `prompt_influence` | 0 to 1, default 0.3 |
| Output | Same enum as TTS. WAV formats were added on Oct 19. The capability page says "MP3 for all effects; WAV at 48 kHz for non-looping effects" |
| Cost | "40 credits per second when duration is specified"; API list price $0.12 per minute (see §2.5) |
| Concurrency | From Nov 9, per-plan SFX limits: 4 on Free and Starter, 6 on Creator and Pro, 8 on Scale and Business; over the limit returns `429` |
| New controls | None beyond the above. No seed, no negative prompt |

### 2.3 Music

Endpoints (VERIFIED, spec): `POST /v1/music`, `/v1/music/detailed` (multipart: JSON metadata plus audio; `with_timestamps`, `with_waveform_visual`), `/v1/music/stream`, `/v1/music/plan`, `/v1/music/stem-separation`, `/v1/music/video-to-music`, `/v1/music/upload`, `/v1/music/finetunes`. "The Music API is only available to paid users."

**Models** (VERIFIED, https://elevenlabs.io/docs/overview/models , spec enum `MusicModelID`):

| Model id | State |
|---|---|
| `music_v2_5` | "Our most advanced music model"; improved quality and prompt adherence over v2 |
| `music_v2` | Still available |
| `music_v1` | **Deprecated; "will be removed on January 31, 2027"**; replacement `music_v2_5`. It is still the **default `model_id`** in the spec |

No model newer than `music_v2_5` exists in the spec or the models page.

**Composition plan for `music_v2` and `music_v2_5`** (VERIFIED, spec `CompositionPlan`/`GenerationChunk`, and https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans):

```json
{ "chunks": [
  { "text": "[Intro]",
    "duration_ms": 8000,
    "positive_styles": ["cinematic electronic", "120 BPM", "A minor", "instrumental", "tight punchy drums", "analog synth bass", "polished production"],
    "negative_styles": ["vocals", "slow tempo"],
    "context_adherence": "high" }
] }
```

| Field | Rule |
|---|---|
| `chunks` | Up to 30. Each is a `GenerationChunk` or an `AudioRefChunk {song_id, range{start_ms,end_ms}}` (reuse existing audio unchanged) |
| `text` | Up to 6,132 characters. Optional section name in square brackets (`[Verse 1]`), lyric lines (at most 30 lines of 200 characters), and inline directions in braces (`{guitar solo}`, `{instrumental break}`) |
| `duration_ms` | 3,000 to 120,000 per chunk. Total 3 seconds to **10 minutes** |
| `positive_styles`, `negative_styles` | Up to 50 each, in English. "The styles for the first chunk are the most important ... Aim to have at least 6-7 styles in early chunks." Negative styles: leave empty unless you need to exclude something (schema) versus "use negative styles liberally" (guide) |
| `context_adherence` | `low`, `medium`, `high` (default) |
| `conditioning_ref`, `condition_strength` | Audio reference from a stored song (`AudioRefChunk`); strength `low`, `medium`, `high`, `xhigh`. Condition from the first chunk to affect the whole song |

The `music_v1` plan (`MusicPrompt`: `positive_global_styles`, `negative_global_styles`, `sections[{section_name, positive_local_styles, negative_local_styles, duration_ms, lines, source_from}]`) is unchanged and is an error on v2 models, and the reverse. In the request the old field name `music_prompt` is deprecated; use `composition_plan`. `POST /v1/music/plan` takes `{prompt (max 4,100 characters), music_length_ms, model_id, source_composition_plan}` and returns a plan in the format of the model you name.

**`POST /v1/music` body** (VERIFIED, spec): `prompt` **or** `composition_plan` (never both); `music_length_ms` 3,000 to 600,000 (prompt only); `force_instrumental` (prompt only); `generation_mode` `track | loop | ambience | video_to_music` (prompt only); `seed` (plan only; not exactly reproducible); `respect_sections_durations` (default true; **`music_v1` only; "for `music_v2` and `music_v2_5` section durations are always enforced"**); `lyrics_text`; `finetune_id`, `finetune_strength` (0 to 2]; `use_phonetic_names`; `store_for_inpainting`; `sign_with_c2pa` (mp3 only). `output_format`: `auto` (mp3_44100_128 for v1, mp3_48000_192 for v2), `mp3_48000_128/192/240/320`, the 44.1 kHz mp3 set, `pcm_8000` to `pcm_48000`, opus. No WAV container for music; use `pcm_48000` and wrap it, or `mp3_48000_320`.

| Question | Answer | Status | Source |
|---|---|---|---|
| Can a BPM be forced? | There is **no BPM parameter**. Put "120 BPM" and a key ("A minor") in the prompt or in `positive_styles`. "The model accurately follows BPM and often captures the intended musical key ... holds a stated BPM and key precisely enough to layer the output with other material" | VERIFIED | https://elevenlabs.io/docs/overview/capabilities/music/best-practices |
| Did that hold in practice? | A `music_v1` plan asking for 120 BPM measured 120.02 BPM with 6.7 ms jitter | LOCAL | old tools.md §4 |
| Can section durations be forced? | Yes: `duration_ms` per chunk, always enforced on v2 and v2.5 | VERIFIED | spec |
| Do events land on time? | "`music_v1` follows section intents better than `music_v2_5` (which ignored them), but places big events (drop, breakdown) a few seconds late" (four takes on the previous film) | LOCAL | `/Users/razvanstatescu/Documents/Work/near/Satchel/marketing/tools/audio-v3/music.mjs` header |
| Instrumental only | With a prompt: `force_instrumental: true`. With a plan: no lyric lines, "instrumental" in `positive_styles`, "vocals" in `negative_styles` (the guide's Outro chunk does this). On `music_v1`, empty `lines` means instrumental | VERIFIED (prompt flag, guide example) / LOCAL (v1) | spec, composition-plans guide |
| Stems | `POST /v1/music/stem-separation`, multipart `file`, `stem_variation_id` `two_stems_v1` or `six_stems_v1` (default), returns a ZIP. Works on any uploaded audio. Prompt tricks ("solo piano", "a cappella") also generate isolated parts | VERIFIED | spec, best-practices page |
| Inpainting | Generate with `store_for_inpainting: true` (song id is in the response headers), then reference ranges with `AudioRefChunk` (v2) or `source_from` (v1). External audio: `POST /v1/music/upload` (100 songs per 24 hours; screened for copyright; costs the same as generation) | VERIFIED | spec, https://elevenlabs.io/docs/eleven-api/guides/how-to/music/inpainting , changelog 2026-11-02 |
| Audio reference | Up to about 30 seconds of reference guides style, tempo and mood on v2 and v2.5 (paid plans) | VERIFIED | https://elevenlabs.io/docs/overview/capabilities/music |
| Video to music | `POST /v1/music/video-to-music` (API released Oct 19): 1 to 10 videos, 200 MB combined, up to 600 seconds; `description` (4,100 characters), `tags` (10), `model_id`, `add_sfx`, `separate_tracks` (ZIP with music and SFX apart), `use_audio_as_reference` | VERIFIED | spec, changelog 2026-10-19 |
| Commercial use | "Eleven Music is cleared for nearly all commercial uses, from film and television to podcasts and social media videos, and from advertisements to gaming", subject to the music terms per plan | VERIFIED | https://elevenlabs.io/docs/overview/capabilities/music |
| Plan terms (updated 2026-10-09) | Commercial use is permitted on every tier **except film, TV, radio and studio games** (only Enterprise Music lifts that). Free requires attribution; paid tiers do not. Eligibility: Free, Starter, Creator, Pro are "For Individual Use Only"; Scale is for individuals or entities with fewer than 10 employees; Business fewer than 50. Streaming distribution: Creator and above. API access: Starter and above. You must follow each platform's AI-disclosure rules | VERIFIED (summary) | https://elevenlabs.io/music-terms |
| YouTube Content ID | **The terms page does not mention Content ID** | VERIFIED (summary; absence) | same |

Two points for the owner: (1) a company account on Starter to Pro may not fit "For Individual Use Only"; read Exhibit A of the music terms before publishing. (2) Nothing official says the output is safe from Content ID claims; keep the generation receipts (song id, date, plan JSON), and expect to tick YouTube's "altered or synthetic content" disclosure as its policy requires.

### 2.4 New or changed since 2026-10 that helps video work

| Date | Item | Status | Source |
|---|---|---|---|
| Nov 9 | `scribe_v3` (recorded audio) and `scribe_v3_live`. Same endpoint `POST /v1/speech-to-text`; new `numbers_format` and `secondary_language_codes`. "27% fewer word errors than Scribe v2". `scribe_v1` is deprecated (replacement listed: `scribe_v2`) | VERIFIED | https://elevenlabs.io/docs/changelog/2026/11/9 , models page |
| Nov 2 | SFX v3 becomes the default in the app; in the API set `model_id` | VERIFIED | https://elevenlabs.io/docs/changelog/2026/11/2 |
| Nov 2 | Professional voice clones on v4; pronunciation dictionary expansion limit | VERIFIED | same |
| Oct 26 | `clone_strength` in `voice_settings`; Voice Changer moved to `POST /v1/voice-changer/{voice_id}` (old `/v1/speech-to-speech` path deprecated); legacy `/v1/dubbing` endpoints deprecated; TTS and STT requests cost at least 1 credit | VERIFIED | https://elevenlabs.io/docs/changelog/2026/10/26 |
| Oct 19 | Video to Music API; WAV output for sound effects; Eleven Realtime; Realtime Translation | VERIFIED | https://elevenlabs.io/docs/changelog/2026/10/19 |
| Current | Forced alignment unchanged: `POST /v1/forced-alignment`, multipart `file` (under 1 GB) and `text`; returns characters and words with times | VERIFIED | spec |
| Current | Voice design: `POST /v1/text-to-voice/design` and `/create-previews` (model `eleven_ttv_v3`); voice remixing: `POST /v1/text-to-voice/{voice_id}/remix` | VERIFIED | spec, models page |
| Current | **Image and Video API ("Flows")**: `POST /v1/flows/image`, `POST /v1/flows/video`, asynchronous (webhook or poll; video at most once per 10 s). Video model ids in the spec: `veo-3.1-generate-001`, `veo-3.1-fast-generate-001`, `bytedance-seedance-v2`, `-v2-fast`, `-v2-mini`, `bytedance-seedance-v2.5`, `creatify-aurora`. Image model ids: `gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-2.5-flash-image`, `bytedance-seedream-5-pro`, `-lite`, `gpt-image-1`, `gpt-image-1.5`, `gpt-image-2`, `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst` (no 2.6 yet) | VERIFIED | spec; https://elevenlabs.io/docs/eleven-api/guides/cookbooks/image-and-video |
| Current | Studio (video and audio projects; "Eleven v4 recommended") has an API: `/v1/studio/projects...`. Dubbing lives under `/v1/dubbing/project` | VERIFIED | https://elevenlabs.io/docs/llms.txt , changelog |
| Current | **Official remote MCP server**: `https://api.elevenlabs.io/v1/mcp`, OAuth, no API key. Add it as a custom connector; "The ElevenLabs connector listed in the Claude connector directory is a restricted version ... cannot generate images, video or music." Generations spend workspace credits and land on a Flow | VERIFIED | https://elevenlabs.io/docs/eleven-api/resources/mcp-server |
| Current | **Official agent skills**: repository `elevenlabs/skills` ("Collections of skills for building with ElevenLabs", pushed 2026-11-12) with folders `text-to-speech`, `sound-effects`, `music`, `speech-to-text`, `dubbing`, `voice-changer`, `voice-isolator`, `setup-api-key`, `agents`, and others | VERIFIED (repository listing only; contents not read) | https://github.com/elevenlabs/skills |
| Current | ElevenLabs CLI v1.7.1: `say` uses `eleven_v4` by default | VERIFIED | changelog 2026-10-26 |

For a scripted pipeline, keep calling the REST API with the existing helper. The MCP server is for interactive exploration, and it spends credits on every retry.

### 2.5 Pricing

API list prices from https://elevenlabs.io/pricing/api (VERIFIED (summary); the plan-to-row mapping was inferred by the summariser, so re-check before budgeting):

| Product | Price |
|---|---|
| TTS `eleven_v4`, `eleven_v3`, `eleven_multilingual_v2` | $0.08 per 1,000 characters |
| TTS `eleven_v4_turbo`, `eleven_v3_conversational`, Flash | $0.04 per 1,000 characters |
| Speech to text (Scribe v3, v2) | $0.20 per hour |
| Sound effects | $0.12 per minute |
| Music | $0.15 per minute |
| Forced alignment, image, video | Not listed on that page |

| Plan | Monthly price | Included (TTS characters; music minutes) |
|---|---|---|
| Free / pay as you go | $0 | 10,000; 3 |
| Starter | $6 | 75,000; 40 |
| Creator | $22 | 275,000; 147 |
| Pro | $99 | 1,238,000; 660 |
| Scale | $299 | 3,738,000; 1,993 |
| Business | $990 | 12,375,000; 6,600 |

Other credit facts (VERIFIED): "Credits were previously referred to as characters"; SFX cost 40 credits per second when a duration is set (sound-effects page); pay-as-you-go credits are prepaid, stored as a dollar value and last 12 months (https://elevenlabs.io/docs/overview/administration/billing); paid plans carry commercial rights for generated audio, the free plan requires attribution and is non-commercial. LOCAL: on the Satchel pay-as-you-go account the `character-cost` header is not a character count (13 for a 59-character line), and both music and SFX worked on that tier.

Scale for this film (my arithmetic, UNVERIFIED): 2.5 minutes of narration is about 2,200 characters, about $0.18 per full take; a 2.5-minute music take is about $0.38; 60 one-second SFX are about $0.12. Iterations dominate; the total stays in single dollars.

---

## 3. OpenAI image generation

Docs now live at `https://developers.openai.com/api/docs/...` (platform.openai.com/docs redirects there). Append `.md` for markdown.

### 3.1 GPT Image 2.6: it exists

| Fact | Status | Source |
|---|---|---|
| "Released GPT-Image-2.6 Sunburst and GPT-Image-2.6 Flare for image generation and editing, with adjustable complexity, SVG generation, and animated GIF generation. Added markup-guided editing for supported GPT-Image-2.5 and GPT-Image-2.6 models." Changelog entry dated **Nov 4, 2026** | VERIFIED | https://developers.openai.com/api/docs/changelog |
| Model ids: **`gpt-image-2.6-flare`** ("Image generation and editing for fast iteration") and **`gpt-image-2.6-sunburst`** ("for detailed visual work"). **No dated snapshot ids**; the only alias listed for each is the id itself | VERIFIED | https://developers.openai.com/api/docs/models/gpt-image-2.6-flare , https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst |
| There is no plain `gpt-image-2.6` id (the model page returns 404) | VERIFIED | https://developers.openai.com/api/docs/models/gpt-image-2.6 |
| Endpoints: **Image API only** (`v1/images/generations` and `v1/images/edits`). Responses API: not supported. Batch: not supported. (2.5 supports both the Responses image tool and Batch.) | VERIFIED | model pages |
| Pricing is the same as 2.5: text input $5, image input $8, image output $30 per million tokens (cached $1.25 and $2) | VERIFIED | model pages, https://developers.openai.com/api/docs/pricing |
| The SDK type `ImageModel` includes `'gpt-image-2.6-sunburst' \| 'gpt-image-2.6-flare'` since openai-node **7.51.0** (2026-11-05, commit `39b724a`). Latest openai-node is 7.56.0 (2026-11-12) | VERIFIED | https://github.com/openai/openai-node/blob/master/src/resources/images.ts , https://registry.npmjs.org/openai |
| OpenAI now names 2.6 as the replacement for `gpt-image-1-mini`, `gpt-image-1.5`, `chatgpt-image-latest` (shut down **Dec 1, 2026**) and `gpt-image-2` (shut down **Feb 10, 2027**, announced Nov 10). `gpt-image-1` was shut down on Oct 23, 2026. 2.5 is not on the deprecation list | VERIFIED | https://developers.openai.com/api/docs/deprecations |
| "OpenAI claims 2.6 generates images 50% faster than 2.5"; "an incremental upgrade"; one arena snapshot ranked 2.5 above 2.6 for text rendering | UNVERIFIED (reseller and aggregator blogs, which disagree with each other) | search results from cometapi.com, orcarouter.ai, glbgpt.com, braindetox.kr |
| ElevenLabs' Flows API lists the 2.5 ids but not 2.6 yet, so third-party gateways lag | VERIFIED | https://api.elevenlabs.io/openapi.json |

The implementer should still confirm with `GET /v1/models` that this key and organisation see both ids (the image guide says GPT Image models "may need ... API Organization Verification").

**What changed from 2.5** (VERIFIED, https://developers.openai.com/api/docs/guides/image-generation , section "GPT-Image-2.6", and the SDK source):

| New | Detail |
|---|---|
| `complexity` | `low`, `medium`, `high`. "controls how much the image model plans before rendering". **Default `high`** on both 2.6 models. Lower suits focused edits (a background, a sign); higher helps "dense text, complex layouts, and relationships between objects" but "can increase latency and introduce unwanted changes". No separate fee. Independent of `quality` |
| `markup` (edits only) | A transparent PNG overlaid on the first image to show where to edit (for example a red circle), with the change described in `prompt`. Must match the first image's dimensions and contain transparent pixels; at most 16,777,216 pixels and 50 MB; cannot be combined with `mask`; additional images act as references. The guide says it works on supported 2.5 and 2.6 models and its example uses `gpt-image-2.6-flare`; the SDK comment was edited on Nov 4 to say only "Supports GPT Image 2.5". Test on the model you use |
| `output_format: "svg"` (generations only) | The API makes a reference image, then an authoring model writes the SVG. `n` must be 1; no streaming, partial images or compression; no SVG edits. Optional `svg: {model, reasoning: {effort}}`, which "Requires ... access to SVG model selection". Billed as image tokens plus the author model's tokens (`svg_usage` in the response). Output is static vector: no scripts, external resources or embedded rasters |
| `output_format: "gif"` (generations and edits) | `frame_count` 2 to 16 (default 9); `frame_duration_ms` 20 to 2,000 (default 200, rounded to 10 ms); `size` `auto` or `WxH` in multiples of 16 within the model's GIF limits. No streaming, partial images, masks or compression. The SDK comment says "Requires access to the GIF preview for the selected model" |

### 3.2 Parameters on the newest models

`POST /v1/images/generations` (JSON) and `POST /v1/images/edits` (multipart). VERIFIED from https://github.com/openai/openai-node/blob/master/src/resources/images.ts and the image guide unless marked.

| Parameter | Values | Notes |
|---|---|---|
| `model` | `gpt-image-2.6-flare`, `gpt-image-2.6-sunburst`, `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst` (+ `-2026-09-08`), `gpt-image-2` | "Specify a model explicitly" |
| `prompt` | Up to 32,000 characters | |
| `size` | `1024x1024`, `1536x1024`, `1024x1536`, `auto`, or any `WIDTHxHEIGHT` | Custom sizes: both sides multiples of 16; aspect ratio between 1:3 and 3:1; neither edge above 3840; total pixels between 655,360 and 8,294,400; above `2560x1440` is experimental; maximum `3840x2160`. **These rules are written for `gpt-image-2` and 2.5; the docs do not restate them for 2.6** (NOT VERIFIED for 2.6; probe). `1920x1080` is invalid (1080 is not a multiple of 16); use `1920x1088` and crop, or `2560x1440`, or `3840x2160` |
| `quality` | `low`, `medium`, `high`, `xhigh`, `max`, `auto` (default) | "For the Sunburst and Flare models in both GPT-Image-2.6 and GPT-Image-2.5, the quality options are `low`, `medium`, `high`, `xhigh`, and `max`." |
| `complexity` | `low`, `medium`, `high` | 2.6; default high |
| `background` | `transparent`, `opaque`, `auto` | Transparent needs `png` or `webp`. Documented for 2.5 ("either model"); preview on `gpt-image-2`; **not stated for 2.6** (probe) |
| `output_format` | `png` (default), `jpeg`, `webp`, `gif`, `svg` (generations only) | `jpeg` is faster than `png` |
| `output_compression` | 0 to 100 | `jpeg` and `webp` only |
| `n` | 1 to 10 | 1 for SVG |
| `moderation` | `auto` (default), `low` | Generations |
| `stream`, `partial_images` | 0 to 3 partials | Each partial costs 100 extra output tokens |
| `safety_identifier` | String up to 128 characters | Replaces deprecated `user` |
| Response | Always `b64_json`, plus `usage`, `size`, `quality`, `background`, `output_format` | `response_format` and `style` are legacy and unsupported |
| Edits: `image` | One file or an array, **up to 16 images**, each `png`, `webp` or `jpg` under 50 MB | The 16-image sentence lists models up to 2.5; assume the same for 2.6 and probe |
| Edits: `mask` | PNG under 4 MB, same dimensions as the image, fully transparent areas mark the edit; applies to the first image | "Masking with GPT Image is entirely prompt-based. The model uses the mask as guidance, but may not follow its exact shape with complete precision." |
| Edits: `markup` | See §3.1 | Not with `mask` |
| Edits: `input_fidelity` | Only for `gpt-image-1.5` and `gpt-image-1-mini` | Omit for 2.x |

**Controls that do not exist** (VERIFIED by absence in the SDK parameter list): no `seed`, no style-reference or character-consistency parameter, no layout or typography parameter, no negative prompt, no image-to-video. Consistency comes from passing reference images to `/images/edits`. Documented limitations: "Text Rendering: Although significantly improved, the model can still struggle with precise text placement and clarity"; recurring characters and brand elements may drift; "difficulty placing elements precisely in structured or layout-sensitive compositions"; "Complex prompts may take up to 2 minutes".

**Pricing** (VERIFIED, https://developers.openai.com/api/docs/pricing): per million tokens, text input $5.00 (cached $1.25), image input $8.00 (cached $2.00), image output $30.00, the same for 2.6, 2.5 and `gpt-image-2`. Batch halves it for 2.5 and `gpt-image-2` (2.6 has no Batch). Cached input pricing applies only through the Responses tool, so not to 2.6. "Equal token rates don't mean equal cost per image: token consumption can differ by model and quality setting." LOCAL measurements on 2.5: a low-quality 1024x1024 generation used 196 output tokens (about $0.006); an edit with one reference about $0.014; latency 8.5 s (flare, low) and 18.8 s (sunburst, low edit). Higher quality and 2.6 were not measured; read `usage` on the first calls.

**Gotchas carried over** (LOCAL, old tools.md §2): a "transparent" subject came back with alpha 251 to 253, not 255, so clamp alpha before compositing; asking an edit to "isolate the object" re-rendered it, so generate on transparent from the start or use a mask; use timeouts of 300 s or more for high quality.

### 3.3 Which model for what (my recommendation, UNVERIFIED)

- Default to `gpt-image-2.6-flare` for iteration and `gpt-image-2.6-sunburst` for hero frames and precise edits, mirroring how the old film used the 2.5 pair. Keep 2.5 as a fallback: it has dated snapshots (reproducible behaviour) and Batch; 2.6 has neither.
- Use `complexity: "low"` with `markup` for local fixes to an approved plate, so the rest of the image does not change.
- SVG output could give editable vector ornaments, but brand rules say never to redraw the logo; do not use it for the mark.
- GIF output is at most 16 frames; it is a micro-loop, not b-roll.

### 3.4 OpenAI video

**There is no usable OpenAI video API.** "The Sora 2 models and Videos API were shut down on September 24, 2026 and are no longer available. No one-to-one replacement API is available." The deprecation was announced on Mar 24, 2026 and covers `sora-2`, `sora-2-pro` and their snapshots; the video guide "is retained for historical reference". The models index lists no video model. (VERIFIED: https://developers.openai.com/api/docs/guides/video-generation , https://developers.openai.com/api/docs/models/sora-2 , https://developers.openai.com/api/docs/deprecations .) The old sheet saw `sora-2` in `GET /v1/models` on 2026-10-22; a listed id is not a working endpoint. If short generated b-roll plates are wanted, the options are: the ElevenLabs Flows video API with Veo 3.1 or Seedance (§2.4; same key, credit-billed, price not listed on the API pricing page), another provider directly, or animating still plates in Remotion (parallax, `corner-pin`, light leaks, noise displacement), which is deterministic and free.

### 3.5 Content rules

I could **not open OpenAI's usage policies**: https://openai.com/policies/usage-policies/ and the image-and-video policy page return HTTP 403 to automated fetches. Everything in this subsection about policy wording is UNVERIFIED (search snippets).

| Point | Status |
|---|---|
| The usage policies list attempts to infringe others' intellectual property among prohibited uses, and bar using someone's likeness without consent in ways that could confuse authenticity | UNVERIFIED (search snippet) |
| An image-and-video policy page says the tools must not be used to create or distribute content "used to defraud, scam, or mislead others", including hiding that AI was used | UNVERIFIED (snippet from a mirror, not openai.com) |
| A search snippet reported an effective date of November 20, 2026 on the usage policies page, which would be a pending revision. Have a person open the page before publishing | UNVERIFIED |
| API-side controls: all prompts and images are filtered; `moderation: auto \| low`; blocked requests return `error.code = "moderation_blocked"` with optional `moderation_details`; do not auto-retry these | VERIFIED, https://developers.openai.com/api/docs/guides/image-generation |
| Nothing I could read addresses logos or screenshots specifically | VERIFIED (absence in the API docs) |

Practical rules for this film (my recommendation, consistent with the project's own rules):
- **Do not generate other companies' logos or UI.** Show Confluence, Jira, Bitbucket and Rovo only as real captures of the real product in use, or as neutral abstract shapes. Never ask the model for "an Atlassian-style" mark. The project brand rules already forbid Atlassian blue or Atlassian-like marks near the logo.
- **Do not present a generated image as a real screenshot.** Product UI in the film should be real recordings or UI rebuilt in React from the real app. Generated images are for backgrounds, textures, plates and metaphors.
- Generated UI text is unreliable anyway (documented limitation), which is a second reason to build UI in code.
- If generated footage could be mistaken for real events, YouTube's disclosure setting applies.

---

## 4. What can be reused from the Satchel film

Root: `/Users/razvanstatescu/Documents/Work/near/Satchel/marketing`. All LOCAL. Nothing there was edited or run today. Licence note: `video/package.json` declares `AGPL-3.0-only`; the owner is the same person, but copying into another repository carries that label unless he relicenses.

### 4.1 Helpers (`tools/lib`, ESM, Node built-ins only)

| Path | What it does | Change needed |
|---|---|---|
| `tools/lib/http.mjs` | `request()` with retries on 408/409/425/429/5xx, backoff with jitter, `Retry-After`, fast-fail on quota errors, no header logging, scrubbed error bodies | None. Tests: `node --test tools/tests/http.test.mjs` |
| `tools/lib/env.mjs` | Loads `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` from `$MARKETING_ENV_FILE` or `marketing/.env` without printing | Point it at the new project's env file. Do not reuse the doc-drift `.env` (it holds Bitbucket credentials) |
| `tools/lib/eleven.mjs` | `tts()` with timestamps and stitching fields, `alignmentToWords()`, `sfx()`, `musicPlan()`, `music()`, `stt()`, `align()`, voices, subscription | **Defaults are stale:** `sfxModel: 'eleven_text_to_sound_v2'` to `eleven_text_to_sound_v3`; `sttModel: 'scribe_v1'` to `scribe_v3`; `musicModel: 'music_v1'` (deprecated, works until 2027-01-31; choose deliberately, see §2.3); `musicFormat: 'mp3_44100_128'` to `mp3_48000_320` or `pcm_48000`. `musicPlan()` is documented as returning the v1 shape; with `music_v2_5` it returns `{chunks[]}`. Optional additions: `audio_effects`, `voice_settings.clone_strength`, `stem-separation`, `video-to-music`, `wav_*` formats for SFX |
| `tools/lib/openai-image.mjs` | `generate()` and `edit()` for the Image API, returns Buffers with `usage` | `DEFAULT_MODEL = 'gpt-image-2.5-flare'` to `gpt-image-2.6-flare`. Add `complexity`, `markup` (multipart file, edits), `outputFormat: 'gif' \| 'svg'`, `frame_count`, `frame_duration_ms`, `svg`. SVG and GIF results are still base64 in `b64_json` but are not PNGs: write the right extension |
| `tools/examples/{tts,sfx,music,stt,image}.mjs`, `args.mjs` | One-file CLI examples for each helper | Update model ids in any hard-coded defaults |

### 4.2 Timing and audio pipeline

| Path | What it does | Change needed |
|---|---|---|
| `tools/beats.mjs` | Beat grid from an audio file with Node and ffmpeg only: onset envelope, tempo by autocorrelation, dynamic-programming beat tracking, least-squares constant grid, downbeats. Outputs `beatFrames`, `downbeatFrames`, `gridRmsMs`. Validated to 2.5 ms on a click track | None. Run it on the final music take and cut on its frames |
| `tools/audio-v3/run.mjs` | One command: voice lines (cached per line), QA, timeline; `--music` re-composes the score from the timeline | Project-specific script and cue names |
| `tools/audio-v3/vo.mjs`, `config.mjs`, `audition.mjs` | Per-line TTS on `eleven_v4`, edge clean-up of trailing bursts and inhales, narrator auditions; voice and model in `config.mjs` | New script lines and voice; note the config comment that `speed` had no effect on v4 |
| `tools/audio-v3/music.mjs`, `arrange.py`, `arrangement.json` | Builds a composition plan whose sections follow the film timeline; already contains **both** the v1 (`sections`) and the v2/v2.5 (`chunks`) plan builders; arranges the take against the picture | Model choice (`MUSIC.model`), new cue list. Keep its lesson: v1 placed big events a few seconds late and v2.5 ignored section intents in their takes, so compose with slack and align in the arrangement step |
| `tools/audio-v3/timeline.mjs`, `lib.mjs` | Derives `timeline.json` (frame positions for every voiced line and cue) from measured audio | Schema is film-specific; the approach transfers |
| `tools/audio-v3/intro-*.mjs` | Sound design for the barrage intro (bridge, chorus, M0) | Only if a barrage-style open is used |
| `tools/sfx2/{specs,generate,process,composite,inspect}.mjs`, `choice.json` | SFX catalogue as specs, batch generation, trimming and peak-time measurement (so the peak lands on the cut), composites, QA report | `process.mjs` labels the source as `eleven_text_to_sound_v2`; switch generation to v3 and re-audition, since v3 sounds different |
| `tools/audio/` and `tools/sfx/` | Earlier versions of the same pipelines (brand 1.0 film) | Prefer `audio-v3` and `sfx2` |
| `video/src2/AudioLayer.tsx`, `video/src2/lib/Sfx.tsx`, `video/src2/data/{timeline,beats,sfx}.json` | The Remotion side: mounts voice, music bed with ducking, and SFX from the JSON data | `trimAfter` is deprecated on `@remotion/media` `<Audio>`; use `durationInFrames`. `preservePitch` is available. Mount the bed at frame 0 (volume callbacks count from the audio's own start) |

### 4.3 Render and QA

| Path | What it does | Change needed |
|---|---|---|
| `tools/render-master.sh` | Typecheck, render (GL intro with `--gl=angle`, body without, then an exact join with stream-copied video and per-part decoded audio), limiter plus two-pass `loudnorm` to -14 LUFS / -1 dBTP, AAC 320k, faststart, start-offset check, flash screen | Composition ids and paths. Its join logic exists because `--gl=angle` changed anti-aliasing in the non-GL body; re-measure on 4.0.543 and Chrome 158 before keeping the split. Add `--color-space=bt709`. `Config.setJpegQuality(92)` in `video/remotion.config.ts` now has no effect on video renders on this Mac (shared-memory capture) |
| `video/src2/scenes/H0/qa/flashcheck.py` (also `video/src-proto/scripts/flashcheck.py`) | WCAG 2.3.1 flash screen on a rendered clip: relative luminance per frame and per sliding window, saturated-red check, flashes per second; exit code 1 on failure. Needs numpy. Run with `python3 -I` | None. It is a screen, not a sign-off |
| `video/src-proto/scripts/{bench,gldiff,stills}.mjs` | Per-technique render benchmark, pixel diff between GL settings, still export | Use `bench.mjs` to compare `preferredEffectBackend` `webgl2` and `auto` |

### 4.4 Barrage shader and looks

| Path | What it does | Change needed |
|---|---|---|
| `video/src2/scenes/H0/fx/barrageShader.ts` | One WebGL2 fragment shader with wave, turbulence warp, RGB split, slices, scanlines, grain, vignette, directional and zoom blur, grade, flash; deterministic integer-hash noise; `setupBarrage`, `uploadBarrage`, `drawBarrage`, `cleanupBarrage` | None expected |
| `video/src2/scenes/H0/fx/barrageFx.ts` | The shader as a Remotion effect: `createEffect({backend: 'webgl2', ...})`, used as `<HtmlInCanvas effects={[barrageFx(look)]}>` | Still valid: "The existing single-backend form remains supported." Optional: move to `implementations: {webgl2: createEffectImplementation(...)}`. Render-test on 4.0.543 |
| `video/src2/scenes/H0/fx/looks.ts`, `motion.ts` | Look builders (`waveLook`, `warpLook`, `rgbLook`, `slicesLook`, `screenLook`, `motionLook`, `mergeLooks`, `stepSeed`) and camera paths whose velocity drives the blur | Retune intensities for a calmer brand; the Doc Drift voice is "calm, specific" |
| `video/src-proto/fx/{FramePost,GlImage,Tunnel,Slices,ScreenOverlay,SvgFx}.tsx`, `camera.ts`, `video/src-proto/lib` | `<FramePost look>` (HtmlInCanvas plus the effect), raw WebGL image, CSS 3D tunnel, slice glitch, scanline and grain overlays, SVG filter fallbacks, `punchAt`/`whipAt` camera, seeded helpers (`burst`, `shake`, `remap`) | Prototype copies; the shipped versions are in `src2/scenes/H0`. With 4.0.542 make sure every `<Img>` inside `<HtmlInCanvas>` is same-origin (`staticFile`) or CORS-enabled |
| `video/src2/scenes/H0/{Barrage,Tunnel,Turn,Sound}.tsx`, `timing.ts`, `plates.ts` | The reference choreography: cut list, hit-stop, slap, freeze and peel turn | Structure transfers; content is Satchel's |

Pitfalls from `tech.md` §6 that still apply: render WebGL with `--gl=angle`; one `FramePost` for the whole chaos (Chrome keeps about 16 WebGL contexts; 4.0.540 now recovers after context loss, but do not lean on it); `<Img effects>` runs at natural image size unless `effectsOutputSize` or numeric dimensions are set; build the chaos as a pure function of a frame prop so it can freeze; no `Math.random()`; SVG filter ids must be unique and sanitised; glitch peaks only on the cut frame; at most 3 flashes per second.

### 4.5 Motion kit and components

| Path | What it is |
|---|---|
| `video/src2/lib/time.ts`, `timeline.ts` | `s()`, `EASE`, `SPRING`, `tween`, `springAt`; timeline loader. The easing and spring tables are in cookbook §2 |
| `video/src2/motion/{motion.ts,tokens.ts,camera.tsx,fx.tsx,type.tsx,transitions.tsx,ui.tsx,ink.tsx,script.tsx,index.ts}` | The reusable motion layer: camera rig, type animation, custom transitions, UI motion helpers. `HandOff.tsx`, `Sticker.tsx`, `StickerS.tsx` are Satchel-specific |
| `video/src2/transitions.ts`, `Main.tsx`, `Root.tsx`, `scenes/registry.ts`, `scenes/SceneStub.tsx` | Scene registry and composition wiring driven by `data/timeline.json` |
| `video/src2/components/ui/kit.tsx` and the screen components | Product UI rebuilt in React for the film (Satchel screens). The pattern, not the content, transfers: rebuild Confluence-side UI as components instead of filming everything |
| `video/src2/illustration/**`, `video/src2/brand/**` | Satchel illustrations, logo and tokens. Not reusable; Doc Drift has its own brand in `/Users/razvanstatescu/Documents/Work/doc-drift/brand/` |
| `tools/capture/{capture.mjs,capture-v2app.mjs}` | Scripted browser capture of app screens with a manifest | Reusable approach for capturing the Forge app's UI states at 2x |
| `tools/images/{gen.mjs,shots.mjs,catalog.mjs,contact.mjs}`, `gen-log.jsonl` | Image shot list, batch generation with a log, contact sheets | Change the model id; add `complexity` |
| `notes/hypermotion-cookbook.md` | Pacing grid (120 BPM = 15 frames per beat at 30 fps), read-time formula `hold_frames = fps × max(0.8 + 0.25 × words, chars / 15)`, SFX placement and mix levels, render traps. **Its claim that shader transitions cannot render is outdated** (see §1.3) | Read §0, §2, §4, §5 |

---

## 5. Not verified, and the probes that would settle it

| Open point | Cheapest check |
|---|---|
| This key and organisation can call `gpt-image-2.6-flare` and `-sunburst` (organisation verification may be required) | `GET https://api.openai.com/v1/models` (free) |
| Size rules, `background: transparent`, `xhigh`/`max` and 16 references on 2.6 specifically (the docs state them for 2.5) | One `low` 1024x1024 generation with `background: transparent`, and one `1920x1088` |
| GIF and SVG output are gated ("GIF preview", "SVG model selection") for this account | One low-quality request each |
| `markup` on 2.6 (guide says yes, SDK comment says 2.5) | One low-quality edit |
| OpenAI usage policy wording on trademarks, logos, deceptive imagery; possible revision effective 2026-11-20 | A person opens https://openai.com/policies/usage-policies/ |
| The "50% faster" claim and quality differences for 2.6 | Time the probes above |
| Whether `voice_settings.speed` does anything on `eleven_v4` | One line at 0.9 and 1.1; compare durations |
| Whether the ElevenLabs account tier allows `wav_48000`/`pcm_48000` (TTS) and 192 kbps | One short line |
| Current ElevenLabs tier, credits and model list | `GET /v1/user/subscription`, `GET /v1/models` (free) |
| ElevenLabs music terms per plan ("For Individual Use Only" on Free to Pro) and the absence of any Content ID statement | A person reads Exhibit A at https://elevenlabs.io/music-terms |
| ElevenLabs pricing table mapping | Re-read https://elevenlabs.io/pricing/api in a browser |
| `music_v2_5` versus `music_v1` for hitting cue times | One 30-second take per model from the same plan, then `beats.mjs` |
| Remotion: WebGPU versus WebGL2 effect backend on this Mac; whether `--gl=angle` still shifts anti-aliasing on Chrome 158 | `npx remotion benchmark` and `gldiff.mjs` |
| Remotion: old Satchel code typechecks and renders on 4.0.543 | `npx tsc --noEmit` and one `npx remotion still` per effect |
| Screen-Studio-style auto-zoom maths (Cap, "Screen Studio Effects") | Open the repositories; I only saw search summaries |
| Remotion licence need | Count the maker's total headcount (3 or fewer is free) |
| YouTube master settings in §1.6 and the CFR transcode in §1.5 | They are my recommendations, not vendor statements |
