# Decision log

Newest at the bottom. Each entry: what was decided, why, and what would reopen it. Add an entry whenever a spike or discussion changes the design.

### D1. Two Forge apps: core (Confluence + optional Jira) and a Bitbucket relay
2026-11-11 · Accepted
Multi-app compatibility does not cover Bitbucket, and Bitbucket-context calls to other products fail. The relay POSTs HMAC-signed change records to the core app's web trigger. Reopen if: Atlassian adds Bitbucket to multi-app compatibility.

### D2. Detection is deterministic; LLMs only on explicit "Propose fix"
2026-11-11 · Accepted
This is both the cost story (Rovo credits are metered from Dec 3; Forge LLMs are developer-paid) and the trust story. Reopen if: the eval misses recall targets that only semantic matching can hit, and then only as optional gray-zone triage (F16).

### D3. Byline badge state comes from a content property (`contentPropertyKey`)
2026-11-11 · Accepted, pending spike S2
Zero function invocations per page view. Fallback: `dynamicProperties`.

### D4. The byline badge is the primary signal; the page banner is a Could
2026-11-11 · Accepted
The banner is capped at 48 px, back in Preview, and community reports layout shift and spinners. Show it only for Stale pages, if at all.

### D5. UI Kit (`render: native`) for all Confluence UI
2026-11-11 · Accepted
Faster, native look, Atlassian tokens automatically. Custom UI only if the review panel needs a rich diff viewer.

### D6. Agents never write pages
2026-11-11 · Accepted
Drift Reviewer drafts; a human accepts in the review panel. Writes are `asUser()` with a version message naming the PR.

### D7. Headline bonus: agents + MCP; also submit for Marketplace listing
2026-11-11 · Accepted; Marketplace part superseded by D19
Only one bonus can be won. The Marketplace bonus has 6 winners, so submit for listing by Dec 11 anyway, with a separate judge-copy app ID.

### D8. Teamwork Graph only for interactive "suggest anchors"
2026-11-11 · Accepted
It is `asUser()` only, needs persisted queries, and registration is fiddly. It is never in background detection.

### D9. Brand: "Doc Drift Sentinel", Night shift teal with one amber "slip"
2026-11-11 · Accepted
Never "DocDrift" or "DDS" in user-facing text. `beacon` amber is reserved for drift; primary buttons fill with the text colour. See [brand/](../brand/).

### D10. Positioning: code- and Jira-triggered drift, not decision drift
2026-11-11 · Accepted
Accord and Precedent (Codegeist 2026) occupy decision drift. Decisions are at most a secondary anchor type.

### D11. Core app stays egress-free (Runs on Atlassian); relay accepts egress
2026-11-11 · Accepted, amended
The polling fallback (core calls api.bitbucket.org) is used only if the relay path fails. Amendment from research: RoA is not a 2026 prize, only a Marketplace badge. Keeping it requires the ingest web trigger to be **static** (`urlFormat: v2`, `response.type: static`). Do it because it is cheap; drop it if it blocks the relay.

### D12. Two app IDs: listed (licensed) and judge copy (unlicensed)
2026-11-11 · Superseded by D19 (no listing, so one unlicensed app ID)
Submitting for listing or setting `licensing.enabled` disables install-link sharing, and paid production installs are blocked until approval. The demo, video and Devpost link use the unlicensed judge copy.

### D13. Demo runs on a Forge demo site, not a free dev site
2026-11-11 · Accepted
Free dev sites reportedly lack Rovo. Demo sites (`forge site provision`) include Rovo but expire after 90 days, so timing matters for judging.

### D14. Freshness instructions travel in tool descriptions and `guidance`, not only the skill
2026-11-11 · Accepted
`rovo:skill` attaches only to our own agent. Third-party agents and MCP clients see action descriptions and responses.

### D15. App-owned state is written `asApp()` after a permission check; page text is written `asUser()`
2026-11-11 · Accepted
Content-property writes need edit rights, which view-only verifiers lack. External MCP `asUser()` needs per-user consent, so MCP handlers check the caller's `accountId` permissions themselves.

### D16. Forge SQL from day 1
2026-11-11 · Accepted (S7 GO: dashboard GROUP BY in 35 ms p50 on 200 rows)
Custom entities cannot aggregate. Adding `sql` later forces a major version.

### D17. Video: the core story and the agent/MCP proof finish before 3:00
2026-11-11 · Accepted
Judges need not watch past 3 minutes. No third-party UI mocks (Slack).

### D18. Devpost category: Apps for Software Teams
2026-11-11 · Accepted

### Note on D15 (2026-11-11 validation pass)
The permission check before an `asApp()` state write is done `asUser()` in the resolver, via `GET /wiki/api/v2/pages/{id}/operations`. External MCP has no `asApp()` fallback (D21).

### D19. Hackathon distribution is the share link only; no Marketplace listing
2026-11-11 · Accepted (Razvan). Supersedes the Marketplace half of D7 and replaces D12.
We do only what the rules require: a Forge share/install link plus setup instructions. No Marketplace submission, no paid listing, no partner verification, no licensing. One app ID per app (core + relay), with no `app.licensing` block. We give up the "Best Marketplace published app" bonus; the headline bonus stays Agents/MCP. Reopen after the hackathon if we want a public listing ([hackathon/marketplace.md](hackathon/marketplace.md) keeps the research).

### D20. Pages with view restrictions are unsupported in v1
2026-11-11 · Accepted, confirmed by Razvan (forced by the platform)
The app user cannot read restricted pages, and their events do not arrive (ECO-822, ECO-961). Adding the app user to page permissions via the v2 permissions API is possible, but it changes customer permissions behind their backs, so we don't do it. The binding modal tells the user restricted pages can't be watched yet. Demo pages must be unrestricted. Reopen if: Atlassian fixes the tickets.

### D21. MCP and agent tools require `asUser()`; no `asApp()` fallback
2026-11-11 · Accepted, confirmed by Razvan. Jira stays optional (also confirmed).
There is no reliable way to check another user's page permission from an app context, so an `asApp()` fallback could leak restricted titles or state. Without user consent, the tools return a clear "grant access" error.

### D22. Team is Razvan + Claude Code; full scope kept
2026-11-11 · Accepted (Razvan)
Razvan is experienced and runs several AI agents in parallel, so the team counts as the plan's full team. No pre-emptive scope cut; the cut order applies only if a weekly definition of done slips.

### D23. Code lives in a private GitHub repo, open-sourced before submission
2026-11-11 · Accepted (Razvan)
Remote: `git@github.com:razvanstatescu/doc-drift.git`. Private now, made public before Devpost submission (target Dec 19, see [hackathon/timeline.md](hackathon/timeline.md)). Never commit secrets, tokens or relay HMAC secrets: they live in Forge storage and environment variables only.

### Note on D20 (S2 finding, 2026-11-11, resolved: D20 stands)
The app could still read and write a page it had created after the page was restricted to Razvan only. Either app creators are exempt, or the app user ignores page restrictions altogether. A test on a page a person creates and restricts (S2 check 5) decides whether D20 can be relaxed.
**Result (page 2883670, created and restricted by Razvan):** `asApp` GET page, properties and operations all returned **404 "Could not find page"**. The app user is blocked by person-set restrictions; the earlier result came from the app having created the page. D20 stands.

### D24. Matcher v0 design choices (M0)
2026-11-11 · Accepted (made by the matcher track, recorded by the orchestrator)
1. **Cosmetic edits count half.** A modified file whose changed lines are all comments or whitespace gets `COSMETIC_FACTOR` 0.5. The comment-typo fixture scores 0.31: no alert.
2. **Weights.** Anchors score at 1.0. `critical` raises severity only, not score. The dismiss dampener is −0.1 per dismissal (`dismissCount`), floor 0.3.
3. **Removed identifiers** are tokens on `-` lines that no `+` line still uses. Code-shaped tokens (`SNAKE_CASE`, dotted, paths, flags) match anywhere in the page text; plain lowercase words match only inside page code blocks.
4. **Field names.** `ChangedFile.linesAdded` / `linesRemoved`; `binding.dismissCount`. The Jira change record carries the issue's current `statusCategory`.
5. **Hunk cap** is 200,000 bytes (the relay must trim by bytes, not characters).
6. **Not yet:** a revert of a revert scores as a normal change; `page`-type anchors are not scored.

Precision and recall of 1.00 on the first 10 fixtures are not evidence of quality: they were written with the code. The real check is the 30 demo-derived scenarios in M2.

### D25. Seed Jira keys are templated, not forced
2026-11-11 · Accepted
Pages reference issues as tokens (for example `{{PAY:rollback-epic}}`) that the seed scripts replace with the real keys after creating the issues. That avoids creating and deleting 155 placeholder issues to land on "PAY-142". The story uses whatever key Jira assigns. Demo mode and the copy library may keep PAY-142 as an illustrative example.

### D26. Anchor weights are set by the eval, not by assumption
2026-11-11 · Accepted (eval result below)
The matcher (D24) scores every anchor at 1.0; the demo scenarios were authored assuming normal ≈ 0.7 and critical 1.0. The M1 eval agent runs the real matcher over all 10 demo scenarios × 24 pages and picks the weights that meet recall ≥ 0.9, precision ≥ 0.8, zero lockfile/test-only alerts. The result is recorded here.

**D26 result (eval over 40 scenarios / 727 page decisions):**
- normal **0.7**, critical **1.0**, threshold **0.5**: precision 1.00, recall 0.94.
- At weight 1.0, a one-line edit to a widely anchored file (values.yaml, `src/**`) flagged every page that anchors it: 21 of the 22 false positives. With 0.7/0.5, the highest quiet score is 0.46 and the lowest true flag is 0.56.
- Jira scores are not scaled by weight; critical only makes the alert High.
- Other changes:
  - Plain lowercase words are no longer identifiers; `--flags` and `/routes` are.
  - Deleted files contribute no identifiers.
  - SQL keywords are ignored.
  - A glob anchor never makes a deletion High.
  - The cosmetic factor is 0.4 (it was 0.5 in D24).
- Known misses: values stated only in prose.
- For apps/core: revert detection must match by title when a revert PR has no number (scenario 08).

### D27. The first drift always reads Possibly stale; Stale needs time or repetition
2026-11-11 · Accepted (from the M1 live test)
The plan's rule "High severity on a critical anchor goes straight to Stale" made the live runbook jump to Stale on the first merge. That hides the "Possibly stale, review it" beat and over-alarms. New rule:
- Verified goes to Possibly stale on any event at or above the threshold, whatever the severity.
- Possibly stale goes to Stale after `escalationDays` (default 7) unresolved, or 3+ open events, or a **further** High event on a critical anchor while already Possibly stale.

Severity still shows on the event (High/Medium).

### D28. Propose fix runs through Rovo and a stored proposal; no Forge LLM module
2026-11-11 · Accepted
"Propose fix" opens Drift Reviewer in Rovo with a prefilled prompt. The agent calls `get-drift-context`, then `submit-fix-proposal`, which stores a `fix_proposal` row and never touches the page. The review panel shows the proposal as a diff. **Accept** applies it asUser, inside the named section only (exact match after whitespace normalisation), as a new page version "Doc Drift: accepted proposal for PR #N". It then closes only the events tied to that section and records a verification. Errors: `not_found`, `ambiguous`, `unsupported_span`, `not_open`, `forbidden`, `update_failed`. No `llm` module ships (F16 stays out): AI cost runs on the customer's Rovo credits, only on click, which keeps D2. That also avoids the major-version trap.
