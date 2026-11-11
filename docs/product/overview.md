# Product overview

## One line

Doc Drift Sentinel flags Confluence pages as possibly stale when the code or Jira work they describe changes, and tells Rovo and coding agents not to trust those pages until a person re-verifies them.

**Pitch lead:** agents should not cite docs that the code has already invalidated.

## The problem

Docs rot when systems change, not when calendars turn. Every existing staleness tool works from page age or manual review. A page untouched for two years can be correct. A page reviewed last month can already be wrong.

AI makes this worse. Rovo and coding agents read the same pages and cite them confidently:
- Rovo does not prefer newer or reviewed pages. Community answers: "It doesn't 'pick the newest' automatically". "Rovo can't automatically identify official sources of truth". "If pages conflict, it won't reliably pick the correct version or flag contradictions."
- An Atlassian Community user puts it this way: "what actually invalidates technical docs isn't time passing, it's the system changing underneath them... How-tos, process docs, configuration guides: these are the dangerous ones... an agent will happily serve them."
- Incident cost: ITOC360 (a vendor, not independently verified) lists "Missing / stale runbook" as a contributing factor in 12% of 1,500+ production incidents. Several SRE guides say a stale runbook is worse than none.

## Who it is for

- **Primary:** a platform or SRE lead who owns runbooks and on-call docs in Confluence, whose team now asks Rovo or coding agents for procedures.
- **Secondary:** an engineering manager or DevEx lead accountable for onboarding docs and agent answer quality.

## Jobs to be done

1. When code or scope changes, tell me which pages it broke before someone follows them at 3am.
2. Stop agents from citing pages I have not re-verified.
3. Make fixing a drifted page take 2 minutes, not an hour spent rebuilding context.
4. Show me drift debt per space so I can prioritize.

## How it works (the three-beat story)

1. **In sync.** A page is anchored to the code paths, globs and Jira issues it describes, and is verified.
2. **Code moved.** A PR merges (or an anchored Jira issue changes scope). A deterministic matcher scores the change against anchors. The page's byline badge turns Possibly stale with the exact change. Agents calling `check-page-freshness` are told to caveat or hold off.
3. **Reviewed.** The owner opens the review panel and sees what changed and which section is affected. They can ask Drift Reviewer (the Rovo agent) to draft a fix, then accept it, mark the page verified, dismiss or snooze. The badge goes back to Verified.

## Principles

- **Detection is deterministic and credit-free.** No LLM in the hot path. AI is used only when a human clicks "Propose fix".
- **No silent edits.** Every page write is `asUser()`, triggered by a click, with a version message naming the PR.
- **Never claim a page is wrong, only that its anchors changed.**
- **Freshness is a shared tool.** Any agent, in Rovo or over MCP, can check a page before citing it.
- **Permission-aware.** Every user-facing read respects Confluence page restrictions.

## Differentiation

The gap: Confluence pages coupled to code and Jira, with freshness exposed to agents.

| Product | Trigger for "stale" | Agent-aware | Code-aware |
| --- | --- | --- | --- |
| Confluence Verified (native, Apr 2024) | Manual. Only page owners and admins can set it. Automation can flag inactive verified pages. Status sits on the page, not a version. | No | No |
| Recheck (Codegeist 2026, Vinit Shah) | Stale page reviews. Only the name and tagline are confirmed, not its features. | Unknown | No |
| Page Review Manager | Review cadence, reminders, Jira follow-up. One governed space per install. | No | No |
| Stale Content Auditor | Fresh/Aging/Stale buckets by days since edit or review | No | No |
| Stale Page Finder | Age thresholds (90/180/365 days or custom), bulk labeling | No | No |
| Clearlane Content Review | Time since edit or "Still accurate" confirmation | "Works with Rovo" (unspecified) | No |
| Accord (Codegeist 2026) | Decision drift between Jira releases and Confluence decisions. Rovo/MCP read-only actions. | Yes | No |
| Precedent (Codegeist 2026) | Decision memory. Flags Jira work that contradicts decisions. MCP for coding agents. | Yes | No |
| Swimm | Smart tokens/paths/snippets coupled to code, with auto-sync. Repo-hosted Markdown only. | Partial | Yes |

**Positioning rule:** Accord and Precedent occupy decision drift. Stay clear of them: anchor on code paths and Jira scope changes, and mention decisions only as a secondary anchor type.

## Pitch narrative

Problem (docs rot when systems change, not when calendars turn), then the wrong-answer demo, then the fix (anchors, drift, human-approved edits), then agent integration (freshness as a shared tool). Vision: a freshness signal every agent in the Atlassian ecosystem checks before citing.
