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

### D9. Brand: "Doc Drift", Night shift teal with one amber "slip"
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

### D29. A fix proposal targets one page block
2026-11-11 · Accepted (amends D28)
Live in Rovo on DDSTEST 3080280, Drift Reviewer put a paragraph and the code line under it into one `originalText` (joined with ". ", then a newline). No single passage of the page held that text, so `submit-fix-proposal` returned `not_found` twice and the agent retried a third time with nothing new. Now `get-drift-context` returns each affected section as `blocks` (`blockId`, `kind`: paragraph, code, list-item, heading or table-cell, verbatim `text`, `matched`), and a proposal changes exactly one block: `blockId` plus the block's full new text (preferred), or `originalText` inside one block. A passage across blocks is refused with `spans_blocks` and the block IDs it touches; text in no block is `not_found` with up to 12 candidate blocks, so the agent can correct itself in one step. Guidance allows one retry. Accept applies by block (the ID, then the one block that still holds the original), edits only the characters that differ so inline formatting stays, and closes the events once no other open draft answers them. The review panel groups drafts by section and adds "Accept all for this section". Schema: `fix_proposal.block_id`, `block_kind` (migrations v012, v013); older drafts apply as in D28.

### D30. Drift evidence visibility: summaries for viewers, full diffs for editors
2026-11-11 · Accepted (Razvan; from review finding M1)
Anyone who can view a page sees *that* it drifted and a summary: ref, author, time, file paths with status and line counts, severity, matched anchor, and reasons. Raw diff hunks and full Jira field values (description bodies) are returned only to callers with **update** rights on the page (`/pages/{id}/operations`, asUser). Applies to `getPageDrift`, `get-drift-context` (agent), and every MCP tool. MCP tools never return hunks at all. Propose fix already needs edit rights, so drafting is unaffected.

### D31. Dismiss and snooze need edit rights; verify needs view rights
2026-11-11 · Accepted (from review finding M3)
Dismissing an event lowers that anchor's future scores (the dampener), and snoozing hides drift, so both change detection for everyone and require **update** rights on the page. Mark verified only records that a person re-read the page, so view rights are enough. Accept fix, rename proposals and anchor edits keep requiring update rights. The review panel gates each control by its own flag (`canVerify`, `canDismiss`, `canSnooze`, `canEditAnchors`, `canAcceptFix`) and shows the reason when one is off.

### D32. A revert closes what is open and is scored for everyone else; arrival order does not matter
2026-11-12 · Accepted (phase 2, BUG-02, BUG-03, BUG-13)
A revert PR (`Revert "<title>"`) first closes the open events of the PR it reverts, found by the `(pull request #N)` / `(PR #N)` suffix after the closing quote (or a squash `(#N)` at the very end of the inner title), else by title; a `#N` inside the original title is never read as the PR number. It is then scored as a normal change (matcher `scoreReverts`) on every other page, so a page that was verified (or dismissed) for the original now flags: its text describes code the revert removed. Pages whose events for that PR a revert closed, now or on an earlier run of the same job, are skipped, so queue redeliveries stay idempotent. If a revert arrives before its original (relay retries can reorder by up to 15 min), the original's events close as `reverted` at once and so do the revert's own events (they cancel out). Only reverts received earlier count, so re-matching an old change never undoes a later revert's flag. Outcomes: `revert`, `revert+scored:N`, `scored:N:reverted`.

### D33. The byline title leads with the state word
2026-11-12 · Accepted (phase 2, UX-6)
The byline content property's title is `<State word> · Doc Drift` (`Possibly stale · Doc Drift`), not `Doc Drift: Possibly stale`, so the state survives truncation and the "(Development)" suffix. Resolvers return the same string as `stateTitle`. Every existing byline was rewritten after the deploy (dev driver `refresh-all`). Stale bylines are rewritten about daily by the hourly job, so "Unreviewed drift for N days" keeps counting.

### D34. "Not relevant" can narrow the anchor; dismissing the last change is a review
2026-11-12 · Accepted (phase 2, R-7, UX observation)
`stopWatchingPath({eventId})` (edit rights, D31) removes an exact path anchor, or adds the event's files to a glob or whole-repo anchor's `exclude` list (`binding.exclude_paths`, migration v014); an excluded file never matches the binding, and the event is dismissed as `not_relevant` without raising the dampener. Dismissing the last open change records a verification (method `dismissed`) by the person who dismissed it, so the panel can say who reviewed the page. Mark verified on a page with no anchors is refused (`unanchored`): there is nothing to verify. Drafting a fix (`submit-fix-proposal`) needs edit rights, as D30 assumed (BUG-12). A dampener is reset only on an explicit `resetDismissCount: true` on a saved anchor (BUG-15), because every save resends every anchor.

### D35. Create a Jira task from the review panel; no native Verified sync
2026-11-12 · Accepted (Razvan: "go with your recommendation"; the Dec 1 scope decision, taken early)
Two research ideas needed scopes. **Native Verified sync is dropped:** there is no public REST API that sets or clears Confluence's native Verified status (Teamwork Graph exposes only a read-only `isVerified`), and content states (`PUT /wiki/rest/api/content/{id}/state`) are a different feature that publishes a new page version on every set, which breaks D31 (verify without editing) and would spam page history. **"Create Jira task" ships** with one new scope, `write:jira-work`, so core moves to major version 5 now, in week 1, before any judge installs (D19). The task is created asUser on a human click from the review panel (view rights on the page are enough, like Mark verified; Jira enforces Create issues), never by an agent. Its description is deterministic ADF at summary level (D30: no diff hunks) and says closing it does not verify the page. The open events record the key (`drift_event.follow_up_key`), the panel shows "Tracked in CX-11", and `check-page-freshness` returns `trackedIn`. Product Discovery projects are left out (their only standard type is Idea). Agents and MCP get no create tool: Jira writes stay human.

### D36. A public website on GitHub Pages, static, from `site/`
2026-11-13 · Accepted (Razvan: "let's go and build a nice github pages website")
A three-page static site (home, setup guide, privacy and data handling) plus a 404, in `site/`, published by `.github/workflows/pages.yml` (GitHub Actions, on pushes to `main` that touch `site/`). No build step and no framework: plain HTML, one stylesheet built from `brand/tokens.json` (Night shift default, Day toggle), one small script. It is not under `docs/` because that folder holds internal docs. Content rules: brand voice and naming as everywhere; every number is real or labelled "sample data from the demo space" (the agent examples are live tool output from PLAT); the privacy page must match [architecture/trust-safety.md](architecture/trust-safety.md) and the actual schema (it discloses that fix drafts keep the one block they replace and that Jira change values are kept). The install link and video stay empty until the production share link exists (`CONFIG` in `site/assets/site.js`); this is not the judge guide. GitHub Pages from a private repository needs a paid GitHub plan, so the site goes live when the repo opens (Dec 19) unless Razvan enables Pages earlier. Maker and contact (2026-11-13, Razvan): Nano-Soft Technology SRL, trading as Nano Soft, hello@nano-soft.tech; the site names the company, not a person. Default theme (2026-11-13, Razvan): the website opens in Day (light); Night shift stays one click away and is remembered per browser. This is the one surface where Day is the default; brand artifacts, video and Devpost keep Night shift.

### D37. The launch video is a 2:30 hypermotion film in Remotion; third-party material is shown only with permission
2026-11-13 · Direction accepted (Razvan); the plan's open choices wait for him
Razvan: the video is built in Remotion as a hypermotion film of about 2:30 (3:00 at most), in three parts (the problem, our solution, how it works in practice), with ElevenLabs voice, music and effects and GPT Image 2.6, opening on a barrage of real evidence like the Satchel film's. Research and the proposed plan are in [video/research.md](video/research.md); it replaces the v2 script in [hackathon/demo-and-pitch.md](hackathon/demo-and-pitch.md). Two facts read on the live rules page that day shape it. Judges are not required to watch beyond **five** minutes (our docs said 3:00). And the video "must not include third party trademarks, or copyrighted music or other material unless the Entrant has permission", so the plan recommends real captures only from openly licensed pages and Atlassian's own, verbatim quote cards for everything else, and no third-party product marks (a coding agent is shown as a real terminal, unnamed). The rules also ask for "footage that shows the Project functioning", so the how-it-works act is real recordings; mock interfaces appear only in the problem act. Eleven choices (rights approach, Day theme after the reveal, narrator, the real voice clip, PR #482 for real, a second demo account, filming on production, licences, length, naming the coding agent, individual quotes) are listed with recommendations in section 2 of the research file and are not decided yet.
**Update, 2026-11-13 (Razvan):** the rights reading was too strict. Real screenshots are used in the cold open with care: brief, source and date visible, cropped to the headline, words unchanged, private individuals blurred, no vendor promos, every item logged in `video/src/data/plates.json` and credited, so any plate can be swapped if the sponsor asks. Voice, music, effects and images are generated on Razvan's paid ElevenLabs and OpenAI accounts. Look: Night for the problem, Day from the solution. The real merge is PR #482 (Razvan approved burning the counter with declined pull requests). One-person company, so Remotion's free licence applies. Footage comes from the development install, because production cannot share the demo site without wiping its data. Build brief: [../video/BRIEF.md](../video/BRIEF.md); shot list: [../video/SCENES.md](../video/SCENES.md).

### D38. Agent guidance names what changed, never the page
2026-11-13 · Accepted (found while filming the launch video)
The drifted-page `guidance` read "Cite with caveat: changed by PR #482 on <date>." On camera, Drift Reviewer turned that into "The page was changed by PR #482", which is false: the PR changed the code the page describes. The caveat now reads "what it describes changed in PR #482 on <date>, after it was last verified", the Drift Reviewer prompt says a pull request or Jira change never edited the page, and the skill's example matches. Brand copy, the agent-tools doc and the website were updated. Core 5.5.0 on development; no scope change.


### D39. Launch film v4: a Day film, crafted twins proved by real captures
2026-11-16 · Accepted (Razvan's review of v3)
Razvan found v3's story clear but its picture "boring and cheap" next to our Satchel and Pot films, and asked for more movement, fewer Confluence screens, crafted visuals that real recordings prove quickly, and a light version that follows the brand book. Measured (research R1): v3 was frozen 50.5% of the time and only 25% of its frames moved (Satchel 81%, Pot 98%). v4 keeps every word of narration, the music and the timeline, and changes the picture: (1) the film is Day, on a lit Paper sweep, with Night only for the reveal and the literal 3 a.m. scenes (A1, A4's return); (2) the product is explained with crafted *twins* of our own UI, built only from real strings and data, and each claim is proved inside the same line by a short framed crop of a real capture tagged "Recorded in Confluence" (or Bitbucket, Rovo, Jira) or "Real output: doc-drift MCP", with 14 required inserts; this replaces D37's "mock interfaces appear only in the problem act"; (3) the frame never freezes (camera creep, moving ground), while type holds still to be read; (4) the end card drops the maker line (Nano Soft stays in the video description and on the website). Night shift remains the primary look of our other surfaces. Research: [video/v4/](video/v4/); direction: [../video/V4.md](../video/V4.md).

### D40. The product is renamed from "Doc Drift Sentinel" to "Doc Drift"
2026-11-17 · Accepted (Razvan)
The product name is now **Doc Drift** everywhere: the apps' titles and copy, the website, the docs, the brand book and `brand/tokens.json`. The Confluence byline label already read "Doc Drift", so the short name is now the only name. Unchanged: the repository, the GitHub Pages URL, the `doc-drift` MCP server key, the `dds-` code key prefix, the Forge app IDs (so the share links are unaffected), and the logo artwork. Decisions and spike notes written before this date may still say "Doc Drift Sentinel" where they quote earlier wording: `docs/source/plan-v1.md` and `spikes/` are kept as written. The launch video (v4) and its YouTube description still use the old name until its next update. The demo site's seeded Jira and Confluence descriptions are not re-seeded.

### D41. Launch film v5: about 100 s, one story told forward, plain words, real footage directed at full size
2026-11-17 · Accepted (Razvan's review of v4)
Razvan found v4 a bit long and boring for a simple product, and a friend who mostly uses Jira did not understand what it does. An expert audit (R4) and four simulated first-time viewers found why: no sentence says plainly what it does and for whom; about 40 terms go unexplained; the story is told twice; key words miss their picture; real footage appears only as one-second thumbnails; and the opening collage is unreadable. Motion research (R6) found v4 uniformly busy rather than under-cut (20.7 moving transitions a minute, a 1.5 s median shot). v5 rewrites the script into about 100 s, told once and forward: the 3 a.m. problem, then what Doc Drift is and for whom, voiced and on screen by 0:27. Then one continuous real loop (link, merge, flagged 19 s later, the exact change, no AI), agents told, a person fixing it, Jira, and an end card with the link and the tagline. Jargon is explained at first use. The picture shows what the voice names, and real recordings are directed at full size. Longer, steadier shots carry small events inside them. It keeps v4's Day look, kit and twins, uses the name Doc Drift (D40), and drops "Catch the slip before your agents do." Direction: [../video/V5.md](../video/V5.md); research: [video/v5/](video/v5/).

### D42. Website v2: a short home page told like the film; the guide holds the technical detail; motion beyond the slip
2026-11-20 · Accepted (Razvan: "check all section first of all for accuracy regarding the product. Then, make sure all information is presented in a clear, succint way for a marketing website. No technical details everywhere, no long texts that make user lose attention, nice animated visuals, nice transitions between sections, good UI/UX")
An audit of every claim on the site (R2) found 20 inaccurate claims on the home page, 14 in the guide and 13 on the privacy page:
- the social card still said "Doc Drift Sentinel";
- the Jira and anchor rules were stated wrongly (a normal folder anchor never flags from file size alone, and a status change flags only on Done or Won't Do);
- there is one MCP URL for every site and one admin switch;
- the agent examples were out of date;
- the byline mock had state icons the real byline lacks.

Research on 12 large sites (R1) found our page as tall as theirs but with about twice the words (1,040 at reading size against a median of 445, a 59-word hero against 20).

What changed:
- **The home page tells the v5 film's story in its words** (D41). It runs from the 3 a.m. problem on a Night panel, through "Doc Drift catches this" (the mark's slip, scroll-linked), to how it works as a pinned board in whole steps, then AI agents, a person fixes it, in Confluence, trust, get started, questions and close.
- **It is 2,134 words down to about 810 of copy, plus the real UI strings inside the visuals.** No JSON, tool names, setup commands or matcher terms.
- **The visuals are HTML twins built from the app's real strings**, plus one real recording from the film: merge to flag, 9.9 s, muted. It plays only in view and has a pause button.
- **The agents section is one answer with a "Without Doc Drift / With Doc Drift" switch.**
- **The guide and the privacy page are corrected line by line against the code** and get "Quick start" and "In short" boxes.
  - The guide gains the real flag rules and a "who can do what" table.
  - Its deepest reference folds away.
  - The privacy page drops "the developer can't browse your data", which is untrue while the development driver ships and Forge gives developers log access by default.
- **The social card is remade from a source file** (`brand/social-card/`).

**Motion.** brand/README.md says the slip is the one motion idea and "nothing else moves on its own". For the website, as D39 did for the film, that widens to:
- the slip leads every animation;
- other motion follows the reader's scroll or plays once on entry (section heads and visuals only);
- the hero loop and the recording, the only things that move on their own, pause off screen and carry a pause button (WCAG 2.2.2);
- reduced motion shows every final state.

It is plain CSS and JS, with no library and no scroll listeners. Page-to-page view transitions apply where browsers support them. The brand book itself is unchanged. Plan and research: [website/](website/).

**Tested.** Four simulated first-time visitors ran two rounds (website/visitor-test/). By round 2 every one scored the problem 5 of 5 and the solution 4, and the Codegeist judge persona ranked the site about 5th to 8th of 40. What they still want is a way to act today: the production share link (`CONFIG.installUrl`) and the public film (`CONFIG.videoUrl`).

**Wrong product copy found on the way, not fixed here:**
- `anchors.jsx:31` says "Whole repository (weak: flags on every merge)", but a whole-repo anchor never flags on size.
- `settings/index.jsx:455`: Jira help says any status change counts.
- `dashboard/index.jsx:203`: "all of them at once", but it is at most 25 pages.
- `shared/copy.ts:92`: Critical anchors also flag on smaller edits.
- `shared/format.ts:604`: "changes to anchored code" also counts Jira.
