// Builds the YouTube deliverables from the film's own data: captions (SRT) and the description with chapters and
// credits. Usage: node tools/publish.mjs v1   -> out/doc-drift-v1.srt, out/doc-drift-v1-description.md
// Nothing here calls an API. Sources: src/data/timeline.json, src/data/plates.json, public/clips/clips.json (if present).
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const tag = process.argv[2] || 'v1';
const root = new URL('..', import.meta.url).pathname;
const t = JSON.parse(readFileSync(join(root, 'src/data/timeline.json'), 'utf8'));
const plates = JSON.parse(readFileSync(join(root, 'src/data/plates.json'), 'utf8')).plates;
const fps = t.fps;

// --- which plates the cold open uses (ids quoted in the A0 source) ---
function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}
const a0src = files(join(root, 'src/scenes/A0')).map((f) => readFileSync(f, 'utf8')).join('\n');
const used = plates.filter((p) => new RegExp(`['"]${p.id.replace(/[-]/g, '\\-')}['"]`).test(a0src));

// --- captions ---
const ts = (frame) => {
  const ms = Math.round((frame / fps) * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
// Split a line into caption chunks of at most ~84 characters (two lines of 42), using word timings.
function chunks(words, text, from, to) {
  if (text.length <= 84 || !words?.length) return [{ text, from, to }];
  const out = [];
  let cur = [];
  for (const w of words) {
    const next = [...cur, w];
    if (next.map((x) => x.text).join(' ').length > 84 && cur.length) {
      out.push({ text: cur.map((x) => x.text).join(' '), from: cur[0].from, to: cur[cur.length - 1].to });
      cur = [w];
    } else cur = next;
  }
  if (cur.length) out.push({ text: cur.map((x) => x.text).join(' '), from: cur[0].from, to: cur[cur.length - 1].to });
  return out;
}
const wrap = (s) => {
  if (s.length <= 42) return s;
  const words = s.split(' ');
  let best = s, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const d = Math.abs(a.length - b.length);
    if (a.length <= 46 && b.length <= 46 && d < bestDiff) { best = `${a}\n${b}`; bestDiff = d; }
  }
  return best;
};
const cues = [];
// The real voice in the cold open (placed by the A0 scene at f30; speech about f39-f172).
const clipText = 'Bad documentation or outdated documentation is worse than no documentation.';
cues.push({ text: `[Mikey Ariel, foss-north 2019] ${clipText}`, from: 38, to: 174 });
for (const v of t.vo) {
  for (const c of chunks(v.words, v.text, v.from, v.from + v.durationInFrames)) cues.push(c);
}
cues.sort((a, b) => a.from - b.from);
const srt = cues
  .map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(Math.max(c.to, c.from + 24))}\n${c.text.split('\n').map(wrap).join('\n')}\n`)
  .join('\n');
writeFileSync(join(root, `out/doc-drift-${tag}.srt`), srt);

// --- chapters ---
const chapterNames = {
  A0: 'Docs that know when the code moved',
  A1: 'The problem: a runbook the code left behind',
  A2: 'How Doc Drift Sentinel works',
  P1: 'Anchor a page',
  P2: 'A merge flags the page',
  P3: 'Agents are told: Rovo and MCP',
  P4: 'Review and fix, by a person',
  P5: 'Jira changes and the space dashboard',
  A4: 'Catch the slip',
};
const mmss = (frame) => {
  const s = Math.floor(frame / fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const chapters = t.scenes.map((s) => `${mmss(s.from)} ${chapterNames[s.id] ?? s.id}`).join('\n');

// --- description ---
const credits = used
  .map((p) => {
    const lic = p.licence && !/none/i.test(p.licence) ? p.licence.split(' (')[0].trim() : '';
    return `- ${p.source}${p.date ? `, ${p.date}` : ''}: ${p.url}${lic ? ` (${lic})` : ''}`;
  })
  .join('\n');
const desc = `Doc Drift Sentinel: docs that know when the code moved.

A Forge app for Confluence, built for Codegeist 2026. It anchors Confluence pages to the code paths and Jira work they describe, flags a page Possibly stale when a merged pull request or a Jira change touches those anchors, and tells Rovo and coding agents (over MCP) not to trust the page until a person re-verifies it. Detection is deterministic: no AI decides what is stale. Agents never edit a page.

Everything in the product part of this video is real footage from our demo site (development install), including the real merge of PR #482.

Website: https://razvanstatescu.github.io/doc-drift/
Source: https://github.com/razvanstatescu/doc-drift
Made by Nano Soft (Nano-Soft Technology SRL), https://nano-soft.tech/

Chapters
${chapters}

Credits
Voice in the opening: Mikey Ariel, "Docs or it didn't happen!", foss-north 2019, https://www.youtube.com/watch?v=Rq98-audaEc, licensed CC BY. Audio trimmed; use does not imply endorsement.

Pages shown briefly in the opening, as commentary (words unchanged, private names blurred; no endorsement implied):
${credits}

Narration, music and sound effects were generated with AI tools (ElevenLabs) on our own paid account.

Atlassian, Confluence, Jira, Bitbucket and Rovo are trademarks of Atlassian. Doc Drift Sentinel is an independent app built on Atlassian Forge, not made or endorsed by Atlassian.
`;
writeFileSync(join(root, `out/doc-drift-${tag}-description.md`), desc);
console.log(`captions: ${cues.length} cues -> out/doc-drift-${tag}.srt`);
console.log(`description: ${used.length} plate credits, ${t.scenes.length} chapters -> out/doc-drift-${tag}-description.md`);
