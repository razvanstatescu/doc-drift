// Audio pipeline config for the Doc Drift Sentinel launch film (video/BRIEF.md section 2). The ONE place to swap the
// narrator: change VOICE.id / VOICE.name and re-run `node tools/audio/vo.mjs` (the take cache keys on voice, model,
// settings and the spoken text, so every line is re-voiced), then `node tools/audio/timeline.mjs`.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const VIDEO = resolve(here, '../..');

export const VOICE = {
  id: 'cjVigY5qzO86Huf0OWal',
  name: 'Eric',
  model: 'eleven_v4',
  // eleven_v4 takes stability and similarity_boost (speed had no measurable effect in the Satchel tests).
  settings: { stability: 0.5, similarity_boost: 0.8 },
};

/** Narrator audition (BRIEF decision 3): lines V02, V07 and V14 in three voices, one request per line. */
export const AUDITION = {
  lines: ['V02', 'V07', 'V14'],
  voices: [
    { name: 'eric', id: 'cjVigY5qzO86Huf0OWal', why: 'brief default; "Smooth, Trustworthy", American, middle-aged' },
    { name: 'daniel', id: 'onwK4e9ZLuTAKqWW03F9', why: '"Steady Broadcaster", British, formal' },
    { name: 'brian', id: 'n8kTUi6dVrplENT9Un56', why: 'professional narrator, American, warm' },
  ],
};

export const PATHS = {
  cache: resolve(here, 'cache'), // raw takes, transcripts, alignments (git-ignored: tools/**/cache/)
  voDir: resolve(VIDEO, 'public/vo'),
  auditionDir: resolve(VIDEO, 'public/vo/audition'),
  musicDir: resolve(VIDEO, 'public/music'),
  sfxDir: resolve(VIDEO, 'public/sfx'),
  dataDir: resolve(VIDEO, 'src/data'),
  beats: resolve(VIDEO, 'tools/beats.mjs'),
};

/** Mastering targets for every narration line (each file is loudness-matched to this; the master normalises later). */
export const VO_MASTER = { lufs: -20, ceilingDb: -3, lead: 0.04, tail: 0.06 }; // sample-peak ceiling; true peak checked <= -2 dBTP

export const BUDGET = { retakesPerLine: 2 }; // up to 3 takes per line

/**
 * Locked script v1 (BRIEF section 2), in film order; previous_text / next_text come from the neighbours' `say`.
 * `text` is the exact script wording (it goes into timeline.json and the captions); `say` is what the TTS engine reads
 * (pronunciation respellings only, chosen by tools/audio/probe-say.mjs; see AUDIO.md).
 */
export const LINES = [
  // direction: a v4 audio tag sent before the line (not spoken; never in captions or alignment). V00 and V01 came back
  // at 19 chars/s (V01 at 228 wpm) without one, against a median of 16 chars/s; the tag asks for a measured read.
  { id: 'V00', scene: 'A0', text: "That's why we built Doc Drift Sentinel.", direction: '[calm, measured]' },
  { id: 'V01', scene: 'A0', text: 'Docs that know when the code moved.', direction: '[warm, measured]' },
  { id: 'V02', scene: 'A1', text: "It's 3 a.m. Payments is down." },
  { id: 'V03', scene: 'A1', text: 'The runbook says to run rollback.sh.' },
  { id: 'V04', scene: 'A1', text: 'That script was renamed last week.' },
  { id: 'V05', scene: 'A1', text: 'The page still looks fine. It was reviewed a month ago.' },
  { id: 'V06', scene: 'A1', text: 'Ask an AI agent, and it reads you the same step, with confidence.' },
  { id: 'V07', scene: 'A2', text: 'Doc Drift Sentinel anchors each Confluence page to the code and Jira work it describes.' },
  { id: 'V08', scene: 'A2', text: 'When those change, the page is flagged: Possibly stale.' },
  { id: 'V09', scene: 'A2', text: 'And every agent that reads it is told the same.' },
  { id: 'V10', scene: 'A2', text: 'Anchor. Flag. Tell the agents. Then a person decides.' },
  { id: 'V11', scene: 'P1', text: 'Open any page. Doc Drift reads the paths and Jira keys already on it, and suggests anchors.' },
  { id: 'V12', scene: 'P1', text: 'Save, and the page is Verified.' },
  { id: 'V13', scene: 'P2', text: 'Now a teammate merges a pull request that renames the rollback script.' },
  { id: 'V14', scene: 'P2', text: 'Seconds later, the runbook is flagged, with the exact change.' },
  { id: 'V15', scene: 'P2', text: 'No AI made that call. Same change, same result, every time.' },
  { id: 'V16', scene: 'P3', text: 'Ask Drift Reviewer, our Rovo agent, how to roll back.' },
  { id: 'V17', scene: 'P3', text: "It doesn't repeat the old step. It says the page is Possibly stale, and why." },
  { id: 'V18', scene: 'P3', text: 'Coding agents get the same signal over MCP: which pages cover a file, and which to trust.' },
  { id: 'V19', scene: 'P4', text: 'The page owner gets one comment, and opens the review.' },
  { id: 'V20', scene: 'P4', text: 'A rename gets a one-click fix, with no AI.' },
  { id: 'V21', scene: 'P4', text: 'For anything bigger, Drift Reviewer drafts the edit. Nothing changes until a person accepts.' },
  { id: 'V22', scene: 'P4', text: 'Verified. Now the agent can cite it.' },
  { id: 'V23', scene: 'P5', text: 'Jira changes count too. And every space gets a drift dashboard.' },
  { id: 'V24', scene: 'A4', text: "Next time it's 3 a.m., the runbook tells you, and your agent, before step 2." },
  { id: 'V25', scene: 'A4', text: 'Doc Drift Sentinel. Catch the slip before your agents do.' },
];

/**
 * TTS respellings, decided by measurement (probe-say.mjs): Scribe transcripts, the model's own normalized alignment,
 * and the duration of the respelled span. Keys are regexes applied to `text` to get `say`.
 */
export const SAY = [
  [/rollback\.sh/g, 'rollback dot S H'],
];
for (const l of LINES) {
  l.say = SAY.reduce((s, [re, to]) => s.replace(re, to), l.text);
}

/** Scribe keyterms (bias the transcript toward our spellings; they do not change what is checked). */
export const KEYTERMS = ['Doc Drift Sentinel', 'Doc Drift', 'Confluence', 'Jira', 'Rovo', 'Drift Reviewer', 'MCP', 'runbook', 'rollback'];
