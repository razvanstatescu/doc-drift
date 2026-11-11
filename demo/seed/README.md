# Demo seed

Everything needed to build the Doc Drift Sentinel demo environment: the `payments-api` repo in Bitbucket, the Jira project PAY, and the Confluence space PLAT. The scripts use only the Python standard library and never print a token.

```
demo/seed/
  bb_seed.py                       Bitbucket: reset main to base, prepare scenario branches, PRs, merges
  payments-api/base/               repo contents on main (BASE-ADDITIONS already applied)
  payments-api/BASE-ADDITIONS.md   record of the 24 files added to base/ on 2026-11-11
  payments-api/scenarios/01..10/   one folder per scripted PR: scenario.json + changed files
  jira/issues.json                 project PAY: 7 epics, 13 stories, the 2 Jira demo beats
  jira/seed_jira.py                creates PAY, writes jira/keymap.json, runs the Jira beats on cue
  jira/keymap.json                 ref -> real key for this site (written by seed_jira.py, git-ignored)
  confluence/index.json            the 24 PLAT pages: type, owner, labels, anchors, expected flags
  confluence/pages/**.xhtml        page bodies in Confluence storage format
  confluence/seed_confluence.py    creates PLAT, its folders, pages and labels; checks D20
```

## Environment

Put these in `.env` at the repo root (never commit it):

| Variable | Used by |
| --- | --- |
| `BITBUCKET_EMAIL`, `BITBUCKET_API_TOKEN` | `bb_seed.py` (repo and pull request read/write) |
| `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN` | `seed_jira.py`, `seed_confluence.py` |
| `ATLASSIAN_SITE` | default `one-atlas-jzzf.atlassian.net` |

**Check `ATLASSIAN_SITE`.** The demo site is `one-atlas-jzzf.atlassian.net`. On 2026-11-11 the repo `.env` set `ATLASSIAN_SITE=nano-soft.atlassian.net`, which is a different site, so every command below exports the demo site explicitly after loading `.env`. The API token is account-wide and works on both.

The Atlassian account needs the Administer Jira global permission (to create PAY) and permission to create spaces in Confluence. Run every script with `python3 -I`. No script prints a token.

```
set -a; . ./.env; set +a
export ATLASSIAN_SITE=one-atlas-jzzf.atlassian.net
```

## Jira keys are tokens (D25)

Pages, `index.json` anchors, repo code comments and PR text cite issues as `{{PAY:<ref>}}`, for example `{{PAY:rollback-epic}}`. `issues.json` gives each issue a stable `ref`. Jira assigns the real key; `seed_jira.py seed` writes `jira/keymap.json` (`{site, project, keys: {ref: key}}`), and `seed_confluence.py` and `bb_seed.py` replace the tokens from it. That is why **Jira runs first**. `keymap.json` is site-specific and git-ignored; `seed_jira.py keymap` rebuilds it from the live project without writing to Jira.

`exampleKey` in `issues.json` keeps the illustrative keys from the plan (`PAY-142` and so on). Offline dry runs use them, and demo mode and the copy library may keep `PAY-142` as an example. The live site uses whatever Jira assigned.

The keys on `one-atlas-jzzf` (seeded 2026-11-11) for the refs the demo leans on:

| Ref | Key | Used by |
| --- | --- | --- |
| `rollback-epic` | PAY-6 | Payments rollback runbook (Jira anchor, video 0:30) |
| `rename-rollback-script` | PAY-7 | The story behind scenario 01 |
| `remove-v1-refunds` | PAY-15 | ADR-009 anchor; `fixversion` beat |
| `multi-region-epic` | PAY-18 | ADR-015 anchor; `wontdo` beat |

All 20: PAY-1 to PAY-20, in `issues.json` order.

## Seed, in order

1. **Jira** (writes the keymap).
   ```
   python3 -I demo/seed/jira/seed_jira.py seed --dry-run
   python3 -I demo/seed/jira/seed_jira.py seed
   ```
   Creates PAY if missing (company-managed Scrum, `gh-simplified-scrum-classic`; falls back to Kanban, then basic, if a template is refused), versions 2026.12 and 2027.01, then 20 issues with parents, label `dds-demo`, status and fix version.
2. **Bitbucket: reset main, then prepare branches.**
   ```
   python3 -I demo/seed/bb_seed.py reset payments-api
   python3 -I demo/seed/bb_seed.py prepare payments-api
   python3 -I demo/seed/bb_seed.py status payments-api
   ```
   `reset` makes one commit on `main`, **Reset demo baseline**, that writes every file in `payments-api/base/` (tokens resolved) and deletes every other file. It then checks that `main` matches `base/` exactly, and declines open PRs from and deletes all `scenario/*` branches, which were cut from the old `main`. Other branches are left alone and listed (today: `spike/s1-base`, left over from spike S1). For a brand-new empty repo use `base payments-api` once instead of `reset`.

   `prepare` with no ids (re)creates, from the current `main`, the branches that need only the base: **01, 04, 05, 06, 07, 09**. An existing branch is deleted first (and an open PR from it declined), so `prepare` is safe to repeat. It holds back the chained scenarios and says so.
3. **Confluence.**
   ```
   python3 -I demo/seed/confluence/seed_confluence.py --dry-run
   python3 -I demo/seed/confluence/seed_confluence.py
   python3 -I demo/seed/confluence/seed_confluence.py --verify
   ```
   Creates space PLAT ("Platform"), 5 folders under its homepage (Runbooks, Service overviews, Onboarding, Architecture decisions, API guides) and the 24 pages in their folders, with labels. If the site does not support folders, it creates section pages instead. `--verify` is read-only: it checks that each page exists, sits in its folder, carries its labels, and has no view restriction, and exits non-zero otherwise. `--validate` only checks that all 24 bodies are well-formed. `--update` pushes edited bodies to pages that already exist; do not use it after pages are anchored and verified, because an edit is a new version.
4. **Install and anchor.** Install the core app, connect Jira, and add the anchors listed for each page in [confluence/index.json](confluence/index.json) (`anchors`: repo, path or glob, weight; Jira anchors are tokens, look the key up in `keymap.json`). 18 of the 24 pages are anchored; the other 6 stay Unanchored on purpose. Then mark all 18 Verified. Every scenario's expected outcome assumes the pages start Verified.

Personas (Dana, Sam, Marco, Priya, Lena) appear only in page text. The seeding account creates every page, so the Confluence owner is that account. Dana owns 7 of the 8 runbooks.

### Idempotency

| Script | Re-run behaviour |
| --- | --- |
| `seed_jira.py seed` | Matches issues by summary. Existing ones are reused, never duplicated; the keymap is rewritten from what exists. Never deletes. |
| `bb_seed.py reset` | Always makes a new **Reset demo baseline** commit, even when `main` already matches. Never rewrites history. |
| `bb_seed.py prepare` | Deletes and recreates each named branch from the current `main`. |
| `seed_confluence.py` | Skips a space, folder or page whose title exists. On existing pages it re-adds labels and removes any view restriction (D20); neither makes a new page version. |

## Scenarios

`bb_seed.py` commits whole files on top of `main`, so a scenario that rewrites a file another scenario changed must be built **after that one merges**. `prepare <id>` checks this: it refuses unless `main` already holds the files of the scenario it depends on (`--force` overrides).

| Chained | Waits for | Why |
| --- | --- | --- |
| 02 | 01 merged | rewrites `deploy/helm/values.yaml` as 01 leaves it |
| 03 | 02 merged | keeps the dashboard chain in order. Its files need only base, so `prepare --force` can build it early |
| 08 | 02 merged | reverts 02's `values.yaml` |
| 10 | 03 merged | rewrites `src/config.ts`, `src/routes/index.ts`, `.env.example` as 03 leaves them |

### At demo time

The hero branch (01) is ready. Open and merge it on cue (PR numbers continue from #3; the live demo uses the real number, demo mode keeps #482):

```
python3 -I demo/seed/bb_seed.py pr payments-api 01-rename-rollback-script
python3 -I demo/seed/bb_seed.py merge payments-api <pr-id>
```

For the dashboard (off camera, before 2:40), prepare each chained branch only after its predecessor merges:

```
python3 -I demo/seed/bb_seed.py prepare payments-api 02-raise-db-pool        # needs 01 merged
python3 -I demo/seed/bb_seed.py pr payments-api 02-raise-db-pool
python3 -I demo/seed/bb_seed.py merge payments-api <pr-id>
python3 -I demo/seed/bb_seed.py prepare payments-api 03-remove-v1-refunds    # needs 02 merged
python3 -I demo/seed/bb_seed.py pr payments-api 03-remove-v1-refunds
python3 -I demo/seed/bb_seed.py merge payments-api <pr-id>
python3 -I demo/seed/bb_seed.py pr payments-api 09-rename-scale-flag         # prepared already
python3 -I demo/seed/bb_seed.py merge payments-api <pr-id>
python3 -I demo/seed/bb_seed.py prepare payments-api 10-structured-logging   # needs 03 merged
python3 -I demo/seed/bb_seed.py pr payments-api 10-structured-logging
python3 -I demo/seed/bb_seed.py merge payments-api <pr-id>
```

08 (revert of 02) is prepared after 02 merges and only for the eval run; merging it closes the 2 events from 02. 04 to 07 are prepared already and can be merged in any order.

### Expected outcomes

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
| `seed_jira.py wontdo` | Epic Multi-region active-passive database (`multi-region-epic`, PAY-18) to Won't Do | ADR-015: Active-passive multi-region database: High. Video 2:40 to 2:55 |
| `seed_jira.py fixversion` | Remove the v1 refunds endpoint (`remove-v1-refunds`, PAY-15) slips from 2026.12 to 2027.01 | ADR-009: Retire the v1 refunds API: High. Dashboard |
| `seed_jira.py reset-demo` | Puts both back, for another take | Mark both ADRs Verified again |

Both commands also take an explicit ref or key (`wontdo PAY-18`, `fixversion remove-v1-refunds 2027.01`). If the PAY workflow has no Won't Do status, `wontdo` uses a Done transition with resolution Won't Do, or plain Done. The Jira rule scores all of these 0.7. On `one-atlas-jzzf` the Scrum workflow has neither a Won't Do status nor a resolution screen, so `wontdo` moves PAY-18 to plain Done.

## Mapping to the video script

| Time | What the seed provides |
| --- | --- |
| 0:00 to 0:20 | Payments rollback runbook, step 2: `./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT`. Rovo quotes it. |
| 0:20 to 0:30 | The same page, last reviewed 2026-10-14: an age-based tool calls it fresh. |
| 0:30 to 0:55 | Bind the runbook: `scripts/rollback.sh` (critical), `deploy/helm/values.yaml`, PAY-6 (`rollback-epic`). All 3 appear in the page, so auto-suggest can find them. |
| 0:55 to 1:25 | Merge scenario 01 live, or press Replay seeded PR (#482). The badge turns Possibly stale. |
| 1:25 to 2:05 | Review panel highlights step 2. The fix replaces the script name and the variable. |
| 2:05 to 2:40 | `find-docs-for-path scripts/rollback.sh` returns the runbook; `check-page-freshness` says not to trust it. |
| 2:40 to 2:55 | `wontdo` (PAY-18) flips ADR-015. For the dashboard, merge 02, 03, 09 and 10 and run both Jira beats beforehand, off camera. |
| 3:00 to 3:40 | Scenarios 02 to 10 are 9 of the 30 eval fixtures: 4 drift, 5 non-drift. |

After the full chain and both Jira beats, with nothing re-verified in between, PLAT shows 18 of 24 pages anchored and 8 drifted: the rollback, scale workers and refunds pages, the service overview, the codebase tour, local development setup, ADR-009 and ADR-015. The failover and Helm pages return to Verified when 08 reverts 02.

## Matcher assumptions behind the expected outcomes

The expected severities were checked by replaying the scoring in [docs/architecture/detection.md](../../docs/architecture/detection.md) over the real files and pages. They hold under the assumptions listed in `index.json` (`weightScale`, `matcherAssumptions`). The ones that change outcomes:

- **Normal weight is about 0.7** (critical 1.0). Scenario 06 and the 8 quiet pages in 10 score 0.43 to 0.46. With normal at 1.0 they would cross 0.5.
- **Removed identifiers are net-removed**: on `-` lines and not on `+` lines, and identifier-like (contains `_`, `.` or `-`, or camelCase). Counting every `-` line token adds 6 false positives in 10 and 4 in 01, mostly through the token `payments-api`.
- **Jira scores are not scaled by anchor weight** (D26). Critical only raises severity to High. The 2 ADR Jira anchors are critical for that reason.

## Resetting for another take

Merges cannot be undone, but `main` can be brought back to the baseline without deleting the repo:

```
python3 -I demo/seed/bb_seed.py reset payments-api      # main = base/ again, stale scenario branches removed
python3 -I demo/seed/bb_seed.py prepare payments-api    # 01, 04, 05, 06, 07, 09 rebuilt from the new main
python3 -I demo/seed/jira/seed_jira.py reset-demo       # PAY-18 back to To Do, PAY-15 back to 2026.12
```

The reset commit is itself a merge to `main` that touches anchored files, so if the core app and relay are installed it raises drift events. Run the reset **before** anchoring, or re-verify the anchored pages afterwards. Pages never need re-seeding: the scenarios change code and Jira, not Confluence. Demo mode (Replay seeded PR #482) needs none of this.

To start Confluence over, delete the PLAT space in the UI and run `seed_confluence.py` again. To start Jira over, delete PAY, run `seed_jira.py seed` (the keys will differ), then re-run `reset` and `prepare` (code comments cite the keys) and re-create the PLAT pages, because their bodies hold the old keys.
