// Doc Drift Sentinel launch film. Remotion 4.0.543 (every remotion and @remotion/* package pinned to that exact version).
// Flags on the command line win over these. See README.md for Studio, stills and the master render.
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/index.ts");
Config.setOverwriteOutput(true);

// SECURITY: the CLI copies every variable of its dotenv file into the browser bundle's process.env. video/.env holds
// the OpenAI and ElevenLabs keys for the tools, so Remotion reads this key-free file instead (it must exist).
Config.setDotEnvLocation("remotion.env");

// The first frame can wait 20+ s for the GPU process when other Chrome instances are busy (seen 2026-11-13); the
// default 30 s limit then fails the render. A missing font or file still fails fast.
Config.setDelayRenderTimeoutInMilliseconds(90000);

// bt709 is the Remotion 5.0 default and what YouTube expects; PNG frames keep flat brand colours and hairlines exact
// before the encoder sees them. (On this Apple Silicon Mac, shared-memory capture passes raw bitmaps to FFmpeg and the
// image format then has no effect on video renders; it still applies to stills and other machines.)
Config.setColorSpace("bt709");
Config.setVideoImageFormat("png");

// Built-in effects default to WebGPU since 4.0.540. Pin WebGL2, the backend the Satchel barrage was measured on, so a
// chain of effects never mixes backends. WebGL scenes (A0's barrage) are rendered with --gl=angle by tools/render-master.sh.
Config.setPreferredEffectBackend("webgl2");
