# R2: website accuracy audit

2026-11-20. Every claim in `site/` checked against the code (`apps/core`, `apps/bitbucket-relay`, `packages/`), D1 to D41 and the product docs, plus live output from the development app's MCP tools on PLAT (as Razvan Statescu). Accurate claims are grouped; each inaccurate one has a row. No site file was changed.

| Page | Inaccurate | Unverifiable |
| --- | --- | --- |
| index.html | 20 | 5 |
| docs.html | 14 | 2 |
| privacy.html | 13 | 1 |
| 404.html | 0 | 0 |
| site.js | 2 | 0 |

"Matcher run" means scoring a sample change with `packages/matcher/dist` and no page evidence (no removed name or quoted line on the page).

## index.html

| Line | Claim | Verdict | Correct fact and source |
| --- | --- | --- | --- |
| 12 | Social card (og:image) | Inaccurate | `assets/social-card.png` reads "Doc Drift Sentinel", retired by D40 (decisions.md:193-195). |
| 119-133, 278 | A check or slip badge per state in the byline; "always a word and an icon" | Inaccurate | The byline shows the Doc Drift icon and "Possibly stale · Doc Drift" for every state; state icons appear only in the panel and dashboard (manifest.yml:201-203, lib/copy.ts:12-16, 133-135, D33). |
| 132 | Tooltip "...2 minutes ago. Review." | Inaccurate | Tooltips use an absolute date: "PR #482 changed scripts/rollback.sh on Nov 13. Review." (lib/copy.ts:47-50, 100). |
| 152 | Guidance "Safe to cite." | Inaccurate | It opens with the page: `"Payments rollback runbook" is Verified. Safe to cite.` (agent-service.ts:159, 179; live). |
| 266-271 | Propose fix in the panel footer | Inaccurate | It sits in the Proposed fix section; the footer is Dismiss, Snooze 7 days, Mark verified, and Accept fix when drafts exist (review.jsx:233-246, 642-657). |
| 283 | Stale: "Unreviewed for 7 days, or 3 changes" | Inaccurate | Possibly stale for the escalation setting (default 7, 1 to 30), or 3 or more open changes, or a further High change on a Critical anchor (state.ts:39-73, D27). |
| 291 | "Anchor a whole space at once" | Inaccurate | Up to 25 unanchored pages per pass, only pages with suggestions, saved only where you can edit (anchor-space.jsx:34, space-anchors.ts:18, 107-126). |
| 324-327 | "5 Possibly stale" (demo sample) | Inaccurate | Out of date: PLAT's 5 drifted pages are now Stale (live). |
| 345 | The comment "links to the review" | Inaccurate | It ends "Review in the Doc Drift badge." with no link (review.ts:319-333), and also mentions the PR author when their account resolves (notifier.ts:29-32, R-6). |
| 362 | Jira: "Status, fix version, scope and parent changes" | Inaccurate | Flags on status to Done or Won't Do, resolution Won't Do, fix versions, components, parent, description, and deletion. Other status moves and summary edits never flag; at Quiet only Done, Won't Do and deletion. "Scope" is no rule (jira.ts:26-55, config.ts:53-60, review.ts:434; matcher run). |
| 166 | Community quote | Unverifiable | Two sentences from one thread (plan-v1.md:49, 600) joined without the ellipsis product/overview.md:15 keeps; the author is unconfirmed. |
| 373 | "A tool any agent can call", Cursor | Unverifiable | MCP needs an admin switch and per-person consent; in Rovo, only Drift Reviewer and Studio agents that add the tools (forge-rovo-mcp.md:201, 207, 220). Cursor untested (forge-rovo-mcp.md:214). |
| 400-411 | find-docs: 2 pages `possibly_stale` | Inaccurate | Out of date: same pages and order; those 2 are now `stale` (live). |
| 417-431 | check-page-freshness example | Inaccurate | The real replay output has summary `scripts/rollback.sh renamed to scripts/rollback-v2.sh` (reasons.ts:17), date 2026-11-13, and guidance that opens with the page and ends `Affected: "Steps".` (video/src/data/captures.json `toolOutput.checkFlaggedV2`; agent-service.ts:159-183). |
| 435-445 | list-stale: all `possibly_stale` | Inaccurate | Out of date: same rows; all 5 now `stale` (live). |
| 450-455 | Drift Reviewer answer | Unverifiable | Unlabelled, and unlike the real capture (captures.json `captures[63].notes`), quoted below. |
| 464 | "One MCP server per site" | Inaccurate | One URL for every site; you pick the site when you sign in (forge-rovo-mcp.md:204-208). |
| 469 | "...Connected apps, Doc Drift, then Tools" | Inaccurate | View app details, then Tools: one switch, "Expose tools to MCP-compatible apps", exposes all 3 tools (forge-rovo-mcp.md:329). |
| 496-499 | Cursor config | Unverifiable | Untested end to end (forge-rovo-mcp.md:214). |
| 511-516 | What agents can and can't do | Inaccurate | Omits that Drift Reviewer can mark a page Verified when the user says they checked it, after Rovo asks to confirm (manifest.yml:89-117, 184-188; drift-reviewer.md:24). |
| 539, 620 | Page text changes only on Accept | Inaccurate | The rename quick fix ("Replace in N places") also edits as you: "Doc Drift: renamed X to Y for PR #N" (quick-fix.ts:98-103). |
| 549 | "A fix draft keeps only the block it replaces" | Inaccurate | Also the proposed text, rationale and section heading (db.ts:159-183). |
| 559, 608 | AI runs only after Propose fix | Inaccurate | Also when anyone asks Drift Reviewer, as privacy.html:143 says. |
| 587 | "The next merge that touches them flags the page" | Inaccurate | Only main-branch merges that reach the threshold: a one-line replacement on a normal file anchor scores 0.43, under the default 0.5 (config.ts:29-36; matcher run). |
| 593, 628, 681 | Judges first; "free while it's in preview"; GitHub source | Unverifiable | See Uncertain. |
| Rest | Hero copy and proof points; problem points; steps 01 and 03; review, fixes, dashboard and Jira tiles (summary format jira-task.ts:44-49); reverts (D32); renames matched by old path (paths.ts:86-90); dismissals (D34); demo mode; MCP steps 2 and 3, URL, command and CLAUDE.md block (shared/copy.ts:156-168); trust tiles on detection, permissions and signing; FAQ on code hosts, Rovo and restrictions; footer | Accurate | |

## docs.html

| Line | Claim | Verdict | Correct fact and source |
| --- | --- | --- | --- |
| 98 | Connect Jira during install | Unverifiable | Verified for the Marketplace pop-up, not share links (distribution.md:40). |
| 106, 144 | Status, resolution, fix versions, components, summary, description or parent flag; "status, scope..." | Inaccurate | As index.html:362; deletion also flags (review.ts:434-470). Settings help already drops summary (settings/index.jsx:455). |
| 114 | Relay sends files and "a short diff" | Inaccurate | Also title, author name and account ID, branches; diff cut to 150 KB, none above 300 files; files capped at 500 (change-record.ts:30-40, record.ts:6-10, 276-311). |
| 137 | "Open Anchors" | Inaccurate | The Anchors tab exists only while changes are open; otherwise the editor shows at once (byline/index.jsx:280-289, 353-357). |
| 142 | File: flags when "changed, renamed or removed" | Inaccurate | Renames and removals flag (0.70). Edits need about 6 changed lines at the default, or a removed name or quoted line on the page. Critical file anchors flag on any non-cosmetic edit (config.ts:29-51; matcher run). |
| 143 | Glob: "Any matching file changes" | Inaccurate | A normal glob never reaches the default 0.5 from files alone (0.42 at most); it needs a removed name or quoted line, or Strict. Critical globs flag on removals, renames and edits of about 19 lines (config.ts:19, score.ts:68; matcher run). |
| 145 | Whole repository: "Large changes only" | Inaccurate | Never flags on size (0.2 at most), only with a removed name or quoted line (config.ts:19, detection.md:65; matcher run). The product label "flags on every merge" is wrong too (anchors.jsx:31). |
| 152 | Suggestions "for every unanchored page" | Inaccurate | As index.html:291. |
| 153 | "Save anchors and mark verified" | Inaccurate | The button reads "Save and mark verified" (shared/copy.ts:96). |
| 168 | Snooze "Hides the change for a week" | Inaccurate | The change stays listed as Snoozed. Snooze covers every open change, needs edit rights, pauses escalation (Stale drops to Possibly stale) and skips owner comments (review.jsx:110, state.ts:56-66, notifier.ts:28, review-service.ts:307-319). |
| 169 | Dismiss "Closes the change with a reason" | Inaccurate | Closes every open change at once, needs edit rights, lowers the anchor's weight by 0.1 per dismissal (floor 0.3); dismissing the last change records you as reviewer (byline/index.jsx:316-323, weights.ts:6-14, review-service.ts:268-305, D31, D34). |
| 178 | "Select a row to open the page" | Inaccurate | Rows have a title link and a Review button, plus a state filter (dashboard/index.jsx:263-269, 295-301). |
| 204 | "Under Tools, turn on the tools" | Inaccurate | As index.html:469. |
| 213 | Cursor | Unverifiable | As index.html:496. |
| 255 | Possibly stale: "Cite with a caveat" | Inaccurate | Agents are also told "Do not present steps from this page as current." (agent-tools.ts:219-249). |
| 276 | "A whole-repo anchor on a small change" | Inaccurate | It never flags on size (line 145). |
| Rest | Before you start; install steps 1, 3, 4 (distribution.md:39); Jira path (forge-platform.md:407); relay steps and labels (settings/index.jsx:272-314, relay frontend/index.tsx:170-258, forge-bitbucket-jira.md:102, 159); demo (demo.ts:15-36); suggestions, Critical; the other review actions; dashboard; settings defaults (ingest-rules.ts:99-114); MCP steps 2 and 3, block, tools table (agent-service.ts:190, manifest.yml:62-66); Rovo; other states; troubleshooting (test-report-2026-11-11.md:16); support | Accurate | Label nit: "Ignore globs, one per line" (settings/index.jsx:341). |

## privacy.html

| Line | Claim | Verdict | Correct fact and source |
| --- | --- | --- | --- |
| 53 | "Last updated November 13, 2026" | Inaccurate | Edited 2026-11-17 (commit 00cb051). |
| 88 | AI only on Propose fix | Inaccurate | Line 143 says it: also when anyone asks Drift Reviewer. |
| 100 | Logs hold "IDs, counts and outcomes" | Inaccurate | Also file paths, change reasons, tooltips and comment lines with author names; never page text (matching.ts:206-213, page-state.ts:110, notifier.ts:58, 68). |
| 100 | "The developer can't browse your data" | Unverifiable | Holds only once the dev driver is removed before production (manifest.yml:315-318). |
| 110 | Reads "Confluence pages you anchor" | Inaccurate | Also any page whose badge is opened, pages agents ask about, and a space's page list (byline.ts:58-82, agent-service.ts:118-122, space-anchors.ts:37-80). |
| 112 | Relay reads title, author, commit, files, diff | Inaccurate | Also the author's account ID (for an @mention) and branch names; 500 files, 150 KB diff (change-record.ts:30-40, record.ts:276-311). |
| 113 | Jira: changed fields, old and new values | Inaccurate | Also the issue's current summary, status, resolution, fix versions, components, parent, who changed it, and deletions (product-events.ts:34-87). |
| 114 | Jira projects only on Create Jira task | Inaccurate | Also up to 200 browsable project keys when a page suggests a Jira key (suggestions.ts:58-66, jira-task.ts:143-161). |
| 128 | Changes contents | Inaccurate | Also branches, line counts, the author's account ID; Jira: the changer's name, summary, status category (db.ts:82-102, 284-305). |
| 125-134 | Store table | Inaccurate | Omits rename proposals, comment records (ID, lines with names, owner), the Jira task key, relay ping data, the secret's fingerprint and creator, and the settings URL (db.ts:124-156, 187; settings-store.ts:13-17, 57-83). |
| 137 | Property holds "the state, a title and a tooltip" | Inaccurate | A title and a tooltip only; the title leads with the state (lib/copy.ts:12-20, 133-135). |
| 162 | Metadata written after a permission check | Inaccurate | Background jobs also write it with no click: merges, Jira changes, hourly escalation, trash and restore (page-state.ts:105, product-events.ts:118-162). |
| 163 | "One footer comment per page" mentioning the owner | Inaccurate | At most one new comment per 24 hours, later changes appended; it also mentions the PR author (review.ts:325-345, notifier.ts:29-60). |
| 175-183 | Scope purposes | Inaccurate | Incomplete: read:confluence-user also reads names (confluence.ts:202); read:space:confluence lists spaces in settings (confluence.ts:180); read:jira-work lists projects (jira-task.ts:108-151); content.summary also brings restored and moved events (manifest.yml:264-274). The scope list matches manifest.yml:396-414. |
| Rest | Who we are; Forge, no servers of ours; no page bodies; daily 30-day purge (product-events.ts:164-178); permissions; no analytics or cookies; storage, encryption, 28 days after uninstall (forge-platform.md:263-264; re-link within 21 days on request); relay egress; secret store; AI inputs, 4,000 characters per diff (agent-tools.ts:263); who sees what (D20, D21, D30); Jira tasks (D35); relay scopes; deletion (db.ts:869-885); contact | Accurate | trust-safety.md:7 still says "200 diff lines". |

## 404.html and site.js

| Line | Claim | Verdict | Correct fact and source |
| --- | --- | --- | --- |
| 404.html | No product claims | Accurate | |
| site.js:7-10 | Install and video links empty | Accurate | No share link or public video yet. |
| site.js:172 | Drifted guidance | Inaccurate | No page lead, no "Affected", wrong date: use the real string below. |
| site.js:173 | "Safe to cite." | Inaccurate | `"Payments rollback runbook" is Verified. Safe to cite.` |

## Cross-checks

- **Product name.** HTML and JS pass (`dds-theme` is a code key); the social card fails.
- **States.** Names and icons match the brand; only the byline mock misleads.
- **D38.** Pass: "what it describes changed in PR #482" (index.html:427, site.js:172), never "changed by".
- **Dana and Sam.** Consistent (index.html:119, 127, 225, 350, 453; Sam is the demo author Sam Rivera, demo.ts:17). The clock isn't: "merged 2 minutes ago" (site.js:175) against "2 hours ago" (index.html:252).
- **Dates.** The examples say 2026-11-10; PR #482 merged and was replayed on 2026-11-13 (V5.md:74). The Nov 13 snapshots no longer match PLAT.

## Live output, 2026-11-20

- check-page-freshness, runbook: `"Payments rollback runbook" is Verified. Safe to cite.`
- check-page-freshness, Refunds API guide: `"Refunds API guide" is Stale. Do not present steps from this page as current. Cite with caveat: what it describes changed in PR #12 on 2026-11-11, after it was last verified. Unreviewed for 8 days.`
- find-docs-for-path (`payments-api`, `deploy/helm/values.yaml`): the same 5 pages, 2 `stale` and 3 `verified`, each with `citePolicy`; guidance names all 5 and says `2 of them are Possibly stale or Stale.`
- list-stale-pages (PLAT, 5): the same 5 rows, all `stale`, `do_not_cite`.
- Possibly stale runbook (last real capture, 2026-11-13): `"Payments rollback runbook" is Possibly stale. Do not present steps from this page as current. Cite with caveat: what it describes changed in PR #482 on 2026-11-13, after it was last verified. Affected: "Steps".`
- Drift Reviewer, same day: "Payments rollback runbook is Possibly stale. What it describes changed in PR #482 on 2026-11-13, after it was last verified. The affected section is "Steps". Do not present steps from this page as current. The review is in the Doc Drift badge on the page."

## Missing

- The comment mentions the PR author too (R-6).
- Verified pages show the watch working: "1 anchor change since, none flagged" (lib/copy.ts:118-126, R-8).
- After a rename: "Move anchor" or "Keep"; the quick fix moves the anchor and closes the change (review.jsx:320-340, fix-service.ts:378-405).
- A revert also flags pages verified against the original (D32).
- Deleting an anchored Jira issue flags the page.
- Rights: view for Mark verified and Create Jira task; edit for dismiss, snooze, drafts, fixes and anchors (D31, D35). Viewers see summaries, editors diffs (D30).
- Dismissing the last change records the reviewer; Mark verified is refused with no anchors (D34).
- "Tracked in PAY-201" on the change, "An update is tracked in..." for agents (D35).
- citePolicy values; short `/wiki/x/` links and titles resolve; other sites' links are refused.
- Moved pages keep their anchors; restored pages return Unanchored (product-events.ts:104-142).
- Unwatched spaces say so in the panel, with an Open settings link.
- Speed: merge to flag in 11 s and 18.6 s in tests (CLAUDE.md, V5.md:74).
- Eval: 40 scenarios, precision 1.00, recall 0.94 (detection.md:73).
- Privacy: GitHub Pages hosts the site and can log visitor IP addresses.

## Plain language

| Term (home page) | Plain wording | Source |
| --- | --- | --- |
| Anchor | "links the page to the files and Jira issues it names" | V5.md:58, R4:119 |
| Deterministic matcher | "No AI made that call. Same change, same result." | V5.md:62, R4:136 |
| MCP | "an open standard for AI tools" | V5.md:65 |
| Coding agents | "coding assistants" | V5.md:65 |
| Rovo, Drift Reviewer | "Atlassian's AI", "our agent" | V5.md:63 |
| Confluence | "Atlassian's wiki" | V5.md:56 |
| Possibly stale | "it may be out of date" | V5.md:61 |
| Byline, badge | "the label at the top of the page" | R4:125 |
| Glob | "a folder" | none in V5 |
| Content property | "stored with the page" | none |
| PR | "pull request" | V5.md:33 |
| Space, drift debt | "each team's area", "pages to review" | R4:143 |
| Cite | "the AI can quote it" | R4 |
| Relay | "a small Bitbucket app" | R4:135 |
| "Catch the slip..." | drop it | V5.md:41 |

## Move to docs

- MCP URL, `claude mcp add`, Cursor JSON, the admin path (index.html:461-501) and the CLAUDE.md block (504-510).
- JSON and tool names in the agent tabs (377-458): show one answer as a sentence.
- State rules, escalation, sensitivity, ignored paths (283, 357).
- Matcher mechanics (214, 534, 359-360).
- "Page views run no app code" (278), signing (554), the 30-day purge (549), version messages (539, 620), relay setup (582).

## Uncertain

- Production share link (site.js:8) and "shared with judges first" (index.html:593, docs.html:94): production waits for Razvan (CLAUDE.md).
- Pricing (index.html:628): nothing decided (D19); a multi-app listing must be paid (forge-platform.md:352).
- Rovo metering starts Dec 3 (forge-rovo-mcp.md:249); whether MCP calls use credits is unverified (forge-rovo-mcp.md:224).
- The film is local only; GitHub links work after Dec 19 (site/README.md:30).
- The registered app name: R4:84 saw comments signed "Doc Drift Sentinel"; D40 doesn't say the console name changed.
- MCP admin UI: per-tool in the docs, one switch live (forge-rovo-mcp.md:322, 329).
- Deleted data stays soft-deleted at Atlassian for a while (forge-platform.md:264).
- "18 of 24 pages anchored" not checkable live (last seen 2026-11-12).
- Live tool descriptions differ from manifest.yml:9-12 (maybe a cached list).

## Draft plan claims to fix (plan.md)

- "Rovo and coding assistants ask Doc Drift": Rovo itself doesn't (forge-rovo-mcp.md:307).
- "Seconds later ... tells the owner": the comment waits 10 minutes by default (ingest-rules.ts:106); Jira events can take 3 minutes (detection.md:38).
- "A Confluence admin installs it": a site admin (distribution.md:39).
- "Runs on Atlassian" is an Atlassian program (D11); say "built on Atlassian Forge".
- The hero tooltip isn't real copy: use "PR #482 changed scripts/rollback.sh on Nov 13. Review."
- "Often in one click": only for file renames the page names.
- "The next merge that touches them flags the page": as index.html:587.
