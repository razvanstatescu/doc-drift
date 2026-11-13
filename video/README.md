# Doc Drift Sentinel launch film (Remotion)

A 2:30 hypermotion film, 1920x1080 at 30 fps, 120 BPM (a beat is 15 frames, a bar 60). Read [BRIEF.md](BRIEF.md)
first; it wins over everything else. Research: [../docs/video/research.md](../docs/video/research.md). Brand:
[../brand/](../brand/).

Remotion 4.0.543 (every `remotion` and `@remotion/*` package pinned to exactly that version), React 19.3.1.

## Run it

Node 24 only. Start every shell command with `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && ...`, from `video/`.
Use a port of your own in 3500-3599, never 3000.

| Task | Command |
| --- | --- |
| Studio | `npx remotion studio --port=35xx` |
| Typecheck | `npx tsc --noEmit` |
| A still | `npx remotion still src/index.ts <Composition> out/<name>.png --frame=N --scale=0.5 --port=35xx` |
| A short check render | `npx remotion render src/index.ts <SceneId> out/<name>.mp4 --frames=0-89 --scale=0.5 --port=35xx` |
| Many stills, one bundle | `npx remotion bundle src/index.ts --out-dir=<tmp>`, then `npx remotion still <tmp> ...` |
| Master (director only) | `bash tools/render-master.sh v1` writes `out/doc-drift-v1.mp4` |

`render-master.sh` typechecks, renders `A0` with `--gl=angle` (the barrage is WebGL) and `Body` without it, joins
them frame- and sample-exact, then applies a limiter and two-pass `loudnorm` (-14 LUFS, -1 dBTP), AAC 320k,
faststart, H.264 `--crf=16 --x264-preset=slow --color-space=bt709`, and runs `tools/qa/flashcheck.py` on the A0 part.
Options: `SINGLE=1` (Main in one pass), `SKIP_RENDER=1` (re-join and re-master existing parts), `FRAMES=0-59` (a short
test of the whole pipeline), `PORT` (default 3500), `CONCURRENCY` (default 8).

## Compositions

| Id | What |
| --- | --- |
| `Main` | The whole film: every scene at its span from `src/data/timeline.json`, the scene cuts in `src/transitions.ts`, the global voice and score |
| `Body` | The film from the end of A0 (the split render's second part) |
| `Scenes/A0` ... `A4` | One scene alone, with its slice of voice and score. `A0` is also the split render's first part |
| `Dev/Kit` | The kit gallery on Night and Day, one page per 120 frames (`kitFrame(page, f)` in `src/Kit.tsx`) |

## Layout and owners

Agents write only in their own folders (BRIEF section 4).

| Path | Owner | What |
| --- | --- | --- |
| `package.json`, `remotion.config.ts`, `remotion.env`, `tsconfig.json`, `src/index.ts`, `src/Root.tsx`, `src/Main.tsx`, `src/Kit.tsx`, `src/transitions.ts` | Kit agent (transitions also the director) | Config and wiring. Nobody else runs `npm install` |
| `src/brand/` | Kit agent | `tokens.ts` (Night, Day, type ramp, radii, shadows), `theme.tsx` (`<World>`, `useTheme`), `fonts.ts`, `Mark.tsx`, `Lockup.tsx`, `Badge.tsx`, `icons.tsx` |
| `src/lib/` | Kit agent | `time.ts` (frames, beats, easings, springs, `holdFrames`), `timeline.ts`, `captures.ts` (captures and plates), `files.ts` |
| `src/motion/` | Kit agent | `slip.tsx` (slip, trace, snap back, slip cut), `camera.tsx`, `text.tsx` (`SetIn`), `whip.tsx`, `counter.tsx` |
| `src/components/` | Kit agent | `BrowserFrame`, `Shot`, `Cursor`, `Caption`, `QuoteCard`, `Terminal`, `Chip`/`Code`, `AnchorLines`, `StatCard`, `Timer`, `SceneStub`. Scene builders may add `src/components/<scene>/` |
| `src/audio/` | Kit agent | `AudioLayer` (voice and score, ducked), `Sfx`, `mix.ts` |
| `src/scenes/<ID>/`, `src/scenes/registry.ts` | That scene's builder (registry: kit agent) | One folder per scene; stubs until built |
| `src/data/timeline.json`, `sfx.json`, `public/vo/`, `public/music/`, `public/sfx/`, `tools/audio/`, `tools/sfx/` | Audio agent | |
| `src/data/plates.json`, `public/plates/`, `public/clips/`, `public/gen/`, `tools/plates/`, `tools/images/`, `CREDITS.md` | Evidence agent | |
| `src/data/captures.json`, `public/captures/`, `tools/capture/` | Capture agent | |
| `public/brand/`, `public/fonts/`, `public/kit/` | Kit agent | Exact logo files; Spline Sans and Mono (OFL, local woff2); the Kit's 2x sample capture |
| `tools/render-master.sh`, `tools/qa/`, `out/` | Kit agent builds, the director runs full renders | |

## Building a scene

A scene is a component with no props, default-exported from `src/scenes/<ID>/index.tsx`. It reads its timing from
the timeline and never hard-codes film frames, so a new voice take re-times it.

```tsx
import { World } from "../../brand/theme";
import { Caption } from "../../components/Caption";
import { Sfx } from "../../audio/Sfx";
import { getScene } from "../../lib/timeline";
import { holdFrames } from "../../lib/time";

const A1: React.FC = () => {
  const sc = getScene("A1"); // local frames: 0 = this scene's first frame (memoised)
  const t = sc.cue("V05", "end"); // where V05 ends
  return (
    <World theme="night">
      <Caption at={t} out={t + 15 + holdFrames("A date can't see a merge.")} center>A date can't see a merge.</Caption>
      <Sfx id="tick" at={sc.wordAt("V03", "rollback")} />
    </World>
  );
};
export default A1;
```

- `getScene(id)`: `from`, `durationInFrames`, `lines`, `cue(line, "start" | "end")`, `word(line, n)`,
  `wordAt(line, prefix)`, `marker(name)` (local), `beat(n)`, `bar(n)`, `snap(f)` (to the film's beat grid, which runs
  from the reveal), `toLocal` and `toAbs`. A wrong line id throws; a word not found falls back to the line's start
  with a console warning.
- Worlds: Night for A0 and A1, Day from A2 (`<World theme>`; `ground="black"` for the cold open). Every kit component
  follows the nearest `World`, or takes a `theme` prop.
- Text: `SetIn`/`Caption` set in over 15 frames and then hold still. Give each text `holdFrames(text)` from the moment
  it is still. Sizes: `typeStyle("hero" | "headline" | "title" | "body" | "small" | "credit" | "literal" | "literalLg")`.
- The slip: `<Slip at back>` around the shot's one amber element (trace and glow included), `slipProgress()` for
  custom pieces, `<SlipCut at from to>` inside a scene. The A1 to A2 cut is wired in `src/transitions.ts`: A1's last
  frame is held and split over A2's first 8 frames, so A1 should end on its final pose and A2 open already composed.
- Real UI: `<BrowserFrame>` around a `<Shot id>` from `captures.json`. Shot coordinates (crop, punch-in `keys`,
  `loupe`, `cursor`, masks) are capture px (2x of CSS). Masks in `captures.json` are always drawn. A missing capture
  shows a labelled placeholder. The loupe defaults to a sharp DOM copy; `kind: "effect"` uses `magnify()`.
- Sound: `<Sfx id at>` puts the effect's PEAK on local frame `at` (`slip` at `at + 6`, `snap` at `back + 2`). Unknown
  ids and missing files render nothing. The voice and score play from `AudioLayer`; do not add them in scenes.
- Literals in Spline Sans Mono only (`<Code>`, `<Chip>`, `<Terminal>`). Spline Sans has no arrow glyph: write `->` in
  `<Code>`/`<Chip>` and it is drawn as the brand arrow icon.
- Deterministic only: no `Math.random()` (use `random(seed)` from remotion), no CSS animations or transitions, and
  read `useCurrentFrame()` inside the component that moves.

## Notes

- `remotion.config.ts` points Remotion's dotenv loading at `remotion.env` (empty). The CLI copies every variable in
  its dotenv file into the browser bundle, and `video/.env` holds API keys. Never put a secret in `remotion.env`.
- On this Mac the first frame sometimes waits 20 s or more for the GPU process while other Chrome instances are busy;
  the delayRender timeout is 90 s for that reason.
- Fonts load from `public/fonts/` with `@remotion/fonts`; a missing file fails the render instead of falling back.
