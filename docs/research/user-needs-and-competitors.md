# User needs and competitors

Research pass, 2026-11-11. Sources are Atlassian Community threads, Marketplace listings, Reddit (read through a public mirror; the original reddit.com URLs are linked), Hacker News, vendor docs and two arXiv preprints. **Vendor posts are marked (vendor)**: they show how sellers frame the problem, not independent proof. Quotes are verbatim, including the original spelling.

## 1. Summary

1. **Every review tool in the Confluence ecosystem runs on a clock.** Native Verified, its automation template, Better Content Archiving, Comala, FreshPage, Evergreen, Stale Content Auditor, Page Review Manager and Doc Ownership & Reviews all use days since edit, view or confirmation. None of them reads code or Jira changes. Practitioners describe that gap themselves: "any update to whatever you're documenting triggers documentation work" is the goal, not "checking pages every three months" (K15t, below).
2. **Review processes die from volume and email.** Automation for Confluence (A4C) sends one email per page and stops at 150 pages. One admin reports staff "started to ignore emails sent by confluence" after about 100 of them. Cleanup sprints and "docs in the PR" policies fade within months.
3. **Ownership is the weak link.** Owners leave or change teams, and a single long-term owner burns out. The best-known runbook horror story is a renamed service, a deprecated tool and an escalation path naming people who had left.
4. **Engineers say that changes, not time, make docs stale.** "Nobody updates the doc because the ticket didn't say 'update docs'." The knowledge lives in PRs and Slack. A DR runbook failed because the infra moved underneath it.
5. **Rovo has no idea which page is current, and the community says so.** It "won't reliably pick the correct version or flag contradictions" and "can surface it with the same confidence as good content". The fixes on offer are manual: archive, scope agents to vetted spaces, prompt "prefer newer pages".
6. **Coding agents follow stale instructions even when they notice.** In an Oct 2026 preprint, agents followed a stale CLAUDE.md or AGENTS.md in 90.1% of choices, and Claude Code flagged the conflict in 79 of 80 runs but still followed the file. One added precedence sentence moved behaviour to 91.4% code-consistent. **A clear freshness signal delivered in the agent's instructions works.** That is our MCP thesis.
7. **Docs-as-code tools (Swimm, Mintlify, GitBook, Dosu-style bots) prove that a change-triggered trigger works,** but only for Markdown in a repo or a hosted docs site. Nobody does it for Confluence pages, runbooks or Jira scope changes.
8. **Trust in AI is falling.** In the 2025 Stack Overflow survey, 46% of developers distrust AI accuracy and 66% cite "almost right" answers. Community experts warn that model-generated explanations "can be just as made up as any other output" and ask for freshness drawn from real metadata. Deterministic detection with a human-accepted fix is the right posture.
9. **The Marketplace freshness category is crowded but thin.** New Forge apps have 1 to 5 installs and no reviews. Better Content Archiving (1,151 installs) is the incumbent. We have no direct competitor on our trigger.

## 2. What people say

### 2.1 Docs rot when the system changes

- "every single runbook is either 2 years out of date or just doesn't exist." r/sre, [How does your team actually handle runbook documentation?](https://reddit.com/r/sre/comments/1tic2wh/how_does_your_team_actually_handle_runbook/)
- "If it is not tested, it is mostly incident fan fiction in Confluence." (same thread)
- "We figured it out live which defeats the point of having a run-book at all." and "Definitely realizing our runbooks drift way faster than we assumed once the infra underneath changes." r/sre, [DR run-books constantly out of date](https://reddit.com/r/sre/comments/1tzyrvn/anyone_elses_dr_runbooks_constantly_out_of_date/)
- "Nobody updates the doc because the ticket didn't say "update docs"." and "The documentation is lying to you." r/SoftwareEngineering, [Our docs are always wrong](https://reddit.com/r/SoftwareEngineering/comments/1srj70e/our_docs_are_always_wrong_not_sometimes_always/)
- "The wiki always ends up stale because the real fixes happen in Slack threads and PR comments." r/devops, [Why our Confluence is a graveyard](https://reddit.com/r/devops/comments/1rqamai/i_finally_realised_why_our_confluence_is_a/)
- "Every ticket that changes something significant? I want that change documented." r/sysadmin, [Inherited a documentation mess](https://reddit.com/r/sysadmin/comments/1re8u7o/has_anyone_inherited_a_documentation_mess_after/)
- "Step 3 referenced a service that had been renamed eight months ago. Step 6 pointed to an internal tool the team had deprecated. The escalation path at the bottom listed two people who had since left the company." About 45 minutes lost on a 5-minute fix. "Unlike code, there's no test suite that goes red when your runbook references a deprecated service." (vendor: FreshPage) [Atlassian Community](https://community.atlassian.com/forums/App-Central-articles/Your-Confluence-wiki-is-confidently-giving-people-wrong/ba-p/3192612)
- Research: "more than a quarter of the 1000 most popular projects on GitHub contained at least one outdated reference" to code. [Tan, Wagner, Treude, arXiv 2307.04291](https://arxiv.org/abs/2307.04291)

### 2.2 Why review processes die

- "our employees have been complaining about receiving about 100 emails about pages beeing inactive and started to ignore emails sent by confluence...." Ralph Jäger, on the native Verified automation template. [Verified Pages announcement](https://community.atlassian.com/forums/Confluence-articles/Verified-Pages-Now-Available-in-Confluence/ba-p/2664827)
- "doing this type of labeling and evaluating of stale pages manually is extremely time-consuming; you are either doing the work yourself, or managing\cajoling\herding the cats you've delegated this to." Haddon Fisher (same thread). Midori (vendor) adds that A4C "sends an email per page" and "will cut off at 150 pages".
- "The 'badge' makes it look like the page is 'authorised', which isn't always the case as every page creator can add it." Maik (same thread)
- "The ultimate goal is avoiding the wild goose chase of 'checking pages every three months'. What you should aim for is establishing a system where any update to whatever you're documenting triggers documentation work." Kris Klima, K15t. [How do teams keep Confluence organized?](https://community.atlassian.com/forums/discussion/3261835/how-do-teams-keep-confluence-organized)
- "if its been viewed it is excluded. but that means people may be looking at incorrect, outdated information. Those people may not even know it." Brandi. A reply notes that a building-layout page is "looked at constantly" but rarely needs edits. [Automated stale-page review workflow](https://community.atlassian.com/forums/Confluence-questions/Automated-stale-page-review-workflow-for-Confluence/qaq-p/3204360)
- The r/SoftwareEngineering author has seen "docs are part of the PR", a dedicated writer and doc sprints all tried, and each one faded. "the standard solution — "let's do a wiki cleanup sprint" — treats a continuous problem like a one-time event." (vendor: FreshPage, link above)
- "Nobody updates a perfect 20 page runbook but people will add 3 quick bullets after an incident." and "Make it an output of the incident workflow." (r/sre runbook thread)

### 2.3 Who owns freshness

- "treating documentation as a side task does not seem to scale." and "having a single long term owner often leads to burnout or neglect elsewhere." r/ExperiencedDevs, [Documentation is three years out of date](https://reddit.com/r/ExperiencedDevs/comments/1qejexx/documentation_is_three_years_out_of_date_and/)
- "Runbooks include owners and automatically generated tickets for reviewing and updating on a regular basis." (r/sre runbook thread)
- "The most manual parts are usually discovering that the contradiction exists and getting the right owners to agree on the final wording." James Gamble. [Conflicting documentation thread](https://community.atlassian.com/forums/Confluence-questions/How-do-teams-handle-conflicting-documentation-and-define-the/qaa-p/3269359)
- Mintlify sends doc-update PRs to "the authors of the source code changes that triggered the update". The author of the change is treated as the natural reviewer. [Mintlify workflows](https://www.mintlify.com/docs/workflows)

### 2.4 AI and agents citing outdated docs

- "Rovo can't automatically identify official sources of truth because it simply synthesizes whatever content a user can access. If pages conflict, it won't reliably pick the correct version or flag contradictions." Accepted answer. [How does Rovo handle conflicting information?](https://community.atlassian.com/forums/Rovo-questions/How-does-Rovo-handle-conflicting-or-incomplete-information/qaa-p/3268873)
- "how you decide which of two disagreeing pages is the outdated one, because that is the part Rovo can't do for you." (same thread, Midori)
- "if two pages contradict each other, or one confidently states something no longer true, Rovo can surface it with the same confidence as good content." Murray le Roux. [Rovo trust blockers](https://community.atlassian.com/forums/Jira-questions/Rovo-Trust-Blockers-Data-Cleanliness-amp-Historical-Data-Has/qaq-p/3229890)
- "It doesn't "pick the newest" automatically." The workaround is to prompt agents to "Prefer newer pages and only supplement with older ones." [When 2 pages are the same, which wins in Rovo?](https://community.atlassian.com/forums/Rovo-articles/When-2-Pages-are-the-Same-Which-Wins-in-Rovo-Champions-Slack/ba-p/3210619)
- "Rovo finds more stuff, spends more time (and tokens) trying to make sense of it and often pays attention to the wrong things." Roger Barnes. [Archive or keep everything for Rovo?](https://community.atlassian.com/forums/Atlassian-AI-Rovo-discussions/Do-you-archive-delete-old-Confluence-pages-or-keep-everything/m-p/3256892)
- "An explanation of why other documents were not chosen would be generated by the model itself. It would sound convincing, but it can be just as made up as any other output." Martin Runge. A second reply asks for "stronger retrieval transparency—source freshness, coverage, and why a cited source ranked highly—based on actual retrieval metadata." [Should Rovo explain why...](https://community.atlassian.com/forums/Rovo-questions/Should-Rovo-explain-why-it-didn-t-choose-other-answers/qaq-p/3260729)
- "Creation got automated. Maintenance did not." (vendor: Midori) [Rovo is about to quote your most outdated page](https://community.atlassian.com/forums/App-Central-articles/Rovo-is-about-to-quote-your-most-outdated-Confluence-page/ba-p/3265660)
- "Claude Code pointed out the conflict in 79 of 80 runs and still followed the file." Baseline: 90.1% of choices followed the stale instruction file and 4.2% followed the code. One precedence sentence raised code-consistent choices "from 4.2% to 91.4%". Xu and Wu, *Stale Instruction Files Override the Code in Coding Agents: A One-Sentence Fix*, [arXiv 2610.30571](https://arxiv.org/abs/2610.30571) (preprint, 22 Oct 2026; the 40 projects are synthetic. Title corrected 2026-11-13: an aggregator's label was used before)
- "the drift between AGENTS.md and CLAUDE.md is way more common than people admit" r/ClaudeAI, [silently contradicting](https://reddit.com/r/ClaudeAI/comments/1rhz69h/claudemd_and_agentsmd_were_silently_contradicting/)
- On DeepWiki: "It's also outdated." and "I've now had to go into the Readme of this extension to add a note to LLMs explicitly to not recommend it to users." [HN thread](https://hn.svelte.dev/item/45884169)
- "Timestamps tell you when something was written, not whether reality has since agreed with it." and "unverified content is visibly flagged, so agents consuming it through an MCP server inherit the trust signal." (vendor: Unblocked) [Tools that stop agents acting on stale docs](https://getunblocked.com/blog/stop-agents-using-stale-documentation/)
- Stack Overflow 2025 survey (49,000+ responses): 46% distrust AI accuracy and 33% trust it. 66% name "almost right, but not quite" as the top frustration. [TechRepublic](https://www.techrepublic.com/article/news-developer-trust-in-ai-declines/)
  - Update 2026-11-13: the [2026 survey](https://survey.stackoverflow.co/2026/) is out and frames trust as rising but conditional (48.0% trust AI output "when I can easily verify the output"; 6.6% for "important work decisions"; 30,903 responses). Use the 2026 rows, or date the 2025 figure. Primary for 2025: https://survey.stackoverflow.co/2025/ai . More sources from this date are in [../video/appendix/](../video/appendix/).

## 3. Competitors and adjacent tools

| Product | Trigger for "stale" | Notification UX | Verify flow | Agent-aware | Traction and feedback |
| --- | --- | --- | --- | --- | --- |
| Confluence Verified + A4C template | Manual status. The template un-verifies **inactive** pages (no views, edits or comments) | One email per page, capped at 150 pages per rule | Owner or admin sets the status. A Verified filter exists in Confluence and Rovo search | Filter only. No documented ranking boost | "100 emails... started to ignore". The badge "looks authorised". Low ceiling ([thread](https://community.atlassian.com/forums/Confluence-articles/Verified-Pages-Now-Available-in-Confluence/ba-p/2664827)) |
| Better Content Archiving (Midori) | Rules on age, last edit and last view | Owner email reminders | One click to confirm, archive or delete | Pitched as "autonomous spaces" for Rovo. Deterministic rules | 1,151 installs. Incumbent and an active Community seller ([listing](https://marketplace.atlassian.com/apps/123/better-content-archiving-and-analytics-for-confluence)) |
| Comala Document Management (Appfire) | Approved pages expire after a set period. An edit sends the page back to Review | Email on expiry | Approval workflow | No | Mature. Reviews mention a learning curve. Connect version end of life ([docs](https://appfire.atlassian.net/wiki/spaces/CDCCL/pages/631177568/Comala+Document+Control+workflows)) |
| Aura Workflow (Seibert) | Time in state (Up to date, Needs review, Outdated) | Reminders to owner, author or reviewers | Approvals with history | No | Vendor answer in [Community](https://community.atlassian.com/forums/discussion/3261835/how-do-teams-keep-confluence-organized) |
| FreshPage (LogicLemur) | Days since verification, plus "engagement signals" | Red, yellow or green banner on every page | "Mark as Fresh" without editing | Claims Rovo retrieves verified content (unverified) | 2 installs, no reviews. The most vocal "trust layer for Rovo" marketer ([listing](https://marketplace.atlassian.com/apps/1059183334/freshpage-trusted-knowledge-for-confluence)) |
| Page Review Manager | Review cadence for **one governed space** | Dashboard queue, byline panel | Approve, request changes, defer, reassign | No | No reviews ([listing](https://marketplace.atlassian.com/apps/2847619197/page-review-manager-for-confluence)) |
| Stale Content Auditor | Fresh, Aging or Stale by days since edit or review | Dashboard only | Recorded review, archive with confirmation | No | 5 installs ([listing](https://marketplace.atlassian.com/apps/1040161133/stale-content-auditor-for-confluence)) |
| Evergreen | 90/180 days since edit or confirm, set per space or page | **None, by design** | One click, no new version. Bulk actions on 200 pages | No | 1 install ([listing](https://marketplace.atlassian.com/apps/1279909983/evergreen-stale-pages-content-review-for-confluence)) |
| Doc Ownership & Reviews | Per-space cadence, scanned daily | @mention in a page comment | Byline: reviewed, snooze, reassign owner (native owner field) | No | 1 install ([listing](https://marketplace.atlassian.com/apps/1757659150/doc-ownership-reviews-for-confluence)) |
| Swimm | Code-coupled smart tokens, paths and snippets, checked on every commit in CI | CI check fails (can block the PR) or opens an issue | Auto-sync for routine changes, else a human fixes it in the IDE. Suggests couplings | Partial | Repo Markdown only. Setup takes time. Struggles with monorepos ([docs](https://docs.swimm.io/features/keep-docs-updated-with-auto-sync), [code coupling](https://docs.swimm.io/features/code-coupling-suggestions)) |
| Mintlify Workflows | Merged PR in connected repos (path and author filters), or a schedule | Opens or extends a docs PR. Reviewer is the source PR's author | Normal PR review | Agent drafts | 250 credits per run, Enterprise only ([docs](https://www.mintlify.com/docs/workflows)) |
| GitBook Content gaps (beta) | Daily scan against connected sources: missing, outdated, incorrect | Queue with Problem, Evidence, Recommendation and severity | Reject (never reopened) or "Create change request" from its agent | API + MCP | Hosted docs only ([docs](https://gitbook.com/docs/analytics/content-gaps)) |
| DeepWiki (Cognition) | Regenerated from the repo. Auto-refresh only for badge opt-ins | None | None: AI-written | Is the agent | HN: "It's also outdated", "AI slop" ([HN](https://hn.svelte.dev/item/45884169)) |
| Dosu, DeepDocs, DocDrift, Driftless | Merged PR or pre-merge diff, judged by an LLM | Bot opens a doc PR or comments | PR review | Agent drafts | GitHub and repo docs only. Many "Show HN" entrants |
| CODEOWNERS, lychee, Vale | Path ownership, broken links, style rules in CI | Required reviewer, failed check | Merge | No | Enforcement depends on branch protection. Link linting is the only runbook check reported in r/sre |
| Guru | Interval per card (30 days to "does not expire"). Edit by a non-verifier un-verifies | Reminders. Knowledge Agent digest by email or Slack, "for visibility" | One click. Agents auto-verify or un-verify | **Yes**: agents can be limited to "Verified only" | 4.8 on Capterra. "Even unverified Cards appear in search results and can be used in answers" ([help](https://help.getguru.com/docs/verifying-and-unverifying-cards)) |
| Notion verification | Verify for a set period or indefinitely | Inbox and email to the owner on expiry | Anyone with edit access | Verified pages are "prioritized in search results and Q&A responses" | Native ([guide](https://www.notion.com/help/guides/verify-knowledge-your-teammates-can-trust-with-page-verification)) |
| Glean verification | Manual, with reminders | Verification tasks | Badge showing who and when | Freshness and usage ranking, not explicit flags | A page can still read verified after it goes stale ([docs](https://docs.glean.com/user-guide/knowledge/verification/how-verification-works)) |
| Unblocked | Cross-checks sources against merges and discussion at answer time | n/a | n/a | Ranking only | Vendor. Argues "you cannot clean your way out" |
| Context7 (Upstash) | Version-specific library docs fetched live | n/a | n/a | MCP | Widely used. Proves demand for "fresh docs for agents", but only for public libraries |

**Pattern.** Confluence tools are time-based and human-driven. Code-aware tools live only in repos or hosted docs sites. AI-native tools either regenerate the docs (and are then distrusted) or rank answers without telling the owner. **No tool links a Confluence page to code paths and Jira, alerts its owner, and tells agents.** That is our gap. Guru's "Verified only" agent setting and Notion's Q&A weighting show that the market expects verification state to change what agents cite.

## 4. Week 1: adopt or ignore

| Factor | What the evidence says | Where we stand |
| --- | --- | --- |
| Time to first value | Swimm and Comala reviews cite setup time and a learning curve. Evergreen and FreshPage sell "one click" | Demo mode replays PR #482 without Bitbucket. Relay setup is a paste and a test ping. Good, but anchoring is per page |
| Anchor setup effort | Users expect suggestions: Swimm auto-detects code references and recommends coupling "as many code references as possible". Manual labelling is "extremely time-consuming" | F1 suggests anchors from the page body, but only one page at a time. **Biggest week-1 risk** |
| Notification fatigue | One email per page leads people to ignore all of them. Evergreen ships no notifications at all. Guru sends digests | At most 1 footer comment per page per 24 h, plus a debounce. Good. No digest per owner yet |
| False positives | Broad anchors cause most noise (D26: 21 of 22 false positives came from widely anchored files). GitBook never reopens a rejected finding | Eval precision 1.00, recall 0.94 at 0.7/0.5. Dismiss dampener and sensitivity presets. A strong story, but users can't see *why* a page was flagged in one line |
| Trust in AI fixes | 46% distrust AI accuracy. Experts say model-made explanations "can be just as made up". People want edits as reviewable changes (Mintlify PRs, GitBook change requests) | The agent never writes. Proposals are block-level diffs with Accept, applied asUser with a version message. Good |
| Ownership churn | Escalation paths name people who left. Owners "switch teams". Single owners burn out | Owner is mentioned in the footer comment. No fallback when the owner is gone |
| Incident fit | "Make it an output of the incident workflow." Tickets for reviews | Not wired to Jira follow-ups or incidents |

## 5. Agent and MCP angle

- **The worry is real and on the record.** Rovo answers from stale pages with full confidence (2.4). Admins ask whether Rovo should show "Last verified date, Content owner, Review status" ([FreshPage post](https://community.atlassian.com/forums/App-Central-articles/Your-Rovo-Problem-Isn-t-AI-It-s-That-Nobody-Knows-Which/ba-p/3251366), vendor). Experts ask for freshness "based on actual retrieval metadata", not model narration.
- **Coding agents now read Confluence directly.** The official Atlassian Rovo MCP server supports Claude Code and Cursor ([GitHub](https://github.com/atlassian/atlassian-mcp-server)), so a stale runbook reaches the IDE with no human between them.
- **How people want freshness surfaced:** as a visible state on the page (banner or badge), a filter or limit on what agents may use (Guru "Verified only", the Confluence Verified filter), and an explicit instruction the agent follows. The arXiv result shows one clear sentence of precedence changes agent behaviour from 4% to 91%. Our `guidance` field is exactly that lever (D14).
- **What agents should get:** a state word, the reason (PR, file, time), which sections are affected, and a citation rule. The "do not cite steps from section X" form beats a whole-page warning, because a whole-page warning blocks correct content too.

## 6. What we already do well (emphasise in the pitch)

1. **The only change-triggered freshness signal for Confluence.** Every Confluence competitor counts days; we react to the merge. Quote K15t's "any update to whatever you're documenting triggers documentation work" and the "renamed service" runbook story.
2. **Deterministic, explainable, credit-free detection.** This answers "model explanations can be made up" and Rovo credit costs. Eval: precision 1.00, recall 0.94 over 40 scenarios (sample data from the demo space).
3. **Agents told, not just humans.** Every tool response carries `guidance`; `check-page-freshness`, `find-docs-for-path` and `list-stale-pages` run over MCP. No Confluence competitor gives the signal to coding agents. Pair it with the arXiv 90.1% finding.
4. **The agent never writes.** Block-level proposals, Accept by a person, asUser, with a version message naming the PR. This is the posture the 46%-distrust audience wants.
5. **Permission-aware by default.** `unknown` for pages the caller can't see, summaries for viewers, diffs for editors (D30), asUser-only agent tools (D21). A security reviewer can sign off.
6. **Quiet by design.** One comment per page per 24 h, debounce, sensitivity presets, a dismiss dampener, Possibly stale before Stale (D27). This directly answers the "100 emails" failure.
7. **Verify without editing.** View rights are enough to verify (D31), so on-call readers can confirm without creating a new version. This matches the one-click confirms people praise in FreshPage and Evergreen.
8. **Honest wording.** "Its anchors changed", never "this page is wrong". This avoids the "badge looks authorised" over-claim made about native Verified.

## 7. Recommendations (ranked)

Effort: S under 1 day, M 1 to 3 days, L more than 3 days. "Fit" checks UI Kit and Forge limits and the CLAUDE.md non-negotiables.

### 1. Anchor a whole space at once
- **Problem:** Anchoring one page at a time kills week 1. Every page starts Unanchored.
- **Evidence:** "extremely time-consuming" manual labelling. Swimm auto-suggests couplings. Evergreen offers bulk actions on 200 pages.
- **Change:** A dashboard action, "Suggest anchors for this space". It runs the existing F1 page-body suggester over unanchored pages (runbooks and pages that mention repos first) and shows a table of page, suggested anchors and evidence, with checkboxes and one Save. Restricted pages are listed as skipped (D20).
- **Effort:** M.
- **Fit:** Yes. UI Kit `DynamicTable`, asUser page reads, bindings written after a permission check. Batch reads to stay inside invocation time limits.

### 2. One deterministic "why flagged" sentence
- **Problem:** People dismiss flags they can't explain, and that becomes the false-positive story.
- **Evidence:** Experts ask for freshness "based on actual retrieval metadata". Model explanations "can be just as made up". GitBook shows Problem / Evidence / Recommendation.
- **Change:** Build the reasons we already compute (matched anchor, file status, removed identifier, score against threshold) into one sentence at the top of the review panel and in the tooltip. Example: "PR #482 renamed `scripts/rollback.sh`, which step 2 uses. Score 0.71 (threshold 0.5)." Keep it under 90 characters in the tooltip.
- **Effort:** S.
- **Fit:** Yes, no LLM. Viewers get the summary only (D30).

### 3. A ready-made coding-agent instruction
- **Problem:** Agents follow whatever their instructions say. A freshness tool they never call doesn't help.
- **Evidence:** In arXiv 2610.30571, one precedence sentence moved behaviour from 4.2% to 91.4%. Unblocked: anything a merge can invalidate should be retrieved fresh.
- **Change:** Ship a copy-paste block for CLAUDE.md and AGENTS.md, shown in settings and the README: "Before you change files, call `find-docs-for-path`. Before you cite a Confluence page, call `check-page-freshness`. If the result is not `verified`, do not present its steps as current, and tell the user which page to re-verify." Use it in the video.
- **Effort:** S.
- **Fit:** Yes, docs and copy only. Strong for the Agents/MCP bonus.

### 4. Deterministic quick fix for renames and removed identifiers
- **Problem:** The commonest runbook failure is a renamed path, service or flag. Spending Rovo credits and AI trust on that is wasteful.
- **Evidence:** The "renamed eight months ago" runbook. More than 25% of top repos have outdated code references. 66% of developers are frustrated by "almost right" AI output.
- **Change:** When the matcher sees a rename (`scripts/rollback.sh` to `scripts/rollback-v2.sh`) or a removed token with a single replacement, offer "Replace in 2 places" as a proposal. It shows the same block diff and is accepted the same way. Label it "Suggested from PR #482, no AI used". Keep Propose fix for everything else.
- **Effort:** M.
- **Fit:** Yes. Reuses the D28/D29 accept path (asUser, block-level, version message). Detection stays deterministic.

### 5. A machine-readable citation rule and stale sections in agent responses
- **Problem:** A whole-page warning makes agents drop correct content, or ignore the warning.
- **Evidence:** Guru limits agents to "Verified only". Notion prioritises verified pages in Q&A. The precedence-sentence result.
- **Change:** Add `citePolicy: "cite" | "cite_with_caveat" | "do_not_cite_steps"` and `affectedSections: [{heading, blockIds}]` to `check-page-freshness` (summary level for viewers). Keep `guidance` as the plain-language form.
- **Effort:** S.
- **Fit:** Yes. Read-only and asUser. Document the new fields in [agent-tools.md](../architecture/agent-tools.md).

### 6. Bring the PR author into the loop
- **Problem:** Owners lack the context. The person who made the change has it.
- **Evidence:** Mintlify assigns doc PRs to the source PR's author. "Every ticket that changes something significant? I want that change documented." Docs fail because "the ticket didn't say update docs".
- **Change:** The footer comment mentions both the owner and the PR author: "@owner, PR #482 (merged by @Sam) changed 2 files this page documents." The review panel shows "Ask Sam" with a link to the PR.
- **Effort:** S.
- **Fit:** Likely yes. Bitbucket user objects carry an Atlassian `account_id` (to verify; record the result in [docs/platform/](../platform/)). Mention only when the account resolves; otherwise use plain text.

### 7. "Not relevant" narrows the anchor
- **Problem:** Broad globs (`src/**`, `values.yaml`) cause almost all false positives. A dismiss today only dampens the score.
- **Evidence:** D26: 21 of 22 false positives came from widely anchored files. GitBook never reopens a rejected gap. Email fatigue ends adoption.
- **Change:** After Dismiss with "Not relevant", offer "Stop watching `deploy/helm/values.yaml` for this page" or "Ignore changes under `src/utils/**` here". This becomes a per-binding exclude.
- **Effort:** S.
- **Fit:** Yes. Needs update rights (D31). Small schema change (exclude list on the binding).

### 8. Show that the watch is working on Verified pages
- **Problem:** A quiet badge reads as "nothing is happening". Readers can't tell watched-and-quiet from never-checked.
- **Evidence:** "Timestamps tell you when something was written, not whether reality has since agreed with it". Practitioners ask for "last validated" over "last edited". Frequently viewed pages often never need edits.
- **Change:** The Verified tooltip reads "Verified by Dana 3d ago. 14 changes to anchored code since, none relevant." The dashboard shows the same count.
- **Effort:** S to M (count quiet matches per page; batch the content-property write).
- **Fit:** Yes. Keep page views function-free (D3) by updating the property only when the count changes, at most daily.

### 9. An owner fallback for orphaned pages
- **Problem:** Owners leave or change teams, and alerts go to nobody.
- **Evidence:** "escalation path... listed two people who had since left". Midori: accountability "is usually the first thing to slip". Single-owner burnout.
- **Change:** If the owner is deactivated or can't view the page, mention the last editor of the affected section, then the PR author, then the space admin. Show an "Owner unavailable" chip and a "No active owner" filter on the dashboard.
- **Effort:** M.
- **Fit:** Yes. User lookup asApp returns no page content. Never reveal restricted pages.

### 10. A "My drift" queue instead of more pings
- **Problem:** One comment per page doesn't scale for owners of 30 pages.
- **Evidence:** "100 emails... started to ignore". Guru sends digests. Page Review Manager has a queue.
- **Change:** A "Mine" filter (pages I own or last verified, ordered by severity), and a one-line summary in the dashboard header: "You have 3 pages to review in PLAT." Optional later: one weekly comment per owner on a space "Drift" page instead of per-page comments.
- **Effort:** S for the filter, M for the weekly roll-up.
- **Fit:** Yes. Forge has no email, so stay inside Confluence notifications.

### 11. Optionally mirror state to native Confluence Verified
- **Problem:** Admins already use the native Verified status and the Rovo and Confluence "Verified" search filter. A separate badge splits the signal.
- **Evidence:** The Verified filter exists in search. Native Verified is manual and time-based, and its badge "looks authorised". Notion and Guru tie verification to AI answers.
- **Change:** Admin setting, off by default. "Mark verified" also sets the native Verified status asUser (when the user is the owner or an admin). On drift, a second opt-in removes the native status, so search filters stop listing drifted pages.
- **Effort:** M.
- **Fit:** Partly. The asUser half fits. Clearing native status on drift is an automated change to a user-visible field with no clicking human. That needs a decision entry (D32), and the content-state scope must be checked in [docs/platform/](../platform/). Adding a scope after launch forces a major version, so decide by Dec 1 alongside F12.

### 12. Create a Jira follow-up from the review panel
- **Problem:** Drift found at 3pm gets fixed "later" and is forgotten. Teams track work in Jira.
- **Evidence:** "automatically generated tickets for reviewing and updating" (r/sre). Page Review Manager advertises Jira follow-up. A Community answer recommends work items and a board for stale pages.
- **Change:** A "Create Jira task" button that prefills page, PR, affected sections and owner, created asUser. The open event links to the issue, and closing the issue does not auto-verify the page.
- **Effort:** M.
- **Fit:** Only when Jira is connected (it is optional). Needs a Jira write scope, which is a scope change, so decide by Dec 1. Never verifies on the user's behalf.

### 13. Coverage for runbooks
- **Problem:** The persona cares most about on-call pages, yet unanchored runbooks are invisible.
- **Evidence:** The r/sre threads. ITOC360 (vendor): stale runbooks contribute to 12% of incidents.
- **Change:** A dashboard tile, "Unanchored runbooks: 6", for pages labelled `runbook`, `playbook` or `on-call`, or titled "Runbook". It links to recommendation 1.
- **Effort:** S.
- **Fit:** Yes. CQL search asUser.

### 14. A first-run checklist
- **Problem:** The first 10 minutes decide whether a lead keeps the app.
- **Evidence:** Swimm and Comala reviews cite setup time and a learning curve. The "one click" apps are sold on simplicity.
- **Change:** The settings page opens with 4 steps and their state: Replay demo PR (works now), Connect Bitbucket, Anchor 5 pages (recommendation 1), Add the agent snippet (recommendation 3).
- **Effort:** S.
- **Fit:** Yes, UI Kit. Demo mode always works (non-negotiable).

### 15. (Post-hackathon) A pre-merge comment in Bitbucket
- **Problem:** Catching drift after the merge is good. Telling the PR author before merge is better.
- **Evidence:** Swimm's CI check, DocDrift pre-merge, Mintlify reviewer assignment.
- **Change:** The relay comments on the open PR: "This PR changes files that 2 Confluence pages document."
- **Effort:** L.
- **Fit:** Not now. The static web trigger response (D11) can't return matches, so it needs a core-to-relay data path and changes the Bitbucket scopes. The Won't list already excludes real-time GitHub and GitLab; treat this the same way.

## 8. Open questions

- Does Rovo search or chat rank natively Verified pages higher, or only filter on them? Unconfirmed: no public ranking docs ([thread](https://community.atlassian.com/forums/Rovo-questions/How-does-Rovo-decide-which-documents-are-the-most-relevant/qaq-p/3268322)). This affects recommendation 11.
- Recheck (Codegeist 2026) is still unknown beyond its name; check it again before Devpost.
- The arXiv 2610.30571 preprint is not peer-reviewed. In the pitch, call it "a recent preprint".
