# Launch video research: reusable voice clips, reference videos, rights

> **Appendix to [../research.md](../research.md).** A research log written by a sub-task on 2026-11-13 and kept as delivered. **Two things it marks UNVERIFIED are now verified:** the main session read https://codegeist2026.devpost.com/rules in a real browser the same day. The third-party-material sentence, the fix-it clause and the Presentation criterion are exact as quoted here, and the judging line is **"Judges are not required to watch beyond five minutes"** (not three). The CC BY licence fields of clips A1 (Addy Osmani) and A3 (Mikey Ariel) were also re-read on YouTube. Nobody has listened to any clip yet.

Researched 2026-11-13 for the Doc Drift Sentinel launch video (Codegeist 2026). Web research only. No media was downloaded.

## How to read the labels

- **VERIFIED**: I opened the page or the video's metadata today and read it.
- **VERIFIED (listing)**: title, channel and length come from a YouTube search listing. I did not open the video page.
- **VERIFIED (transcript)**: I read the machine transcript (YouTube auto-captions, or FOSDEM's own .vtt file). I did **not** listen to the audio. Wording can contain recognition errors and timestamps are approximate (about half a second for YouTube word timings, 1 to 3 seconds for FOSDEM cue timings). Check every cut by ear before using it.
- **UNVERIFIED**: search-engine excerpt, a third-party copy, or my memory. Not confirmed on the primary page.

## Limits you should know first

1. **Devpost blocks automated reads.** `codegeist2026.devpost.com/rules`, the overview page and every `devpost.com/software/...` project page returned HTTP 403. All Codegeist rule wording below is from search-engine excerpts of the official page, so it is UNVERIFIED. Read the live rules page in a browser before relying on the exact words.
2. **I could not watch any video.** For reference videos I report length, channel, the opening and closing lines of the transcript, and whether there is a spoken track at all. I say nothing about colour, type or motion that I could not read from text. "No voiceover" means YouTube had no caption track, or the auto-captions contained only "[Music]".
3. **YouTube rate-limited the transcript reads** (HTTP 429) after about 500 requests. Of roughly 1,000 Creative Commons candidates found by search, I read transcripts for about 215. There are certainly more usable lines out there.
4. **Licence evidence for YouTube clips** is the video's own licence field, which read "Creative Commons Attribution license (reuse allowed)". I read it from the video metadata (the same field the watch page shows under "License"). Take a dated screenshot of the watch page for each clip you use; uploaders can change the licence later.
5. My working cache in this folder was removed by another process partway through, so the raw transcript files are not kept. Every quote below was copied before that happened or re-read afterwards. Two first-pass items could not be re-read; they are marked.

---

# A. Voice clips we may reuse

## A.1 Shortlist (my ranking)

| # | Line | Speaker | Licence | Why |
|---|---|---|---|---|
| 1 | "Quality context determines if agents succeed or fail." | Addy Osmani | CC BY (YouTube) | States the agent half of our pitch in 4 seconds, clean studio-style delivery, known name |
| 2 | "Nobody ever documents things, and if you do, it will get out of date eventually, because somebody changes the code and doesn't update the documentation." | Anton Khirnov, FOSDEM 2025 | CC BY 2.0 BE (FOSDEM) | States our exact mechanism: code changes, page does not |
| 3 | "Bad documentation or outdated documentation is worse than no documentation." | Mikey Ariel, foss-north 2019 | CC BY (YouTube) | Short, absolute, quotable; she adds "I will say this now and I will stand by it" |
| 4 | "The LLM answer was wrong ... the problem was in the documentation, because the documentation was wrong." | Marco Castelluccio (Mozilla), FOSDEM 2025 | CC BY 2.0 BE (FOSDEM) | The only clip found that joins both halves: AI wrong because the doc was wrong. Needs a tight edit |
| 5 | "The docs are lies, because they're not true." | Mariatta Wijaya, PyCon Thailand 2021 | CC BY (YouTube) | Punchy, but "lies" conflicts with our honest-wording rule (see caveat) |

If only one clip is used, I would take **#1 for an agent-led cold open** or **#2 for a code-led cold open**. #3 is the safest all-rounder.

## A.2 Reusable candidates in full

### A1. Addy Osmani, "Stop Wasting Tokens: The Art of Context Engineering"
- **Speaker:** Addy Osmani, engineering leader at Google (exact current title not checked, UNVERIFIED). Published on his own channel.
- **Event / year:** talk recording, uploaded 2025-09-11. Length 14:12. VERIFIED (metadata).
- **URL:** https://www.youtube.com/watch?v=zMM5zqesL1g
- **Licence:** "Creative Commons Attribution license (reuse allowed)". VERIFIED in the video's licence field, read twice today.
- **Quote A (about 4 s), 13:55 to 13:59.5:** "Quality context determines if agents succeed or fail."
- **Quote B (about 9 s), 13:50.9 to 13:59.5:** "So in conclusion, remember it's not the prompt, it's the context. Quality context determines if agents succeed or fail."
- **Quote C (about 2 s), 13:44 to 13:47:** "Garbage in, garbage out." (said right after "And filter irrelevance.")
- Timestamps from YouTube word timings. VERIFIED (transcript), approximate.
- **Why it fits:** it is about AI agents and the context they read, which is the headline of our pitch and of the Agents / MCP bonus. A stale page is bad context.
- **Caveats:** he talks about context in general, not stale documents. Do not caption it as if he were describing our problem; let our next card make the link. He works at Google, which is not an Atlassian competitor in this space but is a large brand: credit by name only, no employer logo. The video description says "In this talk, I reveal how to make every token count so your AI agents stop hallucinating" (VERIFIED), so the audio may be a narrated talk with slides.

### A2. Anton Khirnov, "Multiview decoding in libavcodec and ffmpeg CLI"
- **Speaker:** Anton Khirnov, FFmpeg developer (name VERIFIED on the FOSDEM page; role from the talk topic).
- **Event / year:** FOSDEM 2025, Open Media devroom, room K.3.401, Sunday 2 February 2025, 13:00 to 13:40. VERIFIED.
- **Talk page:** https://archive.fosdem.org/2025/schedule/event/fosdem-2025-6023-multiview-decoding-in-libavcodec-and-ffmpeg-cli/
- **Video file:** https://video.fosdem.org/2025/k3401/fosdem-2025-6023-multiview-decoding-in-libavcodec-and-ffmpeg-cli.mp4 (not downloaded)
- **Licence:** the talk page footer reads "This work is licensed under the Creative Commons Attribution 2.0 Belgium Licence." VERIFIED. The video archive index (https://video.fosdem.org/2026/) carries the same sentence. VERIFIED.
- **Quote (about 9 s), 10:39 to 10:48:** "Of course, nobody ever documents things, and if you do it, it will get out of date, eventually, because somebody [changes] the code and doesn't update [the] documentation."
- **Tight cut (about 5 s), 10:39 to 10:44:** "Nobody ever documents things, and if you do it, it will get out of date."
- He continues at 10:48 to 10:52: "So documentation helps a little, not that much."
- From FOSDEM's machine transcript (.vtt). The transcript prints "somebody dazed the code and doesn't update their documentation"; "changes" and "the" are my reading. VERIFIED (transcript), check by ear.
- **Why it fits:** it is our detection rule said out loud by a working maintainer: the code changed, nobody updated the page.
- **Caveats:** he is talking about C struct fields inside FFmpeg, and says it with a laugh ("surely this will fix it, haha" comes just before). Room microphone, so audio quality is unknown. FOSDEM does not publish to YouTube any more (their FAQ says so, VERIFIED), so the source is the FOSDEM file.

### A3. Mikey Ariel, "Docs or it didn't happen!"
- **Speaker:** Mikey Ariel, documentation and community lead (was at Red Hat at the time; employer UNVERIFIED from memory).
- **Event / year:** foss-north 2019 (Gothenburg). Uploaded 2019-04-19 by the foss-north channel. Length 44:42. VERIFIED (metadata).
- **URL:** https://www.youtube.com/watch?v=Rq98-audaEc
- **Licence:** "Creative Commons Attribution license (reuse allowed)". VERIFIED (licence field, read twice).
- **Quote (about 5 s), 16:22.5 to 16:27.5:** "Bad documentation or outdated documentation is worse than no documentation."
- **With the tag (about 8 s), to 16:30.5:** "... I will say this now and I will stand by it."
- She goes on (16:30 to 16:37): "because the time that you waste trying to follow outdated or wrong documentation is much worse than when you're hitting a search and you can't find anything."
- VERIFIED (transcript).
- **Why it fits:** one clean sentence, strong opinion, no jargon. Works over a barrage of screenshots.
- **Caveats:** 2019, so it predates AI agents; our next card has to add "and now agents read it". She says "worse than no documentation", which we should not turn into "your page is wrong".

### A4. Marco Castelluccio, "Using LLMs to support Firefox developers with code review"
- **Speaker:** Marco Castelluccio (name VERIFIED on the FOSDEM page; the page says Mozilla ran the experiments).
- **Event / year:** FOSDEM 2025, main track, room K.1.105, Saturday 1 February 2025, 11:00 to 11:50. VERIFIED.
- **Talk page:** https://archive.fosdem.org/2025/schedule/event/fosdem-2025-6422-using-llms-to-support-firefox-developers-with-code-review/
- **Video file:** https://video.fosdem.org/2025/k1105/fosdem-2025-6422-using-llms-to-support-firefox-developers-with-code-review.mp4 (not downloaded)
- **Licence:** "This work is licensed under the Creative Commons Attribution 2.0 Belgium Licence." VERIFIED on the talk page.
- **Quote (about 16 s), 30:37.8 to 30:53.6:** "the LLM answer was wrong because it got the offsets wrong, but then we actually found that the problem was in the documentation, because the documentation was wrong."
- **Tight cut (about 6 s), roughly 30:45 to 30:51:** "the problem was in the documentation, because the documentation was wrong."
- He repeats it at 30:53 to 31:00: "there are many other cases where actually the LLM is wrong, but in this specific case ... the documentation was wrong."
- VERIFIED (transcript), cue-level timing only.
- **Why it fits:** a real team, a real AI assistant, and the root cause was a wrong doc. This is the story of our product in one sentence.
- **Caveats:** long sentence, non-native delivery, and the best 6 seconds lose the word "LLM". Options: use a two-part cut ("the LLM answer was wrong" + "the documentation was wrong") and say in the credit that it is trimmed, or put the full sentence on screen as text while the audio plays. He is describing one case among many; he also says the LLM is often wrong by itself. Do not present it as "AI errors come from docs".

### A5. Mariatta Wijaya, "Building a Culture of Documentation by Learning from Open Source Community"
- **Speaker:** Mariatta Wijaya, Python core developer (role from memory, UNVERIFIED; the description says "in my 15+ years of working in the tech industry", VERIFIED).
- **Event / year:** PyCon Thailand 2021. Uploaded 2021-12-12. Length 56:12. VERIFIED (metadata).
- **URL:** https://www.youtube.com/watch?v=Ah9-lR6z6u4
- **Licence:** "Creative Commons Attribution license (reuse allowed)". VERIFIED (licence field, read twice).
- **Quote (about 11 s), 12:54.5 to 13:06:** "nobody went back and update the docs. So the docs are incomplete and outdated. The docs are lies, because they're not true."
- **Tight cut (about 4.5 s), 13:01.5 to 13:06:** "The docs are lies, because they're not true."
- **Other cut (about 6 s), 12:35.5 to 12:41.5:** "we have various docs that are outdated and no longer true."
- VERIFIED (transcript). The auto-captions print "dogs" for "docs".
- **Why it fits:** "nobody went back and updated the docs" is the cause; "no longer true" is the effect.
- **Caveats:** "lies" is stronger than our own voice allows ("never say a page is wrong, only that its anchors changed"). It is her word, in quotes, about her own team's docs, so it is usable, but "outdated and no longer true" is closer to our tone. Remote-talk audio.

### A6. Omer Rosenbaum, "Continuous Documentation Manifesto"
- **Speaker:** Omer Rosenbaum, Swimm (title says "Omer Rosenbaum, Swimm", VERIFIED; he is its CTO, UNVERIFIED from memory).
- **Event / year:** on the CNCF channel, uploaded 2021-10-30 (KubeCon + CloudNativeCon North America 2021 period; exact event not stated in the part of the description I read). Length 18:20. VERIFIED (metadata).
- **URL:** https://www.youtube.com/watch?v=kXSHkdFfvss
- **Licence:** "Creative Commons Attribution license (reuse allowed)". VERIFIED (licence field, read three times).
- **Quote (about 12 s), 03:51.2 to 04:03.5:** "sometimes we find a document that's supposed to help us, just to find out that it's outdated, that the code has evolved and changed so much since this document was written that it's just no longer helpful."
- **Tight cut (about 7 s), 03:56 to 04:03.5:** "the code has evolved and changed so much since this document was written that it's just no longer helpful."
- Also 05:28 to 05:36: "documentation is lacking or often outdated, and therefore developers may not rely on the documentation at all."
- VERIFIED (transcript).
- **Why it fits:** names the cause (the code moved) and the effect (the page stopped helping).
- **Caveat (serious):** Swimm sells code-coupled documentation that detects when docs go out of sync with code. It is the nearest thing we have to a direct competitor. Quoting its CTO in our launch film invites the comparison. I would not use it.

### A7. Neel Shah, "LLMs for SRE & DevOps | ChatOps and AI Automation"
- **Speaker:** Neel Shah (role and employer not checked).
- **Event / year:** FOSSASIA Summit 2026. Uploaded 2026-05-06. Length 14:58. VERIFIED (metadata).
- **URL:** https://www.youtube.com/watch?v=iIKXYwVbVS8
- **Licence:** "Creative Commons Attribution license (reuse allowed)". VERIFIED (licence field, read three times).
- **Quote A (about 2 s), 00:46.6 to 00:48.6:** "Next is stale runbooks."
- **Quote B (about 6 s), 01:04.8 to 01:10.8:** "We create a whole runbook. So that runbook is stale, because the version is changed now."
- VERIFIED (transcript).
- **Why it fits:** the only runbook line found under a reusable licence, from 2026, in a talk about LLMs for on-call. The description says "On-call teams often face alert storms, scattered logs, and outdated runbooks" (VERIFIED).
- **Caveats:** the grammar is loose and Quote A is a list item, not a statement. Usable as a 2-second stab inside the barrage, weak as the one voice.

### A8. Manny Silva, "Docs as Tests: A strategy for resilient documentation"
- **Speaker:** Manny Silva, author of the Docs as Tests approach (employer not checked).
- **Event / year:** Write the Docs meetup, uploaded 2024-08-05 on the "Write The Docs Podcast & Meetups (WTD)" channel. Length 28:58. VERIFIED (metadata).
- **URL:** https://www.youtube.com/watch?v=A0M8LlVjNYk
- **Licence:** "Creative Commons Attribution license (reuse allowed)". VERIFIED (licence field, read twice).
- **Quote (about 11 s), 07:53 to 08:04.5:** "every time you have a bit of your documentation that is outdated, screenshots are old, procedures broken, that degrades user trust, and it's death by a thousand cuts."
- **Tight cut (about 3.5 s), 08:01 to 08:04.5:** "that degrades user trust, and it's death by a thousand cuts."
- Just before (07:48): "trust is hard to earn and easy to lose."
- VERIFIED (transcript).
- **Why it fits:** ties outdated docs to trust, which is the word our product is built on ("do not trust this page until a person re-verifies it").
- **Caveats:** he means end-user product docs, not internal Confluence pages. He maintains a docs-testing tool (Doc Detective), which is adjacent to us but aimed at public docs.

### A9. Anastasiia Tymoshchuk, "Continuous Documentation for your code"
- **Speaker:** Anastasiia Tymoshchuk (role not checked).
- **Event / year:** EuroPython 2021, talk on 2021-07-28, online. Uploaded 2021-09-27. Length 27:28. VERIFIED (metadata and description).
- **URL:** https://www.youtube.com/watch?v=S9U2gfk88Hg
- **Licence:** "Creative Commons Attribution license (reuse allowed)". VERIFIED (licence field, read twice). **Check before use:** I recall EuroPython stating CC BY-NC-SA for recordings in some years (UNVERIFIED memory). The first 420 characters of this description show no licence line; read the full description and the EuroPython site before relying on the YouTube field.
- **Quote (about 5 s), 13:29.5 to 13:34.5:** "Documentation cannot be out of date if you don't write any documentation."
- VERIFIED (transcript).
- **Why it fits:** dry joke, good as a light beat. Not a problem statement by itself.

### A10. Evan Rusackas, "How Apache Superset reinvented (and re-engineered) its world documentation"
- **Speaker:** Evan Rusackas (Apache Superset; the transcript host introduces "Evan Rusakis"; affiliation not on the page).
- **Event / year:** FOSDEM 2026, Tool the Docs devroom, room UD2.208, Saturday 31 January 2026, 16:30 to 16:55. VERIFIED.
- **Talk page:** https://archive.fosdem.org/2026/schedule/event/E7SWML-how-apache-superset-retooled-the-docs/
- **Video file:** https://video.fosdem.org/2026/ud2208/E7SWML-how-apache-superset-retooled-the-docs.mp4 (not downloaded)
- **Licence:** the talk page says "This work is licensed under the Creative Commons Attribution 4.0 International." VERIFIED. The video archive index for 2026 says "Creative Commons Attribution 2.0 Belgium Licence". VERIFIED. Both are attribution-only; credit under either.
- **Quote (about 12 s), 10:33.7 to 10:45.5:** "This was hand-edited stuff on the docs site until just a few days ago, honestly. It was out of date, some of these connection details were incorrect, and nobody could ever answer the question of how many databases do we support."
- Also 13:14.9: "Nobody knew it existed. Therefore nobody updated it."
- VERIFIED (transcript).
- **Why it fits:** an honest maintainer admission from this year. Too long and too specific for the cold open; fine for a blog post or the Devpost text.

### A11. Nikolas Martens, "Executable Documentation for everyone (even you)"
- **Event / year:** FrOSCon 2014. Uploaded 2014-08-24 by the FrOSCon channel. Length 55:24. VERIFIED (metadata).
- **URL:** https://www.youtube.com/watch?v=5j42QvDMCjg
- **Licence:** "Creative Commons Attribution license (reuse allowed)". VERIFIED (licence field, first pass).
- **Quote (about 6 s), 05:08 to 05:14:** "So yeah, outdated documentation. Anybody ever had the problem of outdated documentation?"
- Before it (04:56 to 05:07): "it was wrong, the code I put in the example was not right, because I just forgot to update some API changes I did."
- VERIFIED (transcript).
- **Why it fits:** a question to the audience works as a hook. 2014 recording quality is a risk.

### A12. Two more with a verified CC BY field, lower value
- **"The Documentation Dream: One Team, No Silos, Shared Goal", DevConf.CZ 2025** (DevConf channel, uploaded 2025-06-26, 38:43). https://www.youtube.com/watch?v=v7vfRqucQ28 . Licence field CC BY, VERIFIED (first pass). About 20:02: "when you have outdated documentation that takes too long to fix, it can damage the product reputation." VERIFIED (transcript, first pass; speaker names not captured and I could not re-read).
- **Chris Ward (Crate.io), "Explain Yourself! Documentation for Better Code"** (The Linux Foundation channel, uploaded 2017-04-04, 48:48). https://www.youtube.com/watch?v=pubm3spwkog . Licence field CC BY, VERIFIED (first pass). About 34:49: "two of the worst things you tend to find with documentation is ... out of date, or the code examples don't work." VERIFIED (transcript, first pass).
- **Write the Docs West Coast Supermeetup, 12 March 2026** (talks by Tom Johnson and Dave Nunez, per the description, VERIFIED). https://www.youtube.com/watch?v=X5XMqdxkf-A . Licence field CC BY, VERIFIED. 21:16 to 21:22.5, a writer quoting engineers: "telling me to my face, like, nobody's going to read this anyway, it's just going to go out of date." Which of the two speakers says it is not confirmed.

### Count
12 candidates with a verified attribution-only licence, of which 5 are strong (A1 to A5), 1 is strong but from a competitor (A6), and the rest are fillers. **None of them says "the AI will confidently give you the answer from a stale page" in one clean sentence.** A4 is the closest. If that exact line matters, record it yourself or use the reference-only Mintlify line as on-screen inspiration, not as a clip.

## A.3 Where the licence is clean and where it is not

- **FOSDEM** (VERIFIED): each talk page and the video archive index state an attribution-only Creative Commons licence (2.0 Belgium on the archive and on 2025 pages; 4.0 International on 2026 talk pages). FOSDEM 2025 and 2026 publish a machine transcript (.vtt) next to every video, about 2,000 talks, which I searched in full. 2024 and earlier have no transcripts.
- **YouTube channels where the videos I checked carried the CC BY field** (VERIFIED per video, not per channel): CNCF, The Linux Foundation, FOSSASIA, DevConf, Write The Docs Podcast & Meetups, PyCon Thailand, EuroPython Conference, foss-north, FrOSCon, Confreaks (RubyConf), DevOps Austin, Datastrato, dotconferences, WordPress TV, Linux.conf.au, Addy Osmani's own channel.
- **CC BY covers copyright only.** It does not cover the speaker's likeness as an endorsement, the conference logo on the lectern, or slides that contain third-party material. Use audio with a text credit, or crop to the speaker.
- **Not searched for lack of time:** media.ccc.de, USENIX SREcon, GopherCon, Strange Loop, NDC, and US or UK government talks. USENIX and NDC do not use CC BY by default as far as I know (UNVERIFIED).

## A.4 How to credit (attribution is the licence condition)

On the end card or in the YouTube description, for each clip: speaker, talk title, event and year, source URL, licence name and link, and "trimmed" if cut. Example:

> Voice: Addy Osmani, "Stop Wasting Tokens: The Art of Context Engineering" (2025), youtube.com/watch?v=zMM5zqesL1g, CC BY, trimmed. Use does not imply endorsement.

For FOSDEM: "FOSDEM 2025, CC BY 2.0 BE, video.fosdem.org".

## A.5 Reference only (standard licence, not reusable without permission)

1. **Han Wang (Mintlify co-founder), "Mintlify Autopilot: Self-updating documentation"**, 0:58. https://www.youtube.com/watch?v=HBHZe9zdbHs . 00:06.5 to 00:14.5: "When you have outdated docs, it gives outdated answers to your users, your team, and AI trying to understand your business." VERIFIED (transcript). Licence field not captured; treat as standard. This is the cleanest one-sentence statement of our problem that I found anywhere. It is from a neighbouring product (AI that rewrites docs), so it also shows how they frame it.
2. **Josh Gillies (Prefactor), "The Death of Documentation", AI Engineer Melbourne 2026.** https://conffab.com/presentation/the-death-of-documentation/ (recording behind Conffab's paid plans, no licence stated; VERIFIED). Lines from the transcript on that page: "documentation is often a rumor about how a system used to work"; stale docs are "poison for the context window". From his write-up (https://prefactor.tech/blog/the-death-of-documentation, VERIFIED): "Static docs rot and agents treat them as fact." and "An agent misled by stale docs ships the mistake."
3. **Atlassian, "Rovo: AI That Knows Your Company's Business"**, 1:06, Atlassian's channel. https://www.youtube.com/watch?v=B2lfNOXMDG8 . 00:51.7 to 00:57: "Imagine all that organizational memory, all that experience, all at your fingertips." VERIFIED (transcript). The sponsor's own promise; our film is the "unless that memory is stale" reply. Also the title of Atlassian's Team '26 platform keynote: "Close the AI context gap with data you can trust" (https://www.youtube.com/watch?v=NKUTWvOFbxM, 32:49, licence field empty = standard, VERIFIED; no captions were available so I have no quote).

A statistic seen in a search excerpt and worth chasing as a text card (UNVERIFIED, primary not opened): a Slite survey reporting that "76% had an AI tool surface a stale doc and produce a wrong answer" (https://slite.com/learn/dangers-of-stale-documentation).

---

# B. Reference videos

## B.1 Codegeist winners' videos

Winner lists are VERIFIED on Atlassian's blog: 2024 at https://www.atlassian.com/blog/developer/codegeist-2024-winners , 2025 at https://www.atlassian.com/blog/developer/meet-the-winners-of-codegeist-2025-atlassian-williams-racing-edition . The blog posts link to Devpost pages, not videos. Devpost pages are blocked, so I found the videos on YouTube by title. **I could not confirm that each YouTube video is the one embedded on Devpost.** Upload dates on or just before the deadline suggest they are.

| Project | Prize | Video | Length | First 20 to 30 seconds (from the transcript) |
|---|---|---|---|---|
| **Secure Notes for Jira** | 2025, 1st place Software Teams | https://www.youtube.com/watch?v=1FOlNEBFGfY (uploaded 2025-12-17) | 2:07 | One sentence on what it is ("enables communication between DevOps developers and security managers ... zero-trust encrypted communication channel"), then a persona: "Meet Alex, a DevOps who needs to share temporary credentials, API tokens, or incident details. Today, he faces a familiar challenge". Voiceover with music. Ends on a tagline: "Secure notes: encrypted by design, protected by the platform." |
| **FleetOps** | 2025, 1st place Specialized Industries; Best Rovo Apps | https://www.youtube.com/watch?v=yr0aXgIP_gI (uploaded 2026-03-10, after the results, so possibly a re-upload) | 4:59 | A person on camera in a skit: "Oh, hello. How's it going? ... this is our small fleet ... today we have time-sensitive deliveries and hopefully we don't get any delays." The description calls it "a fun real-world scenario". Ends: "this has been a demo for FleetOps for the Atlassian Codegeist. Thank you very much for watching and thank you very much for your consideration." |
| **Frank.** | 2025, 1st place Business Teams; Best Rovo Apps | Submission video not identified. Related: https://www.youtube.com/watch?v=dcdXt6e40JI (11:55, uploaded 2026-02-24, a two-person walkthrough: "So is this Frank?" "Yes, Greta. This is Frank.") and https://www.youtube.com/watch?v=t6p_9OfgVmo (2:10, uploaded 2026-10-06, no speech) | n/a | Conversation format: one person asks, the other shows. |
| **Images for Confluence** (Capable) | 2024, 1st place Teamwork Foundations | https://www.youtube.com/watch?v=U1x4ruzTCoY (uploaded 2024-12-10) | 5:00 | Founder to camera: "Hi, I'm James from Capable, we're thrilled to share our submission for Codegeist 2024". Problem by about 0:15: "finding specific images like logos or banners buried in Slack threads, Google Drive or scattered across hard drives". Ends inside a technical section on how the team develops and deploys. |
| **Apwide Booking** | 2024, 2nd place High-Velocity Service Management | https://www.youtube.com/watch?v=ZZG55qlaG6U (uploaded 2024-12-10; title says "Atlassian Codegeist Winner") | 4:48 | About 30 seconds of music and a sketch with no narration, then at 0:30: "Have you ever dealt with booking conflicts? If only there was an easy way for your teams to stay aligned. Oh wait, there actually is." Product named at 0:38. |
| **File Approvals for Jira** (Bebapps) | 2024, 2nd place Teamwork Foundations; Runs on Atlassian bonus | https://www.youtube.com/watch?v=ImzulZNTDp0 (uploaded 2024-12-10) | 5:00 | Straight voiceover from second 0: "File approvals is an app that gives Jira users the power to leave feedback on files". States the gap in the second sentence ("Jira comments ... don't have a way to add context that is needed when discussing files such as markup"). |
| **Issue Merger for Jira with Rovo agent** (Appsvio) | 2024, Connect to Forge bonus | https://www.youtube.com/watch?v=9EidDmHK5Wg (uploaded 2024-12-10) | 3:59 | Unscripted screen share from second 0: "hi, so today I wanted to share with you some practical insights to our new Rovo agent". Ends "that's basically the Rovo agent and Issue Merger in a nutshell." |

All rows VERIFIED (metadata and transcript); prize columns VERIFIED on the Atlassian posts. Not found on YouTube: Runbook Rabbit, Compass Whiteboard, Campaign Analyser (2024 first places), Sherlock Sync, AI Backlog for Jira, Graph Goose, Sync for Confluence (2025).

### What the winning videos have in common
1. **Voice-led.** All 7 that I could read are carried by a human voice (founder on camera, voiceover, or a two-person chat). None is a music-only motion piece. (Frank's later 2:10 "demo video" has no speech, but it was uploaded in October 2026 and is not the submission.)
2. **The problem is stated in plain words inside the first 15 to 30 seconds**, usually through one persona or one scenario ("Meet Alex", the fleet driver, "have you ever dealt with booking conflicts?").
3. **Real product UI for most of the runtime.** They are demos first. Motion design is light or absent.
4. **Long.** 4 of 7 run 4:48 to 5:00, right at the limit. The shortest winner (Secure Notes, 2:07) is also the most scripted and took first place, so a tight video is not a handicap.
5. **Low production polish is not punished.** One bonus winner is an unscripted screen share. Judges reward a clear use case and a working product.
6. **Several name other companies' products in passing** (Capable says "Slack threads, Google Drive" in the first 20 seconds of a first-place video). See section C.2 for what that tells us.
7. **Endings are plain**: a tagline, a thank-you, or a technical note. None ends on a call to action with a URL in the transcript.

**What this means for us:** a fast, designed film will stand out, but the "Presentation" criterion asks "Does the video clearly demonstrate the project working end-to-end?" (repo doc, from the rules excerpt). Keep the 8-second cold open, then a human voice, and make sure the real Confluence byline, review panel, Rovo answer and MCP call are on screen long enough to read. Put all of that before 3:00.

### This year's field (context, not winners)
YouTube already lists dozens of Codegeist 2026 entries, most between 0:55 and 5:00 and most narrated screen recordings. VERIFIED (listing). Several are close to our idea:
- "Recheck: stale page reviews for Confluence" (1:30), https://www.youtube.com/watch?v=r8cKsk3DrlA . Opens: "Wikis fill up with pages that were right once." Age-based staleness (last edited date), no code anchors. VERIFIED (transcript).
- "Ripple: keep official facts the same across Confluence" (3:18), "Decision Drift Guard" (2:46), "Continuity Check for Confluence and Jira" (1:42), "Claim Check: a Rovo agent that fact-checks launch pages against Jira" (2:53), "Context Confidence for Jira" (1:33), "Precedent: decision memory for Jira, Rovo & AI coding agents" (2:16), "TraceGuard: live, audit-ready traceability for Jira, Bitbucket and Rovo" (3:13), "Hindsight" (4:01). VERIFIED (listing only).

Our difference to say early: the trigger is a merged code change, and the page tells agents not to trust it.

### Official guidance on the demo video (exact lines)

**Codegeist 2026 judging criterion "Presentation"** (from the repo's rules doc, itself from a search excerpt of the rules page; UNVERIFIED against the live page): "Does the video clearly demonstrate the project working end-to-end? Does the pitch communicate what problem is solved, who it's for, and why it matters? Is the overall presentation easy to follow?"

**Atlassian, Codegeist 2025 kickoff livestream** ("Codegeist 2025: Atlassian Williams Racing Edition", Atlassian Developer channel, https://www.youtube.com/watch?v=ZzojFaRVYhg , about 7:26). VERIFIED (transcript): "when you create your demo video, have a think about how your presentation will address the following criteria. So how does the solution have impact? How is it going to help Atlassian users? Think about the idea. How original or creative is your idea? ... Next is your implementation. How well have you implemented the idea that you had? And finally, fit. How does the idea fit within the category?" And: "I'd also encourage you to think about what your Atlassian Marketplace listing would look like, even if you're not thinking about listing your app."

**Atlassian, "Panel Discussion: Expert Advice to build a winning Codegeist submission"** (Atlassian Developer channel, 2024-11-25, https://www.youtube.com/watch?v=NPzY_aN7wnE , 58:17 to 59:50). VERIFIED (transcript):
- "take a look at last year's submissions ... and look at the winning submissions ... it's not cheating ... it's a little bit of marketing I think as well, right, you have to really articulate what it does well and give a little glitter on it."
- "making sure that you're keeping in mind your user and your customer and writing the description and summaries around how you're solving a problem for that customer or user."
- "try to build all the documentation, the video, descriptions around the use cases you are trying to solve ... not the mechanics of it. Like, what the problem is it solving."

**2024 winners, "How To Win Atlassian Codegeist (from the 2024 winners)"** (Capable's channel, https://www.youtube.com/watch?v=a7QcD1E_m5w ). VERIFIED (transcript):
- About 42:17: "you should really spend some time doing good and easy screenshots and a good video, because you should stand out within the first seconds ... someone who is at least familiar with Jira and Confluence should understand very quickly what the app [does]."
- About 52:17: "spend time on the video. I think if you can, if you're comfortable, get a video with yourself in it, like demonstrating the product, because having a face to put to a project I think that definitely helps."
- The written version (https://www.gocapable.com/blog/how-to-win-atlassian-codegeist-from-the-2024-winners , VERIFIED): "A clear submission page, engaging video, and high-quality screenshots will significantly improve your chances." "Judges and users should be able to quickly understand what your app does and why it matters." "Consider making a short, well-edited video demonstration."

**Devpost, "6 tips for making a hackathon demo video"** (Stephanie Rochon, https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video ). VERIFIED:
1. "Plan your video early and give yourself enough time"
2. "Prepare a compelling script"
3. "Highlight what your project does, how it solves the problem, and how it works" ("Just focus on the most important information—what your project does, how it solves the problem, and how it works.")
4. "Use tools that are fastest for you to use"
5. "Keep your pitch clear and concise" ("Start the video with your elevator pitch.")
6. "Don't overlook technical details and video quality" ("Judges need to be able to clearly see, hear, and access your demo video.")

**Devpost help centre, "Know Your Submission Steps"** (https://help.devpost.com/article/126-know-your-submission-steps ). VERIFIED: "This is usually required! Your video must be hosted publicly on YouTube, or Vimeo to properly embed for the judges." and "Be sure to check the Hackathon Rules for any requirements regarding maximum video length."

**Codegeist "Lights, Camera, Action" updates** (https://codegeistunleashed.devpost.com/updates/28088-lights-camera-action-last-minute-submission-video-tips-for-hackers and https://codegeist.devpost.com/updates/33865-lights-camera-action-submission-video-tips-for-hackers ). Blocked; UNVERIFIED search summary: cover how the app uses Forge, how it fits the category and why the problem matters; script and rehearse to fit the limit; upload early because processing can take hours.

Note the tension: Devpost says "Start the video with your elevator pitch" and a 2024 winner says "stand out within the first seconds". An 8-second problem barrage satisfies the second. To satisfy the first, the product name and one-line pitch should land by about 0:12.

## B.2 Developer-tool launch videos, 2025 to 2026

Lengths VERIFIED (listing or metadata). Openings and endings VERIFIED (transcript) where a spoken track exists. I did not watch these, so the "copy this" points are about structure, script and sound, not about type or colour. All are standard licence: study, do not reuse.

| # | Video | Length | What the transcript shows | What to copy |
|---|---|---|---|---|
| 1 | **Mintlify, "Mintlify Autopilot: Self-updating documentation"** https://www.youtube.com/watch?v=HBHZe9zdbHs | 0:58 | Founder voice with music under it. Name at 0:00, problem in one sentence at 0:06 to 0:14, then "Imagine I'm a developer who just shipped a new feature". Ends "Now my docs are up to date. We built autopilot so you can ship docs as fast as you can ship products." | (1) Problem as one sentence with three victims: "your users, your team, and AI". (2) One first-person scenario, not a feature tour. (3) The last line answers the first line. It is also our nearest neighbour in message, so avoid sounding the same: they update docs with AI, we flag and withhold trust |
| 2 | **Cursor, "Introducing Cursor 3"** https://www.youtube.com/watch?v=UxbULt_hCdA | 1:31 | Team voiceover. Opens on a thesis, not the product: "Coding is changing and it's changing for the better." Product named at about 0:15. Ends on a vision line: "a world where agents really feel like colleagues". | (1) Open with a belief the viewer already holds. (2) Name the product only after the "why now". (3) End on where this goes, not on a feature |
| 3 | **Cursor, "Introducing Cursor 2.0"** https://www.youtube.com/watch?v=An8IM-kPyms | 1:05 | No caption track, so no voiceover: music and on-screen text only. Description: "Our first coding model and the best way to code with agents." | A full launch can run on type and UI alone in about a minute. If we do a silent social cut, 60 to 65 seconds is the proven length |
| 4 | **Linear, "Introducing Linear Agent"** https://www.youtube.com/watch?v=mRql2VJ99gM and **"Introducing Linear For Agents"** https://www.youtube.com/watch?v=sbwOQV5zY34 | 0:55 and 0:33 | No caption track on either: no voiceover. | (1) One job per film, under a minute. (2) Wordless films force every claim onto a readable card, a good discipline for our middle section. A third-party roundup describes Linear's style as "short, dense feature reels ... with dark-mode UI and minimal narration" (UNVERIFIED, moonb.io excerpt) |
| 5 | **Notion, "Introducing Notion 3.0: Agents"** https://www.youtube.com/watch?v=R1cF4T4lgI4 | 1:30 | Auto-captions contain only "[Music]" and applause: no narration. | Music-driven with an audience reaction at the end: the sound of a room is used as proof. We can borrow the idea with a single, real UI sound (the badge flipping) as the "hit" |
| 6 | **Notion, "Introducing Custom Agents"** https://www.youtube.com/watch?v=--GOwV4Z3UQ (uploaded 2026-02-24) | 1:29 | Presenter voice: "Today, I'm excited to introduce the newest addition to Notion AI, custom agents." Sets the contrast in sentence 2 ("they feel pretty different than other AI tools you've tried"), then "Here's a few examples." | (1) Say what makes it different in the second sentence. (2) Three short examples beat one long demo for breadth |
| 7 | **The Browser Company, "Dia Browser: Never Explain Yourself Again"** https://www.youtube.com/watch?v=YVOw0TAO9ok | 1:18 | Live-action sketch cold open with no product: "Every year my father hosts a family alfresco feast cooked by the children." Dialogue through to about 0:59, then music. | The best example found of **problem first, product second**. The title is the benefit, stated as a promise. Our cold open plays the same role with screenshots instead of actors |
| 8 | **PostHog, "Introducing Scouts in PostHog"** https://www.youtube.com/watch?v=QefP1WAXhc0 | 1:01 | Dry voiceover that starts mid-action: "We'll just see what's in here, and oh, never mind. Looks like a scout found a bug in our very own session replay player." Ends on a joke: "Well, that flipping sucks, but hey, good catch, scout." | (1) Show the product catching a real problem in their own product. We can do the same: Doc Drift Sentinel flags a page in our own docs space. (2) Start in the middle of an event. (3) Specific detail ("When a customer used Safari ...") reads as true |
| 9 | **incident.io, "Resolve incidents while you sleep | AI SRE"** https://www.youtube.com/watch?v=qqZ6NgaT5WM | 1:13 | No caption track: no voiceover. Description: "No late-night pings. No endless triage." | The title and description are the pain removed, in the customer's words. Two short "No ..." lines are a ready pattern for our cards ("No stale answers. No silent drift.") |
| 10 | **Resend, "new.email Public Launch"** https://www.youtube.com/watch?v=u8O6BzMMc7Q (2025-03-24) | 1:22 | Founder voice: "Today, we're excited to announce ... So, what is new.email?" Before and after in one line: "Building emails used to take days and now it takes minutes." Ends: "And that's why new.email exists." | (1) Ask the viewer's question out loud, then answer it. (2) One before/after number. Ours is verified: merge to flagged page in 11 seconds |
| 11 | **Warp, "Introducing Warp 2.0: The Agentic Development Environment"** https://www.youtube.com/watch?v=k9BRhSbVSpI | 2:27 | Founder to camera: "Warp 2.0 has four parts. First ... Second ... Third ... And finally ...". Ends on a category claim. | A numbered spine makes 2.5 minutes easy to follow. Ours could be three: anchor, flag, tell the agents |
| 12 | **Raycast, "It's out"** https://www.youtube.com/watch?v=uJ70iGerYzE | 2:41 | Presenter with a joke in the first 10 seconds ("You just have to sign up for the waitlist and, nah, I'm joking."), then "let me break down what this means and how you can get started." A separate 0:39 teaser ("New Raycast. Coming 2026", https://www.youtube.com/watch?v=Mi173xGb0ZA ) has no voiceover. | Two cuts for two jobs: a wordless teaser for social and a spoken walkthrough. We could cut the cold open plus logo as a 15-second teaser for X and LinkedIn |
| 13 | **Anthropic, "Introducing Claude Code"** https://www.youtube.com/watch?v=AJpK3YTTKZ4 | 3:55 | Two people on camera with an outtake as the cold open ("should we be doing like big smile?"), names and roles, then a live terminal demo. Ends: "that's an example of what Claude Code can do. We can't wait for people to start building with it." | (1) Real builders, not actors. (2) One continuous real task in the real tool. (3) A human, slightly unpolished first 5 seconds |
| 14 | **Atlassian, "Rovo: AI That Knows Your Company's Business"** https://www.youtube.com/watch?v=B2lfNOXMDG8 | 1:06 | Story voiceover with characters: "It's 7:00 a.m. and Beth's stuck on the Q2 growth strategy." Ends: "Imagine all that organizational memory, all that experience, all at your fingertips." Tagline in the description: "AI that knows your business. If you Rovo, you know." | This is how the sponsor sells Rovo: organizational memory. Our film should accept that promise and add the condition: memory is only useful if it is current. Mirroring their words ("knows your business") will land with Atlassian judges |
| 15 | **Atlassian, "Introducing Rovo Dev in Jira"** https://www.youtube.com/watch?v=tEbCO3wG_vQ | 3:30 | Presenter voice over product: "Hi, I'm Yvana from Atlassian." Ends on a feature. Also "Atlassian Rovo | Newbie" (1:24, 69,204 views, no caption track, https://www.youtube.com/watch?v=_mguIccmsJE ). | Atlassian's own feature videos are plain presenter demos. A designed film will look different from the house style, which is fine for "our own surfaces", but keep Atlassian UI unaltered when it is on screen |
| 16 | **OpenAI, "Introducing the Codex app"** https://www.youtube.com/watch?v=HFM3se4lNiw | 4:22 | Presenter: "Today, we're excited to introduce the Codex app ... Let me show you how it works. On the left, you can see my projects." | Spoken screen directions ("on the left", "on the right") keep a dense UI readable. Useful for the review panel shot |
| 17 | **Glean, "Glean: Work AI for all."** https://www.youtube.com/watch?v=QYGEZGGwuKA | 3:15 | Polished voiceover that opens on a vision ("AI has the power to redefine how we work") and takes about 25 seconds to reach the product. | A counter-example: a generic AI opening that any company could have written. Our first sentence should be one only we can say |

Also listed, music only or sparse dialogue per captions: Figma "All the launches at Config 2025" (1:22, https://www.youtube.com/watch?v=NHodnYFUT_I ), Lovable "Lovable 2.0 is here" (1:21, https://www.youtube.com/watch?v=xDwR1_vrIg8 ), Dropbox "Dropbox Dash: AI that understands you and your work" (1:43, https://www.youtube.com/watch?v=8Ab9EyV7DGY ).

### Patterns across the set
- **Two formats dominate.** (a) Under 90 seconds with no narration: music, UI and type (Cursor 2.0, Linear, Notion 3.0, Figma, Lovable, incident.io). (b) 1 to 4 minutes with a founder or builder speaking (Mintlify, Cursor 3, Resend, Warp, Claude Code, Codex). Nothing in the set is a narrated film over 2 minutes with constant fast motion. A 2.5-minute hypermotion film is unusual: plan slower "read the UI" stretches inside it.
- **None of the developer-tool films I checked opens on a montage of real third-party screenshots.** Problem-first openers exist (Dia's sketch, Mintlify's one sentence, Apwide's sketch among Codegeist winners), but the screenshot barrage is a documentary-trailer device (see the Satchel notes, section 1.15). It will be distinctive here, and it carries the rights questions in section C.
- **Endings:** a vision line or a line that mirrors the opening. Not a feature list.
- **Captions vs voice:** the short films carry every claim as on-screen text; the long ones rely on voice. For judges watching with sound off, burn in captions for the voiced sections.

## B.3 Videos made with Remotion

- **Remotion 4.0 keynote** (Remotion channel, 2023-07-03, 6:15, 14,613 views). https://www.youtube.com/watch?v=S3C9wlPNhkQ . The description says: "The source code for the animations in this video: https://github.com/remotion-dev/4-0-trailer". VERIFIED (metadata). Shows a full launch keynote can be built in Remotion, with the code open to read.
- **Fireship, "This video was made with code. But how?"** (2022-03-04, 8:41, 899,781 views). https://www.youtube.com/watch?v=deg8bOoziaE . Description: "Learn how to produce video content programmatically with HTML, CSS, and JavaScript thanks to Remotion"; source at https://github.com/wcandillon/remotion-fireship . VERIFIED (metadata). Shows the fast, code-and-type Fireship style is reproducible in Remotion.
- **GitHub Unwrapped** (Remotion for GitHub): a personalised year-in-review video per user. Source: https://github.com/remotion-dev/github-unwrapped (2023 and 2024), listed on Remotion's resources page, VERIFIED. "The creative process of GitHub Unwrapped 2023" (6:22, https://www.youtube.com/watch?v=WW8vIZ1kwR0 ) says the video "was produced by Informal Labs". VERIFIED (metadata). Shows data-driven scenes, 3D and rendering at scale.
- **Remotion showcase** (https://www.remotion.dev/showcase ; the page loads its entries with scripts, so I read the data file in Remotion's public GitHub repo, `packages/docs/src/data/showcase-videos.tsx`, VERIFIED). Entries: Hackreels (animated code diffs), MUX (video stats), a Next.js explainer by Delba Oliveira, GitHub Unwrapped, Revid, AnimStats, Banger Show (music visuals), Watercolor Map, Submagic (captions and zooms), Hello Météo, Electricity Maps (data visualisation), Remotion Recorder (screencasts), Fluidmotion, MyKaraoke, Relay.app ("programmatically generated instructional videos, ensuring explainer content remained consistent with the brand standards"), Vibrantsnap, AdmoveAI, SuperMotion ("product promo videos from screen recordings or screenshots ... device mockups, zooms animations, annotations, and transitions"), SportGraphics, Clippulse. Most are products built on Remotion, not single launch films. The relevant proofs for us: animated code diffs (Hackreels), screenshot-driven promo moves (SuperMotion), captions and zooms (Submagic).
- **remocn, "Making a launch video for Claude Opus 5"** (https://dev.to/remocn/making-a-launch-video-for-claude-opus-5-2jlo , VERIFIED). An unofficial 55-second spot, 1280x720 at 30 fps, twelve beats, built in Remotion with an AI agent working from a written brief. Lessons quoted or summarised there: "Transitions are chosen by tone, not by variety."; all scenes sit on one canvas so the background stays continuous; each incoming scene starts 12 to 20 frames into its own timeline so it never arrives empty; opacity and movement use different easing curves; one accent colour; "Nothing here is eyeballed" (every on-screen claim was checked against the source).
- **"I Turned Claude Code + Remotion into Product Launch Motion Design"** (0:36, 2026-07-20, https://www.youtube.com/watch?v=iShab28B_ak ). Description: made with an open-source agent skill "with cinematic camera moves, real interface captures, seamless transitions, sound design". VERIFIED (metadata).
- Remotion's resources page (https://www.remotion.dev/docs/resources , VERIFIED) lists useful starting points: light-leak transition, text morphing, typewriter effect, OpenGL transitions, and an Apple "Spring loaded" recreation (https://github.com/JonnyBurger/spring-loaded ).
- UNVERIFIED (search excerpts): Remotion released "Agent Skills" in January 2026 and a demo on its X account passed 6 million views; a claim that Anthropic's Claude Code marketing videos are made with Remotion is repeated on blogs without a primary source.

---

# C. Rights and platform rules

This is research, not legal advice. Where the stakes are a disqualification, I say what I would do.

## C.1 YouTube

**Altered or synthetic content disclosure** (https://support.google.com/youtube/answer/14328491 , VERIFIED today; the page shows no revision date):
- Rule: "We require creators to disclose AI-generated or altered content that seems realistic." Listed cases include content that "Makes a real person appear to say or do something they didn't do" and that "Creates music that's the main focus of the video." "AI generated music" is given as an example needing disclosure.
- Not needed: creators "don't need to disclose non-realistic content that's made with AI, or edits to realistic content that are minor." Examples: "Using an AI-generated or altered animation of a missile in a fully animated video"; "using generative AI tools to create or improve a video outline, script, thumbnail, title, or infographic"; "Cloning one's own voice to create voice overs or dubs".
- The page does not name text-to-speech narration either way. It does say "Labels may appear in the expanded description for non-music AI-generated audio" and "For AI-generated music or content that is photorealistic, a label in the video player may also appear."
- YouTube can label on its own: "YouTube may automatically apply an AI label on the video player or in the expanded description for" content its "internal systems detect is AI generated or altered". Creators who consistently do not disclose "may be subject to manual application of a label, or penalties from YouTube."
- Disclosure by itself does not limit reach or monetisation (page summary, VERIFIED).
- **Reading for us:** a motion-graphics film with an AI narrator and AI background music is mostly "non-realistic". Background music is not "the main focus". The letter of the page does not force a disclosure, but the safe and honest course is to answer the upload question truthfully and add one line in the description ("Narration and music generated with AI tools"). **Never alter the real speaker's words** in the voice clip beyond trimming; changing what a real person appears to say is the core case the policy targets.

**Fair use** (https://support.google.com/youtube/answer/9783148 , VERIFIED):
- "Nonprofit education uses are more likely to be considered fair use than commercial uses."
- "Borrowing small bits of material from an original work is more likely to be considered fair use".
- "Giving credit to the owner of a copyrighted work won't by itself turn a non-transformative copy of their material into fair use."
- "“no infringement intended” won't automatically protect you from a claim of copyright infringement."
- A claim can affect a video "even if you only use a few seconds, such as short uses of popular songs."
- **Reading for us:** a product launch film is a commercial use, so brief screenshots of news pages or posts are a weaker fair-use case than in a news video. Fair use is also a US defence, decided case by case, and the Codegeist rule (C.2) asks for permission, which is a higher bar than fair use.

**Music and Content ID.** UNVERIFIED (third-party guides only): AI-generated tracks are usually not registered in Content ID, but false matches happen and a licence PDF is only read during a dispute. Keep the generation record (tool, account, date, prompt, plan) for the music and the narration.

**Flashing and photosensitivity.** I found no YouTube policy page on flashing content (absence of evidence, UNVERIFIED). Use WCAG 2.3.1 (https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html , VERIFIED): "Web pages do not contain anything that flashes more than three times in any one second period, or the flash is below the general flash and red flash thresholds." A general flash is "a pair of opposing changes in relative luminance of 10% or more of the maximum relative luminance (1.0) where the relative luminance of the darker image is below 0.80". The area exemption is small (about a 341 x 256 pixel block on a 1024 x 768 screen), so a full-frame barrage is not exempt. The page names two test tools: Harding FPA and the Trace Center's PEAT. For the cold open: keep the background luminance steady while the cards swap (the Satchel approach), avoid saturated red flashes, and run the render through PEAT.

**Basics.** The video must be public (Devpost help page, above). Captions: upload our own .srt; judges may watch muted.

## C.2 Codegeist 2026 rules on third-party material

**Source status.** `https://codegeist2026.devpost.com/rules` returned 403. The wording below comes from search-engine excerpts of that page, returned today. UNVERIFIED until someone reads the live page.

**The video clause** (excerpt attributed to the 2026 rules page; the Codegeist 2024 rules excerpt is word-for-word the same):

> "must not include third party trademarks, or copyrighted music or other material unless the Entrant has permission to use such material."

**Related clauses seen in excerpts of the 2026 page:**
- A fix-it clause: "The Sponsor and Devpost may permit you to modify part of your Submission after the Submission Period for the purpose of adding, removing or replacing material that potentially infringes a third party mark or right". The excerpt adds that the modified submission must otherwise stay substantively the same.
- An intellectual-property warranty that submitted content "is not copyrighted, protected by trade secret or otherwise subject to third party intellectual property rights", with exceptions where the entrant owns it or has permission (search summary, partly paraphrased).
- "If a Project integrates any third-party SDK, APIs and/or data, Entrant must be authorized to use them in accordance with any terms and conditions or licensing requirements of the tool." (2024 rules excerpt.)
- Length: one excerpt today read "less than five (5) minutes" and then said judges need not watch "beyond five minutes"; the repo's rules doc and a participant's GitHub notes say judges need not watch beyond **3** minutes. Treat 3:00 as the working rule and confirm on the live page.

**My plain reading of the risk**

The sentence is standard Devpost boilerplate and it is written broadly: on its face it covers word marks and logos ("third party trademarks") and any copyrighted "other material", and the test is permission, not fair use. In practice it is enforced lightly: a 2024 first-place video says "Slack threads, Google Drive" in its first 20 seconds, and the rules contain a clause that lets the sponsor ask you to swap out a problem item after the deadline. So the likely worst case for a small infringement is a request to edit, not a silent disqualification. But the sponsor keeps discretion, the prize is large, and we are also publishing on YouTube and (from Dec 19) open source, where a rights holder can complain directly. I would treat the rule as written and design the cold open so that nothing in it needs a fair-use argument.

| Item | Risk under that wording | Safest treatment |
|---|---|---|
| **Real screenshots of other people's posts** (X, Reddit, Hacker News, LinkedIn) with platform chrome, logos, avatars | **Highest.** Each one stacks a platform trademark, the author's copyright in the text, and a private person's name and photo. No permission for any of them. | Re-typeset the sentence verbatim on our own card, in our type. Credit as text: first name or handle only if the author agreed, otherwise "engineer, Hacker News, 2025". Better: message the author and ask; a "yes" by DM is permission and makes the item clean. Never show the platform logo or the avatar |
| **Real news headlines as screenshots** (masthead, layout, photos) | **High.** Masthead is a trademark; photos are agency copyright; page design is the publisher's. | Re-typeset the headline verbatim on a house card with the outlet name and date as plain text. Short headlines are thin copyright at most, and naming the source is truthful reference. No masthead, no photo. This is also crisper than a low-resolution capture and keeps one house style (Satchel note 2.6 reached the same conclusion) |
| **Statistics from surveys and reports** | Low. Facts and numbers are not protected; the report's name is used as a reference. | Number as digits on our card, source as text with year. Open the primary first |
| **The real voice clip (CC BY)** | Low, **if** it is one of section A. The licence is the permission the rule asks for. | Keep a dated screenshot of the licence. Credit on screen or in the description. Audio with our own waveform or text card; do not show the conference logo or slides. Add "use does not imply endorsement" |
| **A real voice clip under the standard YouTube licence** | High. No permission. | Do not use. Paraphrase in our own narration, or ask the speaker |
| **Atlassian product names and UI** (Confluence, Jira, Bitbucket, Rovo, Forge) | None in practice. It is the sponsor's hackathon and the rules require building on these. | Show real, unaltered UI. Do not put our logo in a lock-up with Atlassian's, no Atlassian blue near our mark (already a project rule) |
| **"Slack"** (name, logo, or a look-alike mock of its UI) | Medium. Not needed to show our product, so there is no functional excuse; a look-alike UI is trade dress. The repo's rules doc already flags the "Incident Slack mock". | Use a generic chat or pager card in our own style ("#incident-482") with no name and no Slack colours or layout. If the word must appear, plain text once in narration is the mildest form |
| **"Claude Code" and "Cursor"** shown as MCP clients | Medium-low for the name in plain text, medium for logos. Naming a product to say "works with" is ordinary reference use, and the clip shows our project "functioning on the device for which it was built". But the rule's literal wording has no "reference use" carve-out. | Lead the agent proof with **Rovo** (sponsor's own). For MCP, show the real terminal with our tool call and say "a coding agent over MCP". If a client is named, use plain text only ("shown: Claude Code"), no logo, no brand colours, a few seconds at most, and add a line in the description: "Claude Code and Cursor are trademarks of their owners; no affiliation or endorsement". Asking for permission is also realistic: both companies publish brand guidelines (not researched here) |
| **Music** | High if commercial or popular; low if generated or licensed. | AI-generated or library music on a paid plan, with the record kept (C.3) |
| **Fonts and icons** | Low. Spline Sans is open licence (not re-checked today). | Use our brand fonts and our own icons only |

**Recommended form of the cold open under this rule:** eight seconds of our own cards. Each card carries one verbatim sentence, re-typeset, with the source named in small text. One real voice from section A under it. No third-party logo, UI or photo anywhere in the frame. This keeps the "real evidence" effect (the words and sources are real and checkable), satisfies the permission test for everything except the short quoted sentences, and for those we either get a "yes" from the author or use outlets and reports where quoting a headline with attribution is normal practice. List every source with its URL in the YouTube description and on the Devpost page.

Two more points:
- **Never invent a quote or attribute one to a real account or outlet.** If we need a line nobody said, present it as our own narration.
- The rule says the video "must" show the project functioning. The barrage is not a demo; keep it to 8 seconds so it does not eat the first 3:00.

## C.3 ElevenLabs

- **Terms of Use** (https://elevenlabs.io/terms-of-use , "Last Updated: 09 October 2026", VERIFIED). Free users: "you may only use the Services for non-commercial purposes." Paid users: "you may use the Services for commercial purposes", subject to the Prohibited Use Policy. Ownership: "as between you and ElevenLabs, you retain all rights in and to your Output." Output may not be unique: "the Services may produce the same or similar Output for you and a third party."
- **Sound effects** (https://elevenlabs.io/sound-effects FAQ, VERIFIED): "As long as you have a paid account, you can use our sound effects royalty-free in commercial projects".
- **Music** (Eleven Music model-specific terms, https://elevenlabs.io/eleven-music-model-specific-terms , "Last updated: 09 October 2026", VERIFIED). Media rights on every self-serve plan: "All online and offline commercial use permitted, except film, TV, radio, and Studio Games". Attribution: "Required (denote Eleven Music when distributing)" on Free, "No Attribution Required" from Starter up. Streaming-service distribution is "Prohibited" on Free and Starter. **Watch the eligibility column:** Starter, Creator and Pro are "For Individual Use Only"; Scale is for "Individuals, or entities or organizations with fewer than 10 employees". If the video is published by Nano Soft as a company, the music may need a Scale plan or the track should be generated on an individual's own account for an individual's use. Read the full terms on this point.
- The help-centre article "Can I publish the content I generate on the platform?" returned 403. UNVERIFIED third-party summaries say audio made while on a paid plan stays usable commercially after cancelling.

## C.4 OpenAI

- **Ownership of output.** openai.com policy pages returned 403. A third-party capture of the OpenAI Terms of Use (stated effective date Jan. 1, 2026; https://conductatlas.com/platform/openai/openai-terms-of-use/openai-assigns-output-ownership-to-user/ ) quotes: "We hereby assign to you all our right, title, and interest, if any, in and to Output." UNVERIFIED against the primary page (https://openai.com/policies/terms-of-use ). Third-party summaries say this allows commercial use of generated images and audio, subject to the usage policies, with no attribution required. No plan-specific limits were confirmed.
- **Generated voice needs a disclosure.** The text-to-speech guide (https://developers.openai.com/api/docs/guides/text-to-speech , VERIFIED) says the usage policies "require you to provide a clear disclosure to end users that the TTS voice they are hearing is AI-generated" and not a human voice. If the narration is made with OpenAI TTS, put that line in the description or on the end card.
- OpenAI music or sound-effect generation: not researched; I found no primary source.

---

# D. What I could not verify

1. **The exact Codegeist 2026 rule text** (403). The third-party-material sentence, the fix-it clause, the IP warranty and the 3-minute vs 5-minute judging line all come from search excerpts. Read https://codegeist2026.devpost.com/rules in a browser and copy the video paragraph into the repo's rules doc.
2. **Whether each winner's YouTube video is the one on its Devpost page** (403), and the videos for Runbook Rabbit, Compass Whiteboard, Campaign Analyser, Sherlock Sync, AI Backlog for Jira, Graph Goose and Frank's submission.
3. **The audio of every clip.** All quotes and timestamps are from machine transcripts. Listen before cutting. In particular A2 ("changes the code") and A5 ("docs", transcribed as "dogs").
4. **Speaker roles and employers** for Addy Osmani (current title), Mikey Ariel, Mariatta Wijaya, Omer Rosenbaum, Neel Shah, Manny Silva: from titles, descriptions or memory, not from a bio page.
5. **EuroPython's own licence statement** for A9 (the YouTube field says CC BY; an NC clause elsewhere would rule it out).
6. **Visual style of every reference video.** Not watched. Licence fields for most launch videos in B.2 were not captured; all are assumed standard.
7. **OpenAI terms** (primary pages blocked) and the **ElevenLabs help article** (blocked).
8. **YouTube and flashing content**: no policy page found; **Content ID behaviour for AI music**: third-party sources only.
9. **Coverage.** About 215 of roughly 1,000 CC-filtered YouTube candidates were read before rate limiting; FOSDEM 2025 and 2026 were searched in full; CCC, USENIX, GopherCon, Strange Loop, NDC and government talks were not searched.
