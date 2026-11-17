# R6 · Motion and editing for v5: what keeps a short product film gripping, and what fits us

Research for the v5 launch film (75 to 110 s, a new script in parallel; Remotion 4.0.543, 1920 x 1080, 30 fps), written
2026-11-17. Razvan finds v4 (`video/out/doc-drift-v4.mp4`, 2:35) "a bit boring". The product is plain to look at, so
editing has to keep viewers engaged: animation, transitions, movement, sound sync and rhythm. This file:
- measures v4's rhythm against Pot and Satchel (section 2);
- collects what research and launch films say (section 3);
- ranks 22 techniques by impact for the effort, each placed in our story with a Remotion recipe (section 4);
- maps the story beats (section 5);
- sets an explicit rhythm spec for v5 (section 6);
- reports four prototypes of techniques the v4 kit does not have (section 7).

It also folds in the director's note from the v4 viewer test (`video/out/v5/viewer-test/v4/SUMMARY.md`). The opening
collage read as decoration. The second half felt crammed. The MCP JSON's 9 s was "the dullest part". The real footage
appeared only as one-second thumbnails. So engagement here is not more cuts. It is variety and clarity: fast
connective motion, slower and legible key moments, and real recordings that are themselves worth watching.

Evidence and scripts are in `video/out/v5/r6/` (git-ignored like all of `video/out/`):

| What | Where |
| --- | --- |
| Per-frame picture and sound measures, OCR of on-screen text | `data/*-frames.json`, `data/*-ocr.jsonl` |
| Results | `data/summary.json`, `data/events.json`, `data/extra.json`, `data/prototypes-rhythm.json` |
| Scripts | `scripts/measure6.py`, `scripts/ocr.swift` (Apple Vision), `scripts/analyze6.py`, `scripts/strips.py` |
| Images | `rhythm-strips.png` (the three films on one time scale), `shot-lengths.png`, `check/interrupts-*.jpg` (the interrupt detector checked by eye), `prototypes-sheet.jpg`, `strips/`, `stills/` |
| Prototype clips | `p1-directed-recording.mp4`, `p2-under-the-page.mp4`, `p3-edit-type.mp4`, `p4-carry-cuts.mp4` |

## 0. The answer in brief

1. **v4 is not under-edited. It is uniformly busy.** In the body it has 20.7 moving transitions per minute (Pot 9.5,
   Satchel 7.4) and a median shot of 1.5 s (Pot 2.7 s, Satchel 4.3 s). Its longest shot is 7.6 s. Pot holds three shots
   of about 13 s; Satchel holds one of 21.6 s. The references spend 84 to 85% of their body time in shots of 4 s or
   more; v4 spends 47%.
2. **All three films change something about once a second** (47 to 50 pattern interrupts a minute, a median gap of
   1.0 s). What differs is where the change happens. v4 changes the whole frame 30 times a minute (camera re-aims,
   proofs that dim and blur the world, transitions). Pot and Satchel do it 18 times a minute and make the other 60% of
   their changes inside a stable layout: a card arrives, a word lands, a number rolls. This matches the viewer test:
   "crammed", "a feature checklist".
3. **v4's pace has no shape, and it peaks late.** P1, P4 and P5 run at 45 to 50 whole-frame changes a minute, the A
   acts at 19 to 27. Research on films shows the opposite arc: long shots in the prologue, the shortest at the climax,
   long again in the epilogue (Cutting 2016).
4. **Sound is dense in all three; sync is what separates them.** Strong audio onsets run at 90 to 135 a minute in every
   film (music and voice), and only 13 to 15% of them land on a picture event. Satchel puts 62% of its hard cuts on a
   strong hit within 2 frames, 3.3 times chance. v4 does it for 36% (1.3 times chance), and its whooshed transitions
   land on a sharp onset less often than chance.
5. **Type is not v4's gap.** Big type is on screen 76% of the time (Pot 79%, Satchel 93%). In 75% of type arrivals the
   picture also changes (Pot 66%, Satchel 80%).
6. **The research says to spend cuts, not sprinkle them.** "Every N seconds" pattern-interrupt rules are creator
   folklore. The evidence:
   - every structural change buys an orienting response;
   - related cuts cost less capacity than unrelated ones;
   - edits within one scene raise arousal and memory without raising load;
   - fast pace with dense content overloads viewers, and that describes our agents and MCP beat;
   - a cut lands best at an action boundary, with its sound peak on or just after the contact frame.
7. **Launch films ration their big moves.** Apple "never really overuse[s]" its transition techniques. Figma breaks
   each launch idea up, "first this, then that", and cuts at the fastest point of a slow-fast-slow move. Linear breaks
   single UI elements out of the product rather than inventing 3D.
8. **The v5 rhythm in one line:** fast connective bursts between beats, carried by one object so the eye never resets;
   long, legible stations at the four key moments (the real merge to flag at full size, the agent's answer, the fix,
   Verified); holds kept alive by events inside the shot, not by cuts. Section 6 has the numbers.
9. **Four prototypes** (`src/v5/lab/`, section 7):
   - a real recording directed at full size: follow-zoom to 1:1 detail, a spotlight, a labelled 9x ramp over the
     server wait, real clicks landed on beats, an honest clock carried to "19 s" on the real page;
   - the page lying over its code, with the code slipping underneath it;
   - type that edits itself: strike-and-replace, and a spoken word that docks into the byline;
   - carry cuts, where one object holds the eye through Night to Day and from the page to the agent's answer.

   All four work at film quality. The measurements under them set two limits: real 14 px UI text tops out at 28 px on
   screen at the crispness limit, and a directed recording should move its camera at most every 2 to 3 s.

## 1. Method

**Films.** v4 (`video/out/doc-drift-v4.mp4`, 155.2 s), Pot (`near/Pot/marketing/video/out/final/PotDemo.mp4`, 82 s,
60 fps resampled to 30), Satchel (`near/Satchel/marketing/out/satchel-2-v6.mp4`, 138.2 s). "Body" is the film after its
cold open, as in R1 (v4 from 13.2 s, Satchel from 8.7 s, Pot whole). I also picked 8 official launch films (60 to 161 s)
to measure the same way, but YouTube refused the downloads (HTTP 403) and I did not work around it. They are listed in
section 8 for a manual measurement.

**Measures** (`scripts/measure6.py`, `scripts/analyze6.py`). Each film is decoded at 30 fps, 480 x 270 grey, as in R1.
- *Transition event* (R1's definition): a cluster of frames where 25% or more of the pixels change. 1 to 2 frames is a
  hard cut; 3 or more is a moving transition (whip, push, wipe, morph, fast camera move).
- *Shot*: the span between two transition events.
- *Pattern interrupt*: a rise in novelty, measured as the share of 16 x 9 blocks that are new against 0.2 s earlier. The
  peak must rise 0.08 or more above the quietest point of the previous 0.5 s and at least double it. Peaks closer than
  9 frames merge. A creep, a pan or flowing tide lines never rise from calm, so they never count. Classes by the rise:
  - *major*: 0.35 or more, a third of the frame or more is new (a cut, a transition, a big camera move);
  - *medium*: 0.15 to 0.35 (a card, a panel or a line of big type arrives);
  - *minor*: 0.08 to 0.15 (a chip, a word group, a badge flip).

  I checked the detector by eye on 12 consecutive events in v4 and in Pot (`check/interrupts-v4.jpg`,
  `check/interrupts-pot.jpg`). Every flagged frame was a real, visible event.
- *Sound onset*: a spectral-flux peak (1024-point STFT, log magnitude) with a robust z-score against the second on
  either side. "Hit" means z of 6 or more, a sound that stands well out of the bed. I give sync as a share and as lift
  over chance. Chance comes from the same test with the picture events shifted 0.5 to 5 s at random, 400 times. Dense
  music makes chance high (27 to 60%), so lift is the honest number.
- *Type* (`scripts/ocr.swift`, Apple Vision, 6 samples a second). Big type is a text line at 5.5% of frame height or
  more, about a 45 px font. An arrival is a big line not seen in the 2 previous samples. A line "moves" when its box
  moves 6 px or more, or changes height by 2% or more, between samples. Picture and type "move together" when 10% or
  more of the blocks outside the type are new within 3 frames.

**Limits.** These are proxies; the thresholds are mine and consistent across films. Sound onsets cannot tell music,
voice and effects apart. For v4 I counted the effects in source instead: about 124 `<Sfx>` placements, roughly 48 a
minute (40 `tick-soft`, 21 `pop`, 18 `whoosh-short`, 11 `click`, 9 `tick`, 8 `slip`, 6 `swish-up`, the rest single).
OCR misses some stylised type.

## 2. Measured: v4 against Pot and Satchel

| Measure (body unless marked) | v4 | Pot | Satchel |
| --- | --- | --- | --- |
| Length | 155.2 s | 82.0 s | 138.2 s |
| Frames with visible change (whole film) | 98.6% | 98.1% | 80.8% |
| Hard cuts per minute | 4.6 | 4.4 | 3.7 |
| **Moving transitions per minute** | **20.7** | 9.5 | 7.4 |
| Shots: count, **median**, p25 to p75, p90, longest | 60, **1.53 s**, 1.0 to 3.0, 5.4, 7.6 | 20, 2.7 s, 0.7 to 5.1, 12.9, 13.7 | 24, 4.3 s, 2.2 to 6.3, 8.3, 21.6 |
| Shots under 1 s | 23% | 35% | 8% |
| **Shots of 8 s or more** | **0** | 3 | 3 |
| **Body time in shots of 4 s or more** | **47%** | 85% | 84% |
| Shot-length spread (CV); lag-1 correlation of log lengths | 0.78; 0.18 | 1.05; 0.07 | 0.84; 0.00 |
| Pattern interrupts per minute (major / medium / minor) | 50.3 (**30.4** / 13.5 / 6.3) | 46.8 (17.6 / 17.6 / 11.7) | 49.6 (17.6 / 15.3 / 16.7) |
| Gap between any interrupts: median, p90, longest | 1.0, 2.1, 5.7 s | 1.0, 2.5, 4.3 s | 1.0, 2.4, 4.0 s |
| Gap between major interrupts: median, p90, longest | 1.4, 4.0, 7.7 s | 2.6, 5.9, 13.7 s | 2.4, 6.3, 21.5 s |
| Body time inside gaps of over 4 s between major and medium interrupts | 12% | 24% | 29% |
| Strong sound hits per minute (music, voice and effects) | 135 | 132 | 93 |
| Strong hits that land on a picture event (2 frames) | 13% | 13% | 15% |
| **Hard cuts with a strong hit within 2 frames** (chance, lift) | 36% (29%, 1.3) | 33% (27%, 1.3) | **62% (19%, 3.3)** |
| Moving transitions with a strong hit within 2 frames (chance, lift) | 16% (29%, 0.6) | 23% (27%, 0.9) | 25% (22%, 1.2) |
| Mean offset of the hit from a hard cut (+ = sound after) | -0.1 f | +0.8 f | +1.3 f |
| Big type on screen | 76% | 79% | 93% |
| Type arrivals per minute | 64 | 64 | 66 |
| Type arrivals where the picture outside the type changes too | 75% | 66% | 80% |
| Big type moving between samples (else held still) | 47% | 54% | 32% |

v4 act by act (`data/extra.json`):

| Act | From | Length | Shots | Median shot | Major interrupts per minute | All interrupts per minute |
| --- | --- | --- | --- | --- | --- | --- |
| A0 cold open | 0:00 | 13.2 s | 16 | 0.4 s | 27.2 | 40.8 |
| A1 3 a.m. | 0:13 | 22.0 s | 6 | 3.5 s | 19.1 | 38.2 |
| A2 solution | 0:35 | 22.0 s | 7 | 1.8 s | 21.8 | 40.9 |
| P1 anchor | 0:57 | 12.0 s | 9 | 1.0 s | **50.0** | 70.0 |
| P2 flag | 1:09 | 18.0 s | 7 | 1.4 s | 36.7 | 50.0 |
| P3 agents | 1:27 | 22.0 s | 7 | 2.5 s | 21.8 | 51.8 |
| P4 review | 1:49 | 22.0 s | 14 | 1.2 s | **46.4** | 65.5 |
| P5 scale | 2:11 | 8.0 s | 5 | 1.7 s | **45.0** | 60.0 |
| A4 close | 2:19 | 16.0 s | 5 | 2.9 s | 18.8 | 37.5 |

**Reading.**
- **The rate of change is not the problem; the size of each change is.** All three films renew something about every
  second. In v4 most renewals are whole-frame. Each proof dims and blurs its twin, the camera re-aims for every line, and
  P1 to P5 are joined by many moving transitions. In Pot the phone stays put on the left and the type zone changes on the
  right (`check/interrupts-pot.jpg`). Satchel's long shots hold one illustration while things arrive in it.
- **The references are bursty.** Their shot lengths spread more (Pot CV 1.05): long takes, then a quick run of short
  shots, then a long take again. v4 is short and even everywhere, so nothing feels like a moment.
- **Satchel's sound is cut to.** Its hard cuts sit on strong accents, mostly 1 frame after the picture, which is the
  side of sync the ear forgives (section 3.4). Whooshes swell into a peak, so they register as no onset at all. A
  whooshed transition needs a small transient (tick, latch) at its landing to read as synced.
- **Type holds still in Satchel more often** (68% still) and drifts with the camera in Pot and v4. Either works; what
  matters is the reading rule (section 6.6).

## 3. What the research and the launch films say

Fetched on 2026-11-17 by two research passes (one on editing science and sound, one on launch films and studios) and
spot-checked here. "Unverified" means seen only second-hand.

### 3.1 Pacing and shot length
- **Contemporary features average 4.3 s per shot.** Shots are "initially long in the prologue", shorten, are shortest
  at the climax, then show a "marked increase in the epilogue" (Cutting 2016, https://doi.org/10.1186/s41235-016-0029-0).
  Bordwell gives "4-6 seconds in recent years" and argues for "preferred ranges"
  (https://cinemetrics.uchicago.edu/article/5dcb488e-0f5c-4a5c-824b-a052518861ba). For v5, set a range per section and
  shape the arc.
- **Neighbouring shots have correlated lengths, close to 1/f** (Cutting, DeLong and Nothelfer 2010,
  https://doi.org/10.1177/0956797610361679). Lengths should drift from shot to shot, with rare big jumps: neither a
  metronome nor random.
- **TV ads were under 2 s per shot by 1991** (MacLachlan and Logan 1993, https://doi.org/10.1080/00218499.1993.12466882,
  Unverified). Music video is the register of "abrupt scene changes every 2-4 s" (Tseng et al. 2009,
  https://doi.org/10.1167/9.7.4). Both are too fast to read a product UI.

### 3.2 Attention and cuts
- **Structural features (cuts, motion onsets) "elicit involuntary physiological attentional responses"**: each cut buys
  an orienting response (Lang 1990, https://doi.org/10.1177/009365090017003001).
- **"Processing unrelated cuts required more capacity."** Memory was better after related cuts, those linked "by
  either visual or audio information" (Lang et al. 1993, https://doi.org/10.1177/009365093020001001). This is the case
  for carry cuts and J-cuts.
- **Edits within one scene raise arousal and memory "without significantly increasing the cognitive load"** (Lang et
  al. 2000, https://doi.org/10.1207/s15506878jobem4401_7). Punch-ins and in-shot events are the cheap way to add rhythm.
- **"Fast pace and arousing content overloads the processing system"** (Lang et al. 1999,
  https://doi.org/10.1080/08838159909364504). Slow down where the content is densest. In our film that is the agents
  and MCP beat.
- **A quarter of edits go unnoticed, a third when the edit coincides with a sudden onset of motion** (Smith and
  Henderson 2008, https://doi.org/10.16910/jemr.2.2.6). Cut on motion to hide a cut; cut on stillness to make one felt.
- **Cuts at an action's breakpoint improve recall** (Schwan et al. 2000, https://doi.org/10.3758/bf03213801). Action
  discontinuities drive how viewers segment events (Magliano and Zacks 2011,
  https://doi.org/10.1111/j.1551-6709.2011.01202.x). The best cut point is the moment a UI step completes.
- **"Pattern interrupt every N seconds" is not research.** "YouTube does not publish a requirement..."
  (https://www.creatoressentials.com/glossary/pattern-interrupt/). Creator guides quote anything from 3 to 60 s.
- The leaked MrBeast production guide places re-engagements minutes apart in 13-minute videos
  (https://prog.sijanec.eu/dir/How-To-Succeed-At-MrBeast-Production.pdf, its authenticity Unverified). For 90 s that
  means one escalation near the middle, then the payoff.
- **Length is a content decision.** Engagement differs only "minorly" between 1 and 5 minutes (Wistia 2024,
  https://wistia.com/learn/marketing/insights-state-of-video-report). Duration barely moves retrospective ratings; the
  peak and the end do (Fredrickson and Kahneman 1993, https://doi.org/10.1037/0022-3514.65.1.45).
- **The judges are captive.** They watch to judge, not to be kept from scrolling. Google's ABCD rules ("introduce your
  product or brand in the first five seconds", https://services.google.com/fh/files/misc/youtube_google_abcd_reference_guide_en.pdf)
  fit the cold open and social cut-downs, not every beat.

### 3.3 Words on screen with a voice
- **Full narration repeated as on-screen text lowers retention** (Mayer, Heiser and Lonn 2001,
  https://doi.org/10.1037//0022-0663.93.1.187). **"2-3 printed words" next to the diagram raise it** (Mayer and Johnson
  2008, https://doi.org/10.1037/0022-0663.100.2.380). This backs R4's rule of one short statement at a time and the
  "type becomes UI" device.
- **Reading time for supers:** "0.2 seconds per word + 2 seconds recognition time" up to 9 words (Clearcast,
  https://4xg9hcb4zvrzygb.productfruits.help/en/article/legal-supers-our-helpful-tools). A 4-word statement holds 2.8 s
  from landing.
- **Viewers need to re-read** ("the inability to regress affected comprehension negatively", Schotter et al. 2014,
  https://doi.org/10.1177/0956797614531148). Never replace the words of a key claim one by one while it is being read.
  Strike-and-replace is for a literal being edited, not for the claim.

### 3.4 Sound and sync
- **A synchronised auditory pip "drastically decreases search times" for the visual object it marks** (Van der Burg et
  al. 2008, https://doi.org/10.1037/0096-1523.34.5.1053). A tick on the byline flip helps the eye find it in a busy
  frame, but only when it is frame-accurate.
- **The window is asymmetric.** Broadcast tolerance is +45 ms (sound early) to -125 ms (sound late) for detectability
  (ITU-R BT.1359-1, https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf), and 40 ms early
  to 60 ms late end to end (EBU R37, https://tech.ebu.ch/docs/r/r037.pdf). Fusion holds from -30 ms to +170 ms (van
  Wassenhove et al. 2007, https://doi.org/10.1016/j.neuropsychologia.2006.01.001). Impact sounds are less forgiving than
  speech (Dixon and Spitz 1980, https://doi.org/10.1068/p090719). In frames: put a hit's transient on the contact frame
  or 1 frame after it, never more than 1 frame before.
- **J and L cuts:** the next shot's sound runs over the current picture, or the reverse
  (https://vimeo.com/blog/post/guide-to-film-cuts). They smooth a cut because audio-linked cuts are "related" (3.2).
- **Keep the voice 10 LU or more over ducked music** (Torcoli et al. 2019, https://doi.org/10.17743/jaes.2019.0052).
- **Repeated production effects lose their pull** (Potter et al. 2018, https://doi.org/10.5334/joc.43). Ration and vary
  whooshes; a new voice line re-orients without habituating.
- **"Uplifters" and removing then reintroducing the bass "cause tension and anticipation"** (Solberg 2014,
  https://doi.org/10.12801/1947-5403.2014.06.01.04). Use one drop before the film's biggest landing.

### 3.5 Launch films and studios
- **Apple.** A filmmaker's breakdown of the keynote films finds Apple "never really overuse[s] any of these techniques ...
  oftentimes a simple cutback to a previous location is all we see". Presenter shots use "a subtle dolly in out or camera
  arc". Shared objects serve as blend points: architecture, screens, a light flare into a sun flare (Adam Grasso,
  https://www.youtube.com/watch?v=kdFQYOigeXY, about 4:20 to 6:32). These quotes come from the video's auto-captions;
  the 9to5mac write-up (https://9to5mac.com/2023/06/21/apple-keynote-videos-transitions-and-editing/) has only "the
  really slick stuff is in the transitions". Our blend points are the page edge, the badge and a line of the diff.
- **Apple "Don't Blink" (107 s).** "Most words appear on screen for only five to seven frames". Flat XY motion, broken
  once by z-space; "you can animate the meaning of the word or phrase using the word or phrase itself"
  (https://motionographer.com/2016/09/14/4-ways-dont-blink-is-a-masterclass-of-type-and-rhythm/). Take the grammar
  break used once; leave the 0.2 s words, too fast for us.
- **Figma Brand Studio.** "We break it up, first this, then that, so it's easier to digest". "You might go from slow, to
  fast, to slow again, and do a hard cut at the fastest point". A hold is "a pause that gives the viewer time to register
  what just happened" (https://www.figma.com/blog/principles-in-motion/).
- **Figma, Config 2025.** "Expressive type takes a bit more time to animate on"; functional type is quicker. The opening
  film dropped from 60 to 15 fps to feel "tactile and handmade". Sound started before the picture: "an orchestra warming
  up" (https://www.figma.com/blog/how-we-shaped-the-visual-identity-for-config-2025/).
- **Figma 3D post.** One perspective parent for all children; a hand-held camera style "pared back and retimed to match
  the type" (https://www.figma.com/blog/how-3d-transforms-and-figmas-agent-brought-a-launch-video-to-life/).
- **Vercel Ship 2025** (Basement): "animating on twos ... 12 frames per second, even when the camera ... moves at 24 fps"
  (https://basement.studio/post/behind-the-ship).
- **Linear** (Julian Lehr): isometric 3D "looked nice but they didn't do a great job of ... communicating how linear
  actually looks"; instead "breaking out individual UI elements and removing a lot of the complexity"
  (https://www.youtube.com/watch?v=C5KighUaZX4, 31:13). On another podcast: "simplify simplify simplify"
  (https://www.youtube.com/watch?v=NQmw8eqfd9o).
- **Sound.**
  - A launch-video sound design groups its sounds into "Interface + UI", "Whooshes + Transitions" and "Impacts + Risers",
    mixing "mechanical, tonal and UI sounds to keep it warm ... not overly digital"
    (https://contra.com/p/ks662MrZ-hero-ui-launch-video-sound-design-exploration).
  - Antfood's UI sounds for Instacart's Caper Cart use "a minimal set of related sounds" and give errors "gentle,
    supportive feedback" (https://antfood.com/work/capercart). Possibly stale gets a soft cue, never an alarm.
- **Masks and wipes.** `clip-path: inset()` reveals, a before/after slider made by clipping the top layer, and split
  outline and filled text (Emil Kowalski, https://emilkowal.ski/ui/the-magic-of-clip-path). They port directly to
  Remotion styles.
- **Counters.** NumberFlow rolls each digit in the direction of the change, with masked edges
  (https://number-flow.barvian.me/). Our `NumberRoll` already does this.
- **Easing.** Apple's springs: bounce 0 is "a smooth, gradual change"; above about 0.4 "may feel too exaggerated"
  (https://developer.apple.com/videos/play/wwdc2023/10158/). IBM Carbon reserves "expressive motion for occasional,
  important moments" (https://carbondesignsystem.com/elements/motion/overview/). Our kit is critically damped already;
  keep expressive curves for the 4 key moments.

### 3.6 Metaphors for agents and for change
- **Better Images of AI** (https://blog.betterimagesofai.org/wp-content/uploads/2023/02/Better-Images-of-AI-Guide-Feb-23.pdf)
  advises against "the colour blue", "descending code", "white robots", anthropomorphism and Creation of Adam
  variations. Its tests: honesty ("showing accurately what the technology can do, and nothing more"), humanity,
  necessity, specificity. Our brand already bans robots.
- **Agents as a point, not a figure.** OpenAI's rebrand gives the assistant a pulsing "non-human" point
  (https://wallpaper.com/tech/openai-has-undergone-its-first-ever-rebrand-giving-fresh-life-to-chatgpt-interactions).
  Apple shows Siri as "an elegant glowing light that wraps around the edge of the screen"
  (https://apple.com/newsroom/2024/06/introducing-apple-intelligence-for-iphone-ipad-and-mac/). An agent can be a reading
  point that stops at the badge.
- **Change as a ripple.** "A single glyph can shift and trigger a ripple that transforms an entire composition" (Config
  2025, above). For us: one changed line reaches exactly the pages and readers that cite it.
- **Cautions.**
  - Vercel softened a visual that triggered trypophobia
    (https://vercel.com/blog/designing-and-building-the-vercel-ship-conference-platform).
  - Apple apologised for "Crush!" (https://9to5mac.com/2024/05/09/ipad-pro-crush-ad-apology/).

  Destruction reads as threat. Show a metaphor to a few people before keeping it.

## 4. Technique catalogue, ranked by impact for the effort

**Columns.** Impact is what it does for engagement and clarity in our story. Cost is to production quality, per use,
on top of the kit. Fit is against `brand/README.md`: one amber for drift, calm motion, honesty, real strings.
"Kit" means the v4 kit already has it; "P1" to "P4" are the prototypes.

| # | Technique | Where in the story | Impact | Cost | Fit | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Direct the real recording | Merge and flag; agents told (Rovo); a person fixes (Replace, Accept) | Very high | Medium | High | **P1** |
| 2 | Stations: long takes with events inside | Every key moment | Very high | Low (a rule) | High | Rule (kit parts) |
| 3 | Carry cuts: one object across the seam | Problem to product; flag to agents; fix to Verified; the end | High | Medium | High | **P4** |
| 4 | The slip underneath: the page over its code | What it is; link page to code; the flag (explained) | High | Medium | Very high | **P2** |
| 5 | Pace with a shape: fast connective, slow key | Whole film | High | Free | High | Spec (6) |
| 6 | Sound on contact, J-cuts, cuts on accents | Whole film | High | Low | High | Rule |
| 7 | Type becomes UI | The flag; Verified | Medium-high | Low | High | **P3** |
| 8 | Strike and replace in place | Problem (the rename); a person fixes | Medium-high | Low | High | **P3** |
| 9 | Honest time compression: ramp, label, clock | Merge to flag (19 s); Rovo thinking | Medium-high | Low | Very high | **P1** |
| 10 | Before and after on one frame (wipe) | The end (3 a.m. again); a person fixes | Medium-high | Low | High | New (recipe) |
| 11 | Loop and payoff: the opening returns, resolved | The end | Medium-high | Low | High | Recipe |
| 12 | Spotlight on crafted twins | Agents told (the answer's first line); fix (the step) | Medium | Low | High | P1's `Spotlight` |
| 13 | Graphic match on the three bands | What it is (mark to page); the end (page to mark) | Medium | Low-medium | Very high | Recipe |
| 14 | Mask line reveal (a second type voice) | Labels, code, quotes everywhere | Medium | Very low | High | **P3** |
| 15 | Cold open on sound | The opening problem | Medium | Very low | Medium-high | Recipe |
| 16 | Silence before the landing (one music drop) | The flag or the snap back | Medium | Low | High | Recipe |
| 17 | Agent as a reading point | Agents told | Medium | Low-medium | Medium-high | Recipe |
| 18 | Slow-fast-slow move, cut at peak speed | Section changes, 2 or 3 per film | Medium | None | Medium-high | Kit (`WhipBlur`) |
| 19 | Two readers, one signal (split frame) | Agents told (Rovo and MCP) | Medium-low | Low | Medium | Recipe |
| 20 | Ripple to the dependants | Merge (pages that cite the file); agents told | Medium-low | Low | Medium | Recipe |
| 21 | Weight as emphasis (variable font) | Statements | Low-medium | Low | Medium-high | Unverified (font) |
| 22 | Step-frame texture (on twos) for the drifted thing | 3 a.m. (the stale step) | Low | Low | Low-medium | Not advised |

### 4.1 The techniques

**1. Direct the real recording (P1).** Show the real product at full bleed for 8 to 10 s, directed so it reads like a
crafted shot:
- **Detail:** a camera in capture pixels zooms to the detail that matters, never past 1 film px per capture px.
- **Spotlight:** the rest is veiled (Paper 60%), softened (3.5 px) and drained (70% grey), R2's modal scrim made local.
- **Cursor:** the kit's cursor appears only at the recorded click points and times.
- **Ramp:** a speed ramp runs over each wait, with the speed shown ("9× speed").
- **Clock:** a real-time clock measures what the ramp compresses.
- **Beats:** the ramp's keys place the real clicks and the real result on beats of the score.

Why: it is the viewer test's first request ("one continuous, full-size real recording of the core loop") and the rules'
"footage that shows the Project functioning". Where: merge then flag (one take: Merge, confirm, the server wait at 7 to
9x, Merged, the carried clock, the flagged page at 19 s). Also Rovo (ramp the 5 s of thinking at 4 to 5x with a label)
and Replace or Accept (1:1 on the button, the click on a beat).

Recipe:
- `src/v5/lab/common.tsx`:
  - `remap()`: monotone cubic time remap with Fritsch-Butland tangents; speed changes are smooth and never run
    backwards.
  - `VideoAt`: a one-frame `Sequence` with `OffthreadVideo trimBefore`. Not `Freeze`: it showed wrong frames on these
    captures (section 7).
  - `capPose()`: the kit's `cam3At` in capture pixels, clamped so no edge shows.
  - `CaptureWorld`: the 4K frame laid out at its own size, so zoom stays crisp.
  - `Spotlight`: an even-odd `clip-path` veil, a backdrop blur and a hairline ring.
- `src/v5/lab/DirectedRecording.tsx`: `Clock` (with a `LabelSwap` "Since the merge click" to "Merge to flag") and
  `SpeedChip`.
- Measure each recording's UI events first. The colour-of-region scan in section 7 gave dialog 2.72 s, confirm 5.18 s,
  "Merge in progress" 5.83 s, "Merged" 12.70 s.

Cost: about half a day per recorded beat (timing, keys, spotlight rects). A 10 s render takes 42 s.

Fit: high. Nothing is restyled, masks are drawn, the tags stay ("Recorded in Bitbucket: the real merge"), and every
compression is labelled.

Limit: real UI text is 14 CSS px, 28 capture px. At the crispness limit it is 28 px on screen, the floor of R2's
reading rule. For detail shots, recapture the three key flows at device scale factor 3 to 4 (or browser zoom 200% on
the region), so a 1:1 detail shows UI text at 40 to 56 px.

**2. Stations: long takes with the events inside.** Hold one composition for 6 to 12 s. Make one change every 1 to
1.5 s inside it (a cursor travel, a spotlight move, a mark, a number, a docked word, a badge swap), and move the camera
at most every 2 to 3 s.

Why: the references spend 84 to 85% of their time in shots of 4 s or more yet change something every second, mostly
inside the frame. Within-scene changes raise attention without load (Lang 2000).

Where: the four key moments.

Recipe: one `Stage` and one `Camera3D` (creep 1 to 1.5% per second, float 3 to 5 px). Events with `Lift`, `Breakout`,
`LabelSwap`, `PillSwap`, the marks, `NumberRoll`, and P1's `Spotlight`. No proof morph that dims the whole world more
than once per station.

Cost: lower than v4, which had fewer, larger moves.

Fit: high. It is the brand's "everything else stays still and aligned, so the slip is the only thing that reads as out
of place".

**3. Carry cuts (P4).** One object holds its place on screen through the seam while the world changes around it, so
the eye never resets. There are two variants:
- **Grow reveal.** The next world opens as a window growing out of the carried object.
- **Locked push.** Both worlds push while the carried object flies, on a short arc and lifted, into its slot in the next
  world. The slot shows a trace until it lands.

Why: related cuts cost less capacity (Lang 1993); edits that coincide with motion go unnoticed (Smith and Henderson
2008); Apple's blend points.

Where:
- The dead path `./scripts/rollback.sh` from the 3 a.m. error opens into the runbook's own step (problem to product,
  Night to Day).
- The badge's "Possibly stale" lands in the agent's answer (flag to agents told).
- The answer's state lands in the review panel header (agents to a person).
- The new path lands back in the 3 a.m. terminal (the end).

Recipe (`src/v5/lab/CarryCuts.tsx`):
1. Find the carried rect on screen in the outgoing world: `stageToScreen(cam3At(...))`, or `pageRects()` for twins.
2. Build the incoming camera so the same element lands on the same rect. Zoom is the ratio of the widths; position is
   solved from the centres.
3. Grow the incoming world in a rounded `inset()` window from that rect over 14 to 18 frames, expo in-out, while the
   outgoing world scales 1 to 1.05 and darkens.
4. Draw the carried object on top with the twin's own metrics (code is 14.5 on a 22 line, tracking -0.01 em).

Cost: about 2 hours per seam.

Fit: high. The carried object is often the one amber, so it is the drift itself moving through the story.

**4. The slip underneath (P2).** The runbook lies on a dark layer that holds what it describes: the Jira issue and the
code file. A wipe opens the page from its header to step 2. Inside it the page goes clear (6%) except the anchored
words, which stay on white plates, and a pin drops from each to the thing it names. Then the code row slips one unit,
amber, and renames to `rollback-v2.sh` ("renamed in PR #482"). Its pin leans off true while the page's word does not
move. The page closes; the Steps band takes the amber and hands it to the byline.

Why: the viewer test shows understanding came only at 0:40 to 0:46, and "docs that know when the code moved" stayed
vague. This shows both abstract ideas, linked and drifted, in one physical picture, in the brand's own terms (the slip
and the trace).

Where: the "what it is" moment and link page to code, possibly repeated briefly at the flag.

Recipe (`src/v5/lab/UnderThePage.tsx`):
- The dark layer at `translateZ(-220 to 0)` while the camera squares from yaw -13 and pitch 9 (read square before
  reading, M2).
- A `mask-image` band on the page wrapper, which is a leaf, so 3D survives.
- Token plates at `pageRects().tokens`, SVG pins, and the code row's slip (6 frames, trace, bloom).
- `slip.handoff` to the byline.

Cost: about a day to production quality.

Fit: very high. One amber at a time throughout (the code row, then the band, then the byline); real paths and the real
PR.

**5. Pace with a shape.**
- **Fast connective bursts:** 3 to 5 shots of 0.5 to 1.5 s, carried or whipped, at section changes only.
- **Slow key moments:** stations of 6 to 12 s.
- **Arc:** opening shots of 2 to 4 s, the shortest burst at the turn into the product, long takes in the core loop,
  one quick run into the fix, and the longest shots at the end.

Why: Cutting's prologue-climax-epilogue arc, Pot's bursty spread, and the viewer test ("crammed" second half, the
collage unreadable).

Recipe: section 6, checked with `scripts/analyze6.py` on each render.

Cost: free. Fit: high.

**6. Sound on contact.**
- A hit's transient sits on the contact frame or 1 frame after it.
- Every hard cut and carry cut lands on a strong accent (a bar or beat of the score, or a designed hit).
- A whoosh ends in a small transient at the landing (tick, latch), because a swell alone does not read as sync.
- Section changes are J-cuts: the next section's first sound (voice, the real UI click, the downbeat) starts 4 to 10
  frames before its picture.

Why: section 3.4, and Satchel's 3.3x cut sync.

Recipe: `<Sfx at>` already aligns `peakFrame`. Keep the lab's practice of placing events on the film's grid. The v4
grid was `frame % 15 === 7`. The v5 score (`music/score-v5.wav`, `firstBeatSec` 0.005 in `timeline.json`) puts beats
on `frame % 15 === 0` and bars on `frame % 60 === 0`; read the grid from that entry, never from memory. Measure with
`analyze6.py`'s `sync` tests.

Cost: low. Fit: high.

**7. Type becomes UI (P3).** The spoken state ("Possibly stale.") lands big in the type zone on its word, then flies,
shrinks and lands on the byline as the item's own new words. The twin's slip swap takes the old words out underneath it.

Why: Mayer and Johnson's few printed words next to the picture, and R4's "picture on the key word" gate. The word the
viewer hears becomes the product's UI a second later, so the badge is never a new thing to decode.

Where: the flag, and in reverse at Verified.

Recipe: `EditType.tsx`. Interpolate size, weight, tracking, the amber block's radius and the position to the
BylineItem's words (`BYLINE` metrics x `k` plus one slip unit). Open the byline swap 2 frames before the landing so
the two never overlap.

Cost: low. Fit: high. The block is the one amber, and the byline only lights when it lands.

**8. Strike and replace in place (P3).** A literal is marked (Mist), struck (an ink rule drawn left to right), then
replaced. The old words slip out one unit under a wipe; the line's width follows to the new words, which open behind a
wipe; the rest of the line reflows; a Current underline marks the change. The two phases never overlap.

Where:
- The problem: "renamed last week", with `scripts/rollback.sh` struck and `scripts/rollback-v2.sh` in.
- A person fixes: the quick fix's "Replace in 1 place". Its real result line rises under the step.

Recipe: `EditLine` and `MaskLine` in `EditType.tsx`, widths from `measureText`.

Cost: low. Fit: high (precision). Never use it on a claim being read (Schotter 2014).

**9. Honest time compression (P1).**
- A ramp over a wait shows a speed label ("9× speed", an ink chip).
- A clock counts real seconds since the action, so the compression is visible; it races during the ramp.
- The clock is carried across the seam to the next proof and lands on the measured value ("Merge to flag 19 s",
  "Measured on the demo site, Nov 13").

Where: merge to flag; Rovo thinking.

Cost: low.

Fit: very high. It replaces v4's hidden cuts on a beat with something truthful and more engaging.

**10. Before and after on one frame.** The same frame (the runbook's step 2 at 3 a.m.) split by a Current hairline that
travels on the beat: the left shows the old state, the right the new. The trace marks where the old held.

Where: the end, the callback to 3 a.m. (without Doc Drift, then with the warning). R4 notes the A4 callback confused
viewers ("didn't we just fix it?"); a labelled before and after avoids that.

Recipe: two layers, the top one clipped with `inset(0 X 0 0)`, X animated by beats (Kowalski).

Cost: low. Fit: high.

**11. Loop and payoff.** The end returns to the opening frame with the same camera move, the same carried object and a
changed outcome: the warning comes first, and the assistant gives the caveat. It ends on a quiet landing, not a burst
("Expecting an explosive resolution, we're instead dumped into an elegant product lockup", Don't Blink).

Recipe: reuse the opening's `Camera3D` keys, mirrored; a carry cut from the fixed path.

Cost: low. Fit: high.

**12. Spotlight on crafted twins.** The same `Spotlight` over twins: the agent's answer's first line, the affected step
in the review panel. It is lighter than a breakout and keeps the layout stable (technique 2).

Cost: low. Fit: high (no amber; Paper veil).

**13. Graphic match on the three bands.** The mark's three bands, the page's three sections (PageTwin bands) and the
review panel's three parts share proportions (94 / 12 / 60 / 12 / 94). Cut between them as one shape: the lockup to the
page in "what it is", and the page back to the lockup on the end card. It is the brand's own match cut.

Recipe: `bandEdges()` from the kit, plus `SlipPush` or a carry cut on the middle band.

Cost: low to medium. Fit: very high.

**14. Mask line reveal (P3).** Lines rise from behind their own baseline: no smear, no fade, 12 to 14 frames, expo
out. It is the functional type voice beside KineticLine's expressive word rise (Config 2025's two speeds).

Recipe: `MaskLine` (overflow hidden, `translateY(105%)` to 0).

Cost: very low. Fit: high.

**15. Cold open on sound.** The first sound arrives before the first picture: the terminal's error blip, or a phone
buzz at 3 a.m. under black for 6 to 10 frames, then the picture. It is the cheapest hook there is, and it follows
Figma's "orchestra warming up".

Cost: very low. Fit: medium-high. Keep it quiet, never an alarm (Antfood).

**16. Silence before the landing.** Once in the film, thin or drop the score for half a bar to a bar before the
biggest landing (the flag at 19 s, or the snap back to Verified), and bring the bass back on the downbeat with the hit
(Solberg 2014). It needs a ducking automation on the score (`AudioLayer`'s gain, or a pre-cut score).

Cost: low. Fit: high.

**17. Agent as a reading point.** The agent is a small Fathom point with a name chip ("Drift Reviewer · Rovo agent",
"Coding agent · MCP"). It reads down the page along its lines, stops at the byline with a pulse, and only then
answers. The old step stays unread (dimmed).

Why: it shows "agents check the page before they quote it" without a robot (Better Images of AI).

Recipe: `SignalLine` along line paths with `pointOnPath`, and `Press` at the stop.

Cost: low to medium. Fit: medium-high. Keep it one point, never a face or a glow.

**18. Slow-fast-slow move, cut at the peak.** It exists (`WhipBlur`, `ZoomThrough`). Ration it to 2 or 3 per film, on
section changes, and pair each with a landing transient.

**19. Two readers, one signal.** Rovo's answer and the coding agent's terminal side by side, the same status landing in
both on the same frame with one sound. It can replace the 9 s MCP hold (viewer: "dullest") with 2 to 3 s.

Fit: medium. One amber means one shared amber chip between the halves.

**20. Ripple to the dependants.** One ring leaves the changed file and flips exactly the pages that anchor it, each as
the ring passes (state = distance < radius). It also suits "every agent that reads it is told".

Fit: medium. One ring, no glow, a Current hairline.

**21. Weight as emphasis.** Animate the spoken word's weight (500 to 700) instead of moving it. Unverified for us: the
film loads Spline Sans through `src/brand/fonts.ts`; check that the variable axis is loaded before relying on
in-between weights.

**22. Step-frame texture.** Basement and Figma drop one element to 12 or 15 fps to mark it as different. On the stale
step it would read as a glitch, an AI-film trope. Not advised.

## 5. Story map for v5

Beats as in the brief to this research; lengths follow R4's skeleton (section 5.3 there, about 99 s), and the new
script may move them. "Real" means real footage in the beat.

While this was written, the director's v5 timeline appeared (`timeline.json`, 3150 frames = 105 s). Its markers:
PROBLEM 0, PROMISE 480, LOOP 900, merge 1174, flag 1369, AGENTS 1575, FIX 2100, snapBack 2462, JIRA 2550, CLOSE and
endHit 2880. The score's cue D2 (1275 to 1369) builds into the flag. Two consequences:
- Merge to flag gets 6.5 s of screen for 19 s of real time, exactly the case for P1's ramp with a labelled speed and an
  honest clock.
- The "silence before the landing" (technique 16) belongs to D2's last bar, landing on the score's own hit at 1369.

The pace column applies to those sections as they stand.

| Beat | About | Pace | Shots | Techniques | Real |
| --- | --- | --- | --- | --- | --- |
| The opening problem (3 a.m.) | 0:00 to 0:15 | Medium | 5 or 6, median 2.5 s | Cold open on sound (15); the error as the hook; the path carried (3) | None (generic mocks) |
| The turn and the "what it is" moment | 0:15 to 0:29 | **Burst, then a hold** | 3 or 4 under 1 s at the turn, then one 6 to 8 s hold | Carry cut Night to Day on the dead path (3); the slip underneath (4); graphic match to the lockup (13) | None |
| Link page to code | 0:29 to 0:37 | Station | 1 or 2 | The slip underneath, pins (4); mask line reveal (14); morph to one real proof (kit T3) | R2 suggestions |
| The merge and the flag | 0:37 to 0:51 | **Long take** | 1 take of 9 to 10 s, then 1 or 2 | Direct the real recording (1); honest clock (9); type becomes UI (7); silence before the landing (16) | The real merge and the real flagged page, full size |
| Agents told | 0:51 to 1:06 | Station, slower than v4 | 2 or 3 | Carry the badge words into the answer (3); Rovo directed, thinking ramped (1, 9); spotlight on the answer (12); MCP as two readers, one signal (19) or a reading point (17), 2 to 3 s | Rovo answer; real MCP output (short) |
| A person fixes | 1:06 to 1:18 | Quick run into a station | 3 or 4 | Carry the state into the panel (3); strike and replace (8); the real Replace or Accept click at 1:1 on a beat (1) | Replace / Accept |
| Verified | 1:18 to 1:21 | **Held resolution** | 1, 2 to 3 s | Snap back (kit T11) on the downbeat after the drop; "Verified." type to UI (7) | R17 Verified |
| The end | 1:28 to 1:39 | Longest shots | 2 or 3, 3 to 5 s | Loop and payoff (11); before and after (10); graphic match to the lockup (13); end card held 3.5 to 4 s | None |

R4's Jira beat (1:21 to 1:28) is a quick run of three shots of 2 s or more, joined by one carried object (`PAY-18`
Done, the ADR's band, the Jira task), never under 2 s per shot: viewers called v4's 8 s for three things the least
clear part.

## 6. Rhythm spec for v5

Measured with `video/out/v5/r6/scripts/analyze6.py` (point `FILMS` at the render) on every QA render. Targets are for a
film of 75 to 110 s.

### 6.1 Shot lengths
- **Median shot in the body: 3 to 4.5 s** (v4 1.5 s; Pot 2.7 s; Satchel 4.3 s; features 4.3 s).
- **At least 3 shots of 8 s or more**, one of them the real merge-to-flag take, and **70% or more of body time in shots
  of 4 s or more** (v4 47%; Pot 85%; Satchel 84%).
- **Shots under 1 s only in bursts at section changes:** 3 to 5 in a row at most, about 15% of shots (v4 23%, spread
  everywhere).
- **Let lengths drift.** Avoid three shots of the same length in a row outside a burst; a burst must be followed by a
  long shot (Cutting et al. 2010).

### 6.2 Pattern interrupts (the measure in section 1)
- **All interrupts: 40 to 50 a minute.** Something new about every 1.2 to 1.5 s, as in all three films.
- **Major interrupts (whole-frame changes): 15 to 20 a minute** (v4 30.4; references 17.6), so **60% or more of all
  interrupts happen inside a stable composition.**
- **Longest gap between any interrupts: 3 s,** except at most two chosen holds of up to 4 s (the "19 s" landing and
  "Safe to cite"). The longest gap between major interrupts may reach 10 to 14 s inside a station (Pot 13.7 s).
- **Body time inside gaps of over 4 s between major and medium interrupts: 15 to 25%** (v4 12%; references 24 to 29%).
  The film needs calm stretches.
- **Pace arc:** major interrupts per minute in each section should rise from the opening to the turn, fall in the core
  loop and agents beats, rise for the run into the fix, and fall at the end (Cutting 2016). The P1, P4 and P5 peaks of
  v4 (45 to 50) must not recur.

### 6.3 Transitions
- **Moving transitions 8 to 10 a minute** (v4 20.7), **hard cuts 3 to 5 a minute.**
- **Rationing.** Big transitions (whip, zoom-through, slip cut) appear 2 or 3 times each in the film, at section
  changes. Within a section use carry cuts or a plain cut on an action breakpoint.
- **A proof morph (kit T3) dims its twin's world:** at most one per station. Prefer a full-size directed recording to
  three thumbnails.

### 6.4 Holds that stay alive (the director's question)
A held shot (2 s or more with the composition still) keeps all of these:
1. The camera creeps 1 to 1.5% per second with a 3 to 5 px float (kit default; never both off).
2. **One process visible in it:** a clock running, an answer streaming, a cursor travelling to the next control, a
   spotlight drifting, a number rolling.
3. **A small event every 1 to 1.5 s**, of minor or medium size: a mark, a word landing, a swap, a click.
4. The score moves on: hold across a bar line, so the music changes under the still picture.
5. Never two holds in a row; a hold is followed by a carry cut or a burst.

### 6.5 Real recordings at full size (the director's question)
1. At least one continuous real take of 8 to 10 s at full bleed: the merge to the flag (P1).
2. Zoom to the detail, never past 1 film px per capture px. Recapture key flows at device scale factor 3 to 4 so
   detail text reaches 40 px or more.
3. The spotlight veils, softens and drains everything but the detail. It moves to the next detail with the camera
   (12 to 18 frames, expo out).
4. Ramp every wait at 4 to 10x, with a speed label and a clock in real seconds; 1x for 0.3 s around every click and
   every result.
5. Land the real clicks and the real results on beats, using the ramp's keys.
6. The kit's cursor only at recorded click points and times. It travels on a slight arc, presses on the click frame,
   and is hidden in waits.
7. Move the camera at most every 2 to 3 s inside a take. P1 measured 5 whole-frame changes in 10 s, the v4 rate; 3 is
   enough. Let the spotlight and the cursor do the in-between work.
8. Tag every take ("Recorded in Bitbucket: the real merge"); masks from `captures.json` always drawn.

### 6.6 Type
- One statement at a time, 2 to 5 words, echoing the voice (Mayer and Johnson 2008).
- It lands 0 to 4 frames before its word (V4 M6) and holds for 0.2 s per word plus 2 s from landing (Clearcast).
- Never replace the words of a claim while it is read.
- Two voices:
  - **functional:** mask line reveal, 12 to 14 frames, for labels, code and results;
  - **expressive:** KineticLine's word rise with smear, and type becomes UI, at most 4 times in the film.
- The type zone sits beside the object, never on a separate card.

### 6.7 Sound hit rules
1. **Contact.** A hit's transient peak on the contact frame or 1 frame after it, never more than 1 frame early. A
   whoosh peaks on the seam and ends in a landing transient (tick or latch) on the landing frame.
2. **Cuts on accents.** 60% or more of hard cuts and carry cuts carry a strong hit within 2 frames, a lift of 2 or more
   over chance (v4 1.3; Satchel 3.3). Use the score's bars and beats first, designed hits second.
3. **J-cut every section change.** The next section's first sound (voice, a real UI click, the downbeat) starts 4 to 10
   frames before the picture cut. L-cut the snap's ring tail into the shot after Verified.
4. **Budget.** 25 to 35 designed effects a minute (v4 placed about 48, many quiet ticks), in three families:
   - UI: `click`, `tick`, `tick-soft`, `pop`;
   - moves: `whoosh-short`, `swish-up`, `reverse-swell`;
   - state: `slip` for page state changes only, 6 or fewer in the film; `snap` once; `merge` once.

   No effect more than 3 times in a row without a variant (Potter et al. 2018).
5. **One silence.** One drop of half a bar to a bar before the biggest landing, then bass and hit together on the
   downbeat.
6. **Mix.** Voice 10 LU or more over the ducked music (Torcoli et al. 2019); effects 6 dB under the voice (V4 gates);
   master -14 LUFS, -1 dBTP (`render-master.sh`).

### 6.8 Gates (add to the v5 QA pass)

| Gate | v5 target | v4 | Pot | Satchel |
| --- | --- | --- | --- | --- |
| Body median shot | 3 to 4.5 s | 1.5 s | 2.7 s | 4.3 s |
| Shots of 8 s or more | 3 or more | 0 | 3 | 3 |
| Body time in shots of 4 s or more | 70% or more | 47% | 85% | 84% |
| Moving transitions per minute | 8 to 10 | 20.7 | 9.5 | 7.4 |
| Major interrupts per minute | 15 to 20 | 30.4 | 17.6 | 17.6 |
| All interrupts per minute | 40 to 50 | 50.3 | 46.8 | 49.6 |
| Longest gap between any interrupts | 3 s (2 holds up to 4 s) | 5.7 s | 4.3 s | 4.0 s |
| Body time in major/medium gaps over 4 s | 15 to 25% | 12% | 24% | 29% |
| Hard and carry cuts with a strong hit within 2 frames | 60% or more, lift 2 or more | 36%, 1.3 | 33%, 1.3 | 62%, 3.3 |
| Continuous real footage at full bleed | one take of 8 s or more | none (proofs of 1 to 2 s) | n/a | n/a |
| Frames with visible change | 75% or more (V4 gate; a directed take may sit at 70%) | 98.6% | 98.1% | 80.8% |

## 7. Prototypes (`video/src/v5/lab/`)

Its own entry, so it never touches `src/Root.tsx` or a scene. From `video/`, Node 24:

```
npx remotion render src/v5/lab/entry.tsx <Id> out/v5/r6/<file>.mp4 --port=3530 --concurrency=6 --codec=h264 --crf=18
npx remotion still  src/v5/lab/entry.tsx <Id> out/v5/r6/stills/x.png --frame=<n> --port=3530
```

Each composition starts the film's own score at a chosen film frame, so its beats are the film's beats. Each places its
effects on the contact frames. Rhythm measured with the same scripts is in `data/prototypes-rhythm.json`; a frame
from each is in `prototypes-sheet.jpg`.

| Id (folder Dev) | File | Clip | Length |
| --- | --- | --- | --- |
| `R6-DirectedRecording` | `DirectedRecording.tsx`, `common.tsx` | `p1-directed-recording.mp4` | 10.0 s |
| `R6-UnderThePage` | `UnderThePage.tsx` | `p2-under-the-page.mp4` | 8.0 s |
| `R6-EditType` | `EditType.tsx` | `p3-edit-type.mp4` | 7.0 s |
| `R6-CarryCuts` | `CarryCuts.tsx` | `p4-carry-cuts.mp4` | 6.5 s |
| `R6-DebugFreeze` | `DebugFreeze.tsx` | `stills/dbg-sheet.jpg`, `stills/dbg2-sheet.jpg` | Test of two video time-remap methods |

**P1, the directed recording, proves the real product can carry a long take.** It is one 10 s shot of the real merge
of PR #482 at full size, then the real flagged page:
- the header row spotlighted on the overview;
- the dialog at 0.86;
- the confirm button at 1:1 with the cursor on it;
- the 6.9 s server wait run at about 7x (peak 9x) with "9× speed" and a clock counting real seconds;
- "Merged" at 0.94;
- the clock carried through a whip onto the flagged page;
- the spotlight finding "Possibly stale · Doc Drift" as the clock lands on 19 s, with the label swapping to "Merge to
  flag" and "Measured on the demo site, Nov 13".

The ramp's keys put both real clicks and the real "Merged" on beats of the score (frames 45, 90, 135). It renders in
42 s and measures 8 interrupts in 10 s, so it is alive.

Two limits came out of it:
- Real 14 px UI text tops out at 28 px on screen at 1:1, hence the recapture advice in 6.5.
- 5 of the 8 interrupts are whole-frame (camera moves on full-bleed footage). That is v4's rate; use 3 camera moves
  per 10 s and let the spotlight work.

It also exposed a render trap. `Freeze` around `OffthreadVideo` (or the kit's `@remotion/media` `Video`) showed frames
from the first seconds instead of the frozen time on this 4K, 60 fps, 0.5 s-GOP capture. A one-frame `Sequence` that
starts on the current frame, with `trimBefore` set to the source frame, showed the right frame every time
(`stills/dbg2-sheet.jpg`). `VideoAt` in `common.tsx` uses that method.

**P2, under the page, proves the two abstract ideas fit one picture.** "A page linked to the code and Jira work it
describes" and "the code moved under the doc" read in one image in about 5 s, with no diagram and no jargon:
- the runbook lies over a dark layer;
- a wipe opens the page from its header to step 2;
- the anchored words stay on plates, and pins drop to `PAY-6` (Jira issue) and `scripts/rollback.sh` (in payments-api);
- "Linked to the code it describes." sits in the type zone.

On the bar, the code row slips amber to "scripts/rollback-v2.sh, renamed in PR #482" while the page's
`./scripts/rollback.sh` stays put, and "The code moved. The page didn't." lands. The page closes and the amber passes
from the Steps band to "Possibly stale · Doc Drift". There is one amber at every frame (`stills/up-140.png` is the key
frame).

The first cut held the slipped row for only 0.45 s; it now holds 1.1 s. Treat that as the minimum for the film's key
image.

**P3, type that edits itself, proves three type devices the kit lacked:**
- mask line reveal;
- type becomes UI: "Possibly stale." lands big, then flies and shrinks onto the byline as its new words, at the twin's
  own swap frames, so nothing doubles;
- strike and replace in place, with reflow: Mist, an ink strike, the old path slipping out under a wipe, the line's
  width following, the new path opening behind a wipe, a Current underline, then the real result line ("Replaced
  scripts/rollback.sh with scripts/rollback-v2.sh in 1 place.") and the snap back to Verified.

It measures 4 interrupts in 7 s, two of them whole-frame (the camera push and the pull back). The lesson from the first
cut: the old and new words must never share a frame. A two-phase swap (out, then in) reads cleanly; a cross-over
produced "eipts/rollbackscripts/rol".

**P4, carry cuts, proves two seams can change world without resetting the eye.**
- Night to Day: the 3 a.m. terminal's `zsh: no such file or directory: ./scripts/rollback.sh` pushes in on the path.
  The Day runbook grows out of those exact words; they are its own step 2 command, matched in place and size. Then the
  camera pulls back to the page and the drift happens there.
- The page to the agent: the badge's "Possibly stale" lifts off while the page pushes out and the agent's card pushes
  in. It lands in the answer's slot, which held a trace: "Payments rollback runbook is Possibly stale." Then the
  verbatim second sentence rises.

Both seams sit on the film's own bars; the lab bed starts at film 1017, so lab f40 is the film's Night-to-Day bar.

The lesson: the carried text must use the twin's own metrics (code at 14.5 on a 22 line, -0.01 em). With different
metrics it doubled during the handover. An opaque plate under it hides the last 1 to 2 px of drift in the frames
before the seam.

**What the prototypes do not settle.** Each is a single beat without voice. The mix is unmastered (-27 to -29 LUFS,
peaks under -4.5 dBFS). P1 depends on the merge recording's timing; Rovo and the review panel need their own timing
scans. Timing in a cut with narration will move.

## 8. Open questions and limits

1. **External launch films were not measured.** These were chosen (YouTube metadata 2026-11-17), but the downloads
   returned HTTP 403. Razvan could fetch them locally and run `scripts/measure6.py` and `analyze6.py` on each:
   - Notion "Introducing Notion 3.0: Agents" (90 s), https://www.youtube.com/watch?v=R1cF4T4lgI4
   - Cursor "Introducing Cursor 2.0" (64 s), https://www.youtube.com/watch?v=An8IM-kPyms
   - Cursor "Introducing Cursor 3" (90 s), https://www.youtube.com/watch?v=UxbULt_hCdA
   - The Browser Company "Dia Browser | Never Explain Yourself Again" (78 s), https://www.youtube.com/watch?v=YVOw0TAO9ok
   - Linear "Linear Asks" (119 s), https://www.youtube.com/watch?v=jZvZfBl3VOw
   - Raycast "It's out" (161 s), https://www.youtube.com/watch?v=uJ70iGerYzE
   - Figma "Introducing Figma Motion" (68 s), https://www.youtube.com/watch?v=l3HuAYXyOTo
   - Apple "Apple's next big step for Siri and iPhone" (96 s), https://www.youtube.com/watch?v=2PW5y3zAvPE
2. **Thresholds are mine.** The interrupt classes and onset z-scores are consistent across films but not validated
   against viewers. Use them to compare renders, not as absolute truths.
3. **Recapturing at a higher device scale factor** (for 1:1 detail with 40 px text) needs the demo site and an hour of
   capture work. It is not decided here.
4. **The v4 rule "proofs dim and blur their twin" (K-1)** drives many of v4's whole-frame changes. In v5 a full-size
   directed take replaces most thumbnails; where a proof remains, a spotlight on the twin's own element is cheaper.
5. **Variable-weight type (technique 21)** depends on how `src/brand/fonts.ts` loads Spline Sans; I did not check.
6. **Copy in the prototypes** is placeholder for timing ("Linked to the code it describes.", "The code moved. The page
   didn't."), drawn from the film's existing lines. The v5 script owns the words.
