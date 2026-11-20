# Answers: Daniel (Confluence platform lead, 600 engineers)

## A. First screen only

1. It watches the code and Jira tickets behind a Confluence page and marks the page "Possibly stale" when they change: "When the code or Jira work behind a Confluence page changes, Doc Drift flags it for people and AI agents."
2. "For teams with docs in Confluence." In practice, engineering teams with runbooks tied to repos. Not obvious if it is for page owners, admins or readers.
3. "See how it works", because I want the mechanism and the noise story before I look at an install button. I would not click "Install for Confluence" on a first visit with 600 engineers behind me.
4. Unclear: how it knows which code a page is about (the mock shows "PAY-6" and a path row, but I can't read it as a "link" yet); "flags it for ... AI agents" (what does an agent do with a flag?); what "Possibly stale" costs me in notifications; the mock is cut off at the fold so I can't see the whole PR card; whether Bitbucket is required (the card says "Bitbucket · payments-api").

## B. The whole page

5. Section "Doc Drift catches this." / "From merge to flag in seconds." The line that did it: "Seconds after a merge, the page reads Possibly stale and names the exact change. The owner is told." The hero said it in the abstract; the 3 a.m. terminal story ("zsh: no such file or directory: ./scripts/rollback.sh") made the pain concrete. Note "The page's review date can't see a code change." is the line that speaks to me: it is a dig at page verification apps, which I run today.

6. (1) You link a Confluence page to the files and Jira issues it names; Doc Drift suggests them, you confirm. (2) When a Bitbucket PR merges or a linked Jira issue is closed, plain rules compare the change to the links. (3) If it is big enough (renames, removals), the page gets a "Possibly stale" label, the owner gets a comment, and a person reviews and re-verifies.

7. Agents (Rovo's Drift Reviewer, and coding assistants over MCP) check the page's state before answering and say it may be out of date: "Possibly stale. Do not present steps from this page as current." They never edit: "Agents never edit pages. People do." One wrinkle: "Our agent drafts other edits; nothing changes until you accept." So an agent drafts, a person accepts. That is clear enough, but the two statements sit in different sections and I had to connect them. "Page text changes only when a person clicks to fix it."

8. Trust for: "No AI decides what's stale... Plain rules: same change, same result."; "Respects permissions. People and agents see only pages they can view."; "Built on Atlassian Forge. No servers of ours in between."; edits are a page version under the person's name that history can undo; "Real recording · demo site, Nov 13 ... flagged 19 seconds later." Against: no scopes or data-access list (what does it read in Bitbucket, the diff contents?); "Built on Atlassian Forge" says nothing about the Bitbucket app, which is a separate install I would need approved; "Pages with view restrictions can't be watched yet" is a real gap for a 600-engineer org (restricted pages are common); the install link is "shared with Codegeist 2026 judges first", so is this a hackathon project or supported software? No company, support or security page seen. Single customer-less demo, no named users.

9. Skimmed the six-card "Built into Confluence" grid and the chip row ("Follows renamed files", "Learns from dismissals"): the cards are empty in the full-page captures (blank white tops), so I only got captions. Also the long pinned "From merge to flag" scroll: long gaps between steps 01 to 04 and a slow recording. The 3 a.m. terminal section is more drama than I need.

10. Unclear: "Possibly stale" vs "Stale" (when does it become plain Stale? never defined); "anchored"/"Unanchored" and "Pages anchored" (dashboard) with no explanation; "MCP, an open standard for AI tools" (fine for me, defined but I still don't know what I'd do with it); "Drift Reviewer"; "Learns from dismissals" (learns how? that sounds like a model, contradicts "plain rules"); "Admins can make it stricter or quieter" (where? no detail); "Rovo credits"; "High" in "PR #482 merged by Sam / High" (what is High?).

11. Best: the hero mock with the amber "Possibly stale · Doc Drift" badge and tooltip "PR #482 changed scripts/rollback.sh on Nov 13. Review." That's what my users would see in Confluence. Also the "Without Doc Drift / With Doc Drift" agent toggle and the real recording with a live counter. Off: the huge blank spaces between sections in the static captures (logo alone on empty field after the terminal, big empty gaps beside the pinned steps); in the scroll frames the step mock only changes after long scrolls, and the Bitbucket recording is cropped and tiny (text unreadable) while a "0s... 7s" counter overlaps it. The terminal-to-light gradient is abrupt.

12. Mobile (390): the six feature cards have large empty white tops (looks broken, maybe images not loaded), making the section very long; the agents section has a big empty gap above the bullets. Text itself is readable. I could not judge the mock cards because they appear blank.

13. Night: body text in the steps (grey-teal on dark navy) is lower contrast than in Day, e.g. the "Flag"/"Check" paragraphs and the footnote "No AI decides what's stale..." are dim; step headings are grey rather than bright. Amber stands out well. Large empty dark areas where visuals should be (in the captures).

14. I would try the demo, not install, on first visit. Demo mode "without Bitbucket" is a good low-risk offer but I only saw it as a chip, no link or screenshot of how to open it. To decide I need: the exact scopes/permissions list and where data goes; what the owner notification looks like at scale (is it one comment per page per PR? digest? can I turn it off per space?); noise controls with numbers ("Usually not" for small edits, what thresholds?); pricing beyond "free today"; support/maintainer; behaviour with restricted pages; GitHub/GitLab (we may not be Bitbucket-only, "Bitbucket Cloud today" could be a blocker); rollout path (per space? opt-in per page? bulk linking for 5,000 pages?); an admin view of org-wide state.

15. Scores (1 to 5):
- Clarity of the problem: 4 (the 3 a.m. story is clear; slightly dramatic).
- Clarity of the solution: 4.
- Visual quality: 4 (strong hero and mocks; empty areas hurt).
- Trust: 3 (good principles, thin on specifics and org credibility).
- Length: 3 (long pinned scroll sections; the content itself is fine).

16. Add a short "For admins" section (or expand "A person decides.") that answers my three worries with specifics: exactly what is read and written, a noise-control explanation with the default threshold and a per-space opt-in, and a rollout path ("start with one space, 10 pages"), plus a visible "Try the demo" link. Fix the blank cards on feature grids and mobile as a close second.
