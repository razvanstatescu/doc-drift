# Design reference: the brand canvas

Canvas: https://claude.ai/artifact/W6PzEst8WGEZLv82vH8bSr ("Doc Drift Sentinel brand"). It uses the design system https://claude.ai/artifact/MWaTaUbAyKQZ1qNyYzkLF6. Six boards at 1440 px wide. This file says what each board defines, so you know where to look before building a surface. Board copy is collected in [voice-and-copy.md](voice-and-copy.md).

## 1. Cover (Night shift)

The hero: "Doc Drift Sentinel / Docs that know when the code moved." The icon sits on tide lines. Below it are three story cards, each with a three-band glyph:
1. **In sync.** The runbook is anchored to `scripts/rollback.sh` and verified against it.
2. **Code moved.** The middle band slips in amber with its trace. PR #482 renames the script. The page is flagged Possibly stale and agents are told to hold off.
3. **Reviewed.** Shows a Verified badge. Dana accepts the proposed fix. The band slides back and agents trust the page again.

This three-step story (in sync, code moved, reviewed) is the backbone of the video and the website "How it works".

## 2. Mood board and directions (Night shift)

Tiles: Fathom and Shoal (the calm field), Beacon (one warm signal per view), the slip, Spline Sans and Spline Sans Mono, a diff fragment ("Diffs are our imagery: real changes, real paths"), the four state badges, a voice tile, the trace, tide lines.

References looked at: app icons (Luma, Perplexity, Copilot), developer sites (Grammarly and Canva turn a product cue into a type device, as we do with the slip), docs platforms (GitBook, Hashnode), and the Atlassian partner brand rules. Logo directions: see [logo.md](logo.md).

## 3. Logo system (Day)

The four files, construction guides (S = 60, slip 56, cut 12, r 30), clear space, minimum sizes (64, 48 and 32 px tile; 24 and 16 px flat), horizontal and stacked lockups on both grounds, and six don'ts. All rules are in [logo.md](logo.md).

## 4. Colour and type

The palette with roles, the 70/25/5 proportion bar, both themes with contrast ratios, status colours with ratios per theme, and the type ramp. Values are in [tokens.json](tokens.json) and [README.md](README.md).

Contrast figures shown on the board:
- Night shift: text 14.5:1, text-muted 7.6:1, link 6.5:1, line-strong 4.0:1 on ground.
- Day: text 14.5:1, text-muted 5.6:1, link 6.2:1, beacon-text 5.8:1.
- Status badges: Verified 6.6 / 4.7, Possibly stale 8.8 / 8.8, Stale 5.9 / 5.5, Unanchored 5.8 / 5.1 (night / day).

## 5. Interface kit

For our own surfaces (website, docs, decks, dashboard mockups). Inside Confluence the same states, words and icons render with Atlassian design tokens.

- **Page states:** four badges (`radius-cut`, 28 px tall, 16 px icon, 13 px label at 500) in both themes. Each comes with a tooltip sample: "PR #482 changed `deploy/helm/values.yaml` 2 hours ago. Review."
- **Actions and inputs:** primary "Accept fix" and "Mark verified" fill with the text colour. Secondary actions: Snooze 7 days, Dismiss. A focus ring sample (2 px with a 2 px gap). The "Anchor path" input with glob help text.
- **Review panel** (the most important layout to copy into the byline modal):
  - Header: page title "Payments rollback runbook" plus a Possibly stale badge.
  - "What changed": a list of event rows. Each row has the source and who merged it, a relative time, the file change in mono, a severity chip (High/Medium), and the matched anchor in mono. Example rows: PR #482 (High) and `PAY-142` moved to Done (Medium).
  - "Affected section": the page passage, with the drifted token (`rollback.sh`) highlighted with the slip.
  - "Proposed fix": a two-line diff (red `-`, green `+`) and the attribution line.
  - Footer actions: Dismiss · Snooze 7 days · Mark verified · Accept fix (primary).
- **Agent answers and dashboard:**
  - A `check-page-freshness` JSON response card.
  - "Drift in PLAT" with sample data: 18 of 24 pages anchored, 3 Possibly stale, 1 Stale, 1.6 days median time to verify.

## 6. In context

- **Website hero:** nav (How it works · For agents · Docs · Install for Confluence). Headline, body, two CTAs (Install for Confluence, Watch the 4 minute demo). A page mock with "Owned by Dana" and a Possibly stale badge.
- **Marketplace listing:** "Doc Drift Sentinel for Confluence", by Nano Soft (Nano-Soft Technology SRL), one-line summary, categories (Documentation, Developer tools, Rovo agents). The logo is exported at 144 x 144 px from `doc-drift-icon.svg`.
- **Confluence page:** the byline badge with a tooltip, and an optional banner reading "Agents won't trust this page until it's reviewed."
- **Agent answer:** the Drift Reviewer reply to "How do I roll back payments-api?" with a page citation chip showing the state.
- **Coding agent over MCP:** a terminal transcript. The user asks "Before I edit deploy/helm/values.yaml, which docs describe it?" and the agent calls `doc-drift · find-docs-for-path (payments-api, deploy/helm/values.yaml)`. Results: Payments rollback runbook, `possibly_stale`; Scaling payment workers, `verified`. Then: "I'll update the runbook in the same PR."
- **Video title and Devpost thumbnail:** "Doc Drift Sentinel. Catch the slip before your agents do. Built on Forge for Codegeist 2026."
