# Test report, 2026-11-11

QA run against core 4.16.0 and relay version 2 in development (one-atlas-jzzf, DDSTEST space, sandbox repo `nano-soft-dev/qa-sandbox` for crafted records, `qa/` files in `nano-soft-dev/payments-api` for real merges). Plan: [test-plan.md](test-plan.md). No app source was changed and nothing was deployed.

## Phase 2 retest (2026-11-12, core 4.21.0 to 4.23.0, relay 2.2.0)

After merging Track A (backend) and Track B (UI) of [backlog-phase2.md](backlog-phase2.md):

| Layer | Result |
| --- | --- |
| Vitest | core 337, matcher 202 (eval P 1.00 / R 0.94), relay 53, shared 14; no `it.fails` left |
| `scripts/qa/phase2.py all` | 38 of 39 on the first rerun; the 1 failure was test-only (P2-STW-01 reused an already-excluded file), fixed by `clearExclude` on bind (P2-STW-00) |
| `scripts/qa/run_matrix.py all` (run 3) | 104 pass, 16 observations, 3 failures, all checks written for pre-phase-2 behaviour: BND-01 (Unicode is now allowed), REV-05 (the dampener now survives a re-save unless reset), FIX-15 (BUG-05 refuses drafts on link blocks, so the tricky page has fewer than 11 draftable blocks). Checks updated; all 3 pass |
| Browser (Chrome, PLAT) | byline leads with the state word; review panel why sentence, summary-first card, Show diff; Anchors explainer; dashboard filter, Review action, Anchor this space (cancelled, PLAT kept at 18 of 24); settings Get started, relay status, coding-agent card |
| MCP (real server, asUser) | tiny link resolves (`resolvedFrom: tinyUrl`, D20 note); a title passed as `pageId` resolves to that page with `citePolicy` |

Found and fixed in this pass:
- **Exclusions were invisible (R-7).** After "Stop watching", the Anchors tab did not say which files were excluded, and there was no undo (removing and re-adding the anchor in one save keeps the row). Now each anchor shows "Not watching x." with a **Watch all files** button, saved as `clearExclude: true`.
- **The why sentence appeared twice** on a page with 1 change (header and card). The card now hides it when there is only 1 change.

Flaky once: on the first `resolvers` run right after deploying 4.22.0, a rename record ingested into page 3015468 was counted as a quiet change (`changesSince 1, relevant 0`) instead of flagging. 3 later runs flagged it. Page update events do not touch open events, so the cause is not known. Watch for it in the next full run.

## Summary

| Layer | Cases | Pass | Fail | Observation |
| --- | --- | --- | --- | --- |
| New Vitest cases (matcher 46, core 40, relay 9) | 95 | 85 | 10 (bug reproductions, written as `it.fails`) | |
| Live, dev driver + REST (`run_matrix.py`, run 2) | 114 | 89 | 11 | 14 |
| Live, real Jira events (PAY-23) | 9 | 7 | 0 | 2 |
| Live, real Bitbucket merges (PRs #14 to #17) | 5 | 4 | 0 | 1 |
| Live MCP from Claude Code (asUser, real consent) | 4 | 2 | 2 | |
| **Total** | **227** | **187** | **23** | **17** |

All existing suites stay green with the new files: matcher 193 + 2 expected fail, core 259 + 7, relay 51 + 1, shared 12.

19 bugs: **5 High**, 8 Medium, 6 Low. No Critical. The signed-ingest path was not exercised live because the relay secret is in use by the live relay and QA must not rotate it; it is covered by the existing `checkIngestRequest` unit tests, and every downstream step ran through the driver's `ingest` action and 4 real merges.

PLAT's demo state is unchanged (dashboard before and after: 18 of 24 anchored, 5 Possibly stale). `main` of payments-api holds every scenario merge as before; the QA files were added by PRs #14, #15 and #17 (PR #16 merged into the throwaway branch `qa/relay-target`) and removed by one direct commit, "QA cleanup: remove qa/ test files" (`64e86ff976ad`, no PR, so no relay event). A full `bb_seed.py reset` was not needed.

Raw evidence: `scripts/qa/out/run2.log`, `scripts/qa/out/results.jsonl` (run 2), `scripts/qa/out/results-run1.jsonl` (run 1, Jira and Bitbucket groups), all git-ignored. Log lines below are from `forge logs -e development` (UTC).

## Fix status (phase 2, Track A, 2026-11-12)

Fixed in core 4.18.0 to 4.20.0 and relay 2.2.0 (development; no new scopes, major version still 4). Live checks: `python3 -I scripts/qa/phase2.py all` (results in `scripts/qa/out/phase2.jsonl`, case IDs `P2-*`), plus the real MCP server from Claude Code (asUser). Every `it.fails` reproduction is now a passing test named "(fixed)". Decisions: D32 to D34.

| ID | Status | Verified by |
| --- | --- | --- |
| BUG-01 | Fixed: `validateGlob` refuses a leading `!`; the matcher treats a stored `!x` as an exception, never "ignore everything else" | Unit; live P2-SET-01 (field error, nothing saved) |
| BUG-02 | Fixed: a revert closes the open events, then is scored as a change for every other page (D32) | Live P2-RVT-06 (`revert+scored`, Possibly stale), P2-RVT-01 regression |
| BUG-03 | Fixed: the PR number comes only from the `(pull request #N)` / `(PR #N)` suffix, or a squash `(#N)` ending the title | Unit; live P2-RVT-04 |
| BUG-04 | Fixed: the context page is used only when no page was named; tiny links decode; a title in `pageId` is a title; an unreadable link is `no_page`; another site's link is `other_site` | Unit; live P2-TOL-01 to 07; MCP asUser (tiny link `HIAu` resolved to 3047452, title in `pageId` resolved) |
| BUG-05 | Fixed: link text and `@mention` are in the block text, mapped as one atomic object; an edit that would rewrite or cut into a link, mention, emoticon, image or macro is `unsupported_span` | Unit; live P2-FIX-01 to 03 (refused draft, accepted draft kept the link once) |
| BUG-06 | Fixed: `dir/` saves as `dir/**`; `dir` without an extension saves with a `warning` (`checkAnchor` returns it) | Unit |
| BUG-07 | Fixed: a query with no static prefix matches a glob anchor only when the query matches the anchor's own pattern | Unit; live P2-TOL-11; MCP `**/*.sh` (no `src/**` pages) |
| BUG-08 | Fixed: the relay sends `filesTruncated` and `totalFiles`; each event says "This PR changed 812 files; only the first 500 were checked" | Unit (relay, shared, matcher); live P2-ING-08 (synthetic record; no real 500+ file merge yet) |
| BUG-09 | Fixed: trash resets the byline to Unanchored; `restored:page` recomputes it | Live P2-LIF-05 (8 s) |
| BUG-10 | Fixed: global space keys are uppercased in tools, dashboard and SQL | Live P2-TOL-09, P2-DSH-01; MCP `plat` |
| BUG-11 | Fixed: `moved:page` moves bindings and state; the dashboard keys on the space listing | Live P2-LIF-02 (ENGS, 8 s) |
| BUG-12 | Fixed: `submit-fix-proposal` needs edit rights | Unit (mocked gate); live needs a viewer account |
| BUG-13 | Fixed: a change whose revert arrived first closes at once, and so do the revert's own events (D32) | Live P2-RVT-05 |
| BUG-14 | Fixed: identifier and snippet reasons appear once per page (scores unchanged) | Unit |
| BUG-15 | Fixed: `resetDismissCount: true` on a saved anchor clears its dampener | Live P2-RST-01 (3047452 counts 0, re-flagged) |
| BUG-16 | Fixed: path tokens end at a word boundary that excludes `.x`, `/x`, `-x`; diff headers compare exactly | Unit |
| BUG-17 | Fixed: `spans_blocks` lists the best run of adjacent blocks | Unit |
| BUG-18 | Fixed: a Jira record without `changelogId` gets a key hashed from its changelog | Unit |
| BUG-19 | Fixed: git C-quoted paths are decoded | Unit |

UX observations: 1 fixed (`unanchored` error, P2-VER-01); 2 fixed (Unicode allowed, separate reasons for spaces and `..`); 3 not done; 4 fixed (`truncated` true and `matchedOmitted` when matched blocks are left out); 5 fixed (`limit` echoed, P2-TOL-10); 6 fixed (Stale bylines rewritten about daily; not observed over a day); 7 is BUG-14; 8 fixed (more specific anchor ranks first); 9 fixed (P2-TOL-06); 10 not done.

## High

### BUG-01: a negated ignore glob turns off all detection (High)

- **Repro.** Settings, Ignore globs: add `!docs/keep.md` (the gitignore idiom "do not ignore this file"). Save: it is accepted. Merge any PR.
- **Result.** Every change ends `skipped:no_relevant_files` ("all files ignored"). Nothing ever flags again, with no warning.
- **Evidence.** `packages/matcher/test/qa-edge.test.ts` "BUG-01 impact": `ignoreMatcher([...defaults, '!docs/keep.md'])('scripts/rollback.sh') === true`, and a critical anchor with +50/-50 returns `{kind: 'skipped', reason: 'no_relevant_files'}`. `apps/core/test/qa-edge.test.ts`: `parseSettings({ignoreGlobs: ['**/*.md', '!docs/keep.md']}).ok === true`. Not saved live, because it would have silenced detection for the parallel UX tester.
- **Cause.** `packages/matcher/src/paths.ts:13` (`ignoreMatcher`) compiles the list as one picomatch OR, and a pattern with a slash keeps its leading `!`, so it becomes "everything except docs/keep.md". `validateGlob` (`paths.ts:28`) does not refuse `!`.
- **Fix.** In `validateGlob`, return "can't start with !" for a leading `!`, or support negation properly: split into positive and negative lists and ignore a file only when a positive glob matches and no negative glob does.

### BUG-02: a revert of an already verified change is never scored (High)

- **Repro.** A page is anchored to `scripts/qa-rev.sh`. PR A changes the file; the page is updated and Mark verified. Then `Revert "A" (pull request #A)` merges, putting the old code back.
- **Result.** The revert closes nothing (A's events are already resolved) and is never scored, so the page stays **Verified** although its text now describes A's code, which is gone. Agents are told "Safe to cite."
- **Evidence.** RVT-06: `{"state": "verified", "match": {"outcome": "revert", "events": 0, "pages": []}}`; log `DDS_MATCH_REVERT {"changeRecordId":"98a684ab-…","revertedPrId":101399,"pages":[]}`.
- **Cause.** `packages/matcher/src/score.ts:104` returns `{kind: 'revert'}` before scoring; `apps/core/src/lib/matching.ts:122` only closes open events.
- **Fix.** When the reverted PR has no open events (it was verified or dismissed), score the revert as a normal change. Simplest: in `matching.ts`, if `revertEventsForRef` closed 0 events, fall through to the normal pass-2 scoring.

### BUG-03: a revert closes the wrong PR's events when the original title holds "#N" (High)

- **Repro.** PR #102479 ("QA unrelated") and PR #102480 ("Fix #102479: tune retries") both flag a page. Merge `Revert "Fix #102479: tune retries" (pull request #102480)`.
- **Result.** The revert closes **PR #102479's** events and leaves PR #102480's open. A real drift is silently cleared and a reverted one stays.
- **Evidence.** RVT-04: `open_refs: ["nano-soft-dev/qa-sandbox#102480"]`; log `DDS_MATCH_REVERT {…"revertedPrId":101394…}` in run 1 for the same case. Unit: `detectRevert('Revert "Fix #77: raise pool" (pull request #10)').revertedPrId` is 77.
- **Cause.** `packages/matcher/src/revert.ts:18`: `PR_NUMBER.exec(title)` takes the first `#N` anywhere in the title.
- **Fix.** Read the number only from a trailing `(pull request #N)` (or `(PR #N)`) after the closing quote, e.g. `/\((?:pull request |PR )#(\d+)\)\s*$/`; otherwise fall back to the title lookup.

### BUG-04: tools answer for the Rovo context page when the given page can't be parsed (High)

- **Repro.** In Rovo on page 3080280, ask about another page by its share link (`https://one-atlas-jzzf.atlassian.net/wiki/x/gQBH`), or the agent puts a title in `pageId`.
- **Result.** `check-page-freshness` (and `get-drift-context`, `record-verification`) silently answer for **3080280**, the page Rovo is on, with its title and state. An agent can cite "Safe to cite" for the wrong page; `record-verification` could verify the wrong page.
- **Evidence.** TOL-05: `{"pageId": "3080280", "title": "Doc Drift M3 fix test page", "status": "verified"}` for a tiny link; TOL-06 the same for `pageId: "DDS test: Payments rollback runbook"`. Live MCP (no context) correctly gives `no_page` for the tiny link.
- **Cause.** `apps/core/src/lib/agent-tools.ts:36` (`parsePageRef`): after an unmatched `pageUrl` or non-numeric `pageId`, it falls through to the context at line 46.
- **Fix.** Use the context only when `pageId`, `pageUrl` and `title` are all empty. Treat a non-numeric `pageId` as a title. Resolve `/wiki/x/<code>` tiny links (decode, or follow the redirect asUser), else return `no_page` with "Pass the full page URL."

### BUG-05: link text is invisible to the agent, so accepting a draft duplicates or destroys links (High)

- **Repro.** A paragraph `Read <ac:link>…the test home…</ac:link> then run <code>--retries</code> <strong>twice</strong>.` drifts. get-drift-context shows it as `"Read then run --retries twice."`. The agent proposes the natural sentence, "Read the test home, then run --attempts 3 times."
- **Result.** After Accept the page reads "Read **the test home** the test home, then run --attempts 3 times." (link text twice). If the changed characters span the link, the link (and bold, mentions, emoticons in that range) is replaced by plain text and its target is lost.
- **Evidence.** FIX-02 block text; FIX-10 live on DDSTEST page "QA tricky storage": `occurrences: 2`, storage `<p>Read <ac:link>…<![CDATA[the test home]]>…</ac:link> the test home, then run --attempts 3 times.</p>`; log `DDS_FIX_APPLIED {"blockId":"b11","version":5,…}`. Unit: "BUG-05 impact (b)" gives `<p>Open it and pass --attempts 3.</p>` (link gone); a user mention is dropped the same way.
- **Cause.** `apps/core/src/lib/blocks.ts:161` skips every CDATA outside code macros, including `ac:plain-text-link-body`; `editProse`'s whole-block fallback (`blocks.ts:465`, `safe`) only refuses ranges containing `ac:structured-macro`, not `ac:link`, `ri:user` or `ac:emoticon`.
- **Fix.** Include link body text in the block text, mapped to its raw offsets (like a `<code>` run), so the agent sees the real sentence. In `safe`, also refuse ranges containing `<ac:link`, `<ac:emoticon`, `<ac:image` or `<ri:` and return `unsupported_span`, so a destructive rewrite is never written.

## Medium

### BUG-06: a folder anchor without a glob never matches (Medium)

- **Repro.** Binding modal: Anchor path `deploy/helm/` (or `deploy/helm`), save. Change `deploy/helm/values.yaml`.
- **Result.** Saved as an exact `path` anchor and never matches anything. The page reads Verified forever.
- **Evidence.** Unit `BUG-06` (`normalizeAnchor({pattern: 'deploy/helm/'})` gives `anchorType: 'path'`) and `pathMatchStrength` 0 for both spellings. Auto-suggest already turns `dir/` into `dir/**` (`suggest.ts`), so manual entry is inconsistent with it.
- **Cause.** `apps/core/src/lib/anchors.ts:72`.
- **Fix.** A pattern ending in `/` becomes `<dir>/**` (glob). For a pattern with no extension and no glob, warn "This looks like a folder. Use deploy/helm/** to watch everything in it."

### BUG-07: find-docs-for-path with a prefix-less glob returns every glob-anchored page (Medium)

- **Repro.** MCP `find-docs-for-path` repo `payments-api`, path `**/*.yaml` (or `**/*.sh`).
- **Result.** Pages anchored only to `src/**` (Payments codebase tour, Payments API service overview) are returned as `match: "glob"`, although no YAML file is under `src/`. A coding agent is told to update unrelated docs.
- **Evidence.** Live MCP result for `**/*.yaml`: "Payments codebase tour … anchor payments-api: src/**, match glob". TOL-12 (driver): `**/*.sh` lists both `src/**` pages.
- **Cause.** `apps/core/src/lib/agent-tools.ts:94`: `prefix.startsWith(staticPrefix(query))`, and the static prefix of `**/*.sh` is `''`, which every string starts with.
- **Fix.** Only use the prefix test when the query's static prefix is non-empty; otherwise require the glob intersection to be plausible (e.g. test the binding glob's static prefix plus a filename sample against the query, or return only path anchors for prefix-less query globs).

### BUG-08: a diffstat truncated at 500 files is invisible to the core (Medium)

- **Repro.** Merge a PR with more than 500 changed files where the anchored file sorts after the 500th.
- **Result.** The relay drops files 501+ silently (`truncated: true` is only logged by the relay); the core cannot tell "not changed" from "dropped". No event, no note on the record or the settings page.
- **Evidence.** Relay unit: `collectDiffstat` keeps 500 of 520 with `truncated: true`; `buildChangeRecord` has no field for it (`BUG-08`, `it.fails`). The 320-file merge (PR #17) worked: `DDS_INGEST stored … {"prId":17,"files":320,"hunks":0}`, the anchored file #320 flagged at 0.58 High.
- **Cause.** `apps/bitbucket-relay/src/lib/record.ts:292` (`files.slice(0, MAX_FILES)`), `apps/bitbucket-relay/src/trigger.ts:116` (logged only).
- **Fix.** Add an optional `filesTruncated: true` (or `totalFiles`) to `BitbucketChangeRecord` (additive in `@dds/shared`); the core then treats repo-level and glob anchors as matched and shows "This PR changed 812 files; only the first 500 were checked."

### BUG-09: a page restored from the trash keeps its old badge (Medium)

- **Repro.** Anchor a page, let it drift (Possibly stale), trash it, restore it.
- **Result.** Bindings and state were dropped on trash (correct, `DDS_PAGE_REMOVED {"pageId":"3080696","eventType":"avi:confluence:trashed:page","closed":1,"bindings":1}`, 8 s), but the byline property survives, so the restored page shows **Doc Drift: Possibly stale** while `check-page-freshness` says Unanchored and the panel shows no anchors.
- **Evidence.** LIF-05: `{"restore": 200, "byline": {"title": "Doc Drift: Possibly stale", …}, "page_state": null, "bindings": 0, "tool_status": "unanchored"}`.
- **Cause.** `apps/core/src/lib/db.ts:720` (`dropPage`) deletes rows but never rewrites the property; `apps/core/manifest.yml:237` subscribes to trashed/deleted only.
- **Fix.** In `confluencePageEvent`, after `dropPage`, write the Unanchored byline value (or delete the property). Optionally subscribe to `avi:confluence:restored:page` and refresh.

### BUG-10: space keys are case-sensitive in list-stale-pages and the dashboard (Medium)

- **Repro.** MCP `list-stale-pages` with `spaceKey: "plat"`.
- **Result.** `{"pages": [], "guidance": "No Possibly stale or Stale pages that you can view in plat."}`, while `PLAT` returns 5. An agent gets a false all-clear. The dashboard with `plat` reports total 24 but anchored 0.
- **Evidence.** Live MCP call above; TOL-17 (`PLAT: 5, plat: 0`); DSH-03.
- **Cause.** `apps/core/src/lib/db.ts:1081` (`driftedPages`, `p.space_key = ?`) and `db.ts:849` (`statePagesInSpace`) compare exactly; `agent-tools.ts:67` (`parseSpaceKey`) keeps the case. Settings already compare case-insensitively (`spaceWatched`).
- **Fix.** Uppercase global space keys in `parseSpaceKey` (keep `~personal` keys as given), or resolve the key through `GET /wiki/api/v2/spaces?keys=` and use the canonical key.

### BUG-11: a page moved to another space disappears from both dashboards (Medium)

- **Repro.** Anchor a DDSTEST page, let it drift, move it to space ENGS.
- **Result.** Bindings and `page_state` keep `space_key: DDSTEST`. The DDSTEST dashboard drops it (it is not in the space listing) and the ENGS dashboard never counts it (`anchored: 0`). The space watch setting is applied with the old key, and `getPageDrift.space.key` reads DDSTEST.
- **Evidence.** LIF-02: `{"binding.space_key": ["DDSTEST"], "getPageDrift.space.key": "DDSTEST", "in ENGS dashboard": false, "in DDSTEST dashboard": false}`.
- **Cause.** No move handling: `apps/core/manifest.yml:237` (no `avi:confluence:moved:page`); space keys are written only at bind time (`db.ts` `insertBinding`) and as a hint in `refreshPage`.
- **Fix.** Subscribe to `avi:confluence:moved:page` and update `binding.space_key` and `page_state.space_key`; or have the dashboard key on the REST listing's page IDs instead of `page_state.space_key`.

### BUG-12: a view-only user can submit drafts and supersede an editor's draft (Medium)

- **Repro (code review; needs a second user in a browser).** A user with view rights runs Drift Reviewer on a page and submits a draft for a block that already has an open draft.
- **Result.** `submitFixProposal` checks `read` only, so the viewer's draft is stored and the editor's open draft for that block is marked `rejected` ("A new draft for the same block replaces the open one"). Viewers can also fill the 10-draft cap. D30 says "Propose fix already needs edit rights", which the code does not enforce.
- **Cause.** `apps/core/src/lib/fix-service.ts:125` (`deps.gate(pageId, 'read')`) and `fix-service.ts:150` (replace logic).
- **Fix.** Gate `submit-fix-proposal` on `update`, matching D30/D31, or at least only replace drafts the same `createdBy` submitted.

### BUG-13: a revert delivered before its original leaves the page flagged (Medium)

- **Repro.** Deliver `Revert "X" (pull request #N)` first, then PR #N (relay retries can reorder deliveries by up to 15 min).
- **Result.** The revert finds nothing to close; PR #N then flags the page, although the code is back to where the page describes it.
- **Evidence.** RVT-05: final state `possibly_stale`.
- **Cause.** `apps/core/src/lib/matching.ts:122` (no record of an early revert).
- **Fix.** When a change arrives, check for a stored revert of it (`change_record` with `title = 'Revert "<title>"…'` or a matching PR number) and mark its events `reverted` immediately.

## Low

| ID | Bug | Evidence | Suspected location | Suggested fix |
| --- | --- | --- | --- | --- |
| BUG-14 | Identifier and snippet boosts are change-wide, so every anchor of a page matched in the PR repeats them: PR #15's `logo.png removed` event also says "Page mentions --retries, removed in PR #15" and scores 1.00 | BB-02 events | `packages/matcher/src/score.ts:114` | Attach boosts per file, or show them once per page |
| BUG-15 | Re-saving the same anchor keeps its `dismissCount`; a user can't reset the dampener except by removing and re-adding the anchor in two saves | REV-05 run 2: `dismissCount: 2` after a fresh bind | `apps/core/src/lib/anchors.ts` `planBindingChanges` | Reset on explicit re-save, or show "dampened by 2 dismissals" with a reset link |
| BUG-16 | A path token matches longer file names that start with it (`scripts/a.sh` hits `scripts/a.sh.bak`), in affected sections and `diffForPaths` | core unit "tokens and diffs" | `apps/core/src/lib/review.ts:78`, `agent-tools.ts` `diffForPaths` | End the token on `[^\w./-]` or end of string; compare diff headers exactly |
| BUG-17 | `spans_blocks` lists blocks that only share a substring: a passage across 2 list items returned `["b5","b8","b9","b13"]` (a table cell and a code block too) | FIX-04, `DDS_FIX_REFUSED {"error":"spans_blocks","blockIds":["b5","b8","b9","b13"]}` | `apps/core/src/lib/blocks.ts` `spannedBlocks` | Require the covered pieces to be adjacent in document order |
| BUG-18 | A Jira record without `changelogId` gets the key `jira#PAY-21#`, so a second such change of the issue is dropped as a duplicate (only hand-built or relay-sent Jira records; the trigger always sets it) | core unit | `apps/core/src/lib/ingest-rules.ts` `changeDedupeKey` | Hash the changelog into the key when the ID is missing |
| BUG-19 | Git-quoted paths (`"a/caf\303\251.sh"`, core.quotePath) are not decoded, so the diff of a non-ASCII file never joins its diffstat entry (no boosts, no cosmetic check). Bitbucket's /diff sent the unicode file unquoted in PR #14 | matcher unit | `packages/matcher/src/diff.ts` `GIT_HEADER`, `stripPrefix` | Accept quoted headers and decode octal escapes |

## Passed, with evidence

- **Ingest** (ING-01 to 15, DRV-01 to 03): unsigned, malformed, wrong, stale and millisecond-timestamp requests are 401; a 614,434-byte body is 400 before the signature (`DDS_INGEST rejected: body too large bytes=614434`); non-JSON with a bad signature is 401 (signature first); `..`, 501 files, rename without `oldPath`, lowercase Jira key, hunks over 200,000 bytes and `prId 0` are refused with precise errors (`change.files must have at most 500 items`). The driver is inert without its token.
- **Matcher** (MAT-01 to 09): unicode/emoji/space paths ingest with 0 events; a 0-file glob creates nothing; 400 files: file #400 flags High in 4.4 s; rename + modify: High 0.70 and a rename proposal; delete: High 0.70; identifier + quoted line: 1.00 with both reasons; non-default branch and all-ignored changes skip; a comment-only change stays quiet. Re-matching a change is idempotent (CON-01).
- **Reverts**: by number, by title, and a revert of a revert re-flags (RVT-01 to 03).
- **Real merges**: PR #14 (4 added files, unicode and binary) processed 24 s after the merge, 3 events (`logo.png` critical at exactly 0.50); PR #15 rename + delete + modify: Bitbucket reported the rename (`qa/relay/old-name.sh` to `new-name.sh`) and a rename proposal was stored; PR #16 into `qa/relay-target`: no record reached the core in 79 s; PR #17, 320 files, diffstat only (`hunks: 0`), file #320 flagged.
- **Fix proposals**: table cell, nested list item, a code line inside CDATA containing `]]>`, multi-block accept with `pendingDrafts` 3, 2, 1, 0 and versions named "Doc Drift: accepted proposal for PR #101481"; macros, emoji, `ac:emoticon`, the status macro, the info panel, the nested list and the split CDATA all intact (FIX-09). Status macro in range: `unsupported_span`, nothing saved. Conflict in the block: `not_found`, page unchanged; edit elsewhere: still applies; 11th draft: `too_many`; 460-block page: 5.5 KB context.
- **Review actions**: every bad dismiss and snooze input refused with its message; snooze "7" works and the byline says "Snoozed until Nov 18."; accept-rename twice refused.
- **Escalation**: 6 days Possibly stale, 8 days Stale after the hourly job ("Unreviewed drift for 8 days (1 change). Agents told not to trust this page.").
- **Jira** (PAY-23, real events, about 8 s each): In Progress, reopen and summary only: no event; Done 0.70 Medium; fix version 0.60; slip shows 2027.01; description 0.50.
- **Tools**: unknown page `unknown` with no title (also via live MCP); edit-v2 and viewpage URLs; case-insensitive title; `ambiguous_title` with both candidates across DDSTEST and ENGS; unicode path query; bad repo and blank path give guidance.
- **Settings**: 4 bad fields return 4 `fieldErrors` and save nothing; bad space key and `BALANCED` refused; an empty update keeps stored values (defaults intact after the run).
- **Concurrency**: 2 PRs at once give 2 events and Possibly stale; 3 more give Stale and a matching byline; one change matched twice in parallel gives 1 event (`uq_drift_dedupe` holds).
- **Dashboard**: DDSTEST KPIs agree with the listed pages and the REST page count (16 pages minus home).

## UX observations (from API behaviour)

1. **Mark verified on an Unanchored page** answers "Marked verified." and the page stays Unanchored (REV-10, and `record-verification` says "Marked verified. The page reads Unanchored."). Say "This page has no anchors, so there is nothing to verify. Add anchors first."
2. **Unicode paths are refused with the wrong reason**: "Use a repo-relative path without spaces or '..'." for `docs/ünï.sh`. Either allow Unicode in `PATTERN_CHARS` (the matcher handles it) or say "Use ASCII characters only."
3. **The fix-version slip reads "(now 2027.01)"**: Jira sends two items (`null → 2027.01` and `2026.12 → 2027.01`) and the summary uses the first. For the dashboard beat, "fix version moved from 2026.12 to 2027.01" is clearer: prefer the item that has both values.
4. **get-drift-context drops matched blocks silently**: on the 460-block page it showed 30 of 60 matched steps with `blocksOmitted: 31` but `truncated: false`. An agent may think it fixed every step. Set `truncated` (or a `matchedOmitted` count) and say so in `guidance`.
5. **list-stale-pages ignores bad limits silently** (0, -3, "abc" all give the default 10). Echo the limit used.
6. **Stale tooltips freeze**: the hourly job only revisits Possibly stale pages (`escalationCandidates`), so "Unreviewed drift for 8 days" keeps saying 8 days a month later. Rewrite Stale bylines daily, or drop the day count from the stored tooltip.
7. **Repeated reasons**: a page with 3 anchors touched by one PR shows the same "Page mentions --retries" and "1 line in this page's code blocks…" reasons on all 3 events (BUG-14).
8. **find-docs-for-path folder results** list every page under the folder as `match: "folder"` with equal rank, so an exact match on another file and a broad glob look alike. Add the matched anchor's specificity to the ordering.
9. **A cross-site URL** (`other-site.atlassian.net/.../pages/2720129`) is read as page 2720129 on this site. Compare the host with the site URL and refuse a foreign one.
10. **Auto-suggest proposes look-alike Jira keys** (`ARM-64`, `COVID-19`): check the project key against the site's Jira projects before suggesting.

## Not tested, and why

- Signed ingest acceptance, replay inside the window and ping, live: the relay secret is in use; covered by unit tests.
- asUser permission checks (D15, D30, D31), consent (`consent_required`), restricted pages (D20), Rovo confirmations: need a signed-in user; apps/core/README.md checks 5, 6, 16 to 24. BUG-12 needs a second user to confirm live.
- Snooze expiry over a real day, and the notifier inbox mention.
- Settings with a negated glob saved live (BUG-01): would have silenced detection for the parallel UX tester.

## Test data left behind

- DDSTEST pages titled `QA …` (Verified; "QA lifecycle page" was trashed again after the restore test), and "QA 2026-11-11: driver results" (the driver result sink).
- ENGS: trashed "QA move page", "QA lifecycle page renamed" and "QA duplicate title" (the API user cannot restore or move pages out of ENGS).
- Jira PAY-23 "Doc Drift QA: Jira beats" (label `dds-test`, To Do, fix version 2027.01).
- payments-api: PRs #14 to #17 merged; the files they added are deleted on `main`; branches cleaned.
