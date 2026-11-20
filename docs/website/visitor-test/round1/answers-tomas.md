# Tomas, round 1 (draft, part A written before opening anything else)

## A. First screen only

1. It watches the code behind a Confluence page and puts a "Possibly stale" badge on the page when a pull request touches what the page describes. "When the code or Jira work behind a Confluence page changes, Doc Drift flags it for people and AI agents."
2. Teams whose docs live in Confluence ("For teams with docs in Confluence"). Probably runbook owners. I'm at the edge of that: my docs are in Confluence, but I'm a reader of them, not the owner.
3. "See how it works", not "Install for Confluence". I don't install anything on my company's Confluence on a first visit, and I want to see the mechanism first.
4. "flags it for people and AI agents": what does flagging an agent mean? The mock page is a bit busy: a tooltip covers part of a table, and the bottom-left Bitbucket card is cut off, so I can't tell what is linked to what. The headline is catchy but "know" is vague. I also don't know what "Possibly stale" is based on: guessing, or matching?

## B. Whole page

5. The 3 a.m. section. The terminal block did it: "$ ./scripts/rollback.sh / zsh: no such file or directory: ./scripts/rollback.sh", then "That script was renamed last week." and "And an AI assistant reads you the same old step." That is my life. The hero only gave me a vague idea; this made the problem concrete.

6. (1) You link a Confluence page to the files and Jira issues it mentions ("Doc Drift suggests the files and Jira issues a page names. You confirm."). (2) When a PR merges in Bitbucket, or a linked Jira issue closes, a deterministic rule decides if the change touches those links ("No AI decides what's stale. Small edits don't flag a page; renames, removals and bigger changes do."). (3) The page gets a "Possibly stale" badge, the owner is notified, and agents are told not to cite it until a person checks it.

7. Agents only read and warn. "Agents never edit pages. People do." and "Page text changes only when a person clicks to fix it." The Rovo agent (Drift Reviewer) and coding assistants over MCP check status before answering: "Payments rollback runbook is Possibly stale. What it describes changed in PR #482 on 2026-11-13". An AI can draft a fix, but "nothing changes until you accept." I like this. It is the thing that made me take it seriously.

8. Trust: "Plain rules: same change, same result", the "Real recording · demo site, Nov 13" with a real 19 s counter, "Built on Atlassian Forge. No servers of ours in between", the honest FAQ ("GitHub and GitLab aren't supported yet"). Against: it's Bitbucket-only and I use GitHub, which is a deal-breaker for my team today. There is no pricing beyond "free today", no names, no customers, no repo link or source, no numbers on false positives. The "Learns from dismissals" chip makes me nervous (learns what? AI?). "The install link is shared with Codegeist 2026 judges first" tells me it's a hackathon project, so I wonder about support.

9. Skimmed the "Built into Confluence." card grid: six small cards plus four chips, a feature list. "Track it in Jira", "dashboard" and "comments" felt like a checklist after the strong story. I also skimmed "Three steps to your first flag" because it ends in "Install". Longest drag: the pinned "How it works" scroll, with big empty gaps between Link, Change, Flag, Check.

10. Unclear or jargon: "Rovo, Atlassian's AI" (I know the name only); "Drift Reviewer"; "MCP" (explained, fine); "anchors" ("anchors changed in PR #482" in the Jira card); "Unanchored" in the badge; "Anchored" in "18 of 24 Pages anchored"; "Possibly stale" vs "Stale" (what's the difference?); "Told to AI agents": told how? "Forge"; "Learns from dismissals"; "Follows renamed files"; "High" next to the PR in the card, with no explanation; "Quick fix ... No AI used"; "Connect Bitbucket... our small Bitbucket app" (a second install).

11. Best: the 3 a.m. terminal, the "Without Doc Drift / With Doc Drift" toggle on the agent question (shows the point in one glance), and the real Bitbucket recording with the "Real time since the merge" counter (19 s). The hero animation (Verified, then PR, then Possibly stale, then the fix) is clear too. Off: the pinned How-it-works stage has a large empty area beside the text, and in the scroll sheet (frames 14-19) the step text and mock page move at different speeds, so I'm unsure which step I'm on. The logo-on-blank-gradient stretch between the 3 a.m. section and "Link" (light part01) is a lot of empty scroll. In the hero, the tooltip covers the table row, and the Bitbucket card is cut off at the bottom. In the full-page captures the six "Built into Confluence" cards and the agent demo show blank tops (probably loaded on scroll; in the scroll sheet, frames 27-30, they fill in). If that lazy reveal is slow, real visitors will see empty white cards. The small "No AI decides what's stale..." caption floats alone under Check.

12. Mobile: I only looked at one part. The agent bullets read fine and the cards stack. But the cards show a big empty white area above each title (about 150 px each, so six of them: a lot of scrolling for nothing). Same blank-reveal issue as desktop, I assume. Text size is fine. I can't judge the pinned section on a phone from these.

13. Dark: seems fine; I saw the cards part. Contrast of the grey card descriptions ("Not fixing it today? Turn the flag into a Jira task.") is lowish on the dark teal. The cards are empty in the capture like in light. The amber badge should stand out well on dark, which is nice. Nothing broken. I prefer dark.

14. I'd try the demo, not install. Installing on my company's Confluence needs a site admin, and we use GitHub. What's missing: a "try it now" link that needs no install, e.g. a 60-second public sandbox or a video; GitHub support or a roadmap; false-positive numbers ("Small edits don't flag a page": where is the threshold?); source code or a repo link; what it costs after "free today"; how it handles a monorepo with 500 docs. The "Replay the demo" is only mentioned in step 2 and the chip "Demo mode without Bitbucket"; make it a primary button.

15. Scores (1 to 5):
- Clarity of the problem: 5 (the 3 a.m. section is excellent)
- Clarity of the solution: 4 (the "how" is clear; the Atlassian jargon blurs it a bit)
- Visual quality: 4 (polished, but the empty gaps and blank cards cost a point)
- Trust: 3 (good principles, "agents never edit", but no proof beyond one demo, no GitHub, a hackathon feel)
- Length: 3 (the story is the right length until "Built into Confluence."; the pinned scroll and the feature grid drag)

16. Move the 3 a.m. problem and the "With / Without Doc Drift" agent comparison up, and give a no-install way to try it ("Try the demo", with the replay of PR #482) as the hero's secondary button instead of "See how it works". Second to that: say plainly in the hero that it's Bitbucket + Confluence today. As a GitHub user I only learned that from the FAQ at the very bottom, which is the kind of late surprise that makes me leave.
