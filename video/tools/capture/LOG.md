# Capture log: Doc Drift Sentinel launch video

Every action the capture agent took on the demo site (one-atlas-jzzf), its Rovo, the Jira epic and the
`nano-soft-dev/payments-api` repo, with local times (EET, UTC+2). Read-only checks are logged where
they decided something.

## Session 2026-11-13

- 2026-11-13T15:47:22+02:00 Bitbucket: direct commit on payments-api main cf59050c4e06 -> 88563637f1d4 (201): "Restore scripts/rollback.sh and ROLLBACK_TIMEOUT for the demo take" (writes scripts/rollback.sh and deploy/helm/values.yaml from the seed base, deletes scripts/rollback-v2.sh; no PR, so no relay event)
- 2026-11-13T15:47:27+02:00 Bitbucket: created branch scenario/rename-rollback-script from main with the seed's scenario 01 files (bb_seed prepare: ['01-rename-rollback-script']) at b4f9a2fc6cdd
- 2026-11-13T15:47:31+02:00 Bitbucket: created scratch branch video/pr-counter from main 88563637f1d4 with one commit adding video/pr-counter.txt (201) at 6a195a96d0b4
- 2026-11-13T15:48:12+02:00 PR counter: start at #20, target #481 (462 to open and decline, this run 3)
- 2026-11-13T15:48:17+02:00 PR counter: opened and declined #20 (1 this run)
- 2026-11-13T15:48:33+02:00 PR counter: paused after 3 (last declined #22).
- 2026-11-13T15:51:11+02:00 Check: after declining PRs #20 to #22, the core settings page still reads "Last change: nano-soft-dev/payments-api PR #19, Nov 12" (relay sent nothing for declines; the relay listens to avi:bitbucket:fulfilled:pullrequest only)
- 2026-11-13T15:51:12+02:00 PR counter: start at #23, target #481 (459 to open and decline)
- 2026-11-13T15:51:17+02:00 PR counter: opened and declined #23 (1 this run)
- 2026-11-13T15:51:30+02:00 PR counter: opened and declined #25 (3 this run)
- 2026-11-13T15:51:47+02:00 Settings: "Wait before commenting, in minutes" 10 -> 0 (Save settings; reloaded value 0)
- 2026-11-13T15:53:12+02:00 Confluence: runbook 2720100 badge modal: removed 3 anchors (payments-api: scripts/rollback.sh, payments-api: deploy/helm/values.yaml, PAY-6) and clicked "Save and mark verified" (P1 prep). Modal said: "Doc Drift | Close Modal | Payments rollback runbook | Unanchored"
- 2026-11-13T15:53:13+02:00 Check: runbook byline property now {'title': 'Unanchored · Doc Drift', 'tooltip': 'Not linked to code or Jira. Add anchors.'}
- 2026-11-13T15:54:23+02:00 PR counter: opened and declined #50 (28 this run)
- 2026-11-13T15:55:26+02:00 Capture: p1-anchor-this-space (dashboard Anchor this space, opened the suggestions table, did not save). {"frames":147,"durationS":7.279,"sourceFps":20.2,"maxGapMs":1557,"frameSize":"1920x1080 css","firstFrameEpochMs":1794578113427}
- 2026-11-13T15:57:15+02:00 PR counter: opened and declined #75 (53 this run)
- 2026-11-13T15:58:28+02:00 Capture: P1 take on the runbook: badge Unanchored -> typed repository payments-api, ticked scripts/rollback.sh (PAY-6 pre-checked), clicked "Save and mark verified" at 2026-11-13T13:58:00.901Z, reloaded: "Verified". Tooltip after: "Verified on Nov 13. Watching 2 anchors.". {"frames":530,"durationS":28.605,"sourceFps":18.5,"maxGapMs":1741,"frameSize":"1920x1080 css","firstFrameEpochMs":1794578264297}
- 2026-11-13T15:59:32+02:00 Confluence: runbook 2720100 (off camera, after the P1 take): ticked Critical on scripts/rollback.sh, added payments-api: deploy/helm/values.yaml by hand, clicked "Save and mark verified": "Saved 3 anchors. This page is Verified." Anchors: PAY-6=normal, payments-api: scripts/rollback.sh=critical, payments-api: deploy/helm/values.yaml=normal
- 2026-11-13T15:59:33+02:00 Check: runbook byline property now {'title': 'Verified · Doc Drift', 'tooltip': 'Verified on Nov 13. Watching 3 anchors.'}
- 2026-11-13T16:00:12+02:00 PR counter: opened and declined #100 (78 this run)
- 2026-11-13T16:01:49+02:00 Jira: first visit in this browser profile showed the "What kind of work do you do?" prompt; picked "Software development" (a per-user preference) to reach PAY-18. Now at https://one-atlas-jzzf.atlassian.net/browse/PAY-18?visitedUserSeg=true
- 2026-11-13T16:03:04+02:00 PR counter: opened and declined #125 (103 this run)
- 2026-11-13T16:03:14+02:00 MCP: check-page-freshness {pageId: 2720100} -> verified, "Safe to cite." (pre-shoot reference, stored as toolOutput.checkBefore)
- 2026-11-13T16:05:58+02:00 PR counter: opened and declined #150 (128 this run)
- 2026-11-13T16:08:56+02:00 PR counter: opened and declined #175 (153 this run)
- 2026-11-13T16:11:52+02:00 PR counter: opened and declined #200 (178 this run)
- 2026-11-13T16:12:15+02:00 Jira: moved PAY-18 (epic, anchor of ADR-015) from To Do to Done in the issue view at 2026-11-13T14:12:07.706Z (the PAY workflow has no Won't Do status)
- 2026-11-13T16:12:17+02:00 Measured: ADR-015 byline read "Possibly stale · Doc Drift" 9.4 s after PAY-18 moved to Done (tooltip "PAY-18 moved to Done on Nov 13. Review.")
- 2026-11-13T16:12:47+02:00 Capture: P5 ADR-015 flagged (Possibly stale · Doc Drift), tooltip "PAY-18 moved to Done on Nov 13. Review.", review panel opened (not changed).
- 2026-11-13T16:13:24+02:00 Capture: P5 dashboard stills and scroll. KPIs: Pages anchored 18 of 24 75% of the space Possibly stale 6 6 pages Stale 0 0 pages Median time to verify Under 3 hours Anchor this space 6 pages in PLAT are not anchored. Get suggestions for all of them at
- 2026-11-13T16:13:50+02:00 Capture: retook p5-dashboard and p5-dashboard-2 with the pointer parked in empty space (no row hover)
- 2026-11-13T16:14:08+02:00 Capture: retook p5-dashboard-2 (scrolled 0 css px, pointer parked)
- 2026-11-13T16:14:27+02:00 Capture: p5-dashboard and p5-dashboard-2 re-staged with fresh masks (pointer parked, no hover)
- 2026-11-13T16:14:46+02:00 PR counter: opened and declined #225 (203 this run)
- 2026-11-13T16:15:44+02:00 Jira: created a task from ADR-015's review panel ("Track in Jira"): Jira task created PAY-24 tracks this change. When the page is up to date, open it and click Mark verified.
- 2026-11-13T16:16:04+02:00 Restore: Jira PAY-18 Done -> To Do (transition 11, HTTP 204); resolution None
- 2026-11-13T16:16:45+02:00 Check: 40 s after PAY-18 went back to To Do, ADR-015 byline {'title': 'Possibly stale · Doc Drift', 'tooltip': 'PAY-18 moved to Done on Nov 13. Review.'}
- 2026-11-13T16:17:07+02:00 Restore: page 2752707 "Mark verified" in its review panel (ADR-015 back to its pre-shoot Verified state after the P5 Jira beat); byline now {"title":"Verified · Doc Drift","tooltip":"Verified on Nov 13. Watching 1 anchor."}
- 2026-11-13T16:17:41+02:00 PR counter: opened and declined #250 (228 this run)
- 2026-11-13T16:20:39+02:00 PR counter: opened and declined #275 (253 this run)
- 2026-11-13T16:23:35+02:00 PR counter: opened and declined #300 (278 this run)
- 2026-11-13T16:26:30+02:00 PR counter: opened and declined #325 (303 this run)
- 2026-11-13T16:29:19+02:00 PR counter: opened and declined #350 (328 this run)
- 2026-11-13T16:32:13+02:00 PR counter: opened and declined #375 (353 this run)
- 2026-11-13T16:35:06+02:00 PR counter: opened and declined #400 (378 this run)
- 2026-11-13T16:37:59+02:00 PR counter: opened and declined #425 (403 this run)
- 2026-11-13T16:40:58+02:00 PR counter: opened and declined #450 (428 this run)
- 2026-11-13T16:44:01+02:00 PR counter: opened and declined #475 (453 this run)
- 2026-11-13T16:44:43+02:00 PR counter: opened and declined #481 (459 this run)
- 2026-11-13T16:44:43+02:00 PR counter: done. Last declined #481; the next pull request will be #482.
- 2026-11-13T16:44:50+02:00 Bitbucket: opened PR #482 "Rename rollback script and timeout variable" (scenario/rename-rollback-script -> main, close source branch on merge) = 482 as required: https://bitbucket.org/nano-soft-dev/payments-api/pull-requests/482
- 2026-11-13T16:45:17+02:00 Capture: P2 stills of PR #482 (overview, files changed). No state change.
- 2026-11-13T16:45:46+02:00 Bitbucket: opened and cancelled the Merge dialog of PR #482 (exploration, no merge).
- 2026-11-13T16:46:33+02:00 Bitbucket: MERGED PR #482 through the UI (Merge dialog confirm at 2026-11-13T14:46:13.391Z); API: MERGED, merge commit bf02bd0dcfb6, updated_on 2026-11-13T14:46:18.934284+00:00
- 2026-11-13T16:46:40+02:00 Measured: runbook byline property read "Possibly stale · Doc Drift" 19.5 s after the Merge click (polled every 1 s; tooltip "PR #482 changed deploy/helm/values.yaml on Nov 13. Review.")
- 2026-11-13T16:46:58+02:00 Confluence: the app posted footer comment 3735566 on the runbook 24 s after the merge:  PR #482 (merged by Razvan Statescu) changed 2 files this page documents. Review in the Doc Drift badge. 
- 2026-11-13T16:47:58+02:00 Measured (authoritative): byline property v11 written 2026-11-13T14:46:32.025Z = 18.6 s after the Merge click (18 s after the merge commit at 14:46:14). mergeToFlagSeconds = 19. Note: the poll had a 10.0-19.5 s gap while the merge video encoded; the property timestamp settles it.
- 2026-11-13T16:48:59+02:00 Capture: settings page stills (relay section). Get started 1. Connect the Bitbucket relay Done The relay is sending merged pull requests. Details are under Bitbucket relay below. 2. Anchor pages Open a page and click its Doc Drift badge to link it to the code paths and Jira issues it describes. To anchor many pages at once, open a space's Drift 
- 2026-11-13T16:51:05+02:00 Rovo: asked Drift Reviewer "How do I roll back payments-api?" on the runbook (take p3-rovo); answer took 16 s; says Possibly stale: true, names PR #482: true, mentions the rename: true
- 2026-11-13T16:52:19+02:00 MCP: find-docs-for-path {repo: payments-api, path: scripts/rollback.sh} -> 3 pages, all Possibly stale (PLAT runbook + 2 DDSTEST QA pages); check-page-freshness {pageId: 2720100} -> possibly_stale, cite_with_caveat, 2 open changes from PR #482 (rename high 1.0, values.yaml medium 0.73), "Do not present steps from this page as current." Stored as toolOutput.findDocsFlagged / checkFlagged.
- 2026-11-13T16:53:22+02:00 Confluence: P4 quick fix applied from the review panel at 2026-11-13T14:53:14.399Z: runbook now v2 "Doc Drift: renamed scripts/rollback.sh to scripts/rollback-v2.sh for PR #482"
- 2026-11-13T16:57:14+02:00 Rovo: clicked "Confirm selected" on Drift Reviewer's two Submit fix proposal actions (CREATE) at 2026-11-13T14:56:53.291Z; reply settled.
- 2026-11-13T16:59:41+02:00 Capture: salvaged p4-propose.mp4 (55.3 s) from frame file times after the take script failed at the chat input; clicks estimated and labelled as such.
- 2026-11-13T17:01:07+02:00 Confluence: P4 Accept fix at 2026-11-13T15:00:46.712Z; runbook v4 "Doc Drift: accepted proposal for PR #482"; badge Verified; tooltip "Verified on Nov 13. Watching 3 anchors."
- 2026-11-13T17:01:52+02:00 Capture: retook p4-step2-fixed with the pointer parked (no code-block hover buttons)
- 2026-11-13T17:02:04+02:00 Capture: P4 page history still. Messages: Doc Drift: accepted proposal for PR #482 | Doc Drift: accepted proposal for PR #482
- 2026-11-13T17:02:22+02:00 MCP: check-page-freshness {pageId: 2720100} after Accept fix -> verified, citePolicy cite, "\"Payments rollback runbook\" is Verified. Safe to cite." (toolOutput.checkVerified)
- 2026-11-13T17:02:33+02:00 Restore: runbook 2720100 body PUT back to the pre-shoot text as version 5 (was v4); storage equals runbook-before.xhtml: False
- 2026-11-13T17:02:47+02:00 Check: restored runbook v5 differs from v1 only by Confluence adding ri:version-at-save="1" to 3 page links on save; the text is identical
- 2026-11-13T17:03:29+02:00 Restore: runbook anchor removed in the modal: payments-api: scripts/rollback-v2.sh
- 2026-11-13T17:04:00+02:00 Restore: runbook anchor added in the modal: payments-api: scripts/rollback.sh
- 2026-11-13T17:04:33+02:00 Restore: runbook anchors saved in the modal: PAY-6=normal, payments-api: deploy/helm/values.yaml=normal, payments-api: scripts/rollback.sh=critical. "Saved 3 anchors. This page is Verified." (rows seen: 4)
- 2026-11-13T17:04:53+02:00 Settings: "Wait before commenting, in minutes" 0 -> 10 (Save settings; reloaded value 10)
- 2026-11-13T17:05:47+02:00 Restore check: after.json written. PLAT 18 of 24 anchored, 5 Possibly stale, 13 Verified (same as before). Left in place: app footer comments, Jira task PAY-24, declined counter PRs #20-#481 and branch video/pr-counter, 2 Rovo chats.

## Summary (17:07)

- Captures: 61 entries in `src/data/captures.json` (48 stills, 13 videos, all 3840x2160, videos 60 fps with real timing), files in `public/captures/`.
- Measured: merge click to the runbook's byline written Possibly stale 18.6 s (property v11 at 14:46:32.025Z; merge commit 14:46:14, so 18 s); `measured.mergeToFlagSeconds` = 19. Jira PAY-18 to Done to ADR-015 flagged: 9 s. Owner comment 24 s after the merge.
- Rovo: Drift Reviewer said the runbook is Possibly stale and why (PR #482, rollback.sh renamed to rollback-v2.sh, values.yaml updated); first attempt, no retry needed.
- Tool output: checkBefore, findDocsFlagged, checkFlagged, checkVerified ("Safe to cite.") stored in `toolOutput`.
- Restored: runbook text (v5 = v1 text), anchors (3, same weights), Verified; ADR-015 Verified; PAY-18 To Do; comment delay 10. PLAT 18 of 24 anchored, 5 Possibly stale (same as before). Left in place: declined PRs #20-#481 and branch video/pr-counter, Jira task PAY-24, app footer comments on the runbook (3735566) and ADR-015 (3702789), two Rovo chats.
- Chrome on CDP 9222 left running (logged in). Raw screencast frames: tools/capture/frames (4.2 GB, git-ignored), only needed to re-encode.
- 2026-11-13T18:58:46+02:00 Re-capture (director, D38, core 5.5.0): before-v2.json written. Runbook Verified (v5), PLAT 18 of 24 anchored / 5 Possibly stale. DDSTEST pages anchored to scripts/rollback.sh (read only): 2752731 {'title': 'Possibly stale · Doc Drift', 'tooltip': 'PR #482 changed scripts/rollback.sh on Nov 13. Review.'}, 2982418 {'title': 'Possibly stale · Doc Drift', 'tooltip': 'PR #482 changed scripts/rollback.sh on Nov 13. Review.'}
- 2026-11-13T18:59:15+02:00 Settings: clicked "Replay seeded PR #482" at 2026-11-13T16:59:11.559Z (runbook before: Verified · Doc Drift). Page text near it: 3. Try the demo replay | Replays seeded PR #482 from payments-api: scripts/rollback.sh renamed to scripts/rollback-v2.sh, and ROLLBACK_TIMEOUT renamed to ROLLBACK_TIMEOUT_SECS. It runs through the same path as the relay, with no Bitbucket needed. | Replay seeded PR #482 | Replayed PR #482.
- 2026-11-13T18:59:18+02:00 Replay: runbook byline now "Possibly stale · Doc Drift" (6.8 s after the click), tooltip "PR #482 changed deploy/helm/values.yaml on Nov 13. Review."
- 2026-11-13T19:01:09+02:00 Rovo: asked Drift Reviewer "How do I roll back payments-api?" on the runbook (take p3-rovo-v2); answer took 13 s; says Possibly stale: true, names PR #482: true, mentions the rename: false
- 2026-11-13T19:02:14+02:00 Restore: page 2720100 "Mark verified" in its review panel (runbook back to Verified after the re-capture (replay of seeded PR #482), before the 10-minute comment debounce); byline now {"title":"Verified · Doc Drift","tooltip":"Verified on Nov 13. Watching 3 anchors."}
- 2026-11-13T19:02:33+02:00 MCP (core 5.5.0, runbook flagged by the replay): find-docs-for-path -> same 3 pages (findDocsFlaggedV2); check-page-freshness -> guidance "\"Payments rollback runbook\" is Possibly stale. Do not present steps from this page as current. Cite with caveat: what it describes changed in PR #482 on 2026-11-13, after it was last verified. Affected: \"Steps\"." (checkFlaggedV2)
- 2026-11-13T19:03:45+02:00 Restore (re-capture): after-v2.json written. PLAT 18 of 24 anchored, 5 Possibly stale, 13 Verified (same as before-v2). Two Helm-anchored pages count one more anchor change; comment delay still 10.
- 2026-11-13T19:10:46+02:00 Check (19:10:30, after the replay notify debounce): runbook footer comment 3735566 still version 1 (nothing appended), ADR-015 comment 3702789 still version 1, runbook Verified. Re-capture done.

## Re-capture summary (19:11, director request, D38, core 5.5.0)

- Flag: settings "Replay seeded PR #482" (18:59:11) flagged the runbook in 6.8 s. No Bitbucket change.
- New captures: p3-rovo-v2.mp4 (40.2 s), p3-rovo-v2-agent, p3-rovo-v2-question, p3-rovo-v2-answer. The first answer was clean, so there was no second ask: "Payments rollback runbook is Possibly stale. What it describes changed in PR #482 on 2026-11-13, after it was last verified. The affected section is "Steps". Do not present steps from this page as current. The review is in the Doc Drift badge on the page." No author named.
- Tool output: findDocsFlaggedV2, checkFlaggedV2 (new caveat wording). The old p3-rovo captures and checkFlagged are marked superseded.
- Restored: runbook Mark verified at 19:02:14 (inside the 10-minute debounce: no comment added). PLAT 18 of 24 anchored, 5 Possibly stale (after-v2.json); comment delay 10.
