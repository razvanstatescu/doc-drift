# R4 · Comprehension audit of the v4 launch film (toward v5)

Expert audit of `video/out/doc-drift-v4.mp4` (2:35, 4657 frames at 30 fps), written 2026-11-17 for v5. Trigger: a friend who
works mostly in Jira, not Confluence or Bitbucket, watched v4 and did not understand what the product does; Razvan also
finds it a bit long and boring. The goal for v5: shorter, the problem and the solution said very plainly, and the picture
tightly matched to the words. The product is now called **Doc Drift** (D40); the film still says "Doc Drift Sentinel".

Inputs: [`video/V4.md`](../../../video/V4.md), [`video/BRIEF.md`](../../../video/BRIEF.md) sections 2 and 2b,
`video/src/data/timeline.json` (lines and word timings), [`docs/product/overview.md`](../../product/overview.md),
[`docs/hackathon/codegeist-rules.md`](../../hackathon/codegeist-rules.md), [`docs/video/v4/R3-crafted-product.md`](../v4/R3-crafted-product.md).

Method: frames pulled with ffmpeg at the start, middle and end of every narration line, at the onset of 95 key spoken
words, at the middle of every silence of 1 s or more, and every 0.5 s through the whole film. Every 0.5 s sample was read
with macOS Vision OCR (word counts, and text size). Sizes are approximate: the OCR line-box height in film px, or the size
set in the code where I checked it (the 156 px captions, the 120 px V10 phrases, the 40 px who-for line). Focal elements
are judged from the stills and the motion design (biggest, brightest, moving), not from eye tracking. Evidence is in
`video/out/v5/r4/` (git-ignored, local only), listed at the end.

## 0. The answer in brief

- **v4 never says, in one sentence, what Doc Drift does, for whom and why.** The pieces are spread from 0:10 to 2:25.
  "Who it's for" ("For teams who keep runbooks in Confluence") is on screen only, at 40 px in muted grey under 120 px
  phrases, for 3 s at 0:54, and is never spoken. The plainest sentence about the benefit, "Agents are told not to trust
  this page until someone reviews it.", exists only as small UI text inside proofs. The voice first says what the product
  does at 0:36, 29 s after it says the name.
- **The film assumes about 40 terms** a Jira-only viewer may not know: runbook, merge, pull request and "PR", diff, anchor,
  Confluence (never shown as Confluence), Possibly stale, badge, Rovo, Drift Reviewer, MCP, coding agent, JSON, Bitbucket,
  space, ADR, "slip". The core verb, *anchor*, is never defined in words. Rovo and MCP are never glossed. "PR" is on
  screen for about 40 s of the film (79 of 311 half-second samples) and is never spoken.
- **The voice says little and the screen says a lot.** Narration averages 1.76 words per second over the film (an explainer
  usually runs 2.5 to 3); 46 s of the film (30%) has no voice in silences of 1.5 s or more. Meanwhile the screen shows 5 to
  20 distinct words per second of film in each scene, up to 170 words in one frame, much of it small (39% of the text
  lines in P4 and 75% in P5 are under 26 px). In at least 14 places the viewer must read one thing while hearing another.
- **The story is told twice, and the page's state resets.** A2 (0:36 to 0:57) shows the whole loop (anchor, flag, tell the
  agents, a person decides); then P1 to P4 (0:57 to 2:11) show the same loop again on the same page, which jumps back from
  Possibly stale to Unanchored with no signpost. Between 0:40 and 2:22 the runbook's label changes 7 times.
- **At several key words the picture does not show what the words say:** no anchors on screen at "anchors" (0:37); the
  "exact change" tooltip names `deploy/helm/values.yaml`, not the renamed script the story is about (1:18); "for anything
  bigger" is shown with another small rename (1:59); "before step 2" (2:25) calls back a step number that was never
  spoken; "Track in Jira", the most Jira-relevant feature, is on screen for 4 s with no voice at all (2:16).
- **What works and should stay:** the 3 a.m. story (problem shown, not told), the failing command, the AI repeating the old
  step, the 19 s roll, "No AI made that call" (the voice explains *deterministic* plainly), "Nothing changes until a person
  accepts", the snap back to Verified, the A4 rhyme with A1, and the real proofs (fewer and bigger in v5).
- **v5 skeleton, about 99 s** (section 5.3): problem at 3 a.m. (15 s) · the gap in three lines (4 s) · the promise: what,
  for whom, why (10 s) · link a page (8 s) · a code change flags it (14 s) · AI assistants are told (15 s) · a person fixes
  it (15 s) · Jira (7 s) · payoff and end card (11 s). A short variant runs about 80 s. Cuts remove about 74 s of v4; new
  plain-language material (the gap, the promise, the glosses) adds back about 18 s.

## 1. Line by line

Stills: each line's start, middle and end frames are stacked in `video/out/v5/r4/lines/<ID>.jpg`
([V07 example](../../../video/out/v5/r4/lines/V07.jpg)); frames at key words are in `video/out/v5/r4/keywords/grid-*.jpg`;
single frames are `video/out/v5/r4/frames/fNNNNN.jpg` (film frame number). S, M, E are the start, middle and end frames.
Sizes are on the 1920 x 1080 film. "Match" asks whether the picture shows exactly what the words say at that moment.
Silences with their own content are listed as rows too.

| Line · time | Words | On screen at S · M · E (stills) | Focal element | Match | Jargon: voice / screen |
| --- | --- | --- | --- | --- | --- |
| **Barrage** 0:00.0–0:06.0 (quote 0:01.3–0:05.8) | Mikey Ariel: "Bad documentation or outdated documentation is worse than no documentation." (12 words) | S f0: caption "The code moved." (156 px) over our diff card "Merged · − scripts/rollback.sh · + scripts/rollback-v2.sh". M f101: "The docs didn't." over a UK MoJ runbook banner ("This might mean the content is out of date"). E f170: "The agents can't tell." over Atlassian's blog line "AI agents are only as good as what they know." 20 third-party plates, about 14 of them as the sharp subject; from f98 on, a new one lands every 5 to 8 frames (Wikimedia holds about 1.3 s, Atlassian's line about 0.7 s). Sheets `A0-barrage-1` to `-7` | Split: the still caption on top, and the plate under it that whips, lands and gets marked (the moving plate wins) | **Partly.** Captions and quote state the problem; the plates are texture (the brief's reading formula needs about 4 s for a 10-word phrase; most plates get 0.17 to 0.27 s). Three streams at once: caption, plate phrase, quote | Voice: none. Screen: "Merged", −/+ diff, "AI PRs", "Pull Requests", "retrieval", "ROVO Agent", "Copilot", "runbooks", "stale file", source chips |
| **V00** 0:06.5–0:08.8 | "That's why we built Doc Drift Sentinel." | S f195: black, "That's" rising. M f229: "That's why we built / Doc", white on black. E f263: empty Night ground (title cut at f262). `V00` | The words, one by one (the only object) | **Yes**, word for word. But "That's why" points back at plates nobody could read, and the name comes before the problem | Old name (D40) |
| **V01** 0:09.7–0:12.0 | "Docs that know when the code moved." | S f292: the tile, middle band slipped in amber (the first amber). M f325 · E f358: lockup "Doc Drift Sentinel" and the same tagline. `V01` | The amber slip in the mark, then the tagline | **Yes** (same words). Abstract: no page, no warning, no Confluence, no AI | "the code moved" (metaphor); the slip (never explained) |
| *(silence)* 0:12.0–0:14.2 | | The lockup holds; hard cut to 03:07 | | | |
| **V02** 0:14.2–0:16.3 | "It's 3 a.m. Payments is down." | S f427: "03:07" rolling in (about 250 px). M f458: alert card "SEV-2 · payments-api · Error rate 13% · Triggered 03:07". E f488: error rate 14%, red spike. `V02` | The clock, then the rising error rate | **Yes** | Screen: "SEV-2", "payments-api" |
| **V03** 0:17.2–0:20.0 | "The runbook says to run rollback.sh." | S f517: whip blur, landed by the first word (f519). At "runbook" f522: page "Payments rollback runbook", "Reviewed 34 days ago". M f559: Steps; step 2 "Run the rollback script from the root of the payments-api repo." with `./scripts/rollback.sh` marked. E f600: a terminal lifts over the dimmed page. `V03` | The marked command (Mist band and underline) | **Yes** on both key words | Voice: "runbook" (never defined), "rollback.sh" read as a file name. Screen: "repo", `export ROLLBACK_TIMEOUT=300`, "pod is failing readiness" |
| **V04** 0:21.2–0:23.3 | "That script was renamed last week." | S f637: the command typed. M f668 · E f699: red "zsh: no such file or directory: ./scripts/rollback.sh" and a card "Renamed · merged 6 days ago", old path struck, new path in amber. `V04` | The amber new path; the red error second | **Yes** | Screen: "zsh", "no such file or directory", "merged", −/+ diff |
| **V05** 0:24.7–0:27.8 | "The page still looks fine. It was reviewed a month ago." | S f742 (and at "page", f748): still the terminal and the rename card. M f787: the page with "✓ Reviewed 34 days ago" (25 px, underlined) beside "A date can't see a merge." setting at about 120 px. E f832: statement complete. `V05`, `grid-02` | The statement "A date can't see a merge." (biggest), not the small byline the voice is about | **Partly.** "The page" is said over the terminal; then the eye reads a sentence the ear never hears | Screen: "merge" as a noun. The film's key insight lives on screen only, in jargon |
| **V06** 0:29.2–0:33.4 | "Ask an AI agent, and it reads you the same step, with confidence." | S f877: whip blur, landed by "Ask" (f881). M f939: "AI assistant" panel, "How do I roll back payments-api?", answer streaming. E f1001: the old command, Copy, source chip "Payments rollback runbook". `V06` | The streaming answer, then the source chip | **Yes** ("with confidence" is implied by the clean answer and the Copy button) | Voice: "AI agent" (fine). Screen: "repo", the command |
| *(silence)* 0:33.4–0:36.2 | | The answer holds; the Day slip cut (f1057); the runbook in Day | | | |
| **V07** 0:36.2–0:41.5 | "Doc Drift Sentinel anchors each Confluence page to the code and Jira work it describes." | S f1087: the runbook in Day, close. At "anchors" f1124: the page alone, nothing anchored yet. At "Confluence" f1145: the page splits into three bands. At "code" f1183: "Anchored to code" and chips `payments-api: scripts/rollback.sh`, `payments-api: deploy/helm/values.yaml`. At "Jira" f1201: "and Jira." and "PAY-6 Jira issue". E f1243: statement complete (112 px); the byline now reads "Verified · Doc Drift". `V07`, `grid-03` | The page splitting, then the statement; the anchors themselves are 25 to 28 px chips | **Partly.** At "anchors" nothing is anchored; nothing on screen says Confluence; values.yaml is not part of the story; the byline flips from Reviewed to Verified with no word about it | Voice: "anchors" (the core verb, never defined), "Confluence page", "Jira work". Screen: "Anchors", file paths, `deploy/helm/values.yaml` |
| **V08** 0:42.7–0:46.5 | "When those change, the page is flagged: Possibly stale." | S f1282: page and anchor rail. At "change" f1298: a record "PR #482 · scripts/rollback.sh → scripts/rollback-v2.sh" slides under the rollback anchor (about 26 px). M f1339: the Steps band outlined in amber and slipped; the byline still says Verified. E f1395: push in to "Possibly stale · Doc Drift" (amber, about 70 px). `V08` | The amber Steps band, then the amber label | **Yes, with a lag:** the label turns at "Possibly", not at "flagged"; "those change" is a small "PR #482" chip | Voice: "flagged", "Possibly stale". Screen: "PR #482" (first "PR" of the product part), arrow notation |
| **V09** 0:47.2–0:49.9 | "And every agent that reads it is told the same." | S f1417: the big label. M f1457: page, a "Drift Reviewer" chat panel, and a dark "Coding agent · MCP · doc-drift" slab typing `check-page-freshness {"pageId": "2720100"}`. E f1496: "Payments rollback runbook is Possibly stale." and `"status": "possibly_stale"` (88 px). `V09`, `grid-04` | The dark slab (highest contrast) and the line drawn from the label | **Partly.** Two kinds of agent are shown being told, through names the voice introduces only at 1:28 (Drift Reviewer) and 1:43 (MCP), and a JSON call. "The same" is vague | Voice: "agent". Screen: "Drift Reviewer", "Coding agent · MCP", `check-page-freshness`, `pageId`, `possibly_stale` |
| **V10** 0:51.2–0:55.8 | "Anchor. Flag. Tell the agents. Then a person decides." | S f1537: "Anchor.". M f1606: "Flag." (amber band), "Tell the agents.". E f1674: "Then a person decides." and "For teams who keep runbooks in Confluence" (40 px in muted grey under the 120 px phrases; on screen 0:54.0 to 0:57.2; never spoken). `V10` | Each phrase as it lands; "Flag." in amber | **Yes**, word for word. The film's only "who it's for" is the unspoken small line here | "Anchor" and "Flag" as verbs, before either was explained |
| **V11** 0:57.7–1:04.3 | "Open any page. Doc Drift reads the paths and Jira keys already on it, and suggests anchors." | S f1732: the runbook again, now "Unanchored · Doc Drift", tooltip "Not linked to code or Jira. Add anchors.". At "page" f1755: first real capture, "Recorded in Confluence", "Real capture, development install" (its tooltip about 20 px). M f1830 ("paths"): `scripts/rollback.sh` lifts out at about 2x; "PAY-6" lifts at "Jira" (f1840). E f1928: "Suggests anchors." (about 130 px) and the real panel "Suggested from this page (2)", "Repository for suggested paths", "Needs a repository", "Weak". `V11`, `grid-05` | The lifted tokens (big, moving), then the statement | **Yes**, phrase by phrase. But the page jumps back from Possibly stale (0:46) to Unanchored with no signpost: the demo restarts the story the viewer just saw | Voice: "paths", "Jira keys", "anchors". Screen: "Unanchored", "Repository", "Weak", "development install" |
| **V12** 1:05.7–1:07.9 | "Save, and the page is Verified." | S f1972: real panel, click on "Save and mark verified". M f2004: real "Saved 2 anchors. This page is Verified. Reload the page to see the new badge." beside the twin, which still reads Unanchored. E f2036: "✓ Verified." (about 120 px) and the real tooltip "Verified on Nov 13. Watching 2 anchors.". `V12` | The click, then "Verified." | **Yes** | Screen: "anchors", "badge", "Reload the page" |
| **V13** 1:09.7–1:13.8 | "Now a teammate merges a pull request that renames the rollback script." | S f2092: Bitbucket PR card "Rename rollback script and timeout variable", "#482 scenario/rename-rollback-script → main · Open", Merge, "Files changed 2". At "merges" f2121: cursor on Merge. At "pull" f2135: real merge dialog (Source, Destination, Merge strategy, Commit message; about 15 px). M f2153: real "Merged pull request ... 7 seconds ago". At "renames" f2167: the card reads Merged; `scripts/rollback.sh` lifts. E f2213: real diff hunk (about 20 px). `V13`, `grid-06` | The Merge button and cursor, then the lifted token | **Yes**, wrapped in Git UI | Voice: "merges", "pull request". Screen: "Bitbucket" (never spoken), branch names, "main", "+3 −3", "Merge strategy", commit hash, diff hunk |
| *(silence)* 1:13.8–1:16.2 | | "Merge to flag" starts rolling; "Bitbucket relay" → chip "PR #482 · 2 files −v2" → "Doc Drift matcher" | The rolling number | | "relay", "matcher" (architecture) |
| **V14** 1:16.2–1:20.3 | "Seconds later, the runbook is flagged, with the exact change." | S f2287: "8 s", the chip travelling. At "runbook" f2325: "16 s", the page still Verified. M f2347: "19 s" (about 230 px), "Possibly stale · Doc Drift" and the tooltip "PR #482 changed deploy/helm/values.yaml on Nov 13. Review.". E f2407: real capture "Recorded in Confluence, flagged 19 s after the merge", same tooltip (about 20 px). `V14` | The 19 s number (biggest, rolling) | **Partly.** "Seconds later" and "flagged" are exact; "the exact change" shows a tooltip naming `deploy/helm/values.yaml`, not the renamed script the story is about | Screen: "Merge to flag", "Measured on the demo site", "PR", `deploy/helm/values.yaml` |
| **V15** 1:21.2–1:26.1 | "No AI made that call. Same change, same result, every time." | S f2437: "No" and the flagged page, tooltip still up. M f2509: "No AI made that call." (about 117 px), "0 AI calls", "Our eval set: 40 scenarios, 0 false flags, 2 known misses", real reason text (17 to 20 px). E f2581: "Deterministic matcher" card: the rename, three ticked reasons, "Score 1.00 (threshold 0.5)", "Possibly stale" and three dots. `V15`, `grid-07` | The statement, then the ticks | **Partly.** The first sentence is shown exactly; "same result, every time" is only hinted by three small dots | Voice: none (it explains *deterministic* plainly, which is good). Screen: "Deterministic matcher", "eval set", "false flags", "known misses", "Score", "threshold" |
| **V16** 1:27.7–1:31.3 | "Ask Drift Reviewer, our Rovo agent, how to roll back." | S f2632: "Ask", the Drift Reviewer header, the flagged page. M f2685 ("Rovo"): "Ask Drift Reviewer." and the real Rovo start screen: "Checks whether a Confluence page's code anchors changed, explains the change, and drafts fixes for you to accept." with three starters (about 20 px). E f2738: "How do I roll back payments-api?" typed. `V16` | The statement, then the typing | **Yes.** "Rovo" exists on screen only as the tag "Recorded in Rovo" | Voice: "Drift Reviewer", "Rovo agent" (neither explained). Screen: "code anchors", "drifted sections" |
| *(silence)* 1:31.3–1:34.2 | | Real Rovo: "Drift Reviewer is thinking", "Invoking tool: Read Skills for agents", "Invoking tool: Check page freshness" | The ticking steps | | "Invoking tool", "Skills" |
| **V17** 1:34.2–1:39.3 | "It doesn't repeat the old step. It says the page is Possibly stale, and why." | S f2827: the twin with the thinking steps, a dashed ghost of the old command. At "old" f2861: the ghost slips out in amber. M f2903: the answer streams. At "Possibly" f2925: real Rovo answer (about 16 px) and "It says why.". E f2979: full answer, 34 words ("What it describes changed in PR #482 on 2026-11-13, after it was last verified. The affected section is "Steps". Do not present steps from this page as current.") and "It says why." (about 120 px). `V17`, `grid-08` | The amber old step, then the amber "Possibly stale" in the answer | **Yes.** But the eye reads a 34-word answer while the ear gets a 15-word summary of it | Screen: "PR #482", ISO date, "Referencing" |
| **V18** 1:40.7–1:46.9 | "Coding agents get the same signal over MCP: which pages cover a file, and which to trust." | S f3022 ("Coding"): whip blur. At "signal" and "MCP" (f3068 to f3089): `find-docs-for-path` JSON ("title", "url", "anchor", "match": "exact", "status": "possibly_stale" in amber, "statusLabel", "citePolicy": "cite_with_caveat"). M f3114: "Agents read as you." setting, tag "Real output: doc-drift MCP, called as Razvan Statescu, Nov 13". At "file" f3157: page card "2720100" and "3 pages document this path". E f3206: `check-page-freshness` with "guidance" (6 lines), "Agents read as you. They never edit a page." and "Do not present steps from this page as current." (about 107 px). `V18`, `grid-09` | The dark JSON slab with its amber token; at the end the big statement | **Partly.** "Which pages cover a file" gets a small chip; "which to trust" gets the guidance; two sentences the voice never says compete for the eye, and no coding assistant is ever seen asking | Voice: "coding agents", "MCP", "signal". Screen: JSON keys, tool names, `cite_with_caveat`, "read as you" |
| *(silence)* 1:46.9–1:49.7 | | The MCP slab and statements hold; whip down to P4 | | | |
| **V19** 1:49.7–1:52.9 | "The page owner gets one comment, and opens the review." | S f3292: comment card "Doc Drift Sentinel · @Razvan Statescu PR #482 (merged by Razvan Statescu) changed 2 files this page documents. Review in the Doc Drift badge.". At "owner" f3308: "One comment.". M f3339: the real comment (author "Doc Drift Sentinel"). At "opens" f3359: cursor on the label. E f3385: review panel: "PR #482 renamed scripts/rollback.sh to scripts/rollback-v2.sh, an anchor of this page.", "Agents are told not to trust this page until someone reviews it.", tabs, What changed (High, Medium), Affected section, Quick fix. `V19`, `grid-10` | "One comment.", then the click, then the panel | **Yes** | Screen: "PR", "anchor", "badge", "High", "Affected section"; old name in a real capture |
| **V20** 1:54.2–1:57.4 | "A rename gets a one-click fix, with no AI." | S f3427: card "Replace scripts/rollback.sh with scripts/rollback-v2.sh in 1 place. Suggested from PR #482. No AI used. Edits the page as you, with a version message that names the PR." M f3474: real "Replaced ... Reload the page to see the change.". E f3520: done, and "No AI used." (about 138 px). `V20` | The card, then "No AI used." | **Yes** | Screen: "version message", "PR" |
| **V21** 1:58.7–2:04.7 | "For anything bigger, Drift Reviewer drafts the edit. Nothing changes until a person accepts." | S f3562: "Proposed fix · Drift Reviewer drafts the change. Nothing changes until you accept it.". At "bigger" f3582: click on Propose fix. At "Drift" f3605: "Drift Reviewer · Rovo agent · Please review · Submit fix proposal". At "drafts" f3628: two red and green diffs, "Confirm selected". M f3652: real draft "PR #482 renamed ROLLBACK_TIMEOUT to ROLLBACK_TIMEOUT_SECS.". At "Nothing" f3673: whip. At "accepts" f3722: real action bar, click on Accept fix. E f3741: "Nothing changes until a person accepts." and real "Accepted. A new page version names PR #482.". `V21`, `grid-11` | The red and green diff, then the statement | **Partly.** "Anything bigger" is shown with another small rename (a variable name); Rovo's confirmation step is on screen but not in the words | Voice: "drafts the edit". Screen: diff notation, `ROLLBACK_TIMEOUT_SECS`, "Submit fix proposal", "Confirm selected", "page version" |
| **V22** 2:05.2–2:07.9 | "Verified. Now the agent can cite it." | S f3757: the snap back, the Steps band slides into line, "Verified." blurs in. M f3796: "✓ Verified." and the real "Verified on Nov 13. Watching 3 anchors.". E f3835: "Safe to cite." and JSON `"status": "verified"`, `"citePolicy": "cite"`. `V22` | "Verified.", then "Safe to cite." | **Yes** (the agent is a JSON slab, not an assistant answering) | "cite", JSON. Nit: "Watching 3 anchors" here, "Saved 2 anchors" in P1 |
| *(silence)* 2:07.9–2:11.7 | | Real page history: "Doc Drift: accepted proposal for PR #482" (17 to 20 px); "Safe to cite." holds; cut to P5 | "Safe to cite." | | "page history", version numbers |
| **V23** 2:11.7–2:16.1 | "Jira changes count too. And every space gets a drift dashboard." | S f3952: a Jira card "Epic · PAY-18 Multi-region active-passive database · To Do" linked to "ADR-015: Active-passive multi-region database" (Verified), and "Jira changes count too.". At "count" f3977: Done; the ADR page turns Possibly stale. M f4018: real Jira "Done" and the real ADR tooltip "PAY-18 moved to Done on Nov 13. Review." (tiny). E f4083: "Every space gets a drift dashboard." and "Drift in PLAT": a table of 6 pages and four stats (14 to 20 px), "Sample data from the demo space". `V23`, `grid-12` | The two statements; the status flip | **Partly.** True and on time, but a second example (a decision record and an epic) gets 2 s, and the dashboard cannot be read | Voice: "space", "drift dashboard". Screen: "Epic", "ADR-015", "Architecture decisions", "PLAT", "Severity" |
| *(silence)* 2:16.1–2:20.2 | | "Track in Jira": "PAY-18 moved to Done, and this page is anchored to it.", "Creates a Jira task as you...", real "Jira task created · PAY-24 tracks this change.", Dismiss, Snooze 7 days, Mark verified; slip into Night | The panel | | The most Jira-relevant feature in the film is never spoken |
| **V24** 2:20.2–2:25.3 | "Next time it's 3 a.m., the runbook tells you, and your agent, before step 2." | S f4207: "03:06". At "3" f4237: 03:07 and the alert card. At "runbook" f4266: whip blur. M f4283: the runbook with "Possibly stale · Doc Drift" (amber) above the Steps. At "agent" f4311: the assistant starts "Payments rollback runbook is Possibly stale.". E f4359: "What it describes changed in PR #482, after it was last verified." and the source chip. `V24`, `grid-13` | The clock, then the amber label, then the amber words in the answer | **Partly.** A good rhyme with A1, but "runbook" lands on a blur, and "step 2" was never said before (it was only the number "2." on screen at 0:18) | Voice: "step 2" (callback). Screen: "PR #482" |
| **V25** 2:28.2–2:32.1 | "Doc Drift Sentinel. Catch the slip before your agents do." | S f4447: Day end card, lockup. M f4505: "Catch the" rising. E f4562: "Catch the slip / before your agents do." and "Built on Atlassian Forge for Codegeist 2026" (about 26 px). `V25`, `grid-14` | The mark's amber slip and the tagline | **Yes**, word for word. "The slip" is the logo's private metaphor; a newcomer hears "the mistake" at best | "slip", "Forge", "Codegeist"; old name |

Tally: 17 rows **yes** (V08 with a lag), 10 **partly** (counting the barrage), none **no**. The partial matches cluster
where the film is supposed to explain the product (V07, V09), where it proves the change (V14, V15), the agents (V18) and
the fixes (V21), and at the payoff (V24). Two words that carry the idea play over a whip blur: "Coding" (V18, 1:40.8) and
"runbook" (V24, 2:22.2).

## 2. Curse of knowledge

Baseline for a Jira-only viewer: knows issues and keys (PAY-6), epics, statuses (To Do, Done), probably Confluence by name.
Probably does not know: the Git workflow (branch, pull request, merge, diff), Bitbucket's screens, runbooks and on-call,
Rovo beyond the name, MCP, agents as a product category, JSON, file paths, Confluence spaces and bylines, Forge.

| Concept | First heard | First seen | Ever explained? | Plain replacement, or a visual that explains it |
| --- | --- | --- | --- | --- |
| "The code moved" | 0:09.7 (V01) | 0:00.0 (caption) | No (metaphor) | "the code changed" |
| Merge, merged | 1:10.7 ("merges") | 0:00.0 ("Merged" on our diff card); 0:22 ("merged 6 days ago"); 0:26 ("A date can't see a merge.") | No | "the developer's change goes live"; show the Merge click with our label "change accepted into the code" |
| Diff (− old, + new) | never | 0:00.0; 0:22; 1:13; 2:00 | No (colours help) | Label the two lines "old name" and "new name" |
| Pull request, PR, PR #482 | 1:11.2 ("pull request") | 0:01.1 ("AI PRs", barrage); 0:43.3 ("PR #482"); on screen for about 40 s in all | No; "PR" is never spoken or expanded | "a code change (#482)"; say the long form once if "PR" stays on screen |
| Runbook | 0:17.4 | 0:01.6 (barrage); 0:17.4 (page title) | No | "the runbook, the team's step-by-step page for fixing payments" |
| Rovo | 1:29.4 (V16) | 0:04.1 (barrage) | No | "Rovo, Atlassian's AI" |
| Agent, agents | 0:30.2 ("AI agent") | 0:04.0 (caption) | Partly (the assistant panel). Then five names for it: AI assistant, Drift Reviewer, Rovo agent, coding agent, "your agent" | One plain term, "AI assistants"; name the two kinds once: Rovo, and coding assistants in your editor |
| SEV-2, error rate, payments-api | never | 0:14.9 | Context makes it clear | Fine as is |
| Script, rollback, rollback.sh | 0:18.6 ("rollback.sh") | 0:17.4 | Partly (the failing command shows it) | "the rollback script"; do not read a file name aloud |
| Terminal, zsh, "no such file or directory" | never | 0:21.2 | Partly (red error) | Keep the picture; voice "the command fails: that file is gone" |
| "A date can't see a merge." | never | 0:26.2 | No (on screen only, in jargon) | Voice it plainly: "A review date can't tell you the code changed" |
| Confluence, Confluence page | 0:38.2 (V07) | 0:04.1 (barrage); 0:54.0 ("For teams who keep runbooks in Confluence"); 0:58.5 ("Recorded in Confluence") | No; the twins look like generic pages | "Confluence, your team's wiki"; open on one real Confluence page, labelled |
| Anchor, anchored, anchors | 0:37.5 (V07) | 0:39.4 ("Anchored to code and Jira.") | No, only the chips | "links", "watches": "Doc Drift links the page to the files and Jira issues it mentions, and watches them". Keep "Anchors" as the UI label |
| Code paths, file paths | 1:00.7 ("paths") | 0:39.4 (chips) | No | "file names" |
| `deploy/helm/values.yaml` | never | 0:39.4; 1:09.7; 1:18.2 (the tooltip) | No, and not part of the story | Leave it out of twins; crop it out of proofs where it is not the subject |
| Jira work, Jira issue, Jira keys, PAY-6 | 0:40.0, 1:01.3 | 0:17.4 (PAY-6 on the page) | Known to Jira users | "Jira issues" is plainer than "Jira work" and "Jira keys" |
| Verified | 1:07.2 (V12) | 0:40.7 (the label flips silently) | Partly | Say it once: "Verified: someone checked it since the code last changed" |
| Possibly stale, flagged | 0:44.5, 0:45.5 (V08) | 0:45.5 | Partly (the words carry some meaning) | Gloss once: "Possibly stale: it may be out of date" |
| Badge, byline | never | 0:45 (the label); "badge" in UI text at 1:06 and 1:50 | No | "the label at the top of the page" |
| Drift Reviewer | 1:28.2 (V16) | 0:47.9 (V09) | Partly ("our Rovo agent") | "our AI agent in Rovo, Drift Reviewer"; never show the name before it is spoken |
| MCP | 1:43.0 (V18) | 0:47.9 ("Coding agent · MCP") | No | "coding assistants in your editor, through MCP"; show an editor chat asking "Which docs describe scripts/rollback.sh?" |
| Coding agents | 1:40.8 | 0:47.9 | Partly | "AI coding assistants" |
| JSON, tool names (`check-page-freshness`, `find-docs-for-path`, `pageId`, `citePolicy`, `guidance`) | never | 0:48.5; 1:41 to 1:47; 2:07 | No | Show the answer as a sentence; keep the JSON as a small proof with one line highlighted |
| "For teams who keep runbooks in Confluence" | never | 0:54.0 | This *is* the explanation, on screen only | Voice it |
| Unanchored | never | 0:57.2 (tooltip "Not linked to code or Jira. Add anchors." at 20 to 33 px) | Small tooltip only | Skip the state |
| Repository, repo | never | 0:18.6 ("payments-api repo"); 1:03 ("Repository for suggested paths") | No | "the code project" |
| "Real capture, development install"; "Recorded in ..." tags | never | 0:58.5 | The tags are clear; "development install" is not | "Recorded on our demo site" |
| Bitbucket | never | 1:09.7 | No; the film never says the code must live in Bitbucket | Voice once: "in Bitbucket, where the code lives" |
| Bitbucket relay, Doc Drift matcher | never | 1:14.5 | No (architecture) | Drop, or "Bitbucket → Doc Drift" |
| Deterministic, matcher, score, threshold, eval set, false flags, known misses | the voice says "No AI made that call. Same change, same result, every time." (1:21) | 1:21.7 | Yes in the voice, no on screen | Keep the voice; on screen only "No AI. Plain rules." and, if wanted, "40 test cases, 0 false alarms" |
| "Invoking tool", Skills | never | 1:32 | No | A 1 s label "Rovo calls our freshness check" (worth keeping for the agents bonus) |
| "Read as you", "never edit a page" | never | 1:44 | No | Voice once: "They only read what you can read, and never change a page" |
| Page owner, comment, review | 1:50.0, 1:51.2, 1:52.4 | 1:49.7 | Yes (plain) | Fine |
| Quick fix, "version message" | 1:54.3 | 1:54.3 | Mostly | Crop "version message" |
| Draft, "Propose fix", "Submit fix proposal", "Confirm selected" | 2:00.9 ("drafts the edit") | 1:59.9 | No (Rovo's confirmation step) | Leave the confirmation out of the picture |
| Cite, "Safe to cite" | 2:07.4 | 2:07.8 | Mostly | "the AI can quote it again" |
| Space (Confluence space) | 2:14.4 | 2:14.4 ("Drift in PLAT") | No | "each team's area in Confluence", or "all your pages" |
| Epic, ADR, "Architecture decisions" | never | 2:11.5 | Epic: known to Jira users. ADR: no | "the design page behind an epic" |
| Track in Jira, Jira task | never | 2:16.8 | On screen only | Voice it: it is the Jira user's hook |
| "Step 2" | 2:24.7 | 0:18.6 (the number "2." in the Steps list) | Never spoken before | "before you run the old step" |
| Drift, "drift dashboard" | 0:07.7 (name); 2:15.5 | 0:10.5 (lockup) | No | Keep "drift" in the name only, or define it once |
| Slip, "Catch the slip" | 2:30.5 | 0:09.2 (the mark's amber band) | No | End on "Docs that know when the code moved." instead, or say what the slip is |
| Forge, Codegeist | never | 2:31 (end card) | No (fine: for judges) | Keep, small |
| "Sentinel" | 0:08.3; 0:36.9; 2:29.0 | 0:08.5; 0:10.5 to 0:13.2; 1:49.7 to 1:52.5 (real comment author); 2:28.3 to the end | Retired (D40) | Re-voice; re-capture the comment (section 5.4) |

## 3. Density

### 3.1 Per scene

Narration counts are exact (timeline.json). On-screen counts come from OCR of every 0.5 s sample: *distinct* is the number
of different words seen in the scene (a lower bound on what is offered; repeated page text counts once); *turnover* adds
every word that appears in a sample and was not in the previous one (an upper bound: camera moves inflate it). Much of the
distinct text is page body shown as context, not meant to be read, but it still competes for the eye.

| Scene | Time | Length | Narrator words | Narration words/s (scene) | Speaking rate while talking | Voice covers | Distinct on-screen words (per s) | Turnover words/s | Peak words in one frame | Text lines under 26 px | New objects · new ideas (counted from frames) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A0 | 0:00–0:13 | 13.2 s | 14 (+12 quoted) | 1.06 (2.0 with the quote) | 3.6 | 30% (+34% quote) | 175 (13.2) | 17.5 | 66 | 1% | about 25 (20 plates) · 5 |
| A1 | 0:13–0:35 | 22.0 s | 42 | 1.91 | 3.2 | 60% | 113 (5.1) | 10.0 | 58 | 4% | 7 · 6 |
| A2 | 0:35–0:57 | 22.0 s | 43 | 1.95 | 2.8 | 71% | 131 (6.0) | 13.4 | 91 | 17% | 12 · 7 |
| P1 | 0:57–1:09 | 12.0 s | 23 | 1.92 | 2.8 | 69% | 144 (12.0) | 29.6 | 70 | 22% | 10 · 5 |
| P2 | 1:09–1:27 | 18.0 s | 33 | 1.83 | 2.7 | 68% | 194 (10.8) | 21.3 | 91 | 18% | 14 · 7 |
| P3 | 1:27–1:49 | 22.0 s | 42 | 1.91 | 2.9 | 65% | 158 (7.2) | 15.2 | 83 | 13% | 15 · 8 |
| P4 | 1:49–2:11 | 22.0 s | 40 | 1.82 | 2.8 | 64% | 312 (14.2) | 47.9 | 170 | 39% | 20 · 10 |
| P5 | 2:11–2:19 | 8.0 s | 11 | 1.38 | 2.6 | 52% | 156 (19.5) | 38.1 | 150 | 75% | 9 · 5 |
| A4 | 2:19–2:35 | 16.0 s | 25 | 1.56 | 2.9 | 54% | 86 (5.4) | 6.8 | 46 | 0% | 7 (all seen before) · 3 |
| Film | | 155.2 s | 273 | 1.76 | 2.9 | 61% | | | | | about 119 · about 56 |

Reference points: an explainer voice usually runs 2.5 to 3 words per second; the BBC's subtitle guidance targets 160 to 180
words per minute (about 3 words per second) for text a viewer must read; the brief's own formula allows about 4 words per
second plus 0.8 s. So the speaking pace inside each line is right, but the film is quiet a third of the time, and in every
product scene the screen offers more distinct words per second than anyone can read *without* also listening.

Silences of 1.5 s or more (no narrator): 19 stretches, 46.1 s in total. The longest: 2:16.0 to 2:20.3 (4.3 s, Track in
Jira), 2:07.8 to 2:11.8 (4.1 s, page history), 2:32.0 to 2:35.2 (3.3 s, end card), 1:31.2 to 1:34.3 (3.1 s, Rovo thinking),
2:25.2 to 2:28.3 (3.1 s), 0:33.3 to 0:36.3 (3.0 s, the Day slip), 1:46.8 to 1:49.8 (3.0 s, MCP hold).

### 3.2 New objects and ideas

Counted from the frames. An "object" is a new card, panel, screen or statement; an "idea" is a new thing the viewer has to
understand.

- **A0:** 20 plates with source chips, our diff card, 3 captions, a title on black, the tile, the lockup. Ideas: the code
  changed; the docs did not; agents can't tell; outdated docs are worse than none; the product's name and tagline.
- **A1:** the clock, the alert card, the runbook page, the terminal, the rename card, the "A date can't see a merge."
  statement, the assistant panel. Ideas: incident; the runbook's step; the script was renamed; the page looks fine; review
  dates can't see code changes; the AI repeats the old step.
- **A2:** the Day page, the three bands, the anchor rail (3 chips), the statement, the Verified label, the change chip, the
  amber Steps band, the Possibly stale label, the Drift Reviewer panel, the MCP slab and JSON, connector lines, the
  four-phrase stack, the who-for line. Ideas: anchoring; Verified; a change flags the page; agents are told (two kinds, both
  unnamed in the voice); a person decides; who it is for; MCP.
- **P1:** Unanchored and its tooltip, the first proof frame and its note, the scan, two lifted tokens, the statement, the
  suggestions panel, the repository field, Save, the saved message, "Verified." and its tooltip. Ideas: Unanchored; the app
  reads paths and keys; suggestions (Weak, repository); Save means Verified; real captures exist.
- **P2:** the Bitbucket card, the merge dialog, the merged banner, the diff, the number roll, the relay and matcher
  pipeline, the flagged page and tooltip, the flagged proof, the statement, "0 AI calls", the eval line, the matcher card,
  the reason proof. Ideas: a pull request is merged; the pipeline; 19 s; the exact change; no AI; same result every time;
  an evaluation set.
- **P3:** the statement, the Drift Reviewer twin, the Rovo start screen, the typed question, the thinking steps, the ghost
  of the old step, the answer twin, the real answer, "It says why.", two MCP outputs, the proof tag, "Agents read as you.",
  the page card with its ID, "3 pages document this path", "Do not present steps...". Ideas: Drift Reviewer is a Rovo agent;
  it calls tools; it gives a caveat and a reason; coding agents; MCP; finding docs for a file; guidance; read-only agents.
- **P4:** the comment (twin and real), "One comment.", the click, the review panel (about 8 regions), the quick fix card,
  two real results, "No AI used.", the proposed fix card, Rovo's confirmation, two drafts, the real draft, the real action
  bar, the statement, the accepted notice, the snap back, "Verified.", the Verified tooltip, "Safe to cite.", the MCP JSON,
  the page history. Ideas: a comment notifies the owner; the review panel; severity; affected section; one-click fix
  without AI; AI-drafted fix; a person accepts; a new page version names the change; Verified; agents may cite it again.
- **P5:** the epic card, the ADR page, two real captures, two statements, the dashboard twin and its real capture, the
  Track in Jira panel and its proof. Ideas: Jira changes flag pages; decision records; a dashboard per space; sample data;
  Jira tasks for fixes (unspoken).
- **A4:** nothing new except the resolved state; the end card.

### 3.3 Reading one thing while hearing another

1. **0:00 to 0:06, the barrage.** A 3-word caption, a 5 to 15 word marked phrase on a plate that changes every 0.2 to
   0.3 s from 0:03.3, and a 12-word quote in a different voice, all at once.
2. **0:25 to 0:28, V05.** Hears "The page still looks fine. It was reviewed a month ago." Reads "A date can't see a merge."
   (the biggest thing on screen).
3. **0:47 to 0:50, V09.** Hears "every agent that reads it is told the same". Reads `check-page-freshness {"pageId":
   "2720100"}` and `"status": "possibly_stale"`.
4. **0:54 to 0:57, V10.** Hears "Then a person decides." Reads "For teams who keep runbooks in Confluence".
5. **0:58 to 1:05, P1.** Hears how the app reads paths and keys. Reads proof text such as "Checked suggestions are added
   when you save. Weak ones start unchecked." and "You have unsaved changes. Saving replaces the anchors and marks this page
   Verified." (20 to 40 px).
6. **1:10 to 1:14, V13.** Hears the merge line. Reads Bitbucket's dialog (Source, Destination, Merge strategy, Commit
   message, Close source branch).
7. **1:14 to 1:20, gap and V14.** Reads "Merge to flag", "Measured on the demo site, Nov 13", "Bitbucket relay", "Doc Drift
   matcher", then a tooltip about `deploy/helm/values.yaml` while hearing "with the exact change" (the rename).
8. **1:21 to 1:26, V15.** Hears "Same change, same result, every time." Reads "0 AI calls", "Our eval set: 40 scenarios, 0
   false flags, 2 known misses" and four lines of matcher reasons with a score and threshold.
9. **1:31 to 1:34 (silence).** Reads Rovo's thinking steps with no voice to anchor them.
10. **1:34 to 1:39, V17.** Hears a 15-word summary while a 34-word answer streams.
11. **1:41 to 1:47, V18.** Hears "which pages cover a file, and which to trust". Reads two JSON blocks (about 60 words),
    "Agents read as you. They never edit a page.", "3 pages document this path" and "Do not present steps from this page as
    current.". The heaviest conflict in the film.
12. **1:50 to 1:53, V19.** Hears one sentence. The review panel opens with about 80 words.
13. **1:59 to 2:05, V21.** Hears the drafting line. Reads Rovo's confirmation dialog, two code diffs and "PR #482 renamed
    ROLLBACK_TIMEOUT to ROLLBACK_TIMEOUT_SECS.".
14. **2:12 to 2:20, V23 and the silence after it.** Hears two short sentences. Reads an epic, a decision record, a 6-row
    table, four stats and the Track in Jira panel.

## 4. What the film never says plainly

**Is there one sentence that says what Doc Drift does, for whom and why, in words a Jira-only person understands? No.**
The candidates, in order:

| Time | Voice | Screen at the same time | What it covers | What it misses |
| --- | --- | --- | --- | --- |
| 0:09.7–0:12.0 | "Docs that know when the code moved." | The same words | What, as a metaphor | Who; why; what actually happens (a warning) |
| 0:36.2–0:41.5 | "... anchors each Confluence page to the code and Jira work it describes." | "Anchored to code and Jira." from 0:39.4 | The mechanism | Who; why; "anchor" is jargon; the effect comes in the next two lines |
| 0:42.7–0:49.9 | "When those change, the page is flagged: Possibly stale. And every agent that reads it is told the same." | The label, then the agents | The effect | Who; "the same" is vague |
| 0:54.0–0:57.2 | (none) | "For teams who keep runbooks in Confluence" (40 px, muted grey) | Who | Never spoken |
| 1:23.0, 1:52.5–1:54.0 (and a variant at 2:15.5) | (none) | "Agents are told not to trust this page until someone reviews it." (UI text, 17 px in P2, 25 to 41 px in the review panel) | The agent benefit, in the plainest words of the film | Never spoken, mostly too small to read |
| 2:20.2–2:25.3 | "Next time it's 3 a.m., the runbook tells you, and your agent, before step 2." | The flagged runbook, then the assistant's caveat | Why | Comes 2:20 in; "step 2" is a callback nobody can follow |

So the "what" (as a mechanism) is voiced and shown together at 0:36, the "who" is never voiced, and the "why" is acted out
in A1 but never stated as a reason until 2:20.

Other things the film never says plainly:

- **That Doc Drift is an app you add to Confluence.** "Built on Atlassian Forge" appears at 26 px at the very end.
- **What "anchor" means.** The picture shows chips; the word is never turned into plain English (links, watches).
- **What "Possibly stale" means**, and that it is careful on purpose (it may be out of date; nobody claims it is wrong).
- **That the code has to live in Bitbucket** for code changes to count, and that Jira is optional. Bitbucket is never
  spoken.
- **What "told" means for an AI.** That the agent will not present the old steps as current, and says why. The real
  answer on screen says it ("Do not present steps from this page as current."), the voice does not.
- **That it works by itself after setup.** No review schedule, no one has to remember: a merge triggers the flag.
- **That the 3 a.m. scene and the demo are the same page at two times.** There is no "now let's rewind, with Doc Drift".
- **What the logo's slip means.** "Catch the slip" assumes it.

A sentence that would pass the test (draft, voice and screen together, at about 0:20 in v5):

> Voice: "Doc Drift is a Confluence app for teams who keep runbooks there. When the code behind a page changes, it warns
> you, and your AI, before anyone follows an old step."
> Screen (the same idea, one line, big): "When the code changes, the page warns you, and your AI."

Keep the claim within what v4 already says (V09, V24): sections 6 and 7 then show exactly which AI is told (our Rovo
agent, and coding assistants over MCP). The skeleton in 5.3 drops the last clause from section 3, because section 9 says
it.

## 5. Toward a shorter film

### 5.1 Cut list

Kinds: **repeat** (the idea was already shown), **low** (low value for a first-time viewer), **judges** (needed to show the
project working end to end, or for the Agents and MCP bonuses).

| v4 beat | Time | Length | Kind | Recommendation for v5 | Saves |
| --- | --- | --- | --- | --- | --- |
| A0 barrage (20 plates, 3 captions, quote) | 0:00.0–0:06.0 | 6.0 s | low (plates unreadable); the captions are the film's best problem statement | Cut the plates. Reuse the three captions, in plain words, after the story (section 2, 4 s). Optional: one Atlassian-owned plate held long enough to read. Also reduces third-party material in the film | 6.0 s |
| Black and "That's why we built ..." (V00) | 0:06.0–0:08.8 | 2.8 s | low (name before problem; old name) | Cut | 2.8 s |
| Reveal and tagline (V01) and silence | 0:08.8–0:14.3 | 5.5 s | repeat (the end card says it again) | Move the logo and tagline into section 3, with the promise | 5.5 s |
| A1 story (V02 to V06) | 0:14.3–0:33.3 | 19.0 s | keep: the strongest part | Re-voice in plain words; cut the 1.6 s and 1.7 s silences; voice "a review date can't see code changes" or drop the statement | 3.0 s |
| A1 to A2 slip and silence | 0:33.3–0:36.3 | 3.0 s | low | A 1 s rewind signpost ("Rewind to last week, with Doc Drift") | 2.0 s |
| A2 explanation (V07 to V09) | 0:36.3–0:49.8 | 13.5 s | repeat (P1 to P4 show the same loop) | Cut as an act; reuse its best visuals inside sections 4 to 6 (anchor rail, amber Steps band, lines from the label to the agents) | 13.5 s |
| A2 summary (V10) and the who-for line | 0:49.8–0:57.8 | 8.0 s | repeat (mnemonic) | Cut; the who-for line moves into section 3, spoken | 8.0 s |
| P1 anchoring (V11, V12) | 0:57.8–1:09.9 | 12.1 s | judges (setup is part of a complete product) | One line, the token lift, one proof (R2 cropped to its two rows), Verified. Skip Unanchored, the repository typing, the save message | 4.0 s |
| P2 merge (V13) and the pipeline | 1:09.9–1:16.4 | 6.5 s | judges (R5, the real merge) | Keep the Merge click and R5. Drop the relay and matcher diagram and the diff hunk. Label "a code change" in our own type | 1.5 s |
| P2 flag (V14) | 1:16.4–1:21.3 | 4.9 s | judges (R7, 19 s) | Keep. Fix the tooltip mismatch (5.4) | 0 s |
| P2 "No AI" (V15) | 1:21.3–1:27.8 | 6.5 s | judges (Innovation, Technical); low for newcomers | Keep the voice line; drop the matcher card, eval line, score and dots | 3.5 s |
| P3 Rovo (V16, thinking, V17) | 1:27.8–1:40.8 | 13.0 s | judges (Agents bonus) | Keep. Cut the 2.9 s silent thinking to 1 s with the label "Rovo calls our freshness check". One big, readable answer | 4.0 s |
| P3 MCP (V18) and silence | 1:40.8–1:49.8 | 9.0 s | judges (MCP bonus) | Keep one call. Show a coding assistant asking, then its answer as a sentence; the JSON as a small proof with the guidance line highlighted. Drop the second statement and "3 pages document this path" | 3.0 s |
| P4 comment and review (V19) | 1:49.8–1:54.3 | 4.5 s | partly repeat | Merge with V20 into one line | 1.5 s |
| P4 one-click fix (V20) | 1:54.3–1:58.8 | 4.5 s | keep | One proof (R14) | 1.5 s |
| P4 drafted fix (V21) | 1:58.8–2:05.3 | 6.5 s | judges (the agent's action) | Keep the principle and the Accept click; drop Rovo's confirmation and the second diff; don't say "bigger" over a small rename | 2.5 s |
| P4 Verified (V22) and page history | 2:05.3–2:11.8 | 6.5 s | keep the resolution; the history is low | Keep the snap back and "Verified"; drop the 4 s page history | 3.5 s |
| P5 Jira and dashboard (V23), Track in Jira | 2:11.8–2:20.3 | 8.5 s | keep for Jira users; the dashboard is low at this size | Voice Track in Jira; one example; a 1 s dashboard glimpse, labelled sample data | 2.5 s |
| A4 payoff (V24) and silence | 2:20.3–2:28.3 | 8.0 s | keep | Fix "step 2"; cut the silence | 2.0 s |
| End card (V25) and tail | 2:28.3–2:35.2 | 6.9 s | keep, short | Name and tagline, 3.5 s | 3.4 s |
| **Total** | | **155.2 s** | | About 81 s of v4 survive; the new plain material (sections 2 and 3, and the glosses in the voice) brings v5 to about 99 s | **about 74 s** |

### 5.2 What the judges need (keep, but fewer and bigger)

The rules ask for "footage that shows the Project functioning", and the Presentation criterion asks whether the video
"clearly demonstrate[s] the project working end-to-end" and whether the pitch says "what problem is solved, who it's for,
and why it matters". The bonuses: Best Agents (`rovo:agent`, or skills and actions other agents invoke as tools) and Best
app with Atlassian MCP (a Forge app exposing an MCP server). So v5 keeps real footage of: anchoring (R2), the real merge
(R5), the flagged label 19 s later (R7), Rovo invoking our tool and Drift Reviewer's answer (R11, R12), the real MCP
output, the owner's comment (R13), a fix being accepted (R14 or R16), Verified (R17), and the Jira beat (R20, R22, R21).
That is 12 proof moments instead of 22 (9 in the short variant) and about 19 s of real footage (v4: about 24 s): the key
ones (R2, R7, R12, the MCP output, R14 or R16) held 2 to 2.5 s, the others 1 to 1.5 s; each cropped to the one or two
lines that prove the claim, at a scale where those lines are 32 px or more, and each one showing the words the voice is
saying. Real footage then starts by about 0:32 (v4: 0:58).

### 5.3 v5 skeleton (about 99 s)

The narration below is a plain-language draft to show the shape and to size each section (at about 2.7 words per second),
not locked copy. It follows the voice rules (digits, sentence case, no exclamation marks, never says a page is wrong) and
the honesty list in V4.md.

| # | Section | Time | Length | The one idea | Voice (draft) | Picture: one focal element | Real proof |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | The problem, at 3 a.m. | 0:00–0:15 | 15 s | A runbook can look fine and still be out of date, and AI repeats it | "It's 3 a.m. Payments is down. The runbook, the team's step-by-step fix, says: run the rollback script. But a developer renamed that script last week. The page still looks fine. And an AI assistant reads you the same old step." (40 words) | Clock and alert → the step, marked → "no such file" with old name and new name → "Reviewed 34 days ago ✓" → the assistant quoting the step | none (our own generic mocks, as in v4 A1) |
| 2 | The gap | 0:15–0:19 | 4 s | Code changes, pages don't, AI can't tell | "The code changed. The page didn't. And the AI can't tell." (11) | The three lines, one per beat, on a still page | optional: one Atlassian-owned plate held 2 s |
| 3 | The promise | 0:19–0:29 | 10 s | What it is, for whom, why | "Doc Drift is a Confluence app for teams who keep runbooks there. When the code behind a page changes, it warns you, and your AI." (25) | The logo, then one big line: "When the code changes, the page warns you, and your AI." | none |
| 4 | Link (rewind to last week) | 0:29–0:37 | 8 s | Each page is linked to the files and Jira issues it mentions | "Rewind to last week, with Doc Drift. It links the page to the files and Jira issues it mentions: its anchors." (21) | Two tokens lift off the page into a list labelled "Anchors": `scripts/rollback.sh`, PAY-6 | R2, cropped to the two rows |
| 5 | A change flags the page | 0:37–0:51 | 14 s | A merged code change flags the page in seconds, and no AI guesses | "A developer renames the script, and the change is merged in Bitbucket. 19 seconds later, the page is flagged Possibly stale: it may be out of date. No AI decides this: plain rules." (33) | The Merge click → "19 s" → the label turns amber, with what changed | R5 (1.5 s), R7 (2 s, tooltip resolved, 5.4) |
| 6 | AI assistants are told | 0:51–1:06 | 15 s | Rovo and coding assistants check the page before they quote it | "In Rovo, Atlassian's AI, ask our Drift Reviewer agent how to roll back. It won't repeat the old step: it says the page may be out of date, and why. Coding assistants in your editor get the same answer, over MCP." (41) | The answer's first line, big, with "Possibly stale" in amber; then an editor chat with the same caveat | R11 "Invoking tool: Check page freshness" (1 s), R12 (2.5 s), real MCP output with the guidance line highlighted (2 s) |
| 7 | A person fixes it | 1:06–1:21 | 15 s | People stay in charge; the page goes back to Verified | "The page owner opens the review: what changed, and which step. One click swaps in the new name, or Drift Reviewer drafts the edit. Nothing changes until a person accepts. Verified: the AI can quote it again." (37) | The review's one summary line → the step changing → the snap back to Verified | R13 (1 s), R14 or R16 (2 s), R17 (1.5 s) |
| 8 | Jira | 1:21–1:28 | 7 s | It fits how a Jira team works | "Jira changes count too. Track each fix as a Jira task, and see every flagged page on one dashboard." (19) | The epic moves to Done → its page flags → "Jira task created" | R20 (1 s), R22 (1.5 s), R21 (1 s, labelled sample data) |
| 9 | Payoff and end card | 1:28–1:39 | 11 s | Next time, the page warns you first | "Next time it's 3 a.m., the page warns you, and your AI, before you run the old step. Doc Drift. Docs that know when the code moved." (27) | The 3 a.m. runbook with the amber label → the assistant's caveat → end card, "Built on Atlassian Forge for Codegeist 2026" | none |

Narration in this draft: about 250 words in about 99 s (2.5 words per second over the film, against v4's 1.76). Speech
fills about 93 s, which leaves room for two chosen beats (the 19 s roll and the snap back) and the end card, and nothing
else. If that feels too dense in the edit, cut words, not pauses back in: section 2 and the dashboard clause go first.

**Short variant, about 80 s:** drop section 2 (fold "The code changed. The page didn't." into the end of section 1); fold
section 8 into section 7 as one clause ("and track the fix as a Jira task"), keeping "Jira issues" in section 4; trim
sections 1, 3, 6 and 9 by 2 s each. What is lost: the dashboard and the epic example.

### 5.4 Production notes for v5

- **Rename (D40).** Re-voice every line with the name; redo the lockup and end card; the real comment in P4 shows the
  author "Doc Drift Sentinel" (f3330 to f3345): re-capture it, or leave it out. Update the SRT and the YouTube description.
- **The "exact change" tooltip** names `deploy/helm/values.yaml` (the PR changed two files). Either re-capture a flag
  whose tooltip names the script, or prove "what changed" with the review panel's real line "PR #482 renamed
  scripts/rollback.sh to scripts/rollback-v2.sh, an anchor of this page." Drop values.yaml from the anchor twins.
- **One story, told forward.** A1 shows the world without Doc Drift; sections 4 to 7 rewind to last week with Doc Drift
  (anchored, Verified, flagged by the merge, the AI told, fixed, Verified); section 9 is the next 3 a.m. The label changes
  four times, always forward, instead of seven times with a reset.
- **Proof crops.** Cropping is allowed; restyling is not (V4.md P3). Crop out "Reload the page to see ..." lines where they
  are not the point.
- **No whip under a word that carries the idea.** Land each transition before it ("Coding" in V18 and "runbook" in V24
  play over a blur in v4).

### 5.5 Gates for v5 (add to the QA pass)

| Gate | Target | v4 |
| --- | --- | --- |
| What, who and why, voiced and on screen together | by 0:30 | never (who only on screen, 0:54) |
| Narration pace over the film | 2.3 words per second or more | 1.76 |
| Silence | none over 1.0 s, except 2 chosen beats; 8 s or less in total | 46 s in stretches of 1.5 s or more |
| On screen | only words the voice is saying (or says within 1 s), plus proof tags; one statement at a time | 14 read-and-listen conflicts |
| Must-read text | 40 px or more, held for the brief's reading time; proof lines 32 px or more | proof text often 15 to 25 px |
| Distinct on-screen words | 3 per second or fewer in every section | 5 to 20 per second |
| Jargon | every term in section 2 either replaced or glossed in the voice on first use; never in the voice: "PR", "byline", "deterministic", "rollback.sh", "step 2", "space" without a gloss | about 40 terms assumed |
| Picture on the key word | the thing named is on screen, readable, at its word (check every noun and verb that carries the idea, not only the 20 named words) | at least 5 key words miss |
| Newcomer test | 2 people outside the toolchain (one Jira-only) answer "what does it do, for whom" correctly by 0:30, from one viewing | failed |

## Evidence

All under `video/out/v5/r4/` (git-ignored; regenerate with the scripts in `tools/`):

- `frames/fNNNNN.jpg`: 428 frames (every 0.5 s, plus each line's start, middle and end, gap midpoints and A0 details).
- `lines/<ID>.jpg`: start, middle and end of every line, labelled with frame, time and the word being spoken;
  `lines/A0-barrage-1.jpg` to `-7`, `A0-turn-1.jpg`, `A0-turn-2.jpg`, `gaps-1.jpg` to `-7`, `tail.jpg`.
- `keywords/grid-01-V02-V04.jpg` to `grid-14-V25-V25.jpg`: the frame at the onset of 95 key words; `keywords/items.json`.
- `ocr.json`: macOS Vision OCR of every extracted frame (text, confidence, box); `density-scenes.json`,
  `density-lines.json`: the counts in section 3.
- `tools/`: `extract.py`, `sheets.py`, `keywords.py` (ffmpeg and PIL), `ocr.swift` (Vision), `density.py`, `coverage.py`,
  `sizes.py`.
