#!/usr/bin/env node
// Film timeline for launch film v5 (V5.md sections 2-3, D41): frames absolute on the film clock, 30 fps, 120 BPM
// (beat 15 f, bar 60 f), the beat grid from frame 0 (the score starts on frame 0: markers.scoreStart = 0).
// Reads tools/audio/cache/vo/vo-v5.json (the voiced lines S01-S22), writes src/data/timeline.json and
// tools/audio/cache/timeline-v5.md.
//   node tools/audio/timeline-v5.mjs
// Rules (measured on the aligned words, so "silence" is between the last word of one line and the first of the next):
//   - every line starts on a beat; S18 on a bar line (the score resolves there, snapBack);
//   - at least GAP (0.3 s) of silence between lines, plus HOLD (0.4 s) before S11 (the 19 s roll) and S18 (the snap
//     back), the two breaths R5 asks for; `extra` beats are added only where the picture needs them (see `why`);
//   - scenes are contiguous; a scene ends on the first bar line ('bar') or beat ('beat') at least 0.1 s after its last
//     word. PROMISE (daySlip, the lift) and CLOSE (endHit, the final hit) must start on bar lines, because the score's
//     lift and final hit are downbeats; the other cuts are bar lines where that costs no extra silence, else beats;
//   - the film ends on the first beat at least END_HOLD after the last word.
//   duck: v4's rule (each VO span padded 5 f before and 10 f after, merged), except around the score's three hits,
//   which must land at full level (DUCK_RULES): the line after daySlip and S18 duck from their first word, S17 and S20
//   release at their last word (S20 early enough that the release ends on endHit), and CLOSE does not duck, so the
//   final hit rings out under S21 and S22. The mix block states the attack/release these ranges assume.
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILMS, PATHS, VOICE } from './config.mjs';
import { BAR_F, BEAT_F, FPS, readJson, writeJson } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const GAP = 0.3, HOLD = 0.4, MIN_TAIL = 0.1, END_HOLD = 1.0;
/** Mix the duck ranges assume (src/audio/mix.ts reads timeline.mix; the score entry's duckDb sets the depth). */
const MIX = { voDb: 0, attackFrames: 6, releaseFrames: 12 };
/**
 * Duck exceptions (see the header): `from: 'word'` starts the range at the first word (no 5 f pad), `to: 'word'` ends
 * it at the last word (no 10 f pad), `beforeHit` also ends it releaseFrames before that marker, `none` skips the line.
 */
export const DUCK_RULES = {
  S06: { from: 'word', why: 'the lift on daySlip plays at full level until the first word' },
  S17: { to: 'word', why: 'the score opens at full level in the breath before the snap back' },
  S18: { from: 'word', why: 'the resolution on S18\'s bar line lands before the duck' },
  S20: { to: 'word', beforeHit: 'endHit', why: 'the build swells up under the last word; the final hit lands at full level' },
  S21: { none: true, why: 'CLOSE: the final hit rings out under the voice (its decay keeps it 10-20 dB under)' },
  S22: { none: true, why: 'CLOSE: as S21' },
};

/**
 * lead = beats from the scene start to its first line; lines: [id, { extra (beats), hold (s), snap }];
 * cut = where the scene ends (and the next starts); why = the picture reason for any extra air.
 */
export const SCENES_V5 = [
  { id: 'PROBLEM', lead: 3, cut: 'bar', lines: [['S01'], ['S02'], ['S03'], ['S04'], ['S05']],
    why: 'Night bed from f0; "03:07" and the alert land before S01 (1.5 s); S05 ends about 0.6 s before daySlip; the score hard-stops one beat before it' },
  { id: 'PROMISE', lead: 1, cut: 'bar', lines: [['S06'], ['S07']],
    why: 'daySlip = the first frame, on the score\'s lift; the slip lands one beat before "Doc Drift catches this"' },
  { id: 'LOOP', lead: 0, cut: 'beat', lines: [['S08'], ['S09'], ['S10'], ['S11', { hold: HOLD }], ['S12']],
    why: 'the cut lands on "Rewind a week"; merge on "merged"; a 0.4 s breath for the 19 s roll before S11; flag on "Possibly"' },
  { id: 'AGENTS', lead: 1, cut: 'bar', lines: [['S13'], ['S14'], ['S15', { extra: 1 }]],
    why: 'one extra beat before S15 for the whip to the coding-assistant terminal (it also puts the FIX cut on a bar line)' },
  { id: 'FIX', lead: 0, cut: 'beat', lines: [['S16'], ['S17'], ['S18', { hold: HOLD, snap: 'bar' }]],
    why: 'the accept click and the 0.4 s breath before S18; S18 on a bar line, where the score opens and resolves (snapBack)' },
  { id: 'JIRA', lead: 0, cut: 'bar', lines: [['S19'], ['S20']],
    why: 'S20 ends just before endHit; the score builds over the last bar' },
  { id: 'CLOSE', lead: 1, cut: 'end', lines: [['S21'], ['S22']],
    why: 'endHit = the first frame (the end card lands with the final hit); S21 one beat later; 1 s or more of hold after S22' },
];

const ceilTo = (f, q) => Math.ceil(f / q - 1e-9) * q;

export function build() {
  const manifest = readJson(resolve(PATHS.cache, 'vo', FILMS.v5.manifest));
  if (!manifest) throw new Error('run node tools/audio/vo.mjs --film v5 first');
  const vo = Object.fromEntries(manifest.lines.map((l) => [l.id, l]));
  // speech inside each file, in frames, from the forced alignment (first word start, last word end)
  const sp = (id) => ({ a: vo[id].words[0].start * FPS, b: vo[id].words.at(-1).end * FPS });
  const placed = [];
  const scenes = [];
  const markers = { scoreStart: 0 };
  let t = 0;
  let prevEnd = null; // absolute frame of the previous line's last word
  for (const sc of SCENES_V5) {
    const start = t;
    markers[sc.id] = start;
    let cursor = null;
    for (const [k, [id, o = {}]] of sc.lines.entries()) {
      let from;
      if (k === 0) from = start + sc.lead * BEAT_F;
      else {
        const q = o.snap === 'bar' ? BAR_F : BEAT_F;
        from = ceilTo(cursor + (GAP + (o.hold ?? 0)) * FPS - sp(id).a, q) + (o.extra ?? 0) * q;
      }
      placed.push({ id, scene: sc.id, from, why: o });
      cursor = from + sp(id).b;
    }
    const last = cursor;
    let end;
    if (sc.cut === 'end') end = ceilTo(last + END_HOLD * FPS, BEAT_F);
    else end = ceilTo(last + MIN_TAIL * FPS, sc.cut === 'bar' ? BAR_F : BEAT_F);
    scenes.push({ id: sc.id, from: start, durationInFrames: end - start, bars: (end - start) / BAR_F });
    prevEnd = last;
    t = end;
  }
  const total = t;
  const at = (id) => placed.find((p) => p.id === id);
  const wordFrame = (id, prefix) => {
    const w = vo[id].words.find((x) => x.text.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(prefix));
    if (!w) throw new Error(`${id}: no word "${prefix}"`);
    return { from: at(id).from + Math.round(w.start * FPS), exact: at(id).from + w.start * FPS };
  };
  markers.daySlip = markers.PROMISE;
  markers.merge = wordFrame('S10', 'merged').from;
  markers.flag = wordFrame('S11', 'possibly').from;
  markers.snapBack = wordFrame('S18', 'verified').from;
  markers.endHit = markers.CLOSE;
  markers.filmEnd = total;

  // --- hard checks (the picture and the score rely on these)
  for (const p of placed) if (p.from % BEAT_F) throw new Error(`${p.id} not on a beat (f${p.from})`);
  for (const id of ['PROMISE', 'CLOSE']) if (markers[id] % BAR_F) throw new Error(`${id} must start on a bar line (f${markers[id]})`);
  if (at('S18').from % BAR_F) throw new Error(`S18 must start on a bar line (f${at('S18').from})`);

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
  // silences between lines (last word to first word), seconds
  const gaps = voOut.slice(1).map((l, i) => {
    const a = placed[i], b = placed[i + 1];
    const g = (b.from + sp(b.id).a - (a.from + sp(a.id).b)) / FPS;
    const fileGap = l.from - (voOut[i].from + voOut[i].durationInFrames);
    if (fileGap < 0) throw new Error(`overlap ${voOut[i].id}/${l.id}`);
    return { before: l.id, sec: +g.toFixed(2), chosen: l.id === 'S06' ? 'daySlip turn' : b.why.hold ? 'breath' : l.scene !== voOut[i].scene ? 'scene cut' : null };
  });
  for (const g of gaps) if (g.sec < GAP - 0.01) throw new Error(`gap before ${g.before} ${g.sec} s < ${GAP}`);

  // --- duck: VO spans padded 5 f before and 10 f after, merged; DUCK_RULES around the score's hits
  const duck = [];
  for (const l of voOut) {
    const r = DUCK_RULES[l.id] ?? {};
    if (r.none) continue;
    let a = r.from === 'word' ? l.words[0].from : l.from - 5;
    let b = r.to === 'word' ? l.words.at(-1).to : l.from + l.durationInFrames + 10;
    if (r.beforeHit) b = Math.min(b, markers[r.beforeHit] - MIX.releaseFrames);
    a = Math.max(0, a); b = Math.min(total, b);
    const last = duck.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b); else duck.push([a, b]);
  }
  const timeline = {
    film: 'v5', fps: FPS, bpm: 120, totalFrames: total,
    markers,
    scenes: scenes.map(({ id, from, durationInFrames }) => ({ id, from, durationInFrames })),
    vo: voOut,
    music: [scoreEntry(total, markers, at)],
    duck,
    mix: MIX,
    voice: { id: VOICE.id, name: VOICE.name, model: VOICE.model },
  };
  return { timeline, scenes, gaps, placed };
}

/** The score entry: final when public/music/score-v5.wav exists and its edit (arrangements/score-v5.json) matches. */
function scoreEntry(total, markers, at) {
  const e = { id: 'score', file: 'music/score-v5.wav', from: 0, durationInFrames: total, gainDb: -12, duckDb: -8 };
  const arr = readJson(resolve(here, 'arrangements', 'score-v5.json'));
  const file = resolve(PATHS.musicDir, 'score-v5.wav');
  if (!arr || !existsSync(file)) return { ...e, pending: 'no score yet' };
  const sec = (f) => f / FPS;
  const x = arr.expect;
  // the edit's anchors, in seconds from frame 0 (flag within 1.5 f: the hit sits on the sixteenth nearest the word)
  const want = {
    daySlip: sec(markers.daySlip), flag: sec(markers.flag), S11: sec(at('S11').from), FIX: sec(markers.FIX),
    snapBackBar: sec(at('S18').from), endHit: sec(markers.endHit), durationSec: sec(total),
  };
  const drift = Object.entries(want).filter(([k, v]) => (k === 'flag' ? Math.abs(v - x[k]) > 1.5 / FPS : Math.abs(v - x[k]) > 1e-6));
  if (drift.length) {
    console.warn(`WARNING: the v5 score edit no longer matches the timeline (${drift.map(([k, v]) => `${k} ${v} vs ${x[k]}`).join(', ')}). Re-edit tools/audio/arrangements/score-v5.json and re-run arrange.py.`);
    return { ...e, pending: 'score edit does not match this timeline' };
  }
  const an = readJson(resolve(PATHS.cache, 'music', 'score-v5.analysis.json')); // written by qa.mjs --film v5
  return {
    ...e, bpm: an?.bpmGrid, firstBeatSec: an?.gridOffset, lufs: an?.lufs,
    cues: arr.cues.map((c) => ({ id: c.id, from: Math.round(c.from * FPS), to: Math.round(c.to * FPS), what: c.what })),
    hits: arr.subHits.map((h) => ({ at: Math.round(h.t * FPS), why: h.why })),
  };
}

export function writeTimeline({ timeline, scenes, gaps }) {
  const p = resolve(PATHS.dataDir, FILMS.v5.timeline);
  writeJson(p, timeline, 1);
  const s = (f) => (f / FPS).toFixed(2);
  const md = [
    '# Film timeline v5 (generated by tools/audio/timeline-v5.mjs; do not edit by hand)',
    '',
    `Total **${timeline.totalFrames} f = ${s(timeline.totalFrames)} s**. The beat grid runs from frame 0 (beat 15 f, bar 60 f).`,
    '',
    '| scene | from | to | frames | s | bars | lines |',
    '|---|---|---|---|---|---|---|',
    ...timeline.scenes.map((sc) => {
      const meta = scenes.find((x) => x.id === sc.id) || {};
      return `| ${sc.id} | ${sc.from} | ${sc.from + sc.durationInFrames} | ${sc.durationInFrames} | ${s(sc.durationInFrames)} | ${meta.bars} | ${timeline.vo.filter((l) => l.scene === sc.id).map((l) => l.id).join(', ')} |`;
    }),
    '',
    '| line | scene | from | to | s | silence before (s) | text |',
    '|---|---|---|---|---|---|---|',
    ...timeline.vo.map((l, i) => {
      const g = i ? gaps[i - 1] : null;
      return `| ${l.id} | ${l.scene} | ${l.from} | ${l.from + l.durationInFrames} | ${s(l.from)} | ${g ? `${g.sec}${g.chosen ? ` (${g.chosen})` : ''}` : '-'} | ${l.text} |`;
    }),
    '',
    'Markers: ' + Object.entries(timeline.markers).map(([k, v]) => `${k} f${v}`).join(', '),
    '',
  ].join('\n');
  writeFileSync(resolve(PATHS.cache, 'timeline-v5.md'), md);
  return md;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  console.log(writeTimeline(r));
  const long = r.gaps.filter((g) => g.sec > 1.0);
  if (long.length) console.log(`Silences over 1 s: ${long.map((g) => `${g.before} ${g.sec} s (${g.chosen ?? 'not chosen'})`).join(', ')}`);
}
