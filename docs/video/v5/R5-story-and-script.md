# R5 · Story and script for the v5 launch film

Written 2026-11-17 for v5 of the launch film (Remotion, [`video/`](../../../video/)). Scope: the story, the narration,
and what the viewer sees with each line. The look, motion and transitions stay with the director and the kit.

This is the revised draft. It was revised the same day after two inputs landed: the four simulated first-time viewers of
v4 (`video/out/v5/viewer-test/v4/SUMMARY.md` and the four `answers-*.md`, all git-ignored) and the expert audit
[R4](R4-comprehension-audit.md). The product is called **Doc Drift** only (D40).

Inputs: [overview](../../product/overview.md), [features](../../product/features.md),
[BRIEF.md](../../../video/BRIEF.md) sections 2, 2b and 6, [V4.md](../../../video/V4.md),
[codegeist-rules.md](../../hackathon/codegeist-rules.md), [voice-and-copy.md](../../../brand/voice-and-copy.md),
`video/src/data/timeline.json`, `video/src/data/captures.json`, [R3](../v4/R3-crafted-product.md), and the web sources
at the end.

Evidence (git-ignored, local only) is in `video/out/v5/r5/`:
- `examples/`: a timestamped contact sheet and a timed caption transcript for each of the 6 films in section 2.5;
- `v4-per-line.jpg`: one v4 frame per narration line;
- `timing/`: the duration estimator (`timing.py`), the three scripts as data (`scripts.json`) and their timings
  (`scripts-timing.txt`).

## 0. In brief

- **The sentence the film must leave in a newcomer's head** (section 3):
  > For teams with docs in Confluence, Doc Drift flags a page when the code or Jira work behind it changes, so people
  > and AI agents stop trusting it until someone checks.
- **Recommendation: Script A, "One story, told forward", about 1:37** (v4 runs 2:35). It opens on the 3 a.m. story, the
  one part all four test viewers understood and remembered. It says what Doc Drift is and who it's for at 0:15 to 0:27,
  in the voice and on screen together. Then comes one continuous, full-size real block of the core loop (0:27 to 0:49):
  link, merge, flagged 19 s later, the exact change. Then the agents (Rovo and coding assistants over MCP), the fixes,
  Jira with a reason a Jira user gets, and an end card that says what it works with and where to get it.
- **Shape of A:** problem 0:00 (14 s) · what and for whom 0:15 (12 s) · the real loop 0:27 (22 s) · AI agents are told
  0:49 (16 s) · a person fixes it 1:06 (13 s) · Jira and the dashboard 1:19 (9 s) · what, where, tagline 1:29 (8 s).
- **Alternatives:** B, "Pitch first" (about 1:31), opens on the plain sentence and squeezes the story. C, "The 77-second
  cut", keeps every fact in fewer, longer lines.
- **Every v4 mismatch the viewers caught is designed out:**
  - The "exact change" is proved by the review panel's real sentence, which names the rename, not by the tooltip that
    names `values.yaml`.
  - No old command is on screen while the agent's answer plays.
  - "For anything bigger" becomes "Drift Reviewer drafts other edits".
  - The story never restarts from Unanchored, and the 3 a.m. callback after Verified is gone.
- **Close:** drop "Catch the slip before your agents do." from the film; 2 of 4 test viewers could not parse it. End on
  "Doc Drift: for Confluence, with Jira and Bitbucket. Get it here." with the URL, then "Docs that know when the code
  moved.", the line all four understood (section 9).

## 1. Why v4 lost a Jira-first viewer

Measured on v4 and confirmed by the viewer test and R4:

- **The "what" came late and in insider words.** The first line that says what the product does is V07 at 0:36: "anchors
  each Confluence page to the code and Jira work it describes." All four viewers understood only at 0:40 to 0:46, when
  the badge flipped. "Who it's for" was never spoken (R4). One viewer thought the generic AI assistant at 0:29 was the
  product.
- **The voice said little while the screen said a lot.** 273 words in 155 s, 1.76 words per second over the film, with
  46 s of silences of 1.5 s or more (R4). Inside a line, the narrator speaks at 2.97 spoken words per second (section 4),
  a normal pace. The film was slow and dense at the same time.
- **The story was told twice.** A2 showed the whole loop, then P1 restarted it on the same page from "Unanchored", with
  no signpost.
- **Three places where the picture contradicted the words:**
  - "with the exact change", over a tooltip naming `deploy/helm/values.yaml`;
  - "It doesn't repeat the old step", over the old command shown in amber;
  - "For anything bigger", over another small rename.
- **About 40 assumed terms** (R4). Rovo, MCP and Drift Reviewer were never explained, and the last two were on screen
  before they were named.
- **Jira, the friend's own tool, got 8 s at 2:11.** "Track in Jira" was never spoken, and nobody understood why closing
  an epic makes a page stale.
- **The 3 a.m. callback** showed the page stale again after it had been fixed ("didn't we just fix it?").
- **The ending.** "Catch the slip before your agents do." did not parse for 2 of 4, and there was no link.
- **What worked, and stays:**
  - the 3 a.m. story and its "no such file or directory";
  - "A date can't see a merge.", re-voiced in plainer words in v5;
  - "No AI made that call.";
  - the 19 s merge to flag;
  - "Nothing changes until a person accepts.";
  - the snap back to Verified.

## 2. Research findings

### 2.1 How short launch and explainer films are built

- **Length.** Wistia's 2026 data (13 million videos): videos under a minute average 52% engagement, and 1 to 5 minutes
  is the explainer range. Explainer guides put most explainers at 60 to 90 s, and B2B explainers at up to 2 minutes
  (truScribe).
- **Section budget.** A common split for a 60 to 90 s explainer: hook 0 to 5 s, problem 5 to 15 s, stakes 15 to 25 s,
  solution and how it works 25 to 55 s, proof 55 to 70 s, call to action 70 to 90 s. Narration runs 130 to 150 words a
  minute (fliki). These are vendor conventions, not research, but the six films in 2.5 roughly follow them.
- **Do the last thing first.** Peter Cohan's demo rule: show the end result first, because viewers "make a very rapid
  decision: does this look interesting?" For us the end result is the flag and the agent's warning, so both must arrive
  early and be big.

### 2.2 One idea per scene; show, then tell

- **One idea per scene.** "One idea per scene (resist the urge to cram)", at about 3 to 5 s a scene (VideoScribe). This
  is a practitioner rule, not a tested one, but it matches the viewer test: everything crammed into v4's last 30 s was
  lost.
- **Mayer's multimedia principles** (Dartmouth summary):
  - temporal contiguity: people learn better "when visual elements are on the screen at the same time as they are spoken
    about";
  - coherence: leave out extraneous material;
  - signalling: add cues that show what matters;
  - redundancy: graphics with a voice beat graphics with a voice plus on-screen text;
  - segmenting: present content in chunks;
  - pre-training: learning is better "when people know the main concepts and definitions ahead of time".
- **What this means for v5:**
  - Each line has one focal element, named by the voice as it appears (0 to 4 frames before the word, as in V4.md M6).
  - Nothing on screen is a sentence the voice does not say, except proof tags and the URL.
  - A short gloss at first use of a term does the pre-training.

### 2.3 Explaining a tool to people outside its ecosystem (the curse of knowledge)

- **Heath (HBR, 2006).** An expert's abstract summary feels concrete to the expert, because it compresses what the
  expert already knows. Listeners without that background hear only vague phrases. v4's "anchors each Confluence page
  to the code and Jira work it describes" is exactly such a summary.
- **LeFever (Common Craft).** Build context first: "If you start with the big picture, the forest, the trees become even
  more interesting." The curse "causes us to use language and examples that we assume are well-known, but sound foreign
  to our audience."
- **What works in practice:**
  - A concrete case before the definition (PostHog, Rovo).
  - Plain words for every product term.
  - A small budget of new names, each glossed in the voice at first use.
  - A bridge from what the viewer knows: Confluence as "Atlassian's wiki", for someone who knows Jira; an epic moving to
    Done.
  - Testing with outsiders: Heath's advice, and R4's newcomer gate.

### 2.4 How hackathon judges watch

- **Codegeist's rules.** The video should be under 5 minutes, and judges need not watch beyond 5. It "should include
  footage that shows the Project functioning". The Presentation criterion asks: "Does the video clearly demonstrate the
  project working end-to-end? Does the pitch communicate what problem is solved, who it's for, and why it matters? Is
  the overall presentation easy to follow?"
- **Volume and first impressions.**
  - Our simulated judge watched v4 as "one of 40 videos today".
  - A hackathon judging playbook has to tell judges: "watch the full demo video before scoring. Don't score based on the
    first 30 seconds" (Builderbase). The rule exists because judges do.
  - MLH asks for "2 minute videos on your submission platform for the judges to review" that are "a demo of their hack,
    not a presentation".
- **Polish versus clarity.**
  - "Production quality does not affect your judging score" (AI Tinkerers' video guide, which also budgets 30 s for
    "what your project does").
  - The 2024 Codegeist winners: "Judges and users should be able to quickly understand what your app does and why it
    matters."
  - Devpost: "Start the video with your elevator pitch."
- **What the simulated judge asked for.** "One continuous, full-size real recording of the core loop", because the
  1 s thumbnails were "enough to believe the app works, not enough to watch it work". The judge trusted the dated
  numbers (19 s, Nov 13) and "0 false flags, 2 known misses", and wanted the agent to say what changed.

### 2.5 Six films, measured

Method: the YouTube caption track (timed text) and the storyboard frames (about 1 per second), fetched with yt-dlp and
read on 2026-11-17. PostHog's film was read from the video at 1 frame per 2 s. Words per second count every spoken word
over the film's length. "Real UI" is the share of the runtime that shows the product's real interface. We take only
structure and technique from these films: no words, no look.

**1. Mintlify, "Mintlify Autopilot: Self-updating documentation"** (0:58, 2025-12-09, founder-led). Our nearest
neighbour in message. 2.9 words/s; real UI about 45%.

| Time | What happens |
| --- | --- |
| 0:00–0:06 | The founder names himself and the product; title card at 0:04: "the next step towards fully self-updating documentation" |
| 0:06–0:15 | The problem in one sentence, with three victims: outdated docs give "outdated answers to your users, your team, and AI". Said to camera, not shown |
| 0:15–0:21 | "So here's how Autopilot works. Imagine I'm a developer who just shipped a new feature." |
| 0:21–0:47 | Real product, one flow: code changes, suggested doc updates, the agent drafts, the diff, final edits, published ("Now my docs are up to date.") |
| 0:48–0:58 | Why they built it; logo |

Clear because the promise is in the first sentence, there is one first-person scenario, captions are burned in, and the
last line answers the first. Take: one scenario, and the product shown in one stretch. Weak: the problem is told by a
face, not shown. The message (AI updates your docs) is close to ours, so our film must show the differences: Doc Drift
flags the page, tells agents, and a person decides.

**2. PostHog, "Introducing Scouts in PostHog"** (1:00, 2026-11-02). 4.0 words/s; real UI about 85%.

| Time | What happens |
| --- | --- |
| 0:00–0:05 | Starts mid-action: a Scout's report about PostHog's own session replay player |
| 0:05–0:15 | The bug, shown: "Viewed in Safari" next to "Viewed in Chrome". A hand-drawn circle lands on the menu as the voice says "un-hamburger menu" |
| 0:15–0:22 | What the agent did: evidence, culprit, next steps, each circled as it is named |
| 0:22–0:33 | The definition comes only after the example: "scouts are AI agents that patrol your data on a schedule" |
| 0:33–0:53 | "You decide what to do" in big type as it is said; memory; the list of scouts as they are named; set-up (what to watch, how often, where to report) |
| 0:53–1:00 | "A few hours later": a new report, "good catch, scout", logo |

Clear because a concrete case comes before any definition, and every noun is circled on screen as it is said. Take: the
circle on the word (our Mist band at the word) and plain time cards ("A few hours later"; ours: "Rewind a week",
"19 seconds later"). Not for us: 4 words a second works for a brand people already know.

**3. Atlassian, "Rovo: AI That Knows Your Company's Business"** (1:05, 2025-11-19, 1.6 million views). The sponsor's own
voice. 2.2 words/s; real UI about 11% (0:03 to 0:10).

| Time | What happens |
| --- | --- |
| 0:00–0:03 | A time, a person, a problem: "It's 7:00 a.m. and Beth's stuck on the Q2 growth strategy." |
| 0:03–0:10 | The product is named in the second sentence and shown in real UI: "Ask Rovo", the prompt typed |
| 0:10–0:51 | One metaphor, acted out: the best minds of the company, past and present, crowd in |
| 0:51–0:57 | The promise: "all that organizational memory ... at your fingertips"; "AI that knows your business." |
| 0:57–1:05 | End card with a URL |

Clear because there is one moment, one metaphor, one promise, and a URL at the end. Take: the time-person-problem
opening (it is our "It's 3 a.m."), the plain gloss "Rovo, Atlassian's AI", and the URL end card. Atlassian sells Rovo as
company memory; our film adds that memory is only useful while it is current.

**4. Resend, "new.email Public Launch"** (1:22, 2025-03-24). 2.3 words/s; real UI about 22%.

| Time | What happens |
| --- | --- |
| 0:00–0:03 | "Today, we're excited to announce that new.email is available for everyone." |
| 0:03–0:14 | Asks the viewer's question out loud and answers it in one sentence over the real UI (prompt, code, email): "So, what is new.email? It's a way to build beautiful, responsive, and cross-platform emails using natural language." |
| 0:14–0:24 | A before and after: "Building emails used to take days and now it takes minutes." |
| 0:24–1:14 | The founder talks over abstract cards and tool logos; a short UI replay at 0:56 |
| 1:14–1:22 | "And that's why new.email exists." |

Clear for 14 s; after that, the picture stops showing what the words say. Take: the spoken question and answer as a way
to define the product. Avoid: talk over illustrations.

**5. Recheck, "Recheck: stale page reviews for Confluence (Codegeist 2026)"** (1:30, 2026-11-08). A rival entry this
year. 2.4 words/s; real screens about 64%, all stills.

| Time | What happens |
| --- | --- |
| 0:00–0:13 | Title card. Name, category, problem and three features: "This is Recheck, a Forge app for Confluence. Wikis fill up with pages that were right once. Recheck makes their age visible, makes confirming them quick, and shows each space what is overdue." |
| 0:14–0:33 | Feature 1 on one still screenshot, held 19 s |
| 0:35–0:53 | Feature 2, the review dialog, still |
| 0:55–1:12 | Feature 3, the space table, still |
| 1:13–1:30 | Settings, "runs on Forge", "Install it from the link in the description." |

Clear because the name, category and problem come in 5 s, the features are said and then shown in the same order, and
it ends on a call to action. Weak: no story, stills held for 17 to 19 s, and UI too small to read. The same judges may
watch both films; our "a date can't see a code change" separates us in one line, and our real UI moves.

**6. Secure Notes for Jira** (2:07, 2025-12-17; 1st place, Apps for Software Teams, Codegeist 2025). 2.3 words/s; real
Jira about 45%.

| Time | What happens |
| --- | --- |
| 0:00–0:11 | The definition first, over the logo |
| 0:11–0:25 | A persona and the problem: "Meet Alex, a DevOps who needs to share temporary credentials ... Today, he faces a familiar challenge" (illustration) |
| 0:25–1:22 | One continuous, narrated walkthrough in real Jira: create the note, share the key, the developer opens it once, it self-destructs, the audit trail |
| 1:24–1:45 | Three protections, each appearing as it is said |
| 1:47–2:07 | Summary and tagline |

Clear because it gives the definition first, follows one persona, and shows one continuous real walkthrough in a product
the judges know, at a plain pace. Take: the continuous real walkthrough (the simulated judge asked for exactly this) and
one claim per line in lists.

**Patterns across the six, with v4 for comparison:**

| | Mintlify | PostHog | Rovo | Resend | Recheck | Secure Notes | v4 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Length | 0:58 | 1:00 | 1:05 | 1:22 | 1:30 | 2:07 | 2:35 |
| Words per second | 2.9 | 4.0 | 2.2 | 2.3 | 2.4 | 2.3 | 1.76 |
| Product named | 0:02 | 0:01 (defined 0:22) | 0:03 | 0:02 | 0:00 | 0:00 | 0:08 (what it does: 0:36) |
| Problem clear by | 0:15 | 0:15, shown | 0:03 | weak | 0:05 | 0:25 | 0:33 |
| Real UI | 45% | 85% | 11% | 22% | 64% (stills) | 45% | short inserts of 1 to 2 s |
| One scenario | yes | yes | yes | no | no | yes | yes, told twice |
| URL or call to action | no | no | yes | no | yes | no | no |

The three clearest films (PostHog, Mintlify, Secure Notes) all state the problem within 15 to 25 s. They show real UI
for 45 to 85% of their length, in one continuous stretch, while the voice says what is on screen.

### 2.6 Rules for v5

1. Say what Doc Drift does and who it's for, in the voice and on screen together, by 0:30 (R4's gate).
2. Open on the concrete case (the 3 a.m. runbook); define the product right after it, in plain words.
3. Tell the story once and forward. Say every time jump out loud ("Rewind a week").
4. One idea per line and one focal element; the thing named is on screen at its word.
5. At most five product names in the voice, each glossed at first use:
   - Confluence: "Atlassian's wiki";
   - Rovo: "Atlassian's AI";
   - Drift Reviewer: "our agent";
   - MCP: "an open standard for AI tools";
   - Possibly stale: "it may be out of date".

   Use plain words for the rest: "links" (not anchors), "the rollback script" (not `rollback.sh`), "the rename is
   merged" and, once, "pull request 482" (not "PR"), "design page" (not ADR), "each team" (not space).
6. Prove the core loop with one continuous, full-size real block (link, merge, flag, the exact change), then short real
   crops. Crafted visuals only for the story, one diagram, and the end card.
7. Nothing on screen contradicts the words at that moment. Nothing must be read that the voice does not say, except
   proof tags and the URL.
8. About 2.5 words a second over the film. Gaps of 0.3 to 0.5 s; longer holds only where real footage needs them.
9. Give Jira room and a reason a Jira user gets: a design page still says the work is planned, and its epic just closed.
10. End on what it is, what it works with, where to get it, and one line that has been tested.

## 3. The one sentence

> For teams with docs in Confluence, Doc Drift flags a page when the code or Jira work behind it changes, so people and
> AI agents stop trusting it until someone checks.

It covers what Doc Drift does (flags a page when the code or Jira work behind it changes), who it's for (teams with docs
in Confluence) and why (so nobody, person or AI, relies on a page that may be out of date until someone has checked it).
Script A voices it at 0:15 to 0:27 (A06, A07) over a diagram that shows each part as it is said, and the rest of the
film proves each clause with real footage.

**Tested against a Jira-only viewer.** The test uses "Maya", the Jira-first engineering manager among the simulated
viewers, the closest to Razvan's friend: Jira all day, docs in Google Docs, code on GitHub, Confluence "heard of, never
used", never heard of Rovo or MCP.

| Part of the sentence | What Maya said after v4 | Holds? |
| --- | --- | --- |
| "For teams with docs in Confluence" | "I've heard of Confluence but never used it." | Only with the gloss "Atlassian's wiki", voiced in A06 |
| "Doc Drift flags a page" | "the doc gets an amber 'Possibly stale' warning" | Yes |
| "when the code ... behind it changes" | "Someone renames a script in a PR and nobody updates the doc." | Yes. She knows pull requests from GitHub. The film says "Bitbucket" plainly, so she can tell whether it fits her team |
| "or Jira work" | "Closing an epic flags the design doc ... That's what would sell it to me", but also "I didn't get why closing an epic makes a doc stale" | Only with the reason on screen: the page still says "planned" (A18) |
| "so people and AI agents stop trusting it" | "AI assistants that read the doc get the same warning", then "Is it ChatGPT? Atlassian's? Only Drift Reviewer?" | Yes, if the film names the two kinds it covers (Rovo, coding assistants over MCP) and claims no others |
| "until someone checks" | "would it update the doc automatically, or alert someone?" | Yes. It answers her first doubt, so it is voiced early (A07) |

Verdict: Maya's own one-line retelling of v4 is this sentence, almost word for word, but she reached it at 0:46 and only
after the story was told twice. A says it once, by 0:27. The other viewers' first questions are also answered by the
film:
- The GitHub developer's "does it work with GitHub?": the voice says "in Bitbucket" (A09) and the end card says
  "with Jira and Bitbucket" (A20).
- The platform lead's "how much setup?": "Doc Drift links the page to the script and Jira issue it names" (A08).

## 4. Pace and method

- **The narrator.** Eric on ElevenLabs `eleven_v4` (BRIEF decision 3). Across v4's 26 lines he speaks 280 spoken words
  in 94.4 s of speech: 2.97 spoken words per second inside a line, or 2.89 counting written words. Spoken words count
  "3 a.m." as three words and "M C P" as three, and say numbers aloud.
- **The estimator.** Fitted on those 26 lines (`timing/timing.py`):
  > speech ≈ 0.315 s × spoken words + 0.58 s per sentence break + 0.21 s per comma − 0.23 s

  The mean error is 0.32 s per line, so a 20-line film is good to about ±3 s.
- **Around each line.** Gaps of 0.3 to 0.5 s. Short holds (0.2 to 0.4 s) where a real click or a number roll needs to
  land. A 1 s hold on the last frame.
- **Lines that can reuse v4 audio.** Script A has two: A01 is V02 word for word ("It's 3 a.m. Payments is down.") and A03
  is V04 ("That script was renamed last week."). Every other line needs a new take. V15's "No AI made that call." could
  be cut out of its line, but A11 sounds better recorded in one take.

## 5. Script A (recommended): one story, told forward (about 1:37)

242 words, 2.5 words per second over the film. Real product or real tool output fill about 59% of the runtime.

| Section | Lines | Time | Length | The one idea |
| --- | --- | --- | --- | --- |
| 1. The problem, at 3 a.m. | A01–A05 | 0:00–0:14 | 14 s | A runbook can look fine and still be out of date, and an AI repeats it |
| 2. What it is and who it's for | A06–A07 | 0:15–0:27 | 12 s | The sentence (section 3) |
| 3. The real loop (one continuous real block) | A08–A11 | 0:27–0:49 | 22 s | Link, merge, flagged in 19 s, the exact change, no AI |
| 4. AI agents are told | A12–A14 | 0:49–1:05 | 16 s | Drift Reviewer in Rovo, coding assistants over MCP |
| 5. A person fixes it | A15–A17 | 1:06–1:19 | 13 s | One click with no AI, or an AI draft a person accepts; Verified |
| 6. Jira and the dashboard | A18–A19 | 1:19–1:28 | 9 s | A closed epic flags its design page; each team's list |
| 7. What, where, tagline | A20–A21 | 1:29–1:37 | 8 s | Works with, link, line |

In the script below, "Real" marks real footage (stills or recordings) from `captures.json`, "Real output" marks text
from `captures.json` → `toolOutput`, and "Ours" marks crafted visuals and type. "The one amber" follows V4.md L4. The
"Mist band" is the kit's highlight for words that are not the drift.

| # | Starts | Est. | Narration | What you see (exactly what the words say) |
| --- | --- | --- | --- | --- |
| A01 | 0:00.0 | 2.8 s | It's 3 a.m. Payments is down. | Night. "03:07" rolls in, huge, in mono; our generic alert card lifts under it: "SEV-2 · payments-api · Error rate 14% · Triggered 03:07". Ours (v4 A1). Reuses V02 audio |
| A02 | 0:03.3 | 2.6 s | The runbook says: run the rollback script. | The runbook as a page, with a small label "A page in Confluence": title "Payments rollback runbook" and its numbered Steps. On "rollback script", the Mist band marks step 2's command `./scripts/rollback.sh`. Ours, with the real page text (`runbookText`); or the real page cropped to Steps, byline out of frame (`p1-unanchored`) |
| A03 | 0:06.2 | 1.7 s | That script was renamed last week. | The command runs in a terminal and fails: `no such file or directory: ./scripts/rollback.sh`. On "renamed" the change card slips in: `scripts/rollback.sh → scripts/rollback-v2.sh · 6 days ago` (the one amber). Ours. Reuses V04 audio |
| A04 | 0:08.3 | 2.6 s | The page's review date can't see a code change. | Back on the page: on "review date", the Mist band on its "Reviewed 34 days ago ✓". On "can't see a code change", the change card hangs beside the page, outside it, and the words set as a statement: "A review date can't see a code change." Ours |
| A05 | 0:11.4 | 2.9 s | And an AI assistant reads you the same old step. | A generic chat panel labelled "AI assistant", with no product name: "How do I roll back payments-api?" The answer streams step 2's old command with a source chip, "Payments rollback runbook". On "old step", the command is underlined. Ours |
| A06 | 0:14.8 | 4.0 s | Doc Drift catches this, for teams with docs in Confluence, Atlassian's wiki. | The Day slip cut: Night splits into three bands, the middle one slides, and Day is behind it. The mark lands and its middle band slips amber; lockup "Doc Drift". On "for teams with docs in Confluence", one line sets under it; on "Atlassian's wiki", a small gloss after "Confluence". Ours |
| A07 | 0:19.2 | 7.3 s | When the code or Jira work behind a page changes, it flags the page, for people and AI agents, until someone checks. | Our diagram on Paper. A page card, "Payments rollback runbook". On "code", a line draws to a chip, "rollback script"; on "Jira work", a line to a plain card, "Jira issue PAY-6". On "changes", the script chip slips (amber). On "flags the page", the page's label turns "Possibly stale" (the amber passes to it). On "people", a person chip lights; on "AI agents", two chips, "Rovo agent" and "Coding assistant", light up showing "Possibly stale". On "until someone checks", an empty check mark waits by the label. Ours |
| A08 | 0:27.0 | 7.2 s | Rewind a week. Doc Drift links the page to the script and Jira issue it names. Save: Verified. | On "Rewind a week", the diagram slides away and a chip "Last week" sets. **The real block starts here**, labelled once: "Real product · demo site · Nov 13". The real dialog (`p1-anchor-rec` from 9.3 s, after the click, so "Unanchored" never shows): "Suggested from this page (2)", with `scripts/rollback.sh` in payments-api and PAY-6, both ticked. The Mist band hits each as "script" and "Jira issue" are said. On "Save", the click on "Save and mark verified" (14.7 s); on "Verified", the real byline "Verified · Doc Drift" (`p1-verified`). Real |
| A09 | 0:34.5 | 4.2 s | Then the rename is merged in Bitbucket: pull request 482. | Real Bitbucket, full frame: pull request #482, "Rename rollback script and timeout variable". The Merge click, the dialog's Merge, then "Merged" (`p2-merge-rec` 2.0–5.4 s, jump cut to about 13 s). Punch in on "#482" at "pull request 482". Real |
| A10 | 0:39.1 | 5.2 s | 19 seconds later, the page says Possibly stale: it may be out of date. | The real byline "Verified · Doc Drift" (`p1-verified` crop). "19 s" rolls over it, with the tag "Merge to flag, measured on the demo site, Nov 13". Then the real "Possibly stale · Doc Drift" (`p2-flagged` crop) lands on "Possibly stale", and "it may be out of date" sets under the label as it is said. No tooltip (it names the other file in the PR). Real |
| A11 | 0:44.6 | 3.9 s | It names the exact change. No AI made that call. | A real click on the label opens the review panel (`p4-review-rec` 25.5–28.5 s). Punch in on its first line: "PR #482 renamed scripts/rollback.sh to scripts/rollback-v2.sh, an anchor of this page.", with the Mist band on the rename at "exact change" and "6 minutes ago" cropped out. On "No AI made that call.", the panel dims and the statement sets beside it. **The real block ends here** (about 22 s). Real, then ours |
| A12 | 0:49.0 | 5.1 s | In Rovo, Atlassian's AI, ask our agent, Drift Reviewer, how to roll back. | The real Rovo panel beside the page (`p3-rovo-v2-rec`, jump cuts). On "Rovo", the panel opens (2.3 s) and a chip sets: "Rovo · Atlassian's AI". On "Drift Reviewer", the agent list lands on Drift Reviewer (10.7 s). On "how to roll back", the typed question "How do I roll back payments-api?" (18.0–18.9 s). Real |
| A13 | 0:54.4 | 5.2 s | Instead of the old step, it warns the page may be out of date, and why. | The real answer (`p3-rovo-v2-answer`), cropped to its first two sentences at reading size: "Payments rollback runbook is Possibly stale." (Mist band at "may be out of date"), then "What it describes changed in PR #482 on 2026-11-13, after it was last verified." (Mist band at "and why"). No command anywhere in the frame. Real |
| A14 | 1:00.2 | 5.0 s | Coding assistants get the same check over MCP, an open standard for AI tools. | A dark terminal slab titled "Coding assistant", with no product mark. It shows the question "Is the payments rollback runbook safe to follow?" and the call `doc-drift · check-page-freshness`. Below, three lines of real output (`checkFlaggedV2`): `"status": "possibly_stale"` (the one amber) on "the same check", `"statusLabel": "Possibly stale"`, and the guidance "Do not present steps from this page as current." On "MCP", a chip sets: "MCP · an open standard for AI tools". Tag: "Real output: doc-drift MCP, Nov 13". Ours, with real output |
| A15 | 1:05.7 | 5.3 s | People fix the page, never agents: the rename is one click, no AI. | On "never agents", the Rovo and coding chips sit beside the page with a "read only" tag (1 s). On "the rename", the real review panel (`p4-review-rec` 33.7–42.1 s) shows the Quick fix card: "Replace scripts/rollback.sh with scripts/rollback-v2.sh in 1 place. Suggested from PR #482. No AI used." On "one click", the click on "Replace in 1 place" (38.3 s); on "no AI", the Mist band on "No AI used.". Real |
| A16 | 1:11.3 | 4.2 s | Drift Reviewer drafts other edits. Nothing changes until a person accepts. | The real draft in the panel (`p4-draft-diff`): the step's sentence as a red and a green line, `ROLLBACK_TIMEOUT` → `ROLLBACK_TIMEOUT_SECS`, with "Drafted by Drift Reviewer from PR #482. Nothing changes until you accept." On "accepts", the click on "Accept fix" (`p4-accept-rec` 12.37 s). Rovo's confirmation step is not shown. Real |
| A17 | 1:15.9 | 2.8 s | Verified again, so the AI can quote it. | The real byline "Verified · Doc Drift" (`p4-verified`), with the snap back (the amber leaves). On "the AI can quote it", the real output: "Payments rollback runbook" is Verified. Safe to cite. (`checkVerified`). Real |
| A18 | 1:19.2 | 6.0 s | Jira counts too: close an epic, and the design page that says it's planned is flagged. | Real Jira (`p5-jira-before` crop): epic PAY-18, "Multi-region active-passive database", To Do. On "close an epic", the status goes to Done (`p5-jira-rec` 2.3–4.1 s). On "the design page that says it's planned", the real page ADR-015 cropped to "Status: Accepted, implementation planned for Q1 2027" (Mist band on "planned"; byline out of frame). On "is flagged", its byline "Possibly stale · Doc Drift" and tooltip "PAY-18 moved to Done on Nov 13. Review." (`p5-adr-tooltip`). Real |
| A19 | 1:25.5 | 2.6 s | Each team sees its flagged pages on one dashboard. | The real Drift dashboard (`p5-dashboard`, `p5-dashboard-2`): the tiles "Pages anchored 18 of 24" and "Possibly stale 6", and the first rows of the list of flagged pages. Tag: "Sample data from the demo space". Real |
| A20 | 1:28.6 | 4.6 s | Doc Drift: for Confluence, with Jira and Bitbucket. Get it here. | End card on Paper: the lockup. On "for Confluence, with Jira and Bitbucket", the line "For Confluence · with Jira and Bitbucket". On "Get it here", the URL `razvanstatescu.github.io/doc-drift` at reading size. Ours |
| A21 | 1:33.7 | 3.0 s | Docs that know when the code moved. | The tagline sets under the lockup; the mark's slip is the one amber. Optional small line: "Built for Codegeist 2026". The camera creeps to the last frame, with no fade. Ours |

**Where the judge's continuous real recording goes: A08 to A11, 0:27 to 0:49.** Real screens only, about 22 s:
- full frame first (the real Confluence and Bitbucket pages in our frame, never the browser's own chrome);
- then punch-ins of at most 1 film px per capture px, onto the line the voice names;
- one label for the whole block, with hard cuts only where the tool changes.

It is assembled from the real takes of Nov 13: `p1-anchor-rec`, `p1-verified`, `p2-merge-rec`, then `p2-flagged` with the
measured 19 s, then `p4-review-rec`.

A single live take of the flip is not possible: PR #482 is already merged, and a new merge would carry a new number
(section 10.3). The 19 s counter bridges the cut honestly.

**What each beat proves, for the judges:**
- Technological Implementation: A08 to A11 (real anchors, a real Bitbucket merge, the page flagged by the app 19 s later,
  the matcher's reason), A12 to A14 (`rovo:agent` and the MCP server) and A18 (the Jira trigger).
- Design: A15 to A17 (a complete loop that returns to Verified) and A19.
- Potential Impact: A01 to A07.
- Bonuses: Best Agents (A12, A13, A16) and Best app with MCP (A14).

## 6. Script B: pitch first (about 1:31)

229 words. The same proof as A, but the plain sentence comes first, as an elevator pitch (Devpost's advice, and Secure
Notes' structure), and the story is squeezed into 12 s. Choose B if the director wants the product's purpose in the
first 5 seconds. It costs the story's grip and the set-up shot.

| # | Starts | Est. | Narration | What you see |
| --- | --- | --- | --- | --- |
| B01 | 0:00.0 | 4.7 s | Doc Drift is an app for teams who keep their docs in Confluence, Atlassian's wiki. | On Paper: the mark lands, its middle band slips amber, lockup "Doc Drift". On "teams who keep their docs in Confluence", the line "For teams with docs in Confluence"; on "Atlassian's wiki", the gloss. Ours |
| B02 | 0:05.0 | 8.0 s | When the code or Jira work behind a page changes, it flags the page, for your team and for AI agents, until someone checks. | As A07 |
| B03 | 0:13.5 | 5.5 s | Here's why. It's 3 a.m., and the runbook says: run the rollback script. | Night. On "3 a.m.", "03:07" and the alert card. On "the runbook says", the runbook page (labelled "A page in Confluence"), with the Mist band on step 2's command at "rollback script". As A01 and A02 |
| B04 | 0:19.4 | 5.6 s | That script was renamed last week. The page can't tell, and neither can your AI assistant. | The terminal's "no such file or directory" and the change card (amber) on the first sentence. On "The page can't tell", its "Reviewed 34 days ago ✓"; on "neither can your AI assistant", the generic assistant reading the old step. As A03 to A05 |
| B05 | 0:25.5 | 4.6 s | Now the same rename, with Doc Drift. It's merged in Bitbucket. | The slip into Day; the label "Real product · demo site · Nov 13". On "merged in Bitbucket", the real merge of PR #482. As A09. **Real block: B05 to B07, 0:25 to 0:41** |
| B06 | 0:30.4 | 9.1 s | 19 seconds later, the page says Possibly stale: it may be out of date. Open it, and it names the exact change. | As A10, then A11's click and the panel's first line |
| B07 | 0:39.9 | 1.5 s | No AI made that call. | As A11's statement |
| B08 | 0:42.0 | 10.9 s | Ask Drift Reviewer, our agent in Rovo, Atlassian's AI, how to roll back. It says the page may be out of date, and why, instead of the old step. | As A12 (on "Rovo, Atlassian's AI", the gloss chip), then A13 |
| B09 | 0:53.5 | 5.0 s | Coding assistants get the same check over MCP, an open standard for AI tools. | As A14 |
| B10 | 0:59.0 | 9.9 s | Agents never edit the page. People do: the rename is one click with no AI, and Drift Reviewer drafts other edits for a person to accept. | On "Agents never edit the page", the read-only chips. On "the rename is one click with no AI", A15's quick fix. On "Drift Reviewer drafts other edits", A16's draft; on "accept", the Accept fix click |
| B11 | 1:09.4 | 2.8 s | Verified again, so the AI can quote it. | As A17 |
| B12 | 1:12.7 | 7.3 s | Jira changes count too: when an epic moves to Done, the design page that still calls it planned is flagged. | On "Jira", PAY-18 To Do. On "moves to Done", the status flips. On "still calls it planned", the ADR-015 crop "implementation planned". On "is flagged", its byline and tooltip. As A18, reordered to the words |
| B13 | 1:20.4 | 2.9 s | And each team sees its flagged pages on one dashboard. | As A19 |
| B14 | 1:23.8 | 7.2 s | Doc Drift: docs that know when the code moved. Get it at the link on screen. | End card: the lockup, the tagline set on its words, the URL on "the link on screen". Ours |

## 7. Script C: the 77-second cut

180 words, every listed fact kept. The price is longer lines. Six lines carry two ideas each; each such line is cut as
two shots, one per clause. C drops the set-up shot and voices no reason for the Jira beat (it shows one). Use it as a
social cut, or if the main film must be under 80 s.

| # | Starts | Est. | Narration | What you see |
| --- | --- | --- | --- | --- |
| C01 | 0:00.0 | 5.9 s | It's 3 a.m. Payments is down, and the runbook says: run the rollback script. | "03:07" and the alert card on the first clause; the runbook page with step 2 marked on the second. As A01 and A02 |
| C02 | 0:06.3 | 5.6 s | That script was renamed last week. The page can't tell, and neither can your AI assistant. | As B04 |
| C03 | 0:12.6 | 9.8 s | Doc Drift can. For teams with docs in Confluence, Atlassian's wiki, it flags a page when the code or Jira work behind it changes, and tells AI agents. | On "Doc Drift can", the Day slip cut and the lockup (as A06). Then the who line with its gloss. Then the diagram, faster: links, the change, the flag, the agent chips (as A07) |
| C04 | 0:23.4 | 4.4 s | Rewind a week. The rename is merged in Bitbucket. | The "Last week" chip, then the real merge (as A09). **Real block: C04 to C05, 0:23 to 0:37** |
| C05 | 0:28.0 | 8.8 s | 19 seconds later: Possibly stale, it may be out of date, with the exact change. No AI made that call. | As A10, then A11 |
| C06 | 0:37.6 | 8.3 s | Ask Drift Reviewer, our agent in Rovo, Atlassian's AI, how to roll back: it warns you instead of reading the old step. | As A12, then A13 |
| C07 | 0:46.5 | 5.0 s | Coding assistants get the same check over MCP, an open standard for AI tools. | As A14 |
| C08 | 0:52.2 | 9.2 s | People fix the page, never agents: a rename is one click with no AI, and Drift Reviewer drafts other edits for a person to accept. | As B10 |
| C09 | 1:02.2 | 1.1 s | Verified again. | The real byline "Verified · Doc Drift" with the snap back. As A17, first half |
| C10 | 1:03.9 | 4.4 s | Jira changes count too, and each team sees its flagged pages on one dashboard. | On the first clause: PAY-18 To Do → Done, then ADR-015's byline and its tooltip "PAY-18 moved to Done on Nov 13. Review.". On the second: the dashboard tiles (as A19) |
| C11 | 1:08.9 | 8.0 s | Doc Drift: docs that know when the code moved. Get it at the link on screen. | As B14 |

## 8. Comparison and recommendation

| | A (recommended) | B | C |
| --- | --- | --- | --- |
| Length (estimate) | 1:37 | 1:31 | 1:17 |
| Words | 242 | 229 | 180 |
| Opens on | the 3 a.m. story | the plain sentence | the story, compressed |
| Name, and the sentence complete | 0:15, 0:27 | 0:00, 0:13 | 0:13, 0:22 |
| Continuous real block | 0:27–0:49 (22 s) | 0:25–0:41 (16 s) | 0:23–0:37 (14 s) |
| Real product or real output | about 59% | about 57% | about 52% |
| Set-up shown (suggested links, Verified) | yes | no | no |
| "A review date can't see a code change" | yes | as "The page can't tell" | as "The page can't tell" |
| Jira reason in the voice | yes | yes | no (shown only) |
| Lines with two ideas | 3 | 5 | 6 |

**Recommend A.**

1. It keeps the part every test viewer understood and remembered (the 3 a.m. story; problem clarity 5/5 for all four).
   It then gives the plain sentence at 0:15 to 0:27, inside R4's 0:30 gate. A concrete case before a definition is how
   the clearest films we measured work (PostHog, Rovo), and it is the standard answer to the curse of knowledge.
2. It tells the story once and forward, with the time jump spoken ("Rewind a week"). The page only moves forward:
   Verified, Possibly stale, Verified. No Unanchored restart, no stale-again callback.
3. It has the judge's continuous real block, the longest of the three, and the most real footage overall. Every claim
   the voice makes is on screen as real footage or real output at that moment.
4. It explains Confluence, Rovo, Drift Reviewer, MCP and Possibly stale at first use without slowing down (about 5 s of
   glosses in all). It gives
   Jira a reason a Jira user gets, and it ends on what the product works with and where to get it.

B is the fallback if the director wants the purpose stated in the first seconds. C is the social cut.

## 9. The closing line

| Candidate | Evidence | Verdict |
| --- | --- | --- |
| "Catch the slip before your agents do." | v4 test: 2 of 4 could not parse it ("catch it, or repeat it?"); R4: "the slip" is the logo's private metaphor | Out of the film |
| "Catch the slip before your agents repeat it." | Untested. "Slip" also means a small mistake in plain English, and "repeat it" removes the ambiguity | Possible YouTube thumbnail or title line, after a 2-person check |
| "Docs that know when the code moved." | v4 test: all four understood it by the end; 2 named it the clearer of the two lines. It was vague as an opening (0:10) because nothing had been shown yet | **The film's last spoken line** (A21), after the scope and the link (A20) |
| "So nobody follows a step that no longer works." | Untested; promises an outcome the product cannot guarantee | No |
| "Know which docs to trust, and so will your agents." | Untested; plain, but a slogan | Spare, for the website or Devpost |

The close in A says what the product is for, where to get it, and then the tested line: "Doc Drift: for Confluence, with
Jira and Bitbucket. Get it here. Docs that know when the code moved."

A quick check before locking: show the last 10 s to two people outside the toolchain and ask what the last line means.
Accept the line if both say, in their words, that the docs warn you when the code changes. If the slip line is kept
anywhere, update its entry in [voice-and-copy.md](../../../brand/voice-and-copy.md) (thumbnail line) and the design
system artifact.

## 10. Production notes

### 10.1 Real captures used by Script A

All of these are in `captures.json`. Their masks (the "(Development)" suffix) are always drawn.

| Line | Capture | Range or crop | Watch for |
| --- | --- | --- | --- |
| A02 (option) | `p1-unanchored` | Steps only | Keep the byline ("Unanchored") out of frame |
| A08 | `p1-anchor-rec`, `p1-verified` | 9.3–15.5 s; byline crop | Only 2 suggestions (PAY-6, `scripts/rollback.sh`); never `values.yaml` as suggested |
| A09 | `p2-merge-rec` | 2.0–5.4 s, then about 13–14 s | Real merge of PR #482 |
| A10 | `p1-verified` → `p2-flagged` | byline crops | 19 s is the measured 18.6 s; no tooltip |
| A11 | `p4-review-rec` (or still `p4-panel`) | 25.5–28.5 s; the panel's first line | Crop out "6 minutes ago" |
| A12 | `p3-rovo-v2-rec` | 2.3 s, 10.7 s, 18.0–18.9 s | Recorded after "Replay seeded PR #482": never say or tag "after the merge" |
| A13 | `p3-rovo-v2-answer` | first two sentences | D38 wording |
| A14 | `toolOutput.checkFlaggedV2` | 3 lines | D38 wording |
| A15 | `p4-review-rec` | 33.7–42.1 s | Start after the scroll back up (the earlier part shows the old author name) |
| A16 | `p4-draft-diff`, `p4-accept-rec` | 12.0–12.5 s | Skip Rovo's "Confirm selected"; the agent never touches the page |
| A17 | `p4-verified`, `toolOutput.checkVerified` | byline crop; 1 line | |
| A18 | `p5-jira-before`, `p5-jira-rec`, ADR-015 body crop (from `p5-adr-flagged`), `p5-adr-tooltip` | 2.3–4.1 s | No number for the Jira flag (R3: polling, events can lag) |
| A19 | `p5-dashboard`, `p5-dashboard-2` | tiles, first rows | Always tagged "Sample data from the demo space" |

### 10.2 Never show

- The byline tooltip "PR #482 changed deploy/helm/values.yaml ..." anywhere near "the exact change". Use the review
  panel's first line.
- The old command anywhere in the frame while the agent's answer plays.
- "Bigger" over a rename. The words are "other edits".
- "Doc Drift Sentinel" in any frame:
  - the author of `p4-comment`;
  - the notification flag in `p2-before-reload` and `p2-flag-rec`;
  - the settings title in `x-settings-relay`;
  - every v4 lockup and end card (re-render them).
- "Unanchored", the matcher card, score, threshold, `citePolicy`, or more than three lines of JSON.
- A generic or plain-Rovo assistant giving the caveat. Only Drift Reviewer (real) and our MCP output give it
  ([research.md](../research.md), section 5).
- "A teammate": the merger in the footage is Razvan Statescu, who also owns the page. The voice says "the rename is
  merged".
- GitHub, implied in any way. The voice says Bitbucket, and the end card says "with Jira and Bitbucket".
- "No AI" after A15. It is true for detection and the rename fix only, and leaves the frame before A16.

### 10.3 Re-captures (optional; the capture agent's call)

1. **A real coding assistant using the tools in context** (the simulated judge's ask). A generic terminal with no
   product logo asks "Which docs describe scripts/rollback.sh?" (`find-docs-for-path`), then "Is the payments rollback
   runbook safe to follow?" (`check-page-freshness`). Take it on a page flagged by "Replay seeded PR #482" and tag it
   that way. A works without it.
2. **A Drift Reviewer follow-up, "What changed in PR #482?"** Use it only if the real answer names the rename. It would
   let A13 add "and what changed" for Rovo too. Today, only the MCP output and the panel name the rename.
3. **The owner's comment under the new app name**, if the comment beat ever comes back.
4. **Not possible:** a single live take of the PR #482 merge flipping the page. The PR is merged, and a new merge would
   get a new number. Keep the Nov 13 takes.

### 10.4 Audio and timeline

- Reuse V02 for A01 and V04 for A03. Every other line is a new take: Eric, `eleven_v4`.
- TTS spellings: "3 a.m.", "Rovo" (ROH-voh), "M C P", "Nineteen seconds", "four eighty-two".
- A new `timeline.json` at 120 BPM: A is about 48 bars.
- Lines start on beats; the 19 s roll and the snap back are the two chosen beats.
- Burned-in captions remain a good idea for sound-off viewing ([v1 appendix](../appendix/clips-references-rights.md),
  B.2).

### 10.5 If A runs long after recording

Cut in this order:
1. Fold A19 into A18: "... is flagged, and each team sees them on one dashboard." (−1.5 s)
2. Shorten A07 to "When the code or Jira work behind a page changes, it flags the page for people and AI agents until
   someone checks." (−0.5 s)
3. Drop "No AI made that call." (−1.5 s). Last, because it tested well.

### 10.6 R4's gates, checked against A

| Gate | A |
| --- | --- |
| What, who and why, voiced and on screen together, by 0:30 | Yes: 0:15 to 0:27 |
| Narration pace over the film, 2.3 words/s or more | 2.5 |
| Silence over 1 s, except chosen beats | None. Gaps are 0.3 to 0.5 s; holds of 0.4 s or less on the 19 s roll, the clicks and the snap back |
| Only words the voice says, plus proof tags | Yes: every set line is spoken; the tags are "Real product ...", "Merge to flag, measured ...", "Real output ...", "Sample data ...", and the URL |
| Jargon never voiced: "PR", "byline", "deterministic", `rollback.sh`, "step 2", "space" | None voiced. "Pull request 482" is said once, in full |
| Newcomer test: 2 outsiders, one of them Jira-only, answer "what does it do, for whom" by 0:30 | To run on the first cut |

When the director locks v5, it needs a decision entry (D41) and updates to BRIEF.md (the script) and voice-and-copy.md
(the close).

## Sources

Read 2026-11-17 unless marked.

- Codegeist 2026 rules: https://codegeist2026.devpost.com/rules (as recorded in [codegeist-rules.md](../../hackathon/codegeist-rules.md), read in a browser 2026-11-13)
- Devpost, "6 tips for making a hackathon demo video": https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video (via [the v1 appendix](../appendix/clips-references-rights.md))
- Capable, "How to win Atlassian Codegeist (from the 2024 winners)": https://www.gocapable.com/blog/how-to-win-atlassian-codegeist-from-the-2024-winners
- MLH, "Judging plan": https://guide.mlh.com/general-information/judging-and-submissions/judging-plan
- Builderbase, "Hackathon playbook ch. 15: judging rubrics": https://intercom.help/builderbase/en/articles/14831464-hackathon-playbook-ch-15-judging-rubrics
- AI Tinkerers, "Video production guide for hackathons": https://aitinkerers.org/docs/public/video_production_guide.md
- Wistia, "How to choose the right marketing video length" (2025-07-01, 2026 State of Video data): https://wistia.com/blog/optimal-video-length
- fliki, "Explainer video script template": https://fliki.ai/blog/explainer-video-script-template
- truScribe, "Explainer video script template": https://truscribe.com/feeds/blog/explainer-video-script-template
- VideoScribe, storyboarding: https://blog.videoscribe.co/how-to-keep-audience-hooked-storyboarding
- Mayer's principles of multimedia learning (Dartmouth summary): https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655
- Chip and Dan Heath, "The Curse of Knowledge", Harvard Business Review, December 2006: https://hbr.org/2006/12/the-curse-of-knowledge
- Lee LeFever, interview by Bob Morris: https://bobmorris.biz/?p=19283
- Peter Cohan on "do the last thing first" (Reprise): https://www.reprise.com/resources/blog/peter-cohan-on-how-to-get-the-end-result-in-a-software-demo
- Mintlify Autopilot: https://www.youtube.com/watch?v=HBHZe9zdbHs
- PostHog Scouts: https://www.youtube.com/watch?v=QefP1WAXhc0
- Atlassian Rovo: https://www.youtube.com/watch?v=B2lfNOXMDG8
- Resend new.email: https://www.youtube.com/watch?v=u8O6BzMMc7Q
- Recheck: https://www.youtube.com/watch?v=r8cKsk3DrlA
- Secure Notes for Jira: https://www.youtube.com/watch?v=1FOlNEBFGfY
