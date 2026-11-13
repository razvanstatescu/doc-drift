# Barrage sources: "docs go stale when the system changes" (research, 2026-11-13)

> **Appendix to [../research.md](../research.md).** A research log written by a sub-task on 2026-11-13 and kept as delivered. The main file says which items are planned for the film. Spot-check by the main session, same day: D1-01, D1-02, D1-03, D1-04 and D1-06 were re-opened and read exactly as logged, and the licences of D1-06 (CC BY-SA) and D2-03 (OGL v3.0) were confirmed on the pages.

Raw material for the ~8 s barrage that opens the Doc Drift Sentinel launch video. This file covers two themes only:

- **Theme 1 (D1-xx): docs and runbooks rot when the code or system changes.**
- **Theme 2 (D2-xx): calendar-based review does not catch it** (reminders ignored, review dates that lapse, cleanups that fade, nobody owns freshness).

Everything here is NEW relative to `docs/research/user-needs-and-competitors.md` section 2. Nothing was downloaded as media and no screenshots were taken.

## How to read this

**Fact-check marks**

- **VERIFIED**: I fetched the page over plain HTTP (no login, browser user agent) and read the quoted words in the page text. For PDFs I extracted the text with `pdftotext`. For Hacker News I read the comment through HN's public search API and then confirmed the phrase is present in the `news.ycombinator.com/item?id=` page HTML.
- **REPORTED**: quoted by a secondary source; I could not open the primary.
- **UNVERIFIED**: search-result summary only. Do not put on screen.

**Limits of this pass (read before capturing)**

- I read page text, not rendered pages. "Light or dark" and "visible without expanding" are my best inference from the HTML and from knowing the site, not something I saw in a browser. Confirm at capture.
- Typographic apostrophes and quotes: several pages use curly characters (Stack Overflow Blog, some HN comments, Substack). The quotes below use straight ones. Words are exact; punctuation glyphs may differ.
- **Reddit could not be opened** (WebFetch refuses reddit.com; direct fetch returns a login shell; I did not use mirrors or archives). No Reddit item below is verified at the primary.
- **X, Bluesky and Mastodon could not be searched** (web search does not index them usefully; Bluesky's public search endpoint returned 403). There are no social posts in this file.

**Score** = visual punch in a fast montage (5 = reads in half a second, recognisable outlet or a hard number).

**People**: organisations and public figures can stay. Private individuals' names, handles and avatars get blurred. Hacker News handles are treated as private unless noted. HN has no avatars.

**(vendor)** = the publisher sells something in this space. Low priority, and never the only source for a claim.

## Top 12 for the barrage (ordered by punch)

| # | ID | Outlet | Text to show | Theme | Mark | Score |
|---|---|---|---|---|---|---|
| 1 | D1-01 | GitHub Open Source Survey 2017 | "Incomplete or outdated documentation is a pervasive problem, observed by 93% of respondents" | 1 | VERIFIED | 5 |
| 2 | D1-02 | Google, The Site Reliability Workbook | "Details in playbooks go out of date at the same rate as production environment changes." | 1 | VERIFIED | 5 |
| 3 | D2-01 | Stack Overflow Blog | "The author of 90% of our documentation doesn't work here anymore!" | 2 | VERIFIED | 5 |
| 4 | D1-04 | Hacker News comment | "throw away your runbooks. They are out of date the moment you hit save." | 1 | VERIFIED | 4 |
| 5 | D2-04 | unfinished.bike (blog) | "I have never seen quarterly playbook reviews work." | 2 | VERIFIED | 4 |
| 6 | D1-06 | Wikimedia incident report | "Documentation was outdated for jobrunner, dsh, and salt" | 1 | VERIFIED | 4 |
| 7 | D2-03 | UK Ministry of Justice runbooks (live page) | "This page was set to be reviewed before 18 January 2026 ... This might mean the content is out of date." | 2 | VERIFIED (banner state to confirm at capture) | 4 |
| 8 | D1-03 | The Register | "Techie with outdated documentation gets his step count in searching for non-existent cabinet" | 1 | VERIFIED | 4 |
| 9 | D1-16 | State of Docs 2026 (vendor survey) | "30% name keeping docs in sync with the product as their single biggest challenge — nearly double the runner-up" | 1 | VERIFIED | 4 |
| 10 | D1-17 | Mintlify State of Knowledge 2026 (vendor survey) | "Just 24% of survey respondents say product changes are reflected in docs the same day." | 1 | VERIFIED | 4 |
| 11 | D1-05 | Microsoft, Azure AI Foundry Blog | "these guides are often outdated, incomplete, hard to understand" | 1 | VERIFIED | 4 |
| 12 | D2-02 | Software Engineering at Google | "Documents without owners become stale and difficult to maintain." | 2 | VERIFIED | 4 |

Alternates if one of the 12 fails at capture: D1-11 (Jos Visser, "runbooks are always out of date"), D1-21 (HN, "Documentation rots a lot more quickly than the code"), D1-12 (Simon Willison), D1-07 (Wikimedia, alert documentation out of date), D2-05 (DORA), D1-08 (Reddit Pi-Day, only after someone confirms the wording on reddit.com).

Balance notes: Wikimedia appears three times (D1-06, D1-07, D1-09); use one. Microsoft appears three times (D1-05, D1-19, D1-20); use one. Hacker News supplies many items; two in the cut is plenty. Two of the three hard-number tiles besides GitHub are vendor surveys; say so if asked.

---

## Theme 1: docs and runbooks rot when the code or system changes

### D1-01 · Survey stat · GitHub Open Source Survey · 2017 · score 5 · top 1
- URL: https://opensourcesurvey.org/2017/
- Text: "Incomplete or outdated documentation is a pervasive problem, observed by 93% of respondents, yet 60% of contributors say they rarely or never contribute to documentation."
- Underline: "outdated documentation", "93% of respondents".
- Why: the best-known hard number that has the word "outdated" in it. Theme 1.
- Fact check: VERIFIED on the primary. Sample, from the same page: "We collected responses from 5,500 randomly sampled respondents sourced from over 3,800 open source repositories on GitHub.com" plus "over 500 responses from a non-random sample of communities that work on other platforms."
- Caveats: the figure covers "incomplete **or** outdated" together, the population is open source users and contributors, and it is from 2017. Do not caption it as "93% of docs are outdated".
- People: organisation (GitHub). Blur: none.
- Capture: loads without login. Sentence is in the "Insights" section under the heading "Documentation is highly valued, but often overlooked" (scroll). Theme not checked.

### D1-02 · Book (free online) · Google, The Site Reliability Workbook, chapter 8 "On-Call" · 2018 · score 5 · top 2
- URL: https://sre.google/workbook/on-call/
- Text: "Details in playbooks go out of date at the same rate as production environment changes."
- Follow-on sentence, same paragraph: "For daily releases, playbooks might need an update on any given day."
- Underline: "go out of date", "at the same rate as production environment changes".
- Why: Google's SRE organisation stating the product thesis in one line: change, not time, is what stales a runbook. Theme 1 (and the argument against a calendar in theme 2).
- Fact check: VERIFIED. Sits under the sub-heading "Maintaining Playbooks".
- People: organisation. Blur: none.
- Capture: loads without login, light page, long chapter (find the heading "Maintaining Playbooks").

### D1-03 · News headline · The Register ("On Call" column) · 2019-05-10 · score 4 · top 8
- URL: https://www.theregister.com/2019/05/10/on-call/
- Headline: "Techie with outdated documentation gets his step count in searching for non-existent cabinet"
- Underline: "outdated documentation".
- Body line that explains it: "Sure enough, some other engineer had renamed all the devices but failed to relabel the switches."
- Why: a recognisable outlet with "outdated documentation" in the headline, and the cause is a rename. Theme 1.
- Fact check: VERIFIED (headline, date "fri 10 May 2019", and the body line). Note the URL uses `on-call` with a hyphen; `on_call` returns 404.
- Caveat: it is a reader anecdote about network cabinets and diagrams, not code. The reader is given only as "Wayne" (the column anonymises).
- People: outlet. Blur: none in the headline crop.
- Capture: loads without login, light page, ads present (hide at capture).

### D1-04 · HN comment · user "jedberg" · 2021-03-27 · score 4 · top 4
- URL: https://news.ycombinator.com/item?id=26605818
- Text: "Secondly, throw away your runbooks.  They are out of date the moment you hit save."
- Underline: "out of date the moment you hit save".
- Why: the most quotable single line found. Theme 1.
- Fact check: VERIFIED. Thread: "Should never happen. If it does, call the developers".
- Caveat: his remedy is "automate it instead", which is not our product. Show only the two sentences above.
- People: the handle is widely understood to belong to a well-known engineer, but I did not confirm that here. Default: blur the handle.
- Capture: loads without login, light page, comment is the top of the linked item view. Crop to the second paragraph.

### D1-05 · Blog · Microsoft, Azure AI Foundry Blog · 2025-05-12 · score 4 · top 11
- URL: https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/the-future-of-ai-autonomous-agents-for-identifying-the-root-cause-of-cloud-servi/4412494
- Page title: "The Future of AI: Autonomous Agents for Identifying the Root Cause of Cloud Service Incidents"
- Text: "However, in practice, because they are manually crafted, these guides are often outdated, incomplete, hard to understand without sufficient background in the problem, and/or difficult to locate, as they tend to be scattered across various platforms."
- Short form for the screen: "these guides are often outdated, incomplete, hard to understand"
- Underline: "often outdated".
- Why: Microsoft describing its own on-call troubleshooting guides (TSGs). Theme 1.
- Fact check: VERIFIED. Next sentence: "This results in unnecessary toil and increases the amount of time from incident creation until it is mitigated."
- Caveat: the post goes on to pitch AI agents as the fix. Use the problem sentence only.
- People: organisation; byline is a Microsoft employee account (crop it out).
- Capture: loads without login, light page, expect a cookie banner. The sentence is in the opening section.

### D1-06 · Postmortem · Wikimedia Foundation, "Incidents/2017-07-18 JobQueue" · 2017-07-18 · score 4 · top 6
- URL: https://wikitech.wikimedia.org/wiki/Incidents/2017-07-18_JobQueue
- Text (Conclusions): "Documentation was outdated for jobrunner, dsh, and salt"
- Underline: "Documentation was outdated".
- Why: a real incident review that lists outdated docs as a weakness, after the documented deployment steps no longer matched the tooling. Theme 1.
- Fact check: VERIFIED. Summary on the page: "Deploying a change to the Jobrunner service using Scap3 resulted in the wrongful starting of job runners in Codfw." and "Jobrunners in Codfw were active for approximately 30 minutes."
- Caveat: two bullets further down, the line "Salt no longer exists (since when?) with no documented alternative." is **struck through** on the page and corrected by a colleague ("This is not correct, Salt is in the process of being replaced..."). A reply then explains the drift: Salt had become root-only, "which his why using Salt to restart job runners is (was) part of the jobrunner deployment process" in the docs, so it was "effectively unavailable to deployers". Do not show or quote the struck-through line. Crop to the "Documentation was outdated" bullet only.
- People: organisation. IRC nicknames appear in the timeline (keep the crop on Conclusions).
- Capture: loads without login, light wiki page, Conclusions is near the bottom.

### D1-07 · Postmortem · Wikimedia Foundation, "Incidents/20190327-elasticsearch" · 2019-03-27 · score 4
- URL: https://wikitech.wikimedia.org/wiki/Incidents/20190327-elasticsearch
- Text (What went poorly?): "The documentation associated with the frozen indexing alert is out of date -- Search#Pausing Indexing needs an update (DONE)."
- Underline: "documentation associated with the frozen indexing alert is out of date".
- Why: the page an alert pointed to was out of date during an upgrade incident. Theme 1.
- Fact check: VERIFIED. The page still carries "Work in Progress!!!" at the top.
- People: organisation; one username is thanked further down (outside the crop).
- Capture: loads without login, light wiki page, under "What went poorly?".

### D1-08 · Postmortem · Reddit, "You Broke Reddit: The Pi-Day Outage" (r/RedditEng) · 2023-03-21 · score 4
- Primary URL (NOT opened by me): https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/
- Where I read the words: https://geek-cookbook.funkypenguin.co.nz/blog/2023/03/24/post-mortem-reddit-pi-day-kube-1.25/ (a blog that block-quotes the postmortem)
- Text as quoted there: "However, this backup procedure, and the restore, were written several years ago. While the restore had been tested repeatedly and extensively in our pilot clusters, it hadn't been kept fully up to date with changes in our environment, and we'd never had to use it against a production cluster, let alone this cluster."
- Also quoted there (the cause): "The nodeSelector and peerSelector for the route reflectors target the label node-role.kubernetes.io/master. In the 1.20 series, Kubernetes changed its terminology from "master" to "control-plane." And in 1.24, they removed references to "master," even from running clusters. This is the cause of our outage."
- Underline: "hadn't been kept fully up to date with changes in our environment".
- Why: a famous outage (about 5 hours) where the written restore procedure had drifted from the environment, and the trigger was a rename. Theme 1.
- Fact check: **REPORTED**. Someone must confirm both passages on reddit.com before use.
- Caveat: the outage's cause was a config selector that still used a renamed label, not a document. The document part is the restore procedure. Caption accordingly.
- People: organisation; the post's author is a Reddit employee (crop out the byline).
- Capture: Reddit post pages normally load without login in a browser; long post, the passage is mid-page.

### D1-09 · Postmortem · Wikimedia Foundation, "Incidents/20140403-Deploy" · 2014-04-03 · score 3
- URL: https://wikitech.wikimedia.org/wiki/Incidents/20140403-Deploy
- Text: "While debugging and browsing through the docs, I found many places where the docs were outdated"
- Why: an engineer reaching for docs mid-incident and finding them outdated. Theme 1. Old, so a backup only.
- Fact check: VERIFIED. First-person notes signed with first names.
- People: organisation; first names of staff in the text (crop tight or blur).
- Capture: loads without login, light wiki page.

### D1-10 · Guide · PagerDuty Incident Response documentation, "Effective Postmortems" · undated · score 3
- URL: https://docs.pagerduty.com/ops-guides/incident-response-guide/effective-postmortems (the old `response.pagerduty.com/after/effective_post_mortems/` redirects here)
- Text: "very rarely is the mistake "rooted" in a human performing an action, there are often several contributing factors (the script the human ran didn't have rate limiting, the documentation was out of date, etc) that can and should be addressed."
- Underline: "the documentation was out of date".
- Why: PagerDuty's own postmortem guide uses out-of-date documentation as a stock contributing factor. Theme 1.
- Fact check: VERIFIED.
- People: organisation. Blur: none.
- Capture: loads without login. Theme not checked. The phrase is inside a long bullet; weak for half a second.

### D1-11 · Blog · Jos Visser, "The loneliness of the long distance runbook" (Substack) · 2024-12-11 · score 4
- URL: https://josvisser.substack.com/p/the-loneliness-of-the-long-distance
- Text: "In a more than completely static environment, runbooks are always out of date."
- Next sentences: "There is unfortunately nothing to be done about that, just live with it!" and "The less frequently the runbook is executed, the more likely it is to be incorrect."
- Underline: "runbooks are always out of date".
- Why: a former SRE manager saying it flat. Theme 1.
- Fact check: VERIFIED.
- People: individual author publishing under his own name; not a household name. Keep the post title, blur name and avatar unless the team decides a byline is fine.
- Capture: loads without login, light page; Substack may show a subscribe overlay (dismiss).

### D1-12 · Blog · Simon Willison, "The Perfect Commit" · 2022-10-29 · score 4
- URL: https://simonwillison.net/2022/Oct/29/the-perfect-commit/
- Text: "If your docs live in a separate wiki somewhere it's easy for them to get out of date—but more importantly it's hard for anyone to quickly confirm if the documentation is being updated in sync with the code or not."
- Lead-in on the page: "Documentation is only valuable if people trust it. People will only trust it if they know that it is kept up to date."
- Underline: "separate wiki", "easy for them to get out of date", "hard for anyone to quickly confirm".
- Why: a well-known engineer naming the exact gap: wiki docs drift from code and nobody can tell. Theme 1.
- Fact check: VERIFIED. Alternative from his 2018 post "Documentation unit tests" (https://simonwillison.net/2018/Jul/28/documentation-unit-tests/), also VERIFIED: "Keeping documentation synchronized with an evolving codebase is difficult. Without extreme discipline, it's easy for documentation to get out-of-date as new features are added."
- Caveat: his answer is "keep docs in the repo". We answer the case where they are not.
- People: public figure (co-creator of Django, widely read blog). Blur: none.
- Capture: loads without login, light page, sponsor line at the top (crop).

### D1-13 · Blog · Stack Overflow Blog, "Reducing the Learning Curve for Supporting Aging Codebases" · 2019-10-01 · score 4
- URL: https://stackoverflow.blog/2019/10/01/reducing-the-learning-curve-for-supporting-aging-codebases/
- Text: "Out-of-date documentation is only a little better than having no documentation at all. As systems evolve, make sure that your documentation evolves with them."
- Underline: "Out-of-date documentation", "As systems evolve".
- Why: recognisable outlet, short, and it ties staleness to system change. Theme 1.
- Fact check: VERIFIED.
- Caveat: the surrounding paragraph recommends Stack Overflow's own knowledge product (vendor-adjacent).
- People: organisation. Blur: none.
- Capture: loads without login, light page, near the end of the post.

### D1-14 · Blog · Stack Overflow Blog, "Why do developers love clean code but hate writing documentation?" · 2024-12-19 · score 3
- URL: https://stackoverflow.blog/2024/12/19/developers-hate-documentation-ai-generated-toil-work/
- Text: "As the codebase changes, documentation that isn't updated can mislead developers, leading to errors and inefficient workflows."
- Underline: "As the codebase changes", "can mislead developers".
- Why: change-driven staleness with a consequence, recent, recognisable outlet. Theme 1.
- Fact check: VERIFIED. Same post: "informal, hard-to-understand documentation that quickly becomes outdated as the software evolves."
- People: organisation. Blur: none.
- Capture: loads without login, light page.

### D1-15 · Book (free online) · Software Engineering at Google, chapter 10 "Documentation" · 2020 · score 4
- URL: https://abseil.io/resources/swe-book/html/ch10.html
- Text: "Just like old code can cause problems, so can old documents. Over time, documents become stale, obsolete, or (often) abandoned."
- Underline: "stale, obsolete, or (often) abandoned".
- Also on the page: "someone adding a note that "This no longer works!" is more helpful than saying nothing and leaving something that seems authoritative but no longer works."
- Why: Google's engineering book; the second line is close to our "flag it, do not trust it" idea. Theme 1.
- Fact check: VERIFIED (section "Deprecating Documents").
- People: organisation / published book. Blur: none.
- Capture: loads without login, plain light page, very long chapter.

### D1-16 · Survey stat (vendor) · State of Docs Report 2026 (GitBook) · 2026 · score 4 · top 9
- URL: https://www.stateofdocs.com/2026
- Text: "30% name keeping docs in sync with the product as their single biggest challenge — nearly double the runner-up"
- Underline: "30%", "keeping docs in sync with the product".
- Why: a current hard number for "docs fall behind the product". Theme 1.
- Fact check: VERIFIED on the report site, which also shows "1,131 Total Respondents, with roles across multiple disciplines" and "Conducted in 2026". GitBook's own blog (https://www.gitbook.com/blog/documentation-quality-research-2026, published Nov 13, 2026) adds, VERIFIED there: "In State of Docs 2026, 30% of respondents named keeping docs in sync with the product as their biggest workflow challenge. Among engineers, that rose to 43%."
- Caveats: run by GitBook (vendor). Respondents are mostly documentation professionals, and the question is about product docs in general, not internal runbooks. I did not open the full report chapter, only the landing page and the blog.
- People: organisation. Blur: none.
- Capture: loads without login. The key-findings tiles animate up from 0 (the HTML carries both "30%" and "0%"), so wait for the count-up. Theme not checked.

### D1-17 · Survey stat (vendor) · Mintlify, The 2026 State of Knowledge Report · 2026 · score 4 · top 10
- URL: https://www.mintlify.com/state-of-knowledge/2026 (text read from the `.md` version of the same URL)
- Text: "Just 24% of survey respondents say product changes are reflected in docs the same day."
- Continues: "About 54% cite a one-week lag, while 22% have to wait a month or longer". Figure 5, "How long does a product change typically take to reach your documentation?" (All 329 respondents): "24% — Same day / 54% — Within a week / 13% — Within a month / 5% — Longer than a month / 4% — It often never does".
- Underline: "Just 24%", "the same day".
- Why: a number for the gap between a change and its docs. Theme 1.
- Fact check: VERIFIED. Survey of "329 professionals".
- Caveats: vendor; small sample; about customer-facing product docs. The "22%" in the sentence is the sum of the figure's 13 + 5 + 4.
- People: organisation. Blur: none.
- Capture: loads without login. Theme and layout not checked.

### D1-18 · Report · DORA, Accelerate State of DevOps 2021 · 2021 · score 3
- URL: https://dora.dev/publications/pdf/state-of-devops-2021.pdf (PDF, "Documentation" section, page 21)
- Text: "We found that about 25% of respondents have good quality documentation"
- Definition on the same page: documentation quality is the degree to which it "helps readers accomplish their goals", "is accurate, up-to-date, and comprehensive", "is findable, well organized, and clear."
- Why: a named, respected study. Theme 1, loosely.
- Fact check: VERIFIED in the PDF text. The report says "This year, 1,200 working professionals" took part.
- Caveat: "good quality" is a composite; being up to date is one of three parts. Do NOT caption it as "75% of docs are out of date". See D2-05 for the stronger DORA line.
- People: organisation. Blur: none.
- Capture: public PDF; the sentence is body text in a two-column page, not a big tile.

### D1-19 · Study · Microsoft Research, "How to Fight Production Incidents? An Empirical Study on a Large-scale Cloud Service" (SoCC '22; reported elsewhere as that year's Best Paper, not checked) · 2022 · score 3
- URL: https://www.microsoft.com/en-us/research/wp-content/uploads/2022/09/3542929.3563482.pdf (DOI 10.1145/3542929.3563482)
- Text: "Finding#14: 21% of incidents where manual effort delayed mitigation, expected improvements in documentation and training."
- Also: "Prior work has shown that such documents, especially troubleshooting guides (TSGs), have critical quality issues (like completeness, correctness, broken links, and readability) and are not well maintained".
- Also (figure label): "Documents-Procedures - 10.5 %" of mitigation-failure categories.
- Why: stale and poor guides slowing real incident mitigation at Microsoft Teams, with numbers. Theme 1.
- Fact check: VERIFIED in the PDF text. Scope, from the paper: "we systematically study 152 high severity production incidents that happened during a recent 12 months period" at "Microsoft-Teams".
- Caveat: the category is "documentation and procedures" quality in general, not staleness alone. Dense academic page; weak on screen.
- People: organisation. Blur: none.
- Capture: PDF. A direct `curl` got an HTML shell from microsoft.com; a normal browser should get the PDF. The ACM DOI page is the fallback.

### D1-20 · Study · Microsoft, "AutoTSG: Learning and Synthesis for Incident Troubleshooting" (arXiv 2205.13457, ESEC/FSE 2022) · 2022-05-26 · score 3
- URL: https://arxiv.org/abs/2205.13457 (PDF: https://arxiv.org/pdf/2205.13457)
- Text (an on-call engineer's feedback on a guide, Table 1 example for "Up-to-dateness"): 'out of date: still using visualstudio instead of ado'
- Text (participant P7): "Mostly outdated TSGs or missing the information I need. So I generally discuss with my team for many of the issues."
- Number: "Empty (7.24%) and have Up-to-dateness (6.54%) issues that reveal important maintainability issues with the current state of TSGs." Negative-to-positive vote ratio for up-to-dateness feedback: "Up-to-dateness (13:1)".
- Why: a renamed tool still named in the guide, in the engineer's own words. Theme 1.
- Fact check: VERIFIED in the PDF text. Scope from the abstract: "over 4K+ TSGs mapped to 1000s of incidents" and "feedback on TSGs provided by 400+ OCEs".
- Caveat: 6.54% is the share of feedback comments about up-to-dateness, not the share of guides that are stale.
- People: organisation; participants are anonymised as P-numbers.
- Capture: arXiv loads without login, light page; the quotes are small text in a table and a paragraph.

### D1-21 · HN comment · user "jpollock" · 2026-03-08 · score 4
- URL: https://news.ycombinator.com/item?id=47302108
- Text: "Documentation rots a lot more quickly than the code - it doesn't need to be correct for the code to work."
- Underline: "rots a lot more quickly than the code", "doesn't need to be correct for the code to work".
- Why: one line that explains why docs drift silently. Theme 1. Recent.
- Fact check: VERIFIED. Thread: "We should revisit literate programming in the agent era".
- Caveat: the comment's second sentence tells people to ignore docs and read the code; crop to the first sentence.
- People: private individual. Blur the handle.
- Capture: loads without login, light page, two-sentence comment.

### D1-22 · HN comment · user "Twirrim" · 2024-01-04 · score 3
- URL: https://news.ycombinator.com/item?id=38868245
- Text: "A year long expiry isn't frequent enough that you build automation, and is long enough that the runbook you have is likely out of date before the next time you execute it."
- Underline: "the runbook you have is likely out of date before the next time you execute it".
- Why: an ex-AWS engineer (by his own account in the comment) on yearly certificate rotation runbooks. Theme 1, and a nudge at theme 2 (a yearly cadence is slower than change).
- Fact check: VERIFIED. Thread: "Ten years isn't long enough for maximum age settings".
- People: private individual. Blur the handle.
- Capture: loads without login, light page; the sentence is in the second paragraph.

### D1-23 · HN comment · user "spike021" · 2022-07-04 · score 3
- URL: https://news.ycombinator.com/item?id=31979242
- Text: "They were very reliant on runbooks for operational things. Problem was, at least half of them were out of date."
- Also: "But wait, this key is no longer in the secure vault." and "you're totally stuck and under a lot of pressure precisely because the runbook is no longer applicable."
- Underline: "at least half of them were out of date".
- Why: an on-call story with a 3AM page and a runbook that no longer applies. Theme 1.
- Fact check: VERIFIED. Thread: "Keep calm and use the runbook". "At least half" is one person's estimate, not a statistic.
- People: private individual. Blur the handle.
- Capture: loads without login, light page; the lines are separate short paragraphs at the top of the comment.

### D1-24 · HN comment · user "nickcw" · 2020-08-10 · score 3
- URL: https://news.ycombinator.com/item?id=24110326
- Text: "So when you look up something in the wiki you don't know whether it is up to date or not. Maybe it contains a procedure written by the support staff which you need to follow when X happens but the developers have changed the subsystem so it is actively dangerous now?"
- Underline: "you don't know whether it is up to date or not", "the developers have changed the subsystem".
- Why: exactly our scenario: code changed, the wiki procedure did not. Theme 1.
- Fact check: VERIFIED. Thread: "Wiki Bankruptcy".
- Caveat: the same comment ends by recommending Confluence for ownership and archiving; crop to the second paragraph.
- People: private individual as far as this pass goes. Blur the handle.
- Capture: loads without login, light page.

### D1-25 · HN comment · user "williamDafoe" · 2020-02-01 · score 3
- URL: https://news.ycombinator.com/item?id=22208404
- Text: "Runbooks go out of date faster than anything."
- Why: six words. Theme 1.
- Fact check: VERIFIED. Thread: "Writing Runbook Documentation When You're an SRE".
- People: private individual. Blur the handle.
- Capture: loads without login, light page; it is item 1 of a numbered list at the top of the comment.

### D1-26 · Blog · Doug Turnbull, "Fighting undead documentation" · 2023-10-13 · score 3
- URL: https://softwaredoug.com/blog/2023/10/13/fight-undead-documentation
- Text: "Most documentation is undead. Invariably documentation becomes out of date and forgotten. It appears to be living."
- Continues: "the undead, zombie documentation, appearing correct, but far from the actual truth."
- Underline: "appearing correct, but far from the actual truth".
- Why: names the specific danger: stale docs look alive. Theme 1.
- Fact check: VERIFIED. A ghost emoji follows "undead." on the page.
- People: individual author under his own name (known in the search-engineering community). Blur the name unless the team is happy with a byline.
- Capture: loads without login. Theme not checked; a newsletter sign-up box sits above the post.

### D1-27 · Blog · Lorin Hochstein, "The down side of writing things down" (Surfing Complexity) · 2022-10-09 · score 2
- URL: https://surfingcomplexity.blog/2022/10/09/the-problems-with-writing-things-down/
- Text: "Tacit knowledge is much more fluid: it adapts to changing circumstances much more quickly and easily than updating documentation, as anybody who has dealt with out-of-date written procedures can attest to."
- Why: a known resilience-engineering voice. Theme 1. Too long for the montage; useful as a pull quote elsewhere.
- Fact check: VERIFIED.
- People: individual author under his own name.
- Capture: loads without login, light page.

### D1-28 · Blog (vendor) · Gremlin, "Ensuring Runbooks are Up-to-Date" · 2019-10-09 · score 3
- URL: https://www.gremlin.com/blog/ensuring-runbooks-are-up-to-date
- Text: "One thing that all technical documentation for software that is still in active development has in common is that if it is not already outdated, it will be."
- Underline: "if it is not already outdated, it will be".
- Fact check: VERIFIED. (vendor)
- People: organisation. Capture: loads without login; theme not checked.

### D1-29 · Blog (vendor) · incident.io, "How to build automated runbooks that reduce MTTR by 50%" · 2026-01-08 · score 3
- URL: https://incident.io/blog/automated-runbook-guide
- Text: "Your documentation decays faster than your systems change. That runbook written six months ago? It probably references deprecated commands, old dashboard URLs, or services that no longer exist."
- Underline: "deprecated commands, old dashboard URLs, or services that no longer exist".
- Fact check: VERIFIED (date from the page's metadata). (vendor)
- Caveat: "decays faster than your systems change" is loosely worded and the post sells runbook automation.
- People: organisation. Capture: loads without login; theme not checked.

### D1-30 · Postmortem · Wikimedia Foundation, "Incidents/2021-11-04 large file upload timeouts" · 2021-11-04 · score 2
- URL: https://wikitech.wikimedia.org/wiki/Incidents/2021-11-04_large_file_upload_timeouts
- Text (Links to relevant documentation): "Swift/How To is marked as outdated and would be more useful if it explained how to use the Python Swift client to upload files to Swift"
- Why: the relevant how-to was already flagged outdated and still was the doc on hand. Theme 1. Backup only.
- Fact check: VERIFIED.
- People: organisation; usernames are thanked just above (crop).

---

## Theme 2: calendar-based review does not catch it

### D2-01 · Blog · Stack Overflow Blog, "How Stackers ditched the wiki and migrated to Articles" · 2020-09-28 · score 5 · top 3
- URL: https://stackoverflow.blog/2020/09/28/migration-wiki-documentation-articles/
- Text (appears as a stand-alone pull quote): "The author of 90% of our documentation doesn't work here anymore!"
- Full quote in the body, from Chris Hunt, a site reliability engineer at Stack Overflow: "One, maybe they wrote it to the best of their ability, but it hasn't been updated in a while, and it's no longer accurate given changes in other systems. Two, the author of 90% of our documentation doesn't work here anymore! Now, I could take on the task of updating and migrating that information, but as every developer knows, that means I am now the owner, and I may be hesitant to take on that responsibility"
- Underline: "90% of our documentation", "doesn't work here anymore".
- Why: nobody owns freshness, in one line, from Stack Overflow's own SRE team. The body sentence ("no longer accurate given changes in other systems") is theme 1 as well.
- Fact check: VERIFIED. "90%" is a remark about one team's docs, not a survey result.
- Caveat: the post promotes Stack Overflow's "Articles" feature (vendor-adjacent). Also in the post, from Tom Limoncelli: "I've heard people joke that documentation is where ideas go to die".
- People: organisation; the speaker is a named employee quoted in a company blog (the pull quote itself carries no name).
- Capture: loads without login, light page; whether the pull quote renders as a large styled quote was not checked.

### D2-02 · Book (free online) · Software Engineering at Google, chapter 10 "Documentation" · 2020 · score 4 · top 12
- URL: https://abseil.io/resources/swe-book/html/ch10.html
- Text: "Like code, documents should also have owners. Documents without owners become stale and difficult to maintain."
- Second option, on Google's old internal wiki: "Because there were no true owners for documents, many became obsolete."
- Underline: "Documents without owners become stale", "no true owners".
- Why: ownership, not a calendar, is what the book blames. Theme 2.
- Fact check: VERIFIED.
- People: organisation / published book. Blur: none.
- Capture: loads without login, plain light page.

### D2-03 · Live page · UK Ministry of Justice, Cloud Platform Runbooks, "Cloud Platform Disaster Recovery Scenarios" · checked 2026-11-13 · score 4 · top 7
- URL: https://runbooks.cloud-platform.service.justice.gov.uk/disaster-recovery-scenarios.html
- Text in the page HTML: "This page was last reviewed on 18 July 2025. It needs to be reviewed again on 18 January 2026 by the page owner #cloud-platform-notify." and "This page was set to be reviewed before 18 January 2026 by the page owner #cloud-platform-notify. This might mean the content is out of date."
- Underline: "set to be reviewed before 18 January 2026", "might mean the content is out of date".
- Why: a real, public disaster-recovery runbook whose scheduled review lapsed about 10 months ago. It shows a review date passing with nothing happening, and that the date cannot say whether the page is right or wrong. Theme 2.
- Fact check: VERIFIED that both sentences and both dates are in the HTML. **The site's script decides which sentence is shown**, based on today's date; I did not render it. With the due date in the past, the "set to be reviewed before" (expired) wording should be the visible one. Confirm at capture.
- My own count, same site, same day: of 158 pages linked from the index, 115 carry a review date, and **77 of those 115 (67%) were past their "needs to be reviewed again" date** on 2026-11-13 (earliest lapsed date: 15 January 2026). This is my script's count, not a published statistic. If it goes on screen it must be labelled as our count with the date.
- Caveats: an overdue review does not mean the page is wrong, and we must not imply it. The dates change whenever the team re-reviews, so capture soon and re-check on the day. It singles out one public-sector team; consider cropping the site name and keeping only the banner.
- People: organisation; a Slack channel name appears (harmless, can stay or blur).
- Capture: loads without login, light GOV.UK-style page; the banner is at the very bottom of a long page.

### D2-04 · Blog · unfinished.bike, "The anatomy of a great playbook entry" · 2021-05-21 · score 4 · top 5
- URL: https://write.as/thomrstrom/the-anatomy-of-a-great-playbook-entry (the `tiny.write.as/...` address has a certificate error; use `write.as`)
- Text: "I have never seen quarterly playbook reviews work."
- Context, section "Maintenance": "Keep playbooks up to date by: Regularly scheduled "Wheel of Misfortune" role-playing game sessions ... Post-mortem action items that suggest playbook updates ... Big-bang efforts such as auditing all of the playbooks for relevance are best made once initially".
- Underline: "never seen quarterly playbook reviews work".
- Why: the plainest statement found that calendar review fails. Theme 2.
- Fact check: VERIFIED. It is the last sentence of the post.
- People: individual blogger. Show the blog title "unfinished.bike" at most; blur any personal name or handle (the handle is in the URL bar).
- Capture: loads without login, minimal light page, short post.

### D2-05 · Report · DORA, Accelerate State of DevOps 2021 · 2021 · score 4
- URL: https://dora.dev/publications/pdf/state-of-devops-2021.pdf (PDF, page 23, right after the "How do we improve?" page)
- Text: "Include documentation as part of the software development process. Teams that created documentation and updated it as the system changed have higher quality documentation."
- Underline: "updated it as the system changed".
- Also (page 22): "Define owners. Teams with quality documentation are more likely to have clearly defined ownership of documentation." and "When team members know how to make updates or remove inaccurate or out-of-date information, the team can maintain documentation quality even as the system changes over time."
- Why: the research-backed version of our trigger: update on change, with an owner. It is the positive counterpart to "check every quarter". Theme 2.
- Fact check: VERIFIED in the PDF text. 1,200 respondents in 2021.
- People: organisation. Blur: none.
- Capture: public PDF; the first sentence is bold lead-in text in a call-out box (layout not checked).

### D2-06 · HN comment · user "JumpCrisscross" · 2020-08-10 · score 3
- URL: https://news.ycombinator.com/item?id=24111429
- Text: "The 75% of articles nobody reads aren't a problem. The problem is the 20% of articles everyone reads of which 80% is outdated or inconsistent."
- Underline: "the 20% of articles everyone reads", "80% is outdated".
- Why: age and view counts miss the pages that matter: heavily read and wrong. Theme 2.
- Fact check: VERIFIED. The percentages are rhetorical, not measured. Do not present them as data.
- People: private individual. Blur the handle.
- Capture: loads without login, light page; first paragraph after a quoted line.

### D2-07 · HN comment · user "IE6" · 2020-08-10 · score 3
- URL: https://news.ycombinator.com/item?id=24110365
- Text: "I've run a wiki at work and a lot of the information is outdated but a lot of it is also still really relevant even given that the page has not been touched in 3-5 years."
- Underline: "still really relevant", "not been touched in 3-5 years".
- Why: "last edited" is not a freshness signal; old pages can be right. Theme 2.
- Fact check: VERIFIED.
- People: private individual. Blur the handle.
- Capture: loads without login, light page.

### D2-08 · HN comment · user "lkbm" · 2020-08-10 · score 3
- URL: https://news.ycombinator.com/item?id=24110411
- Text: "So every six months (configurable per doc), it will prompt the designated person to glance over the doc and say "yup, still good". I'm undecided as to how well it works"
- Underline: "glance over the doc and say "yup, still good"".
- Why: the rubber-stamp problem with scheduled re-verification, from a user. Theme 2.
- Fact check: VERIFIED.
- Caveat: the comment names Guru and is mildly positive overall ("a better solution ... than 'let's just delete everything'"). Crop the product name; do not present it as a complaint about Guru.
- People: private individual. Blur the handle.
- Capture: loads without login, light page.

### D2-09 · Blog · Jos Visser, "The loneliness of the long distance runbook" · 2024-12-11 · score 3
- URL: https://josvisser.substack.com/p/the-loneliness-of-the-long-distance
- Text: "Updating a runbook is a common action item resulting from a postmortem. However if you didn't analyze how the runbook got out of date in the first place and how its incorrectness was not perceived by the person following the runbook, you have not solved the real root cause and are likely to end up in the same postmortem in a few months."
- Underline: "end up in the same postmortem in a few months".
- Why: one-off fixes fade; the drift comes back. Theme 2. Long; better as a pull quote than a barrage plate.
- Fact check: VERIFIED. Same post, his advice: "Document the date of the last overhaul at the top of the runbook as a visual indicator for the likelihood of its correctness."
- People: as D1-11.

### D2-10 · Blog · Mike Crittenden, "Wiki bankruptcy" · 2020-08-10 · score 3
- URL: https://critter.blog/2020/08/10/wiki-bankruptcy/ (HN discussion, 168 points: https://news.ycombinator.com/item?id=24109726)
- Text: "This is called Wiki Rot. It's spreading in companies worldwide, and it must be stopped." and "What if, once a year, everything in your company's wiki was deleted? Call it Wiki Bankruptcy."
- Underline: "Wiki Rot", "once a year, everything in your company's wiki was deleted".
- Why: how desperate the calendar answer gets: delete everything yearly. Theme 2.
- Fact check: VERIFIED.
- People: individual blogger under his own name. Blur the name unless a byline is acceptable.
- Capture: loads without login; theme not checked; very short post.

### D2-11 · HN comment · user "BigJono" · 2019-11-11 · score 3
- URL: https://news.ycombinator.com/item?id=21502392
- Text: "We've got bits of docs lying around that were intended to be updated weekly, and regularly fall to the wayside for months at a time."
- Underline: "intended to be updated weekly", "fall to the wayside for months".
- Why: a schedule that nobody keeps. Theme 2.
- Fact check: VERIFIED. Thread: "Confluence is broken. Here's how I plan to fix it".
- Caveat: the comment's last lines call their Confluence "a graveyard of useless pages". Crop that out (see traps).
- People: private individual. Blur the handle.

### D2-12 · HN comment · user "harrisonjohnson" · 2020-08-11 · score 3
- URL: https://news.ycombinator.com/item?id=24124619
- Text: "Unfortunately once you update the wiki, it also grows stale after that moment, so in someways intractable :)"
- Why: a review is a point in time; staleness starts again straight after. Theme 2.
- Fact check: VERIFIED ("someways" is the original spelling).
- People: private individual. Blur the handle.

### D2-13 · Study · Microsoft Research, SoCC '22 (same paper as D1-19) · 2022 · score 2
- URL: https://www.microsoft.com/en-us/research/wp-content/uploads/2022/09/3542929.3563482.pdf
- Text: "existing TSGs should include details about specific telemetry or test process, and they should be carefully reviewed after major changes"
- Why: on-call engineers asking for review after changes, not on a timer. Theme 2. Context, not a plate.
- Fact check: VERIFIED in the PDF text.

### D2-14 · Blog (vendor) · Gremlin, "Ensuring Runbooks are Up-to-Date" · 2019-10-09 · score 2
- URL: https://www.gremlin.com/blog/ensuring-runbooks-are-up-to-date
- Text: "Quarterly runbook reviews are a good benchmark to schedule. If your system changes are happening frequently enough that you discover that your runbooks are getting outdated before the reviews, schedule them monthly."
- Why: the standard advice is a calendar, and when change outruns it the advice is a faster calendar. Theme 2. Context only.
- Fact check: VERIFIED. (vendor) The same post recommends "Put two dates in every runbook: when the contents were last updated and when the contents were last validated."

### D2-15 · Book · Software Engineering at Google, chapter 10 · 2020 · score 2
- URL: https://abseil.io/resources/swe-book/html/ch10.html
- Text: "At Google, we often attach "freshness dates" to documentation. Such documents note the last time a document was reviewed, and metadata in the documentation set will send email reminders when the document hasn't been touched in, for example, three months."
- Why: shows that the state of the art is a timer on "not touched". This is Google endorsing the practice, not criticising it, so it must NOT be used as evidence that calendars fail. Context for the script only.
- Fact check: VERIFIED.

### D2-16 · Community article · Atlassian Community, "[emoji] Keeping Confluence Content Fresh with Automation" (Confluence Cloud Admins group) · date not captured · score 2
- URL: https://community.atlassian.com/forums/Confluence-Cloud-Admins-articles/Keeping-Confluence-Content-Fresh-with-Automation/ba-p/3024065
- Text: the admin's health table defines "Healthy 0–6 months", "Stale 6–12 months", "Inactive 12+ months" by "Last Updated Within", and the rule runs "On the last day of every month at 9:00 AM", "Identifies all pages not updated in 6+ months", "Sends each owner a personalized email listing their pages".
- Why: a clear picture of what "stale" means in Confluence today: months since the last edit. Theme 2. It is a how-to, not a complaint, and the same author is already quoted in our research doc from another thread.
- Fact check: VERIFIED for the words above. A search summary also claimed the article says label changes reset the "last updated" date; I did not find that sentence, so treat that claim as UNVERIFIED.
- People: private individual (community member). Blur name and avatar.

---

## Hard numbers from named surveys and studies

| ID | Figure | Population | Year | Primary URL | Mark | Watch out |
|---|---|---|---|---|---|---|
| D1-01 | 93% observed "incomplete or outdated documentation" as a pervasive problem; 60% of contributors rarely or never contribute to docs | 5,500 randomly sampled respondents from 3,800+ open source repositories on GitHub.com (plus 500+ non-random) | 2017 | https://opensourcesurvey.org/2017/ | VERIFIED | "incomplete or outdated", open source, 2017 |
| D1-16 | 30% name keeping docs in sync with the product as their single biggest challenge; 43% among engineers | 1,131 respondents | 2026 | https://www.stateofdocs.com/2026 and https://www.gitbook.com/blog/documentation-quality-research-2026 | VERIFIED | vendor survey (GitBook); mostly docs professionals |
| D1-17 | 24% say product changes reach the docs the same day; 4% "It often never does" | 329 professionals | 2026 | https://www.mintlify.com/state-of-knowledge/2026 | VERIFIED | vendor survey (Mintlify); product docs |
| D1-18 | about 25% of respondents have good quality documentation (accurate, up-to-date, comprehensive; findable; helps readers) | 1,200 working professionals | 2021 | https://dora.dev/publications/pdf/state-of-devops-2021.pdf | VERIFIED | composite quality, not staleness alone |
| D1-19 | 21% of incidents where manual effort delayed mitigation expected improvements in documentation and training; "Documents-Procedures" is 10.5% of mitigation-failure categories | 152 high-severity incidents at Microsoft Teams over 12 months | 2022 | https://www.microsoft.com/en-us/research/wp-content/uploads/2022/09/3542929.3563482.pdf | VERIFIED | documentation quality in general |
| D1-20 | 6.54% of on-call feedback on troubleshooting guides is about up-to-dateness, at a 13:1 negative ratio | feedback from 400+ on-call engineers on 4K+ guides at Microsoft | 2022 | https://arxiv.org/abs/2205.13457 | VERIFIED | share of feedback, not share of guides |
| D2-03 | 77 of 115 dated runbook pages past their own review date (67%) | one public UK government runbook site | 2026-11-13 | https://runbooks.cloud-platform.service.justice.gov.uk/ | Our own count | not a published stat; changes daily; overdue is not the same as wrong |

## Best real incident stories that name stale documentation or a stale runbook

1. **Wikimedia, JobQueue, 2017-07-18** (D1-06). "Documentation was outdated for jobrunner, dsh, and salt". Job runners were wrongly started in the passive data centre for about 30 minutes after a deploy that fell back from one tool to another; the documented restart step relied on a tool deployers could no longer run. VERIFIED. (A nearby line about Salt is struck through on the page; do not quote it.)
2. **Wikimedia, Elasticsearch upgrade, 2019-03-27** (D1-07). "The documentation associated with the frozen indexing alert is out of date -- Search#Pausing Indexing needs an update (DONE)." Listed under "What went poorly?". VERIFIED.
3. **Reddit, Pi-Day outage, 2023-03-14** (D1-08). "this backup procedure, and the restore, were written several years ago. While the restore had been tested repeatedly and extensively in our pilot clusters, it hadn't been kept fully up to date with changes in our environment". Outage of roughly 5 hours; the trigger was a selector still using a label Kubernetes had renamed. REPORTED (read in a blog that quotes the postmortem; reddit.com not opened).
4. **Wikimedia, deploy incident, 2014-04-03** (D1-09). "While debugging and browsing through the docs, I found many places where the docs were outdated". VERIFIED. Old.

Honourable mention, not a postmortem: **The Register, 2019** (D1-03), a field engineer sent to a cabinet that the documentation named but a rename had moved.

No AWS, Cloudflare, GitHub, GitLab, Slack, Stripe, Monzo, Roblox, Atlassian, Honeycomb, incident.io or Buildkite postmortem that I checked names outdated documentation or an outdated runbook (list below).

## Re-checks of our existing sources (still load, quote exact)

| Existing quote | URL | Result |
|---|---|---|
| "our employees have been complaining about receiving about 100 emails about pages beeing inactive and started to ignore emails sent by confluence...." | https://community.atlassian.com/forums/Confluence-articles/Verified-Pages-Now-Available-in-Confluence/ba-p/2664827 | Loads, exact |
| "The ultimate goal is avoiding the wild goose chase of 'checking pages every three months'. What you should aim for is establishing a system where any update to whatever you're documenting triggers documentation work." | https://community.atlassian.com/forums/discussion/3261835/how-do-teams-keep-confluence-organized | Loads, exact |
| "Step 3 referenced a service that had been renamed eight months ago." (vendor: FreshPage) | https://community.atlassian.com/forums/App-Central-articles/Your-Confluence-wiki-is-confidently-giving-people-wrong/ba-p/3192612 | Loads, exact |
| "more than a quarter of the 1000 most popular projects on GitHub contained at least one outdated reference" | https://arxiv.org/abs/2307.04291 | Loads, exact (abstract; the finding is from the authors' earlier work) |

## Looked for and could not find or could not verify

- **Any X/Twitter, Bluesky or Mastodon post** by a known engineer on stale docs or runbooks. Four searches returned no social posts at all. Named people tried without result: Charity Majors, Kelsey Hightower, Gergely Orosz, Liz Fong-Jones.
- **Jordan Sissel, "Wiki means: where documentation goes to die".** Attributed to him in an HN comment (https://news.ycombinator.com/item?id=22680096, VERIFIED that the comment says so), but I could not find the original post. UNVERIFIED as his words.
- **Reddit threads** (r/sre, r/devops, r/sysadmin, r/ExperiencedDevs, r/confluence): not opened; no new Reddit items.
- **A well-known vendor postmortem that blames an outdated runbook or doc.** Checked with a text search for "out of date / outdated / stale" near docs words, no match: Cloudflare control plane outage (Nov 2023), Cloudflare June 21 2022, Slack Jan 4 2021, Monzo July 29 2019, Atlassian April 2022 (the only hit is outdated customer contact details), Stripe 2019-07-10, Roblox Oct 2021, GitHub Oct 21 2018, Honeycomb "What Comes Up Must First Go Down", incident.io "Intermittent downtime", Buildkite Aug 22. A web search limited to blog.cloudflare.com also found none. Dan Luu's post-mortems list has no entry whose summary mentions outdated docs.
- **Azure post-incident reviews** naming an outdated troubleshooting guide: none found (only the Microsoft blog and papers above).
- **GOV.UK incident reports** naming out-of-date docs: none found.
- **GitLab production incident issues** naming an outdated runbook: GitLab's issue search was too fuzzy to find one. The famous 2017 database outage says the behaviour "was not clearly documented in our engineering runbooks", which is missing docs, not stale docs (see traps).
- **A survey with a percentage of runbooks that are out of date**: none found. The only figures are anecdotes (D1-23) and vendor blogs.
- **A Stack Overflow Developer Survey figure about outdated documentation**: none found.
- **GitHub Octoverse 2021 documentation report** (said to mention "up-to-date" docs): https://octoverse.github.com/2021/creating-documentation/ returns 404. The GitHub blog summary only says "Developers experience a 55% increase in productivity with good documentation."
- **An Atlassian-published statistic on stale Confluence content**: none found.
- **Stack Exchange questions** on stale docs with a quotable line: the API search returned nothing relevant.
- **PagerDuty's 2014 outage postmortem** (pagerduty.com/blog): 403 to my fetch; not read.
- **"97 Things Every SRE Should Know", chapter 41** (O'Reilly): 403; not read.
- Two lines a search summary attributed to an Atlassian Community post, "a page untouched for two years can still be completely correct, and a page reviewed last month can already be wrong" and "When users open a page and see 'Last updated in 2019', trust is gone": **not found** on the page I fetched (https://community.atlassian.com/forums/App-Central-articles/Content-Score-for-Confluence-A-Better-Way-to-Keep-Documentation/ba-p/3220927). UNVERIFIED; do not use until someone finds them on a page. They would be vendor posts in any case.
- A "Computop" case study with a "wiki gardener" per space (search summary only): UNVERIFIED.

## Accuracy traps

- **GitLab, January 31 2017 database outage.** Looks ideal, but the text is "this was not clearly documented in our engineering runbooks" and "nor was it documented properly". That is missing documentation, which we do not answer.
- **Knight Capital and similar "no written procedures" stories.** Missing docs, not stale docs.
- **AWS S3, February 28 2017.** An "established playbook" was followed and a command was mistyped. The playbook was not out of date.
- **GitHub, October 21 2018** and **Atlassian, April 2022.** "Out of date" and "outdated" appear, but about displayed data and customer contact lists, not documentation.
- **Reddit Pi-Day** (D1-08). The outage was caused by config that still used a renamed label. Only the restore procedure is a document story. Do not caption it "an outdated runbook took Reddit down".
- **DORA "about 25% ... good quality documentation"** (D1-18), **GitHub Octoverse "55% increase in productivity with good documentation"**, **Atlassian State of Developer Experience ("insufficient documentation")**, **Stack Overflow survey items on time spent searching.** These are about documentation quality or absence in general. None isolates staleness.
- **GitHub 93%** (D1-01). "Incomplete or outdated" combined, open source, 2017.
- **Uptime Institute outage reports** (outages from staff "failing to follow procedures" or flawed procedures). Data-centre operations and procedure compliance, not code-driven doc drift. Not checked here; leave out.
- **Microsoft's 21% and 6.54%** (D1-19, D1-20). Easy to misstate as "21% of incidents are caused by stale docs". They are not that.
- **HN percentages** (D2-06 "80% is outdated", D1-23 "at least half"). One person's rhetoric or estimate. Never show as statistics.
- **"They are out of date the moment you hit save"** (D1-04), **Simon Willison** (D1-12), **several HN comments.** The authors' fix is automation or docs-in-repo, not a flagging tool. Quote the problem sentence only, and do not imply they endorse us.
- **Anti-Confluence lines.** "Confluence Is Where Documentation Goes To Die" (DEV Community, 2020, https://dev.to/niklasbegley/confluence-is-where-documentation-goes-to-die-3ank, VERIFIED headline and "any documentation you have written there will be hopelessly out of date"), the HN "Knowledge cemetery" comment (https://news.ycombinator.com/item?id=31931311, VERIFIED: "Unless there is a real process around documentation, it just rots"), and "Our confluence is a graveyard of useless pages" (D2-11). They are on theme but mock the host product of an Atlassian hackathon, and they blame the tool rather than change. Recommend leaving them out.
- **Google "freshness dates"** (D2-15) and **Gremlin's quarterly reviews** (D2-14). Both recommend calendar review. They show the status quo; they are not evidence that it fails.
- **MoJ review banner** (D2-03). Overdue for review is not the same as wrong. Our own wording rule applies: never say a page is wrong.
- **Vendor posts** (GitBook, Mintlify, incident.io, Gremlin, and the Stack Overflow posts that promote its own product). Marked (vendor) above. The two 2026 survey numbers are vendor surveys.
- **GitHub "stale bot" complaints.** Time-based staleness for issues, a nice analogy, but about issues, not docs. Not collected.

## Counts

- Items logged: 46 (30 in theme 1, 16 in theme 2).
- **VERIFIED: 45.** **REPORTED: 1** (D1-08, Reddit). **UNVERIFIED in the numbered list: 0.**
- UNVERIFIED leads noted but not numbered: 4 (the Jordan Sissel attribution, two Atlassian Community lines, the Computop case study).
- VERIFIED with score 4 or 5: 19 (D1-01, 02, 03, 04, 05, 06, 07, 11, 12, 13, 15, 16, 17, 21; D2-01, 02, 03, 04, 05).
- Hard numbers from named surveys or studies: 6, plus 1 count of our own.
- Vendor-marked items: 5 (D1-16, D1-17, D1-28, D1-29, D2-14); vendor-adjacent: D1-13, D2-01.
