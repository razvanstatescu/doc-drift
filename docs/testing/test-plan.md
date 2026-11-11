# Test plan

Owner: QA track (Claude), written 2026-11-11 for M4/M5. It lists every user-facing path and input class of Doc Drift Sentinel, ranked by risk, with how each case is checked. Results of the first run are in [test-report-2026-11-11.md](test-report-2026-11-11.md).

## How to run

| Layer | Where | Command (Node 24: `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && ...`) |
| --- | --- | --- |
| Pure logic (matcher) | `packages/matcher/test/qa-edge.test.ts` | `cd packages/matcher && npx vitest run test/qa-edge.test.ts` |
| Pure logic (core) | `apps/core/test/qa-edge.test.ts` | `cd apps/core && npx vitest run test/qa-edge.test.ts` |
| Pure logic (relay) | `apps/bitbucket-relay/test/qa-edge.test.ts` | `cd apps/bitbucket-relay && npx vitest run test/qa-edge.test.ts` |
| Live, headless | `scripts/qa/run_matrix.py` (dev driver + REST, DDSTEST only) | `python3 -I scripts/qa/run_matrix.py all` or a group name |
| Live, real merges | `scripts/qa/bb_edge.py` (payments-api, files under `qa/` only) | `python3 -I scripts/qa/bb_edge.py run`, then `cleanup` |
| Live MCP | Claude Code with the `doc-drift` MCP server | see [MCP and actions](#9-mcp-and-actions-high) |
| Browser | manual (apps/core/README.md checks 1 to 29) | asUser paths, consent, Rovo confirmations |

Conventions:
- A Vitest case written `it.fails('BUG-NN: ...')` reproduces an open bug: it passes while the bug exists. When the bug is fixed, the case fails; flip it to `it`.
- Live scripts write one JSON line per case to `scripts/qa/out/results.jsonl` (git-ignored) with `PASS`, `FAIL` or `OBS` (observation, no assertion).
- Live tests bind DDSTEST pages titled `QA ...` to the sandbox repo `nano-soft-dev/qa-sandbox`, which no PLAT page anchors, so crafted records never touch PLAT's demo state. Real merges only add files under `qa/` in payments-api; PLAT anchors exact paths, `src/**` and `deploy/helm/**`.
- The ingest secret is never rotated by QA: the live relay uses it. Signed-acceptance paths are covered by unit tests (`checkIngestRequest`), and downstream logic by the driver's `ingest` action.

## Risk ranking

Risk = likelihood a judge or user hits it × harm (wrong state shown to an agent, data loss on a page, silent loss of detection).

| Rank | Area | Why it ranks here |
| --- | --- | --- |
| 1 | Matcher and reverts | Silent false negatives undo the pitch ("agents should not cite docs the code invalidated") |
| 2 | Fix proposals (apply) | The only path that writes page text; any loss of markup is user data loss |
| 3 | MCP and agent tools | Headline bonus; a wrong page or wrong state given to an agent is the worst failure |
| 4 | Settings | One bad value can turn detection off for the whole site |
| 5 | Ingest and relay | Entry point; must reject forgeries and never drop a real merge |
| 6 | Page lifecycle | Badge must never contradict the tools |
| 7 | Review actions and permissions | D15, D30, D31 |
| 8 | Jira beats | Demo beat at 2:40 |
| 9 | Escalation and snooze timing | Correctness over days, hard to see in a demo |
| 10 | Dashboard counts | Visible but low harm |
| 11 | Concurrency | Rare in a demo, real in production |

## 1. Matcher (High)

| ID | Case | Input class | Expected | How |
| --- | --- | --- | --- | --- |
| MAT-01 | Unicode, emoji and space paths | `docs/日本語 ファイル/🚀.sh` | validates, scores, no crash | live + unit |
| MAT-02 | Glob matching 0 files | `nothing/**` critical | no event | live + unit |
| MAT-03 | 400 files, 1 anchored | diffstat only | anchored file flags | live + unit |
| MAT-04 | Rename + modify of an anchored file | `renamed` + lines | High 0.7, rename proposal | live + unit |
| MAT-05 | Delete of an anchored file | `removed` | High 0.7 on a normal anchor | live + unit |
| MAT-06 | Removed identifier + quoted line | hunks | +0.3 and +0.4, both reasons | live |
| MAT-07 | Non-default branch | `destinationBranch` ≠ `defaultBranch` | skipped | live + unit |
| MAT-08 | Only ignored files | tests, `*.md` | skipped, "all files ignored" | live |
| MAT-09 | Comment-only change | cosmetic hunks | no event (×0.4) | live |
| MAT-10 | Case mismatch, leading `./` or `/` | `Scripts/Rollback.sh` | no match; `./` normalised | unit |
| MAT-11 | NFD vs NFC unicode | macOS-decomposed path | documented non-match | unit |
| MAT-12 | Binary file 0/0 lines | `logo.png` | critical flags at exactly 0.5 | unit + real merge |
| MAT-13 | Quoted git paths (`"a/caf\303\251.sh"`) | core.quotePath diffs | observation | unit |
| MAT-14 | Same anchor as `slug` and `ws/slug` | duplicates | 2 events for 1 change | unit |
| MAT-15 | 500 / 501 files | validator cap | 501 refused | unit + live |
| RVT-01..03 | Revert by number, by title, revert of a revert | titles | closes / closes / re-flags | live + unit |
| RVT-04 | Revert of a PR whose title holds `#N` | `Revert "Fix #77 ..." (pull request #10)` | closes PR #10 | live + unit |
| RVT-05 | Out-of-order delivery | revert before original | page should not stay flagged | live |
| RVT-06 | Revert of an already verified change | revert after verify | page flags again | live |
| RVT-07 | Revert whose files are all ignored | lockfile revert | events of the original stay open | unit |

## 2. Fix proposals (High)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| FIX-01 | get-drift-context on tables, nested lists, panels, code with CDATA `]]>`, emoji, status macro, expand macro | every block kind listed, ≤ 15 KB | live |
| FIX-02 | Paragraph containing an `ac:link` | the agent sees the link text | live + unit |
| FIX-03 | submit by block: table cell, nested list item, code line (span), status-macro cell, linked paragraph | ok, or `unsupported_span` for the macro | live |
| FIX-04 | Passage across 2 blocks | `spans_blocks` with only those blocks | live |
| FIX-05 | Text in several blocks | `ambiguous` with candidates | live |
| FIX-06 | Unknown blockId | `not_found` with candidates | live |
| FIX-07 | Second draft for the same block | replaces the first | live |
| FIX-08/09 | Accept 3 drafts (multi-block) | versions named after the PR, `pendingDrafts` counts down, macros/emoji/CDATA intact | live |
| FIX-10 | Accept the linked-paragraph draft | link kept, text not duplicated | live + unit |
| FIX-11 | Page edited in that block after the draft | `not_found`, page unchanged | live + unit |
| FIX-12 | Page edited elsewhere (IDs shift) | applies to its text | live + unit |
| FIX-13/14 | Apply twice, reject unknown | `not_open` | live |
| FIX-15 | 11th open draft | `too_many` | live |
| FIX-16 | Very long page (460 blocks) | ≤ 15 KB, matched section kept | live |
| FIX-17 | User mention, emoticon inside the rewritten range | kept | unit |
| FIX-18 | Viewer submits a draft (D30) | refused, or cannot supersede an editor's draft | code review + browser |

## 3. MCP and actions (High)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| TOL-01/02 | Unknown page; no input | `unknown`, no title; `no_page` | live driver + live MCP |
| TOL-03/04 | URL forms: `/pages/ID/Title`, `edit-v2`, `viewpage.action?pageId=` | resolved | live + unit |
| TOL-05 | Tiny link `/wiki/x/...` | `no_page` (MCP); must not fall back to the Rovo context page | live driver + live MCP |
| TOL-06 | Title passed as `pageId` with a context page | must not answer for the context page | live |
| TOL-07/08 | Exact title, title in another case | resolved | live |
| TOL-09 | Same title in 2 spaces | `ambiguous_title` with both | live |
| TOL-10..15 | find-docs-for-path: exact, folder with a Bitbucket URL, `**/*.sh`, unicode, bad repo, blank path | right pages only; `bad_request` with guidance | live driver + live MCP |
| TOL-16..18 | list-stale-pages: limit 0/51/"abc"/-3, space key case, unknown space | clamped; case-insensitive; empty with guidance | live driver + live MCP |
| TOL-19/20 | get-drift-context with no anchors; record-verification on an unknown page | guidance; refused by the gate | live (gate needs browser) |
| TOL-21 | Consent missing | `consent_required` | unit + browser |
| TOL-22 | Restricted page (D20) | `unanchored`, `restricted: true` | browser (README check 24) |

## 4. Settings validation (High)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| SET-01 | 4 bad fields at once | every `fieldErrors` entry, nothing saved | live + unit |
| SET-02 | Bad space key; lowercase key | refused; matches case-insensitively | live + unit |
| SET-03 | `BALANCED` | refused (case-sensitive) | live |
| SET-04 | Empty update | stored values kept | live |
| SET-05 | Negated ignore glob `!docs/keep.md` | refused (it would ignore every other file) | unit |
| SET-06 | 51 globs, duplicates, padding, brace glob with a comma, empty list | refused / deduped / trimmed / kept / allowed | unit |
| SET-07 | Decimals and padded numbers | `7.5` refused, `" 7 "` accepted | unit |

## 5. Ingest and relay (High)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| ING-01..08 | Unsigned, malformed, wrong, stale, ms timestamp, > 512 KB, non-JSON, empty | 401 / 400 (size before signature) | live |
| ING-09 | GET | 401 | live |
| ING-10..15 | `..` path, 501 files, rename without oldPath, lowercase Jira key, hunks > 200 KB, prId 0 | refused by the validator | live (driver) |
| ING-16 | Signed record, replay inside the window, duplicate delivery | 202 once, deduped | unit (secret is live, not rotated) |
| ING-17 | Ping | records the connection, no matcher run | unit + browser (README check 3) |
| DRV-01..03 | Driver without / wrong token / unknown action | 401 / 401 / 400 | live |
| BB-01 | Real merge adding a unicode-named file and a binary | record arrives, anchored files flag | real merge |
| BB-02/03 | Rename + delete + modify | statuses, rename proposal | real merge |
| BB-04 | Merge into a non-main branch | not relayed | real merge |
| BB-05 | 320 files | diffstat only, no hunks, anchored file flags | real merge |
| BB-06 | More than 500 files | truncation visible to the core | unit |

## 6. Page lifecycle (Medium)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| LIF-01 | Rename title | state kept, title search follows | live |
| LIF-02 | Move to another space | counts in the new space | live |
| LIF-04 | Trash | events close, bindings and state dropped (real event) | live |
| LIF-05 | Restore from trash | badge agrees with the tools | live |
| LIF-06 | Restricted page | "Restricted pages can't be watched yet." | browser (README check 5) |

## 7. Binding UI inputs (Medium)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| BND-01 | Unicode path | refused with a row error | live + unit |
| BND-02 | Leading `./` or `/`, whitespace, repo case | normalised | unit |
| BND-03 | Folder without a glob (`deploy/helm/`) | becomes `deploy/helm/**` or is refused | unit |
| BND-04 | Path with a space, `..`, ssh remote as repo | refused | unit |
| BND-05 | Bad glob `src/[a` | refused like settings | unit |
| BND-06 | Duplicates (`slug` and `ws/slug`) | one anchor | unit |
| BND-07 | Lowercase Jira key, bad weight | normalised / refused | unit |
| BND-08 | 51 anchors | refused | code review |

## 8. Review actions and permissions (Medium)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| REV-01 | Accept rename twice | second refused | live |
| REV-02..05 | Dismiss: bad reason, unknown event, twice, dampener count | refused / refused / `not_open` / +1 | live |
| REV-06..08 | Snooze 0, 31, 7.5, "abc", no open changes, "7" | refused / refused / message / works | live |
| REV-09/10 | Verify with a long note; verify an Unanchored page | clipped; clear message | live |
| REV-11 | View-only user: dismiss, snooze, accept fix, edit anchors | `forbidden` (D31) | browser (README check 6) |

## 9. Jira beats (Medium)

Real `avi:jira:updated:issue` events on a `dds-test` issue (`PAY-23`, created by the QA run).

| ID | Change | Expected |
| --- | --- | --- |
| JIR-01 | To Do to In Progress | no event |
| JIR-02 | to Done | 0.7, Medium on a normal anchor |
| JIR-03 | Done to To Do (reopen) | no event |
| JIR-04/05 | fix version set; slipped | 0.6, both values shown |
| JIR-06 | description edited | 0.5 (flags at Balanced, not at Quiet) |
| JIR-07 | summary only | no event |
| JIR-08 | Same changelog delivered twice | one event |

## 10. Escalation and snooze timing (Medium)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| ESC-01 | Event aged 6 days, then 8 | Possibly stale, then Stale after the hourly job | live (`age`, `escalate`) |
| ESC-02 | Snooze a Stale page | Possibly stale | live + unit |
| ESC-03 | Exactly `escalationDays` | Stale at the boundary, not before | unit |
| ESC-04 | Snooze ended | clock restarts at the snooze end | unit |
| ESC-05 | 3 events of 1 change vs 3 changes | stays / escalates | unit |
| ESC-06 | Snooze expiry rewrites the byline | within 2 h of the end | needs a 1-day wait: browser, Dec |

## 11. Dashboard counts (Low)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| DSH-01 | DDSTEST KPIs vs listed pages vs REST page count | agree | live |
| DSH-02 | PLAT | demo numbers | live |
| DSH-03/04 | Lowercase key, unknown key | same as upper / `not_visible` | live |

## 12. Concurrency (Low)

| ID | Case | Expected | How |
| --- | --- | --- | --- |
| CON-01 | Same change matched twice | 1 event, 1 proposal | live |
| CON-02 | 2 PRs at once on 1 page | 2 events, Possibly stale | live (threads) |
| CON-03 | 3 more at once | Stale, byline agrees | live |
| CON-04 | One change matched twice in parallel | 1 event (unique key) | live |

## Not covered headlessly

asUser permission checks (D15, D30, D31), consent (D21), restricted pages (D20), Rovo confirmation dialogs, the UI itself, notifier mentions in the inbox, and snooze expiry over a real day. They stay in the browser checks in apps/core/README.md.
