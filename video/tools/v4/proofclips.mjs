#!/usr/bin/env node
// Pre-cut proof clips (Kit owner; V4.md P2, R3 section 4 "trim each proof clip to the seconds used before the render").
//
// A ProofFrame that plays a recording decodes the 4K 60 fps capture: on a short range render each tab seeks the 4K
// stream on its own (a 45-frame recording proof cost 35 s at concurrency 6, against 6 s for a crafted shot). This tool
// cuts the regions and seconds the proofs use out of the recordings into small 30 fps clips in public/clips/v4/
// (git-ignored), and writes src/v4/kit/proofclips.json, which ProofFrame reads: it plays a clip only when the clip
// holds the whole region and every second the proof shows; otherwise it plays the 4K capture, so a missing or stale
// clip can never change a frame.
//
// Never a restyle: same pixels (crop only), same pixel format and colour tags as the capture (yuvj420p, bt470bg, full
// range), visually lossless (crf 10), frames at exact 1/30 s steps of the source (60 fps), so a clip frame IS the
// capture frame the 4K path would show.
//
//   node tools/v4/proofclips.mjs                 # cut every request below (skips clips that exist)
//   node tools/v4/proofclips.mjs --force         # re-cut all
//   node tools/v4/proofclips.mjs --extra my.json # more requests: [{ "capture": "...", "crop": [x, y, w, h], "t0": s, "t1": s }]
//   node tools/v4/proofclips.mjs --list          # print the requests and exit
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = join(ROOT, "public");
const OUT_DIR = join(PUBLIC, "clips", "v4");
const MANIFEST = join(ROOT, "src", "v4", "kit", "proofclips.json");
const CAPTURES = JSON.parse(readFileSync(join(ROOT, "src", "data", "captures.json"), "utf8")).captures;
const FPS = 30;

// The recording proofs of R3 section 6 (crops in capture px, seconds of the recording). Margins below cover nearby
// choices (a crop a little wider, a segment a little earlier or later, the reframe after a jump).
// `scale` and `after` (the request of the segment before a jump) let the tool also cut the area the mat shows while it
// reframes from the previous crop to this one (ProofFrame computes the same region).
const REQUESTS = [
  { id: "R1", capture: "p1-anchor-rec", crop: [1440, 300, 1460, 360], scale: 0.75, t0: 3.97, t1: 4.97 },
  { id: "R5a", capture: "p2-merge-rec", crop: [1320, 120, 1200, 880], scale: 0.8, t0: 4.88, t1: 5.38 },
  { id: "R5b", capture: "p2-merge-rec", crop: [700, 180, 2260, 580], scale: 0.6, after: "R5a", t0: 13.3, t1: 14.3 },
  { id: "R11", capture: "p3-rovo-v2-rec", crop: [2990, 220, 840, 580], scale: 0.9, t0: 24.0, t1: 25.0 },
  { id: "R14a", capture: "p4-review-rec", crop: [1170, 1330, 1500, 290], scale: 0.85, t0: 38.0, t1: 38.5 },
  { id: "R14b", capture: "p4-review-rec", crop: [1170, 1650, 1500, 260], scale: 0.85, after: "R14a", t0: 41.6, t1: 42.1 },
  { id: "R16a", capture: "p4-accept-rec", crop: [1120, 1820, 1600, 170], scale: 0.8, t0: 12.0, t1: 12.5 },
  { id: "R16b", capture: "p4-accept-rec", crop: [1120, 470, 1600, 280], scale: 0.8, after: "R16a", t0: 17.6, t1: 18.1 },
];

const args = process.argv.slice(2);
const force = args.includes("--force");
const extraAt = args.indexOf("--extra");
const requests = [...REQUESTS];
if (extraAt >= 0) {
  const extra = JSON.parse(readFileSync(resolve(args[extraAt + 1]), "utf8"));
  requests.push(...extra.map((r, i) => ({ id: r.id ?? `extra${i}`, ...r })));
}
if (args.includes("--list")) {
  for (const r of requests) console.log(`${r.id}\t${r.capture}\t[${r.crop.join(", ")}]\t${r.t0} to ${r.t1} s`);
  process.exit(0);
}

const even = (v) => 2 * Math.round(v / 2);

/** The crop grown to the previous segment's mat (the reframe after a jump), centred on the crop, as ProofFrame does. */
function reframeBox(r, prev) {
  if (!prev || !r.scale || !prev.scale) return r.crop;
  const s = Math.min(1, r.scale);
  const w = Math.max(r.crop[2], (prev.crop[2] * Math.min(1, prev.scale)) / s);
  const h = Math.max(r.crop[3], (prev.crop[3] * Math.min(1, prev.scale)) / s);
  return [r.crop[0] + r.crop[2] / 2 - w / 2, r.crop[1] + r.crop[3] / 2 - h / 2, w, h];
}

/** The region to cut: the box plus a margin (35% of it, at least 240 px a side), even, inside the capture. */
function regionOf(crop, cap) {
  const [x, y, w, h] = crop;
  const mx = Math.max(240, w * 0.35);
  const my = Math.max(240, h * 0.35);
  const x0 = Math.max(0, even(x - mx));
  const y0 = Math.max(0, even(y - my));
  const x1 = Math.min(cap.width, even(x + w + mx));
  const y1 = Math.min(cap.height, even(y + h + my));
  return [x0, y0, x1 - x0, y1 - y0];
}

const probeDuration = (file) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];
for (const r of requests) {
  const cap = CAPTURES.find((c) => c.id === r.capture);
  if (!cap || cap.kind !== "video") {
    console.warn(`skip ${r.id}: ${r.capture} is not a recording in captures.json`);
    continue;
  }
  const src = join(PUBLIC, cap.file);
  if (!existsSync(src)) {
    console.warn(`skip ${r.id}: ${cap.file} is not in public/`);
    continue;
  }
  const dur = probeDuration(src);
  // whole 1/30 s steps, 1.5 s of margin each side
  const t0 = Math.max(0, Math.floor((r.t0 - 1.5) * FPS) / FPS);
  const t1 = Math.min(dur, Math.ceil((r.t1 + 1.5) * FPS) / FPS);
  const region = regionOf(reframeBox(r, requests.find((q) => q.id === r.after)), cap);
  const name = `${r.capture}__${region.join("_")}__${Math.round(t0 * 1000)}_${Math.round(t1 * 1000)}.mp4`;
  const out = join(OUT_DIR, name);
  if (force || !existsSync(out) || statSync(out).size === 0) {
    const [rx, ry, rw, rh] = region;
    execFileSync(
      "ffmpeg",
      [
        "-v", "error", "-y",
        "-ss", t0.toFixed(6), "-i", src, "-t", (t1 - t0).toFixed(6),
        "-vf", `crop=${rw}:${rh}:${rx}:${ry},fps=${FPS}`,
        "-an",
        "-c:v", "libx264", "-preset", "slow", "-crf", "10", "-g", "15", "-bf", "0",
        "-pix_fmt", "yuvj420p", "-color_range", "pc", "-colorspace", "bt470bg",
        "-movflags", "+faststart",
        out,
      ],
      { stdio: "inherit" },
    );
    console.log(`cut ${r.id}: ${name} (${(statSync(out).size / 1e6).toFixed(1)} MB)`);
  } else {
    console.log(`have ${r.id}: ${name}`);
  }
  manifest.push({ id: r.id, capture: r.capture, file: `clips/v4/${name}`, region, t0, t1, fps: FPS });
}

writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      note: "Written by tools/v4/proofclips.mjs. Pre-cut regions of the recordings (public/clips/v4/, git-ignored). ProofFrame plays one only when it holds the whole region and time a proof shows; otherwise the 4K capture.",
      clips: manifest,
    },
    null,
    1,
  ) + "\n",
);
console.log(`wrote ${MANIFEST} (${manifest.length} clips)`);
