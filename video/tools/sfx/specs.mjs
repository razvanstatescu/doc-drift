// Doc Drift Sentinel effects library (eleven_text_to_sound_v3, 48 kHz WAV). Brand: calm, specific, premium, dry.
// The slip and the snap are the brand's own sounds (every badge change, nothing else). Glitches only in the barrage.
// Fields: dur = target length (s); gen = length requested (API minimum 0.5 s; shorter effects are trimmed);
// takes = generations (2 where it matters; pick.mjs-style scoring in process.mjs chooses, the other is kept as <id>-alt);
// mixDb = intended in-mix level as K-weighted momentary max (LUFS); catalog gainDb = mixDb - measured (peak-capped);
// peak = how the placement point is found: 'max' (loudest 10 ms, default), 'last' (the last strong transient, e.g. the
// latch of the slip), 'end' (a sound that ends on its peak: risers, swells, suck-in), 'start' (sustained or multi-hit
// sounds placed by their first hit: type-burst, stutter, downlifter); anchor 'end' keeps the last `dur` s;
// fadeMs / fadeInMs: edge fades; abruptEnd: deliberate hard stop; hpHz: extra high-pass; minHits: QA proxy for counts.
// retakes: extra generations with their own prompt ({take, prompt, influence}); take: the only take to use (a single-take
// effect whose first take failed), otherwise every take is scored and the rest kept as <id>-alt<n>.
const DRY = 'clean, dry, close-mic, no music, no reverb tail';
const GLITCH = `One short harsh digital glitch, a corrupted-data crackle with a bit-crushed buzz and a tiny electrical pop, starts instantly, ${DRY}.`;

export const SPECS = [
  // --- signature
  { id: 'slip', dur: 0.55, gen: 0.8, takes: 2, mixDb: -22, peak: 'last', fadeMs: 40, influence: 0.7,
    desc: 'The brand sound: a precise metal plate slides smoothly and lands with a soft latch click. peakFrame = the latch (when the band stops).',
    prompt: `A short smooth mechanical slide: a small precisely machined metal plate glides along a steel rail for half a second and settles into place with one soft latch click at the end, premium product foley, ${DRY}.`,
    // takes 0-1 had a slide 20-30 dB under the latch (barely there); takes 2-3 ask for an audible slide
    retakes: [2, 3].map((take) => ({ take, influence: 0.8, prompt: `A clearly audible smooth metal-on-metal slide lasting about a third of a second, a precise steel plate gliding on a rail with a soft even whoosh of friction, ending in one soft click as it latches into place, premium product foley, ${DRY}.` })) },
  { id: 'snap', dur: 0.3, gen: 0.5, takes: 2, mixDb: -22, peak: 'max', fadeMs: 30, influence: 0.7,
    desc: 'The slip in reverse: a brighter, quicker click-lock as the band snaps back into line. peakFrame = the lock click.',
    prompt: `A quick bright click-lock: a small precise metal plate snaps back into its slot with one short bright mechanical click, tight and satisfying, premium product foley, ${DRY}.`,
    // takes 0-1 were no brighter than the slip and rang 0.15-0.18 s; takes 2-3 ask for a tighter, brighter lock
    retakes: [2, 3].map((take) => ({ take, influence: 0.8, prompt: `One tiny crisp bright click-lock, a small high-pitched metal latch snapping shut instantly, very short and tight with almost no ring, premium product foley, ${DRY}.` })) },
  // --- UI
  { id: 'tick', dur: 0.1, gen: 0.5, mixDb: -28, fadeMs: 25, onsetRelDb: -20,
    desc: 'One crisp small mechanical tick.',
    prompt: `One single crisp tiny tick, a small precise mechanical click, very short, one tick only, ${DRY}.` },
  { id: 'tick-soft', dur: 0.08, gen: 0.5, mixDb: -32, fadeMs: 25, onsetRelDb: -20,
    desc: 'A softer, rounded tick for small UI changes.',
    prompt: `One single tiny soft tick, a gentle rounded plastic click, very short and quiet, one tick only, ${DRY}.` },
  { id: 'click', dur: 0.12, gen: 0.5, mixDb: -27, fadeMs: 30, onsetRelDb: -20,
    desc: 'A clean modern trackpad or mouse click (cursor clicks in real UI shots).',
    prompt: `One single clean modern mouse click, a crisp short plastic button click, one click only, ${DRY}.` },
  { id: 'type-key', dur: 0.12, gen: 0.5, mixDb: -30, fadeMs: 30, onsetRelDb: -20,
    desc: 'One key press on a quiet low-profile laptop keyboard.',
    prompt: `One single key press on a quiet low-profile laptop keyboard, a soft short tap, one key only, ${DRY}.` },
  { id: 'type-burst', dur: 1.0, mixDb: -30, minHits: 6, fadeMs: 60, peak: 'start', hits: { refractorySec: 0.04, riseDb: 8, floorDb: -24 },
    desc: '1 s of fast typing on a quiet laptop keyboard (a question typed in Rovo, a terminal command).',
    prompt: `Fast steady typing on a quiet modern laptop keyboard, about twelve soft key presses in one second, close-mic, no voices, ${DRY}.` },
  { id: 'pop', dur: 0.15, gen: 0.5, mixDb: -27, fadeMs: 40, onsetRelDb: -20,
    desc: 'A small round clean interface pop (a chip or card appears).',
    prompt: `One single small soft round pop, a clean modern interface pop like a bubble, short and tidy, one pop only, ${DRY}.` },
  // --- air
  { id: 'whoosh-short', dur: 0.3, gen: 0.5, group: 'hit', mixDb: -25, fadeMs: 40, take: 1,
    desc: 'An 8-frame whip between surfaces; place its peak on the cut frame.',
    prompt: `A very fast short whip-pan whoosh, a sharp swipe of air passing by in a quarter of a second, cinematic, ${DRY}.`,
    // take 0 was 0.17 s long (5 frames); take 1 asks for the whole 8 frames
    retakes: [{ take: 1, influence: 0.75, prompt: `A fast whip-pan whoosh lasting about a third of a second: air swells quickly to a sharp peak in the middle and falls away, cinematic, ${DRY}.` }] },
  { id: 'whoosh', dur: 0.9, group: 'hit', mixDb: -25, fadeMs: 80,
    desc: 'A smooth cinematic pass-by whoosh, rising to a peak and falling away; peak on the cut.',
    prompt: `A smooth cinematic whoosh passing by, airy and clean, rising to a peak in the middle and falling away, ${DRY}.` },
  { id: 'swish-up', dur: 0.6, mixDb: -27, fadeInMs: 60, fadeMs: 60,
    desc: 'A light rising swish (type or a card sets in).',
    prompt: `A light soft rising swish, a gentle airy whoosh sweeping upward in pitch, refined, not a slide whistle, ${DRY}.` },
  { id: 'reverse-swell', dur: 1.5, gen: 2.0, mixDb: -25, peak: 'end', anchor: 'end', fadeInMs: 80, fadeMs: 4, abruptEnd: true,
    desc: 'A reversed cymbal swell that ends on its loudest point on the last frame; end it on the cut.',
    prompt: `A reverse cymbal swell: a reversed crash cymbal rising in volume for one and a half seconds and cutting off abruptly at its loudest point, no impact after it, ${DRY}.` },
  { id: 'riser-2bar', dur: 4.0, gen: 4.5, mixDb: -26, peak: 'end', anchor: 'end', fadeInMs: 150, fadeMs: 6, abruptEnd: true,
    desc: 'A 2-bar (4 s) tense riser that ends on its top; end it on the bar line.',
    prompt: `A tense cinematic riser building for four seconds: filtered noise and a rising synth tone getting steadily brighter and louder, ending at its very peak with no impact and no drums, no music.` },
  { id: 'downlifter', dur: 2.0, mixDb: -27, fadeMs: 200, peak: 'start',
    desc: 'A descending noise sweep that falls in pitch and fades out over 2 s (after a hit or a reveal).',
    prompt: `A descending downlifter: filtered white noise and a soft tone sweeping down in pitch and fading out over two seconds, smooth, ${DRY}.` },
  // --- impacts
  { id: 'hit-soft', dur: 0.8, group: 'hit', mixDb: -22, fadeMs: 150, hpHz: 30, sat: { mix: 0.4, drive: 3 }, // centroid was 76 Hz: harmonics so it reads on laptop speakers
    desc: 'A soft muted low thump with a short tail.',
    prompt: `A soft cinematic hit, a muted low felt thump with a short soft tail, starts instantly, ${DRY}.` },
  { id: 'hit-deep', dur: 1.2, group: 'hit', mixDb: -20, fadeMs: 250, hpHz: 30, sat: { mix: 0.25, drive: 2.5 },
    desc: 'A deep cinematic impact with a short boom tail.',
    prompt: `A deep cinematic impact, a big low boom with a punchy transient and a short rumbling tail, starts instantly with no pre-roll, no music.` },
  { id: 'boom', dur: 3.0, gen: 3.0, takes: 2, group: 'hit', mixDb: -18, fadeMs: 600, hpHz: 28, sat: { mix: 0.25, drive: 2.5 },
    desc: 'The big one: a cinematic impact with a long tail (the reveal, the end card).',
    prompt: `A massive cinematic impact for a big reveal: a deep sub boom with a punchy transient, followed by a long dark rumbling tail that rings out for three seconds, starts instantly with no pre-roll, no riser and no whoosh before the hit, no music.` },
  { id: 'sub-drop', dur: 1.2, mixDb: -21, fadeMs: 700, sat: { mix: 0.35, drive: 2.5 },
    desc: 'A deep sub bass drop that falls in pitch and fades over 1 s.',
    prompt: `A deep cinematic sub bass drop, a low boom that falls in pitch and fades out over one second, ${DRY}.` },
  // --- barrage only
  { id: 'glitch-1', dur: 0.18, gen: 0.5, group: 'hit', mixDb: -23, fadeMs: 25, prompt: GLITCH, desc: 'Digital glitch, 0.1-0.2 s (barrage only).' },
  { id: 'glitch-2', dur: 0.15, gen: 0.5, group: 'hit', mixDb: -23, fadeMs: 25, prompt: GLITCH, desc: 'Digital glitch, 0.1-0.2 s (barrage only).' },
  { id: 'glitch-3', dur: 0.12, gen: 0.5, group: 'hit', mixDb: -23, fadeMs: 20, prompt: GLITCH, desc: 'Digital glitch, 0.1-0.2 s (barrage only).' },
  { id: 'shutter', dur: 0.2, gen: 0.5, mixDb: -25, fadeMs: 30, onsetRelDb: -12,
    desc: 'A crisp camera shutter click (a plate freezes).',
    prompt: `A single crisp mechanical camera shutter click with a tiny mirror clack, ${DRY}.` },
  { id: 'stutter', dur: 0.5, mixDb: -25, minHits: 5, peak: 'start', hits: { refractorySec: 0.02, riseDb: 6, floorDb: -24 },
    desc: 'A fast digital stutter that speeds up like a skipping CD (barrage only).',
    prompt: `A fast digital stutter: one tiny electronic blip repeated about ten times and speeding up like a skipping CD, harsh and clean, ${DRY}.` },
  { id: 'suck-in', dur: 0.5, gen: 0.7, mixDb: -22, peak: 'end', anchor: 'end', fadeInMs: 30, fadeMs: 4, abruptEnd: true,
    desc: 'Reverse suction to a dead stop: ends on its loudest point on the last frame (the barrage is sucked to the centre).',
    prompt: `A fast reverse whoosh like a sharp inhale of air, rising quickly in intensity and pitch and stopping dead at its loudest point, sucked in, no impact, ${DRY}.` },
  { id: 'static', dur: 0.4, gen: 0.5, mixDb: -27, fadeMs: 6, abruptEnd: true, shelf: { hz: 3000, db: 4 },
    desc: 'A short burst of harsh analog TV static, cut abruptly (barrage only).',
    prompt: `A short burst of harsh analog TV static, bright white-noise hiss with crackles across the whole spectrum, abruptly cut, ${DRY}.` },
  // --- story
  { id: 'alert', dur: 0.9, gen: 1.0, takes: 2, mixDb: -24, fadeMs: 60, minHits: 3, hits: { refractorySec: 0.08, riseDb: 10, floorDb: -20 },
    desc: 'A generic urgent pager alert: three short identical tones (the 3 a.m. alert card). Not any real product\'s sound.',
    prompt: `A generic urgent electronic alert: three short identical high synthetic beeps in quick even succession, like a monitoring pager alarm, plain sine tones, not a phone ringtone, not any known product sound, ${DRY}.` },
  { id: 'error-blip', dur: 0.25, gen: 0.5, mixDb: -27, fadeMs: 40, sat: { mix: 0.25, drive: 2.5 },
    desc: 'A short dull low error blip (no such file or directory).',
    prompt: `One short low error blip, a single dull muted synth tone, not harsh, not a buzzer, ${DRY}.` },
  { id: 'clock-tick', dur: 0.15, gen: 0.5, mixDb: -29, fadeMs: 40, onsetRelDb: -20, take: 1,
    desc: 'One tick of a quiet mechanical clock at night (repeat it on beats).',
    prompt: `One single tick of a quiet mechanical wall clock at night, a crisp small wooden tick, one tick only, ${DRY}.`,
    // take 0 came back near-silent (raw peak under -40 dBFS)
    retakes: [{ take: 1, influence: 0.75, prompt: `One single crisp tick of a mechanical clock, a sharp clear wooden tick close to the microphone, one tick only, ${DRY}.` }] },
  { id: 'merge', dur: 0.6, mixDb: -25, fadeMs: 80,
    desc: 'A satisfying soft confirm (the PR merges).',
    prompt: `A satisfying soft confirmation sound: a smooth warm two-note rising chime with a soft click under it, premium modern app, not any known product sound, ${DRY}.` },
  { id: 'chime-soft', dur: 1.0, mixDb: -28, fadeMs: 200,
    desc: 'A single soft glassy chime with a quick decay.',
    prompt: `One single soft glassy chime, a gentle warm bell tone struck once that decays quickly, no music.` },
];

/** What each kept take is, from the measurements in qa-report.json (used in the catalog desc of alternates). */
export const TAKE_NOTES = {
  'slip.c0': 'composite: take 3 slide 12 dB under take 1 latch; latch at 0.32 s, dry (40 ms decay)',
  'slip.t0': 'generated take: latch at 0.32 s but its slide sits 26 dB under it (barely audible), 0.2 s ring',
  'slip.t1': 'generated take: quick dry latch at 0.17 s, slide 25 dB under it (barely audible)',
  'slip.t2': 'generated take: an audible 0.55 s friction slide with no latch',
  'slip.t3': 'generated take: an audible 0.55 s friction slide with no latch (its first 0.34 s is the slide in the composite)',
  'snap.t3': 'generated take: bright (centroid 6.5 kHz), 20 ms decay',
  'snap.t2': 'generated take: bright (5.4 kHz) but four small clicks',
  'snap.t1': 'generated take: duller (3.4 kHz), rings 0.15 s',
  'snap.t0': 'generated take: duller (3.2 kHz), rings 0.18 s',
  'boom.t0': 'generated take: hit peaks at 85 ms, 2 s tail',
  'boom.t1': 'generated take: slower attack (peak at 0.28 s), 1.7 s tail',
  'alert.t1': 'generated take: three even tones 125 ms apart',
  'alert.t0': 'generated take: two long tones 0.5 s apart (not three)',
};
