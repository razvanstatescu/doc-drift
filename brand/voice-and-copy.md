# Voice and copy

Calm, specific, on watch. Say what changed, where and when, with numbers. Never alarm, never sell. A person decides.

## Rules

- Sentence case. No exclamation marks. No emoji. Numbers as digits.
- Active verbs: anchor, watch, flag, review, verify.
- Name the person and the change: "PR #482 (merged by Sam)", "Verified by Dana".
- Tooltips under 90 characters.
- **Never claim a page is wrong, only that its anchors changed.** "3 steps on this page may be out of date", not "this page is wrong".
- Mono (`code` style) for anything pasteable: paths, PR numbers, issue keys, env vars, JSON.
- Page states are proper names: Verified, Possibly stale, Stale, Unanchored. In JSON/API they are `verified`, `possibly_stale`, `stale`, `unanchored`.

| Write | Not |
| --- | --- |
| PR #482 changed `scripts/rollback.sh` 2 hours ago. 3 steps on this page may be out of date. | Uh oh, your docs are stale |
| Verified by Dana, 3 days ago. Watching 3 anchors. | All good |
| Agents are told not to trust this page until someone reviews it. | AI-powered doc protection |
| No drift in PLAT this week. 41 of 48 pages anchored. | You're crushing it |

## Taglines

- Primary: **Docs that know when the code moved.**
- Section/deck title: **Catch the slip.**
- Video/Devpost thumbnail: **Catch the slip before your agents do.**
- Vision line (video close): "Docs that agents can trust, because they know when to stop trusting them."
- Pitch lead: "Agents should not cite docs that the code has already invalidated."
- Mood words: Calm. Precise. On watch. Specific. A person decides.

## Product descriptions

- **One line (listing summary):** Flags pages when the code or Jira work they describe changes, and tells agents which pages to trust.
- **Website hero body:** Doc Drift Sentinel anchors Confluence pages to code and Jira work, flags them when those change, and tells Rovo and coding agents which pages to trust.
- **Cover paragraph:** A Forge app for Confluence. It anchors pages to the code and Jira work they describe, flags them the moment those change, and tells Rovo and coding agents not to trust them until a person re-verifies.
- **Marketplace categories (draft):** Documentation, Developer tools, Rovo agents.

## Microcopy library

### Byline badge tooltips (one per state)

| State | Tooltip |
| --- | --- |
| Verified | Verified by Dana 3d ago. Watching 3 anchors. |
| Possibly stale | PR #482 changed deploy/helm/values.yaml 2h ago. Review. |
| Stale | Unreviewed drift for 7 days (2 changes). Agents told not to trust this page. |
| Unanchored | Not linked to code or Jira. Add anchors. |

### Page banner (Stale pages only, if shipped)

- Agents won't trust this page until it's reviewed.

### Review panel

- Section labels: What changed · Affected section · Proposed fix
- Event row: "PR #482 merged by Sam · 2 hours ago · `scripts/rollback.sh` renamed to `scripts/rollback-v2.sh` · High · anchor `payments-api: scripts/rollback.sh`"
- Jira event row: "`PAY-142` moved to Done · Yesterday · Medium"
- Fix attribution: Drafted by Drift Reviewer from PR #482. Nothing changes until you accept.
- Actions: Accept fix (primary) · Mark verified · Snooze 7 days · Dismiss
- Dismiss reasons: Not relevant · Already updated · False positive

### Binding (anchor) modal

- Field: Anchor path. Help: Globs work too, for example `deploy/helm/**`
- Weight options: Critical · Normal

### Footer comment notification

- "@owner PR #482 (merged by Sam) changed 2 files this page documents. Review in the Doc Drift badge."

### Dashboard

- Title: Drift in PLAT
- KPI tiles: Pages anchored (18 of 24) · Possibly stale · Stale · Median time to verify (1.6 days)
- Empty week: No drift in PLAT this week. 41 of 48 pages anchored.

### Settings

- Connection test result: Connected: workspace acme, 4 repos seen
- Sensitivity presets: Strict · Balanced · Quiet

### Agent and tool guidance strings

- `guidance` for verified pages: Safe to cite.
- `guidance` for drifted pages: Do not present steps from this page as current. Cite with caveat: changed by PR #482 on 2026-12-02.
- Not visible to caller: Page not found or not visible to you.
- Drift Reviewer answer example: "The rollback runbook is Possibly stale. PR #482 renamed `scripts/rollback.sh` after the page was last verified, so step 2 may be out of date."

### Version message when applying an accepted fix

- Doc Drift: accepted proposal for PR #482

## Maker

Doc Drift Sentinel is made by **Nano-Soft Technology SRL**, trading as **Nano Soft** (Bucharest, Romania; https://nano-soft.tech/). Contact and support: hello@nano-soft.tech. Use "Nano Soft" in bylines and footers, and the legal name in copyright and privacy text.

## Placeholders

Use `[Partner name]` and similar bracketed placeholders for facts not decided yet. Never invent stats for marketing copy. Use numbers from the eval harness or the demo space and label them "sample data from the demo space".
