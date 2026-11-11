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
- `nextPageState({ current, bindingCount, openEvents, now })` gives `verified`, `possibly_stale`, `stale` or `unanchored`.
- `suggestAnchors(extractPageText(storage))` proposes anchors for the binding modal: Bitbucket URLs, repo paths in code blocks and inline code, and Jira keys.

## Scoring summary

Per binding, over the change's files that survive the ignore globs:

| Step | Value |
| --- | --- |
| Path match | exact 1.0, glob 0.6, repo-wide 0.2 (a renamed file also matches on its old path) |
| Magnitude | 1 for removed or renamed, else `min(1, log10(1 + added + removed) / 2)` |
| File term | `weight × match × (0.5 + 0.5 × magnitude)`; the strongest file counts (max, not sum) |
| Comment or whitespace only | file term × 0.5 (needs hunks; not in detection.md) |
| Identifier boost | +0.3 if the page mentions an identifier the change removed |
| Snippet boost | +0.4 if a page code block contains a line the change removed |
| Cap and threshold | `min(1, s)`, rounded to 2 decimals; an event needs `s >= threshold` (Strict 0.4, Balanced 0.5, Quiet 0.65) |

Boosts apply only after a path match. Weight is 1.0, minus 0.1 per dismissal, with a floor of 0.3. Severity is High when `s >= 0.8`, an anchored file was removed or renamed (path or glob anchors), or the anchor is critical. Jira changes score 0.7 (Done or Won't Do), 0.6 (fix versions, components, parent), 0.5 (description) or 0.3 (summary), taking the strongest signal.

Removed identifiers are tokens on `-` lines that no `+` line in the change still uses. Code-shaped tokens (`ROLLBACK_TIMEOUT`, `log.info`, `replicaCount`) are matched against all page text. Plain lowercase words (`wait`, `refunds`) are matched against page code only.

## Tests and eval

```sh
pnpm test        # unit tests + every fixture
pnpm eval        # the fixture eval with its precision/recall table printed
```

## Adding a fixture

Add `fixtures/scenarios/NN-short-name.json` at the repo root:

```jsonc
{
  "id": "NN-short-name",
  "label": "drift",                 // or "no_drift"
  "title": "One line",
  "notes": "Why the expected outcome is right",
  "config": { "threshold": 0.5 },   // optional
  "pages": [{ "pageId": "100101", "title": "...", "storage": "<p>Confluence storage XHTML</p>" }],
  "bindings": [{ "id": "b-1", "pageId": "100101", "anchorType": "path", "repo": "nano-soft-dev/payments-api", "pattern": "scripts/rollback.sh", "weight": "normal" }],
  "steps": [{
    "change": { "source": "bitbucket", "...": "a full ChangeRecord, validated by parseChangeRecord" },
    "expect": {
      "outcome": "scored",          // or "revert" / "skipped"
      "flagged": [{ "pageId": "100101", "minScore": 0.8, "severity": "high" }],
      "skipReason": "no_relevant_files",
      "revertedTitle": "...",
      "renameProposals": [{ "bindingId": "b-1", "from": "old/path", "to": "new/path" }]
    }
  }]
}
```

Every page not listed in `flagged` must not flag. For realistic `files` and `hunks`, make the change in a scratch git repo and copy the output of `git diff -M --numstat` and `git diff -M` into the record (JSON-escaped). The eval counts one decision per step and page.
