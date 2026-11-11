# @dds/matcher

The deterministic matcher for Doc Drift Sentinel (F3). Pure TypeScript with no Forge imports and no LLM. The algorithm is in [docs/architecture/detection.md](../../docs/architecture/detection.md). Types such as `ChangeRecord`, `Binding` and page states come from `@dds/shared`.

## API

```ts
import { parseChangeRecord } from '@dds/shared';
import { indexPages, scoreChange, nextPageState, extractPageText, suggestAnchors } from '@dds/matcher';

const parsed = parseChangeRecord(JSON.parse(body));         // validate untrusted input first
const pages = indexPages([{ pageId, title, storage }]);     // storage-format XHTML -> tokens + code line hashes
const result = scoreChange(parsed.value, bindings, pages, { threshold: 0.5 });
// result.kind === 'scored'  -> result.events (DriftEvent[]), result.renameProposals
// result.kind === 'revert'  -> close the reverted PR's events with reason `reverted`
// result.kind === 'skipped' -> 'no_relevant_files' | 'non_default_branch'
```

- `DriftEvent` has `score`, `severity` (`high` | `medium`), `matchedAnchor` (for example `payments-api: scripts/rollback.sh`), `files`, `reasons` (product voice, for example `scripts/rollback.sh renamed to scripts/rollback-v2.sh`), `matchedIdentifiers`, `matchedSnippetLines` and a `dedupeKey` for idempotent upserts.
- `nextPageState({ current, bindingCount, openEvents, now, escalationDays? })` gives `verified`, `possibly_stale`, `stale` or `unanchored` (D27): the first drift on a Verified page is always Possibly stale; Possibly stale becomes Stale after `escalationDays` (default 7), at 3+ distinct changes (`ref`), or on a further High on a critical anchor from another change; snoozed events (`snoozedUntil`) don't count, and an all-snoozed page reads Possibly stale.
- `suggestAnchors(extractPageText(storage))` proposes anchors for the binding modal: Bitbucket URLs, repo paths in code blocks and inline code, and Jira keys.

## Scoring summary

Per binding, over the change's files that survive the ignore globs:

| Step | Value |
| --- | --- |
| Path match | exact 1.0, glob 0.6, repo-wide 0.2 (a renamed file also matches on its old path) |
| Magnitude | 1 for removed or renamed, else `min(1, log10(1 + added + removed) / 2)` |
| Weight | critical 1.0, normal 0.7 (D26), minus 0.1 per dismissal, floor 0.3 |
| File term | `weight × match × (0.5 + 0.5 × magnitude)`; the strongest file counts (max, not sum) |
| Comment or whitespace only | file term × 0.4 (needs hunks; not in detection.md) |
| Identifier boost | +0.3 if the page mentions an identifier the change removed |
| Snippet boost | +0.4 if a page code block contains a line the change removed |
| Cap and threshold | `min(1, s)`, rounded to 2 decimals; an event needs `s >= threshold` (Strict 0.4, Balanced 0.5, Quiet 0.65) |

Boosts apply only after a path match. Severity is High when `s >= 0.8`, the file of an exact path anchor was removed or renamed (not a glob: `src/**` outlives any one file in it), or the anchor is critical. Jira changes score 0.7 (Done or Won't Do), 0.6 (fix versions, components, parent), 0.5 (description) or 0.3 (summary), taking the strongest signal. Jira scores are not scaled by normal/critical (only the dismiss dampener applies); critical makes a Jira event High.

What that means in practice, at Balanced (0.5):

| Change | Normal exact | Critical exact | Normal glob |
| --- | --- | --- | --- |
| 1 line edited (+1/-1) | 0.43, quiet | 0.62, High | 0.26, quiet |
| 20 lines | 0.58, Medium | 0.83, High | 0.35, quiet |
| 100+ lines, or file removed or renamed | 0.7 (High if removed or renamed) | 1.0, High | 0.42, quiet |
| any of the above + page mentions a removed identifier | +0.3 | +0.3 | +0.3 |
| any of the above + page code quotes a removed line | +0.4 | +0.4 | +0.4 |
| comments or whitespace only | at most 0.28 | at most 0.4 | at most 0.17 |

So a normal anchor on a shared file needs evidence that the page uses what changed, a glob never alerts on paths alone, and a critical anchor alerts on any real change to its file.

Removed identifiers are tokens on `-` lines that no `+` line in the change still uses, taken from modified and renamed files only (not deleted ones). A `+` line that only announces a removal (`renamed`, `deprecated`, `no longer supported`, `was removed`, `replaced by`) does not count as a use, so a flag kept as a shim (`--count) echo "--count was renamed to --replicas"`) still counts as removed. Code-shaped tokens (`ROLLBACK_TIMEOUT`, `log.info`, `replicaCount`, `--count`, `/v1/refunds`) are matched against all page text. SQL and shell keywords are stopwords. Plain lowercase words (`router`, `wait`) are not evidence unless `plainWordIdentifiers: true`, and then only against page code.

Config is `Partial<MatcherConfig>`: `threshold`, `ignoreGlobs`, `ignoreNonDefaultBranches`, and the optional `anchorWeights` (`{ critical, normal }`) and `plainWordIdentifiers`.

## Tests and eval

```sh
pnpm test                          # unit tests + every fixture
pnpm eval                          # the eval: per-scenario table, confusion matrix, weight/threshold sweep
node ../../fixtures/build-from-demo.ts   # rebuild the demo-derived fixtures (Node 24, from this folder or any)
```

`pnpm eval` also writes [fixtures/eval-report.json](../../fixtures/eval-report.json): config, totals, per-source and per-scenario confusion, every page decision with its score, reasons and sub-threshold score, and the sweep. It is the source for the Devpost write-up.

### The evaluation set (M2, D26)

40 scenarios, 727 page decisions:

| Source | Scenarios | What |
| --- | --- | --- |
| `NN-*.json` | 10 | Hand-written with the matcher in M0 (D24). Small pages, synthetic diffs. |
| `demo-NN-*.json` | 10 | Demo scenarios 01 to 10, generated by [fixtures/build-from-demo.ts](../../fixtures/build-from-demo.ts): it replays `demo/seed/payments-api` (base, then each scenario on top of the previous one) in a scratch git repo and takes the diffstat and unified diff from `git diff -M`, as the relay would. All 24 PLAT pages (storage XHTML) and the `index.json` anchors as bindings. Expected flags from `index.json` `flaggedBy`, checked against each `scenario.json`. |
| `jira-NN-*.json` | 2 | The 2 Jira beats in `jira/issues.json` (won't-do as plain Done, fix version slip). |
| `edge-NN-*.json` | 18 | Edge cases on the same repo and pages: rename only, delete, revert of a revert, 60 new files under a glob, same paths in another repo, a monorepo, non-default branch, reindent, license headers, a 110-line comment, a prose-only value change, a critical one-line change, 320 files without hunks, a log message, 4 Jira cases (summary only, Done, Done + Won't Do resolution, In Progress). |

`{{PAY:ref}}` tokens in pages, anchors and repo files resolve from `demo/seed/jira/keymap.json` when it exists, else the illustrative `exampleKey`.

A page expected to flag can carry `knownMiss` (a reason): it counts as a false negative but does not fail the fixture. `edge-20` has 2: pages that state the old Helm bound only in prose.

### Results

| | Flagged | Not flagged |
| --- | --- | --- |
| Should flag | 30 | 2 |
| Should not | 0 | 695 |

**Precision 1.00, recall 0.94**, severity right on 25 of 25 checked flags, 0 alerts on the test-only and lockfile scenarios. On the 10 demo scenarios alone: 9 of 9 flags, 0 false positives. The 2 misses are the `knownMiss` pages in `edge-20`.

Before tuning (M0 matcher: every anchor 1.0, plain words as identifiers, cosmetic 0.5) the same set scored precision 0.59, recall 1.00: 22 false positives, all on the demo set and its edge cases.

### Tuning log (D26)

Each change, why, and what it fixed on the set. None is specific to one fixture.

1. **Normal anchors weigh 0.7, critical 1.0** (was 1.0 for both). Several pages anchor the same shared file (`deploy/helm/values.yaml` has 4, `src/**` 2). At 1.0 any 1-line edit to such a file scored 0.62 and flagged every page on it: 21 of the 22 false positives (demo 01, 02, 10, edge 13, 23). At 0.7 a small edit scores 0.43 to 0.46 and needs evidence; a removed or renamed file (0.7) or a large edit (0.58 at 20 lines) still alerts. Critical keeps "any change to this file needs review". Jira anchors are not scaled: Jira rule scores are already per signal, and an epic moving to Done should flag a normal anchor (detection.md).
2. **Threshold stays 0.5 (Balanced).** The sweep printed by `pnpm eval` meets both targets for normal 0.5 to 0.9 when the threshold is between `0.62 × normal` (the 1-line edit score) and about 0.55. 0.7/0.5 is inside that band with margin on both sides: highest quiet path-only score 0.46, lowest true flag 0.56. Strict (0.4) with normal 0.7 drops precision to 0.58: Strict means "every anchor match", as intended.
3. **Plain lowercase words are no longer identifier evidence** (option `plainWordIdentifiers`, default off). A change-local diff cannot tell whether `router` or `pool` still lives elsewhere in the repo. They caused the codebase tour false positive in demo 03. Two precise token kinds replace what they covered: **long CLI flags keep their dashes** (`--count`, `--wait`, code-shaped) and **HTTP routes are tokens** (`/v1/refunds`, `/v2/charges/:id`; not imports or URLs), which keeps hand-written 03 (a page listing a removed endpoint) a true positive.
4. **Deleted files add no removed identifiers.** Every token of a deleted file is on a `-` line, including `charge_id`, `pool.query` and SQL. The deletion is already scored at full magnitude through path anchors, and what it retires usually leaves a modified file too (`REFUNDS_V1_ENABLED` in config, the route registration). Removed lines of deleted files still count for the snippet boost (exact quoted lines are precise).
5. **SQL and shell keywords are stopwords** (`SELECT`, `FROM`, `WHERE`, `RETURNING`, `EOF`, ...). They are ALL CAPS, so code-shaped, but they are language, not identifiers.
6. **Glob anchors never count as "anchored file removed or renamed"** for High severity. A glob such as `src/**` outlives any one file in it; only an exact path anchor's file can be gone. Fixes the service overview severity in demo 03 (Medium, 0.72) and hand-written 03 (updated).
7. **Cosmetic factor 0.4** (was 0.5). At 0.5 a 100+ line comment change on a critical anchor scored exactly 0.5 and alerted (`edge-28`). At 0.4 a cosmetic-only change caps at 0.4 and never alerts alone at Balanced; it can still alert with a quoted line or identifier.

8. **Removal notices don't keep an identifier alive** (M3, polish item 5). Demo 09 renames `--count` to `--replicas` and keeps `--count) echo "--count was renamed to --replicas"; exit 2` so old callers get a message. That added line used to cancel the removal, so the Scale payment workers page (step 3 runs `--count 6`) got only the file reason. Now `+` lines matching a removal notice are skipped when collecting identifiers still in use, and the event reads "Page mentions --count, removed in PR #N" (score 0.83 to 1.00, still High). Only demo-09 changed in the eval; precision 1.00, recall 0.94 as before.

Known limit: a value stated only in prose ("up to 8 worker pods") is invisible to path, identifier and snippet signals (`edge-20`). The Propose fix flow (LLM, on demand) is where that belongs.

## Adding a fixture

Add `fixtures/scenarios/NN-short-name.json` at the repo root:

```jsonc
{
  "id": "NN-short-name",
  "label": "drift",                 // or "no_drift"
  "title": "One line",
  "notes": "Why the expected outcome is right",
  "source": "edge",                 // optional: demo | jira-beat | edge (absent = hand-written)
  "config": { "threshold": 0.5 },   // optional
  "pages": [{ "pageId": "100101", "title": "...", "storage": "<p>Confluence storage XHTML</p>" }],
  "bindings": [{ "id": "b-1", "pageId": "100101", "anchorType": "path", "repo": "nano-soft-dev/payments-api", "pattern": "scripts/rollback.sh", "weight": "normal" }],
  "steps": [{
    "change": { "source": "bitbucket", "...": "a full ChangeRecord, validated by parseChangeRecord" },
    "expect": {
      "outcome": "scored",          // or "revert" / "skipped"
      "flagged": [{ "pageId": "100101", "minScore": 0.8, "severity": "high" }],  // optional "knownMiss": "why"
      "skipReason": "no_relevant_files",
      "revertedTitle": "...",
      "renameProposals": [{ "bindingId": "b-1", "from": "old/path", "to": "new/path" }]
    }
  }]
}
```

Every page not listed in `flagged` must not flag. For realistic `files` and `hunks`, make the change in a scratch git repo and copy the output of `git diff -M --numstat` and `git diff -M` into the record (JSON-escaped). The eval counts one decision per step and page. Edge cases on the demo repo and pages belong in [fixtures/build-from-demo.ts](../../fixtures/build-from-demo.ts) (`edgeCases`), which commits the change for real and diffs it.
