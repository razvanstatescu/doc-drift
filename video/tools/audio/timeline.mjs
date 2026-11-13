#!/usr/bin/env node
// Film timeline (BRIEF sections 3 and 5): frames absolute on the film clock, 30 fps, 120 BPM (beat 15 f, bar 60 f).
// Reads tools/audio/cache/vo/vo.json (the voiced lines), writes src/data/timeline.json and tools/audio/cache/timeline.md.
//   node tools/audio/timeline.mjs
// Rules:
//   A0: black from f180, V00 at f195; R (reveal, score start) = V00's speech end + 15 f; V01 at R + 15; A0 ends R + 120.
//   Body scenes A1..A4 start at A0's end; every scene boundary is a whole number of bars from R; each scene is at
//   least its target bars and long enough for its lines. Lines start on beats (from R), with at least `gap` beats
//   (default 1) between a line's file end and the next line's start, and a scene lead before its first line.
//   Spare time in a scene goes to the gaps marked `spare` (whole beats, in turn), the rest to the scene's tail.
//   duck: each VO span padded 5 f before and 10 f after, merged.
import { resolve } from 'node:path';
import { PATHS, VO_MASTER, VOICE } from './config.mjs';
import { BAR_F, BEAT_F, FPS, readJson, writeJson } from './lib.mjs';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const BLACK = 180, V00_AT = 195;

/**
 * Scenes after A0. lead = beats from the scene start to its first line; lines: [id, gapBeatsBefore, spareWeight];
 * tail = min beats of air after the last line's file end; targetBars from BRIEF section 3; why = picture needs.
 */
export const SCENES = [
  { id: 'A1', targetBars: 10, lead: 2, tail: 2, lines: [['V02'], ['V03', 1, 1], ['V04', 2, 1], ['V05', 2, 1], ['V06', 2, 1]],
    why: 'Night, 3 a.m.: the alert lands before V02; terminal error and diff ghost before V04; the assistant answer holds before the slip cut' },
  { id: 'A2', targetBars: 11, lead: 2, tail: 2, lines: [['V07'], ['V08', 2, 1], ['V09', 1, 1], ['V10', 2, 1]],
    why: 'Day: the lift lands 1 s before V07; anchor lines draw before V08; the four phrases of V10 set one by one, then the small line holds' },
  { id: 'P1', targetBars: 6, lead: 1, tail: 2, lines: [['V11'], ['V12', 2, 2]],
    why: 'Anchors tab and suggestions under V11; the Save click before V12; 1 s of "Anchor this space" at the end' },
  { id: 'P2', targetBars: 9, lead: 1, tail: 2, lines: [['V13'], ['V14', 4, 2], ['V15', 2, 1]],
    why: 'merge-and-wait: at least 1 bar between V13 and V14 for the merge click and the timer' },
  { id: 'P3', targetBars: 11, lead: 1, tail: 2, lines: [['V16'], ['V17', 4, 2], ['V18', 2, 1]],
    why: 'the question is typed and the answer streams between V16 and V17; whip to the terminal before V18' },
  { id: 'P4', targetBars: 11, lead: 1, tail: 4, lines: [['V19'], ['V20', 2, 1], ['V21', 2, 1], ['V22', 1, 0, 'bar']],
    why: 'comment, review panel, quick fix, draft accepted; V22 on a bar line = snapBack (the score resolves there); 1 bar of air after V22' },
  { id: 'P5', targetBars: 4, lead: 1, tail: 2, lines: [['V23']],
    why: 'Jira epic flags a page, the dashboard, Track in Jira' },
  { id: 'A4', targetBars: 7, lead: 2, tail: 6, kind: 'end', lines: [['V24'], ['V25', 0, 0]],
    why: 'the 3 a.m. alert again; endHit on the bar where the end card lands, V25 two beats later, then the ring-out' },
];

/** The score entry: final when public/music/score.wav exists and its edit (arrangements/score.json) matches this grid. */
function scoreEntry(R, total, markers) {
  const e = { id: 'score', file: 'music/score.wav', from: R, durationInFrames: total - R, gainDb: -12, duckDb: -8 };
  const arr = readJson(resolve(here, 'arrangements', 'score.json'));
  const file = resolve(PATHS.musicDir, 'score.wav');
  if (!arr || !existsSync(file)) return { ...e, pending: 'no score yet' };
  const sec = (f) => (f - R) / FPS;
  const x = arr.expect;
  const drift = [['R', R, x.R], ['durationSec', sec(total), x.durationSec], ...['A1', 'A2', 'P1', 'P4', 'P5', 'A4', 'snapBack', 'endHit'].map((k) => [k, sec(markers[k]), x[k]])]
    .filter(([, a, b]) => Math.abs(a - b) > 1e-6);
  if (drift.length) {
    console.warn(`WARNING: the score edit no longer matches the timeline (${drift.map(([k, a, b]) => `${k} ${a} vs ${b}`).join(', ')}). Re-edit tools/audio/arrangements/score.json and re-run arrange.py.`);
    return { ...e, pending: 'score edit does not match this timeline' };
  }
  const an = readJson(resolve(PATHS.cache, 'music', 'score.analysis.json')); // written by tools/audio/qa.mjs
  return {
    ...e, bpm: an?.bpmGrid, firstBeatSec: an?.gridOffset, lufs: an?.lufs,
    cues: arr.cues.map((c) => ({ id: c.id, from: R + Math.round(c.from * FPS), to: R + Math.round(c.to * FPS), what: c.what })),
    hits: arr.subHits.map((h) => ({ at: R + Math.round(h.t * FPS), why: h.why })),
  };
}

const ceilTo = (f, q, origin = 0) => origin + Math.ceil((f - origin) / q - 1e-9) * q;

export function build() {
  const manifest = readJson(resolve(PATHS.cache, 'vo', 'vo.json'));
  if (!manifest) throw new Error('run tools/audio/vo.mjs first');
  const vo = Object.fromEntries(manifest.lines.map((l) => [l.id, l]));
  const len = (id) => Math.round(vo[id].duration * FPS); // file length in frames (the file may end up to 0.5 f early)
  const placed = [];
  const put = (id, from, scene) => { placed.push({ id, scene, from }); return from + len(id); };

  // --- A0
  put('V00', V00_AT, 'A0');
  const speechEnd = V00_AT + Math.round((vo.V00.duration - VO_MASTER.tail) * FPS);
  const R = speechEnd + 15;
  put('V01', R + 15, 'A0');
  const scenes = [{ id: 'A0', from: 0, durationInFrames: R + 120 }];
  const markers = { blackStart: BLACK, v00: V00_AT, reveal: R, scoreStart: R, A0: 0 };

  // --- body
  let t = R + 120;
  for (const sc of SCENES) {
    const start = t;
    markers[sc.id] = start;
    const lines = sc.lines.map(([id, gap = 1, spare = 0, snap = 'beat']) => ({ id, gap, spare, snap }));
    // minimum layout: lines on beats from R
    const layout = (extra) => {
      const out = [];
      let end = start, cue = start + sc.lead * BEAT_F;
      for (const [k, l] of lines.entries()) {
        if (sc.kind === 'end' && l.id === 'V25') {
          // the end card lands on the first bar line >= V24's end + 2 beats (+ extra beats), V25 two beats after it
          const hit = ceilTo(end + 2 * BEAT_F + (extra[k] || 0) * BEAT_F, BAR_F, R);
          out.push({ id: l.id, from: hit + 2 * BEAT_F, endHit: hit });
          end = hit + 2 * BEAT_F + len(l.id);
          continue;
        }
        const from = k === 0 ? cue : ceilTo(end + (l.gap + (extra[k] || 0)) * BEAT_F, l.snap === 'bar' ? BAR_F : BEAT_F, R);
        out.push({ id: l.id, from });
        end = from + len(l.id);
      }
      return { out, end };
    };
    let extra = lines.map(() => 0);
    let { out, end } = layout(extra);
    const need = end + sc.tail * BEAT_F - start;
    const bars = Math.max(sc.targetBars, Math.ceil(need / BAR_F - 1e-9));
    const dur = bars * BAR_F;
    // half of the spare beats go to the gaps marked `spare` (round robin by weight), the rest stays in the tail
    const order = lines.flatMap((l, k) => (k > 0 ? Array.from({ length: l.spare }, () => k) : []));
    let budget = Math.floor((dur - need) / BEAT_F / 2);
    for (let i = 0; budget > 0 && order.length && i < 500; i++) {
      const tryExtra = extra.slice();
      tryExtra[order[i % order.length]]++;
      const r = layout(tryExtra);
      if (r.end + sc.tail * BEAT_F - start > dur) break;
      extra = tryExtra; ({ out, end } = r); budget--;
    }
    for (const p of out) {
      put(p.id, p.from, sc.id);
      if (p.endHit != null) markers.endHit = p.endHit;
    }
    scenes.push({ id: sc.id, from: start, durationInFrames: dur, bars, targetBars: sc.targetBars });
    t = start + dur;
  }
  const total = t;
  markers.daySlip = markers.A2;
  markers.snapBack = placed.find((p) => p.id === 'V22').from;
  markers.filmEnd = total;

  // --- vo entries with words on the film clock
  const voOut = placed.map((p) => {
    const l = vo[p.id];
    return {
      id: p.id, scene: p.scene, from: p.from, durationInFrames: Math.ceil(l.duration * FPS - 1e-9), file: l.file, text: l.text,
      words: l.words.map((w) => {
        const from = p.from + Math.round(w.start * FPS);
        return { text: w.text, from, to: Math.max(from + 1, p.from + Math.round(w.end * FPS)) };
      }),
    };
  });
  for (let i = 1; i < voOut.length; i++) {
    const gap = voOut[i].from - (voOut[i - 1].from + voOut[i - 1].durationInFrames);
    if (gap < 0) throw new Error(`overlap ${voOut[i - 1].id}/${voOut[i].id}`);
    if (voOut[i].id !== 'V01' && gap < BEAT_F && voOut[i].scene === voOut[i - 1].scene) throw new Error(`${voOut[i].id}: gap ${gap} f < 1 beat`);
  }
  // --- duck: VO spans padded 5 f before and 10 f after, merged
  const duck = [];
  for (const l of voOut) {
    const a = Math.max(0, l.from - 5), b = Math.min(total, l.from + l.durationInFrames + 10);
    const last = duck.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b); else duck.push([a, b]);
  }
  const timeline = {
    fps: FPS, bpm: 120, totalFrames: total,
    markers,
    scenes: scenes.map(({ id, from, durationInFrames }) => ({ id, from, durationInFrames })),
    vo: voOut,
    music: [scoreEntry(R, total, markers)],
    duck,
    voice: { id: VOICE.id, name: VOICE.name, model: VOICE.model },
  };
  return { timeline, scenes, R };
}

export function writeTimeline({ timeline, scenes }) {
  const p = resolve(PATHS.dataDir, 'timeline.json');
  const prev = readJson(p);
  writeJson(p, timeline, 1);
  const s = (f) => (f / FPS).toFixed(2);
  const md = [
    '# Film timeline (generated by tools/audio/timeline.mjs; do not edit by hand)',
    '',
    `Total **${timeline.totalFrames} f = ${s(timeline.totalFrames)} s**. R (reveal, score start) = f${timeline.markers.reveal}. Bars count from R.`,
    '',
    '| scene | from | to | frames | s | bars (target) | lines |',
    '|---|---|---|---|---|---|---|',
    ...timeline.scenes.map((sc) => {
      const meta = scenes.find((x) => x.id === sc.id) || {};
      return `| ${sc.id} | ${sc.from} | ${sc.from + sc.durationInFrames} | ${sc.durationInFrames} | ${s(sc.durationInFrames)} | ${meta.bars ?? '-'}${meta.targetBars ? ` (${meta.targetBars})` : ''} | ${timeline.vo.filter((l) => l.scene === sc.id).map((l) => l.id).join(', ')} |`;
    }),
    '',
    '| line | scene | from | to | s | text |',
    '|---|---|---|---|---|---|',
    ...timeline.vo.map((l) => `| ${l.id} | ${l.scene} | ${l.from} | ${l.from + l.durationInFrames} | ${s(l.from)} | ${l.text} |`),
    '',
    'Markers: ' + Object.entries(timeline.markers).map(([k, v]) => `${k} f${v}`).join(', '),
    '',
  ].join('\n');
  writeFileSync(resolve(PATHS.cache, 'timeline.md'), md);
  return md;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  console.log(writeTimeline(r));
}
