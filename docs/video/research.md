# Launch video: research and plan (2026-11-13)

Research for the Doc Drift Sentinel launch video: a hypermotion film of about 2:30 (3:00 at most), built in Remotion, with ElevenLabs voice, music and sound effects and GPT Image 2.6 for generated visuals. It replaces the v2 script in [../hackathon/demo-and-pitch.md](../hackathon/demo-and-pitch.md).

**This file is research and a proposed plan. Nothing has been built.** No video project exists yet, no API was called, no screenshot or clip was captured, and nobody has listened to any audio. A later session implements the film from this file.

| Read this if you are | Sections |
| --- | --- |
| Razvan, deciding | 1 (what changed), 2 (11 decisions), 7.4 (draft script) |
| The implementer | all of it, then the appendices for item-level detail |

Appendices (research logs, kept as delivered, each with a note on what was re-checked):

| File | Holds |
| --- | --- |
| [appendix/sources-docs-drift.md](appendix/sources-docs-drift.md) | 46 sources on docs going stale when the system changes, and on calendar reviews failing |
| [appendix/sources-ai-stale.md](appendix/sources-ai-stale.md) | 45 sources on AI assistants and agents repeating stale docs, trust numbers, Atlassian's own words |
| [appendix/clips-references-rights.md](appendix/clips-references-rights.md) | 12 reusable voice clips, Codegeist winners' videos, 17 launch videos, rights and platform rules |
| [appendix/tool-facts.md](appendix/tool-facts.md) | Remotion, ElevenLabs and OpenAI facts as of today, and what to reuse from the Satchel film |

**How facts were checked.** Four research threads ran in parallel and logged every item as VERIFIED (page opened and read), REPORTED or UNVERIFIED. I then re-opened 14 of the sources most likely to go on screen, the licence statements of 9 of them, the npm registry, and the Codegeist rules page in a real browser. All 14 read exactly as logged. Where this file says "verified", that is what it means; anything else is marked.

---

## 1. What the research changed

1. **The Codegeist rule on third-party material is strict, and it decides how the cold open is built.** Read in a browser today: the video "must not include third party trademarks, or copyrighted music or other material unless the Entrant has permission to use such material." A Satchel-style barrage of raw screenshots of other people's posts and news pages does not meet that wording. Section 6.2 proposes a version that does: real captures only from openly licensed pages and Atlassian's own pages, and everything else as verbatim quote cards.
2. **Enough openly licensed material exists to keep real screenshots in the barrage.** Two Wikimedia incident reports that name outdated documentation (CC BY-SA), a UK government runbook with a lapsed review banner (Open Government Licence), three arXiv papers on agents and stale documents (CC BY and CC BY-SA), and three voice clips under CC BY. Licences were read on the pages.
3. **Judges need not watch beyond 5 minutes, not 3.** Our docs said 3:00, from a search excerpt. The live page says "Judges are not required to watch beyond five minutes". The 2:30 target stands, but nothing has to be crammed before 3:00. I corrected CLAUDE.md and the hackathon docs.
4. **The rules ask for real footage.** The video "should include footage that shows the Project functioning on the device for which it was built", and the Presentation criterion asks: "Does the video clearly demonstrate the project working end-to-end? Does the pitch communicate what problem is solved, who it's for, and why it matters? Is the overall presentation easy to follow?" So the "how it works" act must be real recordings of the real app. Mock interfaces belong only in the problem act.
5. **Winning Codegeist videos are voice-led demos.** All 7 winners' videos that could be read are carried by a human voice, state the problem in plain words within 15 to 30 seconds through one scenario, and spend most of their time on real UI. A designed film will stand out; it must still do those three things. The shortest winner (2:07) took a first place.
6. **Nobody in the reference set opens a product film on a real-screenshot barrage.** It is a documentary-trailer device. It will be distinctive here, and it is the part that carries the rights risk.
7. **There is a near neighbour in this year's field.** "Recheck: stale page reviews for Confluence" (1:30) flags pages by age. Our film should say the difference early: the trigger is a code change, not a date, and agents are told.
8. **New evidence, stronger than what we had.** A paper accepted at APSEC 2026: "63.2% of AI PRs change code without updating any documentation." A preprint titled "Stale-Document Poisoning: When Outdated Retrieval Overrides Correct Model Answers". A suggestion on Atlassian's own tracker (ROVO-730): agents serve "outdated information with the same confidence as current information". Atlassian's own blog: "AI agents are only as good as what they know. Right now, most don't know enough."
9. **One of our pitch numbers has aged.** The Stack Overflow 2025 line "46% distrust AI accuracy" now has a 2026 successor that says trust rose. Use the 2026 rows instead (48.0% trust AI output only "when I can easily verify the output"), or date the 2025 figure on screen.
10. **Tools moved since the Satchel film.** Remotion is at 4.0.543 (effects now default to WebGPU; `@remotion/mac-cursors` and a `magnify()` effect are new). GPT Image 2.6 exists (`gpt-image-2.6-flare`, `gpt-image-2.6-sunburst`, released 2026-11-04). ElevenLabs has `eleven_text_to_sound_v3`, `music_v2_5` and `scribe_v3`; `eleven_v4` is still the narration model. OpenAI's video API was shut down in September, so there is no generated b-roll from OpenAI.
11. **Two licence questions need an answer before spending.** Remotion is free only for companies of up to 3 people. Eleven Music's Starter to Pro plans are "For Individual Use Only". See decision 8.

---

## 2. Decisions needed from Razvan

> **Decided 2026-11-13.** Razvan: the rights reading below was too strict ("we need to be careful about the materials, but I won't be so harsh in this"), and all voice, music, effects and images are generated on his own paid ElevenLabs and OpenAI accounts. He left decisions 1 and 2 to the team, confirmed the company is one person (Remotion's free licence applies) with a paid ElevenLabs account, and approved making the real merge PR #482. The production choices that follow are in [../../video/BRIEF.md](../../video/BRIEF.md) section 1: real screenshots are used in the cold open with care (source and date visible, short, private people blurred, words unchanged, every item logged and swappable); Night for the problem and Day from the solution on; footage from the development install; no second account. The build is under way in [../../video/](../../video/).


Each has a recommendation, so the build can start on "go with your recommendations".

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | How the barrage handles other people's material | A: raw screenshots everywhere, as in Satchel. B: real captures only from openly licensed and Atlassian-owned pages; the rest as verbatim quote cards. C: quote cards only | **B.** It keeps real screenshots and meets the rule as written. A risks a request to re-edit after submission, or worse. Details in 6.2 |
| 2 | The look after the cold open | Night shift (dark) throughout, with Confluence in dark theme. Or: Night for the problem, then the Day theme opens at the reveal and the product is shown in Confluence's light theme | **Night for the problem, Day from the reveal.** Judges know Confluence in light, light UI sits naturally on the Paper ground, the reveal gets a real change of light, and it matches the website's new default. It is a scoped exception to "Night shift is primary", like D36's |
| 3 | The narrator | An ElevenLabs voice (which one), or Razvan's own voice | **ElevenLabs, chosen from 3 auditions** (Daniel "Steady Broadcaster", Brian, Sarah) reading 3 script lines on `eleven_v4`. A 2024 winner's advice was that a real face or voice helps, so Razvan's own voice stays a valid choice |
| 4 | The one real voice in the cold open | Mikey Ariel (5 s): "Bad documentation or outdated documentation is worse than no documentation." Anton Khirnov (5 to 9 s): docs "will get out of date ... because somebody [changes] the code". Addy Osmani (4 s): "Quality context determines if agents succeed or fail." Or none | **Ariel, if the audio is clean**; Osmani as the alternate. Decide by ear: nobody has listened yet (6.4) |
| 5 | The pull request number on screen | The real number of the recorded merge (about #20). Or make the real merge PR #482 by opening and declining about 460 empty pull requests in the demo repo first | **Make it #482.** The site, demo mode and brand all tell the PR #482 story, and the footage stays real. It leaves about 460 declined PRs in the demo repo, which judges never see. Needs Razvan's yes because it writes to Bitbucket |
| 6 | Who appears in the footage | Everything under Razvan's account. Or a second Atlassian account ("Sam") that merges the PR, with the page owner shown as "Dana" by a temporary display-name change | **Create the second account.** It also unblocks the viewer-persona test that has been waiting since phase 2. If not, the script drops the names |
| 7 | Which install is filmed | Development (titles carry a "(Development)" suffix). Or production on the demo site | **Production**, so the footage shows what judges install. That makes the production deploy a dependency of the final captures (section 13). Early builds use development captures as stand-ins |
| 8 | Licences | Remotion: free up to 3 people in the company, else $25 per seat per month. Eleven Music: confirm the account's plan may be used by a company | **Razvan confirms Nano Soft's headcount and the ElevenLabs plan.** If the music terms are a problem, 6.5 and 9 describe a designed bed made from sound effects, which paid plans allow commercially |
| 9 | Length | 2:30 (this plan), or use the room up to 5:00 | **2:30.** Every winner fact supports tight and scripted. A longer "full walkthrough" can live on the website later |
| 10 | Naming the coding agent | Show and say "Claude Code". Or show a real terminal and say "coding agents", with product names only in the YouTube description | **Generic on screen.** "Claude Code" and "Cursor" are third-party marks under rule 1. The terminal footage is still real |
| 11 | Quotes from individuals (one Hacker News comment, one personal blog) | Ask each author for permission, show them without a name as "Hacker News comment, 2021", or leave them out | **Ask; leave out if no answer in a week.** The barrage works without them |

A twelfth, optional step: ask on the Codegeist forum whether brief, attributed quotes and screenshots of public pages are acceptable in the video. It would settle decision 1 with authority, but it also draws attention to the question. I would not ask if we go with option B.

---

## 3. What the rules and the judges ask for

All read on https://codegeist2026.devpost.com/rules in a browser on 2026-11-13.

| Topic | Exact wording |
| --- | --- |
| Length | "should be less than five (5) minutes. Judges are not required to watch beyond five minutes" |
| Footage | "should include footage that shows the Project functioning on the device for which it was built" |
| Hosting | "must be uploaded to and made publicly visible on YouTube" |
| Third-party material | "must not include third party trademarks, or copyrighted music or other material unless the Entrant has permission to use such material" |
| Originality | "Be the original work of the Entrant, be solely owned by the Entrant, and not violate the IP rights of any other person or entity" |
| After the deadline | "The Sponsor and Devpost may permit you to modify part of your Submission after the Submission Period for the purpose of adding, removing or replacing material that potentially infringes a third party mark or right, discloses personally identifiable information, or is otherwise inappropriate." |
| Language | English, or an English translation of the video |
| Presentation (1 of 5 equal criteria) | "Does the video clearly demonstrate the project working end-to-end? Does the pitch communicate what problem is solved, who it's for, and why it matters? Is the overall presentation easy to follow?" |
| Potential Impact | "Does the project make a credible, specific case for solving a real problem for a real audience — and does the solution actually address that problem based on what's demonstrated?" |
| Design | "Does the project deliver a complete, coherent product experience — not just a technical proof of concept?" |

What follows for the film:

- **Show it working end to end, with real footage.** Anchor, merge, flag, agent answer, review, verified: one continuous story in the real product.
- **Say the problem, who it is for and why it matters in words.** A barrage alone does not do that. The scenario in act 1 and one on-screen line ("For teams who keep runbooks in Confluence") do.
- **"Based on what's demonstrated"** means every claim the film makes should be visible in the footage. Section 5 lists them.
- **Easy to follow** argues against 2:30 of constant speed. The plan slows down wherever there is UI to read.

Official and winner advice, quoted in the appendix: Atlassian's 2024 panel said to build the video "around the use cases you are trying to solve ... not the mechanics of it"; a 2024 winner said "you should stand out within the first seconds"; Devpost's tips say "Start the video with your elevator pitch." The plan satisfies all three: a cold open that stands out, then the product name and one-line pitch by 0:12.

---

## 4. Audience research: the problem in other people's words

Our earlier research ([../research/user-needs-and-competitors.md](../research/user-needs-and-competitors.md)) already had the Atlassian Community threads and Reddit quotes. This pass looked for material that can go on screen, and found 91 new items. The strongest, by theme:

**Docs go stale when the system changes, not when the calendar turns**
- Google, The Site Reliability Workbook: "Details in playbooks go out of date at the same rate as production environment changes." (verified)
- Wikimedia incident report, 2017: "Documentation was outdated for jobrunner, dsh, and salt" (verified; the documented deploy steps no longer matched the tooling)
- Wikimedia incident report, 2019: "The documentation associated with the frozen indexing alert is out of date"
- The Register, 2019: "Techie with outdated documentation gets his step count in searching for non-existent cabinet" (verified; the cause was a rename)
- A Hacker News comment, 2021: "throw away your runbooks. They are out of date the moment you hit save." (verified)
- GitHub Open Source Survey 2017: "Incomplete or outdated documentation is a pervasive problem, observed by 93% of respondents" (verified; 5,500 respondents; "incomplete or outdated" together)
- arXiv 2610.27381, accepted at APSEC 2026: "63.2% of AI PRs change code without updating any documentation." (verified; 29,669 AI-generated pull requests in 2,585 repositories). AI now writes the code faster than anyone updates the page.

**Review by calendar does not catch it**
- A UK Ministry of Justice public runbook carries the banner "This page was set to be reviewed before 18 January 2026 ... This might mean the content is out of date." (both sentences verified in the page; which one shows depends on the date). A lapsed review date says nothing about whether the page is right.
- unfinished.bike, 2021: "I have never seen quarterly playbook reviews work."
- Stack Overflow's own SRE, on their blog: "The author of 90% of our documentation doesn't work here anymore!"
- Software Engineering at Google: "Documents without owners become stale and difficult to maintain."

**Agents repeat stale docs with confidence**
- Atlassian Community question title, July 2026: "ROVO Agent - It always reads from an OLD confluence source." (title verified)
- jira.atlassian.com ROVO-730, a public suggestion titled "Knowledge Source Freshness Monitoring for Rovo Agents": "the agent continues to serve outdated information with the same confidence as current information" (verified; 2 votes, status Gathering Interest)
- arXiv 2609.31342: "Stale-Document Poisoning: When Outdated Retrieval Overrides Correct Model Answers", with "outdated retrieval flips 30% of Llama and 37% of Qwen answers" (title verified; public facts, open-weight models)
- arXiv 2610.30571: "Without the sentence, 90.1% of the agents' choices followed the stale file." (verified; the real title is "Stale Instruction Files Override the Code in Coding Agents: A One-Sentence Fix"; our older doc had an aggregator's title, now corrected)
- arXiv 2606.09090, "Context Rot in AI-Assisted Software Development": "stale code element references in 23.0% of repositories" (verified; 356 repositories; "preliminary evidence")
- Atlassian's blog, May 2026: "AI agents are only as good as what they know. Right now, most don't know enough." (verified)
- Atlassian Teamwork Lab, September 2026: "77% of knowledge workers say it's important for AI to thoroughly understand their company's institutional knowledge, but only 21% believe it does." (1,002 US knowledge workers; about missing context, not stale context)
- Stack Overflow 2026 survey: 48.0% chose "I trust it when I can easily verify the output"; 6.6% trust AI "for many tasks, including important work decisions" (30,903 responses)

**What was looked for and not found.** No post on X, Bluesky or Mastodon by a known engineer. No Reddit page could be opened today. None of 12 big-name postmortems (Cloudflare, Slack, Monzo, Atlassian 2022, Stripe, Roblox, GitHub and others) names outdated docs. No Gartner or Forrester line on stale content. No published share of runbooks that are out of date. The appendices list every miss so the search is not repeated.

**Traps.** These look relevant and are not: GitLab's 2017 outage and Knight Capital (missing docs, not stale ones); hallucination stories with no document behind them (Air Canada's chatbot); DORA's "25% have good documentation" (quality in general). Lines that mock Confluence ("where documentation goes to die") are verified and on theme, and should stay out of a film judged by Atlassian. Each appendix ends with its full trap list.

---

## 5. What the film may claim

Every claim in the script maps to something true today. The implementer should re-check each against the build that is filmed.

| Claim | Basis | Guard |
| --- | --- | --- |
| Pages are anchored to code paths, globs and Jira issues; anchors are suggested from the page | F1, R-1 | Bitbucket Cloud only. Never imply GitHub or GitLab |
| A merged pull request flags the page within seconds | Live test: merge to flagged page in 11 s (M1) | Say the number only if the recorded take shows it. Label: "measured on the demo site" |
| Detection uses no AI | The matcher is deterministic (D2) | Fine to say plainly |
| No false flags on our test set | `fixtures/eval-report.json`: 40 scenarios, 727 page decisions, 0 false positives, 2 known misses, precision 1.00, recall 0.94 | On screen: "Our eval set: 40 scenarios, 0 false flags, 2 known misses". Never "100% accurate" |
| Drift Reviewer answers with the page state and the change | F6, live in Rovo | **Only Drift Reviewer does this.** Plain Rovo Chat does not check freshness by itself. Never show plain Rovo giving the caveated answer |
| Coding agents get the same signal over MCP | F7; the outputs on the website are real tool output from PLAT | Tools are read-only. Agents read as the signed-in person |
| A rename gets a one-click fix with no AI; bigger fixes are drafted by Drift Reviewer and applied only when a person accepts | R-4, F11, D28, D29 | "Agents never edit a page" is true. The accepted edit is saved as the person, with a version message |
| Jira changes flag pages; a Jira task can track the update | F2, D35 | Closing the task does not verify the page |
| Each space has a dashboard | F8 | Numbers from PLAT (18 of 24 anchored, 5 Possibly stale) carry "sample data from the demo space" |
| Both apps run on Atlassian Forge | Architecture | Do not say "Runs on Atlassian": that is a badge programme, and the relay has an egress entry |

Wording rules that apply to every card and line:
- Never say a page is wrong. Say "out of date", "stale" or "its anchors changed".
- State names keep their capitals and always show a word and an icon: Verified, Possibly stale, Stale, Unanchored.
- "Doc Drift Sentinel" in full on first use; never "DocDrift" or "DDS".
- Sentence case, digits, no exclamation marks, no emoji.
- The barrage states problems only. No caption claims we would have prevented anything shown.
- Pages with view restrictions are unsupported; the film does not go near them.

---

## 6. The cold open: a barrage of real evidence

### 6.1 What the Satchel cold open did, and what transfers

Source: `/Users/razvanstatescu/Documents/Work/near/Satchel/marketing/` (`README.md`, `script/SCRIPT-v5.md`, `script/SCRIPT-v6.md`, `notes/intro-research/{creative,tech,sources,build,audio-v6,sfx-intro}.md`).

The Satchel film opens with 8.7 seconds on black: a 3D wall and tunnel of real headlines and posts, whips and zoom punches, three still captions (one per 2-second bar), one real CC BY voice clip over the middle, then a hard cut to black in digital silence, the narrator's line "That's why we built Satchel.", and the product slams in as the bright world opens.

What made it work, from its own notes:

1. **Lock one thing and move the world.** The caption holds still while the screenshots change under it.
2. **Each caption is a problem the film answers later.** Nothing is shown that the product does not fix.
3. **Accelerate on a grid.** 120 BPM at 30 fps: a beat is 15 frames, a bar 60.
4. **One phrase per shot.** Punch in on the key words and underline them; the rest is texture.
5. **Distortion is punctuation.** Glitch only on the cut frame and the next, only on third-party material, never on the brand.
6. **A real voice is the most credible two seconds.**
7. **The turn is quiet.** Half a second of silence, one sentence, one hit.
8. **Every source is logged**: exact text, URL, date, fact-check mark, blur list, and a plates manifest.

What does not transfer: the rights position. Satchel showed raw screenshots as news commentary in a film posted on X. Codegeist's rule asks for permission, which is a higher bar (6.2).

Lessons from Satchel's build that cost time there and can be skipped here:
- The first render failed a photosensitivity screen (4.5 flashes per second locally). Light pages had to be graded down and slams run back to back. Run `flashcheck.py` on every render.
- Chorus voices masked the real voice. Nothing else may sound under the real clip's words.
- MP3 cues played 25 ms late. Use WAV for anything that must land on a frame.
- Generated music put its events seconds late. Cut the bed on bar lines after generation, or build the bed from sound effects on the grid.
- The jump from the barrage to the tagline felt abrupt until the bridge line was added. Keep the bridge.
- A frame-by-frame review of the finished film found 57 motion issues. Plan that review (section 12).

### 6.2 Rights: how to show real evidence under the Codegeist rule

Not legal advice. The rule's test is permission, and its scope is "third party trademarks, or copyrighted music or other material".

| Tier | What | Why it is allowed | How it appears |
| --- | --- | --- | --- |
| 1 | Pages under an open licence | The licence is the permission. Read on each page: Wikimedia wikitech (CC BY-SA), UK MoJ runbooks (Open Government Licence v3.0), arXiv 2609.31342 and 2606.09090 (CC BY 4.0), arXiv 2610.27381 (CC BY-SA 4.0), talk recordings marked CC BY | **Real captures**, cropped, with the source and licence on the card and in the description |
| 2 | Atlassian's own pages: its blog, its public Jira tracker, Atlassian Community | Atlassian is the Sponsor, not a third party. Community posts are written by members, so show the title only and blur every name and avatar | **Real captures**, identities blurred |
| 3 | One sentence from anything else: books, news headlines, blogs, comments, papers without a reuse licence, survey figures | A short attributed quotation, not a reproduction. No logo, masthead, photo, avatar or page design is shown | **Quote cards** in our own house style: the words verbatim, the source and year in small plain text |
| 4 | Illustrations we build: a generic alert, a generic wiki page, a terminal error, a generic chat answer, a diff | Ours | Unbranded mock cards, never presented as a real post or product |

Never: a raw screenshot of a news site, a social post or a competitor's page; a logo of anyone but us and Atlassian; a private person's name, handle or face; an invented quote; a quote altered in any word.

Notes on the licences:
- **CC BY-SA** asks that adaptations carry the same licence. To be safe, publish the processed plates of the 3 CC BY-SA sources in the repo under CC BY-SA with attribution. The repo goes public on Dec 19 anyway.
- **Open Government Licence** asks for the line "Contains public sector information licensed under the Open Government Licence v3.0."
- **CC BY clips** need the speaker, title, event, licence and a note of changes ("audio trimmed; picture not used"), plus "use does not imply endorsement". Keep a dated screenshot of each licence field.
- **arXiv 2610.30571 and 2611.09802** carry arXiv's non-exclusive licence, which grants no reuse. They are tier 3: one quoted sentence each.
- **The SRE Workbook, Software Engineering at Google and DORA reports** are CC BY-NC-ND or NC-SA. A product film is commercial, so they are tier 3 too.
- Tier 3 still leans on quotation being acceptable. The rule's own fix-it clause makes the worst realistic outcome a request to replace a card. If Razvan wants zero exposure, option C drops tier 3 to our own paraphrase-free stat cards built only from open data.

All credits go in the YouTube description and in a `CREDITS.md` beside the video project.

### 6.3 The barrage, bar by bar

Six seconds of barrage (3 bars at 120 BPM), then the turn. Three captions, each answered later in the film:

| Bar | Frames | Caption (still, top centre) | Answered by |
| --- | --- | --- | --- |
| 1 | 0 to 59 | **The code moved.** | P2: a merge flags the page |
| 2 | 60 to 119 | **The docs didn't.** | P1 and P2: anchors, and a flag raised by the change, not by a date |
| 3 | 120 to 179 | **The agents can't tell.** | P3: Drift Reviewer and MCP |

The three captions together restate the tagline, "Docs that know when the code moved."

Proposed plates. "Real" is a capture (tiers 1 and 2), "Quote" a house card (tier 3), "Built" an illustration (tier 4). IDs refer to the appendices.

| Bar | Kind | Source | Text on screen | Notes |
| --- | --- | --- | --- | --- |
| 1 | Built | ours | A diff: `- scripts/rollback.sh` / `+ scripts/rollback-v2.sh`, "Merged" | Opens the film on the actual event. Frame 0 must read with the sound off |
| 1 | Real | arXiv 2610.27381 (A2-01), CC BY-SA | "63.2% of AI PRs change code without updating any documentation." | Hero of bar 1. Underline "63.2%" |
| 1 | Quote | Google, The Site Reliability Workbook (D1-02) | "Details in playbooks go out of date at the same rate as production environment changes." | |
| 1 | Quote | Hacker News comment, 2021 (D1-04) | "They are out of date the moment you hit save." | Decision 11 |
| 1 | Quote | Jos Visser, 2024 (D1-11) | "runbooks are always out of date." | Alternate |
| 2 | Real | Wikimedia incident report, 2017 (D1-06), CC BY-SA | "Documentation was outdated for jobrunner, dsh, and salt" | Crop to that bullet only. A struck-through line sits two bullets below it |
| 2 | Real | Wikimedia incident report, 2019 (D1-07), CC BY-SA | "The documentation associated with the frozen indexing alert is out of date" | |
| 2 | Real | UK MoJ runbook banner (D2-03), OGL | "This page was set to be reviewed before 18 January 2026 ... This might mean the content is out of date." | Confirm the banner state at capture. Overdue is not the same as wrong |
| 2 | Quote | The Register, 2019 (D1-03) | "Techie with outdated documentation gets his step count in searching for non-existent cabinet" | Headline as text, no masthead |
| 2 | Quote | unfinished.bike, 2021 (D2-04) | "I have never seen quarterly playbook reviews work." | Decision 11 |
| 2 | Quote | Stack Overflow Blog, 2020 (D2-01) | "The author of 90% of our documentation doesn't work here anymore!" | One team's remark, not a survey |
| 2 | Quote | GitHub Open Source Survey 2017 (D1-01) | "Incomplete or outdated documentation ... observed by 93% of respondents" | Data is CC0 |
| 2 | Built | ours | A generic wiki page: "Last reviewed 34 days ago", step 2 `./scripts/rollback.sh`; then a terminal: `no such file or directory: ./scripts/rollback.sh` | Plants the scenario of act 1 |
| 3 | Real | Atlassian Community (A1-06) | "ROVO Agent - It always reads from an OLD confluence source." | Title only. Blur the poster. The case behind it is an indexing problem, so show it as a customer's words, not as how Rovo works |
| 3 | Real | jira.atlassian.com ROVO-730 (A4-02) | "the agent continues to serve outdated information with the same confidence as current information" | Blur the reporter. It is a suggestion with 2 votes: never caption it "Atlassian says" |
| 3 | Real | arXiv 2609.31342 (A1-13), CC BY | "Stale-Document Poisoning: When Outdated Retrieval Overrides Correct Model Answers" | Pair with its subtitle so "poisoning" does not read as a security story |
| 3 | Real | arXiv 2606.09090 (A2-02), CC BY | "Context Rot" and "stale code element references in 23.0% of repositories" | |
| 3 | Quote | arXiv 2610.30571 (R3) | "90.1% of the agents' choices followed the stale file." | Use this sentence, not the one that names a product |
| 3 | Quote | Stack Overflow Developer Survey 2026 (A3-01) | "48.0%: I trust it when I can easily verify the output" | |
| 3 | Built | ours | A generic assistant answer quoting step 2 with a source chip "Payments rollback runbook" | |
| 3 | Real, last slam | Atlassian blog, May 2026 (A4-01) | "AI agents are only as good as what they know. Right now, most don't know enough." | The keystone. It is the sponsor's own framing, and our product is the answer to it |

That is 9 real captures, 8 quote cards and 4 built shots. Satchel's barrage used about 20 plates, so the density matches.

Rules carried over from Satchel:
- Every card shows its source and year while on screen. Private individuals are blurred. Words are never changed; cropping, zoom and distortion are fine.
- A short headline needs at least 12 clean frames; the hero card of each bar at least 24. Key phrase at least 40 px tall after the punch-in.
- One grade for all third-party plates (desaturate about 25%); light pages graded down to about 0.6 brightness so the frame does not flash.
- No amber in the barrage. The first amber pixel of the film is the slipped band of our mark at the reveal.
- Balance: at most 2 items that put Rovo in a bad light, and the last word goes to Atlassian's own constructive line.
- Capture each page in a real browser at 3x, save the full page and the crop, and log it in `plates.json` with URL, date read, exact text, key-phrase boxes, licence and blur list. Several sites block automated fetches (appendix lists them).

### 6.4 The real voice

Twelve clips with an attribution-only licence were found; the appendix has all of them with timestamps. The three that fit:

| Clip | Line | Length | Licence, as read | Caveat |
| --- | --- | --- | --- | --- |
| Mikey Ariel, "Docs or it didn't happen!", foss-north 2019, https://www.youtube.com/watch?v=Rq98-audaEc | "Bad documentation or outdated documentation is worse than no documentation." (16:22.5 to 16:27.5) | 5 s | "Creative Commons Attribution license (reuse allowed)", re-read today | From 2019, before agents. Do not turn "worse than no documentation" into "your page is wrong" |
| Addy Osmani, "Stop Wasting Tokens: The Art of Context Engineering", 2025, https://www.youtube.com/watch?v=zMM5zqesL1g | "Quality context determines if agents succeed or fail." (13:55 to 13:59.5) | 4 s | Same field, re-read today | He means context in general. Credit by name only |
| Anton Khirnov, FOSDEM 2025 | "nobody ever documents things, and if you do it, it will get out of date, eventually, because somebody [changes] the code and doesn't update [the] documentation." (10:39 to 10:48) | 5 to 9 s | "Creative Commons Attribution 2.0 Belgium" on the talk page (read by the research thread) | States our rule exactly, but the transcript is unclear at "changes", he says it with a laugh, and it is a room microphone |

Recommended use: Ariel's line starts on bar 2 and carries over bar 3, audio only, with nothing else speaking under it. If her audio is poor, Osmani's line over bar 3.

Do not use: the Swimm CTO's CC BY line (the nearest direct competitor), or Mintlify's launch line "When you have outdated docs, it gives outdated answers to your users, your team, and AI" (the best one-sentence statement found, but standard licence).

**All quotes and timestamps come from machine transcripts. Listen before cutting.**

### 6.5 The turn and the reveal

| Frames | Picture | Sound |
| --- | --- | --- |
| 0 to 179 | The barrage | A designed bed on the grid, the real voice, hits on the slams. Everything is sucked toward the centre over the last 6 frames |
| 180 to 194 | Black | Digital silence (0.5 s) |
| 195 to 260 | On the black, as a title and in the narrator's voice: **"That's why we built Doc Drift Sentinel."** | The narrator, dry. Nothing else |
| 261 to 270 | The mark assembles on black: the top and bottom bands land aligned, with the trace between them | Two soft ticks |
| 271 | The middle band slides in from the left and stops one slip unit to the right of the trace, in amber. On that frame the Day world opens from the mark outward | The film's signature sound: a short slide and a latch. The loudest moment of the open |
| 272 to 359 | The lockup settles; the tagline sets and holds: **"Docs that know when the code moved."** | The narrator says the tagline. The score starts on this bar |

The logo rules allow this: only the slip animates, and it ends in its drawn position. The cold open is 12 seconds in total, and the product name and pitch have both been heard by 0:12.

---

## 7. The film

### 7.1 The idea

**Everything is aligned, except the one thing that moved.**

The brand already has one motion idea, the slip: a band slides one unit (11.7% of its width) to the right and glows amber; verifying slides it back. The film makes that its whole grammar.

- **The problem world (cold open and act 1)** is Night: black and Fathom, everything drifting, third-party material warped and glitching, nothing lined up.
- **The product world (from the reveal)** is Day: Paper ground, Fathom type, everything on a grid and still. In any shot exactly one thing is out of line, it is amber, and the story of the shot is that slip being caught or put back.

This is a scoped exception to two brand rules, the same kind D36 made for the website: "Night shift is the primary look", and "nothing else moves on its own". Camera moves, type reveals and cuts are allowed; the *product and brand elements* still only ever slip and snap back.

### 7.2 Motion grammar

| Device | What it is | Where |
| --- | --- | --- |
| Slip cut | The frame splits into 3 horizontal bands; the middle band slides right by 11.7% and the next shot is behind it. 6 to 8 frames, expo out | Between problem and product; when something drifts |
| Snap back | The reverse, 8 frames, with the latch sound | On every Verified |
| Trace | A 10% ghost stays where the element was, for as long as it is out of line | Under the slipped badge, the slipped step, the slipped band |
| Anchor lines | Hairlines drawn from a token in the page (`scripts/rollback.sh`) to a code path chip | Act 2 and P1 |
| Punch-in | 1.0 to 1.6 on the UI detail that matters (expo out), then hold. The `magnify()` effect for small text | Every real-UI shot |
| Scripted cursor | The real cursor is hidden in recordings; `<MacOSCursor>` moves on a spring between known targets | All real-UI shots |
| Whip | 8 to 10 frames between two surfaces, following the change: Bitbucket to Confluence, Confluence to the terminal | P2, P3 |
| Counter | A mono timer counts the seconds from merge to flag | P2 |
| Type | Spline Sans 600, sets in 12 to 18 frames, then **does not move while it is read**. Spline Sans Mono only for literals | Everywhere |
| Distortion | RGB split, warp, slices, scanlines | Barrage only, third-party plates only |

Numbers, from the Satchel cookbook (`notes/hypermotion-cookbook.md`, sections 0, 2, 4, 5):
- 1920x1080, 30 fps, 120 BPM. A beat is 15 frames, a bar 60. Compute cuts from a cumulative beat count.
- Easing: expo out to land, expo in to leave. No bounce.
- Reading time: `hold_frames = 30 x max(0.8 + 0.25 x words, chars / 15)`, counted from the moment the text is still.
- Never two fast sections back to back. After at most 8 seconds of fast cutting, at least one bar of stillness.
- Body copy at least 56 px, headlines at least 120 px, mono literals at least 40 px, inside the central 80% of the frame.
- One amber element per shot. On Day grounds amber as text uses `beacon-text` (#8A5300); the amber fill (#FFB224) carries `on-beacon` text.

### 7.3 Structure

150 seconds, 75 bars. Scene boundaries are on bar lines.

| Act | Time | Length | What happens | Pace | Footage |
| --- | --- | --- | --- | --- | --- |
| A0 Cold open | 0:00 to 0:12 | 12 s | Barrage, black, the bridge line, the reveal, the tagline | Burst, then hold | Third-party plates, built shots, the mark |
| A1 The problem | 0:12 to 0:32 | 20 s | One scenario: 3am, payments is down, the runbook's step 2 names a script that was renamed, the page looks reviewed, an AI agent repeats the step | Standard, on Night | Built mocks, plus one real recording if it reproduces (8.3) |
| A2 The solution | 0:32 to 0:52 | 20 s | What it is in one sentence, the anchor picture, the 3-band story, who it is for, the 4-word spine | Hero holds, Day | Designed |
| P1 Anchor | 0:52 to 1:04 | 12 s | Open the badge on the runbook, accept the suggested anchors, save, Verified | Explanation | Real |
| P2 Flag | 1:04 to 1:22 | 18 s | A real merge in Bitbucket; a timer; the badge slips to Possibly stale; the tooltip names the PR; the owner's comment | Standard into a hold | Real |
| P3 Agents | 1:22 to 1:44 | 22 s | Drift Reviewer answers with the state and the reason; a coding agent calls `find-docs-for-path` and `check-page-freshness` over MCP | Explanation | Real |
| P4 Review | 1:44 to 2:06 | 22 s | The review panel: why it flagged, the affected step, the rename quick fix; a drafted fix accepted; Verified; the agent now says safe to cite | Explanation, ending on the snap back | Real |
| P5 Scale | 2:06 to 2:14 | 8 s | A Jira epic closed as Won't do flags a design page; the space dashboard; "Track in Jira" | Standard | Real |
| A4 Close | 2:14 to 2:30 | 16 s | Back to 3am: this time the page and the agent both say so before step 2. Logo, tagline, credit line | Hold | Designed, one real crop |

The order inside "how it works" puts the agents before the review on purpose. The agents must see the page while it is flagged, and the Agents and MCP bonus is our headline, so it lands at 1:22, not at the end.

### 7.4 Draft script

A draft for Razvan to edit. 26 lines, 274 words, about 113 seconds of speech at the rate `eleven_v4` read in the Satchel film (about 13 characters per second), which leaves 37 seconds of air. Every fact a line carries is also on screen, because judges may watch muted.

| Line | Act | Voice | On screen |
| --- | --- | --- | --- |
| | A0 | (real voice) "Bad documentation or outdated documentation is worse than no documentation." | Captions: The code moved. / The docs didn't. / The agents can't tell. |
| V00 | A0 | That's why we built Doc Drift Sentinel. | The same words, on black |
| V01 | A0 | Docs that know when the code moved. | Mark, name, tagline |
| V02 | A1 | It's 3am. Payments is down. | A generic alert: "SEV-2 · payments-api · error rate 14%" · 03:07 |
| V03 | A1 | The runbook says to run rollback.sh. | The runbook, step 2: `./scripts/rollback.sh` |
| V04 | A1 | That script was renamed last week. | Terminal: `no such file or directory`. A diff ghosts in: `rollback.sh → rollback-v2.sh` |
| V05 | A1 | The page still looks fine. It was reviewed a month ago. | "Last reviewed 34 days ago" with a tick. Card: "A date can't see a merge." |
| V06 | A1 | Ask an AI agent, and it reads you the same step, with confidence. | An assistant answer quoting step 2, citing the runbook |
| V07 | A2 | Doc Drift Sentinel anchors each Confluence page to the code and Jira work it describes. | The page on the left; anchor lines to `payments-api: scripts/rollback.sh`, `deploy/helm/**`, `PAY-142` |
| V08 | A2 | When those change, the page is flagged: Possibly stale. | The 3 bands: the middle one slips amber. Badge: Possibly stale |
| V09 | A2 | And every agent that reads it is told the same. | A line from the badge to a Rovo chip and a terminal chip: `status: possibly_stale` |
| V10 | A2 | Anchor. Flag. Tell the agents. Then a person decides. | The 4 words set one by one. Small line: "For teams who keep runbooks in Confluence" |
| V11 | P1 | Open any page. Doc Drift reads the paths and Jira keys already on it, and suggests anchors. | Real: the badge reads Unanchored; the Anchors tab with suggestions ticked |
| V12 | P1 | Save, and the page is Verified. | Real: "Save anchors and mark verified"; the badge. A 2-second flash of "Anchor this space" on the dashboard |
| V13 | P2 | Now Sam merges a pull request that renames the rollback script. | Real: Bitbucket, PR #482, Merge |
| V14 | P2 | 11 seconds later, the runbook is flagged, with the exact change. | The timer; whip to Confluence; real: the badge now Possibly stale; tooltip "PR #482 changed scripts/rollback.sh ... Review." |
| V15 | P2 | No AI made that call. Same change, same result, every time. | Card: "Deterministic matcher · 0 AI calls". Small: "Our eval set: 40 scenarios, 0 false flags, 2 known misses" |
| V16 | P3 | Ask Drift Reviewer, our Rovo agent, how to roll back. | Real: Rovo, Drift Reviewer selected, the question typed |
| V17 | P3 | It doesn't repeat the old step. It says the page is Possibly stale, and why. | Real: the answer, punched in on "Possibly stale" and "PR #482 renamed" |
| V18 | P3 | Coding agents get the same signal over MCP: which pages describe this file, and which ones to trust. | Real terminal: `find-docs-for-path` (5 pages, 2 Possibly stale), then `check-page-freshness` with `guidance`. Small: "Agents read as you. They never edit a page." |
| V19 | P4 | Dana owns the runbook. She gets one comment, and opens the review. | Real: the footer comment; the review panel opens |
| V20 | P4 | A rename gets a one-click fix, with no AI. | Real: the why sentence, the affected step, the rename quick fix: `rollback.sh → rollback-v2.sh` |
| V21 | P4 | For anything bigger, Drift Reviewer drafts the edit, and nothing changes until she accepts. | Real: a draft as a diff; Accept fix; the page history line "Doc Drift: accepted proposal for PR #482" |
| V22 | P4 | Verified. Now the agent can cite it. | The snap back. Real: badge Verified; `guidance: "Safe to cite."` |
| V23 | P5 | Jira changes count too. And every space gets a drift dashboard. | Real: `PAY-142` moved to Won't do flags a design page; the dashboard, "sample data from the demo space"; "Track in Jira" |
| V24 | A4 | Next time it's 3am, the runbook tells you, and your agent, before step 2. | The alert again; the runbook with the amber badge; the agent's caveat |
| V25 | A4 | Doc Drift Sentinel. Catch the slip before your agents do. | Lockup, tagline. Small: "Built on Atlassian Forge for Codegeist 2026 · Nano Soft" |

Notes on the script:
- V14's number is whatever the recorded take measures. If it is not 11, the line changes.
- V13 and V19 name Sam and Dana (decision 6). Without a second account they become "a teammate" and "the page owner".
- "rollback.sh" needs a pronunciation check ("rollback dot S H"). `eleven_v4` has no SSML; spell it for the model if needed.
- A2 is where the film says who it is for and how it differs from review-by-date tools. Keep the card "A date can't see a merge." in V05: it is the one-line answer to Recheck and to native Verified.
- Lines not used and held in reserve: "Not by age. By change." and the vision line "Docs that agents can trust, because they know when to stop trusting them."

### 7.5 Real, mock or designed

| Shot | Kind | Why |
| --- | --- | --- |
| Alert, the 3am runbook step, terminal error, generic assistant answer (A1) | Mock, in our house style on Night | They set a scene; they are not our product. They must not look like Slack, PagerDuty, incident.io or any real chat product |
| Anchor picture, 3 bands, spine, stat cards, timer, end card | Designed | Ours |
| Badge states, Anchors tab, review panel, comment, page history, dashboard, settings | **Real recordings and 2x stills** | The rules ask for footage of the project working |
| Bitbucket merge | Real | Atlassian's own product; allowed |
| Drift Reviewer in Rovo | Real | The Agents bonus rests on it |
| Coding agent over MCP | Real terminal, cropped to the tool calls, no product logo | The MCP bonus rests on it |
| Architecture (2 apps, relay, matcher) | Left out of the film | It belongs in the Devpost text. A 5-second version can follow the end card if Razvan wants it |

Layout references for the two mock cards, for structure only: incident.io's alert detail (https://mobbin.com/screens/6fb88e63-4dac-4c02-851b-50c37841c7c6) and Remote's agent answer with its "Related articles" list (https://mobbin.com/screens/49c17891-842e-4895-8ee5-4b3201db3879).

---

## 8. Capturing the real product

### 8.1 Set-up

- **Where:** the demo site (https://one-atlas-jzzf.atlassian.net), space PLAT, the "Payments rollback runbook" page (2720100), repo `nano-soft-dev/payments-api`, Jira project PAY. Final captures on the production install (decision 7).
- **Browser:** the dedicated Chrome profile with remote debugging on port 9222 (it is logged in to both sites). Window at 1920x1080 CSS pixels with a device scale factor of 2, Confluence in light theme, bookmarks bar hidden, zoom 100%.
- **Clean frame:** no personal avatars or other spaces in view. Crop to the content column and the byline where possible, and rebuild a plain browser frame in Remotion instead of filming Chrome's own.
- **State reset:** each take starts from a known state: anchors removed (Unanchored), or the page re-verified. On development the dev driver has `refresh-all` and `replay`, and the QA scripts in `scripts/qa/` show how to drive it. **Production has no dev driver**, so resets there go through the UI (remove anchors, Mark verified) and the demo replay button in settings. Removing the runbook's anchors changes the PLAT numbers (18 of 24 anchored); restore them after the takes. The comment delay is set to 0 for takes.
- **Do not inject CSS into the product to make it look better.** Satchel hid a fixture banner and said so. Here the footage is evidence, so film what ships. Cropping is fine.

### 8.2 Recordings and stills

| ID | What | How |
| --- | --- | --- |
| R1 | Badge Unanchored, click, Anchors tab with suggestions, tick, save, badge Verified | Recording and stills |
| R2 | Bitbucket: the pull request page, click Merge, merged state | Recording |
| R3 | Confluence: the runbook's byline changing to Possibly stale after the merge (reload), the tooltip | Recording, with the real elapsed time noted |
| R4 | The footer comment that mentions the owner | Still |
| R5 | Rovo: Drift Reviewer, the question, the streamed answer | Recording |
| R6 | Terminal: a coding agent calling `find-docs-for-path`, then `check-page-freshness` | Recording, dark terminal, large font, cropped |
| R7 | Review panel: why sentence, affected sections, rename quick fix, apply | Recording and stills |
| R8 | Propose fix: the draft in the panel, Accept fix, page history showing the version message | Recording and stills |
| R9 | Badge back to Verified; `check-page-freshness` returning "Safe to cite." | Still and a short recording |
| R10 | Jira: an anchored epic moved to Won't do; the page anchored to it flagged (pick the page in PLAT; the fixture is `jira-01-epic-done-wont-do-beat`) | Recording |
| R11 | Space dashboard; "Anchor this space"; "Track in Jira" with the created task | Stills |

- Record at 60 fps and 2x, with the real cursor hidden, then transcode to constant-frame-rate H.264 before importing (macOS recordings are variable frame rate, often HEVC, which `<Video>` does not take): `ffmpeg -i in.mov -vf "fps=60" -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -g 30 -an -movflags +faststart out.mp4`. That command is a recommendation, not vendor guidance.
- Take a 2x PNG of every state as well. Punch-ins beyond 1.6x use the still, not the video.
- Keep a `captures.json` manifest: file, date, app version, environment, page, what it shows. Captures must be replaceable without touching scene code, because the first build will use development captures and the last will use production ones.
- Speed changes are normal and should be honest: when the film compresses the wait in R3, the on-screen timer still shows the real seconds.

### 8.3 Two things to test before relying on them

1. **Plain Rovo Chat repeating the old step (V06).** If, on the demo site, plain Rovo answers "How do I roll back payments-api?" from the flagged runbook without a caveat, a real recording of that is the strongest possible shot for act 1. If it does not reproduce, or is unreliable, use the generic mock. Never stage it.
2. **Burning pull request numbers up to 481 (decision 5).** Open and decline a pull request from one scratch branch in a loop; each new one takes the next id. Check on 3 first that declined PRs send the relay nothing, and that the counter behaves as expected.

---

## 9. Sound

| Layer | Plan |
| --- | --- |
| Narrator | `eleven_v4`, one voice, per-line takes with `previous_text` and `next_text` so the read flows, `/with-timestamps`, then forced alignment on the final audio for caption timing. 3 auditions first (decision 3). The voice should match the brand: calm, specific, on watch |
| Real voice | One CC BY clip in the cold open, unaltered apart from the trim |
| Cold-open bed | Designed from sound effects on the grid (sub pulse, ticks that double each bar, hits on the slams, a riser, a 6-frame suck-in to a dead stop). Frame-exact, and free of the music-plan question |
| Score | `music_v2_5` (pass `model_id`; the API default is still the deprecated `music_v1`). There is no BPM parameter: put "120 BPM" and the key in the styles, generate with slack, measure with `beats.mjs`, and cut on bar lines. Cues: M1 reveal and tagline, M2 the 3am scenario (sparse, low), M3 the solution (lift), M4 how it works (a steady groove that thins under dense UI), M5 the snap back and close |
| Signature sounds | **The slip**: a short mechanical slide and a soft latch. **The snap back**: the same in reverse, brighter. They are the only sounds the brand owns; use them on every badge change and nowhere else |
| Other effects | `eleven_text_to_sound_v3` (pass `model_id`). Whooshes peak on the cut frame; impacts land exactly on the frame; UI ticks on the frame the state changes. Glitch sounds only in the barrage |
| Mix | Voice on top. Score about 18 dB under speech, ducked 6 frames in and 12 out. Effects about 6 dB under the voice. Master to -14 LUFS integrated and -1 dBTP with two-pass `loudnorm`. Remotion does no loudness processing |
| Sound-off | Every fact is on screen. Burn in captions for the narration and upload an .srt as well |

---

## 10. Generated images

The brand says: show the product, with UI crops, diff fragments and charts; no stock photos, people at laptops, robots or eyes. That leaves GPT Image 2.6 a small job.

| Use | Verdict |
| --- | --- |
| Problem-world still lifes for the barrage and act 1, with no people: a monitor in a dark room with a sticky note reading "step 2 is out of date, ask Sam"; a printed runbook with a handwritten correction | Worth trying. It is the human workaround for stale docs, readable in half a second. 2 or 3 images, graded like the other plates |
| Texture plates: paper grain, a soft light sweep, tide-line variations | Optional. Tide lines are better as SVG in code |
| The YouTube thumbnail background | Optional. The mark itself always comes from `brand/logos/`, never from a generator |
| Anything that looks like a real product's UI, a real post, a logo, or a real person | Never. And no generated image is ever presented as a real screenshot |

Facts for the implementer (appendix section 3): model ids `gpt-image-2.6-flare` (fast) and `gpt-image-2.6-sunburst` (precise edits); Image API only; same token prices as 2.5; new `complexity` parameter, `markup`-guided edits, and `svg` and `gif` output that may be gated. Confirm the key can call 2.6 with `GET /v1/models` before planning around it. OpenAI's usage policies page could not be opened today.

---

## 11. Tools and pipeline

| Topic | Fact or recommendation |
| --- | --- |
| Project location | A new `video/` folder at the repo root, beside `site/`. Keys in `video/.env`, git-ignored. Never the repo-root `.env` (it holds Bitbucket and Atlassian tokens) |
| Remotion | Pin **4.0.543** for `remotion` and every `@remotion/*` package. No Remotion 5 exists. Run `npx remotion skills add` in the project: the local `remotion-best-practices` skill is from February and predates effects and HtmlInCanvas |
| Effects | Built-in effects now default to WebGPU, then WebGL2. The Satchel barrage shader declares `backend: 'webgl2'`, which is still supported. Set `Config.setPreferredEffectBackend('webgl2')` to get the measured behaviour, render WebGL with `--gl=angle`, and keep one full-frame pass for the whole barrage |
| New and useful | `@remotion/mac-cursors` (`<MacOSCursor>`), `magnify()`, `<Sequence freeze>` and `playbackRate`, `cropLeft` and friends on `<Video>`, `region-blur` for private data. `trimAfter` is deprecated in favour of `durationInFrames`. `@remotion/light-leaks` is deprecated |
| Screen recordings | `<Video>` from `@remotion/media` for constant speed. A smooth speed ramp still needs `<OffthreadVideo>`. There is no official auto-zoom or cursor package: script the zoom keyframes and the cursor |
| Render | H.264, `--crf=16`, `--x264-preset=slow`, `--color-space=bt709`, AAC 320k, then two-pass loudness. Consider `--scale=2` for a 4K upload so UI text stays sharp |
| Reuse from Satchel | `tools/lib/{http,env,eleven,openai-image}.mjs`, `tools/beats.mjs`, `tools/audio-v3/*`, `tools/sfx2/*`, `tools/render-master.sh`, `scenes/H0/qa/flashcheck.py`, the barrage shader and looks (`scenes/H0/fx/*`), the motion kit (`src2/motion/*`, `lib/time.ts`). Appendix section 4 lists each with the change it needs: the helper defaults for SFX, STT, music and image models are all stale. Satchel's `package.json` says AGPL-3.0-only; Razvan owns both, but decide the licence of what is copied |
| ElevenLabs | Narration `eleven_v4`; effects `eleven_text_to_sound_v3`; music `music_v2_5`; transcripts `scribe_v3`. Free checks first: `GET /v1/user/subscription` and `GET /v1/models` |
| Disclosure | YouTube asks for disclosure of realistic altered content; a motion film with an AI narrator is not clearly in scope. Answer the upload question truthfully and add one line to the description: "Narration and music generated with AI tools." |
| Third-party plates in git | Commit only the openly licensed plates (with attribution). Keep everything else out of the repo: it goes public on Dec 19 |

---

## 12. Quality checks before release

1. **Claims ledger.** One table: every on-screen number and every narrated claim, with its source. Nothing ships without a row.
2. **Rights manifest.** `plates.json` and `CREDITS.md`: every third-party item with URL, date read, exact text, licence or tier, and blur list. A dated screenshot of each CC licence field.
3. **Words.** Scribe transcript of the final mix compared with the script; captions timed by forced alignment; every quote compared character by character with its source.
4. **Flashes.** `flashcheck.py` on every render of the cold open (WCAG 2.3.1: at most 3 flashes in any second). The reveal is the film's one big change of light. The script is a screen, not a sign-off; run PEAT on the master.
5. **Frame-by-frame review.** Three passes over the rendered film, as in Satchel's `script/QA-BRIEF-v5.md`: broken animations, things too close in time (a caption needs 0.8 s plus 0.25 s per word, still), overlaps, and every scene cut.
6. **Reading test.** Watch at phone size with the sound off. Then with the sound on and the picture hidden.
7. **Brand.** One amber element per shot; state names with word and icon; the mark only from `brand/logos/`; no Atlassian blue near it; no product called by a banned name.
8. **A human listens.** To the real clip before it is chosen, to the 3 narrator auditions, and to the final mix. Satchel shipped a mix nobody had listened to and said so; do not repeat that.
9. **Upload.** Public on YouTube, captions attached, the description carrying credits, the AI line, and a no-affiliation line for any product named. Upload at least a day early: processing takes time.

---

## 13. Suggested schedule

| When | What |
| --- | --- |
| Nov 14 to 18 | Razvan's decisions. Script locked. Narrator auditions and the real clip, by ear. Licence checks (decision 8). Project scaffold with the Satchel tools updated to today's model ids |
| Nov 19 to 25 | Capture and log the barrage plates. Animatic of the whole film with development captures and scratch voice, on the bar grid |
| Nov 26 to Dec 5 | Build: cold open, then acts in order. Score and effects. First full render |
| Dec 8 to 12 | Production deploy lands (share links are due Dec 12). Final captures on production. Swap them in |
| Dec 13 to 17 | The three review passes, fixes, final mix, master |
| Dec 18 to 19 | Upload unlisted, check on phone and desktop, then public. Feature freeze is Dec 18; submission Dec 21 |

---

## 14. Not verified, and open leads

- **No audio has been heard.** Clip quality, the uncertain word in Khirnov's line, and every timestamp come from transcripts.
- **Capture details were read from page text, not rendered pages.** Light or dark, whether text is visible without expanding, and which MoJ banner shows must be confirmed at capture. Atlassian Community and its Jira tracker render client-side.
- **Blocked today:** reddit.com, VentureBeat (bot check), Gartner, The New Stack, TechRepublic, OpenAI's policy pages, one ElevenLabs help article. Items that depend on them are marked in the appendices and are not in the plan above.
- **Codegeist winners' videos** were found on YouTube by title; that each is the submitted video is not confirmed. None of the reference videos was watched: what is known about them comes from transcripts and metadata.
- **GPT Image 2.6 on this key**, its gated formats, and whether size and transparency rules carry over from 2.5: one free call and 3 cheap ones settle it.
- **ElevenLabs:** the account's plan and whether its music terms cover a company; whether `speed` does anything on `eleven_v4`; whether the tier allows 48 kHz WAV.
- **Remotion on 4.0.543:** nothing from Satchel has been typechecked or rendered against it. Whether `--gl=angle` still changes anti-aliasing in non-GL scenes decides if the split render is still needed.
- **Speaker roles** in the clip table are from titles and descriptions, not bio pages.
- **Leads not followed:** CCC, USENIX, GopherCon and government talk archives for more CC clips; an open-source "Screen Studio effects" library for auto-zoom maths.
