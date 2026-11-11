# Doc Drift Sentinel brand

The brand has one job: make "this page no longer matches the system" visible at a glance, calmly and precisely.

**Sources of truth (claude.ai artifacts, owned by Razvan):**
- Design system: https://claude.ai/artifact/MWaTaUbAyKQZ1qNyYzkLF6 (brand book, tokens, logos)
- Brand canvas: https://claude.ai/artifact/W6PzEst8WGEZLv82vH8bSr (6 boards: cover, mood board, logo system, colour and type, interface kit, in context)

This folder is a local copy taken on 2026-11-11. If the artifacts change, update this folder. If you change something here, change it in the design system too.

| File | What |
| --- | --- |
| [tokens.json](tokens.json) | Colour, type, spacing, radius and shadow tokens, Night shift and Day themes. Copied verbatim from the design system. |
| [logo.md](logo.md) | Logo files, construction, clear space, lockups, misuse |
| [logos/](logos/) | The 4 SVG logo files |
| [voice-and-copy.md](voice-and-copy.md) | Voice rules and the approved microcopy library |
| [design-reference.md](design-reference.md) | What each canvas board shows: badge, review panel, dashboard, website, listing, agent answers |

## The idea: the slip and the trace

The mark is a D cut into three bands. The middle band has slipped 56 px (on a 512 px tile) to the right and glows amber. A faint trace stays where it belongs. Read it as "docs and code line up, until something slips". The three bands also read as an identity sign (≡) with one bar broken out of it.

Two devices carry the idea everywhere:
- **The slip.** A band shifted off its grid line, filled with `beacon`. It marks the one thing that changed. One slip per view.
- **The trace.** A `trace` fill at the position content should hold. Use it for empty states, placeholders and before/after views.

Everything else stays still and aligned, so the slip is the only thing that reads as out of place.

## Naming

- Product: **Doc Drift Sentinel**. Write it in full in titles, listings and first mentions. "Doc Drift" is fine where space is tight, such as the Confluence byline label.
- Never "DocDrift" or "DDS" in user-facing text. "DocDrift" is already the name of unrelated open-source tools. (Code identifiers such as a `dds-` key prefix are fine.)
- Marketplace listing: "Doc Drift Sentinel for Confluence".
- The Rovo agent is **Drift Reviewer**. The main agent tool is `check-page-freshness`.
- Page states are names and keep their capital: **Verified, Possibly stale, Stale, Unanchored**.

## Colour

Two themes: **Night shift** (dark, the primary look) and **Day** (light). Deep teal with one warm signal.

| Role | Tokens | Rule |
| --- | --- | --- |
| Grounds | `ground`, `surface`, `surface-sunk` | Page, cards, wells/code blocks |
| Type | `text`, `text-muted`, `link` | Every text pair passes 4.5:1 in both themes |
| Lines | `line` (decorative), `line-strong` (3:1) | Control edges and focus rings use `line-strong` |
| The slip | `beacon` #FFB224, `on-beacon` | Drift signal, drift highlights, Possibly stale badge. Text on it uses `on-beacon` |
| Amber as text | `beacon-text` | Never use `beacon` as text on Day grounds (fails contrast) |
| The trace | `trace` | Expected-position fills only, never text |
| Brand constants | `fathom` #072630, `shoal` #0E3D48, `current` #22717E, `paper` #F2F6F7, `mist` #D6E4E7, `beacon-high` #FFD166, `beacon-low` #FF9F1C | Logo, illustration, marketing. `current` is never text |

- **Primary buttons fill with `text` and carry `ground`-coloured labels**, so the slip stays the only amber on screen.
- Proportion: about 70% teal depth (or Paper by day), 25% type and lines, 5% beacon. If more than one thing on screen is amber, nothing is.

## Status system

| State | Fill | Text and icon | Icon | Meaning |
| --- | --- | --- | --- | --- |
| Verified | `verified-tint` | `verified` | check | Re-checked since its anchors last changed |
| Possibly stale | `beacon` | `on-beacon` | slip (two offset bars) | An anchor changed after the last verification |
| Stale | `stale-tint` | `stale` | clock | Drift unreviewed for 7 days, or 3 or more changes |
| Unanchored | `unanchored-tint` | `unanchored` | dashed square | Not linked to code or Jira yet |

A state always shows a word and an icon, never colour alone.

**Inside Confluence, the badge and all app UI render with Atlassian design tokens (UI Kit).** Our brand colours apply to our own surfaces: website, docs, Marketplace assets, decks, video, Devpost. The state names, words and icons stay the same everywhere.

## Type

Spline Sans for everything people read. Spline Sans Mono for everything they could paste into a terminal: paths, PR numbers, issue keys, JSON. Both are Google Fonts (Spline Sans 400 to 700, Spline Sans Mono 400 and 500).

| Style | Size/line | Weight | Use |
| --- | --- | --- | --- |
| `display` | 72/76, -2% | 600 | Website hero, title slides |
| `title` | 48/54, -1.5% | 600 | Marketing and deck section titles |
| `heading-lg` | 32/40 | 600 | Page titles in our own UI |
| `heading-md` | 22/30 | 600 | Panel and card titles |
| `heading-sm` | 18/26 | 600 | Group labels inside panels |
| `body` | 16/24 | 400 | Default reading text |
| `body-sm` | 14/20 | 400 | Dense UI, tooltips, table cells |
| `caption` | 12/16 | 500 | Timestamps, badge labels |
| `code` | 14/20 mono | 400 | Paths, keys, commands, JSON |
| `code-sm` | 12/18 mono | 500 | PR numbers and issue keys in badges and rows |

Sentence case everywhere, no all-caps labels. Mono only for literal values, never as decoration.

## Shape, space and depth

- 4 px grid: `space-1` (4) to `space-16` (64).
- Radii: `radius-cut` 8 px for badges, chips, inputs and buttons (echoes the mark's cut fillets). `radius-card` 14 px. `radius-panel` 24 px. `radius-pill` for counters and toggles only. The smooth squircle belongs to the app icon; do not reuse it for UI.
- Flat by default. `shadow-raise` only for things that float (modals, popovers). `shadow-glow` marks the single drifted item in view.

## Iconography

1.75 px strokes on a 20 px grid, round caps and joins, 2 px corner radius inside glyphs, no fills except the slip. Core set: anchor (link to code), slip (two offset bars), trace (dashed square), verify (check), clock (stale), merge (pull request), page. Icons sit in `text-muted` and take a state colour only inside their badge. Inside Confluence use Atlassian icons that match these meanings.

## Motifs and imagery

- Show the product: UI crops, diff fragments, charts drawn with these tokens. No stock photos, people at laptops, robots or eyes.
- Tide lines (contour-like wavy lines in `current` at 20 to 40% opacity) may sit behind hero art, never behind paragraphs.
- The slip and trace pair can illustrate anything that moved: a step, a version, a metric.
- No AI tropes: no blue-purple gradients, emoji cards or left-border cards.

## Motion

One motion idea: the slip. A drifted band slides one slip unit (11.7% of the element's width) to the right in 180 ms ease-out. Verifying slides it back in 240 ms and fades the glow. Nothing else moves on its own. With reduced motion, swap the slide for a 120 ms fade.

## Accessibility

- Text 4.5:1 or more in both themes. Large text, icons and control edges 3:1 or more.
- States always carry a word and an icon.
- Focus: a 2 px `line-strong` ring with a 2 px gap. On `beacon` fills use `on-beacon`.

## Atlassian partner rules that affect the brand

- App icons must not use or resemble Atlassian logos, assets or brand colours. So: no blue tile with a white glyph.
- Never put the mark on Atlassian blue, inside or next to an Atlassian product logo, or in a lockup with any Atlassian mark.
- Reference: https://developer.atlassian.com/platform/marketplace/atlassian-brand-guidelines-for-marketplace-partners/

## Building with this system

Start from tokens, spend `beacon` once per view, pair Spline Sans with Spline Sans Mono, and check both themes before shipping.
