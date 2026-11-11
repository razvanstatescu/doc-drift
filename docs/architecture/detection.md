# Change detection and scoring

Hybrid: deterministic first, LLM only on demand. The matcher is a pure TypeScript package (`packages/matcher`) with no Forge dependencies, unit-tested against JSON fixtures.

## Algorithm

```
on ChangeRecord(cr):                       // from relay or Jira trigger
  files = cr.files.filter(f => !ignored(f.path))
  if files.empty and cr.source == 'bitbucket': return
  if isRevert(cr):                          // "Revert \"...\"" message or revert of known PR
     closeEventsFor(cr.revertedPrId, reason='reverted'); return
  candidates = anchors.byRepo(cr.repo)      // index lookup
  for a in candidates:
    s = 0
    for f in files:
      m = pathMatch(a, f)                   // exact=1.0, glob=0.6, repo-wide=0.2
      if m == 0: continue
      mag = f.status in [removed, renamed] ? 1.0 : min(1, log10(1 + f.added + f.removed) / 2)
      s = max(s, a.weight * m * (0.5 + 0.5 * mag))
      if f.status == renamed: proposeAnchorRename(a, f.oldPath, f.newPath)
    s += 0.3 if pageMentionsChangedIdentifiers(a.page, cr.removedIdentifiers)
    s += 0.4 if pageCodeBlockHashMatchesRemovedLines(a.page, cr.hunks)
    s = min(1, s)
    if s >= threshold (0.5 balanced): upsertDriftEvent(a.page, cr, s)
  enqueue(recompute pages touched, delayInSeconds=600)   // debounce bursts of PRs
```

Note: the identifier and hash boosts apply only when `s > 0`, meaning a path match happened first. The implementation (`packages/matcher`) adds a cosmetic factor (0.4) for comment- or whitespace-only edits, stricter identifier rules, and weights normal 0.7 / critical 1.0. See D24 and D26, and `packages/matcher/README.md` for the current rules.

## Jira rules

Applied to an anchored issue's changelog. Payload limits ([platform/forge-bitbucket-jira.md](../platform/forge-bitbucket-jira.md)):
- `fixVersions` and `components` are not in the update event payload; the status category is.
- A description change arrives with null `from`/`to` values.
- "Won't Do" is a status or resolution, not a status category.

So the handler filters on changelog `fieldId` and then fetches the issue (`requestJira`) to read the current values. Events can arrive up to about 3 minutes late.

| Change | Score |
| --- | --- |
| Status category to Done, or resolution/status Won't Do | 0.7 |
| `fixVersions` or `components` | 0.6 |
| Parent/epic change | 0.6 |
| `description` | 0.5 |
| Summary only | 0.3 (needs another signal) |

## Severity and state

- **High** if s ≥ 0.8, or an anchored file was removed or renamed, or the anchor weight is critical. Otherwise **Medium**.
- Verified → Possibly stale on the first event ≥ threshold.
- Possibly stale → Stale after 7 days unresolved, or 3+ events, or a further High event on a critical anchor while already Possibly stale (D27). The first event never jumps straight to Stale.

## Signals, ranked

1. **Path and glob anchors (Must).** Cheap, explainable, high recall. False positives come from broad globs, so new anchors default to file level, and globs covering more than 50 files get a warning.
2. **Identifier overlap (Must).** Extract removed or renamed identifiers from `-` lines (function names, env vars, CLI flags, config keys; regex `[A-Za-z_][A-Za-z0-9_.-]{3,}`) and match them against page text. This catches "the page says `ROLLBACK_TIMEOUT` and the PR renamed it". Swimm's smart tokens do the same thing at authoring time.
3. **Snippet hash (Should).** Hash the normalized lines of each page code block (trim, collapse whitespace). If any removed diff line's hash appears in a page code block, add 0.4. Very high precision.
4. **LLM judgment (Could, on demand only).** Only in the review flow: through the Rovo agent (customer credits, user-initiated) or optional Forge LLM gray-zone triage for scores of 0.3 to 0.5 (developer-paid). Never in the hot path.

## Edge cases

- **Renames:** propose an anchor update. Apply it after owner confirmation (the Swimm auto-sync idea).
- **Deletes:** High severity.
- **Monorepos:** rely on path anchors. Repo-level anchors weigh 0.2 and never alert alone.
- **Large diffs** (more than 300 files): diffstat only, no hunks fetched.
- **Non-default branches:** merges are ignored (setting).
- **Reverts:** close the events of the reverted PR with the reason `reverted`.
- **Noise control:** ignore globs (defaults in [features.md](../product/features.md)), a 24h notification cap, and a dismiss dampener: each dismissal takes 0.1 off that anchor, with a floor of 0.3.

## Evaluation (current results)

40 scenarios, 727 page decisions (`pnpm --filter @dds/matcher eval`, report in `fixtures/eval-report.json`): **precision 1.00, recall 0.94** (TP 30, FP 0, FN 2, TN 695). 0 alerts on test-only and lockfile changes, and severity matches on all 25 flags that state one. The 2 known misses are pages that state a changed Helm bound only in prose (edge-20, `knownMiss`). Before tuning, the same set scored precision 0.59 with 22 false positives.

## Evaluation plan

30 seeded scenarios on 24 pages:
- 20 true drift: rename a script, change an env var, change a helm value, delete an endpoint, epic marked Won't Do, component moved, and so on.
- 10 non-drift: test-only change, lockfile bump, comment typo, formatting, unrelated directory, revert pair.

Targets on the seeded set: **recall ≥ 0.9, precision ≥ 0.8, zero alerts on lockfile and test-only cases.** Fixtures are JSON in `fixtures/scenarios/`, run in Vitest. The confusion matrix goes into the Devpost write-up and the video.
