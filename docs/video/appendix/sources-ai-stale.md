# Barrage sources, thread "AI repeats stale docs with confidence" (research, 2026-11-13)

> **Appendix to [../research.md](../research.md).** A research log written by a sub-task on 2026-11-13 and kept as delivered. The main file says which items are planned for the film. Spot-check by the main session, same day: A1-06 (title), A2-01, A4-01, A4-02 and R3 were re-opened and read exactly as logged; the arXiv licences of A1-13 (CC BY 4.0), A2-01 (CC BY-SA 4.0), A2-02 (CC BY 4.0), A2-03 and R3 (arXiv non-exclusive, no reuse licence) were read on the abstract pages.

Raw material for the ~8 s opening barrage of the Doc Drift Sentinel launch film. Web research only: nothing was
downloaded as media and no screenshots were taken. Every item below is new relative to
`docs/research/user-needs-and-competitors.md` sections 2.4 and 5, except the four re-checks at the end.

## How to read this

**Fact-check marks**
- **VERIFIED** = I fetched the page on 2026-11-13 and read the quoted words in the page text (or, for arXiv, in the
  abstract metadata). Where a sub-claim inside a VERIFIED item comes from somewhere else, the item says so.
- **REPORTED** = a credible outlet states it; I did not read it at the primary source.
- **UNVERIFIED** = search snippet only. Do not put on screen until someone opens the page.

**How pages were read.** Plain HTTP fetch with a desktop browser user agent, then text extraction. Atlassian Community
pages render client-side, so their text was read from the JSON embedded in the HTML (post bodies, author names, role
labels, dates). Quotes keep the page's own characters, including typographic apostrophes. Three sites refused the
plain fetch (Gartner 403, The New Stack 403, TechRepublic 403); VentureBeat refused it (429, bot checkpoint) but was
read through the fetch tool. Each case is flagged on the item.

**Score** = visual punch in a fast montage (5 = reads in half a second, a recognisable outlet or a hard number).

**People.** Organisations, bylined journalists, paper authors and public figures can stay. Private individuals get
name, handle and avatar blurred. On Atlassian Community that means everyone whose role label is not "Atlassian Team"
or "Atlassian Partner" (so "Community Champion", "Member", "Contributor", "Specialist" and so on are blurred).

**Tags.** (vendor) = the publisher sells a product in this space. (sponsored) = paid placement in a news outlet.
Both are low priority for the barrage.

**Counts.** 45 new items: 40 VERIFIED, 3 REPORTED, 2 UNVERIFIED. 25 are VERIFIED with score 4 or 5.
Hard numbers from named surveys, analysts or papers: 12 items (A1-10, A1-12, A1-13, A1-15, A2-01, A2-02, A2-09,
A3-01, A3-02, A3-03, A3-04, A3-06).

## Top 12 for the barrage

| # | ID | Source | Text to show | Mark |
|---|---|---|---|---|
| 1 | A4-01 | Atlassian blog, 2026-05-06 | "AI agents are only as good as what they know. Right now, most don’t know enough." | VERIFIED |
| 2 | A1-13 | arXiv 2609.31342, 2026-09-25 | "Stale-Document Poisoning: When Outdated Retrieval Overrides Correct Model Answers" + "outdated retrieval flips 30% of Llama and 37% of Qwen answers" | VERIFIED |
| 3 | A2-01 | arXiv 2610.27381, 2026-10-19 | "63.2% of AI PRs change code without updating any documentation." | VERIFIED |
| 4 | A1-10 | VentureBeat, 2026-07-10 | "57% of enterprises have watched AI agents be confidently wrong." | VERIFIED (see fit caveat) |
| 5 | A3-01 | Stack Overflow Developer Survey 2026 | "I trust it when I can easily verify the output  48.0%" | VERIFIED |
| 6 | A3-02 | Atlassian Teamwork Lab, 2026-09-01 | "77% of knowledge workers say it’s important for AI to thoroughly understand their company’s institutional knowledge, but only 21% believe it does." | VERIFIED |
| 7 | A1-06 | Atlassian Community question, 2026-07-03 | "ROVO Agent - It always reads from an OLD confluence source." | VERIFIED |
| 8 | A4-02 | jira.atlassian.com ROVO-730, 2026-04-07 | "the agent continues to serve outdated information with the same confidence as current information." | VERIFIED |
| 9 | A1-03 | Practical 365 (Tony Redmond), 2024-05-20 | "Gently Rotting Documents Can Corrupt Copilot Output" | VERIFIED |
| 10 | A1-05 | Reworked, 2026-10-08 | "Why Your AI Assistant Cites Outdated Policy" | VERIFIED |
| 11 | A2-05 | Thoughtworks Technology Radar, 2026-11-04 | "AI-driven documentation sprawl" (ring: Caution) + "obsolete context can lead AI tools astray" | VERIFIED |
| 12 | A1-01 | Microsoft Support, 2026-07-01 | "Copilot can give outdated answers if you point it at an old website or an earlier version of a file." | VERIFIED |

Alternates, in order: A2-02 (23.0% of repositories), A2-06 (Addy Osmani, "documentation rots"), A1-08 (eWeek
headline), A3-03 (DORA 30%), A1-02 (Microsoft Tech Community), A2-03 (arXiv "When Instruction Files Go Stale"),
A2-08 (dev.to headline, blur author), A2-04 (GitBook, vendor), A1-12 (Slite 76%, vendor).

Balance notes: at most two arXiv plates in a row or they blur into one; Atlassian appears four times in the top 12
(A4-01, A3-02, A1-06, A4-02), which suits Codegeist judges, but keep A1-06 and A4-02 apart so it does not read as
an attack on Rovo. One possible order: enterprise assistants (A1-12 or A1-05, A1-03, A1-06) → coding agents (A2-01,
A2-05, existing 79-of-80 arXiv plate) → the numbers (A1-10, A3-01, A3-02) → hold on A4-01.

---

## Sub-theme 1: Enterprise assistants over company knowledge

### A1-01 · Vendor help page · Microsoft Support · ms.date 2026-07-01 · score 4 · top 12
- URL: https://support.microsoft.com/en-us/microsoft-365-copilot/what-information-does-copilot-use-to-answer-my-prompt
- Page title: "What information does Copilot use to answer my prompt?"
- Text: "Copilot can give outdated answers if you point it at an old website or an earlier version of a file."
- Underline: "outdated answers"; "earlier version of a file"
- Why: Microsoft says it in its own help centre. The assistant repeats whatever version it is handed.
- Fact check: VERIFIED. The sentence sits under the heading "Limitations and tips of grounding in Copilot", near the
  end of the page. Next sentence: "Make sure you're linking the latest version, and if several similar files exist,
  point Copilot at the specific one."
- People: organisation. Blur: none.
- Capture: no login. Long page; the sentence is far down, and I could not tell from the text whether that section is
  inside a collapsed accordion, so check before capture. Light page.

### A1-02 · Vendor blog · Microsoft Tech Community (Microsoft Mission Critical Blog) · 2026-10-30 · score 4
- URL: https://techcommunity.microsoft.com/blog/microsoftmissioncriticalblog/sharepoint-is-becoming-the-knowledge-platform-for-copilot/4568483
- Headline: "SharePoint Is Becoming the Knowledge Platform for Copilot"
- Text: "A powerful model grounded in outdated policies, duplicate documents, unclear ownership, or overly broad
  permissions can produce polished but unreliable answers."
- Underline: "outdated policies"; "polished but unreliable answers"
- Why: Microsoft staff, two weeks old, names outdated policies as the first cause of confident wrong answers.
- Fact check: VERIFIED. Author login "jeresmith" carries the "Microsoft" rank on the page; I did not confirm the
  full name. Post time 2026-10-30, page metadata modified 2026-10-28.
- People: Microsoft employee posting on a Microsoft blog. The handle can stay or be cropped.
- Capture: no login. Quote is in the opening section. Light page.

### A1-03 · Trade press · Practical 365, Tony Redmond · 2024-05-20 · score 4 · top 12
- URL: https://practical365.com/microsoft-365-archive-copilot/
- Headline (H1): "Microsoft 365 Archive Could Help SharePoint Online Cope with Digital Debris". First subheading, which
  search engines also show as the title: "Gently Rotting Documents Can Corrupt Copilot Output"
- Text options: the subheading, or "Copilot only sees words. It has no sense of importance, accuracy, obsolescence, or
  usefulness."
- Underline: "Gently Rotting Documents"; "no sense of ... obsolescence"
- Why: a well-known Microsoft 365 author says the assistant cannot tell an obsolete file from a current one.
- Fact check: VERIFIED, both strings. Also on the page: "the likelihood exists that Copilot will consume and reuse
  digital debris in its responses."
- People: bylined author, public. Blur: none.
- Capture: no login; the page shows a newsletter form that complains about ad blockers. The subheading is just below
  the H1. Light page. Note the date: 2024, the oldest item in the top 12.

### A1-04 · Trade press · Petri, Brien Posey · 2026-09-15 · score 4
- URL: https://petri.com/sharepoint-advanced-management-copilot-readiness-tool/
- Headline: "SharePoint Advanced Management Is Really a Copilot Readiness Tool"
- Text options: section heading "2. Remove outdated content before Copilot treats it as authoritative", or "Copilot
  has no way of knowing if the information contained within a document is current or if that information is outdated
  and no longer accurate."
- Underline: "before Copilot treats it as authoritative"; "no way of knowing"
- Why: plain statement that the assistant has no freshness signal.
- Fact check: VERIFIED. Also: "This means that if Copilot has access to outdated information, then Copilot responses
  are also likely to be incorrect."
- People: bylined author. Blur: none.
- Capture: no login. The section heading is mid-page. Light page.

### A1-05 · Trade press · Reworked, Karteek Sonapuram (contributing author) · 2026-10-08 · score 4 · top 12
- URL: https://www.reworked.co/information-management/when-your-ai-assistant-still-quotes-last-weeks-policy/
- Headline: "Why Your AI Assistant Cites Outdated Policy — and How to Fix It" (the URL slug reads "when your ai
  assistant still quotes last week's policy"; the headline on the page is the one quoted here)
- Text options: the headline, or "Outdated AI answers often get blamed on hallucination, but the assistant is usually
  quoting a real document that has since been replaced."
- Underline: "Cites Outdated Policy"; "a real document that has since been replaced"
- Why: draws exactly our line between hallucination and stale source documents.
- Fact check: VERIFIED. The same article is syndicated at vktr.com (not opened).
- People: contributor byline; crop it or leave it.
- Capture: no login. Headline at top. Light page.

### A1-06 · Community question · Atlassian Community (Rovo questions) · 2026-07-03 · score 4 · top 12
- URL: https://community.atlassian.com/forums/discussion/3256922/rovo-agent-it-always-reads-from-an-old-confluence-source
  (the old-style link https://community.atlassian.com/forums/Rovo-questions/ROVO-Agent-It-always-reads-from-an-OLD-confluence-source/qaa-p/3256932 redirects to a reply anchor in the same thread)
- Title: "ROVO Agent - It always reads from an OLD confluence source."
- Second text option (the poster's follow-up reply): "the agent still appears to be referencing the content from the
  original page and returns answers based on that data."
- Underline: "always reads from an OLD confluence source"
- Why: a customer's own words, in capitals, on Atlassian's forum.
- Fact check: VERIFIED. Accuracy note: this case is an agent that kept answering from a page the user had replaced
  and deleted (a knowledge-source and indexing problem), not a page made stale by a code change. Use the title, not
  a claim about the cause. The opening post itself is a long pasted prompt, so only the title is screenshot-worthy.
- People: poster is a private individual (label "Member"). Blur name and avatar. Repliers include two "Community
  Champion" members and one "Atlassian Partner" (Midori).
- Capture: no login. Title is at the top. Light page.

### A1-07 · Community question · Atlassian Community (Rovo questions) · 2025-12-03 · score 3
- URL: https://community.atlassian.com/forums/discussion/3156949/how-to-avoid-rovo-using-archived-content-in-chat-results
- Title: "How to avoid Rovo using archived content in CHAT results?"
- Text: "we realized when using Rovo Chat we have a lot of outdated results. This is because Rovo uses our archived
  pages for responses."
- Alternative (a reply in the same thread): "nothing is more frustrating than getting “smart” AI answers that are
  actually based on content your team archived years ago for a reason. It really breaks trust when people rely on
  Rovo Chat for quick, accurate info."
- Underline: "a lot of outdated results"; "It really breaks trust"
- Fact check: VERIFIED, both strings. A later reply (Community Champion) says archived pages should be excluded from
  the index on Confluence Premium, so the poster's diagnosis is disputed in the thread.
- People: both posters are private individuals (labels "Contributor" and "Specialist"). Blur names and avatars.
- Capture: no login. Question text is at the top; the reply needs a scroll. Light page.

### A1-08 · News · eWeek (eWEEK Staff) · 2026-10-20 · score 4
- URL: https://www.eweek.com/news/ai-agents-changing-workplace-records/
- Headline: "AI Agents Struggle to Track Changing Workplace Records, Even With More Data"
- Text option: "A company updates its records, but its AI agent may still rely on outdated information."
- Underline: "may still rely on outdated information"
- Why: recognisable outlet; the sentence is the product pitch in one line.
- Fact check: VERIFIED (headline and sentence). The article reports the MMEnterprise-Bench preprint (A1-09) and says
  itself that the results "do not establish production failure rates."
- People: staff byline. Blur: none.
- Capture: no login. The sentence is the first paragraph. Light page. The lead image is stock photography; leave it out.

### A1-09 · Research preprint · arXiv 2610.27911 (KAIST and Korea University per eWeek) · 2026-10-20 · score 3
- URL: https://arxiv.org/abs/2610.27911
- Title: "MMEnterprise-Bench: Evaluating Enterprise Agents over Evolving Multimodal Records"
- Text: "even the strongest models struggle when evidence contains cross-source or temporal conflicts"
- Underline: "temporal conflicts"
- Fact check: VERIFIED (title, authors Lee, Kim, Ko, Lee, Choi, Ku, Kim; abstract). Comments field: "Under review".
  The figures eWeek gives (best model 32.5% on questions requiring historical information with 10 retrieved records,
  52.6% overall) are REPORTED: they are not in the abstract and I did not open the PDF.
- People: academic authors. Blur: none.
- Capture: no login, abstract visible, light page.

### A1-10 · News · VentureBeat, Sean Michael Kerner · 2026-07-10 · score 5 · top 12
- URL: https://venturebeat.com/orchestration/57-of-enterprises-have-watched-ai-agents-be-confidently-wrong-the-fix-is-an-agentic-context-layer-but-who-has-one/
- Headline: "57% of enterprises have watched AI agents be confidently wrong. The fix is an agentic context layer, but
  who has one?"
- Underline: "57%"; "confidently wrong"
- Why: a hard number in a headline from a known outlet.
- Fact check: VERIFIED for the headline, byline and date, read through the fetch tool (a direct fetch got HTTP 429
  and a "Vercel Security Checkpoint" page). The tool relayed these lines, which should be re-read at capture: "57% of
  enterprises traced a confident but wrong AI agent answer to missing or inconsistent business context"; "a VB Pulse
  June 2026 survey of 101 qualified enterprises with more than 100 employees"; "traces it back to a stale metric
  definition or a document the retrieval system never pulled".
- Fit caveat: the 57% is about "missing or inconsistent business context", which includes stale definitions and
  documents but is wider than stale docs. Show the headline; do not caption it as "57% caused by stale docs".
  A follow-up VentureBeat piece reportedly raises the figure to 68% in a July wave (UNVERIFIED, search snippet).
- People: journalist. Blur: none.
- Capture: no login expected in a normal browser, but an automated browser may hit the bot checkpoint. Small sample
  (101), VentureBeat's own survey.

### A1-11 · News, sponsored · Raconteur, Kezia Jungco · 2026-11-02 · score 3 · (sponsored)
- URL: https://www.raconteur.net/ai/your-ai-problem-might-actually-be-a-content-problem
- Headline: "Your AI problem might actually be a content problem"
- Text option: "An assistant that summarises an outdated document may waste an employee’s time. An agent that checks a
  contract against policy and updates another system can carry the mistake into a live process."
- Underline: "a content problem"; "carry the mistake into a live process"
- Fact check: VERIFIED. The page carries a "Sponsored by" block and the quoted expert is Box's EMEA president, so
  treat this as Box-sponsored content. Low priority.
- People: journalist byline; Box executive quoted (public). Blur: none.
- Capture: no login. A "Save in your account" overlay appears in the page text; dismiss it. Light page.

### A1-12 · Vendor survey · Slite, Femke Plantinga · 2026-06-23 · score 4 · (vendor)
- URL: https://slite.com/learn/dangers-of-stale-documentation
- Headline: "The Hidden Dangers of Stale Documentation in 2026"
- Text options: "More than three in four had watched an AI tool at their company surface an outdated doc and
  confidently produce a wrong answer." or "76% had an AI tool surface a stale doc and produce a wrong answer."
- Underline: "76%"; "confidently produce a wrong answer"
- Why: the only figure found that measures exactly this failure.
- Fact check: VERIFIED as Slite's own words. Sample: "We asked 143 founders, operators, and engineers for their worst
  stories about stale documentation", so it is small and self-selected (people with a story to tell), published by a
  company that sells a knowledge base. If shown, show it as Slite's survey of 143, never as an industry statistic.
  Also on the page: "AI doesn't make stale docs dangerous. Stale docs were always dangerous. AI just makes them
  confidently wrong at scale."
- People: organisation; author byline can be cropped. Named survey participants appear lower down; keep them out.
- Capture: no login. First option is in the intro. Light page.

### A1-13 · Research preprint · arXiv 2609.31342 (Ahmed, Poech, Röttger) · 2026-09-25 · score 5 · top 12
- URL: https://arxiv.org/abs/2609.31342
- Title: "Stale-Document Poisoning: When Outdated Retrieval Overrides Correct Model Answers"
- Text: "outdated retrieval flips 30% of Llama and 37% of Qwen answers even without instructions to trust the
  document"
- Underline: "Outdated Retrieval Overrides Correct Model Answers"; "30%"; "37%"
- Why: a paper title that states the problem, with a number: the model had the right answer and the old document
  made it wrong.
- Fact check: VERIFIED from the abstract. More from the abstract: "explicit follow instructions raise these rates to
  66% and 75%"; "matched up-to-date evidence is followed in 97-100% of trials"; benchmark of "317 verified knowledge
  reversals across medicine, law, software, and platform policy". Comments: "17 pages, 3 figures". Preprint.
- Fit caveat: the benchmark uses public facts that changed (medicine, law, software, platform policy), fed in as
  retrieved documents. It is about retrieval of an outdated document, which is our mechanism, but it is not a study
  of internal wikis. Open-weight models only for the headline numbers.
- People: academic authors. Blur: none.
- Capture: no login, abstract visible, light page. The word "Poisoning" could be misread as a security story; the
  paper is about ordinary stale documents, so pair it with the subtitle.

### A1-14 · Research paper · arXiv 2503.04800 (Ouyang et al., ACL 2025 per search results) · 2025-03-03, v3 2025-07-18 · score 3
- URL: https://arxiv.org/abs/2503.04800
- Title: "HoH: A Dynamic Benchmark for Evaluating the Impact of Outdated Information on Retrieval-Augmented Generation"
- Text: "outdated information significantly degrades RAG performance"
- Underline: "outdated information"; "significantly degrades"
- Fact check: VERIFIED (title, dates, abstract). The abstract continues: "it can mislead models into generating
  potentially harmful outputs, even when current information is available." A figure quoted on secondary sites
  ("at least 20% performance drop") is not in the abstract: UNVERIFIED. ACL 2025 venue: REPORTED.
- People: academic authors. Blur: none.
- Capture: no login, light page.

### A1-15 · Analyst survey · Gartner, via CX Today · survey July to August 2024, article 2024-12-16 · score 3
- Secondary URL (read): https://www.cxtoday.com/contact-center/44-of-service-leaders-explored-a-customer-facing-genai-voicebot-in-2024/
- Primary URL (not readable, HTTP 403 to my fetch): https://www.gartner.com/en/newsroom/press-releases/2024-12-09-gartner-survey-reveals-85-percent-of-customer-service-leaders-will-explore-or-pilot-customer-facing-conversational-genai-in-2025
- Text (CX Today's words, not Gartner's): "61 percent of leaders face a backlog of articles to edit, and over one-third
  lack a formal process for updating outdated content."
- Underline: "61 percent"; "lack a formal process for updating outdated content" (other sites reword this as "no
  formal process"; that wording is not on the page I read)
- Fact check: REPORTED. CX Today gives the sample as "187 customer service and support leaders". The population is
  customer-service knowledge bases feeding GenAI, not engineering wikis. If this is wanted, capture the Gartner press
  release itself in a real browser and re-read the sentence there.
- People: organisations. Blur: none.

## Sub-theme 2: Coding agents and stale docs or instructions

### A2-01 · Research paper · arXiv 2610.27381 (De Michele, Tantithamthavorn) · 2026-10-19 · score 5 · top 12
- URL: https://arxiv.org/abs/2610.27381
- Title: "Documentation Drift in AI-Generated Pull Requests"
- Text: "63.2% of AI PRs change code without updating any documentation."
- Underline: "63.2%"; "without updating any documentation"
- Why: this is the event Doc Drift Sentinel watches for (a merged PR that moves the code and leaves the page behind),
  measured at scale: "29,669 AI-generated pull requests from 2,585 repositories".
- Fact check: VERIFIED from the abstract. Comments: "Accepted at APSEC 2026 (Early Research Achievements)". Also in
  the abstract: "77.5% for refactoring"; "documentation debt tends to accumulate rather than be revisited."
- Fit caveat: "documentation" here means documentation files in the same repository, not Confluence pages.
- People: academic authors. Blur: none.
- Capture: no login, abstract visible, light page.

### A2-02 · Research preprint · arXiv 2606.09090 (Treude, Baltes) · 2026-06-08 · score 4
- URL: https://arxiv.org/abs/2606.09090
- Title: "Context Rot in AI-Assisted Software Development: Repurposing Documentation Consistency for AI Configuration
  Artifacts"
- Text: "identifies stale code element references in 23.0% of repositories"
- Underline: "Context Rot"; "23.0% of repositories"
- Why: names the phenomenon and gives a number for CLAUDE.md, AGENTS.md and .cursorrules files.
- Fact check: VERIFIED from the abstract: "a statistically representative sample of 356 repositories". The abstract
  calls this "preliminary evidence". Christoph Treude also co-wrote arXiv 2307.04291, which we already cite.
- People: academic authors. Blur: none.
- Capture: no login, light page.

### A2-03 · Research preprint · arXiv 2611.09802 (Mehtiyev, Tadesse, Arkoh, Assunção) · 2026-11-06 · score 4
- URL: https://arxiv.org/abs/2611.09802
- Title: "When Instruction Files Go Stale: Documentation Debt and Hidden Cost in Coding Agents"
- Text: "agents follow stale guidance when it is relevant to their tasks, sometimes even when correct information is
  available elsewhere."
- Second option: "none repaired the underlying instruction file."
- Underline: "follow stale guidance"; "even when correct information is available elsewhere"
- Why: a second, independent paper on the same behaviour as our existing 79-of-80 item, one week old, using real
  stale instructions from open-source repositories ("732 trajectories of two models").
- Fact check: VERIFIED from the abstract. Honest reading: the measured cost is modest ("about two extra tool calls per
  run" on one case; "in the other cases, we could not detect a difference") and agents "generally recovered".
  Do not caption it as agents failing tasks.
- People: academic authors. Blur: none.
- Capture: no login, light page.

### A2-04 · Vendor research · GitBook Research · page dated 2026-11-13 by the fetch tool; runs on 2026-10-04, 06 and 08 · score 4 · (vendor)
- URL: https://www.gitbook.com/research/docs-defect-experiment
- Headline: "What documentation defects cost AI coding agents"
- Text options: "Agents believe your docs over your API." or "In 72 runs with docs, no agent ever doubted them." or
  "Drift is the dangerous docs defect."
- Underline: "believe your docs over your API"; "no agent ever doubted them"
- Why: short, quotable lines from a controlled test of Claude Code and Codex CLI ("84 runs in total").
- Fact check: VERIFIED for the three quotes and the run counts. The publication date came from the fetch tool, not
  from text I read myself, so confirm it on the page. The test is a toy API (a risotto-cooking fixture) with planted
  defects in public-style API docs, run by a docs vendor: illustrative, not a field measurement. Author is written in
  first person and not named in the text I read.
- People: organisation. Blur: none.
- Capture: no login. The quotes are bold lead-ins to paragraphs in the findings and discussion sections. Check theme.

### A2-05 · Analyst-style publication · Thoughtworks Technology Radar · 2026-11-04 · score 4 · top 12
- URL: https://www.thoughtworks.com/radar/techniques/ai-driven-documentation-sprawl
- Blip title: "AI-driven documentation sprawl" · ring: "Caution" ("Proceed with caution")
- Text: "When coding agents read through a repository littered with outdated architectural decision records or
  conflicting specification files, these redundant and contradictory documents consume valuable context and provide
  unreliable information."
- Shorter option: "obsolete context can lead AI tools astray and result in poor code generation."
- Underline: "Caution"; "outdated architectural decision records"; "lead AI tools astray"
- Why: a respected, vendor-neutral voice, nine days old.
- Fact check: VERIFIED.
- People: organisation. Blur: none.
- Capture: no login. Blip text is visible under the title with the ring badge. Light page.

### A2-06 · Blog post · Addy Osmani (addyosmani.com) · 2026-02-23 · score 4
- URL: https://addyosmani.com/blog/agents-md/
- Headline: "Stop Using /init for AGENTS.md"
- Text: "Because here’s the thing nobody talks about: documentation rots."
- Longer option: "Real-world AGENTS.md files that haven’t been touched in six months - describing a dependency you’ve
  since replaced, a directory structure that’s changed - are going to be worse. Much worse."
- Underline: "documentation rots"; "Much worse."
- Fact check: VERIFIED on his own site. Secondary blogs attribute a "worse than no file at all" phrasing to him; that
  wording is not on this page, so do not use it.
- People: public figure (well-known engineer and author). Blur: none.
- Capture: no login. The line is in the "Layer 3: A maintenance subagent" paragraph, mid-article. Check theme.

### A2-07 · Vendor documentation · Anthropic, Claude Code Docs · undated (live docs, read 2026-11-13) · score 3
- URL: https://code.claude.com/docs/en/memory
- Page title: "How Claude remembers your project"
- Text: "if two instructions contradict each other, Claude may pick one arbitrarily. Review your CLAUDE.md files,
  nested CLAUDE.md files in subdirectories, and .claude/rules/ periodically to remove outdated or conflicting
  instructions."
- Underline: "may pick one arbitrarily"; "outdated or conflicting instructions"
- Why: the agent maker's own docs admit the upkeep burden falls on people.
- Fact check: VERIFIED.
- People: organisation. Blur: none.
- Capture: no login. The sentence is a bullet labelled "Consistency", mid-page. Docs site has light and dark themes.
- Note: Doc Drift Sentinel is built with Claude Code. Showing this is fair (it is their documentation), but it is a
  judgment call whether to single out one agent vendor.

### A2-08 · Blog post · DEV Community (private author) · 2026-07-10 · score 4
- URL: https://dev.to/wolfejam/your-agentsmd-is-already-stale-and-your-agent-trusts-it-completely-2nfh
- Headline: "Your AGENTS.md Is Already Stale — And Your Agent Trusts It Completely"
- Text option: "A human reads a stale README and thinks "hmm, that looks old." An agent reads your AGENTS.md and acts
  on it"
- Underline: "Already Stale"; "Trusts It Completely"
- Fact check: VERIFIED. The post leads into the author's own tooling series, so it is opinion with a commercial edge.
- People: private individual. Blur name, handle and avatar.
- Capture: no login. Headline at top. DEV has light and dark themes.

### A2-09 · Research preprint · arXiv 2610.32578 (Aliabadi) · 2026-10-23 · score 3
- URL: https://arxiv.org/abs/2610.32578
- Title: "Lessons Outlive Their Failures: A Case Study of Rules for AI Coding Agents"
- Text: "Stale documentation (drift) was the largest failure class (48 of 118)"
- Underline: "Stale documentation (drift)"; "largest failure class"
- Fact check: VERIFIED from the abstract. It is a single-author, single-repository six-week case study and says so:
  "I report them as exploratory"; "35 of those were found on one audit day."
- People: academic author. Blur: none.
- Capture: no login, light page.

### A2-10 · Research preprint · arXiv 2610.32196 (Huang et al.) · 2026-10-23 · score 3
- URL: https://arxiv.org/abs/2610.32196
- Title: "SWE-Shift: Evaluating Coding Agents in Evolving Workspaces"
- Text: "Tool/session changes and stale evidence yield zero paired success across all systems."
- Underline: "stale evidence"; "zero paired success across all systems"
- Fact check: VERIFIED from the abstract ("We evaluate 17 coding-agent systems").
- Fit caveat: this tests changes that arrive while the agent is mid-task, not stale documentation. Use only if a
  second-tier "agents do not refresh what they read" beat is wanted.
- People: academic authors. Blur: none.

### A2-11 · Research preprint · arXiv 2608.21964 (Duan et al.) · 2026-08-22 · score 3
- URL: https://arxiv.org/abs/2608.21964
- Title: "Repo2Skill-Evo: Repository Skills Go Stale in Silence"
- Text: "it may become stale without raising any explicit signal, while continuing to provide obsolete guidance."
- Underline: "Go Stale in Silence"; "obsolete guidance"
- Fact check: VERIFIED from the abstract: "every evaluated transition invalidates part of the V1 skill set" across
  "57 real-world repositories and 105 selected release transitions".
- People: academic authors. Blur: none.

### A2-12 · Company engineering blog · Codeminer42 ("The Miners"), Edy Silva · 2026-10-16 · score 3
- URL: https://blog.codeminer42.com/stale-docs-are-prompt-injection-you-wrote-yourself/
- Headline: "Stale docs are prompt injection you wrote yourself"
- Text option: "An agent can’t tell a paragraph that used to be true from a rule in force, so a stale ADR steers it
  wrong and it follows with full confidence."
- Underline: "Stale docs"; "follows with full confidence"
- Fact check: VERIFIED.
- Trap: the headline says "prompt injection". It is a metaphor for stale docs, not a security story, but a viewer who
  reads it in half a second may take it as one, and security stories are out of scope. Prefer the body quote.
- People: consultancy blog with an employee byline; crop the byline.

### A2-13 · Vendor report · Mintlify, "The 2026 State of Knowledge Report" · 2026 (August data) · score 3 · (vendor)
- URL: https://www.mintlify.com/state-of-knowledge/2026
- Text: "2026 marks the first year on record that AI agent readership of Mintlify-powered sites crossed the majority
  line."
- Second option: "Agents answer from whatever they can reach"
- Underline: "AI agent readership"; "crossed the majority line"
- Why: sets up the stakes (agents now read docs more than people do) without a wrong-answer claim.
- Fact check: VERIFIED. The page gives "Agent share 66%" for August 2026 ("257 million agent web requests and 131
  million human page loads"). It is one docs host's own telemetry, about public product docs.
- People: organisation. Blur: none.

### A2-14 · GitHub issue · openai/codex #51505 · 2026-10-06 · score 2
- URL: https://github.com/openai/codex/issues/51505
- Title: "[macOS / ChatGPT Work] Agent follows outdated local Project instructions after web update"
- Text option: "the agent may appear to be making reasoning mistakes while actually following instructions that the
  user has already replaced!"
- Fact check: VERIFIED (title, date, sentence). Open issue, 2 reactions when searched. It is a sync bug report, and
  the reporter says the root cause is not established.
- People: private individual. Blur name and avatar.
- Capture: no login. GitHub follows the viewer's theme.

## Sub-theme 3: Trust numbers

### A3-01 · Survey · Stack Overflow, 2026 Developer Survey · 2026 (coverage dated October 2026) · score 5 · top 12
- URLs: https://survey.stackoverflow.co/2026/ (overview, where the trust charts are) and
  https://survey.stackoverflow.co/2026/ai
- Question on the page: "How much do you trust the output from AI tools or AI agents as part of your workflow?"
- Chart rows (verbatim): "I trust it when I can easily verify the output 6,872 48.0%"; "I trust it for many tasks,
  including important work decisions 949 6.6%"; "I do not trust it for most work tasks 1,754 12.3%"
- Prose options: "that trust is conditional—48% trust AI only when it comes to low risk, easily verifiable tasks." and
  "93% of our respondents think that it all comes down to citing your sources."
- Underline: "48.0%"; "when I can easily verify the output"; "6.6%"
- Why: the current-year survey, and it points at verification and sources, which is what a freshness state gives an
  agent.
- Fact check: VERIFIED. Population: "30,903 Responses 169 Countries" (survey overview); 14,304 answered the trust
  question (sum of the six rows). The 93% is the sum of "Very important 52.1%", "Important 26.5%" and "Somewhat
  important 14.0%" on source attribution.
- Trap: the same paragraph says trust went up ("more than 87% of respondents had some level of trust in AI’s outputs,
  a huge increase from 31% last year"). See accuracy traps: the 2025 "46% distrust" plate now has a newer survey that
  frames trust as rising but conditional.
- People: organisation. Blur: none.
- Capture: no login. Charts render as tables in the HTML and as SVG in a browser. Site has a Light, Dark and System
  colour theme switch.

### A3-02 · Survey · Atlassian Teamwork Lab, Conor Donegan (Atlassian blog) · 2026-09-01 · score 5 · top 12
- URL: https://www.atlassian.com/blog/ai-at-work/want-more-confidence-in-ai-give-it-more-context
- Headline: "Want more confidence in AI? Give it more context."
- Text: "77% of knowledge workers say it’s important for AI to thoroughly understand their company’s institutional
  knowledge, but only 21% believe it does."
- Second option: "Just 12% of knowledge workers say their AI understands the company as well as a senior employee"
- Underline: "77%"; "only 21% believe it does"
- Why: Atlassian's own number, two months old, on the gap between what AI should know about the company and what it
  does know. Also counts under sub-theme 4.
- Fact check: VERIFIED. Method, from the page: "Between July 28 and August 3, 2026, Atlassian’s Teamwork Lab conducted
  a double-blind survey of 1,002 full-time U.S. knowledge workers".
- Fit caveat: this is about missing context, not stale context. Fair as "AI does not know what the company knows".
- People: organisation; byline is Atlassian staff. Blur: none.
- Capture: no login. The 77% and 21% also appear as a chart section headed "Workers want to trust AI with real work,
  but don’t think it knows enough yet". Light page.

### A3-03 · Survey · DORA (Google Cloud), 2025 State of AI-assisted Software Development · 2025-09-23 · score 4
- URL: https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report
- Headline: "Announcing the 2025 DORA Report: State of AI-Assisted Software Development"
- Text: "skepticism remains as 30% report little or no trust in the code generated by AI"
- Underline: "30%"; "little or no trust"
- Fact check: VERIFIED on the Google Cloud blog. Population: "survey responses from nearly 5,000 technology
  professionals". The sentence continues "a slightly lower percentage than last year". The full report PDF
  (https://services.google.com/fh/files/misc/2025_state_of_ai_assisted_software_development.pdf) was not opened.
  I did not find a 2026 DORA report; not searched exhaustively.
- People: organisation. Blur: none.
- Capture: no login. The sentence is in a bullet list near the top. Light page.

### A3-04 · Survey · Atlassian, State of Developer Experience 2026, Andrew Boyagi (Atlassian blog) · 2026-10-20 · score 4
- URL: https://www.atlassian.com/blog/developer/developer-experience-report-2026
  (report landing page: https://www.atlassian.com/teams/software-development/state-of-developer-experience-2026)
- Headline: "AI is making developers faster. It’s also exposing what’s broken in software delivery"
- Text options: "Finding information takes top spot again in 2026 as the biggest source of friction" or "65% of
  developers now regularly spend time correcting AI output." or "87% of developers say AI helps them ship work
  faster, but 72% experience the same or more friction than before AI."
- Underline: "Finding information"; "65%"; "correcting AI output"
- Fact check: VERIFIED for all three strings. Population, from the landing page: "a survey of 1,500+ software
  practitioners". The "51 percent" figure for finding information is REPORTED (Techzine, via search snippet); the
  blog post gives the ranking without the number.
- People: organisation. Blur: none.
- Capture: no login. Light page.

### A3-05 · Survey · Atlassian, State of Developer Experience 2025, Andrew Boyagi (Atlassian blog) · 2025-07-09 · score 3
- URL: https://www.atlassian.com/blog/developer/developer-experience-report-2025
- Headline: "Atlassian research: AI adoption is rising, but friction persists"
- Text: "Developers report the top time-wasters as: finding information (services, docs, APIs), adapting new
  technology, and context switching between tools."
- Underline: "finding information (services, docs, APIs)"
- Fact check: VERIFIED. Population: "we surveyed 3,500 developers and managers across six countries". Superseded by
  A3-04; use one of the two.
- People: organisation. Blur: none.

### A3-06 · Survey · University of Melbourne with KPMG, "Trust, attitudes and use of artificial intelligence: A global study 2025" · fieldwork Nov 2024 to Jan 2025 (per search results) · score 3
- URL (read): https://kpmg.com/cy/en/insights/ai-and-technology/trust-attitudes-and-use-of-ai.html
- Text: "Many rely on AI output without evaluating accuracy (66%) and are making mistakes in their work due to AI
  (56%)."
- Underline: "without evaluating accuracy (66%)"; "mistakes in their work due to AI (56%)"
- Fact check: VERIFIED on KPMG's page: "surveyed more than 48,000 people across 47 countries". Fieldwork dates are
  REPORTED. This is general AI use at work, not documents or retrieval; it supports "people act on AI output
  unchecked", nothing more.
- People: organisations. Blur: none.
- Capture: no login. Read on KPMG Cyprus; the global KPMG page likely carries the same block but was not opened.

### A3-07 · Vendor survey, via sponsored article · Box, "2026 State of AI in the Enterprise" · 2026 · score 2 · (vendor)
- URL (read): https://www.raconteur.net/ai/your-ai-problem-might-actually-be-a-content-problem
- Text (Raconteur's words): "96% of organisations consider access to company-specific content important for agents,
  yet only 36% have connected agents to trusted internal content across many use cases."
- Fact check: REPORTED. Box's report itself was not opened; sample size not seen.

### A3-08 · Survey · Slack Workforce Index (Workforce Lab) · June 2024 · score 3
- URL (not opened): https://slack.com/intl/en-in/blog/news/the-workforce-index-june-2024
- Claimed text: "just 7% of desk workers consider the outputs of AI completely trustworthy for work-related tasks"
- Fact check: UNVERIFIED (search snippet only). Also two years old. Do not use without opening the page.

### A3-09 · Vendor survey · Glean, Work AI Index 2026 · 2026 · score 2 · (vendor)
- URL (not opened): https://glean.com/blog/work-ai-index-productivity-paradox
- Claimed: 53% of workers say important information they need is not accessible from their AI tools; survey of 6,000
  full-time workers in the US, UK and Australia.
- Fact check: UNVERIFIED (search snippet only). It measures missing information, not stale information.

## Sub-theme 4: Atlassian's own words

### A4-01 · Company blog · Atlassian, Jamil Valliani · 2026-05-06 (modified 2026-08-06) · score 5 · top 12
- URL: https://www.atlassian.com/blog/company-news/teamwork-graph-team-26
- Headline: "Atlassian Teamwork Graph: The context engine behind your AI—everywhere"
- Text: "AI agents are only as good as what they know. Right now, most don’t know enough."
- Follow-on lines: "Not because the AI is broken, but because the data is." and "Agents guess. They hallucinate. Teams
  splinter around different versions of the truth."
- Underline: "only as good as what they know"; "different versions of the truth"
- Why: the Team '26 announcement post opens with our premise, in Atlassian's voice.
- Fact check: VERIFIED. These are the first body lines, below a banner note that reads "Teamwork Graph CLI is now GA!".
- People: organisation; Atlassian byline. Blur: none.
- Capture: no login. Light page.

### A4-02 · Public feature request · jira.atlassian.com, ROVO-730 · created 2026-04-07 · score 4 · top 12
- URL: https://jira.atlassian.com/browse/ROVO-730
- Title: "Knowledge Source Freshness Monitoring for Rovo Agents" · Type: Suggestion · Status: "Gathering Interest" ·
  Votes: 2 · Component: Agents
- Text: "Rovo agents are only as good as the content they draw from. When knowledge source pages are not updated, the
  agent continues to serve outdated information with the same confidence as current information."
- Other lines: "Silent accuracy drift. Content staleness degrades accuracy without triggering any alert or
  re-evaluation." and "Freshness is not correctness."
- Underline: "outdated information"; "same confidence as current information"
- Why: on Atlassian's own public tracker, in the Rovo project, describing our problem almost word for word.
- Fact check: VERIFIED that the text is on the page. Not verified: who wrote it. The reporter is shown as a named
  person whose role I could not confirm (Atlassian staff often file suggestions on customers' behalf, but the page
  does not say). So this is "a request on Atlassian's public tracker", not "Atlassian says". With 2 votes it shows the
  problem is recognised, not that it is popular.
- People: blur the reporter's name and avatar.
- Capture: no login (the page states that the tracker is public). Classic Jira layout, light. The quote is the first
  paragraph under "Problem Statement".

### A4-03 · Community article by Atlassian staff · Atlassian Community (Jira Service Management articles), Arzoo Jain · 2026-07-23 · score 4
- URL: https://community.atlassian.com/forums/discussion/3266011/your-knowledge-base-is-the-engine-behind-your-ai-jsm-feature-roundup
- Title: "Your Knowledge Base Is the Engine Behind Your AI (JSM Feature Roundup)" (the title starts with a rocket emoji)
- Text: "If you've ever wondered why your AI features aren't quite hitting the mark or why draft replies miss the
  mark, the answer is almost always the same: it's not the AI. It's the knowledge behind it."
- Underline: "it's not the AI. It's the knowledge behind it."
- Fact check: VERIFIED. Author label on the page: "Atlassian Team". The post also mentions "trying to keep your
  knowledge base from going stale".
- People: Atlassian staff, can stay. Commenters are private or partners; keep them out of frame.
- Capture: no login. The quote is the first paragraph. Light page.

### A4-04 · Hackathon page · Codegeist 2026 on Devpost (Atlassian) · read 2026-11-13 · score 4
- URL: https://codegeist2026.devpost.com/
- Title: "Codegeist 2026: Build with context. Ship with confidence."
- Text: "AI can think. But knowing what to do – really knowing – takes context."
- Also on the page: "help teams ship with confidence – whether that’s surfacing the right knowledge at the right
  moment, connecting work across silos, or turning organizational data into a decision that actually moves work
  forward."; category "Apps for Software Teams: Give dev teams the context to ship with confidence."; bonus prizes
  "6 Best Agents - Rovo/Assignable agents" and "6 Best app with Atlassian MCP: $1500 to 6 projects that use a Forge
  app exposing an MCP server."
- Underline: "takes context"; "the right knowledge at the right moment"
- Why: the contest's own framing. It does not mention stale or outdated content anywhere; it frames the need for
  right context, which is the positive form of our problem.
- Fact check: VERIFIED.
- People: organisation. Blur: none.
- Capture: no login. Light page. Showing the contest page inside a contest entry is a taste call.

### A4-05 · Community article by Atlassian staff · Atlassian Community (Enterprise articles), Tamulyn Takakura · 2026-05-27 · score 3
- URL: https://community.atlassian.com/forums/discussion/3238735/teamwork-graph-rovo-power-ai-with-your-organizations-connected-work-context
- Title: "Teamwork Graph & Rovo - power AI with your organization's connected work context"
- Text: "AI coding agents are only as useful as the context they can access."
- Fact check: VERIFIED in the page source; author label "Atlassian Team". I did not check where in the long article
  the sentence sits (search results place it in the Teamwork Graph CLI section), so it may need a scroll.
- People: Atlassian staff, can stay.

### A4-06 · Product guide · Atlassian, Confluence best practices · undated · score 3
- URL: https://www.atlassian.com/software/confluence/resources/guides/best-practices/confluence-rovo
- Page title: "Automate your content workflow with Confluence and Rovo"
- Text: "Outdated content clogs every workspace — old launch notes, abandoned strategies, duplicate docs. Searching
  for current info becomes harder every quarter."
- Section heading: "Clean up stale content automatically"
- Underline: "Outdated content clogs every workspace"
- Fact check: VERIFIED. Note what Atlassian recommends there: "automatically archiving stale pages after a set
  period of inactivity, like six months". That is the time-based approach our pitch argues against, so this plate
  doubles as the "what exists today" beat.
- People: organisation. Blur: none.

### A4-07 · News · diginomica · 2026-05-06 · score 3
- URL: https://diginomica.com/atlassian-team-26-context-not-just-ai-rovo-teamwork-graph-dia
- Headline: "Atlassian Team '26 – why context, not 'just AI', is the bet behind Rovo, the Teamwork Graph and Dia"
- Text (the journalist's paraphrase, not a quotation of Cannon-Brookes): "Atlassian CEO Mike Cannon-Brookes makes the
  case that context, not models, is now the central question in enterprise AI."
- Fact check: REPORTED. The headline is verified as on the page; the sentence is the outlet's summary of an off-stage
  briefing, so it must not be shown inside quotation marks attributed to him. I did not find a keynote transcript.
- People: public figure named in a headline. Blur: none.

---

## Re-check of the four items we already plan to show

### R1 · Atlassian Community thread, "How does Rovo handle conflicting or incomplete information"
- Loads: yes, HTTP 200 without login. The link in our doc (…/qaa-p/3268873) redirects to
  https://community.atlassian.com/forums/discussion/comment/3268873#Comment_3268873. Thread URL:
  https://community.atlassian.com/forums/discussion/3268324/how-does-rovo-handle-conflicting-or-incomplete-information
- Exact title: "How does Rovo handle conflicting or incomplete information?" (with the question mark)
- Original poster and date: shown as "AGASTYA SHARMA", 2026-07-28. Label "Specialist". Private individual: blur.
- Quote 1: exact. "Rovo can't automatically identify official sources of truth because it simply synthesizes whatever
  content a user can access. If pages conflict, it won't reliably pick the correct version or flag contradictions."
  Author Arkadiusz Wroblewski, 2026-07-29; it is the accepted answer in the page's structured data.
  **He is labelled "Community Champion", which is a volunteer role, not Atlassian staff.** Under our rule he is a
  private individual, so blur his name and avatar, and never caption this as Atlassian's answer. (A web search
  summary wrongly called it "an Atlassian staff reply".)
- Quote 2: exact. Full sentence: "The question that follows is how you decide which of two disagreeing pages is the
  outdated one, because that is the part Rovo can't do for you." Author Levente Szabo _Midori_, label "Atlassian
  Partner" (vendor, can stay; mark as vendor).
- Capture: the question and the accepted answer are near the top; the Midori reply needs a scroll. Light page.

### R2 · Atlassian Community article, "Rovo is about to quote your most outdated Confluence page"
- Loads: yes, HTTP 200 without login. Our link (…/ba-p/3265660) redirects to
  https://community.atlassian.com/forums/discussion/3265660/rovo-is-about-to-quote-your-most-outdated-confluence-page
- Exact title: "Rovo is about to quote your most outdated Confluence page"
- Author and date: Levente Szabo _Midori_ ("Atlassian Partner"), 2026-07-22. Vendor article for Midori's "Better
  Content Archiving and Analytics" app.
- Quote: exact. "Creation got automated. Maintenance did not." (next sentence: "Closing that gap is the entire job of
  an autonomous space.")
- Stronger lines on the same page, both verified: "Without a content lifecycle strategy, Rovo will quote your stale
  pages back to your team as fact." and "The new one is everybody trusting the same outdated page at once, instantly,
  because a machine stated it with confidence."
- Capture: the title is at the top; the quoted line is several paragraphs down, at the end of the section "Are you
  feeding Rovo stale information?". The body uses red cross emoji in a list. Light page.

### R3 · arXiv 2610.30571
- Loads: yes, https://arxiv.org/abs/2610.30571 (HTTP 200, no login).
- **Exact title: "Stale Instruction Files Override the Code in Coding Agents: A One-Sentence Fix".** Our doc calls it
  "Stale Code Inconsistencies in Coding Agents" and links to emergentmind.com; that title is Emergent Mind's own
  relabelling (their page loads and shows it), not the paper's. Fix the title and link to arXiv for the capture.
- Authors: Xiaonan Xu, Wenjing Wu. Submitted 22 Oct 2026, v1, cs.SE. Comments: "14 pages, 8 figures. Submitted to SN
  Computer Science." So it is a preprint under submission, not peer reviewed.
- Quote: exact. "Claude Code pointed out the conflict in 79 of 80 runs and still followed the file."
- Other figures, exact: "Without the sentence, 90.1% of the agents' choices followed the stale file."; "The sentence
  raised the share of choices that follow the code from 4.2% to 91.4%"; "40 Python projects"; "320 runs"; "Codex CLI
  rewrote the existing code to match the file in 20 of 80 runs, and the project's own tests then failed in 17 of
  them."
- Wording check on our doc: "4.2% followed the code" is an inference from "from 4.2% to 91.4%" and is fair. The
  projects are synthetic ("We built 40 Python projects"), so do not call them real repositories.
- Capture: the abstract is visible without expanding; on the arXiv page the words CLAUDE.md and AGENTS.md render as
  auto-links ("this http URL") in the abstract, which looks odd in a tight crop. Crop to the Results sentence.

### R4 · Stack Overflow 2025 Developer Survey numbers
- Loads: yes, primary at https://survey.stackoverflow.co/2025/ai (HTTP 200, no login). The TechRepublic link in our
  doc returned a Cloudflare block (HTTP 403) to my fetch, so I could not re-read it; capture the primary instead.
- Exact text: "More developers actively distrust the accuracy of AI tools (46%) than trust it (33%), and only a
  fraction (3%) report "highly trusting" the output."
- Exact text: "The biggest single frustration, cited by 66% of developers, is dealing with "AI solutions that are
  almost right, but not quite,""
- Population: the survey home page says "over 49,000+ responses from 177 countries"; the trust question had 33,244
  responses (67.8%). Chart values: highly trust 3.1%, somewhat trust 29.6%, somewhat distrust 26.1%, highly distrust
  19.6% (these four were relayed by the fetch tool; the two sentences above I read in the page text).
- Title and author: page title "AI | 2025 Stack Overflow Developer Survey"; publisher Stack Overflow; no personal
  author. Release date is not printed in the text I read (my recollection is late July 2025: unverified).
- **Now superseded:** the 2026 survey is live (A3-01) and says trust rose. See accuracy traps.

---

## Adjacent, not for the barrage (not counted)

- Model knowledge cut-off on public libraries: Context7, "Why AI coding agents use outdated APIs, and how to fix it"
  (https://context7.com/guides/why-ai-coding-agents-use-outdated-apis, 2026-10-22, vendor; title verified).
- Same: arXiv 2406.09834, "LLMs Meet Library Evolution: Evaluating Deprecated API Usage in LLM-based Code Completion"
  (2024-06-14; title verified).
- Context files in general, not staleness: arXiv 2602.11988, "Evaluating AGENTS.md: Are Repository-Level Context
  Files Helpful for Coding Agents?" (2026-02-12; title verified; the ETH Zurich study Addy Osmani refers to).
- Within-session staleness: arXiv 2610.05281, "When Agent Context Goes Stale: Incoherence in Volatile Agent Context"
  (2026-10-04; title verified). Punchy title, but it is about tool observations going stale inside one agent run.
- Hallucination rather than stale sources: Computerworld, "Is Copilot for Microsoft 365 a lying liar?" (search result
  only, not opened).

## Looked for and could not find or verify

- **A Gartner or Forrester line that names stale or outdated content as a cause of RAG or agent failure.** Gartner's
  newsroom returned 403 to every fetch. The Gartner items that surfaced are about "AI-ready data" in general
  ("Lack of AI-Ready Data Puts AI Projects at Risk", 2025-02-26; a reported 60% of AI projects abandoned without
  AI-ready data) and are not about stale documents. Only A1-15 is close, and it is REPORTED.
- **The Register, Ars Technica, InfoWorld, TechCrunch, Computerworld or CIO.com reporting on an assistant citing a
  stale internal document.** Several searches; nothing on-topic from these outlets. The New Stack has
  "context-rot-enterprise-ai-llms" (https://thenewstack.io/context-rot-enterprise-ai-llms/), which returned 403; a
  search snippet suggests it is Elastic-sponsored. UNVERIFIED and not listed.
- **Microsoft Learn's sentence "Inactive sites often contain outdated content, cluttering Copilot's data source and
  leading to less accurate responses."** It appears in search snippets for
  learn.microsoft.com/sharepoint/sharepoint-copilot-best-practices, but that URL (English and Polish) now redirects
  to a different page ("Secure and govern Microsoft Copilot: Foundational deployment guidance", updated 2026-11-03)
  that does not contain it. Not capturable today.
- **A Microsoft statement that archiving "runs the risk of polluting Copilot and agent behaviors with outdated, cold,
  and/or stale data".** Search snippet only; I could not find the primary. UNVERIFIED, not listed.
- **Reddit threads** (r/sysadmin, r/microsoft365, r/ClaudeAI, r/cursor, r/atlassian). Reddit returned 403 to fetches
  and searches surfaced no new threads on this theme. Nothing listed.
- **Hacker News threads of any size** on agents acting on stale internal docs. Algolia search found only small
  "Show HN" tool launches (for example "Agents-lint – detect stale paths and context rot in AGENTS.md files",
  1 point). Nothing listed.
- **X or Bluesky posts by known engineers** (Karpathy, Willison, Hashimoto, Ball and others) on this theme. None
  surfaced. Addy Osmani's blog post (A2-06) is the only named-engineer item.
- **Glean, Guru, Notion AI, Slack AI or Gemini documentation admitting stale answers.** Nothing first-party found.
  Third-party articles describe Guru and Notion verification features; not opened, not listed.
- **An Atlassian statement that Rovo ranks or prefers Verified pages.** Not found. Search results indicate a Verified
  filter in Confluence search and state that ranking signals are undocumented. Unconfirmed either way.
- **A verbatim Mike Cannon-Brookes quote from Team '26 on context or content quality.** Only the diginomica
  paraphrase (A4-07). No transcript found.
- **Atlassian's learning lesson line "Rovo answers quality relies on the knowledge base's accuracy and clarity".**
  The lesson URL from search results returned 404. UNVERIFIED, not listed.
- **VentureBeat's July follow-up (68%)** and **the MMEnterprise-Bench figures inside the PDF**: not opened.
- **A 2026 DORA report**: not found in the searches run.

## Accuracy traps

1. **Stack Overflow 2025 versus 2026.** The planned plate says "46% distrust, 33% trust" (2025). The 2026 survey is
   out and says "more than 87% of respondents had some level of trust in AI’s outputs, a huge increase from 31% last
   year". The two years asked different questions (the 2026 options are conditional, such as "when I can easily
   verify the output"), and 2026 quotes last year as 31% where the 2025 page says 33%. Showing the 2025 number in a
   film released in December 2026 invites "that is last year's data, and trust went up". Either date the plate
   "2025" on screen, or use the 2026 rows (48.0% only when easily verifiable; 6.6% for important work decisions).
2. **The accepted Rovo answer is not from Atlassian.** Its author is a Community Champion (volunteer). Blur him and
   do not attribute the sentence to Atlassian.
3. **Wrong paper title in our doc.** arXiv 2610.30571 is "Stale Instruction Files Override the Code in Coding Agents:
   A One-Sentence Fix". "Stale Code Inconsistencies in Coding Agents" is an aggregator's label.
4. **Preprints.** A1-09, A1-13, A2-02, A2-03, A2-09, A2-10, A2-11 and R3 are arXiv preprints. Only A2-01 states an
   acceptance (APSEC 2026) and A1-14 is reported as ACL 2025. Say "preprint" or "arXiv", not "study proves".
5. **Model names.** Abstracts name "Claude Sonnet 5.5", "GPT-6 Astra", "GPT-5.6 Sol", "Llama" and "Qwen". If a crop
   shows a model name, the film is making a claim about that product; crop to the sentence that carries the number.
6. **A1-13 is not about internal wikis** and its headline numbers are for open-weight models. Caption as "outdated
   retrieved documents", not "Rovo" or "Copilot".
7. **A1-10's 57% is about business context that is missing or inconsistent**, a wider cause than stale docs, from a
   survey of 101 enterprises run by the outlet itself.
8. **A1-12's 76% is a vendor's survey of 143 people who were asked for their "worst stories".** It cannot stand for
   "76% of companies".
9. **A1-06 and A1-07 describe index and archive behaviour**, and in A1-07 a later reply disputes the diagnosis. Show
   the customers' words as their experience, not as a statement of how Rovo works.
10. **A4-02 is a suggestion on Atlassian's tracker with 2 votes and an unverified reporter.** "On Atlassian's public
    tracker" is true; "Atlassian admits" is not supported.
11. **A4-07 is a paraphrase.** No quotation marks around it with Cannon-Brookes's name.
12. **Sponsored and vendor items** (A1-11, A1-12, A2-04, A2-13, A3-07, A3-09, R2 and the Midori reply in R1) should not
    carry the barrage. If one is used for its wording, keep the publisher's name in frame.
13. **"Prompt injection" in A2-12's headline** reads as a security story at montage speed.
14. **Practical 365 (A1-03) has two titles**: the H1 and the first subheading. The punchy one is the subheading; the
    screenshot must show it as it appears, not as the article headline. The piece is from 2024.
15. **Honest wording still applies in the barrage captions.** These sources show assistants repeating outdated
    content; none shows that a specific company's page is wrong. Captions should say "outdated" or "stale", in line
    with the product's "never say a page is wrong" rule.
16. **Capture blockers.** VentureBeat (bot checkpoint), Gartner (403), The New Stack (403) and TechRepublic (403)
    refused non-browser fetches; plan those captures in a real browser session. Atlassian Community and
    jira.atlassian.com render client-side; wait for content before capture and dismiss the cookie banner.
17. **Dates.** Everything was read on 2026-11-13. Live docs pages (A1-01, A2-07, A4-06) and the Devpost page can
    change; re-read the sentence at capture time. Microsoft already moved one Learn page this month (see "could not
    find").
