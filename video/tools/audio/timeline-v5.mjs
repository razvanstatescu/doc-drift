#!/usr/bin/env node
// Film timeline for launch film v5 (V5.md sections 2-3, D41): frames absolute on the film clock, 30 fps, 120 BPM
// (beat 15 f, bar 60 f), the beat grid from frame 0 (the score starts on frame 0: markers.scoreStart = 0).
// Reads tools/audio/cache/vo/vo-v5.json (the voiced lines S01-S22), writes src/data/timeline.json and
// tools/audio/cache/timeline-v5.md.
//   node tools/audio/timeline-v5.mjs
// Rules (measured on the aligned words, so "silence" is between the last word of one line and the first of the next):
//   - every line starts on a beat; S18 on a bar line (the score resolves there, snapBack);
//   - at least GAP (0.3 s) of silence between lines, plus `hold` where the picture needs air: 0.4 s before S11 (the
//     19 s roll) and S18 (the snap back), the two breaths R5 asks for, and 0.3 s before S15 (the whip to the terminal);
//   - scenes are contiguous. PROMISE (daySlip, the lift) and CLOSE (endHit, the final hit) start on bar lines, because
//     the score's lift and final hit are downbeats; JIRA lasts at least 12 s (round 2: viewers found it rushed);
//   - the film ends on the first beat at least END_HOLD after the last word.
//   The leads, the extra beats in each gap (0 or 1; up to 2 in JIRA) and the other cuts (bar line or beat) are
//   SEARCHED, not hand-set (round 2 changed six lines): the shortest film wins, then the fewest silences over 1 s
//   outside the chosen beats (the Day turn, the S18 breath, the end hit: up to 1.6 s), then the least squared silence
//   over 0.6 s (spare air spreads evenly), then the most scene starts on bar lines, then the least dead air between a
//   scene's last word and its cut. A re-voice re-times the film under the same rules.
//   duck: v4's rule (each VO span padded 5 f before and 10 f after, merged), except around the score's three hits,
//   which must land at full level (DUCK_RULES): the line after daySlip and S18 duck from their first word, S17 and S20
//   release at their last word (S20 early enough that the release ends on endHit), and CLOSE does not duck, so the
//   final hit rings out under S21 and S22. The mix block states the attack/release these ranges assume.
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILMS, PATHS, VOICE } from './config.mjs';
import { BAR_F, BEAT_F, FPS, readJson, writeJson } from './lib.mjs';
import { anchorsOf } from './score-v5.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const GAP = 0.3, HOLD = 0.4, MIN_TAIL = 0.05, END_HOLD = 1.0; // MIN_TAIL: a cut at least 0.05 s after a line's last word
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
 * leads = allowed beats from the scene start to its first line; lines: id or [id, { hold (s), snap, maxExtra }];
 * cut = 'bar' (ends on a bar line), 'any' (bar line or beat, searched) or 'end' (the film's end); minSec = shortest
 * scene; minTailSec = least air between the scene's last word and its cut; why = the picture reason for the air.
 */
export const SCENES_V5 = [
  { id: 'PROBLEM', leads: [3], cut: 'bar', minTailSec: 0.5, lines: ['S01', 'S02', 'S03', 'S04', 'S05'],
    why: 'Night bed from f0; "03:07" and the alert land before S01 (1.5 s); the last word ends 0.5 s or more before daySlip, so the turn has air while the Night rises into the lift' },
  { id: 'PROMISE', leads: [1], cut: 'any', lines: ['S06', 'S07'],
    why: 'daySlip = the first frame, on the score\'s lift; the slip lands one beat before "Doc Drift catches this"' },
  { id: 'LOOP', leads: [0, 1], cut: 'any', lines: ['S08', 'S09', 'S10', ['S11', { hold: HOLD }], 'S12'],
    why: 'the cut near "Rewind a week"; merge on "merged"; a 0.4 s breath for the 19 s roll before S11; flag on "Possibly"' },
  { id: 'AGENTS', leads: [0, 1], cut: 'any', lines: ['S13', 'S14', ['S15', { hold: 0.3 }]],
    why: 'at least 0.6 s before S15 for the whip to the coding-assistant terminal' },
  { id: 'FIX', leads: [0, 1], cut: 'any', lines: ['S16', 'S17', ['S18', { hold: HOLD, snap: 'bar' }]],
    why: 'the accept click and the 0.4 s breath before S18; S18 on a bar line, where the score opens and resolves (snapBack)' },
  { id: 'JIRA', leads: [0, 1, 2], cut: 'bar', minSec: 12, lines: [['S19', { maxExtra: 2 }], ['S20', { maxExtra: 2 }]],
    why: 'at least 12 s (round 2): the air goes around S19 and S20; the score builds over the last bar into endHit' },
  { id: 'CLOSE', leads: [1], cut: 'end', lines: ['S21', 'S22'],
    why: 'endHit = the first frame (the end card lands with the final hit); S21 one beat later; 1 s or more of hold after S22' },
];
/**
 * Silences allowed over 1 s (up to 1.6 s): the Day turn (S06), the S18 breath, the end hit (S21), and round 2's air
 * around the Jira lines (S19, S20: viewers found the Jira beat the most rushed).
 */
const CHOSEN = { S06: 'daySlip turn', S18: 'breath', S19: 'Jira air', S20: 'Jira air', S21: 'end hit' };
const ceilTo = (f, q) => Math.ceil(f / q - 1e-9) * q;

export function build() {
  const manifest = readJson(resolve(PATHS.cache, 'vo', FILMS.v5.manifest));
  if (!manifest) throw new Error('run node tools/audio/vo.mjs --film v5 first');
  const vo = Object.fromEntries(manifest.lines.map((l) => [l.id, l]));
  // speech inside each file, in frames, from the forced alignment (first word start, last word end)
  const sp = (id) => ({ a: vo[id].words[0].start * FPS, b: vo[id].words.at(-1).end * FPS });
  const norm = (x) => (Array.isArray(x) ? x : [x, {}]);
  const specs = SCENES_V5.map((sc) => ({ ...sc, lines: sc.lines.map(norm).map(([id, o = {}]) => ({ id, ...o })) }));
  const silence = (prevWordEnd, from, id) => (from + sp(id).a - prevWordEnd) / FPS;

  // one scene laid out from `start` for a given lead and extra beats; null if a rule fails
  function layScene(sc, start, prev, lead, extras) {
    const out = [];
    let cursor = prev?.lastWord ?? null;
    for (const [k, l] of sc.lines.entries()) {
      const q = l.snap === 'bar' ? BAR_F : BEAT_F;
      const need = (GAP + (l.hold ?? 0)) * FPS;
      let from;
      if (k === 0) {
        from = start + lead * BEAT_F;
        if (l.snap === 'bar' && from % BAR_F) return null;
      } else from = ceilTo(cursor + need - sp(l.id).a, q) + extras[k] * q;
      if (cursor !== null && silence(cursor, from, l.id) < (GAP + (l.hold ?? 0)) - 1e-6) return null;
      out.push({ id: l.id, scene: sc.id, from, hold: l.hold });
      cursor = from + sp(l.id).b;
    }
    return { lines: out, lastWord: cursor };
  }
  function ends(sc, start, lastWord) {
    if (sc.cut === 'end') return [ceilTo(lastWord + END_HOLD * FPS, BEAT_F)];
    const min = Math.max(lastWord + Math.max(MIN_TAIL, sc.minTailSec ?? 0) * FPS, start + (sc.minSec ?? 0) * FPS);
    const bar = ceilTo(min, BAR_F), beat = ceilTo(min, BEAT_F);
    return sc.cut === 'bar' ? [bar] : [...new Set([beat, bar])];
  }
  // depth-first over scenes, keeping per scene the best few states for each end frame
  let states = [{ t: 0, prev: null, lines: [], scenes: [] }];
  for (const [si, sc] of specs.entries()) {
    const next = [];
    const nextScene = specs[si + 1];
    const extraSets = sc.lines.reduce((acc, l, k) => {
      const opts = k === 0 ? [0] : Array.from({ length: (l.maxExtra ?? 1) + 1 }, (_, n) => n);
      return acc.flatMap((e) => opts.map((o) => [...e, o]));
    }, [[]]);
    for (const st of states) {
      for (const lead of sc.leads) for (const extras of extraSets) {
        const r = layScene(sc, st.t, st.prev, lead, extras);
        if (!r) continue;
        for (const end of ends(sc, st.t, r.lastWord)) {
          if (nextScene && ['PROMISE', 'CLOSE'].includes(nextScene.id) && end % BAR_F) continue;
          next.push({ t: end, prev: { lastWord: r.lastWord }, lines: [...st.lines, ...r.lines], scenes: [...st.scenes, { id: sc.id, from: st.t, durationInFrames: end - st.t, lead, extras }] });
        }
      }
    }
    // score partial layouts and keep the best 8 per end frame
    const byEnd = new Map();
    for (const n of next) {
      n.cost = costOf(n.lines);
      const k = n.t;
      if (!byEnd.has(k)) byEnd.set(k, []);
      byEnd.get(k).push(n);
    }
    states = [...byEnd.values()].flatMap((arr) => arr.sort(cmpCost).slice(0, 8));
    if (!states.length) throw new Error(`no layout satisfies the rules at scene ${sc.id}`);
  }
  function costOf(lines) {
    let long = 0, excess = 0;
    for (let i = 1; i < lines.length; i++) {
      const g = silence(lines[i - 1].from + sp(lines[i - 1].id).b, lines[i].from, lines[i].id);
      // every silence counts toward `excess` (squared, so spare air spreads evenly, e.g. around S19 and S20 rather than
      // all before the end hit); the chosen beats are only exempt from the over-1 s count (up to 1.6 s)
      if (CHOSEN[lines[i].id] ? g > 1.6 : g > 1.0 + 1e-9) long++;
      excess += Math.max(0, g - 0.6) ** 2;
    }
    return { long, excess };
  }
  function cmpCost(p, q) { return p.cost.long - q.cost.long || p.cost.excess - q.cost.excess; }
  const offBar = (st) => st.scenes.filter((x) => x.from % BAR_F).length;
  const deadAir = (st) => st.scenes.reduce((sum, x) => {
    const last = st.lines.filter((l) => l.scene === x.id).at(-1);
    return sum + (x.from + x.durationInFrames - (last.from + sp(last.id).b));
  }, 0);
  states.sort((p, q) => p.t - q.t || cmpCost(p, q) || offBar(p) - offBar(q) || deadAir(p) - deadAir(q));
  const best = states[0];
  const placed = best.lines;
  const scenes = best.scenes.map((x) => ({ ...x, bars: x.durationInFrames / BAR_F }));
  const markers = { scoreStart: 0 };
  for (const x of scenes) markers[x.id] = x.from;
  const t = best.t;
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
    return { before: l.id, sec: +g.toFixed(2), chosen: CHOSEN[l.id] ?? (b.hold ? `hold ${b.hold} s` : l.scene !== voOut[i].scene ? 'scene cut' : null) };
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
    music: [],
    duck,
    mix: MIX,
    voice: { id: VOICE.id, name: VOICE.name, model: VOICE.model },
  };
  timeline.music = [scoreEntry(timeline)];
  return { timeline, scenes, gaps, placed };
}

/**
 * The score entry: final when public/music/score-v5.wav exists and its edit (arrangements/score-v5.json, written by
 * score-v5.mjs) was fitted to this timeline's anchors; otherwise `pending` (re-run node tools/audio/score-v5.mjs).
 */
function scoreEntry(tl) {
  const e = { id: 'score', file: 'music/score-v5.wav', from: 0, durationInFrames: tl.totalFrames, gainDb: -12, duckDb: -8 };
  const arr = readJson(resolve(here, 'arrangements', 'score-v5.json'));
  const file = resolve(PATHS.musicDir, 'score-v5.wav');
  if (!arr || !existsSync(file)) return { ...e, pending: 'no score yet' };
  const want = anchorsOf(tl);
  const drift = Object.entries(want).filter(([k, v]) => !(Math.abs(v - arr.expect?.[k]) <= 1e-6));
  if (drift.length) {
    console.warn(`WARNING: the v5 score was fitted to another timeline (${drift.map(([k, v]) => `${k} ${v} vs ${arr.expect?.[k]}`).join(', ')}). Re-run node tools/audio/score-v5.mjs.`);
    return { ...e, pending: 'score edit does not match this timeline' };
  }
  const an = readJson(resolve(PATHS.cache, 'music', 'score-v5.analysis.json')); // written by qa.mjs --film v5
  const attackFrame = (t) => Math.round((t + 0.0065 - 0.004) * FPS); // a sub hit's attack (arrange.py) on the film clock
  return {
    ...e, bpm: an?.bpmGrid, firstBeatSec: an?.gridOffset, lufs: an?.lufs,
    drop: { from: Math.round(want.dropFrom * FPS), to: Math.round(want.flag * FPS), why: 'the film\'s one silence: the score drops out, voice only, until the flag' },
    cues: arr.cues.map((c) => ({ id: c.id, from: Math.round(c.from * FPS), to: Math.round(c.to * FPS), what: c.what })),
    hits: arr.subHits.map((h) => ({ at: attackFrame(h.t), why: h.why })),
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
