# Demo seed

Everything needed to build the Doc Drift Sentinel demo environment: the `payments-api` repo in Bitbucket, the Jira project PAY, and the Confluence space PLAT. The scripts use only the Python standard library and never print a token.

```
demo/seed/
  bb_seed.py                       Bitbucket: base import, scenario branches, PRs, merges
  payments-api/base/               repo contents on main
  payments-api/BASE-ADDITIONS.md   files base/ still needs (orchestrator applies them)
  payments-api/scenarios/01..10/   one folder per scripted PR: scenario.json + changed files
  jira/issues.json                 project PAY: 7 epics, 13 stories, the 2 Jira demo beats
  jira/seed_jira.py                creates PAY; also runs the Jira beats on cue
  confluence/index.json            the 24 PLAT pages: type, owner, labels, anchors, expected flags
  confluence/pages/**.xhtml        page bodies in Confluence storage format
  confluence/seed_confluence.py    creates PLAT, its folders, pages and labels
```

## Environment

Put these in `.env` at the repo root (never commit it):

| Variable | Used by |
| --- | --- |
| `BITBUCKET_EMAIL`, `BITBUCKET_API_TOKEN` | `bb_seed.py` (repo and pull request read/write) |
| `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN` | `seed_jira.py`, `seed_confluence.py` |
| `ATLASSIAN_SITE` | optional, default `one-atlas-jzzf.atlassian.net` |

The Atlassian account needs the Administer Jira global permission (to create PAY) and permission to create spaces in Confluence. Load the file with `set -a; . ./.env; set +a`, and run every script with `python3 -I`.

## Seed, in order

1. **Apply the base additions.** Write the files in [payments-api/BASE-ADDITIONS.md](payments-api/BASE-ADDITIONS.md) into `payments-api/base/`. Scenarios 02 to 10 and several pages depend on them.
2. **Bitbucket base.**
   ```
   python3 -I demo/seed/bb_seed.py base payments-api
   ```
3. **Jira.** Check the plan, then seed. Pages cite fixed keys (`PAY-142`, `PAY-158`, `PAY-170`), so the script reserves the numbers in between by creating and deleting 155 placeholders. Use a fresh PAY project; the script stops if a key would not match. It takes a few minutes.
   ```
   python3 -I demo/seed/jira/seed_jira.py seed --dry-run
   python3 -I demo/seed/jira/seed_jira.py seed
   ```
4. **Confluence.** Check the plan, then seed. Pages go into 5 folders under the PLAT homepage (Runbooks, Service overviews, Onboarding, Architecture decisions, API guides). If the site does not support folders, the script creates section pages instead. No page gets view restrictions (D20).
   ```
   python3 -I demo/seed/confluence/seed_confluence.py --dry-run
   python3 -I demo/seed/confluence/seed_confluence.py
   ```
   `--validate` only checks that all 24 bodies are well-formed. `--update` pushes edited bodies to pages that already exist. Do not use it after pages are anchored and verified: an edit is a new version.
5. **Install and anchor.** Install the core app, connect Jira, and add the anchors listed for each page in [confluence/index.json](confluence/index.json) (`anchors`: repo, path or glob, weight). 18 of the 24 pages are anchored; the other 6 stay Unanchored on purpose. Then mark all 18 Verified. Every scenario's expected outcome assumes the pages start Verified.

Personas (Dana, Sam, Marco, Priya, Lena) appear only in page text. The seeding account creates every page, so the Confluence owner is that account. Dana owns 7 of the 8 runbooks.

## Scenarios

Each scenario is written against `main` **after the previous scenarios have merged**, because `bb_seed.py scenario` commits whole files on top of the current `main`. Run them in order, creating each branch just before its PR:

```
python3 -I demo/seed/bb_seed.py scenario payments-api 02-raise-db-pool
python3 -I demo/seed/bb_seed.py pr payments-api 02-raise-db-pool
python3 -I demo/seed/bb_seed.py merge payments-api <pr-id>
```

Scenarios 04, 05, 06, 07 and 09 touch files that no other scenario touches, so their branches can be built ahead of time. 02 and 08 build on 01 (`deploy/helm/values.yaml`), and 10 builds on 03 (`src/config.ts`, `src/routes/index.ts`, `.env.example`).

| # | Change | Kind | Expected | Video beat |
| --- | --- | --- | --- | --- |
| 01 | Rename `scripts/rollback.sh` to `rollback-v2.sh`, `ROLLBACK_TIMEOUT` to `ROLLBACK_TIMEOUT_SECS` | drift | Payments rollback runbook: High | 0:55 to 2:40, the hero PR (#482 in demo mode) |
| 02 | `PAYMENTS_DB_POOL` 20 to 40 in `deploy/helm/values.yaml` | drift | Fail over the payments database: High. Payments deployment and Helm chart: Medium | Dashboard drift debt (2:40) |
| 03 | Delete `src/routes/refunds-v1.ts` and `REFUNDS_V1_ENABLED` | drift | Refunds API guide: High. Payments API service overview: Medium | Dashboard |
| 04 | Test files only | non-drift | No alert (ignore globs) | Eval (3:00) |
| 05 | `package-lock.json` bump | non-drift | No alert (ignore globs) | Eval |
| 06 | Comment typo in `scripts/rotate-secrets.sh` | non-drift | No alert (0.43, below 0.5) | Eval |
| 07 | New `tools/loadtest/` | non-drift | No alert (no anchor matches) | Eval |
| 08 | Revert of 02 | non-drift | No alert; closes the 2 events from 02 with reason `reverted` | Eval |
| 09 | `scale-workers.sh --count` renamed `--replicas` | drift | Scale payment workers: High | Dashboard |
| 10 | Refactor across 10 files under `src/` | drift | Payments codebase tour: High. Payments local development setup: High. Payments API service overview: Medium. 8 other anchored pages stay quiet | Eval: broad-glob precision |

Each `scenario.json` has an `expected` object with the pages that must flag (`pages`, with severity and the score arithmetic), the pages that must stay quiet (`mustNotFlag`), and the events a revert closes (`closes`). Scenario 01 predates this format and keeps a string.

### Jira beats

| Command | Effect | Expected |
| --- | --- | --- |
| `seed_jira.py wontdo PAY-170` | Epic Multi-region active-passive database to Won't Do | ADR-015: Active-passive multi-region database: High. Video 2:40 to 2:55 |
| `seed_jira.py fixversion PAY-158 2027.01` | Remove the v1 refunds endpoint slips from 2026.12 | ADR-009: Retire the v1 refunds API: High. Dashboard |
| `seed_jira.py reset-demo` | Puts both back, for another take | Mark both ADRs Verified again |

If the PAY workflow has no Won't Do status, `wontdo` uses a Done transition with resolution Won't Do, or plain Done. The Jira rule scores all of these 0.7.

## Mapping to the video script

| Time | What the seed provides |
| --- | --- |
| 0:00 to 0:20 | Payments rollback runbook, step 2: `./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT`. Rovo quotes it. |
| 0:20 to 0:30 | The same page, last reviewed 2026-10-14: an age-based tool calls it fresh. |
| 0:30 to 0:55 | Bind the runbook: `scripts/rollback.sh` (critical), `deploy/helm/values.yaml`, `PAY-142`. All 3 appear in the page, so auto-suggest can find them. |
| 0:55 to 1:25 | Merge scenario 01 live, or press Replay seeded PR (#482). The badge turns Possibly stale. |
| 1:25 to 2:05 | Review panel highlights step 2. The fix replaces the script name and the variable. |
| 2:05 to 2:40 | `find-docs-for-path scripts/rollback.sh` returns the runbook; `check-page-freshness` says not to trust it. |
| 2:40 to 2:55 | `wontdo PAY-170` flips ADR-015. For the dashboard, merge 02, 03, 09 and 10 and run both Jira beats beforehand, off camera. |
| 3:00 to 3:40 | Scenarios 02 to 10 are 9 of the 30 eval fixtures: 4 drift, 5 non-drift. |

After the full chain and both Jira beats, with nothing re-verified in between, PLAT shows 18 of 24 pages anchored and 8 drifted: the rollback, scale workers and refunds pages, the service overview, the codebase tour, local development setup, ADR-009 and ADR-015. The failover and Helm pages return to Verified when 08 reverts 02.

## Matcher assumptions behind the expected outcomes

The expected severities were checked by replaying the scoring in [docs/architecture/detection.md](../../docs/architecture/detection.md) over the real files and pages. They hold under the assumptions listed in `index.json` (`weightScale`, `matcherAssumptions`). The ones that change outcomes:

- **Normal weight is about 0.7** (critical 1.0). Scenario 06 and the 8 quiet pages in 10 score 0.43 to 0.46. With normal at 1.0 they would cross 0.5.
- **Removed identifiers are net-removed**: on `-` lines and not on `+` lines, and identifier-like (contains `_`, `.` or `-`, or camelCase). Counting every `-` line token adds 6 false positives in 10 and 4 in 01, mostly through the token `payments-api`.
- **Jira scores are weighted**, so the 2 ADR Jira anchors are critical.

## Re-running

Merges cannot be undone. To replay the chain from the start, delete and recreate the `payments-api` repo, run `base` again, and re-verify the pages. Demo mode (Replay seeded PR #482) needs none of this.
